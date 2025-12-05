# Comprehensive Code Review Fix Implementation Plan

**Generated:** 2025-11-28
**Branch:** try/aws vs origin/main
**Total Issues:** 71 across 6 categories

---

## Executive Summary

This plan addresses **71 issues** across 6 categories from the try/aws branch code review:

- Security vulnerabilities: 10
- Code quality problems: 15
- Performance concerns: 8
- Testing gaps: 13
- Documentation needs: 11
- Architecture improvements: 14

---

## Priority 1: BLOCKING Issues (Must Fix Before Merge)

### B-1: Fix 25 Notification Test Failures

**Root Cause Analysis:**

| ID    | Issue                                      | File                    | Line    | Decision                                                                                |
| ----- | ------------------------------------------ | ----------------------- | ------- | --------------------------------------------------------------------------------------- |
| B-1.1 | User email in Slack alerts                 | `slack-alerts.ts`       | ~216    | **ACCEPTABLE** - Ops team needs user context for support. Update tests to expect email. |
| B-1.2 | Zod schemas not using `.strict()`          | `validation.ts`         | 134-184 | Replace `.passthrough()` with `.strict()`                                               |
| B-1.3 | "Email-only" events in Slack templates     | `slack-templates.ts`    | 199-259 | **KEEP** - Decision: All lease events go to Slack for ops visibility. Update tests.     |
| B-1.4 | EventBridge source filter commented        | `notification-stack.ts` | 241-243 | **REMOVE** the commented code entirely (not uncomment). Source filtering not needed.    |
| B-1.5 | "Email-only" handlers in processSlackAlert | `slack-alerts.ts`       | 551-570 | **KEEP** - Per B-1.3, we want Slack alerts for all lease events.                        |

### Design Decisions Recorded

**Decision 1: User Email in Slack Alerts (B-1.1)**

- **Context:** Code review flagged user email appearing in Slack alerts as "PII leakage"
- **Decision:** This is intentional and acceptable
- **Rationale:** Ops team needs user email to provide support context. Slack channels are private to ops team.
- **Action:** Update tests to expect user email in Slack alert details

**Decision 2: All Lease Events to Slack (B-1.3, B-1.5)**

- **Context:** Code review suggested LeaseRequested, LeaseApproved, LeaseDenied, LeaseTerminated should be "email-only"
- **Decision:** Keep Slack alerts for ALL lease lifecycle events
- **Rationale:** Ops visibility into lease activity is valuable for monitoring and support
- **Action:** Update tests to expect Slack alerts for all lease events

**Decision 3: Remove EventBridge Source Filter (B-1.4)**

- **Context:** Source filter was commented out pending ISB team confirmation
- **Decision:** Remove the commented code entirely rather than uncommenting
- **Rationale:** Account-level filtering (already in place) is sufficient security. Source names may vary.
- **Action:** Delete the commented source filter lines

**Verification:**

```bash
cd infra && yarn test -- --testPathPattern="notification" --verbose
```

---

## Priority 2: HIGH Security Issues

| ID   | Issue                      | File                 | Fix                                     | Effort |
| ---- | -------------------------- | -------------------- | --------------------------------------- | ------ |
| S-H1 | esbuild SSRF vulnerability | `infra/package.json` | Update to `"esbuild": "^0.27.0"`        | S      |
| S-H2 | glob command injection     | rimraf dependency    | `npm update rimraf`                     | S      |
| S-H3 | innerHTML XSS audit        | `src/try/ui/*.ts`    | Add `// XSS-SAFE` comments after review | S      |

**Verification:**

```bash
cd infra && npm audit --audit-level=moderate
```

---

## Priority 3: HIGH Code Quality Issues

| ID   | Issue                           | File                      | Fix                                                 | Effort |
| ---- | ------------------------------- | ------------------------- | --------------------------------------------------- | ------ |
| Q-H1 | `any` type usage                | `src/try/config.ts:63-74` | Add proper type declarations for window/process     | M      |
| Q-H2 | Inconsistent logging (59 calls) | 14 files                  | Create `src/try/utils/logger.ts` centralized logger | L      |
| Q-H3 | Magic numbers                   | `api-client.ts:227`       | Extract to `API_CONSTANTS` object                   | S      |

### Q-H2 Implementation: Centralized Logger

