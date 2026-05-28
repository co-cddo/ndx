/**
 * Signup Feature - Main Module Tests
 *
 * Story 1.5: Tests for signup form validation and UI functions
 *
 * @module signup/main.test
 */

import {
  validateForm,
  showErrorSummary,
  showInlineError,
  clearErrors,
  setLoadingState,
  parseDomainFromEmail,
  findRecognisedDomain,
  updateIndicator,
  _resetForTests,
} from "./main"
import type { DomainInfo } from "./types"

/**
 * Test helper: render a static HTML fixture into the document body for
 * the test that follows. The argument is a developer-authored literal,
 * not user-controlled content — XSS is not in scope for test fixtures.
 */
function setFixture(html: string): void {
  // eslint-disable-next-line no-restricted-properties
  document.body.innerHTML = html
}

describe("signup/main", () => {
  beforeEach(() => {
    _resetForTests([])
  })

  describe("validateForm", () => {
    let form: HTMLFormElement

    beforeEach(() => {
      setFixture(`
        <form id="signup-form">
          <input type="text" name="firstName" id="first-name" value="">
          <input type="text" name="lastName" id="last-name" value="">
          <input type="email" name="email" id="email" value="">
        </form>
      `)
      form = document.getElementById("signup-form") as HTMLFormElement
    })

    it("should return errors for empty form", () => {
      const errors = validateForm(form)

      expect(errors).toHaveLength(3)
      expect(errors).toContainEqual({ fieldId: "first-name", message: "Enter your first name" })
      expect(errors).toContainEqual({ fieldId: "last-name", message: "Enter your last name" })
      expect(errors).toContainEqual({ fieldId: "email", message: "Enter your email address" })
    })

    it("should return no errors for valid form", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "jane.smith@example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(0)
    })

    it("should return error for first name exceeding max length", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "A".repeat(101)
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "jane@example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        fieldId: "first-name",
        message: "First name must be 100 characters or less",
      })
    })

    it("should return error for last name exceeding max length", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "B".repeat(101)
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "jane@example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        fieldId: "last-name",
        message: "Last name must be 100 characters or less",
      })
    })

    it("should return error for first name with forbidden characters", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane<script>"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "jane@example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        fieldId: "first-name",
        message: "First name must not contain special characters",
      })
    })

    it("should return error for first name containing parens (Notify injection defence)", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Robert))((evil"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "jane@example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        fieldId: "first-name",
        message: "First name must not contain special characters",
      })
    })

    it("should return error for last name with forbidden characters", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith&Co"
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "jane@example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        fieldId: "last-name",
        message: "Last name must not contain special characters",
      })
    })

    it("should trim whitespace from input values", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "  Jane  "
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "  Smith  "
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "  jane.smith@example.gov.uk  "

      const errors = validateForm(form)

      expect(errors).toHaveLength(0)
    })

    it("should return error for malformed email (no @)", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "not-an-email"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({ fieldId: "email", message: "Enter a valid email address" })
    })

    it("should return error for email with multiple @", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "jane@@example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({ fieldId: "email", message: "Enter a valid email address" })
    })

    it("should return error for email exceeding max length", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      // 60 chars local-part + 195 char domain = 259 chars total (> 254 cap)
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "a".repeat(60) + "@" + "b".repeat(195) + ".co"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({ fieldId: "email", message: "Email address must be 254 characters or less" })
    })

    it("should return error for email with + alias", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "jane+alias@example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({ fieldId: "email", message: "Email address cannot contain a '+' character" })
    })

    it("should return multiple errors when multiple fields are invalid", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = ""
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = ""
      ;(form.elements.namedItem("email") as HTMLInputElement).value = "jane@example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(2)
    })
  })

  describe("parseDomainFromEmail", () => {
    it("returns lowercase domain for valid email", () => {
      expect(parseDomainFromEmail("name@Council.GOV.UK")).toBe("council.gov.uk")
    })

    it("returns null when no @", () => {
      expect(parseDomainFromEmail("just-text")).toBeNull()
    })

    it("returns null when @ is the first char", () => {
      expect(parseDomainFromEmail("@example.gov.uk")).toBeNull()
    })

    it("returns null when multiple @ present", () => {
      expect(parseDomainFromEmail("a@b@c.com")).toBeNull()
    })

    it("returns null when domain has no dot", () => {
      expect(parseDomainFromEmail("a@localhost")).toBeNull()
    })

    it("returns null for empty input", () => {
      expect(parseDomainFromEmail("")).toBeNull()
    })

    it("trims whitespace before parsing", () => {
      expect(parseDomainFromEmail("  a@example.gov.uk  ")).toBe("example.gov.uk")
    })
  })

  describe("findRecognisedDomain", () => {
    it("returns DomainInfo on case-insensitive match", () => {
      _resetForTests([{ domain: "Westbury.gov.uk", orgName: "Westbury Council" }])
      expect(findRecognisedDomain("westbury.gov.uk")).toEqual({
        domain: "Westbury.gov.uk",
        orgName: "Westbury Council",
      })
    })

    it("returns undefined when not present", () => {
      _resetForTests([{ domain: "westbury.gov.uk", orgName: "Westbury Council" }])
      expect(findRecognisedDomain("other.gov.uk")).toBeUndefined()
    })

    it("does NOT match subdomain (exact match only)", () => {
      _resetForTests([{ domain: "council.gov.uk", orgName: "Council" }])
      expect(findRecognisedDomain("dept.council.gov.uk")).toBeUndefined()
    })
  })

  describe("updateIndicator", () => {
    beforeEach(() => {
      setFixture(`<div id="email-status" role="status" aria-live="polite"></div>`)
    })

    it("renders recognised copy with org name when domain is in allowlist", () => {
      _resetForTests([{ domain: "westbury.gov.uk", orgName: "Westbury Council" }])

      updateIndicator("name@westbury.gov.uk")

      const status = document.getElementById("email-status")
      expect(status?.textContent).toContain("Westbury Council")
      expect(status?.textContent).toContain("registered")
      expect(status?.querySelector("strong")?.textContent).toBe("Westbury Council")
      // Tick is decorative (aria-hidden) — copy carries the meaning
      const tick = status?.querySelector('[aria-hidden="true"]')
      expect(tick?.textContent).toContain("✓")
    })

    it("renders waitlist copy when domain is not in allowlist", () => {
      _resetForTests([{ domain: "council.gov.uk", orgName: "Council" }])

      updateIndicator("name@unknown.example")

      const status = document.getElementById("email-status")
      expect(status?.textContent).toContain("unknown.example")
      expect(status?.textContent).toContain("waitlist")
    })

    it("leaves the region empty until a parseable domain is typed", () => {
      _resetForTests([{ domain: "council.gov.uk", orgName: "Council" }])

      updateIndicator("name@")

      const status = document.getElementById("email-status")
      expect(status?.textContent).toBe("")
    })

    it("does not re-render when the parsed domain segment hasn't changed", () => {
      _resetForTests([{ domain: "council.gov.uk", orgName: "Council" }])

      updateIndicator("name@unknown.example")
      const status = document.getElementById("email-status")
      const firstP = status?.querySelector("p")

      // Same domain, different local part — should NOT re-render
      updateIndicator("different@unknown.example")
      const secondP = status?.querySelector("p")

      expect(secondP).toBe(firstP)
    })

    it("re-renders when the parsed domain segment changes", () => {
      _resetForTests([{ domain: "council.gov.uk", orgName: "Council" }])

      updateIndicator("name@unknown.example")
      const status = document.getElementById("email-status")
      const firstText = status?.textContent

      updateIndicator("name@council.gov.uk")
      const secondText = status?.textContent

      expect(secondText).not.toBe(firstText)
      expect(secondText).toContain("Council")
    })

    it("clears the region when the email becomes unparseable again", () => {
      _resetForTests([{ domain: "council.gov.uk", orgName: "Council" }])

      updateIndicator("name@council.gov.uk")
      updateIndicator("")

      const status = document.getElementById("email-status")
      expect(status?.textContent).toBe("")
    })
  })

  describe("showErrorSummary", () => {
    beforeEach(() => {
      setFixture(`
        <div id="error-summary" hidden tabindex="-1">
          <ul id="error-summary-list"></ul>
        </div>
        <input id="first-name" type="text">
      `)
    })

    it("should show error summary with errors", () => {
      const errors = [{ fieldId: "first-name", message: "Enter your first name" }]

      showErrorSummary(errors)

      const summary = document.getElementById("error-summary")
      expect(summary?.hidden).toBe(false)
    })

    it("should add error links to list", () => {
      const errors = [{ fieldId: "first-name", message: "Enter your first name" }]

      showErrorSummary(errors)

      const list = document.getElementById("error-summary-list")
      const link = list?.querySelector("a")
      expect(link?.href).toContain("#first-name")
      expect(link?.textContent).toBe("Enter your first name")
    })

    it("should add text without link for general errors", () => {
      const errors = [{ fieldId: "", message: "Something went wrong" }]

      showErrorSummary(errors)

      const list = document.getElementById("error-summary-list")
      const li = list?.querySelector("li")
      expect(li?.textContent).toBe("Something went wrong")
      expect(li?.querySelector("a")).toBeNull()
    })

    it("should focus error summary", () => {
      const errors = [{ fieldId: "first-name", message: "Enter your first name" }]
      const summary = document.getElementById("error-summary")
      const focusSpy = jest.spyOn(summary!, "focus")

      showErrorSummary(errors)

      expect(focusSpy).toHaveBeenCalled()
    })

    it("should clear previous errors before adding new ones", () => {
      showErrorSummary([{ fieldId: "first-name", message: "Error 1" }])
      showErrorSummary([{ fieldId: "first-name", message: "Error 2" }])

      const list = document.getElementById("error-summary-list")
      expect(list?.children).toHaveLength(1)
      expect(list?.textContent).toBe("Error 2")
    })

    it("should do nothing if summary element not found", () => {
      setFixture("")

      expect(() => {
        showErrorSummary([{ fieldId: "test", message: "Test" }])
      }).not.toThrow()
    })
  })

  describe("showInlineError", () => {
    beforeEach(() => {
      setFixture(`
        <div id="first-name-group" class="govuk-form-group">
          <input id="first-name" type="text" class="govuk-input">
          <p id="first-name-error" class="govuk-error-message" hidden>
            <span class="error-text"></span>
          </p>
        </div>
      `)
    })

    it("should show error message", () => {
      showInlineError("first-name", "Enter your first name")

      const errorElement = document.getElementById("first-name-error")
      expect(errorElement?.hidden).toBe(false)
    })

    it("should set error text", () => {
      showInlineError("first-name", "Enter your first name")

      const errorText = document.querySelector(".error-text")
      expect(errorText?.textContent).toBe("Enter your first name")
    })

    it("should add error class to input", () => {
      showInlineError("first-name", "Enter your first name")

      const input = document.getElementById("first-name")
      expect(input?.classList.contains("govuk-input--error")).toBe(true)
    })

    it("should set aria-invalid on input", () => {
      showInlineError("first-name", "Enter your first name")

      const input = document.getElementById("first-name")
      expect(input?.getAttribute("aria-invalid")).toBe("true")
    })

    it("should set aria-describedby on input", () => {
      showInlineError("first-name", "Enter your first name")

      const input = document.getElementById("first-name")
      expect(input?.getAttribute("aria-describedby")).toBe("first-name-error")
    })

    it("should add error class to form group", () => {
      showInlineError("first-name", "Enter your first name")

      const group = document.getElementById("first-name-group")
      expect(group?.classList.contains("govuk-form-group--error")).toBe(true)
    })

    it("should do nothing if field not found", () => {
      expect(() => {
        showInlineError("nonexistent", "Error message")
      }).not.toThrow()
    })
  })

  describe("clearErrors", () => {
    beforeEach(() => {
      setFixture(`
        <div id="error-summary">
          <ul id="error-summary-list"><li>Error</li></ul>
        </div>
        <div class="govuk-form-group govuk-form-group--error">
          <input id="first-name" type="text" class="govuk-input govuk-input--error" aria-invalid="true" aria-describedby="first-name-error">
          <p class="govuk-error-message">Error message</p>
        </div>
      `)
    })

    it("should hide error summary", () => {
      clearErrors()

      const summary = document.getElementById("error-summary")
      expect(summary?.hidden).toBe(true)
    })

    it("should hide inline error messages", () => {
      clearErrors()

      const errorMessages = document.querySelectorAll(".govuk-error-message")
      errorMessages.forEach((el) => {
        expect((el as HTMLElement).hidden).toBe(true)
      })
    })

    it("should remove error class from inputs", () => {
      clearErrors()

      const input = document.getElementById("first-name")
      expect(input?.classList.contains("govuk-input--error")).toBe(false)
    })

    it("should remove aria-invalid from inputs", () => {
      clearErrors()

      const input = document.getElementById("first-name")
      expect(input?.getAttribute("aria-invalid")).toBeNull()
    })

    it("should remove aria-describedby from inputs", () => {
      clearErrors()

      const input = document.getElementById("first-name")
      expect(input?.getAttribute("aria-describedby")).toBeNull()
    })

    it("should remove error class from form groups", () => {
      clearErrors()

      const groups = document.querySelectorAll(".govuk-form-group")
      groups.forEach((el) => {
        expect(el.classList.contains("govuk-form-group--error")).toBe(false)
      })
    })
  })

  describe("setLoadingState", () => {
    let button: HTMLButtonElement

    beforeEach(() => {
      setFixture(`<button type="submit">Continue</button>`)
      button = document.querySelector("button") as HTMLButtonElement
    })

    it("should disable button when loading", () => {
      setLoadingState(button, true)

      expect(button.disabled).toBe(true)
    })

    it("should enable button when not loading", () => {
      button.disabled = true
      setLoadingState(button, false)

      expect(button.disabled).toBe(false)
    })

    it("should set aria-disabled when loading", () => {
      setLoadingState(button, true)

      expect(button.getAttribute("aria-disabled")).toBe("true")
    })

    it("should remove aria-disabled when not loading", () => {
      setLoadingState(button, false)

      expect(button.getAttribute("aria-disabled")).toBe("false")
    })

    it("should change button text when loading", () => {
      setLoadingState(button, true)

      expect(button.textContent).toBe("Creating account...")
    })

    it("should restore button text when not loading", () => {
      setLoadingState(button, false)

      expect(button.textContent).toBe("Continue")
    })
  })

  describe("DomainInfo shape", () => {
    it("conforms to the shared type", () => {
      const sample: DomainInfo = { domain: "x.gov.uk", orgName: "X" }
      expect(sample.domain).toBe("x.gov.uk")
    })
  })
})
