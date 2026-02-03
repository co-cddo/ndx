/**
 * Email Templates for GOV.UK Notify
 *
 * This module implements the template registry pattern for GOV.UK Notify emails.
 * Templates are selected based on event type and personalisation fields are
 * validated before sending.
 *
 * Stories:
 * - N5.4 - Lease Lifecycle Email Templates (ACs: 4.1-4.19, 4.25)
 * - N5.5 - Monitoring Alert Email Templates (ACs: 5.1-5.15)
 *
 * Security Controls:
 * - HMAC-SHA256 signed portal links with 15-min expiry (AC-4.11)
 * - Audience claim in tokens to prevent cross-lease access (AC-4.12)
 * - PII redaction in logs using hashForLog() (security pattern)
 * - Never use enriched.status in templates (AC-5.15)
 * - Event data takes precedence over enriched data (AC-5.14)
 *
 * @see docs/sprint-artifacts/tech-spec-epic-n5.md#Story-n5-4
 * @see docs/sprint-artifacts/tech-spec-epic-n5.md#Story-n5-5
 */

import { createHmac } from "crypto"
import { Logger } from "@aws-lambda-powertools/logger"
import { PermanentError } from "./errors"
import type { NotificationEventType } from "./types"
import type {
  ValidatedEvent,
  LeaseRequestedDetail,
  LeaseApprovedDetail,
  LeaseDeniedDetail,
  LeaseTerminatedDetail,
  LeaseTerminatedReason,
  LeaseBudgetThresholdAlertDetail,
  LeaseDurationThresholdAlertDetail,
  LeaseFreezingThresholdAlertDetail,
  LeaseBudgetExceededDetail,
  LeaseExpiredDetail,
  LeaseFrozenDetail,
  LeaseFrozenReason,
  LeaseCostsGeneratedDetail,
} from "./validation"

const logger = new Logger({ serviceName: "ndx-notifications" })

// =============================================================================
// Types (AC-4.1)
// =============================================================================

/**
 * Enrichment query types for DynamoDB lookups
 * These will be used by the enrichment module (N-5.6)
 */
export type EnrichmentQuery = "lease" | "account" | "leaseTemplate" | "userPreferences"

/**
 * AC-4.1: Template configuration for each event type
 */
export interface TemplateConfig {
  /** Environment variable name for template ID */
  templateIdEnvVar: string
  /** Required personalisation fields that must be present */
  requiredFields: string[]
  /** Optional personalisation fields that default to empty string */
  optionalFields: string[]
  /** DynamoDB queries needed to enrich missing fields */
  enrichmentQueries: EnrichmentQuery[]
}

/**
 * Lease key for portal link generation
 */
export interface LeaseKey {
  userEmail: string
  uuid: string
}

/**
 * Portal link action types
 */
export type PortalAction = "view" | "increase-budget"

// =============================================================================
// Template Registry (AC-4.1, AC-4.2, AC-4.3, AC-4.5, AC-4.6)
// =============================================================================

/**
 * AC-4.1: Template IDs loaded from environment variables (NOTIFY_TEMPLATE_*)
 * AC-4.2: LeaseRequested fields
 * AC-4.3: LeaseApproved fields
 * AC-4.5: LeaseDenied fields
 * AC-4.6: LeaseTerminated fields
 */
export const NOTIFY_TEMPLATES: Record<string, TemplateConfig> = {
  LeaseRequested: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_LEASE_REQUESTED",
    requiredFields: ["userName", "templateName", "requestTime"],
    optionalFields: ["comments", "leaseTemplateId"],
    enrichmentQueries: ["leaseTemplate"],
  },
  LeaseApproved: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_LEASE_APPROVED",
    requiredFields: ["userName", "accountId", "expiryDate"],
    optionalFields: [
      "budgetLimit",
      "ssoUrl",
      "templateName",
      "leaseTemplateName",
      "leaseTemplateId",
      "leaseTemplateUUID",
      "portalLink",
      "budgetActionLink",
      "plainTextLink",
      "linkInstructions",
    ],
    enrichmentQueries: ["lease", "account"],
  },
  LeaseDenied: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_LEASE_DENIED",
    requiredFields: ["userName", "templateName", "reason", "deniedBy"],
    optionalFields: ["portalLink", "plainTextLink", "linkInstructions", "leaseTemplateId"],
    enrichmentQueries: ["leaseTemplate"],
  },
  LeaseTerminated: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_LEASE_TERMINATED",
    requiredFields: ["userName", "accountId", "reason", "finalCost"],
    optionalFields: ["portalLink", "plainTextLink", "linkInstructions"],
    enrichmentQueries: ["lease", "account"],
  },

  // ==========================================================================
  // Monitoring Alert Templates (N5.5)
  // ==========================================================================

  /**
   * AC-5.1: LeaseBudgetThresholdAlert - proactive budget warning
   */
  LeaseBudgetThresholdAlert: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_BUDGET_THRESHOLD",
    requiredFields: ["userName", "currentSpend", "budgetLimit", "percentUsed"],
    optionalFields: ["portalLink", "plainTextLink", "linkInstructions", "budgetDisclaimer", "enrichedMaxSpend"],
    enrichmentQueries: ["lease", "userPreferences"],
  },

  /**
   * AC-5.2: LeaseDurationThresholdAlert - proactive expiry warning
   */
  LeaseDurationThresholdAlert: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_DURATION_THRESHOLD",
    requiredFields: ["userName", "hoursRemaining", "expiryDate"],
    optionalFields: ["timezone", "portalLink", "plainTextLink", "linkInstructions"],
    enrichmentQueries: ["lease", "userPreferences"],
  },

  /**
   * AC-5.4: LeaseFreezingThresholdAlert - freeze warning
   */
  LeaseFreezingThresholdAlert: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_FREEZING_THRESHOLD",
    requiredFields: ["userName", "reason", "freezeTime"],
    optionalFields: ["portalLink", "plainTextLink", "linkInstructions"],
    enrichmentQueries: ["lease"],
  },

  /**
   * AC-5.5: LeaseBudgetExceeded - terminal state
   */
  LeaseBudgetExceeded: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_BUDGET_EXCEEDED",
    requiredFields: ["userName", "finalSpend", "budgetLimit"],
    optionalFields: ["portalLink", "plainTextLink", "linkInstructions", "budgetDisclaimer"],
    enrichmentQueries: ["lease", "account"],
  },

  /**
   * AC-5.6: LeaseExpired - terminal state
   */
  LeaseExpired: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_LEASE_EXPIRED",
    requiredFields: ["userName", "accountId", "expiryTime"],
    optionalFields: ["portalLink", "plainTextLink", "linkInstructions"],
    enrichmentQueries: ["lease", "account"],
  },

  /**
   * AC-5.7: LeaseFrozen - terminal state
   */
  LeaseFrozen: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_LEASE_FROZEN",
    requiredFields: ["userName", "accountId", "reason", "resumeInstructions"],
    optionalFields: ["portalLink", "plainTextLink", "linkInstructions"],
    enrichmentQueries: ["lease", "account"],
  },

  // ==========================================================================
  // Billing Event Templates
  // ==========================================================================

  /**
   * LeaseCostsGenerated - billing CSV ready for download
   *
   * Sent when a user's NDX:Try session ends and their billing CSV is ready.
   * Includes download link, cost summary, and reassurance that this is free.
   */
  LeaseCostsGenerated: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_LEASE_COSTS_GENERATED",
    requiredFields: ["userName", "templateName", "totalCost", "startDate", "endDate", "csvUrl", "urlExpiresAt"],
    optionalFields: [],
    enrichmentQueries: ["lease"],
  },
}

