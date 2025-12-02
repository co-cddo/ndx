# NDX Product Requirements Document

**Author:** cns
**Date:** 2025-11-22
**Version:** 2.0

**Features Covered:**
1. CloudFront Origin Routing (Cookie-based routing infrastructure) - **COMPLETED**
2. Try Before You Buy (AWS Innovation Sandbox Integration) - **IN DEVELOPMENT**
3. GOV.UK Notify Integration (Innovation Sandbox email notifications) - **PLANNED**
4. Slack Integration (Operational alerts and notifications) - **PLANNED**

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
- Domain: `ndx.digital.cabinet-office.gov.uk`
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
1. **mitmproxy Configuration:** Proxy `https://ndx.digital.cabinet-office.gov.uk/` to localhost for development
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

# Feature 3: GOV.UK Notify Integration for Innovation Sandbox

## Executive Summary - GOV.UK Notify Integration

**New Capability:** Replace default AWS SES emails from Innovation Sandbox with GOV.UK Notify-powered notifications. This integration intercepts EventBridge events from the Innovation Sandbox and sends properly formatted, government-branded email notifications via the UK Government's official notification service.

**Current State:** Innovation Sandbox sends email notifications via AWS SES with generic AWS branding. These emails lack government branding, may not meet GDS notification standards, and are inconsistent with NDX's GOV.UK Design System approach.

**Challenge:** Government users receiving Innovation Sandbox notifications need clear, professionally formatted emails that match GOV.UK standards, with proper branding and content that aligns with the NDX platform experience.

**Solution:** Deploy a CloudFormation stack that:
1. Intercepts all Innovation Sandbox EventBridge events
2. Transforms event payloads into GOV.UK Notify template parameters
3. Sends notifications via GOV.UK Notify API using 18 distinct email templates
4. Provides comprehensive error handling with SQS Dead Letter Queue and CloudWatch alarms

### What Makes This Special

This is **seamless notification integration** that replaces AWS-branded emails with proper GOV.UK-compliant notifications. Rather than exposing Innovation Sandbox's default SES emails to government users, this approach:

- **Maintains GOV.UK branding** - All notifications match government service standards
- **Provides event-specific templates** - 18 distinct templates for different event types (lease lifecycle, monitoring, account management, cost reporting)
- **Ensures reliability** - SQS Dead Letter Queue captures failed notifications for retry
- **Enables operational visibility** - CloudWatch alarms alert on notification failures
- **Secures API credentials** - GOV.UK Notify API key stored in AWS Secrets Manager
- **Supports future growth** - Extensible architecture for additional event types

The differentiator is **hiding AWS Innovation Sandbox complexity** behind professional government notifications that feel native to the NDX platform.

---

## Project Classification - GOV.UK Notify Integration

**Technical Type:** Infrastructure / Serverless Integration
**Domain:** GovTech (UK Government Digital Service)
**Complexity:** Medium

This is a **serverless event processing pipeline** that intercepts EventBridge events and transforms them into GOV.UK Notify API calls. The change is self-contained: one Lambda function, one EventBridge rule, one SQS queue, and one Secrets Manager secret.

**Why Infrastructure Project:**
- Deploys AWS resources via CloudFormation
- Lambda function processes events (Python runtime)
- EventBridge rule filters Innovation Sandbox events
- Secrets Manager stores GOV.UK Notify API key
- SQS Dead Letter Queue for failed notifications

**Domain Context:** As a UK government service, notifications must:
- Meet GOV.UK notification service standards
- Provide clear, actionable content to government users
- Include appropriate government branding
- Handle sensitive information appropriately (AWS account IDs, budget data)
- Be auditable and traceable

**Complexity Assessment: Medium**
- **Not High:** Single Lambda function, well-understood EventBridge pattern, established GOV.UK Notify API
- **Not Low:** 18 distinct event types, production government service, requires template design and error handling

---

## Success Criteria - GOV.UK Notify Integration

**Primary Success Metric:** All Innovation Sandbox events trigger appropriately formatted GOV.UK Notify emails to affected users with zero notification failures.

**Specific Success Indicators:**

1. **Event Capture Works:** EventBridge rule intercepts all 18 Innovation Sandbox event types
2. **Lambda Processes Events:** Lambda function successfully transforms event payload to Notify API parameters
3. **Notifications Delivered:** GOV.UK Notify sends emails to recipients with correct template and personalization
4. **Error Handling Functional:** Failed notifications land in SQS Dead Letter Queue for investigation
5. **Monitoring Active:** CloudWatch alarms trigger on notification failures or Lambda errors
6. **Secrets Secure:** GOV.UK Notify API key retrieved from Secrets Manager (not hardcoded)
7. **Templates Complete:** All 18 event types have corresponding GOV.UK Notify templates configured

**What Winning Looks Like:**
- Users receive professional, GOV.UK-branded emails for all Innovation Sandbox events
- Lease lifecycle events (requested, approved, denied, terminated) notify users promptly
- Budget alerts warn users before overspending
- Account management events keep users informed of cleanup and quarantine status
- Cost reports delivered to appropriate group managers
- Zero unhandled notification failures (all logged to DLQ for retry)
- Operations team alerted to systematic notification issues via CloudWatch

---

## Product Scope - GOV.UK Notify Integration

### MVP - Minimum Viable Product

**Phase 1: Infrastructure Setup**
1. **CloudFormation Stack:** Define stack with all required AWS resources
2. **EventBridge Rule:** Create rule matching Innovation Sandbox event patterns
3. **Lambda Function:** Python function for event transformation and Notify API calls
4. **SQS Dead Letter Queue:** Queue for failed notification processing
5. **Secrets Manager Secret:** Secure storage for GOV.UK Notify API key
6. **IAM Role:** Lambda execution role with least-privilege permissions

**Phase 2: Event Processing (Lease Lifecycle - 4 Events)**
7. **LeaseRequested:** Notify user their sandbox request is pending approval
8. **LeaseApproved:** Notify user their sandbox is ready with AWS Console access details
9. **LeaseDenied:** Notify user their sandbox request was denied with reason
10. **LeaseTerminated:** Notify user their sandbox session has ended

**Phase 3: Event Processing (Lease Monitoring - 7 Events)**
11. **LeaseBudgetThresholdAlert:** Warn user approaching budget limit (75%, 90%)
12. **LeaseBudgetExceeded:** Notify user budget exceeded, sandbox frozen
13. **LeaseDurationThresholdAlert:** Warn user sandbox expiring soon
14. **LeaseFreezingThresholdAlert:** Notify user sandbox will freeze soon
15. **LeaseExpired:** Notify user sandbox has expired
16. **LeaseFrozen:** Notify user sandbox frozen (budget or policy)
17. **LeaseUnfrozen:** Notify user sandbox unfrozen and accessible again

**Phase 4: Event Processing (Account Management - 5 Events)**
18. **CleanAccountRequest:** Notify admin account cleanup requested
19. **AccountCleanupSucceeded:** Notify admin/user account cleanup complete
20. **AccountCleanupFailed:** Alert admin account cleanup failed, manual intervention needed
21. **AccountQuarantined:** Alert admin account quarantined due to policy violation
22. **AccountDriftDetected:** Alert admin account drift detected from expected state

**Phase 5: Event Processing (Cost Reporting - 2 Events)**
23. **GroupCostReportGenerated:** Notify group manager cost report available
24. **GroupCostReportGeneratedFailure:** Alert admin cost report generation failed

**Phase 6: Error Handling & Monitoring**
25. **DLQ Processing:** Failed notifications captured in SQS with message metadata
26. **CloudWatch Alarms:** Alarms for Lambda errors, DLQ depth, API failures
27. **Logging:** Structured logging for debugging and audit trail

**Phase 7: GOV.UK Notify Templates**
28. **Template Design:** Create 18 GOV.UK Notify templates matching event types
29. **Template Personalization:** Define personalization fields (user email, account ID, budget, dates)
30. **Template Testing:** Validate templates render correctly with sample data

### Growth Features (Post-MVP)

**Enhanced Notifications:**
1. **SMS Notifications:** Optional SMS for critical events (budget exceeded, account quarantined)
2. **Digest Emails:** Daily/weekly summary of sandbox activity
3. **Rich Email Content:** Include charts/graphs for cost reports
4. **Notification Preferences:** User preferences for which notifications to receive

**Operational Improvements:**
5. **DLQ Retry Automation:** Lambda to automatically retry failed notifications
6. **Notification Dashboard:** CloudWatch dashboard showing notification metrics
7. **A/B Template Testing:** Test different email templates for effectiveness
8. **Rate Limiting:** Throttle notifications to prevent email overload

