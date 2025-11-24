import { test, expect } from "@playwright/test"

test("home page loads successfully", async ({ page }) => {
  await page.goto("https://d7roov8fndsis.cloudfront.net/")
  await expect(page.locator("h1")).toContainText("National Digital Exchange")
})