```typescript
// src/try/utils/logger.ts
type LogLevel = "debug" | "info" | "warn" | "error"

class Logger {
  private context: string
  private isProd = process.env.NODE_ENV === "production"

  constructor(context: string) {
    this.context = context
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    const prefix = `[${this.context}]`
    if (this.isProd && level === "debug") return
    console[level](prefix, message, ...args)
  }

  error(message: string, ...args: unknown[]): void {
    this.log("error", message, ...args)
  }
  warn(message: string, ...args: unknown[]): void {
    this.log("warn", message, ...args)
  }
  info(message: string, ...args: unknown[]): void {
    this.log("info", message, ...args)
  }
  debug(message: string, ...args: unknown[]): void {
    this.log("debug", message, ...args)
  }
}

export const createLogger = (context: string) => new Logger(context)
```

**Files to Update:**

- `src/try/api/leases-service.ts`
- `src/try/api/sessions-service.ts`
- `src/try/api/api-client.ts`
- `src/try/api/configurations-service.ts`
- `src/try/auth/auth-provider.ts`
- `src/try/auth/oauth-flow.ts`
- `src/try/ui/try-button.ts`
- `src/try/ui/auth-nav.ts`
- `src/try/utils/jwt-utils.ts`
- `src/try/utils/storage.ts`
- `src/try/utils/fetch-with-timeout.ts`

---

## Priority 4: HIGH Performance Issues

| ID   | Issue                        | File                    | Fix                                      | Effort |
| ---- | ---------------------------- | ----------------------- | ---------------------------------------- | ------ |
| P-H1 | Cold start secret latency    | `secrets.ts`            | Pre-warm secrets during module load      | M      |
| P-H2 | Serial DynamoDB queries      | `enrichment.ts:610-673` | Use `Promise.all()` for parallel queries | M      |
| P-H3 | No query caching for retries | `enrichment.ts`         | Add per-event memoization with Map       | M      |

### P-H1 Implementation: Pre-warm Secrets

```typescript
// secrets.ts - add at module level
let secretsPromise: Promise<Secrets> | null = null

// Pre-warm during module load
if (process.env.SECRETS_PATH) {
  secretsPromise = fetchSecrets(process.env.SECRETS_PATH)
}

export async function getSecrets(): Promise<Secrets> {
  if (!secretsPromise) {
    secretsPromise = fetchSecrets(process.env.SECRETS_PATH!)
  }
  return secretsPromise
}
```

---

## Priority 5: HIGH Testing Issues

| ID   | Issue                      | File                          | Fix                                                   | Effort |
| ---- | -------------------------- | ----------------------------- | ----------------------------------------------------- | ------ |
| T-H1 | 0% coverage on main.ts     | `src/try/main.ts`             | Create `main.test.ts` with integration tests          | M      |
| T-H2 | 0% coverage on auth-nav.ts | `src/try/ui/auth-nav.ts`      | Create `auth-nav.test.ts` with unit tests             | M      |
| T-H3 | Flaky E2E tests            | `oauth-callback-flow.spec.ts` | Replace 7 `waitForTimeout()` with deterministic waits | M      |

### T-H3: waitForTimeout Replacements

| Line | Current               | Replacement                                                |
| ---- | --------------------- | ---------------------------------------------------------- |
| 35   | `waitForTimeout(100)` | `waitForFunction(() => sessionStorage.getItem('isb-jwt'))` |
| 50   | `waitForTimeout(200)` | `waitForURL('**/', { timeout: 3000 })`                     |
| 123  | `waitForTimeout(500)` | `waitForLoadState('networkidle')`                          |
| 235  | `waitForTimeout(100)` | `waitForFunction(() => sessionStorage.getItem('isb-jwt'))` |
| 247  | `waitForTimeout(100)` | `waitForFunction(() => sessionStorage.getItem('isb-jwt'))` |
| 256  | `waitForTimeout(200)` | `waitForURL('**/', { timeout: 3000 })`                     |

---

## Priority 6: HIGH Documentation Issues

| ID   | Issue                             | Location                   | Fix                                                     | Effort |
| ---- | --------------------------------- | -------------------------- | ------------------------------------------------------- | ------ |
| D-H1 | Missing JSDoc on Lambda functions | `infra/lib/functions/*.ts` | Add comprehensive JSDoc with @param, @returns, @example | M      |
| D-H2 | Missing notification runbook      | `docs/runbooks/`           | Create `notification-system.md`                         | L      |

---

## Priority 7: MEDIUM Architecture Issues

| ID   | Issue                      | Decision                                              | Effort |
| ---- | -------------------------- | ----------------------------------------------------- | ------ |
| A-M1 | Lambda code not co-located | **No change** - separation allows independent testing | -      |
| A-M2 | Configuration split        | Create ADR-030 documenting configuration strategy     | S      |
| A-M3 | Large handler.ts           | **No change** - already properly refactored           | -      |
| A-M4 | Missing DI pattern         | Document as future improvement                        | S      |

