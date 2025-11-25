/**
 * ARIA Live Region Utility
 *
 * Provides screen reader announcements for dynamic content changes.
 * Implements ARIA live regions per ADR-028.
 *
 * @module aria-live
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-028|ADR-028: ARIA Live Regions}
 */

let liveRegion: HTMLElement | null = null;

/**
 * Get or create the ARIA live region element.
 * Uses visually-hidden CSS class for off-screen positioning.
 */
function getLiveRegion(): HTMLElement {
  if (liveRegion && document.body.contains(liveRegion)) {
    return liveRegion;
  }

  liveRegion = document.createElement('div');
  liveRegion.id = 'aria-live-region';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');

  // Visually hidden but accessible to screen readers
  // Using GOV.UK Frontend's visually-hidden class (CSP compliant)
  liveRegion.className = 'govuk-visually-hidden';

  document.body.appendChild(liveRegion);
  return liveRegion;
}

/**
 * Announce a message to screen readers.
 *
 * Uses aria-live="polite" by default, which waits for a pause in speech.
 * Use "assertive" for urgent messages that interrupt current speech.
 *
 * @param message - The message to announce
 * @param priority - "polite" (default) or "assertive"
 *
 * @example
 * announce('Loading AUP content...');
 * announce('Error: Failed to load content', 'assertive');
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const region = getLiveRegion();

  // Update aria-live attribute for priority
  region.setAttribute('aria-live', priority);

  // Clear and set content (ensures re-announcement)
  region.textContent = '';

  // Small delay to ensure screen readers pick up the change
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/**
 * Clear the live region content.
 * Call this to stop repeating announcements.
 */
export function clearAnnouncement(): void {
  if (liveRegion) {
    liveRegion.textContent = '';
  }
}
