/**
 * Unit tests for Lease Status Handling (Story N7-6)
 *
 * Tests validation and field expectations for all 11 lease statuses:
 * - PendingApproval
 * - ApprovalDenied
 * - Provisioning
 * - ProvisioningFailed
 * - Active
 * - Frozen
 * - Expired
 * - BudgetExceeded
 * - ManuallyTerminated
 * - AccountQuarantined
 * - Ejected
 */

// =============================================================================
// Mock Lambda Powertools - Must be defined before imports
// =============================================================================

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

const mockMetrics = {
  addMetric: jest.fn(),
  addDimension: jest.fn(),
  publishStoredMetrics: jest.fn(),
}

jest.mock("@aws-lambda-powertools/logger", () => ({
  Logger: jest.fn().mockImplementation(() => mockLogger),
}))

jest.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: jest.fn().mockImplementation(() => mockMetrics),
  MetricUnit: {
    Count: "Count",
    Milliseconds: "Milliseconds",
  },
}))

// =============================================================================
// Imports - After mocks
// =============================================================================

import {
  KNOWN_LEASE_STATUSES,
  isKnownLeaseStatus,
  validateLeaseStatus,
  getStatusCategory,
  getExpectedFieldsForStatus,
  logFieldPresence,
  STATUS_CATEGORIES,
} from "./lease-status"
import { flattenObject } from "./flatten"

// =============================================================================
// Test Data - Sample Lease Records for Each Status
// =============================================================================

/**
 * Base fields present in all lease records
 */
const BASE_FIELDS = {
  userEmail: "test.user@example.gov.uk",
  uuid: "test-uuid-12345",
  status: "Active", // Will be overridden per test
  leaseDurationInHours: 24,
  maxSpend: 100,
  meta: {
    createdAt: "2025-01-15T10:00:00Z",
    requestedBy: "test.user@example.gov.uk",
  },
  budgetThresholds: {
    warning: 80,
    critical: 95,
  },
  durationThresholds: {
    warning: 4,
    critical: 1,
  },
}

/**
 * Monitored fields added when lease is active/frozen
 */
const MONITORED_FIELDS = {
  awsAccountId: "123456789012",
  approvedBy: "approver@example.gov.uk",
  startDate: "2025-01-15T12:00:00Z",
  expirationDate: "2025-01-16T12:00:00Z",
  lastCheckedDate: "2025-01-15T14:00:00Z",
  totalCostAccrued: 25.5,
}

/**
 * Terminal fields added when lease is expired/terminated
 */
const TERMINAL_FIELDS = {
  endDate: "2025-01-15T18:00:00Z",
  ttl: 1705430400,
}

/**
 * Create a lease record for a specific status with appropriate fields
 */
function createLeaseRecord(
  status: string,
  category: "pending" | "denied" | "monitored" | "terminal",
): Record<string, unknown> {
  const record: Record<string, unknown> = {
    ...BASE_FIELDS,
    status,
  }

  // Add fields based on category
  switch (category) {
    case "pending":
      // Only base fields
      break
    case "denied":
      // Base fields + ttl
      record.ttl = TERMINAL_FIELDS.ttl
      break
    case "monitored":
      // Base fields + monitored fields
      Object.assign(record, MONITORED_FIELDS)
      break
    case "terminal":
      // Base fields + monitored fields + terminal fields
      Object.assign(record, MONITORED_FIELDS, TERMINAL_FIELDS)
      break
  }

  return record
}

// =============================================================================
// Tests: Known Status Constants
// =============================================================================

describe("Lease Status Constants", () => {
  it("should have 11 known lease statuses", () => {
    expect(KNOWN_LEASE_STATUSES).toHaveLength(11)
  })

  it("should include all expected statuses", () => {
    const expectedStatuses = [
      "PendingApproval",
      "ApprovalDenied",
      "Provisioning",
      "ProvisioningFailed",
      "Active",
      "Frozen",
      "Expired",
      "BudgetExceeded",
      "ManuallyTerminated",
      "AccountQuarantined",
      "Ejected",
    ]

    expectedStatuses.forEach((status) => {
      expect(KNOWN_LEASE_STATUSES).toContain(status)
    })
  })

  it("should have correct status categories", () => {
    expect(STATUS_CATEGORIES.pending).toEqual(["PendingApproval"])
    expect(STATUS_CATEGORIES.denied).toEqual(["ApprovalDenied"])
    expect(STATUS_CATEGORIES.monitored).toEqual(["Active", "Frozen", "Provisioning"])
    expect(STATUS_CATEGORIES.terminal).toEqual([
      "Expired",
      "BudgetExceeded",
      "ManuallyTerminated",
      "AccountQuarantined",
      "Ejected",
      "ProvisioningFailed",
    ])
  })
})

