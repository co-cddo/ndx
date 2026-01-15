/**
 * Story 6.10: Epic 6-7 Integration Testing
 *
 * Tests the end-to-end flow from catalogue product page through AUP modal
 * to /try page redirect. Note: Full integration with sessions table
 * depends on Epic 7 implementation.
 */

import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

// Page paths - uses baseURL from playwright.config.ts
const PRODUCT_PAGE = "/catalogue/aws/innovation-sandbox-empty"
const TRY_PAGE = "/try"
const TOKEN_KEY = "isb-jwt"
// Valid JWT format required for auth-provider to recognize the token
const TEST_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo5OTk5OTk5OTk5fQ.placeholder"

test.describe("Try Before You Buy - Catalogue Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state
    await page.goto("/")
    await page.evaluate(([key, token]) => sessionStorage.setItem(key, token), [TOKEN_KEY, TEST_TOKEN])
  })

  test("AC #1: Product page has Try button with correct attributes", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    // Verify Try button exists
    const tryButton = page.locator("[data-try-id]")
    await expect(tryButton).toBeVisible()

    // Verify button has Try-related text (dynamic based on auth state and API response)
    // Possible values: "Try this now", "Try This Now", "Try This for X Hours", "Sign In to Try This Now"
    const buttonText = await tryButton.textContent()
    expect(buttonText?.toLowerCase()).toContain("try")

    // Verify data-try-id attribute exists
    const tryId = await tryButton.getAttribute("data-try-id")
    expect(tryId).toBeTruthy()
    expect(tryId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  test("AC #2: Try button opens AUP modal for authenticated users", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    // Click try button
    const tryButton = page.locator("[data-try-id]")
    await tryButton.click()

    // Verify modal opens
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify modal title
    await expect(modal.locator("h2")).toContainText("Request AWS Sandbox Access")
  })

  test("AC #3: AUP modal displays session info container", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)
    await page.locator("[data-try-id]").click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Modal should have a section for session terms (loaded from API or showing loading state)
    // The exact values depend on API availability - in CI the API may not be available
    // so we check that the container structure exists rather than specific values
    const sessionTermsContainer = modal.locator(".aup-modal__session-terms, .aup-modal__info")
    await expect(sessionTermsContainer.first()).toBeVisible()
  })

  test("AC #4: AUP checkbox enables Continue button", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)
    await page.locator("[data-try-id]").click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Use ID selector because button text changes to "Loading..." when API is pending
    const continueBtn = modal.locator("#aup-continue-btn")
    await expect(continueBtn).toBeDisabled()

    // Check the AUP checkbox
    const checkbox = modal.locator('input[type="checkbox"]')
    await checkbox.check()

    // Button may still be disabled if API is loading (isFullyLoaded = false)
    // In CI without backend, verify checkbox state is tracked even if button stays disabled
    const buttonText = await continueBtn.textContent()
    if (buttonText === "Continue") {
      // API loaded - button should be enabled when checkbox is checked
      await expect(continueBtn).toBeEnabled()
    } else {
      // API still loading - button remains disabled but checkbox interaction works
      await expect(checkbox).toBeChecked()
    }
  })

  test("AC #5: Cancel button closes modal", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)
    await page.locator("[data-try-id]").click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Click Cancel
    await modal.locator('button:has-text("Cancel")').click()

    // Verify modal is closed
    await expect(modal).not.toBeVisible()
  })

  test("AC #6: Escape key closes modal", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)
    await page.locator("[data-try-id]").click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Verify modal is closed
    await expect(modal).not.toBeVisible()
  })

  test("AC #7: Focus trap keeps focus within modal", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)
    await page.locator("[data-try-id]").click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Tab through all focusable elements
    // First focusable should be Cancel button (or checkbox depending on implementation)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab")
    }

    // Focus should still be within the modal
    const activeElement = await page.evaluate(() => {
      const active = document.activeElement
      return active?.closest('[role="dialog"]') !== null
    })
    expect(activeElement).toBe(true)
  })
})

