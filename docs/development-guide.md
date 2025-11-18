# Development Guide - National Digital Exchange

**Generated:** 2025-11-18
**Project:** NDX (National Digital Exchange)
**Repository:** https://github.com/co-cddo/ndx

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.17.0 | Runtime environment |
| **Yarn** | ≥ 4.5.0 | Package manager (required, npm blocked) |
| **Git** | Latest | Version control |
| **nvm** | Latest (recommended) | Node version management |

### Version Management

The project uses **nvm** for Node.js version management:

```bash
# .nvmrc specifies Node 20.17.0
cat .nvmrc
# Output: 20.17.0

# Install and use correct Node version
nvm install
nvm use
```

### Package Manager

**Yarn 4.5.0** is strictly enforced via `engines` in `package.json`:

```json
{
  "engines": {
    "npm": "please-use-yarn",
    "yarn": ">= 4.5.0"
  },
  "engineStrict": true,
  "packageManager": "yarn@4.5.0"
}
```

**Attempting to use npm will fail with error: "please-use-yarn"**

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/co-cddo/ndx.git
cd ndx
```

### 2. Install Node.js

Using nvm (recommended):

```bash
# Install correct Node version from .nvmrc
nvm install

# Use the installed version
nvm use
```

Or install Node.js 20.17.0 manually from [nodejs.org](https://nodejs.org/).

### 3. Enable Corepack (for Yarn)

Yarn 4.5.0 is managed via Corepack:

```bash
# Enable corepack (ships with Node.js 16.10+)
corepack enable

# Verify Yarn version
yarn --version
# Expected: 4.5.0
```

### 4. Install Dependencies

```bash
# Install all dependencies (271 packages)
yarn install
```

**What gets installed:**
- **Eleventy 3.1.2** - Static site generator
- **GOV.UK Frontend** - Design system
- **@x-govuk/govuk-eleventy-plugin 7.2.1** - GOV.UK Eleventy integration
- **Husky 9.1.7** - Git hooks
- **Prettier 3.6.2** - Code formatting
- **lint-staged 16.1.5** - Pre-commit linting
- **@kevingimbel/eleventy-plugin-mermaid 3.0.0** - Diagram support

## Development Workflow

### Start Development Server

```bash
# Start Eleventy dev server with live reload
yarn start
```

**What happens:**
1. Removes `_site/` directory
2. Runs `eleventy --serve`
3. Starts server at `http://localhost:8080`
4. Watches `src/` for changes
5. Auto-rebuilds and reloads browser

**Dev Server Features:**
- Live reload on file changes
- BrowserSync integration
- Source maps for debugging
- Fast incremental builds

### Build for Production

```bash
# Build static site to _site/
yarn build
```

**Build Output:**
- **Location:** `_site/`
- **Contents:** Static HTML, CSS, JS, images, fonts
- **Path Prefix:** Configurable via `PATH_PREFIX` env var
- **Example:** `PATH_PREFIX=/ndx/ yarn build` (for GitHub Pages subdirectory)

**Build Process:**
1. Processes `src/**/*.md` → HTML
2. Compiles `src/**/*.njk` → HTML
3. Compiles `src/assets/styles.scss` → CSS
4. Copies static assets (images, fonts)
5. Generates search index (`search.json`)
6. Outputs to `_site/`

### Code Quality

#### Linting

```bash
# Check code formatting
yarn lint
```

**What it checks:**
- JavaScript formatting (Prettier)
- Markdown formatting
- YAML/JSON formatting
- Shell script formatting (via prettier-plugin-sh)

**Prettier Configuration** (`package.json`):
```json
{
  "prettier": {
    "singleQuote": false,
    "printWidth": 120,
    "trailingComma": "all",
    "semi": false,
    "plugins": ["prettier-plugin-sh"]
  }
}
```

#### Auto-Fix Formatting

```bash
# Fix formatting issues automatically
npx prettier --write .
```

### Git Hooks (Husky)

**Pre-Commit Hook:**
- Automatically runs `lint-staged` before commits
- Checks and auto-fixes formatting on staged files only
- Configured in `.lintstagedrc.json`

**Hook Setup:**
```bash
# Hooks installed automatically via `yarn install`
# Configured in `package.json`:
{
  "scripts": {
    "prepare": "husky"
  }
}
```

**What runs on commit:**
- Prettier formatting check on staged files
- Auto-fix if possible
- Commit blocked if formatting fails

