/**
 * DynamoDB Enrichment Module for Notification System
 *
 * This module queries ISB DynamoDB tables to enrich events with missing
 * personalisation fields required by email templates.
 *
 * Story: N5.6 - DynamoDB Enrichment for Missing Fields
 * ACs: 6.1-6.51
 *
 * Security Controls:
 * - AC-6.9: Read-only DynamoDB access (GetItem, Query only)
 * - AC-6.11: ConsistentRead: true for all queries
 * - AC-6.19: URL encode all untrusted fields
 * - AC-6.21: Log SECURITY alert for status conflicts
 * - AC-6.41: Never use enriched.status in email content
 *
 * @see docs/sprint-artifacts/tech-spec-epic-n5.md#Story-n5-6
 */

import { DynamoDBClient, GetItemCommand, ProvisionedThroughputExceededException } from "@aws-sdk/client-dynamodb"
import { createHash } from "crypto"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { fetchLeaseByKey, ISBLeaseRecord } from "./isb-client"
import { Logger } from "@aws-lambda-powertools/logger"
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics"
import { PermanentError, RetriableError } from "./errors"
import { hashForLog } from "./ownership"
import type { EnrichedData, TemplateConfig, EnrichmentQuery } from "./templates"
import type { ValidatedEvent } from "./validation"
import type { NotificationEventType } from "./types"

// =============================================================================
// Constants
// =============================================================================

/** AC-6.38: Enrichment timeout in milliseconds (2 seconds max) */
const ENRICHMENT_TIMEOUT_MS = 2000

/** AC-6.17, AC-6.29: Circuit breaker thresholds */
const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_COOLDOWN_MS = 60000

/** AC-6.40: Data staleness threshold in milliseconds (5 minutes) */
const DATA_STALENESS_THRESHOLD_MS = 5 * 60 * 1000

/** AC-6.13: Budget discrepancy threshold (10%) */
const BUDGET_DISCREPANCY_THRESHOLD = 0.1

/** N7-1 AC-9: Throttle retry configuration */
const THROTTLE_RETRY_DELAY_MS = 500
const THROTTLE_MAX_RETRIES = 1

// =============================================================================
// Logger and Metrics
// =============================================================================

const logger = new Logger({ serviceName: "ndx-notifications" })
const metrics = new Metrics({
  namespace: "ndx/notifications",
  serviceName: "ndx-notifications",
})

// =============================================================================
// Module-level DynamoDB Client (N7-1 AC-4: Connection Pooling)
// =============================================================================

/**
 * N7-1 AC-4: Module-level DynamoDB client singleton for connection pooling.
 * Reused across Lambda invocations for efficient connection management.
 * Created lazily on first use.
 */
let dynamoClientSingleton: DynamoDBClient | null = null

/**
 * Get or create the module-level DynamoDB client
 * N7-1 AC-4: Connection pooling via module-level singleton
 */
export function getDynamoDBClient(): DynamoDBClient {
  if (!dynamoClientSingleton) {
    dynamoClientSingleton = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-west-2",
    })
  }
  return dynamoClientSingleton
}

/**
 * Reset DynamoDB client singleton (for testing only)
 */
export function resetDynamoDBClient(): void {
  dynamoClientSingleton = null
}

// =============================================================================
// Types
// =============================================================================

/**
 * LeaseTable record structure (from ISB)
 * AC-6.45: Contract test verifies these fields
 */
export interface LeaseRecord {
  userEmail: string
  uuid: string
  status?: string
  templateName?: string
  accountId?: string
  expirationDate?: string
  maxSpend?: number
  totalCostAccrued?: number
  lastModified?: string
}

/**
 * SandboxAccountTable record structure (from ISB)
 * AC-6.46: Contract test verifies these fields
 */
export interface SandboxAccountRecord {
  accountId: string
  accountName?: string
  ownerEmail?: string
}

/**
 * LeaseTemplateTable record structure (from ISB)
 * AC-6.47: Contract test verifies these fields
 */
export interface LeaseTemplateRecord {
  templateName: string
  templateDescription?: string
  leaseDurationInHours?: number
}

/**
 * Event detail with lease information
 */
interface LeaseEventDetail {
  userEmail?: string
  leaseId?: {
    userEmail: string
    uuid: string
  }
  accountId?: string
  budgetLimit?: number
  thresholdPercent?: number
}

