/**
 * Signup Feature - API Client
 *
 * Provides functions for communicating with the signup API endpoints.
 * Uses the same patterns as the Try feature's api-client.ts.
 *
 * Story 1.5: Full API client implementation
 *
 * @module signup/api
 */

import type { DomainInfo, SignupRequest, SignupResponse, ApiError, DomainsResponse } from "./types"
import { isApiError, isSignupResponse } from "./types"

/** Base path for signup API endpoints */
const SIGNUP_API_BASE = "/signup-api"

/** CSRF header required for all POST requests (ADR-045) */
const CSRF_HEADER_NAME = "X-NDX-Request"
const CSRF_HEADER_VALUE = "signup-form"

/** Default timeout for API calls (10 seconds) */
const API_TIMEOUT_MS = 10000

/**
 * Fetch the list of allowed domains from the API.
 *
 * Story 1.5: Fetches domain list for signup dropdown
 *
 * @returns Promise resolving to array of DomainInfo
 * @throws Error if network fails or response is invalid
 */
export async function fetchDomains(): Promise<DomainInfo[]> {
  const response = await callSignupAPI("/domains")

  if (!response.ok) {
    throw new Error(`Failed to fetch domains: ${response.status}`)
  }

  const data: unknown = await response.json()

  // Validate response structure
  if (!isDomainsResponse(data)) {
    throw new Error("Invalid domains response format")
  }

  return data.domains
}

/**
 * Submit a signup request to create a new account.
 *
 * Story 1.5: Submits signup form to create user in IAM Identity Center
 *
 * @param request - The signup request payload
 * @returns Promise resolving to SignupResponse or ApiError
 * @throws Error if network fails or response is invalid
 */
export async function submitSignup(request: SignupRequest): Promise<SignupResponse | ApiError> {
  const response = await callSignupAPI("/signup", {
    method: "POST",
    body: JSON.stringify(request),
  })

  const data: unknown = await response.json()

  // Check for error response first (can come with non-2xx status)
  if (isApiError(data)) {
    return data
  }

  // Check for success response
  if (isSignupResponse(data)) {
    return data
  }

  // Unexpected response format
  throw new Error("Invalid API response format")
}

/**
 * Type guard to check if response is a valid DomainsResponse.
 *
 * @param data - Response data to check
 * @returns true if data is a DomainsResponse
 */
function isDomainsResponse(data: unknown): data is DomainsResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "domains" in data &&
    Array.isArray((data as DomainsResponse).domains) &&
    (data as DomainsResponse).domains.every(
      (d) => typeof d === "object" && d !== null && "domain" in d && "orgName" in d,
    )
  )
}

/**
 * Internal helper to make API calls with proper headers and timeout.
 *
 * @param endpoint - API endpoint (appended to SIGNUP_API_BASE)
 * @param options - Fetch options
 * @returns Promise resolving to Response
 * @internal
 */
async function callSignupAPI(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  }

  // Add CSRF header for POST requests
  if (options.method === "POST") {
    headers[CSRF_HEADER_NAME] = CSRF_HEADER_VALUE
  }

  // Add timeout using AbortController (Story 1.3 learning)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  try {
    return await fetch(`${SIGNUP_API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Exported for testing purposes only.
 * @internal
 */
export const _internal = {
  SIGNUP_API_BASE,
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
  API_TIMEOUT_MS,
  callSignupAPI,
  isDomainsResponse,
}
