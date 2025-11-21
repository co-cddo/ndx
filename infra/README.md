# NDX Infrastructure

**Last Updated:** 2025-11-21
**Document Version:** 1.3
**Review:** Update this README when infrastructure changes

## Overview

This directory contains the AWS Cloud Development Kit (CDK) infrastructure code for the National Digital Exchange (NDX) static site deployment. The infrastructure is defined as code using TypeScript and AWS CDK v2, enabling version-controlled, testable, and repeatable deployments to AWS.

**Purpose:** Deploy and manage AWS infrastructure for hosting the NDX static site on S3 with CloudFront CDN cookie-based routing for safe testing of new UI versions.

**Architecture Documentation:** For detailed architectural decisions, technology choices, and implementation patterns, see [../docs/infrastructure-architecture.md](../docs/infrastructure-architecture.md) and [../docs/architecture.md](../docs/architecture.md)

---

## CloudFront Cookie-Based Routing

### Overview

The NDX CloudFront distribution uses cookie-based routing to enable safe testing of new UI versions before full production rollout. This implements the strangler pattern for gradual UI migration.

- **Cookie Name:** `NDX` (case-sensitive)
- **Cookie Value:** `true` (exact match, case-sensitive)
- **Behavior:**
  - With `NDX=true`: Routes to `ndx-static-prod` S3 bucket (new UI)
  - Without cookie: Routes to existing S3Origin (production site)
  - API routes: Unaffected (API Gateway origin unchanged)

### How to Test New UI

Testers can easily opt-in to see the new UI version by setting a cookie in their browser:

1. Open browser DevTools Console (F12)
2. Set cookie: `document.cookie = "NDX=true; path=/"`
3. Browse to https://d7roov8fndsis.cloudfront.net/
4. You should see content from new S3 bucket
5. To revert: `document.cookie = "NDX=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/"`

**Notes:**
- Cookie must be set exactly as shown (case-sensitive)
- Cookie applies to all pages on the site
- Cookie persists until manually removed or browser closed
- No admin interface required - testers self-manage cookies

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

### CloudFront Infrastructure Deployment

When deploying CloudFront configuration changes (origins, functions, cache behaviors), follow this process:

#### Pre-Deployment Validation (Automated)

**Before deploying**, run the automated pre-deployment validation script to catch issues early:

```bash
cd infra
yarn pre-deploy
```

**What the script validates:**

The pre-deployment script runs 10 automated checks to ensure your environment is ready for deployment:

1. **Dependencies installed** - Verifies `node_modules` directory exists
2. **Node.js version** - Confirms version >= 20.17.0
3. **TypeScript compilation** - Ensures code compiles without errors
4. **Linting clean** - Checks code quality standards
5. **Tests pass** - Validates all Jest tests succeed
6. **CDK synthesis** - Confirms CloudFormation template generates correctly
7. **AWS credentials** - Verifies profile `NDX/InnovationSandboxHub` is authenticated
8. **CDK bootstrap** - Ensures CDKToolkit stack exists in AWS account
9. **CloudFront distribution health** - Confirms distribution E3THG4UHYDHVWP is in "Deployed" state
10. **Origin Access Control** - Validates OAC E3P8MA1G9Y5BYE exists

**Script behavior:**
- Completes in < 30 seconds
- Runs all checks even if early ones fail (provides complete error picture)
- Exit code 0 = all checks passed (safe to deploy)
- Exit code 1 = one or more checks failed (fix errors before deploying)

**Example output:**

```
===================================
Pre-Deployment Checklist
===================================

✓ Checking dependencies...
✅ Dependencies installed

✓ Validating Node.js version...
✅ Node.js version compatible (v22.19.0)

...

===================================
✅ All checks passed!
Ready to deploy: cdk deploy --profile NDX/InnovationSandboxHub
===================================
```

**Important:** The pre-deployment script must pass before running `cdk deploy`. If checks fail, review error messages and fix issues before attempting deployment.

