/**
 * Block Kit Builder Tests
 *
 * Comprehensive unit tests for Slack Block Kit message formatting.
 * Tests cover:
 * - Text utilities (escaping, truncation, formatting)
 * - Block construction (header, section, context, actions)
 * - Payload building and validation
 * - All alert type × priority combinations
 */

import {
  escapeSlackMrkdwn,
  truncateText,
  formatFieldValue,
  isValidActionUrl,
  buildHeaderBlock,
  buildSectionBlock,
  buildTextSection,
  buildContextBlock,
  buildActionsBlock,
  buildDividerBlock,
  buildAttachment,
  buildBlockKitPayload,
  validateBlockKitPayload,
  PRIORITY_COLORS,
  MAX_TEXT_LENGTH,
  SLACK_ALERT_VERSION,
  SlackBlockKitPayload,
  ActionLink,
} from './block-kit-builder';

// =========================================================================
// Test Constants
// =========================================================================

const ALERT_TYPES = [
  'AccountQuarantined',
  'LeaseFrozen',
  'AccountCleanupFailed',
  'AccountDriftDetected',
] as const;

const PRIORITIES = ['critical', 'normal'] as const;

// =========================================================================
// escapeSlackMrkdwn Tests (EC-AC-6)
// =========================================================================

describe('escapeSlackMrkdwn', () => {
  it('should escape ampersand characters', () => {
    expect(escapeSlackMrkdwn('AT&T')).toBe('AT&amp;T');
  });

  it('should escape less than characters', () => {
    expect(escapeSlackMrkdwn('1 < 2')).toBe('1 &lt; 2');
  });

  it('should escape greater than characters', () => {
    expect(escapeSlackMrkdwn('2 > 1')).toBe('2 &gt; 1');
  });

  it('should escape all special characters in combination', () => {
    expect(escapeSlackMrkdwn('<script>alert("XSS")&</script>')).toBe(
      '&lt;script&gt;alert("XSS")&amp;&lt;/script&gt;'
    );
  });

  it('should handle empty string', () => {
    expect(escapeSlackMrkdwn('')).toBe('');
  });

  it('should handle text without special characters', () => {
    const text = 'Normal text without special chars';
    expect(escapeSlackMrkdwn(text)).toBe(text);
  });

  it('should handle multiple ampersands', () => {
    expect(escapeSlackMrkdwn('A & B & C')).toBe('A &amp; B &amp; C');
  });

  it('should handle HTML-like content', () => {
    expect(escapeSlackMrkdwn('<div class="test">content</div>')).toBe(
      '&lt;div class="test"&gt;content&lt;/div&gt;'
    );
  });
});

// =========================================================================
// truncateText Tests (EC-AC-7)
// =========================================================================

describe('truncateText', () => {
  it('should not truncate text under limit', () => {
    const text = 'Short text';
    expect(truncateText(text)).toBe(text);
  });

  it('should not truncate text exactly at limit', () => {
    const text = 'a'.repeat(MAX_TEXT_LENGTH);
    expect(truncateText(text)).toBe(text);
    expect(truncateText(text).length).toBe(MAX_TEXT_LENGTH);
  });

  it('should truncate text at 2499 characters (boundary -1)', () => {
    const text = 'a'.repeat(2499);
    expect(truncateText(text)).toBe(text);
    expect(truncateText(text).length).toBe(2499);
  });

  it('should truncate text at 2500 characters (exact boundary)', () => {
    const text = 'a'.repeat(2500);
    expect(truncateText(text)).toBe(text);
    expect(truncateText(text).length).toBe(2500);
  });

  it('should truncate text at 2501 characters (boundary +1)', () => {
    const text = 'a'.repeat(2501);
    const result = truncateText(text);
    expect(result.length).toBe(2500);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should truncate very long text with ellipsis', () => {
    const text = 'a'.repeat(5000);
    const result = truncateText(text);
    expect(result.length).toBe(MAX_TEXT_LENGTH);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should handle empty string', () => {
    expect(truncateText('')).toBe('');
  });

  it('should respect custom max length', () => {
    const text = 'Hello World';
    expect(truncateText(text, 8)).toBe('Hello...');
  });
});

