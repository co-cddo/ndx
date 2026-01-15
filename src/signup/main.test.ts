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
  populateDomainDropdown,
} from "./main"
import type { DomainInfo } from "./types"
import { isSignupResponse, isApiError, SignupErrorCode } from "./types"

// Note: handleFormSubmit is private - redirect behaviour is tested via api.test.ts
// Response parsing is tested via type guard tests

describe("signup/main", () => {
  describe("validateForm", () => {
    let form: HTMLFormElement

    beforeEach(() => {
      document.body.innerHTML = `
        <form id="signup-form">
          <input type="text" name="firstName" id="first-name" value="">
          <input type="text" name="lastName" id="last-name" value="">
          <input type="text" name="emailLocal" id="email-local" value="">
          <select name="domain" id="email-domain">
            <option value="">Select organisation</option>
            <option value="example.gov.uk">example.gov.uk</option>
          </select>
        </form>
      `
      form = document.getElementById("signup-form") as HTMLFormElement
    })

    it("should return errors for empty form", () => {
      const errors = validateForm(form)

      expect(errors).toHaveLength(4)
      expect(errors).toContainEqual({ fieldId: "first-name", message: "Enter your first name" })
      expect(errors).toContainEqual({ fieldId: "last-name", message: "Enter your last name" })
      expect(errors).toContainEqual({ fieldId: "email-local", message: "Enter your email address" })
      expect(errors).toContainEqual({ fieldId: "email-domain", message: "Select your organisation" })
    })

    it("should return no errors for valid form", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "jane.smith"
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(0)
    })

    it("should return error for first name exceeding max length", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "A".repeat(101)
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "jane"
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

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
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "jane"
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

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
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "jane"
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

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
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "jane"
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

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
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "  jane.smith  "
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(0)
    })

    it("should return multiple errors when multiple fields are invalid", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = ""
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = ""
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "jane"
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(2)
    })

    it("should return error for email local part exceeding max length", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "a".repeat(65)
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        fieldId: "email-local",
        message: "Email username must be 64 characters or less",
      })
    })

    it("should return error for email local part with forbidden characters", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "jane<script>"
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        fieldId: "email-local",
        message: "Email address contains invalid characters",
      })
    })

    it("should return error for email local part with + alias", () => {
      ;(form.elements.namedItem("firstName") as HTMLInputElement).value = "Jane"
      ;(form.elements.namedItem("lastName") as HTMLInputElement).value = "Smith"
      ;(form.elements.namedItem("emailLocal") as HTMLInputElement).value = "jane+alias"
      ;(form.elements.namedItem("domain") as HTMLSelectElement).value = "example.gov.uk"

      const errors = validateForm(form)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        fieldId: "email-local",
        message: "Email address cannot contain a '+' character",
      })
    })
  })

  describe("showErrorSummary", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="error-summary" hidden tabindex="-1">
          <ul id="error-summary-list"></ul>
        </div>
        <input id="first-name" type="text">
      `
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
      document.body.innerHTML = ""

      expect(() => {
        showErrorSummary([{ fieldId: "test", message: "Test" }])
      }).not.toThrow()
    })
  })

  describe("showInlineError", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="first-name-group" class="govuk-form-group">
          <input id="first-name" type="text" class="govuk-input">
          <p id="first-name-error" class="govuk-error-message" hidden>
            <span class="error-text"></span>
          </p>
        </div>
      `
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
      document.body.innerHTML = `
        <div id="error-summary">
          <ul id="error-summary-list"><li>Error</li></ul>
        </div>
        <div class="govuk-form-group govuk-form-group--error">
          <input id="first-name" type="text" class="govuk-input govuk-input--error" aria-invalid="true" aria-describedby="first-name-error">
          <p class="govuk-error-message">Error message</p>
        </div>
      `
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
      document.body.innerHTML = `<button type="submit">Continue</button>`
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

  describe("populateDomainDropdown", () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <select id="email-domain">
          <option value="">Select organisation</option>
        </select>
      `
    })

    it("should add options to select", () => {
      const domains: DomainInfo[] = [
        { domain: "example.gov.uk", orgName: "Example Council" },
        { domain: "test.gov.uk", orgName: "Test Council" },
      ]

      populateDomainDropdown(domains)

      const select = document.getElementById("email-domain") as HTMLSelectElement
      // +1 for the default "Select organisation" option
      expect(select.options).toHaveLength(3)
    })

    it("should sort domains by organisation name", () => {
      const domains: DomainInfo[] = [
        { domain: "zebra.gov.uk", orgName: "Zebra Council" },
        { domain: "alpha.gov.uk", orgName: "Alpha Council" },
      ]

      populateDomainDropdown(domains)

      const select = document.getElementById("email-domain") as HTMLSelectElement
      expect(select.options[1].value).toBe("alpha.gov.uk")
      expect(select.options[2].value).toBe("zebra.gov.uk")
    })

    it("should format option text as domain - orgName", () => {
      const domains: DomainInfo[] = [{ domain: "example.gov.uk", orgName: "Example Council" }]

      populateDomainDropdown(domains)

      const select = document.getElementById("email-domain") as HTMLSelectElement
      expect(select.options[1].textContent).toBe("example.gov.uk - Example Council")
    })

    it("should set option value to domain", () => {
      const domains: DomainInfo[] = [{ domain: "example.gov.uk", orgName: "Example Council" }]

      populateDomainDropdown(domains)

      const select = document.getElementById("email-domain") as HTMLSelectElement
      expect(select.options[1].value).toBe("example.gov.uk")
    })

    it("should handle empty domains array", () => {
      populateDomainDropdown([])

      const select = document.getElementById("email-domain") as HTMLSelectElement
      expect(select.options).toHaveLength(1) // Only default option
    })

    it("should do nothing if select element not found", () => {
      document.body.innerHTML = ""

      expect(() => {
        populateDomainDropdown([{ domain: "test.gov.uk", orgName: "Test" }])
      }).not.toThrow()
    })
  })
})
