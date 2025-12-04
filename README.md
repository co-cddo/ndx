# National Digital Exchange (NDX) Website

[![CI](https://github.com/co-cddo/ndx/actions/workflows/ci.yaml/badge.svg)](https://github.com/co-cddo/ndx/actions/workflows/ci.yaml) [![CodeQL](https://github.com/co-cddo/ndx/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/co-cddo/ndx/actions/workflows/github-code-scanning/codeql) ![GitHub License](https://img.shields.io/github/license/co-cddo/ndx) ![GitHub deployments](https://img.shields.io/github/deployments/co-cddo/ndx/github-pages) ![GitHub language count](https://img.shields.io/github/languages/count/co-cddo/ndx) ![GitHub top language](https://img.shields.io/github/languages/top/co-cddo/ndx) [![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/co-cddo/ndx/badge)](https://scorecard.dev/viewer/?uri=github.com/co-cddo/ndx) [![OpenSSF Best Practices](https://www.bestpractices.dev/projects/9498/badge)](https://www.bestpractices.dev/projects/9498)

> ⚠️ The project is currently in an alpha phase, contributions are very welcome.

## Overview

This repository contains the source code for the National Digital Exchange (NDX) website. The NDX website serves as an informational platform to describe the National Digital Exchange initiative, its goals, and provide updates to stakeholders and the public.

## Technology Stack

- Static Site Generator: [Eleventy (11ty)](https://www.11ty.dev/)
- CSS Framework: [GOV.UK Frontend](https://frontend.design-system.service.gov.uk/)
- Package Manager: Yarn

## Local Development

To run this website locally:

1. Clone the repository
2. Install dependencies:
   ```
   yarn install
   ```
3. Run the development server:
   ```
   yarn start
   ```

## Project Structure

- `src/`: Source files for the website
- `_site/`: Output directory for the built site (generated)
- `.eleventy.js`: Eleventy configuration file
- `package.json`: Project dependencies and scripts
- `tests/`: E2E tests (Playwright)

## Key Features

- Discover section for news, events, and case studies
- Catalogue of cloud services
- Access request system for cloud services
- Cloud Maturity Model and Assessment Tool

## Contributing

We welcome contributions to improve the NDX website. Please read our [Contributing Guidelines](CODE_OF_CONDUCT.md) for more details.

## Running Tests

### Unit Tests (Jest)

```bash
# Run all unit tests
yarn test

# Run tests in watch mode
yarn test:watch
```

### End-to-End Tests (Playwright)

**Prerequisites:**

- mitmproxy installed and configured (see Epic 4 documentation)
- Local app server running
- Playwright browsers installed: `npx playwright install`

**Execution:**

```bash
# Terminal 1: Start mitmproxy
yarn dev:proxy

# Terminal 2: Start local server
yarn start

# Terminal 3: Run E2E tests
yarn test:e2e

# Run specific test suites
yarn test:e2e:auth          # Authentication tests
yarn test:e2e:accessibility # Accessibility tests

# Debug mode (headed browser)
yarn test:e2e --headed

# View test report
npx playwright show-report
```

**Troubleshooting:**

- **Tests timeout:** Verify mitmproxy running on port 8081
- **Proxy errors:** Check certificate trust (Epic 4, Story 4.5)
- **Authentication fails:** Verify OAuth mock configuration

**CI Testing:**

Tests run automatically on pull requests via GitHub Actions. View results in PR checks.

## Content Management

Content is managed through Markdown files located in the `src/` directory. The site uses Eleventy's collections to organize and display content.

## Try Before You Buy Configuration

The Try Before You Buy feature connects to Innovation Sandbox for AWS account provisioning.

### Environment Variables

| Variable             | Description                           | Default                                  |
| -------------------- | ------------------------------------- | ---------------------------------------- |
| `AWS_SSO_PORTAL_URL` | AWS SSO portal URL for console access | `https://d-9267e1e371.awsapps.com/start` |
| `API_BASE_URL`       | Innovation Sandbox API base URL       | `/api`                                   |
| `REQUEST_TIMEOUT`    | API request timeout in milliseconds   | `10000`                                  |

### Development

For local development with mitmproxy, default values work out of the box.

### Production

Set environment variables in your deployment configuration:

```bash
# Production SSO portal
export AWS_SSO_PORTAL_URL="https://your-portal.awsapps.com/start"
```

Configuration is centralized in `src/try/config.ts`.

## Deployment

This website is automatically deployed to GitHub Pages when changes are merged to the main branch.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For website-related inquiries, please contact [ndx@digital.cabinet-office.gov.uk](mailto:ndx@digital.cabinet-office.gov.uk).

---

For more information about the National Digital Exchange itself, please visit the [About NDX](/About/Digital-Backbone/NDX.md) section of this website.
