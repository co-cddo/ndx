/**
 * Slack Webhook Integration for NDX Notification System
 *
 * SlackSender is the "ops alert mouth" of the notification system, posting
 * critical ISB events to Slack via incoming webhooks with proper error handling,
 * retry logic, and observability.
 *
 * Architecture: "One brain, two mouths" pattern
 * @see docs/notification-architecture.md#SlackSender
 *
 * Security Controls:
 * - SECURITY: Never log webhook URL in plain text (AC-1.7, AC-6.18)
 * - Webhook URL retrieved from Secrets Manager at runtime
 * - HTTP redirects disabled to prevent URL leaks (EC-AC-3)
 * - Response validation ensures {"ok": true} (EC-AC-5)
 *
 * Error Classification:
 * - 400: PermanentError (malformed payload, no retry)
 * - 401/403: CriticalError (webhook revoked, immediate alarm)
 * - 429: RetriableError (rate limited, exponential backoff)
 * - 5xx: RetriableError (infrastructure issue)
 * - Network timeout: RetriableError (socket error)
 */

import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { getSecrets } from './secrets';
import {
  RetriableError,
  PermanentError,
  CriticalError,
  classifyHttpError,
} from './errors';
import type { ActionLink } from './block-kit-builder';
import type { SlackAlertType } from './slack-templates';

// =========================================================================
// Types
// =========================================================================

/**
 * Parameters for sending a Slack alert
 */
export interface SlackSendParams {
  /** Type of alert being sent */
  alertType: SlackAlertType;
  /** AWS account ID affected */
  accountId: string;
  /** Priority level for the alert */
  priority: 'critical' | 'normal';
  /** Additional context details */
  details: Record<string, string | number | undefined>;
  /** Event ID for audit trail */
  eventId: string;
  /** Optional action links for buttons (recommended for critical alerts) */
  actionLinks?: ActionLink[];
}

/**
 * Internal payload structure sent to Slack Workflow webhook
 * Uses workflow variable format (not Block Kit)
 */
interface SlackWorkflowPayload {
  alertType: string;
  username: string;
  accountid: string;
  details: string;
}

/**
 * Slack webhook response structure
 */
interface SlackResponse {
  ok: boolean;
}

// =========================================================================
// Constants
// =========================================================================

/** Retry delays in milliseconds for exponential backoff (AC-1.2) */
const RETRY_DELAYS_MS = [100, 500, 1000];

/** Maximum retry attempts (AC-1.2) */
const MAX_RETRIES = 3;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 5000;

// =========================================================================
// Logger and Metrics
// =========================================================================

const logger = new Logger({ serviceName: 'ndx-notifications' });
const metrics = new Metrics({
  namespace: 'ndx/notifications',
  serviceName: 'ndx-notifications',
});

// =========================================================================
// Utility Functions
// =========================================================================

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Redact webhook URL for logging (AC-1.7)
 * Shows only protocol and domain, hides path/token
 */
