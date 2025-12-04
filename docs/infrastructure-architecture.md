# NDX Infrastructure Architecture

**Author:** cns
**Date:** 2025-11-18
**Version:** 1.0
**Project:** National Digital Exchange (NDX) - Infrastructure Evolution

---

## Executive Summary

This architecture defines the AWS CDK infrastructure for deploying the NDX static site to production. The approach prioritizes **infrastructure-as-code best practices** with comprehensive testing, linting, and documentation to establish a foundation for the UK government's £2B procurement platform evolution.

**Key Architectural Decisions:**

- AWS CDK v2 with TypeScript for type-safe infrastructure definition
- S3 bucket for static file storage (prepared for CloudFront CDN)
- Manual deployment workflow for MVP (GitHub Actions OIDC in growth phase)
- Industry-standard testing (Jest snapshots + fine-grained assertions)
- ESLint for code quality with AWS CDK recommended rules

---

## Project Initialization

**First Implementation Story:** Initialize CDK infrastructure project

```bash
# Execute in project root
mkdir infra
cd infra
cdk init app --language typescript

# Convert from npm to Yarn for consistency with main app
rm package-lock.json
yarn install
```

This establishes the base AWS CDK TypeScript project with:

- Standard CDK directory structure (`bin/`, `lib/`, `test/`)
- TypeScript configuration optimized for CDK
- Jest testing framework
- Git ignore patterns for CDK artifacts
- Example stack showing CDK patterns

---

## Decision Summary

| Category                     | Decision                                   | Version                | Affects FRs            | Rationale                                              |
| ---------------------------- | ------------------------------------------ | ---------------------- | ---------------------- | ------------------------------------------------------ |
| **Infrastructure Framework** | AWS CDK v2                                 | 2.224.0 (Nov 2025)     | All Infrastructure FRs | Industry-standard IaC with TypeScript type safety      |
| **Language**                 | TypeScript                                 | Latest (from CDK init) | All FRs                | Type safety, AWS CDK native support                    |
| **Package Manager**          | Yarn                                       | 4.5.0                  | All FRs                | Consistency with main application                      |
| **Testing Framework**        | Jest                                       | Latest (from CDK init) | FR13, FR14, FR16       | Standard CDK testing, snapshot + assertions            |
| **Linting**                  | ESLint + typescript-eslint + awscdk plugin | Latest flat config     | FR15, FR16             | Code quality, CDK best practices enforcement           |
| **Stack Strategy**           | Single monolithic stack (MVP)              | N/A                    | FR1-FR7                | Simplicity for MVP, construct pattern for future scale |
| **S3 Bucket Name**           | ndx-static-prod                            | N/A                    | FR1-FR3, FR8-FR12      | Follows naming convention                              |
| **S3 Versioning**            | Enabled                                    | N/A                    | FR22                   | Rollback capability, minimal cost increase             |
| **S3 Encryption**            | AWS managed keys (SSE-S3)                  | N/A                    | NFR-SEC-2              | Security requirement, default AWS encryption           |
| **S3 Public Access**         | Blocked (CloudFront-ready)                 | N/A                    | NFR-SEC-1, FR3         | Prepared for CDN, security best practice               |
| **Deployment Script**        | Bash script with AWS CLI                   | N/A                    | FR8-FR12               | Simple, direct S3 sync with MIME type handling         |
| **Resource Naming**          | `ndx-{resource}-{env}`                     | N/A                    | All FRs                | Consistent naming: prod/notprod environments           |
| **Resource Tagging**         | project, environment, managedby            | N/A                    | NFR-OPS-4              | All lowercase, minimal required tags                   |
| **Error Handling**           | CloudFormation auto-rollback + validation  | N/A                    | NFR-REL-2              | Built-in CDK failure recovery                          |
| **Test Co-location**         | lib/\*.test.ts alongside source            | N/A                    | FR13, FR14             | Standard CDK pattern, easier maintenance               |

**Decisions Provided by Starter:**

- TypeScript compiler configuration ✓
- Jest test framework setup ✓
- Standard CDK project structure ✓
- Git ignore patterns ✓

---

## Project Structure

