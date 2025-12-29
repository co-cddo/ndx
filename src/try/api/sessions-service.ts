/**
 * Sessions Service
 *
 * Story 7.2: Fetch and display user leases
 *
 * Fetches user's sandbox leases from the Innovation Sandbox API.
 *
 * @module sessions-service
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-021|ADR-021: Centralized API Client}
 */

import { callISBAPI, checkAuthStatus } from "./api-client"
import { authState } from "../auth/auth-provider"
import { config } from "../config"
import { getHttpErrorMessage } from "../utils/error-utils"
import { deduplicatedRequest } from "../utils/request-dedup"

/**
 * Lease status values.
 * API returns various status strings including 'ManuallyTerminated'.
 */
export type LeaseStatus = "Pending" | "Active" | "Expired" | "Terminated" | "ManuallyTerminated" | "Failed"

/**
 * Raw lease data from API response.
 * Matches the actual API structure from /api/leases endpoint.
 */
interface RawLease {
  leaseId: string
  uuid: string
  userEmail: string
  awsAccountId: string
  originalLeaseTemplateUuid: string
  originalLeaseTemplateName: string
  status: string
  startDate: string
  expirationDate: string
  endDate?: string
  maxSpend: number
  totalCostAccrued: number
  leaseDurationInHours: number
  comments?: string
  createdBy: string
  approvedBy: string
  meta: {
    createdTime: string
    lastEditTime: string
    schemaVersion: number
  }
}

/**
 * Lease data normalized for UI display.
 */
export interface Lease {
  /** Unique lease identifier */
  leaseId: string
  /** AWS account ID for the sandbox */
  awsAccountId: string
  /** Lease template UUID (product try_id) */
  leaseTemplateId: string
  /** Product/template display name */
  leaseTemplateName: string
  /** Current lease status */
  status: LeaseStatus
  /** When lease was created (ISO 8601) */
  createdAt: string
  /** When lease expires (ISO 8601). May be undefined for pending leases. */
  expiresAt?: string
  /** Maximum spend limit in USD */
  maxSpend: number
  /** Current spend in USD */
  currentSpend: number
  /** AWS SSO portal URL for console access */
  awsSsoPortalUrl?: string
  /** Comments from lease approval process */
  comments?: string
}

/**
 * Result from fetching user leases.
 */
export interface LeasesResult {
  /** Whether the fetch was successful */
  success: boolean
  /** Array of leases (only present if successful) */
  leases?: Lease[]
  /** Error message (only present if failed) */
  error?: string
}

/**
 * API endpoint for leases.
 */
const LEASES_ENDPOINT = "/api/leases"

/**
 * Fetch user's leases from the Innovation Sandbox API.
 *
 * Uses request deduplication (ADR-028) to prevent concurrent duplicate calls
 * when multiple components request leases simultaneously.
 *
 * @returns Promise resolving to LeasesResult
 *
 * @example
 * const result = await fetchUserLeases();
 * if (result.success) {
 *   console.log('Leases:', result.leases);
 * } else {
 *   console.error('Failed to fetch leases:', result.error);
 * }
 */
