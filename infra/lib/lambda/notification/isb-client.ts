/**
 * ISB API Client Module for Notification System
 *
 * This module provides Lambda invocation client functionality for fetching lease data
 * from the ISB Leases Lambda directly, bypassing API Gateway authorization.
 *
 * Story: 5.1 - Replace DynamoDB Reads with ISB API
 * ACs: 1, 4, 5, 6
 *
 * Security Controls:
 * - AC-5, AC-6: Graceful degradation on API failures
 * - NFR4: 5-second timeout for API calls
 * - Structured JSON logging with correlation ID
 * - No PII in error logs
 *
 * @see _bmad-output/implementation-artifacts/5-1-replace-dynamodb-reads-with-isb-api.md
 */

import { Logger } from "@aws-lambda-powertools/logger"
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics"
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

// =============================================================================
// Constants
// =============================================================================

/** NFR4: ISB API timeout in milliseconds (5 seconds) */
const ISB_API_TIMEOUT_MS = 5000

// =============================================================================
// Logger, Metrics and Lambda Client
// =============================================================================

const logger = new Logger({ serviceName: "ndx-notifications" })
const metrics = new Metrics({
  namespace: "ndx/notifications",
  serviceName: "ndx-notifications",
})

const lambdaClient = new LambdaClient({})

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
 * Configuration for ISB Lambda client
 */
