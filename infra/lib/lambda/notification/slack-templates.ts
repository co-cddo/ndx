/**
 * Slack Alert Templates for Operations Notifications
 *
 * This module implements the template configuration pattern for Slack alerts.
 * Each alert type has defined action links, priority, and formatting options.
 *
 * Stories:
 * - N6.3 - Account Quarantine Alert (ACs: 3.1-3.7)
 * - N6.4 - Account Frozen Alert (ACs: 4.1-4.7)
 * - N6.5 - Account Cleanup Failure Alert (ACs: 5.1-5.6)
 * - N6.6 - Account Drift Detection Alert (ACs: 6.1-6.6)
 *
 * Architecture: "One brain, two mouths" pattern
 * @see docs/notification-architecture.md#SlackSender
 *
 * Security Controls:
 * - No PII in Slack messages (account IDs only, no user emails)
 * - Action links use HTTPS only (SM-AC-5)
 * - Runbook links validated at build time (AC-NEW-13)
 */

import type { ActionLink } from './block-kit-builder';

// =============================================================================
// Types
// =============================================================================

/**
 * Slack alert types that map to EventBridge event types
 * Includes both ops alerts and lease lifecycle events.
 *
 * ## Accepted Risk: Type Union Complexity
 *
 * This union type has 8 members which may impact IDE performance on
 * very slow machines. This is accepted because:
 * 1. The union is bounded by actual event types (not arbitrary)
 * 2. TypeScript handles this union size efficiently
 * 3. Discriminated union provides excellent type safety
 * 4. Adding new event types is explicit and reviewed
 */
export type SlackAlertType =
  // Ops alerts (critical)
  | 'AccountQuarantined'
  | 'AccountCleanupFailed'
  | 'AccountDriftDetected'
  // Lease lifecycle events (informational)
  | 'LeaseRequested'
  | 'LeaseApproved'
  | 'LeaseDenied'
  | 'LeaseTerminated'
  | 'LeaseFrozen';

/**
 * Slack template configuration for each alert type
 */
