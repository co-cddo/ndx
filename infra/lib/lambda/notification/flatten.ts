/**
 * Payload Flattening Utility for Notification System
 *
 * Flattens nested DynamoDB lease records into flat key-value pairs
 * compatible with GOV.UK Notify and Slack APIs.
 *
 * Story: N7-2 - Payload Flattening Utility
 * FRs: FR-ENRICH-7 to FR-ENRICH-18
 *
 * @see docs/epics-notifications.md#Story-7.2
 */

import { Logger } from "@aws-lambda-powertools/logger"
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics"

// =============================================================================
// Constants
// =============================================================================

/** FR-ENRICH-8: Underscore separator for nested keys */
export const SEPARATOR = "_"

/** N7-2 AC-7: Maximum nesting depth (deeper values logged and skipped) */
export const MAX_DEPTH = 5

/** N7-2 AC-8: Maximum array items before truncation */
export const MAX_ARRAY_ITEMS = 10

/** N7-2 AC-9: Maximum payload size in bytes (50KB safety margin for Slack/Notify) */
export const MAX_PAYLOAD_SIZE_BYTES = 50 * 1024

/** N7-3 AC-9: Maximum keys parameter length in characters */
export const MAX_KEYS_LENGTH = 5000

/** N7-3: Keys field name (used for exclusion from keys list) */
export const KEYS_FIELD_NAME = "keys"

// =============================================================================
// Logger and Metrics
// =============================================================================

const logger = new Logger({ serviceName: "ndx-notifications" })
const metrics = new Metrics({
  namespace: "ndx/notifications",
  serviceName: "ndx-notifications",
})

// =============================================================================
// Types
// =============================================================================

export type FlattenedPayload = Record<string, string>
export type InputValue = unknown

export interface FlattenOptions {
  /** Maximum nesting depth (default: 5) */
  maxDepth?: number
  /** Maximum array items before truncation (default: 10) */
  maxArrayItems?: number
  /** Separator for nested keys (default: '_') */
  separator?: string
  /** Event ID for logging correlation */
  eventId?: string
}

export interface FlattenResult {
  /** Flattened key-value pairs */
  flattened: FlattenedPayload
  /** Number of fields that were truncated due to depth limit */
  truncatedByDepth: number
  /** Number of array items that were truncated */
  truncatedArrayItems: number
  /** Total size in bytes of the flattened payload */
  sizeBytes: number
  /** Whether the payload was truncated due to size limit */
  truncatedBySize: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a value is a plain object (not null, not array, not Date)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date)
}

/**
 * Check if a value is a primitive that can be stringified
 */
function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
}

/**
 * Convert a value to string representation
 * N7-3 AC-1-4: Stringification rules
 */
export function stringifyValue(value: unknown): string | null {
  // N7-3 AC-5, AC-6: Skip null and undefined
  if (value === null || value === undefined) {
    return null
  }

  // N7-3 AC-3: Strings remain unchanged
  if (typeof value === "string") {
    return value
  }

  // N7-3 AC-1: Numbers become strings
  if (typeof value === "number") {
    return String(value)
  }

  // N7-3 AC-2: Booleans become strings
  if (typeof value === "boolean") {
    return String(value)
  }

  // Date objects converted to ISO 8601 strings (N7-3 AC-5 from Story 7.3)
  if (value instanceof Date) {
    return value.toISOString()
  }

  // For any other type, return null (skip)
  return null
}

/**
 * Calculate the approximate size in bytes of a flattened payload
 */
export function calculatePayloadSize(payload: FlattenedPayload): number {
  let size = 2 // Opening and closing braces {}
  let isFirst = true

  for (const [key, value] of Object.entries(payload)) {
    if (!isFirst) {
      size += 1 // Comma
    }
    isFirst = false

    // Key with quotes and colon
    size += key.length + 3 // "key":

    // Value with quotes
    size += value.length + 2 // "value"
  }

  return size
}

// =============================================================================
// Core Flattening Function
// =============================================================================

/**
 * Flatten a nested object into a flat key-value structure.
 *
 * FR-ENRICH-7: Flatten nested objects with underscore separator
 * FR-ENRICH-8: Handle multiple nesting levels
 * FR-ENRICH-12-18: Flatten arrays of objects and primitives
 * N7-2 AC-7: Max depth limit of 5 levels
 * N7-2 AC-8: Arrays with > 10 items are truncated
 * N7-2 AC-5: Empty arrays produce no output fields
 *
 * @param obj - The object to flatten
 * @param options - Flattening options
 * @returns FlattenResult with flattened payload and metadata
 */