```
ndx/                                  # Project root
├── infra/                           # CDK infrastructure (new)
│   ├── bin/
│   │   └── infra.ts                # CDK app entry point
│   ├── lib/
│   │   ├── ndx-stack.ts           # Main stack definition
│   │   ├── ndx-stack.test.ts      # Stack tests (snapshot + assertions)
│   │   └── constructs/
│   │       └── static-hosting.ts  # S3 bucket construct (future)
│   ├── test/
│   │   └── jest.config.js         # Jest configuration
│   ├── cdk.json                    # CDK configuration
│   ├── cdk.context.json           # CDK context (gitignored)
│   ├── cdk.out/                    # CDK output (gitignored)
│   ├── eslint.config.mjs          # ESLint flat config (2025 standard)
│   ├── tsconfig.json              # TypeScript configuration
│   ├── package.json               # CDK dependencies
│   ├── yarn.lock                  # Yarn lockfile
│   ├── node_modules/              # Dependencies (gitignored)
│   └── README.md                  # Infrastructure documentation
├── scripts/                        # Deployment automation (new)
│   └── deploy.sh                  # AWS CLI S3 sync script
├── _site/                         # Eleventy build output (gitignored, existing)
├── src/                           # Eleventy source (existing)
│   ├── catalogue/
│   ├── discover/
│   ├── challenges/
│   └── ... (existing NDX content)
├── docs/                          # Project documentation (existing)
│   ├── index.md
│   ├── architecture.md            # Brownfield application architecture
│   ├── infrastructure-architecture.md  # This document
│   ├── prd.md
│   └── ...
├── package.json                   # Main app (adds "deploy" script)
├── yarn.lock                      # Main app lockfile
├── eleventy.config.js             # Eleventy configuration
└── ... (existing NDX files)
```

---

## FR Category to Architecture Mapping

### Infrastructure Provisioning (FR1-FR7)

- **Component:** `/infra/lib/ndx-stack.ts` - Main CDK stack
- **Resources:** S3 bucket definition with encryption, versioning, tags
- **Validation:** `cdk synth` validates CloudFormation template
- **Preview:** `cdk diff` shows infrastructure changes
- **Deployment:** `cdk deploy` applies changes to AWS

### File Deployment (FR8-FR12)

- **Component:** `/scripts/deploy.sh` - AWS CLI wrapper
- **Command:** `yarn deploy` (defined in root package.json)
- **Function:** Syncs `_site/` to S3 with MIME types, cache headers
- **Prerequisite Check:** Validates `_site/` exists before upload

### Infrastructure Quality & Testing (FR13-FR17)

- **Component:** `/infra/lib/ndx-stack.test.ts` - Jest tests
- **Snapshot Tests:** Capture full CloudFormation template
- **Fine-grained Assertions:** Validate bucket name, encryption, tags
- **Linting:** ESLint with TypeScript + AWS CDK rules
- **Version Control:** Git with proper .gitignore for CDK artifacts

### Documentation & Maintainability (FR18-FR20)

- **Component:** `/infra/README.md` - Complete infrastructure guide
- **Content:** Prerequisites, setup, deployment, troubleshooting
- **Standards:** Follows TypeScript and AWS CDK best practices

### Rollback & Safety (FR21-FR23)

- **Preview:** `cdk diff` shows changes before deploy
- **Versioning:** S3 versioning enabled for file rollback
- **Failure Recovery:** CloudFormation automatic rollback on errors

### Future Extensibility (FR24-FR26)

- **CloudFront:** Construct pattern supports adding CDN
- **OIDC:** Stack structure prepared for GitHub Actions roles
- **Multi-env:** Naming convention supports prod/notprod contexts

---

## Technology Stack Details

### Core Technologies

**AWS CDK v2.224.0**

- TypeScript-based infrastructure as code
- Weekly release cycle (verified Nov 13, 2025)
- Generates CloudFormation templates
- Built-in type safety and validation

**TypeScript**

- Version: Latest from `cdk init` (typically 5.x)
- Strict mode enabled
- Target: ES2020+
- Module: NodeNext

**Jest Testing Framework**

- Snapshot testing for CloudFormation templates
- Fine-grained assertions for resource properties
- Co-located tests: `lib/*.test.ts`

