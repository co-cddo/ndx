/**
 * Shared environment configuration - single source of truth
 * Used by BOTH frontend build and CDK deployment
 *
 * This module unifies configuration that was previously duplicated between:
 * - src/try/config.ts (frontend)
 * - infra/lib/config.ts (infrastructure)
 */

/**
 * AWS-specific configuration
 */
export interface AWSConfig {
  readonly accountId: string
  readonly region: string
  readonly ssoPortalUrl: string
}

/**
 * Innovation Sandbox (ISB) configuration
 */
export interface ISBConfig {
  readonly namespace: string
  readonly accountId: string
  readonly region: string
  readonly apiBaseUrl: string
}

/**
 * Shared environment configuration interface
 */
export interface EnvironmentConfig {
  readonly environment: "prod" | "staging" | "test"
  readonly aws: AWSConfig
  readonly isb: ISBConfig
}

/**
 * Environment configurations - single source of truth for all environments
 *
 * Note: AWS account IDs and regions are centralized here to prevent drift
 * between frontend and infrastructure deployments.
 */
export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  prod: {
    environment: "prod",
    aws: {
      accountId: "568672915267",
      region: "us-west-2",
      ssoPortalUrl: "https://d-9267e1e371.awsapps.com/start",
    },
    isb: {
      namespace: "InnovationSandboxCompute",
      accountId: "568672915267",
      region: "us-west-2",
      apiBaseUrl: "/api",
    },
  },
  staging: {
    environment: "staging",
    aws: {
      accountId: "568672915267",
      region: "us-west-2",
      ssoPortalUrl: "https://d-9267e1e371.awsapps.com/start",
    },
    isb: {
      namespace: "InnovationSandboxCompute",
      accountId: "568672915267",
      region: "us-west-2",
      apiBaseUrl: "/api",
    },
  },
  test: {
    environment: "test",
    aws: {
      accountId: "568672915267",
      region: "us-west-2",
      ssoPortalUrl: "https://d-9267e1e371.awsapps.com/start",
    },
    isb: {
      namespace: "InnovationSandboxCompute",
      accountId: "568672915267",
      region: "us-west-2",
      apiBaseUrl: "/api",
    },
  },
}

/**
 * Get environment configuration for the specified environment
 *
 * @param env - Environment name (prod, staging, test)
 * @returns Environment configuration
 * @throws Error if environment is not configured
 */
export function getEnvironmentConfig(env: string = "prod"): EnvironmentConfig {
  const config = ENVIRONMENTS[env]
  if (!config) {
    const validEnvs = Object.keys(ENVIRONMENTS).join(", ")
    throw new Error(`Unknown environment: ${env}. Valid environments: ${validEnvs}`)
  }
  return config
}

/**
 * Get AWS configuration for the specified environment
 *
 * @param env - Environment name (prod, staging, test)
 * @returns AWS configuration
 */
export function getAWSConfig(env: string = "prod"): AWSConfig {
  return getEnvironmentConfig(env).aws
}

/**
 * Get ISB configuration for the specified environment
 *
 * @param env - Environment name (prod, staging, test)
 * @returns ISB configuration
 */
export function getISBConfig(env: string = "prod"): ISBConfig {
  return getEnvironmentConfig(env).isb
}
