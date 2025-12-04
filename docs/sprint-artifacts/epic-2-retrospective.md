# Epic 2 Retrospective: Cookie-Based Routing Implementation

**Epic:** Epic 2 - Cookie-Based Routing Implementation
**Date:** 2025-11-21
**Status:** Completed
**Stories Completed:** 6/6 (2.1, 2.2, 2.3, 2.4, 2.5, 2.6)
**Framework:** Mad/Sad/Glad

---

## Executive Summary

Epic 2 successfully implemented cookie-based routing functionality for the NDX project, enabling testers with the `NDX=true` cookie to access the new UI from the `ndx-static-prod` S3 bucket. While all 6 stories were completed, we encountered critical bugs during Story 2.6 validation that revealed gaps in our AWS API research process. Post-epic, we discovered and integrated the AWS Knowledge MCP server, which would have prevented these issues entirely.

**Key Metrics:**

- 6 stories completed in ~1 day
- 2 critical bugs discovered and fixed
- 14 unit tests created with 100% statement coverage
- 7/7 final validation tests passing
- 1 major tooling improvement (AWS Knowledge MCP server integration)

---

## Mad (Frustrations)

### 1. Critical Bugs Discovered During Validation

**Story 2.6** was initially marked "done" and APPROVED by code review, but routing was completely non-functional.

**Bug #1: Incorrect CloudFront Functions JavaScript API**

- Used JavaScript 1.0 API syntax: `request.origin = {...}`
- Included invalid fields: `authMethod` and `originAccessControlId`
- These fields don't exist in CloudFront Functions runtime
- **Root Cause:** Insufficient AWS API research before implementation

**Bug #2: Missing S3 Bucket Policy**

- The `ndx-static-prod` bucket had NO bucket policy
- CloudFront couldn't access the bucket even with correct function code
- Required explicit policy granting CloudFront service principal access
- **Root Cause:** Incomplete understanding of OAC requirements for dynamic origins

### 2. Cache Invalidation Not Planned

- Cache invalidation was required after fixing the bugs
- This critical step was not included in the story acceptance criteria
- Led to false-negative validation results
- Should be standard practice for CloudFront routing changes

---

## Sad (Disappointments)

### 1. Manual Configuration Initially Planned

Stories 2.3 and 2.5 initially planned manual AWS Console steps:

- Story 2.3: Manual cache policy creation via Console
- Story 2.5: Manual function attachment via Console

**Impact:** Would have created deployment inconsistency and manual toil

**Resolution:** Extended Custom Resource Lambda to automate both operations

### 2. False Story Completion

Story 2.6 was incorrectly marked complete:

- Initial validation only checked HTTP 200 status
- Didn't verify different content was served (ETag comparison)
- Code review approved based on incomplete validation
- Had to revert from "done" back to "in-progress"

**Lesson:** Validation must verify actual behavior change, not just successful execution

---

## Glad (Successes)

### 1. Custom Resource Lambda Pattern Success

Extended the Custom Resource Lambda to handle:

- Cache policy creation with NDX cookie allowlist (Story 2.3)
- CloudFront Function attachment to default cache behavior (Story 2.5)
- Eliminated manual Console steps
- Created repeatable, automated deployment process

**Impact:** Stories 2.3 and 2.5 became fully automated instead of manual

### 2. Comprehensive Test Coverage

Story 2.2 created 14 unit tests with excellent coverage:

- 100% statement coverage
- 91.66% branch coverage
- All edge cases validated
- Tests caught no errors (function logic was sound)

**Note:** Unit tests validated function logic but couldn't catch AWS API usage errors

### 3. Fail-Open Design Philosophy

The cookie router was designed with graceful degradation:

- Errors fall back to default origin
- Malformed cookies handled safely
- No disruption to users without NDX cookie
- Robust error handling throughout

### 4. User Caught Critical Issues

The user personally validated routing with curl commands:

- Discovered routing wasn't working despite "done" status
- Tested with and without NDX cookie
- Required cache invalidation and verified with ETag comparison
- Excellent hands-on validation prevented production issues

### 5. Excellent Documentation Trail

All bugs, fixes, and learnings were thoroughly documented in Story 2.6:

- Bug descriptions with exact code comparisons
- Step-by-step debugging process
- AWS CLI commands for validation
- Cache invalidation procedures

**Impact:** Creates valuable reference for future CloudFront work

### 6. AWS Knowledge MCP Server Discovery (Post-Epic)

After completing Epic 2, we researched and integrated the **AWS Knowledge MCP server**:

- Fully-managed remote MCP server hosted by AWS
- Provides access to latest AWS docs, API references, code examples
- URL: `https://knowledge-mcp.global.api.aws`
- No authentication required, no AWS account needed

**Validation Test:** We queried the MCP server with our exact Story 2.6 scenario:

- Search query: "CloudFront Functions JavaScript API dynamic S3 origin Origin Access Control"
- **Result:** Found the exact correct documentation in the first result
- Provided complete working code example showing `cf.updateRequestOrigin()` with proper `originAccessControlConfig`
- Would have completely prevented both Bug #1 and Bug #2

**Time Impact:**

- Without MCP: ~2-3 hours debugging and fixing
- With MCP: ~5 minutes to implement correctly first time

**This is a major win for Epic 3 and all future AWS development work.**

---

## Key Learnings

### 1. Research AWS APIs Thoroughly Before Implementation

**Problem:** Used outdated/incorrect CloudFront Functions API syntax without consulting latest documentation

**Solution:**