/**
 * Lease lifecycle event types covered by this module
 */
export const LEASE_LIFECYCLE_EVENTS: NotificationEventType[] = [
  "LeaseRequested",
  "LeaseApproved",
  "LeaseDenied",
  "LeaseTerminated",
]

/**
 * Monitoring alert event types covered by this module (N5.5)
 */
export const MONITORING_ALERT_EVENTS: NotificationEventType[] = [
  "LeaseBudgetThresholdAlert",
  "LeaseDurationThresholdAlert",
  "LeaseFreezingThresholdAlert",
  "LeaseBudgetExceeded",
  "LeaseExpired",
  "LeaseFrozen",
]

/**
 * Billing event types - events from isb-costs related to billing/costs
 */
export const BILLING_EVENTS: NotificationEventType[] = ["LeaseCostsGenerated"]

/**
 * Check if an event type is a billing event (from isb-costs)
 */
export function isBillingEvent(eventType: NotificationEventType): boolean {
  return BILLING_EVENTS.includes(eventType)
}

// =============================================================================
// Formatting Utilities (AC-5.8, AC-5.9, AC-5.10)
// =============================================================================

/** Default timezone for UK dates (AC-5.3) */
export const DEFAULT_TIMEZONE = "Europe/London"

/**
 * AC-5.8: Format currency amount with USD symbol
 * Returns $X.XX with thousands separator
 * Note: AWS costs are in USD
 *
 * @example formatCurrency(1234.56) => "$1,234.56"
 * @example formatCurrency(0.99) => "$0.99"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * AC-5.9: Format date in UK format (DD/MM/YYYY, HH:MM:SS)
 * AC-5.3: Defaults to Europe/London if timezone not specified
 *
 * @example formatUKDate('2024-03-15T14:30:00Z', 'Europe/London') => "15/03/2024, 14:30:00"
 */
export function formatUKDate(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  return dateObj.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: timezone,
  })
}

/**
 * Format date in long UK format: "Monday, 10 February 2026, 14:30"
 *
 * Used for human-friendly display of dates like URL expiry times.
 * Does not include seconds for cleaner display.
 *
 * @example formatUKDateLong('2026-02-10T14:30:00Z', 'Europe/London') => "Tuesday, 10 February 2026, 14:30"
 */
export function formatUKDateLong(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  return dateObj.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  })
}

/**
 * AC-5.10: Format percentage with % symbol
 *
 * @example formatPercentage(75.5) => "75.5%"
 * @example formatPercentage(100) => "100%"
 */
export function formatPercentage(percent: number): string {
  // Remove trailing zeros for whole numbers
  const formatted = Number.isInteger(percent) ? percent.toString() : percent.toFixed(1)
  return `${formatted}%`
}

/**
 * AC-5.12: Generate budget data disclaimer with timestamp
 */
export function getBudgetDisclaimer(timestamp: Date | string): string {
  const formattedTime = formatUKDate(timestamp)
  return `Budget data as of ${formattedTime}`
}

// =============================================================================
// Human-Readable Reason Mapping (AC-4.7)
// =============================================================================

/**
 * AC-4.7: Map raw termination reason types to human-readable messages
 */
export const TERMINATION_REASONS: Record<string, string> = {
  Expired: "Your sandbox lease has expired.",
  BudgetExceeded: "Your sandbox lease was terminated because the budget limit was reached.",
  ManuallyTerminated: "Your sandbox lease was terminated by an administrator.",
  UserRequested: "Your sandbox lease was terminated at your request.",
  PolicyViolation: "Your sandbox lease was terminated due to a policy violation.",
}

