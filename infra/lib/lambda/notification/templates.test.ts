/**
 * Unit Tests for Email Templates
 *
 * Stories:
 * - N5.4 - Lease Lifecycle Email Templates (ACs: 4.1-4.19, 4.25)
 * - N5.5 - Monitoring Alert Email Templates (ACs: 5.1-5.15)
 *
 * Test naming convention: "AC-X.X: <description>"
 */

import {
  NOTIFY_TEMPLATES,
  TERMINATION_REASONS,
  FREEZE_REASONS,
  RESUME_INSTRUCTIONS,
  LEASE_LIFECYCLE_EVENTS,
  MONITORING_ALERT_EVENTS,
  BILLING_EVENTS,
  LINK_INSTRUCTIONS,
  DEFAULT_TIMEZONE,
  getTemplateConfig,
  getTemplateId,
  getHumanReadableReason,
  getHumanReadableFreezeReason,
  getResumeInstructions,
  generatePortalLink,
  generateBudgetActionLink,
  getPlainTextLink,
  validateRequiredFields,
  applyOptionalDefaults,
  buildLeaseRequestedPersonalisation,
  buildLeaseApprovedPersonalisation,
  buildLeaseDeniedPersonalisation,
  buildLeaseTerminatedPersonalisation,
  buildBudgetThresholdPersonalisation,
  buildDurationThresholdPersonalisation,
  buildFreezingThresholdPersonalisation,
  buildBudgetExceededPersonalisation,
  buildLeaseExpiredPersonalisation,
  buildLeaseFrozenPersonalisation,
  buildLeaseCostsGeneratedPersonalisation,
  buildPersonalisation,
  isLeaseLifecycleEvent,
  isMonitoringAlertEvent,
  isBillingEvent,
  formatCurrency,
  formatUKDate,
  formatUKDateLong,
  formatPercentage,
  getBudgetDisclaimer,
  detectEnrichmentConflict,
  getBudgetDiscrepancy,
  type LeaseKey,
  type TemplateConfig,
  type EnrichedData,
} from "./templates"
import { PermanentError } from "./errors"
import type { ValidatedEvent } from "./validation"

// =============================================================================
// Test Fixtures
// =============================================================================

const mockLeaseKey: LeaseKey = {
  userEmail: "test.user@example.gov.uk",
  uuid: "123e4567-e89b-4456-a789-426614174000",
}

const mockSecret = "test-secret-key-for-hmac-signing"
const mockPortalUrl = "https://portal.example.gov.uk"

// Store original env
const originalEnv = process.env

// =============================================================================
// Template Registry Tests (AC-4.1)
// =============================================================================

describe("Template Registry", () => {
  describe("NOTIFY_TEMPLATES", () => {
    test("AC-4.1: Template IDs loaded from environment variables (NOTIFY_TEMPLATE_*)", () => {
      // Verify all templates use NOTIFY_TEMPLATE_* pattern
      Object.values(NOTIFY_TEMPLATES).forEach((config) => {
        expect(config.templateIdEnvVar).toMatch(/^NOTIFY_TEMPLATE_/)
      })
    })

    test("AC-4.1: LeaseRequested template uses NOTIFY_TEMPLATE_LEASE_REQUESTED env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseRequested.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_LEASE_REQUESTED")
    })

    test("AC-4.1: LeaseApproved template uses NOTIFY_TEMPLATE_LEASE_APPROVED env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseApproved.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_LEASE_APPROVED")
    })

    test("AC-4.1: LeaseDenied template uses NOTIFY_TEMPLATE_LEASE_DENIED env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseDenied.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_LEASE_DENIED")
    })

    test("AC-4.1: LeaseTerminated template uses NOTIFY_TEMPLATE_LEASE_TERMINATED env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseTerminated.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_LEASE_TERMINATED")
    })
  })

  describe("getTemplateConfig", () => {
    test("AC-4.1: getTemplateConfig returns correct config for lease lifecycle events", () => {
      LEASE_LIFECYCLE_EVENTS.forEach((eventType) => {
        const config = getTemplateConfig(eventType)
        expect(config).toBeDefined()
        expect(config.templateIdEnvVar).toBeDefined()
        expect(config.requiredFields).toBeInstanceOf(Array)
        expect(config.optionalFields).toBeInstanceOf(Array)
      })
    })

    test("AC-4.1: getTemplateConfig throws PermanentError for unknown event type", () => {
      expect(() => getTemplateConfig("UnknownEvent" as any)).toThrow(PermanentError)
      expect(() => getTemplateConfig("UnknownEvent" as any)).toThrow("No template configuration for event type")
    })
  })

  describe("getTemplateId", () => {
    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    test("AC-4.1: getTemplateId returns template ID from environment variable", () => {
      process.env.NOTIFY_TEMPLATE_LEASE_REQUESTED = "template-123"
      const config = NOTIFY_TEMPLATES.LeaseRequested
      expect(getTemplateId(config)).toBe("template-123")
    })

    test("AC-4.8: getTemplateId throws PermanentError when env var is missing", () => {
      delete process.env.NOTIFY_TEMPLATE_LEASE_REQUESTED
      const config = NOTIFY_TEMPLATES.LeaseRequested
      expect(() => getTemplateId(config)).toThrow(PermanentError)
      expect(() => getTemplateId(config)).toThrow("Missing environment variable")
    })
  })
})

// =============================================================================
// Required Fields Tests (AC-4.2, AC-4.3, AC-4.5, AC-4.6, AC-4.8)
// =============================================================================

