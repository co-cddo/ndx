/**
 * Lease Templates Service
 *
 * Story 9.1: Create Lease Template Service
 *
 * Fetches lease template details from the Innovation Sandbox API
 * to display actual duration and budget limits in the AUP modal.
 *
 * ## Error Handling Pattern
 *
 * This service uses the **Result pattern** (Railway-oriented programming) where
 * functions return `{ success: boolean, data?, error?, errorCode? }` objects
 * instead of throwing exceptions. This pattern is used throughout the frontend
 * API layer because:
 *
 * 1. **Explicit error handling** - Callers must handle both success and failure
 * 2. **Type-safe errors** - Error codes are typed for programmatic handling
 * 3. **No try/catch boilerplate** - Cleaner async/await code in UI components
 * 4. **Composable** - Results can be easily chained and transformed
 *
 * ## Accepted Risk: CSRF Protection
 *
 * This service does not add CSRF tokens to requests. This is accepted because:
 * 1. API calls use authentication cookies with SameSite=Strict attribute
 * 2. The Innovation Sandbox API validates the session origin
 * 3. Read-only GET requests don't require CSRF protection
 * 4. State-changing actions (lease requests) go through a separate flow
 *    with additional validation
 *
 * Note: Lambda functions in `infra/lib/lambda/` use a different pattern
 * (throwing typed exceptions like `RetriableError`, `PermanentError`) because:
 * - Lambda runtime expects exceptions for failure signaling
 * - EventBridge/Step Functions can retry based on exception types
 * - Simpler integration with AWS Powertools error handling
 *
 * @module lease-templates-service
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-021|ADR-021: Centralized API Client}
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-028|ADR-028: Request Deduplication}
 */

import { callISBAPI } from "./api-client"
import { config } from "../config"
import { getHttpErrorMessage } from "../utils/error-utils"
import { deduplicatedRequest } from "../utils/request-dedup"

/**
 * Error codes for lease template fetch failures.
 *
 * ## Accepted Risk: Error Information Disclosure
 *
 * Error codes and messages are returned to the UI. This is accepted because:
 * 1. Error messages are generic (no internal details exposed)
 * 2. Error codes are documented and expected by the UI
 * 3. Detailed errors are logged server-side only
 * 4. No stack traces or internal paths are exposed to clients
 */
export type LeaseTemplateErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "TIMEOUT"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "INVALID_UUID"

/**
 * Result from fetching lease template details.
 * Follows pattern from ConfigurationsResult in configurations-service.ts
 */
export interface LeaseTemplateResult {
  /** Whether the fetch was successful */
  success: boolean
  /** Template data (only present if successful) */
  data?: {
    /** Session duration in hours (defaults to 24 if not in response) */
    leaseDurationInHours: number
    /** Maximum budget in USD (defaults to 50 if not in response) */
    maxSpend: number
    /** Optional template name */
    name?: string
  }
  /** Error message (only present if failed) */
  error?: string
  /** Error code for programmatic handling */
  errorCode?: LeaseTemplateErrorCode
}

/**
 * Raw API response from /api/leaseTemplates/{id} endpoint.
 * The Innovation Sandbox API uses JSend format with nested data.
 * @internal
 */
interface LeaseTemplateAPIResponse {
  /** JSend status field */
  status?: "success" | "fail" | "error"
  /** Nested data object */
  data?: {
    /** Lease template UUID */
    uuid?: string
    /** Template name (required in API but defensive parsing) */
    name?: string
    /** Optional description */
    description?: string
    /** Whether approval is required */
    requiresApproval?: boolean
    /** Creator email */
    createdBy?: string
    /** Maximum budget in USD (optional) */
    maxSpend?: number
    /** Session duration in hours (optional) */
    leaseDurationInHours?: number
    /** Budget thresholds for notifications */
    budgetThresholds?: Array<{ dollarsSpent: number; action: string }>
    /** Duration thresholds for notifications */
    durationThresholds?: Array<{ hoursRemaining: number; action: string }>
    /** Metadata */
    meta?: {
      createdTime?: string
      lastEditTime?: string
      schemaVersion?: number
    }
  }
  /** Error message (if status is "error") */
  message?: string
}

/**
 * Default values for lease template fields when not provided by API.
 */
const DEFAULTS = {
  leaseDurationInHours: 24,
  maxSpend: 50,
} as const

/**
 * Tiered timeout configuration for different API call types.
 * Values in milliseconds.
 *
 * - critical: User-blocking requests that need quick feedback (lease template fetch)
 * - standard: Normal API calls with reasonable wait time
 * - background: Non-blocking operations that can take longer
 */
const TIMEOUTS = {
  /** Critical operations: 5 seconds (user is actively waiting) */
  critical: 5000,
  /** Standard operations: 10 seconds */
  standard: 10000,
  /** Background operations: 30 seconds */
  background: 30000,
} as const

/**
 * UUID validation regex pattern.
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Type guard to validate that a value is a valid UUID string.
 *
 * Security: Validates input type and rejects control characters to prevent
 * path traversal and injection attacks.
 *
 * ## Accepted Risk: Unicode Homoglyphs
 *
 * This validation does not check for Unicode homoglyphs (e.g., Cyrillic 'а'
 * vs ASCII 'a'). This is accepted because:
 * 1. The API backend performs additional validation
 * 2. UUIDs are system-generated, not user-created
 * 3. The regex pattern only accepts hex characters (0-9, a-f)
 *
 * ## Accepted Risk: No Rate Limiting
 *
 * Client-side rate limiting is not implemented. This is accepted because:
 * 1. The API has server-side rate limiting
 * 2. Invalid UUIDs fail fast without API call
 * 3. Browser request limits provide natural throttling
 *
 * @param value - The value to validate (may be any type)
 * @returns true if value is a valid UUID string, false otherwise
 * @internal
 */
