# Story 5.2: CloudFormation Console Button

Status: done

## Story

As a **government user with an active NDX:Try session**,
I want **a button to open my session's CloudFormation console**,
So that **I can inspect what resources have been deployed**.

## Acceptance Criteria

1. **Given** I have an active session on /try, **When** I view my session row, **Then** I see an "Open CloudFormation" button (FR1)

2. **Given** I click the CloudFormation button, **When** the action completes, **Then** a new browser tab opens to `https://{region}.console.aws.amazon.com/cloudformation/home?region={region}#/stacks` for my session's AWS account (FR1, FR2)

3. **Given** my session is not active (expired, terminated), **When** I view the /try page, **Then** the CloudFormation button is not visible (FR3)

4. **Given** I navigate using only keyboard, **When** I focus on the CloudFormation button, **Then** I can activate it via Enter or Space (NFR1)

5. **Given** the button is rendered, **When** I inspect accessibility, **Then** it includes "(opens in new tab)" screen reader text (NFR3)

6. **Given** I click the CloudFormation button, **When** analytics tracks the action, **Then** the event includes lease-id, template, budget, expires data attributes

## Tasks / Subtasks

- [x] Task 1: Add CloudFormation URL builder function (AC: 2)
  - [x] 1.1 Create `getCfnConsoleUrl(lease: Lease)` function in `sessions-service.ts`
  - [x] 1.2 Use format: `https://{region}.console.aws.amazon.com/cloudformation/home?region={region}#/stacks`
  - [x] 1.3 Default region to `us-east-1` or get from lease data if available
  - [x] 1.4 Add unit tests for URL generation

- [x] Task 2: Add CloudFormation button to sessions table (AC: 1, 3, 4, 5)
  - [x] 2.1 Add button in `renderActions()` function in `sessions-table.ts` (after "Get CLI Credentials" button)
  - [x] 2.2 Only render button for active leases (status === 'Active' || status === 'Approved')
  - [x] 2.3 Use GOV.UK button styling: `govuk-button govuk-button--secondary`
  - [x] 2.4 Add `target="_blank"` and `rel="noopener noreferrer"` attributes
  - [x] 2.5 Add `<span class="govuk-visually-hidden">(opens in new tab)</span>` for accessibility
  - [x] 2.6 Add data attributes for analytics: `data-action="launch-cloudformation"`, `data-lease-id`, etc.

- [x] Task 3: Add analytics tracking (AC: 6)
  - [x] 3.1 Add event handler in `try-page.ts` for `[data-action="launch-cloudformation"]` clicks
  - [x] 3.2 Call tracking function with lease metadata
  - [x] 3.3 Follow existing pattern from "Launch AWS Console" button

- [x] Task 4: Update responsive styling (AC: 1)
  - [x] 4.1 Update `sessions-table.css` for 3-button layout on mobile (existing flex-column layout handles 3 buttons correctly)
  - [x] 4.2 Ensure buttons stack properly on small screens (verified - sessions-actions uses flex-direction: column)
  - [x] 4.3 Test responsive layout at 768px breakpoint (verified - buttons use width: 100% on mobile)

- [x] Task 5: Add tests (AC: 1, 2, 3, 4, 5)
  - [x] 5.1 Add unit test for `getCfnConsoleUrl()` function (in sessions-service.test.ts - Task 1)
  - [x] 5.2 Add test for button rendering with active lease
  - [x] 5.3 Add test for button NOT rendering with inactive lease
  - [x] 5.4 Add test for correct URL format
  - [x] 5.5 Add accessibility test for screen reader text

- [x] Task 6: Verification
  - [x] 6.1 Run `yarn test` - all 864 tests pass
  - [x] 6.2 Run `yarn lint` - no Prettier errors in source files
  - [x] 6.3 Verify keyboard navigation (Tab, Enter, Space) - uses standard <a> element with native keyboard support
  - [x] 6.4 Test in responsive view (mobile, tablet, desktop) - CSS verified in sessions-table.css

## Dev Notes

### Architecture Context

**Source:** [_bmad-output/planning-artifacts/epics-ndx-try-enhancements.md - Epic 1: Session Transparency]

This story is part of Epic 5 (Session Transparency). Story 5.1 replaced DynamoDB reads with ISB API for lease data. Now the `awsAccountId` is available via the ISB API, making the CloudFormation button possible.

### Existing Implementation Analysis