describe("Required Fields", () => {
  describe("LeaseRequested", () => {
    test("AC-4.2: LeaseRequested requires userName, templateName, requestTime", () => {
      const config = NOTIFY_TEMPLATES.LeaseRequested
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("templateName")
      expect(config.requiredFields).toContain("requestTime")
    })

    test("AC-4.2: LeaseRequested has comments as optional field", () => {
      const config = NOTIFY_TEMPLATES.LeaseRequested
      expect(config.optionalFields).toContain("comments")
    })
  })

  describe("LeaseApproved", () => {
    test("AC-4.3: LeaseApproved requires userName, accountId, expiryDate", () => {
      const config = NOTIFY_TEMPLATES.LeaseApproved
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("accountId")
      expect(config.requiredFields).toContain("expiryDate")
    })

    test("AC-4.3: LeaseApproved has budgetLimit and ssoUrl as optional fields", () => {
      const config = NOTIFY_TEMPLATES.LeaseApproved
      expect(config.optionalFields).toContain("budgetLimit")
      expect(config.optionalFields).toContain("ssoUrl")
    })
  })

  describe("LeaseDenied", () => {
    test("AC-4.5: LeaseDenied requires userName, templateName, reason, deniedBy", () => {
      const config = NOTIFY_TEMPLATES.LeaseDenied
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("templateName")
      expect(config.requiredFields).toContain("reason")
      expect(config.requiredFields).toContain("deniedBy")
    })
  })

  describe("LeaseTerminated", () => {
    test("AC-4.6: LeaseTerminated requires userName, accountId, reason, finalCost", () => {
      const config = NOTIFY_TEMPLATES.LeaseTerminated
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("accountId")
      expect(config.requiredFields).toContain("reason")
      expect(config.requiredFields).toContain("finalCost")
    })
  })

  describe("validateRequiredFields", () => {
    test("AC-4.8: Missing required personalisation throws PermanentError", () => {
      const config: TemplateConfig = {
        templateIdEnvVar: "TEST",
        requiredFields: ["userName", "email"],
        optionalFields: [],
        enrichmentQueries: [],
      }

      expect(() => validateRequiredFields({ userName: "test" }, config, "TestEvent")).toThrow(PermanentError)
      expect(() => validateRequiredFields({ userName: "test" }, config, "TestEvent")).toThrow(
        "Missing required personalisation fields: email",
      )
    })

    test("AC-4.8: PermanentError includes list of all missing fields", () => {
      const config: TemplateConfig = {
        templateIdEnvVar: "TEST",
        requiredFields: ["field1", "field2", "field3"],
        optionalFields: [],
        enrichmentQueries: [],
      }

      try {
        validateRequiredFields({}, config, "TestEvent")
        fail("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(PermanentError)
        expect((error as PermanentError).message).toContain("field1")
        expect((error as PermanentError).message).toContain("field2")
        expect((error as PermanentError).message).toContain("field3")
      }
    })

    test("AC-4.8: Validation passes when all required fields are present", () => {
      const config: TemplateConfig = {
        templateIdEnvVar: "TEST",
        requiredFields: ["userName", "email"],
        optionalFields: [],
        enrichmentQueries: [],
      }

      expect(() =>
        validateRequiredFields({ userName: "test", email: "test@example.com" }, config, "TestEvent"),
      ).not.toThrow()
    })
  })
})

// =============================================================================
// Optional Fields Tests (AC-4.9)
// =============================================================================

describe("Optional Fields", () => {
  test("AC-4.9: Optional personalisation fields default to empty string", () => {
    const config: TemplateConfig = {
      templateIdEnvVar: "TEST",
      requiredFields: ["userName"],
      optionalFields: ["comments", "notes"],
      enrichmentQueries: [],
    }

    const result = applyOptionalDefaults({ userName: "test" }, config)

    expect(result.comments).toBe("")
    expect(result.notes).toBe("")
    expect(result.userName).toBe("test")
  })

  test("AC-4.9: Optional fields with existing values are not overwritten", () => {
    const config: TemplateConfig = {
      templateIdEnvVar: "TEST",
      requiredFields: [],
      optionalFields: ["comments"],
      enrichmentQueries: [],
    }

    const result = applyOptionalDefaults({ comments: "Existing comment" }, config)

    expect(result.comments).toBe("Existing comment")
  })

  test("AC-4.9: Null optional fields are replaced with empty string", () => {
    const config: TemplateConfig = {
      templateIdEnvVar: "TEST",
      requiredFields: [],
      optionalFields: ["comments"],
      enrichmentQueries: [],
    }

    const result = applyOptionalDefaults({ comments: null as any }, config)

    expect(result.comments).toBe("")
  })
})

// =============================================================================
// Human-Readable Reason Tests (AC-4.7)
// =============================================================================

describe("Human-Readable Reason Mapping", () => {
  test("AC-4.7: BUDGET_EXCEEDED maps to human-readable message", () => {
    const reason = { type: "BudgetExceeded" as const }
    const result = getHumanReadableReason(reason)
    expect(result).toContain("budget limit was reached")
  })

  test("AC-4.7: Expired maps to human-readable message", () => {
    const reason = { type: "Expired" as const }
    const result = getHumanReadableReason(reason)
    expect(result).toContain("expired")
  })

  test("AC-4.7: ManuallyTerminated maps to human-readable message", () => {
    const reason = { type: "ManuallyTerminated" as const }
    const result = getHumanReadableReason(reason)
    expect(result).toContain("terminated by an administrator")
  })

  test("AC-4.7: UserRequested maps to human-readable message", () => {
    const reason = { type: "UserRequested" as const }
    const result = getHumanReadableReason(reason)
    expect(result).toContain("at your request")
  })

  test("AC-4.7: PolicyViolation maps to human-readable message", () => {
    const reason = { type: "PolicyViolation" as const }
    const result = getHumanReadableReason(reason)
    expect(result).toContain("policy violation")
  })

  test("AC-4.7: Unknown reason type returns default message", () => {
    const reason = { type: "UnknownReason" as any }
    const result = getHumanReadableReason(reason)
    expect(result).toContain("terminated")
  })

  test("AC-4.7: All defined termination reasons have mappings", () => {
    expect(TERMINATION_REASONS.Expired).toBeDefined()
    expect(TERMINATION_REASONS.BudgetExceeded).toBeDefined()
    expect(TERMINATION_REASONS.ManuallyTerminated).toBeDefined()
    expect(TERMINATION_REASONS.UserRequested).toBeDefined()
    expect(TERMINATION_REASONS.PolicyViolation).toBeDefined()
  })
})

// =============================================================================
// Portal Link Tests (AC-4.10, AC-4.11, AC-4.12, AC-4.25)
// =============================================================================

describe("Portal Link Generation", () => {
  test("AC-4.10: generatePortalLink creates authenticated link", () => {
    const link = generatePortalLink(mockLeaseKey, "view", mockSecret, mockPortalUrl)

    expect(link).toContain(mockPortalUrl)
    expect(link).toContain("/actions/view")
    expect(link).toContain("token=")
    expect(link).toContain("payload=")
  })

  test("AC-4.11: Portal link uses HMAC-SHA256 for token signing", () => {
    const link = generatePortalLink(mockLeaseKey, "view", mockSecret, mockPortalUrl)
    const url = new URL(link)
    const token = url.searchParams.get("token")
    const payload = url.searchParams.get("payload")

    expect(token).toBeDefined()
    expect(payload).toBeDefined()

    // Verify token is base64url encoded (HMAC output)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)

    // Decode payload and verify structure
    const decodedPayload = JSON.parse(Buffer.from(payload!, "base64url").toString())
    expect(decodedPayload.leaseKey).toEqual(mockLeaseKey)
    expect(decodedPayload.action).toBe("view")
  })

  test("AC-4.11: Token includes 15-minute expiry timestamp", () => {
    const before = Date.now()
    const link = generatePortalLink(mockLeaseKey, "view", mockSecret, mockPortalUrl)
    const after = Date.now()

    const url = new URL(link)
    const payload = url.searchParams.get("payload")
    const decodedPayload = JSON.parse(Buffer.from(payload!, "base64url").toString())

    const expectedExpiryMin = before + 15 * 60 * 1000
    const expectedExpiryMax = after + 15 * 60 * 1000

    expect(decodedPayload.exp).toBeGreaterThanOrEqual(expectedExpiryMin)
    expect(decodedPayload.exp).toBeLessThanOrEqual(expectedExpiryMax)
  })

  test("AC-4.12: Token includes audience claim matching leaseKey", () => {
    const link = generatePortalLink(mockLeaseKey, "view", mockSecret, mockPortalUrl)
    const url = new URL(link)
    const payload = url.searchParams.get("payload")
    const decodedPayload = JSON.parse(Buffer.from(payload!, "base64url").toString())

    const expectedAud = `${mockLeaseKey.userEmail}:${mockLeaseKey.uuid}`
    expect(decodedPayload.aud).toBe(expectedAud)
  })

  test("AC-4.25: Portal link includes utm_source=email parameter", () => {
    const link = generatePortalLink(mockLeaseKey, "view", mockSecret, mockPortalUrl)
    const url = new URL(link)
    expect(url.searchParams.get("utm_source")).toBe("email")
  })

  test("AC-4.25: Portal link includes utm_campaign parameter", () => {
    const viewLink = generatePortalLink(mockLeaseKey, "view", mockSecret, mockPortalUrl)
    const budgetLink = generatePortalLink(mockLeaseKey, "increase-budget", mockSecret, mockPortalUrl)

    const viewUrl = new URL(viewLink)
    const budgetUrl = new URL(budgetLink)

    expect(viewUrl.searchParams.get("utm_campaign")).toBe("lease-notification")
    expect(budgetUrl.searchParams.get("utm_campaign")).toBe("lease-budget")
  })

  test("AC-4.14: generateBudgetActionLink creates increase-budget action link", () => {
    const link = generateBudgetActionLink(mockLeaseKey, mockSecret, mockPortalUrl)

    expect(link).toContain("/actions/increase-budget")
    expect(link).toContain("token=")
  })

  test("AC-4.15: Budget action link URL encodes leaseId", () => {
    const leaseKeyWithSpecialChars: LeaseKey = {
      userEmail: "user+test@example.gov.uk",
      uuid: "123e4567-e89b-4456-a789-426614174000",
    }

    const link = generateBudgetActionLink(leaseKeyWithSpecialChars, mockSecret, mockPortalUrl)
    const url = new URL(link)

    // Verify URL is properly formed (no encoding errors)
    expect(url.toString()).toBeDefined()
    expect(url.searchParams.get("payload")).toBeDefined()
  })
})

// =============================================================================
// Link Fallback Tests (AC-4.18, AC-4.19)
// =============================================================================

describe("Link Fallback", () => {
  test("AC-4.18: getPlainTextLink returns simple fallback URL", () => {
    const link = getPlainTextLink(mockPortalUrl, mockLeaseKey)

    expect(link).toContain(mockPortalUrl)
    expect(link).toContain("/leases/")
    expect(link).toContain(mockLeaseKey.uuid)
    // Should NOT contain token (plain link for fallback)
    expect(link).not.toContain("token=")
  })

  test("AC-4.18: Plain text link URL encodes the UUID", () => {
    const leaseKeyWithSpecialUuid: LeaseKey = {
      userEmail: "test@example.gov.uk",
      uuid: "123e4567-e89b-4456-a789-426614174000",
    }

    const link = getPlainTextLink(mockPortalUrl, leaseKeyWithSpecialUuid)

    // Should be a valid URL
    expect(() => new URL(link)).not.toThrow()
  })

  test("AC-4.19: LINK_INSTRUCTIONS contains copy and paste guidance", () => {
    expect(LINK_INSTRUCTIONS).toContain("copy and paste")
    expect(LINK_INSTRUCTIONS).toContain("browser")
  })
})

// =============================================================================
// Personalisation Builder Tests
// =============================================================================

describe("Personalisation Builders", () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.PORTAL_LINK_SECRET = mockSecret
    process.env.PORTAL_URL = mockPortalUrl
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("buildLeaseRequestedPersonalisation", () => {
    test("AC-4.2: LeaseRequested includes userName, templateName, requestTime", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseRequested",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          templateName: "Development Sandbox",
          requestTime: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseRequestedPersonalisation(event)

      expect(result.userName).toBe("test.user")
      expect(result.templateName).toBe("Development Sandbox")
      expect(result.requestTime).toBe("2025-01-01T00:00:00Z")
    })

    test("AC-4.2: LeaseRequested extracts userName from email", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseRequested",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "john.doe@example.gov.uk",
          templateName: "Test",
          requestTime: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseRequestedPersonalisation(event)

      expect(result.userName).toBe("john.doe")
    })
  })

  describe("buildLeaseApprovedPersonalisation", () => {
    test("AC-4.3: LeaseApproved includes userName, accountId, ssoUrl, expiryDate", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseApproved",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          accountId: "123456789012",
          ssoUrl: "https://sso.example.gov.uk",
          expirationDate: "2025-01-08T00:00:00Z",
          maxSpend: 100,
          approvedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseApprovedPersonalisation(event)

      expect(result.userName).toBe("test.user")
      expect(result.accountId).toBe("123456789012")
      expect(result.ssoUrl).toBe("https://sso.example.gov.uk")
      // expiryDate is now formatted in UK locale (DD/MM/YYYY, HH:MM:SS)
      expect(result.expiryDate).toBe("08/01/2025, 00:00:00")
    })

    test("AC-4.4: LeaseApproved includes portal deep link", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseApproved",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          accountId: "123456789012",
          ssoUrl: "https://sso.example.gov.uk",
          expirationDate: "2025-01-08T00:00:00Z",
          maxSpend: 100,
          approvedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseApprovedPersonalisation(event)

      expect(result.portalLink).toContain(mockPortalUrl)
      expect(result.portalLink).toContain("/actions/view")
    })

    test("AC-4.14: LeaseApproved includes budgetActionLink", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseApproved",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          accountId: "123456789012",
          ssoUrl: "https://sso.example.gov.uk",
          expirationDate: "2025-01-08T00:00:00Z",
          maxSpend: 100,
          approvedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseApprovedPersonalisation(event)

      expect(result.budgetActionLink).toContain("/actions/increase-budget")
    })

    test("AC-4.18: LeaseApproved includes plainTextLink fallback", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseApproved",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          accountId: "123456789012",
          ssoUrl: "https://sso.example.gov.uk",
          expirationDate: "2025-01-08T00:00:00Z",
          maxSpend: 100,
          approvedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseApprovedPersonalisation(event)

      expect(result.plainTextLink).toBeDefined()
      expect(result.plainTextLink).toContain("/leases/")
    })

    test("AC-4.19: LeaseApproved includes linkInstructions", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseApproved",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          accountId: "123456789012",
          ssoUrl: "https://sso.example.gov.uk",
          expirationDate: "2025-01-08T00:00:00Z",
          maxSpend: 100,
          approvedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseApprovedPersonalisation(event)

      expect(result.linkInstructions).toContain("copy and paste")
    })
  })

  describe("buildLeaseDeniedPersonalisation", () => {
    test("AC-4.5: LeaseDenied includes userName, templateName, reason, deniedBy", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseDenied",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          templateName: "Production Sandbox",
          reason: "Budget constraints",
          deniedBy: "admin@example.gov.uk",
          deniedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseDeniedPersonalisation(event)

      expect(result.userName).toBe("test.user")
      expect(result.templateName).toBe("Production Sandbox")
      expect(result.reason).toBe("Budget constraints")
      expect(result.deniedBy).toBe("admin@example.gov.uk")
    })

    test("AC-4.5: LeaseDenied uses Administrator as default deniedBy", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseDenied",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          reason: "Policy violation",
          deniedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseDeniedPersonalisation(event)

      expect(result.deniedBy).toBe("Administrator")
    })
  })

  describe("buildLeaseTerminatedPersonalisation", () => {
    test("AC-4.6: LeaseTerminated includes userName, accountId, reason, finalCost", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseTerminated",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          accountId: "123456789012",
          reason: { type: "Expired" },
          totalCostAccrued: 45.5,
          terminatedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseTerminatedPersonalisation(event)

      expect(result.userName).toBe("test.user")
      expect(result.accountId).toBe("123456789012")
      expect(result.reason).toContain("expired")
      expect(result.finalCost).toBe(45.5)
    })

    test("AC-4.7: LeaseTerminated maps reason to human-readable text", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseTerminated",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          accountId: "123456789012",
          reason: { type: "BudgetExceeded" },
          totalCostAccrued: 100,
          terminatedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseTerminatedPersonalisation(event)

      expect(result.reason).not.toBe("BudgetExceeded")
      expect(result.reason).toContain("budget limit was reached")
    })

    test("AC-4.6: LeaseTerminated defaults finalCost to 0 when not provided", () => {
      const event: ValidatedEvent<any> = {
        eventType: "LeaseTerminated",
        eventId: "event-123",
        source: "innovation-sandbox",
        timestamp: "2025-01-01T00:00:00Z",
        detail: {
          leaseId: mockLeaseKey,
          userEmail: "test.user@example.gov.uk",
          accountId: "123456789012",
          reason: { type: "Expired" },
          terminatedAt: "2025-01-01T00:00:00Z",
        },
      }

      const result = buildLeaseTerminatedPersonalisation(event)

      expect(result.finalCost).toBe(0)
    })
  })
})

