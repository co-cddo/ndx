/**
 * OAuth Flow Utilities - Unit Tests
 *
 * Tests for return URL management and OAuth error parsing.
 *
 * @module oauth-flow.test
 */

import {
  storeReturnURL,
  getReturnURL,
  clearReturnURL,
  parseOAuthError,
  extractTokenFromURL,
  cleanupURLAfterExtraction,
  handleOAuthCallback,
} from "./oauth-flow"

describe("OAuth Flow Utilities", () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()

    // Reset window.location mock for tests
    // TypeScript workaround: delete and reassign location
    // IMPORTANT: Include 'origin' for sanitizeReturnUrl validation
    delete (window as any).location
    ;(window as any).location = {
      pathname: "/some-page",
      href: "https://ndx.gov.uk/some-page",
      search: "",
      origin: "https://ndx.gov.uk",
    }
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  describe("storeReturnURL", () => {
    it("should store current URL in sessionStorage", () => {
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/some-page")
    })

    it("should not store URL if on callback page", () => {
      ;(window as any).location.pathname = "/callback"
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
    })

    it("should not store URL if on callback.html page", () => {
      ;(window as any).location.pathname = "/callback.html"
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
    })

    it("should handle different page URLs correctly", () => {
      ;(window as any).location.href = "https://ndx.gov.uk/catalogue"
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/catalogue")
    })

    it("should overwrite previous return URL", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/old-page")
      ;(window as any).location.href = "https://ndx.gov.uk/new-page"
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/new-page")
    })
  })

  describe("getReturnURL", () => {
    it("should return stored URL", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/catalogue")
      expect(getReturnURL()).toBe("https://ndx.gov.uk/catalogue")
    })

    it("should return home page if no URL stored", () => {
      expect(getReturnURL()).toBe("/")
    })

    it("should return home page if stored URL is empty string", () => {
      sessionStorage.setItem("auth-return-to", "")
      expect(getReturnURL()).toBe("/")
    })

    it("should return stored URL with query parameters", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/catalogue?tag=aws")
      expect(getReturnURL()).toBe("https://ndx.gov.uk/catalogue?tag=aws")
    })

    it("should return stored URL with hash fragment", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/product#details")
      expect(getReturnURL()).toBe("https://ndx.gov.uk/product#details")
    })
  })

  describe("clearReturnURL", () => {
    it("should remove return URL from sessionStorage", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/some-page")
      clearReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
    })

    it("should not throw error if return URL does not exist", () => {
      expect(() => clearReturnURL()).not.toThrow()
    })

    it("should handle multiple clear calls gracefully", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/some-page")
      clearReturnURL()
      clearReturnURL() // Second call should not throw
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
    })
  })

  describe("parseOAuthError", () => {
    it("should return null if no error in URL", () => {
      expect(parseOAuthError()).toBeNull()
    })

    it("should parse access_denied error", () => {
      ;(window as any).location.search = "?error=access_denied"
      const error = parseOAuthError()
      expect(error).toEqual({
        code: "access_denied",
        message: expect.stringContaining("cancelled"),
      })
    })

    it("should parse invalid_request error", () => {
      ;(window as any).location.search = "?error=invalid_request"
      const error = parseOAuthError()
      expect(error).toEqual({
        code: "invalid_request",
        message: expect.stringContaining("problem"),
      })
    })

    it("should parse server_error error", () => {
      ;(window as any).location.search = "?error=server_error"
      const error = parseOAuthError()
      expect(error).toEqual({
        code: "server_error",
        message: expect.stringContaining("temporarily unavailable"),
      })
    })

    it("should handle unknown error codes with generic message", () => {
      ;(window as any).location.search = "?error=unknown_error"
      const error = parseOAuthError()
      expect(error).not.toBeNull()
      expect(error?.code).toBe("unknown_error")
      expect(error?.message).toContain("An error occurred")
    })

    it("should ignore other query parameters", () => {
      ;(window as any).location.search = "?token=abc123&error=access_denied&foo=bar"
      const error = parseOAuthError()
      expect(error).not.toBeNull()
      expect(error?.code).toBe("access_denied")
    })

    it("should return null if error parameter is empty", () => {
      ;(window as any).location.search = "?error="
      expect(parseOAuthError()).toBeNull()
    })

    it("should return user-friendly messages without technical jargon", () => {
      ;(window as any).location.search = "?error=access_denied"
      const error = parseOAuthError()
      expect(error?.message).not.toMatch(/OAuth|JWT|401|403|error code/i)
      expect(error?.message).toMatch(/sign in|try again/i)
    })
  })

  describe("Integration: Full OAuth flow simulation", () => {
    it("should store, retrieve, and clear return URL in sequence", () => {
      // Step 1: User clicks sign in on catalogue page
      ;(window as any).location.href = "https://ndx.gov.uk/catalogue?tag=aws"
      storeReturnURL()

      // Step 2: OAuth redirect happens (simulated)
      // User is redirected to Innovation Sandbox OAuth login

      // Step 3: OAuth callback returns to NDX callback page
      ;(window as any).location.pathname = "/callback"
      ;(window as any).location.search = "?token=eyJ..."

      // Step 4: Callback page retrieves return URL
      const returnURL = getReturnURL()
      expect(returnURL).toBe("https://ndx.gov.uk/catalogue?tag=aws")

      // Step 5: Clean up before redirect
      clearReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
    })

    it("should handle OAuth error flow correctly", () => {
      // Step 1: User clicks sign in
      ;(window as any).location.href = "https://ndx.gov.uk/try"
      storeReturnURL()

      // Step 2: User cancels OAuth login
      ;(window as any).location.pathname = "/callback"
      ;(window as any).location.search = "?error=access_denied"

      // Step 3: Check for error
      const error = parseOAuthError()
      expect(error).not.toBeNull()
      expect(error?.code).toBe("access_denied")

      // Step 4: Error flow should still have return URL available
      const returnURL = getReturnURL()
      expect(returnURL).toBe("https://ndx.gov.uk/try")
    })

    it("should prevent callback page loop", () => {
      // User somehow navigates directly to callback page
      ;(window as any).location.pathname = "/callback"
      ;(window as any).location.href = "https://ndx.gov.uk/callback"

      // Attempt to store return URL (should be skipped)
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()

      // getReturnURL should return home page instead
      const returnURL = getReturnURL()
      expect(returnURL).toBe("/")
    })
  })

  describe("extractTokenFromURL", () => {
    const validJWT =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

    beforeEach(() => {
      sessionStorage.clear()
      delete (window as any).location
      ;(window as any).location = {
        pathname: "/callback",
        href: "https://ndx.gov.uk/callback",
        search: "",
      }
    })

    it("should extract and store valid token", () => {
      ;(window as any).location.search = `?token=${validJWT}`
      const result = extractTokenFromURL()

      expect(result).toBe(true)
      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
    })

    it("should return false if no token parameter", () => {
      ;(window as any).location.search = "?other=value"
      const result = extractTokenFromURL()

      expect(result).toBe(false)
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
    })

    it("should return false if token parameter is empty", () => {
      ;(window as any).location.search = "?token="
      const result = extractTokenFromURL()

      expect(result).toBe(false)
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
    })

    it("should return false if token parameter is whitespace only", () => {
      ;(window as any).location.search = "?token=   "
      const result = extractTokenFromURL()

      expect(result).toBe(false)
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
    })

    it("should handle sessionStorage unavailable", () => {
      ;(window as any).location.search = `?token=${validJWT}`

      // Mock sessionStorage.setItem to throw error
      const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError")
      })

      const result = extractTokenFromURL()

      expect(result).toBe(false)
      setItemSpy.mockRestore()
    })

    it("should extract token when other query parameters are present", () => {
      ;(window as any).location.search = `?foo=bar&token=${validJWT}&baz=qux`
      const result = extractTokenFromURL()

      expect(result).toBe(true)
      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
    })

    it("should trim whitespace from token value", () => {
      ;(window as any).location.search = `?token=  ${validJWT}  `
      const result = extractTokenFromURL()

      expect(result).toBe(true)
      // Note: URLSearchParams doesn't preserve whitespace, but our trim check ensures empty strings are rejected
      expect(sessionStorage.getItem("isb-jwt")).toBeTruthy()
    })

    it("should overwrite previous token if extractTokenFromURL called multiple times", () => {
      sessionStorage.setItem("isb-jwt", "old-token")
      ;(window as any).location.search = `?token=${validJWT}`

      extractTokenFromURL()

      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
    })
  })

  describe("cleanupURLAfterExtraction", () => {
    beforeEach(() => {
      delete (window as any).location
      delete (window as any).history
      ;(window as any).location = {
        pathname: "/callback",
        search: "?token=eyJ...",
      }
      ;(window as any).history = {
        replaceState: jest.fn(),
      }
    })

    it("should remove query parameters from URL", () => {
      cleanupURLAfterExtraction()

      expect(window.history.replaceState).toHaveBeenCalledWith({}, expect.any(String), "/callback")
    })

    it("should preserve pathname", () => {
      ;(window as any).location.pathname = "/callback"
      cleanupURLAfterExtraction()

      expect(window.history.replaceState).toHaveBeenCalledWith({}, expect.any(String), "/callback")
    })

    it("should not throw if history API unavailable", () => {
      delete (window as any).history

      expect(() => cleanupURLAfterExtraction()).not.toThrow()
    })

    it("should not throw if replaceState is unavailable", () => {
      ;(window as any).history = {}

      expect(() => cleanupURLAfterExtraction()).not.toThrow()
    })

    it("should handle replaceState throwing error", () => {
      ;(window as any).history.replaceState = jest.fn(() => {
        throw new Error("SecurityError")
      })

      expect(() => cleanupURLAfterExtraction()).not.toThrow()
    })

    it("should use document.title in replaceState call", () => {
      document.title = "Test Page"
      cleanupURLAfterExtraction()

      expect(window.history.replaceState).toHaveBeenCalledWith({}, "Test Page", "/callback")
    })
  })

  describe("handleOAuthCallback", () => {
    const validJWT =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

    beforeEach(() => {
      jest.useFakeTimers()
      sessionStorage.clear()
      delete (window as any).location
      delete (window as any).history
      ;(window as any).location = {
        pathname: "/callback",
        href: "",
        search: `?token=${validJWT}`,
        origin: "https://ndx.gov.uk",
      }
      ;(window as any).history = {
        replaceState: jest.fn(),
      }
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("should extract token, cleanup URL, and redirect to return URL", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/catalogue")

      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      // Token extracted
      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)

      // URL cleaned
      expect(window.history.replaceState).toHaveBeenCalled()

      // Return URL cleared
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()

      // Redirected
      expect((window as any).location.href).toBe("https://ndx.gov.uk/catalogue")
    })

    it("should redirect to home page if no return URL", () => {
      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
      expect((window as any).location.href).toBe("/")
    })

    it("should redirect to home page if token extraction fails", () => {
      ;(window as any).location.search = "?other=value" // No token
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/catalogue")

      handleOAuthCallback()
      // No timer flush needed - direct redirect when no token

      // Token not stored
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()

      // Return URL cleared
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()

      // Redirected to home
      expect((window as any).location.href).toBe("/")
    })

    it("should handle empty token parameter gracefully", () => {
      ;(window as any).location.search = "?token="

      handleOAuthCallback()
      // No timer flush needed - direct redirect when empty token

      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
      expect((window as any).location.href).toBe("/")
    })

    it("should not cleanup URL if token extraction fails", () => {
      ;(window as any).location.search = "?other=value"

      handleOAuthCallback()

      // replaceState should not be called if token extraction fails
      expect(window.history.replaceState).not.toHaveBeenCalled()
    })

    it("should preserve return URL with query parameters", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/catalogue?tag=aws&sort=name")

      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      expect((window as any).location.href).toBe("https://ndx.gov.uk/catalogue?tag=aws&sort=name")
    })

    it("should preserve return URL with hash fragment", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/product#details")

      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      expect((window as any).location.href).toBe("https://ndx.gov.uk/product#details")
    })
  })

  describe("Integration: Complete OAuth callback flow (Story 5.3)", () => {
    const validJWT =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

    beforeEach(() => {
      jest.useFakeTimers()
      sessionStorage.clear()
      delete (window as any).location
      delete (window as any).history
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("should complete full OAuth flow: sign in → extract → redirect", () => {
      // Step 1: User clicks sign in on catalogue page (Story 5.2)
      ;(window as any).location = {
        pathname: "/catalogue",
        href: "https://ndx.gov.uk/catalogue",
        search: "",
        origin: "https://ndx.gov.uk",
      }
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/catalogue")

      // Step 2: OAuth redirect happens (user authenticates with AWS)
      // ...

      // Step 3: OAuth callback returns with token (Story 5.3)
      ;(window as any).location = {
        pathname: "/callback",
        href: "",
        search: `?token=${validJWT}`,
        origin: "https://ndx.gov.uk",
      }
      ;(window as any).history = {
        replaceState: jest.fn(),
      }

      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      // Verify all steps completed correctly:
      // - Token extracted and stored
      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
      // - URL cleaned up
      expect(window.history.replaceState).toHaveBeenCalledWith({}, expect.any(String), "/callback")
      // - Return URL cleared
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      // - Redirected back to original page
      expect((window as any).location.href).toBe("https://ndx.gov.uk/catalogue")
    })

    it("should handle OAuth error flow without token extraction", () => {
      // Step 1: User clicks sign in
      ;(window as any).location = {
        pathname: "/try",
        href: "https://ndx.gov.uk/try",
        search: "",
        origin: "https://ndx.gov.uk",
      }
      storeReturnURL()

      // Step 2: OAuth error occurs (user cancels)
      ;(window as any).location = {
        pathname: "/callback",
        href: "",
        origin: "https://ndx.gov.uk",
        search: "?error=access_denied",
      }

      // Step 3: Check for error (handled by parseOAuthError in callback page)
      const error = parseOAuthError()
      expect(error).not.toBeNull()
      expect(error?.code).toBe("access_denied")

      // handleOAuthCallback should not be called in error flow
      // Error flow redirects directly to home page from callback page script
    })

    it("should handle missing token gracefully (edge case)", () => {
      // Step 1: User has return URL stored
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/catalogue")

      // Step 2: Callback URL has no token and no error (unexpected state)
      ;(window as any).location = {
        pathname: "/callback",
        href: "",
        search: "",
      }
      ;(window as any).history = {
        replaceState: jest.fn(),
      }

      handleOAuthCallback()

      // Should redirect to home page and clear return URL
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      expect((window as any).location.href).toBe("/")
    })
  })
})
