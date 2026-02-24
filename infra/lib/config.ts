// Configuration for NDX Infrastructure
export interface EnvironmentConfig {
  readonly distributionId: string
  readonly oacId: string
  readonly bucketName: string
  readonly region: string
  readonly account: string
  // Alternate domain name (CNAME) configuration
  // Step 1: Create ACM certificate in us-east-1 manually, add DNS validation records
  // Step 2: Once validated, add certificateArn here
  // Step 3: Add alternateDomainName and deploy
  readonly alternateDomainName?: string
  readonly certificateArn?: string // ACM certificate ARN in us-east-1
  // Signup Lambda Function URL configuration (Story 1.2)
  // The Lambda is deployed via infra-signup/, this config enables CloudFront routing
  readonly signupLambdaFunctionUrl?: string
}

/**
 * Configuration for Innovation Sandbox (ISB) EventBridge integration
 *
 * The ISB event bus is in a separate AWS account. This configuration
 * provides the necessary values for cross-account EventBridge subscription.
 *
 * @see docs/notification-architecture.md#ISB-Integration
 * @see docs/sprint-artifacts/tech-spec-epic-n4.md#n4-2
 */
export interface ISBConfig {
  /**
   * ISB namespace (e.g., 'prod', 'staging')
   * Used to construct the event bus name: ISB-{namespace}-ISBEventBus
   */
  readonly namespace: string

  /**
   * AWS Account ID where the ISB EventBridge bus resides
   * Used for account-level filtering in EventBridge rules (Red Team requirement)
   * This prevents cross-account event injection attacks
   */
  readonly accountId: string

  /**
   * AWS Region where the ISB EventBridge bus is deployed
   */
  readonly region: string

  /**
   * ISB API Gateway base URL for HTTP API calls
   * e.g. "https://1ewlxhaey6.execute-api.us-west-2.amazonaws.com/prod"
   */
  readonly apiBaseUrl?: string

  /**
   * Secrets Manager path for the ISB JWT signing secret
   * e.g. "/InnovationSandbox/ndx/Auth/JwtSecret"
   */
  readonly jwtSecretPath?: string
}

/**
 * ISB configuration by environment
 *
 * Note: ISB account IDs are provided by the ISB team.
 * These must be verified before deployment.
 */
// Note: ISB has a single environment — staging intentionally uses the same
// API Gateway, account, and secret path as production.
export const ISB_CONFIG: Record<string, ISBConfig> = {
  prod: {
    namespace: "InnovationSandboxCompute",
    accountId: "568672915267",
    region: "us-west-2",
    apiBaseUrl: "https://1ewlxhaey6.execute-api.us-west-2.amazonaws.com/prod",
    jwtSecretPath: "/InnovationSandbox/ndx/Auth/JwtSecret",
  },
  staging: {
    namespace: "InnovationSandboxCompute",
    accountId: "568672915267",
    region: "us-west-2",
    apiBaseUrl: "https://1ewlxhaey6.execute-api.us-west-2.amazonaws.com/prod",
    jwtSecretPath: "/InnovationSandbox/ndx/Auth/JwtSecret",
  },
}

/**
 * Get ISB configuration for the specified environment
 *
 * @param env - Environment name (prod, staging)
 * @returns ISB configuration for the environment
 * @throws Error if environment is not configured
 */
export function getISBConfig(env: string = "prod"): ISBConfig {
  const config = ISB_CONFIG[env]
  if (!config) {
    const validEnvs = Object.keys(ISB_CONFIG).join(", ")
    throw new Error(`Unknown ISB environment: ${env}. Valid environments: ${validEnvs}`)
  }
  return config
}

/**
 * Construct the ISB EventBridge bus ARN
 *
 * @param config - ISB configuration
 * @returns Full ARN of the ISB event bus
 */
export function getISBEventBusArn(config: ISBConfig): string {
  // ISB event bus name format: {namespace}ISBEventBus{suffix}
  // e.g., InnovationSandboxComputeISBEventBus6697FE33
  return `arn:aws:events:${config.region}:${config.accountId}:event-bus/${config.namespace}ISBEventBus6697FE33`
}