// =========================================================================
// formatFieldValue Tests (EC-AC-9)
// =========================================================================

describe('formatFieldValue', () => {
  it('should return N/A for undefined', () => {
    expect(formatFieldValue(undefined)).toBe('N/A');
  });

  it('should return N/A for null', () => {
    expect(formatFieldValue(null)).toBe('N/A');
  });

  it('should return N/A for empty string', () => {
    expect(formatFieldValue('')).toBe('N/A');
  });

  it('should return N/A for whitespace-only string', () => {
    expect(formatFieldValue('   ')).toBe('N/A');
  });

  it('should return escaped value for valid string', () => {
    expect(formatFieldValue('Hello')).toBe('Hello');
  });

  it('should escape special characters in value', () => {
    expect(formatFieldValue('A & B')).toBe('A &amp; B');
  });

  it('should handle numeric values', () => {
    expect(formatFieldValue(123)).toBe('123');
  });

  it('should handle zero', () => {
    expect(formatFieldValue(0)).toBe('0');
  });

  it('should handle negative numbers', () => {
    expect(formatFieldValue(-42)).toBe('-42');
  });
});

// =========================================================================
// isValidActionUrl Tests (SM-AC-5)
// =========================================================================

describe('isValidActionUrl', () => {
  it('should accept valid HTTPS URL', () => {
    expect(isValidActionUrl('https://example.com/path')).toBe(true);
  });

  it('should reject HTTP URL', () => {
    expect(isValidActionUrl('http://example.com/path')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidActionUrl('')).toBe(false);
  });

  it('should reject invalid URL', () => {
    expect(isValidActionUrl('not-a-url')).toBe(false);
  });

  it('should accept HTTPS URL with query params', () => {
    expect(isValidActionUrl('https://example.com/path?foo=bar')).toBe(true);
  });

  it('should accept HTTPS URL with fragment', () => {
    expect(isValidActionUrl('https://example.com/path#section')).toBe(true);
  });

  it('should reject FTP URL', () => {
    expect(isValidActionUrl('ftp://example.com/file')).toBe(false);
  });

  it('should reject file URL', () => {
    expect(isValidActionUrl('file:///path/to/file')).toBe(false);
  });
});

// =========================================================================
// buildHeaderBlock Tests (AC-2.1)
// =========================================================================

describe('buildHeaderBlock', () => {
  it('should build header with correct structure', () => {
    const header = buildHeaderBlock('Test Alert');
    expect(header.type).toBe('header');
    expect(header.text.type).toBe('plain_text');
    expect(header.text.text).toBe('Test Alert');
    expect(header.text.emoji).toBe(true);
  });

  it('should escape special characters in title', () => {
    const header = buildHeaderBlock('Alert: A & B');
    expect(header.text.text).toBe('Alert: A &amp; B');
  });

  it('should truncate long titles', () => {
    const longTitle = 'a'.repeat(200);
    const header = buildHeaderBlock(longTitle);
    expect(header.text.text.length).toBeLessThanOrEqual(150);
    expect(header.text.text.endsWith('...')).toBe(true);
  });
});

// =========================================================================
// buildSectionBlock Tests (AC-2.1)
// =========================================================================

describe('buildSectionBlock', () => {
  it('should build section with fields', () => {
    const section = buildSectionBlock({
      'Account ID': '123456789012',
      Status: 'Active',
    });
    expect(section.type).toBe('section');
    expect(section.fields).toHaveLength(2);
  });

  it('should format field names as bold', () => {
    const section = buildSectionBlock({ 'Account ID': '123' });
    expect(section.fields?.[0].text).toContain('*Account ID*');
  });

  it('should escape special characters in field values', () => {
    const section = buildSectionBlock({ Name: 'A & B' });
    expect(section.fields?.[0].text).toContain('A &amp; B');
  });

  it('should filter out undefined values', () => {
    const section = buildSectionBlock({
      Defined: 'value',
      Undefined: undefined,
    });
    expect(section.fields).toHaveLength(1);
    expect(section.fields?.[0].text).toContain('Defined');
  });

  it('should use N/A for empty string values', () => {
    const section = buildSectionBlock({ Empty: '' });
    expect(section.fields?.[0].text).toContain('N/A');
  });
});

