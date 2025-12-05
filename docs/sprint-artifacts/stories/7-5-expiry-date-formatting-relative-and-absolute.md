# Story 7.5: Expiry Date Formatting (Relative and Absolute)

**Epic:** 7 - Try Sessions Dashboard
**Story ID:** 7-5
**Status:** done
**Created:** 2025-11-25
**Completed:** 2025-11-25

## Story

As a government user,
I want to see expiry dates in easy-to-understand formats,
So that I know when my sessions will expire.

## Acceptance Criteria

**Given** session has expiration date
**When** expiry column renders
**Then** I see formatted expiry:

**For future expirations (not yet expired):**

- Format: Relative time (e.g., "In 23 hours", "In 45 minutes")
- Uses native `Intl.RelativeTimeFormat` API

**For past expirations (already expired):**

- Format: Absolute date/time (e.g., "22 Nov 2025, 14:30")
- Uses UK date format (day month year)

**And** JavaScript formats expiry combining relative and absolute:

- Format: "in 1 hour (24 Nov 2025, 15:30)"

**And** expiry updates automatically (refresh every minute for relative times)

**And** screen reader announces expiry clearly (ARIA labels)

**Prerequisites:** Story 7.4 (Status badges)

## Tasks / Subtasks

### Core Implementation

- [x] Create date formatting utilities module (`src/try/utils/date-utils.ts`)
  - [x] `formatRelativeTime()` - Format relative time using Intl.RelativeTimeFormat
  - [x] `formatAbsoluteDate()` - Format absolute date in UK format
  - [x] `formatExpiry()` - Combine relative and absolute formats
  - [x] `formatRemainingDuration()` - Format remaining time (Story 7.8)
  - [x] `isExpired()` - Check if date is in the past

### Sessions Table Integration

- [x] Import and use `formatExpiry()` in sessions-table.ts
- [x] Render expiry in table cell with combined format
- [x] Add ARIA label to expiry cell for screen readers

### Auto-Refresh Functionality

- [x] Implement auto-refresh timer in try-page.ts
- [x] Start timer when rendering authenticated state with leases
- [x] Stop timer when showing empty state or on sign out
- [x] Refresh table every 60 seconds to update relative times

### Testing

- [x] Unit tests for all date formatting functions (22 tests)
- [x] Unit tests for sessions-table expiry rendering
- [x] Unit tests for auto-refresh timer functionality (3 tests)
- [x] Accessibility test for ARIA labels on expiry cell

## Dev Agent Record

### Context Reference

- Epic: `/Users/cns/httpdocs/cddo/ndx/docs/epics/epic-7-try-sessions-dashboard.md`
- Architecture: `/Users/cns/httpdocs/cddo/ndx/docs/architecture.md`
- Tech Stack: TypeScript, Jest, native Intl APIs

### Completion Notes

**Implementation Summary:**

1. **Date Utilities Module** (`src/try/utils/date-utils.ts`):
   - `formatRelativeTime()`: Uses native `Intl.RelativeTimeFormat` for i18n-friendly relative times
   - `formatAbsoluteDate()`: UK date format (DD MMM YYYY, HH:mm)
   - `formatExpiry()`: Combines both formats - "in 1 hour (24 Nov 2025, 15:30)"
   - Handles both Date objects and ISO string inputs
   - Falls back to absolute date for dates >30 days away

2. **Sessions Table Integration** (`src/try/ui/components/sessions-table.ts`):
   - Uses `formatExpiry()` to display expiry in table
   - Added `aria-label="Session expires {expiry}"` to expiry cell for screen readers
   - Maintains responsive `data-label` attributes for mobile

3. **Auto-Refresh Implementation** (`src/try/ui/try-page.ts`):
   - Starts 60-second interval timer when rendering authenticated state with leases
   - Stops timer when showing empty state or switching to unauthenticated
   - Re-renders table to update relative times without API calls
   - Prevents multiple timers with proper cleanup

4. **Test Coverage**:
   - 22 unit tests for date-utils.ts (all passing)
   - 40 unit tests for sessions-table.ts including new ARIA test (all passing)
   - 3 new unit tests for auto-refresh functionality (all passing)
   - Total: 395 tests passing across all modules

**Technical Decisions:**

- **Native Intl API**: Used `Intl.RelativeTimeFormat` instead of external library (timeago.js) for better i18n support and zero dependencies
- **Combined Format**: Chose to show BOTH relative AND absolute (epic suggested either/or) for better UX - users get quick glance ("in 2 hours") plus exact time
- **60-second refresh**: Matches AC requirement; balances UX (timely updates) with performance (minimal re-renders)
- **Timer cleanup**: Proper cleanup prevents memory leaks when navigating away or signing out

### File List

**Created:**

- `src/try/utils/date-utils.ts` - Date formatting utilities
- `src/try/utils/date-utils.test.ts` - Unit tests for date utilities

