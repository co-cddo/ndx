import { test, expect } from "@playwright/test"

// Test product page path - uses baseURL from playwright.config.ts
const PRODUCT_PAGE = "/catalogue/mindweave-labs/synaplyte/"

test.describe("Remote Images Plugin", () => {
  test("catalogue page badges load from local assets", async ({ page }) => {
    // Navigate to a catalogue page with badges
    await page.goto(PRODUCT_PAGE)

    // Get all images on the page
    const images = page.locator("img")
    const imageCount = await images.count()

    // Should have at least some images
    expect(imageCount).toBeGreaterThan(0)

    // Check that badge images are served locally (not from shields.io)
    const badgeImages = page.locator('img[src*="/assets/remote-images/"]')
    const badgeCount = await badgeImages.count()

    // Should have some locally-served badge images
    expect(badgeCount).toBeGreaterThan(0)

    // Verify no images are loaded from shields.io directly
    const externalBadges = page.locator('img[src*="shields.io"]')
    const externalCount = await externalBadges.count()
    expect(externalCount).toBe(0)
  })

  test("locally served badges load successfully", async ({ page }) => {
    // Listen for failed requests
    const failedRequests: string[] = []
    page.on("requestfailed", (request) => {
      if (request.url().includes("/assets/remote-images/")) {
        failedRequests.push(request.url())
      }
    })

    await page.goto(PRODUCT_PAGE)

    // Wait for images to load
    await page.waitForLoadState("networkidle")

    // No badge requests should have failed
    expect(failedRequests).toHaveLength(0)
  })

  test("badge images have correct file extensions", async ({ page }) => {
    await page.goto(PRODUCT_PAGE)

    const badgeImages = page.locator('img[src*="/assets/remote-images/"]')
    const count = await badgeImages.count()

    for (let i = 0; i < count; i++) {
      const src = await badgeImages.nth(i).getAttribute("src")
      // Should have a valid image extension
      expect(src).toMatch(/\.(svg|png|jpg|jpeg|gif|webp)$/)
      // Should have hash-based filename (16 hex chars)
      expect(src).toMatch(/\/[a-f0-9]{16}\.[a-z]+$/)
    }
  })

  test("no CSP violations from badge images", async ({ page }) => {
    const cspViolations: string[] = []

    // Listen for CSP violations
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Content Security Policy")) {
        cspViolations.push(msg.text())
      }
    })

    await page.goto(PRODUCT_PAGE)
    await page.waitForLoadState("networkidle")

    // No CSP violations should occur
    expect(cspViolations).toHaveLength(0)
  })

  test("multiple pages have local images (no external sources)", async ({ page }) => {
    const pagesToTest = [
      "/catalogue/mindweave-labs/synaplyte/",
      "/catalogue/", // Main catalogue page
      "/optimise/", // Optimise page has cdn.jsdelivr.net images
    ]

    for (const pagePath of pagesToTest) {
      await page.goto(pagePath)

      // Check for any images with external shields.io or jsdelivr sources
      const externalBadges = page.locator('img[src*="shields.io"]')
      const externalCount = await externalBadges.count()
      expect(externalCount).toBe(0)

      const externalJsdelivr = page.locator('img[src*="jsdelivr.net"]')
      const jsdelivrCount = await externalJsdelivr.count()
      expect(jsdelivrCount).toBe(0)
    }
  })
})
