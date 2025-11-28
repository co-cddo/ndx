/**
 * Slack Block Kit Builder for NDX Notification System
 *
 * Provides type-safe utilities for constructing Slack Block Kit payloads
 * with proper formatting, escaping, and validation.
 *
 * Architecture: Shared by all alert types in the "one brain, two mouths" pattern
 * @see docs/notification-architecture.md#SlackSender
 *
 * Slack Block Kit Reference:
 * - Block Types: https://api.slack.com/reference/block-kit/blocks
 * - Attachment Colors: https://api.slack.com/reference/messaging/attachments
 * - mrkdwn Format: https://api.slack.com/reference/surfaces/formatting
 */

// =========================================================================
// Constants
// =========================================================================

/**
 * Priority color codes for Slack attachments (AC-2.2, AC-2.3)
 * Using hex colors for consistent rendering
 */
export const PRIORITY_COLORS = {
  /** Red for critical alerts (AC-2.2) */
  critical: '#D93025',
  /** Yellow/amber for normal priority (AC-2.3) */
  normal: '#F4B400',
} as const;

/**
 * Maximum text length for Slack text blocks (EC-AC-7)
 * Slack limit is 3000, but we use 2500 for safety margin
 */
export const MAX_TEXT_LENGTH = 2500;

/**
 * Slack Alert version for metadata tracking (AC-2.5)
 */
export const SLACK_ALERT_VERSION = 'v1';

// =========================================================================
// Block Kit Types (SM-AC-3)
// =========================================================================

/**
 * Slack text object with type and content
 */
export interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
}

/**
 * Header block for alert title (AC-2.1)
 */
export interface HeaderBlock {
  type: 'header';
  text: SlackTextObject;
}

/**
 * Field object for section blocks
 */
export interface SectionField {
  type: 'mrkdwn';
  text: string;
}

/**
 * Section block with optional fields (AC-2.1)
 */
export interface SectionBlock {
  type: 'section';
  text?: SlackTextObject;
  fields?: SectionField[];
}

/**
 * Context block element
 */
export interface ContextElement {
  type: 'mrkdwn' | 'plain_text';
  text: string;
}

/**
 * Context block for metadata (AC-2.1, AC-2.5)
 */
export interface ContextBlock {
  type: 'context';
  elements: ContextElement[];
}

/**
 * Button element for actions block
 */
export interface ButtonElement {
  type: 'button';
  text: SlackTextObject;
  url: string;
  action_id: string;
  style?: 'primary' | 'danger';
}

/**
 * Actions block for action buttons (AC-2.4)
 */
export interface ActionsBlock {
  type: 'actions';
  elements: ButtonElement[];
}

/**
 * Divider block for visual separation
 */
export interface DividerBlock {
  type: 'divider';
}

/**
 * Union of all block types
 */
export type Block =
  | HeaderBlock
  | SectionBlock
  | ContextBlock
  | ActionsBlock
  | DividerBlock;

/**
 * Slack attachment with color and blocks
 */
export interface SlackAttachment {
  color: string;
  blocks: Block[];
}

/**
 * Complete Slack Block Kit payload structure
 */
export interface SlackBlockKitPayload {
  /** Fallback text for notifications (AC-2.6) */
  text: string;
  /** Colored attachment containing blocks */
  attachments: SlackAttachment[];
}

/**
 * Action link configuration for building action buttons
 */
export interface ActionLink {
  /** Display text for the button */
  label: string;
  /** URL to navigate to */
  url: string;
  /** Button style */
  style?: 'primary' | 'danger';
}

// =========================================================================
// Text Utilities
// =========================================================================

/**
 * Escape special characters for Slack mrkdwn format (EC-AC-6)
 *
 * Slack requires escaping of &, <, > characters to prevent
 * rendering issues and potential injection.
 *
 * @param text - Raw text to escape
 * @returns Escaped text safe for mrkdwn
 */
export function escapeSlackMrkdwn(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Truncate text to maximum length with ellipsis (EC-AC-7)
 *
 * Slack text blocks have a 3000 character limit, but we truncate
 * at 2500 for safety margin and readability.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: MAX_TEXT_LENGTH)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(
  text: string,
  maxLength: number = MAX_TEXT_LENGTH
): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format a field value with N/A placeholder for missing values (EC-AC-9)
 *
 * Ensures no empty strings appear in the UI by replacing
 * undefined, null, and empty strings with "N/A".
 *
 * @param value - Value to format
 * @returns Formatted value or "N/A" placeholder
 */
