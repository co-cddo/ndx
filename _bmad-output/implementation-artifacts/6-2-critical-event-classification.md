# Story 6.2: Critical Event Classification

Status: done

## Story

As an **NDX operations team member**,
I want **critical events to trigger @channel alerts**,
So that **I'm immediately notified of security or compliance issues**.

## Acceptance Criteria

1. **Given** one of the 4 critical events fires:
   - `AccountQuarantined`
   - `AccountCleanupFailed`
   - `AccountDriftDetected`
   - `GroupCostReportGeneratedFailure`
   **When** the notification reaches Slack
   **Then** the message includes @channel mention (FR8)

2. **Given** one of the 14 routine events fires (LeaseRequested, LeaseApproved, etc.)
   **When** the notification reaches Slack
   **Then** no @channel mention is included (FR9)

3. **Given** a new ISB event type is added in the future
   **When** it's not explicitly classified
   **Then** it defaults to routine (no @channel)

## Tasks / Subtasks

- [x] Task 1: Update SlackSender to render @channel mentions (AC: 1)
  - [x] 1.1 Modify `buildPayload()` in `slack-sender.ts` to check template `includeMention` flag
  - [x] 1.2 Prepend `<!channel> ` to the alert text field when `includeMention: true`
  - [x] 1.3 Ensure mention renders in Slack workflow-compatible format

- [x] Task 2: Add GroupCostReportGeneratedFailure to critical events (AC: 1)
  - [x] 2.1 Add `GroupCostReportGeneratedFailure` to `SLACK_TEMPLATES` in `slack-templates.ts`
  - [x] 2.2 Set `includeMention: true` and `priority: "critical"` for this event
  - [x] 2.3 Add formatter function `formatCostReportFailureAlert()` in `slack-alerts.ts`
  - [x] 2.4 Add case handler in `processSlackAlert()` switch statement

- [x] Task 3: Verify existing critical events have includeMention: true (AC: 1)
  - [x] 3.1 Confirm `AccountQuarantined` has `includeMention: true` (verified in code)
  - [x] 3.2 Confirm `AccountCleanupFailed` has `includeMention: true` (verified in code)
  - [x] 3.3 Confirm `AccountDriftDetected` has `includeMention: true` (verified in code)

- [x] Task 4: Verify routine events have includeMention: false (AC: 2)
  - [x] 4.1 Confirm all lease lifecycle events have `includeMention: false`
  - [x] 4.2 Confirm all monitoring threshold events have `includeMention: false`

- [x] Task 5: Ensure default behavior is routine (AC: 3)
  - [x] 5.1 If event type not in SLACK_TEMPLATES, default to `includeMention: false`
  - [x] 5.2 Add defensive code to handle unknown event types gracefully

- [x] Task 6: Add tests
  - [x] 6.1 Test that critical events include `<!channel>` in payload
  - [x] 6.2 Test that routine events do NOT include `<!channel>` in payload
  - [x] 6.3 Test GroupCostReportGeneratedFailure is classified as critical
  - [x] 6.4 Test unknown event types default to no mention

- [x] Task 7: Verification
  - [x] 7.1 Run `yarn test` in /infra - 1071 tests pass
  - [x] 7.2 Run `yarn lint` - no errors in modified files (pre-existing errors in enrichment.ts from Story 5.1)
  - [x] 7.3 Verify CDK synth produces valid CloudFormation

## Dev Notes

### Architecture Context

**Source:** [_bmad-output/planning-artifacts/prd-ndx-try-enhancements.md - Operations Notifications]

This story adds @channel mentions to critical Slack notifications via the existing Lambda webhook path. The AWS Chatbot integration (Story 6-1) is a separate notification path that provides raw event visibility.

**Two Notification Paths:**
1. **Lambda + Webhook**: Enriched notifications with @channel for critical events (this story)
2. **EventBridge + Chatbot**: Raw event visibility for all 18 events (Story 6-1)

### Critical Events (4 - require @channel)

