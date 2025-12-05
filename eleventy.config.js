import { govukEleventyPlugin } from "@x-govuk/govuk-eleventy-plugin"
import { EleventyRenderPlugin } from "@11ty/eleventy"
import fs from "fs"
import util from "util"

import pluginMermaid from "@kevingimbel/eleventy-plugin-mermaid"

function gitRev() {
  const rev = fs.readFileSync(".git/HEAD").toString().trim()
  if (rev.indexOf(":") === -1) return rev
  else
    return fs
      .readFileSync(".git/" + rev.substring(5))
      .toString()
      .trim()
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
      logotype: {
        text: " ",
      },
      productName: `National Digital Exchange <strong class="govuk-tag govuk-phase-banner__content__tag">Alpha</strong>`,
      search: {
        indexPath: "/search.json",
        sitemapPath: "/sitemap",
      },
    },
    stylesheets: ["/assets/styles.css"],
    serviceNavigation: {
      home: "/",
      navigation: [
        { text: "Home", href: "/" },
        { text: "About", href: "/About/" },
        {
          text: "Discover",
          href: "/discover",
        },
        {
          text: "Learn",
          href: "/learn",
        },
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
    },
    footer: {
      meta: {
        text: `Page built from <a href="https://github.com/co-cddo/ndx/commit/${gitRev()}">${gitSHA()}</a> at ${new Date().toISOString()}`,
      },
    },
  })
  eleventyConfig.addPlugin(pluginMermaid)

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

  eleventyConfig.addCollection("catalogue", (collection) =>
    collection
      .getFilteredByGlob("src/catalogue/**/*.md", "!**/index.md", "!**/tags.md")
      .map(useExternalUrl)
      .sort((a, b) => a.data.title.localeCompare(b.data.title)),
  )

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
