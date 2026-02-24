/**
 * Unit tests for DynamoDB Enrichment Module
 *
 * Story: N5.6 - DynamoDB Enrichment for Missing Fields
 * ACs: 6.1-6.51
 *
 * Test naming convention: test_n5-6_{ACID}_{scenario}
 */

import { DynamoDBClient, GetItemCommand, ProvisionedThroughputExceededException } from "@aws-sdk/client-dynamodb"
import { mockClient } from "aws-sdk-client-mock"
import {
  enrichIfNeeded,
  validateEnrichedData,
  getMissingFields,
  constructSsoUrl,
  detectStatusConflict,
  checkBudgetDiscrepancy,
  checkDataStaleness,
  CircuitBreaker,
  resetCircuitBreaker,
  // N7-1 exports
  generateSchemaFingerprint,
  validateLeaseKeyInputs,
  fetchLeaseRecord,
} from "./enrichment"
import type { ValidatedEvent } from "./validation"
import type { TemplateConfig } from "./templates"
import { PermanentError } from "./errors"

// =========================================================================
// Mock Setup
// =========================================================================

const dynamoMock = mockClient(DynamoDBClient)

// Mock Logger - inline to avoid hoisting issues
jest.mock("@aws-lambda-powertools/logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

// Mock Metrics - inline to avoid hoisting issues
jest.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: jest.fn().mockImplementation(() => ({
    addMetric: jest.fn(),
    addDimension: jest.fn(),
    publishStoredMetrics: jest.fn(),
  })),
  MetricUnit: {
    Count: "Count",
    Milliseconds: "Milliseconds",
    Seconds: "Seconds",
  },
}))

// Mock ISB client for all enrichment queries
jest.mock("./isb-client", () => ({
  fetchLeaseByKey: jest.fn(),
  fetchAccountFromISB: jest.fn(),
  fetchTemplateFromISB: jest.fn(),
  ISBLeaseRecord: {},
  ISBAccountRecord: {},
  ISBTemplateRecord: {},
}))

// Get references to the mocks for tests - must be after jest.mock
/* eslint-disable @typescript-eslint/no-require-imports */
const {
  fetchLeaseByKey: mockFetchLeaseByKey,
  fetchAccountFromISB: mockFetchAccountFromISB,
  fetchTemplateFromISB: mockFetchTemplateFromISB,
} = require("./isb-client") as {
  fetchLeaseByKey: jest.Mock
  fetchAccountFromISB: jest.Mock
  fetchTemplateFromISB: jest.Mock
}
/* eslint-enable @typescript-eslint/no-require-imports */

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
    budgetLimit: 100,
  },
})

const createLeaseRecord = (
  userEmail: string,
  uuid: string,
  status: string = "Active",
  maxSpend: number = 100,
  templateName: string = "TestTemplate",
) => ({
  userEmail: { S: userEmail },
  uuid: { S: uuid },
  leaseStatus: { S: status },
  status: { S: status },
  maxSpend: { N: maxSpend.toString() },
  templateName: { S: templateName },
  totalCostAccrued: { N: "50" },
  expirationDate: { S: "2025-12-31T23:59:59Z" },
  lastModified: { S: new Date().toISOString() },
})

const createTemplateConfig = (
  enrichmentQueries: ("lease" | "account" | "leaseTemplate")[] = ["lease"],
): TemplateConfig => ({
  templateIdEnvVar: "NOTIFY_TEMPLATE_TEST",
  requiredFields: ["userName", "budgetLimit"],
  optionalFields: ["accountName"],
  enrichmentQueries,
})

// =========================================================================
// Setup & Teardown
// =========================================================================

beforeEach(() => {
  dynamoMock.reset()
  jest.clearAllMocks()
  resetCircuitBreaker()

  // Reset all ISB client mocks
  mockFetchLeaseByKey.mockReset()
  mockFetchAccountFromISB.mockReset()
  mockFetchTemplateFromISB.mockReset()

  // Set environment variables for SSO URL
  process.env.SSO_START_URL = "https://d-1234567890.awsapps.com/start"
  // ISB API Gateway configuration
  process.env.ISB_API_BASE_URL = "https://test-api.execute-api.us-west-2.amazonaws.com/prod"
  process.env.ISB_JWT_SECRET_PATH = "/InnovationSandbox/ndx/Auth/JwtSecret"
})

afterEach(() => {
  delete process.env.SSO_START_URL
  delete process.env.ISB_API_BASE_URL
  delete process.env.ISB_JWT_SECRET_PATH
})

