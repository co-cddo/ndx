/**
 * Application bundle - GOV.UK Frontend initialization and SearchElement.
 *
 * This replaces the default application.js that govuk-eleventy-plugin generates
 * when the `scripts` config option is not set. Since we use custom scripts,
 * we need to provide this functionality ourselves.
 *
 * This file is bundled by esbuild and output to /assets/application.js
 */

// GOV.UK Frontend initialization
// @ts-expect-error - govuk-frontend doesn't have TypeScript types
import { initAll as GOVUKFrontend } from "govuk-frontend"

// SearchElement for site search (required by govuk-eleventy-plugin)
import { SearchElement } from "../try/ui/search-element"

// Register custom elements used by govuk-eleventy-plugin
customElements.define("app-search", SearchElement)

// Initialize GOV.UK Frontend components on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  GOVUKFrontend()
})