// =============================================================================
// Main buildPersonalisation Tests
// =============================================================================

describe("buildPersonalisation", () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.PORTAL_LINK_SECRET = mockSecret
    process.env.PORTAL_URL = mockPortalUrl
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test("AC-4.1: Dispatches to correct builder based on event type", () => {
    const leaseRequestedEvent: ValidatedEvent<any> = {
      eventType: "LeaseRequested",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T00:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test@example.gov.uk",
        templateName: "Test",
        requestTime: "2025-01-01T00:00:00Z",
      },
    }

    const result = buildPersonalisation(leaseRequestedEvent)

    expect(result.templateName).toBe("Test")
    expect(result.requestTime).toBe("2025-01-01T00:00:00Z")
  })

  test("AC-4.8: Throws PermanentError for unsupported event types", () => {
    const unsupportedEvent: ValidatedEvent<any> = {
      eventType: "AccountCleanupFailed" as any,
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T00:00:00Z",
      detail: {},
    }

    expect(() => buildPersonalisation(unsupportedEvent)).toThrow(PermanentError)
    expect(() => buildPersonalisation(unsupportedEvent)).toThrow(
      "No template configuration for event type: AccountCleanupFailed",
    )
  })

  test("AC-4.9: Applies optional defaults after building", () => {
    const event: ValidatedEvent<any> = {
      eventType: "LeaseRequested",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T00:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test@example.gov.uk",
        templateName: "Test",
        requestTime: "2025-01-01T00:00:00Z",
      },
    }

    const result = buildPersonalisation(event)

    // comments is optional and should default to empty string
    expect(result.comments).toBe("")
  })
})

