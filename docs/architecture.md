# Architecture Documentation - National Digital Exchange

**Generated:** 2025-11-18
**Project:** NDX (National Digital Exchange)
**Version:** 1.0.0 (Alpha)
**Architecture Type:** JAMstack Static Site

---

## Executive Summary

The National Digital Exchange (NDX) is a UK government initiative designed to transform public sector cloud adoption and digital procurement. The website serves as an information platform, service catalogue, and access portal for government departments to discover, learn about, try, and access cloud services from pre-approved vendors.

**Key Characteristics:**
- **Purpose:** Government cloud service catalogue and procurement platform
- **Impact:** Projected £2B taxpayer savings
- **Architecture:** JAMstack (JavaScript, APIs, Markup)
- **Tech Stack:** Eleventy static site generator + GOV.UK Frontend design system
- **Deployment:** GitHub Pages (co-cddo.github.io/ndx)
- **Content:** 165+ markdown files, 33+ cloud service vendors
- **Phase:** Alpha (prototype, not production service)

**Strategic Context:**
- One-stop shop for UK government tech procurement
- Underpins data and capability sharing between departments
- Turn-key access to commercial cloud providers
- Levels playing field for all public sector organizations

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Architecture Pattern](#architecture-pattern)
3. [System Architecture](#system-architecture)
4. [Data Architecture](#data-architecture)
5. [Component Architecture](#component-architecture)
6. [Content Model](#content-model)
7. [Build Pipeline](#build-pipeline)
8. [Deployment Architecture](#deployment-architecture)
9. [Security Architecture](#security-architecture)
10. [Performance Characteristics](#performance-characteristics)
11. [Development Workflow](#development-workflow)
12. [Testing Strategy](#testing-strategy)
13. [Scalability & Growth](#scalability--growth)
14. [Technical Decisions & Rationale](#technical-decisions--rationale)
15. [Future Considerations](#future-considerations)

---

## Technology Stack

### Core Platform

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Static Site Generator** | Eleventy | 3.1.2 | Transforms markdown/templates to static HTML |
| **Runtime** | Node.js | 20.17.0 | Build-time JavaScript execution |
| **Package Manager** | Yarn | 4.5.0 | Dependency management (npm blocked) |
| **Template Engine** | Nunjucks | - | Server-side templating |
| **Markdown Processor** | markdown-it | - | Content processing with plugins |

### Frontend & Design

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Design System** | GOV.UK Frontend | Latest | Government design standards compliance |
| **Eleventy Plugin** | @x-govuk/govuk-eleventy-plugin | 7.2.1 | GOV.UK integration for Eleventy |
| **CSS Preprocessor** | SASS/SCSS | - | Styling with GOV.UK overrides |
| **Diagram Support** | Mermaid | 3.0.0 | Embedded flowcharts and diagrams |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Code Formatter** | Prettier | 3.6.2 | Consistent code style |
| **Git Hooks** | Husky | 9.1.7 | Pre-commit automation |
| **Staged Linting** | lint-staged | 16.1.5 | Format checking on commit |

### CI/CD & Deployment

| Component | Technology | Purpose |
|-----------|------------|---------|
| **CI Platform** | GitHub Actions | Build, test, deploy automation |
| **Hosting** | GitHub Pages | Static file hosting |
| **Security Scanning** | CodeQL | Automated vulnerability detection |
| **Security Hardening** | Harden Runner | CI/CD security lockdown |
| **Scorecard** | OpenSSF Scorecard | Security posture measurement |

---

## Architecture Pattern

### JAMstack Architecture

**Definition:** JavaScript, APIs, and Markup

```
┌─────────────────────────────────────────────────────────┐
│                    JAMstack Pattern                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐     │
│  │ Markdown │──▶   │ Eleventy │──▶   │  Static  │     │
│  │ Content  │      │  Build   │      │   HTML   │     │
│  └──────────┘      └──────────┘      └──────────┘     │
│       ▲                  │                  │          │
│       │                  │                  ▼          │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐     │
│  │ Nunjucks │──▶   │   SASS   │──▶   │   CDN    │     │
│  │Templates │      │  Compile │      │(GH Pages)│     │
│  └──────────┘      └──────────┘      └──────────┘     │
│                                             │          │
│                                             ▼          │
│                                       ┌──────────┐     │
│                                       │  Browser │     │
│                                       │ (Client) │     │
│                                       └──────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Characteristics:**
- **Pre-rendered:** All pages generated at build time
- **No Server:** Static files served directly from CDN
- **No Database:** Content lives in markdown files
- **No Runtime:** No server-side code execution after build
- **Fast:** Instant page loads (static HTML)
- **Secure:** Minimal attack surface (no dynamic backend)

---

## System Architecture

### High-Level System Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      Developer Workflow                         │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Git Push to   │
                    │   main branch   │
                    └─────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                     GitHub Actions CI/CD                        │
├────────────────────────────────────────────────────────────────┤
│  1. Checkout code                                              │
│  2. Setup Node.js 20.17.0                                      │
│  3. Install dependencies (yarn)                                │
│  4. Run linter (prettier)                                      │
│  5. Build site (eleventy)                                      │
│  6. Upload artifact (_site/)                                   │
│  7. Deploy to GitHub Pages                                     │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  GitHub Pages   │
                    │  Static Hosting │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   End Users     │
                    │  (Government    │
                    │   Employees)    │
                    └─────────────────┘
```

### Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    Build-Time Components                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │   Content    │                                           │
│  │  (Markdown)  │──┐                                        │
│  └──────────────┘  │                                        │
│                     │    ┌──────────────────┐               │
│  ┌──────────────┐  ├───▶│    Eleventy      │               │
│  │  Templates   │  │    │   Collections    │               │
│  │ (Nunjucks)   │──┤    │   Transforms     │──┐            │
│  └──────────────┘  │    │   Filters        │  │            │
│                     │    └──────────────────┘  │            │
│  ┌──────────────┐  │                           │            │
│  │Configuration │──┘                           │            │
│  │(.config.js)  │                              ▼            │
│  └──────────────┘                    ┌──────────────────┐   │
│                                      │  Static Output   │   │
│  ┌──────────────┐                    │    (_site/)      │   │
│  │    SASS      │───────────────────▶│                  │   │
│  │  Stylesheets │                    │  • HTML files    │   │
│  └──────────────┘                    │  • CSS files     │   │
│                                      │  • Assets        │   │
│  ┌──────────────┐                    │  • search.json   │   │
│  │   Assets     │───────────────────▶│                  │   │
│  │(Images, etc.)│                    └──────────────────┘   │
│  └──────────────┘                              │            │
│                                                 │            │
└─────────────────────────────────────────────────┼────────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │   GitHub Pages   │
                                        └──────────────────┘
```

---

## Data Architecture

### Content Storage Model

**Paradigm:** File-based content management

```
Content Model:
├── Catalogue Entries (Product Pages)
│   ├── Format: Markdown with YAML frontmatter
│   ├── Location: src/catalogue/{vendor}/{product}.md
│   ├── Schema: layout, title, description, image, tags
│   └── Count: ~33 vendors, multiple products each
│
├── Reviews
│   ├── Format: Markdown with YAML frontmatter
│   ├── Location: src/reviews/{vendor}/{product}/*.md
│   ├── Schema: product, author, starRating, date
│   └── Aggregated via Eleventy collections
│
├── Product Assessments
│   ├── Format: Markdown
│   ├── Location: src/product-assessments/{vendor}/{product}/*.md
│   └── Formal evaluation reports
│
├── Challenges
│   ├── Format: Markdown
│   ├── Location: src/challenges/{department}/*.md
│   └── Government procurement challenges
│
├── Discover Content
│   ├── News: src/discover/news/*.md
│   ├── Events: src/discover/events/*.md
│   └── Case Studies: src/discover/case-studies/*.md
│
└── Informational Pages
    ├── About: src/About/*.md
    ├── Learn: src/learn/*.md
    ├── Try: src/try/*.md
    ├── Access: src/access/*.md
    └── Optimise: src/optimise/*.md
```

### Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Content → Collection                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. Markdown File (src/catalogue/google/firebase.md)    │
│     ↓                                                     │
│  2. Eleventy reads frontmatter + content                 │
│     ↓                                                     │
│  3. Added to 'catalogue' collection                      │
│     ↓                                                     │
│  4. Indexed by tags → 'catalogueByTag'                   │
│     ↓                                                     │
│  5. Sorted alphabetically                                │
│     ↓                                                     │
│  6. Available in templates via collections.catalogue     │
│     ↓                                                     │
│  7. Rendered to HTML using 'product' layout              │
│     ↓                                                     │
│  8. Output: _site/catalogue/google/firebase/index.html   │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Collections Schema

**Defined in `eleventy.config.js`:**

```javascript
// Collection: catalogue
{
  source: "src/catalogue/**/*.md",
  excludes: ["**/index.md", "**/tags.md"],
  sort: (a, b) => a.data.title.localeCompare(b.data.title),
  transform: useExternalUrl  // Supports external links
}

// Collection: catalogueByTag
{
  structure: {
    "AI": [/* catalogue items tagged AI */],
    "Google": [/* catalogue items tagged Google */],
    // ... etc
  }
}

// Collection: reviews
{
  source: "src/reviews/**/*.md",
  sort: (a, b) => new Date(b.data.date) - new Date(a.data.date)
}

// Collection: challenges
{
  source: "src/challenges/**/*.md",
  excludes: ["**/index.md"],
  sort: (a, b) => new Date(b.data.date) - new Date(a.data.date)
}
```

### No Traditional Database

**Rationale for file-based storage:**
- ✅ Version controlled (full history in Git)
- ✅ Developer-friendly (markdown editing)
- ✅ No database infrastructure needed
- ✅ Build-time processing (fast runtime)
- ✅ Easy backup and portability
- ✅ Review process via pull requests
- ❌ No real-time updates (requires rebuild)
- ❌ Not suitable for user-generated content

---

## Component Architecture

### Component Hierarchy

```
┌────────────────────────────────────────────────────┐
│                   Page Layouts                      │
├────────────────────────────────────────────────────┤
│  • homepage (landing page)                         │
│  • product (service/catalogue pages)               │
│  • collection (catalogue/challenge listings)       │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│              GOV.UK Base Components                 │
├────────────────────────────────────────────────────┤
│  • Header (service navigation)                     │
│  • Footer (with commit metadata)                   │
│  • Breadcrumbs                                     │
│  • Phase Banner (ALPHA tag)                        │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│              Custom Components                      │
├────────────────────────────────────────────────────┤
│  • Header Override (prototype banner)              │
│  • Reviews (star ratings, summary lists)           │
│  • Product Assessments                             │
│  • Catalogue Collection (tag filtering)            │
└────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────┐
│                  GOV.UK Macros                      │
├────────────────────────────────────────────────────┤
│  • govukButton (CTAs)                              │
│  • govukTag (badges)                               │
│  • govukSummaryList (key-value pairs)              │
│  • govukInsetText (callouts)                       │
└────────────────────────────────────────────────────┘
```

### Key Component Details

#### Reviews Component
**File:** `src/_includes/components/reviews.njk`

**Functionality:**
- Fetches reviews from `collections.reviews`
- Filters by product ID
- Renders star rating (1-5) with visual stars
- Color-codes rating tags:
  - 4-5 stars: Green tag ("Good"/"Excellent")
  - 3 stars: Blue tag ("Average")
  - 1-2 stars: Red tag ("Poor"/"Very poor")
- Displays: Rating, Author, Date in Summary List
- Includes review content (markdown)

**Usage:**
```njk
{% include "components/reviews.njk" %}
```

#### Catalogue Collection
**File:** `src/_includes/catalogue-collection.njk`

**Functionality:**
- Renders catalogue with sidebar filters
- Tag-based filtering (AI, Low-code, Security, vendors)
- External URL support
- Alphabetical sorting

**Filter Categories:**
- Service types: GOV.UK Services, Campaign Products
- Technologies: AI, Low-code, Security
- Vendors: Amazon, Google, IBM, Microsoft, Oracle, Red Hat

---

## Content Model

### Frontmatter Schema

#### Product/Service Page

```yaml
layout: product
title: Google Firebase
description: Accelerate app development with Google Firebase...
image:
  src: /assets/catalogue/google/firebase-logo.svg
  alt: Google Firebase
eleventyNavigation:
  parent: Catalogue
  url: https://external-link.com  # Optional external link
tags:
  - Google
  - Firebase
  - App Development
  - cloud
  - Mobile
```

#### Review Page

```yaml
product: mindweave-labs/synaplyte  # Vendor/product identifier
author: John Doe
starRating: 4  # 1-5
date: 2025-01-15
```

#### Challenge Page

```yaml
title: DEFRA Data Integration Challenge
date: 2025-01-10
---
Markdown content...
```

### Content Sections

| Section | Purpose | Count |
|---------|---------|-------|
| **About** | NDX overview, benefits, incubator | 3 pages |
| **Catalogue** | Cloud service listings | 33+ vendors |
| **Discover** | News, events, case studies | Variable |
| **Challenges** | Govt procurement challenges | 2+ departments |
| **Learn** | Training & certification | TBD |
| **Try** | Trial environment access | TBD |
| **Access** | Production access requests | TBD |
| **Optimise** | Cloud optimization guidance | TBD |
| **Begin** | AI adoption ("Begin with AI") | TBD |

---

## Build Pipeline

### Build Process Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Build Pipeline                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐                                         │
│  │  Trigger   │  Push to main / PR / Tag                │
│  └────────────┘                                         │
│        │                                                 │
│        ▼                                                 │
│  ┌────────────────────────────────────────────┐         │
│  │         GitHub Actions Workflow            │         │
│  │         (.github/workflows/ci.yaml)        │         │
│  └────────────────────────────────────────────┘         │
│        │                                                 │
│        ├──▶ Security: Harden Runner                     │
│        ├──▶ Checkout: actions/checkout@v5               │
│        ├──▶ Setup: actions/setup-node@v4                │
│        │    (Node 20.17.0 from .nvmrc)                  │
│        ├──▶ Install: corepack enable + yarn             │
│        ├──▶ Lint: yarn lint (prettier check)            │
│        ├──▶ Build: PATH_PREFIX=/ndx/ yarn build         │
│        │                                                 │
│        ▼                                                 │
│  ┌────────────────────────────────────────────┐         │
│  │            Build Output (_site/)           │         │
│  ├────────────────────────────────────────────┤         │
│  │  • HTML files (165+ pages)                 │         │
│  │  • CSS (compiled SASS)                     │         │
│  │  • Images, fonts, assets                   │         │
│  │  • search.json (search index)              │         │
│  └────────────────────────────────────────────┘         │
│        │                                                 │
│        ├──▶ Tar: site.tar                               │
│        ├──▶ Upload: actions/upload-artifact@v4          │
│        │                                                 │
│        ▼                                                 │
│  ┌────────────────────────────────────────────┐         │
│  │         Publish Job (main only)            │         │
│  ├────────────────────────────────────────────┤         │
│  │  • Download artifact                       │         │
│  │  • Untar files                             │         │
│  │  • Configure GitHub Pages                  │         │
│  │  • Deploy to Pages                         │         │
│  └────────────────────────────────────────────┘         │
│        │                                                 │
│        ▼                                                 │
│  ┌────────────┐                                         │
│  │  Deployed  │  https://co-cddo.github.io/ndx/         │
│  └────────────┘                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Build Optimizations

- **Incremental Builds:** Eleventy only rebuilds changed files (dev mode)
- **Asset Passthrough:** Static files copied without processing
- **SASS Compilation:** Handled by GOV.UK plugin
- **Caching:** Yarn cache in CI (faster installs)
- **Parallel Jobs:** Build and security scanning run concurrently

---

## Deployment Architecture

### GitHub Pages Hosting

```
┌──────────────────────────────────────────────────┐
│          GitHub Pages Architecture               │
├──────────────────────────────────────────────────┤
│                                                   │
│  User Request                                    │
│       │                                          │
│       ▼                                          │
│  ┌──────────┐                                    │
│  │   DNS    │  co-cddo.github.io                │
│  └──────────┘                                    │
│       │                                          │
│       ▼                                          │
│  ┌──────────┐                                    │
│  │ GitHub   │  Pages CDN (Fastly)                │
│  │   CDN    │  - Global edge nodes               │
│  └──────────┘  - HTTPS enforced                  │
│       │         - Automatic caching               │
│       ▼                                          │
│  ┌──────────┐                                    │
│  │ Browser  │  Static HTML/CSS/JS                │
│  └──────────┘  No server processing              │
│                                                   │
└──────────────────────────────────────────────────┘
```

**Deployment URL:** `https://co-cddo.github.io/ndx/`

**Characteristics:**
- **CDN:** Fastly global network
- **HTTPS:** Enforced, automatic certificates
- **Caching:** Aggressive browser & CDN caching
- **No Server:** Pure static file serving
- **Uptime:** GitHub SLA (99.9%+)

### Deployment Triggers

| Trigger | Action |
|---------|--------|
| **Push to `main`** | Full build + deploy to production |
| **Pull Request** | Build only (no deploy) |
| **Tag `v*.*.*`** | Build + deploy (version release) |

### Rollback Strategy

**Git-based rollback:**
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# CI/CD automatically redeploys previous version
```

**Manual rollback:**
```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Force push (use with caution)
git push -f origin main
```

---

## Security Architecture

### Security Layers

```
┌──────────────────────────────────────────────────┐
│              Security Architecture               │
├──────────────────────────────────────────────────┤
│                                                   │
│  1. CI/CD Security                               │
│     ├─ Harden Runner (audit egress)             │
│     ├─ CodeQL scanning (vulnerabilities)        │
│     ├─ OpenSSF Scorecard (best practices)       │
│     └─ Dependabot (dependency updates)          │
│                                                   │
│  2. Supply Chain Security                        │
│     ├─ Yarn lock file (pinned versions)         │
│     ├─ Node version pinned (.nvmrc)             │
│     └─ Auto-merge trusted updates               │
│                                                   │
│  3. Code Quality Security                        │
│     ├─ Pre-commit hooks (Husky)                 │
│     ├─ Lint-staged (format checking)            │
│     └─ Prettier (consistent code style)         │
│                                                   │
│  4. Runtime Security (N/A - Static Site)         │
│     ├─ No server-side code                      │
│     ├─ No database                               │
│     ├─ No user authentication                   │
│     └─ No dynamic backend                       │
│                                                   │
│  5. Content Security                             │
│     ├─ Version controlled (Git)                 │
│     ├─ Pull request reviews                     │
│     └─ No user-generated content                │
│                                                   │
│  6. Transport Security                           │
│     ├─ HTTPS enforced (GitHub Pages)            │
│     └─ Modern TLS (handled by GitHub)           │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Threat Model

**Attack Surface:** Minimal

| Threat | Mitigation |
|--------|-----------|
| **XSS** | Static HTML, no user input |
| **SQL Injection** | No database |
| **CSRF** | No forms/authentication |
| **Server Compromise** | No server (static files) |
| **Dependency Vulnerabilities** | Dependabot + CodeQL |
| **Supply Chain Attack** | Pinned deps, verified actions |
| **Content Tampering** | Git version control, PR reviews |

### Compliance

**GOV.UK Standards:**
- GDS design principles
- GOV.UK Frontend (accessibility compliant)
- WCAG 2.1 AA compliance (via GOV.UK)

**Security Badges:**
- OpenSSF Best Practices
- OpenSSF Scorecard
- CodeQL scanning

---

## Performance Characteristics

### Page Load Performance

**Metrics (typical):**
- **First Contentful Paint:** <0.5s
- **Time to Interactive:** <1s
- **Total Page Size:** ~200KB (including GOV.UK assets)
- **HTML Size:** ~50KB (gzipped)
- **CSS Size:** ~30KB (GOV.UK + custom)
- **JS Size:** Minimal (GOV.UK components only)

**Performance Features:**
- Pre-rendered HTML (instant first paint)
- CDN delivery (global edge caching)
- Minimal JavaScript (no framework overhead)
- Static assets cached aggressively
- No database queries
- No API calls

### Build Performance

**Typical Build Times:**
- **Local Dev Build:** 2-5 seconds
- **CI Build (cold cache):** 2-3 minutes
- **CI Build (warm cache):** 1-2 minutes

**Build Optimizations:**
- Eleventy incremental builds (dev)
- Yarn cache in CI
- Passthrough copy for assets
- Parallel CI jobs

### Scalability

**Static Site Advantages:**
- Infinite horizontal scaling (CDN)
- No database bottlenecks
- No server capacity planning
- Automatic global distribution
- No peak traffic concerns

**Constraints:**
- Build time increases with content (currently fast)
- 165+ pages build in ~5 seconds locally

---

## Development Workflow

### Local Development

```
Developer Workflow:
1. Clone repository
2. Install Node 20.17.0 (nvm use)
3. Install dependencies (yarn)
4. Start dev server (yarn start)
5. Edit content/templates
6. Auto-reload in browser
7. Commit changes
8. Pre-commit hook runs (lint-staged)
9. Push to feature branch
10. Create pull request
11. CI runs tests + build
12. Merge to main
13. Auto-deploy to production
```

### Branching Strategy

```
main (protected)
  │
  ├── feature/catalogue-google-gemini
  ├── feature/challenge-mod-ai
  ├── fix/header-banner-spacing
  └── docs/update-readme
```

**Branch Protection:**
- Require PR reviews
- Require CI passing
- No direct commits to `main`

### Content Contribution Workflow

```
1. Content Author creates markdown file
2. Adds frontmatter (title, description, tags)
3. Places in appropriate directory
4. Commits and pushes
5. Creates PR
6. Reviewer checks content
7. CI builds preview
8. Merge to main
9. Auto-deploy to production
```

---

## Testing Strategy

### Current Testing Approach

**Status:** No automated test suite

**Manual Testing:**
- Visual review during development
- Build verification (yarn build succeeds)
- Lint checking (yarn lint)
- Link checking (manual browser testing)

### CI Checks

- ✅ **Build Success:** Site must compile
- ✅ **Lint Pass:** Code formatting must pass
- ✅ **Security Scan:** CodeQL must pass
- ❌ **Unit Tests:** None
- ❌ **Integration Tests:** None
- ❌ **E2E Tests:** None
- ❌ **Accessibility Tests:** None (relies on GOV.UK compliance)

### Recommended Testing Additions

**Priority 1:**
- Link checker (eleventy-plugin-broken-links)
- HTML validation (html-validate)
- Accessibility scanning (pa11y, axe-core)

**Priority 2:**
- Visual regression (BackstopJS, Percy)
- Performance budgets (Lighthouse CI)
- Content validation (schema checks)

**Priority 3:**
- E2E tests for critical paths (Playwright)
- Screenshot testing
- SEO checks

---

## Scalability & Growth

### Current Scale

- **Pages:** 165+ markdown files
- **Vendors:** 33 cloud service providers
- **Build Time:** ~5 seconds (local), ~2 minutes (CI)
- **Deployment:** Seconds (static file copy)

### Growth Projections

**Scenario: 100 vendors, 500 services**
- **Build Time:** ~15-30 seconds (still fast)
- **Deployment:** Unchanged (static)
- **Performance:** No impact (pre-rendered)
- **Content Management:** May need CMS

**Scenario: 1000 vendors, 5000 services**
- **Build Time:** 1-3 minutes (acceptable)
- **Content Management:** Requires CMS (markdown becomes unwieldy)
- **Search:** May need dedicated search service (not JSON)
- **Organization:** Need better taxonomy/filtering

### Scalability Recommendations

**Short-term (current approach sufficient):**
- Continue file-based content
- Optimize Eleventy config
- Add search enhancements

**Medium-term (100-500 services):**
- Consider headless CMS (Contentful, Sanity)
- Implement full-text search (Algolia, Meilisearch)
- Add advanced filtering UI

**Long-term (1000+ services):**
- Hybrid approach: CMS + static generation
- Dedicated search infrastructure
- Content API for external integrations
- Multi-language support

---

## Technical Decisions & Rationale

### Why Eleventy?

**Pros:**
- ✅ Simple, fast static site generator
- ✅ No client-side framework (lightweight)
- ✅ Flexible (multiple template engines)
- ✅ Great for content-heavy sites
- ✅ Strong community & plugins
- ✅ Government sector adoption (GOV.UK plugin)

**Alternatives Considered:**
- ❌ **Next.js:** Overkill for static content, React overhead
- ❌ **Gatsby:** GraphQL unnecessary, heavier build
- ❌ **Hugo:** Less JavaScript ecosystem fit
- ❌ **Jekyll:** Ruby dependency, slower

### Why JAMstack?

**Pros:**
- ✅ Maximum security (no backend to hack)
- ✅ Fast performance (pre-rendered)
- ✅ Cheap hosting (static files)
- ✅ Easy scaling (CDN)
- ✅ Version controlled content
- ✅ Developer-friendly

**Cons:**
- ❌ No real-time updates (requires rebuild)
- ❌ Not suitable for user-generated content
- ❌ Build time increases with content

**Fit for NDX:** Excellent (mostly informational, infrequent updates)

### Why GitHub Pages?

**Pros:**
- ✅ Free for public repos
- ✅ Integrated with GitHub Actions
- ✅ Automatic HTTPS
- ✅ Good performance (Fastly CDN)
- ✅ Simple deployment

**Cons:**
- ❌ No server-side capabilities
- ❌ Limited build time (10 min max)
- ❌ Public repos only for free tier

**Alternatives:**
- **Netlify:** Better for advanced features (forms, functions)
- **Cloudflare Pages:** Faster CDN, more regions
- **AWS S3 + CloudFront:** More control, higher complexity

**Choice:** GitHub Pages is sufficient for alpha phase, easy migration later

### Why GOV.UK Frontend?

**Pros:**
- ✅ Official UK government design system
- ✅ Accessibility built-in (WCAG 2.1 AA)
- ✅ Familiar to government users
- ✅ Well-maintained components
- ✅ Compliance with GDS standards

**Cons:**
- ❌ Less flexible than custom design
- ❌ UK-specific (not reusable outside gov)

**Fit for NDX:** Perfect (government service)

---

## Future Considerations

### Phase 2: Beyond Alpha

**When NDX moves from prototype to production:**

1. **User Accounts & Authentication**
   - SSO integration (Gov.uk Verify, GOV.UK Sign In)
   - User dashboards
   - Service access tracking

2. **Dynamic Features**
   - User reviews (real-time submission)
   - Service usage analytics
   - Access request workflow

3. **Backend Services**
   - API for service metadata
   - User management database
   - Integration with procurement systems

4. **Headless CMS**
   - Content management UI
   - Non-technical editor access
   - Draft/publish workflow

5. **Search Enhancement**
   - Full-text search service
   - Advanced filtering
   - Faceted navigation

### Migration Path (Static → Hybrid)

**Recommended Approach:**
- Keep static generation for public pages
- Add Next.js or similar for dynamic features
- Introduce API layer for user-specific data
- Maintain current content in markdown (version controlled)
- Use CMS only for non-critical content updates

**Architecture Evolution:**
```
Current: Full Static (JAMstack)
         ↓
Phase 2: Hybrid (Static + API)
         ↓
Phase 3: Full Application (React/Next.js + API + CMS)
```

### Technical Debt to Address

1. **Testing:** Add automated test suite
2. **Search:** JSON search won't scale to 1000+ services
3. **Content Management:** Markdown editing not user-friendly
4. **Analytics:** Add usage tracking (Google Analytics, etc.)
5. **Forms:** No form handling (would need Netlify Forms or API)

---

## Appendices

### Glossary

- **JAMstack:** JavaScript, APIs, and Markup architecture
- **Eleventy (11ty):** Static site generator
- **Nunjucks:** Templating engine
- **GOV.UK Frontend:** UK government design system
- **GitHub Pages:** Static site hosting service
- **Markdown:** Lightweight markup language
- **Frontmatter:** YAML metadata at the top of markdown files
- **Collection:** Eleventy's data grouping mechanism
- **CDN:** Content Delivery Network

### Key Files Reference

| File | Purpose |
|------|---------|
| `eleventy.config.js` | Eleventy configuration, collections, plugins, filters |
| `package.json` | Dependencies, scripts, Prettier config |
| `src/index.md` | Homepage |
| `src/_includes/components/` | Custom components |
| `src/assets/styles.scss` | Main stylesheet |
| `.github/workflows/ci.yaml` | CI/CD pipeline |
| `.nvmrc` | Node version (20.17.0) |

### Links & Resources

- **Repository:** https://github.com/co-cddo/ndx
- **Website:** https://co-cddo.github.io/ndx/
- **Eleventy Docs:** https://www.11ty.dev/docs/
- **GOV.UK Frontend:** https://frontend.design-system.service.gov.uk/
- **GOV.UK Eleventy Plugin:** https://github.com/x-govuk/govuk-eleventy-plugin

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-18
**Maintained By:** UK Central Digital and Data Office (CDDO)
**Contact:** ndx@digital.cabinet-office.gov.uk
