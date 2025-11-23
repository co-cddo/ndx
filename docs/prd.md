# NDX Product Requirements Document

**Author:** cns
**Date:** 2025-11-22
**Version:** 2.0

**Features Covered:**
1. CloudFront Origin Routing (Cookie-based routing infrastructure) - **COMPLETED**
2. Try Before You Buy (AWS Innovation Sandbox Integration) - **IN DEVELOPMENT**

---

# Feature 1: CloudFront Origin Routing (COMPLETED)

## Executive Summary - CloudFront Origin Routing

The National Digital Exchange (NDX) requires a safe deployment mechanism to test UI changes before rolling them out to all government users. This section defines requirements for implementing cookie-based origin routing in the existing CloudFront distribution, enabling the strangler pattern for gradual UI migration.

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

# Feature 2: Try Before You Buy (AWS Innovation Sandbox Integration)

## Executive Summary - Try Before You Buy

**New Capability:** NDX now enables government users to "try before you buy" AWS services through temporary sandbox environments. This integration with AWS Innovation Sandbox provides self-service access to time-limited AWS accounts for hands-on evaluation without procurement delays.

**Current State:** Government users must procure AWS services through traditional channels before evaluating them, creating barriers to informed decision-making and slowing digital transformation.

**Challenge:** Public sector organizations need to evaluate cloud services hands-on before committing to procurement, but traditional processes require contracts before access.

**Solution:** Integrate AWS Innovation Sandbox into NDX catalogue, enabling authenticated users to request 24-hour AWS sandbox accounts directly from product pages, manage active "try sessions," and access temporary AWS environments through a seamless NDX-branded experience.

### What Makes This Special

This is **self-service sandbox provisioning** for UK government users that removes procurement friction from service evaluation. Rather than requiring contracts before hands-on testing, this approach:

- **Accelerates evaluation** - Users get AWS access in seconds, not weeks
- **Reduces procurement risk** - Test before commit with real AWS services
- **Maintains government compliance** - WCAG 2.2 AA/AAA, GOV.UK Design System integration
- **Provides budget guardrails** - $50 max spend, 24-hour time limits prevent runaway costs
- **Ensures auditability** - Server-side logging tracks who accessed which accounts when

The differentiator is **hiding AWS Innovation Sandbox complexity** behind a simple NDX-branded interface that feels native to the platform, while maintaining strict GovTech compliance requirements.

---

## Success Criteria - Try Before You Buy

**Primary Success Metric:** Authenticated government users can request and access temporary AWS sandbox accounts from NDX catalogue pages with zero manual intervention.

**Specific Success Indicators:**

1. **Sign In/Out Works:** Users can authenticate via existing AWS Innovation Sandbox OAuth, session persists across browser tabs but not restarts
2. **Try Sessions Displayed:** Users see current and past sandbox sessions with AWS account IDs, expiry times, and budget status
3. **Sandbox Access:** Active sessions provide one-click AWS Console launch via SSO portal
4. **Catalogue Integration:** Product pages show "Try this now for 24 hours" button with try-before-you-buy tag/filter
5. **AUP Acceptance:** Users must accept Acceptable Use Policy before requesting sandbox (checkbox required)
6. **Error Handling:** Max lease limit enforced with clear error messaging and redirect to /try page
7. **Accessibility Compliance:** WCAG 2.2 AA minimum (target AAA) with keyboard navigation and screen reader support

**What Winning Looks Like:**
- Government users browse NDX catalogue, click "Try" button, accept AUP, and get AWS sandbox access in < 30 seconds
- Users manage multiple past/current try sessions from centralized /try page
- GOV.UK Design System styling ensures seamless NDX integration (Innovation Sandbox branding invisible to users)
- Mobile-responsive interface works on tablets/phones used by government staff
- Zero support tickets about "how do I get access to test this service"

---

## Product Scope - Try Before You Buy

### MVP - Minimum Viable Product

**Phase 1: Local Development Setup (Dev Infrastructure)**
1. **mitmproxy Configuration:** Proxy `https://d7roov8fndsis.cloudfront.net/` to localhost for development
2. **API Route Exclusion:** Exclude `/api/*` routes (proxy only UI, not API calls)
3. **Playwright Validation:** Prove proxy works for home page and API calls return expected responses

