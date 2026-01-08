/**
 * Search custom element for site search functionality.
 *
 * This is a TypeScript port of the SearchElement from @x-govuk/govuk-eleventy-plugin.
 * Required because the plugin doesn't export this component, but we need it when
 * using custom scripts instead of the plugin's default application.js.
 */

// @ts-expect-error - accessible-autocomplete doesn't have TypeScript types
import accessibleAutocomplete from "accessible-autocomplete"

interface SearchResult {
  url: string
  title?: string
  description?: string
  tokens?: string
  date?: string
  section?: string
}

export class SearchElement extends HTMLElement {
  private statusMessage: string | null = null
  private searchInputId = "app-search__input"
  private searchIndex: SearchResult[] | null = null
  private searchIndexUrl: string | null
  private searchLabel: string | null
  private searchResults: SearchResult[] = []
  private searchTimeout = 10
  private sitemapLink: Element | null

  constructor() {
    super()
    this.searchIndexUrl = this.getAttribute("index")
    this.searchLabel = this.getAttribute("label")
    this.sitemapLink = this.querySelector(".app-search__link")
  }

  async fetchSearchIndex(indexUrl: string): Promise<void> {
    this.statusMessage = "Loading search index"

    try {
      const response = await fetch(indexUrl, {
        signal: AbortSignal.timeout(this.searchTimeout * 1000),
      })

      if (!response.ok) {
        throw Error("Search index not found")
      }

      const json = await response.json()
      this.statusMessage = "No results found"
      this.searchIndex = json
    } catch (error) {
      this.statusMessage = "Failed to load search index"
      console.error(this.statusMessage, (error as Error).message)
    }
  }

  findResults(searchQuery: string, searchIndex: SearchResult[]): SearchResult[] {
    return searchIndex.filter((item) => {
      const regex = new RegExp(searchQuery, "gi")
      return item?.title?.match(regex) || item?.description?.match(regex) || item?.tokens?.match(regex)
    })
  }

  renderResults(query: string, populateResults: (results: SearchResult[]) => void): void {
    if (!this.searchIndex) {
      return populateResults(this.searchResults)
    }

    this.searchResults = this.findResults(query, this.searchIndex).reverse()
    populateResults(this.searchResults)
  }

  handleOnConfirm(result: SearchResult): void {
    const path = result.url
    if (!path) {
      return
    }
    window.location.href = path
  }

  handleNoResults(): string | null {
    return this.statusMessage
  }

  inputValueTemplate(result: SearchResult | undefined): string | undefined {
    if (result) {
      return result.title
    }
  }

  searchTemplate(): HTMLElement {
    const labelElement = document.createElement("label")
    labelElement.classList.add("govuk-visually-hidden")
    labelElement.htmlFor = this.searchInputId
    labelElement.textContent = this.searchLabel

    const searchElement = document.createElement("search")
    searchElement.append(labelElement)

    return searchElement
  }

  suggestionTemplate(result: SearchResult | undefined): string | undefined {
    if (result) {
      const container = document.createElement("span")

      // Add title of result to container
      const title = document.createElement("span")
      title.className = "app-search__option-title"
      title.textContent = result.title || ""

      container.appendChild(title)

      // Add section and/or date to container
      if (result.date || result.section) {
        const section = document.createElement("span")
        section.className = "app-search__option-metadata"

        section.innerHTML =
          result.date && result.section ? `${result.section}<br>${result.date}` : result.section || result.date || ""

        container.appendChild(section)
      }

      return container.innerHTML
    }
  }

  async connectedCallback(): Promise<void> {
    if (!this.searchIndexUrl) {
      return
    }

    await this.fetchSearchIndex(this.searchIndexUrl)

    // Remove fallback link to sitemap
    if (this.sitemapLink) {
      this.sitemapLink.remove()
    }

    // Add `search` element with `label`
    const search = this.searchTemplate()
    this.append(search)

    return accessibleAutocomplete({
      element: search,
      id: this.searchInputId,
      inputClasses: "govuk-input",
      cssNamespace: "app-search",
      displayMenu: "overlay",
      minLength: 2,
      autoselect: true,
      confirmOnBlur: false,
      placeholder: this.searchLabel,
      source: this.renderResults.bind(this),
      onConfirm: this.handleOnConfirm,
      templates: {
        inputValue: this.inputValueTemplate,
        suggestion: (value: SearchResult) => this.suggestionTemplate(value),
      },
      tNoResults: this.handleNoResults.bind(this),
    })
  }
}
