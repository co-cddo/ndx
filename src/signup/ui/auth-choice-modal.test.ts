/**
 * Auth Choice Modal Component Tests
 *
 * Story 2.1: Tests for AuthChoiceModal
 *
 * Uses jsdomReconfigure to properly mock window.location in jsdom v27+ (Jest 30).
 *
 * @module auth-choice-modal.test
 */

import { authChoiceModal, openAuthChoiceModal, closeAuthChoiceModal } from "./auth-choice-modal"

// Mock the imported modules
jest.mock("../../try/ui/utils/focus-trap", () => ({
  createFocusTrap: jest.fn(() => ({
    activate: jest.fn(),
    deactivate: jest.fn(),
    isActive: jest.fn(() => true),
  })),
}))

jest.mock("../../try/ui/utils/aria-live", () => ({
  announce: jest.fn(),
}))

jest.mock("../../try/auth/oauth-flow", () => ({
  storeReturnURL: jest.fn(),
}))

import { createFocusTrap } from "../../try/ui/utils/focus-trap"
import { announce } from "../../try/ui/utils/aria-live"
import { storeReturnURL } from "../../try/auth/oauth-flow"

// Declare the global functions exposed by our custom jsdom environment (jsdom-env.js)
declare global {
  function jsdomReconfigure(options: { url?: string }): void
  function setupLocationHrefSpy(): {
    getRedirectUrl: () => string
    restore: () => void
  } | null
}

// Helper to set URL in jsdom v27+ (Jest 30) using reconfigure
function setTestURL(url: string): void {
  if (typeof jsdomReconfigure === "function") {
    jsdomReconfigure({ url })
  }
}

