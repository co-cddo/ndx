# Epic 5: Authentication Foundation

**Goal:** Government users can sign in/out of NDX with persistent sessions, enabling access to personalized Try features

**User Value:** Users can authenticate via Innovation Sandbox OAuth, sessions persist across browser tabs, enabling protected API calls

**FRs Covered:** FR-TRY-1 through FR-TRY-17, FR-TRY-24 (19 FRs)

---

## Story 5.1: Sign In/Out Button UI Components

As a government user,
I want to see sign in/out buttons in the NDX navigation,
So that I can authenticate to access Try features.

**Acceptance Criteria:**

**Given** I am on any NDX page
**When** I am not authenticated (no `isb-jwt` in sessionStorage)
**Then** I see a "Sign in" button in the top-right navigation area
**And** the button uses GOV.UK Design System button styling (`govukButton` macro)
**And** the button has accessible text: "Sign in"

**When** I am authenticated (`isb-jwt` exists in sessionStorage)
**Then** I see a "Sign out" button in the top-right navigation area
**And** the button uses GOV.UK Design System button styling (`govukButton` macro)
**And** the button has accessible text: "Sign out"

**And** sign in/out buttons are:
- Keyboard navigable (tab index)
- Screen reader accessible (ARIA labels)
- Responsive on mobile (visible in mobile nav)
- Consistent placement across all pages

**Prerequisites:** Epic 4 complete (local dev environment ready)

**Technical Notes:**
- Check sessionStorage client-side: `sessionStorage.getItem('isb-jwt')`
- Use GOV.UK Design System button macro (already integrated in NDX)
- Nunjucks template: Check JWT existence in layout template
- FR-TRY-11, FR-TRY-12, FR-TRY-15 covered
- Accessibility: FR-TRY-70, FR-TRY-71 (keyboard navigation, focus indicators)

**Architecture Context:**
- **ADR-024:** Authentication state management using event-driven pattern
  - Implement `AuthState` class with subscribe/notify pattern
  - Multiple components react to auth state changes (nav links, try buttons, /try page)
  - Reactive authentication state prevents UI inconsistencies
- **Module:** `src/try/auth/auth-provider.ts` - Authentication interface & implementation
- **Module:** `src/try/auth/session-storage.ts` - JWT token storage utilities

**UX Design Context:**
- **Component:** Authentication State Indicator (UX Section 6.2 Component 5)
- **Placement:** Top-right navigation in GOV.UK header (consistent across all pages)
- **Signed Out:** "Sign in" link visible (blue underlined link, GOV.UK standard)
- **Signed In:** "Sign out" link visible, optionally with username/email displayed
- **Touch Targets:** Minimum 44x44px (WCAG 2.2 AAA) - links use padding to expand clickable area
- **User Journey:** Authentication (UX Section 5.1 Journey 1)

---

## Story 5.2: Sign In OAuth Redirect Flow

As a government user,
I want to be redirected to Innovation Sandbox OAuth when I click "Sign in",
So that I can authenticate using AWS credentials.

**Acceptance Criteria:**

**Given** I am on any NDX page and not authenticated
**When** I click the "Sign in" button
**Then** the browser redirects to `/api/auth/login`
**And** the Innovation Sandbox API handles OAuth redirect
**And** I am redirected to AWS OAuth login page
**And** after successful AWS authentication, I am redirected back to NDX with JWT token in URL query parameter

**And** the redirect flow preserves:
- Original page context (return URL if needed)
- HTTPS security
- No errors logged in console

**Prerequisites:** Story 5.1 (Sign in button exists)

**Technical Notes:**
- Sign in button href: `/api/auth/login`
- Innovation Sandbox OAuth endpoint handles redirect automatically
- OAuth redirects to callback URL with token
- FR-TRY-2, FR-TRY-13 covered
- Production: Cross-gov SSO replaces AWS OAuth (zero NDX code changes)
- OAuth flow is external to NDX (handled by Innovation Sandbox backend)