/**
 * Conflict information for ops ticket creation (AC-6.26)
 */
export interface ConflictInfo {
  eventType: NotificationEventType
  enrichedStatus: string
  detectedAt: string
  eventId: string
  requiresManualApproval: boolean
}

// =============================================================================
// Circuit Breaker (AC-6.17, AC-6.29)
// =============================================================================

/**
 * AC-6.17, AC-6.29: Circuit breaker for DynamoDB throttles
 * Skips enrichment after consecutive failures to prevent cascade
 */
export class CircuitBreaker {
  private failures = 0
  private openedAt: number | null = null

  constructor(
    private readonly threshold: number = CIRCUIT_BREAKER_THRESHOLD,
    private readonly cooldownMs: number = CIRCUIT_BREAKER_COOLDOWN_MS,
  ) {}

  /**
   * Record a successful operation - resets failure count
   */
  recordSuccess(): void {
    this.failures = 0
    this.openedAt = null
  }

  /**
   * Record a failure - may open circuit
   */
  recordFailure(): void {
    this.failures++
    if (this.failures >= this.threshold && !this.openedAt) {
      this.openedAt = Date.now()
      logger.warn("Circuit breaker opened due to consecutive failures", {
        failures: this.failures,
        threshold: this.threshold,
        cooldownMs: this.cooldownMs,
      })
      metrics.addMetric("CircuitBreakerOpened", MetricUnit.Count, 1)
    }
  }

  /**
   * Check if circuit is open (should skip enrichment)
   */
  isOpen(): boolean {
    if (!this.openedAt) {
      return false
    }

    // Check if cooldown has passed
    const elapsed = Date.now() - this.openedAt
    if (elapsed >= this.cooldownMs) {
      logger.info("Circuit breaker cooldown expired - closing circuit", {
        elapsedMs: elapsed,
      })
      this.reset()
      return false
    }

    return true
  }

  /**
   * Reset circuit breaker state
   */
  reset(): void {
    this.failures = 0
    this.openedAt = null
  }

  /**
   * Get current failure count (for testing)
   */
  getFailureCount(): number {
    return this.failures
  }
}

// AC-6.14: Module-level circuit breaker - cleared on cold start
let circuitBreaker = new CircuitBreaker()

/**
 * Reset circuit breaker on cold start (AC-6.14)
 */
export function resetCircuitBreaker(): void {
  circuitBreaker = new CircuitBreaker()
}

// =============================================================================
// DynamoDB Query Functions
// =============================================================================

// Story 5.1 AC-2.5: queryLeaseTable removed - lease data now fetched via ISB API
// See fetchLeaseRecord() which uses fetchLeaseByKey() from isb-client.ts

/**
 * AC-6.3: Query SandboxAccountTable for account name
 * Uses GetItem with ConsistentRead: true (AC-6.11)
 */
export async function queryAccountTable(
  dynamoClient: DynamoDBClient,
  accountId: string,
  eventId: string,
): Promise<SandboxAccountRecord | null> {
  const tableName = process.env.SANDBOX_ACCOUNT_TABLE_NAME
  if (!tableName) {
    logger.warn("SANDBOX_ACCOUNT_TABLE_NAME not configured", { eventId })
    return null
  }

  logger.debug("Querying SandboxAccountTable for enrichment", {
    eventId,
    accountId,
  })

  try {
    // AC-6.9: Read-only access (GetItem)
    // AC-6.11: ConsistentRead: true for correctness
    const command = new GetItemCommand({
      TableName: tableName,
      Key: {
        accountId: { S: accountId },
      },
      ConsistentRead: true,
    })

    const result = await dynamoClient.send(command)

    if (!result.Item) {
      logger.debug("No account record found", { eventId, accountId })
      return null
    }

    return unmarshall(result.Item) as SandboxAccountRecord
  } catch (error) {
    handleDynamoDBError(error, "SandboxAccountTable", eventId)
    return null
  }
}

/**
 * AC-6.4: Query LeaseTemplateTable for template name
 * Uses GetItem with ConsistentRead: true (AC-6.11)
 */
