/**
 * Slack Alert Processor for Operations Notifications
 *
 * This module processes ops events and sends them to Slack via the SlackSender.
 * It bridges the event validation layer with the Slack messaging layer.
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
 * - User email included for lease events (ops visibility requirement)
 * - Account IDs for account-level events
 * - Timestamp validation ensures events are recent (AC-3.7)
 */

import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { SlackSender, SlackSendParams } from './slack-sender';
import {
  SLACK_TEMPLATES,
  SlackAlertType,
  isSlackAlertType,
  getSlackTemplate,
} from './slack-templates';
import type { ValidatedEvent } from './validation';
import { PermanentError } from './errors';

// =============================================================================
// Logger and Metrics
// =============================================================================

const logger = new Logger({ serviceName: 'ndx-notifications' });
const metrics = new Metrics({
  namespace: 'ndx/notifications',
  serviceName: 'ndx-notifications',
});

// =============================================================================
// Types
// =============================================================================

/**
 * AccountQuarantined event detail
 */
interface AccountQuarantinedDetail {
  accountId: string;
  reason: string;
  quarantinedAt: string;
}

/**
 * LeaseFrozen event detail for Slack
 * Note: Slack receives only account info, not user PII
 */
interface LeaseFrozenDetail {
  leaseId: { userEmail: string; uuid: string };
  accountId?: string;
  reason: {
    type: 'Expired' | 'BudgetExceeded' | 'ManuallyFrozen';
    triggeredDurationThreshold?: number;
    triggeredBudgetThreshold?: number;
    currentSpend?: number;
    budget?: number;
    comment?: string;
  };
  frozenAt: string;
}

/**
 * AccountCleanupFailed event detail
 */
interface AccountCleanupFailedDetail {
  accountId: string;
  cleanupExecutionContext?: {
    executionArn: string;
    startTime: string;
  };
  errorMessage?: string;
}

/**
 * AccountDriftDetected event detail
 */
interface AccountDriftDetectedDetail {
  accountId: string;
  expectedOU: string;
  actualOU: string;
}

/**
 * LeaseRequested event detail
 * NOTE: leaseId can be string or object depending on ISB version
 */
interface LeaseRequestedDetail {
  leaseId: string | { userEmail: string; uuid: string };
  principalEmail?: string;
  accountId?: string;
  requestedAt?: string;
  requestTime?: string;
  budget?: number;
  budgetLimit?: number;
  duration?: number;
  leaseDurationInHours?: number;
  leaseTemplateName?: string;
  templateName?: string;
  leaseTemplateId?: string;
  templateId?: string;
}

/**
 * LeaseApproved event detail
 * NOTE: leaseId can be string or object depending on ISB version
 */
interface LeaseApprovedDetail {
  leaseId: string | { userEmail: string; uuid: string };
  principalEmail?: string;
  accountId?: string;
  approvedAt?: string;
  budget?: number;
  maxSpend?: number;
  expiresAt?: string;
  expirationDate?: string;
  leaseTemplateName?: string;
  templateName?: string;
  leaseTemplateId?: string;
  templateId?: string;
}

/**
 * LeaseDenied event detail
 * NOTE: leaseId can be string or object depending on ISB version
 */
interface LeaseDeniedDetail {
  leaseId: string | { userEmail: string; uuid: string };
  principalEmail?: string;
  deniedAt?: string;
  reason?: string;
  leaseTemplateName?: string;
  templateName?: string;
  leaseTemplateId?: string;
  templateId?: string;
}

/**
 * LeaseTerminated event detail
 * NOTE: leaseId can be string or object depending on ISB version
 */
interface LeaseTerminatedDetail {
  leaseId: string | { userEmail: string; uuid: string };
  principalEmail?: string;
  accountId?: string;
  terminatedAt?: string;
  reason?: string | { type: string };
  leaseTemplateName?: string;
  templateName?: string;
  leaseTemplateId?: string;
  templateId?: string;
}

/**
 * Union type of all Slack alert event details
 */
type SlackAlertDetail =
  | AccountQuarantinedDetail
  | LeaseFrozenDetail
  | AccountCleanupFailedDetail
  | AccountDriftDetectedDetail
  | LeaseRequestedDetail
  | LeaseApprovedDetail
  | LeaseDeniedDetail
  | LeaseTerminatedDetail;

// =============================================================================
// Alert Processing Functions
// =============================================================================

