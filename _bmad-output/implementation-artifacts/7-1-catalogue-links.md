# Story 7-1: Catalogue Links

## Story

**As a** government user exploring NDX:Try,
**I want** template names to link to their catalogue pages,
**So that** I can learn more about each product before starting a session.

## Status

**Status:** done
**Epic:** 7 - Product Discovery & Branding
**Created:** 2026-01-22
**Implemented:** 2026-01-22

## Context

This story implements FR4, FR5, FR6 from the NDX:Try Enhancements PRD. Currently, template names in the sessions table are displayed as plain text. Users should be able to click on template names to navigate to the corresponding catalogue page to learn more about each product.

The sessions table is rendered by `src/try/ui/components/sessions-table.ts` and displays `leaseTemplateName` from the API response. This story will convert the plain text template name into a clickable link that navigates to the catalogue page.

## Acceptance Criteria

### AC-1: Template names are clickable links
**Given** I view the /try page with available sessions
**When** I see a template name (e.g., "FOI Redaction", "Council Chatbot")
**Then** it is displayed as a clickable link (FR6)

### AC-2: Links navigate to correct catalogue pages
**Given** I click a template name link
**When** the navigation completes
**Then** I arrive at the correct catalogue page (FR4):
| Template Name | Catalogue URL |
|---------------|---------------|
| Council Chatbot | /catalogue/aws/council-chatbot/ |
| NDX:Try for AWS | /catalogue/aws/innovation-sandbox-empty/ |
| FOI Redaction | /catalogue/aws/foi-redaction/ |
| LocalGov Drupal | /catalogue/aws/localgov-drupal/ |
| Planning AI | /catalogue/aws/planning-ai/ |
| QuickSight Dashboard | /catalogue/aws/quicksight-dashboard/ |
| Smart Car Park | /catalogue/aws/smart-car-park/ |
| Text to Speech | /catalogue/aws/text-to-speech/ |

### AC-3: Links open in same tab
**Given** I click a template name link
**When** the browser navigates
**Then** the catalogue page opens in the same browser tab (internal navigation)

### AC-4: Accessible link text
**Given** the links are implemented
**When** I inspect the HTML
**Then** link text is the template name itself (descriptive, not "click here") (NFR2)
**And** links have appropriate focus styles (visible outline)

### AC-5: WCAG 2.1 AA compliance
**Given** the catalogue links are rendered
**When** I run accessibility checks
**Then** links meet WCAG 2.1 AA requirements (NFR3):
- 4.5:1 contrast ratio for link text
- Underline or other visual indicator distinguishing links from plain text
- Focus indicator visible on keyboard navigation

### AC-6: Graceful fallback for unknown templates
**Given** a template name doesn't have a known catalogue mapping
**When** the sessions table renders
**Then** the template name is displayed as plain text (not a broken link)
**And** no JavaScript errors occur

### AC-7: Link styling matches GOV.UK Design System
**Given** the template name links are rendered
**When** I inspect the styling
**Then** links use GOV.UK link classes (govuk-link)
**And** links are underlined per GOV.UK guidance

## Tasks

### Task 1: Create catalogue slug mapping
- [x] Create mapping object from template names to catalogue slugs in `sessions-table.ts`
- [x] Include all 8 known templates with their URL paths
- [x] Export mapping for testing purposes

### Task 2: Update renderSessionRow to use links
- [x] Modify the Product cell to render link when mapping exists
- [x] Render plain text when no mapping exists (fallback)
- [x] Use GOV.UK link classes (`govuk-link`)
- [x] Ensure proper HTML escaping for template names

### Task 3: Add helper function for catalogue URL
- [x] Create `getCatalogueUrl(templateName: string): string | null` function
- [x] Return null if template not in mapping (enables fallback behavior)
- [x] Document function with JSDoc

### Task 4: Write unit tests
- [x] Test mapping returns correct URL for each known template
- [x] Test mapping returns null for unknown template
- [x] Test renderSessionRow renders link when mapping exists
- [x] Test renderSessionRow renders plain text when no mapping
- [x] Test link has correct href attribute
- [x] Test link has govuk-link class
- [x] Test link text is template name (descriptive)