**Source:** [src/try/ui/components/sessions-table.ts]

The sessions table already renders action buttons for active leases:

```typescript
// Line 127-180 in sessions-table.ts
function renderActions(lease: Lease): string {
  if (!isActiveLease(lease)) {
    return '<span class="govuk-body-s govuk-!-margin-bottom-0">—</span>'
  }

  const ssoUrl = getSsoUrl(lease)
  const portalUrl = getPortalUrl(lease)

  return `
    <a
      href="${ssoUrl}"
      target="_blank"
      rel="noopener noreferrer"
      class="govuk-button govuk-button--secondary govuk-!-margin-bottom-1"
      data-module="govuk-button"
      data-action="launch-console"
      ...
    >
      Launch AWS Console
      <span class="govuk-visually-hidden">(opens in new tab)</span>
    </a>
    <a
      href="${portalUrl}"
      target="_blank"
      rel="noopener noreferrer"
      class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0"
      data-module="govuk-button"
      data-action="get-credentials"
      ...
    >
      Get CLI Credentials
      <span class="govuk-visually-hidden">(opens in new tab)</span>
    </a>
  `
}
```

### CloudFormation Console URL Format

**Source:** AWS Documentation

The CloudFormation console URL format:
```
https://{region}.console.aws.amazon.com/cloudformation/home?region={region}#/stacks
```

Example for us-east-1:
```
https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks
```

**Note:** The user must be logged into the correct AWS account via AWS SSO first. The CloudFormation button should work after they've clicked "Launch AWS Console" and authenticated.

### Implementation Pattern to Follow

**Source:** [src/try/api/sessions-service.ts:294-306]

Follow the existing URL builder pattern:

```typescript
// NEW: Add after getPortalUrl function (around line 325)
export function getCfnConsoleUrl(lease: Lease, region = "us-east-1"): string {
  // CloudFormation console URL for the lease's region
  return `https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks`
}
```

### Button Rendering Pattern

**Source:** [src/try/ui/components/sessions-table.ts:136-166]

Follow the exact pattern of existing buttons:

```typescript
// Add after "Get CLI Credentials" button
<a
  href="${cfnUrl}"
  target="_blank"
  rel="noopener noreferrer"
  class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0"
  data-module="govuk-button"
  data-action="launch-cloudformation"
  data-lease-id="${escapeHtml(lease.leaseId)}"
  data-lease-template="${escapeHtml(lease.leaseTemplateName)}"
  data-budget="${lease.maxSpend}"
  data-expires="${escapeHtml(lease.expiresAt || "")}"
>
  Open CloudFormation
  <span class="govuk-visually-hidden">(opens in new tab)</span>
</a>
```

### Analytics Event Handler Pattern

**Source:** [src/try/ui/try-page.ts:120-142]

Follow the existing pattern for tracking:

```typescript
// Add after existing event handlers (around line 142)
const cfnLink = target.closest('[data-action="launch-cloudformation"]') as HTMLElement | null
if (cfnLink) {
  trackCloudFormationAccess(
    cfnLink.dataset.leaseId || "",
    cfnLink.dataset.leaseTemplate || "",
    cfnLink.dataset.budget || "",
    cfnLink.dataset.expires || "",
  )
}
```

### Active Lease Check

**Source:** [src/try/ui/components/sessions-table.ts]

The `isActiveLease()` function already exists and should be reused:

```typescript
function isActiveLease(lease: Lease): boolean {
  return lease.status === 'Active' || lease.status === 'Approved'
}
```

The CloudFormation button should only render when `isActiveLease(lease)` returns true.

### Responsive Styling Considerations

**Source:** [src/try/ui/styles/sessions-table.css]

Current mobile layout (max-width: 768px) stacks buttons vertically. With 3 buttons:
- Ensure margin-bottom spacing is consistent
- First two buttons: `govuk-!-margin-bottom-1`
- Last button: `govuk-!-margin-bottom-0`

### Project Structure Notes

**Files to modify:**
- `src/try/api/sessions-service.ts` - Add `getCfnConsoleUrl()` function
- `src/try/ui/components/sessions-table.ts` - Add button rendering
- `src/try/ui/try-page.ts` - Add analytics event handler
- `src/try/ui/styles/sessions-table.css` - Adjust responsive styling (if needed)
- `src/try/ui/components/sessions-table.test.ts` - Add tests

**Files to potentially add:**
- None - all changes are modifications to existing files

