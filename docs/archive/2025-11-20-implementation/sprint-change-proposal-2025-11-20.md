# Sprint Change Proposal - Epic 1 Course Correction

**Date:** 2025-11-20
**Author:** cns
**Scope:** Minor - Direct implementation by dev team
**Status:** APPROVED

---

## Section 1: Issue Summary

**Problem Statement:**

Epic 1 (CloudFront Origin Infrastructure) stories 1.1-1.4 were written assuming CDK could import and modify existing CloudFront distribution E3THG4UHYDHVWP via L2 constructs using `Distribution.fromDistributionAttributes()`. This approach failed during implementation because imported distributions are read-only references that cannot be modified.

The solution was successfully implemented in Story 1.2 using a Custom Resource Lambda pattern that adds origins via CloudFront API directly. However, the codebase was later polluted with L2 Distribution construct attempts that conflict with the Custom Resource approach, causing deployment failures.

**Discovery Context:**

- Story 1.2: Successfully implemented Custom Resource Lambda to add `ndx-static-prod-origin` to distribution E3THG4UHYDHVWP
- Story 1.3: Validated all origins present and correctly configured
- Story 1.4: Deployment attempt failed/created wrong distribution due to L2 construct conflicts in stack
- Background deployments show errors: "Cannot use both Origin Access Control and Origin Access Identity"

**Evidence:**

1. Distribution E3THG4UHYDHVWP has 3 origins (verified via AWS CLI in Story 1.3)
2. Custom Resource Lambda successfully executed (Story 1.2 completion notes)
3. Background deployment logs show L2 construct attempting to create NEW distribution
4. Current `ndx-stack.ts` contains conflicting CloudFront L2 Distribution constructs

---

## Section 2: Impact Analysis

### Epic Impact

**Epic 1 (CloudFront Origin Infrastructure):**
- **Objective:** Add `ndx-static-prod` origin to distribution E3THG4UHYDHVWP ✅ ACHIEVED
- **Stories 1.1-1.3:** DONE - Implementation successful via Custom Resource Lambda
- **Story 1.4:** BLOCKED - References deployment approach that conflicts with Custom Resource pattern
- **Resolution:** Mark Epic 1 COMPLETE (goal met), close Story 1.4 as complete with validation-only scope

**Epic 2 (Cookie-Based Routing Implementation):**
- **Impact:** NONE - Can proceed as planned
- **Prerequisite:** Epic 1 complete ✅

**Epic 3 (Testing, Validation & Operational Readiness):**
- **Impact:** MINOR - Tests need to validate Custom Resource Lambda approach instead of L2 construct approach
- **Action:** Update test strategy to verify Custom Resource behavior

### Story Impact

**Current Stories:**
- **Story 1.1:** DONE - Correctly documents read-only import approach
- **Story 1.2:** DONE - Custom Resource Lambda implementation (CORRECT approach)
- **Story 1.3:** DONE - Validation confirms Custom Resource success
- **Story 1.4:** BLOCKED - Needs resolution (see recommendations)

**Future Stories:**
- **Epic 2 stories:** NO IMPACT - CloudFront Functions for cookie routing can proceed
- **Epic 3 stories:** MINOR - Test implementation needs Custom Resource validation approach

### Artifact Conflicts

**PRD:**
- **FR4:** "Reference existing CloudFront distribution without recreating" - Currently violated by L2 constructs in stack
- **FR25-26:** Import/modify requirements - Need clarification that Custom Resource Lambda is the approved approach
- **Resolution:** Add note to PRD clarifying Custom Resource Lambda as official pattern for externally-managed distributions

**Architecture:**
- **Conflict:** `ndx-stack.ts` contains L2 Distribution constructs attempting to create/manage CloudFront distribution
- **Resolution:** Remove L2 Distribution constructs, retain only:
  1. Read-only reference via `fromDistributionAttributes()` (for TypeScript types)
  2. Custom Resource Lambda with CloudFront API calls
  3. IAM permissions for Lambda

**Tech Spec Epic 1:**
- **Status:** ACCURATE - Already documents Custom Resource approach correctly
- **No changes needed**

**Infrastructure as Code:**
- **File:** `/Users/cns/httpdocs/cddo/ndx/infra/lib/ndx-stack.ts`
- **Issue:** Contains L2 CloudFront Distribution constructs (OriginAccessIdentity, CloudFront Functions, new Distribution resource)
- **Resolution:** Clean stack to Custom Resource Lambda-only approach

---

## Section 3: Recommended Approach

**Selected Path:** **Direct Adjustment (Option 1)**

**Rationale:**

1. **Epic 1 Goal Achieved:** Distribution E3THG4UHYDHVWP has the new origin configured correctly
2. **Working Solution:** Custom Resource Lambda approach is proven and deployed
3. **Minimal Effort:** Cleanup only - no AWS infrastructure changes needed
4. **Low Risk:** No deployment required, just code cleanup
5. **Immediate Progress:** Can proceed to Epic 2 (cookie routing) immediately
6. **Team Momentum:** Avoid rollback delays, maintain forward progress

**Effort Estimate:** LOW (1-2 hours cleanup work)

**Risk Level:** LOW (no AWS changes, code cleanup only)

**Timeline Impact:** NONE - Can proceed to Epic 2 today

---

## Section 4: Detailed Change Proposals

### Change 1: Clean up `ndx-stack.ts`

**File:** `/Users/cns/httpdocs/cddo/ndx/infra/lib/ndx-stack.ts`

**Current State:** Contains L2 Distribution constructs attempting to create new CloudFront distribution

**Proposed Changes:**