/**
 * Format AccountQuarantined event for Slack notification.
 *
 * Creates a critical priority Slack alert when an AWS account is quarantined
 * due to security concerns. Includes escalation guidance and runbook links.
 *
 * Story: N6.3 - Account Quarantine Alert
 *
 * @param event - Validated EventBridge event containing quarantine details
 * @returns SlackSendParams configured for quarantine alert
 *
 * @example
 * // Event detail structure expected:
 * // { accountId: '123456789012', reason: 'Policy violation', quarantinedAt: '2024-01-15T10:30:00Z' }
 *
 * @see {@link SLACK_TEMPLATES.AccountQuarantined} for template configuration
 */
function formatQuarantineAlert(
  event: ValidatedEvent<AccountQuarantinedDetail>
): SlackSendParams {
  const template = SLACK_TEMPLATES.AccountQuarantined;
  const detail = event.detail;

  return {
    alertType: 'AccountQuarantined',
    accountId: detail.accountId,
    priority: template.priority,
    details: {
      Reason: detail.reason,
      'Quarantined At': formatTimestamp(detail.quarantinedAt),
      Severity: 'Critical',
      Guidance: template.escalationGuidance,
    },
    eventId: event.eventId,
    actionLinks: template.actionLinks,
    template: 'N/A',
    templateId: 'N/A',
  };
}

/**
 * Format LeaseFrozen event for Slack notification.
 *
 * Creates a normal priority Slack alert when a lease is frozen due to
 * budget exceeded, expiration, or manual admin action. Includes user email
 * for ops visibility and reason-specific details.
 *
 * Story: N6.4 - Account Frozen Alert
 *
 * @param event - Validated EventBridge event containing freeze details
 * @returns SlackSendParams configured for frozen alert with reason-specific fields
 *
 * @example
 * // Event detail structure expected:
 * // { leaseId: { userEmail: 'user@gov.uk', uuid: 'lease-123' },
 * //   accountId: '123456789012',
 * //   reason: { type: 'BudgetExceeded', currentSpend: 450, budget: 500 },
 * //   frozenAt: '2024-01-15T10:30:00Z' }
 *
 * @see {@link formatFreezeReason} for reason-specific detail formatting
 */
function formatFrozenAlert(
  event: ValidatedEvent<LeaseFrozenDetail>
): SlackSendParams {
  const template = SLACK_TEMPLATES.LeaseFrozen;
  const detail = event.detail;

  // Format reason based on type (AC-4.2, AC-4.4, AC-4.5, AC-4.6)
  const reasonDetails = formatFreezeReason(detail.reason);

  return {
    alertType: 'LeaseFrozen',
    accountId: detail.accountId || 'Unknown',
    priority: template.priority,
    details: {
      User: detail.leaseId.userEmail || 'Unknown',
      'Freeze Type': detail.reason.type,
      ...reasonDetails,
      'Frozen At': formatTimestamp(detail.frozenAt),
      'Lease ID': detail.leaseId.uuid,
    },
    eventId: event.eventId,
    actionLinks: template.actionLinks,
    template: 'N/A',
    templateId: 'N/A',
  };
}

/**
 * Format freeze reason details based on type
 */
function formatFreezeReason(reason: LeaseFrozenDetail['reason']): Record<string, string | number | undefined> {
  switch (reason.type) {
    case 'BudgetExceeded':
      return {
        'Current Spend': reason.currentSpend
          ? `$${reason.currentSpend.toFixed(2)}`
          : undefined,
        'Budget Limit': reason.budget
          ? `$${reason.budget.toFixed(2)}`
          : undefined,
        'Threshold Triggered': reason.triggeredBudgetThreshold
          ? `${reason.triggeredBudgetThreshold}%`
          : undefined,
      };
    case 'Expired':
      return {
        'Duration Threshold': reason.triggeredDurationThreshold
          ? `${reason.triggeredDurationThreshold} hours`
          : undefined,
      };
    case 'ManuallyFrozen':
      return {
        Comment: reason.comment || 'No comment provided',
      };
    default:
      return {};
  }
}

/**
 * Format AccountCleanupFailed event for Slack notification.
 *
 * Creates a critical priority Slack alert when account cleanup automation fails.
 * Includes a direct link to the Step Functions execution for debugging.
 * Requires immediate ops intervention to manually clean up resources.
 *
 * Story: N6.5 - Account Cleanup Failure Alert
 *
 * @param event - Validated EventBridge event containing cleanup failure details
 * @returns SlackSendParams configured for cleanup failure alert
 *
 * @example
 * // Event detail structure expected:
 * // { accountId: '123456789012',
 * //   cleanupExecutionContext: { executionArn: 'arn:aws:states:...', startTime: '2024-01-15T10:30:00Z' },
 * //   errorMessage: 'Resource deletion failed' }
 *
 * @see {@link buildStepFunctionsLink} for execution URL generation
 */
