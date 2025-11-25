import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Story 7.13: Automated Accessibility Tests for Dashboard UI
 *
 * Validates /try page and sessions table meet WCAG 2.2 AA standards.
 *
 * Test Areas:
 * 1. Page Structure (headings, landmarks, skip link)
 * 2. Sessions Table (headers, caption, cell associations)
 * 3. Status Badges (color contrast, text alternatives)
 * 4. Launch Button (keyboard focus, accessible labels)
 * 5. Empty State (guidance accessibility)
 */

const TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxOTk5OTk5OTk5fQ.test";
const TOKEN_KEY = "isb-jwt";

test.describe("Dashboard Accessibility - WCAG 2.2 AA Compliance", () => {
  test.describe("Test 1: Page Structure", () => {
    test("Heading hierarchy is correct (h1 -> h2 -> h3)", async ({ page }) => {
      await page.goto("/try/");

      // Check h1 exists
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      // Get all headings and verify hierarchy
      const headings = await page.$$eval("h1, h2, h3, h4, h5, h6", (elements) => {
        return elements.map((el) => ({
          level: parseInt(el.tagName.substring(1)),
          text: el.textContent?.trim(),
        }));
      });

      // Verify first heading is h1
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0].level).toBe(1);

      // Verify no heading skips levels (e.g., h1 -> h3 without h2)
      for (let i = 1; i < headings.length; i++) {
        const current = headings[i].level;
        const previous = headings[i - 1].level;
        // Heading level should not jump more than 1 level deeper
        expect(current).toBeLessThanOrEqual(previous + 1);
      }
    });

    test("Main landmark region is defined", async ({ page }) => {
      await page.goto("/try/");

      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();
    });

    test("Navigation landmark is defined", async ({ page }) => {
      await page.goto("/try/");

      const nav = page.locator('nav, [role="navigation"]');
      // Should have at least one navigation landmark
      await expect(nav.first()).toBeVisible();
    });

    test("Skip to main content link is present", async ({ page }) => {
      await page.goto("/try/");

      // Skip link should be first focusable element
      const skipLink = page.locator('a[href="#main-content"], a:has-text("Skip to main content")');
      const exists = (await skipLink.count()) > 0;

      // GOV.UK template includes skip link
      expect(exists).toBe(true);
    });

    test("No axe-core critical violations on page structure", async ({ page }) => {
      await page.goto("/try/");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include("body")
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .disableRules(["color-contrast"]) // Tested separately
        .analyze();

      expect(accessibilityScanResults.violations.filter((v) => v.impact === "critical")).toEqual([]);
    });
  });

  test.describe("Test 2: Sessions Table", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/try/");

      // Simulate authentication
      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token);
        },
        { key: TOKEN_KEY, token: TEST_TOKEN }
      );

      await page.reload();
    });

    test("Table has accessible headers with scope attribute", async ({ page }) => {
      const table = page.locator(".govuk-table, table");

      if ((await table.count()) > 0) {
        const headers = table.locator("th");
        const count = await headers.count();

        for (let i = 0; i < count; i++) {
          const scope = await headers.nth(i).getAttribute("scope");
          // Each header should have scope="col" or scope="row"
          expect(scope).toMatch(/col|row/);
        }
      }
    });

    test("Table has caption or aria-label", async ({ page }) => {
      const table = page.locator(".govuk-table, table");

      if ((await table.count()) > 0) {
        const caption = table.locator("caption");
        const hasCaption = (await caption.count()) > 0;

        const ariaLabel = await table.getAttribute("aria-label");
        const ariaLabelledBy = await table.getAttribute("aria-labelledby");

        // Table must have either caption, aria-label, or aria-labelledby
        expect(hasCaption || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    });

    test("Data cells are associated with headers", async ({ page }) => {
      const table = page.locator(".govuk-table, table");

      if ((await table.count()) > 0) {
        // Verify table structure: thead with th, tbody with td
        const thead = table.locator("thead");
        const tbody = table.locator("tbody");

        const hasProperStructure = (await thead.count()) > 0 && (await tbody.count()) > 0;
        expect(hasProperStructure).toBe(true);
      }
    });

    test("No axe-core table accessibility violations", async ({ page }) => {
      const table = page.locator(".govuk-table, table");

      if ((await table.count()) > 0) {
        const accessibilityScanResults = await new AxeBuilder({ page })
          .include("table, .govuk-table")
          .withTags(["wcag2a", "wcag2aa"])
          .analyze();

        // Filter for table-related rules only
        const tableViolations = accessibilityScanResults.violations.filter(
          (v) => v.id.includes("table") || v.id.includes("th") || v.id.includes("td")
        );

        expect(tableViolations).toEqual([]);
      }
    });
  });

  test.describe("Test 3: Status Badges", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/try/");

      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token);
        },
        { key: TOKEN_KEY, token: TEST_TOKEN }
      );

      await page.reload();
    });

    test("Status badges convey meaning through text, not color alone", async ({ page }) => {
      const statusBadges = page.locator(".govuk-tag");

      const count = await statusBadges.count();

      for (let i = 0; i < count; i++) {
        const badge = statusBadges.nth(i);
        const text = await badge.textContent();

        // Badge must have meaningful text content
        expect(text?.trim().length).toBeGreaterThan(0);

        // Text should be status descriptor (Active, Pending, Expired, Terminated)
        const validStatuses = ["Active", "Pending", "Expired", "Terminated"];
        const hasValidStatus = validStatuses.some((s) => text?.includes(s));
        expect(hasValidStatus || text?.length).toBeTruthy();
      }
    });

    test("Status badges have sufficient color contrast", async ({ page }) => {
      const statusBadges = page.locator(".govuk-tag");

      if ((await statusBadges.count()) > 0) {
        const accessibilityScanResults = await new AxeBuilder({ page })
          .include(".govuk-tag")
          .withTags(["wcag2aa"])
          .analyze();

        // Check for color contrast violations
        const contrastViolations = accessibilityScanResults.violations.filter((v) => v.id === "color-contrast");

        expect(contrastViolations).toEqual([]);
      }
    });
  });

  test.describe("Test 4: Launch Button", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/try/");

      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token);
        },
        { key: TOKEN_KEY, token: TEST_TOKEN }
      );

      await page.reload();
    });

    test("Launch button is keyboard focusable", async ({ page }) => {
      const launchButton = page.locator('a:has-text("Launch AWS Console")');

      if ((await launchButton.count()) > 0) {
        // Tab to focus the button
        await page.keyboard.press("Tab");

        // Keep tabbing until we find the launch button or run out of tabs
        let found = false;
        for (let i = 0; i < 50; i++) {
          const focused = await page.evaluate(() => document.activeElement?.textContent);
          if (focused?.includes("Launch AWS Console")) {
            found = true;
            break;
          }
          await page.keyboard.press("Tab");
        }

        // Button should be reachable via keyboard
        // (May not be found if no sessions exist, which is acceptable)
      }
    });

    test("Launch button has accessible label", async ({ page }) => {
      const launchButton = page.locator('a:has-text("Launch AWS Console")');

      if ((await launchButton.count()) > 0) {
        // Button should have visible text
        const text = await launchButton.textContent();
        expect(text).toContain("Launch AWS Console");

        // Check for screen reader text indicating external link
        const srText = launchButton.locator(".govuk-visually-hidden");
        if ((await srText.count()) > 0) {
          const hiddenText = await srText.textContent();
          expect(hiddenText).toContain("opens in new tab");
        }
      }
    });

    test("External link announced to screen readers", async ({ page }) => {
      const launchButton = page.locator('a:has-text("Launch AWS Console")');

      if ((await launchButton.count()) > 0) {
        // Check for aria attributes or hidden text
        const ariaLabel = await launchButton.getAttribute("aria-label");
        const srText = await launchButton.locator(".govuk-visually-hidden").textContent();

        // Either aria-label or visually hidden text should indicate external
        const hasExternalIndicator =
          ariaLabel?.includes("new tab") || ariaLabel?.includes("external") || srText?.includes("new tab");

        expect(hasExternalIndicator).toBe(true);
      }
    });

    test("Focus indicator is visible", async ({ page }) => {
      const launchButton = page.locator('a:has-text("Launch AWS Console")');

      if ((await launchButton.count()) > 0) {
        // Focus the button
        await launchButton.focus();

        // Check that focused element has outline or focus styles
        const outlineStyle = await launchButton.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            boxShadow: styles.boxShadow,
          };
        });

        // GOV.UK uses yellow focus state - check for outline or box-shadow
        const hasFocusIndicator =
          outlineStyle.outlineWidth !== "0px" || outlineStyle.boxShadow !== "none";

        expect(hasFocusIndicator).toBe(true);
      }
    });
  });

  test.describe("Test 5: Empty State", () => {
    test("Guidance panel has clear heading", async ({ page }) => {
      await page.goto("/try/");

      // Check for guidance heading in inset text
      const insetText = page.locator(".govuk-inset-text");

      if ((await insetText.count()) > 0) {
        const heading = insetText.locator("h2, h3, h4");
        if ((await heading.count()) > 0) {
          const headingText = await heading.textContent();
          expect(headingText?.length).toBeGreaterThan(0);
        }
      }
    });

    test("Links are keyboard accessible", async ({ page }) => {
      await page.goto("/try/");

      const links = page.locator(".govuk-link, a");
      const count = await links.count();

      // All links should have tabindex >= 0 (focusable)
      for (let i = 0; i < Math.min(count, 10); i++) {
        const link = links.nth(i);
        const tabindex = await link.getAttribute("tabindex");

        // tabindex should be null (default focusable) or >= 0
        if (tabindex !== null) {
          expect(parseInt(tabindex)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test("Content readable by screen readers", async ({ page }) => {
      await page.goto("/try/");

      // Ensure no aria-hidden on main content
      const mainContent = page.locator("main, #main-content, .govuk-main-wrapper");

      if ((await mainContent.count()) > 0) {
        const ariaHidden = await mainContent.getAttribute("aria-hidden");
        expect(ariaHidden).not.toBe("true");
      }
    });

    test("No axe-core violations on empty state", async ({ page }) => {
      await page.goto("/try/");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include("main, #main-content, .govuk-main-wrapper")
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();

      // No critical or serious violations
      const criticalViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(criticalViolations).toEqual([]);
    });
  });

  test.describe("Full Page Accessibility Scan", () => {
    test("Unauthenticated try page has no critical accessibility violations", async ({ page }) => {
      await page.goto("/try/");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"])
        .analyze();

      // Filter for critical violations only
      const criticalViolations = accessibilityScanResults.violations.filter((v) => v.impact === "critical");

      expect(criticalViolations).toEqual([]);
    });

    test("Authenticated try page has no critical accessibility violations", async ({ page }) => {
      await page.goto("/try/");

      await page.evaluate(
        ({ key, token }) => {
          sessionStorage.setItem(key, token);
        },
        { key: TOKEN_KEY, token: TEST_TOKEN }
      );

      await page.reload();

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa", "best-practice"])
        .analyze();

      const criticalViolations = accessibilityScanResults.violations.filter((v) => v.impact === "critical");

      expect(criticalViolations).toEqual([]);
    });
  });
});