**Architecture Context:**
- **ADR-023:** OAuth callback page pattern
  - Dedicated `/callback` page handles OAuth redirect (not home page)
  - Callback page extracts token, stores in sessionStorage, then redirects to intended destination
  - Separates OAuth mechanics from main application flow
- **ADR-017:** OAuth 2.0 with JWT tokens (Innovation Sandbox standard)
  - JWT returned as URL query parameter: `?token=eyJ...`
  - Token format: JWT with user claims (email, name, exp)
  - Production cross-gov SSO maintains OAuth 2.0 compatibility (no code changes)

**UX Design Context:**
- **User Journey:** Authentication Sign In (UX Section 5.1 Journey 1, Steps 1-2)
- **Step 1:** User clicks "Sign in" → Redirect to `/api/auth/login`
- **Step 2:** OAuth redirect to Innovation Sandbox login page (external to NDX)
- **After auth:** OAuth provider redirects back to NDX callback URL with token in query param
- **Loading state:** Brief "Signing you in..." message during token extraction (UX Section 7.3)

---

## Story 5.3: JWT Token Extraction from URL

As a developer,
I want to extract JWT token from URL query parameters after OAuth redirect,
So that I can store the token for authenticated API calls.

**Acceptance Criteria:**

**Given** I am redirected back to NDX after OAuth authentication
**When** the URL contains query parameter with JWT token (e.g., `?token=eyJ...`)
**Then** client-side JavaScript extracts token from URL:

```javascript
function extractTokenFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {
    // Store token in sessionStorage
    sessionStorage.setItem('isb-jwt', token);

    // Clean up URL (remove token from query params)
    const cleanURL = window.location.pathname;
    window.history.replaceState({}, document.title, cleanURL);

    return true;
  }

  return false;
}

// Run on page load
document.addEventListener('DOMContentLoaded', extractTokenFromURL);
```

**And** token extraction runs on every page load
**And** URL is cleaned after extraction (token not visible in browser address bar)
**And** token stored in sessionStorage with key `isb-jwt`
**And** sessionStorage persists across browser tabs (same session)
**And** sessionStorage does NOT persist across browser restarts

**Prerequisites:** Story 5.2 (OAuth redirect flow)

**Technical Notes:**
- URLSearchParams API for query parameter parsing
- `window.history.replaceState()` removes token from URL without reload
- sessionStorage vs localStorage: sessionStorage preferred (FR-TRY-8, FR-TRY-9)
- FR-TRY-3, FR-TRY-4, FR-TRY-5 covered
- Token cleanup prevents token exposure in browser history

**Architecture Context:**
- **ADR-023:** OAuth callback page pattern implementation
  - `/callback` page dedicated to token extraction (not mixed with main page logic)
  - Extract token → Store in sessionStorage → Clean URL → Redirect to original destination
  - Callback page has minimal UI (just loading indicator)
- **ADR-016:** sessionStorage for JWT tokens (NOT localStorage, NOT cookies)
  - sessionStorage clears on browser close (security benefit)
  - sessionStorage accessible across tabs (UX convenience)
  - Key: `isb-jwt` (consistent across all auth modules)
- **Security:** NFR-TRY-SEC-6 (No sensitive data in URL after extraction)
  - `window.history.replaceState()` removes token from browser history
  - Token never logged to console or analytics

**UX Design Context:**
- **User Journey:** Authentication Sign In (UX Section 5.1 Journey 1, Step 3)
- **Token extraction:** Brief loading indicator "Signing you in..."
- **URL cleanup:** Token removed from address bar before user sees final page
- **Session persistence:** UX Section 7.1 - sessionStorage choice for security + convenience balance

---

## Story 5.4: sessionStorage JWT Persistence

As a government user,
I want my authentication to persist across browser tabs,
So that I don't need to sign in again when opening NDX in a new tab.

**Acceptance Criteria:**

