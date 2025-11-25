/**
 * AUP Acceptance Modal Component
 *
 * WCAG 2.2 AA compliant modal for accepting Acceptable Use Policy
 * before requesting an AWS sandbox session.
 *
 * Story 6.6: Lease Request Modal Overlay UI
 * - Dark overlay background
 * - "Request AWS Sandbox Access" header
 * - Lease duration (24 hours) and budget ($50)
 * - Scrollable AUP container
 * - AUP checkbox and Continue button
 * - Focus trap per ADR-026
 *
 * @module aup-modal
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-026|ADR-026: Accessible Modal Pattern}
 */

import { createFocusTrap, type FocusTrap } from '../utils/focus-trap';
import { announce } from '../utils/aria-live';
import { fetchConfigurations, getFallbackAup } from '../../api/configurations-service';

/**
 * Modal state for external consumers.
 */
export interface AupModalState {
  isOpen: boolean;
  tryId: string | null;
  aupAccepted: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Callback when user accepts AUP and clicks Continue.
 */
export type AupAcceptCallback = (tryId: string) => Promise<void>;

/**
 * Modal element IDs for accessibility linking.
 */
const IDS = {
  MODAL: 'aup-modal',
  TITLE: 'aup-modal-title',
  DESCRIPTION: 'aup-modal-description',
  AUP_CONTENT: 'aup-content',
  CHECKBOX: 'aup-accept-checkbox',
  CONTINUE_BTN: 'aup-continue-btn',
  CANCEL_BTN: 'aup-cancel-btn',
  ERROR: 'aup-error',
} as const;

/**
 * CSS class for body scroll lock when modal is open.
 * Styles are defined in styles.scss to comply with CSP.
 */
const BODY_MODAL_OPEN_CLASS = 'aup-modal-open';

/**
 * CSS class for hidden error element.
 */
const ERROR_HIDDEN_CLASS = 'aup-modal__error--hidden';

/**
 * AUP Modal class for managing the modal lifecycle.
 */
class AupModal {
  private overlay: HTMLElement | null = null;
  private focusTrap: FocusTrap | null = null;
  private state: AupModalState = {
    isOpen: false,
    tryId: null,
    aupAccepted: false,
    isLoading: false,
    error: null,
  };
  private onAccept: AupAcceptCallback | null = null;

  /**
   * Open the modal for a specific try product.
   *
   * @param tryId - The product's try_id UUID
   * @param onAccept - Callback when user accepts AUP and clicks Continue
   */
  open(tryId: string, onAccept: AupAcceptCallback): void {
    if (this.state.isOpen) {
      console.warn('[AupModal] Modal already open');
      return;
    }

    this.state.tryId = tryId;
    this.state.isOpen = true;
    this.state.aupAccepted = false;
    this.state.error = null;
    this.onAccept = onAccept;

    this.render();
    this.setupFocusTrap();

    // Prevent body scroll via CSS class (CSP compliant)
    document.body.classList.add(BODY_MODAL_OPEN_CLASS);

    announce('Request AWS Sandbox Access dialog opened');

    // Story 6.7: Fetch AUP content from API
    this.loadAupContent();
  }

  /**
   * Load AUP content from the configurations API.
   * Story 6.7: Fetch and display AUP from Innovation Sandbox API
   */
  private async loadAupContent(): Promise<void> {
    const aupContent = document.getElementById(IDS.AUP_CONTENT);
    if (!aupContent) return;

    // Show loading state
    aupContent.textContent = 'Loading Acceptable Use Policy...';
    announce('Loading Acceptable Use Policy');

    try {
      const result = await fetchConfigurations();

      if (result.success && result.data?.aup) {
        aupContent.textContent = result.data.aup;
        announce('Acceptable Use Policy loaded');
      } else {
        // Show error but provide fallback AUP
        console.warn('[AupModal] Failed to fetch AUP:', result.error);
        aupContent.textContent = getFallbackAup();

        if (result.error) {
          this.showError(result.error + ' Using default policy.');
        }
      }
    } catch (error) {
      console.error('[AupModal] Error loading AUP:', error);
      aupContent.textContent = getFallbackAup();
      this.showError('Unable to load policy. Using default policy.');
    }
  }