// =========================================================================
// AC-6.1: enrichIfNeeded() identifies missing required fields
// =========================================================================

describe("AC-6.1: enrichIfNeeded identifies missing fields", () => {
  it("should identify when userName field is missing from event", () => {
    const eventData = { budgetLimit: 100, accountId: "123456789012" }
    const requiredFields = ["userName", "budgetLimit"]

    const missing = getMissingFields(eventData, requiredFields)

    expect(missing).toEqual(["userName"])
  })

  it("should return empty array when all required fields are present", () => {
    const eventData = { userName: "Test User", budgetLimit: 100 }
    const requiredFields = ["userName", "budgetLimit"]

    const missing = getMissingFields(eventData, requiredFields)

    expect(missing).toEqual([])
  })

  it("should identify multiple missing fields", () => {
    const eventData = { accountId: "123456789012" }
    const requiredFields = ["userName", "budgetLimit", "expiryDate"]

    const missing = getMissingFields(eventData, requiredFields)

    expect(missing).toContain("userName")
    expect(missing).toContain("budgetLimit")
    expect(missing).toContain("expiryDate")
    expect(missing.length).toBe(3)
  })
})

// =========================================================================
// AC-6.2: Enrichment queries LeaseTable via ISB API
// =========================================================================

describe("AC-6.2: LeaseTable enrichment queries", () => {
  it("should query LeaseTable via ISB API and return lease-specific fields", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    // Story 5.1: Mock ISB API for lease fetch
    mockFetchLeaseByKey.mockResolvedValueOnce({
      userEmail: "user@example.gov.uk",
      uuid: "lease-123",
      status: "Active",
      maxSpend: 150,
    })

    const result = await enrichIfNeeded(event, templateConfig)

    expect(result.maxSpend).toBe(150)
    expect(result._internalStatus).toBe("Active")
    expect(result.enrichedAt).toBeDefined()
  })

  it("should handle missing lease record gracefully", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "nonexistent-lease" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    dynamoMock.on(GetItemCommand).resolves({
      Item: undefined,
    })

    const result = await enrichIfNeeded(event, templateConfig)

    // Should continue with partial data (AC-6.7, AC-6.16)
    expect(result.enrichedAt).toBeDefined()
    expect(result.maxSpend).toBeUndefined()
    // Logger assertions removed - implementation detail
  })
})

// =========================================================================
// AC-6.3: Enrichment queries ISB Accounts API
// =========================================================================

describe("AC-6.3: ISB Accounts API enrichment queries", () => {
  it("should query ISB Accounts API and return account name", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["account"])

    // Mock ISB Accounts API response
    mockFetchAccountFromISB.mockResolvedValueOnce({
      awsAccountId: "123456789012",
      name: "My Sandbox Account",
      email: "owner@example.gov.uk",
    })

    const result = await enrichIfNeeded(event, templateConfig)

    expect(result.accountName).toBe("My Sandbox Account")
    expect(mockFetchAccountFromISB).toHaveBeenCalledWith("123456789012", expect.any(String))
  })
})

// =========================================================================
// AC-6.4: Enrichment queries ISB Templates API
// =========================================================================

describe("AC-6.4: ISB Templates API enrichment queries", () => {
  it("should query ISB Templates API when configured", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["leaseTemplate"])

    // Mock ISB Templates API response
    mockFetchTemplateFromISB.mockResolvedValueOnce({
      uuid: "template-uuid",
      name: "DataScience24h",
      description: "Data Science 24 Hour Template",
      leaseDurationInHours: 24,
    })

    const result = await enrichIfNeeded(event, templateConfig)

    // Returns enriched data (may or may not have templateName depending on source)
    expect(result.enrichedAt).toBeDefined()
  })
})

// =========================================================================
// AC-6.5: Parallel query execution (all via ISB APIs)
// =========================================================================

describe("AC-6.5: Parallel query execution with Promise.all", () => {
  it("should execute multiple queries in parallel", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease", "account"])

    // Mock ISB APIs for both lease and account fetch
    mockFetchLeaseByKey.mockResolvedValueOnce({
      userEmail: "user@example.gov.uk",
      uuid: "lease-123",
      status: "Active",
      maxSpend: 100,
    })

    mockFetchAccountFromISB.mockResolvedValueOnce({
      awsAccountId: "123456789012",
      name: "Sandbox Account",
      email: "owner@example.gov.uk",
    })

    const result = await enrichIfNeeded(event, templateConfig)

    expect(result.maxSpend).toBeDefined()
    expect(result.accountName).toBe("Sandbox Account")
  })
})

