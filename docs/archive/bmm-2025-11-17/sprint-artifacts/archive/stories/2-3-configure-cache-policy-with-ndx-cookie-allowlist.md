# Story 2.3: Configure Cache Policy with NDX Cookie Allowlist

Status: drafted

## Story

As a developer,
I want the CloudFront distribution to include the NDX cookie in the cache key,
So that requests with different NDX cookie values are cached separately and the CloudFront Function can inspect the cookie.

## Acceptance Criteria

**Given** the distribution E3THG4UHYDHVWP exists with default cache behavior
**When** I configure the cache policy for the default behavior
**Then** the cache policy includes:

```yaml
CachePolicyConfig:
  ParametersInCacheKeyAndForwardedToOrigin:
    CookiesConfig:
      CookieBehavior: whitelist # or 'allowlist' in newer API
      Cookies:
        Items:
          - NDX
```

**And** the NDX cookie is forwarded to the origin
**And** the cache key includes the NDX cookie value
**And** requests with `NDX=true` and `NDX=false` (or missing) are cached separately

## Tasks / Subtasks

- [ ] Task 1: Document manual CloudFront console configuration steps (AC: Manual configuration)
  - [ ] Create step-by-step guide for AWS Console cache policy update
  - [ ] Document cache policy ID and configuration details
  - [ ] Add validation steps to verify cookie allowlist

- [ ] Task 2: Configure cache policy via AWS Console (AC: Cache policy configuration)
  - [ ] Navigate to CloudFront distribution E3THG4UHYDHVWP
  - [ ] Edit default cache behavior
  - [ ] Create or modify cache policy to allowlist NDX cookie
  - [ ] Save changes and wait for deployment

- [ ] Task 3: Validate cache policy configuration (AC: Validation)
  - [ ] Run AWS CLI command to get cache policy details
  - [ ] Verify CookieBehavior is 'whitelist' or 'allowlist'
  - [ ] Verify NDX cookie is in allowlist
  - [ ] Document cache policy ID and configuration

- [ ] Task 4: Add completion notes with cache policy details (AC: Documentation)
  - [ ] Document cache policy ID used
  - [ ] Document cache policy configuration
  - [ ] Add CloudFormation drift note (externally-managed distribution)
  - [ ] Update story with validation results

## Dev Notes

### Manual Configuration Approach

**Rationale:**

- Distribution E3THG4UHYDHVWP is externally managed (not created by CDK)
- Cache policy changes via Custom Resource Lambda would require UpdateDistributionConfig API
- Manual configuration via AWS Console is faster for MVP
- Future enhancement: Automate via Custom Resource (similar to Epic 1 add-origin pattern)

**AWS Console Steps:**

1. Navigate to: AWS Console → CloudFront → Distributions
2. Select distribution: E3THG4UHYDHVWP
3. Go to: Behaviors tab → Select default behavior (\*) → Edit
4. Section: Cache key and origin requests
5. Cache policy:
   - Option A: Create new cache policy with NDX cookie allowlist
   - Option B: Modify existing cache policy (if not used by other behaviors)
6. Cookies configuration:
   - Set Cookie behavior: "Allowlist" (or "Whitelist" in older UI)
   - Add cookie name: `NDX`
7. Save changes
8. Wait for distribution deployment (status: "In Progress" → "Deployed")

### Validation Commands

**Get Current Cache Policy:**

```bash
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --query 'Distribution.DistributionConfig.DefaultCacheBehavior.CachePolicyId' \
  --output text
```

**Get Cache Policy Details:**

```bash
aws cloudfront get-cache-policy \
  --id \
  'CachePolicy.CachePolicyConfig.ParametersInCacheKeyAndForwardedToOrigin.CookiesConfig' < cache-policy-id > --query
```

**Expected Output:**

```json
{
  "CookieBehavior": "whitelist",
  "Cookies": {
    "Quantity": 1,
    "Items": ["NDX"]
  }
}
```

### Cache Behavior Impact

**Before Configuration:**

- All requests with any cookie values are cached together
- CloudFront Function cannot differentiate requests
- Cookie not forwarded to origin (if default policy used)

**After Configuration:**

- Requests with `NDX=true` cached separately from `NDX=false` or missing
- CloudFront Function receives NDX cookie in request headers
- Separate cache entries for testers (NDX=true) and production users (no NDX)

**Cache Key Structure:**

- Without NDX: `https://d7roov8fndsis.cloudfront.net/index.html`
- With NDX=true: `https://d7roov8fndsis.cloudfront.net/index.html?cookies=NDX:true`
- With NDX=false: `https://d7roov8fndsis.cloudfront.net/index.html?cookies=NDX:false`

