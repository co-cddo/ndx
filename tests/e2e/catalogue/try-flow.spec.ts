/**
 * Story 6.10: Epic 6-7 Integration Testing
 *
 * Tests the end-to-end flow from catalogue product page through AUP modal
 * to /try page redirect. Note: Full integration with sessions table
 * depends on Epic 7 implementation.
 */

import { test, expect } from "@playwright/test"

const BASE_URL = "https://ndx.digital.cabinet-office.gov.uk"
const PRODUCT_PAGE = "/catalogue/aws/innovation-sandbox-empty"
const TRY_PAGE = "/try"
const TOKEN_KEY = "isb-jwt"
const TEST_TOKEN = "test-jwt-token-for-e2e-testing"

test.describe("Try Before You Buy - Catalogue Integration", () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state
    await page.goto(BASE_URL)
    await page.evaluate(([key, token]) => sessionStorage.setItem(key, token), [TOKEN_KEY, TEST_TOKEN])
  })

  test("AC #1: Product page has Try button with correct attributes", async ({ page }) => {
    await page.goto(`${BASE_URL}${PRODUCT_PAGE}`)

    // Verify Try button exists
    const tryButton = page.locator("[data-try-id]")
    await expect(tryButton).toBeVisible()

    // Verify button text
    await expect(tryButton).toContainText("Try this now for 24 hours")

    // Verify data-try-id attribute exists
    const tryId = await tryButton.getAttribute("data-try-id")
    expect(tryId).toBeTruthy()
    expect(tryId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  test("AC #2: Try button opens AUP modal for authenticated users", async ({ page }) => {
    await page.goto(`${BASE_URL}${PRODUCT_PAGE}`)

    // Click try button
    const tryButton = page.locator("[data-try-id]")
    await tryButton.click()

    // Verify modal opens
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify modal title
    await expect(modal.locator("h2")).toContainText("Request AWS Sandbox Access")
  })

  test("AC #3: AUP modal displays session info", async ({ page }) => {
    await page.goto(`${BASE_URL}${PRODUCT_PAGE}`)
    await page.locator("[data-try-id]").click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Verify session duration
    await expect(modal).toContainText("24 hours")

    // Verify budget limit
    await expect(modal).toContainText("$50")
  })

  test("AC #4: AUP checkbox enables Continue button", async ({ page }) => {
    await page.goto(`${BASE_URL}${PRODUCT_PAGE}`)
    await page.locator("[data-try-id]").click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Verify Continue button is initially disabled
    const continueBtn = modal.locator('button:has-text("Continue")')
    await expect(continueBtn).toBeDisabled()

    // Check the AUP checkbox
    const checkbox = modal.locator('input[type="checkbox"]')
    await checkbox.check()

    // Verify Continue button is now enabled
    await expect(continueBtn).toBeEnabled()
  })

  test("AC #5: Cancel button closes modal", async ({ page }) => {
    await page.goto(`${BASE_URL}${PRODUCT_PAGE}`)
    await page.locator("[data-try-id]").click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Click Cancel
    await modal.locator('button:has-text("Cancel")').click()

    // Verify modal is closed
    await expect(modal).not.toBeVisible()
  })

  test("AC #6: Escape key closes modal", async ({ page }) => {
    await page.goto(`${BASE_URL}${PRODUCT_PAGE}`)
    await page.locator("[data-try-id]").click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Verify modal is closed
    await expect(modal).not.toBeVisible()
  })

  test("AC #7: Focus trap keeps focus within modal", async ({ page }) => {
    await page.goto(`${BASE_URL}${PRODUCT_PAGE}`)
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

test.describe("Try Before You Buy - Unauthenticated User", () => {
  test("AC #8: Unauthenticated user redirected to login", async ({ page }) => {
    // Start without token
    await page.goto(`${BASE_URL}${PRODUCT_PAGE}`)

    // Verify no token in sessionStorage
    const hasToken = await page.evaluate((key) => sessionStorage.getItem(key) !== null, TOKEN_KEY)
    expect(hasToken).toBe(false)

    // Click try button
    const tryButton = page.locator("[data-try-id]")
    await tryButton.click()

    // Should redirect through /api/auth/login to OAuth provider (AWS SSO)
    // Wait for navigation away from product page
    await page.waitForURL((url) => !url.pathname.includes(PRODUCT_PAGE), { timeout: 5000 })

    // Verify we were redirected (either to /api/auth/login or directly to OAuth provider)
    // OAuth redirect is fast, so we might land at AWS SSO (awsapps.com)
    const finalUrl = page.url()
    const isRedirected =
      finalUrl.includes("/api/auth/login") || finalUrl.includes("awsapps.com") || finalUrl.includes("oauth")
    expect(isRedirected).toBe(true)
  })
})

test.describe("NDX:Try - Catalogue Filter", () => {
  test("AC #9: NDX:Try filter shows tryable products", async ({ page }) => {
    await page.goto(`${BASE_URL}/catalogue/tags/try-before-you-buy`)

    // Verify filter page loads
    await expect(page.locator("h1")).toContainText("NDX:Try")

    // Verify at least one tryable product appears
    const productList = page.locator(".app-document-list")
    await expect(productList).toBeVisible()
  })

  test("AC #10: Try Before You Buy tag visible on product card", async ({ page }) => {
    await page.goto(`${BASE_URL}/catalogue`)

    // Find a product with Try Before You Buy tag
    const tryTag = page.locator('.govuk-tag:has-text("Try Before You Buy")')

    // Should have at least one tryable product
    const count = await tryTag.count()
    expect(count).toBeGreaterThan(0)
  })
})