**Given** I have signed in and JWT token is in sessionStorage
**When** I open NDX in a new browser tab
**Then** I am still authenticated (sessionStorage accessible in new tab)
**And** I see "Sign out" button (not "Sign in")
**And** I can make authenticated API calls without re-authenticating

**Given** I close all NDX tabs and browser
**When** I reopen browser and navigate to NDX
**Then** I am NOT authenticated (sessionStorage cleared)
**And** I see "Sign in" button
**And** I need to sign in again to access Try features

**Prerequisites:** Story 5.3 (Token extraction implemented)

**Technical Notes:**
- sessionStorage behavior: persists across tabs, NOT across browser restarts
- This is DESIRED behavior per PRD (temporary authentication)
- Production cross-gov SSO may have different session persistence (handled at SSO layer)
- FR-TRY-8, FR-TRY-9 covered
- No code changes needed (sessionStorage API provides this behavior automatically)
- Validate behavior in browser DevTools → Application → Session Storage

**Architecture Context:**
- **ADR-024:** Authentication state management with event-driven pattern
  - AuthState notifies all subscribers when auth status changes (login, logout, token refresh)
  - Components subscribe to auth state changes: nav links, try buttons, /try page
  - Reactive pattern ensures UI consistency across tabs
- **ADR-016:** sessionStorage persistence behavior (security vs UX trade-off)
  - Persists across tabs: User doesn't re-auth when opening new tab (good UX)
  - Clears on browser close: Shared device security (government requirement)
  - No server-side session needed: Stateless JWT approach (scalability)

**UX Design Context:**
- **Pattern:** sessionStorage for JWT token (UX Section 7.1 Authentication State Management)
- **User Expectation:** "Sign in once, use across tabs" (multi-tab workflow support)
- **Security Consideration:** Browser close = automatic sign out (government shared devices)
- **Testing:** Validate in DevTools - open new tab, verify "Sign out" visible without re-auth

---

## Story 5.5: Sign Out Functionality

As a government user,
I want to sign out of NDX,
So that I can end my session and clear my authentication.

**Acceptance Criteria:**

**Given** I am authenticated (JWT in sessionStorage)
**When** I click the "Sign out" button
**Then** client-side JavaScript clears sessionStorage:

```javascript
function signOut() {
  // Clear JWT token
  sessionStorage.removeItem('isb-jwt');

  // Redirect to home page
  window.location.href = '/';
}

// Attach to sign out button
document.getElementById('sign-out-button').addEventListener('click', signOut);
```

**And** I am redirected to home page (`/`)
**And** I see "Sign in" button (not "Sign out")
**And** I cannot access authenticated features (/try page shows unauthenticated state)
**And** subsequent API calls do NOT include Authorization header

**Prerequisites:** Story 5.4 (sessionStorage persistence validated)

**Technical Notes:**
- `sessionStorage.removeItem('isb-jwt')` clears token
- Redirect to home prevents user confusion (clear state transition)
- FR-TRY-7, FR-TRY-14 covered
- No server-side logout needed (JWT stateless, expires automatically)
- Production SSO may require SSO logout endpoint call (handle in future iteration)

**Architecture Context:**
- **ADR-024:** Authentication state management with event-driven notifications
  - Sign out triggers AuthState.notify() to all subscribers
  - Nav links, try buttons, /try page react to sign out event
  - Ensures UI updates consistently across all components
- **Module:** `src/try/auth/auth-provider.ts` - `signOut()` method
  - Clear sessionStorage
  - Notify all auth state subscribers
  - Redirect to home page
- **Future:** ADR-017 Production cross-gov SSO logout endpoint (abstracted in auth-provider interface)

