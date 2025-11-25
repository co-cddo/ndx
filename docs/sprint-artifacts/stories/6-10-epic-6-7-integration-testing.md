# Story 6.10: Epic 6-7 Integration Testing

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Testing Story
**Priority:** Medium - Validation of complete flow
**Status:** done
**Dependencies:** Stories 6.1-6.9 (Try flow implementation)

## User Story

As a developer,
I want integration tests for the catalogue to dashboard flow,
So that I can validate the complete user journey works correctly.

## Acceptance Criteria

### AC1: Product Page Has Try Button
**Given** a product with try: true
**When** the page renders
**Then** Try button has correct attributes (data-module, data-try-id)

### AC2: Modal Opens for Authenticated Users
**Given** user is authenticated
**When** they click Try button
**Then** AUP modal opens

### AC3: Modal Displays Session Info
**Given** AUP modal is open
**When** user views content
**Then** they see 24 hours duration and $50 budget

### AC4: Checkbox Enables Continue
**Given** AUP modal is open
**When** user checks checkbox
**Then** Continue button becomes enabled

### AC5-7: Modal Interactions
- Cancel button closes modal
- Escape key closes modal
- Focus trap keeps focus within modal

### AC8: Unauthenticated User Redirect
**Given** user is NOT authenticated
**When** they click Try button
**Then** they are redirected to /api/auth/login

### AC9-10: Catalogue Filter
- Try Before You Buy filter shows tryable products
- Try tag visible on product cards

## Technical Implementation

### Tasks Completed

- [x] Created `tests/e2e/catalogue/try-flow.spec.ts`
- [x] Implemented 10 test cases covering:
  - Product page Try button attributes
  - Modal open for authenticated users
  - Session info display (24h, $50)
  - Checkbox/Continue button interaction
  - Cancel button close
  - Escape key close
  - Focus trap validation
  - Unauthenticated user redirect
  - Try filter page
  - Try tag on product cards

## Definition of Done

- [x] Integration tests created for Try flow
- [x] Tests cover authenticated user modal flow
- [x] Tests cover unauthenticated user redirect
- [x] Tests cover catalogue filter
- [x] Tests validate accessibility (focus trap, keyboard nav)

## Notes

Full Epic 7 integration (sessions table display after lease creation)
will be validated when Epic 7 is implemented. These tests cover the
Epic 6 portion of the flow.

---

## Dev Agent Record

### Context Reference
- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
1. Created Playwright test file with 10 test cases
2. Tests authenticate via sessionStorage token injection
3. Tests use real CloudFront deployment URL
4. Focus trap test validates modal accessibility
5. Unauthenticated test verifies redirect to login
6. Catalogue filter tests validate tag display

### File List
- `tests/e2e/catalogue/try-flow.spec.ts` - New (175 lines)