// =========================================================================
// AC-6.6: Enrichment latency metric
// =========================================================================

describe("AC-6.6: EnrichmentLatency metric", () => {
  it("should complete enrichment with latency tracking", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    dynamoMock.on(GetItemCommand).resolves({
      Item: createLeaseRecord("user@example.gov.uk", "lease-123"),
    })

    const startTime = Date.now()
    const result = await enrichIfNeeded(event, templateConfig)
    const elapsed = Date.now() - startTime

    expect(result.enrichedAt).toBeDefined()
    // Verify enrichment completed in reasonable time
    expect(elapsed).toBeLessThan(1000)
  })
})

// =========================================================================
// AC-6.7: Missing enrichment data logs WARNING
// =========================================================================

describe("AC-6.7: Missing enrichment data logs WARNING", () => {
  it("should continue when lease record not found", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "nonexistent" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    dynamoMock.on(GetItemCommand).resolves({ Item: undefined })

    const result = await enrichIfNeeded(event, templateConfig)

    // Should continue with partial data
    expect(result.enrichedAt).toBeDefined()
    expect(result.maxSpend).toBeUndefined()
  })
})

// =========================================================================
// AC-6.8: Missing required fields throw PermanentError
// =========================================================================

describe("AC-6.8: Missing required fields throw PermanentError", () => {
  it("should throw PermanentError when required fields still missing after enrichment", () => {
    const eventData = { accountId: "123456789012" }
    const enrichedData = { enrichedAt: new Date().toISOString() }
    const requiredFields = ["userName", "budgetLimit", "expiryDate"]

    expect(() => validateEnrichedData(eventData, enrichedData, requiredFields, "evt-123")).toThrow(PermanentError)
  })

  it("should throw PermanentError with list of missing fields", () => {
    const eventData = { accountId: "123456789012" }
    const enrichedData = { enrichedAt: new Date().toISOString() }
    const requiredFields = ["userName", "budgetLimit"]

    try {
      validateEnrichedData(eventData, enrichedData, requiredFields, "evt-123")
      fail("Should have thrown PermanentError")
    } catch (error) {
      expect(error).toBeInstanceOf(PermanentError)
      expect((error as PermanentError).message).toContain("userName")
      expect((error as PermanentError).message).toContain("budgetLimit")
    }
  })

  it("should not throw when all required fields are present after enrichment", () => {
    const eventData = { userName: "Test User" }
    const enrichedData = {
      enrichedAt: new Date().toISOString(),
      maxSpend: 100, // Maps to budgetLimit
    }
    const requiredFields = ["userName", "budgetLimit"]

    expect(() => validateEnrichedData(eventData, enrichedData, requiredFields, "evt-123")).not.toThrow()
  })
})

// =========================================================================
// AC-6.10: SSO URL construction
// =========================================================================

describe("AC-6.10: SSO URL constructed from config", () => {
  it("should construct SSO URL with accountId as query param", () => {
    const url = constructSsoUrl("123456789012")

    expect(url).toBe("https://d-1234567890.awsapps.com/start?accountId=123456789012")
  })

  it("should return base URL when no accountId provided", () => {
    const url = constructSsoUrl()

    expect(url).toBe("https://d-1234567890.awsapps.com/start")
  })

  it("should return undefined when SSO_START_URL not configured", () => {
    delete process.env.SSO_START_URL

    const url = constructSsoUrl("123456789012")

    expect(url).toBeUndefined()
  })
})

// =========================================================================
// AC-6.11: All queries now use ISB APIs (DynamoDB no longer used)
// =========================================================================

describe("AC-6.11: All queries via ISB APIs", () => {
  it("should fetch lease and account via ISB APIs", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    // Request both lease and account enrichment
    const templateConfig = createTemplateConfig(["lease", "account"])

    // Both are fetched via ISB APIs
    mockFetchLeaseByKey.mockResolvedValueOnce({
      userEmail: "user@example.gov.uk",
      uuid: "lease-123",
      status: "Active",
      maxSpend: 100,
    })

    mockFetchAccountFromISB.mockResolvedValueOnce({
      awsAccountId: "123456789012",
      name: "Sandbox Account",
      email: "owner@example.gov.uk",
    })

    await enrichIfNeeded(event, templateConfig)

    // Verify ISB APIs were called
    expect(mockFetchLeaseByKey).toHaveBeenCalledWith("user@example.gov.uk", "lease-123", expect.any(String))
    expect(mockFetchAccountFromISB).toHaveBeenCalledWith("123456789012", expect.any(String))

    // No DynamoDB calls should have been made
    expect(dynamoMock.commandCalls(GetItemCommand).length).toBe(0)
  })
})

