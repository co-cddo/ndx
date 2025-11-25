# Story 7.11: AWS SSO Portal URL Configuration

**Epic:** 7 - Try Sessions Dashboard
**Status:** Done
**Story Points:** 1
**Date Created:** 2025-11-25
**Date Completed:** 2025-11-25

## Story

As a developer,
I want to configure AWS SSO portal URL for launch button,
So that users are directed to correct SSO portal for their sandbox accounts.

## Acceptance Criteria

### AC1: Configuration includes environment variable support
**Status:** ✅ IMPLEMENTED
**Evidence:** `src/try/config.ts:61-78,97` - `getConfigValue()` checks `window.__TRY_CONFIG__`, `process.env`, then defaults
```typescript
function getConfigValue(key: string, defaultValue: string): string {
  const globalConfig = (typeof window !== 'undefined' && (window as any).__TRY_CONFIG__) || {};
  if (globalConfig[key]) return globalConfig[key];
  if (typeof process !== 'undefined' && (process as any).env?.[key]) {
    return (process as any).env[key];
  }
  return defaultValue;
}

export const config: TryConfig = {
  awsSsoPortalUrl: getConfigValue('AWS_SSO_PORTAL_URL', DEFAULT_AWS_SSO_PORTAL_URL),
  // ...
};
```

### AC2: Launch button uses configured URL
**Status:** ✅ IMPLEMENTED
**Evidence:** `src/try/api/sessions-service.ts:307-319` - `getSsoUrl()` uses `config.awsSsoPortalUrl`
```typescript
export function getSsoUrl(lease: Lease): string {
  if (lease.awsSsoPortalUrl) {
    return lease.awsSsoPortalUrl;
  }
  const baseUrl = config.awsSsoPortalUrl;
  const accountId = lease.awsAccountId;
  const roleName = config.ssoRoleName;
  return `${baseUrl}/#/console?account_id=${accountId}&role_name=${roleName}`;
}
```
**Evidence:** `src/try/ui/components/sessions-table.ts:138,148` - Launch button calls `getSsoUrl(lease)`

### AC3: Configuration documented in README
**Status:** ✅ IMPLEMENTED
**Evidence:** `README.md:106-131` - Full documentation section
```markdown
## Try Before You Buy Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_SSO_PORTAL_URL` | AWS SSO portal URL for console access | `https://d-9267e1e371.awsapps.com/start` |
| `API_BASE_URL` | Innovation Sandbox API base URL | `/api` |
| `REQUEST_TIMEOUT` | API request timeout in milliseconds | `10000` |

### Development
For local development with mitmproxy, default values work out of the box.

### Production
Set environment variables in your deployment configuration:
```bash
export AWS_SSO_PORTAL_URL="https://your-portal.awsapps.com/start"
```

Configuration is centralized in `src/try/config.ts`.
```

## Tasks / Subtasks

- [x] Create centralized config module (`src/try/config.ts`)
- [x] Define `TryConfig` interface with all configuration properties
- [x] Implement `getConfigValue()` for multi-source configuration loading
- [x] Support `window.__TRY_CONFIG__` for runtime injection
- [x] Support `process.env` for build-time injection
- [x] Provide sensible defaults for all configuration values
- [x] Export `config` object with all settings
- [x] Export `getAwsSsoPortalUrl()` convenience function for launch button
- [x] Integrate with `getSsoUrl()` in sessions-service.ts
- [x] Document all environment variables in README.md
- [x] Document development and production configuration
- [x] Create comprehensive unit tests (25 tests)

## Dev Agent Record

### Context Reference
- Tech Spec: `/Users/cns/httpdocs/cddo/ndx/docs/sprint-artifacts/tech-spec-epic-7.md`
- Epic: `/Users/cns/httpdocs/cddo/ndx/docs/epics/epic-7-try-sessions-dashboard.md`
- Architecture: `/Users/cns/httpdocs/cddo/ndx/docs/architecture.md`

### Completion Notes

Story 7.11 implements centralized configuration for the Try Before You Buy feature, with a focus on AWS SSO Portal URL configuration for the console launch button (Story 7.7).

The implementation provides a flexible, multi-source configuration system:

1. **Configuration Module** (`src/try/config.ts`):
   - `TryConfig` interface defines all configuration properties
   - `getConfigValue()` checks: `window.__TRY_CONFIG__` → `process.env` → defaults
   - Supports both runtime (browser) and build-time (Node.js) configuration
   - Default values appropriate for Innovation Sandbox development environment

2. **AWS SSO Portal URL Configuration**:
   - Environment variable: `AWS_SSO_PORTAL_URL`
   - Default: `https://d-9267e1e371.awsapps.com/start` (Innovation Sandbox portal)
   - Used by `getSsoUrl()` to build console launch URLs with account ID and role
   - Supports per-lease URL override from API response

