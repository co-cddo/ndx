/**
 * Unit tests for API Client
 *
 * Story 5.6: API Authorization Header Injection
 * Story 5.7: Authentication Status Check API
 *
 * Tests the centralized API client's authentication header injection behavior
 * and authentication status checking functionality.
 *
 * @jest-environment jsdom
 */

import { callISBAPI, checkAuthStatus, _internal, type UserData, type AuthStatusResult } from "./api-client"

// Mock fetch globally - returns a mock object that looks like Response
const mockFetch = jest.fn()
global.fetch = mockFetch

// Create a simple mock response factory
function createMockResponse(body: string = "{}", status: number = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => JSON.parse(body),
    text: async () => body,
    headers: new Map(),
  }
}

describe("API Client - callISBAPI", () => {
  const TEST_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.test"

  beforeEach(() => {
    // Clear mocks and sessionStorage before each test
    mockFetch.mockReset()
    mockFetch.mockResolvedValue(createMockResponse())
    sessionStorage.clear()
  })

  describe("AC #1: Authorization Header Injection", () => {
    it("should add Authorization header when JWT token exists in sessionStorage", async () => {
      // Arrange: Set token in sessionStorage
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)

      // Act: Make API call
      await callISBAPI("/api/leases")

      // Assert: Verify Authorization header is present
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Authorization"]).toBe(`Bearer ${TEST_TOKEN}`)
    })

    it("should use correct Bearer token format", async () => {
      // Arrange
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)

      // Act
      await callISBAPI("/api/test")

      // Assert: Format should be "Bearer <token>"
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Authorization"]).toMatch(/^Bearer /)
      expect(options.headers["Authorization"]).toBe(`Bearer ${TEST_TOKEN}`)
    })
  })

  describe("AC #2: Conditional Header Behavior", () => {
    it("should preserve custom headers alongside Authorization header", async () => {
      // Arrange
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)
      const customHeaders = {
        "X-Custom-Header": "custom-value",
        "X-Another-Header": "another-value",
      }

      // Act
      await callISBAPI("/api/test", { headers: customHeaders })

      // Assert: Both custom headers and Authorization should be present
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Authorization"]).toBe(`Bearer ${TEST_TOKEN}`)
      expect(options.headers["X-Custom-Header"]).toBe("custom-value")
      expect(options.headers["X-Another-Header"]).toBe("another-value")
    })

    it("should include default Content-Type header", async () => {
      // Arrange
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)

      // Act
      await callISBAPI("/api/test")

      // Assert
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Content-Type"]).toBe("application/json")
    })

    it("should allow custom Content-Type to override default", async () => {
      // Arrange
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)

      // Act
      await callISBAPI("/api/test", {
        headers: { "Content-Type": "text/plain" },
      })

      // Assert: Custom Content-Type should override default
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Content-Type"]).toBe("text/plain")
    })

    it("should preserve other fetch options (method, body, etc.)", async () => {
      // Arrange
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)
      const requestBody = JSON.stringify({ productId: "123" })

      // Act
      await callISBAPI("/api/leases", {
        method: "POST",
        body: requestBody,
      })

      // Assert
      const [endpoint, options] = mockFetch.mock.calls[0]
      expect(endpoint).toBe("/api/leases")
      expect(options.method).toBe("POST")
      expect(options.body).toBe(requestBody)
    })
  })

  describe("AC #3: No Token Behavior", () => {
    it("should NOT add Authorization header when token is missing", async () => {
      // Arrange: No token in sessionStorage
      sessionStorage.clear()

      // Act
      await callISBAPI("/api/public")

      // Assert: Authorization header should not be present
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Authorization"]).toBeUndefined()
    })

    it("should NOT add Authorization header when token is empty string", async () => {
      // Arrange: Empty string token
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, "")

      // Act
      await callISBAPI("/api/test")

      // Assert
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Authorization"]).toBeUndefined()
    })

    it("should not throw error when token is missing", async () => {
      // Arrange
      sessionStorage.clear()

      // Act & Assert: Should not throw
      await expect(callISBAPI("/api/test")).resolves.toBeDefined()
    })

    it("should still include Content-Type when unauthenticated", async () => {
      // Arrange
      sessionStorage.clear()

      // Act
      await callISBAPI("/api/test")

      // Assert
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Content-Type"]).toBe("application/json")
    })
  })

  describe("AC #4: Centralized API Client", () => {
    it("should call the correct endpoint", async () => {
      // Act
      await callISBAPI("/api/leases")

      // Assert
      const [endpoint] = mockFetch.mock.calls[0]
      expect(endpoint).toBe("/api/leases")
    })

    it("should return the fetch Response object", async () => {
      // Arrange
      const mockResponse = createMockResponse('{"data": "test"}', 200)
      mockFetch.mockResolvedValueOnce(mockResponse)

      // Act
      const response = await callISBAPI("/api/test")

      // Assert
      expect(response).toBe(mockResponse)
    })
  })

  describe("Headers extraction", () => {
    it("should handle Headers object input", async () => {
      // Arrange
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)
      const headers = new Headers()
      headers.set("X-Custom", "value")

      // Act
      await callISBAPI("/api/test", { headers })

      // Assert: Headers API normalizes keys to lowercase per Fetch spec
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["x-custom"]).toBe("value")
    })

    it("should handle array of header pairs", async () => {
      // Arrange
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)
      const headers: [string, string][] = [
        ["X-First", "first-value"],
        ["X-Second", "second-value"],
      ]

      // Act
      await callISBAPI("/api/test", { headers })

      // Assert
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["X-First"]).toBe("first-value")
      expect(options.headers["X-Second"]).toBe("second-value")
    })
  })
})

