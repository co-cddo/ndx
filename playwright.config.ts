import { defineConfig, devices } from "@playwright/test"
import { readFileSync, existsSync } from "fs"

// Check for debug mode via environment variable or CLI arg
const isDebug = process.env.PWDEBUG === "1" || process.argv.includes("--debug")
const isHeaded = process.env.HEADED === "1" || process.argv.includes("--headed")

// Environment-based configuration
// - E2E_BASE_URL: Override the base URL (default: http://localhost:8080 in CI, production URL locally)
// - E2E_USE_PROXY: Enable mitmproxy (default: true locally, false in CI for direct localhost testing)
const isCI = !!process.env.CI
const baseURL =
  process.env.E2E_BASE_URL || (isCI ? "http://localhost:8080" : "https://ndx.digital.cabinet-office.gov.uk")
const useProxy = process.env.E2E_USE_PROXY === "true" || (!isCI && process.env.E2E_USE_PROXY !== "false")

// Load proxy configuration only when needed (local development with proxy)
let proxyConfig = undefined
if (useProxy && existsSync("./playwright-config.json")) {
  try {
    const config = JSON.parse(readFileSync("./playwright-config.json", "utf-8"))
    proxyConfig = config.browser?.launchOptions?.proxy
  } catch {
    console.warn("Warning: Could not load playwright-config.json, running without proxy")
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  // Use HTML reporter but don't auto-open (use 'yarn playwright show-report' to view)
  // In CI, also use blob reporter for sharded test merging
  reporter: process.env.CI ? [["blob"], ["html", { open: "never" }]] : [["html", { open: "never" }]],

  // Global timeout for entire test run (2 minutes max)
  globalTimeout: 2 * 60 * 1000,

  // Per-test timeout (30 seconds default)
  timeout: 30 * 1000,

  // Expect timeout (5 seconds for assertions)
  expect: {
    timeout: 5 * 1000,
  },

  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",

    // Action timeout (10 seconds for clicks, fills, etc.)
    actionTimeout: 10 * 1000,

    // Navigation timeout (15 seconds)
    navigationTimeout: 15 * 1000,

    // Use proxy only when explicitly enabled (local development)
    ...(proxyConfig ? { proxy: proxyConfig } : {}),

    // Pre-set cookie consent to avoid cookie banner interfering with tests
    // The banner would otherwise be the first focusable element on the page
    storageState: {
      cookies: [
        {
          name: "ndx_cookies_policy",
          value: encodeURIComponent(JSON.stringify({ analytics: false, version: 1 })),
          domain: isCI ? "localhost" : "ndx.digital.cabinet-office.gov.uk",
          path: "/",
          httpOnly: false,
          secure: !isCI,
          sameSite: "Strict" as const,
        },
      ],
      origins: [],
    },
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Run headed if HEADED=1 or --headed flag
        headless: !(isHeaded || isDebug),
        launchOptions: {
          // Slow down actions in debug mode for visibility
          slowMo: isDebug ? 100 : 0,
        },
      },
    },
  ],

  // Run dev server in CI
  webServer: isCI
    ? {
        command: "yarn start",
        url: "http://localhost:8080",
        reuseExistingServer: false,
        timeout: 60 * 1000, // 60 seconds to start
      }
    : undefined,
})
