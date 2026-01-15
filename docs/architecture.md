# NDX Architecture Documentation

> **Generated:** 2026-01-12 | **Scan Level:** Exhaustive | **Version:** 1.2.0

## Overview

NDX (National Digital Exchange) is a **multi-part repository** containing a JAMstack web frontend and serverless AWS infrastructure. It serves as the frontend hub for a government cloud platform, featuring a product catalogue and "Try Before You Buy" sandbox provisioning.

| Property | Value |
|----------|-------|
| **Repository Type** | Multi-part (web + infra) |
| **Architecture Pattern** | JAMstack + Serverless Event-Driven |
| **Primary Domain** | `ndx.digital.cabinet-office.gov.uk` |
| **AWS Account** | 568672915267 |
| **AWS Region** | us-west-2 |

## Part 1: web (Static Site)

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Eleventy | 3.1.2 |
| Design System | @x-govuk/govuk-eleventy-plugin | 8.3.0 |
| Language | TypeScript | 5.7.2 |
| Bundler | esbuild | 0.27.2 |
| Unit Testing | Jest | 30.2.0 |
| E2E Testing | Playwright | 1.57.0 |
| Package Manager | Yarn | 4.5.0 |

### Directory Structure

```
src/
├── try/                    # Try Before You Buy feature (49 TS files)
│   ├── api/                # API service layer (api-client, leases, sessions)
│   ├── auth/               # Authentication (auth-provider, oauth-flow)
│   ├── ui/                 # UI components (try-button, try-page, modals)
│   └── utils/              # Utilities (jwt, storage, fetch)
├── _includes/              # Nunjucks templates
├── catalogue/              # Product catalogue (47 products)
├── assets/                 # Static assets
└── [content dirs]/         # About, access, begin, challenges, etc.

lib/                        # Eleventy plugins
├── eleventy-mermaid-transform.js
└── eleventy-remote-images.js
```

### Key Entry Points

| File | Purpose |
|------|---------|
| `eleventy.config.js` | Site configuration |
| `src/try/main.ts` | Client-side JS entry |

### State Management (ADR-024)

The Try feature uses an Observer pattern for authentication state:

```typescript
// Singleton AuthState with reactive subscriptions
authState.subscribe((isAuthenticated) => { ... });
authState.login(token);
authState.logout();
```

- **Storage:** sessionStorage (clears on browser close)
- **Token Key:** `isb-jwt`
- **Expiry Check:** Client-side with 60s buffer

### API Client (ADR-021)

Centralized API client with automatic JWT injection:

```typescript
const response = await callISBAPI('/api/leases', {
  method: 'POST',
  body: JSON.stringify(payload)
});
```

- Automatic Bearer token injection
- 401 → OAuth redirect
- Request deduplication (ADR-028)
- Timeout protection (5s auth, 10s default)

## Part 2: infra (AWS CDK)

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| IaC Framework | AWS CDK | 2.215.0 |
| Language | TypeScript | 5.9.3 |
| Lambda Runtime | Node.js | 20.x |
| Testing | Jest | 29.7.0 |
| Linting | ESLint + eslint-plugin-awscdk | 9.39.1 |

### CDK Stacks

| Stack | Purpose | Resources |
|-------|---------|-----------|
| **NdxStaticStack** | Static hosting | S3, CloudFront, Cookie Router |
| **NdxNotificationStack** | Event processing | Lambda, EventBridge, SQS, SNS, CloudWatch |
| **GitHubActionsStack** | CI/CD | OIDC roles for GitHub Actions |

### Directory Structure

```
infra/
├── bin/infra.ts                    # CDK entry point
├── lib/
│   ├── config.ts                   # Environment + ISB configuration
│   ├── ndx-stack.ts                # NdxStaticStack
│   ├── notification-stack.ts       # NdxNotificationStack (812 lines)
│   ├── github-actions-stack.ts     # GitHubActionsStack
│   └── lambda/notification/        # Lambda handlers (36 files)
│       ├── handler.ts              # Main event processor
│       ├── notify-sender.ts        # GOV.UK Notify integration
│       ├── slack-sender.ts         # Slack webhook integration
│       ├── enrichment.ts           # DynamoDB data enrichment
│       └── [supporting modules]
└── test/                           # CDK + Lambda tests
```

### AWS Services

| Service | Purpose |
|---------|---------|
| **Lambda** | Notification handler, DLQ digest |
| **EventBridge** | ISB event subscription |
| **SQS** | Dead Letter Queue (14-day retention) |
| **DynamoDB** | Cross-account data enrichment |
| **Secrets Manager** | API keys (Notify, Slack) |
| **SNS** | Alarm notifications |
| **CloudWatch** | 12 alarms + health dashboard |
| **S3** | Static site hosting |
| **CloudFront** | CDN with custom domain |

### Notification Architecture

**Pattern:** "One brain, two mouths"

```
EventBridge (ISB) → Lambda Handler → GOV.UK Notify (user emails)
                                  → Slack Webhook (ops alerts)
```

