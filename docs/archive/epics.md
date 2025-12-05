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
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"

const distribution = cloudfront.Distribution.fromDistributionAttributes(this, "ImportedDistribution", {
  distributionId: "E3THG4UHYDHVWP",
  domainName: "d7roov8fndsis.cloudfront.net",
})
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
import * as s3 from "aws-cdk-lib/aws-s3"

const newOriginBucket = s3.Bucket.fromBucketName(this, "NewOriginBucket", "ndx-static-prod")

const newOrigin = new origins.S3Origin(newOriginBucket, {
  originId: "ndx-static-prod-origin",
  originAccessControlId: "E3P8MA1G9Y5BYE", // Reuse existing OAC
  connectionAttempts: 3,
  connectionTimeout: cdk.Duration.seconds(10),
  readTimeout: cdk.Duration.seconds(30),
  customHeaders: {},
})
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
  var request = event.request
  var cookies = parseCookies(request.headers.cookie)

  // Route to new origin if NDX=true
  if (cookies["NDX"] === "true") {
    request.origin = {
      s3: {
        domainName: "ndx-static-prod.s3.us-west-2.amazonaws.com",
        region: "us-west-2",
        authMethod: "origin-access-control",
        originAccessControlId: "E3P8MA1G9Y5BYE",
      },
    }
  }
  // Else: request unchanged, routes to default S3Origin

  return request
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {}

  var cookies = {}
  cookieHeader.value.split(";").forEach(function (cookie) {
    var parts = cookie.split("=")
    var key = parts[0].trim()
    var value = parts[1] ? parts[1].trim() : ""
    cookies[key] = value
  })

  return cookies
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
const event = { request: { headers: { cookie: { value: "NDX=true" } } } }
const result = handler(event)
expect(result.origin.s3.domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
expect(result.origin.s3.originAccessControlId).toBe("E3P8MA1G9Y5BYE")
```

**Test Case 2: Use default origin when cookie missing**

```typescript
const event = { request: { headers: {} } }
const result = handler(event)
expect(result.origin).toBeUndefined() // Request unchanged
```

**Test Case 3: Use default origin when NDX=false**

```typescript
const event = { request: { headers: { cookie: { value: "NDX=false" } } } }
const result = handler(event)
expect(result.origin).toBeUndefined()
```

**Test Case 4: Parse multiple cookies correctly**

```typescript
const event = { request: { headers: { cookie: { value: "session=abc123; NDX=true; other=xyz" } } } }
const result = handler(event)
expect(result.origin.s3.domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
```

**Test Case 5: Handle malformed cookies gracefully**

```typescript
const event = { request: { headers: { cookie: { value: "invalid;;;NDX=true" } } } }
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
const cachePolicy = new cloudfront.CachePolicy(this, "NdxCookieRoutingPolicy", {
  cachePolicyName: "NdxCookieRoutingPolicy",
  comment: "Cache policy for NDX cookie-based routing",
  defaultTtl: cdk.Duration.seconds(86400), // 1 day
  minTtl: cdk.Duration.seconds(1),
  maxTtl: cdk.Duration.seconds(31536000), // 1 year
  cookieBehavior: cloudfront.CacheCookieBehavior.whitelist("NDX"),
  queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
  headerBehavior: cloudfront.CacheHeaderBehavior.none(),
  enableAcceptEncodingGzip: true,
  enableAcceptEncodingBrotli: true,
})
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
import * as fs from "fs"
import * as path from "path"

const functionCode = fs.readFileSync(path.join(__dirname, "functions/cookie-router.js"), "utf8")

const cookieRouterFunction = new cloudfront.Function(this, "CookieRouterFunction", {
  functionName: "ndx-cookie-router",
  code: cloudfront.FunctionCode.fromInline(functionCode),
  comment: "Routes requests based on NDX cookie value",
  runtime: cloudfront.FunctionRuntime.JS_2_0,
})
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

const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution

cfnDistribution.addPropertyOverride("DistributionConfig.DefaultCacheBehavior", {
  TargetOriginId: "S3Origin", // Keep existing default
  ViewerProtocolPolicy: "redirect-to-https",
  AllowedMethods: ["GET", "HEAD", "OPTIONS"],
  CachedMethods: ["GET", "HEAD"],
  CachePolicyId: cachePolicy.cachePolicyId,
  FunctionAssociations: [
    {
      EventType: "viewer-request",
      FunctionARN: cookieRouterFunction.functionArn,
    },
  ],
})
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
- API endpoints functional (no disruption to /prod/\* routes)
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
import { App } from "aws-cdk-lib"
import { Template } from "aws-cdk-lib/assertions"
import { NdxStaticStack } from "../lib/ndx-stack"

describe("NdxStaticStack", () => {
  test("CloudFront configuration snapshot", () => {
    const app = new App()
    const stack = new NdxStaticStack(app, "TestStack")
    const template = Template.fromStack(stack)

    expect(template.toJSON()).toMatchSnapshot()
  })
})
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
test("New S3 origin configured correctly", () => {
  const template = Template.fromStack(stack)

  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Origins: expect.arrayContaining([
        {
          Id: "ndx-static-prod-origin",
          DomainName: "ndx-static-prod.s3.us-west-2.amazonaws.com",
          S3OriginConfig: {
            OriginAccessIdentity: "",
          },
          OriginAccessControlId: "E3P8MA1G9Y5BYE",
        },
      ]),
    },
  })
})
```

**Test 2: API Gateway origin unchanged**

```typescript
test("API Gateway origin remains unchanged", () => {
  const template = Template.fromStack(stack)

  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      Origins: expect.arrayContaining([
        expect.objectContaining({
          DomainName: "1ewlxhaey6.execute-api.us-west-2.amazonaws.com",
          CustomOriginConfig: expect.any(Object),
        }),
      ]),
    },
  })
})
```

**Test 3: CloudFront Function created**

```typescript
test("CloudFront Function configured", () => {
  template.hasResourceProperties("AWS::CloudFront::Function", {
    Name: "ndx-cookie-router",
    FunctionConfig: {
      Runtime: "cloudfront-js-2.0",
    },
  })
})
```

**Test 4: Cache Policy with NDX cookie allowlist**

```typescript
test("Cache Policy forwards NDX cookie only", () => {
  template.hasResourceProperties("AWS::CloudFront::CachePolicy", {
    CachePolicyConfig: {
      Name: "NdxCookieRoutingPolicy",
      ParametersInCacheKeyAndForwardedToOrigin: {
        CookiesConfig: {
          CookieBehavior: "whitelist",
          Cookies: ["NDX"],
        },
      },
    },
  })
})
```

**Test 5: Default cache behavior has function attached**

```typescript
test("Function attached to default cache behavior", () => {
  template.hasResourceProperties("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        FunctionAssociations: [
          {
            EventType: "viewer-request",
            FunctionARN: expect.stringContaining("ndx-cookie-router"),
          },
        ],
      },
    },
  })
})
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

````markdown
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
````

3. Deploy: `cdk deploy --profile NDX/InnovationSandboxHub`
4. Propagation: ~5-10 minutes
5. Result: All traffic routes to existing S3Origin

**Validation:**

- Test with NDX=true cookie (should still see existing site)
- Production traffic unaffected

````

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
````

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

````markdown
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
````

### Post-Deployment Validation

- Wait 10-15 minutes for global propagation
- Run integration test: `test/integration.sh`
- Manual cookie test (see "How to Test New UI" above)
- Check CloudWatch metrics for errors

````

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
````

````

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
````

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

| FR   | Description                                         | Epic           | Stories        |
| ---- | --------------------------------------------------- | -------------- | -------------- |
| FR1  | Add ndx-static-prod as new origin to E3THG4UHYDHVWP | Epic 1         | Story 1.2      |
| FR2  | Configure OAC for new origin                        | Epic 1         | Story 1.2      |
| FR3  | Define origin properties matching existing          | Epic 1         | Story 1.2      |
| FR4  | Reference existing distribution in CDK              | Epic 1         | Story 1.1      |
| FR5  | Preserve existing S3Origin unchanged                | Epic 1         | Story 1.3      |
| FR6  | Preserve API Gateway origin unchanged               | Epic 1         | Story 1.3      |
| FR7  | Inspect Cookie header                               | Epic 2         | Story 2.1      |
| FR8  | Parse Cookie header for NDX value                   | Epic 2         | Story 2.1      |
| FR9  | Route to new origin when NDX=true                   | Epic 2         | Story 2.1, 2.6 |
| FR10 | Route to existing origin when cookie missing        | Epic 2         | Story 2.1, 2.6 |
| FR11 | Route to existing origin when NDX≠true              | Epic 2         | Story 2.1, 2.6 |
| FR12 | Execute routing for default cache behavior          | Epic 2         | Story 2.5      |
| FR13 | NOT execute for API Gateway routes                  | Epic 2         | Story 2.5      |
| FR14 | Return modified request with origin                 | Epic 2         | Story 2.1      |
| FR15 | Deploy CloudFront Function                          | Epic 2         | Story 2.4      |
| FR16 | Define function code in CDK                         | Epic 2         | Story 2.4      |
| FR17 | Attach function to cache behavior                   | Epic 2         | Story 2.5      |
| FR18 | Function deployment in CDK update                   | Epic 2         | Story 2.6      |
| FR19 | Propagate function globally                         | Epic 2         | Story 2.6      |
| FR20 | Preserve cache policy settings                      | Epic 2         | Story 2.3      |
| FR21 | Forward cookies to function                         | Epic 2         | Story 2.3      |
| FR22 | Preserve viewer protocol policy                     | Epic 2         | Story 2.5      |
| FR23 | Preserve allowed HTTP methods                       | Epic 2         | Story 2.5      |
| FR24 | Preserve response headers policies                  | Epic 2         | Story 2.5      |
| FR25 | Import distribution by ID                           | Epic 1         | Story 1.1      |
| FR26 | Modify without recreating                           | Epic 1         | Story 1.1, 1.4 |
| FR27 | Validate via cdk synth                              | Epic 1         | Story 1.1, 1.2 |
| FR28 | Preview via cdk diff                                | Epic 1         | Story 1.2, 1.3 |
| FR29 | Deploy via cdk deploy with zero downtime            | Epic 1         | Story 1.4      |
| FR30 | Idempotent deployment                               | Epic 1         | Story 1.4      |
| FR31 | CDK tests validate new origin                       | Epic 3         | Story 3.2      |
| FR32 | CDK tests validate API Gateway unchanged            | Epic 3         | Story 3.2      |
| FR33 | Validate function code syntax                       | Epic 3         | Story 2.2, 3.1 |
| FR34 | Validate cache behavior config                      | Epic 3         | Story 3.2      |
| FR35 | Smoke tests post-deployment                         | Epic 3         | Story 2.6, 3.3 |
| FR36 | Disable function for rollback                       | Epic 3         | Story 3.4      |
| FR37 | Remove origin for rollback                          | Epic 3         | Story 3.4      |
| FR38 | Revert via version control                          | Epic 3         | Story 3.4      |
| FR39 | Investigate failures via CloudFormation             | Epic 3         | Story 3.3, 3.5 |
| FR40 | Automatic CloudFormation rollback                   | Epic 1, Epic 2 | Story 1.4, 2.6 |
| FR41 | Metrics for request counts per origin               | Epic 3         | Story 3.5      |
| FR42 | Metrics for error rates per origin                  | Epic 3         | Story 3.5      |
| FR43 | Monitor function execution (optional)               | Epic 3         | Story 3.5      |
| FR44 | Log routing decisions (optional)                    | Epic 3         | Story 3.5      |

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

---

---

# Feature 2: Try Before You Buy (AWS Innovation Sandbox Integration)

**Author:** cns
**Date:** 2025-11-22
**Project:** National Digital Exchange - Try Before You Buy Feature
**Domain:** GovTech (UK Government)

---

## Overview

This section provides the complete epic and story breakdown for the NDX Try Before You Buy feature, enabling government users to request and access temporary AWS sandbox environments directly from the NDX catalogue.

**Features Covered:**

- Self-service AWS sandbox requests from NDX catalogue
- Authentication and session management
- Try sessions dashboard
- WCAG 2.2 AA/AAA accessibility compliance
- GOV.UK Design System integration

**Context Incorporated:**

- ✅ PRD requirements (79 FRs, 47 NFRs)
- ✅ Architecture ADRs (37 ADRs fully referenced across all epic stories)
- ✅ UX Design specifications (5 user journeys, component specs, design patterns)

**Enhancement Status:**

- ✅ Epic 4 (Local Development Infrastructure): Architecture context added (6 stories)
- ✅ Epic 5 (Authentication Foundation): Architecture + UX context added (10 stories)
- ✅ Epic 6 (Try Button & Lease Request): Architecture + UX context added (12 stories, CRITICAL ADR-026 Modal)
- ✅ Epic 7 (Try Sessions Dashboard): Architecture + UX context added (13 stories, CRITICAL ADR-027 Responsive Table)
- ✅ Epic 8 (Accessibility & Mobile): Architecture + UX context added (11 stories, Testing Gates)

**Total Stories Enhanced:** 52 stories across 5 epics with full Architecture and UX design context

---

## Functional Requirements Inventory - Feature 2

### Authentication & Session Management (10 FRs)

- **FR-TRY-1:** System can detect if user is authenticated by checking sessionStorage for `isb-jwt` token
- **FR-TRY-2:** System can initiate OAuth login by redirecting to `/api/auth/login`
- **FR-TRY-3:** System can extract JWT token from URL query parameter after OAuth redirect
- **FR-TRY-4:** System can store JWT token in sessionStorage with key `isb-jwt`
- **FR-TRY-5:** System can clean up URL query parameters after extracting token
- **FR-TRY-6:** System can retrieve stored JWT token from sessionStorage for API calls
- **FR-TRY-7:** System can clear JWT token from sessionStorage on sign-out
- **FR-TRY-8:** System persists authentication across browser tabs (sessionStorage accessible)
- **FR-TRY-9:** System clears authentication on browser restart (sessionStorage does not persist)
- **FR-TRY-10:** System sends `Authorization: Bearer {token}` header with all Innovation Sandbox API requests

### User Interface - Sign In/Out (5 FRs)

- **FR-TRY-11:** System displays "Sign in" button in top-right navigation when user not authenticated
- **FR-TRY-12:** System displays "Sign out" button in top-right navigation when user authenticated
- **FR-TRY-13:** Sign in button triggers OAuth redirect to `/api/auth/login`
- **FR-TRY-14:** Sign out button clears sessionStorage and redirects to home page
- **FR-TRY-15:** System uses GOV.UK Design System button styling for sign in/out buttons

### Innovation Sandbox API Integration (9 FRs)

- **FR-TRY-16:** System can call `GET /api/auth/login/status` to check authentication status
- **FR-TRY-17:** System can parse user session data (email, displayName, userName, roles)
- **FR-TRY-18:** System can call `GET /api/leases?userEmail={email}` to retrieve user's leases
- **FR-TRY-19:** System can parse lease data (uuid, status, awsAccountId, maxSpend, totalCostAccrued, expirationDate)
- **FR-TRY-20:** System can call `GET /api/leaseTemplates` to retrieve available lease templates
- **FR-TRY-21:** System can call `GET /api/configurations` to retrieve AUP text and system configuration
- **FR-TRY-22:** System can call `POST /api/leases` with payload to request new lease
- **FR-TRY-23:** System can handle API errors (401 unauthorized, 409 max leases exceeded, 5xx server errors)
- **FR-TRY-24:** System redirects to login if API returns 401 unauthorized response

### Try Page (/try) (5 FRs)

- **FR-TRY-25:** System can render `/try` page route
- **FR-TRY-26:** System displays "Sign in to view your try sessions" message when unauthenticated
- **FR-TRY-27:** System displays "Sign in" button on /try page when unauthenticated
- **FR-TRY-28:** System fetches and displays user's leases when authenticated
- **FR-TRY-29:** System renders empty state message if user has no leases

### Try Sessions Display (8 FRs)

- **FR-TRY-30:** System displays sessions table with columns: Template Name, AWS Account ID, Expiry, Budget, Status
- **FR-TRY-31:** System formats expiry as relative time for past sessions
- **FR-TRY-32:** System formats expiry as absolute date/time for future expirations
- **FR-TRY-33:** System displays budget as "${costAccrued} / ${maxSpend}" format
- **FR-TRY-34:** System displays cost accrued to 4 decimal places
- **FR-TRY-35:** System displays status badge with color coding (Active/Pending/Expired/Terminated/Failed)
- **FR-TRY-36:** System sorts sessions by creation date (newest first)
- **FR-TRY-37:** System visually distinguishes active sessions from expired/terminated

### Active Session Management (4 FRs)

- **FR-TRY-38:** System displays "Launch AWS Console" button for sessions with status "Active"
- **FR-TRY-39:** Launch button opens AWS SSO portal in new tab with correct URL format
- **FR-TRY-40:** System displays remaining lease duration for active sessions
- **FR-TRY-41:** System does not show launch button for Expired/Terminated/Failed sessions

### Catalogue Integration (7 FRs)

- **FR-TRY-42:** System can parse `try` metadata field from product page YAML frontmatter
- **FR-TRY-43:** System can parse `try_id` metadata field (lease template UUID)
- **FR-TRY-44:** System adds "Try Before You Buy" tag to products with `try` metadata
- **FR-TRY-45:** System renders "Try Before You Buy" tag in catalogue listing filters
- **FR-TRY-46:** System filters catalogue by "Try Before You Buy" tag
- **FR-TRY-47:** System renders "Try this now for 24 hours" button on product pages with `try` metadata
- **FR-TRY-48:** Try button uses govukButton macro with `isStartButton: true`

### Try Button & Lease Request Modal (17 FRs)

- **FR-TRY-49:** Clicking "Try" button checks authentication status first
- **FR-TRY-50:** If unauthenticated, Try button initiates OAuth sign-in flow
- **FR-TRY-51:** If authenticated, Try button displays lease request modal overlay
- **FR-TRY-52:** Modal displays lease duration (24 hours)
- **FR-TRY-53:** Modal displays max budget ($50)
- **FR-TRY-54:** Modal fetches and displays AUP text from `/api/configurations`
- **FR-TRY-55:** Modal renders AUP text in scrollable container
- **FR-TRY-56:** Modal displays required checkbox "I accept the Acceptable Use Policy"
- **FR-TRY-57:** Continue button disabled until AUP checkbox checked
- **FR-TRY-58:** Cancel button closes modal without action
- **FR-TRY-59:** Continue button requests lease via `POST /api/leases`
- **FR-TRY-60:** System shows loading indicator during lease request
- **FR-TRY-61:** On successful lease request, system navigates to `/try` page
- **FR-TRY-62:** On error response (409 max leases), system shows JavaScript alert
- **FR-TRY-63:** On 409 error, system redirects to `/try` page after alert dismissed
- **FR-TRY-64:** On other errors, system shows JavaScript alert with error message
- **FR-TRY-65:** Modal closes on successful lease request or after error handling

### Responsive Design & Mobile Support (4 FRs)

- **FR-TRY-66:** All try-related UI elements responsive for mobile/tablet viewports (320px+ width)
- **FR-TRY-67:** Sessions table adapts to mobile (stacked cards or horizontal scroll)
- **FR-TRY-68:** Modal overlay adapts to mobile viewport
- **FR-TRY-69:** Sign in/out buttons accessible on mobile nav

### Accessibility (WCAG 2.2) (10 FRs)

- **FR-TRY-70:** All interactive elements keyboard navigable
- **FR-TRY-71:** Focus indicators visible for keyboard navigation
- **FR-TRY-72:** Modal can be closed with Escape key
- **FR-TRY-73:** Modal traps focus (tab cycles through modal elements only)
- **FR-TRY-74:** Screen reader announces session status (ARIA labels)
- **FR-TRY-75:** Screen reader announces budget status (ARIA labels)
- **FR-TRY-76:** Color contrast ratios meet WCAG 2.2 AA standards
- **FR-TRY-77:** Status badges use both color AND text (not color-only)
- **FR-TRY-78:** Form labels associated with inputs (checkbox for AUP)
- **FR-TRY-79:** Error messages announced to screen readers (ARIA live regions)

**Total:** 79 Functional Requirements for Feature 2

---

## Epic Summary - Feature 2

**5 Epics** delivering self-service AWS sandbox access:

1. **Epic 4:** Local Development Infrastructure (Foundation)
2. **Epic 5:** Authentication Foundation
3. **Epic 6:** Catalogue Integration & Sandbox Requests
4. **Epic 7:** Try Sessions Dashboard
5. **Epic 8:** Accessible & Mobile-Friendly Experience + Brownfield Audit

---

## FR Coverage Map - Feature 2

- **Epic 4:** Testing infrastructure (NFRs)
- **Epic 5:** FR-TRY-1 through FR-TRY-17, FR-TRY-24 (19 FRs - Auth foundation)
- **Epic 6:** FR-TRY-42 through FR-TRY-65 (24 FRs - Catalogue + Requests)
- **Epic 7:** FR-TRY-18 through FR-TRY-23, FR-TRY-25 through FR-TRY-41 (22 FRs - Dashboard + Sessions)
- **Epic 8:** FR-TRY-66 through FR-TRY-79 (14 FRs - Accessibility + Mobile)

**All 79 FRs covered** ✓

---

## Epic 4: Local Development Infrastructure

**Goal:** Development team can build and test Try feature locally with production-like environment

**User Value:** Enables efficient development iteration, prevents "works on my machine" issues, establishes testing foundation

**FRs Covered:** NFR-TRY-TEST-1, NFR-TRY-TEST-2, NFR-TRY-TEST-3

---

### Story 4.1: mitmproxy Setup Documentation

As a developer,
I want clear documentation on setting up mitmproxy for local Try feature development,
So that I can intercept CloudFront API requests and redirect them to local NDX server.

**Acceptance Criteria:**

**Given** mitmproxy is not yet configured
**When** I create `/docs/development/local-try-setup.md`
**Then** the documentation includes:

**Section: Prerequisites**

- Python 3.8+ installed
- mitmproxy installed: `pip install mitmproxy`
- NDX node server can run on localhost:8080
- Innovation Sandbox CloudFront domain: `https://d7roov8fndsis.cloudfront.net`

**Section: How mitmproxy Works for Try Development**

- mitmproxy acts as transparent proxy intercepting CloudFront domain requests
- UI requests (HTML, CSS, JS) → forward to localhost:8080 (local NDX server)
- API requests (`/api/*`) → pass through to real CloudFront (Innovation Sandbox backend)
- Enables local UI development with real backend API

**Section: Architecture Diagram**

```
Browser Request → mitmproxy (localhost:8081)
                      ↓
        ┌─────────────┴─────────────┐
        ↓                           ↓
  UI Routes                    API Routes
(/*.html, /*.js, /*.css)      (/api/*)
        ↓                           ↓
localhost:8080               CloudFront
(Local NDX Server)         (Real Backend)
```

**Section: Configuration Steps**

1. Install mitmproxy: `pip install mitmproxy`
2. Create addon script: `scripts/mitmproxy-addon.py` (Story 4.2)
3. Configure system proxy settings to use localhost:8081
4. Run mitmproxy with addon (Story 4.3)
5. Start NDX server on port 8080
6. Browse to `https://d7roov8fndsis.cloudfront.net` (proxied)

**And** documentation includes troubleshooting section
**And** documentation includes validation steps to confirm setup working

**Prerequisites:** None (first story in epic)

**Technical Notes:**

- mitmproxy listens on localhost:8081 (avoids clash with NDX server on 8080)
- Transparent proxy intercepts specific domain only
- Does NOT intercept all traffic (minimally invasive)
- System proxy settings revert when mitmproxy stopped

**Architecture Context:**

- **ADR-015:** Vanilla Eleventy with TypeScript (brownfield constraint)
  - Local server runs Eleventy build output on port 8080
  - mitmproxy routes UI requests to local build (hot-reload workflow)
- **Development Workflow:** Proxy enables local UI development with real Innovation Sandbox API
  - UI changes: Served from localhost:8080 (rapid iteration)
  - API calls: Proxied to CloudFront (real backend, real data)
  - No need to mock Innovation Sandbox API (reduces maintenance burden)
- **Output:** `/docs/development/local-try-setup.md` comprehensive setup guide

**UX Design Context:**

- **Developer Experience:** Fast iteration on UI changes without backend mocking
- **Production Parity:** Tests against real Innovation Sandbox API (catches integration issues early)

---

### Story 4.2: Create mitmproxy Addon Script for Conditional Forwarding

As a developer,
I want a mitmproxy addon script that conditionally forwards requests,
So that UI routes go to local server and API routes pass through to real backend.

**Acceptance Criteria:**

**Given** mitmproxy is installed
**When** I create `scripts/mitmproxy-addon.py`
**Then** the script includes:

```python
from mitmproxy import http

def request(flow: http.HTTPFlow) -> None:
    """
    Conditional request forwarding for NDX Try development.

    - UI routes (HTML, CSS, JS) → localhost:8080 (local NDX server)
    - API routes (/api/*) → CloudFront (real Innovation Sandbox backend)
    """

    # Only intercept CloudFront domain
    if flow.request.pretty_host == "d7roov8fndsis.cloudfront.net":

        # Pass API routes to real backend (no modification)
        if flow.request.path.startswith("/api/"):
            # Request passes through to CloudFront unchanged
            pass

        else:
            # Forward UI routes to local NDX server
            flow.request.scheme = "http"
            flow.request.host = "localhost"
            flow.request.port = 8080
            # Path unchanged (e.g., /index.html stays /index.html)

addons = [request]
```

**And** script handles edge cases:

- Root path (`/`) forwards to localhost:8080
- Static assets (`/assets/*`) forward to localhost:8080
- Product pages (`/catalogue/*`) forward to localhost:8080
- Try page (`/try`) forwards to localhost:8080
- API routes (`/api/*`) pass through to CloudFront unchanged

**And** script includes docstring explaining purpose
**And** script uses mitmproxy flow API correctly
**And** running `python scripts/mitmproxy-addon.py` has no syntax errors

**Prerequisites:** Story 4.1 (Documentation created)

**Technical Notes:**

- mitmproxy addon API: `http.HTTPFlow` object
- `flow.request.pretty_host` for domain matching
- Modify `scheme`, `host`, `port` for local forwarding
- Leave path unchanged (preserve routing)
- No authentication token manipulation needed (OAuth redirects work)

**Architecture Context:**

- **Routing Logic:**
  - UI routes (`/`, `/catalogue/*`, `/try`, static assets): Forward to localhost:8080
  - API routes (`/api/*`): Pass through to CloudFront unchanged
- **ADR-021:** Centralized API client works seamlessly with mitmproxy
  - API calls include Authorization header (JWT from sessionStorage)
  - mitmproxy passes API requests through transparently (no modification)
- **OAuth Flow:** Redirects work without modification (OAuth callback URL remains CloudFront domain)
- **Script Location:** `scripts/mitmproxy-addon.py` version-controlled with codebase

**UX Design Context:**

- **Developer Experience:** Simple Python script, minimal configuration
- **Debugging:** mitmproxy console shows all intercepted requests (UI vs API routing visible)

---

### Story 4.3: mitmproxy Run Configuration

As a developer,
I want a simple command to start mitmproxy with the addon script,
So that I can quickly start local development environment.

**Acceptance Criteria:**

**Given** the mitmproxy addon script exists at `scripts/mitmproxy-addon.py`
**When** I add npm script to `package.json`
**Then** the package.json includes:

```json
{
  "scripts": {
    "dev:proxy": "mitmproxy --listen-port 8081 --mode transparent --set confdir=~/.mitmproxy -s scripts/mitmproxy-addon.py"
  }
}
```

**And** running `yarn dev:proxy` starts mitmproxy with:

- Listen port: 8081
- Mode: transparent proxy
- Addon script: scripts/mitmproxy-addon.py
- Configuration directory: ~/.mitmproxy

**And** console output shows:

- Proxy server running on localhost:8081
- Addon loaded: mitmproxy-addon.py
- Waiting for requests

**And** pressing `q` in mitmproxy console stops the proxy cleanly

**Prerequisites:** Story 4.2 (Addon script created)

**Technical Notes:**

- `--listen-port 8081` avoids clash with NDX server on 8080
- `--mode transparent` enables domain interception
- `-s` flag specifies addon script path
- mitmproxy generates SSL certificates automatically (~/.mitmproxy/mitmproxy-ca-cert.pem)
- May need to trust mitmproxy CA certificate for HTTPS interception

**Architecture Context:**

- **npm Script:** `yarn dev:proxy` starts mitmproxy with correct configuration
- **Port 8081:** mitmproxy listener (avoids conflict with NDX server on 8080)
- **Transparent Mode:** Intercepts CloudFront domain requests without browser extension
- **SSL Certificate Generation:** Auto-generated on first run (~/.mitmproxy/mitmproxy-ca-cert.pem)
- **Development Workflow:**
  - Terminal 1: `yarn dev:proxy` (start mitmproxy)
  - Terminal 2: `yarn dev` (start NDX server on port 8080)
  - Browser: Navigate to CloudFront domain (proxied to localhost)

**UX Design Context:**

- **Developer Experience:** Single command to start proxy (`yarn dev:proxy`)
- **Clean Shutdown:** Press `q` in mitmproxy console to stop cleanly

---

### Story 4.4: System Proxy Configuration Instructions

As a developer,
I want clear instructions for configuring system proxy settings,
So that browser traffic routes through mitmproxy.

**Acceptance Criteria:**

**Given** mitmproxy is running on localhost:8081
**When** I update `/docs/development/local-try-setup.md`
**Then** the documentation includes proxy configuration for macOS, Windows, Linux:

**macOS: System Preferences**

```
1. Open System Preferences → Network
2. Select active network (Wi-Fi or Ethernet)
3. Click Advanced → Proxies
4. Enable "Web Proxy (HTTP)": localhost:8081
5. Enable "Secure Web Proxy (HTTPS)": localhost:8081
6. Click OK → Apply
```

**Windows: Internet Options**

```
1. Open Control Panel → Internet Options
2. Click Connections → LAN Settings
3. Enable "Use a proxy server for your LAN"
4. Address: localhost, Port: 8081
5. Click OK
```

**Linux: GNOME Settings**

```
1. Open Settings → Network → Network Proxy
2. Select "Manual"
3. HTTP Proxy: localhost:8081
4. HTTPS Proxy: localhost:8081
5. Apply
```

**And** documentation includes instructions to bypass proxy for non-CloudFront domains:

- Add bypass list: `localhost, 127.0.0.1, *.local`
- Only CloudFront domain routed through proxy

**And** documentation includes revert instructions:

- Set proxy to "Off" or "Direct" when not developing Try features

**Prerequisites:** Story 4.3 (Run configuration created)

**Technical Notes:**

- System proxy settings affect all browsers
- Can alternatively use browser-specific proxy extensions (FoxyProxy)
- mitmproxy must be running before enabling system proxy
- Revert proxy settings to avoid routing all traffic when not developing

**Architecture Context:**

- **System-Wide Proxy:** All browsers route through localhost:8081 when enabled
- **Bypass List:** Ensure `localhost, 127.0.0.1, *.local` bypassed (prevents proxying local traffic)
- **Platform-Specific:** macOS (System Preferences), Windows (Internet Options), Linux (GNOME Settings)
- **Alternative:** Browser extensions like FoxyProxy (more granular control, per-browser)
- **Revert When Done:** Disable system proxy when not developing Try features (avoid routing all traffic)

**UX Design Context:**

- **Developer Experience:** One-time setup per machine
- **Documentation:** Platform-specific instructions in `/docs/development/local-try-setup.md`

---

### Story 4.5: Certificate Trust Setup (HTTPS Interception)

As a developer,
I want to trust mitmproxy's SSL certificate,
So that I can intercept HTTPS requests without browser warnings.

**Acceptance Criteria:**

**Given** mitmproxy has generated CA certificate at `~/.mitmproxy/mitmproxy-ca-cert.pem`
**When** I update `/docs/development/local-try-setup.md`
**Then** the documentation includes certificate trust instructions:

**macOS: Keychain Access**

```
1. Open ~/.mitmproxy/mitmproxy-ca-cert.pem
2. Keychain Access opens automatically
3. Find "mitmproxy" certificate in System keychain
4. Double-click → Trust → When using this certificate: Always Trust
5. Close and authenticate
```

**Windows: Certificate Manager**

```
1. Open ~/.mitmproxy/mitmproxy-ca-cert.pem
2. Install Certificate → Current User → Place in "Trusted Root Certification Authorities"
3. Click Next → Finish
```

**Linux: ca-certificates**

```
1. sudo cp ~/.mitmproxy/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy.crt
2. sudo update-ca-certificates
```

**And** documentation warns about certificate trust implications:

- Only trust certificate on development machines
- Never trust mitmproxy certificate in production
- Certificate enables mitmproxy to decrypt HTTPS traffic

**And** validation instructions provided:

1. Browse to `https://d7roov8fndsis.cloudfront.net`
2. No SSL warnings should appear
3. UI content loads from localhost:8080
4. API calls go to real CloudFront backend

**Prerequisites:** Story 4.4 (Proxy configuration documented)

**Technical Notes:**

- mitmproxy auto-generates CA certificate on first run
- Certificate path: `~/.mitmproxy/mitmproxy-ca-cert.pem`
- Without trust, browser shows "Your connection is not private" warnings
- Certificate trust is per-machine, not per-browser (system-wide)

**Architecture Context:**

- **HTTPS Interception:** CloudFront domain uses HTTPS (mitmproxy must decrypt to route)
- **CA Certificate:** mitmproxy auto-generates on first run (`~/.mitmproxy/mitmproxy-ca-cert.pem`)
- **Platform-Specific Trust:**
  - macOS: Keychain Access (Always Trust)
  - Windows: Certificate Manager (Trusted Root Certification Authorities)
  - Linux: ca-certificates (`sudo update-ca-certificates`)
- **Security Warning:** Only trust certificate on development machines (never production)
- **Validation:** Browse to CloudFront domain, verify no SSL warnings, UI loads from localhost

**UX Design Context:**

- **Developer Experience:** One-time certificate trust per machine
- **Security Notice:** Documentation warns about trusting only on dev machines
- **Validation Steps:** Clear instructions to verify setup working after trust

---

### Story 4.6: Setup Validation Script

As a developer,
I want an automated validation script that confirms local setup is working,
So that I can quickly verify environment before starting feature development.

**Acceptance Criteria:**

**Given** mitmproxy, NDX server, and proxy configuration are set up
**When** I create `scripts/validate-local-setup.sh`
**Then** the script validates:

```bash
#!/bin/bash
set -e

echo "=================================="
echo "Local Try Setup Validation"
echo "=================================="
echo ""

ERRORS=0

# Check 1: mitmproxy installed
echo "✓ Checking mitmproxy installation..."
if ! command -v mitmproxy &> /dev/null; then
  echo "❌ mitmproxy not installed. Run: pip install mitmproxy"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ mitmproxy installed"
fi

# Check 2: Addon script exists
echo ""
echo "✓ Checking addon script..."
if [ ! -f "scripts/mitmproxy-addon.py" ]; then
  echo "❌ scripts/mitmproxy-addon.py not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Addon script exists"
fi

# Check 3: NDX server can start on port 8080
echo ""
echo "✓ Checking if port 8080 is available for NDX server..."
if lsof -Pi :8080 -sTCP:LISTEN -t > /dev/null; then
  echo "⚠️  Port 8080 already in use (NDX server may already be running)"
else
  echo "✅ Port 8080 available"
fi

# Check 4: Port 8081 available for mitmproxy
echo ""
echo "✓ Checking if port 8081 is available for mitmproxy..."
if lsof -Pi :8081 -sTCP:LISTEN -t > /dev/null; then
  echo "⚠️  Port 8081 already in use (mitmproxy may already be running)"
else
  echo "✅ Port 8081 available"
fi

# Check 5: mitmproxy CA certificate exists
echo ""
echo "✓ Checking mitmproxy CA certificate..."
if [ ! -f ~/.mitmproxy/mitmproxy-ca-cert.pem ]; then
  echo "⚠️  mitmproxy CA certificate not generated yet. Run mitmproxy once to generate."
else
  echo "✅ mitmproxy CA certificate exists"
fi

echo ""
echo "=================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ Setup validation passed!"
  echo ""
  echo "Next steps:"
  echo "1. Start mitmproxy: yarn dev:proxy"
  echo "2. Configure system proxy to use localhost:8081"
  echo "3. Trust mitmproxy CA certificate (see docs/development/local-try-setup.md)"
  echo "4. Start NDX server: yarn dev"
  echo "5. Browse to: https://d7roov8fndsis.cloudfront.net"
  echo "=================================="
  exit 0
else
  echo "❌ $ERRORS validation check(s) failed"
  echo "Fix errors and re-run validation"
  echo "=================================="
  exit 1
fi
```

**And** script is executable: `chmod +x scripts/validate-local-setup.sh`
**And** add npm script: `"validate-setup": "scripts/validate-local-setup.sh"`
**And** documentation includes: "Run `yarn validate-setup` before starting development"

**Prerequisites:** Story 4.5 (Certificate trust documented)

**Technical Notes:**