export async function queryLeaseTemplateTable(
  dynamoClient: DynamoDBClient,
  templateName: string,
  eventId: string,
): Promise<LeaseTemplateRecord | null> {
  const tableName = process.env.LEASE_TEMPLATE_TABLE_NAME
  if (!tableName) {
    logger.warn("LEASE_TEMPLATE_TABLE_NAME not configured", { eventId })
    return null
  }

  logger.debug("Querying LeaseTemplateTable for enrichment", {
    eventId,
    templateName,
  })

  try {
    // AC-6.9: Read-only access (GetItem)
    // AC-6.11: ConsistentRead: true for correctness
    const command = new GetItemCommand({
      TableName: tableName,
      Key: {
        templateName: { S: templateName },
      },
      ConsistentRead: true,
    })

    const result = await dynamoClient.send(command)

    if (!result.Item) {
      logger.debug("No template record found", { eventId, templateName })
      return null
    }

    return unmarshall(result.Item) as LeaseTemplateRecord
  } catch (error) {
    handleDynamoDBError(error, "LeaseTemplateTable", eventId)
    return null
  }
}

/**
 * Handle DynamoDB errors consistently
 * AC-6.16, AC-6.17: Classify errors for circuit breaker
 */
function handleDynamoDBError(error: unknown, tableName: string, eventId: string): never {
  if (error instanceof Error) {
    if (error.name === "ProvisionedThroughputExceededException") {
      circuitBreaker.recordFailure()
      metrics.addMetric("DynamoDBThrottle", MetricUnit.Count, 1)
      logger.warn("DynamoDB throttled", { eventId, tableName })
      throw new RetriableError(`DynamoDB throttled on ${tableName}`, { cause: error })
    }
    if (error.name === "ResourceNotFoundException") {
      logger.error("DynamoDB table not found", { eventId, tableName })
      throw new PermanentError(`${tableName} not found`)
    }
    logger.warn("DynamoDB error", { eventId, tableName, errorName: error.name })
  }
  throw new RetriableError(`DynamoDB error on ${tableName}`, {
    cause: error instanceof Error ? error : undefined,
  })
}

// =============================================================================
// N7-1: Schema Fingerprint for Drift Detection
// =============================================================================

/**
 * N7-1 AC-10: Generate schema fingerprint from lease record field names.
 * Used for detecting schema drift over time via CloudWatch log analysis.
 *
 * @param record - The lease record from DynamoDB
 * @returns A short SHA-256 hash of sorted field names
 */
export function generateSchemaFingerprint(record: Record<string, unknown>): string {
  const sortedKeys = Object.keys(record).sort()
  const keyList = sortedKeys.join(",")
  return createHash("sha256").update(keyList).digest("hex").substring(0, 16)
}

// =============================================================================
// N7-1: Enhanced Lease Record Fetching
// =============================================================================

/**
 * N7-1 AC-7, AC-8: Validate input types for lease key fields.
 * Returns null if validation fails (skips enrichment rather than failing).
 */
export function validateLeaseKeyInputs(
  userEmail: unknown,
  uuid: unknown,
  eventId: string,
): { userEmail: string; uuid: string } | null {
  // AC-7: Check for missing fields
  if (userEmail === undefined || userEmail === null) {
    logger.warn("Missing userEmail in event - skipping lease enrichment", { eventId })
    metrics.addMetric("EnrichmentInputMissing", MetricUnit.Count, 1)
    return null
  }

  if (uuid === undefined || uuid === null) {
    logger.warn("Missing uuid in event - skipping lease enrichment", { eventId })
    metrics.addMetric("EnrichmentInputMissing", MetricUnit.Count, 1)
    return null
  }

  // AC-8: Check for wrong types (must be strings)
  if (typeof userEmail !== "string") {
    logger.warn("Wrong type for userEmail (expected string) - skipping lease enrichment", {
      eventId,
      actualType: typeof userEmail,
    })
    metrics.addMetric("EnrichmentInputWrongType", MetricUnit.Count, 1)
    return null
  }

  if (typeof uuid !== "string") {
    logger.warn("Wrong type for uuid (expected string) - skipping lease enrichment", {
      eventId,
      actualType: typeof uuid,
    })
    metrics.addMetric("EnrichmentInputWrongType", MetricUnit.Count, 1)
    return null
  }

  // Additional validation: check for empty strings
  if (userEmail.trim() === "" || uuid.trim() === "") {
    logger.warn("Empty userEmail or uuid - skipping lease enrichment", { eventId })
    metrics.addMetric("EnrichmentInputEmpty", MetricUnit.Count, 1)
    return null
  }

  return { userEmail, uuid }
}

