# Sprint Change Proposal: Playwright E2E Testing Infrastructure

**Date:** 2025-11-24
**Project:** NDX (National Digital Exchange)
**Prepared by:** correct-course workflow
**Status:** Awaiting Approval

---

## Executive Summary

**Issue:** Playwright end-to-end testing infrastructure was identified in PRD as Phase 2-3 requirement but was deferred during implementation. With Epic 5 (Authentication) nearing completion and Epic 8 (Accessibility) in backlog, the missing testing infrastructure now blocks critical accessibility compliance work and prevents automated validation of completed authentication features.

**Recommendation:** Add two new stories - Story 8.0 (Playwright infrastructure setup) and Story 5.11 (Authentication E2E tests) - to establish testing foundation before Epic 8 begins.

**Impact:** 2-3 days of work, unblocks Epic 8 (Accessibility), enables automated testing for Epics 5-8.

**Scope:** Infrastructure addition - no feature changes, no existing work rollback.

---

## Section 1: Issue Summary

### Problem Statement

During implementation of Epic 5 (Authentication Foundation), Playwright end-to-end testing infrastructure was identified as necessary but deferred as "non-MVP." However, the PRD explicitly includes Playwright as a foundational requirement:

- **PRD Line 624:** "Phase 2-3: Testing Infrastructure" lists Playwright validation
- **NFR-TRY-TEST-1:** "End-to-end tests prove proxy and app server integration (Playwright)"
- **NFR-TRY-TEST-4:** "Authentication flow tested with real OAuth redirect (not just mocked)"
- **NFR-TRY-TEST-7:** "Accessibility automated tests run in CI pipeline"

### Discovery Context

**When Identified:** During Story 5.4 (sessionStorage JWT Persistence) review
**Triggered By:** User request to "get playwright setup, somehow it fell into something that has been delayed as not MVP"
**Current Status:** Story 5.4 in review with manual validation only; no automated E2E tests exist

### Evidence

1. **playwright-config.json exists** with proxy configuration (port 8081) but Playwright not installed
2. **package.json** shows no @playwright/test dependency
3. **Epic 4 complete:** mitmproxy infrastructure established (Stories 4.1-4.6) creating testing foundation
4. **Epic 8 blocked:** Story 8.2 "Automated Accessibility Testing in CI Pipeline" requires Playwright
5. **PRD requirements unmet:** 7 NFRs reference Playwright/E2E testing, none implemented

### Impact Without Resolution

- **Epic 8 blocked:** Cannot begin accessibility testing (WCAG 2.2 compliance)
- **No regression testing:** Authentication work (Stories 5.1-5.4) not protected by automated tests
- **Integration stories blocked:** Stories 6.10 (Epic 6-7 Integration Testing) and 7.12 (E2E User Journey Validation) need Playwright
- **Compliance risk:** WCAG 2.2 AA/AAA validation impossible without automated accessibility testing

---

## Section 2: Impact Analysis

### Epic Impact

#### Epic 5: Authentication Foundation (DONE - Story 5.4 in review)

- **Status:** Can be completed as originally planned with one addition
- **Impact:** Missing automated E2E tests for authentication flows
- **Stories Affected:**
  - Story 5.10: "Automated Accessibility Tests for Auth UI" **BLOCKED** by missing Playwright
  - Stories 5.1-5.4: Completed with manual validation only, need automated regression tests
- **Required Change:** Add Story 5.11 "Authentication E2E Test Suite" to validate completed work

#### Epic 6: Catalogue Integration & Sandbox Requests (Backlog)

- **Impact:** Medium
- **Stories Affected:**
  - Story 6.10: "Epic 6-7 Integration Testing" **BLOCKED** by missing Playwright
- **Required Change:** Ensure Playwright infrastructure complete before Epic 6.10

#### Epic 7: Try Sessions Dashboard (Backlog)

- **Impact:** Medium
- **Stories Affected:**
  - Story 7.12: "End-to-End User Journey Validation" **BLOCKED** by missing Playwright
- **Required Change:** Ensure Playwright infrastructure complete before Epic 7.12