// =============================================================================
// isLeaseLifecycleEvent Tests
// =============================================================================

describe("isLeaseLifecycleEvent", () => {
  test("Returns true for lease lifecycle events", () => {
    expect(isLeaseLifecycleEvent("LeaseRequested")).toBe(true)
    expect(isLeaseLifecycleEvent("LeaseApproved")).toBe(true)
    expect(isLeaseLifecycleEvent("LeaseDenied")).toBe(true)
    expect(isLeaseLifecycleEvent("LeaseTerminated")).toBe(true)
  })

  test("Returns false for non-lease-lifecycle events", () => {
    expect(isLeaseLifecycleEvent("LeaseBudgetThresholdAlert")).toBe(false)
    expect(isLeaseLifecycleEvent("AccountCleanupFailed")).toBe(false)
    expect(isLeaseLifecycleEvent("AccountQuarantined")).toBe(false)
  })
})

// =============================================================================
// Portal Link Without Config Tests
// =============================================================================

describe("Portal Links Without Configuration", () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.PORTAL_LINK_SECRET
    delete process.env.PORTAL_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test("AC-4.10: Portal links omitted when PORTAL_LINK_SECRET is not set", () => {
    const event: ValidatedEvent<any> = {
      eventType: "LeaseApproved",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T00:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test@example.gov.uk",
        accountId: "123456789012",
        ssoUrl: "https://sso.example.gov.uk",
        expirationDate: "2025-01-08T00:00:00Z",
        maxSpend: 100,
        approvedAt: "2025-01-01T00:00:00Z",
      },
    }

    const result = buildLeaseApprovedPersonalisation(event)

    // Portal link should not be set when config is missing
    expect(result.portalLink).toBeUndefined()
    expect(result.budgetActionLink).toBeUndefined()
  })
})

// =============================================================================
// N5.5 - Monitoring Alert Email Templates
// =============================================================================

// =============================================================================
// Monitoring Template Registry Tests (AC-5.1 to AC-5.7)
// =============================================================================

describe("Monitoring Alert Template Registry", () => {
  describe("LeaseBudgetThresholdAlert", () => {
    test("AC-5.1: Template uses NOTIFY_TEMPLATE_BUDGET_THRESHOLD env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseBudgetThresholdAlert.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_BUDGET_THRESHOLD")
    })

    test("AC-5.1: Template requires userName, currentSpend, budgetLimit, percentUsed", () => {
      const config = NOTIFY_TEMPLATES.LeaseBudgetThresholdAlert
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("currentSpend")
      expect(config.requiredFields).toContain("budgetLimit")
      expect(config.requiredFields).toContain("percentUsed")
    })
  })

  describe("LeaseDurationThresholdAlert", () => {
    test("AC-5.2: Template uses NOTIFY_TEMPLATE_DURATION_THRESHOLD env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseDurationThresholdAlert.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_DURATION_THRESHOLD")
    })

    test("AC-5.2: Template requires userName, hoursRemaining, expiryDate", () => {
      const config = NOTIFY_TEMPLATES.LeaseDurationThresholdAlert
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("hoursRemaining")
      expect(config.requiredFields).toContain("expiryDate")
    })

    test("AC-5.2: Template has timezone as optional field", () => {
      const config = NOTIFY_TEMPLATES.LeaseDurationThresholdAlert
      expect(config.optionalFields).toContain("timezone")
    })
  })

  describe("LeaseFreezingThresholdAlert", () => {
    test("AC-5.4: Template uses NOTIFY_TEMPLATE_FREEZING_THRESHOLD env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseFreezingThresholdAlert.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_FREEZING_THRESHOLD")
    })

    test("AC-5.4: Template requires userName, reason, freezeTime", () => {
      const config = NOTIFY_TEMPLATES.LeaseFreezingThresholdAlert
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("reason")
      expect(config.requiredFields).toContain("freezeTime")
    })
  })

  describe("LeaseBudgetExceeded", () => {
    test("AC-5.5: Template uses NOTIFY_TEMPLATE_BUDGET_EXCEEDED env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseBudgetExceeded.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_BUDGET_EXCEEDED")
    })

    test("AC-5.5: Template requires userName, finalSpend, budgetLimit", () => {
      const config = NOTIFY_TEMPLATES.LeaseBudgetExceeded
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("finalSpend")
      expect(config.requiredFields).toContain("budgetLimit")
    })
  })

  describe("LeaseExpired", () => {
    test("AC-5.6: Template uses NOTIFY_TEMPLATE_LEASE_EXPIRED env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseExpired.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_LEASE_EXPIRED")
    })

    test("AC-5.6: Template requires userName, accountId, expiryTime", () => {
      const config = NOTIFY_TEMPLATES.LeaseExpired
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("accountId")
      expect(config.requiredFields).toContain("expiryTime")
    })
  })

  describe("LeaseFrozen", () => {
    test("AC-5.7: Template uses NOTIFY_TEMPLATE_LEASE_FROZEN env var", () => {
      expect(NOTIFY_TEMPLATES.LeaseFrozen.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_LEASE_FROZEN")
    })

    test("AC-5.7: Template requires userName, accountId, reason, resumeInstructions", () => {
      const config = NOTIFY_TEMPLATES.LeaseFrozen
      expect(config.requiredFields).toContain("userName")
      expect(config.requiredFields).toContain("accountId")
      expect(config.requiredFields).toContain("reason")
      expect(config.requiredFields).toContain("resumeInstructions")
    })
  })

  describe("getTemplateConfig for monitoring alerts", () => {
    test("AC-5.1: getTemplateConfig returns config for monitoring alert events", () => {
      MONITORING_ALERT_EVENTS.forEach((eventType) => {
        const config = getTemplateConfig(eventType)
        expect(config).toBeDefined()
        expect(config.templateIdEnvVar).toBeDefined()
        expect(config.requiredFields).toBeInstanceOf(Array)
      })
    })
  })
})