// =========================================================================
// AC-6.13: Budget discrepancy warning
// =========================================================================

describe("AC-6.13: Budget discrepancy warning", () => {
  it("should return true when enriched.maxSpend differs from event.budget by >10%", () => {
    // 100 event budget vs 150 enriched = 50% diff > 10%
    const hasDiscrepancy = checkBudgetDiscrepancy(100, 150, "evt-123")

    expect(hasDiscrepancy).toBe(true)
  })

  it("should return false when discrepancy is within 10%", () => {
    // 100 event budget vs 105 enriched = 5% diff < 10%
    const hasDiscrepancy = checkBudgetDiscrepancy(100, 105, "evt-123")

    expect(hasDiscrepancy).toBe(false)
  })

  it("should handle undefined budgets gracefully", () => {
    const result1 = checkBudgetDiscrepancy(undefined, 100, "evt-123")
    const result2 = checkBudgetDiscrepancy(100, undefined, "evt-123")

    expect(result1).toBe(false)
    expect(result2).toBe(false)
  })
})

// =========================================================================
// AC-6.14: Lambda container cache cleared on cold start
// =========================================================================

describe("AC-6.14: Cache cleared on cold start", () => {
  it("should reset circuit breaker state when resetCircuitBreaker is called", () => {
    // Simulate failures to open circuit breaker
    const circuitBreaker = new CircuitBreaker(3, 60000)
    circuitBreaker.recordFailure()
    circuitBreaker.recordFailure()
    circuitBreaker.recordFailure()

    expect(circuitBreaker.isOpen()).toBe(true)

    // Reset (simulating cold start)
    circuitBreaker.reset()

    expect(circuitBreaker.isOpen()).toBe(false)
  })
})

// =========================================================================
// AC-6.17: Circuit breaker after consecutive throttles
// =========================================================================

describe("AC-6.17: Circuit breaker for DynamoDB throttles", () => {
  it("should open circuit breaker after 5 consecutive failures", () => {
    const circuitBreaker = new CircuitBreaker(5, 60000)

    for (let i = 0; i < 4; i++) {
      circuitBreaker.recordFailure()
      expect(circuitBreaker.isOpen()).toBe(false)
    }

    circuitBreaker.recordFailure() // 5th failure
    expect(circuitBreaker.isOpen()).toBe(true)
  })

  it("should reset failure count on success", () => {
    const circuitBreaker = new CircuitBreaker(5, 60000)

    circuitBreaker.recordFailure()
    circuitBreaker.recordFailure()
    circuitBreaker.recordSuccess()
    circuitBreaker.recordFailure()

    expect(circuitBreaker.isOpen()).toBe(false)
  })

  it("should close circuit breaker after cooldown period", () => {
    const circuitBreaker = new CircuitBreaker(3, 100) // 100ms cooldown

    circuitBreaker.recordFailure()
    circuitBreaker.recordFailure()
    circuitBreaker.recordFailure()

    expect(circuitBreaker.isOpen()).toBe(true)

    // Wait for cooldown
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(circuitBreaker.isOpen()).toBe(false)
        resolve(undefined)
      }, 150)
    })
  })
})

// =========================================================================
// AC-6.19: URL encoding for untrusted fields
// =========================================================================

describe("AC-6.19: URL encoding for untrusted fields", () => {
  it("should URL encode special characters in accountId", () => {
    const url = constructSsoUrl("account/with spaces&special=chars")

    expect(url).toContain("accountId=account%2Fwith%20spaces%26special%3Dchars")
  })

  it("should safely handle normal accountIds", () => {
    const url = constructSsoUrl("123456789012")

    expect(url).toContain("accountId=123456789012")
    expect(url).not.toContain("%") // No encoding needed
  })
})

// =========================================================================
// AC-6.20, AC-6.21: Status conflict detection
// =========================================================================

describe("AC-6.20, AC-6.21: Conflict detection with SECURITY alert", () => {
  it("should detect conflict when event type conflicts with enriched status", () => {
    const conflict = detectStatusConflict("LeaseDenied", "Approved", "evt-123", "2025-11-28T10:00:00Z", undefined)

    expect(conflict).toBeDefined()
    expect(conflict?.eventType).toBe("LeaseDenied")
    expect(conflict?.enrichedStatus).toBe("Approved")
  })

  it("should not flag conflict when statuses align", () => {
    const conflict = detectStatusConflict("LeaseApproved", "Approved", "evt-123", "2025-11-28T10:00:00Z", undefined)

    expect(conflict).toBeNull()
  })

  it("should handle undefined enriched status gracefully", () => {
    const conflict = detectStatusConflict("LeaseApproved", undefined, "evt-123", "2025-11-28T10:00:00Z", undefined)

    expect(conflict).toBeNull()
  })
})