### Task 5: Update existing tests
- [x] Update snapshot tests if any
- [x] Ensure existing sessions-table tests pass with new link structure

### Task 6: Verify accessibility
- [x] Uses govuk-link class which has built-in WCAG 2.1 AA compliance
- [x] Keyboard navigation works (standard anchor element)
- [x] Focus styles from GOV.UK Design System
- [x] Color contrast handled by govuk-link class

## Technical Notes

### Template Name to Slug Mapping

The API returns `originalLeaseTemplateName` which becomes `leaseTemplateName` in the UI. Based on catalogue page titles:

```typescript
const CATALOGUE_SLUGS: Record<string, string> = {
  "Council Chatbot": "council-chatbot",
  "NDX:Try for AWS": "innovation-sandbox-empty",
  "FOI Redaction": "foi-redaction",
  "LocalGov Drupal": "localgov-drupal",
  "Planning AI": "planning-ai",
  "QuickSight Dashboard": "quicksight-dashboard",
  "Smart Car Park": "smart-car-park",
  "Text to Speech": "text-to-speech",
}
```

### URL Construction

All catalogue pages are under `/catalogue/aws/`:
```typescript
function getCatalogueUrl(templateName: string): string | null {
  const slug = CATALOGUE_SLUGS[templateName]
  return slug ? `/catalogue/aws/${slug}/` : null
}
```

### HTML Structure Change

Current (line 107):
```html
<td class="govuk-table__cell" data-label="Product">
  <strong>${escapeHtml(lease.leaseTemplateName)}</strong>
</td>
```

New:
```html
<td class="govuk-table__cell" data-label="Product">
  <a href="/catalogue/aws/foi-redaction/" class="govuk-link">
    <strong>${escapeHtml(lease.leaseTemplateName)}</strong>
  </a>
</td>
```

Or fallback (no mapping):
```html
<td class="govuk-table__cell" data-label="Product">
  <strong>${escapeHtml(lease.leaseTemplateName)}</strong>
</td>
```

### Files to Modify

1. `src/try/ui/components/sessions-table.ts` - Add mapping and update rendering
2. `src/try/ui/components/sessions-table.test.ts` - Add tests for new functionality

### Testing Approach

- Unit tests verify mapping correctness and HTML output
- No E2E tests needed (static HTML change, no dynamic behavior)
- Manual verification recommended on staging

## Definition of Done

- [x] All acceptance criteria met
- [x] All tasks completed
- [x] Unit tests passing (79 tests, 21 new for catalogue links)
- [x] Build succeeds (try.bundle.js: 185.0kb)
- [x] No accessibility violations (uses GOV.UK link classes)
- [x] Code review passed

## Dependencies

- Catalogue pages must exist at the mapped URLs (verified: all 8 exist)
- No Epic 6 dependencies (Epic 6 was backend, this is frontend)

## Out of Scope

- Creating new catalogue pages (pages already exist)
- Updating catalogue page content

## Code Review Record

**Review Date:** 2026-01-22
**Reviewer:** Code Review Expert (Adversarial)
**Result:** PASSED (after fixes)

### Issues Found and Fixed

| # | Severity | Issue | Fix Applied |
|---|----------|-------|-------------|
| 1 | MEDIUM | Missing data-action attribute for analytics tracking | Added `data-action="view-catalogue"` to catalogue links for consistency with other action buttons |
| 2 | MEDIUM | No test for whitespace-only template names | Added test verifying `"   "` returns null |
| 3 | MEDIUM | No test for case-sensitivity of template name lookup | Added test verifying exact case matching (API returns exact names) |
| 4 | LOW | Test regex needed update for new HTML structure | Updated regex to match data-action attribute |

### Post-Fix Verification

- All 79 tests passing
- Build succeeds
- Analytics tracking added for catalogue link clicks (moved from "Out of Scope")

### Reviewer Notes

The implementation is clean and follows GOV.UK Design System patterns. The `data-action` attribute addition provides analytics consistency with existing action buttons (launch-console, get-credentials, launch-cloudformation). Case-sensitivity is correct because template names come from the API with exact casing.
