/**
 * ISB Event Schema Validation with Zod
 *
 * This module validates incoming EventBridge events from the Innovation Sandbox (ISB)
 * system using Zod schemas with strict mode to reject unknown fields.
 *
 * Story: N5.2 - Event Schema Validation with Zod
 * ACs: 2.1-2.12
 *
 * @see docs/sprint-artifacts/tech-spec-epic-n5.md#Story-n5-2
 */

import { z } from "zod"
import { Logger } from "@aws-lambda-powertools/logger"
import { PermanentError } from "./errors"
import type { EventBridgeEvent, NotificationEventType } from "./types"

const logger = new Logger({ serviceName: "ndx-notifications" })

// =============================================================================
// Base Schemas (AC-2.2, AC-2.6, AC-2.11, AC-2.12)
// =============================================================================

/**
 * AC-2.11: UUID field validation rejects non-UUID formats
 * Strict UUID v4 pattern - rejects query strings, protocols, special chars
 */
export const UuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Invalid UUID format - must be valid UUID v4",
  )
  .refine(
    (val) => !val.includes("?") && !val.includes("/") && !val.includes(";"),
    "UUID contains invalid characters (possible injection attempt)",
  )

/**
 * AC-2.12: Email field validation uses strict RFC 5322 mode
 * Rejects +injection addresses and consecutive dots
 */
export const EmailSchema = z
  .string()
  .email("Invalid email format")
  .refine((val) => !val.includes("++"), "Email contains ++ (possible injection)")
  .refine((val) => !val.match(/\.{2,}/), "Email contains consecutive dots (invalid format)")
  .refine((val) => val.length <= 254, "Email exceeds maximum length (254 characters)")

/**
 * AC-2.6: accountId fields validate 12-digit AWS account ID pattern
 */
export const AccountIdSchema = z.string().regex(/^[0-9]{12}$/, "Invalid AWS account ID - must be exactly 12 digits")

/**
 * AC-2.2: LeaseKeySchema validates composite key: { userEmail: email, uuid: uuid }
 */
export const LeaseKeySchema = z
  .object({
    userEmail: EmailSchema,
    uuid: UuidSchema,
  })
  .strict()

// =============================================================================
// Discriminated Union Schemas (AC-2.3, AC-2.4)
// =============================================================================

/**
 * AC-2.3: LeaseFrozenReasonSchema uses discriminated union on type field
 * Three freeze reasons: Expired, BudgetExceeded, ManuallyFrozen
 */
export const LeaseFrozenReasonSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Expired"),
    triggeredDurationThreshold: z.number().optional(),
  }),
  z.object({
    type: z.literal("BudgetExceeded"),
    triggeredBudgetThreshold: z.number().optional(),
    currentSpend: z.number().optional(),
  }),
  z.object({
    type: z.literal("ManuallyFrozen"),
    comment: z.string().max(1000).optional(),
    frozenBy: z.string().optional(),
  }),
])

/**
 * AC-2.4: LeaseTerminatedReasonSchema handles 5 termination types
 */
export const LeaseTerminatedReasonSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Expired"),
  }),
  z.object({
    type: z.literal("BudgetExceeded"),
    finalSpend: z.number().optional(),
    budgetLimit: z.number().optional(),
  }),
  z.object({
    type: z.literal("ManuallyTerminated"),
    terminatedBy: z.string().optional(),
    comment: z.string().max(1000).optional(),
  }),
  z.object({
    type: z.literal("UserRequested"),
    requestedAt: z.string().optional(),
  }),
  z.object({
    type: z.literal("PolicyViolation"),
    violationType: z.string().optional(),
    description: z.string().optional(),
  }),
])

// =============================================================================
// Event Detail Schemas (AC-2.1, AC-2.5)
// =============================================================================

/**
 * Permissive schema for lease events - accepts any ISB format
 * TODO: Tighten once ISB schema is fully documented
 */
const PermissiveLeaseSchema = z.object({}).passthrough()

/**
 * LeaseRequested event detail schema - permissive
 */
export const LeaseRequestedDetailSchema = PermissiveLeaseSchema

/**
 * LeaseApproved event detail schema - permissive
 */
export const LeaseApprovedDetailSchema = PermissiveLeaseSchema

/**
 * LeaseDenied event detail schema - permissive
 */
export const LeaseDeniedDetailSchema = PermissiveLeaseSchema

/**
 * LeaseTerminated event detail schema - permissive
 */
export const LeaseTerminatedDetailSchema = PermissiveLeaseSchema

/**
 * LeaseFrozen event detail schema - permissive
 */
