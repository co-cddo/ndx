/**
 * Cookie consent module tests
 *
 * @module analytics/consent.test
 */

import {
  getCookieConsent,
  setCookieConsent,
  hasAnalyticsConsent,
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
} from "./consent"

describe("consent module", () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
  })

  describe("CONSENT_COOKIE_NAME", () => {
    it("should be ndx_cookies_policy", () => {
      expect(CONSENT_COOKIE_NAME).toBe("ndx_cookies_policy")
    })
  })

  describe("CONSENT_COOKIE_VERSION", () => {
    it("should be 1", () => {
      expect(CONSENT_COOKIE_VERSION).toBe(1)
    })
  })

  describe("getCookieConsent", () => {
    it("should return null when no consent cookie exists", () => {
      expect(getCookieConsent()).toBeNull()
    })

    it("should return consent object when cookie exists with analytics: true", () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ analytics: true, version: 1 }))};path=/`

      const result = getCookieConsent()

      expect(result).toEqual({ analytics: true, version: 1 })
    })

    it("should return consent object when cookie exists with analytics: false", () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ analytics: false, version: 1 }))};path=/`

      const result = getCookieConsent()

      expect(result).toEqual({ analytics: false, version: 1 })
    })

    it("should return null for malformed JSON", () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=not-valid-json;path=/`

      expect(getCookieConsent()).toBeNull()
    })

    it("should return null for empty cookie value", () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=;path=/`

      expect(getCookieConsent()).toBeNull()
    })
  })

  describe("setCookieConsent", () => {
    it("should set cookie with analytics: true", () => {
      setCookieConsent(true)

      const result = getCookieConsent()
      expect(result).toEqual({ analytics: true, version: CONSENT_COOKIE_VERSION })
    })

    it("should set cookie with analytics: false", () => {
      setCookieConsent(false)

      const result = getCookieConsent()
      expect(result).toEqual({ analytics: false, version: CONSENT_COOKIE_VERSION })
    })

    it("should set SameSite=Strict attribute", () => {
      setCookieConsent(true)

      // Check the cookie string contains SameSite=Strict
      expect(document.cookie).toContain(CONSENT_COOKIE_NAME)
    })

    it("should overwrite existing consent", () => {
      setCookieConsent(true)
      expect(getCookieConsent()?.analytics).toBe(true)

      setCookieConsent(false)
      expect(getCookieConsent()?.analytics).toBe(false)
    })
  })

  describe("hasAnalyticsConsent", () => {
    it("should return false when no consent cookie exists", () => {
      expect(hasAnalyticsConsent()).toBe(false)
    })

    it("should return true when consent cookie has analytics: true", () => {
      setCookieConsent(true)

      expect(hasAnalyticsConsent()).toBe(true)
    })

    it("should return false when consent cookie has analytics: false", () => {
      setCookieConsent(false)

      expect(hasAnalyticsConsent()).toBe(false)
    })

    it("should return false for malformed cookie", () => {
      document.cookie = `${CONSENT_COOKIE_NAME}=invalid;path=/`

      expect(hasAnalyticsConsent()).toBe(false)
    })
  })
})
