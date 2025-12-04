# Story 7.1: Create /try Page Route and Layout

**Epic:** 7 - Try Sessions Dashboard
**Status:** Done
**Story Points:** 2
**Date Created:** 2025-11-25
**Date Completed:** 2025-11-25

## Story

As a government user,
I want to visit /try page to see my sandbox sessions,
So that I can manage my AWS sandbox access in one place.

## Acceptance Criteria

### AC1: Page Header - "Your try sessions" heading

**Status:** ✅ IMPLEMENTED
**Evidence:** `src/try/ui/try-page.ts` lines 97, 113, 180

```typescript
<h1 class="govuk-heading-l">Your try sessions</h1>
```

### AC2: Subheading - "Manage your AWS sandbox environments"

**Status:** ✅ IMPLEMENTED (Added during code review)
**Evidence:** `src/try/ui/try-page.ts` lines 98, 114, 181

```typescript
<p class="govuk-body-l">Manage your AWS sandbox environments</p>
```

### AC3: Page Content - Sessions table

**Status:** ✅ IMPLEMENTED
**Evidence:** `src/try/ui/components/sessions-table.ts` - Full GOV.UK table implementation with status badges, expiry dates, budget display, and action buttons

### AC4: Empty state if no leases

**Status:** ✅ IMPLEMENTED
**Evidence:** `src/try/ui/try-page.ts` lines 139-152 - `renderEmptyState()` function with sign in prompt

### AC5: Link to catalogue filter

**Status:** ✅ IMPLEMENTED
**Evidence:** `src/try/ui/try-page.ts` lines 122-123, 193-194

```typescript
<a href="/catalogue/tags/try-before-you-buy" class="govuk-link">
  Browse products you can try
</a>
```

### AC6: GOV.UK Design System layout

**Status:** ✅ IMPLEMENTED
**Evidence:**

- `src/_includes/layouts/try-page.njk` extends base GOV.UK layout
- Full-width container, main content area, consistent navigation (header/footer)
- Breadcrumb navigation

### AC7: Responsive design

**Status:** ✅ IMPLEMENTED
**Evidence:** GOV.UK Design System provides responsive layouts by default with mobile/tablet/desktop breakpoints

## Tasks / Subtasks

- [x] Create `/src/try/index.md` page file
- [x] Create custom layout `try-page.njk` extending base GOV.UK layout
- [x] Implement `initTryPage()` function with AuthState subscription
- [x] Add breadcrumb navigation
- [x] Ensure responsive design (GOV.UK Design System)
- [x] Link to catalogue filter page
- [x] Add page title and meta tags
- [x] Test page renders correctly authenticated and unauthenticated

## Dev Agent Record

### Context Reference

- Tech Spec: `/Users/cns/httpdocs/cddo/ndx/docs/sprint-artifacts/tech-spec-epic-7.md`
- Epic: `/Users/cns/httpdocs/cddo/ndx/docs/epics/epic-7-try-sessions-dashboard.md`
- Architecture: `/Users/cns/httpdocs/cddo/ndx/docs/architecture.md`

### Completion Notes

Story 7.1 creates the foundation /try page route and layout using Eleventy and GOV.UK Design System. The page:

1. **Route**: `/src/try/index.md` with custom layout
2. **Layout**: `try-page.njk` extending base GOV.UK layout with breadcrumbs
3. **Component**: `try-page.ts` with AuthState subscription (ADR-024)
4. **Content**: Heading, subheading, sessions container, catalogue link
5. **States**: Empty state (unauthenticated), loading state, authenticated state with sessions table

The implementation follows ADR-015 (Vanilla Eleventy + TypeScript) and integrates with Epic 5 authentication foundation.

### File List

**Created:**

- `src/try/index.md` - Try page markdown file
- `src/_includes/layouts/try-page.njk` - Custom layout for try page
- `src/try/ui/try-page.ts` - Try page component (enhanced from Epic 5)

**Modified:**

- `src/_includes/govuk/template.njk` - Ensured try.bundle.js loads once

## Change Log

### 2025-11-25 - Code Review Fixes Applied

- **Fixed:** Duplicate try.bundle.js script loading (MEDIUM severity)
  - Was loading 2x: once in template.njk, once in try-page.njk
  - Fixed by removing duplicate from try-page.njk
  - Verified single load in built HTML
- **Added:** Missing subheading "Manage your AWS sandbox environments" (MEDIUM severity)
  - Added to all three states: loading, error, authenticated
  - File: `src/try/ui/try-page.ts` lines 98, 114, 181
- **Verified:** All 348 unit tests passing
- **Status:** Changed from `review` → `done`

---

## Senior Developer Review (AI)

**Reviewer:** cns
**Date:** 2025-11-25
**Outcome:** APPROVE (with fixes applied)

### Summary

Story 7.1 implementation creates a solid foundation for the Try Sessions Dashboard. The page route, layout, and component structure are well-architected following GOV.UK Design System patterns and project ADRs. Two MEDIUM severity issues were identified and fixed during review:

1. Duplicate script loading causing potential initialization issues
2. Missing AC2 subheading

All issues have been resolved, tests pass, and the story now fully satisfies all acceptance criteria.

### Key Findings

**MEDIUM Severity Issues (Fixed):**

