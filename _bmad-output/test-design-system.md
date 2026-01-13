# Test Design - System-Level Testability Review

**Project**: ndx
**Date**: 2026-01-13
**Mode**: System-Level (Phase 3 - Solutioning Gate)
**Author**: Test Architect

---

## 1. Executive Summary

This system-level testability review assesses the **ndx** (Digital Catalogue) platform's testing architecture, identifies testability gaps, and provides recommendations for the implementation phase. The review covers all epics defined in the planning artifacts.

### Key Findings

| Category | Status | Notes |
|----------|--------|-------|
| Unit Testing | PASS | Comprehensive coverage for utils, API clients, auth |
| Integration Testing | CONCERNS | API-backend integration gaps, lease workflow coverage |
| E2E Testing | PASS | Playwright configured with accessibility, auth, smoke tests |
| Security Testing | CONCERNS | OAuth flow coverage exists; needs IDOR, CSRF, token lifecycle, security headers tests (see Section 5.1) |
| Performance Testing | NOT STARTED | No k6 or load testing infrastructure |
| Accessibility Testing | PASS | Comprehensive a11y specs for keyboard nav, focus management |

---

## 2. System Architecture Testability Assessment

### 2.1 Component Testability Matrix

| Component | Test Level | Testability | Barriers | Recommendations |
|-----------|------------|-------------|----------|-----------------|
| **Frontend (Next.js)** | Unit, E2E | HIGH | None | Continue current Jest + Playwright approach |
| **Auth Module (OAuth)** | Unit, E2E | MEDIUM | External OAuth provider dependency | Mock OAuth responses, test token lifecycle |
| **Lease Service** | Unit, Integration | MEDIUM | DynamoDB backend, Secrets Manager | Use localstack or DynamoDB local for integration |
| **Notification Lambda** | Unit | HIGH | Extensive test coverage exists | Add integration tests for Slack webhook |
| **CDK Infrastructure** | Unit | HIGH | Snapshot testing in place | Add assertion-based tests for security |
| **Proxy/Cookie Router** | Unit | HIGH | Test coverage exists | Add E2E validation of routing behavior |

### 2.2 External Dependencies

| Dependency | Mock Strategy | Risk Level |
|------------|---------------|------------|
| OAuth Provider (Cognito/External) | Mock callback responses | MEDIUM |
| DynamoDB | LocalStack or DynamoDB Local | LOW |
| Secrets Manager | Mock with test values | LOW |
| Slack Webhook | Mock HTTP responses | LOW |
| Remote Images | Mock via Playwright network interception | LOW |

---

## 3. Test Level Distribution

Based on the Test Levels Framework, here is the recommended distribution:

### 3.1 Current State

```
Unit Tests:       ~50 files (src/try/**, infra/lib/lambda/**)
Integration:      ~5 files (infra/test/e2e/**, smoke tests)
E2E Tests:        ~13 files (tests/e2e/**)
```

### 3.2 Recommended Coverage by Epic

| Epic | Unit | Integration | E2E | Priority |
|------|------|-------------|-----|----------|
| Authentication & Session | HIGH | MEDIUM | HIGH | P0 |
| Catalogue Try Flow | MEDIUM | HIGH | HIGH | P0 |
| Lease Management | HIGH | HIGH | MEDIUM | P1 |
| Notification System | HIGH | MEDIUM | LOW | P2 |
| Accessibility | LOW | LOW | HIGH | P0 |

---

## 4. Quality Scenario Analysis (Utility Tree)

### 4.1 Performance Quality Scenarios

| Scenario ID | Description | Stimulus | Response Measure | Priority |
|-------------|-------------|----------|------------------|----------|
| PERF-001 | Page load time | User navigates to catalogue | LCP < 2.5s | P1 |
| PERF-002 | Try button responsiveness | User clicks Try button | First response < 500ms | P0 |
| PERF-003 | Auth callback latency | OAuth callback received | Session established < 1s | P1 |
| PERF-004 | Concurrent lease requests | 50 users request leases | All served < 2s | P2 |

