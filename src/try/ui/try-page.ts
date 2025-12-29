/**
 * Try Page Component
 *
 * Story 5.9: Empty State UI for Unauthenticated /try Page
 * Story 7.2: Fetch and display user leases
 * Story 7.3-7.8: Sessions table with status, dates, budget, actions
 * Story 7.9: Link to catalogue filter
 * Story 7.10: First-time user guidance
 *
 * Renders the /try page content based on authentication state:
 * - Unauthenticated: Empty state with sign in button
 * - Authenticated: Sessions table with user's leases
 *
 * Uses AuthState subscription pattern (ADR-024) to react to auth changes.
 *
 * @module try-page
 */

import { authState } from "../auth/auth-provider"
import { fetchUserLeases, Lease } from "../api/sessions-service"
import { renderSessionsTable, renderLoadingState, renderErrorState } from "./components/sessions-table"
import "./styles/sessions-table.css"

/**
 * Container element ID for try sessions content.
 */
const CONTAINER_ID = "try-sessions-container"

/**
 * Current state of the try page.
 */
interface TryPageState {
  loading: boolean
  refreshing: boolean
  error: string | null
  leases: Lease[]
}

let currentState: TryPageState = {
  loading: false,
  refreshing: false,
  error: null,
  leases: [],
}

let container: HTMLElement | null = null
let refreshTimer: number | null = null
let countdownTimer: number | null = null
let secondsUntilRefresh = 10
// CRITICAL-3 FIX: Store unsubscribe function for auth state cleanup
let authUnsubscribe: (() => void) | null = null
// MEMORY LEAK FIX: Store visibility change handler for cleanup
let visibilityChangeHandler: (() => void) | null = null

/**
 * Initialize the try page component.
 *
 * Subscribes to AuthState changes and renders appropriate content:
 * - Empty state (sign in prompt) when unauthenticated
 * - Sessions table when authenticated
 *
 * MEMORY LEAK FIX: Returns cleanup function and adds visibility change listener
 * to pause/resume auto-refresh when tab is hidden/visible.
 *
 * @returns Cleanup function to call when navigating away from the page
 *
 * @example
 * ```typescript
 * // In main.ts
 * import { initTryPage } from './ui/try-page';
 *
 * document.addEventListener('DOMContentLoaded', () => {
 *   const cleanup = initTryPage();
 *   // Call cleanup() when navigating away
 * });
 * ```
 */
export function initTryPage(): (() => void) | undefined {
  container = document.getElementById(CONTAINER_ID)
  if (!container) {
    // Not on /try page, skip initialization
    return undefined
  }

  // Subscribe to auth state changes (ADR-024)
  // Callback is called immediately with current state
  // CRITICAL-3 FIX: Store unsubscribe function for cleanup
  authUnsubscribe = authState.subscribe((isAuthenticated) => {
    if (isAuthenticated) {
      loadAndRenderSessions()
    } else {
      renderEmptyState(container!)
    }
  })

  // MEMORY LEAK FIX: Add visibility change listener to pause auto-refresh
  // when tab is hidden (saves resources and prevents stale data on return)
  visibilityChangeHandler = () => {
    if (document.hidden) {
      // Tab is hidden - pause auto-refresh
      stopAutoRefresh()
    } else if (authState.isAuthenticated() && currentState.leases.length > 0) {
      // Tab is visible and user is authenticated with sessions - resume refresh
      startAutoRefresh()
    }
  }
  document.addEventListener("visibilitychange", visibilityChangeHandler)

  // Set up click handlers for action buttons
  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement

    // Retry fetch button
    if (target.dataset.action === "retry-fetch") {
      loadAndRenderSessions()
    }

    // Get CLI Credentials link - show alert before navigation
    const credentialsLink = target.closest('[data-action="get-credentials"]') as HTMLElement | null
    if (credentialsLink) {
      // Show instruction alert - link handles navigation after alert is dismissed
      window.alert("On the page that opens, click 'Access keys' to view your CLI credentials.")
    }
  })

  // Return cleanup function for proper teardown
  return cleanupTryPage
}

