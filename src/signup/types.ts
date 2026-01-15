/**
 * NDX Signup Feature - Shared TypeScript Types
 *
 * This module defines the shared types used by both:
 * - Client-side signup form (src/signup/)
 * - Lambda backend (infra-signup/lib/lambda/signup/)
 *
 * Story 1.1: Shared types establishment
 *
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for signup types.
 * Lambda imports via @ndx/signup-types path mapping (ADR-048).
 * Never duplicate these types elsewhere.
 *
 * @module signup/types
 */

/**
 * Error codes matching backend responses.
 *
 * These codes are used in API error responses and enable
 * exhaustive error handling in the client.
 *
 * Error message copy is defined in project-context.md and
 * should match exactly when displaying to users.
 */
export enum SignupErrorCode {
  /** User's email domain is not in the allowlist */
  DOMAIN_NOT_ALLOWED = "DOMAIN_NOT_ALLOWED",
  /** User already has an account (silent redirect to login) */
  USER_EXISTS = "USER_EXISTS",
  /** Email format is invalid */
  INVALID_EMAIL = "INVALID_EMAIL",
  /** Request Content-Type is not application/json */
  INVALID_CONTENT_TYPE = "INVALID_CONTENT_TYPE",
  /** CSRF header missing or invalid (ADR-045) */
  CSRF_INVALID = "CSRF_INVALID",
  /** Too many requests from this IP (ADR-046) */
  RATE_LIMITED = "RATE_LIMITED",
  /** Internal server error */
  SERVER_ERROR = "SERVER_ERROR",
}

/**
 * User-friendly error messages for each error code.
 *
 * These messages are defined in project-context.md and must
 * be used exactly as specified for consistency.
 */
export const ERROR_MESSAGES: Record<SignupErrorCode, string> = {
  [SignupErrorCode.DOMAIN_NOT_ALLOWED]:
    "Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access.",
  [SignupErrorCode.USER_EXISTS]: "Welcome back! You already have an account.",
  [SignupErrorCode.INVALID_EMAIL]: "Enter a valid email address",
  [SignupErrorCode.INVALID_CONTENT_TYPE]: "Invalid request format",
  [SignupErrorCode.CSRF_INVALID]: "Invalid request",
  [SignupErrorCode.RATE_LIMITED]: "Too many attempts. Try again in 1 minute.",
  [SignupErrorCode.SERVER_ERROR]: "Something went wrong. Try again.",
}

/**
 * Signup form submission payload.
 *
 * Sent to POST /signup-api/signup
 */
export interface SignupRequest {
  /** User's first name (required, max 100 chars) */
  firstName: string
  /** User's last name (required, max 100 chars) */
  lastName: string
  /** User's email address (required, max 254 chars) */
  email: string
  /** User's organisation domain from dropdown (required) */
  domain: string
}

/**
 * API success response from signup endpoint.
 *
 * Returned when account creation is successful.
 */
export interface SignupResponse {
  /** Always true for success responses */
  success: true
  /** Optional URL to redirect to after signup */
  redirectUrl?: string
}

/**
 * API error response from signup endpoint.
 *
 * Returned when signup fails for any reason.
 */
export interface ApiError {
  /** Machine-readable error code */
  error: SignupErrorCode
  /** Human-readable error message */
  message: string
  /** Optional redirect URL (used for USER_EXISTS to redirect to login) */
  redirectUrl?: string
}

/**
 * Domain info from the allowlist.
 *
 * Returned from GET /signup-api/domains
 */
export interface DomainInfo {
  /** Domain name (e.g., "westbury.gov.uk") */
  domain: string
  /** Organisation name (e.g., "Westbury District Council") */
  orgName: string
}

/**
 * Response from GET /signup-api/domains endpoint.
 */
export interface DomainsResponse {
  /** List of allowed domains */
  domains: DomainInfo[]
  /** Timestamp when list was last updated (ISO 8601) */
  lastUpdated?: string
}

/**
 * Type guard to check if a response is an API error.
 *
 * @param response - Response object to check
 * @returns true if response is an ApiError
 *
 * @example
 * ```typescript
 * const result = await submitSignup(request)
 * if (isApiError(result)) {
 *   showError(result.message)
 * } else {
 *   redirectTo(result.redirectUrl)
 * }
 * ```
 */
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    "message" in response &&
    typeof (response as ApiError).error === "string" &&
    typeof (response as ApiError).message === "string"
  )
}

/**
 * Type guard to check if a response is a successful signup response.
 *
 * @param response - Response object to check
 * @returns true if response is a SignupResponse
 */
export function isSignupResponse(response: unknown): response is SignupResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "success" in response &&
    (response as SignupResponse).success === true
  )
}

/**
 * Validation constraints for signup form fields.
 *
 * Based on project-context.md security input validation rules.
 */
export const VALIDATION_CONSTRAINTS = {
  /** Maximum email length (RFC 5321) */
  EMAIL_MAX_LENGTH: 254,
  /** Maximum name field length */
  NAME_MAX_LENGTH: 100,
  /** Minimum name field length */
  NAME_MIN_LENGTH: 1,
} as const

/**
 * Characters that are forbidden in name fields.
 *
 * From project-context.md: reject HTML/script tags, null bytes, control chars
 */
export const FORBIDDEN_NAME_CHARS = /[<>'"&\x00-\x1F\x7F]/

/**
 * Check if email local part contains a plus sign (alias).
 *
 * Email aliases like user+tag@domain.gov.uk are rejected because:
 * - AWS Identity Center stores the normalized email (without +alias)
 * - User would need to sign in with the non-aliased version
 * - This causes confusion when the user tries to sign in with the original email
 */
export const EMAIL_PLUS_ALIAS = /\+/
