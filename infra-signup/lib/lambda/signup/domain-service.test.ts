/**
 * NDX Signup Lambda - Domain Service Tests
 *
 * Story 1.3: Tests for domain fetching, caching, and fallback behavior
 *
 * @module infra-signup/lib/lambda/signup/domain-service.test
 */

import {
  getDomains,
  fetchDomainsFromGitHub,
  isCacheValid,
  getCachedDomains,
  clearCache,
  setCache,
} from "./domain-service"
import type { DomainInfo } from "@ndx/signup-types"

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock console.log to verify structured logging
let consoleSpy: jest.SpyInstance

// Sample domain data (transformed output - orgName extracted from notes field)
const sampleDomains: DomainInfo[] = [
  { domain: "westbury.gov.uk", orgName: "Westbury District Council" },
  { domain: "reading.gov.uk", orgName: "Reading Borough Council" },
  { domain: "birmingham.gov.uk", orgName: "Birmingham City" },
]

// Sample raw GitHub data (input format - with notes field containing org names)
const sampleGitHubData = {
  version: "0.1.0",
  domains: [
    {
      domain_pattern: "westbury.gov.uk",
      organisation_type_id: "local_authority",
      organisation_id: null,
      notes: "Local authority: Westbury District Council",
      source: "internal",
    },
    {
      domain_pattern: "reading.gov.uk",
      organisation_type_id: "local_authority",
      organisation_id: null,
      notes: "Local authority: Reading Borough Council",
      source: "internal",
    },
    {
      domain_pattern: "birmingham.gov.uk",
      organisation_type_id: "local_authority",
      organisation_id: null,
      notes: "Local authority: Birmingham City",
      source: "internal",
    },
  ],
}