export async function fetchUserLeases(): Promise<LeasesResult> {
  return deduplicatedRequest("fetchUserLeases", async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout)

    try {
      // First, get user email from auth status API
      const authStatus = await checkAuthStatus()
      if (!authStatus.authenticated || !authStatus.user?.email) {
        console.error("[sessions-service] User not authenticated or email not available")

        // DEFECT FIX: Clear invalid token from sessionStorage and notify subscribers.
        // This handles the case where token exists locally but is invalid server-side
        // (e.g., API returns 200 with authenticated:false instead of 401).
        // Without this, UI shows "signed in" state but API calls fail.
        authState.logout()

        return {
          success: false,
          error: "Please sign in to view your sessions.",
        }
      }

      const userEmail = encodeURIComponent(authStatus.user.email)
      const endpoint = `${LEASES_ENDPOINT}?userEmail=${userEmail}`

      const response = await callISBAPI(endpoint, {
        method: "GET",
        signal: controller.signal,
        // Let 401 redirect happen naturally
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error("[sessions-service] API error:", response.status, response.statusText)
        return {
          success: false,
          error: getHttpErrorMessage(response.status, "sessions"),
        }
      }

      const data = await response.json()

      // API response structure: { status: "success", data: { result: [...], nextPageIdentifier: null } }
      let rawLeases: RawLease[] = []

      if (data?.status === "success" && Array.isArray(data?.data?.result)) {
        rawLeases = data.data.result
      } else if (Array.isArray(data)) {
        // Fallback for direct array response
        rawLeases = data
      } else if (Array.isArray(data?.leases)) {
        // Legacy format fallback
        rawLeases = data.leases
      }

      // Transform raw API leases to normalized Lease format
      const leases: Lease[] = rawLeases.map(transformLease)

      // Sort by createdAt descending (newest first)
      leases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return {
        success: true,
        leases,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.error("[sessions-service] Request timeout")
          return {
            success: false,
            error: "Request timed out. Please check your connection and try again.",
          }
        }

        // 401 redirect error from callISBAPI
        if (error.message.includes("Unauthorized")) {
          return {
            success: false,
            error: "Please sign in to view your sessions.",
          }
        }

        console.error("[sessions-service] Fetch error:", error.message)
      }

      return {
        success: false,
        error: "Unable to load your sessions. Please try again.",
      }
    }
  })
}

/**
 * Transform raw API lease data to normalized Lease format.
 *
 * @param raw - Raw lease from API response
 * @returns Normalized Lease object
 */
function transformLease(raw: RawLease): Lease {
  // Normalize status string to our LeaseStatus type
  let status: LeaseStatus = "Expired"
  switch (raw.status) {
    case "Active":
      status = "Active"
      break
    case "Pending":
      status = "Pending"
      break
    case "Expired":
      status = "Expired"
      break
    case "Terminated":
      status = "Terminated"
      break
    case "ManuallyTerminated":
      status = "ManuallyTerminated"
      break
    case "Failed":
      status = "Failed"
      break
  }

  return {
    leaseId: raw.leaseId,
    awsAccountId: raw.awsAccountId,
    leaseTemplateId: raw.originalLeaseTemplateUuid,
    leaseTemplateName: raw.originalLeaseTemplateName,
    status,
    createdAt: raw.meta?.createdTime || raw.startDate,
    expiresAt: raw.expirationDate || raw.endDate,
    maxSpend: raw.maxSpend ?? 0,
    currentSpend: raw.totalCostAccrued ?? 0,
    // SSO URL will be configured in config
    awsSsoPortalUrl: undefined,
    comments: raw.comments,
  }
}

/**
 * Check if a lease is active (can launch console).
 *
 * @param lease - Lease to check
 * @returns true if lease is active
 */
export function isLeaseActive(lease: Lease): boolean {
  return lease.status === "Active"
}

/**
 * Check if a lease is pending.
 *
 * @param lease - Lease to check
 * @returns true if lease is pending
 */
export function isLeasePending(lease: Lease): boolean {
  return lease.status === "Pending"
}

/**
 * Build the SSO console URL for a lease.
 *
 * Story 7.11: Uses centralized config for SSO portal URL and role name.
 * Builds URL with account_id and role_name query parameters for direct console access.
 *
 * URL format: https://d-9267e1e371.awsapps.com/start/#/console?account_id={accountid}&role_name=ndx_IsbUsersPS
 *
 * @param lease - Lease to get URL for
 * @returns SSO console URL with account and role parameters
 */
export function getSsoUrl(lease: Lease): string {
  // If lease has a custom SSO URL, use it directly
  if (lease.awsSsoPortalUrl) {
    return lease.awsSsoPortalUrl
  }

  // Build URL with account_id and role_name parameters
  const baseUrl = config.awsSsoPortalUrl
  const accountId = lease.awsAccountId
  const roleName = config.ssoRoleName

  return `${baseUrl}/#/console?account_id=${accountId}&role_name=${roleName}`
}

/**
 * Get the SSO portal base URL for a lease.
 *
 * Returns just the portal URL without console redirect parameters.
 * Used for opening the portal to view CLI credentials.
 *
 * @param lease - Lease to get portal URL for
 * @returns SSO portal base URL
 */
export function getPortalUrl(lease: Lease): string {
  if (lease.awsSsoPortalUrl) {
    return lease.awsSsoPortalUrl
  }
  return config.awsSsoPortalUrl
}
