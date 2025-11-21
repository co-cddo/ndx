# NDX CloudFront Origin Routing - Product Requirements Document

**Author:** cns
**Date:** 2025-11-20
**Version:** 1.0

---

## Executive Summary

The National Digital Exchange (NDX) requires a safe deployment mechanism to test UI changes before rolling them out to all government users. This PRD defines requirements for implementing cookie-based origin routing in the existing CloudFront distribution, enabling the strangler pattern for gradual UI migration.

**Current State:** NDX production site served via CloudFront distribution E3THG4UHYDHVWP from existing S3 bucket, with API Gateway backend for dynamic functionality.

**Challenge:** Need to test new UI versions with select internal testers without impacting production users or risking breaking changes to the existing site.

**Solution:** Add the new CDK-managed S3 bucket (`ndx-static-prod`) as a third origin to the CloudFront distribution, with cookie-based routing logic that directs testers with `NDX=true` cookie to the new origin while all other users continue seeing the existing site.

### What Makes This Special

This is a **surgical, zero-risk infrastructure enhancement** that enables safe UI evolution for a critical UK government service handling £2B in procurement decisions. Rather than deploying changes directly to production or creating separate testing URLs, this approach:

- **Preserves production stability** - All existing users unaffected, no behavior changes without explicit opt-in
- **Enables strangler pattern** - Foundation for gradually migrating UI without big-bang cutover
- **Zero operational overhead** - Testers self-manage cookies in browser, no admin interface needed
- **Instant rollback** - Remove origin or disable routing to revert in seconds
- **Protects existing API** - API Gateway origin completely untouched, no risk to backend functionality

The differentiator is taking a **methodical, low-risk approach** to UI evolution, ensuring the critical government procurement platform can evolve safely.

---

## Project Classification

**Technical Type:** Infrastructure / CDN Configuration Enhancement
**Domain:** GovTech (UK Government Digital Service)
**Complexity:** Medium

This is a **focused infrastructure enhancement** to an existing CloudFront distribution. The change is surgical and contained: adding a new origin and implementing cookie-based routing logic. No application code changes, no API changes, no user-facing functionality changes for production users.

**Why Infrastructure Project:**
- Modifies AWS CloudFront distribution configuration
- Adds S3 origin with Origin Access Control
- Implements routing logic via Lambda@Edge or CloudFront Functions
- Pure deployment infrastructure concern

**Domain Context:** As a UK government service, NDX infrastructure changes must:
- Maintain zero downtime (government users cannot experience service interruption)
- Preserve existing functionality completely (no regressions tolerated for live service)
- Be auditable and reversible (public sector accountability)
- Follow GDS standards for service reliability

**Complexity Assessment: Medium**
- **Not High:** Single CloudFront distribution change, well-understood AWS pattern, small tester group
- **Not Low:** Production government service, requires precise configuration, zero-downtime requirement

---

## Success Criteria

**Primary Success Metric:** Testers can access new UI version via cookie while all production users remain completely unaffected.

**Specific Success Indicators:**

1. **Cookie Routing Works:** Tester sets `NDX=true` cookie in browser → sees content from `ndx-static-prod` S3 bucket
2. **Default Behavior Preserved:** Users without cookie → see existing site from original S3 origin, zero changes to their experience
3. **Zero Downtime:** CloudFront configuration deployment causes no service interruption
4. **API Untouched:** API Gateway origin remains completely unchanged, all backend functionality works identically
5. **Instant Rollback:** Can disable routing or remove new origin in under 5 minutes if issues discovered

**What Winning Looks Like:**
- Small group of internal CDDO testers can self-manage cookie to opt into new UI
- Production users experience absolutely zero changes (no performance impact, no behavior changes)
- Team has confidence to deploy UI changes to new bucket knowing only cookied users will see them
- Foundation established for future strangler pattern UI migration phases
- Can validate new UI with real users before committing to full rollout

---

## Product Scope

### MVP - Minimum Viable Product

