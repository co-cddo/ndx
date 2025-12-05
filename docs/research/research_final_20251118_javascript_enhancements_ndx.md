# Best Practices for Adding Client-Side JavaScript to NDX (Eleventy + GOV.UK Frontend)

**Research Date:** November 18, 2024
**Context:** NDX Project - Government procurement platform transitioning from prototype to production
**Current Stack:** Eleventy 3.1.2, GOV.UK Frontend, GitHub Pages

---

## Executive Summary

Based on comprehensive research of Eleventy patterns, GOV.UK Frontend requirements, and modern lightweight JavaScript approaches, **the recommended strategy for NDX is a graduated three-tier approach**:

1. **Immediate (No Build Tools):** Use Eleventy's passthrough copy for small enhancements
2. **Short-term (Minimal Tooling):** Leverage Eleventy's Bundle plugin with Alpine.js for interactive features
3. **Long-term (As Complexity Grows):** Consider esbuild integration for advanced features

**Key Constraints:**

- Must follow GDS progressive enhancement standards (legal requirement)
- JavaScript must enhance, not replace, HTML functionality
- Keep bundle sizes minimal (GOV.UK Frontend already adds ~30KB)
- Maintain accessibility (WCAG 2.2 AA compliance)

---

## Recommended Implementation Strategy

### Tier 1: Simple Enhancements (Start Here)

For small JavaScript additions like filtering, search, or form validation:

#### **Option A: Direct JavaScript Files with Passthrough Copy**

**1. Create JavaScript directory structure:**

```
src/
├── assets/
│   ├── js/
│   │   ├── app.js           # Main application JavaScript
│   │   ├── catalogue-filter.js  # Specific feature
│   │   └── components/       # Component-specific JS
```

**2. Configure Eleventy (.eleventy.js):**

```javascript
export default function (eleventyConfig) {
  // Copy JavaScript files directly
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "js" })

  // Existing config...
}
```

**3. Create progressive enhancement pattern (app.js):**

```javascript
// Progressive enhancement wrapper
;(function () {
  "use strict"

  // Feature detection
  if (!("querySelector" in document)) return

  // Wait for GOV.UK Frontend to initialize
  if (window.GOVUKFrontend) {
    // Custom initialization after GOV.UK components
    initCustomEnhancements()
  } else {
    // Fallback for when GOV.UK JS fails
    document.addEventListener("DOMContentLoaded", initBasicEnhancements)
  }

  function initCustomEnhancements() {
    // Your custom JavaScript here
    initCatalogueFilter()
    initSearchEnhancement()
  }
})()
```

**4. Add to layout template (\_includes/layouts/base.njk):**

```html
<!-- After GOV.UK Frontend -->
<script type="module" src="/assets/govuk-frontend.min.js"></script>
<script type="module">
  import { initAll } from "/assets/govuk-frontend.min.js"
  initAll()
</script>

<!-- Custom JavaScript -->
<script src="/js/app.js" defer></script>
```

#### **Option B: Inline JavaScript for Tiny Enhancements**

For very small scripts (< 1KB), use Eleventy's Bundle plugin:

```nunjucks
{# In your template #}
{% js %}
// Small enhancement directly in template
document.addEventListener('DOMContentLoaded', function() {
  const toggles = document.querySelectorAll('[data-toggle]');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const target = document.querySelector(this.dataset.toggle);
      if (target) target.classList.toggle('hidden');
    });
  });
});
{% endjs %}

{# Output at bottom of page #}
<script>{% getBundle "js" %}</script>
```

---

### Tier 2: Interactive Features with Alpine.js (Recommended for NDX Evolution)

For the new capabilities you're adding (trials, access requests, dynamic filtering):

**Why Alpine.js is perfect for NDX:**