### 4.2 Security Quality Scenarios

| Scenario ID | Description | Stimulus | Response Measure | Priority |
|-------------|-------------|----------|------------------|----------|
| SEC-001 | Token expiry enforcement | JWT expired | Redirect to login, no data leak | P0 |
| SEC-002 | CSRF protection | Cross-origin request | Request rejected | P0 |
| SEC-003 | Session hijacking prevention | Invalid session token | Session invalidated | P0 |
| SEC-004 | Rate limiting | Rapid API requests | 429 after threshold | P1 |

### 4.3 Reliability Quality Scenarios

| Scenario ID | Description | Stimulus | Response Measure | Priority |
|-------------|-------------|----------|------------------|----------|
| REL-001 | Auth provider failure | OAuth provider down | Graceful error message | P0 |
| REL-002 | Backend API failure | Lease API returns 500 | Retry with exponential backoff | P1 |
| REL-003 | Network disconnection | User goes offline | Cached state preserved, sync on reconnect | P2 |
| REL-004 | Session persistence | Page refresh | Session maintained via sessionStorage | P0 |

---

## 5. NFR Testability Assessment

### 5.1 Security NFR

#### 5.1.1 Attack Vector Analysis (Hacker Perspective)

| Target | Vulnerability | Exploit Method | Severity |
|--------|--------------|----------------|----------|
| **OAuth Callback** | Token interception | MITM on callback URL, state parameter tampering | CRITICAL |
| **SessionStorage** | XSS token theft | Inject script to read `auth_token` from sessionStorage | HIGH |
| **Try Button Flow** | CSRF on lease creation | Forge lease requests if no CSRF token validation | HIGH |
| **JWT Tokens** | Token replay | Capture valid JWT, replay before expiry | MEDIUM |
| **API Endpoints** | Rate limit bypass | Distributed requests from multiple IPs | MEDIUM |
| **Lease Service** | IDOR vulnerability | Enumerate lease IDs to access other users' leases | HIGH |

#### 5.1.2 Defense Gap Analysis

| Requirement | Testable | Current Coverage | Gap |
|-------------|----------|------------------|-----|
| OAuth token validation | YES | Unit tests exist (auth-provider.test.ts) | Add E2E for token expiry |
| Session storage security | YES | Unit tests exist (storage.test.ts) | Add E2E session hijacking test |
| XSS prevention | YES | No explicit tests | Add security-focused E2E tests |
| CSRF protection | PARTIAL | No explicit tests | Requires E2E validation |
| Token rotation | NO | No tests | Add token refresh/rotation tests |
| CORS validation | NO | No tests | Add cross-origin request tests |
| Cookie security | NO | No tests | Add HttpOnly/Secure/SameSite tests |
| Session fixation | NO | No tests | Add session fixation prevention tests |

#### 5.1.3 Compliance Requirements (Auditor Perspective)

| Standard | Requirement | Current Evidence | Gap |
|----------|-------------|------------------|-----|
| **OWASP A01** | Broken Access Control | No IDOR tests | Missing authz boundary tests |
| **OWASP A02** | Cryptographic Failures | Unknown | Need token encryption validation |
| **OWASP A03** | Injection | No XSS/SQLi tests | Missing input validation tests |
| **OWASP A07** | Auth Failures | Partial unit tests | Need E2E auth failure scenarios |
| **UK Gov/NCSC** | Cloud Security | Unknown | Need security headers validation |
| **GDPR** | Data minimization | Unknown | Need to verify no PII in logs |

#### 5.1.4 Required Security Test Suite

**Recommendation**: Add `tests/e2e/security/` directory with:

```
tests/e2e/security/
├── authorization-boundaries.spec.ts  # IDOR, privilege escalation
├── token-lifecycle.spec.ts           # Token expiry, refresh, revocation
├── csrf-protection.spec.ts           # CSRF token validation
├── oauth-state-validation.spec.ts    # OAuth state tampering prevention
├── account-lockout.spec.ts           # Brute force protection
├── csp-header-validation.spec.ts     # Content Security Policy
├── security-headers.spec.ts          # HSTS, X-Frame-Options, etc.
├── input-sanitization.spec.ts        # XSS, injection prevention
├── rate-limiting.spec.ts             # Global rate limiting
├── cors-policy.spec.ts               # Cross-origin request blocking
├── session-security.spec.ts          # Session fixation, regeneration
└── lease-ownership.spec.ts           # Lease IDOR prevention
```

| Priority | Test File | Owner | Description |
|----------|-----------|-------|-------------|
| **P0** | `authorization-boundaries.spec.ts` | Security Team | IDOR, user cannot access other users' leases |
| **P0** | `oauth-state-validation.spec.ts` | Auth Team | State parameter signature, single-use, expiry |
| **P0** | `csrf-protection.spec.ts` | Security Team | CSRF token on state-changing requests |
| **P0** | `lease-ownership.spec.ts` | Security Team | Server-side ownership validation |
| **P0** | `token-lifecycle.spec.ts` | Auth Team | Token expiry enforcement, refresh flow |
| **P1** | `account-lockout.spec.ts` | Auth Team | Lock after 5 failed attempts, 15 min lockout |
| **P1** | `csp-header-validation.spec.ts` | DevOps | script-src 'self', block inline scripts |
| **P1** | `security-headers.spec.ts` | DevOps | HSTS, X-Frame-Options, X-Content-Type-Options |
| **P1** | `input-sanitization.spec.ts` | Dev Team | XSS payloads sanitized, injection blocked |
| **P1** | `rate-limiting.spec.ts` | Backend Team | Global rate limit, per-IP and per-account |
| **P2** | `cors-policy.spec.ts` | Backend Team | Cross-origin requests rejected |
| **P2** | `session-security.spec.ts` | Auth Team | Session fixation, regeneration on login |

#### 5.1.5 Attack Scenarios & Defense Tests (Red Team vs Blue Team)

| Attack Scenario | Vector | Defense | Test File |
|-----------------|--------|---------|-----------|
| OAuth state tampering | Modify state to hijack session | HMAC signature, single-use, 5 min expiry | `oauth-state-validation.spec.ts` |
| Lease ID enumeration | IDOR on /api/leases/{id} | Server-side ownership check, UUIDs | `lease-ownership.spec.ts` |
| XSS token theft | Inject script to steal sessionStorage | CSP header, input sanitization | `csp-header-validation.spec.ts` |
| CSRF on lease creation | Cross-origin form submission | CSRF token, SameSite=Strict | `csrf-protection.spec.ts` |
| Brute force login | Credential stuffing | Account lockout after 5 failures | `account-lockout.spec.ts` |
| Distributed rate bypass | Multi-IP attack | Global rate limit + CAPTCHA trigger | `rate-limiting.spec.ts` |

### 5.2 Performance NFR

| Requirement | Testable | Current Coverage | Gap |
|-------------|----------|------------------|-----|
| LCP < 2.5s | YES | No performance tests | Add Lighthouse CI integration |
| API response < 500ms | YES | No load tests | Add k6 test suite |
| Concurrent users | YES | No load tests | Add k6 stress tests |

**Recommendation**: Create `tests/performance/` directory with:
- `lighthouse.config.js` - Core Web Vitals validation
- `load-test.k6.js` - API endpoint load testing
- `stress-test.k6.js` - Concurrent user simulation

### 5.3 Reliability NFR

| Requirement | Testable | Current Coverage | Gap |
|-------------|----------|------------------|-----|
| Graceful degradation | YES | No explicit tests | Add error scenario E2E tests |
| Retry logic | YES | Unit tests exist (fetch-with-timeout.test.ts) | Integration validation needed |
| Health checks | PARTIAL | smoke tests exist | Add comprehensive health endpoint tests |

