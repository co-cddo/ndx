"use strict";
(() => {
  // src/try/auth/auth-provider.ts
  var AuthState = class {
    constructor() {
      /**
       * Array of listener callbacks subscribed to auth state changes.
       * @private
       */
      this.listeners = [];
      /**
       * sessionStorage key for JWT token storage.
       * CRITICAL: This key must match across all Epic 5+ stories.
       * @private
       * @constant
       */
      this.TOKEN_KEY = "isb-jwt";
    }
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
    isAuthenticated() {
      if (typeof sessionStorage === "undefined") {
        console.warn("[AuthState] sessionStorage not available, auth features disabled");
        return false;
      }
      const token = sessionStorage.getItem(this.TOKEN_KEY);
      return token !== null && token !== "";
    }
    /**
     * Subscribe to authentication state changes.
     *
     * The provided listener will be called:
     * - Immediately with the current auth state (upon subscription)
     * - Whenever the auth state changes (via notify())
     *
     * @param {AuthStateListener} listener - Callback function to invoke on auth state changes
     *
     * @example
     * ```typescript
     * authState.subscribe((isAuthenticated) => {
     *   const navElement = document.getElementById('auth-nav');
     *   if (isAuthenticated) {
     *     navElement.innerHTML = '<a href="#" data-action="signout">Sign out</a>';
     *   } else {
     *     navElement.innerHTML = '<a href="/api/auth/login">Sign in</a>';
     *   }
     * });
     * ```
     */
    subscribe(listener) {
      this.listeners.push(listener);
      listener(this.isAuthenticated());
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
    notify() {
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
    login(token) {
      if (typeof sessionStorage === "undefined") {
        console.error("[AuthState] Cannot store token - sessionStorage not available");
        return;
      }
      sessionStorage.setItem(this.TOKEN_KEY, token);
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
    logout() {
      if (typeof sessionStorage === "undefined") {
        console.warn("[AuthState] sessionStorage not available, cannot clear token");
        return;
      }
      sessionStorage.removeItem(this.TOKEN_KEY);
      this.notify();
    }
  };
  var authState = new AuthState();

  // src/try/auth/oauth-flow.ts
  var RETURN_URL_KEY = "auth-return-to";
  var CALLBACK_PATH = "/callback";
  function storeReturnURL() {
    if (window.location.pathname === CALLBACK_PATH || window.location.pathname === `${CALLBACK_PATH}.html`) {
      return;
    }
    if (typeof sessionStorage === "undefined") {
      console.warn("[oauth-flow] sessionStorage not available, return URL not stored");
      return;
    }
    const returnURL = window.location.href;
    try {
      sessionStorage.setItem(RETURN_URL_KEY, returnURL);
    } catch (error) {
      console.warn("[oauth-flow] Failed to store return URL:", error);
    }
  }

  // src/try/ui/auth-nav.ts
  function initAuthNav() {
    const container = document.getElementById("auth-nav");
    if (!container) {
      console.warn("[auth-nav] Container element #auth-nav not found - auth navigation not initialized");
      return;
    }
    authState.subscribe((isAuthenticated) => {
      renderAuthNav(container, isAuthenticated);
    });
  }
  function renderAuthNav(container, isAuthenticated) {
    if (isAuthenticated) {
      container.innerHTML = `
      <a href="#" class="govuk-header__link" data-module="auth-nav" data-action="signout">
        Sign out
      </a>
    `;
    } else {
      container.innerHTML = `
      <a href="/api/auth/login" class="govuk-header__link" id="sign-in-button">
        Sign in
      </a>
    `;
      const signInButton = container.querySelector("#sign-in-button");
      if (signInButton) {
        signInButton.addEventListener("click", () => {
          storeReturnURL();
        });
      }
    }
  }

  // src/try/main.ts
  document.addEventListener("DOMContentLoaded", () => {
    initAuthNav();
  });
})();
//# sourceMappingURL=try.bundle.js.map
