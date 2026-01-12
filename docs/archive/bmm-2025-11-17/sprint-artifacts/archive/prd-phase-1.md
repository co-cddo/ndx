# ndx - Product Requirements Document

**Author:** cns
**Date:** 2025-11-18
**Version:** 1.0

---

## Executive Summary

The National Digital Exchange (NDX) is evolving from an Alpha prototype to a production-ready platform. This PRD defines requirements for the infrastructure evolution that transitions NDX from GitHub Pages static hosting to AWS-based production infrastructure.

**Current State:** NDX Alpha prototype deployed to GitHub Pages - a static JAMstack site cataloging 33+ cloud vendors for UK government procurement, demonstrating £2B potential taxpayer savings.

**Evolution Goal:** Establish production-grade AWS infrastructure using Infrastructure-as-Code (CDK) to support the platform's transition from prototype to live government service.

**Immediate Scope:** Deploy the existing Eleventy static site to AWS S3, managed through AWS CDK, with proper infrastructure hygiene (testing, linting, version control). This creates the foundation for future capabilities including OIDC-based keyless authentication for GitHub Actions deployments.

### What Makes This Special

This infrastructure evolution is **the foundation for production deployment of a critical UK government service** projected to save £2B in taxpayer funds. Rather than rushing to production with prototype infrastructure, this focuses on establishing:

- **Infrastructure-as-Code best practices** using AWS CDK for reproducible, auditable deployments
- **Security-first foundation** preparing for government compliance requirements (GDS standards, security clearance, transparency)
- **Scalability groundwork** that supports the platform's evolution from static catalog to dynamic procurement system
- **Modern DevOps patterns** including the future OIDC keyless authentication model for GitHub Actions

The differentiator is taking a **methodical, engineering-first approach** to infrastructure rather than quick deployment, ensuring NDX can scale securely as a critical government service.

---

## Project Classification

**Technical Type:** Web Application (infrastructure layer)
**Domain:** GovTech (UK Government Digital Service)
**Complexity:** High

This project adds infrastructure-as-code capabilities to the existing NDX static site. While the application itself remains a JAMstack Eleventy site, the deployment infrastructure is being elevated to production standards.

**Domain Context:** As a UK government service, NDX must comply with:

- Government Digital Service (GDS) standards
- UK government security frameworks
- Public sector transparency requirements
- Accessibility standards (WCAG 2.2 AA - already met via GOV.UK Frontend)
- Open government procurement principles

The infrastructure must support future capabilities including secure trial environments and production service access for government departments.

---

## Success Criteria

**Primary Success Metric:** Infrastructure supports seamless transition from prototype to production without degradation of current functionality.

**Specific Success Indicators:**

1. **Deployment Reliability:** Static site deploys successfully to S3 with identical functionality to current GitHub Pages deployment
2. **Infrastructure Quality:** CDK code passes linting, testing, and follows AWS best practices
3. **Operational Readiness:** Infrastructure is reproducible via CDK, documented, and maintainable by the team
4. **Foundation Validated:** S3 infrastructure successfully supports manual deployments, proving the pattern for future OIDC automation
5. **Cost Efficiency:** AWS hosting costs remain minimal (comparable to free GitHub Pages) during static site phase

**What Winning Looks Like:**

- Team can confidently deploy updates to production S3 infrastructure using manual process
- CDK infrastructure code is tested, linted, and version-controlled with same rigor as application code
- Foundation is proven for future GitHub Actions + OIDC keyless authentication integration
- Platform is ready for next phase: dynamic capabilities (trials, access requests)

---

## Product Scope

### MVP - Minimum Viable Product

**Core Infrastructure:**

1. **S3 Static Site Hosting:** Bucket configured for static website hosting with public read access
2. **CDK Infrastructure Definition:** TypeScript CDK app defining all AWS resources as code
3. **Manual Deployment Process:** Document and validate manual upload process to S3 bucket
4. **AWS Profile Integration:** Use existing `NDX/InnovationSandboxHub` profile for deployments

**Infrastructure Hygiene:** 5. **CDK Testing:** Unit tests for CDK infrastructure code 6. **CDK Linting:** ESLint configuration for CDK TypeScript code 7. **Infrastructure Documentation:** README explaining CDK setup, deployment, and architecture 8. **Version Control:** CDK code in git with proper .gitignore for AWS artifacts

**Quality Gates:** 9. **Build Validation:** CDK synth validates infrastructure before deployment 10. **Diff Preview:** CDK diff shows changes before applying to AWS