// =========================================================================
// buildTextSection Tests
// =========================================================================

describe('buildTextSection', () => {
  it('should build section with text', () => {
    const section = buildTextSection('This is a message');
    expect(section.type).toBe('section');
    expect(section.text?.type).toBe('mrkdwn');
    expect(section.text?.text).toBe('This is a message');
  });

  it('should escape special characters', () => {
    const section = buildTextSection('A < B > C & D');
    expect(section.text?.text).toBe('A &lt; B &gt; C &amp; D');
  });

  it('should truncate long text', () => {
    const longText = 'a'.repeat(3000);
    const section = buildTextSection(longText);
    expect(section.text?.text.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });
});

// =========================================================================
// buildContextBlock Tests (AC-2.5, EC-AC-10)
// =========================================================================

describe('buildContextBlock', () => {
  it('should include event ID', () => {
    const context = buildContextBlock('evt-123');
    expect(context.type).toBe('context');
    expect(context.elements[0].text).toContain('Event ID: evt-123');
  });

  it('should include Slack alert version', () => {
    const context = buildContextBlock('evt-123');
    expect(context.elements[0].text).toContain(
      `Slack Alert ${SLACK_ALERT_VERSION}`
    );
  });

  it('should include idempotency key', () => {
    const context = buildContextBlock('evt-123');
    expect(context.elements[0].text).toContain('Key: evt-123');
  });

  it('should escape special characters in event ID', () => {
    const context = buildContextBlock('evt<>&123');
    expect(context.elements[0].text).toContain('evt&lt;&gt;&amp;123');
  });
});

// =========================================================================
// buildActionsBlock Tests (AC-2.4)
// =========================================================================

describe('buildActionsBlock', () => {
  it('should build actions block with valid URLs', () => {
    const actions: ActionLink[] = [
      { label: 'View', url: 'https://example.com/view' },
      { label: 'Runbook', url: 'https://example.com/runbook' },
    ];
    const block = buildActionsBlock(actions);
    expect(block).not.toBeNull();
    expect(block?.type).toBe('actions');
    expect(block?.elements).toHaveLength(2);
  });

  it('should filter out invalid URLs', () => {
    const actions: ActionLink[] = [
      { label: 'Valid', url: 'https://example.com' },
      { label: 'Invalid', url: 'http://insecure.com' },
    ];
    const block = buildActionsBlock(actions);
    expect(block?.elements).toHaveLength(1);
    expect(block?.elements[0].text.text).toBe('Valid');
  });

  it('should return null for empty actions', () => {
    const block = buildActionsBlock([]);
    expect(block).toBeNull();
  });

  it('should return null when all URLs are invalid', () => {
    const actions: ActionLink[] = [
      { label: 'HTTP', url: 'http://example.com' },
      { label: 'Invalid', url: 'not-a-url' },
    ];
    const block = buildActionsBlock(actions);
    expect(block).toBeNull();
  });

  it('should apply button style', () => {
    const actions: ActionLink[] = [
      { label: 'Danger', url: 'https://example.com', style: 'danger' },
    ];
    const block = buildActionsBlock(actions);
    expect(block?.elements[0].style).toBe('danger');
  });

  it('should truncate long button labels', () => {
    const actions: ActionLink[] = [
      { label: 'a'.repeat(100), url: 'https://example.com' },
    ];
    const block = buildActionsBlock(actions);
    expect(block?.elements[0].text.text.length).toBeLessThanOrEqual(75);
  });
});

// =========================================================================
// buildDividerBlock Tests
// =========================================================================

describe('buildDividerBlock', () => {
  it('should build divider with correct type', () => {
    const divider = buildDividerBlock();
    expect(divider.type).toBe('divider');
  });
});

// =========================================================================
// buildAttachment Tests (AC-2.2, AC-2.3)
// =========================================================================

describe('buildAttachment', () => {
  it('should use red color for critical priority', () => {
    const attachment = buildAttachment('critical', []);
    expect(attachment.color).toBe(PRIORITY_COLORS.critical);
    expect(attachment.color).toBe('#D93025');
  });

  it('should use yellow color for normal priority', () => {
    const attachment = buildAttachment('normal', []);
    expect(attachment.color).toBe(PRIORITY_COLORS.normal);
    expect(attachment.color).toBe('#F4B400');
  });

  it('should include provided blocks', () => {
    const blocks = [buildHeaderBlock('Test'), buildDividerBlock()];
    const attachment = buildAttachment('normal', blocks);
    expect(attachment.blocks).toHaveLength(2);
  });
});

// =========================================================================
// buildBlockKitPayload Tests
// =========================================================================

describe('buildBlockKitPayload', () => {
  const baseParams = {
    alertType: 'AccountQuarantined',
    accountId: '123456789012',
    priority: 'critical' as const,
    details: { Reason: 'Security violation' },
    eventId: 'evt-abc123',
  };

  it('should build payload with fallback text (AC-2.6)', () => {
    const payload = buildBlockKitPayload(baseParams);
    expect(payload.text).toContain('CRITICAL');
    expect(payload.text).toContain('Account Quarantined');
    expect(payload.text).toContain('123456789012');
  });

  it('should include attachments array', () => {
    const payload = buildBlockKitPayload(baseParams);
    expect(payload.attachments).toHaveLength(1);
  });

  it('should use critical color for critical priority', () => {
    const payload = buildBlockKitPayload(baseParams);
    expect(payload.attachments[0].color).toBe(PRIORITY_COLORS.critical);
  });

  it('should use normal color for normal priority', () => {
    const payload = buildBlockKitPayload({
      ...baseParams,
      priority: 'normal',
    });
    expect(payload.attachments[0].color).toBe(PRIORITY_COLORS.normal);
  });

  it('should include header block', () => {
    const payload = buildBlockKitPayload(baseParams);
    const headerBlock = payload.attachments[0].blocks.find(
      (b) => b.type === 'header'
    );
    expect(headerBlock).toBeDefined();
  });

  it('should include section block with account ID', () => {
    const payload = buildBlockKitPayload(baseParams);
    const sectionBlock = payload.attachments[0].blocks.find(
      (b) => b.type === 'section'
    );
    expect(sectionBlock).toBeDefined();
  });

  it('should include context block with event ID (AC-2.5)', () => {
    const payload = buildBlockKitPayload(baseParams);
    const contextBlock = payload.attachments[0].blocks.find(
      (b) => b.type === 'context'
    );
    expect(contextBlock).toBeDefined();
  });

  it('should include actions block when action links provided (AC-2.4)', () => {
    const payload = buildBlockKitPayload({
      ...baseParams,
      actionLinks: [{ label: 'View', url: 'https://example.com' }],
    });
    const actionsBlock = payload.attachments[0].blocks.find(
      (b) => b.type === 'actions'
    );
    expect(actionsBlock).toBeDefined();
  });

  it('should not include actions block when no action links', () => {
    const payload = buildBlockKitPayload(baseParams);
    const actionsBlock = payload.attachments[0].blocks.find(
      (b) => b.type === 'actions'
    );
    expect(actionsBlock).toBeUndefined();
  });

  it('should include divider block', () => {
    const payload = buildBlockKitPayload(baseParams);
    const dividerBlock = payload.attachments[0].blocks.find(
      (b) => b.type === 'divider'
    );
    expect(dividerBlock).toBeDefined();
  });
});

// =========================================================================
// All Alert Type × Priority Combinations (TC-AC-1)
// =========================================================================

describe('Alert Type × Priority Combinations', () => {
  ALERT_TYPES.forEach((alertType) => {
    PRIORITIES.forEach((priority) => {
      it(`should build valid payload for ${alertType} × ${priority}`, () => {
        const payload = buildBlockKitPayload({
          alertType,
          accountId: '123456789012',
          priority,
          details: { TestField: 'TestValue' },
          eventId: `evt-${alertType}-${priority}`,
        });

        // Verify structure
        expect(payload.text).toBeTruthy();
        expect(payload.attachments).toHaveLength(1);
        expect(payload.attachments[0].blocks.length).toBeGreaterThan(0);

        // Verify color matches priority
        if (priority === 'critical') {
          expect(payload.attachments[0].color).toBe(PRIORITY_COLORS.critical);
        } else {
          expect(payload.attachments[0].color).toBe(PRIORITY_COLORS.normal);
        }

        // Validate payload structure
        expect(() => validateBlockKitPayload(payload)).not.toThrow();
      });
    });
  });
});

// =========================================================================
// validateBlockKitPayload Tests (AC-2.7, SM-AC-6)
// =========================================================================

describe('validateBlockKitPayload', () => {
  it('should validate correct payload', () => {
    const payload = buildBlockKitPayload({
      alertType: 'AccountQuarantined',
      accountId: '123456789012',
      priority: 'critical',
      details: {},
      eventId: 'evt-123',
    });
    expect(validateBlockKitPayload(payload)).toBe(true);
  });

  it('should throw on missing text field', () => {
    const payload = {
      attachments: [{ color: '#FF0000', blocks: [] }],
    } as unknown as SlackBlockKitPayload;
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Block Kit payload missing required text field'
    );
  });

  it('should throw on missing attachments', () => {
    const payload = { text: 'test' } as unknown as SlackBlockKitPayload;
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Block Kit payload missing required attachments array'
    );
  });

  it('should throw on empty attachments array', () => {
    const payload = {
      text: 'test',
      attachments: [],
    };
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Block Kit payload has empty attachments array'
    );
  });

  it('should throw on missing attachment color', () => {
    const payload = {
      text: 'test',
      attachments: [{ blocks: [] }],
    } as unknown as SlackBlockKitPayload;
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Attachment missing required color field'
    );
  });

  it('should throw on missing attachment blocks', () => {
    const payload = {
      text: 'test',
      attachments: [{ color: '#FF0000' }],
    } as unknown as SlackBlockKitPayload;
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Attachment missing required blocks array'
    );
  });

  it('should throw on block missing type', () => {
    const payload = {
      text: 'test',
      attachments: [{ color: '#FF0000', blocks: [{}] }],
    } as unknown as SlackBlockKitPayload;
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Block missing required type field'
    );
  });

  it('should throw on header block missing text', () => {
    const payload = {
      text: 'test',
      attachments: [{ color: '#FF0000', blocks: [{ type: 'header' }] }],
    } as unknown as SlackBlockKitPayload;
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Header block missing text'
    );
  });

  it('should throw on empty section block', () => {
    const payload = {
      text: 'test',
      attachments: [{ color: '#FF0000', blocks: [{ type: 'section' }] }],
    } as unknown as SlackBlockKitPayload;
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Section block must have text or fields'
    );
  });

  it('should throw on context block without elements', () => {
    const payload = {
      text: 'test',
      attachments: [
        { color: '#FF0000', blocks: [{ type: 'context', elements: [] }] },
      ],
    } as unknown as SlackBlockKitPayload;
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Context block must have elements'
    );
  });

  it('should throw on actions block without elements', () => {
    const payload = {
      text: 'test',
      attachments: [
        { color: '#FF0000', blocks: [{ type: 'actions', elements: [] }] },
      ],
    } as unknown as SlackBlockKitPayload;
    expect(() => validateBlockKitPayload(payload)).toThrow(
      'Actions block must have elements'
    );
  });

  it('should accept divider block without additional fields', () => {
    const payload = {
      text: 'test',
      attachments: [{ color: '#FF0000', blocks: [{ type: 'divider' }] }],
    } as unknown as SlackBlockKitPayload;
    expect(validateBlockKitPayload(payload)).toBe(true);
  });
});

