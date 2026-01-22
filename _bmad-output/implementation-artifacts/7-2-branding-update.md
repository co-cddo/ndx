# Story 7-2: Branding Update

## Story

**As a** government user,
**I want** consistent "NDX:Try sessions" terminology,
**So that** I have a clear understanding of the product offering.

## Status

**Status:** done
**Epic:** 7 - Product Discovery & Branding
**Created:** 2026-01-22
**Implemented:** 2026-01-22

## Context

This story implements FR13 and FR14 from the NDX:Try Enhancements PRD. The current codebase uses "Innovation Sandbox" terminology in user-visible strings. This story replaces those occurrences with "NDX:Try" branding.

Per the PRD decision, internal code names (variable names, comments, API references) may remain unchanged. Only public-facing text visible to users needs to be updated.

Based on the codebase audit, the following files contain user-visible "Innovation Sandbox" text:
- `src/try/ui/try-page.ts` (4 occurrences)
- `src/try/index.md` (1 occurrence)
- `src/try/api/configurations-service.ts` (2 occurrences in fallback AUP)

The following files contain internal references that should NOT be changed:
- Code comments (internal documentation)
- API client comments (referring to the actual ISB API)
- Test files (asserting current behavior)

## Acceptance Criteria

### AC-1: /try page uses NDX:Try branding
**Given** I view the /try page
**When** I read the introductory text
**Then** I see "NDX:Try" terminology instead of "Innovation Sandbox" (FR13)

### AC-2: Sign-in prompt uses NDX:Try branding
**Given** I view the sign-in prompt on /try
**When** I read the text
**Then** I see "NDX:Try" account reference instead of "Innovation Sandbox" (FR13)

### AC-3: No Innovation Sandbox in user-visible text
**Given** I search all user-visible text in `src/try/`
**When** the search completes
**Then** no "Innovation Sandbox" appears in user-facing strings (FR14)
**And** internal code comments may retain "Innovation Sandbox" references

### AC-4: Fallback AUP uses NDX:Try branding
**Given** the ISB API fails and fallback AUP is shown
**When** I read the fallback AUP text
**Then** I see "NDX:Try" terminology

### AC-5: Tests updated to reflect new branding
**Given** the branding changes are implemented
**When** I run tests
**Then** all tests pass with updated assertions

## Tasks

### Task 1: Update try-page.ts user-visible text
- [x] Change "Innovation Sandbox programme" to "NDX:Try programme" (line 192, 316)
- [x] Change "Innovation Sandbox account" to "NDX:Try account" (line 236)
- [x] Change "With Innovation Sandbox" to "With NDX:Try" (line 339)

### Task 2: Update src/try/index.md
- [x] Change "Innovation Sandbox account" to "NDX:Try account" (line 14)

### Task 3: Update configurations-service.ts fallback AUP
- [x] Change "AWS Innovation Sandbox" to "NDX:Try" in fallback AUP text (line 77)
- [x] Change "Innovation Sandbox team" to "NDX:Try team" (line 89)

### Task 4: Update tests to reflect new branding
- [x] Update try-page.test.ts assertions (line 134, 303)
- [x] Update configurations-service.test.ts assertions (line 575)

### Task 5: Rebuild try.bundle.js
- [x] Run build to regenerate bundle with new strings
- [x] Verify bundle contains updated branding

### Task 6: Verify no user-visible "Innovation Sandbox" remains
- [x] Grep src/try for "Innovation Sandbox" in non-comment contexts
- [x] Confirm all hits are in internal code (comments, API docs)

## Technical Notes

### Files to Modify

1. `src/try/ui/try-page.ts` - Main /try page component
2. `src/try/index.md` - Static markdown template
3. `src/try/api/configurations-service.ts` - Fallback AUP text
4. `src/try/ui/try-page.test.ts` - Test assertions
5. `src/try/api/configurations-service.test.ts` - Test assertions

### Text Replacements

| File | Current Text | New Text |
|------|-------------|----------|
| try-page.ts:192 | "Innovation Sandbox programme" | "NDX:Try programme" |
| try-page.ts:236 | "Innovation Sandbox account" | "NDX:Try account" |
| try-page.ts:316 | "Innovation Sandbox programme" | "NDX:Try programme" |
| try-page.ts:339 | "With Innovation Sandbox" | "With NDX:Try" |
| index.md:14 | "Innovation Sandbox account" | "NDX:Try account" |
| configurations-service.ts:77 | "AWS Innovation Sandbox" | "NDX:Try" |
| configurations-service.ts:89 | "Innovation Sandbox team" | "NDX:Try team" |

### What NOT to Change

- Code comments explaining ISB API integration
- Variable/function names
- API endpoint references
- Test descriptions (only change assertions)

## Definition of Done

- [x] All acceptance criteria met
- [x] All tasks completed
- [x] Unit tests passing (769 tests)
- [x] Build succeeds (try.bundle.js: 184.9kb)
- [x] No "Innovation Sandbox" in user-visible strings
- [x] Code review passed

## Dependencies

- Story 7-1 (Catalogue Links) - completed
- No infrastructure changes required

## Out of Scope

- Changing internal code names (per PRD decision)
- Updating ISB API comments (external API, different product)
- Email templates (controlled by GOV.UK Notify)
- ISB-generated comments in lease data (external system)

## Code Review Record

**Review Date:** 2026-01-22
**Reviewer:** Code Review Expert (Adversarial)
**Result:** PASSED

### Issues Found

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | LOW | No dedicated test for "NDX:Try programme" text | Accepted - existing test covers "NDX:Try" substring |
| 2 | LOW | Fallback AUP uses abbreviated "NDX:Try" instead of full product name | Accepted - consistent with product branding, fallback only used when API fails |

### Verification Summary

- All 7 text replacements verified in source files
- try.bundle.js regenerated with updated branding
- Zero "Innovation Sandbox" occurrences in user-visible strings
- All 769 tests passing
- Internal comments appropriately retained (per PRD decision)

### Reviewer Notes

Simple, clean implementation of string replacements. The separation between user-visible text (changed) and internal documentation (retained) follows the PRD decision correctly. No security, performance, or architectural concerns.