- Validation prevents common setup issues (missing dependencies, port conflicts)
- Runs before starting development (fast feedback)
- Detects already-running services (mitmproxy, NDX server)
- Epic 4 preventive measure from Pre-mortem Analysis (User acceptance #9)

**Architecture Context:**

- **Validation Checks:**
  - mitmproxy installation (`command -v mitmproxy`)
  - Addon script exists (`scripts/mitmproxy-addon.py`)
  - Port 8080 available for NDX server (`lsof -Pi :8080`)
  - Port 8081 available for mitmproxy (`lsof -Pi :8081`)
  - mitmproxy CA certificate generated (`~/.mitmproxy/mitmproxy-ca-cert.pem`)
- **npm Script:** `yarn validate-setup` runs validation before development
- **Fast Feedback:** Catches setup issues before starting development (< 1 second)
- **Pre-mortem Preventive Measure:** Epic 4 validation prevents "works on my machine" issues

**UX Design Context:**

- **Developer Experience:** Automated validation script (no manual checklist)
- **Clear Output:** ✅/❌ status for each check, actionable error messages
- **Next Steps Guidance:** Script shows exact commands to run after validation passes

---

## Epic 5: Authentication Foundation

**Goal:** Government users can sign in/out of NDX with persistent sessions, enabling access to personalized Try features

**User Value:** Users can authenticate via Innovation Sandbox OAuth, sessions persist across browser tabs, enabling protected API calls

**FRs Covered:** FR-TRY-1 through FR-TRY-17, FR-TRY-24 (19 FRs)

---

### Story 5.1: Sign In/Out Button UI Components

As a government user,
I want to see sign in/out buttons in the NDX navigation,
So that I can authenticate to access Try features.

**Acceptance Criteria:**

**Given** I am on any NDX page
**When** I am not authenticated (no `isb-jwt` in sessionStorage)
**Then** I see a "Sign in" button in the top-right navigation area
**And** the button uses GOV.UK Design System button styling (`govukButton` macro)
**And** the button has accessible text: "Sign in"

**When** I am authenticated (`isb-jwt` exists in sessionStorage)
**Then** I see a "Sign out" button in the top-right navigation area
**And** the button uses GOV.UK Design System button styling (`govukButton` macro)
**And** the button has accessible text: "Sign out"

**And** sign in/out buttons are:

- Keyboard navigable (tab index)
- Screen reader accessible (ARIA labels)
- Responsive on mobile (visible in mobile nav)
- Consistent placement across all pages

**Prerequisites:** Epic 4 complete (local dev environment ready)

**Technical Notes:**

- Check sessionStorage client-side: `sessionStorage.getItem('isb-jwt')`
- Use GOV.UK Design System button macro (already integrated in NDX)
- Nunjucks template: Check JWT existence in layout template
- FR-TRY-11, FR-TRY-12, FR-TRY-15 covered
- Accessibility: FR-TRY-70, FR-TRY-71 (keyboard navigation, focus indicators)

**Architecture Context:**

- **ADR-024:** Authentication state management using event-driven pattern
  - Implement `AuthState` class with subscribe/notify pattern
  - Multiple components react to auth state changes (nav links, try buttons, /try page)
  - Reactive authentication state prevents UI inconsistencies
- **Module:** `src/try/auth/auth-provider.ts` - Authentication interface & implementation
- **Module:** `src/try/auth/session-storage.ts` - JWT token storage utilities

**UX Design Context:**

- **Component:** Authentication State Indicator (UX Section 6.2 Component 5)
- **Placement:** Top-right navigation in GOV.UK header (consistent across all pages)
- **Signed Out:** "Sign in" link visible (blue underlined link, GOV.UK standard)
- **Signed In:** "Sign out" link visible, optionally with username/email displayed
- **Touch Targets:** Minimum 44x44px (WCAG 2.2 AAA) - links use padding to expand clickable area
- **User Journey:** Authentication (UX Section 5.1 Journey 1)

---

### Story 5.2: Sign In OAuth Redirect Flow

As a government user,
I want to be redirected to Innovation Sandbox OAuth when I click "Sign in",
So that I can authenticate using AWS credentials.

**Acceptance Criteria:**

**Given** I am on any NDX page and not authenticated
**When** I click the "Sign in" button
**Then** the browser redirects to `/api/auth/login`
**And** the Innovation Sandbox API handles OAuth redirect
**And** I am redirected to AWS OAuth login page
**And** after successful AWS authentication, I am redirected back to NDX with JWT token in URL query parameter

**And** the redirect flow preserves:

- Original page context (return URL if needed)
- HTTPS security
- No errors logged in console

**Prerequisites:** Story 5.1 (Sign in button exists)

**Technical Notes:**

- Sign in button href: `/api/auth/login`
- Innovation Sandbox OAuth endpoint handles redirect automatically
- OAuth redirects to callback URL with token
- FR-TRY-2, FR-TRY-13 covered
- Production: Cross-gov SSO replaces AWS OAuth (zero NDX code changes)
- OAuth flow is external to NDX (handled by Innovation Sandbox backend)

**Architecture Context:**

- **ADR-023:** OAuth callback page pattern
  - Dedicated `/callback` page handles OAuth redirect (not home page)
  - Callback page extracts token, stores in sessionStorage, then redirects to intended destination
  - Separates OAuth mechanics from main application flow
- **ADR-017:** OAuth 2.0 with JWT tokens (Innovation Sandbox standard)
  - JWT returned as URL query parameter: `?token=eyJ...`
  - Token format: JWT with user claims (email, name, exp)
  - Production cross-gov SSO maintains OAuth 2.0 compatibility (no code changes)

**UX Design Context:**

- **User Journey:** Authentication Sign In (UX Section 5.1 Journey 1, Steps 1-2)
- **Step 1:** User clicks "Sign in" → Redirect to `/api/auth/login`
- **Step 2:** OAuth redirect to Innovation Sandbox login page (external to NDX)
- **After auth:** OAuth provider redirects back to NDX callback URL with token in query param
- **Loading state:** Brief "Signing you in..." message during token extraction (UX Section 7.3)

---

### Story 5.3: JWT Token Extraction from URL

As a developer,
I want to extract JWT token from URL query parameters after OAuth redirect,
So that I can store the token for authenticated API calls.

**Acceptance Criteria:**

**Given** I am redirected back to NDX after OAuth authentication
**When** the URL contains query parameter with JWT token (e.g., `?token=eyJ...`)
**Then** client-side JavaScript extracts token from URL:

```javascript
function extractTokenFromURL() {
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get("token")

  if (token) {
    // Store token in sessionStorage
    sessionStorage.setItem("isb-jwt", token)

    // Clean up URL (remove token from query params)
    const cleanURL = window.location.pathname
    window.history.replaceState({}, document.title, cleanURL)

    return true
  }

  return false
}

// Run on page load
document.addEventListener("DOMContentLoaded", extractTokenFromURL)
```

**And** token extraction runs on every page load
**And** URL is cleaned after extraction (token not visible in browser address bar)
**And** token stored in sessionStorage with key `isb-jwt`
**And** sessionStorage persists across browser tabs (same session)
**And** sessionStorage does NOT persist across browser restarts

**Prerequisites:** Story 5.2 (OAuth redirect flow)

**Technical Notes:**

- URLSearchParams API for query parameter parsing
- `window.history.replaceState()` removes token from URL without reload
- sessionStorage vs localStorage: sessionStorage preferred (FR-TRY-8, FR-TRY-9)
- FR-TRY-3, FR-TRY-4, FR-TRY-5 covered
- Token cleanup prevents token exposure in browser history

**Architecture Context:**

- **ADR-023:** OAuth callback page pattern implementation
  - `/callback` page dedicated to token extraction (not mixed with main page logic)
  - Extract token → Store in sessionStorage → Clean URL → Redirect to original destination
  - Callback page has minimal UI (just loading indicator)
- **ADR-016:** sessionStorage for JWT tokens (NOT localStorage, NOT cookies)
  - sessionStorage clears on browser close (security benefit)
  - sessionStorage accessible across tabs (UX convenience)
  - Key: `isb-jwt` (consistent across all auth modules)
- **Security:** NFR-TRY-SEC-6 (No sensitive data in URL after extraction)
  - `window.history.replaceState()` removes token from browser history
  - Token never logged to console or analytics

**UX Design Context:**

- **User Journey:** Authentication Sign In (UX Section 5.1 Journey 1, Step 3)
- **Token extraction:** Brief loading indicator "Signing you in..."
- **URL cleanup:** Token removed from address bar before user sees final page
- **Session persistence:** UX Section 7.1 - sessionStorage choice for security + convenience balance

---

### Story 5.4: sessionStorage JWT Persistence

As a government user,
I want my authentication to persist across browser tabs,
So that I don't need to sign in again when opening NDX in a new tab.

**Acceptance Criteria:**

**Given** I have signed in and JWT token is in sessionStorage
**When** I open NDX in a new browser tab
**Then** I am still authenticated (sessionStorage accessible in new tab)
**And** I see "Sign out" button (not "Sign in")
**And** I can make authenticated API calls without re-authenticating

**Given** I close all NDX tabs and browser
**When** I reopen browser and navigate to NDX
**Then** I am NOT authenticated (sessionStorage cleared)
**And** I see "Sign in" button
**And** I need to sign in again to access Try features

**Prerequisites:** Story 5.3 (Token extraction implemented)

**Technical Notes:**

- sessionStorage behavior: persists across tabs, NOT across browser restarts
- This is DESIRED behavior per PRD (temporary authentication)
- Production cross-gov SSO may have different session persistence (handled at SSO layer)
- FR-TRY-8, FR-TRY-9 covered
- No code changes needed (sessionStorage API provides this behavior automatically)
- Validate behavior in browser DevTools → Application → Session Storage

**Architecture Context:**

- **ADR-024:** Authentication state management with event-driven pattern
  - AuthState notifies all subscribers when auth status changes (login, logout, token refresh)
  - Components subscribe to auth state changes: nav links, try buttons, /try page
  - Reactive pattern ensures UI consistency across tabs
- **ADR-016:** sessionStorage persistence behavior (security vs UX trade-off)
  - Persists across tabs: User doesn't re-auth when opening new tab (good UX)
  - Clears on browser close: Shared device security (government requirement)
  - No server-side session needed: Stateless JWT approach (scalability)

**UX Design Context:**

- **Pattern:** sessionStorage for JWT token (UX Section 7.1 Authentication State Management)
- **User Expectation:** "Sign in once, use across tabs" (multi-tab workflow support)
- **Security Consideration:** Browser close = automatic sign out (government shared devices)
- **Testing:** Validate in DevTools - open new tab, verify "Sign out" visible without re-auth

---

### Story 5.5: Sign Out Functionality

As a government user,
I want to sign out of NDX,
So that I can end my session and clear my authentication.

**Acceptance Criteria:**

**Given** I am authenticated (JWT in sessionStorage)
**When** I click the "Sign out" button
**Then** client-side JavaScript clears sessionStorage:

```javascript
function signOut() {
  // Clear JWT token
  sessionStorage.removeItem("isb-jwt")

  // Redirect to home page
  window.location.href = "/"
}

// Attach to sign out button
document.getElementById("sign-out-button").addEventListener("click", signOut)
```

**And** I am redirected to home page (`/`)
**And** I see "Sign in" button (not "Sign out")
**And** I cannot access authenticated features (/try page shows unauthenticated state)
**And** subsequent API calls do NOT include Authorization header

**Prerequisites:** Story 5.4 (sessionStorage persistence validated)

**Technical Notes:**

- `sessionStorage.removeItem('isb-jwt')` clears token
- Redirect to home prevents user confusion (clear state transition)
- FR-TRY-7, FR-TRY-14 covered
- No server-side logout needed (JWT stateless, expires automatically)
- Production SSO may require SSO logout endpoint call (handle in future iteration)

**Architecture Context:**

- **ADR-024:** Authentication state management with event-driven notifications
  - Sign out triggers AuthState.notify() to all subscribers
  - Nav links, try buttons, /try page react to sign out event
  - Ensures UI updates consistently across all components
- **Module:** `src/try/auth/auth-provider.ts` - `signOut()` method
  - Clear sessionStorage
  - Notify all auth state subscribers
  - Redirect to home page
- **Future:** ADR-017 Production cross-gov SSO logout endpoint (abstracted in auth-provider interface)

**UX Design Context:**

- **User Journey:** Authentication Sign Out (UX Section 5.1 Journey 1 - Sign Out Flow)
- **Step 1:** User clicks "Sign out" link
- **Step 2:** Clear JWT from sessionStorage
- **Step 3:** Redirect to home page (`/`)
- **Step 4:** Navigation updates to show "Sign in" link
- **Success State:** No explicit confirmation (brief redirect is confirmation)
- **Pattern:** Brief confirmations, then redirect (UX Section 7.4 Success Notification Strategy)

---

### Story 5.6: API Authorization Header Injection

As a developer,
I want all Innovation Sandbox API requests to include JWT Authorization header,
So that backend can authenticate requests and return user-specific data.

**Acceptance Criteria:**

**Given** I have JWT token in sessionStorage
**When** I make API request to `/api/*` endpoints
**Then** the request includes Authorization header:

```javascript
function callISBAPI(endpoint, options = {}) {
  const token = sessionStorage.getItem("isb-jwt")

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return fetch(endpoint, {
    ...options,
    headers,
  })
}

// Example usage
callISBAPI("/api/leases?userEmail=user@example.com")
  .then((response) => response.json())
  .then((data) => console.log(data))
```

**And** API helper function handles:

- Adding Authorization header when token exists
- NOT adding header when token missing (unauthenticated requests)
- Preserving other headers passed in options
- Bearer token format: `Bearer {jwt}`

**And** all Try feature API calls use this helper function
**And** console.log shows Authorization header in network requests (DevTools)

**Prerequisites:** Story 5.5 (Sign out functionality)

**Technical Notes:**

- Bearer token format per OAuth 2.0 standard
- FR-TRY-6, FR-TRY-10 covered
- Centralized helper function prevents duplication
- Innovation Sandbox backend validates JWT and returns 401 if invalid/expired
- Story 5.8 will handle 401 responses (automatic re-authentication)

**Architecture Context:**

- **ADR-021:** Centralized API client with authentication interceptor
  - Single `api-client.ts` module handles all Innovation Sandbox API calls
  - Automatic Authorization header injection (DRY principle)
  - Automatic 401 handling (Story 5.8 will implement)
  - Type-safe API responses with TypeScript interfaces
- **Module:** `src/try/api/api-client.ts` - Centralized API client
- **Module:** `src/try/api/types.ts` - API request/response types
- **Security:** NFR-TRY-SEC-2 (HTTPS only), NFR-TRY-SEC-6 (secure token transmission)

**UX Design Context:**

- **Pattern:** All API calls use centralized client (prevents authorization bugs)
- **Security:** Bearer token never logged to console or exposed in UI (UX Section 7.1)
- **Error Handling:** 401 responses trigger automatic re-authentication (seamless UX)

---

### Story 5.7: Authentication Status Check API

As a developer,
I want to call `/api/auth/login/status` to check authentication status,
So that I can verify token validity and retrieve user session data.

**Acceptance Criteria:**

**Given** I have JWT token in sessionStorage
**When** I call `GET /api/auth/login/status` with Authorization header
**Then** the API returns user session data:

```json
{
  "email": "user@example.gov.uk",
  "displayName": "Jane Smith",
  "userName": "jane.smith",
  "roles": ["user"]
}
```

**And** client-side code parses response:

```javascript
async function checkAuthStatus() {
  try {
    const response = await callISBAPI("/api/auth/login/status")

    if (response.ok) {
      const userData = await response.json()
      return {
        authenticated: true,
        user: userData,
      }
    } else if (response.status === 401) {
      // Token invalid or expired
      return { authenticated: false }
    } else {
      console.error("Auth status check failed:", response.status)
      return { authenticated: false }
    }
  } catch (error) {
    console.error("Auth status check error:", error)
    return { authenticated: false }
  }
}
```

**And** function returns object with:

- `authenticated: true/false`
- `user: { email, displayName, userName, roles }` (if authenticated)

**And** 401 responses handled gracefully (return authenticated: false)
**And** network errors handled gracefully

**Prerequisites:** Story 5.6 (Authorization header injection)

**Technical Notes:**

- FR-TRY-16, FR-TRY-17 covered
- Use this to validate token before showing authenticated UI
- Response data used for personalization (display name in UI)
- 401 handling preparation for Story 5.8 (automatic re-authentication)

**Architecture Context:**

- **ADR-021:** API client `checkAuthStatus()` method
  - Returns typed response: `{ authenticated: boolean; user?: UserData }`
  - Used by AuthState to validate token on page load
  - Graceful degradation on network errors (assume unauthenticated)
- **Module:** `src/try/api/types.ts` - `UserData` interface (email, displayName, userName, roles)
- **API Endpoint:** `GET /api/auth/login/status` (Innovation Sandbox backend)

**UX Design Context:**

- **Usage:** Validate token before showing authenticated UI (prevents flash of wrong state)
- **User Data:** Display user email/name in navigation (optional - UX Section 6.2 Component 5)
- **Graceful Failure:** Network errors don't break page - show unauthenticated state

---

### Story 5.8: 401 Unauthorized Response Handling

As a government user,
I want to be automatically redirected to sign in when my token expires,
So that I can re-authenticate without manual intervention.

**Acceptance Criteria:**

**Given** I have expired or invalid JWT token in sessionStorage
**When** I make API request that returns 401 Unauthorized
**Then** client-side code:

1. Clears sessionStorage (remove invalid token)
2. Redirects to `/api/auth/login` (OAuth flow)

```javascript
function callISBAPI(endpoint, options = {}) {
  const token = sessionStorage.getItem("isb-jwt")

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return fetch(endpoint, {
    ...options,
    headers,
  }).then((response) => {
    // Handle 401 Unauthorized
    if (response.status === 401) {
      sessionStorage.removeItem("isb-jwt")
      window.location.href = "/api/auth/login"
      throw new Error("Unauthorized - redirecting to login")
    }
    return response
  })
}
```

**And** 401 handling is automatic (no user action required)
**And** user redirected to OAuth login
**And** after re-authentication, user returned to original page
**And** subsequent API calls succeed with new token

**Prerequisites:** Story 5.7 (Auth status check API)

**Technical Notes:**

- FR-TRY-23, FR-TRY-24 covered
- Global 401 handler in API helper function (DRY)
- Clear invalid token prevents infinite loops
- Redirect to `/api/auth/login` initiates OAuth flow
- OAuth callback returns to NDX with new token
- Session continuity: User doesn't lose context (same page reload)

**Architecture Context:**

- **ADR-021:** Centralized 401 handling in API client
  - All API calls automatically handle 401 responses
  - Clear invalid token → Redirect to OAuth → Return to original page
  - Prevents scattered 401 handling logic across codebase
- **ADR-024:** AuthState notifies subscribers of auth state change on 401
  - Nav links update to "Sign in"
  - Try buttons disabled (if visible mid-redirect)
  - Seamless user experience (no stale UI)

**UX Design Context:**

- **User Journey:** Error Handling Flow #2 (UX Section 5.1 Journey 5)
- **Automatic Re-authentication:** "Your session has expired. Signing you in again..."
- **No User Action Required:** Seamless redirect → re-auth → return to original page
- **Recovery Path:** Automatic (UX Section 7.2 Error Message Strategy)
- **Pattern:** Calm Through Predictability (UX Principle 5 - no surprises)

---

### Story 5.9: Empty State UI for Unauthenticated /try Page

As a government user,
I want to see a helpful message when I visit /try page unauthenticated,
So that I know I need to sign in to access Try features.

**Acceptance Criteria:**

**Given** I am NOT authenticated (no JWT in sessionStorage)
**When** I navigate to `/try` page
**Then** I see empty state message:

- Heading: "Sign in to view your try sessions"
- Body text: "You need to sign in with your Innovation Sandbox account to request and manage AWS sandbox environments."
- "Sign in" button (GOV.UK Design System)

**And** clicking "Sign in" button redirects to `/api/auth/login`
**And** after successful authentication, I am returned to `/try` page
**And** I see my try sessions (not empty state)

**And** empty state uses GOV.UK Design System components:

- Heading: `govukHeading` (size: l)
- Body text: `govukBody`
- Button: `govukButton` (isStartButton: true)

**Prerequisites:** Story 5.8 (401 handling implemented)

**Technical Notes:**

- FR-TRY-26, FR-TRY-27 covered
- Template logic: Check sessionStorage in client-side JavaScript or server-side (if rendering)
- Empty state UX best practice: Clear call-to-action
- Accessibility: Empty state fully keyboard navigable
- Return URL preservation: OAuth callback returns to `/try` page

**Architecture Context:**

- **Module:** `src/try/pages/try-page.ts` - /try page component
  - Checks AuthState on page load
  - Renders empty state if unauthenticated
  - Renders sessions table if authenticated
- **ADR-024:** AuthState subscription pattern
  - /try page subscribes to auth state changes
  - Automatically updates when user signs in (no manual reload needed)

**UX Design Context:**

- **User Journey:** Try Sessions Dashboard (UX Section 5.1 Journey 3 - Branch A: User NOT authenticated)
- **Empty State:** "Sign in to view your try sessions" (UX Section 5.1 Journey 3, Step 1)
- **CTA Button:** "Sign in" button (GOV.UK start button, green)
- **After Sign In:** Returns to /try page → Shows sessions
- **Pattern:** Empty states provide clear next action (UX best practice)

---

### Story 5.10: Automated Accessibility Tests for Auth UI

As a developer,
I want automated accessibility tests for sign in/out UI,
So that authentication components meet WCAG 2.2 AA standards.

**Acceptance Criteria:**

**Given** sign in/out buttons and /try empty state exist
**When** I run automated accessibility tests
**Then** tests validate:

**Test 1: Keyboard Navigation**

- Sign in/out buttons focusable via Tab key
- Enter key activates buttons
- Focus indicators visible (WCAG 2.2 AA contrast ratio)

**Test 2: Screen Reader Accessibility**

- Buttons have accessible labels
- Empty state heading announced correctly
- Button purpose clear from label alone

**Test 3: Color Contrast**

- Button text meets WCAG 2.2 AA contrast ratio (4.5:1)
- Focus indicators meet contrast requirements
- Empty state text readable

**Test 4: ARIA Compliance**

- Buttons have appropriate roles
- No ARIA violations detected

**And** tests run in CI pipeline (fail build on violations)
**And** tests use `axe-core` or `pa11y` for automated scanning
**And** tests cover all authentication UI components

**Prerequisites:** Story 5.9 (Empty state UI complete)

**Technical Notes:**

- Automated testing per Pre-mortem preventive measure #3 (user acceptance)
- Use axe-core for automated WCAG validation
- CI integration prevents accessibility regressions
- FR-TRY-70, FR-TRY-71, FR-TRY-76 partially covered (full coverage in Epic 8)
- Manual testing still required (keyboard navigation, screen reader testing)
- Epic 8 will provide comprehensive accessibility audit

**Architecture Context:**

- **ADR-037:** Mandatory accessibility testing gate (enforced in Epic 8, started in Epic 5)
  - Cannot merge PR without passing Pa11y tests
  - Prevents accessibility regressions from Day 1
- **ADR-004:** Pa11y integration for automated WCAG 2.2 AA validation
  - Zero violations allowed for AA compliance
  - Tests run in CI on every commit
- **Testing:** `test/accessibility/auth-a11y.test.ts` - Auth component accessibility tests

**UX Design Context:**

- **WCAG 2.2 Compliance:** Section 8.1 - Target AA minimum, AAA where feasible
- **Keyboard Navigation:** All auth components keyboard accessible (UX Section 8.3)
- **Screen Reader:** ARIA labels, focus management, accessible names (UX Principle 6)
- **Epic 8:** Comprehensive accessibility audit with government specialist sign-off (ADR-005)

---

## Epic 6: Catalogue Integration & Sandbox Requests

**Goal:** Government users can discover tryable products in catalogue and request AWS sandboxes via AUP modal

**User Value:** Users see "Try Before You Buy" tag on tryable products, click "Try" button, accept AUP, and receive AWS sandbox access in minutes

**FRs Covered:** FR-TRY-42 through FR-TRY-65 (24 FRs)

---

### Story 6.0: UX Review Checkpoint (GATE)

**GATE STORY - Must complete before Epic 6 implementation**

As a product owner,
I want to review UX design for Try feature integration with catalogue,
So that we validate user flows before development starts.

**Acceptance Criteria:**

**Given** Epic 5 (Authentication Foundation) is complete
**When** product owner reviews Try feature UX with team
**Then** the following UX elements are validated:

**UX Element 1: "Try Before You Buy" Tag Placement**

- Tag appears on product cards in catalogue listing
- Tag appears on product detail pages
- Tag uses GOV.UK Design System tag component
- Tag color/styling clearly distinguishes from other tags

**UX Element 2: "Try this now for 24 hours" Button**

- Button placement on product detail page (below description? sidebar?)
- Button uses GOV.UK Start Button (`isStartButton: true`)
- Button disabled state if user already has max leases (discoverable in Story 6.8)
- Button text clear and actionable

**UX Element 3: Lease Request Modal Layout**

- Modal overlay with AUP content
- Scrollable AUP text (long content)
- Checkbox: "I accept the Acceptable Use Policy"
- Two buttons: "Cancel" and "Continue"
- Clear visual hierarchy (AUP → Checkbox → Buttons)

**UX Element 4: Link from /try Page to Tryable Products**

- Placement of link on /try page (empty state? always visible?)
- Link text: "Browse tryable products in catalogue"
- Filters catalogue to show only tryable products

**And** UX review includes accessibility considerations:

- Keyboard navigation flow through modal
- Focus management (modal focus trap)
- Screen reader experience (ARIA labels for tag, button, modal)

**And** team consensus reached on UX approach
**And** any UX changes documented before Story 6.1 starts

**Prerequisites:** Epic 5 complete (Story 5.10)

**Technical Notes:**

- GATE story from Pre-mortem preventive measure #7 (user acceptance)
- UX review prevents costly rework during implementation
- Collaborative session: Product owner, UX designer, developers
- Does NOT require code implementation (design validation only)
- Output: Documented UX decisions for Stories 6.1-6.11

**Architecture Context:**

- **ADR-026:** Accessible modal pattern (CRITICAL - full spec needed before Story 6.6)
  - Focus trap implementation requirements
  - Keyboard navigation (Tab, Shift+Tab, Escape)
  - ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
  - Screen reader announcements for modal open/close
- **ADR-032:** User-friendly error messages (review error templates for lease request failures)

**UX Design Context:**

- **Component Specs:** AUP Acceptance Modal (UX Section 6.2 Component 2) - MUST REVIEW
  - Modal anatomy: Summary box, scrollable AUP, checkbox, buttons
  - Desktop vs mobile layout (max-width 600px desktop, full-screen mobile)
  - Disabled button state until checkbox checked
- **Component Specs:** Try Button (UX Section 6.2 Component 4)
  - Exact placement on product pages (below description, above Access section)
  - GOV.UK Start Button styling (green with arrow icon)
- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2) - Complete flow review

---

### Story 6.1: Parse "try" Metadata from Product YAML Frontmatter

As a developer,
I want to parse `try` and `try_id` metadata from product page YAML frontmatter,
So that I can identify tryable products in the catalogue.

**Acceptance Criteria:**

**Given** product page markdown file exists (e.g., `/source/catalogue/product-name.md`)
**When** the YAML frontmatter includes:

```yaml
---
title: "AWS Innovation Sandbox"
tags: ["aws", "sandbox"]
try: true
try_id: "550e8400-e29b-41d4-a716-446655440000"
---
```

**Then** 11ty build process parses metadata:

- `try` field (boolean): Indicates product is tryable
- `try_id` field (UUID string): Lease template UUID for Innovation Sandbox API

**And** parsed metadata available in Nunjucks templates:

```nunjucks
{% if try %}
  <!-- Product is tryable -->
  <p>Lease Template ID: {{ try_id }}</p>
{% endif %}
```

**And** products without `try` metadata treated as not tryable (default: false)
**And** invalid `try_id` (not UUID format) logs warning during build

**Prerequisites:** Story 6.0 (UX Review Checkpoint complete)

**Technical Notes:**

- FR-TRY-42, FR-TRY-43 covered
- 11ty frontmatter parsing via `eleventy-plugin-syntaxhighlight` or custom plugin
- UUID format validation: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Lease template UUIDs obtained from Innovation Sandbox API (GET /api/leaseTemplates)
- Example tryable product: AWS Innovation Sandbox (sandbox environment for AWS services)