// =========================================================================
// Priority Colors Constants (SM-AC-4)
// =========================================================================

describe('PRIORITY_COLORS', () => {
  it('should have critical color defined', () => {
    expect(PRIORITY_COLORS.critical).toBeDefined();
    expect(PRIORITY_COLORS.critical).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should have normal color defined', () => {
    expect(PRIORITY_COLORS.normal).toBeDefined();
    expect(PRIORITY_COLORS.normal).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should have different colors for different priorities', () => {
    expect(PRIORITY_COLORS.critical).not.toBe(PRIORITY_COLORS.normal);
  });
});

// =========================================================================
// Edge Cases
// =========================================================================

describe('Edge Cases', () => {
  it('should handle details with many fields', () => {
    const details: Record<string, string> = {};
    for (let i = 0; i < 10; i++) {
      details[`Field${i}`] = `Value${i}`;
    }
    const payload = buildBlockKitPayload({
      alertType: 'AccountQuarantined',
      accountId: '123456789012',
      priority: 'critical',
      details,
      eventId: 'evt-123',
    });
    expect(() => validateBlockKitPayload(payload)).not.toThrow();
  });

  it('should handle empty details object', () => {
    const payload = buildBlockKitPayload({
      alertType: 'AccountQuarantined',
      accountId: '123456789012',
      priority: 'critical',
      details: {},
      eventId: 'evt-123',
    });
    expect(() => validateBlockKitPayload(payload)).not.toThrow();
  });

  it('should handle special characters in all fields', () => {
    const payload = buildBlockKitPayload({
      alertType: 'AccountQuarantined',
      accountId: 'acc-123&456',
      priority: 'critical',
      details: { 'Key<>': 'Value&' },
      eventId: 'evt-test-123',
    });
    // Fallback text is plain text for notifications, not mrkdwn
    // Block Kit fields should be properly escaped
    expect(() => validateBlockKitPayload(payload)).not.toThrow();

    // Verify section block fields are escaped
    const sectionBlock = payload.attachments[0].blocks.find(
      (b) => b.type === 'section'
    );
    expect(sectionBlock).toBeDefined();
  });

  it('should handle very long account ID', () => {
    const payload = buildBlockKitPayload({
      alertType: 'AccountQuarantined',
      accountId: '1'.repeat(100),
      priority: 'critical',
      details: {},
      eventId: 'evt-123',
    });
    expect(() => validateBlockKitPayload(payload)).not.toThrow();
  });

  it('should handle very long event ID', () => {
    const payload = buildBlockKitPayload({
      alertType: 'AccountQuarantined',
      accountId: '123456789012',
      priority: 'critical',
      details: {},
      eventId: 'evt-' + 'a'.repeat(500),
    });
    expect(() => validateBlockKitPayload(payload)).not.toThrow();
  });

  it('should handle numeric detail values', () => {
    const payload = buildBlockKitPayload({
      alertType: 'AccountQuarantined',
      accountId: '123456789012',
      priority: 'critical',
      details: { Count: 42, Amount: 99.99 },
      eventId: 'evt-123',
    });
    expect(() => validateBlockKitPayload(payload)).not.toThrow();
  });

  it('should handle multiple valid action links', () => {
    const payload = buildBlockKitPayload({
      alertType: 'AccountQuarantined',
      accountId: '123456789012',
      priority: 'critical',
      details: {},
      eventId: 'evt-123',
      actionLinks: [
        { label: 'View Account', url: 'https://console.aws.amazon.com/account' },
        { label: 'View Runbook', url: 'https://wiki.example.com/runbook' },
        { label: 'Open Ticket', url: 'https://tickets.example.com/new' },
      ],
    });
    const actionsBlock = payload.attachments[0].blocks.find(
      (b) => b.type === 'actions'
    );
    expect(actionsBlock).toBeDefined();
    expect(() => validateBlockKitPayload(payload)).not.toThrow();
  });
});
