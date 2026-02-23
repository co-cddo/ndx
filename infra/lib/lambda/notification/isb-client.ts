/**
 * ISB API Client Module for Notification System
 *
 * This module provides HTTP client functionality for fetching data from the
 * ISB API Gateway with HS256 JWT authentication.
 *
 * Story: 5.1 - Replace DynamoDB Reads with ISB API
 * ACs: 1, 4, 5, 6
 *
 * Security Controls:
 * - AC-5, AC-6: Graceful degradation on API failures
 * - NFR4: 5-second timeout for API calls
 * - HS256 JWT signed with shared secret from Secrets Manager
 * - Structured JSON logging with correlation ID
 * - No PII in error logs
 *
 * @see _bmad-output/implementation-artifacts/5-1-replace-dynamodb-reads-with-isb-api.md
 */

import { Logger } from "@aws-lambda-powertools/logger"
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics"
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import { createHmac } from "node:crypto"

// =============================================================================
// Logger, Metrics and Secrets Manager Client
// =============================================================================

const logger = new Logger({ serviceName: "ndx-notifications" })
const metrics = new Metrics({
  namespace: "ndx/notifications",
  serviceName: "ndx-notifications",
})

const secretsClient = new SecretsManagerClient({})

// =============================================================================
// Types
// =============================================================================

/**
 * LeaseRecord structure from ISB API
 * Matches the existing interface for compatibility
 */
export interface ISBLeaseRecord {
  userEmail: string
  uuid: string
  status?: string
  templateName?: string
  accountId?: string
  awsAccountId?: string
  expirationDate?: string
  maxSpend?: number
  totalCostAccrued?: number
  lastModified?: string
  originalLeaseTemplateName?: string
  startDate?: string
  endDate?: string
  leaseDurationInHours?: number
}

/**
 * AccountRecord structure from ISB Accounts API
 * Matches the SandboxAccountTable record structure
 */
export interface ISBAccountRecord {
  awsAccountId: string
  name?: string
  email?: string
  status?: string
  adminRoleArn?: string
  principalRoleArn?: string
}

/**
 * LeaseTemplateRecord structure from ISB Templates API
 * Matches the LeaseTemplateTable record structure
 */
export interface ISBTemplateRecord {
  uuid: string
  name: string
  description?: string
  leaseDurationInHours?: number
  maxSpend?: number
}

/**
 * JSend response format from ISB API
 * @see https://github.com/omniti-labs/jsend
 */
export interface JSendResponse<T> {
  status: "success" | "fail" | "error"
  data?: T
  message?: string
}

/**
 * Configuration for ISB API client
 *
 * All fields fall back to environment variables if not provided:
 * - `apiBaseUrl` -> `ISB_API_BASE_URL`
 * - `jwtSecretPath` -> `ISB_JWT_SECRET_PATH`
 */
export interface ISBClientConfig {
  /** API Gateway base URL */
  apiBaseUrl: string
  /** Secrets Manager path for JWT signing secret */
  jwtSecretPath?: string
  /** Request timeout in milliseconds (default 5000) */
  timeoutMs?: number
}

// =============================================================================
// JWT Signing (zero new dependencies — uses Node.js built-in crypto)
// =============================================================================

/**
 * Service identity used in JWT tokens for ISB API authentication.
 * The ISB API Gateway authorizer validates this identity.
 * TODO: Request a dedicated read-only role from the ISB team to replace "Admin".
 */
const ISB_SERVICE_IDENTITY = { email: "ndx+notifier@dsit.gov.uk", roles: ["Admin"] } as const

/**
 * Sign a JWT with HS256 algorithm using Node.js built-in crypto.
 *
 * Note: `iat` and `exp` claims are always set by this function and will
 * override any values present in the payload object.
 *
 * @param payload - JWT payload object
 * @param secret - HMAC-SHA256 signing secret
 * @param expiresInSeconds - Token TTL (default 3600s / 1 hour)
 * @returns Signed JWT string
 */
export function signJwt(payload: object, secret: string, expiresInSeconds = 3600): string {
  const header = { alg: "HS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url")
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url")
  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url")
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

// =============================================================================
// Token Manager — pre-warm pattern matching secrets.ts
// =============================================================================

let cachedSecret: string | null = null
let cachedToken: string | null = null
let tokenExpiry = 0

/**
 * Fetch JWT signing secret from Secrets Manager
 */
async function fetchJwtSecret(secretPath: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretPath })
  const response = await secretsClient.send(command)
  if (!response.SecretString) {
    throw new Error("JWT secret is empty")
  }
  return response.SecretString
}