**Integration Expansion:**
9. **Slack Integration:** Send notifications to Slack channels for team visibility
10. **Webhook Support:** Configurable webhooks for custom integrations
11. **Multi-Language:** Template variants for Welsh language support

### Vision (Future)

**Advanced Notification Platform:**
1. **Notification Hub:** Centralized notification management across all NDX services
2. **AI-Powered Summaries:** Intelligent summarization of multiple events
3. **Predictive Alerts:** ML-based prediction of budget overruns before they happen
4. **Cross-Service Correlation:** Correlate notifications across Innovation Sandbox and other services

---

## Domain-Specific Requirements - GOV.UK Notify Integration (GovTech)

**Government-Specific Requirements for Notification Integration:**

1. **GOV.UK Notify Compliance:**
   - Use GOV.UK Notify service (mandatory for UK government services)
   - Templates follow GOV.UK content design patterns
   - Email content meets plain English standards
   - Sender address uses approved government domain

2. **Data Protection & Privacy:**
   - Only include necessary PII in notifications (email, name)
   - AWS account IDs treated as sensitive (internal identifiers)
   - Budget/cost data formatted appropriately
   - No detailed technical data in user-facing emails

3. **Accessibility:**
   - Email templates accessible (GOV.UK Notify handles this)
   - Plain text alternatives available
   - Clear call-to-action in each notification
   - Avoid complex formatting that breaks screen readers

4. **Security:**
   - GOV.UK Notify API key stored in Secrets Manager (not environment variables)
   - Lambda role follows least-privilege principle
   - No sensitive data logged (mask API keys, minimize PII in logs)
   - EventBridge rule scoped to specific event source

5. **Auditability:**
   - All notification attempts logged with correlation IDs
   - Failed notifications retained in DLQ for investigation
   - CloudWatch logs retained per government retention policy
   - Notification delivery status trackable via GOV.UK Notify dashboard

6. **Service Continuity:**
   - Notification failures don't impact Innovation Sandbox core functionality
   - DLQ ensures no notifications permanently lost
   - CloudWatch alarms enable rapid response to systematic issues

---

## Functional Requirements - GOV.UK Notify Integration

**Purpose:** Define WHAT capabilities the GOV.UK Notify integration must provide. These are the complete inventory of features enabling government-branded notifications for Innovation Sandbox events.

**Scope:** AWS infrastructure (EventBridge, Lambda, SQS, Secrets Manager), GOV.UK Notify API integration, 18 event type handlers.

### EventBridge Integration

**FR-NOTIFY-1:** System can deploy EventBridge rule matching Innovation Sandbox event source

**FR-NOTIFY-2:** EventBridge rule can filter events by detail-type for all 18 supported event types

**FR-NOTIFY-3:** EventBridge rule can target Lambda function for event processing

**FR-NOTIFY-4:** System can receive event payload containing user email, event type, and event-specific data

**FR-NOTIFY-5:** System preserves all event metadata for processing (timestamp, event ID, source)

### Lambda Function Processing

**FR-NOTIFY-6:** Lambda function can extract recipient email from event payload

**FR-NOTIFY-7:** Lambda function can determine GOV.UK Notify template ID from event detail-type

**FR-NOTIFY-8:** Lambda function can construct personalization object from event payload

**FR-NOTIFY-9:** Lambda function can retrieve GOV.UK Notify API key from Secrets Manager

**FR-NOTIFY-10:** Lambda function can call GOV.UK Notify API to send email notification

**FR-NOTIFY-11:** Lambda function can handle API rate limiting with exponential backoff

**FR-NOTIFY-12:** Lambda function logs structured JSON for debugging and audit

**FR-NOTIFY-13:** Lambda function returns success/failure status for each notification attempt

### Lease Lifecycle Events (4 Events)

**FR-NOTIFY-14:** System sends "Lease Requested" notification when LeaseRequested event received
- Personalizes: user name, template name, request timestamp

**FR-NOTIFY-15:** System sends "Lease Approved" notification when LeaseApproved event received
- Personalizes: user name, AWS account ID, SSO portal URL, expiration date, budget limit

**FR-NOTIFY-16:** System sends "Lease Denied" notification when LeaseDenied event received
- Personalizes: user name, template name, denial reason

**FR-NOTIFY-17:** System sends "Lease Terminated" notification when LeaseTerminated event received
- Personalizes: user name, AWS account ID, termination reason, final cost

### Lease Monitoring Events (7 Events)

**FR-NOTIFY-18:** System sends "Budget Threshold Alert" notification when LeaseBudgetThresholdAlert event received
- Personalizes: user name, current spend, budget limit, threshold percentage

**FR-NOTIFY-19:** System sends "Budget Exceeded" notification when LeaseBudgetExceeded event received
- Personalizes: user name, final spend, budget limit, account status

**FR-NOTIFY-20:** System sends "Duration Threshold Alert" notification when LeaseDurationThresholdAlert event received
- Personalizes: user name, time remaining, expiration date

**FR-NOTIFY-21:** System sends "Freezing Threshold Alert" notification when LeaseFreezingThresholdAlert event received
- Personalizes: user name, reason (budget/time), freeze time

**FR-NOTIFY-22:** System sends "Lease Expired" notification when LeaseExpired event received
- Personalizes: user name, AWS account ID, expiration time, final cost

**FR-NOTIFY-23:** System sends "Lease Frozen" notification when LeaseFrozen event received
- Personalizes: user name, AWS account ID, freeze reason, resume instructions

**FR-NOTIFY-24:** System sends "Lease Unfrozen" notification when LeaseUnfrozen event received
- Personalizes: user name, AWS account ID, SSO portal URL, remaining time/budget

### Account Management Events (5 Events)

**FR-NOTIFY-25:** System sends "Cleanup Requested" notification when CleanAccountRequest event received
- Personalizes: admin name, AWS account ID, cleanup scope

**FR-NOTIFY-26:** System sends "Cleanup Succeeded" notification when AccountCleanupSucceeded event received
- Personalizes: admin/user name, AWS account ID, resources cleaned

**FR-NOTIFY-27:** System sends "Cleanup Failed" notification when AccountCleanupFailed event received
- Personalizes: admin name, AWS account ID, failure reason, manual steps

**FR-NOTIFY-28:** System sends "Account Quarantined" notification when AccountQuarantined event received
- Personalizes: admin name, AWS account ID, quarantine reason, escalation contact

**FR-NOTIFY-29:** System sends "Drift Detected" notification when AccountDriftDetected event received
- Personalizes: admin name, AWS account ID, drift details, remediation guidance

### Cost Reporting Events (2 Events)

**FR-NOTIFY-30:** System sends "Cost Report Generated" notification when GroupCostReportGenerated event received
- Personalizes: manager name, group name, report period, total cost, report URL

**FR-NOTIFY-31:** System sends "Cost Report Failed" notification when GroupCostReportGeneratedFailure event received
- Personalizes: admin name, group name, report period, failure reason

### Error Handling

**FR-NOTIFY-32:** System sends failed notifications to SQS Dead Letter Queue

**FR-NOTIFY-33:** DLQ message includes original event payload, error message, attempt count

**FR-NOTIFY-34:** System retries transient failures (network timeouts, rate limits) before sending to DLQ

**FR-NOTIFY-35:** System logs all notification attempts (success and failure) with correlation ID

