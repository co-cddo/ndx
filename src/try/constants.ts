/**
 * Shared Constants for Try Before You Buy Feature
 *
 * Centralizes all constant values used across the Try feature modules
 * to ensure consistency and prevent duplication (DRY principle).
 *
 * @module constants
 */

/**
 * sessionStorage key for JWT token storage.
 * Used by: api-client.ts, auth-provider.ts, oauth-flow.ts
 * CRITICAL: All modules must use this shared constant.
 */
export const JWT_TOKEN_KEY = "isb-jwt"

/**
 * sessionStorage key for storing return URL during OAuth flow.
 * Used by: oauth-flow.ts
 */
export const RETURN_URL_KEY = "auth-return-to"

/**
 * OAuth callback page path (must not be stored as return URL to avoid loops).
 */
export const CALLBACK_PATH = "/callback"

/**
 * OAuth login endpoint for authentication redirects.
 */
export const OAUTH_LOGIN_URL = "/api/auth/login"

/**
 * Paths that should never be stored as return URLs.
 *
 * This blocklist prevents redirect loops and ensures users return to meaningful pages.
 * Per ADR-042: Signup pages must never be stored as return destinations.
 *
 * Story 2.2: Return URL Preservation
 */
export const RETURN_URL_BLOCKLIST = [
  CALLBACK_PATH, // /callback (OAuth callback)
  "/signup", // Signup form page
  "/signup/success", // Signup success page
]

/**
 * sessionStorage key for welcome back flag.
 *
 * Set when an existing user is redirected from signup to login.
 * Triggers "Welcome back" banner display after successful login.
 *
 * Story 2.3: Existing User Detection & Redirect
 */
export const WELCOME_BACK_KEY = "signup-welcome-back"
