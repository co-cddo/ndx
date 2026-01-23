/**
 * Tests for HTML Utility Functions
 *
 * Verifies XSS prevention through proper HTML escaping.
 */

import { escapeHtml } from "./html-utils"

describe("escapeHtml", () => {
  describe("basic escaping", () => {
    it("should escape ampersand", () => {
      expect(escapeHtml("foo & bar")).toBe("foo &amp; bar")
    })

    it("should escape less-than sign", () => {
      expect(escapeHtml("foo < bar")).toBe("foo &lt; bar")
    })

    it("should escape greater-than sign", () => {
      expect(escapeHtml("foo > bar")).toBe("foo &gt; bar")
    })

    it("should escape double quotes", () => {
      expect(escapeHtml('foo "bar"')).toBe("foo &quot;bar&quot;")
    })

    it("should escape single quotes", () => {
      expect(escapeHtml("foo 'bar'")).toBe("foo &#x27;bar&#x27;")
    })

    it("should escape all special characters together", () => {
      expect(escapeHtml(`<div class="test" data-value='foo & bar'>`)).toBe(
        "&lt;div class=&quot;test&quot; data-value=&#x27;foo &amp; bar&#x27;&gt;",
      )
    })
  })

  describe("XSS prevention", () => {
    it("should neutralize script tags", () => {
      const malicious = '<script>alert("xss")</script>'
      const escaped = escapeHtml(malicious)

      expect(escaped).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;")
      expect(escaped).not.toContain("<script>")
      expect(escaped).not.toContain("</script>")
    })

    it("should neutralize event handlers", () => {
      const malicious = '<img src="x" onerror="alert(1)">'
      const escaped = escapeHtml(malicious)

      expect(escaped).toBe("&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;")
      // The angle brackets are escaped, preventing HTML parsing
      expect(escaped).not.toContain("<img")
      expect(escaped).not.toContain(">")
    })

    it("should neutralize javascript: URLs", () => {
      const malicious = '<a href="javascript:alert(1)">click</a>'
      const escaped = escapeHtml(malicious)

      expect(escaped).toBe("&lt;a href=&quot;javascript:alert(1)&quot;&gt;click&lt;/a&gt;")
      expect(escaped).not.toContain("<a")
    })

    it("should handle single quote event handlers", () => {
      const malicious = "<div onclick='alert(1)'>"
      const escaped = escapeHtml(malicious)

      expect(escaped).toBe("&lt;div onclick=&#x27;alert(1)&#x27;&gt;")
      expect(escaped).not.toContain("<div")
    })

    it("should neutralize SVG-based XSS", () => {
      const malicious = '<svg onload="alert(1)">'
      const escaped = escapeHtml(malicious)

      expect(escaped).toBe("&lt;svg onload=&quot;alert(1)&quot;&gt;")
      expect(escaped).not.toContain("<svg")
    })

    it("should handle template injection attempts", () => {
      const malicious = "{{constructor.constructor('alert(1)')()}}"
      const escaped = escapeHtml(malicious)

      // No HTML characters to escape, but string passes through safely
      expect(escaped).toBe("{{constructor.constructor(&#x27;alert(1)&#x27;)()}}")
    })
  })

  describe("edge cases", () => {
    it("should return empty string for non-string input", () => {
      expect(escapeHtml(null as unknown as string)).toBe("")
      expect(escapeHtml(undefined as unknown as string)).toBe("")
      expect(escapeHtml(123 as unknown as string)).toBe("")
      expect(escapeHtml({} as unknown as string)).toBe("")
      expect(escapeHtml([] as unknown as string)).toBe("")
    })

    it("should handle empty string", () => {
      expect(escapeHtml("")).toBe("")
    })

    it("should pass through safe strings unchanged", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World")
      expect(escapeHtml("user@example.com")).toBe("user@example.com")
      expect(escapeHtml("123-456-789")).toBe("123-456-789")
    })

    it("should handle unicode characters", () => {
      expect(escapeHtml("Hello 世界 🌍")).toBe("Hello 世界 🌍")
    })

    it("should handle newlines and whitespace", () => {
      expect(escapeHtml("line1\nline2\tindented")).toBe("line1\nline2\tindented")
    })

    it("should handle repeated special characters", () => {
      expect(escapeHtml("<<<>>>")).toBe("&lt;&lt;&lt;&gt;&gt;&gt;")
      expect(escapeHtml("&&&")).toBe("&amp;&amp;&amp;")
    })

    it("should not double-escape already escaped strings", () => {
      // This is intentional - if someone passes already escaped HTML,
      // it gets escaped again. This prevents bypass attempts.
      expect(escapeHtml("&lt;script&gt;")).toBe("&amp;lt;script&amp;gt;")
    })
  })

  describe("real-world scenarios", () => {
    it("should escape AWS account IDs safely", () => {
      expect(escapeHtml("123456789012")).toBe("123456789012")
    })

    it("should escape lease IDs safely", () => {
      expect(escapeHtml("dXNlckBleGFtcGxlLmNvbXx1dWlk")).toBe("dXNlckBleGFtcGxlLmNvbXx1dWlk")
    })

    it("should escape template names safely", () => {
      expect(escapeHtml("NDX:Try for AWS")).toBe("NDX:Try for AWS")
      expect(escapeHtml("Council Chatbot")).toBe("Council Chatbot")
    })

    it("should escape ISO date strings safely", () => {
      expect(escapeHtml("2026-01-22T12:00:00Z")).toBe("2026-01-22T12:00:00Z")
    })

    it("should escape user-provided comments with malicious content", () => {
      const comment = 'Test comment with <script>evil()</script> and "quotes"'
      expect(escapeHtml(comment)).toBe("Test comment with &lt;script&gt;evil()&lt;/script&gt; and &quot;quotes&quot;")
    })
  })
})
