# Story 2.1: Auth Choice Modal

Status: done

## Story

As a **government user**,
I want **to choose between signing in or creating an account when authentication is required**,
So that **I have a clear path whether I'm new or returning** (FR8, FR29).

## Acceptance Criteria

1. **Given** I click "Try" on a product page without being logged in, **when** the auth modal appears, **then** I see two equally-weighted buttons: "Sign in" and "Create account" and the modal uses GOV.UK styling consistent with existing NDX modals

2. **Given** the auth modal is displayed, **when** I click "Sign in", **then** I am redirected to the existing login page and my return URL is preserved

3. **Given** the auth modal is displayed, **when** I click "Create account", **then** I am redirected to `/signup` and my return URL is preserved in sessionStorage

4. **Given** the auth modal is displayed, **when** I press Escape or click outside the modal, **then** the modal closes and I remain on the current page

5. **Given** the auth modal is displayed, **when** I navigate using only keyboard, **then** focus is trapped within the modal (Tab cycles through elements) and focus indicators are visible (3px yellow outline) and the modal meets WCAG 2.2 AA (NFR13)

6. **Given** the auth modal is displayed, **when** I use a screen reader, **then** the modal has `role="dialog"` and `aria-modal="true"` and the modal title is announced

## Tasks / Subtasks

- [x] Task 1: Create AuthChoiceModal component (AC: 1, 5, 6)
  - [x] 1.1 Create `src/signup/ui/auth-choice-modal.ts` following AUP modal pattern
  - [x] 1.2 Implement GOV.UK styled modal with two buttons
  - [x] 1.3 Add focus trap using existing `src/try/ui/utils/focus-trap.ts`
  - [x] 1.4 Add ARIA attributes (role="dialog", aria-modal="true", aria-labelledby)
  - [x] 1.5 Add CSS classes in `src/assets/styles.scss` matching AUP modal pattern

- [x] Task 2: Implement modal trigger logic (AC: 1)
  - [x] 2.1 Modify Try button handler to show AuthChoiceModal when unauthenticated
  - [x] 2.2 Add integration point in `src/try/ui/try-button.ts`

- [x] Task 3: Implement Sign In action (AC: 2)
  - [x] 3.1 "Sign in" button redirects to `/api/auth/login`
  - [x] 3.2 Store return URL in sessionStorage before redirect (reuse `storeReturnURL` from oauth-flow.ts)

- [x] Task 4: Implement Create Account action (AC: 3)
  - [x] 4.1 "Create account" button redirects to `/signup`
  - [x] 4.2 Store return URL in sessionStorage before redirect (reuse `storeReturnURL`)

- [x] Task 5: Implement modal dismiss (AC: 4)
  - [x] 5.1 Close modal on Escape key (via focus trap onEscape callback)
  - [x] 5.2 Close modal on overlay click (click event on overlay element)
  - [x] 5.3 Focus returns to trigger element on close

- [x] Task 6: Unit tests for AuthChoiceModal
  - [x] 6.1 Test modal renders with correct structure
  - [x] 6.2 Test "Sign in" navigates to /api/auth/login and stores return URL
  - [x] 6.3 Test "Create account" navigates to /signup and stores return URL
  - [x] 6.4 Test Escape key closes modal
  - [x] 6.5 Test overlay click closes modal
  - [x] 6.6 Test focus trap is activated/deactivated

- [x] Task 7: E2E tests for auth flow (AC: 1-6)
  - [x] 7.1 Add tests to `tests/e2e/catalogue/try-flow.spec.ts` for auth choice modal
  - [x] 7.2 Test axe-core accessibility on modal

## Dev Notes

### Previous Story Intelligence (Story 1.6)

**Key Learnings from Epic 1:**
- Use existing patterns from `src/try/ui/components/aup-modal.ts` - comprehensive modal implementation
- Focus trap utility at `src/try/ui/utils/focus-trap.ts` is production-ready
- ARIA live announcements via `src/try/ui/utils/aria-live.ts`
- Styles defined in SCSS (not inline) for CSP compliance
- E2E tests should check all violations, not just critical

**Established Patterns:**
- Modal singleton pattern: `class AuthChoiceModal { ... } export const authChoiceModal = new AuthChoiceModal()`
- Focus trap: `createFocusTrap(container, { onEscape: () => this.close() })`
- Return URL storage: `storeReturnURL()` from `src/try/auth/oauth-flow.ts`
- Body scroll lock: CSS class `aup-modal-open` with `overflow: hidden`

### Architecture Requirements

**From AUP Modal Implementation (reference pattern):**

```typescript
// Modal element IDs pattern
const IDS = {
  MODAL: "auth-choice-modal",
  TITLE: "auth-choice-modal-title",
  SIGN_IN_BTN: "auth-choice-sign-in-btn",
  CREATE_ACCOUNT_BTN: "auth-choice-create-btn",
  CANCEL_BTN: "auth-choice-cancel-btn",
} as const

// CSS class for body scroll lock
const BODY_MODAL_OPEN_CLASS = "auth-choice-modal-open"
```