/**
 * N7-1 AC-9: Sleep utility for throttle retry backoff
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Story 5.1: Lease record fetching via ISB API
 *
 * Refactored to use ISB REST API instead of direct DynamoDB access.
 * Provides same interface for backward compatibility.
 *
 * - AC-1: Calls GET /leases/{id} on ISB API
 * - AC-2: Maps ISB API response to LeaseRecord interface
 * - AC-4, AC-5, AC-6: Graceful degradation on errors/timeout
 *
 * @param userEmail - User's email address
 * @param uuid - Lease UUID
 * @param eventId - Event ID for logging correlation
 * @returns LeaseRecord or null if not found/validation fails
 */
export async function fetchLeaseRecord(
  userEmail: unknown,
  uuid: unknown,
  eventId: string,
): Promise<LeaseRecord | null> {
  // AC-7, AC-8: Validate inputs (reusing existing validation)
  const validatedInputs = validateLeaseKeyInputs(userEmail, uuid, eventId)
  if (!validatedInputs) {
    return null
  }

  const { userEmail: validEmail, uuid: validUuid } = validatedInputs
  const startTime = Date.now()

  try {
    logger.debug("Fetching lease record via ISB API", {
      eventId,
      userEmailHash: hashForLog(validEmail),
      uuid: validUuid,
    })

    // Story 5.1 AC-1: Use ISB API instead of DynamoDB
    const isbRecord = await fetchLeaseByKey(validEmail, validUuid, eventId)

    const latencyMs = Date.now() - startTime
    metrics.addMetric("EnrichmentQueryLatencyMs", MetricUnit.Milliseconds, latencyMs)

    if (!isbRecord) {
      logger.debug("No lease record found via ISB API", {
        eventId,
        uuid: validUuid,
        latencyMs,
      })
      metrics.addMetric("LeaseNotFound", MetricUnit.Count, 1)
      return null
    }

    // Story 5.1 AC-2: Map ISB API response to LeaseRecord interface
    const leaseRecord = mapISBRecordToLeaseRecord(isbRecord)

    // Log schema fingerprint for monitoring (reusing existing pattern)
    const fingerprint = generateSchemaFingerprint(isbRecord as unknown as Record<string, unknown>)
    const fieldCount = Object.keys(isbRecord).length
    logger.info("Lease record schema fingerprint", {
      eventId,
      fingerprint,
      keyCount: fieldCount,
      source: "isb-api",
    })
    metrics.addMetric("EnrichmentSchemaFields", MetricUnit.Count, fieldCount)

    // Record success for circuit breaker
    circuitBreaker.recordSuccess()

    logger.debug("Lease record fetched successfully via ISB API", {
      eventId,
      latencyMs,
      hasStatus: !!leaseRecord.status,
      hasMaxSpend: leaseRecord.maxSpend !== undefined,
    })

    return leaseRecord
  } catch (error) {
    // Story 5.1 AC-5: Graceful degradation on errors
    const latencyMs = Date.now() - startTime
    logger.warn("ISB API lease fetch failed - proceeding without enrichment", {
      eventId,
      error: error instanceof Error ? error.message : String(error),
      latencyMs,
    })
    metrics.addMetric("EnrichmentQueryLatencyMs", MetricUnit.Milliseconds, latencyMs)
    metrics.addMetric("ISBAPIError", MetricUnit.Count, 1)
    circuitBreaker.recordFailure()
    return null
  }
}

/**
 * Story 5.1 AC-2: Map ISB API response to LeaseRecord interface
 *
 * Ensures field compatibility between ISB API response and existing LeaseRecord interface.
 *
 * @param isbRecord - Record from ISB API
 * @returns LeaseRecord compatible with existing enrichment logic
 */
function mapISBRecordToLeaseRecord(isbRecord: ISBLeaseRecord): LeaseRecord {
  return {
    userEmail: isbRecord.userEmail,
    uuid: isbRecord.uuid,
    status: isbRecord.status,
    templateName: isbRecord.templateName ?? isbRecord.originalLeaseTemplateName,
    // Map awsAccountId to accountId for compatibility
    accountId: isbRecord.accountId ?? isbRecord.awsAccountId,
    expirationDate: isbRecord.expirationDate,
    maxSpend: isbRecord.maxSpend,
    totalCostAccrued: isbRecord.totalCostAccrued,
    lastModified: isbRecord.lastModified,
  }
}

