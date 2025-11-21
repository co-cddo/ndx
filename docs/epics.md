# NDX CloudFront Origin Routing - Epic Breakdown

**Author:** cns
**Date:** 2025-11-20
**Project:** National Digital Exchange - CloudFront Cookie-Based Origin Routing
**Domain:** GovTech (UK Government)

---

## Overview

This document provides the complete epic and story breakdown for the NDX CloudFront Origin Routing project, decomposing the requirements from the [PRD](./prd.md) into implementable stories with full technical context from the [Architecture](./architecture.md).

**Context Incorporated:**
- ✅ PRD requirements (44 FRs, 35 NFRs)
- ✅ Architecture technical decisions

---

## Functional Requirements Inventory

### CloudFront Origin Management
- **FR1:** System can add `ndx-static-prod` S3 bucket as a new origin to CloudFront distribution E3THG4UHYDHVWP
- **FR2:** System can configure Origin Access Control for new S3 origin matching security of existing S3Origin
- **FR3:** System can define origin properties (connection timeout, read timeout, connection attempts) matching existing origins
- **FR4:** System can reference existing CloudFront distribution in CDK without recreating or modifying core distribution properties
- **FR5:** System preserves existing S3Origin completely unchanged (bucket, OAC, timeouts, protocol)
- **FR6:** System preserves API Gateway origin completely unchanged (endpoint, path, protocol, timeouts)

### Cookie-Based Routing Logic
- **FR7:** System can inspect incoming HTTP requests for `Cookie` header
- **FR8:** System can parse `Cookie` header to extract `NDX` cookie value
- **FR9:** System routes requests to `ndx-static-prod` origin when `NDX` cookie value equals `true` (exact match, case-sensitive)
- **FR10:** System routes requests to existing S3Origin when `NDX` cookie is missing
- **FR11:** System routes requests to existing S3Origin when `NDX` cookie exists but value is not `true`
- **FR12:** Routing logic executes for every request to default cache behavior (HTML pages, assets)
- **FR13:** Routing logic does NOT execute for API Gateway routes (preserves existing API routing)
- **FR14:** Routing function returns modified request with correct origin selection

### Routing Function Deployment
- **FR15:** System can deploy CloudFront Function (Option A) or Lambda@Edge function (Option B) containing routing logic
- **FR16:** Routing function code can be defined in CDK as part of infrastructure
- **FR17:** Routing function can be attached to default cache behavior as viewer-request or origin-request function
- **FR18:** Routing function deployment is part of CloudFront configuration update (single CDK deployment)
- **FR19:** CloudFront propagates function changes globally across all edge locations

### Cache Behavior Configuration
- **FR20:** System preserves all existing cache policy settings (TTL, compression, HTTPS redirect)
- **FR21:** System ensures cookies are forwarded to routing function (required for cookie inspection)
- **FR22:** System preserves existing viewer protocol policy (redirect-to-https)
- **FR23:** System preserves existing allowed HTTP methods configuration
- **FR24:** System preserves existing response headers policies if configured

### CDK Infrastructure Management
- **FR25:** CDK code can import existing CloudFront distribution by ID (E3THG4UHYDHVWP)
- **FR26:** CDK can modify CloudFront distribution configuration without recreating distribution
- **FR27:** Infrastructure changes can be validated via `cdk synth` before deployment
- **FR28:** Infrastructure changes can be previewed via `cdk diff` showing origin and function additions
- **FR29:** Infrastructure can be deployed via `cdk deploy` with zero service downtime
- **FR30:** CDK deployment is idempotent (re-running with no changes causes no AWS updates)

### Testing & Validation
- **FR31:** CDK tests can validate new S3 origin is added to distribution configuration
- **FR32:** CDK tests can validate API Gateway origin remains unchanged
- **FR33:** CDK tests can validate routing function code is syntactically valid
- **FR34:** CDK tests can validate cache behavior configuration preserves existing policies
- **FR35:** System can execute smoke tests post-deployment (manual cookie setting and verification)

### Rollback & Safety
- **FR36:** System can disable routing function via CloudFront configuration change
- **FR37:** System can remove new S3 origin from distribution if rollback needed
- **FR38:** System can revert to previous CloudFront configuration via CDK version control
- **FR39:** Failed CloudFront deployments can be investigated via CloudFormation events
- **FR40:** CloudFormation automatically rolls back failed CloudFront configuration changes

### Operational Monitoring
- **FR41:** CloudFront can emit metrics showing request counts per origin
- **FR42:** CloudFront can emit error rate metrics for each origin separately
- **FR43:** Routing function execution can be monitored via CloudWatch if needed (Lambda@Edge only)
- **FR44:** System can log routing decisions for debugging (optional, not required for MVP)

---

## Epic Summary

**3 Epics** delivering cookie-based origin routing for safe UI testing:

1. **CloudFront Origin Infrastructure** - Add new S3 origin with proper security to existing CloudFront distribution
2. **Cookie-Based Routing Implementation** - Deploy CloudFront Function to route testers to new origin based on NDX cookie
3. **Testing, Validation & Operational Readiness** - Complete test coverage, deployment automation, and rollback procedures

