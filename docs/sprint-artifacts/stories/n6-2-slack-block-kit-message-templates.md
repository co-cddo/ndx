# Story: n6-2 Slack Block Kit Message Templates

> **Epic**: N-6 Operations Slack Alerts
> **Status**: `done`
> **Priority**: High
> **Estimate**: 3 story points

## Story Statement

As an operations team member, I need Slack alerts formatted using Block Kit with proper visual hierarchy, priority indicators, and consistent structure so that I can quickly assess alert severity and take appropriate action.

## Context

This story enhances the existing `SlackSender` class (from n6-1) by replacing the simple text payload with rich Block Kit formatting. The "one brain, two mouths" architecture means this Block Kit builder will be shared by all alert types (n6-3 through n6-6).

### Dependencies
- **n6-1** (DONE): SlackSender class with `buildPayload()` function to enhance
- **Architecture**: `docs/notification-architecture.md#SlackSender`

### Prior Art from n6-1
- `SlackSender` class exists at `infra/lib/lambda/notification/slack-sender.ts`
- Current `buildPayload()` function (lines 128-148) creates simple text - needs Block Kit enhancement
- `SlackSendParams` interface defines: `alertType`, `accountId`, `priority`, `details`, `eventId`
- Exports: `SlackSender`, `SlackSendParams`, `redactWebhookUrl`

## Acceptance Criteria

### Core Block Kit Structure
- [x] **AC-2.1**: Block Kit JSON includes header block (alert title), section block with fields (key/value data), and context block (metadata)
- [x] **AC-2.2**: Critical priority alerts use red attachment color (`#D93025`)
- [x] **AC-2.3**: Normal priority alerts use yellow attachment color (`#F4B400`)
- [x] **AC-2.4**: Critical alerts include action links when provided (view account, runbook)
- [x] **AC-2.5**: Context block includes `Event ID: {id} | Slack Alert v1`
- [x] **AC-2.6**: Fallback `text` field provided for notification history/accessibility
- [x] **AC-2.7**: Block Kit JSON validates against Slack Block Kit schema

### Elicitation-Derived Requirements
- [x] **EC-AC-6**: Special characters in dynamic fields (`&`, `<`, `>`) are escaped for Slack mrkdwn
- [x] **EC-AC-7**: Dynamic text fields truncated to 2500 characters (Slack text block limit)
- [x] **EC-AC-9**: Missing optional fields display "N/A" placeholder, never empty strings
- [x] **EC-AC-10**: Slack message includes idempotency key in metadata block for deduplication

### Schema & Types
- [x] **SM-AC-3**: BlockKit builder functions are fully typed with TypeScript interfaces
- [x] **SM-AC-4**: Color constants defined as enum/const for type safety
- [x] **SM-AC-5**: Action button URLs validated before inclusion
- [x] **SM-AC-6**: Block Kit payload validated at build time (not runtime)

### Test Coverage
- [x] **TC-AC-1**: Unit tests cover all alert type x priority combinations (8 combinations tested)
- [x] **TC-AC-2**: Tests verify Block Kit JSON structure matches Slack schema
- [x] **TC-AC-3**: Tests verify character escaping for special characters
- [x] **TC-AC-4**: Tests verify truncation at 2500 character boundary
- [x] **TC-AC-5**: Tests verify N/A placeholder for missing optional fields

## Implementation Summary

### Files Created
- `infra/lib/lambda/notification/block-kit-builder.ts` (470 lines)
  - Type-safe Block Kit interfaces and types
  - PRIORITY_COLORS constant with critical/normal colors
  - Text utilities: escapeSlackMrkdwn, truncateText, formatFieldValue, isValidActionUrl
  - Block builders: buildHeaderBlock, buildSectionBlock, buildContextBlock, buildActionsBlock
  - Payload builder: buildBlockKitPayload with full Block Kit structure
  - Validation: validateBlockKitPayload for build-time schema validation

