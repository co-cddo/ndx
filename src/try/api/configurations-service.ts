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
import { config } from '../config';
import { getHttpErrorMessage } from '../utils/error-utils';
import { deduplicatedRequest } from '../utils/request-dedup';

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
 * Raw API response from /api/configurations endpoint.
 * The Innovation Sandbox API uses JSend format with nested data.
 * @internal
 */
interface RawConfigurationResponse {
  /** JSend status field */
  status?: string;
  /** Nested data object */
  data?: {
    /** Acceptable Use Policy text/HTML content */
    termsOfService?: string;
    /** Alternative field name for AUP (for compatibility) */
    aup?: string;
    /** Leases configuration */
    leases?: {
      /** Maximum leases per user */
      maxLeasesPerUser?: number;
      /** Maximum duration in hours */
      maxDurationHours?: number;
      /** Maximum budget */
      maxBudget?: number;
    };
  };
  /** Legacy flat fields (for backwards compatibility) */
  termsOfService?: string;
  aup?: string;
  maxLeases?: number;
  leaseDuration?: number;
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
 * Cache TTL in milliseconds (30 seconds).
 * Configurations rarely change, so we can cache for a short period to reduce API calls.
 */
const CACHE_TTL_MS = 30_000;

/**
 * Cached configuration response with timestamp.
 */
interface CachedConfiguration {
  data: ConfigurationsResult;
  timestamp: number;
}

/**
 * In-memory cache for configuration response.
 * @internal
 */
let configurationCache: CachedConfiguration | null = null;

/**
 * Check if cached configuration is still valid.
 * @internal
 */
function isCacheValid(): boolean {
  if (!configurationCache) {
    return false;
  }
  const age = Date.now() - configurationCache.timestamp;
  return age < CACHE_TTL_MS;
}

/**
 * Clear the configuration cache.
 * Useful for testing or forcing a fresh fetch.
 */
export function clearConfigurationCache(): void {
  configurationCache = null;
}

/**
 * Fetch configurations including AUP from the Innovation Sandbox API.
 *
 * Uses request deduplication (ADR-028) to prevent concurrent duplicate calls
 * when the AUP modal loads configurations.
 *
 * Includes time-based caching (30s TTL) to reduce API calls for configurations
 * that rarely change. Use clearConfigurationCache() to force a fresh fetch.
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
  // Return cached result if still valid
  if (isCacheValid() && configurationCache) {
    return configurationCache.data;
  }

  return deduplicatedRequest('fetchConfigurations', async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);

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
          error: getHttpErrorMessage(response.status, 'configuration'),
        };
      }

      const rawData: RawConfigurationResponse = await response.json();

      // Extract AUP from nested JSend data structure first, then fallback to flat fields
      // API returns: { status: "success", data: { termsOfService: "...", leases: {...} } }
      const aupContent =
        rawData.data?.termsOfService ||
        rawData.data?.aup ||
        rawData.termsOfService ||
        rawData.aup;

      // Extract lease config from nested structure or flat fields
      const maxLeases =
        rawData.data?.leases?.maxLeasesPerUser ??
        rawData.maxLeases ??
        DEFAULT_CONFIG.maxLeases;
      const leaseDuration =
        rawData.data?.leases?.maxDurationHours ??
        rawData.leaseDuration ??
        DEFAULT_CONFIG.leaseDuration;

      // Validate response has AUP content
      if (!aupContent || typeof aupContent !== 'string') {
        console.warn('[configurations-service] Invalid AUP in response, using fallback');
        const fallbackResult: ConfigurationsResult = {
          success: true,
          data: {
            ...DEFAULT_CONFIG,
            aup: DEFAULT_CONFIG.aup,
          },
        };
        // Cache successful result (even with fallback AUP)
        configurationCache = { data: fallbackResult, timestamp: Date.now() };
        return fallbackResult;
      }

      const result: ConfigurationsResult = {
        success: true,
        data: {
          maxLeases,
          leaseDuration,
          aup: aupContent,
        },
      };
      // Cache successful result
      configurationCache = { data: result, timestamp: Date.now() };
      return result;
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
  });
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
