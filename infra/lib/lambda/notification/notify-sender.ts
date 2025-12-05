/**
 * GOV.UK Notify SDK Integration
 *
 * NotifySender is the "email mouth" of the notification system, wrapping the
 * official GOV.UK Notify SDK with proper error handling, security controls,
 * and observability.
 *
 * Architecture: "One brain, two mouths" pattern
 * @see docs/notification-architecture.md#NotifySender
 *
 * Security Controls:
 * - SECURITY: Never log full API key or webhook tokens (AC-1.21, AC-1.23)
 * - Input sanitisation with DOMPurify (AC-1.17)
 * - Email verification assertion (AC-1.14)
 * - UUID validation (AC-1.19)
 *
 * Error Classification:
 * - 400: PermanentError (no retry)
 * - 401/403: CriticalError (immediate alarm)
 * - 429: RetriableError (rate limited, 1000ms delay)
 * - 5xx: RetriableError (infrastructure issue)
 */

import { NotifyClient } from "notifications-node-client"
import { createHash } from "crypto"
import { Logger } from "@aws-lambda-powertools/logger"
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics"
import { getSecrets } from "./secrets"
import { RetriableError, PermanentError, CriticalError, SecurityError, NotificationError } from "./errors"

// =========================================================================
// Types
// =========================================================================

/**
 * Parameters for sending an email via GOV.UK Notify
 */
export interface NotifyParams {
  /** GOV.UK Notify template ID */
  templateId: string
  /** Recipient email address */
  email: string
  /** Template personalisation values */
  personalisation: Record<string, string | number>
  /** Event ID for audit trail (becomes Notify reference field) */
  eventId: string
  /** Original event userEmail for verification */
  eventUserEmail: string
}

/**
 * Response from GOV.UK Notify API
 */
export interface NotifyResponse {
  id: string
  content: {
    body: string
    subject: string
  }
  template: {
    id: string
    version: number
  }
}

/**
 * Options for send operation
 */
export interface SendOptions {
  /** Skip email verification (SHOULD NEVER BE TRUE - defensive programming) */
  skipVerification?: boolean
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  consecutiveFailures: number
  openUntil: number | null
  lastFailureTime: number | null
}

// =========================================================================
// Constants
// =========================================================================

/** UUID v4 pattern for validation (AC-1.19) */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Circuit breaker threshold (AC-1.31) */
const CIRCUIT_BREAKER_THRESHOLD = 20

/** Circuit breaker pause duration in ms (AC-1.32: 5 minutes) */
const CIRCUIT_BREAKER_PAUSE_MS = 5 * 60 * 1000

/** Rate limit retry delay in ms (AC-1.9) */
const RATE_LIMIT_RETRY_MS = 1000

// =========================================================================
// Logger and Metrics
// =========================================================================

const logger = new Logger({ serviceName: "ndx-notifications" })
const metrics = new Metrics({
  namespace: "ndx/notifications",
  serviceName: "ndx-notifications",
})

// =========================================================================
// Utility Functions
// =========================================================================

/**
 * Hash a value for logging (AC-1.13, AC-1.22, AC-1.38)
 * Used for email hashing in audit logs and token metadata
 */
export function hashForLog(value: string): string {
  if (!value) return "empty"
  const hash = createHash("sha256").update(value).digest("hex")
  return hash.substring(0, 12) // First 12 chars for brevity
}

/**
 * Log token metadata safely (AC-1.22)
 * Format: "{tokenLength}:{hash}" e.g., "72:abc123def456"
 */
export function tokenMetadata(token: string): string {
  if (!token) return "0:empty"
  return `${token.length}:${hashForLog(token)}`
}

/**
 * Validate UUID format (AC-1.19)
 * Rejects malformed UUIDs, query strings, and injection attempts
 */
export function validateUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== "string") {
    return false
  }
  // Must match exact UUID v4 pattern - no query strings or extra chars
  return UUID_PATTERN.test(uuid)
}

/**
 * Sanitize a single value by escaping HTML (AC-1.5, AC-1.17)
 * Escapes HTML special characters to prevent XSS
 * Note: GOV.UK Notify templates also escape HTML, so this is defense-in-depth
 */
export function sanitizeValue(value: string | number): string {
  if (typeof value === "number") {
    return String(value)
  }
  // Escape HTML special characters
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * URL encode a value for use in URLs (AC-1.18, AC-1.20)
 */
export function encodeForUrl(value: string): string {
  return encodeURIComponent(value)
}

/**
 * Sanitize all personalisation values (AC-1.5, AC-1.17)
 * Returns a new object with all values sanitized
 */
export function sanitizePersonalisation(values: Record<string, string | number>): Record<string, string> {
  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(values)) {
    // Sanitize the key name too (defense in depth)
    const safeKey = sanitizeValue(key)
    sanitized[safeKey] = sanitizeValue(value)
  }

  return sanitized
}

