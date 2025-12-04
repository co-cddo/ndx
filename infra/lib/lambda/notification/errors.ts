/**
 * Error classification for the NDX Notification System
 *
 * Errors are classified to determine retry behavior:
 * - RetriableError: Temporary failures that should be retried (429, 5xx, timeout)
 * - PermanentError: Validation failures that should not be retried (400, malformed)
 * - CriticalError: Security/auth failures that require immediate attention (401, 403)
 * - SecurityError: Source validation or email ownership failures
 */

/**
 * Base error class for notification system
 */
export abstract class NotificationError extends Error {
  abstract readonly isRetriable: boolean
  abstract readonly severity: "low" | "medium" | "high" | "critical"

  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = this.constructor.name
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Retriable errors - should be retried with exponential backoff
 * Examples: Rate limiting (429), server errors (5xx), network timeouts
 */
export class RetriableError extends NotificationError {
  readonly isRetriable = true
  readonly severity = "medium" as const
  readonly retryAfterMs?: number

  constructor(message: string, options?: { cause?: Error; retryAfterMs?: number }) {
    super(message, options?.cause)
    this.retryAfterMs = options?.retryAfterMs
  }
}

/**
 * Permanent errors - should NOT be retried, sent directly to DLQ
 * Examples: Validation failures, malformed events, missing required fields
 */
export class PermanentError extends NotificationError {
  readonly isRetriable = false
  readonly severity = "low" as const

  constructor(
    message: string,
    public readonly validationDetails?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, cause)
  }
}

/**
 * Critical errors - auth/credential failures requiring immediate attention
 * Examples: API key invalid (401), permission denied (403)
 */
export class CriticalError extends NotificationError {
  readonly isRetriable = false
  readonly severity = "critical" as const

  constructor(
    message: string,
    public readonly service: "notify" | "slack" | "secrets",
    cause?: Error,
  ) {
    super(message, cause)
  }
}

/**
 * Security errors - source validation or ownership check failures
 * Examples: Invalid event source, email doesn't match lease owner
 */
export class SecurityError extends NotificationError {
  readonly isRetriable = false
  readonly severity = "high" as const

  constructor(
    message: string,
    public readonly securityContext: {
      expectedSource?: string
      actualSource?: string
      eventId?: string
    },
    cause?: Error,
  ) {
    super(message, cause)
  }
}

/**
 * Classify HTTP status codes into appropriate error types
 */
export function classifyHttpError(statusCode: number, message: string, service: "notify" | "slack"): NotificationError {
  if (statusCode === 429) {
    // AC-1.9: 429 errors use 1000ms retry delay for Notify
    const retryDelay = service === "notify" ? 1000 : 60000
    return new RetriableError(`Rate limited by ${service}: ${message}`, {
      retryAfterMs: retryDelay,
    })
  }

  if (statusCode >= 500) {
    return new RetriableError(`${service} server error: ${message}`)
  }

  if (statusCode === 401 || statusCode === 403) {
    return new CriticalError(`${service} auth failure: ${message}`, service)
  }

  if (statusCode >= 400) {
    return new PermanentError(`${service} client error: ${message}`)
  }

  // Default to retriable for unknown errors
  return new RetriableError(`Unknown ${service} error: ${message}`)
}
