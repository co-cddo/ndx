# ndx - Epic Breakdown

**Author:** cns
**Date:** 2025-11-18
**Project:** National Digital Exchange - Infrastructure Evolution
**Domain:** GovTech (UK Government)

---

## Overview

This document provides the complete epic and story breakdown for the NDX Infrastructure Evolution project, decomposing the requirements from the [PRD](./prd.md) into implementable stories with full technical context from the [Infrastructure Architecture](./infrastructure-architecture.md).

**Context Incorporated:**

- ✅ PRD requirements (26 FRs, 23 NFRs)
- ✅ Infrastructure Architecture technical decisions

---

## Functional Requirements Inventory

### Infrastructure Provisioning

- **FR1:** System can define S3 bucket (`ndx-static-prod`) as Infrastructure-as-Code using AWS CDK TypeScript
- **FR2:** System can deploy S3 bucket to AWS us-west-2 region using `NDX/InnovationSandboxHub` profile
- **FR3:** System can configure S3 bucket for CloudFront origin access (public access blocked, prepared for CDN)
- **FR4:** Infrastructure code can be validated locally via `cdk synth` before deployment
- **FR5:** Infrastructure changes can be previewed via `cdk diff` before applying to AWS
- **FR6:** Infrastructure can be deployed to AWS via `cdk deploy` command
- **FR7:** Infrastructure deployments are idempotent (re-running deploy with no changes causes no AWS updates)

### File Deployment

- **FR8:** System can upload all files from `_site/` directory to `ndx-static-prod` S3 bucket
- **FR9:** Deployment script can use AWS CLI with `NDX/InnovationSandboxHub` profile for S3 upload
- **FR10:** Deployment preserves file structure and MIME types during S3 upload
- **FR11:** Deployment can be triggered via `yarn deploy` command from project root
- **FR12:** Deployment requires successful `yarn build` to complete before uploading files

### Infrastructure Quality & Testing

- **FR13:** CDK infrastructure code can be tested via snapshot tests (CloudFormation template validation)
- **FR14:** CDK infrastructure code can be tested via fine-grained assertions (bucket properties, encryption, naming)
- **FR15:** CDK TypeScript code can be linted via ESLint with AWS CDK recommended rules
- **FR16:** All infrastructure tests must pass before deployment is allowed
- **FR17:** Infrastructure code can be version-controlled in git with appropriate .gitignore for CDK artifacts

### Documentation & Maintainability

- **FR18:** Infrastructure setup, deployment process, and architecture are documented in `/infra/README.md`
- **FR19:** Deployment workflow is documented for team members to understand manual deployment process
- **FR20:** CDK code follows TypeScript and AWS CDK best practices for long-term maintainability

### Rollback & Safety

- **FR21:** Infrastructure changes can be reviewed before applying (via `cdk diff`)
- **FR22:** S3 bucket supports versioning for file rollback capability (if enabled)
- **FR23:** Failed deployments can be investigated via CloudFormation events and logs

### Future Extensibility

- **FR24:** Infrastructure structure supports future addition of CloudFront CDN
- **FR25:** Infrastructure structure supports future addition of OIDC authentication for GitHub Actions
- **FR26:** Infrastructure structure supports future multi-environment contexts (dev/staging/prod)

---

## Epic Summary

**3 Epics** delivering AWS CDK infrastructure for UK government's NDX platform:

1. **Foundation & CDK Setup** - Establish AWS CDK project with testing and linting infrastructure
2. **S3 Infrastructure Deployment** - Deploy production S3 bucket with security and versioning
3. **Deployment Automation & Documentation** - Create deployment scripts and comprehensive documentation

---

## FR Coverage Map

- **Epic 1 (Foundation):** Enables all FRs through project setup + CDK bootstrap
- **Epic 2 (S3 Infrastructure):** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR21, FR22, FR23, FR24, FR25, FR26
- **Epic 3 (Deployment & Docs):** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20

**Pre-mortem Enhancements Applied:**

- Added CDK bootstrap story (Epic 1)
- Added bucket name validation and access pattern verification (Epic 2)
- Enhanced deployment script with error recovery (Epic 3)
- Added integration testing and smoke tests (Epic 3)
- Enhanced documentation as living document (Epic 3)

---

## Epic 1: Foundation & CDK Setup

**Goal:** Establish AWS CDK TypeScript project with testing, linting, and AWS account preparation to enable all infrastructure development.

**User Value:** Development environment fully configured and AWS account bootstrapped for CDK deployments.

**FRs Covered:** Foundational setup enabling FR1-FR26

---

