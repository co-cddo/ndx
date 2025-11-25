/**
 * Focus Trap Utility
 *
 * Implements focus trapping for modal dialogs per ADR-026.
 * Ensures keyboard users cannot tab outside the modal while it's open.
 *
 * @module focus-trap
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-026|ADR-026: Accessible Modal Pattern}
 */

/**
 * Focusable element selectors for trap.
 * Based on WCAG 2.2 focus management requirements.
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Focus trap instance for managing modal focus.
 */
export interface FocusTrap {
  /** Activate the focus trap */
  activate(): void;
  /** Deactivate the focus trap */
  deactivate(): void;
  /** Check if trap is currently active */
  isActive(): boolean;
}

/**
 * Create a focus trap for a container element.
 *
 * When activated, traps keyboard focus within the container.
 * Tab cycles through focusable elements. Shift+Tab cycles backwards.
 *
 * @param container - The element to trap focus within
 * @param options - Configuration options
 * @returns FocusTrap instance with activate/deactivate methods
 *
 * @example
 * const trap = createFocusTrap(modalElement, {
 *   onEscape: () => closeModal(),
 *   initialFocus: modalElement.querySelector('h2')
 * });
 * trap.activate();
 */
export function createFocusTrap(
  container: HTMLElement,
  options: {
    /** Callback when Escape key is pressed */
    onEscape?: () => void;
    /** Element to focus when trap activates (defaults to first focusable) */
    initialFocus?: HTMLElement | null;
    /** Element to return focus to when trap deactivates */
    returnFocus?: HTMLElement | null;
  } = {}
): FocusTrap {
  let active = false;
  let previouslyFocused: HTMLElement | null = null;

  /**
   * Get all focusable elements within the container.
   */
  function getFocusableElements(): HTMLElement[] {
    const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
    return Array.from(elements).filter(
      (el) => el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).visibility !== 'hidden'
    );
  }

  /**
   * Handle keydown events for focus trapping and Escape key.
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (!active) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      options.onEscape?.();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];
    const activeElement = document.activeElement as HTMLElement;

    // Shift+Tab on first element → wrap to last
    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    // Tab on last element → wrap to first
    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
      return;
    }
  }

  return {
    activate() {
      if (active) return;
      active = true;

      // Store currently focused element
      previouslyFocused = options.returnFocus || (document.activeElement as HTMLElement);

      // Add keydown listener
      document.addEventListener('keydown', handleKeydown);

      // Focus initial element
      const focusable = getFocusableElements();
      const initialElement = options.initialFocus || focusable[0];

      // Delay focus slightly to ensure modal is visible
      requestAnimationFrame(() => {
        if (initialElement) {
          initialElement.focus();
        } else if (focusable.length > 0) {
          focusable[0].focus();
        }
      });
    },

    deactivate() {
      if (!active) return;
      active = false;

      // Remove keydown listener
      document.removeEventListener('keydown', handleKeydown);

      // Return focus to previous element
      if (previouslyFocused) {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
    },

    isActive() {
      return active;
    },
  };
}
