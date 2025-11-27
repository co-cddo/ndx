import { createMermaidRenderer } from "mermaid-isomorphic"
import crypto from "crypto"
import fs from "fs/promises"
import path from "path"

/**
 * Eleventy plugin for build-time Mermaid SVG rendering.
 *
 * Renders Mermaid diagrams to SVG at build time using Playwright,
 * eliminating the need for client-side JavaScript and ensuring
 * Content Security Policy (CSP) compliance.
 *
 * Security Features:
 * - Removes <style> tags and inline style attributes (CSP compliance)
 * - Strips event handler attributes (XSS prevention)
 * - Removes javascript: URLs (XSS prevention)
 * - Validates input size and complexity (DoS prevention)
 *
 * Performance Features:
 * - Content-based caching for faster incremental builds
 * - Batch rendering of multiple diagrams
 * - Rendering timeout protection
 *
 * @param {object} eleventyConfig - Eleventy configuration object
 * @param {object} [options] - Plugin options
 * @param {string} [options.theme='default'] - Mermaid theme: 'default', 'dark', 'forest', 'neutral'
 * @param {object} [options.mermaidConfig] - Additional mermaid configuration options
 * @param {object} [options.launchOptions] - Playwright browser launch options
 * @param {number} [options.renderTimeout=30000] - Timeout for rendering in ms
 * @param {number} [options.maxDiagramSize=50000] - Maximum diagram source size in characters
 * @param {number} [options.maxDiagramsPerPage=20] - Maximum diagrams per page
 * @param {boolean} [options.cache=true] - Enable content-based caching
 * @param {string} [options.cacheDir='.cache/mermaid'] - Cache directory path
 *
 * @example
 * // Basic usage
 * eleventyConfig.addPlugin(mermaidTransformPlugin);
 *
 * @example
 * // With custom theme and options
 * eleventyConfig.addPlugin(mermaidTransformPlugin, {
 *   theme: 'default',
 *   renderTimeout: 60000,
 *   mermaidConfig: {
 *     flowchart: { curve: 'basis' }
 *   }
 * });
 */
