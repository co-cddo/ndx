/**
 * Google Analytics 4 Core Module
 *
 * Provides GA4 integration using the Measurement Protocol.
 * Uses fetch() instead of gtag.js to be fully CSP compliant.
 * All tracking functions check consent before firing.
 *
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 * @module analytics/analytics
 */

import { hasAnalyticsConsent } from "./consent"

/**
 * GA4 Measurement ID
 */
const GA4_MEASUREMENT_ID = "G-B5GRJRC7XC"

/**
 * GA4 Measurement Protocol endpoint
 */
const GA4_ENDPOINT = "https://www.google-analytics.com/g/collect"

/**
 * User properties for GA4
 */
export interface UserProperties {
  user_role: string
  user_domain: string
  is_authenticated: string
}

/**
 * Client ID cookie name - persists across sessions
 */
const CLIENT_ID_COOKIE = "ndx_ga_client_id"

// Module-level state
let ga4Initialized = false
let analyticsDisabled = false
let clientId: string | null = null
let userId: string | null = null
let userProperties: UserProperties | null = null
let sessionId: string | null = null
let sessionNumber = 1

/**
 * Generate a random client ID (mimics GA4 format)
 */
function generateClientId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const random = Math.floor(Math.random() * 2147483647)
  return `${random}.${timestamp}`
}

/**
 * Get or create the client ID from cookie
 */
function getClientId(): string {
  if (clientId) {
    return clientId
  }

  // Try to read from cookie
  if (typeof document !== "undefined") {
    const cookies = document.cookie.split(";")
    const cidCookie = cookies.find((c) => c.trim().startsWith(`${CLIENT_ID_COOKIE}=`))
    if (cidCookie) {
      clientId = cidCookie.split("=")[1].trim()
      return clientId
    }
  }

  // Generate new client ID
  clientId = generateClientId()

  // Store in cookie (2 years, matching GA4)
  if (typeof document !== "undefined") {
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:"
    const secureFlag = isSecure ? "; Secure" : ""
    document.cookie = `${CLIENT_ID_COOKIE}=${clientId}; path=/; max-age=63072000; SameSite=Strict${secureFlag}`
  }

  return clientId
}

/**
 * Generate a session ID (random number, persists for session)
 */
function getSessionId(): string {
  if (!sessionId) {
    sessionId = String(Math.floor(Math.random() * 2147483647))
  }
  return sessionId
}

/**
 * Build the Measurement Protocol payload
 */
function buildPayload(eventName: string, params?: Record<string, unknown>): URLSearchParams {
  const payload = new URLSearchParams()

  // Required parameters
  payload.set("v", "2") // Protocol version
  payload.set("tid", GA4_MEASUREMENT_ID) // Measurement ID
  payload.set("cid", getClientId()) // Client ID
  payload.set("sid", getSessionId()) // Session ID
  payload.set("sct", String(sessionNumber)) // Session count

  // Event name
  payload.set("en", eventName)

  // User ID if set
  if (userId) {
    payload.set("uid", userId)
  }

  // Page info
  if (typeof window !== "undefined") {
    payload.set("dl", window.location.href) // Document location
    payload.set("dr", document.referrer || "") // Document referrer
    payload.set("dt", document.title) // Document title
    payload.set("sr", `${window.screen.width}x${window.screen.height}`) // Screen resolution
    payload.set("ul", navigator.language) // User language
  }

  // User properties
  if (userProperties) {
    Object.entries(userProperties).forEach(([key, value]) => {
      payload.set(`up.${key}`, value)
    })
  }

  // Event parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        payload.set(`ep.${key}`, String(value))
      }
    })
  }

  // Engagement time (required for events to show in realtime)
  payload.set("_et", "1")

  // Random cache buster
  payload.set("_z", String(Math.random()).slice(2, 12))

  return payload
}

/**
 * Send event to GA4 using Measurement Protocol
 */
function sendToGA4(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return
  }

  const payload = buildPayload(eventName, params)
  const url = `${GA4_ENDPOINT}?${payload.toString()}`

  console.debug("[GA4] Sending event:", eventName, url)

  // Use fetch for better proxy compatibility and debugging
  // Fall back to image pixel if fetch fails
  fetch(url, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    credentials: "omit",
  }).catch(() => {
    // Fallback: Use image pixel (works everywhere, shows in network tab)
    console.debug("[GA4] Fetch failed, using image pixel")
    const img = new Image()
    img.src = url
  })
}

/**
 * Initialize Google Analytics 4.
 *
 * Sets up client ID and marks as initialized.
 * No external scripts are loaded - uses Measurement Protocol.
 *
 * @example
 * ```typescript
 * if (hasAnalyticsConsent()) {
 *   initGA4();
 * }
 * ```
 */
export function initGA4(): void {
  // Idempotency check - prevent double initialization
  if (ga4Initialized) {
    console.debug("[GA4] Already initialized")
    return
  }

  // Consent check
  if (!hasAnalyticsConsent()) {
    console.debug("[GA4] No analytics consent")
    return
  }

  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return
  }

  // Initialize client ID
  const cid = getClientId()
  console.debug("[GA4] Initialized with client ID:", cid)

  // Mark as initialized
  ga4Initialized = true
}

/**
 * Disable GA4 tracking.
 *
 * Called when user revokes consent. Sets internal flag to stop all tracking.
 *
 * @example
 * ```typescript
 * // User revokes consent
 * setCookieConsent(false);
 * disableGA4();
 * ```
 */
export function disableGA4(): void {
  analyticsDisabled = true
}

/**
 * Check if GA4 tracking is currently active.
 *
 * @returns true if GA4 is initialized and not disabled
 */
export function isGA4Active(): boolean {
  return ga4Initialized && !analyticsDisabled && hasAnalyticsConsent()
}

/**
 * Set the User-ID for cross-device tracking.
 *
 * @param hashedEmail - SHA-256 hashed email address
 *
 * @example
 * ```typescript
 * const hashedId = await hashEmail(user.email);
 * setUserId(hashedId);
 * ```
 */
export function setUserId(hashedEmail: string): void {
  if (!isGA4Active()) {
    return
  }

  userId = hashedEmail
}

/**
 * Set user properties for segmentation.
 *
 * @param props - User properties to set
 *
 * @example
 * ```typescript
 * setUserProperties({
 *   user_role: 'admin',
 *   user_domain: 'example.gov.uk',
 *   is_authenticated: 'true'
 * });
 * ```
 */
export function setUserProperties(props: UserProperties): void {
  if (!isGA4Active()) {
    return
  }

  userProperties = props
}

/**
 * Track a custom event.
 *
 * All event tracking goes through this function to ensure consent checks.
 *
 * @param eventName - GA4 event name
 * @param params - Optional event parameters
 *
 * @example
 * ```typescript
 * trackEvent('try_button_click', { try_id: 'product-123' });
 * ```
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!isGA4Active()) {
    return
  }

  sendToGA4(eventName, params)
}

/**
 * Track a page view.
 *
 * Called after GA4 initialization to send the initial page view.
 *
 * @param pageTitle - Optional page title override
 * @param pagePath - Optional page path override
 *
 * @example
 * ```typescript
 * // Track current page
 * trackPageView();
 *
 * // Track with custom values
 * trackPageView('Product Page', '/products/item-123');
 * ```
 */
export function trackPageView(pageTitle?: string, pagePath?: string): void {
  if (!isGA4Active()) {
    return
  }

  const params: Record<string, unknown> = {}

  if (pageTitle) {
    params.page_title = pageTitle
  }

  if (pagePath) {
    params.page_location = pagePath
  }

  sendToGA4("page_view", params)
}
