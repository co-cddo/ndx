import crypto from "crypto"
import fs from "fs/promises"
import path from "path"

/**
 * Eleventy plugin for build-time remote image fetching.
 *
 * Downloads external images at build time and serves them locally,
 * eliminating external dependencies and ensuring CSP compliance.
 *
 * Features:
 * - Fetches images from external URLs during build
 * - Caches images to avoid re-downloading on incremental builds
 * - Generates content-based hash filenames
 * - Supports allowlist of domains to process
 * - Preserves original alt text and attributes
 *
 * @param {object} eleventyConfig - Eleventy configuration object
 * @param {object} [options] - Plugin options
 * @param {string[]} [options.domains] - Domains to fetch images from (default: ['img.shields.io'])
 * @param {string} [options.outputDir='_site/assets/remote-images'] - Output directory for images
 * @param {string} [options.urlPath='/assets/remote-images'] - URL path for images
 * @param {string} [options.cacheDir='.cache/remote-images'] - Cache directory
 * @param {number} [options.timeout=10000] - Fetch timeout in ms
 * @param {boolean} [options.cache=true] - Enable caching
 *
 * @example
 * eleventyConfig.addPlugin(remoteImagesPlugin, {
 *   domains: ['img.shields.io', 'example.com'],
 * });
 */
export default function remoteImagesPlugin(eleventyConfig, options = {}) {
  const config = {
    domains: options.domains || ["img.shields.io"],
    outputDir: options.outputDir || "_site/assets/remote-images",
    urlPath: options.urlPath || "/assets/remote-images",
    cacheDir: options.cacheDir || ".cache/remote-images",
    timeout: options.timeout || 10000,
    cache: options.cache !== false,
  }

  // Stats for logging
  const stats = {
    fetched: 0,
    cached: 0,
    failed: 0,
    pages: 0,
  }

  // In-memory cache of URL -> local path mappings
  const urlCache = new Map()

  // Ensure output directory exists
  eleventyConfig.on("eleventy.before", async () => {
    await fs.mkdir(config.outputDir, { recursive: true })
    if (config.cache) {
      await fs.mkdir(config.cacheDir, { recursive: true })
    }
  })

  // Transform HTML to replace remote image URLs
  eleventyConfig.addTransform("remote-images", async function (content) {
    const outputPath = this.page.outputPath || ""
    if (!outputPath.endsWith(".html")) return content

    // Match img tags with src attribute
    const imgRegex = /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi
    const matches = [...content.matchAll(imgRegex)]

    if (matches.length === 0) return content

    // Filter to only external images from allowed domains
    const externalImages = matches.filter(([, , url]) => {
      try {
        const parsedUrl = new URL(url)
        return config.domains.some(
          (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`),
        )
      } catch {
        return false
      }
    })

    if (externalImages.length === 0) return content

    let processedContent = content
    let pageStats = { fetched: 0, cached: 0, failed: 0 }

    for (const [fullMatch, beforeSrc, url, afterSrc] of externalImages) {
      try {
        const localPath = await fetchAndCacheImage(url, config, urlCache)

        if (localPath) {
          // Replace the URL in the img tag
          const newImgTag = `<img${beforeSrc} src="${localPath}"${afterSrc}>`
          processedContent = processedContent.replace(fullMatch, newImgTag)

          if (urlCache.get(url)?.fromCache) {
            pageStats.cached++
          } else {
            pageStats.fetched++
          }
        }
      } catch (error) {
        console.warn(`[remote-images] Failed to fetch ${url}: ${error.message}`)
        pageStats.failed++
      }
    }

    // Update global stats
    stats.fetched += pageStats.fetched
    stats.cached += pageStats.cached
    stats.failed += pageStats.failed
    stats.pages++

    if (pageStats.fetched > 0 || pageStats.cached > 0) {
      console.log(
        `[remote-images] ${pageStats.fetched + pageStats.cached} image(s) in ${this.page.inputPath}` +
          (pageStats.cached > 0 ? ` (${pageStats.cached} cached)` : ""),
      )
    }

    return processedContent
  })

  // Log summary at end of build
  eleventyConfig.on("eleventy.after", () => {
    if (stats.pages > 0) {
      console.log(
        `[remote-images] Build complete: ${stats.fetched + stats.cached} image(s) processed across ${stats.pages} page(s)`,
      )
      if (stats.cached > 0) {
        console.log(`[remote-images] Cache hits: ${stats.cached}`)
      }
      if (stats.failed > 0) {
        console.warn(`[remote-images] Failed: ${stats.failed}`)
      }
    }
  })
}

/**
 * Fetch an image and cache it locally.
 *
 * @param {string} url - Remote image URL
 * @param {object} config - Plugin configuration
 * @param {Map} cache - In-memory cache
 * @returns {Promise<string>} - Local URL path
 */
async function fetchAndCacheImage(url, config, cache) {
  // Check in-memory cache first
  if (cache.has(url)) {
    const cached = cache.get(url)
    cached.fromCache = true
    return cached.localPath
  }

  // Generate cache key from URL
  const urlHash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16)

  // Determine file extension from URL or content type
  const extension = getExtensionFromUrl(url)
  const filename = `${urlHash}${extension}`

  const outputPath = path.join(config.outputDir, filename)
  const cachePath = path.join(config.cacheDir, filename)
  const localUrlPath = `${config.urlPath}/${filename}`

  // Check file cache
  if (config.cache) {
    try {
      const cachedData = await fs.readFile(cachePath)
      // Copy from cache to output
      await fs.writeFile(outputPath, cachedData)
      cache.set(url, { localPath: localUrlPath, fromCache: true })
      return localUrlPath
    } catch {
      // Cache miss, continue to fetch
    }
  }

  // Fetch the image
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NDX-Build/1.0 (Eleventy static site generator)",
        Accept: "image/*,*/*",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    // Write to output directory
    await fs.writeFile(outputPath, buffer)

    // Write to cache
    if (config.cache) {
      await fs.writeFile(cachePath, buffer)
    }

    cache.set(url, { localPath: localUrlPath, fromCache: false })
    return localUrlPath
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === "AbortError") {
      throw new Error(`Timeout after ${config.timeout}ms`)
    }
    throw error
  }
}

/**
 * Get file extension from URL.
 *
 * @param {string} url - Image URL
 * @returns {string} - File extension with dot (e.g., '.svg', '.png')
 */
function getExtensionFromUrl(url) {
  try {
    const parsedUrl = new URL(url)
    const pathname = parsedUrl.pathname

    // Check for explicit extension in path
    const extMatch = pathname.match(/\.([a-z0-9]+)$/i)
    if (extMatch) {
      return `.${extMatch[1].toLowerCase()}`
    }

    // For shields.io badges, they're SVG by default
    if (parsedUrl.hostname.includes("shields.io")) {
      return ".svg"
    }

    // Default to .png for unknown
    return ".png"
  } catch {
    return ".png"
  }
}