/**
 * Build a parameterised SSO URL (AC-1.20)
 */
export function buildSsoUrl(baseUrl: string, leaseUuid: string): string {
  if (!validateUUID(leaseUuid)) {
    throw new PermanentError("Invalid lease UUID format")
  }
  return `${baseUrl}?lease=${encodeForUrl(leaseUuid)}`
}

/**
 * Calculate jitter for retry backoff (AC-1.35)
 * Returns delay with random jitter to avoid thundering herd
 */
export function calculateJitteredDelay(baseDelayMs: number): number {
  // Add random jitter: 0-50% of base delay
  const jitter = Math.random() * 0.5 * baseDelayMs
  return Math.floor(baseDelayMs + jitter)
}

// =========================================================================
// NotifySender Class
// =========================================================================

/**
 * Singleton wrapper for GOV.UK Notify SDK
 *
 * Implements:
 * - Singleton pattern for client reuse (AC-1.3)
 * - API key caching (AC-1.55)
 * - Connection pooling via SDK (AC-1.52)
 * - Error classification (AC-1.7-1.11)
 * - Input sanitisation (AC-1.5, AC-1.17)
 * - Circuit breaker (AC-1.31, AC-1.32)
 */
export class NotifySender {
  private client: NotifyClient
  private static instance: NotifySender | null = null
  private circuitBreaker: CircuitBreakerState = {
    consecutiveFailures: 0,
    openUntil: null,
    lastFailureTime: null,
  }

  /**
   * Private constructor - use getInstance() instead
   * SECURITY: Never log full API key or webhook tokens (AC-1.23)
   */
  private constructor(apiKey: string) {
    // Log only token metadata for audit (AC-1.22)
    logger.info("Initializing NotifySender", {
      apiKeyMeta: tokenMetadata(apiKey),
    })

    this.client = new NotifyClient(apiKey)
  }

  /**
   * Get singleton instance (AC-1.3)
   * Lazily initializes with API key from Secrets Manager (AC-1.2, AC-1.55)
   */
  static async getInstance(): Promise<NotifySender> {
    if (!NotifySender.instance) {
      logger.debug("Creating new NotifySender instance")
      const secrets = await getSecrets()
      NotifySender.instance = new NotifySender(secrets.notifyApiKey)
    }
    return NotifySender.instance
  }

  /**
   * Reset singleton for testing
   */
  static resetInstance(): void {
    NotifySender.instance = null
  }

  /**
   * Send an email via GOV.UK Notify
   *
   * @param params - Email parameters
   * @param options - Send options
   * @returns GOV.UK Notify response
   * @throws RetriableError, PermanentError, CriticalError, SecurityError
   */
  async send(params: NotifyParams, options: SendOptions = {}): Promise<NotifyResponse> {
    const { templateId, email, personalisation, eventId, eventUserEmail } = params

    // Step 1: Verify email matches (AC-1.14) - MANDATORY
    if (!options.skipVerification) {
      this.verifyRecipient(email, eventUserEmail, eventId)
    } else {
      // Log warning if verification is bypassed (should never happen)
      logger.warn("Email verification bypassed - this is a security risk", {
        eventId,
      })
      metrics.addMetric("VerificationBypassed", MetricUnit.Count, 1)
    }

    // Step 2: Check circuit breaker (AC-1.31)
    if (this.isCircuitOpen()) {
      logger.warn("Circuit breaker is open - rejecting send", {
        eventId,
        openUntil: this.circuitBreaker.openUntil,
      })
      metrics.addMetric("CircuitBreakerRejection", MetricUnit.Count, 1)
      throw new RetriableError("Circuit breaker open - Notify service degraded", {
        retryAfterMs: this.getRemainingCircuitOpenTime(),
      })
    }

    // Step 3: Sanitize personalisation values (AC-1.5, AC-1.17)
    const sanitized = sanitizePersonalisation(personalisation)

    // Step 4: Build reference field with verification source (AC-1.6, AC-1.16)
    const reference = `ndx:${eventId}`

    // Step 5: Log email send attempt (AC-1.38)
    logger.info("Sending email via GOV.UK Notify", {
      eventId,
      templateId,
      recipientHash: hashForLog(email),
      eventUserEmailHash: hashForLog(eventUserEmail),
      reference,
    })

    try {
      // Step 6: Send via SDK (AC-1.4)
      const response = await this.client.sendEmail(templateId, email, {
        personalisation: sanitized,
        reference,
      })

      // Reset circuit breaker on success
      this.recordSuccess()

      // Step 7: Log success with Notify response ID
      logger.info("Email sent successfully", {
        eventId,
        notifyId: response.data?.id,
        templateVersion: response.data?.template?.version,
      })

      // Emit success metric
      metrics.addMetric("EmailSent", MetricUnit.Count, 1)

      return {
        id: response.data?.id || "",
        content: {
          body: response.data?.content?.body || "",
          subject: response.data?.content?.subject || "",
        },
        template: {
          id: response.data?.template?.id || "",
          version: response.data?.template?.version || 0,
        },
      }
    } catch (error) {
      // Classify and handle error
      const classifiedError = this.classifyError(error, eventId)

      // Record failure for circuit breaker
      if (classifiedError instanceof RetriableError && this.isServerError(error)) {
        this.recordFailure()
      }

      throw classifiedError
    }
  }