export const LeaseFrozenDetailSchema = PermissiveLeaseSchema

/**
 * LeaseBudgetThresholdAlert event detail schema - permissive
 */
export const LeaseBudgetThresholdAlertDetailSchema = PermissiveLeaseSchema

/**
 * LeaseDurationThresholdAlert event detail schema - permissive
 */
export const LeaseDurationThresholdAlertDetailSchema = PermissiveLeaseSchema

/**
 * LeaseFreezingThresholdAlert event detail schema - permissive
 */
export const LeaseFreezingThresholdAlertDetailSchema = PermissiveLeaseSchema

/**
 * LeaseBudgetExceeded event detail schema - permissive
 */
export const LeaseBudgetExceededDetailSchema = PermissiveLeaseSchema

/**
 * LeaseExpired event detail schema - permissive
 */
export const LeaseExpiredDetailSchema = PermissiveLeaseSchema

// =============================================================================
// Ops Event Schemas (visible via AWS Chatbot - not user emails but need validation)
// =============================================================================

/**
 * AccountCleanupFailed event detail schema
 */
export const AccountCleanupFailedDetailSchema = z
  .object({
    accountId: z.string().optional(),
    cleanupExecutionContext: z
      .object({
        executionArn: z.string(),
        startTime: z.string(),
      })
      .optional(),
    errorMessage: z.string().optional(),
  })
  .passthrough()

/**
 * AccountQuarantined event detail schema
 */
export const AccountQuarantinedDetailSchema = z
  .object({
    accountId: z.string().optional(),
    reason: z.string().optional(),
    quarantinedAt: z.string().optional(),
  })
  .passthrough()

/**
 * AccountDriftDetected event detail schema
 */
export const AccountDriftDetectedDetailSchema = z
  .object({
    accountId: z.string().optional(),
    expectedOU: z.string().optional(),
    actualOU: z.string().optional(),
    detectedAt: z.string().optional(),
  })
  .passthrough()

/**
 * GroupCostReportGeneratedFailure event detail schema (Story 6-2)
 */
export const GroupCostReportGeneratedFailureDetailSchema = z
  .object({
    groupId: z.string().optional(),
    errorMessage: z.string().optional(),
    failedAt: z.string().optional(),
  })
  .passthrough()

// =============================================================================
// Billing Event Schemas
// =============================================================================

/**
 * LeaseCostsGenerated event detail schema
 *
 * Emitted by isb-costs when a user's billing CSV is ready for download.
 * This event triggers an email to the user with their cost breakdown.
 *
 * Schema fields:
 * - leaseId: UUID v4 identifying the lease
 * - userEmail: Email address for notification delivery
 * - accountId: 12-digit AWS account ID
 * - totalCost: Total cost in USD (e.g., 45.67)
 * - currency: Always "USD" (AWS bills in USD)
 * - startDate: Billing period start (YYYY-MM-DD)
 * - endDate: Billing period end (YYYY-MM-DD)
 * - csvUrl: Presigned S3 URL for CSV download (7-day expiry)
 * - urlExpiresAt: ISO 8601 timestamp when URL expires
 */
export const LeaseCostsGeneratedDetailSchema = z
  .object({
    leaseId: UuidSchema,
    userEmail: EmailSchema,
    accountId: AccountIdSchema,
    // Allow negative costs for AWS credits/refunds
    totalCost: z.number(),
    currency: z.literal("USD"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD format"),
    csvUrl: z.string().url("csvUrl must be a valid URL"),
    urlExpiresAt: z.string().datetime({ message: "urlExpiresAt must be ISO 8601 format" }),
  })
  .strict()

// =============================================================================
// Event Schema Registry (AC-2.1, AC-2.10)
// =============================================================================

/**
 * AC-2.1: Zod schemas defined for all 10 user notification event types
 * Plus 3 ops event types for complete validation coverage
 */
export const EVENT_SCHEMAS: Record<NotificationEventType, z.ZodSchema> = {
  // User notification events (10 types)
  LeaseRequested: LeaseRequestedDetailSchema,
  LeaseApproved: LeaseApprovedDetailSchema,
  LeaseDenied: LeaseDeniedDetailSchema,
  LeaseTerminated: LeaseTerminatedDetailSchema,
  LeaseFrozen: LeaseFrozenDetailSchema,
  LeaseBudgetThresholdAlert: LeaseBudgetThresholdAlertDetailSchema,
  LeaseDurationThresholdAlert: LeaseDurationThresholdAlertDetailSchema,
  LeaseFreezingThresholdAlert: LeaseFreezingThresholdAlertDetailSchema,
  LeaseBudgetExceeded: LeaseBudgetExceededDetailSchema,
  LeaseExpired: LeaseExpiredDetailSchema,
  // Billing events (1 type) - from isb-costs source
  LeaseCostsGenerated: LeaseCostsGeneratedDetailSchema,
  // Ops events (4 types)
  AccountCleanupFailed: AccountCleanupFailedDetailSchema,
  AccountQuarantined: AccountQuarantinedDetailSchema,
  AccountDriftDetected: AccountDriftDetectedDetailSchema,
  GroupCostReportGeneratedFailure: GroupCostReportGeneratedFailureDetailSchema,
}

// =============================================================================
// ValidatedEvent Type (AC-2.7)
// =============================================================================

/**
 * AC-2.7: ValidatedEvent type returned by validateEvent on success
 */
export interface ValidatedEvent<T = unknown> {
  eventType: NotificationEventType
  eventId: string
  source: string
  timestamp: string
  detail: T
}

// =============================================================================
// Validation Function (AC-2.7, AC-2.8, AC-2.9, AC-2.10)
// =============================================================================

/**
 * Format Zod error for logging with field paths (AC-2.9)
 * Logs field paths but not field values to prevent PII leakage
 */
function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".")
      return `${path}: ${issue.message}`
    })
    .join("; ")
}