- `infra/lib/lambda/notification/block-kit-builder.test.ts` (780 lines)
  - 98 unit tests covering all functionality
  - escapeSlackMrkdwn tests (8 tests)
  - truncateText tests (8 tests)
  - formatFieldValue tests (9 tests)
  - isValidActionUrl tests (8 tests)
  - Block builder tests (header, section, context, actions, divider)
  - Full payload tests for all alert type x priority combinations
  - Validation tests for schema compliance
  - Edge case tests

### Files Modified
- `infra/lib/lambda/notification/slack-sender.ts`
  - Updated buildPayload() to use Block Kit builder
  - Added actionLinks to SlackSendParams interface
  - SlackPayload type now uses SlackBlockKitPayload

- `infra/lib/lambda/notification/slack-sender.test.ts`
  - Updated test assertions for Block Kit payload structure

## Technical Design

### File Structure
```
infra/lib/lambda/notification/
├── slack-sender.ts          # Updated - uses Block Kit builder
├── slack-sender.test.ts     # Updated - Block Kit assertions
├── block-kit-builder.ts     # NEW - Block Kit construction utilities
└── block-kit-builder.test.ts # NEW - 98 unit tests
```

### Block Kit Structure
```typescript
interface SlackBlockKitPayload {
  text: string;              // AC-2.6: Fallback text
  attachments: [{
    color: string;           // AC-2.2, AC-2.3: Priority color
    blocks: Block[];         // AC-2.1: Header, section, context, actions
  }];
}
```

### Color Constants
```typescript
const PRIORITY_COLORS = {
  critical: '#D93025',  // Red
  normal: '#F4B400',    // Yellow/amber
} as const;
```

### Character Escaping (EC-AC-6)
```typescript
function escapeSlackMrkdwn(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

## Tasks

### Task 1: Create Block Kit Builder Module (AC-2.1, SM-AC-3, SM-AC-4)
**File**: `infra/lib/lambda/notification/block-kit-builder.ts`
- [x] 1.1: Define TypeScript interfaces for all Block Kit block types
- [x] 1.2: Create `PRIORITY_COLORS` constant with type safety
- [x] 1.3: Implement `buildHeaderBlock()` for alert title
- [x] 1.4: Implement `buildSectionBlock()` for key/value fields
- [x] 1.5: Implement `buildContextBlock()` with event ID and version (AC-2.5)
- [x] 1.6: Implement `buildActionsBlock()` for action links (AC-2.4)
- [x] 1.7: Implement `buildAttachment()` combining blocks with color

### Task 2: Implement Text Utilities (EC-AC-6, EC-AC-7, EC-AC-9)
**File**: `infra/lib/lambda/notification/block-kit-builder.ts`
- [x] 2.1: Implement `escapeSlackMrkdwn()` for special character escaping
- [x] 2.2: Implement `truncateText()` with 2500 char limit and ellipsis
- [x] 2.3: Implement `formatFieldValue()` with N/A placeholder for undefined/empty
- [x] 2.4: Add URL validation helper for action buttons (SM-AC-5)

### Task 3: Integrate with SlackSender (AC-2.6, EC-AC-10)
**File**: `infra/lib/lambda/notification/slack-sender.ts`
- [x] 3.1: Update `buildPayload()` to use Block Kit builder
- [x] 3.2: Ensure fallback `text` field is always populated (AC-2.6)
- [x] 3.3: Add idempotency key to context block metadata (EC-AC-10)
- [x] 3.4: Update `SlackPayload` interface for Block Kit structure

### Task 4: Unit Tests for Block Kit Builder (TC-AC-1 through TC-AC-5)
**File**: `infra/lib/lambda/notification/block-kit-builder.test.ts`
- [x] 4.1: Test `escapeSlackMrkdwn()` with all special characters
- [x] 4.2: Test `truncateText()` at boundary (2499, 2500, 2501 chars)
- [x] 4.3: Test `formatFieldValue()` with undefined, empty, and valid values
- [x] 4.4: Test header block construction
- [x] 4.5: Test section block with fields
- [x] 4.6: Test context block with event ID format
- [x] 4.7: Test actions block with button URLs
- [x] 4.8: Test full payload for critical priority (AC-2.2)
- [x] 4.9: Test full payload for normal priority (AC-2.3)
- [x] 4.10: Test all alert type x priority combinations (4 types x 2 priorities = 8 combinations)

### Task 5: Update Existing Tests
**File**: `infra/lib/lambda/notification/slack-sender.test.ts`
- [x] 5.1: Update mock responses for Block Kit payload structure
- [x] 5.2: Add assertions for Block Kit in send() tests
- [x] 5.3: Verify backward compatibility with existing test cases

### Task 6: Slack Schema Validation (AC-2.7, SM-AC-6)
- [x] 6.1: Create validation helper for Block Kit (validateBlockKitPayload)
- [x] 6.2: Add build-time validation test that constructs sample payloads
- [x] 6.3: Document Block Kit structure in code comments

## Test Results

```
Test Suites: 14 passed, 14 total
Tests:       656 passed, 656 total
Snapshots:   1 passed, 1 total