// =============================================================================
// Tests: isKnownLeaseStatus
// =============================================================================

describe("isKnownLeaseStatus", () => {
  it.each(KNOWN_LEASE_STATUSES)("should return true for %s", (status) => {
    expect(isKnownLeaseStatus(status)).toBe(true)
  })

  it("should return false for undefined", () => {
    expect(isKnownLeaseStatus(undefined)).toBe(false)
  })

  it("should return false for unknown status", () => {
    expect(isKnownLeaseStatus("UnknownStatus")).toBe(false)
    expect(isKnownLeaseStatus("ACTIVE")).toBe(false) // Case sensitive
    expect(isKnownLeaseStatus("active")).toBe(false)
  })

  it("should return false for empty string", () => {
    expect(isKnownLeaseStatus("")).toBe(false)
  })
})

// =============================================================================
// Tests: validateLeaseStatus
// =============================================================================

describe("validateLeaseStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each(KNOWN_LEASE_STATUSES)("should not emit metric for known status %s", (status) => {
    validateLeaseStatus(status, "test-event-1")

    expect(mockMetrics.addMetric).not.toHaveBeenCalledWith(
      "UnexpectedLeaseStatus",
      expect.anything(),
      expect.anything(),
    )
    expect(mockLogger.debug).toHaveBeenCalledWith("Valid lease status", {
      eventId: "test-event-1",
      status,
    })
  })

  it("should emit UnexpectedLeaseStatus metric for unknown status", () => {
    validateLeaseStatus("FutureNewStatus", "test-event-2")

    expect(mockMetrics.addMetric).toHaveBeenCalledWith("UnexpectedLeaseStatus", "Count", 1)
    expect(mockMetrics.addDimension).toHaveBeenCalledWith("LeaseStatus", "FutureNewStatus")
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Unknown lease status encountered - processing with available fields",
      expect.objectContaining({
        eventId: "test-event-2",
        status: "FutureNewStatus",
        note: "Forward-compatible: flattening all available fields regardless of status",
      }),
    )
  })

  it("should handle undefined status gracefully", () => {
    const result = validateLeaseStatus(undefined, "test-event-3")

    expect(result).toBeUndefined()
    expect(mockLogger.debug).toHaveBeenCalledWith("No lease status in record", {
      eventId: "test-event-3",
    })
    expect(mockMetrics.addMetric).not.toHaveBeenCalled()
  })

  it("should truncate long status names in dimension", () => {
    const longStatus = "A".repeat(100)
    validateLeaseStatus(longStatus, "test-event-4")

    expect(mockMetrics.addDimension).toHaveBeenCalledWith("LeaseStatus", expect.stringMatching(/^A{50}$/))
  })

  it("should return the status for chaining", () => {
    const result = validateLeaseStatus("Active", "test-event-5")
    expect(result).toBe("Active")
  })
})

// =============================================================================
// Tests: getStatusCategory
// =============================================================================

describe("getStatusCategory", () => {
  it('should return "pending" for PendingApproval', () => {
    expect(getStatusCategory("PendingApproval")).toBe("pending")
  })

  it('should return "denied" for ApprovalDenied', () => {
    expect(getStatusCategory("ApprovalDenied")).toBe("denied")
  })

  it.each(["Active", "Frozen", "Provisioning"])('should return "monitored" for %s', (status) => {
    expect(getStatusCategory(status)).toBe("monitored")
  })

  it.each(["Expired", "BudgetExceeded", "ManuallyTerminated", "AccountQuarantined", "Ejected", "ProvisioningFailed"])(
    'should return "terminal" for %s',
    (status) => {
      expect(getStatusCategory(status)).toBe("terminal")
    },
  )

  it('should return "unknown" for unknown status', () => {
    expect(getStatusCategory("UnknownStatus")).toBe("unknown")
  })

  it('should return "unknown" for undefined', () => {
    expect(getStatusCategory(undefined)).toBe("unknown")
  })
})

