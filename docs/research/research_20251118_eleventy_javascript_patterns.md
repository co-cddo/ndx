# Eleventy Client-Side JavaScript: Best Practices and Patterns (2024)

## Research Summary

This comprehensive deep dive explores best practices for adding client-side JavaScript to Eleventy static sites, covering asset pipeline options, progressive enhancement patterns, directory organization, and integration with modern build tools. The research synthesizes official Eleventy documentation, community best practices, and real-world examples from 2023-2024.

**Key Insight**: Eleventy's philosophy emphasizes starting simple and adding complexity only when needed. The framework is deliberately unopinionated about JavaScript bundling, offering a spectrum from zero-JavaScript static sites to sophisticated component-driven applications with modern bundlers.

---

## Key Findings

### 1. **Eleventy's Philosophy: Progressive Complexity**

Eleventy's approach to JavaScript is fundamentally different from framework-based SSGs. The platform:

- **Defaults to zero client-side JavaScript** - Perfect for progressive enhancement
- **Provides multiple complexity levels** - Start simple, add sophistication as needed
- **Remains framework-agnostic** - No imposed client-side dependencies
- **Emphasizes performance** - Built-in tools optimize for minimal bundle sizes

As stated in the official documentation: "This is a static site generator. That means no clientside JavaScript by default."

### 2. **Four-Step Approach to Asset Management**

Eleventy's official documentation recommends a graduated approach:

#### **Step 1: Direct File Copy (Simplest - No Bundler)**

The most basic approach uses passthrough copy to move pre-built JavaScript files:

```javascript
// .eleventy.js (ESM)
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("bundle.js")
  eleventyConfig.addPassthroughCopy("bundle.css")
  eleventyConfig.addPassthroughCopy("font.woff2")
}

// .eleventy.js (CommonJS)
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("bundle.js")
}
```

Reference in HTML:

```html
<script src="/bundle.js"></script>
```

**Best for**: Small projects, utility scripts, already-bundled JavaScript

#### **Step 2: Template-Based Concatenation**

Create JavaScript bundles using Eleventy templates:

```nunjucks
---
permalink: bundle.js
---
{% include "header.js" %}
{% include "main.js" %}
{% include "footer.js" %}
```

**Best for**: Simple concatenation without transpilation

#### **Step 3: Custom Template Types**

Register `.js` or `.ts` as template types to enable processing:

```javascript
// Enables Sass, PostCSS, esbuild, TypeScript, etc.
eleventyConfig.addTemplateFormats("js")
eleventyConfig.addExtension("js", {
  // Custom processing logic
})
```

**Best for**: Projects requiring transpilation, minification, or preprocessing

#### **Step 4: Component-Driven Bundles (Bundle Plugin + WebC)**

Use Eleventy's Bundle plugin for content-driven, per-page optimization:

```javascript
export default function (eleventyConfig) {
  eleventyConfig.addBundle("css")
  eleventyConfig.addBundle("js")
}
```

**Best for**: Large projects, component libraries, maximum optimization

### 3. **Asset Pipeline Options**

#### **Option A: No Bundler (Passthrough Copy)**

**Pros**:

- Zero dependencies
- Instant builds
- Simple mental model
- Great for beginners

**Cons**:

- Manual optimization
- No transpilation
- Limited features

**Implementation**:

```javascript
export default function (eleventyConfig) {
  // Copy entire directory
  eleventyConfig.addPassthroughCopy("src/js")

  // Copy with custom output path
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "js" })

  // Copy specific file types (slower - uses glob)
  eleventyConfig.addPassthroughCopy("**/*.js")
}
```

**Performance Note**: Non-glob patterns are significantly faster than globs. The official docs warn: "Using a glob pattern here is slower and copies individual files."

#### **Option B: Built-in Bundle Plugin**

Eleventy's official Bundle plugin (v3.0.0+) provides lightweight bundling without external dependencies.

**Key Features**:

- Plain-text bundling (no transpilation)
- Per-page or app-level bundles
- Asset bucketing
- Configurable transforms
- Automatic deduplication

**Setup**:

```javascript
export default function (eleventyConfig) {
  eleventyConfig.addBundle("js", {
    transforms: [
      async function (content) {
        // Optional: Add minification
        const { minify } = await import("terser")
        const result = await minify(content)
        return result.code
      },
    ],
    toFileDirectory: "bundle",
  })
}
```

**Usage in Templates**:

```nunjucks
{# Add JavaScript to bundle #}
{% js %}
console.log("This will be bundled!");
{% endjs %}

{# Output inline #}
<script>{% getBundle "js" %}</script>

{# Output to file #}
<script src="{% getBundleFileUrl 'js' %}"></script>

{# Asset Bucketing - separate bundles #}
{% js "critical" %}/* Critical path code */{% endjs %}
{% js "defer" %}/* Deferred code */{% endjs %}

<script>{% getBundle "js", "critical" %}</script>
<script defer src="{% getBundleFileUrl 'js', 'defer' %}"></script>
```

**Best for**: Projects wanting simple bundling without external dependencies

#### **Option C: esbuild (Most Popular Community Choice)**

esbuild offers blazing fast bundling with minimal configuration.

**Why esbuild is popular**:

- Extremely fast builds (10-100x faster than alternatives)
- Built-in TypeScript support
- Tree shaking and minification
- ES modules and code splitting
- JSX/TSX transformation

**Installation**:

```bash
npm install --save-dev esbuild
```

**Pattern 1: Using Eleventy Events (Recommended)**

```javascript
// .eleventy.js
import esbuild from "esbuild"

export default function (eleventyConfig) {
  // Build before Eleventy starts
  eleventyConfig.on("eleventy.before", async () => {
    await esbuild.build({
      entryPoints: ["src/js/app.js"],
      bundle: true,
      minify: process.env.NODE_ENV === "production",
      sourcemap: process.env.NODE_ENV !== "production",
      target: ["es2020"],
      outfile: "_site/js/bundle.js",
    })
  })

  // Watch JavaScript files
  eleventyConfig.addWatchTarget("./src/js/")
}
```

**Pattern 2: JavaScript Class Template**

```javascript
// scripts.11ty.js
import esbuild from "esbuild"

const isProduction = process.env.NODE_ENV === "production"

export default class {
  data() {
    return {
      permalink: false,
      eleventyExcludeFromCollections: true,
    }
  }

  async render() {
    await esbuild.build({
      entryPoints: ["src/js/app.js"],
      bundle: true,
      minify: isProduction,
      outdir: "_site/js",
      sourcemap: !isProduction,
      target: isProduction ? "es2020" : "esnext",
      splitting: true,
      format: "esm",
    })
  }
}
```

**Pattern 3: NPM Scripts (Parallel Builds)**

```json
{
  "scripts": {
    "start": "run-p eleventy:dev js:dev",
    "build": "run-s eleventy:build js:build",
    "eleventy:dev": "eleventy --serve",
    "eleventy:build": "eleventy",
    "js:dev": "esbuild src/js/*.js --bundle --outdir=_site/js --watch --sourcemap=inline",
    "js:build": "esbuild src/js/*.js --bundle --outdir=_site/js --minify"
  }
}
```

**TypeScript Support**:

```javascript
await esbuild.build({
  entryPoints: ["src/ts/app.ts"],
  bundle: true,
  outfile: "_site/js/bundle.js",
  target: ["es2020"],
  // esbuild handles TypeScript automatically
})
```

**JSX Support**:

```javascript
await esbuild.build({
  entryPoints: ["src/js/app.jsx"],
  bundle: true,
  outfile: "_site/js/bundle.js",
  jsxFactory: "h",
  jsxFragment: "Fragment",
})
```

**Best for**: Most projects requiring modern JavaScript features, TypeScript, or framework-free components

#### **Option D: Vite**

Vite provides the most modern development experience with HMR.

**Official Plugin**: `@11ty/eleventy-plugin-vite`

**Installation**:

```bash
npm install @11ty/eleventy-plugin-vite
```

**Setup**:

```javascript
// .eleventy.js
import EleventyVitePlugin from "@11ty/eleventy-plugin-vite"

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyVitePlugin, {
    viteOptions: {
      clearScreen: false,
      appType: "mpa", // multi-page application
      server: {
        middlewareMode: true,
      },
      build: {
        mode: "production",
        rollupOptions: {
          // Additional Rollup config
        },
      },
    },
  })
}
```

