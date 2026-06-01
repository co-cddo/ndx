/**
 * Tests for the shared personal-email-provider list. The Lambda re-exports
 * this Set as part of its server-side blocklist; both sides must see the
 * same data.
 *
 * @module signup/blocklist-data.test
 */

import { PERSONAL_EMAIL_DOMAINS } from "./blocklist-data"

describe("PERSONAL_EMAIL_DOMAINS", () => {
  it("is non-empty", () => {
    expect(PERSONAL_EMAIL_DOMAINS.size).toBeGreaterThan(0)
  })

  it("contains the major personal providers", () => {
    // Spot-check — we'd notice immediately if any of these were dropped.
    expect(PERSONAL_EMAIL_DOMAINS.has("gmail.com")).toBe(true)
    expect(PERSONAL_EMAIL_DOMAINS.has("hotmail.com")).toBe(true)
    expect(PERSONAL_EMAIL_DOMAINS.has("outlook.com")).toBe(true)
    expect(PERSONAL_EMAIL_DOMAINS.has("yahoo.com")).toBe(true)
    expect(PERSONAL_EMAIL_DOMAINS.has("icloud.com")).toBe(true)
    expect(PERSONAL_EMAIL_DOMAINS.has("aol.com")).toBe(true)
  })

  it("has every entry lowercase, dot-containing, no whitespace", () => {
    for (const entry of PERSONAL_EMAIL_DOMAINS) {
      expect(entry).toBe(entry.toLowerCase())
      expect(entry).toContain(".")
      expect(entry).not.toMatch(/\s/)
    }
  })

  it("does NOT contain any public-sector or work-email domain (sanity)", () => {
    // Guard against accidental allowlist→blocklist contamination.
    expect(PERSONAL_EMAIL_DOMAINS.has("gov.uk")).toBe(false)
    expect(PERSONAL_EMAIL_DOMAINS.has("nhs.uk")).toBe(false)
    expect(PERSONAL_EMAIL_DOMAINS.has("council.gov.uk")).toBe(false)
  })
})
