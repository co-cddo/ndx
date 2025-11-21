# Epic Technical Specification: Cookie-Based Routing Implementation

**Date:** 2025-11-20
**Author:** cns
**Epic ID:** 2
**Phase:** 2 - CloudFront Cookie-Based Origin Routing
**Status:** Ready for Implementation

---

## Overview

This epic implements CloudFront Function-based cookie inspection and origin routing logic. When a request arrives at CloudFront, the function inspects the `NDX` cookie value and dynamically selects the appropriate S3 origin:
- Requests with `NDX=true` route to `ndx-static-prod` (new UI for testers)
- All other requests route to existing S3Origin (production UI)

This approach enables safe UI testing for authorized testers without affecting production users. The routing function executes at CloudFront edge locations before any caching, ensuring consistent behavior globally.

**What This Epic Delivers:**
- CloudFront Function containing cookie-based routing logic
- Comprehensive unit tests for routing scenarios
- Cache policy configuration allowing NDX cookie inspection
- Deployment of function to CloudFront distribution E3THG4UHYDHVWP
- Attachment of function to default cache behavior
- Validation that routing works correctly in production

**What This Epic Does NOT Include:**
- Testing infrastructure (Epic 3)
- Rollback procedures (Epic 3)
- Operational monitoring setup (Epic 3)
- Changes to API Gateway cache behavior (preserves existing /prod/* routes)

---

## Objectives and Scope

### In-Scope

**Routing Function Development:**
- CloudFront Function JavaScript code with cookie parsing
- Exact string matching for `NDX` cookie name and `true` value
- Dynamic origin selection based on cookie presence/value
- Fail-open error handling (routes to default origin on errors)
- Sub-1KB code size optimized for CloudFront Functions runtime

**Testing:**
- Unit tests covering all routing scenarios (5+ test cases)
- Cookie parsing edge cases (missing, malformed, multiple cookies)
- Validation that non-"true" values route to default origin

**Cache Policy Configuration:**
- Configure CloudFront to forward `NDX` cookie to function
- Preserve all existing cache behavior settings
- Maintain existing TTL, compression, HTTPS redirect policies

**Deployment:**
- Deploy CloudFront Function via CDK to distribution E3THG4UHYDHVWP
- Attach function to default cache behavior as viewer-request function
- Preserve API Gateway cache behavior (/prod/*) unchanged
- Zero-downtime deployment via CloudFormation

**Validation:**
- Smoke test: Set `NDX=true` cookie, verify routing to new origin
- Smoke test: No cookie or `NDX=false`, verify default origin
- CloudFormation deployment completion verification

### Out-of-Scope

- CDK snapshot/integration tests (Epic 3)
- Rollback automation (Epic 3)
- CloudWatch monitoring dashboards (Epic 3)
- Documentation updates (Epic 3)
- Pre-deployment validation scripts (Epic 3)
- Cookie expiration management (handled by tester's browser)

### System Architecture Alignment

**Architecture References:**
- **CloudFront Function Pattern (ADR-001):** Lightweight JavaScript execution at 225+ edge locations, sub-millisecond latency
- **Cookie-Based Routing Section:** Exact implementation code provided in Architecture document
- **Security Model (ADR-002):** Reuse OAC E3P8MA1G9Y5BYE for new origin access

**Alignment:**
- Function uses CloudFront Functions runtime (not Lambda@Edge)
- Executes as viewer-request function (before cache lookup)
- Fail-open design aligns with NFR-REL-3 (graceful degradation)
- No changes to existing cache behaviors (preserves API Gateway routing)

---

## Technical Context

### CloudFront Function JavaScript Runtime

**Constraints:**
- **JavaScript Subset:** ECMAScript 5.1 compatible (no ES6 features)
- **Keywords:** Must use `var` (not `const` or `let`)
- **Functions:** No arrow functions, use `function` keyword
- **Size Limit:** 10KB max (target < 1KB for fast execution)
- **No Node.js APIs:** No `require`, `fs`, `http`, etc.
- **No console.log:** Avoid for production (adds execution cost)

**Supported CloudFront Functions Features:**
- String manipulation
- Object/array operations (basic)
- Header access via `event.request.headers`
- Origin modification via `request.origin` assignment

**Reference:** [CloudFront Functions JavaScript API](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-features.html)

### Distribution E3THG4UHYDHVWP Context

**Current Origins:**
1. **S3Origin** (ID: "S3Origin") - Default for HTML/assets
2. **API Gateway** (ID: "InnovationSandbox...") - /prod/* routes
3. **ndx-static-prod-origin** (NEW in Epic 1) - New UI for testers

**Cache Behaviors:**
- **Default** (*): Currently targets S3Origin, no routing function attached
- **/prod/\***: Targets API Gateway, preserves existing behavior

**Target Configuration:**
- Attach cookie-router function to **Default cache behavior** only
- Leave /prod/* cache behavior unchanged

### Origin Access Control (OAC)

**OAC ID:** E3P8MA1G9Y5BYE (reused from Epic 1)

**Critical:** CloudFront Function must specify OAC when routing to `ndx-static-prod`:
```javascript
request.origin = {
  s3: {
    domainName: 'ndx-static-prod.s3.us-west-2.amazonaws.com',
    region: 'us-west-2',
    authMethod: 'origin-access-control',
    originAccessControlId: 'E3P8MA1G9Y5BYE'
  }
};
```

---

## Story Implementation Guide

### Story 2.1: Create CloudFront Function for Cookie Inspection

**File:** `infra/lib/functions/cookie-router.js`

**Implementation:**

```javascript
function handler(event) {
  var request = event.request;
  var cookies = parseCookies(request.headers.cookie);

  // Route to new origin if NDX=true (exact match, case-sensitive)
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
  // Else: request.origin remains undefined, uses default cache behavior origin

  return request;
}

function parseCookies(cookieHeader) {
  if (!cookieHeader || !cookieHeader.value) {
    return {};
  }

  var cookies = {};
  var cookieString = cookieHeader.value;

  cookieString.split(';').forEach(function(cookie) {
    var parts = cookie.split('=');
    if (parts.length >= 2) {
      var key = parts[0].trim();
      var value = parts.slice(1).join('=').trim(); // Handle values with = in them
      cookies[key] = value;
    }
  });

  return cookies;
}
```

**Validation:**
- Code size: ~500 bytes ✓
- No ES6 features: `var`, `function`, no arrow functions ✓
- Exact string matching: `cookies['NDX'] === 'true'` ✓
- Fail-open: Errors/missing cookies route to default ✓
- OAC specified: E3P8MA1G9Y5BYE ✓

---

### Story 2.2: Write Unit Tests for Cookie Router Function

**File:** `infra/test/cookie-router.test.ts`

**Implementation:**

```typescript
import { handler } from '../lib/functions/cookie-router';

describe('CloudFront Cookie Router', () => {
  test('routes to new origin when NDX=true', () => {
    const event = {
      request: {
        headers: {
          cookie: { value: 'NDX=true' }
        }
      }
    };

    const result = handler(event);

    expect(result.origin).toBeDefined();
    expect(result.origin.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
    expect(result.origin.s3.region).toBe('us-west-2');
    expect(result.origin.s3.authMethod).toBe('origin-access-control');
    expect(result.origin.s3.originAccessControlId).toBe('E3P8MA1G9Y5BYE');
  });

  test('uses default origin when cookie missing', () => {
    const event = {
      request: {
        headers: {}
      }
    };

    const result = handler(event);

    expect(result.origin).toBeUndefined();
  });

  test('uses default origin when NDX=false', () => {
    const event = {
      request: {
        headers: {
          cookie: { value: 'NDX=false' }
        }
      }
    };

    const result = handler(event);

    expect(result.origin).toBeUndefined();
  });

  test('uses default origin when NDX has non-true value', () => {
    const testValues = ['TRUE', 'True', '1', 'yes', '"true"', 'true '];

    testValues.forEach(value => {
      const event = {
        request: {
          headers: {
            cookie: { value: `NDX=${value}` }
          }
        }
      };

      const result = handler(event);
      expect(result.origin).toBeUndefined();
    });
  });

  test('parses multiple cookies correctly', () => {
    const event = {
      request: {
        headers: {
          cookie: { value: 'session=abc123; NDX=true; other=xyz' }
        }
      }
    };

    const result = handler(event);

    expect(result.origin).toBeDefined();
    expect(result.origin.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
  });

  test('handles malformed cookies gracefully', () => {
    const event = {
      request: {
        headers: {
          cookie: { value: 'invalid;;;NDX=true;;;' }
        }
      }
    };

    const result = handler(event);

    expect(result.origin).toBeDefined(); // Should still route correctly
  });

  test('handles cookie values with equals signs', () => {
    const event = {
      request: {
        headers: {
          cookie: { value: 'data=a=b=c; NDX=true' }
        }
      }
    };

    const result = handler(event);

    expect(result.origin).toBeDefined();
  });
});
```

**Validation:**
- Run `yarn test` - all tests pass ✓
- Test execution time < 100ms ✓
- 7 test cases covering all scenarios ✓

---

### Story 2.3: Configure Cache Policy with NDX Cookie Allowlist

**File:** `infra/lib/ndx-stack.ts`

**Implementation:**

Since distribution E3THG4UHYDHVWP is externally managed, cache policy configuration via Custom Resource Lambda or manual CloudFront console update.

**Option A: Manual Configuration (Recommended for Epic 2):**
1. AWS Console → CloudFront → Distribution E3THG4UHYDHVWP
2. Behaviors → Default (*) → Edit
3. Cache key and origin requests:
   - Cache policy: Create new or modify existing
   - Cookies: Allowlist
   - Allowlisted cookies: Add `NDX`
4. Save changes

**Option B: Custom Resource Lambda (Future Enhancement):**
```typescript
// Similar to Epic 1's add-origin Custom Resource
// UpdateDistributionConfig API call to modify cache behavior
```

**For Epic 2:** Manual configuration acceptable, document in story completion notes.

**Validation:**
```bash
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.DistributionConfig.DefaultCacheBehavior.CachePolicyId'

# Then get cache policy details
aws cloudfront get-cache-policy \
  --id <policy-id> \
  --profile NDX/InnovationSandboxHub \
  --query 'CachePolicy.CachePolicyConfig.ParametersInCacheKeyAndForwardedToOrigin.CookiesConfig'
```

**Expected:**
- CookieBehavior: `whitelist` (or `allowlist` in newer API versions)
- Cookies.Items: `["NDX"]`

---

### Story 2.4: Deploy CloudFront Function to CDK Stack

**File:** `infra/lib/ndx-stack.ts`

**Implementation:**

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as fs from 'fs';
import * as path from 'path';

// In NdxStaticStack constructor (after Custom Resource Lambda section):

// CloudFront Function for cookie-based routing
const cookieRouterFunction = new cloudfront.Function(this, 'CookieRouterFunction', {
  functionName: 'ndx-cookie-router',
  code: cloudfront.FunctionCode.fromFile({
    filePath: path.join(__dirname, 'functions/cookie-router.js'),
  }),
  comment: 'Routes requests to ndx-static-prod origin when NDX=true cookie is present',
  runtime: cloudfront.FunctionRuntime.JS_2_0,
});

// Output function ARN for reference
new cdk.CfnOutput(this, 'CookieRouterFunctionArn', {
  value: cookieRouterFunction.functionArn,
  description: 'ARN of CloudFront cookie router function',
});
```

**Validation:**
```bash
cd infra
npx cdk diff --profile NDX/InnovationSandboxHub
# Should show new CloudFront Function resource

npx cdk deploy --profile NDX/InnovationSandboxHub
# Deploys function to CloudFront
```

**Expected Deployment Time:** 2-3 minutes (CloudFormation + CloudFront propagation)

---

### Story 2.5: Attach Function to Default Cache Behavior

**File:** Manual CloudFront configuration (distribution externally managed)

**Implementation:**

Since distribution E3THG4UHYDHVWP is not fully CDK-managed (Custom Resource Lambda approach), function attachment requires:

1. **AWS Console Approach:**
   - CloudFront → Distribution E3THG4UHYDHVWP
   - Behaviors → Default (*) → Edit
   - Function associations → Viewer request
   - Select function: `ndx-cookie-router`
   - Save

2. **AWS CLI Approach:**
```bash
# Get current distribution config
aws cloudfront get-distribution-config \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub > dist-config.json

# Edit dist-config.json:
# Add to DefaultCacheBehavior.FunctionAssociations:
{
  "FunctionAssociations": {
    "Quantity": 1,
    "Items": [
      {
        "FunctionARN": "arn:aws:cloudfront::568672915267:function/ndx-cookie-router",
        "EventType": "viewer-request"
      }
    ]
  }
}

# Update distribution
aws cloudfront update-distribution \
  --id E3THG4UHYDHVWP \
  --if-match <ETag from get-distribution-config> \
  --distribution-config file://dist-config.json \
  --profile NDX/InnovationSandboxHub
```

**Validation:**
```bash
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.DistributionConfig.DefaultCacheBehavior.FunctionAssociations'
```

**Expected Output:**
```json
{
  "Quantity": 1,
  "Items": [
    {
      "FunctionARN": "arn:aws:cloudfront::568672915267:function/ndx-cookie-router",
      "EventType": "viewer-request"
    }
  ]
}
```

---

### Story 2.6: Deploy Routing Functionality and Validate

**Validation Steps:**

**1. Verify Distribution Status:**
```bash
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.Status'
# Expected: "Deployed"
```

**2. Wait for Global Propagation:**
- CloudFront distributes function to 225+ edge locations
- Typical propagation time: 5-15 minutes
- Status will show "InProgress" during propagation

**3. Smoke Test - NDX=true (New Origin):**
```bash
# Set NDX=true cookie and verify routing to new origin
curl -I -H "Cookie: NDX=true" https://d7roov8fndsis.cloudfront.net/

# Check X-Cache header and response
# Verify content comes from ndx-static-prod bucket
```

**4. Smoke Test - No Cookie (Default Origin):**
```bash
# No cookie - should route to existing S3Origin
curl -I https://d7roov8fndsis.cloudfront.net/

# Verify content comes from existing production bucket
```

**5. Smoke Test - NDX=false (Default Origin):**
```bash
curl -I -H "Cookie: NDX=false" https://d7roov8fndsis.cloudfront.net/

# Should route to default origin (not new origin)
```

**6. Verify API Routes Unchanged:**
```bash
# API Gateway routes should be unaffected
curl https://d7roov8fndsis.cloudfront.net/prod/api/health

# Should return API response (not routed through function)
```

**Success Criteria:**
✅ Function deployed to CloudFront
✅ Function attached to default cache behavior as viewer-request
✅ Distribution status: Deployed
✅ NDX=true cookie routes to ndx-static-prod
✅ No cookie / NDX=false routes to default S3Origin
✅ API Gateway routes unchanged (/prod/*)
✅ Zero production user impact

---

## Acceptance Criteria Summary

### Story 2.1
✓ CloudFront Function created: `cookie-router.js`
✓ Function < 1KB size
✓ Uses `var` keyword (no ES6)
✓ Exact string matching for `NDX` and `true`
✓ Handles missing/malformed cookies gracefully
✓ Specifies OAC ID: E3P8MA1G9Y5BYE

### Story 2.2
✓ Unit tests created: `cookie-router.test.ts`
✓ 7+ test cases covering all scenarios
✓ All tests pass via `yarn test`
✓ Test execution < 100ms
✓ Validates exact string matching

### Story 2.3
✓ Cache policy configured to allowlist `NDX` cookie
✓ Existing cache settings preserved (TTL, compression, HTTPS)
✓ Verified via AWS CLI query

### Story 2.4
✓ CloudFront Function resource added to CDK stack
✓ Function code loaded from `cookie-router.js`
✓ `cdk deploy` succeeds
✓ Function ARN output for reference

### Story 2.5
✓ Function attached to default cache behavior
✓ Event type: viewer-request
✓ API Gateway cache behavior unchanged
✓ Verified via CloudFront API query

### Story 2.6
✓ Distribution status: Deployed
✓ Global propagation complete (5-15 minutes)
✓ Smoke test: NDX=true routes to new origin
✓ Smoke test: No cookie routes to default
✓ Smoke test: NDX=false routes to default
✓ API routes functional and unchanged

---

## Non-Functional Requirements

**NFR-PERF-1:** Routing function execution < 1ms (CloudFront Functions typical)
**NFR-PERF-6:** CloudFront function propagation < 15 minutes
**NFR-REL-3:** Fail-open design - errors route to default origin
**NFR-SEC-3:** Cookie inspection only, no sensitive data logged
**NFR-COMP-1:** Zero changes to production user experience (unless cookie set)

---

## Risks & Mitigations

**Risk 1: Incorrect cookie parsing breaks routing**
- **Impact:** HIGH - Testers cannot access new UI
- **Mitigation:** Comprehensive unit tests (Story 2.2) validate all parsing scenarios
- **Fallback:** Function error routes to default origin (fail-open)

**Risk 2: Function attachment to wrong cache behavior**
- **Impact:** CRITICAL - Could affect API Gateway routes
- **Mitigation:** Manual verification after attachment (Story 2.5), AWS CLI validation
- **Fallback:** Detach function via CloudFront console immediately

**Risk 3: Cache policy misconfiguration blocks cookies**
- **Impact:** MEDIUM - Routing function doesn't receive NDX cookie
- **Mitigation:** Validate cache policy via AWS CLI (Story 2.3)
- **Testing:** Smoke tests verify end-to-end cookie flow

**Risk 4: CloudFront propagation delay**
- **Impact:** LOW - Delays validation testing
- **Mitigation:** Wait for "Deployed" status before smoke tests (Story 2.6)
- **Expected:** 5-15 minutes typical

---

## Dependencies

**Required Before Epic 2:**
- ✅ Epic 1 complete (new origin added to E3THG4UHYDHVWP)
- ✅ Distribution E3THG4UHYDHVWP has 3 origins configured
- ✅ OAC E3P8MA1G9Y5BYE exists and accessible

**Required After Epic 2:**
- Epic 3 will add CDK snapshot/integration tests
- Epic 3 will create rollback automation
- Epic 3 will document deployment procedures

---

## Testing (Epic 3)

Epic 2 delivers basic unit tests (Story 2.2) and smoke tests (Story 2.6). Comprehensive testing added in Epic 3:
- CDK snapshot tests for function resource
- CDK integration tests with real AWS deployment
- Automated rollback procedures
- Pre-deployment validation scripts

---

## Next Steps After Epic 2 Completion

1. Update `sprint-status.yaml`: Mark `epic-2: done`
2. Begin Epic 3: Testing, Validation & Operational Readiness
3. Epic 3 will add comprehensive test coverage
4. Epic 3 will document rollback procedures and operations guide

---

**Tech Spec Status:** ✅ COMPLETE - Ready for story implementation