/**
 * AC-4.7: Convert termination reason to human-readable text
 */
export function getHumanReadableReason(reason: LeaseTerminatedReason): string {
  const humanReadable = TERMINATION_REASONS[reason.type]
  if (!humanReadable) {
    logger.warn("Unknown termination reason type, using default message", {
      reasonType: reason.type,
    })
    return "Your sandbox lease has been terminated."
  }
  return humanReadable
}

// =============================================================================
// Freeze Reason Mapping (AC-5.7)
// =============================================================================

/**
 * AC-5.7: Map raw freeze reason types to human-readable messages
 */
export const FREEZE_REASONS: Record<string, string> = {
  Expired: "Your sandbox lease has exceeded its time limit.",
  BudgetExceeded: "Your sandbox lease has exceeded its budget limit.",
  ManuallyFrozen: "Your sandbox lease has been frozen by an administrator.",
}

/**
 * AC-5.7: Map freeze reason to human-readable resume instructions
 */
export const RESUME_INSTRUCTIONS: Record<string, string> = {
  Expired: "To resume access, please request a new sandbox lease through the portal.",
  BudgetExceeded: "To resume access, please contact your administrator to increase the budget or request a new lease.",
  ManuallyFrozen: "Please contact your administrator for further instructions on resuming access.",
}

/**
 * AC-5.7: Convert freeze reason to human-readable text
 */
export function getHumanReadableFreezeReason(reason: LeaseFrozenReason): string {
  const humanReadable = FREEZE_REASONS[reason.type]
  if (!humanReadable) {
    logger.warn("Unknown freeze reason type, using default message", {
      reasonType: reason.type,
    })
    return "Your sandbox lease has been frozen."
  }
  return humanReadable
}

/**
 * AC-5.7: Get resume instructions based on freeze reason
 */
export function getResumeInstructions(reason: LeaseFrozenReason): string {
  const instructions = RESUME_INSTRUCTIONS[reason.type]
  if (!instructions) {
    return "Please contact your administrator for assistance."
  }
  return instructions
}

// =============================================================================
// Enrichment Data Types (AC-5.11, AC-5.13, AC-5.14, AC-5.15)
// =============================================================================

/**
 * Enrichment data from DynamoDB lookups
 * AC-5.15: Never includes status field in personalisation
 */
export interface EnrichedData {
  /** Max spend from lease table (may differ from event.budgetLimit) */
  maxSpend?: number
  /** Account name for display */
  accountName?: string
  /** Template name/description */
  templateName?: string
  /** User's preferred timezone (AC-5.3) */
  userTimezone?: string
  /** SSO URL for account access (AC-6.10) */
  ssoUrl?: string
  /** When the enrichment data was fetched */
  enrichedAt: string
  /**
   * AC-5.13, AC-5.14: Status from DB - NEVER use in templates
   * Only used for conflict detection logging
   * @internal
   */
  _internalStatus?: string
}

/**
 * AC-5.13: Check if enriched data conflicts with event type
 * This is a security check - logs warning but doesn't modify data
 *
 * @returns true if conflict detected (caller should log warning)
 */
export function detectEnrichmentConflict(eventType: NotificationEventType, enrichedData: EnrichedData): boolean {
  // AC-5.13: Never use enriched data that contradicts event type
  // Example: Event says LeaseDenied but DB status is Approved
  const eventImpliesStatus: Record<string, string[]> = {
    LeaseApproved: ["Approved", "Active"],
    LeaseDenied: ["Denied", "Rejected"],
    LeaseTerminated: ["Terminated", "Closed"],
    LeaseFrozen: ["Frozen", "Suspended"],
    LeaseBudgetExceeded: ["Frozen", "Suspended", "Terminated"],
    LeaseExpired: ["Expired", "Terminated"],
  }

  const expectedStatuses = eventImpliesStatus[eventType]
  if (!expectedStatuses || !enrichedData._internalStatus) {
    return false // No conflict check possible
  }

  const isConflict = !expectedStatuses.includes(enrichedData._internalStatus)

  if (isConflict) {
    // AC-5.13: Log security warning for conflict
    logger.warn("Enrichment data conflicts with event type", {
      eventType,
      enrichedStatus: enrichedData._internalStatus,
      expectedStatuses,
      securityWarning: "Possible data inconsistency or delayed event",
    })
  }

  return isConflict
}

/**
 * AC-5.11: Check if budget values differ between event and enriched data
 * Returns enriched max spend if different (for display in email)
 */
export function getBudgetDiscrepancy(eventBudgetLimit: number, enrichedData?: EnrichedData): string | undefined {
  if (!enrichedData?.maxSpend) {
    return undefined
  }

  // If values differ by more than £0.01, include both
  if (Math.abs(eventBudgetLimit - enrichedData.maxSpend) > 0.01) {
    return formatCurrency(enrichedData.maxSpend)
  }

  return undefined
}

// =============================================================================
// CTA Link Generation (AC-4.10, AC-4.11, AC-4.12, AC-4.14, AC-4.15, AC-4.25)
// =============================================================================

/** Token expiry duration in milliseconds (15 minutes) */
const TOKEN_EXPIRY_MS = 15 * 60 * 1000

/**
 * Portal link token payload structure
 */
interface PortalTokenPayload {
  /** Lease key for identification */
  leaseKey: LeaseKey
  /** Action type (view, increase-budget) */
  action: PortalAction
  /** Expiry timestamp in milliseconds */
  exp: number
  /** Audience claim to prevent cross-lease access (AC-4.12) */
  aud: string
}

