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
- `tests/e2e/accessibility/catalogue-try-accessibility.spec.ts` - New (361 lines)
- `src/_includes/catalogue-collection.njk` - Modified (removed empty links)

---

## Senior Developer Review (AI)

### Reviewer
cns

### Date
2025-11-25

### Outcome
**Changes Requested** - Critical WCAG violations found during test execution. Issues have been fixed and verified.

### Summary
Comprehensive review of Story 6.11 accessibility test implementation revealed excellent test coverage across all acceptance criteria. All 19 test cases are well-structured and cover keyboard navigation, ARIA attributes, focus management, and automated WCAG 2.2 AA scanning using axe-core/playwright.

**CRITICAL FINDING**: Initial test execution revealed 2 failing tests due to serious WCAG AA violations (link-name) in the catalogue navigation. Empty links with no discernible text (`<a href="">&nbsp;</a>`) were present on catalogue pages, creating keyboard traps and screen reader issues. These violations were in the catalogue-collection template, not the test file itself.

**RESOLUTION**: Fixed accessibility violations by removing empty link spacers from `src/_includes/catalogue-collection.njk`. All 19 tests now pass successfully.

### Key Findings

#### HIGH Severity
- **[FIXED]** Empty links in catalogue navigation causing WCAG 2.2 AA violations
  - **Impact**: Serious accessibility issue - links without discernible text (wcag2a, wcag244, wcag412)
  - **Location**: `src/_includes/catalogue-collection.njk` lines 15, 22 (spacer links with `text: "&nbsp;"` and no href)
  - **Fix Applied**: Removed empty spacer links from related navigation template
  - **Evidence**: Tests failed initially at lines 310, 358; now passing after fix

#### MEDIUM Severity
None found

#### LOW Severity
None found

### Acceptance Criteria Coverage

All 7 acceptance criteria are fully implemented with comprehensive test coverage:

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | Try Button Keyboard Accessible | ✅ IMPLEMENTED | tests/e2e/accessibility/catalogue-try-accessibility.spec.ts:28-80 (3 tests: Tab focus, Enter activation, Space activation) |
| AC2 | Modal ARIA Attributes | ✅ IMPLEMENTED | tests/e2e/accessibility/catalogue-try-accessibility.spec.ts:95-136 (4 tests: role="dialog", aria-modal="true", aria-labelledby, aria-describedby) |
| AC3 | Focus Trap Works | ✅ IMPLEMENTED | tests/e2e/accessibility/catalogue-try-accessibility.spec.ts:139-188 (3 tests: focus moves to modal, Tab cycles forward, Shift+Tab cycles backward) |
| AC4 | Escape Key Closes Modal | ✅ IMPLEMENTED | tests/e2e/accessibility/catalogue-try-accessibility.spec.ts:191-199 (1 test: Escape closes modal) |
| AC5 | Checkbox Label Associated | ✅ IMPLEMENTED | tests/e2e/accessibility/catalogue-try-accessibility.spec.ts:202-237 (2 tests: label[for] association, label click toggles checkbox) |
| AC6 | Disabled Button State Announced | ✅ IMPLEMENTED | tests/e2e/accessibility/catalogue-try-accessibility.spec.ts:240-269 (2 tests: aria-disabled when disabled, aria-disabled updates when enabled) |
| AC7 | Tests Run in CI Pipeline | ✅ IMPLEMENTED | .github/workflows/test.yml:45 (yarn test:e2e:accessibility runs tests/e2e/accessibility directory) |

**Summary**: 7 of 7 acceptance criteria fully implemented with 19 comprehensive test cases

### Task Completion Validation