**Source:** [_bmad-output/planning-artifacts/epics-ndx-try-enhancements.md#Story-2.2]

| Event Type | Description | Current State |
|------------|-------------|---------------|
| `AccountQuarantined` | Account frozen due to security issue | ✅ Template exists, `includeMention: true` |
| `AccountCleanupFailed` | Account cleanup failed | ✅ Template exists, `includeMention: true` |
| `AccountDriftDetected` | Account configuration drift | ✅ Template exists, `includeMention: true` |
| `GroupCostReportGeneratedFailure` | Cost report generation failed | ❌ Template MISSING - needs to be added |

### Routine Events (14 - no @channel)

All other events including:
- Lease lifecycle: LeaseRequested, LeaseApproved, LeaseDenied, LeaseFrozen, LeaseUnfrozen, LeaseTerminated
- Monitoring: LeaseBudgetThresholdAlert, LeaseDurationThresholdAlert, LeaseFreezingThresholdAlert, LeaseBudgetExceeded, LeaseExpiredAlert
- Info: GroupCostReportGenerated, AccountCleanupSuccessful, CleanAccountRequest

### Existing Code Analysis

**Source:** [infra/lib/lambda/notification/slack-sender.ts]

The `SlackSender` class builds payloads for Slack workflows. The `includeMention` flag exists in templates but is **NOT currently rendered** in the payload.

**Current `buildPayload()` Implementation:**
```typescript
private buildPayload(params: SlackSendParams): SlackWorkflowPayload {
  return {
    alert_type: params.alertType,
    account_id: params.accountId,
    priority: params.priority,
    // ... other fields
    // NOTE: includeMention is NOT used here currently
  }
}
```

**Required Change:**
```typescript
private buildPayload(params: SlackSendParams): SlackWorkflowPayload {
  const template = SLACK_TEMPLATES[params.alertType]
  const mentionPrefix = template?.includeMention ? "<!channel> " : ""
  return {
    alert_type: `${mentionPrefix}${params.alertType}`,
    // OR add a separate field:
    // mention: template?.includeMention ? "<!channel>" : "",
    // ...
  }
}
```

### Slack Mention Syntax

**Source:** Slack API Documentation

- `<!channel>` - Notifies everyone in the channel
- Must be in mrkdwn format
- Appears as "@channel" in Slack messages

### Template Configuration Pattern

**Source:** [infra/lib/lambda/notification/slack-templates.ts]

```typescript
export const SLACK_TEMPLATES: Record<string, SlackTemplateConfig> = {
  AccountQuarantined: {
    priority: "critical",
    includeMention: true,  // ✅ Already set correctly
    // ...
  },
  LeaseFrozen: {
    priority: "normal",
    includeMention: false, // ✅ Already set correctly
    // ...
  },
}
```

### Missing Template: GroupCostReportGeneratedFailure

**Source:** [infra/lib/lambda/notification/slack-templates.ts]

This critical event is NOT in `SLACK_TEMPLATES`. It needs to be added with:
```typescript
GroupCostReportGeneratedFailure: {
  priority: "critical",
  includeMention: true,
  actionLinks: {
    viewReport: "https://console.aws.amazon.com/billing/home#/reports",
    viewLogs: "https://console.aws.amazon.com/cloudwatch/home",
  },
}
```

### Existing Test Coverage

**Source:** [infra/lib/lambda/notification/slack-alerts.test.ts:224-228]

```typescript
it("should include mention for critical alerts (AC-3.6)", () => {
  expect(SLACK_TEMPLATES.AccountQuarantined.includeMention).toBe(true)
  expect(SLACK_TEMPLATES.AccountCleanupFailed.includeMention).toBe(true)
  expect(SLACK_TEMPLATES.AccountDriftDetected.includeMention).toBe(true)
})
```

Tests verify template config but NOT actual payload rendering.

### Previous Story Learnings (6-1)

**Source:** [_bmad-output/implementation-artifacts/6-1-aws-chatbot-integration.md]

- Use config.ts for event type constants
- Follow existing patterns in notification-stack.ts
- Import constants in test files for DRY assertions
- Run `yarn build` before tests if edits aren't detected

### Project Structure Notes

**Files to modify:**
- `infra/lib/lambda/notification/slack-sender.ts` - Add mention rendering in `buildPayload()`
- `infra/lib/lambda/notification/slack-templates.ts` - Add GroupCostReportGeneratedFailure template
- `infra/lib/lambda/notification/slack-alerts.ts` - Add formatter for GroupCostReportGeneratedFailure

**Test files:**
- `infra/lib/lambda/notification/slack-sender.test.ts` - Test @channel in payload
- `infra/lib/lambda/notification/slack-alerts.test.ts` - Test GroupCostReportGeneratedFailure formatting

### References

- [Source: _bmad-output/planning-artifacts/prd-ndx-try-enhancements.md#Operations-Notifications] - FR8, FR9
- [Source: _bmad-output/planning-artifacts/epics-ndx-try-enhancements.md#Story-2.2] - Story requirements
- [Source: infra/lib/lambda/notification/slack-sender.ts] - Webhook integration
- [Source: infra/lib/lambda/notification/slack-templates.ts] - Template configuration
- [Source: infra/lib/lambda/notification/slack-alerts.ts] - Alert formatting

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - No debug issues encountered

### Completion Notes List

1. Modified `buildPayload()` in `slack-sender.ts` to check `SLACK_TEMPLATES[alertType].includeMention` flag
2. Uses nullish coalescing (`??`) to default to `false` for unknown event types (AC: 3)
3. Prepends `<!channel> ` to `alertType` field when `includeMention: true`
4. Added `GroupCostReportGeneratedFailure` to `SlackAlertType` union in `slack-templates.ts`
5. Created template config with `priority: "critical"` and `includeMention: true`
6. Added `GroupCostReportGeneratedFailureDetail` interface in `slack-alerts.ts`
7. Created `formatCostReportFailureAlert()` formatter function
8. Added case handler in `processSlackAlert()` switch statement
9. Added `GroupCostReportGeneratedFailure` to `NotificationEventType` in `types.ts`
10. Added validation schema `GroupCostReportGeneratedFailureDetailSchema` in `validation.ts`
11. Added 7 new tests for @channel mention behavior in `slack-sender.test.ts`
12. Added 8 new tests for GroupCostReportGeneratedFailure in `slack-alerts.test.ts`
13. Updated existing test to expect `<!channel>` prefix for critical events
14. All 1071 tests passing
15. CDK synth produces valid CloudFormation

### File List

**Modified:**
- `infra/lib/lambda/notification/slack-sender.ts` - Added @channel mention rendering in `buildPayload()`
- `infra/lib/lambda/notification/slack-templates.ts` - Added `GroupCostReportGeneratedFailure` to type union and template config
- `infra/lib/lambda/notification/slack-alerts.ts` - Added formatter and case handler for `GroupCostReportGeneratedFailure`
- `infra/lib/lambda/notification/types.ts` - Added `GroupCostReportGeneratedFailure` to `NotificationEventType`
- `infra/lib/lambda/notification/validation.ts` - Added schema for `GroupCostReportGeneratedFailure`
- `infra/lib/lambda/notification/slack-sender.test.ts` - Added 7 tests for @channel mention behavior
- `infra/lib/lambda/notification/slack-alerts.test.ts` - Added 8 tests for GroupCostReportGeneratedFailure and routine events