/**
 * Load sessions from API and render the table.
 */
async function loadAndRenderSessions(): Promise<void> {
  if (!container) return

  // Show loading state
  currentState = { loading: true, refreshing: false, error: null, leases: [] }
  container.innerHTML = `
    <h1 class="govuk-heading-l">Your try sessions</h1>
    <p class="govuk-body-l">Manage your AWS sandbox environments</p>
    ${renderLoadingState()}
  `

  // Fetch sessions
  const result = await fetchUserLeases()

  if (result.success && result.leases) {
    currentState = { loading: false, refreshing: false, error: null, leases: result.leases }
    renderAuthenticatedState(container, result.leases)
  } else {
    currentState = { loading: false, refreshing: false, error: result.error || "Unknown error", leases: [] }
    // Render error state with helpful navigation (still allow browsing catalogue)
    container.innerHTML = `
      <h1 class="govuk-heading-l">Your try sessions</h1>
      <p class="govuk-body-l">Manage your AWS sandbox environments</p>
      ${renderErrorState(currentState.error!)}

      <hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible">

      <h2 class="govuk-heading-m">Want to try more products?</h2>
      <p class="govuk-body">
        Browse our catalogue to find products available for evaluation through the Innovation Sandbox programme.
      </p>
      <a href="/catalogue/tags/try-before-you-buy" class="govuk-link">
        Browse products you can try
      </a>

      ${renderFirstTimeGuidance()}
    `
  }
}

/**
 * Render empty state for unauthenticated users.
 *
 * Displays:
 * - Heading: "Sign in to view your try sessions"
 * - Body text explaining what Try feature offers
 * - Sign in button (GOV.UK start button style)
 *
 * @param container - DOM element to render into
 */
export function renderEmptyState(container: HTMLElement): void {
  // Stop auto-refresh timer when showing empty state
  stopAutoRefresh()

  container.innerHTML = `
    <h1 class="govuk-heading-l">Sign in to view your try sessions</h1>
    <p class="govuk-body">
      You need to sign in with your Innovation Sandbox account to request and manage AWS sandbox environments.
    </p>
    <a href="/api/auth/login" role="button" draggable="false" class="govuk-button govuk-button--start" data-module="govuk-button">
      Sign in
      <svg class="govuk-button__start-icon" xmlns="http://www.w3.org/2000/svg" width="17.5" height="19" viewBox="0 0 33 40" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z" />
      </svg>
    </a>
  `
}

/**
 * Render authenticated state with sessions table.
 *
 * Story 7.2-7.10: Full sessions dashboard implementation.
 * Story 7.5: Auto-refresh expiry dates every minute.
 *
 * @param container - DOM element to render into
 * @param leases - User's leases to display
 */
export function renderAuthenticatedState(container: HTMLElement, leases: Lease[], isRefreshing = false): void {
  const hasLeases = leases.length > 0
  const activeCount = leases.filter((l) => l.status === "Active").length
  const pendingCount = leases.filter((l) => l.status === "Pending").length

  // Build summary text
  let summaryText = ""
  if (hasLeases) {
    const parts = []
    if (activeCount > 0) parts.push(`${activeCount} active`)
    if (pendingCount > 0) parts.push(`${pendingCount} pending`)
    summaryText =
      parts.length > 0 ? `You have ${parts.join(" and ")} session${activeCount + pendingCount > 1 ? "s" : ""}.` : ""
  }

  // Refresh status - countdown or updating
  const refreshStatus = isRefreshing
    ? `<span class="sessions-refresh-indicator" aria-live="polite">Updating...</span>`
    : `<span class="sessions-refresh-countdown" id="refresh-countdown">Refreshing in ${secondsUntilRefresh}s</span>`

  container.innerHTML = `
    <h1 class="govuk-heading-l">Your try sessions</h1>
    <p class="govuk-body sessions-description">This page updates automatically. ${refreshStatus}</p>

    ${summaryText ? `<p class="govuk-body-l">${summaryText}</p>` : ""}

    ${renderSessionsTable(leases)}

    <hr class="govuk-section-break govuk-section-break--l govuk-section-break--visible">

    <h2 class="govuk-heading-m">Want to try more products?</h2>
    <p class="govuk-body">
      Browse our catalogue to find products available for evaluation through the Innovation Sandbox programme.
    </p>
    <a href="/catalogue/tags/try-before-you-buy" class="govuk-link">
      Browse products you can try
    </a>

    ${!hasLeases ? renderFirstTimeGuidance() : ""}
  `

  // Story 7.5: Start auto-refresh timer for relative expiry times (refresh every 60 seconds)
  startAutoRefresh()
}

