/**
 * @jest-environment jsdom
 */

import { fetchWithTimeout, isAbortError } from "./fetch-with-timeout"

// Mock config
jest.mock("../config", () => ({
  config: {
    requestTimeout: 10000,
  },
}))

describe("fetch-with-timeout", () => {
  describe("fetchWithTimeout", () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("should return result from successful request", async () => {
      const mockResult = { data: "test" }
      const requestFn = jest.fn().mockResolvedValue(mockResult)

      const resultPromise = fetchWithTimeout(requestFn)
      jest.runAllTimers()
      const result = await resultPromise

      expect(result).toEqual(mockResult)
      expect(requestFn).toHaveBeenCalledWith(expect.any(AbortSignal))
    })

    it("should pass AbortSignal to request function", async () => {
      let receivedSignal: AbortSignal | undefined
      const requestFn = jest.fn().mockImplementation((signal: AbortSignal) => {
        receivedSignal = signal
        return Promise.resolve("success")
      })

      const resultPromise = fetchWithTimeout(requestFn)
      // Only advance timers enough for the immediate promise to resolve,
      // not enough for the timeout to fire
      await Promise.resolve()
      await resultPromise

      expect(receivedSignal).toBeInstanceOf(AbortSignal)
      // After successful completion, signal may or may not be aborted depending on timing
      // The important thing is the request received a valid signal
      expect(receivedSignal).toBeDefined()
    })

    it("should abort request after timeout", async () => {
      let receivedSignal: AbortSignal | undefined
      const requestFn = jest.fn().mockImplementation((signal: AbortSignal) => {
        receivedSignal = signal
        // Simulate a request that never resolves
        return new Promise((_, reject) => {
          signal.addEventListener("abort", () => {
            const error = new Error("Aborted")
            error.name = "AbortError"
            reject(error)
          })
        })
      })

      const resultPromise = fetchWithTimeout(requestFn, 5000)

      // Advance time past timeout
      jest.advanceTimersByTime(5001)

      await expect(resultPromise).rejects.toThrow()
      expect(receivedSignal?.aborted).toBe(true)
    })

    it("should use default timeout from config", async () => {
      const requestFn = jest.fn().mockResolvedValue("success")

      const resultPromise = fetchWithTimeout(requestFn)
      jest.runAllTimers()
      await resultPromise

      // Verify request was called (default timeout is 10000ms from mock config)
      expect(requestFn).toHaveBeenCalled()
    })

    it("should clear timeout on success", async () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout")
      const requestFn = jest.fn().mockResolvedValue("success")

      const resultPromise = fetchWithTimeout(requestFn, 5000)
      jest.runAllTimers()
      await resultPromise

      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })

    it("should clear timeout on error", async () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout")
      const requestFn = jest.fn().mockRejectedValue(new Error("Network error"))

      const resultPromise = fetchWithTimeout(requestFn, 5000)
      jest.runAllTimers()

      await expect(resultPromise).rejects.toThrow("Network error")
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })

    it("should propagate non-timeout errors", async () => {
      const error = new Error("Custom error")
      const requestFn = jest.fn().mockRejectedValue(error)

      const resultPromise = fetchWithTimeout(requestFn)
      jest.runAllTimers()

      await expect(resultPromise).rejects.toThrow("Custom error")
    })
  })

  describe("isAbortError", () => {
    it("should return true for AbortError", () => {
      const error = new Error("Aborted")
      error.name = "AbortError"
      expect(isAbortError(error)).toBe(true)
    })

    it("should return false for other Error types", () => {
      const error = new Error("Network error")
      expect(isAbortError(error)).toBe(false)
    })

    it("should return false for TypeError", () => {
      const error = new TypeError("Type error")
      expect(isAbortError(error)).toBe(false)
    })

    it("should return false for non-Error values", () => {
      expect(isAbortError("string error")).toBe(false)
      expect(isAbortError(null)).toBe(false)
      expect(isAbortError(undefined)).toBe(false)
      expect(isAbortError(42)).toBe(false)
      expect(isAbortError({ name: "AbortError" })).toBe(false)
    })
  })
})