**Architecture Context:**

- **ADR-015:** Vanilla Eleventy with TypeScript (brownfield constraint - no framework)
  - Frontmatter parsing uses 11ty's built-in gray-matter parser
  - Data available in Nunjucks templates via `page.data` object
- **Module:** Build-time validation in `eleventy.config.js` - warn on invalid `try_id` UUID format
- **Data Flow:** YAML frontmatter → 11ty parser → Nunjucks template context → HTML output

**UX Design Context:**

- **Metadata:** `try: true` makes product discoverable via "Try Before You Buy" tag
- **Metadata:** `try_id` (lease template UUID) required for API lease request
- **User Discovery:** Products with `try: true` get green "Try Before You Buy" tag in catalogue

---

### Story 6.2: Generate "Try Before You Buy" Tag System

As a developer,
I want to automatically generate "Try Before You Buy" tag for products with `try: true` metadata,
So that users can filter catalogue by tryable products.

**Acceptance Criteria:**

**Given** product has `try: true` in frontmatter
**When** 11ty builds catalogue
**Then** product tags include "Try Before You Buy" tag automatically:

```nunjucks
{% if try %}
  {% set tags = tags | push("Try Before You Buy") %}
{% endif %}
```

**And** tag appears in:

- Product card in catalogue listing
- Product detail page
- Tag filter sidebar

**And** tag uses GOV.UK Design System tag component:

```nunjucks
{{ govukTag({
  text: "Try Before You Buy",
  classes: "govuk-tag--green"
}) }}
```

**And** tag styling:

- Green background (govuk-tag--green)
- Clear contrast with other tags (blue for product category tags)
- Consistent placement across all product views

**Prerequisites:** Story 6.1 (Metadata parsing)

**Technical Notes:**

- FR-TRY-42, FR-TRY-44, FR-TRY-45 covered
- GOV.UK Design System tag component already integrated
- Green color chosen for positive action (tryable = good for users)
- Tag filtering handled by existing 11ty catalogue filter logic (no new code needed)
- Tag addition happens at build time (static site generation)

**Architecture Context:**

- **ADR-015:** Static site generation (build-time tag injection)
  - Tags generated during 11ty build, not at runtime
  - No client-side JavaScript needed for tag display
- **Module:** Nunjucks macro `{% if try %}` in product card/detail templates
- **GOV.UK Component:** `govukTag` macro with `classes: "govuk-tag--green"`

**UX Design Context:**

- **Component:** Session Status Badge pattern (UX Section 6.2 Component 3) - adapted for product tags
- **Color:** Green (`govuk-tag--green`) - positive action, tryable products (UX Section 3.1)
- **Placement:** Product card (top-right) and product detail page (near title)
- **Accessibility:** Text + color (WCAG 1.4.1) - "Try Before You Buy" text, not just green color

---

### Story 6.3: Catalogue Tag Filter for "Try Before You Buy"

As a government user,
I want to filter catalogue by "Try Before You Buy" tag,
So that I can quickly find products I can try immediately.

**Acceptance Criteria:**

**Given** I am on the catalogue listing page (`/catalogue/`)
**When** I see the tag filter sidebar
**Then** "Try Before You Buy" tag appears in filter options
**And** tag shows count of tryable products (e.g., "Try Before You Buy (3)")

**When** I click "Try Before You Buy" tag filter
**Then** catalogue filters to show only products with `try: true`
**And** other products are hidden
**And** URL updates to include filter: `/catalogue/?tags=try-before-you-buy`
**And** filter state persists on page refresh

**When** I clear filter
**Then** all products are shown again
**And** URL reverts to `/catalogue/`

**Prerequisites:** Story 6.2 (Tag generation)

**Technical Notes:**

- FR-TRY-46 covered
- Existing 11ty catalogue filtering logic handles this (no new code needed)
- Tag slug: "try-before-you-buy" (URL-friendly)
- Count calculation: 11ty collection filter (`collections.tryableProducts`)
- Accessibility: Filter controls keyboard navigable, screen reader accessible

**Architecture Context:**

- **Brownfield:** Existing catalogue filter system (no new filtering code)
  - Tag-based filtering already implemented in NDX catalogue
  - "Try Before You Buy" tag automatically appears in filter sidebar
- **Module:** Existing `eleventy.config.js` collection filters handle tryable products
- **URL State:** Filter persists via query param `?tags=try-before-you-buy`

**UX Design Context:**

- **User Discovery:** Primary way users find tryable products in catalogue
- **Filter Sidebar:** "Try Before You Buy" tag with product count (e.g., "(3)")
- **Persistence:** Filter state survives page refresh (URL query param)
- **Accessibility:** Keyboard navigable, screen reader announces filter state changes

---

### Story 6.4: "Try this now for 24 hours" Button on Product Pages

As a government user,
I want to see "Try this now for 24 hours" button on tryable product pages,
So that I can quickly request sandbox access.

**Acceptance Criteria:**

**Given** I am on a product detail page with `try: true` metadata
**When** the page renders
**Then** I see "Try this now for 24 hours" button:

- Placement: Below product description, above "Contact" section
- Styling: GOV.UK Start Button (`govukButton` with `isStartButton: true`)
- Text: "Try this now for 24 hours"
- Icon: Arrow icon (→) indicating action

**And** button includes:

```nunjucks
{{ govukButton({
  text: "Try this now for 24 hours",
  isStartButton: true,
  attributes: {
    "data-module": "try-button",
    "data-try-id": try_id
  }
}) }}
```

**And** button has data attributes:

- `data-module="try-button"`: For JavaScript event handler
- `data-try-id="{{ try_id }}"`: Lease template UUID for API call

**And** button NOT shown on products without `try: true` metadata

**Prerequisites:** Story 6.3 (Tag filter)

**Technical Notes:**

- FR-TRY-47, FR-TRY-48 covered
- GOV.UK Start Button: Green with arrow icon (prominent call-to-action)
- data-try-id passed to JavaScript for lease request (Story 6.7)
- Button placement validated in UX review (Story 6.0)
- Accessibility: Button keyboard focusable, screen reader accessible

**Architecture Context:**

- **ADR-015:** Vanilla client-side JavaScript (no framework)
  - Event listener attached via `data-module="try-button"` pattern
  - GOV.UK Frontend JavaScript pattern (existing in NDX)
- **Module:** `src/try/ui/try-button.ts` - Try button event handler
- **Data Attributes:** `data-try-id="{{ try_id }}"` - lease template UUID for API call

**UX Design Context:**

- **Component:** Try Button (UX Section 6.2 Component 4)
- **Placement:** Below product description, above "Access" section (validated in UX review)
- **Styling:** GOV.UK Start Button - green, arrow icon (→), prominent CTA
- **Button Text:** "Try this now for 24 hours" - clear action + duration expectation
- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2, Step 1)
- **Touch Target:** Minimum 44x44px (WCAG 2.2 AAA - UX Section 7.7)

---

### Story 6.5: Try Button Authentication Check

As a developer,
I want Try button to check authentication before showing modal,
So that unauthenticated users are redirected to sign in first.

**Acceptance Criteria:**

**Given** I am on a product page with "Try" button
**When** I click "Try this now for 24 hours" button
**Then** client-side JavaScript checks authentication:

```javascript
document.querySelectorAll('[data-module="try-button"]').forEach((button) => {
  button.addEventListener("click", async function (event) {
    event.preventDefault()

    const tryId = this.getAttribute("data-try-id")
    const token = sessionStorage.getItem("isb-jwt")

    if (!token) {
      // User not authenticated - redirect to sign in
      window.location.href = "/api/auth/login"
    } else {
      // User authenticated - show lease request modal
      showLeaseRequestModal(tryId)
    }
  })
})
```

**And** unauthenticated users redirected to `/api/auth/login`
**And** after successful authentication, users returned to product page
**And** modal does NOT appear for unauthenticated users

**Prerequisites:** Story 6.4 (Try button rendered)

**Technical Notes:**

- FR-TRY-49, FR-TRY-50 covered
- Reuse authentication check from Epic 5
- OAuth callback returns to product page (preserves context)
- Try button click initiates modal flow (Story 6.6-6.9)

**Architecture Context:**

- **ADR-024:** AuthState integration - check `AuthState.isAuthenticated()` before showing modal
- **Module:** Reuse `src/try/auth/auth-provider.ts` - `isAuthenticated()` method
- **OAuth Flow:** Unauthenticated users → `/api/auth/login` → Return to product page → Auto-show modal

**UX Design Context:**

- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2, Steps 2-3)
- **Branch A (Unauthenticated):** Redirect to OAuth → Return to product page → Open AUP modal
- **Branch B (Authenticated):** Open AUP modal immediately
- **Preserves Intent:** System "remembers" user wanted to try (auto-opens modal after auth)
- **Pattern:** Friction-Free Flow (UX Principle 2 - no unnecessary steps)

---

### Story 6.6: Lease Request Modal Overlay UI

As a government user,
I want to see a modal overlay when I click "Try" button,
So that I can review AUP and request sandbox access.

**Acceptance Criteria:**

**Given** I am authenticated and click "Try" button
**When** modal opens
**Then** I see modal overlay with:

**Modal Structure:**

- Dark overlay background (semi-transparent black)
- White modal box (centered on screen)
- Modal header: "Request AWS Sandbox Access"
- Close button (X) in top-right corner

**Modal Content Sections:**

1. **Lease Details:**
   - "Duration: 24 hours"
   - "Maximum Budget: $50"

2. **Acceptable Use Policy:**
   - Heading: "Acceptable Use Policy"
   - Scrollable text container (AUP content from API)
   - Min-height: 200px, Max-height: 400px

3. **Consent:**
   - Checkbox: "I accept the Acceptable Use Policy"
   - Label associated with checkbox (for accessibility)

4. **Actions:**
   - "Cancel" button (secondary style)
   - "Continue" button (primary style, disabled until checkbox checked)

**And** modal uses GOV.UK Design System components:

- Modal overlay: Custom (GOV.UK doesn't have modal component, use accessible pattern)
- Buttons: `govukButton` macro
- Checkbox: `govukCheckboxes` macro

**Prerequisites:** Story 6.5 (Auth check on Try button)

**Technical Notes:**

- FR-TRY-51, FR-TRY-52, FR-TRY-53, FR-TRY-56 covered
- Modal HTML injected into page dynamically (JavaScript)
- Accessibility: Focus trap (modal only), Escape key closes modal (Story 6.9)
- AUP content fetched from API (Story 6.7)
- Checkbox state controls Continue button (Story 6.8)

**Architecture Context:**

- **ADR-026: CRITICAL - Accessible Modal Pattern (MUST IMPLEMENT FULLY)**

  **Focus Management:**
  - **Focus Trap:** Tab cycles through modal elements only (cannot Tab to background)
  - **Focus on Open:** Move focus to first interactive element (checkbox or Close button)
  - **Focus on Close:** Return focus to "Try" button that opened modal
  - **Tab Order:** Checkbox → Cancel button → Continue button → (cycles back to Checkbox)
  - **Shift+Tab:** Reverse order

  **Keyboard Navigation:**
  - **Tab / Shift+Tab:** Navigate through modal interactive elements
  - **Escape:** Close modal (with confirmation if checkbox checked - "Are you sure?")
  - **Enter/Space:** Activate focused button or checkbox

  **ARIA Attributes (CRITICAL for screen readers):**
  - `role="dialog"` on modal container
  - `aria-modal="true"` (informs screen readers background is inert)
  - `aria-labelledby="{modal-title-id}"` (associates modal with heading)
  - `aria-describedby="{modal-description-id}"` (optional - for AUP summary)
  - Background content: `aria-hidden="true"` OR `inert` attribute

  **Screen Reader Announcements:**
  - Modal open: "Dialog opened, Request AWS Sandbox Access"
  - Checkbox change: "Checkbox checked" / "Checkbox unchecked"
  - Button state: "Continue button, disabled" / "Continue button, enabled"
  - Modal close: Focus returns to trigger button (screen reader announces button)
  - Use `aria-live="polite"` for button state changes

  **Component Structure (Web Components):**
  - `<aup-modal>` Custom Element (extends HTMLElement)
  - Encapsulates modal logic, accessibility, focus trap
  - Reusable across application
  - TypeScript class: `AUPModal extends HTMLElement`

- **ADR-012:** Custom Elements for complex UI (modal as Web Component)
- **Module:** `src/try/ui/components/aup-modal.ts` - AUP Modal Custom Element
- **Module:** `src/try/ui/utils/focus-trap.ts` - Focus trap utility
- **Module:** `src/try/ui/utils/aria-live.ts` - ARIA live region announcements

**UX Design Context:**

- **Component Spec:** AUP Acceptance Modal (UX Section 6.2 Component 2) - FULL IMPLEMENTATION

  **Modal Anatomy (Desktop):**

  ```
  ┌─────────────────────────────────────────────────────────────┐
  │ [X] Close                 (top-right, optional)             │
  │                                                              │
  │ Try Before You Buy - Acceptable Use Policy  (H2 title)     │
  │ ─────────────────────────────────────────────────────────── │
  │                                                              │
  │ ┌─ Summary Box (highlighted) ──────────────────────────┐   │
  │ │ Duration: 24 hours                                     │   │
  │ │ Budget: $50 maximum spend                              │   │
  │ │ Purpose: Evaluation only (non-production use)         │   │
  │ └────────────────────────────────────────────────────────┘   │
  │                                                              │
  │ ┌─ Scrollable AUP Text (max-height: 300px) ────────────┐   │
  │ │ [Acceptable Use Policy full text with headings,       │   │
  │ │  bullet points, paragraphs - fetched from API]        │   │
  │ │                                                         │   │
  │ │ [Scroll indicator if content exceeds visible area]    │   │
  │ └────────────────────────────────────────────────────────┘   │
  │                                                              │
  │ ☐ I have read and accept the Acceptable Use Policy         │
  │   (checkbox, unchecked by default)                          │
  │                                                              │
  │ ─────────────────────────────────────────────────────────── │
  │ [Cancel] (secondary)              [Continue] (primary, disabled) │
  └─────────────────────────────────────────────────────────────┘

  Backdrop: Semi-transparent black (rgba(0,0,0,0.5))
  ```

  **Modal States:**
  - **Default:** Continue button disabled (grey), checkbox unchecked
  - **Checkbox Checked:** Continue button enabled (green), clickable
  - **Loading:** Continue button shows spinner + "Requesting your sandbox..."
  - **Success:** Brief "Sandbox ready!" message before closing
  - **Error:** Error message displayed above buttons (GOV.UK error styling)

  **Responsive Variants:**
  - **Desktop (769px+):** Modal centered, max-width 600px, padding 40px
  - **Tablet (641-768px):** Modal centered, max-width 80%, padding 30px
  - **Mobile (<640px):** Modal full-screen (100% width/height), padding 20px

  **Behavior:**
  - **Open:** Triggered by "Try" button click (if authenticated)
  - **Backdrop click:** Does nothing (must use Cancel or Escape to close)
  - **Escape key:** Closes modal (if checkbox unchecked) or shows confirmation "Are you sure?" (if checkbox checked)
  - **Checkbox change:** Enables/disables Continue button
  - **Continue click:** Submits lease request API call, shows loading state
  - **Cancel click:** Closes modal without action
  - **Success:** Shows "Sandbox ready!" for 1 second, then closes and redirects
  - **Error:** Shows error message, modal remains open for retry

  **Accessibility (WCAG 2.2 AA):**
  - **Focus trap:** Tab cycles through modal elements (implemented in focus-trap.ts)
  - **Focus on open:** First interactive element (checkbox or Close button) receives focus
  - **Focus on close:** Returns focus to "Try" button that opened modal
  - **ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby="{modal title id}"`
  - **Checkbox label:** Associated with checkbox input (for/id)
  - **Screen reader:** Announces modal title, AUP text headings, checkbox state, button states
  - **Keyboard:** Tab (next), Shift+Tab (previous), Escape (close), Enter/Space (activate button)
  - **Loading state:** ARIA live region announces "Requesting your sandbox"
  - **Error state:** ARIA live region announces error message

- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2, Step 3)
- **Most Critical UX Moment:** AUP acceptance (UX Principle 3 - AUP Acceptance Done Right)
- **Design Goal:** Balance legal compliance with usability (encourage reading without abandoning flow)
- **Pattern:** Brief confirmations, then redirect (UX Section 7.4)

---

### Story 6.7: Fetch and Display AUP from Innovation Sandbox API

As a government user,
I want to see the Acceptable Use Policy in the lease request modal,
So that I understand terms before requesting sandbox access.

**Acceptance Criteria:**

**Given** lease request modal is opening
**When** JavaScript calls `GET /api/configurations`
**Then** API returns configuration object:

```json
{
  "aup": "Acceptable Use Policy\n\n1. You must not...\n2. You must...\n\n[Full AUP text]",
  "maxLeases": 5,
  "leaseDuration": 24
}
```

**And** client-side code extracts AUP text:

```javascript
async function fetchAUP() {
  try {
    const response = await callISBAPI("/api/configurations")
    const config = await response.json()
    return config.aup
  } catch (error) {
    console.error("Failed to fetch AUP:", error)
    return "Unable to load Acceptable Use Policy. Please try again later."
  }
}

async function showLeaseRequestModal(tryId) {
  const aup = await fetchAUP()

  // Render modal with AUP text
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Request AWS Sandbox Access</h2>
        <p><strong>Duration:</strong> 24 hours</p>
        <p><strong>Maximum Budget:</strong> $50</p>

        <h3>Acceptable Use Policy</h3>
        <div class="aup-container" style="max-height: 400px; overflow-y: auto;">
          ${aup.replace(/\n/g, "<br>")}
        </div>

        <!-- Checkbox and buttons (Story 6.8) -->
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)
}
```

**And** AUP text displayed in scrollable container
**And** loading indicator shown while fetching AUP
**And** error handling if API call fails (show error message in modal)

**Prerequisites:** Story 6.6 (Modal UI structure)

**Technical Notes:**

- FR-TRY-21, FR-TRY-54, FR-TRY-55 covered
- AUP text returned as plain text with newlines (convert to <br> for HTML)
- Scrollable container: `overflow-y: auto`, `max-height: 400px`
- API call includes Authorization header (Epic 5 helper function)
- Accessibility: AUP container focusable for keyboard scrolling

**Architecture Context:**

- **ADR-021:** Centralized API client - Use `callISBAPI('/api/configurations')`
- **API Endpoint:** `GET /api/configurations` (Innovation Sandbox backend)
- **Response Type:** `{ aup: string; maxLeases: number; leaseDuration: number }`
- **Module:** `src/try/api/types.ts` - `ConfigurationResponse` interface
- **Loading State:** Optimistic UI - show skeleton text while fetching (validated decision)
- **Error Handling:** ADR-032 - "Unable to load Acceptable Use Policy. Please try again later."
- **Caching:** No caching - fetch fresh AUP each modal open (policy may update)

**UX Design Context:**

- **Component:** AUP modal scrollable container (UX Section 6.2 Component 2)
- **Max Height:** 300px desktop (not 400px - UX spec is 300px), adaptive on mobile
- **Scroll Indicator:** Visual cue if content exceeds visible area
- **Loading State:** Skeleton screen shows ~3 lines of grey bars while fetching (UX Section 6.2 Component 6)
- **Error State:** UX Section 5.1 Journey 5 Error #5 - AUP fetch failed
- **Accessibility:** Container has `tabindex="0"` for keyboard scrolling, ARIA label "Acceptable Use Policy"

---

### Story 6.8: AUP Checkbox and Continue Button State

As a government user,
I want the "Continue" button disabled until I check the AUP acceptance checkbox,
So that I explicitly consent before requesting sandbox access.

**Acceptance Criteria:**

**Given** lease request modal is open
**When** I see the AUP checkbox
**Then** checkbox is unchecked by default
**And** "Continue" button is disabled (visual styling: grayed out, not clickable)

**When** I check the AUP checkbox
**Then** "Continue" button becomes enabled (primary button styling, clickable)

**When** I uncheck the AUP checkbox
**Then** "Continue" button becomes disabled again

**And** JavaScript handles checkbox state:

```javascript
const aupCheckbox = document.getElementById("aup-checkbox")
const continueButton = document.getElementById("modal-continue-button")

// Initial state: Button disabled
continueButton.disabled = true