**ESLint Configuration (2025 Flat Config)**

- `@eslint/js` - Core ESLint recommended rules
- `typescript-eslint` - TypeScript-specific linting
- `eslint-plugin-awscdk` - AWS CDK best practices
- Flat config format (`eslint.config.mjs`)

**Deployment Tools**

- AWS CLI - S3 sync operations
- Bash scripting - Deployment automation
- AWS Profile: `NDX/InnovationSandboxHub`

---

## Integration Points

### CDK to AWS

- **CloudFormation:** CDK synthesizes to CloudFormation templates
- **S3:** Direct resource creation via AWS SDK
- **IAM:** Uses configured AWS profile for authentication

### Application to Infrastructure

- **Build Output:** Eleventy generates `_site/` directory
- **Deployment Script:** `scripts/deploy.sh` uploads to S3
- **Entry Point:** Root `package.json` script: `yarn deploy`

### Testing Integration

- **Pre-deploy Validation:** `cdk synth` before `cdk deploy`
- **Test Execution:** `yarn test` in `/infra` runs Jest
- **CI/CD Ready:** Test exit codes fail deployment on errors

---

## Implementation Patterns

### Naming Conventions

**Resource Naming Pattern:**

```
ndx-{resource-type}-{environment}
```

Examples:

- S3 Bucket: `ndx-static-prod`, `ndx-static-notprod`
- CloudFront (future): `ndx-cdn-prod`
- Lambda (future): `ndx-api-prod`

**Environments:**

- `prod` - Production environment
- `notprod` - Non-production (dev, staging, test)

**Code Naming:**

- Stack class: `NdxStaticStack`
- Construct classes: PascalCase (`StaticHosting`)
- Files: kebab-case (`ndx-stack.ts`)
- Test files: `{filename}.test.ts`

### Resource Tagging Strategy

**Standard Tags (all lowercase):**

```typescript
const tags = {
  project: "ndx",
  environment: "prod", // or 'notprod'
  managedby: "cdk",
}
```

Applied to all AWS resources for governance and cost tracking.

### Error Handling

**CDK Stack Validation:**

```typescript
// Validate bucket name meets AWS requirements
if (!bucketName.match(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)) {
  throw new Error("Bucket name must be lowercase alphanumeric with hyphens")
}
```

**Deployment Script Validation:**

```bash
set -e # Exit on any error

if [ ! -d "_site" ]; then
  echo "Error: _site/ directory not found. Run 'yarn build' first."
  exit 1
fi
```

**CloudFormation Rollback:**

- Automatic rollback on deployment failures
- Stack remains in last known good state
- Error details available in CloudFormation events

### Testing Patterns

**Snapshot Test Example:**

```typescript
import { Template } from "aws-cdk-lib/assertions"
import * as cdk from "aws-cdk-lib"
import { NdxStaticStack } from "../lib/ndx-stack"

test("Stack snapshot matches expected CloudFormation", () => {
  const app = new cdk.App()
  const stack = new NdxStaticStack(app, "TestStack")
  const template = Template.fromStack(stack)

  expect(template.toJSON()).toMatchSnapshot()
})
```

**Fine-grained Assertion Example:**

```typescript
test("S3 bucket has correct configuration", () => {
  const app = new cdk.App()
  const stack = new NdxStaticStack(app, "TestStack")
  const template = Template.fromStack(stack)

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "ndx-static-prod",
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [
        {
          ServerSideEncryptionByDefault: {
            SSEAlgorithm: "AES256",
          },
        },
      ],
    },
    VersioningConfiguration: {
      Status: "Enabled",
    },
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
    Tags: [
      { Key: "project", Value: "ndx" },
      { Key: "environment", Value: "prod" },
      { Key: "managedby", Value: "cdk" },
    ],
  })
})
```

---

## Consistency Rules

### Code Organization

**Stack Structure:**

```typescript
// lib/ndx-stack.ts
import * as cdk from "aws-cdk-lib"
import * as s3 from "aws-cdk-lib/aws-s3"
import { Construct } from "constructs"

export class NdxStaticStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Resource definitions here
  }
}
```

