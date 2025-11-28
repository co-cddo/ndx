/**
 * Unit tests for NotifySender class
 *
 * Tests cover:
 * - AC-1.3: Singleton pattern
 * - AC-1.5, AC-1.17: Input sanitisation with DOMPurify
 * - AC-1.7-1.11: Error classification
 * - AC-1.13, AC-1.14: Email verification
 * - AC-1.18: URL encoding
 * - AC-1.19: UUID validation
 * - AC-1.31, AC-1.32, AC-1.35: Circuit breaker
 * - AC-1.55: API key caching
 */

import { jest } from '@jest/globals';
import type { NotifyEmailResponse } from 'notifications-node-client';
import type { NotificationSecrets } from './secrets';

// Mock return values
const mockSecrets: NotificationSecrets = {
  notifyApiKey: 'test-api-key-1234567890',
  slackWebhookUrl: 'https://hooks.slack.com/test',
};

const mockEmailResponse: NotifyEmailResponse = {
  data: {
    id: 'notify-response-id-123',
    content: {
      body: 'Email body content',
      subject: 'Email subject',
      from_email: 'noreply@gov.uk',
    },
    uri: 'https://api.notifications.service.gov.uk/v2/notifications/123',
    template: {
      id: 'template-id-456',
      version: 1,
      uri: 'https://api.notifications.service.gov.uk/v2/templates/456',
    },
  },
};

// Mock external dependencies
jest.mock('notifications-node-client', () => ({
  NotifyClient: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn(),
    getTemplateById: jest.fn(),
  })),
}));

jest.mock('./secrets', () => ({
  getSecrets: jest.fn(),
}));

// Import after mocks are set up
import { NotifyClient } from 'notifications-node-client';
import { getSecrets } from './secrets';

// Type the mocked function
const mockGetSecrets = getSecrets as jest.MockedFunction<typeof getSecrets>;
import {
  NotifySender,
  hashForLog,
  tokenMetadata,
  validateUUID,
  sanitizeValue,
  encodeForUrl,
  sanitizePersonalisation,
  buildSsoUrl,
  calculateJitteredDelay,
  NotifyParams,
} from './notify-sender';
import { RetriableError, PermanentError, CriticalError, SecurityError } from './errors';

// Type for Notify API errors - extends Error to satisfy ESLint
class NotifyApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'NotifyApiError';
  }
}