### Story 1.1: Initialize CDK Project

As a developer,
I want to initialize an AWS CDK TypeScript project in the `/infra` directory,
So that I have the standard CDK structure and dependencies to define infrastructure as code.

**Acceptance Criteria:**

**Given** the project root directory exists
**When** I run `mkdir infra && cd infra && cdk init app --language typescript`
**Then** the CDK project is created with standard structure:

- `bin/infra.ts` - CDK app entry point exists
- `lib/` - Directory for stack definitions exists
- `test/` - Directory for tests exists
- `cdk.json` - CDK configuration file exists
- `package.json` - Contains `aws-cdk-lib` and `constructs` dependencies
- `tsconfig.json` - TypeScript configuration exists
- `.gitignore` - CDK-specific ignores present (`cdk.out/`, `node_modules/`)

**And** running `npm ls aws-cdk-lib` shows CDK v2.224.0 or later installed
**And** the example stack compiles successfully with `npm run build`

**Prerequisites:** None (first story)

**Technical Notes:**

- Use `cdk init app --language typescript` (official AWS CDK starter)
- Architecture specifies CDK v2.224.0 (Nov 2025 release)
- Example stack will be replaced in Epic 2, but validates setup works
- Creates foundational TypeScript + Jest + CDK structure

---

### Story 1.2: Convert to Yarn Package Manager

As a developer,
I want to convert the CDK project from npm to Yarn,
So that package management is consistent with the main NDX application.

**Acceptance Criteria:**

**Given** the CDK project is initialized with npm
**When** I run `rm package-lock.json && yarn install`
**Then** the project uses Yarn:

- `package-lock.json` is deleted
- `yarn.lock` is created
- `node_modules/` is populated via Yarn
- All dependencies resolve correctly

**And** running `yarn build` compiles TypeScript successfully
**And** running `yarn test` executes Jest tests successfully
**And** `.gitignore` includes `yarn.lock` is NOT ignored (track lockfile)

**Prerequisites:** Story 1.1 (CDK project initialized)

**Technical Notes:**

- Main NDX app uses Yarn 4.5.0 (Berry)
- Consistency reduces context switching for developers
- Yarn workspaces not needed (separate package.json in `/infra`)
- Archive: Architecture doc section 2.1 specifies Yarn for consistency

---

### Story 1.3: Configure ESLint with AWS CDK Plugin

As a developer,
I want ESLint configured with TypeScript and AWS CDK recommended rules,
So that infrastructure code follows best practices and catches common mistakes early.

**Acceptance Criteria:**

**Given** the CDK project exists with TypeScript
**When** I install and configure ESLint
**Then** ESLint is set up with:

- Dependencies installed: `eslint`, `typescript-eslint`, `eslint-plugin-awscdk`
- `eslint.config.mjs` created using flat config format (2025 standard)
- Configuration includes:
  - `@eslint/js` recommended rules
  - `typescript-eslint` recommended type-checked rules
  - `eslint-plugin-awscdk` recommended rules
- `package.json` has script: `"lint": "eslint ."`
- `package.json` has script: `"lint:fix": "eslint . --fix"`

**And** running `yarn lint` on the example stack shows no errors
**And** parserOptions.project references `tsconfig.json`
**And** ignores patterns include: `node_modules`, `cdk.out`, `cdk.context.json`, `*.js`, `coverage`

**Prerequisites:** Story 1.2 (Yarn installed)

**Technical Notes:**

- ESLint flat config (`eslint.config.mjs`) is 2025 standard (replaces `.eslintrc`)
- `eslint-plugin-awscdk` provides CDK-specific best practice rules
- Type-checked rules require `parserOptions.project: true`
- Architecture doc section 3.4 specifies exact ESLint configuration
- NFR-MAINT-1 requires ESLint with zero errors before deployment

---

### Story 1.4: Set Up Git Integration

As a developer,
I want the `/infra` directory properly configured for version control,
So that infrastructure code is tracked while CDK artifacts are excluded.

**Acceptance Criteria:**

**Given** the CDK project exists with generated `.gitignore`
**When** I verify and enhance the `.gitignore`
**Then** the following are excluded from git:

- `node_modules/`
- `cdk.out/`
- `cdk.context.json`
- `*.js` (compiled TypeScript)
- `*.d.ts` (TypeScript declarations)
- `coverage/` (test coverage reports)
- `.DS_Store` (macOS files)

**And** the following ARE tracked in git:

