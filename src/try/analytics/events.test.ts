/**
 * Event tracking tests
 *
 * @module analytics/events.test
 */

import {
  trackPageViewEvent,
  trackTryButtonClick,
  trackAupViewed,
  trackAupAccepted,
  trackSignIn,
  trackSignOut,
  trackSessionAccess,
  trackCliCredentials,
  trackCloudFormationAccess,
  trackConsentChoice,
} from "./events"
import * as analytics from "./analytics"

// Mock the analytics module
jest.mock("./analytics", () => ({
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
}))

describe("events module", () => {
  const mockTrackEvent = analytics.trackEvent as jest.Mock
  const mockTrackPageView = analytics.trackPageView as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("trackPageViewEvent", () => {
    it("should call trackPageView", () => {
      trackPageViewEvent()

      expect(mockTrackPageView).toHaveBeenCalled()
    })
  })

  describe("trackTryButtonClick", () => {
    it("should track with try_id parameter", () => {
      trackTryButtonClick("product-123")

      expect(mockTrackEvent).toHaveBeenCalledWith("try_button_click", { try_id: "product-123" })
    })
  })

  describe("trackAupViewed", () => {
    it("should track with product parameters", () => {
      trackAupViewed("prod-1", "Product Name", "Vendor Inc")

      expect(mockTrackEvent).toHaveBeenCalledWith("aup_viewed", {
        product_id: "prod-1",
        product_name: "Product Name",
        product_vendor: "Vendor Inc",
      })
    })
  })

  describe("trackAupAccepted", () => {
    it("should track with product parameters", () => {
      trackAupAccepted("prod-1", "Product Name", "Vendor Inc")

      expect(mockTrackEvent).toHaveBeenCalledWith("aup_accepted", {
        product_id: "prod-1",
        product_name: "Product Name",
        product_vendor: "Vendor Inc",
      })
    })
  })

  describe("trackSignIn", () => {
    it("should track sign_in_initiated event", () => {
      trackSignIn()

      expect(mockTrackEvent).toHaveBeenCalledWith("sign_in_initiated")
    })
  })

  describe("trackSignOut", () => {
    it("should track sign_out event", () => {
      trackSignOut()

      expect(mockTrackEvent).toHaveBeenCalledWith("sign_out")
    })
  })

  describe("trackSessionAccess", () => {
    it("should track with lease parameters", () => {
      trackSessionAccess("lease-123", "Template A", "100", "24")

      expect(mockTrackEvent).toHaveBeenCalledWith("session_access", {
        lease_id: "lease-123",
        lease_template: "Template A",
        budget: "100",
        duration: "24",
      })
    })
  })

  describe("trackCliCredentials", () => {
    it("should track with lease parameters", () => {
      trackCliCredentials("lease-456", "Template B", "50", "12")

      expect(mockTrackEvent).toHaveBeenCalledWith("cli_credentials", {
        lease_id: "lease-456",
        lease_template: "Template B",
        budget: "50",
        duration: "12",
      })
    })
  })

  describe("trackCloudFormationAccess", () => {
    it("should track with lease parameters including expires", () => {
      trackCloudFormationAccess("lease-789", "Template C", "75", "2025-01-15T00:00:00Z")

      expect(mockTrackEvent).toHaveBeenCalledWith("cloudformation_access", {
        lease_id: "lease-789",
        lease_template: "Template C",
        budget: "75",
        expires: "2025-01-15T00:00:00Z",
      })
    })

    it("should handle empty string values", () => {
      trackCloudFormationAccess("", "", "", "")

      expect(mockTrackEvent).toHaveBeenCalledWith("cloudformation_access", {
        lease_id: "",
        lease_template: "",
        budget: "",
        expires: "",
      })
    })
  })

  describe("trackConsentChoice", () => {
    it("should track consent_granted when accepted is true", () => {
      trackConsentChoice(true)

      expect(mockTrackEvent).toHaveBeenCalledWith("consent_granted")
    })

    it("should not track when accepted is false (cannot track rejection)", () => {
      trackConsentChoice(false)

      expect(mockTrackEvent).not.toHaveBeenCalled()
    })
  })
})