/**
 * AC-4.11: Generate HMAC-SHA256 signature for portal token
 */
function signHmac(payload: PortalTokenPayload, secret: string): string {
  const payloadString = JSON.stringify(payload)
  return createHmac("sha256", secret).update(payloadString).digest("base64url")
}

/**
 * AC-4.10: Generate authenticated portal link with HMAC-signed token
 * AC-4.11: Token is session-less with 15-minute expiry
 * AC-4.12: Token includes audience claim (leaseKey) to prevent cross-lease access
 * AC-4.25: CTA link includes UTM parameters for analytics
 *
 * @param leaseKey - The lease key for the token
 * @param action - The portal action (view, increase-budget)
 * @param secret - HMAC secret for signing (from PORTAL_LINK_SECRET env var)
 * @param portalUrl - Base portal URL (from PORTAL_URL env var)
 * @returns Full portal URL with signed token and UTM parameters
 */
export function generatePortalLink(
  leaseKey: LeaseKey,
  action: PortalAction,
  secret: string,
  portalUrl: string,
): string {
  // AC-4.11: Set 15-minute expiry
  const payload: PortalTokenPayload = {
    leaseKey,
    action,
    exp: Date.now() + TOKEN_EXPIRY_MS,
    // AC-4.12: Audience claim prevents cross-lease access
    aud: `${leaseKey.userEmail}:${leaseKey.uuid}`,
  }

  // AC-4.11: HMAC-SHA256 signature
  const token = signHmac(payload, secret)

  // Encode token and payload for URL
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")

  // AC-4.25: UTM parameters for analytics
  const utmSource = "email"
  const utmCampaign = action === "view" ? "lease-notification" : "lease-budget"

  // Build URL with encoded parameters
  const url = new URL(`${portalUrl}/actions/${action}`)
  url.searchParams.set("token", token)
  url.searchParams.set("payload", encodedPayload)
  url.searchParams.set("utm_source", utmSource)
  url.searchParams.set("utm_campaign", utmCampaign)

  return url.toString()
}

/**
 * AC-4.14, AC-4.15: Generate budget form pre-fill link
 * Redirects to budget form with leaseId pre-filled
 */
export function generateBudgetActionLink(leaseKey: LeaseKey, secret: string, portalUrl: string): string {
  return generatePortalLink(leaseKey, "increase-budget", secret, portalUrl)
}

// =============================================================================
// Link Fallback (AC-4.18, AC-4.19)
// =============================================================================

/**
 * AC-4.19: Standard instructions for link fallback
 */
export const LINK_INSTRUCTIONS = "If the link doesn't work, copy and paste the URL below into your browser:"

/**
 * AC-4.18: Get plain-text fallback link for email footer
 * Used when HTML link might not render properly
 */
export function getPlainTextLink(portalUrl: string, leaseKey: LeaseKey): string {
  // Simple link without token for fallback (user will need to authenticate)
  return `${portalUrl}/leases/${encodeURIComponent(leaseKey.uuid)}`
}

// =============================================================================
// Template Functions (AC-4.1, AC-4.8, AC-4.9)
// =============================================================================

/**
 * AC-4.1: Get template configuration for an event type
 * @throws PermanentError if event type is not a lease lifecycle event
 */
export function getTemplateConfig(eventType: NotificationEventType): TemplateConfig {
  const config = NOTIFY_TEMPLATES[eventType]
  if (!config) {
    throw new PermanentError(`No template configuration for event type: ${eventType}`, {
      eventType,
      supportedTypes: Object.keys(NOTIFY_TEMPLATES),
    })
  }
  return config
}

/**
 * AC-4.1: Get template ID from environment variable
 * @throws PermanentError if environment variable is not set
 */
export function getTemplateId(config: TemplateConfig): string {
  const templateId = process.env[config.templateIdEnvVar]
  if (!templateId) {
    throw new PermanentError(`Missing environment variable: ${config.templateIdEnvVar}`, {
      envVar: config.templateIdEnvVar,
    })
  }
  return templateId
}

/**
 * AC-4.8: Validate that all required fields are present in personalisation
 * @throws PermanentError if any required field is missing
 */
export function validateRequiredFields(
  personalisation: Record<string, string | number>,
  config: TemplateConfig,
  eventType: string,
): void {
  const missingFields = config.requiredFields.filter(
    (field) => personalisation[field] === undefined || personalisation[field] === null,
  )

  if (missingFields.length > 0) {
    throw new PermanentError(`Missing required personalisation fields: ${missingFields.join(", ")}`, {
      eventType,
      missingFields,
      requiredFields: config.requiredFields,
    })
  }
}

/**
 * AC-4.9: Apply default values for optional fields
 * Optional fields default to empty string if not provided
 */
export function applyOptionalDefaults(
  personalisation: Record<string, string | number>,
  config: TemplateConfig,
): Record<string, string | number> {
  const result = { ...personalisation }
  for (const field of config.optionalFields) {
    if (result[field] === undefined || result[field] === null) {
      result[field] = ""
    }
  }
  return result
}

// =============================================================================
// Personalisation Builders (AC-4.2, AC-4.3, AC-4.4, AC-4.5, AC-4.6)
// =============================================================================

/**
 * Get environment configuration for portal links
 */
function getPortalConfig(): { secret: string; url: string } | null {
  const secret = process.env.PORTAL_LINK_SECRET
  const url = process.env.PORTAL_URL

  if (!secret || !url) {
    logger.warn("Portal link configuration missing, links will be omitted", {
      hasSecret: !!secret,
      hasUrl: !!url,
    })
    return null
  }

  return { secret, url }
}

