# Source Tree Analysis - National Digital Exchange

**Generated:** 2025-11-18
**Project Root:** `/Users/cns/httpdocs/cddo/ndx`
**Repository Type:** Monolith
**Architecture:** JAMstack Static Site (Eleventy)

## Annotated Directory Structure

```
ndx/                                    # Project root
├── .bmad/                              # BMad workflow automation (project management)
│   ├── bmm/                            # BMad Method Manager configuration
│   ├── core/                           # Core workflow tasks and protocols
│   └── docs/                           # BMad documentation
│
├── .claude/                            # Claude Code configuration
│   └── commands/                       # Custom slash commands
│
├── .devcontainer/                      # VS Code dev container configuration
│
├── .git/                               # Git repository metadata
│
├── .github/                            # GitHub-specific configuration
│   └── workflows/                      # **CI/CD Pipelines** [CRITICAL]
│       ├── ci.yaml                     # Build, lint, and deploy to GitHub Pages
│       ├── scorecard.yml               # OpenSSF security scorecard
│       └── automerge-dependabot.yaml   # Auto-merge dependency updates
│
├── .husky/                             # Git hooks (pre-commit linting)
│
├── .vscode/                            # VS Code workspace settings
│
├── .yarn/                              # Yarn package manager cache
│
├── node_modules/                       # NPM dependencies (271 packages)
│
├── _site/                              # **Build Output Directory** [GENERATED]
│   └── [Generated static HTML/CSS/JS]  # Compiled website (not in git)
│
├── docs/                               # **Project Documentation** [OUTPUT]
│   ├── bmm-workflow-status.yaml        # Workflow progress tracker
│   ├── project-scan-report.json        # Exhaustive scan state file
│   ├── component-inventory.md          # UI component documentation (this scan)
│   └── sprint-artifacts/               # Sprint planning artifacts
│
├── src/                                # **Source Files** [ENTRY POINT]
│   │
│   ├── _includes/                      # **Nunjucks Templates & Components** [CORE]
│   │   ├── components/                 # Custom components
│   │   │   ├── header/                 # Custom header with prototype banner
│   │   │   │   ├── template.njk        # Header template
│   │   │   │   └── macro.njk           # Header macro
│   │   │   ├── reviews.njk             # User review display component
│   │   │   └── product-assessments.njk # Product assessment component
│   │   ├── govuk/                      # GOV.UK component overrides
│   │   │   └── macros/                 # GOV.UK macro extensions
│   │   ├── macros/                     # Reusable Nunjucks macros
│   │   │   ├── attributes.njk          # HTML attribute helpers
│   │   │   ├── logo.njk                # Logo rendering
│   │   │   └── x-govuk-logo.njk        # Extended GOV.UK logo
│   │   └── catalogue-collection.njk    # Catalogue collection template
│   │
│   ├── About/                          # About section content
│   │   ├── index.md                    # About landing page
│   │   ├── benefits.md                 # NDX benefits
│   │   └── NDX-incubator.md            # Incubator program info
│   │
│   ├── access/                         # Access request functionality
│   │   └── [Service access request pages]
│   │
│   ├── assets/                         # **Static Assets** [MEDIA]
│   │   ├── catalogue/                  # Vendor/product logos and images
│   │   │   ├── anthropic/              # Anthropic logos
│   │   │   ├── aws/                    # AWS logos
│   │   │   ├── cloudflare/             # Cloudflare logos
│   │   │   ├── databricks/             # Databricks logos
│   │   │   ├── figma/                  # Figma logos
│   │   │   ├── gitlab/                 # GitLab logos
│   │   │   ├── google/                 # Google service logos
│   │   │   ├── govtech-solutions/      # GovTech Solutions logos
│   │   │   ├── great-wave-ai/          # Great Wave AI logos
│   │   │   ├── greenbridge/            # Greenbridge logos
│   │   │   ├── immersive-labs/         # Immersive Labs logos
│   │   │   ├── kong/                   # Kong logos
│   │   │   ├── metoffice/              # Met Office logos
│   │   │   ├── microsoft/              # Microsoft logos
│   │   │   ├── mindweave-labs/         # Mindweave Labs logos
│   │   │   ├── okta/                   # Okta logos
│   │   │   ├── salesforce/             # Salesforce logos
│   │   │   ├── servicenow/             # ServiceNow logos
│   │   │   └── snowflake/              # Snowflake logos
│   │   ├── icons/                      # Custom SVG icons (discover, access, learn, try, optimise)
│   │   ├── styles.scss                 # **Main Stylesheet** [STYLES ENTRY]
│   │   └── missionbadge.png            # NDX mission badge
│   │
│   ├── begin/                          # "Begin with AI" section
│   │   └── [AI adoption guidance pages]
│   │
│   ├── catalogue/                      # **Service Catalogue** [CORE CONTENT]
│   │   ├── index.md                    # Catalogue landing page
│   │   ├── tags/                       # Tag-based filtering pages
│   │   ├── anthropic/                  # Anthropic services
│   │   │   └── [Service .md files]
│   │   ├── aws/                        # Amazon Web Services
│   │   │   └── [AWS service .md files]
│   │   ├── cloudflare/                 # Cloudflare services
│   │   ├── databricks/                 # Databricks services
│   │   ├── e-sign/                     # E-signature services
│   │   ├── figma/                      # Figma services
│   │   ├── freshworks/                 # Freshworks services
│   │   ├── gitlab/                     # GitLab services
│   │   │   └── dedicated-for-government.md
│   │   ├── go-vocal/                   # Go Vocal services
│   │   ├── google/                     # Google Cloud services
│   │   │   └── firebase.md             # Example: Firebase service page
│   │   ├── govtech-solutions/          # GovTech Solutions
│   │   │   └── foi-orchestrator.md
│   │   ├── govuk/                      # GOV.UK services
│   │   ├── great-wave-ai/              # Great Wave AI
│   │   │   └── great-wave-ai.md
│   │   ├── greenbridge/                # Greenbridge services
│   │   ├── ibm/                        # IBM services
│   │   ├── idox-geospatial/            # Idox Geospatial
│   │   ├── immersive-labs/             # Immersive Labs
│   │   ├── kong/                       # Kong API Gateway
│   │   ├── languageline/               # LanguageLine
│   │   ├── linkedin/                   # LinkedIn services
│   │   ├── metoffice/                  # Met Office data services
│   │   ├── microsoft/                  # Microsoft services
│   │   │   └── power-bi-government.md
│   │   ├── mindweave-labs/             # Mindweave Labs
│   │   ├── okta/                       # Okta identity services
│   │   ├── oracle/                     # Oracle services
│   │   ├── salesforce/                 # Salesforce services
│   │   ├── servicenow/                 # ServiceNow services
│   │   ├── silktide/                   # Silktide services
│   │   ├── snowflake/                  # Snowflake data services
│   │   ├── uipath/                     # UiPath automation
│   │   └── zevero/                     # Zevero services
│   │
│   ├── challenges/                     # **Government Challenges** [CONTENT]
│   │   ├── index.md                    # Challenges landing page
│   │   ├── defra/                      # DEFRA challenges
│   │   └── mod/                        # Ministry of Defence challenges
│   │
│   ├── discover/                       # **Discover Section** [CONTENT]
│   │   ├── index.md                    # Discover landing page
│   │   ├── case-studies/               # Implementation case studies
│   │   ├── events/                     # Industry events
│   │   └── news/                       # Industry news
│   │
│   ├── learn/                          # Learning & certification section
│   │   └── [Learning content]
│   │
│   ├── optimise/                       # Cloud optimization section
│   │   └── [Optimization guidance]
│   │
│   ├── product-assessments/            # **Product Assessment Reports**
│   │   └── mindweave-labs/             # Vendor assessments
│   │       └── synaplyte/              # Product-specific assessments
│   │
│   ├── reviews/                        # **User Reviews** [CONTENT]
│   │   └── mindweave-labs/             # Vendor reviews
│   │       └── synaplyte/              # Product reviews
│   │
│   ├── sass/                           # **SASS Configuration**
│   │   └── _settings.scss              # SASS settings (font family override)
│   │
│   ├── try/                            # Trial environment section
│   │   └── [Trial signup pages]
│   │
│   ├── index.md                        # **Homepage** [ENTRY POINT]
│   ├── 404.md                          # 404 error page
│   ├── robots.txt                      # SEO robots file
│   ├── search.json.njk                 # Search index generator
│   ├── sitemap.md                      # Sitemap
│   └── todo.md                         # Project TODOs
│
├── eleventy.config.js                  # **Eleventy Configuration** [BUILD CONFIG]
│   └── [Collections, plugins, filters, shortcodes]
│
├── package.json                        # **NPM Package Definition** [MANIFEST]
│   └── [Dependencies, scripts, engines]
│
├── yarn.lock                           # Yarn dependency lock file
│
├── .cursorrules                        # Cursor IDE rules
├── .editorconfig                       # Editor configuration
├── .eleventyignore                     # Eleventy ignore patterns
├── .gitignore                          # Git ignore patterns
├── .lintstagedrc.json                  # Lint-staged configuration
├── .nvmrc                              # Node version (20.17.0)
├── .yarnrc.yml                         # Yarn configuration
│
├── CODE_OF_CONDUCT.md                  # Contributor covenant
├── LICENSE                             # MIT License
└── README.md                           # **Project README** [DOCUMENTATION]
```

