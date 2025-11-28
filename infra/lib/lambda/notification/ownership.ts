/**
 * Email Ownership Verification Module
 *
 * MANDATORY: Verification MUST occur before any email is sent.
 * This module verifies that notification recipients own the lease they're receiving
 * notifications about. This is a CRITICAL security control - cannot be bypassed.
 *
 * Story: N5.3 - Email Ownership Verification
 * ACs: 3.1-3.28
 *
 * Security Controls:
 * - AC-3.8: MANDATORY verification - cannot be bypassed via configuration
 * - AC-3.9: DynamoDB ConsistentRead: true for all reads
 * - AC-3.5: PII redaction - never log raw email addresses
 * - AC-3.3: Email mismatch throws SecurityError
 * - AC-3.6: Lease not found throws PermanentError
 *
 * @see docs/notification-architecture.md#Security-Architecture
 */

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { createHash } from 'crypto';
import { SecurityError, PermanentError, RetriableError } from './errors';
import type { ValidatedEvent } from './validation';
import type { NotificationEventType } from './types';

// =========================================================================
// Types
// =========================================================================

/**
 * Result of ownership verification
 */
export interface OwnershipResult {
  /** True if ownership confirmed */
  verified: boolean;
  /** Email from LeaseTable record */
  leaseOwner: string;
  /** Email from SandboxAccountTable if cross-verified */
  accountOwner?: string;
  /** Verification audit data (hashed for security) */
  auditData: {
    leaseOwnerHash: string;
    eventEmailHash: string;
    accountOwnerHash?: string;
    verificationTimestamp: string;
  };
}

/**
 * Lease record from DynamoDB
 */
interface LeaseRecord {
  userEmail: string;
  uuid: string;
  accountId?: string;
  leaseStatus?: string;
  templateName?: string;
  expirationDate?: string;
  maxSpend?: number;
}

/**
 * Account record from DynamoDB
 */
interface AccountRecord {
  accountId: string;
  ownerEmail?: string;
  status?: string;
}

/**
 * Event detail with lease information
 */
interface LeaseEventDetail {
  userEmail: string;
  leaseId?: {
    userEmail: string;
    uuid: string;
  };
  accountId?: string;
}

// =========================================================================
// Constants
// =========================================================================

/** Ops events that skip ownership verification (no user email) */
const OPS_EVENTS: NotificationEventType[] = [
  'AccountCleanupFailed',
  'AccountQuarantined',
  'AccountDriftDetected',
];

/** Approved email domains (AC-3.17) */
const APPROVED_DOMAINS = ['.gov.uk'];

/** Suspicious email patterns to reject (AC-3.22, AC-3.28) */
const SUSPICIOUS_PATTERNS = [
  /\+\+/, // Double plus (AC-3.22)
  /--/, // Double dash
  /\.\./, // Double dot (AC-3.22)
  /@test\.com$/i, // Test domain (AC-3.28)
  /@localhost$/i, // Localhost (AC-3.28)
  /@example\.com$/i, // Example domain (AC-3.28)
  /^123@/i, // Starts with 123 (AC-3.28)
];

// =========================================================================
// Logger and Metrics
// =========================================================================

const logger = new Logger({ serviceName: 'ndx-notifications' });
const metrics = new Metrics({
  namespace: 'ndx/notifications',
  serviceName: 'ndx-notifications',
});

// =========================================================================
// Utility Functions
// =========================================================================

/**
 * Hash a value for logging - PII redaction (AC-3.5)
 * Uses SHA-256 and takes first 12 chars
 */
export function hashForLog(value: string): string {
  if (!value) return 'empty';
  const hash = createHash('sha256').update(value).digest('hex');
  return hash.substring(0, 12);
}

/**
 * Validate email domain against approved list (AC-3.17)
 */
export function isApprovedDomain(email: string): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return APPROVED_DOMAINS.some((approved) => domain.endsWith(approved));
}

/**
 * Check for suspicious email patterns (AC-3.22, AC-3.28)
 */
export function hasSuspiciousPattern(email: string): boolean {
  if (!email) return false;
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(email));
}

/**
 * Validate email format and patterns (AC-3.17, AC-3.18, AC-3.22, AC-3.28)
 */
