/**
 * Unit tests for NDX Notification Handler
 *
 * Tests cover:
 * - AC-3.1, AC-3.1.1: Source validation (security)
 * - AC-3.2: SecurityError on unauthorized sources
 * - AC-3.7, AC-3.7.1: SuspiciousEmailDomain metric
 * - AC-3.8.1: Log injection prevention
 * - AC-3.10: PII redaction
 */

import { handler, validateEventSource, sanitizeLogInput, redactEmail, checkEmailDomain } from "./handler"
import type { EventBridgeEvent } from "./types"
import { SecurityError } from "./errors"

// Mock Lambda Powertools
jest.mock("@aws-lambda-powertools/logger", () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    appendKeys: jest.fn(),
  }
  return {
    Logger: jest.fn(() => mockLogger),
  }
})

jest.mock("@aws-lambda-powertools/metrics", () => {
  const mockMetrics = {
    addMetric: jest.fn(),
    publishStoredMetrics: jest.fn(),
  }
  return {
    Metrics: jest.fn(() => mockMetrics),
    MetricUnit: {
      Count: "Count",
    },
  }
})

// Note: Slack webhook code removed in Story 6.3. Slack visibility now via AWS Chatbot.

// Mock validation module
jest.mock("./validation", () => ({
  validateEvent: jest.fn((event) => ({
    eventType: event["detail-type"],
    eventId: event.id,
    source: event.source,
    timestamp: event.time,
    detail: event.detail,
  })),
}))