export interface SlackTemplateConfig {
  /** Display name for the alert header */
  displayName: string;
  /** Priority determines color (critical = red, normal = yellow) */
  priority: 'critical' | 'normal';
  /** Action links to include in the message (AC-2.4, n6-8) */
  actionLinks: ActionLink[];
  /** Whether to include @channel mention (AC-3.6) */
  includeMention: boolean;
  /** Escalation guidance text (AC-3.5) */
  escalationGuidance: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Base URLs for action links
 * These should come from environment variables in production
 */
const AWS_CONSOLE_BASE_URL =
  process.env.AWS_CONSOLE_URL || 'https://console.aws.amazon.com';
const ISB_ADMIN_BASE_URL =
  process.env.ISB_ADMIN_URL || 'https://isb-admin.example.gov.uk';
const RUNBOOK_BASE_URL =
  process.env.RUNBOOK_URL || 'https://wiki.example.gov.uk/runbooks';

// =============================================================================
// Template Registry (n6-3 through n6-6)
// =============================================================================

/**
 * Slack template configurations for each alert type
 *
 * AC-3.5: Each alert includes escalation guidance
 * AC-CROSS-4: Each alert includes runbook links (n6-8)
 */
export const SLACK_TEMPLATES: Record<SlackAlertType, SlackTemplateConfig> = {
  /**
   * Account Quarantine Alert (n6-3)
   *
   * AC-3.1: Header "Account Quarantine Alert"
   * AC-3.5: Escalation guidance with @ndx-ops
   * AC-3.6: @channel mention for critical alerts
   */
  AccountQuarantined: {
    displayName: 'Account Quarantined',
    priority: 'critical',
    actionLinks: [
      {
        label: 'View in AWS Console',
        url: `${AWS_CONSOLE_BASE_URL}/organizations/v2/home/accounts`,
        style: 'primary',
      },
      {
        label: 'Quarantine Runbook',
        url: `${RUNBOOK_BASE_URL}/account-quarantine`,
      },
      {
        label: 'ISB Admin',
        url: `${ISB_ADMIN_BASE_URL}/accounts/quarantined`,
      },
    ],
    includeMention: true,
    escalationGuidance: 'Contact @ndx-ops for immediate assistance',
  },

  /**
   * Lease Frozen Alert (n6-4)
   *
   * AC-4.1: Header "Account Frozen Alert"
   * Note: This is a dual-channel event (email to user, Slack to ops)
   */
  LeaseFrozen: {
    displayName: 'Lease Frozen',
    priority: 'normal',
    actionLinks: [
      {
        label: 'View in ISB Admin',
        url: `${ISB_ADMIN_BASE_URL}/leases/frozen`,
      },
      {
        label: 'Freeze Runbook',
        url: `${RUNBOOK_BASE_URL}/lease-frozen`,
      },
    ],
    includeMention: false,
    escalationGuidance: 'Review frozen lease in ISB Admin dashboard',
  },

  /**
   * Account Cleanup Failure Alert (n6-5)
   *
   * AC-5.1: Header "Account Cleanup Failure Alert"
   * AC-5.3: Includes Step Functions execution link
   */
  AccountCleanupFailed: {
    displayName: 'Account Cleanup Failed',
    priority: 'critical',
    actionLinks: [
      {
        label: 'View Step Functions',
        url: `${AWS_CONSOLE_BASE_URL}/states/home`,
        style: 'danger',
      },
      {
        label: 'Cleanup Failure Runbook',
        url: `${RUNBOOK_BASE_URL}/cleanup-failure`,
      },
      {
        label: 'ISB Admin',
        url: `${ISB_ADMIN_BASE_URL}/accounts/cleanup`,
      },
    ],
    includeMention: true,
    escalationGuidance:
      'Manual cleanup required. Contact @ndx-ops immediately.',
  },

  /**
   * Account Drift Detection Alert (n6-6)
   *
   * AC-6.1: Header "Account Drift Detection Alert"
   * AC-6.4: Shows expected vs actual OU
   */
  AccountDriftDetected: {
    displayName: 'Account Drift Detected',
    priority: 'critical',
    actionLinks: [
      {
        label: 'View in AWS Organizations',
        url: `${AWS_CONSOLE_BASE_URL}/organizations/v2/home`,
        style: 'danger',
      },
      {
        label: 'Drift Runbook',
        url: `${RUNBOOK_BASE_URL}/account-drift`,
      },
    ],
    includeMention: true,
    escalationGuidance:
      'Account is in unexpected OU. Review and remediate immediately.',
  },

  // =========================================================================
  // Lease Lifecycle Events (Informational)
  // =========================================================================

  /**
   * Lease Requested - New sandbox request submitted
   */
  LeaseRequested: {
    displayName: 'Lease Requested',
    priority: 'normal',
    actionLinks: [
      {
        label: 'View in ISB Admin',
        url: `${ISB_ADMIN_BASE_URL}/leases/pending`,
        style: 'primary',
      },
    ],
    includeMention: false,
    escalationGuidance: 'New lease request awaiting approval',
  },

  /**
   * Lease Approved - Sandbox request approved
   */
  LeaseApproved: {
    displayName: 'Lease Approved',
    priority: 'normal',
    actionLinks: [
      {
        label: 'View in ISB Admin',
        url: `${ISB_ADMIN_BASE_URL}/leases/active`,
      },
    ],
    includeMention: false,
    escalationGuidance: 'Lease approved and account provisioned',
  },

  /**
   * Lease Denied - Sandbox request denied
   */
  LeaseDenied: {
    displayName: 'Lease Denied',
    priority: 'normal',
    actionLinks: [
      {
        label: 'View in ISB Admin',
        url: `${ISB_ADMIN_BASE_URL}/leases/denied`,
      },
    ],
    includeMention: false,
    escalationGuidance: 'Lease request was denied',
  },

  /**
   * Lease Terminated - Sandbox lease ended
   */
  LeaseTerminated: {
    displayName: 'Lease Terminated',
    priority: 'normal',
    actionLinks: [
      {
        label: 'View in ISB Admin',
        url: `${ISB_ADMIN_BASE_URL}/leases/terminated`,
      },
    ],
    includeMention: false,
    escalationGuidance: 'Lease terminated and cleanup initiated',
  },
};

// =============================================================================
// Template Lookup Functions
// =============================================================================

/**
 * Get template configuration for an alert type
 *
 * @param alertType - The type of Slack alert
 * @returns Template configuration or undefined if not found
 */
export function getSlackTemplate(
  alertType: SlackAlertType
): SlackTemplateConfig | undefined {
  return SLACK_TEMPLATES[alertType];
}

/**
 * Check if an event type should be sent to Slack
 *
 * @param eventType - The EventBridge event type
 * @returns true if this event type has a Slack template
 */
export function isSlackAlertType(eventType: string): eventType is SlackAlertType {
  return eventType in SLACK_TEMPLATES;
}

/**
 * Get all Slack alert types
 *
 * @returns Array of all configured Slack alert types
 */
export function getSlackAlertTypes(): SlackAlertType[] {
  return Object.keys(SLACK_TEMPLATES) as SlackAlertType[];
}