---

## FR Coverage Map

- **Epic 1 (CloudFront Origin Infrastructure):** FR1, FR2, FR3, FR4, FR5, FR6, FR25, FR26, FR27, FR28, FR29, FR30
- **Epic 2 (Cookie-Based Routing Implementation):** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24
- **Epic 3 (Testing, Validation & Operational Readiness):** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44

---

## Epic 1: CloudFront Origin Infrastructure

**Goal:** Add `ndx-static-prod` S3 bucket as a new origin to existing CloudFront distribution E3THG4UHYDHVWP with proper security configuration, enabling future cookie-based routing while preserving all existing origins and functionality.

**User Value:** New S3 origin exists in CloudFront distribution and is ready to serve content to testers, with zero impact on production users or existing API functionality.

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR25, FR26, FR27, FR28, FR29, FR30

---

### Story 1.1: Import Existing CloudFront Distribution in CDK

As a developer,
I want to import the existing CloudFront distribution (E3THG4UHYDHVWP) into our CDK stack,
So that we can modify its configuration without recreating the distribution or disrupting service.

**Acceptance Criteria:**

**Given** the CDK stack `NdxStaticStack` exists in `infra/lib/ndx-stack.ts`
**When** I add code to import the CloudFront distribution
**Then** the stack includes:
```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

const distribution = cloudfront.Distribution.fromDistributionAttributes(this, 'ImportedDistribution', {
  distributionId: 'E3THG4UHYDHVWP',
  domainName: 'd7roov8fndsis.cloudfront.net'
});
```

**And** running `cdk synth --profile NDX/InnovationSandboxHub` generates valid CloudFormation
**And** the CloudFormation template does NOT include a new distribution resource (import only, no replacement)
**And** the distribution variable is available for subsequent configuration changes
**And** TypeScript compilation succeeds with no errors

**Prerequisites:** None (first story in epic)

**Technical Notes:**
- Use `Distribution.fromDistributionAttributes()` for importing (Architecture ADR-003)
- Distribution ID: E3THG4UHYDHVWP (from PRD Infrastructure section)
- Domain: d7roov8fndsis.cloudfront.net (from PRD Infrastructure section)
- Account: 568672915267, Region: us-west-2
- This is a READ operation only - no modifications to distribution yet
- Import creates a reference without managing the resource lifecycle
- Enables subsequent stories to add origins and configure cache behaviors

---

### Story 1.2: Add New S3 Origin with Origin Access Control

As a developer,
I want to add the `ndx-static-prod` S3 bucket as a new origin to the CloudFront distribution,
So that CloudFront can fetch content from this bucket for testers using cookie-based routing.

**Acceptance Criteria:**

**Given** the CloudFront distribution is imported in CDK
**When** I add the new S3 origin configuration
**Then** the CDK stack includes:
```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';

const newOriginBucket = s3.Bucket.fromBucketName(this, 'NewOriginBucket', 'ndx-static-prod');

const newOrigin = new origins.S3Origin(newOriginBucket, {
  originId: 'ndx-static-prod-origin',
  originAccessControlId: 'E3P8MA1G9Y5BYE',  // Reuse existing OAC
  connectionAttempts: 3,
  connectionTimeout: cdk.Duration.seconds(10),
  readTimeout: cdk.Duration.seconds(30),
  customHeaders: {}
});
```

**And** origin configuration matches existing S3Origin settings:
- Connection attempts: 3
- Connection timeout: 10 seconds
- Read timeout: 30 seconds
- Protocol: HTTPS only
- Origin Access Control: E3P8MA1G9Y5BYE (reused from existing S3Origin)

**And** running `cdk diff --profile NDX/InnovationSandboxHub` shows new origin being added
**And** diff output clearly shows origin ID: `ndx-static-prod-origin`
**And** diff confirms OAC ID: E3P8MA1G9Y5BYE
**And** no changes shown to existing origins (S3Origin and API Gateway)

**Prerequisites:** Story 1.1 (CloudFront distribution imported)

**Technical Notes:**
- Reuse existing OAC E3P8MA1G9Y5BYE for security consistency (Architecture ADR-002)
- Origin ID naming: `ndx-static-prod-origin` (Architecture naming conventions)
- S3 bucket `ndx-static-prod` already exists (deployed in Phase 1)
- OAC provides secure access without making bucket public (NFR-SEC-1)
- Connection/timeout settings match existing origins for consistency (FR3)
- Architecture section: "Origin Configuration" provides exact settings

---

### Story 1.3: Verify Existing Origins Remain Unchanged

As a developer,
I want to validate that existing S3 and API Gateway origins are not modified,
So that production traffic and API functionality remain completely unaffected.

**Acceptance Criteria:**

**Given** the new S3 origin has been added to CDK stack
**When** I run `cdk diff --profile NDX/InnovationSandboxHub`
**Then** the diff output shows:
- New origin: `ndx-static-prod-origin` (addition)
- Existing S3Origin: No changes
- Existing API Gateway origin: No changes