### Architecture Alignment

**From Architecture Document:**

- **ADR-003:** Cookie-based routing requires cookie in cache key
- **NFR-PERF-2:** Cache hit rate maintained for production users (separate cache entries)
- **NFR-REL-2:** Zero downtime deployment (CloudFront updates applied gradually)

**Cache Policy Design:**

- Only NDX cookie in allowlist (minimize cache fragmentation)
- Other cookies not included in cache key (better cache hit rate)
- Cookie value is case-sensitive exact match in CloudFront Function

### CloudFormation Drift Note

**Important:**

- Distribution E3THG4UHYDHVWP is not managed by CDK/CloudFormation
- Manual cache policy changes will not be tracked in infrastructure code
- This is acceptable for MVP (documented as manual step)
- Future enhancement: Migrate to CDK-managed distribution or Custom Resource

**Drift Detection:**

- Cache policy changes won't appear in CDK diff
- Document cache policy ID in story completion notes for reference
- Include validation commands for verification

### Learnings from Previous Stories

**From Story 2.1: Create CloudFront Function for Cookie Inspection (Status: done)**

- CloudFront Function expects NDX cookie in `request.headers.cookie.value`
- Cookie must be forwarded from viewer to origin
- Cache policy must include NDX cookie for function to receive it

**From Story 2.2: Write Unit Tests for Cookie Router Function (Status: done)**

- Tests validate cookie parsing handles missing cookies gracefully
- Tests verify exact string matching for NDX=true
- Cookie forwarding is prerequisite for function to work

**Use for This Story:**

- Cache policy must allowlist NDX cookie for CloudFront Function to receive it
- Without allowlist, cookie won't be in cache key or forwarded to function
- This is a critical configuration for entire Epic 2 to work

### References

**Epic Context:**

- [Source: docs/epics.md#Story-2.3]
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#Story-2.3]

**Architecture:**

- [Source: docs/architecture.md#ADR-003-Cookie-in-Cache-Key]
- [Source: docs/architecture.md#Cache-Policy-Pattern]

**Requirements:**

- Implements FR12 (Include NDX cookie in cache key)
- Implements FR13 (Forward NDX cookie to CloudFront Function)
- Supports NFR-PERF-2 (Separate caching for testers and production users)

**AWS Documentation:**

- [CloudFront Cache Policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html)
- [CloudFront Cookie Forwarding](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Cookies.html)

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

**AUTOMATED VIA CUSTOM RESOURCE LAMBDA**

This story is now fully automated via CDK using the extended Custom Resource Lambda from Epic 1.

**Implementation Approach:**

- Cache policy created as CDK resource (`cloudfront.CachePolicy`)
- Custom Resource Lambda updated to configure cache behavior via CloudFront API
- No manual AWS Console steps required

**CDK Implementation (in `ndx-stack.ts`):**

1. Created cache policy:
   - Name: `NdxCookieRoutingPolicy`
   - Cookie behavior: Allowlist `NDX` cookie only
   - Query strings: Forward all
   - Headers: None
   - Compression: Gzip and Brotli enabled

2. Custom Resource Lambda extended (`add-cloudfront-origin.ts`):
   - New function: `configureCacheBehavior()`
   - Sets cache policy ID on default cache behavior
   - Removes legacy ForwardedValues settings
   - Uses CloudFront UpdateDistribution API

3. Custom Resource invocation:
   - `ConfigureCacheBehavior` resource created
   - Properties: `DistributionId`, `CachePolicyId`, `FunctionArn`, `FunctionEventType`
   - Dependencies: Waits for cache policy and function to be created

**Deployment:**

- Fully automated: `cdk deploy` handles everything
- Idempotent: Can re-run without issues
- Zero manual configuration needed

**Validation Commands:**

```bash
# Get cache policy ID
aws cloudfront get-distribution --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.DistributionConfig.DefaultCacheBehavior.CachePolicyId'

# Verify cache policy configuration
aws cloudfront get-cache-policy --id \
  NDX/InnovationSandboxHub \
  --query 'CachePolicy.CachePolicyConfig.ParametersInCacheKeyAndForwardedToOrigin.CookiesConfig' < cache-policy-id > --profile
```

**Files Modified:**

- `infra/lib/functions/add-cloudfront-origin.ts` - Extended Lambda handler
- `infra/lib/ndx-stack.ts` - Added cache policy and Custom Resource

**Status:** Ready for automated deployment via CDK (will be deployed with Story 2.6).

**Next Story:** Story 2.5 (Attach Function to Cache Behavior) - also automated via same Custom Resource.

### File List