- `yarn.lock`
- `cdk.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `package.json`
- All `.ts` source files

**And** running `git status` in `/infra` shows only source files and configs as trackable
**And** commit message convention documented: `feat(infra):`, `test(infra):`, `fix(deploy):`

**Prerequisites:** Story 1.3 (ESLint configured)

**Technical Notes:**

- CDK init creates baseline `.gitignore`, verify completeness
- Infrastructure code must be in main repo (not separate)
- Architecture doc section 8.3 specifies version control requirements
- FR17 mandates proper .gitignore for CDK artifacts

---

### Story 1.5: Bootstrap CDK in AWS Account

As a developer,
I want to bootstrap the AWS CDK in the target AWS account and region,
So that CDK has the necessary staging resources (S3 bucket, IAM roles) to deploy stacks.

**Acceptance Criteria:**

**Given** the AWS CLI is configured with `NDX/InnovationSandboxHub` profile
**When** I run `cdk bootstrap aws://ACCOUNT-ID/us-west-2 --profile NDX/InnovationSandboxHub`
**Then** CDK bootstrap completes successfully creating:

- CDK staging S3 bucket (for CloudFormation templates and assets)
- IAM roles for CloudFormation execution
- SSM parameters for bootstrap version

**And** running `aws cloudformation describe-stacks --stack-name CDKToolkit --profile NDX/InnovationSandboxHub` shows stack exists
**And** the bootstrap version is compatible with CDK v2.224.0+
**And** bootstrap resources are tagged with `project: ndx-cdk-bootstrap`

**Prerequisites:** Story 1.4 (Git configured)

**Technical Notes:**

- **PRE-MORTEM INSIGHT:** Bootstrap is one-time AWS setup required before any `cdk deploy`
- Failure to bootstrap causes cryptic "assets bucket not found" errors
- Bootstrap creates `CDKToolkit` CloudFormation stack
- Bootstrap resources persist across stack deployments
- Architecture doc section 10.2 mentions bootstrap as prerequisite
- Must be done in target account (verify account ID matches)

---

### Story 1.6: Create Initial Infrastructure README

As a developer,
I want a `/infra/README.md` documenting setup and deployment processes,
So that team members can understand and execute infrastructure operations.

**Acceptance Criteria:**

**Given** the CDK project is fully configured
**When** I create `/infra/README.md`
**Then** the README includes:

**Section 1: Overview**

- Project name and purpose
- Link to main architecture document
- **Document version and last updated date** (living doc marker)

**Section 2: Prerequisites**

- Node.js 20.17.0+
- Yarn 4.5.0+
- AWS CLI v2.x
- Configured AWS profile: `NDX/InnovationSandboxHub`
- Verification command: `aws sts get-caller-identity --profile NDX/InnovationSandboxHub`

**Section 3: Initial Setup** (one-time)

- CDK bootstrap command with account ID
- Dependency installation: `yarn install`
- Build verification: `yarn build`

**Section 4: Development Workflow**

- Run tests: `yarn test`
- Lint code: `yarn lint`
- Preview changes: `cdk diff --profile NDX/InnovationSandboxHub`
- Deploy infrastructure: `cdk deploy --profile NDX/InnovationSandboxHub`

**Section 5: Troubleshooting**

- Common errors and solutions
- Link to CloudFormation events for debugging

**And** README follows CommonMark format
**And** Code blocks use proper syntax highlighting

**Prerequisites:** Story 1.5 (CDK bootstrapped)

**Technical Notes:**

- **PRE-MORTEM INSIGHT:** Documentation as living document, not one-time artifact
- Include version/date to track when last updated
- Will be enhanced in Epic 3 with deployment script details
- Architecture doc section 11 provides structure template
- FR18 requires complete setup instructions in README

---

## Epic 2: S3 Infrastructure Deployment

**Goal:** Deploy production-ready S3 bucket with encryption, versioning, security controls, and validation of deployment feasibility.

**User Value:** AWS infrastructure exists and is validated for hosting NDX static site files.

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR21, FR22, FR23, FR24, FR25, FR26

---

### Story 2.1: Validate S3 Bucket Name Availability

As a developer,
I want to verify the bucket name `ndx-static-prod` is available in AWS,
So that deployment won't fail due to global bucket name conflicts.

**Acceptance Criteria:**

**Given** I have AWS CLI access with `NDX/InnovationSandboxHub` profile
**When** I run `aws s3api head-bucket --bucket ndx-static-prod --profile NDX/InnovationSandboxHub 2>&1`
**Then** one of two outcomes occurs:

**Case 1: Bucket does not exist (desired)**

- Command returns 404 error
- Proceed with bucket creation in Story 2.2

**Case 2: Bucket exists**