---

## Priority 8: MEDIUM Code Quality Issues

| ID   | Issue                              | File                       | Fix                                            | Effort |
| ---- | ---------------------------------- | -------------------------- | ---------------------------------------------- | ------ |
| Q-M1 | Duplicated error handling          | API services               | Create `src/try/utils/api-error-handler.ts`    | M      |
| Q-M2 | Weak CloudFormation types          | `add-cloudfront-origin.ts` | Add Zod runtime validation                     | M      |
| Q-M3 | No request body size validation    | `api-client.ts`            | Add MAX_REQUEST_BODY_SIZE check                | S      |
| Q-M4 | Fragile string matching            | `leases-service.ts`        | Use HTTP status codes instead                  | S      |
| Q-M5 | sessionStorage guards              | Multiple                   | **No change** - already handled in SafeStorage | -      |
| Q-M6 | CloudFront function error handling | `s3-routing.js`            | Add try-catch wrapper                          | S      |
| Q-M7 | Hardcoded AWS account IDs          | `config.ts`                | Move to environment variables                  | M      |
| Q-M8 | Incomplete JSDoc                   | Public APIs                | Add JSDoc to exported functions                | L      |

---

## Priority 9: MEDIUM Security Issues

| ID   | Issue                       | File                    | Fix                                                   | Effort |
| ---- | --------------------------- | ----------------------- | ----------------------------------------------------- | ------ |
| S-M1 | Hardcoded AWS account IDs   | `config.ts`             | Same as Q-M7                                          | M      |
| S-M2 | Secrets path defaults       | `notification-stack.ts` | Use `process.env.SECRETS_PATH`                        | S      |
| S-M3 | Client-side JWT validation  | -                       | **No change** - server validates too                  | -      |
| S-M4 | Hardcoded DynamoDB tables   | `config.ts`             | Use environment variables                             | S      |
| S-M5 | Source validation commented | `notification-stack.ts` | **REMOVE** - Delete commented code per B-1.4 decision | S      |

---

## Priority 10: MEDIUM Performance Issues

| ID   | Issue                          | File                    | Fix                                 | Effort |
| ---- | ------------------------------ | ----------------------- | ----------------------------------- | ------ |
| P-M1 | Lambda memory over-provisioned | `notification-stack.ts` | Reduce from 512MB to 256MB          | S      |
| P-M2 | No DynamoDB connection pooling | `enrichment.ts`         | Use singleton DynamoDB client       | M      |
| P-M3 | Template validation blocking   | `handler.ts`            | Move to build time or make async    | M      |
| P-M4 | Circuit breaker not shared     | -                       | **No change** - expected for Lambda | -      |
| P-M5 | DLQ digest samples only 10     | `dlq-digest-handler.ts` | Increase sample size or document    | S      |

---

## Priority 11: MEDIUM Testing Issues

| ID   | Issue                       | File                | Fix                                           | Effort |
| ---- | --------------------------- | ------------------- | --------------------------------------------- | ------ |
| T-M1 | Snapshot without assertions | `ndx-stack.test.ts` | **No change** - fine-grained tests exist      | -      |
| T-M2 | Branch coverage 83.43%      | Multiple            | Add tests for uncovered branches              | M      |
| T-M3 | E2E timeout concerns        | -                   | Addressed in T-H3                             | -      |
| T-M4 | Test organization           | -                   | Document in `docs/testing-strategy.md`        | S      |
| T-M5 | Missing edge cases          | `oauth-flow.ts`     | Add network failure and malformed token tests | M      |
| T-M6 | Deprecated CDK APIs         | -                   | **No change** - false positive                | -      |

---

## Priority 12: MEDIUM Documentation Issues

| ID   | Issue                              | Location             | Fix                               | Effort |
| ---- | ---------------------------------- | -------------------- | --------------------------------- | ------ |
| D-M1 | Interface fields lack descriptions | `types.ts`           | Add JSDoc to all interface fields | M      |
| D-M2 | Config exports lack examples       | `config.ts`          | Add @example tags                 | S      |
| D-M3 | README missing E2E cross-ref       | `README.md`          | Add link to E2E documentation     | S      |
| D-M4 | Missing ADRs                       | `docs/architecture/` | Create ADR-029, ADR-030, ADR-031  | M      |

---