describe('NotifySender', () => {
  let mockSendEmail: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset singleton
    NotifySender.resetInstance();

    // Set up secrets mock
    mockGetSecrets.mockResolvedValue(mockSecrets);

    // Set up mock sendEmail
    mockSendEmail = jest.fn(() => Promise.resolve(mockEmailResponse));

    (NotifyClient as jest.Mock).mockImplementation(() => ({
      sendEmail: mockSendEmail,
      getTemplateById: jest.fn(),
    }));
  });

  // =========================================================================
  // AC-1.3: Singleton Pattern Tests
  // =========================================================================

  describe('Singleton Pattern (AC-1.3)', () => {
    it('should return the same instance on multiple getInstance calls', async () => {
      const instance1 = await NotifySender.getInstance();
      const instance2 = await NotifySender.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should only create NotifyClient once', async () => {
      await NotifySender.getInstance();
      await NotifySender.getInstance();
      await NotifySender.getInstance();

      expect(NotifyClient).toHaveBeenCalledTimes(1);
    });

    it('should only fetch secrets once (AC-1.55)', async () => {
      await NotifySender.getInstance();
      await NotifySender.getInstance();

      expect(getSecrets).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // AC-1.7-1.11: Error Classification Tests
  // =========================================================================

  describe('Error Classification', () => {
    const baseParams: NotifyParams = {
      templateId: 'template-123',
      email: 'user@gov.uk',
      personalisation: { name: 'Test User' },
      eventId: 'evt-123',
      eventUserEmail: 'user@gov.uk',
    };

    it('AC-1.7: should throw PermanentError for 400 errors (no retry)', async () => {
      const error = new NotifyApiError('Invalid template', 400);
      mockSendEmail.mockImplementation(() => Promise.reject(error));

      const sender = await NotifySender.getInstance();

      await expect(sender.send(baseParams)).rejects.toThrow(PermanentError);
    });

    it('AC-1.8: should throw CriticalError for 401 errors', async () => {
      const error = new NotifyApiError('Invalid API key', 401);
      mockSendEmail.mockImplementation(() => Promise.reject(error));

      const sender = await NotifySender.getInstance();

      await expect(sender.send(baseParams)).rejects.toThrow(CriticalError);
    });

    it('AC-1.8: should throw CriticalError for 403 errors', async () => {
      const error = new NotifyApiError('Forbidden', 403);
      mockSendEmail.mockImplementation(() => Promise.reject(error));

      const sender = await NotifySender.getInstance();

      await expect(sender.send(baseParams)).rejects.toThrow(CriticalError);
    });

    it('AC-1.9: should throw RetriableError with 1000ms retryAfter for 429 errors', async () => {
      const error = new NotifyApiError('Rate limited', 429);
      mockSendEmail.mockImplementation(() => Promise.reject(error));

      const sender = await NotifySender.getInstance();

      try {
        await sender.send(baseParams);
        fail('Expected RetriableError');
      } catch (err) {
        expect(err).toBeInstanceOf(RetriableError);
        expect((err as RetriableError).retryAfterMs).toBe(1000);
      }
    });

    it('AC-1.10: should throw RetriableError for 5xx errors', async () => {
      const error = new NotifyApiError('Server error', 500);
      mockSendEmail.mockImplementation(() => Promise.reject(error));

      const sender = await NotifySender.getInstance();

      await expect(sender.send(baseParams)).rejects.toThrow(RetriableError);
    });

    it('AC-1.10: should throw RetriableError for 503 errors', async () => {
      const error = new NotifyApiError('Service unavailable', 503);
      mockSendEmail.mockImplementation(() => Promise.reject(error));

      const sender = await NotifySender.getInstance();

      await expect(sender.send(baseParams)).rejects.toThrow(RetriableError);
    });

    it('AC-1.11: should default to RetriableError for unknown errors', async () => {
      const error = new NotifyApiError('Unknown error');
      mockSendEmail.mockImplementation(() => Promise.reject(error));

      const sender = await NotifySender.getInstance();

      await expect(sender.send(baseParams)).rejects.toThrow(RetriableError);
    });
  });

  // =========================================================================
  // AC-1.13, AC-1.14: Email Verification Tests
  // =========================================================================

  describe('Email Verification (AC-1.13, AC-1.14)', () => {
    it('AC-1.14: should throw SecurityError when emails do not match', async () => {
      const sender = await NotifySender.getInstance();

      const params: NotifyParams = {
        templateId: 'template-123',
        email: 'recipient@gov.uk',
        personalisation: { name: 'Test' },
        eventId: 'evt-123',
        eventUserEmail: 'different@gov.uk', // Different email
      };

      await expect(sender.send(params)).rejects.toThrow(SecurityError);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should succeed when emails match exactly', async () => {
      const sender = await NotifySender.getInstance();

      const params: NotifyParams = {
        templateId: 'template-123',
        email: 'user@gov.uk',
        personalisation: { name: 'Test' },
        eventId: 'evt-123',
        eventUserEmail: 'user@gov.uk',
      };

      await sender.send(params);
      expect(mockSendEmail).toHaveBeenCalled();
    });

    it('should fail when email case differs (strict comparison)', async () => {
      const sender = await NotifySender.getInstance();

      const params: NotifyParams = {
        templateId: 'template-123',
        email: 'User@Gov.UK',
        personalisation: { name: 'Test' },
        eventId: 'evt-123',
        eventUserEmail: 'user@gov.uk',
      };

      await expect(sender.send(params)).rejects.toThrow(SecurityError);
    });
  });

  // =========================================================================
  // AC-1.31, AC-1.32: Circuit Breaker Tests
  // =========================================================================

  describe('Circuit Breaker (AC-1.31, AC-1.32)', () => {
    const baseParams: NotifyParams = {
      templateId: 'template-123',
      email: 'user@gov.uk',
      personalisation: { name: 'Test' },
      eventId: 'evt-123',
      eventUserEmail: 'user@gov.uk',
    };

    it('AC-1.31: should open circuit breaker after 20 consecutive 5xx errors', async () => {
      const error = new NotifyApiError('Server error', 500);
      mockSendEmail.mockImplementation(() => Promise.reject(error));

      const sender = await NotifySender.getInstance();

      // Trigger 20 consecutive failures
      for (let i = 0; i < 20; i++) {
        try {
          await sender.send({ ...baseParams, eventId: `evt-${i}` });
        } catch {
          // Expected to fail
        }
      }

      // Verify circuit is open
      const state = sender.getCircuitBreakerState();
      expect(state.consecutiveFailures).toBe(20);
      expect(state.openUntil).not.toBeNull();
    });

    it('should reject requests when circuit breaker is open', async () => {
      const error = new NotifyApiError('Server error', 500);
      mockSendEmail.mockImplementation(() => Promise.reject(error));

      const sender = await NotifySender.getInstance();

      // Trigger 20 failures to open circuit
      for (let i = 0; i < 20; i++) {
        try {
          await sender.send({ ...baseParams, eventId: `evt-${i}` });
        } catch {
          // Expected to fail
        }
      }

      // Next request should be rejected immediately
      try {
        await sender.send({ ...baseParams, eventId: 'evt-21' });
        fail('Expected RetriableError');
      } catch (err) {
        expect(err).toBeInstanceOf(RetriableError);
        expect((err as Error).message).toContain('Circuit breaker open');
      }
    });

    it('should reset circuit breaker on successful send', async () => {
      const sender = await NotifySender.getInstance();

      // Simulate some failures
      const error = new NotifyApiError('Server error', 500);
      mockSendEmail.mockImplementationOnce(() => Promise.reject(error));

      try {
        await sender.send(baseParams);
      } catch {
        // Expected
      }

      // Verify failure recorded
      expect(sender.getCircuitBreakerState().consecutiveFailures).toBe(1);

      // Now succeed
      mockSendEmail.mockImplementationOnce(() => Promise.resolve(mockEmailResponse));

      await sender.send(baseParams);

      // Verify reset
      expect(sender.getCircuitBreakerState().consecutiveFailures).toBe(0);
    });
  });
});

// =========================================================================
// Utility Function Tests
// =========================================================================

describe('hashForLog', () => {
  it('should return first 12 characters of SHA-256 hash', () => {
    const result = hashForLog('test@example.com');
    expect(result).toHaveLength(12);
    expect(result).toMatch(/^[a-f0-9]+$/);
  });

  it('should return "empty" for empty string', () => {
    expect(hashForLog('')).toBe('empty');
  });

  it('should produce consistent hashes', () => {
    const hash1 = hashForLog('test@gov.uk');
    const hash2 = hashForLog('test@gov.uk');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashForLog('user1@gov.uk');
    const hash2 = hashForLog('user2@gov.uk');
    expect(hash1).not.toBe(hash2);
  });
});

describe('tokenMetadata (AC-1.22)', () => {
  it('should return "{length}:{hash}" format', () => {
    const result = tokenMetadata('some-api-key-12345');
    expect(result).toMatch(/^\d+:[a-f0-9]{12}$/);
  });

  it('should return "0:empty" for empty token', () => {
    expect(tokenMetadata('')).toBe('0:empty');
  });

  it('should include correct length', () => {
    const token = 'test-token-1234567890';
    const result = tokenMetadata(token);
    expect(result.startsWith(`${token.length}:`)).toBe(true);
  });
});

describe('validateUUID (AC-1.19)', () => {
  it('should accept valid UUID v4', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should reject UUID with query string', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000?redirect=evil.com')).toBe(false);
  });

  it('should reject UUID with path', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000/../../secret')).toBe(false);
  });

  it('should reject non-UUID strings', () => {
    expect(validateUUID('not-a-uuid')).toBe(false);
    expect(validateUUID('')).toBe(false);
    expect(validateUUID('12345')).toBe(false);
  });

  it('should reject UUID with extra characters', () => {
    expect(validateUUID('550e8400-e29b-41d4-a716-446655440000extra')).toBe(false);
    expect(validateUUID('prefix550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('should handle null/undefined gracefully', () => {
    // @ts-expect-error Testing null handling
    expect(validateUUID(null)).toBe(false);
    // @ts-expect-error Testing undefined handling
    expect(validateUUID(undefined)).toBe(false);
  });
});

