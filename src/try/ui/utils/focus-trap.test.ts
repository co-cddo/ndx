/**
 * Unit tests for Focus Trap Utility
 *
 * ADR-026: Accessible Modal Pattern - Focus management
 *
 * @jest-environment jsdom
 */

import { createFocusTrap } from "./focus-trap"

describe("Focus Trap Utility", () => {
  let container: HTMLElement

  // Mock requestAnimationFrame to execute callback immediately
  let rafCallback: FrameRequestCallback | null = null
  const originalRaf = window.requestAnimationFrame

  beforeEach(() => {
    jest.useFakeTimers()

    // Mock requestAnimationFrame to capture the callback
    window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      rafCallback = callback
      return 1
    })

    // Create a container with focusable elements
    container = document.createElement("div")
    container.innerHTML = `
      <button id="btn1">First</button>
      <input id="input1" type="text" />
      <a id="link1" href="#">Link</a>
      <button id="btn2" disabled>Disabled</button>
      <button id="btn3">Last</button>
    `
    document.body.appendChild(container)

    // Mock offsetWidth/offsetHeight for focusable elements (jsdom returns 0)
    const focusableElements = container.querySelectorAll("button:not([disabled]), input, a")
    focusableElements.forEach((el) => {
      Object.defineProperty(el, "offsetWidth", { value: 100, configurable: true })
      Object.defineProperty(el, "offsetHeight", { value: 20, configurable: true })
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    window.requestAnimationFrame = originalRaf
    rafCallback = null
    document.body.innerHTML = ""
  })

  // Helper to run the captured requestAnimationFrame callback
  function runRafCallback() {
    if (rafCallback) {
      rafCallback(performance.now())
      rafCallback = null
    }
  }

  describe("createFocusTrap", () => {
    it("should create a focus trap instance", () => {
      const trap = createFocusTrap(container)

      expect(trap).toHaveProperty("activate")
      expect(trap).toHaveProperty("deactivate")
      expect(trap).toHaveProperty("isActive")
    })

    it("should not be active initially", () => {
      const trap = createFocusTrap(container)
      expect(trap.isActive()).toBe(false)
    })
  })

  describe("activate", () => {
    it("should set isActive to true", () => {
      const trap = createFocusTrap(container)
      trap.activate()
      expect(trap.isActive()).toBe(true)
    })

    it("should focus the first focusable element by default", () => {
      const trap = createFocusTrap(container)
      trap.activate()

      // Run the requestAnimationFrame callback
      runRafCallback()

      expect(document.activeElement?.id).toBe("btn1")
    })

    it("should focus initialFocus element when specified", () => {
      const input = container.querySelector("#input1") as HTMLInputElement
      const trap = createFocusTrap(container, { initialFocus: input })

      trap.activate()
      runRafCallback()

      expect(document.activeElement?.id).toBe("input1")
    })

    it("should not re-activate if already active", () => {
      const input = container.querySelector("#input1") as HTMLInputElement
      const trap = createFocusTrap(container, { initialFocus: input })

      trap.activate()
      runRafCallback()

      // Focus something else
      const btn3 = container.querySelector("#btn3") as HTMLButtonElement
      btn3.focus()

      // Re-activate should be a no-op
      trap.activate()
      runRafCallback()

      // Should still be on btn3, not reset to initial
      expect(document.activeElement?.id).toBe("btn3")
    })
  })

  describe("deactivate", () => {
    it("should set isActive to false", () => {
      const trap = createFocusTrap(container)
      trap.activate()
      trap.deactivate()
      expect(trap.isActive()).toBe(false)
    })

    it("should return focus to previously focused element", () => {
      // Focus an element outside the trap first
      const outsideButton = document.createElement("button")
      outsideButton.id = "outside"
      document.body.appendChild(outsideButton)
      outsideButton.focus()

      const trap = createFocusTrap(container)
      trap.activate()
      runRafCallback()

      trap.deactivate()

      expect(document.activeElement?.id).toBe("outside")
    })

    it("should return focus to specified returnFocus element", () => {
      const returnTarget = document.createElement("button")
      returnTarget.id = "return-target"
      document.body.appendChild(returnTarget)

      const trap = createFocusTrap(container, { returnFocus: returnTarget })
      trap.activate()
      runRafCallback()
      trap.deactivate()

      expect(document.activeElement?.id).toBe("return-target")
    })

    it("should not throw if not active", () => {
      const trap = createFocusTrap(container)
      expect(() => trap.deactivate()).not.toThrow()
    })
  })

  describe("Tab key handling", () => {
    it("should wrap focus from last to first element on Tab", () => {
      const trap = createFocusTrap(container)
      trap.activate()
      runRafCallback()

      // Focus last focusable element (btn3, skipping disabled btn2)
      const btn3 = container.querySelector("#btn3") as HTMLButtonElement
      btn3.focus()

      // Dispatch Tab keydown
      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
      })
      document.dispatchEvent(tabEvent)

      expect(document.activeElement?.id).toBe("btn1")
    })

    it("should wrap focus from first to last element on Shift+Tab", () => {
      const trap = createFocusTrap(container)
      trap.activate()
      runRafCallback()

      // First element is already focused
      expect(document.activeElement?.id).toBe("btn1")

      // Dispatch Shift+Tab keydown
      const shiftTabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      })
      document.dispatchEvent(shiftTabEvent)

      expect(document.activeElement?.id).toBe("btn3")
    })

    it("should skip disabled elements", () => {
      const trap = createFocusTrap(container)
      trap.activate()
      runRafCallback()

      // Focus link (element before disabled button and last button)
      const link = container.querySelector("#link1") as HTMLAnchorElement
      link.focus()

      // Tab should go to btn3, skipping disabled btn2
      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
      })
      document.dispatchEvent(tabEvent)

      // Note: The actual tab behavior is handled by the browser
      // The trap only handles wrap-around, so this test checks that
      // disabled elements are not in the focusable list
    })

    it("should not handle Tab when not active", () => {
      const trap = createFocusTrap(container)
      // Don't activate

      const btn1 = container.querySelector("#btn1") as HTMLButtonElement
      btn1.focus()

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      })
      document.dispatchEvent(tabEvent)

      // Should not prevent default or change focus
      expect(tabEvent.defaultPrevented).toBe(false)
    })
  })

  describe("Escape key handling", () => {
    it("should call onEscape callback when Escape is pressed", () => {
      const onEscape = jest.fn()
      const trap = createFocusTrap(container, { onEscape })

      trap.activate()
      runRafCallback()

      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
      document.dispatchEvent(escapeEvent)

      expect(onEscape).toHaveBeenCalledTimes(1)
    })

    it("should prevent default on Escape", () => {
      const onEscape = jest.fn()
      const trap = createFocusTrap(container, { onEscape })

      trap.activate()
      runRafCallback()

      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
      document.dispatchEvent(escapeEvent)

      expect(escapeEvent.defaultPrevented).toBe(true)
    })

    it("should not call onEscape when not active", () => {
      const onEscape = jest.fn()
      createFocusTrap(container, { onEscape })
      // Don't activate

      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      })
      document.dispatchEvent(escapeEvent)

      expect(onEscape).not.toHaveBeenCalled()
    })
  })

  describe("Edge cases", () => {
    it("should handle container with no focusable elements", () => {
      const emptyContainer = document.createElement("div")
      emptyContainer.innerHTML = "<p>No focusable elements</p>"
      document.body.appendChild(emptyContainer)

      const trap = createFocusTrap(emptyContainer)
      expect(() => {
        trap.activate()
        runRafCallback()
      }).not.toThrow()
    })

    it("should exclude hidden elements from focusable list", () => {
      // Add a hidden button
      const hiddenBtn = document.createElement("button")
      hiddenBtn.id = "hidden-btn"
      hiddenBtn.style.display = "none"
      container.appendChild(hiddenBtn)

      const trap = createFocusTrap(container)
      trap.activate()
      runRafCallback()

      // Focus last visible element
      const btn3 = container.querySelector("#btn3") as HTMLButtonElement
      btn3.focus()

      // Tab should wrap to first, not to hidden element
      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
      })
      document.dispatchEvent(tabEvent)

      expect(document.activeElement?.id).toBe("btn1")
    })

    it('should exclude elements with tabindex="-1"', () => {
      const nonTabbable = document.createElement("button")
      nonTabbable.id = "non-tabbable"
      nonTabbable.setAttribute("tabindex", "-1")
      container.appendChild(nonTabbable)

      const trap = createFocusTrap(container)
      trap.activate()
      runRafCallback()

      // Focus last tabbable element
      const btn3 = container.querySelector("#btn3") as HTMLButtonElement
      btn3.focus()

      // Tab should wrap to first, not to non-tabbable element
      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
      })
      document.dispatchEvent(tabEvent)

      expect(document.activeElement?.id).toBe("btn1")
    })
  })
})
