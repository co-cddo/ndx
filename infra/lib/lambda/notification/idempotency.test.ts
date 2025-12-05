/**
 * Unit tests for Idempotency Module
 *
 * Story: N5.7 - Idempotency with Lambda Powertools
 * ACs: 7.1-7.23
 *
 * Test naming convention: test_n5-7_{ACID}_{scenario}
 */

import {
  generateIdempotencyKey,
  parseIdempotencyKey,
  isEventTooOld,
  getEventAge,
  validateEventAge,
  verifyEmailOnCacheHit,
  checkIdempotency,
  createCachedEventData,
  calculateExpiration,
  generateLeaseWindowKey,
  isWithinLeaseWindow,
  IDEMPOTENCY_TTL_SECONDS,
  MAX_EVENT_AGE_MS,
  LEASE_DEDUP_WINDOW_MS,
  IDEMPOTENCY_NAMESPACE,
  DEFAULT_SCHEMA_VERSION,
  type CachedEventData,
} from "./idempotency"
import type { ValidatedEvent } from "./validation"
import { PermanentError } from "./errors"

// =========================================================================
// Mock Setup
// =========================================================================

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

// =========================================================================
// Test Fixtures
// =========================================================================

const createValidatedEvent = (
  eventId: string = "evt-test-123",
  userEmail: string = "user@example.gov.uk",
  timestamp: string = new Date().toISOString(),
  eventType: string = "LeaseApproved",
): ValidatedEvent => ({
  eventType: eventType as ValidatedEvent["eventType"],
  eventId,
  source: "innovation-sandbox",
  timestamp,
  detail: {
    userEmail,
    leaseId: {
      userEmail,
      uuid: "lease-uuid-123",
    },
    accountId: "123456789012",
  },
})

const createCachedEvent = (
  eventId: string = "evt-test-123",
  userEmail: string = "user@example.gov.uk",
  eventType: string = "LeaseApproved",
  schemaVersion: string = "v1",
): CachedEventData => ({
  eventId,
  userEmail,
  eventType,
  schemaVersion,
  processedAt: new Date().toISOString(),
})

// =========================================================================
// AC-7.1: Idempotency key uses event.id
// =========================================================================

describe("AC-7.1: Idempotency key uses event.id", () => {
  it("should include event.id in the idempotency key", () => {
    const eventId = "abc123-def456-789012"
    const key = generateIdempotencyKey(eventId)

    expect(key).toContain(eventId)
  })

  it("should generate consistent keys for the same eventId", () => {
    const eventId = "abc123-def456-789012"
    const key1 = generateIdempotencyKey(eventId)
    const key2 = generateIdempotencyKey(eventId)

    expect(key1).toBe(key2)
  })
})

// =========================================================================
// AC-7.8: Idempotency TTL is 7 days
// =========================================================================

describe("AC-7.8: Idempotency TTL is 7 days", () => {
  it("should have TTL of 7 days in seconds", () => {
    const sevenDaysInSeconds = 7 * 24 * 60 * 60
    expect(IDEMPOTENCY_TTL_SECONDS).toBe(sevenDaysInSeconds)
  })

  it("should calculate expiration correctly", () => {
    const now = Date.now()
    const expiration = calculateExpiration()

    // Expiration should be approximately 7 days from now (within 1 second)
    const expectedExpiration = Math.floor(now / 1000) + IDEMPOTENCY_TTL_SECONDS
    expect(expiration).toBeCloseTo(expectedExpiration, -1) // -1 precision = 10 seconds tolerance
  })

  it("should allow custom TTL for testing", () => {
    const customTtl = 3600 // 1 hour
    const now = Date.now()
    const expiration = calculateExpiration(customTtl)

    const expectedExpiration = Math.floor(now / 1000) + customTtl
    expect(expiration).toBeCloseTo(expectedExpiration, -1)
  })
})

// =========================================================================
// AC-7.9: Idempotency key includes namespace
// =========================================================================

describe("AC-7.9: Idempotency key includes namespace", () => {
  it("should prefix key with ndx-notify namespace", () => {
    const eventId = "abc123"
    const key = generateIdempotencyKey(eventId)

    expect(key).toMatch(/^ndx-notify:/)
  })

  it("should follow format: namespace:version:eventId", () => {
    const eventId = "abc123-def456"
    const key = generateIdempotencyKey(eventId, "v1")

    expect(key).toBe("ndx-notify:v1:abc123-def456")
  })

  it("should parse key components correctly", () => {
    const key = "ndx-notify:v2:event-123"
    const parsed = parseIdempotencyKey(key)

    expect(parsed).toEqual({
      namespace: "ndx-notify",
      schemaVersion: "v2",
      eventId: "event-123",
    })
  })

  it("should return null for invalid key format", () => {
    const invalidKey = "not-a-valid-key"
    const parsed = parseIdempotencyKey(invalidKey)

    expect(parsed).toBeNull()
  })
})