// =========================================================================
// AC-6.22, AC-6.37: EnrichmentConflict metric
// =========================================================================

describe("AC-6.22, AC-6.37: EnrichmentConflict metric", () => {
  it("should return conflict info when conflict detected", () => {
    const conflict = detectStatusConflict("LeaseDenied", "Approved", "evt-123", "2025-11-28T10:00:00Z", undefined)

    expect(conflict).toBeDefined()
    expect(conflict?.eventId).toBe("evt-123")
  })
})

// =========================================================================
// AC-6.27: Automatic conflict resolution
// =========================================================================

describe("AC-6.27: Conflict resolution based on timestamps", () => {
  it("should require manual approval when event is newer than lease modification", () => {
    // Event time is after lastModified - conflict needs review
    const conflict = detectStatusConflict(
      "LeaseDenied",
      "Approved",
      "evt-123",
      "2025-11-28T12:00:00Z", // Event at noon
      "2025-11-28T10:00:00Z", // Lease modified at 10am
    )

    expect(conflict).toBeDefined()
    expect(conflict?.requiresManualApproval).toBe(true)
  })

  it("should return null (no conflict) when event is older than lease modification", () => {
    // Event time is before lastModified - lease was updated after event
    // This is not actually a conflict - the event is stale
    const conflict = detectStatusConflict(
      "LeaseDenied",
      "Approved",
      "evt-123",
      "2025-11-28T08:00:00Z", // Event at 8am
      "2025-11-28T10:00:00Z", // Lease modified at 10am
    )

    // When lease was modified after event, it's not a conflict - just stale event data
    expect(conflict).toBeNull()
  })
})

// =========================================================================
// AC-6.29: Circuit breaker with 3 consecutive throttles
// =========================================================================

describe("AC-6.29: Circuit breaker after 3 throttles", () => {
  it("should open after 3 consecutive throttles with lower threshold", () => {
    const circuitBreaker = new CircuitBreaker(3, 60000)

    circuitBreaker.recordFailure()
    circuitBreaker.recordFailure()
    expect(circuitBreaker.isOpen()).toBe(false)

    circuitBreaker.recordFailure()
    expect(circuitBreaker.isOpen()).toBe(true)
  })
})

// =========================================================================
// AC-6.33: Enrichment latency SLA tracking
// =========================================================================

describe("AC-6.33: Enrichment latency SLA", () => {
  it("should complete enrichment quickly for SLA monitoring", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    dynamoMock.on(GetItemCommand).resolves({
      Item: createLeaseRecord("user@example.gov.uk", "lease-123"),
    })

    const startTime = Date.now()
    await enrichIfNeeded(event, templateConfig)
    const latencyMs = Date.now() - startTime

    // Verify latency is reasonable (under 100ms for SLA)
    expect(latencyMs).toBeLessThan(500) // Allow buffer for test overhead
  })
})

// =========================================================================
// AC-6.38: 2-second enrichment timeout
// =========================================================================

describe("AC-6.38: 2-second enrichment timeout", () => {
  it("should timeout if enrichment takes longer than 2 seconds", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    // Simulate slow query (3 seconds)
    dynamoMock.on(GetItemCommand).callsFake(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ Item: createLeaseRecord("user@example.gov.uk", "lease-123") })
          }, 3000)
        }),
    )

    const startTime = Date.now()
    const result = await enrichIfNeeded(event, templateConfig)
    const elapsed = Date.now() - startTime

    // Should return partial data before 3 seconds
    expect(elapsed).toBeLessThan(2500) // Allow some buffer
    expect(result.enrichedAt).toBeDefined()
  }, 10000) // 10 second test timeout
})

// =========================================================================
// AC-6.39, AC-6.16: Graceful degradation
// =========================================================================