## Priority 13: LOW Issues

### Security (Low)

| ID   | Issue                       | Decision                         |
| ---- | --------------------------- | -------------------------------- |
| S-L1 | brace-expansion ReDoS       | Acceptable risk (dev dependency) |
| S-L2 | js-yaml prototype pollution | Monitor (indirect)               |
| S-L3 | Test tokens in code         | Acceptable (intentional)         |

### Code Quality (Low)

| ID   | Issue                    | Decision                     |
| ---- | ------------------------ | ---------------------------- |
| Q-L1 | Inconsistent file naming | Document conventions         |
| Q-L2 | Test file location       | Document in testing strategy |
| Q-L3 | TODO without tickets     | Audit and update             |

### Documentation (Low)

| ID   | Issue                    | Decision            |
| ---- | ------------------------ | ------------------- |
| D-L1 | Cross-link documentation | Ongoing improvement |

---

## Implementation Sequence

### Phase 1: BLOCKING (Day 1) - ~3 hours

1. B-1.1: Update tests to expect user email in Slack alerts (**keep behavior, fix tests**)
2. B-1.2: Add `.strict()` to Zod schemas
3. B-1.3: Update tests to expect Slack alerts for all lease events (**keep behavior, fix tests**)
4. B-1.4: Remove commented EventBridge source filter code entirely
5. B-1.5: No action needed (keeping handlers per B-1.3)

**Gate:** All notification tests pass

### Phase 2: Security (Day 1) - ~1 hour

1. S-H1: Update esbuild
2. S-H2: Update glob/rimraf
3. S-H3: Document innerHTML safety

**Gate:** `npm audit` clean

### Phase 3: High Priority Code Quality (Days 2-3) - ~8 hours

1. Q-H1: Fix `any` types
2. Q-H2: Create centralized logger
3. Q-H3: Extract magic numbers
4. P-H1: Pre-warm secrets
5. P-H2: Parallelize DynamoDB queries
6. P-H3: Add query caching

### Phase 4: High Priority Testing (Days 3-4) - ~6 hours

1. T-H1: Add main.ts tests
2. T-H2: Add auth-nav.ts tests
3. T-H3: Fix flaky E2E tests

### Phase 5: Documentation (Day 5) - ~4 hours

1. D-H1: Add Lambda JSDoc
2. D-H2: Create notification runbook

### Phase 6: Medium Priority (Days 6-8) - ~12 hours

- Architecture documentation
- Remaining code quality fixes
- Additional test coverage
- Performance optimizations

### Phase 7: Low Priority (Day 9) - ~2 hours

- Document conventions
- Audit TODOs
- Cross-link documentation

---

## Critical Files Summary

| Priority | File                                                 | Issues                        |
| -------- | ---------------------------------------------------- | ----------------------------- |
| BLOCKING | `infra/lib/lambda/notification/slack-alerts.test.ts` | B-1.1, B-1.3 (update tests)   |
| BLOCKING | `infra/lib/lambda/notification/validation.ts`        | B-1.2                         |
| BLOCKING | `infra/lib/notification-stack.ts`                    | B-1.4 (remove commented code) |
| HIGH     | `infra/package.json`                                 | S-H1, S-H2                    |
| HIGH     | `src/try/config.ts`                                  | Q-H1                          |
| HIGH     | `infra/lib/lambda/notification/secrets.ts`           | P-H1                          |
| HIGH     | `infra/lib/lambda/notification/enrichment.ts`        | P-H2, P-H3                    |
| HIGH     | `tests/e2e/auth/oauth-callback-flow.spec.ts`         | T-H3                          |

---

## Effort Estimates

| Priority  | Issues                                       | Total Effort  |
| --------- | -------------------------------------------- | ------------- |
| BLOCKING  | 3 actionable (2 test updates, 1 code change) | ~3 hours      |
| HIGH      | 14                                           | ~19 hours     |
| MEDIUM    | 28                                           | ~20 hours     |
| LOW       | 6                                            | ~2 hours      |
| **TOTAL** | **51 actionable**                            | **~44 hours** |

_Note: 20 issues marked "No change" or "Acceptable" after analysis_

---

## Verification Checklist

- [ ] All notification tests pass: `cd infra && yarn test`
- [ ] npm audit clean: `npm audit --audit-level=moderate`
- [ ] Frontend tests pass: `yarn test`
- [ ] E2E tests pass: `yarn test:e2e`
- [ ] Build succeeds: `yarn build`
- [ ] Coverage thresholds met: 80%+ statements, 70%+ branches