#### Pre-Deployment Checklist (Manual)

Before deploying CloudFront changes, ensure all validations pass:

- [ ] All tests pass: `yarn test`
- [ ] Linting clean: `yarn lint`
- [ ] CDK diff reviewed: `cdk diff --profile NDX/InnovationSandboxHub`
- [ ] API Gateway origin unchanged in diff
- [ ] Team notified of deployment window (CloudFront changes take 10-15 minutes to propagate)

#### Deploy CloudFront Changes

```bash
cd infra
cdk deploy --profile NDX/InnovationSandboxHub
```

**Deployment Timeline:**
- CloudFormation update: ~2-5 minutes
- CloudFront global propagation: ~10-15 minutes
- Total deployment time: ~15-20 minutes

#### Post-Deployment Validation

After CloudFront deployment completes and propagates:

1. **Verify distribution status:**
   ```bash
   aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.Status'
   # Output: "Deployed" when changes are live
   ```

2. **Run integration test (if available):**
   ```bash
   ./test/integration.sh
   ```

3. **Manual cookie routing test:**
   - Test without cookie: Browse to site, verify existing UI loads
   - Set cookie: `document.cookie = "NDX=true; path=/"`
   - Reload page, verify new UI loads
   - Clear cookie, verify revert to existing UI

4. **Check CloudWatch metrics for errors** (see [Monitoring](#monitoring) section)

### Static Site File Deployment

This section covers deploying the static site files to S3. For infrastructure changes, see the CloudFront Infrastructure Deployment section above.

#### Build the Site

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
7. **Runs smoke test** to validate critical files exist in bucket
8. Reports deployment success with file count

**Expected output:**

```
Deploying to ndx-static-prod...
upload: _site/index.html to s3://ndx-static-prod/index.html
upload: _site/catalogue/index.html to s3://ndx-static-prod/catalogue/index.html
...
Running smoke test...
✓ Smoke test passed: Critical files validated
✓ Deployment complete: 165 files uploaded

⚠️  Note: Site not publicly accessible until CloudFront CDN is configured (growth phase)
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

**Automated smoke test validation:**

The deployment script includes post-deployment validation that checks critical files exist in the S3 bucket:

- **index.html** (required): Deployment fails if missing with actionable error message
- **assets/css/globus.css** (optional): Warning if missing, deployment continues
- **assets/css/govuk-frontend.min.css** (optional): Warning if missing, deployment continues
- **assets/js/** directory (optional): Warning if missing, deployment continues

**Smoke test behavior:**
- Runs automatically after file sync completes
- Uses `aws s3 ls` to validate file existence (not HTTP requests, due to BLOCK_ALL configuration)
- Deployment reports success only if smoke test passes
- Provides actionable error messages: "Error: index.html not found in bucket. Run 'yarn build' and retry."
- Outputs message: "Site not publicly accessible until CloudFront CDN is configured (growth phase)"

### Access Pattern

**Current Status (MVP):**
- Files uploaded to S3: ✓ Success
- Public site access: ✗ Not available (returns 403 Forbidden)
- Reason: Bucket has all public access blocked per security requirements

**Future Access (Growth Phase):**
CloudFront CDN will be added to enable public site access. CloudFront Origin Access Identity (OAI) will grant read access to the private S3 bucket. No bucket configuration changes will be needed.

---

## Monitoring

### CloudFront Metrics (AWS Console)

Monitor CloudFront distribution health and traffic patterns through the AWS Console:

**Access metrics:**
1. Navigate to: CloudFront > Distributions > E3THG4UHYDHVWP > Monitoring
2. Or use direct link: https://console.aws.amazon.com/cloudfront/v3/home#/distributions/E3THG4UHYDHVWP

**Key metrics to monitor:**

- **Requests per origin:** Verify both origins receiving traffic appropriately
  - S3Origin (existing): Should receive majority of traffic
  - ndx-static-prod-origin (new): Should receive traffic only from cookied users
  - API Gateway origin: Should receive API requests unchanged

- **Error rate (4xx/5xx) per origin:** Monitor for elevated error rates
  - Compare error rates between origins
  - Investigate spikes in 403/404 errors
  - Watch for 5xx errors indicating infrastructure issues

- **Cache hit ratio:** Should remain high (> 80%)
  - Cookie routing should not significantly degrade caching
  - Low cache hit ratio may indicate configuration issues

### Checking Distribution Status

Use AWS CLI to verify CloudFront distribution status:

```bash
aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.Status'
# Output: "Deployed" when changes are live
# Output: "InProgress" when deployment is propagating
```

**Check function deployment:**

```bash
aws cloudfront describe-function --name ndx-cookie-router --profile NDX/InnovationSandboxHub
```

**List all origins:**

```bash
aws cloudfront get-distribution-config --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'DistributionConfig.Origins[*].Id'
```

### CloudWatch Metrics Reference

CloudFront automatically emits metrics to CloudWatch. Key metrics for operational monitoring:

- **Requests:** Total request count per origin (FR41)
- **BytesDownloaded:** Data transfer volume
- **4xxErrorRate:** Client errors (FR42)
- **5xxErrorRate:** Server errors (FR42)
- **CacheHitRate:** Percentage of requests served from cache

**Note:** CloudFront Functions do not emit custom metrics in MVP. Monitoring relies on built-in CloudFront metrics only.

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
| 1.3 | 2025-11-21 | Expanded Rollback Procedures section with comprehensive three-tier rollback documentation (Story 3.4). Added prerequisites, decision matrix, detailed validation commands, escalation paths, and realistic timing estimates for each option. Included expected outputs for all validation commands. |
| 1.2 | 2025-11-21 | Added CloudFront Cookie-Based Routing section with testing guide. Updated Deployment Process with CloudFront-specific pre/post-deployment validation. Added comprehensive Monitoring section for CloudFront metrics. Enhanced Troubleshooting with CloudFront cookie routing issues and rollback procedures. Updated Overview to reflect CloudFront CDN capability. |
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

### CloudFront Cookie Routing Issues

#### Cookie routing not working

**Symptoms:** Setting `NDX=true` cookie does not route to new UI

**Diagnostic steps:**
1. Verify CloudFront propagation complete (10-15 minutes after deploy)
   ```bash
   aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.Status'
   ```
2. Check cookie set correctly in browser DevTools: `document.cookie`
3. Inspect Network tab: Look for `X-Cache` header in response
4. Verify function deployed:
   ```bash
   aws cloudfront describe-function --name ndx-cookie-router --profile NDX/InnovationSandboxHub
   ```

**Solutions:**
- Wait full 15 minutes for propagation if deployment just completed
- Ensure cookie syntax exact: `document.cookie = "NDX=true; path=/"`
- Clear browser cache and cookies, try again
- Verify distribution status shows "Deployed" not "InProgress"

#### Production site not loading

**Symptoms:** Users cannot access existing site, errors on all pages

**Immediate action:** Execute Rollback Option 1 (disable function)

**Steps:**
1. Edit `lib/ndx-stack.ts` and comment out function association
2. Deploy: `cdk deploy --profile NDX/InnovationSandboxHub`
3. Wait for propagation (~10-15 minutes)
4. Verify site accessible without cookie

**Investigation:**
- Check CloudFormation events for deployment errors:
  ```bash
  aws cloudformation describe-stack-events --stack-name NdxStatic --profile NDX/InnovationSandboxHub --max-items 20
  ```
- Verify existing S3Origin unchanged in distribution config
- Review CloudFront function code for syntax errors

**Rollback procedures:** See [Rollback Documentation](#rollback-procedures) section below

#### Tests failing

**CDK snapshot mismatch:**
- **Cause:** CloudFormation template changed
- **Solution:** Review diff with `yarn test`, update snapshot with `yarn test -u` if change is intentional

**Integration test fails:**
- **Cause:** AWS CLI authentication or permissions
- **Solution:** Verify AWS credentials: `aws sts get-caller-identity --profile NDX/InnovationSandboxHub`
- Check IAM permissions for CloudFront and CloudFormation

**Unit tests fail:**
- **Cause:** Cookie parsing logic changes or function code syntax errors
- **Solution:** Review test output, fix function code in `lib/functions/cookie-router.js`

### Rollback Procedures

If CloudFront cookie routing causes production issues, use these rollback procedures to quickly revert changes. This section provides three rollback options with increasing levels of completeness, allowing you to choose the appropriate approach based on the severity and nature of the issue.

#### Prerequisites

Before performing any rollback, ensure you have:

- **AWS CLI configured** with `NDX/InnovationSandboxHub` profile
- **CDK CLI installed** (aws-cdk@2.x)
- **Git access** to the repository
- **Text editor** for code changes (VS Code, vim, etc.)
- **AWS permissions** for CloudFront and CloudFormation operations
- **Understanding** of which Epic 2 deployment you're rolling back

Verify AWS access before proceeding:

```bash
aws sts get-caller-identity --profile NDX/InnovationSandboxHub
```

Expected output should show Account: `568672915267`

---

#### Rollback Decision Matrix

**Which rollback option should I use?**

| Situation | Recommended Option | Why |
|-----------|-------------------|-----|
| **Routing function causing issues, origins working fine** | Option 1 | Fastest (< 5 min action), least disruptive, disables routing without removing infrastructure |
| **Recent deployment (< 24 hours), want to undo entirely** | Option 2 | Medium speed (5-10 min), clean revert via Git history, undoes full deployment |
| **Fundamental architecture issue with origins or cache policy** | Option 3 | Slowest (15 min), complete removal of all Epic 2 infrastructure |
| **Previous rollback option failed** | Next higher option | Escalate: 1 → 2 → 3 |
| **Unsure which option to use** | Option 1 first | Always start with fastest, least risky option |

**Default Recommendation:** Always start with **Option 1** (fastest, least disruptive). Only escalate to Option 2 or 3 if Option 1 is insufficient or fails.

---

#### Option 1: Disable CloudFront Function

**When to use:**
- Cookie routing logic is causing issues (e.g., wrong origin selected, infinite redirects)
- Origins themselves are working fine (both S3Origin and ndx-static-prod accessible)
- Need immediate revert without removing infrastructure
- Production site still functional but routing incorrectly

**Prerequisites:**
- AWS CLI access
- CDK CLI installed
- Text editor for code changes

**Expected Duration:**
- Action time: < 5 minutes (edit + deploy)
- CloudFront propagation: 10-15 minutes
- **Total: 12-18 minutes**

**Steps:**

1. **Edit the CDK stack** to comment out the function association:

```bash
# Open the stack file in your editor
code infra/lib/ndx-stack.ts
# Or: vim infra/lib/ndx-stack.ts
```

2. **Locate the cache behavior configuration** (approximately lines 120-140) and comment out the `FunctionAssociations` block:

```typescript
// Find this section in DefaultCacheBehavior:
DefaultCacheBehavior: {
  // ... other properties ...

  // Comment out these lines to disable function:
  // FunctionAssociations: [{
  //   EventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
  //   Function: cookieRouterFunction,
  // }],
},
```

3. **Save the file** and preview changes:

```bash
cd infra
cdk diff --profile NDX/InnovationSandboxHub
```

Expected diff should show function association being removed from cache behavior.

4. **Deploy the change:**

```bash
cdk deploy --profile NDX/InnovationSandboxHub --require-approval never
```

Expected output: CloudFormation UPDATE_COMPLETE in 2-5 minutes

5. **Wait for CloudFront propagation:**

```bash
# Check distribution status (repeat until "Deployed")
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.Status' \
  --output text
```

Expected output: Initially `InProgress`, then `Deployed` after 10-15 minutes

**Note:** Propagation times may vary based on CloudFront edge location caching. While typically 10-15 minutes, in rare cases full global propagation can take up to 24 hours.

**Success Criteria:**

After propagation completes, verify the rollback worked:

✅ **All traffic routes to existing S3Origin** (no cookie-based routing occurs)
✅ **NDX cookie has no effect** (setting `NDX=true` still shows existing site)
✅ **Production site loads without errors**
✅ **API endpoints remain functional**

**Validation:**

1. **Verify function not associated with cache behavior:**

```bash
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.DistributionConfig.DefaultCacheBehavior.FunctionAssociations' \
  --output json
```

Expected output: `null` or empty list `[]`

2. **Test cookie routing is disabled:**

Open browser DevTools Console and run:

```javascript
// Set NDX cookie
document.cookie = "NDX=true; path=/"

// Reload page - should still see EXISTING site (not new origin)
location.reload()
```

Expected: Existing production site loads (cookie has no routing effect)

3. **Verify CloudFormation stack status:**

```bash
aws cloudformation describe-stacks \
  --stack-name NdxStaticStack \
  --profile NDX/InnovationSandboxHub \
  --query 'Stacks[0].StackStatus' \
  --output text
```

Expected output: `UPDATE_COMPLETE`

**Escalation:**

If Option 1 fails or is insufficient:
- **Issue:** Function still appears associated → Try redeploying or escalate to Option 2
- **Issue:** Site still broken → Problem may be with origins, escalate to Option 3
- **Issue:** Propagation stuck > 30 minutes → Check CloudFormation events, consider Option 2

Escalate to **Option 2** (Git Revert) if Option 1 doesn't resolve the issue.

---

#### Option 2: Git Revert Deployment

**When to use:**
- Need to undo an entire recent deployment (not just disable function)
- Clear commit exists to revert (deployment was in last 24-48 hours)
- Want clean Git history (revert preserves history better than reset)
- Option 1 was insufficient or you want to remove all changes at once

**Prerequisites:**
- Git repository access
- Knowledge of recent commit history
- AWS CLI and CDK CLI access

**Expected Duration:**
- Action time: 5-10 minutes (identify commit + revert + deploy)
- CloudFront propagation: 10-15 minutes
- **Total: 15-25 minutes**

**Steps:**

1. **Identify the commit to revert** by reviewing recent history:

```bash
# From project root, view last 10 commits
git log --oneline --max-count=10
```

Expected output:

```
a1b2c3d feat(infra): implement CloudFront cookie routing (Epic 2)  ← Target this
e4f5g6h feat(infra): add new S3 origin with OAC (Epic 1)
...
```

Look for commit message related to Epic 2 CloudFront Function deployment.

2. **Revert the target commit:**

```bash
# Replace a1b2c3d with actual commit hash from step 1
git revert a1b2c3d --no-edit
```

Expected output:

```
[main xyz789] Revert "feat(infra): implement CloudFront cookie routing (Epic 2)"
 3 files changed, 45 deletions(-)
```

3. **Preview the reverted changes:**

```bash
cd infra
cdk diff --profile NDX/InnovationSandboxHub
```

Expected diff should show function, cache policy modifications being removed.

4. **Deploy the reverted stack:**

```bash
cdk deploy --profile NDX/InnovationSandboxHub --require-approval never
```

Expected output: CloudFormation UPDATE_COMPLETE in 2-5 minutes

5. **Wait for CloudFront propagation:**

```bash
# Monitor distribution status
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.Status' \
  --output text
```

Wait until status changes from `InProgress` to `Deployed` (typically 10-15 minutes)

**Success Criteria:**

✅ **Git history shows revert commit** (clean history preserved)
✅ **Configuration matches pre-Epic-2 state** (function not in distribution)
✅ **CDK diff shows no pending changes** (deployed state matches code)
✅ **Site functions normally** (no routing, no errors)

**Validation:**

1. **Confirm revert commit exists in history:**

```bash
git log --oneline --max-count=3
```

Expected: Most recent commit should be `Revert "..."`

2. **Verify no pending infrastructure changes:**

```bash
cd infra
cdk diff --profile NDX/InnovationSandboxHub
```

Expected output: "There were no differences" or minimal unrelated diffs

3. **Validate distribution configuration reverted:**

```bash
# Verify function not in distribution
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.DistributionConfig.DefaultCacheBehavior.FunctionAssociations' \
  --output json
```

Expected output: `null` or `[]`

4. **Test site accessibility:**

Browse to https://d7roov8fndsis.cloudfront.net/ - should load existing site without errors

**Escalation:**

If Option 2 fails or is insufficient:
- **Issue:** Wrong commit reverted → Use `git revert HEAD` to undo bad revert, try again
- **Issue:** Conflicts during revert → Resolve conflicts manually, or escalate to Option 3
- **Issue:** Site still broken after revert → Problem may be architectural, escalate to Option 3

Escalate to **Option 3** (Remove Origin) if Option 2 doesn't fully resolve the issue.

---

#### Option 3: Complete Infrastructure Removal

**When to use:**
- Fundamental architectural issue with new origin or cache policy
- Both Option 1 and Option 2 failed to resolve the issue
- Need to remove all Epic 2 infrastructure completely (origins, function, cache policy)
- Preparing for different architectural approach

**Prerequisites:**
- Deep understanding of CDK stack structure
- AWS CLI and CDK CLI access
- Familiarity with CloudFront resource relationships
- Text editor for extensive code changes

**Expected Duration:**
- Action time: 15 minutes (remove multiple resources + deploy)
- CloudFront propagation: 10-15 minutes
- **Total: 25-30 minutes**

**Steps:**

1. **Edit the CDK stack** to remove all Epic 2 infrastructure:

```bash
code infra/lib/ndx-stack.ts
# Or: vim infra/lib/ndx-stack.ts
```

2. **Remove the following resources** (search and delete these sections):

**2a. Remove new S3 origin** (approximately lines 60-75):

```typescript
// DELETE this entire section:
// const ndxStaticOrigin = new origins.S3Origin(ndxStaticBucket, {
//   originAccessIdentity: oai,
// });
```

**2b. Remove CloudFront Function** (approximately lines 85-95):

```typescript
// DELETE this entire section:
// const cookieRouterFunction = new cloudfront.Function(this, 'CookieRouter', {
//   code: cloudfront.FunctionCode.fromFile({ ... }),
// });
```

**2c. Remove Cache Policy** (approximately lines 100-115):

```typescript
// DELETE this entire section:
// const cachePolicy = new cloudfront.CachePolicy(this, 'NdxCookieRoutingPolicy', {
//   cookieBehavior: cloudfront.CacheCookieBehavior.allowList('NDX'),
//   ...
// });
```

**2d. Revert cache behavior** to original configuration (approximately lines 120-140):

```typescript
DefaultCacheBehavior: {
  Origin: existingS3Origin,  // Keep original origin
  ViewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  // Remove function association (should already be removed in Option 1)
  // Remove custom cache policy reference
  CachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED, // Use default policy
},
```

3. **Save file and preview changes:**

```bash
cd infra
cdk diff --profile NDX/InnovationSandboxHub
```

Expected diff should show removal of: S3 bucket, CloudFront Function, Cache Policy, origin associations

4. **Deploy the changes:**

```bash
cdk deploy --profile NDX/InnovationSandboxHub --require-approval never
```

Expected output: CloudFormation UPDATE_COMPLETE in 3-5 minutes

5. **Wait for CloudFront propagation:**

```bash
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.Status' \
  --output text
```

Wait until `Deployed` status (10-15 minutes)

**Success Criteria:**

✅ **CloudFront distribution has only 2 origins** (S3Origin and API-Gateway only)
✅ **CloudFront Function removed** (ndx-cookie-router not in function list)
✅ **Cache Policy removed** (NdxCookieRoutingPolicy deleted)
✅ **Distribution matches pre-Epic-2 state**
✅ **Site functions normally** with original configuration

**Validation:**

1. **Verify origin count decreased to 2:**

```bash
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'length(Distribution.DistributionConfig.Origins)' \
  --output text
```

Expected output: `2` (down from 3)

2. **Verify function removed from CloudFront:**

```bash
aws cloudfront list-functions \
  --profile NDX/InnovationSandboxHub \
  --query "FunctionList.Items[?Name=='ndx-cookie-router'] | length(@)" \
  --output text
```

Expected output: `0` (function deleted)

3. **Verify origin list:**

```bash
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.DistributionConfig.Origins[*].Id' \
  --output json
```

Expected output: Should show only 2 origins (S3Origin and API-Gateway), NOT ndx-static-prod-origin

4. **Verify CloudFormation stack status:**

```bash
aws cloudformation describe-stacks \
  --stack-name NdxStaticStack \
  --profile NDX/InnovationSandboxHub \
  --query 'Stacks[0].StackStatus' \
  --output text
```

Expected output: `UPDATE_COMPLETE`

5. **Test site accessibility:**

Browse to https://d7roov8fndsis.cloudfront.net/ - should load original site

**Escalation:**

If Option 3 fails:
- **Issue:** CloudFormation deployment fails → Check stack events for specific error:
  ```bash
  aws cloudformation describe-stack-events \
    --stack-name NdxStaticStack \
    --profile NDX/InnovationSandboxHub \
    --max-items 20 \
    --query 'StackEvents[?ResourceStatus==`UPDATE_FAILED`].[Timestamp,ResourceType,ResourceStatusReason]' \
    --output table
  ```
- **Issue:** Resources still exist after deployment → May need manual CloudFormation stack rollback
- **Issue:** Site still broken → Contact AWS Support or investigate unrelated infrastructure issues

If Option 3 fails, escalate to **AWS Support** or senior infrastructure team.

---

#### General Rollback Validation

After completing any rollback option, perform these checks:

**1. Production site health:**
```bash
# Test site loads
curl -I https://d7roov8fndsis.cloudfront.net/
```

Expected: HTTP 200 OK

**2. API endpoints functionality:**

Test API Gateway origin still works (if applicable to your setup)

**3. CloudWatch metrics:**

Check CloudFront error rates haven't increased:
- Navigate to CloudFront Console → Distribution E3THG4UHYDHVWP → Monitoring
- Verify 4xx/5xx error rates are normal (not elevated)

**4. CloudFormation stack stability:**

```bash
aws cloudformation describe-stacks \
  --stack-name NdxStaticStack \
  --profile NDX/InnovationSandboxHub \
  --query 'Stacks[0].StackStatus' \
  --output text
```

Expected: `UPDATE_COMPLETE` (not `UPDATE_ROLLBACK_COMPLETE` or `ROLLBACK_COMPLETE`)

---

#### Rollback Timing Summary

| Option | Action Time | Propagation Time | Total Time | When to Use |
|--------|-------------|------------------|------------|-------------|
| **Option 1: Disable Function** | < 5 min | 10-15 min | **12-18 min** | Routing logic issues |
| **Option 2: Git Revert** | 5-10 min | 10-15 min | **15-25 min** | Undo recent deployment |
| **Option 3: Remove Origin** | 15 min | 10-15 min | **25-30 min** | Complete infrastructure removal |

**Note:** CloudFront propagation times are estimates. Typical propagation completes in 10-15 minutes, but edge cases can take up to 24 hours for full global propagation. Initial CloudFormation deployment completes in 2-5 minutes; the remaining time is CloudFront edge location updates.

### Common Infrastructure Errors and Solutions

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
