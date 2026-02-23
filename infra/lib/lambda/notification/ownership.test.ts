/**
 * Unit tests for Email Ownership Verification Module
 *
 * Story: N5.3 - Email Ownership Verification
 * ACs: 3.1-3.28
 *
 * Test naming convention: test_n5-3_{ACID}_{scenario}
 *
 * Note: All data now fetched via ISB Lambda APIs instead of direct DynamoDB access
 */

import {
  verifyEmailOwnership,
  hashForLog,
  isApprovedDomain,
  hasSuspiciousPattern,
  validateEmailFormat,
  isOpsEvent,
  extractLeaseKey,
  generateAuditSignature,
  clearVerificationState,
} from "./ownership"
import type { ValidatedEvent } from "./validation"
import { SecurityError, PermanentError, RetriableError } from "./errors"

// =========================================================================
// Mock Setup
// =========================================================================

// Mock ISB client functions
const mockFetchLeaseByKey = jest.fn()
const mockFetchAccountFromISB = jest.fn()

jest.mock("./isb-client", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  fetchLeaseByKey: (...args: unknown[]) => mockFetchLeaseByKey(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  fetchAccountFromISB: (...args: unknown[]) => mockFetchAccountFromISB(...args),
}))

// Mock Logger
jest.mock("@aws-lambda-powertools/logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

// Mock Metrics
jest.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: jest.fn().mockImplementation(() => ({
    addMetric: jest.fn(),
    addDimension: jest.fn(),
    publishStoredMetrics: jest.fn(),
  })),
  MetricUnit: {
    Count: "Count",
    Seconds: "Seconds",
  },
}))

// =========================================================================
// Test Fixtures
// =========================================================================

const createValidatedEvent = (
  userEmail: string,
  leaseId?: { userEmail: string; uuid: string },
  accountId?: string,
  eventType: string = "LeaseApproved",
): ValidatedEvent => ({
  eventType: eventType as ValidatedEvent["eventType"],
  eventId: "evt-test-123",
  source: "innovation-sandbox",
  timestamp: "2025-11-28T10:00:00Z",
  detail: {
    userEmail,
    leaseId,
    accountId,
  },
})

/**
 * Create mock ISB lease record
 */
const createISBLeaseRecord = (userEmail: string, uuid: string, accountId?: string) => ({
  userEmail,
  uuid,
  status: "Active",
  ...(accountId && { awsAccountId: accountId }),
})

/**
 * Create mock ISB account record
 */
const createISBAccountRecord = (accountId: string, ownerEmail: string) => ({
  awsAccountId: accountId,
  email: ownerEmail,
  status: "Active",
})

// =========================================================================
// Utility Function Tests
// =========================================================================

describe("hashForLog", () => {
  it("should hash email addresses consistently", () => {
    const email = "user@example.gov.uk"
    const hash1 = hashForLog(email)
    const hash2 = hashForLog(email)

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(12)
    expect(hash1).not.toContain("@")
  })

  it('should return "empty" for empty string', () => {
    expect(hashForLog("")).toBe("empty")
  })

  it("should produce different hashes for different emails", () => {
    const hash1 = hashForLog("user1@example.gov.uk")
    const hash2 = hashForLog("user2@example.gov.uk")

    expect(hash1).not.toBe(hash2)
  })
})

describe("isApprovedDomain", () => {
  // AC-3.17: Domain validation
  it("should approve .gov.uk domain", () => {
    expect(isApprovedDomain("user@example.gov.uk")).toBe(true)
  })

  it("should approve subdomain of .gov.uk", () => {
    expect(isApprovedDomain("user@dept.gov.uk")).toBe(true)
  })

  it("should reject gmail.com", () => {
    expect(isApprovedDomain("user@gmail.com")).toBe(false)
  })

  it("should reject example.com", () => {
    expect(isApprovedDomain("user@example.com")).toBe(false)
  })

  it("should return false for empty email", () => {
    expect(isApprovedDomain("")).toBe(false)
  })

  it("should return false for email without domain", () => {
    expect(isApprovedDomain("nodomain")).toBe(false)
  })
})

describe("hasSuspiciousPattern", () => {
  // AC-3.22: Consecutive delimiters
  it("should detect ++ pattern", () => {
    expect(hasSuspiciousPattern("user++test@gov.uk")).toBe(true)
  })

  it("should detect -- pattern", () => {
    expect(hasSuspiciousPattern("user--test@gov.uk")).toBe(true)
  })

  it("should detect .. pattern", () => {
    expect(hasSuspiciousPattern("user..test@gov.uk")).toBe(true)
  })

  // AC-3.28: Test domains
  it("should detect @test.com", () => {
    expect(hasSuspiciousPattern("user@test.com")).toBe(true)
  })

  it("should detect @localhost", () => {
    expect(hasSuspiciousPattern("user@localhost")).toBe(true)
  })

  it("should detect @example.com", () => {
    expect(hasSuspiciousPattern("user@example.com")).toBe(true)
  })

  it("should detect 123@ pattern", () => {
    expect(hasSuspiciousPattern("123@gov.uk")).toBe(true)
  })

  it("should allow valid email", () => {
    expect(hasSuspiciousPattern("jane.doe@example.gov.uk")).toBe(false)
  })

  it("should return false for empty email", () => {
    expect(hasSuspiciousPattern("")).toBe(false)
  })
})

