# Story 6.1: Parse "try" Metadata from Product YAML Frontmatter

**Epic:** Epic 6: Catalogue Integration & Sandbox Requests
**Type:** Development Story
**Priority:** High - Foundation for all catalogue Try features
**Status:** done
**Dependencies:** Story 6.0 complete (UX Review GATE passed)

## User Story

As a developer,
I want to parse `try` and `try_id` metadata from product page YAML frontmatter,
So that I can identify tryable products in the catalogue.

## Background

The NDX catalogue uses Eleventy (11ty) static site generator with Nunjucks templates. Products are defined as markdown files with YAML frontmatter. This story adds support for two new frontmatter fields:

- `try: true` - Boolean indicating the product supports "Try Before You Buy"
- `try_id: <UUID>` - The Innovation Sandbox lease template UUID for this product

These fields enable Stories 6.2-6.9 to display try buttons, filter tryable products, and submit lease requests.

## Acceptance Criteria

### AC1: Parse `try` Boolean Field
**Given** a product markdown file with frontmatter
**When** the frontmatter includes `try: true`
**Then** the `try` field is available in Nunjucks templates as `page.data.try`

**Example Product File:**
```yaml
---
title: "AWS Innovation Sandbox"
tags: ["aws", "sandbox"]
try: true
---
```

### AC2: Parse `try_id` UUID Field
**Given** a product markdown file with frontmatter
**When** the frontmatter includes `try_id: "550e8400-e29b-41d4-a716-446655440000"`
**Then** the `try_id` field is available in Nunjucks templates as `page.data.try_id`

**Example Product File:**
```yaml
---
title: "AWS Innovation Sandbox"
try: true
try_id: "550e8400-e29b-41d4-a716-446655440000"
---
```

### AC3: Template Access
**Given** a Nunjucks template rendering a product page
**When** the product has `try: true` in frontmatter
**Then** the template can access metadata:

```nunjucks
{% if try %}
  <p>This product supports Try Before You Buy</p>
  <p>Lease Template ID: {{ try_id }}</p>
{% endif %}
```

### AC4: Default Value Handling
**Given** a product markdown file without `try` field
**When** the page renders
**Then** `try` defaults to `false` (product not tryable)
**And** `try_id` defaults to `undefined`

### AC5: UUID Format Validation (Build-time Warning)
**Given** a product markdown file with invalid `try_id`
**When** Eleventy build runs
**Then** a warning is logged to console:
```
⚠️ Invalid try_id format in product-name.md: Expected UUID format
```
**And** the build continues (non-blocking warning)

**Valid UUID format:** `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

## Technical Implementation

### Implementation Approach

Eleventy's built-in gray-matter parser already handles YAML frontmatter. The `try` and `try_id` fields will be automatically parsed and available in templates without additional configuration.

**What's Needed:**
1. Add UUID validation in `eleventy.config.js` (addTransform or addLinter)
2. Create example product file with `try` metadata
3. Update product template to conditionally display try-related content

### Tasks

- [ ] Task 1: Add UUID validation in eleventy.config.js
  - [ ] 1.1: Create `validateTryMetadata` function
  - [ ] 1.2: Add transform/linter to check `try_id` format
  - [ ] 1.3: Log warning for invalid UUIDs (non-blocking)

- [ ] Task 2: Create example tryable product
  - [ ] 2.1: Create `src/catalogue/aws/empty.md` with try metadata
  - [ ] 2.2: Add `try: true` and `try_id` to frontmatter
  - [ ] 2.3: Verify frontmatter parsed correctly in build

- [ ] Task 3: Test template access
  - [ ] 3.1: Update product template to log `try` value (temporary)
  - [ ] 3.2: Verify `page.data.try` is accessible
  - [ ] 3.3: Verify `page.data.try_id` is accessible
  - [ ] 3.4: Remove debug logging

## Dev Notes

### Architecture Context

- **ADR-015:** Vanilla Eleventy with TypeScript (brownfield constraint)
- **Data Flow:** YAML frontmatter → gray-matter parser → Nunjucks template context
- **Module:** Build-time validation in `eleventy.config.js`

### Eleventy Frontmatter Reference

Eleventy uses [gray-matter](https://github.com/jonschlinkert/gray-matter) to parse YAML frontmatter. All frontmatter fields are automatically available in templates:

```javascript
// eleventy.config.js - no special configuration needed for basic parsing
// gray-matter handles all YAML fields automatically
```

### UUID Validation Pattern

```javascript
// UUID validation regex (case-insensitive)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return UUID_REGEX.test(value);
}
```

### Example Product File Structure

```markdown
---
title: "AWS Innovation Sandbox - Empty Account"
description: "A blank AWS account for experimentation"
tags: ["aws", "sandbox", "evaluation"]
try: true
try_id: "a3beced2-be4e-41a0-b6e2-735a73fffed7"
---

## Overview

This product provides access to an empty AWS account...
```

## Definition of Done

- [x] `try` field parsed from frontmatter and accessible in templates
- [x] `try_id` field parsed from frontmatter and accessible in templates
- [x] Products without `try` default to not tryable
- [x] Invalid `try_id` format logs build warning (non-blocking)
- [x] Example product created with try metadata
- [x] Template conditional rendering works (`{% if try %}`)
- [x] Build passes with and without try metadata

## Test Cases

| Test | Input | Expected Output |
|------|-------|-----------------|
| Valid try metadata | `try: true`, `try_id: valid-uuid` | Both values accessible in template |
| Missing try field | No `try` field | `try` is undefined/falsy |
| Invalid UUID format | `try_id: "not-a-uuid"` | Build warning logged |
| Empty try_id | `try_id: ""` | Build warning logged |
| try: false | `try: false` | `try` is false in template |

---

## Dev Agent Record

### Context Reference
- Epic 6 Tech Spec: `docs/sprint-artifacts/tech-spec-epic-6.md`
- Architecture: `docs/try-before-you-buy-architecture.md` (ADR-015)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List
1. Added UUID validation function `validateTryMetadata()` to eleventy.config.js
2. UUID regex validates format: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
3. Validation runs during catalogue collection build (non-blocking warning)
4. Created example tryable product at `src/catalogue/aws/innovation-sandbox-empty.md`
5. Tested invalid UUID warning - correctly displays: "⚠️ Invalid try_id format..."
6. Build passes with valid and invalid try metadata (warnings only, non-blocking)
7. Eleventy's gray-matter automatically parses `try` and `try_id` from YAML frontmatter

### File List
- `eleventy.config.js` - Added UUID validation (lines 32-56, 159-162)
- `src/catalogue/aws/innovation-sandbox-empty.md` - New tryable product example