**Modal HTML Structure (GOV.UK styled):**
```html
<div class="auth-choice-modal-overlay">
  <div
    id="auth-choice-modal"
    class="auth-choice-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="auth-choice-modal-title"
  >
    <div class="auth-choice-modal__header">
      <h2 id="auth-choice-modal-title" class="govuk-heading-l auth-choice-modal__title">
        Sign in or create an account
      </h2>
    </div>
    <div class="auth-choice-modal__body">
      <p class="govuk-body">You need to sign in or create an account to try this product.</p>
    </div>
    <div class="auth-choice-modal__footer">
      <button id="auth-choice-sign-in-btn" type="button" class="govuk-button">
        Sign in
      </button>
      <button id="auth-choice-create-btn" type="button" class="govuk-button govuk-button--secondary">
        Create account
      </button>
    </div>
  </div>
</div>
```

### Return URL Implementation

**From oauth-flow.ts:**
```typescript
import { storeReturnURL } from "../auth/oauth-flow"

// Before redirect:
storeReturnURL()  // Stores current pathname to sessionStorage

// Key: "ndx_return_url"
// Value: window.location.pathname (e.g., "/catalogue/aws/bedrock")
```

### Integration Point

**In try-button.ts (existing flow):**
```typescript
// Current flow: unauthenticated → AUP modal
// New flow: unauthenticated → Auth choice modal → Sign in OR → Create account

// Modify the click handler to show AuthChoiceModal first
if (!authState.isAuthenticated()) {
  // NEW: Show auth choice modal instead of AUP modal
  openAuthChoiceModal({
    onSignIn: () => {
      storeReturnURL()
      window.location.href = "/api/auth/login"
    },
    onCreateAccount: () => {
      storeReturnURL()
      window.location.href = "/signup"
    }
  })
  return
}
```

### Accessibility Requirements (WCAG 2.2 AA)

**Must have:**
- `role="dialog"` on modal container
- `aria-modal="true"` prevents screen reader from reading background
- `aria-labelledby` pointing to modal title
- Focus trap (Tab/Shift+Tab cycles within modal)
- Escape key closes modal
- Focus returns to trigger element on close
- Visible focus indicators (3px yellow outline per GOV.UK)
- Buttons are focusable and have clear labels

### File Structure

```
src/signup/
├── ui/
│   └── auth-choice-modal.ts    # NEW: Auth choice modal component
│   └── auth-choice-modal.test.ts # NEW: Unit tests
├── main.ts                     # Entry point (may need modification)
├── api.ts                      # API client (no changes)
└── types.ts                    # Shared types (no changes)

src/try/
├── ui/
│   └── try-button.ts           # MODIFY: Add auth choice modal trigger
│   └── components/
│       └── aup-modal.ts        # REFERENCE: Pattern to follow
│   └── utils/
│       └── focus-trap.ts       # REUSE: Focus trap utility
│       └── aria-live.ts        # REUSE: ARIA announcements
├── auth/
│   └── oauth-flow.ts           # REUSE: storeReturnURL function
```

### CSS Pattern (from aup-modal)

```scss
// Add to src/_includes/styles.scss

.auth-choice-modal-open {
  overflow: hidden;
}

.auth-choice-modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.auth-choice-modal {
  background-color: #fff;
  border-radius: 0;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;

  &__header {
    padding: 20px 20px 0;
  }

  &__title {
    margin: 0;
  }

  &__body {
    padding: 20px;
  }

  &__footer {
    padding: 0 20px 20px;
    display: flex;
    gap: 15px;

    .govuk-button {
      margin-bottom: 0;
    }
  }
}
```

### Testing Strategy

**Unit Tests (Jest):**
- Mock `window.location.href` assignment
- Mock `storeReturnURL` function
- Test focus trap activation/deactivation
- Test ARIA attributes are set correctly

**E2E Tests (Playwright):**
- Test modal appears when clicking Try button while unauthenticated
- Test Sign in button redirects correctly
- Test Create account button redirects correctly
- Test Escape closes modal
- Test axe-core accessibility scan passes

### References

- [Source: epics.md - Story 2.1 acceptance criteria]
- [Source: src/try/ui/components/aup-modal.ts - Modal pattern reference]
- [Source: src/try/ui/utils/focus-trap.ts - Focus trap utility]
- [Source: src/try/auth/oauth-flow.ts - storeReturnURL function]
- [Source: project-context.md - GOV.UK Design System rules]
- [Source: 1-6-success-page-unlisted-domain-handling.md - Previous story learnings]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- TypeScript compilation: PASS
- Auth choice modal unit tests: 30 passed
- Try-button unit tests: 42 passed
- All signup unit tests: 161 passed

