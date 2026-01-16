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
 * Initialize the cookie banner.
 *
 * Sets up event handlers for banner buttons and manages show/hide state.
 * Skips showing banner on the /cookies/ page.
 */
export function initCookieBanner(): void {
  // Skip on /cookies/ page - users manage preferences there directly
  const path = window.location.pathname
  if (path === "/cookies/" || path === "/cookies" || path.startsWith("/cookies/")) {
    return
  }

  const banner = document.querySelector("[data-cookie-banner]") as HTMLElement | null
  if (!banner) {
    return
  }

  const questionMessage = banner.querySelector("[data-cookie-banner-question]") as HTMLElement | null
  const acceptedMessage = banner.querySelector("[data-cookie-banner-accepted]") as HTMLElement | null
  const rejectedMessage = banner.querySelector("[data-cookie-banner-rejected]") as HTMLElement | null

  // Check for existing consent
  const existingConsent = getCookieConsent()
  if (existingConsent !== null) {
    // User has already made a choice - keep banner hidden
    return
  }

  // No consent yet - show the banner question
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