describe("NDX Notification Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Helper to create a valid test event
  // Note: source must match ALLOWED_SOURCES from types.ts
  function createTestEvent(overrides: Partial<EventBridgeEvent> = {}): EventBridgeEvent {
    return {
      version: "0",
      id: "test-event-id-123",
      "detail-type": "LeaseApproved",
      source: "InnovationSandbox-ndx",
      account: "111122223333",
      time: "2025-11-27T10:00:00Z",
      region: "eu-west-2",
      resources: [],
      detail: {
        leaseId: "lease-123",
        userEmail: "user@example.gov.uk",
      },
      ...overrides,
    }
  }

  describe("Source Validation (AC-3.1, AC-3.1.1, AC-3.2)", () => {
    // Note: ALLOWED_SOURCES = ['InnovationSandbox-ndx', 'isb-costs'] from types.ts
    test("accepts valid source: InnovationSandbox-ndx", () => {
      const event = createTestEvent({ source: "InnovationSandbox-ndx" })
      expect(() => validateEventSource(event)).not.toThrow()
    })

    test("accepts valid source: isb-costs (for billing events)", () => {
      const event = createTestEvent({ source: "isb-costs" })
      expect(() => validateEventSource(event)).not.toThrow()
    })

    test("rejects unauthorized source with SecurityError (AC-3.1.1)", () => {
      const event = createTestEvent({ source: "attacker-service" })

      expect(() => validateEventSource(event)).toThrow(SecurityError)
      expect(() => validateEventSource(event)).toThrow("Invalid event source")
    })

    test("SecurityError contains security context (AC-3.2)", () => {
      const event = createTestEvent({ source: "malicious-source" })

      try {
        validateEventSource(event)
        fail("Expected SecurityError to be thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError)
        const secError = error as SecurityError
        expect(secError.securityContext).toMatchObject({
          expectedSource: "InnovationSandbox-ndx, isb-costs",
          actualSource: "malicious-source",
          eventId: "test-event-id-123",
        })
      }
    })

    test("rejects empty source string", () => {
      const event = createTestEvent({ source: "" })
      expect(() => validateEventSource(event)).toThrow(SecurityError)
    })

    test("rejects source with similar but different name", () => {
      const event = createTestEvent({ source: "InnovationSandbox-fake" })
      expect(() => validateEventSource(event)).toThrow(SecurityError)
    })
  })

  describe("Log Injection Prevention (AC-3.8.1)", () => {
    test("escapes newlines in log input", () => {
      const input = "Hello\nWorld"
      expect(sanitizeLogInput(input)).toBe("Hello\\nWorld")
    })

    test("escapes carriage returns in log input", () => {
      const input = "Hello\rWorld"
      expect(sanitizeLogInput(input)).toBe("Hello\\rWorld")
    })

    test("escapes tabs in log input", () => {
      const input = "Hello\tWorld"
      expect(sanitizeLogInput(input)).toBe("Hello\\tWorld")
    })

    test("escapes control characters (null byte)", () => {
      const input = "Hello\x00World"
      expect(sanitizeLogInput(input)).toBe("Hello\\x00World")
    })

    test("escapes multiple control characters", () => {
      const input = "Fake\nEvent\r\nType\x07"
      const sanitized = sanitizeLogInput(input)
      expect(sanitized).not.toContain("\n")
      expect(sanitized).not.toContain("\r")
      expect(sanitized).not.toContain("\x07")
      expect(sanitized).toBe("Fake\\nEvent\\r\\nType\\x07")
    })

    test("handles non-string input", () => {
      expect(sanitizeLogInput(123 as unknown as string)).toBe("123")
      expect(sanitizeLogInput(null as unknown as string)).toBe("null")
    })

    // Skip: This test calls handler() which requires AWS mocks for secrets
    // The sanitizeLogInput function is already tested directly above
    test.skip("event with newline in detail-type is sanitized (requires AWS mocks)", async () => {
      const event = createTestEvent({
        "detail-type": "LeaseApproved\nFake: attacker-data",
      })

      // Should still process (source is valid)
      const response = await handler(event)
      expect(response.statusCode).toBe(200)

      // The eventType in the response should be sanitized
      const body = JSON.parse(response.body) as { eventType: string }
      expect(body.eventType).not.toContain("\n")
      expect(body.eventType).toContain("\\n")
    })
  })

  describe("PII Redaction (AC-3.10)", () => {
    test("redacts email address to [REDACTED]", () => {
      expect(redactEmail("user@example.gov.uk")).toBe("[REDACTED]")
    })

    test("redacts any email format", () => {
      expect(redactEmail("john.doe@department.gov.uk")).toBe("[REDACTED]")
      expect(redactEmail("test@gmail.com")).toBe("[REDACTED]")
    })

    test("handles undefined email", () => {
      expect(redactEmail(undefined)).toBe("[NO_EMAIL]")
    })

    test("handles empty string email", () => {
      expect(redactEmail("")).toBe("[NO_EMAIL]")
    })
  })

  describe("SuspiciousEmailDomain Metric (AC-3.7, AC-3.7.1)", () => {
    test("does not throw for .gov.uk email", () => {
      // The checkEmailDomain function should not log warning for gov.uk
      expect(() => checkEmailDomain("user@example.gov.uk", "test-event-id")).not.toThrow()
    })

    test("does not throw for subdomain of .gov.uk", () => {
      expect(() => checkEmailDomain("user@department.gov.uk", "test-event-id")).not.toThrow()
    })

    test("handles email without domain gracefully", () => {
      expect(() => checkEmailDomain("invalid-email", "test-id")).not.toThrow()
    })

    test("handles undefined email gracefully", () => {
      expect(() => checkEmailDomain(undefined, "test-id")).not.toThrow()
    })
  })

  // Handler Integration tests require mocking secrets, template validation,
  // and notify-sender modules. These are tested in dedicated e2e tests.
  // Skipping here since unit tests focus on handler functions.
  describe.skip("Handler Integration (requires AWS mocks)", () => {
    test("processes valid event successfully", async () => {
      const event = createTestEvent()
      const response = await handler(event)

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body) as { success: boolean; eventId: string }
      expect(body.success).toBe(true)
      expect(body.eventId).toBe("test-event-id-123")
    })

    test("throws on invalid source (triggers DLQ)", async () => {
      const event = createTestEvent({ source: "attacker-service" })

      await expect(handler(event)).rejects.toThrow(SecurityError)
    })

    // Note: Slack webhook code removed in Story 6.3. Slack visibility now via AWS Chatbot.
    test("returns correct channels for lease events (email only)", async () => {
      const event = createTestEvent({ "detail-type": "LeaseApproved" })
      const response = await handler(event)

      const body = JSON.parse(response.body) as { channels: string[] }
      expect(body.channels).toContain("email")
    })

    test("returns no channels for ops-only events", async () => {
      const event = createTestEvent({ "detail-type": "AccountQuarantined" })
      const response = await handler(event)

      const body = JSON.parse(response.body) as { channels: string[] }
      // Ops events visible via AWS Chatbot, not via this handler
      expect(body.channels).toEqual([])
    })

    test("returns email channel for LeaseFrozen", async () => {
      const event = createTestEvent({ "detail-type": "LeaseFrozen" })
      const response = await handler(event)

      const body = JSON.parse(response.body) as { channels: string[] }
      expect(body.channels).toEqual(["email"])
    })
  })

  describe("Error Classification", () => {
    test("SecurityError is not retriable", () => {
      const error = new SecurityError("test", { eventId: "123" })
      expect(error.isRetriable).toBe(false)
      expect(error.severity).toBe("high")
    })
  })

  // Note: Field Name Mapping tests are in field-mapping.test.ts
})