describe("domain-service", () => {
  beforeEach(() => {
    clearCache()
    mockFetch.mockReset()
    consoleSpy = jest.spyOn(console, "log").mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe("fetchDomainsFromGitHub", () => {
    it("should fetch and return domain array from GitHub", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleGitHubData,
      })

      const result = await fetchDomainsFromGitHub()

      expect(result).toEqual(sampleDomains)
      expect(mockFetch).toHaveBeenCalledWith(
        "https://raw.githubusercontent.com/govuk-digital-backbone/ukps-domains/main/data/user_domains.json",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    it("should throw error on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      })

      await expect(fetchDomainsFromGitHub()).rejects.toThrow("GitHub fetch failed: 404 Not Found")
    })

    it("should throw error on invalid response structure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: "structure" }),
      })

      await expect(fetchDomainsFromGitHub()).rejects.toThrow("Invalid GitHub response: missing domains array")
    })

    it("should filter out invalid domain entries", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: "0.1.0",
          domains: [
            {
              domain_pattern: "valid.gov.uk",
              organisation_type_id: "local_authority",
              organisation_id: null,
              notes: "Local authority: Valid Council",
              source: "internal",
            },
            null,
            {
              domain_pattern: "",
              organisation_type_id: "local_authority",
              organisation_id: null,
              notes: null,
              source: "internal",
            },
            "not-an-object",
            {
              domain_pattern: "good.gov.uk",
              organisation_type_id: "local_authority",
              organisation_id: null,
              notes: "Local authority: Good Council",
              source: "internal",
            },
          ],
        }),
      })

      const result = await fetchDomainsFromGitHub()

      expect(result).toEqual([
        { domain: "valid.gov.uk", orgName: "Valid Council" },
        { domain: "good.gov.uk", orgName: "Good Council" },
      ])
    })

    it("should filter to only include local_authority domains", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: "0.1.0",
          domains: [
            {
              domain_pattern: "birmingham.gov.uk",
              organisation_type_id: "local_authority",
              organisation_id: null,
              notes: "Local authority: Birmingham City",
              source: "internal",
            },
            {
              domain_pattern: "bfi.org.uk",
              organisation_type_id: "ndpb",
              organisation_id: "uuid-123",
              notes: null,
              source: "internal",
            },
            {
              domain_pattern: "army.mod.uk",
              organisation_type_id: "military",
              organisation_id: null,
              notes: null,
              source: "internal",
            },
            {
              domain_pattern: "reading.gov.uk",
              organisation_type_id: "local_authority",
              organisation_id: null,
              notes: "Local authority: Reading Borough Council",
              source: "internal",
            },
          ],
        }),
      })

      const result = await fetchDomainsFromGitHub()

      // Should only return local_authority domains, not ndpb or military
      expect(result).toEqual([
        { domain: "birmingham.gov.uk", orgName: "Birmingham City" },
        { domain: "reading.gov.uk", orgName: "Reading Borough Council" },
      ])
      expect(result.find((d) => d.domain === "bfi.org.uk")).toBeUndefined()
      expect(result.find((d) => d.domain === "army.mod.uk")).toBeUndefined()
    })

    it("should extract orgName from notes field", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: "0.1.0",
          domains: [
            {
              domain_pattern: "test.gov.uk",
              organisation_type_id: "local_authority",
              organisation_id: null,
              notes: "Local authority: Test District Council",
              source: "internal",
            },
          ],
        }),
      })

      const result = await fetchDomainsFromGitHub()

      expect(result[0].orgName).toBe("Test District Council")
    })

    it("should fallback to 'UK Public Sector' when notes field is missing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: "0.1.0",
          domains: [
            {
              domain_pattern: "noname.gov.uk",
              organisation_type_id: "local_authority",
              organisation_id: null,
              notes: null,
              source: "internal",
            },
          ],
        }),
      })

      const result = await fetchDomainsFromGitHub()

      expect(result[0].orgName).toBe("UK Public Sector")
    })

    it("should fallback to 'UK Public Sector' when notes format is unexpected", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: "0.1.0",
          domains: [
            {
              domain_pattern: "weird.gov.uk",
              organisation_type_id: "local_authority",
              organisation_id: null,
              notes: "Some other format",
              source: "internal",
            },
          ],
        }),
      })

      const result = await fetchDomainsFromGitHub()

      expect(result[0].orgName).toBe("UK Public Sector")
    })

    it("should throw error when all domain entries are invalid", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: "0.1.0",
          domains: [null, { domain_pattern: "", organisation_type_id: null }, "invalid"],
        }),
      })

      await expect(fetchDomainsFromGitHub()).rejects.toThrow("Invalid GitHub response: no valid domain entries")
    })

    it("should handle fetch timeout via AbortController", async () => {
      // Simulate a timeout by having fetch reject with AbortError
      mockFetch.mockRejectedValueOnce(new DOMException("Aborted", "AbortError"))

      await expect(fetchDomainsFromGitHub()).rejects.toThrow("Aborted")
    })

    it("should throw error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      await expect(fetchDomainsFromGitHub()).rejects.toThrow("Network error")
    })
  })

  describe("cache functions", () => {
    describe("isCacheValid", () => {
      it("should return false when cache is empty", () => {
        expect(isCacheValid()).toBe(false)
      })

      it("should return true when cache is within TTL", () => {
        setCache(sampleDomains)
        expect(isCacheValid()).toBe(true)
      })

      it("should return false when cache is expired", () => {
        // Set cache with timestamp 6 minutes ago
        setCache(sampleDomains, Date.now() - 6 * 60 * 1000)
        expect(isCacheValid()).toBe(false)
      })
    })

    describe("getCachedDomains", () => {
      it("should return null when cache is empty", () => {
        expect(getCachedDomains()).toBeNull()
      })

      it("should return cached data when valid", () => {
        setCache(sampleDomains)
        expect(getCachedDomains()).toEqual(sampleDomains)
      })

      it("should return null when cache is expired", () => {
        setCache(sampleDomains, Date.now() - 6 * 60 * 1000)
        expect(getCachedDomains()).toBeNull()
      })
    })

    describe("clearCache", () => {
      it("should clear the cache", () => {
        setCache(sampleDomains)
        expect(getCachedDomains()).toEqual(sampleDomains)

        clearCache()
        expect(getCachedDomains()).toBeNull()
      })
    })
  })

  describe("getDomains", () => {
    const correlationId = "test-correlation-id"

    it("should fetch from GitHub when cache is empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleGitHubData,
      })

      const result = await getDomains(correlationId)

      expect(result).toEqual(sampleDomains)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it("should return cached data without fetching when cache is valid", async () => {
      // Prime the cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleGitHubData,
      })
      await getDomains(correlationId)

      // Reset mock to verify no additional calls
      mockFetch.mockReset()

      // Second call should use cache
      const result = await getDomains(correlationId)

      expect(result).toEqual(sampleDomains)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should log DEBUG when returning cached data", async () => {
      setCache(sampleDomains)

      await getDomains(correlationId)

      expect(consoleSpy).toHaveBeenCalled()
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0])
      expect(loggedData).toMatchObject({
        level: "DEBUG",
        message: "Returning cached domains",
        correlationId,
      })
    })

    it("should log INFO when fetching fresh data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleGitHubData,
      })

      await getDomains(correlationId)

      expect(consoleSpy).toHaveBeenCalled()
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0])
      expect(loggedData).toMatchObject({
        level: "INFO",
        message: "Fetched fresh domains from GitHub",
        correlationId,
      })
    })

    it("should return stale cache when GitHub fails", async () => {
      // Prime the cache first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleGitHubData,
      })
      await getDomains(correlationId)

      // Expire the cache
      setCache(sampleDomains, Date.now() - 6 * 60 * 1000)

      // GitHub fails
      mockFetch.mockRejectedValueOnce(new Error("GitHub down"))

      const result = await getDomains(correlationId)

      expect(result).toEqual(sampleDomains)
    })

    it("should log WARN when returning stale cache", async () => {
      // Set expired cache
      setCache(sampleDomains, Date.now() - 6 * 60 * 1000)

      // GitHub fails
      mockFetch.mockRejectedValueOnce(new Error("GitHub down"))

      await getDomains(correlationId)

      const warnLog = consoleSpy.mock.calls.find((call) => {
        const data = JSON.parse(call[0])
        return data.level === "WARN"
      })

      expect(warnLog).toBeDefined()
      const loggedData = JSON.parse(warnLog[0])
      expect(loggedData).toMatchObject({
        level: "WARN",
        message: "GitHub unavailable, returning stale cache",
        error: "GitHub down",
        correlationId,
      })
    })

    it("should throw error when GitHub fails and no cache exists", async () => {
      mockFetch.mockRejectedValueOnce(new Error("GitHub down"))

      await expect(getDomains(correlationId)).rejects.toThrow("GitHub down")
    })

    it("should log ERROR when GitHub fails with no cache", async () => {
      mockFetch.mockRejectedValueOnce(new Error("GitHub down"))

      try {
        await getDomains(correlationId)
      } catch {
        // Expected to throw
      }

      const errorLog = consoleSpy.mock.calls.find((call) => {
        const data = JSON.parse(call[0])
        return data.level === "ERROR"
      })

      expect(errorLog).toBeDefined()
      const loggedData = JSON.parse(errorLog[0])
      expect(loggedData).toMatchObject({
        level: "ERROR",
        message: "GitHub domain fetch failed, no cache available",
        error: "GitHub down",
        correlationId,
      })
    })

    it("should fetch fresh data after cache expires", async () => {
      // Prime with initial data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => sampleGitHubData,
      })
      await getDomains(correlationId)

      // Expire the cache
      setCache(sampleDomains, Date.now() - 6 * 60 * 1000)

      // New data from GitHub (must be local_authority to pass filter)
      const newDomains = [{ domain: "new.gov.uk", orgName: "New Council" }]
      const newGitHubData = {
        version: "0.1.0",
        domains: [
          {
            domain_pattern: "new.gov.uk",
            organisation_type_id: "local_authority",
            organisation_id: null,
            notes: "Local authority: New Council",
            source: "internal",
          },
        ],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => newGitHubData,
      })

      const result = await getDomains(correlationId)

      expect(result).toEqual(newDomains)
    })

    it("should return cached data within 50ms", async () => {
      // Prime the cache
      setCache(sampleDomains)

      const start = Date.now()
      await getDomains(correlationId)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(50)
    })
  })
})
