/**
 * Jest configuration for E2E tests
 *
 * E2E tests run against GOV.UK Notify sandbox environment
 * and require valid sandbox API credentials in Secrets Manager.
 *
 * Run with: yarn test:e2e
 *
 * @see docs/sprint-artifacts/stories/n5-8-govuk-notify-sandbox-integration-test.md
 */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test/e2e"],
  testMatch: ["**/*.e2e.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  // Extended timeout for external API calls (60 seconds)
  testTimeout: 60000,
  // Run tests sequentially to avoid rate limiting
  maxWorkers: 1,
  // Setup file for E2E environment
  setupFilesAfterEnv: ["<rootDir>/test/e2e/setup.ts"],
  // Verbose output for debugging
  verbose: true,
}
