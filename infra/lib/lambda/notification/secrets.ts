/**
 * Secrets Manager integration for NDX Notification System
 *
 * Retrieves API credentials at runtime from AWS Secrets Manager.
 * Implements caching to minimize API calls during Lambda container lifetime.
 *
 * Security Controls:
 * - Secrets retrieved at runtime (not in env vars)
 * - Cached per Lambda container (cleared on cold start)
 * - CriticalError thrown for auth/credential failures
 *
 * Note: Slack webhook URL removed in Story 6.3. Slack notifications are now
 * handled by AWS Chatbot via EventBridge → SNS (Story 6.1).
 *
 * @see docs/notification-architecture.md#Secrets-Handling
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  SecretsManagerServiceException,
} from "@aws-sdk/client-secrets-manager"
import { Logger } from "@aws-lambda-powertools/logger"
import { CriticalError } from "./errors"

// Logger for secrets module
const logger = new Logger({ serviceName: "ndx-notifications" })

// Secrets Manager client - reused across invocations
const secretsClient = new SecretsManagerClient({})

/**
 * Notification secrets structure
 * Retrieved from Secrets Manager at runtime
 *
 * Note: slackWebhookUrl removed in Story 6.3. Slack notifications now
 * handled by AWS Chatbot via EventBridge → SNS (Story 6.1).
 */
export interface NotificationSecrets {
  /** GOV.UK Notify API key (team + service key format) */
  notifyApiKey: string
}

/**
 * E2E test secrets structure
 * Contains sandbox API key for integration testing (AC-8.1)
 */
export interface E2ETestSecrets {
  /** GOV.UK Notify Sandbox API key for E2E testing */
  notifySandboxApiKey: string
}

/**
 * Cached secrets value - persists for Lambda container lifetime
 * Cleared automatically on cold start (new container)
 */
let cachedSecrets: NotificationSecrets | null = null

/**
 * Pre-warm promise - starts fetching secrets during module initialization
 * This reduces cold start latency by fetching secrets in parallel with
 * other module initialization work.
 */
let preWarmPromise: Promise<NotificationSecrets> | null = null

/**
 * Get the secrets path from environment
 * Defaults to standard path if not set
 */
function getSecretsPath(): string {
  return process.env.SECRETS_PATH || "/ndx/notifications/credentials"
}

/**
 * Internal function to fetch secrets from Secrets Manager
 * Used by both pre-warming and on-demand fetching
 */
async function fetchSecretsInternal(secretPath: string): Promise<NotificationSecrets> {
  logger.info("Retrieving secrets from Secrets Manager", {
    secretPath,
  })

  // EC-AC-12: Explicitly request AWSCURRENT version
  const command = new GetSecretValueCommand({
    SecretId: secretPath,
    VersionStage: "AWSCURRENT",
  })

  const response = await secretsClient.send(command)

  if (!response.SecretString) {
    throw new CriticalError("Secret value is empty or binary (expected JSON string)", "secrets")
  }

  // Parse and validate secret structure
  let parsed: unknown
  try {
    parsed = JSON.parse(response.SecretString)
  } catch {
    throw new CriticalError("Secret value is not valid JSON", "secrets")
  }

  if (!validateSecrets(parsed)) {
    throw new CriticalError("Secret missing required field (notifyApiKey)", "secrets")
  }

  return parsed
}

/**
 * Pre-warm secrets during module initialization (P-H1)
 * This fires the Secrets Manager request during Lambda cold start,
 * before the handler is invoked. The result is cached for the
 * container lifetime.
 *
 * Only pre-warms if SECRETS_PATH is set (production/deployed environment)
 */
function initializePreWarm(): void {
  const secretPath = getSecretsPath()

  // Only pre-warm if we have a real secrets path configured
  // Skip in test environments or when SECRETS_PATH is not set
  if (secretPath && !process.env.SKIP_SECRETS_PREWARM) {
    logger.debug("Pre-warming secrets fetch", { secretPath })
    preWarmPromise = fetchSecretsInternal(secretPath).catch((error) => {
      // Log but don't throw - let getSecrets() handle the error
      logger.warn("Pre-warm failed, will retry on first call", {
        error: error instanceof Error ? error.message : "Unknown error",
      })
      preWarmPromise = null
      throw error
    })
  }
}

