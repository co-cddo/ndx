import { test, expect } from "@playwright/test"

/**
 * Story 5.3: JWT Token Extraction from URL - E2E Tests
 *
 * These tests validate that the homepage correctly extracts JWT tokens from URL
 * query parameters when OAuth redirects to homepage (https://ndx.gov.uk/),
 * stores them in sessionStorage, cleans up the URL, and redirects to the original page.
 *
 * AC #1: Extract JWT token from URL query parameter
 * AC #2: Store token in sessionStorage with key 'isb-jwt'
 * AC #3: Redirect to return URL after token extraction
 * AC #4: Remove token from browser address bar (URL cleanup)
 * AC #5: Graceful error handling (missing/empty token)
 */

test.describe("OAuth Callback Flow - Token Extraction", () => {
  const TEST_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
  const TOKEN_KEY = "isb-jwt"
  const RETURN_URL_KEY = "auth-return-to"

  test.beforeEach(async ({ page }) => {
    // Clear sessionStorage before each test
    await page.goto("/")
    await page.evaluate(() => {
      sessionStorage.clear()
    })
  })

  test("AC #1 & #2: Extract token from URL and store in sessionStorage", async ({ page }) => {
    // Simulate OAuth callback with token in URL (redirects to homepage)
    await page.goto(`/?token=${TEST_TOKEN}`)

    // Wait briefly for handleOAuthCallback to execute
    await page.waitForTimeout(100)

    // Verify token was extracted and stored in sessionStorage
    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)

    expect(storedToken).toBe(TEST_TOKEN)
  })

  test("AC #4: URL cleanup - Token removed from address bar after extraction", async ({ page }) => {
    // Navigate to callback with token (homepage)
    await page.goto(`/?token=${TEST_TOKEN}`)

    // Wait for handleOAuthCallback to execute (URL cleanup happens here)
    await page.waitForTimeout(200)

    // Verify URL no longer contains token query parameter
    const currentURL = page.url()
    expect(currentURL).not.toContain("token=")
    expect(currentURL).toMatch(/\/$/) // Should be clean path to homepage
  })

  test("AC #3: Redirect to return URL after token extraction", async ({ page }) => {
    // Capture console messages for debugging
    page.on("console", (msg) => console.log("BROWSER:", msg.text()))

    // Set up return URL in sessionStorage (simulating user came from catalogue page)
    await page.goto("/")

    // Get the current origin and build return URL
    const returnURL = await page.evaluate(() => {
      return `${window.location.origin}/catalogue`
    })

    await page.evaluate(
      ({ key, url }) => {
        sessionStorage.setItem(key, url)
      },
      { key: RETURN_URL_KEY, url: returnURL },
    )

    // Navigate to homepage with token (OAuth callback)
    await page.goto(`/?token=${TEST_TOKEN}`)

    // Wait for module to load and execute, then redirect to happen
    // Note: /catalogue redirects to /catalogue/ so match either
    await page.waitForURL("**/catalogue**", { timeout: 15000 })

    // Verify we were redirected to the return URL
    expect(page.url()).toContain("/catalogue")

    // Verify return URL was cleared from sessionStorage
    const storedReturnURL = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, RETURN_URL_KEY)
    expect(storedReturnURL).toBeNull()

    // Verify token is still present after redirect
    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)
    expect(storedToken).toBe(TEST_TOKEN)
  })

  test("AC #3: Redirect to home page if no return URL stored", async ({ page }) => {
    // Navigate to homepage with token (no return URL in sessionStorage)
    await page.goto(`/?token=${TEST_TOKEN}`)

    // Wait for JavaScript to execute and process the token
    // The token extraction and URL cleanup happens on DOMContentLoaded
    await page.waitForLoadState("domcontentloaded")

    // Wait for the URL to be cleaned (token removed from query string)
    // The cleanup uses history.replaceState, so we need to wait for that
    await page.waitForFunction(() => !window.location.search.includes("token"))

    // Verify we're on home page (path should be /)
    const currentURL = page.url()
    expect(currentURL).toMatch(/\/$/)

    // Verify token was stored in sessionStorage
    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)
    expect(storedToken).toBe(TEST_TOKEN)
  })

  test("AC #5: Graceful error handling - Missing token parameter", async ({ page }) => {
    // Navigate to homepage WITHOUT token parameter
    await page.goto("/")

    // Should stay on home page (no OAuth callback handling without token)
    await page.waitForTimeout(500)

    // Verify still on home page
    expect(page.url()).toMatch(/\/$/)

    // Verify no token stored
    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)
    expect(storedToken).toBeNull()

    // Note: return URL is NOT cleared when visiting homepage without token
    // That's correct behavior - homepage only handles OAuth callbacks with token parameter
  })

  test("AC #5: Graceful error handling - Empty token parameter", async ({ page }) => {
    // Navigate to homepage with empty token
    await page.goto("/?token=")

    // Wait for page to load and any redirects to complete
    await page.waitForLoadState("networkidle")

    // Should stay on or redirect to home page (URL may or may not have query string)
    const currentURL = page.url()
    expect(currentURL).toMatch(/\/$|\/\?/)

    // Verify no token stored (empty token should not be stored)
    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)
    expect(storedToken).toBeNull()
  })

  test("AC #5: Graceful error handling - Whitespace-only token", async ({ page }) => {
    // Navigate to homepage with whitespace token
    await page.goto("/?token=%20%20%20") // URL-encoded spaces

    // Wait for page to load and any redirects to complete
    await page.waitForLoadState("networkidle")

    // Should stay on or redirect to home page
    const currentURL = page.url()
    expect(currentURL).toMatch(/\/$|\/\?/)

    // Verify no token stored (whitespace token should not be stored)
    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)
    expect(storedToken).toBeNull()
  })

  test("Integration: Complete OAuth flow with return URL preservation", async ({ page }) => {
    // Step 1: User is on catalogue page with query parameters
    await page.goto("/")

    // Build return URL using current origin
    // Note: Use /catalogue/ with trailing slash to avoid 301 redirect that strips query params
    const returnURL = await page.evaluate(() => {
      return `${window.location.origin}/catalogue/?tag=aws&sort=name`
    })

    await page.evaluate(
      ({ key, url }) => {
        sessionStorage.setItem(key, url)
      },
      { key: RETURN_URL_KEY, url: returnURL },
    )

    // Step 2: OAuth callback returns with token (redirects to homepage)
    await page.goto(`/?token=${TEST_TOKEN}`)

    // Step 3: Should redirect to catalogue with preserved query parameters
    // Note: /catalogue may redirect to /catalogue/, so match loosely
    await page.waitForURL("**/catalogue**", { timeout: 15000 })

    // Verify correct redirect (URL should contain catalogue and the query params)
    expect(page.url()).toContain("/catalogue")
    expect(page.url()).toContain("tag=aws")
    expect(page.url()).toContain("sort=name")

    // Verify token stored
    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)
    expect(storedToken).toBe(TEST_TOKEN)
  })

  test("Integration: Token extraction with OAuth error parameter (Story 5.2 integration)", async ({ page }) => {
    // Navigate to homepage with OAuth error (no token)
    await page.goto("/?error=access_denied")

    // Homepage should detect error and show error UI
    // Should NOT attempt token extraction
    // Wait for error message to appear
    await page.waitForSelector(".govuk-error-summary", { timeout: 2000 })

    // Verify error summary is visible
    const errorVisible = await page.isVisible(".govuk-error-summary")
    expect(errorVisible).toBe(true)

    // Verify no token stored (error flow doesn't extract token)
    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)
    expect(storedToken).toBeNull()
  })

  test("Edge case: Token parameter with special characters", async ({ page }) => {
    // JWT tokens contain dots and underscores - ensure proper parsing
    const tokenWithSpecialChars = "eyJhbGci.OiJIUzI1NiIsInR5cCI6IkpXVCJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

    await page.goto(`/?token=${tokenWithSpecialChars}`)
    await page.waitForTimeout(100)

    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)

    expect(storedToken).toBe(tokenWithSpecialChars)
  })

  test("Edge case: Multiple query parameters with token", async ({ page }) => {
    // Ensure token is extracted even with other query parameters present
    await page.goto(`/?foo=bar&token=${TEST_TOKEN}&baz=qux`)
    await page.waitForTimeout(100)

    const storedToken = await page.evaluate((key) => {
      return sessionStorage.getItem(key)
    }, TOKEN_KEY)

    expect(storedToken).toBe(TEST_TOKEN)

    // Verify ALL query parameters are removed (not just token)
    await page.waitForTimeout(200)
    const currentURL = page.url()
    expect(currentURL).not.toContain("?")
    expect(currentURL).not.toContain("foo=")
    expect(currentURL).not.toContain("token=")
    expect(currentURL).not.toContain("baz=")
  })
})
