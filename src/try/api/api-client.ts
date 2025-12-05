/**
 * Centralized API Client for Innovation Sandbox API
 *
 * Story 5.6: API Authorization Header Injection
 * Story 5.7: Authentication Status Check API
 * Story 5.8: 401 Unauthorized Response Handling
 *
 * This module provides a centralized API client that automatically handles
 * JWT authentication for all Innovation Sandbox API requests.
 *
 * ADR-021: Centralized API client with authentication interceptor
 * - Single module handles all ISB API calls
 * - Automatic Authorization header injection (DRY principle)
 * - checkAuthStatus() for server-side token validation
 * - Automatic 401 handling with redirect to OAuth (Story 5.8)
 *
 * @module api-client
 */

import { JWT_TOKEN_KEY, OAUTH_LOGIN_URL } from "../constants"
import { deduplicatedRequest } from "../utils/request-dedup"
import { config } from "../config"

/**
 * User session data returned from auth status API.
 *
 * @interface UserData
 */
export interface UserData {
  /** User's email address (e.g., "user@example.gov.uk") */
  email: string
  /** User's display name (e.g., "Jane Smith") */
  displayName: string
  /** User's username (e.g., "jane.smith") */
  userName: string
  /** User's roles (e.g., ["user"]) */
  roles: string[]
}

/**
 * Result from authentication status check.
 *
 * @interface AuthStatusResult
 */
export interface AuthStatusResult {
  /** Whether the user is currently authenticated */
  authenticated: boolean
  /** User data (only present if authenticated) */
  user?: UserData
}

// JWT_TOKEN_KEY and OAUTH_LOGIN_URL imported from '../constants'

/**
 * Extended options for callISBAPI with authentication handling controls.
 *
 * @interface ISBAPIOptions
 */
export interface ISBAPIOptions extends RequestInit {
  /**
   * Skip automatic redirect to OAuth on 401 responses.
   * Use this for operations that check auth status (like checkAuthStatus).
   * Default: false (401 triggers redirect)
   */
  skipAuthRedirect?: boolean
}

/**
 * Makes an authenticated API call to the Innovation Sandbox API.
 *
 * Automatically includes Authorization header with Bearer token if JWT exists
 * in sessionStorage. If no token exists, the request proceeds without
 * authentication (for public endpoints or pre-auth flows).
 *
 * Story 5.8: Automatically handles 401 responses by:
 * 1. Clearing the invalid token from sessionStorage
 * 2. Redirecting to OAuth login
 * Use `skipAuthRedirect: true` to disable this behavior (e.g., for checkAuthStatus).
 *
 * @param endpoint - API endpoint URL (e.g., '/api/leases', '/api/auth/status')
 * @param options - Extended fetch options including auth handling controls
 * @returns Promise resolving to fetch Response object
 * @throws Error if 401 response received and redirect triggered
 *
 * @example
 * ```typescript
 * // Simple GET request (401 triggers OAuth redirect)
 * const response = await callISBAPI('/api/leases');
 * const data = await response.json();
 *
 * // POST request with body
 * const response = await callISBAPI('/api/leases', {
 *   method: 'POST',
 *   body: JSON.stringify({ productId: '123' })
 * });
 *
 * // Request with custom headers (preserved alongside Authorization)
 * const response = await callISBAPI('/api/data', {
 *   headers: { 'X-Custom-Header': 'value' }
 * });
 *
 * // Check auth without triggering redirect on 401
 * const response = await callISBAPI('/api/auth/status', { skipAuthRedirect: true });
 * ```
 */
export async function callISBAPI(endpoint: string, options: ISBAPIOptions = {}): Promise<Response> {
  // Extract custom options, pass rest to fetch
  const { skipAuthRedirect, ...fetchOptions } = options

  // Build headers object, preserving any custom headers from options
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extractHeaders(fetchOptions.headers),
  }

  // Add Authorization header if JWT token exists
  const token = getToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  // Make the fetch request with merged options
  const response = await fetch(endpoint, {
    ...fetchOptions,
    headers,
  })

  // Story 5.8: Handle 401 Unauthorized - automatic re-authentication
  // Skip if skipAuthRedirect is true (used by checkAuthStatus)
  if (response.status === 401 && !skipAuthRedirect) {
    // Clear invalid token to prevent infinite loops
    clearToken()
    // Redirect to OAuth login
    redirectToOAuth()
    // Throw to stop promise chain (redirect will navigate away)
    throw new Error("Unauthorized - redirecting to login")
  }

  return response
}

/**
 * Clears JWT token from sessionStorage.
 * Used on 401 to remove invalid token before redirect.
 * @internal
 */
function clearToken(): void {
  // Guard against SSR environments
  if (typeof sessionStorage === "undefined") {
    return
  }
  try {
    sessionStorage.removeItem(JWT_TOKEN_KEY)
  } catch {
    // Ignore sessionStorage errors
  }
}

/**
 * Redirects to OAuth login endpoint.
 * Used on 401 to initiate re-authentication.
 * @internal
 */
function redirectToOAuth(): void {
  // Guard against SSR environments
  if (typeof window === "undefined") {
    return
  }
  window.location.href = OAUTH_LOGIN_URL
}

