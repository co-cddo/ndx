/**
 * NDX Notification Handler - Entry Point
 *
 * This Lambda function processes EventBridge events from the Innovation Sandbox (ISB)
 * and routes them to GOV.UK Notify for user emails.
 *
 * Note: Slack notifications for ops alerts are handled by AWS Chatbot via
 * EventBridge → SNS → Chatbot (Story 6.1). This Lambda no longer sends
 * direct Slack webhooks (removed in Story 6.3).
 *
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

import { Logger } from "@aws-lambda-powertools/logger"
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics"
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"
import type { EventBridgeEvent, HandlerResponse, NotificationEventType } from "./types"
import { ALLOWED_SOURCES } from "./types"
import { SecurityError } from "./errors"
import { validateEvent } from "./validation"
import { validateAllTemplatesOnce } from "./template-validation"
import { NotifySender } from "./notify-sender"
import {
  getTemplateConfig,
  getTemplateId,
  buildPersonalisation,
  isLeaseLifecycleEvent,
  isMonitoringAlertEvent,
  formatCurrency,
  formatUKDate,
} from "./templates"
import { fetchLeaseRecord } from "./enrichment"
import { flattenObject, addKeysParameter } from "./flatten"
import { validateLeaseStatus, logFieldPresence } from "./lease-status"

// SNS client for publishing Slack notifications
const snsClient = new SNSClient({})

// =========================================================================
// Slack Notification Publishing (Story 6.1)
// =========================================================================

/**
 * Publish enriched notification to SNS for AWS Chatbot → Slack
 *
 * Uses AWS Chatbot custom notification format:
 * @see https://docs.aws.amazon.com/chatbot/latest/adminguide/custom-notifs.html
 */
