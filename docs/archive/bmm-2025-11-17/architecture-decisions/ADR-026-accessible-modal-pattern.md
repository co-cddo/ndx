# ADR-026: Accessible Modal Pattern

## Status

Accepted

## Context

The AUP acceptance modal is the most critical UX moment in the Try Before You Buy flow. Users must:

- Read the Acceptable Use Policy
- Check the acceptance checkbox
- Click Continue to request their sandbox

The modal must be fully accessible per WCAG 2.2 AA requirements:

- Screen reader announcements for state changes
- Keyboard navigation (Tab, Escape)
- Focus trap within modal
- No content interaction behind modal

## Decision

Implement a WCAG 2.2 AA compliant modal with these features:

### Focus Management

```typescript
// Focus trap implementation
const focusTrap = createFocusTrap(modal, {
  onEscape: () => closeModal(),
  initialFocus: cancelButton, // Safe default
})
focusTrap.activate()
```

### ARIA Attributes

```html
<div
  id="aup-modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="aup-modal-title"
  aria-describedby="aup-modal-description"
></div>
```

### Screen Reader Announcements

```typescript
import { announce } from "../utils/aria-live"

// On modal open
announce("Request AWS Sandbox Access dialog opened")

// On checkbox change
if (checked) {
  announce("Acceptable Use Policy accepted. Continue button is now enabled.")
}

// On loading state
announce("Requesting your sandbox...")
```

### XSS Prevention

Dynamic content uses `textContent` instead of `innerHTML` interpolation:

```typescript
// XSS-safe loading state
showLoading(message = 'Loading...'): void {
  body.innerHTML = `
    <div class="aup-modal__loading">
      <span id="aup-loading-message"></span>
    </div>
  `;
  // Use textContent for user-provided message
  const messageEl = body.querySelector('#aup-loading-message');
  if (messageEl) messageEl.textContent = message;
}
```

## Consequences

### Positive

- Full WCAG 2.2 AA compliance
- Screen reader users get clear state announcements
- Keyboard users can navigate and dismiss modal
- Focus returns to trigger element on close
- XSS prevented through safe DOM manipulation

### Negative

- Focus trap requires careful implementation
- Must test with multiple screen readers (NVDA, VoiceOver, JAWS)
- Modal complexity higher than simple alert()

### Neutral

- GOV.UK Design System provides base styling
- Custom accessibility utilities (focus-trap.ts, aria-live.ts) reusable

## Implementation

### Files

- `src/try/ui/components/aup-modal.ts` - Main modal component
- `src/try/ui/utils/focus-trap.ts` - Focus trap utility
- `src/try/ui/utils/aria-live.ts` - Screen reader announcement utility

### Modal Structure

```html
<div class="aup-modal-overlay">
  <div id="aup-modal" role="dialog" aria-modal="true">
    <div class="aup-modal__header">
      <h2 id="aup-modal-title">Request AWS Sandbox Access</h2>
    </div>
    <div class="aup-modal__body">
      <div id="aup-modal-description">
        <p><strong>Session duration:</strong> 24 hours</p>
        <p><strong>Budget limit:</strong> $50 USD</p>
      </div>
      <div id="aup-error" role="alert" class="aup-modal__error--hidden"></div>
      <h3>Acceptable Use Policy</h3>
      <div class="aup-modal__aup-container">
        <p id="aup-content">Loading...</p>
      </div>
      <div class="govuk-checkboxes">
        <input type="checkbox" id="aup-accept-checkbox" />
        <label for="aup-accept-checkbox"> I have read and accept the Acceptable Use Policy </label>
      </div>
    </div>
    <div class="aup-modal__footer">
      <button id="aup-continue-btn" disabled>Continue</button>
      <button id="aup-cancel-btn">Cancel</button>
    </div>
  </div>
</div>
```

### Keyboard Interactions

| Key       | Action                                              |
| --------- | --------------------------------------------------- |
| Tab       | Move focus forward within modal                     |
| Shift+Tab | Move focus backward within modal                    |
| Escape    | Close modal (with confirmation if checkbox checked) |
| Enter     | Activate focused button                             |
| Space     | Toggle checkbox / activate button                   |

## Related ADRs

- [ADR-017](ADR-017-try-button.md) - Try button opens modal
- [ADR-032](ADR-032-user-friendly-error-messages.md) - Error display in modal
