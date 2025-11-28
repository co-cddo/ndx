/**
 * Idempotency Module for Notification System
 *
 * This module prevents duplicate email notifications using Lambda Powertools idempotency.
 * It integrates with DynamoDB to track processed events and detect replay attacks.
 *
 * Story: N5.7 - Idempotency with Lambda Powertools
 * ACs: 7.1-7.23
 *
 * Security Controls:
 * - AC-7.9: Namespace-prefixed idempotency keys prevent collision
 * - AC-7.10: Event age validation rejects stale events (>7 days)
 * - AC-7.12, AC-7.13, AC-7.14: Email verification on cache hit detects replay attacks
 *
 * @see docs/sprint-artifacts/tech-spec-epic-n5.md#Story-n5-7
 */

import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { PermanentError } from './errors';
import { hashForLog } from './ownership';
import type { ValidatedEvent } from './validation';

// =============================================================================
// Constants
// =============================================================================

/** AC-7.8: 7-day TTL covers max EventBridge replay + buffer */
export const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** AC-7.10: Max event age in milliseconds */
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** AC-7.9: Namespace prefix for idempotency keys */
const IDEMPOTENCY_NAMESPACE = 'ndx-notify';

/** Default schema version when not specified */
const DEFAULT_SCHEMA_VERSION = 'v1';

// =============================================================================
// Logger and Metrics
// =============================================================================

const logger = new Logger({ serviceName: 'ndx-notifications' });
const metrics = new Metrics({
  namespace: 'ndx/notifications',
  serviceName: 'ndx-notifications',
});

// =============================================================================
// Types
// =============================================================================

/**
 * Cached event data for verification on idempotency hit
 */
export interface CachedEventData {
  eventId: string;
  userEmail: string;
  eventType: string;
  schemaVersion: string;
  processedAt: string;
}

/**
 * Result of idempotency check
 */
export interface IdempotencyCheckResult {
  /** Whether the event is a duplicate */
  isDuplicate: boolean;
  /** Reason for skipping (if duplicate) */
  skipReason?: 'idempotency_hit' | 'event_too_old' | 'lease_window_skip';
  /** Cached event data (if duplicate found) */
  cachedEvent?: CachedEventData;
}

/**
 * Options for idempotency operations
 */
export interface IdempotencyOptions {
  /** DynamoDB table name for idempotency records */
  tableName: string;
  /** Override TTL for testing */
  ttlSeconds?: number;
}

// =============================================================================
// Idempotency Key Generation (AC-7.1, AC-7.9, AC-7.19)
// =============================================================================

/**
 * AC-7.9: Generate namespaced idempotency key
 * AC-7.19: Include schema version to prevent collision on schema change
 *
 * Format: ndx-notify:v1:abc123-def456-789012
 */
export function generateIdempotencyKey(
  eventId: string,
  schemaVersion: string = DEFAULT_SCHEMA_VERSION
): string {
  // AC-7.9: Namespace prefix prevents collision with other uses of the table
  // AC-7.19: Schema version prevents collision when event format changes
  return `${IDEMPOTENCY_NAMESPACE}:${schemaVersion}:${eventId}`;
}

/**
 * Extract components from an idempotency key
 */
export function parseIdempotencyKey(key: string): {
  namespace: string;
  schemaVersion: string;
  eventId: string;
} | null {
  const parts = key.split(':');
  if (parts.length !== 3) {
    return null;
  }
  return {
    namespace: parts[0],
    schemaVersion: parts[1],
    eventId: parts[2],
  };
}

// =============================================================================
// Event Age Validation (AC-7.10, AC-7.10b)
// =============================================================================

/**
 * AC-7.10: Check if event is too old to process
 * Events older than 7 days are rejected (no idempotency override)
 *
 * @param eventTimestamp - ISO 8601 timestamp from event
 * @returns true if event is too old, false if acceptable
 */
export function isEventTooOld(eventTimestamp: string): boolean {
  const eventTime = new Date(eventTimestamp).getTime();
  const age = Date.now() - eventTime;
  return age > MAX_EVENT_AGE_MS;
}

/**
 * Get event age in human-readable format
 */
