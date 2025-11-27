# ADR-024: Auth State Management

## Status
Accepted

## Context

The Try Before You Buy feature needs to track authentication state across multiple components:
- Auth navigation (sign in/out buttons)
- Try buttons (check auth before opening modal)
- Try page (show different content for authenticated users)
- Auto-refresh (only fetch leases when authenticated)

State must be:
- Immediately available (no async lookup for initial render)
- Synchronized across components when auth changes
- Cleared when user signs out or token expires

## Decision

Implement an Observer pattern for authentication state management:

1. **Single source of truth**: JWT token in sessionStorage
2. **Synchronous state check**: `isAuthenticated()` reads from sessionStorage
3. **Subscriber notification**: Components subscribe to auth changes
4. **Event-driven updates**: Login/logout trigger subscriber callbacks

### Core Implementation

```typescript
class AuthState {
  private listeners: Set<AuthStateListener> = new Set();

  // Synchronous check - reads sessionStorage directly
  isAuthenticated(): boolean {
    try {
      const token = sessionStorage.getItem(JWT_TOKEN_KEY);
      return token !== null && token !== '';
    } catch {
      return false;
    }
  }

  // Subscribe to auth changes
  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all subscribers
  private notifyListeners(isAuthenticated: boolean): void {
    this.listeners.forEach(listener => listener(isAuthenticated));
  }

  // Called after successful login
  login(token: string): void {
    sessionStorage.setItem(JWT_TOKEN_KEY, token);
    this.notifyListeners(true);
  }

  // Called on logout or token expiry
  logout(): void {
    sessionStorage.removeItem(JWT_TOKEN_KEY);
    this.notifyListeners(false);
  }
}

export const authState = new AuthState();
```

### Component Subscription Pattern

```typescript
// In auth-nav.ts
const unsubscribe = authState.subscribe((isAuthenticated) => {
  updateNavigation(isAuthenticated);
});

// In try-page.ts
authState.subscribe((isAuthenticated) => {
  if (isAuthenticated) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});
```

## Consequences

### Positive
- No async delays for auth checks (immediate UI feedback)
- Single source of truth prevents state inconsistency
- Observer pattern decouples components
- Easy to add new subscribers without modifying core logic

### Negative
- sessionStorage limited to same-origin (acceptable for this use case)
- Token clears on browser restart (intentional for security)
- No JWT expiration check in client (server validates on each request)

### Neutral
- Singleton pattern appropriate for global auth state
- Cleanup required when components unmount (return unsubscribe function)

## Implementation

### Files
- `src/try/auth/auth-provider.ts` - AuthState class and singleton
- `src/try/auth/auth-provider.test.ts` - Unit tests

### Storage Key
- `isb-jwt` - JWT token storage key (defined in constants.ts)

### Usage Examples

```typescript
// Check auth synchronously
if (authState.isAuthenticated()) {
  openAupModal(tryId, callback);
} else {
  redirectToLogin();
}

// React to auth changes
const cleanup = authState.subscribe((isAuth) => {
  console.log('Auth changed:', isAuth);
});

// When done (e.g., component unmount)
cleanup();
```

## Related ADRs
- [ADR-023](ADR-023-oauth-callback-pattern.md) - OAuth flow sets token
- [ADR-021](ADR-021-centralized-api-client.md) - API client reads token
- [ADR-017](ADR-017-try-button.md) - Try button checks auth state