// =============================================================================
// Formatting Utilities Tests (AC-5.8, AC-5.9, AC-5.10)
// =============================================================================

describe("Formatting Utilities", () => {
  describe("formatCurrency", () => {
    // Note: formatCurrency uses USD ($) as AWS costs are in USD
    test("AC-5.8: Formats currency with USD symbol ($)", () => {
      expect(formatCurrency(123.45)).toBe("$123.45")
    })

    test("AC-5.8: Formats with two decimal places", () => {
      expect(formatCurrency(0.99)).toBe("$0.99")
      expect(formatCurrency(100)).toBe("$100.00")
    })

    test("AC-5.8: Includes thousands separator", () => {
      expect(formatCurrency(1234.56)).toBe("$1,234.56")
      expect(formatCurrency(1000000)).toBe("$1,000,000.00")
    })

    test("AC-5.8: Handles zero correctly", () => {
      expect(formatCurrency(0)).toBe("$0.00")
    })

    test("AC-5.8: Rounds to two decimal places", () => {
      expect(formatCurrency(123.456)).toBe("$123.46")
      expect(formatCurrency(99.999)).toBe("$100.00")
    })
  })

  describe("formatUKDate", () => {
    test("AC-5.9: Formats date in UK format (DD MMM YYYY, HH:MM)", () => {
      // Using a fixed UTC date to ensure consistent test results
      const result = formatUKDate("2024-03-15T14:30:00Z", "UTC")
      expect(result).toBe("15/03/2024, 14:30:00")
    })

    test("AC-5.9: Handles Date object input", () => {
      const date = new Date("2024-12-25T09:00:00Z")
      const result = formatUKDate(date, "UTC")
      expect(result).toBe("25/12/2024, 09:00:00")
    })

    test("AC-5.3: Defaults to Europe/London timezone", () => {
      expect(DEFAULT_TIMEZONE).toBe("Europe/London")
    })

    test("AC-5.3: Uses Europe/London as default when timezone not specified", () => {
      // During UK summer time (BST), UTC+1
      const summerDate = formatUKDate("2024-07-15T12:00:00Z")
      // During UK winter time (GMT), UTC+0
      const winterDate = formatUKDate("2024-01-15T12:00:00Z")

      // Both should be formatted, just with different local times
      expect(summerDate).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/)
      expect(winterDate).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/)
    })

    test("AC-5.9: Respects provided timezone", () => {
      // Same UTC time, different timezones
      const utcResult = formatUKDate("2024-03-15T12:00:00Z", "UTC")
      expect(utcResult).toContain("12:00")
    })
  })

  describe("formatPercentage", () => {
    test("AC-5.10: Formats percentage with % symbol", () => {
      expect(formatPercentage(75)).toBe("75%")
    })

    test("AC-5.10: Handles decimal percentages", () => {
      expect(formatPercentage(75.5)).toBe("75.5%")
    })

    test("AC-5.10: Handles 100%", () => {
      expect(formatPercentage(100)).toBe("100%")
    })

    test("AC-5.10: Handles zero percent", () => {
      expect(formatPercentage(0)).toBe("0%")
    })

    test("AC-5.10: Rounds to one decimal place for non-integers", () => {
      expect(formatPercentage(33.333)).toBe("33.3%")
    })
  })

  describe("getBudgetDisclaimer", () => {
    test('AC-5.12: Includes "Budget data as of" text', () => {
      const result = getBudgetDisclaimer("2024-03-15T14:30:00Z")
      expect(result).toContain("Budget data as of")
    })

    test("AC-5.12: Includes formatted timestamp", () => {
      const result = getBudgetDisclaimer("2024-03-15T14:30:00Z")
      expect(result).toMatch(/Budget data as of \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/)
    })
  })
})

// =============================================================================
// Freeze Reason Mapping Tests (AC-5.7)
// =============================================================================

describe("Freeze Reason Mapping", () => {
  test("AC-5.7: FREEZE_REASONS has all defined mappings", () => {
    expect(FREEZE_REASONS.Expired).toBeDefined()
    expect(FREEZE_REASONS.BudgetExceeded).toBeDefined()
    expect(FREEZE_REASONS.ManuallyFrozen).toBeDefined()
  })

  test("AC-5.7: getHumanReadableFreezeReason maps Expired", () => {
    const result = getHumanReadableFreezeReason({ type: "Expired" })
    expect(result).toContain("time limit")
  })

  test("AC-5.7: getHumanReadableFreezeReason maps BudgetExceeded", () => {
    const result = getHumanReadableFreezeReason({ type: "BudgetExceeded" })
    expect(result).toContain("budget limit")
  })

  test("AC-5.7: getHumanReadableFreezeReason maps ManuallyFrozen", () => {
    const result = getHumanReadableFreezeReason({ type: "ManuallyFrozen" })
    expect(result).toContain("administrator")
  })

  test("AC-5.7: getHumanReadableFreezeReason returns default for unknown", () => {
    const result = getHumanReadableFreezeReason({ type: "UnknownReason" as any })
    expect(result).toContain("frozen")
  })

  test("AC-5.7: RESUME_INSTRUCTIONS has all defined mappings", () => {
    expect(RESUME_INSTRUCTIONS.Expired).toBeDefined()
    expect(RESUME_INSTRUCTIONS.BudgetExceeded).toBeDefined()
    expect(RESUME_INSTRUCTIONS.ManuallyFrozen).toBeDefined()
  })

  test("AC-5.7: getResumeInstructions returns appropriate instructions", () => {
    expect(getResumeInstructions({ type: "Expired" })).toContain("request a new")
    expect(getResumeInstructions({ type: "BudgetExceeded" })).toContain("contact")
    expect(getResumeInstructions({ type: "ManuallyFrozen" })).toContain("contact")
  })

  test("AC-5.7: getResumeInstructions returns default for unknown", () => {
    const result = getResumeInstructions({ type: "UnknownReason" as any })
    expect(result).toContain("contact")
  })
})

// =============================================================================
// Enrichment Data Handling Tests (AC-5.11 to AC-5.15)
// =============================================================================

describe("Enrichment Data Handling", () => {
  describe("detectEnrichmentConflict", () => {
    test("AC-5.13: Detects conflict when enriched status contradicts event type", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2024-01-01T00:00:00Z",
        _internalStatus: "Approved", // Contradicts LeaseDenied
      }

      const result = detectEnrichmentConflict("LeaseDenied", enrichedData)
      expect(result).toBe(true)
    })

    test("AC-5.13: No conflict when enriched status matches event type", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2024-01-01T00:00:00Z",
        _internalStatus: "Approved",
      }

      const result = detectEnrichmentConflict("LeaseApproved", enrichedData)
      expect(result).toBe(false)
    })

    test("AC-5.13: No conflict when _internalStatus is not set", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2024-01-01T00:00:00Z",
      }

      const result = detectEnrichmentConflict("LeaseApproved", enrichedData)
      expect(result).toBe(false)
    })

    test("AC-5.13: No conflict check for events without expected status mapping", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2024-01-01T00:00:00Z",
        _internalStatus: "Pending",
      }

      const result = detectEnrichmentConflict("LeaseRequested", enrichedData)
      expect(result).toBe(false)
    })
  })

  describe("getBudgetDiscrepancy", () => {
    test("AC-5.11: Returns enriched value when different from event", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2024-01-01T00:00:00Z",
        maxSpend: 200,
      }

      const result = getBudgetDiscrepancy(100, enrichedData)
      expect(result).toBe("$200.00")
    })

    test("AC-5.11: Returns undefined when values are the same", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2024-01-01T00:00:00Z",
        maxSpend: 100,
      }

      const result = getBudgetDiscrepancy(100, enrichedData)
      expect(result).toBeUndefined()
    })

    test("AC-5.11: Returns undefined when enrichedData is not provided", () => {
      const result = getBudgetDiscrepancy(100)
      expect(result).toBeUndefined()
    })

    test("AC-5.11: Returns undefined when maxSpend is not in enrichedData", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2024-01-01T00:00:00Z",
      }

      const result = getBudgetDiscrepancy(100, enrichedData)
      expect(result).toBeUndefined()
    })

    test("AC-5.11: Ignores differences less than $0.01", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2024-01-01T00:00:00Z",
        maxSpend: 100.005,
      }

      const result = getBudgetDiscrepancy(100, enrichedData)
      expect(result).toBeUndefined()
    })
  })
})