export function getEventAge(eventTimestamp: string): string {
  const eventTime = new Date(eventTimestamp).getTime();
  const ageMs = Date.now() - eventTime;
  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ageMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h`;
}

/**
 * AC-7.10: Validate event age and skip if too old
 * Emits metrics and logs for observability
 */
export function validateEventAge(event: ValidatedEvent): boolean {
  if (isEventTooOld(event.timestamp)) {
    const age = getEventAge(event.timestamp);

    // AC-7.10: Log warning for stale event
    logger.warn('Event too old - skipping notification', {
      eventId: event.eventId,
      eventTimestamp: event.timestamp,
      eventAge: age,
      maxAge: '7d',
      action: 'skip',
    });

    // AC-7.7: Emit NotificationSkipped metric with reason
    metrics.addMetric('NotificationSkipped', MetricUnit.Count, 1);
    metrics.addDimension('SkipReason', 'event_too_old');

    // AC-7.17: Alert metric for events beyond TTL
    metrics.addMetric('StaleEventRejected', MetricUnit.Count, 1);

    return false; // Event is too old
  }

  return true; // Event age is acceptable
}

// =============================================================================
// Email Verification on Cache Hit (AC-7.12, AC-7.13, AC-7.14)
// =============================================================================

/**
 * AC-7.12, AC-7.13, AC-7.14: Verify email consistency on idempotency cache hit
 *
 * This is a critical security check to prevent replay attacks where an attacker
 * tries to reuse an event.id with a different target email.
 *
 * @throws PermanentError if email mismatch detected (potential replay attack)
 */
export function verifyEmailOnCacheHit(
  currentEvent: ValidatedEvent,
  cachedEvent: CachedEventData
): void {
  const currentEmail = extractUserEmail(currentEvent);
  const cachedEmail = cachedEvent.userEmail;

  if (currentEmail !== cachedEmail) {
    // AC-7.14: Log security alert
    logger.error('SECURITY ALERT: Idempotency key reused with different email', {
      eventId: currentEvent.eventId,
      cachedEmail: hashForLog(cachedEmail),
      currentEmail: hashForLog(currentEmail),
      cachedEventType: cachedEvent.eventType,
      currentEventType: currentEvent.eventType,
      securityWarning: 'potential replay attack',
    });

    // AC-7.15: Emit tampering metric
    metrics.addMetric('IdempotencyTampering', MetricUnit.Count, 1);

    // AC-7.13: Fail with SECURITY error
    throw new PermanentError('Email mismatch on idempotency check - potential replay attack', {
      eventId: currentEvent.eventId,
      securityIncident: true,
    });
  }

  logger.debug('Email verified on idempotency cache hit', {
    eventId: currentEvent.eventId,
    emailHash: hashForLog(currentEmail),
  });
}

/**
 * Extract user email from validated event
 */
function extractUserEmail(event: ValidatedEvent): string {
  const detail = event.detail as Record<string, unknown>;
  if (typeof detail.userEmail === 'string') {
    return detail.userEmail;
  }
  if (typeof detail.principalEmail === 'string') {
    return detail.principalEmail;
  }
  if (typeof detail.email === 'string') {
    return detail.email;
  }
  throw new PermanentError('No user email found in event', { eventId: event.eventId });
}

// =============================================================================
// Idempotency Check Logic (AC-7.7, AC-7.11)
// =============================================================================

/**
 * Check if event should be skipped due to idempotency or age
 *
 * @param event - Validated event to check
 * @param cachedEvent - Previously cached event data (if exists)
 * @returns IdempotencyCheckResult with skip decision
 */
export function checkIdempotency(
  event: ValidatedEvent,
  cachedEvent?: CachedEventData
): IdempotencyCheckResult {
  // AC-7.10: Check event age first
  if (!validateEventAge(event)) {
    return {
      isDuplicate: true,
      skipReason: 'event_too_old',
    };
  }

  // AC-7.11: Check for idempotency cache hit
  if (cachedEvent) {
    // AC-7.12: Verify email on cache hit (throws if mismatch)
    verifyEmailOnCacheHit(event, cachedEvent);

    // AC-7.7, AC-7.11: Log and emit metrics for duplicate
    logger.info('Duplicate event detected - skipping notification', {
      eventId: event.eventId,
      reason: 'idempotency_hit',
      originalProcessedAt: cachedEvent.processedAt,
    });

    metrics.addMetric('NotificationSkipped', MetricUnit.Count, 1);
    metrics.addDimension('SkipReason', 'duplicate');

    // AC-7.11: Split metric for idempotency hit
    metrics.addMetric('IdempotencyHit', MetricUnit.Count, 1);

    return {
      isDuplicate: true,
      skipReason: 'idempotency_hit',
      cachedEvent,
    };
  }

  // No duplicate detected
  return {
    isDuplicate: false,
  };
}

// =============================================================================
// Cache Data Creation
// =============================================================================

/**
 * Create cached event data for storage
 */
export function createCachedEventData(
  event: ValidatedEvent,
  schemaVersion: string = DEFAULT_SCHEMA_VERSION
): CachedEventData {
  return {
    eventId: event.eventId,
    userEmail: extractUserEmail(event),
    eventType: event.eventType,
    schemaVersion,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Calculate expiration timestamp for TTL
 */
export function calculateExpiration(ttlSeconds: number = IDEMPOTENCY_TTL_SECONDS): number {
  return Math.floor(Date.now() / 1000) + ttlSeconds;
}

// =============================================================================
// Lease-Level Deduplication Window (AC-7.11)
// =============================================================================

/**
 * AC-7.11: 60-second lease-level deduplication window
 * Prevents rapid-fire duplicate events for the same lease within 60 seconds
 */
const LEASE_DEDUP_WINDOW_MS = 60 * 1000; // 60 seconds

/**
 * Generate lease-level deduplication key
 * Format: ndx-notify:lease:userEmail:leaseUuid
 */
export function generateLeaseWindowKey(
  userEmail: string,
  leaseUuid: string
): string {
  return `${IDEMPOTENCY_NAMESPACE}:lease:${userEmail}:${leaseUuid}`;
}

/**
 * Check if event is within lease-level deduplication window
 */
export function isWithinLeaseWindow(
  lastProcessedAt: string | undefined,
  windowMs: number = LEASE_DEDUP_WINDOW_MS
): boolean {
  if (!lastProcessedAt) {
    return false;
  }

  const lastTime = new Date(lastProcessedAt).getTime();
  const elapsed = Date.now() - lastTime;

  if (elapsed < windowMs) {
    logger.info('Event within lease-level deduplication window', {
      lastProcessedAt,
      elapsedMs: elapsed,
      windowMs,
    });

    // AC-7.11: Emit LeaseWindowSkip metric
    metrics.addMetric('LeaseWindowSkip', MetricUnit.Count, 1);

    return true;
  }

  return false;
}

// =============================================================================
// Exports for Testing
// =============================================================================

export { MAX_EVENT_AGE_MS, LEASE_DEDUP_WINDOW_MS, IDEMPOTENCY_NAMESPACE, DEFAULT_SCHEMA_VERSION };