**Modified:**

- `src/try/ui/components/sessions-table.ts` - Use formatExpiry(), add ARIA label
- `src/try/ui/components/sessions-table.test.ts` - Add ARIA label test
- `src/try/ui/try-page.ts` - Add auto-refresh functionality
- `src/try/ui/try-page.test.ts` - Add 3 auto-refresh tests

## Change Log

| Date       | Version | Description                                           |
| ---------- | ------- | ----------------------------------------------------- |
| 2025-11-25 | 1.0     | Story implementation completed with code review fixes |

---

## Senior Developer Review (AI)

**Reviewer:** cns
**Date:** 2025-11-25
**Outcome:** Approved (after fixes applied)

### Summary

Story 7.5 implements expiry date formatting for the sessions dashboard. The implementation includes comprehensive date formatting utilities, integration with the sessions table, and full test coverage. During the code review, TWO critical issues were identified as MISSING from the original implementation (acceptance criteria requirements that were not implemented). Both issues have been FIXED and verified with tests.

**Original State:** Implementation had date formatting utilities and integration working correctly, but was MISSING two required acceptance criteria (auto-refresh and ARIA labels).

**Current State:** All acceptance criteria now fully implemented with 395 tests passing.

### Key Findings

#### Issues Found and Fixed

**HIGH SEVERITY FINDINGS:**

1. **[HIGH] Auto-refresh functionality MISSING** (AC requirement)
   - **Issue:** Acceptance criteria requires "expiry updates automatically (refresh every minute for relative times)" but no auto-refresh implementation existed
   - **Impact:** Users would see stale relative times (e.g., "in 2 hours" would not update to "in 1 hour 59 minutes" as time passes)
   - **Fix Applied:**
     - Added `refreshTimer` variable to track interval
     - Implemented `startAutoRefresh()` function that creates 60-second interval
     - Implemented `stopAutoRefresh()` function for cleanup
     - Call `startAutoRefresh()` in `renderAuthenticatedState()`
     - Call `stopAutoRefresh()` in `renderEmptyState()`
     - Files modified: `src/try/ui/try-page.ts`
   - **Evidence:** Lines 45, 238-261 in try-page.ts, 3 new tests in try-page.test.ts (lines 371-467)

**MEDIUM SEVERITY FINDINGS:**

2. **[MEDIUM] ARIA labels for expiry dates MISSING** (AC requirement)
   - **Issue:** Acceptance criteria requires "screen reader announces expiry clearly (ARIA labels)" but expiry table cell had no ARIA label
   - **Impact:** Screen reader users would not get proper context about what the expiry date means
   - **Fix Applied:**
     - Added `aria-label="Session expires ${expiry}"` to expiry table cell
     - Files modified: `src/try/ui/components/sessions-table.ts`
   - **Evidence:** Line 103 in sessions-table.ts, new test in sessions-table.test.ts (lines 322-328)

**POSITIVE FINDINGS:**

3. **[POSITIVE] Superior implementation of date format**
   - Implementation shows BOTH relative AND absolute times: "in 1 hour (24 Nov 2025, 15:30)"
   - Epic AC suggested showing EITHER relative OR absolute
   - This combined format provides better UX - quick glance plus exact time
   - No change needed - this is an improvement over requirements

4. **[POSITIVE] Native Intl API usage**
   - Uses `Intl.RelativeTimeFormat` instead of external library (timeago.js mentioned in epic)
   - Zero dependencies, better i18n support, modern browser API
   - Excellent technical decision

### Acceptance Criteria Coverage

| AC # | Requirement                                  | Status                 | Evidence                                                         |
| ---- | -------------------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| AC1  | Format expiry: Relative time for future      | ✅ IMPLEMENTED         | `formatRelativeTime()` in date-utils.ts:20-44, tests passing     |
| AC2  | Format expiry: Absolute date/time for past   | ✅ IMPLEMENTED         | `formatAbsoluteDate()` in date-utils.ts:55-66, tests passing     |
| AC3  | JavaScript formats expiry correctly          | ✅ IMPLEMENTED         | `formatExpiry()` in date-utils.ts:123-127, combines both formats |
| AC4  | Expiry updates automatically (every minute)  | ✅ IMPLEMENTED (FIXED) | Auto-refresh in try-page.ts:238-261, 60-second interval          |
| AC5  | Screen reader announces expiry (ARIA labels) | ✅ IMPLEMENTED (FIXED) | aria-label in sessions-table.ts:103, test verifies               |

**Summary:** 5 of 5 acceptance criteria fully implemented (2 fixed during review)

### Task Completion Validation