**Recommendation**: Enhance reliability coverage with:
- `tests/e2e/reliability/error-handling.spec.ts`
- `tests/e2e/reliability/offline-mode.spec.ts`

### 5.4 Accessibility NFR

| Requirement | Testable | Current Coverage | Gap |
|-------------|----------|------------------|-----|
| WCAG 2.1 AA | YES | Comprehensive E2E coverage | Minor gaps in dynamic content |
| Keyboard navigation | YES | keyboard-navigation.spec.ts | PASS |
| Focus management | YES | focus-management.spec.ts | PASS |
| Screen reader support | YES | aria-live.test.ts | PASS |
| Dynamic modal accessibility | YES | No explicit tests | Add `try-flow-a11y.spec.ts` |
| Automated a11y scanning | YES | No axe-core integration | Add `@axe-core/playwright` |

**Status**: Good coverage but gaps in dynamic content (modals). Add:
- `tests/e2e/accessibility/try-flow-a11y.spec.ts` - Complete try flow with screen reader assertions
- `@axe-core/playwright` integration in `playwright.config.ts` for automated WCAG scanning

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk ID | Description | Probability | Impact | Score | Owner | Mitigation |
|---------|-------------|-------------|--------|-------|-------|------------|
| RISK-001 | OAuth provider unavailable | 2 | 3 | 6 | TBD | Mock OAuth in E2E, fallback UI |
| RISK-002 | Flaky E2E tests from network timing | 3 | 2 | 6 | TBD | Network-first interception pattern |
| RISK-003 | DynamoDB integration untested | 2 | 2 | 4 | TBD | Add LocalStack integration tests |
| RISK-004 | Security vulnerabilities in auth flow | 1 | 3 | 3 | TBD | Security-focused E2E tests |

### 6.2 Security Risks (from Security Audit Personas + Red Team vs Blue Team)

| Risk ID | Description | Probability | Impact | Score | Owner | Mitigation |
|---------|-------------|-------------|--------|-------|-------|------------|
| SEC-001 | IDOR on lease endpoints | 2 | 3 | **6** | Security Team | `authorization-boundaries.spec.ts`, `lease-ownership.spec.ts` |
| SEC-002 | CSRF on state-changing actions | 2 | 3 | **6** | Security Team | `csrf-protection.spec.ts` |
| SEC-003 | OAuth state tampering | 2 | 3 | **6** | Auth Team | `oauth-state-validation.spec.ts` |
| SEC-004 | Brute force login | 3 | 2 | **6** | Auth Team | `account-lockout.spec.ts` |
| SEC-005 | XSS via user input | 1 | 3 | 3 | Dev Team | `input-sanitization.spec.ts`, `csp-header-validation.spec.ts` |
| SEC-006 | Missing security headers | 2 | 2 | 4 | DevOps | `security-headers.spec.ts` |
| SEC-007 | Token replay attack | 2 | 2 | 4 | Auth Team | `token-lifecycle.spec.ts` |
| SEC-008 | Session fixation | 1 | 3 | 3 | Auth Team | `session-security.spec.ts` |
| SEC-009 | Distributed rate limit bypass | 2 | 2 | 4 | Backend Team | `rate-limiting.spec.ts` |

**Critical Risks (Score ≥ 6)**: SEC-001, SEC-002, SEC-003, SEC-004 require mitigation before Epic 1.

### 6.3 Pre-mortem Risks (Future Failure Prevention)

| Risk ID | Failure Scenario | Probability | Impact | Score | Prevention |
|---------|------------------|-------------|--------|-------|------------|
| PM-001 | Auth meltdown (cross-account exposure) | 2 | 3 | **6** | `oauth-state-validation.spec.ts` |
| PM-002 | IDOR lease data breach | 2 | 3 | **6** | `lease-ownership.spec.ts` |
| PM-003 | Accessibility lawsuit (Equality Act 2010) | 1 | 3 | 3 | `try-flow-a11y.spec.ts`, axe-core |
| PM-004 | Test data accidentally in production | 1 | 3 | 3 | Environment safeguard in test setup |