## Project Structure

### Source Organization

```
src/
├── _includes/          # Nunjucks templates and components
├── assets/             # Static assets (images, stylesheets)
├── sass/               # SASS configuration
├── catalogue/          # Service catalogue (33+ vendors)
├── discover/           # News, events, case studies
├── challenges/         # Government challenges
├── About/              # About pages
├── access/             # Access request pages
├── begin/              # AI adoption guidance
├── learn/              # Learning resources
├── optimise/           # Optimization guidance
├── try/                # Trial environment
├── product-assessments/ # Product assessments
├── reviews/            # User reviews
└── index.md            # Homepage
```

### Configuration Files

| File | Purpose |
|------|---------|
| `eleventy.config.js` | Eleventy configuration, collections, plugins |
| `package.json` | Dependencies, scripts, Prettier config |
| `.nvmrc` | Node.js version (20.17.0) |
| `.yarnrc.yml` | Yarn configuration |
| `.editorconfig` | Editor settings (indentation, line endings) |
| `.eleventyignore` | Files to exclude from Eleventy processing |
| `.gitignore` | Files to exclude from Git |
| `.lintstagedrc.json` | Lint-staged configuration |

## Adding Content

### Create a New Catalogue Entry

1. Create vendor directory (if new):
   ```bash
   mkdir -p src/catalogue/vendor-name
   ```

2. Create service markdown file:
   ```bash
   touch src/catalogue/vendor-name/service-name.md
   ```

3. Add frontmatter and content:
   ```yaml
   ---
   layout: product
   title: Service Name
   description: Brief description
   image:
     src: /assets/catalogue/vendor-name/logo.svg
     alt: Service Name Logo
   eleventyNavigation:
     parent: Catalogue
   tags:
     - Vendor Name
     - Technology Category
     - cloud
   ---

   # Service content here
   ```

4. Add logo to `src/assets/catalogue/vendor-name/`

5. Eleventy will automatically:
   - Add to `catalogue` collection
   - Index by tags in `catalogueByTag`
   - Generate page at `/catalogue/vendor-name/service-name/`

### Create a News Item

```bash
# Create markdown file in news directory
touch src/discover/news/yyyy-mm-dd-news-title.md
```

```yaml
---
title: News Title
date: 2025-01-18
eleventyNavigation:
  url: https://external-link.com  # Optional external URL
---

News content here...
```

### Create a Challenge

```bash
# Create challenge in department directory
touch src/challenges/department-name/challenge-name.md
```

```yaml
---
title: Challenge Title
date: 2025-01-18
---

Challenge description...
```

## Testing

### No Automated Tests

**Current State:** No test suite is configured.

**Testing Approach:**
1. **Manual Testing:**
   - Run `yarn start`
   - Navigate to `http://localhost:8080`
   - Test pages manually

2. **Build Verification:**
   - Run `yarn build`
   - Check `_site/` output
   - Verify no build errors

3. **Link Checking:**
   - Use browser dev tools
   - Check for 404 errors
   - Verify navigation works

### Future Testing Recommendations

- **Link Checker:** `eleventy-plugin-broken-links`
- **HTML Validation:** `html-validate`
- **Accessibility:** `pa11y` or `axe-core`
- **Visual Regression:** `BackstopJS` or `Percy`

## Deployment

### GitHub Pages (Production)

**Trigger:** Push to `main` branch or tagged release (`v*.*.*`)

**CI/CD Pipeline** (`.github/workflows/ci.yaml`):

```yaml
on:
  push:
    branches: [main]
    tags: ["v*.*.*"]
  pull_request:
    branches: [main]
```

**Build Job:**
1. Harden runner (step-security)
2. Checkout code
3. Enable corepack
4. Setup Node.js (from `.nvmrc`)
5. Install dependencies (`yarn`)
6. Lint (`yarn lint`)
7. Build (`PATH_PREFIX=/ndx/ yarn build`)
8. Tar `_site/` directory
9. Upload artifact

**Publish Job** (only on `main` branch):
1. Download artifact
2. Untar files
3. Configure GitHub Pages
4. Upload to Pages
5. Deploy

**Deployment URL:** https://co-cddo.github.io/ndx/

### Local Preview of Production Build

```bash
# Build with production path prefix
PATH_PREFIX=/ndx/ yarn build

# Serve _site/ directory
npx http-server _site -p 8080

# Visit: http://localhost:8080/ndx/
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PATH_PREFIX` | URL path prefix for deployment | `/` |

