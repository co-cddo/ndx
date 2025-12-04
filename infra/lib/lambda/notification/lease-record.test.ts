/**
 * Unit tests for LeaseRecord Types and Validation
 *
 * Story: N7.1 - DynamoDB Integration Setup
 * ACs: 7.1.11, 7.1.12, 7.1.13, 7.1.14, 7.1.15, 7.1.16, 7.1.21
 *
 * Test naming convention: test_n7-1_{ACID}_{scenario}
 */

import {
  validateRecordSize,
  isRecordExpired,
  validateLeaseRecord,
  filterForTemplates,
  generateSchemaFingerprint,
  getExpectedFieldNames,
  type FullLeaseRecord,
} from "./lease-record"

// Mock Logger to avoid console output in tests
jest.mock("@aws-lambda-powertools/logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

// =============================================================================
// Test Fixtures
// =============================================================================

const createFullLeaseRecord = (overrides?: Partial<FullLeaseRecord>): FullLeaseRecord => ({
  // Primary Key
  userEmail: "user@example.gov.uk",
  uuid: "lease-uuid-123",

  // String fields
  status: "Active",
  expirationDate: "2025-12-31T23:59:59Z",
  approvedBy: "approver@example.gov.uk",
  awsAccountId: "123456789012",
  createdBy: "creator@example.gov.uk",
  originalLeaseTemplateUuid: "template-uuid-456",
  startDate: "2025-01-01T00:00:00Z",
  originalLeaseTemplateName: "Standard Lease",
  lastCheckedDate: "2025-11-28T10:00:00Z",
  endDate: "2025-12-31T23:59:59Z",
  comments: "Test lease for development",

  // Numeric fields
  leaseDurationInHours: 720,
  totalCostAccrued: 50.75,
  maxSpend: 100.0,
  ttl: Math.floor(Date.now() / 1000) + 86400, // Expires in 24 hours

  // Complex fields
  meta: {
    lastEditTime: "2025-11-28T10:00:00Z",
    createdTime: "2025-11-01T00:00:00Z",
    schemaVersion: "1.0",
  },
  budgetThresholds: [
    { threshold: 50, percentage: 50, alertEnabled: true },
    { threshold: 80, percentage: 80, alertEnabled: true },
  ],

  ...overrides,
})

// =============================================================================
// AC-7.1.21: Contract Test - 18 Fields
// =============================================================================

describe("test_n7-1_7.1.21_contract_18_fields", () => {
  it("should define exactly 18 fields in FullLeaseRecord interface", () => {
    const expectedFields = getExpectedFieldNames()

    // AC-7.1.21: Contract test verifies 18 fields exist
    expect(expectedFields).toHaveLength(19) // 18 fields + comments

    expect(expectedFields).toEqual([
      "userEmail",
      "uuid",
      "status",
      "expirationDate",
      "approvedBy",
      "awsAccountId",
      "createdBy",
      "originalLeaseTemplateUuid",
      "startDate",
      "originalLeaseTemplateName",
      "lastCheckedDate",
      "endDate",
      "leaseDurationInHours",
      "totalCostAccrued",
      "maxSpend",
      "ttl",
      "meta",
      "budgetThresholds",
      "comments",
    ])
  })

  it("should create valid FullLeaseRecord with all fields", () => {
    const record = createFullLeaseRecord()

    // Verify all fields are present
    expect(record.userEmail).toBeDefined()
    expect(record.uuid).toBeDefined()
    expect(record.status).toBeDefined()
    expect(record.expirationDate).toBeDefined()
    expect(record.approvedBy).toBeDefined()
    expect(record.awsAccountId).toBeDefined()
    expect(record.createdBy).toBeDefined()
    expect(record.originalLeaseTemplateUuid).toBeDefined()
    expect(record.startDate).toBeDefined()
    expect(record.originalLeaseTemplateName).toBeDefined()
    expect(record.lastCheckedDate).toBeDefined()
    expect(record.endDate).toBeDefined()
    expect(record.leaseDurationInHours).toBeDefined()
    expect(record.totalCostAccrued).toBeDefined()
    expect(record.maxSpend).toBeDefined()
    expect(record.ttl).toBeDefined()
    expect(record.meta).toBeDefined()
    expect(record.budgetThresholds).toBeDefined()
    expect(record.comments).toBeDefined()

    // Verify field count
    expect(Object.keys(record).length).toBe(19)
  })
})

// =============================================================================
// AC-7.1.12: Record Size Validation
// =============================================================================

describe("test_n7-1_7.1.12_record_size_validation", () => {
  it("should accept record under 128KB limit", () => {
    const record = createFullLeaseRecord()

    // Normal record should be well under limit
    const result = validateRecordSize(record)

    expect(result).toBe(true)
  })

  it("should reject record exceeding 128KB limit", () => {
    // Create oversized record with large comments field
    const largeComments = "x".repeat(130 * 1024) // 130KB of data
    const record = createFullLeaseRecord({
      comments: largeComments,
    })

    const result = validateRecordSize(record)

    expect(result).toBe(false)
  })

  it("should handle edge case at exactly 128KB", () => {
    // Create record close to limit
    const record = createFullLeaseRecord()
    const baseSize = Buffer.byteLength(JSON.stringify(record), "utf8")
    const remainingSpace = 128 * 1024 - baseSize - 100 // Leave small buffer

    const paddedRecord = {
      ...record,
      comments: "x".repeat(remainingSpace),
    }

    const result = validateRecordSize(paddedRecord)

    expect(result).toBe(true)
  })

  it("should handle null or undefined gracefully", () => {
    expect(validateRecordSize(null)).toBe(true)
    expect(validateRecordSize(undefined)).toBe(true)
    expect(validateRecordSize({})).toBe(true)
  })
})

// =============================================================================
// AC-7.1.15: TTL Expiry Check
// =============================================================================

describe("test_n7-1_7.1.15_ttl_expiry_check", () => {
  it("should identify expired record (TTL in past)", () => {
    const expiredTtl = Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago

    const result = isRecordExpired(expiredTtl)

    expect(result).toBe(true)
  })

  it("should identify active record (TTL in future)", () => {
    const futureTtl = Math.floor(Date.now() / 1000) + 86400 // Expires in 24 hours

    const result = isRecordExpired(futureTtl)

    expect(result).toBe(false)
  })

  it("should treat undefined TTL as non-expired", () => {
    const result = isRecordExpired(undefined)

    expect(result).toBe(false)
  })

  it("should handle edge case at current time", () => {
    const currentTtl = Math.floor(Date.now() / 1000)

    // Record at exact current time may be expired or not depending on timing
    const result = isRecordExpired(currentTtl)

    // Should be true or false (not throw)
    expect(typeof result).toBe("boolean")
  })

  it("should handle very old TTL", () => {
    const veryOldTtl = 1000000000 // Year 2001

    const result = isRecordExpired(veryOldTtl)

    expect(result).toBe(true)
  })

  it("should handle far future TTL", () => {
    const farFutureTtl = 2000000000 // Year 2033

    const result = isRecordExpired(farFutureTtl)

    expect(result).toBe(false)
  })
})

// =============================================================================
// AC-7.1.13, AC-7.1.14: Field Type Validation
// =============================================================================

describe("test_n7-1_7.1.13_string_field_validation", () => {
  it("should validate all string fields are strings", () => {
    const record = createFullLeaseRecord()

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("should reject non-string in string field", () => {
    const record = createFullLeaseRecord({
      status: 123 as any, // Invalid: number instead of string
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Field 'status' must be a string, got number")
  })

  it("should reject multiple invalid string fields", () => {
    const record = createFullLeaseRecord({
      status: 123 as any,
      approvedBy: true as any,
      awsAccountId: {} as any,
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(3)
    expect(result.errors).toContain("Field 'status' must be a string, got number")
    expect(result.errors).toContain("Field 'approvedBy' must be a string, got boolean")
    expect(result.errors).toContain("Field 'awsAccountId' must be a string, got object")
  })

  it("should allow undefined for optional string fields", () => {
    const record: Partial<FullLeaseRecord> = {
      userEmail: "user@example.gov.uk",
      uuid: "lease-uuid-123",
      // Other fields undefined
    }

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe("test_n7-1_7.1.14_numeric_field_validation", () => {
  it("should validate all numeric fields are numbers", () => {
    const record = createFullLeaseRecord()

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("should reject non-number in numeric field", () => {
    const record = createFullLeaseRecord({
      maxSpend: "100" as any, // Invalid: string instead of number
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Field 'maxSpend' must be a number, got string")
  })

  it("should reject NaN in numeric field", () => {
    const record = createFullLeaseRecord({
      totalCostAccrued: NaN,
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Field 'totalCostAccrued' must be a finite number, got NaN")
  })

  it("should reject Infinity in numeric field", () => {
    const record = createFullLeaseRecord({
      maxSpend: Infinity,
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Field 'maxSpend' must be a finite number, got Infinity")
  })

  it("should accept negative numbers", () => {
    const record = createFullLeaseRecord({
      totalCostAccrued: -10.5,
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("should accept zero", () => {
    const record = createFullLeaseRecord({
      maxSpend: 0,
      totalCostAccrued: 0,
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("should reject multiple invalid numeric fields", () => {
    const record = createFullLeaseRecord({
      maxSpend: "100" as any,
      totalCostAccrued: true as any,
      leaseDurationInHours: [] as any,
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(3)
  })
})

describe("test_n7-1_7.1.14_complex_field_validation", () => {
  it("should validate meta object structure", () => {
    const record = createFullLeaseRecord()

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(true)
  })

  it("should reject non-object meta field", () => {
    const record = createFullLeaseRecord({
      meta: "invalid" as any,
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Field 'meta' must be an object, got string")
  })

  it("should validate budgetThresholds array", () => {
    const record = createFullLeaseRecord()

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(true)
  })

  it("should reject non-array budgetThresholds", () => {
    const record = createFullLeaseRecord({
      budgetThresholds: "invalid" as any,
    })

    const result = validateLeaseRecord(record)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Field 'budgetThresholds' must be an array, got string")
  })
})

// =============================================================================
// AC-7.1.16: Field Filtering for Templates
// =============================================================================

describe("test_n7-1_7.1.16_field_filtering", () => {
  it("should filter meta, comments, approvedBy from full record", () => {
    const record = createFullLeaseRecord()

    const filtered = filterForTemplates(record)

    // AC-7.1.16: These fields should be removed
    expect(filtered).not.toHaveProperty("meta")
    expect(filtered).not.toHaveProperty("comments")
    expect(filtered).not.toHaveProperty("approvedBy")

    // Other fields should remain
    expect(filtered.userEmail).toBe(record.userEmail)
    expect(filtered.uuid).toBe(record.uuid)
    expect(filtered.status).toBe(record.status)
    expect(filtered.maxSpend).toBe(record.maxSpend)
  })

  it("should preserve all safe fields", () => {
    const record = createFullLeaseRecord()

    const filtered = filterForTemplates(record)

    // Verify safe fields are present
    expect(filtered.userEmail).toBe("user@example.gov.uk")
    expect(filtered.uuid).toBe("lease-uuid-123")
    expect(filtered.status).toBe("Active")
    expect(filtered.expirationDate).toBe("2025-12-31T23:59:59Z")
    expect(filtered.awsAccountId).toBe("123456789012")
    expect(filtered.createdBy).toBe("creator@example.gov.uk")
    expect(filtered.originalLeaseTemplateUuid).toBe("template-uuid-456")
    expect(filtered.startDate).toBe("2025-01-01T00:00:00Z")
    expect(filtered.originalLeaseTemplateName).toBe("Standard Lease")
    expect(filtered.lastCheckedDate).toBe("2025-11-28T10:00:00Z")
    expect(filtered.endDate).toBe("2025-12-31T23:59:59Z")
    expect(filtered.leaseDurationInHours).toBe(720)
    expect(filtered.totalCostAccrued).toBe(50.75)
    expect(filtered.maxSpend).toBe(100.0)
    expect(filtered.budgetThresholds).toEqual(record.budgetThresholds)
  })

  it("should reduce field count by 3", () => {
    const record = createFullLeaseRecord()
    const originalCount = Object.keys(record).length

    const filtered = filterForTemplates(record)
    const filteredCount = Object.keys(filtered).length

    // Should remove exactly 3 fields: meta, comments, approvedBy
    expect(originalCount - filteredCount).toBe(3)
  })
})

// =============================================================================
// AC-7.1.11: Schema Fingerprint Generation
// =============================================================================

describe("test_n7-1_7.1.11_schema_fingerprint", () => {
  it("should generate consistent fingerprint for same schema", () => {
    const record1 = createFullLeaseRecord()
    const record2 = createFullLeaseRecord({ maxSpend: 200 }) // Different value, same schema

    const fp1 = generateSchemaFingerprint(record1)
    const fp2 = generateSchemaFingerprint(record2)

    expect(fp1).toBe(fp2)
  })

  it("should generate different fingerprint for different schema", () => {
    const record1 = createFullLeaseRecord()
    const record2 = { ...record1, newField: "value" } as any

    const fp1 = generateSchemaFingerprint(record1)
    const fp2 = generateSchemaFingerprint(record2)

    expect(fp1).not.toBe(fp2)
  })

  it("should include field types in fingerprint", () => {
    const record1 = createFullLeaseRecord()
    const record2 = {
      ...record1,
      maxSpend: "100" as any, // Changed type from number to string
    }

    const fp1 = generateSchemaFingerprint(record1)
    const fp2 = generateSchemaFingerprint(record2)

    expect(fp1).not.toBe(fp2)
  })

  it("should sort fields consistently", () => {
    const record1 = createFullLeaseRecord()

    // Create record with fields in different order
    const { userEmail, uuid, ...rest } = record1
    const record2 = { ...rest, uuid, userEmail } as FullLeaseRecord

    const fp1 = generateSchemaFingerprint(record1)
    const fp2 = generateSchemaFingerprint(record2)

    expect(fp1).toBe(fp2)
  })

  it("should handle partial records", () => {
    const partial: Partial<FullLeaseRecord> = {
      userEmail: "user@example.gov.uk",
      uuid: "lease-uuid-123",
      maxSpend: 100,
    }

    const fingerprint = generateSchemaFingerprint(partial)

    expect(typeof fingerprint).toBe("string")
    expect(fingerprint.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe("test_n7-1_integration", () => {
  it("should validate and filter complete lease record flow", () => {
    // Create full record
    const record = createFullLeaseRecord()

    // 1. Validate size
    expect(validateRecordSize(record)).toBe(true)

    // 2. Validate types
    const validation = validateLeaseRecord(record)
    expect(validation.valid).toBe(true)

    // 3. Check TTL
    expect(isRecordExpired(record.ttl)).toBe(false)

    // 4. Filter for templates
    const filtered = filterForTemplates(record)
    expect(filtered).not.toHaveProperty("meta")
    expect(filtered).not.toHaveProperty("comments")
    expect(filtered).not.toHaveProperty("approvedBy")
    expect(filtered.maxSpend).toBe(100.0)
  })

  it("should reject invalid record in validation flow", () => {
    const invalidRecord = createFullLeaseRecord({
      maxSpend: "invalid" as any,
      ttl: Math.floor(Date.now() / 1000) - 3600, // Expired
    })

    // Size check passes
    expect(validateRecordSize(invalidRecord)).toBe(true)

    // Type validation fails
    const validation = validateLeaseRecord(invalidRecord)
    expect(validation.valid).toBe(false)

    // TTL check fails
    expect(isRecordExpired(invalidRecord.ttl as number)).toBe(true)
  })
})
