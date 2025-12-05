# ADR-017: Try Button Integration

## Status

Accepted

## Context

The Try Before You Buy feature needs a mechanism for users to initiate sandbox requests from the NDX catalogue. The "Try this now for 24 hours" button appears on product pages with AWS sandbox availability (indicated by `try_id` in frontmatter).

Requirements:

- Button must check authentication status before proceeding
- Unauthenticated users must be redirected to OAuth login
- Authenticated users must see the AUP acceptance modal
- Button must work on both desktop and mobile (44x44px touch targets)
- Button must integrate with existing GOV.UK Design System styling

## Decision

Implement a client-side TypeScript module (`try-button.ts`) that:

1. Discovers Try buttons via `data-try-id` attribute on page load
2. Checks authentication status synchronously via `authState.isAuthenticated()`
3. For unauthenticated users: stores return URL and redirects to OAuth
4. For authenticated users: opens AUP modal with the product's `try_id`
5. Handles lease creation callback from modal acceptance

### Key Implementation Details

```typescript
// Button discovery pattern
document.querySelectorAll("[data-try-id]").forEach((button) => {
  button.addEventListener("click", handleTryClick)
})

// Authentication check flow
if (!authState.isAuthenticated()) {
  storeReturnURL()
  window.location.href = OAUTH_LOGIN_URL
  return
}

// Open modal for authenticated users
openAupModal(tryId, handleLeaseAcceptance)
```

## Consequences

### Positive

- Simple discovery pattern works with static HTML generation (Eleventy)
- No framework dependency - vanilla TypeScript
- Clear separation: button triggers modal, modal handles lease request
- Return URL storage enables seamless post-auth experience
- Single attribute (`data-try-id`) carries all needed context

### Negative

- Requires JavaScript enabled (progressive enhancement limited for this flow)
- Must ensure button initialization runs after DOM ready

### Neutral

- Button styling inherited from GOV.UK Design System
- Button text and appearance controlled by Nunjucks templates

## Implementation

### Files

- `src/try/ui/try-button.ts` - Main button handler module
- `src/try/ui/try-button.test.ts` - Unit tests

### Usage in Templates

```html
<button class="govuk-button" data-try-id="{{ product.try_id }}">Try this now for 24 hours</button>
```

### Initialization

```typescript
// src/try/main.ts
import { initTryButton } from "./ui/try-button"
initTryButton()
```

## Related ADRs

- [ADR-024](ADR-024-auth-state-management.md) - Authentication state management
- [ADR-026](ADR-026-accessible-modal-pattern.md) - AUP modal implementation
- [ADR-023](ADR-023-oauth-callback-pattern.md) - OAuth flow for unauthenticated users