**Phase 2-3: Testing Infrastructure**
4. **End-to-End Test Suite:** Automated tests proving proxy and app server integration
5. **Smoke Test Suite:** Crawl main website areas to catch regression issues
6. **Test Credentials:** Document 1Password CLI integration for test user credentials

**Phase 4: Authentication (Sign In/Out UI)**
7. **Sign In Button:** Top-right navigation shows "Sign in" when unauthenticated
8. **Sign Out Button:** Top-right navigation shows "Sign out" when authenticated
9. **Session Management:** JWT stored in sessionStorage (persists across tabs, not browser restarts)
10. **OAuth Flow:** Redirect to `/api/auth/login`, handle token in URL query param, store in sessionStorage
11. **API Integration:** Send `Authorization: Bearer {token}` header with all ISB API requests

**Phase 5: Try Page (/try)**
12. **Try Page Route:** Create `/try` page showing user's sandbox sessions
13. **Unauthenticated State:** Show "Sign in to view your try sessions" button if not logged in
14. **Session List View:** Display current and past try sessions in table format

**Phase 6: Try Sessions Display**
15. **Previous Sessions Table:** Show expired/terminated sessions with columns:
    - Template Name (e.g., "user research 0.0.1")
    - AWS Account ID
    - Expiry Date (relative time: "4 days ago")
    - Budget Status (e.g., "$0 / $5", "$2.50 / $5")
    - Status Badge (Active/Expired/Terminated/Failed with color coding)

**Phase 7: Active Session Management**
16. **Current Lease Display:** Highlight active sessions differently from expired ones
17. **AWS Console Launch:** "Launch AWS Console" button opening SSO portal URL in new tab:
    - URL format: `https://d-9267e1e371.awsapps.com/start/#/console?account_id={accountId}&role_name=ndx_IsbUsersPS`
18. **Session Details:** Show lease duration remaining, budget consumed, account ID

**Phase 8: Catalogue Integration**
19. **Product Page Metadata:** Add YAML frontmatter fields to catalogue product pages:
    ```yaml
    try: ndx_isb
    try_id: a3beced2-be4e-41a0-b6e2-735a73fffed7  # Lease template UUID
    ```
20. **Try Before You Buy Tag:** Add tag to products supporting try (e.g., `tags: ["Try Before You Buy"]`)
21. **Catalogue Filter:** Enable filtering catalogue by "Try Before You Buy" tag (matches existing tag filter behavior)
22. **Empty AWS Account Product:** Create `src/catalogue/aws/empty.md` for bare AWS sandbox environment

**Phase 9: Try Button & Lease Request**
23. **Try Button on Product Pages:** GOV.UK button "Try this now for 24 hours" (matches existing design pattern)
24. **Unauthenticated Flow:** If not signed in, initiate OAuth sign-in flow first
25. **Lease Request Modal:** Overlay/modal window showing:
    - Duration: 24 hours
    - Budget: $50 max
    - Scrollable AUP text (fetched from `/api/configurations` termsOfService field)
    - Required checkbox: "I accept the Acceptable Use Policy"
    - Cancel button (closes modal)
    - Continue button (requests lease, navigates to /try page)
26. **Error Handling:**
    - Max leases exceeded (409): Show JavaScript alert + redirect to /try page
    - Other errors: Show JavaScript alert with error message
27. **Loading States:** Show loading indicator while requesting lease

### Growth Features (Post-MVP)

**Enhanced Session Management:**
1. **Manual Lease Termination:** "End Session Early" button for active leases
2. **Budget Alerts:** Visual warnings when 75%, 90% of budget consumed
3. **Session Notes:** Add user notes/tags to leases for organization
4. **Session Search:** Filter/search past sessions by date, budget, status

**Multi-Template Support:**
5. **Template Selection:** Support multiple lease templates with different durations/budgets
6. **Pre-Configured Environments:** Templates with pre-loaded services (e.g., "API Gateway + Lambda Starter")

**Improved UX:**
7. **Session Countdown Timer:** Live countdown showing time remaining on active leases
8. **Email Notifications:** Optional email alerts for session expiration warnings
9. **Quick Renew:** One-click lease renewal (request new lease for same template)
10. **Cost Breakdown:** Show per-service cost breakdown for active sessions