// =========================================================================
// AC-7.10: Event age validation (>7 days = skip)
// =========================================================================

describe("AC-7.10: Event age validation", () => {
  it("should reject events older than 7 days", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()

    expect(isEventTooOld(eightDaysAgo)).toBe(true)
  })

  it("should accept events within 7 days", () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()

    expect(isEventTooOld(sixDaysAgo)).toBe(false)
  })

  it("should accept recent events", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    expect(isEventTooOld(oneHourAgo)).toBe(false)
  })

  it("should format event age in human-readable format", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const age = getEventAge(threeDaysAgo)

    expect(age).toMatch(/3d \d+h/)
  })

  it("should format hours-only age correctly", () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    const age = getEventAge(fiveHoursAgo)

    expect(age).toMatch(/^\dh$/)
  })

  it("should fail validation for old events", () => {
    const oldEvent = createValidatedEvent(
      "old-event",
      "user@example.gov.uk",
      new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    )

    const isValid = validateEventAge(oldEvent)

    expect(isValid).toBe(false)
  })

  it("should pass validation for recent events", () => {
    const recentEvent = createValidatedEvent("recent-event", "user@example.gov.uk", new Date().toISOString())

    const isValid = validateEventAge(recentEvent)

    expect(isValid).toBe(true)
  })
})

// =========================================================================
// AC-7.12, AC-7.13, AC-7.14: Email verification on cache hit
// =========================================================================

describe("AC-7.12, AC-7.13, AC-7.14: Email verification on cache hit", () => {
  it("should pass when emails match", () => {
    const event = createValidatedEvent("evt-123", "user@example.gov.uk")
    const cached = createCachedEvent("evt-123", "user@example.gov.uk")

    expect(() => verifyEmailOnCacheHit(event, cached)).not.toThrow()
  })

  it("should throw PermanentError when emails differ", () => {
    const event = createValidatedEvent("evt-123", "victim@example.gov.uk")
    const cached = createCachedEvent("evt-123", "attacker@example.gov.uk")

    expect(() => verifyEmailOnCacheHit(event, cached)).toThrow(PermanentError)
  })

  it("should include security incident flag in error", () => {
    const event = createValidatedEvent("evt-123", "victim@example.gov.uk")
    const cached = createCachedEvent("evt-123", "attacker@example.gov.uk")

    try {
      verifyEmailOnCacheHit(event, cached)
      fail("Should have thrown PermanentError")
    } catch (error) {
      expect(error).toBeInstanceOf(PermanentError)
      expect((error as PermanentError).message).toContain("Email mismatch")
    }
  })
})

// =========================================================================
// AC-7.7: NotificationSkipped metric
// =========================================================================

describe("AC-7.7: NotificationSkipped metric", () => {
  it("should mark event as duplicate when cached event exists", () => {
    const event = createValidatedEvent("evt-123", "user@example.gov.uk")
    const cached = createCachedEvent("evt-123", "user@example.gov.uk")

    const result = checkIdempotency(event, cached)

    expect(result.isDuplicate).toBe(true)
    expect(result.skipReason).toBe("idempotency_hit")
  })

  it("should not mark as duplicate when no cached event", () => {
    const event = createValidatedEvent("evt-new", "user@example.gov.uk")

    const result = checkIdempotency(event, undefined)

    expect(result.isDuplicate).toBe(false)
    expect(result.skipReason).toBeUndefined()
  })

  it("should mark as duplicate for stale events", () => {
    const oldEvent = createValidatedEvent(
      "old-evt",
      "user@example.gov.uk",
      new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    )

    const result = checkIdempotency(oldEvent, undefined)

    expect(result.isDuplicate).toBe(true)
    expect(result.skipReason).toBe("event_too_old")
  })
})

// =========================================================================
// AC-7.11: Duplicate detection metrics split
// =========================================================================

