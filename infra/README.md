# NDX Infrastructure

**Last Updated:** 2025-11-18
**Document Version:** 1.1
**Review:** Update this README when infrastructure changes

## Overview

This directory contains the AWS Cloud Development Kit (CDK) infrastructure code for the National Digital Exchange (NDX) static site deployment. The infrastructure is defined as code using TypeScript and AWS CDK v2, enabling version-controlled, testable, and repeatable deployments to AWS.

**Purpose:** Deploy and manage AWS infrastructure for hosting the NDX static site on S3 with future support for CloudFront CDN, authentication, and multi-environment contexts.

**Architecture Documentation:** For detailed architectural decisions, technology choices, and implementation patterns, see [../docs/infrastructure-architecture.md](../docs/infrastructure-architecture.md)

---

## Prerequisites

Before working with this infrastructure, ensure you have the following installed and configured:

### Required Software

- **Node.js:** 20.17.0 or higher
- **Yarn:** 4.5.0 or higher (Berry/v4)
- **AWS CLI:** v2.x
- **Git:** Any recent version

### AWS Configuration

You must have the AWS CLI configured with the `NDX/InnovationSandboxHub` profile.

**Verify your AWS profile is configured correctly:**

```bash
aws sts get-caller-identity --profile NDX/InnovationSandboxHub
```

**Expected output:**

```json
{
    "UserId": "...",
    "Account": "568672915267",
    "Arn": "arn:aws:sts::568672915267:..."
}
```

If the command fails, configure the AWS CLI profile before proceeding.

---

## Initial Setup

**These steps are performed once per developer workstation.**

### 1. Bootstrap CDK in AWS Account

CDK bootstrap creates the necessary AWS resources (S3 bucket, IAM roles) for CDK deployments. **This has already been completed for account 568672915267 in region us-west-2.**

If you need to bootstrap a different account or region:

```bash
# Get your AWS account ID
aws sts get-caller-identity --profile NDX/InnovationSandboxHub --query Account --output text

# Bootstrap CDK (replace ACCOUNT-ID with actual value)
cdk bootstrap aws://ACCOUNT-ID/us-west-2 --profile NDX/InnovationSandboxHub
```

### 2. Install Dependencies

```bash
cd infra
yarn install
```

### 3. Verify Build

```bash
yarn build
```

**Expected output:** TypeScript compilation completes with exit code 0, no errors.

---

## Development Workflow

### Preview Infrastructure Changes

Before deploying, preview the changes CDK will make to your AWS infrastructure:

```bash
cdk diff --profile NDX/InnovationSandboxHub
```

**Output shows:**
- Resources to be added/modified/deleted
- Property changes
- IAM policy changes

### Deploy Infrastructure

Apply infrastructure changes to AWS:

```bash
cdk deploy --profile NDX/InnovationSandboxHub
```

**Deployment process:**
1. CDK synthesizes CloudFormation template
2. CloudFormation creates a change set
3. You confirm the changes (or use `--require-approval never`)
4. CloudFormation applies changes with automatic rollback on failure

---

## Testing

### Unit Tests

Execute the Jest test suite to validate infrastructure code:

```bash
yarn test
```

**Tests include:**
- Snapshot tests for CloudFormation template validation
- Fine-grained assertions for critical S3 bucket properties

### Linting

Run ESLint with AWS CDK plugin to check code quality:

```bash
yarn lint
```

**Fix linting issues automatically:**

```bash
yarn lint:fix
```

### Integration Test (Optional Quality Gate)

An integration test is available that deploys infrastructure to real AWS, validates deployment, and cleans up automatically. **This test is optional and not required for MVP.**

**Run integration test:**

```bash
./test/integration.sh
```

**What it does:**
1. Deploys stack to test environment using CDK context (`--context env=test`)
2. Creates test bucket: `ndx-static-test` (separate from production)
3. Verifies bucket exists and is accessible via AWS CLI
4. Automatically destroys stack and cleans up all test resources
5. Reports pass/fail with clear exit codes

**Issues caught:**
- Bucket name conflicts (global S3 namespace)
- IAM permission problems
- Region availability issues
- Real AWS deployment failures that unit tests miss

**When to run:**
- Before major infrastructure changes
- Pre-production deployment validation
- When testing multi-environment context support
- Troubleshooting AWS-specific issues

**Note:** Integration test uses the same AWS profile (`NDX/InnovationSandboxHub`) and deploys to real AWS. Test resources are automatically cleaned up, but ensure you have appropriate permissions.

**Test Execution Order:**
For comprehensive validation, run tests in this sequence:
1. Lint check: `yarn lint`
2. Unit tests: `yarn test`
3. Optional: Integration test: `./test/integration.sh`

---

## Deployment Process