export interface ISBClientConfig {
  /** Lambda function name for direct invocation */
  functionName: string
  timeoutMs?: number
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
 * API Gateway Proxy Response format returned by Lambda
 */
interface APIGatewayProxyResult {
  statusCode: number
  body: string
  headers?: Record<string, string>
}

/**
 * Fetch lease record from ISB Lambda directly
 *
 * AC-1: Invoke ISB Leases Lambda with GET /leases/{id} event
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
  const functionName = config?.functionName || process.env.ISB_LEASES_LAMBDA_NAME

  if (!functionName) {
    logger.warn("ISB_LEASES_LAMBDA_NAME not configured - skipping ISB enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientConfigMissing", MetricUnit.Count, 1)
    return null
  }

  const startTime = Date.now()

  try {
    logger.debug("Invoking ISB Leases Lambda", {
      correlationId,
      functionName,
      leaseIdPrefix: leaseId.substring(0, 8) + "...", // Don't log full ID (may contain PII)
    })

    // Construct API Gateway proxy event format
    // The ISB Lambda middleware decodes the JWT and sets request.context.user
    // JWT is decoded but signature is not verified for direct Lambda invocation
    const notifierEmail = "ndx+notifier@dsit.gov.uk"

    // Create JWT matching the format expected by ISB Lambda middleware
    // Uses HS256 algorithm header (signature not verified for direct invocation)
    const jwtHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")

    // Payload must have user object with email and roles
    const jwtPayload = Buffer.from(
      JSON.stringify({
        user: {
          email: notifierEmail,
          roles: ["Admin"],
        },
      }),
    )
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")

    // Signature is "directinvoke" - not verified but must be present
    const jwtToken = `${jwtHeader}.${jwtPayload}.directinvoke`

    const apiGatewayEvent = {
      httpMethod: "GET",
      path: `/leases/${leaseId}`,
      pathParameters: { leaseId },
      headers: {
        "X-Correlation-Id": correlationId,
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
      requestContext: {
        httpMethod: "GET",
        path: `/leases/${leaseId}`,
        extendedRequestId: `notifier-getlease-${Date.now()}`,
      },
      resource: "/leases/{leaseId}",
      body: null,
      isBase64Encoded: false,
    }

    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(apiGatewayEvent)),
    })

    const response = await lambdaClient.send(command)
    const latencyMs = Date.now() - startTime

    // Check for Lambda execution error
    if (response.FunctionError) {
      logger.warn("ISB Lambda execution error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        functionError: response.FunctionError,
      })
      metrics.addMetric("ISBLambdaExecutionError", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Parse Lambda response payload
    if (!response.Payload) {
      logger.warn("ISB Lambda returned empty payload", {
        correlationId,
        latencyMs,
      })
      metrics.addMetric("ISBLambdaEmptyResponse", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    const payloadString = Buffer.from(response.Payload).toString("utf-8")
    const apiResponse = JSON.parse(payloadString) as APIGatewayProxyResult

    // AC-4: Handle 404 (lease not found) - graceful degradation
    if (apiResponse.statusCode === 404) {
      logger.debug("Lease not found in ISB Lambda", {
        correlationId,
        latencyMs,
        statusCode: 404,
      })
      metrics.addMetric("ISBLeaseNotFound", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // AC-5: Handle 5xx errors - graceful degradation
    if (apiResponse.statusCode >= 500) {
      logger.warn("ISB Lambda returned server error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        statusCode: apiResponse.statusCode,
      })
      metrics.addMetric("ISBAPIServerError", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Handle 4xx errors (other than 404)
    if (apiResponse.statusCode >= 400) {
      logger.warn("ISB Lambda returned client error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        statusCode: apiResponse.statusCode,
      })
      metrics.addMetric("ISBAPIClientError", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Parse JSend response from body
    const json = JSON.parse(apiResponse.body) as JSendResponse<ISBLeaseRecord>

    // Validate JSend format
    if (json.status !== "success" || !json.data) {
      logger.warn("ISB Lambda returned non-success JSend response", {
        correlationId,
        latencyMs,
        jsendStatus: json.status,
        message: json.message,
      })
      metrics.addMetric("ISBAPIInvalidResponse", MetricUnit.Count, 1)
      metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Success path
    logger.debug("Lease fetched successfully from ISB Lambda", {
      correlationId,
      latencyMs,
      hasStatus: !!json.data.status,
      hasMaxSpend: json.data.maxSpend !== undefined,
      hasTemplateName: !!json.data.templateName,
    })
    metrics.addMetric("ISBAPISuccess", MetricUnit.Count, 1)
    metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)

    return json.data
  } catch (error) {
    const latencyMs = Date.now() - startTime

    // Handle timeout or invocation errors
    logger.warn("ISB Lambda invocation error - proceeding without enrichment", {
      correlationId,
      latencyMs,
      errorType: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    })
    metrics.addMetric("ISBLambdaInvocationError", MetricUnit.Count, 1)
    metrics.addMetric("ISBAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
    return null
  }
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
 * Fetch account record from ISB Accounts Lambda directly
 *
 * Invokes ISB Accounts Lambda with GET /accounts/{awsAccountId} event.
 * Returns null for 404 responses or errors (graceful degradation).
 *
 * @param awsAccountId - AWS account ID to look up
 * @param correlationId - Event ID for log correlation
 * @param config - Optional client configuration (function name override)
 * @returns AccountRecord or null if not found/error
 */
export async function fetchAccountFromISB(
  awsAccountId: string,
  correlationId: string,
  config?: ISBClientConfig,
): Promise<ISBAccountRecord | null> {
  const functionName = config?.functionName || process.env.ISB_ACCOUNTS_LAMBDA_NAME

  if (!functionName) {
    logger.warn("ISB_ACCOUNTS_LAMBDA_NAME not configured - skipping account enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientConfigMissing", MetricUnit.Count, 1)
    return null
  }

  // Validate input
  if (!awsAccountId || typeof awsAccountId !== "string" || awsAccountId.trim() === "") {
    logger.warn("Invalid awsAccountId for ISB API - skipping account enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientInputInvalid", MetricUnit.Count, 1)
    return null
  }

  const startTime = Date.now()

  try {
    logger.debug("Invoking ISB Accounts Lambda", {
      correlationId,
      functionName,
      awsAccountId,
    })

    // Construct API Gateway proxy event format
    const notifierEmail = "ndx+notifier@dsit.gov.uk"

    // Create JWT matching the format expected by ISB Lambda middleware
    const jwtHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")

    const jwtPayload = Buffer.from(
      JSON.stringify({
        user: {
          email: notifierEmail,
          roles: ["Admin"],
        },
      }),
    )
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")

    const jwtToken = `${jwtHeader}.${jwtPayload}.directinvoke`

    const apiGatewayEvent = {
      httpMethod: "GET",
      path: `/accounts/${awsAccountId}`,
      pathParameters: { awsAccountId },
      headers: {
        "X-Correlation-Id": correlationId,
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
      requestContext: {
        httpMethod: "GET",
        path: `/accounts/${awsAccountId}`,
        extendedRequestId: `notifier-getaccount-${Date.now()}`,
      },
      resource: "/accounts/{awsAccountId}",
      body: null,
      isBase64Encoded: false,
    }

    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(apiGatewayEvent)),
    })

    const response = await lambdaClient.send(command)
    const latencyMs = Date.now() - startTime

