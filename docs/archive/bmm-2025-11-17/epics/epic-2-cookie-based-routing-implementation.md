# Epic 2: Cookie-Based Routing Implementation

**Goal:** Implement CloudFront Function to inspect `NDX` cookie and route requests to appropriate origin, enabling testers to access new UI via cookie while all other users see existing site.

**User Value:** Testers can set `NDX=true` cookie in browser to see new UI from `ndx-static-prod`, while production users continue seeing existing site with zero changes to their experience.

**FRs Covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24

---

## Story 2.1: Create CloudFront Function for Cookie Inspection

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

## Story 2.2: Write Unit Tests for Cookie Router Function

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

## Story 2.3: Configure Cache Policy with NDX Cookie Allowlist

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

## Story 2.4: Deploy CloudFront Function to CDK Stack

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

## Story 2.5: Attach Function to Default Cache Behavior

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

## Story 2.6: Deploy Routing Functionality and Validate

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
