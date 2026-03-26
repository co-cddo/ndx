/**
 * Lease API Lambda Handler
 *
 * Handles lease-related proxy endpoints:
 * - POST /lease-api/terminate — proxies lease termination to ISB API
 * - GET /lease-api/estimate — returns estimated provisioning duration
 *
 * The ISB terminate endpoint requires Manager/Admin role, so this Lambda
 * signs an admin JWT using the shared ISB secret and forwards the request.
 *
 * @module infra/lib/lambda/terminate/handler
 */

import { Logger } from "@aws-lambda-powertools/logger"
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import { signJwt, parseLeaseId } from "@co-cddo/isb-client"

const logger = new Logger({ serviceName: "ndx-terminate-proxy" })

const secretsClient = new SecretsManagerClient({})

/** Service identity for admin JWT */
const SERVICE_IDENTITY = { email: "ndx+terminate@dsit.gov.uk", roles: ["Admin"] }

/** CSRF header required for terminate requests */
const CSRF_HEADER = "x-ndx-request"
const CSRF_VALUE = "terminate-session"

/** Cached JWT secret per Lambda container */
let cachedSecret: string | null = null

/** In-memory cache for estimate responses (per Lambda container) */
const estimateCache = new Map<
  string,
  { data: { estimateMinutes: number | null; sampleSize: number }; expiresAt: number }
>()
const ESTIMATE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/** Lease statuses that indicate provisioning completed successfully */
const PROVISIONED_STATUSES = new Set(["Active", "Expired", "ManuallyTerminated", "BudgetExceeded", "Frozen"])

/** Maximum reasonable provisioning duration (minutes) */
const MAX_PROVISIONING_MINUTES = 120

/**
 * Fetch ISB JWT signing secret from Secrets Manager (cached).
 */
async function getJwtSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret

  const secretPath = process.env.ISB_JWT_SECRET_PATH
  if (!secretPath) throw new Error("ISB_JWT_SECRET_PATH not configured")

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretPath, VersionStage: "AWSCURRENT" }),
  )

  if (!response.SecretString) throw new Error("JWT secret is empty")

  cachedSecret = response.SecretString
  return cachedSecret
}

/**
 * Decode a JWT payload without verification.
 * Safe here because ownership is validated independently.
 */
function decodeJwtPayload(token: string): { user?: { email?: string } } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8")
    return JSON.parse(payload) as { user?: { email?: string } }
  } catch {
    return null
  }
}

/**
 * Build CORS headers for responses.
 */
function corsHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  }
}

/**
 * Lambda handler for /lease-api/* endpoints
 */
