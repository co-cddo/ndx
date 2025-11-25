/**
 * Try Button Handler
 *
 * Handles click events on "Try this now for 24 hours" buttons.
 * Implements authentication check before proceeding to AUP modal.
 *
 * Story 6.5: Authentication check before showing AUP modal
 * - Checks if user is authenticated via sessionStorage
 * - Unauthenticated users redirected to /api/auth/login
 * - Authenticated users proceed to AUP modal (Story 6.6)
 *
 * @module try-button
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-017|ADR-017: Try Button}
 */

import { authState } from '../auth/auth-provider';
import { openAupModal, closeAupModal, aupModal } from './components/aup-modal';
import { createLease } from '../api/leases-service';

/**
 * Session storage key for storing return URL after login.
 * Used to redirect user back to product page after OAuth callback.
 */
const RETURN_URL_KEY = 'isb-return-url';

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
  const tryButtons = document.querySelectorAll<HTMLButtonElement>(
    'button[data-try-id], a[data-try-id]'
  );

  console.log('[TryButton] Found', tryButtons.length, 'try button(s)');

  tryButtons.forEach((button) => {
    button.addEventListener('click', handleTryButtonClick);
  });
}

/**
 * Handle try button click event.
 *
 * @param {Event} event - Click event from try button
 */
function handleTryButtonClick(event: Event): void {
  event.preventDefault();

  const button = event.currentTarget as HTMLButtonElement;
  const tryId = button.dataset.tryId;

  if (!tryId) {
    console.error('[TryButton] Button missing data-try-id attribute');
    return;
  }

  // Story 6.5: Check authentication
  if (!authState.isAuthenticated()) {
    // Store return URL for post-login redirect
    storeReturnUrl();

    // Redirect to OAuth login
    window.location.href = '/api/auth/login';
    return;
  }

  // Story 6.6: User is authenticated, open AUP modal
  console.log('[TryButton] User authenticated, opening AUP modal with tryId:', tryId);
  openAupModal(tryId, handleLeaseAccept);
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
  console.log('[TryButton] Submitting lease request for tryId:', tryId);

  const result = await createLease(tryId);

  if (result.success) {
    // Success: Close modal and navigate to /try page
    console.log('[TryButton] Lease created successfully:', result.lease);
    closeAupModal(true);
    window.location.href = '/try';
    return;
  }

  // Handle specific error codes
  switch (result.errorCode) {
    case 'CONFLICT':
      // Max sessions reached - alert and redirect to /try
      console.log('[TryButton] Max sessions reached');
      closeAupModal(true);
      alert(result.error);
      window.location.href = '/try';
      break;

    case 'UNAUTHORIZED':
      // Auth issue - callISBAPI should have redirected, but handle gracefully
      console.log('[TryButton] Unauthorized - redirecting to login');
      closeAupModal(true);
      window.location.href = '/api/auth/login';
      break;

    case 'TIMEOUT':
    case 'NETWORK_ERROR':
    case 'SERVER_ERROR':
    default:
      // Show error in modal, allow retry
      console.error('[TryButton] Lease request failed:', result.error);
      aupModal.showError(result.error || 'An error occurred. Please try again.');
      break;
  }
}

/**
 * Store current page URL for return after OAuth login.
 *
 * The URL is stored in sessionStorage and used by the OAuth callback
 * to redirect the user back to the product page.
 */
function storeReturnUrl(): void {
  if (typeof sessionStorage === 'undefined') {
    console.warn('[TryButton] sessionStorage not available');
    return;
  }

  sessionStorage.setItem(RETURN_URL_KEY, window.location.href);
}

/**
 * Get and clear the stored return URL.
 *
 * Used by OAuth callback to get the URL to redirect to after login.
 *
 * @returns {string | null} The stored return URL, or null if not set
 */
export function getAndClearReturnUrl(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const url = sessionStorage.getItem(RETURN_URL_KEY);
  sessionStorage.removeItem(RETURN_URL_KEY);
  return url;
}