**CloudFront Configuration:**
1. **Add New Origin:** Add `ndx-static-prod` S3 bucket as third origin to CloudFront distribution E3THG4UHYDHVWP
2. **Origin Access Control:** Configure OAC for new origin to match security of existing S3Origin
3. **Cookie-Based Routing:** Implement Lambda@Edge or CloudFront Function to inspect `NDX` cookie and route accordingly
4. **Routing Logic:** If cookie `NDX=true` → route to `ndx-static-prod`, else → route to existing S3Origin
5. **Preserve API Routes:** Ensure API Gateway origin routes remain completely untouched

**CDK Implementation:**
6. **CDK Code for CloudFront:** Define CloudFront configuration changes in CDK (infra/)
7. **Origin Configuration:** Define new S3 origin with appropriate settings (OAC, connection timeouts, protocol)
8. **Routing Function Code:** Lambda@Edge or CloudFront Function code for cookie inspection
9. **Validation:** CDK tests for CloudFront configuration changes

**Deployment & Validation:**
10. **Zero-Downtime Deployment:** Deploy CloudFront changes without service interruption
11. **Smoke Test:** Validate cookie routing works (set cookie, verify origin switch)
12. **Rollback Plan:** Document steps to disable routing or remove origin if issues arise

### Growth Features (Post-MVP)

**Enhanced Routing:**
1. **Multiple Cookie Values:** Support different cookie values for different test versions (e.g., `NDX=beta`, `NDX=canary`)
2. **Percentage Rollout:** Route X% of traffic to new origin regardless of cookie (gradual rollout)
3. **Header-Based Routing:** Additional routing based on custom headers for automated testing
4. **User-Agent Routing:** Route based on browser/device for targeted testing

**Observability:**
5. **Routing Metrics:** CloudWatch metrics showing traffic split between origins
6. **Origin Performance Comparison:** Compare response times between old and new origins
7. **Error Rate Monitoring:** Alert if new origin has higher error rates than existing
8. **Real User Monitoring:** Track which users are seeing which origin

**Automation:**
9. **Cookie Management UI:** Simple web page to set/unset the NDX cookie (eliminates manual browser console)
10. **Admin Dashboard:** View current routing configuration and traffic distribution
11. **Automated Testing:** Integration tests that verify routing logic

### Vision (Future)

**Complete Strangler Pattern:**
1. **Gradual Migration:** Progressively roll out new UI to 10%, 25%, 50%, 75%, 100% of users
2. **A/B Testing Framework:** Use routing infrastructure for A/B testing different UI approaches
3. **Feature Flags:** Route based on user feature flags for gradual feature rollouts
4. **New UI Default:** Eventually make new origin the default, old origin becomes fallback

**Advanced Capabilities:**
5. **Multi-Variant Testing:** Support 3+ UI versions simultaneously for testing
6. **Geographic Routing:** Different UIs for different regions/departments
7. **Personalized Routing:** Route based on user preferences or department policies
8. **Automated Rollback:** Automatically switch back to old origin if error thresholds exceeded

---

## Domain-Specific Requirements (GovTech)

**Minimal Government Requirements for CloudFront Routing:**

This infrastructure change has minimal government-specific requirements since it's purely a deployment mechanism change with no functional impact on users:

1. **Zero Service Disruption:** Government users cannot experience any downtime or service degradation during deployment (critical requirement)
2. **Auditability:** CloudFormation stack changes must be visible and reviewable before deployment (satisfied via CDK diff)
3. **Reversibility:** Must be able to rollback routing changes quickly if issues arise (instant via CloudFront configuration change)
4. **No Breaking Changes:** Existing site functionality must remain 100% intact for all users without opt-in cookie

**GovTech-Specific Constraints:**
- **No User Data Handling:** This is infrastructure routing only, no user data or PII involved
- **No Compliance Changes:** Routing mechanism doesn't affect WCAG accessibility, GDS standards, or security posture
- **Public Sector Transparency:** Infrastructure-as-code in public repository maintains open government principles

**Why Minimal Requirements:** This change is transparent to end users (unless they explicitly opt in via cookie), doesn't touch authentication/authorization, doesn't handle sensitive data, and doesn't modify the application functionality - it's purely a deployment infrastructure enhancement.

---

## Infrastructure-Specific Requirements

**Implementation Note - CloudFront Distribution Management:**