This section covers deploying the static site files to S3. For infrastructure changes, see the [Development Workflow](#development-workflow) section above.

### Build the Site

Before deployment, build the Eleventy static site from the project root:

```bash
# Navigate to project root (if not already there)
cd /path/to/ndx

# Build the site
yarn build
```

**Expected output:** Eleventy generates the `_site/` directory with all static files.

### Deploy Site Files

Deploy the built site to the S3 bucket:

```bash
# From project root
yarn deploy
```

**What this does:**
1. Validates that `_site/` directory exists (fails with clear error if missing)
2. Syncs all files from `_site/` to `s3://ndx-static-prod/` using AWS CLI
3. Deletes files in S3 that are not in `_site/` (keeps bucket clean)
4. Only uploads changed files (uses `--exact-timestamps` for efficiency)
5. Sets cache control headers for future CloudFront optimization
6. Validates file count matches expected (catches incomplete uploads)
7. Reports deployment success with file count

**Expected output:**

```
Deploying to ndx-static-prod...
upload: _site/index.html to s3://ndx-static-prod/index.html
upload: _site/catalogue/index.html to s3://ndx-static-prod/catalogue/index.html
...
✓ Deployment complete: 165 files uploaded
```

### Verify Deployment

**Note:** The site is **not publicly accessible** in the MVP phase. This is intentional and correct per security requirements.

**Why site is not accessible:**
The S3 bucket is configured with all public access blocked (`BlockPublicAccess: BLOCK_ALL`). CloudFront CDN will be required to enable public access in the growth phase.

**To verify files were uploaded successfully:**

```bash
# List files in the bucket
aws s3 ls s3://ndx-static-prod/ --recursive --profile NDX/InnovationSandboxHub

# Download a specific file to verify content
aws s3 cp s3://ndx-static-prod/index.html /tmp/index.html --profile NDX/InnovationSandboxHub
cat /tmp/index.html
```

**Smoke test validation (Story 3.7):** Post-deployment smoke test will be added in Story 3.7 to automatically validate file presence and report deployment status.

### Access Pattern

**Current Status (MVP):**
- Files uploaded to S3: ✓ Success
- Public site access: ✗ Not available (returns 403 Forbidden)
- Reason: Bucket has all public access blocked per security requirements

**Future Access (Growth Phase):**
CloudFront CDN will be added to enable public site access. CloudFront Origin Access Identity (OAI) will grant read access to the private S3 bucket. No bucket configuration changes will be needed.

---

## Infrastructure Changes

Understanding when to run infrastructure deployment (`cdk deploy`) versus file deployment (`yarn deploy`) is critical for efficient operations.

### When to Deploy Infrastructure

Run `cdk deploy` when you modify any infrastructure code:

**Triggers:**
- Changes to TypeScript files in `lib/*.ts` (stack definitions, constructs)
- Changes to `bin/infra.ts` (CDK app entry point)
- Adding/modifying AWS resources (S3 buckets, IAM roles, CloudFront distributions)
- Updating resource properties (encryption, versioning, tags, policies)
- CDK or dependency version updates in `package.json`

**Workflow:**
```bash
cd infra

# 1. Lint code
yarn lint

# 2. Run tests
yarn test

# 3. Preview changes
cdk diff --profile NDX/InnovationSandboxHub

# 4. Deploy infrastructure
cdk deploy --profile NDX/InnovationSandboxHub
```

**Time:** ~2-5 minutes (CloudFormation deployment)

### When to Deploy Files Only

Run `yarn deploy` when you modify only site content:

**Triggers:**
- Changes to Eleventy source files in `src/` directory
- Updates to content, templates, or assets
- Configuration changes in `eleventy.config.js`
- Any change that affects `_site/` build output but not AWS infrastructure

**Workflow:**
```bash
# From project root

# 1. Build site
yarn build

# 2. Deploy files
yarn deploy
```

**Time:** ~30 seconds to 2 minutes (depending on file count and network)

### Decision Flowchart

```
Did you modify files in infra/lib/ or infra/bin/?
├─ Yes → Run infrastructure workflow (lint, test, diff, cdk deploy)
│         Then optionally run file deployment if content also changed
│
└─ No → Did you modify files in src/ or eleventy.config.js?
         ├─ Yes → Run file deployment workflow (build, deploy)
         └─ No → No deployment needed
```

---

## Maintenance

### Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2025-11-18 | Added Testing, Deployment Process, Infrastructure Changes, and Maintenance sections. Reorganized Development Workflow. Enhanced with deployment automation details and living document maintenance process. |
| 1.0 | 2025-11-18 | Initial README created with infrastructure setup, development workflow, site access explanation, troubleshooting, and project structure. |

### Review Cadence

**When to review this README:**
- Monthly review for accuracy and completeness
- Whenever infrastructure code changes (new resources, updated workflows)
- After completing infrastructure-related stories
- When onboarding new team members (validate instructions are current)

### Update Responsibility

**Who updates this README:**
The developer making infrastructure changes is responsible for updating this README to reflect those changes.

**What triggers README updates:**
- New sections added or removed
- Command changes (new flags, different syntax)
- Workflow updates (new steps, modified sequence)
- Prerequisite changes (new software versions, configuration requirements)
- New troubleshooting guidance based on issues encountered

**How to update:**
1. Make infrastructure changes
2. Update relevant README sections
3. Increment document version (e.g., 1.1 → 1.2)
4. Update "Last Updated" date
5. Add entry to Version History table
6. Commit with message: `docs(infra): [description of changes]`

**Keeping documentation current:**
This README is a living document. Stale documentation causes confusion and errors. By following the update responsibility above, we ensure the README evolves with the infrastructure and remains accurate for all team members.

---

## Site Access

**IMPORTANT:** The S3 bucket is configured with maximum security (all public access blocked). This is the correct production-ready configuration.

**Current Status (MVP):**
- **Site NOT publicly accessible** via S3
- Files can be uploaded successfully to the bucket
- Attempting to access files directly returns `403 Forbidden`
- This is intentional and expected behavior

**Reason:**
The bucket has `BlockPublicAccess: BLOCK_ALL` enabled per security requirements (NFR-SEC-1). Static website hosting is disabled per architectural design.

**Future Access (Growth Phase):**
CloudFront CDN will be added to enable public site access. CloudFront will use Origin Access Identity (OAI) to read from the private S3 bucket. No bucket configuration changes will be needed.

**For Developers:**
If you need to verify files were uploaded correctly:

```bash
# List files in the bucket
aws s3 ls s3://ndx-static-prod/ --recursive --profile NDX/InnovationSandboxHub

# Download a specific file to verify content
aws s3 cp s3://ndx-static-prod/index.html /tmp/index.html --profile NDX/InnovationSandboxHub
cat /tmp/index.html
```

---

## Troubleshooting

### Common Errors and Solutions

#### 1. Profile Not Found

**Error:**

```
The config profile (NDX/InnovationSandboxHub) could not be found
```

**Solution:** Configure the AWS CLI with the NDX/InnovationSandboxHub profile. Contact your AWS administrator for credentials.

#### 2. Insufficient Permissions

**Error:**

```
User: arn:aws:iam::xxx:user/xxx is not authorized to perform: [action]
```

**Solution:** Your AWS credentials must have AdministratorAccess or equivalent permissions. Contact your AWS administrator to request access.

#### 3. Bootstrap Missing (Assets Bucket Not Found)

**Error:**

```
Need to perform AWS calls for account xxx, but no credentials found
```

or

```
This stack uses assets, so the toolkit stack must be deployed
```

**Solution:** Run the CDK bootstrap command (see Initial Setup section above).

#### 4. Already Bootstrapped

Bootstrap is idempotent — re-running the bootstrap command is safe and will update resources if needed. If you see a message that the stack already exists, this is expected behavior.

#### 5. Region Mismatch

**Error:**

```
Region us-east-1 is not available
```

**Solution:** Ensure your AWS profile is configured for region `us-west-2`:

```bash
aws configure get region --profile NDX/InnovationSandboxHub
```

If the region is incorrect, update it:

```bash
aws configure set region us-west-2 --profile NDX/InnovationSandboxHub
```

### Debugging CloudFormation Failures

If a deployment fails, view CloudFormation events for detailed error information:

**Via AWS Console:**
1. Navigate to CloudFormation service
2. Select the stack (e.g., `InfraStack`)
3. Click the "Events" tab
4. Review error messages in reverse chronological order

**Via AWS CLI:**

```bash
aws cloudformation describe-stack-events \
  --stack-name InfraStack \
  --profile NDX/InnovationSandboxHub \
  --max-items 20
```

---

## Project Structure

```
infra/
├── bin/
│   └── infra.ts            # CDK app entry point
├── lib/
│   ├── infra-stack.ts      # Main stack definition
│   └── infra-stack.test.ts # Stack tests
├── node_modules/           # Dependencies (gitignored)
├── cdk.out/                # CDK output (gitignored)
├── cdk.json                # CDK configuration
├── cdk.context.json        # CDK context (gitignored)
├── eslint.config.mjs       # ESLint flat config
├── package.json            # NPM dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── yarn.lock               # Yarn lockfile (tracked in git)
└── README.md               # This file
```

---

## Additional Resources

- **AWS CDK Documentation:** https://docs.aws.amazon.com/cdk/
- **AWS CDK TypeScript Reference:** https://docs.aws.amazon.com/cdk/api/v2/docs/aws-construct-library.html
- **Infrastructure Architecture:** [../docs/infrastructure-architecture.md](../docs/infrastructure-architecture.md)
- **Epic Breakdown:** [../docs/epics.md](../docs/epics.md)
- **Project PRD:** [../docs/prd.md](../docs/prd.md)

---

**Maintainer:** cns
**Project:** National Digital Exchange (NDX) - Infrastructure Evolution
**License:** MIT