**And** existing S3Origin configuration is verified as unchanged:
- Origin ID: `S3Origin`
- Bucket: `ndx-try-isb-compute-cloudfrontuiapiisbfrontendbuck-ssjtxkytbmky`
- OAC: E3P8MA1G9Y5BYE
- All timeout and connection settings identical

**And** existing API Gateway origin is verified as unchanged:
- Origin ID: `InnovationSandboxComputeCloudFrontUiApiIsbCloudFrontDistributionOrigin2A994B75A`
- Domain: `1ewlxhaey6.execute-api.us-west-2.amazonaws.com`
- Path: `/prod`
- All settings identical

**And** no changes to cache behaviors are shown in diff
**And** no changes to viewer protocol policies are shown

**Prerequisites:** Story 1.2 (New S3 origin added)

**Technical Notes:**
- This is a VALIDATION story - no code changes, just verification
- Critical for government service - FR5 and FR6 mandate existing origins unchanged
- Use `cdk diff` to generate change preview before deployment
- Document diff output for approval review (NFR-COMP-2)
- API Gateway origin must remain untouched (FR6, FR13)
- Existing S3Origin serves current production site (FR5)

---

### Story 1.4: Deploy CloudFront Infrastructure Changes to AWS

As a developer,
I want to deploy the updated CloudFront configuration to AWS,
So that the new S3 origin exists in the distribution and is ready for routing configuration.

**Acceptance Criteria:**

**Given** CDK diff shows only new origin addition (existing origins unchanged)
**When** I run `cdk deploy --profile NDX/InnovationSandboxHub`
**Then** CloudFormation deployment succeeds with:
- Stack status: UPDATE_COMPLETE
- New origin added to distribution E3THG4UHYDHVWP
- CloudFront propagates changes to all edge locations (~10-15 minutes)

**And** post-deployment verification confirms:
```bash
# Verify distribution status
aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.Status'
# Output: "Deployed"

# Verify origins count increased
aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.DistributionConfig.Origins[*].Id'
# Output includes: "S3Origin", "API Gateway origin ID", "ndx-static-prod-origin"
```

**And** production site remains accessible throughout deployment (zero downtime)
**And** API endpoints remain functional (no disruption)
**And** CloudFormation events show successful resource updates
**And** running `cdk diff` after deployment shows no changes (idempotent)

**Prerequisites:** Story 1.3 (Existing origins verified unchanged)

**Technical Notes:**
- Zero-downtime deployment (NFR-REL-1) - CloudFront handles updates gracefully
- CloudFormation automatically rolls back on failure (NFR-REL-2)
- Propagation time: 10-15 minutes for global edge locations (NFR-PERF-6)
- Monitor via CloudFormation console or CLI (FR39)
- New origin not yet routing traffic (no function attached) - safe to deploy
- Deployment is idempotent (FR30) - can re-run without changes
- Architecture section: "Deployment Process" documents commands

---

## Epic 2: Cookie-Based Routing Implementation

**Goal:** Implement CloudFront Function to inspect `NDX` cookie and route requests to appropriate origin, enabling testers to access new UI via cookie while all other users see existing site.

**User Value:** Testers can set `NDX=true` cookie in browser to see new UI from `ndx-static-prod`, while production users continue seeing existing site with zero changes to their experience.

**FRs Covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24

---

### Story 2.1: Create CloudFront Function for Cookie Inspection

As a developer,
I want to create a CloudFront Function that inspects the NDX cookie and routes to the appropriate origin,
So that testers with `NDX=true` see content from the new S3 bucket while others see the existing site.

**Acceptance Criteria:**

**Given** the CDK project structure exists
**When** I create `infra/lib/functions/cookie-router.js`
**Then** the function includes:

```javascript
function handler(event) {
  var request = event.request;
  var cookies = parseCookies(request.headers.cookie);

  // Route to new origin if NDX=true
  if (cookies['NDX'] === 'true') {
    request.origin = {
      s3: {
        domainName: 'ndx-static-prod.s3.us-west-2.amazonaws.com',
        region: 'us-west-2',
        authMethod: 'origin-access-control',
        originAccessControlId: 'E3P8MA1G9Y5BYE'
      }
    };
  }
  // Else: request unchanged, routes to default S3Origin

  return request;
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};

  var cookies = {};
  cookieHeader.value.split(';').forEach(function(cookie) {
    var parts = cookie.split('=');
    var key = parts[0].trim();
    var value = parts[1] ? parts[1].trim() : '';
    cookies[key] = value;
  });

  return cookies;
}
```

**And** function follows CloudFront Functions JavaScript constraints:
- Uses `var` (not `const` or `let`)
- No ES6 features (no arrow functions, template literals)
- Code size < 1KB (well under 10KB limit)
- No console.log (avoid execution cost)

**And** function handles edge cases gracefully:
- Missing cookie header: Returns empty cookies object
- Malformed cookie: Parses what it can, empty for invalid
- NDX cookie with non-"true" value: Routes to default origin
- Missing NDX cookie: Routes to default origin