  /**
   * Verify recipient email matches event email (AC-1.14)
   * ASSERT: event.userEmail === params.email
   */
  private verifyRecipient(email: string, eventUserEmail: string, eventId: string): void {
    // Log verification attempt with hashes for audit (AC-1.13)
    const emailHash = hashForLog(email)
    const eventEmailHash = hashForLog(eventUserEmail)

    metrics.addMetric("RecipientVerification", MetricUnit.Count, 1)
    metrics.addDimension("emailMatch", email === eventUserEmail ? "match" : "mismatch")

    logger.debug("Recipient verification", {
      eventId,
      emailHash,
      eventUserEmailHash: eventEmailHash,
      match: email === eventUserEmail,
    })

    // ASSERT: emails must match (AC-1.14)
    if (email !== eventUserEmail) {
      logger.error("Email verification failed - recipient mismatch", {
        eventId,
        emailHash,
        eventUserEmailHash: eventEmailHash,
      })
      metrics.addMetric("RecipientMismatch", MetricUnit.Count, 1)

      throw new SecurityError("Recipient email does not match event userEmail", {
        eventId,
        // SECURITY: Never log actual emails in error context
      })
    }
  }

  /**
   * Classify SDK errors into appropriate error types (AC-1.7-1.11)
   */
  private classifyError(error: unknown, eventId: string): NotificationError {
    // Extract status code from Notify SDK error
    const statusCode = this.extractStatusCode(error)
    const message = this.extractErrorMessage(error)

    logger.error("Notify API error", {
      eventId,
      statusCode,
      errorMessage: message,
    })

    // AC-1.7: 400 errors throw PermanentError (no retry)
    if (statusCode === 400) {
      metrics.addMetric("NotifyClientError", MetricUnit.Count, 1)
      return new PermanentError(`Notify validation error: ${message}`)
    }

    // AC-1.8: 401/403 errors throw CriticalError (immediate alarm)
    if (statusCode === 401 || statusCode === 403) {
      metrics.addMetric("NotifyAuthError", MetricUnit.Count, 1)
      logger.error("CRITICAL: Notify authentication failure - check API key", {
        eventId,
        statusCode,
      })
      return new CriticalError(`Notify auth failure: ${message}`, "notify")
    }

    // AC-1.9: 429 errors throw RetriableError with 1000ms retryAfter
    if (statusCode === 429) {
      metrics.addMetric("NotifyRateLimited", MetricUnit.Count, 1)
      return new RetriableError("Notify rate limited", {
        retryAfterMs: RATE_LIMIT_RETRY_MS,
      })
    }

    // AC-1.10: 5xx errors throw RetriableError (infrastructure issue)
    if (statusCode >= 500) {
      metrics.addMetric("NotifyServerError", MetricUnit.Count, 1)
      return new RetriableError(`Notify server error: ${message}`)
    }

    // AC-1.11: Unknown errors default to RetriableError
    metrics.addMetric("NotifyUnknownError", MetricUnit.Count, 1)
    return new RetriableError(`Unknown Notify error: ${message}`)
  }

  /**
   * Extract HTTP status code from Notify SDK error
   */
  private extractStatusCode(error: unknown): number {
    if (typeof error === "object" && error !== null) {
      const e = error as Record<string, unknown>
      // Notify SDK stores status in response.status or error.statusCode
      if (typeof e.statusCode === "number") return e.statusCode
      if (typeof e.status === "number") return e.status
      if (typeof e.response === "object" && e.response !== null) {
        const resp = e.response as Record<string, unknown>
        if (typeof resp.status === "number") return resp.status
        if (typeof resp.statusCode === "number") return resp.statusCode
      }
    }
    return 0 // Unknown
  }

