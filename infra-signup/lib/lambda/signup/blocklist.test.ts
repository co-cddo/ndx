/**
 * Unit tests for the server-side email-domain blocklist.
 *
 * @module infra-signup/lib/lambda/signup/blocklist.test
 */

import { isBlockedDomain, PERSONAL_DOMAINS, DISPOSABLE_DOMAINS, _internal } from "./blocklist"

describe("isBlockedDomain", () => {
  describe("personal email providers", () => {
    it("blocks gmail.com (exact)", () => {
      expect(isBlockedDomain("user@gmail.com")).toEqual({ blocked: true, category: "personal" })
    })

    it("blocks googlemail.com (exact)", () => {
      expect(isBlockedDomain("user@googlemail.com")).toEqual({ blocked: true, category: "personal" })
    })

    it("blocks hotmail.co.uk (exact)", () => {
      expect(isBlockedDomain("user@hotmail.co.uk")).toEqual({ blocked: true, category: "personal" })
    })

    it("blocks via suffix match — mail.gmail.com", () => {
      expect(isBlockedDomain("user@mail.gmail.com")).toEqual({ blocked: true, category: "personal" })
    })

    it("blocks via suffix match — deep nested subdomain", () => {
      expect(isBlockedDomain("user@a.b.c.gmail.com")).toEqual({ blocked: true, category: "personal" })
    })

    it("does NOT block lookalike that ends in the blocklist string without dot — gmailservice.com", () => {
      // Suffix match requires a leading dot before the matching segment.
      expect(isBlockedDomain("user@gmailservice.com")).toEqual({ blocked: false, category: null })
    })

    it("is case-insensitive — GMAIL.COM blocked", () => {
      expect(isBlockedDomain("user@GMAIL.COM")).toEqual({ blocked: true, category: "personal" })
    })

    it("is case-insensitive — Mixed.Case.Yahoo.COM blocked via suffix", () => {
      expect(isBlockedDomain("user@Mixed.Case.Yahoo.COM")).toEqual({ blocked: true, category: "personal" })
    })
  })

  describe("disposable email providers", () => {
    it("blocks mailinator.com (exact)", () => {
      expect(isBlockedDomain("user@mailinator.com")).toEqual({ blocked: true, category: "disposable" })
    })

    it("blocks 10minutemail.com (exact)", () => {
      // 10minutemail.com is in the disposable-email-domains package
      expect(isBlockedDomain("user@10minutemail.com")).toEqual({ blocked: true, category: "disposable" })
    })

    it("blocks via suffix match — e.mailinator.com", () => {
      expect(isBlockedDomain("user@e.mailinator.com")).toEqual({ blocked: true, category: "disposable" })
    })

    it("personal takes precedence when domain is on both lists", () => {
      // Should never happen in the curated data, but the categorisation
      // priority is documented: personal check runs first.
      // (No assertion against real data — this guards the priority contract.)
      const personalFirstEntry = [...PERSONAL_DOMAINS][0]
      expect(personalFirstEntry).toBeDefined()
      expect(isBlockedDomain(`user@${personalFirstEntry}`).category).toBe("personal")
    })
  })

  describe("non-blocked domains", () => {
    it("does NOT block a recognised public-sector domain", () => {
      expect(isBlockedDomain("alice@westbury.gov.uk")).toEqual({ blocked: false, category: null })
    })

    it("does NOT block an unrecognised but non-personal/non-disposable domain (regression — waitlist path)", () => {
      expect(isBlockedDomain("alice@unknown.example")).toEqual({ blocked: false, category: null })
    })

    it("does NOT block a council subdomain", () => {
      expect(isBlockedDomain("alice@dept.westbury.gov.uk")).toEqual({ blocked: false, category: null })
    })
  })

  describe("edge cases", () => {
    it("returns not-blocked for an empty string", () => {
      expect(isBlockedDomain("")).toEqual({ blocked: false, category: null })
    })

    it("returns not-blocked for input with no @", () => {
      expect(isBlockedDomain("nodomain")).toEqual({ blocked: false, category: null })
    })

    it("returns not-blocked for trailing @ (`user@`)", () => {
      // Handler validates before this is reached; defence-in-depth only.
      expect(isBlockedDomain("user@")).toEqual({ blocked: false, category: null })
    })

    it("returns not-blocked when domain has no dot", () => {
      expect(isBlockedDomain("user@localhost")).toEqual({ blocked: false, category: null })
    })
  })

  describe("internal suffixMatches helper", () => {
    const { suffixMatches } = _internal
    const list: ReadonlySet<string> = new Set(["example.com", "test.org"])

    it("matches exact domain", () => {
      expect(suffixMatches("example.com", list)).toBe(true)
    })

    it("matches one-deep subdomain", () => {
      expect(suffixMatches("a.example.com", list)).toBe(true)
    })

    it("matches deep subdomain", () => {
      expect(suffixMatches("a.b.c.example.com", list)).toBe(true)
    })

    it("does NOT match suffix without a dot separator", () => {
      expect(suffixMatches("notexample.com", list)).toBe(false)
    })

    it("does NOT match unrelated domain", () => {
      expect(suffixMatches("other.net", list)).toBe(false)
    })
  })

  describe("startup invariants", () => {
    it("DISPOSABLE_DOMAINS has been populated above the fail-closed floor", () => {
      expect(DISPOSABLE_DOMAINS.size).toBeGreaterThanOrEqual(_internal.MIN_DISPOSABLE_LIST_SIZE)
    })

    it("PERSONAL_DOMAINS is non-empty and all-lowercase", () => {
      expect(PERSONAL_DOMAINS.size).toBeGreaterThan(0)
      for (const entry of PERSONAL_DOMAINS) {
        expect(entry).toBe(entry.toLowerCase())
        expect(entry).not.toContain(" ")
      }
    })
  })
})
