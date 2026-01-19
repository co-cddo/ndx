/**
 * Signup Feature E2E Tests
 *
 * Story 1.1: Placeholder E2E test file
 * Story 1.5: Signup form validation and submission tests
 * Story 1.6: Success page and unlisted domain handling tests
 *
 * @module tests/e2e/signup
 */

import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test.describe("Signup Feature", () => {
  test.describe("Story 1.5: Signup Form", () => {
    test("should display signup form with all required fields", async ({ page }) => {
      await page.goto("/signup/")

      // Verify form elements exist
      await expect(page.locator("#signup-form")).toBeVisible()
      await expect(page.locator("#first-name")).toBeVisible()
      await expect(page.locator("#last-name")).toBeVisible()
      await expect(page.locator("#email-local")).toBeVisible()
      await expect(page.locator("#email-domain")).toBeVisible()
      await expect(page.locator("#submit-button")).toBeVisible()
    })

    test("should display unlisted domain help text (Story 1.6 AC3)", async ({ page }) => {
      await page.goto("/signup/")

      // Verify unlisted domain help message is visible
      await expect(page.locator("#domain-help")).toBeVisible()
      await expect(page.locator("#domain-help")).toContainText("Domain not listed?")
      await expect(page.locator("#domain-help")).toContainText("ndx@dsit.gov.uk")
    })

    test("signup form should have no accessibility violations", async ({ page }) => {
      await page.goto("/signup/")

      // Wait for JavaScript to initialize (signup feature uses data-signup-bundle-ready)
      await page.waitForSelector('[data-signup-bundle-ready="true"]', { timeout: 10000 })

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()

      // WCAG 2.2 AA requires zero violations
      expect(accessibilityScanResults.violations).toHaveLength(0)
    })
  })

  test.describe("Story 2.3: Existing User Detection", () => {
    test("should display welcome back banner when sessionStorage flag is set", async ({ page }) => {
      // Set the welcome back flag before navigating
      await page.goto("/")
      await page.evaluate(() => {
        sessionStorage.setItem("signup-welcome-back", "true")
      })

      // Navigate to a page that loads the try bundle (which displays the banner)
      await page.goto("/")
      await page.waitForSelector('[data-try-bundle-ready="true"]', { timeout: 10000 })

      // Verify welcome back banner is displayed
      const banner = page.locator("[data-welcome-back-banner]")
      await expect(banner).toBeVisible()
      await expect(banner).toContainText("Welcome back")
      await expect(banner).toContainText("signed in")
    })

    test("should clear welcome back flag after displaying banner", async ({ page }) => {
      // Set the welcome back flag
      await page.goto("/")
      await page.evaluate(() => {
        sessionStorage.setItem("signup-welcome-back", "true")
      })

      // Navigate and wait for banner display
      await page.goto("/")
      await page.waitForSelector('[data-try-bundle-ready="true"]', { timeout: 10000 })

      // Verify flag is cleared
      const flagValue = await page.evaluate(() => sessionStorage.getItem("signup-welcome-back"))
      expect(flagValue).toBeNull()
    })

    test("should not display welcome back banner when flag is not set", async ({ page }) => {
      await page.goto("/")
      await page.waitForSelector('[data-try-bundle-ready="true"]', { timeout: 10000 })

      // Verify no welcome banner
      const banner = page.locator("[data-welcome-back-banner]")
      await expect(banner).not.toBeVisible()
    })

    test("welcome back banner should have proper GOV.UK styling", async ({ page }) => {
      await page.goto("/")
      await page.evaluate(() => {
        sessionStorage.setItem("signup-welcome-back", "true")
      })

      await page.goto("/")
      await page.waitForSelector('[data-try-bundle-ready="true"]', { timeout: 10000 })

      const banner = page.locator("[data-welcome-back-banner]")
      await expect(banner).toHaveClass(/govuk-notification-banner/)
      await expect(banner).toHaveClass(/govuk-notification-banner--success/)
      await expect(banner).toHaveAttribute("role", "alert")
    })
  })

  test.describe("Story 4.1 & 4.2: Policy Pages Accessibility", () => {
    test("privacy page should have no accessibility violations", async ({ page }) => {
      await page.goto("/privacy/")

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()

      expect(accessibilityScanResults.violations).toHaveLength(0)
    })

    test("cookies page should have no accessibility violations", async ({ page }) => {
      await page.goto("/cookies/")

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()

      expect(accessibilityScanResults.violations).toHaveLength(0)
    })

    test("privacy page should be navigable via keyboard", async ({ page }) => {
      await page.goto("/privacy/")

      // Tab to first focusable element and verify it's a link
      await page.keyboard.press("Tab")
      const focusedElement = page.locator(":focus")
      await expect(focusedElement).toBeVisible()

      // Verify focused element is a link
      const tagName = await focusedElement.evaluate((el) => el.tagName.toLowerCase())
      expect(tagName).toBe("a")
    })

    test("cookies page should be navigable via keyboard", async ({ page }) => {
      await page.goto("/cookies/")

      // Tab to first focusable element
      await page.keyboard.press("Tab")
      const focusedElement = page.locator(":focus")
      await expect(focusedElement).toBeVisible()

      // Verify focused element is a link
      const tagName = await focusedElement.evaluate((el) => el.tagName.toLowerCase())
      expect(tagName).toBe("a")
    })
  })

  test.describe("Story 4.3: Footer Links Accessibility", () => {
    test("footer privacy link is accessible from homepage", async ({ page }) => {
      await page.goto("/")

      // Find privacy link in footer
      const privacyLink = page.locator('footer a[href="/privacy/"]')
      await expect(privacyLink).toBeVisible()
      await expect(privacyLink).toHaveText("Privacy")
    })

    test("footer cookies link is accessible from homepage", async ({ page }) => {
      await page.goto("/")

      // Find cookies link in footer
      const cookiesLink = page.locator('footer a[href="/cookies/"]')
      await expect(cookiesLink).toBeVisible()
      await expect(cookiesLink).toHaveText("Cookies")
    })

    test("signup form privacy link is visible", async ({ page }) => {
      await page.goto("/signup/")

      // Find privacy link above submit button (not the one in footer)
      const privacyLink = page.locator('form a[href="/privacy/"]')
      await expect(privacyLink).toBeVisible()
      await expect(privacyLink).toContainText("privacy policy")
    })
  })

  test.describe("Story 1.6: Success Page", () => {
    test("should display success page with confirmation panel", async ({ page }) => {
      await page.goto("/signup/success/")

      // Verify GOV.UK confirmation panel
      await expect(page.locator(".govuk-panel--confirmation")).toBeVisible()
      await expect(page.locator(".govuk-panel__title")).toHaveText("Account created")
    })

    test("should display next steps with AWS mentioned explicitly (AC2)", async ({ page }) => {
      await page.goto("/signup/success/")

      // Verify AWS is mentioned in next steps
      const nextSteps = page.locator("ol.govuk-list--number")
      await expect(nextSteps).toContainText("AWS")
      await expect(nextSteps).toContainText("Check your email")
      await expect(nextSteps).toContainText("verification code")
      await expect(nextSteps).toContainText("sign in")
    })

    test("should display warning about spam folder", async ({ page }) => {
      await page.goto("/signup/success/")

      // Verify warning text exists with GOV.UK warning component structure
      const warningText = page.locator(".govuk-warning-text")
      await expect(warningText).toContainText("spam folder")

      // Verify exclamation icon is present (hidden from screen readers)
      const icon = warningText.locator(".govuk-warning-text__icon")
      await expect(icon).toBeVisible()
      await expect(icon).toHaveAttribute("aria-hidden", "true")
    })

    test("should have link to return to homepage", async ({ page }) => {
      await page.goto("/signup/success/")

      // Use getByRole to target the specific link text
      const homeLink = page.getByRole("link", { name: "Return to NDX homepage" })
      await expect(homeLink).toBeVisible()
      await expect(homeLink).toHaveAttribute("href", "/")
    })

    test("success page should have no accessibility violations (AC4)", async ({ page }) => {
      await page.goto("/signup/success/")

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze()

      // WCAG 2.2 AA requires zero violations, not just critical
      expect(accessibilityScanResults.violations).toHaveLength(0)
    })

    test("success page should be navigable via keyboard (AC4)", async ({ page }) => {
      await page.goto("/signup/success/")

      // Tab to first focusable element (should be skip link - good accessibility)
      await page.keyboard.press("Tab")
      let focusedElement = page.locator(":focus")
      await expect(focusedElement).toBeVisible()

      // First tab should land on skip link (correct GOV.UK pattern)
      const tagName = await focusedElement.evaluate((el) => el.tagName.toLowerCase())
      expect(tagName).toBe("a")

      // Verify we can tab through to the "Return to NDX homepage" link
      const homeLink = page.getByRole("link", { name: "Return to NDX homepage" })
      await homeLink.focus()
      focusedElement = page.locator(":focus")
      await expect(focusedElement).toContainText("Return to NDX homepage")
    })
  })
})