- Query AWS Knowledge MCP server before implementing AWS API code
- Review official AWS code examples, not just reference docs
- Verify API compatibility with specific runtime versions (e.g., JavaScript 2.0)

**MCP Integration:** Standard practice for all AWS API work going forward

### 2. Dynamic Origins Require Explicit S3 Bucket Policies

**Problem:** OAC works automatically for pre-configured origins, but dynamic origins created by CloudFront Functions need explicit bucket policies

**Learning:**

- Dynamic origins can't inherit bucket policies from distribution config
- Must explicitly grant CloudFront service principal access
- Scope policy to specific distribution ARN for security
- Document this pattern for future dynamic origin implementations

### 3. Cache Invalidation is Critical After Routing Changes

**Problem:** Fixed bugs weren't visible due to cached responses

**Solution:**

- Include cache invalidation in acceptance criteria for routing changes
- Document cache invalidation commands in deployment procedures
- Consider automated cache invalidation in CDK deployment scripts

### 4. Validation Must Verify Different Content

**Problem:** Initial validation only checked HTTP 200, didn't verify routing worked

**Solution:**

- Compare ETags between default and routed responses
- Verify actual content differences, not just successful responses
- Include negative tests (without cookie) and positive tests (with cookie)
- Document expected ETag values or content markers

### 5. Custom Resources Are Powerful Automation Tools

**Success:** Extended Custom Resource Lambda to eliminate 2 manual Console operations

**Learning:**

- Custom Resources can automate complex AWS Console workflows
- More maintainable than manual procedures
- Enables full IaC coverage for externally-managed resources
- Worth the investment even for one-time configuration changes

---

## Action Items for Epic 3

### 1. Integrate AWS Knowledge MCP Server into Workflow

- [x] Install AWS Knowledge MCP server configuration (COMPLETED)
- [ ] Add MCP query step to story template for AWS API work
- [ ] Document MCP usage patterns in project README
- [ ] Train team on querying MCP server effectively

**Acceptance Criteria for AWS API Stories:**

- [ ] Query AWS Knowledge MCP server for API documentation before implementation
- [ ] Review AWS code examples from MCP search results
- [ ] Validate implementation matches current API specifications

### 2. Enhance Validation Procedures

- [ ] Create validation checklist template
- [ ] Include cache invalidation procedures
- [ ] Document ETag comparison techniques
- [ ] Require verification of actual behavior change, not just successful execution

### 3. Document Bucket Policy Pattern

- [ ] Create reference documentation for dynamic origin S3 bucket policies
- [ ] Include CloudFront service principal policy template
- [ ] Document when bucket policies are required vs. inherited from OAC

### 4. Cache Management Strategy

- [ ] Document when cache invalidation is required
- [ ] Explore automated cache invalidation in CDK deployment
- [ ] Add cache invalidation commands to deployment runbook

### 5. Code Review Enhancement

- [ ] Update code review checklist to verify AWS API research was performed
- [ ] Require validation evidence (screenshots, curl output, ETag comparisons)
- [ ] Don't approve stories based solely on test passage

---

## Metrics Summary

| Metric                  | Value       | Notes                             |
| ----------------------- | ----------- | --------------------------------- |
| Stories Completed       | 6/6         | All Epic 2 stories done           |
| Bugs Found              | 2 critical  | Both in Story 2.6 validation      |
| Bugs Fixed              | 2/2         | CloudFront API + S3 bucket policy |
| Unit Tests              | 14          | 100% statement coverage           |
| Test Pass Rate          | 100%        | All tests passing after fixes     |
| Validation Tests        | 7/7 passing | Final validation successful       |
| Manual Steps Eliminated | 2           | Stories 2.3 and 2.5 automated     |
| Time to Fix Bugs        | ~2-3 hours  | Could have been ~5 min with MCP   |
| Tooling Improvements    | 1           | AWS Knowledge MCP server          |

---

## Recommendations for Epic 3

**Epic 3: Testing, Validation & Operational Readiness**

Based on Epic 2 learnings, Epic 3 should include:

1. **Comprehensive End-to-End Testing**
   - Test with real CloudFront distribution (not just unit tests)
   - Verify routing with actual users/browsers
   - Include cache behavior validation

2. **Operational Runbooks**
   - Deployment procedures with cache invalidation
   - Rollback procedures
   - Monitoring and alerting setup

3. **Documentation**
   - Architecture decisions (using MCP server for AWS research)
   - Troubleshooting guides (S3 bucket policies, cache invalidation)
   - API patterns reference (CloudFront Functions JavaScript 2.0)

4. **Monitoring & Observability**
   - CloudFront Function logs
   - Origin request metrics
   - Error rate tracking

5. **Production Readiness Checklist**
   - Security review (OAC configuration, bucket policies)
   - Performance testing (function execution time)
   - Disaster recovery procedures

---

## Conclusion

Epic 2 was ultimately successful, delivering fully functional cookie-based routing with comprehensive test coverage and automated deployment. The critical bugs discovered during validation, while frustrating, led to important learnings about AWS API research and validation practices.

**The discovery and integration of the AWS Knowledge MCP server is a game-changer** that would have prevented the entire debugging cycle in Story 2.6. This tooling improvement alone justifies the retrospective and will pay dividends throughout Epic 3 and all future AWS development.

The team demonstrated resilience in debugging complex CloudFront issues, excellent documentation practices, and the wisdom to invest in better tooling (MCP server) to prevent future issues.

**Epic 2 Status:** ✅ **COMPLETE** - Ready to proceed to Epic 3 with improved tooling and processes.
