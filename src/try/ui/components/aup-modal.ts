/**
 * AUP Acceptance Modal Component
 *
 * WCAG 2.2 AA compliant modal for accepting Acceptable Use Policy
 * before requesting an AWS sandbox session.
 *
 * Story 6.6: Lease Request Modal Overlay UI
 * - Dark overlay background
 * - "Request AWS Sandbox Access" header
 * - Lease duration and budget display
 * - Scrollable AUP container
 * - AUP checkbox and Continue button
 * - Focus trap per ADR-026
 *
 * Story 9.2: Display Dynamic Lease Details in Modal
 * - Fetches lease template from API for actual duration/budget
 * - Loading skeleton during fetch
 * - ARIA announcements for loading/success/error states
 * - Error state shows "Unknown" with error styling
 *
 * Story 9.3: Gate Continue Button on All Data Loaded
 * - Button disabled until both AUP and lease template loaded successfully
 * - isFullyLoaded computed property for all-or-nothing logic
 * - ARIA announces when button becomes enabled
 *
 * Story 9.4: Clear Error States for Failed Loads
 * - 404 error displays "This sandbox is currently unavailable"
 * - Other errors display "Unable to load session details"
 * - Enhanced error logging with tryId and errorCode
 *
 * @module aup-modal
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-026|ADR-026: Accessible Modal Pattern}
 */

import { createFocusTrap, type FocusTrap } from '../utils/focus-trap';
import { announce } from '../utils/aria-live';
import { fetchConfigurations, getFallbackAup } from '../../api/configurations-service';
import { fetchLeaseTemplate, type LeaseTemplateResult } from '../../api/lease-templates-service';

/**
 * Lease template data for displaying session terms.
 * Story 9.2: Display Dynamic Lease Details in Modal
 */
export interface LeaseTemplateData {
  leaseDurationInHours: number;
  maxSpend: number;
}

/**
 * Modal state for external consumers.
 * Extended in Story 9.2 to include lease template loading state.
 */
export interface AupModalState {
  isOpen: boolean;
  tryId: string | null;
  aupAccepted: boolean;
  isLoading: boolean;
  error: string | null;
  /** Story 9.2: Whether lease template is currently loading */
  leaseTemplateLoading: boolean;
  /** Story 9.2: Whether lease template has been loaded (success or failure) */
  leaseTemplateLoaded: boolean;
  /** Story 9.2: Lease template data (null if not loaded or error) */
  leaseTemplateData: LeaseTemplateData | null;
  /** Story 9.2: Error message if lease template load failed */
  leaseTemplateError: string | null;
  /** Story 9.3: Whether AUP content has been loaded successfully (not fallback) */
  aupLoaded: boolean;
  /** Story 9.3: Computed - Whether all required data is fully loaded */
  isFullyLoaded: boolean;
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
  /** Story 9.2: Session terms container for loading skeleton */
  SESSION_TERMS: 'aup-session-terms',
  /** Story 9.2: Duration display element */
  DURATION: 'aup-duration',
  /** Story 9.2: Budget display element */
  BUDGET: 'aup-budget',
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
 *
 * TODO: Consider extracting into smaller modules as the component grows:
 * - aup-modal-state.ts - State management and computed properties
 * - aup-modal-dom.ts - DOM manipulation and rendering
 * - aup-modal-api.ts - API integration (loadAupContent, loadLeaseTemplate)
 */
/**
 * Internal state without computed properties.
 * Story 9.3: isFullyLoaded is computed, not stored.
 */
type AupModalInternalState = Omit<AupModalState, 'isFullyLoaded'>;

class AupModal {
  private overlay: HTMLElement | null = null;
  private focusTrap: FocusTrap | null = null;
  private state: AupModalInternalState = {
    isOpen: false,
    tryId: null,
    aupAccepted: false,
    isLoading: false,
    error: null,
    // Story 9.2: Lease template state
    leaseTemplateLoading: false,
    leaseTemplateLoaded: false,
    leaseTemplateData: null,
    leaseTemplateError: null,
    // Story 9.3: AUP loaded state (not just fallback)
    aupLoaded: false,
  };
  private onAccept: AupAcceptCallback | null = null;

