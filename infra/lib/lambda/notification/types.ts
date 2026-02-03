/**
 * Type definitions for the NDX Notification System
 *
 * This module defines TypeScript interfaces for EventBridge events
 * from the Innovation Sandbox (ISB) system.
 */

/**
 * Base EventBridge event structure from AWS.
 * All ISB events follow this pattern and are routed via EventBridge rules.
 *
 * @typeParam T - The shape of the event detail payload (varies by event type)
 *
 * @example LeaseApproved event
 * ```json
 * {
 *   "version": "0",
 *   "id": "12345678-1234-1234-1234-123456789abc",
 *   "detail-type": "LeaseApproved",
 *   "source": "InnovationSandbox-ndx",
 *   "account": "123456789012",
 *   "time": "2026-01-22T12:00:00Z",
 *   "region": "us-west-2",
 *   "resources": [],
 *   "detail": {
 *     "userEmail": "user@example.gov.uk",
 *     "uuid": "550e8400-e29b-41d4-a716-446655440000",
 *     "awsAccountId": "987654321098",
 *     "templateName": "NDX:Try for AWS",
 *     "maxSpend": 100,
 *     "expirationDate": "2026-02-22T12:00:00Z"
 *   }
 * }
 * ```
 *
 * @example LeaseBudgetThresholdAlert event
 * ```json
 * {
 *   "version": "0",
 *   "id": "87654321-4321-4321-4321-cba987654321",
 *   "detail-type": "LeaseBudgetThresholdAlert",
 *   "source": "InnovationSandbox-ndx",
 *   "account": "123456789012",
 *   "time": "2026-01-22T14:30:00Z",
 *   "region": "us-west-2",
 *   "resources": [],
 *   "detail": {
 *     "userEmail": "user@example.gov.uk",
 *     "uuid": "550e8400-e29b-41d4-a716-446655440000",
 *     "awsAccountId": "987654321098",
 *     "currentSpend": 75.50,
 *     "maxSpend": 100,
 *     "thresholdPercentage": 75
 *   }
 * }
 * ```
 */
export interface EventBridgeEvent<T = unknown> {
  /** EventBridge event version (always "0") */
  version: string
  /** Unique event ID (UUID format) */
  id: string
  /** Event type identifier (e.g., "LeaseApproved", "LeaseBudgetThresholdAlert") */
  "detail-type": string
  /** Event source identifier (e.g., "InnovationSandbox-ndx") */
  source: string
  /** AWS account ID where the event originated */
  account: string
  /** ISO 8601 timestamp of when the event was emitted */
  time: string
  /** AWS region where the event originated */
  region: string
  /** ARNs of resources involved (typically empty for ISB events) */
  resources: string[]
  /** Event-specific payload data */
  detail: T
}

/**
 * Notification event types from ISB.
 *
 * Events are categorized into three groups:
 *
 * ## Lease Lifecycle Events (User Notifications)
 * Trigger email notifications to users about their sandbox requests:
 * - `LeaseRequested` - User submitted a sandbox request
 * - `LeaseApproved` - Sandbox request was approved, account is ready
 * - `LeaseDenied` - Sandbox request was rejected
 * - `LeaseTerminated` - Sandbox was manually terminated
 * - `LeaseFrozen` - Sandbox was frozen (e.g., due to policy violation)
 *
 * ## Monitoring Events (User Notifications)
 * Alert users about budget/time thresholds and expirations:
 * - `LeaseBudgetThresholdAlert` - Spending has reached a threshold (e.g., 75%)
 * - `LeaseDurationThresholdAlert` - Time remaining has reached a threshold
 * - `LeaseFreezingThresholdAlert` - Sandbox will be frozen soon
 * - `LeaseBudgetExceeded` - Budget limit has been exceeded
 * - `LeaseExpired` - Sandbox has expired and been reclaimed
 *
 * ## Ops Events (AWS Chatbot Visibility)
 * Operational alerts routed to AWS Chatbot for Slack visibility:
 * - `AccountCleanupFailed` - Failed to clean up sandbox account resources
 * - `AccountQuarantined` - Account was quarantined for investigation
 * - `AccountDriftDetected` - Configuration drift detected in account
 * - `GroupCostReportGeneratedFailure` - Failed to generate cost report
 */
export type NotificationEventType =
  // Lease lifecycle events (user notifications)
  | "LeaseRequested"
  | "LeaseApproved"
  | "LeaseDenied"
  | "LeaseTerminated"
  | "LeaseFrozen"
  // Monitoring events (user notifications)
  | "LeaseBudgetThresholdAlert"
  | "LeaseDurationThresholdAlert"
  | "LeaseFreezingThresholdAlert"
  | "LeaseBudgetExceeded"
  | "LeaseExpired"
  // Billing events (user notifications)
  | "LeaseCostsGenerated"
  // Ops events (visible via AWS Chatbot)
  | "AccountCleanupFailed"
  | "AccountQuarantined"
  | "AccountDriftDetected"
  | "GroupCostReportGeneratedFailure"

/**
 * Allowed event sources for security validation
 * ISB uses "InnovationSandbox-ndx" as the source name
 * isb-costs is used by the costs team for billing events (LeaseCostsGenerated)
 */
export const ALLOWED_SOURCES = ["InnovationSandbox-ndx", "isb-costs"] as const
export type AllowedSource = (typeof ALLOWED_SOURCES)[number]

/**
 * Notification channels
 *
 * Note: Slack notifications removed in Story 6.3. Slack visibility is now
 * provided by AWS Chatbot via EventBridge → SNS (Story 6.1).
 */
export type NotificationChannel = "email"

/**
 * Result of processing a notification
 */
export interface NotificationResult {
  success: boolean
  channel: NotificationChannel
  eventId: string
  eventType: NotificationEventType
  error?: string
}

/**
 * Handler response structure
 */
export interface HandlerResponse {
  statusCode: number
  body: string
}