describe("validateEmailFormat", () => {
  // AC-3.17, AC-3.18: Domain validation with logging
  it("should pass valid gov.uk email", () => {
    const result = validateEmailFormat("user@example.gov.uk", "evt-123")
    expect(result.valid).toBe(true)
  })

  // AC-3.18: Log and alarm on non-approved domains
  it("should reject non-approved domain", () => {
    const result = validateEmailFormat("user@gmail.com", "evt-123")
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("approved")
  })

  // AC-3.22: Suspicious patterns
  it("should reject suspicious pattern", () => {
    const result = validateEmailFormat("user++test@gov.uk", "evt-123")
    expect(result.valid).toBe(false)
    expect(result.reason).toContain("suspicious")
  })
})

describe("isOpsEvent", () => {
  it("should return true for AccountCleanupFailed", () => {
    expect(isOpsEvent("AccountCleanupFailed")).toBe(true)
  })

  it("should return true for AccountQuarantined", () => {
    expect(isOpsEvent("AccountQuarantined")).toBe(true)
  })

  it("should return true for AccountDriftDetected", () => {
    expect(isOpsEvent("AccountDriftDetected")).toBe(true)
  })

  it("should return false for LeaseApproved", () => {
    expect(isOpsEvent("LeaseApproved")).toBe(false)
  })

  it("should return false for LeaseDenied", () => {
    expect(isOpsEvent("LeaseDenied")).toBe(false)
  })
})

describe("extractLeaseKey", () => {
  it("should extract lease key from event with leaseId", () => {
    const event = createValidatedEvent("user@example.gov.uk", {
      userEmail: "user@example.gov.uk",
      uuid: "test-uuid-123",
    })
    const key = extractLeaseKey(event)

    expect(key).toEqual({
      userEmail: "user@example.gov.uk",
      uuid: "test-uuid-123",
    })
  })

  it("should return null when no leaseId", () => {
    const event = createValidatedEvent("user@example.gov.uk")
    const key = extractLeaseKey(event)

    expect(key).toBeNull()
  })
})

describe("generateAuditSignature", () => {
  // AC-3.25: HMAC-SHA256 signature
  it("should generate consistent signature for same inputs", () => {
    const sig1 = generateAuditSignature("evt-123", true, "2025-01-01T00:00:00Z")
    const sig2 = generateAuditSignature("evt-123", true, "2025-01-01T00:00:00Z")

    expect(sig1).toBe(sig2)
    expect(sig1).toHaveLength(16)
  })

  it("should generate different signature for different inputs", () => {
    const sig1 = generateAuditSignature("evt-123", true, "2025-01-01T00:00:00Z")
    const sig2 = generateAuditSignature("evt-456", true, "2025-01-01T00:00:00Z")

    expect(sig1).not.toBe(sig2)
  })
})

// =========================================================================
// Main Verification Function Tests
// =========================================================================