/**
 * List of all notification-relevant event types from ISB
 *
 * These are the detail-types that the notification Lambda subscribes to.
 * They are categorized by notification channel:
 *
 * User notifications (GOV.UK Notify):
 * - LeaseRequested, LeaseApproved, LeaseDenied, LeaseTerminated, LeaseFrozen
 * - LeaseBudgetThresholdAlert, LeaseDurationThresholdAlert, LeaseFreezingThresholdAlert
 * - LeaseBudgetExceeded, LeaseExpired
 *
 * Ops alerts (Slack):
 * - AccountQuarantined, AccountCleanupFailed, AccountDriftDetected
 *
 * Both channels:
 * - LeaseFrozen (also goes to Slack for ops visibility)
 */
export const ISB_EVENT_TYPES = [
  // Lease lifecycle events (user notifications)
  "LeaseRequested",
  "LeaseApproved",
  "LeaseDenied",
  "LeaseTerminated",
  "LeaseFrozen",
  // Monitoring threshold events (user notifications)
  "LeaseBudgetThresholdAlert",
  "LeaseDurationThresholdAlert",
  "LeaseFreezingThresholdAlert",
  "LeaseBudgetExceeded",
  "LeaseExpired",
  // Billing events (user notifications) - from isb-costs source
  "LeaseCostsGenerated",
  // Ops events (Slack alerts)
  "AccountQuarantined",
  "AccountCleanupFailed",
  "AccountDriftDetected",
] as const

/**
 * Story 6.1: All 18 ISB event types for AWS Chatbot integration
 *
 * This is the complete list of all ISB EventBridge event types that should
 * be routed to AWS Chatbot for Slack visibility. Unlike ISB_EVENT_TYPES
 * (which is filtered for Lambda notification processing), this list includes
 * ALL events for comprehensive ops monitoring.
 *
 * @see _bmad-output/planning-artifacts/prd-ndx-try-enhancements.md - Event Classification Reference
 */
export const CHATBOT_EVENT_TYPES = [
  // Lease lifecycle events (6)
  "LeaseRequested",
  "LeaseApproved",
  "LeaseDenied",
  "LeaseFrozen",
  "LeaseUnfrozen",
  "LeaseTerminated",
  // Monitoring alert events (5)
  "LeaseBudgetThresholdAlert",
  "LeaseDurationThresholdAlert",
  "LeaseFreezingThresholdAlert",
  "LeaseBudgetExceeded",
  "LeaseExpiredAlert",
  // Operations events (4) - critical events marked
  "AccountQuarantined", // critical
  "AccountCleanupFailed", // critical
  "AccountCleanupSucceeded",
  "AccountDriftDetected", // critical
  // Reporting events (2)
  "GroupCostReportGenerated",
  "GroupCostReportGeneratedFailure", // critical
  // Account requests (1)
  "CleanAccountRequest",
] as const

/**
 * Story 6.1: AWS Chatbot Slack configuration
 *
 * These are the Slack workspace and channel IDs for AWS Chatbot integration.
 * The workspace authorization is a one-time manual setup in AWS Console.
 *
 * @see _bmad-output/planning-artifacts/prd-ndx-try-enhancements.md - Slack Configuration
 */
export const CHATBOT_SLACK_CONFIG = {
  /** Slack workspace ID (GDS workspace) */
  workspaceId: "T8GT9416G",
  /** Slack channel ID for #ndx-sandbox-alerts */
  channelId: "C0A16HXLM0Q",
  /** Configuration name for AWS Chatbot */
  configurationName: "ndx-sandbox-alerts",
} as const

/**
 * The expected source field value for ISB events
 * Used for defense-in-depth validation alongside account filtering
 */
export const ISB_EVENT_SOURCE = "innovation-sandbox"

// =============================================================================
// GOV.UK Notify Template IDs
// =============================================================================

/**
 * GOV.UK Notify template IDs for user email notifications
 *
 * These are public identifiers for templates defined in GOV.UK Notify.
 * The templates themselves (content, formatting) are managed in the Notify service.
 *
 * Template management: https://www.notifications.service.gov.uk/
 *
 * @see lib/lambda/notification/templates.ts for personalisation fields
 */
