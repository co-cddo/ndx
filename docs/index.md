# National Digital Exchange (NDX) - Project Documentation Index

> **Generated:** 2026-01-12 | **Scan Level:** Exhaustive | **Version:** 1.2.0

**Project Root:** `/Users/cns/httpdocs/cddo/ndx`
**Repository:** https://github.com/co-cddo/ndx

---

## Quick Reference

| Property | Value |
|----------|-------|
| **Project Name** | National Digital Exchange (NDX) |
| **Purpose** | UK Government cloud service catalogue and Try Before You Buy platform |
| **Project Type** | Multi-part (web + infra) |
| **Repository Type** | Multi-part |
| **Architecture** | JAMstack + Serverless Event-Driven |
| **Primary Language** | TypeScript |
| **Web Framework** | Eleventy 3.1.2 |
| **IaC Framework** | AWS CDK 2.215.0 |
| **Design System** | GOV.UK Frontend via @x-govuk/govuk-eleventy-plugin 8.3.0 |
| **Package Manager** | Yarn 4.5.0 (npm blocked) |
| **Primary Domain** | ndx.digital.cabinet-office.gov.uk |
| **AWS Account** | 568672915267 |
| **AWS Region** | us-west-2 |
| **CI/CD** | GitHub Actions (OIDC) |

---

## Project Overview

The **National Digital Exchange (NDX)** is a UK government service transforming public sector cloud adoption. It serves as a one-stop shop for government departments to discover, evaluate, try, and access pre-approved cloud services.

**Key Features:**
- **Catalogue:** 47 cloud service products from multiple vendors
- **Try Before You Buy:** 24-hour sandbox provisioning via ISB integration
- **Discover:** Industry news, events, and case studies
- **Challenges:** Government procurement challenges
- **Reviews:** User reviews with star ratings
- **Notifications:** Multi-channel alerts (email, Slack)

---

## Repository Parts

| Part | Location | Purpose | Tech Stack |
|------|----------|---------|------------|
| **web** | Root (`/`) | Static site + Try feature | Eleventy, TypeScript, esbuild |
| **infra** | `/infra` | AWS infrastructure | CDK, Lambda, EventBridge |

---

## Core Documentation

### [Architecture Documentation](./architecture.md)

Comprehensive technical architecture covering both parts:
- JAMstack + Serverless event-driven patterns
- Web part: Eleventy, Try feature, API client architecture
- Infra part: CDK stacks, Lambda handlers, EventBridge
- Integration architecture (web ↔ infra ↔ ISB)
- Security architecture
- CI/CD pipelines

**Essential for:** System design understanding, technical decisions, architectural patterns

---

### [Component Inventory](./component-inventory.md)

Complete component catalog:
- **web:** Try feature components (AuthNav, TryButton, AUPModal, SessionsTable)
- **web:** API services (ApiClient, LeasesService, SessionsService)
- **web:** Nunjucks templates and Eleventy collections
- **infra:** CDK stacks (NdxStaticStack, NdxNotificationStack, GitHubActionsStack)
- **infra:** Lambda modules (NotifySender, SlackSender, Enrichment)
- **infra:** CloudWatch alarms (12) and Notify templates (10)

**Essential for:** Understanding available components, implementation patterns

---

### [Source Tree Analysis](./source-tree-analysis.md)

Annotated directory structure:
- web part: src/, lib/, tests/
- infra part: bin/, lib/, test/
- Entry points and critical files
- File statistics by category

**Essential for:** Navigating the codebase, understanding project organization

---

### [Development Guide](./development-guide.md)

Complete development workflow:
- Prerequisites (Node 20.17.0, Yarn 4.5.0, AWS CLI)
- Web development: Eleventy, Try feature, Jest, Playwright
- Infra development: CDK, Lambda, testing
- CI/CD pipelines
- Troubleshooting

**Essential for:** Onboarding developers, daily workflow

---

## Supporting Documentation

### [Project Scan Report](./project-scan-report.json)

Exhaustive scan metadata:
- Workflow version: 1.2.0
- Scan level: Exhaustive
- Project classification: Multi-part
- Completed steps tracking

---

### [BMM Workflow Status](../_bmad-output/planning-artifacts/bmm-workflow-status.yaml)

BMAD workflow tracking for self-serve signup feature:
- Current phase tracking
- Feature context
- Workflow path

---

## Existing Project Documentation

### Project-Level

| File | Purpose |
|------|---------|
| [README.md](../README.md) | Project overview and quick start |
| [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) | Contributor guidelines |
| [LICENSE](../LICENSE) | MIT License |

### Configuration

| File | Purpose |
|------|---------|
| [eleventy.config.js](../eleventy.config.js) | Eleventy configuration |
| [package.json](../package.json) | Web dependencies and scripts |
| [infra/package.json](../infra/package.json) | Infra dependencies and scripts |
| [infra/cdk.json](../infra/cdk.json) | CDK configuration |

