/**
 * DynamoDB LeaseTable Record Types and Validation
 *
 * Story: N7.1 - DynamoDB Integration Setup
 * ACs: 7.1.11, 7.1.12, 7.1.13, 7.1.14, 7.1.15, 7.1.16, 7.1.21
 *
 * This module defines the complete LeaseTable schema from ISB and provides
 * validation and filtering functions for safe template usage.
 *
 * @see docs/sprint-artifacts/stories/n7-1-dynamodb-integration-setup.md
 */

import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'ndx-notifications' });

// =============================================================================
// Constants
// =============================================================================

/** AC-7.1.12: Maximum DynamoDB item size (128KB with buffer) */
const MAX_RECORD_SIZE_BYTES = 128 * 1024;

/** Fields to filter out before passing to templates (AC-7.1.16) */
const FILTERED_FIELDS = ['meta', 'comments', 'approvedBy'] as const;

// =============================================================================
// Types
// =============================================================================

/**
 * AC-7.1.11: Nested meta object structure
 * Contains audit timestamps and schema versioning
 */
export interface LeaseRecordMeta {
  lastEditTime?: string;
  createdTime?: string;
  schemaVersion?: string | number;
}

/**
 * AC-7.1.11: Budget threshold configuration
 * Defines spending alert thresholds for the lease
 */
export interface BudgetThreshold {
  threshold?: number;
  percentage?: number;
  alertEnabled?: boolean;
}

/**
 * AC-7.1.11, AC-7.1.21: Complete LeaseTable record schema
 * Matches ISB DynamoDB table structure (18 fields total)
 *
 * Contract test validates all fields exist (AC-7.1.21)
 */
export interface FullLeaseRecord {
  // Primary Key (AC-7.1.1)
  userEmail: string;
  uuid: string;

  // Required string fields (AC-7.1.13)
  status: string;
  expirationDate: string;
  approvedBy: string;
  awsAccountId: string;
  createdBy: string;
  originalLeaseTemplateUuid: string;
  startDate: string;
  originalLeaseTemplateName: string;
  lastCheckedDate: string;
  endDate: string;

  // Required numeric fields (AC-7.1.14)
  leaseDurationInHours: number;
  totalCostAccrued: number;
  maxSpend: number;
  ttl: number; // Unix timestamp for auto-deletion (AC-7.1.15)

  // Complex fields
  meta: LeaseRecordMeta;
  budgetThresholds: BudgetThreshold[];
  comments: string;
}

/**
 * AC-7.1.16: Filtered lease record safe for template personalization
 * Excludes sensitive/internal fields: meta, comments, approvedBy
 */
export type SafeLeaseRecord = Omit<FullLeaseRecord, typeof FILTERED_FIELDS[number]>;

/**
 * Validation result with details
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * AC-7.1.12: Validate DynamoDB record size is within limits
 * DynamoDB has a 400KB item limit, but we use 128KB for safety
 *
 * @param record - The lease record to validate
 * @returns true if record is within size limits
 */
