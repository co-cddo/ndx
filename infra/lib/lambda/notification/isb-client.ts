/**
 * ISB API Client Module for Notification System
 *
 * This module provides HTTP client functionality for fetching lease data
 * from the ISB REST API, replacing direct DynamoDB access.
 *
 * Story: 5.1 - Replace DynamoDB Reads with ISB API
 * ACs: 1, 4, 5, 6
 *
 * Security Controls:
 * - AC-5, AC-6: Graceful degradation on API failures
 * - NFR4: 5-second timeout for API calls
 * - Structured JSON logging with correlation ID
 * - No PII in error logs
 *
 * @see _bmad-output/implementation-artifacts/5-1-replace-dynamodb-reads-with-isb-api.md
 */

import { Logger } from "@aws-lambda-powertools/logger"
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics"

// =============================================================================
// Constants
// =============================================================================

/** NFR4: ISB API timeout in milliseconds (5 seconds) */
const ISB_API_TIMEOUT_MS = 5000

// =============================================================================
// Logger and Metrics
// =============================================================================

const logger = new Logger({ serviceName: "ndx-notifications" })
const metrics = new Metrics({
  namespace: "ndx/notifications",
  serviceName: "ndx-notifications",
})

// =============================================================================
// Types
// =============================================================================

/**
 * LeaseRecord structure from ISB API
 * Matches the existing interface for compatibility
 */
export interface ISBLeaseRecord {
  userEmail: string
  uuid: string
  status?: string
  templateName?: string
  accountId?: string
  awsAccountId?: string
  expirationDate?: string
  maxSpend?: number
  totalCostAccrued?: number
  lastModified?: string
  originalLeaseTemplateName?: string
  startDate?: string
  endDate?: string
  leaseDurationInHours?: number
}

/**
 * JSend response format from ISB API
 * @see https://github.com/omniti-labs/jsend
 */
export interface JSendResponse<T> {
  status: "success" | "fail" | "error"
  data?: T
  message?: string
}

/**
 * Configuration for ISB API client
 */
export interface ISBClientConfig {
  baseUrl: string
  timeoutMs?: number
}

// =============================================================================
// ISB API Client
// =============================================================================

/**
 * Construct a lease ID for ISB API from userEmail and uuid
 * Format: base64 encoded "{userEmail}|{uuid}"
 *
 * AC-3.1: Support ISB API format (base64 encoded composite key)
 *
 * @param userEmail - User's email address
 * @param uuid - Lease UUID
 * @returns Base64 encoded lease ID for ISB API
 * @throws Error if userEmail contains pipe character (delimiter injection)
 */
export function constructLeaseId(userEmail: string, uuid: string): string {
  if (userEmail.includes("|")) {
    throw new Error("Invalid userEmail: contains pipe character delimiter")
  }
  const compositeKey = `${userEmail}|${uuid}`
  return Buffer.from(compositeKey).toString("base64")
}

/**
 * Parse a lease ID from ISB API format back to userEmail and uuid
 *
 * @param leaseId - Base64 encoded lease ID
 * @returns Object with userEmail and uuid, or null if invalid
 */
export function parseLeaseId(leaseId: string): { userEmail: string; uuid: string } | null {
  try {
    const decoded = Buffer.from(leaseId, "base64").toString("utf-8")
    const [userEmail, uuid] = decoded.split("|")
    if (!userEmail || !uuid) {
      return null
    }
    return { userEmail, uuid }
  } catch {
    return null
  }
}

/**
 * Fetch lease record from ISB API
 *
 * AC-1: Call GET /leases/{id} on ISB API
 * AC-4: Return null for 404 responses (graceful degradation)
 * AC-5: Return null for 500/network errors (graceful degradation)
 * AC-6/NFR4: 5-second timeout with AbortController
 *
 * @param leaseId - Base64 encoded lease ID (from constructLeaseId)
 * @param correlationId - Event ID for log correlation
 * @param config - Optional client configuration
 * @returns LeaseRecord or null if not found/error
 */