export function flattenObject(obj: Record<string, unknown>, options: FlattenOptions = {}): FlattenResult {
  const { maxDepth = MAX_DEPTH, maxArrayItems = MAX_ARRAY_ITEMS, separator = SEPARATOR, eventId = "unknown" } = options

  const result: FlattenedPayload = {}
  let truncatedByDepth = 0
  let truncatedArrayItems = 0

  /**
   * Recursive helper to flatten values
   */
  function flatten(value: unknown, prefix: string, depth: number): void {
    // N7-2 AC-7: Check depth limit
    if (depth > maxDepth) {
      truncatedByDepth++
      logger.warn("Flattening depth limit exceeded - skipping value", {
        eventId,
        prefix,
        depth,
        maxDepth,
      })
      return
    }

    // Handle null/undefined - skip
    if (value === null || value === undefined) {
      return
    }

    // Handle primitives and dates
    if (isPrimitive(value) || value instanceof Date) {
      const stringValue = stringifyValue(value)
      if (stringValue !== null) {
        result[prefix] = stringValue
      }
      return
    }

    // Handle arrays
    if (Array.isArray(value)) {
      // N7-2 AC-5: Empty arrays produce no output fields
      if (value.length === 0) {
        return
      }

      // N7-2 AC-8: Truncate arrays with > maxArrayItems
      const itemsToProcess = value.slice(0, maxArrayItems)
      if (value.length > maxArrayItems) {
        truncatedArrayItems += value.length - maxArrayItems
        // Add count field to show total
        result[`${prefix}${separator}count`] = String(value.length)
        logger.debug("Array truncated due to size limit", {
          eventId,
          prefix,
          totalItems: value.length,
          processedItems: maxArrayItems,
        })
      }

      // FR-ENRICH-12-17: Flatten each array item with index notation
      itemsToProcess.forEach((item, index) => {
        const indexedPrefix = `${prefix}${separator}${index}`
        flatten(item, indexedPrefix, depth + 1)
      })

      return
    }

    // Handle plain objects
    if (isPlainObject(value)) {
      // FR-ENRICH-7: Flatten nested objects with underscore separator
      for (const [key, nestedValue] of Object.entries(value)) {
        const nestedPrefix = prefix ? `${prefix}${separator}${key}` : key
        flatten(nestedValue, nestedPrefix, depth + 1)
      }
      return
    }

    // Unknown type - log and skip
    logger.debug("Unknown value type during flattening - skipping", {
      eventId,
      prefix,
      valueType: typeof value,
    })
  }

  // Start flattening from root
  for (const [key, value] of Object.entries(obj)) {
    flatten(value, key, 1)
  }

  // Calculate payload size
  const sizeBytes = calculatePayloadSize(result)

  // N7-2 AC-9, AC-10: Check size limit and truncate if needed
  let truncatedBySize = false
  if (sizeBytes > MAX_PAYLOAD_SIZE_BYTES) {
    truncatedBySize = true
    logger.warn("Flattened payload exceeds size limit - truncating", {
      eventId,
      sizeBytes,
      maxBytes: MAX_PAYLOAD_SIZE_BYTES,
    })
    metrics.addMetric("PayloadTruncatedBySize", MetricUnit.Count, 1)

    // N7-2 AC-10: Remove enriched fields progressively (largest first)
    truncatePayloadToSize(result, MAX_PAYLOAD_SIZE_BYTES, eventId)
  }

  // Log metrics
  metrics.addMetric("FlattenedFieldCount", MetricUnit.Count, Object.keys(result).length)
  if (truncatedByDepth > 0) {
    metrics.addMetric("FlattenTruncatedByDepth", MetricUnit.Count, truncatedByDepth)
  }
  if (truncatedArrayItems > 0) {
    metrics.addMetric("FlattenTruncatedArrayItems", MetricUnit.Count, truncatedArrayItems)
  }

  return {
    flattened: result,
    truncatedByDepth,
    truncatedArrayItems,
    sizeBytes: calculatePayloadSize(result),
    truncatedBySize,
  }
}

/**
 * N7-2 AC-10: Truncate payload by removing largest fields until under size limit.
 * Prioritizes removing enriched fields (containing '_') over root-level fields.
 */
export function truncatePayloadToSize(payload: FlattenedPayload, maxBytes: number, eventId: string): void {
  // Sort fields by value length (largest first), prioritizing nested fields
  const sortedKeys = Object.keys(payload).sort((a, b) => {
    // Prioritize removing nested fields (containing separator)
    const aIsNested = a.includes(SEPARATOR)
    const bIsNested = b.includes(SEPARATOR)

    if (aIsNested && !bIsNested) return -1
    if (!aIsNested && bIsNested) return 1

    // Then by value length (largest first)
    return (payload[b]?.length || 0) - (payload[a]?.length || 0)
  })

  let removedCount = 0
  for (const key of sortedKeys) {
    if (calculatePayloadSize(payload) <= maxBytes) {
      break
    }

    delete payload[key]
    removedCount++
  }

  if (removedCount > 0) {
    logger.warn("Removed fields to meet size limit", {
      eventId,
      removedCount,
      finalSize: calculatePayloadSize(payload),
    })
  }
}

