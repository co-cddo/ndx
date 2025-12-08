/**
 * URL Validator Tests
 *
 * Tests the URL validation and sanitization functions used for OAuth return URLs.
 * Uses jsdomReconfigure to properly mock window.location in jsdom v27+ (Jest 30).
 */

import { isValidReturnUrl, sanitizeReturnUrl } from "./url-validator"

// Declare the global function exposed by our custom jsdom environment (jsdom-env.js)
declare global {
  function jsdomReconfigure(options: { url?: string }): void
}

// Helper to set URL in jsdom v27+ (Jest 30) using reconfigure
function setTestURL(url: string): void {
  if (typeof jsdomReconfigure === "function") {
    jsdomReconfigure({ url })
  }
}

describe("url-validator", () => {
  beforeAll(() => {
    // Set consistent URL for origin testing using jsdom's reconfigure
    setTestURL("https://ndx.gov.uk/try")
  })

  describe("isValidReturnUrl", () => {
    describe("relative paths", () => {
      it("should accept simple relative paths", () => {
        expect(isValidReturnUrl("/")).toBe(true)
        expect(isValidReturnUrl("/catalogue")).toBe(true)
        expect(isValidReturnUrl("/try")).toBe(true)
      })

      it("should accept relative paths with query strings", () => {
        expect(isValidReturnUrl("/catalogue?tag=aws")).toBe(true)
        expect(isValidReturnUrl("/try?filter=active")).toBe(true)
      })

      it("should accept relative paths with hash fragments", () => {
        expect(isValidReturnUrl("/docs#section")).toBe(true)
        expect(isValidReturnUrl("/try#sessions")).toBe(true)
      })

      it("should accept nested paths", () => {
        expect(isValidReturnUrl("/catalogue/products/aws-lambda")).toBe(true)
      })
    })

    describe("protocol-relative URLs (security)", () => {
      it("should reject protocol-relative URLs", () => {
        expect(isValidReturnUrl("//evil.com")).toBe(false)
        expect(isValidReturnUrl("//evil.com/path")).toBe(false)
      })
    })

    describe("dangerous protocols (security)", () => {
      it("should reject javascript: URLs", () => {
        expect(isValidReturnUrl("javascript:alert(1)")).toBe(false)
        expect(isValidReturnUrl("javascript:void(0)")).toBe(false)
        expect(isValidReturnUrl("JAVASCRIPT:alert(1)")).toBe(false)
      })

      it("should reject data: URLs", () => {
        expect(isValidReturnUrl("data:text/html,<script>alert(1)</script>")).toBe(false)
      })

      it("should reject vbscript: URLs", () => {
        expect(isValidReturnUrl("vbscript:msgbox(1)")).toBe(false)
      })

      it("should reject file: URLs", () => {
        expect(isValidReturnUrl("file:///etc/passwd")).toBe(false)
      })

      it("should reject protocol handlers disguised as paths", () => {
        expect(isValidReturnUrl("/javascript:alert(1)")).toBe(false)
      })
    })

    describe("same-origin absolute URLs", () => {
      it("should accept same-origin URLs", () => {
        expect(isValidReturnUrl("https://ndx.gov.uk/try")).toBe(true)
        expect(isValidReturnUrl("https://ndx.gov.uk/catalogue")).toBe(true)
      })

      it("should accept same-origin URLs with query strings", () => {
        expect(isValidReturnUrl("https://ndx.gov.uk/try?id=123")).toBe(true)
      })
    })

    describe("external URLs (security)", () => {
      it("should reject external domain URLs", () => {
        expect(isValidReturnUrl("https://evil.com")).toBe(false)
        expect(isValidReturnUrl("https://evil.com/steal-token")).toBe(false)
        expect(isValidReturnUrl("http://malicious.site")).toBe(false)
      })

      it("should reject URLs with different port", () => {
        expect(isValidReturnUrl("https://ndx.gov.uk:8080/try")).toBe(false)
      })

      it("should reject URLs with different protocol", () => {
        expect(isValidReturnUrl("http://ndx.gov.uk/try")).toBe(false)
      })
    })

    describe("URLs with credentials (security)", () => {
      it("should reject URLs with embedded credentials", () => {
        expect(isValidReturnUrl("https://user:pass@ndx.gov.uk/try")).toBe(false)
        expect(isValidReturnUrl("https://user@evil.com")).toBe(false)
      })
    })

    describe("invalid inputs", () => {
      it("should reject empty string", () => {
        expect(isValidReturnUrl("")).toBe(false)
      })

      it("should reject null-like inputs", () => {
        expect(isValidReturnUrl(null as unknown as string)).toBe(false)
        expect(isValidReturnUrl(undefined as unknown as string)).toBe(false)
      })
    })

    describe("additional dangerous protocols (security)", () => {
      it("should reject blob: URLs", () => {
        expect(isValidReturnUrl("blob:https://example.com/uuid")).toBe(false)
        expect(isValidReturnUrl("BLOB:https://example.com/uuid")).toBe(false)
      })

      it("should reject about: URLs", () => {
        expect(isValidReturnUrl("about:blank")).toBe(false)
        expect(isValidReturnUrl("about:srcdoc")).toBe(false)
        expect(isValidReturnUrl("ABOUT:blank")).toBe(false)
      })

      it("should reject mailto: URLs", () => {
        expect(isValidReturnUrl("mailto:attacker@evil.com")).toBe(false)
        expect(isValidReturnUrl("MAILTO:attacker@evil.com")).toBe(false)
      })

      it("should reject tel: URLs", () => {
        expect(isValidReturnUrl("tel:+1234567890")).toBe(false)
      })

      it("should reject ftp: URLs", () => {
        expect(isValidReturnUrl("ftp://evil.com/file")).toBe(false)
      })
    })

    describe("Unicode and encoding attacks (security)", () => {
      it("should reject Unicode homograph attacks", () => {
        // Cyrillic characters that look like Latin
        expect(isValidReturnUrl("https://gооgle.com")).toBe(false) // Using Cyrillic 'о'
        expect(isValidReturnUrl("https://xn--ggle-0nda.com")).toBe(false) // Punycode
      })

      it("should reject URL-encoded dangerous characters", () => {
        // %2f = /
        expect(isValidReturnUrl("/%2f%2fevil.com")).toBe(false)
        expect(isValidReturnUrl("/%252f%252fevil.com")).toBe(false) // Double encoded
      })

      it("should reject null bytes", () => {
        expect(isValidReturnUrl("/path%00.html")).toBe(false)
        expect(isValidReturnUrl("/path\x00.html")).toBe(false)
      })

      it("should reject CRLF injection attempts", () => {
        expect(isValidReturnUrl("/path%0d%0aSet-Cookie:evil")).toBe(false)
        expect(isValidReturnUrl("/path\r\nSet-Cookie:evil")).toBe(false)
      })
    })

    describe("backslash bypass attempts (security)", () => {
      it("should reject backslash-based redirects", () => {
        expect(isValidReturnUrl("/\\evil.com")).toBe(false)
        expect(isValidReturnUrl("\\evil.com")).toBe(false)
        expect(isValidReturnUrl("/\\\\evil.com")).toBe(false)
      })
    })

    describe("edge cases", () => {
      it("should reject paths that look valid but contain encoded attacks", () => {
        // Double-encoded forward slashes
        expect(isValidReturnUrl("/%252f%252f")).toBe(false)
      })

      it("should handle very long URLs gracefully", () => {
        const longPath = "/a".repeat(10000)
        // Should either accept or reject gracefully, not throw
        expect(() => isValidReturnUrl(longPath)).not.toThrow()
      })

      it("should reject URLs with tab characters", () => {
        expect(isValidReturnUrl("/path\tname")).toBe(false)
      })

      it("should reject URLs with form feed characters", () => {
        expect(isValidReturnUrl("/path\fname")).toBe(false)
      })
    })
  })

  describe("sanitizeReturnUrl", () => {
    it("should return valid URLs unchanged", () => {
      expect(sanitizeReturnUrl("/catalogue")).toBe("/catalogue")
      expect(sanitizeReturnUrl("/try?filter=active")).toBe("/try?filter=active")
    })

    it("should return fallback for invalid URLs", () => {
      expect(sanitizeReturnUrl("https://evil.com")).toBe("/")
      expect(sanitizeReturnUrl("javascript:alert(1)")).toBe("/")
    })

    it("should return fallback for empty/null inputs", () => {
      expect(sanitizeReturnUrl("")).toBe("/")
      expect(sanitizeReturnUrl(null)).toBe("/")
      expect(sanitizeReturnUrl(undefined)).toBe("/")
    })

    it("should use custom fallback when provided", () => {
      expect(sanitizeReturnUrl("https://evil.com", "/home")).toBe("/home")
      expect(sanitizeReturnUrl("", "/dashboard")).toBe("/dashboard")
    })
  })
})
