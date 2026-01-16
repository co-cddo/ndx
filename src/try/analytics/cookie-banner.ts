/**
 * Cookie Banner JavaScript Controller
 *
 * Manages the GOV.UK cookie banner interactions and the cookie settings page.
 * Implements progressive enhancement - banner works without JS but doesn't save preferences.
 *
 * @module analytics/cookie-banner
 */

import { getCookieConsent, setCookieConsent, hasAnalyticsConsent } from "./consent"
import { initGA4, disableGA4, setUserId, setUserProperties, trackPageView } from "./analytics"
import { trackConsentChoice } from "./events"
import { hashEmail } from "./hash"
import { checkAuthStatus } from "../api/api-client"
import { authState } from "../auth/auth-provider"

/**
 * Extract domain from email address.
 *
 * @param email - Email address
 * @returns Domain portion of email
 */
function extractDomain(email: string): string {
  const parts = email.split("@")
  return parts.length === 2 ? parts[1] : "unknown"
}

/**
 * GOV.UK cookie banner HTML template.
 * Matches the output of govukCookieBanner macro.
 */
const COOKIE_BANNER_HTML = `
<div class="govuk-cookie-banner" data-nosnippet role="region" aria-label="Cookies on NDX" hidden data-cookie-banner>
  <div class="govuk-cookie-banner__message govuk-width-container" data-cookie-banner-question>
    <div class="govuk-grid-row">
      <div class="govuk-grid-column-two-thirds">
        <h2 class="govuk-cookie-banner__heading govuk-heading-m">Cookies on NDX</h2>
        <div class="govuk-cookie-banner__content">
          <p class="govuk-body">We use some essential cookies to make this service work.</p>
          <p class="govuk-body">We'd also like to use analytics cookies so we can understand how you use the service and make improvements.</p>
        </div>
      </div>
    </div>
    <div class="govuk-button-group">
      <button type="button" class="govuk-button" data-module="govuk-button" data-cookie-banner-accept>
        Accept analytics cookies
      </button>
      <button type="button" class="govuk-button govuk-button--secondary" data-module="govuk-button" data-cookie-banner-reject>
        Reject analytics cookies
      </button>
      <a class="govuk-link" href="/cookies/">View cookies</a>
    </div>
  </div>
  <div class="govuk-cookie-banner__message govuk-width-container" role="alert" hidden data-cookie-banner-accepted tabindex="-1">
    <div class="govuk-grid-row">
      <div class="govuk-grid-column-two-thirds">
        <div class="govuk-cookie-banner__content">
          <p class="govuk-body">You've accepted analytics cookies. You can <a class="govuk-link" href="/cookies/">change your cookie settings</a> at any time.</p>
        </div>
      </div>
    </div>
    <div class="govuk-button-group">
      <button type="button" class="govuk-button govuk-button--secondary" data-module="govuk-button" data-cookie-banner-hide>
        Hide cookie message
      </button>
    </div>
  </div>
  <div class="govuk-cookie-banner__message govuk-width-container" role="alert" hidden data-cookie-banner-rejected tabindex="-1">
    <div class="govuk-grid-row">
      <div class="govuk-grid-column-two-thirds">
        <div class="govuk-cookie-banner__content">
          <p class="govuk-body">You've rejected analytics cookies. You can <a class="govuk-link" href="/cookies/">change your cookie settings</a> at any time.</p>
        </div>
      </div>
    </div>
    <div class="govuk-button-group">
      <button type="button" class="govuk-button govuk-button--secondary" data-module="govuk-button" data-cookie-banner-hide>
        Hide cookie message
      </button>
    </div>
  </div>
</div>
`

/**
 * Inject the cookie banner HTML into the page.
 * Inserts at the start of body, before any other content.
 */
function injectCookieBanner(): HTMLElement | null {
  // Don't inject if already present
  if (document.querySelector("[data-cookie-banner]")) {
    return document.querySelector("[data-cookie-banner]")
  }

  // Insert at start of body
  document.body.insertAdjacentHTML("afterbegin", COOKIE_BANNER_HTML)
  return document.querySelector("[data-cookie-banner]")
}

/**
 * Initialize the cookie banner.
 *
 * Injects the banner HTML if not present, sets up event handlers,
 * and manages show/hide state.
 * Skips showing banner on the /cookies/ page.
 */
