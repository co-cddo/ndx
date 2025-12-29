/**
 * Date Formatting Utilities
 *
 * Story 7.5: Expiry date formatting (relative and absolute)
 * Story 7.8: Remaining lease duration display
 * Story XX.X: Lease duration formatting for try buttons
 *
 * @module date-utils
 */

/**
 * Format a date as relative time (e.g., "in 2 hours", "3 days ago").
 *
 * @param date - Date to format (handles undefined/null gracefully)
 * @returns Relative time string, or "Unknown" if date is invalid
 *
 * @example
 * formatRelativeTime(new Date(Date.now() + 3600000)) // "in 1 hour"
 * formatRelativeTime(new Date(Date.now() - 86400000)) // "1 day ago"
 * formatRelativeTime(undefined) // "Unknown"
 */
export function formatRelativeTime(date: Date | string | undefined | null): string {
  if (date === undefined || date === null) {
    return "Unknown"
  }
  const targetDate = typeof date === "string" ? new Date(date) : date
  if (isNaN(targetDate.getTime())) {
    return "Unknown"
  }
  const now = new Date()
  const diffMs = targetDate.getTime() - now.getTime()
  const diffSecs = Math.round(diffMs / 1000)
  const diffMins = Math.round(diffSecs / 60)
  const diffHours = Math.round(diffMins / 60)
  const diffDays = Math.round(diffHours / 24)

  const rtf = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" })

  // Choose appropriate unit
  if (Math.abs(diffSecs) < 60) {
    return rtf.format(diffSecs, "second")
  } else if (Math.abs(diffMins) < 60) {
    return rtf.format(diffMins, "minute")
  } else if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour")
  } else if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, "day")
  } else {
    // Fall back to absolute date for very old/future dates
    return formatAbsoluteDate(targetDate)
  }
}

/**
 * Format a date as absolute (e.g., "24 Nov 2025, 14:30").
 *
 * @param date - Date to format (handles undefined/null gracefully)
 * @returns Absolute date string in UK format, or "Unknown" if date is invalid
 *
 * @example
 * formatAbsoluteDate(new Date('2025-11-24T14:30:00Z')) // "24 Nov 2025, 14:30"
 * formatAbsoluteDate(undefined) // "Unknown"
 */
export function formatAbsoluteDate(date: Date | string | undefined | null): string {
  if (date === undefined || date === null) {
    return "Unknown"
  }
  const targetDate = typeof date === "string" ? new Date(date) : date
  if (isNaN(targetDate.getTime())) {
    return "Unknown"
  }

  return targetDate.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

/**
 * Format remaining duration (e.g., "23h 45m remaining").
 *
 * @param expiresAt - Expiry date (handles undefined/null gracefully)
 * @returns Duration string, null if expired, or null if date is invalid
 *
 * @example
 * formatRemainingDuration(new Date(Date.now() + 85500000)) // "23h 45m remaining"
 * formatRemainingDuration(undefined) // null
 */
export function formatRemainingDuration(expiresAt: Date | string | undefined | null): string | null {
  if (expiresAt === undefined || expiresAt === null) {
    return null
  }
  const targetDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt
  if (isNaN(targetDate.getTime())) {
    return null
  }
  const now = new Date()
  const diffMs = targetDate.getTime() - now.getTime()

  if (diffMs <= 0) {
    return null // Expired
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h remaining`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }

  return `${minutes}m remaining`
}

/**
 * Check if a date is in the past.
 *
 * @param date - Date to check (handles undefined/null gracefully)
 * @returns true if date is in the past, or true if date is invalid (treat unknown as expired)
 */
export function isExpired(date: Date | string | undefined | null): boolean {
  if (date === undefined || date === null) {
    return true // Treat unknown dates as expired for safety
  }
  const targetDate = typeof date === "string" ? new Date(date) : date
  if (isNaN(targetDate.getTime())) {
    return true // Invalid date treated as expired
  }
  return targetDate.getTime() < Date.now()
}

/**
 * Format expiry with both relative and absolute.
 *
 * @param expiresAt - Expiry date (handles undefined/null gracefully)
 * @returns Combined format string, or "Unknown" if date is invalid
 *
 * @example
 * formatExpiry(new Date(Date.now() + 3600000))
 * // "in 1 hour (24 Nov 2025, 15:30)"
 * formatExpiry(undefined) // "Unknown"
 */
export function formatExpiry(expiresAt: Date | string | undefined | null): string {
  if (expiresAt === undefined || expiresAt === null) {
    return "Unknown"
  }
  const relative = formatRelativeTime(expiresAt)
  const absolute = formatAbsoluteDate(expiresAt)
  if (relative === "Unknown" || absolute === "Unknown") {
    return "Unknown"
  }
  return `${relative} (${absolute})`
}

/**
 * Format lease duration with smart unit selection.
 *
 * Selects the most appropriate unit based on the duration:
 * - Over 72 hours: show in days (e.g., "4 Days")
 * - 90 minutes to 72 hours: show in hours (e.g., "24 Hours")
 * - Under 90 minutes: show in minutes (e.g., "45 Minutes")
 *
 * @param hours - Duration in hours (can be fractional)
 * @returns Formatted duration string with capitalized unit
 *
 * @example
 * formatLeaseDuration(96)   // "4 Days"
 * formatLeaseDuration(24)   // "24 Hours"
 * formatLeaseDuration(1)    // "60 Minutes"
 * formatLeaseDuration(0.75) // "45 Minutes"
 */
export function formatLeaseDuration(hours: number): string {
  const totalMinutes = hours * 60

  // Over 72 hours: show in days
  if (hours > 72) {
    const days = Math.round(hours / 24)
    return `${days} ${days === 1 ? "Day" : "Days"}`
  }

  // 90 minutes to 72 hours: show in hours
  if (totalMinutes >= 90) {
    const roundedHours = Math.round(hours)
    return `${roundedHours} ${roundedHours === 1 ? "Hour" : "Hours"}`
  }

  // Under 90 minutes: show in minutes
  const minutes = Math.round(totalMinutes)
  return `${minutes} ${minutes === 1 ? "Minute" : "Minutes"}`
}
