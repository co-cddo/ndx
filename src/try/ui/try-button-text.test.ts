/**
 * Unit tests for Try Button Text Manager
 *
 * Tests dynamic button text based on authentication state
 * and lease template duration.
 *
 * @jest-environment jsdom
 */

import { initTryButtonText, cleanupTryButtonText, _internal } from "./try-button-text"
import { authState } from "../auth/auth-provider"
import { fetchLeaseTemplate } from "../api/lease-templates-service"

// Mock dependencies
jest.mock("../auth/auth-provider", () => ({
  authState: {
    isAuthenticated: jest.fn(),
    subscribe: jest.fn(),
  },
}))

jest.mock("../api/lease-templates-service", () => ({
  fetchLeaseTemplate: jest.fn(),
}))

const mockAuthState = authState as jest.Mocked<typeof authState>
const mockFetchLeaseTemplate = fetchLeaseTemplate as jest.MockedFunction<typeof fetchLeaseTemplate>

describe("Try Button Text Manager", () => {
  const TEST_TRY_ID = "550e8400-e29b-41d4-a716-446655440000"

  // Store subscribe callback for testing
  let authCallback: ((isAuthenticated: boolean) => void) | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = ""
    cleanupTryButtonText()

    // Capture auth subscribe callback
    mockAuthState.subscribe.mockImplementation((callback) => {
      authCallback = callback
      return jest.fn() // Return unsubscribe function
    })

    // Default to unauthenticated
    mockAuthState.isAuthenticated.mockReturnValue(false)

    // Default successful API response
    mockFetchLeaseTemplate.mockResolvedValue({
      success: true,
      data: {
        leaseDurationInHours: 24,
        maxSpend: 50,
      },
    })
  })

  afterEach(() => {
    cleanupTryButtonText()
    document.body.innerHTML = ""
    authCallback = null
  })

  describe("initTryButtonText", () => {
    it("should find buttons with data-try-id attribute", () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()

      expect(_internal.managedButtons.size).toBe(1)
      expect(_internal.managedButtons.has(TEST_TRY_ID)).toBe(true)
    })

    it("should find multiple buttons", () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
        <button data-try-id="another-id">Another Try</button>
      `

      initTryButtonText()

      expect(_internal.managedButtons.size).toBe(2)
    })

    it("should handle anchor elements with data-try-id", () => {
      document.body.innerHTML = `
        <a href="#" data-try-id="${TEST_TRY_ID}">Try this now</a>
      `

      initTryButtonText()

      expect(_internal.managedButtons.size).toBe(1)
    })

    it("should not initialize if no try buttons found", () => {
      document.body.innerHTML = `<button>Regular button</button>`

      initTryButtonText()

      expect(mockAuthState.subscribe).not.toHaveBeenCalled()
    })

    it("should subscribe to auth state changes", () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()

      expect(mockAuthState.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })

    it("should store original button text", () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()

      const state = _internal.managedButtons.get(TEST_TRY_ID)
      expect(state?.originalText).toBe("Try this now")
    })
  })

  describe("Unauthenticated user", () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated.mockReturnValue(false)
    })

    it("should show 'Sign In to Try This Now' when not authenticated", () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()
      // Trigger auth callback with unauthenticated state
      authCallback?.(false)

      const button = document.querySelector("button")
      expect(button?.textContent).toBe("Sign In to Try This Now")
    })

    it("should update all buttons when user signs out", () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
        <button data-try-id="another-id">Another Try</button>
      `

      initTryButtonText()
      authCallback?.(false)

      const buttons = document.querySelectorAll("button")
      buttons.forEach((button) => {
        expect(button.textContent).toBe("Sign In to Try This Now")
      })
    })
  })

  describe("Authenticated user - loading state", () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated.mockReturnValue(true)
      // Make API call hang to test loading state
      mockFetchLeaseTemplate.mockImplementation(() => new Promise(() => {}))
    })

    it("should show 'Try This Now' while loading", () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()
      authCallback?.(true)

      const button = document.querySelector("button")
      expect(button?.textContent).toBe("Try This Now")
    })
  })

  describe("Authenticated user - loaded state", () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated.mockReturnValue(true)
    })

    it("should show duration after successful fetch - 24 hours", async () => {
      mockFetchLeaseTemplate.mockResolvedValue({
        success: true,
        data: { leaseDurationInHours: 24, maxSpend: 50 },
      })

      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()
      authCallback?.(true)

      // Wait for async fetch
      await Promise.resolve()

      const button = document.querySelector("button")
      expect(button?.textContent).toBe("Try This for 24 Hours")
    })

    it("should show days for over 72 hours", async () => {
      mockFetchLeaseTemplate.mockResolvedValue({
        success: true,
        data: { leaseDurationInHours: 96, maxSpend: 50 },
      })

      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()
      authCallback?.(true)

      await Promise.resolve()

      const button = document.querySelector("button")
      expect(button?.textContent).toBe("Try This for 4 Days")
    })

    it("should show minutes for under 90 minutes", async () => {
      mockFetchLeaseTemplate.mockResolvedValue({
        success: true,
        data: { leaseDurationInHours: 1, maxSpend: 50 },
      })

      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()
      authCallback?.(true)

      await Promise.resolve()

      const button = document.querySelector("button")
      expect(button?.textContent).toBe("Try This for 60 Minutes")
    })

    it("should call fetchLeaseTemplate with correct tryId", async () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()
      authCallback?.(true)

      await Promise.resolve()

      expect(mockFetchLeaseTemplate).toHaveBeenCalledWith(TEST_TRY_ID)
    })
  })

  describe("Error handling", () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated.mockReturnValue(true)
    })

    it("should show generic text on API error", async () => {
      mockFetchLeaseTemplate.mockResolvedValue({
        success: false,
        error: "Template not found",
        errorCode: "NOT_FOUND",
      })

      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      const warnSpy = jest.spyOn(console, "warn").mockImplementation()

      initTryButtonText()
      authCallback?.(true)

      await Promise.resolve()

      const button = document.querySelector("button")
      expect(button?.textContent).toBe("Try This Now")
      expect(warnSpy).toHaveBeenCalledWith("[try-button-text] Failed to fetch duration:", "Template not found")

      warnSpy.mockRestore()
    })

    it("should show generic text on unexpected error", async () => {
      mockFetchLeaseTemplate.mockRejectedValue(new Error("Network error"))

      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      const errorSpy = jest.spyOn(console, "error").mockImplementation()

      initTryButtonText()
      authCallback?.(true)

      await Promise.resolve()

      const button = document.querySelector("button")
      expect(button?.textContent).toBe("Try This Now")

      errorSpy.mockRestore()
    })

    it("should revert to sign in text if user signs out during fetch", async () => {
      // Start authenticated
      mockAuthState.isAuthenticated.mockReturnValue(true)

      // Slow API response
      mockFetchLeaseTemplate.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                data: { leaseDurationInHours: 24, maxSpend: 50 },
              })
            }, 10)
          }),
      )

      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()
      authCallback?.(true)

      // User signs out during fetch
      mockAuthState.isAuthenticated.mockReturnValue(false)

      // Wait for fetch to complete
      await new Promise((resolve) => setTimeout(resolve, 20))

      const button = document.querySelector("button")
      expect(button?.textContent).toBe("Sign In to Try This Now")
    })
  })

  describe("SVG icon preservation", () => {
    it("should preserve SVG icon when updating text", () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">
          Try this now
          <svg class="govuk-button__start-icon" viewBox="0 0 17 17">
            <path d="..."></path>
          </svg>
        </button>
      `

      initTryButtonText()
      authCallback?.(false)

      const button = document.querySelector("button")
      const svg = button?.querySelector("svg")

      expect(button?.textContent).toContain("Sign In to Try This Now")
      expect(svg).toBeTruthy()
      expect(svg?.classList.contains("govuk-button__start-icon")).toBe(true)
    })
  })

  describe("Auth state transitions", () => {
    it("should update text when user signs in", async () => {
      mockFetchLeaseTemplate.mockResolvedValue({
        success: true,
        data: { leaseDurationInHours: 24, maxSpend: 50 },
      })

      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()

      // Start unauthenticated
      authCallback?.(false)
      expect(document.querySelector("button")?.textContent).toBe("Sign In to Try This Now")

      // User signs in
      mockAuthState.isAuthenticated.mockReturnValue(true)
      authCallback?.(true)

      await Promise.resolve()

      expect(document.querySelector("button")?.textContent).toBe("Try This for 24 Hours")
    })

    it("should update text when user signs out", async () => {
      mockFetchLeaseTemplate.mockResolvedValue({
        success: true,
        data: { leaseDurationInHours: 24, maxSpend: 50 },
      })

      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()

      // Start authenticated
      mockAuthState.isAuthenticated.mockReturnValue(true)
      authCallback?.(true)

      await Promise.resolve()
      expect(document.querySelector("button")?.textContent).toBe("Try This for 24 Hours")

      // User signs out
      mockAuthState.isAuthenticated.mockReturnValue(false)
      authCallback?.(false)

      expect(document.querySelector("button")?.textContent).toBe("Sign In to Try This Now")
    })
  })

  describe("cleanupTryButtonText", () => {
    it("should clear managed buttons", () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `

      initTryButtonText()
      expect(_internal.managedButtons.size).toBe(1)

      cleanupTryButtonText()
      expect(_internal.managedButtons.size).toBe(0)
    })
  })
})