**Development**: Runs Vite as middleware within Eleventy Dev Server
**Production**: Executes Vite's build process to post-process output

**Advanced Integration**: Consider Slinkity for deeper Vite integration with framework components (React, Vue, Svelte).

**Best for**: Projects wanting hot module replacement, framework component support, or advanced Vite features

#### **Option E: Webpack**

Webpack offers maximum flexibility but adds complexity.

**Pattern: Parallel Development Servers**

```javascript
// .eleventy.js
module.exports = function (eleventyConfig) {
  eleventyConfig.addWatchTarget("./src/js/")

  // Webpack writes to _site, Eleventy watches
  eleventyConfig.setServerOptions({
    watch: ["_site/js/**/*.js"],
  })
}
```

```json
{
  "scripts": {
    "start": "run-p eleventy:dev webpack:dev",
    "build": "run-s webpack:build eleventy:build",
    "eleventy:dev": "eleventy --serve",
    "webpack:dev": "webpack --mode development --watch"
  }
}
```

**Best for**: Projects with complex build requirements or existing Webpack configurations

#### **Option F: Rollup**

Rollup excels at library bundling and tree shaking.

**Common Use Cases**:

- Critical CSS generation with `rollup-plugin-critical`
- ES module bundles
- Library builds

**Best for**: Projects prioritizing small bundle sizes or publishing JavaScript libraries

---

## Code Examples & Patterns

### Inlining Critical JavaScript

For small utility scripts (e.g., theme switchers, critical polyfills):

**Installation**:

```bash
npm install terser
```

**Setup**:

```javascript
// .eleventy.js
import { minify } from "terser"

export default function (eleventyConfig) {
  eleventyConfig.addFilter("jsmin", async function (code) {
    try {
      const minified = await minify(code)
      return minified.code
    } catch (err) {
      console.error("Terser error:", err)
      return code
    }
  })
}
```

**Usage**:

```nunjucks
{% set js %}
{% include "src/_includes/critical.js" %}
{% endset %}
<script>
{{ js | jsmin | safe }}
</script>
```

**Security Note**: If using Content Security Policy, ensure `script-src` includes `'unsafe-inline'` for inline scripts.

### Progressive Enhancement with WebC

WebC enables component-driven development with automatic JavaScript bundling:

**Component with JavaScript**:

```html
<!-- components/tabs.webc -->
<div class="tabs">
  <slot></slot>
</div>

<script>
  class Tabs extends HTMLElement {
    connectedCallback() {
      // Component logic
    }
  }
  customElements.define("my-tabs", Tabs)
</script>

<style>
  .tabs {
    /* Component styles */
  }
</style>
```

WebC automatically:

- Extracts `<script>` and `<style>` tags
- Bundles per-page (only used components)
- Deduplicates repeated components
- Orders dependencies correctly

**Hydration with is-land**:

```html
<is-land on:visible>
  <template data-island>
    <style webc:keep>
      /* Loaded only when visible */
    </style>

    <script type="module" webc:keep>
      console.log("Component hydrated on scroll!")
    </script>

    <my-component></my-component>
  </template>
</is-land>
```

**Loading Conditions**:

- `on:visible` - Intersection Observer
- `on:idle` - requestIdleCallback
- `on:interaction` - User interaction
- `on:media` - Media query match
- `on:save-data` - Save-Data header

### Watch and Reload Configuration

**Basic Watch Target**:

```javascript
export default function (eleventyConfig) {
  // Watch JavaScript directory
  eleventyConfig.addWatchTarget("./src/js/")

  // Watch with config reset
  eleventyConfig.addWatchTarget("./_config/**", {
    resetConfig: true,
  })
}
```

**Ignore Patterns**:

```javascript
export default function (eleventyConfig) {
  // Ignore specific files
  eleventyConfig.watchIgnores.add("README.md")
  eleventyConfig.watchIgnores.add("**/.git/**")

  // Remove ignore
  eleventyConfig.watchIgnores.delete("README.md")
}
```

**JavaScript Dependency Spider**:

```javascript
export default function (eleventyConfig) {
  // Automatically watches imported files in .11ty.js templates
  // Disable if causing issues:
  eleventyConfig.setWatchJavaScriptDependencies(false)
}
```

**Throttle Watch Rebuilds**:

```javascript
export default function (eleventyConfig) {
  // Wait 100ms before rebuilding
  eleventyConfig.setWatchThrottleWaitTime(100)
}
```

**Chokidar Configuration**:

```javascript
export default function (eleventyConfig) {
  // Necessary for WSL outside home directory
  eleventyConfig.setChokidarConfig({
    usePolling: true,
    interval: 500,
  })
}
```

### Passthrough Copy Advanced Patterns

**Copy Directory with Path Remapping**:

```javascript
export default function (eleventyConfig) {
  // Copy src/assets/js to _site/js
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "js" })

  // Multiple remappings
  eleventyConfig.addPassthroughCopy({
    "src/assets/images": "images",
    "src/assets/fonts": "fonts",
  })
}
```

**Array-Based Organization**:

```javascript
export default function (eleventyConfig) {
  const assets = ["src/assets/images/", "src/assets/fonts/", "src/assets/js/"]

  assets.forEach((path) => {
    eleventyConfig.addPassthroughCopy(path)
  })
}
```

**HTML-Relative Mode (Eleventy 3.1.0+)**:

```javascript
export default function (eleventyConfig) {
  // Copy files referenced in HTML to locations relative to the output HTML
  eleventyConfig.addPassthroughCopy("content/**/*.mp4", {
    mode: "html-relative",
  })
}
```

**Full Options**:

```javascript
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("**/*.png", {
    mode: "html-relative",
    paths: [], // fallback directories
    failOnError: true, // throw error if file not found
    copyOptions: { dot: false }, // recursive-copy options
  })
}
```

**Server Passthrough Behavior**:

```javascript
export default function (eleventyConfig) {
  // "passthrough" = emulate copy (faster, default in v2+)
  // "copy" = actually copy files
  eleventyConfig.setServerPassthroughCopyBehavior("passthrough")
}
```

**Important**: In dev mode (`--serve`), Eleventy emulates copying by default (creates references, not copies). This significantly improves performance. Set to `"copy"` if you need actual files during development.

---

## Detailed Analysis

### Directory Structure Patterns

Based on community best practices and real-world projects:

#### **Pattern 1: Source-Based Structure (Recommended)**

```
project-root/
├── .eleventy.js
├── package.json
├── src/
│   ├── _11ty/               # Eleventy config components
│   │   ├── collections/
│   │   ├── filters/
│   │   ├── shortcodes/
│   │   └── utils/
│   ├── _data/               # Global data files
│   ├── _includes/           # Templates, layouts, partials
│   │   ├── layouts/
│   │   ├── components/
│   │   └── macros/
│   ├── assets/              # Source assets
│   │   ├── js/              # JavaScript source
│   │   │   ├── app.js       # Entry point
│   │   │   ├── modules/     # ES modules
│   │   │   └── vendor/      # Third-party code
│   │   ├── css/
│   │   └── images/
│   └── content/             # Site content (markdown, etc.)
└── _site/                   # Output (git-ignored)
    ├── js/                  # Bundled JavaScript
    ├── css/
    └── ...
```

**Configuration**:

```javascript
export default function (eleventyConfig) {
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  }
}
```

#### **Pattern 2: Assets-First Structure**

```
project-root/
├── .eleventy.js
├── assets/
│   ├── js/
│   │   ├── src/             # Source JavaScript
│   │   │   ├── main.js
│   │   │   └── components/
│   │   └── dist/            # Built JavaScript (copied to _site)
│   ├── styles/
│   └── images/
├── content/
├── _includes/
└── _site/
```

#### **Pattern 3: Minimal Structure**

```
project-root/
├── .eleventy.js
├── js/                      # JavaScript source
├── css/
├── pages/
├── _includes/
└── _site/
```

**Key Principles**:

1. **Separation of Concerns** - Keep source and output separate
2. **Clear Entry Points** - Top-level JS files are entry points, subdirectories are modules
3. **Avoid Processing Conflicts** - Keep passthrough assets outside template directories
4. **Modularize Config** - Split `.eleventy.js` into logical components

