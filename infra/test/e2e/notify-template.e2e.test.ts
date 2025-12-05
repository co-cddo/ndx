/**
 * E2E Template Validation Tests for GOV.UK Notify
 *
 * These tests verify that email templates are correctly configured and
 * all personalisation fields are properly populated.
 *
 * AC-8.1: Uses GOV.UK Notify sandbox API key (not production)
 * AC-8.2: Sends real email to test inbox for at least one template
 * AC-8.3: Validates email subject and body contain expected personalisation
 * AC-8.7: Parses email body, asserts no ((field)) placeholders
 * AC-8.9: Test failure blocks deployment
 *
 * @see docs/sprint-artifacts/stories/n5-8-govuk-notify-sandbox-integration-test.md
 */

import {
  NotifyTestClient,
  findUnfilledPlaceholders,
  assertNoPlaceholders,
  assertBodyContains,
} from "./notify-test-client"

/**
 * Helper to conditionally skip tests
 * Uses a simpler approach that works with Jest types
 */
function skipIf(condition: boolean): typeof test.skip {
  return condition ? test.skip : test
}

// Skip E2E tests if AWS credentials or required env vars are not available
const skipE2E = !process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_SESSION_TOKEN && !process.env.AWS_PROFILE

// Use describe.skip to skip entire suite when credentials unavailable
const describeE2E = skipE2E ? describe.skip : describe

describeE2E("GOV.UK Notify E2E Template Tests", () => {
  let client: NotifyTestClient

  beforeAll(async () => {
    try {
      // Get test client with sandbox API key (AC-8.1)
      client = await NotifyTestClient.getInstance()
    } catch (error) {
      // Log error - tests will fail naturally if client not available
      console.warn("Skipping E2E tests: Could not initialize client -", (error as Error).message)
    }
  })

  afterAll(() => {
    // Clean up singleton for test isolation
    NotifyTestClient.resetInstance()
  })

  describe("LeaseApproved template (AC-8.2, AC-8.3, AC-8.7)", () => {
    // Skip if template ID not configured
    const templateId = process.env.NOTIFY_TEMPLATE_LEASE_APPROVED

    const conditionalTest = skipIf(!templateId)
    conditionalTest("sends email with all personalisation fields populated", async () => {
      // Test personalisation values
      const personalisation = {
        userName: "Test User",
        accountId: "123456789012",
        ssoUrl: "https://example.gov.uk/sso/login",
        expiryDate: "31 December 2025",
        budgetLimit: "100.00",
      }

      // AC-8.2: Send real email to sandbox
      const result = await client.sendEmail(
        templateId!,
        "test@example.gov.uk",
        personalisation,
        `e2e-lease-approved-${Date.now()}`,
      )

      // Wait for notification to be processed
      const notification = await client.waitForNotification(result.id)

      // AC-8.7: Assert no unfilled placeholders
      const unfilled = findUnfilledPlaceholders(notification.body)
      expect(unfilled).toHaveLength(0)

      // AC-8.3: Assert expected personalisation values appear in body
      assertBodyContains(notification.body, [
        personalisation.userName,
        personalisation.accountId,
        personalisation.expiryDate,
      ])

      // Verify subject is non-empty
      expect(notification.subject.length).toBeGreaterThan(0)

      console.log(`[E2E Test] LeaseApproved email validated successfully`)
      console.log(`[E2E Test] Notification ID: ${notification.id}`)
      console.log(`[E2E Test] Subject: ${notification.subject}`)
    })

    test("placeholder detection utility works correctly", () => {
      // Test with unfilled placeholders
      const bodyWithPlaceholders = "Hello ((userName)), your account ((accountId)) is ready."
      expect(findUnfilledPlaceholders(bodyWithPlaceholders)).toEqual(["((userName))", "((accountId))"])

      // Test with filled values
      const filledBody = "Hello Test User, your account 123456789012 is ready."
      expect(findUnfilledPlaceholders(filledBody)).toHaveLength(0)

      // Test assertNoPlaceholders throws for unfilled
      expect(() => assertNoPlaceholders(bodyWithPlaceholders)).toThrow("unfilled placeholders")

      // Test assertNoPlaceholders passes for filled
      expect(() => assertNoPlaceholders(filledBody)).not.toThrow()
    })

    test("body content assertion utility works correctly", () => {
      const body = "Hello Test User, your account 123456789012 is approved."

      // Test passing assertions
      expect(() => assertBodyContains(body, ["Test User", "123456789012"])).not.toThrow()

      // Test failing assertions
      expect(() => assertBodyContains(body, ["Missing Value"])).toThrow("missing expected values")
    })
  })

  describe("Template validation for other event types", () => {
    // Test that we have placeholder detection for common patterns
    test("detects various placeholder formats", () => {
      // Standard GOV.UK Notify format
      expect(findUnfilledPlaceholders("Hello ((name))")).toEqual(["((name))"])

      // Multiple placeholders
      expect(findUnfilledPlaceholders("((a)) and ((b))")).toEqual(["((a))", "((b))"])

      // Nested parentheses (edge case)
      expect(findUnfilledPlaceholders("Check (optional)")).toHaveLength(0)

      // Empty body
      expect(findUnfilledPlaceholders("")).toHaveLength(0)

      // Placeholder with underscores
      expect(findUnfilledPlaceholders("((user_name))")).toEqual(["((user_name))"])

      // Placeholder with numbers
      expect(findUnfilledPlaceholders("((value1))")).toEqual(["((value1))"])
    })
  })

  // Conditional tests for other templates
  describe.skip("Other template tests (requires template IDs)", () => {
    test.each([
      ["LeaseRequested", "NOTIFY_TEMPLATE_LEASE_REQUESTED"],
      ["LeaseDenied", "NOTIFY_TEMPLATE_LEASE_DENIED"],
      ["LeaseTerminated", "NOTIFY_TEMPLATE_LEASE_TERMINATED"],
      ["BudgetThreshold", "NOTIFY_TEMPLATE_BUDGET_THRESHOLD"],
      ["DurationThreshold", "NOTIFY_TEMPLATE_DURATION_THRESHOLD"],
    ])("%s template sends without unfilled placeholders", (eventType, envVar) => {
      const templateId = process.env[envVar]
      if (!templateId) {
        console.log(`[E2E Test] Skipping ${eventType} - ${envVar} not configured`)
        return
      }

      // Each template type would need appropriate personalisation
      // This is a placeholder for future expansion
      console.log(`[E2E Test] Would test ${eventType} template: ${templateId}`)
    })
  })
})
