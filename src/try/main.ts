/**
 * Try Before You Buy - Main JavaScript Entry Point
 *
 * This is the main entry point for all Try feature client-side JavaScript.
 * Initializes components and sets up event listeners on page load.
 *
 * Story 5.1: Initializes authentication navigation (sign in/out buttons)
 * Future stories will add additional initialization here.
 *
 * @module main
 */

import { initAuthNav } from './ui/auth-nav';

/**
 * Initialize all Try feature components on DOMContentLoaded.
 *
 * This ensures the DOM is fully loaded before attempting to access elements.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Story 5.1: Initialize authentication navigation
  initAuthNav();

  // Future initializations will be added here:
  // Story 5.2: OAuth redirect handling
  // Story 5.3: JWT token extraction
  // Story 6.x: AUP modal
  // Story 7.x: Sessions table
});