### Completion Notes List

1. Created AuthChoiceModal component following AUP modal pattern from `src/try/ui/components/aup-modal.ts`
2. Implemented singleton pattern with `authChoiceModal` export
3. Used existing focus trap utility from `src/try/ui/utils/focus-trap.ts`
4. Added ARIA live announcements via existing `src/try/ui/utils/aria-live.ts`
5. Reused `storeReturnURL()` from `src/try/auth/oauth-flow.ts` for return URL preservation
6. Added CSS styles in `src/assets/styles.scss` matching AUP modal pattern
7. Modified `src/try/ui/try-button.ts` to show auth choice modal instead of direct redirect for unauthenticated users
8. Created comprehensive unit tests (30 tests) covering all acceptance criteria
9. Updated existing try-button tests to reflect new behavior
10. Added E2E tests in `tests/e2e/catalogue/try-flow.spec.ts` for auth choice modal

### Change Log

1. Created `src/signup/ui/auth-choice-modal.ts` - Auth choice modal component
2. Created `src/signup/ui/auth-choice-modal.test.ts` - Unit tests (30 tests)
3. Modified `src/assets/styles.scss` - Added auth choice modal CSS styles
4. Modified `src/try/ui/try-button.ts` - Changed unauthenticated flow to show modal
5. Modified `src/try/ui/try-button.test.ts` - Updated tests for new behavior
6. Modified `tests/e2e/catalogue/try-flow.spec.ts` - Added E2E tests for auth choice modal

### File List

**Created:**
- `src/signup/ui/auth-choice-modal.ts`
- `src/signup/ui/auth-choice-modal.test.ts`

**Modified:**
- `src/assets/styles.scss`
- `src/try/ui/try-button.ts`
- `src/try/ui/try-button.test.ts`
- `tests/e2e/catalogue/try-flow.spec.ts`

---

## Code Review Record

### Review Agent Model

Claude Opus 4.5

### Review Date

2026-01-13

### Issues Found and Fixed

**HIGH (1):**
1. **AC1 Violation: Buttons NOT equally-weighted** - Create account button used `govuk-button--secondary` class, making it visually subordinate. Fixed by removing secondary class.

**MEDIUM (4):**
2. **Unused import in try-button.ts** - `storeReturnURL` import no longer needed since auth-choice-modal handles it internally. Removed dead import.
3. **Test coverage gap** - Unit test for "modal already open" didn't verify DOM wasn't duplicated. Added assertion.
4. **Unit test asserted wrong class** - Test expected `govuk-button--secondary` on Create account button. Updated to expect equal weighting (no secondary class).
5. **E2E test missing focus trap verification** - No focus trap E2E test for auth choice modal. Added new test.

**LOW (2):**
6. **Git tracking** - New files shown as untracked (addressed by noting in review)
7. **Unused CANCEL_BTN ID** - IDS constant includes Cancel button ID but no Cancel button rendered (noted, not fixed - may be intentional design choice)

### Code Review Fixes Applied

1. `src/signup/ui/auth-choice-modal.ts` - Removed `govuk-button--secondary` class from Create account button (AC1 compliance)
2. `src/try/ui/try-button.ts` - Removed unused `storeReturnURL` import
3. `src/try/ui/try-button.test.ts` - Removed unused mock for `storeReturnURL`
4. `src/signup/ui/auth-choice-modal.test.ts` - Added DOM duplication check, updated button class assertion
5. `tests/e2e/catalogue/try-flow.spec.ts` - Added focus trap E2E test for auth choice modal

### Tests Added

- Unit test assertion: Verify only one modal in DOM when opened twice
- E2E test: "Focus trap keeps focus within auth choice modal (AC5)"

### Test Results After Review

- TypeScript compilation: PASS
- Unit tests (auth-choice-modal, try-button): 72 passed
- All tests: PASS

### Acceptance Criteria Verification

| AC | Status | Evidence |
|----|--------|----------|
| AC1: Two equally-weighted buttons | ✅ FIXED | Both buttons now use `govuk-button` class only |
| AC2: Sign in redirects to login | ✅ PASS | Unit + E2E tests verify `/api/auth/login` redirect |
| AC3: Create account redirects to /signup | ✅ PASS | Unit + E2E tests verify `/signup` redirect |
| AC4: Escape/outside click closes modal | ✅ PASS | Unit + E2E tests verify close behavior |
| AC5: Focus trap with visible indicators | ✅ PASS | E2E test added, focus trap verified |
| AC6: ARIA attributes for screen reader | ✅ PASS | Unit tests verify role, aria-modal, aria-labelledby |

### Review Outcome

**APPROVED** - All HIGH and MEDIUM issues fixed. All Acceptance Criteria verified. Story ready for done status.
