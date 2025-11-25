/**
 * OAuth Flow Utilities
 *
 * Manages OAuth redirect flow for Innovation Sandbox authentication:
 * - Return URL storage/retrieval for post-authentication redirect
 * - OAuth error parsing and user-friendly error messages
 *
 * Key Design Decisions:
 * - Uses sessionStorage for return URL (temporary, clears on browser close)
 * - Prevents callback page from being stored as return URL (avoids redirect loops)
 * - Maps OAuth error codes to government-friendly error messages
 * - Defensive programming: handles sessionStorage unavailability gracefully
 *
 * @module oauth-flow
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-023|ADR-023: OAuth Callback Page Pattern}
 */

/**
 * sessionStorage key for storing return URL during OAuth flow.
 * @private
 * @constant
 */
const RETURN_URL_KEY = 'auth-return-to';

/**
 * Callback page path (must not be stored as return URL to avoid loops).
 * @private
 * @constant
 */
const CALLBACK_PATH = '/callback';

/**
 * OAuth error details structure.
 */
export interface OAuthError {
  /** OAuth error code from URL query parameter */
  code: string;
  /** User-friendly error message in plain language */
  message: string;
}

/**
 * Stores current page URL for post-OAuth redirect.
 *
 * This function should be called BEFORE initiating OAuth redirect (when user clicks "Sign in").
 * After OAuth completes, the callback page can retrieve this URL and redirect the user back.
 *
 * Skips storage if:
 * - Already on callback page (prevents redirect loops)
 * - sessionStorage is unavailable (private browsing mode)
 *
 * @example
 * ```typescript
 * // In auth-nav.ts sign in button handler
 * signInButton.addEventListener('click', () => {
 *   storeReturnURL(); // Save current page
 *   // Browser then redirects to /api/auth/login
 * });
 * ```
 */
export function storeReturnURL(): void {
  // Prevent callback page from being stored as return URL (infinite loop protection)
  if (window.location.pathname === CALLBACK_PATH || window.location.pathname === `${CALLBACK_PATH}.html`) {
    return;
  }

  // Defensive programming: Check sessionStorage availability
  if (typeof sessionStorage === 'undefined') {
    console.warn('[oauth-flow] sessionStorage not available, return URL not stored');
    return;
  }

  const returnURL = window.location.href;

  try {
    sessionStorage.setItem(RETURN_URL_KEY, returnURL);
  } catch (error) {
    console.warn('[oauth-flow] Failed to store return URL:', error);
  }
}

/**
 * Retrieves stored return URL for post-OAuth redirect.
 *
 * Returns home page ('/') if:
 * - No return URL stored in sessionStorage
 * - sessionStorage is unavailable
 * - sessionStorage read fails
 *
 * @returns {string} Return URL (either stored URL or home page fallback)
 *
 * @example
 * ```typescript
 * // In callback page JavaScript (Story 5.3)
 * const returnURL = getReturnURL();
 * window.location.href = returnURL; // Redirect to original page
 * ```
 */
export function getReturnURL(): string {
  // Defensive programming: Check sessionStorage availability
  if (typeof sessionStorage === 'undefined') {
    console.warn('[oauth-flow] sessionStorage not available, returning home page');
    return '/';
  }

  try {
    const returnURL = sessionStorage.getItem(RETURN_URL_KEY);
    return returnURL || '/';
  } catch (error) {
    console.warn('[oauth-flow] Failed to retrieve return URL:', error);
    return '/';
  }
}

/**
 * Clears stored return URL from sessionStorage.
 *
 * This should be called after successfully redirecting to the return URL
 * to clean up sessionStorage.
 *
 * @example
 * ```typescript
 * // In callback page JavaScript (Story 5.3)
 * const returnURL = getReturnURL();
 * clearReturnURL(); // Clean up before redirect
 * window.location.href = returnURL;
 * ```
 */
export function clearReturnURL(): void {
  // Defensive programming: Check sessionStorage availability
  if (typeof sessionStorage === 'undefined') {
    console.warn('[oauth-flow] sessionStorage not available, cannot clear return URL');
    return;
  }

  try {
    sessionStorage.removeItem(RETURN_URL_KEY);
  } catch (error) {
    console.warn('[oauth-flow] Failed to clear return URL:', error);
  }
}

/**
 * Parses OAuth error from URL query parameters.
 *
 * Checks for 'error' query parameter in current page URL and maps
 * OAuth error codes to user-friendly messages suitable for government users.
 *
 * Returns null if no error parameter found (successful OAuth flow).
 *
 * Supported OAuth error codes:
 * - access_denied: User cancelled sign in
 * - invalid_request: Problem with OAuth request
 * - server_error: Authentication service unavailable
 * - (any other): Generic error message
 *
 * @returns {OAuthError | null} Error details or null if no error
 *
 * @example
 * ```typescript
 * // In callback page JavaScript
 * const error = parseOAuthError();
 * if (error) {
 *   displayErrorMessage(error.message);
 * } else {
 *   // Proceed with token extraction
 * }
 * ```
 */
export function parseOAuthError(): OAuthError | null {
  const urlParams = new URLSearchParams(window.location.search);
  const errorCode = urlParams.get('error');

  if (!errorCode) {
    return null;
  }

  // Map OAuth error codes to user-friendly messages
  // These messages follow GOV.UK Design System content guidance:
  // - Plain language (no technical jargon)
  // - Clear action guidance
  // - Calm tone (don't alarm users)
  const errorMessages: Record<string, string> = {
    access_denied:
      'You cancelled the sign in process. Please try again if you want to access Try features.',
    invalid_request:
      'There was a problem with the sign in request. Please try again.',
    server_error:
      'The authentication service is temporarily unavailable. Please try again in a few minutes.',
  };

  const message =
    errorMessages[errorCode] ||
    'An error occurred during sign in. Please try again.';

  return { code: errorCode, message };
}

