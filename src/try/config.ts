/**
 * Try Feature Configuration
 *
 * Story 7.11: Centralized configuration for Try Before You Buy feature.
 *
 * Environment-based configuration with sensible defaults for development.
 * Production values should be set via environment variables.
 *
 * Now uses shared configuration from @shared/config/environment.ts
 * to ensure consistency with infrastructure deployments.
 *
 * @module config
 */

import { getEnvironmentConfig } from "../../shared/config/environment"

// Get shared environment config (defaults to prod)
const sharedConfig = getEnvironmentConfig()

/**
 * Configuration for Try Before You Buy feature.
 */
export interface TryConfig {
  /** AWS SSO Portal base URL for launching console sessions */
  awsSsoPortalUrl: string
  /** IAM role name for SSO console access */
  ssoRoleName: string
  /** API base URL for Innovation Sandbox */
  apiBaseUrl: string
  /** Request timeout in milliseconds */
  requestTimeout: number
  /** OAuth login URL */
  oauthLoginUrl: string
}

/**
 * Default AWS SSO Portal base URL.
 * Now sourced from shared configuration.
 *
 * @see {@link https://docs.aws.amazon.com/singlesignon/latest/userguide/using-the-portal.html|AWS SSO User Portal}
 */
const DEFAULT_AWS_SSO_PORTAL_URL = sharedConfig.aws.ssoPortalUrl

/**
 * Default IAM role name for SSO console access.
 */
const DEFAULT_SSO_ROLE_NAME = "ndx_IsbUsersPS"

/**
 * Default API base URL for Innovation Sandbox.
 * Now sourced from shared configuration.
 */
const DEFAULT_API_BASE_URL = sharedConfig.isb.apiBaseUrl

/**
 * Default request timeout (10 seconds).
 */
const DEFAULT_REQUEST_TIMEOUT = 10000

/**
 * Get configuration value from environment or use default.
 *
 * In browser context, this checks for globally injected config.
 * In Node.js context (build time), this checks process.env.
 *
 * @param key - Configuration key
 * @param defaultValue - Default value if not set
 * @returns Configuration value
 */
function getConfigValue(key: string, defaultValue: string): string {
  // Check for globally injected config (from server-side rendering or build)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalConfig = (typeof window !== "undefined" && (window as any).__TRY_CONFIG__) || {}

  if (globalConfig[key]) {
    return globalConfig[key]
  }

  // Check for process.env (build time injection via esbuild define)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof process !== "undefined" && (process as any).env?.[key]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (process as any).env[key]
  }

  return defaultValue
}

/**
 * Try feature configuration.
 *
 * Configuration is loaded from:
 * 1. Window.__TRY_CONFIG__ (runtime injection)
 * 2. process.env (build-time injection)
 * 3. Default values
 *
 * @example
 * ```typescript
 * import { config } from './config';
 *
 * // Use SSO portal URL
 * const ssoUrl = config.awsSsoPortalUrl;
 * ```
 */
export const config: TryConfig = {
  awsSsoPortalUrl: getConfigValue("AWS_SSO_PORTAL_URL", DEFAULT_AWS_SSO_PORTAL_URL),
  ssoRoleName: getConfigValue("SSO_ROLE_NAME", DEFAULT_SSO_ROLE_NAME),
  apiBaseUrl: getConfigValue("API_BASE_URL", DEFAULT_API_BASE_URL),
  requestTimeout: parseInt(getConfigValue("REQUEST_TIMEOUT", String(DEFAULT_REQUEST_TIMEOUT)), 10),
  oauthLoginUrl: getConfigValue("OAUTH_LOGIN_URL", "/api/auth/login"),
}

/**
 * Get AWS SSO Portal URL.
 *
 * Story 7.11: Convenience function for launch button.
 *
 * @returns AWS SSO Portal URL
 */
export function getAwsSsoPortalUrl(): string {
  return config.awsSsoPortalUrl
}