// Listen for checkbox changes
aupCheckbox.addEventListener("change", function () {
  continueButton.disabled = !this.checked
})
```

**And** disabled button has accessible ARIA attributes:

```html
<button id="modal-continue-button" disabled aria-disabled="true">Continue</button>
```

**And** clicking "Cancel" button closes modal without action
**And** clicking "Continue" button (when enabled) submits lease request (Story 6.9)

**Prerequisites:** Story 6.7 (AUP fetched and displayed)

**Technical Notes:**

- FR-TRY-57, FR-TRY-58 covered
- GOV.UK Design System disabled button styling
- Accessibility: Disabled state announced to screen readers
- Cancel button closes modal (removes from DOM, no API call)
- Continue button triggers lease request (Story 6.9)

**Architecture Context:**

- **ADR-012:** Custom Element event handling - checkbox change triggers button state update
- **Module:** `src/try/ui/components/aup-modal.ts` - Checkbox event listener in AUPModal class
- **Reactive State:** Checkbox checked → Button enabled (no dark patterns - user must actively check)
- **ADR-028:** ARIA live region announces button state change
  - `aria-live="polite"` region: "Continue button enabled" when checkbox checked

**UX Design Context:**

- **Component:** AUP Modal states (UX Section 6.2 Component 2 - Modal States)
- **Default State:** Continue button disabled (grey), checkbox unchecked (UX Principle 3 - no dark patterns)
- **Checked State:** Continue button enabled (green GOV.UK primary button)
- **Button Labels:** "Cancel" (secondary), "Continue" (primary) - clear purpose from labels
- **No Pre-checking:** Checkbox starts unchecked (UX Principle 3 - AUP Acceptance Done Right)
- **Accessibility:** Button disabled state announced via `aria-disabled="true"` and visual styling
- **Pattern:** Calm Through Predictability (UX Principle 5 - users know button will enable when checked)

---

### Story 6.9: Submit Lease Request and Handle Responses

As a government user,
I want to request sandbox access by clicking "Continue" in the modal,
So that I can receive AWS sandbox environment.

**Acceptance Criteria:**

**Given** I have checked AUP checkbox and click "Continue"
**When** JavaScript submits lease request
**Then** API call made to `POST /api/leases`:

```javascript
async function requestLease(tryId) {
  const continueButton = document.getElementById("modal-continue-button")

  // Show loading state
  continueButton.disabled = true
  continueButton.textContent = "Requesting..."

  try {
    const response = await callISBAPI("/api/leases", {
      method: "POST",
      body: JSON.stringify({
        leaseTemplateId: tryId,
        acceptedAUP: true,
      }),
    })

    if (response.ok) {
      // Success: Navigate to /try page
      window.location.href = "/try"
    } else if (response.status === 409) {
      // Conflict: Max leases exceeded
      alert(
        "You have reached the maximum number of active sandbox leases (5). Please terminate an existing lease before requesting a new one.",
      )
      window.location.href = "/try"
    } else {
      // Other error
      const error = await response.json()
      alert(`Request failed: ${error.message || "Unknown error"}`)
    }
  } catch (error) {
    console.error("Lease request error:", error)
    alert("Failed to request sandbox access. Please try again later.")
  } finally {
    // Close modal
    closeModal()
  }
}
```

**And** request includes:

- `leaseTemplateId`: UUID from Try button `data-try-id`
- `acceptedAUP`: true (user consent)

**And** response handling:

- **200 OK:** Navigate to `/try` page (shows new lease)
- **409 Conflict:** Alert user "Max leases exceeded", redirect to `/try`
- **Other errors:** Alert user with error message, close modal

**And** loading indicator shown during request (button text: "Requesting...")
**And** modal closes after successful request or error

**Prerequisites:** Story 6.8 (Checkbox state management)

**Technical Notes:**

- FR-TRY-22, FR-TRY-59, FR-TRY-60, FR-TRY-61, FR-TRY-62, FR-TRY-63, FR-TRY-64, FR-TRY-65 covered
- POST /api/leases payload: `{ leaseTemplateId: string, acceptedAUP: boolean }`
- 409 Conflict: Max leases = 5 (returned from API configuration)
- Navigate to /try page on success (Story 7.1 shows leases)
- JavaScript alert for errors (acceptable for MVP, can improve UX later)

**Architecture Context:**

- **ADR-021:** Centralized API client `POST /api/leases`
- **API Endpoint:** `POST /api/leases` - Create new lease
- **Request Type:** `{ leaseTemplateId: string; acceptedAUP: boolean }`
- **Response Type (201):** `{ leaseId: string; awsAccountId: string; expirationDate: string; ... }`
- **Module:** `src/try/api/types.ts` - `LeaseRequest`, `LeaseResponse` interfaces
- **ADR-032:** User-friendly error messages (validated)
  - 409: "You've reached the maximum of 3 active sessions. Terminate an existing session or wait for one to expire."
  - 400: "This service is temporarily unavailable for trial. Please try again later or contact support."
  - 500/503: "The sandbox service is temporarily unavailable. Please try again in a few minutes."
  - Network timeout: "Request timed out. Please check your connection and try again."
- **Loading State:** Optimistic UI - button shows spinner + "Requesting your sandbox..." (validated decision)
- **Timeout:** NFR-TRY-PERF-2 - 10 second timeout for API call

**UX Design Context:**

- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2, Steps 4-6)
- **Step 4:** User clicks Continue → Show loading state
- **Step 5:** Lease request submitted → API call in progress
- **Step 6 (Success):** "Sandbox ready!" brief message (1 second) → Redirect to /try page
- **Step 6 (Error):** Show error message, modal remains open for retry
- **Loading State:** Button text changes to "Requesting your sandbox..." with spinner (UX Section 6.2 Component 6)
- **Success State:** "Sandbox ready!" shows for 1 second before redirect (UX Section 7.4 - brief confirmations)
- **Error Handling:** UX Section 5.1 Journey 5 - Error Handling Flows
  - Error #1: Max Leases Exceeded (409) - Alert + redirect to /try
  - Error #3: Network Timeout/API Unavailable (500/503)
  - Error #4: Invalid Lease Template (400)
- **Pattern:** Friction-Free Flow (UX Principle 2 - < 30 seconds to sandbox access)

---

### Story 6.10: Epic 6-7 Integration Testing

As a developer,
I want to validate that catalogue Try flow integrates correctly with dashboard display,
So that new lease requests appear in /try page immediately.

**Acceptance Criteria:**

**Given** I am authenticated and on a tryable product page
**When** I complete end-to-end Try flow:

1. Click "Try this now for 24 hours" button
2. Modal opens with AUP
3. Check AUP checkbox
4. Click "Continue"
5. Request succeeds (200 OK)
6. Navigated to `/try` page

**Then** I see my new lease in the sessions table:

- Template Name: Product name
- AWS Account ID: Assigned account ID
- Expiry: 24 hours from now
- Budget: "$0.0000 / $50.00"
- Status: "Pending" or "Active" (badge)
- Launch button: Visible if status "Active"

**And** integration test validates:

- Lease appears immediately (no page refresh needed)
- Lease data matches expected format
- Session table sorting works (newest first)
- Launch button functional (Story 7.6)

**Prerequisites:** Story 6.9 (Lease request submission)

**Technical Notes:**

- Integration story from Pre-mortem preventive measure #4 (user acceptance)
- Validates Epic 6 → Epic 7 handoff
- End-to-end test: Catalogue → Modal → API → Dashboard
- Tests real API integration (not mocked)
- Validates data flow correctness (lease appears in /try page)

**Architecture Context:**

- **ADR-004:** Integration tests run before Pa11y tests (layered testing)
- **Testing:** `test/integration/epic-6-7-handoff.test.ts` - End-to-end flow validation
- **Test Stack:** Playwright for browser automation + real Innovation Sandbox API (staging environment)
- **Validation Points:**
  1. Try button click opens modal (ADR-026 focus trap active)
  2. AUP fetch succeeds (ADR-021 API client)
  3. Checkbox enables button (ADR-012 Custom Element state)
  4. POST /api/leases succeeds (201 Created)
  5. Redirect to /try page (window.location.href)
  6. Lease appears in table (Epic 7 Story 7.2)
- **Test Data:** Use test lease template UUID (not production template)
- **Cleanup:** Delete test lease after test completes (idempotent tests)

**UX Design Context:**

- **User Journey:** Complete Try Request Flow (UX Section 5.1 Journey 2 - all steps)
- **Validation:** User completes entire flow < 30 seconds (UX Principle 2 - friction-free)
- **Success Criteria:** New lease visible immediately without page refresh
- **Integration Point:** Catalogue (Epic 6) → Dashboard (Epic 7) seamless transition

---

### Story 6.11: Automated Accessibility Tests for Catalogue Try UI

As a developer,
I want automated accessibility tests for Try button and modal,
So that catalogue integration meets WCAG 2.2 AA standards.

**Acceptance Criteria:**

**Given** Try button and lease request modal exist
**When** I run automated accessibility tests
**Then** tests validate:

**Test 1: Try Button Accessibility**

- Button keyboard focusable
- Button has accessible label
- Start button icon has ARIA hidden (decorative)
- Focus indicator visible

**Test 2: Modal Accessibility**

- Modal overlay has ARIA role="dialog"
- Modal has accessible name (aria-labelledby)
- Focus trap works (tab cycles within modal)
- Escape key closes modal
- Close button (X) keyboard accessible

**Test 3: AUP Checkbox**

- Checkbox keyboard focusable
- Label associated with checkbox (for attribute)
- Checkbox state announced to screen readers

**Test 4: Modal Buttons**

- Cancel/Continue buttons keyboard accessible
- Disabled state announced (aria-disabled)
- Button purpose clear from labels

**And** tests run in CI pipeline
**And** tests cover all Epic 6 UI components

**Prerequisites:** Story 6.10 (Integration testing complete)

**Technical Notes:**

- Accessibility testing per Pre-mortem preventive measure #3
- Use axe-core for automated validation
- Modal focus trap: FR-TRY-72, FR-TRY-73
- Keyboard navigation: FR-TRY-70, FR-TRY-71
- Full manual accessibility audit in Epic 8

**Architecture Context:**

- **ADR-037:** Mandatory accessibility testing gate (cannot merge PR without passing)
- **ADR-004:** Pa11y integration for WCAG 2.2 AA validation
  - Zero violations allowed for AA compliance
  - Tests run in CI on every commit to Epic 6 stories
- **Testing:** `test/accessibility/epic-6-a11y.test.ts` - Catalogue Try UI accessibility
- **Test Coverage:**
  1. Try button: `pa11y(product-page-url)` - validate button accessibility
  2. Modal open: `pa11y(modal-open-state)` - validate dialog ARIA
  3. Focus trap: Automated tab sequence validation
  4. Keyboard nav: Automated Escape/Enter key handling
  5. Checkbox: ARIA attributes and label association
- **CI Integration:** GitHub Actions runs Pa11y on every PR
- **Failure Mode:** PR blocked if ANY WCAG 2.2 AA violations detected

**UX Design Context:**

- **WCAG 2.2 Compliance:** Section 8.1 - AA minimum for all Epic 6 components
- **Keyboard Navigation:** All Try flow components keyboard accessible (UX Section 8.3)
- **Screen Reader:** NVDA/VoiceOver can complete full flow (validated in Epic 8)
- **Focus Management:** Focus trap, focus return tested automatically
- **Touch Targets:** All buttons/checkboxes ≥ 44x44px (WCAG 2.2 AAA - UX Section 7.7)

---

## Epic 7: Try Sessions Dashboard

**Goal:** Government users can view, manage, and launch their AWS sandbox sessions

**User Value:** Users see all their sandbox leases in one place, know when they expire, track budget usage, and launch AWS Console for active sessions

**FRs Covered:** FR-TRY-18 through FR-TRY-23, FR-TRY-25 through FR-TRY-41 (22 FRs)

---

### Story 7.1: Create /try Page Route and Layout

As a government user,
I want to visit /try page to see my sandbox sessions,
So that I can manage my AWS sandbox access in one place.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I navigate to `/try` page
**Then** I see page layout with:

**Page Header:**

- Heading: "Your try sessions" (govukHeading, size: l)
- Subheading: "Manage your AWS sandbox environments"

**Page Content:**

- Sessions table (Story 7.2)
- Empty state if no leases (Epic 5, Story 5.9)
- Link to catalogue filter (Story 7.9)

**And** page uses GOV.UK Design System layout:

- Full-width container
- Main content area
- Consistent navigation (header/footer)

**And** page is responsive (mobile/tablet/desktop)

**Prerequisites:** Epic 6 complete (Story 6.11)

**Technical Notes:**

- FR-TRY-25, FR-TRY-28 covered
- 11ty page: `/source/try.njk` or `/source/try/index.njk`
- Layout template: extends base GOV.UK layout
- Authentication check: Client-side JavaScript (Epic 5)
- Empty state already implemented (Epic 5, Story 5.9)

**Architecture Context:**

- **ADR-015:** Vanilla Eleventy with TypeScript (brownfield constraint - no framework)
- **Module:** `src/try/pages/try-page.ts` - /try page component initialization
- **ADR-024:** AuthState subscription - page subscribes to auth state changes, shows empty state if unauthenticated
- **Page Structure:** Standard GOV.UK layout with main content area

**UX Design Context:**

- **User Journey:** Try Sessions Dashboard (UX Section 5.1 Journey 3)
- **Page Title:** "Your try sessions" - clear ownership (UX Principle 1 - ownership clarity)
- **Navigation:** Consistent GOV.UK header/footer across all pages
- **Responsive:** Mobile-first design (UX Section 4.2 - mobile breakpoints)

---

### Story 7.2: Fetch and Display User Leases

As a government user,
I want to see all my sandbox leases in a table,
So that I can track my active and expired sessions.

**Acceptance Criteria:**

**Given** I am authenticated and on `/try` page
**When** page loads
**Then** JavaScript fetches leases from API:

```javascript
async function loadUserLeases() {
  try {
    // Get user email from auth status
    const authStatus = await checkAuthStatus()
    const userEmail = authStatus.user.email

    // Fetch leases
    const response = await callISBAPI(`/api/leases?userEmail=${encodeURIComponent(userEmail)}`)
    const leases = await response.json()

    // Render sessions table
    renderSessionsTable(leases)
  } catch (error) {
    console.error("Failed to load leases:", error)
    showErrorMessage("Unable to load your try sessions. Please refresh the page.")
  }
}

// Run on page load
document.addEventListener("DOMContentLoaded", loadUserLeases)
```

**And** API response contains array of leases:

```json
[
  {
    "uuid": "lease-uuid-1",
    "status": "Active",
    "awsAccountId": "123456789012",
    "maxSpend": 50.0,
    "totalCostAccrued": 12.3456,
    "expirationDate": "2025-11-23T14:30:00Z",
    "leaseTemplate": {
      "name": "AWS Innovation Sandbox"
    }
  }
]
```

**And** table displays all leases (active, pending, expired, terminated)
**And** empty state shown if leases array empty (FR-TRY-29)
**And** error message shown if API call fails

**Prerequisites:** Story 7.1 (/try page created)

**Technical Notes:**

- FR-TRY-18, FR-TRY-19 covered
- GET /api/leases requires userEmail query parameter
- User email obtained from auth status check (Epic 5)
- Leases sorted by creation date (newest first) in Story 7.3
- Authorization header included (Epic 5 API helper)

**Architecture Context:**

- **ADR-021:** Centralized API client `GET /api/leases?userEmail={email}`
- **API Endpoint:** `GET /api/leases` - Fetch user's leases
- **Query Param:** `userEmail` (required) - filters leases by user
- **Response Type:** `Lease[]` array with status, awsAccountId, maxSpend, totalCostAccrued, expirationDate, leaseTemplate
- **Module:** `src/try/api/types.ts` - `Lease` interface
- **Loading State:** Optimistic UI - skeleton table rows while fetching (validated decision)
- **Error Handling:** ADR-032 - "Unable to load your try sessions. Please refresh the page."

**UX Design Context:**

- **User Journey:** Try Sessions Dashboard (UX Section 5.1 Journey 3, Step 2)
- **Loading State:** Skeleton screen shows 3 table rows with grey bars (UX Section 6.2 Component 6)
- **Empty State:** "Sign in to view your try sessions" if unauthenticated (Epic 5 Story 5.9)
- **Data Display:** All leases shown regardless of status (Active, Pending, Expired, Terminated, Failed)

---

### Story 7.3: Render Sessions Table with GOV.UK Design System

As a government user,
I want to see my sandbox sessions in a clear table format,
So that I can quickly scan session details.

**Acceptance Criteria:**

**Given** leases data is fetched
**When** sessions table renders
**Then** I see GOV.UK Design System table with columns:

| Template Name          | AWS Account ID | Expiry      | Budget            | Status |
| ---------------------- | -------------- | ----------- | ----------------- | ------ |
| AWS Innovation Sandbox | 123456789012   | In 23 hours | $12.3456 / $50.00 | Active |

**And** table uses `govukTable` macro:

```nunjucks
{{ govukTable({
  head: [
    { text: "Template Name" },
    { text: "AWS Account ID" },
    { text: "Expiry" },
    { text: "Budget" },
    { text: "Status" }
  ],
  rows: sessionsRows
}) }}
```

**And** table features:

- Responsive on mobile (horizontal scroll or stacked cards)
- Sortable by creation date (newest first)
- Clear visual distinction between active and expired sessions

**Prerequisites:** Story 7.2 (Leases data fetched)

**Technical Notes:**

- FR-TRY-30, FR-TRY-36 covered
- GOV.UK table component: responsive by default
- Mobile adaptation: Consider card view for better UX
- Sorting: Client-side JavaScript (leases.sort())
- Session distinction: Story 7.4 (status badges)

**Architecture Context:**

- **ADR-027: CRITICAL - Responsive Table Transformation Pattern (ONS Style)**

  **Desktop Table (≥769px):**
  - Traditional HTML `<table>` with `<thead>` and `<tbody>`
  - Columns: Template Name | AWS Account ID | Expiry | Budget | Status | Actions
  - GOV.UK table styling (`govuk-table`)
  - Horizontal scrolling if needed (rare with 6 columns)

  **Mobile/Tablet Stacked Cards (<769px):**
  - **CSS-First Solution** (no JavaScript table → card transformation)
  - Each `<tr>` becomes a vertical card
  - Labels inline with values: `Template: AWS Innovation Sandbox | Account: 123456789012`
  - Status badge in top-right corner of card
  - Launch button full-width at bottom of card
  - Card styling: GOV.UK panel or card component adapted

  **HTML Structure (Same markup, CSS transforms it):**

  ```html
  <table class="govuk-table sessions-table">
    <thead class="govuk-table__head">
      <tr>
        <th scope="col">Template Name</th>
        <th scope="col">AWS Account ID</th>
        <th scope="col">Expiry</th>
        <th scope="col">Budget</th>
        <th scope="col">Status</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody class="govuk-table__body">
      <tr data-status="Active">
        <td>AWS Innovation Sandbox</td>
        <td>123456789012</td>
        <td>In 23 hours</td>
        <td>$12.35 / $50.00</td>
        <td><span class="govuk-tag govuk-tag--green">Active</span></td>
        <td><a href="..." class="govuk-button">Launch AWS Console</a></td>
      </tr>
    </tbody>
  </table>
  ```

  **CSS Transformation (Mobile <769px):**

  ```css
  @media (max-width: 768px) {
    .sessions-table thead {
      display: none;
    }
    .sessions-table,
    .sessions-table tbody,
    .sessions-table tr,
    .sessions-table td {
      display: block;
    }
    .sessions-table tr {
      border: 2px solid #b1b4b6;
      margin-bottom: 20px;
      padding: 15px;
      position: relative;
    }
    .sessions-table td {
      text-align: left;
      padding: 8px 0;
    }
    .sessions-table td::before {
      content: attr(data-label) ": ";
      font-weight: bold;
      display: inline;
    }
    /* Status badge positioned top-right */
    .sessions-table td:nth-of-type(5) {
      position: absolute;
      top: 15px;
      right: 15px;
    }
    /* Launch button full-width at bottom */
    .sessions-table td:nth-of-type(6) .govuk-button {
      width: 100%;
      margin-top: 10px;
    }
  }
  ```

  **Mobile Card Layout (validated - labels inline):**

  ```
  ┌─ Session Card ──────────────────────────┐
  │                          [Active] 🟢    │ (Status top-right)
  │                                         │
  │ Template: AWS Innovation Sandbox        │
  │ Account: 123456789012                   │
  │ Expiry: In 23 hours                     │
  │ Budget: $12.35 / $50.00                 │
  │                                         │
  │ [Launch AWS Console] (full-width btn)  │
  └─────────────────────────────────────────┘
  ```

- **ADR-008:** Mobile-first CSS (UX validated decision)
- **Module:** `src/try/ui/styles/sessions-table.css` - Responsive table CSS
- **Module:** `src/try/ui/components/sessions-table.ts` - Table rendering logic

**UX Design Context:**

- **Component:** Sessions Table (UX Section 6.2 Component 1) - FULL IMPLEMENTATION
- **Desktop (≥769px):** Traditional table with 6 columns
- **Mobile (<769px):** Stacked cards with labels inline with values (validated decision)
- **Breakpoint:** 768px (UX Section 4.2 - responsive breakpoints)
- **Touch Targets:** All interactive elements ≥ 44x44px (WCAG 2.2 AAA - UX Section 7.7)
- **Sorting:** Newest leases first (creation date descending) - helps users find latest sessions
- **Accessibility:** Table headers with `scope="col"`, ARIA labels for screen readers, keyboard navigable

---

### Story 7.4: Status Badge Display with Color Coding

As a government user,
I want to see color-coded status badges for my sessions,
So that I can quickly identify active vs. expired sessions.

**Acceptance Criteria:**

**Given** sessions table is rendered
**When** each row displays status
**Then** I see color-coded status badge using `govukTag`:

**Status: Active**

- Badge color: Green (govuk-tag--green)
- Text: "Active"

**Status: Pending**

- Badge color: Blue (govuk-tag--blue)
- Text: "Pending"

**Status: Expired**

- Badge color: Grey (govuk-tag--grey)
- Text: "Expired"

**Status: Terminated**

- Badge color: Red (govuk-tag--red)
- Text: "Terminated"

**Status: Failed**

- Badge color: Red (govuk-tag--red)
- Text: "Failed"

**And** JavaScript generates badge HTML:

```javascript
function renderStatusBadge(status) {
  const badgeConfig = {
    Active: "govuk-tag--green",
    Pending: "govuk-tag--blue",
    Expired: "govuk-tag--grey",
    Terminated: "govuk-tag--red",
    Failed: "govuk-tag--red",
  }

  const tagClass = badgeConfig[status] || ""

  return `
    <span class="govuk-tag ${tagClass}">
      ${status}
    </span>
  `
}
```

**And** status badges use BOTH color AND text (not color-only - FR-TRY-77)
**And** badges meet WCAG 2.2 AA color contrast requirements

**Prerequisites:** Story 7.3 (Sessions table rendered)

**Technical Notes:**

- FR-TRY-35, FR-TRY-77 covered
- GOV.UK Design System tag component (color-coded)
- Accessibility: Color + text (not color-only)
- Status values from API: Active, Pending, Expired, Terminated, Failed
- Visual distinction: FR-TRY-37 covered

**Architecture Context:**

- **Module:** `src/try/ui/utils/status-badge.ts` - Status badge rendering utility
- **ADR-008:** Color + text labels (WCAG 1.4.1 - not color-only indication)
- **GOV.UK Component:** `govuk-tag` with modifier classes (`--green`, `--blue`, `--grey`, `--red`)

**UX Design Context:**

- **Component:** Session Status Badge (UX Section 6.2 Component 3)
- **Color Mapping:** Green (Active), Blue (Pending), Grey (Expired), Red (Terminated/Failed)
- **Accessibility:** Text + color convey status (WCAG 1.4.1 - UX Section 8.1)
- **Mobile:** Badge positioned top-right in card layout (ADR-027)

---

### Story 7.5: Expiry Date Formatting (Relative and Absolute)

As a government user,
I want to see expiry dates in easy-to-understand formats,
So that I know when my sessions will expire.

**Acceptance Criteria:**

**Given** session has expiration date
**When** expiry column renders
**Then** I see formatted expiry:

**For future expirations (not yet expired):**

- Format: Relative time (e.g., "In 23 hours", "In 45 minutes")
- Uses `timeago.js` or similar library

**For past expirations (already expired):**

- Format: Absolute date/time (e.g., "22 Nov 2025, 14:30")
- Uses UK date format (day month year)

**And** JavaScript formats expiry:

```javascript
function formatExpiry(expirationDate) {
  const expiry = new Date(expirationDate)
  const now = new Date()

  if (expiry > now) {
    // Future: Relative time
    return formatRelativeTime(expiry, now)
  } else {
    // Past: Absolute date/time
    return expiry.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }
}

