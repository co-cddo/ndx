# NDX Component Inventory

> **Generated:** 2026-01-12 | **Scan Level:** Exhaustive | **Version:** 1.2.0

## Overview

NDX uses a component-based architecture with:
- **Web Part:** GOV.UK Frontend + custom TypeScript components (Try feature)
- **Infra Part:** AWS CDK constructs + Lambda handlers

## Part 1: web - UI Components

### Try Feature Components (`src/try/ui/`)

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| **AuthNav** | `auth-nav.ts` | Sign in/out navigation | ~80 |
| **TryButton** | `try-button.ts` | Product "Try" button with delegated click handling | ~150 |
| **TryButtonText** | `try-button-text.ts` | Dynamic button text based on auth + template | ~100 |
| **TryPage** | `try-page.ts` | /try page controller (empty state for unauth) | ~120 |
| **AUPModal** | `components/aup-modal.ts` | Acceptable Use Policy modal with focus trap | ~200 |
| **SessionsTable** | `components/sessions-table.ts` | Active sessions table with status | ~180 |
| **AriaLive** | `utils/aria-live.ts` | A11y live region announcements | ~50 |
| **FocusTrap** | `utils/focus-trap.ts` | Modal focus management | ~100 |

### API Services (`src/try/api/`)

| Service | File | Endpoints | Purpose |
|---------|------|-----------|---------|
| **ApiClient** | `api-client.ts` | Base client | JWT auth injection, 401 handling |
| **LeasesService** | `leases-service.ts` | `POST /api/leases` | Create sandbox leases |
| **SessionsService** | `sessions-service.ts` | `/api/sessions` | Session management |
| **ConfigurationsService** | `configurations-service.ts` | `/api/configurations` | App config |
| **LeaseTemplatesService** | `lease-templates-service.ts` | `/api/lease-templates` | Template listing |

### Authentication (`src/try/auth/`)

| Component | File | Purpose |
|-----------|------|---------|
| **AuthState** | `auth-provider.ts` | Observer pattern singleton for auth state |
| **OAuthFlow** | `oauth-flow.ts` | OAuth callback handling, token extraction |

### Utilities (`src/try/utils/`)

| Utility | File | Purpose |
|---------|------|---------|
| **JwtUtils** | `jwt-utils.ts` | JWT parsing, expiry checking |
| **Storage** | `storage.ts` | sessionStorage wrapper |
| **FetchWithTimeout** | `fetch-with-timeout.ts` | Timeout wrapper for fetch |
| **CurrencyUtils** | `currency-utils.ts` | Currency formatting |
| **DateUtils** | `date-utils.ts` | Date formatting |
| **ErrorUtils** | `error-utils.ts` | Error handling utilities |
| **RequestDedup** | `request-dedup.ts` | Request deduplication (ADR-028) |
| **UrlValidator** | `url-validator.ts` | URL validation |

### Nunjucks Templates (`src/_includes/`)

#### Layouts
| Template | Purpose |
|----------|---------|
| `layouts/page.njk` | Base page layout |
| `layouts/try-page.njk` | Try feature layout with auth nav |
| `layouts/product-try.njk` | Product page with Try button |

#### Components
| Template | Purpose |
|----------|---------|
| `components/header/template.njk` | GOV.UK header with experimental banner |
| `components/document-list/template.njk` | Document listing |
| `components/reviews.njk` | User review display with star ratings |
| `components/product-assessments.njk` | Product assessment reports |

### Collections (Eleventy)

| Collection | Source | Purpose |
|------------|--------|---------|
| `catalogue` | `src/catalogue/**/*.md` | Product catalogue (47 products) |
| `catalogueTryable` | filtered catalogue | Products with try_id |
| `challenges` | `src/challenges/**/*.md` | Government challenges |
| `reviews` | `src/reviews/**/*.md` | User reviews |
| `productAssessments` | `src/product-assessments/**/*.md` | Assessments |
| `news` | `src/discover/news/**/*.md` | Industry news |
| `event` | `src/discover/events/**/*.md` | Events |
| `casestudy` | `src/discover/case-studies/**/*.md` | Case studies |

### Eleventy Plugins (`lib/`)

| Plugin | Purpose |
|--------|---------|
| `eleventy-mermaid-transform.js` | Mermaid diagram rendering |
| `eleventy-remote-images.js` | Build-time remote image fetching |

## Part 2: infra - CDK Constructs & Lambda

### CDK Stacks (`infra/lib/`)

