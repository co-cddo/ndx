import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import {
  isAllowedDomain,
  getExtensionFromUrl,
  generateFilename,
  extractImageUrls,
  fetchAndCacheImage,
} from "./eleventy-remote-images.js"

// ============================================================================
// isAllowedDomain Tests
// ============================================================================

describe("isAllowedDomain", () => {
  describe("exact domain matching", () => {
    it("should match exact domain", () => {
      expect(isAllowedDomain("https://img.shields.io/badge/test", ["img.shields.io"])).toBe(true)
    })

    it("should not match partial domain name", () => {
      expect(isAllowedDomain("https://notimg.shields.io/badge/test", ["img.shields.io"])).toBe(false)
    })

    it("should match multiple allowed domains", () => {
      const domains = ["img.shields.io", "example.com"]
      expect(isAllowedDomain("https://example.com/image.png", domains)).toBe(true)
      expect(isAllowedDomain("https://img.shields.io/badge/test", domains)).toBe(true)
    })
  })

  describe("subdomain matching", () => {
    it("should match subdomains when parent domain is allowed", () => {
      expect(isAllowedDomain("https://cdn.example.com/image.png", ["example.com"])).toBe(true)
    })

    it("should match deeply nested subdomains", () => {
      expect(isAllowedDomain("https://a.b.c.example.com/image.png", ["example.com"])).toBe(true)
    })

    it("should not match subdomain of different domain", () => {
      expect(isAllowedDomain("https://cdn.other.com/image.png", ["example.com"])).toBe(false)
    })
  })

  describe("invalid URLs", () => {
    it("should return false for invalid URLs", () => {
      expect(isAllowedDomain("not-a-url", ["example.com"])).toBe(false)
    })

    it("should return false for relative URLs", () => {
      expect(isAllowedDomain("/images/test.png", ["example.com"])).toBe(false)
    })

    it("should return false for empty string", () => {
      expect(isAllowedDomain("", ["example.com"])).toBe(false)
    })

    it("should return false for null-like values", () => {
      expect(isAllowedDomain(null, ["example.com"])).toBe(false)
      expect(isAllowedDomain(undefined, ["example.com"])).toBe(false)
    })
  })

  describe("empty domain list", () => {
    it("should return false when no domains are allowed", () => {
      expect(isAllowedDomain("https://example.com/image.png", [])).toBe(false)
    })
  })

  describe("protocol handling", () => {
    it("should match HTTP URLs", () => {
      expect(isAllowedDomain("http://example.com/image.png", ["example.com"])).toBe(true)
    })

    it("should match HTTPS URLs", () => {
      expect(isAllowedDomain("https://example.com/image.png", ["example.com"])).toBe(true)
    })
  })
})

// ============================================================================
// getExtensionFromUrl Tests
// ============================================================================

