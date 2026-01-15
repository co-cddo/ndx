/**
 * Signup Feature - Main JavaScript Entry Point
 *
 * This is the main entry point for all Signup feature client-side JavaScript.
 * Initializes form components, validation, and submission handling.
 *
 * Story 1.5: Full signup form implementation
 *
 * @module signup/main
 */

// GOV.UK Frontend initialization (replaces plugin's default application.js)
// @ts-expect-error - govuk-frontend doesn't have TypeScript types
import { initAll as GOVUKFrontend } from "govuk-frontend"

import { fetchDomains, submitSignup } from "./api"
import type { DomainInfo, SignupRequest } from "./types"
import { isApiError, SignupErrorCode, ERROR_MESSAGES, VALIDATION_CONSTRAINTS, FORBIDDEN_NAME_CHARS, EMAIL_PLUS_ALIAS } from "./types"
import { getReturnURL } from "../try/auth/oauth-flow"
import { OAUTH_LOGIN_URL, WELCOME_BACK_KEY } from "../try/constants"

/**
 * Validation error for a form field.
 */
interface ValidationError {
  /** ID of the field with the error */
  fieldId: string
  /** Error message to display */
  message: string
}

/**
 * Initialize all Signup feature components.
 *
 * This function is called when the DOM is ready.
 */
async function init(): Promise<void> {
  // Initialize GOV.UK Frontend components (accordions, tabs, etc.)
  GOVUKFrontend()

  // Story 1.5: Initialize signup form
  await initSignupForm()

  // Signal that the signup bundle has loaded
  document.documentElement.setAttribute("data-signup-bundle-ready", "true")
}

/**
 * Initialize the signup form with domain dropdown and event handlers.
 */
async function initSignupForm(): Promise<void> {
  const form = document.getElementById("signup-form") as HTMLFormElement | null
  if (!form) {
    return // Not on signup page
  }

  // Load domains for dropdown
  try {
    const domains = await fetchDomains()
    populateDomainDropdown(domains)
  } catch {
    // Show error if domains fail to load (don't log error object to console)
    showErrorSummary([{ fieldId: "", message: "Failed to load organisation list. Please refresh the page." }])
  }

  // Set up form submission handler
  form.addEventListener("submit", handleFormSubmit)
}

/**
 * Populate the domain dropdown with fetched domains.
 *
 * @param domains - Array of domain info objects
 */
function populateDomainDropdown(domains: DomainInfo[]): void {
  const select = document.getElementById("email-domain") as HTMLSelectElement | null
  if (!select) {
    return
  }

  // Sort by organisation name for easier finding
  const sortedDomains = [...domains].sort((a, b) => a.orgName.localeCompare(b.orgName))

  // Add options - format: "domain.gov.uk - Organisation Name"
  for (const domain of sortedDomains) {
    const option = document.createElement("option")
    option.value = domain.domain
    option.textContent = `${domain.domain} - ${domain.orgName}`
    select.appendChild(option)
  }
}

/**
 * Validate the signup form fields.
 *
 * Validates on submit (not blur) per GOV.UK pattern.
 *
 * @param form - The form element to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateForm(form: HTMLFormElement): ValidationError[] {
  const errors: ValidationError[] = []

  // Get form values
  const firstName = (form.elements.namedItem("firstName") as HTMLInputElement | null)?.value.trim() ?? ""
  const lastName = (form.elements.namedItem("lastName") as HTMLInputElement | null)?.value.trim() ?? ""
  const emailLocal = (form.elements.namedItem("emailLocal") as HTMLInputElement | null)?.value.trim() ?? ""
  const domain = (form.elements.namedItem("domain") as HTMLSelectElement | null)?.value ?? ""

  // First name validation
  if (!firstName) {
    errors.push({ fieldId: "first-name", message: "Enter your first name" })
  } else if (firstName.length > VALIDATION_CONSTRAINTS.NAME_MAX_LENGTH) {
    errors.push({ fieldId: "first-name", message: "First name must be 100 characters or less" })
  } else if (FORBIDDEN_NAME_CHARS.test(firstName)) {
    errors.push({ fieldId: "first-name", message: "First name must not contain special characters" })
  }

  // Last name validation
  if (!lastName) {
    errors.push({ fieldId: "last-name", message: "Enter your last name" })
  } else if (lastName.length > VALIDATION_CONSTRAINTS.NAME_MAX_LENGTH) {
    errors.push({ fieldId: "last-name", message: "Last name must be 100 characters or less" })
  } else if (FORBIDDEN_NAME_CHARS.test(lastName)) {
    errors.push({ fieldId: "last-name", message: "Last name must not contain special characters" })
  }

  // Email local part validation
  if (!emailLocal) {
    errors.push({ fieldId: "email-local", message: "Enter your email address" })
  } else if (emailLocal.length > 64) {
    // RFC 5321: local-part max 64 chars
    errors.push({ fieldId: "email-local", message: "Email username must be 64 characters or less" })
  } else if (FORBIDDEN_NAME_CHARS.test(emailLocal)) {
    errors.push({ fieldId: "email-local", message: "Email address contains invalid characters" })
  } else if (EMAIL_PLUS_ALIAS.test(emailLocal)) {
    // Reject + aliases - user would need to sign in with non-aliased email
    errors.push({ fieldId: "email-local", message: "Email address cannot contain a '+' character" })
  }

  // Domain validation
  if (!domain) {
    errors.push({ fieldId: "email-domain", message: "Select your organisation" })
  }

  return errors
}

/**
 * Handle form submission.
 *
 * @param event - The submit event
 */