All tasks marked as completed were systematically verified:

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Created test file | ✅ Complete | ✅ VERIFIED | tests/e2e/accessibility/catalogue-try-accessibility.spec.ts exists, 361 lines |
| Implemented 19 test cases | ✅ Complete | ✅ VERIFIED | File contains exactly 19 test cases across 4 describe blocks |
| Try button keyboard tests | ✅ Complete | ✅ VERIFIED | Lines 28-80: Tab, Enter, Space key tests implemented |
| Modal ARIA attributes | ✅ Complete | ✅ VERIFIED | Lines 95-136: role, aria-modal, aria-labelledby, aria-describedby tests |
| Focus trap tests | ✅ Complete | ✅ VERIFIED | Lines 139-188: Focus moves to modal, Tab/Shift+Tab cycling tests |
| Escape key test | ✅ Complete | ✅ VERIFIED | Lines 191-199: Escape closes modal test |
| Checkbox-label association | ✅ Complete | ✅ VERIFIED | Lines 202-237: for attribute and click toggle tests |
| Disabled button aria-disabled | ✅ Complete | ✅ VERIFIED | Lines 240-269: aria-disabled state tests |
| axe-core WCAG scanning | ✅ Complete | ✅ VERIFIED | Lines 273-360: 4 axe-core scans (product page, filter page, modal, catalogue) |

**Summary**: 8 of 8 completed tasks verified with file evidence. No false completions found.

### Test Coverage and Gaps

**Excellent Coverage**:
- All 7 ACs have corresponding automated tests
- 19 test cases provide comprehensive coverage
- Tests use both unit-style assertions (Playwright locators) and automated scanning (axe-core)
- Tests include authentication state setup for modal testing
- Tests cover both positive cases and edge cases (Tab cycling 15 times to verify trap)

**Test Quality**:
- Clear test descriptions matching AC numbering scheme
- Proper use of beforeEach for setup
- Appropriate waits and timeouts
- Console logging for debugging violations
- Good use of data attributes for stable selectors (`[data-try-id]`)

**No gaps identified** - All acceptance criteria have automated test coverage

### Architectural Alignment

**Tech-Spec Compliance**: ✅
- Tests align with Epic 6 Tech Spec requirements
- Tests validate ADR-026 (Accessible Modal Pattern) implementation
- Tests confirm WCAG 2.2 AA compliance requirement
- Tests use axe-core tags: `["wcag2a", "wcag2aa", "wcag22aa"]`

**Architecture Violations**: None
- Tests are properly organized in `tests/e2e/accessibility` directory
- Tests follow existing Playwright test patterns
- Tests use existing authentication mechanism (sessionStorage token)

### Security Notes

No security concerns identified. Tests use:
- Placeholder JWT token for testing (not production credentials)
- Proper authentication flow testing
- No sensitive data exposure

### Best-Practices and References

**Testing Best Practices Followed**:
- ✅ Descriptive test names following BDD pattern
- ✅ Tests grouped by acceptance criteria
- ✅ Tests use Playwright best practices (page.locator, expect assertions)
- ✅ Tests include proper waits (networkidle, visibility)
- ✅ Tests are deterministic and repeatable
- ✅ axe-core scanning uses appropriate WCAG tags

**axe-core Documentation**:
- [axe-core Playwright Integration](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)

**Playwright Accessibility Testing**:
- [Playwright Accessibility Testing Guide](https://playwright.dev/docs/accessibility-testing)

### Action Items

**Code Changes Required:**
- [x] [High] Remove empty link spacers from catalogue navigation template [file: src/_includes/catalogue-collection.njk:15,22] - **COMPLETED**

**Advisory Notes:**
- Note: Consider adding more specific axe-core rules for future tests (e.g., `withRules(['color-contrast', 'heading-order'])`)
- Note: Consider adding viewport/mobile accessibility tests in Epic 8
- Note: Consider adding screen reader announcement verification tests (ARIA live regions)
- Note: Document the test JWT token generation/expiry for future maintenance

---

## Change Log

### 2025-11-25
- Senior Developer Review notes appended
- Fixed WCAG violations in catalogue navigation template
- Status remains "done" - all tests passing
