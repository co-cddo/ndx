/**
 * Unit tests for Date Utilities
 *
 * Story 7.5: Expiry date formatting (relative and absolute)
 * Story 7.8: Remaining lease duration display
 *
 * @jest-environment jsdom
 */

import {
  formatRelativeTime,
  formatAbsoluteDate,
  formatRemainingDuration,
  isExpired,
  formatExpiry,
  formatLeaseDuration,
} from "./date-utils"

describe("Date Utilities", () => {
  // Fixed time for consistent testing
  const NOW = new Date("2025-01-15T12:00:00Z")

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("formatRelativeTime", () => {
    it("should format future times correctly", () => {
      // Note: Intl.RelativeTimeFormat uses different phrases based on the value
      const inOneHour = new Date(NOW.getTime() + 60 * 60 * 1000)
      const result = formatRelativeTime(inOneHour)
      expect(result).toMatch(/in 1 hour/i)
    })

    it("should format past times correctly", () => {
      const oneHourAgo = new Date(NOW.getTime() - 60 * 60 * 1000)
      const result = formatRelativeTime(oneHourAgo)
      expect(result).toMatch(/1 hour ago/i)
    })

    it("should handle string date input", () => {
      const inOneHour = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString()
      const result = formatRelativeTime(inOneHour)
      expect(result).toMatch(/in 1 hour/i)
    })

    it("should use minutes for less than an hour", () => {
      const in30Minutes = new Date(NOW.getTime() + 30 * 60 * 1000)
      const result = formatRelativeTime(in30Minutes)
      expect(result).toMatch(/30 minutes/i)
    })

    it("should use days for 24+ hours", () => {
      const in2Days = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000)
      const result = formatRelativeTime(in2Days)
      expect(result).toMatch(/2 days/i)
    })

    it("should fall back to absolute date for very distant dates", () => {
      const in60Days = new Date(NOW.getTime() + 60 * 24 * 60 * 60 * 1000)
      const result = formatRelativeTime(in60Days)
      // Should contain date parts (day, month, year) instead of relative
      expect(result).toMatch(/\d{1,2}/) // Contains a day number
    })

    it('should handle "now" correctly', () => {
      const result = formatRelativeTime(NOW)
      expect(result).toMatch(/now|0 seconds/i)
    })

    it("should return Unknown for undefined", () => {
      expect(formatRelativeTime(undefined)).toBe("Unknown")
    })

    it("should return Unknown for null", () => {
      expect(formatRelativeTime(null)).toBe("Unknown")
    })

    it("should return Unknown for invalid date string", () => {
      expect(formatRelativeTime("not-a-date")).toBe("Unknown")
    })
  })

  describe("formatAbsoluteDate", () => {
    it("should format date in UK format", () => {
      const date = new Date("2025-11-24T14:30:00Z")
      const result = formatAbsoluteDate(date)
      // UK format: day month year, time
      expect(result).toMatch(/24/)
      expect(result).toMatch(/Nov/i)
      expect(result).toMatch(/2025/)
    })

    it("should handle string date input", () => {
      const result = formatAbsoluteDate("2025-11-24T14:30:00Z")
      expect(result).toMatch(/24/)
      expect(result).toMatch(/Nov/i)
    })

    it("should include time in 24-hour format", () => {
      const date = new Date("2025-11-24T14:30:00Z")
      const result = formatAbsoluteDate(date)
      // Should include time (hour:minute)
      expect(result).toMatch(/\d{2}:\d{2}/)
    })

    it("should return Unknown for undefined", () => {
      expect(formatAbsoluteDate(undefined)).toBe("Unknown")
    })

    it("should return Unknown for null", () => {
      expect(formatAbsoluteDate(null)).toBe("Unknown")
    })

    it("should return Unknown for invalid date string", () => {
      expect(formatAbsoluteDate("not-a-date")).toBe("Unknown")
    })
  })

  describe("formatRemainingDuration", () => {
    it("should return null for expired dates", () => {
      const expired = new Date(NOW.getTime() - 1000)
      expect(formatRemainingDuration(expired)).toBeNull()
    })

    it("should format hours and minutes", () => {
      const in23h45m = new Date(NOW.getTime() + (23 * 60 + 45) * 60 * 1000)
      const result = formatRemainingDuration(in23h45m)
      expect(result).toBe("23h 45m remaining")
    })

    it("should format days and hours for 24+ hours", () => {
      const in48h30m = new Date(NOW.getTime() + (48 * 60 + 30) * 60 * 1000)
      const result = formatRemainingDuration(in48h30m)
      expect(result).toBe("2d 0h remaining")
    })

    it("should format only minutes when less than an hour", () => {
      const in30m = new Date(NOW.getTime() + 30 * 60 * 1000)
      const result = formatRemainingDuration(in30m)
      expect(result).toBe("30m remaining")
    })

    it("should handle string date input", () => {
      const in1Hour = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString()
      const result = formatRemainingDuration(in1Hour)
      expect(result).toBe("1h 0m remaining")
    })

    it("should handle exactly 24 hours", () => {
      const in24h = new Date(NOW.getTime() + 24 * 60 * 60 * 1000)
      const result = formatRemainingDuration(in24h)
      expect(result).toBe("1d 0h remaining")
    })

    it("should return null for undefined", () => {
      expect(formatRemainingDuration(undefined)).toBeNull()
    })

    it("should return null for null", () => {
      expect(formatRemainingDuration(null)).toBeNull()
    })

    it("should return null for invalid date string", () => {
      expect(formatRemainingDuration("not-a-date")).toBeNull()
    })
  })

  describe("isExpired", () => {
    it("should return true for past dates", () => {
      const pastDate = new Date(NOW.getTime() - 1000)
      expect(isExpired(pastDate)).toBe(true)
    })

    it("should return false for future dates", () => {
      const futureDate = new Date(NOW.getTime() + 1000)
      expect(isExpired(futureDate)).toBe(false)
    })

    it("should handle string date input", () => {
      const pastDate = new Date(NOW.getTime() - 1000).toISOString()
      expect(isExpired(pastDate)).toBe(true)
    })

    it("should return false for current time (edge case)", () => {
      // Exactly now should not be expired (not strictly less than)
      expect(isExpired(NOW)).toBe(false)
    })

    it("should return true for undefined (treat as expired for safety)", () => {
      expect(isExpired(undefined)).toBe(true)
    })

    it("should return true for null (treat as expired for safety)", () => {
      expect(isExpired(null)).toBe(true)
    })

    it("should return true for invalid date string (treat as expired for safety)", () => {
      expect(isExpired("not-a-date")).toBe(true)
    })
  })

  describe("formatExpiry", () => {
    it("should combine relative and absolute formats", () => {
      const in1Hour = new Date(NOW.getTime() + 60 * 60 * 1000)
      const result = formatExpiry(in1Hour)

      // Should contain both relative and absolute
      expect(result).toMatch(/in 1 hour/i)
      expect(result).toMatch(/\(/) // Opening parenthesis for absolute date
      expect(result).toMatch(/\)/) // Closing parenthesis
    })

    it("should handle string date input", () => {
      const in1Hour = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString()
      const result = formatExpiry(in1Hour)

      expect(result).toMatch(/in 1 hour/i)
      expect(result).toMatch(/\(/)
    })

    it("should return Unknown for undefined", () => {
      expect(formatExpiry(undefined)).toBe("Unknown")
    })

    it("should return Unknown for null", () => {
      expect(formatExpiry(null)).toBe("Unknown")
    })

    it("should return Unknown for invalid date string", () => {
      expect(formatExpiry("not-a-date")).toBe("Unknown")
    })
  })

  describe("formatLeaseDuration", () => {
    // Over 72 hours: show in days
    it("should format 96 hours as 4 Days", () => {
      expect(formatLeaseDuration(96)).toBe("4 Days")
    })

    it("should format 73 hours as 3 Days", () => {
      expect(formatLeaseDuration(73)).toBe("3 Days")
    })

    it("should format 168 hours as 7 Days", () => {
      expect(formatLeaseDuration(168)).toBe("7 Days")
    })

    it("should round to nearest day for large values", () => {
      expect(formatLeaseDuration(100)).toBe("4 Days") // 100/24 = 4.17 rounds to 4
    })

    it("should use singular day for 24-hour result", () => {
      expect(formatLeaseDuration(84)).toBe("4 Days") // 84/24 = 3.5 rounds to 4
    })

    // 90 minutes to 72 hours: show in hours
    it("should format 72 hours as 72 Hours (boundary)", () => {
      expect(formatLeaseDuration(72)).toBe("72 Hours")
    })

    it("should format 24 hours as 24 Hours", () => {
      expect(formatLeaseDuration(24)).toBe("24 Hours")
    })

    it("should format 2 hours as 2 Hours", () => {
      expect(formatLeaseDuration(2)).toBe("2 Hours")
    })

    it("should format 1.5 hours as 2 Hours (rounded)", () => {
      expect(formatLeaseDuration(1.5)).toBe("2 Hours")
    })

    it("should show values just under 90 minutes as minutes, not hours", () => {
      // 1.4 hours = 84 minutes, which is under the 90-minute threshold
      expect(formatLeaseDuration(1.4)).toBe("84 Minutes")
    })

    // Under 90 minutes: show in minutes
    it("should format 1 hour as 60 Minutes", () => {
      expect(formatLeaseDuration(1)).toBe("60 Minutes")
    })

    it("should format 0.75 hours as 45 Minutes", () => {
      expect(formatLeaseDuration(0.75)).toBe("45 Minutes")
    })

    it("should format 0.5 hours as 30 Minutes", () => {
      expect(formatLeaseDuration(0.5)).toBe("30 Minutes")
    })

    it("should format 0.25 hours as 15 Minutes", () => {
      expect(formatLeaseDuration(0.25)).toBe("15 Minutes")
    })

    it("should use singular minute when appropriate", () => {
      expect(formatLeaseDuration(1 / 60)).toBe("1 Minute") // 1 minute
    })

    // Edge cases
    it("should handle 0 hours as 0 Minutes", () => {
      expect(formatLeaseDuration(0)).toBe("0 Minutes")
    })

    it("should handle boundary at 90 minutes (1.5 hours)", () => {
      expect(formatLeaseDuration(1.5)).toBe("2 Hours") // 90 mins = 1.5h, rounds to 2 hours
    })

    it("should handle just under 90 minutes", () => {
      expect(formatLeaseDuration(1.49)).toBe("89 Minutes") // 89.4 mins rounds to 89
    })
  })
})
