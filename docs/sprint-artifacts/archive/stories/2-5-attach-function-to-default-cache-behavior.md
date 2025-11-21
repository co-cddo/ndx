# Story 2.5: Attach Function to Default Cache Behavior

Status: drafted

## Story

As a developer,
I want to attach the cookie router function to the default cache behavior with the new cache policy,
So that the function executes for all requests and routes based on cookie value.

## Acceptance Criteria

**Given** CloudFront Function and Cache Policy are configured
**When** I attach the function to the default cache behavior
**Then** the default cache behavior includes:

- Function association: ndx-cookie-router
- Event type: viewer-request
- Function ARN: arn:aws:cloudfront::568672915267:function/ndx-cookie-router

**And** cache behavior configuration preserves:
- Viewer protocol policy: redirect-to-https
- Allowed methods: GET, HEAD, OPTIONS
- Target origin: S3Origin (default, function overrides when NDX=true)
- Compression settings (inherited from cache policy)

**And** API Gateway cache behaviors remain completely unchanged

## Tasks / Subtasks

- [ ] Task 1: Document manual CloudFront console configuration steps (AC: Manual configuration)
  - [ ] Create step-by-step guide for AWS Console function attachment
  - [ ] Document function ARN and event type
  - [ ] Add validation steps to verify function association

- [ ] Task 2: Attach function via AWS Console (AC: Function association)
  - [ ] Navigate to CloudFront distribution E3THG4UHYDHVWP
  - [ ] Edit default cache behavior (*)
  - [ ] Add function association for viewer-request event
  - [ ] Select ndx-cookie-router function
  - [ ] Save changes and wait for deployment

- [ ] Task 3: Validate function attachment (AC: Validation)
  - [ ] Run AWS CLI command to get cache behavior details
  - [ ] Verify function association exists
  - [ ] Verify event type is viewer-request
  - [ ] Document function association configuration

- [ ] Task 4: Add completion notes with configuration details (AC: Documentation)
  - [ ] Document function ARN used
  - [ ] Document event type configuration
  - [ ] Add CloudFormation drift note (externally-managed distribution)
  - [ ] Update story with validation results

## Dev Notes

### Manual Configuration Approach

**Rationale:**
- Distribution E3THG4UHYDHVWP is externally managed (not created by CDK)
- Function attachment via Custom Resource Lambda would require UpdateDistributionConfig API
- Manual configuration via AWS Console is faster for MVP
- Future enhancement: Automate via Custom Resource (similar to Epic 1 add-origin pattern)

**AWS Console Steps:**
1. Navigate to: AWS Console → CloudFront → Distributions
2. Select distribution: E3THG4UHYDHVWP
3. Go to: Behaviors tab → Select default behavior (*) → Edit
4. Scroll to: Function associations section
5. Viewer request:
   - Function type: CloudFront Functions
   - Function ARN: arn:aws:cloudfront::568672915267:function/ndx-cookie-router
6. Save changes
7. Wait for distribution deployment (status: "In Progress" → "Deployed")

### Validation Commands

**Get Current Function Associations:**
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

### Function Association Impact

**Before Attachment:**
- All requests route to S3Origin
- No cookie inspection
- No dynamic origin selection

**After Attachment:**
- Function executes before cache lookup
- Cookie inspection on every request
- Dynamic routing: NDX=true → ndx-static-prod, else → S3Origin
- Sub-millisecond execution latency

**Event Type: viewer-request**
- Executes before CloudFront cache lookup
- Can modify request headers, query strings, cookies
- Can change origin dynamically
- Cannot modify response body

### Architecture Alignment

**From Architecture Document:**
- **ADR-001:** CloudFront Functions at viewer-request stage
- **NFR-PERF-1:** Sub-millisecond function execution
- **FR17:** Function attached to default cache behavior as viewer-request function

**Function Association Pattern:**
- Event type: viewer-request (executes before cache)
- Function: CloudFront Function (not Lambda@Edge)
- Target behavior: Default cache behavior only (API routes unaffected)

### CloudFormation Drift Note

**Important:**
- Distribution E3THG4UHYDHVWP is not managed by CDK/CloudFormation
- Manual function attachment will not be tracked in infrastructure code
- This is acceptable for MVP (documented as manual step)
- Future enhancement: Migrate to CDK-managed distribution or Custom Resource