3. **Additional Configuration**:
   - `SSO_ROLE_NAME`: IAM role for console access (default: `ndx_IsbUsersPS`)
   - `API_BASE_URL`: Innovation Sandbox API base URL (default: `/api`)
   - `REQUEST_TIMEOUT`: API request timeout in ms (default: `10000`)
   - `OAUTH_LOGIN_URL`: OAuth login endpoint (default: `/api/auth/login`)

4. **Integration**:
   - Story 7.7 launch button uses `getSsoUrl(lease)` which calls `config.awsSsoPortalUrl`
   - Supports environment-specific configuration (dev/staging/prod)
   - No code changes needed between environments

5. **Test Coverage**:
   - 25 unit tests for config module
   - Tests for default values, environment variable support, and type safety
   - Integration tested via sessions-service and sessions-table tests

The implementation follows ADR-025 (Environment-based Configuration) and provides the foundation for deployment-specific settings without code changes.

### File List

**Created:**
- `src/try/config.ts` - Centralized configuration module
- `src/try/config.test.ts` - Comprehensive unit tests (25 tests)

**Modified:**
- `README.md` - Added Try Before You Buy Configuration section with environment variables table

**Referenced by:**
- `src/try/api/sessions-service.ts` - Uses `config.awsSsoPortalUrl` in `getSsoUrl()`
- `src/try/ui/components/sessions-table.ts` - Calls `getSsoUrl()` for launch button
- `src/try/api/api-client.ts` - Uses `config.apiBaseUrl`
- `src/try/ui/try-page.ts` - Uses `config.oauthLoginUrl`

## Change Log

### 2025-11-25 - Initial Implementation
- Created centralized configuration module
- Implemented multi-source configuration loading
- Added environment variable support for all settings
- Documented in README.md
- Integrated with launch button via `getSsoUrl()`
- Test coverage: 25 unit tests

### 2025-11-25 - Code Review Fixes Applied

#### MEDIUM Severity:
1. **✅ Missing Unit Tests for config.ts**
   - **Issue:** Configuration module had ZERO test coverage (114 lines untested)
   - **Fix:** Created comprehensive test file with 25 tests covering all functions
   - **Tests Added:**
     - Config object properties (5 tests)
     - getAwsSsoPortalUrl() function (3 tests)
     - Environment variable support (6 tests)
     - Configuration validation (2 tests)
     - Type safety and exports (3 tests)
     - Default value verification (6 tests)
   - **File:** `src/try/config.test.ts`
   - **Result:** All 25 tests passing, config module now has 100% test coverage

### Test Results After Fixes
- **New Tests:** 25 tests for config module
- **Total Tests:** 421 passing (up from 396 before config tests)
- **Build:** ✅ Successful with no TypeScript errors
- **Coverage:** Config module now has 100% test coverage

---

## Senior Developer Review (AI)

**Reviewer:** cns
**Date:** 2025-11-25
**Outcome:** APPROVE (with fixes applied)

### Summary

Story 7.11 implements a robust, flexible configuration system for the Try Before You Buy feature. The implementation exceeds the acceptance criteria by providing multi-source configuration loading (runtime + build-time) and supporting configuration for all Try feature settings, not just the SSO portal URL.

During systematic review, I identified 1 MEDIUM severity issue: missing unit tests for the config module. This has been fixed with comprehensive test coverage (25 tests, 100% coverage).

**Key Strengths:**
- Clean, centralized configuration design
- Multi-source configuration (window, process.env, defaults)
- Proper TypeScript typing with `TryConfig` interface
- Well-documented in README.md
- Flexible deployment model (no code changes between environments)
- Comprehensive test coverage after fix

**Issues Found and Fixed:**
1. ✅ Missing unit tests for config module (MEDIUM)

### Key Findings

**MEDIUM Severity Issues (Fixed):**
1. ✅ **Missing Unit Tests for config.ts** - Configuration module had zero test coverage
   - Risk: Configuration bugs wouldn't be caught, especially environment variable loading
   - Impact: Medium - config is critical infrastructure but changes infrequently
   - Fixed: Created comprehensive test file with 25 tests
   - File: `src/try/config.test.ts`

**No Critical or LOW Issues Found**

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | Configuration includes environment variable support | ✅ IMPLEMENTED | `config.ts:61-78,97` - `getConfigValue()` multi-source loading |
| AC2 | Launch button uses configured URL | ✅ IMPLEMENTED | `sessions-service.ts:307-319` - `getSsoUrl()` uses `config.awsSsoPortalUrl` |
| AC3 | Configuration documented in README | ✅ IMPLEMENTED | `README.md:106-131` - Complete documentation section |

