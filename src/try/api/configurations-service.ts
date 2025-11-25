/**
 * Configurations Service
 *
 * Story 6.7: Fetch and display AUP from Innovation Sandbox API
 *
 * Fetches configuration data including the Acceptable Use Policy (AUP)
 * from the Innovation Sandbox API.
 *
 * @module configurations-service
 * @see {@link https://docs/try-before-you-buy-architecture.md#ADR-021|ADR-021: Centralized API Client}
 */

import { callISBAPI } from './api-client';

/**
 * Configuration response from /api/configurations endpoint.
 */
export interface ConfigurationResponse {
  /** Acceptable Use Policy text/HTML content */
  aup: string;
  /** Maximum concurrent leases allowed (default: 5) */
  maxLeases: number;
  /** Lease duration in hours (default: 24) */
  leaseDuration: number;
}

/**
 * Result from fetching configurations.
 */
export interface ConfigurationsResult {
  /** Whether the fetch was successful */
  success: boolean;
  /** Configuration data (only present if successful) */
  data?: ConfigurationResponse;
  /** Error message (only present if failed) */
  error?: string;
}

/**
 * Default fallback AUP content if API call fails.
 */
const FALLBACK_AUP = `
Acceptable Use Policy for AWS Innovation Sandbox

By using this service, you agree to:

1. Use sandbox resources only for evaluation and testing purposes
2. Not store any sensitive, personal, or production data
3. Not exceed the allocated budget limit
4. Comply with all AWS and government acceptable use policies
5. Report any security incidents immediately

Resources will be automatically terminated after the session expires.

For full terms, please contact the Innovation Sandbox team.
`.trim();

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: ConfigurationResponse = {
  aup: FALLBACK_AUP,
  maxLeases: 5,
  leaseDuration: 24,
};

/**
 * API endpoint for configurations.
 */
const CONFIGURATIONS_ENDPOINT = '/api/configurations';

/**
 * Request timeout in milliseconds.
 */
const REQUEST_TIMEOUT = 10000;

/**
 * Fetch configurations including AUP from the Innovation Sandbox API.
 *
 * @returns Promise resolving to ConfigurationsResult
 *
 * @example
 * const result = await fetchConfigurations();
 * if (result.success) {
 *   console.log('AUP:', result.data?.aup);
 * } else {
 *   console.error('Failed to load AUP:', result.error);
 * }
 */
export async function fetchConfigurations(): Promise<ConfigurationsResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await callISBAPI(CONFIGURATIONS_ENDPOINT, {
      method: 'GET',
      signal: controller.signal,
      skipAuthRedirect: true, // Don't redirect on 401, we'll show error in modal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[configurations-service] API error:', response.status, response.statusText);
      return {
        success: false,
        error: getErrorMessage(response.status),
      };
    }

    const data: ConfigurationResponse = await response.json();

    // Validate response has required fields
    if (!data.aup || typeof data.aup !== 'string') {
      console.warn('[configurations-service] Invalid AUP in response, using fallback');
      return {
        success: true,
        data: {
          ...DEFAULT_CONFIG,
          ...data,
          aup: data.aup || DEFAULT_CONFIG.aup,
        },
      };
    }

    return {
      success: true,
      data: {
        maxLeases: data.maxLeases ?? DEFAULT_CONFIG.maxLeases,
        leaseDuration: data.leaseDuration ?? DEFAULT_CONFIG.leaseDuration,
        aup: data.aup,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[configurations-service] Request timeout');
        return {
          success: false,
          error: 'Request timed out. Please check your connection and try again.',
        };
      }
      console.error('[configurations-service] Fetch error:', error.message);
    }

    return {
      success: false,
      error: 'Unable to load configuration. Please try again.',
    };
  }
}

/**
 * Get user-friendly error message for HTTP status codes.
 * ADR-032: User-Friendly Error Messages
 *
 * @param status - HTTP status code
 * @returns User-friendly error message
 */
function getErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return 'You do not have permission to access this resource.';
    case 404:
      return 'Configuration not found. Please contact support.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'The sandbox service is temporarily unavailable. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Get fallback AUP content.
 * Used when API call fails to ensure user can still see policy.
 *
 * @returns Default AUP content
 */
export function getFallbackAup(): string {
  return FALLBACK_AUP;
}