// =============================================================================
// Tests: getExpectedFieldsForStatus
// =============================================================================

describe("getExpectedFieldsForStatus", () => {
  it("should return base fields for PendingApproval", () => {
    const fields = getExpectedFieldsForStatus("PendingApproval")

    // Should have base fields
    expect(fields).toContain("userEmail")
    expect(fields).toContain("uuid")
    expect(fields).toContain("status")
    expect(fields).toContain("leaseDurationInHours")
    expect(fields).toContain("maxSpend")
    expect(fields).toContain("meta")
    expect(fields).toContain("budgetThresholds")
    expect(fields).toContain("durationThresholds")

    // Should NOT have monitored or terminal fields
    expect(fields).not.toContain("awsAccountId")
    expect(fields).not.toContain("endDate")
    expect(fields).not.toContain("ttl")
  })

  it("should return base fields + ttl for ApprovalDenied", () => {
    const fields = getExpectedFieldsForStatus("ApprovalDenied")

    // Should have base fields
    expect(fields).toContain("userEmail")
    expect(fields).toContain("uuid")
    expect(fields).toContain("status")

    // Should have ttl
    expect(fields).toContain("ttl")

    // Should NOT have monitored or endDate
    expect(fields).not.toContain("awsAccountId")
    expect(fields).not.toContain("endDate")
  })

  it.each(["Active", "Frozen", "Provisioning"])("should return base + monitored fields for %s", (status) => {
    const fields = getExpectedFieldsForStatus(status)

    // Should have base fields
    expect(fields).toContain("userEmail")
    expect(fields).toContain("status")

    // Should have monitored fields
    expect(fields).toContain("awsAccountId")
    expect(fields).toContain("approvedBy")
    expect(fields).toContain("startDate")
    expect(fields).toContain("expirationDate")
    expect(fields).toContain("lastCheckedDate")
    expect(fields).toContain("totalCostAccrued")

    // Should NOT have terminal fields
    expect(fields).not.toContain("endDate")
    expect(fields).not.toContain("ttl")
  })

  it.each(["Expired", "BudgetExceeded", "ManuallyTerminated", "AccountQuarantined", "Ejected", "ProvisioningFailed"])(
    "should return base + monitored + terminal fields for %s",
    (status) => {
      const fields = getExpectedFieldsForStatus(status)

      // Should have base fields
      expect(fields).toContain("userEmail")
      expect(fields).toContain("status")

      // Should have monitored fields
      expect(fields).toContain("awsAccountId")
      expect(fields).toContain("totalCostAccrued")

      // Should have terminal fields
      expect(fields).toContain("endDate")
      expect(fields).toContain("ttl")
    },
  )

  it("should return all fields for unknown status (forward-compatible)", () => {
    const fields = getExpectedFieldsForStatus("FutureNewStatus")

    // Should have all possible fields for forward compatibility
    expect(fields).toContain("userEmail")
    expect(fields).toContain("awsAccountId")
    expect(fields).toContain("endDate")
    expect(fields).toContain("ttl")
  })
})

// =============================================================================
// Tests: Per-Status Lease Record Flattening (N7-6 AC)
// =============================================================================