/**
 * Checks authentication status by calling the Innovation Sandbox auth status API.
 *
 * Story 5.7: Authentication Status Check API
 *
 * Makes a server-side call to validate the JWT token and retrieve user session data.
 * This provides server-side validation complementing the client-side isAuthenticated() check.
 *
 * @returns Promise resolving to AuthStatusResult with authentication state and optional user data
 *
 * @example
 * ```typescript
 * // Check if user is authenticated
 * const result = await checkAuthStatus();
 * if (result.authenticated) {
 *   console.log(`Welcome, ${result.user?.displayName}`);
 * } else {
 *   // Redirect to login
 * }
 *
 * // Use user email for API calls
 * const { authenticated, user } = await checkAuthStatus();
 * if (authenticated && user) {
 *   const leases = await callISBAPI(`/api/leases?userEmail=${user.email}`);
 * }
 * ```
 */
/**
 * Response structure from /api/auth/login/status endpoint.
 */
interface AuthStatusResponse {
  authenticated: boolean
  session?: {
    user: UserData
    iat: number
    exp: number
  }
}

/**
 * Checks authentication status with timeout protection.
 *
 * Uses request deduplication (ADR-028) to prevent concurrent duplicate calls
 * when multiple components check auth status simultaneously.
 *
 * PERFORMANCE FIX: Includes timeout to prevent indefinite hanging on slow networks.
 * Default timeout is 5 seconds (shorter than standard 10s request timeout since
 * auth checks should be fast and blocking the UI is worse than failing fast).
 *
 * @param timeout - Timeout in milliseconds (default: 5000ms)
 * @returns Promise resolving to AuthStatusResult
 */
export async function checkAuthStatus(timeout = 5000): Promise<AuthStatusResult> {
  return deduplicatedRequest("checkAuthStatus", async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Use skipAuthRedirect to prevent redirect on 401 - we handle it gracefully here
      const response = await callISBAPI("/api/auth/login/status", {
        skipAuthRedirect: true,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data: AuthStatusResponse = await response.json()

        // Handle actual API response structure: { authenticated, session: { user } }
        if (data.authenticated && data.session?.user) {
          return {
            authenticated: true,
            user: data.session.user,
          }
        }

        return { authenticated: false }
      } else if (response.status === 401) {
        // Token invalid or expired - this is expected, not an error
        return { authenticated: false }
      } else {
        // Other HTTP errors (500, etc.)
        console.error("[api-client] Auth status check failed:", response.status, response.statusText)
        return { authenticated: false }
      }
    } catch (error) {
      clearTimeout(timeoutId)

      // Handle timeout specifically
      if (error instanceof Error && error.name === "AbortError") {
        console.error("[api-client] Auth status check timed out after", timeout, "ms")
        return { authenticated: false }
      }

      // Network errors (offline, CORS, etc.)
      console.error("[api-client] Auth status check error:", error)
      return { authenticated: false }
    }
  })
}

/**
 * Retrieves JWT token from sessionStorage.
 *
 * @returns JWT token string or null if not found/unavailable
 * @internal
 */
function getToken(): string | null {
  // Guard against SSR environments where sessionStorage is unavailable
  if (typeof sessionStorage === "undefined") {
    return null
  }

  try {
    const token = sessionStorage.getItem(JWT_TOKEN_KEY)
    // Treat empty string as no token
    if (token === null || token === "") {
      return null
    }
    return token
  } catch {
    // Handle any sessionStorage access errors (e.g., security restrictions)
    return null
  }
}

/**
 * Extracts headers from HeadersInit to a plain object.
 * H12: Added input validation for header key/value pairs.
 *
 * @param headersInit - Headers from RequestInit (HeadersInit type)
 * @returns Plain object with header key-value pairs
 * @internal
 */
function extractHeaders(headersInit?: HeadersInit): Record<string, string> {
  if (!headersInit) {
    return {}
  }

  // Handle array of [key, value] pairs (must check before Headers due to duck typing)
  if (Array.isArray(headersInit)) {
    const result: Record<string, string> = {}
    for (const entry of headersInit) {
      // H12: Validate array entry is a valid [key, value] pair
      if (Array.isArray(entry) && entry.length >= 2 && typeof entry[0] === "string" && typeof entry[1] === "string") {
        result[entry[0].trim()] = entry[1]
      }
    }
    return result
  }

  // Handle Headers object using duck typing (works across environments)
  // Check for forEach method which is characteristic of Headers interface
  if (typeof (headersInit as Headers).forEach === "function") {
    const result: Record<string, string> = {}
    ;(headersInit as Headers).forEach((value, key) => {
      // H12: Validate key and value are strings
      if (typeof key === "string" && typeof value === "string") {
        result[key] = value
      }
    })
    return result
  }

  // Handle plain object with validation
  if (typeof headersInit === "object" && headersInit !== null) {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(headersInit)) {
      // H12: Only include string key-value pairs
      if (typeof key === "string" && typeof value === "string") {
        result[key] = value
      }
    }
    return result
  }

  return {}
}

/**
 * Exported for testing purposes only.
 * @internal
 */
export const _internal = {
  JWT_TOKEN_KEY,
  OAUTH_LOGIN_URL,
  getToken,
  extractHeaders,
  clearToken,
  redirectToOAuth,
}
