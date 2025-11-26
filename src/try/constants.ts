/**
 * Shared Constants for Try Before You Buy Feature
 *
 * Centralizes all constant values used across the Try feature modules
 * to ensure consistency and prevent duplication (DRY principle).
 *
 * @module constants
 */

/**
 * sessionStorage key for JWT token storage.
 * Used by: api-client.ts, auth-provider.ts, oauth-flow.ts
 * CRITICAL: All modules must use this shared constant.
 */
export const JWT_TOKEN_KEY = 'isb-jwt';

/**
 * sessionStorage key for storing return URL during OAuth flow.
 * Used by: oauth-flow.ts
 */
export const RETURN_URL_KEY = 'auth-return-to';

/**
 * OAuth callback page path (must not be stored as return URL to avoid loops).
 */
export const CALLBACK_PATH = '/callback';

/**
 * OAuth login endpoint for authentication redirects.
 */
export const OAUTH_LOGIN_URL = '/api/auth/login';
