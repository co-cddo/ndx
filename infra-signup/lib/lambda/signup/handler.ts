/**
 * NDX Signup Lambda Handler
 *
 * Entry point for the signup Lambda function.
 * Handles /signup-api/* requests from CloudFront.
 *
 * Story 1.1: Placeholder handler
 * Story 1.2: Health endpoint for infrastructure verification
 * Story 1.3: GET /signup-api/domains endpoint
 * Story 1.4: POST /signup-api/signup endpoint
 *
 * @module infra-signup/lib/lambda/signup/handler
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { ConflictException } from "@aws-sdk/client-identitystore"
import { SignupErrorCode, ERROR_MESSAGES, FORBIDDEN_NAME_CHARS, type SignupRequest } from "@ndx/signup-types"
import { getDomains } from "./domain-service"
import { checkUserExists, createUser } from "./identity-store-service"
import { normalizeEmail, isEmailDomainAllowed } from "./services"

/**
 * Temporary flag to disable signups.
 * Set SIGNUPS_DISABLED=true in Lambda environment to return 503 for signup endpoints.
 * Remove this when re-enabling signups.
 */
const SIGNUPS_DISABLED = process.env.SIGNUPS_DISABLED === "true"

/**
 * Security headers for all Lambda responses (from project-context.md)
 */
