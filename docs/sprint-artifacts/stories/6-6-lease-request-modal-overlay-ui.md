# Story 6.6: Lease Request Modal Overlay UI

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - Core user interaction for sandbox requests
**Status:** done
**Dependencies:** Story 6.5 (auth check before modal)

## User Story

As an authenticated catalogue user,
I want to see a modal when I click "Try this now",
So that I can review and accept the AUP before requesting a sandbox.

## Acceptance Criteria

### AC1: Dark Overlay Background
**Given** the user clicks "Try this now" button
**When** the AUP modal opens
**Then** a dark semi-transparent overlay covers the page

### AC2: Modal Header
**Given** the AUP modal is open
**When** the user views the modal
**Then** they see "Request AWS Sandbox Access" as the header

### AC3: Session Information Display
**Given** the AUP modal is open
**When** the user views the modal
**Then** they see:
- Session duration: 24 hours
- Budget limit: $50 USD

### AC4: Scrollable AUP Container
**Given** the AUP modal is open
**When** the AUP content is longer than the container
**Then** the AUP section is scrollable

### AC5: AUP Checkbox with Label
**Given** the AUP modal is open
**When** the user views the checkbox
**Then** they see "I have read and accept the Acceptable Use Policy"

### AC6: Cancel and Continue Buttons
**Given** the AUP modal is open
**When** the user views the footer
**Then** they see Cancel and Continue buttons

### AC7: Focus Trap (ADR-026)
**Given** the AUP modal is open
**When** the user presses Tab
**Then** focus cycles within the modal (does not escape to page)

### AC8: ARIA Attributes
**Given** the AUP modal is open
**When** inspecting the HTML
**Then** it has:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` pointing to title
- `aria-describedby` pointing to description

## Technical Implementation

### Tasks Completed

- [x] Created `src/try/ui/utils/focus-trap.ts` utility
- [x] Created `src/try/ui/utils/aria-live.ts` utility
- [x] Created `src/try/ui/components/aup-modal.ts` component
- [x] Implemented modal open/close lifecycle
- [x] Implemented focus trap with Escape key handling
- [x] Implemented ARIA live region announcements
- [x] Updated `try-button.ts` to open modal
- [x] Integrated modal styles inline (no external CSS)

## Definition of Done

- [x] Modal has dark overlay background
- [x] Modal has "Request AWS Sandbox Access" header
- [x] Modal displays lease duration (24 hours) and budget ($50)
- [x] Modal has scrollable AUP container
- [x] Modal has AUP checkbox with label
- [x] Modal has Cancel and Continue buttons
- [x] Focus trap implemented (Tab cycles within modal)
- [x] Escape key closes modal
- [x] ARIA attributes present for accessibility
- [x] Build passes

---

## Dev Agent Record

### Context Reference
- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`
- ADR-026: Accessible Modal Pattern

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
1. Created focus-trap.ts with Tab/Shift+Tab cycling
2. Created aria-live.ts for screen reader announcements
3. Created aup-modal.ts as singleton class with open/close methods
4. Modal uses inline CSS (injected once on first open)
5. Focus trap activates on modal open, deactivates on close
6. Confirmation dialog shown if checkbox checked and user cancels
7. Button states update based on checkbox and loading state
8. ARIA live announcements for state changes

### File List
- `src/try/ui/utils/focus-trap.ts` - New (136 lines)
- `src/try/ui/utils/aria-live.ts` - New (68 lines)
- `src/try/ui/components/aup-modal.ts` - New (400 lines)
- `src/try/ui/try-button.ts` - Updated with modal integration
