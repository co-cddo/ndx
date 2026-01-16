# Development Guide - National Digital Exchange

> **Generated:** 2026-01-12 | **Scan Level:** Exhaustive | **Version:** 1.2.0

**Project:** NDX (National Digital Exchange)
**Repository:** https://github.com/co-cddo/ndx
**Type:** Multi-part (web + infra)

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.17.0 | Runtime environment |
| **Yarn** | ≥ 4.5.0 | Package manager (required, npm blocked) |
| **Git** | Latest | Version control |
| **nvm** | Latest (recommended) | Node version management |
| **AWS CLI** | v2 | Infrastructure deployment |

### Version Management

The project uses **nvm** for Node.js version management:

```bash
# .nvmrc specifies Node 20.17.0
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
  }
}
```

**Attempting to use npm will fail with error: "please-use-yarn"**

## Repository Structure

NDX is a **multi-part repository** containing:

| Part | Location | Purpose |
|------|----------|---------|
| **web** | Root (`/`) | Eleventy static site + Try feature |
| **infra** | `/infra` | AWS CDK infrastructure |

```
ndx/
├── src/                    # Web source (Eleventy + Try feature)
│   ├── try/                # Try Before You Buy feature (TypeScript)
│   ├── _includes/          # Nunjucks templates
│   ├── catalogue/          # Product catalogue (47 products)
│   └── [content dirs]/     # About, access, begin, etc.
├── lib/                    # Eleventy plugins
├── tests/                  # E2E tests (Playwright)
├── infra/                  # AWS CDK infrastructure
│   ├── bin/                # CDK app entry point
│   ├── lib/                # CDK stacks + Lambda handlers
│   └── test/               # CDK + Lambda tests
└── docs/                   # Documentation
```

## Part 1: Web Development

### Getting Started

```bash
# Clone and setup
git clone https://github.com/co-cddo/ndx.git
cd ndx

# Enable corepack for Yarn
corepack enable

# Install dependencies
yarn install
```

### Development Server

```bash
# Start Eleventy dev server with live reload
yarn start
```

This starts the server at `http://localhost:8080` with:
- Live reload on file changes
- BrowserSync integration
- Fast incremental builds

### Build Commands

| Command | Purpose |
|---------|---------|
| `yarn start` | Dev server at localhost:8080 |
| `yarn build` | Production build to `_site/` |
| `yarn build:try-js` | Bundle Try feature TypeScript |
| `yarn lint` | Check code formatting |
| `yarn test` | Run Jest unit tests |
| `yarn test:e2e` | Run Playwright E2E tests |
| `yarn test:e2e:accessibility` | Run WCAG accessibility tests |

### Try Feature Development

The Try Before You Buy feature is a TypeScript SPA bundled with esbuild.

#### Source Structure

```
src/try/
├── main.ts                 # Entry point
├── config.ts               # Runtime configuration
├── constants.ts            # Shared constants
├── api/                    # API service layer
│   ├── api-client.ts       # Central API client with JWT auth
│   ├── leases-service.ts   # Lease management
│   ├── sessions-service.ts # Session management
│   └── *.test.ts           # Unit tests
├── auth/                   # Authentication
│   ├── auth-provider.ts    # Observer pattern state
│   └── oauth-flow.ts       # OAuth callback handling
├── ui/                     # UI components
│   ├── try-button.ts       # Product "Try" button
│   ├── try-page.ts         # /try page controller
│   └── components/         # Modal, table components
└── utils/                  # Shared utilities
    ├── jwt-utils.ts        # JWT parsing/validation
    ├── storage.ts          # sessionStorage wrapper
    └── request-dedup.ts    # Request deduplication
```

#### Development Workflow

```bash
# Build Try feature TypeScript
yarn build:try-js

# Watch mode for development
yarn build:try-js --watch

# Run Try feature unit tests
yarn test src/try

# Run tests in watch mode
yarn test --watch
```

#### Key Patterns

**State Management (ADR-024):**
```typescript
// Observer pattern singleton
authState.subscribe((isAuthenticated) => { ... });
authState.login(token);
authState.logout();
```

**API Client (ADR-021):**
```typescript
// Automatic JWT injection, 401 handling
const response = await callISBAPI('/api/leases', {
  method: 'POST',
  body: JSON.stringify(payload)
});
```

### Testing

#### Unit Tests (Jest)

```bash
# Run all unit tests
yarn test

# Run specific test file
yarn test src/try/api/api-client.test.ts

# Run with coverage
yarn test --coverage

# Watch mode
yarn test --watch
```

#### E2E Tests (Playwright)

```bash
# Install browsers (first time)
npx playwright install

# Run all E2E tests
yarn test:e2e

# Run accessibility tests
yarn test:e2e:accessibility

# Run specific test file
yarn test:e2e tests/e2e/smoke/homepage.spec.ts

# Run with UI
yarn test:e2e --ui
```

### Adding Content

#### New Catalogue Entry

1. Create vendor directory:
   ```bash
   mkdir -p src/catalogue/vendor-name
   ```

2. Create service markdown file with frontmatter:
   ```yaml
   ---
   layout: product
   title: Service Name
   description: Brief description
   image:
     src: /assets/catalogue/vendor-name/logo.svg
     alt: Service Name Logo
   tags:
     - Vendor Name
     - cloud
   ---
   ```

3. Add logo to `src/assets/catalogue/vendor-name/`

#### Try-enabled Product

