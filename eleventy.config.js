import { govukEleventyPlugin } from "@x-govuk/govuk-eleventy-plugin"
import { EleventyRenderPlugin } from "@11ty/eleventy"
import fs from "fs"
import util from "util"

import mermaidTransformPlugin from "./lib/eleventy-mermaid-transform.js"
import remoteImagesPlugin from "./lib/eleventy-remote-images.js"

function gitRev() {
  // Handle both regular repos and worktrees
  let gitDir = ".git"
  const stat = fs.statSync(".git")
  if (stat.isFile()) {
    // This is a worktree - .git is a file pointing to the actual git dir
    const gitPath = fs.readFileSync(".git").toString().trim()
    if (gitPath.startsWith("gitdir: ")) {
      gitDir = gitPath.substring(8)
    }
  }

  const headPath = `${gitDir}/HEAD`
  const rev = fs.readFileSync(headPath).toString().trim()
  if (rev.indexOf(":") === -1) return rev
  else {
    // For worktrees, refs might be in the main repo's .git directory
    const refPath = rev.substring(5) // Remove "ref: " prefix
    const worktreeRefPath = `${gitDir}/${refPath}`

    // Try worktree path first, then main repo
    try {
      return fs.readFileSync(worktreeRefPath).toString().trim()
    } catch {
      // Fall back to commondir for shared refs
      const commondirPath = `${gitDir}/commondir`
      if (fs.existsSync(commondirPath)) {
        const commondir = fs.readFileSync(commondirPath).toString().trim()
        const resolvedCommondir = commondir.startsWith("/") ? commondir : `${gitDir}/${commondir}`
        return fs.readFileSync(`${resolvedCommondir}/${refPath}`).toString().trim()
      }
      throw new Error(`Could not resolve git ref: ${refPath}`)
    }
  }
}
function gitSHA() {
  return gitRev().slice(0, 8)
}

function useExternalUrl(item) {
  if (item.data.eleventyNavigation.url) {
    item.url = item.data.eleventyNavigation.url
  }
  return item
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// UUID validation for try_id field (Story 6.1)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUUID(value) {
  return UUID_REGEX.test(value)
}

function validateTryMetadata(data, inputPath) {
  // Only validate catalogue pages that have try metadata
  if (!inputPath.includes("/catalogue/") || !data.try_id) {
    return
  }

  // Validate try_id format if present
  if (data.try_id && !isValidUUID(data.try_id)) {
    console.warn(
      `⚠️ Invalid try_id format in ${inputPath}: Expected UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000)`,
    )
  }

  // Warn if try_id present but try not set to true
  if (data.try_id && data.try !== true) {
    console.warn(`⚠️ ${inputPath} has try_id but try is not set to true`)
  }
}

