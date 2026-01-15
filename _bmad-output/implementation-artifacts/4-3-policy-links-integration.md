# Story 4.3: Policy Links Integration

Status: done

## Story

As a **government user**,
I want **easy access to privacy and cookies policies from anywhere on the site**,
So that **I can find this information when I need it** (FR27, FR28).

## Acceptance Criteria

1. **Given** I am on any page of the NDX site, **when** I scroll to the footer, **then** I see links to "Privacy" and "Cookies" and the links navigate to `/privacy` and `/cookies` respectively

2. **Given** I am on the signup form (`/signup`), **when** I view the form, **then** I see a link to the privacy policy near the submit button and the link text follows GOV.UK patterns (e.g., "Read our privacy policy")

3. **Given** the footer links are added, **when** I check existing pages (homepage, product pages), **then** the privacy and cookies links appear consistently

4. **Given** I click a footer policy link, **when** the page loads, **then** the navigation is smooth (no broken links) and I can easily return to my previous page

## Tasks / Subtasks

- [x] Task 1: Add footer links (AC: 1, 3, 4)
  - [x] 1.1 Update `eleventy.config.js` footer config with meta.items
  - [x] 1.2 Add Privacy, Cookies, and Accessibility links

- [x] Task 2: Add signup form privacy link (AC: 2)
  - [x] 2.1 Add privacy policy link above submit button in signup.md
  - [x] 2.2 Use GOV.UK body-s style for the link

## Dev Notes

### Footer Configuration

The GOV.UK Eleventy plugin footer accepts `meta.items` for inline footer links:
```javascript
footer: {
  meta: {
    items: [
      { text: "Privacy", href: "/privacy/" },
      { text: "Cookies", href: "/cookies/" },
      { text: "Accessibility", href: "/accessibility/" },
    ],
    text: "Page built from ...",
  },
},
```

### Signup Form Link

Add a GOV.UK body-s link above the submit button:
```html
<p class="govuk-body-s">
  By continuing, you agree to our <a href="/privacy/" class="govuk-link">privacy policy</a>.
</p>
```

### References

- [Source: epics.md - Story 4.3 acceptance criteria]
- [Source: eleventy.config.js footer configuration]
- [Source: @x-govuk/govuk-eleventy-plugin footer template]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Modified: `eleventy.config.js`
- Modified: `src/signup.md`

### Completion Notes List

1. Added footer links (Privacy, Cookies, Accessibility) via meta.items config
2. Added privacy policy consent link above submit button in signup form
3. Build verified - footer links appear on all pages
4. Signup form shows "By continuing, you agree to our privacy policy"

### Change Log

1. Updated `eleventy.config.js` - Added meta.items array with footer links
2. Updated `src/signup.md` - Added privacy policy link before submit button

### File List

**Modified:**
- `eleventy.config.js`
- `src/signup.md`

---

## Code Review Record

### Review Agent Model

Claude Opus 4.5

### Review Date

2026-01-13

### Issues Found and Fixed

None - configuration and content changes follow established patterns.

### Code Review Fixes Applied

None required.

### Tests Added

E2E tests deferred to Story 4.4 (Final WCAG Audit).

### Test Results After Review

Build successful - footer links verified in generated HTML.

### Acceptance Criteria Verification

| AC | Status | Evidence |
|----|--------|----------|
| AC1 | PASS | Footer links present on homepage and all pages |
| AC2 | PASS | Privacy link added above submit button in signup form |
| AC3 | PASS | Links appear consistently across site |
| AC4 | PASS | Navigation smooth, links work correctly |

### Review Outcome

**APPROVED** - Configuration complete, links verified in build output.
