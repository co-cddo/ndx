/**
 * DLQ Digest Handler - Daily Summary of Dead Letter Queue Messages
 *
 * This Lambda runs daily (scheduled) and summarizes any messages in the
 * notification system's DLQ, sending a digest to Slack for ops visibility.
 *
 * Story: N6.7 - Daily DLQ Summary Slack Digest (Pre-mortem)
 *
 * Acceptance Criteria:
 * - UJ-AC-7: DLQ digest includes direct link to SQS queue in Console
 * - UJ-AC-8: DLQ digest shows preview of top 3 error types
 * - AC-CROSS-3: Daily DLQ digest when messages present for 24-48h
 *
 * Architecture:
 * - Runs on CloudWatch Events schedule (9am UTC daily)
 * - Reads DLQ messages using ReceiveMessage with VisibilityTimeout=0 (peek)
 * - Aggregates by error type and event type
 * - Posts summary to Slack via SlackSender
 *
 * Security Controls:
 * - No PII exposed (only aggregate counts and error categories)
 * - Uses existing SlackSender with webhook from Secrets Manager
 */

import { Logger } from "@aws-lambda-powertools/logger"
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics"
import { ScheduledEvent } from "aws-lambda"
import {
  SQSClient,
  ReceiveMessageCommand,
  GetQueueAttributesCommand,
  MessageSystemAttributeName,
} from "@aws-sdk/client-sqs"
import { SlackSender } from "./slack-sender"

// =============================================================================
// Configuration
// =============================================================================

const logger = new Logger({ serviceName: "ndx-notifications-dlq-digest" })
const metrics = new Metrics({
  namespace: "ndx/notifications",
  serviceName: "ndx-notifications-dlq-digest",
})

const sqsClient = new SQSClient({})

// Environment variable getters (exported for testability)
export function getDLQUrl(): string {
  return process.env.DLQ_URL || ""
}

export function getAWSRegion(): string {
  return process.env.AWS_REGION || "eu-west-2"
}

// =============================================================================
// Types
// =============================================================================

interface DLQMessageSummary {
  totalMessages: number
  oldestMessageAge: number // seconds
  errorCategories: Map<string, number>
  eventTypeCategories: Map<string, number>
  sampleErrors: string[]
}

