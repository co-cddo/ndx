/**
 * Jest configuration for post-deployment smoke tests
 *
 * Smoke tests run after production deployment to verify
 * critical functionality is working.
 *
 * Run with: yarn test:smoke
 *
 * AC-8.8: Smoke test runs post-deployment in prod, sends test email to ops inbox
 *
 * @see docs/sprint-artifacts/stories/n5-8-govuk-notify-sandbox-integration-test.md
 */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test/smoke"],
  testMatch: ["**/*.smoke.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  // Shorter timeout for smoke tests (30 seconds)
  testTimeout: 30000,
  // Run tests sequentially
  maxWorkers: 1,
  // Verbose output for debugging
  verbose: true,
}