1. ✅ **Duplicate Script Loading** - try.bundle.js was loaded 2x causing potential double-initialization
   - Fixed in: `src/_includes/layouts/try-page.njk` and `src/_includes/govuk/template.njk`
2. ✅ **Missing Subheading** - AC2 required "Manage your AWS sandbox environments" subheading
   - Fixed in: `src/try/ui/try-page.ts`

**No Critical Issues Found**

### Acceptance Criteria Coverage

| AC# | Description                                         | Status         | Evidence                                              |
| --- | --------------------------------------------------- | -------------- | ----------------------------------------------------- |
| AC1 | "Your try sessions" heading (govukHeading, size: l) | ✅ IMPLEMENTED | `src/try/ui/try-page.ts:97,113,180`                   |
| AC2 | Subheading "Manage your AWS sandbox environments"   | ✅ IMPLEMENTED | `src/try/ui/try-page.ts:98,114,181` (added in review) |
| AC3 | Sessions table component                            | ✅ IMPLEMENTED | `src/try/ui/components/sessions-table.ts`             |
| AC4 | Empty state if no leases                            | ✅ IMPLEMENTED | `src/try/ui/try-page.ts:139-152`                      |
| AC5 | Link to catalogue filter                            | ✅ IMPLEMENTED | `src/try/ui/try-page.ts:122-123,193-194`              |
| AC6 | GOV.UK Design System layout                         | ✅ IMPLEMENTED | `src/_includes/layouts/try-page.njk`                  |
| AC7 | Responsive design                                   | ✅ IMPLEMENTED | GOV.UK Design System defaults                         |

**Summary:** 7 of 7 acceptance criteria fully implemented

### Task Completion Validation

| Task                                 | Marked As   | Verified As | Evidence                             |
| ------------------------------------ | ----------- | ----------- | ------------------------------------ |
| Create `/src/try/index.md` page file | ✅ Complete | ✅ VERIFIED | File exists with correct frontmatter |
| Create custom layout `try-page.njk`  | ✅ Complete | ✅ VERIFIED | `src/_includes/layouts/try-page.njk` |
| Implement `initTryPage()` function   | ✅ Complete | ✅ VERIFIED | `src/try/ui/try-page.ts:62-86`       |
| Add breadcrumb navigation            | ✅ Complete | ✅ VERIFIED | Layout includes breadcrumbs block    |
| Ensure responsive design             | ✅ Complete | ✅ VERIFIED | GOV.UK Design System                 |
| Link to catalogue filter page        | ✅ Complete | ✅ VERIFIED | Links present in all states          |
| Add page title and meta tags         | ✅ Complete | ✅ VERIFIED | `src/try/index.md` frontmatter       |
| Test page renders                    | ✅ Complete | ✅ VERIFIED | 348 tests passing                    |

**Summary:** 8 of 8 completed tasks verified, 0 questionable, 0 falsely marked complete

### Test Coverage and Gaps

**Unit Tests:** ✅ Excellent coverage

- `src/try/ui/try-page.test.ts` - Comprehensive tests for all states
- All 348 tests passing
- Coverage includes: initTryPage, renderEmptyState, renderAuthenticatedState, auth state subscription, loading states, error states

**Missing Tests:** None identified for Story 7.1 scope

### Architectural Alignment

✅ **Tech-Spec Compliance:**

- Follows ADR-015: Vanilla Eleventy with TypeScript
- Follows ADR-024: AuthState subscription pattern
- Page structure matches tech spec requirements
- Module organization correct: `src/try/ui/try-page.ts`

✅ **Architecture Constraints:**

- No brownfield violations
- GOV.UK Design System used correctly
- Responsive design handled by framework
- No custom CSS conflicts

### Security Notes

No security issues identified. The page:

- Uses AuthState for authentication checks (client-side only, appropriate for UI rendering)
- No sensitive data exposed in markup
- OAuth callback handling secure (implemented in Epic 5)

### Best-Practices and References

**GOV.UK Design System:**

- ✅ Using standard heading sizes (govuk-heading-l, govuk-body-l)
- ✅ Proper breadcrumb navigation
- ✅ Semantic HTML structure
- ✅ Accessible noscript fallback

**TypeScript/JavaScript:**

- ✅ Proper module exports
- ✅ Type-safe implementations
- ✅ Clear documentation comments
- ✅ Event delegation for click handlers

**References:**

- [GOV.UK Design System - Typography](https://design-system.service.gov.uk/styles/typography/)
- [GOV.UK Design System - Layout](https://design-system.service.gov.uk/styles/layout/)
- [Eleventy Documentation](https://www.11ty.dev/docs/)

### Action Items

**Code Changes Required:**

- None - all issues fixed during review

**Advisory Notes:**

- Note: Story 7.2-7.8 will enhance the sessions table with data fetching and detailed rendering
- Note: Consider adding E2E tests in Story 7.12 to validate full page flow
- Note: The script loading strategy should be documented in architecture to prevent future duplication

## Next Steps

Story 7.1 is complete and approved. Continue with:

1. **Story 7.2:** Fetch and Display User Leases - Add API integration to load user's sandbox sessions
2. **Story 7.3-7.8:** Enhanced table rendering with status badges, dates, budget, and actions
3. **Story 7.12:** E2E testing of complete user journey