#### Epic 8: Accessible & Mobile-Friendly Experience (Backlog)

- **Impact:** **HIGH - BLOCKING**
- **Status:** **CANNOT BEGIN** without testing infrastructure
- **Stories Affected:**
  - Story 8.2: "Automated Accessibility Testing in CI Pipeline" **BLOCKED**
  - Story 8.7: "Keyboard Navigation Testing" needs E2E infrastructure
  - Story 8.8: "Screen Reader Testing" needs E2E infrastructure
  - Story 8.9: "Focus Management Testing" needs E2E infrastructure
- **Required Change:** Add Story 8.0 "E2E Testing Infrastructure Setup" as **prerequisite** for entire epic

### Artifact Conflicts

#### PRD (docs/prd.md)

- **Conflict Type:** Implementation gap vs documented requirements
- **Details:**
  - PRD lists Playwright as Phase 2-3 MVP requirement
  - 7 NFRs explicitly require Playwright/E2E testing
  - Implementation treated as post-MVP and deferred
- **Required Change:** No content changes needed; document acknowledges Playwright as deferred MVP infrastructure debt to be resolved before Epic 8

#### Architecture Document (docs/architecture.md)

- **Conflict Type:** Missing testing architecture section
- **Details:**
  - Current architecture covers CloudFront routing only (Feature 1)
  - No documentation for testing infrastructure, E2E patterns, CI integration
- **Required Change:**
  - Add "Testing Architecture" section documenting Playwright configuration, test organization, CI pipeline
  - Add ADR-006: "Playwright for E2E Testing" decision record
  - Document integration with mitmproxy (Epic 4)

#### CI/CD Pipeline

- **Conflict Type:** No automated testing pipeline exists
- **Details:**
  - No .github/workflows/test.yml found
  - Tests not running automatically on PR/push
- **Required Change:**
  - Create GitHub Actions workflow
  - Configure Jest (unit) + Playwright (E2E) execution
  - Set up mitmproxy as CI service

#### Documentation (README.md)

- **Conflict Type:** Missing test execution instructions
- **Details:**
  - No documentation for running E2E tests
  - No troubleshooting guide for proxy issues
- **Required Change:**
  - Add "Running Tests" section
  - Document local E2E test execution
  - Include troubleshooting for common proxy issues

### Technical Impact

**No Impact On:**

- Existing infrastructure (CDK, CloudFront, S3)
- Completed features (Epics 1-4, Stories 5.1-5.4)
- Deployment processes
- Production environment

**Positive Impact:**

- Enables regression testing for authentication
- Unblocks accessibility compliance (WCAG 2.2)
- Establishes testing pattern for future features
- Reduces manual testing burden

---

## Section 3: Recommended Approach

### Path Forward: Hybrid Infrastructure + Feature Testing

**Strategy:** Treat Playwright as infrastructure prerequisite (Story 8.0) while adding authentication test suite (Story 5.11)

**Rationale:**

- **Strategic:** Acknowledges infrastructure debt, positions testing as Epic 8 prerequisite
- **Practical:** Infrastructure benefits all future epics immediately
- **Clear Dependencies:** Story 8.0 → Stories 5.11, 5.10, 8.2+

### Implementation Plan

#### Story 8.0: E2E Testing Infrastructure Setup (Playwright + CI)

**Epic:** Epic 8
**Position:** First story in Epic 8 (prerequisite for all accessibility work)
**Effort:** 1-2 days
**Priority:** Critical

**Scope:**

1. Install @playwright/test dependency
2. Create playwright.config.ts with mitmproxy proxy integration
3. Write sample E2E test validating proxy setup
4. Create GitHub Actions CI workflow (.github/workflows/test.yml)
5. Document test execution in README

**Acceptance Criteria:**

- Playwright installed and configured
- Proxy integration working (connects via port 8081)
- Sample test passing locally and in CI
- Documentation complete

**Deliverables:**

- package.json updated with @playwright/test
- playwright.config.ts configuration file
- .github/workflows/test.yml CI pipeline
- README "Running Tests" section
- Sample test: tests/e2e/smoke/home-page.spec.ts

