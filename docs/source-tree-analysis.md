# NDX Source Tree Analysis

> **Generated:** 2026-01-12 | **Scan Level:** Exhaustive | **Version:** 1.2.0

## Repository Overview

**Classification:** Multi-part (web + infra)

```
ndx/                               # Multi-part repository
├── src/                           # Web part source (145 files)
├── infra/                         # Infrastructure part (51+ files)
├── lib/                           # Shared Eleventy plugins (4 files)
├── tests/                         # E2E tests (15 files)
├── docs/                          # Documentation
├── scripts/                       # Utility scripts
├── .github/                       # CI/CD workflows
└── [config files]                 # eleventy.config.js, package.json, etc.
```

## Part 1: web - Detailed Structure

### Source Directory (`src/`)

```
src/
├── try/                           # Try Before You Buy feature (49 TypeScript files)
│   ├── api/                       # API service layer
│   │   ├── api-client.ts          # Central API client with JWT auth (364 lines)
│   │   ├── api-client.test.ts
│   │   ├── leases-service.ts      # Lease management
│   │   ├── leases-service.test.ts
│   │   ├── sessions-service.ts    # Session management
│   │   ├── sessions-service.test.ts
│   │   ├── configurations-service.ts
│   │   ├── configurations-service.test.ts
│   │   ├── lease-templates-service.ts
│   │   └── lease-templates-service.test.ts
│   │
│   ├── auth/                      # Authentication
│   │   ├── auth-provider.ts       # Observer pattern state (249 lines)
│   │   ├── auth-provider.test.ts
│   │   ├── oauth-flow.ts          # OAuth callback handling
│   │   └── oauth-flow.test.ts
│   │
│   ├── ui/                        # UI components
│   │   ├── auth-nav.ts            # Sign in/out navigation
│   │   ├── try-button.ts          # Product "Try" button
│   │   ├── try-button.test.ts
│   │   ├── try-button-text.ts     # Dynamic button text
│   │   ├── try-button-text.test.ts
│   │   ├── try-page.ts            # /try page controller
│   │   ├── try-page.test.ts
│   │   ├── components/
│   │   │   ├── aup-modal.ts       # Acceptable Use Policy modal
│   │   │   ├── aup-modal.test.ts
│   │   │   ├── sessions-table.ts  # Active sessions table
│   │   │   └── sessions-table.test.ts
│   │   ├── styles/
│   │   │   └── [SCSS files]
│   │   └── utils/
│   │       ├── aria-live.ts       # A11y announcements
│   │       ├── aria-live.test.ts
│   │       ├── focus-trap.ts      # Modal focus management
│   │       └── focus-trap.test.ts
│   │
│   ├── utils/                     # Shared utilities
│   │   ├── jwt-utils.ts           # JWT parsing/validation
│   │   ├── jwt-utils.test.ts
│   │   ├── storage.ts             # sessionStorage wrapper
│   │   ├── storage.test.ts
│   │   ├── fetch-with-timeout.ts  # Timeout wrapper
│   │   ├── fetch-with-timeout.test.ts
│   │   ├── currency-utils.ts
│   │   ├── date-utils.ts
│   │   ├── error-utils.ts
│   │   ├── request-dedup.ts       # Request deduplication (ADR-028)
│   │   └── url-validator.ts
│   │
│   ├── config.ts                  # Runtime configuration
│   ├── config.test.ts
│   ├── constants.ts               # Shared constants
│   └── main.ts                    # Entry point (bundled by esbuild)
│
├── _includes/                     # Nunjucks templates
│   ├── layouts/
│   │   ├── page.njk               # Base page layout
│   │   ├── try-page.njk           # Try feature layout
│   │   └── product-try.njk        # Product with Try button
│   ├── components/
│   │   ├── document-list/
│   │   │   ├── macro.njk
│   │   │   └── template.njk
│   │   ├── header/
│   │   │   └── template.njk
│   │   ├── product-assessments.njk
│   │   └── reviews.njk
│   ├── govuk/                     # GOV.UK overrides
│   └── macros/                    # Nunjucks macros
│
├── catalogue/                     # Product catalogue (47 products)
│   ├── aws/                       # AWS products
│   ├── microsoft/                 # Microsoft products
│   ├── anthropic/                 # AI products
│   ├── gitlab/                    # DevOps products
│   ├── google/                    # Google products
│   ├── salesforce/                # Salesforce products
│   ├── snowflake/                 # Data products
│   ├── tags/                      # Tag index pages
│   └── [other vendors]/
│
├── assets/                        # Static assets
│   ├── catalogue/                 # Product logos by vendor
│   ├── icons/                     # Custom SVG icons
│   └── try.bundle.js              # Built Try feature JS
│
├── sass/                          # SCSS stylesheets
│
├── About/                         # About pages
├── access/                        # Access request pages
├── begin/                         # Begin with AI section
├── challenges/                    # Government challenges (defra/, mod/)
├── optimise/                      # Optimization section
├── reviews/                       # Product reviews
├── product-assessments/           # Assessment reports
│
└── [content pages]                # Markdown content pages (index.md, 404.md, etc.)
```

### Library Directory (`lib/`)

```
lib/
├── eleventy-mermaid-transform.js      # Mermaid diagram rendering
├── eleventy-mermaid-transform.test.js
├── eleventy-remote-images.js          # Build-time remote image fetching
└── eleventy-remote-images.test.js
```

### Test Directory (`tests/`)