Add `try_id` to frontmatter:
```yaml
---
layout: product-try
title: AWS S3
try_id: aws-s3-sandbox
---
```

## Part 2: Infrastructure Development

### Getting Started

```bash
cd infra

# Install dependencies
yarn install

# Verify CDK version
yarn cdk --version
# Expected: 2.215.0
```

### CDK Stacks

| Stack | Purpose |
|-------|---------|
| **NdxStaticStack** | S3, CloudFront, Cookie Router |
| **NdxNotificationStack** | Lambda, EventBridge, SQS, SNS, CloudWatch |
| **GitHubActionsStack** | OIDC roles for CI/CD |

### Development Commands

| Command | Purpose |
|---------|---------|
| `yarn test` | Run all unit tests |
| `yarn cdk synth` | Synthesize CloudFormation |
| `yarn cdk diff` | Preview changes |
| `yarn cdk deploy` | Deploy stacks |
| `yarn pre-deploy` | Validation script |

### Lambda Development

Lambda handlers are in `infra/lib/lambda/notification/`:

```
lambda/notification/
├── handler.ts              # Main event processor
├── dlq-digest-handler.ts   # Scheduled DLQ summary
├── notify-sender.ts        # GOV.UK Notify integration
├── slack-sender.ts         # Slack webhook integration
├── enrichment.ts           # DynamoDB data enrichment
├── validation.ts           # Zod schema validation
├── idempotency.ts          # Duplicate prevention
└── *.test.ts               # Unit tests
```

#### Running Lambda Tests

```bash
cd infra

# Run all Lambda tests
yarn test

# Run specific test
yarn test lib/lambda/notification/handler.test.ts

# Run with coverage
yarn test --coverage
```

### CDK Testing

```bash
cd infra

# Unit tests (stack synthesis)
yarn test test/infra.test.ts

# Snapshot tests
yarn test test/notification-stack.test.ts

# Update snapshots after intentional changes
yarn test -u
```

### Deployment

#### Prerequisites

- AWS CLI configured with appropriate credentials
- AWS account: 568672915267
- Region: us-west-2

#### Deploy Steps

```bash
cd infra

# 1. Run pre-deploy validation
yarn pre-deploy

# 2. Preview changes
yarn cdk diff

# 3. Deploy (requires approval for security changes)
yarn cdk deploy --all
```

#### GitHub Actions Deployment

Infrastructure deploys automatically via `.github/workflows/infra.yaml`:

- **PRs:** `cdk diff` runs and comments on PR
- **Main branch:** `cdk deploy` runs automatically

## CI/CD Pipelines

### Web Pipeline (ci.yaml)

**Trigger:** Push/PR to `main`

| Job | Steps |
|-----|-------|
| **build** | Install → Lint → Test → Build → Upload artifact |
| **publish** | Deploy to S3 → CloudFront invalidation |

### Infrastructure Pipeline (infra.yaml)

**Trigger:** Push/PR to `main` (changes in `infra/`)

| Job | Steps |
|-----|-------|
| **unit-tests** | Install → Test |
| **cdk-diff** | Synth → Diff → Comment on PR |
| **cdk-deploy** | Deploy (main branch only) |

### GitHub Actions OIDC Roles

| Role | Purpose | Permissions |
|------|---------|-------------|
| ContentDeploy | S3 sync | s3:*, cloudfront:CreateInvalidation |
| InfraDiff | CDK diff (PRs) | ReadOnly |
| InfraDeploy | CDK deploy (main) | Full CDK |

## Code Quality

### Linting

```bash
# Web part
yarn lint

# Infra part
cd infra && yarn lint
```

### Prettier Configuration

```json
{
  "singleQuote": false,
  "printWidth": 120,
  "trailingComma": "all",
  "semi": false
}
```

### Git Hooks (Husky)

Pre-commit hook runs:
- Prettier formatting check on staged files
- Auto-fix if possible
- Commit blocked if formatting fails

## Environment Variables

### Web

| Variable | Purpose | Default |
|----------|---------|---------|
| `PATH_PREFIX` | URL path prefix | `/` |
| `ISB_API_URL` | ISB API endpoint | Production URL |

### Infra

| Variable | Purpose |
|----------|---------|
| `CDK_DEFAULT_ACCOUNT` | AWS account ID |
| `CDK_DEFAULT_REGION` | AWS region |

## Troubleshooting

### Yarn Version Mismatch

```bash
corepack enable
corepack prepare yarn@4.5.0 --activate
```

### Node Version Mismatch

```bash
nvm use
```

### Port Already in Use

```bash
lsof -ti:8080 | xargs kill
```

### CDK Bootstrap Required

```bash
cd infra
yarn cdk bootstrap aws://568672915267/us-west-2
```

### Lambda Test Failures

```bash
# Clear Jest cache
cd infra
yarn test --clearCache
```

## Security

### Pre-Commit Security

- **Harden Runner** - step-security/harden-runner
- **CodeQL** - Automated security scanning
- **OpenSSF Scorecard** - Security best practices

### Dependency Security

- **Dependabot** - Automated dependency updates
- Auto-merge for minor/patch versions

### Lambda Security

- Source validation (allowed sources list)
- Reserved concurrency (10) for blast radius
- PII redaction in logs
- Non-.gov.uk email domain detection

## Support & Contact

- **Email:** ndx@dsit.gov.uk
- **Issues:** https://github.com/co-cddo/ndx/issues

---

*Generated by document-project workflow v1.2.0*