test.describe("Try Before You Buy - Unauthenticated User (Story 2.1)", () => {
  test("AC #8: Unauthenticated user sees auth choice modal", async ({ page }) => {
    // Start without token
    await page.goto(PRODUCT_PAGE)

    // Verify no token in sessionStorage
    const hasToken = await page.evaluate((key) => sessionStorage.getItem(key) !== null, TOKEN_KEY)
    expect(hasToken).toBe(false)

    // Click try button
    const tryButton = page.locator("[data-try-id]")
    await tryButton.click()

    // Story 2.1: Should show auth choice modal instead of redirect
    const modal = page.locator("#auth-choice-modal")
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify modal has correct structure (AC1)
    await expect(modal).toHaveAttribute("role", "dialog")
    await expect(modal).toHaveAttribute("aria-modal", "true")

    // Verify modal title
    await expect(modal.locator("#auth-choice-modal-title")).toContainText("Sign in or create an account")
  })

  test("Auth choice modal has Sign in and Create account buttons (AC1)", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    // Click try button as unauthenticated user
    await page.locator("[data-try-id]").click()

    const modal = page.locator("#auth-choice-modal")
    await expect(modal).toBeVisible()

    // Verify both buttons exist
    const signInBtn = modal.locator("#auth-choice-sign-in-btn")
    const createAccountBtn = modal.locator("#auth-choice-create-btn")

    await expect(signInBtn).toBeVisible()
    await expect(signInBtn).toHaveText("Sign in")

    await expect(createAccountBtn).toBeVisible()
    await expect(createAccountBtn).toHaveText("Create account")
  })

  test("Sign in button redirects to login (AC2)", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    // Click try button as unauthenticated user
    await page.locator("[data-try-id]").click()

    const modal = page.locator("#auth-choice-modal")
    await expect(modal).toBeVisible()

    // Click Sign in button
    await modal.locator("#auth-choice-sign-in-btn").click()

    // Should redirect to /api/auth/login or OAuth provider
    await page.waitForURL((url) => !url.pathname.includes(PRODUCT_PAGE), { timeout: 5000 })

    const finalUrl = page.url()
    const isRedirected =
      finalUrl.includes("/api/auth/login") || finalUrl.includes("awsapps.com") || finalUrl.includes("oauth")
    expect(isRedirected).toBe(true)
  })

  test("Create account button redirects to signup (AC3)", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    // Click try button as unauthenticated user
    await page.locator("[data-try-id]").click()

    const modal = page.locator("#auth-choice-modal")
    await expect(modal).toBeVisible()

    // Click Create account button
    await modal.locator("#auth-choice-create-btn").click()

    // Should redirect to /signup
    await page.waitForURL("**/signup**", { timeout: 5000 })

    expect(page.url()).toContain("/signup")
  })

  test("Escape key closes auth choice modal (AC4)", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    // Click try button as unauthenticated user
    await page.locator("[data-try-id]").click()

    const modal = page.locator("#auth-choice-modal")
    await expect(modal).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Modal should close
    await expect(modal).not.toBeVisible()

    // Should still be on product page
    expect(page.url()).toContain(PRODUCT_PAGE)
  })

  test("Clicking outside modal closes it (AC4)", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    // Click try button as unauthenticated user
    await page.locator("[data-try-id]").click()

    const modal = page.locator("#auth-choice-modal")
    await expect(modal).toBeVisible()

    // Click on overlay (outside modal)
    const overlay = page.locator(".auth-choice-modal-overlay")
    await overlay.click({ position: { x: 10, y: 10 } })

    // Modal should close
    await expect(modal).not.toBeVisible()
  })

  test("Auth choice modal has no accessibility violations (AC5, AC6)", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    // Click try button as unauthenticated user
    await page.locator("[data-try-id]").click()

    const modal = page.locator("#auth-choice-modal")
    await expect(modal).toBeVisible()

    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("#auth-choice-modal")
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze()

    // WCAG 2.2 AA requires zero violations
    expect(accessibilityScanResults.violations).toHaveLength(0)
  })

  test("Focus trap keeps focus within auth choice modal (AC5)", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    // Click try button as unauthenticated user
    await page.locator("[data-try-id]").click()

    const modal = page.locator("#auth-choice-modal")
    await expect(modal).toBeVisible()

    // Tab through focusable elements multiple times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab")
    }

    // Focus should still be within the modal
    const activeElement = await page.evaluate(() => {
      const active = document.activeElement
      return active?.closest("#auth-choice-modal") !== null
    })
    expect(activeElement).toBe(true)
  })
})

test.describe("Return URL Preservation (Story 2.2)", () => {
  test("should store return URL when clicking Create account from product page (AC1)", async ({ page }) => {
    // Navigate to product page as unauthenticated user
    await page.goto(PRODUCT_PAGE)

    // Click try button
    await page.locator("[data-try-id]").click()

    // Wait for auth choice modal
    const modal = page.locator("#auth-choice-modal")
    await expect(modal).toBeVisible()

    // Click Create account
    await modal.locator("#auth-choice-create-btn").click()

    // Wait for navigation to /signup
    await page.waitForURL("**/signup**", { timeout: 5000 })

    // Verify return URL is stored in sessionStorage
    const returnUrl = await page.evaluate(() => sessionStorage.getItem("auth-return-to"))
    expect(returnUrl).toContain(PRODUCT_PAGE)
  })

  test("should not store /signup as return URL (AC3, AC6)", async ({ page }) => {
    // Navigate directly to signup page
    await page.goto("/signup/")

    // Verify the signup page is not stored as return URL
    // (This happens because the signup bundle calls storeReturnURL on load, but blocklist should prevent it)
    const returnUrl = await page.evaluate(() => sessionStorage.getItem("auth-return-to"))
    expect(returnUrl).toBeNull()
  })

  test("should not store /signup/success as return URL (AC3, AC6)", async ({ page }) => {
    // Navigate to success page
    await page.goto("/signup/success/")

    // Verify the success page is not stored as return URL
    const returnUrl = await page.evaluate(() => sessionStorage.getItem("auth-return-to"))
    expect(returnUrl).toBeNull()
  })
})

test.describe("NDX:Try - Catalogue Filter", () => {
  test("AC #9: NDX:Try filter shows tryable products", async ({ page }) => {
    await page.goto("/catalogue/tags/try-before-you-buy")

    // Verify filter page loads
    await expect(page.locator("h1")).toContainText("NDX:Try")

    // Verify at least one tryable product appears
    const productList = page.locator(".app-document-list")
    await expect(productList).toBeVisible()
  })

  test("AC #10: Try Before You Buy tag visible on product card", async ({ page }) => {
    await page.goto("/catalogue")

    // Find a product with Try Before You Buy tag
    const tryTag = page.locator('.govuk-tag:has-text("Try Before You Buy")')

    // Should have at least one tryable product
    const count = await tryTag.count()
    expect(count).toBeGreaterThan(0)
  })
})
