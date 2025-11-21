# Epic Technical Specification: CloudFront Origin Infrastructure

**Date:** 2025-11-20  
**Author:** cns  
**Epic ID:** 1  
**Phase:** 2 - CloudFront Cookie-Based Origin Routing  
**Status:** Ready for Implementation

---

## Overview

This epic adds the `ndx-static-prod` S3 bucket as a third origin to the existing CloudFront distribution E3THG4UHYDHVWP. This establishes the foundation for cookie-based routing (Epic 2) by making the new origin available in CloudFront, while preserving all existing production functionality with zero risk.

**What This Epic Delivers:**
- CloudFront distribution with 3 origins (existing 2 + new ndx-static-prod)
- New origin configured with identical security (OAC E3P8MA1G9Y5BYE)
- Existing S3Origin and API Gateway origins completely unchanged
- Zero downtime deployment via CDK

**What This Epic Does NOT Include:**
- Cookie-based routing logic (Epic 2)
- CloudFront Functions (Epic 2)
- Testing infrastructure (Epic 3)
- Any traffic actually routed to new origin (routing added in Epic 2)

---

## Technical Context

### CloudFront Distribution
- **ID:** E3THG4UHYDHVWP
- **Domain:** d7roov8fndsis.cloudfront.net
- **Current Origins:** 2 (S3Origin + API Gateway)
- **Target Origins:** 3 (adds ndx-static-prod-origin)

### Security Model (Architecture ADR-002)
- **OAC ID:** E3P8MA1G9Y5BYE (reuse from existing S3Origin)
- **Rationale:** Consistent security, no new IAM policies needed

### Origin Configuration (PRD Infrastructure Section)
All origins must have matching settings:
- Connection attempts: 3
- Connection timeout: 10 seconds  
- Read timeout: 30 seconds
- Protocol: HTTPS only

---

## Story Implementation Guide

### Story 1.1: Import CloudFront Distribution in CDK

**File:** `infra/lib/ndx-stack.ts`

**Implementation:**
```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';

// In NdxStaticStack constructor:
const distribution = cloudfront.Distribution.fromDistributionAttributes(
  this,
  'ImportedDistribution',
  {
    distributionId: 'E3THG4UHYDHVWP',
    domainName: 'd7roov8fndsis.cloudfront.net'
  }
);
```

**Validation:**
- Run `cdk synth` - must succeed
- CloudFormation template must NOT include new distribution resource
- TypeScript compiles with no errors

---

### Story 1.2: Add New S3 Origin with OAC

**File:** `infra/lib/ndx-stack.ts`

**Implementation:**
```typescript
import * as s3 from 'aws-cdk-lib/aws-cdk-lib/aws-s3';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cdk from 'aws-cdk-lib';

// Reference existing bucket
const newOriginBucket = s3.Bucket.fromBucketName(
  this,
  'NewOriginBucket',
  'ndx-static-prod'
);

// Configure new origin with OAC and timeouts
const newOrigin = new origins.S3Origin(newOriginBucket, {
  originId: 'ndx-static-prod-origin',
  originAccessControlId: 'E3P8MA1G9Y5BYE',
  connectionAttempts: 3,
  connectionTimeout: cdk.Duration.seconds(10),
  readTimeout: cdk.Duration.seconds(30)
});
```

**Validation:**
- Run `cdk diff` - shows new origin being added
- Diff shows OAC ID: E3P8MA1G9Y5BYE
- No changes to existing origins

---

### Story 1.3: Verify Existing Origins Unchanged

**This is a VALIDATION story - no code changes**

**Steps:**
1. Run `cdk diff --profile NDX/InnovationSandboxHub`
2. Review diff output carefully
3. Verify S3Origin unchanged:
   - Bucket name identical
   - OAC ID unchanged (E3P8MA1G9Y5BYE)
   - All timeout settings identical
4. Verify API Gateway origin unchanged:
   - Domain: 1ewlxhaey6.execute-api.us-west-2.amazonaws.com
   - Path: /prod
   - All settings identical
5. Confirm NO cache behavior changes
6. Document diff output for approval

**Validation:**
- Diff shows only ONE new resource (ndx-static-prod-origin)
- Zero modifications to existing resources
- Team approval obtained before Story 1.4

---

### Story 1.4: Deploy CloudFront Changes to AWS

**Pre-Deployment:**
```bash
cd infra
yarn test  # All tests must pass
yarn lint  # Zero ESLint errors
cdk diff --profile NDX/InnovationSandboxHub  # Review changes one final time
```

