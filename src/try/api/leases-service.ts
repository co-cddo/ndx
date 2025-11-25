/**
 * Leases Service
 *
 * Story 6.9: Submit lease request and handle responses
 *
 * Handles lease creation requests to the Innovation Sandbox API.
 *
 * @module leases-service
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-021|ADR-021: Centralized API Client}
 */

import { callISBAPI } from './api-client';

/**
 * Lease request payload for POST /api/leases.
 * Matches Innovation Sandbox API expected format.
 */
export interface LeaseRequest {
  /** Lease template UUID from product frontmatter try_id */
  leaseTemplateUuid: string;
  /** Comments field - used to record AUP acceptance */
  comments: string;
}

/**
 * Lease response from API (201 Created).
 */
export interface LeaseResponse {
  /** Unique lease identifier */
  leaseId: string;
  /** AWS account ID for the sandbox */
  awsAccountId: string;
  /** Lease expiration date (ISO 8601) */
  expirationDate: string;
  /** Current lease status */
  status: 'Pending' | 'Active';
  /** Maximum spend limit in USD */
  maxSpend: number;
}

/**
 * Result from lease creation request.
 */
export interface LeaseCreationResult {
  /** Whether the request was successful */
  success: boolean;
  /** Lease data (only present if successful) */
  lease?: LeaseResponse;
  /** Error code for specific handling */
  errorCode?: 'CONFLICT' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT';
  /** User-friendly error message */
  error?: string;
}

/**
 * Known error messages from Innovation Sandbox API.
 * @see https://github.com/aws-solutions/innovation-sandbox-on-aws/blob/main/source/lambdas/api/leases/src/leases-handler.ts
 */
const API_ERRORS = {
  NO_ACCOUNTS: 'No accounts are available to lease',
  MAX_LEASES: 'maximum number of active/pending leases allowed',
  TEMPLATE_NOT_FOUND: 'Lease template not found',
  ACCESS_DENIED: 'Access denied',
  USER_NOT_FOUND: 'User not found in Identity Center',
} as const;

/**
 * API endpoint for leases.
 */
const LEASES_ENDPOINT = '/api/leases';

/**
 * Request timeout in milliseconds.
 */
const REQUEST_TIMEOUT = 10000;

/**
 * Extract error message from API response.
 * Innovation Sandbox uses JSend format: { status: "fail", data: { errors: [{ message }] } }
 */
function getApiErrorMessage(errorData: unknown): string {
  if (!errorData || typeof errorData !== 'object') return '';
  const data = errorData as { data?: { errors?: Array<{ message?: string }> } };
  return data?.data?.errors?.[0]?.message || '';
}

/**
 * Check if error message matches a known API error.
 */
function matchesApiError(message: string, errorKey: keyof typeof API_ERRORS): boolean {
  return message.toLowerCase().includes(API_ERRORS[errorKey].toLowerCase());
}

/**
 * Create a new lease request.
 *
 * POSTs to /api/leases with the lease template ID and AUP acceptance.
 * Handles all response codes with user-friendly error messages.
 *
 * @param leaseTemplateId - The product's try_id UUID
 * @returns Promise resolving to LeaseCreationResult
 *
 * @example
 * const result = await createLease('550e8400-e29b-41d4-a716-446655440000');
 * if (result.success) {
 *   console.log('Lease created:', result.lease);
 *   window.location.href = '/try';
 * } else if (result.errorCode === 'CONFLICT') {
 *   alert(result.error);
 *   window.location.href = '/try';
 * } else {
 *   // Show error in modal
 * }
 */
export async function createLease(leaseTemplateId: string): Promise<LeaseCreationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const payload: LeaseRequest = {
    leaseTemplateUuid: leaseTemplateId,
    comments: 'User accepted the Acceptable Use Policy via NDX portal.',
  };

  try {
    const response = await callISBAPI(LEASES_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
      // Let 401 redirect happen naturally (user needs to re-authenticate)
    });

    clearTimeout(timeoutId);

    // Success: 200 OK or 201 Created
    if (response.ok) {
      const lease: LeaseResponse = await response.json();
      return {
        success: true,
        lease,
      };
    }

    // Handle specific error codes
    // Parse error response once for all cases
    const errorData = await response.json().catch(() => null);
    const errorMessage = getApiErrorMessage(errorData);

    switch (response.status) {
      case 409: {
        // Conflict: "No accounts are available to lease" or "maximum number of active/pending leases"
        if (matchesApiError(errorMessage, 'NO_ACCOUNTS')) {
          return {
            success: false,
            errorCode: 'CONFLICT',
            error: 'No sandbox accounts are currently available. Please try again later.',
          };
        }

        // Max leases reached
        return {
          success: false,
          errorCode: 'CONFLICT',
          error: "You've reached the maximum number of active sessions. Please end an existing session before starting a new one.",
        };
      }

      case 404: {
        // Not found: "Lease template not found" or "User not found in Identity Center"
        console.error('[leases-service] Not found:', errorMessage);

        if (matchesApiError(errorMessage, 'TEMPLATE_NOT_FOUND')) {
          return {
            success: false,
            errorCode: 'NOT_FOUND',
            error: 'This sandbox template is no longer available.',
          };
        }

        if (matchesApiError(errorMessage, 'USER_NOT_FOUND')) {
          return {
            success: false,
            errorCode: 'UNAUTHORIZED',
            error: 'Your account is not registered for sandbox access. Please contact support.',
          };
        }

        return {
          success: false,
          errorCode: 'NOT_FOUND',
          error: 'The requested resource was not found.',
        };
      }

      case 400: {
        // Bad request: Invalid lease template ID or payload
        console.error('[leases-service] Bad request:', errorMessage);

        return {
          success: false,
          errorCode: 'SERVER_ERROR',
          error: 'Invalid request. Please try again or contact support.',
        };
      }

      case 401:
        // This shouldn't happen as callISBAPI handles 401 redirect
        // But handle gracefully just in case
        return {
          success: false,
          errorCode: 'UNAUTHORIZED',
          error: 'Please sign in to continue.',
        };

      case 403: {
        // Forbidden: "Access denied. You do not have permission to create leases for other users."
        console.error('[leases-service] Forbidden:', errorMessage);
        return {
          success: false,
          errorCode: 'UNAUTHORIZED',
          error: 'You do not have permission to request this sandbox.',
        };
      }

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        return {
          success: false,
          errorCode: 'SERVER_ERROR',
          error: 'The sandbox service is temporarily unavailable. Please try again later.',
        };

      default:
        console.error('[leases-service] Unexpected status:', response.status);
        return {
          success: false,
          errorCode: 'SERVER_ERROR',
          error: 'An unexpected error occurred. Please try again.',
        };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      // Timeout
      if (error.name === 'AbortError') {
        console.error('[leases-service] Request timeout');
        return {
          success: false,
          errorCode: 'TIMEOUT',
          error: 'Request timed out. Please check your connection and try again.',
        };
      }

      // 401 redirect error from callISBAPI
      if (error.message.includes('Unauthorized')) {
        return {
          success: false,
          errorCode: 'UNAUTHORIZED',
          error: 'Please sign in to continue.',
        };
      }

      console.error('[leases-service] Fetch error:', error.message);
    }

    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      error: 'Unable to connect to the sandbox service. Please check your connection.',
    };
  }
}