### Growth Features (Post-MVP)

**CI/CD Automation:**

1. **GitHub Actions Workflow:** Automated deployment pipeline triggered on commits to main branch
2. **OIDC Keyless Authentication:** GitHub Actions authenticates to AWS without long-lived credentials
3. **Deployment Approvals:** Production deployment gates and approval process
4. **Automated Testing:** Infrastructure tests run in CI/CD pipeline

**Production Enhancements:** 5. **CloudFront CDN:** Global content delivery network in front of S3 6. **Custom Domain:** DNS configuration for production domain 7. **SSL/TLS Certificates:** AWS Certificate Manager integration 8. **Monitoring & Logging:** CloudWatch dashboards for site health and access patterns 9. **Backup & Versioning:** S3 versioning and backup policies

**Infrastructure Evolution:** 10. **Multi-Environment:** Separate dev/staging/production environments via CDK context 11. **Cost Monitoring:** AWS Budget alerts and cost allocation tags 12. **Security Scanning:** Infrastructure security scanning in CI/CD

### Vision (Future)

**Dynamic Capabilities Foundation:**

1. **API Gateway Integration:** Prepare infrastructure for future backend APIs (trial requests, access management)
2. **Lambda Functions:** Serverless compute for dynamic features
3. **Database Layer:** DynamoDB or RDS for user data, requests, sessions
4. **Authentication Infrastructure:** Cognito or similar for user authentication
5. **Trial Environment Provisioning:** Infrastructure to spin up 24-hour trial environments

**Enterprise Scale:** 6. **Multi-Region Deployment:** High availability across AWS regions 7. **WAF Integration:** Web Application Firewall for security 8. **Compliance Automation:** Automated compliance checking against GDS standards 9. **Disaster Recovery:** Automated backup and recovery procedures

---

## Domain-Specific Requirements (GovTech)

**Minimal Government Requirements for MVP Infrastructure:**

The MVP infrastructure phase has minimal government-specific requirements since it's deploying the existing static site without handling user data or dynamic capabilities:

1. **Open Source Requirement:** All CDK infrastructure code must be open source and publicly auditable (satisfied - code in public GitHub repository)
2. **Region Flexibility:** No UK data residency requirement for MVP static site (us-west-2 acceptable)
3. **Authentication:** Handled by separate systems (not infrastructure concern for MVP)
4. **Compliance Deferral:** Heavy government compliance requirements (security clearance, data protection, cost governance) deferred until dynamic capabilities phase

**Future Considerations:** When NDX adds dynamic features (trial environments, user authentication, access requests), infrastructure will need to evolve to support UK GDPR, government security standards, and data protection requirements. The CDK foundation being built in MVP enables this future evolution.

---

## Infrastructure-Specific Requirements

### CDK Project Structure

**Location & Technology:**

- CDK code lives in `/infra` directory within main repository
- TypeScript for CDK (industry standard)
- AWS CDK v2 (current standard)
- Package manager: Yarn (consistent with main application)

### AWS Resource Configuration

**S3 Bucket:**

- Bucket name: `ndx-static-prod`
- Purpose: Static asset storage (files only, not static website hosting)
- Static website hosting: **Disabled** (prepared for CloudFront in growth phase)
- Public access: Configured for CloudFront origin access (not direct public bucket)
- Error handling: Default AWS errors (custom error pages via CloudFront later)
- Versioning: To be determined (recommended for rollback capability)

**Deployment Profile:**

- AWS Profile: `NDX/InnovationSandboxHub` (pre-configured locally)
- Region: `us-west-2`

### Testing & Quality Standards

**Industry Best Practices for CDK Testing:**

1. **Snapshot Tests:** Capture CloudFormation template, detect unintended changes
2. **Fine-grained Assertions:** Validate specific resource properties (bucket name, encryption, policies)
3. **Synth Validation:** CDK synth must succeed before any deployment
4. **Linting:** ESLint for TypeScript CDK code with AWS CDK recommended rules

**Quality Gates:**

- All tests pass before deployment
- CDK synth produces valid CloudFormation
- CDK diff reviewed before deploy
- ESLint passes with no errors

### Build & Deployment Workflow

**Separation of Concerns:**

- **CDK (`/infra`):** Manages AWS infrastructure only (S3 bucket, future CloudFront, OIDC roles)
- **Application (`/`):** Builds site and deploys files to infrastructure

**Deployment Script:**

