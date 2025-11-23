/**
 * Unit tests for AuthState class
 * Tests authentication state management, event subscription, and sessionStorage integration
 */

import { authState } from './auth-provider';

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

    it('should return true when JWT token exists in sessionStorage', () => {
      sessionStorage.setItem('isb-jwt', 'mock-token');
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

    it('should call listener with true when token exists', () => {
      sessionStorage.setItem('isb-jwt', 'mock-token');
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

      // Add token
      sessionStorage.setItem('isb-jwt', 'mock-token');
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
      authState.login('test-jwt-token');
      expect(sessionStorage.getItem('isb-jwt')).toBe('test-jwt-token');
    });

    it('should notify subscribers after login', () => {
      const listener = jest.fn();
      authState.subscribe(listener);
      listener.mockClear();

      authState.login('test-jwt-token');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(true);
    });
  });

  describe('logout()', () => {
    it('should remove token from sessionStorage', () => {
      sessionStorage.setItem('isb-jwt', 'test-token');
      authState.logout();
      expect(sessionStorage.getItem('isb-jwt')).toBeNull();
    });

    it('should notify subscribers after logout', () => {
      sessionStorage.setItem('isb-jwt', 'test-token');
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

      // User signs in
      authState.login('jwt-token-from-oauth');
      expect(listener).toHaveBeenCalledWith(true);
      expect(authState.isAuthenticated()).toBe(true);
    });

    it('should handle complete sign out flow', () => {
      const listener = jest.fn();

      // Start authenticated
      sessionStorage.setItem('isb-jwt', 'existing-token');
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

      // Simulate OAuth login
      authState.login('oauth-token');

      // Both components should be notified
      expect(navListener).toHaveBeenCalledWith(true);
      expect(tryButtonListener).toHaveBeenCalledWith(true);
    });
  });
});
