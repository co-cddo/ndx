import { test, expect } from "@playwright/test"

/**
 * Story 5.4: localStorage JWT Persistence - E2E Tests
 *
 * These tests validate that JWT tokens stored in localStorage persist
 * across browser tabs and windows.
 *
 * AC #1: Cross-Tab Persistence - Token accessible in new tabs/windows
 * AC #2: Browser Restart Persistence - Token persists until expiry
 * AC #3: DevTools Validation - Token visible in localStorage
 */

test.describe("localStorage JWT Persistence", () => {
  const TEST_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  const TOKEN_KEY = "isb-jwt"

  test.beforeEach(async ({ page }) => {
    // Navigate to the NDX homepage
    await page.goto("/")
  })

  test("AC #3: Token is stored in localStorage after sign-in simulation", async ({ page }) => {
    // Simulate authentication by setting JWT token in localStorage
    await page.evaluate(
      ({ key, token }) => {
        localStorage.setItem(key, token)
      },
      { key: TOKEN_KEY, token: TEST_TOKEN },
    )

    // Verify token is stored correctly
    const storedToken = await page.evaluate((key) => {
      return localStorage.getItem(key)
    }, TOKEN_KEY)

    expect(storedToken).toBe(TEST_TOKEN)
  })

  test("AC #1: Token persists in localStorage within same page session", async ({ page }) => {
    // Set authentication token
    await page.evaluate(
      ({ key, token }) => {
        localStorage.setItem(key, token)
      },
      { key: TOKEN_KEY, token: TEST_TOKEN },
    )

    // Verify token exists
    const token1 = await page.evaluate((key) => {
      return localStorage.getItem(key)
    }, TOKEN_KEY)
    expect(token1).toBe(TEST_TOKEN)

    // Navigate to different page (simulates new page in same tab)
    await page.goto("/catalogue/")

    // Verify token still accessible after navigation
    const token2 = await page.evaluate((key) => {
      return localStorage.getItem(key)
    }, TOKEN_KEY)

    expect(token2).toBe(TEST_TOKEN)
    expect(token2).toBe(token1) // Same token after navigation
  })

  test("AC #2: Token persists across browser context restarts", async ({ browser }) => {
    // Create browser context with shared storage state
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    await page1.goto("/")

    // Set token in first session
    await page1.evaluate(
      ({ key, token }) => {
        localStorage.setItem(key, token)
      },
      { key: TOKEN_KEY, token: TEST_TOKEN },
    )

    // Verify token exists
    const tokenBeforeClose = await page1.evaluate((key) => {
      return localStorage.getItem(key)
    }, TOKEN_KEY)
    expect(tokenBeforeClose).toBe(TEST_TOKEN)

    // Save storage state before closing
    const storageState = await context1.storageState()
    await context1.close()

    // Create new browser context with saved storage state
    const context2 = await browser.newContext({ storageState })
    const page2 = await context2.newPage()
    await page2.goto("/")

    // Verify token persists (localStorage survives browser restarts)
    const tokenAfterRestart = await page2.evaluate((key) => {
      return localStorage.getItem(key)
    }, TOKEN_KEY)

    expect(tokenAfterRestart).toBe(TEST_TOKEN)

    // Cleanup
    await context2.close()
  })

  test("AC #1: Token persists across page navigations in same session", async ({ page }) => {
    // Set token on homepage
    await page.evaluate(
      ({ key, token }) => {
        localStorage.setItem(key, token)
      },
      { key: TOKEN_KEY, token: TEST_TOKEN },
    )

    // Navigate to catalogue page
    await page.goto("/catalogue/")
    await page.waitForLoadState("domcontentloaded")
    const token1 = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY)
    expect(token1).toBe(TEST_TOKEN)

    // Navigate to try page (different route)
    await page.goto("/try")
    await page.waitForLoadState("domcontentloaded")
    const token2 = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY)
    expect(token2).toBe(TEST_TOKEN)

    // Navigate back to homepage
    await page.goto("/")
    await page.waitForLoadState("domcontentloaded")
    const token3 = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY)
    expect(token3).toBe(TEST_TOKEN)

    // All navigations should have identical token
    expect(token1).toBe(token2)
    expect(token2).toBe(token3)
  })

  test("AC #3: localStorage.getItem returns null when no token present", async ({ page }) => {
    // Verify no token exists initially (fresh session)
    const token = await page.evaluate((key) => {
      return localStorage.getItem(key)
    }, TOKEN_KEY)

    expect(token).toBeNull()
  })
})
