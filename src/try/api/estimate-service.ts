/**
 * Deployment Estimate Service
 *
 * Fetches estimated provisioning duration for a lease template from the
 * NDX estimate API. The estimate is the average of the last 5 successful
 * deployments for that template.
 *
 * @module estimate-service
 */

import { deduplicatedRequest } from "../utils/request-dedup"

/**
 * Result from fetching deployment estimate.
 */
export interface EstimateResult {
  /** Whether the fetch was successful */
  success: boolean
  /** Estimated provisioning duration in minutes (null if no history) */
  estimateMinutes?: number | null
  /** Error message (only present if failed) */
  error?: string
}

/** Estimate API endpoint (routed via CloudFront to the lease-api Lambda) */
const ESTIMATE_ENDPOINT = "/lease-api/estimate"

/** Request timeout in milliseconds */
const ESTIMATE_TIMEOUT_MS = 5000

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000

/** In-memory cache for estimates per template */
const cache = new Map<string, { estimateMinutes: number | null; fetchedAt: number }>()

/**
 * Fetch estimated provisioning duration for a lease template.
 *
 * Returns the average deployment time (in minutes) based on the last 5
 * successful deployments. Returns null if no deployment history exists.
 *
 * Results are cached in memory for 5 minutes per template.
 *
 * @param leaseTemplateId - Lease template UUID
 * @returns Promise resolving to EstimateResult
 */
export async function fetchDeploymentEstimate(leaseTemplateId: string): Promise<EstimateResult> {
  if (!leaseTemplateId) {
    return { success: false, error: "Missing template ID" }
  }

  // Return cached value if fresh
  const cached = cache.get(leaseTemplateId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { success: true, estimateMinutes: cached.estimateMinutes }
  }

  return deduplicatedRequest(`estimate:${leaseTemplateId}`, async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ESTIMATE_TIMEOUT_MS)

    try {
      const url = `${ESTIMATE_ENDPOINT}?leaseTemplateId=${encodeURIComponent(leaseTemplateId)}`

      // No auth header needed — this endpoint is unprotected
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error("[estimate-service] API error:", response.status)
        return { success: false, error: "Unable to load estimate" }
      }

      const data = await response.json()
      const estimateMinutes: number | null = typeof data.estimateMinutes === "number" ? data.estimateMinutes : null

      // Cache the result
      cache.set(leaseTemplateId, { estimateMinutes, fetchedAt: Date.now() })

      return { success: true, estimateMinutes }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === "AbortError") {
        console.error("[estimate-service] Request timed out")
        return { success: false, error: "Request timed out" }
      }

      console.error("[estimate-service] Fetch error:", error instanceof Error ? error.message : "Unknown")
      return { success: false, error: "Unable to load estimate" }
    }
  })
}

/**
 * Clear the estimate cache. Exported for testing.
 * @internal
 */
export function clearEstimateCache(): void {
  cache.clear()
}