describe("Lease Status Field Sets", () => {
  describe("PendingApproval lease", () => {
    const leaseRecord = createLeaseRecord("PendingApproval", "pending")

    it("should include base fields when flattened", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-pending" })

      expect(flattened.userEmail).toBe("test.user@example.gov.uk")
      expect(flattened.uuid).toBe("test-uuid-12345")
      expect(flattened.status).toBe("PendingApproval")
      expect(flattened.leaseDurationInHours).toBe("24")
      expect(flattened.maxSpend).toBe("100")
    })

    it("should include nested meta fields", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-pending" })

      expect(flattened.meta_createdAt).toBe("2025-01-15T10:00:00Z")
      expect(flattened.meta_requestedBy).toBe("test.user@example.gov.uk")
    })

    it("should include nested threshold fields", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-pending" })

      expect(flattened.budgetThresholds_warning).toBe("80")
      expect(flattened.budgetThresholds_critical).toBe("95")
      expect(flattened.durationThresholds_warning).toBe("4")
      expect(flattened.durationThresholds_critical).toBe("1")
    })

    it("should NOT include monitored or terminal fields", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-pending" })

      expect(flattened.awsAccountId).toBeUndefined()
      expect(flattened.approvedBy).toBeUndefined()
      expect(flattened.endDate).toBeUndefined()
      expect(flattened.ttl).toBeUndefined()
    })
  })

  describe("ApprovalDenied lease", () => {
    const leaseRecord = createLeaseRecord("ApprovalDenied", "denied")

    it("should include base fields + ttl when flattened", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-denied" })

      expect(flattened.userEmail).toBe("test.user@example.gov.uk")
      expect(flattened.status).toBe("ApprovalDenied")
      expect(flattened.ttl).toBe(String(TERMINAL_FIELDS.ttl))
    })

    it("should NOT include monitored fields", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-denied" })

      expect(flattened.awsAccountId).toBeUndefined()
      expect(flattened.approvedBy).toBeUndefined()
    })
  })

  describe("Active lease", () => {
    const leaseRecord = createLeaseRecord("Active", "monitored")

    it("should include base + monitored fields when flattened", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-active" })

      // Base fields
      expect(flattened.userEmail).toBe("test.user@example.gov.uk")
      expect(flattened.status).toBe("Active")

      // Monitored fields
      expect(flattened.awsAccountId).toBe("123456789012")
      expect(flattened.approvedBy).toBe("approver@example.gov.uk")
      expect(flattened.startDate).toBe("2025-01-15T12:00:00Z")
      expect(flattened.expirationDate).toBe("2025-01-16T12:00:00Z")
      expect(flattened.lastCheckedDate).toBe("2025-01-15T14:00:00Z")
      expect(flattened.totalCostAccrued).toBe("25.5")
    })

    it("should NOT include terminal fields", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-active" })

      expect(flattened.endDate).toBeUndefined()
      expect(flattened.ttl).toBeUndefined()
    })
  })

  describe("Frozen lease", () => {
    const leaseRecord = createLeaseRecord("Frozen", "monitored")

    it("should include base + monitored fields when flattened", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-frozen" })

      expect(flattened.status).toBe("Frozen")
      expect(flattened.awsAccountId).toBe("123456789012")
      expect(flattened.totalCostAccrued).toBe("25.5")
    })
  })

  describe("Expired lease", () => {
    const leaseRecord = createLeaseRecord("Expired", "terminal")

    it("should include base + monitored + terminal fields when flattened", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-expired" })

      // Base fields
      expect(flattened.status).toBe("Expired")

      // Monitored fields
      expect(flattened.awsAccountId).toBe("123456789012")

      // Terminal fields
      expect(flattened.endDate).toBe("2025-01-15T18:00:00Z")
      expect(flattened.ttl).toBe(String(TERMINAL_FIELDS.ttl))
    })
  })

  describe("BudgetExceeded lease", () => {
    const leaseRecord = createLeaseRecord("BudgetExceeded", "terminal")

    it("should include all fields when flattened", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-budget" })

      expect(flattened.status).toBe("BudgetExceeded")
      expect(flattened.totalCostAccrued).toBe("25.5")
      expect(flattened.endDate).toBe("2025-01-15T18:00:00Z")
    })
  })

  describe("ManuallyTerminated lease", () => {
    const leaseRecord = createLeaseRecord("ManuallyTerminated", "terminal")

    it("should include all fields when flattened", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-manual" })

      expect(flattened.status).toBe("ManuallyTerminated")
      expect(flattened.endDate).toBe("2025-01-15T18:00:00Z")
    })
  })

  describe("AccountQuarantined lease", () => {
    const leaseRecord = createLeaseRecord("AccountQuarantined", "terminal")

    it("should include all fields when flattened", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-quarantine" })

      expect(flattened.status).toBe("AccountQuarantined")
      expect(flattened.endDate).toBe("2025-01-15T18:00:00Z")
    })
  })

  describe("Ejected lease", () => {
    const leaseRecord = createLeaseRecord("Ejected", "terminal")

    it("should include all fields when flattened", () => {
      const { flattened } = flattenObject(leaseRecord, { eventId: "test-ejected" })

      expect(flattened.status).toBe("Ejected")
      expect(flattened.endDate).toBe("2025-01-15T18:00:00Z")
    })
  })
})

