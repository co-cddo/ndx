/**
 * HTML Utility Functions
 *
 * Secure HTML escaping utilities for XSS prevention.
 *
 * @module html-utils
 */

/**
 * Escape HTML special characters to prevent XSS attacks.
 *
 * Encodes all 5 characters that can be used in XSS attacks:
 * - & → &amp;
 * - < → &lt;
 * - > → &gt;
 * - " → &quot;
 * - ' → &#x27;
 *
 * @param str - String to escape
 * @returns Escaped string safe for HTML insertion
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}