**And** function uses exact string matching:
- Cookie name: `NDX` (case-sensitive, exact)
- Cookie value: `true` (case-sensitive, exact)
- Not `ndx`, not `Ndx`, not `"true"`, not `1`

**Prerequisites:** Story 1.4 (New origin deployed)

**Technical Notes:**
- CloudFront Functions use limited JavaScript runtime (no Node.js APIs)
- Function executes at all 225+ edge locations (Architecture ADR-001)
- Sub-millisecond execution expected (NFR-PERF-1)
- Fail-open design: Errors route to default origin (NFR-REL-3)
- Architecture section: "CloudFront Function Pattern" provides exact code
- OAC ID must match origin configuration: E3P8MA1G9Y5BYE

---

### Story 2.2: Write Unit Tests for Cookie Router Function

As a developer,
I want comprehensive unit tests for the cookie routing logic,
So that I can verify correct routing behavior before deploying to production.

**Acceptance Criteria:**

**Given** the cookie-router.js function exists
**When** I create `infra/test/cookie-router.test.ts`
**Then** tests cover all routing scenarios:

**Test Case 1: Route to new origin when NDX=true**
```typescript
const event = { request: { headers: { cookie: { value: 'NDX=true' } } } };
const result = handler(event);
expect(result.origin.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
expect(result.origin.s3.originAccessControlId).toBe('E3P8MA1G9Y5BYE');
```

**Test Case 2: Use default origin when cookie missing**
```typescript
const event = { request: { headers: {} } };
const result = handler(event);
expect(result.origin).toBeUndefined(); // Request unchanged
```

**Test Case 3: Use default origin when NDX=false**
```typescript
const event = { request: { headers: { cookie: { value: 'NDX=false' } } } };
const result = handler(event);
expect(result.origin).toBeUndefined();
```

**Test Case 4: Parse multiple cookies correctly**
```typescript
const event = { request: { headers: { cookie: { value: 'session=abc123; NDX=true; other=xyz' } } } };
const result = handler(event);
expect(result.origin.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
```

**Test Case 5: Handle malformed cookies gracefully**
```typescript
const event = { request: { headers: { cookie: { value: 'invalid;;;NDX=true' } } } };
// Should still parse NDX=true successfully
```

**And** running `yarn test` executes all tests successfully
**And** test coverage includes parseCookies() helper function
**And** tests run in < 100ms (fast feedback)

**Prerequisites:** Story 2.1 (CloudFront Function created)

**Technical Notes:**
- Use Jest testing framework (already configured in CDK project)
- Test file location: `infra/test/cookie-router.test.ts`
- Architecture section: "Testing Patterns" provides test examples
- No AWS calls in unit tests (pure function testing)
- Verify exact string matching for cookie name and value (FR9)

---

### Story 2.3: Configure Cache Policy with NDX Cookie Allowlist

As a developer,
I want to create a Cache Policy that forwards only the NDX cookie to the function,
So that cookie inspection works while preserving cache effectiveness for non-cookied users.

**Acceptance Criteria:**

**Given** the CloudFront distribution is imported in CDK
**When** I create a new Cache Policy
**Then** the CDK stack includes:

```typescript
const cachePolicy = new cloudfront.CachePolicy(this, 'NdxCookieRoutingPolicy', {
  cachePolicyName: 'NdxCookieRoutingPolicy',
  comment: 'Cache policy for NDX cookie-based routing',
  defaultTtl: cdk.Duration.seconds(86400),        // 1 day
  minTtl: cdk.Duration.seconds(1),
  maxTtl: cdk.Duration.seconds(31536000),         // 1 year
  cookieBehavior: cloudfront.CacheCookieBehavior.whitelist('NDX'),
  queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
  headerBehavior: cloudfront.CacheHeaderBehavior.none(),
  enableAcceptEncodingGzip: true,
  enableAcceptEncodingBrotli: true
});
```

**And** cache policy configuration includes:
- Cookie behavior: Allowlist (not all cookies)
- Allowlisted cookies: `['NDX']` only
- Query strings: Forward all (preserve existing behavior)
- Headers: None (preserve existing behavior)
- Compression: Gzip and Brotli enabled

**And** cache effectiveness is preserved:
- Users without NDX cookie: Share cache (optimal performance)
- Users with NDX=true: Separate cache (small group)
- Users with NDX=false: Share default cache
- No degradation for majority of users (NFR-PERF-3)

**And** running `cdk diff` shows new CachePolicy resource
**And** policy name clearly identifies purpose: `NdxCookieRoutingPolicy`

**Prerequisites:** Story 2.2 (Function tests passing)

**Technical Notes:**
- Modern CloudFront best practice: Cache Policies (not legacy cache behaviors)
- Architecture ADR-004: Cache Policy rationale
- Only NDX cookie forwarded, not all cookies (optimal caching)
- TTL values match CloudFront defaults (no custom optimization for MVP)
- Query string forwarding: All (preserves existing behavior - FR20)
- FR21: Cookie forwarding required for function to inspect
- Note: CDK API uses `.whitelist()` method name, but we use "allowlist" terminology in documentation