describe('sanitizeValue (AC-1.5, AC-1.17)', () => {
  // Note: sanitizeValue HTML-encodes rather than strips
  // This is more secure as it preserves content while making it safe
  // GOV.UK Notify also escapes HTML in templates (defense in depth)

  it('should HTML-encode script tags to prevent XSS', () => {
    expect(sanitizeValue('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    expect(sanitizeValue('<img src=x onerror=alert()>')).toBe(
      '&lt;img src=x onerror=alert()&gt;'
    );
  });

  it('should HTML-encode dangerous attributes', () => {
    expect(sanitizeValue('<div onclick="evil()">content</div>')).toBe(
      '&lt;div onclick=&quot;evil()&quot;&gt;content&lt;/div&gt;'
    );
  });

  it('should preserve plain text', () => {
    expect(sanitizeValue('Hello, World!')).toBe('Hello, World!');
    expect(sanitizeValue('Test User')).toBe('Test User');
  });

  it('should handle numbers', () => {
    expect(sanitizeValue(12345)).toBe('12345');
    expect(sanitizeValue(99.99)).toBe('99.99');
  });

  it('should handle special characters in text', () => {
    expect(sanitizeValue('£100.00')).toBe('£100.00');
    expect(sanitizeValue('50%')).toBe('50%');
  });

  it('should escape ampersand', () => {
    expect(sanitizeValue('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape quotes', () => {
    expect(sanitizeValue('He said "Hello"')).toBe('He said &quot;Hello&quot;');
    expect(sanitizeValue("It's fine")).toBe('It&#039;s fine');
  });
});

describe('encodeForUrl (AC-1.18)', () => {
  it('should encode special characters', () => {
    expect(encodeForUrl('hello world')).toBe('hello%20world');
    expect(encodeForUrl('test?query=value')).toBe('test%3Fquery%3Dvalue');
    expect(encodeForUrl('a=b&c=d')).toBe('a%3Db%26c%3Dd');
  });

  it('should encode path traversal attempts', () => {
    expect(encodeForUrl('../../../etc/passwd')).toBe('..%2F..%2F..%2Fetc%2Fpasswd');
  });
});

describe('sanitizePersonalisation (AC-1.5, AC-1.17)', () => {
  it('should HTML-encode all values in object', () => {
    const input = {
      name: '<script>evil</script>John',
      message: '<b>Hello</b>',
      amount: 100,
    };

    const result = sanitizePersonalisation(input);

    // Values are HTML-encoded, not stripped
    expect(result.name).toBe('&lt;script&gt;evil&lt;/script&gt;John');
    expect(result.message).toBe('&lt;b&gt;Hello&lt;/b&gt;');
    expect(result.amount).toBe('100');
  });

  it('should return string values for all entries', () => {
    const result = sanitizePersonalisation({
      text: 'Hello',
      number: 42,
    });

    expect(typeof result.text).toBe('string');
    expect(typeof result.number).toBe('string');
  });

  it('should handle plain text without modification', () => {
    const result = sanitizePersonalisation({
      name: 'John Smith',
      email: 'john@example.gov.uk',
    });

    expect(result.name).toBe('John Smith');
    expect(result.email).toBe('john@example.gov.uk');
  });
});

describe('buildSsoUrl (AC-1.20)', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('should construct URL with encoded lease ID', () => {
    const result = buildSsoUrl('https://portal.gov.uk', validUuid);
    expect(result).toBe(`https://portal.gov.uk?lease=${validUuid}`);
  });

  it('should throw PermanentError for invalid UUID', () => {
    expect(() => buildSsoUrl('https://portal.gov.uk', 'invalid-uuid')).toThrow(PermanentError);
  });

  it('should throw for UUID with injection attempt', () => {
    expect(() =>
      buildSsoUrl('https://portal.gov.uk', `${validUuid}?redirect=evil.com`)
    ).toThrow(PermanentError);
  });
});

describe('calculateJitteredDelay (AC-1.35)', () => {
  it('should return delay within expected range', () => {
    const baseDelay = 1000;
    const results: number[] = [];

    for (let i = 0; i < 100; i++) {
      results.push(calculateJitteredDelay(baseDelay));
    }

    // All results should be between baseDelay and baseDelay * 1.5
    results.forEach((delay) => {
      expect(delay).toBeGreaterThanOrEqual(baseDelay);
      expect(delay).toBeLessThan(baseDelay * 1.5);
    });
  });

  it('should produce varying results (jitter)', () => {
    const baseDelay = 1000;
    const results = new Set<number>();

    for (let i = 0; i < 100; i++) {
      results.add(calculateJitteredDelay(baseDelay));
    }

    // Should have multiple different values (jitter working)
    expect(results.size).toBeGreaterThan(1);
  });
});