For externally-managed CloudFront distributions (e.g., deployed by AWS Solutions templates like Innovation Sandbox), the approved pattern is:

1. Use `Distribution.fromDistributionAttributes()` for read-only reference (TypeScript typing)
2. Use Custom Resource Lambda with CloudFront SDK API calls for modifications
3. Lambda handles idempotency by checking existing configuration before making changes

This pattern avoids CloudFormation import complexities and conflicts with external management tools.

**Reference:** Epic 1 Stories 1.2 (implementation) and 1.3 (validation) demonstrate this pattern.

---

### Existing Infrastructure Context

**CloudFront Distribution:**
- Distribution ID: `E3THG4UHYDHVWP`
- Domain: `d7roov8fndsis.cloudfront.net`
- Status: Production (Deployed)
- Account: 568672915267
- Region: us-west-2 (Global CDN)

**Existing Origins:**
1. **S3Origin (ID: "S3Origin"):**
   - Bucket: `ndx-try-isb-compute-cloudfrontuiapiisbfrontendbuck-ssjtxkytbmky`
   - Origin Access Control: E3P8MA1G9Y5BYE
   - Current default cache behavior target

2. **API Gateway Origin (ID: "InnovationSandboxComputeCloudFrontUiApiIsbCloudFrontDistributionOrigin2A994B75A"):**
   - API: `1ewlxhaey6.execute-api.us-west-2.amazonaws.com`
   - Path: `/prod`
   - Purpose: Backend API endpoints

**New Origin to Add:**
3. **ndx-static-prod (New):**
   - Bucket: `ndx-static-prod` (CDK-managed, already deployed)
   - Origin Access Control: Reuse existing E3P8MA1G9Y5BYE or create new
   - Purpose: New UI version for testing via cookie routing

### CloudFront Configuration Changes

**Origin Configuration:**
- Origin ID: `ndx-static-prod-origin`
- Origin Domain: `ndx-static-prod.s3.us-west-2.amazonaws.com`
- Origin Protocol: HTTPS only
- Origin Path: Empty (serve from bucket root)
- Connection Attempts: 3 (match existing)
- Connection Timeout: 10 seconds (match existing)
- Origin Read Timeout: 30 seconds (match existing)
- Origin Access Control: Configure to match S3Origin security model

**Cookie-Based Routing Implementation:**

Two implementation options:

**Option A: CloudFront Functions (Recommended):**
- **Advantage:** Lower latency (runs at edge), lower cost, simpler
- **Function Type:** Viewer request function
- **Language:** JavaScript (CloudFront Functions runtime)
- **Logic:** Inspect `Cookie` header, if `NDX=true` → modify origin ID
- **Deployment:** Part of CloudFront cache behavior configuration

**Option B: Lambda@Edge:**
- **Advantage:** More powerful, can perform complex logic if needed later
- **Function Type:** Origin request function
- **Language:** Node.js
- **Region:** Must be deployed to us-east-1 for Lambda@Edge
- **Logic:** Same cookie inspection and origin selection

**Routing Function Logic:**
```javascript
// Pseudo-code for routing function
function handler(event) {
  const request = event.request;
  const cookies = parseCookies(request.headers.cookie);

  // Check for NDX cookie with value "true"
  if (cookies['NDX'] === 'true') {
    // Route to new S3 bucket origin
    request.origin = { s3: { /* ndx-static-prod config */ } };
  } else {
    // Route to existing S3 origin (default behavior)
    request.origin = { s3: { /* existing S3Origin config */ } };
  }

  return request;
}
```

**Cache Behavior Configuration:**
- **Do NOT modify API Gateway routes** - Only affect default cache behavior
- Default cache behavior: Attach routing function
- Preserve all existing cache policies, compression settings, viewer protocol policies
- Ensure cookies are forwarded to function (required for cookie inspection)

### CDK Implementation Requirements

**CDK Stack Updates:**
- Update existing `NdxStaticStack` or create new `NdxCloudfrontStack`
- Import existing CloudFront distribution (do not create new one)
- Add new S3 origin to distribution configuration
- Deploy routing function (CloudFront Function or Lambda@Edge)
- Attach function to default cache behavior

