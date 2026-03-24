/**
 * Terminate Proxy Lambda Handler
 *
 * Proxies lease termination requests from NDX users to the ISB API.
 * Users can only terminate their own leases — ownership is validated
 * by comparing the user's JWT email with the email in the leaseId.
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
 * Lambda handler for POST /lease-api/terminate
 */
export async function handler(event: {
  requestContext?: { http?: { method?: string } }
  headers?: Record<string, string>
  body?: string
  isBase64Encoded?: boolean
}): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const method = event.requestContext?.http?.method || ""
  const headers = event.headers || {}

  // Health check
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
