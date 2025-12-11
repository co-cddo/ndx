/**
 * Try Button Text Manager
 *
 * Manages dynamic text display on Try buttons based on:
 * - User authentication state
 * - Lease template duration (fetched from API)
 *
 * Button states:
 * - Not signed in: "Sign In to Try This Now"
 * - Signed in (loading): "Try This Now"
 * - Signed in (loaded): "Try This for X Hours/Days/Minutes"
 *
 * @module try-button-text
 */

import { authState } from "../auth/auth-provider"
import { fetchLeaseTemplate } from "../api/lease-templates-service"
import { formatLeaseDuration } from "../utils/date-utils"

/** Button text constants */
const TEXT = {
  SIGN_IN: "Sign In to Try This Now",
  LOADING: "Try This Now",
  ERROR: "Try This Now",
} as const

/** Internal state for each button */
interface ButtonState {
  tryId: string
  element: HTMLButtonElement | HTMLAnchorElement
  originalText: string
  isLoading: boolean
}

/** Track managed buttons by tryId */
const managedButtons = new Map<string, ButtonState>()

/** Unsubscribe function from auth state */
let authUnsubscribe: (() => void) | null = null

/**
 * Initialize button text management for all try buttons.
 *
 * Discovers buttons with data-try-id attribute and subscribes to auth state changes.
 * Should be called after DOM is ready (DOMContentLoaded).
 *
 * @example
 * ```typescript
 * document.addEventListener('DOMContentLoaded', () => {
 *   initTryButtonText();
 * });
 * ```
 */
export function initTryButtonText(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(
    "button[data-try-id], a[data-try-id]",
  )

  if (buttons.length === 0) {
    return
  }

  // Register each button
  buttons.forEach((button) => {
    const tryId = button.dataset.tryId
    if (!tryId) return

    managedButtons.set(tryId, {
      tryId,
      element: button,
      originalText: button.textContent || "",
      isLoading: false,
    })
  })

  // Subscribe to auth state changes
  // Note: subscribe() calls listener immediately with current state
  authUnsubscribe = authState.subscribe(handleAuthStateChange)
}

/**
 * Handle authentication state changes.
 *
 * Updates all button text based on new auth state.
 *
 * @param isAuthenticated - Whether user is authenticated
 * @private
 */
function handleAuthStateChange(isAuthenticated: boolean): void {
  managedButtons.forEach((state) => {
    if (!isAuthenticated) {
      setButtonText(state.element, TEXT.SIGN_IN)
    } else {
      // Show loading state and fetch duration
      setButtonText(state.element, TEXT.LOADING)
      fetchAndUpdateDuration(state)
    }
  })
}

/**
 * Fetch lease template and update button text with duration.
 *
 * @param state - Button state object
 * @private
 */
async function fetchAndUpdateDuration(state: ButtonState): Promise<void> {
  if (state.isLoading) {
    return // Already fetching for this button
  }

  state.isLoading = true

  try {
    const result = await fetchLeaseTemplate(state.tryId)

    // Check we're still authenticated (may have changed during fetch)
    if (!authState.isAuthenticated()) {
      setButtonText(state.element, TEXT.SIGN_IN)
      return
    }

    if (result.success && result.data) {
      const duration = formatLeaseDuration(result.data.leaseDurationInHours)
      setButtonText(state.element, `Try This for ${duration}`)
    } else {
      // Error fetching - use generic text
      console.warn("[try-button-text] Failed to fetch duration:", result.error)
      setButtonText(state.element, TEXT.ERROR)
    }
  } catch (error) {
    console.error("[try-button-text] Unexpected error:", error)
    setButtonText(state.element, TEXT.ERROR)
  } finally {
    state.isLoading = false
  }
}

/**
 * Set button text content.
 *
 * Uses textContent for XSS safety. Preserves any existing icons
 * (e.g., GOV.UK start button has an arrow SVG).
 *
 * @param element - Button element to update
 * @param text - New text content
 * @private
 */
function setButtonText(element: HTMLElement, text: string): void {
  // Preserve any icons (GOV.UK start button has an arrow icon)
  const svg = element.querySelector("svg")

  element.textContent = text

  if (svg) {
    element.appendChild(document.createTextNode(" "))
    element.appendChild(svg)
  }
}

/**
 * Cleanup function for testing and unmounting.
 *
 * Unsubscribes from auth state and clears managed buttons.
 */
export function cleanupTryButtonText(): void {
  authUnsubscribe?.()
  authUnsubscribe = null
  managedButtons.clear()
}

// Export for testing
export const _internal = {
  TEXT,
  managedButtons,
  setButtonText,
  handleAuthStateChange,
  fetchAndUpdateDuration,
}