/**
 * AC-4.2: Build personalisation for LeaseRequested event
 */
export function buildLeaseRequestedPersonalisation(
  event: ValidatedEvent<LeaseRequestedDetail>,
): Record<string, string | number> {
  const { detail } = event

  // Handle different ISB field names for email
  const userEmail = detail.userEmail || detail.principalEmail || "user@gov.uk"
  const userName = userEmail.split("@")[0]

  // ISB may send requestTime or requestedAt
  const requestTime = detail.requestTime || detail.requestedAt || new Date().toISOString()

  return {
    userName,
    templateName: detail.templateName || detail.leaseTemplateName || "Standard Sandbox",
    leaseTemplateId: detail.leaseTemplateId || "",
    requestTime,
    comments: "", // Optional, can be enriched later
  }
}

/**
 * Helper to extract lease key from ISB event detail
 * ISB sends leaseId as either a string (UUID) or object { userEmail, uuid }
 */
function extractLeaseKey(detail: {
  leaseId?: string | { userEmail: string; uuid: string }
  userEmail?: string
  principalEmail?: string
}): LeaseKey {
  const leaseId = detail.leaseId

  // ISB sends leaseId as string (UUID) - we need to get userEmail from the event
  if (typeof leaseId === "string") {
    const userEmail = detail.userEmail || detail.principalEmail || "unknown@gov.uk"
    return { userEmail, uuid: leaseId }
  }

  // Legacy format: leaseId is object with { userEmail, uuid }
  if (leaseId && typeof leaseId === "object") {
    return { userEmail: leaseId.userEmail, uuid: leaseId.uuid }
  }

  // Fallback
  return { userEmail: detail.userEmail || "unknown@gov.uk", uuid: "unknown" }
}

/**
 * AC-4.3: Build personalisation for LeaseApproved event
 * AC-4.4: Includes portal deep link for immediate access
 * AC-4.14: Includes "Increase Budget" quick action link
 *
 * NOTE: ISB may send different field names:
 * - expiresAt or expirationDate for expiry
 * - budget or maxSpend for budget limit
 * - leaseId as string (UUID) or object { userEmail, uuid }
 */
export function buildLeaseApprovedPersonalisation(
  event: ValidatedEvent<LeaseApprovedDetail>,
): Record<string, string | number> {
  const { detail } = event
  const leaseKey = extractLeaseKey(detail)

  // Extract user name from email (handle different ISB field names)
  const userEmail = detail.userEmail || detail.principalEmail || leaseKey.userEmail
  const userName = userEmail.split("@")[0]

  // ISB sends expiry as either expirationDate or expiresAt - format for UK display
  const rawExpiryDate = detail.expirationDate || detail.expiresAt
  const expiryDate = rawExpiryDate ? formatUKDate(rawExpiryDate) : "Not specified"

  // ISB sends budget as either maxSpend or budget
  const budgetLimit = detail.maxSpend ?? detail.budget ?? 0

  // Extract lease template info (new required fields)
  const leaseTemplateName = detail.leaseTemplateName || detail.templateName || "Sandbox"
  const leaseTemplateUUID = detail.leaseTemplateId || detail.templateId || leaseKey.uuid

  const personalisation: Record<string, string | number> = {
    userName,
    accountId: detail.accountId || "Pending",
    ssoUrl: detail.ssoUrl || "",
    expiryDate,
    budgetLimit: formatCurrency(budgetLimit),
    templateName: leaseTemplateName,
    leaseTemplateName,
    leaseTemplateId: leaseTemplateUUID,
    leaseTemplateUUID,
    budgetDisclaimer: getBudgetDisclaimer(new Date().toISOString()),
  }

  // AC-4.4, AC-4.10: Add portal links if configured
  const portalConfig = getPortalConfig()
  if (portalConfig) {
    // AC-4.10: View in Portal link
    personalisation.portalLink = generatePortalLink(leaseKey, "view", portalConfig.secret, portalConfig.url)

    // AC-4.14: Increase Budget quick action link
    personalisation.budgetActionLink = generateBudgetActionLink(leaseKey, portalConfig.secret, portalConfig.url)

    // AC-4.18: Plain-text fallback link
    personalisation.plainTextLink = getPlainTextLink(portalConfig.url, leaseKey)

    // AC-4.19: Link instructions
    personalisation.linkInstructions = LINK_INSTRUCTIONS
  }

  return personalisation
}

/**
 * AC-4.5: Build personalisation for LeaseDenied event
 */
export function buildLeaseDeniedPersonalisation(
  event: ValidatedEvent<LeaseDeniedDetail>,
): Record<string, string | number> {
  const { detail } = event
  const leaseKey = extractLeaseKey(detail)

  // Extract user name from email (handle different ISB field names)
  const userEmail = detail.userEmail || detail.principalEmail || leaseKey.userEmail
  const userName = userEmail.split("@")[0]

  const personalisation: Record<string, string | number> = {
    userName,
    templateName: detail.templateName || "",
    leaseTemplateId: detail.leaseTemplateId || "",
    reason: detail.reason || "Request was not approved",
    deniedBy: detail.deniedBy || "Administrator",
  }

  // AC-4.10: Add portal links if configured
  const portalConfig = getPortalConfig()
  if (portalConfig) {
    personalisation.portalLink = generatePortalLink(leaseKey, "view", portalConfig.secret, portalConfig.url)
    personalisation.plainTextLink = getPlainTextLink(portalConfig.url, leaseKey)
    personalisation.linkInstructions = LINK_INSTRUCTIONS
  }

  return personalisation
}

