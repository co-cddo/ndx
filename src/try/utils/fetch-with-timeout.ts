/**
 * Fetch with Timeout Utility
 *
 * Provides a reusable wrapper for fetch operations with automatic timeout handling.
 * Extracts common timeout pattern used across API services.
 *
 * @module fetch-with-timeout
 */

import { config } from '../config';

/**
 * Execute a fetch request with timeout protection.
 *
 * Wraps any async function that accepts an AbortSignal with automatic timeout handling.
 * Cleans up timeout on completion (success or failure).
 *
 * @typeParam T - The return type of the request function
 * @param requestFn - Function that performs the request, receiving an AbortSignal
 * @param timeout - Timeout in milliseconds (defaults to config.requestTimeout, typically 10000ms)
 * @returns Promise resolving to the request result
 * @throws Error with name 'AbortError' if timeout exceeded
 *
 * @example
 * ```typescript
 * // Basic usage
 * const response = await fetchWithTimeout(
 *   (signal) => fetch('/api/data', { signal }),
 *   5000 // 5 second timeout
 * );
 *
 * // With error handling
 * try {
 *   const data = await fetchWithTimeout(async (signal) => {
 *     const response = await fetch('/api/data', { signal });
 *     return response.json();
 *   });
 * } catch (error) {
 *   if (error instanceof Error && error.name === 'AbortError') {
 *     console.error('Request timed out');
 *   }
 *   throw error;
 * }
 * ```
 */
export async function fetchWithTimeout<T>(
  requestFn: (signal: AbortSignal) => Promise<T>,
  timeout: number = config.requestTimeout
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await requestFn(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if an error is a timeout/abort error.
 *
 * @param error - Error to check
 * @returns true if error is from timeout/abort
 *
 * @example
 * ```typescript
 * try {
 *   await fetchWithTimeout(/* ... *\/);
 * } catch (error) {
 *   if (isAbortError(error)) {
 *     return { success: false, error: 'Request timed out' };
 *   }
 *   throw error;
 * }
 * ```
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