/**
 * sessionStorage key for JWT token storage.
 * @private
 * @constant
 */
const JWT_TOKEN_KEY = 'isb-jwt';

/**
 * Extracts JWT token from URL query parameter and stores in sessionStorage.
 *
 * This function is called automatically by the OAuth callback page when the user
 * is redirected back from the OAuth provider. It parses the `?token=...` query
 * parameter, validates the token exists, and stores it in sessionStorage for
 * subsequent authenticated API calls.
 *
 * Returns false if:
 * - No token parameter in URL
 * - Token parameter is empty/whitespace
 * - sessionStorage is unavailable (private browsing mode)
 * - sessionStorage.setItem() throws error (quota exceeded, etc.)
 *
 * @returns {boolean} True if token was extracted and stored successfully, false otherwise
 *
 * @example
 * ```typescript
 * // Callback URL: https://ndx.gov.uk/callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * const success = extractTokenFromURL();
 * // success === true
 * // sessionStorage.getItem('isb-jwt') === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 * ```
 */
export function extractTokenFromURL(): boolean {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // No token parameter or empty value
    if (!token || token.trim() === '') {
      return false;
    }

    // Store token in sessionStorage
    try {
      sessionStorage.setItem(JWT_TOKEN_KEY, token);
      return true;
    } catch (storageError) {
      console.warn('[oauth-flow] Failed to store JWT token in sessionStorage:', storageError);
      return false;
    }
  } catch (error) {
    console.warn('[oauth-flow] Failed to extract token from URL:', error);
    return false;
  }
}

/**
 * Removes token query parameter from URL without causing page reload.
 *
 * Uses window.history.replaceState() to clean the browser address bar after
 * token extraction, preventing the JWT token from appearing in browser history.
 * This is a security measure to avoid token exposure if the user shares their
 * browser history or uses the back button.
 *
 * Skips cleanup if:
 * - History API not available (old browsers)
 * - window.history.replaceState() throws error
 *
 * @example
 * ```typescript
 * // Before: https://ndx.gov.uk/callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * cleanupURLAfterExtraction();
 * // After:  https://ndx.gov.uk/callback
 * // (no page reload, just URL change)
 * ```
 */
export function cleanupURLAfterExtraction(): void {
  try {
    // Check if history API is available
    if (!window.history || !window.history.replaceState) {
      console.warn('[oauth-flow] History API not available, skipping URL cleanup');
      return;
    }

    // Remove query parameters, preserve pathname
    const cleanURL = window.location.pathname;
    window.history.replaceState({}, document.title, cleanURL);
  } catch (error) {
    console.warn('[oauth-flow] Failed to clean up URL after token extraction:', error);
    // Non-critical error, continue execution
  }
}

/**
 * Handles OAuth callback flow: extract token, clean URL, redirect to original page.
 *
 * This is the main orchestrator for the OAuth callback page. It:
 * 1. Extracts JWT token from URL and stores in sessionStorage
 * 2. Cleans up URL to remove token from browser history
 * 3. Retrieves return URL (original page before OAuth redirect)
 * 4. Clears return URL from sessionStorage
 * 5. Redirects user back to original page (or home page if no return URL)
 *
 * If token extraction fails (no token parameter, sessionStorage unavailable),
 * redirects to home page and clears return URL.
 *
 * Called automatically on DOMContentLoaded by the callback page.
 *
 * @example
 * ```typescript
 * // Callback URL: https://ndx.gov.uk/callback?token=eyJ...
 * // sessionStorage['auth-return-to'] = 'https://ndx.gov.uk/catalogue'
 * handleOAuthCallback();
 * // Result:
 * // - Token stored in sessionStorage['isb-jwt']
 * // - URL cleaned to https://ndx.gov.uk/callback
 * // - Redirect to https://ndx.gov.uk/catalogue
 * ```
 */
export function handleOAuthCallback(): void {
  console.log('[handleOAuthCallback] Starting OAuth callback handling');

  // Step 1: Extract token from URL
  const tokenExtracted = extractTokenFromURL();
  console.log('[handleOAuthCallback] Token extracted:', tokenExtracted);

  if (!tokenExtracted) {
    // No token found (possibly OAuth error already handled by parseOAuthError)
    // Redirect to home page and clear return URL
    console.log('[handleOAuthCallback] No token - redirecting to home');
    clearReturnURL();
    window.location.href = '/';
    return;
  }

  // Step 2: Clean up URL (remove token from address bar)
  cleanupURLAfterExtraction();
  console.log('[handleOAuthCallback] URL cleaned, current URL:', window.location.href);

  // Step 3: Get return URL (original page before OAuth redirect)
  const returnURL = getReturnURL();
  console.log('[handleOAuthCallback] Retrieved return URL:', returnURL);

  // Step 4: Clear return URL from sessionStorage
  clearReturnURL();

  // Step 5: Redirect to original page
  // Use setTimeout to ensure the redirect happens after current execution context completes
  console.log('[handleOAuthCallback] Scheduling redirect to:', returnURL);
  setTimeout(() => {
    console.log('[handleOAuthCallback] Executing redirect now...');
    window.location.href = returnURL;
  }, 0);
}