/**
 * Get a valid signed JWT token, re-signing if expired or expiring within 60s.
 *
 * Fetches the signing secret from Secrets Manager on first call and caches it.
 * The token payload uses {@link ISB_SERVICE_IDENTITY} as the service principal.
 *
 * @param jwtSecretPath - Secrets Manager path for the JWT secret
 * @returns Signed JWT string
 */
async function getISBToken(jwtSecretPath: string): Promise<string> {
  // Ensure secret is loaded
  if (!cachedSecret) {
    cachedSecret = await fetchJwtSecret(jwtSecretPath)
  }

  // Re-sign if token expired or expiring within 60s
  const now = Math.floor(Date.now() / 1000)
  if (!cachedToken || now >= tokenExpiry - 60) {
    cachedToken = signJwt({ user: ISB_SERVICE_IDENTITY }, cachedSecret, 3600)
    tokenExpiry = now + 3600
  }

  return cachedToken
}

/**
 * Reset cached token and secret state (for testing).
 * Clears both the cached JWT signing secret and the cached token.
 */
export function resetTokenCache(): void {
  cachedSecret = null
  cachedToken = null
  tokenExpiry = 0
}

/**
 * Invalidate cached secret and token, forcing re-fetch on next call.
 * Called when the API returns 401/403, indicating possible secret rotation.
 */
function invalidateSecretCache(): void {
  cachedSecret = null
  cachedToken = null
  tokenExpiry = 0
}

// =============================================================================
// ISB API Client
// =============================================================================

/**
 * Construct a lease ID for ISB API from userEmail and uuid
 * Format: base64 encoded JSON object { userEmail, uuid }
 *
 * AC-3.1: Support ISB API format (base64 encoded JSON composite key)
 *
 * @param userEmail - User's email address
 * @param uuid - Lease UUID
 * @returns Base64 encoded lease ID for ISB API
 */
export function constructLeaseId(userEmail: string, uuid: string): string {
  const json = JSON.stringify({ userEmail, uuid })
  return Buffer.from(json, "utf8").toString("base64")
}

/**
 * Parse a lease ID from ISB API format back to userEmail and uuid
 *
 * @param leaseId - Base64 encoded JSON lease ID
 * @returns Object with userEmail and uuid, or null if invalid
 */
export function parseLeaseId(leaseId: string): { userEmail: string; uuid: string } | null {
  try {
    const json = Buffer.from(leaseId, "base64").toString("utf-8")
    const parsed = JSON.parse(json) as { userEmail?: string; uuid?: string }
    if (!parsed.userEmail || !parsed.uuid) {
      return null
    }
    return { userEmail: parsed.userEmail, uuid: parsed.uuid }
  } catch {
    return null
  }
}

/**
 * Resolve ISB API config from explicit config or environment variables.
 * Returns null if config is incomplete (triggers graceful degradation).
 */
function resolveConfig(
  correlationId: string,
  config?: ISBClientConfig,
): { apiBaseUrl: string; jwtSecretPath: string; timeoutMs?: number } | null {
  const apiBaseUrl = config?.apiBaseUrl || process.env.ISB_API_BASE_URL
  const jwtSecretPath = config?.jwtSecretPath || process.env.ISB_JWT_SECRET_PATH

  if (!apiBaseUrl || !jwtSecretPath) {
    logger.warn("ISB API not configured - skipping enrichment", {
      correlationId,
      hasApiBaseUrl: !!apiBaseUrl,
      hasJwtSecretPath: !!jwtSecretPath,
    })
    metrics.addMetric("ISBClientConfigMissing", MetricUnit.Count, 1)
    return null
  }

  return { apiBaseUrl, jwtSecretPath, timeoutMs: config?.timeoutMs }
}

/**
 * Make an authenticated GET request to ISB API Gateway.
 *
 * Handles JWT token acquisition, authentication headers, timeout enforcement,
 * and secret rotation resilience (invalidates cache on 401/403).
 *
 * @param url - Full URL to fetch
 * @param correlationId - Event ID for log correlation
 * @param jwtSecretPath - Secrets Manager path for JWT secret
 * @param timeoutMs - Request timeout in milliseconds (default 5000)
 * @returns Response object
 */
