const govukEleventyPlugin = require("@x-govuk/govuk-eleventy-plugin")
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

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(govukEleventyPlugin, {
    header: {
      productName: `National Digital Exchange <strong class="govuk-tag govuk-phase-banner__content__tag">Alpha</strong>`,
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

  eleventyConfig.addCollection("news", (collection) => collection.getFilteredByGlob("src/news/**/*.md"))
  eleventyConfig.addCollection("event", (collection) => collection.getFilteredByGlob("src/event/**/*.md"))
  eleventyConfig.addCollection("casestudy", (collection) => collection.getFilteredByGlob("src/case-study/**/*.md"))

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