**UX Design Context:**
- **User Journey:** Authentication Sign Out (UX Section 5.1 Journey 1 - Sign Out Flow)
- **Step 1:** User clicks "Sign out" link
- **Step 2:** Clear JWT from sessionStorage
- **Step 3:** Redirect to home page (`/`)
- **Step 4:** Navigation updates to show "Sign in" link
- **Success State:** No explicit confirmation (brief redirect is confirmation)
- **Pattern:** Brief confirmations, then redirect (UX Section 7.4 Success Notification Strategy)

---

## Story 5.6: API Authorization Header Injection

As a developer,
I want all Innovation Sandbox API requests to include JWT Authorization header,
So that backend can authenticate requests and return user-specific data.

**Acceptance Criteria:**

**Given** I have JWT token in sessionStorage
**When** I make API request to `/api/*` endpoints
**Then** the request includes Authorization header:

```javascript
function callISBAPI(endpoint, options = {}) {
  const token = sessionStorage.getItem('isb-jwt');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(endpoint, {
    ...options,
    headers
  });
}

// Example usage
callISBAPI('/api/leases?userEmail=user@example.com')
  .then(response => response.json())
  .then(data => console.log(data));
```

**And** API helper function handles:
- Adding Authorization header when token exists
- NOT adding header when token missing (unauthenticated requests)
- Preserving other headers passed in options
- Bearer token format: `Bearer {jwt}`

**And** all Try feature API calls use this helper function
**And** console.log shows Authorization header in network requests (DevTools)

**Prerequisites:** Story 5.5 (Sign out functionality)

**Technical Notes:**
- Bearer token format per OAuth 2.0 standard
- FR-TRY-6, FR-TRY-10 covered
- Centralized helper function prevents duplication
- Innovation Sandbox backend validates JWT and returns 401 if invalid/expired
- Story 5.8 will handle 401 responses (automatic re-authentication)

**Architecture Context:**
- **ADR-021:** Centralized API client with authentication interceptor
  - Single `api-client.ts` module handles all Innovation Sandbox API calls
  - Automatic Authorization header injection (DRY principle)
  - Automatic 401 handling (Story 5.8 will implement)
  - Type-safe API responses with TypeScript interfaces
- **Module:** `src/try/api/api-client.ts` - Centralized API client
- **Module:** `src/try/api/types.ts` - API request/response types
- **Security:** NFR-TRY-SEC-2 (HTTPS only), NFR-TRY-SEC-6 (secure token transmission)

**UX Design Context:**
- **Pattern:** All API calls use centralized client (prevents authorization bugs)
- **Security:** Bearer token never logged to console or exposed in UI (UX Section 7.1)
- **Error Handling:** 401 responses trigger automatic re-authentication (seamless UX)

---

## Story 5.7: Authentication Status Check API

As a developer,
I want to call `/api/auth/login/status` to check authentication status,
So that I can verify token validity and retrieve user session data.

**Acceptance Criteria:**

**Given** I have JWT token in sessionStorage
**When** I call `GET /api/auth/login/status` with Authorization header
**Then** the API returns user session data:

```json
{
  "email": "user@example.gov.uk",
  "displayName": "Jane Smith",
  "userName": "jane.smith",
  "roles": ["user"]
}
```

**And** client-side code parses response:

```javascript
async function checkAuthStatus() {
  try {
    const response = await callISBAPI('/api/auth/login/status');

    if (response.ok) {
      const userData = await response.json();
      return {
        authenticated: true,
        user: userData
      };
    } else if (response.status === 401) {
      // Token invalid or expired
      return { authenticated: false };
    } else {
      console.error('Auth status check failed:', response.status);
      return { authenticated: false };
    }
  } catch (error) {
    console.error('Auth status check error:', error);
    return { authenticated: false };
  }
}
```

**And** function returns object with:
- `authenticated: true/false`
- `user: { email, displayName, userName, roles }` (if authenticated)

**And** 401 responses handled gracefully (return authenticated: false)
**And** network errors handled gracefully

**Prerequisites:** Story 5.6 (Authorization header injection)