**File Organization:**

- One stack per file in `lib/`
- One test file per stack (co-located)
- Future constructs in `lib/constructs/`
- Shared utilities in `lib/utils/` (if needed)

### Deployment Workflow

**Manual Deployment (MVP):**

```bash
# 1. Build static site
yarn build

# 2. Deploy infrastructure (first time or when infrastructure changes)
cd infra
cdk diff   # Review infrastructure changes
cdk deploy # Apply infrastructure changes
cd ..

# 3. Deploy site files
yarn deploy # Upload _site/ to S3
```

**Infrastructure Changes vs. File Updates:**

- Infrastructure changes: Require `cdk deploy` in `/infra`
- File updates only: Just run `yarn deploy` from root
- Always run `yarn build` before `yarn deploy`

### Version Control

**.gitignore (infra-specific):**

```
node_modules/
cdk.out/
cdk.context.json
*.js
*.d.ts
coverage/
.DS_Store
```

**Commit Message Convention:**

```
feat(infra): add S3 bucket with versioning
test(infra): add snapshot tests for NdxStaticStack
fix(deploy): handle missing _site directory gracefully
```

---

## Data Architecture

### S3 Bucket Configuration

**Bucket: `ndx-static-prod`**

**Availability Validation** (Completed: 2025-11-18, Story 2.1)

- Bucket name `ndx-static-prod` verified as available via AWS CLI `head-bucket` command
- Command returned 404 (Not Found), confirming bucket does not exist in any AWS account
- Decision: Proceed with `ndx-static-prod` as the production bucket name
- No alternative naming strategy required

```typescript
new s3.Bucket(this, "StaticSiteBucket", {
  bucketName: "ndx-static-prod",

  // Security
  encryption: s3.BucketEncryption.S3_MANAGED,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

  // Versioning for rollback
  versioned: true,

  // Lifecycle (future optimization)
  lifecycleRules: [], // Add in growth phase

  // Tags
  tags: {
    project: "ndx",
    environment: "prod",
    managedby: "cdk",
  },

  // Removal policy (retain data on stack deletion)
  removalPolicy: cdk.RemovalPolicy.RETAIN,
})
```

**Access Pattern (Validated: 2025-11-18, Story 2.3)**

**Decision: CloudFront Required for Site Access**

The S3 bucket is configured with `BLOCK_ALL` public access and does NOT have static website hosting enabled. This is the correct configuration for production security and aligns with the architectural intent documented in the PRD.

**MVP Access:**

- Files uploaded to S3 bucket: ✓ Accessible via AWS CLI and CDK
- Public site access: ✗ NOT accessible (returns 403 Forbidden)
- Reason: Bucket has all public access blocked (NFR-SEC-1)

**Future Access (Growth Phase):**

- CloudFront CDN will be added to enable public access
- CloudFront Origin Access Identity (OAI) will grant read access to S3
- Site will be accessible via CloudFront distribution URL
- No migration needed (bucket already configured correctly)

**Consequence:**
Epic 3 deployment scripts can upload files successfully, but the site will remain dark (not publicly accessible) until CloudFront is configured in the growth phase. This is intentional and maintains production-ready security from day one.

**Verification:**
Attempting to access files directly via S3 will return 403 Forbidden. This confirms proper security configuration.

**File Structure in S3:**

```
s3://ndx-static-prod/
├── index.html
├── catalogue/
│   └── ... (nested as per Eleventy output)
├── discover/
├── challenges/
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── ... (mirrors _site/ directory structure)
```

**MIME Type Handling:**
AWS CLI auto-detects content types. Common mappings:

- `.html` → `text/html`
- `.css` → `text/css`
- `.js` → `application/javascript`
- `.json` → `application/json`
- `.svg` → `image/svg+xml`

---

## Security Architecture

### Infrastructure Security

**S3 Bucket Security:**

- Public access completely blocked (all 4 settings enabled)
- Server-side encryption with AWS managed keys (SSE-S3)
- Versioning enabled (protection against accidental deletion)
- Future: CloudFront OAI for controlled public access

**IAM & Authentication:**

- Local deployment: AWS profile `NDX/InnovationSandboxHub`
- No credentials in code or version control
- Future: OIDC for GitHub Actions (keyless authentication)