const securityHeaders = {
  "Content-Security-Policy": "default-src 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}

/**
 * Lambda handler for signup API endpoints.
 *
 * Routes:
 * - GET /signup-api/health - Health check for infrastructure verification (Story 1.2)
 * - GET /signup-api/domains - Fetch allowed domain list (Story 1.3)
 * - POST /signup-api/signup - Create user account (Story 1.4)
 *
 * @param event - API Gateway proxy event
 * @returns API Gateway proxy result
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const correlationId = event.requestContext?.requestId
  // Lambda Function URL uses different event structure than API Gateway
  // API Gateway: event.path, event.httpMethod
  // Function URL: event.rawPath, event.requestContext.http.method
  const path = event.path ?? (event as unknown as { rawPath?: string }).rawPath
  const method =
    event.httpMethod ??
    (event as unknown as { requestContext?: { http?: { method?: string } } }).requestContext?.http?.method

  // Structured logging (project-context.md requirement)
  console.log(
    JSON.stringify({
      level: "INFO",
      message: "Request received",
      path,
      method,
      correlationId,
    }),
  )

  // Route handling
  if (method === "GET" && path === "/signup-api/health") {
    return successResponse({ status: "ok" }, correlationId)
  }

  // Temporary: disable all signup endpoints except health check
  if (SIGNUPS_DISABLED) {
    console.log(
      JSON.stringify({
        level: "INFO",
        message: "Signups temporarily disabled",
        path,
        correlationId,
      }),
    )
    return errorResponse(503, "SERVICE_UNAVAILABLE", "Signups are temporarily disabled", correlationId)
  }

  if (method === "GET" && path === "/signup-api/domains") {
    // Story 1.3: Domain list endpoint
    try {
      const domains = await getDomains(correlationId ?? "unknown")
      return successResponse({ domains }, correlationId)
    } catch (error) {
      console.log(
        JSON.stringify({
          level: "ERROR",
          message: "Failed to fetch domains",
          error: error instanceof Error ? error.message : "Unknown error",
          correlationId,
        }),
      )
      return errorResponse(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable", correlationId)
    }
  }

  if (method === "POST" && path === "/signup-api/signup") {
    // Story 1.4: Signup endpoint
    return handleSignup(event, correlationId ?? "unknown")
  }

  // Unknown endpoint - log for debugging potential misrouted requests
  console.log(
    JSON.stringify({
      level: "WARN",
      message: "Unknown endpoint requested",
      path,
      method,
      correlationId,
    }),
  )
  return errorResponse(404, "NOT_FOUND", "Endpoint not found", correlationId)
}

/**
 * Maximum request body size in bytes (10KB per project-context.md)
 */
const MAX_BODY_SIZE = 10 * 1024

/**
 * Maximum name field length (per project-context.md)
 */
const MAX_NAME_LENGTH = 100

/**
 * Maximum email length per RFC 5321
 */
const MAX_EMAIL_LENGTH = 254

// Name validation uses FORBIDDEN_NAME_CHARS from @ndx/signup-types
// to ensure frontend and backend validation are consistent

/**
 * Add random delay for timing attack mitigation (50-150ms per project-context.md)
 */
async function addTimingDelay(): Promise<void> {
  const delay = 50 + Math.random() * 100
  await new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Safely parse JSON body with prototype pollution defense (project-context.md:316-331)
 */
function parseBodySafe(body: string | null): unknown {
  if (!body) {
    throw new Error("Body required")
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new Error("Invalid JSON")
  }

  // Prototype pollution defense - check if object has own properties that could pollute prototype
  if (typeof parsed === "object" && parsed !== null) {
    if (Object.prototype.hasOwnProperty.call(parsed, "__proto__")) {
      throw new Error("Invalid JSON")
    }
  }

  return parsed
}

/**
 * Handle POST /signup-api/signup requests.
 *
 * Validates request, normalizes email, checks domain allowlist,
 * checks for existing user, and creates account in IAM Identity Center.
 *
 * @param event - API Gateway proxy event
 * @param correlationId - Request correlation ID
 * @returns API Gateway proxy result
 */
async function handleSignup(event: APIGatewayProxyEvent, correlationId: string): Promise<APIGatewayProxyResult> {
  // Add timing delay for security (prevents timing attacks)
  await addTimingDelay()

  // Validate request body size (10KB max per project-context.md:269)
  if (event.body && event.body.length > MAX_BODY_SIZE) {
    console.log(
      JSON.stringify({
        level: "WARN",
        message: "Request body too large",
        size: event.body.length,
        correlationId,
      }),
    )
    return errorResponse(400, "REQUEST_TOO_LARGE", "Request body too large", correlationId)
  }

  // Validate Content-Type header (FR19)
  const contentType = event.headers["content-type"]?.toLowerCase() ?? event.headers["Content-Type"]?.toLowerCase()
  if (!contentType?.includes("application/json")) {
    console.log(
      JSON.stringify({
        level: "WARN",
        message: "Invalid Content-Type",
        contentType,
        correlationId,
      }),
    )
    return errorResponse(
      400,
      SignupErrorCode.INVALID_CONTENT_TYPE,
      ERROR_MESSAGES[SignupErrorCode.INVALID_CONTENT_TYPE],
      correlationId,
    )
  }

  // Validate CSRF header (ADR-045, FR17)
  const csrfHeader = event.headers["x-ndx-request"]?.toLowerCase() ?? event.headers["X-NDX-Request"]?.toLowerCase()
  if (csrfHeader !== "signup-form") {
    console.log(
      JSON.stringify({
        level: "WARN",
        message: "Invalid or missing CSRF header",
        correlationId,
      }),
    )
    return errorResponse(403, SignupErrorCode.CSRF_INVALID, ERROR_MESSAGES[SignupErrorCode.CSRF_INVALID], correlationId)
  }

  // Parse request body with prototype pollution defense
  let request: SignupRequest
  try {
    request = parseBodySafe(event.body) as SignupRequest
  } catch {
    return errorResponse(
      400,
      SignupErrorCode.INVALID_CONTENT_TYPE,
      ERROR_MESSAGES[SignupErrorCode.INVALID_CONTENT_TYPE],
      correlationId,
    )
  }

  // Validate required fields
  if (!request.firstName || !request.lastName || !request.email || !request.domain) {
    return errorResponse(400, SignupErrorCode.INVALID_EMAIL, "Missing required fields", correlationId)
  }

  // Validate name field lengths and content (project-context.md:234)
  if (
    typeof request.firstName !== "string" ||
    typeof request.lastName !== "string" ||
    request.firstName.length > MAX_NAME_LENGTH ||
    request.lastName.length > MAX_NAME_LENGTH
  ) {
    return errorResponse(400, SignupErrorCode.INVALID_EMAIL, "Name field too long", correlationId)
  }

  if (FORBIDDEN_NAME_CHARS.test(request.firstName) || FORBIDDEN_NAME_CHARS.test(request.lastName)) {
    return errorResponse(400, SignupErrorCode.INVALID_EMAIL, "Invalid characters in name", correlationId)
  }

  // Validate email length per RFC 5321 (project-context.md:233)
  if (typeof request.email !== "string" || request.email.length > MAX_EMAIL_LENGTH) {
    return errorResponse(
      400,
      SignupErrorCode.INVALID_EMAIL,
      ERROR_MESSAGES[SignupErrorCode.INVALID_EMAIL],
      correlationId,
    )
  }

  // Reject email aliases with + character
  // User would need to sign in with non-aliased email, causing confusion
  if (request.email.includes("+")) {
    console.log(
      JSON.stringify({
        level: "WARN",
        message: "Email contains + alias character",
        correlationId,
      }),
    )
    return errorResponse(
      400,
      SignupErrorCode.INVALID_EMAIL,
      "Email address cannot contain a '+' character",
      correlationId,
    )
  }

  // Normalize email (FR16, NFR6)
  let normalizedEmail: string
  try {
    normalizedEmail = normalizeEmail(request.email)
  } catch {
    return errorResponse(
      400,
      SignupErrorCode.INVALID_EMAIL,
      ERROR_MESSAGES[SignupErrorCode.INVALID_EMAIL],
      correlationId,
    )
  }

  // Log domain only, not PII (NFR22)
  console.log(
    JSON.stringify({
      level: "INFO",
      message: "Processing signup request",
      domain: request.domain,
      correlationId,
    }),
  )

  // Validate domain against allowlist (FR13)
  try {
    const domains = await getDomains(correlationId)
    if (!isEmailDomainAllowed(normalizedEmail, domains)) {
      console.log(
        JSON.stringify({
          level: "WARN",
          message: "Domain not allowed",
          domain: request.domain,
          correlationId,
        }),
      )
      return errorResponse(
        403,
        SignupErrorCode.DOMAIN_NOT_ALLOWED,
        ERROR_MESSAGES[SignupErrorCode.DOMAIN_NOT_ALLOWED],
        correlationId,
      )
    }
  } catch (error) {
    console.log(
      JSON.stringify({
        level: "ERROR",
        message: "Failed to validate domain",
        error: error instanceof Error ? error.message : "Unknown error",
        domain: request.domain,
        correlationId,
      }),
    )
    return errorResponse(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable", correlationId)
  }

  // Check if user already exists
  try {
    const userExists = await checkUserExists(normalizedEmail, correlationId)
    if (userExists) {
      console.log(
        JSON.stringify({
          level: "INFO",
          message: "User already exists",
          domain: request.domain,
          correlationId,
        }),
      )
      return errorResponse(
        409,
        SignupErrorCode.USER_EXISTS,
        ERROR_MESSAGES[SignupErrorCode.USER_EXISTS],
        correlationId,
        { redirectUrl: "/login" },
      )
    }
  } catch (error) {
    console.log(
      JSON.stringify({
        level: "ERROR",
        message: "Failed to check user existence",
        error: error instanceof Error ? error.message : "Unknown error",
        domain: request.domain,
        correlationId,
      }),
    )
    return errorResponse(500, SignupErrorCode.SERVER_ERROR, ERROR_MESSAGES[SignupErrorCode.SERVER_ERROR], correlationId)
  }

  // Create user in IAM Identity Center
  try {
    await createUser(
      {
        ...request,
        email: normalizedEmail,
      },
      correlationId,
    )

    console.log(
      JSON.stringify({
        level: "INFO",
        message: "User created successfully",
        domain: request.domain,
        correlationId,
      }),
    )

    return successResponse({ success: true }, correlationId)
  } catch (error) {
    // Handle race condition: user created between check and create
    if (error instanceof ConflictException) {
      console.log(
        JSON.stringify({
          level: "INFO",
          message: "User already exists (race condition)",
          domain: request.domain,
          correlationId,
        }),
      )
      return errorResponse(
        409,
        SignupErrorCode.USER_EXISTS,
        ERROR_MESSAGES[SignupErrorCode.USER_EXISTS],
        correlationId,
        { redirectUrl: "/login" },
      )
    }

    console.log(
      JSON.stringify({
        level: "ERROR",
        message: "Failed to create user",
        error: error instanceof Error ? error.message : "Unknown error",
        domain: request.domain,
        correlationId,
      }),
    )
    return errorResponse(500, SignupErrorCode.SERVER_ERROR, ERROR_MESSAGES[SignupErrorCode.SERVER_ERROR], correlationId)
  }
}

/**
 * Helper to create a success response.
 *
 * @param body - Response body object
 * @param correlationId - Optional correlation ID for X-Request-ID header
 * @returns API Gateway proxy result
 */
export function successResponse(body: Record<string, unknown>, correlationId?: string): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      ...securityHeaders,
      "Content-Type": "application/json",
      ...(correlationId && { "X-Request-ID": correlationId }),
    },
    body: JSON.stringify(body),
  }
}

/**
 * Helper to create an error response.
 *
 * @param statusCode - HTTP status code
 * @param error - Error code
 * @param message - User-friendly error message
 * @param correlationId - Optional correlation ID for X-Request-ID header
 * @param extra - Optional extra data to include in response body (e.g., redirectUrl)
 * @returns API Gateway proxy result
 */
export function errorResponse(
  statusCode: number,
  error: string,
  message: string,
  correlationId?: string,
  extra?: Record<string, unknown>,
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      ...securityHeaders,
      "Content-Type": "application/json",
      ...(correlationId && { "X-Request-ID": correlationId }),
    },
    body: JSON.stringify({ error, message, ...extra }),
  }
}
