# Gemini Project Memory: National Digital Exchange (NDX) Website

This document provides a comprehensive overview of the NDX website project for Gemini, outlining the project's purpose, technical stack, development practices, and key architectural details.

## 1. Project Overview

- **Project Name**: National Digital Exchange (NDX) Website
- **Purpose**: An informational platform for the NDX initiative, serving as a catalogue of cloud services, challenges, and resources for UK government departments.
- **Current Status**: Alpha phase.
- **Contact**: [ndx@digital.cabinet-office.gov.uk](mailto:ndx@digital.cabinet-office.gov.uk)

## 2. Technical Stack

- **Static Site Generator**: Eleventy (11ty) v3.1.2
- **UI Framework**: GOV.UK Frontend via [@x-govuk/govuk-eleventy-plugin](https://github.com/x-govuk/govuk-eleventy-plugin)
- **Templating**: Nunjucks
- **Package Manager**: Yarn (v4.5.0+ enforced via `engineStrict`)
- **Diagrams**: Mermaid.js via `@kevingimbel/eleventy-plugin-mermaid`
- **Linting/Formatting**: Prettier

## 3. Development Workflow & Commands

- **Installation**: `yarn install`
- **Development Server**: `yarn start` (runs on `http://localhost:8080`)
- **Production Build**: `yarn build` (outputs to `_site/`)
- **Linting**: `yarn lint`
- **Pre-commit Hooks**: Husky is used to enforce linting before commits.

**Key Workflow Steps:**

1.  Run `yarn build` before testing to ensure the site builds correctly.
2.  Use the local server at `http://localhost:8080` for regular checks.
3.  Run `yarn lint` before committing changes.

## 4. Project Structure

- `src/`: All source code and content.
- `_site/`: The generated static site (ignored by Git).
- `src/_includes/`: Nunjucks templates, layouts, and components.
- `src/assets/`: Static assets like CSS/SCSS, images, and icons.
- `eleventy.config.js`: The main configuration file for Eleventy.

## 5. Content & Architecture

### Eleventy Collections

The `eleventy.config.js` file defines several key collections:

- `catalogue`: Cloud services, located in `src/catalogue/`.
- `catalogueByTag`: Catalogue items grouped by their tags.
- `challenges`: Government challenges, located in `src/challenges/`.
- `reviews`: Product reviews from `src/reviews/`.
- `news`, `event`, `casestudy`: Content for the "Discover" section.
- `productAssessments`: From `src/product-assessments/`.

### Content Guidelines

- **Audience**: UK Government and public sector.
- **Tone**: Professional and aligned with the GOV.UK style guide.
- **Credentials**: Emphasize UK-specific standards like **ISO 27001**, **Cyber Essentials Plus**, and **UK GDPR**. Avoid US-centric standards like FedRAMP.
- **Tags**: **CRITICAL**: Tags are case-sensitive. Use **lowercase** tags (e.g., `ai` not `AI`) consistently to prevent build failures.

### Component Overrides

- The project overrides default components from the `govuk-eleventy-plugin`.
- Customizations are placed in `src/_includes/components/`.
- The header component is already customized in `src/_includes/components/header/`.
- To override other components, replicate the plugin's directory structure within `src/_includes/components/`.

## 6. Coding Standards & Best Practices

- **Style**: Follow a functional and declarative programming style. Avoid classes.
- **TDD**: Adhere to a Test-Driven Development approach where possible.
- **Naming**: Use `lowercase-with-dashes` for directory names.
- **Refactoring**: Refactor code frequently. If a change is not successful, revert it before trying a different approach.
- **Security**: Sanitize all user inputs to prevent XSS attacks.

## 7. Deployment

- **Platform**: GitHub Pages.
- **Trigger**: Deployment is automated via GitHub Actions on merges to the `main` branch.
- **Build Info**: The footer of the site includes the Git commit SHA and build timestamp for traceability.