  /**
   * Close the modal.
   *
   * @param confirmed - If true, skip confirmation when checkbox is checked
   */
  close(confirmed = false): void {
    if (!this.state.isOpen) return;

    // If checkbox is checked and not confirmed, ask for confirmation
    if (this.state.aupAccepted && !confirmed && !this.state.isLoading) {
      const shouldClose = window.confirm('Are you sure you want to cancel? Your acceptance will be lost.');
      if (!shouldClose) return;
    }

    this.state.isOpen = false;
    this.state.tryId = null;
    this.state.aupAccepted = false;
    this.state.error = null;
    this.onAccept = null;

    // Deactivate focus trap
    this.focusTrap?.deactivate();
    this.focusTrap = null;

    // Remove modal from DOM
    this.overlay?.remove();
    this.overlay = null;

    // Restore body scroll via CSS class (CSP compliant)
    document.body.classList.remove(BODY_MODAL_OPEN_CLASS);

    announce('Dialog closed');
  }

  /**
   * Set the AUP content to display.
   *
   * @param content - AUP text or HTML content
   */
  setAupContent(content: string): void {
    const aupContent = document.getElementById(IDS.AUP_CONTENT);
    if (aupContent) {
      aupContent.textContent = content;
    }
  }

  /**
   * Show loading state.
   *
   * @param message - Loading message to display
   */
  showLoading(message = 'Loading...'): void {
    this.state.isLoading = true;
    const body = this.overlay?.querySelector('.aup-modal__body');
    if (body) {
      body.innerHTML = `
        <div class="aup-modal__loading" aria-live="polite">
          <div class="aup-modal__spinner" aria-hidden="true"></div>
          <span>${message}</span>
        </div>
      `;
    }
    this.updateButtons();
    announce(message);
  }

  /**
   * Show error message.
   *
   * @param message - Error message to display
   */
  showError(message: string): void {
    this.state.error = message;
    this.state.isLoading = false;
    const errorEl = document.getElementById(IDS.ERROR);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove(ERROR_HIDDEN_CLASS);
    }
    this.updateButtons();
    announce(message, 'assertive');
  }

  /**
   * Hide error message.
   */
  hideError(): void {
    this.state.error = null;
    const errorEl = document.getElementById(IDS.ERROR);
    if (errorEl) {
      errorEl.classList.add(ERROR_HIDDEN_CLASS);
    }
  }

  /**
   * Get current modal state.
   */
  getState(): AupModalState {
    return { ...this.state };
  }