  /**
   * Extract error message from Notify SDK error
   * GOV.UK Notify returns detailed error info in response.data.errors
   */
  private extractErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null) {
      const e = error as Record<string, unknown>

      // Try to get detailed error from Notify API response
      if (typeof e.response === "object" && e.response !== null) {
        const resp = e.response as Record<string, unknown>
        if (typeof resp.data === "object" && resp.data !== null) {
          const data = resp.data as Record<string, unknown>
          // Notify returns errors array with error details
          if (Array.isArray(data.errors) && data.errors.length > 0) {
            const errors = data.errors
              .map((err: Record<string, unknown>) => `${err.error || "unknown"}: ${err.message || "no message"}`)
              .join("; ")
            return errors
          }
          if (typeof data.message === "string") return data.message
          if (typeof data.error === "string") return data.error
        }
      }

      if (typeof e.message === "string") return e.message
      if (typeof e.error === "string") return e.error
    }
    if (error instanceof Error) {
      return error.message
    }
    return "Unknown error"
  }

  /**
   * Check if error is a server error (5xx)
   */
  private isServerError(error: unknown): boolean {
    const statusCode = this.extractStatusCode(error)
    return statusCode >= 500 && statusCode < 600
  }

  // =========================================================================
  // Circuit Breaker Methods (AC-1.31, AC-1.32, AC-1.35)
  // =========================================================================

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(): boolean {
    if (this.circuitBreaker.openUntil === null) {
      return false
    }
    if (Date.now() >= this.circuitBreaker.openUntil) {
      // Circuit breaker timeout expired - close it
      this.closeCircuit()
      return false
    }
    return true
  }

  /**
   * Get remaining time circuit is open
   */
  private getRemainingCircuitOpenTime(): number {
    if (this.circuitBreaker.openUntil === null) {
      return 0
    }
    return Math.max(0, this.circuitBreaker.openUntil - Date.now())
  }

  /**
   * Record a successful send - resets failure count
   */
  private recordSuccess(): void {
    if (this.circuitBreaker.consecutiveFailures > 0) {
      logger.info("Circuit breaker: success after failures", {
        previousFailures: this.circuitBreaker.consecutiveFailures,
      })
    }
    this.circuitBreaker.consecutiveFailures = 0
    this.circuitBreaker.lastFailureTime = null
  }

  /**
   * Record a failure - may trigger circuit breaker
   */
  private recordFailure(): void {
    this.circuitBreaker.consecutiveFailures++
    this.circuitBreaker.lastFailureTime = Date.now()

    logger.warn("Circuit breaker: failure recorded", {
      consecutiveFailures: this.circuitBreaker.consecutiveFailures,
      threshold: CIRCUIT_BREAKER_THRESHOLD,
    })

    // AC-1.31: Open circuit after threshold
    if (this.circuitBreaker.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.openCircuit()
    }
  }

  /**
   * Open the circuit breaker (AC-1.32)
   */
  private openCircuit(): void {
    // Apply jitter to pause duration (AC-1.35)
    const pauseWithJitter = calculateJitteredDelay(CIRCUIT_BREAKER_PAUSE_MS)
    this.circuitBreaker.openUntil = Date.now() + pauseWithJitter

    logger.error("Circuit breaker OPENED - Notify service degraded", {
      consecutiveFailures: this.circuitBreaker.consecutiveFailures,
      pauseMs: pauseWithJitter,
      openUntil: new Date(this.circuitBreaker.openUntil).toISOString(),
    })

    // Emit metric for monitoring
    metrics.addMetric("CircuitBreakerTriggered", MetricUnit.Count, 1)

    // AC-1.32: Escalation to ops is handled by CloudWatch alarm on this metric
  }

  /**
   * Close the circuit breaker
   */
  private closeCircuit(): void {
    logger.info("Circuit breaker CLOSED - resuming normal operation", {
      previousFailures: this.circuitBreaker.consecutiveFailures,
    })
    this.circuitBreaker.consecutiveFailures = 0
    this.circuitBreaker.openUntil = null
    this.circuitBreaker.lastFailureTime = null
  }

  /**
   * Get circuit breaker state for testing
   */
  getCircuitBreakerState(): Readonly<CircuitBreakerState> {
    return { ...this.circuitBreaker }
  }

  /**
   * Reset circuit breaker for testing
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      consecutiveFailures: 0,
      openUntil: null,
      lastFailureTime: null,
    }
  }
}