**Testing Requirements:**
- Snapshot test for CloudFront configuration changes
- Fine-grained assertions for new origin properties
- Fine-grained assertions that API Gateway origin remains untouched
- Test that routing function code is syntactically valid
- Integration test: Deploy to test environment, validate cookie routing

### Deployment Process

**Pre-Deployment:**
1. Review current CloudFront configuration via AWS Console
2. Run `cdk diff` to preview infrastructure changes
3. Verify API Gateway origin configuration is not modified in diff
4. Document current default cache behavior configuration for rollback

**Deployment:**
5. Run `cdk deploy` to apply CloudFront changes
6. CloudFront propagates changes globally (10-15 minutes)
7. Monitor CloudFormation stack events for successful deployment

**Post-Deployment Validation:**
8. Without cookie: Browse site, verify existing origin serves content
9. Set cookie `NDX=true`: Browse site, verify new origin serves content
10. Clear cookie: Verify switched back to existing origin
11. Check CloudFront metrics for errors or anomalies

**Rollback Plan:**
12. Option 1: Disable routing function (fastest)
13. Option 2: Revert CloudFront configuration via `cdk deploy` with previous version
14. Option 3: Remove new origin entirely if issues persist

---

## Functional Requirements

**Purpose:** These define WHAT capabilities the CloudFront routing infrastructure must provide. They are the complete inventory of features that enable cookie-based origin routing.

**Scope:** Infrastructure layer only - CloudFront configuration, origin management, routing logic. Each FR describes a capability the system must support.

### CloudFront Origin Management

**FR1:** System can add `ndx-static-prod` S3 bucket as a new origin to CloudFront distribution E3THG4UHYDHVWP

**FR2:** System can configure Origin Access Control for new S3 origin matching security of existing S3Origin

**FR3:** System can define origin properties (connection timeout, read timeout, connection attempts) matching existing origins

**FR4:** System can reference existing CloudFront distribution in CDK without recreating or modifying core distribution properties

**FR5:** System preserves existing S3Origin completely unchanged (bucket, OAC, timeouts, protocol)

**FR6:** System preserves API Gateway origin completely unchanged (endpoint, path, protocol, timeouts)

### Cookie-Based Routing Logic

**FR7:** System can inspect incoming HTTP requests for `Cookie` header

**FR8:** System can parse `Cookie` header to extract `NDX` cookie value

**FR9:** System routes requests to `ndx-static-prod` origin when `NDX` cookie value equals `true` (exact match, case-sensitive)

**FR10:** System routes requests to existing S3Origin when `NDX` cookie is missing

**FR11:** System routes requests to existing S3Origin when `NDX` cookie exists but value is not `true`

**FR12:** Routing logic executes for every request to default cache behavior (HTML pages, assets)

**FR13:** Routing logic does NOT execute for API Gateway routes (preserves existing API routing)

**FR14:** Routing function returns modified request with correct origin selection

### Routing Function Deployment

**FR15:** System can deploy CloudFront Function (Option A) or Lambda@Edge function (Option B) containing routing logic

**FR16:** Routing function code can be defined in CDK as part of infrastructure

**FR17:** Routing function can be attached to default cache behavior as viewer-request or origin-request function

**FR18:** Routing function deployment is part of CloudFront configuration update (single CDK deployment)

**FR19:** CloudFront propagates function changes globally across all edge locations

### Cache Behavior Configuration

**FR20:** System preserves all existing cache policy settings (TTL, compression, HTTPS redirect)

**FR21:** System ensures cookies are forwarded to routing function (required for cookie inspection)

**FR22:** System preserves existing viewer protocol policy (redirect-to-https)

**FR23:** System preserves existing allowed HTTP methods configuration

**FR24:** System preserves existing response headers policies if configured

### CDK Infrastructure Management

**FR25:** CDK code can import existing CloudFront distribution by ID (E3THG4UHYDHVWP)

**FR26:** CDK can modify CloudFront distribution configuration without recreating distribution

**FR27:** Infrastructure changes can be validated via `cdk synth` before deployment

**FR28:** Infrastructure changes can be previewed via `cdk diff` showing origin and function additions