export const NOTIFY_TEMPLATE_IDS = {
  // Lease lifecycle events (N5.4)
  LEASE_REQUESTED: "30a9e926-36fd-4646-a8fc-76000c95f2a7",
  LEASE_APPROVED: "d09a78f6-e1c3-441f-80a7-3b85529d78e9",
  LEASE_DENIED: "8686af3c-4121-41f1-8a28-06576b9e7c22",
  LEASE_TERMINATED: "343d9762-915b-4e5e-9655-a7561c38582e",

  // Monitoring alert events (N5.5)
  BUDGET_THRESHOLD: "e7128846-a9ef-46b9-97c1-851b06d38d66",
  DURATION_THRESHOLD: "331bd0d4-5979-4394-9745-0a9a7d6cfb05",
  FREEZING_THRESHOLD: "57718a30-b297-4de6-a674-e63ec33b970b",
  BUDGET_EXCEEDED: "cbe9abe8-1eda-4d06-a5c7-ea9b78863ce2",
  LEASE_EXPIRED: "f25aa223-41f5-45dc-825c-e3fed7f9b794",
  LEASE_FROZEN: "6daa353b-a39d-46c0-b279-907e15b09bc2",

  // Billing events
  LEASE_COSTS_GENERATED: "d1e29f43-137a-44e7-95b1-58d503365bad",
} as const

/**
 * Map from event type to template ID
 * Used by notification-stack to set Lambda environment variables
 */
export const EVENT_TYPE_TO_TEMPLATE_ID: Record<string, string> = {
  LeaseRequested: NOTIFY_TEMPLATE_IDS.LEASE_REQUESTED,
  LeaseApproved: NOTIFY_TEMPLATE_IDS.LEASE_APPROVED,
  LeaseDenied: NOTIFY_TEMPLATE_IDS.LEASE_DENIED,
  LeaseTerminated: NOTIFY_TEMPLATE_IDS.LEASE_TERMINATED,
  LeaseBudgetThresholdAlert: NOTIFY_TEMPLATE_IDS.BUDGET_THRESHOLD,
  LeaseDurationThresholdAlert: NOTIFY_TEMPLATE_IDS.DURATION_THRESHOLD,
  LeaseFreezingThresholdAlert: NOTIFY_TEMPLATE_IDS.FREEZING_THRESHOLD,
  LeaseBudgetExceeded: NOTIFY_TEMPLATE_IDS.BUDGET_EXCEEDED,
  LeaseExpired: NOTIFY_TEMPLATE_IDS.LEASE_EXPIRED,
  LeaseFrozen: NOTIFY_TEMPLATE_IDS.LEASE_FROZEN,
  LeaseCostsGenerated: NOTIFY_TEMPLATE_IDS.LEASE_COSTS_GENERATED,
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  prod: {
    distributionId: "E3THG4UHYDHVWP",
    oacId: "E3P8MA1G9Y5BYE",
    bucketName: "ndx-static-prod",
    region: "us-west-2",
    account: "568672915267",
    alternateDomainName: "ndx.digital.cabinet-office.gov.uk",
    certificateArn: "arn:aws:acm:us-east-1:568672915267:certificate/834f73bb-611f-4fbf-9e36-ffd6624548b6",
    // Signup Lambda Function URL (deployed via infra-signup/)
    signupLambdaFunctionUrl: "tytqcupxb7p2ijlcj7rvlhnzwu0nyfaj.lambda-url.us-west-2.on.aws",
  },
  test: {
    distributionId: "E3TESTDISTID",
    oacId: "E3TESTOAC",
    bucketName: "ndx-static-test",
    region: "us-west-2",
    account: "568672915267",
  },
}

export function getEnvironmentConfig(env: string = "prod"): EnvironmentConfig {
  const config = ENVIRONMENTS[env]
  if (!config) {
    const validEnvs = Object.keys(ENVIRONMENTS).join(", ")
    throw new Error("Unknown environment: " + env + ". Valid environments: " + validEnvs)
  }
  return config
}