/**
 * AC-4.6: Build personalisation for LeaseTerminated event
 * AC-4.7: Maps raw termination reason to human-readable text
 */
export function buildLeaseTerminatedPersonalisation(
  event: ValidatedEvent<LeaseTerminatedDetail>,
): Record<string, string | number> {
  const { detail } = event
  const leaseKey = extractLeaseKey(detail)

  // Extract user name from email (handle different ISB field names)
  const userEmail = detail.userEmail || detail.principalEmail || leaseKey.userEmail
  const userName = userEmail.split("@")[0]

  // ISB sends reason as either a string or object { type: string }
  let reason: string
  if (typeof detail.reason === "string") {
    reason = detail.reason
  } else if (detail.reason && typeof detail.reason === "object") {
    reason = getHumanReadableReason(detail.reason)
  } else {
    reason = "Your sandbox lease has been terminated."
  }

  const personalisation: Record<string, string | number> = {
    userName,
    accountId: detail.accountId || "",
    // AC-4.7: Human-readable reason
    reason,
    finalCost: detail.totalCostAccrued ?? detail.costAccrued ?? 0,
  }

  // AC-4.10: Add portal links if configured
  const portalConfig = getPortalConfig()
  if (portalConfig) {
    personalisation.portalLink = generatePortalLink(leaseKey, "view", portalConfig.secret, portalConfig.url)
    personalisation.plainTextLink = getPlainTextLink(portalConfig.url, leaseKey)
    personalisation.linkInstructions = LINK_INSTRUCTIONS
  }

  return personalisation
}

// =============================================================================
// Monitoring Alert Personalisation Builders (AC-5.1 to AC-5.15)
// =============================================================================

/**
 * AC-5.1: Build personalisation for LeaseBudgetThresholdAlert event
 * AC-5.8: Formats currency with GBP symbol
 * AC-5.10: Formats percentage with % symbol
 * AC-5.11: Includes enriched.maxSpend if different from event
 * AC-5.12: Includes budget data disclaimer with timestamp
 */
export function buildBudgetThresholdPersonalisation(
  event: ValidatedEvent<LeaseBudgetThresholdAlertDetail>,
  enrichedData?: EnrichedData,
): Record<string, string | number> {
  const { detail } = event
  const leaseKey: LeaseKey = {
    userEmail: detail.leaseId.userEmail,
    uuid: detail.leaseId.uuid,
  }

  // AC-5.13: Check for enrichment conflicts
  if (enrichedData) {
    detectEnrichmentConflict(event.eventType, enrichedData)
  }

  const personalisation: Record<string, string | number> = {
    userName: detail.userEmail.split("@")[0],
    // AC-5.8: Format currency
    currentSpend: formatCurrency(detail.currentSpend),
    budgetLimit: formatCurrency(detail.budgetLimit),
    // AC-5.10: Format percentage
    percentUsed: formatPercentage(detail.thresholdPercent),
    // AC-5.12: Budget disclaimer
    budgetDisclaimer: getBudgetDisclaimer(event.timestamp),
  }

  // AC-5.11: Include enriched max spend if different
  const enrichedMaxSpend = getBudgetDiscrepancy(detail.budgetLimit, enrichedData)
  if (enrichedMaxSpend) {
    personalisation.enrichedMaxSpend = enrichedMaxSpend
  }

  // Add portal links if configured
  const portalConfig = getPortalConfig()
  if (portalConfig) {
    personalisation.portalLink = generatePortalLink(leaseKey, "view", portalConfig.secret, portalConfig.url)
    personalisation.plainTextLink = getPlainTextLink(portalConfig.url, leaseKey)
    personalisation.linkInstructions = LINK_INSTRUCTIONS
  }

  return personalisation
}

/**
 * AC-5.2: Build personalisation for LeaseDurationThresholdAlert event
 * AC-5.3: Defaults timezone to Europe/London
 * AC-5.9: Formats date in UK format
 */
export function buildDurationThresholdPersonalisation(
  event: ValidatedEvent<LeaseDurationThresholdAlertDetail>,
  enrichedData?: EnrichedData,
): Record<string, string | number> {
  const { detail } = event
  const leaseKey: LeaseKey = {
    userEmail: detail.leaseId.userEmail,
    uuid: detail.leaseId.uuid,
  }

  // AC-5.13: Check for enrichment conflicts
  if (enrichedData) {
    detectEnrichmentConflict(event.eventType, enrichedData)
  }

  // AC-5.3: Default timezone to Europe/London, or use enriched user preference
  const timezone = enrichedData?.userTimezone || DEFAULT_TIMEZONE

  const personalisation: Record<string, string | number> = {
    userName: detail.userEmail.split("@")[0],
    hoursRemaining: Math.round(detail.hoursRemaining),
    // AC-5.9: UK date format
    expiryDate: formatUKDate(detail.expirationDate, timezone),
    timezone: timezone,
  }

  // Add portal links if configured
  const portalConfig = getPortalConfig()
  if (portalConfig) {
    personalisation.portalLink = generatePortalLink(leaseKey, "view", portalConfig.secret, portalConfig.url)
    personalisation.plainTextLink = getPlainTextLink(portalConfig.url, leaseKey)
    personalisation.linkInstructions = LINK_INSTRUCTIONS
  }

  return personalisation
}

/**
 * AC-5.4: Build personalisation for LeaseFreezingThresholdAlert event
 * AC-5.9: Formats date in UK format
 */
