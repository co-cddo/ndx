# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the National Digital Exchange (NDX) website, a static site built with Eleventy (11ty) and GOV.UK Frontend. The site serves as an informational platform for the NDX initiative, providing a catalogue of cloud services, challenges, access requests, and resources for UK government departments.

## Development Commands

### Core Development

- `yarn start` - Start development server (removes \_site directory and runs with live reload)
- `yarn build` - Build the static site to \_site directory
- `yarn lint` - Run Prettier to check code formatting
- `yarn install` - Install dependencies (uses Yarn 4.5.0+)

### Package Management

- Uses Yarn as the package manager (not npm)
- Enforces Yarn 4.5.0+ via engineStrict
- Package manager version: `yarn@4.5.0`

## Architecture

### Static Site Generator

- Built with Eleventy (11ty) v3.1.2
- Uses GOV.UK Eleventy plugin for government styling and components
- Nunjucks templating engine for HTML, data, and Markdown processing
- Mermaid plugin for diagram support

### Content Structure

- **Source**: `src/` directory contains all source content
- **Output**: `_site/` directory (auto-generated, excluded from git)
- **Templates**: `src/_includes/` contains Nunjucks templates and components
- **Assets**: `src/assets/` for static assets (images, SCSS, icons)

### Key Collections (eleventy.config.js)

- `catalogue` - Cloud services catalogue entries
- `catalogueByTag` - Catalogue items grouped by tags
- `challenges` - Government challenges needing solutions
- `reviews` - Product reviews and assessments
- `news` - News articles
- `event` - Events and conferences
- `casestudy` - Case studies
- `productAssessments` - Product assessment reports

### Content Organization

- **Catalogue**: `src/catalogue/` - Cloud services organized by vendor
- **Challenges**: `src/challenges/` - Government challenges by department
- **Discover**: `src/discover/` - News, events, case studies
- **Access**: `src/access/` - Service access information
- **Reviews**: `src/reviews/` - Product reviews and assessments

## Important Development Notes

### GOV.UK Standards

- Uses GOV.UK Frontend design system
- Follows UK government digital service manual
- Content styled per UK government content style guide
- Alpha phase branding with phase banner

### Component Overrides

- Custom GOV.UK components can be overridden in `src/_includes/components/`
- Header component already customized in `src/_includes/components/header/`
- Follow same directory structure as plugin to override

### Tag Consistency

- **CRITICAL**: Tags are case-sensitive - use consistent capitalization
- Use lowercase tags (e.g., 'ai' not 'AI') to prevent build errors
- Tag case conflicts cause Eleventy build failures

### Development Workflow

1. Always run `yarn build` before testing to ensure site builds correctly
2. Test server runs on port 8080 - use for regular work verification
3. Use `yarn lint` to check code formatting before commits
4. Follow Test Driven Development approach where applicable

### Content Guidelines

- UK-focused security credentials (ISO 27001, Cyber Essentials Plus, UK GDPR)
- Focus on UK public sector business needs and GOV.UK standards
- Include quantified business benefits and cross-department use cases
- Maintain professional tone appropriate for government audience
