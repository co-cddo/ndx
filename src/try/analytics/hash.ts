/**
 * SHA-256 Hashing Utility
 *
 * Provides cryptographic hashing for User-ID pseudonymization.
 * Uses Web Crypto API for secure, native SHA-256 hashing.
 *
 * @module analytics/hash
 */

/**
 * Hash an email address using SHA-256.
 *
 * Used to create pseudonymous User-IDs for GA4 tracking.
 * Work emails are hashed as defense-in-depth, even though
 * they are professional identities (not consumer PII).
 *
 * @param email - Email address to hash
 * @returns Hex-encoded SHA-256 hash (64 characters)
 *
 * @example
 * ```typescript
 * const hashedId = await hashEmail('user@example.gov.uk');
 * // Returns: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
 * ```
 */
export async function hashEmail(email: string): Promise<string> {
  // Normalize email to lowercase for consistent hashing
  const normalizedEmail = email.toLowerCase().trim()

  // Encode as UTF-8 bytes
  const encoder = new TextEncoder()
  const data = encoder.encode(normalizedEmail)

  // Hash using Web Crypto API
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

  return hashHex
}