// =============================================================================
// Tests: Forward Compatibility (Unknown Statuses)
// =============================================================================

describe("Forward Compatibility - Unknown Statuses", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should process unknown status with all available fields", () => {
    const leaseRecord = {
      ...BASE_FIELDS,
      ...MONITORED_FIELDS,
      ...TERMINAL_FIELDS,
      status: "FutureNewStatus",
    }

    const { flattened } = flattenObject(leaseRecord, { eventId: "test-unknown" })

    // All fields should be included
    expect(flattened.status).toBe("FutureNewStatus")
    expect(flattened.userEmail).toBe("test.user@example.gov.uk")
    expect(flattened.awsAccountId).toBe("123456789012")
    expect(flattened.endDate).toBe("2025-01-15T18:00:00Z")
  })

  it("should log warning for unknown status via validateLeaseStatus", () => {
    validateLeaseStatus("FutureNewStatus", "test-forward")

    expect(mockLogger.warn).toHaveBeenCalled()
    expect(mockMetrics.addMetric).toHaveBeenCalledWith("UnexpectedLeaseStatus", "Count", 1)
  })
})

// =============================================================================
// Tests: Schema Evolution (New Fields)
// =============================================================================

describe("Schema Evolution - New Fields", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should include new/unexpected fields via flattening", () => {
    const leaseRecord = {
      ...BASE_FIELDS,
      status: "Active",
      // New fields not in expected list
      newField1: "value1",
      newNestedField: {
        subField: "value2",
      },
      futureArray: ["a", "b", "c"],
    }

    const { flattened } = flattenObject(leaseRecord, { eventId: "test-evolution" })

    // New fields should be included
    expect(flattened.newField1).toBe("value1")
    expect(flattened.newNestedField_subField).toBe("value2")
    expect(flattened.futureArray_0).toBe("a")
    expect(flattened.futureArray_1).toBe("b")
    expect(flattened.futureArray_2).toBe("c")
  })

  it("should log schema evolution detection via logFieldPresence", () => {
    const leaseRecord = {
      userEmail: "test@example.gov.uk",
      uuid: "test-uuid",
      status: "Active",
      unexpectedField: "value",
    }

    logFieldPresence(leaseRecord, "Active", "test-evolution-log")

    expect(mockLogger.info).toHaveBeenCalledWith(
      "Schema evolution detected - new fields in lease record",
      expect.objectContaining({
        eventId: "test-evolution-log",
        newFieldCount: expect.any(Number),
      }),
    )
  })
})

// =============================================================================
// Tests: logFieldPresence
// =============================================================================

describe("logFieldPresence", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should log field analysis for known status", () => {
    const leaseRecord = {
      userEmail: "test@example.gov.uk",
      uuid: "test-uuid",
      status: "Active",
      awsAccountId: "123456789012",
    }

    logFieldPresence(leaseRecord, "Active", "test-presence")

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Lease record field analysis",
      expect.objectContaining({
        eventId: "test-presence",
        status: "Active",
        category: "monitored",
      }),
    )
  })

  it("should handle undefined status", () => {
    const leaseRecord = {
      userEmail: "test@example.gov.uk",
      uuid: "test-uuid",
    }

    logFieldPresence(leaseRecord, undefined, "test-no-status")

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "Lease record field analysis",
      expect.objectContaining({
        category: "unknown",
      }),
    )
  })
})

// =============================================================================
// Tests: All 9 Statuses Have Unit Test Coverage (AC)
// =============================================================================

describe("All Lease Statuses Unit Test Coverage", () => {
  const allStatuses = [
    "PendingApproval",
    "ApprovalDenied",
    "Provisioning",
    "ProvisioningFailed",
    "Active",
    "Frozen",
    "Expired",
    "BudgetExceeded",
    "ManuallyTerminated",
    "AccountQuarantined",
    "Ejected",
  ]

  it.each(allStatuses)("has test coverage for %s status", (status) => {
    // This test verifies each status is recognized
    expect(isKnownLeaseStatus(status)).toBe(true)

    // And can be categorized
    const category = getStatusCategory(status)
    expect(["pending", "denied", "monitored", "terminal"]).toContain(category)

    // And has expected fields defined
    const fields = getExpectedFieldsForStatus(status)
    expect(fields.length).toBeGreaterThan(0)
  })
})