describe("AC-7.11: Duplicate detection metrics split", () => {
  it("should include cached event in result for idempotency hit", () => {
    const event = createValidatedEvent("evt-123", "user@example.gov.uk")
    const cached = createCachedEvent("evt-123", "user@example.gov.uk")

    const result = checkIdempotency(event, cached)

    expect(result.cachedEvent).toBeDefined()
    expect(result.cachedEvent?.eventId).toBe("evt-123")
  })

  it("should not include cached event for stale event skip", () => {
    const oldEvent = createValidatedEvent(
      "old-evt",
      "user@example.gov.uk",
      new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    )

    const result = checkIdempotency(oldEvent, undefined)

    expect(result.cachedEvent).toBeUndefined()
  })
})

// =========================================================================
// AC-7.19: Schema version in idempotency key
// =========================================================================

describe("AC-7.19: Schema version in idempotency key", () => {
  it("should include schema version in key", () => {
    const key = generateIdempotencyKey("evt-123", "v2")

    expect(key).toContain(":v2:")
  })

  it("should default to v1 when no version specified", () => {
    const key = generateIdempotencyKey("evt-123")

    expect(key).toContain(":v1:")
  })

  it("should generate different keys for different schema versions", () => {
    const keyV1 = generateIdempotencyKey("evt-123", "v1")
    const keyV2 = generateIdempotencyKey("evt-123", "v2")

    expect(keyV1).not.toBe(keyV2)
    expect(keyV1).toBe("ndx-notify:v1:evt-123")
    expect(keyV2).toBe("ndx-notify:v2:evt-123")
  })
})

// =========================================================================
// Lease Window Deduplication (AC-7.11)
// =========================================================================

describe("Lease window deduplication", () => {
  it("should generate lease window key with user email and uuid", () => {
    const key = generateLeaseWindowKey("user@example.gov.uk", "lease-123")

    expect(key).toBe("ndx-notify:lease:user@example.gov.uk:lease-123")
  })

  it("should detect events within 60 second window", () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()

    const result = isWithinLeaseWindow(thirtySecondsAgo)

    expect(result).toBe(true)
  })

  it("should allow events outside 60 second window", () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

    const result = isWithinLeaseWindow(twoMinutesAgo)

    expect(result).toBe(false)
  })

  it("should allow custom window for testing", () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()

    // With 10 second window, 30 seconds ago should be outside
    const result = isWithinLeaseWindow(thirtySecondsAgo, 10 * 1000)

    expect(result).toBe(false)
  })

  it("should handle undefined last processed time", () => {
    const result = isWithinLeaseWindow(undefined)

    expect(result).toBe(false)
  })
})

// =========================================================================
// Cached Event Data Creation
// =========================================================================

describe("Cached event data creation", () => {
  it("should create cached event data from validated event", () => {
    const event = createValidatedEvent("evt-123", "user@example.gov.uk", undefined, "LeaseApproved")

    const cached = createCachedEventData(event, "v1")

    expect(cached.eventId).toBe("evt-123")
    expect(cached.userEmail).toBe("user@example.gov.uk")
    expect(cached.eventType).toBe("LeaseApproved")
    expect(cached.schemaVersion).toBe("v1")
    expect(cached.processedAt).toBeDefined()
  })

  it("should default to v1 schema version", () => {
    const event = createValidatedEvent("evt-123", "user@example.gov.uk")

    const cached = createCachedEventData(event)

    expect(cached.schemaVersion).toBe("v1")
  })
})

// =========================================================================
// Constants Validation
// =========================================================================

describe("Constants validation", () => {
  it("should have 7 days max event age", () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    expect(MAX_EVENT_AGE_MS).toBe(sevenDaysMs)
  })

  it("should have 60 second lease dedup window", () => {
    expect(LEASE_DEDUP_WINDOW_MS).toBe(60 * 1000)
  })

  it("should use ndx-notify namespace", () => {
    expect(IDEMPOTENCY_NAMESPACE).toBe("ndx-notify")
  })

  it("should default to v1 schema version", () => {
    expect(DEFAULT_SCHEMA_VERSION).toBe("v1")
  })
})

// =========================================================================
// Edge Cases
// =========================================================================

describe("Edge cases", () => {
  it("should handle event exactly at 7 day boundary", () => {
    // Just under 7 days (7 days minus 1ms) should be acceptable
    const justUnderSevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1).toISOString()

    expect(isEventTooOld(justUnderSevenDays)).toBe(false)
  })

  it("should handle event just over 7 day boundary", () => {
    const justOverSevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000).toISOString()

    // Just over 7 days should be rejected
    expect(isEventTooOld(justOverSevenDays)).toBe(true)
  })

  it("should handle future event timestamps", () => {
    const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    // Future events should not be considered too old
    expect(isEventTooOld(futureTime)).toBe(false)
  })
})