describe("getExtensionFromUrl", () => {
  describe("explicit extensions", () => {
    it("should extract .svg extension", () => {
      expect(getExtensionFromUrl("https://example.com/image.svg")).toBe(".svg")
    })

    it("should extract .png extension", () => {
      expect(getExtensionFromUrl("https://example.com/image.png")).toBe(".png")
    })

    it("should extract .jpg extension", () => {
      expect(getExtensionFromUrl("https://example.com/image.jpg")).toBe(".jpg")
    })

    it("should extract .jpeg extension", () => {
      expect(getExtensionFromUrl("https://example.com/image.jpeg")).toBe(".jpeg")
    })

    it("should extract .gif extension", () => {
      expect(getExtensionFromUrl("https://example.com/image.gif")).toBe(".gif")
    })

    it("should extract .webp extension", () => {
      expect(getExtensionFromUrl("https://example.com/image.webp")).toBe(".webp")
    })

    it("should handle uppercase extensions", () => {
      expect(getExtensionFromUrl("https://example.com/image.PNG")).toBe(".png")
      expect(getExtensionFromUrl("https://example.com/image.SVG")).toBe(".svg")
    })

    it("should handle mixed case extensions", () => {
      expect(getExtensionFromUrl("https://example.com/image.Png")).toBe(".png")
    })
  })

  describe("shields.io special handling", () => {
    it("should default to .svg for shields.io URLs without extension", () => {
      expect(getExtensionFromUrl("https://img.shields.io/badge/test-blue")).toBe(".svg")
    })

    it("should default to .svg for shields.io subdomains", () => {
      expect(getExtensionFromUrl("https://cdn.shields.io/badge/test-blue")).toBe(".svg")
    })

    it("should respect explicit extension on shields.io", () => {
      expect(getExtensionFromUrl("https://img.shields.io/badge/test.png")).toBe(".png")
    })
  })

  describe("URLs without extensions", () => {
    it("should default to .png for non-shields.io URLs without extension", () => {
      expect(getExtensionFromUrl("https://example.com/image")).toBe(".png")
    })

    it("should default to .png for URLs with query strings but no extension", () => {
      expect(getExtensionFromUrl("https://example.com/image?size=large")).toBe(".png")
    })
  })

  describe("edge cases", () => {
    it("should handle URLs with query strings", () => {
      expect(getExtensionFromUrl("https://example.com/image.png?v=123")).toBe(".png")
    })

    it("should handle URLs with hash fragments", () => {
      expect(getExtensionFromUrl("https://example.com/image.png#section")).toBe(".png")
    })

    it("should return .png for invalid URLs", () => {
      expect(getExtensionFromUrl("not-a-url")).toBe(".png")
    })

    it("should return .png for empty string", () => {
      expect(getExtensionFromUrl("")).toBe(".png")
    })

    it("should handle URLs with dots in path segments", () => {
      expect(getExtensionFromUrl("https://example.com/path.with.dots/image.svg")).toBe(".svg")
    })
  })
})

// ============================================================================
// generateFilename Tests
// ============================================================================

describe("generateFilename", () => {
  it("should generate consistent hash for same URL", () => {
    const url = "https://img.shields.io/badge/test-blue"
    const filename1 = generateFilename(url)
    const filename2 = generateFilename(url)
    expect(filename1).toBe(filename2)
  })

  it("should generate different hashes for different URLs", () => {
    const filename1 = generateFilename("https://img.shields.io/badge/test1")
    const filename2 = generateFilename("https://img.shields.io/badge/test2")
    expect(filename1).not.toBe(filename2)
  })

  it("should include correct extension", () => {
    expect(generateFilename("https://example.com/image.png")).toMatch(/\.png$/)
    expect(generateFilename("https://example.com/image.svg")).toMatch(/\.svg$/)
    expect(generateFilename("https://img.shields.io/badge/test")).toMatch(/\.svg$/)
  })

  it("should generate 16-character hash prefix", () => {
    const filename = generateFilename("https://example.com/image.png")
    const hashPart = filename.replace(/\.[^.]+$/, "")
    expect(hashPart).toHaveLength(16)
  })

  it("should only contain valid filename characters", () => {
    const filename = generateFilename("https://example.com/image.png")
    expect(filename).toMatch(/^[a-f0-9]+\.[a-z]+$/)
  })

  it("should generate valid SHA256 hash prefix", () => {
    const url = "https://example.com/image.png"
    const filename = generateFilename(url)
    const hashPart = filename.replace(/\.[^.]+$/, "")
    const expectedHash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16)
    expect(hashPart).toBe(expectedHash)
  })
})

// ============================================================================
// extractImageUrls Tests
// ============================================================================