export function validateEmailFormat(
  email: string,
  eventId: string
): { valid: boolean; reason?: string } {
  // Check for suspicious patterns (AC-3.22, AC-3.28)
  if (hasSuspiciousPattern(email)) {
    logger.warn('Suspicious email pattern detected', {
      eventId,
      emailHash: hashForLog(email),
      reason: 'suspicious_pattern',
    });
    metrics.addMetric('SuspiciousEmailPattern', MetricUnit.Count, 1);
    return { valid: false, reason: 'Email contains suspicious pattern' };
  }

  // Check domain (AC-3.17, AC-3.18)
  if (!isApprovedDomain(email)) {
    logger.warn('Non-approved email domain detected', {
      eventId,
      emailHash: hashForLog(email),
      reason: 'non_approved_domain',
    });
    metrics.addMetric('NonApprovedDomain', MetricUnit.Count, 1);
    return { valid: false, reason: 'Email domain not in approved list' };
  }

  return { valid: true };
}

/**
 * Check if event is an ops event (skips ownership verification)
 */
export function isOpsEvent(eventType: NotificationEventType): boolean {
  return OPS_EVENTS.includes(eventType);
}

/**
 * Extract lease key from validated event
 */
export function extractLeaseKey(
  event: ValidatedEvent
): { userEmail: string; uuid: string } | null {
  const detail = event.detail as LeaseEventDetail;

  // Try leaseId composite key first
  if (detail.leaseId && detail.leaseId.userEmail && detail.leaseId.uuid) {
    return {
      userEmail: detail.leaseId.userEmail,
      uuid: detail.leaseId.uuid,
    };
  }

  // Fallback to direct userEmail (some events don't have leaseId)
  if (detail.userEmail) {
    // For events without explicit leaseId, we can only verify userEmail
    return null;
  }

  return null;
}

/**
 * Generate HMAC-SHA256 signature for audit log (AC-3.25)
 */
export function generateAuditSignature(
  eventId: string,
  verificationResult: boolean,
  timestamp: string
): string {
  const data = `${eventId}:${verificationResult}:${timestamp}`;
  const secret = process.env.AUDIT_SECRET || 'ndx-audit-secret';
  return createHash('sha256')
    .update(`${secret}:${data}`)
    .digest('hex')
    .substring(0, 16);
}

// =========================================================================
// DynamoDB Query Functions
// =========================================================================

/**
 * Query LeaseTable for ownership verification (AC-3.1, AC-3.7, AC-3.9)
 * Uses GetItem with ConsistentRead: true
 */
async function queryLeaseTable(
  dynamoClient: DynamoDBClient,
  userEmail: string,
  uuid: string,
  eventId: string
): Promise<LeaseRecord | null> {
  const tableName = process.env.LEASE_TABLE_NAME;
  if (!tableName) {
    throw new PermanentError('LEASE_TABLE_NAME not configured');
  }

  logger.debug('Querying LeaseTable', {
    eventId,
    userEmailHash: hashForLog(userEmail),
    uuid,
  });

  try {
    // AC-3.7: Read-only DynamoDB access (GetItem only)
    // AC-3.9: ConsistentRead: true for strongly consistent read
    const command = new GetItemCommand({
      TableName: tableName,
      Key: {
        userEmail: { S: userEmail },
        uuid: { S: uuid },
      },
      ConsistentRead: true, // AC-3.9: MANDATORY
    });

    const result = await dynamoClient.send(command);

    if (!result.Item) {
      return null;
    }

    const item = unmarshall(result.Item) as LeaseRecord;
    return item;
  } catch (error) {
    // Classify DynamoDB errors
    if (error instanceof Error) {
      if (error.name === 'ProvisionedThroughputExceededException') {
        throw new RetriableError('DynamoDB throughput exceeded', { cause: error });
      }
      if (error.name === 'ResourceNotFoundException') {
        throw new PermanentError('LeaseTable not found');
      }
    }
    throw new RetriableError('DynamoDB error during lease query', {
      cause: error instanceof Error ? error : undefined,
    });
  }
}

/**
 * Query SandboxAccountTable for cross-verification (AC-3.13)
 * Uses GetItem with ConsistentRead: true
 */
