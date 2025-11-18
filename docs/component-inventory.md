# UI Component Inventory - National Digital Exchange

**Generated:** 2025-11-18
**Project:** NDX (National Digital Exchange)
**Type:** Static Site (Eleventy + GOV.UK Frontend)

## Overview

The NDX website uses a component-based architecture built on GOV.UK Frontend design system with custom Nunjucks templates. Components are organized by function and leverage Eleventy collections for dynamic content rendering.

## Component Categories

### 1. Layout Components

#### Base Layouts
- **`collection`** - Collection listing layout for catalogue, challenges, etc.
- **`product`** - Product/service detail page layout with metadata, images, and CTAs
- **`homepage`** - Specialized layout for the main landing page

### 2. Custom Components (`src/_includes/components/`)

#### Header Component
- **Location:** `src/_includes/components/header/`
- **Files:**
  - `template.njk` - Extends GOV.UK header with experimental banner
  - `macro.njk` - Macro for header component
- **Features:**
  - Wraps standard GOV.UK header
  - Adds prototype disclaimer banner (yellow experimental header)
  - Email feedback link to ndx@dsit.gov.uk

#### Reviews Component
- **Location:** `src/_includes/components/reviews.njk`
- **Purpose:** Displays user product reviews with star ratings
- **Features:**
  - 5-star rating system with visual stars (★/☆)
  - Color-coded rating tags (green=4-5, blue=3, red=1-2)
  - Summary list displaying: Rating, Reviewed by, Date
  - Filters reviews by product ID
  - Uses GOV.UK Summary List, Tag, and Inset Text components
- **Data Source:** `collections.reviews`

#### Product Assessments Component
- **Location:** `src/_includes/components/product-assessments.njk`
- **Purpose:** Displays formal product assessment reports
- **Data Source:** `collections.productAssessments`

### 3. GOV.UK Frontend Components (via @x-govuk/govuk-eleventy-plugin)

The site leverages the full GOV.UK Design System component library:

#### Navigation Components
- **Service Navigation** - Top-level navigation menu
  - Home, About, Discover, Learn, Catalogue, Challenges, Try, Access, Optimise
  - Special "Begin with AI" link with sparkle animation
- **Breadcrumbs** - Hierarchical navigation
- **Footer** - Site footer with git commit metadata

#### Form Components
- **Button** - Primary and secondary CTAs
  - "Try this now for 24 hours" (start button)
  - "Deploy this now" (start button)
  - "Learn more" buttons

#### Data Display Components
- **Summary List** - Key-value pair displays (used in reviews)
- **Tag** - Status and category badges
  - Provider badges (e.g., `provider-google`)
  - Owner badges (e.g., `owner-private_sector`)
  - Access method badges (e.g., `access-NDX_OIDC`)
  - Rating tags with color coding
- **Inset Text** - Callout information boxes

#### Typography & Layout
- **Headings** - Hierarchical heading system (govuk-heading-l, govuk-heading-m)
- **Grid System** - Responsive grid (govuk-grid-row, govuk-grid-column-*)
- **Section Breaks** - Visual separators

### 4. Custom Macros (`src/_includes/macros/`)

#### Logo Macros
- **`logo.njk`** - Custom logo rendering
- **`x-govuk-logo.njk`** - Extended GOV.UK logo macro
- **`attributes.njk`** - HTML attribute helper macro

Also available in `src/_includes/govuk/macros/` (GOV.UK-specific variants).

### 5. Collection Templates

#### Catalogue Collection
- **Location:** `src/_includes/catalogue-collection.njk`
- **Purpose:** Renders filtered catalogue views
- **Features:**
  - Sidebar filter navigation
  - Tag-based filtering (GOV.UK Services, Campaign Products, AI, Low-code, Security)
  - Vendor filtering (Amazon, Google, IBM, Microsoft, Oracle, Red Hat)
  - Uses `layout: collection`

### 6. Content Collections (Eleventy)

Defined in `eleventy.config.js`:

#### `catalogue`
- **Source:** `src/catalogue/**/*.md`
- **Count:** ~33 vendor directories, multiple services per vendor
- **Sort:** Alphabetical by title
- **Features:** External URL support via `useExternalUrl()`
- **Tags:** AI, Cloud, Low-code, Security, Vendor names, Service types

#### `catalogueByTag`
- **Purpose:** Grouped catalogue items by tag
- **Structure:** Object with tag keys and item arrays
- **Use Case:** Tag-based filtering and navigation

#### `challenges`
- **Source:** `src/challenges/**/*.md`
- **Sort:** Reverse chronological by date
- **Subdirectories:** defra, mod
- **Purpose:** Department-specific procurement challenges

#### `reviews`
- **Source:** `src/reviews/**/*.md`
- **Sort:** Reverse chronological by date
- **Structure:** Nested by vendor/product (e.g., mindweave-labs/synaplyte)
- **Fields:** starRating, author, date, product

