/**
 * Type definitions for the NDX Notification System
 *
 * This module defines TypeScript interfaces for EventBridge events
 * from the Innovation Sandbox (ISB) system.
 */

/**
 * Base EventBridge event structure
 * All ISB events follow this pattern
 */
export interface EventBridgeEvent<T = unknown> {
  version: string
  id: string
  "detail-type": string
  source: string
  account: string
  time: string
  region: string
  resources: string[]
  detail: T
}

/**
 * Notification event types from ISB
 * These are the detail-types we subscribe to
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
  // Ops events (Slack alerts)
  | "AccountCleanupFailed"
  | "AccountQuarantined"
  | "AccountDriftDetected"

/**
 * Allowed event sources for security validation
 * ISB uses "InnovationSandbox-ndx" as the source name
 */
export const ALLOWED_SOURCES = ["InnovationSandbox-ndx"] as const
export type AllowedSource = (typeof ALLOWED_SOURCES)[number]

/**
 * Notification channels
 */
export type NotificationChannel = "email" | "slack"

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