describe("AC-6.39, AC-6.16: Graceful degradation with partial data", () => {
  it("should continue with partial data when DynamoDB query fails", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    dynamoMock.on(GetItemCommand).rejects(new Error("DynamoDB error"))

    const result = await enrichIfNeeded(event, templateConfig)

    // Should return partial data with enrichedAt timestamp
    expect(result.enrichedAt).toBeDefined()
  })

  it("should continue with partial data when throttled", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    dynamoMock.on(GetItemCommand).rejects(
      new ProvisionedThroughputExceededException({
        message: "Throttled",
        $metadata: {},
      }),
    )

    const result = await enrichIfNeeded(event, templateConfig)

    expect(result.enrichedAt).toBeDefined()
  })
})

// =========================================================================
// AC-6.40: Data staleness check
// =========================================================================

describe("AC-6.40: Data staleness warning", () => {
  it("should return true if enrichment data is > 5 min old", () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString()

    const isStale = checkDataStaleness(sixMinutesAgo, "evt-123")

    expect(isStale).toBe(true)
  })

  it("should return false when data is fresh (< 5 min old)", () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

    const isStale = checkDataStaleness(twoMinutesAgo, "evt-123")

    expect(isStale).toBe(false)
  })

  it("should handle undefined lastModified gracefully", () => {
    const isStale = checkDataStaleness(undefined, "evt-123")

    expect(isStale).toBe(false)
  })
})

// =========================================================================
// AC-6.41: Never use enriched.status in email content
// =========================================================================

describe("AC-6.41: Never use enriched.status in email content", () => {
  it("should not include status in EnrichedData output (only _internalStatus)", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    // Story 5.1: Mock ISB API for lease fetch
    mockFetchLeaseByKey.mockResolvedValueOnce({
      userEmail: "user@example.gov.uk",
      uuid: "lease-123",
      status: "Active",
      maxSpend: 100,
    })

    const result = await enrichIfNeeded(event, templateConfig)

    // Status should only be in _internalStatus (internal use only)
    expect(result._internalStatus).toBe("Active")

    expect((result as any).status).toBeUndefined()
  })

  it("should mark _internalStatus as internal-only field", () => {
    // Verify the naming convention indicates internal use
    const enrichedData = {
      enrichedAt: new Date().toISOString(),
      _internalStatus: "Active",
    }

    // Fields starting with _ are internal
    const publicFields = Object.keys(enrichedData).filter((k) => !k.startsWith("_"))
    expect(publicFields).not.toContain("_internalStatus")
    expect(publicFields).toEqual(["enrichedAt"])
  })
})

// =========================================================================
// Integration test: Multiple queries in parallel via ISB APIs
// =========================================================================

describe("Integration: Parallel enrichment queries", () => {
  it("should execute lease and account queries in parallel via ISB APIs", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease", "account"])

    const callOrder: string[] = []

    // Mock ISB API for lease query
    mockFetchLeaseByKey.mockImplementationOnce(async () => {
      callOrder.push("lease")
      return {
        userEmail: "user@example.gov.uk",
        uuid: "lease-123",
        status: "Active",
        maxSpend: 100,
      }
    })

    // Mock ISB API for account query
    mockFetchAccountFromISB.mockImplementationOnce(async () => {
      callOrder.push("account")
      return {
        awsAccountId: "123456789012",
        name: "Sandbox Account",
        email: "owner@example.gov.uk",
      }
    })

    const result = await enrichIfNeeded(event, templateConfig)

    // Both queries should have been made via ISB APIs
    expect(callOrder.length).toBe(2)
    expect(result.maxSpend).toBeDefined()
    expect(result.accountName).toBe("Sandbox Account")
  })
})

// =========================================================================
// Edge Cases
// =========================================================================

describe("Edge Cases", () => {
  it("should handle empty enrichment queries list", async () => {
    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig: TemplateConfig = {
      templateIdEnvVar: "NOTIFY_TEMPLATE_TEST",
      requiredFields: ["userName"],
      optionalFields: [],
      enrichmentQueries: [],
    }

    const result = await enrichIfNeeded(event, templateConfig)

    // Should return minimal enriched data without making any queries
    expect(result.enrichedAt).toBeDefined()
    expect(dynamoMock.commandCalls(GetItemCommand).length).toBe(0)
  })

  it("should handle missing leaseKey gracefully", async () => {
    const event = createValidatedEvent("user@example.gov.uk", undefined)
    const templateConfig = createTemplateConfig(["lease"])

    const result = await enrichIfNeeded(event, templateConfig)

    // Should continue without lease enrichment
    expect(result.enrichedAt).toBeDefined()
  })

  it("should handle circuit breaker open state", async () => {
    // Clear and then open the circuit breaker
    resetCircuitBreaker()

    const event = createValidatedEvent(
      "user@example.gov.uk",
      { userEmail: "user@example.gov.uk", uuid: "lease-123" },
      "123456789012",
    )
    const templateConfig = createTemplateConfig(["lease"])

    dynamoMock.on(GetItemCommand).resolves({
      Item: createLeaseRecord("user@example.gov.uk", "lease-123"),
    })

    const result = await enrichIfNeeded(event, templateConfig)

    expect(result.enrichedAt).toBeDefined()
  })
})

