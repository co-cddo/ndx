/**
 * Unit tests for Configurations Service
 *
 * Story 6.7: Fetch and display AUP from Innovation Sandbox API
 *
 * @jest-environment jsdom
 */

import { fetchConfigurations, getFallbackAup, clearConfigurationCache } from "./configurations-service"
import { callISBAPI } from "./api-client"

// Mock the api-client module
jest.mock("./api-client", () => ({
  callISBAPI: jest.fn(),
}))

const mockCallISBAPI = callISBAPI as jest.MockedFunction<typeof callISBAPI>

describe("Configurations Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear cache between tests to ensure isolation
    clearConfigurationCache()
  })

  describe("fetchConfigurations", () => {
    describe("Success scenarios", () => {
      it("should fetch configurations from nested JSend response", async () => {
        // This is the actual API response format
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                termsOfService: "Test AUP content from nested data",
                leases: {
                  maxLeasesPerUser: 3,
                  maxDurationHours: 48,
                  maxBudget: 50,
                },
              },
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(true)
        expect(result.data?.aup).toBe("Test AUP content from nested data")
        expect(result.data?.maxLeases).toBe(3)
        expect(result.data?.leaseDuration).toBe(48)
      })

      it("should call API with correct endpoint and options", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                termsOfService: "AUP",
                leases: { maxLeasesPerUser: 5, maxDurationHours: 24 },
              },
            }),
        } as Response)

        await fetchConfigurations()

        expect(mockCallISBAPI).toHaveBeenCalledWith("/api/configurations", {
          method: "GET",
          signal: expect.any(AbortSignal),
          skipAuthRedirect: true,
        })
      })

      it("should use nested data.termsOfService field for AUP", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                termsOfService: "AUP from nested termsOfService",
              },
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.data?.aup).toBe("AUP from nested termsOfService")
      })

      it("should use nested data.aup as fallback when termsOfService is missing", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                aup: "AUP from nested aup field",
              },
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.data?.aup).toBe("AUP from nested aup field")
      })

      it("should fallback to flat termsOfService for legacy response format", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              termsOfService: "AUP from flat field",
              maxLeases: 5,
              leaseDuration: 24,
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.data?.aup).toBe("AUP from flat field")
      })

      it("should fallback to flat aup field for legacy response format", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              aup: "AUP from flat aup field",
              maxLeases: 5,
              leaseDuration: 24,
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.data?.aup).toBe("AUP from flat aup field")
      })

      it("should prefer nested data over flat fields when both present", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                termsOfService: "Preferred nested AUP",
              },
              termsOfService: "Flat AUP should be ignored",
              aup: "Flat aup should be ignored",
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.data?.aup).toBe("Preferred nested AUP")
      })

      it("should use default maxLeases when not in response", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                termsOfService: "AUP",
              },
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.data?.maxLeases).toBe(5) // Default value
      })

      it("should use default leaseDuration when not in response", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                termsOfService: "AUP",
                leases: {
                  maxLeasesPerUser: 3,
                },
              },
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.data?.leaseDuration).toBe(24) // Default value
      })

      it("should use fallback AUP when response has no AUP content", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                leases: { maxLeasesPerUser: 5 },
              },
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(true)
        expect(result.data?.aup).toContain("Acceptable Use Policy")
        expect(warnSpy).toHaveBeenCalledWith("[configurations-service] Invalid AUP in response, using fallback")
        warnSpy.mockRestore()
      })

      it("should use fallback AUP when AUP is not a string", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                termsOfService: { invalid: "object" },
              },
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(true)
        expect(result.data?.aup).toContain("Acceptable Use Policy")
        warnSpy.mockRestore()
      })

      it("should extract lease config from nested leases object", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                termsOfService: "AUP",
                leases: {
                  maxLeasesPerUser: 1,
                  maxDurationHours: 24,
                  maxBudget: 50,
                  requireMaxBudget: true,
                  requireMaxDuration: true,
                  ttl: 30,
                },
              },
            }),
        } as Response)

        const result = await fetchConfigurations()

        expect(result.data?.maxLeases).toBe(1)
        expect(result.data?.leaseDuration).toBe(24)
      })
    })

    describe("API errors", () => {
      it("should handle 401 Unauthorized", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Please sign in to continue.")
        errorSpy.mockRestore()
      })

      it("should handle 403 Forbidden", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toBe("You do not have permission to access this resource.")
        errorSpy.mockRestore()
      })

      it("should handle 404 Not Found", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Configuration not found. Please contact support.")
        errorSpy.mockRestore()
      })

      it("should handle 500 Server Error", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toBe("The sandbox service is temporarily unavailable. Please try again later.")
        errorSpy.mockRestore()
      })

      it("should handle 502 Bad Gateway", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 502,
          statusText: "Bad Gateway",
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toContain("temporarily unavailable")
        errorSpy.mockRestore()
      })

      it("should handle 503 Service Unavailable", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toContain("temporarily unavailable")
        errorSpy.mockRestore()
      })

      it("should handle 504 Gateway Timeout", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 504,
          statusText: "Gateway Timeout",
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toContain("temporarily unavailable")
        errorSpy.mockRestore()
      })

      it("should handle unknown status codes", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 418,
          statusText: "I'm a teapot",
        } as Response)

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toBe("An unexpected error occurred. Please try again.")
        errorSpy.mockRestore()
      })
    })

    describe("Network errors", () => {
      it("should handle abort timeout error", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        const abortError = new Error("The operation was aborted")
        abortError.name = "AbortError"
        mockCallISBAPI.mockRejectedValue(abortError)

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Request timed out. Please check your connection and try again.")
        expect(errorSpy).toHaveBeenCalledWith("[configurations-service] Request timeout")
        errorSpy.mockRestore()
      })

      it("should handle network errors", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockRejectedValue(new Error("Network error"))

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Unable to load configuration. Please try again.")
        expect(errorSpy).toHaveBeenCalledWith("[configurations-service] Fetch error:", "Network error")
        errorSpy.mockRestore()
      })

      it("should handle non-Error thrown values", async () => {
        mockCallISBAPI.mockRejectedValue("String error")

        const result = await fetchConfigurations()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Unable to load configuration. Please try again.")
      })
    })
  })

  describe("Caching", () => {
    it("should return cached result on subsequent calls", async () => {
      mockCallISBAPI.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: "success",
            data: {
              termsOfService: "Cached AUP content",
              leases: { maxLeasesPerUser: 5, maxDurationHours: 24 },
            },
          }),
      } as Response)

      // First call should hit API
      const result1 = await fetchConfigurations()
      expect(result1.success).toBe(true)
      expect(result1.data?.aup).toBe("Cached AUP content")
      expect(mockCallISBAPI).toHaveBeenCalledTimes(1)

      // Second call should return cached result
      const result2 = await fetchConfigurations()
      expect(result2.success).toBe(true)
      expect(result2.data?.aup).toBe("Cached AUP content")
      // API should not be called again
      expect(mockCallISBAPI).toHaveBeenCalledTimes(1)
    })

    it("should expire cache after TTL", async () => {
      jest.useFakeTimers()

      mockCallISBAPI.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: "success",
            data: {
              termsOfService: "Fresh AUP content",
              leases: { maxLeasesPerUser: 5, maxDurationHours: 24 },
            },
          }),
      } as Response)

      // First call
      await fetchConfigurations()
      expect(mockCallISBAPI).toHaveBeenCalledTimes(1)

      // Advance time by 31 seconds (past 30s TTL)
      jest.advanceTimersByTime(31_000)

      // Second call should hit API again
      await fetchConfigurations()
      expect(mockCallISBAPI).toHaveBeenCalledTimes(2)

      jest.useRealTimers()
    })

    it("should clear cache when clearConfigurationCache is called", async () => {
      mockCallISBAPI.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: "success",
            data: {
              termsOfService: "AUP content",
              leases: { maxLeasesPerUser: 5, maxDurationHours: 24 },
            },
          }),
      } as Response)

      // First call
      await fetchConfigurations()
      expect(mockCallISBAPI).toHaveBeenCalledTimes(1)

      // Clear cache
      clearConfigurationCache()

      // Second call should hit API again
      await fetchConfigurations()
      expect(mockCallISBAPI).toHaveBeenCalledTimes(2)
    })

    it("should not cache failed responses", async () => {
      // First call fails
      mockCallISBAPI.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({}),
      } as Response)

      const result1 = await fetchConfigurations()
      expect(result1.success).toBe(false)
      expect(mockCallISBAPI).toHaveBeenCalledTimes(1)

      // Setup successful response for second call
      mockCallISBAPI.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: "success",
            data: {
              termsOfService: "Now it works",
              leases: { maxLeasesPerUser: 5, maxDurationHours: 24 },
            },
          }),
      } as Response)

      // Second call should hit API again (failure not cached)
      const result2 = await fetchConfigurations()
      expect(result2.success).toBe(true)
      expect(result2.data?.aup).toBe("Now it works")
      expect(mockCallISBAPI).toHaveBeenCalledTimes(2)
    })
  })

  describe("getFallbackAup", () => {
    it("should return fallback AUP content", () => {
      const fallback = getFallbackAup()

      expect(fallback).toContain("Acceptable Use Policy")
      expect(fallback).toContain("NDX:Try")
      expect(fallback).toContain("evaluation and testing purposes")
    })

    it("should include key policy points", () => {
      const fallback = getFallbackAup()

      expect(fallback).toContain("sensitive, personal, or production data")
      expect(fallback).toContain("budget limit")
      expect(fallback).toContain("security incidents")
    })
  })
})
