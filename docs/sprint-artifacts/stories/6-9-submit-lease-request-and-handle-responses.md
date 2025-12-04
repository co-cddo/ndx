# Story 6.9: Submit Lease Request and Handle Responses

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - Core API integration
**Status:** done
**Dependencies:** Story 6.8 (checkbox state)
**Review Status:** APPROVED (2025-11-25)

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

- `src/try/api/leases-service.ts` - New (276 lines)
- `src/try/api/leases-service.test.ts` - New (418 lines, 22 tests)
- `src/try/ui/try-button.ts` - Updated handleLeaseAccept (lines 83-122)
- `src/try/ui/try-button.test.ts` - Updated (377 lines, 22 tests)

---

## Senior Developer Review (AI)

**Reviewer:** cns
**Date:** 2025-11-25
**Review Type:** Systematic Code Review (Story 6.9)
**Outcome:** APPROVE

### Summary

Story 6.9 implementation is **APPROVED**. All acceptance criteria are fully implemented with comprehensive test coverage. The lease request service and error handling follow architectural patterns (ADR-021, ADR-032) with user-friendly error messages. All 348 tests pass, including 44 tests specific to this story (22 for leases-service, 22 for try-button). Build completes successfully with no errors.

**Key Strengths:**

- Complete API integration with Innovation Sandbox lease endpoint
- Comprehensive error handling for all HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500-504)
- User-friendly error messages per ADR-032
- Request timeout protection (10 seconds)
- Excellent test coverage (100% of error paths tested)
- Proper separation of concerns (service layer vs UI layer)

**No issues found** - Story is ready for production.

---

### Acceptance Criteria Coverage

| AC# | Description                                           | Status      | Evidence                                                                                                                                                                                                        |
| --- | ----------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | POST /api/leases with leaseTemplateId and acceptedAUP | IMPLEMENTED | `leases-service.ts:115-122` - Payload constructed with `leaseTemplateUuid` and `comments` field recording AUP acceptance. Test: `leases-service.test.ts:71-88`                                                  |
| AC2 | Loading indicator shown during request                | IMPLEMENTED | `aup-modal.ts:85-98` - Modal state includes `isLoading` flag. Loading UI managed by modal component during async createLease call                                                                               |
| AC3 | Success (200/201) → close modal, redirect to /try     | IMPLEMENTED | `leases-service.ts:134-141` - Returns success for 200/201. `try-button.ts:88-93` - Closes modal and redirects. Tests: `leases-service.test.ts:28-69`, `try-button.test.ts:254-272`                              |
| AC4 | Conflict (409) → alert, redirect to /try              | IMPLEMENTED | `leases-service.ts:148-165` - Returns CONFLICT error code with user-friendly messages. `try-button.ts:98-104` - Shows alert and redirects. Tests: `leases-service.test.ts:91-149`, `try-button.test.ts:274-301` |
| AC5 | Server errors (500/503) → error in modal              | IMPLEMENTED | `leases-service.ts:224-233` - Returns SERVER_ERROR for 500-504 status codes. `try-button.ts:114-120` - Shows error in modal. Tests: `leases-service.test.ts:278-331`, `try-button.test.ts:350-361`              |
| AC6 | Modal closes after completion                         | IMPLEMENTED | `try-button.ts:88-120` - Modal closes on success (line 91) and CONFLICT (line 101). Stays open for retryable errors. Tests verify all closure paths                                                             |

**Summary:** 6 of 6 acceptance criteria fully implemented with evidence

---

### Task Completion Validation

| Task                                                            | Marked As    | Verified As | Evidence                                                                                                   |
| --------------------------------------------------------------- | ------------ | ----------- | ---------------------------------------------------------------------------------------------------------- |
| Created `src/try/api/leases-service.ts`                         | [x] Complete | VERIFIED    | File exists at `src/try/api/leases-service.ts` (276 lines)                                                 |
| Implemented `createLease()` function with all response handling | [x] Complete | VERIFIED    | `leases-service.ts:115-275` - Complete implementation with 10 HTTP status codes handled                    |
| Added request timeout (10 seconds)                              | [x] Complete | VERIFIED    | `leases-service.ts:75,116-117` - 10000ms timeout with AbortController                                      |
| Implemented user-friendly error messages (ADR-032)              | [x] Complete | VERIFIED    | `leases-service.ts:59-65,147-273` - User-friendly messages for all error cases                             |
| Updated `try-button.ts` handleLeaseAccept to use service        | [x] Complete | VERIFIED    | `try-button.ts:83-122` - Complete integration with createLease service                                     |
| Handle 200/201 success → close modal, redirect to /try          | [x] Complete | VERIFIED    | `try-button.ts:88-93` - Verified with tests                                                                |
| Handle 409 conflict → alert, redirect to /try                   | [x] Complete | VERIFIED    | `try-button.ts:98-104` - Alert shown, redirects to /try                                                    |
| Handle 500/503 errors → show error in modal                     | [x] Complete | VERIFIED    | `try-button.ts:114-120` - Error shown in modal via aupModal.showError()                                    |
| Handle network/timeout errors → show error in modal             | [x] Complete | VERIFIED    | `leases-service.ts:246-274` - Timeout and network errors handled. `try-button.ts:113-120` - Shows in modal |

**Summary:** 9 of 9 completed tasks verified with file:line evidence. **Zero false completions detected.**

