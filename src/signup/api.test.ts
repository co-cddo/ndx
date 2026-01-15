/**
 * Signup Feature - API Client Tests
 *
 * Story 1.5: Tests for signup API client functions
 *
 * @module signup/api.test
 */

import { fetchDomains, submitSignup, _internal } from "./api"
import type { DomainInfo, ApiError, SignupResponse } from "./types"
import { SignupErrorCode } from "./types"

describe("signup/api", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn()
    jest.useFakeTimers()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.useRealTimers()
  })

  describe("fetchDomains", () => {
    it("should fetch and return domains on success", async () => {
      const mockDomains: DomainInfo[] = [
        { domain: "westbury.gov.uk", orgName: "Westbury District Council" },
        { domain: "example.gov.uk", orgName: "Example Council" },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ domains: mockDomains }),
      })

      const result = await fetchDomains()

      expect(result).toEqual(mockDomains)
      expect(global.fetch).toHaveBeenCalledWith(
        "/signup-api/domains",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      )
    })

    it("should throw error on non-ok response", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
      })

      await expect(fetchDomains()).rejects.toThrow("Failed to fetch domains: 503")
    })

    it("should throw error on invalid response format", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: "data" }),
      })

      await expect(fetchDomains()).rejects.toThrow("Invalid domains response format")
    })

    it("should throw error when domains array contains invalid items", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ domains: [{ invalid: "item" }] }),
      })

      await expect(fetchDomains()).rejects.toThrow("Invalid domains response format")
    })

    it("should not include CSRF header for GET request", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ domains: [] }),
      })

      await fetchDomains()

      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const headers = callArgs[1].headers
      expect(headers["X-NDX-Request"]).toBeUndefined()
    })
  })

  describe("submitSignup", () => {
    const validRequest = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.gov.uk",
      domain: "example.gov.uk",
    }

    it("should return success response on successful signup", async () => {
      const mockResponse: SignupResponse = {
        success: true,
        redirectUrl: "/signup/success",
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await submitSignup(validRequest)

      expect(result).toEqual(mockResponse)
    })

    it("should include CSRF header for POST request", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await submitSignup(validRequest)

      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const headers = callArgs[1].headers
      expect(headers["X-NDX-Request"]).toBe("signup-form")
    })

    it("should return ApiError on error response", async () => {
      const mockError: ApiError = {
        error: SignupErrorCode.DOMAIN_NOT_ALLOWED,
        message: "Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access.",
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => mockError,
      })

      const result = await submitSignup(validRequest)

      expect(result).toEqual(mockError)
    })

    it("should return USER_EXISTS error with redirectUrl", async () => {
      const mockError: ApiError = {
        error: SignupErrorCode.USER_EXISTS,
        message: "Welcome back! You already have an account.",
        redirectUrl: "/login",
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => mockError,
      })

      const result = await submitSignup(validRequest)

      expect(result).toEqual(mockError)
    })

    it("should throw error on invalid response format", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: "data" }),
      })

      await expect(submitSignup(validRequest)).rejects.toThrow("Invalid API response format")
    })

    it("should send correct request body", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await submitSignup(validRequest)

      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      expect(body).toEqual(validRequest)
    })
  })

  describe("isDomainsResponse", () => {
    const { isDomainsResponse } = _internal

    it("should return true for valid domains response", () => {
      expect(
        isDomainsResponse({
          domains: [{ domain: "test.gov.uk", orgName: "Test Council" }],
        }),
      ).toBe(true)
    })

    it("should return true for empty domains array", () => {
      expect(isDomainsResponse({ domains: [] })).toBe(true)
    })

    it("should return false for null", () => {
      expect(isDomainsResponse(null)).toBe(false)
    })

    it("should return false for missing domains field", () => {
      expect(isDomainsResponse({})).toBe(false)
    })

    it("should return false for non-array domains", () => {
      expect(isDomainsResponse({ domains: "not-an-array" })).toBe(false)
    })

    it("should return false for invalid domain items", () => {
      expect(isDomainsResponse({ domains: [{ wrong: "fields" }] })).toBe(false)
    })
  })

  describe("callSignupAPI timeout", () => {
    it("should use AbortController with correct timeout value", () => {
      // Verify the timeout constant is set correctly
      expect(_internal.API_TIMEOUT_MS).toBe(10000)
    })

    it("should pass signal to fetch", async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ domains: [] }),
      })

      await fetchDomains()

      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      expect(callArgs[1].signal).toBeDefined()
      expect(callArgs[1].signal).toBeInstanceOf(AbortSignal)
    })
  })
})