function formatRelativeTime(future, now) {
  const diffMs = future - now
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffHours > 0) {
    return `In ${diffHours} hour${diffHours > 1 ? "s" : ""}`
  } else {
    return `In ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`
  }
}
```

**And** expiry updates automatically (refresh every minute for relative times)
**And** screen reader announces expiry clearly (ARIA labels)

**Prerequisites:** Story 7.4 (Status badges)

**Technical Notes:**

- FR-TRY-31, FR-TRY-32 covered
- ISO 8601 date format from API: "2025-11-23T14:30:00Z"
- UK date format: DD MMM YYYY, HH:MM
- Consider using `date-fns` or `dayjs` library for formatting
- Auto-refresh: setInterval every 60 seconds (update relative times)

**Architecture Context:**

- **Module:** `src/try/ui/utils/date-formatter.ts` - Date/time formatting utilities
- **Library:** `date-fns` for date manipulation (lightweight alternative to moment.js)
- **Auto-refresh:** `setInterval` updates relative times every 60 seconds (performance: minimal CPU)
- **Locale:** UK date format (`en-GB`) per government standard

**UX Design Context:**

- **Format:** Relative for future ("In 23 hours"), Absolute for past ("22 Nov 2025, 14:30")
- **User Benefit:** Easy to understand "In X hours" vs. interpreting timestamps
- **Accessibility:** Screen reader announces time clearly (ARIA label with full date/time)

---

### Story 7.6: Budget Display with Cost Formatting

As a government user,
I want to see budget usage with cost accrued and max spend,
So that I can track how much of my sandbox budget I've used.

**Acceptance Criteria:**

**Given** session has cost data
**When** budget column renders
**Then** I see formatted budget:

**Format:** `$XX.XXXX / $YY.YY`

- Cost accrued: 4 decimal places (e.g., $12.3456)
- Max spend: 2 decimal places (e.g., $50.00)

**And** JavaScript formats budget:

```javascript
function formatBudget(totalCostAccrued, maxSpend) {
  const costFormatted = totalCostAccrued.toFixed(4)
  const maxFormatted = maxSpend.toFixed(2)

  return `$${costFormatted} / $${maxFormatted}`
}
```

**And** budget display includes:

- Clear separator: " / " between accrued and max
- Currency symbol: "$" (USD)
- Precision: 4 decimals for accrued (AWS billing precision), 2 for max

**And** screen reader announces budget clearly:

```html
<span aria-label="Budget: $12.35 used of $50 maximum"> $12.3456 / $50.00 </span>
```

**Prerequisites:** Story 7.5 (Expiry formatting)

**Technical Notes:**

- FR-TRY-33, FR-TRY-34, FR-TRY-75 covered
- AWS billing precision: 4 decimal places (microdollars)
- Max spend typically: $50 (from lease template)
- Accessibility: ARIA label for screen readers (clear pronunciation)

**Architecture Context:**

- **Module:** `src/try/ui/utils/currency-formatter.ts` - Budget formatting utility
- **Precision:** Cost accrued 4 decimals (AWS microdollar precision), Max spend 2 decimals
- **Format:** `$XX.XXXX / $YY.YY` (clear separator)

**UX Design Context:**

- **User Value:** Track spend at AWS precision level (costs accrue in tiny increments)
- **Format:** Clear separator "/" between accrued and max
- **Accessibility:** ARIA label "Budget: $12.35 used of $50 maximum" for screen readers

---

### Story 7.7: "Launch AWS Console" Button for Active Sessions

As a government user,
I want to see "Launch AWS Console" button for active sessions,
So that I can quickly access my sandbox environment.

**Acceptance Criteria:**

**Given** session has status "Active"
**When** session row renders
**Then** I see "Launch AWS Console" button in Actions column:

**Button Appearance:**

- Text: "Launch AWS Console"
- Styling: GOV.UK primary button (govukButton)
- Icon: External link icon (indicating opens new tab)

**And** button opens AWS SSO portal in new tab:

```javascript
function renderLaunchButton(status, awsAccountId) {
  if (status !== "Active") {
    return "" // No button for non-active sessions
  }

  const ssoURL = `https://YOUR-SSO-PORTAL.awsapps.com/start#/`

  return `
    <a href="${ssoURL}" target="_blank" rel="noopener noreferrer" class="govuk-button">
      Launch AWS Console
      <svg class="govuk-button__icon" aria-hidden="true">...</svg>
    </a>
  `
}
```

**And** button NOT shown for sessions with status:

- Pending (not ready yet)
- Expired (access revoked)
- Terminated (access revoked)
- Failed (never provisioned)

**And** clicking button opens AWS SSO portal in new tab
**And** button keyboard accessible and screen reader friendly

**Prerequisites:** Story 7.6 (Budget display)

**Technical Notes:**

- FR-TRY-38, FR-TRY-39, FR-TRY-41 covered
- AWS SSO portal URL: Configured in Story 7.11
- target="\_blank" opens new tab
- rel="noopener noreferrer" for security
- External link icon: SVG icon from GOV.UK Design System

**Architecture Context:**

- **Module:** `src/try/ui/components/launch-button.ts` - Launch button rendering
- **Security:** `rel="noopener noreferrer"` prevents tabnabbing attack
- **Link Target:** Opens AWS SSO portal in new tab (user stays logged in to NDX)
- **Conditional:** Only rendered for status "Active" (not Pending/Expired/Terminated/Failed)

**UX Design Context:**

- **Button Text:** "Launch AWS Console" - clear action (UX Section 6.2 Component 1)
- **External Link:** Icon indicates opens new tab
- **New Tab:** Users keep NDX /try page open (can return to check other sessions)
- **Touch Target:** ≥ 44x44px (WCAG 2.2 AAA - UX Section 7.7)
- **Mobile:** Full-width button at bottom of card (ADR-027)

---

### Story 7.8: Remaining Lease Duration Display for Active Sessions

As a government user,
I want to see remaining lease duration for active sessions,
So that I know how much time I have left.

**Acceptance Criteria:**

**Given** session has status "Active" and expiration date in future
**When** session row renders
**Then** I see remaining duration below expiry date:

**Display Format:**

- Primary: Expiry date/time (from Story 7.5)
- Secondary: Remaining duration in parentheses

**Example:**

```
In 23 hours (Remaining: 23h 15m)
```

**And** JavaScript calculates remaining duration:

```javascript
function formatRemainingDuration(expirationDate) {
  const expiry = new Date(expirationDate)
  const now = new Date()
  const diffMs = expiry - now

  if (diffMs <= 0) {
    return "Expired"
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  return `${hours}h ${minutes}m`
}
```

**And** duration updates automatically (refresh every minute)
**And** duration shown only for Active sessions (not Pending/Expired)

**Prerequisites:** Story 7.7 (Launch button)

**Technical Notes:**

- FR-TRY-40 covered
- Combines with Story 7.5 expiry formatting
- Auto-refresh with setInterval (update every 60 seconds)
- Enhances user awareness of time remaining
- Not shown for expired/terminated sessions (already expired)

**Architecture Context:**

- **Module:** Reuse `src/try/ui/utils/date-formatter.ts` (Story 7.5)
- **Auto-refresh:** Same `setInterval` as Story 7.5 (performance: single timer for all relative times)
- **Conditional:** Only display for Active sessions with future expiration

**UX Design Context:**

- **Format:** "Remaining: 23h 15m" in parentheses below expiry
- **User Value:** Immediate visibility of time left (no mental calculation)
- **Display Rule:** Active sessions only (Pending/Expired don't need remaining time)

---

### Story 7.9: Link to Catalogue Filter from /try Page

As a government user,
I want to see a link to browse tryable products from /try page,
So that I can discover and request more sandbox environments.

**Acceptance Criteria:**

**Given** I am on `/try` page
**When** page renders
**Then** I see link to catalogue filter:

**Link Placement:**

- Below sessions table (or in empty state)
- Text: "Browse tryable products in the catalogue"
- Uses GOV.UK link styling

**And** link navigates to: `/catalogue/?tags=try-before-you-buy`
**And** catalogue filters to show only tryable products
**And** link keyboard accessible and screen reader friendly

**And** link appears in both states:

- When user has leases (below table)
- When user has no leases (in empty state)

**Prerequisites:** Story 7.8 (Remaining duration display)

**Technical Notes:**

- Catalogue integration from Journey Mapping (user feedback #2)
- Links /try page back to catalogue discovery
- Encourages exploration of additional tryable products
- GOV.UK link component (accessible by default)

**Architecture Context:**

- **Module:** Static link in `/try` page template
- **URL:** `/catalogue/?tags=try-before-you-buy` (uses Epic 6 tag filter)
- **Placement:** Below sessions table OR in empty state

**UX Design Context:**

- **User Journey:** Circular discovery flow (UX Section 5.1 Journey 3 → Journey 1)
- **Link Text:** "Browse tryable products in the catalogue" - clear action
- **Placement:** Always visible (encourages exploration of more products)
- **Integration:** Connects dashboard back to catalogue (user feedback #2 - discovery loop)

---

### Story 7.10: First-Time User Guidance on /try Page

As a first-time government user,
I want to see helpful guidance on /try page,
So that I understand how to use Try Before You Buy feature.

**Acceptance Criteria:**

**Given** I am authenticated and on `/try` page for first time
**When** page renders with empty state (no leases)
**Then** I see guidance panel:

**Panel Content:**

- Heading: "Get started with Try Before You Buy"
- Body text: "Browse the catalogue to find products you can try. Each sandbox gives you 24 hours of access with a $50 budget."
- Steps:
  1. "Browse tryable products in the catalogue"
  2. "Click 'Try this now' on a product page"
  3. "Accept the Acceptable Use Policy"
  4. "Launch your AWS sandbox from this page"
- Link: "Browse tryable products" → `/catalogue/?tags=try-before-you-buy`

**And** panel uses GOV.UK Design System:

- Panel component or inset text
- Numbered list for steps
- Clear call-to-action link

**And** panel NOT shown when user has leases (only empty state)

**Prerequisites:** Story 7.9 (Catalogue link)

**Technical Notes:**

- First-time user experience improvement
- Clarifies Try Before You Buy workflow
- Encourages action (browse catalogue)
- GOV.UK panel or inset text component
- Conditional rendering: Show only if leases.length === 0

**Architecture Context:**

- **Module:** Conditional rendering in `/try` page template
- **Condition:** Only show if `leases.length === 0` (empty state)
- **GOV.UK Component:** Panel or inset text for guidance

**UX Design Context:**

- **User Journey:** First-time user onboarding (UX Section 5.1 Journey 3 - empty state guidance)
- **Content:** 4-step workflow explanation (browse → click try → accept AUP → launch)
- **CTA:** "Browse tryable products" link → catalogue filter
- **Pattern:** Just-in-time guidance (UX Principle 4 - help when needed, not overwhelming)

---

### Story 7.11: AWS SSO Portal URL Configuration

As a developer,
I want to configure AWS SSO portal URL for launch button,
So that users are directed to correct SSO portal for their sandbox accounts.

**Acceptance Criteria:**

**Given** NDX deployment configuration
**When** I add SSO portal URL to environment config
**Then** configuration includes:

```javascript
// config.js or environment variable
const AWS_SSO_PORTAL_URL = process.env.AWS_SSO_PORTAL_URL || "https://YOUR-SSO-PORTAL.awsapps.com/start#/"
```

**And** launch button uses configured URL:

```javascript
function renderLaunchButton(status, awsAccountId) {
  if (status !== "Active") {
    return ""
  }

  const ssoURL = AWS_SSO_PORTAL_URL

  return `
    <a href="${ssoURL}" target="_blank" rel="noopener noreferrer" class="govuk-button">
      Launch AWS Console
    </a>
  `
}
```

**And** configuration documented in README:

- Environment variable: `AWS_SSO_PORTAL_URL`
- Default value for development
- Production value for deployment

**Prerequisites:** Story 7.10 (First-time user guidance)

**Technical Notes:**

- AWS SSO portal URL format: `https://{portal-name}.awsapps.com/start#/`
- Portal name specific to Innovation Sandbox deployment
- Environment variable for flexibility (dev vs. prod)
- Story 7.7 uses this configuration for launch button

**Architecture Context:**

- **Module:** `src/try/config.ts` - Centralized configuration (reuse from Epic 5)
- **Environment Variable:** `AWS_SSO_PORTAL_URL`
- **Default:** Development placeholder URL
- **Production:** Set via environment variable in deployment

**UX Design Context:**

- **Deployment:** Different SSO portals for dev/staging/prod environments
- **Configuration:** Simple environment variable (no code changes between environments)

---

### Story 7.12: End-to-End User Journey Validation

As a developer,
I want to validate complete Try Before You Buy user journey,
So that all epics integrate correctly end-to-end.

**Acceptance Criteria:**

**Given** all Epics 4-7 stories are complete
**When** I execute end-to-end user journey test
**Then** I validate complete flow:

**Journey Steps:**

1. **Unauthenticated User Discovery:**
   - Browse catalogue → See "Try Before You Buy" tag
   - Click tag filter → See only tryable products
   - Click "Try this now" button → Redirected to sign in

2. **Authentication:**
   - Sign in via OAuth → Redirected back to product page
   - JWT token stored in sessionStorage
   - See "Sign out" button in navigation

3. **Lease Request:**
   - Click "Try this now" button → Modal opens
   - See AUP text, checkbox, Cancel/Continue buttons
   - Check AUP checkbox → Continue button enabled
   - Click Continue → Lease requested
   - Navigate to /try page

4. **Dashboard View:**
   - See new lease in sessions table
   - Status: "Pending" or "Active"
   - Expiry: "In 24 hours"
   - Budget: "$0.0000 / $50.00"
   - Launch button visible (if Active)

5. **Launch AWS Console:**
   - Click "Launch AWS Console" → Opens AWS SSO portal in new tab
   - User can access sandbox environment

6. **Sign Out:**
   - Click "Sign out" → Redirected to home
   - sessionStorage cleared
   - See "Sign in" button

**And** end-to-end test validates:

- All UI transitions work
- API calls succeed
- Data persists correctly
- Authentication flows work
- No console errors

**Prerequisites:** Story 7.11 (SSO URL configured)

**Technical Notes:**

- Integration story from Pre-mortem preventive measure #4
- Validates Epic 5 → Epic 6 → Epic 7 integration
- Manual test execution (Playwright automation in future)
- Confirms user journey completeness
- Tests real Innovation Sandbox API (not mocked)

**Architecture Context:**

- **ADR-004:** End-to-end integration testing (layered testing strategy)
- **Testing:** Manual walkthrough of complete user journey (Epic 5 → 6 → 7)
- **Test Stack:** Playwright for future automation + real Innovation Sandbox API (staging)
- **Validation:** All UI transitions, API calls, data persistence, auth flows

**UX Design Context:**

- **Complete Flow:** All 5 user journeys tested end-to-end (UX Section 5.1)
- **Success Criteria:** User completes flow in < 30 seconds (UX Principle 2 - friction-free)
- **Integration Points:** Catalogue → Modal → Dashboard seamless transitions

---

### Story 7.13: Automated Accessibility Tests for Dashboard UI

As a developer,
I want automated accessibility tests for /try page and sessions table,
So that dashboard meets WCAG 2.2 AA standards.

**Acceptance Criteria:**

**Given** /try page and sessions table exist
**When** I run automated accessibility tests
**Then** tests validate:

**Test 1: Page Structure**

- Heading hierarchy correct (h1 → h2 → h3)
- Landmark regions defined (main, navigation)
- Skip to main content link present

**Test 2: Sessions Table**

- Table has accessible headers (th scope)
- Table caption or aria-label present
- Data cells associated with headers

**Test 3: Status Badges**

- Color contrast meets WCAG 2.2 AA (4.5:1)
- Status conveyed by text, not color alone
- ARIA labels for screen readers

**Test 4: Launch Button**

- Button keyboard focusable
- Button has accessible label
- External link announced to screen readers
- Focus indicator visible

**Test 5: Empty State**

- Guidance panel has clear heading
- Links keyboard accessible
- Content readable by screen readers

**And** tests run in CI pipeline
**And** tests cover all Epic 7 UI components

**Prerequisites:** Story 7.12 (End-to-end validation)

**Technical Notes:**

- Accessibility testing per Pre-mortem preventive measure #3
- Use axe-core for automated validation
- Table accessibility: FR-TRY-74 (ARIA labels)
- Color contrast: FR-TRY-76
- Full manual accessibility audit in Epic 8

**Architecture Context:**

- **ADR-037:** Mandatory accessibility testing gate (cannot merge PR without passing)
- **ADR-004:** Pa11y integration for WCAG 2.2 AA validation
  - Zero violations allowed for AA compliance
  - Tests run in CI on every commit to Epic 7 stories
- **Testing:** `test/accessibility/epic-7-a11y.test.ts` - Dashboard accessibility
- **ADR-027:** Responsive table accessibility validated (table headers, ARIA, keyboard nav)
- **CI Integration:** GitHub Actions runs Pa11y on every PR

**UX Design Context:**

- **WCAG 2.2 Compliance:** Section 8.1 - AA minimum for all Epic 7 components
- **Table Accessibility:** Headers with `scope`, ARIA labels, keyboard sortable
- **Color Contrast:** Status badges meet 4.5:1 minimum (WCAG 2.2 AA)
- **Touch Targets:** All buttons/links ≥ 44x44px (WCAG 2.2 AAA - UX Section 7.7)
- **Screen Reader:** Complete dashboard navigable via NVDA/VoiceOver

---

## Epic 8: Accessible & Mobile-Friendly Experience + Brownfield Audit

**Goal:** Comprehensive WCAG 2.2 AA/AAA compliance validation, mobile responsiveness, and brownfield site accessibility audit

**User Value:** All government users can access Try features regardless of device or accessibility needs, ensuring inclusive digital service

**FRs Covered:** FR-TRY-66 through FR-TRY-79 (14 FRs)

---

### Story 8.1: Early Brownfield Accessibility Audit (Parallel with Epic 4)

**RUNS IN PARALLEL WITH EPIC 4 - Start immediately**

As a developer,
I want to audit existing NDX site for accessibility issues,
So that I can identify and remediate issues early, preventing compounding violations.

**Acceptance Criteria:**

**Given** NDX site exists with existing pages (catalogue, product pages, home)
**When** I run automated and manual accessibility audit
**Then** I identify and document:

**Automated Scan (axe-core/pa11y):**

- Color contrast violations (WCAG 2.2 Level A/AA/AAA)
- Missing ARIA labels
- Form label associations
- Heading hierarchy issues
- Image alt text missing
- Keyboard navigation barriers

**Manual Testing:**

- Screen reader experience (NVDA/JAWS/VoiceOver)
- Keyboard-only navigation
- Focus management
- Skip links functionality
- Error messaging clarity

**And** audit results documented in `/docs/accessibility-audit.md`:

- Violations categorized by severity (Critical/High/Medium/Low)
- WCAG 2.2 success criteria referenced
- Remediation recommendations
- Estimated effort for fixes

**And** critical violations remediated immediately:

- Color contrast failures (govuk-frontend usually compliant)
- Missing alt text on images
- Broken keyboard navigation

**Prerequisites:** None (Epic 4, Story 4.1) - Runs in parallel

**Technical Notes:**

- Pre-mortem preventive measure #1 (early brownfield audit)
- Identifies existing issues before adding new features
- Prevents compounding accessibility debt
- Tools: axe DevTools, pa11y-ci, manual testing
- WCAG 2.2 Level AA minimum (FR-TRY-76)
- GOV.UK Design System components usually compliant (validate integration)

**Architecture Context:**

- **ADR-004:** Early brownfield audit prevents compounding accessibility debt
- **Tools:** axe DevTools browser extension + pa11y-ci CLI
- **Output:** `/docs/accessibility-audit.md` with severity-categorized violations
- **Immediate Remediation:** Critical violations fixed before Epic 5 starts

**UX Design Context:**

- **Audit Scope:** Existing NDX pages (catalogue, product pages, home, navigation)
- **WCAG 2.2 Compliance:** UX Section 8.1 - AA minimum target
- **GOV.UK Components:** Usually WCAG compliant (validate correct usage)

---

### Story 8.2: Automated Accessibility Testing in CI Pipeline

As a developer,
I want accessibility tests to run automatically in CI,
So that we catch violations before deployment.

**Acceptance Criteria:**

**Given** CI pipeline exists (GitHub Actions/Jenkins/etc.)
**When** I add accessibility testing stage
**Then** CI runs automated tests:

**Test Suite:**

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: yarn install
      - name: Build site
        run: yarn build
      - name: Run pa11y-ci
        run: npx pa11y-ci --config .pa11yci.json
```

**And** pa11y-ci configuration includes:

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 10000
  },
  "urls": ["http://localhost:8080/", "http://localhost:8080/catalogue/", "http://localhost:8080/try"]
}
```

**And** CI fails if accessibility violations detected
**And** CI runs on every pull request (prevents regressions)
**And** CI reports violations clearly in logs

**Prerequisites:** Story 8.1 (Brownfield audit) - Existing issues documented/remediated

**Technical Notes:**

- Pre-mortem preventive measure #3 (automated a11y tests in CI)
- Catches violations before merge to main
- WCAG 2.2 Level AA standard
- pa11y-ci or axe-core CLI
- Runs against built site (not source files)
- Fast feedback loop for developers

**Architecture Context:**

- **ADR-037:** Mandatory accessibility testing gate (CRITICAL)
  - PR blocked if ANY WCAG 2.2 AA violations detected
  - Zero tolerance policy for accessibility regressions
- **ADR-004:** Pa11y integration in CI pipeline
  - Tests run on every PR commit
  - Fast feedback (< 2 minutes)
- **CI Config:** `.github/workflows/accessibility.yml` + `.pa11yci.json`
- **Test URLs:** /, /catalogue/, /try (all key pages)

**UX Design Context:**

- **Quality Gate:** No PR merges without passing accessibility tests
- **Developer Experience:** Immediate feedback on violations (shift-left testing)
- **Compliance:** Continuous WCAG 2.2 AA compliance (not just end-of-project audit)

---

### Story 8.3: Comprehensive WCAG 2.2 Audit for Try Feature UI

As a developer,
I want comprehensive WCAG 2.2 Level AA/AAA audit of all Try feature UI,
So that we validate compliance before release.

**Acceptance Criteria:**

**Given** all Try feature UI is implemented (Epics 5-7)
**When** I run comprehensive accessibility audit
**Then** I validate WCAG 2.2 success criteria:

**Level A (Must Pass - 30 criteria):**

- 1.1.1 Non-text Content: Alt text for images/icons
- 1.3.1 Info and Relationships: Semantic HTML, ARIA labels
- 2.1.1 Keyboard: All functionality keyboard accessible
- 2.4.1 Bypass Blocks: Skip to main content link
- 3.1.1 Language of Page: lang attribute set
- 4.1.2 Name, Role, Value: Form inputs labeled

**Level AA (Must Pass - 20 criteria):**

- 1.4.3 Contrast (Minimum): 4.5:1 for text, 3:1 for UI components
- 1.4.5 Images of Text: Avoid text in images (use real text)
- 2.4.6 Headings and Labels: Descriptive headings
- 2.4.7 Focus Visible: Clear focus indicators
- 3.2.4 Consistent Identification: UI components consistent across pages

**Level AAA (Optional - 28 criteria):**

- 1.4.6 Contrast (Enhanced): 7:1 for text
- 2.4.8 Location: Breadcrumbs or location indicators
- 3.1.5 Reading Level: Plain English (UK government standard)

**And** audit covers all Try feature components:

- Sign in/out buttons (Epic 5)
- Try button and modal (Epic 6)
- Sessions table and launch button (Epic 7)
- Empty states and guidance panels

**And** audit results documented in `/docs/wcag-compliance-report.md`
**And** violations remediated before Epic 8 completion

**Prerequisites:** Story 8.2 (CI tests running)

**Technical Notes:**

- WCAG 2.2 released October 2023 (latest standard)
- FR-TRY-76 requires Level AA minimum
- GOV.UK services aim for AAA where possible
- Manual + automated testing (automated catches ~30% of issues)
- Tools: axe DevTools, WAVE, Lighthouse, manual testing

**Architecture Context:**

- **ADR-004:** Pa11y integration for automated WCAG 2.2 scanning
  - Scans all Try feature pages (product pages, /try, modals)
  - Detects ~30% of WCAG violations automatically (manual testing for rest)
- **ADR-037:** WCAG 2.2 AA mandatory compliance gate
  - Zero tolerance for AA violations before release
  - AAA pursued where feasible (GOV.UK typically achieves this)
- **Testing Tools:**
  - Automated: axe-core (browser extension), pa11y-ci (CLI), Lighthouse
  - Manual: Human testing with NVDA, JAWS, VoiceOver screen readers
- **Output:** `/docs/wcag-compliance-report.md` with all 50 AA criteria checked

**UX Design Context:**

- **WCAG 2.2 Target:** UX Section 8.1 - AA minimum, AAA where feasible
- **Component Audit Coverage:**
  - Epic 5: Sign in/out buttons, empty states
  - Epic 6: Try button, lease request modal, AUP acceptance, tag filters
  - Epic 7: Sessions table, status badges, launch button, expiry formatting
- **Manual Testing Priority:** Modal interactions, keyboard focus, screen reader announcements
- **Success Criteria:** All 50 WCAG 2.2 AA criteria pass before Epic 8 completion

---

### Story 8.4: GOV.UK Design System Component Compliance Audit

As a developer,
I want to audit GOV.UK Design System component usage,
So that we ensure correct implementation and accessibility inheritance.

**Acceptance Criteria:**

**Given** Try feature uses GOV.UK Design System components
**When** I audit component usage
**Then** I validate:

**Component Checklist:**

- ✓ Buttons: `govukButton` macro used correctly
- ✓ Tags: `govukTag` macro for status badges
- ✓ Table: `govukTable` macro for sessions table
- ✓ Checkboxes: `govukCheckboxes` macro for AUP consent
- ✓ Headings: `govukHeading` macro with correct sizes
- ✓ Body text: `govukBody` macro for content
- ✓ Links: GOV.UK link styling applied
- ✓ Layout: GOV.UK grid system used

**And** component parameters validated:

- Buttons have accessible labels
- Tags have correct color classes
- Table has headers with scope attributes
- Checkboxes have associated labels
- Headings follow hierarchy (h1 → h2 → h3)

**And** custom components (modal) follow GOV.UK patterns:

- Color palette: GOV.UK colors only
- Typography: GOV.UK font stack
- Spacing: GOV.UK spacing scale
- Accessibility: ARIA patterns from GOV.UK docs

**And** audit results documented: `/docs/govuk-component-audit.md`
**And** violations remediated (use correct macros/patterns)

**Prerequisites:** Story 8.3 (WCAG audit)

**Technical Notes:**

- GOV.UK Design System: https://design-system.service.gov.uk/
- Components inherently accessible (if used correctly)
- Custom modal needs careful ARIA implementation (no GOV.UK modal component)
- Validate against GOV.UK Frontend v5.x compatibility
- FR-TRY-15 requires GOV.UK Design System usage

**Architecture Context:**

- **ADR-015:** Vanilla Eleventy with TypeScript (brownfield constraint)
  - Must use GOV.UK Nunjucks macros (not React/Vue components)
  - `govukButton`, `govukTag`, `govukTable`, `govukCheckboxes` macros
- **ADR-026:** Custom modal follows GOV.UK patterns (CRITICAL)
  - No official GOV.UK modal component exists (custom implementation required)
  - Use GOV.UK color palette, typography, spacing scale
  - Implement ARIA dialog pattern from GOV.UK accessibility guidance
- **Component Validation:**
  - Check all components use correct Nunjucks macro syntax
  - Validate macro parameters (labels, ARIA, classes)
  - Ensure GOV.UK Frontend v5.x compatibility (latest stable)
- **Output:** `/docs/govuk-component-audit.md` with component checklist

**UX Design Context:**

- **Design System:** UX Section 6.0 - GOV.UK Design System v5.x required
- **Component Specs:** UX Section 6.2 specifies exact GOV.UK components to use
  - Component 1: Sessions Table (govukTable macro)
  - Component 2: AUP Modal (custom, GOV.UK styling)
  - Component 3: Try Button (govukButton isStartButton)
  - Component 4: Status Badges (govukTag macro)
- **Custom Modal Pattern:** UX Section 7.6 - GOV.UK color palette + ARIA best practices
- **Inheritance Check:** GOV.UK components provide accessibility by default (validate correct usage)

---

### Story 8.5: Mobile Responsive Design Validation

As a government user,
I want Try feature to work perfectly on mobile devices,
So that I can access sandbox management from my phone/tablet.

**Acceptance Criteria:**

**Given** Try feature UI is implemented
**When** I test on mobile viewports
**Then** I validate responsiveness for:

**Viewport Sizes:**

- Mobile: 320px - 767px width
- Tablet: 768px - 1023px width
- Desktop: 1024px+ width

**Component Responsiveness:**

**Sign In/Out Buttons (Epic 5):**

- Visible in mobile navigation (not hidden)
- Accessible in collapsed menu (if applicable)
- Touch-friendly size (min 44x44px)

**Try Button (Epic 6):**

- Button full-width on mobile (easier to tap)
- Text readable on small screens
- Icon appropriately sized

**Lease Request Modal (Epic 6):**

- Modal adapts to mobile viewport (not cut off)
- AUP text scrollable on mobile
- Checkbox/buttons touch-friendly
- Modal closable on mobile (X button or Escape key)

**Sessions Table (Epic 7):**

- **Option A:** Horizontal scroll (table intact)
- **Option B:** Stacked cards (one session per card)
- All data visible (not truncated)
- Launch button accessible on mobile

**Empty States:**

- Guidance text readable on mobile
- Links touch-friendly

**And** manual testing on real devices:

- iOS: Safari (iPhone/iPad)
- Android: Chrome (various screen sizes)
- No horizontal scroll (except intentional table scroll)
- No content cut off or hidden

**And** responsiveness documented in `/docs/responsive-design-validation.md`

**Prerequisites:** Story 8.4 (GOV.UK component audit)

**Technical Notes:**

- FR-TRY-66, FR-TRY-67, FR-TRY-68, FR-TRY-69 covered
- GOV.UK Design System is mobile-first by default
- Test on real devices (not just browser DevTools)
- Touch target size: 44x44px minimum (WCAG 2.2 Level AAA)
- Consider card view for mobile sessions table (better UX than scroll)

**Architecture Context:**

- **ADR-008:** Mobile-first CSS approach (GOV.UK default)
  - Breakpoints: 320px (mobile), 768px (tablet), 1024px (desktop)
  - Base styles for mobile, media queries for larger screens
- **ADR-027:** Responsive Table Transformation Pattern (CRITICAL)
  - Desktop (≥769px): Traditional table layout
  - Mobile (<769px): Stacked cards with CSS-only transformation (no JavaScript)
  - Labels inline with values (validated decision from Architecture/UX alignment)
- **ADR-026:** Modal adapts to mobile viewports
  - Desktop: Max-width 600px, centered overlay
  - Mobile (<640px): Full-screen modal, padding reduced to 20px
  - AUP scrollable within modal (max-height constraint)
- **Touch Targets:** WCAG 2.2 Level AAA - minimum 44x44px (ADR-028)
- **Output:** `/docs/responsive-design-validation.md` with device test results

**UX Design Context:**

- **Mobile Breakpoints:** UX Section 6.2 Component Specifications
  - Mobile: <640px (full-width buttons, stacked layouts)
  - Tablet: 640px-1023px (hybrid layout)
  - Desktop: ≥1024px (full table, side-by-side buttons)
- **Component Responsiveness:**
  - Sessions Table: UX Component 1 - Stacked cards on mobile (labels inline with values)
  - AUP Modal: UX Component 2 - Full-screen on mobile, scrollable content
  - Try Button: Full-width on mobile for easier tapping
- **Touch Targets:** All interactive elements ≥ 44x44px (WCAG 2.2 AAA compliance)
- **Real Device Testing:** iOS Safari + Android Chrome required (not just DevTools simulation)

---

### Story 8.6: Performance and Security Validation

As a developer,
I want to validate performance and security of Try feature,
So that we ensure fast, secure user experience.

**Acceptance Criteria:**

**Given** Try feature is complete
**When** I run performance and security audits
**Then** I validate:

**Performance (Lighthouse):**

- Performance score: ≥90
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1

**Security:**

- JWT tokens NOT logged to console
- JWT tokens NOT exposed in URLs (cleaned after extraction)
- sessionStorage used correctly (not localStorage for sensitive data)
- External links use `rel="noopener noreferrer"`
- No XSS vulnerabilities (sanitize user input)
- HTTPS enforced (redirect HTTP to HTTPS)

**API Calls:**

- Authorization header included (all /api/\* requests)
- 401 responses handled (automatic re-auth)
- CORS configured correctly (Innovation Sandbox API)
- Error handling prevents information leakage

**And** Lighthouse audit run on:

- /try page (authenticated and unauthenticated)
- Product page with Try button
- Lease request modal

**And** security scan with OWASP ZAP or similar tool
**And** results documented: `/docs/performance-security-audit.md`

**Prerequisites:** Story 8.5 (Mobile validation)

**Technical Notes:**

- Lighthouse: Chrome DevTools or CI integration
- Performance budget: GOV.UK recommendation
- JWT security: sessionStorage (temporary), never log tokens
- XSS prevention: Sanitize AUP text if user-generated (currently API-generated, safe)
- HTTPS: CloudFront enforces (redirect-to-https viewer protocol policy)

**Architecture Context:**

- **ADR-016:** sessionStorage for JWT tokens (security consideration)
  - JWT never logged to console (no console.log in production code)
  - JWT cleared on browser close (sessionStorage clears automatically)
  - NOT localStorage (would persist across browser restarts - security risk)
- **ADR-023:** URL cleanup after token extraction (NFR-TRY-SEC-6)
  - `window.history.replaceState()` removes token from browser history
  - Token never visible in address bar after extraction
  - Prevents token exposure in screenshots, shared URLs
- **ADR-021:** Centralized API client with Authorization header injection
  - Validates Authorization header present on all /api/\* requests
  - 401 responses trigger automatic re-auth (redirect to sign in)
- **Performance Target:** Lighthouse score ≥90 (GOV.UK standard)
  - First Contentful Paint <1.5s, Time to Interactive <3s
  - Cumulative Layout Shift <0.1 (stable layout, no jank)
- **HTTPS Enforcement:** CloudFront redirect-to-https viewer protocol policy
- **Output:** `/docs/performance-security-audit.md` with Lighthouse + OWASP ZAP results

**UX Design Context:**

- **Security:** UX Section 7.1 Authentication State Management
  - sessionStorage choice balances security (browser close = sign out) + UX (multi-tab persistence)
  - No visible tokens in UI, URLs, or console logs
- **Performance:** Fast page loads ensure accessible experience for all users (rural connectivity)
- **Error Handling:** User-friendly error messages (ADR-032) prevent information leakage
- **Testing Coverage:** /try authenticated + unauthenticated, product page with Try button, modal open

---

### Story 8.7: Keyboard Navigation Testing

As a government user with mobility impairments,
I want to navigate Try feature using only keyboard,
So that I can access all features without a mouse.

**Acceptance Criteria:**

**Given** Try feature is implemented
**When** I navigate using keyboard only (Tab, Shift+Tab, Enter, Escape, Arrow keys)
**Then** I can complete all user flows:

**Flow 1: Sign In**

- Tab to "Sign in" button
- Press Enter → Redirected to OAuth
- After auth, tab to navigation → See "Sign out" button

**Flow 2: Request Lease**

- Tab to "Try Before You Buy" tag filter
- Press Enter → Catalogue filtered
- Tab to product card → Press Enter → Product page
- Tab to "Try this now" button → Press Enter → Modal opens
- **Modal focus management:**
  - Focus trapped in modal (Tab cycles within modal only)
  - Tab to AUP checkbox → Press Space to check
  - Tab to "Continue" button → Press Enter → Lease requested
  - Press Escape → Modal closes (alternative to Cancel button)

**Flow 3: Launch Sandbox**

- Tab to /try page link
- Press Enter → Navigate to /try page
- Tab to sessions table → Arrow keys navigate rows (optional)
- Tab to "Launch AWS Console" button → Press Enter → Opens AWS portal

**Flow 4: Sign Out**

- Tab to "Sign out" button → Press Enter → Signed out

**And** focus indicators visible at all times (WCAG 2.2 Level AA)
**And** focus order logical (top to bottom, left to right)
**And** no keyboard traps (can escape all elements)
**And** manual testing with screen off (keyboard-only navigation)

**Prerequisites:** Story 8.6 (Performance/security validation)

**Technical Notes:**

- FR-TRY-70, FR-TRY-71, FR-TRY-72, FR-TRY-73 covered
- Modal focus trap: Critical for accessibility (prevent focus escaping modal)
- Escape key closes modal (keyboard shortcut)
- Focus indicators: GOV.UK Design System provides by default (validate not overridden)
- Tab order: HTML source order (avoid CSS visual reordering that breaks tab order)

**Architecture Context:**

- **ADR-026:** Accessible Modal Pattern - Focus Management (CRITICAL)
  - **Focus trap:** Tab key cycles within modal only (no escape to background)
  - **Focus on open:** Automatically move focus to first interactive element (AUP checkbox)
  - **Focus on close:** Return focus to "Try this now" button that opened modal
  - **Escape key:** Close modal with Escape key (keyboard shortcut alternative to Cancel)
  - **Tab order:** Checkbox → Cancel → Continue → (cycles back to checkbox)
- **Keyboard Event Handlers:**
  - Modal: `keydown` listener for Escape key
  - All interactive elements: `click` and `keydown` (Enter/Space) handlers
  - Focus trap: First/last element focus redirection logic
- **Focus Indicators:** GOV.UK Design System yellow outline + black shadow (validate no CSS override)
- **Tab Order Validation:** HTML source order matches visual order (no CSS reordering issues)

**UX Design Context:**

- **User Journeys:** UX Section 5.1 - All 5 journeys must be keyboard-navigable
  - Journey 1: Authentication Sign In (Tab to "Sign in", Enter)
  - Journey 2: Lease Request (Tab through filters, product, Try button, modal, submit)
  - Journey 3: Session View (Tab to /try link, navigate sessions table)
  - Journey 4: Sandbox Launch (Tab to "Launch AWS Console" button, Enter)
  - Journey 5: Authentication Sign Out (Tab to "Sign out", Enter)
- **Modal Focus Management:** UX Section 7.6 - Focus trap prevents confusion
- **Keyboard Shortcuts:** Escape closes modal (documented in UX Section 7.6)
- **Testing Method:** Manual testing with screen off (keyboard-only, no mouse/trackpad)

---

### Story 8.8: Screen Reader Testing (NVDA/JAWS/VoiceOver)

As a government user with visual impairments,
I want to use Try feature with a screen reader,
So that I can access all features through audio feedback.

**Acceptance Criteria:**

**Given** Try feature is implemented
**When** I navigate using screen reader (NVDA/JAWS/VoiceOver)
**Then** I hear clear announcements:

**Sign In/Out Buttons:**

- Button role announced
- Button label: "Sign in" or "Sign out"
- Button state: Focused/Not focused

**Try Button:**

- Button role announced
- Button label: "Try this now for 24 hours"
- Start button icon decorative (aria-hidden)

**Lease Request Modal:**

- Dialog role announced: "Dialog: Request AWS Sandbox Access"
- AUP heading: "Acceptable Use Policy"
- Checkbox label: "I accept the Acceptable Use Policy"
- Checkbox state: Checked/Unchecked
- Button labels: "Cancel" / "Continue"
- Continue button state: Disabled/Enabled

**Sessions Table:**

- Table role announced
- Table caption: "Your try sessions"
- Column headers: Template Name, AWS Account ID, Expiry, Budget, Status
- Cell data announced with associated header
- Status badges: "Status: Active" (not just color)
- Budget: "Budget: $12.35 used of $50 maximum" (clear pronunciation)

**Empty States:**

- Heading: "Sign in to view your try sessions"
- Guidance text read clearly
- Links announced with purpose

**And** ARIA labels used where needed:

```html
<span aria-label="Budget: $12.35 used of $50 maximum"> $12.3456 / $50.00 </span>

<div role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Request AWS Sandbox Access</h2>
  ...
</div>
```

**And** manual testing with 3 screen readers:

- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)