1. **Keep:** Custom Resource Lambda implementation (lines 61-111)
2. **Keep:** Read-only distribution reference (lines 49-56) - for TypeScript typing only
3. **Remove:** Any L2 CloudFront Distribution constructs (OriginAccessIdentity, Functions, S3Origin L2 constructs)
4. **Verify:** Stack only creates Custom Resource Lambda and provider, no CloudFront resources

**Expected Result:**
- `cdk synth` succeeds with no CloudFront Distribution in template
- `cdk diff` shows no changes (already deployed via Custom Resource)
- Stack is idempotent

### Change 2: Update Story 1.4 Status

**File:** `/Users/cns/httpdocs/cddo/ndx/docs/sprint-artifacts/1-4-deploy-cloudfront-infrastructure-changes-to-aws.md`

**Current Status:** in-progress (BLOCKED)

**Proposed Status:** done

**Completion Notes to Add:**

```markdown
### Completion Notes

**Epic 1 Objective ACHIEVED via Custom Resource Lambda (Story 1.2)**

Distribution E3THG4UHYDHVWP has all required origins configured:
- Existing S3Origin: Unchanged ✅
- API Gateway origin: Unchanged ✅
- ndx-static-prod-origin: Added via Custom Resource Lambda ✅

**Story 1.4 Resolution:**

This story was originally scoped as a deployment validation story expecting CDK deployment of L2 CloudFront constructs. However, the Custom Resource Lambda approach (implemented in Story 1.2) already deployed the new origin via CloudFront API.

**No additional deployment needed** - The infrastructure changes were already applied in Story 1.2 when the Custom Resource Lambda executed during that story's deployment.

**Validation Completed in Story 1.3:**
- All origins verified present and correctly configured
- Distribution status: Deployed
- Stack idempotency confirmed

**Codebase Cleanup:**
- Removed conflicting L2 Distribution constructs from `ndx-stack.ts`
- Retained Custom Resource Lambda as official approach for externally-managed distributions

**Epic 1 Status:** COMPLETE - Ready to proceed to Epic 2 (Cookie-Based Routing)
```

### Change 3: Update Sprint Status - Mark Epic 1 Complete

**File:** `/Users/cns/httpdocs/cddo/ndx/docs/sprint-artifacts/sprint-status.yaml`

**Current:**
```yaml
development_status:
  epic-1: contexted
  1-4-deploy-cloudfront-infrastructure-changes-to-aws: in-progress
```

**Proposed:**
```yaml
development_status:
  epic-1: done
  1-4-deploy-cloudfront-infrastructure-changes-to-aws: done
```

### Change 4: Update PRD - Document Custom Resource Pattern

**File:** `/Users/cns/httpdocs/cddo/ndx/docs/prd.md`

**Section:** Infrastructure-Specific Requirements (around FR25-26)

**Addition:**

```markdown
**Implementation Note - CloudFront Distribution Management:**

For externally-managed CloudFront distributions (e.g., deployed by AWS Solutions templates like Innovation Sandbox), the approved pattern is:

1. Use `Distribution.fromDistributionAttributes()` for read-only reference (TypeScript typing)
2. Use Custom Resource Lambda with CloudFront SDK API calls for modifications
3. Lambda handles idempotency by checking existing configuration before making changes

This pattern avoids CloudFormation import complexities and conflicts with external management tools.

**Reference:** Stories 1.2 (implementation) and 1.3 (validation) demonstrate this pattern.
```

---

## Section 5: Implementation Handoff

**Change Scope Classification:** MINOR

**Handoff Recipient:** Development team (direct implementation)

**Implementation Tasks:**

1. **Code Cleanup** (Dev Agent):
   - Clean `infra/lib/ndx-stack.ts` to remove L2 Distribution constructs
   - Verify Custom Resource Lambda implementation remains intact
   - Run `cdk synth` to verify template correctness
   - Run `cdk diff` to confirm no infrastructure changes

2. **Documentation Updates** (Dev Agent):
   - Update Story 1.4 with completion notes (per Change 2)
   - Update sprint-status.yaml (per Change 3)
   - Add implementation note to PRD (per Change 4)
   - Mark Story 1.4 status: done
   - Mark Epic 1 status: done

3. **Validation** (Dev Agent):
   - Verify distribution E3THG4UHYDHVWP still has 3 origins (no regression)
   - Confirm CDK stack clean (no CloudFront L2 constructs)
   - Verify Epic 1 marked complete in sprint status

4. **Epic 2 Readiness** (SM Agent):
   - Confirm Epic 1 retrospective (optional)
   - Begin Epic 2 story creation for cookie-based routing
   - Epic 2 has no blockers - can proceed immediately

**Success Criteria:**

✅ `ndx-stack.ts` contains only Custom Resource Lambda implementation
✅ No L2 CloudFront Distribution constructs in stack
✅ Story 1.4 marked done with appropriate completion notes
✅ Epic 1 marked done in sprint status
✅ PRD updated with Custom Resource pattern documentation
✅ Distribution E3THG4UHYDHVWP unchanged (3 origins remain)
✅ Epic 2 ready to begin

**Timeline:** Immediate implementation (< 1 hour)

**Risk Mitigation:**
- No AWS infrastructure changes - zero deployment risk
- Code cleanup only - easily reversible via git
- Distribution already in correct state - no regression possible

---

## Approval

**Recommended Path:** Direct Adjustment (Option 1)

**User Approval:** ✅ APPROVED (2025-11-20)

**Next Steps:**
1. Execute implementation tasks (4 changes listed above)
2. Validate success criteria
3. Proceed to Epic 2: Cookie-Based Routing Implementation

---

**Change Navigation Status:** ✅ COMPLETE - Ready for implementation