function isValidUUID(value: unknown): value is string {
  // Type guard: must be a non-empty string
  if (typeof value !== "string" || value.length === 0) {
    return false
  }

  // Security: reject control characters (potential injection vectors)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(value)) {
    return false
  }

  // Validate UUID format
  return UUID_REGEX.test(value)
}

/**
 * Build the API endpoint URL for fetching a lease template.
 *
 * @param tryId - Lease template UUID
 * @returns API endpoint URL
 * @internal
 */
function buildEndpoint(tryId: string): string {
  return `/api/leaseTemplates/${tryId}`
}

/**
 * Fetch lease template details from the Innovation Sandbox API.
 *
 * Uses request deduplication (ADR-028) to prevent concurrent duplicate calls.
 * No caching - templates may change and modal is short-lived.
 *
 * @param tryId - Lease template UUID from product frontmatter
 * @returns Promise resolving to LeaseTemplateResult
 *
 * @example
 * const result = await fetchLeaseTemplate('550e8400-e29b-41d4-a716-446655440000');
 * if (result.success) {
 *   console.log(`Duration: ${result.data.leaseDurationInHours} hours`);
 *   console.log(`Budget: $${result.data.maxSpend}`);
 * } else {
 *   console.error(`Error: ${result.error} (${result.errorCode})`);
 * }
 */
export async function fetchLeaseTemplate(tryId: string): Promise<LeaseTemplateResult> {
  // AC-8: Validate UUID format before API call (fail fast)
  if (!tryId || !isValidUUID(tryId)) {
    console.warn("[lease-templates-service] Invalid UUID format:", tryId)
    return {
      success: false,
      error: "Invalid template identifier.",
      errorCode: "INVALID_UUID",
    }
  }

  // AC-9: Use deduplicatedRequest to prevent concurrent duplicate calls
  return deduplicatedRequest(`fetchLeaseTemplate:${tryId}`, async () => {
    const controller = new AbortController()
    // Use critical timeout: user is actively waiting for modal content
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.critical)

    const startTime = Date.now()
    const endpoint = buildEndpoint(tryId)

    try {
      console.log("[lease-templates-service] Fetching template:", tryId)

      const response = await callISBAPI(endpoint, {
        method: "GET",
        signal: controller.signal,
        skipAuthRedirect: true, // Handle 401 gracefully, don't redirect
      })

      clearTimeout(timeoutId)
      const elapsed = Date.now() - startTime
      console.log(`[lease-templates-service] Fetch completed in ${elapsed}ms`)

      // AC-4: Handle 404 - Template not found
      if (response.status === 404) {
        console.error("[lease-templates-service] Template not found:", tryId)
        return {
          success: false,
          error: "This sandbox template was not found.",
          errorCode: "NOT_FOUND",
        }
      }

      // AC-5: Handle 401 - Unauthorized (when skipAuthRedirect is used)
      if (response.status === 401) {
        console.error("[lease-templates-service] Unauthorized:", tryId)
        return {
          success: false,
          error: "Please sign in to continue.",
          errorCode: "UNAUTHORIZED",
        }
      }

      // AC-6: Handle 500+ - Server error
      if (!response.ok) {
        console.error("[lease-templates-service] API error:", response.status, response.statusText)
        return {
          success: false,
          error: getHttpErrorMessage(response.status, "general"),
          errorCode: "SERVER_ERROR",
        }
      }

      // Parse response
      const rawData: LeaseTemplateAPIResponse = await response.json()

      // AC-10: Defensive parsing - check for expected fields
      const data = rawData.data
      if (!data) {
        console.warn("[lease-templates-service] Response missing data field, template:", tryId)
      }

      // Extract fields with defaults (AC-2, AC-10)
      const leaseDurationInHours = data?.leaseDurationInHours ?? DEFAULTS.leaseDurationInHours
      const maxSpend = data?.maxSpend ?? DEFAULTS.maxSpend
      const name = data?.name

      // Log warning if fields are missing (AC-10)
      if (data && data.leaseDurationInHours === undefined) {
        console.warn(
          "[lease-templates-service] Missing leaseDurationInHours, using default:",
          DEFAULTS.leaseDurationInHours,
        )
      }
      if (data && data.maxSpend === undefined) {
        console.warn("[lease-templates-service] Missing maxSpend, using default:", DEFAULTS.maxSpend)
      }

      // AC-1, AC-2, AC-3: Return typed result
      return {
        success: true,
        data: {
          leaseDurationInHours,
          maxSpend,
          name,
        },
      }
    } catch (error) {
      clearTimeout(timeoutId)

      // AC-7: Handle timeout (AbortError)
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.error("[lease-templates-service] Request timeout for template:", tryId)
          return {
            success: false,
            error: "Request timed out. Please check your connection and try again.",
            errorCode: "TIMEOUT",
          }
        }
        console.error("[lease-templates-service] Fetch error:", error.message)
      }

      // Network errors
      return {
        success: false,
        error: "Unable to load template details. Please try again.",
        errorCode: "NETWORK_ERROR",
      }
    }
  })
}