async function publishSlackNotification(
  event: EventBridgeEvent,
  enrichedData: Record<string, string>,
  eventId: string,
): Promise<void> {
  const topicArn = process.env.EVENTS_TOPIC_ARN
  if (!topicArn) {
    logger.debug("EVENTS_TOPIC_ARN not configured - skipping Slack notification", { eventId })
    return
  }

  const eventType = event["detail-type"]
  const detail = event.detail as Record<string, unknown>

  // Extract user email from enriched data or event
  const userEmail = enrichedData.userEmail || enrichedData.principalEmail || (detail.userEmail as string) || (detail.principalEmail as string) || ""

  // Extract template name from enriched data or event (ISB uses various field names)
  const templateName =
    enrichedData.templateName ||
    enrichedData.leaseTemplateName ||
    enrichedData.originalLeaseTemplateName ||
    (detail.templateName as string) ||
    (detail.leaseTemplateName as string) ||
    (detail.originalLeaseTemplateName as string) ||
    ""

  // Extract lease ID
  const leaseId = (typeof detail.leaseId === "string" ? detail.leaseId : enrichedData.uuid) || ""

  // Extract account ID from enriched data or event
  const accountId = enrichedData.awsAccountId || enrichedData.accountId || (detail.accountId as string) || (detail.awsAccountId as string) || ""

  // Build description lines (only include non-empty fields)
  const descriptionParts: string[] = []
  if (userEmail) descriptionParts.push(`*User:* ${userEmail}`)
  if (templateName) descriptionParts.push(`*Template:* ${templateName}`)
  if (leaseId) descriptionParts.push(`*Lease ID:* ${leaseId}`)
  if (accountId) descriptionParts.push(`*Account:* ${accountId}`)

  // AWS Chatbot custom notification format
  const chatbotMessage = {
    version: "1.0",
    source: "custom",
    content: {
      textType: "client-markdown",
      title: eventType,
      description: descriptionParts.join("\n"),
    },
    metadata: {
      eventType,
      eventId,
    },
  }

  // Log field resolution for debugging (INFO level to see in prod)
  logger.info("Slack notification field resolution", {
    detailKeys: Object.keys(detail),
    eventId,
    enrichedTemplateName: enrichedData.templateName,
    enrichedLeaseTemplateName: enrichedData.leaseTemplateName,
    enrichedOriginalLeaseTemplateName: enrichedData.originalLeaseTemplateName,
    detailTemplateName: detail.templateName,
    detailLeaseTemplateName: detail.leaseTemplateName,
    resolvedTemplateName: templateName,
    enrichedKeys: Object.keys(enrichedData).filter((k) => k.toLowerCase().includes("template")),
  })

  // Log the full Chatbot message for debugging
  logger.info("Publishing Slack notification", {
    eventId,
    eventType,
    chatbotMessage,
  })

  try {
    await snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(chatbotMessage),
      }),
    )

    logger.info("Slack notification published successfully", {
      eventId,
      eventType,
    })
    metrics.addMetric("SlackNotificationSent", MetricUnit.Count, 1)
  } catch (error) {
    // Log but don't fail - Slack is best-effort
    logger.warn("Failed to publish Slack notification", {
      eventId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    metrics.addMetric("SlackNotificationFailed", MetricUnit.Count, 1)
  }
}

// =========================================================================
// Field Mapping (DynamoDB → GOV.UK Notify Templates)
// =========================================================================

/**
 * Map DynamoDB field names to GOV.UK Notify template field names.
 *
 * DynamoDB uses different field names than the templates expect:
 * - awsAccountId → accountId
 * - maxSpend → budgetLimit (formatted as $X.XX - AWS costs are in USD)
 * - expirationDate → expiryDate (formatted as DD/MM/YYYY, HH:MM:SS in Europe/London)
 *
 * This ensures enriched data from DynamoDB can override fallback values
 * in the email personalisation.
 */

/**
 * Apply field name mappings from DynamoDB to template field names.
 * Creates aliases for fields that have different names in templates.
 * Also applies formatting for currency and date fields.
 *
 * @param enrichedData - Flattened data from DynamoDB
 * @returns Data with additional alias fields for template compatibility
 */
export function mapEnrichedFieldsToTemplateNames(enrichedData: Record<string, string>): Record<string, string> {
  const mapped = { ...enrichedData }

  // Map awsAccountId → accountId (no formatting needed)
  if (mapped.awsAccountId !== undefined && mapped.accountId === undefined) {
    mapped.accountId = mapped.awsAccountId
  }

  // Map maxSpend → budgetLimit with currency formatting ($X.XX - AWS costs are in USD)
  if (mapped.maxSpend !== undefined && mapped.budgetLimit === undefined) {
    const amount = parseFloat(mapped.maxSpend)
    mapped.budgetLimit = isNaN(amount) ? mapped.maxSpend : formatCurrency(amount)
  }

  // Map expirationDate → expiryDate with UK date formatting (DD/MM/YYYY, HH:MM:SS in Europe/London)
  if (mapped.expirationDate !== undefined && mapped.expiryDate === undefined) {
    mapped.expiryDate = formatUKDate(mapped.expirationDate)
  }

  return mapped
}

// =========================================================================
// Cold Start Template Validation (AC-9.7)
// =========================================================================

/**
 * Cold start initialization state
 *
 * Template validation runs once per Lambda container during cold start.
 * This detects template drift before the first email is sent.
 */
let coldStartValidationComplete = false
let coldStartValidationError: Error | null = null

// Trigger validation during module load (cold start)
// This runs in parallel with Lambda runtime initialization
validateAllTemplatesOnce()
  .then(() => {
    coldStartValidationComplete = true
  })
  .catch((error: Error) => {
    coldStartValidationError = error
    // Log but don't throw here - we'll check in handler
  })

// =========================================================================
// Lambda Powertools Configuration (AC-3.3)
// =========================================================================

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "SILENT"

const logger = new Logger({
  serviceName: "ndx-notifications",
  logLevel: (process.env.LOG_LEVEL as LogLevel | undefined) || "INFO",
  persistentLogAttributes: {
    environment: process.env.ENVIRONMENT || "unknown",
  },
})

const metrics = new Metrics({
  namespace: "ndx/notifications",
  serviceName: "ndx-notifications",
})

// =========================================================================
// Security Utilities
// =========================================================================

/**
 * Sanitize log input to prevent log injection attacks (AC-3.8.1)
 * Escapes newlines, carriage returns, and other control characters
 */
export function sanitizeLogInput(input: string): string {
  if (typeof input !== "string") {
    return String(input)
  }
  // Escape control characters that could cause log injection
  // eslint-disable-next-line no-control-regex
  const controlCharRegex = /[\x00-\x1F\x7F]/g
  return input
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(controlCharRegex, (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
}

/**
 * Redact email addresses for security logs (AC-3.10, GDPR compliance)
 */
export function redactEmail(email: string | undefined): string {
  if (!email) {
    return "[NO_EMAIL]"
  }
  return "[REDACTED]"
}

/**
 * Check if email domain is .gov.uk and emit metric if not (AC-3.7, AC-3.7.1)
 * This is defense in depth - actual email verification is in N-5
 */
export function checkEmailDomain(email: string | undefined, eventId: string): void {
  if (!email) {
    return
  }

  const domain = email.split("@")[1]?.toLowerCase()
  if (domain && !domain.endsWith(".gov.uk")) {
    // Emit suspicious email metric (Red Team requirement)
    metrics.addMetric("SuspiciousEmailDomain", MetricUnit.Count, 1)
    logger.warn("Non-.gov.uk email domain detected", {
      eventId,
      emailDomain: sanitizeLogInput(domain),
      email: redactEmail(email),
    })
  }
}

/**
 * Validate that the event source is in our allowed list (AC-3.1, AC-3.1.1, AC-3.2)
 * This is a defense-in-depth measure - EventBridge rules also filter by source
 */
export function validateEventSource(event: EventBridgeEvent): void {
  const source = event.source
  const sanitizedSource = sanitizeLogInput(source)

  if (!ALLOWED_SOURCES.includes(source as (typeof ALLOWED_SOURCES)[number])) {
    logger.error("Invalid event source rejected", {
      eventId: event.id,
      source: sanitizedSource,
      expectedSources: ALLOWED_SOURCES,
    })

    // Emit security metric
    metrics.addMetric("SecurityRejection", MetricUnit.Count, 1)

    throw new SecurityError("Invalid event source", {
      expectedSource: ALLOWED_SOURCES.join(", "),
      actualSource: sanitizedSource,
      eventId: event.id,
    })
  }
}

// =========================================================================
// Event Processing
// =========================================================================

/**
 * Determine which notification channel(s) to use based on event type.
 *
 * Note: Slack notifications are now handled by AWS Chatbot via EventBridge → SNS.
 * This function only determines if email notifications should be sent.
 * Ops-only events (AccountCleanupFailed, AccountQuarantined, AccountDriftDetected)
 * do NOT trigger email - they are ops alerts only via Chatbot.
 */
function getNotificationChannels(eventType: NotificationEventType): "email"[] {
  // Ops events go to Chatbot only (no user email from this Lambda)
  const opsOnlyEvents: NotificationEventType[] = ["AccountCleanupFailed", "AccountQuarantined", "AccountDriftDetected"]

  if (opsOnlyEvents.includes(eventType)) {
    return [] // No email for ops-only events
  }

  // All lease lifecycle events get email notifications to users
  return ["email"]
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
  if (typeof detail === "object" && detail !== null) {
    const d = detail as Record<string, unknown>

    // Check top-level email fields
    if (typeof d.userEmail === "string") return d.userEmail
    if (typeof d.principalEmail === "string") return d.principalEmail
    if (typeof d.email === "string") return d.email

    // Check leaseId object (ISB sometimes nests email in leaseId)
    if (d.leaseId && typeof d.leaseId === "object") {
      const leaseId = d.leaseId as Record<string, unknown>
      if (typeof leaseId.userEmail === "string") return leaseId.userEmail
      if (typeof leaseId.principalEmail === "string") return leaseId.principalEmail
    }

    // Check nested lease object
    if (d.lease && typeof d.lease === "object") {
      const lease = d.lease as Record<string, unknown>
      if (typeof lease.userEmail === "string") return lease.userEmail
      if (typeof lease.principalEmail === "string") return lease.principalEmail
    }
  }
  return undefined
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
  const eventId = event.id
  const eventType = event["detail-type"] as NotificationEventType
  const sanitizedEventType = sanitizeLogInput(eventType)

  // Add correlation IDs to all logs (AC-3.4)
  logger.appendKeys({
    eventId,
    eventType: sanitizedEventType,
    correlationId: eventId, // Use event ID as correlation ID
  })

  // Log event receipt (AC-3.8 - INFO level for success path)
  logger.info("Event received", {
    source: sanitizeLogInput(event.source),
    timestamp: event.time,
    account: event.account,
  })

  try {
    // Step 0: Check cold start validation status (AC-9.8)
    // If template validation failed during cold start, fail fast
    if (coldStartValidationError) {
      logger.error("Cold start template validation failed", {
        error: coldStartValidationError.message,
      })
      throw coldStartValidationError
    }

    // Ensure validation is complete before processing (defensive)
    if (!coldStartValidationComplete) {
      // Wait for validation to complete if still in progress
      await validateAllTemplatesOnce()
    }

    // Step 1: Validate event source (security control - AC-3.1)
    validateEventSource(event)

    // Step 2: Check email domain for suspicious activity (AC-3.7)
    const userEmail = extractUserEmail(event.detail)
    checkEmailDomain(userEmail, eventId)

    // Step 3: Determine notification channels
    const channels = getNotificationChannels(eventType)

    // Step 4: Process email notifications
    // Note: Slack alerts are handled by AWS Chatbot via EventBridge → SNS (Story 6.1)

    // Email notifications (user events)
    if (channels.includes("email") && (isLeaseLifecycleEvent(eventType) || isMonitoringAlertEvent(eventType))) {
      const validatedEvent = validateEvent(event)

      // Get template configuration
      const templateConfig = getTemplateConfig(eventType)
      const templateId = getTemplateId(templateConfig)

      // N7-4: Fetch and flatten lease record for enrichment
      // N7-5: Track enrichment timing for performance monitoring
      const detail = event.detail as Record<string, unknown>
      const leaseId = detail.leaseId

      // ISB sends leaseId as string (UUID) or object { userEmail, uuid }
      let userEmail: string | undefined
      let uuid: string | undefined

      if (typeof leaseId === "string") {
        // Current ISB format: leaseId is the UUID string
        uuid = leaseId
        userEmail = (detail.userEmail || detail.principalEmail) as string | undefined
      } else if (leaseId && typeof leaseId === "object") {
        // Legacy format: leaseId is object { userEmail, uuid }
        const leaseIdObj = leaseId as { userEmail?: string; uuid?: string }
        uuid = leaseIdObj.uuid
        userEmail = leaseIdObj.userEmail || (detail.userEmail as string | undefined)
      } else {
        // Fallback: try top-level fields
        userEmail = detail.userEmail as string | undefined
        uuid = detail.uuid as string | undefined
      }

      logger.debug("Extracting lease key for enrichment", {
        eventId,
        leaseIdType: typeof leaseId,
        hasUserEmail: !!userEmail,
        hasUuid: !!uuid,
      })

      let enrichedData: Record<string, string> = {}
      let enrichmentStatus: "success" | "failed" | "skipped" = "skipped"
      const enrichmentStartTime = Date.now()

      if (userEmail && uuid) {
        try {
          const leaseRecord = await fetchLeaseRecord(userEmail, uuid, eventId)
          const enrichmentDurationMs = Date.now() - enrichmentStartTime

          if (leaseRecord) {
            // N7-6: Validate lease status (logs warning for unknown statuses)
            const leaseStatus = leaseRecord.status
            validateLeaseStatus(leaseStatus, eventId)

            // N7-4 AC-2-5: Flatten lease record and include key fields

            const { flattened } = flattenObject(leaseRecord as unknown as Record<string, unknown>, { eventId })
            enrichedData = flattened

            // N7-6: Log field presence analysis for monitoring schema evolution
            logFieldPresence(enrichedData, leaseStatus, eventId)

            // N7-4: Set _enriched flag
            enrichedData["_enriched"] = "true"
            enrichmentStatus = "success"

            // N7-5: Log enrichment success with duration
            logger.info("Lease record enriched for notification", {
              eventId,
              enrichmentStatus,
              enrichmentDurationMs,
              leaseStatus,
              enrichedFieldCount: Object.keys(enrichedData).length,
              hasMaxSpend: "maxSpend" in enrichedData,
              hasLeaseDurationInHours: "leaseDurationInHours" in enrichedData,
            })

            // N7-5: Emit EnrichmentSuccess metric
            metrics.addMetric("EnrichmentSuccess", MetricUnit.Count, 1)
            metrics.addMetric("EnrichmentDurationMs", MetricUnit.Milliseconds, enrichmentDurationMs)
          } else {
            // N7-5: Graceful degradation - continue without enrichment
            enrichedData["_enriched"] = "false"
            enrichmentStatus = "failed"

            logger.warn("Lease record not found for enrichment - continuing with event data only", {
              eventId,
              enrichmentStatus,
              enrichmentDurationMs,
              userEmailHash: userEmail ? "[REDACTED]" : "missing",
              uuid: uuid || "missing",
            })

            // N7-5: EnrichmentFailure metric with NotFound dimension (LeaseNotFound already emitted in fetchLeaseRecord)
            metrics.addMetric("EnrichmentFailure", MetricUnit.Count, 1)
            metrics.addDimension("ErrorType", "NotFound")
          }
        } catch (error) {
          // N7-5: Handle enrichment errors with graceful degradation
          const enrichmentDurationMs = Date.now() - enrichmentStartTime
          enrichedData["_enriched"] = "false"
          enrichmentStatus = "failed"

          // N7-5: Classify error type for metric dimension
          let errorType = "Other"
          if (error instanceof Error) {
            if (error.name === "ProvisionedThroughputExceededException" || error.message.includes("throttle")) {
              errorType = "Throttled"
            } else if (error.message.includes("timeout") || error.name === "TimeoutError") {
              errorType = "Timeout"
            }
          }

          logger.warn("Enrichment failed - continuing with event data only", {
            eventId,
            enrichmentStatus,
            enrichmentDurationMs,
            errorType,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          })

          // N7-5: EnrichmentFailure metric with error type dimension
          metrics.addMetric("EnrichmentFailure", MetricUnit.Count, 1)
          metrics.addDimension("ErrorType", errorType)
          metrics.addMetric("EnrichmentDurationMs", MetricUnit.Milliseconds, enrichmentDurationMs)
        }
      } else {
        enrichedData["_enriched"] = "false"
        logger.debug("No lease key in event - skipping enrichment", {
          eventId,
          enrichmentStatus,
        })
      }

      // Build personalisation from event data (enrichedData passed for reference)
      const personalisation = buildPersonalisation(validatedEvent)

      // N7-4 AC-1: Merge with enriched data (enriched takes precedence)
      // Convert personalisation values to strings for consistency
      const stringifiedPersonalisation: Record<string, string> = {}
      for (const [key, value] of Object.entries(personalisation)) {
        stringifiedPersonalisation[key] = String(value)
      }

      // Map DynamoDB field names to template field names (e.g., awsAccountId → accountId)
      const mappedEnrichedData = mapEnrichedFieldsToTemplateNames(enrichedData)

      // N7-4 AC-5: Add keys parameter listing all available fields
      const enrichedPersonalisation = addKeysParameter(
        {
          ...stringifiedPersonalisation,
          ...mappedEnrichedData,
        },
        eventId,
      )

      // Extract user email from event detail
      const recipientEmail = extractUserEmail(event.detail)
      if (!recipientEmail) {
        logger.error("No recipient email found in event", { eventId })
        throw new Error("Missing recipient email in event detail")
      }

      // Send via GOV.UK Notify
      const sender = await NotifySender.getInstance()
      const response = await sender.send({
        templateId,
        email: recipientEmail,
        personalisation: enrichedPersonalisation,
        eventId,
        eventUserEmail: recipientEmail,
      })

      logger.info("Email sent successfully", {
        eventId,
        notifyId: response.id,
        templateId,
        eventType: sanitizedEventType,
        enriched: enrichedData["_enriched"] === "true",
      })

      metrics.addMetric("EmailSent", MetricUnit.Count, 1)
      if (enrichedData["_enriched"] === "true") {
        metrics.addMetric("EnrichedEmailSent", MetricUnit.Count, 1)
      }

      // Publish enriched Slack notification via SNS → AWS Chatbot
      await publishSlackNotification(event, mappedEnrichedData, eventId)
    }

    logger.info("Event processed successfully", {
      channels,
      processingStatus: "success",
    })

    // Emit success metric
    metrics.addMetric("NotificationSuccess", MetricUnit.Count, 1)
    metrics.addMetric("EventsProcessed", MetricUnit.Count, 1)

    // Flush metrics
    metrics.publishStoredMetrics()

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        eventId,
        eventType: sanitizedEventType,
        channels,
      }),
    }
  } catch (error) {
    // Log error with appropriate level (AC-3.8 - ERROR for DLQ-worthy errors)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorName = error instanceof Error ? error.name : "Error"

    logger.error("Event processing failed", {
      processingStatus: "failed",
      errorName,
      errorMessage: sanitizeLogInput(errorMessage),
    })

    // Emit failure metric
    metrics.addMetric("NotificationFailure", MetricUnit.Count, 1)
    metrics.publishStoredMetrics()

    // Re-throw to trigger Lambda retry/DLQ behavior
    throw error
  }
}
