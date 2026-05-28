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
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"
import { SignupErrorCode, ERROR_MESSAGES, FORBIDDEN_NAME_CHARS, type SignupRequest } from "@ndx/signup-types"
import { getDomains } from "./domain-service"
import { checkUserExists, createUser, createUserOnly, getExistingUserNames } from "./identity-store-service"
import { normalizeEmail, isEmailDomainAllowed } from "./services"

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

// SDK clients for notification (module-level singletons per Lambda best practice)
const lambdaClient = new LambdaClient({})
const snsClient = new SNSClient({})

/**
 * Slack mrkdwn metacharacters that must be stripped from any user-controlled
 * string before embedding in a Slack alert payload. Includes `<` and `>`
 * because the `<url|label>` link syntax would otherwise let a submitter
 * inject arbitrary link targets into `#ndx-sandbox-alerts`.
 */
const SLACK_MRKDWN_METACHARS = /[*_~`<>]/g

/**
 * Strip Slack mrkdwn metacharacters from a string so it's safe to embed in
 * an alert payload. Removes `*`, `_`, `~`, backtick, `<`, `>`.
 */
function stripSlackMrkdwn(input: string): string {
  return input.replace(SLACK_MRKDWN_METACHARS, "")
}

/**
 * Timing-oracle floor for the signup handler. All POST /signup-api/signup
 * responses are held until at least this many milliseconds have elapsed
 * since handler entry. Chosen to comfortably exceed the recognised
 * branch's `CreateUser` + `CreateGroupMembership` worst case in observed
 * prod telemetry; the existing 50–150ms random jitter is applied on top.
 */
const TIMING_FLOOR_MS = 400

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
 * Hold the response until the timing floor has elapsed since handler
 * entry, then add 50-150ms of random jitter ON TOP of the floor. Combined,
 * these close both the success-vs-409 oracle and the recognised-vs-waitlist
 * branch-latency oracle.
 *
 * Order matters: jitter is applied AFTER the floor (per frozen spec rule
 * "jitter adds 50-150ms on top") so total wait = max(handler_elapsed,
 * TIMING_FLOOR_MS) + jitter, not max(handler_elapsed + jitter,
 * TIMING_FLOOR_MS).
 */
async function awaitTimingFloor(startTime: number): Promise<void> {
  const remaining = TIMING_FLOOR_MS - (Date.now() - startTime)
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }
  const jitter = 50 + Math.random() * 100
  await new Promise((resolve) => setTimeout(resolve, jitter))
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
 * Strip the request body to **only** the known SignupRequest fields. Any
 * other field (including a legacy `domain`, `__proto__`, or arbitrary
 * extras) is silently dropped — never logged, never echoed in Slack, never
 * persisted. Mirrors Zod `.strip()` semantics without pulling Zod into the
 * signup Lambda's runtime path.
 *
 * @returns The whitelisted request shape, or `null` if a required field is
 *   missing or has the wrong type
 */
function pickSignupRequest(raw: unknown): SignupRequest | null {
  if (typeof raw !== "object" || raw === null) {
    return null
  }
  const obj = raw as Record<string, unknown>
  const firstName = obj.firstName
  const lastName = obj.lastName
  const email = obj.email
  if (typeof firstName !== "string" || typeof lastName !== "string" || typeof email !== "string") {
    return null
  }
  return { firstName, lastName, email }
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
  const startTime = Date.now()
  // Timing floor + jitter applied at exit (see `awaitTimingFloor`).

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
    await awaitTimingFloor(startTime)
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
    await awaitTimingFloor(startTime)
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
    await awaitTimingFloor(startTime)
    return errorResponse(403, SignupErrorCode.CSRF_INVALID, ERROR_MESSAGES[SignupErrorCode.CSRF_INVALID], correlationId)
  }

  // Parse request body with prototype pollution defense
  let rawParsed: unknown
  try {
    rawParsed = parseBodySafe(event.body)
  } catch {
    await awaitTimingFloor(startTime)
    return errorResponse(
      400,
      SignupErrorCode.INVALID_CONTENT_TYPE,
      ERROR_MESSAGES[SignupErrorCode.INVALID_CONTENT_TYPE],
      correlationId,
    )
  }

  // Whitelist known fields only — silently drops `domain`, `__proto__`,
  // and any other extras (no log, no Slack, no Notify trace).
  const request = pickSignupRequest(rawParsed)
  if (!request) {
    await awaitTimingFloor(startTime)
    return errorResponse(400, SignupErrorCode.INVALID_EMAIL, "Missing required fields", correlationId)
  }

  // Validate name field lengths and content (project-context.md:234)
  if (request.firstName.length > MAX_NAME_LENGTH || request.lastName.length > MAX_NAME_LENGTH) {
    await awaitTimingFloor(startTime)
    return errorResponse(400, SignupErrorCode.INVALID_EMAIL, "Name field too long", correlationId)
  }

  if (FORBIDDEN_NAME_CHARS.test(request.firstName) || FORBIDDEN_NAME_CHARS.test(request.lastName)) {
    await awaitTimingFloor(startTime)
    return errorResponse(400, SignupErrorCode.INVALID_EMAIL, "Invalid characters in name", correlationId)
  }

  // Validate email length per RFC 5321 (project-context.md:233)
  if (request.email.length > MAX_EMAIL_LENGTH) {
    await awaitTimingFloor(startTime)
    return errorResponse(
      400,
      SignupErrorCode.INVALID_EMAIL,
      ERROR_MESSAGES[SignupErrorCode.INVALID_EMAIL],
      correlationId,
    )
  }

  // Reject emails with multiple @ signs (e.g. user pasted full email into local-part field)
  if ((request.email.match(/@/g) || []).length > 1) {
    console.log(
      JSON.stringify({
        level: "WARN",
        message: "Email contains multiple @ characters",
        correlationId,
      }),
    )
    await awaitTimingFloor(startTime)
    return errorResponse(
      400,
      SignupErrorCode.INVALID_EMAIL,
      "Email address contains multiple '@' characters",
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
    await awaitTimingFloor(startTime)
    return errorResponse(
      400,
      SignupErrorCode.INVALID_EMAIL,
      "Email address cannot contain a '+' character",
      correlationId,
    )
  }

  // Normalize email (FR16, NFR6). Trims leading/trailing whitespace, lowers
  // case, and rejects any non-ASCII codepoint — IDN policy is "reject" per
  // the frozen spec.
  let normalizedEmail: string
  try {
    normalizedEmail = normalizeEmail(request.email.trim())
  } catch {
    await awaitTimingFloor(startTime)
    return errorResponse(
      400,
      SignupErrorCode.INVALID_EMAIL,
      ERROR_MESSAGES[SignupErrorCode.INVALID_EMAIL],
      correlationId,
    )
  }

  // Derive the domain server-side — never read it from the request body.
  const normalizedDomain = normalizedEmail.split("@")[1] ?? ""
  if (!normalizedDomain) {
    await awaitTimingFloor(startTime)
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
      domain: normalizedDomain,
      correlationId,
    }),
  )

  // Compute branch (recognised vs waitlist) from the allowlist. Empty
  // allowlist fails closed: we'd rather 5xx than silently route everyone to
  // the waitlist branch (could mask a misconfigured Secrets Manager pull).
  let isWaitlist: boolean
  try {
    const domains = await getDomains(correlationId)
    if (!domains || domains.length === 0) {
      console.log(
        JSON.stringify({
          level: "ERROR",
          message: "Domain allowlist resolved to empty array — failing closed",
          domain: normalizedDomain,
          correlationId,
        }),
      )
      await awaitTimingFloor(startTime)
      return errorResponse(
        500,
        SignupErrorCode.SERVER_ERROR,
        ERROR_MESSAGES[SignupErrorCode.SERVER_ERROR],
        correlationId,
      )
    }
    isWaitlist = !isEmailDomainAllowed(normalizedEmail, domains)
  } catch (error) {
    console.log(
      JSON.stringify({
        level: "ERROR",
        message: "Failed to validate domain",
        error: error instanceof Error ? error.message : "Unknown error",
        domain: normalizedDomain,
        correlationId,
      }),
    )
    await awaitTimingFloor(startTime)
    return errorResponse(503, "SERVICE_UNAVAILABLE", "Service temporarily unavailable", correlationId)
  }

  // Check if user already exists (both branches)
  try {
    const userExists = await checkUserExists(normalizedEmail, correlationId)
    if (userExists) {
      console.log(
        JSON.stringify({
          level: "INFO",
          message: "User already exists",
          domain: normalizedDomain,
          correlationId,
        }),
      )

      // Squatting detection: if the supplied first/last name differs from
      // what's stored in IDC, warn — same email, different person trying to
      // register. No behaviour change to the client response. Comparison is
      // trim+case-insensitive so legacy IDC records with whitespace/casing
      // drift don't flag every retry as squatting.
      try {
        const existing = await getExistingUserNames(normalizedEmail, correlationId)
        if (existing) {
          const normalizeName = (s: string): string => s.trim().toLowerCase()
          const givenDiffers =
            existing.givenName !== undefined &&
            normalizeName(existing.givenName) !== normalizeName(request.firstName)
          const familyDiffers =
            existing.familyName !== undefined &&
            normalizeName(existing.familyName) !== normalizeName(request.lastName)
          if (givenDiffers || familyDiffers) {
            console.log(
              JSON.stringify({
                level: "WARN",
                message: "USER_EXISTS with name mismatch — possible signup squatting",
                domain: normalizedDomain,
                correlationId,
              }),
            )
          }
        }
      } catch (squattingError) {
        // Detection is best-effort and must never block the 409 response —
        // but log so misconfigured IDC permissions don't silently disable
        // the detection signal.
        console.log(
          JSON.stringify({
            level: "WARN",
            message: "Squatting detection check failed",
            error: squattingError instanceof Error ? squattingError.message : "Unknown error",
            domain: normalizedDomain,
            correlationId,
          }),
        )
      }

      await awaitTimingFloor(startTime)
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
        domain: normalizedDomain,
        correlationId,
      }),
    )
    await awaitTimingFloor(startTime)
    return errorResponse(500, SignupErrorCode.SERVER_ERROR, ERROR_MESSAGES[SignupErrorCode.SERVER_ERROR], correlationId)
  }

  // Create user — recognised branch adds to NDX group, waitlist branch does not.
  try {
    const normalizedRequest: SignupRequest = { ...request, email: normalizedEmail }
    const userId = isWaitlist
      ? await createUserOnly(normalizedRequest, correlationId)
      : await createUser(normalizedRequest, correlationId)

    console.log(
      JSON.stringify({
        level: "INFO",
        message: "User created successfully",
        domain: normalizedDomain,
        signupBranch: isWaitlist ? "waitlist" : "recognised",
        signupDomain: normalizedDomain,
        correlationId,
      }),
    )

    // Fire-and-forget: Send Notify email + Slack alert (both branches).
    // Notification failure must never block account creation (AC-3).

    const eventDetailType = isWaitlist ? "WaitlistAdded" : "UserCreated"
    const slackTitle = isWaitlist ? "New NDX Waitlist Signup" : "New NDX User Created"

    // 1. Async Lambda invoke for welcome / waitlist email via notification Lambda
    try {
      if (process.env.NOTIFICATION_LAMBDA_ARN) {
        await lambdaClient.send(
          new InvokeCommand({
            FunctionName: process.env.NOTIFICATION_LAMBDA_ARN,
            InvocationType: "Event",
            Payload: JSON.stringify({
              "detail-type": eventDetailType,
              source: "ndx-signup",
              id: crypto.randomUUID(),
              time: new Date().toISOString(),
              account: "568672915267",
              region: "us-west-2",
              version: "0",
              resources: [],
              detail: {
                userEmail: normalizedEmail,
                firstName: request.firstName,
                lastName: request.lastName,
                userId,
              },
            }),
          }),
        )
      }
    } catch (notifyError) {
      console.log(
        JSON.stringify({
          level: "WARN",
          message: "Notification email invoke failed (non-blocking)",
          error: notifyError instanceof Error ? notifyError.message : "Unknown error",
          correlationId,
        }),
      )
    }

    // 2. SNS publish for Slack alert via AWS Chatbot. Strip Slack mrkdwn
    //    metacharacters (`* _ ~ \` < >`) from all user-controlled fields,
    //    including `email`, so a submitter can't inject link syntax into
    //    `#ndx-sandbox-alerts`.
    try {
      if (process.env.EVENTS_TOPIC_ARN) {
        const safeFirstName = stripSlackMrkdwn(request.firstName)
        const safeLastName = stripSlackMrkdwn(request.lastName)
        const safeEmail = stripSlackMrkdwn(normalizedEmail)
        await snsClient.send(
          new PublishCommand({
            TopicArn: process.env.EVENTS_TOPIC_ARN,
            Message: JSON.stringify({
              version: "1.0",
              source: "custom",
              content: {
                textType: "client-markdown",
                title: slackTitle,
                description: `*User:* ${safeFirstName} ${safeLastName}\n*Email:* ${safeEmail}`,
              },
            }),
          }),
        )
      }
    } catch (slackError) {
      console.log(
        JSON.stringify({
          level: "WARN",
          message: "Slack notification failed (non-blocking)",
          error: slackError instanceof Error ? slackError.message : "Unknown error",
          correlationId,
        }),
      )
    }

    await awaitTimingFloor(startTime)
    return successResponse({ success: true, waitlist: isWaitlist }, correlationId)
  } catch (error) {
    // Handle race condition: user created between check and create
    if (error instanceof ConflictException) {
      console.log(
        JSON.stringify({
          level: "INFO",
          message: "User already exists (race condition)",
          domain: normalizedDomain,
          correlationId,
        }),
      )
      await awaitTimingFloor(startTime)
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
        domain: normalizedDomain,
        correlationId,
      }),
    )
    await awaitTimingFloor(startTime)
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

/**
 * Test-only exports for unit tests of the Slack-mrkdwn-strip and timing
 * helpers. Internal — do not import from production paths.
 * @internal
 */
export const _internal = {
  stripSlackMrkdwn,
  TIMING_FLOOR_MS,
}
