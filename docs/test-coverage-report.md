# Test Coverage Report

## Summary

This report documents the test coverage improvements made during the overnight session. All coverage thresholds have been met.

## Coverage Results

| Metric | Current | Threshold | Status |
|--------|---------|-----------|--------|
| Statements | 84.41% | 80% | PASS |
| Branches | 80.53% | 70% | PASS |
| Functions | 81.57% | 80% | PASS |
| Lines | 85.71% | 80% | PASS |

## Unit Test Count

- **Total Tests**: 348
- **All Passing**: Yes
- **Test Suites**: 13

## Test Files Created/Updated

### New Test Files
1. `src/try/ui/components/aup-modal.test.ts` - 37 tests
2. `src/try/ui/try-button.test.ts` - 26 tests
3. `src/try/api/configurations-service.test.ts` - 22 tests
4. `src/try/api/leases-service.test.ts` - 22 tests

### Existing Test Files Fixed
1. `src/try/ui/try-page.test.ts` - Fixed mock for sessions-service
2. `src/try/ui/utils/focus-trap.test.ts` - Fixed requestAnimationFrame and offsetWidth/Height mocking

## Coverage by File

### 100% Coverage
- `src/try/utils/currency-utils.ts`
- `src/try/utils/date-utils.ts`
- `src/try/ui/utils/aria-live.ts`
- `src/try/ui/try-button.ts`

### 95%+ Coverage
- `src/try/api/configurations-service.ts` - 97.22%
- `src/try/api/sessions-service.ts` - 95.77%
- `src/try/ui/utils/focus-trap.ts` - 94%
- `src/try/api/leases-service.ts` - 98%

### 85%+ Coverage
- `src/try/api/api-client.ts` - 92.98%
- `src/try/ui/try-page.ts` - 86.95%
- `src/try/ui/components/aup-modal.ts` - 86.04%
- `src/try/ui/components/sessions-table.ts` - 89.65%
- `src/try/auth/oauth-flow.ts` - 84.21%

### Below Threshold (Need Future Work)
- `src/try/config.ts` - 0% (configuration constants, not critical)
- `src/try/main.ts` - 0% (entry point, integration tested via E2E)
- `src/try/ui/auth-nav.ts` - 0% (UI component, tested via E2E)

## E2E Test Results

E2E tests run via Playwright with mitmproxy:

### Auth Tests
- **Total**: 24 tests
- **Passed**: 19 tests
- **Failed**: 5 tests (OAuth callback redirect timing issues)

### Smoke Tests
- Home page load: PASS

## Fixes Applied

### AUP Loading Issue (Story 6.7)
- **Problem**: API returns JSend format `{ status: "success", data: { termsOfService: "...", leases: {...} } }` but code was reading top-level fields
- **Root Cause**: The Innovation Sandbox API uses JSend format with nested `data` object, but the parsing logic looked at flat top-level fields
- **Fix**: Updated `fetchConfigurations()` to extract AUP from nested `data.termsOfService` first, then fallback to flat fields for backwards compatibility
- **Also Fixed**: Lease config now properly reads from `data.leases.maxLeasesPerUser` and `data.leases.maxDurationHours`
- **File**: `src/try/api/configurations-service.ts`
- **Tests Updated**: Added 13 tests covering nested JSend response format and fallback scenarios

### Dead Callback Code Removal
- **Removed**: `src/callback.html` (obsolete per ADR-023 REVISED)
- **Removed**: `oauthCallbackUrl` from `src/try/config.ts`

## Documentation Drift Identified

1. **API Field Name**: Documentation may need update to clarify that `termsOfService` is the canonical field name, with `aup` as fallback

2. **OAuth Callback Handling**: Now handled by homepage via `handlePageOAuthCallback()` in `main.ts`, not separate callback page

## Recommendations for Future Work

1. Add unit tests for remaining 0% coverage files if critical functionality
2. Investigate and fix E2E OAuth callback timing issues
3. Consider adding integration tests for the full AUP → Lease flow
4. Add tests for error boundary scenarios in sessions-table component

## Run Commands

```bash
# Run unit tests
yarn test

# Run unit tests with coverage
yarn test --coverage

# Run E2E tests (requires proxy)
yarn run dev:proxy  # In one terminal
npx playwright test  # In another terminal

# Run specific E2E test suite
npx playwright test tests/e2e/auth/
npx playwright test tests/e2e/smoke/
```

---

Generated: 2025-11-25
