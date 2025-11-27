/**
 * @jest-environment jsdom
 */

import { parseJWT, isJWTExpired, getJWTTimeRemaining } from './jwt-utils';

describe('jwt-utils', () => {
  // Helper to create a valid JWT structure
  function createTestJWT(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadB64 = btoa(JSON.stringify(payload));
    const signature = 'test-signature';
    return `${header}.${payloadB64}.${signature}`;
  }

  describe('parseJWT', () => {
    it('should parse a valid JWT and return payload', () => {
      const token = createTestJWT({
        sub: 'user@example.com',
        exp: 1700000000,
        iat: 1699900000,
      });

      const payload = parseJWT(token);

      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user@example.com');
      expect(payload?.exp).toBe(1700000000);
      expect(payload?.iat).toBe(1699900000);
    });

    it('should handle URL-safe base64 encoding', () => {
      // Create token with URL-safe characters
      const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const payload = 'eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwiZXhwIjoxNzAwMDAwMDAwfQ';
      const signature = 'signature';
      const token = `${header}.${payload}.${signature}`;

      const result = parseJWT(token);

      expect(result).not.toBeNull();
      expect(result?.sub).toBe('user@example.com');
    });

    it('should return null for empty string', () => {
      expect(parseJWT('')).toBeNull();
    });

    it('should return null for null/undefined', () => {
      expect(parseJWT(null as unknown as string)).toBeNull();
      expect(parseJWT(undefined as unknown as string)).toBeNull();
    });

    it('should return null for non-string values', () => {
      expect(parseJWT(123 as unknown as string)).toBeNull();
      expect(parseJWT({} as unknown as string)).toBeNull();
    });

    it('should return null for token with wrong number of parts', () => {
      expect(parseJWT('one.two')).toBeNull();
      expect(parseJWT('one.two.three.four')).toBeNull();
      expect(parseJWT('notajwt')).toBeNull();
    });

    it('should return null for token with invalid base64', () => {
      expect(parseJWT('xxx.!!!invalid!!!.yyy')).toBeNull();
    });

    it('should return null for token with invalid JSON', () => {
      const header = btoa('{"alg":"HS256"}');
      const invalidJson = btoa('not json');
      expect(parseJWT(`${header}.${invalidJson}.sig`)).toBeNull();
    });

    it('should parse JWT with additional claims', () => {
      const token = createTestJWT({
        sub: 'user',
        email: 'user@example.com',
        name: 'Test User',
        roles: ['admin', 'user'],
        custom: { nested: 'value' },
      });

      const payload = parseJWT(token);

      expect(payload?.email).toBe('user@example.com');
      expect(payload?.name).toBe('Test User');
      expect(payload?.roles).toEqual(['admin', 'user']);
      expect(payload?.custom).toEqual({ nested: 'value' });
    });
  });

  describe('isJWTExpired', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false for non-expired token', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = createTestJWT({ exp: futureExp });

      expect(isJWTExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const token = createTestJWT({ exp: pastExp });

      expect(isJWTExpired(token)).toBe(true);
    });

    it('should consider buffer time (default 60 seconds)', () => {
      const expiringSoon = Math.floor(Date.now() / 1000) + 30; // 30 seconds from now
      const token = createTestJWT({ exp: expiringSoon });

      // Default buffer is 60s, so 30s remaining is considered expired
      expect(isJWTExpired(token)).toBe(true);
    });

    it('should use custom buffer time', () => {
      const expiringSoon = Math.floor(Date.now() / 1000) + 30; // 30 seconds from now
      const token = createTestJWT({ exp: expiringSoon });

      // With 10s buffer, 30s remaining is not expired
      expect(isJWTExpired(token, 10)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(isJWTExpired('invalid')).toBe(true);
      expect(isJWTExpired('')).toBe(true);
    });

    it('should return false for token without exp claim', () => {
      const token = createTestJWT({ sub: 'user' });

      expect(isJWTExpired(token)).toBe(false);
    });

    it('should handle edge case of token expiring exactly now', () => {
      const exactlyNow = Math.floor(Date.now() / 1000);
      const token = createTestJWT({ exp: exactlyNow });

      // Should be expired due to buffer (default 60s)
      expect(isJWTExpired(token)).toBe(true);
      // With 0 buffer, exactly now is NOT expired (exp < now, not exp <= now)
      // The token is valid until the second after expiration
      expect(isJWTExpired(token, 0)).toBe(false);
    });
  });

  describe('getJWTTimeRemaining', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return remaining seconds for valid token', () => {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 3600; // 1 hour from now
      const token = createTestJWT({ exp });

      const remaining = getJWTTimeRemaining(token);

      // Allow 1 second tolerance for timing
      expect(remaining).toBeGreaterThanOrEqual(3599);
      expect(remaining).toBeLessThanOrEqual(3600);
    });

    it('should return 0 for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      const token = createTestJWT({ exp: pastExp });

      expect(getJWTTimeRemaining(token)).toBe(0);
    });

    it('should return 0 for invalid token', () => {
      expect(getJWTTimeRemaining('invalid')).toBe(0);
      expect(getJWTTimeRemaining('')).toBe(0);
    });

    it('should return Infinity for token without exp', () => {
      const token = createTestJWT({ sub: 'user' });

      expect(getJWTTimeRemaining(token)).toBe(Infinity);
    });

    it('should return 0 when token expires exactly now', () => {
      const exactlyNow = Math.floor(Date.now() / 1000);
      const token = createTestJWT({ exp: exactlyNow });

      expect(getJWTTimeRemaining(token)).toBe(0);
    });
  });
});
