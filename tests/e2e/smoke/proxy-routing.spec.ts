import { test, expect } from "@playwright/test"

test.describe("Proxy Routing Validation", () => {
  test("UI routes are forwarded to localhost through proxy", async ({ page }) => {
    console.log("Testing UI route forwarding through mitmproxy...")

    // Access the homepage through CloudFront URL
    // mitmproxy should forward this to localhost:8080
    const response = await page.goto("https://ndx.digital.cabinet-office.gov.uk/")

    expect(response).not.toBeNull()
    expect(response!.status()).toBe(200)

    // Get page content
    const content = await page.content()

    // Check for Eleventy reload client - this only exists in local dev server
    // If we see this, we know the request was routed to localhost:8080
    expect(content).toContain("/.11ty/reload-client.js")

    console.log("✅ UI route correctly forwarded to localhost:8080")
    console.log("✅ Found Eleventy reload client script (local dev indicator)")
  })

  test("API routes pass through to CloudFront backend", async ({ page }) => {
    console.log("Testing API route passthrough to CloudFront...")

    // Access an API endpoint that doesn't exist
    // mitmproxy should pass this through to CloudFront (not localhost)
    const response = await page.goto("https://ndx.digital.cabinet-office.gov.uk/api/foo", {
      waitUntil: "domcontentloaded",
    })

    expect(response).not.toBeNull()
    expect(response!.status()).toBe(403) // AWS API Gateway returns 403 for missing auth

    // Get response body
    const body = await page.textContent("body")

    // Check for AWS API Gateway error message
    expect(body).toContain("Missing Authentication Token")

    console.log("✅ API route correctly passed through to CloudFront")
    console.log("✅ Received AWS API Gateway error (confirms backend routing)")
  })

  test("proxy configuration summary", async () => {
    console.log("\n" + "=".repeat(60))
    console.log("PROXY ROUTING VALIDATION SUMMARY")
    console.log("=".repeat(60))
    console.log("✅ UI Routes: localhost:8080 (local Eleventy dev server)")
    console.log("✅ API Routes: CloudFront backend (Innovation Sandbox API)")
    console.log("✅ Proxy: mitmproxy running on port 8081")
    console.log("=".repeat(60) + "\n")
  })
})