async function handleFormSubmit(event: Event): Promise<void> {
  event.preventDefault()

  const form = event.target as HTMLFormElement
  const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null

  // 1. Clear previous errors
  clearErrors()

  // 2. Validate form
  const errors = validateForm(form)
  if (errors.length > 0) {
    showErrorSummary(errors)
    for (const error of errors) {
      showInlineError(error.fieldId, error.message)
    }
    return
  }

  // 3. Show loading state
  if (submitButton) {
    setLoadingState(submitButton, true)
  }

  // 4. Build request
  const emailLocal = (form.elements.namedItem("emailLocal") as HTMLInputElement).value.trim()
  const domain = (form.elements.namedItem("domain") as HTMLSelectElement).value
  const request: SignupRequest = {
    firstName: (form.elements.namedItem("firstName") as HTMLInputElement).value.trim(),
    lastName: (form.elements.namedItem("lastName") as HTMLInputElement).value.trim(),
    email: `${emailLocal}@${domain}`,
    domain,
  }

  try {
    // 5. Submit to API
    const response = await submitSignup(request)

    // 6. Handle response
    if (isApiError(response)) {
      // Handle specific errors - Story 2.3: Existing User Detection
      if (response.error === SignupErrorCode.USER_EXISTS) {
        // Silent redirect to login with return URL preserved (ADR-040)
        const returnUrl = getReturnURL()
        const loginUrl = new URL(OAUTH_LOGIN_URL, window.location.origin)
        loginUrl.searchParams.set("returnUrl", returnUrl)

        // Set welcome back flag for banner display after login
        try {
          sessionStorage.setItem(WELCOME_BACK_KEY, "true")
        } catch {
          // Ignore sessionStorage errors in private browsing
        }

        window.location.href = loginUrl.toString()
        return
      }
      showErrorSummary([{ fieldId: "", message: response.message }])
    } else {
      // Success - redirect to success page
      window.location.href = response.redirectUrl ?? "/signup/success"
    }
  } catch {
    // Network or unexpected error
    showErrorSummary([{ fieldId: "", message: ERROR_MESSAGES[SignupErrorCode.SERVER_ERROR] }])
  } finally {
    // 7. Reset loading state
    if (submitButton) {
      setLoadingState(submitButton, false)
    }
  }
}

/**
 * Show the error summary at the top of the form.
 *
 * @param errors - Array of validation errors
 */
export function showErrorSummary(errors: ValidationError[]): void {
  const summary = document.getElementById("error-summary")
  const list = document.getElementById("error-summary-list")

  if (!summary || !list) {
    return
  }

  // Clear existing errors
  list.innerHTML = ""

  // Add error links
  for (const error of errors) {
    const li = document.createElement("li")
    if (error.fieldId) {
      const link = document.createElement("a")
      link.href = `#${error.fieldId}`
      link.textContent = error.message
      // Focus the field when link is clicked
      link.addEventListener("click", (e) => {
        e.preventDefault()
        const field = document.getElementById(error.fieldId)
        if (field) {
          field.focus()
        }
      })
      li.appendChild(link)
    } else {
      // General error without specific field
      li.textContent = error.message
    }
    list.appendChild(li)
  }

  // Show summary and focus it
  summary.hidden = false
  summary.focus()
}

/**
 * Show inline error message below a field.
 *
 * @param fieldId - ID of the field
 * @param message - Error message to display
 */
export function showInlineError(fieldId: string, message: string): void {
  const field = document.getElementById(fieldId)
  const errorElement = document.getElementById(`${fieldId}-error`)
  const group = document.getElementById(`${fieldId}-group`) ?? field?.closest(".govuk-form-group")

  if (!field || !errorElement) {
    return
  }

  // Update error message
  const errorText = errorElement.querySelector(".error-text")
  if (errorText) {
    errorText.textContent = message
  }

  // Show error message
  errorElement.hidden = false

  // Add error classes
  field.classList.add("govuk-input--error")
  field.setAttribute("aria-invalid", "true")
  field.setAttribute("aria-describedby", `${fieldId}-error`)

  // Add error class to form group
  if (group) {
    group.classList.add("govuk-form-group--error")
  }
}

/**
 * Clear all error states from the form.
 */
export function clearErrors(): void {
  // Hide error summary
  const summary = document.getElementById("error-summary")
  if (summary) {
    summary.hidden = true
  }

  // Clear inline errors
  const errorMessages = document.querySelectorAll(".govuk-error-message")
  errorMessages.forEach((el) => {
    ;(el as HTMLElement).hidden = true
  })

  // Remove error classes from fields
  const errorFields = document.querySelectorAll(".govuk-input--error")
  errorFields.forEach((el) => {
    el.classList.remove("govuk-input--error")
    el.removeAttribute("aria-invalid")
    el.removeAttribute("aria-describedby")
  })

  // Remove error classes from form groups
  const errorGroups = document.querySelectorAll(".govuk-form-group--error")
  errorGroups.forEach((el) => {
    el.classList.remove("govuk-form-group--error")
  })
}

/**
 * Set the loading state of the submit button.
 *
 * @param button - The submit button
 * @param loading - Whether to show loading state
 */
export function setLoadingState(button: HTMLButtonElement, loading: boolean): void {
  button.disabled = loading
  button.setAttribute("aria-disabled", loading ? "true" : "false")
  button.textContent = loading ? "Creating account..." : "Continue"
}

// Handle module scripts that may load after DOMContentLoaded has fired
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init())
} else {
  // DOM is already ready (interactive or complete)
  void init()
}

// Export for testing
export { populateDomainDropdown }