**Drift Detection:**
- Function attachment won't appear in CDK diff
- Document function ARN in story completion notes for reference
- Include validation commands for verification

### Learnings from Previous Stories

**From Story 2.4: Deploy CloudFront Function to CDK Stack (Status: done)**

- **Function Deployed:** arn:aws:cloudfront::568672915267:function/ndx-cookie-router
- **Function Status:** UNASSOCIATED (not yet attached to distribution)
- **Function Stages:** DEVELOPMENT and LIVE both available
- **Deployment:** Successful via CDK, function ready for attachment

**Use for This Story:**
- Function ARN available for attachment: arn:aws:cloudfront::568672915267:function/ndx-cookie-router
- Function validated and tested (Stories 2.1 and 2.2)
- Function deployed and propagated globally
- Ready to attach to default cache behavior via AWS Console

[Source: docs/sprint-artifacts/2-4-deploy-cloudfront-function-to-cdk-stack.md#Dev-Agent-Record]

**From Story 2.3: Configure Cache Policy (Status: drafted)**

- **Status:** Manual configuration required (parallel work to this story)
- **Cache Policy:** NDX cookie allowlist configuration
- **Note:** Story 2.5 and Story 2.3 are both manual AWS Console tasks
- **Sequence:** Both can be done in parallel or sequentially

**Use for This Story:**
- Similar manual configuration approach
- Both stories involve AWS Console operations on externally-managed distribution
- User will need to complete both Story 2.3 and Story 2.5 before Story 2.6

[Source: docs/sprint-artifacts/2-3-configure-cache-policy-with-ndx-cookie-allowlist.md#Completion-Notes]

### References

**Epic Context:**
- [Source: docs/epics.md#Story-2.5]
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#Story-2.5]

**Architecture:**
- [Source: docs/architecture.md#Function-Association-Pattern]
- [Source: docs/architecture.md#ADR-001]

**Requirements:**
- Implements FR17 (Attach function to default cache behavior)
- Implements FR12 (Execute routing for default cache behavior)
- Implements FR13 (NOT execute for API Gateway routes)

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

**AUTOMATED VIA CUSTOM RESOURCE LAMBDA**

This story is now fully automated via the same Custom Resource Lambda extended for Story 2.3.

**Implementation Approach:**
- No manual AWS Console steps required
- Custom Resource Lambda handles function attachment via CloudFront API
- Same deployment as Story 2.3 (both configure the cache behavior)

**CDK Implementation:**
The `ConfigureCacheBehavior` Custom Resource (created in Story 2.3) handles both:
1. Cache policy configuration (Story 2.3)
2. Function attachment (Story 2.5)

**Custom Resource Properties:**
```typescript
{
  DistributionId: 'E3THG4UHYDHVWP',
  CachePolicyId: cachePolicy.cachePolicyId,
  FunctionArn: cookieRouterFunction.functionArn,
  FunctionEventType: 'viewer-request'
}
```

**Lambda Handler Logic (`configureCacheBehavior` function):**
- Gets current distribution config
- Sets cache policy ID on default cache behavior
- Adds function association:
  - Event type: `viewer-request`
  - Function ARN: from CloudFront Function resource
- Updates distribution via CloudFront UpdateDistribution API
- Idempotent: Updates existing association or adds new one

**Deployment:**
- Fully automated: `cdk deploy` handles everything
- Zero manual configuration needed
- Function attached as viewer-request handler
- Executes before cache lookup

**Validation Commands:**
```bash
# Get function associations
aws cloudfront get-distribution --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.DistributionConfig.DefaultCacheBehavior.FunctionAssociations'

# Expected output
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

**Files Modified:**
- `infra/lib/functions/add-cloudfront-origin.ts` - Extended Lambda with `configureCacheBehavior()`
- `infra/lib/ndx-stack.ts` - Added `ConfigureCacheBehavior` Custom Resource

**Status:** Ready for automated deployment via CDK (will be deployed with Story 2.6).

**Next Story:** Story 2.6 (Deploy Routing Functionality and Validate) - full end-to-end deployment and validation.

### File List

## Change Log

- 2025-11-20: Story created from epics.md via create-story workflow