- Command returns 200 or 403
- Document bucket name conflict
- Choose alternative: `ndx-static-prod-SUFFIX` or use CDK auto-generated names

**And** document the final bucket name decision in architecture doc
**And** if bucket exists, investigate ownership and determine if we control it

**Prerequisites:** Story 1.6 (README created)

**Technical Notes:**

- **PRE-MORTEM INSIGHT:** S3 bucket names are globally unique across all AWS accounts
- Hard-coding `ndx-static-prod` assumes it's available
- Failure discovered at deploy time is too late
- Early validation prevents wasted effort
- If name taken, CDK can generate unique names with logical ID + hash
- Architecture doc section 7.1 specifies bucket name: `ndx-static-prod`

---

### Story 2.2: Create S3 Bucket with CDK

As a developer,
I want to define the S3 bucket infrastructure using AWS CDK TypeScript,
So that the bucket is created with proper security, versioning, and tags as code.

**Acceptance Criteria:**

**Given** the CDK project is set up and bucket name validated
**When** I create `lib/ndx-stack.ts` defining the S3 bucket
**Then** the stack includes:

```typescript
import * as cdk from "aws-cdk-lib"
import * as s3 from "aws-cdk-lib/aws-s3"

export class NdxStaticStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    new s3.Bucket(this, "StaticSiteBucket", {
      bucketName: "ndx-static-prod",
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })
  }
}
```

**And** bucket configuration includes:

- Name: `ndx-static-prod` (or validated alternative)
- Encryption: SSE-S3 (AWS managed keys)
- Public access: Completely blocked (all 4 settings)
- Versioning: Enabled
- Removal policy: RETAIN (protect data on stack deletion)
- Tags: `{ project: 'ndx', environment: 'prod', managedby: 'cdk' }`

**And** running `cdk synth --profile NDX/InnovationSandboxHub` generates valid CloudFormation
**And** CloudFormation template includes `AWS::S3::Bucket` resource with correct properties

**Prerequisites:** Story 2.1 (Bucket name validated)

**Technical Notes:**

- Replace example stack from Story 1.1 with real infrastructure
- Stack name: `NdxStaticStack`
- Bin entry point (`bin/infra.ts`) instantiates this stack
- Architecture doc section 7.1 provides exact S3 configuration
- FR1: Define S3 bucket as IaC ✓
- FR3: Configure for CloudFront (blocked public access) ✓
- NFR-SEC-1, NFR-SEC-2: Security requirements ✓

---

### Story 2.3: Validate S3 Access Pattern for MVP

As a developer,
I want to verify how files in the S3 bucket will be accessed in MVP,
So that the site is actually reachable after deployment, not just uploaded.

**Acceptance Criteria:**

**Given** the S3 bucket has `BlockPublicAccess: BLOCK_ALL`
**When** I analyze the access requirements
**Then** I document the chosen access method:

**Option A: CloudFront Required for MVP**

- Bucket remains private (blocked public access)
- Files accessible only via CloudFront CDN
- CloudFront OAI granted bucket read access
- **Consequence:** Epic 3 deployment creates files but site remains dark until CloudFront added (growth phase)
- **Action:** Document in README that CloudFront is required for site access

**Option B: Temporary Static Website Hosting**

- Enable static website hosting on bucket
- Adjust public access block settings
- Files accessible via S3 website endpoint
- **Consequence:** Not prepared for CloudFront, requires migration later
- **Action:** Update CDK stack to enable `websiteIndexDocument: 'index.html'`

**And** the access decision is documented in:

- `/infra/README.md` - Deployment section
- Architecture doc - Data Architecture section updated
- Epic 3 Story 3.2 - Deployment script knows which endpoint to verify

**And** if CloudFront required, README clearly states "Site not publicly accessible until CloudFront configured"

**Prerequisites:** Story 2.2 (S3 bucket defined in CDK)

**Technical Notes:**

- **PRE-MORTEM INSIGHT:** Architecture says "static hosting: disabled" but doesn't clarify MVP access
- Team could deploy files successfully but site returns 403 Forbidden
- Must decide NOW: enable static hosting temporarily or require CloudFront from day 1
- Architecture doc says "prepared for CloudFront" - suggests CloudFront IS the plan
- Recommendation: Document that CloudFront is required, site dark until growth phase
- Alternative: Enable static hosting for MVP, migrate to CloudFront in growth

---

### Story 2.4: Deploy S3 Infrastructure to AWS

As a developer,
I want to deploy the CDK stack to AWS,
So that the S3 bucket exists in production and is ready to receive files.

**Acceptance Criteria:**

