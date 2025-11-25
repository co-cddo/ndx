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
- `src/try/api/configurations-service.ts` - New (237 lines)
- `src/try/ui/components/aup-modal.ts` - Updated with loadAupContent()

---

## Senior Developer Review (AI)

**Reviewer:** cns
**Date:** 2025-11-25
**Outcome:** APPROVE

### Summary

Story 6.7 successfully implements AUP fetching and display from the Innovation Sandbox API with comprehensive error handling, fallback content, and excellent test coverage. All 4 acceptance criteria are fully implemented with evidence. All 7 tasks marked complete were verified to be actually done. The implementation follows ADR-032 for user-friendly error messages and includes proper ARIA announcements for accessibility.

**Key Strengths:**
- Robust error handling with fallback AUP content
- 10-second timeout with AbortController
- User-friendly error messages per ADR-032
- ARIA live region announcements for loading states
- Comprehensive unit tests (25 tests, all passing)
- Handles both nested JSend and flat API response formats
- Integration with aup-modal.ts via loadAupContent() method

**Test Results:**
- configurations-service.test.ts: 25/25 tests passing
- aup-modal.test.ts: 37/37 tests passing
- Overall test suite: 348/348 tests passing
- Build: Successful (no TypeScript errors)
- Linting: Clean (no errors)

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | AUP fetched from GET /api/configurations | IMPLEMENTED | `src/try/ui/components/aup-modal.ts:106,122` - loadAupContent() calls fetchConfigurations() on modal open |
| AC2 | AUP displayed in scrollable container | IMPLEMENTED | `src/try/ui/components/aup-modal.ts:278-279` - aup-modal__aup-container with aupContent.textContent set to result.data.aup (line 125) |
| AC3 | Loading indicator shown | IMPLEMENTED | `src/try/ui/components/aup-modal.ts:118-119` - Shows "Loading Acceptable Use Policy..." text and ARIA announcement |
| AC4 | Error handling with fallback AUP | IMPLEMENTED | `src/try/ui/components/aup-modal.ts:124-140` - Success path (line 125), error paths with fallback (lines 130, 138), error messages shown (lines 133, 139) |

**Summary:** 4 of 4 acceptance criteria fully implemented

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Created configurations-service.ts | COMPLETE | VERIFIED | File exists at `src/try/api/configurations-service.ts` (237 lines) |
| Implemented fetchConfigurations() | COMPLETE | VERIFIED | Function at line 121, returns ConfigurationsResult with success/error handling |
| Added request timeout (10s) | COMPLETE | VERIFIED | Lines 106, 122-123: REQUEST_TIMEOUT=10000, AbortController with setTimeout |
| Implemented fallback AUP | COMPLETE | VERIFIED | Lines 73-87: FALLBACK_AUP constant, getFallbackAup() function (line 234) |
| User-friendly error messages (ADR-032) | COMPLETE | VERIFIED | Lines 138, 205-226: getErrorMessage() function with status code mapping |
| Integrated with aup-modal.ts | COMPLETE | VERIFIED | aup-modal.ts lines 21, 106, 113: imports and calls loadAupContent() |
| ARIA live announcements | COMPLETE | VERIFIED | aup-modal.ts lines 119, 126: announce() calls for loading/loaded states |

**Summary:** 7 of 7 completed tasks verified, 0 questionable, 0 falsely marked complete

### Test Coverage and Gaps

**Unit Tests:**
- ✅ configurations-service.test.ts: 25 tests covering success scenarios, API errors (401, 403, 404, 500, 502, 503, 504), network errors, timeout handling, fallback AUP
- ✅ aup-modal.test.ts: 37 tests covering modal rendering, AUP loading, checkbox interaction, button states, error handling, accessibility

**Coverage Highlights:**
- Nested JSend response format parsing (actual API format)
- Legacy flat response format (backwards compatibility)
- All HTTP error codes mapped to user-friendly messages
- Network timeout (AbortError) handling
- Fallback AUP when API fails or returns invalid data
- ARIA announcements for loading/loaded/error states
- Focus trap and keyboard navigation

**Test Quality:** Excellent - comprehensive edge cases, proper mocking, assertions with evidence

**Gaps:** None identified

### Architectural Alignment

**Tech Spec Compliance:**
- ✅ Uses centralized API client (ADR-021: callISBAPI)
- ✅ User-friendly error messages (ADR-032)
- ✅ ARIA live regions (ADR-028)
- ✅ Modal integration (ADR-026)
- ✅ 10-second timeout per NFR-TRY-PERF-2

**Architecture Violations:** None

**Best Practices:**
- TypeScript interfaces for type safety (ConfigurationResponse, RawConfigurationResponse)
- Defensive parsing of API responses (handles nested and flat formats)
- Console logging with prefixes for debugging
- Error handling with try-catch and proper cleanup
- Constants for magic values (REQUEST_TIMEOUT, CONFIGURATIONS_ENDPOINT)

### Security Notes

**Security Considerations:**
- ✅ skipAuthRedirect: true prevents redirect loop in modal context
- ✅ No sensitive data logged (only error status codes)
- ✅ Timeout prevents hanging requests
- ✅ Fallback AUP ensures user can still proceed if API fails
- ✅ Uses existing callISBAPI which includes JWT auth header injection

**No security issues found.**

### Best-Practices and References

**Technologies:**
- TypeScript 5.x with strict type checking
- Fetch API with AbortController for timeout
- Jest with jsdom for unit testing
- ESLint for code quality

**API Response Format:**
The implementation correctly handles the Innovation Sandbox API's JSend format:
```typescript
{
  status: "success",
  data: {
    termsOfService: "...",
    leases: {
      maxLeasesPerUser: 3,
      maxDurationHours: 24,
      maxBudget: 50
    }
  }
}
```

With fallback to legacy flat format for backwards compatibility.

**Error Mapping (ADR-032):**
- 401: "Please sign in to continue."
- 403: "You do not have permission to access this resource."
- 404: "Configuration not found. Please contact support."
- 500-504: "The sandbox service is temporarily unavailable. Please try again later."
- Timeout: "Request timed out. Please check your connection and try again."
- Network: "Unable to load configuration. Please try again."

### Action Items

**No action items required.** All acceptance criteria met, all tasks verified complete, all tests passing, no architectural violations, no security issues.

---

**Change Log:**
- 2025-11-25: Senior Developer Review notes appended - APPROVED