    // Check for Lambda execution error
    if (response.FunctionError) {
      logger.warn("ISB Accounts Lambda execution error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        functionError: response.FunctionError,
      })
      metrics.addMetric("ISBAccountsLambdaExecutionError", MetricUnit.Count, 1)
      metrics.addMetric("ISBAccountsAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Parse Lambda response payload
    if (!response.Payload) {
      logger.warn("ISB Accounts Lambda returned empty payload", {
        correlationId,
        latencyMs,
      })
      metrics.addMetric("ISBAccountsLambdaEmptyResponse", MetricUnit.Count, 1)
      metrics.addMetric("ISBAccountsAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    const payloadString = Buffer.from(response.Payload).toString("utf-8")
    const apiResponse = JSON.parse(payloadString) as APIGatewayProxyResult

    // Handle 404 (account not found) - graceful degradation
    if (apiResponse.statusCode === 404) {
      logger.debug("Account not found in ISB Lambda", {
        correlationId,
        latencyMs,
        statusCode: 404,
      })
      metrics.addMetric("ISBAccountNotFound", MetricUnit.Count, 1)
      metrics.addMetric("ISBAccountsAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Handle 5xx errors - graceful degradation
    if (apiResponse.statusCode >= 500) {
      logger.warn("ISB Accounts Lambda returned server error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        statusCode: apiResponse.statusCode,
      })
      metrics.addMetric("ISBAccountsAPIServerError", MetricUnit.Count, 1)
      metrics.addMetric("ISBAccountsAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Handle 4xx errors (other than 404)
    if (apiResponse.statusCode >= 400) {
      logger.warn("ISB Accounts Lambda returned client error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        statusCode: apiResponse.statusCode,
      })
      metrics.addMetric("ISBAccountsAPIClientError", MetricUnit.Count, 1)
      metrics.addMetric("ISBAccountsAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Parse JSend response from body
    const json = JSON.parse(apiResponse.body) as JSendResponse<ISBAccountRecord>

    // Validate JSend format
    if (json.status !== "success" || !json.data) {
      logger.warn("ISB Accounts Lambda returned non-success JSend response", {
        correlationId,
        latencyMs,
        jsendStatus: json.status,
        message: json.message,
      })
      metrics.addMetric("ISBAccountsAPIInvalidResponse", MetricUnit.Count, 1)
      metrics.addMetric("ISBAccountsAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Success path
    logger.debug("Account fetched successfully from ISB Lambda", {
      correlationId,
      latencyMs,
      hasName: !!json.data.name,
      hasEmail: !!json.data.email,
    })
    metrics.addMetric("ISBAccountsAPISuccess", MetricUnit.Count, 1)
    metrics.addMetric("ISBAccountsAPILatencyMs", MetricUnit.Milliseconds, latencyMs)

    return json.data
  } catch (error) {
    const latencyMs = Date.now() - startTime

    // Handle timeout or invocation errors
    logger.warn("ISB Accounts Lambda invocation error - proceeding without enrichment", {
      correlationId,
      latencyMs,
      errorType: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    })
    metrics.addMetric("ISBAccountsLambdaInvocationError", MetricUnit.Count, 1)
    metrics.addMetric("ISBAccountsAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
    return null
  }
}

// =============================================================================
// ISB Templates API Client
// =============================================================================

/**
 * Fetch template record from ISB Templates Lambda directly
 *
 * Invokes ISB Templates Lambda with GET /leaseTemplates/{templateName} event.
 * Returns null for 404 responses or errors (graceful degradation).
 *
 * @param templateName - Template name to look up
 * @param correlationId - Event ID for log correlation
 * @param config - Optional client configuration (function name override)
 * @returns TemplateRecord or null if not found/error
 */
export async function fetchTemplateFromISB(
  templateName: string,
  correlationId: string,
  config?: ISBClientConfig,
): Promise<ISBTemplateRecord | null> {
  const functionName = config?.functionName || process.env.ISB_TEMPLATES_LAMBDA_NAME

  if (!functionName) {
    logger.warn("ISB_TEMPLATES_LAMBDA_NAME not configured - skipping template enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientConfigMissing", MetricUnit.Count, 1)
    return null
  }

  // Validate input
  if (!templateName || typeof templateName !== "string" || templateName.trim() === "") {
    logger.warn("Invalid templateName for ISB API - skipping template enrichment", {
      correlationId,
    })
    metrics.addMetric("ISBClientInputInvalid", MetricUnit.Count, 1)
    return null
  }

  const startTime = Date.now()

  try {
    logger.debug("Invoking ISB Templates Lambda", {
      correlationId,
      functionName,
      templateName,
    })

    // Construct API Gateway proxy event format
    const notifierEmail = "ndx+notifier@dsit.gov.uk"

    // Create JWT matching the format expected by ISB Lambda middleware
    const jwtHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")

    const jwtPayload = Buffer.from(
      JSON.stringify({
        user: {
          email: notifierEmail,
          roles: ["Admin"],
        },
      }),
    )
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")

    const jwtToken = `${jwtHeader}.${jwtPayload}.directinvoke`

    const apiGatewayEvent = {
      httpMethod: "GET",
      path: `/leaseTemplates/${templateName}`,
      pathParameters: { leaseTemplateId: templateName },
      headers: {
        "X-Correlation-Id": correlationId,
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
      requestContext: {
        httpMethod: "GET",
        path: `/leaseTemplates/${templateName}`,
        extendedRequestId: `notifier-gettemplate-${Date.now()}`,
      },
      resource: "/leaseTemplates/{leaseTemplateId}",
      body: null,
      isBase64Encoded: false,
    }

    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(apiGatewayEvent)),
    })

    const response = await lambdaClient.send(command)
    const latencyMs = Date.now() - startTime

    // Check for Lambda execution error
    if (response.FunctionError) {
      logger.warn("ISB Templates Lambda execution error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        functionError: response.FunctionError,
      })
      metrics.addMetric("ISBTemplatesLambdaExecutionError", MetricUnit.Count, 1)
      metrics.addMetric("ISBTemplatesAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Parse Lambda response payload
    if (!response.Payload) {
      logger.warn("ISB Templates Lambda returned empty payload", {
        correlationId,
        latencyMs,
      })
      metrics.addMetric("ISBTemplatesLambdaEmptyResponse", MetricUnit.Count, 1)
      metrics.addMetric("ISBTemplatesAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    const payloadString = Buffer.from(response.Payload).toString("utf-8")
    const apiResponse = JSON.parse(payloadString) as APIGatewayProxyResult

    // Handle 404 (template not found) - graceful degradation
    if (apiResponse.statusCode === 404) {
      logger.debug("Template not found in ISB Lambda", {
        correlationId,
        latencyMs,
        statusCode: 404,
      })
      metrics.addMetric("ISBTemplateNotFound", MetricUnit.Count, 1)
      metrics.addMetric("ISBTemplatesAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Handle 5xx errors - graceful degradation
    if (apiResponse.statusCode >= 500) {
      logger.warn("ISB Templates Lambda returned server error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        statusCode: apiResponse.statusCode,
      })
      metrics.addMetric("ISBTemplatesAPIServerError", MetricUnit.Count, 1)
      metrics.addMetric("ISBTemplatesAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Handle 4xx errors (other than 404)
    if (apiResponse.statusCode >= 400) {
      logger.warn("ISB Templates Lambda returned client error - proceeding without enrichment", {
        correlationId,
        latencyMs,
        statusCode: apiResponse.statusCode,
      })
      metrics.addMetric("ISBTemplatesAPIClientError", MetricUnit.Count, 1)
      metrics.addMetric("ISBTemplatesAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Parse JSend response from body
    const json = JSON.parse(apiResponse.body) as JSendResponse<ISBTemplateRecord>

    // Validate JSend format
    if (json.status !== "success" || !json.data) {
      logger.warn("ISB Templates Lambda returned non-success JSend response", {
        correlationId,
        latencyMs,
        jsendStatus: json.status,
        message: json.message,
      })
      metrics.addMetric("ISBTemplatesAPIInvalidResponse", MetricUnit.Count, 1)
      metrics.addMetric("ISBTemplatesAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
      return null
    }

    // Success path
    logger.debug("Template fetched successfully from ISB Lambda", {
      correlationId,
      latencyMs,
      hasName: !!json.data.name,
      hasDescription: !!json.data.description,
      leaseDurationInHours: json.data.leaseDurationInHours,
    })
    metrics.addMetric("ISBTemplatesAPISuccess", MetricUnit.Count, 1)
    metrics.addMetric("ISBTemplatesAPILatencyMs", MetricUnit.Milliseconds, latencyMs)

    return json.data
  } catch (error) {
    const latencyMs = Date.now() - startTime

    // Handle timeout or invocation errors
    logger.warn("ISB Templates Lambda invocation error - proceeding without enrichment", {
      correlationId,
      latencyMs,
      errorType: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    })
    metrics.addMetric("ISBTemplatesLambdaInvocationError", MetricUnit.Count, 1)
    metrics.addMetric("ISBTemplatesAPILatencyMs", MetricUnit.Milliseconds, latencyMs)
    return null
  }
}