**Given** the CDK stack is defined and validated via `cdk synth`
**When** I run `cdk deploy --profile NDX/InnovationSandboxHub`
**Then** the deployment succeeds with:

- CloudFormation stack `NdxStaticStack` created in us-west-2
- S3 bucket `ndx-static-prod` exists
- Bucket has encryption enabled (verified: `aws s3api get-bucket-encryption`)
- Bucket has versioning enabled (verified: `aws s3api get-bucket-versioning`)
- Bucket has public access blocked (verified: `aws s3api get-public-access-block`)
- Bucket has tags applied (verified: `aws s3api get-bucket-tagging`)

**And** running `cdk diff --profile NDX/InnovationSandboxHub` after deployment shows no changes
**And** CloudFormation events show successful resource creation
**And** deployment is idempotent (re-running causes no changes - FR7)

**Prerequisites:** Story 2.3 (Access pattern validated and documented)

**Technical Notes:**

- First real infrastructure deployment to AWS
- Use `--profile NDX/InnovationSandboxHub` for authentication
- CloudFormation creates stack with automatic rollback on failure
- Deployment takes ~2-3 minutes (S3 bucket creation)
- Architecture doc section 10.2 documents deployment command
- FR2: Deploy to us-west-2 ✓
- FR6: Deploy via cdk deploy ✓
- FR7: Idempotent deployments ✓
- NFR-REL-1: Idempotent ✓
- NFR-REL-2: Auto-rollback ✓

---

## Epic 3: Deployment Automation & Documentation

**Goal:** Create automated deployment scripts with error recovery, comprehensive testing, and living documentation to enable reliable site deployments.

**User Value:** Team can reliably deploy NDX static site with confidence, validation, and clear documentation.

**FRs Covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20

---

### Story 3.1: Create Root Package.json Deploy Script

As a developer,
I want a `yarn deploy` command in the root package.json,
So that deployment is triggered from the project root with a simple command.

**Acceptance Criteria:**

**Given** the root `package.json` exists
**When** I add the deploy script
**Then** `package.json` includes:

```json
{
  "scripts": {
    "deploy": "scripts/deploy.sh"
  }
}
```

**And** the `scripts/` directory is created at project root
**And** `scripts/deploy.sh` placeholder file exists (will be implemented in Story 3.2)
**And** running `yarn deploy` executes the script (even if placeholder)

**Prerequisites:** Story 2.4 (S3 bucket deployed to AWS)

**Technical Notes:**

- Deployment automation lives at root, not in `/infra`
- Keeps infrastructure (CDK) separate from deployment (site files)
- Architecture doc section 5.3 specifies `yarn deploy` at root
- FR11: Deploy via yarn deploy ✓

---

### Story 3.2: Implement Deployment Script with Error Recovery

As a developer,
I want a robust deployment script that uploads files to S3 with error handling,
So that deployments are reliable and recoverable from failures.

**Acceptance Criteria:**

**Given** the `_site/` directory exists with built Eleventy site
**When** I run `yarn deploy`
**Then** `scripts/deploy.sh` executes with:

```bash
#!/bin/bash
set -e # Exit on any error

# Prerequisite check
if [ ! -d "_site" ]; then
  echo "Error: _site/ directory not found. Run 'yarn build' first."
  exit 1
fi

# Deploy to S3
echo "Deploying to ndx-static-prod..."
aws s3 sync _site/ s3://ndx-static-prod/ \
  --profile NDX/InnovationSandboxHub \
  --delete \
  --exact-timestamps \
  --cache-control "public, max-age=3600" \
  --exclude ".DS_Store"

# Validate upload
EXPECTED_FILES=$(find _site -type f | wc -l | tr -d ' ')
UPLOADED_FILES=$(aws s3 ls s3://ndx-static-prod/ --recursive --profile NDX/InnovationSandboxHub | wc -l | tr -d ' ')

if [ "$EXPECTED_FILES" -ne "$UPLOADED_FILES" ]; then
  echo "Warning: File count mismatch. Expected: $EXPECTED_FILES, Uploaded: $UPLOADED_FILES"
  exit 1
fi

echo "✓ Deployment complete: $UPLOADED_FILES files uploaded"
```

**And** script is executable: `chmod +x scripts/deploy.sh`
**And** `--delete` flag removes files not in `_site/` (keeps bucket clean)
**And** `--exact-timestamps` enables idempotent re-runs (only uploads changed files)
**And** `--cache-control` sets headers for future CloudFront optimization
**And** file count validation ensures complete upload
**And** MIME types are auto-detected by AWS CLI (`.html`, `.css`, `.js`, `.svg`)