// =============================================================================
// Monitoring Alert Personalisation Builder Tests
// =============================================================================

describe("Monitoring Alert Personalisation Builders", () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.PORTAL_LINK_SECRET = mockSecret
    process.env.PORTAL_URL = mockPortalUrl
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("buildBudgetThresholdPersonalisation", () => {
    const mockBudgetThresholdEvent: ValidatedEvent<any> = {
      eventType: "LeaseBudgetThresholdAlert",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test.user@example.gov.uk",
        currentSpend: 75.5,
        budgetLimit: 100,
        thresholdPercent: 75.5,
      },
    }

    test("AC-5.1: Includes userName, currentSpend, budgetLimit, percentUsed", () => {
      const result = buildBudgetThresholdPersonalisation(mockBudgetThresholdEvent)

      expect(result.userName).toBe("test.user")
      expect(result.currentSpend).toBe("$75.50")
      expect(result.budgetLimit).toBe("$100.00")
      expect(result.percentUsed).toBe("75.5%")
    })

    test("AC-5.8: Formats currentSpend with USD symbol", () => {
      const result = buildBudgetThresholdPersonalisation(mockBudgetThresholdEvent)
      expect(result.currentSpend).toMatch(/^\$\d/)
    })

    test("AC-5.10: Formats percentUsed with % symbol", () => {
      const result = buildBudgetThresholdPersonalisation(mockBudgetThresholdEvent)
      expect(result.percentUsed).toMatch(/%$/)
    })

    test("AC-5.12: Includes budget disclaimer with timestamp", () => {
      const result = buildBudgetThresholdPersonalisation(mockBudgetThresholdEvent)
      expect(result.budgetDisclaimer).toContain("Budget data as of")
    })

    test("AC-5.11: Includes enriched maxSpend when different from event", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2025-01-01T12:00:00Z",
        maxSpend: 150,
      }

      const result = buildBudgetThresholdPersonalisation(mockBudgetThresholdEvent, enrichedData)
      expect(result.enrichedMaxSpend).toBe("$150.00")
    })

    test("AC-5.11: Does not include enrichedMaxSpend when values are same", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2025-01-01T12:00:00Z",
        maxSpend: 100,
      }

      const result = buildBudgetThresholdPersonalisation(mockBudgetThresholdEvent, enrichedData)
      expect(result.enrichedMaxSpend).toBeUndefined()
    })
  })

  describe("buildDurationThresholdPersonalisation", () => {
    const mockDurationThresholdEvent: ValidatedEvent<any> = {
      eventType: "LeaseDurationThresholdAlert",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test.user@example.gov.uk",
        hoursRemaining: 24.5,
        expirationDate: "2025-01-02T12:30:00Z",
      },
    }

    test("AC-5.2: Includes userName, hoursRemaining, expiryDate, timezone", () => {
      const result = buildDurationThresholdPersonalisation(mockDurationThresholdEvent)

      expect(result.userName).toBe("test.user")
      expect(result.hoursRemaining).toBe(25) // Rounded
      expect(result.expiryDate).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/)
      expect(result.timezone).toBeDefined()
    })

    test("AC-5.3: Defaults timezone to Europe/London", () => {
      const result = buildDurationThresholdPersonalisation(mockDurationThresholdEvent)
      expect(result.timezone).toBe("Europe/London")
    })

    test("AC-5.3: Uses enriched userTimezone when provided", () => {
      const enrichedData: EnrichedData = {
        enrichedAt: "2025-01-01T12:00:00Z",
        userTimezone: "America/New_York",
      }

      const result = buildDurationThresholdPersonalisation(mockDurationThresholdEvent, enrichedData)
      expect(result.timezone).toBe("America/New_York")
    })

    test("AC-5.9: Formats expiryDate in UK format", () => {
      const result = buildDurationThresholdPersonalisation(mockDurationThresholdEvent)
      expect(result.expiryDate).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/)
    })
  })

  describe("buildFreezingThresholdPersonalisation", () => {
    const mockFreezingThresholdEvent: ValidatedEvent<any> = {
      eventType: "LeaseFreezingThresholdAlert",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test.user@example.gov.uk",
        reason: "Budget threshold exceeded",
        freezeTime: "2025-01-02T00:00:00Z",
      },
    }

    test("AC-5.4: Includes userName, reason, freezeTime", () => {
      const result = buildFreezingThresholdPersonalisation(mockFreezingThresholdEvent)

      expect(result.userName).toBe("test.user")
      expect(result.reason).toBe("Budget threshold exceeded")
      expect(result.freezeTime).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/)
    })

    test("AC-5.9: Formats freezeTime in UK format", () => {
      const result = buildFreezingThresholdPersonalisation(mockFreezingThresholdEvent)
      expect(result.freezeTime).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/)
    })
  })

  describe("buildBudgetExceededPersonalisation", () => {
    const mockBudgetExceededEvent: ValidatedEvent<any> = {
      eventType: "LeaseBudgetExceeded",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test.user@example.gov.uk",
        currentSpend: 105.5,
        budgetLimit: 100,
      },
    }

    test("AC-5.5: Includes userName, finalSpend, budgetLimit", () => {
      const result = buildBudgetExceededPersonalisation(mockBudgetExceededEvent)

      expect(result.userName).toBe("test.user")
      expect(result.finalSpend).toBe("$105.50")
      expect(result.budgetLimit).toBe("$100.00")
    })

    test("AC-5.8: Formats finalSpend with USD symbol", () => {
      const result = buildBudgetExceededPersonalisation(mockBudgetExceededEvent)
      expect(result.finalSpend).toMatch(/^\$\d/)
    })

    test("AC-5.12: Includes budget disclaimer", () => {
      const result = buildBudgetExceededPersonalisation(mockBudgetExceededEvent)
      expect(result.budgetDisclaimer).toContain("Budget data as of")
    })
  })

  describe("buildLeaseExpiredPersonalisation", () => {
    const mockLeaseExpiredEvent: ValidatedEvent<any> = {
      eventType: "LeaseExpired",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test.user@example.gov.uk",
        accountId: "123456789012",
        expiredAt: "2025-01-01T12:00:00Z",
      },
    }

    test("AC-5.6: Includes userName, accountId, expiryTime", () => {
      const result = buildLeaseExpiredPersonalisation(mockLeaseExpiredEvent)

      expect(result.userName).toBe("test.user")
      expect(result.accountId).toBe("123456789012")
      expect(result.expiryTime).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/)
    })

    test("AC-5.9: Formats expiryTime in UK format", () => {
      const result = buildLeaseExpiredPersonalisation(mockLeaseExpiredEvent)
      expect(result.expiryTime).toMatch(/\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}/)
    })
  })

  describe("buildLeaseFrozenPersonalisation", () => {
    const mockLeaseFrozenEvent: ValidatedEvent<any> = {
      eventType: "LeaseFrozen",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test.user@example.gov.uk",
        accountId: "123456789012",
        reason: { type: "BudgetExceeded" },
      },
    }

    test("AC-5.7: Includes userName, accountId, reason, resumeInstructions", () => {
      const result = buildLeaseFrozenPersonalisation(mockLeaseFrozenEvent)

      expect(result.userName).toBe("test.user")
      expect(result.accountId).toBe("123456789012")
      expect(result.reason).toContain("budget limit")
      expect(result.resumeInstructions).toBeDefined()
      expect(typeof result.resumeInstructions).toBe("string")
    })

    test("AC-5.7: Maps reason to human-readable text", () => {
      const result = buildLeaseFrozenPersonalisation(mockLeaseFrozenEvent)
      expect(result.reason).not.toBe("BudgetExceeded")
      expect(result.reason).toContain("budget")
    })

    test("AC-5.7: Includes appropriate resume instructions", () => {
      const result = buildLeaseFrozenPersonalisation(mockLeaseFrozenEvent)
      expect(result.resumeInstructions).toContain("contact")
    })
  })
})