---

### Test Coverage and Quality

**Unit Test Coverage:**

- **leases-service.test.ts:** 22 tests passing
  - Success scenarios (200, 201)
  - All error codes (400, 401, 403, 404, 409, 500-504)
  - Network errors (timeout, generic network)
  - Edge cases (JSON parse errors, no accounts, max leases)
  - **Coverage:** 100% of error handling paths

- **try-button.test.ts:** 22 tests passing
  - Authentication check integration
  - Modal opening for authenticated users
  - Lease acceptance callback integration
  - All response handling paths (SUCCESS, CONFLICT, UNAUTHORIZED, TIMEOUT, NETWORK_ERROR, SERVER_ERROR)
  - **Coverage:** Complete integration testing

**Test Quality:**

- Tests use proper mocking (jest.mock)
- Tests verify both happy path and error paths
- Tests include edge cases (missing tryId, JSON parse failures)
- Console logging properly mocked to avoid test noise
- Tests follow AAA pattern (Arrange, Act, Assert)

**Total Test Suite:** 348 tests passing (all tests in codebase)

**Build Status:** PASS (yarn build completes successfully)

---

### Architectural Alignment

**ADR Compliance:**

1. **ADR-021: Centralized API Client** ✅
   - Uses `callISBAPI` for automatic auth header injection
   - Evidence: `leases-service.ts:12,125`
   - Auth redirection handled automatically by api-client

2. **ADR-032: User-Friendly Error Messages** ✅
   - All error codes mapped to user-friendly messages
   - Examples:
     - 409 No Accounts: "No sandbox accounts are currently available. Please try again later."
     - 409 Max Leases: "You've reached the maximum number of active sessions. Please end an existing session before starting a new one."
     - 500/503: "The sandbox service is temporarily unavailable. Please try again later."
     - Timeout: "Request timed out. Please check your connection and try again."
   - Evidence: `leases-service.ts:151-164,229-232,250-254,268-272`

3. **Tech Spec Epic 6 Compliance** ✅
   - Implements LeaseRequest interface with correct fields (`leaseTemplateUuid`, `comments`)
   - Returns LeaseCreationResult with typed error codes
   - Request timeout matches spec (10 seconds)
   - Evidence: `leases-service.ts:18-53,75`

**Architecture Violations:** NONE

---

### Code Quality Review

**Strengths:**

1. **Excellent Error Handling:** Comprehensive coverage of all HTTP status codes with specific handling for Innovation Sandbox API error messages
2. **Type Safety:** Full TypeScript interfaces for request/response/result types
3. **Separation of Concerns:** Clean separation between service layer (leases-service) and UI layer (try-button)
4. **Defensive Programming:**
   - Request timeout protection
   - JSON parse error handling
   - Graceful handling of malformed error responses
   - Fallback error messages for unexpected status codes
5. **Documentation:** Excellent JSDoc comments explaining function behavior and usage
6. **Testing:** Comprehensive test coverage with edge cases

**Code Patterns:**

- Proper use of async/await
- AbortController for timeout management
- Switch statements for clear error code handling
- Consistent error logging with prefixes
- No magic numbers (constants defined)

**Security:**

- No credentials in code
- Auth handled by centralized api-client
- No sensitive data logged (only error messages)
- Request timeout prevents hanging requests

**Performance:**

- Request timeout (10s) prevents indefinite waits
- Efficient error handling (single JSON parse per error response)
- No memory leaks (timeout cleared in all paths)

---

### Security Notes

**Security Review:** PASS

1. **Authentication:** Handled by callISBAPI (ADR-021) - automatic JWT injection from sessionStorage
2. **Authorization:** API validates user permissions server-side (ADR-014 compliance)
3. **Input Validation:** leaseTemplateId is a UUID - validated server-side
4. **Error Information Disclosure:** Error messages are user-friendly, don't expose internal details
5. **Request Timeout:** Prevents resource exhaustion from hanging requests
6. **No XSS Risk:** No HTML generation in this module

**No security issues found.**

---

### Best Practices and References

**Innovation Sandbox API Integration:**

- API Documentation: [Innovation Sandbox on AWS - GitHub](https://github.com/aws-solutions/innovation-sandbox-on-aws/blob/main/source/lambdas/api/leases/src/leases-handler.ts)
- JSend Error Format: Correctly parsed for error messages
- Error codes properly mapped to user actions

**JavaScript/TypeScript Best Practices:**

- Modern async/await syntax
- Proper TypeScript typing (no `any` types)
- AbortController for timeout management (modern fetch API)
- Defensive programming with optional chaining and nullish coalescing

**Testing Best Practices:**

- Jest mocking best practices followed
- Test isolation (beforeEach cleanup)
- Descriptive test names following "should" convention
- Tests document expected behavior

---

### Action Items

**Code Changes Required:**
NONE - All acceptance criteria met, all tests passing, no issues found.

**Advisory Notes:**

- Note: Consider adding telemetry/analytics for lease request success/failure rates (future enhancement, not blocking)
- Note: 404 "User not found in Identity Center" error could indicate misconfiguration - monitor in production logs
- Note: Error messages are stored in codebase - consider externalizing to configuration if translations needed (Growth feature)

---

## Change Log

- 2025-11-25: Senior Developer Review appended - Story APPROVED, ready for production
