# ADR-021: Centralized API Client

## Status

Accepted

## Context

The Try Before You Buy feature makes multiple API calls to the Innovation Sandbox API:

- Authentication status checks (`/api/auth/login/status`)
- Configuration/AUP fetching (`/api/configurations`)
- Lease listing (`/api/leases`)
- Lease creation (`POST /api/leases`)

Each call requires:

- Authorization header with Bearer JWT token
- Consistent error handling for 401 responses
- Timeout management
- Proper Content-Type headers

Without centralization, each service would duplicate authentication logic.

## Decision

Create a centralized API client module (`api-client.ts`) that:

1. Automatically injects Authorization header from sessionStorage JWT
2. Handles 401 responses with token clearing and OAuth redirect
3. Provides consistent request/response typing
4. Allows opt-out of auto-redirect via `skipAuthRedirect` option

### Key Implementation

```typescript
export async function callISBAPI(endpoint: string, options: ISBAPIOptions = {}): Promise<Response> {
  const { skipAuthRedirect, ...fetchOptions } = options

  // Build headers with auth
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extractHeaders(fetchOptions.headers),
  }

  const token = getToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(endpoint, { ...fetchOptions, headers })

  // Handle 401 with automatic redirect
  if (response.status === 401 && !skipAuthRedirect) {
    clearToken()
    redirectToOAuth()
    throw new Error("Unauthorized - redirecting to login")
  }

  return response
}
```

### Request Deduplication

The client integrates with request deduplication (ADR-028) to prevent concurrent duplicate API calls:

```typescript
export async function checkAuthStatus(): Promise<AuthStatusResult> {
  return deduplicatedRequest("checkAuthStatus", async () => {
    // ... actual API call
  })
}
```

## Consequences

### Positive

- DRY: Authentication logic in one place
- Consistent 401 handling across all API calls
- Easy to add new API methods
- Type-safe response handling
- Request deduplication prevents race conditions

### Negative

- Module coupling: all API services depend on api-client
- Must handle redirect edge cases carefully

### Neutral

- Follows standard fetch API patterns
- JWT storage strategy (sessionStorage) defined elsewhere (ADR-024)

## Implementation

### Files

- `src/try/api/api-client.ts` - Core API client with auth injection
- `src/try/api/sessions-service.ts` - Uses callISBAPI for lease operations
- `src/try/api/configurations-service.ts` - Uses callISBAPI for AUP fetching
- `src/try/api/leases-service.ts` - Uses callISBAPI for lease creation

### Usage

```typescript
// Simple GET with auto 401 redirect
const response = await callISBAPI("/api/leases")

// POST with body
const response = await callISBAPI("/api/leases", {
  method: "POST",
  body: JSON.stringify(payload),
})

// Check auth without redirect (for status checks)
const response = await callISBAPI("/api/auth/login/status", {
  skipAuthRedirect: true,
})
```

## Related ADRs

- [ADR-024](ADR-024-auth-state-management.md) - JWT storage in sessionStorage
- [ADR-028](ADR-028-request-deduplication.md) - Prevent concurrent duplicate calls
- [ADR-032](ADR-032-user-friendly-error-messages.md) - Error message handling
