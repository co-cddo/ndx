/**
 * Personal email provider blocklist — shared between the client-side live
 * indicator (`src/signup/main.ts`) and the Lambda's authoritative server-side
 * check (`infra-signup/lib/lambda/signup/blocklist.ts`). The Lambda also
 * combines this list with the bundled `disposable-email-domains` package; the
 * client only sees personal providers (the ~3,500-entry disposable list is too
 * large to ship to the browser for a UX hint).
 *
 * Matching is **suffix-based**: `domain === entry || domain.endsWith("." +
 * entry)` so `mail.gmail.com` is blocked even though only `gmail.com` is
 * listed. The attacker controls subdomain choice; the maintainer of this list
 * doesn't. Allowlist matching remains exact (least-privilege grant).
 *
 * All entries MUST be lowercase. Adding alternatives (`.co.uk` versions etc.)
 * is fine — preferred over wildcards.
 *
 * @module signup/blocklist-data
 */

export const PERSONAL_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  // Google
  "gmail.com",
  "googlemail.com",
  // Microsoft
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "outlook.co.uk",
  "live.com",
  "live.co.uk",
  "msn.com",
  // Yahoo
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "rocketmail.com",
  // Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // AOL / Verizon
  "aol.com",
  "aol.co.uk",
  // Proton
  "protonmail.com",
  "protonmail.ch",
  "proton.me",
  "pm.me",
  // GMX / Mail.com
  "gmx.com",
  "gmx.co.uk",
  "gmx.de",
  "mail.com",
  // Zoho personal
  "zoho.com",
  // Fastmail (personal tier)
  "fastmail.com",
  "fastmail.fm",
  // Tutanota / Tuta
  "tutanota.com",
  "tuta.io",
  "tutamail.com",
  // Yandex
  "yandex.com",
  "yandex.ru",
  // HEY (Basecamp) personal
  "hey.com",
  // Other widely-used personal providers
  "btinternet.com",
  "sky.com",
  "talktalk.net",
  "virginmedia.com",
])