#### Story 5.11: Authentication E2E Test Suite

**Epic:** Epic 5
**Position:** After Story 5.10 or alongside (flexible)
**Effort:** 1-2 days
**Priority:** High
**Dependencies:** Story 8.0 complete

**Scope:**

1. Write E2E tests for Stories 5.1-5.4 authentication flows
2. Test scenarios: sign in, sign out, token persistence, cross-tab sync, browser restart
3. Validate sessionStorage behavior automated
4. Provide regression protection for Epic 5 work
5. **Resolve Known Defect #1:** OAuth callback redirect tests failing in Playwright (2/11 tests timing out)

**Acceptance Criteria:**

- 5 E2E tests written and passing
- Tests validate all Epic 5 authentication acceptance criteria
- Tests run locally and in CI
- Test code documented
- **Defect #1 resolved:** oauth-callback-flow.spec.ts achieving 100% pass rate (11/11 tests)

**Deliverables:**

- tests/e2e/auth/sign-in.spec.ts
- tests/e2e/auth/sign-out.spec.ts
- tests/e2e/auth/token-persistence.spec.ts
- tests/e2e/auth/cross-tab-sync.spec.ts
- tests/e2e/auth/browser-restart.spec.ts

**Known Defects Addressed:**

- **Defect #1:** OAuth Callback Redirect Not Completing in E2E Tests (identified 2025-11-24)
  - Current status: 9/11 tests passing in oauth-callback-flow.spec.ts
  - Issue: Redirect tests timeout despite successful redirect execution (confirmed via console logs)
  - Impact: NON-CRITICAL (production OAuth flow works correctly, manual testing confirms)
  - Resolution: Investigate Playwright redirect timing, fix or implement alternative test strategy
  - Reference: Story 5.3 Known Defects section (lines 1163-1233)

#### Sprint Status Updates

**File:** docs/sprint-artifacts/sprint-status.yaml

**Changes:**

1. Add `8-0-e2e-testing-infrastructure-setup-playwright-ci: backlog` under Epic 8
2. Add `5-11-authentication-e2e-test-suite: backlog` under Epic 5

#### Architecture Documentation Updates

**File:** docs/architecture.md

**Changes:**

1. Add "Testing Architecture" section (see Change Proposal 4)
2. Add "ADR-006: Playwright for E2E Testing" decision record
3. Document Playwright/mitmproxy integration
4. Document test organization patterns

#### README Updates

**File:** README.md

**Changes:**

1. Add "Running Tests" section with E2E instructions
2. Document prerequisites (mitmproxy, Playwright browsers)
3. Include troubleshooting guide

### Effort Estimates

| Item                                           | Effort       | Risk    |
| ---------------------------------------------- | ------------ | ------- |
| Story 8.0: Playwright Infrastructure           | 1-2 days     | Low     |
| Story 5.11: Auth E2E Tests + Defect Resolution | 1-2 days     | Low     |
| Architecture Documentation                     | 2 hours      | Low     |
| README Updates                                 | 1 hour       | Low     |
| **Total**                                      | **2-4 days** | **Low** |

### Risk Assessment

**Technical Risk: Low**

- Playwright mature, well-documented framework
- Proxy configuration already exists (playwright-config.json)
- mitmproxy infrastructure complete (Epic 4)
- Authentication implementation stable (Stories 5.1-5.4 validated)

**Timeline Risk: Low**

- Adds 2-3 days total
- Epic 8 already in backlog (no immediate pressure)
- Epic 5 can proceed to retrospective while 8.0 proceeds
- No impact on Epics 6-7 timelines

**Team Momentum Risk: Low**

- Clear path forward
- Infrastructure benefits all future work
- Unblocks critical accessibility epic

**Compliance Risk: Eliminated**

- Resolves blocker for WCAG 2.2 validation (Epic 8)
- Enables automated accessibility testing
- Critical for GovTech compliance

### Timeline Impact

**Current Sprint:**

