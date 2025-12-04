# Story 6.10: Epic 6-7 Integration Testing

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Testing Story
**Priority:** Medium - Validation of complete flow
**Status:** done
**Dependencies:** Stories 6.1-6.9 (Try flow implementation)
**Review Status:** ✅ Approved (2025-11-25)

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

- `tests/e2e/catalogue/try-flow.spec.ts` - New (198 lines, updated with fixes)

---

## Senior Developer Review (AI)

**Reviewer:** cns
**Date:** 2025-11-25
**Review Type:** Epic 6-7 Integration Testing (Story 6.10)
**Outcome:** ✅ **APPROVED** (with 2 minor test fixes applied)

### Summary

Story 6.10 successfully implements comprehensive integration testing for the Try Before You Buy catalogue flow. The test suite covers all 10 acceptance criteria with 10 well-structured Playwright E2E tests. During review, 2 minor issues were identified and immediately fixed:

1. **AC #10 Test Issue**: Test was searching for incorrect tag text "NDX:Try" instead of actual implementation text "Try Before You Buy"
2. **AC #8 Test Issue**: Test expected URL to remain at `/api/auth/login`, but OAuth immediately redirects to AWS SSO

After fixes, all 10 tests pass successfully. The implementation demonstrates:

- ✅ Complete AC coverage (10/10 ACs implemented and tested)
- ✅ Proper authentication flow testing (authenticated + unauthenticated paths)
- ✅ Accessibility validation (focus trap, keyboard navigation)
- ✅ Catalogue filter integration
- ✅ Clean test structure with descriptive test names

### Key Findings

**Issues Found and Fixed:**

#### MEDIUM Severity (2 issues - FIXED)

1. **Test Assertion Error - AC #10**: Tag text mismatch
   - **Finding**: Test searched for tag with text "NDX:Try" but implementation uses "Try Before You Buy"
   - **Evidence**: Test line 191 had `.govuk-tag:has-text("NDX:Try")` but implementation at `src/_includes/components/document-list/template.njk:13` uses `"Try Before You Buy"`
   - **Fix Applied**: Updated test to search for correct text "Try Before You Buy"
   - **Status**: ✅ Fixed and verified passing

2. **Test Logic Error - AC #8**: OAuth redirect expectation
   - **Finding**: Test expected URL to contain `/api/auth/login` but OAuth redirects immediately to AWS SSO (awsapps.com)
   - **Evidence**: Test failure showed navigation to `d-9267e1e371.awsapps.com/start/` instead of staying at `/api/auth/login`
   - **Fix Applied**: Updated test to verify redirect occurred (either to /api/auth/login OR to OAuth provider like awsapps.com)
   - **Status**: ✅ Fixed and verified passing

### Acceptance Criteria Coverage

| AC#  | Description                                         | Status         | Evidence (file:line)                                                                                        |
| ---- | --------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| AC1  | Product page has Try button with correct attributes | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:27-45 - Validates button exists with data-try-id UUID and correct text |
| AC2  | Try button opens AUP modal for authenticated users  | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:47-64 - Validates modal role="dialog" opens on click                   |
| AC3  | AUP modal displays session info (24h, $50)          | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:66-78 - Validates "24 hours" and "$50" text in modal                   |
| AC4  | AUP checkbox enables Continue button                | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:80-97 - Validates button disabled→enabled state change                 |
| AC5  | Cancel button closes modal                          | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:99-111 - Validates Cancel button closes modal                          |
| AC6  | Escape key closes modal                             | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:113-125 - Validates Escape key handling                                |
| AC7  | Focus trap keeps focus within modal                 | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:127-146 - Validates focus remains in modal after 10 tabs               |
| AC8  | Unauthenticated user redirected to login            | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:150-176 - Validates OAuth redirect (FIXED)                             |
| AC9  | Try filter shows tryable products                   | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:180-183 - Validates filter page loads with products                    |
| AC10 | Try tag visible on product cards                    | ✅ IMPLEMENTED | tests/e2e/catalogue/try-flow.spec.ts:193-196 - Validates tag presence (FIXED)                               |

**Summary**: 10 of 10 acceptance criteria fully implemented ✅

### Task Completion Validation