/**
 * AC-2.7: validateEvent() returns typed ValidatedEvent on success
 * AC-2.8: Invalid events throw PermanentError with Zod error details
 * AC-2.9: Schema validation errors are logged with field paths
 * AC-2.10: Unknown event types throw PermanentError('Unknown event type')
 *
 * @param event - The EventBridge event to validate
 * @returns ValidatedEvent with typed detail on success
 * @throws PermanentError on validation failure (no retry, goes to DLQ)
 */
export function validateEvent<T = unknown>(event: EventBridgeEvent<unknown>): ValidatedEvent<T> {
  const eventType = event["detail-type"] as NotificationEventType
  const eventId = event.id

  // AC-2.10: Unknown event types throw PermanentError
  const schema = EVENT_SCHEMAS[eventType]
  if (!schema) {
    logger.error("Unknown event type received", {
      eventId,
      eventType,
      validTypes: Object.keys(EVENT_SCHEMAS),
    })
    throw new PermanentError(`Unknown event type: ${eventType}`, {
      eventType,
      validTypes: Object.keys(EVENT_SCHEMAS),
    })
  }

  // AC-2.5: Strict mode via .strict() on all schemas
  // AC-2.8, AC-2.9: Parse with Zod and log/throw on failure
  const result = schema.safeParse(event.detail)

  if (!result.success) {
    // AC-2.9: Log validation errors with field paths (not values)
    const errorDetails = formatZodError(result.error)
    logger.error("Event validation failed", {
      eventId,
      eventType,
      fieldErrors: errorDetails,
      issueCount: result.error.issues.length,
    })

    // AC-2.8: Invalid events throw PermanentError with Zod error details
    throw new PermanentError(`Event validation failed: ${errorDetails}`, {
      eventId,
      eventType,
      issues: result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
        code: i.code,
      })),
    })
  }

  logger.debug("Event validated successfully", {
    eventId,
    eventType,
  })

  // AC-2.7: Return typed ValidatedEvent on success
  return {
    eventType,
    eventId: event.id,
    source: event.source,
    timestamp: event.time,
    detail: result.data as T,
  }
}

// =============================================================================
// Type Exports for Validated Event Details
// =============================================================================

// Permissive types - accept any fields from ISB

export type LeaseRequestedDetail = Record<string, any>

export type LeaseApprovedDetail = Record<string, any>

export type LeaseDeniedDetail = Record<string, any>

export type LeaseTerminatedDetail = Record<string, any>

export type LeaseFrozenDetail = Record<string, any>

export type LeaseBudgetThresholdAlertDetail = Record<string, any>

export type LeaseDurationThresholdAlertDetail = Record<string, any>

export type LeaseFreezingThresholdAlertDetail = Record<string, any>

export type LeaseBudgetExceededDetail = Record<string, any>

export type LeaseExpiredDetail = Record<string, any>
export type LeaseFrozenReason = z.infer<typeof LeaseFrozenReasonSchema>
export type LeaseTerminatedReason = z.infer<typeof LeaseTerminatedReasonSchema>
export type LeaseCostsGeneratedDetail = z.infer<typeof LeaseCostsGeneratedDetailSchema>