- Epic 5: Story 5.4 in review → Can complete Epic 5 retrospective
- Epic 8: Story 8.0 becomes first active story (1-2 days)
- Epic 5: Story 5.11 follows (1-2 days, after 8.0) - includes OAuth redirect defect resolution

**Future Sprints:**

- Epic 8: Can proceed after Story 8.0 complete
- Epics 6-7: Testing infrastructure ready when needed (Stories 6.10, 7.12)

**Overall Impact:** +2-4 days to sprint, resolves infrastructure debt and known defect before Epic 8

---

## Section 4: Detailed Change Proposals

### Change Proposal 1: Create Story 8.0

**Epic:** Epic 8: Accessible & Mobile-Friendly Experience + Brownfield Audit
**Story ID:** 8.0 (prerequisite story, inserted before existing Story 8.1)
**File:** docs/sprint-artifacts/8-0-e2e-testing-infrastructure-setup.md (NEW)

**Content:** See "Story 8.0: E2E Testing Infrastructure Setup" in Step 3, Change Proposal 1

**Rationale:** Establishes testing infrastructure as explicit prerequisite for Epic 8, acknowledging deferred Playwright requirement from PRD Phase 2-3.

---

### Change Proposal 2: Create Story 5.11

**Epic:** Epic 5: Authentication Foundation
**Story ID:** 5.11 (new story, after 5.10)
**File:** docs/sprint-artifacts/5-11-authentication-e2e-test-suite.md (NEW)

**Content:** See "Story 5.11: Authentication E2E Test Suite" in Step 3, Change Proposal 2

**Rationale:** Provides automated regression testing for completed authentication work (Stories 5.1-5.4), fulfilling PRD testing requirements that were deferred.

---

### Change Proposal 3: Update sprint-status.yaml

**File:** docs/sprint-artifacts/sprint-status.yaml

**Section 1: Epic 8 development_status**

OLD:

```yaml
# Epic 8: Accessible & Mobile-Friendly Experience + Brownfield Audit
epic-8: backlog
8-1-early-brownfield-accessibility-audit-parallel-with-epic-4: backlog
```

NEW:

```yaml
# Epic 8: Accessible & Mobile-Friendly Experience + Brownfield Audit
epic-8: backlog
8-0-e2e-testing-infrastructure-setup-playwright-ci: backlog # NEW: Infrastructure prerequisite
8-1-early-brownfield-accessibility-audit-parallel-with-epic-4: backlog
```

**Section 2: Epic 5 development_status**

OLD:

```yaml
5-9-empty-state-ui-for-unauthenticated-try-page: backlog
5-10-automated-accessibility-tests-for-auth-ui: backlog
epic-5-retrospective: optional
```

NEW:

```yaml
5-9-empty-state-ui-for-unauthenticated-try-page: backlog
5-10-automated-accessibility-tests-for-auth-ui: backlog
5-11-authentication-e2e-test-suite: backlog # NEW: E2E tests for auth flows
epic-5-retrospective: optional
```

**Rationale:** Adds new stories to sprint tracking, maintaining sequential story numbering within epics.

---

### Change Proposal 4: Update Architecture Document

**File:** docs/architecture.md

**Location:** New section after "Deployment Architecture"

**Content:** See "Testing Architecture" section in Step 3, Change Proposal 4 (includes Testing Architecture overview, Playwright configuration, test organization, CI integration, and ADR-006)

**Rationale:** Documents testing architecture as first-class concern, provides ADR for decision traceability, aligns with existing architecture documentation patterns.

---

### Change Proposal 5: Update Root README

**File:** README.md (root)

**Location:** New section after existing scripts documentation

**Content:** See "Running Tests" section in Step 3, Change Proposal 5 (includes unit test execution, E2E test execution, troubleshooting, CI information)

**Rationale:** Provides clear instructions for running new E2E tests, integrated with existing test documentation, includes troubleshooting for common proxy issues.

---

## Section 5: Implementation Handoff

### Change Scope Classification

**Scope:** **Minor** (Infrastructure addition with clear implementation path)

**Rationale:**

