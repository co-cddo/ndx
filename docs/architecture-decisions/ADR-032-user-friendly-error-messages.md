# ADR-032: User-Friendly Error Messages

## Status
Accepted

## Context

Government services must communicate errors in plain language without technical jargon. The GOV.UK Design System guidance states:
- Error messages should be clear about what went wrong
- Suggest what the user can do next
- Use calm, reassuring tone (don't alarm users)

The Innovation Sandbox API returns various HTTP status codes and error formats. These must be translated to user-friendly messages that comply with GDS content guidelines.

## Decision

Implement a centralized error message utility that:
1. Maps HTTP status codes to user-friendly messages
2. Supports context-specific overrides (different wording for sessions vs configurations)
3. Provides type guards for error classification (network, timeout)
4. Falls back gracefully for unknown errors

### Core Implementation

```typescript
// Default messages for HTTP status codes
const DEFAULT_MESSAGES: Record<number, string> = {
  401: 'Please sign in to continue.',
  403: 'You do not have permission to access this resource.',
  404: 'Resource not found.',
  500: 'The sandbox service is temporarily unavailable. Please try again later.',
  502: 'The sandbox service is temporarily unavailable. Please try again later.',
  503: 'The sandbox service is temporarily unavailable. Please try again later.',
  504: 'The sandbox service is temporarily unavailable. Please try again later.',
};

// Context-specific overrides
const CONTEXT_MESSAGES: Record<ErrorContext, Partial<Record<number, string>>> = {
  sessions: {
    401: 'Please sign in to view your sessions.',
    403: 'You do not have permission to view sessions.',
    404: 'Sessions not found.',
  },
  configurations: {
    404: 'Configuration not found. Please contact support.',
  },
  // ...
};

export function getHttpErrorMessage(
  status: number,
  context: ErrorContext = 'general'
): string {
  // Check context-specific first, then default, then generic
  return (
    CONTEXT_MESSAGES[context]?.[status] ||
    DEFAULT_MESSAGES[status] ||
    'An unexpected error occurred. Please try again.'
  );
}
```

### Error Classification

```typescript
// Detect network errors (offline, CORS, DNS)
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('Failed to fetch') ||
    error.message.includes('Network request failed')
  );
}

// Detect timeout errors
export function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || error.message.includes('timeout');
}
```

## Consequences

### Positive
- Consistent error messaging across all API services
- Context-aware messages improve user understanding
- Centralized maintenance - update once, applies everywhere
- Type-safe error contexts prevent typos

### Negative
- Must maintain message mappings as API evolves
- Some specificity lost in generic messages

### Neutral
- Messages can be customized per service without affecting others
- Falls back gracefully for unmapped status codes

## Implementation

### Files
- `src/try/utils/error-utils.ts` - Error message utilities
- `src/try/utils/error-utils.test.ts` - Unit tests

### Error Contexts

| Context | Usage |
|---------|-------|
| `general` | Default fallback |
| `sessions` | fetchUserLeases() |
| `configurations` | fetchConfigurations() |
| `leases` | createLease() |

### Usage in Services

```typescript
// In sessions-service.ts
if (!response.ok) {
  return {
    success: false,
    error: getHttpErrorMessage(response.status, 'sessions'),
  };
}

// In try-catch blocks
catch (error) {
  if (isNetworkError(error)) {
    return {
      success: false,
      error: 'Unable to connect. Please check your internet connection.',
    };
  }
  if (isTimeoutError(error)) {
    return {
      success: false,
      error: 'Request timed out. Please try again.',
    };
  }
}
```

### Message Guidelines

Following GOV.UK content guidelines:
- **Do:** "Please sign in to continue."
- **Don't:** "Error 401: Unauthorized access token expired."

- **Do:** "The sandbox service is temporarily unavailable. Please try again later."
- **Don't:** "Internal server error: 500. Contact system administrator."

## Related ADRs
- [ADR-021](ADR-021-centralized-api-client.md) - API client error handling
- [ADR-026](ADR-026-accessible-modal-pattern.md) - Error display in modal
