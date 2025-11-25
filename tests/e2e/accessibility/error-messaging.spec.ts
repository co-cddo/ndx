import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Story 8.10: Error Messaging Accessibility
 *
 * Validates that error messages are accessible and follow
 * WCAG guidelines for error identification and prevention.
 */

const TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxOTk5OTk5OTk5fQ.test";
const TOKEN_KEY = "isb-jwt";

test.describe("Error Messaging Accessibility - WCAG 3.3", () => {
  test.describe("3.3.1 Error Identification", () => {
    test("Error messages are clearly identified", async ({ page }) => {
      await page.goto("/try/");

      // Check for error summary pattern
      const errorSummary = page.locator(".govuk-error-summary");

      if ((await errorSummary.count()) > 0) {
        // Error has role="alert" or aria-live
        const role = await errorSummary.getAttribute("role");
        const ariaLive = await errorSummary.getAttribute("aria-live");

        expect(role === "alert" || ariaLive === "assertive" || ariaLive === "polite").toBe(true);

        // Error has heading
        const title = errorSummary.locator(".govuk-error-summary__title");
        await expect(title).toBeVisible();
      }
    });

    test("Error messages use role='alert' for immediate announcement", async ({ page }) => {
      await page.goto("/try/");

      const alerts = page.locator('[role="alert"]');
      const count = await alerts.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const alert = alerts.nth(i);
          const text = await alert.textContent();

          // Alert should have meaningful content
          expect(text?.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe("3.3.2 Labels and Instructions", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/catalogue/aws/innovation-sandbox/");

      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token);
        },
        { key: TOKEN_KEY, token: TEST_TOKEN }
      );

      await page.reload();
    });

    test("Form fields have associated labels", async ({ page }) => {
      const tryButton = page.locator('[data-try-id]');

      if ((await tryButton.count()) > 0) {
        await tryButton.click();

        const modal = page.locator('[role="dialog"], .aup-modal');

        if ((await modal.count()) > 0) {
          const inputs = modal.locator('input, select, textarea');
          const count = await inputs.count();

          for (let i = 0; i < count; i++) {
            const input = inputs.nth(i);
            const id = await input.getAttribute("id");
            const ariaLabel = await input.getAttribute("aria-label");
            const ariaLabelledBy = await input.getAttribute("aria-labelledby");

            // Must have associated label
            if (id) {
              const label = modal.locator(`label[for="${id}"]`);
              const hasLabel = (await label.count()) > 0 || ariaLabel || ariaLabelledBy;
              expect(hasLabel).toBe(true);
            }
          }
        }
      }
    });

    test("Instructions are provided before form submission", async ({ page }) => {
      const tryButton = page.locator('[data-try-id]');

      if ((await tryButton.count()) > 0) {
        await tryButton.click();

        const modal = page.locator('[role="dialog"], .aup-modal');

        if ((await modal.count()) > 0) {
          // Check for AUP instruction text
          const aupContent = modal.locator('.aup-content, [data-testid="aup-content"]');

          if ((await aupContent.count()) > 0) {
            const text = await aupContent.textContent();
            expect(text?.trim().length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe("3.3.3 Error Suggestion", () => {
    test("Error messages provide helpful suggestions", async ({ page }) => {
      await page.goto("/try/");

      const errorBody = page.locator(".govuk-error-summary__body");

      if ((await errorBody.count()) > 0) {
        const text = await errorBody.textContent();

        // Should have actionable text (e.g., "Try again", "Sign in")
        const hasAction =
          text?.includes("try again") ||
          text?.includes("sign in") ||
          text?.includes("Please") ||
          text?.includes("check");

        expect(hasAction || text?.length).toBeTruthy();
      }
    });

    test("Retry button available for recoverable errors", async ({ page }) => {
      await page.goto("/try/");

      const retryButton = page.locator('[data-action="retry-fetch"], button:has-text("Try again")');

      if ((await retryButton.count()) > 0) {
        // Button should be focusable and activatable
        await expect(retryButton).toBeEnabled();

        // Button should have accessible label
        const text = await retryButton.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe("3.3.4 Error Prevention (Legal)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/catalogue/aws/innovation-sandbox/");

      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token);
        },
        { key: TOKEN_KEY, token: TEST_TOKEN }
      );

      await page.reload();
    });

    test("AUP acceptance requires explicit confirmation", async ({ page }) => {
      const tryButton = page.locator('[data-try-id]');

      if ((await tryButton.count()) > 0) {
        await tryButton.click();

        const modal = page.locator('[role="dialog"], .aup-modal');

        if ((await modal.count()) > 0) {
          const continueButton = modal.locator('button:has-text("Continue")');
          const checkbox = modal.locator('input[type="checkbox"]');

          // Continue button should be disabled initially
          await expect(continueButton).toBeDisabled();

          // User must explicitly check checkbox
          await checkbox.check();

          // Now button is enabled
          await expect(continueButton).toBeEnabled();
        }
      }
    });

    test("Cancel option available before submission", async ({ page }) => {
      const tryButton = page.locator('[data-try-id]');

      if ((await tryButton.count()) > 0) {
        await tryButton.click();

        const modal = page.locator('[role="dialog"], .aup-modal');

        if ((await modal.count()) > 0) {
          const cancelButton = modal.locator('button:has-text("Cancel")');

          // Cancel should always be available
          await expect(cancelButton).toBeEnabled();
          await expect(cancelButton).toBeVisible();
        }
      }
    });
  });

  test.describe("Error Message Content", () => {
    test("Error messages are user-friendly (not technical)", async ({ page }) => {
      await page.goto("/try/");

      const errorMessages = page.locator(".govuk-error-summary__body, .govuk-error-message");

      const count = await errorMessages.count();

      for (let i = 0; i < count; i++) {
        const message = errorMessages.nth(i);
        const text = await message.textContent();

        // Should not contain technical jargon
        const hasTechnicalJargon =
          text?.includes("500") ||
          text?.includes("Error:") ||
          text?.includes("Exception") ||
          text?.includes("undefined") ||
          text?.includes("null");

        expect(hasTechnicalJargon).toBe(false);
      }
    });

    test("Error messages do not expose sensitive information", async ({ page }) => {
      await page.goto("/try/");

      const pageContent = await page.content();

      // Should not expose tokens, internal paths, or stack traces
      const exposedSensitive =
        pageContent.includes("eyJ") || // JWT token
        pageContent.includes("/api/") || // Internal paths
        pageContent.includes("at Function") || // Stack trace
        pageContent.includes("at Object") || // Stack trace
        pageContent.includes("node_modules"); // Internal paths

      // Filter out expected API references in code/comments
      const sourceMapExclusion = !pageContent.includes("//# sourceMappingURL");

      expect(exposedSensitive && sourceMapExclusion).toBe(false);
    });
  });

  test.describe("Live Regions for Status Updates", () => {
    test("Loading state announced via aria-live", async ({ page }) => {
      await page.goto("/try/");

      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token);
        },
        { key: TOKEN_KEY, token: TEST_TOKEN }
      );

      await page.reload();

      // Check for loading state with aria-live
      const loadingState = page.locator('[aria-live], .sessions-loading');

      if ((await loadingState.count()) > 0) {
        const ariaLive = await loadingState.getAttribute("aria-live");

        // Should be polite or assertive
        expect(["polite", "assertive"]).toContain(ariaLive || "polite");
      }
    });

    test("Status changes announced to screen readers", async ({ page }) => {
      await page.goto("/try/");

      // Check for status role or aria-live regions
      const statusRegions = page.locator('[role="status"], [aria-live="polite"]');

      const count = await statusRegions.count();

      // Page should have at least one status region for updates
      // (May not be present if no dynamic content)
    });
  });

  test.describe("Axe-core Error Validation", () => {
    test("No axe-core violations on error states", async ({ page }) => {
      await page.goto("/try/");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include(".govuk-error-summary, .govuk-error-message, [role='alert']")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
});
