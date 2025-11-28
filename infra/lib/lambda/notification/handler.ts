/**
 * NDX Notification Handler - Entry Point
 *
 * This Lambda function processes EventBridge events from the Innovation Sandbox (ISB)
 * and routes them to appropriate notification channels:
 * - GOV.UK Notify for user emails
 * - Slack webhooks for ops alerts
 *
 * Architecture: "One brain, two mouths" pattern
 * @see docs/notification-architecture.md
 *
 * Security Controls:
 * - Source validation (AC-3.1, AC-3.1.1)
 * - Reserved concurrency = 10 for blast radius limiting (AC-3.6)
 * - PII redaction in logs (AC-3.10)
 * - Log injection prevention (AC-3.8.1)
 * - SuspiciousEmailDomain metric for non-.gov.uk emails (AC-3.7)
 *
 * Idempotency:
 * Event.id is used as idempotency key (AC-3.9). This is REQUIRED because:
 * - EventBridge may retry delivery, causing duplicate events
 * - Duplicate notifications to users is a poor UX and security concern
 * - Full Lambda Powertools idempotency integration is in story n5-7
 */

import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import type { EventBridgeEvent, HandlerResponse, NotificationEventType } from './types';
import { ALLOWED_SOURCES } from './types';
import { SecurityError } from './errors';
import { processSlackAlert, isSlackAlertType } from './slack-alerts';
import { validateEvent } from './validation';
import { validateAllTemplatesOnce } from './template-validation';
import { NotifySender } from './notify-sender';
import {
  getTemplateConfig,
  getTemplateId,
  buildPersonalisation,
  isLeaseLifecycleEvent,
  isMonitoringAlertEvent,
} from './templates';

// =========================================================================
// Cold Start Template Validation (AC-9.7)
// =========================================================================

/**
 * Cold start initialization state
 *
 * Template validation runs once per Lambda container during cold start.
 * This detects template drift before the first email is sent.
 */
let coldStartValidationComplete = false;
let coldStartValidationError: Error | null = null;

// Trigger validation during module load (cold start)
// This runs in parallel with Lambda runtime initialization
validateAllTemplatesOnce()
  .then(() => {
    coldStartValidationComplete = true;
  })
  .catch((error: Error) => {
    coldStartValidationError = error;
    // Log but don't throw here - we'll check in handler
  });

// =========================================================================
// Lambda Powertools Configuration (AC-3.3)
// =========================================================================

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SILENT';

const logger = new Logger({
  serviceName: 'ndx-notifications',
  logLevel: (process.env.LOG_LEVEL as LogLevel | undefined) || 'INFO',
  persistentLogAttributes: {
    environment: process.env.ENVIRONMENT || 'unknown',
  },
});

const metrics = new Metrics({
  namespace: 'ndx/notifications',
  serviceName: 'ndx-notifications',
});

// =========================================================================
// Security Utilities
// =========================================================================

/**
 * Sanitize log input to prevent log injection attacks (AC-3.8.1)
 * Escapes newlines, carriage returns, and other control characters
 */