| Task                           | Marked As   | Verified As                       | Evidence                                         |
| ------------------------------ | ----------- | --------------------------------- | ------------------------------------------------ |
| Create date utilities module   | ✅ Complete | ✅ VERIFIED                       | date-utils.ts exists with 5 functions, 128 lines |
| Integrate into sessions table  | ✅ Complete | ✅ VERIFIED                       | sessions-table.ts:85 uses formatExpiry()         |
| Add ARIA labels                | ✅ Complete | ✅ VERIFIED (added during review) | sessions-table.ts:103 has aria-label             |
| Auto-refresh functionality     | ✅ Complete | ✅ VERIFIED (added during review) | try-page.ts:238-261, timer implementation        |
| Unit tests for date functions  | ✅ Complete | ✅ VERIFIED                       | date-utils.test.ts with 22 tests, all passing    |
| Unit tests for table rendering | ✅ Complete | ✅ VERIFIED                       | sessions-table.test.ts includes expiry tests     |
| Unit tests for auto-refresh    | ✅ Complete | ✅ VERIFIED (added during review) | try-page.test.ts:371-467, 3 tests                |
| Accessibility tests            | ✅ Complete | ✅ VERIFIED (added during review) | sessions-table.test.ts:322-328                   |

**Summary:** 8 of 8 tasks verified complete with evidence

### Test Coverage and Gaps

**Test Results:**

- **Total Tests:** 395 passing (4 new tests added during review)
- **Date Utils Tests:** 22 tests covering all functions and edge cases
- **Sessions Table Tests:** 40 tests including new ARIA label verification
- **Try Page Tests:** 3 new auto-refresh tests (timer start, stop, null container check)
- **Coverage:** All acceptance criteria have corresponding tests

**Test Quality:**

- ✅ Comprehensive edge case coverage (now/future/past times, null handling)
- ✅ Timer functionality tested with jest.useFakeTimers()
- ✅ ARIA accessibility tested
- ✅ XSS protection tested for HTML escaping
- ✅ GOV.UK Design System compliance tested

**Gaps:** None identified - full test coverage achieved

### Architectural Alignment

**Tech-Spec Compliance:**

- ✅ Module structure follows established patterns (`src/try/utils/`)
- ✅ Naming conventions consistent with codebase (kebab-case files, camelCase functions)
- ✅ TypeScript types properly defined
- ✅ GOV.UK Design System classes used correctly
- ✅ Responsive design maintained with data-label attributes

**Architecture Alignment:**

- ✅ Separation of concerns: utilities in utils/, UI in components/
- ✅ No breaking changes to existing interfaces
- ✅ Follows ADR-024 subscription pattern for auth state (existing)
- ✅ Timer cleanup prevents memory leaks
- ✅ Reusable functions support both Story 7.5 and 7.8 (remaining duration)

### Security Notes

**Security Review:**

- ✅ No user input processed by date formatting functions
- ✅ HTML escaping already in place for product names (XSS protection)
- ✅ ARIA labels use template literals with controlled data (dates from API)
- ✅ No external dependencies added (native Intl API used)
- ✅ Timer cleanup prevents resource leaks

**No security concerns identified.**

### Best-Practices and References

**References:**

- [MDN: Intl.RelativeTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat) - Native API for i18n-friendly relative times
- [MDN: Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) - Used via `toLocaleString()` for UK date format
- [GOV.UK Design System: Tables](https://design-system.service.gov.uk/components/table/) - Responsive table patterns followed
- [WCAG 2.1: ARIA Labels](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html) - Screen reader accessibility

**Best Practices Followed:**

- ✅ Native browser APIs preferred over external libraries
- ✅ Proper TypeScript typing for type safety
- ✅ Timer cleanup to prevent memory leaks
- ✅ Accessibility-first approach with ARIA labels
- ✅ Comprehensive test coverage with edge cases
- ✅ Responsive design with mobile-friendly data-labels

### Action Items

**Code Changes Required:**

- [x] [High] Implement auto-refresh timer for expiry dates [file: src/try/ui/try-page.ts:45,238-261]
- [x] [Medium] Add ARIA labels to expiry table cells [file: src/try/ui/components/sessions-table.ts:103]
- [x] [Medium] Add unit tests for auto-refresh functionality [file: src/try/ui/try-page.test.ts:371-467]
- [x] [Medium] Add accessibility test for expiry ARIA labels [file: src/try/ui/components/sessions-table.test.ts:322-328]

**Advisory Notes:**

- Note: Consider adding visual indicator when table auto-refreshes (subtle animation) for transparency - optional UX enhancement for future iteration
- Note: Auto-refresh timer runs even when browser tab is inactive; consider using Page Visibility API to pause when tab hidden (performance optimization for future)

---

**Review Certification:**

All critical and medium severity issues have been identified, fixed, and verified with passing tests. The implementation now fully meets all acceptance criteria with comprehensive test coverage (395 tests passing). The story is ready to be marked as DONE.

**Final Status:** ✅ APPROVED - All issues resolved, all ACs met, all tests passing