**CloudFormation Security:**

- Stack policies prevent accidental resource deletion
- Change sets preview all modifications
- Automatic rollback on deployment failures

### Code Security

**Dependency Management:**

- Yarn lockfile for reproducible builds
- Regular CDK version updates (weekly release cycle)
- ESLint checks for security anti-patterns

**Secret Management:**

- No secrets in CDK code
- AWS Profile credentials stored locally only
- Future: AWS Secrets Manager for dynamic secrets

---

## Performance Considerations

### CDK Performance

**Build Performance:**

- `cdk synth`: < 30 seconds (NFR-PERF-1)
- `cdk diff`: < 60 seconds (NFR-PERF-2)
- Achieved through simple stack structure

**Deployment Performance:**

- CloudFormation deployment: ~2-3 minutes (S3 bucket creation)
- File upload: Varies by file count (~165 files for NDX)
- Incremental: Only changed files uploaded

### S3 Performance

**File Serving:**

- Direct S3 access (MVP): ~100-300ms latency
- Future CloudFront: ~10-50ms latency globally

**Cost Optimization:**

- Storage: ~$0.023/GB/month (S3 Standard)
- Data transfer: First 100GB free, then $0.09/GB
- Requests: Minimal for static site
- **Estimated MVP cost:** < $5/month (NFR-PERF-4)

**Cache Headers:**

```bash
--cache-control "public, max-age=3600"
```

Prepares for CloudFront, reduces repeat requests.

---

## Deployment Architecture

### AWS Region & Profile

**Region:** `us-west-2`

- Specified in AWS profile configuration
- No UK data residency requirement for MVP

**AWS Profile:** `NDX/InnovationSandboxHub`

- Pre-configured locally
- Used by CDK and AWS CLI
- Credentials never committed to repository

### Deployment Components

**CDK Bootstrap (one-time):**

```bash
cd infra
cdk bootstrap aws://ACCOUNT-ID/us-west-2 --profile NDX/InnovationSandboxHub
```

Creates CDK staging resources (S3 bucket for templates, IAM roles).

**Infrastructure Deployment:**

```bash
cd infra
cdk deploy --profile NDX/InnovationSandboxHub
```

**File Deployment:**

```bash
# From project root
yarn deploy
```

Executes `scripts/deploy.sh` using AWS CLI.

### Future: GitHub Actions CI/CD

**Growth Phase:** Automated deployment pipeline

```yaml
# .github/workflows/deploy.yml (future)
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/GitHubActionsRole
          aws-region: us-west-2
      - run: yarn build
      - run: yarn deploy
```

---

## Development Environment

### Prerequisites

**Required Software:**

- **Node.js:** 20.17.0+ (same as main application)
- **Yarn:** 4.5.0+ (Berry/v4)
- **AWS CLI:** v2.x
- **Git:** Any recent version

**AWS Configuration:**

```bash
# Verify AWS profile is configured
aws sts get-caller-identity --profile NDX/InnovationSandboxHub
```

Should return account ID and user/role info.

### Setup Commands

**Initial Setup:**

```bash
# 1. Navigate to project root
cd /path/to/ndx

# 2. Create infrastructure directory
mkdir infra
cd infra

# 3. Initialize CDK project
cdk init app --language typescript

# 4. Convert to Yarn (consistency with main app)
rm package-lock.json
yarn install

# 5. Install additional dependencies
yarn add -D eslint typescript-eslint eslint-plugin-awscdk

# 6. Create ESLint config
# (Copy eslint.config.mjs content from Implementation Patterns section)

# 7. Bootstrap CDK (one-time)
cdk bootstrap aws://ACCOUNT-ID/us-west-2 --profile NDX/InnovationSandboxHub
```

**Daily Development:**

```bash
# Run tests
cd infra
yarn test

# Lint code
yarn lint

# Preview infrastructure changes
cdk diff --profile NDX/InnovationSandboxHub

# Deploy infrastructure changes
cdk deploy --profile NDX/InnovationSandboxHub

# Build and deploy site
cd ..
yarn build
yarn deploy
```

### Local Testing