interface DLQDigestPayload {
  messageCount: number
  oldestMessageHours: number
  topErrors: Array<{ type: string; count: number }>
  topEventTypes: Array<{ type: string; count: number }>
  queueUrl: string
  consoleUrl: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build AWS Console URL for the DLQ
 */
function buildDLQConsoleUrl(queueUrl: string, region: string): string {
  // Extract queue name from URL
  // Format: https://sqs.{region}.amazonaws.com/{account}/{queue-name}
  const parts = queueUrl.split("/")
  const queueName = parts[parts.length - 1]
  const accountId = parts[parts.length - 2]

  return `https://${region}.console.aws.amazon.com/sqs/v3/home?region=${region}#/queues/https%3A%2F%2Fsqs.${region}.amazonaws.com%2F${accountId}%2F${queueName}`
}

/**
 * Shape of a parsed DLQ message body for error extraction
 */
interface DLQMessageBody {
  errorType?: string
  error?: { name?: string; type?: string }
  errorMessage?: string
  "detail-type"?: string
  detail?: { eventType?: string }
  eventType?: string
}

/**
 * Parse error category from DLQ message body
 */
function parseErrorCategory(messageBody: string): string {
  try {
    const parsed = JSON.parse(messageBody) as DLQMessageBody
    // Try to extract error type from various possible locations
    if (parsed.errorType) return parsed.errorType
    if (parsed.error?.name) return parsed.error.name
    if (parsed.error?.type) return parsed.error.type
    if (parsed.errorMessage) {
      // Extract first few words as category
      const firstLine = parsed.errorMessage.split("\n")[0]
      return firstLine.substring(0, 50)
    }
    return "Unknown"
  } catch {
    return "ParseError"
  }
}

/**
 * Parse event type from DLQ message body
 */
function parseEventType(messageBody: string): string {
  try {
    const parsed = JSON.parse(messageBody) as DLQMessageBody
    // Try to extract event type from various possible locations
    if (parsed["detail-type"]) return parsed["detail-type"]
    if (parsed.detail?.eventType) return parsed.detail.eventType
    if (parsed.eventType) return parsed.eventType
    return "Unknown"
  } catch {
    return "Unknown"
  }
}

/**
 * Peek at DLQ messages without consuming them
 */
async function peekDLQMessages(): Promise<DLQMessageSummary> {
  const dlqUrl = getDLQUrl()
  const summary: DLQMessageSummary = {
    totalMessages: 0,
    oldestMessageAge: 0,
    errorCategories: new Map(),
    eventTypeCategories: new Map(),
    sampleErrors: [],
  }

  // First, get queue attributes to know total message count
  const attributesResponse = await sqsClient.send(
    new GetQueueAttributesCommand({
      QueueUrl: dlqUrl,
      AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible"],
    }),
  )

  const visibleMessages = parseInt(attributesResponse.Attributes?.ApproximateNumberOfMessages || "0", 10)
  const notVisibleMessages = parseInt(attributesResponse.Attributes?.ApproximateNumberOfMessagesNotVisible || "0", 10)
  summary.totalMessages = visibleMessages + notVisibleMessages

  if (summary.totalMessages === 0) {
    return summary
  }

  // Receive messages with visibility timeout = 0 to peek without consuming
  // We sample up to 10 messages for categorization
  const receiveResponse = await sqsClient.send(
    new ReceiveMessageCommand({
      QueueUrl: dlqUrl,
      MaxNumberOfMessages: 10,
      VisibilityTimeout: 0, // Peek without consuming
      MessageSystemAttributeNames: [
        MessageSystemAttributeName.SentTimestamp,
        MessageSystemAttributeName.ApproximateFirstReceiveTimestamp,
      ],
    }),
  )

  const messages = receiveResponse.Messages || []

  for (const message of messages) {
    // Track oldest message age
    if (message.Attributes?.SentTimestamp) {
      const sentTime = parseInt(message.Attributes.SentTimestamp, 10)
      const ageSeconds = Math.floor((Date.now() - sentTime) / 1000)
      if (ageSeconds > summary.oldestMessageAge) {
        summary.oldestMessageAge = ageSeconds
      }
    }

    if (message.Body) {
      // Categorize error type
      const errorCategory = parseErrorCategory(message.Body)
      summary.errorCategories.set(errorCategory, (summary.errorCategories.get(errorCategory) || 0) + 1)

      // Categorize event type
      const eventType = parseEventType(message.Body)
      summary.eventTypeCategories.set(eventType, (summary.eventTypeCategories.get(eventType) || 0) + 1)

      // Collect sample errors (up to 3)
      if (summary.sampleErrors.length < 3) {
        const preview = message.Body.substring(0, 200) + (message.Body.length > 200 ? "..." : "")
        summary.sampleErrors.push(preview)
      }
    }
  }

  return summary
}

/**
 * Build Slack message for DLQ digest
 */
function buildDigestPayload(summary: DLQMessageSummary): DLQDigestPayload {
  const dlqUrl = getDLQUrl()
  const region = getAWSRegion()

  // Convert maps to sorted arrays (top 3)
  const topErrors = Array.from(summary.errorCategories.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const topEventTypes = Array.from(summary.eventTypeCategories.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const oldestMessageHours = Math.round(summary.oldestMessageAge / 3600)
  const consoleUrl = buildDLQConsoleUrl(dlqUrl, region)

  return {
    messageCount: summary.totalMessages,
    oldestMessageHours,
    topErrors,
    topEventTypes,
    queueUrl: dlqUrl,
    consoleUrl,
  }
}

/**
 * Send DLQ digest to Slack
 */
async function sendDigestToSlack(payload: DLQDigestPayload): Promise<void> {
  const sender = await SlackSender.getInstance()

  // Build details for the Slack message
  const details: Record<string, string | number | undefined> = {
    "Total Messages": payload.messageCount,
    "Oldest Message Age": `${payload.oldestMessageHours} hours`,
    "Top Error Types": payload.topErrors.map((e) => `${e.type}: ${e.count}`).join(", "),
    "Top Event Types": payload.topEventTypes.map((e) => `${e.type}: ${e.count}`).join(", "),
  }

  // Determine priority based on message count and age
  const priority: "critical" | "normal" =
    payload.messageCount > 10 || payload.oldestMessageHours > 48 ? "critical" : "normal"

  await sender.send({
    alertType: "DLQDigest" as "AccountQuarantined", // Cast for type compatibility
    accountId: "N/A",
    priority,
    details,
    eventId: `dlq-digest-${new Date().toISOString().split("T")[0]}`,
    actionLinks: [
      {
        label: "View DLQ in Console",
        url: payload.consoleUrl,
        style: "primary",
      },
      {
        label: "DLQ Runbook",
        url: "https://github.com/cddo/ndx/wiki/runbooks/dlq-investigation",
      },
    ],
  })
}

// =============================================================================
// Lambda Handler
// =============================================================================

/**
 * DLQ Digest Handler
 *
 * Scheduled to run daily at 9am UTC. Checks DLQ for messages and
 * sends a summary digest to Slack if there are any.
 *
 * @param event - CloudWatch scheduled event
 */
export async function handler(event: ScheduledEvent): Promise<void> {
  const startTime = Date.now()
  const dlqUrl = getDLQUrl()

  logger.info("DLQ digest handler starting", {
    scheduledTime: event.time,
    dlqUrl: dlqUrl ? "configured" : "missing",
  })

  if (!dlqUrl) {
    logger.error("DLQ_URL environment variable not configured")
    throw new Error("DLQ_URL environment variable not configured")
  }

  try {
    // Peek at DLQ messages
    const summary = await peekDLQMessages()

    logger.info("DLQ summary collected", {
      totalMessages: summary.totalMessages,
      oldestMessageAgeSeconds: summary.oldestMessageAge,
      errorCategories: summary.errorCategories.size,
    })

    // Emit metrics
    metrics.addMetric("DLQMessageCount", MetricUnit.Count, summary.totalMessages)
    metrics.addMetric("DLQOldestMessageAge", MetricUnit.Seconds, summary.oldestMessageAge)

    // Only send digest if there are messages in the DLQ
    if (summary.totalMessages > 0) {
      const payload = buildDigestPayload(summary)
      await sendDigestToSlack(payload)

      logger.info("DLQ digest sent to Slack", {
        messageCount: payload.messageCount,
        oldestMessageHours: payload.oldestMessageHours,
      })

      metrics.addMetric("DLQDigestSent", MetricUnit.Count, 1)
    } else {
      logger.info("No messages in DLQ, skipping digest")
      metrics.addMetric("DLQDigestSkipped", MetricUnit.Count, 1)
    }

    const latencyMs = Date.now() - startTime
    metrics.addMetric("DLQDigestLatency", MetricUnit.Milliseconds, latencyMs)

    logger.info("DLQ digest handler completed", { latencyMs })
  } catch (error) {
    logger.error("DLQ digest handler failed", { error })
    metrics.addMetric("DLQDigestFailed", MetricUnit.Count, 1)
    throw error
  } finally {
    // Flush metrics
    metrics.publishStoredMetrics()
  }
}