function extractContent(markdown, start, end) {
  const startPattern = start ? `(${escapeRegExp(start)})` : ""
  const endPattern = end ? `(${escapeRegExp(end)})` : ""

  const regex = new RegExp(`${startPattern}([\\s\\S]*?)${endPattern}`, "m")
  const match = markdown.match(regex)

  if (match) {
    return match.slice(1).join("").trim()
  }
  return ""
}

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin)

  eleventyConfig.addPlugin(govukEleventyPlugin, {
    titleSuffix: "ALPHA",
    header: {
      productName: `National Digital Exchange <strong class="govuk-tag govuk-phase-banner__content__tag">Alpha</strong>`,
      search: {
        indexPath: "/search.json",
        sitemapPath: "/sitemap",
      },
    },
    stylesheets: ["/assets/styles.css"],
    scripts: ["/assets/try.bundle.js"],
    serviceNavigation: {
      home: "/",
      navigation: [
        { text: "Home", href: "/" },
        { text: "About", href: "/About/" },
        { text: "Catalogue", href: "/catalogue" },
        { text: "Challenges", href: "/challenges" },
        {
          text: "Try",
          href: "/try",
        },
        { text: "Access", href: "/access" },
        { text: "Optimise", href: "/optimise/" },
        { text: '<span class="sparkle">Begin with AI</span>', href: "/begin/" },
      ],
      slots: {
        end: '<span id="auth-nav" class="app-auth-nav"></span>',
      },
    },
    footer: {
      meta: {
        text: `Page built from <a href="https://github.com/co-cddo/ndx/commit/${gitRev()}">${gitSHA()}</a> at ${new Date().toISOString()}`,
      },
    },
  })
  eleventyConfig.addPlugin(mermaidTransformPlugin, {
    theme: "default",
  })

  // Fetch remote images at build time to avoid external dependencies
  eleventyConfig.addPlugin(remoteImagesPlugin, {
    domains: ["img.shields.io", "cdn.jsdelivr.net"],
  })

  eleventyConfig.addShortcode("remoteInclude", async function (url, start, end) {
    url = url.replace("https://github.com", "https://cdn.jsdelivr.net/gh").replace("/blob/", "@")
    const baseUrl = url.replace(/\/[^\/]*$/, "/")
    let content = (await (await fetch(url)).text())
      .toString()
      .replace(/!\[([^\]]+)\]\((?!https?:\/\/)([^)]+)\)/g, `![$1](${baseUrl}$2)`)

    const f = extractContent(content, start, end).replace(end, "")

    return f
  })

  eleventyConfig.addFilter(
    "console",
    (value) => `<code style="white-space: pre-wrap;">${decodeURIComponent(util.inspect(value))}</code>;`,
  )

  eleventyConfig.addFilter("date", (dateValue, format) => {
    const date = new Date(dateValue)

    if (format === "d MMMM yyyy") {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    }

    // Default format if no specific format provided
    return date.toLocaleDateString("en-GB")
  })

  eleventyConfig.addCollection("catalogue", (collection) => {
    const items = collection
      .getFilteredByGlob("src/catalogue/**/*.md", "!**/index.md", "!**/tags.md")
      .map(useExternalUrl)
      .sort((a, b) => a.data.title.localeCompare(b.data.title))

    // Validate try metadata for each catalogue item (Story 6.1)
    items.forEach((item) => {
      validateTryMetadata(item.data, item.inputPath)
    })

    return items
  })

  // Tag-filtered catalogue collections
  eleventyConfig.addCollection("catalogueByTag", (collection) => {
    const catalogue = collection
      .getFilteredByGlob("src/catalogue/**/*.md", "!**/index.md", "!**/tags.md")
      .map(useExternalUrl)
      .sort((a, b) => a.data.title.localeCompare(b.data.title))

    const byTag = {}

    catalogue.forEach((item) => {
      if (item.data.tags) {
        item.data.tags.forEach((tag) => {
          if (!byTag[tag]) {
            byTag[tag] = []
          }
          byTag[tag].push(item)
        })
      }
    })

    return byTag
  })

  // Story 6.3: Collection for "Try Before You Buy" filtered products
  eleventyConfig.addCollection("catalogueTryable", (collection) => {
    return collection
      .getFilteredByGlob("src/catalogue/**/*.md", "!**/index.md", "!**/tags.md")
      .map(useExternalUrl)
      .filter((item) => item.data.try === true)
      .sort((a, b) => a.data.title.localeCompare(b.data.title))
  })

  eleventyConfig.addCollection("challenges", (collection) =>
    collection
      .getFilteredByGlob("src/challenges/**/*.md", "!**/index.md", "!**/tags.md")
      .map(useExternalUrl)
      .sort((a, b) => new Date(b.data.date || "2025-01-01") - new Date(a.data.date || "2025-01-01")),
  )

  eleventyConfig.addCollection("reviews", (collection) =>
    collection.getFilteredByGlob("./src/reviews/**/*.md").sort((a, b) => new Date(b.data.date) - new Date(a.data.date)),
  )

  eleventyConfig.addCollection("news", (collection) =>
    collection.getFilteredByGlob("src/discover/news/**/*.md", "!**/index.md").map(useExternalUrl),
  )
  eleventyConfig.addCollection("event", (collection) =>
    collection.getFilteredByGlob("src/discover/events/**/*.md", "!**/index.md").map(useExternalUrl),
  )
  eleventyConfig.addCollection("casestudy", (collection) =>
    collection.getFilteredByGlob("src/discover/case-studies/**/*.md", "!**/index.md").map(useExternalUrl),
  )

  eleventyConfig.addCollection("productAssessments", (collection) =>
    collection
      .getFilteredByGlob("./src/product-assessments/**/*.md")
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date)),
  )

  eleventyConfig.addPassthroughCopy({
    "./node_modules/govuk-frontend/dist/govuk/assets/images": "./assets/images",
    "./node_modules/govuk-frontend/dist/govuk/assets/fonts": "./assets/fonts",
    "./node_modules/govuk-frontend/dist/govuk/assets": "./assets",
  })
  eleventyConfig.addPassthroughCopy("./src/assets")
  eleventyConfig.addPassthroughCopy("./src/robots.txt")

  return {
    pathPrefix: process.env.PATH_PREFIX || "/",
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dir: {
      input: "./src",
      includes: "_includes",
    },
    nunjucksEnvironmentOptions: {
      paths: [
        "src/_includes",
        "node_modules/govuk-frontend/dist",
        "node_modules/govuk-frontend/dist/govuk",
        "node_modules/govuk-frontend/dist/govuk/components",
      ],
    },
  }
}
