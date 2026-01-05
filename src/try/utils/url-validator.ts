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
 * 7-layer defense against redirect attacks:
 * 1. Reject empty/null URLs
 * 2. Reject dangerous protocols (javascript:, data:, blob:, about:, mailto:, etc.)
 * 3. Reject protocol-relative URLs (//)
 * 4. Reject backslash-based redirects
 * 5. Reject null bytes and control characters
 * 6. Reject encoded attack sequences
 * 7. Validate same-origin for absolute URLs
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
  // Layer 1: Reject empty/null URLs
  if (!url || typeof url !== "string") {
    return false
  }

  // Layer 1.5: Detect and reject multi-encoded URLs (double/triple encoding bypass)
  // Recursively decode to detect encoding attacks like %252F or %25%32%46
  let decodedUrl = url
  let previousUrl = ""
  let iterations = 0
  const maxIterations = 5 // Prevent infinite loops

  while (decodedUrl !== previousUrl && iterations < maxIterations) {
    previousUrl = decodedUrl
    try {
      decodedUrl = decodeURIComponent(decodedUrl)
    } catch {
      // Invalid encoding sequence (e.g., standalone %) - reject as suspicious
      return false
    }
    iterations++
  }

  // If URL required more than one decode pass, it was multi-encoded - reject
  if (iterations > 1) {
    return false
  }

  // Layer 2: Reject dangerous protocols (expanded list)
  // Case-insensitive check for all dangerous protocol handlers
  if (/^(javascript|data|vbscript|file|blob|about|mailto|tel|ftp):/i.test(url)) {
    return false
  }

  // Layer 3: Reject protocol-relative URLs
  if (url.startsWith("//")) {
    return false
  }

  // Layer 4: Reject backslash-based redirects
  // Backslashes can be interpreted as forward slashes in some browsers
  if (url.includes("\\")) {
    return false
  }

  // Layer 5: Reject null bytes and control characters
  // Null bytes can truncate strings in some systems
  // Control characters (0x00-0x1F, 0x7F) can cause parsing issues
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(url)) {
    return false
  }

  // Layer 6: Reject encoded attack sequences
  // Check for URL-encoded dangerous patterns
  const lowerUrl = url.toLowerCase()
  // Encoded forward slashes (%2f, %252f for double encoding)
  if (lowerUrl.includes("%2f") || lowerUrl.includes("%252f")) {
    return false
  }
  // Encoded null bytes (%00)
  if (lowerUrl.includes("%00")) {
    return false
  }
  // CRLF injection (%0d = CR, %0a = LF)
  if (lowerUrl.includes("%0d") || lowerUrl.includes("%0a")) {
    return false
  }

  // Handle relative paths starting with /
  if (url.startsWith("/")) {
    // Reject protocol handlers disguised as paths (e.g., /javascript:)
    if (/^\/[a-z]+:/i.test(url)) {
      return false
    }
    return true
  }

  // Layer 7: Parse and validate absolute URLs for same-origin
  try {
    const parsed = new URL(url, window.location.origin)

    // Check same origin (protocol + host + port)
    if (parsed.origin !== window.location.origin) {
      return false
    }

    // Reject URLs with embedded credentials (security risk)
    if (parsed.username || parsed.password) {
      return false
    }

    return true
  } catch {
    // Invalid URL format
    return false
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
export function sanitizeReturnUrl(url: string | null | undefined, fallback = "/"): string {
  if (!url) {
    return fallback
  }

  return isValidReturnUrl(url) ? url : fallback
}
