# ADR-023: OAuth Callback Pattern

## Status
Accepted

## Context

The Try Before You Buy feature uses Innovation Sandbox OAuth for authentication. When users click "Try this now" without being authenticated, they must:
1. Be redirected to Innovation Sandbox OAuth provider
2. Complete authentication
3. Return to NDX with a JWT token
4. Resume their original action (viewing the product page)

The OAuth flow requires a dedicated callback endpoint to receive the token and handle redirection.

## Decision

Implement a dedicated callback page (`/callback`) that:
1. Extracts JWT token from URL hash fragment (`#token=...`)
2. Validates the token format (basic structure validation)
3. Stores valid token in sessionStorage
4. Redirects to stored return URL or default `/try` page
5. Handles error cases (missing token, invalid format)

### Security Considerations

```typescript
// URL validation to prevent open redirect attacks
export function isValidReturnUrl(url: string): boolean {
  // 5-layer defense:
  // 1. Must be relative path (starts with /)
  // 2. No protocol prefix
  // 3. No double slashes (//example.com)
  // 4. No backslash-based bypasses (\/example.com)
  // 5. No encoded characters that could bypass checks
  return (
    url.startsWith('/') &&
    !url.includes('://') &&
    !url.startsWith('//') &&
    !url.includes('\\') &&
    !/%2f/i.test(url)
  );
}
```

### Token Handling

```typescript
// Extract token from hash fragment (not query params for security)
const hash = window.location.hash;
const tokenMatch = hash.match(/token=([^&]+)/);
const token = tokenMatch?.[1];

if (token && isValidJwtFormat(token)) {
  sessionStorage.setItem(JWT_TOKEN_KEY, token);
  const returnUrl = getStoredReturnUrl();
  window.location.href = sanitizeReturnUrl(returnUrl);
}
```

## Consequences

### Positive
- Token in hash fragment prevents server-side logging
- Return URL storage enables seamless user experience
- URL validation prevents open redirect vulnerabilities
- Clean separation of callback handling from main application

### Negative
- Requires dedicated page that must handle edge cases
- Hash fragment parsing slightly more complex than query params
- sessionStorage clears on browser restart (acceptable trade-off for security)

### Neutral
- OAuth provider configuration must specify `/callback` as allowed redirect
- Token format validation is basic (server-side validation is authoritative)

## Implementation

### Files
- `src/try/pages/callback.ts` - Callback page handler
- `src/try/auth/oauth-flow.ts` - Token extraction and validation
- `src/try/utils/url-validator.ts` - Return URL validation

### Callback Page Flow

```
User clicks "Try" → Not authenticated → Store return URL → Redirect to OAuth
                                                                    ↓
User → OAuth Provider → Authenticate → Redirect to /callback#token=xxx
                                                                    ↓
/callback page → Extract token → Validate → Store → Redirect to return URL
                                                                    ↓
Return to product page → User now authenticated → Click "Try" → Show AUP modal
```

### Template (callback.njk)

```html
---
layout: minimal.njk
title: Signing in...
---
<main class="govuk-main-wrapper">
  <noscript>
    <p class="govuk-body">JavaScript is required. Please enable it.</p>
  </noscript>
  <p class="govuk-body" id="callback-status">Processing sign in...</p>
</main>
<script type="module" src="/assets/callback.bundle.js"></script>
```

## Related ADRs
- [ADR-024](ADR-024-auth-state-management.md) - JWT token storage
- [ADR-017](ADR-017-try-button.md) - Pre-auth return URL storage