export function sanitizeLogInput(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  // Escape control characters that could cause log injection
  // eslint-disable-next-line no-control-regex
  const controlCharRegex = /[\x00-\x1F\x7F]/g;
  return input
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(controlCharRegex, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`);
}

/**
 * Redact email addresses for security logs (AC-3.10, GDPR compliance)
 */
export function redactEmail(email: string | undefined): string {
  if (!email) {
    return '[NO_EMAIL]';
  }
  return '[REDACTED]';
}

/**
 * Check if email domain is .gov.uk and emit metric if not (AC-3.7, AC-3.7.1)
 * This is defense in depth - actual email verification is in N-5
 */
export function checkEmailDomain(email: string | undefined, eventId: string): void {
  if (!email) {
    return;
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && !domain.endsWith('.gov.uk')) {
    // Emit suspicious email metric (Red Team requirement)
    metrics.addMetric('SuspiciousEmailDomain', MetricUnit.Count, 1);
    logger.warn('Non-.gov.uk email domain detected', {
      eventId,
      emailDomain: sanitizeLogInput(domain),
      email: redactEmail(email),
    });
  }
}

/**
 * Validate that the event source is in our allowed list (AC-3.1, AC-3.1.1, AC-3.2)
 * This is a defense-in-depth measure - EventBridge rules also filter by source
 */
export function validateEventSource(event: EventBridgeEvent): void {
  const source = event.source;
  const sanitizedSource = sanitizeLogInput(source);

  if (!ALLOWED_SOURCES.includes(source as (typeof ALLOWED_SOURCES)[number])) {
    logger.error('Invalid event source rejected', {
      eventId: event.id,
      source: sanitizedSource,
      expectedSources: ALLOWED_SOURCES,
    });

    // Emit security metric
    metrics.addMetric('SecurityRejection', MetricUnit.Count, 1);

    throw new SecurityError('Invalid event source', {
      expectedSource: ALLOWED_SOURCES.join(', '),
      actualSource: sanitizedSource,
      eventId: event.id,
    });
  }
}

// =========================================================================
// Event Processing
// =========================================================================

/**
 * Determine which notification channel(s) to use based on event type
 * All events now go to Slack; user-facing events also get email (N5)
 */
function getNotificationChannels(eventType: NotificationEventType): ('email' | 'slack')[] {
  // Ops events go to Slack only (no user email)
  const opsOnlyEvents: NotificationEventType[] = [
    'AccountCleanupFailed',
    'AccountQuarantined',
    'AccountDriftDetected',
  ];

  if (opsOnlyEvents.includes(eventType)) {
    return ['slack'];
  }

  // All lease lifecycle events go to both Slack (visibility) and email (user notification)
  return ['email', 'slack'];
}

/**
 * Extract user email from event detail if present
 * ISB events may have email in various locations:
 * - detail.userEmail
 * - detail.principalEmail
 * - detail.email
 * - detail.leaseId.userEmail (when leaseId is an object)
 * - detail.lease.userEmail (nested lease object)
 */
function extractUserEmail(detail: unknown): string | undefined {
  if (typeof detail === 'object' && detail !== null) {
    const d = detail as Record<string, unknown>;

    // Check top-level email fields
    if (typeof d.userEmail === 'string') return d.userEmail;
    if (typeof d.principalEmail === 'string') return d.principalEmail;
    if (typeof d.email === 'string') return d.email;

    // Check leaseId object (ISB sometimes nests email in leaseId)
    if (d.leaseId && typeof d.leaseId === 'object') {
      const leaseId = d.leaseId as Record<string, unknown>;
      if (typeof leaseId.userEmail === 'string') return leaseId.userEmail;
      if (typeof leaseId.principalEmail === 'string') return leaseId.principalEmail;
    }

    // Check nested lease object
    if (d.lease && typeof d.lease === 'object') {
      const lease = d.lease as Record<string, unknown>;
      if (typeof lease.userEmail === 'string') return lease.userEmail;
      if (typeof lease.principalEmail === 'string') return lease.principalEmail;
    }
  }
  return undefined;
}

// =========================================================================
// Main Handler
// =========================================================================

/**
 * Main Lambda handler for notification events
 *
 * @param event - EventBridge event from ISB
 * @returns Handler response with status code
 */
export async function handler(event: EventBridgeEvent): Promise<HandlerResponse> {
  const eventId = event.id;
  const eventType = event['detail-type'] as NotificationEventType;
  const sanitizedEventType = sanitizeLogInput(eventType);

  // Add correlation IDs to all logs (AC-3.4)
  logger.appendKeys({
    eventId,
    eventType: sanitizedEventType,
    correlationId: eventId, // Use event ID as correlation ID
  });

  // Log event receipt (AC-3.8 - INFO level for success path)
  logger.info('Event received', {
    source: sanitizeLogInput(event.source),
    timestamp: event.time,
    account: event.account,
  });

  try {
    // Step 0: Check cold start validation status (AC-9.8)
    // If template validation failed during cold start, fail fast
    if (coldStartValidationError) {
      logger.error('Cold start template validation failed', {
        error: coldStartValidationError.message,
      });
      throw coldStartValidationError;
    }

    // Ensure validation is complete before processing (defensive)
    if (!coldStartValidationComplete) {
      // Wait for validation to complete if still in progress
      await validateAllTemplatesOnce();
    }

    // Step 1: Validate event source (security control - AC-3.1)
    validateEventSource(event);

    // Step 2: Check email domain for suspicious activity (AC-3.7)
    const userEmail = extractUserEmail(event.detail);
    checkEmailDomain(userEmail, eventId);

    // Step 3: Determine notification channels
    const channels = getNotificationChannels(eventType);

    // Step 4: Process notifications for each channel
    // Slack alerts (ops events)
    if (channels.includes('slack') && isSlackAlertType(eventType)) {
      const validatedEvent = validateEvent(event);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await processSlackAlert(validatedEvent as any);
      logger.info('Slack alert sent successfully', {
        eventId,
        eventType: sanitizedEventType,
      });
    }

    // Email notifications (user events)
    if (channels.includes('email') && (isLeaseLifecycleEvent(eventType) || isMonitoringAlertEvent(eventType))) {
      const validatedEvent = validateEvent(event);

      // Get template configuration
      const templateConfig = getTemplateConfig(eventType);
      const templateId = getTemplateId(templateConfig);

      // Build personalisation from event data
      const personalisation = buildPersonalisation(validatedEvent);

      // Extract user email from event detail
      const recipientEmail = extractUserEmail(event.detail);
      if (!recipientEmail) {
        logger.error('No recipient email found in event', { eventId });
        throw new Error('Missing recipient email in event detail');
      }

      // Send via GOV.UK Notify
      const sender = await NotifySender.getInstance();
      const response = await sender.send({
        templateId,
        email: recipientEmail,
        personalisation,
        eventId,
        eventUserEmail: recipientEmail,
      });

      logger.info('Email sent successfully', {
        eventId,
        notifyId: response.id,
        templateId,
        eventType: sanitizedEventType,
      });

      metrics.addMetric('EmailSent', MetricUnit.Count, 1);
    }

    logger.info('Event processed successfully', {
      channels,
      processingStatus: 'success',
    });

    // Emit success metric
    metrics.addMetric('NotificationSuccess', MetricUnit.Count, 1);
    metrics.addMetric('EventsProcessed', MetricUnit.Count, 1);

    // Flush metrics
    metrics.publishStoredMetrics();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        eventId,
        eventType: sanitizedEventType,
        channels,
      }),
    };
  } catch (error) {
    // Log error with appropriate level (AC-3.8 - ERROR for DLQ-worthy errors)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'Error';

    logger.error('Event processing failed', {
      processingStatus: 'failed',
      errorName,
      errorMessage: sanitizeLogInput(errorMessage),
    });

    // Emit failure metric
    metrics.addMetric('NotificationFailure', MetricUnit.Count, 1);
    metrics.publishStoredMetrics();

    // Re-throw to trigger Lambda retry/DLQ behavior
    throw error;
  }
}