export function buildFreezingThresholdPersonalisation(
  event: ValidatedEvent<LeaseFreezingThresholdAlertDetail>,
  enrichedData?: EnrichedData,
): Record<string, string | number> {
  const { detail } = event
  const leaseKey: LeaseKey = {
    userEmail: detail.leaseId.userEmail,
    uuid: detail.leaseId.uuid,
  }

  // AC-5.13: Check for enrichment conflicts
  if (enrichedData) {
    detectEnrichmentConflict(event.eventType, enrichedData)
  }

  const timezone = enrichedData?.userTimezone || DEFAULT_TIMEZONE

  const personalisation: Record<string, string | number> = {
    userName: detail.userEmail.split("@")[0],
    reason: detail.reason,
    // AC-5.9: UK date format
    freezeTime: formatUKDate(detail.freezeTime, timezone),
  }

  // Add portal links if configured
  const portalConfig = getPortalConfig()
  if (portalConfig) {
    personalisation.portalLink = generatePortalLink(leaseKey, "view", portalConfig.secret, portalConfig.url)
    personalisation.plainTextLink = getPlainTextLink(portalConfig.url, leaseKey)
    personalisation.linkInstructions = LINK_INSTRUCTIONS
  }

  return personalisation
}

/**
 * AC-5.5: Build personalisation for LeaseBudgetExceeded event
 * AC-5.8: Formats currency with GBP symbol
 * AC-5.12: Includes budget data disclaimer
 */
export function buildBudgetExceededPersonalisation(
  event: ValidatedEvent<LeaseBudgetExceededDetail>,
  enrichedData?: EnrichedData,
): Record<string, string | number> {
  const { detail } = event
  const leaseKey: LeaseKey = {
    userEmail: detail.leaseId.userEmail,
    uuid: detail.leaseId.uuid,
  }

  // AC-5.13: Check for enrichment conflicts
  if (enrichedData) {
    detectEnrichmentConflict(event.eventType, enrichedData)
  }

  const personalisation: Record<string, string | number> = {
    userName: detail.userEmail.split("@")[0],
    // AC-5.8: Format currency
    finalSpend: formatCurrency(detail.currentSpend),
    budgetLimit: formatCurrency(detail.budgetLimit),
    // AC-5.12: Budget disclaimer
    budgetDisclaimer: getBudgetDisclaimer(event.timestamp),
  }

  // Add portal links if configured
  const portalConfig = getPortalConfig()
  if (portalConfig) {
    personalisation.portalLink = generatePortalLink(leaseKey, "view", portalConfig.secret, portalConfig.url)
    personalisation.plainTextLink = getPlainTextLink(portalConfig.url, leaseKey)
    personalisation.linkInstructions = LINK_INSTRUCTIONS
  }

  return personalisation
}

/**
 * AC-5.6: Build personalisation for LeaseExpired event
 * AC-5.9: Formats date in UK format
 */
export function buildLeaseExpiredPersonalisation(
  event: ValidatedEvent<LeaseExpiredDetail>,
  enrichedData?: EnrichedData,
): Record<string, string | number> {
  const { detail } = event
  const leaseKey: LeaseKey = {
    userEmail: detail.leaseId.userEmail,
    uuid: detail.leaseId.uuid,
  }

  // AC-5.13: Check for enrichment conflicts
  if (enrichedData) {
    detectEnrichmentConflict(event.eventType, enrichedData)
  }

  const timezone = enrichedData?.userTimezone || DEFAULT_TIMEZONE

  const personalisation: Record<string, string | number> = {
    userName: detail.userEmail.split("@")[0],
    accountId: detail.accountId || "",
    // AC-5.9: UK date format
    expiryTime: formatUKDate(detail.expiredAt, timezone),
  }

  // Add portal links if configured
  const portalConfig = getPortalConfig()
  if (portalConfig) {
    personalisation.portalLink = generatePortalLink(leaseKey, "view", portalConfig.secret, portalConfig.url)
    personalisation.plainTextLink = getPlainTextLink(portalConfig.url, leaseKey)
    personalisation.linkInstructions = LINK_INSTRUCTIONS
  }

  return personalisation
}

/**
 * AC-5.7: Build personalisation for LeaseFrozen event
 * Includes human-readable reason and resume instructions
 */
export function buildLeaseFrozenPersonalisation(
  event: ValidatedEvent<LeaseFrozenDetail>,
  enrichedData?: EnrichedData,
): Record<string, string | number> {
  const { detail } = event
  const leaseKey: LeaseKey = {
    userEmail: detail.leaseId.userEmail,
    uuid: detail.leaseId.uuid,
  }

  // AC-5.13: Check for enrichment conflicts
  if (enrichedData) {
    detectEnrichmentConflict(event.eventType, enrichedData)
  }

  const personalisation: Record<string, string | number> = {
    userName: detail.userEmail.split("@")[0],
    accountId: detail.accountId || "",
    // AC-5.7: Human-readable reason
    reason: getHumanReadableFreezeReason(detail.reason),
    // AC-5.7: Resume instructions based on freeze reason
    resumeInstructions: getResumeInstructions(detail.reason),
  }

  // Add portal links if configured
  const portalConfig = getPortalConfig()
  if (portalConfig) {
    personalisation.portalLink = generatePortalLink(leaseKey, "view", portalConfig.secret, portalConfig.url)
    personalisation.plainTextLink = getPlainTextLink(portalConfig.url, leaseKey)
    personalisation.linkInstructions = LINK_INSTRUCTIONS
  }

  return personalisation
}

// =============================================================================
// Billing Event Personalisation Builders
// =============================================================================

/** Default template name when enrichment fails */
const DEFAULT_TEMPLATE_NAME = "NDX:Try Session"

