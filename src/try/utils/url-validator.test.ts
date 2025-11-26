/**
 * @jest-environment jsdom
 */

import { isValidReturnUrl, sanitizeReturnUrl } from './url-validator';

describe('url-validator', () => {
  // Store original window.location
  const originalLocation = window.location;

  beforeAll(() => {
    // Mock window.location for consistent origin testing
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        origin: 'https://ndx.gov.uk',
        href: 'https://ndx.gov.uk/try',
      },
    });
  });

  afterAll(() => {
    // Restore original location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  describe('isValidReturnUrl', () => {
    describe('relative paths', () => {
      it('should accept simple relative paths', () => {
        expect(isValidReturnUrl('/')).toBe(true);
        expect(isValidReturnUrl('/catalogue')).toBe(true);
        expect(isValidReturnUrl('/try')).toBe(true);
      });

      it('should accept relative paths with query strings', () => {
        expect(isValidReturnUrl('/catalogue?tag=aws')).toBe(true);
        expect(isValidReturnUrl('/try?filter=active')).toBe(true);
      });

      it('should accept relative paths with hash fragments', () => {
        expect(isValidReturnUrl('/docs#section')).toBe(true);
        expect(isValidReturnUrl('/try#sessions')).toBe(true);
      });

      it('should accept nested paths', () => {
        expect(isValidReturnUrl('/catalogue/products/aws-lambda')).toBe(true);
      });
    });

    describe('protocol-relative URLs (security)', () => {
      it('should reject protocol-relative URLs', () => {
        expect(isValidReturnUrl('//evil.com')).toBe(false);
        expect(isValidReturnUrl('//evil.com/path')).toBe(false);
      });
    });

    describe('dangerous protocols (security)', () => {
      it('should reject javascript: URLs', () => {
        expect(isValidReturnUrl('javascript:alert(1)')).toBe(false);
        expect(isValidReturnUrl('javascript:void(0)')).toBe(false);
        expect(isValidReturnUrl('JAVASCRIPT:alert(1)')).toBe(false);
      });

      it('should reject data: URLs', () => {
        expect(isValidReturnUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      });

      it('should reject vbscript: URLs', () => {
        expect(isValidReturnUrl('vbscript:msgbox(1)')).toBe(false);
      });

      it('should reject file: URLs', () => {
        expect(isValidReturnUrl('file:///etc/passwd')).toBe(false);
      });

      it('should reject protocol handlers disguised as paths', () => {
        expect(isValidReturnUrl('/javascript:alert(1)')).toBe(false);
      });
    });

    describe('same-origin absolute URLs', () => {
      it('should accept same-origin URLs', () => {
        expect(isValidReturnUrl('https://ndx.gov.uk/try')).toBe(true);
        expect(isValidReturnUrl('https://ndx.gov.uk/catalogue')).toBe(true);
      });

      it('should accept same-origin URLs with query strings', () => {
        expect(isValidReturnUrl('https://ndx.gov.uk/try?id=123')).toBe(true);
      });
    });

    describe('external URLs (security)', () => {
      it('should reject external domain URLs', () => {
        expect(isValidReturnUrl('https://evil.com')).toBe(false);
        expect(isValidReturnUrl('https://evil.com/steal-token')).toBe(false);
        expect(isValidReturnUrl('http://malicious.site')).toBe(false);
      });

      it('should reject URLs with different port', () => {
        expect(isValidReturnUrl('https://ndx.gov.uk:8080/try')).toBe(false);
      });

      it('should reject URLs with different protocol', () => {
        expect(isValidReturnUrl('http://ndx.gov.uk/try')).toBe(false);
      });
    });

    describe('URLs with credentials (security)', () => {
      it('should reject URLs with embedded credentials', () => {
        expect(isValidReturnUrl('https://user:pass@ndx.gov.uk/try')).toBe(false);
        expect(isValidReturnUrl('https://user@evil.com')).toBe(false);
      });
    });

    describe('invalid inputs', () => {
      it('should reject empty string', () => {
        expect(isValidReturnUrl('')).toBe(false);
      });

      it('should reject null-like inputs', () => {
        expect(isValidReturnUrl(null as unknown as string)).toBe(false);
        expect(isValidReturnUrl(undefined as unknown as string)).toBe(false);
      });
    });
  });

  describe('sanitizeReturnUrl', () => {
    it('should return valid URLs unchanged', () => {
      expect(sanitizeReturnUrl('/catalogue')).toBe('/catalogue');
      expect(sanitizeReturnUrl('/try?filter=active')).toBe('/try?filter=active');
    });

    it('should return fallback for invalid URLs', () => {
      expect(sanitizeReturnUrl('https://evil.com')).toBe('/');
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/');
    });

    it('should return fallback for empty/null inputs', () => {
      expect(sanitizeReturnUrl('')).toBe('/');
      expect(sanitizeReturnUrl(null)).toBe('/');
      expect(sanitizeReturnUrl(undefined)).toBe('/');
    });

    it('should use custom fallback when provided', () => {
      expect(sanitizeReturnUrl('https://evil.com', '/home')).toBe('/home');
      expect(sanitizeReturnUrl('', '/dashboard')).toBe('/dashboard');
    });
  });
});
