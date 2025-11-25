# Story 6.9: Submit Lease Request and Handle Responses

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - Core API integration
**Status:** done
**Dependencies:** Story 6.8 (checkbox state)

## User Story

As a user who has accepted the AUP,
I want to submit a sandbox lease request,
So that I can get access to an AWS sandbox environment.

## Acceptance Criteria

### AC1: POST Lease Request
**Given** the user clicks Continue after accepting AUP
**When** the request submits
**Then** POST /api/leases is called with leaseTemplateId and acceptedAUP: true

### AC2: Loading Indicator During Request
**Given** the lease request is in progress
**When** the API call is active
**Then** a loading indicator is shown ("Requesting...")

### AC3: Success (200/201) Navigation
**Given** the lease request succeeds
**When** the API returns 200/201
**Then** the modal closes and user is redirected to /try

### AC4: Conflict (409) Handling
**Given** the user has max active sessions
**When** the API returns 409 Conflict
**Then** an alert is shown and user is redirected to /try

### AC5: Server Error Handling
**Given** a server error occurs
**When** the API returns 500/503
**Then** an error message is shown in the modal

### AC6: Modal Closes After Completion
**Given** the request completes (success or specific errors)
**When** the response is handled
**Then** the modal closes appropriately

## Technical Implementation

### Tasks Completed

- [x] Created `src/try/api/leases-service.ts`
- [x] Implemented `createLease()` function with all response handling
- [x] Added request timeout (10 seconds)
- [x] Implemented user-friendly error messages (ADR-032)
- [x] Updated `try-button.ts` handleLeaseAccept to use service
- [x] Handle 200/201 success → close modal, redirect to /try
- [x] Handle 409 conflict → alert, redirect to /try
- [x] Handle 500/503 errors → show error in modal
- [x] Handle network/timeout errors → show error in modal

## Definition of Done

- [x] POST /api/leases called with correct payload
- [x] Loading indicator shown during request
- [x] 200/201 → redirect to /try
- [x] 409 → alert + redirect to /try
- [x] 500/503 → error in modal
- [x] Network errors handled gracefully
- [x] Build passes

---

## Dev Agent Record

### Context Reference
- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`
- ADR-021: Centralized API Client
- ADR-032: User-Friendly Error Messages

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
1. Created leases-service.ts with createLease() function
2. Uses callISBAPI for automatic auth header injection
3. Returns typed LeaseCreationResult with error codes
4. Error codes: CONFLICT, UNAUTHORIZED, SERVER_ERROR, NETWORK_ERROR, TIMEOUT
5. Updated handleLeaseAccept in try-button.ts to use service
6. Switch statement handles different error codes appropriately
7. Success closes modal and redirects to /try
8. Conflict shows alert then redirects
9. Server errors show in modal for retry

### File List
- `src/try/api/leases-service.ts` - New (180 lines)
- `src/try/ui/try-button.ts` - Updated handleLeaseAccept