  /**
   * Render the modal HTML.
   * Styles are defined in styles.scss to comply with CSP (no inline styles).
   */
  private render(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'aup-modal-overlay';
    this.overlay.setAttribute('aria-hidden', 'false');

    this.overlay.innerHTML = `
      <div
        id="${IDS.MODAL}"
        class="aup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="${IDS.TITLE}"
        aria-describedby="${IDS.DESCRIPTION}"
      >
        <div class="aup-modal__header">
          <h2 id="${IDS.TITLE}" class="govuk-heading-l aup-modal__title">Request AWS Sandbox Access</h2>
        </div>
        <div class="aup-modal__body">
          <div id="${IDS.DESCRIPTION}" class="aup-modal__info">
            <p class="govuk-body aup-modal__info-text">
              <strong>Session duration:</strong> 24 hours
            </p>
            <p class="govuk-body aup-modal__info-text">
              <strong>Budget limit:</strong> $50 USD
            </p>
          </div>

          <div id="${IDS.ERROR}" class="aup-modal__error aup-modal__error--hidden govuk-body" role="alert"></div>

          <h3 class="govuk-heading-s">Acceptable Use Policy</h3>
          <div class="aup-modal__aup-container">
            <p id="${IDS.AUP_CONTENT}" class="govuk-body-s aup-modal__aup-content">Loading AUP content...</p>
          </div>

          <div class="aup-modal__checkbox-group govuk-checkboxes">
            <div class="govuk-checkboxes__item">
              <input
                type="checkbox"
                id="${IDS.CHECKBOX}"
                class="govuk-checkboxes__input"
                aria-describedby="${IDS.DESCRIPTION}"
              />
              <label for="${IDS.CHECKBOX}" class="govuk-label govuk-checkboxes__label">
                I have read and accept the Acceptable Use Policy
              </label>
            </div>
          </div>
        </div>
        <div class="aup-modal__footer">
          <button
            id="${IDS.CONTINUE_BTN}"
            type="button"
            class="govuk-button"
            disabled
            aria-disabled="true"
          >
            Continue
          </button>
          <button
            id="${IDS.CANCEL_BTN}"
            type="button"
            class="govuk-button govuk-button--secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to modal elements.
   */
  private attachEventListeners(): void {
    const checkbox = document.getElementById(IDS.CHECKBOX) as HTMLInputElement;
    const continueBtn = document.getElementById(IDS.CONTINUE_BTN);
    const cancelBtn = document.getElementById(IDS.CANCEL_BTN);

    // Checkbox change
    checkbox?.addEventListener('change', () => {
      this.state.aupAccepted = checkbox.checked;
      this.updateButtons();

      if (checkbox.checked) {
        announce('Acceptable Use Policy accepted. Continue button is now enabled.');
      } else {
        announce('Acceptable Use Policy not accepted. Continue button is disabled.');
      }
    });

    // Continue button click
    continueBtn?.addEventListener('click', async () => {
      if (!this.state.aupAccepted || this.state.isLoading || !this.state.tryId) return;

      this.state.isLoading = true;
      this.updateButtons();
      announce('Requesting your sandbox...');

      try {
        await this.onAccept?.(this.state.tryId);
        // Success - callback handles navigation
      } catch (error) {
        this.state.isLoading = false;
        this.updateButtons();
        // Error handling is done by the callback
      }
    });

    // Cancel button click
    cancelBtn?.addEventListener('click', () => {
      this.close();
    });
  }

  /**
   * Update button disabled states.
   */
  private updateButtons(): void {
    const continueBtn = document.getElementById(IDS.CONTINUE_BTN) as HTMLButtonElement;
    const cancelBtn = document.getElementById(IDS.CANCEL_BTN) as HTMLButtonElement;

    if (continueBtn) {
      const shouldDisable = !this.state.aupAccepted || this.state.isLoading;
      continueBtn.disabled = shouldDisable;
      continueBtn.setAttribute('aria-disabled', String(shouldDisable));

      if (this.state.isLoading) {
        continueBtn.textContent = 'Requesting...';
      } else {
        continueBtn.textContent = 'Continue';
      }
    }

    if (cancelBtn) {
      cancelBtn.disabled = this.state.isLoading;
      cancelBtn.setAttribute('aria-disabled', String(this.state.isLoading));
    }
  }

  /**
   * Setup focus trap for the modal.
   */
  private setupFocusTrap(): void {
    const modal = document.getElementById(IDS.MODAL);
    if (!modal) return;

    this.focusTrap = createFocusTrap(modal, {
      onEscape: () => this.close(),
      initialFocus: document.getElementById(IDS.CANCEL_BTN),
    });
    this.focusTrap.activate();
  }
}

/**
 * Singleton modal instance.
 */
export const aupModal = new AupModal();

/**
 * Open the AUP modal for a specific try product.
 *
 * @param tryId - The product's try_id UUID
 * @param onAccept - Callback when user accepts AUP and clicks Continue
 *
 * @example
 * openAupModal('550e8400-e29b-41d4-a716-446655440000', async (tryId) => {
 *   await submitLeaseRequest(tryId);
 *   window.location.href = '/try';
 * });
 */
export function openAupModal(tryId: string, onAccept: AupAcceptCallback): void {
  aupModal.open(tryId, onAccept);
}

/**
 * Close the AUP modal.
 *
 * @param confirmed - If true, skip confirmation when checkbox is checked
 */
export function closeAupModal(confirmed = false): void {
  aupModal.close(confirmed);
}
