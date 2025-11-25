# Story 6.5: Try Button Authentication Check

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - Gate for sandbox request flow
**Status:** done
**Dependencies:** Story 6.4 (try button), Story 5.4 (sessionStorage JWT persistence)

## User Story

As a catalogue user clicking "Try this now for 24 hours",
I want the system to check if I'm authenticated,
So that unauthenticated users are redirected to login first.

## Acceptance Criteria

### AC1: Authentication Check on Button Click
**Given** a user clicks the "Try this now for 24 hours" button
**When** the click handler executes
**Then** it checks authentication status via `authState.isAuthenticated()`

### AC2: Unauthenticated User Redirect
**Given** the user is NOT authenticated
**When** they click the try button
**Then** they are redirected to `/api/auth/login`

### AC3: Return URL Storage
**Given** an unauthenticated user clicks the try button
**When** they are redirected to login
**Then** the current page URL is stored in sessionStorage for post-login return

### AC4: Authenticated User Proceeds
**Given** the user IS authenticated (JWT in sessionStorage)
**When** they click the try button
**Then** they proceed to the AUP modal (Story 6.6)

### AC5: Missing try-id Error Handling
**Given** a try button without `data-try-id` attribute
**When** clicked
**Then** an error is logged and no action is taken

## Technical Implementation

### Tasks Completed

- [x] Created `src/try/ui/try-button.ts` module
- [x] Implemented `initTryButton()` to attach click handlers
- [x] Implemented `handleTryButtonClick()` with auth check
- [x] Implemented `storeReturnUrl()` for return URL persistence
- [x] Exported `getAndClearReturnUrl()` for OAuth callback use
- [x] Added import and call in `src/try/main.ts`

## Definition of Done

- [x] Try button click handler checks authentication
- [x] Unauthenticated users redirected to `/api/auth/login`
- [x] Return URL stored in sessionStorage before redirect
- [x] Authenticated users proceed (logged, awaiting Story 6.6)
- [x] Missing `data-try-id` logged as error
- [x] Build passes

---

## Dev Agent Record

### Context Reference
- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`
- Auth Provider: `src/try/auth/auth-provider.ts`

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
1. Created `src/try/ui/try-button.ts` with full implementation
2. Uses `authState.isAuthenticated()` from auth-provider
3. Stores return URL with key `isb-return-url` in sessionStorage
4. Redirects to `/api/auth/login` for unauthenticated users
5. Logs authenticated user intent (placeholder for Story 6.6)
6. Added to main.ts initialization chain

### File List
- `src/try/ui/try-button.ts` - New module (106 lines)
- `src/try/main.ts` - Added import and initTryButton() call
