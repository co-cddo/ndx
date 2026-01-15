/**
 * NDX Signup Lambda - Domain Service
 *
 * Fetches and caches allowed domain list from GitHub.
 * Implements graceful fallback to stale cache on GitHub failure.
 *
 * Story 1.3: Domain List API implementation
 *
 * @module infra-signup/lib/lambda/signup/domain-service
 */

import type { DomainInfo } from "@ndx/signup-types"

/**
 * GitHub raw URL for the UK public sector domain list.
 * Source: govuk-digital-backbone/ukps-domains repository
 */
const GITHUB_DOMAIN_URL =
  "https://raw.githubusercontent.com/govuk-digital-backbone/ukps-domains/main/data/user_domains.json"

/**
 * Cache TTL in milliseconds (5 minutes per ADR-044, NFR12)
 */
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Module-level cache for domain data.
 * Persists across warm Lambda invocations.
 */
let domainCache: { data: DomainInfo[]; timestamp: number } | null = null

/**
 * Raw domain entry from the govuk-digital-backbone/ukps-domains repository.
 */
interface GitHubDomainEntry {
  domain_pattern: string
  organisation_type_id: string | null
  organisation_id: string | null
  notes: string | null
  source: string
}

/**
 * Expected structure of the GitHub JSON response from the
 * govuk-digital-backbone/ukps-domains repository.
 */
interface GitHubDomainsResponse {
  version: string
  domains: GitHubDomainEntry[]
}

/**
 * Fetch timeout in milliseconds.
 * Ensures Lambda doesn't hang waiting for GitHub (NFR2: 500ms response).
 */
const FETCH_TIMEOUT_MS = 3000

/**
 * Check if the cache is still valid (within TTL).
 *
 * @returns true if cache exists and is within TTL
 */
export function isCacheValid(): boolean {
  if (!domainCache) return false
  return Date.now() - domainCache.timestamp < CACHE_TTL_MS
}

/**
 * Get cached domains if available and valid.
 *
 * @returns Cached domain array or null if cache is invalid/empty
 */
export function getCachedDomains(): DomainInfo[] | null {
  if (!domainCache) return null
  if (isCacheValid()) return domainCache.data
  return null
}

/**
 * Validate a raw GitHub domain entry has required fields.
 *
 * @param item - Item to validate
 * @returns true if item is a valid GitHubDomainEntry
 */
function isValidGitHubEntry(item: unknown): item is GitHubDomainEntry {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as GitHubDomainEntry).domain_pattern === "string" &&
    (item as GitHubDomainEntry).domain_pattern.length > 0
  )
}

/**
 * Transform a GitHub domain entry to DomainInfo format.
 *
 * Extracts the organisation name from the notes field, which has format:
 * "Local authority: Birmingham City" → "Birmingham City"
 *
 * @param entry - Raw GitHub domain entry
 * @returns DomainInfo with domain and orgName
 */
function transformToDomainInfo(entry: GitHubDomainEntry): DomainInfo {
  // Extract org name from notes: "Local authority: Birmingham City" → "Birmingham City"
  let orgName = "UK Public Sector"
  if (entry.notes) {
    const match = entry.notes.match(/Local authority:\s*(.+)/)
    if (match) {
      orgName = match[1].trim()
    }
  }
  return {
    domain: entry.domain_pattern,
    orgName,
  }
}

/**
 * Fetch domains from GitHub JSON source.
 *
 * @returns Promise resolving to array of DomainInfo
 * @throws Error if fetch fails, times out, or response is invalid
 */
export async function fetchDomainsFromGitHub(): Promise<DomainInfo[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(GITHUB_DOMAIN_URL, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`GitHub fetch failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as GitHubDomainsResponse

    // Validate response structure
    if (!data.domains || !Array.isArray(data.domains)) {
      throw new Error("Invalid GitHub response: missing domains array")
    }

    // Validate each domain entry
    const validEntries = data.domains.filter(isValidGitHubEntry)
    if (validEntries.length === 0 && data.domains.length > 0) {
      throw new Error("Invalid GitHub response: no valid domain entries")
    }

    // Filter to only include local_authority domains
    // NDX signup is currently only available to local government organisations
    const localAuthorityEntries = validEntries.filter((entry) => entry.organisation_type_id === "local_authority")

    // Transform to DomainInfo format
    return localAuthorityEntries.map(transformToDomainInfo)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Get domains with caching and graceful fallback.
 *
 * Strategy:
 * 1. Return cached data if within TTL
 * 2. Fetch fresh data from GitHub
 * 3. On GitHub failure, return stale cache if available
 * 4. If no cache and GitHub fails, throw error
 *
 * @param correlationId - Request correlation ID for logging
 * @returns Promise resolving to array of DomainInfo
 * @throws Error if GitHub fails and no cached data exists
 */
export async function getDomains(correlationId: string): Promise<DomainInfo[]> {
  // Check cache first
  const cached = getCachedDomains()
  if (cached) {
    console.log(
      JSON.stringify({
        level: "DEBUG",
        message: "Returning cached domains",
        cacheAge: domainCache ? Date.now() - domainCache.timestamp : 0,
        domainCount: cached.length,
        correlationId,
      }),
    )
    return cached
  }

  try {
    const freshData = await fetchDomainsFromGitHub()
    domainCache = { data: freshData, timestamp: Date.now() }

    console.log(
      JSON.stringify({
        level: "INFO",
        message: "Fetched fresh domains from GitHub",
        domainCount: freshData.length,
        correlationId,
      }),
    )

    return freshData
  } catch (error) {
    // Graceful fallback to stale cache (NFR18, NFR21)
    if (domainCache) {
      console.log(
        JSON.stringify({
          level: "WARN",
          message: "GitHub unavailable, returning stale cache",
          error: error instanceof Error ? error.message : "Unknown error",
          cacheAge: Date.now() - domainCache.timestamp,
          correlationId,
        }),
      )
      return domainCache.data
    }

    // No cache available - must fail
    console.log(
      JSON.stringify({
        level: "ERROR",
        message: "GitHub domain fetch failed, no cache available",
        error: error instanceof Error ? error.message : "Unknown error",
        correlationId,
      }),
    )
    throw error
  }
}

/**
 * Clear the domain cache.
 * Primarily for testing purposes.
 */
export function clearCache(): void {
  domainCache = null
}

/**
 * Set cache directly.
 * Primarily for testing purposes.
 *
 * @param data - Domain data to cache
 * @param timestamp - Cache timestamp (defaults to now)
 */
export function setCache(data: DomainInfo[], timestamp?: number): void {
  domainCache = { data, timestamp: timestamp ?? Date.now() }
}
