/**
 * Lease Status Handling for Notification System
 *
 * Validates lease statuses from DynamoDB and logs warnings for unknown statuses.
 * The system is forward-compatible: unknown statuses are processed with available
 * fields rather than failing.
 *
 * Story: N7-6 - Lease Status Handling
 *
 * @see docs/epics-notifications.md#Story-7.6
 */

import { Logger } from "@aws-lambda-powertools/logger"
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics"

// =============================================================================
// Constants
// =============================================================================

/**
 * Known lease statuses from ISB schema.
 * Statuses: PendingApproval, ApprovalDenied, Active, Frozen, Expired,
 *           BudgetExceeded, ManuallyTerminated, AccountQuarantined, Ejected
 */
export const KNOWN_LEASE_STATUSES = [
  "PendingApproval",
  "ApprovalDenied",
  "Active",
  "Frozen",
  "Expired",
  "BudgetExceeded",
  "ManuallyTerminated",
  "AccountQuarantined",
  "Ejected",
] as const

export type KnownLeaseStatus = (typeof KNOWN_LEASE_STATUSES)[number]

/**
 * Status categories for field set determination
 */
export const STATUS_CATEGORIES = {
  /** Statuses that only have base fields */
  pending: ["PendingApproval"] as const,

  /** Statuses that only have base fields + ttl */
  denied: ["ApprovalDenied"] as const,

  /** Statuses that have base + monitored fields */
  monitored: ["Active", "Frozen"] as const,

  /** Statuses that have base + monitored + expired fields */
  terminal: ["Expired", "BudgetExceeded", "ManuallyTerminated", "AccountQuarantined", "Ejected"] as const,
} as const

/**
 * Expected field sets by status category
 */
export const EXPECTED_FIELDS = {
  /** Base fields present in all lease records */
  base: ["userEmail", "uuid", "status", "leaseDurationInHours", "maxSpend"] as const,

  /** Nested base fields (will be flattened with prefix) */
  baseNested: [
    "meta", // -> meta_createdAt, meta_requestedBy, etc.
    "budgetThresholds", // -> budgetThresholds_*
    "durationThresholds", // -> durationThresholds_*
  ] as const,

  /** Monitored fields added when lease is active/frozen */
  monitored: [
    "awsAccountId",
    "approvedBy",
    "startDate",
    "expirationDate",
    "lastCheckedDate",
    "totalCostAccrued",
  ] as const,

  /** Terminal fields added when lease is expired/terminated */
  terminal: ["endDate", "ttl"] as const,

  /** TTL field for denied leases */
  denied: ["ttl"] as const,
} as const

// =============================================================================
// Logger and Metrics
// =============================================================================

const logger = new Logger({ serviceName: "ndx-notifications" })
const metrics = new Metrics({
  namespace: "ndx/notifications",
  serviceName: "ndx-notifications",
})

// =============================================================================
// Status Validation Functions
// =============================================================================

/**
 * Check if a status is a known lease status.
 *
 * @param status - The status string to check
 * @returns True if the status is a known lease status
 */
export function isKnownLeaseStatus(status: string | undefined): status is KnownLeaseStatus {
  if (!status) {
    return false
  }
  return (KNOWN_LEASE_STATUSES as readonly string[]).includes(status)
}

/**
 * Validate a lease status and log warning if unknown.
 * Emits `UnexpectedLeaseStatus` metric for unknown statuses.
 *
 * N7-6 AC: Unknown lease statuses are logged as warning but processed with available fields
 *
 * @param status - The lease status to validate
 * @param eventId - Event ID for logging correlation
 * @returns The status (unchanged) for chaining
 */
export function validateLeaseStatus(status: string | undefined, eventId: string): string | undefined {
  if (!status) {
    logger.debug("No lease status in record", { eventId })
    return status
  }

  if (!isKnownLeaseStatus(status)) {
    // N7-6: Log warning for unknown status (forward-compatible)
    logger.warn("Unknown lease status encountered - processing with available fields", {
      eventId,
      status,
      knownStatuses: KNOWN_LEASE_STATUSES,
      note: "Forward-compatible: flattening all available fields regardless of status",
    })

    // N7-6: Emit UnexpectedLeaseStatus metric
    metrics.addMetric("UnexpectedLeaseStatus", MetricUnit.Count, 1)
    metrics.addDimension("LeaseStatus", status.substring(0, 50)) // Truncate for safety
  } else {
    logger.debug("Valid lease status", { eventId, status })
  }

  return status
}