### Vision (Future)

**Integration Expansion:**
1. **Multi-Cloud Support:** Extend try-before-you-buy to Azure, GCP sandboxes
2. **Pre-Built Scenarios:** "Click to deploy" example architectures in sandbox
3. **Guided Tutorials:** In-sandbox walkthroughs for common use cases
4. **Collaborative Sandboxes:** Share sandbox access with team members

**Procurement Integration:**
5. **Try-to-Buy Pipeline:** "Convert to Production" button initiating formal procurement
6. **Usage Reports:** Export try session activity for procurement justification
7. **Budget Forecasting:** Predict production costs based on sandbox usage patterns

---

## Domain-Specific Requirements - Try Before You Buy (GovTech)

**Government-Specific Requirements for Try Feature:**

1. **Accessibility Compliance (WCAG 2.2):**
   - AA compliance minimum (mandatory for UK government services)
   - AAA compliance target where feasible
   - Keyboard navigation for all interactive elements (sign in/out, buttons, modals, tables)
   - Screen reader compatibility (ARIA labels for session status, budget warnings)
   - Focus indicators visible for keyboard users
   - Color contrast ratios meeting AA standards (session status badges)
   - Text alternatives for all non-text content

2. **GOV.UK Design System Integration:**
   - Use govukButton macro for "Try this now" and "Sign in" buttons
   - Match existing NDX visual language (no Innovation Sandbox branding visible)
   - Consistent typography, spacing, color palette with NDX platform
   - Mobile-first responsive design (works on tablets/phones used by government staff)

3. **Data Protection & Privacy:**
   - JWT tokens stored in sessionStorage only (no persistent storage of credentials)
   - Tokens cleared on browser restart (session-only persistence)
   - No PII logged client-side beyond what Innovation Sandbox API requires
   - Server-side audit logging handles compliance (already in place)