**Prerequisites:** Story 8.7 (Keyboard navigation testing)

**Technical Notes:**

- FR-TRY-74, FR-TRY-75, FR-TRY-79 covered
- ARIA labels: Supplement visual information for screen readers
- aria-hidden: Hide decorative icons from screen readers
- ARIA live regions: Announce dynamic content (error messages)
- Modal aria-modal="true": Prevents screen reader navigating outside modal
- Table accessibility: th scope="col", caption or aria-label

**Architecture Context:**

- **ADR-026:** Accessible Modal Pattern - ARIA Attributes (CRITICAL)
  - `role="dialog"` on modal container
  - `aria-modal="true"` prevents screen reader navigating outside modal
  - `aria-labelledby="{modal-title-id}"` announces modal title
  - Background content: `aria-hidden="true"` OR `inert` attribute
- **ADR-028:** ARIA live regions for dynamic content announcements
  - Modal open: "Dialog opened, Request AWS Sandbox Access"
  - Error messages: `role="alert"` with `aria-live="assertive"`
  - Success messages: `aria-live="polite"` (non-intrusive)
- **ADR-027:** Sessions Table ARIA for responsive layout
  - Desktop: `<th scope="col">` for column headers
  - Mobile: `data-label` attributes for inline labels
  - Table caption or `aria-label="Your try sessions"`
- **ARIA Labels for Complex Data:**
  - Budget: `aria-label="Budget: $12.35 used of $50 maximum"`
  - Status badges: "Status: Active" (not just color-coded visual)
- **Decorative Icons:** `aria-hidden="true"` on Try button start icon

**UX Design Context:**

- **Screen Reader Testing:** UX Section 8.1 WCAG 2.2 compliance requires testing with 3 screen readers
  - NVDA (Windows, free)
  - JAWS (Windows, enterprise standard)
  - VoiceOver (macOS/iOS, built-in)