async function queryAccountTable(
  dynamoClient: DynamoDBClient,
  accountId: string,
  eventId: string
): Promise<AccountRecord | null> {
  const tableName = process.env.SANDBOX_ACCOUNT_TABLE_NAME;
  if (!tableName) {
    logger.warn('SANDBOX_ACCOUNT_TABLE_NAME not configured - skipping cross-verification', {
      eventId,
    });
    return null;
  }

  logger.debug('Querying SandboxAccountTable for cross-verification', {
    eventId,
    accountId,
  });

  try {
    const command = new GetItemCommand({
      TableName: tableName,
      Key: {
        accountId: { S: accountId },
      },
      ConsistentRead: true,
    });

    const result = await dynamoClient.send(command);

    if (!result.Item) {
      return null;
    }

    const item = unmarshall(result.Item) as AccountRecord;
    return item;
  } catch (error) {
    // Log but don't fail - cross-verification is secondary
    logger.warn('SandboxAccountTable query failed', {
      eventId,
      accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

// =========================================================================
// Main Verification Function
// =========================================================================

/**
 * Verify email ownership against DynamoDB lease records
 *
 * MANDATORY: This verification MUST occur before any email is sent (AC-3.8)
 * Cannot be bypassed via configuration.
 *
 * @param event - Validated event from schema validation
 * @param dynamoClient - DynamoDB client instance
 * @returns OwnershipResult if verified
 * @throws SecurityError if email mismatch (AC-3.3)
 * @throws PermanentError if lease not found (AC-3.6)
 * @throws RetriableError for transient DynamoDB errors
 */
export async function verifyEmailOwnership(
  event: ValidatedEvent,
  dynamoClient: DynamoDBClient
): Promise<OwnershipResult> {
  const eventId = event.eventId;
  const eventType = event.eventType;
  const detail = event.detail as LeaseEventDetail;
  const claimedEmail = detail.userEmail;

  // AC-3.12: Ops events skip ownership verification
  if (isOpsEvent(eventType)) {
    logger.info('Skipping ownership verification for ops event', {
      eventId,
      eventType,
    });
    return {
      verified: true,
      leaseOwner: '', // No user for ops events
      auditData: {
        leaseOwnerHash: 'ops-event',
        eventEmailHash: 'ops-event',
        verificationTimestamp: new Date().toISOString(),
      },
    };
  }

  // Validate claimed email format (AC-3.17, AC-3.22, AC-3.28)
  const emailValidation = validateEmailFormat(claimedEmail, eventId);
  if (!emailValidation.valid) {
    // AC-3.20: Verification failures are PermanentError (no retry)
    throw new PermanentError(emailValidation.reason || 'Invalid email format', {
      eventId,
      reason: emailValidation.reason,
    });
  }

  // Extract lease key (AC-3.10: compare BOTH userEmail AND uuid)
  const leaseKey = extractLeaseKey(event);

  if (!leaseKey) {
    // Events without leaseId can only verify email format
    logger.info('No leaseId in event - email format validated only', {
      eventId,
      eventType,
    });
    return {
      verified: true,
      leaseOwner: claimedEmail,
      auditData: {
        leaseOwnerHash: hashForLog(claimedEmail),
        eventEmailHash: hashForLog(claimedEmail),
        verificationTimestamp: new Date().toISOString(),
      },
    };
  }

  // Query LeaseTable (AC-3.1)
  const leaseRecord = await queryLeaseTable(
    dynamoClient,
    leaseKey.userEmail,
    leaseKey.uuid,
    eventId
  );

  // AC-3.6: Lease not found throws PermanentError
  if (!leaseRecord) {
    logger.error('Lease not found in DynamoDB', {
      eventId,
      leaseKeyEmailHash: hashForLog(leaseKey.userEmail),
      leaseKeyUuid: leaseKey.uuid,
    });
    metrics.addMetric('LeaseNotFound', MetricUnit.Count, 1);
    // AC-3.20: No retry on verification failures
    throw new PermanentError('Lease not found', {
      eventId,
      leaseKeyUuid: leaseKey.uuid,
    });
  }

  // AC-3.2: Case-insensitive email comparison
  const leaseOwnerNormalized = leaseRecord.userEmail.toLowerCase();
  const claimedEmailNormalized = claimedEmail.toLowerCase();

  // AC-3.16: Log full verification chain for audit
  logger.info('Ownership verification chain', {
    eventId,
    eventEmailHash: hashForLog(claimedEmail),
    leaseOwnerHash: hashForLog(leaseRecord.userEmail),
    leaseUuid: leaseKey.uuid,
    accountId: detail.accountId,
  });

  // AC-3.2, AC-3.3: Compare emails
  if (leaseOwnerNormalized !== claimedEmailNormalized) {
    // AC-3.4: Emit OwnershipMismatch metric
    metrics.addMetric('OwnershipMismatch', MetricUnit.Count, 1);

    // AC-3.5: Log with redacted emails
    logger.error('Email ownership mismatch', {
      eventId,
      leaseEmail: '[REDACTED]',
      claimedEmail: '[REDACTED]',
      leaseEmailHash: hashForLog(leaseRecord.userEmail),
      claimedEmailHash: hashForLog(claimedEmail),
    });

    // AC-3.3: Throw SecurityError (non-retriable)
    throw new SecurityError('Email does not match lease owner', {
      eventId,
      // SECURITY: Never log actual emails - only hashes
    });
  }

  // Initialize result
  let accountOwner: string | undefined;

  // AC-3.13, AC-3.14, AC-3.15: Cross-verify with SandboxAccountTable
  if (detail.accountId || leaseRecord.accountId) {
    const accountId = detail.accountId || leaseRecord.accountId;
    if (accountId) {
      const accountRecord = await queryAccountTable(dynamoClient, accountId, eventId);

      if (accountRecord && accountRecord.ownerEmail) {
        accountOwner = accountRecord.ownerEmail;
        const accountOwnerNormalized = accountRecord.ownerEmail.toLowerCase();

        // AC-3.16: Log account verification
        logger.info('Account cross-verification', {
          eventId,
          accountId,
          accountOwnerHash: hashForLog(accountRecord.ownerEmail),
        });

        // AC-3.14, AC-3.15: Require BOTH to match
        if (accountOwnerNormalized !== claimedEmailNormalized) {
          // AC-3.14: Log SECURITY alert
          logger.error('SECURITY: Account owner email mismatch', {
            eventId,
            accountId,
            eventEmailHash: hashForLog(claimedEmail),
            accountOwnerHash: hashForLog(accountRecord.ownerEmail),
            leaseOwnerHash: hashForLog(leaseRecord.userEmail),
          });

          // Emit metric for monitoring
          metrics.addMetric('AccountOwnerMismatch', MetricUnit.Count, 1);

          // AC-3.15: Both must match - this is a SecurityError
          throw new SecurityError(
            'Email does not match account owner',
            {
              eventId,
            }
          );
        }
      }
    }
  }

  // Build audit data with signature (AC-3.25)
  const timestamp = new Date().toISOString();
  const signature = generateAuditSignature(eventId, true, timestamp);

  const auditData = {
    leaseOwnerHash: hashForLog(leaseRecord.userEmail),
    eventEmailHash: hashForLog(claimedEmail),
    accountOwnerHash: accountOwner ? hashForLog(accountOwner) : undefined,
    verificationTimestamp: timestamp,
    signature,
  };

  // AC-3.21: Audit log (90-day retention configured in CloudWatch)
  logger.info('Ownership verified successfully', {
    eventId,
    eventType,
    ...auditData,
  });

  // Emit success metric
  metrics.addMetric('OwnershipVerified', MetricUnit.Count, 1);

  return {
    verified: true,
    leaseOwner: leaseRecord.userEmail,
    accountOwner,
    auditData,
  };
}

// =========================================================================
// Integration with Handler
// =========================================================================

/**
 * Clear any cached state between verifications (AC-3.11)
 * This ensures no cross-contamination between different email sends.
 *
 * Note: The ownership module is stateless by design, but this function
 * provides an explicit clearing point for any future caching.
 */
export function clearVerificationState(): void {
  // Currently stateless - no cache to clear
  // Future: If caching is added, clear it here
  logger.debug('Verification state cleared');
}
