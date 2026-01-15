/**
 * Google Analytics 4 Core Module
 *
 * Provides GA4 integration with consent-gated tracking.
 * All tracking functions check consent before firing.
 *
 * @module analytics/analytics
 */

import { hasAnalyticsConsent } from "./consent"

/**
 * GA4 Measurement ID (Analytics 360)
 */
const GA4_MEASUREMENT_ID = "G-B5GRJRC7XC"

/**
 * User properties for GA4
 */
export interface UserProperties {
  user_role: string
  user_domain: string
  is_authenticated: string
}

// Module-level state
let ga4Initialized = false
let analyticsDisabled = false

// Extend window for gtag
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

/**
 * Internal gtag wrapper that queues commands to dataLayer.
 */
function gtag(...args: unknown[]): void {
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push(args)
  }
}

/**
 * Initialize Google Analytics 4.
 *
 * Critical initialization sequence:
 * 1. Check idempotency (prevent double init)
 * 2. Setup dataLayer array
 * 3. Define gtag function
 * 4. Send initial config
 * 5. Inject script tag (events queued in dataLayer fire when loaded)
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
    return
  }

  // Consent check
  if (!hasAnalyticsConsent()) {
    return
  }

  // Check if we're in a browser environment
  if (typeof window === "undefined" || typeof document === "undefined") {
    return
  }

  // Step 1: Setup dataLayer
  window.dataLayer = window.dataLayer || []

  // Step 2: Define gtag function
  window.gtag = function (...args: unknown[]) {
    window.dataLayer.push(args)
  }

  // Step 3: Initial gtag calls (queued, will fire when script loads)
  window.gtag("js", new Date())
  window.gtag("config", GA4_MEASUREMENT_ID, {
    send_page_view: false, // We'll send page views manually for better control
  })

  // Step 4: Inject script tag
  const script = document.createElement("script")
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`
  script.async = true
  document.head.appendChild(script)

  // Mark as initialized
  ga4Initialized = true
}

/**
 * Disable GA4 tracking.
 *
 * Called when user revokes consent. Sets internal flag to stop all tracking.
 * Does NOT remove the gtag script (causes errors). On next page load,
 * GA4 won't be initialized since consent is false.
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

  gtag("config", GA4_MEASUREMENT_ID, {
    user_id: hashedEmail,
  })
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

  gtag("set", "user_properties", props)
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

  gtag("event", eventName, params)
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
    params.page_path = pagePath
  }

  gtag("event", "page_view", params)
}