describe("extractImageUrls", () => {
  describe("basic extraction", () => {
    it("should extract single image URL", () => {
      const html = '<img src="https://example.com/image.png">'
      const result = extractImageUrls(html)
      expect(result).toHaveLength(1)
      expect(result[0].url).toBe("https://example.com/image.png")
    })

    it("should extract multiple image URLs", () => {
      const html = `
        <img src="https://example.com/image1.png">
        <img src="https://example.com/image2.png">
      `
      const result = extractImageUrls(html)
      expect(result).toHaveLength(2)
      expect(result[0].url).toBe("https://example.com/image1.png")
      expect(result[1].url).toBe("https://example.com/image2.png")
    })

    it("should return empty array for no images", () => {
      const html = "<p>No images here</p>"
      const result = extractImageUrls(html)
      expect(result).toHaveLength(0)
    })
  })

  describe("attribute handling", () => {
    it("should handle double quotes", () => {
      const html = '<img src="https://example.com/image.png">'
      const result = extractImageUrls(html)
      expect(result[0].url).toBe("https://example.com/image.png")
    })

    it("should handle single quotes", () => {
      const html = "<img src='https://example.com/image.png'>"
      const result = extractImageUrls(html)
      expect(result[0].url).toBe("https://example.com/image.png")
    })

    it("should capture attributes before src", () => {
      const html = '<img class="badge" alt="test" src="https://example.com/image.png">'
      const result = extractImageUrls(html)
      expect(result[0].beforeSrc).toContain('class="badge"')
      expect(result[0].beforeSrc).toContain('alt="test"')
    })

    it("should capture attributes after src", () => {
      const html = '<img src="https://example.com/image.png" width="100" height="50">'
      const result = extractImageUrls(html)
      expect(result[0].afterSrc).toContain('width="100"')
      expect(result[0].afterSrc).toContain('height="50"')
    })

    it("should preserve full match for replacement", () => {
      const html = '<img class="badge" src="https://example.com/image.png" alt="test">'
      const result = extractImageUrls(html)
      expect(result[0].fullMatch).toBe(html)
    })
  })

  describe("edge cases", () => {
    it("should handle self-closing tags", () => {
      const html = '<img src="https://example.com/image.png" />'
      const result = extractImageUrls(html)
      expect(result).toHaveLength(1)
    })

    it("should handle images with data attributes", () => {
      const html = '<img data-src="lazy" src="https://example.com/image.png">'
      const result = extractImageUrls(html)
      expect(result[0].url).toBe("https://example.com/image.png")
    })

    it("should not match srcset attribute", () => {
      const html = '<img srcset="https://example.com/image.png 2x" src="https://example.com/main.png">'
      const result = extractImageUrls(html)
      expect(result).toHaveLength(1)
      expect(result[0].url).toBe("https://example.com/main.png")
    })

    it("should handle multiline img tags", () => {
      const html = `<img
        class="badge"
        src="https://example.com/image.png"
        alt="test"
      >`
      const result = extractImageUrls(html)
      expect(result).toHaveLength(1)
      expect(result[0].url).toBe("https://example.com/image.png")
    })
  })
})

// ============================================================================
// fetchAndCacheImage Tests
// ============================================================================

