const govukEleventyPlugin = require("@x-govuk/govuk-eleventy-plugin")
const { EleventyRenderPlugin } = require("@11ty/eleventy")
const fs = require("fs")
const util = require("util")

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
  if (item.data.externalUrl) {
    item.url = item.data.externalUrl
  }
  return item
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyRenderPlugin)

  eleventyConfig.addPlugin(govukEleventyPlugin, {
    header: {
      productName: `National Digital Exchange <strong class="govuk-tag govuk-phase-banner__content__tag">Alpha</strong>`,
      search: {
        indexPath: "/search.json",
        sitemapPath: "/sitemap",
      },
    },
    navigation: {
      home: "/",
      items: [
        { text: "Home", href: "/" },
        {
          text: "Discover",
          href: "/discover",
        },
        {
          text: "Learn",
          href: "/todo",
        },
        { text: "Catalog", href: "/catalog" },
        {
          text: "Try",
          href: "/try",
        },
        { text: "Access", href: "/access" },
        { text: "Optimize", href: "/todo" },
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
    collection.getFilteredByGlob("src/catalog/**/*.md", "!**/index.md", "!**/tags.md").map(useExternalUrl),
  )

  return {
    pathPrefix: process.env.PATH_PREFIX || "/",
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    dir: {
      input: "./src",
      layouts: "../node_modules/@x-govuk/govuk-eleventy-plugin/layouts",
    },
  }
}
