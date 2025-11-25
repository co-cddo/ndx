import { test, expect } from "@playwright/test"

test("Debug: Check if try.bundle.js loads and exports functions", async ({ page }) => {
  // Listen for console messages
  const consoleMessages: string[] = []
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`)
  })

  // Listen for page errors
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message)
  })

  // Navigate to homepage with token (like the actual OAuth flow)
  // Use waitUntil: 'networkidle' to ensure page is fully loaded before checking
  const response = await page.goto("/?token=test123", { waitUntil: 'networkidle' })
  console.log("=== Navigation Response ===")
  console.log("Response URL:", response?.url())
  console.log("Request URL:", response?.request().url())
  console.log("Page URL after load:", page.url())

  // Wait for any redirects to complete (OAuth callback may redirect)
  await page.waitForLoadState('networkidle')

  // Check if token was stored
  const storedToken = await page.evaluate(() => sessionStorage.getItem('isb-jwt'))
  console.log("=== Token Check ===")
  console.log("Stored token:", storedToken ? `${storedToken.substring(0, 20)}...` : 'null')
  console.log("Final page URL:", page.url())

  // Check console for errors
  console.log("=== Console Messages ===")
  consoleMessages.forEach(msg => console.log(msg))

  // Try to evaluate if the module loaded
  const moduleCheck = await page.evaluate(() => {
    return {
      hasSessionStorage: typeof sessionStorage !== 'undefined',
      hasWindow: typeof window !== 'undefined',
      canImport: 'import' in document.createElement('script')
    }
  })

  console.log("=== Module Check ===", moduleCheck)

  // Try to manually import and check
  const importCheck = await page.evaluate(async () => {
    try {
      const module = await import('/assets/try.bundle.js')
      return {
        success: true,
        exports: Object.keys(module),
        hasHandleOAuthCallback: typeof module.handleOAuthCallback === 'function',
        hasParseOAuthError: typeof module.parseOAuthError === 'function'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  console.log("=== Import Check ===", importCheck)

  expect(importCheck.success).toBe(true)
})