Block Kit Builder Tests: 98 passed
Slack Sender Tests: 30 passed
```

## Dev Notes

### Slack Block Kit Reference
- [Block Kit Builder](https://app.slack.com/block-kit-builder)
- [Block Types Reference](https://api.slack.com/reference/block-kit/blocks)
- [Attachment Colors](https://api.slack.com/reference/messaging/attachments#fields)

### mrkdwn Formatting
Slack uses a modified markdown called mrkdwn:
- Bold: `*text*`
- Italic: `_text_`
- Code: `` `code` ``
- Link: `<https://url|text>`
- Special chars must be escaped: `&` -> `&amp;`, `<` -> `&lt;`, `>` -> `&gt;`

### Idempotency Key Format (EC-AC-10)
Use event ID as idempotency key in context block:
```
Event ID: abc123 | Slack Alert v1 | Key: abc123
```

### Testing Approach
Use Slack's Block Kit Builder to validate JSON structure visually during development.

## Definition of Done
- [x] All acceptance criteria verified (17/17 ACs passed)
- [x] Unit tests pass with >90% coverage of new code (98 tests)
- [x] Code review approved
- [x] No ESLint errors or TypeScript warnings in new files
- [x] Documentation updated in code comments

---

## Code Review

**Date**: 2025-11-28
**Reviewer**: Claude (automated)
**Status**: APPROVED

### Summary
All 17 acceptance criteria verified and passing. Implementation follows established patterns from n6-1 and integrates cleanly with SlackSender. Test coverage is comprehensive with 98 unit tests.

### Acceptance Criteria Verification

| AC | Status | Notes |
|---|---|---|
| AC-2.1 | PASS | Header, section, context blocks implemented |
| AC-2.2 | PASS | Critical color #D93025 verified in tests |
| AC-2.3 | PASS | Normal color #F4B400 verified in tests |
| AC-2.4 | PASS | Action links with HTTPS validation |
| AC-2.5 | PASS | Context format verified in buildContextBlock tests |
| AC-2.6 | PASS | Fallback text always present |
| AC-2.7 | PASS | validateBlockKitPayload validates structure |
| EC-AC-6 | PASS | escapeSlackMrkdwn with 8 tests |
| EC-AC-7 | PASS | truncateText boundary tests (2499, 2500, 2501) |
| EC-AC-9 | PASS | formatFieldValue N/A tests |
| EC-AC-10 | PASS | Idempotency key in context |
| SM-AC-3 | PASS | Full TypeScript interfaces |
| SM-AC-4 | PASS | PRIORITY_COLORS as const |
| SM-AC-5 | PASS | isValidActionUrl validates HTTPS |
| SM-AC-6 | PASS | Build-time validation |
| TC-AC-1-5 | PASS | 98 comprehensive tests |

### Findings
- **No issues found**
- Clean integration with existing SlackSender
- Well-documented code with JSDoc comments
- Type-safe interfaces throughout

---

**Created**: 2025-11-28
**Last Updated**: 2025-11-28
**Implementation Complete**: 2025-11-28
**Code Review Complete**: 2025-11-28