| Stack | File | Resources |
|-------|------|-----------|
| **NdxStaticStack** | `ndx-stack.ts` | S3 bucket, CloudFront distribution, Cookie router |
| **NdxNotificationStack** | `notification-stack.ts` | Lambda, EventBridge, SQS DLQ, SNS, 12 CloudWatch alarms |
| **GitHubActionsStack** | `github-actions-stack.ts` | OIDC provider, IAM roles for CI/CD |

### Lambda Handlers (`infra/lib/lambda/notification/`)

| Handler | File | Trigger | Purpose |
|---------|------|---------|---------|
| **NotificationHandler** | `handler.ts` | EventBridge | Process ISB events → email/Slack |
| **DLQDigestHandler** | `dlq-digest-handler.ts` | Schedule (9am UTC) | Daily DLQ summary |

### Lambda Modules

| Module | File | Purpose |
|--------|------|---------|
| **NotifySender** | `notify-sender.ts` | GOV.UK Notify API integration |
| **SlackSender** | `slack-sender.ts` | Slack webhook integration |
| **SlackAlerts** | `slack-alerts.ts` | Slack alert formatting |
| **SlackTemplates** | `slack-templates.ts` | Block Kit message templates |
| **Templates** | `templates.ts` | Email template configuration |
| **Enrichment** | `enrichment.ts` | DynamoDB data enrichment |
| **Validation** | `validation.ts` | Zod schema validation |
| **Idempotency** | `idempotency.ts` | Duplicate event prevention |
| **Flatten** | `flatten.ts` | Object flattening for templates |
| **LeaseStatus** | `lease-status.ts` | Lease status validation |
| **TemplateValidation** | `template-validation.ts` | Cold start template drift detection |
| **Errors** | `errors.ts` | Custom error types (SecurityError, etc.) |
| **Types** | `types.ts` | TypeScript interfaces |

### CloudWatch Alarms (12)

| Alarm | Threshold | Purpose |
|-------|-----------|---------|
| DLQ Depth | >0 | Current failures |
| Lambda Errors | >5/5min | Code bugs |
| Canary | 0/24h | Silent death |
| DLQ Rate | >50/5min | Flooding attack |
| Auth Failure | >0 | Credential issues |
| Error Rate | >10% | Quality degradation |
| DLQ Stale | >24h | Stuck messages |
| Secrets Expiry | >335 days | Rotation warning |
| Complaint Rate | >0.1% | Email complaints |
| Bounce Rate | >1% | Invalid emails |
| Unsubscribe Rate | >5% | Content issues |
| Slack Failure | >0 | Webhook issues |

### GOV.UK Notify Templates (10)

| Template | Event Type |
|----------|------------|
| LEASE_REQUESTED | LeaseRequested |
| LEASE_APPROVED | LeaseApproved |
| LEASE_DENIED | LeaseDenied |
| LEASE_TERMINATED | LeaseTerminated |
| LEASE_FROZEN | LeaseFrozen |
| BUDGET_THRESHOLD | LeaseBudgetThresholdAlert |
| DURATION_THRESHOLD | LeaseDurationThresholdAlert |
| FREEZING_THRESHOLD | LeaseFreezingThresholdAlert |
| BUDGET_EXCEEDED | LeaseBudgetExceeded |
| LEASE_EXPIRED | LeaseExpired |

## Design Patterns

### State Management (ADR-024)
- Observer pattern singleton (`AuthState`)
- sessionStorage for JWT token
- Reactive subscriptions with unsubscribe cleanup

### API Client (ADR-021)
- Centralized API client
- Automatic Bearer token injection
- 401 → OAuth redirect
- Request deduplication (ADR-028)

### Notification Architecture
- "One brain, two mouths" pattern
- Single Lambda routes to Notify or Slack
- Cross-account EventBridge subscription
- DynamoDB enrichment for email personalization

## Accessibility Features

### Try Feature A11y
- **AriaLive** announcements for dynamic content
- **FocusTrap** for modal dialogs
- Keyboard navigation support
- Screen reader text for status changes

### GOV.UK Compliance
- WCAG 2.1 AA compliant design system
- Semantic HTML structure
- Proper heading hierarchy
- Color contrast compliance

## File Statistics

| Category | Count |
|----------|-------|
| Try feature TypeScript files | 49 |
| Nunjucks templates | 11 |
| Eleventy collections | 8 |
| CDK stacks | 3 |
| Lambda handlers | 2 |
| Lambda modules | 13 |
| CloudWatch alarms | 12 |
| Notify templates | 10 |
| Products in catalogue | 47 |

---

*Generated by document-project workflow v1.2.0*
