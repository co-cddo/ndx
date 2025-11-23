# Epic 3: Testing, Validation & Operational Readiness

**Goal:** Establish comprehensive testing, deployment validation, and operational procedures to ensure reliable and maintainable cookie-based routing infrastructure.

**User Value:** Development team can confidently deploy, monitor, and rollback routing changes with complete test coverage and documented procedures, ensuring long-term operational success.

**FRs Covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44

---

## Story 3.1: Write CDK Snapshot Tests for CloudFront Configuration

As a developer,
I want snapshot tests that capture the complete CloudFormation template,
So that unintended infrastructure changes are detected automatically.

**Acceptance Criteria:**

**Given** the CDK stack with CloudFront configuration exists
**When** I create `infra/test/ndx-stack.test.ts` with snapshot tests
**Then** the test file includes:

```typescript
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NdxStaticStack } from '../lib/ndx-stack';

describe('NdxStaticStack', () => {
  test('CloudFront configuration snapshot', () => {
    const app = new App();
    const stack = new NdxStaticStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    expect(template.toJSON()).toMatchSnapshot();
  });
});
```

**And** running `yarn test` generates snapshot file in `__snapshots__/` directory
**And** snapshot captures complete CloudFormation template including:
- CloudFront distribution configuration
- CloudFront Function resource
- Cache Policy resource
- All three origins (S3Origin, API Gateway, ndx-static-prod)
- Default cache behavior with function association
- Origin Access Control configuration

**And** subsequent test runs pass (snapshot matches current config)
**And** any CDK code change that alters CloudFormation causes test failure
**And** test failure message shows clear diff of what changed in template

**Prerequisites:** Story 2.6 (Routing functionality deployed)

**Technical Notes:**
- Snapshot tests provide broad coverage with minimal code (FR31)
- Catches ANY unintended CloudFormation changes
- Jest `toMatchSnapshot()` creates snapshot files automatically
- Snapshots must be committed to git (version controlled)
- Architecture section: "Testing Patterns" provides examples
- NFR-MAINT-2: Snapshot test coverage requirement
- Run `yarn test -u` to update snapshots after intentional changes

---

## Story 3.2: Write Fine-Grained Assertion Tests for Critical Properties

As a developer,
I want specific assertion tests for security-critical and routing-critical properties,
So that requirements are explicitly validated and violations caught early.

**Acceptance Criteria:**

**Given** the CDK stack exists
**When** I add fine-grained assertions to `infra/test/ndx-stack.test.ts`
**Then** tests validate critical properties:

**Test 1: New S3 origin added with correct OAC**
```typescript
test('New S3 origin configured correctly', () => {
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Origins: expect.arrayContaining([{
        Id: 'ndx-static-prod-origin',
        DomainName: 'ndx-static-prod.s3.us-west-2.amazonaws.com',
        S3OriginConfig: {
          OriginAccessIdentity: '',
        },
        OriginAccessControlId: 'E3P8MA1G9Y5BYE'
      }])
    }
  });
});
```

**Test 2: API Gateway origin unchanged**
```typescript
test('API Gateway origin remains unchanged', () => {
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Origins: expect.arrayContaining([
        expect.objectContaining({
          DomainName: '1ewlxhaey6.execute-api.us-west-2.amazonaws.com',
          CustomOriginConfig: expect.any(Object)
        })
      ])
    }
  });
});
```

**Test 3: CloudFront Function created**
```typescript
test('CloudFront Function configured', () => {
  template.hasResourceProperties('AWS::CloudFront::Function', {
    Name: 'ndx-cookie-router',
    FunctionConfig: {
      Runtime: 'cloudfront-js-2.0'
    }
  });
});
```

**Test 4: Cache Policy with NDX cookie allowlist**
```typescript
test('Cache Policy forwards NDX cookie only', () => {
  template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
    CachePolicyConfig: {
      Name: 'NdxCookieRoutingPolicy',
      ParametersInCacheKeyAndForwardedToOrigin: {
        CookiesConfig: {
          CookieBehavior: 'whitelist',
          Cookies: ['NDX']
        }
      }
    }
  });
});
```

**Test 5: Default cache behavior has function attached**
```typescript
test('Function attached to default cache behavior', () => {
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        FunctionAssociations: [{
          EventType: 'viewer-request',
          FunctionARN: expect.stringContaining('ndx-cookie-router')
        }]
      }
    }
  });
});
```

**And** all tests pass with current configuration
**And** tests fail if security properties violated (OAC removed, wrong origin)
**And** tests fail if routing properties violated (function not attached, wrong cookie)

