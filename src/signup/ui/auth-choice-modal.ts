/**
 * Auth Choice Modal Component
 *
 * WCAG 2.2 AA compliant modal for presenting authentication options
 * when an unauthenticated user attempts to access a feature requiring login.
 *
 * Story 2.1: Auth Choice Modal
 * - Two equally-weighted buttons: "Sign in" and "Create account"
 * - GOV.UK styling consistent with existing NDX modals
 * - Focus trap per ADR-026
 * - Accessible modal with ARIA attributes
 *
 * @module auth-choice-modal
 * @see {@link src/try/ui/components/aup-modal.ts|AUP Modal Pattern Reference}
 */

import { createFocusTrap, type FocusTrap } from "../../try/ui/utils/focus-trap"
import { announce } from "../../try/ui/utils/aria-live"
import { storeReturnURL } from "../../try/auth/oauth-flow"

/**
 * Auth choice options for external consumers.
 */
export interface AuthChoiceOptions {
  /** Callback when user clicks "Sign in" */
  onSignIn?: () => void
  /** Callback when user clicks "Create account" */
  onCreateAccount?: () => void
}

/**
 * Modal state for external consumers.
 */
export interface AuthChoiceModalState {
  isOpen: boolean
}

/**
 * Modal element IDs for accessibility linking.
 */
const IDS = {
  MODAL: "auth-choice-modal",
  TITLE: "auth-choice-modal-title",
  SIGN_IN_BTN: "auth-choice-sign-in-btn",
  CREATE_ACCOUNT_BTN: "auth-choice-create-btn",
  CANCEL_BTN: "auth-choice-cancel-btn",
} as const

/**
 * CSS class for body scroll lock when modal is open.
 * Styles are defined in styles.scss to comply with CSP.
 */
const BODY_MODAL_OPEN_CLASS = "auth-choice-modal-open"

/**
 * Auth Choice Modal class for managing the modal lifecycle.
 */
class AuthChoiceModal {
  private overlay: HTMLElement | null = null
  private focusTrap: FocusTrap | null = null
  private state: AuthChoiceModalState = {
    isOpen: false,
  }
  private triggerElement: HTMLElement | null = null
  private options: AuthChoiceOptions = {}

  // Store bound event handlers for proper cleanup
  private boundHandlers: {
    signInClick?: () => void
    createAccountClick?: () => void
    cancelClick?: () => void
    overlayClick?: (e: MouseEvent) => void
  } = {}

  /**
   * Open the modal.
   *
   * @param options - Callbacks for button actions
   */
  open(options: AuthChoiceOptions = {}): void {
    if (this.state.isOpen) {
      console.warn("[AuthChoiceModal] Modal already open")
      return
    }

    this.options = options
    this.state.isOpen = true
    this.triggerElement = document.activeElement as HTMLElement

    this.render()
    this.setupFocusTrap()

    // Prevent body scroll via CSS class (CSP compliant)
    document.body.classList.add(BODY_MODAL_OPEN_CLASS)

    announce("Sign in or create an account dialog opened")
  }

  /**
   * Close the modal.
   */
  close(): void {
    if (!this.state.isOpen) return

    this.state.isOpen = false
    this.options = {}

    // Deactivate focus trap
    this.focusTrap?.deactivate()
    this.focusTrap = null

    // Remove event listeners before DOM removal
    this.detachEventListeners()

    // Remove modal from DOM
    this.overlay?.remove()
    this.overlay = null

    // Restore body scroll via CSS class (CSP compliant)
    document.body.classList.remove(BODY_MODAL_OPEN_CLASS)

    // Return focus to trigger element
    if (this.triggerElement) {
      this.triggerElement.focus()
      this.triggerElement = null
    }

    announce("Dialog closed")
  }

  /**
   * Get current modal state.
   */
  getState(): AuthChoiceModalState {
    return { ...this.state }
  }

