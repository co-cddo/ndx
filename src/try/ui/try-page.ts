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

/**
 * Container element ID for try sessions content.
 */
const CONTAINER_ID = "try-sessions-container"

/**
 * Current state of the try page.
 */
interface TryPageState {
  loading: boolean
  error: string | null
  leases: Lease[]
}

let currentState: TryPageState = {
  loading: false,
  error: null,
  leases: [],
}

let container: HTMLElement | null = null

/**
 * Initialize the try page component.
 *
 * Subscribes to AuthState changes and renders appropriate content:
 * - Empty state (sign in prompt) when unauthenticated
 * - Sessions table when authenticated
 *
 * @example
 * ```typescript
 * // In main.ts
 * import { initTryPage } from './ui/try-page';
 *
 * document.addEventListener('DOMContentLoaded', () => {
 *   initTryPage();
 * });
 * ```
 */
export function initTryPage(): void {
  container = document.getElementById(CONTAINER_ID)
  if (!container) {
    // Not on /try page, skip initialization
    return
  }

  // Subscribe to auth state changes (ADR-024)
  // Callback is called immediately with current state
  authState.subscribe((isAuthenticated) => {
    if (isAuthenticated) {
      loadAndRenderSessions()
    } else {
      renderEmptyState(container!)
    }
  })

  // Set up retry button handler
  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement
    if (target.dataset.action === "retry-fetch") {
      loadAndRenderSessions()
    }
  })
}

/**
 * Load sessions from API and render the table.
 */
async function loadAndRenderSessions(): Promise<void> {
  if (!container) return

  // Show loading state
  currentState = { loading: true, error: null, leases: [] }
  container.innerHTML = `
    <h1 class="govuk-heading-l">Your try sessions</h1>
    ${renderLoadingState()}
  `

  // Fetch sessions
  const result = await fetchUserLeases()

  if (result.success && result.leases) {
    currentState = { loading: false, error: null, leases: result.leases }
    renderAuthenticatedState(container, result.leases)
  } else {
    currentState = { loading: false, error: result.error || "Unknown error", leases: [] }
    // Render error state with helpful navigation (still allow browsing catalogue)
    container.innerHTML = `
      <h1 class="govuk-heading-l">Your try sessions</h1>
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
 *
 * @param container - DOM element to render into
 * @param leases - User's leases to display
 */
export function renderAuthenticatedState(container: HTMLElement, leases: Lease[]): void {
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

  container.innerHTML = `
    <h1 class="govuk-heading-l">Your try sessions</h1>

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
        With Innovation Sandbox, you can evaluate AWS products in a secure sandbox environment
        for 24 hours with a $50 budget. Here's how to get started:
      </p>
      <ol class="govuk-list govuk-list--number">
        <li>Browse the catalogue for products marked "Try Before You Buy"</li>
        <li>Click "Try this now for 24 hours" on a product page</li>
        <li>Accept the Acceptable Use Policy</li>
        <li>Your sandbox session will appear here within minutes</li>
      </ol>
    </div>
  `
}