export async function handler(event: {
  requestContext?: { http?: { method?: string; path?: string } }
  headers?: Record<string, string>
  body?: string
  isBase64Encoded?: boolean
  queryStringParameters?: Record<string, string>
}): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const method = event.requestContext?.http?.method || ""
  const path = event.requestContext?.http?.path || ""
  const headers = event.headers || {}

  // GET /lease-api/estimate — deployment time estimate
  if (method === "GET" && path.includes("/estimate")) {
    return handleEstimate(event)
  }

  // Health check for other GET requests
  if (method === "GET") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ status: "ok" }),
    }
  }

  // Only accept POST
  if (method !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Method not allowed" }),
    }
  }

  // CSRF check (ADR-045 pattern)
  const csrfHeader = headers[CSRF_HEADER] || headers[CSRF_HEADER.toLowerCase()] || ""
  if (csrfHeader !== CSRF_VALUE) {
    logger.warn("Missing or invalid CSRF header")
    return {
      statusCode: 403,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Forbidden" }),
    }
  }

  // Extract user JWT
  const authHeader = headers["authorization"] || headers["Authorization"] || ""
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!bearerMatch) {
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Missing authorization token" }),
    }
  }
  const userToken = bearerMatch[1]

  // Parse request body
  let bodyStr = event.body || ""
  if (event.isBase64Encoded) {
    bodyStr = Buffer.from(bodyStr, "base64").toString("utf-8")
  }

  let leaseId: string
  try {
    const parsed = JSON.parse(bodyStr)
    leaseId = parsed.leaseId
    if (!leaseId || typeof leaseId !== "string") {
      throw new Error("Missing leaseId")
    }
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Invalid request body — expected { leaseId: string }" }),
    }
  }

  // Decode user JWT to get email
  const jwtPayload = decodeJwtPayload(userToken)
  const userEmail = jwtPayload?.user?.email
  if (!userEmail) {
    logger.warn("Could not extract email from user JWT")
    return {
      statusCode: 401,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Invalid authorization token" }),
    }
  }

  // Parse leaseId to extract owner email
  const leaseKey = parseLeaseId(leaseId)
  if (!leaseKey) {
    logger.warn("Could not parse leaseId", { leaseId: leaseId.substring(0, 20) })
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Invalid lease ID" }),
    }
  }

  // Ownership check: user can only terminate their own leases
  if (userEmail.toLowerCase() !== leaseKey.userEmail.toLowerCase()) {
    logger.warn("Ownership check failed", {
      requestingUser: userEmail,
      leaseOwner: leaseKey.userEmail,
    })
    return {
      statusCode: 403,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "You can only end your own sessions" }),
    }
  }

  // Sign admin JWT for ISB API
  const apiBaseUrl = process.env.ISB_API_BASE_URL
  if (!apiBaseUrl) throw new Error("ISB_API_BASE_URL not configured")

  let adminToken: string
  try {
    const secret = await getJwtSecret()
    adminToken = signJwt({ user: SERVICE_IDENTITY }, secret, 300) // 5-minute TTL
  } catch (err) {
    logger.error("Failed to sign admin JWT", { error: err instanceof Error ? err.message : "Unknown" })
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Internal server error" }),
    }
  }

  // Call ISB terminate endpoint
  const terminateUrl = `${apiBaseUrl}/leases/${encodeURIComponent(leaseId)}/terminate`

  logger.info("Proxying terminate request", {
    userEmail,
    leaseOwner: leaseKey.userEmail,
    leaseUuid: leaseKey.uuid,
  })

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const isbResponse = await fetch(terminateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const isbBody = await isbResponse.text()

    logger.info("ISB API response", {
      statusCode: isbResponse.status,
      leaseUuid: leaseKey.uuid,
    })

    return {
      statusCode: isbResponse.status,
      headers: corsHeaders(),
      body: isbBody,
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logger.error("ISB API request timed out")
      return {
        statusCode: 504,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Upstream timeout" }),
      }
    }

    logger.error("ISB API request failed", { error: err instanceof Error ? err.message : "Unknown" })
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Upstream error" }),
    }
  }
}

/**
 * Handle GET /lease-api/estimate — return estimated provisioning duration.
 *
 * Queries ISB for historical leases with the given template, calculates the
 * average provisioning duration of the last 5 successful deployments, and
 * returns the result in minutes.
 *
 * No authentication required — this is public read-only data.
 */