```
tests/
└── e2e/                           # Playwright E2E tests (15 files)
    ├── accessibility/             # WCAG compliance tests
    ├── auth/                      # OAuth flow tests
    ├── catalogue/                 # Catalogue tests
    ├── smoke/                     # Basic smoke tests
    └── try/                       # Try feature tests
```

## Part 2: infra - Detailed Structure

```
infra/
├── bin/
│   └── infra.ts                   # CDK app entry point (defines 3 stacks)
│
├── lib/
│   ├── config.ts                  # Environment + ISB configuration (228 lines)
│   ├── ndx-stack.ts               # NdxStaticStack (S3, CloudFront)
│   ├── notification-stack.ts      # NdxNotificationStack (812 lines)
│   ├── github-actions-stack.ts    # GitHubActionsStack (OIDC roles)
│   │
│   ├── lambda/
│   │   └── notification/          # Lambda handlers (36 files)
│   │       ├── handler.ts         # Main event processor (563 lines)
│   │       ├── handler.test.ts
│   │       ├── notify-sender.ts   # GOV.UK Notify integration
│   │       ├── notify-sender.test.ts
│   │       ├── slack-sender.ts    # Slack webhook integration
│   │       ├── slack-sender.test.ts
│   │       ├── slack-alerts.ts    # Slack alert formatting
│   │       ├── slack-templates.ts # Block Kit templates
│   │       ├── templates.ts       # Email template config
│   │       ├── enrichment.ts      # DynamoDB data enrichment
│   │       ├── validation.ts      # Zod event validation
│   │       ├── idempotency.ts     # Duplicate prevention
│   │       ├── flatten.ts         # Object flattening
│   │       ├── lease-status.ts    # Lease status validation
│   │       ├── template-validation.ts # Template drift detection
│   │       ├── dlq-digest-handler.ts  # Scheduled DLQ digest
│   │       ├── errors.ts          # Custom error types
│   │       └── types.ts           # TypeScript interfaces
│   │
│   └── functions/                 # Shared Lambda utilities
│       ├── index.ts
│       └── package.json           # Lambda-specific dependencies
│
├── test/                          # CDK tests (8 files)
│   ├── infra.test.ts              # Stack synthesis tests
│   ├── ndx-stack.test.ts
│   ├── notification-stack.test.ts
│   ├── github-actions-stack.test.ts
│   ├── __snapshots__/             # CDK snapshot tests
│   ├── e2e/                       # Live E2E tests (GOV.UK Notify)
│   │   └── notify.e2e.test.ts
│   └── smoke/                     # Post-deploy smoke tests
│       └── lambda-health.smoke.test.ts
│
├── docs/
│   ├── e2e-testing.md             # E2E test setup guide
│   └── template-management.md     # Notify template management
│
├── scripts/
│   └── pre-deploy-check.sh        # Pre-deployment validation
│
├── cdk.json                       # CDK configuration
├── tsconfig.json                  # TypeScript config
├── jest.config.js                 # Jest config
├── eslint.config.mjs              # ESLint config
└── package.json                   # Infra dependencies
```

## Configuration Files (Root)

```
ndx/
├── .nvmrc                         # Node.js version (20.17.0)
├── .yarnrc.yml                    # Yarn configuration
├── package.json                   # Web dependencies
├── tsconfig.json                  # TypeScript config
├── eleventy.config.js             # Eleventy configuration (327 lines)
├── playwright.config.ts           # Playwright config
├── jest.config.js                 # Jest config
├── .prettierrc                    # Prettier config
├── .husky/                        # Git hooks
│   └── pre-commit
└── LICENSE                        # MIT License
```

## GitHub Configuration

```
.github/
├── workflows/
│   ├── ci.yaml                    # Build, test, deploy frontend
│   ├── infra.yaml                 # CDK diff/deploy
│   ├── accessibility.yml          # WCAG compliance
│   ├── test.yml                   # Test automation
│   └── scorecard.yml              # OpenSSF security
├── dependabot.yml                 # Dependency updates
└── semver.yaml                    # Semantic versioning config
```

## File Statistics

| Part | File Type | Count |
|------|-----------|-------|
| web | TypeScript (src/try/) | 49 |
| web | Products (catalogue/) | 47 |
| web | E2E tests (tests/e2e/) | 15 |
| web | Eleventy plugins (lib/) | 4 |
| infra | TypeScript (lib/) | 43 |
| infra | Lambda files | 36 |
| infra | Tests | 8 |

## Critical Files by Line Count

| File | Lines | Purpose |
|------|-------|---------|
| `infra/lib/notification-stack.ts` | 812 | Main CDK stack |
| `infra/lib/lambda/notification/handler.ts` | 563 | Event processor |
| `eleventy.config.js` | 327 | Site configuration |
| `src/try/api/api-client.ts` | 364 | API client |
| `src/try/auth/auth-provider.ts` | 249 | Auth state |
| `infra/lib/config.ts` | 228 | Environment config |

## Entry Points

| Part | Entry Point | Purpose |
|------|-------------|---------|
| web | `eleventy.config.js` | Eleventy configuration |
| web | `src/try/main.ts` | Client-side JS entry |
| infra | `infra/bin/infra.ts` | CDK app definition |
| infra | `infra/lib/lambda/notification/handler.ts` | Lambda entry |

## Integration Points

### Internal (web ↔ infra)
- Build artifacts from web deployed to S3 by infra stack
- GitHub Actions OIDC roles created by infra stack used by CI/CD

### External (NDX ↔ Ecosystem)
- ISB API integration via src/try/api/
- EventBridge subscription to ISB events
- Cross-account DynamoDB reads for enrichment
- GOV.UK Notify and Slack integrations

---

*Generated by document-project workflow v1.2.0*