### 6.4 Coverage Risks

| Risk ID | Description | Priority | Test Level Gap | Action Required |
|---------|-------------|----------|----------------|-----------------|
| COV-001 | Lease workflow E2E gaps | P0 | E2E | Create user-journey tests for full lease lifecycle |
| COV-002 | No performance baselines | P1 | Performance | Implement k6 load testing |
| COV-003 | Security boundary testing | P0 | E2E | Add auth boundary tests |
| COV-004 | Error recovery scenarios | P1 | E2E | Add reliability E2E suite |

---

## 7. Test Infrastructure Recommendations

### 7.1 Current Infrastructure

| Component | Tool | Status |
|-----------|------|--------|
| Unit Testing | Jest + ts-jest | CONFIGURED |
| E2E Testing | Playwright | CONFIGURED |
| CI/CD | GitHub Actions | CONFIGURED |
| Coverage Reporting | Jest coverage | PARTIAL |

### 7.2 Recommended Additions

| Component | Tool | Priority | Rationale |
|-----------|------|----------|-----------|
| Performance Testing | k6 | P1 | Load testing for API endpoints |
| Lighthouse CI | @lhci/cli | P2 | Core Web Vitals monitoring |
| Security Scanning | npm audit + Snyk | P1 | Dependency vulnerability scanning |
| Visual Regression | Playwright screenshot comparison | P3 | UI consistency validation |
| Contract Testing | Pact (if microservices) | P3 | API contract validation |

### 7.3 CI Pipeline Enhancements

```yaml
# Recommended additions to .github/workflows/
jobs:
  unit-tests:
    # Existing: npm test

  e2e-tests:
    # Existing: playwright test

  # NEW: Security scanning (on PR)
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: npm audit
        run: npm audit --audit-level=high
```

### 7.4 CI Quality Gates (from Pre-mortem Analysis)

| Requirement | Implementation | Priority |
|-------------|----------------|----------|
| No skipped tests | Fail build if `test.skip()` count > 0 in committed code | P1 |
| Environment safeguard | Abort tests if `BASE_URL` matches production pattern | P1 |
| axe-core integration | Add `@axe-core/playwright` for automated WCAG scanning | P1 |

**Environment Safeguard Implementation**:
```typescript
// tests/support/setup.ts
const BASE_URL = process.env.BASE_URL || '';
if (BASE_URL.includes('ndx.digital.cabinet-office.gov.uk')) {
  throw new Error('ABORT: Tests cannot run against production URL');
}
```

---

## 8. Architecture Decision Records

### ADR-001: Test Data Management Strategy

**Status**: PROPOSED (Tier 3 implementation)

**Decision**: Factory functions + limited API seeding for critical paths

```typescript
// tests/fixtures/factories.ts (Tier 3)
export const createUser = (overrides = {}) => ({
  id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  ...overrides
});
```

**Rationale**: Factories provide speed and isolation. API seeding reserved for flows where real integration matters.

### ADR-002: Accessibility Testing Approach

**Status**: ACCEPTED

**Decision**: axe-core integration + targeted manual specs

```typescript
// Add to playwright.config.ts or fixture
import { injectAxe, checkA11y } from '@axe-core/playwright';
```

**Rationale**: Automated scanning catches regressions (~30%). Manual specs validate complex interactions (focus traps, ARIA live).

### ADR-003: Security Test Organization

**Status**: ACCEPTED

**Decision**: Flat structure with descriptive naming

```
tests/e2e/security/
├── oauth-state-validation.spec.ts
├── lease-ownership.spec.ts
├── authorization-boundaries.spec.ts
├── csrf-protection.spec.ts
├── token-lifecycle.spec.ts
├── security-headers.spec.ts
└── ...
```

**Rationale**: Simple flat structure. Naming convention provides grouping. Restructure only if > 25 files.

