/**
 * Unit tests for AuthState class
 * Tests authentication state management, event subscription, and sessionStorage integration
 */

import { authState } from './auth-provider';

/**
 * Helper to create a valid JWT for testing.
 * Creates a token that expires in the future.
 */
function createTestJWT(expiresInSeconds = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'test-user',
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      iat: Math.floor(Date.now() / 1000),
    })
  );
  const signature = 'test-signature';
  return `${header}.${payload}.${signature}`;
}

describe('AuthState', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    // Clean up sessionStorage after each test
    sessionStorage.clear();
  });

  describe('isAuthenticated()', () => {
    it('should return false when no JWT token in sessionStorage', () => {
      expect(authState.isAuthenticated()).toBe(false);
    });

    it('should return true when valid JWT token exists in sessionStorage', () => {
      sessionStorage.setItem('isb-jwt', createTestJWT());
      expect(authState.isAuthenticated()).toBe(true);
    });

    it('should return false when JWT token is empty string', () => {
      sessionStorage.setItem('isb-jwt', '');
      expect(authState.isAuthenticated()).toBe(false);
    });
  });

  describe('subscribe()', () => {
    it('should call listener immediately with current auth state', () => {
      const listener = jest.fn();
      authState.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(false);
    });

    it('should call listener with true when valid token exists', () => {
      sessionStorage.setItem('isb-jwt', createTestJWT());
      const listener = jest.fn();
      authState.subscribe(listener);
      expect(listener).toHaveBeenCalledWith(true);
    });

    it('should allow multiple subscribers', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      authState.subscribe(listener1);
      authState.subscribe(listener2);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('notify()', () => {
    it('should notify all subscribers when auth state changes', () => {
      const listener = jest.fn();
      authState.subscribe(listener);

      // Clear initial call
      listener.mockClear();

      // Add valid token
      sessionStorage.setItem('isb-jwt', createTestJWT());
      authState.notify();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(true);
    });

    it('should notify multiple subscribers', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      authState.subscribe(listener1);
      authState.subscribe(listener2);

      // Clear initial calls
      listener1.mockClear();
      listener2.mockClear();

      authState.notify();

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('login()', () => {
    it('should store token in sessionStorage', () => {
      const token = createTestJWT();
      authState.login(token);
      expect(sessionStorage.getItem('isb-jwt')).toBe(token);
    });

    it('should notify subscribers after login', () => {
      const listener = jest.fn();
      authState.subscribe(listener);
      listener.mockClear();

      authState.login(createTestJWT());

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(true);
    });
  });

  describe('logout()', () => {
    it('should remove token from sessionStorage', () => {
      sessionStorage.setItem('isb-jwt', createTestJWT());
      authState.logout();
      expect(sessionStorage.getItem('isb-jwt')).toBeNull();
    });

    it('should notify subscribers after logout', () => {
      sessionStorage.setItem('isb-jwt', createTestJWT());
      const listener = jest.fn();
      authState.subscribe(listener);
      listener.mockClear();

      authState.logout();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(false);
    });
  });

  describe('Authentication flow integration', () => {
    it('should handle complete sign in flow', () => {
      const listener = jest.fn();

      // Initial state: not authenticated
      authState.subscribe(listener);
      expect(listener).toHaveBeenCalledWith(false);
      listener.mockClear();

      // User signs in with valid JWT
      authState.login(createTestJWT());
      expect(listener).toHaveBeenCalledWith(true);
      expect(authState.isAuthenticated()).toBe(true);
    });

    it('should handle complete sign out flow', () => {
      const listener = jest.fn();

      // Start authenticated with valid token
      sessionStorage.setItem('isb-jwt', createTestJWT());
      authState.subscribe(listener);
      expect(listener).toHaveBeenCalledWith(true);
      listener.mockClear();

      // User signs out
      authState.logout();
      expect(listener).toHaveBeenCalledWith(false);
      expect(authState.isAuthenticated()).toBe(false);
    });

    it('should update UI components on auth state change', () => {
      // Simulate two UI components subscribing
      const navListener = jest.fn();
      const tryButtonListener = jest.fn();

      authState.subscribe(navListener);
      authState.subscribe(tryButtonListener);
      navListener.mockClear();
      tryButtonListener.mockClear();

      // Simulate OAuth login with valid JWT
      authState.login(createTestJWT());

      // Both components should be notified
      expect(navListener).toHaveBeenCalledWith(true);
      expect(tryButtonListener).toHaveBeenCalledWith(true);
    });
  });

  describe('JWT expiration', () => {
    it('should return false for expired token', () => {
      // Create an already expired token (expired 100 seconds ago)
      const expiredToken = createTestJWT(-100);
      sessionStorage.setItem('isb-jwt', expiredToken);

      expect(authState.isAuthenticated()).toBe(false);
    });

    it('should clear expired token from sessionStorage', () => {
      const expiredToken = createTestJWT(-100);
      sessionStorage.setItem('isb-jwt', expiredToken);

      authState.isAuthenticated();

      // Token should have been removed
      expect(sessionStorage.getItem('isb-jwt')).toBeNull();
    });

    it('should return false for invalid token format', () => {
      sessionStorage.setItem('isb-jwt', 'invalid-not-a-jwt');

      expect(authState.isAuthenticated()).toBe(false);
    });

    it('should return true for token expiring in the future', () => {
      // Token expires in 1 hour
      const validToken = createTestJWT(3600);
      sessionStorage.setItem('isb-jwt', validToken);

      expect(authState.isAuthenticated()).toBe(true);
    });

    it('should consider buffer time when checking expiration', () => {
      // Token expires in 30 seconds (less than 60s buffer)
      const nearExpiredToken = createTestJWT(30);
      sessionStorage.setItem('isb-jwt', nearExpiredToken);

      // Should be considered expired due to 60s buffer
      expect(authState.isAuthenticated()).toBe(false);
    });
  });
});
