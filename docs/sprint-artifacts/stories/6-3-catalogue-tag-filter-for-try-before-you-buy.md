# Story 6.3: Catalogue Tag Filter for "Try Before You Buy"

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - User discovery of tryable products
**Status:** done
**Dependencies:** Story 6.1 (try metadata parsing), Story 6.2 (tag display)

## User Story

As a catalogue user,
I want to filter the catalogue to show only "Try Before You Buy" products,
So that I can quickly find products available for evaluation.

## Acceptance Criteria

### AC1: Filter Link in Sidebar
**Given** a user is on the catalogue page
**When** they view the filter sidebar
**Then** "Try Before You Buy" appears as a filter option

### AC2: Filter Shows Only Tryable Products
**Given** a user clicks the "Try Before You Buy" filter
**When** the filter page loads
**Then** only products with `try: true` are displayed

### AC3: Filter URL
**Given** the filter is active
**When** the user views the URL
**Then** it shows `/catalogue/tags/try-before-you-buy`

## Technical Implementation

### Tasks Completed

- [x] Added `catalogueTryable` collection in `eleventy.config.js`
- [x] Added "Try Before You Buy" link to catalogue-collection.njk sidebar
- [x] Created tag page at `src/catalogue/tags/try-before-you-buy.md`

## Definition of Done

- [x] "Try Before You Buy" filter appears in catalogue sidebar
- [x] Filter link points to `/catalogue/tags/try-before-you-buy`
- [x] Filter page shows only tryable products
- [x] Filter page uses standard catalogue-collection layout
- [x] Build passes

---

## Dev Agent Record

### Context Reference
- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
1. Added `catalogueTryable` collection to `eleventy.config.js` that filters products with `try: true`
2. Added "Try Before You Buy" link to filter sidebar in `catalogue-collection.njk`
3. Created `src/catalogue/tags/try-before-you-buy.md` tag page using `collections.catalogueTryable`
4. Verified filter shows AWS Innovation Sandbox - Empty Account (the only tryable product)

### File List
- `eleventy.config.js` - Added catalogueTryable collection (lines 190-197)
- `src/_includes/catalogue-collection.njk` - Added Try Before You Buy filter link
- `src/catalogue/tags/try-before-you-buy.md` - New tag filter page