**FR29:** Infrastructure can be deployed via `cdk deploy` with zero service downtime

**FR30:** CDK deployment is idempotent (re-running with no changes causes no AWS updates)

### Testing & Validation

**FR31:** CDK tests can validate new S3 origin is added to distribution configuration

**FR32:** CDK tests can validate API Gateway origin remains unchanged

**FR33:** CDK tests can validate routing function code is syntactically valid

**FR34:** CDK tests can validate cache behavior configuration preserves existing policies

**FR35:** System can execute smoke tests post-deployment (manual cookie setting and verification)

### Rollback & Safety

**FR36:** System can disable routing function via CloudFront configuration change

**FR37:** System can remove new S3 origin from distribution if rollback needed

**FR38:** System can revert to previous CloudFront configuration via CDK version control

**FR39:** Failed CloudFront deployments can be investigated via CloudFormation events

**FR40:** CloudFormation automatically rolls back failed CloudFront configuration changes

### Operational Monitoring

**FR41:** CloudFront can emit metrics showing request counts per origin

**FR42:** CloudFront can emit error rate metrics for each origin separately

**FR43:** Routing function execution can be monitored via CloudWatch if needed (Lambda@Edge only)

**FR44:** System can log routing decisions for debugging (optional, not required for MVP)

---

## Non-Functional Requirements

### Performance

**NFR-PERF-1:** Routing function execution must add < 5ms latency to request processing

**NFR-PERF-2:** Cookie parsing must handle malformed cookie headers gracefully without errors

**NFR-PERF-3:** CloudFront edge cache behavior must remain unchanged (no cache effectiveness degradation)

**NFR-PERF-4:** Routing logic must execute in < 100ms worst-case (CloudFront Functions: sub-millisecond expected)

**NFR-PERF-5:** CDK deployment of CloudFront changes must complete within CloudFormation timeout (typically 60 minutes)

**NFR-PERF-6:** CloudFront global propagation must complete within 15 minutes of deployment

### Security

**NFR-SEC-1:** New S3 origin must use same Origin Access Control security model as existing S3Origin

**NFR-SEC-2:** Routing function must not log cookie values containing potentially sensitive data

**NFR-SEC-3:** CDK code must not contain hardcoded distribution IDs or sensitive configuration (use parameters/context)

**NFR-SEC-4:** Origin Access Control permissions must follow principle of least privilege (read-only S3 access)

**NFR-SEC-5:** CloudFront distribution security policies (HTTPS enforcement, TLS versions) must remain unchanged

**NFR-SEC-6:** Routing function must validate cookie input to prevent injection attacks

### Reliability

**NFR-REL-1:** CloudFront distribution must maintain 99.9% availability during and after deployment

**NFR-REL-2:** Failed CDK deployments must rollback automatically via CloudFormation

**NFR-REL-3:** Routing function errors must not cause request failures (graceful fallback to existing origin)

**NFR-REL-4:** CDK deployment must be idempotent (repeated deployments with no changes cause no AWS modifications)

**NFR-REL-5:** Routing function must handle missing cookie header without errors (default to existing origin)

**NFR-REL-6:** System must maintain existing origin availability if new origin fails (automatic CloudFront failover not required for MVP, but routing function must not break existing behavior)

### Maintainability

**NFR-MAINT-1:** CDK code must pass ESLint with zero errors before deployment

**NFR-MAINT-2:** CDK code must have snapshot test coverage for CloudFront configuration

**NFR-MAINT-3:** Routing function code must be clearly commented explaining cookie inspection logic

**NFR-MAINT-4:** Infrastructure changes must be documented in git commit messages with rationale

**NFR-MAINT-5:** CDK code must follow AWS best practices for CloudFront resource management

**NFR-MAINT-6:** Routing function must be maintainable by team members without CloudFront Functions expertise (simple, well-documented code)

### Operational Excellence

**NFR-OPS-1:** CDK diff must clearly show CloudFront origin addition and function attachment

**NFR-OPS-2:** Deployment process must include pre-deployment checklist (diff review, rollback plan documentation)

**NFR-OPS-3:** Post-deployment validation steps must be documented and executable by any team member

