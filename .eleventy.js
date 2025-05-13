const govukEleventyPlugin = require("@x-govuk/govuk-eleventy-plugin")
const { EleventyRenderPlugin } = require("@11ty/eleventy")
const fs = require("fs")
const util = require("util")

const pluginMermaid = require("@kevingimbel/eleventy-plugin-mermaid")

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

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin)
  eleventyConfig.addPlugin(pluginMermaid)

  eleventyConfig.addPlugin(govukEleventyPlugin, {
    header: {
      productName: `National Digital Exchange <strong class="govuk-tag govuk-phase-banner__content__tag">Alpha</strong>`,
      search: {
        indexPath: "/search.json",
        sitemapPath: "/sitemap",
      },
    },
    stylesheets: ["/assets/styles.css"],
    navigation: {
      home: "/",
      items: [
        { text: "Home", href: "/" },
        { text: "About", href: "/About/Digital-Backbone/" },
        {
          text: "Discover",
          href: "/discover",
        },
        {
          text: "Learn",
          href: "/learn",
        },
        { text: "Catalog", href: "/catalog" },
        {
          text: "Try",
          href: "/try",
        },
        { text: "Access", href: "/access" },
        { text: "Optimise", href: "/optimise/" },
        { text: '<span class="emoji">✨</span><span class="sparkle">Begin with AI </span>', href: "/begin/" },
      ],
    },
    footer: {
      meta: {
        text: `Page built from <a href="https://github.com/co-cddo/ndx/commit/${gitRev()}">${gitSHA()}</a> at ${new Date().toISOString()}`,
      },
    },
  })

  eleventyConfig.addFilter("console", function (value) {
    const str = util.inspect(value)
    return `<code style="white-space: pre-wrap;">${decodeURIComponent(str)}</code>;`
  })

  eleventyConfig.addPassthroughCopy("./src/assets")
  eleventyConfig.addPassthroughCopy("./src/robots.txt")
  eleventyConfig.addPassthroughCopy({
    "./node_modules/govuk-frontend/dist/govuk/assets/images": "./assets/images",
    "./node_modules/govuk-frontend/dist/govuk/assets/fonts": "./assets/fonts",
  })

  eleventyConfig.addCollection("news", (collection) =>
    collection.getFilteredByGlob("src/discover/news/**/*.md", "!**/index.md").map(useExternalUrl),
  )
  eleventyConfig.addCollection("event", (collection) =>
    collection.getFilteredByGlob("src/discover/events/**/*.md", "!**/index.md").map(useExternalUrl),
  )
  eleventyConfig.addCollection("casestudy", (collection) =>
    collection.getFilteredByGlob("src/discover/case-studies/**/*.md", "!**/index.md").map(useExternalUrl),
  )

  eleventyConfig.addCollection("catalog", (collection) =>
    collection
      .getFilteredByGlob("src/catalog/**/*.md", "!**/index.md", "!**/tags.md")
      .map(useExternalUrl)
      .sort((a, b) => {
        // Sort alphabetically by title
        return a.data.title.localeCompare(b.data.title)
      }),
  )

  // Add collection for reviews
  eleventyConfig.addCollection("reviews", (collection) => {
    // Log out what we're finding for debugging
    const reviews = collection.getFilteredByGlob("./src/reviews/**/*.md")
    console.log("Found " + reviews.length + " reviews")

    return reviews.sort((a, b) => {
      // Sort by date, newest first
      return new Date(b.data.date) - new Date(a.data.date)
    })
  })

  // Add collection for product assessments
  eleventyConfig.addCollection("productAssessments", (collection) => {
    return collection.getFilteredByGlob("./src/product-assessments/**/*.md").sort((a, b) => {
      // Sort by date, newest first, then by title
      if (b.data.date !== a.data.date) {
        return new Date(b.data.date) - new Date(a.data.date)
      } else {
        return a.data.title.localeCompare(b.data.title)
      }
    })
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

  return {
    pathPrefix: process.env.PATH_PREFIX || "/",
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dir: {
      input: "./src",
      layouts: "../node_modules/@x-govuk/govuk-eleventy-plugin/layouts",
      includes: "_includes",
    },
  }
}