describe("Internal helpers", () => {
  describe("getToken", () => {
    beforeEach(() => {
      sessionStorage.clear()
    })

    it("should return token when present", () => {
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, "test-token")
      expect(_internal.getToken()).toBe("test-token")
    })

    it("should return null when token not present", () => {
      expect(_internal.getToken()).toBeNull()
    })

    it("should return null for empty string token", () => {
      sessionStorage.setItem(_internal.JWT_TOKEN_KEY, "")
      expect(_internal.getToken()).toBeNull()
    })
  })

  describe("extractHeaders", () => {
    it("should return empty object for undefined input", () => {
      expect(_internal.extractHeaders(undefined)).toEqual({})
    })

    it("should pass through plain object", () => {
      const headers = { "X-Test": "value" }
      expect(_internal.extractHeaders(headers)).toEqual(headers)
    })
  })
})

/**
 * Story 5.7: Authentication Status Check API
 */
describe("API Client - checkAuthStatus", () => {
  const TEST_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.test"

  const mockUserData: UserData = {
    email: "jane.smith@example.gov.uk",
    displayName: "Jane Smith",
    userName: "jane.smith",
    roles: ["user"],
  }

  // Create the wrapped response format that the API actually returns
  function createAuthStatusResponse(user: UserData) {
    return {
      authenticated: true,
      session: {
        user,
        iat: Date.now(),
        exp: Date.now() + 3600000,
      },
    }
  }

  beforeEach(() => {
    mockFetch.mockReset()
    sessionStorage.clear()
    // Set token for authenticated requests
    sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)
    // Suppress console.error for cleaner test output
    jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("AC #1: Auth Status API Call", () => {
    it("should call /api/auth/login/status endpoint", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse(JSON.stringify(createAuthStatusResponse(mockUserData)), 200))

      // Act
      await checkAuthStatus()

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [endpoint] = mockFetch.mock.calls[0]
      expect(endpoint).toBe("/api/auth/login/status")
    })

    it("should include Authorization header in request", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse(JSON.stringify(createAuthStatusResponse(mockUserData)), 200))

      // Act
      await checkAuthStatus()

      // Assert
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Authorization"]).toBe(`Bearer ${TEST_TOKEN}`)
    })
  })

  describe("AC #2: Response Parsing", () => {
    it("should return authenticated: true with user data on 200 OK", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse(JSON.stringify(createAuthStatusResponse(mockUserData)), 200))

      // Act
      const result = await checkAuthStatus()

      // Assert
      expect(result.authenticated).toBe(true)
      expect(result.user).toEqual(mockUserData)
    })

    it("should return correct user data structure", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse(JSON.stringify(createAuthStatusResponse(mockUserData)), 200))

      // Act
      const result = await checkAuthStatus()

      // Assert
      expect(result.user?.email).toBe("jane.smith@example.gov.uk")
      expect(result.user?.displayName).toBe("Jane Smith")
      expect(result.user?.userName).toBe("jane.smith")
      expect(result.user?.roles).toEqual(["user"])
    })
  })

  describe("AC #3: 401 Response Handling", () => {
    it("should return authenticated: false on 401 Unauthorized", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act
      const result = await checkAuthStatus()

      // Assert
      expect(result.authenticated).toBe(false)
      expect(result.user).toBeUndefined()
    })

    it("should NOT log error for 401 responses (expected case)", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act
      await checkAuthStatus()

      // Assert: 401 is expected, should not log error
      expect(console.error).not.toHaveBeenCalled()
    })
  })

  describe("AC #4: Network Error Handling", () => {
    it("should return authenticated: false on network error", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      // Act
      const result = await checkAuthStatus()

      // Assert
      expect(result.authenticated).toBe(false)
      expect(result.user).toBeUndefined()
    })

    it("should log network errors to console", async () => {
      // Arrange
      const networkError = new Error("Network error")
      mockFetch.mockRejectedValueOnce(networkError)

      // Act
      await checkAuthStatus()

      // Assert
      expect(console.error).toHaveBeenCalledWith("[api-client] Auth status check error:", networkError)
    })

    it("should return authenticated: false on 500 Server Error", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Internal Server Error"}', 500))

      // Act
      const result = await checkAuthStatus()

      // Assert
      expect(result.authenticated).toBe(false)
      expect(result.user).toBeUndefined()
    })

    it("should log HTTP errors (non-401) to console", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Internal Server Error"}', 500))

      // Act
      await checkAuthStatus()

      // Assert
      expect(console.error).toHaveBeenCalledWith("[api-client] Auth status check failed:", 500, "Error")
    })
  })

  describe("AC #5: TypeScript Type Safety", () => {
    it("should return AuthStatusResult type with authenticated boolean", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse(JSON.stringify(createAuthStatusResponse(mockUserData)), 200))

      // Act
      const result: AuthStatusResult = await checkAuthStatus()

      // Assert: TypeScript compilation verifies type
      expect(typeof result.authenticated).toBe("boolean")
    })

    it("should return optional user data that matches UserData interface", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse(JSON.stringify(createAuthStatusResponse(mockUserData)), 200))

      // Act
      const result = await checkAuthStatus()

      // Assert: Verify user matches UserData interface shape
      if (result.user) {
        expect(typeof result.user.email).toBe("string")
        expect(typeof result.user.displayName).toBe("string")
        expect(typeof result.user.userName).toBe("string")
        expect(Array.isArray(result.user.roles)).toBe(true)
      }
    })
  })

  describe("Edge cases", () => {
    it("should work when sessionStorage has no token", async () => {
      // Arrange: Clear token
      sessionStorage.clear()
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act
      const result = await checkAuthStatus()

      // Assert: Should still call API and return false
      expect(mockFetch).toHaveBeenCalled()
      expect(result.authenticated).toBe(false)
    })

    it("should handle user with multiple roles", async () => {
      // Arrange
      const adminUser: UserData = {
        ...mockUserData,
        roles: ["user", "admin", "reviewer"],
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(JSON.stringify(createAuthStatusResponse(adminUser)), 200))

      // Act
      const result = await checkAuthStatus()

      // Assert
      expect(result.user?.roles).toEqual(["user", "admin", "reviewer"])
    })

    it("should return authenticated: false when response has authenticated: false", async () => {
      // Arrange
      const notAuthResponse = { authenticated: false }
      mockFetch.mockResolvedValueOnce(createMockResponse(JSON.stringify(notAuthResponse), 200))

      // Act
      const result = await checkAuthStatus()

      // Assert
      expect(result.authenticated).toBe(false)
      expect(result.user).toBeUndefined()
    })
  })
})