### CI/CD

| File | Purpose |
|------|---------|
| [.github/workflows/ci.yaml](../.github/workflows/ci.yaml) | Web build and deploy |
| [.github/workflows/infra.yaml](../.github/workflows/infra.yaml) | CDK diff and deploy |
| [.github/workflows/accessibility.yml](../.github/workflows/accessibility.yml) | WCAG compliance |
| [.github/workflows/scorecard.yml](../.github/workflows/scorecard.yml) | OpenSSF security |

---

## Getting Started

### For New Developers

1. **Read First:**
   - [README.md](../README.md) - Project overview
   - [Development Guide](./development-guide.md) - Setup instructions

2. **Understand Architecture:**
   - [Architecture Documentation](./architecture.md) - System design
   - [Source Tree Analysis](./source-tree-analysis.md) - Code organization

3. **Start Coding:**
   - [Component Inventory](./component-inventory.md) - Available components
   - [Development Guide](./development-guide.md#try-feature-development) - Try feature development

### For Web Developers

```bash
# Clone and setup
git clone https://github.com/co-cddo/ndx.git
cd ndx
corepack enable
yarn install

# Development
yarn start           # Dev server at localhost:8080
yarn test            # Unit tests
yarn test:e2e        # E2E tests
```

### For Infrastructure Engineers

```bash
cd infra
yarn install

# Development
yarn test            # Lambda + CDK tests
yarn cdk diff        # Preview changes
yarn cdk deploy      # Deploy (requires AWS credentials)
```

---

## Content Sections

### Catalogue (`src/catalogue/`)

47 products from vendors including:
- AWS, Microsoft, Google, Anthropic
- Salesforce, ServiceNow, Snowflake
- GitLab, Databricks, UiPath
- And more...

### Try Feature (`src/try/`)

TypeScript SPA for sandbox provisioning:
- OAuth authentication with ISB
- Lease management
- Session tracking
- AUP modal

### Discover (`src/discover/`)

- News items
- Industry events
- Case studies

### Challenges (`src/challenges/`)

- DEFRA challenges
- MOD challenges

---

## Project Statistics

### Codebase

| Category | Count |
|----------|-------|
| Try feature TypeScript files | 49 |
| Products in catalogue | 47 |
| Lambda files | 36 |
| E2E tests | 15 |
| Nunjucks templates | 11 |
| CloudWatch alarms | 12 |
| Notify templates | 10 |

### Documentation

| Document | Lines |
|----------|-------|
| architecture.md | ~310 |
| component-inventory.md | ~210 |
| source-tree-analysis.md | ~295 |
| development-guide.md | ~500 |

---

## Architecture Highlights

### JAMstack + Serverless

```
Browser → Static Site (S3/CloudFront)
       → ISB API → EventBridge → Lambda → Notify/Slack
```

### Key Patterns

- **Observer Pattern (ADR-024):** Auth state management
- **Centralized API Client (ADR-021):** JWT injection, 401 handling
- **One Brain Two Mouths:** Notification routing
- **Request Deduplication (ADR-028):** Prevent duplicate API calls

### AWS Services

- Lambda, EventBridge, SQS, DynamoDB
- Secrets Manager, SNS, CloudWatch
- S3, CloudFront

---

## Security

### Authentication
- JWT tokens in sessionStorage
- OAuth via ISB/AWS IAM Identity Center
- Automatic 401 → OAuth redirect

### CI/CD Security
- OIDC authentication (no long-lived credentials)
- Step Security harden-runner
- CodeQL scanning
- OpenSSF Scorecard

### Lambda Security
- Source validation
- Reserved concurrency (10)
- PII redaction in logs

---

## Related Repositories

| Repository | Purpose |
|------------|---------|
| ndx_try | React frontend for Try |
| ndx_try_aws_scenarios | AWS scenario templates |
| innovation-sandbox-on-aws | Core ISB solution |
| innovation-sandbox-on-aws-approver | Lease approval |
| innovation-sandbox-on-aws-deployer | Stack deployment |
| cmm | Cloud Maturity Model |
| govuk-eleventy-plugin | GOV.UK design plugin fork |

---

## Contact & Support

- **Email:** ndx@digital.cabinet-office.gov.uk
- **Issues:** https://github.com/co-cddo/ndx/issues
- **License:** MIT

---

## Document Maintenance

**This index is auto-generated** by the document-project workflow.

**Last Scan:**
- **Date:** 2026-01-12
- **Mode:** Exhaustive (full rescan)
- **Classification:** Multi-part (web + infra)

---

*Generated by document-project workflow v1.2.0*
*Maintained by UK Central Digital and Data Office (CDDO)*
