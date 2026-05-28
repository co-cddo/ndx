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
import {
  isApiError,
  SignupErrorCode,
  ERROR_MESSAGES,
  VALIDATION_CONSTRAINTS,
  FORBIDDEN_NAME_CHARS,
  EMAIL_PLUS_ALIAS,
} from "./types"
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
 * Indicator state for the live domain recognition message.
 */
type IndicatorState =
  | { kind: "empty" }
  | { kind: "recognised"; domain: string; orgName: string }
  | { kind: "waitlist"; domain: string }

/** Debounce window for re-running domain parse + indicator update (ms). */
const INDICATOR_DEBOUNCE_MS = 300

/** Cached domain list — populated on init, used by the live indicator. */
let cachedDomains: DomainInfo[] = []

/** Last rendered indicator state — used to avoid re-announcing identical content. */
let lastIndicatorState: IndicatorState = { kind: "empty" }

/** Debounce timer handle for the indicator. */
let indicatorTimer: ReturnType<typeof setTimeout> | null = null

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

  // Move focus to the confirmation panel <h1> on success/waitlist pages
  focusConfirmationHeadingIfPresent()

  // Signal that the signup bundle has loaded
  document.documentElement.setAttribute("data-signup-bundle-ready", "true")
}

/**
 * Initialize the signup form: load domain cache, wire submit + live indicator.
 */
async function initSignupForm(): Promise<void> {
  const form = document.getElementById("signup-form") as HTMLFormElement | null
  if (!form) {
    return // Not on signup page
  }

  // Load domain cache for the live indicator. If fetch fails, the indicator
  // defaults to "waitlist" copy for any typed domain — the server is
  // authoritative and will still route the submission correctly.
  try {
    cachedDomains = await fetchDomains()
  } catch {
    cachedDomains = []
  }

  // Wire live indicator (debounced) on the email field
  const emailField = document.getElementById("email") as HTMLInputElement | null
  if (emailField) {
    emailField.addEventListener("input", () => {
      if (indicatorTimer !== null) {
        clearTimeout(indicatorTimer)
      }
      indicatorTimer = setTimeout(() => {
        updateIndicator(emailField.value)
      }, INDICATOR_DEBOUNCE_MS)
    })
  }

  // Set up form submission handler
  form.addEventListener("submit", handleFormSubmit)
}

/**
 * Move focus to the confirmation panel's <h1> on `/signup/success` and
 * `/signup/waitlist`, following the established GDS pattern.
 */
function focusConfirmationHeadingIfPresent(): void {
  const heading = document.querySelector(".govuk-panel--confirmation .govuk-panel__title") as HTMLElement | null
  if (heading) {
    heading.focus()
  }
}

/**
 * Parse an email's domain segment, returning `null` if the input is not
 * yet a parseable email (no `@`, no dot after `@`, etc.).
 *
 * @param email - Raw email input from the user
 * @returns The lowercase domain segment if parseable, otherwise `null`
 */
export function parseDomainFromEmail(email: string): string | null {
  const trimmed = email.trim()
  const atIndex = trimmed.indexOf("@")
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf("@")) {
    return null
  }
  const domain = trimmed.substring(atIndex + 1).toLowerCase()
  // Reject domains with no dot, leading/trailing dot, or only-dot — the
  // server's `isWellFormedEmail` would reject them too, so the indicator
  // must not say "recognised/waitlist" for inputs the server will 400.
  if (domain.length === 0 || !domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return null
  }
  return domain
}

/**
 * Look up a parsed domain in the cached allowlist (case-insensitive,
 * exact match — no sub-domain matching).
 *
 * @param domain - Lowercase domain segment
 * @returns The matching `DomainInfo` if recognised, otherwise `undefined`
 */
export function findRecognisedDomain(domain: string): DomainInfo | undefined {
  return cachedDomains.find((d) => d.domain.toLowerCase() === domain)
}

/**
 * Update the live recognition indicator. Only re-renders and re-announces
 * when the parsed domain segment has changed since the last render.
 *
 * @param emailValue - Raw email input value
 */
export function updateIndicator(emailValue: string): void {
  const statusEl = document.getElementById("email-status")
  if (!statusEl) {
    return
  }

  const parsedDomain = parseDomainFromEmail(emailValue)

  let nextState: IndicatorState
  if (parsedDomain === null) {
    nextState = { kind: "empty" }
  } else {
    const match = findRecognisedDomain(parsedDomain)
    nextState = match
      ? { kind: "recognised", domain: parsedDomain, orgName: match.orgName }
      : { kind: "waitlist", domain: parsedDomain }
  }

  if (isSameIndicatorState(lastIndicatorState, nextState)) {
    return
  }

  renderIndicator(statusEl, nextState)
  lastIndicatorState = nextState
}