export function validateRecordSize(record: unknown): boolean {
  // Handle null/undefined gracefully - they're empty and within limits
  if (record === null || record === undefined) {
    return true;
  }

  try {
    const jsonSize = Buffer.byteLength(JSON.stringify(record), 'utf8');

    if (jsonSize >= MAX_RECORD_SIZE_BYTES) {
      logger.warn('LeaseRecord exceeds size limit', {
        sizeBytes: jsonSize,
        limitBytes: MAX_RECORD_SIZE_BYTES,
        sizeMB: (jsonSize / 1024 / 1024).toFixed(2),
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Failed to validate record size', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * AC-7.1.15: Check if lease record has expired based on TTL
 * Returns true if the record should be considered expired
 *
 * @param ttl - Unix timestamp (seconds since epoch)
 * @returns true if TTL has passed (record expired)
 */
export function isRecordExpired(ttl: number | undefined): boolean {
  if (ttl === undefined) {
    // No TTL means no expiration
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
  return ttl < currentTime;
}

/**
 * AC-7.1.13, AC-7.1.14: Validate lease record field types
 * Ensures required string fields are strings and numeric fields are numbers
 *
 * @param record - Partial lease record to validate
 * @returns ValidationResult with errors if any
 */
export function validateLeaseRecord(record: Partial<FullLeaseRecord>): ValidationResult {
  const errors: string[] = [];

  // AC-7.1.13: Validate required string fields
  const stringFields: (keyof FullLeaseRecord)[] = [
    'userEmail',
    'uuid',
    'status',
    'expirationDate',
    'approvedBy',
    'awsAccountId',
    'createdBy',
    'originalLeaseTemplateUuid',
    'startDate',
    'originalLeaseTemplateName',
    'lastCheckedDate',
    'endDate',
    'comments',
  ];

  for (const field of stringFields) {
    const value = record[field];
    if (value !== undefined && typeof value !== 'string') {
      errors.push(`Field '${field}' must be a string, got ${typeof value}`);
    }
  }

  // AC-7.1.14: Validate required numeric fields
  const numericFields: (keyof FullLeaseRecord)[] = [
    'leaseDurationInHours',
    'totalCostAccrued',
    'maxSpend',
    'ttl',
  ];

  for (const field of numericFields) {
    const value = record[field];
    if (value !== undefined && typeof value !== 'number') {
      errors.push(`Field '${field}' must be a number, got ${typeof value}`);
    }

    // Additional validation: numbers should not be NaN or Infinity
    if (typeof value === 'number' && (!Number.isFinite(value))) {
      errors.push(`Field '${field}' must be a finite number, got ${value}`);
    }
  }

  // Validate meta object if present
  if (record.meta !== undefined) {
    if (typeof record.meta !== 'object' || record.meta === null) {
      errors.push(`Field 'meta' must be an object, got ${typeof record.meta}`);
    }
  }

  // Validate budgetThresholds is an array if present
  if (record.budgetThresholds !== undefined) {
    if (!Array.isArray(record.budgetThresholds)) {
      errors.push(`Field 'budgetThresholds' must be an array, got ${typeof record.budgetThresholds}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * AC-7.1.16: Filter sensitive fields before passing to email templates
 * Removes: meta, comments, approvedBy
 *
 * @param record - Full lease record from DynamoDB
 * @returns SafeLeaseRecord without filtered fields
 */
export function filterForTemplates(record: FullLeaseRecord): SafeLeaseRecord {
  const { meta: _meta, comments: _comments, approvedBy: _approvedBy, ...safeRecord } = record;

  logger.debug('Filtered sensitive fields for template', {
    originalFieldCount: Object.keys(record).length,
    filteredFieldCount: Object.keys(safeRecord).length,
    removedFields: FILTERED_FIELDS,
  });

  return safeRecord;
}

/**
 * Generate schema fingerprint for change detection (AC-7.1.11)
 * Used to detect schema changes and only log when structure changes
 *
 * @param record - Lease record to fingerprint
 * @returns String fingerprint of field names and types
 */
export function generateSchemaFingerprint(record: Partial<FullLeaseRecord>): string {
  const fields = Object.keys(record).sort();
  const types = fields.map((key) => {
    const value = record[key as keyof FullLeaseRecord];
    return `${key}:${typeof value}`;
  });

  return types.join('|');
}

/**
 * Get list of all expected field names for contract testing (AC-7.1.21)
 * Returns array of 18 field names defined in FullLeaseRecord interface
 */
export function getExpectedFieldNames(): string[] {
  return [
    'userEmail',
    'uuid',
    'status',
    'expirationDate',
    'approvedBy',
    'awsAccountId',
    'createdBy',
    'originalLeaseTemplateUuid',
    'startDate',
    'originalLeaseTemplateName',
    'lastCheckedDate',
    'endDate',
    'leaseDurationInHours',
    'totalCostAccrued',
    'maxSpend',
    'ttl',
    'meta',
    'budgetThresholds',
    'comments',
  ];
}
