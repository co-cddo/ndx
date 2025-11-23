# Epic 1: CloudFront Origin Infrastructure

**Goal:** Add `ndx-static-prod` S3 bucket as a new origin to existing CloudFront distribution E3THG4UHYDHVWP with proper security configuration, enabling future cookie-based routing while preserving all existing origins and functionality.

**User Value:** New S3 origin exists in CloudFront distribution and is ready to serve content to testers, with zero impact on production users or existing API functionality.

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR25, FR26, FR27, FR28, FR29, FR30

---

## Story 1.1: Import Existing CloudFront Distribution in CDK

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

## Story 1.2: Add New S3 Origin with Origin Access Control

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

## Story 1.3: Verify Existing Origins Remain Unchanged

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

## Story 1.4: Deploy CloudFront Infrastructure Changes to AWS

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