export function formatFieldValue(
  value: string | number | undefined | null
): string {
  if (value === undefined || value === null) return 'N/A';
  const strValue = String(value);
  if (strValue.trim() === '') return 'N/A';
  return escapeSlackMrkdwn(strValue);
}

/**
 * Validate URL for action buttons (SM-AC-5)
 *
 * Ensures URLs are valid HTTPS URLs before including in payloads.
 * Slack requires HTTPS for button URLs.
 *
 * @param url - URL to validate
 * @returns true if valid HTTPS URL
 */
export function isValidActionUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// =========================================================================
// Block Builders
// =========================================================================

/**
 * Build a header block for the alert title (AC-2.1)
 *
 * @param title - Alert title text
 * @returns Header block
 */
export function buildHeaderBlock(title: string): HeaderBlock {
  const escapedTitle = escapeSlackMrkdwn(truncateText(title, 150));
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text: escapedTitle,
      emoji: true,
    },
  };
}

/**
 * Build a section block with key/value fields (AC-2.1)
 *
 * @param fields - Object with field names and values
 * @returns Section block with formatted fields
 */
export function buildSectionBlock(
  fields: Record<string, string | number | undefined>
): SectionBlock {
  const sectionFields: SectionField[] = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      type: 'mrkdwn' as const,
      text: `*${escapeSlackMrkdwn(key)}*\n${formatFieldValue(value)}`,
    }));

  return {
    type: 'section',
    fields: sectionFields,
  };
}

/**
 * Build a section block with text content
 *
 * @param text - Text content for the section
 * @returns Section block with text
 */
export function buildTextSection(text: string): SectionBlock {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: truncateText(escapeSlackMrkdwn(text)),
    },
  };
}

/**
 * Build a context block with event ID and version (AC-2.5, EC-AC-10)
 *
 * Includes event ID for audit trail and idempotency key for deduplication.
 *
 * @param eventId - Event ID for the alert
 * @returns Context block with metadata
 */
