# Story 6.4: "Try this now for 24 hours" Button on Product Pages

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - User action trigger for Try flow
**Status:** done
**Dependencies:** Story 6.1 (try metadata), Story 6.2 (tag display)

## User Story

As a catalogue user,
I want to see a "Try this now for 24 hours" button on tryable products,
So that I can initiate a sandbox session request.

## Acceptance Criteria

### AC1: Button on Tryable Products
**Given** a product has `try: true` in frontmatter
**When** the product page renders
**Then** a "Try this now for 24 hours" button appears

### AC2: GOV.UK Start Button Styling
**Given** the try button renders
**When** the user views it
**Then** it uses GOV.UK Start Button styling (green with arrow icon)

### AC3: Data Attributes
**Given** the try button renders
**When** inspecting the HTML
**Then** it has:
- `data-module="try-button"` for JavaScript hooks
- `data-try-id` containing the product's try_id UUID

### AC4: No Button on Non-Tryable Products
**Given** a product does NOT have `try: true`
**When** the product page renders
**Then** no try button from the layout appears

## Technical Implementation

### Tasks Completed

- [x] Updated `product-try` layout to include govukButton macro
- [x] Added button with `isStartButton: true` for arrow icon
- [x] Added `data-module="try-button"` attribute for JS hooks
- [x] Added `data-try-id` attribute with try_id value

## Definition of Done

- [x] Try button appears on products with `try: true`
- [x] Button uses GOV.UK Start Button styling
- [x] Button has `data-try-id` attribute with correct UUID
- [x] Button has `data-module="try-button"` attribute
- [x] Non-tryable products don't have `data-try-id` button
- [x] Build passes

---

## Dev Agent Record

### Context Reference
- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
1. Updated `src/_includes/layouts/product-try.njk` to include GOV.UK button
2. Button uses `isStartButton: true` for arrow icon styling
3. Button includes `data-try-id` attribute populated from frontmatter
4. Products using `product-try` layout get automatic try button
5. Verified: innovation-sandbox-empty has button with data-try-id
6. Verified: Other products (aws/connect) have legacy buttons but no data-try-id

### File List
- `src/_includes/layouts/product-try.njk` - Added try button (lines 15-25)