### Progressive Enhancement Patterns

#### **Pattern 1: Zero JavaScript Baseline**

Build sites that work completely without JavaScript:

```html
<!-- Navigation works without JS -->
<nav>
  <ul>
    <li><a href="/about/">About</a></li>
    <li><a href="/blog/">Blog</a></li>
  </ul>
</nav>

<!-- Enhance with JS -->
<script type="module">
  const nav = document.querySelector("nav")
  // Add mobile menu toggle, keyboard navigation, etc.
</script>
```

#### **Pattern 2: Web Components as Enhancement**

```html
<!-- Works without JS: shows all content -->
<details>
  <summary>Show more</summary>
  <div>Hidden content</div>
</details>

<!-- Enhanced with custom element -->
<script type="module">
  class ExpandableSection extends HTMLElement {
    connectedCallback() {
      // Add animations, analytics, etc.
    }
  }
  customElements.define("expandable-section", ExpandableSection)
</script>
```

#### **Pattern 3: is-land Partial Hydration**

```html
<!-- Server-rendered, hydrates on interaction -->
<is-land on:interaction>
  <template data-island>
    <script type="module" webc:keep>
      import { SearchWidget } from "./search.js"
      // Only loads when user interacts
    </script>
  </template>

  <search-widget></search-widget>
</is-land>
```

### Build Performance Optimization

#### **Caching Asset Bundles**

From Chris Burnell's optimization article (2024):

```javascript
// Memoize renderFile calls for huge performance gains
const memoize = (fn) => {
  const cache = new Map()
  return (...args) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

export default function (eleventyConfig) {
  // Cache CSS/JS renders
  const renderFile = memoize(eleventyConfig.renderFile.bind(eleventyConfig))

  eleventyConfig.addShortcode("inlineCss", async (file) => {
    return await renderFile(`./src/assets/css/${file}`)
  })
}
```

**Result**: Build times reduced from 2 minutes to 30 seconds.

#### **Glob Pattern Avoidance**

```javascript
// SLOW - searches entire directory tree
eleventyConfig.addPassthroughCopy("**/*.js")

// FAST - direct directory copy
eleventyConfig.addPassthroughCopy("src/js")
```

#### **Smart Watch Targets**

```javascript
export default function (eleventyConfig) {
  // Only watch what's necessary
  eleventyConfig.addWatchTarget("./src/js/")

  // Don't watch node_modules (default, but be explicit)
  eleventyConfig.watchIgnores.add("**/node_modules/**")

  // Disable JS dependency spider if slow
  eleventyConfig.setWatchJavaScriptDependencies(false)
}
```

### Integration with Existing Build Processes

#### **Pattern 1: NPM Scripts Orchestration**

```json
{
  "scripts": {
    "clean": "rm -rf _site",
    "eleventy:dev": "eleventy --serve",
    "eleventy:build": "eleventy",
    "js:dev": "esbuild src/js/*.js --bundle --outdir=_site/js --watch",
    "js:build": "esbuild src/js/*.js --bundle --outdir=_site/js --minify",
    "css:dev": "sass src/scss:_site/css --watch",
    "css:build": "sass src/scss:_site/css --style=compressed",
    "start": "run-p eleventy:dev js:dev css:dev",
    "build": "run-s clean js:build css:build eleventy:build"
  }
}
```

**Key Tools**:

- `npm-run-all` - Run scripts in parallel (`run-p`) or series (`run-s`)
- `concurrently` - Alternative to npm-run-all

#### **Pattern 2: Eleventy Events Integration**

```javascript
// .eleventy.js
import esbuild from "esbuild"
import * as sass from "sass"
import fs from "fs/promises"

export default function (eleventyConfig) {
  // Before build starts
  eleventyConfig.on("eleventy.before", async () => {
    // Build JavaScript
    await esbuild.build({
      entryPoints: ["src/js/app.js"],
      bundle: true,
      outfile: "_site/js/bundle.js",
    })

    // Compile Sass
    const result = sass.compile("src/scss/main.scss")
    await fs.writeFile("_site/css/main.css", result.css)
  })

  // After build completes
  eleventyConfig.on("eleventy.after", async () => {
    // Post-processing, analytics, etc.
  })
}
```

