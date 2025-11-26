/**
 * Request Deduplication Utility for Try Before You Buy Feature
 *
 * Prevents duplicate concurrent API requests by tracking in-flight requests.
 * H6: Fixes missing request deduplication in sessions-service.
 *
 * @module request-dedup
 */

/**
 * Map of in-flight requests by key.
 * When a request is in progress, subsequent calls with the same key
 * will return the same promise instead of making a new request.
 */
const inFlightRequests = new Map<string, Promise<unknown>>();

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
export async function deduplicatedRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if a request with this key is already in progress
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // Start new request and track it
  const promise = requestFn().finally(() => {
    // Clean up when request completes (success or failure)
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Clear all tracked in-flight requests.
 * Useful for testing or resetting state.
 */
export function clearInFlightRequests(): void {
  inFlightRequests.clear();
}

/**
 * Check if a request with the given key is currently in progress.
 *
 * @param key - Request key to check
 * @returns true if a request with this key is in progress
 */
export function isRequestInProgress(key: string): boolean {
  return inFlightRequests.has(key);
}
