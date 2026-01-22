/**
 * Tests for ISB API Client Module
 *
 * Story: 5.1 - Replace DynamoDB Reads with ISB API
 * Tests cover: AC-1, AC-4, AC-5, AC-6/NFR4
 *
 * @see _bmad-output/implementation-artifacts/5-1-replace-dynamodb-reads-with-isb-api.md
 */

import {
  fetchLeaseFromISB,
  fetchLeaseByKey,
  constructLeaseId,
  parseLeaseId,
  ISBLeaseRecord,
  JSendResponse,
} from "./isb-client"

describe("ISB Client", () => {
  const testCorrelationId = "test-event-123"
  const testUserEmail = "user@example.gov.uk"
  const testUuid = "550e8400-e29b-41d4-a716-446655440000"
  const testBaseUrl = "https://isb-api.example.com"
  const testConfig = { baseUrl: testBaseUrl }

  // Use jest.spyOn instead of global assignment for proper cleanup
  let mockFetch: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch = jest.spyOn(global, "fetch").mockImplementation(jest.fn())
    // Reset environment
    delete process.env.ISB_API_BASE_URL
  })

  afterEach(() => {
    mockFetch.mockRestore()
    jest.useRealTimers()
  })

  // ===========================================================================
  // Lease ID Construction/Parsing Tests
  // ===========================================================================

  describe("constructLeaseId", () => {
    it("should create base64 encoded composite key", () => {
      const leaseId = constructLeaseId(testUserEmail, testUuid)

      // Decode and verify format
      const decoded = Buffer.from(leaseId, "base64").toString("utf-8")
      expect(decoded).toBe(`${testUserEmail}|${testUuid}`)
    })

    it("should handle special characters in email", () => {
      const email = "user+tag@sub.domain.gov.uk"
      const leaseId = constructLeaseId(email, testUuid)

      const decoded = Buffer.from(leaseId, "base64").toString("utf-8")
      expect(decoded).toBe(`${email}|${testUuid}`)
    })

    it("should throw error if userEmail contains pipe character (delimiter injection)", () => {
      const maliciousEmail = "user|injected@example.com"
      expect(() => constructLeaseId(maliciousEmail, testUuid)).toThrow(
        "Invalid userEmail: contains pipe character delimiter",
      )
    })
  })

  describe("parseLeaseId", () => {
    it("should parse valid lease ID back to components", () => {
      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = parseLeaseId(leaseId)

      expect(result).toEqual({
        userEmail: testUserEmail,
        uuid: testUuid,
      })
    })

    it("should return null for invalid base64", () => {
      const result = parseLeaseId("not-valid-base64!!!")
      expect(result).toBeNull()
    })

    it("should return null for missing pipe separator", () => {
      const invalidId = Buffer.from("nopipe").toString("base64")
      const result = parseLeaseId(invalidId)
      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // AC-1: Successful ISB API Response Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-1: Successful API calls", () => {
    it("should return lease record on success", async () => {
      const mockLease: ISBLeaseRecord = {
        userEmail: testUserEmail,
        uuid: testUuid,
        status: "Active",
        maxSpend: 100,
        expirationDate: "2026-02-15T00:00:00Z",
        awsAccountId: "123456789012",
      }

      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "success",
        data: mockLease,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toEqual(mockLease)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`${testBaseUrl}/leases/`),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Accept: "application/json",
            "X-Correlation-Id": testCorrelationId,
          }),
        }),
      )
    })

    it("should use environment variable if config not provided", async () => {
      process.env.ISB_API_BASE_URL = "https://env-isb-api.example.com"

      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "success",
        data: { userEmail: testUserEmail, uuid: testUuid },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      await fetchLeaseFromISB(leaseId, testCorrelationId)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://env-isb-api.example.com/leases/"),
        expect.any(Object),
      )
    })

    it("should return null if ISB_API_BASE_URL not configured", async () => {
      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // AC-4: 404 Response (Lease Not Found) Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-4: 404 handling", () => {
    it("should return null for 404 response (graceful degradation)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ status: "fail", message: "Lease not found" }),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // AC-5: 500/Network Error Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-5: Server error handling", () => {
    it("should return null for 500 response (graceful degradation)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ status: "error", message: "Internal server error" }),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 502 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({}),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 503 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for network error (graceful degradation)", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for DNS resolution error", async () => {
      const dnsError = new Error("getaddrinfo ENOTFOUND")
      dnsError.name = "TypeError"
      mockFetch.mockRejectedValueOnce(dnsError)

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // AC-6/NFR4: Timeout Tests (5 second limit)
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-6/NFR4: Timeout handling", () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.clearAllTimers()
      jest.useRealTimers()
    })

    it("should timeout after 5 seconds and return null", async () => {
      // Create a promise that never resolves
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          // Simulate AbortController aborting
          setTimeout(() => {
            const abortError = new Error("The operation was aborted")
            abortError.name = "AbortError"
            reject(abortError)
          }, 5000)
        })
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const resultPromise = fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      // Fast-forward timers
      jest.advanceTimersByTime(5000)

      const result = await resultPromise
      expect(result).toBeNull()
    })

    it("should respect custom timeout configuration", async () => {
      const customConfig = { baseUrl: testBaseUrl, timeoutMs: 1000 }

      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const abortError = new Error("The operation was aborted")
            abortError.name = "AbortError"
            reject(abortError)
          }, 1000)
        })
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const resultPromise = fetchLeaseFromISB(leaseId, testCorrelationId, customConfig)

      jest.advanceTimersByTime(1000)

      const result = await resultPromise
      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // JSend Response Handling Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - JSend response handling", () => {
    it("should return null for JSend fail status", async () => {
      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "fail",
        message: "Validation failed",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for JSend error status", async () => {
      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "error",
        message: "Internal processing error",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for missing data field", async () => {
      const mockResponse = {
        status: "success",
        // data field missing
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // fetchLeaseByKey Convenience Function Tests
  // ===========================================================================

  describe("fetchLeaseByKey", () => {
    it("should fetch lease using userEmail and uuid", async () => {
      const mockLease: ISBLeaseRecord = {
        userEmail: testUserEmail,
        uuid: testUuid,
        status: "Active",
      }

      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "success",
        data: mockLease,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      })

      const result = await fetchLeaseByKey(testUserEmail, testUuid, testCorrelationId, testConfig)

      expect(result).toEqual(mockLease)
    })

    it("should return null for empty userEmail", async () => {
      const result = await fetchLeaseByKey("", testUuid, testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should return null for empty uuid", async () => {
      const result = await fetchLeaseByKey(testUserEmail, "", testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should return null for whitespace-only userEmail", async () => {
      const result = await fetchLeaseByKey("   ", testUuid, testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should return null for whitespace-only uuid", async () => {
      const result = await fetchLeaseByKey(testUserEmail, "   ", testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Other 4xx Error Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - Other client errors", () => {
    it("should return null for 400 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ status: "fail", message: "Bad request" }),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 401 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ status: "fail", message: "Unauthorized" }),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 403 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ status: "fail", message: "Forbidden" }),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })
})