function formatCleanupFailedAlert(
  event: ValidatedEvent<AccountCleanupFailedDetail>
): SlackSendParams {
  const template = SLACK_TEMPLATES.AccountCleanupFailed;
  const detail = event.detail;

  // Build action links with dynamic execution ARN (AC-5.3)
  const actionLinks = [...template.actionLinks];
  if (detail.cleanupExecutionContext?.executionArn) {
    // Add direct link to the specific execution
    const executionLink = buildStepFunctionsLink(
      detail.cleanupExecutionContext.executionArn
    );
    if (executionLink) {
      actionLinks.unshift({
        label: 'View Failed Execution',
        url: executionLink,
        style: 'danger' as const,
      });
    }
  }

  return {
    alertType: 'AccountCleanupFailed',
    accountId: detail.accountId,
    priority: template.priority,
    details: {
      'Error Message': detail.errorMessage || 'Cleanup automation failed',
      'Cleanup Started': detail.cleanupExecutionContext?.startTime
        ? formatTimestamp(detail.cleanupExecutionContext.startTime)
        : 'Unknown',
      Severity: 'Critical',
      Guidance: template.escalationGuidance,
    },
    eventId: event.eventId,
    actionLinks,
    template: 'N/A',
    templateId: 'N/A',
  };
}

/**
 * Format AccountDriftDetected event for Slack notification.
 *
 * Creates a critical priority Slack alert when an AWS account is detected
 * in an unexpected Organizational Unit. Includes expected vs actual OU
 * for quick diagnosis and remediation.
 *
 * Story: N6.6 - Account Drift Detection Alert
 *
 * @param event - Validated EventBridge event containing drift details
 * @returns SlackSendParams configured for drift detection alert
 *
 * @example
 * // Event detail structure expected:
 * // { accountId: '123456789012', expectedOU: 'ou-sandbox', actualOU: 'ou-production' }
 */
function formatDriftAlert(
  event: ValidatedEvent<AccountDriftDetectedDetail>
): SlackSendParams {
  const template = SLACK_TEMPLATES.AccountDriftDetected;
  const detail = event.detail;

  return {
    alertType: 'AccountDriftDetected',
    accountId: detail.accountId,
    priority: template.priority,
    details: {
      'Expected OU': detail.expectedOU,
      'Actual OU': detail.actualOU,
      Status: 'Drift Detected',
      Severity: 'Critical',
      Guidance: template.escalationGuidance,
    },
    eventId: event.eventId,
    actionLinks: template.actionLinks,
    template: 'N/A',
    templateId: 'N/A',
  };
}

// =============================================================================
// Lease Lifecycle Alert Formatters
// =============================================================================

/**
 * Extract lease ID string from leaseId field (handles string or object format)
 */
function extractLeaseId(leaseId: string | { userEmail?: string; uuid?: string } | undefined): string {
  if (!leaseId) return 'Unknown';
  if (typeof leaseId === 'string') return leaseId;
  return leaseId.uuid || 'Unknown';
}

/**
 * Extract user email from leaseId field (handles string or object format)
 */
function extractUserEmail(leaseId: string | { userEmail?: string; uuid?: string } | undefined): string | undefined {
  if (!leaseId) return undefined;
  if (typeof leaseId === 'object' && leaseId.userEmail) {
    return leaseId.userEmail;
  }
  return undefined;
}

/**
 * Format LeaseRequested event for Slack notification.
 *
 * Creates a normal priority Slack alert when a user submits a new sandbox request.
 * Includes user email, template name, budget, and duration for ops visibility.
 *
 * @param event - Validated EventBridge event containing lease request details
 * @returns SlackSendParams configured for lease requested alert
 *
 * @example
 * // Event detail structure expected:
 * // { leaseId: { userEmail: 'user@gov.uk', uuid: 'lease-123' },
 * //   accountId: 'Pending', budget: 500, duration: 720,
 * //   leaseTemplateName: 'Standard Sandbox', leaseTemplateId: 'template-uuid' }
 */