**Prerequisites:** Story 3.1 (Deploy script placeholder created)

**Technical Notes:**

- **PRE-MORTEM INSIGHT:** Network failures mid-upload leave bucket in broken state
- `--exact-timestamps` makes script idempotent (re-run only uploads changes)
- File count check catches incomplete uploads
- AWS CLI auto-detects MIME types correctly for standard web files
- Architecture doc section 5.3 shows deploy script example
- FR8: Upload all files from \_site ✓
- FR9: Use AWS CLI with profile ✓
- FR10: Preserve file structure and MIME types ✓
- FR12: Require yarn build first ✓
- NFR-REL-3: Clear error messages ✓

---

### Story 3.3: Write CDK Snapshot Tests

As a developer,
I want snapshot tests for the CDK stack,
So that unintended infrastructure changes are detected automatically.

**Acceptance Criteria:**

**Given** the CDK stack is implemented
**When** I create `lib/ndx-stack.test.ts` with snapshot tests
**Then** the test file includes:

```typescript
import { Template } from "aws-cdk-lib/assertions"
import * as cdk from "aws-cdk-lib"
import { NdxStaticStack } from "./ndx-stack"

test("Stack snapshot matches expected CloudFormation", () => {
  const app = new cdk.App()
  const stack = new NdxStaticStack(app, "TestStack")
  const template = Template.fromStack(stack)

  expect(template.toJSON()).toMatchSnapshot()
})
```

**And** running `yarn test` generates snapshot file
**And** snapshot captures complete CloudFormation template including:

- S3 bucket resource definition
- Bucket properties (encryption, versioning, public access block)
- Tags

**And** subsequent runs pass (snapshot matches)
**And** any CDK code change that alters CloudFormation causes test failure
**And** test failure message clearly shows CloudFormation differences

**Prerequisites:** Story 3.2 (Deployment script implemented)

**Technical Notes:**

- Snapshot tests provide broad coverage with minimal code
- Catches ANY unintended CloudFormation changes
- Jest `toMatchSnapshot()` creates `__snapshots__/` directory
- Snapshots committed to git (version controlled)
- Architecture doc section 6.2 provides snapshot test example
- FR13: Snapshot tests for CloudFormation template ✓
- NFR-MAINT-2: 100% snapshot coverage ✓

---

### Story 3.4: Write Fine-Grained Assertion Tests

As a developer,
I want specific assertion tests for critical S3 bucket properties,
So that security and configuration requirements are explicitly validated.

**Acceptance Criteria:**

**Given** the CDK stack is implemented
**When** I add fine-grained assertions to `lib/ndx-stack.test.ts`
**Then** the test file includes specific property validations:

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

**And** running `yarn test` validates all properties pass
**And** test failure clearly identifies which property is incorrect
**And** tests validate NFR requirements:

- Encryption enabled (NFR-SEC-2)
- Public access blocked (NFR-SEC-1)
- Versioning enabled (FR22)
- Tags present (NFR-OPS-4)

**Prerequisites:** Story 3.3 (Snapshot tests created)

**Technical Notes:**

- Fine-grained assertions complement snapshots
- Explicit validation of security-critical properties
- CDK assertions library: `Template.hasResourceProperties()`
- Tests fail early if security requirements violated
- Architecture doc section 6.2 provides assertion test example
- FR14: Fine-grained assertions for bucket properties ✓
- FR16: Tests must pass before deployment ✓

---

### Story 3.5: Create Integration Test for AWS Deployment

As a developer,
I want an integration test that deploys to a test AWS environment,
So that I can catch real AWS deployment issues before production.

**Acceptance Criteria:**

**Given** I have access to a test AWS account or namespace
**When** I create an integration test script
**Then** `test/integration.sh` includes:

```bash
#!/bin/bash
set -e

echo "Running integration test..."

# Deploy stack with test context
cdk deploy NdxStaticStack --context env=test --profile NDX/InnovationSandboxHub --require-approval never

# Verify deployment
aws s3 ls s3://ndx-static-test/ --profile NDX/InnovationSandboxHub > /dev/null

# Cleanup
cdk destroy NdxStaticStack --context env=test --profile NDX/InnovationSandboxHub --force

echo "✓ Integration test passed"
```

**And** test uses CDK context to deploy to test bucket name
**And** test verifies stack deploys successfully to real AWS
**And** test cleans up resources after validation
**And** test is documented in README as optional quality gate
**And** test catches issues like:

- Bucket name conflicts
- IAM permission problems
- Region availability issues