// =============================================================================
// isMonitoringAlertEvent Tests
// =============================================================================

describe("isMonitoringAlertEvent", () => {
  test("Returns true for monitoring alert events", () => {
    expect(isMonitoringAlertEvent("LeaseBudgetThresholdAlert")).toBe(true)
    expect(isMonitoringAlertEvent("LeaseDurationThresholdAlert")).toBe(true)
    expect(isMonitoringAlertEvent("LeaseFreezingThresholdAlert")).toBe(true)
    expect(isMonitoringAlertEvent("LeaseBudgetExceeded")).toBe(true)
    expect(isMonitoringAlertEvent("LeaseExpired")).toBe(true)
    expect(isMonitoringAlertEvent("LeaseFrozen")).toBe(true)
  })

  test("Returns false for lease lifecycle events", () => {
    expect(isMonitoringAlertEvent("LeaseRequested")).toBe(false)
    expect(isMonitoringAlertEvent("LeaseApproved")).toBe(false)
    expect(isMonitoringAlertEvent("LeaseDenied")).toBe(false)
    expect(isMonitoringAlertEvent("LeaseTerminated")).toBe(false)
  })

  test("Returns false for other event types", () => {
    expect(isMonitoringAlertEvent("AccountCleanupFailed")).toBe(false)
    expect(isMonitoringAlertEvent("AccountQuarantined")).toBe(false)
  })
})

// =============================================================================
// buildPersonalisation with Monitoring Events Tests
// =============================================================================

describe("buildPersonalisation with Monitoring Events", () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.PORTAL_LINK_SECRET = mockSecret
    process.env.PORTAL_URL = mockPortalUrl
  })

  afterEach(() => {
    process.env = originalEnv
  })

  test("AC-5.1: Dispatches LeaseBudgetThresholdAlert to correct builder", () => {
    const event: ValidatedEvent<any> = {
      eventType: "LeaseBudgetThresholdAlert",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test@example.gov.uk",
        currentSpend: 75,
        budgetLimit: 100,
        thresholdPercent: 75,
      },
    }

    const result = buildPersonalisation(event)

    expect(result.currentSpend).toBe("$75.00")
    expect(result.percentUsed).toBe("75%")
  })

  test("AC-5.2: Dispatches LeaseDurationThresholdAlert to correct builder", () => {
    const event: ValidatedEvent<any> = {
      eventType: "LeaseDurationThresholdAlert",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test@example.gov.uk",
        hoursRemaining: 24,
        expirationDate: "2025-01-02T12:00:00Z",
      },
    }

    const result = buildPersonalisation(event)

    expect(result.hoursRemaining).toBe(24)
    expect(result.timezone).toBe("Europe/London")
  })

  test("AC-5.5: Dispatches LeaseBudgetExceeded to correct builder", () => {
    const event: ValidatedEvent<any> = {
      eventType: "LeaseBudgetExceeded",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test@example.gov.uk",
        currentSpend: 105,
        budgetLimit: 100,
      },
    }

    const result = buildPersonalisation(event)

    expect(result.finalSpend).toBe("$105.00")
    expect(result.budgetLimit).toBe("$100.00")
  })

  test("AC-5.7: Dispatches LeaseFrozen to correct builder", () => {
    const event: ValidatedEvent<any> = {
      eventType: "LeaseFrozen",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test@example.gov.uk",
        accountId: "123456789012",
        reason: { type: "Expired" },
      },
    }

    const result = buildPersonalisation(event)

    expect(result.reason).toContain("time limit")
    expect(result.resumeInstructions).toBeDefined()
  })

  test("AC-5.14: Event data takes precedence (enrichedData passed correctly)", () => {
    const event: ValidatedEvent<any> = {
      eventType: "LeaseBudgetThresholdAlert",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test@example.gov.uk",
        currentSpend: 75,
        budgetLimit: 100,
        thresholdPercent: 75,
      },
    }

    const enrichedData: EnrichedData = {
      enrichedAt: "2025-01-01T12:00:00Z",
      maxSpend: 150,
    }

    const result = buildPersonalisation(event, enrichedData)

    // Event budgetLimit should be used, not enriched maxSpend
    expect(result.budgetLimit).toBe("$100.00")
    // But enrichedMaxSpend should be included since it differs
    expect(result.enrichedMaxSpend).toBe("$150.00")
  })

  test("AC-5.15: enriched.status never appears in personalisation", () => {
    const event: ValidatedEvent<any> = {
      eventType: "LeaseBudgetThresholdAlert",
      eventId: "event-123",
      source: "innovation-sandbox",
      timestamp: "2025-01-01T12:00:00Z",
      detail: {
        leaseId: mockLeaseKey,
        userEmail: "test@example.gov.uk",
        currentSpend: 75,
        budgetLimit: 100,
        thresholdPercent: 75,
      },
    }

    const enrichedData: EnrichedData = {
      enrichedAt: "2025-01-01T12:00:00Z",
      _internalStatus: "Active", // Should never appear in output
    }

    const result = buildPersonalisation(event, enrichedData)

    // Verify _internalStatus is not in the result
    expect(result._internalStatus).toBeUndefined()
    expect(result.status).toBeUndefined()
    expect(Object.values(result)).not.toContain("Active")
  })
})

// =============================================================================
// Billing Events Tests (LeaseCostsGenerated)
// =============================================================================

describe("formatUKDateLong", () => {
  test("Formats date in long UK format with weekday", () => {
    // Tuesday, 10 February 2026 at 14:30 UTC
    const result = formatUKDateLong("2026-02-10T14:30:00Z", "UTC")
    expect(result).toBe("Tuesday, 10 February 2026 at 14:30")
  })

  test("Handles Date object input", () => {
    const date = new Date("2026-12-25T09:00:00Z")
    const result = formatUKDateLong(date, "UTC")
    expect(result).toContain("December 2026")
    expect(result).toContain("09:00")
  })

  test("Defaults to Europe/London timezone", () => {
    // During UK summer time (BST), UTC+1
    const summerDate = formatUKDateLong("2026-07-15T12:00:00Z")
    // Should be formatted, with day of week and month name (format: "Wednesday, 15 July 2026 at 13:00")
    expect(summerDate).toMatch(/\w+, \d+ \w+ \d{4} at \d{2}:\d{2}/)
  })

  test("Does not include seconds", () => {
    const result = formatUKDateLong("2026-02-10T14:30:45Z", "UTC")
    // Should NOT contain :45 seconds
    expect(result).not.toContain(":45")
    expect(result).toContain("14:30")
  })
})