- Location: Main application `package.json`
- Command: `yarn deploy`
- Implementation: Shell script using AWS CLI
- Function: Upload `_site/` contents to `ndx-static-prod` S3 bucket
- Profile: Uses `NDX/InnovationSandboxHub` AWS profile
- Dependencies: Requires prior `yarn build` (Eleventy build)

**Manual Deployment Flow (MVP):**

```bash
# 1. Build static site
yarn build

# 2. Deploy infrastructure (first time or when infra changes)
cd infra
cdk diff   # Review infrastructure changes
cdk deploy # Apply infrastructure changes

# 3. Deploy site files
cd ..
yarn deploy # Upload _site/ to S3 bucket
```

**Team Access:**

- Solo deployment for MVP (single developer with AWS profile)
- Team deployment deferred to Growth phase (GitHub Actions + OIDC)

### Infrastructure Directory Structure

```
/infra
├── bin/
│   └── infra.ts              # CDK app entry point
├── lib/
│   └── ndx-stack.ts          # Stack definition (S3 bucket, etc.)
├── test/
│   └── ndx-stack.test.ts     # CDK tests (snapshot + assertions)
├── cdk.json                   # CDK configuration
├── package.json               # CDK dependencies
├── tsconfig.json              # TypeScript config
├── .eslintrc.js              # ESLint config
└── README.md                  # Infrastructure documentation
```

---

## Functional Requirements

**Purpose:** These define WHAT capabilities the infrastructure must provide. They are the complete inventory of infrastructure features that deliver the production deployment foundation.

**Scope:** Infrastructure layer only - not application features. Each FR describes a capability the CDK infrastructure or deployment process must support.

### Infrastructure Provisioning

**FR1:** System can define S3 bucket (`ndx-static-prod`) as Infrastructure-as-Code using AWS CDK TypeScript

**FR2:** System can deploy S3 bucket to AWS us-west-2 region using `NDX/InnovationSandboxHub` profile

**FR3:** System can configure S3 bucket for CloudFront origin access (public access blocked, prepared for CDN)

**FR4:** Infrastructure code can be validated locally via `cdk synth` before deployment

**FR5:** Infrastructure changes can be previewed via `cdk diff` before applying to AWS

**FR6:** Infrastructure can be deployed to AWS via `cdk deploy` command

**FR7:** Infrastructure deployments are idempotent (re-running deploy with no changes causes no AWS updates)

### File Deployment

**FR8:** System can upload all files from `_site/` directory to `ndx-static-prod` S3 bucket

**FR9:** Deployment script can use AWS CLI with `NDX/InnovationSandboxHub` profile for S3 upload

**FR10:** Deployment preserves file structure and MIME types during S3 upload

**FR11:** Deployment can be triggered via `yarn deploy` command from project root

**FR12:** Deployment requires successful `yarn build` to complete before uploading files

### Infrastructure Quality & Testing

**FR13:** CDK infrastructure code can be tested via snapshot tests (CloudFormation template validation)

**FR14:** CDK infrastructure code can be tested via fine-grained assertions (bucket properties, encryption, naming)

**FR15:** CDK TypeScript code can be linted via ESLint with AWS CDK recommended rules

**FR16:** All infrastructure tests must pass before deployment is allowed

**FR17:** Infrastructure code can be version-controlled in git with appropriate .gitignore for CDK artifacts

### Documentation & Maintainability

**FR18:** Infrastructure setup, deployment process, and architecture are documented in `/infra/README.md`

**FR19:** Deployment workflow is documented for team members to understand manual deployment process

**FR20:** CDK code follows TypeScript and AWS CDK best practices for long-term maintainability

### Rollback & Safety

**FR21:** Infrastructure changes can be reviewed before applying (via `cdk diff`)

**FR22:** S3 bucket supports versioning for file rollback capability (if enabled)

**FR23:** Failed deployments can be investigated via CloudFormation events and logs

### Future Extensibility (Prepared, Not Implemented in MVP)

**FR24:** Infrastructure structure supports future addition of CloudFront CDN

**FR25:** Infrastructure structure supports future addition of OIDC authentication for GitHub Actions

**FR26:** Infrastructure structure supports future multi-environment contexts (dev/staging/prod)

---

## Non-Functional Requirements

### Security

**NFR-SEC-1:** S3 bucket must block all public access by default (prepared for CloudFront origin access only)

**NFR-SEC-2:** S3 bucket must use server-side encryption for all stored files (AWS managed keys acceptable for MVP)