**Summary:** 3 of 3 acceptance criteria fully implemented

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Create centralized config module | ✅ Complete | ✅ VERIFIED | `src/try/config.ts` - 114 lines |
| Define TryConfig interface | ✅ Complete | ✅ VERIFIED | `config.ts:15-26` |
| Implement getConfigValue() | ✅ Complete | ✅ VERIFIED | `config.ts:61-78` |
| Support window.__TRY_CONFIG__ | ✅ Complete | ✅ VERIFIED | `config.ts:64-68` |
| Support process.env | ✅ Complete | ✅ VERIFIED | `config.ts:71-75` |
| Provide defaults | ✅ Complete | ✅ VERIFIED | `config.ts:34-49` |
| Export config object | ✅ Complete | ✅ VERIFIED | `config.ts:96-102` |
| Export getAwsSsoPortalUrl() | ✅ Complete | ✅ VERIFIED | `config.ts:111-113` |
| Integrate with getSsoUrl() | ✅ Complete | ✅ VERIFIED | `sessions-service.ts:314` |
| Document in README | ✅ Complete | ✅ VERIFIED | `README.md:106-131` |
| Document dev and prod config | ✅ Complete | ✅ VERIFIED | `README.md:118-131` |
| Create comprehensive tests | ✅ Complete | ✅ VERIFIED | 25 tests passing |

**Summary:** 12 of 12 completed tasks verified, 0 questionable, 0 falsely marked complete

### Test Coverage and Gaps

**Unit Tests:** ✅ Excellent coverage (25 tests)
- Config object properties - 5 tests
- getAwsSsoPortalUrl() function - 3 tests
- Environment variable support - 6 tests
- Configuration validation - 2 tests
- Type safety and exports - 3 tests
- Default value verification - 6 tests

**Test Quality:**
- ✅ All configuration paths tested
- ✅ Default values verified
- ✅ Type safety validated
- ✅ Function exports tested
- ✅ Integration with sessions-service tested (59 tests in sessions-service.test.ts)

**Missing Tests:** None - comprehensive coverage achieved

### Architectural Alignment

✅ **Tech-Spec Compliance:**
- Follows tech spec requirement for SSO URL configuration
- Note: Tech spec mentioned `/api/configurations` endpoint, but epic AC only requires environment variables
- Current implementation supports per-lease URL override (better than API-only approach)
- Module location matches tech spec: `src/try/config.ts`

✅ **Architecture Constraints:**
- Follows ADR-025: Environment-based Configuration
- Clean separation of concerns
- TypeScript types properly defined
- No brownfield violations

✅ **Integration:**
- Story 7.7 launch button integration working
- Epic 5 OAuth login integration (uses `config.oauthLoginUrl`)
- All API calls use centralized config

### Security Notes

✅ **No security issues identified**

**Security Considerations:**
- ✅ Configuration values are read-only (const object)
- ✅ No sensitive data in defaults (portal URLs are public)
- ✅ Environment variable support allows secrets management
- ✅ No console logging of configuration values
- ✅ Type safety prevents accidental misuse

### Best-Practices and References

**Configuration Design:**
- ✅ Single source of truth for all configuration
- ✅ Multi-source loading (window → process.env → defaults)
- ✅ Clear precedence order documented in code
- ✅ Sensible defaults for development
- ✅ Environment-specific deployment without code changes

**TypeScript:**
- ✅ Proper interface definition (TryConfig)
- ✅ Type-safe configuration access
- ✅ JSDoc documentation for all exports
- ✅ Clean module exports

**Testing:**
- ✅ Comprehensive unit test coverage
- ✅ Tests for all configuration paths
- ✅ Integration tests via dependent modules
- ✅ Clear test descriptions

**References:**
- [Twelve-Factor App: Config](https://12factor.net/config)
- [AWS SSO User Portal Documentation](https://docs.aws.amazon.com/singlesignon/latest/userguide/using-the-portal.html)
- [TypeScript: Advanced Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)

### Action Items

**Code Changes Required:**
- None - all issues fixed during review

**Advisory Notes:**
- Note: Consider adding config validation at startup to fail fast on invalid values (growth feature)
- Note: Consider adding telemetry for which config source is used (helpful for debugging deployment issues)
- Note: Story works perfectly as implemented; tech spec mention of `/api/configurations` endpoint was design note, not requirement

## Next Steps

Story 7.11 is complete and approved.

**Completed:**
- ✅ Story 7.11: AWS SSO Portal URL configuration

**Continue with:**
1. **Story 7.12:** End-to-end user journey validation
2. **Story 7.13:** Automated accessibility tests for dashboard UI

**Notes:**
- Configuration is now centralized and ready for deployment
- All Epic 7 stories can use the config module for consistent settings
- No code changes needed between dev/staging/prod environments
