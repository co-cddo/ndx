import { defineConfig, devices } from "@playwright/test"
import { readFileSync } from "fs"

// Load proxy configuration from playwright-config.json
const proxyConfig = JSON.parse(readFileSync("./playwright-config.json", "utf-8"))

// Check for debug mode via environment variable or CLI arg
const isDebug = process.env.PWDEBUG === "1" || process.argv.includes("--debug")
const isHeaded = process.env.HEADED === "1" || process.argv.includes("--headed")

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Use HTML reporter but don't auto-open (use 'yarn playwright show-report' to view)
  reporter: [["html", { open: "never" }]],

  // Global timeout for entire test run (2 minutes max)
  globalTimeout: 2 * 60 * 1000,

  // Per-test timeout (30 seconds default)
  timeout: 30 * 1000,

  // Expect timeout (5 seconds for assertions)
  expect: {
    timeout: 5 * 1000,
  },

  use: {
    baseURL: "https://ndx.digital.cabinet-office.gov.uk",
    trace: "on-first-retry",
    video: "retain-on-failure",

    // Action timeout (10 seconds for clicks, fills, etc.)
    actionTimeout: 10 * 1000,

    // Navigation timeout (15 seconds)
    navigationTimeout: 15 * 1000,

    // Use proxy from playwright-config.json
    proxy: proxyConfig.browser.launchOptions.proxy,
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

  // Run dev server in CI (if needed)
  webServer: process.env.CI
    ? {
        command: "yarn start",
        url: "http://localhost:8080",
        reuseExistingServer: false,
      }
    : undefined,
})