**Deployment:**
```bash
cdk deploy --profile NDX/InnovationSandboxHub
```

**Post-Deployment Verification:**
```bash
# 1. Verify distribution status
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.Status' \
  --output text
# Expected: "Deployed"

# 2. Verify origins count
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.DistributionConfig.Origins[*].Id' \
  --output json
# Expected: 3 origins including "ndx-static-prod-origin"

# 3. Verify new origin configuration
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.DistributionConfig.Origins[?Id==`ndx-static-prod-origin`]' \
  --output json
# Verify OAC ID and timeout settings

# 4. Test production site
curl -I https://d7roov8fndsis.cloudfront.net/
# Should return 200, site accessible

# 5. Verify idempotency
cdk diff --profile NDX/InnovationSandboxHub
# Should show "no changes"
```

**Wait Time:** 10-15 minutes for global CloudFront propagation

---

## Acceptance Criteria Summary

### Story 1.1
✓ CloudFront distribution imported via `fromDistributionAttributes()`  
✓ `cdk synth` succeeds  
✓ No new distribution resource in CloudFormation  
✓ TypeScript compiles with zero errors

### Story 1.2
✓ S3 bucket `ndx-static-prod` referenced  
✓ Origin ID: `ndx-static-prod-origin`  
✓ OAC ID: `E3P8MA1G9Y5BYE`  
✓ Connection attempts: 3  
✓ Connection timeout: 10s  
✓ Read timeout: 30s  
✓ `cdk diff` shows origin addition  
✓ No changes to existing origins

### Story 1.3
✓ S3Origin unchanged (verified via diff)  
✓ API Gateway origin unchanged (verified via diff)  
✓ No cache behavior changes  
✓ Diff documented and approved

### Story 1.4
✓ `cdk deploy` succeeds (CloudFormation UPDATE_COMPLETE)  
✓ Distribution status: "Deployed"  
✓ 3 origins present  
✓ New origin verified via AWS CLI  
✓ Production site accessible  
✓ API endpoints functional  
✓ `cdk diff` shows no changes (idempotent)

---

## Non-Functional Requirements

**NFR-PERF-6:** CloudFront propagation < 15 minutes (AWS-controlled)  
**NFR-SEC-1:** New origin uses same OAC as existing S3Origin  
**NFR-REL-1:** Zero downtime during deployment  
**NFR-REL-2:** Automatic CloudFormation rollback on failure  
**NFR-MAINT-1:** ESLint zero errors before deployment

---

## Risks & Mitigations

**Risk 1: Incorrect Distribution ID or OAC ID**
- **Impact:** HIGH - Deployment fails or wrong resources modified
- **Mitigation:** IDs documented in PRD, verify in AWS Console before coding
- **Fallback:** CloudFormation rollback

**Risk 2: Existing origins accidentally modified**
- **Impact:** CRITICAL - Production site or API breaks
- **Mitigation:** Mandatory diff review (Story 1.3)
- **Fallback:** Rollback via CloudFormation or git revert

**Risk 3: CloudFront propagation delay**
- **Impact:** MEDIUM - Delays Epic 2 work
- **Mitigation:** Wait for "Deployed" status before proceeding
- **Expected:** 10-15 minutes typical

---

## Dependencies

**Required Before Epic 1:**
- ✓ S3 bucket `ndx-static-prod` exists (deployed in Phase 1)
- ✓ OAC E3P8MA1G9Y5BYE exists (with existing S3Origin)
- ✓ AWS profile `NDX/InnovationSandboxHub` configured
- ✓ CDK project initialized (Phase 1 completed)

**Required After Epic 1:**
- Epic 2 will add CloudFront Function and configure cache behaviors
- Epic 3 will add testing infrastructure

---

## Testing (Epic 3)

Epic 1 delivers infrastructure. Testing added in Epic 3:
- CDK snapshot tests
- Fine-grained assertions (OAC, origin properties)
- Integration tests (real AWS deployment validation)

**Manual testing in Epic 1:**
- Story 1.3: Diff review
- Story 1.4: AWS CLI verification queries

---

## Next Steps After Epic 1 Completion

1. Update `sprint-status.yaml`: Mark `epic-1: contexted`
2. Begin Epic 2: Cookie-Based Routing Implementation
3. Epic 2 will add CloudFront Function to route based on NDX cookie
4. Epic 2 will configure cache behavior with function attachment

---

**Tech Spec Status:** ✅ COMPLETE - Ready for story implementation

This tech spec provides all technical details needed to implement Stories 1.1-1.4 autonomously.