#### **Pattern 3: External Build Tool + Watch**

```javascript
// .eleventy.js - Configure Eleventy to watch external build output
export default function (eleventyConfig) {
  // Watch bundler output
  eleventyConfig.addWatchTarget("_site/js/**/*.js")
  eleventyConfig.addWatchTarget("_site/css/**/*.css")

  // Don't process as templates
  eleventyConfig.addPassthroughCopy("_site/js")
  eleventyConfig.addPassthroughCopy("_site/css")
}
```

### TypeScript Integration

#### **Client-Side TypeScript**

**Using esbuild**:

```javascript
// .eleventy.js
export default function (eleventyConfig) {
  eleventyConfig.on("eleventy.before", async () => {
    await esbuild.build({
      entryPoints: ["src/ts/app.ts"],
      bundle: true,
      outfile: "_site/js/app.js",
      target: ["es2020"],
      // esbuild handles TypeScript natively
    })
  })

  eleventyConfig.addWatchTarget("./src/ts/")
}
```

**TypeScript Config** (tsconfig.json):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/ts/**/*"]
}
```

#### **Eleventy Config in TypeScript**

Eleventy v3 supports TypeScript config files:

```typescript
// eleventy.config.ts
import type { UserConfig } from "@11ty/eleventy"

export default function (eleventyConfig: UserConfig) {
  eleventyConfig.addPassthroughCopy("src/js")

  return {
    dir: {
      input: "src",
      output: "_site",
    },
  }
}
```

**Note**: This is for the Eleventy _config_ file. For client-side TypeScript, use a bundler.

---

## Sources & Evidence

### Official Eleventy Documentation

- **Add CSS, JS, Fonts** - https://www.11ty.dev/docs/assets/ (2024)
  - "This is a static site generator. That means no clientside JavaScript by default."
  - Four-step progressive approach: passthrough → templates → custom types → Bundle plugin

- **Bundle Plugin** - https://www.11ty.dev/docs/plugins/bundle/ (v3.0.0+)
  - "unlocks minimal per-page or app-level bundles of CSS, JavaScript, or HTML"
  - "This is a minimum-viable bundler and asset pipeline in Eleventy"

- **Passthrough File Copy** - https://www.11ty.dev/docs/copy/ (2024)
  - Server passthrough behavior: emulation vs. actual copying
  - Performance note: "Using a glob pattern here is slower"

- **WebC** - https://www.11ty.dev/docs/languages/webc/ (2024)
  - "component-driven, cache-friendly page-specific JavaScript...bundles"
  - "Users will only load the code they need to render that page"

- **is-land Plugin** - https://www.11ty.dev/docs/plugins/is-land/ (2024)
  - Partial hydration with loading conditions
  - "Progressive Enhancement friendly"

- **Vite Plugin** - https://www.11ty.dev/docs/server-vite/ (2024)
  - Official Vite integration: development middleware + production builds

- **Watch and Serve** - https://www.11ty.dev/docs/watch-serve/ (2024)
  - `addWatchTarget()` API
  - JavaScript dependency spider
  - Chokidar configuration

- **Quick Tip: Inline Minified JavaScript** - https://www.11ty.dev/docs/quicktips/inline-js/
  - Using Terser for inline script minification

### Community Best Practices

- **Max Böck: Asset Pipelines in Eleventy** - https://mxb.dev/blog/eleventy-asset-pipeline/
  - Three strategies: NPM scripts, Gulp, integrated build
  - JavaScript class template pattern

- **Brett DeWoody: Bundling JS in Eleventy with ESBuild** - https://medium.com/@brettdewoody/bundling-js-in-eleventy-with-esbuild-76f7059c2f3e
  - Event-based esbuild integration
  - Multiple entry points example

- **r0b blog: Bundle JavaScript with Eleventy and esbuild** - https://blog.r0b.io/post/bundle-javascript-with-eleventy-and-esbuild/
  - JavaScript class template approach
  - JSX configuration

- **Webstoemp: Structuring Eleventy projects** - https://www.webstoemp.com/blog/eleventy-projects-structure/
  - Recommended directory structure
  - `src/_11ty/` organization pattern

- **Chris Burnell: Memoizing Asset Bundles** - https://chrisburnell.com/article/memoizing-asset-bundles/ (March 2024)
  - Performance optimization: 2 minutes → 30 seconds
  - Caching renderFile shortcodes

- **Sparkbox: Building an Eleventy Starter Template: JavaScript** - https://sparkbox.com/foundry/building_javascript_into_my_github_starter_template_project
  - npm-run-all workflow
  - Development vs. production scripts

- **Sean C Davis: JavaScript for 11ty with esbuild** - https://www.seancdavis.com/posts/javascript-for-11ty-with-esbuild/
  - esbuild integration patterns

- **Rares Portan: Let's Learn Eleventy - How to make a JavaScript bundle** - https://www.raresportan.com/eleventy-part-five/
  - Bundle plugin examples

- **Lene Saile: Organizing the Eleventy config file** - https://www.lenesaile.com/en/blog/organizing-the-eleventy-config-file/
  - Modularizing configuration

### Context7 Documentation

- **Eleventy Official Docs** (/websites/11ty_dev)
  - 803 code snippets, benchmark score 89.2
  - Comprehensive passthrough copy examples
  - Bundle plugin configuration patterns

### GitHub Examples

- **11ty/eleventy-base-blog** - Official starter with zero JavaScript
- **ixartz/Eleventy-Starter-Boilerplate** - Webpack 5 integration
- **ManiRaja-DEV/eleventy-starter-template** - TypeScript support
- **x-govuk/govuk-eleventy-plugin** - GOV.UK pattern library

---

## Research Gaps & Limitations

### Information Not Found

1. **Comparative benchmarks** - No comprehensive performance comparison of bundlers (esbuild vs. Webpack vs. Vite) specifically for Eleventy
2. **Large-scale case studies** - Limited examples of very large Eleventy sites (10,000+ pages) with complex JavaScript needs
3. **Framework integration depth** - Limited documentation on React/Vue/Svelte component integration patterns beyond Slinkity
4. **Service Worker patterns** - Minimal coverage of offline-first patterns with Eleventy

### Areas Requiring Further Investigation

1. **Bundle splitting strategies** - More examples of code-splitting for large applications
2. **Tree shaking effectiveness** - Real-world data on bundle size reduction
3. **Source map debugging** - Best practices for debugging bundled code
4. **Error handling** - Comprehensive error handling patterns for build failures

---

## Contradictions & Disputes

### Bundler Preferences

**esbuild advocates** emphasize:

- Speed: "10-100x faster than alternatives"
- Simplicity: "Works out of the box with TypeScript"
- No configuration overhead

**Webpack advocates** counter:

- Ecosystem maturity
- Plugin ecosystem
- Fine-grained control

**Vite advocates** highlight:

- Best development experience
- Hot Module Replacement
- Framework support

**Consensus**: Use esbuild for most projects, Vite for framework components, Webpack only if required by existing infrastructure.

### Passthrough vs. Processing

**Passthrough camp**: "Keep it simple, copy pre-built files"

- Zero dependencies
- Predictable behavior
- Fast builds

**Processing camp**: "Process everything through Eleventy"

- Unified build system
- No race conditions
- Single source of truth

**Consensus**: Start with passthrough, add processing when transpilation/bundling needed.

### Dev Server Behavior

**Controversy**: Eleventy v2.0 changed default behavior to emulate (not copy) files during `--serve`.

**Community feedback**: Some developers expected actual file copies, leading to confusion.

**Resolution**: Official docs now clearly explain emulation vs. copying, with `setServerPassthroughCopyBehavior("copy")` option.

---

## Research Methodology & Tool Usage

### Tools Used

- **Context7**: 2 library documentation lookups
  - `/websites/11ty_dev` (Eleventy official docs)
  - `/11ty/11ty-website` (alternative)
- **WebSearch**: 16 web searches performed
- **WebFetch**: 8 specific pages fetched
- **Total tool calls**: 26

### Search Strategy

**Phase 1: Official Documentation** (Context7 + targeted WebFetch)

- Eleventy official documentation for authoritative patterns
- Bundle plugin, passthrough copy, asset handling

**Phase 2: Community Patterns** (WebSearch)

- "Eleventy JavaScript bundling 2024"
- "esbuild Eleventy integration"
- "WebC JavaScript hydration"

**Phase 3: Real-World Examples** (WebSearch + WebFetch)

- Starter templates on GitHub
- Production site implementations
- Performance optimization articles

**Phase 4: Specific Tools** (targeted searches)

- Vite, Webpack, Rollup integration
- TypeScript patterns
- Progressive enhancement examples

### Most Productive Search Terms

- "Eleventy JavaScript bundling asset pipeline 2024"
- "Eleventy esbuild bundling example"
- "Eleventy addPassthroughCopy best practices"
- "Eleventy WebC JavaScript component hydration"

### Primary Information Sources

1. **11ty.dev** - Official documentation (highest authority)
2. **Max Böck (mxb.dev)** - Eleventy core contributor
3. **Medium articles** - Brett DeWoody's esbuild guides
4. **Community blogs** - r0b.io, Webstoemp, Chris Burnell
5. **GitHub** - Starter templates and real implementations

### Parallel Execution

Executed multiple searches in parallel:

- Context7 resolve + WebSearch queries simultaneously
- Multiple WebFetch operations for different URLs
- Balanced breadth (WebSearch) with depth (WebFetch)

**Research Depth**: Deep Research Mode (26 tool calls, comprehensive coverage)

---

## Recommendations

### For New Projects

1. **Start with passthrough copy** if:
   - Small site (<100 pages)
   - Simple vanilla JavaScript
   - No transpilation needed

2. **Use Bundle plugin** if:
   - Want built-in solution
   - Need per-page bundles
   - Avoiding external dependencies

3. **Choose esbuild** if:
   - Using TypeScript or JSX
   - Need fast builds
   - Want modern ES modules

4. **Select Vite** if:
   - Using framework components
   - Want HMR during development
   - Building a web application

### For Existing Projects

1. **Audit current setup**:
   - Identify pain points (slow builds, complex config)
   - Measure bundle sizes
   - Check for unused features

2. **Migrate incrementally**:
   - Don't rebuild everything at once
   - Test performance improvements
   - Keep fallbacks during transition

3. **Optimize watch targets**:
   - Remove unnecessary watches
   - Use direct paths, not globs
   - Consider disabling JS dependency spider

### Directory Organization

**Recommended structure**:

```
src/
  _11ty/          # Eleventy utilities
  _data/          # Data files
  _includes/      # Templates
  assets/
    js/
      app.js      # Entry point
      modules/    # ES modules
    css/
    images/
  content/        # Site content
