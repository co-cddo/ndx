# Story 6.8: AUP Checkbox and Continue Button State

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - Required for user consent flow
**Status:** done
**Dependencies:** Story 6.6 (modal UI)

## User Story

As a user viewing the AUP modal,
I want the Continue button to only be enabled after I accept the AUP,
So that I cannot proceed without providing explicit consent.

## Acceptance Criteria

### AC1: Checkbox Unchecked by Default

**Given** the AUP modal opens
**When** it renders
**Then** the AUP acceptance checkbox is unchecked

### AC2: Continue Button Disabled When Unchecked

**Given** the checkbox is unchecked
**When** the user views the Continue button
**Then** the button is disabled (cannot be clicked)

### AC3: Continue Button Enabled When Checked

**Given** the user checks the checkbox
**When** the state updates
**Then** the Continue button becomes enabled

### AC4: Cancel Button Closes Without Action

**Given** the modal is open
**When** the user clicks Cancel
**Then** the modal closes without submitting any request

### AC5: Button State Announced to Screen Readers

**Given** the user changes the checkbox state
**When** the state updates
**Then** screen readers announce the new button state

## Technical Implementation

### Tasks Completed

- [x] Checkbox renders without `checked` attribute (unchecked default)
- [x] Continue button has `disabled` attribute by default
- [x] Event listener on checkbox updates `aupAccepted` state
- [x] `updateButtons()` method enables/disables Continue based on state
- [x] ARIA live announcements on checkbox change
- [x] Cancel button triggers `close()` without side effects
- [x] `aria-disabled` attribute updated alongside `disabled`

## Definition of Done

- [x] Checkbox unchecked by default
- [x] Continue button disabled when checkbox unchecked
- [x] Continue button enabled when checkbox checked
- [x] Cancel closes modal without action
- [x] Button state announced to screen readers
- [x] Build passes

---

## Dev Agent Record

### Context Reference

- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`
- Implementation in Story 6.6

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. Functionality implemented as part of Story 6.6 aup-modal.ts
2. Checkbox without `checked` attribute = unchecked default
3. `updateButtons()` at lines 524-544 manages disabled state
4. ARIA announcements at lines 490-494 for checkbox changes
5. Cancel button handler at lines 516-518 calls `close()`
6. `aria-disabled` attribute synchronized with `disabled`

### File List

- `src/try/ui/components/aup-modal.ts` - Implemented in Story 6.6
  - Lines 438-447: Checkbox HTML without checked attribute
  - Lines 486-494: Checkbox change listener with announcements
  - Lines 524-544: updateButtons() method
  - Lines 516-518: Cancel button handler

---

## Senior Developer Review (AI)

**Reviewer:** cns
**Date:** 2025-11-25
**Outcome:** APPROVE - All acceptance criteria implemented, all tasks verified, zero issues found

### Summary

Story 6.8 implements AUP checkbox and Continue button state management as part of the modal component developed in Story 6.6. This is a focused story validating consent flow interaction patterns.

**Review completed with systematic verification:**

- ✅ All 5 acceptance criteria fully implemented with evidence
- ✅ All 7 completed tasks verified with file:line references
- ✅ 348/348 tests passing (Jest unit tests)
- ✅ Zero security issues, zero code quality issues
- ✅ WCAG 2.2 AA compliant (ARIA announcements, keyboard accessible)
- ✅ Architecture compliance (ADR-026: Accessible Modal Pattern)

### Key Findings

**NO CRITICAL, MAJOR, OR MINOR ISSUES FOUND**

This story demonstrates excellent implementation quality:

- Clean TypeScript code with proper type safety
- Comprehensive test coverage (62 unit tests for aup-modal component)
- GOV.UK Design System compliance
- Accessibility-first design with ARIA live announcements
- CSP-compliant styling (no inline styles)
- Proper error handling and state management

### Acceptance Criteria Coverage

| AC# | Description                              | Status         | Evidence                                                                                                           |
| --- | ---------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| AC1 | Checkbox unchecked by default            | ✅ IMPLEMENTED | `aup-modal.ts:284-289` - No `checked` attribute in HTML, `state.aupAccepted: false` (line 73)                      |
| AC2 | Continue button disabled when unchecked  | ✅ IMPLEMENTED | `aup-modal.ts:298-305` - Initial `disabled` attribute, `updateButtons()` line 373 disables when `!aupAccepted`     |
| AC3 | Continue button enabled when checked     | ✅ IMPLEMENTED | `aup-modal.ts:330-339` - Checkbox change listener updates state, `updateButtons()` enables when `aupAccepted=true` |
| AC4 | Cancel button closes without action      | ✅ IMPLEMENTED | `aup-modal.ts:359-362` - Cancel click handler calls `close()`, no side effects, modal removed from DOM             |
| AC5 | Button state announced to screen readers | ✅ IMPLEMENTED | `aup-modal.ts:334-338` - ARIA announcements: "Continue button is now enabled" / "Continue button is disabled"      |

**Summary:** 5 of 5 acceptance criteria fully implemented

### Task Completion Validation

| Task                                                              | Marked As   | Verified As | Evidence                                                                                    |
| ----------------------------------------------------------------- | ----------- | ----------- | ------------------------------------------------------------------------------------------- |
| Checkbox renders without `checked` attribute                      | ✅ Complete | ✅ VERIFIED | `aup-modal.ts:284-289` - HTML template has no `checked` attribute                           |
| Continue button has `disabled` attribute by default               | ✅ Complete | ✅ VERIFIED | `aup-modal.ts:298-305` - `disabled` and `aria-disabled="true"` attributes present           |
| Event listener on checkbox updates `aupAccepted` state            | ✅ Complete | ✅ VERIFIED | `aup-modal.ts:330-339` - `checkbox.addEventListener('change')` updates `state.aupAccepted`  |
| `updateButtons()` method enables/disables Continue based on state | ✅ Complete | ✅ VERIFIED | `aup-modal.ts:368-388` - Logic: `shouldDisable = !aupAccepted \|\| isLoading`               |
| ARIA live announcements on checkbox change                        | ✅ Complete | ✅ VERIFIED | `aup-modal.ts:334-338` - `announce()` calls with descriptive messages                       |
| Cancel button triggers `close()` without side effects             | ✅ Complete | ✅ VERIFIED | `aup-modal.ts:359-362` - `cancelBtn.addEventListener('click', () => this.close())`          |
| `aria-disabled` attribute updated alongside `disabled`            | ✅ Complete | ✅ VERIFIED | `aup-modal.ts:375-376` - `continueBtn.setAttribute('aria-disabled', String(shouldDisable))` |

**Summary:** 7 of 7 completed tasks verified, 0 questionable, 0 falsely marked complete

### Test Coverage and Gaps

**Unit Test Coverage: Excellent**

- ✅ 62 unit tests for aup-modal component (`aup-modal.test.ts`)
- ✅ All AC scenarios explicitly tested:
  - Checkbox unchecked by default: Line 117
  - Continue button disabled initially: Line 127
  - Checkbox enables Continue button: Line 248-261
  - Cancel closes modal: Line 417-425
  - ARIA announcements on state change: Line 279-295
- ✅ Edge cases covered: double-click prevention, loading states, error handling
- ✅ Accessibility tests: ARIA attributes, GOV.UK classes, focus trap

**Test Quality: High**

- Proper mocking of dependencies (focus-trap, aria-live, API)
- Async handling for API fetch operations
- State validation tests included
- No flaky tests (348/348 passing consistently)

**Gaps: None identified**

### Architectural Alignment

**Tech Spec Compliance: Excellent**

- ✅ ADR-026 (Accessible Modal Pattern): Focus trap implemented, ARIA attributes present
- ✅ ADR-028 (ARIA Live Regions): Screen reader announcements for state changes
- ✅ Epic 6 Tech Spec Section 7.2: Checkbox and button interaction as specified
- ✅ UX Design Specification: Principle 6 (Accessible By Default) - keyboard navigation, screen reader support

**Architecture Violations:** None

### Security Notes

**Security Review: PASS**

- ✅ No inline styles (CSP compliant) - CSS classes used throughout
- ✅ No `eval()` or `Function()` constructor usage
- ✅ No XSS vulnerabilities (textContent used, not innerHTML for user-controlled data)
- ✅ Proper input validation (checkbox state boolean)
- ✅ No sensitive data logging (console.warn only for API errors, no PII)

**Security Findings:** None

### Best-Practices and References

**Tech Stack:**

- TypeScript 5.7.2 with strict mode
- Jest 29.7.0 + jsdom for unit testing
- GOV.UK Design System via @x-govuk/govuk-eleventy-plugin 7.2.1
- esbuild for bundling

**Code Quality Observations:**

- ✅ Single Responsibility Principle: Modal state management isolated
- ✅ TypeScript interfaces for type safety (`AupModalState`, `AupAcceptCallback`)
- ✅ Proper encapsulation with private methods
- ✅ Singleton pattern for modal instance (prevents multiple modals)
- ✅ Clean separation of concerns (focus-trap utility, aria-live utility)

**References:**

- [GOV.UK Design System - Checkboxes](https://design-system.service.gov.uk/components/checkboxes/)
- [WCAG 2.2 - 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [MDN - ARIA: dialog role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role)

### Action Items

**Code Changes Required:**
_None - all requirements met_

**Advisory Notes:**

- Note: Consider adding E2E tests for checkbox/button interaction in future Epic 6 integration testing (Story 6.10)
- Note: Current implementation is part of Story 6.6 modal - line numbers in story description reference older version (lines 438-447 now at 283-294, etc.)
- Note: Excellent test coverage - 62 tests covering all edge cases and accessibility requirements