**Prerequisites:** Story 3.4 (Assertion tests created)

**Technical Notes:**

- **PRE-MORTEM INSIGHT:** Unit tests validate CloudFormation but miss real AWS issues
- Integration test deploys to actual AWS, catches environment-specific failures
- Uses CDK context (`--context env=test`) to parameterize bucket name
- Optional for MVP (can be run manually pre-production)
- Cleanup prevents resource accumulation
- Architecture doc mentions integration testing as quality gate

---

### Story 3.6: Enhance README as Living Document

As a developer,
I want the `/infra/README.md` updated with deployment details and maintenance process,
So that documentation evolves with the infrastructure and remains accurate.

**Acceptance Criteria:**

**Given** the initial README exists from Story 1.6
**When** I enhance the README with deployment automation details
**Then** the README includes new sections:

**Section 6: Deployment Process**

- Build site: `yarn build` (from project root)
- Deploy files: `yarn deploy` (from project root)
- Verify deployment: [smoke test command from Story 3.7]
- Access pattern: [From Story 2.3 decision - static hosting or CloudFront required]

**Section 7: Testing**

- Unit tests: `yarn test` (snapshot + assertions)
- Integration test: `test/integration.sh` (optional)
- Linting: `yarn lint`

**Section 8: Infrastructure Changes**

- When to re-deploy infrastructure vs just files
- Infrastructure: `cdk deploy` when `lib/*.ts` changes
- Files only: `yarn deploy` when `src/` content changes

**Section 9: Maintenance**

- **Document version:** Current version and last updated date
- **Review cadence:** README reviewed monthly or when infrastructure changes
- **Update responsibility:** Developer making infrastructure changes updates README

**And** document header includes:

```markdown
**Last Updated:** 2025-11-18
**Document Version:** 1.1
**Review:** Update this README when infrastructure changes
```

**And** all command examples use correct AWS profile
**And** README updated in git with commit: `docs(infra): enhance README with deployment and maintenance`

**Prerequisites:** Story 3.5 (Integration test created)

**Technical Notes:**

- **PRE-MORTEM INSIGHT:** Documentation as one-time deliverable goes stale immediately
- Living document with version/date tracking
- Maintenance section establishes update responsibility
- Architecture doc section 11 provides README structure
- FR18: Infrastructure documented in README ✓
- FR19: Deployment workflow documented ✓
- NFR-MAINT-5: Complete setup instructions ✓

---

### Story 3.7: Add Post-Deployment Smoke Test

As a developer,
I want automated validation after deployment,
So that I know the site is actually working, not just uploaded.

**Acceptance Criteria:**

**Given** the deployment script completes successfully
**When** I add smoke test validation to `scripts/deploy.sh`
**Then** the script includes post-deployment verification:

```bash
# Smoke test (after sync completes)
echo "Running smoke test..."

# Based on Story 2.3 access decision:
# Option A: If CloudFront required
# echo "Note: Site not publicly accessible until CloudFront configured"
# echo "Validate files uploaded: aws s3 ls s3://ndx-static-prod/index.html"

# Option B: If static hosting enabled
# SITE_URL="http://ndx-static-prod.s3-website-us-west-2.amazonaws.com"
# HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $SITE_URL)
# if [ "$HTTP_STATUS" != "200" ]; then
#   echo "Error: Site returned $HTTP_STATUS, expected 200"
#   exit 1
# fi
# echo "✓ Site accessible at $SITE_URL"
```

**And** if static hosting enabled (from Story 2.3):

- Script makes HTTP request to S3 website endpoint
- Validates 200 response
- Validates index.html contains expected content (basic string match)

**And** if CloudFront required (from Story 2.3):

- Script validates index.html exists in bucket
- Script outputs message: "Site deployed but not publicly accessible until CloudFront configured"

**And** deployment only reports success if smoke test passes
**And** smoke test failure provides actionable error message

**Prerequisites:** Story 3.6 (README enhanced)

**Technical Notes:**