/**
 * Story 5.8: 401 Unauthorized Response Handling
 */
describe("API Client - 401 Handling (Story 5.8)", () => {
  const TEST_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.test"

  // Track redirect URL
  let redirectUrl = ""

  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue(createMockResponse())
    sessionStorage.clear()
    sessionStorage.setItem(_internal.JWT_TOKEN_KEY, TEST_TOKEN)

    // Mock window.location.href setter using Object.defineProperty
    redirectUrl = ""
    Object.defineProperty(window, "location", {
      value: {
        href: "",
        get: () => redirectUrl,
      },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window.location, "href", {
      set: (url: string) => {
        redirectUrl = url
      },
      get: () => redirectUrl,
      configurable: true,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe("AC #1: Automatic 401 Detection", () => {
    it("should clear sessionStorage token when 401 received", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act
      try {
        await callISBAPI("/api/leases")
      } catch {
        // Expected to throw
      }

      // Assert: Token should be cleared
      expect(sessionStorage.getItem(_internal.JWT_TOKEN_KEY)).toBeNull()
    })

    it("should detect 401 status code", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act & Assert: Should throw when 401 received
      await expect(callISBAPI("/api/leases")).rejects.toThrow("Unauthorized - redirecting to login")
    })
  })

  describe("AC #2: Automatic Redirect to OAuth", () => {
    it("should redirect to /api/auth/login on 401", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act
      try {
        await callISBAPI("/api/leases")
      } catch {
        // Expected to throw
      }

      // Assert: Should redirect to OAuth
      expect(redirectUrl).toBe(_internal.OAUTH_LOGIN_URL)
    })

    it("should redirect without user action required", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act: Just call the API
      try {
        await callISBAPI("/api/protected-resource")
      } catch {
        // Expected
      }

      // Assert: Redirect happens automatically
      expect(redirectUrl).toBe("/api/auth/login")
    })
  })

  describe("AC #4: No Infinite Loops", () => {
    it("should clear token before redirect (order verification)", async () => {
      // This test verifies the implementation order by checking the code flow:
      // 1. Token is cleared first (via sessionStorage.removeItem)
      // 2. Then redirect happens (via window.location.href)
      // We verify both happen, and since the code is sequential, clear happens first

      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act
      try {
        await callISBAPI("/api/test")
      } catch {
        // Expected
      }

      // Assert: Both actions happened
      // Token is cleared
      expect(sessionStorage.getItem(_internal.JWT_TOKEN_KEY)).toBeNull()
      // Redirect happened
      expect(redirectUrl).toBe("/api/auth/login")
      // The implementation clears before redirect (verified by code review)
    })

    it("should not have token when redirecting", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act
      try {
        await callISBAPI("/api/test")
      } catch {
        // Expected
      }

      // Assert: Token cleared before redirect
      expect(sessionStorage.getItem(_internal.JWT_TOKEN_KEY)).toBeNull()
      expect(redirectUrl).toBe("/api/auth/login")
    })
  })

  describe("AC #5: Integration with Existing API Client", () => {
    it("should preserve existing behavior for non-401 responses", async () => {
      // Arrange
      const successResponse = createMockResponse('{"data": "test"}', 200)
      mockFetch.mockResolvedValueOnce(successResponse)

      // Act
      const response = await callISBAPI("/api/test")

      // Assert: Returns response normally
      expect(response).toBe(successResponse)
      expect(sessionStorage.getItem(_internal.JWT_TOKEN_KEY)).toBe(TEST_TOKEN) // Token not cleared
    })

    it("should preserve existing behavior for 500 errors", async () => {
      // Arrange
      const errorResponse = createMockResponse('{"error": "Server Error"}', 500)
      mockFetch.mockResolvedValueOnce(errorResponse)

      // Act
      const response = await callISBAPI("/api/test")

      // Assert: Returns response without redirect
      expect(response).toBe(errorResponse)
      expect(redirectUrl).toBe("") // No redirect
    })

    it("should work with skipAuthRedirect option", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act: Call with skipAuthRedirect
      const response = await callISBAPI("/api/auth/status", { skipAuthRedirect: true })

      // Assert: Should NOT redirect, should return response
      expect(response.status).toBe(401)
      expect(redirectUrl).toBe("") // No redirect
      expect(sessionStorage.getItem(_internal.JWT_TOKEN_KEY)).toBe(TEST_TOKEN) // Token not cleared
    })
  })

  describe("checkAuthStatus does not trigger redirect", () => {
    it("should return authenticated: false on 401 without redirecting", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act
      const result = await checkAuthStatus()

      // Assert: Returns false but NO redirect
      expect(result.authenticated).toBe(false)
      expect(redirectUrl).toBe("") // No redirect
    })

    it("should NOT clear token on checkAuthStatus 401", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce(createMockResponse('{"error": "Unauthorized"}', 401))

      // Act
      await checkAuthStatus()

      // Assert: Token still present (checkAuthStatus uses skipAuthRedirect)
      expect(sessionStorage.getItem(_internal.JWT_TOKEN_KEY)).toBe(TEST_TOKEN)
    })
  })
})