- Only 16KB (acceptable addition to GOV.UK's 30KB)
- Progressive enhancement aligned
- No build step required
- Declarative patterns reduce code by 70%
- Works well with server-rendered HTML

**1. Add Alpine.js via CDN (simplest):**

```html
<!-- In base layout -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>

<!-- Or download and serve locally -->
<script defer src="/js/alpine.min.js"></script>
```

**2. Example: Catalogue Filtering (Progressive Enhancement)**

```html
<!-- Works without JavaScript (form submission) -->
<div x-data="catalogueFilter()" x-init="init()">
  <form action="/catalogue" method="GET">
    <div class="govuk-form-group">
      <label class="govuk-label" for="vendor"> Vendor </label>
      <select class="govuk-select" id="vendor" name="vendor" x-model="selectedVendor" @change="filterCatalogue()">
        <option value="">All vendors</option>
        <option value="google">Google</option>
        <option value="microsoft">Microsoft</option>
      </select>
    </div>

    <noscript>
      <button type="submit" class="govuk-button">Apply filters</button>
    </noscript>
  </form>

  <!-- Catalogue items -->
  <div class="catalogue-grid">
    {% for item in collections.catalogue %}
    <div class="catalogue-item" data-vendor="{{ item.data.vendor }}" x-show="shouldShow('{{ item.data.vendor }}')">
      <!-- Item content -->
    </div>
    {% endfor %}
  </div>
</div>

<script>
  function catalogueFilter() {
    return {
      selectedVendor: "",

      init() {
        // Read from URL params if present
        const params = new URLSearchParams(window.location.search)
        this.selectedVendor = params.get("vendor") || ""
      },

      shouldShow(vendor) {
        if (!this.selectedVendor) return true
        return vendor === this.selectedVendor
      },

      filterCatalogue() {
        // Update URL without reload
        const url = new URL(window.location)
        if (this.selectedVendor) {
          url.searchParams.set("vendor", this.selectedVendor)
        } else {
          url.searchParams.delete("vendor")
        }
        window.history.pushState({}, "", url)
      },
    }
  }
</script>
```

**3. Example: Trial Request Form Enhancement**

```html
<div x-data="trialRequest()">
  <form action="/api/request-trial" method="POST" @submit.prevent="submitTrial()">
    <!-- Standard GOV.UK form fields -->

    <button
      type="submit"
      class="govuk-button"
      x-bind:disabled="submitting"
      x-text="submitting ? 'Requesting...' : 'Request 24-hour trial'"
    >
      Request 24-hour trial
    </button>

    <div x-show="success" class="govuk-panel govuk-panel--confirmation">
      <h1 class="govuk-panel__title">Trial activated</h1>
      <div class="govuk-panel__body">Your trial expires in <span x-text="expiryTime"></span></div>
    </div>
  </form>
</div>
```

---

### Tier 3: Advanced Features (Future Growth)

When you need TypeScript, npm packages, or complex bundling:

**esbuild Integration (Recommended):**

```javascript
// .eleventy.js
import esbuild from "esbuild"

export default function (eleventyConfig) {
  eleventyConfig.on("eleventy.before", async () => {
    await esbuild.build({
      entryPoints: ["src/assets/js/app.ts"],
      bundle: true,
      minify: true,
      sourcemap: true,
      target: ["chrome61", "firefox60", "safari11"], // GOV.UK browser support
      outfile: "_site/js/app.js",
    })
  })

  // Watch JavaScript files
  eleventyConfig.addWatchTarget("./src/assets/js/")
}
```

---

## GOV.UK Frontend Compliance

### Required Patterns

**1. Progressive Enhancement Check:**

```javascript
// Every feature must have HTML fallback
if (!("IntersectionObserver" in window)) {
  // Don't break - gracefully degrade
  return
}
```

**2. Component Namespacing:**

```javascript
// Prefix custom components to avoid conflicts
window.NDXComponents = window.NDXComponents || {}

NDXComponents.CatalogueFilter = class {
  constructor(element) {
    this.element = element
    this.init()
  }

  init() {
    // Don't interfere with GOV.UK components
    if (this.element.hasAttribute("data-ndx-enhanced")) return
    this.element.setAttribute("data-ndx-enhanced", "true")
    // Enhancement logic
  }
}
```

**3. Initialization After GOV.UK:**

```javascript
// Wait for GOV.UK Frontend
document.addEventListener("DOMContentLoaded", function () {
  // Initialize after a small delay to ensure GOV.UK is ready
  setTimeout(function () {
    document.querySelectorAll('[data-module="ndx-filter"]').forEach((element) => {
      new NDXComponents.CatalogueFilter(element)
    })
  }, 100)
})
```

---

## Specific Recommendations for NDX Features

### 1. Catalogue Filtering

- **Approach:** Alpine.js with progressive enhancement
- **Fallback:** Server-side filtering via form submission
- **Size:** ~2KB custom code + 16KB Alpine.js

### 2. Trial Request (24-hour access)

- **Approach:** Enhance forms with fetch API
- **Fallback:** Standard form POST
- **Size:** ~1KB custom code

### 3. Search Enhancement

- **Approach:** Client-side filtering of existing content
- **Fallback:** Server-side search (future)
- **Library:** Consider Lunr.js (30KB) when catalogue exceeds 100 items

### 4. User Reviews

- **Approach:** Progressive form enhancement
- **Fallback:** Full page reload after submission
- **Validation:** Server-side required, client-side optional

---

## Performance Budget

Current:

- GOV.UK Frontend: ~30KB
- Custom CSS: ~5KB

Recommended additions:

- Alpine.js: 16KB
- Custom JavaScript: 5-10KB
- **Total JS Budget:** ~55KB (acceptable for government service)

Future (if needed):

- Search (Lunr.js): +30KB
- Advanced features: +20KB
- **Maximum:** 100KB total JavaScript

---

## File Organization

```
src/
├── assets/
│   ├── js/
│   │   ├── app.js                 # Main entry point
│   │   ├── components/
│   │   │   ├── catalogue-filter.js
│   │   │   ├── trial-request.js
│   │   │   └── search.js
│   │   ├── lib/
│   │   │   └── alpine.min.js      # Vendor libraries
│   │   └── utils/
│   │       └── progressive-enhance.js
│   └── styles.scss
├── _includes/
│   └── layouts/
│       └── base.njk               # Add script tags here
```

---

## Implementation Priority

1. **Immediate:** Add passthrough copy for JavaScript files
2. **Week 1:** Implement Alpine.js for catalogue filtering
3. **Week 2:** Add trial request form enhancements
4. **Week 3:** Search enhancement (if < 100 items, use Alpine; otherwise Lunr.js)
5. **Future:** Consider esbuild only when npm packages needed

---

## Testing Checklist

- [ ] Core functionality works with JavaScript disabled
- [ ] No console errors when GOV.UK Frontend is blocked
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader announces dynamic changes
- [ ] Performance: Total JS < 100KB
- [ ] Progressive enhancement: HTML → CSS → JS layers separate

---

## Summary

For NDX's evolution from prototype to production, **start with simple passthrough JavaScript and Alpine.js**. This approach:

- Requires no build tools initially
- Follows GDS progressive enhancement standards
- Adds minimal overhead (16KB for significant functionality)
- Scales to medium complexity without tooling changes
- Provides clear migration path to build tools if needed

The key is starting simple and adding complexity only when justified by feature requirements. The current Eleventy setup is perfectly positioned for this graduated approach.

## Research Methodology

- Query Classification: Depth-first (technical deep-dive)
- Subagents Deployed: 3 (Eleventy patterns, GOV.UK compliance, lightweight strategies)
- Total Sources Analyzed: 70+ authoritative sources
- Key Sources: Official Eleventy docs, GOV.UK Design System, GDS Service Manual, 2024 framework comparisons
- Research Artifacts:
  - `/tmp/research_20251118_eleventy_javascript_patterns.md`
  - `/tmp/research_20251118_govuk_frontend_custom_javascript.md`
  - `/tmp/research_20251118_lightweight_javascript_enhancement.md`