async function fetchFromISBAPI(
  url: string,
  correlationId: string,
  jwtSecretPath: string,
  timeoutMs = 5000,
): Promise<Response> {
  const token = await getISBToken(jwtSecretPath)

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Correlation-Id": correlationId,
    },
    signal: AbortSignal.timeout(timeoutMs),
  })

  // Invalidate cached secret on auth failures (handles secret rotation)
  if (response.status === 401 || response.status === 403) {
    invalidateSecretCache()
  }

  return response
}

/**
 * Generic ISB API endpoint fetcher with JSend response parsing.
 *
 * Handles: config resolution, HTTP call, status code handling (404, 4xx, 5xx),
 * JSend response validation, metrics, and error logging.
 *
 * @param endpoint - API path segment (e.g., "/leases")
 * @param resourceId - Resource identifier for the URL
 * @param correlationId - Event ID for log correlation
 * @param metricPrefix - Prefix for CloudWatch metric names
 * @param config - Optional client configuration
 * @param logContext - Additional fields to include in debug/log messages
 * @returns Parsed data of type T, or null on any error
 */
async function fetchFromISBEndpoint<T>(
  endpoint: string,
  resourceId: string,
  correlationId: string,
  metricPrefix: string,
  config?: ISBClientConfig,
  logContext?: Record<string, unknown>,
): Promise<T | null> {
  const resolved = resolveConfig(correlationId, config)
  if (!resolved) return null

  const startTime = Date.now()

  try {
    logger.debug(`Calling ISB ${endpoint} API`, {
      correlationId,
      ...logContext,
    })

    const url = `${resolved.apiBaseUrl}${endpoint}/${encodeURIComponent(resourceId)}`
    const response = await fetchFromISBAPI(url, correlationId, resolved.jwtSecretPath, resolved.timeoutMs)
    const latencyMs = Date.now() - startTime

    // Handle 404 - graceful degradation
    if (response.status === 404) {
      logger.debug(`Resource not found in ISB ${endpoint} API`, {
        correlationId,
        latencyMs,
        statusCode: 404,
      })
      metrics.addMetric(`${metricPrefix}NotFound`, MetricUnit.Count, 1)
      metrics.addMetric(`${metricPrefix}LatencyMs`, MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Handle 5xx errors - graceful degradation
    if (response.status >= 500) {
      logger.warn(`ISB ${endpoint} API returned server error - proceeding without enrichment`, {
        correlationId,
        latencyMs,
        statusCode: response.status,
      })
      metrics.addMetric(`${metricPrefix}ServerError`, MetricUnit.Count, 1)
      metrics.addMetric(`${metricPrefix}LatencyMs`, MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Handle 4xx errors (other than 404)
    if (response.status >= 400) {
      logger.warn(`ISB ${endpoint} API returned client error - proceeding without enrichment`, {
        correlationId,
        latencyMs,
        statusCode: response.status,
      })
      metrics.addMetric(`${metricPrefix}ClientError`, MetricUnit.Count, 1)
      metrics.addMetric(`${metricPrefix}LatencyMs`, MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Parse JSend response body directly (no Lambda envelope to unwrap)
    const json = (await response.json()) as JSendResponse<T>

    // Validate JSend format
    if (json.status !== "success" || !json.data) {
      logger.warn(`ISB ${endpoint} API returned non-success JSend response`, {
        correlationId,
        latencyMs,
        jsendStatus: json.status,
        message: json.message,
      })
      metrics.addMetric(`${metricPrefix}InvalidResponse`, MetricUnit.Count, 1)
      metrics.addMetric(`${metricPrefix}LatencyMs`, MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Success path
    logger.debug(`Resource fetched successfully from ISB ${endpoint} API`, {
      correlationId,
      latencyMs,
      ...logContext,
    })
    metrics.addMetric(`${metricPrefix}Success`, MetricUnit.Count, 1)
    metrics.addMetric(`${metricPrefix}LatencyMs`, MetricUnit.Milliseconds, latencyMs)

    return json.data
  } catch (error) {
    const latencyMs = Date.now() - startTime

    // Handle timeout or network errors
    logger.warn(`ISB ${endpoint} API request error - proceeding without enrichment`, {
      correlationId,
      latencyMs,
      errorType: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    })
    metrics.addMetric(`${metricPrefix}RequestError`, MetricUnit.Count, 1)
    metrics.addMetric(`${metricPrefix}LatencyMs`, MetricUnit.Milliseconds, latencyMs)
    return null
  }
}

// =============================================================================
// ISB Leases API Client
// =============================================================================

/**
 * Fetch lease record from ISB API Gateway
 *
 * AC-1: Call ISB API with GET /leases/{id}
 * AC-4: Return null for 404 responses (graceful degradation)
 * AC-5: Return null for 500/network errors (graceful degradation)
 * AC-6/NFR4: 5-second timeout
 *
 * @param leaseId - Base64 encoded lease ID (from constructLeaseId)
 * @param correlationId - Event ID for log correlation
 * @param config - Optional client configuration
 * @returns LeaseRecord or null if not found/error
 */
export async function fetchLeaseFromISB(
  leaseId: string,
  correlationId: string,
  config?: ISBClientConfig,
): Promise<ISBLeaseRecord | null> {
  return fetchFromISBEndpoint<ISBLeaseRecord>("/leases", leaseId, correlationId, "ISBAPI", config, {
    leaseIdPrefix: leaseId.substring(0, 8) + "...",
  })
}

/**
 * Fetch lease record from ISB API using userEmail and uuid
 *
 * Convenience function that constructs the lease ID internally.
 *
 * @param userEmail - User's email address
 * @param uuid - Lease UUID
 * @param correlationId - Event ID for log correlation
 * @param config - Optional client configuration
 * @returns LeaseRecord or null if not found/error
 */
export async function fetchLeaseByKey(
  userEmail: string,
  uuid: string,
  correlationId: string,
  config?: ISBClientConfig,
): Promise<ISBLeaseRecord | null> {
  // Validate inputs
  if (!userEmail || typeof userEmail !== "string" || userEmail.trim() === "") {
    logger.warn("Invalid userEmail for ISB API - skipping enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientInputInvalid", MetricUnit.Count, 1)
    return null
  }

  if (!uuid || typeof uuid !== "string" || uuid.trim() === "") {
    logger.warn("Invalid uuid for ISB API - skipping enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientInputInvalid", MetricUnit.Count, 1)
    return null
  }

  const leaseId = constructLeaseId(userEmail, uuid)
  return fetchLeaseFromISB(leaseId, correlationId, config)
}

// =============================================================================
// ISB Accounts API Client
// =============================================================================

/**
 * Fetch account record from ISB API Gateway
 *
 * Calls ISB API with GET /accounts/{awsAccountId}.
 * Returns null for 404 responses or errors (graceful degradation).
 *
 * @param awsAccountId - AWS account ID to look up
 * @param correlationId - Event ID for log correlation
 * @param config - Optional client configuration
 * @returns AccountRecord or null if not found/error
 */
export async function fetchAccountFromISB(
  awsAccountId: string,
  correlationId: string,
  config?: ISBClientConfig,
): Promise<ISBAccountRecord | null> {
  // Validate input
  if (!awsAccountId || typeof awsAccountId !== "string" || awsAccountId.trim() === "") {
    logger.warn("Invalid awsAccountId for ISB API - skipping account enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientInputInvalid", MetricUnit.Count, 1)
    return null
  }

  return fetchFromISBEndpoint<ISBAccountRecord>(
    "/accounts",
    awsAccountId,
    correlationId,
    "ISBAccountsAPI",
    config,
    { awsAccountId },
  )
}

// =============================================================================
// ISB Templates API Client
// =============================================================================

/**
 * Fetch template record from ISB API Gateway
 *
 * Calls ISB API with GET /leaseTemplates/{templateName}.
 * Returns null for 404 responses or errors (graceful degradation).
 *
 * @param templateName - Template name to look up
 * @param correlationId - Event ID for log correlation
 * @param config - Optional client configuration
 * @returns TemplateRecord or null if not found/error
 */
export async function fetchTemplateFromISB(
  templateName: string,
  correlationId: string,
  config?: ISBClientConfig,
): Promise<ISBTemplateRecord | null> {
  // Validate input
  if (!templateName || typeof templateName !== "string" || templateName.trim() === "") {
    logger.warn("Invalid templateName for ISB API - skipping template enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientInputInvalid", MetricUnit.Count, 1)
    return null
  }

  return fetchFromISBEndpoint<ISBTemplateRecord>(
    "/leaseTemplates",
    templateName,
    correlationId,
    "ISBTemplatesAPI",
    config,
    { templateName },
  )
}
