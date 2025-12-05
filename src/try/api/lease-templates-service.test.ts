/**
 * Unit tests for Lease Templates Service
 *
 * Story 9.1: Create Lease Template Service
 *
 * Tests all 10 acceptance criteria:
 * AC-1: fetchLeaseTemplate calls correct endpoint
 * AC-2: Response parsed for leaseDurationInHours and maxSpend
 * AC-3: Returns typed LeaseTemplateResult
 * AC-4: 404 returns NOT_FOUND
 * AC-5: 401 triggers auth handling
 * AC-6: 500+ returns SERVER_ERROR
 * AC-7: Timeout returns TIMEOUT
 * AC-8: Invalid UUID rejected
 * AC-9: Concurrent calls deduplicated
 * AC-10: Missing fields logged as warning
 *
 * @jest-environment jsdom
 */

import { fetchLeaseTemplate, LeaseTemplateResult } from "./lease-templates-service"
import { callISBAPI } from "./api-client"
import { clearInFlightRequests } from "../utils/request-dedup"

// Mock the api-client module
jest.mock("./api-client", () => ({
  callISBAPI: jest.fn(),
}))

const mockCallISBAPI = callISBAPI as jest.MockedFunction<typeof callISBAPI>

// Valid UUID for testing
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"

describe("Lease Templates Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear request deduplication between tests
    clearInFlightRequests()
  })

  describe("fetchLeaseTemplate", () => {
    describe("Success scenarios (AC-1, AC-2, AC-3)", () => {
      it("AC-1: should call API with correct endpoint", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                uuid: VALID_UUID,
                name: "Test Template",
                leaseDurationInHours: 24,
                maxSpend: 50,
              },
            }),
        } as Response)

        await fetchLeaseTemplate(VALID_UUID)

        expect(mockCallISBAPI).toHaveBeenCalledWith(`/api/leaseTemplates/${VALID_UUID}`, {
          method: "GET",
          signal: expect.any(AbortSignal),
          skipAuthRedirect: true,
        })
      })

      it("AC-2: should parse leaseDurationInHours and maxSpend from response", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                uuid: VALID_UUID,
                name: "Custom Template",
                leaseDurationInHours: 48,
                maxSpend: 100,
              },
            }),
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(true)
        expect(result.data?.leaseDurationInHours).toBe(48)
        expect(result.data?.maxSpend).toBe(100)
      })

      it("AC-3: should return typed LeaseTemplateResult with success/data", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                uuid: VALID_UUID,
                name: "Named Template",
                leaseDurationInHours: 24,
                maxSpend: 50,
              },
            }),
        } as Response)

        const result: LeaseTemplateResult = await fetchLeaseTemplate(VALID_UUID)

        expect(result).toEqual({
          success: true,
          data: {
            leaseDurationInHours: 24,
            maxSpend: 50,
            name: "Named Template",
          },
        })
      })

      it("should handle response with optional name field present", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                uuid: VALID_UUID,
                name: "My Sandbox Template",
                leaseDurationInHours: 24,
                maxSpend: 50,
              },
            }),
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(true)
        expect(result.data?.name).toBe("My Sandbox Template")
      })

      it("should handle response with missing optional name field", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                uuid: VALID_UUID,
                leaseDurationInHours: 24,
                maxSpend: 50,
              },
            }),
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(true)
        expect(result.data?.name).toBeUndefined()
      })
    })

    describe("Error handling (AC-4, AC-5, AC-6)", () => {
      it("AC-4: should return NOT_FOUND for 404 response", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 404,
          statusText: "Not Found",
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("NOT_FOUND")
        expect(result.error).toContain("not found")
        errorSpy.mockRestore()
      })

      it("AC-5: should return UNAUTHORIZED for 401 response", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("UNAUTHORIZED")
        expect(result.error).toContain("sign in")
        errorSpy.mockRestore()
      })

      it("AC-6: should return SERVER_ERROR for 500 response", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("SERVER_ERROR")
        errorSpy.mockRestore()
      })

      it("should return SERVER_ERROR for 502 response", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 502,
          statusText: "Bad Gateway",
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("SERVER_ERROR")
        errorSpy.mockRestore()
      })

      it("should return SERVER_ERROR for 503 response", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("SERVER_ERROR")
        errorSpy.mockRestore()
      })

      it("should return SERVER_ERROR for 504 response", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 504,
          statusText: "Gateway Timeout",
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("SERVER_ERROR")
        errorSpy.mockRestore()
      })
    })

    describe("Timeout handling (AC-7)", () => {
      it("AC-7: should return TIMEOUT for AbortError", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        const abortError = new Error("The operation was aborted")
        abortError.name = "AbortError"
        mockCallISBAPI.mockRejectedValue(abortError)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("TIMEOUT")
        expect(result.error).toContain("timed out")
        expect(errorSpy).toHaveBeenCalledWith("[lease-templates-service] Request timeout for template:", VALID_UUID)
        errorSpy.mockRestore()
      })

      it("should return NETWORK_ERROR for network failures", async () => {
        const errorSpy = jest.spyOn(console, "error").mockImplementation()

        mockCallISBAPI.mockRejectedValue(new Error("Network error"))

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("NETWORK_ERROR")
        expect(result.error).toContain("Unable to load")
        errorSpy.mockRestore()
      })

      it("should handle non-Error thrown values", async () => {
        mockCallISBAPI.mockRejectedValue("String error")

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("NETWORK_ERROR")
      })
    })

    describe("UUID validation (AC-8)", () => {
      it("AC-8: should reject empty UUID without API call", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        const result = await fetchLeaseTemplate("")

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("INVALID_UUID")
        expect(result.error).toContain("Invalid")
        expect(mockCallISBAPI).not.toHaveBeenCalled()
        warnSpy.mockRestore()
      })

      it("AC-8: should reject non-UUID string without API call", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        const result = await fetchLeaseTemplate("not-a-uuid")

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("INVALID_UUID")
        expect(mockCallISBAPI).not.toHaveBeenCalled()
        warnSpy.mockRestore()
      })

      it("AC-8: should reject partial UUID without API call", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        const result = await fetchLeaseTemplate("550e8400-e29b-41d4")

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("INVALID_UUID")
        expect(mockCallISBAPI).not.toHaveBeenCalled()
        warnSpy.mockRestore()
      })

      it("AC-8: should reject UUID with invalid characters without API call", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        const result = await fetchLeaseTemplate("550e8400-e29b-41d4-a716-44665544000g")

        expect(result.success).toBe(false)
        expect(result.errorCode).toBe("INVALID_UUID")
        expect(mockCallISBAPI).not.toHaveBeenCalled()
        warnSpy.mockRestore()
      })

      it("should accept valid UUID (lowercase)", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: { leaseDurationInHours: 24, maxSpend: 50 },
            }),
        } as Response)

        const result = await fetchLeaseTemplate("550e8400-e29b-41d4-a716-446655440000")

        expect(result.success).toBe(true)
        expect(mockCallISBAPI).toHaveBeenCalled()
      })

      it("should accept valid UUID (uppercase)", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: { leaseDurationInHours: 24, maxSpend: 50 },
            }),
        } as Response)

        const result = await fetchLeaseTemplate("550E8400-E29B-41D4-A716-446655440000")

        expect(result.success).toBe(true)
        expect(mockCallISBAPI).toHaveBeenCalled()
      })
    })

    describe("Request deduplication (AC-9)", () => {
      it("AC-9: should deduplicate concurrent calls to same tryId", async () => {
        let resolveFirst: () => void
        const firstCallPromise = new Promise<void>((resolve) => {
          resolveFirst = resolve
        })

        mockCallISBAPI.mockImplementation(() => {
          return firstCallPromise.then(() => ({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                status: "success",
                data: { leaseDurationInHours: 24, maxSpend: 50 },
              }),
          })) as Promise<Response>
        })

        // Make 3 concurrent calls
        const call1 = fetchLeaseTemplate(VALID_UUID)
        const call2 = fetchLeaseTemplate(VALID_UUID)
        const call3 = fetchLeaseTemplate(VALID_UUID)

        // Resolve the first call
        resolveFirst!()

        // Wait for all calls to complete
        const [result1, result2, result3] = await Promise.all([call1, call2, call3])

        // All should succeed with same data
        expect(result1.success).toBe(true)
        expect(result2.success).toBe(true)
        expect(result3.success).toBe(true)

        // API should only be called once
        expect(mockCallISBAPI).toHaveBeenCalledTimes(1)
      })

      it("should make separate calls for different tryIds", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: { leaseDurationInHours: 24, maxSpend: 50 },
            }),
        } as Response)

        const uuid1 = "550e8400-e29b-41d4-a716-446655440001"
        const uuid2 = "550e8400-e29b-41d4-a716-446655440002"

        await Promise.all([fetchLeaseTemplate(uuid1), fetchLeaseTemplate(uuid2)])

        expect(mockCallISBAPI).toHaveBeenCalledTimes(2)
      })
    })

    describe("Defensive parsing (AC-10)", () => {
      it("AC-10: should log warning and use default when leaseDurationInHours is missing", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                uuid: VALID_UUID,
                name: "Test",
                maxSpend: 100,
                // leaseDurationInHours intentionally missing
              },
            }),
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(true)
        expect(result.data?.leaseDurationInHours).toBe(24) // Default
        expect(warnSpy).toHaveBeenCalledWith(
          "[lease-templates-service] Missing leaseDurationInHours, using default:",
          24,
        )
        warnSpy.mockRestore()
      })

      it("AC-10: should log warning and use default when maxSpend is missing", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                uuid: VALID_UUID,
                name: "Test",
                leaseDurationInHours: 48,
                // maxSpend intentionally missing
              },
            }),
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(true)
        expect(result.data?.maxSpend).toBe(50) // Default
        expect(warnSpy).toHaveBeenCalledWith("[lease-templates-service] Missing maxSpend, using default:", 50)
        warnSpy.mockRestore()
      })

      it("AC-10: should log warning when data field is missing entirely", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              // data field intentionally missing
            }),
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(true)
        expect(result.data?.leaseDurationInHours).toBe(24) // Default
        expect(result.data?.maxSpend).toBe(50) // Default
        expect(warnSpy).toHaveBeenCalledWith(
          "[lease-templates-service] Response missing data field, template:",
          VALID_UUID,
        )
        warnSpy.mockRestore()
      })

      it("should use defaults when both fields are missing", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                uuid: VALID_UUID,
                name: "Empty Template",
              },
            }),
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(true)
        expect(result.data?.leaseDurationInHours).toBe(24)
        expect(result.data?.maxSpend).toBe(50)
        warnSpy.mockRestore()
      })

      it("should handle zero values correctly (not use defaults)", async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                uuid: VALID_UUID,
                leaseDurationInHours: 0,
                maxSpend: 0,
              },
            }),
        } as Response)

        const result = await fetchLeaseTemplate(VALID_UUID)

        expect(result.success).toBe(true)
        // Zero is a valid value, should not be replaced with defaults
        expect(result.data?.leaseDurationInHours).toBe(0)
        expect(result.data?.maxSpend).toBe(0)
      })
    })

    describe("Logging", () => {
      it("should log start and completion of fetch", async () => {
        const logSpy = jest.spyOn(console, "log").mockImplementation()

        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              status: "success",
              data: { leaseDurationInHours: 24, maxSpend: 50 },
            }),
        } as Response)

        await fetchLeaseTemplate(VALID_UUID)

        expect(logSpy).toHaveBeenCalledWith("[lease-templates-service] Fetching template:", VALID_UUID)
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\[lease-templates-service\] Fetch completed in \d+ms/),
        )
        logSpy.mockRestore()
      })
    })
  })
})