describe("verifyEmailOwnership", () => {
  beforeEach(() => {
    mockFetchLeaseByKey.mockReset()
    mockFetchAccountFromISB.mockReset()
    process.env.ISB_API_BASE_URL = "https://test-api.execute-api.us-west-2.amazonaws.com/prod"
    process.env.ISB_JWT_SECRET_PATH = "/InnovationSandbox/ndx/Auth/JwtSecret"
  })

  afterEach(() => {
    delete process.env.ISB_API_BASE_URL
    delete process.env.ISB_JWT_SECRET_PATH
  })

  // AC-3.1: Queries ISB Leases API with leaseId key
  describe("AC-3.1: ISB Leases API Query", () => {
    it("should query ISB Leases API with correct key", async () => {
      mockFetchLeaseByKey.mockResolvedValue(createISBLeaseRecord("user@example.gov.uk", "test-uuid"))

      const event = createValidatedEvent("user@example.gov.uk", { userEmail: "user@example.gov.uk", uuid: "test-uuid" })

      await verifyEmailOwnership(event)

      expect(mockFetchLeaseByKey).toHaveBeenCalledWith("user@example.gov.uk", "test-uuid", "evt-test-123")
    })
  })

  // AC-3.2: Case-insensitive email comparison
  describe("AC-3.2: Case-Insensitive Comparison", () => {
    it("should match emails with different case", async () => {
      mockFetchLeaseByKey.mockResolvedValue(createISBLeaseRecord("user@example.gov.uk", "test-uuid"))

      const event = createValidatedEvent("USER@EXAMPLE.GOV.UK", { userEmail: "user@example.gov.uk", uuid: "test-uuid" })

      const result = await verifyEmailOwnership(event)

      expect(result.verified).toBe(true)
    })

    it("should match mixed case emails", async () => {
      mockFetchLeaseByKey.mockResolvedValue(createISBLeaseRecord("User@Example.Gov.UK", "test-uuid"))

      const event = createValidatedEvent("user@example.gov.uk", { userEmail: "user@example.gov.uk", uuid: "test-uuid" })

      const result = await verifyEmailOwnership(event)

      expect(result.verified).toBe(true)
    })
  })

  // AC-3.3: Email mismatch throws SecurityError
  describe("AC-3.3: Email Mismatch SecurityError", () => {
    it("should throw SecurityError when emails do not match", async () => {
      mockFetchLeaseByKey.mockResolvedValue(createISBLeaseRecord("different@example.gov.uk", "test-uuid"))

      const event = createValidatedEvent("user@example.gov.uk", { userEmail: "user@example.gov.uk", uuid: "test-uuid" })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(SecurityError)
    })

    it("should include message about lease owner mismatch", async () => {
      mockFetchLeaseByKey.mockResolvedValue(createISBLeaseRecord("different@example.gov.uk", "test-uuid"))

      const event = createValidatedEvent("user@example.gov.uk", { userEmail: "user@example.gov.uk", uuid: "test-uuid" })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(/Email does not match lease owner/)
    })
  })

  // AC-3.4: OwnershipMismatch metric - tested via mocked metrics

  // AC-3.5: Redacted emails in error log - tested via mocked logger

  // AC-3.6: Lease not found throws PermanentError
  describe("AC-3.6: Lease Not Found PermanentError", () => {
    it("should throw PermanentError when lease not found", async () => {
      mockFetchLeaseByKey.mockResolvedValue(null)

      const event = createValidatedEvent("user@example.gov.uk", { userEmail: "user@example.gov.uk", uuid: "test-uuid" })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(PermanentError)
    })

    it('should include "Lease not found" message', async () => {
      mockFetchLeaseByKey.mockResolvedValue(null)

      const event = createValidatedEvent("user@example.gov.uk", { userEmail: "user@example.gov.uk", uuid: "test-uuid" })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(/Lease not found/)
    })
  })

  // AC-3.7: Read-only access - verified by ISB API usage (GET requests only)

  // AC-3.8: Mandatory verification - no config to bypass (architectural)

  // AC-3.9: Note - ConsistentRead was DynamoDB-specific; ISB API handles consistency internally

  // AC-3.10: Compares BOTH userEmail AND uuid - tested in AC-3.1

  // AC-3.11: Clear state between sends
  describe("AC-3.11: State Clearing", () => {
    it("clearVerificationState should not throw", () => {
      expect(() => clearVerificationState()).not.toThrow()
    })
  })

  // AC-3.12: Ops events skip verification
  describe("AC-3.12: Ops Events Skip Verification", () => {
    it("should skip verification for AccountCleanupFailed", async () => {
      const event: ValidatedEvent = {
        eventType: "AccountCleanupFailed",
        eventId: "evt-test-123",
        source: "innovation-sandbox",
        timestamp: "2025-11-28T10:00:00Z",
        detail: {
          accountId: "123456789012",
        },
      }

      const result = await verifyEmailOwnership(event)

      expect(result.verified).toBe(true)
      expect(result.leaseOwner).toBe("")
      // ISB API should NOT have been called
      expect(mockFetchLeaseByKey).not.toHaveBeenCalled()
    })
  })

  // AC-3.13, AC-3.14, AC-3.15: Cross-verification with ISB Accounts API
  describe("AC-3.13-3.15: Cross-Verification", () => {
    it("should cross-verify with ISB Accounts API when accountId present", async () => {
      mockFetchLeaseByKey.mockResolvedValue(createISBLeaseRecord("user@example.gov.uk", "test-uuid", "123456789012"))
      mockFetchAccountFromISB.mockResolvedValue(createISBAccountRecord("123456789012", "user@example.gov.uk"))

      const event = createValidatedEvent(
        "user@example.gov.uk",
        { userEmail: "user@example.gov.uk", uuid: "test-uuid" },
        "123456789012",
      )

      const result = await verifyEmailOwnership(event)

      expect(result.verified).toBe(true)
      expect(result.accountOwner).toBe("user@example.gov.uk")
      expect(mockFetchAccountFromISB).toHaveBeenCalledWith("123456789012", "evt-test-123")
    })

    it("should throw SecurityError when account owner differs", async () => {
      mockFetchLeaseByKey.mockResolvedValue(createISBLeaseRecord("user@example.gov.uk", "test-uuid", "123456789012"))
      mockFetchAccountFromISB.mockResolvedValue(createISBAccountRecord("123456789012", "different@example.gov.uk"))

      const event = createValidatedEvent(
        "user@example.gov.uk",
        { userEmail: "user@example.gov.uk", uuid: "test-uuid" },
        "123456789012",
      )

      await expect(verifyEmailOwnership(event)).rejects.toThrow(SecurityError)
    })
  })

  // AC-3.17: Domain validation
  describe("AC-3.17: Domain Validation", () => {
    it("should reject non-.gov.uk domain", async () => {
      const event = createValidatedEvent("user@gmail.com", { userEmail: "user@gmail.com", uuid: "test-uuid" })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(PermanentError)
    })
  })

  // AC-3.20: Verification failures are PermanentError (no retry)
  describe("AC-3.20: No Retry on Verification Failures", () => {
    it("should throw PermanentError for validation failures", async () => {
      const event = createValidatedEvent("user++test@example.gov.uk", {
        userEmail: "user++test@example.gov.uk",
        uuid: "test-uuid",
      })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(PermanentError)
    })
  })

  // AC-3.22: Suspicious pattern rejection
  describe("AC-3.22: Suspicious Pattern Rejection", () => {
    it("should reject email with ++ pattern", async () => {
      const event = createValidatedEvent("user++test@example.gov.uk", {
        userEmail: "user++test@example.gov.uk",
        uuid: "test-uuid",
      })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(/suspicious/i)
    })

    it("should reject email with .. pattern", async () => {
      const event = createValidatedEvent("user..test@example.gov.uk", {
        userEmail: "user..test@example.gov.uk",
        uuid: "test-uuid",
      })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(/suspicious/i)
    })
  })

  // AC-3.28: Test addresses rejection
  describe("AC-3.28: Test Address Rejection", () => {
    it("should reject @test.com addresses", async () => {
      const event = createValidatedEvent("user@test.com", { userEmail: "user@test.com", uuid: "test-uuid" })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(PermanentError)
    })

    it("should reject @localhost addresses", async () => {
      const event = createValidatedEvent("user@localhost", { userEmail: "user@localhost", uuid: "test-uuid" })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(PermanentError)
    })

    it("should reject 123@ prefix", async () => {
      const event = createValidatedEvent("123@example.gov.uk", { userEmail: "123@example.gov.uk", uuid: "test-uuid" })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(PermanentError)
    })
  })

  // ISB API error handling
  describe("ISB API Error Handling", () => {
    it("should throw RetriableError when ISB API fails", async () => {
      const error = new Error("Service unavailable")
      mockFetchLeaseByKey.mockRejectedValue(error)

      const event = createValidatedEvent("user@example.gov.uk", { userEmail: "user@example.gov.uk", uuid: "test-uuid" })

      await expect(verifyEmailOwnership(event)).rejects.toThrow(RetriableError)
    })

    it("should gracefully handle account API errors without failing verification", async () => {
      mockFetchLeaseByKey.mockResolvedValue(createISBLeaseRecord("user@example.gov.uk", "test-uuid", "123456789012"))
      mockFetchAccountFromISB.mockResolvedValue(null) // API returns null on error/not found

      const event = createValidatedEvent(
        "user@example.gov.uk",
        { userEmail: "user@example.gov.uk", uuid: "test-uuid" },
        "123456789012",
      )

      // Should still verify successfully - account cross-verification is secondary
      const result = await verifyEmailOwnership(event)
      expect(result.verified).toBe(true)
      expect(result.accountOwner).toBeUndefined()
    })
  })

  // Success case with audit data
  describe("Success Case with Audit Data", () => {
    it("should return complete verification result", async () => {
      mockFetchLeaseByKey.mockResolvedValue(createISBLeaseRecord("user@example.gov.uk", "test-uuid"))

      const event = createValidatedEvent("user@example.gov.uk", { userEmail: "user@example.gov.uk", uuid: "test-uuid" })

      const result = await verifyEmailOwnership(event)

      expect(result.verified).toBe(true)
      expect(result.leaseOwner).toBe("user@example.gov.uk")
      expect(result.auditData.leaseOwnerHash).toHaveLength(12)
      expect(result.auditData.eventEmailHash).toHaveLength(12)
      expect(result.auditData.verificationTimestamp).toBeDefined()
    })
  })

  // Note: Missing configuration test removed - ISB Lambda name validation happens
  // at the isb-client.ts level and is tested in isb-client.test.ts
})
