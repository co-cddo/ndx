# Story 6.11: Automated Accessibility Tests for Catalogue Try UI

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Testing Story
**Priority:** High - WCAG 2.2 AA compliance validation
**Status:** done
**Dependencies:** Stories 6.1-6.10 (Try flow implementation)

## User Story

As a developer,
I want automated accessibility tests for the Try UI,
So that I can ensure WCAG 2.2 AA compliance for all users.

## Acceptance Criteria

### AC1: Try Button Keyboard Accessible
**Given** the Try button on product page
**When** user navigates with Tab/Enter/Space
**Then** button is focusable and activatable

### AC2: Modal ARIA Attributes
**Given** the AUP modal is open
**When** inspected
**Then** it has:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` pointing to title
- `aria-describedby` pointing to description

### AC3: Focus Trap Works
**Given** the AUP modal is open
**When** user presses Tab repeatedly
**Then** focus cycles within modal only

### AC4: Escape Key Closes Modal
**Given** the AUP modal is open
**When** user presses Escape
**Then** modal closes

### AC5: Checkbox Label Associated
**Given** the AUP checkbox
**When** label is inspected
**Then** it has `for` attribute matching checkbox `id`

### AC6: Disabled Button State Announced
**Given** Continue button is disabled
**When** screen reader announces
**Then** `aria-disabled="true"` is set

### AC7: Tests Run in CI Pipeline
**Given** tests exist
**When** CI runs
**Then** accessibility tests execute automatically

## Technical Implementation

### Tasks Completed

- [x] Created `tests/e2e/accessibility/catalogue-try-accessibility.spec.ts`
- [x] Implemented 19 accessibility test cases covering:
  - Try button keyboard navigation (Tab, Enter, Space)
  - Modal ARIA attributes (role, aria-modal, aria-labelledby, aria-describedby)
  - Focus trap (Tab cycling, Shift+Tab reverse cycling)
  - Escape key close
  - Checkbox-label association
  - Disabled button aria-disabled state
  - axe-core WCAG 2.2 AA scanning for:
    - Product page
    - Try filter page
    - AUP modal open state
    - Catalogue page with tags

## Definition of Done

- [x] Try button keyboard accessible (Tab, Enter, Space)
- [x] Modal has role="dialog" and aria-modal="true"
- [x] Focus trap tested (Tab and Shift+Tab)
- [x] Escape key closes modal
- [x] Checkbox label properly associated
- [x] Disabled button has aria-disabled
- [x] axe-core WCAG 2.2 AA scanning implemented
- [x] Tests integrated with existing e2e test suite

---

## Dev Agent Record

### Context Reference
- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`
- ADR-026: Accessible Modal Pattern

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
1. Created comprehensive accessibility test suite
2. Tests use @axe-core/playwright for WCAG scanning
3. Tests cover keyboard navigation (Tab, Enter, Space, Escape)
4. Tests validate all required ARIA attributes
5. Tests verify focus trap functionality
6. Tests confirm label-checkbox association
7. Tests check aria-disabled state updates
8. All tests use authenticated session for modal testing

### File List
- `tests/e2e/accessibility/catalogue-try-accessibility.spec.ts` - New (300 lines)