## Critical Directories

### Build & Development

- **`src/`** - All source content and templates (ENTRY POINT)
- **`eleventy.config.js`** - Build configuration and collections
- **`.github/workflows/`** - CI/CD automation
- **`_site/`** - Generated output (deployed to GitHub Pages)

### Core Content Areas

- **`src/catalogue/`** - 33+ vendors, multiple products per vendor (~5642 lines of content)
- **`src/_includes/components/`** - Custom Nunjucks components
- **`src/assets/`** - Logos, icons, stylesheets
- **`src/discover/`** - News, events, case studies
- **`src/challenges/`** - Government procurement challenges

### Configuration

- **`package.json`** - Dependencies and build scripts
- **`.nvmrc`** - Node 20.17.0
- **`.github/workflows/ci.yaml`** - Build, lint, deploy pipeline

## Integration Points

### Build Process

1. **Input:** `src/**/*.md`, `src/**/*.njk`
2. **Processing:** Eleventy + Nunjucks + Markdown-it
3. **Styling:** SASS → CSS compilation
4. **Output:** `_site/` static HTML/CSS/JS
5. **Deploy:** GitHub Actions → GitHub Pages

### Data Flow

1. **Content Files** (markdown) → Eleventy Collections
2. **Collections** → Nunjucks Templates
3. **Templates** → Static HTML
4. **Assets** → Passthrough Copy to `_site/`

