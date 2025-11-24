import { defineConfig, devices } from "@playwright/test"
import { readFileSync } from "fs"

// Load proxy configuration from playwright-config.json
const proxyConfig = JSON.parse(readFileSync("./playwright-config.json", "utf-8"))

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "https://d7roov8fndsis.cloudfront.net",
    trace: "on-first-retry",
    video: "retain-on-failure",

    // Use proxy from playwright-config.json
    proxy: proxyConfig.browser.launchOptions.proxy,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Proxy is set at the use level above, not in launchOptions
        launchOptions: {
          headless: process.env.CI ? true : false,
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