### ADR-004: Environment Safeguard Implementation

**Status**: ACCEPTED

**Decision**: Config check + CI validation

```typescript
// playwright.config.ts
const PROD_PATTERNS = ['ndx.digital.cabinet-office.gov.uk', '.gov.uk'];
const isProduction = PROD_PATTERNS.some(p => baseURL.includes(p));

if (isProduction && process.env.ALLOW_PROD_TESTS !== 'true') {
  throw new Error(`ABORT: Refusing to run tests against production: ${baseURL}`);
}
```

**Rationale**: Defense in depth. Protects local dev and CI. Escape hatch requires explicit opt-in.

### ADR-005: Test Reporting & Observability

**Status**: PROPOSED

**Decision**: HTML + JSON + GitHub Actions integration

```typescript
// playwright.config.ts
reporter: [
  ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ['json', { outputFile: 'test-results.json' }],
  ['github']
],
```

**Rationale**: JSON enables CI parsing. HTML provides debugging. GitHub reporter adds PR annotations.

---

## 9. Test Data Strategy

### 8.1 Current Approach

- Unit tests: Factory functions with faker-like data
- E2E tests: Hardcoded test data in spec files

### 8.2 Recommended Improvements

| Area | Current | Recommended |
|------|---------|-------------|
| User data | Hardcoded | Factory functions with @faker-js/faker |
| Auth tokens | Mocked | JWT factory with configurable claims |
| Lease data | Direct API calls | Seeding via API before tests |
| Cleanup | Manual | Auto-cleanup fixtures |

### 8.3 Factory Pattern Implementation

```typescript
// tests/fixtures/factories.ts
import { faker } from '@faker-js/faker';

export function createUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    ...overrides
  };
}

export function createLease(overrides?: Partial<Lease>): Lease {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    productId: faker.string.uuid(),
    status: 'active',
    expiresAt: faker.date.future(),
    ...overrides
  };
}
```

---

## 9. Acceptance Criteria Traceability

### 9.1 Coverage Matrix Summary

| Epic | Total AC | Covered | Gap | Coverage % |
|------|----------|---------|-----|------------|
| Authentication | 8 | 6 | 2 | 75% |
| Try Flow | 10 | 7 | 3 | 70% |
| Lease Management | 12 | 8 | 4 | 67% |
| Notifications | 6 | 5 | 1 | 83% |
| Accessibility | 15 | 14 | 1 | 93% |

### 9.2 Critical Gaps (P0)

| AC ID | Description | Test Missing | Priority |
|-------|-------------|--------------|----------|
| AUTH-AC-003 | Token refresh on expiry | E2E test | P0 |
| AUTH-AC-005 | Session invalidation on logout | E2E test | P0 |
| TRY-AC-002 | Complete try flow with lease creation | E2E test | P0 |
| LEASE-AC-004 | Lease expiration handling | Integration test | P0 |

---

## 10. Gate Decision Recommendation

### 10.1 Gate Status: CONCERNS

**Rationale**: The project has solid unit test coverage and good accessibility E2E coverage, but gaps exist in:
1. **Security boundary testing** - IDOR on lease endpoints (Score: 6), CSRF on state-changing actions (Score: 6), missing security headers validation
2. **Performance testing infrastructure** - No k6/Lighthouse, no load testing baselines
3. **Complete user journey E2E tests** - Try flow, lease lifecycle gaps
4. **Compliance evidence** - OWASP Top 10 coverage gaps (A01, A02, A03, A07), no NCSC/UK Gov security header validation

### 10.2 Required Actions (Cross-Functional War Room Prioritization)

#### TIER 1: Non-Negotiable (Must complete before Epic 1)