---

### Story 2.4: Deploy CloudFront Function to CDK Stack

As a developer,
I want to deploy the CloudFront Function as part of the CDK stack,
So that the function is available for attachment to cache behaviors.

**Acceptance Criteria:**

**Given** cookie-router.js function code exists
**When** I add CloudFront Function to CDK stack
**Then** the stack includes:

```typescript
import * as fs from 'fs';
import * as path from 'path';

const functionCode = fs.readFileSync(
  path.join(__dirname, 'functions/cookie-router.js'),
  'utf8'
);

const cookieRouterFunction = new cloudfront.Function(this, 'CookieRouterFunction', {
  functionName: 'ndx-cookie-router',
  code: cloudfront.FunctionCode.fromInline(functionCode),
  comment: 'Routes requests based on NDX cookie value',
  runtime: cloudfront.FunctionRuntime.JS_2_0
});
```

**And** function configuration specifies:
- Function name: `ndx-cookie-router`
- Runtime: JS_2_0 (CloudFront Functions JavaScript 2.0)
- Code loaded from file system (not hardcoded inline)
- Code size validated < 10KB limit

**And** running `cdk synth` succeeds
**And** synthesized CloudFormation includes `AWS::CloudFront::Function` resource
**And** function code is embedded in CloudFormation template
**And** running `cdk diff` shows new Function resource being added

**Prerequisites:** Story 2.3 (Cache Policy configured)

**Technical Notes:**
- CloudFront Functions runtime: JS_2_0 (latest as of 2025)
- Code loaded via fs.readFileSync for maintainability
- Function not yet attached to cache behavior (Story 2.5)
- Architecture section: "Function Code Location" documents path
- FR15-19: Function deployment requirements
- Function deploys globally to all edge locations automatically

---

### Story 2.5: Attach Function to Default Cache Behavior

As a developer,
I want to attach the cookie router function to the default cache behavior with the new cache policy,
So that the function executes for all requests and routes based on cookie value.

**Acceptance Criteria:**

**Given** CloudFront Function and Cache Policy are defined in CDK
**When** I configure the default cache behavior
**Then** the CDK stack includes:

```typescript
// Note: This requires using L1 (CFN) constructs since imported distribution
// doesn't support L2 construct modifications directly

const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;

cfnDistribution.addPropertyOverride('DistributionConfig.DefaultCacheBehavior', {
  TargetOriginId: 'S3Origin',  // Keep existing default
  ViewerProtocolPolicy: 'redirect-to-https',
  AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
  CachedMethods: ['GET', 'HEAD'],
  CachePolicyId: cachePolicy.cachePolicyId,
  FunctionAssociations: [{
    EventType: 'viewer-request',
    FunctionARN: cookieRouterFunction.functionArn
  }]
});
```

**And** cache behavior configuration preserves:
- Viewer protocol policy: redirect-to-https (FR22)
- Allowed methods: GET, HEAD, OPTIONS (FR23)
- Target origin: S3Origin (default, function overrides when NDX=true)
- Compression settings (inherited from cache policy)

**And** function association specifies:
- Event type: `viewer-request` (executes before cache lookup)
- Function type: CloudFront Function (not Lambda@Edge)

**And** API Gateway cache behaviors remain completely unchanged (FR13)
**And** running `cdk diff` shows:
- DefaultCacheBehavior: Modified (function + cache policy added)
- API Gateway behaviors: No changes
- Existing origins: No changes

**Prerequisites:** Story 2.4 (Function deployed)

**Technical Notes:**
- Use L1 (CFN) constructs for imported distribution modifications
- Function executes at viewer-request stage (before cache)
- Target origin remains S3Origin; function overrides when NDX=true
- API Gateway routes unaffected (different cache behaviors - FR13)
- Architecture section: "Function Association" documents event type
- NFR-PERF-1: Sub-millisecond function execution
- FR17: Function attached to default cache behavior

---

### Story 2.6: Deploy Routing Functionality and Validate

As a developer,
I want to deploy the complete routing infrastructure and validate cookie-based routing works,
So that testers can access the new UI while production users remain unaffected.

**Acceptance Criteria:**

**Given** CDK stack includes function, cache policy, and cache behavior configuration
**When** I run `cdk deploy --profile NDX/InnovationSandboxHub`
**Then** CloudFormation deployment succeeds:
- Stack status: UPDATE_COMPLETE
- CloudFront Function deployed globally
- Cache Policy created
- Default cache behavior updated with function
- CloudFront propagation completes (~10-15 minutes)

**And** post-deployment validation without cookie succeeds:
```bash
# Test without cookie (should route to existing S3Origin)
curl -I https://d7roov8fndsis.cloudfront.net/
# Should return 200, content from existing origin
```