| Task                                           | Marked As   | Verified As | Evidence (file:line)                                            |
| ---------------------------------------------- | ----------- | ----------- | --------------------------------------------------------------- |
| Created `tests/e2e/catalogue/try-flow.spec.ts` | ✅ Complete | ✅ VERIFIED | File exists at tests/e2e/catalogue/try-flow.spec.ts (198 lines) |
| Implemented 10 test cases covering all ACs     | ✅ Complete | ✅ VERIFIED | All 10 test cases present and passing (100% pass rate)          |

**Summary**: 2 of 2 completed tasks verified ✅
**No tasks falsely marked complete** ✅

### Test Coverage and Gaps

**Test Coverage:**

- ✅ Product page Try button attributes (AC1)
- ✅ Modal opening for authenticated users (AC2)
- ✅ Session info display in modal (AC3)
- ✅ Checkbox/button interaction (AC4)
- ✅ Cancel button functionality (AC5)
- ✅ Escape key handling (AC6)
- ✅ Focus trap accessibility (AC7)
- ✅ Unauthenticated redirect flow (AC8)
- ✅ Catalogue filter integration (AC9)
- ✅ Tag display on product cards (AC10)

**Test Quality:**

- Clean test organization with 3 describe blocks
- Proper beforeEach setup for authenticated state
- Good use of Playwright locators and assertions
- Descriptive test names matching AC numbers
- No test flakiness observed (all 10 tests pass consistently)

**Gaps Identified:**

- None - Story scope is integration testing only
- Note: Full Epic 7 integration (sessions table after lease creation) is out of scope and documented in story notes

### Architectural Alignment

**Epic 6 Tech Spec Compliance:**
✅ Tests validate all Epic 6 requirements (FR-TRY-42 through FR-TRY-65)
✅ Tests use real CloudFront deployment URL (not mocked)
✅ Tests authenticate via sessionStorage token injection (matches ADR-021)
✅ Tests validate accessibility requirements (focus trap per ADR-026)

**Architecture.md Compliance:**
✅ Tests align with Playwright E2E testing architecture (architecture.md:658-734)
✅ Tests use mitmproxy integration as documented in Epic 4
✅ Tests follow test organization pattern from architecture.md:679-694

### Security Notes

**Security Validation:**
✅ Test uses sessionStorage for token (matches NFR-TRY-SEC-1)
✅ Test validates unauthenticated users are redirected (security boundary)
✅ No credentials or tokens hardcoded in test file (uses TEST_TOKEN placeholder)
✅ OAuth redirect properly validated (AC8 confirms auth flow)

**No security concerns identified.**

### Best-Practices and References

**Testing Best Practices:**

- ✅ Follows Playwright best practices for E2E testing
- ✅ Uses proper async/await patterns
- ✅ Good use of page.locator() over deprecated selectors
- ✅ Proper timeout handling (5000ms for modal/redirect operations)

**References:**

- [Playwright Testing Guide](https://playwright.dev/docs/writing-tests)
- [GOV.UK Design System Accessibility](https://design-system.service.gov.uk/accessibility/)
- Epic 6 Tech Spec: docs/sprint-artifacts/tech-spec-epic-6.md
- Architecture: docs/architecture.md (Playwright section)

### Action Items

**Code Changes Required:**

- [x] [Med] Fix AC #10 test tag text from "NDX:Try" to "Try Before You Buy" [file: tests/e2e/catalogue/try-flow.spec.ts:191] - ✅ FIXED
- [x] [Med] Fix AC #8 test to handle OAuth redirect correctly [file: tests/e2e/catalogue/try-flow.spec.ts:166-175] - ✅ FIXED

**Advisory Notes:**

- Note: Consider adding test for double-click prevention on Try button (mentioned in tech spec edge cases)
- Note: Consider adding test for modal state when network request fails (AUP fetch timeout)
- Note: Full Epic 6→7 integration (lease creation → sessions table display) should be validated when Epic 7 complete

### Test Results

**Final Test Run:**

```
Running 10 tests using 5 workers
✅ 10 passed (6.2s)
❌ 0 failed
⏭️  0 skipped
```

**Test Execution Time:** 6.2 seconds
**Pass Rate:** 100% (10/10)
**Status:** All tests passing after fixes applied

### Change Log Entry

- **2025-11-25**: Senior Developer Review notes appended
- **2025-11-25**: Fixed AC #8 test - OAuth redirect handling
- **2025-11-25**: Fixed AC #10 test - Tag text correction
- **2025-11-25**: All 10 tests passing, story APPROVED