- Two well-defined stories with clear acceptance criteria
- No existing code modification required
- Additive changes only (no feature removal or refactoring)
- Standard testing infrastructure setup (common pattern)
- Documentation updates straightforward

### Handoff Recipients

**Primary:** Development team (dev agent)

**Responsibilities:**

1. **Story 8.0 Implementation:**
   - Install @playwright/test dependency
   - Create playwright.config.ts configuration
   - Write sample E2E test
   - Create GitHub Actions CI workflow
   - Update README documentation

2. **Story 5.11 Implementation:**
   - Write 5 E2E tests for authentication flows
   - Validate tests pass locally and in CI
   - Document test scenarios

3. **Documentation Updates:**
   - Update architecture.md with testing section + ADR-006
   - Update README.md with E2E test instructions
   - Update sprint-status.yaml with new story IDs

### Success Criteria

**Story 8.0 Complete When:**

- [ ] Playwright installed and configured
- [ ] Sample test passing locally
- [ ] CI workflow running tests automatically on PR/push
- [ ] README documentation includes E2E test instructions
- [ ] Architecture document includes testing section + ADR-006

**Story 5.11 Complete When:**

- [ ] 5 authentication E2E tests written
- [ ] All tests passing locally
- [ ] All tests passing in CI
- [ ] Tests validate Stories 5.1-5.4 acceptance criteria
- [ ] Test code documented with clear comments

**Overall Success:**

- [ ] Epic 8 unblocked (can begin Story 8.1 after 8.0)
- [ ] Epic 5 authentication work protected by automated tests
- [ ] PRD NFR-TRY-TEST-1 through NFR-TRY-TEST-7 achievable
- [ ] Testing infrastructure ready for Stories 6.10, 7.12

### Next Steps After Approval

1. **Immediate:** Create story files (8-0-_.md, 5-11-_.md) in docs/sprint-artifacts/
2. **Update tracking:** Modify sprint-status.yaml to reflect new stories
3. **Begin implementation:** Start Story 8.0 (Playwright infrastructure)
4. **Sequential:** Complete Story 5.11 after Story 8.0 done
5. **Validate:** Run tests locally and in CI
6. **Close loop:** Update story status, proceed to Epic 8

---

## Section 6: Approval Summary

### What We're Asking

**Approval to proceed with:**

1. Creating Story 8.0 (E2E Testing Infrastructure Setup) as first story in Epic 8
2. Creating Story 5.11 (Authentication E2E Test Suite) in Epic 5
3. Updating sprint-status.yaml with new story tracking
4. Updating architecture.md with testing architecture section + ADR-006
5. Updating README.md with E2E test execution instructions

### What This Accomplishes

**Immediate:**

- Resolves infrastructure debt (Playwright deferred from PRD Phase 2-3)
- Unblocks Epic 8 (Accessibility & Compliance)
- Provides regression testing for Epic 5 authentication work

**Long-Term:**

- Establishes E2E testing pattern for all future features
- Enables automated accessibility compliance validation (WCAG 2.2)
- Reduces manual testing burden
- Supports integration testing for Epics 6-7

### Why This Approach

**Strategic:**

- Acknowledges infrastructure debt explicitly (Story 8.0 as Epic 8 prerequisite)
- Positions testing as foundation for compliance work
- Minimal disruption to sprint flow (2-3 days total)

**Practical:**

- Infrastructure benefits immediately (Epic 5 auth tests)
- Clear dependencies (Story 8.0 → dependent stories)
- Low risk, high value

**Compliant:**

- Resolves PRD requirement gap
- Enables WCAG 2.2 validation (critical for GovTech)
- Provides audit trail for testing approach (ADR-006)

---

## Approval Request

**Prepared by:** correct-course workflow
**Date:** 2025-11-24
**Awaiting approval from:** cns

**Options:**

- **[a] Approve** - Proceed with implementation
- **[e] Edit** - Request changes to proposal
- **[r] Reject** - Do not proceed, provide alternative approach

---

_This Sprint Change Proposal was generated by the BMad Method correct-course workflow. It follows the systematic change navigation checklist to analyze impact, evaluate options, and provide actionable recommendations for sprint adjustments._