**Test Infrastructure:**

```bash
cd infra
yarn test            # Run all tests
yarn test --coverage # With coverage report
yarn test --watch    # Watch mode
```

**Validate CDK:**

```bash
cdk synth --profile NDX/InnovationSandboxHub # Generate CloudFormation
cdk diff --profile NDX/InnovationSandboxHub  # Preview changes
```

**Deployment Dry Run:**

```bash
# Check deploy script without uploading
bash -x scripts/deploy.sh # Shows commands without executing
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Use AWS CDK v2 for Infrastructure as Code

**Status:** Accepted
**Date:** 2025-11-18

**Context:**
Need infrastructure-as-code solution for deploying static site to AWS S3 with plans for future CloudFront, Lambda, and API Gateway.

**Decision:**
Use AWS CDK v2 with TypeScript.

**Rationale:**

- Type-safe infrastructure definitions
- Native AWS support and updates
- Familiar TypeScript for team
- Excellent CloudFormation generation
- Active community and weekly releases

**Consequences:**

- Requires Node.js and TypeScript knowledge
- Learning curve for CDK constructs
- Weekly version updates (manageable)

---

### ADR-002: Single Monolithic Stack for MVP

**Status:** Accepted
**Date:** 2025-11-18

**Context:**
Deciding between multiple small stacks vs. single stack for S3 bucket deployment.

**Decision:**
Single monolithic stack (`NdxStaticStack`) for MVP, with construct pattern for future extensibility.

**Rationale:**

- Simplicity for single S3 bucket
- No cross-stack dependencies
- Easy to reason about
- Construct pattern allows future separation without refactoring

**Consequences:**

- All resources deploy together
- Single CloudFormation stack
- Future growth: add constructs to existing stack or split when needed

---

### ADR-003: Enable S3 Versioning in MVP

**Status:** Accepted
**Date:** 2025-11-18

**Context:**
S3 versioning adds cost but provides rollback capability.

**Decision:**
Enable S3 versioning from day one.

**Rationale:**

- Government service needs safety net
- Minimal cost increase (< $1/month)
- Protects against accidental overwrites
- Easier rollback during deployment issues

**Consequences:**

- Slightly higher S3 storage costs
- Old versions retained (need lifecycle policy later)
- Better failure recovery

---

### ADR-004: Use ESLint Flat Config with AWS CDK Plugin

**Status:** Accepted
**Date:** 2025-11-18

**Context:**
ESLint configuration format changed in 2025. Need CDK-specific linting.

**Decision:**
Use flat config format (`eslint.config.mjs`) with `eslint-plugin-awscdk`.

**Rationale:**

- Flat config is 2025 standard
- CDK plugin catches infrastructure anti-patterns
- Modern TypeScript ESLint support
- Future-proof configuration

**Consequences:**

- No legacy `.eslintrc` files
- Team must learn flat config format
- Better CDK code quality

---

### ADR-005: Co-locate Tests with Source

**Status:** Accepted
**Date:** 2025-11-18

**Context:**
Jest tests can live in separate `test/` directory or co-located with source.

**Decision:**
Co-locate tests: `lib/ndx-stack.test.ts` alongside `lib/ndx-stack.ts`

**Rationale:**

- Standard CDK pattern
- Easier to maintain (test near code)
- Simpler imports
- Industry best practice

**Consequences:**

- Test files mixed with source in `lib/`
- `test/` directory only contains Jest config

---

### ADR-006: Manual Deployment for MVP, GitHub Actions for Growth

**Status:** Accepted
**Date:** 2025-11-18

**Context:**
Need deployment automation but GitHub Actions OIDC adds complexity.

**Decision:**
Manual deployment via `yarn deploy` script for MVP. GitHub Actions + OIDC in growth phase.

**Rationale:**

- Solo developer doesn't need CI/CD immediately
- OIDC setup requires IAM role configuration
- Proves deployment pattern first
- Clear migration path defined

**Consequences:**

- Manual deployments for MVP
- Must remember `yarn build` before `yarn deploy`
- Foundation ready for automation later

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-18_
_For: cns_
_Project: National Digital Exchange (NDX) - Infrastructure Evolution_
