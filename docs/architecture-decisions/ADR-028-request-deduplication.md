# ADR-028: Request Deduplication

## Status
Accepted

## Context

Multiple components may request the same data simultaneously:
- Auth navigation and Try page both call `checkAuthStatus()`
- Multiple Try buttons on a page might trigger lease fetching
- Modal opening and page initialization both need configurations

Without deduplication, these concurrent calls result in redundant API requests, wasting bandwidth and creating race conditions where different components receive different response timings.

## Decision

Implement a request deduplication utility that:
1. Tracks in-flight requests by unique key
2. Returns existing promise for duplicate concurrent calls
3. Automatically cleans up after request completes
4. Works with any async function returning a Promise

### Core Implementation

```typescript
const inFlightRequests = new Map<string, Promise<unknown>>();

export async function deduplicatedRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Return existing promise if request in progress
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // Start new request and track it
  const promise = requestFn().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}
```

### Integration Pattern

```typescript
// In api-client.ts
export async function checkAuthStatus(): Promise<AuthStatusResult> {
  return deduplicatedRequest('checkAuthStatus', async () => {
    const response = await callISBAPI('/api/auth/login/status', {
      skipAuthRedirect: true,
    });
    // ... handle response
  });
}

// In sessions-service.ts
export async function fetchUserLeases(): Promise<LeasesResult> {
  return deduplicatedRequest('fetchUserLeases', async () => {
    // ... fetch leases
  });
}
```

## Consequences

### Positive
- Eliminates redundant API calls
- All callers receive same promise, ensuring consistent data
- Transparent to calling code - no API changes needed
- Automatic cleanup prevents memory leaks

### Negative
- Key collision possible if same key used for different requests
- Cached promise may become stale if held too long (not an issue - cleaned up on completion)

### Neutral
- Does NOT cache results - each new sequence of calls makes a fresh request
- Timeouts and errors propagate to all waiting callers (correct behavior)

## Implementation

### Files
- `src/try/utils/request-dedup.ts` - Deduplication utility
- `src/try/utils/request-dedup.test.ts` - Unit tests

### Integrated Functions

| Service | Function | Dedupe Key |
|---------|----------|------------|
| api-client | `checkAuthStatus()` | `checkAuthStatus` |
| sessions-service | `fetchUserLeases()` | `fetchUserLeases` |
| configurations-service | `fetchConfigurations()` | `fetchConfigurations` |

### NOT Deduplicated

- `createLease()` - Each POST should be a separate request
- Direct `callISBAPI()` calls - Deduplication at service level, not client level

### Testing Utilities

```typescript
// Clear all tracked requests (for test isolation)
export function clearInFlightRequests(): void {
  inFlightRequests.clear();
}

// Check if request is in progress
export function isRequestInProgress(key: string): boolean {
  return inFlightRequests.has(key);
}
```

### Example: Before vs After

```typescript
// Before deduplication: 3 API calls
const [a, b, c] = await Promise.all([
  checkAuthStatus(), // API call 1
  checkAuthStatus(), // API call 2
  checkAuthStatus(), // API call 3
]);

// After deduplication: 1 API call
const [a, b, c] = await Promise.all([
  checkAuthStatus(), // API call starts
  checkAuthStatus(), // Returns same promise
  checkAuthStatus(), // Returns same promise
]);
// a, b, and c all resolve with identical result
```

## Related ADRs
- [ADR-021](ADR-021-centralized-api-client.md) - API client using deduplication
- [ADR-024](ADR-024-auth-state-management.md) - Auth checks use deduplicated API