```

### Progressive Enhancement Checklist

- [ ] Site works without JavaScript
- [ ] JavaScript enhances, doesn't replace
- [ ] Use `<noscript>` for critical features
- [ ] Implement proper loading states
- [ ] Test with JavaScript disabled
- [ ] Use Web Components for encapsulation
- [ ] Consider is-land for partial hydration

### Performance Optimization

1. **Minimize bundle size**:
   - Tree shake unused code
   - Code split by route/feature
   - Defer non-critical JavaScript

2. **Optimize loading**:
   - Inline critical scripts
   - Use `async`/`defer` appropriately
   - Leverage HTTP/2 multiplexing

3. **Cache effectively**:
   - Fingerprint bundles
   - Use long-term caching
   - Implement service workers

4. **Monitor metrics**:
   - Track bundle sizes
   - Measure build times
   - Profile runtime performance

---

## Conclusion

Eleventy's JavaScript handling philosophy prioritizes **progressive complexity**: start simple, add sophistication only when needed. The framework's flexibility accommodates everything from zero-JavaScript static sites to complex component-driven applications.

**Key Takeaways**:

1. **No bundler required** - Passthrough copy works for many use cases
2. **esbuild is the community favorite** - Fast, simple, TypeScript-ready
3. **Bundle plugin for built-in solution** - Zero external dependencies
4. **WebC for component-driven sites** - Automatic per-page optimization
5. **Progressive enhancement first** - Site should work without JavaScript

The research reveals a healthy ecosystem with multiple valid approaches, comprehensive documentation, and active community innovation. Choose tools based on project needs, not trends, and always start with the simplest solution that works.
