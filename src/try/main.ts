/**
 * Try Before You Buy - Main JavaScript Entry Point
 *
 * This is the main entry point for all Try feature client-side JavaScript.
 * Initializes components and sets up event listeners on page load.
 *
 * Story 5.1: Initializes authentication navigation (sign in/out buttons)
 * Future stories will add additional initialization here.
 *
 * @module main
 */

// GOV.UK Frontend initialization (replaces plugin's default application.js)
// @ts-expect-error - govuk-frontend doesn't have TypeScript types
import { initAll as GOVUKFrontend } from "govuk-frontend"
// Import from plugin's source directly (not in package exports)
// @ts-expect-error - direct file import
import { SearchElement } from "../../node_modules/@x-govuk/govuk-eleventy-plugin/src/components/search/search.js"

// Register custom elements used by govuk-eleventy-plugin
customElements.define("app-search", SearchElement)

import { initAuthNav } from "./ui/auth-nav"
import { initTryPage } from "./ui/try-page"
import { initTryButton, handleTryButtonClickDelegated } from "./ui/try-button"
import { initTryButtonText } from "./ui/try-button-text"
import { handleOAuthCallback, parseOAuthError } from "./auth/oauth-flow"

// CRITICAL: Set up delegated event handler immediately at module parse time.
// This ensures try button clicks are captured even if init() hasn't run yet.
// Uses capturing phase to intercept events before they bubble.
document.addEventListener(
  "click",
  (event) => {
    const target = event.target as Element
    const tryButton = target.closest("[data-try-id]")
    if (tryButton) {
      handleTryButtonClickDelegated(event, tryButton as HTMLElement)
    }
  },
  { capture: true },
)

// Export OAuth callback functions for use by callback page (Story 5.2, 5.3)
export { handleOAuthCallback, parseOAuthError, extractTokenFromURL, cleanupURLAfterExtraction } from "./auth/oauth-flow"

/**
 * Handle OAuth callback parameters on any page.
 *
 * The OAuth flow redirects back to the homepage with ?token= or ?error= parameters.
 * This function checks for these parameters and handles them appropriately.
 *
 * IMPORTANT: This function only takes action when OAuth-related parameters are present.
 * It does NOT redirect or modify behavior for normal page loads without these parameters.
 *
 * Story 5.3: JWT token extraction from URL
 */
function handlePageOAuthCallback(): void {
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get("token")
  const hasError = urlParams.has("error")

  // Only process if there's actually a token with a non-empty value
  if (token && token.trim() !== "") {
    // This is an OAuth callback with a token - extract and redirect
    handleOAuthCallback()
  } else if (hasError) {
    // This is an OAuth error callback - display error message
    const error = parseOAuthError()
    if (error) {
      const contentDiv = document.getElementById("main-content")
      if (contentDiv) {
        const errorHTML = `
          <div class="govuk-error-summary" data-module="govuk-error-summary">
            <div role="alert">
              <h2 class="govuk-error-summary__title">Authentication Error</h2>
              <div class="govuk-error-summary__body">
                <p>${error.message}</p>
                <p><a href="/" class="govuk-link">Return to homepage</a></p>
              </div>
            </div>
          </div>
        `
        contentDiv.insertAdjacentHTML("afterbegin", errorHTML)
      }
    }
  }
  // Normal page loads without token/error parameters - do nothing
}

/**
 * Initialize all Try feature components.
 *
 * This function is called when the DOM is ready. It handles both cases:
 * - Script loaded before DOMContentLoaded (listener fires normally)
 * - Script loaded after DOMContentLoaded (immediate execution)
 */
function init(): void {
  // Initialize GOV.UK Frontend components (accordions, tabs, etc.)
  GOVUKFrontend()

  // Story 5.3: Handle OAuth callback parameters (token or error in URL)
  handlePageOAuthCallback()

  // Story 5.1: Initialize authentication navigation
  initAuthNav()

  // Story 5.9: Initialize /try page (empty state for unauthenticated users)
  initTryPage()

  // Story 6.5: Initialize try button click handlers (auth check before AUP modal)
  initTryButton()

  // Dynamic try button text based on auth state and lease template duration
  initTryButtonText()
}

// Handle module scripts that may load after DOMContentLoaded has fired
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init)
} else {
  init()
}