**NFR-OPS-4:** Rollback process must be documented with clear steps and expected timeline (< 5 minutes)

**NFR-OPS-5:** CloudFront metrics must be accessible via AWS Console for operational monitoring

**NFR-OPS-6:** Deployment failures must provide actionable error messages with remediation guidance

### Scalability

**NFR-SCALE-1:** Routing logic must handle production traffic volume (current and 10x growth) without throttling

**NFR-SCALE-2:** CloudFront Functions must scale automatically across all edge locations

**NFR-SCALE-3:** Additional origins can be added in future without architectural changes

**NFR-SCALE-4:** Cookie-based routing pattern must support multiple cookie values in future (extensible design)

### Compliance & Auditability

**NFR-COMP-1:** Infrastructure changes must be visible in CloudFormation change sets before deployment

**NFR-COMP-2:** CDK diff output must be reviewed and approved before production deployment

**NFR-COMP-3:** CloudFront configuration changes must be auditable via CloudFormation stack history

**NFR-COMP-4:** Infrastructure-as-code must be version controlled with meaningful commit messages

**NFR-COMP-5:** Routing function code must be version controlled alongside CDK infrastructure

---

## PRD Summary

**Captured Requirements:**
- **44 Functional Requirements** across 7 capability areas:
  - CloudFront Origin Management (6 FRs)
  - Cookie-Based Routing Logic (8 FRs)
  - Routing Function Deployment (5 FRs)
  - Cache Behavior Configuration (5 FRs)
  - CDK Infrastructure Management (6 FRs)
  - Testing & Validation (5 FRs)
  - Rollback & Safety (5 FRs)
  - Operational Monitoring (4 FRs)

- **35 Non-Functional Requirements** across 7 quality dimensions:
  - Performance (6 NFRs)
  - Security (6 NFRs)
  - Reliability (6 NFRs)
  - Maintainability (6 NFRs)
  - Operational Excellence (6 NFRs)
  - Scalability (4 NFRs)
  - Compliance & Auditability (5 NFRs)

**Key Deliverables:**
1. CloudFront distribution E3THG4UHYDHVWP enhanced with third origin (`ndx-static-prod`)
2. Origin Access Control configured for new S3 origin matching existing security
3. Cookie-based routing function (CloudFront Functions or Lambda@Edge) inspecting `NDX` cookie
4. CDK code importing and modifying existing CloudFront distribution
5. CDK tests validating origin addition and API Gateway preservation
6. Deployment documentation with rollback procedures

**Success Validation:**
- Testers with `NDX=true` cookie see new S3 bucket content
- All users without cookie see existing site unchanged
- API Gateway origin completely untouched
- Zero downtime during CloudFront deployment
- CloudFront propagates changes globally within 15 minutes
- Rollback can be executed in < 5 minutes if needed

---

## Product Value Summary

This PRD enables **safe, low-risk UI evolution** for the National Digital Exchange, a critical UK government procurement platform handling £2B in procurement decisions.

The value delivered is **surgical infrastructure enhancement** - a focused, contained change that enables the strangler pattern for UI modernization without risking production stability. Rather than deploying UI changes directly to all government users or creating separate testing environments, this approach:

- **Preserves production stability** - Zero risk to existing users, no behavior changes without explicit opt-in
- **Enables progressive migration** - Foundation for gradually replacing the UI over multiple phases
- **Minimizes operational overhead** - Self-service cookie management by technical testers, no admin tools needed
- **Provides instant rollback** - Can disable routing in seconds if issues discovered

The infrastructure-as-code approach via CDK ensures **reproducibility, auditability, and transparency** - critical requirements for a public sector platform. This methodical, low-risk approach demonstrates government service engineering best practices: make one surgical change, validate thoroughly, then build upon the foundation.

**Business Impact:** Enables NDX team to confidently evolve the platform's user interface based on the Alpine.js modernization research, testing with real users before committing to full rollout - significantly reducing the risk of disruption to government procurement operations.

---

_This PRD captures the CloudFront cookie-based origin routing requirements for NDX - enabling safe UI evolution for a critical UK government procurement platform._

_Created through collaborative discovery between cns and AI facilitator._