**Technical Notes:**
- FR-TRY-16, FR-TRY-17 covered
- Use this to validate token before showing authenticated UI
- Response data used for personalization (display name in UI)
- 401 handling preparation for Story 5.8 (automatic re-authentication)

**Architecture Context:**
- **ADR-021:** API client `checkAuthStatus()` method
  - Returns typed response: `{ authenticated: boolean; user?: UserData }`
  - Used by AuthState to validate token on page load
  - Graceful degradation on network errors (assume unauthenticated)
- **Module:** `src/try/api/types.ts` - `UserData` interface (email, displayName, userName, roles)
- **API Endpoint:** `GET /api/auth/login/status` (Innovation Sandbox backend)

**UX Design Context:**
- **Usage:** Validate token before showing authenticated UI (prevents flash of wrong state)
- **User Data:** Display user email/name in navigation (optional - UX Section 6.2 Component 5)
- **Graceful Failure:** Network errors don't break page - show unauthenticated state

---

## Story 5.8: 401 Unauthorized Response Handling

As a government user,
I want to be automatically redirected to sign in when my token expires,
So that I can re-authenticate without manual intervention.

**Acceptance Criteria:**

**Given** I have expired or invalid JWT token in sessionStorage
**When** I make API request that returns 401 Unauthorized
**Then** client-side code:
1. Clears sessionStorage (remove invalid token)
2. Redirects to `/api/auth/login` (OAuth flow)

```javascript
function callISBAPI(endpoint, options = {}) {
  const token = sessionStorage.getItem('isb-jwt');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(endpoint, {
    ...options,
    headers
  })
  .then(response => {
    // Handle 401 Unauthorized
    if (response.status === 401) {
      sessionStorage.removeItem('isb-jwt');
      window.location.href = '/api/auth/login';
      throw new Error('Unauthorized - redirecting to login');
    }
    return response;
  });
}
```

**And** 401 handling is automatic (no user action required)
**And** user redirected to OAuth login
**And** after re-authentication, user returned to original page
**And** subsequent API calls succeed with new token

**Prerequisites:** Story 5.7 (Auth status check API)

**Technical Notes:**
- FR-TRY-23, FR-TRY-24 covered
- Global 401 handler in API helper function (DRY)
- Clear invalid token prevents infinite loops
- Redirect to `/api/auth/login` initiates OAuth flow
- OAuth callback returns to NDX with new token
- Session continuity: User doesn't lose context (same page reload)

**Architecture Context:**
- **ADR-021:** Centralized 401 handling in API client
  - All API calls automatically handle 401 responses
  - Clear invalid token → Redirect to OAuth → Return to original page
  - Prevents scattered 401 handling logic across codebase
- **ADR-024:** AuthState notifies subscribers of auth state change on 401
  - Nav links update to "Sign in"
  - Try buttons disabled (if visible mid-redirect)
  - Seamless user experience (no stale UI)

**UX Design Context:**
- **User Journey:** Error Handling Flow #2 (UX Section 5.1 Journey 5)
- **Automatic Re-authentication:** "Your session has expired. Signing you in again..."
- **No User Action Required:** Seamless redirect → re-auth → return to original page
- **Recovery Path:** Automatic (UX Section 7.2 Error Message Strategy)
- **Pattern:** Calm Through Predictability (UX Principle 5 - no surprises)

---

## Story 5.9: Empty State UI for Unauthenticated /try Page

As a government user,
I want to see a helpful message when I visit /try page unauthenticated,
So that I know I need to sign in to access Try features.

**Acceptance Criteria:**

**Given** I am NOT authenticated (no JWT in sessionStorage)
**When** I navigate to `/try` page
**Then** I see empty state message:
- Heading: "Sign in to view your try sessions"
- Body text: "You need to sign in with your Innovation Sandbox account to request and manage AWS sandbox environments."
- "Sign in" button (GOV.UK Design System)

**And** clicking "Sign in" button redirects to `/api/auth/login`
**And** after successful authentication, I am returned to `/try` page
**And** I see my try sessions (not empty state)