describe("isBillingEvent", () => {
  test("Returns true for LeaseCostsGenerated", () => {
    expect(isBillingEvent("LeaseCostsGenerated")).toBe(true)
  })

  test("Returns false for lease lifecycle events", () => {
    expect(isBillingEvent("LeaseRequested")).toBe(false)
    expect(isBillingEvent("LeaseApproved")).toBe(false)
    expect(isBillingEvent("LeaseTerminated")).toBe(false)
  })

  test("Returns false for monitoring alert events", () => {
    expect(isBillingEvent("LeaseBudgetThresholdAlert")).toBe(false)
    expect(isBillingEvent("LeaseExpired")).toBe(false)
  })

  test("BILLING_EVENTS array includes LeaseCostsGenerated", () => {
    expect(BILLING_EVENTS).toContain("LeaseCostsGenerated")
  })
})

describe("LeaseCostsGenerated Template Configuration", () => {
  test("Template uses NOTIFY_TEMPLATE_LEASE_COSTS_GENERATED env var", () => {
    expect(NOTIFY_TEMPLATES.LeaseCostsGenerated.templateIdEnvVar).toBe("NOTIFY_TEMPLATE_LEASE_COSTS_GENERATED")
  })

  test("Template requires userName, templateName, totalCost, startDate, endDate, csvUrl, urlExpiresAt", () => {
    const config = NOTIFY_TEMPLATES.LeaseCostsGenerated
    expect(config.requiredFields).toContain("userName")
    expect(config.requiredFields).toContain("templateName")
    expect(config.requiredFields).toContain("totalCost")
    expect(config.requiredFields).toContain("startDate")
    expect(config.requiredFields).toContain("endDate")
    expect(config.requiredFields).toContain("csvUrl")
    expect(config.requiredFields).toContain("urlExpiresAt")
  })

  test("Template has no optional fields", () => {
    const config = NOTIFY_TEMPLATES.LeaseCostsGenerated
    expect(config.optionalFields).toEqual([])
  })

  test("Template requires lease enrichment for templateName", () => {
    const config = NOTIFY_TEMPLATES.LeaseCostsGenerated
    expect(config.enrichmentQueries).toContain("lease")
  })
})

describe("buildLeaseCostsGeneratedPersonalisation", () => {
  const mockLeaseCostsEvent: ValidatedEvent<any> = {
    eventType: "LeaseCostsGenerated",
    eventId: "event-123",
    source: "isb-costs",
    timestamp: "2026-02-03T12:00:00Z",
    detail: {
      leaseId: "550e8400-e29b-41d4-a716-446655440000",
      userEmail: "test.user@example.gov.uk",
      accountId: "123456789012",
      totalCost: 45.67,
      currency: "USD",
      startDate: "2026-01-01",
      endDate: "2026-01-08",
      csvUrl: "https://example.com/costs.csv",
      urlExpiresAt: "2026-02-10T14:30:00Z",
    },
  }

  test("Includes all required fields", () => {
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent)

    expect(result.userName).toBe("test.user")
    expect(result.totalCost).toBe("$45.67")
    expect(result.csvUrl).toBe("https://example.com/costs.csv")
  })

  test("Extracts userName from email", () => {
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent)
    expect(result.userName).toBe("test.user")
  })

  test("Formats totalCost as USD with $ symbol", () => {
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent)
    expect(result.totalCost).toBe("$45.67")
  })

  test("Handles zero totalCost", () => {
    const event = {
      ...mockLeaseCostsEvent,
      detail: { ...mockLeaseCostsEvent.detail, totalCost: 0 },
    }
    const result = buildLeaseCostsGeneratedPersonalisation(event)
    expect(result.totalCost).toBe("$0.00")
  })

  test("Handles negative totalCost (AWS credits/refunds)", () => {
    const event = {
      ...mockLeaseCostsEvent,
      detail: { ...mockLeaseCostsEvent.detail, totalCost: -15.50 },
    }
    const result = buildLeaseCostsGeneratedPersonalisation(event)
    // formatCurrency handles negative values - shows as -$15.50
    expect(result.totalCost).toBe("-$15.50")
  })

  test("Formats startDate in UK date format (DD/MM/YYYY)", () => {
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent)
    expect(result.startDate).toBe("01/01/2026")
  })

  test("Formats endDate in UK date format (DD/MM/YYYY)", () => {
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent)
    expect(result.endDate).toBe("08/01/2026")
  })

  test("Formats urlExpiresAt in long UK format with weekday", () => {
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent)
    // Should contain weekday, day, month name, year, and time (format: "Tuesday, 10 February 2026 at 14:30")
    expect(result.urlExpiresAt).toContain("2026")
    expect(result.urlExpiresAt).toContain("February")
    expect(result.urlExpiresAt).toMatch(/\w+, \d+ \w+ \d{4} at \d{2}:\d{2}/)
  })

  test("Uses enriched templateName when provided", () => {
    const enrichedData: EnrichedData = {
      enrichedAt: "2026-02-03T12:00:00Z",
      templateName: "Machine Learning Sandbox",
    }
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent, enrichedData)
    expect(result.templateName).toBe("Machine Learning Sandbox")
  })

  test("Falls back to default templateName when enrichment is missing", () => {
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent)
    expect(result.templateName).toBe("NDX:Try Session")
  })

  test("Falls back to default templateName when enrichedData has no templateName", () => {
    const enrichedData: EnrichedData = {
      enrichedAt: "2026-02-03T12:00:00Z",
      // No templateName
    }
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent, enrichedData)
    expect(result.templateName).toBe("NDX:Try Session")
  })

  test("Passes through csvUrl directly", () => {
    const result = buildLeaseCostsGeneratedPersonalisation(mockLeaseCostsEvent)
    expect(result.csvUrl).toBe("https://example.com/costs.csv")
  })
})

describe("buildPersonalisation with LeaseCostsGenerated", () => {
  const mockLeaseCostsEvent: ValidatedEvent<any> = {
    eventType: "LeaseCostsGenerated",
    eventId: "event-123",
    source: "isb-costs",
    timestamp: "2026-02-03T12:00:00Z",
    detail: {
      leaseId: "550e8400-e29b-41d4-a716-446655440000",
      userEmail: "test@example.gov.uk",
      accountId: "123456789012",
      totalCost: 100,
      currency: "USD",
      startDate: "2026-01-01",
      endDate: "2026-01-08",
      csvUrl: "https://example.com/costs.csv",
      urlExpiresAt: "2026-02-10T14:30:00Z",
    },
  }

  test("Dispatches LeaseCostsGenerated to correct builder", () => {
    const result = buildPersonalisation(mockLeaseCostsEvent)

    expect(result.totalCost).toBe("$100.00")
    expect(result.csvUrl).toBe("https://example.com/costs.csv")
  })

  test("Uses enriched templateName when provided", () => {
    const enrichedData: EnrichedData = {
      enrichedAt: "2026-02-03T12:00:00Z",
      templateName: "Data Science Sandbox",
    }
    const result = buildPersonalisation(mockLeaseCostsEvent, enrichedData)
    expect(result.templateName).toBe("Data Science Sandbox")
  })

  test("Falls back to default templateName without enrichment", () => {
    const result = buildPersonalisation(mockLeaseCostsEvent)
    expect(result.templateName).toBe("NDX:Try Session")
  })
})
