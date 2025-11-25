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
