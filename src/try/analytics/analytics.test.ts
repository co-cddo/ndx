/**
 * Analytics core module tests
 *
 * @module analytics/analytics.test
 */

// Import consent mock before the module under test
jest.mock("./consent", () => ({
  hasAnalyticsConsent: jest.fn(),
}))

// We need to import after setting up the mock
import { hasAnalyticsConsent } from "./consent"
import { isGA4Active, trackEvent, trackPageView } from "./analytics"

describe("analytics module", () => {
  const mockHasAnalyticsConsent = hasAnalyticsConsent as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    // Default: no consent
    mockHasAnalyticsConsent.mockReturnValue(false)
  })

  describe("isGA4Active", () => {
    it("should return false when consent is false", () => {
      mockHasAnalyticsConsent.mockReturnValue(false)

      expect(isGA4Active()).toBe(false)
    })
  })

  describe("trackEvent", () => {
    it("should not throw when called without consent", () => {
      mockHasAnalyticsConsent.mockReturnValue(false)

      expect(() => {
        trackEvent("test_event", { param: "value" })
      }).not.toThrow()
    })
  })

  describe("trackPageView", () => {
    it("should not throw when called without consent", () => {
      mockHasAnalyticsConsent.mockReturnValue(false)

      expect(() => {
        trackPageView()
      }).not.toThrow()
    })

    it("should accept optional page title and path parameters", () => {
      mockHasAnalyticsConsent.mockReturnValue(false)

      expect(() => {
        trackPageView("Custom Page", "/custom/path")
      }).not.toThrow()
    })
  })
})