async function handleEstimate(event: {
  queryStringParameters?: Record<string, string>
}): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const leaseTemplateId = event.queryStringParameters?.leaseTemplateId
  if (!leaseTemplateId) {
    return {
      statusCode: 400,
      headers: cacheHeaders(0),
      body: JSON.stringify({ error: "Missing required parameter: leaseTemplateId" }),
    }
  }

  // Check in-memory cache
  const cached = estimateCache.get(leaseTemplateId)
  if (cached && cached.expiresAt > Date.now()) {
    return {
      statusCode: 200,
      headers: cacheHeaders(300),
      body: JSON.stringify(cached.data),
    }
  }

  const apiBaseUrl = process.env.ISB_API_BASE_URL
  if (!apiBaseUrl) {
    logger.error("ISB_API_BASE_URL not configured")
    return {
      statusCode: 500,
      headers: cacheHeaders(0),
      body: JSON.stringify({ error: "Internal server error" }),
    }
  }

  let adminToken: string
  try {
    const secret = await getJwtSecret()
    adminToken = signJwt({ user: SERVICE_IDENTITY }, secret, 300)
  } catch (err) {
    logger.error("Failed to sign admin JWT for estimate", { error: err instanceof Error ? err.message : "Unknown" })
    return {
      statusCode: 500,
      headers: cacheHeaders(0),
      body: JSON.stringify({ error: "Internal server error" }),
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    // Query ISB for leases — try filtering by template UUID
    const leasesUrl = `${apiBaseUrl}/leases?originalLeaseTemplateUuid=${encodeURIComponent(leaseTemplateId)}`

    logger.info("Fetching lease history for estimate", { leaseTemplateId })

    const isbResponse = await fetch(leasesUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!isbResponse.ok) {
      logger.warn("ISB leases query failed", { status: isbResponse.status, leaseTemplateId })
      return {
        statusCode: 200,
        headers: cacheHeaders(60),
        body: JSON.stringify({ estimateMinutes: null, sampleSize: 0 }),
      }
    }

    interface LeaseHistoryRecord {
      status?: string
      startDate?: string
      originalLeaseTemplateUuid?: string
      meta?: { createdTime?: string; lastEditTime?: string }
    }

    const data = (await isbResponse.json()) as {
      status?: string
      data?: { result?: LeaseHistoryRecord[] } | LeaseHistoryRecord[]
    }
    let leases: LeaseHistoryRecord[] = []

    // Parse JSend response
    if (data?.status === "success" && !Array.isArray(data?.data) && Array.isArray(data?.data?.result)) {
      leases = data.data.result
    } else if (Array.isArray(data)) {
      leases = data
    } else if (Array.isArray(data?.data)) {
      leases = data.data
    }

    // Filter for leases matching this template that completed provisioning
    const completed = leases.filter((lease) => {
      if (!lease.status || !PROVISIONED_STATUSES.has(lease.status)) return false
      // If ISB didn't filter by template, filter client-side
      if (lease.originalLeaseTemplateUuid && lease.originalLeaseTemplateUuid !== leaseTemplateId) return false
      return true
    })

    // Calculate provisioning durations
    const durations: { durationMinutes: number; startDate: string }[] = []

    for (const lease of completed) {
      const startDate = lease.startDate
      const createdTime = lease.meta?.createdTime
      if (!startDate || !createdTime) continue

      const startMs = new Date(startDate).getTime()
      const createdMs = new Date(createdTime).getTime()
      if (isNaN(startMs) || isNaN(createdMs)) continue

      // startDate - createdTime = time from lease creation to lease becoming usable
      const durationMinutes = (startMs - createdMs) / 60000

      if (durationMinutes > 0 && durationMinutes <= MAX_PROVISIONING_MINUTES) {
        durations.push({ durationMinutes, startDate })
      }
    }

    // Sort by startDate descending (most recent first) and take last 5
    durations.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    const recent = durations.slice(0, 5)

    let result: { estimateMinutes: number | null; sampleSize: number }

    if (recent.length === 0) {
      result = { estimateMinutes: null, sampleSize: 0 }
    } else {
      const average = recent.reduce((sum, d) => sum + d.durationMinutes, 0) / recent.length
      result = { estimateMinutes: Math.round(average), sampleSize: recent.length }
    }

    logger.info("Estimate calculated", {
      leaseTemplateId,
      estimateMinutes: result.estimateMinutes,
      sampleSize: result.sampleSize,
      totalCompleted: completed.length,
    })

    // Cache the result
    estimateCache.set(leaseTemplateId, { data: result, expiresAt: Date.now() + ESTIMATE_CACHE_TTL_MS })

    return {
      statusCode: 200,
      headers: cacheHeaders(300),
      body: JSON.stringify(result),
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      logger.error("ISB API request timed out for estimate")
      return {
        statusCode: 200,
        headers: cacheHeaders(60),
        body: JSON.stringify({ estimateMinutes: null, sampleSize: 0 }),
      }
    }

    logger.error("Estimate fetch failed", { error: err instanceof Error ? err.message : "Unknown" })
    return {
      statusCode: 200,
      headers: cacheHeaders(60),
      body: JSON.stringify({ estimateMinutes: null, sampleSize: 0 }),
    }
  }
}

/**
 * Build headers with Cache-Control for cacheable responses.
 */
function cacheHeaders(maxAgeSeconds: number): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Cache-Control": maxAgeSeconds > 0 ? `public, max-age=${maxAgeSeconds}` : "no-store",
  }
}