  // CRITICAL-2 FIX: Store bound event handlers for proper cleanup
  private boundHandlers: {
    checkboxChange?: (e: Event) => void;
    continueClick?: () => Promise<void>;
    cancelClick?: () => void;
  } = {};

  // AbortController for cancelling in-flight requests when modal closes
  private abortController: AbortController | null = null;

  /**
   * Story 9.3: Computed property for all-or-nothing button gating.
   * Returns true only when both AUP and lease template loaded successfully.
   * Note: leaseTemplateData !== null ensures we got actual data, not just completed loading.
   */
  get isFullyLoaded(): boolean {
    return this.state.aupLoaded && this.state.leaseTemplateLoaded && this.state.leaseTemplateData !== null;
  }

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

    // Create new AbortController for this modal session
    // Allows cancellation of in-flight requests when modal closes
    this.abortController = new AbortController();

    this.state.tryId = tryId;
    this.state.isOpen = true;
    this.state.aupAccepted = false;
    this.state.error = null;
    // Story 9.2: Reset lease template state
    this.state.leaseTemplateLoading = true;
    this.state.leaseTemplateLoaded = false;
    this.state.leaseTemplateData = null;
    this.state.leaseTemplateError = null;
    // Story 9.3: Reset AUP loaded state
    this.state.aupLoaded = false;
    this.onAccept = onAccept;

    this.render();
    this.setupFocusTrap();
    // Story 9.3: Set initial button state to "Loading..."
    this.updateButtons();

    // Prevent body scroll via CSS class (CSP compliant)
    document.body.classList.add(BODY_MODAL_OPEN_CLASS);

    announce('Request AWS Sandbox Access dialog opened');

    // Story 9.2: Announce loading session terms
    announce('Loading session terms...');

    // Story 6.7 & 9.2: Fetch AUP content and lease template in parallel
    this.loadAupContent();
    this.loadLeaseTemplate(tryId);
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

      // Check if modal was closed while request was in flight
      if (this.abortController?.signal.aborted) {
        console.debug('[AupModal] AUP request completed after modal closed, ignoring');
        return;
      }

      if (result.success && result.data?.aup) {
        aupContent.textContent = result.data.aup;
        // Story 9.3: Mark AUP as successfully loaded (not fallback)
        this.state.aupLoaded = true;
        announce('Acceptable Use Policy loaded');
      } else {
        // Show error but provide fallback AUP
        console.warn('[AupModal] Failed to fetch AUP:', result.error);
        aupContent.textContent = getFallbackAup();
        // Story 9.3: Fallback AUP means not fully loaded
        this.state.aupLoaded = false;

        if (result.error) {
          this.showError(result.error + ' Using default policy.');
        }
      }
    } catch (error) {
      // Check if modal was closed while request was in flight
      if (this.abortController?.signal.aborted) {
        console.debug('[AupModal] AUP request aborted');
        return;
      }

      console.error('[AupModal] Error loading AUP:', error);
      aupContent.textContent = getFallbackAup();
      // Story 9.3: Fallback AUP means not fully loaded
      this.state.aupLoaded = false;
      this.showError('Unable to load policy. Using default policy.');
    }

