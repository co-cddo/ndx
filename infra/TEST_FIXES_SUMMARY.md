# Test Fixes Summary

## Issue: Module Load Pre-warming Causing Test Failures

### Root Cause

The `secrets.ts` module calls `initializePreWarm()` at module load time (line 142):

```typescript
// Initialize pre-warming at module load time
initializePreWarm()
```

This pre-warming code attempts to fetch secrets from AWS Secrets Manager **before** test mocks can be set up, causing three test suites to fail:

1. **secrets.test.ts** - `TypeError: Cannot read properties of undefined (reading 'SecretString')`
2. **handler.test.ts** - `TypeError: logger.debug is not a function`
3. **slack-sender.test.ts** - `CredentialsProviderError: Could not load credentials from any providers`

### Solution

Created a Jest setup file that sets `SKIP_SECRETS_PREWARM=true` before any modules are loaded.

#### Files Modified

1. **jest.config.js**
   - Added `setupFiles: ['<rootDir>/jest.setup.js']` to run setup before tests

2. **jest.setup.js** (new file)
   - Sets `process.env.SKIP_SECRETS_PREWARM = 'true'`
   - Prevents pre-warming from running in test environment

3. **secrets.test.ts**
   - Added tests to verify pre-warming behavior:
     - `pre-warming is skipped when SKIP_SECRETS_PREWARM is set`
     - `pre-warming is skipped when SECRETS_PATH is not set`

### Results

**Before Fix:**

- 3 test suites failed to run
- 1 test timed out
- Test execution halted at module load

**After Fix:**

- All 13 test suites pass
- 650 tests pass (6 skipped)
- Pre-warming works correctly in production but is safely disabled in tests

### Test Execution

```bash
# Run all notification tests
yarn test lib/lambda/notification/

# Run specific test files
yarn test lib/lambda/notification/secrets.test.ts
yarn test lib/lambda/notification/handler.test.ts
yarn test lib/lambda/notification/slack-sender.test.ts
```

### Design Notes

The pre-warming mechanism is a performance optimization for production:

- **Production**: Pre-warming fetches secrets during Lambda cold start, reducing latency
- **Tests**: Pre-warming is skipped to allow proper mock setup

The `SKIP_SECRETS_PREWARM` environment variable provides a clean way to control this behavior without modifying the production code.

### Related Files

- `/Users/cns/httpdocs/cddo/ndx/infra/lib/lambda/notification/secrets.ts` (contains pre-warming logic)
- `/Users/cns/httpdocs/cddo/ndx/infra/jest.config.js` (Jest configuration)
- `/Users/cns/httpdocs/cddo/ndx/infra/jest.setup.js` (Jest setup file)
- `/Users/cns/httpdocs/cddo/ndx/infra/lib/lambda/notification/secrets.test.ts` (secrets tests)