export async function fetchLeaseFromISB(
  leaseId: string,
  correlationId: string,
  config?: ISBClientConfig,
): Promise<ISBLeaseRecord | null> {
  const baseUrl = config?.baseUrl || process.env.ISB_API_BASE_URL
  const timeoutMs = config?.timeoutMs || ISB_API_TIMEOUT_MS

  if (!baseUrl) {
    logger.warn("ISB_API_BASE_URL not configured - skipping ISB API enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientConfigMissing", MetricUnit.Count, 1)
    return null
  }

  const url = `${baseUrl}/leases/${encodeURIComponent(leaseId)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const startTime = Date.now()

  try {
    logger.debug("Fetching lease from ISB API", {
      correlationId,
      leaseIdPrefix: leaseId.substring(0, 8) + "...", // Don't log full ID (may contain PII)
    })

    // Note: ISB API is internal to NDX infrastructure and does not require
    // explicit Authorization headers. Authentication is handled at the
    // infrastructure level (VPC/security group). If JWT auth is added later,
    // update this to include: 'Authorization': `Bearer ${token}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Correlation-Id": correlationId,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const latencyMs = Date.now() - startTime

    // AC-4: Handle 404 (lease not found) - graceful degradation
    if (response.status === 404) {
      logger.debug("Lease not found in ISB API", {
        correlationId,
        latencyMs,
        status: 404,
      })
      metrics.addMetric("ISBLeaseNotFound", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // AC-5: Handle 5xx errors - graceful degradation
    if (response.status >= 500) {
      logger.warn("ISB API server error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        status: response.status,
      })
      metrics.addMetric("ISBAPIServerError", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Handle 4xx errors (other than 404)
    if (!response.ok) {
      logger.warn("ISB API client error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        status: response.status,
      })
      metrics.addMetric("ISBAPIClientError", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Parse JSend response
    const json = (await response.json()) as JSendResponse<ISBLeaseRecord>

    // Validate JSend format
    if (json.status !== "success" || !json.data) {
      logger.warn("ISB API returned non-success JSend response", {
        correlationId,
        latencyMs,
        jsendStatus: json.status,
        message: json.message,
      })
      metrics.addMetric("ISBAPIInvalidResponse", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Success path
    logger.debug("Lease fetched successfully from ISB API", {
      correlationId,
      latencyMs,
      hasStatus: !!json.data.status,
      hasMaxSpend: json.data.maxSpend !== undefined,
    })
    metrics.addMetric("ISBAPISuccess", MetricUnit.Count, 1)
    metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)

    return json.data
  } catch (error) {
    clearTimeout(timeoutId)
    const latencyMs = Date.now() - startTime

    // AC-6/NFR4: Handle timeout
    if (error instanceof Error && error.name === "AbortError") {
      logger.warn("ISB API timeout - proceeding without enrichment", {
        correlationId,
        latencyMs,
        timeoutMs,
      })
      metrics.addMetric("ISBAPITimeout", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // AC-5: Handle network errors
    logger.warn("ISB API network error - proceeding without enrichment", {
      correlationId,
      latencyMs,
      errorType: error instanceof Error ? error.name : "Unknown",
      // Don't log error message - may contain sensitive info
    })
    metrics.addMetric("ISBAPINetworkError", MetricUnit.Count, 1)
    metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
    return null
  }
}

/**
 * Fetch lease record from ISB API using userEmail and uuid
 *
 * Convenience function that constructs the lease ID internally.
 *
 * @param userEmail - User's email address
 * @param uuid - Lease UUID
 * @param correlationId - Event ID for log correlation
 * @param config - Optional client configuration
 * @returns LeaseRecord or null if not found/error
 */
export async function fetchLeaseByKey(
  userEmail: string,
  uuid: string,
  correlationId: string,
  config?: ISBClientConfig,
): Promise<ISBLeaseRecord | null> {
  // Validate inputs
  if (!userEmail || typeof userEmail !== "string" || userEmail.trim() === "") {
    logger.warn("Invalid userEmail for ISB API - skipping enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientInputInvalid", MetricUnit.Count, 1)
    return null
  }

  if (!uuid || typeof uuid !== "string" || uuid.trim() === "") {
    logger.warn("Invalid uuid for ISB API - skipping enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientInputInvalid", MetricUnit.Count, 1)
    return null
  }

  const leaseId = constructLeaseId(userEmail, uuid)
  return fetchLeaseFromISB(leaseId, correlationId, config)
}