export function buildContextBlock(eventId: string): ContextBlock {
  const escapedEventId = escapeSlackMrkdwn(eventId);
  return {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Event ID: ${escapedEventId} | Slack Alert ${SLACK_ALERT_VERSION} | Key: ${escapedEventId}`,
      },
    ],
  };
}

/**
 * Build an actions block with action buttons (AC-2.4)
 *
 * Creates buttons for quick actions like viewing account details
 * or accessing runbooks.
 *
 * @param actions - Array of action link configurations
 * @returns Actions block with buttons, or null if no valid actions
 */
export function buildActionsBlock(actions: ActionLink[]): ActionsBlock | null {
  // Filter to valid HTTPS URLs only (SM-AC-5)
  const validActions = actions.filter((action) => isValidActionUrl(action.url));

  if (validActions.length === 0) {
    return null;
  }

  const buttons: ButtonElement[] = validActions.map((action, index) => ({
    type: 'button',
    text: {
      type: 'plain_text',
      text: truncateText(action.label, 75), // Button text limit
      emoji: true,
    },
    url: action.url,
    action_id: `action_${index}`,
    ...(action.style && { style: action.style }),
  }));

  return {
    type: 'actions',
    elements: buttons,
  };
}

/**
 * Build a divider block for visual separation
 *
 * @returns Divider block
 */
export function buildDividerBlock(): DividerBlock {
  return { type: 'divider' };
}

// =========================================================================
// Attachment Builder
// =========================================================================

/**
 * Build a complete Slack attachment with color and blocks (AC-2.2, AC-2.3)
 *
 * @param priority - Alert priority for color selection
 * @param blocks - Array of blocks to include
 * @returns Slack attachment
 */
export function buildAttachment(
  priority: 'critical' | 'normal',
  blocks: Block[]
): SlackAttachment {
  return {
    color: PRIORITY_COLORS[priority],
    blocks,
  };
}

// =========================================================================
// Payload Builder
// =========================================================================

/**
 * Alert type display names for human-readable titles
 */
const ALERT_TYPE_DISPLAY_NAMES: Record<string, string> = {
  AccountQuarantined: 'Account Quarantined',
  LeaseFrozen: 'Lease Frozen',
  AccountCleanupFailed: 'Account Cleanup Failed',
  AccountDriftDetected: 'Account Drift Detected',
};

/**
 * Priority display labels
 */
const PRIORITY_LABELS: Record<string, string> = {
  critical: 'CRITICAL',
  normal: 'Warning',
};

/**
 * Priority emoji prefixes
 */
const PRIORITY_EMOJIS: Record<string, string> = {
  critical: ':red_circle:',
  normal: ':large_yellow_circle:',
};

/**
 * Build complete Block Kit payload for a Slack alert
 *
 * Constructs a full Block Kit payload with:
 * - Header block with alert title and priority indicator
 * - Section block with key/value details
 * - Context block with event ID and version
 * - Actions block for critical alerts (if action links provided)
 * - Fallback text for notification history (AC-2.6)
 *
 * @param params - Alert parameters
 * @returns Complete Block Kit payload
 */
export interface BuildPayloadParams {
  /** Type of alert being sent */
  alertType: string;
  /** AWS account ID affected */
  accountId: string;
  /** Priority level for the alert */
  priority: 'critical' | 'normal';
  /** Additional context details */
  details: Record<string, string | number | undefined>;
  /** Event ID for audit trail */
  eventId: string;
  /** Optional action links for buttons (required for critical alerts) */
  actionLinks?: ActionLink[];
}

export function buildBlockKitPayload(
  params: BuildPayloadParams
): SlackBlockKitPayload {
  const { alertType, accountId, priority, details, eventId, actionLinks } =
    params;

  // Build fallback text for notifications (AC-2.6)
  const priorityLabel = PRIORITY_LABELS[priority] || priority;
  const displayName = ALERT_TYPE_DISPLAY_NAMES[alertType] || alertType;
  const fallbackText = `[${priorityLabel}] ${displayName} - Account: ${accountId}`;

  // Build header with priority emoji
  const emoji = PRIORITY_EMOJIS[priority] || '';
  const headerTitle = `${emoji} ${priorityLabel}: ${displayName}`;

  // Collect blocks
  const blocks: Block[] = [];

  // 1. Header block (AC-2.1)
  blocks.push(buildHeaderBlock(headerTitle));

  // 2. Section block with account and details (AC-2.1)
  const sectionFields: Record<string, string | number | undefined> = {
    'Account ID': accountId,
    ...details,
  };
  blocks.push(buildSectionBlock(sectionFields));

  // 3. Divider before context
  blocks.push(buildDividerBlock());

  // 4. Context block with event ID (AC-2.5, EC-AC-10)
  blocks.push(buildContextBlock(eventId));

  // 5. Actions block for critical alerts or if action links provided (AC-2.4)
  if (actionLinks && actionLinks.length > 0) {
    const actionsBlock = buildActionsBlock(actionLinks);
    if (actionsBlock) {
      blocks.push(actionsBlock);
    }
  }

  // Build final payload
  return {
    text: fallbackText,
    attachments: [buildAttachment(priority, blocks)],
  };
}

/**
 * Validate Block Kit payload structure (AC-2.7, SM-AC-6)
 *
 * Performs build-time validation to ensure payload matches
 * expected Slack Block Kit schema.
 *
 * @param payload - Payload to validate
 * @returns true if valid, throws error if invalid
 */
export function validateBlockKitPayload(payload: SlackBlockKitPayload): boolean {
  // Check required fields
  if (!payload.text || typeof payload.text !== 'string') {
    throw new Error('Block Kit payload missing required text field');
  }

  if (!payload.attachments || !Array.isArray(payload.attachments)) {
    throw new Error('Block Kit payload missing required attachments array');
  }

  if (payload.attachments.length === 0) {
    throw new Error('Block Kit payload has empty attachments array');
  }

  // Validate each attachment
  for (const attachment of payload.attachments) {
    if (!attachment.color || typeof attachment.color !== 'string') {
      throw new Error('Attachment missing required color field');
    }

    if (!attachment.blocks || !Array.isArray(attachment.blocks)) {
      throw new Error('Attachment missing required blocks array');
    }

    // Validate each block
    for (const block of attachment.blocks) {
      if (!block.type) {
        throw new Error('Block missing required type field');
      }

      // Type-specific validation
      switch (block.type) {
        case 'header':
          if (!block.text || !block.text.text) {
            throw new Error('Header block missing text');
          }
          break;
        case 'section':
          if (!block.text && (!block.fields || block.fields.length === 0)) {
            throw new Error('Section block must have text or fields');
          }
          break;
        case 'context':
          if (!block.elements || block.elements.length === 0) {
            throw new Error('Context block must have elements');
          }
          break;
        case 'actions':
          if (!block.elements || block.elements.length === 0) {
            throw new Error('Actions block must have elements');
          }
          break;
        case 'divider':
          // No additional validation needed
          break;
        default:
          throw new Error(`Unknown block type: ${(block as Block).type}`);
      }
    }
  }

  return true;
}
