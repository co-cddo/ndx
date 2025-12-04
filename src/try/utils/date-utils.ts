/**
 * Date Formatting Utilities
 *
 * Story 7.5: Expiry date formatting (relative and absolute)
 * Story 7.8: Remaining lease duration display
 *
 * @module date-utils
 */

/**
 * Format a date as relative time (e.g., "in 2 hours", "3 days ago").
 *
 * @param date - Date to format
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime(new Date(Date.now() + 3600000)) // "in 1 hour"
 * formatRelativeTime(new Date(Date.now() - 86400000)) // "1 day ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const targetDate = typeof date === "string" ? new Date(date) : date
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
 * @param date - Date to format
 * @returns Absolute date string in UK format
 *
 * @example
 * formatAbsoluteDate(new Date('2025-11-24T14:30:00Z')) // "24 Nov 2025, 14:30"
 */
export function formatAbsoluteDate(date: Date | string): string {
  const targetDate = typeof date === "string" ? new Date(date) : date

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
 * @param expiresAt - Expiry date
 * @returns Duration string or null if expired
 *
 * @example
 * formatRemainingDuration(new Date(Date.now() + 85500000)) // "23h 45m remaining"
 */
export function formatRemainingDuration(expiresAt: Date | string): string | null {
  const targetDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt
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
 * @param date - Date to check
 * @returns true if date is in the past
 */
export function isExpired(date: Date | string): boolean {
  const targetDate = typeof date === "string" ? new Date(date) : date
  return targetDate.getTime() < Date.now()
}

/**
 * Format expiry with both relative and absolute.
 *
 * @param expiresAt - Expiry date
 * @returns Combined format string
 *
 * @example
 * formatExpiry(new Date(Date.now() + 3600000))
 * // "in 1 hour (24 Nov 2025, 15:30)"
 */
export function formatExpiry(expiresAt: Date | string): string {
  const relative = formatRelativeTime(expiresAt)
  const absolute = formatAbsoluteDate(expiresAt)
  return `${relative} (${absolute})`
}
