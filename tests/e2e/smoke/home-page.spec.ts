import { test, expect } from "@playwright/test"

test("home page loads successfully", async ({ page }) => {
  await page.goto("https://ndx.digital.cabinet-office.gov.uk/")
  await expect(page.locator("h1")).toContainText("National Digital Exchange")
})