### External Dependencies

- **GOV.UK Frontend:** Design system components from node_modules
- **Remote Content:** `remoteInclude` shortcode fetches from GitHub
- **Search Index:** `search.json.njk` generates searchable index

## Entry Points

### Application Entry

- **Homepage:** `src/index.md` → `/index.html`
- **Build Entry:** `eleventy.config.js`
- **Styles Entry:** `src/assets/styles.scss`

### Content Entry Points

- **Catalogue:** `src/catalogue/index.md`
- **Discover:** `src/discover/index.md`
- **About:** `src/About/index.md`
- **Challenges:** `src/challenges/index.md`

### Development Entry

- **Dev Server:** `yarn start` → `eleventy --serve`
- **Build:** `yarn build` → `eleventy`
- **Lint:** `yarn lint` → `prettier -c .`

## File Counts

- **Total Directories:** 85+
- **Markdown Content Files:** 165+
- **Nunjucks Templates:** 11
- **SCSS Files:** 2
- **JavaScript Files:** 1 (eleventy.config.js)
- **Vendor Catalogues:** 33
- **NPM Packages:** 271

## Shared Code Patterns

### Template Inheritance

- Base layouts from `@x-govuk/govuk-eleventy-plugin`
- Custom layouts: `collection`, `product`, `homepage`
- Component includes via `{% include %}`

### Reusable Components

- Macros in `src/_includes/macros/`
- GOV.UK components via Nunjucks imports
- Custom components in `src/_includes/components/`

### Content Organization

- Collection-based content aggregation
- Frontmatter-driven metadata
- Tag-based categorization
- Vendor/product hierarchy

## Asset Management

### Static Assets

- **Images:** Vendor logos in `src/assets/catalogue/`
- **Icons:** Custom SVGs in `src/assets/icons/`
- **Fonts:** GOV.UK fonts from node_modules
- **Styles:** SASS in `src/assets/` and `src/sass/`

### Asset Pipeline

- SASS compilation via `@x-govuk/govuk-eleventy-plugin`
- Passthrough copy for images, fonts, other assets
- No bundler (vanilla static assets)

## Critical Files

| File                                           | Purpose                   | Changes Impact                 |
| ---------------------------------------------- | ------------------------- | ------------------------------ |
| `eleventy.config.js`                           | Build config, collections | Site structure, data access    |
| `package.json`                                 | Dependencies, scripts     | Build process, available tools |
| `src/index.md`                                 | Homepage                  | Landing page experience        |
| `src/assets/styles.scss`                       | Main stylesheet           | Site-wide styling              |
| `.github/workflows/ci.yaml`                    | CI/CD                     | Deployment process             |
| `src/_includes/components/header/template.njk` | Site header               | Every page navigation          |
| `src/_includes/catalogue-collection.njk`       | Catalogue layout          | Catalogue presentation         |

## Monorepo vs Monolith

**Classification:** **Monolith**

**Rationale:**

- Single cohesive application
- Unified build process
- Shared configuration
- No workspace management (not using Yarn workspaces, Lerna, Nx, Turbo)
- All code serves single website

**No Separate Parts:**

- All content under `src/` belongs to one website
- No client/server split
- No separate deployable units
- No inter-part communication

---

**Next Steps:**

- See `component-inventory.md` for detailed component documentation
- Review `eleventy.config.js` for collection and plugin configuration
- Check `.github/workflows/ci.yaml` for deployment process