    // Story 9.3: Update buttons after AUP load completes (race condition handling)
    this.updateButtons();
  }

  /**
   * Load lease template from the API.
   * Story 9.2: Fetch lease template to display actual duration and budget.
   *
   * @param tryId - The product's try_id UUID
   */
  private async loadLeaseTemplate(tryId: string): Promise<void> {
    try {
      const result: LeaseTemplateResult = await fetchLeaseTemplate(tryId);

      // Check if modal was closed while request was in flight
      if (this.abortController?.signal.aborted) {
        console.debug('[AupModal] Lease template request completed after modal closed, ignoring');
        return;
      }

      this.state.leaseTemplateLoading = false;
      this.state.leaseTemplateLoaded = true;

      if (result.success && result.data) {
        this.state.leaseTemplateData = {
          leaseDurationInHours: result.data.leaseDurationInHours,
          maxSpend: result.data.maxSpend,
        };
        this.state.leaseTemplateError = null;

        // Story 9.2: Announce loaded values
        announce(
          `Session terms loaded: ${result.data.leaseDurationInHours} hour session with $${result.data.maxSpend} budget`
        );
      } else {
        this.state.leaseTemplateData = null;
        this.state.leaseTemplateError = result.error || 'Failed to load session terms';

        // Story 9.4: Enhanced error logging with tryId and errorCode
        console.warn('[AupModal] Failed to fetch lease template:', {
          tryId,
          errorCode: result.errorCode || 'UNKNOWN',
          message: result.error,
        });

        // Story 9.4: Display error message in modal based on error type
        if (result.errorCode === 'NOT_FOUND') {
          // AC-2: 404 displays specific message
          this.showError('This sandbox is currently unavailable');
          announce('This sandbox is currently unavailable', 'assertive');
        } else {
          // AC-1: Generic API error message
          this.showError('Unable to load session details');
          announce('Unable to load session details', 'assertive');
        }
      }

      // Update the display
      this.updateSessionTermsDisplay();
      this.updateCheckboxState();
      // Story 9.3: Update buttons after lease template load (race condition handling)
      this.updateButtons();
    } catch (error) {
      // Check if modal was closed while request was in flight
      if (this.abortController?.signal.aborted) {
        console.debug('[AupModal] Lease template request aborted');
        return;
      }

      // Story 9.4: Enhanced error logging with tryId
      console.warn('[AupModal] Failed to fetch lease template:', {
        tryId,
        errorCode: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      this.state.leaseTemplateLoading = false;
      this.state.leaseTemplateLoaded = true;
      this.state.leaseTemplateData = null;
      this.state.leaseTemplateError = 'Unable to load session terms';

      // Story 9.4: AC-1 - Generic API error message for network errors
      this.showError('Unable to load session details');
      announce('Unable to load session details', 'assertive');

      // Update the display
      this.updateSessionTermsDisplay();
      this.updateCheckboxState();
      // Story 9.3: Update buttons after lease template load (race condition handling)
      this.updateButtons();
    }
  }

  /**
   * Update the session terms display with dynamic or error values.
   * Story 9.2: Display actual duration and budget from API.
   *
   * Note: DOM operations are grouped together to minimize reflows.
   * Updates are synchronous for predictable test behavior.
   */
  private updateSessionTermsDisplay(): void {
    const durationEl = document.getElementById(IDS.DURATION);
    const budgetEl = document.getElementById(IDS.BUDGET);
    const termsContainer = document.getElementById(IDS.SESSION_TERMS);

    if (!termsContainer) return;

    // Remove skeleton if present
    const skeleton = termsContainer.querySelector('.aup-modal__skeleton');
    if (skeleton) {
      skeleton.remove();
    }

    if (this.state.leaseTemplateData) {
      // Success: show actual values
      if (durationEl) {
        durationEl.textContent = `${this.state.leaseTemplateData.leaseDurationInHours} hours`;
        durationEl.classList.remove('aup-modal__value--error');
      }
      if (budgetEl) {
        budgetEl.textContent = `$${this.state.leaseTemplateData.maxSpend} USD`;
        budgetEl.classList.remove('aup-modal__value--error');
      }
    } else {
      // Error: show Unknown with error styling
      if (durationEl) {
        durationEl.textContent = 'Unknown';
        durationEl.classList.add('aup-modal__value--error');
      }
      if (budgetEl) {
        budgetEl.textContent = 'Unknown';
        budgetEl.classList.add('aup-modal__value--error');
      }
    }

    // Show the values (they may have been hidden during loading)
    const valueEls = termsContainer.querySelectorAll('.aup-modal__info-text');
    valueEls.forEach(el => {
      (el as HTMLElement).style.display = '';
    });
  }

  /**
   * Update checkbox disabled state based on loading state.
   * Story 9.2: Disable checkbox with tooltip during loading.
   */
  private updateCheckboxState(): void {
    const checkbox = document.getElementById(IDS.CHECKBOX) as HTMLInputElement;
    if (!checkbox) return;

    if (this.state.leaseTemplateLoading) {
      checkbox.disabled = true;
      checkbox.title = 'Loading...';
    } else {
      checkbox.disabled = false;
      checkbox.title = '';
    }
  }

  /**
   * Close the modal.
   */
  close(): void {
    if (!this.state.isOpen) return;

    // Abort any in-flight requests to prevent memory leaks and stale updates
    this.abortController?.abort();
    this.abortController = null;

    this.state.isOpen = false;
    this.state.tryId = null;
    this.state.aupAccepted = false;
    this.state.isLoading = false;
    this.state.error = null;
    // Story 9.2: Reset lease template state
    this.state.leaseTemplateLoading = false;
    this.state.leaseTemplateLoaded = false;
    this.state.leaseTemplateData = null;
    this.state.leaseTemplateError = null;
    // Story 9.3: Reset AUP loaded state
    this.state.aupLoaded = false;
    this.onAccept = null;

    // Deactivate focus trap
    this.focusTrap?.deactivate();
    this.focusTrap = null;

    // CRITICAL-2 FIX: Remove event listeners before DOM removal
    this.detachEventListeners();

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
   * SECURITY: Uses textContent (not innerHTML) to prevent XSS attacks.
   * Any HTML in the content will be escaped and rendered as plain text.
   *
   * @param content - AUP text content (HTML will be escaped)
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
   * XSS-safe: Uses textContent for user-provided message instead of innerHTML interpolation.
   *
   * @param message - Loading message to display
   */
  showLoading(message = 'Loading...'): void {
    this.state.isLoading = true;
    const body = this.overlay?.querySelector('.aup-modal__body');
    if (body) {
      // XSS-safe: Create DOM structure without user content interpolation
      body.innerHTML = `
        <div class="aup-modal__loading" aria-live="polite">
          <div class="aup-modal__spinner" aria-hidden="true"></div>
          <span id="aup-loading-message"></span>
        </div>
      `;
      // XSS-safe: Use textContent for dynamic message to prevent script injection
      const messageEl = body.querySelector('#aup-loading-message');
      if (messageEl) {
        messageEl.textContent = message;
      }
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
   * Story 9.3: Includes computed isFullyLoaded property.
   */
  getState(): AupModalState {
    return {
      ...this.state,
      // Story 9.3: Include computed isFullyLoaded property
      isFullyLoaded: this.isFullyLoaded,
    };
  }

  /**
   * Render the modal HTML.
   * Styles are defined in styles.scss to comply with CSP (no inline styles).
   *
   * SECURITY: innerHTML is used here for static template structure only.
   * All dynamic content (AUP text, error messages, session values) is set
   * via textContent which is XSS-safe. Never interpolate user input into
   * the innerHTML template string.
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
            <!-- Story 9.2: Session terms container with loading skeleton -->
            <div id="${IDS.SESSION_TERMS}" class="aup-modal__session-terms">
              <!-- Loading skeleton shown initially -->
              <div class="aup-modal__skeleton" aria-hidden="true">
                <div class="aup-modal__skeleton-line"></div>
                <div class="aup-modal__skeleton-line"></div>
              </div>
              <!-- Actual values (initially hidden during loading) -->
              <p class="govuk-body aup-modal__info-text" style="display: none;">
                <strong>Session duration:</strong> <span id="${IDS.DURATION}">Loading...</span>
              </p>
              <p class="govuk-body aup-modal__info-text" style="display: none;">
                <strong>Budget limit:</strong> <span id="${IDS.BUDGET}">Loading...</span>
              </p>
            </div>
          </div>

          <div id="${IDS.ERROR}" class="aup-modal__error aup-modal__error--hidden govuk-body" role="alert"></div>

          <h3 class="govuk-heading-s">Acceptable Use Policy</h3>
          <div class="aup-modal__aup-container">
            <p id="${IDS.AUP_CONTENT}" class="govuk-body-s aup-modal__aup-content">Loading AUP content...</p>
          </div>

          <div class="aup-modal__checkbox-group govuk-checkboxes">
            <div class="govuk-checkboxes__item">
              <!-- Story 9.2: Checkbox disabled during loading -->
              <input
                type="checkbox"
                id="${IDS.CHECKBOX}"
                class="govuk-checkboxes__input"
                aria-describedby="${IDS.DESCRIPTION}"
                disabled
                title="Loading..."
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
   * CRITICAL-2 FIX: Store handlers for later removal in detachEventListeners().
   */
  private attachEventListeners(): void {
    const checkbox = document.getElementById(IDS.CHECKBOX) as HTMLInputElement;
    const continueBtn = document.getElementById(IDS.CONTINUE_BTN);
    const cancelBtn = document.getElementById(IDS.CANCEL_BTN);

    // Checkbox change - store handler for cleanup
    // Story 9.3: Button enable announcement moved to updateButtons() to handle race conditions
    this.boundHandlers.checkboxChange = () => {
      this.state.aupAccepted = checkbox.checked;
      this.updateButtons();

      // Announce checkbox state change (button state announced by updateButtons if it changes)
      if (checkbox.checked) {
        announce('Acceptable Use Policy accepted');
      } else {
        announce('Acceptable Use Policy not accepted');
      }
    };
    checkbox?.addEventListener('change', this.boundHandlers.checkboxChange);

    // Continue button click - store handler for cleanup
    this.boundHandlers.continueClick = async () => {
      if (!this.state.aupAccepted || this.state.isLoading || !this.state.tryId) return;

      this.state.isLoading = true;
      this.updateButtons();
      announce('Requesting your sandbox...');

      try {
        await this.onAccept?.(this.state.tryId);
        // Success - callback handles navigation
      } catch {
        this.state.isLoading = false;
        this.updateButtons();
        // Error handling is done by the callback
      }
    };
    continueBtn?.addEventListener('click', this.boundHandlers.continueClick);

    // Cancel button click - store handler for cleanup
    this.boundHandlers.cancelClick = () => {
      this.close();
    };
    cancelBtn?.addEventListener('click', this.boundHandlers.cancelClick);
  }

  /**
   * Detach event listeners from modal elements.
   * CRITICAL-2 FIX: Prevents memory leaks when modal is closed.
   */
  private detachEventListeners(): void {
    const checkbox = document.getElementById(IDS.CHECKBOX);
    const continueBtn = document.getElementById(IDS.CONTINUE_BTN);
    const cancelBtn = document.getElementById(IDS.CANCEL_BTN);

    if (this.boundHandlers.checkboxChange && checkbox) {
      checkbox.removeEventListener('change', this.boundHandlers.checkboxChange);
    }
    if (this.boundHandlers.continueClick && continueBtn) {
      continueBtn.removeEventListener('click', this.boundHandlers.continueClick);
    }
    if (this.boundHandlers.cancelClick && cancelBtn) {
      cancelBtn.removeEventListener('click', this.boundHandlers.cancelClick);
    }

    // Clear handler references
    this.boundHandlers = {};
  }

  /**
   * Update button disabled states.
   * Story 9.3: Gates button on isFullyLoaded, shows "Loading..." during load,
   * and announces when button becomes enabled.
   */
  private updateButtons(): void {
    const continueBtn = document.getElementById(IDS.CONTINUE_BTN) as HTMLButtonElement;
    const cancelBtn = document.getElementById(IDS.CANCEL_BTN) as HTMLButtonElement;

    if (continueBtn) {
      const wasDisabled = continueBtn.disabled;

      // Story 9.3: All-or-nothing logic - must be fully loaded, accepted, and not submitting
      const shouldDisable = !this.isFullyLoaded || !this.state.aupAccepted || this.state.isLoading;
      continueBtn.disabled = shouldDisable;
      continueBtn.setAttribute('aria-disabled', String(shouldDisable));

      // Story 9.3: Button text reflects current state
      if (this.state.isLoading) {
        continueBtn.textContent = 'Requesting...';
      } else if (!this.isFullyLoaded) {
        continueBtn.textContent = 'Loading...';
      } else {
        continueBtn.textContent = 'Continue';
      }

      // Story 9.3: Announce when button becomes enabled (AC-8)
      if (wasDisabled && !shouldDisable) {
        announce('Continue button is now enabled');
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
 */
export function closeAupModal(): void {
  aupModal.close();
}