/**
 * Render the indicator content for a given state. Uses textContent / DOM
 * methods only (never innerHTML with user data) — but builds a small DOM
 * fragment so the `<strong>` org-name styling survives.
 */
function renderIndicator(statusEl: HTMLElement, state: IndicatorState): void {
  // Clear existing content via removeChild (no innerHTML)
  while (statusEl.firstChild) {
    statusEl.removeChild(statusEl.firstChild)
  }

  if (state.kind === "empty") {
    return
  }

  const p = document.createElement("p")
  p.className = "govuk-hint"

  if (state.kind === "recognised") {
    const tick = document.createElement("span")
    tick.setAttribute("aria-hidden", "true")
    tick.textContent = "✓ "
    p.appendChild(tick)

    const strong = document.createElement("strong")
    strong.textContent = state.orgName
    p.appendChild(strong)

    const tail = document.createTextNode(" is registered. You'll get instant access after signing in.")
    p.appendChild(tail)
  } else {
    p.textContent = `${state.domain} isn't on our list yet. You can still sign up — we'll add you to the waitlist and email when access opens.`
  }

  statusEl.appendChild(p)
}

/**
 * Compare two indicator states for equality (used to suppress redundant
 * `aria-live` announcements when the parsed domain hasn't changed).
 */
function isSameIndicatorState(a: IndicatorState, b: IndicatorState): boolean {
  if (a.kind !== b.kind) {
    return false
  }
  if (a.kind === "empty" || b.kind === "empty") {
    return a.kind === b.kind
  }
  return a.domain === b.domain
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
  const email = (form.elements.namedItem("email") as HTMLInputElement | null)?.value.trim() ?? ""

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

  // Email validation (single field)
  if (!email) {
    errors.push({ fieldId: "email", message: "Enter your email address" })
  } else if (email.length > VALIDATION_CONSTRAINTS.EMAIL_MAX_LENGTH) {
    errors.push({ fieldId: "email", message: "Email address must be 254 characters or less" })
  } else if (EMAIL_PLUS_ALIAS.test(email)) {
    errors.push({ fieldId: "email", message: "Email address cannot contain a '+' character" })
  } else if (!isWellFormedEmail(email)) {
    errors.push({ fieldId: "email", message: "Enter a valid email address" })
  }

  return errors
}

/**
 * Lightweight client-side email shape check. Authoritative validation
 * happens on the server — this only catches obvious typos before submit.
 */
function isWellFormedEmail(email: string): boolean {
  if ((email.match(/@/g) || []).length !== 1) {
    return false
  }
  const [local, domain] = email.split("@")
  if (!local || !domain) {
    return false
  }
  if (local.length > 64) {
    return false
  }
  // Require at least one dot in the domain segment
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return false
  }
  // Restrict to printable ASCII — server will also enforce
  return /^[\x20-\x7E]+$/.test(email)
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

  // 4. Build request (single email field — server derives domain)
  const request: SignupRequest = {
    firstName: (form.elements.namedItem("firstName") as HTMLInputElement).value.trim(),
    lastName: (form.elements.namedItem("lastName") as HTMLInputElement).value.trim(),
    email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
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
      // Success — route based on waitlist flag. Server's `redirectUrl` (if
      // present) wins, otherwise we branch on `waitlist`.
      if (response.redirectUrl) {
        window.location.href = response.redirectUrl
      } else if (response.waitlist === true) {
        window.location.href = "/signup/waitlist"
      } else {
        window.location.href = "/signup/success"
      }
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

  // Clear existing errors via removeChild (no innerHTML)
  while (list.firstChild) {
    list.removeChild(list.firstChild)
  }

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

/**
 * Test-only helpers — reset module-level state between tests.
 * @internal
 */
export function _resetForTests(domains: DomainInfo[] = []): void {
  cachedDomains = domains
  lastIndicatorState = { kind: "empty" }
  if (indicatorTimer !== null) {
    clearTimeout(indicatorTimer)
    indicatorTimer = null
  }
}

// Handle module scripts that may load after DOMContentLoaded has fired
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init())
} else {
  // DOM is already ready (interactive or complete)
  void init()
}
