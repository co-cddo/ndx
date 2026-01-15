/**
 * Typed Event Tracking Functions
 *
 * Provides strongly-typed event tracking functions for GA4.
 * Each function wraps trackEvent with proper event names and parameters.
 *
 * @module analytics/events
 */

import { trackEvent, trackPageView as coreTrackPageView } from "./analytics"

// Debounce/dedupe state
let lastSearchQuery = ""
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
const recentClicks = new Map<string, number>()

const SEARCH_DEBOUNCE_MS = 500
const CLICK_DEDUPE_MS = 100

/**
 * Track page view event.
 */
export function trackPageViewEvent(): void {
  coreTrackPageView()
}

/**
 * Track Try button click.
 *
 * @param tryId - The try ID (product identifier)
 */
export function trackTryButtonClick(tryId: string): void {
  trackEvent("try_button_click", { try_id: tryId })
}

/**
 * Track AUP (Acceptable Use Policy) modal viewed.
 *
 * @param productId - Product identifier
 * @param productName - Product display name
 * @param productVendor - Product vendor name
 */
export function trackAupViewed(productId: string, productName: string, productVendor: string): void {
  trackEvent("aup_viewed", {
    product_id: productId,
    product_name: productName,
    product_vendor: productVendor,
  })
}

/**
 * Track AUP accepted.
 *
 * @param productId - Product identifier
 * @param productName - Product display name
 * @param productVendor - Product vendor name
 */
export function trackAupAccepted(productId: string, productName: string, productVendor: string): void {
  trackEvent("aup_accepted", {
    product_id: productId,
    product_name: productName,
    product_vendor: productVendor,
  })
}

/**
 * Track sign-in button click (intent, not completion).
 */
export function trackSignIn(): void {
  trackEvent("sign_in_initiated")
}

/**
 * Track sign-out action.
 */
export function trackSignOut(): void {
  trackEvent("sign_out")
}

/**
 * Track session access (Launch AWS Console).
 *
 * @param leaseId - Lease identifier
 * @param leaseTemplate - Lease template name
 * @param budget - Budget amount
 * @param duration - Session duration
 */
export function trackSessionAccess(leaseId: string, leaseTemplate: string, budget: string, duration: string): void {
  trackEvent("session_access", {
    lease_id: leaseId,
    lease_template: leaseTemplate,
    budget,
    duration,
  })
}

/**
 * Track CLI credentials access.
 *
 * @param leaseId - Lease identifier
 * @param leaseTemplate - Lease template name
 * @param budget - Budget amount
 * @param duration - Session duration
 */
export function trackCliCredentials(leaseId: string, leaseTemplate: string, budget: string, duration: string): void {
  trackEvent("cli_credentials", {
    lease_id: leaseId,
    lease_template: leaseTemplate,
    budget,
    duration,
  })
}

/**
 * Track navigation click with deduplication.
 *
 * @param destination - Navigation destination (link text or path)
 */
export function trackNavClick(destination: string): void {
  const key = `nav_${destination}`
  const now = Date.now()
  const lastClick = recentClicks.get(key)

  // Dedupe rapid clicks
  if (lastClick && now - lastClick < CLICK_DEDUPE_MS) {
    return
  }

  recentClicks.set(key, now)
  trackEvent("nav_click", { destination })

  // Cleanup old entries after 1 second
  setTimeout(() => recentClicks.delete(key), 1000)
}

/**
 * Track search query with debouncing.
 *
 * @param query - Search query string
 */
export function trackSearch(query: string): void {
  // Clear existing timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  // Don't track empty or duplicate queries
  if (!query.trim() || query === lastSearchQuery) {
    return
  }

  // Debounce search tracking
  searchDebounceTimer = setTimeout(() => {
    lastSearchQuery = query
    trackEvent("search", { search_term: query })
  }, SEARCH_DEBOUNCE_MS)
}

/**
 * Track external link click.
 *
 * @param url - External URL
 */
export function trackExternalLink(url: string): void {
  const key = `ext_${url}`
  const now = Date.now()
  const lastClick = recentClicks.get(key)

  // Dedupe rapid clicks
  if (lastClick && now - lastClick < CLICK_DEDUPE_MS) {
    return
  }

  recentClicks.set(key, now)
  trackEvent("external_link", { link_url: url })

  // Cleanup old entries
  setTimeout(() => recentClicks.delete(key), 1000)
}

/**
 * Track consent choice for coverage metrics.
 *
 * Note: This only fires if user accepts (since we need consent to track).
 *
 * @param accepted - Whether analytics was accepted
 */
export function trackConsentChoice(accepted: boolean): void {
  // Only track acceptance (can't track rejection without consent)
  if (accepted) {
    trackEvent("consent_granted")
  }
}
