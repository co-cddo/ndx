# Story 6.7: Fetch and Display AUP from Innovation Sandbox API

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - Required for user consent flow
**Status:** done
**Dependencies:** Story 6.6 (modal UI)

## User Story

As a user viewing the AUP modal,
I want to see the current Acceptable Use Policy from the API,
So that I'm accepting the latest terms before using the sandbox.

## Acceptance Criteria

### AC1: AUP Fetched from API
**Given** the AUP modal opens
**When** it initializes
**Then** it fetches AUP from GET /api/configurations

### AC2: AUP Displayed in Scrollable Container
**Given** the AUP is fetched successfully
**When** the content loads
**Then** it displays in the scrollable AUP container

### AC3: Loading Indicator
**Given** the AUP modal opens
**When** the API request is in progress
**Then** "Loading Acceptable Use Policy..." is shown

### AC4: Error Handling with Fallback
**Given** the API request fails
**When** an error occurs
**Then**:
- An error message is shown
- A fallback AUP policy is displayed
- User can still proceed with acceptance

## Technical Implementation

### Tasks Completed

- [x] Created `src/try/api/configurations-service.ts`
- [x] Implemented `fetchConfigurations()` function
- [x] Added request timeout handling (10s)
- [x] Implemented fallback AUP content
- [x] Added user-friendly error messages (ADR-032)
- [x] Integrated with aup-modal.ts via `loadAupContent()`
- [x] Added ARIA live announcements for loading states

## Definition of Done

- [x] AUP fetched from /api/configurations on modal open
- [x] AUP displayed in scrollable container
- [x] Loading indicator shown while fetching
- [x] Error handling with fallback AUP
- [x] User-friendly error messages
- [x] Request timeout handling (10s)
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
1. Created configurations-service.ts with fetchConfigurations()
2. Uses callISBAPI from existing api-client.ts
3. Implements 10-second timeout with AbortController
4. Provides fallback AUP content if API fails
5. Maps HTTP status codes to user-friendly messages
6. Added loadAupContent() method to AupModal class
7. ARIA live announcements for loading/loaded states

### File List
- `src/try/api/configurations-service.ts` - New (165 lines)
- `src/try/ui/components/aup-modal.ts` - Updated with loadAupContent()