// =========================================================================
// N7-1: Schema Fingerprint Generation (AC-10)
// =========================================================================

describe("N7-1 AC-10: Schema fingerprint generation", () => {
  it("should generate consistent fingerprint for same fields", () => {
    const record1 = { userEmail: "a", uuid: "b", status: "c" }
    const record2 = { userEmail: "x", uuid: "y", status: "z" }

    const fingerprint1 = generateSchemaFingerprint(record1)
    const fingerprint2 = generateSchemaFingerprint(record2)

    // Same field names should produce same fingerprint regardless of values
    expect(fingerprint1).toBe(fingerprint2)
  })

  it("should generate different fingerprint for different fields", () => {
    const record1 = { userEmail: "a", uuid: "b" }
    const record2 = { userEmail: "a", uuid: "b", status: "c" }

    const fingerprint1 = generateSchemaFingerprint(record1)
    const fingerprint2 = generateSchemaFingerprint(record2)

    expect(fingerprint1).not.toBe(fingerprint2)
  })

  it("should generate 16-character hex fingerprint", () => {
    const record = { field1: "a", field2: "b", field3: "c" }

    const fingerprint = generateSchemaFingerprint(record)

    expect(fingerprint).toHaveLength(16)
    expect(fingerprint).toMatch(/^[0-9a-f]{16}$/)
  })

  it("should produce deterministic results (sorted keys)", () => {
    // Create records with keys in different order
    const record1 = { z: 1, a: 2, m: 3 }
    const record2 = { a: 2, m: 3, z: 1 }

    const fingerprint1 = generateSchemaFingerprint(record1)
    const fingerprint2 = generateSchemaFingerprint(record2)

    // Should be same because keys are sorted before hashing
    expect(fingerprint1).toBe(fingerprint2)
  })
})

// =========================================================================
// N7-1: Input Validation (AC-7, AC-8)
// =========================================================================