/**
 * Render first-time user guidance (Story 7.10).
 *
 * @returns HTML string for guidance section
 */
function renderFirstTimeGuidance(): string {
  return `
    <div class="govuk-inset-text govuk-!-margin-top-6">
      <h3 class="govuk-heading-s">New to Try Before You Buy?</h3>
      <p class="govuk-body">
        With Innovation Sandbox, you can evaluate AWS products in a secure sandbox environment.
        Here's how to get started:
      </p>
      <ol class="govuk-list govuk-list--number">
        <li>Browse the catalogue for products marked "Try Before You Buy"</li>
        <li>Click "Try this now" on a product page</li>
        <li>Accept the Acceptable Use Policy</li>
        <li>Your sandbox session will appear here within minutes</li>
      </ol>
    </div>
  `
}

/**
 * Start auto-refresh timer for relative expiry times.
 *
 * Story 7.5: AC requires expiry dates to update automatically every minute.
 * This ensures relative time displays (e.g., "in 2 hours") stay current.
 *
 * Clears any existing timer before starting a new one to prevent multiple timers.
 */
function startAutoRefresh(): void {
  // Clear existing timers
  stopAutoRefresh()

  // Reset countdown
  secondsUntilRefresh = 10

  // Update countdown every second
  countdownTimer = window.setInterval(() => {
    secondsUntilRefresh--
    const countdownEl = document.getElementById("refresh-countdown")
    if (countdownEl && secondsUntilRefresh > 0) {
      countdownEl.textContent = `Refreshing in ${secondsUntilRefresh}s`
    }
  }, 1000)

  // Refresh table display every 10 seconds
  refreshTimer = window.setInterval(() => {
    if (container && currentState.leases.length > 0 && !currentState.loading) {
      // Show refreshing indicator and re-render table with current leases
      currentState.refreshing = true
      renderAuthenticatedState(container, currentState.leases, true)
      // Reset countdown and hide indicator after a brief delay
      setTimeout(() => {
        currentState.refreshing = false
        secondsUntilRefresh = 10
      }, 1000)
    }
  }, 10000) // 10 seconds
}

/**
 * Stop auto-refresh timer.
 *
 * Called when navigating away from sessions view or when user signs out.
 */
function stopAutoRefresh(): void {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (countdownTimer !== null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

/**
 * Clean up try page resources.
 *
 * CRITICAL-3 FIX: Properly cleanup subscriptions and timers to prevent memory leaks.
 * MEMORY LEAK FIX: Also removes visibility change listener.
 *
 * Should be called when navigating away from the try page.
 *
 * @example
 * ```typescript
 * // In SPA navigation handler
 * cleanupTryPage();
 * ```
 */
export function cleanupTryPage(): void {
  // Stop auto-refresh timer
  stopAutoRefresh()

  // Unsubscribe from auth state changes
  if (authUnsubscribe) {
    authUnsubscribe()
    authUnsubscribe = null
  }

  // MEMORY LEAK FIX: Remove visibility change listener
  if (visibilityChangeHandler) {
    document.removeEventListener("visibilitychange", visibilityChangeHandler)
    visibilityChangeHandler = null
  }

  // Clear state references
  container = null
  currentState = { loading: false, refreshing: false, error: null, leases: [] }
}