export function redactWebhookUrl(url: string): string {
  if (!url) return 'empty';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}/[REDACTED]`;
  } catch {
    return '[INVALID_URL]';
  }
}

/**
 * Build workflow payload for Slack Workflow webhook
 *
 * Creates a payload with the workflow variables:
 * - alertType: The type of alert (e.g., "AccountQuarantined")
 * - username: NDX Notifications (system identifier)
 * - accountid: AWS Account ID affected
 * - details: Formatted string with all relevant details
 *
 * @param params - Alert parameters
 * @returns Workflow formatted payload
 */
function buildPayload(params: SlackSendParams): SlackWorkflowPayload {
  const { alertType, accountId, priority, details } = params;

  // Format details as a readable string
  const detailLines: string[] = [];
  detailLines.push(`Priority: ${priority.toUpperCase()}`);

  for (const [key, value] of Object.entries(details)) {
    if (value !== undefined) {
      detailLines.push(`${key}: ${value}`);
    }
  }

  return {
    alertType,
    username: 'NDX Notifications',
    accountid: accountId,
    details: detailLines.join('\n'),
  };
}

// =========================================================================
// SlackSender Class
// =========================================================================

/**
 * Singleton wrapper for Slack webhook integration
 *
 * Implements:
 * - Singleton pattern for webhook URL caching
 * - POST to webhook with retry logic (AC-1.1, AC-1.2)
 * - Exponential backoff for retries (AC-1.2, AC-1.5)
 * - Error classification (AC-1.3, AC-1.4)
 * - Success logging and metrics (AC-1.6)
 * - Security validations (EC-AC-1, EC-AC-3, EC-AC-5)
 */
export class SlackSender {
  private static instance: SlackSender | null = null;
  private webhookUrl: string | null = null;

  /**
   * Private constructor - use getInstance() instead
   * SECURITY: Never log webhook URL in plain text (AC-1.7)
   */
  private constructor() {
    logger.debug('SlackSender instance created');
  }

  /**
   * Get singleton instance
   * Lazily initializes with webhook URL from Secrets Manager
   */
  static async getInstance(): Promise<SlackSender> {
    if (!SlackSender.instance) {
      logger.debug('Creating new SlackSender instance');
      SlackSender.instance = new SlackSender();
    }
    return SlackSender.instance;
  }

  /**
   * Reset singleton for testing
   */
  static resetInstance(): void {
    SlackSender.instance = null;
  }

  /**
   * Get webhook URL from Secrets Manager with caching
   * SECURITY: Never log the actual webhook URL (AC-1.7)
   */
  private async getWebhookUrl(): Promise<string> {
    if (this.webhookUrl !== null) {
      logger.debug('Returning cached webhook URL', {
        urlPreview: redactWebhookUrl(this.webhookUrl),
      });
      return this.webhookUrl;
    }

    logger.info('Retrieving Slack webhook URL from Secrets Manager');
    const secrets = await getSecrets();
    this.webhookUrl = secrets.slackWebhookUrl;

    // EC-AC-1: Validate webhook URL is non-empty
    if (!this.webhookUrl || this.webhookUrl.trim() === '') {
      throw new PermanentError('Slack webhook URL is empty or missing');
    }

    logger.info('Slack webhook URL retrieved', {
      urlPreview: redactWebhookUrl(this.webhookUrl),
    });

    return this.webhookUrl;
  }

  /**
   * Send a Slack alert via webhook
   *
   * @param params - Alert parameters
   * @returns Promise that resolves when message is sent
   * @throws RetriableError, PermanentError, CriticalError
   */
  async send(params: SlackSendParams): Promise<void> {
    const { alertType, eventId, priority } = params;
    const startTime = Date.now();

    // Step 1: Get webhook URL from Secrets Manager
    const webhookUrl = await this.getWebhookUrl();

    // Step 2: Build payload
    const payload = buildPayload(params);

    // Step 3: Log send attempt
    logger.info('Sending Slack alert', {
      eventId,
      alertType,
      priority,
      urlPreview: redactWebhookUrl(webhookUrl),
    });

    // Step 4: POST with retry logic
    try {
      await this.postWithRetry(webhookUrl, payload, eventId, alertType);

      // Step 5: Log success with latency (AC-1.6)
      const latencyMs = Date.now() - startTime;
      logger.info('Slack alert sent successfully', {
        eventId,
        alertType,
        priority,
        latencyMs,
      });

      // Step 6: Publish success metrics (AC-1.6)
      metrics.addMetric('SlackMessageSent', MetricUnit.Count, 1);
      metrics.addDimension('alertType', alertType);
      metrics.addDimension('priority', priority);
      metrics.addMetric('SlackWebhookLatency', MetricUnit.Milliseconds, latencyMs);
    } catch (error) {
      // Log failure
      const latencyMs = Date.now() - startTime;
      logger.error('Slack alert failed', {
        eventId,
        alertType,
        priority,
        latencyMs,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      // Publish failure metrics
      metrics.addMetric('SlackMessageFailed', MetricUnit.Count, 1);
      metrics.addDimension('alertType', alertType);
      metrics.addDimension(
        'reason',
        error instanceof Error ? error.name : 'UnknownError'
      );

      throw error;
    }
  }

  /**
   * POST to webhook with exponential backoff retry logic
   *
   * Implements:
   * - AC-1.1: POST with Content-Type: application/json
   * - AC-1.2: Exponential backoff (100ms, 500ms, 1000ms)
   * - AC-1.5: Retry on network timeout
   * - EC-AC-3: Disable HTTP redirects
   * - EC-AC-5: Verify response {"ok": true}
   *
   * @param url - Webhook URL
   * @param payload - Slack message payload
   * @param eventId - Event ID for logging
   * @param alertType - Alert type for metrics
   * @throws RetriableError, PermanentError, CriticalError
   */
  private async postWithRetry(
    url: string,
    payload: SlackWorkflowPayload,
    eventId: string,
    alertType: string
  ): Promise<void> {
    let lastError: Error | undefined;

    // Try up to MAX_RETRIES + 1 times (initial attempt + retries)
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Log retry attempt
        if (attempt > 0) {
          logger.info('Retrying Slack webhook POST', {
            eventId,
            attempt,
            maxRetries: MAX_RETRIES,
          });
          metrics.addMetric('SlackRetryCount', MetricUnit.Count, 1);
          metrics.addDimension('alertType', alertType);
        }

        // AC-1.1, AC-1.8: POST with Content-Type: application/json
        // EC-AC-3: Disable redirects to prevent URL leak in logs
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          redirect: 'error', // EC-AC-3: Disable HTTP redirects
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle HTTP response
        if (response.ok) {
          // EC-AC-5: Verify response {"ok": true}
          let body: SlackResponse;
          try {
            body = (await response.json()) as SlackResponse;
          } catch {
            // Slack sometimes returns just "ok" as text
            throw new PermanentError('Invalid JSON response from Slack webhook');
          }

          if (body.ok !== true) {
            logger.error('Slack webhook returned ok: false', {
              eventId,
              responseBody: body,
            });
            throw new PermanentError('Slack webhook returned ok: false');
          }

          // Success!
          return;
        }

        // Handle error responses
        const statusCode = response.status;
        let errorMessage: string;
        try {
          const errorBody = await response.text();
          errorMessage = errorBody || `HTTP ${statusCode}`;
        } catch {
          errorMessage = `HTTP ${statusCode}`;
        }

        // Classify error using existing error classification
        const classifiedError = classifyHttpError(statusCode, errorMessage, 'slack');

        // AC-1.2, AC-1.5: Retry on 429, 5xx with exponential backoff
        if (classifiedError instanceof RetriableError) {
          if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAYS_MS[attempt];
            logger.warn('Retriable error, will retry after delay', {
              eventId,
              statusCode,
              attempt,
              delayMs,
            });
            await sleep(delayMs);
            lastError = classifiedError;
            continue; // Retry
          } else {
            // AC-1.3: All retries exhausted, throw RetriableError
            logger.error('All retries exhausted', {
              eventId,
              statusCode,
              attempts: attempt + 1,
            });
            throw new RetriableError(
              `Slack webhook failed after ${attempt + 1} attempts: ${errorMessage}`,
              { cause: classifiedError }
            );
          }
        }

        // AC-1.4: CriticalError for 401/403 (webhook revoked)
        // PermanentError for 400 (bad request)
        // These are not retriable, throw immediately
        throw classifiedError;
      } catch (error) {
        // Handle network errors and timeouts
        if (error instanceof TypeError || (error as Error).name === 'AbortError') {
          // Network error or timeout
          if (attempt < MAX_RETRIES) {
            const delayMs = RETRY_DELAYS_MS[attempt];
            logger.warn('Network error, will retry after delay', {
              eventId,
              attempt,
              delayMs,
              errorName: (error as Error).name,
              errorMessage: (error as Error).message,
            });
            await sleep(delayMs);
            lastError = error as Error;
            continue; // Retry
          } else {
            // AC-1.5: Network timeout after retries
            logger.error('Network timeout after all retries', {
              eventId,
              attempts: attempt + 1,
              errorName: (error as Error).name,
            });
            throw new RetriableError(
              `Network timeout after ${attempt + 1} attempts`,
              { cause: error as Error }
            );
          }
        }

        // Re-throw classified errors (CriticalError, PermanentError, RetriableError)
        if (
          error instanceof CriticalError ||
          error instanceof PermanentError ||
          error instanceof RetriableError
        ) {
          throw error;
        }

        // Unexpected error - wrap as RetriableError for safety
        logger.error('Unexpected error during Slack webhook POST', {
          eventId,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
        });
        throw new RetriableError('Unexpected error during Slack webhook POST', {
          cause: error instanceof Error ? error : undefined,
        });
      }
    }

    // Should never reach here, but TypeScript needs this
    throw new RetriableError('Slack webhook failed after retries', {
      cause: lastError,
    });
  }
}