// =============================================================================
// Conflict Detection (AC-6.20, AC-6.21, AC-6.22, AC-6.26, AC-6.27)
// =============================================================================

/**
 * Event type to expected DB status mapping
 */
const EVENT_STATUS_MAP: Record<string, string[]> = {
  LeaseApproved: ["Approved", "Active"],
  LeaseDenied: ["Denied", "Rejected"],
  LeaseTerminated: ["Terminated", "Closed"],
  LeaseFrozen: ["Frozen", "Suspended"],
  LeaseBudgetExceeded: ["Frozen", "Suspended", "Terminated"],
  LeaseExpired: ["Expired", "Terminated"],
  LeaseRequested: ["Requested", "Pending"],
}

/**
 * AC-6.21: Detect status conflicts between event and enriched data
 * AC-6.26: Returns conflict info for ops ticket if needed
 */
export function detectStatusConflict(
  eventType: NotificationEventType,
  enrichedStatus: string | undefined,
  eventId: string,
  eventTimestamp?: string,
  lastModified?: string,
): ConflictInfo | null {
  if (!enrichedStatus) {
    return null
  }

  const expectedStatuses = EVENT_STATUS_MAP[eventType]
  if (!expectedStatuses) {
    return null // No conflict check for this event type
  }

  const isConflict = !expectedStatuses.includes(enrichedStatus)

  if (!isConflict) {
    return null
  }

  // AC-6.27: Automatic conflict resolution using timestamps
  if (eventTimestamp && lastModified) {
    const eventTime = new Date(eventTimestamp).getTime()
    const modifiedTime = new Date(lastModified).getTime()

    // If lease was modified after event, the event is stale - not a conflict
    if (modifiedTime > eventTime) {
      logger.info("Status difference resolved by timestamp comparison", {
        eventId,
        eventType,
        enrichedStatus,
        eventTime: eventTimestamp,
        lastModified,
        resolution: "Event is older than DB modification - using event data",
      })
      return null
    }
  }

  // AC-6.21: Log SECURITY alert for status mismatch
  logger.error("SECURITY ALERT: Status conflict detected", {
    eventId,
    eventType,
    enrichedStatus,
    expectedStatuses,
    securityWarning: "Enriched status contradicts event type",
    requiresManualReview: true,
  })

  // AC-6.22, AC-6.37: Emit conflict metric
  metrics.addMetric("EnrichmentConflict", MetricUnit.Count, 1)

  // AC-6.26: Return conflict info for ops ticket
  return {
    eventType,
    enrichedStatus,
    detectedAt: new Date().toISOString(),
    eventId,
    requiresManualApproval: true,
  }
}

/**
 * AC-6.13: Check if budget discrepancy exceeds threshold (10%)
 */
export function checkBudgetDiscrepancy(
  eventBudget: number | undefined,
  enrichedMaxSpend: number | undefined,
  eventId: string,
): boolean {
  if (eventBudget === undefined || enrichedMaxSpend === undefined) {
    return false
  }

  const diff = Math.abs(eventBudget - enrichedMaxSpend)
  const percentDiff = diff / eventBudget

  if (percentDiff > BUDGET_DISCREPANCY_THRESHOLD) {
    logger.warn("Budget discrepancy detected", {
      eventId,
      eventBudget,
      enrichedMaxSpend,
      percentDiff: (percentDiff * 100).toFixed(1) + "%",
      threshold: BUDGET_DISCREPANCY_THRESHOLD * 100 + "%",
    })
    return true
  }

  return false
}

/**
 * AC-6.40: Check if enrichment data is stale
 */
export function checkDataStaleness(lastModified: string | undefined, eventId: string): boolean {
  if (!lastModified) {
    return false
  }

  const modifiedTime = new Date(lastModified).getTime()
  const age = Date.now() - modifiedTime

  if (age > DATA_STALENESS_THRESHOLD_MS) {
    logger.warn("Enrichment data may be stale", {
      eventId,
      lastModified,
      ageMs: age,
      thresholdMs: DATA_STALENESS_THRESHOLD_MS,
    })
    return true
  }

  return false
}