export default function mermaidTransformPlugin(eleventyConfig, options = {}) {
  // Validate options
  validateOptions(options)

  // Configuration with defaults
  const config = {
    theme: options.theme || "default",
    renderTimeout: options.renderTimeout || 30000,
    maxDiagramSize: options.maxDiagramSize || 50000,
    maxDiagramsPerPage: options.maxDiagramsPerPage || 20,
    cache: options.cache !== false,
    cacheDir: options.cacheDir || ".cache/mermaid",
  }

  // Lazy-initialized renderer
  let renderer = null
  const getRenderer = () => {
    if (!renderer) {
      renderer = createMermaidRenderer({
        launchOptions: options.launchOptions || {},
      })
    }
    return renderer
  }

  const mermaidConfig = {
    theme: config.theme,
    fontFamily: "system-ui, sans-serif",
    flowchart: { useMaxWidth: true, htmlLabels: false }, // htmlLabels: false for security
    securityLevel: "strict",
    ...options.mermaidConfig,
  }

  // Thread-safe render statistics
  const renderStats = {
    totalDiagrams: 0,
    totalPages: 0,
    failedDiagrams: 0,
    cacheHits: 0,
  }

  // In-memory cache for current build
  const diagramCache = new Map()

  // Transform: find mermaid blocks in HTML output, render to SVG
  eleventyConfig.addTransform("mermaid-svg", async function (content) {
    const outputPath = this.page.outputPath || ""
    if (!outputPath.endsWith(".html")) return content

    // Match <pre class="mermaid">...</pre> blocks
    const mermaidRegex = /<pre class="mermaid">([\s\S]*?)<\/pre>/g
    const matches = [...content.matchAll(mermaidRegex)]

    if (matches.length === 0) return content

    // Validate diagram count
    if (matches.length > config.maxDiagramsPerPage) {
      console.error(
        `[mermaid] Too many diagrams (${matches.length} > ${config.maxDiagramsPerPage}) in ${this.page.inputPath}`,
      )
      return content
    }

    // Extract, decode, and validate diagram sources
    const diagrams = []
    const validationErrors = []

    for (let i = 0; i < matches.length; i++) {
      const source = decodeHtmlEntities(matches[i][1].trim())
      const validation = validateDiagram(source, config)

      if (!validation.valid) {
        validationErrors.push({ index: i, error: validation.error, source })
        diagrams.push(null) // Placeholder
      } else {
        diagrams.push(source)
      }
    }

    // Log validation errors
    if (validationErrors.length > 0) {
      console.warn(`[mermaid] ${validationErrors.length} invalid diagram(s) in ${this.page.inputPath}`)
      validationErrors.forEach(({ index, error }) => {
        console.warn(`[mermaid]   Diagram ${index + 1}: ${error}`)
      })
    }

    // Check cache and identify diagrams needing rendering
    const renderQueue = []
    const cacheKeys = []

    for (let i = 0; i < diagrams.length; i++) {
      if (diagrams[i] === null) {
        cacheKeys.push(null)
        continue
      }

      const cacheKey = getCacheKey(diagrams[i], mermaidConfig)
      cacheKeys.push(cacheKey)

      // Check in-memory cache first
      if (config.cache && diagramCache.has(cacheKey)) {
        renderStats.cacheHits++
        continue
      }

      // Check file cache
      if (config.cache) {
        const cached = await loadFromCache(config.cacheDir, cacheKey)
        if (cached) {
          diagramCache.set(cacheKey, cached)
          renderStats.cacheHits++
          continue
        }
      }

      renderQueue.push({ index: i, source: diagrams[i], cacheKey })
    }

    // Render diagrams that weren't cached
    if (renderQueue.length > 0) {
      try {
        const sourcesToRender = renderQueue.map((r) => r.source)
        const results = await renderWithTimeout(
          getRenderer(),
          sourcesToRender,
          { mermaidOptions: mermaidConfig },
          config.renderTimeout,
        )

        // Process results and update cache
        for (let i = 0; i < renderQueue.length; i++) {
          const { cacheKey } = renderQueue[i]
          const result = results[i]

          if (result.status === "fulfilled") {
            const sanitizedSvg = sanitizeSvg(result.value.svg)
            diagramCache.set(cacheKey, sanitizedSvg)

            // Save to file cache
            if (config.cache) {
              await saveToCache(config.cacheDir, cacheKey, sanitizedSvg)
            }
          } else {
            diagramCache.set(cacheKey, { error: result.reason })
          }
        }
      } catch (error) {
        console.error(`[mermaid] Rendering failed: ${error.message}`)
        return content
      }
    }

    // Replace diagrams in content
    let idx = 0
    let successCount = 0
    let failureCount = 0

    const processedContent = content.replace(mermaidRegex, (match, source) => {
      const currentIdx = idx++
      const decodedSource = decodeHtmlEntities(source.trim())

      // Handle validation failures
      if (diagrams[currentIdx] === null) {
        failureCount++
        const error = validationErrors.find((e) => e.index === currentIdx)
        return createErrorMarkup(decodedSource, error?.error || "Validation failed")
      }

      const cacheKey = cacheKeys[currentIdx]
      const cached = diagramCache.get(cacheKey)

      // Handle render failures
      if (cached?.error) {
        failureCount++
        return createErrorMarkup(decodedSource, String(cached.error))
      }

      // Success - return sanitized SVG
      successCount++
      const diagramType = detectDiagramType(decodedSource)

      return `<figure class="mermaid-diagram" data-mermaid-theme="${config.theme}" role="img" aria-label="${diagramType}">
  ${cached}
  <details class="mermaid-source-details">
    <summary class="govuk-visually-hidden">View diagram source code</summary>
    <pre class="mermaid-source" aria-hidden="true">${escapeHtml(decodedSource)}</pre>
  </details>
</figure>`
    })

    // Update stats
    renderStats.totalDiagrams += successCount
    renderStats.failedDiagrams += failureCount
    renderStats.totalPages++

    const cacheInfo =
      config.cache && renderStats.cacheHits > 0
        ? ` (${renderQueue.length} rendered, ${matches.length - renderQueue.length - validationErrors.length} cached)`
        : ""

    console.log(`[mermaid] ${successCount}/${matches.length} diagram(s) in ${this.page.inputPath}${cacheInfo}`)

    return processedContent
  })

  // Markdown highlighter for ```mermaid code blocks
  eleventyConfig.addMarkdownHighlighter((code, language) => {
    if (language === "mermaid") {
      return `<pre class="mermaid">${escapeHtml(code)}</pre>`
    }
    // Fallback for undefined language
    const langClass = language && language !== "undefined" ? language : "plaintext"
    return `<pre class="${langClass}"><code>${escapeHtml(code)}</code></pre>`
  })

  // Cleanup and summary at end of build
  eleventyConfig.on("eleventy.after", async () => {
    if (renderStats.totalPages > 0) {
      const cacheInfo = config.cache ? ` (${renderStats.cacheHits} cache hits)` : ""
      console.log(
        `[mermaid] Build complete: ${renderStats.totalDiagrams} diagram(s) across ${renderStats.totalPages} page(s)${cacheInfo}`,
      )

      if (renderStats.failedDiagrams > 0) {
        console.warn(`[mermaid] ${renderStats.failedDiagrams} diagram(s) failed`)
      }
    }

    // Clear in-memory cache
    diagramCache.clear()

    // Note: mermaid-isomorphic manages browser lifecycle internally
    // No explicit cleanup needed
  })

  // Clear file cache on clean build
  eleventyConfig.on("eleventy.before", async ({ runMode }) => {
    if (runMode === "build" && config.cache) {
      // Reset in-memory cache for fresh build
      diagramCache.clear()
    }
  })
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate plugin options on initialization.
 * @param {object} options - Plugin options
 * @throws {Error} If options are invalid
 */
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

/**
 * Validate a Mermaid diagram source before rendering.
 * Checks size limits, complexity, and potentially dangerous patterns.
 *
 * @param {string} source - Diagram source code
 * @param {object} config - Plugin configuration
 * @returns {{ valid: boolean, error?: string }}
 */
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

  // Check for obviously malicious patterns (defense in depth)
  if (source.includes("<script") || source.includes("javascript:")) {
    return { valid: false, error: "Potentially malicious content detected" }
  }

  // Estimate complexity (rough heuristic based on node count)
  const nodeMatches = source.match(/\n\s*[A-Za-z0-9_-]+[\[\(\{<]/g) || []
  if (nodeMatches.length > 200) {
    return {
      valid: false,
      error: `Diagram too complex (${nodeMatches.length} nodes estimated)`,
    }
  }

  return { valid: true }
}

// ============================================================================
// Rendering Functions
// ============================================================================

/**
 * Render diagrams with timeout protection.
 *
 * @param {Function} renderer - Mermaid renderer function
 * @param {string[]} diagrams - Diagram sources
 * @param {object} config - Mermaid configuration
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Array>} - Render results
 */
async function renderWithTimeout(renderer, diagrams, config, timeoutMs) {
  return Promise.race([
    renderer(diagrams, config),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Rendering timeout after ${timeoutMs}ms`)), timeoutMs),
    ),
  ])
}

// ============================================================================
// Caching Functions
// ============================================================================

/**
 * Generate cache key for diagram source and configuration.
 *
 * @param {string} source - Diagram source
 * @param {object} config - Mermaid configuration
 * @returns {string} - SHA256 hash
 */
function getCacheKey(source, config) {
  const hash = crypto.createHash("sha256")
  hash.update(source)
  hash.update(JSON.stringify(config))
  return hash.digest("hex")
}

/**
 * Load cached SVG from file system.
 *
 * @param {string} cacheDir - Cache directory
 * @param {string} cacheKey - Cache key
 * @returns {Promise<string|null>} - Cached SVG or null
 */
async function loadFromCache(cacheDir, cacheKey) {
  try {
    const cachePath = path.join(cacheDir, `${cacheKey}.svg`)
    return await fs.readFile(cachePath, "utf-8")
  } catch {
    return null
  }
}

/**
 * Save SVG to file cache.
 *
 * @param {string} cacheDir - Cache directory
 * @param {string} cacheKey - Cache key
 * @param {string} svg - SVG content
 */
async function saveToCache(cacheDir, cacheKey, svg) {
  try {
    await fs.mkdir(cacheDir, { recursive: true })
    const cachePath = path.join(cacheDir, `${cacheKey}.svg`)
    await fs.writeFile(cachePath, svg, "utf-8")
  } catch (error) {
    console.warn(`[mermaid] Failed to cache diagram: ${error.message}`)
  }
}

// ============================================================================
// HTML Entity Functions
// ============================================================================

/**
 * Decode HTML entities from markdown processing.
 * Handles named entities, numeric entities, and hex entities.
 * IMPORTANT: Decodes & first to prevent double-encoding exploits.
 *
 * @param {string} text - Text with HTML entities
 * @returns {string} - Decoded text
 * @example
 * decodeHtmlEntities("&lt;div&gt;") // returns "<div>"
 * decodeHtmlEntities("&#65;") // returns "A"
 */
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

  return (
    text
      // Decode & first to prevent double-encoding exploits
      .replace(/&amp;/g, "&")
      // Named entities
      .replace(/&(gt|lt|quot|apos|nbsp);/gi, (match) => entities[match.toLowerCase()] || match)
      // Numeric entities (&#123;)
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      // Hex entities (&#x1F;)
      .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  )
}

/**
 * Escape HTML special characters for safe embedding.
 * Prevents XSS by converting characters that have special meaning in HTML.
 *
 * @param {string} text - Raw text
 * @returns {string} - Escaped text safe for HTML
 * @example
 * escapeHtml("<script>") // returns "&lt;script&gt;"
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

// ============================================================================
// SVG Sanitization Functions
// ============================================================================

/**
 * Sanitize SVG output for security and CSP compliance.
 *
 * Removes:
 * - <style> tags (CSP style-src compliance)
 * - Inline style attributes (CSP style-src compliance)
 * - Event handler attributes (XSS prevention)
 * - <script> tags (defense in depth)
 * - javascript: URLs (XSS prevention)
 *
 * @param {string} svg - SVG string from mermaid-isomorphic
 * @returns {string} - Sanitized SVG
 */
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
  // Matches: onclick, onload, onerror, onmouseover, onfocus, etc.
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

// ============================================================================
// Accessibility Functions
// ============================================================================

/**
 * Detect diagram type from Mermaid source for accessible labeling.
 *
 * @param {string} source - Mermaid diagram source
 * @returns {string} - Human-readable diagram type
 */
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

/**
 * Create error markup for failed diagram rendering.
 *
 * @param {string} source - Original diagram source
 * @param {string} error - Error message
 * @returns {string} - Error HTML markup
 */
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
