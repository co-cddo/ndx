# National Digital Exchange (NDX) - Project Documentation Index

**Generated:** 2025-11-18
**Scan Type:** Exhaustive
**Project Root:** `/Users/cns/httpdocs/cddo/ndx`
**Repository:** https://github.com/co-cddo/ndx

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Project Name** | National Digital Exchange (NDX) |
| **Purpose** | UK Government cloud service catalogue and procurement platform |
| **Project Type** | Web Application (Static Site) |
| **Repository Type** | Monolith |
| **Architecture** | JAMstack (JavaScript, APIs, Markup) |
| **Primary Language** | JavaScript (Node.js 20.17.0) |
| **Framework** | Eleventy 3.1.2 (Static Site Generator) |
| **Design System** | GOV.UK Frontend via @x-govuk/govuk-eleventy-plugin 7.2.1 |
| **Package Manager** | Yarn 4.5.0 (npm blocked) |
| **Deployment** | GitHub Pages (https://co-cddo.github.io/ndx/) |
| **CI/CD** | GitHub Actions |
| **Phase** | Alpha (Prototype) |
| **Impact** | £2B taxpayer savings (projected) |

---

## 📋 Project Overview

The **National Digital Exchange (NDX)** is a pioneering UK government service transforming public sector cloud adoption. It serves as a one-stop shop for government departments to discover, evaluate, try, and access pre-approved cloud services from commercial vendors.

**Strategic Goals:**
- Simplify government tech procurement
- Enable secure, well-architected cloud environments
- Facilitate data and capability sharing between departments
- Provide equal access to advanced technologies for all public sector organizations

**Key Features:**
- **Catalogue:** 33+ cloud service vendors with multiple products each
- **Discover:** Industry news, events, and case studies
- **Challenges:** Government procurement challenges (DEFRA, MOD)
- **Reviews:** User reviews with star ratings
- **Try:** 24-hour trial environment access
- **Access:** Production environment deployment

---

## 📚 Generated Documentation

### Core Documentation

#### [Architecture Documentation](./architecture.md)
**Comprehensive technical architecture covering:**
- JAMstack architecture pattern
- System architecture diagrams
- Technology stack details
- Component architecture
- Content model and data flow
- Build and deployment pipelines
- Security architecture
- Performance characteristics
- Scalability considerations
- Technical decision rationale
- Future evolution roadmap

**Essential for:** Understanding overall system design, technical decisions, and architectural patterns

---

#### [Component Inventory](./component-inventory.md)
**Complete UI component catalog including:**
- Custom Nunjucks components (header, reviews, product assessments)
- GOV.UK Frontend integration
- Eleventy collections (catalogue, reviews, challenges, news, events)
- SASS architecture and custom styling
- Design system compliance
- Reusable patterns and macros
- Content model schemas

**Essential for:** Frontend development, component reuse, understanding template structure

---

#### [Source Tree Analysis](./source-tree-analysis.md)
**Annotated directory structure with:**
- Complete directory tree (85+ directories)
- Purpose annotations for each folder
- Entry points and critical files
- Integration points and data flow
- Asset organization
- File counts and statistics
- Monorepo vs monolith analysis

**Essential for:** Navigating the codebase, understanding project organization

---

#### [Development Guide](./development-guide.md)
**Complete development workflow covering:**
- Prerequisites and setup (Node 20.17.0, Yarn 4.5.0)
- Local development server
- Build process
- Code quality tools (Prettier, Husky, lint-staged)
- Git hooks and pre-commit checks
- Adding content (catalogue entries, news, challenges)
- Testing approach
- Common development tasks
- Troubleshooting

**Essential for:** Onboarding developers, daily development workflow

---

### Research Reports

#### [JavaScript Enhancement Research](./research/)
**Latest:** November 18, 2024

Comprehensive research on adding client-side JavaScript to the NDX project:
- **Final Report:** [JavaScript Enhancements for NDX](./research/research_final_20251118_javascript_enhancements_ndx.md)
- **Recommendation:** Three-tier approach with Alpine.js for progressive enhancement
- **Supporting Reports:** Eleventy patterns, GOV.UK Frontend compliance, lightweight strategies
- **Total Research:** 70+ sources, 4 comprehensive reports, 138KB documentation

Essential for: Planning interactive features, choosing JavaScript libraries, GOV.UK compliance

---

### Supporting Documentation

#### [Project Status](./bmm-workflow-status.yaml)
**BMM workflow tracking:**
- Current phase: Prerequisite (document-project required)
- Workflow path: Method track, brownfield
- Project type: Website

---

#### [Scan State](./project-scan-report.json)
**Exhaustive scan metadata:**
- Workflow version: 1.2.0
- Scan level: Exhaustive
- Completed steps tracking
- Project classification data
- Output inventory

---

## 📖 Existing Project Documentation

### Project-Level Documentation

#### [README.md](../README.md)
- Project overview
- Technology stack summary
- Local development quick start
- Project structure
- Key features
- Contributing guidelines
- Deployment information
- License (MIT)

---

#### [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)
- Contributor Covenant Code of Conduct
- Civil Service Code compliance
- Community standards
- Reporting guidelines

---

### Content Documentation

#### About Section (`src/About/`)
- [index.md](../src/About/index.md) - About NDX overview
- [benefits.md](../src/About/benefits.md) - Benefits of NDX
- [NDX-incubator.md](../src/About/NDX-incubator.md) - Incubator program

---

### Configuration Files

#### [eleventy.config.js](../eleventy.config.js)
**Eleventy configuration including:**
- Collections definitions (catalogue, reviews, challenges, news, events, case studies)
- Plugins (GOV.UK Eleventy, Mermaid diagrams)
- Custom filters (date formatting)
- Custom shortcodes (remoteInclude)
- Passthrough copy configuration
- Template engine settings

---

#### [package.json](../package.json)
**Project manifest:**
- Dependencies (Eleventy, GOV.UK plugin, Mermaid)
- Dev dependencies (Prettier, Husky, lint-staged)
- Scripts (start, build, lint)
- Engines (Node 20.17.0+, Yarn 4.5.0+)
- Prettier configuration

---

#### CI/CD Configuration
- [.github/workflows/ci.yaml](../.github/workflows/ci.yaml) - Build, lint, deploy pipeline
- [.github/workflows/scorecard.yml](../.github/workflows/scorecard.yml) - OpenSSF security scorecard
- [.github/workflows/automerge-dependabot.yaml](../.github/workflows/automerge-dependabot.yaml) - Auto-merge dependencies

---

## 🎯 Getting Started

### For New Developers

1. **Read First:**
   - [README.md](../README.md) - Project overview
   - [Development Guide](./development-guide.md) - Setup instructions

2. **Understand Architecture:**
   - [Architecture Documentation](./architecture.md) - System design
   - [Source Tree Analysis](./source-tree-analysis.md) - Code organization

3. **Start Coding:**
   - [Development Guide](./development-guide.md#getting-started) - Setup steps
   - [Component Inventory](./component-inventory.md) - Available components

### For Content Authors

1. **Understand Content Model:**
   - [Component Inventory - Content Model](./component-inventory.md#content-model)
   - [Architecture - Content Model](./architecture.md#content-model)

2. **Add Content:**
   - [Development Guide - Adding Content](./development-guide.md#adding-content)
   - Catalogue entries: `src/catalogue/{vendor}/{product}.md`
   - News items: `src/discover/news/*.md`
   - Challenges: `src/challenges/{department}/*.md`

### For Architects

1. **System Overview:**
   - [Architecture Documentation](./architecture.md) - Complete architecture
   - [Architecture - JAMstack Pattern](./architecture.md#jamstack-architecture)
   - [Architecture - Technical Decisions](./architecture.md#technical-decisions--rationale)

2. **Future Planning:**
   - [Architecture - Scalability](./architecture.md#scalability--growth)
   - [Architecture - Future Considerations](./architecture.md#future-considerations)

---

## 🔍 Content Sections

### Catalogue (`src/catalogue/`)
**33+ vendors with multiple products:**
- Anthropic, AWS, Cloudflare, Databricks, Figma, GitLab, Google, GovTech Solutions, Great Wave AI, Greenbridge, IBM, Idox Geospatial, Immersive Labs, Kong, LanguageLine, LinkedIn, Met Office, Microsoft, Mindweave Labs, Okta, Oracle, Salesforce, ServiceNow, Silktide, Snowflake, UiPath, Zevero, and more

**Example:** `src/catalogue/google/firebase.md`

### Discover (`src/discover/`)
- **News:** `src/discover/news/` - Industry news items
- **Events:** `src/discover/events/` - Industry events
- **Case Studies:** `src/discover/case-studies/` - Implementation case studies

### Challenges (`src/challenges/`)
- **DEFRA:** `src/challenges/defra/` - Department for Environment challenges
- **MOD:** `src/challenges/mod/` - Ministry of Defence challenges

### Reviews (`src/reviews/`)
- User reviews with star ratings (1-5)
- Example: `src/reviews/mindweave-labs/synaplyte/*.md`

### Product Assessments (`src/product-assessments/`)
- Formal product evaluation reports
- Example: `src/product-assessments/mindweave-labs/synaplyte/*.md`

---

## 🛠️ Development Workflow

### Quick Commands

```bash
# Start development server
yarn start

# Build for production
yarn build

# Run linter
yarn lint

# Fix formatting
npx prettier --write .
```

### Creating New Content

#### Add Catalogue Entry
```bash
# 1. Create vendor directory
mkdir -p src/catalogue/vendor-name

# 2. Create service markdown file
touch src/catalogue/vendor-name/service-name.md

# 3. Add logo
# Place in: src/assets/catalogue/vendor-name/logo.svg

# 4. Add frontmatter and content (see component-inventory.md)
```

#### Add News Item
```bash
touch src/discover/news/yyyy-mm-dd-news-title.md
```

#### Add Challenge
```bash
touch src/challenges/department-name/challenge-name.md
```

---

## 🏗️ Architecture Highlights

### JAMstack Pattern
- **Build Time:** Markdown → Eleventy → Static HTML
- **Runtime:** Static files served from GitHub Pages CDN
- **No Server:** Pure client-side, pre-rendered content
- **Security:** Minimal attack surface (no backend, no database)

### Technology Choices

**Why Eleventy?**
- Fast, simple static site generator
- No client-side framework overhead
- Excellent for content-heavy sites
- Strong GOV.UK ecosystem

**Why GOV.UK Frontend?**
- Official UK government design system
- Built-in accessibility (WCAG 2.1 AA)
- Compliance with GDS standards
- Familiar to government users

**Why GitHub Pages?**
- Free for public repos
- Integrated with GitHub Actions
- Automatic HTTPS
- Fast global CDN (Fastly)

### Key Design Decisions
- **File-based content:** Version controlled, developer-friendly
- **No database:** Simplified architecture, security
- **Static generation:** Maximum performance, low cost
- **Collection-based:** Flexible content organization

---

## 🔐 Security

### Security Layers
1. **CI/CD:** Harden Runner, CodeQL scanning, OpenSSF Scorecard
2. **Supply Chain:** Pinned dependencies, Dependabot updates
3. **Code Quality:** Pre-commit hooks, lint-staged, Prettier
4. **Runtime:** N/A (static site - no server)
5. **Transport:** HTTPS enforced (GitHub Pages)

### Compliance
- **GOV.UK Standards:** GDS design principles
- **Accessibility:** WCAG 2.1 AA (via GOV.UK Frontend)
- **Security:** OpenSSF Best Practices badge

---

## 📊 Project Statistics

### Codebase
- **Total Directories:** 85+
- **Content Files:** 165+ markdown files
- **Templates:** 11 Nunjucks templates
- **Vendors:** 33 cloud service providers
- **NPM Packages:** 271

### Documentation
- **Generated Docs:** 5 comprehensive documents
- **Total Lines:** ~15,000+ lines of documentation
- **Coverage:** Architecture, components, development, source tree

---

## 🚀 Deployment

### Production
- **URL:** https://co-cddo.github.io/ndx/
- **Platform:** GitHub Pages
- **CDN:** Fastly (global edge network)
- **HTTPS:** Enforced, automatic certificates

### CI/CD Pipeline
1. Push to `main` branch
2. GitHub Actions triggers
3. Install dependencies (Yarn)
4. Run linter (Prettier)
5. Build site (Eleventy with PATH_PREFIX=/ndx/)
6. Upload to GitHub Pages
7. Deploy (seconds)

**Rollback:** Git revert + push (auto-redeploys previous version)

---

## 📞 Contact & Support

- **Email:** ndx@digital.cabinet-office.gov.uk
- **Issues:** https://github.com/co-cddo/ndx/issues
- **Code of Conduct:** [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)
- **License:** MIT

---

## 🎓 Additional Resources

### External Links
- **Eleventy Documentation:** https://www.11ty.dev/docs/
- **GOV.UK Frontend:** https://frontend.design-system.service.gov.uk/
- **GOV.UK Eleventy Plugin:** https://github.com/x-govuk/govuk-eleventy-plugin
- **Nunjucks:** https://mozilla.github.io/nunjucks/

### Press & Media
- [GOV.UK News: £2 billion savings announcement](https://www.gov.uk/government/news/one-stop-shop-for-tech-could-save-taxpayers-12-billion-and-overhaul-how-government-buys-digital-tools)
- [Procurement Magazine: Digital procurement transformation](https://procurementmag.com/news/uk-government-making-digital-procurement-smarter)
- [GOV.UK News: Tech investment and growth](https://www.gov.uk/government/news/raft-of-tech-companies-investing-in-britain-as-government-vows-to-unleash-growth)
- [Gov Tech Speech: Google Cloud Summit London](https://www.gov.uk/government/speeches/peter-kyles-speech-at-google-cloud-summit-london)

---

## 📝 Document Maintenance

**This index is auto-generated.** To update:
1. Run the document-project workflow
2. Review and approve changes
3. Commit updated documentation

**Last Scan:**
- **Date:** 2025-11-18
- **Mode:** Exhaustive
- **Duration:** ~30 minutes
- **Files Analyzed:** 165+ source files

---

**For AI-Assisted Development:** This index provides comprehensive entry points into the NDX codebase. Use the architecture documentation for system-wide understanding, component inventory for UI work, development guide for setup, and source tree for navigation.

**Maintained By:** UK Central Digital and Data Office (CDDO)