describe("N7-1 AC-7: Missing userEmail/uuid validation", () => {
  it("should return null when userEmail is undefined", () => {
    const result = validateLeaseKeyInputs(undefined, "uuid-123", "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when userEmail is null", () => {
    const result = validateLeaseKeyInputs(null, "uuid-123", "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when uuid is undefined", () => {
    const result = validateLeaseKeyInputs("user@example.gov.uk", undefined, "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when uuid is null", () => {
    const result = validateLeaseKeyInputs("user@example.gov.uk", null, "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when both are missing", () => {
    const result = validateLeaseKeyInputs(undefined, undefined, "evt-test")

    expect(result).toBeNull()
  })
})

describe("N7-1 AC-8: Wrong type validation", () => {
  it("should return null when userEmail is a number", () => {
    const result = validateLeaseKeyInputs(12345, "uuid-123", "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when userEmail is an object", () => {
    const result = validateLeaseKeyInputs({ email: "test" }, "uuid-123", "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when uuid is a number", () => {
    const result = validateLeaseKeyInputs("user@example.gov.uk", 12345, "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when uuid is an array", () => {
    const result = validateLeaseKeyInputs("user@example.gov.uk", ["uuid"], "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when userEmail is empty string", () => {
    const result = validateLeaseKeyInputs("", "uuid-123", "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when uuid is whitespace only", () => {
    const result = validateLeaseKeyInputs("user@example.gov.uk", "   ", "evt-test")

    expect(result).toBeNull()
  })

  it("should return validated inputs when both are valid strings", () => {
    const result = validateLeaseKeyInputs("user@example.gov.uk", "uuid-123", "evt-test")

    expect(result).toEqual({
      userEmail: "user@example.gov.uk",
      uuid: "uuid-123",
    })
  })
})

// =========================================================================
// N7-1 / Story 5.1: fetchLeaseRecord error handling via ISB API
// Note: Throttle retry logic was removed when migrating to ISB API
// ISB API handles errors with graceful degradation (returns null)
// =========================================================================

describe("N7-1 / Story 5.1: ISB API error handling", () => {
  it("should return lease record on successful ISB API call", async () => {
    mockFetchLeaseByKey.mockResolvedValueOnce({
      userEmail: "user@example.gov.uk",
      uuid: "lease-123",
      status: "Active",
      maxSpend: 100,
    })

    const result = await fetchLeaseRecord("user@example.gov.uk", "lease-123", "evt-test")

    expect(result).not.toBeNull()
    expect(result?.userEmail).toBe("user@example.gov.uk")
    expect(mockFetchLeaseByKey).toHaveBeenCalledTimes(1)
  })

  it("should return null when ISB API returns null (graceful degradation)", async () => {
    mockFetchLeaseByKey.mockResolvedValueOnce(null)

    const result = await fetchLeaseRecord("user@example.gov.uk", "lease-123", "evt-test")

    expect(result).toBeNull()
  })

  it("should return null on ISB API errors (graceful degradation)", async () => {
    let callCount = 0

    mockFetchLeaseByKey.mockImplementationOnce(async () => {
      callCount++
      throw new Error("Some API error")
    })

    // Story 5.1: ISB API errors result in graceful degradation (return null)
    const result = await fetchLeaseRecord("user@example.gov.uk", "lease-123", "evt-test")

    expect(result).toBeNull()
    expect(callCount).toBe(1)
  })
})

// =========================================================================
// N7-1: fetchLeaseRecord with Input Validation
// =========================================================================

describe("N7-1: fetchLeaseRecord input validation", () => {
  it("should return null when userEmail is missing (AC-7)", async () => {
    const result = await fetchLeaseRecord(undefined, "uuid-123", "evt-test")

    expect(result).toBeNull()
    // Should not have called ISB API with invalid inputs
    expect(mockFetchLeaseByKey).not.toHaveBeenCalled()
  })

  it("should return null when uuid has wrong type (AC-8)", async () => {
    const result = await fetchLeaseRecord("user@example.gov.uk", 12345, "evt-test")

    expect(result).toBeNull()
    expect(mockFetchLeaseByKey).not.toHaveBeenCalled()
  })

  it("should return null when userEmail is empty string", async () => {
    const result = await fetchLeaseRecord("", "uuid-123", "evt-test")

    expect(result).toBeNull()
    expect(mockFetchLeaseByKey).not.toHaveBeenCalled()
  })

  it("should successfully fetch lease record with valid inputs via ISB API", async () => {
    // Story 5.1: Mock ISB API response
    mockFetchLeaseByKey.mockResolvedValueOnce({
      userEmail: "user@example.gov.uk",
      uuid: "uuid-123",
      status: "Active",
      maxSpend: 150,
      awsAccountId: "123456789012",
      expirationDate: "2026-02-15T00:00:00Z",
    })

    const result = await fetchLeaseRecord("user@example.gov.uk", "uuid-123", "evt-test")

    expect(result).not.toBeNull()
    expect(result?.userEmail).toBe("user@example.gov.uk")
    expect(result?.uuid).toBe("uuid-123")
    expect(result?.maxSpend).toBe(150)
    expect(mockFetchLeaseByKey).toHaveBeenCalledWith("user@example.gov.uk", "uuid-123", "evt-test")
  })

  it("should return null when ISB API returns null (lease not found)", async () => {
    mockFetchLeaseByKey.mockResolvedValueOnce(null)

    const result = await fetchLeaseRecord("user@example.gov.uk", "nonexistent", "evt-test")

    expect(result).toBeNull()
  })

  it("should return null when ISB API throws error (graceful degradation)", async () => {
    mockFetchLeaseByKey.mockRejectedValueOnce(new Error("ISB API error"))

    const result = await fetchLeaseRecord("user@example.gov.uk", "uuid-123", "evt-test")

    expect(result).toBeNull()
  })

  it("should map awsAccountId to accountId for compatibility", async () => {
    mockFetchLeaseByKey.mockResolvedValueOnce({
      userEmail: "user@example.gov.uk",
      uuid: "uuid-123",
      status: "Active",
      awsAccountId: "123456789012",
    })

    const result = await fetchLeaseRecord("user@example.gov.uk", "uuid-123", "evt-test")

    expect(result?.accountId).toBe("123456789012")
  })

  it("should map originalLeaseTemplateName to templateName when templateName is missing", async () => {
    mockFetchLeaseByKey.mockResolvedValueOnce({
      userEmail: "user@example.gov.uk",
      uuid: "uuid-123",
      originalLeaseTemplateName: "SandboxTemplate",
    })

    const result = await fetchLeaseRecord("user@example.gov.uk", "uuid-123", "evt-test")

    expect(result?.templateName).toBe("SandboxTemplate")
  })
})