**Example:** For GitHub Pages subdirectory deployment:
```bash
PATH_PREFIX=/ndx/ yarn build
```

## Common Development Tasks

### Add a New Vendor

1. Create directories:
   ```bash
   mkdir -p src/catalogue/vendor-name
   mkdir -p src/assets/catalogue/vendor-name
   ```

2. Add logo to `src/assets/catalogue/vendor-name/logo.svg`

3. Create service pages in `src/catalogue/vendor-name/`

### Update GOV.UK Frontend

```bash
# Update to latest version
yarn upgrade @x-govuk/govuk-eleventy-plugin

# Test thoroughly after upgrade
yarn start
```

### Add a New Page Section

1. Create directory in `src/`:
   ```bash
   mkdir src/new-section
   ```

2. Create index page:
   ```bash
   touch src/new-section/index.md
   ```

3. Add to navigation in `eleventy.config.js`:
   ```js
   serviceNavigation: {
     navigation: [
       // ... existing items
       { text: "New Section", href: "/new-section" }
     ]
   }
   ```

### Debug Build Issues

```bash
# Verbose Eleventy output
DEBUG=Eleventy* yarn build

# Check Eleventy version
npx @11ty/eleventy --version

# Clear node_modules and reinstall
rm -rf node_modules
yarn install
```

### Update Dependencies

```bash
# Check for outdated packages
yarn outdated

# Update specific package
yarn upgrade package-name

# Update all non-major versions
yarn upgrade-interactive

# Verify no breaking changes
yarn build
yarn lint
```

## Code Style Guidelines

### Prettier (Auto-formatted)

- **Max Line Length:** 120 characters
- **Quotes:** Double quotes
- **Semicolons:** No semicolons
- **Trailing Commas:** All
- **Indentation:** 2 spaces

### Markdown

- Use frontmatter for all content pages
- Include `title` and `description`
- Add `eleventyNavigation` for breadcrumbs
- Use `tags` for categorization
- Follow GDS content style guide

### Nunjucks Templates

- Use macros for reusable components
- Import GOV.UK components from `govuk/components/*/macro.njk`
- Keep logic minimal (prefer Eleventy collections)
- Document complex templates with comments

## Troubleshooting

### Yarn Version Mismatch

**Error:** `The engine "yarn" is incompatible with this module`

**Solution:**
```bash
corepack enable
corepack prepare yarn@4.5.0 --activate
```

### Node Version Mismatch

**Error:** Build fails with syntax errors

**Solution:**
```bash
nvm use
# or
nvm install
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::8080`

**Solution:**
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill

# Or use different port
npx @11ty/eleventy --serve --port 3000
```

### Build Hangs

**Symptom:** `yarn build` never completes

**Solution:**
```bash
# Remove _site and rebuild
rm -rf _site
yarn build
```

### Husky Hooks Not Running

**Solution:**
```bash
# Reinstall Husky hooks
npx husky install
```

## Performance Optimization

### Build Time

**Current:** Fast (static site, minimal processing)

**Optimization Tips:**
- Use `.eleventyignore` to exclude large files
- Minimize plugins
- Use passthrough copy for static assets
- Disable watch on large directories

### Runtime Performance

**N/A** - Static site (no server-side runtime)

**Client-side Performance:**
- Minimal JavaScript
- GOV.UK Frontend is lightweight
- Static assets cached
- No client-side framework overhead

## Security

### Pre-Commit Security

**GitHub Actions:**
- **Harden Runner** - step-security/harden-runner@v2.13.0
- **CodeQL** - Automated security scanning
- **OpenSSF Scorecard** - Security best practices scoring

### Dependency Security

**Dependabot:**
- Automated dependency updates
- Auto-merge for minor/patch versions (`.github/workflows/automerge-dependabot.yaml`)
- Security vulnerability alerts

### Content Security

- No user-generated content
- No database or API
- Static HTML only
- No authentication/authorization needed

## Support & Contact

- **Email:** ndx@digital.cabinet-office.gov.uk
- **Issues:** https://github.com/co-cddo/ndx/issues
- **Code of Conduct:** `CODE_OF_CONDUCT.md`

---

**Last Updated:** 2025-11-18
**Maintained By:** UK Central Digital and Data Office (CDDO)
