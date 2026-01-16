/**
 * Try Button Handler
 *
 * Handles click events on "Try this now" buttons.
 * Implements authentication check before proceeding to AUP modal.
 *
 * Story 6.5: Authentication check before showing AUP modal
 * - Checks if user is authenticated via sessionStorage
 * - Unauthenticated users redirected to /api/auth/login
 * - Authenticated users proceed to AUP modal (Story 6.6)
 *
 * Story 2.1: Auth Choice Modal
 * - Unauthenticated users now see auth choice modal instead of direct redirect
 * - Modal offers "Sign in" or "Create account" options
 *
 * @module try-button
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-017|ADR-017: Try Button}
 */

import { authState } from "../auth/auth-provider"
import { openAupModal, closeAupModal, aupModal } from "./components/aup-modal"
import { createLease } from "../api/leases-service"
import { openAuthChoiceModal } from "../../signup/ui/auth-choice-modal"
import { trackTryButtonClick } from "../analytics"

/**
 * Initialize try button click handlers.
 *
 * Finds all buttons with data-try-id attribute (indicates a Try button).
 * Note: We use data-try-id instead of data-module="try-button" because
 * GOV.UK button macro already sets data-module="govuk-button" and HTML
 * doesn't support duplicate attributes.
 *
 * Called from main.ts on DOMContentLoaded.
 */
export function initTryButton(): void {
  // Select buttons by data-try-id presence (more reliable than duplicate data-module)
  const tryButtons = document.querySelectorAll<HTMLButtonElement>("button[data-try-id], a[data-try-id]")

  tryButtons.forEach((button) => {
    button.addEventListener("click", handleTryButtonClick)
  })
}

/**
 * Handle try button click event (used by direct event handlers).
 *
 * @param {Event} event - Click event from try button
 */
function handleTryButtonClick(event: Event): void {
  event.preventDefault()

  const button = event.currentTarget as HTMLButtonElement
  processTryButtonClick(button)
}

/**
 * Handle try button click via delegated event handler.
 * Called from main.ts's document-level click handler.
 *
 * @param {Event} event - Click event
 * @param {HTMLElement} button - The try button element
 */
export function handleTryButtonClickDelegated(event: Event, button: HTMLElement): void {
  event.preventDefault()
  processTryButtonClick(button)
}

/**
 * Core try button click processing logic.
 *
 * @param {HTMLElement} button - The try button element
 */
function processTryButtonClick(button: HTMLElement): void {
  const tryId = button.dataset.tryId

  if (!tryId) {
    console.error("[TryButton] Button missing data-try-id attribute")
    return
  }

  // Track try button click (consent-gated)
  trackTryButtonClick(tryId)

  // Story 6.5 & 2.1: Check authentication
  if (!authState.isAuthenticated()) {
    // Story 2.1: Show auth choice modal instead of direct redirect
    // Modal handles return URL storage internally before redirect
    openAuthChoiceModal()
    return
  }

  // Story 6.6: User is authenticated, open AUP modal
  openAupModal(tryId, handleLeaseAccept)
}

/**
 * Handle lease acceptance callback from AUP modal.
 *
 * Called when user accepts AUP and clicks Continue.
 * Story 6.9: Submits lease request to API and handles responses.
 *
 * @param tryId - The product's try_id UUID
 */
async function handleLeaseAccept(tryId: string): Promise<void> {
  const result = await createLease(tryId)

  if (result.success) {
    // Success: Close modal and navigate to /try page
    closeAupModal()
    window.location.href = "/try"
    return
  }

  // Handle specific error codes
  switch (result.errorCode) {
    case "CONFLICT":
      // Max sessions reached - alert and redirect to /try
      closeAupModal()
      alert(result.error)
      window.location.href = "/try"
      break

    case "UNAUTHORIZED":
      // Auth issue - callISBAPI should have redirected, but handle gracefully
      closeAupModal()
      window.location.href = "/api/auth/login"
      break

    case "TIMEOUT":
    case "NETWORK_ERROR":
    case "SERVER_ERROR":
    default:
      // Show error in modal, allow retry
      aupModal.showError(result.error || "An error occurred. Please try again.")
      break
  }
}
