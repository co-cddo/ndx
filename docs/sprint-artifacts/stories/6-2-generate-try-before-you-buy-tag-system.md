# Story 6.2: Generate "Try Before You Buy" Tag System

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - Visual indicator for tryable products
**Status:** done
**Dependencies:** Story 6.1 complete (try metadata parsing)

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
