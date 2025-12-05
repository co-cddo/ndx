# Story 1.2: Add New S3 Origin with Origin Access Control

Status: blocked

## Story

As a developer,
I want to add the `ndx-static-prod` S3 bucket as a new origin to the CloudFront distribution,
So that CloudFront can fetch content from this bucket for testers using cookie-based routing.

## Acceptance Criteria

1. CDK stack imports existing CloudFront distribution (from Story 1.1)
2. S3 bucket `ndx-static-prod` referenced using `Bucket.fromBucketName()`
3. New S3 origin created with origin ID: `ndx-static-prod-origin`
4. Origin Access Control ID configured: E3P8MA1G9Y5BYE (reuses existing OAC)
5. Origin timeouts match existing origins:
   - Connection attempts: 3
   - Connection timeout: 10 seconds
   - Read timeout: 30 seconds
6. Running `cdk diff --profile NDX/InnovationSandboxHub` shows new origin being added
7. Diff output shows origin ID: `ndx-static-prod-origin`
8. Diff confirms OAC ID: E3P8MA1G9Y5BYE
9. No changes shown to existing origins (S3Origin and API Gateway)

## Tasks / Subtasks

- [ ] Reference S3 bucket in CDK stack (AC: #2)
  - [ ] Import `aws-cdk-lib/aws-s3` module
  - [ ] Use `Bucket.fromBucketName()` to reference `ndx-static-prod`
  - [ ] Store bucket reference for origin configuration
- [ ] Configure new S3 origin with OAC (AC: #3, #4, #5)
  - [ ] Import `aws-cdk-lib/aws-cloudfront-origins` module
  - [ ] Create `S3Origin` with origin ID `ndx-static-prod-origin`
  - [ ] Set `originAccessControlId` to E3P8MA1G9Y5BYE
  - [ ] Configure connection attempts: 3
  - [ ] Configure connection timeout: 10 seconds
  - [ ] Configure read timeout: 30 seconds
- [ ] Add origin to CloudFront distribution (AC: #1, #6)
  - [ ] Recreate distribution reference using `fromDistributionAttributes()`
  - [ ] Use L1 (CFN) constructs to add origin to distribution config
  - [ ] Preserve all existing distribution properties
- [ ] Validate changes via CDK diff (AC: #6, #7, #8, #9)
  - [ ] Run `cdk diff --profile NDX/InnovationSandboxHub`
  - [ ] Verify new origin `ndx-static-prod-origin` appears in diff
  - [ ] Confirm OAC ID E3P8MA1G9Y5BYE in diff output
  - [ ] Verify zero changes to existing S3Origin
  - [ ] Verify zero changes to API Gateway origin
  - [ ] Verify no cache behavior modifications

## Dev Notes

### Learnings from Previous Story

**From Story 1-1-import-existing-cloudfront-distribution-in-cdk (Status: done)**

- **Import Pattern**: Successfully imported CloudFront distribution E3THG4UHYDHVWP using `Distribution.fromDistributionAttributes()` - use same approach
- **Distribution Reference**: Previous story intentionally didn't store distribution in variable to avoid unused-vars error - we'll recreate the reference when needed for adding origin
- **Validation Approach**: CDK synth and grep verification worked well - extend with `cdk diff` for this story
- **ESLint Compliance**: Fixed TypeScript strict mode issues with `tryGetContext` type casting - maintain this standard
- **File Location**: Working in `infra/lib/ndx-stack.ts` (existing file) - continuation of Epic 1 implementation

[Source: stories/1-1-import-existing-cloudfront-distribution-in-cdk.md#Dev-Agent-Record]

### Architecture Patterns and Constraints

**Origin Configuration (PRD Infrastructure Section):**

- Origin ID: `ndx-static-prod-origin`
- Origin Domain: `ndx-static-prod.s3.us-west-2.amazonaws.com`
- Origin Protocol: HTTPS only
- Origin Path: Empty (serve from bucket root)
- Connection Attempts: 3 (match existing)
- Connection Timeout: 10 seconds (match existing)
- Origin Read Timeout: 30 seconds (match existing)
- Origin Access Control: E3P8MA1G9Y5BYE (reuse existing OAC)

**Security Model (Architecture ADR-002):**

- Reuse existing OAC for consistent security model
- Same security requirements as existing S3Origin (read-only access)
- Simpler management (no additional IAM policies)
- Least-privilege access already configured

**CDK Implementation Pattern:**

- Import existing distribution (Story 1.1 pattern)
- Add new origin using L1 (CFN) constructs
- Preserve all existing origins and cache behaviors
- Use `addPropertyOverride()` for imported distribution modifications

**Critical Requirements:**

- FR1: Add ndx-static-prod as new origin to E3THG4UHYDHVWP
- FR2: Configure OAC for new origin matching existing S3Origin
- FR3: Define origin properties matching existing origins
- FR5: Preserve existing S3Origin completely unchanged
- FR6: Preserve API Gateway origin completely unchanged
- NFR-SEC-1: New S3 origin must use same OAC security model

### Project Structure Notes

**File Locations:**

- CDK stack: `/Users/cns/httpdocs/cddo/ndx/infra/lib/ndx-stack.ts` (modified from Story 1.1)
- S3 bucket: `ndx-static-prod` (already exists, deployed in Phase 1)
- OAC ID: E3P8MA1G9Y5BYE (already exists with existing S3Origin)

**Implementation Approach:**

```typescript
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as cdk from "aws-cdk-lib"

// In NdxStaticStack constructor:

// 1. Recreate distribution reference (from Story 1.1)
const distribution = cloudfront.Distribution.fromDistributionAttributes(this, "ImportedDistribution", {
  distributionId: "E3THG4UHYDHVWP",
  domainName: "d7roov8fndsis.cloudfront.net",
})

// 2. Reference existing S3 bucket
const newOriginBucket = s3.Bucket.fromBucketName(this, "NewOriginBucket", "ndx-static-prod")

// 3. Configure new origin (Note: Must use L1 constructs for imported distribution)
const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution

// Get existing origins from distribution
const existingOrigins = cfnDistribution.distributionConfig?.origins || []

// Add new origin to origins array
cfnDistribution.addPropertyOverride("DistributionConfig.Origins", [
  ...existingOrigins,
  {
    Id: "ndx-static-prod-origin",
    DomainName: "ndx-static-prod.s3.us-west-2.amazonaws.com",
    S3OriginConfig: {
      OriginAccessIdentity: "", // Empty for OAC
    },
    OriginAccessControlId: "E3P8MA1G9Y5BYE",
    ConnectionAttempts: 3,
    ConnectionTimeout: 10,
    OriginReadTimeout: 30,
    CustomHeaders: [],
  },
])
```

**Validation Commands:**

```bash
# Generate and review diff
cd infra
cdk diff --profile NDX/InnovationSandboxHub > ../diff-output.txt

# Review diff output:
# - Look for new origin with ID: ndx-static-prod-origin
# - Verify OAC ID: E3P8MA1G9Y5BYE
# - Confirm existing origins unchanged
# - Confirm no cache behavior changes
```

**Critical Validation:**

- Must verify existing S3Origin unchanged (bucket name, OAC ID, all timeouts)
- Must verify API Gateway origin unchanged (domain, path, all settings)
- No cache behavior modifications at this stage (Epic 2 Story 2.5)
- This story ONLY adds origin - no routing logic yet

### References

**Technical Specification:**

- [Source: docs/sprint-artifacts/tech-spec-epic-1.md#Story-1.2]
- Implementation details: Lines 78-109
- Origin configuration requirements
- OAC reuse rationale (ADR-002)

**Architecture:**

- [Source: docs/architecture.md#Origin-Configuration]
- Lines 186-196: Origin configuration details
- [Source: docs/architecture.md#ADR-002]
- Lines 638-657: OAC reuse decision

**PRD Requirements:**

- [Source: docs/prd.md#Infrastructure-Specific-Requirements]
- Lines 179-196: New origin configuration
- Lines 169-178: Existing origins (must preserve)
- FR1-FR3, FR5-FR6: Functional requirements covered

**Epic Context:**

- [Source: docs/epics.md#Story-1.2]
- Lines 150-198
- Prerequisites: Story 1.1 complete
- Acceptance criteria: Lines 156-186

**Previous Story Insights:**

- [Source: stories/1-1-import-existing-cloudfront-distribution-in-cdk.md]
- Import pattern successfully used
- Distribution reference approach
- ESLint compliance patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

None

### Completion Notes List

**BLOCKER IDENTIFIED - Story Cannot Be Completed As Written**

**Issue:**
Story 1.2 cannot be completed because `Distribution.fromDistributionAttributes()` creates a READ-ONLY reference that cannot be modified. To add a new origin to an existing CloudFront distribution, the distribution must first be imported into CloudFormation management using `cdk import`.

**Root Cause:**

- Story 1.1 used `fromDistributionAttributes()` which creates a reference without CloudFormation management
- Referenced distributions cannot be modified - attempting to access `.node.defaultChild` returns undefined
- To modify the distribution, it must be under CloudFormation management

**Attempted Approaches:**

1. Using `addPropertyOverride()` on imported distribution - FAILED (no CFN resource exists)
2. Using `S3Origin` constructor with imported distribution - FAILED (same reason)
3. Direct CFN property manipulation - FAILED (distributionConfig is undefined)

**Required Solution:**
The CloudFront distribution E3THG4UHYDHVWP must be imported into CloudFormation management before it can be modified. This requires:

1. Create L1 `CfnDistribution` resource in CDK stack with ALL current configuration
2. Run `cdk import` to bring existing distribution under CloudFormation management
3. Then modifications (adding origins) become possible

**Impact:**

- Story 1.2 is BLOCKED until distribution is under CloudFormation management
- Story 1.1 needs to be revised OR a new story created to handle `cdk import` operation
- Stories 1.3 and 1.4 are also blocked

**Recommendation:**
Create a new Story 1.1.5 "Import CloudFront Distribution into CloudFormation Management" that uses `cdk import` to bring the distribution under management, then Story 1.2 can proceed with adding the new origin.

### File List

**Modified:**

- `/Users/cns/httpdocs/cddo/ndx/infra/lib/ndx-stack.ts` - Reverted to Story 1.1 state (reference only)
- `/Users/cns/httpdocs/cddo/ndx/infra/lib/ndx-stack.test.ts` - Added test for stack compilation

**Tests:** All passing (4/4)
**Build:** Success
**Deployment:** Not attempted due to blocker

## Change Log

- 2025-11-20: Story created from epics.md via create-story workflow
- 2025-11-20: BLOCKER identified - cannot modify imported distribution without CloudFormation management