describe("fetchAndCacheImage", () => {
  let mockFetch
  let tempDir
  let config
  let cache

  beforeEach(async () => {
    // Create temp directories
    tempDir = path.join("/tmp", `remote-images-test-${Date.now()}`)
    await fs.mkdir(path.join(tempDir, "output"), { recursive: true })
    await fs.mkdir(path.join(tempDir, "cache"), { recursive: true })

    config = {
      outputDir: path.join(tempDir, "output"),
      cacheDir: path.join(tempDir, "cache"),
      urlPath: "/assets/remote-images",
      timeout: 5000,
      cache: true,
    }

    cache = new Map()

    // Mock fetch
    mockFetch = vi.fn()
  })

  afterEach(async () => {
    // Clean up temp directories
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe("successful fetch", () => {
    it("should fetch and cache image", async () => {
      const imageData = Buffer.from("fake-image-data")
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData),
      })

      const url = "https://img.shields.io/badge/test-blue"
      const result = await fetchAndCacheImage(url, config, cache, mockFetch)

      expect(result).toMatch(/^\/assets\/remote-images\/[a-f0-9]+\.svg$/)
      expect(mockFetch).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("NDX-Build"),
          }),
        }),
      )
    })

    it("should write to output directory", async () => {
      const imageData = Buffer.from("fake-image-data")
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData),
      })

      const url = "https://example.com/image.png"
      await fetchAndCacheImage(url, config, cache, mockFetch)

      const filename = generateFilename(url)
      const outputPath = path.join(config.outputDir, filename)
      const savedData = await fs.readFile(outputPath)
      expect(savedData).toEqual(imageData)
    })

    it("should write to cache directory when caching enabled", async () => {
      const imageData = Buffer.from("fake-image-data")
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData),
      })

      const url = "https://example.com/image.png"
      await fetchAndCacheImage(url, config, cache, mockFetch)

      const filename = generateFilename(url)
      const cachePath = path.join(config.cacheDir, filename)
      const cachedData = await fs.readFile(cachePath)
      expect(cachedData).toEqual(imageData)
    })

    it("should update in-memory cache", async () => {
      const imageData = Buffer.from("fake-image-data")
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData),
      })

      const url = "https://example.com/image.png"
      await fetchAndCacheImage(url, config, cache, mockFetch)

      expect(cache.has(url)).toBe(true)
      expect(cache.get(url).fromCache).toBe(false)
    })
  })

  describe("in-memory cache", () => {
    it("should return cached value from in-memory cache", async () => {
      const url = "https://example.com/image.png"
      cache.set(url, { localPath: "/cached/path.png", fromCache: false })

      const result = await fetchAndCacheImage(url, config, cache, mockFetch)

      expect(result).toBe("/cached/path.png")
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should mark as fromCache when retrieved from in-memory cache", async () => {
      const url = "https://example.com/image.png"
      cache.set(url, { localPath: "/cached/path.png", fromCache: false })

      await fetchAndCacheImage(url, config, cache, mockFetch)

      expect(cache.get(url).fromCache).toBe(true)
    })
  })

  describe("file cache", () => {
    it("should use file cache when available", async () => {
      const url = "https://example.com/image.png"
      const filename = generateFilename(url)
      const cachePath = path.join(config.cacheDir, filename)
      const cachedData = Buffer.from("cached-image-data")
      await fs.writeFile(cachePath, cachedData)

      const result = await fetchAndCacheImage(url, config, cache, mockFetch)

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result).toMatch(/^\/assets\/remote-images\/[a-f0-9]+\.png$/)
    })

    it("should copy from cache to output", async () => {
      const url = "https://example.com/image.png"
      const filename = generateFilename(url)
      const cachePath = path.join(config.cacheDir, filename)
      const outputPath = path.join(config.outputDir, filename)
      const cachedData = Buffer.from("cached-image-data")
      await fs.writeFile(cachePath, cachedData)

      await fetchAndCacheImage(url, config, cache, mockFetch)

      const outputData = await fs.readFile(outputPath)
      expect(outputData).toEqual(cachedData)
    })

    it("should skip file cache when disabled", async () => {
      const configNoCache = { ...config, cache: false }
      const imageData = Buffer.from("fresh-image-data")
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(imageData),
      })

      const url = "https://example.com/image.png"
      const filename = generateFilename(url)
      const cachePath = path.join(config.cacheDir, filename)
      const cachedData = Buffer.from("cached-image-data")
      await fs.writeFile(cachePath, cachedData)

      await fetchAndCacheImage(url, configNoCache, cache, mockFetch)

      // Should have fetched fresh data
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("should throw on HTTP error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      })

      const url = "https://example.com/missing.png"
      await expect(fetchAndCacheImage(url, config, cache, mockFetch)).rejects.toThrow("HTTP 404: Not Found")
    })

    it("should throw on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network failure"))

      const url = "https://example.com/image.png"
      await expect(fetchAndCacheImage(url, config, cache, mockFetch)).rejects.toThrow("Network failure")
    })

    it("should throw timeout error on abort", async () => {
      const abortError = new Error("Aborted")
      abortError.name = "AbortError"
      mockFetch.mockRejectedValue(abortError)

      const url = "https://example.com/image.png"
      await expect(fetchAndCacheImage(url, config, cache, mockFetch)).rejects.toThrow("Timeout after 5000ms")
    })
  })

  describe("request configuration", () => {
    it("should include User-Agent header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from("data")),
      })

      await fetchAndCacheImage("https://example.com/image.png", config, cache, mockFetch)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": "NDX-Build/1.0 (Eleventy static site generator)",
          }),
        }),
      )
    })

    it("should include Accept header for images", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from("data")),
      })

      await fetchAndCacheImage("https://example.com/image.png", config, cache, mockFetch)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "image/*,*/*",
          }),
        }),
      )
    })

    it("should pass abort signal", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from("data")),
      })

      await fetchAndCacheImage("https://example.com/image.png", config, cache, mockFetch)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      )
    })
  })
})

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("integration scenarios", () => {
  describe("shields.io badges", () => {
    it("should correctly process a typical shields.io badge URL", () => {
      const url = "https://img.shields.io/badge/coverage-95%25-brightgreen"

      expect(isAllowedDomain(url, ["img.shields.io"])).toBe(true)
      expect(getExtensionFromUrl(url)).toBe(".svg")

      const filename = generateFilename(url)
      expect(filename).toMatch(/^[a-f0-9]{16}\.svg$/)
    })

    it("should extract shields.io badges from catalogue HTML", () => {
      const html = `
        <p>
          <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
          <img src="https://img.shields.io/badge/version-1.0.0-green" alt="Version">
        </p>
      `
      const images = extractImageUrls(html)
      const filteredImages = images.filter((img) => isAllowedDomain(img.url, ["img.shields.io"]))

      expect(filteredImages).toHaveLength(2)
    })
  })

  describe("mixed content filtering", () => {
    it("should only process allowed domains", () => {
      const html = `
        <img src="https://img.shields.io/badge/test" alt="Badge">
        <img src="/local/image.png" alt="Local">
        <img src="https://evil.com/tracker.gif" alt="Tracker">
        <img src="https://cdn.shields.io/other.svg" alt="CDN Badge">
      `
      const images = extractImageUrls(html)
      const allowedImages = images.filter((img) => isAllowedDomain(img.url, ["shields.io"]))

      expect(allowedImages).toHaveLength(2)
      expect(allowedImages.map((i) => i.url)).toContain("https://img.shields.io/badge/test")
      expect(allowedImages.map((i) => i.url)).toContain("https://cdn.shields.io/other.svg")
    })
  })

  describe("cdn.jsdelivr.net domain", () => {
    it("should match cdn.jsdelivr.net URLs", () => {
      expect(
        isAllowedDomain("https://cdn.jsdelivr.net/gh/co-cddo/cloudmaturity@main/image.png", ["cdn.jsdelivr.net"]),
      ).toBe(true)
    })

    it("should extract correct extension from jsdelivr URLs", () => {
      expect(getExtensionFromUrl("https://cdn.jsdelivr.net/gh/co-cddo/cloudmaturity@main/src/assets/image.png")).toBe(
        ".png",
      )
      expect(getExtensionFromUrl("https://cdn.jsdelivr.net/gh/example/repo@main/icon.svg")).toBe(".svg")
    })

    it("should filter jsdelivr images from mixed HTML", () => {
      const html = `
        <img src="https://cdn.jsdelivr.net/gh/co-cddo/cloudmaturity@main/image.png" alt="CDN Image">
        <img src="https://img.shields.io/badge/test" alt="Badge">
        <img src="/local/image.png" alt="Local">
      `
      const images = extractImageUrls(html)
      const allowedImages = images.filter((img) => isAllowedDomain(img.url, ["img.shields.io", "cdn.jsdelivr.net"]))

      expect(allowedImages).toHaveLength(2)
      expect(allowedImages.map((i) => i.url)).toContain(
        "https://cdn.jsdelivr.net/gh/co-cddo/cloudmaturity@main/image.png",
      )
      expect(allowedImages.map((i) => i.url)).toContain("https://img.shields.io/badge/test")
    })
  })
})