**Event Types (13):**
- Lease lifecycle: LeaseRequested, LeaseApproved, LeaseDenied, LeaseTerminated, LeaseFrozen
- Monitoring: BudgetThreshold, DurationThreshold, FreezingThreshold, BudgetExceeded, LeaseExpired
- Ops: AccountQuarantined, AccountCleanupFailed, AccountDriftDetected

### CloudWatch Alarms (12)

| Alarm | Threshold | Purpose |
|-------|-----------|---------|
| DLQ Depth | >0 | Current failures |
| Lambda Errors | >5/5min | Code bugs |
| Canary | 0/24h | Silent death detection |
| DLQ Rate | >50/5min | Flooding attack |
| Auth Failure | >0 | Credential issues |
| Error Rate | >10% | Quality degradation |
| DLQ Stale | >24h | Stuck messages |
| Secrets Expiry | >335 days | Rotation warning |
| Complaint Rate | >0.1% | Email complaints |
| Bounce Rate | >1% | Invalid emails |
| Unsubscribe Rate | >5% | Content issues |
| Slack Failure | >0 | Webhook issues |

## Integration Architecture

### Internal (web ↔ infra)

| From | To | Method | Purpose |
|------|-----|--------|---------|
| web build | S3 | GitHub Actions | Deploy static files |
| web browser | ISB API | HTTPS/JWT | Lease management |

### External (NDX ↔ Ecosystem)

```
┌─────────────────────────────────────────────────────────────────┐
│                     NDX Ecosystem                               │
├─────────────────────────────────────────────────────────────────┤
│  Browser → ISB API → AWS IAM Identity Center                    │
│              ↓                                                  │
│         EventBridge → NDX Lambda → GOV.UK Notify               │
│              ↓                       → Slack                    │
│         DynamoDB (enrichment)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Related Repositories

| Repository | Purpose | Integration |
|------------|---------|-------------|
| ndx_try | React frontend for Try | Alternative UI |
| ndx_try_aws_scenarios | AWS scenario templates | CFN/CDK |
| innovation-sandbox-on-aws | Core ISB solution | API + EventBridge |
| innovation-sandbox-on-aws-approver | Lease approval | EventBridge |
| innovation-sandbox-on-aws-deployer | Stack deployment | Cross-account |
| cmm | Cloud Maturity Model | Linked from NDX |
| govuk-eleventy-plugin | GOV.UK design plugin | Fork |

### Authentication Flow

1. User clicks "Sign in" on NDX
2. Redirect to ISB OAuth endpoint
3. ISB redirects to AWS IAM Identity Center
4. User authenticates with gov.uk email
5. Redirect back to NDX with JWT token
6. JWT stored in sessionStorage
7. API calls include Bearer token
8. Token validated server-side on each request

## CI/CD Architecture

### Pipelines

| Pipeline | Trigger | Steps |
|----------|---------|-------|
| **ci.yaml** | push/PR to main | build → test → deploy-s3 |
| **infra.yaml** | push/PR to main | unit-tests → cdk-diff/deploy |

### GitHub Actions OIDC Roles

| Role | Purpose | Permissions |
|------|---------|-------------|
| ContentDeploy | S3 sync | s3:*, cloudfront:CreateInvalidation |
| InfraDiff | CDK diff (PRs) | ReadOnly |
| InfraDeploy | CDK deploy (main) | Full CDK |

### Deployment Flow

```
PR → build + test → cdk-diff (comment on PR)
                         ↓
Merge to main → build + test → deploy-s3 + cdk-deploy
                                    ↓
                            CloudFront invalidation
```

## Security Architecture

### Authentication
- JWT tokens in sessionStorage (not localStorage)
- 60-second expiry buffer for clock skew
- Automatic 401 → OAuth redirect

### Lambda Security
- Source validation (allowed sources list)
- Reserved concurrency (10) for blast radius
- PII redaction in logs
- Log injection prevention
- Non-.gov.uk email domain detection

### CI/CD Security
- OIDC authentication (no long-lived credentials)
- Fork PRs blocked from AWS access
- Step Security harden-runner on all jobs
- Dependabot for dependency updates
- OpenSSF Scorecard monitoring

### Secrets Management
- GOV.UK Notify API key in Secrets Manager
- Slack webhook URL in Secrets Manager
- 335-day expiry alarm for rotation

## Development Guide

### Prerequisites
- Node.js 20.17.0+ (use `.nvmrc`)
- Yarn 4.5.0+ (npm blocked)
- AWS CLI configured

### Quick Start (web)
```bash
yarn install
yarn start          # Dev server at localhost:8080
yarn test           # Unit tests
yarn test:e2e       # E2E tests
```

### Quick Start (infra)
```bash
cd infra
yarn install
yarn test           # Unit tests
yarn cdk synth      # Synthesize stacks
yarn cdk deploy     # Deploy (requires AWS credentials)
```

### Key Scripts

| Part | Script | Purpose |
|------|--------|---------|
| web | `yarn start` | Dev server |
| web | `yarn build` | Production build |
| web | `yarn build:try-js` | Bundle Try feature |
| web | `yarn test:e2e:accessibility` | A11y tests |
| infra | `yarn test` | Unit tests |
| infra | `yarn cdk diff` | Preview changes |
| infra | `yarn pre-deploy` | Validation |

---

*Documentation generated by document-project workflow v1.2.0*
