/**
 * Authentication Navigation Component
 *
 * Renders and manages sign in/out buttons in the GOV.UK header navigation.
 * Subscribes to AuthState changes to update button display dynamically.
 *
 * Key Features:
 * - Event-driven updates (no polling, no manual refresh)
 * - GOV.UK Design System styling (govuk-header__link)
 * - Progressive enhancement (static HTML can provide fallback <noscript> sign in link)
 * - Accessibility: keyboard navigable, screen reader friendly
 *
 * @module auth-nav
 * @see {@link https://docs/ux-design-specification.md#Component-5-Authentication-State-Indicator|UX Design: Component 5}
 */

import { authState } from '../auth/auth-provider';
import { storeReturnURL } from '../auth/oauth-flow';

/**
 * Initialize authentication navigation component.
 *
 * This function should be called on DOMContentLoaded to set up the sign in/out buttons
 * in the GOV.UK header navigation.
 *
 * Expects a placeholder element with id="auth-nav" in the service navigation.
 * This is configured in eleventy.config.js via serviceNavigation.navigation:
 * ```javascript
 * { html: '<span id="auth-nav"></span>' }
 * ```
 * Which renders as an element that JavaScript can find and populate.
 *
 * @example
 * ```typescript
 * // In main.ts
 * document.addEventListener('DOMContentLoaded', () => {
 *   initAuthNav();
 * });
 * ```
 */
export function initAuthNav(): void {
  const container = document.getElementById('auth-nav');

  if (!container) {
    console.warn('[auth-nav] Container element #auth-nav not found - auth navigation not initialized');
    return;
  }

  // Subscribe to auth state changes
  // Note: subscribe() calls listener immediately with current state,
  // so initial render happens synchronously (no button flicker)
  authState.subscribe((isAuthenticated) => {
    renderAuthNav(container, isAuthenticated);
  });
}

/**
 * Render authentication navigation buttons based on auth state.
 *
 * Generates HTML for either "Sign in" or "Sign out" button using
 * GOV.UK Design System classes (govuk-header__link).
 *
 * @param {HTMLElement} container - DOM element to render buttons into
 * @param {boolean} isAuthenticated - Current authentication state
 *
 * @private
 */
function renderAuthNav(container: HTMLElement, isAuthenticated: boolean): void {
  if (isAuthenticated) {
    // Render "Sign out" button
    // Note: Actual sign out functionality will be added in Story 5.5
    // For now, this is a placeholder link that doesn't do anything
    container.innerHTML = `
      <a href="#" class="govuk-service-navigation__link govuk-header__link" data-module="sign-out-button" data-action="signout">
        Sign out
      </a>
    `;

    // Story 5.5: Add event listener for sign out
    const signOutLink = container.querySelector('[data-action="signout"]');
    if (signOutLink) {
      signOutLink.addEventListener('click', handleSignOut);
    }
  } else {
    // Render "Sign in" button
    // Links to OAuth login endpoint (handled by Innovation Sandbox)
    // Story 5.2: Add click handler to store return URL before OAuth redirect
    container.innerHTML = `
      <a href="/api/auth/login" class="govuk-service-navigation__link govuk-header__link" id="sign-in-button">
        Sign in
      </a>
    `;

    // Story 5.2: Store return URL before OAuth redirect
    const signInButton = container.querySelector('#sign-in-button');
    if (signInButton) {
      signInButton.addEventListener('click', () => {
        storeReturnURL();
        // Allow default link behavior (browser redirects to /api/auth/login)
      });
    }
  }
}

/**
 * Handle sign out button click.
 *
 * Story 5.5: Sign Out Functionality
 * Behavior:
 * 1. Prevent default link behavior
 * 2. Clear JWT token from sessionStorage via authState.logout()
 * 3. Notify AuthState subscribers (updates nav to show "Sign in")
 * 4. Redirect to home page
 *
 * @param {Event} event - Click event
 * @private
 */
function handleSignOut(event: Event): void {
  event.preventDefault();
  authState.logout();
  window.location.href = '/';
}
