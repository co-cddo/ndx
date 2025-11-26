/**
 * URL Validation Utilities for Try Before You Buy Feature
 *
 * Provides security utilities for validating URLs to prevent open redirect attacks.
 * CRITICAL-1: Fixes open redirect vulnerability in OAuth flow.
 *
 * @module url-validator
 */

/**
 * Validates that a URL is safe for redirect (same-origin or relative path).
 * Prevents open redirect attacks by rejecting external URLs.
 *
 * @param url - URL to validate
 * @returns true if URL is safe for redirect
 *
 * @example
 * ```typescript
 * isValidReturnUrl('/catalogue');           // true - relative path
 * isValidReturnUrl('/try?filter=active');   // true - relative path with query
 * isValidReturnUrl('https://ndx.gov.uk/try'); // true - same origin (if on ndx.gov.uk)
 * isValidReturnUrl('https://evil.com');      // false - external domain
 * isValidReturnUrl('//evil.com');            // false - protocol-relative
 * isValidReturnUrl('javascript:alert(1)');   // false - dangerous protocol
 * ```
 */
export function isValidReturnUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  // Allow relative paths starting with / but not // (protocol-relative)
  if (url.startsWith('/') && !url.startsWith('//')) {
    // Reject protocol handlers disguised as paths (e.g., /javascript:)
    if (/^\/[a-z]+:/i.test(url)) {
      return false;
    }
    return true;
  }

  // Reject dangerous protocols
  if (/^(javascript|data|vbscript|file):/i.test(url)) {
    return false;
  }

  // Parse and validate absolute URLs for same-origin
  try {
    const parsed = new URL(url, window.location.origin);

    // Check same origin (protocol + host + port)
    if (parsed.origin !== window.location.origin) {
      return false;
    }

    // Reject URLs with embedded credentials (security risk)
    if (parsed.username || parsed.password) {
      return false;
    }

    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Sanitizes a URL for safe redirect, returning fallback if invalid.
 *
 * @param url - URL to sanitize
 * @param fallback - Fallback URL if validation fails (default: '/')
 * @returns Safe URL for redirect
 *
 * @example
 * ```typescript
 * sanitizeReturnUrl('/catalogue');           // '/catalogue'
 * sanitizeReturnUrl('https://evil.com');     // '/'
 * sanitizeReturnUrl(null);                   // '/'
 * sanitizeReturnUrl('', '/home');            // '/home'
 * ```
 */
export function sanitizeReturnUrl(url: string | null | undefined, fallback = '/'): string {
  if (!url) {
    return fallback;
  }

  return isValidReturnUrl(url) ? url : fallback;
}
