/**
 * Server-side email-domain blocklist for the NDX signup Lambda. Combines:
 *
 * 1. A hand-curated list of **personal email providers** (Gmail, Hotmail,
 *    Yahoo, etc.) imported from `@ndx/signup-types`'s shared
 *    `blocklist-data.ts` so the client's live-indicator and the server's
 *    authoritative check stay in sync.
 *
 * 2. The **disposable email domain** list bundled in the
 *    `disposable-email-domains` npm package — ~3,500 throwaway providers.
 *
 * Matching is **suffix-based**: `domain === entry || domain.endsWith("." +
 * entry)` so `bob@mail.gmail.com` and `bob@e.mailinator.com` are both
 * blocked. The allowlist (recognised public-sector domains, exact-match) is
 * intentionally asymmetric — attacker controls subdomain choice, list
 * maintainer doesn't.
 *
 * Fail-closed startup guard: if the bundled disposable list ships smaller
 * than expected (supply-chain attack via a malicious package update),
 * throw at module load rather than silently letting traffic through.
 *
 * @module infra-signup/lib/lambda/signup/blocklist
 */

import disposableList from "disposable-email-domains"
import { PERSONAL_EMAIL_DOMAINS } from "@ndx/signup-types/blocklist-data"

/**
 * Minimum acceptable size of the bundled disposable-email-domains list.
 * The real list ships ~3,500 entries; if a future package version ships
 * dramatically fewer we want to fail Lambda cold start rather than
 * silently shrink the blocklist.
 */
const MIN_DISPOSABLE_LIST_SIZE = 1000

/**
 * Lowercase Set of personal email provider domains, re-exported so the
 * Lambda can match against the same data the client's indicator uses.
 */
export const PERSONAL_DOMAINS: ReadonlySet<string> = PERSONAL_EMAIL_DOMAINS

/**
 * Lowercase Set of all known disposable / temporary email provider domains
 * shipped by the `disposable-email-domains` package, frozen at module
 * load. Already lowercase in the source package.
 */
export const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set(
  disposableList.map((domain) => domain.toLowerCase()),
)

if (DISPOSABLE_DOMAINS.size < MIN_DISPOSABLE_LIST_SIZE) {
  throw new Error(
    `disposable-email-domains list shipped with only ${DISPOSABLE_DOMAINS.size} ` +
      `entries (expected at least ${MIN_DISPOSABLE_LIST_SIZE}); refusing to start ` +
      `the signup Lambda with a degraded blocklist.`,
  )
}

/**
 * Suffix-match check: `domain` matches `entry` if `domain === entry` OR
 * `domain.endsWith("." + entry)`. Inputs are expected lowercase.
 */
function suffixMatches(domain: string, list: ReadonlySet<string>): boolean {
  if (list.has(domain)) return true
  // Walk subdomain segments left-to-right; stop as soon as a suffix matches.
  // Avoids constructing intermediate strings for the common no-match case.
  let dotIndex = domain.indexOf(".")
  while (dotIndex !== -1) {
    const suffix = domain.substring(dotIndex + 1)
    if (list.has(suffix)) return true
    dotIndex = domain.indexOf(".", dotIndex + 1)
  }
  return false
}

/**
 * Result of a blocklist check. `category` distinguishes personal-provider
 * blocks (reflected back to the user with a friendlier "use your work
 * email" message) from disposable-provider blocks (same user-visible
 * message, but logged separately for ops).
 */
export interface BlocklistResult {
  blocked: boolean
  category: "personal" | "disposable" | null
}

/**
 * Decide whether the supplied email's domain is on either the personal-
 * provider blocklist or the disposable-provider blocklist. Returns the
 * category for downstream structured logging.
 *
 * Inputs that aren't well-formed emails (no `@`, empty domain) return
 * `{ blocked: false, category: null }` — the handler's email-validation
 * pipeline already rejects those before this function is called, so
 * this is defence-in-depth only.
 */
export function isBlockedDomain(email: string): BlocklistResult {
  const atIndex = email.indexOf("@")
  if (atIndex < 0 || atIndex === email.length - 1) {
    return { blocked: false, category: null }
  }
  const domain = email.substring(atIndex + 1).toLowerCase()
  if (suffixMatches(domain, PERSONAL_DOMAINS)) {
    return { blocked: true, category: "personal" }
  }
  if (suffixMatches(domain, DISPOSABLE_DOMAINS)) {
    return { blocked: true, category: "disposable" }
  }
  return { blocked: false, category: null }
}

/**
 * Test-only export — provides controlled access to the internal
 * suffix-match helper so its semantics can be unit-tested in isolation.
 * @internal
 */
export const _internal = {
  suffixMatches,
  MIN_DISPOSABLE_LIST_SIZE,
}