**And** post-deployment validation with cookie succeeds:
```bash
# Set cookie in browser console
document.cookie = "NDX=true; path=/"

# Browse to https://d7roov8fndsis.cloudfront.net/
# Should see content from ndx-static-prod bucket
```

**And** cookie removal verification succeeds:
```bash
# Clear cookie in browser console
document.cookie = "NDX=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/"

# Reload page
# Should revert to existing origin content
```

**And** operational verification confirms:
- Production site accessible (zero downtime - NFR-REL-1)
- API endpoints functional (no disruption to /prod/* routes)
- CloudFront metrics show requests to both origins
- No error rate increase

**Prerequisites:** Story 2.5 (Function attached to cache behavior)

**Technical Notes:**
- Wait 10-15 minutes for CloudFront global propagation (NFR-PERF-6)
- Smoke tests validate FR9, FR10, FR11 (cookie routing logic)
- FR35: Post-deployment smoke tests required
- Browser DevTools Network tab shows X-Cache headers for debugging
- CloudWatch metrics track origin request counts (FR41-42)
- Architecture section: "Post-Deployment Validation" documents tests
- This completes MVP: Testers can now access new UI via cookie

---

## Epic 3: Testing, Validation & Operational Readiness

**Goal:** Establish comprehensive testing, deployment validation, and operational procedures to ensure reliable and maintainable cookie-based routing infrastructure.

**User Value:** Development team can confidently deploy, monitor, and rollback routing changes with complete test coverage and documented procedures, ensuring long-term operational success.

**FRs Covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR43, FR44

---

### Story 3.1: Write CDK Snapshot Tests for CloudFront Configuration

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

### Story 3.2: Write Fine-Grained Assertion Tests for Critical Properties

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

### Story 3.3: Create Integration Test for Real AWS Deployment

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

### Story 3.4: Document Rollback Procedures

As a developer,
I want clear rollback procedures documented,
So that the team can quickly revert changes if routing issues are discovered.

**Acceptance Criteria:**

**Given** the routing infrastructure is deployed
**When** I create rollback documentation in `infra/README.md`
**Then** the documentation includes three-tier rollback approach:

**Option 1: Disable Function (Fastest - < 5 minutes)**
```markdown
## Rollback Option 1: Disable Function (Recommended)

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
## Rollback Option 2: Git Revert

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
## Rollback Option 3: Remove Origin and Function

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

### Story 3.5: Update Infrastructure README with Operations Guide

As a developer,
I want the infrastructure README updated with deployment, monitoring, and troubleshooting guidance,
So that any team member can operate the routing infrastructure confidently.

**Acceptance Criteria:**

**Given** the routing infrastructure is complete
**When** I update `infra/README.md`
**Then** the README includes new sections:

**Section: CloudFront Cookie-Based Routing**
```markdown
## CloudFront Cookie-Based Routing

### Overview
The NDX CloudFront distribution uses cookie-based routing to enable safe testing of new UI versions.

- **Cookie Name:** `NDX` (case-sensitive)
- **Cookie Value:** `true` (exact match, case-sensitive)
- **Behavior:**
  - With `NDX=true`: Routes to `ndx-static-prod` S3 bucket
  - Without cookie: Routes to existing S3Origin (production site)
  - API routes: Unaffected (API Gateway origin unchanged)

### How to Test New UI
1. Open browser DevTools Console
2. Set cookie: `document.cookie = "NDX=true; path=/"`
3. Browse to https://d7roov8fndsis.cloudfront.net/
4. You should see content from new S3 bucket
5. To revert: `document.cookie = "NDX=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/"`
```

**Section: Deployment Process**
```markdown
## Deployment Process

### Pre-Deployment Checklist
- [ ] All tests pass: `yarn test`
- [ ] Linting clean: `yarn lint`
- [ ] CDK diff reviewed: `cdk diff --profile NDX/InnovationSandboxHub`
- [ ] API Gateway origin unchanged in diff
- [ ] Team notified of deployment window

### Deploy
```bash
cd infra
cdk deploy --profile NDX/InnovationSandboxHub
```

### Post-Deployment Validation
- Wait 10-15 minutes for global propagation
- Run integration test: `test/integration.sh`
- Manual cookie test (see "How to Test New UI" above)
- Check CloudWatch metrics for errors
```

**Section: Monitoring**
```markdown
## Monitoring

### CloudFront Metrics (AWS Console)
- Navigate to: CloudFront > Distributions > E3THG4UHYDHVWP > Monitoring
- Key metrics:
  - Requests per origin (verify both origins receiving traffic)
  - Error rate (4xx/5xx) per origin
  - Cache hit ratio (should remain high)

### Checking Distribution Status
```bash
aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.Status'
# Output: "Deployed" when changes are live
```
```

**Section: Troubleshooting**
```markdown
## Troubleshooting

### Cookie routing not working
- Verify propagation complete (10-15 minutes after deploy)
- Check cookie set correctly: `document.cookie` in DevTools
- Inspect Network tab: Look for `X-Cache` header
- Verify function deployed: AWS Console > CloudFront > Functions

### Production site not loading
- Immediately execute Rollback Option 1 (disable function)
- Check CloudFormation events for errors
- Verify existing S3Origin unchanged in distribution config

### Tests failing
- CDK snapshot mismatch: Review diff, update with `yarn test -u` if intentional
- Integration test fails: Check AWS CLI authentication and permissions
- Unit tests fail: Review cookie parsing logic changes
```

**And** README includes:
- Clear operational procedures
- Copy-paste commands
- Troubleshooting steps with solutions
- Links to AWS Console paths

**And** README version/date updated
**And** Team reviewed and approved documentation

**Prerequisites:** Story 3.4 (Rollback procedures documented)

**Technical Notes:**
- FR18, FR19: Deployment and operational documentation requirements
- NFR-OPS-3: Post-deployment validation steps documented
- NFR-OPS-5: CloudFront metrics accessibility
- NFR-OPS-6: Actionable error messages and remediation
- NFR-MAINT-5: Complete operational instructions
- Living document: Update with operational learnings

---

### Story 3.6: Create Pre-Deployment Checklist and Validation Script

As a developer,
I want an automated pre-deployment checklist script,
So that critical validations are completed before every CloudFront deployment.

**Acceptance Criteria:**

**Given** the routing infrastructure code exists
**When** I create `infra/scripts/pre-deploy-check.sh`
**Then** the script validates:

```bash
#!/bin/bash
set -e

echo "==================================="
echo "Pre-Deployment Checklist"
echo "==================================="
echo ""

ERRORS=0

# Check 1: Tests pass
echo "✓ Running tests..."
if ! yarn test --silent; then
  echo "❌ Tests failed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ All tests pass"
fi

# Check 2: Linting clean
echo ""
echo "✓ Running linter..."
if ! yarn lint; then
  echo "❌ Linting errors found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Linting clean"
fi

# Check 3: CDK synth succeeds
echo ""
echo "✓ Validating CDK synthesis..."
if ! cdk synth --profile NDX/InnovationSandboxHub > /dev/null; then
  echo "❌ CDK synth failed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ CDK synthesis successful"
fi

# Check 4: TypeScript compilation
echo ""
echo "✓ Checking TypeScript compilation..."
if ! yarn build; then
  echo "❌ TypeScript compilation failed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ TypeScript compiles cleanly"
fi

# Check 5: AWS credentials valid
echo ""
echo "✓ Validating AWS credentials..."
if ! aws sts get-caller-identity --profile NDX/InnovationSandboxHub > /dev/null; then
  echo "❌ AWS credentials invalid or expired"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ AWS credentials valid"
fi

echo ""
echo "==================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed!"
  echo "Ready to deploy: cdk deploy --profile NDX/InnovationSandboxHub"
  echo "==================================="
  exit 0
else
  echo "❌ $ERRORS check(s) failed"
  echo "Fix errors before deploying"
  echo "==================================="
  exit 1
fi
```

**And** script is executable: `chmod +x infra/scripts/pre-deploy-check.sh`
**And** script exits with code 0 if all checks pass
**And** script exits with code 1 if any check fails
**And** script output clearly shows which checks passed/failed

**And** add to `package.json`:
```json
{
  "scripts": {
    "pre-deploy": "scripts/pre-deploy-check.sh"
  }
}
```

**And** README documents: "Run `yarn pre-deploy` before every CDK deployment"

**Prerequisites:** Story 3.5 (README updated)

**Technical Notes:**
- Automates pre-deployment checklist from Story 3.5
- Prevents common deployment errors (tests fail, lint errors, AWS auth issues)
- FR16: Tests must pass before deployment
- NFR-MAINT-1: ESLint zero errors requirement
- NFR-OPS-2: Pre-deployment checklist requirement
- Fast feedback: Catches issues before 15-minute CloudFront deployment
- Can be integrated into CI/CD pipeline later

---

## FR Coverage Matrix

| FR | Description | Epic | Stories |
|----|-------------|------|---------|
| FR1 | Add ndx-static-prod as new origin to E3THG4UHYDHVWP | Epic 1 | Story 1.2 |
| FR2 | Configure OAC for new origin | Epic 1 | Story 1.2 |
| FR3 | Define origin properties matching existing | Epic 1 | Story 1.2 |
| FR4 | Reference existing distribution in CDK | Epic 1 | Story 1.1 |
| FR5 | Preserve existing S3Origin unchanged | Epic 1 | Story 1.3 |
| FR6 | Preserve API Gateway origin unchanged | Epic 1 | Story 1.3 |
| FR7 | Inspect Cookie header | Epic 2 | Story 2.1 |
| FR8 | Parse Cookie header for NDX value | Epic 2 | Story 2.1 |
| FR9 | Route to new origin when NDX=true | Epic 2 | Story 2.1, 2.6 |
| FR10 | Route to existing origin when cookie missing | Epic 2 | Story 2.1, 2.6 |
| FR11 | Route to existing origin when NDX≠true | Epic 2 | Story 2.1, 2.6 |
| FR12 | Execute routing for default cache behavior | Epic 2 | Story 2.5 |
| FR13 | NOT execute for API Gateway routes | Epic 2 | Story 2.5 |
| FR14 | Return modified request with origin | Epic 2 | Story 2.1 |
| FR15 | Deploy CloudFront Function | Epic 2 | Story 2.4 |
| FR16 | Define function code in CDK | Epic 2 | Story 2.4 |
| FR17 | Attach function to cache behavior | Epic 2 | Story 2.5 |
| FR18 | Function deployment in CDK update | Epic 2 | Story 2.6 |
| FR19 | Propagate function globally | Epic 2 | Story 2.6 |
| FR20 | Preserve cache policy settings | Epic 2 | Story 2.3 |
| FR21 | Forward cookies to function | Epic 2 | Story 2.3 |
| FR22 | Preserve viewer protocol policy | Epic 2 | Story 2.5 |
| FR23 | Preserve allowed HTTP methods | Epic 2 | Story 2.5 |
| FR24 | Preserve response headers policies | Epic 2 | Story 2.5 |
| FR25 | Import distribution by ID | Epic 1 | Story 1.1 |
| FR26 | Modify without recreating | Epic 1 | Story 1.1, 1.4 |
| FR27 | Validate via cdk synth | Epic 1 | Story 1.1, 1.2 |
| FR28 | Preview via cdk diff | Epic 1 | Story 1.2, 1.3 |
| FR29 | Deploy via cdk deploy with zero downtime | Epic 1 | Story 1.4 |
| FR30 | Idempotent deployment | Epic 1 | Story 1.4 |
| FR31 | CDK tests validate new origin | Epic 3 | Story 3.2 |
| FR32 | CDK tests validate API Gateway unchanged | Epic 3 | Story 3.2 |
| FR33 | Validate function code syntax | Epic 3 | Story 2.2, 3.1 |
| FR34 | Validate cache behavior config | Epic 3 | Story 3.2 |
| FR35 | Smoke tests post-deployment | Epic 3 | Story 2.6, 3.3 |
| FR36 | Disable function for rollback | Epic 3 | Story 3.4 |
| FR37 | Remove origin for rollback | Epic 3 | Story 3.4 |
| FR38 | Revert via version control | Epic 3 | Story 3.4 |
| FR39 | Investigate failures via CloudFormation | Epic 3 | Story 3.3, 3.5 |
| FR40 | Automatic CloudFormation rollback | Epic 1, Epic 2 | Story 1.4, 2.6 |
| FR41 | Metrics for request counts per origin | Epic 3 | Story 3.5 |
| FR42 | Metrics for error rates per origin | Epic 3 | Story 3.5 |
| FR43 | Monitor function execution (optional) | Epic 3 | Story 3.5 |
| FR44 | Log routing decisions (optional) | Epic 3 | Story 3.5 |

**Coverage Validation:** All 44 FRs mapped to stories ✓

---

## Epic Story Count Summary

- **Epic 1 (CloudFront Origin Infrastructure):** 4 stories
- **Epic 2 (Cookie-Based Routing Implementation):** 6 stories
- **Epic 3 (Testing, Validation & Operational Readiness):** 6 stories

**Total:** 16 implementable stories

---

## Summary

This epic breakdown transforms the NDX CloudFront Origin Routing PRD into 16 bite-sized, implementable stories across 3 epics. All 44 functional requirements and 35 non-functional requirements are covered with full architectural context.

**Key Strengths:**
- **Surgical infrastructure change:** Minimal risk, focused scope, preserves production stability
- **Vertical slicing:** Each story delivers complete functionality, not just one layer
- **Clear prerequisites:** Sequential dependencies only (no forward references)
- **BDD acceptance criteria:** Given/When/Then format for all stories
- **Architecture integration:** Technical notes reference specific architecture decisions (ADRs)
- **Security first:** OAC reuse, origin validation, API Gateway untouched
- **Complete testing:** Unit tests, snapshot tests, assertions, integration tests
- **Operational readiness:** Rollback procedures, monitoring, troubleshooting docs
- **Government service standards:** Zero downtime, auditability, reversibility

**Implementation Approach:**
1. Execute stories sequentially within each epic
2. Each story is sized for single developer session completion
3. All tests must pass before moving to next story
4. Documentation updated continuously, not at the end

**Context for Phase 4:**
- PRD provides functional requirements (WHAT capabilities)
- Architecture provides technical decisions (HOW to implement with ADRs)
- Epics provide tactical implementation plan (STORY-BY-STORY breakdown)
- Development agent will use all three documents to implement each story

**MVP Delivery:** After completing all 3 epics, testers can use `NDX=true` cookie to access new UI for testing while production users continue seeing existing site with zero changes—enabling safe, gradual UI evolution for the UK government's National Digital Exchange platform.

---

**Next Workflow:** Phase 3 - Sprint Planning

Create sprint status file from these epics and begin Phase 4 implementation.

---

_For implementation: Each story contains complete acceptance criteria, prerequisites, and technical notes for autonomous development agent execution._

