/**
 * Authentication State Provider
 *
 * Implements event-driven authentication state management using the Observer pattern (ADR-024).
 * Multiple components can subscribe to auth state changes, ensuring consistent UI updates
 * across the application when users sign in or out.
 *
 * Key Design Decisions:
 * - Uses sessionStorage (not localStorage) for JWT token storage (clears on browser close)
 * - Token key: 'isb-jwt' (consistent across all Epic 5+ stories via shared constants)
 * - Reactive pattern: subscribers notified immediately when auth state changes
 * - Singleton instance exported for application-wide use
 * - H7: subscribe() returns unsubscribe function for cleanup
 *
 * @module auth-provider
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-024|ADR-024: Authentication State Management}
 */

import { JWT_TOKEN_KEY } from '../constants';

/**
 * Type definition for authentication state change listeners.
 * Callbacks receive the current authentication state as a boolean.
 */
type AuthStateListener = (isAuthenticated: boolean) => void;

/**
 * Type definition for unsubscribe function returned by subscribe().
 * Call this function to remove the listener and prevent memory leaks.
 */
type Unsubscribe = () => void;

/**
 * AuthState class manages authentication state using an event-driven pattern.
 *
 * Usage Example:
 * ```typescript
 * import { authState } from './auth-provider';
 *
 * // Subscribe to auth state changes
 * authState.subscribe((isAuthenticated) => {
 *   if (isAuthenticated) {
 *     console.log('User signed in');
 *   } else {
 *     console.log('User signed out');
 *   }
 * });
 *
 * // Check current auth state
 * if (authState.isAuthenticated()) {
 *   console.log('User is currently signed in');
 * }
 *
 * // Notify subscribers of auth state change (called by sign in/out flows)
 * authState.notify();
 * ```
 */
class AuthState {
  /**
   * Array of listener callbacks subscribed to auth state changes.
   * @private
   */
  private listeners: AuthStateListener[] = [];

  // TOKEN_KEY imported from '../constants' as JWT_TOKEN_KEY

  /**
   * Check if user is currently authenticated.
   *
   * Authentication is determined by the presence of a JWT token in sessionStorage.
   * This method does NOT validate the token's expiration or signature - that's
   * handled server-side by the Innovation Sandbox API.
   *
   * @returns {boolean} True if JWT token exists in sessionStorage, false otherwise
   *
   * @example
   * ```typescript
   * if (authState.isAuthenticated()) {
   *   // Show "Sign out" button
   * } else {
   *   // Show "Sign in" button
   * }
   * ```
   */
  isAuthenticated(): boolean {
    // Defensive programming: Check if sessionStorage is available
    // (some browsers disable in private/incognito mode)
    if (typeof sessionStorage === 'undefined') {
      console.warn('[AuthState] sessionStorage not available, auth features disabled');
      return false;
    }

    const token = sessionStorage.getItem(JWT_TOKEN_KEY);
    return token !== null && token !== '';
  }

  /**
   * Subscribe to authentication state changes.
   *
   * The provided listener will be called:
   * - Immediately with the current auth state (upon subscription)
   * - Whenever the auth state changes (via notify())
   *
   * H7: Returns an unsubscribe function for cleanup to prevent memory leaks.
   *
   * @param {AuthStateListener} listener - Callback function to invoke on auth state changes
   * @returns {Unsubscribe} Function to call to unsubscribe and remove the listener
   *
   * @example
   * ```typescript
   * const unsubscribe = authState.subscribe((isAuthenticated) => {
   *   const navElement = document.getElementById('auth-nav');
   *   if (isAuthenticated) {
   *     navElement.innerHTML = '<a href="#" data-action="signout">Sign out</a>';
   *   } else {
   *     navElement.innerHTML = '<a href="/api/auth/login">Sign in</a>';
   *   }
   * });
   *
   * // Later, when component unmounts or is no longer needed:
   * unsubscribe();
   * ```
   */
  subscribe(listener: AuthStateListener): Unsubscribe {
    this.listeners.push(listener);

    // Immediately call listener with current state (prevents initial render delay)
    listener(this.isAuthenticated());

    // H7: Return unsubscribe function for cleanup
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscribed listeners of authentication state change.
   *
   * This method should be called by:
   * - Story 5.3: JWT token extraction (after successful OAuth callback)
   * - Story 5.5: Sign out functionality (after clearing sessionStorage)
   * - Any other component that modifies auth state
   *
   * @example
   * ```typescript
   * // After storing JWT token in sessionStorage (Story 5.3)
   * sessionStorage.setItem('isb-jwt', token);
   * authState.notify(); // Triggers all subscribers to update UI
   *
   * // After sign out (Story 5.5)
   * sessionStorage.removeItem('isb-jwt');
   * authState.notify(); // Triggers all subscribers to update UI
   * ```
   */
  notify(): void {
    const isAuth = this.isAuthenticated();
    this.listeners.forEach((listener) => listener(isAuth));
  }

  /**
   * Login helper method (for future use in Story 5.3).
   *
   * Stores JWT token in sessionStorage and notifies all subscribers.
   *
   * @param {string} token - JWT token received from OAuth callback
   *
   * @example
   * ```typescript
   * // Story 5.3: JWT Token Extraction
   * const urlParams = new URLSearchParams(window.location.search);
   * const token = urlParams.get('token');
   * if (token) {
   *   authState.login(token);
   * }
   * ```
   */
  login(token: string): void {
    if (typeof sessionStorage === 'undefined') {
      console.error('[AuthState] Cannot store token - sessionStorage not available');
      return;
    }

    sessionStorage.setItem(JWT_TOKEN_KEY, token);
    this.notify();
  }

  /**
   * Logout helper method (for future use in Story 5.5).
   *
   * Removes JWT token from sessionStorage and notifies all subscribers.
   *
   * @example
   * ```typescript
   * // Story 5.5: Sign Out Functionality
   * document.querySelector('[data-action="signout"]').addEventListener('click', (e) => {
   *   e.preventDefault();
   *   authState.logout();
   *   window.location.href = '/';
   * });
   * ```
   */
  logout(): void {
    if (typeof sessionStorage === 'undefined') {
      console.warn('[AuthState] sessionStorage not available, cannot clear token');
      return;
    }

    sessionStorage.removeItem(JWT_TOKEN_KEY);
    this.notify();
  }
}

/**
 * Singleton instance of AuthState.
 *
 * Export this instance for use across the application to ensure
 * a single source of truth for authentication state.
 *
 * @example
 * ```typescript
 * // In auth-nav.ts
 * import { authState } from '../auth/auth-provider';
 *
 * export function initAuthNav() {
 *   authState.subscribe((isAuthenticated) => {
 *     renderAuthNav(isAuthenticated);
 *   });
 * }
 * ```
 */
export const authState = new AuthState();
