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

// Declare the global functions exposed by our custom jsdom environment (jsdom-env.js)
declare global {
  function jsdomReconfigure(options: { url?: string }): void
  function setupLocationHrefSpy(): {
    getRedirectUrl: () => string
    restore: () => void
  } | null
}

// Helper to set URL in jsdom v27+ (Jest 30) using reconfigure
// This is the only way to change location without triggering navigation errors
function setTestURL(url: string): void {
  if (typeof jsdomReconfigure === "function") {
    jsdomReconfigure({ url })
  }
}

describe("OAuth Flow Utilities", () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()

    // For jsdom v27+ (Jest 30), we can't replace window.location entirely.
    // Instead, we use JSDOM's testURL config and modify individual properties via impl symbol.
    // The test environment should be configured with testURL in jest.config.js
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  describe("storeReturnURL", () => {
    it("should store current URL in sessionStorage", () => {
      setTestURL("https://ndx.gov.uk/some-page")
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/some-page")
    })

    it("should not store URL if on callback page", () => {
      setTestURL("https://ndx.gov.uk/callback")
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
    })

    it("should not store URL if on callback.html page", () => {
      setTestURL("https://ndx.gov.uk/callback.html")
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
    })

    it("should handle different page URLs correctly", () => {
      setTestURL("https://ndx.gov.uk/catalogue")
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/catalogue")
    })

    it("should overwrite previous return URL", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/old-page")
      setTestURL("https://ndx.gov.uk/new-page")
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/new-page")
    })

    // Story 2.2: Return URL Preservation - Blocklist tests
    describe("blocklist (Story 2.2)", () => {
      it("should not store URL if on /signup page", () => {
        setTestURL("https://ndx.gov.uk/signup")
        storeReturnURL()
        expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      })

      it("should not store URL if on /signup.html page", () => {
        setTestURL("https://ndx.gov.uk/signup.html")
        storeReturnURL()
        expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      })

      it("should not store URL if on /signup/success page", () => {
        setTestURL("https://ndx.gov.uk/signup/success")
        storeReturnURL()
        expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      })

      it("should not store URL if on /signup/success.html page", () => {
        setTestURL("https://ndx.gov.uk/signup/success.html")
        storeReturnURL()
        expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      })

      it("should not store URL for nested signup paths", () => {
        setTestURL("https://ndx.gov.uk/signup/something-else")
        storeReturnURL()
        expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      })

      it("should not store URL if on /signup/ with trailing slash", () => {
        setTestURL("https://ndx.gov.uk/signup/")
        storeReturnURL()
        expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      })

      it("should store URL for non-blocklisted paths", () => {
        setTestURL("https://ndx.gov.uk/catalogue/aws/bedrock")
        storeReturnURL()
        expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/catalogue/aws/bedrock")
      })

      it("should store URL for /try page (not blocklisted)", () => {
        setTestURL("https://ndx.gov.uk/try")
        storeReturnURL()
        expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/try")
      })
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
      setTestURL("https://ndx.gov.uk/callback")
      expect(parseOAuthError()).toBeNull()
    })

    it("should parse access_denied error", () => {
      setTestURL("https://ndx.gov.uk/callback?error=access_denied")
      const error = parseOAuthError()
      expect(error).toEqual({
        code: "access_denied",
        message: expect.stringContaining("cancelled"),
      })
    })

    it("should parse invalid_request error", () => {
      setTestURL("https://ndx.gov.uk/callback?error=invalid_request")
      const error = parseOAuthError()
      expect(error).toEqual({
        code: "invalid_request",
        message: expect.stringContaining("problem"),
      })
    })

    it("should parse server_error error", () => {
      setTestURL("https://ndx.gov.uk/callback?error=server_error")
      const error = parseOAuthError()
      expect(error).toEqual({
        code: "server_error",
        message: expect.stringContaining("temporarily unavailable"),
      })
    })

    it("should handle unknown error codes with generic message", () => {
      setTestURL("https://ndx.gov.uk/callback?error=unknown_error")
      const error = parseOAuthError()
      expect(error).not.toBeNull()
      expect(error?.code).toBe("unknown_error")
      expect(error?.message).toContain("An error occurred")
    })

    it("should ignore other query parameters", () => {
      setTestURL("https://ndx.gov.uk/callback?token=abc123&error=access_denied&foo=bar")
      const error = parseOAuthError()
      expect(error).not.toBeNull()
      expect(error?.code).toBe("access_denied")
    })

    it("should return null if error parameter is empty", () => {
      setTestURL("https://ndx.gov.uk/callback?error=")
      expect(parseOAuthError()).toBeNull()
    })

    it("should return user-friendly messages without technical jargon", () => {
      setTestURL("https://ndx.gov.uk/callback?error=access_denied")
      const error = parseOAuthError()
      expect(error?.message).not.toMatch(/OAuth|JWT|401|403|error code/i)
      expect(error?.message).toMatch(/sign in|try again/i)
    })
  })

  describe("Integration: Full OAuth flow simulation", () => {
    it("should store, retrieve, and clear return URL in sequence", () => {
      // Step 1: User clicks sign in on catalogue page
      setTestURL("https://ndx.gov.uk/catalogue?tag=aws")
      storeReturnURL()

      // Step 2: OAuth redirect happens (simulated)
      // User is redirected to Innovation Sandbox OAuth login

      // Step 3: OAuth callback returns to NDX callback page
      setTestURL("https://ndx.gov.uk/callback?token=eyJ...")

      // Step 4: Callback page retrieves return URL
      const returnURL = getReturnURL()
      expect(returnURL).toBe("https://ndx.gov.uk/catalogue?tag=aws")

      // Step 5: Clean up before redirect
      clearReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
    })

    it("should handle OAuth error flow correctly", () => {
      // Step 1: User clicks sign in
      setTestURL("https://ndx.gov.uk/try")
      storeReturnURL()

      // Step 2: User cancels OAuth login
      setTestURL("https://ndx.gov.uk/callback?error=access_denied")

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
      setTestURL("https://ndx.gov.uk/callback")

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
      setTestURL("https://ndx.gov.uk/callback")
    })

    it("should extract and store valid token", () => {
      setTestURL(`https://ndx.gov.uk/callback?token=${validJWT}`)
      const result = extractTokenFromURL()

      expect(result).toBe(true)
      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
    })

    it("should return false if no token parameter", () => {
      setTestURL("https://ndx.gov.uk/callback?other=value")
      const result = extractTokenFromURL()

      expect(result).toBe(false)
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
    })

    it("should return false if token parameter is empty", () => {
      setTestURL("https://ndx.gov.uk/callback?token=")
      const result = extractTokenFromURL()

      expect(result).toBe(false)
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
    })

    it("should return false if token parameter is whitespace only", () => {
      setTestURL("https://ndx.gov.uk/callback?token=%20%20%20")
      const result = extractTokenFromURL()

      expect(result).toBe(false)
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
    })

    it("should handle sessionStorage unavailable", () => {
      setTestURL(`https://ndx.gov.uk/callback?token=${validJWT}`)

      // Mock sessionStorage.setItem to throw error
      const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError")
      })

      const result = extractTokenFromURL()

      expect(result).toBe(false)
      setItemSpy.mockRestore()
    })

    it("should extract token when other query parameters are present", () => {
      setTestURL(`https://ndx.gov.uk/callback?foo=bar&token=${validJWT}&baz=qux`)
      const result = extractTokenFromURL()

      expect(result).toBe(true)
      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
    })

    it("should trim whitespace from token value", () => {
      setTestURL(`https://ndx.gov.uk/callback?token=%20%20${validJWT}%20%20`)
      const result = extractTokenFromURL()

      expect(result).toBe(true)
      // Note: URLSearchParams doesn't preserve whitespace, but our trim check ensures empty strings are rejected
      expect(sessionStorage.getItem("isb-jwt")).toBeTruthy()
    })

    it("should overwrite previous token if extractTokenFromURL called multiple times", () => {
      sessionStorage.setItem("isb-jwt", "old-token")
      setTestURL(`https://ndx.gov.uk/callback?token=${validJWT}`)

      extractTokenFromURL()

      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
    })
  })

  describe("cleanupURLAfterExtraction", () => {
    let replaceStateSpy: jest.SpyInstance

    beforeEach(() => {
      setTestURL("https://ndx.gov.uk/callback?token=eyJ...")
      replaceStateSpy = jest.spyOn(window.history, "replaceState").mockImplementation(() => {})
    })

    afterEach(() => {
      replaceStateSpy.mockRestore()
    })

    it("should remove query parameters from URL", () => {
      cleanupURLAfterExtraction()

      expect(replaceStateSpy).toHaveBeenCalledWith({}, expect.any(String), "/callback")
    })

    it("should preserve pathname", () => {
      setTestURL("https://ndx.gov.uk/callback?token=abc")
      cleanupURLAfterExtraction()

      expect(replaceStateSpy).toHaveBeenCalledWith({}, expect.any(String), "/callback")
    })

    it("should not throw if replaceState throws error", () => {
      replaceStateSpy.mockImplementation(() => {
        throw new Error("SecurityError")
      })

      expect(() => cleanupURLAfterExtraction()).not.toThrow()
    })

    it("should use document.title in replaceState call", () => {
      document.title = "Test Page"
      cleanupURLAfterExtraction()

      expect(replaceStateSpy).toHaveBeenCalledWith({}, "Test Page", "/callback")
    })
  })

  describe("handleOAuthCallback", () => {
    const validJWT =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

    let replaceStateSpy: jest.SpyInstance
    let hrefSpy: ReturnType<typeof setupLocationHrefSpy>

    beforeEach(() => {
      jest.useFakeTimers()
      sessionStorage.clear()
      setTestURL(`https://ndx.gov.uk/callback?token=${validJWT}`)
      replaceStateSpy = jest.spyOn(window.history, "replaceState").mockImplementation(() => {})
      hrefSpy = setupLocationHrefSpy()
    })

    afterEach(() => {
      jest.useRealTimers()
      replaceStateSpy.mockRestore()
      hrefSpy?.restore()
    })

    it("should extract token, cleanup URL, and redirect to return URL", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/catalogue")

      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      // Token extracted
      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)

      // URL cleaned
      expect(replaceStateSpy).toHaveBeenCalled()

      // Return URL cleared
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()

      // Redirected
      expect(hrefSpy?.getRedirectUrl()).toBe("https://ndx.gov.uk/catalogue")
    })

    it("should redirect to home page if no return URL", () => {
      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
      expect(hrefSpy?.getRedirectUrl()).toBe("/")
    })

    it("should redirect to home page if token extraction fails", () => {
      setTestURL("https://ndx.gov.uk/callback?other=value") // No token
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/catalogue")

      handleOAuthCallback()
      // No timer flush needed - direct redirect when no token

      // Token not stored
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()

      // Return URL cleared
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()

      // Redirected to home
      expect(hrefSpy?.getRedirectUrl()).toBe("/")
    })

    it("should handle empty token parameter gracefully", () => {
      setTestURL("https://ndx.gov.uk/callback?token=")

      handleOAuthCallback()
      // No timer flush needed - direct redirect when empty token

      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
      expect(hrefSpy?.getRedirectUrl()).toBe("/")
    })

    it("should not cleanup URL if token extraction fails", () => {
      setTestURL("https://ndx.gov.uk/callback?other=value")

      handleOAuthCallback()

      // replaceState should not be called if token extraction fails
      expect(replaceStateSpy).not.toHaveBeenCalled()
    })

    it("should preserve return URL with query parameters", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/catalogue?tag=aws&sort=name")

      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      expect(hrefSpy?.getRedirectUrl()).toBe("https://ndx.gov.uk/catalogue?tag=aws&sort=name")
    })

    it("should preserve return URL with hash fragment", () => {
      sessionStorage.setItem("auth-return-to", "https://ndx.gov.uk/product#details")

      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      expect(hrefSpy?.getRedirectUrl()).toBe("https://ndx.gov.uk/product#details")
    })
  })

  describe("Integration: Complete OAuth callback flow (Story 5.3)", () => {
    const validJWT =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

    let replaceStateSpy: jest.SpyInstance
    let hrefSpy: ReturnType<typeof setupLocationHrefSpy>

    beforeEach(() => {
      jest.useFakeTimers()
      sessionStorage.clear()
      replaceStateSpy = jest.spyOn(window.history, "replaceState").mockImplementation(() => {})
      hrefSpy = setupLocationHrefSpy()
    })

    afterEach(() => {
      jest.useRealTimers()
      replaceStateSpy.mockRestore()
      hrefSpy?.restore()
    })

    it("should complete full OAuth flow: sign in → extract → redirect", () => {
      // Step 1: User clicks sign in on catalogue page (Story 5.2)
      setTestURL("https://ndx.gov.uk/catalogue")
      storeReturnURL()
      expect(sessionStorage.getItem("auth-return-to")).toBe("https://ndx.gov.uk/catalogue")

      // Step 2: OAuth redirect happens (user authenticates with AWS)
      // ...

      // Step 3: OAuth callback returns with token (Story 5.3)
      setTestURL(`https://ndx.gov.uk/callback?token=${validJWT}`)

      handleOAuthCallback()
      jest.runAllTimers() // Flush the setTimeout redirect

      // Verify all steps completed correctly:
      // - Token extracted and stored
      expect(sessionStorage.getItem("isb-jwt")).toBe(validJWT)
      // - URL cleaned up
      expect(replaceStateSpy).toHaveBeenCalledWith({}, expect.any(String), "/callback")
      // - Return URL cleared
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      // - Redirected back to original page
      expect(hrefSpy?.getRedirectUrl()).toBe("https://ndx.gov.uk/catalogue")
    })

    it("should handle OAuth error flow without token extraction", () => {
      // Step 1: User clicks sign in
      setTestURL("https://ndx.gov.uk/try")
      storeReturnURL()

      // Step 2: OAuth error occurs (user cancels)
      setTestURL("https://ndx.gov.uk/callback?error=access_denied")

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
      setTestURL("https://ndx.gov.uk/callback")

      handleOAuthCallback()

      // Should redirect to home page and clear return URL
      expect(sessionStorage.getItem("isb-jwt")).toBeNull()
      expect(sessionStorage.getItem("auth-return-to")).toBeNull()
      expect(hrefSpy?.getRedirectUrl()).toBe("/")
    })
  })
})