### Testing Strategy

**Source:** [_bmad-output/planning-artifacts/project-context.md - Testing Rules]

1. **Unit tests:** Test URL generation function
2. **Component tests:** Test button rendering with mock lease data
3. **Accessibility:** Verify screen reader text is present
4. **Coverage:** Maintain 80%+ line coverage

```typescript
// Test examples
describe('getCfnConsoleUrl', () => {
  it('returns CloudFormation URL with default region', () => {
    const lease = { awsAccountId: '123456789012' } as Lease
    expect(getCfnConsoleUrl(lease)).toBe(
      'https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks'
    )
  })

  it('accepts custom region', () => {
    const lease = { awsAccountId: '123456789012' } as Lease
    expect(getCfnConsoleUrl(lease, 'eu-west-1')).toBe(
      'https://eu-west-1.console.aws.amazon.com/cloudformation/home?region=eu-west-1#/stacks'
    )
  })
})
```

### Previous Story Learnings (Story 5.1)

**Source:** [_bmad-output/implementation-artifacts/5-1-replace-dynamodb-reads-with-isb-api.md]

Key learnings from previous story:
1. Jest cache can become stale - run `yarn jest --clearCache` if tests fail unexpectedly
2. ISB API provides `awsAccountId` field which this story depends on
3. Module-level mocks with `require()` pattern work better than inline mocks
4. Always verify tests pass before marking tasks complete

### References

- [Source: _bmad-output/planning-artifacts/prd-ndx-try-enhancements.md#Session-Visibility] - FR1, FR2, FR3
- [Source: _bmad-output/planning-artifacts/prd-ndx-try-enhancements.md#Accessibility] - NFR1, NFR3
- [Source: _bmad-output/planning-artifacts/epics-ndx-try-enhancements.md#Story-1.2] - Story requirements
- [Source: _bmad-output/planning-artifacts/project-context.md#GOV.UK-Design-System-Rules] - Button patterns
- [Source: src/try/ui/components/sessions-table.ts] - Existing button implementation
- [Source: src/try/api/sessions-service.ts] - URL builder pattern

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A - Story file created

### Completion Notes List

1. Task 1: Added `getCfnConsoleUrl()` function to `sessions-service.ts` with unit tests
2. Task 2: Added CloudFormation button to `sessions-table.ts` following existing button pattern
3. Task 3: Added `trackCloudFormationAccess()` analytics function and event handler
4. Task 4: Verified existing responsive CSS handles 3-button layout correctly
5. Task 5: Added comprehensive test suite for Story 5.2 CloudFormation button
6. Task 6: All 864 tests pass, no lint errors in source files

### File List

**Modified files:**
- `src/try/api/sessions-service.ts` - Added `getCfnConsoleUrl()` function
- `src/try/api/sessions-service.test.ts` - Added tests for `getCfnConsoleUrl()`
- `src/try/ui/components/sessions-table.ts` - Added CloudFormation button rendering
- `src/try/ui/components/sessions-table.test.ts` - Added Story 5.2 test suite (9 tests)
- `src/try/ui/try-page.ts` - Added CloudFormation analytics event handler
- `src/try/analytics/events.ts` - Added `trackCloudFormationAccess()` function
- `src/try/analytics/index.ts` - Exported new analytics function
- `src/try/analytics/events.test.ts` - Added tests for `trackCloudFormationAccess()` (2 tests)

## Senior Developer Review (AI)

**Reviewed by:** claude-opus-4-5-20251101
**Date:** 2026-01-22

### Review Summary
- **Outcome:** APPROVED
- **Issues Found:** 0 High, 3 Medium, 2 Low
- **Issues Fixed:** 3 (L1, L2, M3)

### Issues Addressed During Review

1. **L1 (Fixed):** Added Story 5.2 reference to module header in `sessions-table.ts`
2. **L2 (Fixed):** Updated JSDoc for `getCfnConsoleUrl()` to clarify region usage
3. **M3 (Fixed):** Added unit tests for `trackCloudFormationAccess()` in `events.test.ts`

### Accepted Issues (No Action Required)

1. **M1:** Inconsistent parameter naming (`expires` vs `duration`) - Intentional; semantically appropriate
2. **M2:** Hardcoded region `us-west-2` - Acceptable for current NDX sandbox deployment

### Verification
- All 866 tests pass
- No lint errors in source files
- All ACs verified as implemented