- **PRE-MORTEM INSIGHT:** "Deployment complete" doesn't mean "site works"
- Smoke test validates actual accessibility/functionality
- Implementation depends on Story 2.3 access decision
- For static hosting: HTTP 200 check sufficient
- For CloudFront: Just validate file presence (can't test accessibility until CDN added)
- Future: When CloudFront added, update smoke test to check CDN endpoint

---

## FR Coverage Matrix

| FR   | Description                                        | Epic           | Stories                        |
| ---- | -------------------------------------------------- | -------------- | ------------------------------ |
| FR1  | Define S3 bucket as IaC using AWS CDK TypeScript   | Epic 2         | Story 2.2                      |
| FR2  | Deploy S3 bucket to us-west-2 using profile        | Epic 2         | Story 2.4                      |
| FR3  | Configure S3 for CloudFront origin access          | Epic 2         | Story 2.2, 2.3                 |
| FR4  | Validate infrastructure via `cdk synth`            | Epic 2         | Story 2.2, 2.4                 |
| FR5  | Preview changes via `cdk diff`                     | Epic 2         | Story 2.4                      |
| FR6  | Deploy infrastructure via `cdk deploy`             | Epic 2         | Story 2.4                      |
| FR7  | Idempotent infrastructure deployments              | Epic 2         | Story 2.4                      |
| FR8  | Upload all files from `_site/` to S3               | Epic 3         | Story 3.2                      |
| FR9  | Use AWS CLI with profile for S3 upload             | Epic 3         | Story 3.2                      |
| FR10 | Preserve file structure and MIME types             | Epic 3         | Story 3.2                      |
| FR11 | Deploy via `yarn deploy` command                   | Epic 3         | Story 3.1, 3.2                 |
| FR12 | Require `yarn build` before deployment             | Epic 3         | Story 3.2                      |
| FR13 | CDK snapshot tests (CloudFormation validation)     | Epic 3         | Story 3.3                      |
| FR14 | CDK fine-grained assertions (bucket properties)    | Epic 3         | Story 3.4                      |
| FR15 | ESLint with AWS CDK recommended rules              | Epic 1         | Story 1.3                      |
| FR16 | Tests must pass before deployment                  | Epic 3         | Story 3.3, 3.4                 |
| FR17 | Version control with proper .gitignore             | Epic 1         | Story 1.4                      |
| FR18 | Infrastructure documented in README                | Epic 1, Epic 3 | Story 1.6, 3.6                 |
| FR19 | Deployment workflow documented                     | Epic 3         | Story 3.6                      |
| FR20 | CDK code follows best practices                    | Epic 1, Epic 2 | Story 1.3, 2.2                 |
| FR21 | Review infrastructure changes before applying      | Epic 2         | Story 2.4                      |
| FR22 | S3 versioning for rollback capability              | Epic 2         | Story 2.2                      |
| FR23 | Failed deployment investigation via CloudFormation | Epic 2         | Story 2.4                      |
| FR24 | Infrastructure supports future CloudFront          | Epic 2         | Story 2.2, 2.3                 |
| FR25 | Infrastructure supports future OIDC                | Epic 1         | Story 1.5 (bootstrap prepares) |
| FR26 | Infrastructure supports multi-environment contexts | Epic 3         | Story 3.5 (test context)       |

**Coverage Validation:** All 26 FRs mapped to stories ✓

---

## Epic Story Count Summary

- **Epic 1 (Foundation & CDK Setup):** 6 stories
- **Epic 2 (S3 Infrastructure Deployment):** 4 stories
- **Epic 3 (Deployment Automation & Documentation):** 7 stories

**Total:** 17 implementable stories with pre-mortem enhancements

---

## Summary

This epic breakdown transforms the NDX Infrastructure Evolution PRD into 17 bite-sized, implementable stories across 3 epics. All 26 functional requirements are covered with full architectural context from the Infrastructure Architecture document.

**Key Strengths:**

- **Pre-mortem insights applied:** Bootstrap story added, bucket validation, error recovery, integration tests, smoke tests, living documentation
- **Vertical slicing:** Each story delivers complete functionality, not just one layer
- **Clear prerequisites:** Sequential dependencies only (no forward references)
- **BDD acceptance criteria:** Given/When/Then format for all stories
- **Architecture integration:** Technical notes reference specific architecture doc sections
- **Security first:** Encryption, public access blocking, versioning from day one
- **Quality gates:** Testing, linting, validation before deployment
- **Living documentation:** README includes version/date and maintenance responsibility

**Implementation Approach:**

1. Execute stories sequentially within each epic
2. Each story is sized for single developer session completion
3. All tests must pass before moving to next story
4. Documentation updated continuously, not at the end

**Context for Phase 4:**

- PRD provides functional requirements (WHAT capabilities)
- Infrastructure Architecture provides technical decisions (HOW to implement)
- Epics provide tactical implementation plan (STORY-BY-STORY breakdown)
- Development agent will use all three documents to implement each story

---

**Next Workflow:** Phase 3 - Sprint Planning

Create sprint status file from these epics and begin Phase 4 implementation.

---

_For implementation: Each story contains complete acceptance criteria, prerequisites, and technical notes for autonomous development agent execution._