export function initCookieBanner(): void {
  // Skip on /cookies/ page - users manage preferences there directly
  const path = window.location.pathname
  if (path === "/cookies/" || path === "/cookies" || path.startsWith("/cookies/")) {
    return
  }

  // Check for existing consent before injecting
  const existingConsent = getCookieConsent()
  if (existingConsent !== null) {
    // User has already made a choice - don't show banner
    return
  }

  // Inject banner HTML if not present
  const banner = injectCookieBanner()
  if (!banner) {
    return
  }

  const questionMessage = banner.querySelector("[data-cookie-banner-question]") as HTMLElement | null
  const acceptedMessage = banner.querySelector("[data-cookie-banner-accepted]") as HTMLElement | null
  const rejectedMessage = banner.querySelector("[data-cookie-banner-rejected]") as HTMLElement | null

  // Show the banner question
  banner.removeAttribute("hidden")
  if (questionMessage) {
    questionMessage.removeAttribute("hidden")
  }

  // Accept button handler
  const acceptButton = banner.querySelector("[data-cookie-banner-accept]")
  if (acceptButton) {
    acceptButton.addEventListener("click", () => {
      setCookieConsent(true)
      initGA4()
      trackConsentChoice(true)
      trackPageView()

      // Set up User-ID if authenticated
      setupUserTracking()

      // Show accepted confirmation
      if (questionMessage) {
        questionMessage.setAttribute("hidden", "")
      }
      if (acceptedMessage) {
        acceptedMessage.removeAttribute("hidden")
        acceptedMessage.focus()
      }
    })
  }

  // Reject button handler
  const rejectButton = banner.querySelector("[data-cookie-banner-reject]")
  if (rejectButton) {
    rejectButton.addEventListener("click", () => {
      setCookieConsent(false)

      // Show rejected confirmation
      if (questionMessage) {
        questionMessage.setAttribute("hidden", "")
      }
      if (rejectedMessage) {
        rejectedMessage.removeAttribute("hidden")
        rejectedMessage.focus()
      }
    })
  }

  // Hide button handlers (on both confirmation messages)
  const hideButtons = banner.querySelectorAll("[data-cookie-banner-hide]")
  hideButtons.forEach((button) => {
    button.addEventListener("click", () => {
      banner.setAttribute("hidden", "")
    })
  })
}

/**
 * Initialize the cookie settings page controls.
 *
 * Sets up the consent management UI on the /cookies/ page.
 */
export function initCookieSettings(): void {
  // Only run on /cookies/ page
  const path = window.location.pathname
  if (path !== "/cookies/" && path !== "/cookies") {
    return
  }

  const statusElement = document.querySelector("[data-cookie-settings-status]") as HTMLElement | null
  const acceptButton = document.querySelector("[data-cookie-settings-accept]") as HTMLElement | null
  const rejectButton = document.querySelector("[data-cookie-settings-reject]") as HTMLElement | null
  const successBanner = document.querySelector("[data-cookie-settings-success]") as HTMLElement | null
  const successMessage = document.querySelector("[data-cookie-settings-success-message]") as HTMLElement | null

  if (!statusElement || !acceptButton || !rejectButton) {
    return
  }

  // Update status display based on current consent
  function updateStatus(): void {
    const consent = getCookieConsent()
    const statusParagraph = statusElement?.querySelector("p")
    if (statusParagraph) {
      if (consent === null) {
        statusParagraph.textContent = "You have not yet made a choice about analytics cookies."
      } else if (consent.analytics) {
        statusParagraph.textContent = "You have accepted analytics cookies."
      } else {
        statusParagraph.textContent = "You have rejected analytics cookies."
      }
    }
  }

  // Show success notification
  function showSuccess(accepted: boolean): void {
    if (successBanner && successMessage) {
      successMessage.textContent = accepted
        ? "You've accepted analytics cookies."
        : "You've rejected analytics cookies."
      successBanner.removeAttribute("hidden")
      successBanner.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }

  // Initial status update
  updateStatus()

  // Accept button handler
  acceptButton.addEventListener("click", () => {
    setCookieConsent(true)
    initGA4()
    trackConsentChoice(true)
    trackPageView()
    setupUserTracking()
    updateStatus()
    showSuccess(true)
  })

  // Reject button handler
  rejectButton.addEventListener("click", () => {
    setCookieConsent(false)
    disableGA4()
    updateStatus()
    showSuccess(false)
  })
}

/**
 * Set up User-ID and user properties tracking for authenticated users.
 *
 * Called after consent is granted to set up user-level tracking.
 */
async function setupUserTracking(): Promise<void> {
  if (!hasAnalyticsConsent()) {
    return
  }

  try {
    const authResult = await checkAuthStatus()
    if (authResult.authenticated && authResult.user) {
      const hashedEmail = await hashEmail(authResult.user.email)
      setUserId(hashedEmail)

      // Determine role (first role or 'user' as default)
      const role = authResult.user.roles.length > 0 ? authResult.user.roles[0] : "user"
      const domain = extractDomain(authResult.user.email)

      setUserProperties({
        user_role: role,
        user_domain: domain,
        is_authenticated: "true",
      })
    }
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
    console.warn("[analytics] Failed to set user tracking:", error)
  }
}

/**
 * Initialize analytics based on existing consent.
 *
 * Called on page load to initialize GA4 if user has already consented.
 * Also sets up auth state subscription for User-ID tracking.
 */
export function initAnalytics(): void {
  // Only initialize if consent exists and is accepted
  if (hasAnalyticsConsent()) {
    initGA4()
    trackPageView()

    // Set up user tracking if already authenticated
    setupUserTracking()
  }

  // Subscribe to auth state changes for User-ID updates
  authState.subscribe(async (isAuthenticated) => {
    if (!hasAnalyticsConsent()) {
      return
    }

    if (isAuthenticated) {
      await setupUserTracking()
    } else {
      // User signed out - clear user properties
      setUserProperties({
        user_role: "anonymous",
        user_domain: "unknown",
        is_authenticated: "false",
      })
    }
  })
}