**FR-NOTIFY-36:** System handles malformed event payloads gracefully (log error, don't crash)

### Secrets Management

**FR-NOTIFY-37:** System retrieves GOV.UK Notify API key from Secrets Manager at runtime

**FR-NOTIFY-38:** System caches Secrets Manager response within Lambda execution context (reduce API calls)

**FR-NOTIFY-39:** System handles Secrets Manager errors gracefully (log, fail notification to DLQ)

### CloudWatch Monitoring

**FR-NOTIFY-40:** System creates CloudWatch alarm for Lambda invocation errors

**FR-NOTIFY-41:** System creates CloudWatch alarm for DLQ message depth (> 0 messages)

**FR-NOTIFY-42:** System creates CloudWatch alarm for GOV.UK Notify API failures

**FR-NOTIFY-43:** System publishes custom metrics for notification success/failure counts

### GOV.UK Notify Templates

**FR-NOTIFY-44:** System uses 18 distinct GOV.UK Notify templates (one per event type)

**FR-NOTIFY-45:** Templates include standard header with NDX/GOV.UK branding

**FR-NOTIFY-46:** Templates use personalisation fields matching event payload structure

**FR-NOTIFY-47:** Templates include clear call-to-action where appropriate (e.g., "Launch AWS Console")

**FR-NOTIFY-48:** Templates use plain English following GDS content design guidelines

---

## Non-Functional Requirements - GOV.UK Notify Integration

### Performance

**NFR-NOTIFY-PERF-1:** Lambda processes event and sends notification within 5 seconds

**NFR-NOTIFY-PERF-2:** Secrets Manager API key cached for Lambda container lifetime (reduce latency)

**NFR-NOTIFY-PERF-3:** System handles burst of up to 100 events per second without throttling

**NFR-NOTIFY-PERF-4:** DLQ processing latency acceptable (not real-time critical)

### Security

**NFR-NOTIFY-SEC-1:** GOV.UK Notify API key stored in Secrets Manager (never in code or environment variables)

**NFR-NOTIFY-SEC-2:** Lambda IAM role follows least-privilege (only permissions needed for function)

**NFR-NOTIFY-SEC-3:** EventBridge rule scoped to specific event source (Innovation Sandbox only)

**NFR-NOTIFY-SEC-4:** CloudWatch logs do not contain API keys or sensitive credentials

**NFR-NOTIFY-SEC-5:** SQS DLQ encrypted at rest

**NFR-NOTIFY-SEC-6:** Lambda function code scanned for vulnerabilities before deployment

### Reliability

**NFR-NOTIFY-REL-1:** Lambda function has 3 retry attempts before sending to DLQ

**NFR-NOTIFY-REL-2:** DLQ retention period 14 days (sufficient for investigation and retry)

**NFR-NOTIFY-REL-3:** Lambda timeout set appropriately (30 seconds) to allow for API retries

**NFR-NOTIFY-REL-4:** System degrades gracefully if GOV.UK Notify API unavailable (queue to DLQ)

**NFR-NOTIFY-REL-5:** Notification failures don't impact Innovation Sandbox core functionality

### Maintainability

**NFR-NOTIFY-MAINT-1:** CloudFormation template includes clear comments explaining each resource

**NFR-NOTIFY-MAINT-2:** Lambda function code documented with docstrings explaining event handling

**NFR-NOTIFY-MAINT-3:** Template ID mapping configurable (not hardcoded in function logic)

**NFR-NOTIFY-MAINT-4:** Infrastructure changes deployable via single CloudFormation update

**NFR-NOTIFY-MAINT-5:** GOV.UK Notify templates managed in Notify dashboard (not infrastructure)

### Operational Excellence

**NFR-NOTIFY-OPS-1:** CloudWatch dashboard showing notification metrics (success, failure, latency)

**NFR-NOTIFY-OPS-2:** CloudWatch alarms notify operations team via SNS

**NFR-NOTIFY-OPS-3:** Runbook documented for DLQ investigation and retry procedures

**NFR-NOTIFY-OPS-4:** Deployment checklist includes GOV.UK Notify template verification

**NFR-NOTIFY-OPS-5:** Rollback procedure documented for CloudFormation stack

### Scalability

**NFR-NOTIFY-SCALE-1:** Lambda concurrency limit set to prevent GOV.UK Notify rate limit violations

**NFR-NOTIFY-SCALE-2:** Architecture supports adding new event types without code changes (config-driven)

**NFR-NOTIFY-SCALE-3:** System handles 10x growth in Innovation Sandbox usage without modification

### Compliance & Auditability

**NFR-NOTIFY-COMP-1:** All notification attempts logged with correlation ID linking to original event

**NFR-NOTIFY-COMP-2:** CloudWatch logs retained per government data retention policy (minimum 90 days)

**NFR-NOTIFY-COMP-3:** GOV.UK Notify dashboard provides delivery confirmation for audit

**NFR-NOTIFY-COMP-4:** Infrastructure changes tracked via CloudFormation stack history

**NFR-NOTIFY-COMP-5:** DLQ messages include full event context for investigation

### Testing

**NFR-NOTIFY-TEST-1:** Unit tests cover all 18 event type handlers

**NFR-NOTIFY-TEST-2:** Integration tests verify EventBridge to Lambda to Notify flow

**NFR-NOTIFY-TEST-3:** Error handling tested with simulated API failures

**NFR-NOTIFY-TEST-4:** Load testing verifies burst handling capability

**NFR-NOTIFY-TEST-5:** GOV.UK Notify templates tested with sample personalization data

---

# Feature 4: Slack Integration for Operational Alerts

## Executive Summary - Slack Integration

**New Capability:** Send operational alerts and notifications to Slack channels for NDX administrators and operations teams. This integration provides real-time visibility into AWS billing events and Innovation Sandbox account lifecycle events directly in Slack where the team collaborates.

**Current State:** Operations teams must monitor multiple AWS dashboards and email inboxes to stay informed about billing anomalies, spending patterns, and sandbox account status changes. Critical alerts may be missed or delayed.

**Challenge:** Distributed monitoring across AWS Console, email, and other tools creates friction and delays in responding to operational events. Teams need consolidated, real-time alerts where they already work.

**Solution:** Deploy a CloudFormation stack that:
1. Intercepts AWS Billing events for daily spend summaries and anomaly detection
2. Intercepts Innovation Sandbox EventBridge events for account lifecycle alerts
3. Sends formatted notifications to configured Slack channels via Slack API
4. Provides comprehensive error handling with SQS Dead Letter Queue

### What Makes This Special

This is **operational visibility integration** that brings critical alerts directly to the team's collaboration workspace. Rather than requiring constant dashboard monitoring or email checking, this approach:

- **Consolidates alerts** - All operational notifications in one Slack channel
- **Enables rapid response** - Real-time notifications for critical events (account quarantined, frozen)
- **Provides spend visibility** - Daily organization-wide AWS spend summaries
- **Detects anomalies early** - Proactive alerts for unusual billing patterns
- **Reduces context switching** - Operations team stays in Slack, their primary collaboration tool
- **Ensures reliability** - SQS Dead Letter Queue captures failed notifications

The differentiator is **bringing operational awareness to the team** rather than requiring the team to go find the information.

---

## Project Classification - Slack Integration

**Technical Type:** Infrastructure / Serverless Integration
**Domain:** GovTech Operations (UK Government Digital Service)
**Complexity:** Low-Medium

This is a **serverless event processing pipeline** similar to the GOV.UK Notify integration, but targeting Slack channels instead of email. The implementation reuses the same EventBridge pattern with a dedicated Lambda function for Slack API calls.

**Why Infrastructure Project:**
- Deploys AWS resources via CloudFormation
- Lambda function processes events (Python runtime)
- EventBridge rules filter AWS Billing and Innovation Sandbox events
- Secrets Manager stores Slack webhook URL or API token
- SQS Dead Letter Queue for failed notifications

**Domain Context:** As an operations tool for a UK government service:
- Must not expose sensitive information in Slack messages
- AWS account IDs can be included (internal operations use)
- Budget/cost data formatted for clarity
- No PII in alerts (operations-focused, not user-facing)

**Complexity Assessment: Low-Medium**
- **Not High:** Only 5 notification types, established Slack API pattern, similar to existing Notify integration
- **Not Low:** Production government service, requires AWS Billing integration, error handling needed

---

## Success Criteria - Slack Integration

**Primary Success Metric:** Operations team receives all configured alerts in Slack within 60 seconds of the triggering event with zero missed notifications.

**Specific Success Indicators:**

1. **Daily Spend Alert Works:** Every day at configured time, Slack receives org-wide AWS spend for past 24 hours
2. **Anomaly Detection Works:** Unusual billing patterns trigger immediate Slack alert
3. **Account Active Alert:** When Innovation Sandbox account becomes active with user, Slack notified
4. **Quarantine Alert:** When account quarantined, Slack receives immediate alert with details
5. **Frozen Alert:** When account frozen (budget/policy), Slack receives immediate alert
6. **Error Handling Functional:** Failed notifications land in SQS Dead Letter Queue
7. **Secrets Secure:** Slack credentials retrieved from Secrets Manager (not hardcoded)

**What Winning Looks Like:**
- Operations team sees all critical events in their #ndx-alerts Slack channel
- Daily spend summaries help track budget burn rate across organization
- Billing anomalies caught early before they become problems
- Account lifecycle events (quarantine, freeze) get immediate attention
- No manual monitoring of AWS dashboards required for these specific events
- Team can configure which alerts go to which channels

---

## Product Scope - Slack Integration

### MVP - Minimum Viable Product

**Phase 1: Infrastructure Setup**
1. **CloudFormation Stack:** Define stack with all required AWS resources
2. **EventBridge Rules:** Create rules for AWS Billing events and Innovation Sandbox events
3. **Lambda Function:** Python function for event transformation and Slack API calls
4. **SQS Dead Letter Queue:** Queue for failed notification processing
5. **Secrets Manager Secret:** Secure storage for Slack webhook URL or API token
6. **IAM Role:** Lambda execution role with least-privilege permissions

**Phase 2: AWS Billing Alerts (2 Alert Types)**
7. **Daily Spend Summary:** Aggregate org-wide spend for past 24 hours, send to Slack
   - Triggered by CloudWatch scheduled event (daily at configured time)
   - Retrieves Cost Explorer data for previous 24-hour period
   - Formats as Slack Block Kit message with spending breakdown
8. **Billing Anomalies:** Detect unusual spending patterns, alert immediately
   - Triggered by AWS Anomaly Detection service events
   - Includes anomaly details, affected services, projected impact

**Phase 3: Innovation Sandbox EventBridge Alerts (3 Alert Types)**
9. **Account Made Active:** Notify when sandbox account assigned to user
   - Triggered by Innovation Sandbox account activation event
   - Includes user email, AWS account ID, template name
10. **Account Quarantined:** Alert when account quarantined for policy violation
    - Triggered by AccountQuarantined EventBridge event
    - Includes AWS account ID, quarantine reason, escalation guidance
11. **Account Frozen:** Alert when account frozen (budget or policy)
    - Triggered by LeaseFrozen EventBridge event
    - Includes AWS account ID, freeze reason, affected user

**Phase 4: Error Handling & Monitoring**
12. **DLQ Processing:** Failed notifications captured in SQS with message metadata
13. **CloudWatch Alarms:** Alarms for Lambda errors, DLQ depth, API failures
14. **Logging:** Structured logging for debugging and audit trail

**Phase 5: Slack Message Formatting**
15. **Block Kit Templates:** Create Slack Block Kit templates for each alert type
16. **Color Coding:** Use attachment colors (green/yellow/red) for severity
17. **Action Buttons:** Include relevant links (AWS Console, NDX admin pages)

### Growth Features (Post-MVP)

**Enhanced Alerts:**
1. **Weekly/Monthly Summaries:** Digest reports for spending trends
2. **Budget Forecasting Alerts:** Projected month-end spend warnings
3. **Service-Specific Breakdown:** Per-service spending in daily summaries
4. **Custom Thresholds:** Configurable spending thresholds for alerts

**Channel Management:**
5. **Multi-Channel Routing:** Route different alert types to different channels
6. **Alert Severity Levels:** Critical vs warning vs info routing
7. **@mention Support:** Tag specific users for critical alerts
8. **Slack Thread Replies:** Group related alerts in threads

**Integration Expansion:**
9. **Slack Commands:** `/ndx-status` to query current spend or active leases
10. **Interactive Buttons:** Approve/deny actions directly from Slack
11. **Escalation Workflows:** Auto-escalate unacknowledged critical alerts

### Vision (Future)

**Advanced Operations Platform:**
1. **AI-Powered Summaries:** ML-generated insights on spending patterns
2. **Predictive Alerting:** Forecast issues before they occur
3. **Cross-Service Correlation:** Link related events across services
4. **ChatOps Integration:** Full operational control from Slack
5. **On-Call Integration:** Route to PagerDuty/Opsgenie for critical events

---

## Domain-Specific Requirements - Slack Integration (GovTech)

**Government-Specific Requirements for Slack Integration:**

1. **Data Classification:**
   - AWS account IDs acceptable in Slack (internal operations)
   - No user PII in Slack messages (use anonymized identifiers if needed)
   - Budget/cost data in aggregate only (not per-user breakdowns)
   - No sensitive technical details (API keys, secrets, etc.)

2. **Security:**
   - Slack webhook URL stored in Secrets Manager (not environment variables)
   - Lambda role follows least-privilege principle
   - No sensitive data logged to CloudWatch
   - EventBridge rules scoped to specific event sources

3. **Auditability:**
   - All notification attempts logged with correlation IDs
   - Failed notifications retained in DLQ for investigation
   - CloudWatch logs retained per government retention policy
   - Slack message delivery not guaranteed (no receipt confirmation)

4. **Operational Continuity:**
   - Slack notification failures don't impact core NDX/ISB functionality
   - DLQ ensures notifications not permanently lost
   - Alarms enable rapid response to systematic issues
   - Slack downtime handled gracefully (queue and retry)

5. **Compliance:**
   - Slack workspace must be government-approved
   - Channel access controlled by Slack workspace admins
   - No export of government data to unauthorized systems
   - Messages may be subject to retention policies

---

## Functional Requirements - Slack Integration

**Purpose:** Define WHAT capabilities the Slack integration must provide. These are the complete inventory of features enabling operational alerts via Slack.

**Scope:** AWS infrastructure (EventBridge, Lambda, SQS, Secrets Manager, Cost Explorer), Slack API integration, 5 alert type handlers.

### EventBridge Integration

**FR-SLACK-1:** System can deploy EventBridge rule matching Innovation Sandbox event source

**FR-SLACK-2:** EventBridge rule can filter events by detail-type for: AccountActivated, AccountQuarantined, LeaseFrozen

**FR-SLACK-3:** System can deploy CloudWatch scheduled event for daily spend summary

**FR-SLACK-4:** EventBridge rule can target Lambda function for event processing

**FR-SLACK-5:** System preserves all event metadata for processing (timestamp, event ID, source)

### AWS Billing Integration

**FR-SLACK-6:** System can query AWS Cost Explorer API for cost data

**FR-SLACK-7:** System can aggregate spend across all accounts in organization for 24-hour period

**FR-SLACK-8:** System can format spend data by service category

**FR-SLACK-9:** System can receive AWS Anomaly Detection events

**FR-SLACK-10:** System can extract anomaly details (affected services, magnitude, projected impact)

### Lambda Function Processing

**FR-SLACK-11:** Lambda function can determine Slack message template from event type

**FR-SLACK-12:** Lambda function can construct Slack Block Kit message from event payload

**FR-SLACK-13:** Lambda function can retrieve Slack credentials from Secrets Manager

**FR-SLACK-14:** Lambda function can call Slack webhook URL to post message

**FR-SLACK-15:** Lambda function can handle Slack API rate limiting with exponential backoff

**FR-SLACK-16:** Lambda function logs structured JSON for debugging and audit

**FR-SLACK-17:** Lambda function returns success/failure status for each notification attempt

### Daily Spend Alert

**FR-SLACK-18:** System sends daily spend summary at configured time (default: 09:00 UTC)

**FR-SLACK-19:** Summary includes total org spend for past 24 hours

**FR-SLACK-20:** Summary includes spend breakdown by top 5 services

**FR-SLACK-21:** Summary includes comparison to previous day (% change)

**FR-SLACK-22:** Message formatted with Slack Block Kit for readability

### Billing Anomaly Alert

**FR-SLACK-23:** System sends immediate alert when AWS Anomaly Detection triggers

**FR-SLACK-24:** Alert includes affected service(s)

**FR-SLACK-25:** Alert includes anomaly magnitude (% deviation from expected)

**FR-SLACK-26:** Alert includes projected impact if anomaly continues

**FR-SLACK-27:** Alert uses red color attachment for visibility

### Account Activated Alert

**FR-SLACK-28:** System sends alert when Innovation Sandbox account becomes active with user

**FR-SLACK-29:** Alert includes AWS account ID

**FR-SLACK-30:** Alert includes user email (or anonymized identifier)

**FR-SLACK-31:** Alert includes lease template name and duration

**FR-SLACK-32:** Alert uses green color attachment (informational)

### Account Quarantined Alert

**FR-SLACK-33:** System sends immediate alert when account quarantined

**FR-SLACK-34:** Alert includes AWS account ID

**FR-SLACK-35:** Alert includes quarantine reason

**FR-SLACK-36:** Alert includes escalation guidance (who to contact, what to do)

**FR-SLACK-37:** Alert uses red color attachment for urgency

### Account Frozen Alert

**FR-SLACK-38:** System sends immediate alert when account frozen

**FR-SLACK-39:** Alert includes AWS account ID

**FR-SLACK-40:** Alert includes freeze reason (budget exceeded, policy violation, expired)

**FR-SLACK-41:** Alert includes affected user (email or identifier)

**FR-SLACK-42:** Alert uses yellow color attachment for warning

### Error Handling

**FR-SLACK-43:** System sends failed notifications to SQS Dead Letter Queue

**FR-SLACK-44:** DLQ message includes original event payload, error message, attempt count

**FR-SLACK-45:** System retries transient failures (network timeouts, rate limits) before sending to DLQ

**FR-SLACK-46:** System logs all notification attempts (success and failure) with correlation ID

**FR-SLACK-47:** System handles malformed event payloads gracefully (log error, don't crash)

### Secrets Management

**FR-SLACK-48:** System retrieves Slack webhook URL from Secrets Manager at runtime

**FR-SLACK-49:** System caches Secrets Manager response within Lambda execution context

**FR-SLACK-50:** System handles Secrets Manager errors gracefully (log, fail notification to DLQ)

### CloudWatch Monitoring

**FR-SLACK-51:** System creates CloudWatch alarm for Lambda invocation errors

**FR-SLACK-52:** System creates CloudWatch alarm for DLQ message depth (> 0 messages)

**FR-SLACK-53:** System creates CloudWatch alarm for Slack API failures

**FR-SLACK-54:** System publishes custom metrics for notification success/failure counts

---

## Non-Functional Requirements - Slack Integration

### Performance

**NFR-SLACK-PERF-1:** Lambda processes event and sends Slack notification within 5 seconds

**NFR-SLACK-PERF-2:** Daily spend summary retrieves and formats data within 30 seconds

**NFR-SLACK-PERF-3:** Secrets Manager response cached for Lambda container lifetime

**NFR-SLACK-PERF-4:** System handles burst of up to 50 events per second without throttling

### Security

**NFR-SLACK-SEC-1:** Slack webhook URL stored in Secrets Manager (never in code or environment variables)

**NFR-SLACK-SEC-2:** Lambda IAM role follows least-privilege (only permissions needed)

**NFR-SLACK-SEC-3:** EventBridge rules scoped to specific event sources only

**NFR-SLACK-SEC-4:** CloudWatch logs do not contain webhook URLs or sensitive credentials

**NFR-SLACK-SEC-5:** SQS DLQ encrypted at rest

**NFR-SLACK-SEC-6:** Cost Explorer access limited to read-only operations

### Reliability

**NFR-SLACK-REL-1:** Lambda function has 3 retry attempts before sending to DLQ

**NFR-SLACK-REL-2:** DLQ retention period 14 days (sufficient for investigation and retry)

**NFR-SLACK-REL-3:** Lambda timeout set appropriately (60 seconds for Cost Explorer queries)

**NFR-SLACK-REL-4:** System degrades gracefully if Slack API unavailable (queue to DLQ)

**NFR-SLACK-REL-5:** Notification failures don't impact Innovation Sandbox core functionality

**NFR-SLACK-REL-6:** Daily spend summary scheduled with CloudWatch retry on failure

### Maintainability

**NFR-SLACK-MAINT-1:** CloudFormation template includes clear comments explaining each resource

**NFR-SLACK-MAINT-2:** Lambda function code documented with docstrings

**NFR-SLACK-MAINT-3:** Slack Block Kit templates externalized for easy modification

**NFR-SLACK-MAINT-4:** Infrastructure changes deployable via single CloudFormation update

**NFR-SLACK-MAINT-5:** Alert types configurable without code changes

### Operational Excellence

**NFR-SLACK-OPS-1:** CloudWatch dashboard showing notification metrics

**NFR-SLACK-OPS-2:** CloudWatch alarms notify team via separate channel (not the Slack channel receiving alerts)

**NFR-SLACK-OPS-3:** Runbook documented for DLQ investigation and retry procedures

**NFR-SLACK-OPS-4:** Deployment checklist includes Slack channel verification

**NFR-SLACK-OPS-5:** Rollback procedure documented for CloudFormation stack

### Scalability

**NFR-SLACK-SCALE-1:** Lambda concurrency limit set to prevent Slack rate limit violations

**NFR-SLACK-SCALE-2:** Architecture supports adding new alert types without code changes

**NFR-SLACK-SCALE-3:** System handles 10x growth in event volume without modification

### Compliance & Auditability

**NFR-SLACK-COMP-1:** All notification attempts logged with correlation ID

**NFR-SLACK-COMP-2:** CloudWatch logs retained per government data retention policy (minimum 90 days)

**NFR-SLACK-COMP-3:** Infrastructure changes tracked via CloudFormation stack history

**NFR-SLACK-COMP-4:** DLQ messages include full event context for investigation

---

# Feature 5: DynamoDB Lease Enrichment for Notifications

## Executive Summary - DynamoDB Lease Enrichment

**New Capability:** Enrich notification payloads with complete lease data from the Innovation Sandbox LeaseTable in DynamoDB. When EventBridge events trigger notifications, the system fetches the full lease record and includes all fields in the notification payload sent to both GOV.UK Notify and Slack.

**Current State:** EventBridge events from Innovation Sandbox contain only essential event data - a subset of the full lease record. Notifications miss valuable context like `leaseDurationInHours`, `budgetThresholds`, `meta.createdTime`, and other operational details.

**Challenge:** Both GOV.UK Notify templates and Slack Block Kit messages need access to comprehensive lease data for debugging, operations, and user context. However, GOV.UK Notify and Slack APIs don't support nested objects or arrays - all values must be flat key-value pairs.

**Solution:** Extend the notification Lambda to:
1. Extract `leaseId` (or `userEmail` + `uuid`) from EventBridge events
2. Query DynamoDB LeaseTable for the complete lease record
3. Flatten nested objects and arrays into flat key-value format
4. Include a `keys` parameter listing all flattened field names for debugging
5. Send enriched, flattened payload to GOV.UK Notify and Slack

### What Makes This Special

This is **context-rich notification enrichment** that transforms basic event notifications into comprehensive, actionable alerts. Rather than receiving minimal event data, recipients get:

- **Complete lease context** - All lease fields including duration, budget limits, thresholds, timestamps
- **Debugging capability** - The `keys` parameter lists all available fields for troubleshooting
- **Flat structure compatibility** - Nested objects and arrays transformed for Notify/Slack APIs
- **Operational visibility** - Fields like `totalCostAccrued`, `lastCheckedDate`, `approvedBy` aid ops response
- **Graceful degradation** - If DynamoDB unavailable, notifications proceed with event data only

The differentiator is **maximizing notification value** by providing complete context without requiring changes to downstream notification templates.

---

## Project Classification - DynamoDB Lease Enrichment

**Technical Type:** Infrastructure / Lambda Enhancement
**Domain:** GovTech (UK Government Digital Service)
**Complexity:** Low-Medium

This is an **enhancement to the existing notification Lambda** that adds DynamoDB query capability and payload transformation logic. The change is contained: one Lambda modification, one IAM permission addition, no new AWS resources.

**Why Infrastructure Enhancement:**
- Modifies existing notification Lambda function
- Adds DynamoDB read permissions to Lambda IAM role
- Implements data transformation logic (flattening)
- No new CloudFormation resources required

**Domain Context:** As an enhancement to UK government notifications:
- Enriched data aids operational response to account events
- Flattened structure ensures GOV.UK Notify template compatibility
- Debug `keys` parameter aids support team troubleshooting
- No additional PII exposure (LeaseTable data already in scope)

**Complexity Assessment: Low-Medium**
- **Not High:** Single Lambda enhancement, standard DynamoDB query pattern, pure data transformation
- **Not Low:** Must handle 8 lease states correctly, flatten complex nested structures, graceful degradation required

---

## Success Criteria - DynamoDB Lease Enrichment

**Primary Success Metric:** All lease-related notifications include full LeaseTable data with field `leaseDurationInHours` visible in both Slack messages and GOV.UK Notify personalisation.

**Specific Success Indicators:**

1. **DynamoDB Query Works:** Lambda successfully queries LeaseTable using `userEmail` and `uuid` from event
2. **Flattening Works:** Nested structures correctly flattened (e.g., `meta.createdTime` → `meta_createdTime`)
3. **Array Flattening Works:** Arrays correctly indexed (e.g., `budgetThresholds[0].dollarsSpent` → `budgetThresholds_0_dollarsSpent`)
4. **Keys Parameter Present:** Every notification includes `keys` field with comma-separated list of all field names
5. **GOV.UK Notify Receives Fields:** Template personalisation includes enriched fields like `leaseDurationInHours`
6. **Slack Receives Fields:** Block Kit messages can reference enriched fields like `leaseDurationInHours`
7. **Graceful Degradation:** If lease not found or DynamoDB error, notification proceeds with event data only

**What Winning Looks Like:**
- Operations team sees `leaseDurationInHours: 24` in Slack alerts
- GOV.UK Notify emails include lease duration, budget limits, and approval info
- Debug `keys` field shows exactly which fields are available: `"keys": "userEmail,uuid,status,leaseDurationInHours,maxSpend,..."`
- Nested fields like `meta.createdTime` appear as `meta_createdTime` in flat format
- Array items like `budgetThresholds[0]` appear as `budgetThresholds_0_dollarsSpent`, `budgetThresholds_0_action`
- No notification failures due to enrichment errors

---

## Product Scope - DynamoDB Lease Enrichment

### MVP - Minimum Viable Product

**Phase 1: DynamoDB Integration**
1. **IAM Permissions:** Add `dynamodb:GetItem` permission to notification Lambda role for LeaseTable
2. **Cross-Account Access:** If LeaseTable in different account, configure cross-account IAM role assumption
3. **LeaseTable Reference:** Store LeaseTable name/ARN in environment variable or Secrets Manager

**Phase 2: Lease Query Logic**
4. **Extract Lease Key:** Parse `userEmail` and `uuid` (or `leaseId`) from EventBridge event detail
5. **Query DynamoDB:** Execute GetItem with composite key (`userEmail` PK, `uuid` SK)
6. **Handle Not Found:** If lease doesn't exist, log warning and continue with event data only
7. **Handle Errors:** If DynamoDB error, log error, metric, and continue with event data only

**Phase 3: Payload Flattening**
8. **Flatten Nested Objects:** Transform `{meta: {createdTime: "2025-01-01"}}` → `{meta_createdTime: "2025-01-01"}`
9. **Flatten Arrays of Objects:** Transform `{budgetThresholds: [{dollarsSpent: 50, action: "ALERT"}]}` → `{budgetThresholds_0_dollarsSpent: "50", budgetThresholds_0_action: "ALERT"}`
10. **Flatten Arrays of Primitives:** Transform `{tags: ["a", "b"]}` → `{tags_0: "a", tags_1: "b"}`
11. **Handle Null/Undefined:** Skip null and undefined values in flattened output
12. **Stringify Values:** Convert all values to strings for Notify/Slack compatibility

**Phase 4: Keys Parameter**
13. **Generate Keys List:** Create comma-separated string of all flattened field names
14. **Include in Payload:** Add `keys` field to every notification payload
15. **Alphabetical Order:** Sort keys alphabetically for consistent debugging

**Phase 5: Integration**
16. **Merge with Event Data:** Combine enriched lease data with original event data (lease data takes precedence)
17. **Send to GOV.UK Notify:** Pass enriched, flattened payload as personalisation object
18. **Send to Slack:** Reference enriched fields in Block Kit message templates

### LeaseTable Schema Reference

**All Leases (Base Schema):**
- `userEmail` (string, email) - Partition key
- `uuid` (string, UUID) - Sort key
- `status` (string) - PendingApproval | ApprovalDenied | Active | Frozen | Expired | BudgetExceeded | ManuallyTerminated | AccountQuarantined | Ejected
- `originalLeaseTemplateUuid` (string)
- `originalLeaseTemplateName` (string)
- `leaseDurationInHours` (number)
- `comments` (string, optional)
- `maxSpend` (number, optional)
- `budgetThresholds` (array) - `[{dollarsSpent: number, action: "ALERT"|"FREEZE_ACCOUNT"}]`
- `durationThresholds` (array) - `[{hoursRemaining: number, action: "ALERT"|"FREEZE_ACCOUNT"}]`
- `meta` (object) - `{createdTime: datetime, lastEditTime: datetime, schemaVersion: number}`

**Monitored Leases (Active/Frozen - additional fields):**
- `awsAccountId` (string, 12 digits)
- `approvedBy` (string) - email or "AUTO_APPROVED"
- `startDate` (ISO 8601 datetime)
- `expirationDate` (ISO 8601 datetime, optional)
- `lastCheckedDate` (ISO 8601 datetime)
- `totalCostAccrued` (number)

**Expired Leases (additional fields):**
- `endDate` (ISO 8601 datetime)
- `ttl` (number, Unix timestamp)

### Example Flattened Output

**Input (DynamoDB Lease Record):**
```json
{
  "userEmail": "user@example.gov.uk",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "Active",
  "leaseDurationInHours": 24,
  "maxSpend": 50,
  "budgetThresholds": [
    {"dollarsSpent": 25, "action": "ALERT"},
    {"dollarsSpent": 45, "action": "FREEZE_ACCOUNT"}
  ],
  "durationThresholds": [
    {"hoursRemaining": 4, "action": "ALERT"}
  ],
  "meta": {
    "createdTime": "2025-01-15T10:00:00Z",
    "lastEditTime": "2025-01-15T12:30:00Z",
    "schemaVersion": 1
  },
  "awsAccountId": "123456789012",
  "approvedBy": "admin@example.gov.uk",
  "startDate": "2025-01-15T12:30:00Z",
  "expirationDate": "2025-01-16T12:30:00Z",
  "totalCostAccrued": 12.50
}
```

**Output (Flattened for Notify/Slack):**
```json
{
  "userEmail": "user@example.gov.uk",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "Active",
  "leaseDurationInHours": "24",
  "maxSpend": "50",
  "budgetThresholds_0_dollarsSpent": "25",
  "budgetThresholds_0_action": "ALERT",
  "budgetThresholds_1_dollarsSpent": "45",
  "budgetThresholds_1_action": "FREEZE_ACCOUNT",
  "durationThresholds_0_hoursRemaining": "4",
  "durationThresholds_0_action": "ALERT",
  "meta_createdTime": "2025-01-15T10:00:00Z",
  "meta_lastEditTime": "2025-01-15T12:30:00Z",
  "meta_schemaVersion": "1",
  "awsAccountId": "123456789012",
  "approvedBy": "admin@example.gov.uk",
  "startDate": "2025-01-15T12:30:00Z",
  "expirationDate": "2025-01-16T12:30:00Z",
  "totalCostAccrued": "12.50",
  "keys": "approvedBy,awsAccountId,budgetThresholds_0_action,budgetThresholds_0_dollarsSpent,budgetThresholds_1_action,budgetThresholds_1_dollarsSpent,durationThresholds_0_action,durationThresholds_0_hoursRemaining,expirationDate,leaseDurationInHours,maxSpend,meta_createdTime,meta_lastEditTime,meta_schemaVersion,startDate,status,totalCostAccrued,userEmail,uuid"
}
```

### Growth Features (Post-MVP)

**Enhanced Enrichment:**
1. **Template Data Enrichment:** Also fetch LeaseTemplate record for template-specific fields
2. **Account Data Enrichment:** Fetch SandboxAccount record for account-specific details
3. **User Data Enrichment:** Fetch user profile data if available
4. **Historical Data:** Include previous lease status for state change context

**Performance Optimizations:**
5. **Batch Queries:** If multiple leases in event, batch DynamoDB queries
6. **Caching:** Cache lease data within Lambda container for repeated queries
7. **Parallel Queries:** Query lease and template data in parallel

**Debugging Enhancements:**
8. **Enrichment Metadata:** Add `_enriched: true`, `_enrichmentTime: "50ms"` fields
9. **Source Tracking:** Add `_source: "dynamodb"` vs `_source: "event"` per field
10. **Schema Version:** Include `_leaseSchemaVersion` for compatibility tracking

### Vision (Future)

**Advanced Data Platform:**
1. **Real-Time Enrichment Cache:** DynamoDB Streams populate enrichment cache
2. **Cross-Service Enrichment:** Enrich with data from other NDX services
3. **ML-Powered Context:** Add predicted risk scores, anomaly flags
4. **Audit Trail Enrichment:** Include related events from last 24 hours

---

## Functional Requirements - DynamoDB Lease Enrichment

**Purpose:** Define WHAT capabilities the DynamoDB enrichment must provide. These requirements apply to both GOV.UK Notify and Slack notification paths.

**Scope:** Lambda function enhancement, DynamoDB query, payload transformation, error handling.

### DynamoDB Integration

**FR-ENRICH-1:** System can extract `userEmail` and `uuid` from EventBridge event detail for lease lookup

**FR-ENRICH-2:** System can query DynamoDB LeaseTable using composite key (`userEmail` partition key, `uuid` sort key)

**FR-ENRICH-3:** System retrieves complete lease record including all fields for the lease's current status

**FR-ENRICH-4:** System handles lease not found gracefully (log warning, proceed with event data only)

**FR-ENRICH-5:** System handles DynamoDB errors gracefully (log error, emit metric, proceed with event data only)

**FR-ENRICH-6:** System caches DynamoDB client within Lambda container for connection reuse

### Payload Flattening - Objects

**FR-ENRICH-7:** System transforms nested objects using underscore separator: `{parent: {child: value}}` → `{parent_child: value}`

**FR-ENRICH-8:** System handles multiple levels of nesting: `{a: {b: {c: value}}}` → `{a_b_c: value}`

**FR-ENRICH-9:** System handles the `meta` object: `meta.createdTime` → `meta_createdTime`

**FR-ENRICH-10:** System handles the `meta` object: `meta.lastEditTime` → `meta_lastEditTime`

**FR-ENRICH-11:** System handles the `meta` object: `meta.schemaVersion` → `meta_schemaVersion`

### Payload Flattening - Arrays

**FR-ENRICH-12:** System transforms arrays of objects using index notation: `{arr: [{a: 1}, {a: 2}]}` → `{arr_0_a: "1", arr_1_a: "2"}`

**FR-ENRICH-13:** System handles `budgetThresholds` array: `budgetThresholds[0].dollarsSpent` → `budgetThresholds_0_dollarsSpent`

**FR-ENRICH-14:** System handles `budgetThresholds` array: `budgetThresholds[0].action` → `budgetThresholds_0_action`

**FR-ENRICH-15:** System handles `durationThresholds` array: `durationThresholds[0].hoursRemaining` → `durationThresholds_0_hoursRemaining`

**FR-ENRICH-16:** System handles `durationThresholds` array: `durationThresholds[0].action` → `durationThresholds_0_action`

**FR-ENRICH-17:** System transforms arrays of primitives: `{tags: ["a", "b"]}` → `{tags_0: "a", tags_1: "b"}`

**FR-ENRICH-18:** System handles empty arrays gracefully (no output fields generated)

### Value Stringification

**FR-ENRICH-19:** System converts all values to strings for GOV.UK Notify/Slack compatibility

**FR-ENRICH-20:** System converts numbers to strings: `{maxSpend: 50}` → `{maxSpend: "50"}`

**FR-ENRICH-21:** System converts booleans to strings: `{active: true}` → `{active: "true"}`

**FR-ENRICH-22:** System preserves string values unchanged

**FR-ENRICH-23:** System skips null values (not included in flattened output)

**FR-ENRICH-24:** System skips undefined values (not included in flattened output)

### Keys Parameter

**FR-ENRICH-25:** System generates `keys` field containing comma-separated list of all flattened field names

**FR-ENRICH-26:** Keys are sorted alphabetically for consistent ordering

**FR-ENRICH-27:** Keys list does not include the `keys` field itself (avoids self-reference)

**FR-ENRICH-28:** Keys parameter is present in every notification payload (GOV.UK Notify and Slack)

### Integration with Existing Notifications

**FR-ENRICH-29:** System merges enriched lease data with original EventBridge event data

**FR-ENRICH-30:** Enriched lease data takes precedence over event data for duplicate fields

**FR-ENRICH-31:** System passes enriched, flattened payload to GOV.UK Notify as personalisation object

**FR-ENRICH-32:** System references enriched fields in Slack Block Kit message templates

**FR-ENRICH-33:** System includes `leaseDurationInHours` in both GOV.UK Notify and Slack payloads

**FR-ENRICH-34:** System includes `maxSpend` in both GOV.UK Notify and Slack payloads

**FR-ENRICH-35:** System includes `totalCostAccrued` in both GOV.UK Notify and Slack payloads (when present)

### Error Handling

**FR-ENRICH-36:** System logs warning when lease not found in DynamoDB (includes `userEmail`, `uuid` for debugging)

**FR-ENRICH-37:** System emits CloudWatch metric `LeaseNotFound` when lease lookup fails

**FR-ENRICH-38:** System logs error when DynamoDB query fails (includes error type, not credentials)

**FR-ENRICH-39:** System emits CloudWatch metric `DynamoDBError` when query fails

**FR-ENRICH-40:** System proceeds with notification using event data only when enrichment fails

**FR-ENRICH-41:** System includes `_enriched: false` flag when enrichment was not successful

**FR-ENRICH-42:** System includes `_enriched: true` flag when enrichment was successful

### Lease Status Handling

**FR-ENRICH-43:** System correctly enriches PendingApproval leases (base fields only)

**FR-ENRICH-44:** System correctly enriches ApprovalDenied leases (base fields + ttl)

**FR-ENRICH-45:** System correctly enriches Active leases (base fields + monitored fields)

**FR-ENRICH-46:** System correctly enriches Frozen leases (base fields + monitored fields)

**FR-ENRICH-47:** System correctly enriches Expired leases (base fields + monitored fields + expired fields)

**FR-ENRICH-48:** System correctly enriches BudgetExceeded leases (base fields + monitored fields + expired fields)

**FR-ENRICH-49:** System correctly enriches ManuallyTerminated leases (base fields + monitored fields + expired fields)

**FR-ENRICH-50:** System correctly enriches AccountQuarantined leases (base fields + monitored fields + expired fields)

---

## Non-Functional Requirements - DynamoDB Lease Enrichment

### Performance

**NFR-ENRICH-PERF-1:** DynamoDB GetItem query completes within 100ms (99th percentile)

**NFR-ENRICH-PERF-2:** Payload flattening completes within 10ms for typical lease records

**NFR-ENRICH-PERF-3:** Total enrichment overhead (query + flatten) adds < 200ms to notification latency

**NFR-ENRICH-PERF-4:** DynamoDB client reused across Lambda invocations (connection pooling)

**NFR-ENRICH-PERF-5:** Enrichment failure does not block notification delivery (timeout fallback)

### Security

**NFR-ENRICH-SEC-1:** Lambda IAM role has minimum required permissions: `dynamodb:GetItem` on LeaseTable only

**NFR-ENRICH-SEC-2:** Cross-account access (if required) uses IAM role assumption, not hardcoded credentials

**NFR-ENRICH-SEC-3:** LeaseTable ARN stored in environment variable, not hardcoded in Lambda code

**NFR-ENRICH-SEC-4:** CloudWatch logs do not contain full lease records (only field names, counts)

**NFR-ENRICH-SEC-5:** Error logs do not expose DynamoDB connection strings or credentials

### Reliability

**NFR-ENRICH-REL-1:** Enrichment failures do not cause notification failures (graceful degradation)

**NFR-ENRICH-REL-2:** DynamoDB provisioned capacity or on-demand mode handles notification burst load

**NFR-ENRICH-REL-3:** Lambda retries transient DynamoDB errors once before giving up

**NFR-ENRICH-REL-4:** Enrichment timeout set to 2 seconds (proceed without enrichment if exceeded)

**NFR-ENRICH-REL-5:** System handles DynamoDB throttling gracefully (emit metric, proceed without enrichment)

### Maintainability

**NFR-ENRICH-MAINT-1:** Flattening logic is a separate, testable function (unit testable in isolation)

**NFR-ENRICH-MAINT-2:** LeaseTable schema changes handled gracefully (unknown fields passed through)

**NFR-ENRICH-MAINT-3:** Flattening separator (`_`) configurable for future changes

**NFR-ENRICH-MAINT-4:** Code documented with examples of flattening transformations

**NFR-ENRICH-MAINT-5:** Unit tests cover all lease statuses and field types

### Observability

**NFR-ENRICH-OBS-1:** CloudWatch metrics for enrichment success/failure counts

**NFR-ENRICH-OBS-2:** CloudWatch metrics for DynamoDB query latency (p50, p99)

**NFR-ENRICH-OBS-3:** Structured log field `enrichmentStatus: "success"|"failed"|"skipped"`

**NFR-ENRICH-OBS-4:** Structured log field `enrichmentDurationMs` for performance monitoring

**NFR-ENRICH-OBS-5:** CloudWatch alarm for enrichment failure rate > 5%

### Testing

**NFR-ENRICH-TEST-1:** Unit tests cover flattening of all field types (string, number, boolean, object, array)

**NFR-ENRICH-TEST-2:** Unit tests cover all 8 lease statuses with their specific fields

**NFR-ENRICH-TEST-3:** Unit tests cover error scenarios (lease not found, DynamoDB error, timeout)

**NFR-ENRICH-TEST-4:** Integration tests verify DynamoDB query with real LeaseTable

**NFR-ENRICH-TEST-5:** Integration tests verify enriched payload reaches GOV.UK Notify and Slack

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

**Feature 3: GOV.UK Notify Integration (PLANNED)**
- **48 Functional Requirements** across 9 capability areas:
  - EventBridge Integration (5 FRs)
  - Lambda Function Processing (8 FRs)
  - Lease Lifecycle Events (4 FRs)
  - Lease Monitoring Events (7 FRs)
  - Account Management Events (5 FRs)
  - Cost Reporting Events (2 FRs)
  - Error Handling (5 FRs)
  - Secrets Management (3 FRs)
  - CloudWatch Monitoring (4 FRs)
  - GOV.UK Notify Templates (5 FRs)

- **27 Non-Functional Requirements** across 8 quality dimensions:
  - Performance (4 NFRs)
  - Security (6 NFRs)
  - Reliability (5 NFRs)
  - Maintainability (5 NFRs)
  - Operational Excellence (5 NFRs)
  - Scalability (3 NFRs)
  - Compliance & Auditability (5 NFRs)
  - Testing (5 NFRs)

**Feature 4: Slack Integration (PLANNED)**
- **54 Functional Requirements** across 10 capability areas:
  - EventBridge Integration (5 FRs)
  - AWS Billing Integration (5 FRs)
  - Lambda Function Processing (7 FRs)
  - Daily Spend Alert (5 FRs)
  - Billing Anomaly Alert (5 FRs)
  - Account Activated Alert (5 FRs)
  - Account Quarantined Alert (5 FRs)
  - Account Frozen Alert (5 FRs)
  - Error Handling (5 FRs)
  - Secrets Management (3 FRs)
  - CloudWatch Monitoring (4 FRs)

- **25 Non-Functional Requirements** across 7 quality dimensions:
  - Performance (4 NFRs)
  - Security (6 NFRs)
  - Reliability (6 NFRs)
  - Maintainability (5 NFRs)
  - Operational Excellence (5 NFRs)
  - Scalability (3 NFRs)
  - Compliance & Auditability (4 NFRs)

**Feature 5: DynamoDB Lease Enrichment (PLANNED)**
- **50 Functional Requirements** across 6 capability areas:
  - DynamoDB Integration (6 FRs)
  - Payload Flattening - Objects (5 FRs)
  - Payload Flattening - Arrays (7 FRs)
  - Value Stringification (6 FRs)
  - Keys Parameter (4 FRs)
  - Integration with Existing Notifications (7 FRs)
  - Error Handling (7 FRs)
  - Lease Status Handling (8 FRs)

- **25 Non-Functional Requirements** across 6 quality dimensions:
  - Performance (5 NFRs)
  - Security (5 NFRs)
  - Reliability (5 NFRs)
  - Maintainability (5 NFRs)
  - Observability (5 NFRs)
  - Testing (5 NFRs)

**Combined Totals:**
- **275 Functional Requirements**
- **159 Non-Functional Requirements**
- **434 Total Requirements**

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

## Key Deliverables - GOV.UK Notify Integration (PLANNED)

1. CloudFormation stack deploying all required AWS resources
2. EventBridge rule intercepting all 18 Innovation Sandbox event types
3. Python Lambda function transforming events to GOV.UK Notify API calls
4. SQS Dead Letter Queue for failed notification handling
5. Secrets Manager secret storing GOV.UK Notify API key
6. IAM role with least-privilege permissions
7. CloudWatch alarms for Lambda errors and DLQ depth
8. 18 GOV.UK Notify email templates (one per event type)
9. Structured logging for debugging and audit trail
10. Deployment runbook and rollback procedures

**Success Validation:**
- All 18 Innovation Sandbox event types trigger corresponding notifications
- Users receive GOV.UK-branded emails instead of AWS SES defaults
- Failed notifications captured in DLQ for investigation and retry
- CloudWatch alarms alert operations team to systematic issues
- GOV.UK Notify dashboard shows delivery confirmation
- Zero notification failures in normal operation

---

## Key Deliverables - Slack Integration (PLANNED)

1. CloudFormation stack deploying all required AWS resources
2. EventBridge rules for AWS Billing and Innovation Sandbox events
3. CloudWatch scheduled event for daily spend summary
4. Python Lambda function for event transformation and Slack API calls
5. SQS Dead Letter Queue for failed notification handling
6. Secrets Manager secret storing Slack webhook URL
7. IAM role with least-privilege permissions
8. CloudWatch alarms for Lambda errors and DLQ depth
9. 5 Slack Block Kit message templates (daily spend, anomaly, activated, quarantined, frozen)
10. Structured logging for debugging and audit trail
11. Deployment runbook and rollback procedures

**Success Validation:**
- Daily spend summaries posted to Slack at configured time (09:00 UTC default)
- Billing anomalies trigger immediate Slack alerts with affected services
- Account activation, quarantine, and freeze events trigger Slack notifications
- Operations team receives all alerts in #ndx-alerts channel
- Failed notifications captured in DLQ for investigation
- CloudWatch alarms alert on systematic issues
- No missed notifications in normal operation

---

## Key Deliverables - DynamoDB Lease Enrichment (PLANNED)

1. Lambda function enhancement with DynamoDB query capability
2. IAM role update with `dynamodb:GetItem` permission for LeaseTable
3. Payload flattening utility function (nested objects → underscore-separated keys)
4. Array flattening logic (indexed keys: `array_0_field`, `array_1_field`)
5. Value stringification for GOV.UK Notify/Slack compatibility
6. `keys` parameter generation with alphabetically sorted field list
7. Graceful degradation when lease not found or DynamoDB errors
8. CloudWatch metrics for enrichment success/failure/latency
9. Unit tests covering all 8 lease statuses and field types
10. Integration tests verifying enriched payloads reach Notify/Slack

**Success Validation:**
- Slack messages include `leaseDurationInHours` field with lease duration value
- GOV.UK Notify personalisation includes `leaseDurationInHours`, `maxSpend`, `budgetThresholds_0_dollarsSpent`
- Nested fields appear flattened: `meta.createdTime` → `meta_createdTime`
- Array fields appear indexed: `budgetThresholds[0].action` → `budgetThresholds_0_action`
- Every notification includes `keys` parameter listing all available fields
- Enrichment failures logged but don't block notification delivery
- `_enriched: true/false` flag indicates enrichment status

---

## Product Value Summary

This PRD captures requirements for **five critical NDX capabilities** that together enable safe platform evolution, accelerated service evaluation, professional government communications, operational visibility, and context-rich notifications for UK government users:

### CloudFront Origin Routing (COMPLETED)
**Safe, low-risk UI evolution** via surgical infrastructure enhancement. The cookie-based routing enables the strangler pattern for UI modernization without risking production stability for the £2B government procurement platform.

### Try Before You Buy (IN DEVELOPMENT)
**Self-service sandbox provisioning** that removes procurement friction from cloud service evaluation. Government users can test AWS services hands-on before committing to procurement, accelerating digital transformation while maintaining strict GovTech compliance (WCAG 2.2, GOV.UK Design System, budget controls, auditability).

### GOV.UK Notify Integration (PLANNED)
**Government-branded notifications** replacing default AWS SES emails with professional GOV.UK Notify-powered communications. Users receive clear, GDS-compliant notifications for all Innovation Sandbox events - from lease approvals to budget alerts - ensuring the NDX experience remains consistent and professional throughout the user journey.

### Slack Integration (PLANNED)
**Real-time operational visibility** bringing critical alerts directly to the team's collaboration workspace. Operations teams receive daily AWS spend summaries, billing anomaly alerts, and Innovation Sandbox account lifecycle notifications in Slack - reducing context switching and enabling rapid response to operational events.

### DynamoDB Lease Enrichment (PLANNED)
**Context-rich notification payloads** that transform basic event alerts into comprehensive, actionable messages. By enriching notifications with complete LeaseTable data, operations and users receive full lease context including duration, budget thresholds, timestamps, and approval info - with a debugging `keys` parameter listing all available fields. Nested structures are flattened for GOV.UK Notify/Slack compatibility.

The infrastructure-as-code approach via CDK, CloudFormation, and client-side TypeScript ensures **reproducibility, auditability, and transparency** - critical requirements for public sector platforms. This methodical approach demonstrates government service engineering best practices: make surgical changes, validate thoroughly, and build capabilities that serve government users effectively.

**Business Impact:**
- **CloudFront Routing:** Enables confident UI evolution with real-user testing before full rollout
- **Try Before You Buy:** Reduces procurement cycle time from weeks to seconds, enabling informed decision-making for cloud service adoption
- **GOV.UK Notify Integration:** Delivers professional, branded communications that reinforce trust and clarity for government users evaluating cloud services
- **Slack Integration:** Provides operational visibility with daily spend tracking, anomaly detection, and critical event alerting for proactive issue resolution
- **DynamoDB Lease Enrichment:** Maximizes notification value with complete lease context, enabling faster debugging and more informed operational response

---

_This PRD captures requirements for NDX CloudFront cookie-based origin routing, Try Before You Buy (AWS Innovation Sandbox integration), GOV.UK Notify integration, and Slack integration - enabling safe UI evolution, accelerated service evaluation, professional government communications, and operational visibility for a critical UK government procurement platform._

_Created through collaborative discovery between cns and AI facilitator._
