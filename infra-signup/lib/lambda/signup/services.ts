/**
 * NDX Signup Lambda Services
 *
 * Domain logic for signup operations. Separated from handler for testability.
 *
 * Story 1.1: Placeholder services
 * Story 1.3: Will implement domain list fetching and caching
 * Story 1.4: Will implement user creation via IAM Identity Center
 *
 * @module infra-signup/lib/lambda/signup/services
 */

// Import shared types via path mapping (ADR-048)
import type { DomainInfo, SignupRequest } from "@ndx/signup-types"

/**
 * Fetch allowed domains from GitHub JSON source.
 *
 * Story 1.3: Will implement with caching (5-min TTL per ADR-044)
 *
 * @returns Promise resolving to array of DomainInfo
 */
export async function fetchAllowedDomains(): Promise<DomainInfo[]> {
  // Placeholder - will be implemented in Story 1.3
  throw new Error("Not implemented - Story 1.3")
}

/**
 * Check if an email's domain is in the allowlist.
 *
 * Story 1.3: Will implement domain validation
 *
 * @param email - User's email address
 * @param allowedDomains - List of allowed domains
 * @returns true if domain is allowed
 */
export function isEmailDomainAllowed(email: string, allowedDomains: DomainInfo[]): boolean {
  // Placeholder - will be implemented in Story 1.3
  const domain = email.split("@")[1]?.toLowerCase()
  return allowedDomains.some((d) => d.domain.toLowerCase() === domain)
}

/**
 * Normalize email address for uniqueness checks.
 *
 * Per project-context.md:
 * - Lowercase all emails
 * - Strip + suffix (alias defense)
 * - Reject non-ASCII characters
 *
 * @param email - Raw email input
 * @returns Normalized email
 * @throws Error if email contains invalid characters
 */
export function normalizeEmail(email: string): string {
  // Reject non-ASCII characters (Unicode homoglyph defense)
  if (!/^[\x00-\x7F]*$/.test(email)) {
    throw new Error("Email contains invalid characters")
  }

  // Lowercase
  let normalized = email.toLowerCase()

  // Strip + suffix
  const atIndex = normalized.indexOf("@")
  if (atIndex > 0) {
    const localPart = normalized.substring(0, atIndex)
    const domain = normalized.substring(atIndex)
    const plusIndex = localPart.indexOf("+")
    if (plusIndex > 0) {
      normalized = localPart.substring(0, plusIndex) + domain
    }
  }

  return normalized
}

/**
 * Check if a user already exists in IAM Identity Center.
 *
 * Story 1.4: Will implement using @aws-sdk/client-identitystore
 *
 * @param email - Normalized email address
 * @returns Promise resolving to true if user exists
 */
export async function checkUserExists(_email: string): Promise<boolean> {
  // Placeholder - will be implemented in Story 1.4
  throw new Error("Not implemented - Story 1.4")
}

/**
 * Create a new user in IAM Identity Center.
 *
 * Story 1.4: Will implement user creation with group membership
 *
 * @param request - Signup request with user details
 * @returns Promise resolving to created user ID
 */
export async function createUser(_request: SignupRequest): Promise<string> {
  // Placeholder - will be implemented in Story 1.4
  throw new Error("Not implemented - Story 1.4")
}
