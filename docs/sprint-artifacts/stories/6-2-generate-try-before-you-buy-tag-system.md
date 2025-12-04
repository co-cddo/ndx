# Story 6.2: Generate "Try Before You Buy" Tag System

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - Visual indicator for tryable products
**Status:** done
**Dependencies:** Story 6.1 complete (try metadata parsing)
**Review Status:** Approved (2025-11-25) - Critical fix applied, all ACs met

## User Story

As a catalogue user,
I want to see a "Try Before You Buy" tag on tryable products,
So that I can quickly identify which products I can evaluate before committing.

## Background

Story 6.1 enabled parsing of `try: true` metadata from product YAML frontmatter. This story adds visual tags using the GOV.UK Design System tag component to indicate tryable products in both the catalogue listing and product detail pages.

## Acceptance Criteria

### AC1: Tag on Product Cards in Catalogue Listing

**Given** a product has `try: true` in frontmatter
**When** the catalogue listing page renders
**Then** the product card displays a "Try Before You Buy" tag
**And** the tag uses GOV.UK green styling (govuk-tag--green)

### AC2: Tag on Product Detail Pages

**Given** a product has `try: true` in frontmatter
**When** the product detail page renders
**Then** a "Try Before You Buy" tag appears near the title
**And** the tag uses GOV.UK green styling (govuk-tag--green)

### AC3: No Tag for Non-Tryable Products

**Given** a product does NOT have `try: true` in frontmatter
**When** the product renders
**Then** no "Try Before You Buy" tag appears

### AC4: Tag Styling

**Given** the tag renders on a page
**When** the user views the tag
**Then** the tag uses GOV.UK Design System styling:

- Class: `govuk-tag govuk-tag--green`
- Text: "Try Before You Buy"
- Positioned consistently with other product metadata

## Technical Implementation

### Approach

Since this is an Eleventy site with Nunjucks templates, the implementation requires:

1. Modify the product card template to conditionally show the tag
2. Modify the product layout template to conditionally show the tag
3. Use the existing GOV.UK tag macro

### Tasks

- [ ] Task 1: Update product card template in catalogue listing
  - [ ] 1.1: Find the product card template/partial
  - [ ] 1.2: Add conditional tag rendering for `try: true`
  - [ ] 1.3: Style tag with `govuk-tag--green`

- [ ] Task 2: Update product detail page layout
  - [ ] 2.1: Find the product layout template
  - [ ] 2.2: Add conditional tag rendering near title
  - [ ] 2.3: Style tag with `govuk-tag--green`

- [ ] Task 3: Verify rendering
  - [ ] 3.1: Build and check tryable product shows tag
  - [ ] 3.2: Check non-tryable product does not show tag
  - [ ] 3.3: Verify tag styling matches GOV.UK Design System

## Dev Notes

### GOV.UK Tag Macro

```nunjucks
{% from "govuk/components/tag/macro.njk" import govukTag %}

{% if try %}
{{ govukTag({
  text: "Try Before You Buy",
  classes: "govuk-tag--green"
}) }}
{% endif %}
```

### Template Locations to Check

- `src/_includes/` - Custom includes
- Product card template (likely in catalogue index or layout)
- Product layout template (`layout: product`)

## Definition of Done

- [x] Tag appears on product cards for products with `try: true`
- [x] Tag appears on product detail pages for products with `try: true`
- [x] Tag uses GOV.UK green styling
- [x] No tag on products without try metadata
- [x] Build passes
- [x] Visual verification complete

---

## Dev Agent Record

### Context Reference

- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`
- Architecture: `docs/try-before-you-buy-architecture.md` (ADR-027)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. Created custom document-list component at `src/_includes/components/document-list/` that overrides GOV.UK plugin
2. Custom component adds "Try Before You Buy" tag for items with `try: true` in data
3. Created custom `product-try` layout at `src/_includes/layouts/product-try.njk`
4. Custom layout extends plugin's product layout and adds tag at top of content
5. Tryable products should use `layout: layouts/product-try` to display tag on detail page
6. Tag uses GOV.UK Design System styling: `govuk-tag govuk-tag--green`
7. Verified: Non-tryable products (aws/connect) have no green tag

### File List

- `src/_includes/components/document-list/template.njk` - Custom document list with try tag
- `src/_includes/components/document-list/macro.njk` - Macro wrapper
- `src/_includes/layouts/product-try.njk` - Custom product layout with try tag
- `src/catalogue/aws/innovation-sandbox-empty.md` - Updated to use product-try layout

---

## Senior Developer Review (AI)

### Reviewer

cns

### Date

2025-11-25

### Outcome

**Changes Requested** - Critical issue identified and fixed during review

### Summary

Story 6.2 implements a "Try Before You Buy" tag system for tryable products in the NDX catalogue. The implementation creates custom Nunjucks templates that override the GOV.UK Eleventy plugin components to add green tags to both catalogue listing pages and product detail pages.

**Key Finding:** The original implementation used "NDX:Try" as the tag text instead of "Try Before You Buy" as specified in all acceptance criteria (AC1, AC2, AC4). This was corrected during the review.

After fixing this critical issue, all acceptance criteria are now fully implemented, all tests pass (348/348), and the implementation follows GOV.UK Design System standards.

### Key Findings

#### HIGH Severity

- **[FIXED]** Tag text mismatch: Implementation used "NDX:Try" instead of "Try Before You Buy"
  - **Evidence:** Lines 13-14 in `src/_includes/components/document-list/template.njk` and lines 9-11 in `src/_includes/layouts/product-try.njk`
  - **AC Impact:** AC1, AC2, and AC4 all specify text should be "Try Before You Buy"
  - **Resolution:** Changed tag text from "NDX:Try" to "Try Before You Buy" in both templates
  - **Files Modified:**
    - `src/_includes/components/document-list/template.njk` (line 13)
    - `src/_includes/layouts/product-try.njk` (line 10)

#### MEDIUM Severity

None

#### LOW Severity

- **Task completion tracking:** All tasks in the story are marked as incomplete ([ ]) but implementation evidence shows they were actually completed
  - This is a documentation issue, not an implementation issue
  - All tasks can be verified as complete through code inspection and build verification

### Acceptance Criteria Coverage

| AC# | Description                               | Status          | Evidence                                                                                                                                                                                                                       |
| --- | ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 | Tag on product cards in catalogue listing | **IMPLEMENTED** | `src/_includes/components/document-list/template.njk` lines 11-16. Tag appears in built HTML: `_site/catalogue/index.html`. Verified "Try Before You Buy" text and `govuk-tag--green` class.                                   |
| AC2 | Tag on product detail pages               | **IMPLEMENTED** | `src/_includes/layouts/product-try.njk` lines 7-13. Tag appears in built HTML: `_site/catalogue/aws/innovation-sandbox-empty/index.html` at line 208. Positioned near title in content block.                                  |
| AC3 | No tag for non-tryable products           | **IMPLEMENTED** | Verified `src/catalogue/aws/connect.md` (has `try: false` implicit) produces no tag in `_site/catalogue/aws/connect/index.html`. Grep search returns 0 matches for tag classes.                                                |
| AC4 | Tag styling matches GOV.UK Design System  | **IMPLEMENTED** | Both templates use `govukTag` macro with `classes: "govuk-tag--green"`. Text is "Try Before You Buy" (after fix). Consistent positioning with `govuk-!-margin-left-2` (catalogue) and `govuk-!-margin-bottom-4` (detail page). |

**Summary:** 4 of 4 acceptance criteria fully implemented (after critical fix applied).

### Task Completion Validation

| Task                                           | Marked As  | Verified As           | Evidence                                                                                   |
| ---------------------------------------------- | ---------- | --------------------- | ------------------------------------------------------------------------------------------ |
| 1.1: Find product card template                | Incomplete | **VERIFIED COMPLETE** | File found at `src/_includes/components/document-list/template.njk`                        |
| 1.2: Add conditional tag rendering             | Incomplete | **VERIFIED COMPLETE** | Lines 11-16 in template.njk show `{% if item.data.try %}` conditional with tag rendering   |
| 1.3: Style tag with govuk-tag--green           | Incomplete | **VERIFIED COMPLETE** | Line 14: `classes: "govuk-tag--green govuk-!-margin-left-2"`                               |
| 2.1: Find product layout template              | Incomplete | **VERIFIED COMPLETE** | File found at `src/_includes/layouts/product-try.njk`                                      |
| 2.2: Add conditional tag rendering near title  | Incomplete | **VERIFIED COMPLETE** | Lines 7-13 in product-try.njk show tag at top of content block                             |
| 2.3: Style tag with govuk-tag--green           | Incomplete | **VERIFIED COMPLETE** | Line 11: `classes: "govuk-tag--green"`                                                     |
| 3.1: Build and check tryable product shows tag | Incomplete | **VERIFIED COMPLETE** | Build successful, tag appears in `_site/catalogue/aws/innovation-sandbox-empty/index.html` |
| 3.2: Check non-tryable product no tag          | Incomplete | **VERIFIED COMPLETE** | Verified `connect.md` has no tag in built HTML                                             |
| 3.3: Verify tag styling matches GOV.UK         | Incomplete | **VERIFIED COMPLETE** | Uses standard `govuk-tag` macro with `govuk-tag--green` class                              |

**Summary:** 9 of 9 tasks verified complete (though marked incomplete in story). No falsely marked complete tasks.

### Test Coverage and Gaps

**Current Test Status:**

- Total tests: 348
- Passing: 348 (100%)
- Failing: 0

**Test Coverage:**

- Unit tests cover authentication, API clients, utilities, and UI components
- No specific tests for tag rendering (story 6.2 functionality)
- Tag rendering is template-based (Nunjucks) and verified through build output inspection

**Gap Assessment:**

- **LOW priority:** No automated tests for Nunjucks template rendering
  - Rationale: Template rendering is verified through build process and manual inspection
  - Future consideration: Could add E2E tests with Playwright to verify tag appearance
  - Not blocking for story completion

### Architectural Alignment

**Tech Spec Compliance:**

- ✅ Story 6.2 requirements met: "Generate 'Try Before You Buy' tag for products with `try: true`"
- ✅ GOV.UK Design System integration: Uses `govukTag` macro correctly
- ✅ Follows established pattern: Custom component overrides GOV.UK plugin defaults
- ✅ Consistent with Epic 6 architecture: Template-based implementation for static site

**Architecture Review:**

- Implementation follows ADR-020 (Progressive Enhancement): Static HTML with conditional rendering
- Uses Nunjucks templating as specified in brownfield context
- GOV.UK tag component styling (green) aligns with government service standards
- No architectural violations identified

### Security Notes

No security concerns identified for this story:

- Template rendering is server-side (build-time)
- No client-side JavaScript required for tag display
- No user input or dynamic data involved
- XSS risks mitigated by Nunjucks auto-escaping

### Best Practices and References

**GOV.UK Design System Compliance:**

- ✅ Tag component: [GOV.UK Tag Component](https://design-system.service.gov.uk/components/tag/)
- ✅ Green tag styling: Used for positive/success states (appropriate for "try available")
- ✅ Accessibility: Tag component is accessible by default (semantic HTML, sufficient contrast)

**Implementation Quality:**

- Clean conditional logic: `{% if item.data.try %}` / `{% if try %}`
- Proper use of GOV.UK macro imports
- Consistent margin/spacing classes: `govuk-!-margin-left-2`, `govuk-!-margin-bottom-4`
- Comments reference story number for traceability

**References:**

- GOV.UK Eleventy Plugin docs: [x-govuk/govuk-eleventy-plugin](https://github.com/x-govuk/govuk-eleventy-plugin)
- Nunjucks templating: [Nunjucks Docs](https://mozilla.github.io/nunjucks/)

### Action Items

**Code Changes Required:**

- [x] [High] Change tag text from "NDX:Try" to "Try Before You Buy" in catalogue listing template [file: src/_includes/components/document-list/template.njk:13] - **COMPLETED**
- [x] [High] Change tag text from "NDX:Try" to "Try Before You Buy" in product detail layout [file: src/_includes/layouts/product-try.njk:10] - **COMPLETED**

**Advisory Notes:**

- Note: Task checkboxes in story could be updated to reflect completion (purely documentation)
- Note: Consider adding E2E tests for tag rendering in future iterations (not blocking for MVP)
- Note: Story 6.3 (catalogue filter) will need to reference the "Try Before You Buy" tag for filter UI

---

## Change Log

### 2025-11-25

- **Version 1.1** - Senior Developer Review notes appended
- Critical issue fixed: Tag text changed from "NDX:Try" to "Try Before You Buy"
- All acceptance criteria validated and confirmed complete
- All tests passing (348/348)
- Story approved pending sprint status update