| # | Action | Owner | Effort | Rationale |
|---|--------|-------|--------|-----------|
| 1 | `lease-ownership.spec.ts` | Security | 1 hr | Highest business impact, easiest to implement |
| 2 | `oauth-state-validation.spec.ts` | Auth | 2 hr | Critical auth security |
| 3 | `try-flow-a11y.spec.ts` | Dev | 4 hr | Legal compliance (Equality Act), user access |
| 4 | `@axe-core/playwright` integration | Dev | 30 min | Baseline a11y for all pages |
| 5 | Environment safeguard in test setup | DevOps | 15 min | Catastrophe prevention |

**Tier 1 Total: ~8 hours**

#### TIER 2: High Priority (Complete during Epic 1 sprint)

| # | Action | Owner | Effort | Rationale |
|---|--------|-------|--------|-----------|
| 6 | `authorization-boundaries.spec.ts` | Security | 2 hr | Extends lease-ownership pattern |
| 7 | `csrf-protection.spec.ts` | Security | 3 hr | Important but lower probability |
| 8 | `token-lifecycle.spec.ts` | Auth | 3 hr | Session management |
| 9 | `security-headers.spec.ts` | DevOps | 1 hr | Quick win |

**Tier 2 Total: ~9 hours**

#### TIER 3: Can Defer (Epic 2 or later)

| # | Action | Owner | Effort | Rationale |
|---|--------|-------|--------|-----------|
| 10 | `account-lockout.spec.ts` | Auth | 2 hr | Nice to have, lower risk |
| 11 | `csp-header-validation.spec.ts` | DevOps | 1 hr | Subset of security-headers |
| 12 | Factory function library | Dev | 4 hr | Refactor, accept duplication for now |
| 13 | Cleanup fixtures | Dev | 3 hr | Refactor, not blocking |

**Tier 3 Total: ~10 hours**

#### Recommended Implementation Order

```
Day 1 (Morning - 3 hours):
  ✓ Environment safeguard (15 min)
  ✓ axe-core integration (30 min)
  ✓ lease-ownership.spec.ts (1 hr)
  ✓ security-headers.spec.ts (1 hr)

Day 1 (Afternoon - 4 hours):
  ✓ oauth-state-validation.spec.ts (2 hr)
  ✓ authorization-boundaries.spec.ts (2 hr)

Day 2 (7 hours):
  ✓ try-flow-a11y.spec.ts (4 hr)
  ✓ csrf-protection.spec.ts (3 hr)

Day 3 (if time - 3 hours):
  ✓ token-lifecycle.spec.ts (3 hr)
```

**Total Tier 1+2: ~17 hours (2-3 days)**

### 10.3 Recommended Test Design Per Epic

Each epic implementation should include:
- Unit tests for new business logic
- Integration tests for API/backend interactions
- E2E tests for user-facing acceptance criteria
- Security tests for auth-related features
- Accessibility tests for new UI components

---

## 11. Next Steps

1. **Approve this testability review** and address CONCERNS
2. **Create epic-level test designs** using `testarch-test-design` workflow for each epic
3. **Implement test infrastructure gaps** before story implementation
4. **Track coverage with traceability matrix** using `testarch-trace` workflow

---

## Appendix A: Elicitation Methods Applied

| Method | Description | Section Enhanced |
|--------|-------------|------------------|
| **Security Audit Personas** | Hacker + Defender + Auditor examined system from different threat models | Section 5.1.1-5.1.4, Section 6.2 |
| **Red Team vs Blue Team** | Adversarial attack-defend analysis with 5 attack scenarios and defense tests | Section 5.1.5, Section 6.2, Section 10.2 |
| **Pre-mortem Analysis** | Imagined 6 future failure scenarios, worked backwards to identify preventive tests | Section 5.4, Section 6.3, Section 7.4, Section 10.2 |
| **Cross-Functional War Room** | PM + Engineer + Designer debated priorities, created 3-tier action plan with effort estimates | Section 10.2 (complete rewrite) |
| **Architecture Decision Records** | Multiple architect personas proposed and debated 5 ADRs with explicit trade-offs | Section 8 (complete rewrite) |

---

*Generated by Test Architect workflow v1.0*
*Enhanced via Advanced Elicitation - 2026-01-13*
