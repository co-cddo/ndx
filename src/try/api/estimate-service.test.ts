/**
 * Unit tests for Deployment Estimate Service
 *
 * Tests the estimate service that fetches estimated provisioning
 * duration for lease templates from the NDX estimate API.
 *
 * @jest-environment jsdom
 */

import { fetchDeploymentEstimate, clearEstimateCache } from "./estimate-service"
import { clearInFlightRequests } from "../utils/request-dedup"

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe("Estimate Service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearEstimateCache()
    clearInFlightRequests()
  })

  describe("fetchDeploymentEstimate", () => {
    it("should return estimate when API responds with valid data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ estimateMinutes: 12, sampleSize: 5 }),
      })

      const result = await fetchDeploymentEstimate("template-uuid-123")

      expect(result.success).toBe(true)
      expect(result.estimateMinutes).toBe(12)
    })

    it("should call the correct endpoint with template ID", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ estimateMinutes: 10, sampleSize: 3 }),
      })

      await fetchDeploymentEstimate("my-template-uuid")

      expect(mockFetch).toHaveBeenCalledWith(
        "/lease-api/estimate?leaseTemplateId=my-template-uuid",
        expect.objectContaining({ method: "GET" }),
      )
    })

    it("should return null estimate when API returns null", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ estimateMinutes: null, sampleSize: 0 }),
      })

      const result = await fetchDeploymentEstimate("template-no-history")

      expect(result.success).toBe(true)
      expect(result.estimateMinutes).toBeNull()
    })

    it("should return failure on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const result = await fetchDeploymentEstimate("template-uuid")

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it("should return failure on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"))

      const result = await fetchDeploymentEstimate("template-uuid")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Unable to load estimate")
    })

    it("should return failure on timeout", async () => {
      const abortError = new DOMException("The operation was aborted.", "AbortError")
      mockFetch.mockRejectedValue(abortError)

      const result = await fetchDeploymentEstimate("template-uuid")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Request timed out")
    })

    it("should return failure for empty template ID", async () => {
      const result = await fetchDeploymentEstimate("")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Missing template ID")
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should return cached value on subsequent calls", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ estimateMinutes: 15, sampleSize: 4 }),
      })

      const result1 = await fetchDeploymentEstimate("cached-template")
      // Clear dedup but not the estimate cache
      clearInFlightRequests()
      const result2 = await fetchDeploymentEstimate("cached-template")

      expect(result1.success).toBe(true)
      expect(result1.estimateMinutes).toBe(15)
      expect(result2.success).toBe(true)
      expect(result2.estimateMinutes).toBe(15)
      // Only one fetch call — second was served from cache
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("should cache null estimates", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ estimateMinutes: null, sampleSize: 0 }),
      })

      const result1 = await fetchDeploymentEstimate("no-history-template")
      clearInFlightRequests()
      const result2 = await fetchDeploymentEstimate("no-history-template")

      expect(result1.estimateMinutes).toBeNull()
      expect(result2.estimateMinutes).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("should not include auth headers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ estimateMinutes: 10, sampleSize: 2 }),
      })

      await fetchDeploymentEstimate("template-uuid")

      const fetchCall = mockFetch.mock.calls[0]
      const options = fetchCall[1]
      // Should not have Authorization header
      expect(options.headers).toBeUndefined()
    })

    it("should URL-encode template ID", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ estimateMinutes: 8, sampleSize: 1 }),
      })

      await fetchDeploymentEstimate("template with spaces")

      expect(mockFetch).toHaveBeenCalledWith(
        "/lease-api/estimate?leaseTemplateId=template%20with%20spaces",
        expect.anything(),
      )
    })
  })
})
