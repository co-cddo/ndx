/**
 * @jest-environment jsdom
 */

import { deduplicatedRequest, clearInFlightRequests, isRequestInProgress, stopCleanupTimer } from "./request-dedup"

describe("request-dedup", () => {
  beforeEach(() => {
    clearInFlightRequests()
    jest.clearAllMocks()
  })

  afterEach(() => {
    clearInFlightRequests()
    stopCleanupTimer()
    jest.restoreAllMocks()
  })

  describe("deduplicatedRequest", () => {
    it("should execute the request function once", async () => {
      const mockFn = jest.fn().mockResolvedValue("result")

      const result = await deduplicatedRequest("test", mockFn)

      expect(result).toBe("result")
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it("should deduplicate concurrent requests with same key", async () => {
      let callCount = 0
      const mockFn = jest.fn().mockImplementation(async () => {
        callCount++
        await new Promise((resolve) => setTimeout(resolve, 10))
        return `result-${callCount}`
      })

      // Start 3 concurrent requests with same key
      const [result1, result2, result3] = await Promise.all([
        deduplicatedRequest("same-key", mockFn),
        deduplicatedRequest("same-key", mockFn),
        deduplicatedRequest("same-key", mockFn),
      ])

      // All should get the same result
      expect(result1).toBe("result-1")
      expect(result2).toBe("result-1")
      expect(result3).toBe("result-1")

      // Function should only be called once
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it("should allow different keys to make separate requests", async () => {
      const mockFn = jest.fn().mockImplementation(async (key: string) => key)

      const [result1, result2] = await Promise.all([
        deduplicatedRequest("key1", () => mockFn("key1")),
        deduplicatedRequest("key2", () => mockFn("key2")),
      ])

      expect(result1).toBe("key1")
      expect(result2).toBe("key2")
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it("should allow new request after previous completes", async () => {
      let callCount = 0
      const mockFn = jest.fn().mockImplementation(async () => {
        callCount++
        return `result-${callCount}`
      })

      // First request
      const result1 = await deduplicatedRequest("test", mockFn)
      expect(result1).toBe("result-1")

      // Second request (should make new call since first completed)
      const result2 = await deduplicatedRequest("test", mockFn)
      expect(result2).toBe("result-2")

      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it("should clean up after request fails", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("Failed"))

      // First request fails
      await expect(deduplicatedRequest("test", mockFn)).rejects.toThrow("Failed")

      // Key should be cleaned up, allowing new request
      mockFn.mockResolvedValue("success")
      const result = await deduplicatedRequest("test", mockFn)
      expect(result).toBe("success")

      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it("should propagate errors to all waiting callers", async () => {
      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        throw new Error("API Error")
      })

      // Start 3 concurrent requests
      const promises = [
        deduplicatedRequest("error-test", mockFn),
        deduplicatedRequest("error-test", mockFn),
        deduplicatedRequest("error-test", mockFn),
      ]

      // All should reject with the same error
      await expect(promises[0]).rejects.toThrow("API Error")
      await expect(promises[1]).rejects.toThrow("API Error")
      await expect(promises[2]).rejects.toThrow("API Error")

      // Function should only be called once
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe("isRequestInProgress", () => {
    it("should return false when no request is in progress", () => {
      expect(isRequestInProgress("test")).toBe(false)
    })

    it("should return true when request is in progress", async () => {
      let resolvePromise: (value: string) => void
      const mockFn = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          }),
      )

      // Start request but don't await
      const promise = deduplicatedRequest("in-progress", mockFn)

      // Should be in progress
      expect(isRequestInProgress("in-progress")).toBe(true)

      // Resolve and complete
      resolvePromise!("done")
      await promise

      // Should no longer be in progress
      expect(isRequestInProgress("in-progress")).toBe(false)
    })
  })

  describe("clearInFlightRequests", () => {
    it("should clear all tracked requests", async () => {
      let resolvePromise: (value: string) => void
      const mockFn = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          }),
      )

      // Start request
      const promise = deduplicatedRequest("clear-test", mockFn)
      expect(isRequestInProgress("clear-test")).toBe(true)

      // Clear all
      clearInFlightRequests()
      expect(isRequestInProgress("clear-test")).toBe(false)

      // Resolve original promise to avoid hanging test
      resolvePromise!("done")
      await promise
    })
  })

  describe("memory management", () => {
    it("should warn and clear oldest entries when max tracked requests reached", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

      // Create 100 pending requests to hit the limit
      const resolvers: Array<(value: string) => void> = []
      for (let i = 0; i < 100; i++) {
        deduplicatedRequest(
          `key-${i}`,
          () =>
            new Promise((resolve) => {
              resolvers.push(resolve)
            }),
        )
      }

      // The 101st request should trigger cleanup
      const extraPromise = deduplicatedRequest("extra-key", () => Promise.resolve("extra"))

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[request-dedup] Max tracked requests reached, clearing oldest entries",
      )

      // New request should still work
      const result = await extraPromise
      expect(result).toBe("extra")

      // Clean up pending promises
      resolvers.forEach((resolve) => resolve("done"))
    })
  })
})