/**
 * Build personalisation for LeaseCostsGenerated event
 *
 * Sent when a user's billing CSV is ready for download after their NDX:Try session ends.
 *
 * @param event - Validated LeaseCostsGenerated event
 * @param enrichedData - Optional enrichment data (for templateName lookup)
 * @returns Personalisation fields for GOV.UK Notify template
 */
export function buildLeaseCostsGeneratedPersonalisation(
  event: ValidatedEvent<LeaseCostsGeneratedDetail>,
  enrichedData?: EnrichedData,
): Record<string, string | number> {
  const { detail } = event

  // Extract user name from email
  const userName = detail.userEmail.split("@")[0]

  // Use enriched templateName if available, otherwise use fallback
  // This is the only field we need from enrichment
  const templateName = enrichedData?.templateName || DEFAULT_TEMPLATE_NAME

  if (!enrichedData?.templateName) {
    logger.warn("No templateName from enrichment - using fallback", {
      eventId: event.eventId,
      fallbackTemplateName: DEFAULT_TEMPLATE_NAME,
    })
  }

  const personalisation: Record<string, string | number> = {
    userName,
    templateName,
    // Format totalCost as USD with $ symbol (e.g., "$45.67")
    totalCost: formatCurrency(detail.totalCost),
    // Format dates in simple UK format (DD/MM/YYYY)
    startDate: formatUKDate(detail.startDate + "T00:00:00Z").split(",")[0],
    endDate: formatUKDate(detail.endDate + "T00:00:00Z").split(",")[0],
    // Pass through the CSV URL directly (trusted internal service)
    csvUrl: detail.csvUrl,
    // Format URL expiry in long human-readable format: "Monday, 10 February 2026, 14:30"
    urlExpiresAt: formatUKDateLong(detail.urlExpiresAt),
  }

  return personalisation
}

// =============================================================================
// Main Build Function
// =============================================================================

/**
 * Build personalisation for any lease lifecycle or monitoring alert event
 * Dispatches to the appropriate builder based on event type
 *
 * @param event - Validated event from schema validation
 * @param enrichedData - Optional enrichment data for monitoring alerts (AC-5.11 to AC-5.15)
 * @returns Personalisation record with all required and optional fields
 * @throws PermanentError if event type is not supported or fields are missing
 */
export function buildPersonalisation(
  event: ValidatedEvent<unknown>,
  enrichedData?: EnrichedData,
): Record<string, string | number> {
  const config = getTemplateConfig(event.eventType)

  let personalisation: Record<string, string | number>

  switch (event.eventType) {
    // Lease Lifecycle Events (N5.4)
    case "LeaseRequested":
      personalisation = buildLeaseRequestedPersonalisation(event as ValidatedEvent<LeaseRequestedDetail>)
      break
    case "LeaseApproved":
      personalisation = buildLeaseApprovedPersonalisation(event as ValidatedEvent<LeaseApprovedDetail>)
      break
    case "LeaseDenied":
      personalisation = buildLeaseDeniedPersonalisation(event as ValidatedEvent<LeaseDeniedDetail>)
      break
    case "LeaseTerminated":
      personalisation = buildLeaseTerminatedPersonalisation(event as ValidatedEvent<LeaseTerminatedDetail>)
      break

    // Monitoring Alert Events (N5.5)
    case "LeaseBudgetThresholdAlert":
      personalisation = buildBudgetThresholdPersonalisation(
        event as ValidatedEvent<LeaseBudgetThresholdAlertDetail>,
        enrichedData,
      )
      break
    case "LeaseDurationThresholdAlert":
      personalisation = buildDurationThresholdPersonalisation(
        event as ValidatedEvent<LeaseDurationThresholdAlertDetail>,
        enrichedData,
      )
      break
    case "LeaseFreezingThresholdAlert":
      personalisation = buildFreezingThresholdPersonalisation(
        event as ValidatedEvent<LeaseFreezingThresholdAlertDetail>,
        enrichedData,
      )
      break
    case "LeaseBudgetExceeded":
      personalisation = buildBudgetExceededPersonalisation(
        event as ValidatedEvent<LeaseBudgetExceededDetail>,
        enrichedData,
      )
      break
    case "LeaseExpired":
      personalisation = buildLeaseExpiredPersonalisation(event as ValidatedEvent<LeaseExpiredDetail>, enrichedData)
      break
    case "LeaseFrozen":
      personalisation = buildLeaseFrozenPersonalisation(event as ValidatedEvent<LeaseFrozenDetail>, enrichedData)
      break

    // Billing Events
    case "LeaseCostsGenerated":
      personalisation = buildLeaseCostsGeneratedPersonalisation(
        event as ValidatedEvent<LeaseCostsGeneratedDetail>,
        enrichedData,
      )
      break

    default:
      throw new PermanentError(`Unsupported event type for templates: ${event.eventType}`, {
        eventType: event.eventType,
      })
  }

  // AC-4.8: Validate required fields
  validateRequiredFields(personalisation, config, event.eventType)

  // AC-4.9: Apply optional field defaults
  return applyOptionalDefaults(personalisation, config)
}

/**
 * Check if an event type is a lease lifecycle event
 */
export function isLeaseLifecycleEvent(eventType: NotificationEventType): boolean {
  return LEASE_LIFECYCLE_EVENTS.includes(eventType)
}

/**
 * Check if an event type is a monitoring alert event (N5.5)
 */
export function isMonitoringAlertEvent(eventType: NotificationEventType): boolean {
  return MONITORING_ALERT_EVENTS.includes(eventType)
}
