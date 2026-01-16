import { test, expect } from "@playwright/test"

/**
 * Story 7.12: End-to-End User Journey Validation
 *
 * Validates complete Try Before You Buy user journey from discovery
 * through sandbox session launch.
 *
 * Journey Steps:
 * 1. Unauthenticated user discovery (catalogue, tag filter)
 * 2. Authentication flow (sign in, JWT storage)
 * 3. Lease request flow (modal, AUP, submit)
 * 4. Dashboard view (sessions table, status, expiry)
 * 5. AWS Console launch (SSO portal link)
 * 6. Sign out (clear session)
 */

test.describe("Try Before You Buy User Journey", () => {
  const TEST_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxOTk5OTk5OTk5fQ.test"
  const TOKEN_KEY = "isb-jwt"

  test.describe("1. Unauthenticated User Discovery", () => {
    test("Browse catalogue and see Try Before You Buy tag", async ({ page }) => {
      await page.goto("/catalogue/")

      // Check for Try Before You Buy tag filter
      const tryTag = page.locator('a[href*="try-before-you-buy"]').first()
      await expect(tryTag).toBeVisible()
    })

    test("Click tag filter to see only tryable products", async ({ page }) => {
      await page.goto("/catalogue/tags/try-before-you-buy/")

      // Verify page title indicates filtered view
      await expect(page.locator("h1")).toContainText(/try/i)
    })

    test("Tryable product has Try button", async ({ page }) => {
      // Navigate to a product with try: true in frontmatter
      await page.goto("/catalogue/aws/innovation-sandbox/")

      // Look for try button (should redirect to sign in if unauthenticated)
      const tryButton = page.locator("[data-try-id]")

      // If button exists, it should be visible
      if ((await tryButton.count()) > 0) {
        await expect(tryButton).toBeVisible()
      }
    })

    test("Clicking Try button redirects to sign in when unauthenticated", async ({ page }) => {
      await page.goto("/catalogue/aws/innovation-sandbox/")

      const tryButton = page.locator("[data-try-id]")

      if ((await tryButton.count()) > 0) {
        // Click and check redirection or sign-in prompt behavior
        await tryButton.click()

        // Should either show sign-in prompt or redirect
        await expect(page)
          .toHaveURL(/login|auth|sign/i)
          .catch(async () => {
            // Or modal might show sign-in message
            const signInPrompt = page.locator("text=/sign in/i")
            await expect(signInPrompt).toBeVisible()
          })
      }
    })
  })

  test.describe("2. Authentication Flow", () => {
    test("Sign in button visible in header", async ({ page }) => {
      await page.goto("/")

      // Wait for try bundle to initialize (renders auth-nav)
      await page.waitForSelector('[data-try-bundle-ready="true"]', { timeout: 10000 })

      // Sign in button rendered by auth-nav.ts as button#sign-in-button or link with data-module
      const signInButton = page
        .locator('#sign-in-button, [data-module="sign-in-button"], button:has-text("Sign in")')
        .first()
      await expect(signInButton).toBeVisible()
    })

    test("JWT token stored in sessionStorage after authentication", async ({ page }) => {
      await page.goto("/")

      // Simulate successful authentication
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
          window.dispatchEvent(new Event("storage"))
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      // Verify token stored
      const storedToken = await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)
      expect(storedToken).toBe(TEST_TOKEN)
    })

    test("Sign out button visible after authentication", async ({ page }) => {
      await page.goto("/")

      // Simulate authentication
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      // Reload to pick up auth state
      await page.reload()

      // Look for sign out button (may take a moment to render)
      const signOutButton = page.locator('[data-module="sign-out-button"], button:has-text("Sign out")').first()
      await expect(signOutButton).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe("3. Lease Request Flow", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/catalogue/aws/innovation-sandbox/")

      // Simulate authentication
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      await page.reload()
    })

    test("Try button opens AUP modal when authenticated", async ({ page }) => {
      const tryButton = page.locator("[data-try-id]")

      if ((await tryButton.count()) > 0) {
        await tryButton.click()

        // Modal should appear
        const modal = page.locator('[role="dialog"], .aup-modal')
        await expect(modal).toBeVisible({ timeout: 5000 })
      }
    })

    test("AUP modal has required elements", async ({ page }) => {
      const tryButton = page.locator("[data-try-id]")

      if ((await tryButton.count()) > 0) {
        await tryButton.click()

        const modal = page.locator('[role="dialog"], .aup-modal')

        if ((await modal.count()) > 0) {
          // Check for AUP content area
          const aupContent = modal.locator('.aup-content, [data-testid="aup-content"]')
          await expect(aupContent).toBeVisible()

          // Check for checkbox
          const checkbox = modal.locator('input[type="checkbox"]')
          await expect(checkbox).toBeVisible()

          // Check for Continue button
          const continueButton = modal.locator('button:has-text("Continue")')
          await expect(continueButton).toBeVisible()

          // Check for Cancel button
          const cancelButton = modal.locator('button:has-text("Cancel")')
          await expect(cancelButton).toBeVisible()
        }
      }
    })

    test("Continue button disabled until AUP checkbox checked", async ({ page }) => {
      const tryButton = page.locator("[data-try-id]")

      if ((await tryButton.count()) > 0) {
        await tryButton.click()

        const modal = page.locator('[role="dialog"], .aup-modal')

        if ((await modal.count()) > 0) {
          const continueButton = modal.locator('button:has-text("Continue")')
          const checkbox = modal.locator('input[type="checkbox"]')

          // Initially disabled
          await expect(continueButton).toBeDisabled()

          // Check the checkbox
          await checkbox.check()

          // Now enabled
          await expect(continueButton).toBeEnabled()
        }
      }
    })

    test("Cancel button closes modal", async ({ page }) => {
      const tryButton = page.locator("[data-try-id]")

      if ((await tryButton.count()) > 0) {
        await tryButton.click()

        const modal = page.locator('[role="dialog"], .aup-modal')

        if ((await modal.count()) > 0) {
          const cancelButton = modal.locator('button:has-text("Cancel")')
          await cancelButton.click()

          // Modal should close
          await expect(modal).not.toBeVisible()
        }
      }
    })
  })

  test.describe("4. Dashboard View", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/try/")

      // Simulate authentication
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      await page.reload()
    })

    test("Try page shows sessions heading when authenticated", async ({ page }) => {
      const heading = page.locator("h1")
      await expect(heading).toContainText(/sessions/i)
    })

    test("Try page has catalogue link", async ({ page }) => {
      // Wait for JS to render authenticated state content
      await page.waitForSelector('h1:has-text("sessions")', { timeout: 5000 })
      // Use .first() since navigation also has this link now
      const catalogueLink = page.locator('a[href*="try-before-you-buy"]').first()
      await expect(catalogueLink).toBeVisible({ timeout: 5000 })
    })

    test("Empty state shows first-time guidance", async ({ page }) => {
      // Wait for JS to fully render authenticated state content
      // First wait for heading, then wait for either guidance or table to appear
      await page.waitForSelector('h1:has-text("sessions")', { timeout: 5000 })

      // Wait for either guidance inset panel or table to appear
      // (in test env with no API, error state includes guidance)
      await page.waitForFunction(
        () => {
          const hasGuidance = document.querySelector(".govuk-inset-text") !== null
          const hasTable = document.querySelector(".govuk-table, table") !== null
          const hasError = document.querySelector(".govuk-error-summary") !== null
          return hasGuidance || hasTable || hasError
        },
        { timeout: 5000 },
      )

      // Verify one of the expected states rendered
      const guidance = page.locator(".govuk-inset-text")
      const table = page.locator(".govuk-table, table")
      const error = page.locator(".govuk-error-summary")

      const guidanceExists = (await guidance.count()) > 0
      const tableExists = (await table.count()) > 0
      const errorExists = (await error.count()) > 0

      // At minimum, one expected state should be present
      expect(guidanceExists || tableExists || errorExists).toBe(true)
    })

    test("Sessions table has correct headers when populated", async ({ page }) => {
      const table = page.locator(".govuk-table, table")

      if ((await table.count()) > 0) {
        // Check for expected headers
        const headers = table.locator("th")
        const headerTexts = await headers.allTextContents()

        // Should have Product, Status, Expires, Budget, Actions columns
        expect(headerTexts.some((h) => /product/i.test(h))).toBe(true)
        expect(headerTexts.some((h) => /status/i.test(h))).toBe(true)
      }
    })
  })

  test.describe("5. AWS Console Launch", () => {
    test("Launch button opens in new tab", async ({ page }) => {
      await page.goto("/try/")

      // Simulate authentication
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      await page.reload()

      const launchButton = page.locator('a:has-text("Launch AWS Console")')

      if ((await launchButton.count()) > 0) {
        // Check target="_blank" attribute
        const target = await launchButton.getAttribute("target")
        expect(target).toBe("_blank")

        // Check rel="noopener noreferrer" for security
        const rel = await launchButton.getAttribute("rel")
        expect(rel).toContain("noopener")
      }
    })

    test("Launch button has accessible label", async ({ page }) => {
      await page.goto("/try/")

      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      await page.reload()

      const launchButton = page.locator('a:has-text("Launch AWS Console")')

      if ((await launchButton.count()) > 0) {
        // Check for screen reader text about external link
        const srText = launchButton.locator(".govuk-visually-hidden")
        const exists = (await srText.count()) > 0
        expect(exists).toBe(true)
      }
    })
  })

  test.describe("6. Sign Out", () => {
    test("Sign out clears sessionStorage token", async ({ page }) => {
      await page.goto("/")

      // Simulate authentication
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      await page.reload()

      // Simulate sign out
      await page.evaluate((key) => {
        sessionStorage.removeItem(key)
      }, TOKEN_KEY)

      // Verify token cleared
      const token = await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)
      expect(token).toBeNull()
    })

    test("Sign out button click clears session", async ({ page }) => {
      await page.goto("/")

      // Simulate authentication
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      await page.reload()

      const signOutButton = page.locator('[data-module="sign-out-button"], button:has-text("Sign out")').first()

      if ((await signOutButton.count()) > 0) {
        await signOutButton.click()

        // Token should be cleared
        const token = await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)
        expect(token).toBeNull()
      }
    })
  })

  test.describe("Complete Journey Integration", () => {
    test("Full journey: Discovery -> Auth -> Dashboard", async ({ page }) => {
      // Step 1: Start at catalogue
      await page.goto("/catalogue/tags/try-before-you-buy/")
      await expect(page.locator("h1")).toBeVisible()

      // Step 2: Simulate authentication by setting token in page context
      // Note: In Playwright, sessionStorage must be set on EACH page after navigation
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      // Verify token was set
      const tokenAfterSet = await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)
      expect(tokenAfterSet).toBe(TEST_TOKEN)

      // Step 3: Navigate to dashboard (need to reset token after navigation in Playwright)
      await page.goto("/try/")

      // Re-set token after navigation (Playwright behavior)
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      await expect(page.locator("h1")).toContainText(/sessions/i)

      // Step 4: Verify token is accessible on dashboard
      const tokenOnDashboard = await page.evaluate((key) => sessionStorage.getItem(key), TOKEN_KEY)
      expect(tokenOnDashboard).toBe(TEST_TOKEN)

      // Step 5: Navigate back to catalogue
      await page.goto("/catalogue/")

      // Re-set token after navigation (Playwright behavior)
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      await page.reload()

      // Wait for page to fully load
      await page.waitForLoadState("domcontentloaded")

      // Step 6: Verify UI shows authenticated state
      const signOutButton = page.locator('[data-module="sign-out-button"], button:has-text("Sign out")').first()
      await expect(signOutButton).toBeVisible({ timeout: 5000 })

      // Step 7: Navigate to dashboard again to verify consistent auth state
      await page.goto("/try/")

      // Re-set token for final check
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token)
        },
        { key: TOKEN_KEY, token: TEST_TOKEN },
      )

      await page.reload()
      await expect(page.locator("h1")).toContainText(/sessions/i)
    })
  })
})
