# Story 1.3: Domain List API

Status: done

## Story

As a **government user**,
I want **to see my organisation's domain in a list of allowed domains**,
so that **I know my council is eligible to sign up** (FR2, FR12, FR13, FR15).

## Acceptance Criteria

1. **Given** the Lambda infrastructure exists (Story 1.2)
   **When** I call `GET /signup-api/domains`
   **Then** I receive a JSON response with `{ domains: [{ domain, orgName }] }`
   **And** the response includes ~340 English LA domains

2. **Given** the domains endpoint is called
   **When** GitHub JSON source is available
   **Then** the response is returned within 500ms (NFR2)
   **And** the domain list is cached in Lambda memory

3. **Given** the domains are cached
   **When** I call the endpoint again within 5 minutes
   **Then** the cached data is returned without fetching GitHub
   **And** the cache TTL is maximum 5 minutes (NFR12)

4. **Given** GitHub is unavailable
   **When** cached data exists
   **Then** the stale cached data is returned (NFR18, NFR21)
   **And** an error is logged with correlation ID (NFR22)

5. **Given** GitHub is unavailable
   **When** no cached data exists
   **Then** a 503 error is returned with message "Service temporarily unavailable"

## Tasks / Subtasks

- [x] Task 1: Create domain service module (AC: #1, #2)
  - [x] 1.1 Create `infra-signup/lib/lambda/signup/domain-service.ts`
  - [x] 1.2 Implement `DomainInfo` interface: `{ domain: string, orgName: string }`
  - [x] 1.3 Define GitHub JSON URL constant (raw GitHub URL for LA domain list)
  - [x] 1.4 Implement `fetchDomainsFromGitHub()` function with fetch and JSON parsing

- [x] Task 2: Implement in-memory caching with TTL (AC: #2, #3)
  - [x] 2.1 Create module-level cache variable: `{ data: DomainInfo[], timestamp: number }`
  - [x] 2.2 Implement `CACHE_TTL_MS = 5 * 60 * 1000` (5 minutes)
  - [x] 2.3 Implement `isCacheValid()` function checking timestamp
  - [x] 2.4 Implement `getCachedDomains()` returning cache if valid

- [x] Task 3: Implement graceful fallback on GitHub failure (AC: #4, #5)
  - [x] 3.1 Implement try/catch around GitHub fetch
  - [x] 3.2 Return stale cache if GitHub fails and cache exists
  - [x] 3.3 Log error with correlation ID when using stale cache
  - [x] 3.4 Return 503 error if GitHub fails and no cache exists

- [x] Task 4: Wire up handler route (AC: #1)
  - [x] 4.1 Update `handler.ts` to import domain service
  - [x] 4.2 Replace placeholder with actual domain list call
  - [x] 4.3 Return `{ domains: [...] }` response structure
  - [x] 4.4 Pass correlationId through response

- [x] Task 5: Add unit tests (AC: #1-#5)
  - [x] 5.1 Create `domain-service.test.ts` with mock fetch
  - [x] 5.2 Test successful fetch returns domain list
  - [x] 5.3 Test cache returns without re-fetching within TTL
  - [x] 5.4 Test stale cache returned on GitHub failure
  - [x] 5.5 Test 503 returned when GitHub fails with no cache
  - [x] 5.6 Test response time validation (< 500ms for cached)
  - [x] 5.7 Update `handler.test.ts` for domains endpoint

## Dev Notes

### Critical Architecture Patterns

**MUST follow existing codebase patterns - reference these files:**

1. **Lambda handler pattern** - Established in Story 1.2 `handler.ts`:
   - Structured JSON logging with `console.log(JSON.stringify({...}))`
   - Correlation ID from `event.requestContext?.requestId`
   - Security headers on all responses (now includes HSTS)
   - Error response format `{ error: string, message: string }`
   - Success response format `{ domains: [...] }`

2. **Service module pattern** - Mirror services.ts placeholder:
   - Pure functions with typed inputs/outputs
   - Module-level cache variables
   - Async/await for external calls

3. **Test patterns** - Mirror existing handler.test.ts:
   - Jest with TypeScript
   - Mock fetch via `jest.spyOn(global, 'fetch')`
   - Test both happy path and error scenarios

### GitHub Domain Source

**Source URL (from architecture.md):**
```typescript
// The exact URL needs to be confirmed - this is the pattern:
const GITHUB_DOMAIN_URL = 'https://raw.githubusercontent.com/cabinetoffice/local-authority-domains/main/domains.json'
```

**Expected JSON structure:**
```json
{
  "domains": [
    { "domain": "westbury.gov.uk", "orgName": "Westbury District Council" },
    { "domain": "reading.gov.uk", "orgName": "Reading Borough Council" }
  ]
}
```

### Caching Implementation

**In-memory cache pattern (ADR-044):**
```typescript
// Module-level cache
let domainCache: { data: DomainInfo[]; timestamp: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes (NFR12)

async function getDomains(correlationId: string): Promise<DomainInfo[]> {
  // Check cache first
  if (domainCache && Date.now() - domainCache.timestamp < CACHE_TTL_MS) {
    console.log(JSON.stringify({
      level: 'DEBUG',
      message: 'Returning cached domains',
      cacheAge: Date.now() - domainCache.timestamp,
      correlationId
    }))
    return domainCache.data
  }

  try {
    const freshData = await fetchDomainsFromGitHub()
    domainCache = { data: freshData, timestamp: Date.now() }
    return freshData
  } catch (error) {
    // Graceful fallback to stale cache
    if (domainCache) {
      console.log(JSON.stringify({
        level: 'WARN',
        message: 'GitHub unavailable, returning stale cache',
        error: error instanceof Error ? error.message : 'Unknown',
        cacheAge: Date.now() - domainCache.timestamp,
        correlationId
      }))
      return domainCache.data
    }
    // No cache available - must fail
    throw error
  }
}
```

### Performance Requirements

**NFR2: Response within 500ms:**
- Cold start: First request may exceed 500ms (acceptable per NFR23)
- Warm Lambda: Cached response should be < 50ms
- GitHub fetch: May take 200-400ms (acceptable if < 500ms total)

**Testing approach:**
```typescript
it('should return cached domains within 50ms', async () => {
  // Prime the cache
  await getDomains('test-id')

  // Measure cached response time
  const start = Date.now()
  await getDomains('test-id')
  const duration = Date.now() - start

  expect(duration).toBeLessThan(50)
})
```

### Error Handling

**Error response for service unavailable (AC#5):**
```typescript
return errorResponse(
  503,
  'SERVICE_UNAVAILABLE',
  'Service temporarily unavailable',
  correlationId
)
```

**Structured logging for errors (NFR22):**
```typescript
console.log(JSON.stringify({
  level: 'ERROR',
  message: 'GitHub domain fetch failed',
  error: error.message,
  correlationId,
  // Never log full URL (may contain tokens in other contexts)
}))
```

### Project Structure Notes

**Files to create/modify:**
```
infra-signup/lib/lambda/signup/
├── handler.ts              # MODIFY: Add domain endpoint implementation
├── handler.test.ts         # MODIFY: Add domain endpoint tests
├── domain-service.ts       # CREATE: Domain fetching and caching logic
├── domain-service.test.ts  # CREATE: Domain service unit tests
└── services.ts             # UNCHANGED: Placeholder for future services
```

**Type definitions (from Story 1.1):**
```typescript
// src/signup/types.ts - import via @ndx/signup-types
export interface DomainInfo {
  domain: string
  orgName: string
}
```

### Security Considerations

**From project-context.md:**

1. **Cache security** - Never cache error responses, validate JSON schema
2. **No PII** - Domain list contains no personal data
3. **CORS** - Handled by CloudFront, not Lambda
4. **Rate limiting** - `/signup-api/domains` at 10 req/min/IP (handled by WAF in Story 3.2)

### Testing Requirements

**Unit tests (domain-service.test.ts):**
- Successful GitHub fetch returns domain array
- Cache is populated after fetch
- Cached data returned without fetch call
- Cache expiry triggers new fetch
- Stale cache returned on GitHub error
- Error thrown when no cache and GitHub fails
- Response time under 50ms for cached data

**Handler tests (handler.test.ts):**
- GET /signup-api/domains returns 200 with domain array
- Response includes correct headers (Content-Type, security headers)
- Error response when service unavailable

### Previous Story Learnings

**From Story 1.2 code review:**
- Always include HSTS header in security headers ✅
- Include X-Request-ID in responses for tracing ✅
- Log unknown/error scenarios at WARN level ✅
- Use explicit LogGroup in CDK (already done) ✅

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns]
- [Source: _bmad-output/planning-artifacts/project-context.md#Lambda Rules]
- [Source: _bmad-output/planning-artifacts/project-context.md#Cache Security Rules]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: infra-signup/lib/lambda/signup/handler.ts - Story 1.2 implementation]
- [Source: infra-signup/lib/lambda/signup/handler.test.ts - Test patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- 59 tests passing in infra-signup package
- 712 tests passing in root package

### Completion Notes List

**Completed:**
- Task 1: Created domain-service.ts with GitHub fetching ✅
- Task 2: Implemented in-memory caching with 5-min TTL ✅
- Task 3: Implemented graceful fallback to stale cache ✅
- Task 4: Wired up handler route for GET /signup-api/domains ✅
- Task 5: Created comprehensive unit tests ✅

**Implementation Notes:**
- DomainInfo interface imported from @ndx/signup-types (shared types from Story 1.1)
- Cache uses module-level variable for Lambda warm invocation reuse
- Graceful fallback returns stale cache on GitHub failure (NFR18, NFR21)
- 503 SERVICE_UNAVAILABLE returned only when GitHub fails and no cache exists
- Structured JSON logging at DEBUG (cache hit), INFO (fresh fetch), WARN (stale cache), ERROR (failure)
- Test helper functions exported for testing: clearCache(), setCache()

### Change Log

- 2026-01-13: Created domain-service.ts with fetchDomainsFromGitHub(), getDomains(), cache functions
- 2026-01-13: Created domain-service.test.ts with 18 tests for caching, fallback, and error scenarios
- 2026-01-13: Updated handler.ts to wire up /signup-api/domains endpoint
- 2026-01-13: Updated handler.test.ts with 6 new tests for domain endpoint (mocked domain service)

### File List

**Created:**
- infra-signup/lib/lambda/signup/domain-service.ts
- infra-signup/lib/lambda/signup/domain-service.test.ts

**Modified:**
- infra-signup/lib/lambda/signup/handler.ts
- infra-signup/lib/lambda/signup/handler.test.ts

## Code Review Record

### Review Date
2026-01-13

### Review Findings Summary

**Issues Found: 8 (5 fixed, 3 accepted as-is)**

| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | HIGH | Missing fetch timeout - no AbortController for GitHub fetch | FIXED - Added AbortController with 3s timeout |
| 2 | HIGH | No domain data validation - malformed entries cached | FIXED - Added isValidDomainInfo() validation, filters invalid entries |
| 3 | HIGH | Handler comment outdated - said "Will implement" but already done | FIXED - Updated comment to "GET /signup-api/domains endpoint" |
| 4 | MEDIUM | Test hardcoded timing expectation potentially flaky | ACCEPTED - 50ms buffer is reasonable for CI |
| 5 | MEDIUM | Unused Context import in handler.test.ts | FIXED - Removed unused import |
| 6 | LOW | Missing JSDoc for GitHubDomainsResponse | FIXED - Added documentation |
| 7 | LOW | DomainInfo runtime schema validation missing | ADDRESSED - Added isValidDomainInfo() type guard |
| 8 | LOW | DEBUG log level for cache hits | ACCEPTED - DEBUG appropriate for cache metrics |

### Tests After Review
- infra-signup: 62 tests passing (up from 59)
- Root package: 712 tests passing

### Review Outcome
**PASS** - All critical issues addressed. Story approved for completion.