**NFR-SEC-3:** CDK code must not contain hardcoded credentials or sensitive values

**NFR-SEC-4:** AWS Profile (`NDX/InnovationSandboxHub`) credentials must remain local, never committed to git

**NFR-SEC-5:** Infrastructure changes must be auditable via CloudFormation change sets and CDK diff output

### Reliability

**NFR-REL-1:** CDK deployment must be idempotent (repeated deployments with no changes cause no AWS modifications)

**NFR-REL-2:** Failed CDK deployments must rollback automatically via CloudFormation

**NFR-REL-3:** File upload failures must provide clear error messages indicating which files failed

**NFR-REL-4:** Infrastructure must validate successfully via `cdk synth` before any deployment attempt

### Performance

**NFR-PERF-1:** `cdk synth` must complete in under 30 seconds

**NFR-PERF-2:** `cdk diff` must complete in under 60 seconds

**NFR-PERF-3:** `yarn deploy` file upload speed acceptable for ~165 static files (no specific SLA for MVP)

**NFR-PERF-4:** S3 hosting costs must remain minimal during static site phase (< $5/month for storage and data transfer)

### Maintainability

**NFR-MAINT-1:** CDK code must pass ESLint with zero errors before deployment

**NFR-MAINT-2:** CDK code must have 100% snapshot test coverage for all stacks

**NFR-MAINT-3:** Infrastructure code must follow consistent TypeScript naming conventions and structure

**NFR-MAINT-4:** All infrastructure changes must be documented in git commit messages with rationale

**NFR-MAINT-5:** `/infra/README.md` must provide complete setup instructions executable by new team members

### Portability

**NFR-PORT-1:** CDK code must work across developer machines (Mac, Linux, Windows with WSL)

**NFR-PORT-2:** Infrastructure must not depend on environment-specific paths or configurations (except AWS profile)

**NFR-PORT-3:** CDK version and dependencies must be pinned in `package.json` for reproducible builds

### Operational Excellence

**NFR-OPS-1:** Infrastructure deployment process must be documented with step-by-step commands

**NFR-OPS-2:** CDK diff output must clearly show what resources will be added/modified/deleted

**NFR-OPS-3:** Deployment failures must provide actionable error messages with remediation guidance

**NFR-OPS-4:** S3 bucket must have appropriate tagging for resource organization (e.g., `Project: NDX`, `Environment: Production`)

---

## PRD Summary

**Captured Requirements:**

- **26 Functional Requirements** across 6 capability areas
  - Infrastructure Provisioning (7)
  - File Deployment (5)
  - Infrastructure Quality & Testing (5)
  - Documentation & Maintainability (3)
  - Rollback & Safety (3)
  - Future Extensibility (3)

- **23 Non-Functional Requirements** across 6 quality dimensions
  - Security (5)
  - Reliability (4)
  - Performance (4)
  - Maintainability (5)
  - Portability (3)
  - Operational Excellence (4)

**Key Deliverables:**

1. AWS CDK TypeScript infrastructure in `/infra` directory
2. S3 bucket `ndx-static-prod` configured for CloudFront origin access
3. `yarn deploy` script for uploading built site to S3
4. CDK testing suite (snapshot + assertions)
5. ESLint configuration for CDK code
6. Infrastructure documentation in `/infra/README.md`

**Success Validation:**

- CDK infrastructure deploys successfully to AWS us-west-2
- Static site files upload to S3 bucket via `yarn deploy`
- All tests pass (CDK tests + ESLint)
- Infrastructure is reproducible and documented
- Foundation proven for future GitHub Actions + OIDC automation

---

## Product Value Summary

This PRD establishes **production-grade infrastructure foundations** for the National Digital Exchange, a UK government service projected to save £2B in taxpayer funds.

The value delivered is **methodical engineering excellence** - taking the time to build CDK infrastructure with proper testing, linting, and documentation ensures NDX can scale securely from Alpha prototype to production government service. Rather than rushing to deploy, this creates a **solid foundation** that supports future evolution including CloudFront CDN, OIDC keyless authentication, and dynamic procurement capabilities.

The infrastructure-as-code approach ensures **reproducibility, auditability, and transparency** - critical requirements for a public sector platform handling government procurement decisions.

---

_This PRD captures the infrastructure requirements for NDX's evolution to AWS production hosting - establishing the foundation for a critical UK government procurement platform._

_Created through collaborative discovery between cns and AI facilitator._
