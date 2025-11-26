/**
 * Error Utilities for Try Before You Buy Feature
 *
 * Provides shared error message handling across API services.
 * ADR-032: User-Friendly Error Messages
 *
 * @module error-utils
 */

/**
 * Context-specific error message overrides.
 * Different services may need slightly different wording for the same HTTP status.
 */
export type ErrorContext = 'sessions' | 'configurations' | 'configuration' | 'leases' | 'general';

/**
 * Context-specific message overrides for certain status codes.
 */
const CONTEXT_MESSAGES: Record<ErrorContext, Partial<Record<number, string>>> = {
  sessions: {
    401: 'Please sign in to view your sessions.',
    403: 'You do not have permission to view sessions.',
    404: 'Sessions not found.',
  },
  configurations: {
    401: 'Please sign in to continue.',
    403: 'You do not have permission to access this resource.',
    404: 'Configuration not found. Please contact support.',
  },
  configuration: {
    401: 'Please sign in to continue.',
    403: 'You do not have permission to access this resource.',
    404: 'Configuration not found. Please contact support.',
  },
  leases: {
    401: 'Please sign in to continue.',
    404: 'The requested resource was not found.',
  },
  general: {},
};

/**
 * Default error messages for HTTP status codes.
 * These messages follow GOV.UK Design System content guidance:
 * - Plain language (no technical jargon)
 * - Clear action guidance
 * - Calm tone (don't alarm users)
 */
const DEFAULT_MESSAGES: Record<number, string> = {
  401: 'Please sign in to continue.',
  403: 'You do not have permission to access this resource.',
  404: 'Resource not found.',
  500: 'The sandbox service is temporarily unavailable. Please try again later.',
  502: 'The sandbox service is temporarily unavailable. Please try again later.',
  503: 'The sandbox service is temporarily unavailable. Please try again later.',
  504: 'The sandbox service is temporarily unavailable. Please try again later.',
};

/**
 * Get user-friendly error message for HTTP status codes.
 *
 * @param status - HTTP status code
 * @param context - Optional context for context-specific messages
 * @returns User-friendly error message suitable for display to users
 *
 * @example
 * ```typescript
 * const message = getHttpErrorMessage(401, 'sessions');
 * // Returns: 'Please sign in to view your sessions.'
 *
 * const genericMessage = getHttpErrorMessage(500);
 * // Returns: 'The sandbox service is temporarily unavailable. Please try again later.'
 * ```
 */
export function getHttpErrorMessage(status: number, context: ErrorContext = 'general'): string {
  // Check for context-specific message first
  const contextMessage = CONTEXT_MESSAGES[context]?.[status];
  if (contextMessage) {
    return contextMessage;
  }

  // Fall back to default message for status code
  const defaultMessage = DEFAULT_MESSAGES[status];
  if (defaultMessage) {
    return defaultMessage;
  }

  // Generic fallback for unknown status codes
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if an error is a network error (no response received).
 *
 * @param error - Error to check
 * @returns true if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes('Failed to fetch') || error.message.includes('Network request failed');
}

/**
 * Check if an error is a timeout error.
 *
 * @param error - Error to check
 * @returns true if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === 'AbortError' || error.message.includes('timeout');
}
