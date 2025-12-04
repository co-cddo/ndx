/**
 * Safe Storage Wrapper
 *
 * Provides a safe wrapper around sessionStorage that handles all edge cases:
 * - Private browsing mode (QuotaExceededError)
 * - Security restrictions (SecurityError)
 * - SSR environments (typeof sessionStorage === 'undefined')
 * - Storage disabled by user
 *
 * @module storage
 */

/**
 * Safe wrapper for sessionStorage operations.
 *
 * All methods return gracefully on error instead of throwing.
 * This ensures the application continues to function even when
 * storage is unavailable.
 */
class SafeStorage {
  /**
   * Check if sessionStorage is available and functional.
   *
   * @returns true if sessionStorage is available
   */
  isAvailable(): boolean {
    try {
      if (typeof sessionStorage === "undefined") {
        return false
      }
      // Test actual functionality with a test key
      const testKey = "__storage_test__"
      sessionStorage.setItem(testKey, "test")
      sessionStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get item from sessionStorage.
   *
   * @param key - Storage key
   * @returns Value or null if not found/unavailable
   */
  getItem(key: string): string | null {
    try {
      if (typeof sessionStorage === "undefined") {
        return null
      }
      return sessionStorage.getItem(key)
    } catch (error) {
      console.warn(`[SafeStorage] Failed to get item '${key}':`, error)
      return null
    }
  }

  /**
   * Set item in sessionStorage.
   *
   * @param key - Storage key
   * @param value - Value to store
   * @returns true if successful, false if storage unavailable
   */
  setItem(key: string, value: string): boolean {
    try {
      if (typeof sessionStorage === "undefined") {
        console.warn("[SafeStorage] sessionStorage unavailable")
        return false
      }
      sessionStorage.setItem(key, value)
      return true
    } catch (error) {
      // QuotaExceededError in private browsing or SecurityError
      console.warn(`[SafeStorage] Failed to set item '${key}':`, error)
      return false
    }
  }

  /**
   * Remove item from sessionStorage.
   *
   * @param key - Storage key to remove
   */
  removeItem(key: string): void {
    try {
      if (typeof sessionStorage === "undefined") {
        return
      }
      sessionStorage.removeItem(key)
    } catch (error) {
      console.warn(`[SafeStorage] Failed to remove item '${key}':`, error)
    }
  }

  /**
   * Clear all items from sessionStorage.
   */
  clear(): void {
    try {
      if (typeof sessionStorage === "undefined") {
        return
      }
      sessionStorage.clear()
    } catch (error) {
      console.warn("[SafeStorage] Failed to clear storage:", error)
    }
  }
}

/**
 * Safe sessionStorage wrapper instance.
 *
 * Use this instead of direct sessionStorage access for graceful error handling.
 *
 * @example
 * ```typescript
 * import { safeSessionStorage } from '../utils/storage';
 *
 * // Get value (returns null if unavailable)
 * const token = safeSessionStorage.getItem('jwt-token');
 *
 * // Set value (returns false if storage unavailable)
 * if (!safeSessionStorage.setItem('jwt-token', token)) {
 *   console.warn('Could not store token');
 * }
 *
 * // Remove value (silent on error)
 * safeSessionStorage.removeItem('jwt-token');
 *
 * // Check availability
 * if (safeSessionStorage.isAvailable()) {
 *   // Storage is functional
 * }
 * ```
 */
export const safeSessionStorage = new SafeStorage()
