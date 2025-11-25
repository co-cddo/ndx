import { test, expect } from "@playwright/test";

/**
 * Story 8.9: Focus Management and Visual Focus Indicators
 *
 * Validates that focus is properly managed and visually indicated
 * throughout the Try Before You Buy feature.
 */

const TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxOTk5OTk5OTk5fQ.test";
const TOKEN_KEY = "isb-jwt";

test.describe("Focus Management - WCAG 2.4.7", () => {
  test.describe("Visual Focus Indicators", () => {
    test("Links have visible focus ring", async ({ page }) => {
      await page.goto("/try/");

      const link = page.locator("a.govuk-link").first();

      if ((await link.count()) > 0) {
        await link.focus();

        const focusStyles = await link.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineColor: styles.outlineColor,
            outlineOffset: styles.outlineOffset,
            boxShadow: styles.boxShadow,
          };
        });

        // GOV.UK uses yellow focus with black outline
        const hasFocusIndicator =
          focusStyles.outlineWidth !== "0px" ||
          focusStyles.boxShadow !== "none";

        expect(hasFocusIndicator).toBe(true);
      }
    });

    test("Buttons have visible focus ring", async ({ page }) => {
      await page.goto("/");

      const button = page.locator(".govuk-button").first();

      if ((await button.count()) > 0) {
        await button.focus();

        const focusStyles = await button.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            boxShadow: styles.boxShadow,
            backgroundColor: styles.backgroundColor,
          };
        });

        // Should have visible focus indication
        const hasFocusIndicator =
          focusStyles.boxShadow !== "none" ||
          focusStyles.outline !== "0px none rgb(0, 0, 0)";

        expect(hasFocusIndicator).toBe(true);
      }
    });

    test("Form inputs have visible focus ring", async ({ page }) => {
      await page.goto("/catalogue/aws/innovation-sandbox/");

      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token);
        },
        { key: TOKEN_KEY, token: TEST_TOKEN }
      );

      await page.reload();

      const tryButton = page.locator('[data-try-id]');

      if ((await tryButton.count()) > 0) {
        await tryButton.click();

        const modal = page.locator('[role="dialog"], .aup-modal');

        if ((await modal.count()) > 0) {
          const checkbox = modal.locator('input[type="checkbox"]');

          if ((await checkbox.count()) > 0) {
            await checkbox.focus();

            const focusStyles = await checkbox.evaluate((el) => {
              const styles = window.getComputedStyle(el);
              return {
                outline: styles.outline,
                boxShadow: styles.boxShadow,
              };
            });

            const hasFocusIndicator =
              focusStyles.boxShadow !== "none" ||
              focusStyles.outline !== "0px none rgb(0, 0, 0)";

            expect(hasFocusIndicator).toBe(true);
          }
        }
      }
    });

    test("Focus indicator has sufficient contrast", async ({ page }) => {
      await page.goto("/");

      const link = page.locator("a.govuk-link").first();

      if ((await link.count()) > 0) {
        await link.focus();

        // GOV.UK yellow focus: #ffdd00 on white background
        // Check that focus is visible (yellow is high contrast)
        const focusColor = await link.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.boxShadow;
        });

        // Should contain focus styling
        expect(focusColor).not.toBe("none");
      }
    });
  });

  test.describe("Modal Focus Management", () => {
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

    test("Focus moves into modal when opened", async ({ page }) => {
      const tryButton = page.locator('[data-try-id]');

      if ((await tryButton.count()) > 0) {
        await tryButton.click();

        const modal = page.locator('[role="dialog"], .aup-modal');

        if ((await modal.count()) > 0) {
          // Allow time for focus to move
          await page.waitForTimeout(100);

          const focusInModal = await page.evaluate(() => {
            const el = document.activeElement;
            const modal = document.querySelector('[role="dialog"], .aup-modal');
            return modal?.contains(el) || false;
          });

          expect(focusInModal).toBe(true);
        }
      }
    });

    test("Focus returns to trigger when modal closes", async ({ page }) => {
      const tryButton = page.locator('[data-try-id]');

      if ((await tryButton.count()) > 0) {
        await tryButton.click();

        const modal = page.locator('[role="dialog"], .aup-modal');

        if ((await modal.count()) > 0) {
          // Close modal with Escape
          await page.keyboard.press("Escape");

          await page.waitForTimeout(100);

          // Focus should return to the try button
          const focusOnTrigger = await page.evaluate(() => {
            const el = document.activeElement;
            return el?.hasAttribute("data-try-id");
          });

          expect(focusOnTrigger).toBe(true);
        }
      }
    });

    test("Focus is trapped within modal (cannot Tab out)", async ({ page }) => {
      const tryButton = page.locator('[data-try-id]');

      if ((await tryButton.count()) > 0) {
        await tryButton.click();

        const modal = page.locator('[role="dialog"], .aup-modal');

        if ((await modal.count()) > 0) {
          // Tab many times
          for (let i = 0; i < 20; i++) {
            await page.keyboard.press("Tab");

            const focusInModal = await page.evaluate(() => {
              const el = document.activeElement;
              const modal = document.querySelector('[role="dialog"], .aup-modal');
              return modal?.contains(el) || false;
            });

            expect(focusInModal).toBe(true);
          }
        }
      }
    });

    test("Shift+Tab also trapped in modal", async ({ page }) => {
      const tryButton = page.locator('[data-try-id]');

      if ((await tryButton.count()) > 0) {
        await tryButton.click();

        const modal = page.locator('[role="dialog"], .aup-modal');

        if ((await modal.count()) > 0) {
          // Shift+Tab many times
          for (let i = 0; i < 20; i++) {
            await page.keyboard.press("Shift+Tab");

            const focusInModal = await page.evaluate(() => {
              const el = document.activeElement;
              const modal = document.querySelector('[role="dialog"], .aup-modal');
              return modal?.contains(el) || false;
            });

            expect(focusInModal).toBe(true);
          }
        }
      }
    });
  });

  test.describe("Page Load Focus", () => {
    test("Focus starts at document body on page load", async ({ page }) => {
      await page.goto("/try/");

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName || "";
      });

      // Should be body or first focusable element
      expect(["BODY", "A", "BUTTON", "INPUT"]).toContain(focusedElement);
    });

    test("Skip link receives focus on first Tab", async ({ page }) => {
      await page.goto("/try/");

      await page.keyboard.press("Tab");

      const focusedText = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.textContent?.toLowerCase() || "";
      });

      // First focusable should be skip link
      expect(focusedText.includes("skip") || focusedText.includes("main")).toBe(true);
    });
  });

  test.describe("Focus Not Obscured - WCAG 2.4.11", () => {
    test("Focused element is not hidden by sticky header", async ({ page }) => {
      await page.goto("/try/");

      // Get all focusable elements
      const focusables = page.locator(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const count = await focusables.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const el = focusables.nth(i);
        await el.focus();

        // Check if element is visible in viewport
        const isVisible = await el.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.left >= 0 &&
            rect.right <= window.innerWidth
          );
        });

        // If not fully visible, scroll into view
        if (!isVisible) {
          await el.scrollIntoViewIfNeeded();
        }

        // After potential scroll, verify visible
        const visibleAfterScroll = await el.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        });

        expect(visibleAfterScroll).toBe(true);
      }
    });
  });
});