// =============================================================================
// URL Construction (AC-6.10, AC-6.19)
// =============================================================================

/**
 * AC-6.10: Construct SSO URL from config
 * AC-6.19: URL-encode untrusted fields
 */
export function constructSsoUrl(accountId?: string): string | undefined {
  const ssoStartUrl = process.env.SSO_START_URL
  if (!ssoStartUrl) {
    return undefined
  }

  // AC-6.19: URL-encode any untrusted fields
  if (accountId) {
    const encodedAccountId = encodeURIComponent(accountId)
    return `${ssoStartUrl}?accountId=${encodedAccountId}`
  }

  return ssoStartUrl
}

// =============================================================================
// Core Enrichment Function (AC-6.1, AC-6.5, AC-6.38)
// =============================================================================

/**
 * AC-6.1: Identify missing required fields from template config
 */
export function getMissingFields(eventData: Record<string, unknown>, requiredFields: string[]): string[] {
  return requiredFields.filter((field) => {
    const value = eventData[field]
    return value === undefined || value === null || value === ""
  })
}

/**
 * Extract lease key from validated event
 */
function extractLeaseKey(event: ValidatedEvent): { userEmail: string; uuid: string } | null {
  const detail = event.detail as LeaseEventDetail

  if (detail.leaseId?.userEmail && detail.leaseId?.uuid) {
    return {
      userEmail: detail.leaseId.userEmail,
      uuid: detail.leaseId.uuid,
    }
  }

  return null
}

/**
 * AC-6.1: Main enrichment function
 * AC-6.5: Parallel query execution with Promise.all
 * AC-6.38: 2-second timeout
 * AC-6.39, AC-6.16, AC-6.7: Graceful degradation with partial data
 */
