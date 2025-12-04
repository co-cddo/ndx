/**
 * Request Deduplication Utility for Try Before You Buy Feature
 *
 * Prevents duplicate concurrent API requests by tracking in-flight requests.
 * H6: Fixes missing request deduplication in sessions-service.
 *
 * ## Memory Management
 *
 * The Map automatically cleans up completed requests via finally blocks.
 * For long-running sessions, a periodic cleanup removes any stale entries
 * older than MAX_REQUEST_AGE_MS (safety net for edge cases).
 *
 * @module request-dedup
 */

/** Maximum age for in-flight request entries (5 minutes) */
const MAX_REQUEST_AGE_MS = 5 * 60 * 1000

/** Maximum number of concurrent tracked requests */
const MAX_TRACKED_REQUESTS = 100

/** Cleanup interval (1 minute) */
const CLEANUP_INTERVAL_MS = 60 * 1000

/**
 * Entry in the in-flight requests map with timestamp for TTL cleanup.
 */
interface RequestEntry {
  promise: Promise<unknown>
  timestamp: number
}

/**
 * Map of in-flight requests by key.
 * When a request is in progress, subsequent calls with the same key
 * will return the same promise instead of making a new request.
 */
const inFlightRequests = new Map<string, RequestEntry>()

/** Cleanup timer reference for tests */
let cleanupTimer: ReturnType<typeof setInterval> | null = null

/**
 * Start periodic cleanup of stale entries.
 * Called automatically on first request.
 */
function startCleanupTimer(): void {
  if (cleanupTimer !== null) return

  cleanupTimer = setInterval(() => {
    const now = Date.now()
    Array.from(inFlightRequests.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > MAX_REQUEST_AGE_MS) {
        inFlightRequests.delete(key)
      }
    })
  }, CLEANUP_INTERVAL_MS)

  // Don't prevent Node.js from exiting
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref()
  }
}

/**
 * Stop the cleanup timer (for testing).
 */
export function stopCleanupTimer(): void {
  if (cleanupTimer !== null) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
  }
}

/**
 * Execute a request with deduplication.
 *
 * If a request with the same key is already in progress, returns the
 * existing promise instead of starting a new request. This prevents
 * redundant API calls when multiple components request the same data.
 *
 * @typeParam T - The return type of the request function
 * @param key - Unique key identifying this request (e.g., 'fetchUserLeases')
 * @param requestFn - Function that performs the actual request
 * @returns Promise resolving to the request result
 *
 * @example
 * ```typescript
 * // Without deduplication: 3 concurrent calls = 3 API requests
 * // With deduplication: 3 concurrent calls = 1 API request, 3 promises resolved
 *
 * async function fetchData() {
 *   return deduplicatedRequest('myData', async () => {
 *     const response = await fetch('/api/data');
 *     return response.json();
 *   });
 * }
 *
 * // These three calls will only make ONE actual API request
 * const [a, b, c] = await Promise.all([
 *   fetchData(),
 *   fetchData(),
 *   fetchData(),
 * ]);
 * // a, b, and c will all have the same value
 * ```
 */
export async function deduplicatedRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  // Start cleanup timer on first use
  startCleanupTimer()

  // Check if a request with this key is already in progress
  const existing = inFlightRequests.get(key)
  if (existing) {
    return existing.promise as Promise<T>
  }

  // Safety: prevent unbounded growth if cleanup fails
  if (inFlightRequests.size >= MAX_TRACKED_REQUESTS) {
    console.warn("[request-dedup] Max tracked requests reached, clearing oldest entries")
    // Remove oldest half of entries
    const entries = Array.from(inFlightRequests.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toRemove = entries.slice(0, Math.floor(entries.length / 2))
    toRemove.forEach(([k]) => inFlightRequests.delete(k))
  }

  // Start new request and track it
  // Wrap in async IIFE to handle both sync throws and async rejections
  // This ensures cleanup runs even if requestFn() throws synchronously
  const promise = (async () => {
    try {
      return await requestFn()
    } finally {
      // Clean up when request completes (success or failure)
      inFlightRequests.delete(key)
    }
  })()

  inFlightRequests.set(key, { promise, timestamp: Date.now() })
  return promise
}

/**
 * Clear all tracked in-flight requests.
 * Useful for testing or resetting state.
 */
export function clearInFlightRequests(): void {
  inFlightRequests.clear()
}

/**
 * Check if a request with the given key is currently in progress.
 *
 * @param key - Request key to check
 * @returns true if a request with this key is in progress
 */
export function isRequestInProgress(key: string): boolean {
  return inFlightRequests.has(key)
}