#### `productAssessments`
- **Source:** `src/product-assessments/**/*.md`
- **Sort:** Reverse chronological by date
- **Structure:** Nested by vendor/product

#### `news`
- **Source:** `src/discover/news/**/*.md`
- **Purpose:** Industry news items

#### `event`
- **Source:** `src/discover/events/**/*.md`
- **Purpose:** Industry events

#### `casestudy`
- **Source:** `src/discover/case-studies/**/*.md`
- **Purpose:** Implementation case studies

## Custom Styling

### SASS Architecture
- **Main:** `src/assets/styles.scss`
- **Settings:** `src/sass/_settings.scss`

### Custom Styles
- **Sparkle Animation** - Rainbow hue-rotation effect (15s cycle) for "Begin with AI" navigation
- **Homepage Grid** - Custom icon backgrounds for main sections (discover, access, learn, try, optimise)
- **Review Stars** - Yellow filled stars (#ffdd00), grey empty stars (#b1b4b6)
- **Experimental Header** - Yellow background banner with centered bold text
- **GOV.UK Footer** - Crown logo hidden via CSS

### GOV.UK Overrides
- **Font Family:** system-ui, sans-serif (instead of GDS Transport)
- **Masthead Images:** SVG sizing and margin adjustments

## Design System Compliance

### GOV.UK Design System Integration
- **Base Framework:** govuk-frontend (via @x-govuk/govuk-eleventy-plugin v7.2.1)
- **Rebrand Mode:** Enabled (rebrand: true)
- **Phase Banner:** ALPHA tag in product name
- **Search:** Integrated with `/search.json` index and `/sitemap`
- **Accessibility:** Follows GDS accessibility guidelines
  - ARIA labels for star ratings
  - Visually hidden text for screen readers
  - Semantic HTML structure

### Custom Extensions
- Visual customizations maintain GDS design principles
- Additional interactive elements (sparkle animation)
- Service-specific branding while keeping GDS foundation

## Plugins & Integrations

### Mermaid Diagrams
- **Plugin:** @kevingimbel/eleventy-plugin-mermaid v3.0.0
- **Purpose:** Embed flowcharts and diagrams in markdown content

### Remote Includes
- **Custom Shortcode:** `remoteInclude`
- **Purpose:** Fetch and embed content from GitHub repositories
- **Features:**
  - Converts GitHub URLs to CDN URLs (jsdelivr.net)
  - Supports content extraction between markers
  - Resolves relative image paths to absolute URLs

### Asset Passthrough
- **GOV.UK Assets:** Fonts, images, icons from govuk-frontend
- **Custom Assets:** `src/assets/` directory (logos, catalogue images, icons)

## Content Model

### Product Pages (Catalogue Entries)
**Frontmatter Schema:**
```yaml
layout: product
title: [Service Name]
description: [Service Description]
image:
  src: /assets/catalogue/[vendor]/[logo]
  alt: [Alt Text]
eleventyNavigation:
  parent: Catalogue
  url: [Optional External URL]
tags:
  - [Vendor]
  - [Technology Category]
  - [Service Type]
```

**Content Sections:**
- Provider/Owner/Access badges (shield.io badges)
- CTA buttons (Try/Deploy)
- Service overview
- Key features
- Business needs
- Getting started steps

### Review Pages
**Frontmatter Schema:**
```yaml
product: [vendor/product-id]
author: [Author Name]
starRating: [1-5]
date: [YYYY-MM-DD]
```

## Reusable Patterns

### Star Rating Display
- Visual stars with accessible text
- Color-coded tags based on rating
- Summary list integration

### Service Cards
- Consistent product page layout
- Badge system for metadata
- Dual CTA pattern (Try/Deploy)

### Collection Filtering
- Tag-based navigation
- Sidebar filter menus
- Vendor grouping

## Component Dependencies

### External Dependencies
- **govuk-frontend** - Core component library
- **@x-govuk/govuk-eleventy-plugin** - Eleventy integration
- **Nunjucks** - Templating engine

### Internal Dependencies
- Components extend base GOV.UK templates
- Macros provide reusable utility functions
- Collections feed dynamic content into components

## Accessibility Features

- **ARIA Labels:** Star ratings, navigation landmarks
- **Visually Hidden Text:** Screen reader content
- **Semantic HTML:** Proper heading hierarchy, landmarks
- **Keyboard Navigation:** GOV.UK component keyboard support
- **Color Contrast:** Meets WCAG 2.1 AA standards (GOV.UK palette)

## Performance Considerations

- **Static Generation:** All pages pre-rendered at build time
- **Asset Optimization:** Passthrough copy for efficient asset delivery
- **Minimal JavaScript:** Primarily server-rendered HTML
- **CDN-Ready:** Static files deployable to GitHub Pages/CDN

---

**Total Components:** 11 Nunjucks templates + 8 Eleventy collections + Full GOV.UK Design System
**Content Files:** ~165 markdown files across all sections
**Catalogue Entries:** ~33 vendors with multiple products