4. **Service Continuity:**
   - Clear communication of 24-hour session limits
   - Warning messages before lease expiration (if Growth feature implemented)
   - Graceful degradation if Innovation Sandbox API unavailable (show error, don't break NDX)

5. **Transparency & Auditability:**
   - Try session history visible to users (past leases with dates, costs)
   - AUP acceptance logged server-side (Innovation Sandbox handles this)
   - AWS account IDs displayed to users for their own audit trails

6. **Budget Controls:**
   - $50 max spend enforced server-side by Innovation Sandbox
   - Budget status displayed in clear currency format ("$2.50 / $5.00")
   - Cost accrued shown to 4 decimal places (matches API precision)

---

## Functional Requirements - Try Before You Buy

**Purpose:** Define WHAT capabilities the Try Before You Buy feature must provide. These are the complete inventory of features enabling self-service AWS sandbox access integrated into NDX.

**Scope:** Client-side UI, Innovation Sandbox API integration, 11ty static site catalogue updates.

### Authentication & Session Management

**FR-TRY-1:** System can detect if user is authenticated by checking sessionStorage for `isb-jwt` token

**FR-TRY-2:** System can initiate OAuth login by redirecting to `/api/auth/login`

**FR-TRY-3:** System can extract JWT token from URL query parameter `?token=...` after OAuth redirect

**FR-TRY-4:** System can store JWT token in sessionStorage with key `isb-jwt`

**FR-TRY-5:** System can clean up URL query parameters after extracting token (remove `?token=...` from browser history)

**FR-TRY-6:** System can retrieve stored JWT token from sessionStorage for API calls

**FR-TRY-7:** System can clear JWT token from sessionStorage on sign-out

**FR-TRY-8:** System persists authentication across browser tabs (sessionStorage accessible to all tabs)

**FR-TRY-9:** System clears authentication on browser restart (sessionStorage does not persist)

**FR-TRY-10:** System sends `Authorization: Bearer {token}` header with all Innovation Sandbox API requests

### User Interface - Sign In/Out

**FR-TRY-11:** System displays "Sign in" button in top-right navigation when user not authenticated

**FR-TRY-12:** System displays "Sign out" button in top-right navigation when user authenticated

**FR-TRY-13:** Sign in button triggers OAuth redirect to `/api/auth/login`

**FR-TRY-14:** Sign out button clears sessionStorage and redirects to home page

**FR-TRY-15:** System uses GOV.UK Design System button styling for sign in/out buttons

### Innovation Sandbox API Integration

**FR-TRY-16:** System can call `GET /api/auth/login/status` to check authentication status

**FR-TRY-17:** System can parse user session data (email, displayName, userName, roles) from status API

**FR-TRY-18:** System can call `GET /api/leases?userEmail={email}` to retrieve user's leases

**FR-TRY-19:** System can parse lease data (uuid, status, awsAccountId, maxSpend, totalCostAccrued, expirationDate, etc.)

**FR-TRY-20:** System can call `GET /api/leaseTemplates` to retrieve available lease templates

**FR-TRY-21:** System can call `GET /api/configurations` to retrieve AUP text and system configuration

**FR-TRY-22:** System can call `POST /api/leases` with payload `{leaseTemplateUuid, comments}` to request new lease

**FR-TRY-23:** System can handle API errors (401 unauthorized, 409 max leases exceeded, 5xx server errors)

**FR-TRY-24:** System redirects to login if API returns 401 unauthorized response

### Try Page (/try)

**FR-TRY-25:** System can render `/try` page route

**FR-TRY-26:** System displays "Sign in to view your try sessions" message when unauthenticated

**FR-TRY-27:** System displays "Sign in" button on /try page when unauthenticated (same as top-right nav)

**FR-TRY-28:** System fetches and displays user's leases when authenticated

**FR-TRY-29:** System renders empty state message if user has no leases

### Try Sessions Display

**FR-TRY-30:** System displays sessions table with columns: Template Name, AWS Account ID, Expiry, Budget, Status

**FR-TRY-31:** System formats expiry as relative time ("4 days ago", "5 hours ago") for past sessions

**FR-TRY-32:** System formats expiry as absolute date/time for future expirations

**FR-TRY-33:** System displays budget as "${costAccrued} / ${maxSpend}" format (e.g., "$2.50 / $5.00")

**FR-TRY-34:** System displays cost accrued to 4 decimal places (matches API precision)

**FR-TRY-35:** System displays status badge with color coding:
- Active: Green background
- Pending: Orange background
- Expired: Pink background
- ManuallyTerminated: Grey background
- Failed: Red background

**FR-TRY-36:** System sorts sessions by creation date (newest first)

**FR-TRY-37:** System visually distinguishes active sessions from expired/terminated (e.g., border, background highlight)

### Active Session Management

**FR-TRY-38:** System displays "Launch AWS Console" button for sessions with status "Active"

**FR-TRY-39:** Launch button opens AWS SSO portal in new tab with URL format:
`https://d-9267e1e371.awsapps.com/start/#/console?account_id={accountId}&role_name=ndx_IsbUsersPS`

**FR-TRY-40:** System displays remaining lease duration for active sessions (if expiration date in future)

**FR-TRY-41:** System does not show launch button for sessions with status Expired/Terminated/Failed

### Catalogue Integration (11ty Static Site)

**FR-TRY-42:** System can parse `try` metadata field from product page YAML frontmatter

**FR-TRY-43:** System can parse `try_id` metadata field (lease template UUID) from product frontmatter

**FR-TRY-44:** System adds "Try Before You Buy" tag to products with `try` metadata

**FR-TRY-45:** System renders "Try Before You Buy" tag in catalogue listing filters (matches existing tag behavior)

**FR-TRY-46:** System filters catalogue by "Try Before You Buy" tag when filter selected

**FR-TRY-47:** System renders "Try this now for 24 hours" button on product pages with `try` metadata

**FR-TRY-48:** Try button uses govukButton macro with `isStartButton: true` (matches existing design)

### Try Button & Lease Request Modal

**FR-TRY-49:** Clicking "Try" button checks authentication status first

**FR-TRY-50:** If unauthenticated, Try button initiates OAuth sign-in flow

**FR-TRY-51:** If authenticated, Try button displays lease request modal overlay

**FR-TRY-52:** Modal displays lease duration (24 hours hardcoded from template)

**FR-TRY-53:** Modal displays max budget ($50 hardcoded from template)

**FR-TRY-54:** Modal fetches and displays AUP text from `/api/configurations` termsOfService field

**FR-TRY-55:** Modal renders AUP text in scrollable container (max-height 300px or similar)

**FR-TRY-56:** Modal displays required checkbox "I accept the Acceptable Use Policy"

**FR-TRY-57:** Continue button disabled until AUP checkbox checked

**FR-TRY-58:** Cancel button closes modal without action

**FR-TRY-59:** Continue button requests lease via `POST /api/leases` with template UUID from `try_id` metadata

**FR-TRY-60:** System shows loading indicator during lease request

**FR-TRY-61:** On successful lease request, system navigates to `/try` page

**FR-TRY-62:** On error response (409 max leases), system shows JavaScript alert with error message

**FR-TRY-63:** On 409 error, system redirects to `/try` page after alert dismissed

**FR-TRY-64:** On other errors (500, 400), system shows JavaScript alert with error message

**FR-TRY-65:** Modal closes on successful lease request or after error handling

### Responsive Design & Mobile Support

**FR-TRY-66:** All try-related UI elements responsive for mobile/tablet viewports (320px+ width)

**FR-TRY-67:** Sessions table adapts to mobile (stacked cards or horizontal scroll)

**FR-TRY-68:** Modal overlay adapts to mobile viewport (full-screen on small screens)

**FR-TRY-69:** Sign in/out buttons accessible on mobile nav

### Accessibility (WCAG 2.2)

**FR-TRY-70:** All interactive elements keyboard navigable (tab, enter, escape keys)

**FR-TRY-71:** Focus indicators visible for keyboard navigation (sign in/out buttons, try button, modal buttons)

**FR-TRY-72:** Modal can be closed with Escape key

**FR-TRY-73:** Modal traps focus (tab cycles through modal elements only when open)

**FR-TRY-74:** Screen reader announces session status (ARIA labels for status badges)

**FR-TRY-75:** Screen reader announces budget status (ARIA labels for cost display)

**FR-TRY-76:** Color contrast ratios meet WCAG 2.2 AA standards (4.5:1 for normal text, 3:1 for large text)

**FR-TRY-77:** Status badges use both color AND text (not color-only indication)

**FR-TRY-78:** Form labels associated with inputs (checkbox label for AUP acceptance)

**FR-TRY-79:** Error messages announced to screen readers (ARIA live regions for alerts)

---

## Non-Functional Requirements - Try Before You Buy

### Performance

**NFR-TRY-PERF-1:** Try page loads and displays sessions within 2 seconds on broadband connection

**NFR-TRY-PERF-2:** Innovation Sandbox API calls timeout after 10 seconds with user-friendly error message

**NFR-TRY-PERF-3:** Lease request completes within 5 seconds (excludes server-side provisioning time)

**NFR-TRY-PERF-4:** Modal overlay appears within 100ms of button click (no perceived lag)

**NFR-TRY-PERF-5:** Session table renders smoothly with up to 50 past sessions (pagination not required for MVP)

### Security

**NFR-TRY-SEC-1:** JWT tokens stored in sessionStorage only (never localStorage or cookies)

**NFR-TRY-SEC-2:** Tokens cleared on browser restart (sessionStorage auto-clears)

**NFR-TRY-SEC-3:** Client-side code does not log JWT tokens to console or error tracking

**NFR-TRY-SEC-4:** API calls use HTTPS only (no HTTP fallback)

**NFR-TRY-SEC-5:** CORS headers validated (Innovation Sandbox API must allow NDX origin)

**NFR-TRY-SEC-6:** No sensitive data stored in URL query params after OAuth redirect (token cleaned up)

**NFR-TRY-SEC-7:** Session timeout handled gracefully (401 responses trigger re-authentication)

### Reliability

**NFR-TRY-REL-1:** Try feature degradation does not break core NDX functionality (graceful failure)

**NFR-TRY-REL-2:** Innovation Sandbox API failures display user-friendly error messages (not raw error dumps)

**NFR-TRY-REL-3:** Network timeouts handled with retry option (not silent failure)

**NFR-TRY-REL-4:** Malformed API responses handled without JavaScript errors (defensive parsing)

**NFR-TRY-REL-5:** Browser back button works correctly after OAuth redirect (no broken states)

### Accessibility (WCAG 2.2)

**NFR-TRY-A11Y-1:** WCAG 2.2 Level AA compliance mandatory for all try-related UI

**NFR-TRY-A11Y-2:** WCAG 2.2 Level AAA compliance targeted where feasible

**NFR-TRY-A11Y-3:** Automated accessibility testing (axe-core or similar) passes with zero violations

**NFR-TRY-A11Y-4:** Manual keyboard-only navigation testing passes (no keyboard traps)

**NFR-TRY-A11Y-5:** Manual screen reader testing passes (JAWS, NVDA, or VoiceOver)

**NFR-TRY-A11Y-6:** Color contrast testing passes with WCAG 2.2 AA ratios minimum

**NFR-TRY-A11Y-7:** Focus management correct for modal overlays (focus trapped, returned on close)

### Usability

**NFR-TRY-UX-1:** Try button discoverable on product pages (prominent placement, clear labeling)

**NFR-TRY-UX-2:** Sign in/out button consistent location across all pages (top-right nav)

**NFR-TRY-UX-3:** Error messages use plain language (no technical jargon or error codes)

**NFR-TRY-UX-4:** Loading states clearly communicated (spinners, disabled buttons, loading text)

**NFR-TRY-UX-5:** AUP text readable (adequate font size, line height, scrollable container)

**NFR-TRY-UX-6:** Budget display unambiguous (currency symbol, decimal places consistent)

**NFR-TRY-UX-7:** Session expiry times user-friendly (relative time for past, absolute for future)

### Maintainability

**NFR-TRY-MAINT-1:** TypeScript code compiled to JavaScript for browser compatibility

**NFR-TRY-MAINT-2:** Client-side code passes linting (ESLint or similar, zero errors)

**NFR-TRY-MAINT-3:** Code documented with JSDoc comments explaining API integration patterns

**NFR-TRY-MAINT-4:** Test credentials documented for development/testing (1Password CLI integration)

**NFR-TRY-MAINT-5:** API endpoints configurable (not hardcoded in multiple places)

**NFR-TRY-MAINT-6:** Lease template UUID mappable to product metadata (not hardcoded in JS)

### Browser Compatibility

**NFR-TRY-COMPAT-1:** Supports latest 2 versions of Chrome, Firefox, Safari, Edge

**NFR-TRY-COMPAT-2:** SessionStorage API supported (excludes very old browsers, acceptable for gov users)

**NFR-TRY-COMPAT-3:** JavaScript ES6+ features transpiled to ES5 if needed for compatibility

**NFR-TRY-COMPAT-4:** Responsive design tested on iOS Safari and Android Chrome

### Testing Requirements

**NFR-TRY-TEST-1:** End-to-end tests prove proxy and app server integration (Playwright)

**NFR-TRY-TEST-2:** Smoke tests cover main website areas to catch regressions

**NFR-TRY-TEST-3:** Test user credentials retrievable via 1Password CLI command (documented)

**NFR-TRY-TEST-4:** Authentication flow tested with real OAuth redirect (not just mocked)

**NFR-TRY-TEST-5:** Lease request flow tested end-to-end (sign in → try button → modal → lease → /try page)

**NFR-TRY-TEST-6:** Error handling tested (max leases exceeded, network failures, API errors)

**NFR-TRY-TEST-7:** Accessibility automated tests run in CI pipeline (no violations allowed)

### Design System Compliance

**NFR-TRY-DESIGN-1:** All buttons use govukButton macro from GOV.UK Design System

**NFR-TRY-DESIGN-2:** Typography matches NDX existing styles (font families, sizes, weights)

**NFR-TRY-DESIGN-3:** Spacing uses GOV.UK Design System scale (8px grid)

**NFR-TRY-DESIGN-4:** Colors match NDX palette (no Innovation Sandbox purple branding)

**NFR-TRY-DESIGN-5:** Components match existing NDX patterns (tables, cards, modals)

---

# Combined PRD Summary

**Total Requirements Captured:**

**Feature 1: CloudFront Origin Routing (COMPLETED)**
- 44 Functional Requirements across 7 capability areas
- 35 Non-Functional Requirements across 7 quality dimensions

**Feature 2: Try Before You Buy (IN DEVELOPMENT)**
- **79 Functional Requirements** across 9 capability areas:
  - Authentication & Session Management (10 FRs)
  - User Interface - Sign In/Out (5 FRs)
  - Innovation Sandbox API Integration (9 FRs)
  - Try Page (5 FRs)
  - Try Sessions Display (8 FRs)
  - Active Session Management (4 FRs)
  - Catalogue Integration (6 FRs)
  - Try Button & Lease Request Modal (17 FRs)
  - Responsive Design & Mobile (4 FRs)
  - Accessibility WCAG 2.2 (10 FRs)

- **47 Non-Functional Requirements** across 9 quality dimensions:
  - Performance (5 NFRs)
  - Security (7 NFRs)
  - Reliability (5 NFRs)
  - Accessibility (7 NFRs)
  - Usability (7 NFRs)
  - Maintainability (6 NFRs)
  - Browser Compatibility (4 NFRs)
  - Testing Requirements (7 NFRs)
  - Design System Compliance (5 NFRs)

**Combined Totals:**
- **123 Functional Requirements**
- **82 Non-Functional Requirements**
- **205 Total Requirements**

---

## Key Deliverables - CloudFront Origin Routing (COMPLETED)

1. CloudFront distribution E3THG4UHYDHVWP enhanced with third origin (`ndx-static-prod`)
2. Origin Access Control configured for new S3 origin matching existing security
3. Cookie-based routing function (CloudFront Functions) inspecting `NDX` cookie
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

## Key Deliverables - Try Before You Buy (IN DEVELOPMENT)

1. Sign in/out authentication UI (top-right nav, sessionStorage JWT)
2. Try page (/try) displaying current and past sandbox sessions
3. Session table with AWS account IDs, expiry, budget, status, console launch buttons
4. Catalogue product page metadata (`try`, `try_id` frontmatter fields)
5. "Try Before You Buy" tag and filter in catalogue
6. Try button with AUP acceptance modal
7. Lease request integration with Innovation Sandbox API
8. GOV.UK Design System styling throughout
9. WCAG 2.2 AA/AAA accessibility compliance
10. Mobile-responsive interface
11. Comprehensive E2E and smoke tests
12. mitmproxy local development setup

**Success Validation:**
- Government users can sign in, browse catalogue, click "Try" button, accept AUP, and get AWS sandbox access in < 30 seconds
- Users manage active/past try sessions from /try page with budget tracking and console launch
- Zero Innovation Sandbox branding visible (seamless NDX integration)
- WCAG 2.2 accessibility standards met for inclusive government service
- Mobile-responsive on tablets/phones used by government staff
- Error handling prevents confusion (max leases, network failures)

---

## Product Value Summary

This PRD captures requirements for **two critical NDX capabilities** that together enable safe platform evolution and accelerated service evaluation for UK government users:

### CloudFront Origin Routing (COMPLETED)
**Safe, low-risk UI evolution** via surgical infrastructure enhancement. The cookie-based routing enables the strangler pattern for UI modernization without risking production stability for the £2B government procurement platform.

### Try Before You Buy (IN DEVELOPMENT)
**Self-service sandbox provisioning** that removes procurement friction from cloud service evaluation. Government users can test AWS services hands-on before committing to procurement, accelerating digital transformation while maintaining strict GovTech compliance (WCAG 2.2, GOV.UK Design System, budget controls, auditability).

The infrastructure-as-code approach via CDK and client-side TypeScript ensures **reproducibility, auditability, and transparency** - critical requirements for public sector platforms. This methodical approach demonstrates government service engineering best practices: make surgical changes, validate thoroughly, and build capabilities that serve government users effectively.

**Business Impact:**
- **CloudFront Routing:** Enables confident UI evolution with real-user testing before full rollout
- **Try Before You Buy:** Reduces procurement cycle time from weeks to seconds, enabling informed decision-making for cloud service adoption

---

_This PRD captures requirements for NDX CloudFront cookie-based origin routing and Try Before You Buy (AWS Innovation Sandbox integration) - enabling safe UI evolution and accelerated service evaluation for a critical UK government procurement platform._

_Created through collaborative discovery between cns and AI facilitator._