describe("AuthChoiceModal", () => {
  // Track redirect URL via location spy
  let locationSpy: ReturnType<typeof setupLocationHrefSpy>

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ""
    document.body.className = ""

    // Close any open modal before each test
    closeAuthChoiceModal()

    // Reset mocks
    jest.clearAllMocks()

    // Set URL using jsdom v27+ compatible method
    setTestURL("https://ndx.gov.uk/catalogue/product/123")

    // Set up location href spy to capture redirects
    locationSpy = setupLocationHrefSpy()
  })

  afterEach(() => {
    locationSpy?.restore()

    // Clean up any open modals
    closeAuthChoiceModal()
  })

  // Helper to get redirect URL from spy
  function getRedirectUrl(): string {
    return locationSpy?.getRedirectUrl() || ""
  }

  describe("open()", () => {
    it("should render modal with correct structure (AC1)", () => {
      openAuthChoiceModal()

      const modal = document.getElementById("auth-choice-modal")
      expect(modal).not.toBeNull()
      expect(modal?.getAttribute("role")).toBe("dialog")
      expect(modal?.getAttribute("aria-modal")).toBe("true")
      expect(modal?.getAttribute("aria-labelledby")).toBe("auth-choice-modal-title")
    })

    it("should render modal title with correct text", () => {
      openAuthChoiceModal()

      const title = document.getElementById("auth-choice-modal-title")
      expect(title).not.toBeNull()
      expect(title?.textContent?.trim()).toBe("Sign in or create an account")
    })

    it("should render Sign in button", () => {
      openAuthChoiceModal()

      const signInBtn = document.getElementById("auth-choice-sign-in-btn")
      expect(signInBtn).not.toBeNull()
      expect(signInBtn?.textContent?.trim()).toBe("Sign in")
      expect(signInBtn?.classList.contains("govuk-button")).toBe(true)
    })

    it("should render Create account button with equal weighting (AC1)", () => {
      openAuthChoiceModal()

      const createBtn = document.getElementById("auth-choice-create-btn")
      expect(createBtn).not.toBeNull()
      expect(createBtn?.textContent?.trim()).toBe("Create account")
      expect(createBtn?.classList.contains("govuk-button")).toBe(true)
      // AC1: Both buttons must be equally-weighted (both primary, not secondary)
      expect(createBtn?.classList.contains("govuk-button--secondary")).toBe(false)
    })

    it("should add body scroll lock class", () => {
      openAuthChoiceModal()

      expect(document.body.classList.contains("auth-choice-modal-open")).toBe(true)
    })

    it("should announce modal opened via ARIA live region", () => {
      openAuthChoiceModal()

      expect(announce).toHaveBeenCalledWith("Sign in or create an account dialog opened")
    })

    it("should activate focus trap (AC5)", () => {
      openAuthChoiceModal()

      expect(createFocusTrap).toHaveBeenCalled()
      const mockFocusTrap = (createFocusTrap as jest.Mock).mock.results[0].value
      expect(mockFocusTrap.activate).toHaveBeenCalled()
    })

    it("should not open if already open", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation()

      openAuthChoiceModal()
      openAuthChoiceModal()

      expect(warnSpy).toHaveBeenCalledWith("[AuthChoiceModal] Modal already open")

      // Verify only one modal exists in DOM (not duplicated)
      const modals = document.querySelectorAll("#auth-choice-modal")
      expect(modals.length).toBe(1)

      warnSpy.mockRestore()
    })
  })

  describe("close()", () => {
    it("should remove modal from DOM", () => {
      openAuthChoiceModal()
      expect(document.getElementById("auth-choice-modal")).not.toBeNull()

      closeAuthChoiceModal()
      expect(document.getElementById("auth-choice-modal")).toBeNull()
    })

    it("should remove body scroll lock class", () => {
      openAuthChoiceModal()
      expect(document.body.classList.contains("auth-choice-modal-open")).toBe(true)

      closeAuthChoiceModal()
      expect(document.body.classList.contains("auth-choice-modal-open")).toBe(false)
    })

    it("should deactivate focus trap (AC5)", () => {
      openAuthChoiceModal()
      const mockFocusTrap = (createFocusTrap as jest.Mock).mock.results[0].value

      closeAuthChoiceModal()

      expect(mockFocusTrap.deactivate).toHaveBeenCalled()
    })

    it("should announce dialog closed via ARIA live region", () => {
      openAuthChoiceModal()
      jest.clearAllMocks()

      closeAuthChoiceModal()

      expect(announce).toHaveBeenCalledWith("Dialog closed")
    })

    it("should do nothing if not open", () => {
      // Modal not open
      closeAuthChoiceModal()

      // No errors thrown, no announcements
      expect(announce).not.toHaveBeenCalled()
    })
  })

  describe("Sign in button (AC2)", () => {
    it("should store return URL before navigating", () => {
      openAuthChoiceModal()

      const signInBtn = document.getElementById("auth-choice-sign-in-btn")
      signInBtn?.click()

      expect(storeReturnURL).toHaveBeenCalled()
    })

    it("should navigate to /api/auth/login by default", () => {
      openAuthChoiceModal()

      const signInBtn = document.getElementById("auth-choice-sign-in-btn")
      signInBtn?.click()

      expect(getRedirectUrl()).toBe("/api/auth/login")
    })

    it("should call custom onSignIn callback if provided", () => {
      const onSignIn = jest.fn()
      openAuthChoiceModal({ onSignIn })

      const signInBtn = document.getElementById("auth-choice-sign-in-btn")
      signInBtn?.click()

      expect(onSignIn).toHaveBeenCalled()
    })
  })

  describe("Create account button (AC3)", () => {
    it("should store return URL before navigating", () => {
      openAuthChoiceModal()

      const createBtn = document.getElementById("auth-choice-create-btn")
      createBtn?.click()

      expect(storeReturnURL).toHaveBeenCalled()
    })

    it("should navigate to /signup by default", () => {
      openAuthChoiceModal()

      const createBtn = document.getElementById("auth-choice-create-btn")
      createBtn?.click()

      expect(getRedirectUrl()).toBe("/signup")
    })

    it("should call custom onCreateAccount callback if provided", () => {
      const onCreateAccount = jest.fn()
      openAuthChoiceModal({ onCreateAccount })

      const createBtn = document.getElementById("auth-choice-create-btn")
      createBtn?.click()

      expect(onCreateAccount).toHaveBeenCalled()
    })
  })

  describe("Escape key closes modal (AC4)", () => {
    it("should close modal when focus trap onEscape is called", () => {
      openAuthChoiceModal()

      // Get the onEscape callback passed to createFocusTrap
      const focusTrapCall = (createFocusTrap as jest.Mock).mock.calls[0]
      const options = focusTrapCall[1]

      // Simulate pressing Escape
      options.onEscape()

      // Modal should be closed
      expect(document.getElementById("auth-choice-modal")).toBeNull()
    })
  })

  describe("Overlay click closes modal (AC4)", () => {
    it("should close modal when clicking on overlay", () => {
      openAuthChoiceModal()

      const overlay = document.querySelector(".auth-choice-modal-overlay") as HTMLElement

      // Create a click event on the overlay itself
      const clickEvent = new MouseEvent("click", { bubbles: true })
      Object.defineProperty(clickEvent, "target", { value: overlay })
      overlay?.dispatchEvent(clickEvent)

      expect(document.getElementById("auth-choice-modal")).toBeNull()
    })

    it("should NOT close modal when clicking inside modal content", () => {
      openAuthChoiceModal()

      const modal = document.getElementById("auth-choice-modal") as HTMLElement
      const overlay = document.querySelector(".auth-choice-modal-overlay") as HTMLElement

      // Create a click event that originates from modal content
      const clickEvent = new MouseEvent("click", { bubbles: true })
      Object.defineProperty(clickEvent, "target", { value: modal })
      overlay?.dispatchEvent(clickEvent)

      // Modal should still be open
      expect(document.getElementById("auth-choice-modal")).not.toBeNull()
    })
  })

  describe("Focus trap configuration (AC5, AC6)", () => {
    it("should set initial focus to Sign in button", () => {
      openAuthChoiceModal()

      const focusTrapCall = (createFocusTrap as jest.Mock).mock.calls[0]
      const options = focusTrapCall[1]

      expect(options.initialFocus).toBe(document.getElementById("auth-choice-sign-in-btn"))
    })

    it("should pass modal element to focus trap", () => {
      openAuthChoiceModal()

      const focusTrapCall = (createFocusTrap as jest.Mock).mock.calls[0]
      const container = focusTrapCall[0]

      expect(container).toBe(document.getElementById("auth-choice-modal"))
    })
  })

  describe("Focus return on close (AC5)", () => {
    it("should return focus to trigger element when closed", () => {
      // Create a trigger button
      const triggerBtn = document.createElement("button")
      triggerBtn.id = "trigger-btn"
      document.body.appendChild(triggerBtn)
      triggerBtn.focus()

      const focusSpy = jest.spyOn(triggerBtn, "focus")

      openAuthChoiceModal()
      closeAuthChoiceModal()

      expect(focusSpy).toHaveBeenCalled()
    })
  })

  describe("getState()", () => {
    it("should return isOpen: false when modal is closed", () => {
      expect(authChoiceModal.getState().isOpen).toBe(false)
    })

    it("should return isOpen: true when modal is open", () => {
      openAuthChoiceModal()

      expect(authChoiceModal.getState().isOpen).toBe(true)
    })
  })

  describe("ARIA attributes (AC6)", () => {
    it("should have role=dialog on modal container", () => {
      openAuthChoiceModal()

      const modal = document.getElementById("auth-choice-modal")
      expect(modal?.getAttribute("role")).toBe("dialog")
    })

    it("should have aria-modal=true", () => {
      openAuthChoiceModal()

      const modal = document.getElementById("auth-choice-modal")
      expect(modal?.getAttribute("aria-modal")).toBe("true")
    })

    it("should have aria-labelledby pointing to title", () => {
      openAuthChoiceModal()

      const modal = document.getElementById("auth-choice-modal")
      const titleId = modal?.getAttribute("aria-labelledby")
      const title = document.getElementById(titleId!)

      expect(title).not.toBeNull()
      expect(title?.textContent?.trim()).toBe("Sign in or create an account")
    })
  })
})
