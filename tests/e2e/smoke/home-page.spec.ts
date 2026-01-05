import { test, expect } from "@playwright/test"

test("home page loads successfully", async ({ page }) => {
  // Uses baseURL from playwright.config.ts (localhost:8080 in CI, production locally)
  await page.goto("/")
  await expect(page.locator("h1")).toContainText("National Digital Exchange")
})