**And** empty state uses GOV.UK Design System components:
- Heading: `govukHeading` (size: l)
- Body text: `govukBody`
- Button: `govukButton` (isStartButton: true)

**Prerequisites:** Story 5.8 (401 handling implemented)

**Technical Notes:**
- FR-TRY-26, FR-TRY-27 covered
- Template logic: Check sessionStorage in client-side JavaScript or server-side (if rendering)
- Empty state UX best practice: Clear call-to-action
- Accessibility: Empty state fully keyboard navigable
- Return URL preservation: OAuth callback returns to `/try` page

**Architecture Context:**
- **Module:** `src/try/pages/try-page.ts` - /try page component
  - Checks AuthState on page load
  - Renders empty state if unauthenticated
  - Renders sessions table if authenticated
- **ADR-024:** AuthState subscription pattern
  - /try page subscribes to auth state changes
  - Automatically updates when user signs in (no manual reload needed)

**UX Design Context:**
- **User Journey:** Try Sessions Dashboard (UX Section 5.1 Journey 3 - Branch A: User NOT authenticated)
- **Empty State:** "Sign in to view your try sessions" (UX Section 5.1 Journey 3, Step 1)
- **CTA Button:** "Sign in" button (GOV.UK start button, green)
- **After Sign In:** Returns to /try page → Shows sessions
- **Pattern:** Empty states provide clear next action (UX best practice)

---

## Story 5.10: Automated Accessibility Tests for Auth UI

As a developer,
I want automated accessibility tests for sign in/out UI,
So that authentication components meet WCAG 2.2 AA standards.

**Acceptance Criteria:**

**Given** sign in/out buttons and /try empty state exist
**When** I run automated accessibility tests
**Then** tests validate:

**Test 1: Keyboard Navigation**
- Sign in/out buttons focusable via Tab key
- Enter key activates buttons
- Focus indicators visible (WCAG 2.2 AA contrast ratio)

**Test 2: Screen Reader Accessibility**
- Buttons have accessible labels
- Empty state heading announced correctly
- Button purpose clear from label alone

**Test 3: Color Contrast**
- Button text meets WCAG 2.2 AA contrast ratio (4.5:1)
- Focus indicators meet contrast requirements
- Empty state text readable

**Test 4: ARIA Compliance**
- Buttons have appropriate roles
- No ARIA violations detected

**And** tests run in CI pipeline (fail build on violations)
**And** tests use `axe-core` or `pa11y` for automated scanning
**And** tests cover all authentication UI components

**Prerequisites:** Story 5.9 (Empty state UI complete)

**Technical Notes:**
- Automated testing per Pre-mortem preventive measure #3 (user acceptance)
- Use axe-core for automated WCAG validation
- CI integration prevents accessibility regressions
- FR-TRY-70, FR-TRY-71, FR-TRY-76 partially covered (full coverage in Epic 8)
- Manual testing still required (keyboard navigation, screen reader testing)
- Epic 8 will provide comprehensive accessibility audit

**Architecture Context:**
- **ADR-037:** Mandatory accessibility testing gate (enforced in Epic 8, started in Epic 5)
  - Cannot merge PR without passing Pa11y tests
  - Prevents accessibility regressions from Day 1
- **ADR-004:** Pa11y integration for automated WCAG 2.2 AA validation
  - Zero violations allowed for AA compliance
  - Tests run in CI on every commit
- **Testing:** `test/accessibility/auth-a11y.test.ts` - Auth component accessibility tests

**UX Design Context:**
- **WCAG 2.2 Compliance:** Section 8.1 - Target AA minimum, AAA where feasible
- **Keyboard Navigation:** All auth components keyboard accessible (UX Section 8.3)
- **Screen Reader:** ARIA labels, focus management, accessible names (UX Principle 6)
- **Epic 8:** Comprehensive accessibility audit with government specialist sign-off (ADR-005)

---