/**
 * Convenience function to flatten and return just the flattened payload.
 * Use flattenObject() when you need metadata about truncation.
 */
export function flatten(obj: Record<string, unknown>, options: FlattenOptions = {}): FlattenedPayload {
  return flattenObject(obj, options).flattened
}

// =============================================================================
// Keys Parameter Generation (Story N7-3)
// =============================================================================

/**
 * Generate the keys parameter containing a comma-separated list of all field names.
 *
 * N7-3 AC-7: Keys field is added containing comma-separated list of all field names
 * N7-3 AC-8: Keys are sorted alphabetically for consistent ordering
 * N7-3 AC-9: Keys field does not include itself in the list
 * N7-3 AC-9: Keys parameter is truncated to 5000 characters if exceeded (with "..." suffix)
 * N7-3 AC-10: Keys count is logged for monitoring payload growth over time
 *
 * @param payload - The flattened payload
 * @param eventId - Event ID for logging correlation
 * @returns The keys parameter string
 */
export function generateKeys(payload: FlattenedPayload, eventId: string = "unknown"): string {
  // N7-3 AC-9: Exclude the keys field itself from the list
  const keys = Object.keys(payload)
    .filter((key) => key !== KEYS_FIELD_NAME)
    // N7-3 AC-8: Sort alphabetically for consistent ordering
    .sort()

  // N7-3 AC-10: Log keys count for monitoring
  logger.debug("Generating keys parameter", {
    eventId,
    keyCount: keys.length,
  })
  metrics.addMetric("PayloadKeyCount", MetricUnit.Count, keys.length)

  const keysString = keys.join(",")

  // N7-3 AC-9: Truncate to MAX_KEYS_LENGTH if exceeded
  if (keysString.length > MAX_KEYS_LENGTH) {
    logger.warn("Keys parameter truncated due to length limit", {
      eventId,
      originalLength: keysString.length,
      maxLength: MAX_KEYS_LENGTH,
    })
    metrics.addMetric("KeysParameterTruncated", MetricUnit.Count, 1)
    return keysString.substring(0, MAX_KEYS_LENGTH - 3) + "..."
  }

  return keysString
}

/**
 * Add the keys parameter to a flattened payload.
 *
 * @param payload - The flattened payload
 * @param eventId - Event ID for logging correlation
 * @returns The payload with keys field added
 */
export function addKeysParameter(payload: FlattenedPayload, eventId: string = "unknown"): FlattenedPayload {
  const keys = generateKeys(payload, eventId)
  return {
    ...payload,
    [KEYS_FIELD_NAME]: keys,
  }
}

// =============================================================================
// Merge Utilities
// =============================================================================

/**
 * Merge event data with enriched lease data.
 * N7-4 AC-1: Enriched data takes precedence over event data for duplicate fields.
 *
 * @param eventData - Original event data
 * @param enrichedData - Enriched data from DynamoDB
 * @returns Merged flattened payload
 */
export function mergeWithEnriched(
  eventData: Record<string, unknown>,
  enrichedData: Record<string, unknown>,
  options: FlattenOptions = {},
): FlattenedPayload {
  // Flatten both objects
  const flatEvent = flattenObject(eventData, options).flattened
  const flatEnriched = flattenObject(enrichedData, options).flattened

  // N7-4 AC-1: Enriched data takes precedence (spread order matters)
  return {
    ...flatEvent,
    ...flatEnriched,
  }
}

/**
 * Merge event data with enriched lease data and add the keys parameter.
 * This is the primary function for preparing notification payloads.
 *
 * N7-3 AC-11: Keys parameter is included in all payloads
 * N7-4 AC-1: Enriched data takes precedence over event data
 *
 * @param eventData - Original event data
 * @param enrichedData - Enriched data from DynamoDB
 * @param options - Flattening options
 * @returns Merged flattened payload with keys field
 */
export function prepareNotificationPayload(
  eventData: Record<string, unknown>,
  enrichedData: Record<string, unknown>,
  options: FlattenOptions = {},
): FlattenedPayload {
  // Merge event and enriched data
  const merged = mergeWithEnriched(eventData, enrichedData, options)

  // Add keys parameter
  return addKeysParameter(merged, options.eventId)
}
