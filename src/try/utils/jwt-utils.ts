/**
 * JWT Utility Functions
 *
 * Provides utilities for parsing and validating JWTs without external dependencies.
 * Used to check token expiration before making API calls.
 *
 * @module jwt-utils
 */

/**
 * Decoded JWT payload structure.
 * Contains standard JWT claims.
 */
export interface JWTPayload {
  /** Subject (typically user ID or email) */
  sub?: string;
  /** Issued at timestamp (Unix seconds) */
  iat?: number;
  /** Expiration timestamp (Unix seconds) */
  exp?: number;
  /** Not before timestamp (Unix seconds) */
  nbf?: number;
  /** Issuer */
  iss?: string;
  /** Audience */
  aud?: string | string[];
  /** JWT ID */
  jti?: string;
  /** Additional claims */
  [key: string]: unknown;
}

/**
 * Parse a JWT and extract its payload.
 *
 * Note: This does NOT verify the signature. It only decodes the payload.
 * Signature verification should be done server-side.
 *
 * @param token - JWT string
 * @returns Decoded payload or null if invalid
 *
 * @example
 * ```typescript
 * const payload = parseJWT(token);
 * if (payload?.exp) {
 *   console.log('Expires:', new Date(payload.exp * 1000));
 * }
 * ```
 */
export function parseJWT(token: string): JWTPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // Handle URL-safe base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

    // Decode and parse
    const decoded = atob(base64);
    return JSON.parse(decoded) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT is expired or will expire soon.
 *
 * @param token - JWT string
 * @param bufferSeconds - Consider expired if within this many seconds of expiry (default: 60)
 * @returns true if expired or invalid, false if still valid
 *
 * @example
 * ```typescript
 * if (isJWTExpired(token)) {
 *   // Token expired, need to refresh or re-authenticate
 *   await refreshToken();
 * }
 *
 * // Check with 5-minute buffer
 * if (isJWTExpired(token, 300)) {
 *   // Token expires within 5 minutes
 * }
 * ```
 */
export function isJWTExpired(token: string, bufferSeconds = 60): boolean {
  const payload = parseJWT(token);

  // Invalid tokens are considered expired
  if (!payload) {
    return true;
  }

  // If no exp claim, consider valid (some JWTs don't expire)
  if (!payload.exp) {
    return false;
  }

  // Compare with current time plus buffer
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + bufferSeconds;
}

/**
 * Get the remaining validity time of a JWT in seconds.
 *
 * @param token - JWT string
 * @returns Seconds until expiration, or 0 if expired/invalid, or Infinity if no exp claim
 *
 * @example
 * ```typescript
 * const remaining = getJWTTimeRemaining(token);
 * if (remaining < 300) {
 *   console.log('Token expires in less than 5 minutes');
 * }
 * ```
 */
export function getJWTTimeRemaining(token: string): number {
  const payload = parseJWT(token);

  if (!payload) {
    return 0;
  }

  if (!payload.exp) {
    return Infinity;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}