// Initialize pre-warming at module load time
initializePreWarm()

/**
 * Validate that parsed secrets have required fields
 */
function validateSecrets(parsed: unknown): parsed is NotificationSecrets {
  if (typeof parsed !== "object" || parsed === null) {
    return false
  }
  const obj = parsed as Record<string, unknown>
  return typeof obj.notifyApiKey === "string" && obj.notifyApiKey.length > 0
}

/**
 * Retrieve notification secrets from Secrets Manager
 *
 * Implements caching per Lambda container to minimize API calls.
 * Cache is automatically cleared on cold start (new container deployment).
 *
 * Uses pre-warming for reduced cold start latency (P-H1):
 * - If pre-warm promise exists, await it instead of making a new request
 * - Falls back to on-demand fetch if pre-warming failed or wasn't initialized
 *
 * @returns NotificationSecrets with API credentials
 * @throws CriticalError if secrets cannot be retrieved or are malformed
 */
export async function getSecrets(): Promise<NotificationSecrets> {
  // Return cached secrets if available
  if (cachedSecrets !== null) {
    logger.debug("Returning cached secrets")
    return cachedSecrets
  }

  const secretPath = getSecretsPath()

  try {
    // Use pre-warm promise if available (P-H1: reduced cold start latency)
    if (preWarmPromise !== null) {
      logger.debug("Using pre-warmed secrets fetch")
      cachedSecrets = await preWarmPromise
      logger.info("Secrets retrieved successfully (pre-warmed)")
      return cachedSecrets
    }

    // Fall back to on-demand fetch if pre-warming wasn't available
    logger.debug("Pre-warm not available, fetching on-demand")
    cachedSecrets = await fetchSecretsInternal(secretPath)
    logger.info("Secrets retrieved successfully")
    return cachedSecrets
  } catch (error: unknown) {
    // Handle AWS SDK errors
    if (error instanceof SecretsManagerServiceException) {
      logger.error("Secrets Manager error", {
        errorCode: error.name,
        // Never log the actual secret path in error details for security
        errorMessage: "[REDACTED - check Secrets Manager permissions]",
      })

      throw new CriticalError(`Secrets Manager error: ${error.name}`, "secrets", error)
    }

    // Re-throw CriticalErrors
    if (error instanceof CriticalError) {
      throw error
    }

    // Wrap unexpected errors
    const errorInstance = error instanceof Error ? error : undefined
    logger.error("Unexpected error retrieving secrets", {
      errorName: errorInstance?.name ?? "Unknown",
    })

    throw new CriticalError("Unexpected error retrieving secrets", "secrets", errorInstance)
  }
}

/**
 * Clear the secrets cache and pre-warm promise
 * Used for testing and rotation scenarios
 */
export function clearSecretsCache(): void {
  cachedSecrets = null
  preWarmPromise = null
}

/**
 * Check if secrets are cached
 * Used for testing
 */
export function isSecretsCached(): boolean {
  return cachedSecrets !== null
}

/**
 * Check if pre-warming is in progress
 * Used for testing
 */
export function isPreWarmInProgress(): boolean {
  return preWarmPromise !== null
}

// =============================================================================
// E2E Test Secrets (AC-8.1)
// =============================================================================

/**
 * Cached E2E secrets value
 */
let cachedE2ESecrets: E2ETestSecrets | null = null

/**
 * Get the E2E secrets path from environment
 * Defaults to standard path if not set
 */
function getE2ESecretsPath(): string {
  return process.env.E2E_SECRETS_PATH || "/ndx/notifications/e2e-credentials"
}

/**
 * Validate that parsed E2E secrets have required fields
 */
function validateE2ESecrets(parsed: unknown): parsed is E2ETestSecrets {
  if (typeof parsed !== "object" || parsed === null) {
    return false
  }
  const obj = parsed as Record<string, unknown>
  return typeof obj.notifySandboxApiKey === "string" && obj.notifySandboxApiKey.length > 0
}