  /**
   * Render the modal HTML.
   * Styles are defined in styles.scss to comply with CSP (no inline styles).
   *
   * SECURITY: innerHTML is used here for static template structure only.
   * All IDs are constants, never user input.
   */
  private render(): void {
    this.overlay = document.createElement("div")
    this.overlay.className = "auth-choice-modal-overlay"
    this.overlay.setAttribute("aria-hidden", "false")

    this.overlay.innerHTML = `
      <div
        id="${IDS.MODAL}"
        class="auth-choice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="${IDS.TITLE}"
      >
        <div class="auth-choice-modal__header">
          <h2 id="${IDS.TITLE}" class="govuk-heading-l auth-choice-modal__title">
            Sign in or create an account
          </h2>
        </div>
        <div class="auth-choice-modal__body">
          <p class="govuk-body">You need to sign in or create an account to try this product.</p>
        </div>
        <div class="auth-choice-modal__footer">
          <button id="${IDS.SIGN_IN_BTN}" type="button" class="govuk-button">
            Sign in
          </button>
          <button id="${IDS.CREATE_ACCOUNT_BTN}" type="button" class="govuk-button">
            Create account
          </button>
        </div>
      </div>
    `

    document.body.appendChild(this.overlay)
    this.attachEventListeners()
  }

  /**
   * Attach event listeners to modal elements.
   * Store handlers for later removal in detachEventListeners().
   */
  private attachEventListeners(): void {
    const signInBtn = document.getElementById(IDS.SIGN_IN_BTN)
    const createAccountBtn = document.getElementById(IDS.CREATE_ACCOUNT_BTN)

    // Sign in button click - store handler for cleanup
    this.boundHandlers.signInClick = () => {
      storeReturnURL()
      if (this.options.onSignIn) {
        this.options.onSignIn()
      } else {
        // Default: redirect to login
        window.location.href = "/api/auth/login"
      }
    }
    signInBtn?.addEventListener("click", this.boundHandlers.signInClick)

    // Create account button click - store handler for cleanup
    this.boundHandlers.createAccountClick = () => {
      storeReturnURL()
      if (this.options.onCreateAccount) {
        this.options.onCreateAccount()
      } else {
        // Default: redirect to signup
        window.location.href = "/signup"
      }
    }
    createAccountBtn?.addEventListener("click", this.boundHandlers.createAccountClick)

    // Overlay click (dismiss on click outside modal)
    this.boundHandlers.overlayClick = (e: MouseEvent) => {
      // Only close if click is directly on overlay, not on modal content
      if (e.target === this.overlay) {
        this.close()
      }
    }
    this.overlay?.addEventListener("click", this.boundHandlers.overlayClick)
  }

  /**
   * Detach event listeners from modal elements.
   * Prevents memory leaks when modal is closed.
   */
  private detachEventListeners(): void {
    const signInBtn = document.getElementById(IDS.SIGN_IN_BTN)
    const createAccountBtn = document.getElementById(IDS.CREATE_ACCOUNT_BTN)

    if (this.boundHandlers.signInClick && signInBtn) {
      signInBtn.removeEventListener("click", this.boundHandlers.signInClick)
    }
    if (this.boundHandlers.createAccountClick && createAccountBtn) {
      createAccountBtn.removeEventListener("click", this.boundHandlers.createAccountClick)
    }
    if (this.boundHandlers.overlayClick && this.overlay) {
      this.overlay.removeEventListener("click", this.boundHandlers.overlayClick)
    }

    // Clear handler references
    this.boundHandlers = {}
  }

  /**
   * Setup focus trap for the modal.
   */
  private setupFocusTrap(): void {
    const modal = document.getElementById(IDS.MODAL)
    if (!modal) return

    this.focusTrap = createFocusTrap(modal, {
      onEscape: () => this.close(),
      initialFocus: document.getElementById(IDS.SIGN_IN_BTN),
    })
    this.focusTrap.activate()
  }
}

/**
 * Singleton modal instance.
 */
export const authChoiceModal = new AuthChoiceModal()

/**
 * Open the auth choice modal.
 *
 * @param options - Callbacks for button actions
 *
 * @example
 * openAuthChoiceModal({
 *   onSignIn: () => {
 *     window.location.href = '/api/auth/login';
 *   },
 *   onCreateAccount: () => {
 *     window.location.href = '/signup';
 *   }
 * });
 */
export function openAuthChoiceModal(options: AuthChoiceOptions = {}): void {
  authChoiceModal.open(options)
}

/**
 * Close the auth choice modal.
 */
export function closeAuthChoiceModal(): void {
  authChoiceModal.close()
}