function formatLeaseRequestedAlert(
  event: ValidatedEvent<LeaseRequestedDetail>
): SlackSendParams {
  const template = SLACK_TEMPLATES.LeaseRequested;
  const detail = event.detail;
  const budget = detail.budget || detail.budgetLimit;
  const duration = detail.duration || detail.leaseDurationInHours;
  const requestedAt = detail.requestedAt || detail.requestTime;
  const userEmail = extractUserEmail(detail.leaseId);
  const templateName = detail.leaseTemplateName || detail.templateName;
  const templateId = detail.leaseTemplateId || detail.templateId;

  return {
    alertType: 'LeaseRequested',
    accountId: detail.accountId || 'Pending',
    priority: template.priority,
    details: {
      User: userEmail || detail.principalEmail || 'Unknown',
      Template: templateName || 'Standard Sandbox',
      'Lease ID': extractLeaseId(detail.leaseId),
      'Requested At': requestedAt ? formatTimestamp(requestedAt) : 'Unknown',
      Budget: budget ? `$${budget}` : 'Not specified',
      Duration: duration ? `${duration} hours` : 'Not specified',
    },
    eventId: event.eventId,
    actionLinks: template.actionLinks,
    template: templateName,
    templateId: templateId,
  };
}

/**
 * Format LeaseApproved event for Slack notification.
 *
 * Creates a normal priority Slack alert when a sandbox request is approved.
 * Includes user email, account ID, budget, and expiration date.
 *
 * @param event - Validated EventBridge event containing lease approval details
 * @returns SlackSendParams configured for lease approved alert
 */
function formatLeaseApprovedAlert(
  event: ValidatedEvent<LeaseApprovedDetail>
): SlackSendParams {
  const template = SLACK_TEMPLATES.LeaseApproved;
  const detail = event.detail;
  const budget = detail.budget || detail.maxSpend;
  const expires = detail.expiresAt || detail.expirationDate;
  const userEmail = extractUserEmail(detail.leaseId);
  const templateName = detail.leaseTemplateName || detail.templateName;
  const templateId = detail.leaseTemplateId || detail.templateId;

  return {
    alertType: 'LeaseApproved',
    accountId: detail.accountId || 'Unknown',
    priority: template.priority,
    details: {
      User: userEmail || detail.principalEmail || 'Unknown',
      Template: templateName || 'Standard Sandbox',
      'Lease ID': extractLeaseId(detail.leaseId),
      'Approved At': detail.approvedAt ? formatTimestamp(detail.approvedAt) : 'Unknown',
      Budget: budget ? `$${budget}` : 'Not specified',
      Expires: expires ? formatTimestamp(expires) : 'Not specified',
    },
    eventId: event.eventId,
    actionLinks: template.actionLinks,
    template: templateName,
    templateId: templateId,
  };
}

/**
 * Format LeaseDenied event for Slack notification.
 *
 * Creates a normal priority Slack alert when a sandbox request is denied.
 * Includes user email and denial reason for ops awareness.
 *
 * @param event - Validated EventBridge event containing lease denial details
 * @returns SlackSendParams configured for lease denied alert
 */
function formatLeaseDeniedAlert(
  event: ValidatedEvent<LeaseDeniedDetail>
): SlackSendParams {
  const template = SLACK_TEMPLATES.LeaseDenied;
  const detail = event.detail;
  const userEmail = extractUserEmail(detail.leaseId);
  const templateName = detail.leaseTemplateName || detail.templateName;
  const templateId = detail.leaseTemplateId || detail.templateId;

  return {
    alertType: 'LeaseDenied',
    accountId: 'N/A',
    priority: template.priority,
    details: {
      User: userEmail || detail.principalEmail || 'Unknown',
      'Lease ID': extractLeaseId(detail.leaseId),
      'Denied At': detail.deniedAt ? formatTimestamp(detail.deniedAt) : 'Unknown',
      Reason: detail.reason || 'Not provided',
    },
    eventId: event.eventId,
    actionLinks: template.actionLinks,
    template: templateName,
    templateId: templateId,
  };
}

/**
 * Format LeaseTerminated event for Slack notification.
 *
 * Creates a normal priority Slack alert when a sandbox lease is terminated.
 * Includes user email, account ID, and termination reason.
 *
 * @param event - Validated EventBridge event containing lease termination details
 * @returns SlackSendParams configured for lease terminated alert
 */
