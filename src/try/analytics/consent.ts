/**
 * Cookie Consent Management
 *
 * Manages user consent for analytics cookies using the GOV.UK pattern.
 * Stores consent in a JSON cookie with version field for future migrations.
 *
 * @module analytics/consent
 */

/**
 * Current consent cookie version.
 * Increment this when consent requirements change to trigger re-consent.
 */
export const CONSENT_COOKIE_VERSION = 1

/**
 * Cookie name following GOV.UK convention: {service}_cookies_policy
 */
export const CONSENT_COOKIE_NAME = "ndx_cookies_policy"

/**
 * Cookie consent state structure.
 */
export interface CookieConsent {
  /** Whether analytics cookies are accepted */
  analytics: boolean
  /** Consent version for migration tracking */
  version: number
}

/**
 * Get the current cookie consent state.
 *
 * @returns Consent state or null if not set or invalid
 *
 * @example
 * ```typescript
 * const consent = getCookieConsent();
 * if (consent?.analytics) {
 *   initGA4();
 * }
 * ```
 */
export function getCookieConsent(): CookieConsent | null {
  if (typeof document === "undefined") {
    return null
  }

  const cookies = document.cookie.split(";")
  const consentCookie = cookies.find((cookie) => cookie.trim().startsWith(`${CONSENT_COOKIE_NAME}=`))

  if (!consentCookie) {
    return null
  }

  try {
    const value = consentCookie.split("=")[1]
    const decoded = decodeURIComponent(value)
    const parsed = JSON.parse(decoded) as CookieConsent

    // Validate version - if older version, treat as no consent
    if (typeof parsed.version !== "number" || parsed.version < CONSENT_COOKIE_VERSION) {
      return null
    }

    // Validate analytics field
    if (typeof parsed.analytics !== "boolean") {
      return null
    }

    return parsed
  } catch {
    // Malformed JSON - treat as no consent
    return null
  }
}

/**
 * Set the cookie consent state.
 *
 * @param analytics - Whether analytics cookies are accepted
 *
 * @example
 * ```typescript
 * // User accepts analytics
 * setCookieConsent(true);
 *
 * // User rejects analytics
 * setCookieConsent(false);
 * ```
 */
export function setCookieConsent(analytics: boolean): void {
  if (typeof document === "undefined") {
    return
  }

  const consent: CookieConsent = {
    analytics,
    version: CONSENT_COOKIE_VERSION,
  }

  const value = encodeURIComponent(JSON.stringify(consent))

  // Build cookie string with proper flags
  // - path=/: readable on all pages (critical)
  // - max-age=31536000: 1 year expiry
  // - SameSite=Strict: CSRF protection
  // - Secure: only on HTTPS (conditional for localhost dev)
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:"
  const secureFlag = isSecure ? "; Secure" : ""

  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Strict${secureFlag}`
}

/**
 * Check if user has granted analytics consent.
 *
 * Convenience function that returns false if consent is not set or rejected.
 *
 * @returns true if analytics consent is granted, false otherwise
 *
 * @example
 * ```typescript
 * if (hasAnalyticsConsent()) {
 *   trackEvent('page_view');
 * }
 * ```
 */
export function hasAnalyticsConsent(): boolean {
  const consent = getCookieConsent()
  return consent?.analytics === true
}