export async function enrichIfNeeded(
  event: ValidatedEvent,
  templateConfig: TemplateConfig,
  dynamoClient: DynamoDBClient,
): Promise<EnrichedData> {
  const eventId = event.eventId
  const startTime = Date.now()

  // AC-6.17, AC-6.29: Check circuit breaker first
  if (circuitBreaker.isOpen()) {
    logger.warn("Circuit breaker open - skipping enrichment", { eventId })
    metrics.addMetric("EnrichmentSkipped", MetricUnit.Count, 1)
    return { enrichedAt: new Date().toISOString() }
  }

  const detail = event.detail as LeaseEventDetail
  const leaseKey = extractLeaseKey(event)

  // Initialize enriched data with timestamp
  const enrichedData: EnrichedData = {
    enrichedAt: new Date().toISOString(),
  }

  // AC-6.1: Determine which queries are needed
  const queries: EnrichmentQuery[] = templateConfig.enrichmentQueries || []

  // AC-6.38: Wrap in timeout
  const timeoutPromise = new Promise<"timeout">((resolve) => {
    setTimeout(() => resolve("timeout"), ENRICHMENT_TIMEOUT_MS)
  })

  try {
    // AC-6.5: Build parallel query promises
    const queryPromises: Promise<void>[] = []

    // Query LeaseTable if needed (AC-6.2) - Story 5.1: Use ISB API instead of DynamoDB
    if (queries.includes("lease") && leaseKey) {
      queryPromises.push(
        fetchLeaseByKey(leaseKey.userEmail, leaseKey.uuid, eventId)
          .then((isbRecord) => {
            if (isbRecord) {
              // Map ISB record to lease record format
              const lease = mapISBRecordToLeaseRecord(isbRecord)
              // AC-6.12: Include lastModified for debugging
              enrichedData._internalStatus = lease.status
              enrichedData.maxSpend = lease.maxSpend
              enrichedData.templateName = lease.templateName

              // Check staleness (AC-6.40)
              checkDataStaleness(lease.lastModified, eventId)

              // Check budget discrepancy (AC-6.13)
              checkBudgetDiscrepancy(detail.budgetLimit, lease.maxSpend, eventId)
            }
          })
          .catch((error) => {
            // AC-6.7, AC-6.16: Log warning and continue
            logger.warn("ISB API lease query failed - continuing with partial data", {
              eventId,
              error: error instanceof Error ? error.message : String(error),
            })
          }),
      )
    }

    // Query SandboxAccountTable if needed (AC-6.3)
    if (queries.includes("account") && detail.accountId) {
      queryPromises.push(
        queryAccountTable(dynamoClient, detail.accountId, eventId)
          .then((account) => {
            if (account) {
              enrichedData.accountName = account.accountName
            }
          })
          .catch((error) => {
            logger.warn("SandboxAccountTable query failed - continuing with partial data", {
              eventId,
              error: error instanceof Error ? error.message : String(error),
            })
          }),
      )
    }

    // Query LeaseTemplateTable if needed (AC-6.4)
    if (queries.includes("leaseTemplate") && enrichedData.templateName) {
      queryPromises.push(
        queryLeaseTemplateTable(dynamoClient, enrichedData.templateName, eventId)
          .then((template) => {
            if (template) {
              // Template name already set from lease, but we could add description
            }
          })
          .catch((error) => {
            logger.warn("LeaseTemplateTable query failed - continuing with partial data", {
              eventId,
              error: error instanceof Error ? error.message : String(error),
            })
          }),
      )
    }

    // AC-6.5, AC-6.38: Execute queries in parallel with timeout
    const result = await Promise.race([Promise.all(queryPromises).then(() => "success" as const), timeoutPromise])

    if (result === "timeout") {
      // AC-6.38, AC-6.39: Timeout - continue with partial data
      logger.warn("Enrichment timeout - continuing with partial data", {
        eventId,
        timeoutMs: ENRICHMENT_TIMEOUT_MS,
      })
      metrics.addMetric("EnrichmentTimeout", MetricUnit.Count, 1)
    } else {
      // Record success for circuit breaker
      circuitBreaker.recordSuccess()
    }

    // AC-6.10: Construct SSO URL
    enrichedData.ssoUrl = constructSsoUrl(detail.accountId)

    // AC-6.20, AC-6.21: Check for status conflicts
    const conflict = detectStatusConflict(
      event.eventType,
      enrichedData._internalStatus,
      eventId,
      event.timestamp,
      undefined, // lastModified would come from lease record
    )

    if (conflict) {
      // AC-6.26: Conflict detected - this would normally create ops ticket
      // For now, log and continue (actual ticket creation is infrastructure concern)
      logger.warn("Enrichment conflict requires manual review", {
        eventId,
        conflict,
      })
    }

    // AC-6.6, AC-6.33: Record latency metric
    const latencyMs = Date.now() - startTime
    metrics.addMetric("EnrichmentLatency", MetricUnit.Milliseconds, latencyMs)

    logger.debug("Enrichment complete", {
      eventId,
      latencyMs,
      fieldsEnriched: Object.keys(enrichedData).filter(
        (k) => !k.startsWith("_") && enrichedData[k as keyof EnrichedData] !== undefined,
      ),
    })

    return enrichedData
  } catch (error) {
    // AC-6.16, AC-6.39: Graceful degradation - return partial data
    logger.warn("Enrichment failed - continuing with partial data", {
      eventId,
      error: error instanceof Error ? error.message : String(error),
    })
    metrics.addMetric("EnrichmentFailed", MetricUnit.Count, 1)

    return enrichedData
  }
}

/**
 * AC-6.8: Validate required fields are present after enrichment
 * Throws PermanentError if required fields are still missing
 */
export function validateEnrichedData(
  eventData: Record<string, unknown>,
  enrichedData: EnrichedData,
  requiredFields: string[],
  eventId: string,
): void {
  // Merge event data with enriched data
  const combined: Record<string, unknown> = { ...eventData }

  // Map enriched fields to personalisation field names
  if (enrichedData.maxSpend !== undefined) combined.budgetLimit = enrichedData.maxSpend
  if (enrichedData.accountName) combined.accountName = enrichedData.accountName
  if (enrichedData.templateName) combined.templateName = enrichedData.templateName
  if (enrichedData.ssoUrl) combined.ssoUrl = enrichedData.ssoUrl

  // AC-6.1: Find still-missing fields
  const stillMissing = getMissingFields(combined, requiredFields)

  if (stillMissing.length > 0) {
    // AC-6.8: Throw PermanentError for missing required fields
    logger.error("Required fields still missing after enrichment", {
      eventId,
      missingFields: stillMissing,
      requiredFields,
    })

    throw new PermanentError(`Missing required fields after enrichment: ${stillMissing.join(", ")}`, {
      missingFields: stillMissing,
      requiredFields,
    })
  }
}
