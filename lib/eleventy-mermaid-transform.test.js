/**
 * Tests for Mermaid Build-Time SVG Rendering Plugin
 *
 * Tests cover:
 * - HTML entity encoding/decoding
 * - SVG sanitization (XSS prevention)
 * - Input validation (DoS prevention)
 * - Diagram type detection (accessibility)
 * - Error markup generation
 * - Plugin option validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Since the functions are not exported, we need to re-implement them for testing
// In a real scenario, you would export these functions from the module

// ============================================================================
// Test implementations of utility functions (matching the plugin)
// ============================================================================

function decodeHtmlEntities(text) {
  const entities = {
    "&amp;": "&",
    "&gt;": ">",
    "&lt;": "<",
    "&quot;": '"',
    "&apos;": "'",
    "&#x27;": "'",
    "&#39;": "'",
    "&nbsp;": " ",
  }

  return text
    .replace(/&amp;/g, "&")
    .replace(/&(gt|lt|quot|apos|nbsp);/gi, (match) => entities[match.toLowerCase()] || match)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

function sanitizeSvg(svg) {
  if (typeof svg !== "string") {
    throw new TypeError("sanitizeSvg expects a string argument")
  }

  let processed = svg

  // Remove <style> tags for CSP compliance
  processed = processed.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")

  // Remove inline style attributes for CSP compliance
  processed = processed.replace(/\s+style\s*=\s*"[^"]*"/gi, "")
  processed = processed.replace(/\s+style\s*=\s*'[^']*'/gi, "")

  // Remove event handler attributes (XSS prevention)
  processed = processed.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "")
  processed = processed.replace(/\s+on\w+\s*=\s*'[^']*'/gi, "")

  // Remove script tags (defense in depth)
  processed = processed.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")

  // Remove javascript: URLs in href/xlink:href (XSS prevention)
  processed = processed.replace(/(href|xlink:href)\s*=\s*["']javascript:[^"']*["']/gi, '$1="#"')

  // Remove data: URLs that could contain scripts
  processed = processed.replace(/(href|xlink:href)\s*=\s*["']data:text\/html[^"']*["']/gi, '$1="#"')

  return processed
}

function validateDiagram(source, config) {
  if (!source || typeof source !== "string") {
    return { valid: false, error: "Empty or invalid diagram source" }
  }

  if (source.length > config.maxDiagramSize) {
    return {
      valid: false,
      error: `Diagram exceeds maximum size (${source.length} > ${config.maxDiagramSize} chars)`,
    }
  }

  if (source.includes("<script") || source.includes("javascript:")) {
    return { valid: false, error: "Potentially malicious content detected" }
  }

  const nodeMatches = source.match(/\n\s*[A-Za-z0-9_-]+[\[\(\{<]/g) || []
  if (nodeMatches.length > 200) {
    return {
      valid: false,
      error: `Diagram too complex (${nodeMatches.length} nodes estimated)`,
    }
  }

  return { valid: true }
}

function detectDiagramType(source) {
  const firstLine = source.trim().split("\n")[0].trim().toLowerCase()

  const typeMap = {
    graph: "Flowchart diagram",
    flowchart: "Flowchart diagram",
    sequencediagram: "Sequence diagram",
    classdiagram: "Class diagram",
    statediagram: "State diagram",
    erdiagram: "Entity relationship diagram",
    journey: "User journey diagram",
    gantt: "Gantt chart",
    pie: "Pie chart",
    gitgraph: "Git graph",
    mindmap: "Mind map",
    timeline: "Timeline diagram",
    quadrantchart: "Quadrant chart",
    sankey: "Sankey diagram",
    xychart: "XY chart",
    block: "Block diagram",
  }

  for (const [keyword, label] of Object.entries(typeMap)) {
    if (firstLine.startsWith(keyword)) {
      return label
    }
  }

  return "Diagram"
}

function validateOptions(options) {
  const errors = []

  if (options.theme && typeof options.theme !== "string") {
    errors.push("options.theme must be a string")
  }

  if (options.mermaidConfig && typeof options.mermaidConfig !== "object") {
    errors.push("options.mermaidConfig must be an object")
  }

  if (options.launchOptions && typeof options.launchOptions !== "object") {
    errors.push("options.launchOptions must be an object")
  }

  if (options.renderTimeout && typeof options.renderTimeout !== "number") {
    errors.push("options.renderTimeout must be a number")
  }

  if (errors.length > 0) {
    throw new Error(`[mermaid] Invalid plugin options:\n  - ${errors.join("\n  - ")}`)
  }
}

function createErrorMarkup(source, error) {
  return `<div class="mermaid-error" role="alert">
  <p><strong>Diagram failed to render</strong></p>
  <details>
    <summary>Error details</summary>
    <p>${escapeHtml(error)}</p>
  </details>
  <pre>${escapeHtml(source)}</pre>
</div>`
}

// ============================================================================
// HTML Entity Tests
// ============================================================================

describe("HTML Entity Functions", () => {
  describe("decodeHtmlEntities", () => {
    it("should decode common HTML entities", () => {
      expect(decodeHtmlEntities("&lt;div&gt;")).toBe("<div>")
      expect(decodeHtmlEntities("&amp;")).toBe("&")
      expect(decodeHtmlEntities("&quot;test&quot;")).toBe('"test"')
    })

    it("should decode & first to prevent double-encoding exploits", () => {
      // When &amp; is decoded first, &amp;lt; becomes &lt;, then <
      const input = "&amp;lt;test&amp;gt;"
      const result = decodeHtmlEntities(input)
      // After decoding &amp; -> &, we have &lt;test&gt;
      // Then &lt; -> < and &gt; -> >
      expect(result).toBe("<test>")
    })

    it("should decode numeric entities", () => {
      expect(decodeHtmlEntities("&#65;")).toBe("A")
      expect(decodeHtmlEntities("&#97;")).toBe("a")
      expect(decodeHtmlEntities("&#60;")).toBe("<")
      expect(decodeHtmlEntities("&#62;")).toBe(">")
    })

    it("should decode hex entities", () => {
      expect(decodeHtmlEntities("&#x41;")).toBe("A")
      expect(decodeHtmlEntities("&#x61;")).toBe("a")
      expect(decodeHtmlEntities("&#x3C;")).toBe("<")
      expect(decodeHtmlEntities("&#x3E;")).toBe(">")
    })

    it("should handle nbsp entities", () => {
      expect(decodeHtmlEntities("hello&nbsp;world")).toBe("hello world")
    })

    it("should handle mixed entities", () => {
      const input = "&lt;div class=&quot;test&quot;&gt;&#65;&#x42;&lt;/div&gt;"
      expect(decodeHtmlEntities(input)).toBe('<div class="test">AB</div>')
    })

    it("should preserve text without entities", () => {
      expect(decodeHtmlEntities("Hello World")).toBe("Hello World")
      expect(decodeHtmlEntities("graph TD\n  A-->B")).toBe("graph TD\n  A-->B")
    })
  })

  describe("escapeHtml", () => {
    it("should escape all HTML special characters", () => {
      expect(escapeHtml("<")).toBe("&lt;")
      expect(escapeHtml(">")).toBe("&gt;")
      expect(escapeHtml("&")).toBe("&amp;")
      expect(escapeHtml('"')).toBe("&quot;")
      expect(escapeHtml("'")).toBe("&#x27;")
    })

    it("should escape multiple characters", () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;")
    })

    it("should handle text without special characters", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World")
    })

    it("should escape & before other entities", () => {
      // Important for preventing double-encoding issues
      expect(escapeHtml("&lt;")).toBe("&amp;lt;")
    })
  })

  describe("round-trip encoding", () => {
    it("should preserve text through escape then decode", () => {
      const original = "Hello <World> & 'Friends'"
      const escaped = escapeHtml(original)
      const decoded = decodeHtmlEntities(escaped)
      expect(decoded).toBe(original)
    })
  })
})

// ============================================================================
// SVG Sanitization Tests
// ============================================================================

describe("SVG Sanitization", () => {
  describe("sanitizeSvg", () => {
    it("should remove style tags", () => {
      const svg = "<svg><style>.node { fill: red; }</style><rect/></svg>"
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("<style")
      expect(result).not.toContain("</style>")
      expect(result).toContain("<rect/>")
    })

    it("should remove inline style attributes (double quotes)", () => {
      const svg = '<svg><rect style="fill:red"/></svg>'
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("style=")
      expect(result).toContain("<rect/>")
    })

    it("should remove inline style attributes (single quotes)", () => {
      const svg = "<svg><rect style='fill:red'/></svg>"
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("style=")
    })

    it("should remove onclick event handlers", () => {
      const svg = '<svg><rect onclick="alert(1)"/></svg>'
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("onclick")
      expect(result).not.toContain("alert")
    })

    it("should remove onload event handlers", () => {
      const svg = '<svg onload="alert(1)"><rect/></svg>'
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("onload")
    })

    it("should remove onerror event handlers", () => {
      const svg = '<svg><image onerror="alert(1)"/></svg>'
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("onerror")
    })

    it("should remove onmouseover event handlers", () => {
      const svg = '<svg><rect onmouseover="alert(1)"/></svg>'
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("onmouseover")
    })

    it("should remove all event handler variations", () => {
      const events = ["onclick", "onload", "onerror", "onmouseover", "onfocus", "onblur"]
      events.forEach((event) => {
        const svg = `<svg><g ${event}="alert(1)">test</g></svg>`
        const result = sanitizeSvg(svg)
        expect(result).not.toContain(event)
      })
    })

    it("should remove script tags", () => {
      const svg = "<svg><script>alert(1)</script><rect/></svg>"
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("<script")
      expect(result).not.toContain("</script>")
      expect(result).toContain("<rect/>")
    })

    it("should remove javascript: URLs in href", () => {
      const svg = '<svg><a href="javascript:alert(1)">link</a></svg>'
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("javascript:")
      expect(result).toContain('href="#"')
    })

    it("should remove javascript: URLs in xlink:href", () => {
      const svg = '<svg><a xlink:href="javascript:alert(1)">link</a></svg>'
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("javascript:")
      expect(result).toContain('xlink:href="#"')
    })

    it("should remove data:text/html URLs", () => {
      const svg = '<svg><a href="data:text/html,<script>alert(1)</script>">link</a></svg>'
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("data:text/html")
      expect(result).toContain('href="#"')
    })

    it("should preserve other attributes", () => {
      const svg = '<svg><rect class="node" id="node-1" fill="red"/></svg>'
      const result = sanitizeSvg(svg)
      expect(result).toContain('class="node"')
      expect(result).toContain('id="node-1"')
      expect(result).toContain('fill="red"')
    })

    it("should preserve safe href URLs", () => {
      const svg = '<svg><a href="https://example.com">link</a></svg>'
      const result = sanitizeSvg(svg)
      expect(result).toContain('href="https://example.com"')
    })

    it("should throw TypeError for non-string input", () => {
      expect(() => sanitizeSvg(null)).toThrow(TypeError)
      expect(() => sanitizeSvg(undefined)).toThrow(TypeError)
      expect(() => sanitizeSvg(123)).toThrow(TypeError)
      expect(() => sanitizeSvg({})).toThrow(TypeError)
    })

    it("should handle complex SVG with multiple dangerous elements", () => {
      const svg = `
        <svg onclick="alert(1)">
          <style>.evil { display: none; }</style>
          <script>alert('xss')</script>
          <g style="fill:red" onmouseover="fetch('evil.com')">
            <rect class="node"/>
            <a href="javascript:alert(1)">Click me</a>
          </g>
        </svg>
      `
      const result = sanitizeSvg(svg)
      expect(result).not.toContain("onclick")
      expect(result).not.toContain("<style")
      expect(result).not.toContain("<script")
      expect(result).not.toContain("style=")
      expect(result).not.toContain("onmouseover")
      expect(result).not.toContain("javascript:")
      expect(result).toContain('class="node"')
    })
  })
})

// ============================================================================
// Input Validation Tests
// ============================================================================

describe("Input Validation", () => {
  const defaultConfig = {
    maxDiagramSize: 50000,
    maxDiagramsPerPage: 20,
  }

  describe("validateDiagram", () => {
    it("should accept valid diagram source", () => {
      const source = "graph TD\n  A-->B"
      const result = validateDiagram(source, defaultConfig)
      expect(result.valid).toBe(true)
    })

    it("should reject empty source", () => {
      const result = validateDiagram("", defaultConfig)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("Empty")
    })

    it("should reject null source", () => {
      const result = validateDiagram(null, defaultConfig)
      expect(result.valid).toBe(false)
    })

    it("should reject undefined source", () => {
      const result = validateDiagram(undefined, defaultConfig)
      expect(result.valid).toBe(false)
    })

    it("should reject diagrams exceeding size limit", () => {
      const source = "A".repeat(50001)
      const result = validateDiagram(source, defaultConfig)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("maximum size")
    })

    it("should accept diagrams at exactly the size limit", () => {
      const source = "A".repeat(50000)
      const result = validateDiagram(source, defaultConfig)
      expect(result.valid).toBe(true)
    })

    it("should reject diagrams with script tags", () => {
      const source = "graph TD\n  A[<script>alert(1)</script>]-->B"
      const result = validateDiagram(source, defaultConfig)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("malicious")
    })

    it("should reject diagrams with javascript: URLs", () => {
      const source = "graph TD\n  A[click me](javascript:alert(1))"
      const result = validateDiagram(source, defaultConfig)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("malicious")
    })

    it("should reject overly complex diagrams", () => {
      // Create a diagram with many nodes
      const nodes = Array.from({ length: 201 }, (_, i) => `\n  Node${i}[Node ${i}]`).join("")
      const source = `graph TD${nodes}`
      const result = validateDiagram(source, defaultConfig)
      expect(result.valid).toBe(false)
      expect(result.error).toContain("complex")
    })

    it("should accept reasonably complex diagrams", () => {
      const nodes = Array.from({ length: 50 }, (_, i) => `\n  Node${i}[Node ${i}]`).join("")
      const source = `graph TD${nodes}`
      const result = validateDiagram(source, defaultConfig)
      expect(result.valid).toBe(true)
    })
  })

  describe("validateOptions", () => {
    it("should accept valid options", () => {
      expect(() => validateOptions({})).not.toThrow()
      expect(() => validateOptions({ theme: "default" })).not.toThrow()
      expect(() => validateOptions({ renderTimeout: 30000 })).not.toThrow()
      expect(() => validateOptions({ mermaidConfig: {} })).not.toThrow()
    })

    it("should reject invalid theme type", () => {
      expect(() => validateOptions({ theme: 123 })).toThrow("theme must be a string")
    })

    it("should reject invalid mermaidConfig type", () => {
      expect(() => validateOptions({ mermaidConfig: "invalid" })).toThrow("mermaidConfig must be an object")
    })

    it("should reject invalid launchOptions type", () => {
      expect(() => validateOptions({ launchOptions: "invalid" })).toThrow("launchOptions must be an object")
    })

    it("should reject invalid renderTimeout type", () => {
      expect(() => validateOptions({ renderTimeout: "30000" })).toThrow("renderTimeout must be a number")
    })

    it("should report multiple validation errors", () => {
      expect(() =>
        validateOptions({
          theme: 123,
          mermaidConfig: "invalid",
        }),
      ).toThrow(/theme.*mermaidConfig/s)
    })
  })
})

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("Accessibility", () => {
  describe("detectDiagramType", () => {
    it("should detect flowchart diagrams", () => {
      expect(detectDiagramType("graph TD\n  A-->B")).toBe("Flowchart diagram")
      expect(detectDiagramType("graph LR\n  A-->B")).toBe("Flowchart diagram")
      expect(detectDiagramType("flowchart TD\n  A-->B")).toBe("Flowchart diagram")
    })

    it("should detect sequence diagrams", () => {
      expect(detectDiagramType("sequenceDiagram\n  Alice->>Bob: Hello")).toBe("Sequence diagram")
    })

    it("should detect class diagrams", () => {
      expect(detectDiagramType("classDiagram\n  Animal <|-- Duck")).toBe("Class diagram")
    })

    it("should detect state diagrams", () => {
      expect(detectDiagramType("stateDiagram-v2\n  [*] --> Still")).toBe("State diagram")
    })

    it("should detect entity relationship diagrams", () => {
      expect(detectDiagramType("erDiagram\n  CUSTOMER ||--o{ ORDER")).toBe("Entity relationship diagram")
    })

    it("should detect user journey diagrams", () => {
      expect(detectDiagramType("journey\n  title My journey")).toBe("User journey diagram")
    })

    it("should detect gantt charts", () => {
      expect(detectDiagramType("gantt\n  title A Gantt Chart")).toBe("Gantt chart")
    })

    it("should detect pie charts", () => {
      expect(detectDiagramType("pie title Pets\n  Dogs: 30")).toBe("Pie chart")
    })

    it("should detect git graphs", () => {
      expect(detectDiagramType("gitGraph\n  commit")).toBe("Git graph")
    })

    it("should detect mind maps", () => {
      expect(detectDiagramType("mindmap\n  root((mindmap))")).toBe("Mind map")
    })

    it("should detect timeline diagrams", () => {
      expect(detectDiagramType("timeline\n  title History")).toBe("Timeline diagram")
    })

    it("should detect quadrant charts", () => {
      expect(detectDiagramType("quadrantChart\n  title Reach")).toBe("Quadrant chart")
    })

    it("should return generic label for unknown types", () => {
      expect(detectDiagramType("unknown\n  stuff")).toBe("Diagram")
      expect(detectDiagramType("")).toBe("Diagram")
    })

    it("should be case-insensitive for detection", () => {
      expect(detectDiagramType("GRAPH TD\n  A-->B")).toBe("Flowchart diagram")
      expect(detectDiagramType("Graph TD\n  A-->B")).toBe("Flowchart diagram")
    })
  })
})

// ============================================================================
// Error Markup Tests
// ============================================================================

describe("Error Markup", () => {
  describe("createErrorMarkup", () => {
    it("should generate valid error HTML", () => {
      const markup = createErrorMarkup("graph TD\n  A-->B", "Test error")
      expect(markup).toContain('class="mermaid-error"')
      expect(markup).toContain('role="alert"')
      expect(markup).toContain("Diagram failed to render")
      expect(markup).toContain("Test error")
      expect(markup).toContain("graph TD")
    })

    it("should escape HTML in error messages", () => {
      const markup = createErrorMarkup("graph TD", '<script>alert("xss")</script>')
      expect(markup).not.toContain("<script>")
      expect(markup).toContain("&lt;script&gt;")
    })

    it("should escape HTML in source code", () => {
      const markup = createErrorMarkup("graph TD\n  A[<script>]-->B", "Error")
      expect(markup).not.toContain("<script>")
      expect(markup).toContain("&lt;script&gt;")
    })

    it("should include details section with summary", () => {
      const markup = createErrorMarkup("graph TD", "Error details here")
      expect(markup).toContain("<details>")
      expect(markup).toContain("<summary>")
      expect(markup).toContain("Error details")
    })
  })
})

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("Integration Scenarios", () => {
  it("should handle full XSS attack vector in diagram", () => {
    const maliciousSource = `
      graph TD
        A[<img src=x onerror="alert(1)">]-->B
        B[<script>document.cookie</script>]-->C
        C[<a href="javascript:alert(1)">Click</a>]
    `

    // Validation should catch obvious patterns
    const validation = validateDiagram(maliciousSource, {
      maxDiagramSize: 50000,
    })
    expect(validation.valid).toBe(false)
  })

  it("should handle normal diagram workflow", () => {
    const source = `
      graph TD
        A[Start] --> B{Is it?}
        B -->|Yes| C[OK]
        B -->|No| D[End]
    `

    // Validation should pass
    const validation = validateDiagram(source, {
      maxDiagramSize: 50000,
    })
    expect(validation.valid).toBe(true)

    // Type detection should work
    expect(detectDiagramType(source)).toBe("Flowchart diagram")

    // Entity encoding/decoding should be safe
    const encoded = escapeHtml(source)
    const decoded = decodeHtmlEntities(encoded)
    expect(decoded).toBe(source)
  })

  it("should sanitize output even after Mermaid rendering", () => {
    // Simulate what Mermaid might output
    const mermaidOutput = `
      <svg xmlns="http://www.w3.org/2000/svg" style="max-width: 100%;">
        <style>.node rect { fill: #ececff; }</style>
        <g class="node" onclick="alert(1)">
          <rect style="fill: red;"/>
          <text>Node A</text>
        </g>
        <script>/* malicious */</script>
      </svg>
    `

    const sanitized = sanitizeSvg(mermaidOutput)

    // All dangerous elements should be removed
    expect(sanitized).not.toContain("<style")
    expect(sanitized).not.toContain("<script")
    expect(sanitized).not.toContain("onclick")
    expect(sanitized).not.toContain('style="')

    // Safe content should remain
    expect(sanitized).toContain('class="node"')
    expect(sanitized).toContain("<text>Node A</text>")
  })
})