/**
 * Get the status category for a lease status.
 *
 * @param status - The lease status
 * @returns The category name or 'unknown'
 */
export function getStatusCategory(
  status: string | undefined,
): "pending" | "denied" | "monitored" | "terminal" | "unknown" {
  if (!status) {
    return "unknown"
  }

  if ((STATUS_CATEGORIES.pending as readonly string[]).includes(status)) {
    return "pending"
  }
  if ((STATUS_CATEGORIES.denied as readonly string[]).includes(status)) {
    return "denied"
  }
  if ((STATUS_CATEGORIES.monitored as readonly string[]).includes(status)) {
    return "monitored"
  }
  if ((STATUS_CATEGORIES.terminal as readonly string[]).includes(status)) {
    return "terminal"
  }

  return "unknown"
}

/**
 * Get the expected fields for a lease status.
 *
 * N7-6 AC: Different statuses have different expected field sets
 *
 * @param status - The lease status
 * @returns Array of expected field names (not including nested prefixes)
 */
export function getExpectedFieldsForStatus(status: string | undefined): readonly string[] {
  const category = getStatusCategory(status)

  switch (category) {
    case "pending":
      // PendingApproval: base fields only
      return [...EXPECTED_FIELDS.base, ...EXPECTED_FIELDS.baseNested]

    case "denied":
      // ApprovalDenied: base fields + ttl
      return [...EXPECTED_FIELDS.base, ...EXPECTED_FIELDS.baseNested, ...EXPECTED_FIELDS.denied]

    case "monitored":
      // Active/Frozen: base fields + monitored fields
      return [...EXPECTED_FIELDS.base, ...EXPECTED_FIELDS.baseNested, ...EXPECTED_FIELDS.monitored]

    case "terminal":
      // Expired/BudgetExceeded/ManuallyTerminated/AccountQuarantined/Ejected:
      // base + monitored + terminal fields
      return [
        ...EXPECTED_FIELDS.base,
        ...EXPECTED_FIELDS.baseNested,
        ...EXPECTED_FIELDS.monitored,
        ...EXPECTED_FIELDS.terminal,
      ]

    case "unknown":
    default:
      // Unknown: return all possible fields (forward-compatible)
      return [
        ...EXPECTED_FIELDS.base,
        ...EXPECTED_FIELDS.baseNested,
        ...EXPECTED_FIELDS.monitored,
        ...EXPECTED_FIELDS.terminal,
      ]
  }
}

/**
 * Log which fields are present vs expected for a lease record.
 * Useful for debugging and monitoring schema evolution.
 *
 * @param leaseRecord - The flattened lease record
 * @param status - The lease status
 * @param eventId - Event ID for logging correlation
 */
export function logFieldPresence(
  leaseRecord: Record<string, unknown>,
  status: string | undefined,
  eventId: string,
): void {
  const expectedFields = getExpectedFieldsForStatus(status)
  const actualFields = Object.keys(leaseRecord)

  // Find which expected fields are present (checking for prefix matches for nested fields)
  const presentExpected = expectedFields.filter((field) => {
    // Direct match
    if (leaseRecord[field] !== undefined) {
      return true
    }
    // Prefix match (e.g., 'meta' -> 'meta_createdAt')
    return actualFields.some((actual) => actual.startsWith(`${field}_`))
  })

  // Find unexpected fields (not in expected list or their prefixes)
  const unexpectedFields = actualFields.filter((actual) => {
    // Direct match in expected
    if (expectedFields.includes(actual)) {
      return false
    }
    // Prefix match (e.g., 'meta_createdAt' matches 'meta')
    return !expectedFields.some((expected) => actual.startsWith(`${expected}_`))
  })

  logger.debug("Lease record field analysis", {
    eventId,
    status,
    category: getStatusCategory(status),
    presentExpectedCount: presentExpected.length,
    totalExpectedCount: expectedFields.length,
    unexpectedFieldCount: unexpectedFields.length,
    // Only log unexpected fields if there are any (schema evolution detection)
    ...(unexpectedFields.length > 0 && {
      unexpectedFields: unexpectedFields.slice(0, 10), // Limit for log size
    }),
  })

  // If there are unexpected fields, this indicates schema evolution
  if (unexpectedFields.length > 0) {
    logger.info("Schema evolution detected - new fields in lease record", {
      eventId,
      newFieldCount: unexpectedFields.length,
      note: "New fields are included via flattening (forward-compatible)",
    })
  }
}