- **ARIA Announcements:** UX Section 7.4 Success/Error Notification Strategy
  - Modal open: Immediate announcement (assertive)
  - Errors: Clear, action-oriented announcements
  - Success: Polite announcements (don't interrupt)
- **Table Accessibility:** UX Component 1 Sessions Table
  - Column headers announced with each cell
  - Status badges include text label (not just color)
  - Budget formatting clear for pronunciation
- **Manual Testing Required:** Automated tools cannot validate screen reader experience

---

### Story 8.9: Focus Management and Visual Focus Indicators

As a keyboard user,
I want clear visual focus indicators on all interactive elements,
So that I always know where I am on the page.

**Acceptance Criteria:**

**Given** Try feature is implemented
**When** I navigate using keyboard (Tab key)
**Then** I see clear focus indicators on all interactive elements:

**Focus Indicator Requirements:**

- Visible outline or border around focused element
- Contrast ratio: 3:1 minimum against background (WCAG 2.2 Level AA)
- Consistent style across all elements
- Not removed by CSS (no `outline: none` without replacement)

**Elements with Focus Indicators:**

- Sign in/out buttons
- "Try Before You Buy" tag filter
- "Try this now" button
- Modal close button (X)
- AUP checkbox
- Cancel/Continue buttons
- Sessions table (if focusable)
- "Launch AWS Console" button
- All navigation links

**And** focus indicator uses GOV.UK Design System default:

```css
/* GOV.UK focus indicator */
:focus {
  outline: 3px solid #ffdd00; /* Yellow */
  outline-offset: 0;
  box-shadow: 0 0 0 4px #0b0c0c; /* Black */
}
```

**And** focus order logical (matches visual order)
**And** focus NOT lost during page updates (AJAX content loading)
**And** modal focus returns to trigger button when closed

**Prerequisites:** Story 8.8 (Screen reader testing)

**Technical Notes:**

- FR-TRY-71 covered (focus indicators visible)
- GOV.UK Design System provides focus styles automatically
- Custom CSS must not override (validate no `outline: none`)
- WCAG 2.2 new criterion: Focus Appearance (Level AAA, 2px thickness minimum)
- Focus management: Modal traps focus, returns focus on close
- Focus order: Determined by HTML source order (not CSS visual order)

**Architecture Context:**

- **GOV.UK Focus Indicator (default):** Yellow outline + black shadow
  ```css
  :focus {
    outline: 3px solid #ffdd00; /* Yellow */
    outline-offset: 0;
    box-shadow: 0 0 0 4px #0b0c0c; /* Black */
  }
  ```
- **Contrast Ratio:** 3:1 minimum against background (WCAG 2.2 Level AA)
- **WCAG 2.2 Focus Appearance (Level AAA):** 2px thickness minimum (GOV.UK exceeds with 3px)
- **CSS Validation:** Audit for `outline: none` overrides (accessibility violation)
- **ADR-026:** Modal focus management
  - Focus returns to trigger button ("Try this now") when modal closes
  - Focus trapped within modal while open (no background focus)
- **Focus Order:** HTML source order determines tab order (no CSS `order` or `flex` reordering)
- **Dynamic Content:** Focus NOT lost during AJAX content loading (preserve focus reference)

**UX Design Context:**

- **Focus Indicator Standard:** GOV.UK Design System default (yellow + black)
  - Visible on all interactive elements (buttons, links, checkboxes, inputs)
  - Consistent across all components (no custom overrides)
- **WCAG 2.2 Compliance:** Level AA minimum (3:1 contrast), AAA target (2px thickness achieved)
- **Focus Elements Coverage:** UX Section 6.2 Component Specifications
  - Sign in/out buttons
  - "Try Before You Buy" tag filter
  - "Try this now" button
  - Modal close button (X), AUP checkbox, Cancel/Continue buttons
  - Sessions table rows, "Launch AWS Console" button
  - All navigation links
- **Focus Order Logic:** Visual order = tab order (top-to-bottom, left-to-right)
- **No CSS Override:** Validate no `outline: none` in custom CSS (breaks accessibility)

---

### Story 8.10: Error Messaging Accessibility

As a government user,
I want error messages announced clearly to screen readers,
So that I know when something goes wrong and how to fix it.

**Acceptance Criteria:**

**Given** errors can occur (API failures, validation errors)
**When** error occurs
**Then** I see and hear error message:

**Visual Error Display:**

- GOV.UK error message component
- Red left border (govuk-error-message class)
- Error text clearly visible
- Error associated with failed element (ARIA)

**Screen Reader Announcement:**

- ARIA live region announces error immediately
- Error message descriptive (not just "Error")
- Remediation guidance included

**Error Scenarios:**

**1. Lease Request Failure (409 Max Leases):**

```html
<div role="alert" aria-live="assertive">
  You have reached the maximum number of active sandbox leases (5). Please terminate an existing lease before requesting
  a new one.
</div>
```

**2. API Failure (Network Error):**

```html
<div role="alert" aria-live="assertive">
  Failed to load your try sessions. Please check your connection and refresh the page.
</div>
```

**3. Authentication Failure (401):**

```html
<div role="alert" aria-live="assertive">Your session has expired. Redirecting to sign in...</div>
```

**And** error messages use GOV.UK error pattern:

- Clear, concise language
- Action-oriented (tell user what to do)
- No technical jargon
- Red left border visual indicator

**And** errors announced immediately (aria-live="assertive")
**And** errors do NOT rely on color alone (text + border)

**Prerequisites:** Story 8.9 (Focus indicators)

**Technical Notes:**

- FR-TRY-79 covered (ARIA live regions for errors)
- ARIA live regions: Announce dynamic content to screen readers
- aria-live="assertive": Immediate announcement (interrupts screen reader)
- GOV.UK error message component: Built-in accessibility
- Error text: Plain English, action-oriented (UK government standard)

**Architecture Context:**

- **ADR-028:** ARIA live regions for error announcements (CRITICAL)
  - `role="alert"` with `aria-live="assertive"` for immediate interruption
  - Screen readers announce errors instantly (don't wait for focus)
  - Example: "You have reached the maximum number of active sandbox leases (5). Please terminate an existing lease."
- **ADR-032:** User-friendly error messages pattern
  - Clear, concise language (no technical jargon)
  - Action-oriented: Tell user what to do next
  - Examples:
    - 409 Max Leases: "Please terminate an existing lease before requesting a new one"
    - Network Error: "Please check your connection and refresh the page"
    - 401 Auth Failure: "Your session has expired. Redirecting to sign in..."
- **GOV.UK Error Message Component:**
  - Red left border visual indicator (4px solid #d4351c)
  - `govuk-error-message` class with built-in ARIA
  - Error text in `govuk-body` typography
- **No Color Reliance:** Error messages include text + border (not color alone per WCAG 2.2)
- **Module:** `src/try/utils/error-handler.ts` - Centralized error message formatting

**UX Design Context:**

- **Error Strategy:** UX Section 7.4 Success/Error Notification Strategy
  - Immediate announcement via ARIA live regions
  - Clear, actionable guidance (not just "Error")
  - GOV.UK error message pattern (red border + descriptive text)
- **Plain English:** UK government requirement (avoid technical jargon)
  - NOT: "HTTP 409 Conflict - Resource quota exceeded"
  - YES: "You have reached the maximum number of active sandbox leases (5)"
- **Error Scenarios Covered:**
  - Lease Request Failure (409 Max Leases)
  - API Failure (Network Error)
  - Authentication Failure (401 Expired Session)
  - Validation Errors (AUP not accepted)
- **Accessibility:** Errors announced to screen readers immediately (don't rely on visual indicators alone)

---

### Story 8.11: WCAG 2.2 AA Compliance Certification

As a product owner,
I want to certify WCAG 2.2 Level AA compliance for Try feature,
So that we meet UK government accessibility standards before release.

**Acceptance Criteria:**

**Given** all Epic 8 stories are complete (8.1-8.10)
**When** I review comprehensive accessibility testing results
**Then** I certify compliance with:

**WCAG 2.2 Level A (30 criteria) - All Pass:**

- ✓ Perceivable: Text alternatives, adaptable, distinguishable
- ✓ Operable: Keyboard accessible, enough time, navigable
- ✓ Understandable: Readable, predictable, input assistance
- ✓ Robust: Compatible with assistive technologies

**WCAG 2.2 Level AA (20 criteria) - All Pass:**

- ✓ Contrast (Minimum): 4.5:1 text, 3:1 UI components
- ✓ Resize Text: 200% zoom without loss of functionality
- ✓ Reflow: No horizontal scroll at 320px width
- ✓ Focus Visible: Clear focus indicators
- ✓ Label in Name: Accessible names match visible labels

**WCAG 2.2 Level AAA (Optional - Best Effort):**

- ✓ Contrast (Enhanced): 7:1 where possible (GOV.UK achieves this)
- ✓ Reading Level: Plain English (UK government standard)

**And** compliance certification includes:

**1. Accessibility Statement (Public):**

```markdown
# Accessibility Statement for NDX Try Before You Buy

This website is run by the Cabinet Office. We want as many people as possible to be able to use this website.

## Compliance Status

This website is fully compliant with the Web Content Accessibility Guidelines version 2.2 AA standard.

## Testing

We regularly test this website using:

- Automated testing with axe-core and pa11y
- Manual testing with NVDA, JAWS, and VoiceOver
- Keyboard-only navigation testing
- Mobile device testing (iOS/Android)

## Feedback

If you have difficulty using this website, contact us: [contact details]

Last updated: [Date]
```

**2. Internal Compliance Report:**

- All WCAG 2.2 success criteria checked
- Testing methodology documented
- Evidence of compliance (screenshots, test results)
- Any known issues documented (with remediation plan)

**And** compliance statement published on NDX website (e.g., `/accessibility`)
**And** product owner sign-off before release

**Prerequisites:** Story 8.10 (Error messaging accessibility)

**Technical Notes:**

- UK government requirement: WCAG 2.2 Level AA minimum
- GOV.UK services must publish accessibility statement
- Compliance statement template: https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps
- Certification based on testing evidence (Stories 8.1-8.10)
- Ongoing compliance: CI tests prevent regressions (Story 8.2)

**Architecture Context:**

- **ADR-037:** Mandatory accessibility testing gate (ongoing compliance)
  - CI pipeline blocks PRs with WCAG violations (Story 8.2)
  - Prevents accessibility regressions after initial certification
  - Zero tolerance for new violations post-release
- **Compliance Evidence (Stories 8.1-8.10):**
  - 8.1: Brownfield audit baseline
  - 8.2: CI pipeline automated testing
  - 8.3: Comprehensive WCAG 2.2 audit (all 50 AA criteria)
  - 8.4: GOV.UK component compliance
  - 8.5: Mobile responsiveness validation
  - 8.6: Performance + security validation
  - 8.7: Keyboard navigation testing (all user flows)
  - 8.8: Screen reader testing (NVDA, JAWS, VoiceOver)
  - 8.9: Focus indicators validation
  - 8.10: Error messaging accessibility
- **WCAG 2.2 Coverage:** All 50 Level AA criteria (30 Level A + 20 Level AA)
- **AAA Where Feasible:** GOV.UK Design System achieves many AAA criteria by default
  - Contrast (Enhanced): 7:1 achieved for most text
  - Reading Level: Plain English (UK government standard)

**UX Design Context:**

- **WCAG 2.2 Target:** UX Section 8.1 - Level AA minimum, AAA where feasible
- **Accessibility Statement Required:** UK government public sector requirement
  - Published at `/accessibility` route
  - Includes compliance status, testing methodology, feedback contact
  - Template: GOV.UK accessibility requirements guidance
- **Certification Checklist:**
  - ✓ All 30 Level A criteria pass
  - ✓ All 20 Level AA criteria pass
  - ✓ Manual + automated testing complete
  - ✓ Screen reader testing (3 readers)
  - ✓ Keyboard navigation (all user journeys)
  - ✓ Mobile device testing (iOS + Android)
- **Product Owner Sign-Off:** Required before Try feature release
- **Ongoing Compliance:** ADR-037 CI gate ensures continuous compliance (not just one-time certification)

---

## FR Coverage Matrix - Feature 2

| FR        | Description                                  | Epic           | Stories        |
| --------- | -------------------------------------------- | -------------- | -------------- |
| FR-TRY-1  | Detect authentication (sessionStorage check) | Epic 5         | Story 5.1      |
| FR-TRY-2  | Initiate OAuth login redirect                | Epic 5         | Story 5.2      |
| FR-TRY-3  | Extract JWT from URL                         | Epic 5         | Story 5.3      |
| FR-TRY-4  | Store JWT in sessionStorage                  | Epic 5         | Story 5.3      |
| FR-TRY-5  | Clean up URL after token extraction          | Epic 5         | Story 5.3      |
| FR-TRY-6  | Retrieve JWT for API calls                   | Epic 5         | Story 5.6      |
| FR-TRY-7  | Clear JWT on sign-out                        | Epic 5         | Story 5.5      |
| FR-TRY-8  | Persist auth across tabs                     | Epic 5         | Story 5.4      |
| FR-TRY-9  | Clear auth on browser restart                | Epic 5         | Story 5.4      |
| FR-TRY-10 | Send Authorization header                    | Epic 5         | Story 5.6      |
| FR-TRY-11 | Display "Sign in" when unauthenticated       | Epic 5         | Story 5.1      |
| FR-TRY-12 | Display "Sign out" when authenticated        | Epic 5         | Story 5.1      |
| FR-TRY-13 | Sign in triggers OAuth redirect              | Epic 5         | Story 5.2      |
| FR-TRY-14 | Sign out clears sessionStorage               | Epic 5         | Story 5.5      |
| FR-TRY-15 | Use GOV.UK button styling                    | Epic 5         | Story 5.1      |
| FR-TRY-16 | Check auth status API                        | Epic 5         | Story 5.7      |
| FR-TRY-17 | Parse user session data                      | Epic 5         | Story 5.7      |
| FR-TRY-18 | Retrieve user leases                         | Epic 7         | Story 7.2      |
| FR-TRY-19 | Parse lease data                             | Epic 7         | Story 7.2      |
| FR-TRY-20 | Get lease templates                          | Epic 6         | Story 6.1      |
| FR-TRY-21 | Get AUP from configurations                  | Epic 6         | Story 6.7      |
| FR-TRY-22 | Request new lease                            | Epic 6         | Story 6.9      |
| FR-TRY-23 | Handle API errors                            | Epic 5         | Story 5.8      |
| FR-TRY-24 | Redirect to login on 401                     | Epic 5         | Story 5.8      |
| FR-TRY-25 | Render /try page route                       | Epic 7         | Story 7.1      |
| FR-TRY-26 | Show unauthenticated message                 | Epic 5         | Story 5.9      |
| FR-TRY-27 | Show sign in button on /try                  | Epic 5         | Story 5.9      |
| FR-TRY-28 | Fetch and display leases                     | Epic 7         | Story 7.1, 7.2 |
| FR-TRY-29 | Empty state if no leases                     | Epic 5         | Story 5.9      |
| FR-TRY-30 | Sessions table columns                       | Epic 7         | Story 7.3      |
| FR-TRY-31 | Relative time for past expiry                | Epic 7         | Story 7.5      |
| FR-TRY-32 | Absolute time for future expiry              | Epic 7         | Story 7.5      |
| FR-TRY-33 | Budget format                                | Epic 7         | Story 7.6      |
| FR-TRY-34 | Cost accrued 4 decimals                      | Epic 7         | Story 7.6      |
| FR-TRY-35 | Status badge color coding                    | Epic 7         | Story 7.4      |
| FR-TRY-36 | Sort sessions by date                        | Epic 7         | Story 7.3      |
| FR-TRY-37 | Distinguish active/expired                   | Epic 7         | Story 7.4      |
| FR-TRY-38 | Launch button for Active                     | Epic 7         | Story 7.7      |
| FR-TRY-39 | Launch opens AWS portal                      | Epic 7         | Story 7.7      |
| FR-TRY-40 | Remaining lease duration                     | Epic 7         | Story 7.8      |
| FR-TRY-41 | No launch for expired                        | Epic 7         | Story 7.7      |
| FR-TRY-42 | Parse try metadata                           | Epic 6         | Story 6.1      |
| FR-TRY-43 | Parse try_id metadata                        | Epic 6         | Story 6.1      |
| FR-TRY-44 | Generate Try tag                             | Epic 6         | Story 6.2      |
| FR-TRY-45 | Render tag in filters                        | Epic 6         | Story 6.2      |
| FR-TRY-46 | Filter by Try tag                            | Epic 6         | Story 6.3      |
| FR-TRY-47 | Render Try button                            | Epic 6         | Story 6.4      |
| FR-TRY-48 | Use govukButton isStartButton                | Epic 6         | Story 6.4      |
| FR-TRY-49 | Check auth before modal                      | Epic 6         | Story 6.5      |
| FR-TRY-50 | Redirect if unauthenticated                  | Epic 6         | Story 6.5      |
| FR-TRY-51 | Display modal overlay                        | Epic 6         | Story 6.6      |
| FR-TRY-52 | Modal shows duration                         | Epic 6         | Story 6.6      |
| FR-TRY-53 | Modal shows budget                           | Epic 6         | Story 6.6      |
| FR-TRY-54 | Fetch AUP text                               | Epic 6         | Story 6.7      |
| FR-TRY-55 | Scrollable AUP container                     | Epic 6         | Story 6.7      |
| FR-TRY-56 | AUP checkbox required                        | Epic 6         | Story 6.6      |
| FR-TRY-57 | Disable Continue until checked               | Epic 6         | Story 6.8      |
| FR-TRY-58 | Cancel closes modal                          | Epic 6         | Story 6.8      |
| FR-TRY-59 | Continue requests lease                      | Epic 6         | Story 6.9      |
| FR-TRY-60 | Loading indicator                            | Epic 6         | Story 6.9      |
| FR-TRY-61 | Navigate to /try on success                  | Epic 6         | Story 6.9      |
| FR-TRY-62 | Alert on 409 error                           | Epic 6         | Story 6.9      |
| FR-TRY-63 | Redirect on 409 error                        | Epic 6         | Story 6.9      |
| FR-TRY-64 | Alert on other errors                        | Epic 6         | Story 6.9      |
| FR-TRY-65 | Close modal after request                    | Epic 6         | Story 6.9      |
| FR-TRY-66 | Responsive UI (320px+)                       | Epic 8         | Story 8.5      |
| FR-TRY-67 | Sessions table mobile                        | Epic 8         | Story 8.5      |
| FR-TRY-68 | Modal mobile adaptation                      | Epic 8         | Story 8.5      |
| FR-TRY-69 | Sign in/out mobile nav                       | Epic 8         | Story 8.5      |
| FR-TRY-70 | Keyboard navigation                          | Epic 8         | Story 8.7      |
| FR-TRY-71 | Focus indicators                             | Epic 8         | Story 8.9      |
| FR-TRY-72 | Escape closes modal                          | Epic 8         | Story 8.7      |
| FR-TRY-73 | Modal focus trap                             | Epic 8         | Story 8.7      |
| FR-TRY-74 | Status ARIA labels                           | Epic 8         | Story 8.8      |
| FR-TRY-75 | Budget ARIA labels                           | Epic 8         | Story 8.6, 8.8 |
| FR-TRY-76 | Color contrast WCAG 2.2 AA                   | Epic 8         | Story 8.3      |
| FR-TRY-77 | Color + text for status                      | Epic 7, Epic 8 | Story 7.4, 8.8 |
| FR-TRY-78 | Form labels associated                       | Epic 8         | Story 8.8      |
| FR-TRY-79 | ARIA live regions                            | Epic 8         | Story 8.10     |

**Coverage Validation:** All 79 FRs mapped to stories ✓

---

## Epic Story Count Summary - Feature 2

- **Epic 4 (Local Dev Infrastructure):** 6 stories
- **Epic 5 (Authentication Foundation):** 10 stories
- **Epic 6 (Catalogue Integration & Sandbox Requests):** 12 stories
- **Epic 7 (Try Sessions Dashboard):** 13 stories
- **Epic 8 (Accessible & Mobile-Friendly Experience):** 11 stories

**Total:** 52 implementable stories

---

## Summary - Feature 2

This epic breakdown transforms the NDX Try Before You Buy PRD into 52 bite-sized, implementable stories across 5 epics. All 79 functional requirements are covered with full architectural context and accessibility built-in throughout.

**Key Strengths:**

- **Risk-first sequencing:** Most technically risky epics first (local dev, auth foundation)
- **UX checkpoint:** Gate story validates design before implementation (Epic 6)
- **Accessibility throughout:** Built-in NFRs + comprehensive Epic 8 validation
- **Integration testing:** Epic handoff validation stories (5→6, 6→7, full journey)
- **Early brownfield audit:** Story 8.1 runs parallel with Epic 4 (prevents compounding issues)
- **Automated CI tests:** Catches accessibility regressions before merge
- **GOV.UK Design System:** Accessible-by-default components used consistently
- **Clear prerequisites:** Sequential dependencies only (no forward references)
- **BDD acceptance criteria:** Given/When/Then format for all stories

**Implementation Approach:**

1. Execute stories sequentially within each epic
2. Each story is sized for single developer session completion
3. All tests must pass before moving to next story
4. Accessibility validated continuously, not just at the end

**Context for Phase 4:**

- PRD provides functional requirements (WHAT capabilities)
- Architecture provides technical decisions (HOW to implement - in progress for cross-gov SSO)
- Epics provide tactical implementation plan (STORY-BY-STORY breakdown)
- Development agent will use all three documents to implement each story

**MVP Delivery:** After completing all 5 epics, government users can discover tryable products in the catalogue, request AWS sandbox access via AUP modal, view/manage their sandbox sessions, and launch AWS Console—all with WCAG 2.2 AA compliance and GOV.UK Design System integration for the UK government's National Digital Exchange platform.

---

**Next Workflow:** Phase 3 - Sprint Planning

Create sprint status file from Feature 2 epics and begin Phase 4 implementation.

---

_For implementation: Each story contains complete acceptance criteria, prerequisites, and technical notes for autonomous development agent execution._

---