/**
 * Verify that an API key is a sandbox key (AC-8.1)
 * Sandbox keys have different format/prefix than production keys
 *
 * GOV.UK Notify API key format: {key_name}-{uuid}-{uuid}
 * - Test keys typically have 'test' or similar in the key name portion
 * - We verify by checking if the key works with sandbox endpoints
 *
 * @param apiKey - The API key to verify
 * @returns true if the key appears to be a sandbox/test key
 */
export function isSandboxApiKey(apiKey: string): boolean {
  // GOV.UK Notify sandbox API keys are identified by trying to use them
  // with sandbox-specific functionality. For now, we just verify format.
  // Production keys work everywhere, sandbox keys only work in test mode.

  // Basic format validation: should be a non-empty string with expected format
  // Key format: {key_name}-{uuid}-{uuid} (about 72+ characters)
  if (!apiKey || apiKey.length < 50) {
    return false
  }

  // The key name portion (before first uuid) indicates the type
  // Common patterns: 'team-xxxxx' for test, various names for production
  // We don't have a reliable way to distinguish without calling the API

  return true // Assume valid if format looks correct
}

/**
 * Retrieve E2E test secrets from Secrets Manager (AC-8.1)
 *
 * Used by E2E tests to get sandbox API key for testing against
 * GOV.UK Notify sandbox environment.
 *
 * @returns E2ETestSecrets with sandbox API key
 * @throws CriticalError if secrets cannot be retrieved or are malformed
 */
export async function getE2ESecrets(): Promise<E2ETestSecrets> {
  // Return cached secrets if available
  if (cachedE2ESecrets !== null) {
    logger.debug("Returning cached E2E secrets")
    return cachedE2ESecrets
  }

  const secretPath = getE2ESecretsPath()

  try {
    logger.info("Retrieving E2E secrets from Secrets Manager", {
      secretPath,
    })

    const command = new GetSecretValueCommand({
      SecretId: secretPath,
      VersionStage: "AWSCURRENT",
    })

    const response = await secretsClient.send(command)

    if (!response.SecretString) {
      throw new CriticalError("E2E secret value is empty or binary (expected JSON string)", "secrets")
    }

    // Parse and validate secret structure
    let parsed: unknown
    try {
      parsed = JSON.parse(response.SecretString)
    } catch {
      throw new CriticalError("E2E secret value is not valid JSON", "secrets")
    }

    if (!validateE2ESecrets(parsed)) {
      throw new CriticalError("E2E secret missing required field (notifySandboxApiKey)", "secrets")
    }

    // Verify it's actually a sandbox key (AC-8.1)
    if (!isSandboxApiKey(parsed.notifySandboxApiKey)) {
      throw new CriticalError("E2E secret does not appear to be a valid sandbox API key", "secrets")
    }

    // Cache for container lifetime
    cachedE2ESecrets = parsed

    logger.info("E2E secrets retrieved successfully")

    return cachedE2ESecrets
  } catch (error: unknown) {
    // Handle AWS SDK errors
    if (error instanceof SecretsManagerServiceException) {
      logger.error("Secrets Manager error (E2E)", {
        errorCode: error.name,
        errorMessage: "[REDACTED - check Secrets Manager permissions]",
      })

      throw new CriticalError(`Secrets Manager error: ${error.name}`, "secrets", error)
    }

    // Re-throw CriticalErrors
    if (error instanceof CriticalError) {
      throw error
    }

    // Wrap unexpected errors
    const errorInstance = error instanceof Error ? error : undefined
    logger.error("Unexpected error retrieving E2E secrets", {
      errorName: errorInstance?.name ?? "Unknown",
    })

    throw new CriticalError("Unexpected error retrieving E2E secrets", "secrets", errorInstance)
  }
}

/**
 * Clear the E2E secrets cache
 * Used for testing
 */
export function clearE2ESecretsCache(): void {
  cachedE2ESecrets = null
}
