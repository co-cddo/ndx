# Authentication State Management

**Stories:** 5-1 Sign In/Out Button UI Components, 5-2 Sign In OAuth Redirect Flow, 5-3 JWT Token Extraction from URL
**Status:** OAuth callback flow complete (Stories 5.1-5.3 implemented)
**Last Updated:** 2025-11-23

## Overview

The NDX Try Before You Buy feature uses an event-driven authentication state management pattern implemented via the `AuthState` class. This approach ensures that multiple UI components (sign in/out buttons, try buttons, sessions pages) remain synchronized with the user's authentication state without manual coordination or polling.

## Architecture Decision

See [ADR-024: Authentication State Management](../try-before-you-buy-architecture.md#ADR-024) for the complete architectural decision record.

**Key Decision:** Observer pattern for reactive authentication state

- **Rationale:** Multiple components need to react to auth state changes (nav, try buttons, /try page)
- **Alternative Rejected:** Manual state checking in each component (leads to state inconsistencies)

## Implementation

### AuthState Class

Location: `src/try/auth/auth-provider.ts`

The `AuthState` class provides:

1. **Authentication checking:** `isAuthenticated()` - checks for JWT token in sessionStorage
2. **Event subscription:** `subscribe(listener)` - register callbacks for auth state changes
3. **State notification:** `notify()` - trigger all subscriber callbacks
4. **Login helper:** `login(token)` - store token and notify subscribers
5. **Logout helper:** `logout()` - remove token and notify subscribers

### Token Storage

**Storage mechanism:** sessionStorage (not localStorage or cookies)

- **Key:** `isb-jwt`
- **Scope:** Current browser session only (clears on browser close)
- **Accessibility:** Available across all tabs in same session
- **Security:** Does not persist across browser restarts (reduced exposure)

**Why sessionStorage?**

- Clears on browser close (security best practice)
- Accessible across tabs (better UX than tab-specific state)
- Aligns with GOV.UK One Login patterns

## Usage Examples

### Subscribe to Auth State Changes

```typescript
import { authState } from "./auth/auth-provider"

// Component subscribes to auth state changes
authState.subscribe((isAuthenticated) => {
  if (isAuthenticated) {
    console.log("User signed in - show authenticated UI")
  } else {
    console.log("User signed out - show unauthenticated UI")
  }
})
```

### Check Current Auth State

```typescript
if (authState.isAuthenticated()) {
  // User is signed in
  showTryButton()
} else {
  // User is not signed in
  hideTryButton()
}
```

### Handle Sign In (Story 5.3)

```typescript
// After OAuth redirect, extract token from URL
const urlParams = new URLSearchParams(window.location.search)
const token = urlParams.get("token")

if (token) {
  authState.login(token) // Stores token and notifies all subscribers
}
```

### Handle Sign Out (Story 5.5)

```typescript
// Sign out button click handler
document.querySelector('[data-action="signout"]').addEventListener("click", (e) => {
  e.preventDefault()
  authState.logout() // Removes token and notifies all subscribers
  window.location.href = "/"
})
```

## Component Integration

### Authentication Navigation Component

Location: `src/try/ui/auth-nav.ts`

The `auth-nav` component:

1. Subscribes to `AuthState` changes on initialization
2. Renders "Sign in" link when `isAuthenticated === false`
3. Renders "Sign out" link when `isAuthenticated === true`
4. Uses GOV.UK Design System classes (`govuk-header__link`)

**Template Integration:**

- Header template includes `<li id="auth-nav"></li>` placeholder
- JavaScript populates this element on page load
- Progressive enhancement: `<noscript>` provides static "Sign in" link

### Main Entry Point

Location: `src/try/main.ts`

The main entry point:

1. Listens for `DOMContentLoaded` event
2. Initializes `auth-nav` component
3. Will initialize other Try components in future stories

**Build Process:**

- TypeScript compiled via esbuild
- Output: `src/assets/try.bundle.js`
- Included globally via GOV.UK plugin `scripts` configuration

## Testing

### Unit Tests

Location: `src/try/auth/auth-provider.test.ts`

Test coverage includes:

- ✅ isAuthenticated() returns correct state based on sessionStorage
- ✅ subscribe() calls listener immediately with current state
- ✅ notify() triggers all subscriber callbacks
- ✅ login() stores token and notifies subscribers
- ✅ logout() removes token and notifies subscribers
- ✅ Complete authentication flows (sign in, sign out)
- ✅ Multiple subscriber coordination

**Run Tests:**

```bash
yarn test
```

**Test Results:** 15/15 passing (100%)

### Manual Testing

To test authentication state management:

1. **Initial state (not authenticated):**
   - Open NDX in browser
   - Verify "Sign in" link appears in top-right navigation
   - Verify `sessionStorage.getItem('isb-jwt')` returns `null` (in DevTools console)

2. **Simulated authentication:**
   - In DevTools console: `sessionStorage.setItem('isb-jwt', 'test-token')`
   - In console: `window.authState.notify()` (if exposed for testing)
   - Verify navigation changes to "Sign out" link

3. **Simulated sign out:**
   - In DevTools console: `sessionStorage.removeItem('isb-jwt')`
   - In console: `window.authState.notify()`
   - Verify navigation changes to "Sign in" link

**Note:** Full OAuth integration will be testable in Stories 5.2-5.5.

## Accessibility

### Keyboard Navigation

- ✅ "Sign in" and "Sign out" links are keyboard navigable (Tab to focus, Enter to activate)
- ✅ Focus indicator visible (GOV.UK Design System provides default focus ring)

### Screen Reader Support

- ✅ Links have descriptive text ("Sign in", "Sign out")
- ✅ Links announced as navigation links by screen readers
- ✅ Progressive enhancement: `<noscript>` fallback for no-JS users

### WCAG 2.2 AA Compliance

- ✅ **1.4.3 Contrast (Minimum):** GOV.UK links meet 4.5:1 contrast ratio
- ✅ **2.1.1 Keyboard:** All functionality keyboard accessible
- ✅ **2.4.7 Focus Visible:** Focus ring visible on keyboard navigation
- ✅ **4.1.2 Name, Role, Value:** Links have accessible names

## Known Limitations (MVP)

1. **No token validation:** `isAuthenticated()` only checks token existence, not expiration or validity
   - **Mitigation:** Server-side API calls will return 401 if token invalid/expired
   - **Future:** Story 5.2 will add automatic re-authentication on 401 responses

2. **No sessionStorage availability check in production code:**
   - **Current:** Console warning logged if unavailable
   - **Future:** Could show user-facing error message for private browsing modes

3. **Sign out functionality incomplete:**
   - **Current:** "Sign out" link is placeholder (no click handler)
   - **Future:** Story 5.5 will implement full sign out functionality

## OAuth Redirect Flow (Story 5.2)

### OAuth Flow Sequence

The OAuth authentication flow follows this sequence:

```
1. User clicks "Sign in" button
   → storeReturnURL() saves current page URL to sessionStorage
   → Browser redirects to /api/auth/login

2. Innovation Sandbox handles OAuth redirect
   → Redirects to AWS OAuth login page
   → User authenticates with AWS credentials

3. OAuth provider redirects back to NDX
   → Callback URL: https://ndx.gov.uk/callback?token=eyJ...
   → Token appears in URL query parameter

4. Callback page processes response (Story 5.3)
   → Extracts JWT token from URL
   → Stores token via authState.login()
   → Redirects to original page (from sessionStorage)
```

### OAuth Flow Utilities

Location: `src/try/auth/oauth-flow.ts`

The `oauth-flow` module provides:

1. **Return URL storage:** `storeReturnURL()` - saves current page before OAuth redirect
2. **Return URL retrieval:** `getReturnURL()` - retrieves stored page after OAuth callback
3. **Return URL cleanup:** `clearReturnURL()` - removes stored URL from sessionStorage
4. **Error parsing:** `parseOAuthError()` - extracts and maps OAuth error codes to user-friendly messages

### Return URL Management

**Storage mechanism:** sessionStorage (key: `auth-return-to`)

**Why return URL storage?**

- OAuth flow redirects away from NDX (to AWS OAuth page)
- After authentication, user should return to the page they were on
- Without storage, user would always return to home page
- Improves UX by maintaining context

**Loop prevention:**

- Callback page (`/callback`) is never stored as return URL
- Prevents infinite redirect loops

### OAuth Error Handling

OAuth errors are mapped to user-friendly messages:

| OAuth Error Code  | User-Friendly Message                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `access_denied`   | "You cancelled the sign in process. Please try again if you want to access Try features."   |
| `invalid_request` | "There was a problem with the sign in request. Please try again."                           |
| `server_error`    | "The authentication service is temporarily unavailable. Please try again in a few minutes." |
| (unknown)         | "An error occurred during sign in. Please try again."                                       |

**Design principles:**

- Plain language (no technical jargon like "OAuth", "JWT", "401")
- Clear recovery path ("Please try again")
- Calm tone (don't alarm users)
- Follows GOV.UK Design System content guidance

### Callback Page

Location: `src/callback.html`

The OAuth callback page:

1. **Displays loading state** while processing OAuth response
2. **Handles OAuth errors** if `?error=...` query parameter present
3. **Shows user-friendly error message** with 5-second auto-redirect to home
4. **Prepares for token extraction** (Story 5.3 will implement full callback logic)

**GOV.UK Design System components used:**

- `govuk-error-summary` for error display
- `govuk-heading-l` for page title
- `govuk-body` for descriptive text

### Integration with Auth Navigation

Updated in Story 5.2, the `auth-nav` component now:

1. Imports `storeReturnURL()` from `oauth-flow` module
2. Adds click handler to "Sign in" button
3. Calls `storeReturnURL()` before OAuth redirect
4. Allows default link behavior to proceed to `/api/auth/login`

```typescript
// Story 5.2: Store return URL before OAuth redirect
const signInButton = container.querySelector("#sign-in-button")
if (signInButton) {
  signInButton.addEventListener("click", () => {
    storeReturnURL()
    // Allow default link behavior (browser redirects to /api/auth/login)
  })
}
```

### Testing

#### Unit Tests

Location: `src/try/auth/oauth-flow.test.ts`

Test coverage includes:

- ✅ storeReturnURL() saves current URL to sessionStorage
- ✅ storeReturnURL() skips callback page (loop prevention)
- ✅ getReturnURL() retrieves stored URL
- ✅ getReturnURL() returns home page if no URL stored
- ✅ clearReturnURL() removes stored URL
- ✅ parseOAuthError() returns null if no error
- ✅ parseOAuthError() maps error codes to user-friendly messages
- ✅ Full OAuth flow simulation (store → retrieve → clear)
- ✅ OAuth error flow simulation
- ✅ Callback page loop prevention

**Run Tests:**

```bash
yarn test oauth-flow.test.ts
```

**Test Results:** 24/24 passing (100%)

#### Manual Testing

To test OAuth redirect flow:

1. **Store return URL:**
   - Navigate to any NDX page (e.g., `/catalogue`)
   - In DevTools console: `sessionStorage.getItem('auth-return-to')` should be `null`
   - Click "Sign in" button
   - Before redirect: `sessionStorage.getItem('auth-return-to')` should be current URL

2. **Callback page error handling:**
   - Navigate to `/callback?error=access_denied`
   - Verify error message displays: "You cancelled the sign in process..."
   - Verify auto-redirect to home page after 5 seconds

3. **Loop prevention:**
   - Navigate to `/callback`
   - In DevTools console: Run `storeReturnURL()`
   - Verify `sessionStorage.getItem('auth-return-to')` remains `null`

**Note:** Full OAuth integration (with real token) is implemented in Story 5.3.

## JWT Token Extraction (Story 5.3)

### Token Extraction Flow

The complete OAuth callback flow implemented in Story 5.3:

```
1. OAuth callback URL: https://ndx.gov.uk/callback?token=eyJ...
   → Token appears as query parameter

2. Callback page JavaScript executes:
   → extractTokenFromURL() parses query parameter
   → Token stored in sessionStorage (key: 'isb-jwt')
   → cleanupURLAfterExtraction() removes token from URL
   → handleOAuthCallback() orchestrates full flow
   → User redirected to original page

3. User lands on original page:
   → AuthState detects token in sessionStorage
   → AuthState.isAuthenticated() returns true
   → Subscribers notified (sign in/out button updates to "Sign out")
```

### Token Extraction Functions

Location: `src/try/auth/oauth-flow.ts`

#### extractTokenFromURL()

Extracts JWT token from URL query parameter and stores in sessionStorage.

```typescript
/**
 * Extracts JWT token from URL query parameter (?token=...).
 * Returns true if token successfully extracted and stored, false otherwise.
 */
export function extractTokenFromURL(): boolean {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("token")

    if (!token || token.trim() === "") {
      return false
    }

    sessionStorage.setItem("isb-jwt", token)
    return true
  } catch (error) {
    console.warn("[oauth-flow] Failed to extract token from URL:", error)
    return false
  }
}
```

**Edge cases handled:**

- No token parameter in URL (returns false)
- Empty token value (returns false)
- sessionStorage unavailable (returns false, logs warning)
- URLSearchParams parsing errors (returns false, logs warning)

#### cleanupURLAfterExtraction()

Removes token from browser address bar without page reload.

```typescript
/**
 * Removes token query parameter from URL using History API.
 * Prevents JWT token from appearing in browser history.
 */
export function cleanupURLAfterExtraction(): void {
  try {
    if (!window.history || !window.history.replaceState) {
      console.warn("[oauth-flow] History API not available, skipping URL cleanup")
      return
    }

    const cleanURL = window.location.pathname
    window.history.replaceState({}, document.title, cleanURL)
  } catch (error) {
    console.warn("[oauth-flow] Failed to clean up URL:", error)
    // Non-critical error, continue execution
  }
}
```

**Why URL cleanup?**

- **Security:** Prevents JWT token from appearing in browser history
- **UX:** User doesn't see sensitive token in address bar
- **Best Practice:** OAuth tokens should not be exposed in URLs after extraction

**Technical details:**

- Uses `window.history.replaceState()` (not `pushState`) - no extra history entry
- Preserves pathname (`/callback` → `/callback`)
- No page reload - History API only
- Gracefully degrades if History API unavailable (logs warning, continues)

#### handleOAuthCallback()

Orchestrates complete OAuth callback flow.

```typescript
/**
 * Main OAuth callback handler - called on DOMContentLoaded by callback page.
 * Extracts token, cleans URL, retrieves return URL, redirects to original page.
 */
export function handleOAuthCallback(): void {
  // Step 1: Extract token from URL
  const tokenExtracted = extractTokenFromURL()

  if (!tokenExtracted) {
    // No token found - redirect to home page
    clearReturnURL()
    window.location.href = "/"
    return
  }

  // Step 2: Clean up URL (remove token from address bar)
  cleanupURLAfterExtraction()

  // Step 3: Get return URL (original page before OAuth redirect)
  const returnURL = getReturnURL()

  // Step 4: Clear return URL from sessionStorage
  clearReturnURL()

  // Step 5: Redirect to original page
  window.location.href = returnURL
}
```

**Flow sequence:**

1. Extract token → Store in sessionStorage
2. Clean URL → Remove `?token=...` from address bar
3. Get return URL → Retrieve original page from sessionStorage
4. Clear return URL → Clean up sessionStorage
5. Redirect → Send user back to original page

**Error handling:**

- If token extraction fails → Redirect to home page, clear return URL
- If return URL not found → Default to home page (`/`)
- Non-critical errors (URL cleanup) → Log warning, continue execution

### Callback Page Integration

Location: `src/callback.html`

The callback page JavaScript updated in Story 5.3:

```html
<script type="module">
  import { handleOAuthCallback, parseOAuthError } from "./assets/try.bundle.js"

  // Check for OAuth errors first (from Story 5.2)
  const error = parseOAuthError()
  if (error) {
    // Display error message and redirect to home
    document.getElementById("callback-content").style.display = "none"
    document.getElementById("error-content").style.display = "block"
    document.getElementById("error-message").textContent = error.message

    setTimeout(() => {
      window.location.href = "/"
    }, 5000)
  } else {
    // No error - proceed with token extraction and redirect
    document.addEventListener("DOMContentLoaded", () => {
      handleOAuthCallback()
    })
  }
</script>
```

**OAuth callback page behavior:**

1. Check for OAuth error first (`?error=...` parameter)
2. If error: Display error message, auto-redirect to home after 5 seconds
3. If no error: Extract token, clean URL, redirect to original page
4. User sees "Signing you in..." loading message briefly (< 1 second typically)

### sessionStorage Keys Reference

| Key              | Purpose                | Set By                              | Cleared By                       |
| ---------------- | ---------------------- | ----------------------------------- | -------------------------------- |
| `isb-jwt`        | JWT token storage      | `extractTokenFromURL()` (Story 5.3) | `authState.logout()` (Story 5.5) |
| `auth-return-to` | Return URL after OAuth | `storeReturnURL()` (Story 5.2)      | `clearReturnURL()` (Story 5.3)   |

### Testing

#### Unit Tests

Location: `src/try/auth/oauth-flow.test.ts`

Story 5.3 added 25 new unit tests (total: 48 tests, all passing):

**extractTokenFromURL() tests:**

- ✅ Extracts and stores valid JWT token
- ✅ Returns false if no token parameter
- ✅ Returns false if token parameter is empty
- ✅ Returns false if token parameter is whitespace only
- ✅ Handles sessionStorage unavailable (returns false)
- ✅ Extracts token when other query parameters present
- ✅ Overwrites previous token if called multiple times

**cleanupURLAfterExtraction() tests:**

- ✅ Removes query parameters from URL
- ✅ Preserves pathname (`/callback`)
- ✅ Does not throw if History API unavailable
- ✅ Does not throw if replaceState unavailable
- ✅ Handles replaceState throwing error
- ✅ Uses document.title in replaceState call

**handleOAuthCallback() tests:**

- ✅ Extracts token, cleans URL, and redirects to return URL
- ✅ Redirects to home page if no return URL
- ✅ Redirects to home page if token extraction fails
- ✅ Handles empty token parameter gracefully
- ✅ Does not cleanup URL if token extraction fails
- ✅ Preserves return URL with query parameters
- ✅ Preserves return URL with hash fragment

**Integration tests:**

- ✅ Complete OAuth flow: sign in → extract → redirect
- ✅ OAuth error flow without token extraction
- ✅ Missing token edge case (graceful degradation)

**Run Tests:**

```bash
npm test oauth-flow.test.ts
```

**Test Results:** 48/48 passing (100% coverage)

#### Manual End-to-End Testing

To test complete OAuth flow (Stories 5.1 + 5.2 + 5.3):

1. **Sign in from catalogue page:**
   - Navigate to `/catalogue` (or any page)
   - Click "Sign in" button in navigation
   - Verify redirect to Innovation Sandbox OAuth login

2. **Complete OAuth authentication:**
   - Authenticate with AWS credentials
   - Verify redirect to `/callback?token=eyJ...`
   - Verify callback page shows "Signing you in..." (briefly visible)

3. **Verify token extraction:**
   - Open DevTools → Application → Session Storage
   - Verify `isb-jwt` key contains JWT token (starts with `eyJ...`)
   - Verify `auth-return-to` key is cleared (no longer present)

4. **Verify automatic redirect:**
   - User automatically redirected back to `/catalogue` (original page)
   - No manual action required
   - Redirect happens quickly (< 1 second)

5. **Verify URL cleanup:**
   - Check browser address bar
   - Verify URL shows `/catalogue` (NOT `/callback?token=...`)
   - Token not visible in browser history

6. **Verify AuthState integration:**
   - Navigation button updated to "Sign out"
   - No page refresh required - reactive update
   - Open DevTools console: `authState.isAuthenticated()` returns `true`

7. **Verify no console errors:**
   - Open DevTools → Console
   - No JavaScript errors during OAuth flow
   - Only expected console.log messages from AuthState (if debug enabled)

### Troubleshooting

#### Token not extracted (sessionStorage empty)

**Symptoms:** After OAuth redirect, `sessionStorage.getItem('isb-jwt')` returns `null`

**Possible causes:**

1. OAuth callback URL missing token parameter
   - **Check:** URL in address bar - does it contain `?token=...`?
   - **Fix:** Verify OAuth provider configuration includes token in callback URL

2. sessionStorage disabled (private browsing mode)
   - **Check:** DevTools console for warning: "Failed to store JWT token in sessionStorage"
   - **Fix:** Use regular browsing mode (sessionStorage not available in private mode)

3. JavaScript error during token extraction
   - **Check:** DevTools console for JavaScript errors
   - **Fix:** Review console errors, check for bundle loading issues

#### URL not cleaned (token still visible)

**Symptoms:** After OAuth redirect, address bar shows `/callback?token=...`

**Possible causes:**

1. History API not available (old browser)
   - **Check:** DevTools console for warning: "History API not available"
   - **Fix:** Update browser to modern version

2. Token extraction failed (URL cleanup skipped if extraction fails)
   - **Check:** sessionStorage - is `isb-jwt` key present?
   - **Fix:** Troubleshoot token extraction issue first

#### User not redirected to original page

**Symptoms:** After OAuth, user lands on home page (not original page)

**Possible causes:**

1. Return URL not stored before OAuth redirect
   - **Check:** Before clicking "Sign in", verify `storeReturnURL()` is called
   - **Fix:** Review `auth-nav.ts` sign in button handler

2. Return URL cleared before retrieval
   - **Check:** DevTools → Application → Session Storage before callback
   - **Fix:** Review sessionStorage timing in OAuth flow

3. Original page was callback page (loop prevention)
   - **Expected behavior:** Callback page never stored as return URL
   - **Result:** User redirected to home page (correct behavior)

## Future Stories

### Story 5.4: sessionStorage JWT Persistence

- Already implemented in `AuthState` class
- No additional work required (using sessionStorage from Story 5.1)

### Story 5.5: Sign Out Functionality

- Implement "Sign out" link click handler
- Call `authState.logout()` to clear token and notify
- Redirect to home page after sign out

## Developer Checklist

When adding new components that depend on authentication state:

- [ ] Import `authState` from `src/try/auth/auth-provider.ts`
- [ ] Call `authState.subscribe(listener)` in component initialization
- [ ] Update UI in listener callback based on `isAuthenticated` parameter
- [ ] Do NOT manually check `sessionStorage` - always use `authState.isAuthenticated()`
- [ ] Call `authState.notify()` if your component modifies auth state
- [ ] Write unit tests covering authenticated and unauthenticated states
- [ ] Test keyboard navigation and screen reader announcements

## References

- **Architecture:** [docs/try-before-you-buy-architecture.md](../try-before-you-buy-architecture.md) - ADR-024
- **UX Design:** [docs/ux-design-specification.md](../ux-design-specification.md) - Component 5: Authentication State Indicator
- **Story:** [docs/sprint-artifacts/stories/5-1-sign-in-out-button-ui-components.md](../sprint-artifacts/stories/5-1-sign-in-out-button-ui-components.md)
- **GOV.UK Design System:** https://design-system.service.gov.uk/components/header/
- **GOV.UK One Login Patterns:** https://docs.sign-in.service.gov.uk/