**Prerequisites:** Story 3.1 (Snapshot tests created)

**Technical Notes:**
- Fine-grained assertions complement snapshots (Architecture ADR-005)
- Explicit validation of security-critical properties (NFR-SEC-1)
- FR31-34: Test validation requirements
- CDK assertions library: `Template.hasResourceProperties()`
- Tests fail early if requirements violated
- More maintainable than snapshot-only (clearly documents requirements)

---

## Story 3.3: Create Integration Test for Real AWS Deployment

As a developer,
I want an integration test that validates cookie routing in a real AWS environment,
So that I can catch AWS-specific issues before production deployment.

**Acceptance Criteria:**

**Given** AWS test environment access exists
**When** I create `infra/test/integration.sh`
**Then** the script includes:

```bash
#!/bin/bash
set -e

echo "Starting integration test..."

# Deploy to test context (uses test distribution if available)
echo "Deploying CloudFront changes..."
cd infra
cdk deploy --profile NDX/InnovationSandboxHub --require-approval never

# Wait for propagation
echo "Waiting 30 seconds for initial propagation..."
sleep 30

# Test 1: Verify distribution deployed
echo "Test 1: Verifying distribution status..."
STATUS=$(aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.Status' --output text)
if [ "$STATUS" != "Deployed" ]; then
  echo "❌ Distribution not in Deployed state: $STATUS"
  exit 1
fi
echo "✓ Distribution deployed"

# Test 2: Verify origins count
echo "Test 2: Verifying origins..."
ORIGINS=$(aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'length(Distribution.DistributionConfig.Origins)')
if [ "$ORIGINS" -lt 3 ]; then
  echo "❌ Expected at least 3 origins, found: $ORIGINS"
  exit 1
fi
echo "✓ All origins present ($ORIGINS total)"

# Test 3: Verify new origin exists
echo "Test 3: Verifying ndx-static-prod origin..."
NEW_ORIGIN=$(aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.DistributionConfig.Origins[?Id==`ndx-static-prod-origin`] | length(@)')
if [ "$NEW_ORIGIN" != "1" ]; then
  echo "❌ ndx-static-prod-origin not found"
  exit 1
fi
echo "✓ New origin configured"

# Test 4: Verify CloudFront Function exists
echo "Test 4: Verifying CloudFront Function..."
FUNCTION=$(aws cloudfront list-functions --profile NDX/InnovationSandboxHub --query 'FunctionList.Items[?Name==`ndx-cookie-router`] | length(@)')
if [ "$FUNCTION" != "1" ]; then
  echo "❌ CloudFront Function not found"
  exit 1
fi
echo "✓ CloudFront Function deployed"

echo ""
echo "✅ Integration test passed!"
echo ""
echo "Manual validation required:"
echo "1. Browse to https://d7roov8fndsis.cloudfront.net/ (should see existing site)"
echo "2. Set cookie: document.cookie='NDX=true; path=/'"
echo "3. Reload page (should see new origin content)"
echo "4. Clear cookie and verify revert to existing site"
```

**And** script is executable: `chmod +x infra/test/integration.sh`
**And** running integration test validates:
- Distribution status is "Deployed"
- All three origins exist
- New origin `ndx-static-prod-origin` is configured
- CloudFront Function `ndx-cookie-router` is deployed

**And** test provides manual validation instructions for cookie routing
**And** test documents expected behavior clearly

**Prerequisites:** Story 3.2 (Assertion tests created)

**Technical Notes:**
- Integration test validates real AWS deployment (Architecture ADR-005)
- Catches issues unit tests miss (permissions, quotas, region availability)
- Uses AWS CLI to query actual deployed resources
- FR35: Integration test validation requirement
- Run after every CDK deployment to verify success
- Optional for MVP but recommended before production
- Manual cookie testing still required (browser-based validation)

---

## Story 3.4: Document Rollback Procedures

As a developer,
I want clear rollback procedures documented,
So that the team can quickly revert changes if routing issues are discovered.

**Acceptance Criteria:**

**Given** the routing infrastructure is deployed
**When** I create rollback documentation in `infra/README.md`
**Then** the documentation includes three-tier rollback approach:

**Option 1: Disable Function (Fastest - < 5 minutes)**
```markdown
# Rollback Option 1: Disable Function (Recommended)

**When to use:** Routing logic causing issues, need immediate revert

**Steps:**
1. Edit `lib/ndx-stack.ts`
2. Comment out function association:
   ```typescript
   // FunctionAssociations: [{
   //   EventType: 'viewer-request',
   //   FunctionARN: cookieRouterFunction.functionArn
   // }]
   ```
3. Deploy: `cdk deploy --profile NDX/InnovationSandboxHub`
4. Propagation: ~5-10 minutes
5. Result: All traffic routes to existing S3Origin

**Validation:**
- Test with NDX=true cookie (should still see existing site)
- Production traffic unaffected
```

**Option 2: Git Revert (Medium - 5-10 minutes)**
```markdown
# Rollback Option 2: Git Revert

**When to use:** Need to undo entire deployment

**Steps:**
1. Identify commit to revert: `git log --oneline`
2. Revert: `git revert <commit-hash>`
3. Deploy: `cd infra && cdk deploy --profile NDX/InnovationSandboxHub`
4. Propagation: ~10-15 minutes

**Validation:**
- Check git history: `git log`
- Verify CDK diff shows revert: `cdk diff`
```

**Option 3: Remove Origin (Slowest - 15 minutes)**
```markdown
# Rollback Option 3: Remove Origin and Function

**When to use:** Complete rollback including origin removal

**Steps:**
1. Edit `lib/ndx-stack.ts`
2. Remove new origin configuration
3. Remove CloudFront Function definition
4. Remove Cache Policy definition
5. Remove function association
6. Deploy: `cdk deploy --profile NDX/InnovationSandboxHub`
7. Propagation: ~15 minutes
8. Result: CloudFront configuration as before routing implementation
```

**And** each option documents:
- When to use this approach
- Exact steps to execute
- Expected timeline
- How to validate rollback succeeded

**And** rollback procedures are tested (documented test results)
**And** escalation process documented if rollbacks fail

**Prerequisites:** Story 3.3 (Integration test created)

**Technical Notes:**
- Three-tier approach: fastest to most complete (Architecture: "Rollback Procedures")
- Option 1 preferred: Quickest, least disruptive (FR36)
- FR36-40: Rollback and safety requirements
- NFR-OPS-4: Rollback < 5 minutes requirement
- NFR-REL-2: CloudFormation auto-rollback on deployment failure
- Document in README for operational visibility
- Test rollback procedures in non-production before relying on them

---

## Story 3.5: Update Infrastructure README with Operations Guide

As a developer,
I want the infrastructure README updated with deployment, monitoring, and troubleshooting guidance,
So that any team member can operate the routing infrastructure confidently.

**Acceptance Criteria:**

**Given** the routing infrastructure is complete
**When** I update `infra/README.md`
**Then** the README includes new sections:

**Section: CloudFront Cookie-Based Routing**
```markdown
# CloudFront Cookie-Based Routing

## Overview
The NDX CloudFront distribution uses cookie-based routing to enable safe testing of new UI versions.

- **Cookie Name:** `NDX` (case-sensitive)
- **Cookie Value:** `true` (exact match, case-sensitive)
- **Behavior:**
  - With `NDX=true`: Routes to `ndx-static-prod` S3 bucket
  - Without cookie: Routes to existing S3Origin (production site)
  - API routes: Unaffected (API Gateway origin unchanged)

## How to Test New UI
1. Open browser DevTools Console
2. Set cookie: `document.cookie = "NDX=true; path=/"`
3. Browse to https://d7roov8fndsis.cloudfront.net/
4. You should see content from new S3 bucket
5. To revert: `document.cookie = "NDX=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/"`
```

**Section: Deployment Process**
```markdown
# Deployment Process

## Pre-Deployment Checklist
- [ ] All tests pass: `yarn test`
- [ ] Linting clean: `yarn lint`
- [ ] CDK diff reviewed: `cdk diff --profile NDX/InnovationSandboxHub`
- [ ] API Gateway origin unchanged in diff
- [ ] Team notified of deployment window

## Deploy
```bash
cd infra
cdk deploy --profile NDX/InnovationSandboxHub
```

## Post-Deployment Validation
- Wait 10-15 minutes for global propagation
- Run integration test: `test/integration.sh`
- Manual cookie test (see "How to Test New UI" above)
- Check CloudWatch metrics for errors
```

**Section: Monitoring**
```markdown
# Monitoring

## CloudFront Metrics (AWS Console)
- Navigate to: CloudFront > Distributions > E3THG4UHYDHVWP > Monitoring
- Key metrics:
  - Requests per origin (verify both origins receiving traffic)
  - Error rate (4xx/5xx) per origin
  - Cache hit ratio (should remain high)

## Checking Distribution Status
```bash
aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.Status'