function formatLeaseTerminatedAlert(
  event: ValidatedEvent<LeaseTerminatedDetail>
): SlackSendParams {
  const template = SLACK_TEMPLATES.LeaseTerminated;
  const detail = event.detail;
  const reason = typeof detail.reason === 'object' ? detail.reason.type : (detail.reason || 'User or admin initiated');
  const userEmail = extractUserEmail(detail.leaseId);
  const templateName = detail.leaseTemplateName || detail.templateName;
  const templateId = detail.leaseTemplateId || detail.templateId;

  return {
    alertType: 'LeaseTerminated',
    accountId: detail.accountId || 'Unknown',
    priority: template.priority,
    details: {
      User: userEmail || detail.principalEmail || 'Unknown',
      'Lease ID': extractLeaseId(detail.leaseId),
      'Terminated At': detail.terminatedAt ? formatTimestamp(detail.terminatedAt) : 'Unknown',
      Reason: reason,
    },
    eventId: event.eventId,
    actionLinks: template.actionLinks,
    template: templateName,
    templateId: templateId,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format ISO timestamp to human-readable UTC string (AC-3.4)
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  } catch {
    return isoString;
  }
}

/**
 * Build Step Functions execution URL from ARN (AC-5.3)
 */
function buildStepFunctionsLink(executionArn: string): string | undefined {
  // ARN format: arn:aws:states:region:account:execution:state-machine:execution-id
  const arnParts = executionArn.split(':');
  if (arnParts.length < 7) return undefined;

  const region = arnParts[3];
  // URL encode the full ARN for the console link
  const encodedArn = encodeURIComponent(executionArn);

  return `https://${region}.console.aws.amazon.com/states/home?region=${region}#/v2/executions/details/${encodedArn}`;
}

// =============================================================================
// Main Processing Function
// =============================================================================

/**
 * Process a Slack alert event and send to Slack
 *
 * @param event - Validated EventBridge event
 * @returns Promise that resolves when alert is sent
 * @throws RetriableError, PermanentError, CriticalError
 */
export async function processSlackAlert(
  event: ValidatedEvent<SlackAlertDetail>
): Promise<void> {
  const startTime = Date.now();
  const alertType = event.eventType;

  // Validate alert type has a template
  if (!isSlackAlertType(alertType)) {
    throw new PermanentError(`Unknown Slack alert type: ${alertType}`);
  }

  logger.info('Processing Slack alert', {
    eventId: event.eventId,
    alertType,
    accountId: (event.detail as { accountId?: string }).accountId || 'Unknown',
  });

  // Get the appropriate formatter based on alert type
  let params: SlackSendParams;

  switch (alertType) {
    case 'AccountQuarantined':
      params = formatQuarantineAlert(
        event as ValidatedEvent<AccountQuarantinedDetail>
      );
      break;
    case 'LeaseFrozen':
      params = formatFrozenAlert(event as ValidatedEvent<LeaseFrozenDetail>);
      break;
    case 'AccountCleanupFailed':
      params = formatCleanupFailedAlert(
        event as ValidatedEvent<AccountCleanupFailedDetail>
      );
      break;
    case 'AccountDriftDetected':
      params = formatDriftAlert(
        event as ValidatedEvent<AccountDriftDetectedDetail>
      );
      break;
    case 'LeaseRequested':
      params = formatLeaseRequestedAlert(
        event as ValidatedEvent<LeaseRequestedDetail>
      );
      break;
    case 'LeaseApproved':
      params = formatLeaseApprovedAlert(
        event as ValidatedEvent<LeaseApprovedDetail>
      );
      break;
    case 'LeaseDenied':
      params = formatLeaseDeniedAlert(
        event as ValidatedEvent<LeaseDeniedDetail>
      );
      break;
    case 'LeaseTerminated':
      params = formatLeaseTerminatedAlert(
        event as ValidatedEvent<LeaseTerminatedDetail>
      );
      break;
    default:
      throw new PermanentError(`Unhandled Slack alert type: ${alertType}`);
  }

  // Send via SlackSender
  const sender = await SlackSender.getInstance();
  await sender.send(params);

  // Log success with latency (AC-3.7)
  const latencyMs = Date.now() - startTime;
  logger.info('Slack alert sent successfully', {
    eventId: event.eventId,
    alertType,
    latencyMs,
  });

  // Emit metrics
  metrics.addMetric('SlackAlertSent', MetricUnit.Count, 1);
  metrics.addDimension('alertType', alertType);
  metrics.addMetric('SlackAlertLatency', MetricUnit.Milliseconds, latencyMs);

  // Verify latency requirement (AC-3.7: < 2 seconds)
  if (latencyMs > 2000) {
    logger.warn('Slack alert latency exceeded 2 second threshold', {
      eventId: event.eventId,
      alertType,
      latencyMs,
      threshold: 2000,
    });
    metrics.addMetric('SlackAlertLatencyExceeded', MetricUnit.Count, 1);
  }
}

/**
 * Check if an event type should be processed as a Slack alert
 */
export { isSlackAlertType, getSlackTemplate, getSlackAlertTypes } from './slack-templates';
