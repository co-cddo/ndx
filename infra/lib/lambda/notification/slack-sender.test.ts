/**
 * Unit tests for Slack Webhook Integration (Story N6.1)
 *
 * Test Coverage:
 * - AC-1.1, AC-1.8: POST with correct Content-Type header
 * - AC-1.2: Retry with exponential backoff on 429
 * - AC-1.3: RetriableError after 3 failed retries
 * - AC-1.4: CriticalError on 401/403
 * - AC-1.5: Network timeout triggers retry
 * - AC-1.6: Success logging with latency
 * - AC-1.7: Webhook URL never logged
 * - EC-AC-1: PermanentError on empty URL
 * - EC-AC-3: redirect: 'error' in fetch
 * - EC-AC-5: PermanentError when response.ok !== true
 */

import { SlackSender, redactWebhookUrl } from './slack-sender';
import { RetriableError, PermanentError, CriticalError } from './errors';

// Mock Lambda Powertools with factory functions
jest.mock('@aws-lambda-powertools/logger', () => {
  const mockInfo = jest.fn();
  const mockWarn = jest.fn();
  const mockError = jest.fn();
  const mockDebug = jest.fn();

  return {
    Logger: jest.fn(() => ({
      info: mockInfo,
      warn: mockWarn,
      error: mockError,
      debug: mockDebug,
    })),
    __mockInfo: mockInfo,
    __mockWarn: mockWarn,
    __mockError: mockError,
    __mockDebug: mockDebug,
  };
});

jest.mock('@aws-lambda-powertools/metrics', () => {
  const mockAddMetric = jest.fn();
  const mockAddDimension = jest.fn();

  return {
    Metrics: jest.fn(() => ({
      addMetric: mockAddMetric,
      addDimension: mockAddDimension,
    })),
    MetricUnit: {
      Count: 'Count',
      Milliseconds: 'Milliseconds',
    },
    __mockAddMetric: mockAddMetric,
    __mockAddDimension: mockAddDimension,
  };
});

jest.mock('./secrets');

import { getSecrets } from './secrets';
import * as LoggerModule from '@aws-lambda-powertools/logger';
import * as MetricsModule from '@aws-lambda-powertools/metrics';

const mockGetSecrets = getSecrets as jest.MockedFunction<typeof getSecrets>;

// Extract mocked functions
const mockLoggerInfo = (LoggerModule as any).__mockInfo;
const mockLoggerWarn = (LoggerModule as any).__mockWarn;
const mockLoggerError = (LoggerModule as any).__mockError;
const mockLoggerDebug = (LoggerModule as any).__mockDebug;

const mockAddMetric = (MetricsModule as any).__mockAddMetric;
const mockAddDimension = (MetricsModule as any).__mockAddDimension;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Test helpers
const TEST_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX';
const EMPTY_WEBHOOK_URL = '';

const createTestParams = () => ({
  alertType: 'AccountQuarantined' as const,
  accountId: 'aws-123456789012',
  priority: 'critical' as const,
  details: { reason: 'security-violation', timestamp: '2025-11-27T10:00:00Z' },
  eventId: 'evt-test-123',
});

describe('SlackSender', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SlackSender.resetInstance();

    // Default mock: successful secret retrieval
    mockGetSecrets.mockResolvedValue({
      notifyApiKey: 'test-notify-key',
      slackWebhookUrl: TEST_WEBHOOK_URL,
    });

    // Default mock: successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as unknown as Response);
  });

  afterEach(() => {
    // Restore all mocks to prevent test pollution and ensure console spies are cleaned up
    jest.restoreAllMocks();
    SlackSender.resetInstance();
  });

  describe('redactWebhookUrl (AC-1.7)', () => {
    test('should redact webhook URL showing only protocol and domain', () => {
      const url = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX';
      const redacted = redactWebhookUrl(url);
      expect(redacted).toBe('https://hooks.slack.com/[REDACTED]');
    });

    test('should handle empty URL', () => {
      const redacted = redactWebhookUrl('');
      expect(redacted).toBe('empty');
    });

    test('should handle invalid URL', () => {
      const redacted = redactWebhookUrl('not-a-url');
      expect(redacted).toBe('[INVALID_URL]');
    });
  });

  describe('AC-1.1, AC-1.8: POST with correct Content-Type header', () => {
    test('should POST to webhook with Content-Type: application/json', async () => {
      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      // Verify fetch was called with correct headers
      expect(mockFetch).toHaveBeenCalledWith(
        TEST_WEBHOOK_URL,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    test('should POST with JSON payload containing workflow variables', async () => {
      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      // Verify body contains expected workflow variables
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body as string);

      // Verify Slack Workflow format
      expect(body).toHaveProperty('alertType', 'AccountQuarantined');
      expect(body).toHaveProperty('username', 'NDX Notifications');
      expect(body).toHaveProperty('accountid', 'aws-123456789012');
      expect(body).toHaveProperty('template', 'N/A');
      expect(body).toHaveProperty('template_id', 'N/A');
      // Details are now flattened to top level with snake_case keys
      expect(body).toHaveProperty('reason', 'security-violation');
      expect(body).toHaveProperty('timestamp', '2025-11-27T10:00:00Z');
    });
  });

  describe('EC-AC-3: Disable HTTP redirects', () => {
    test('should set redirect: error in fetch options', async () => {
      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      // Verify redirect: 'error' was set
      expect(mockFetch).toHaveBeenCalledWith(
        TEST_WEBHOOK_URL,
        expect.objectContaining({
          redirect: 'error',
        })
      );
    });
  });

  describe('AC-1.2: Retry with exponential backoff on 429', () => {
    test('should retry with exponential backoff delays (100ms, 500ms, 1000ms)', async () => {
      // Mock 429 responses followed by success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'rate limited',
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'rate limited',
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'rate limited',
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true }),
        } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      const start = Date.now();
      await sender.send(params);
      const elapsed = Date.now() - start;

      // Total delay should be approximately 1600ms (100 + 500 + 1000)
      // Allow for execution time variance
      expect(elapsed).toBeGreaterThanOrEqual(1500);
      expect(mockFetch).toHaveBeenCalledTimes(4); // 3 failures + 1 success
    });
  });

  describe('AC-1.3: RetriableError after 3 failed retries', () => {
    test('should throw RetriableError after 3 failed retry attempts on 429', async () => {
      // Mock 429 responses for all attempts
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await expect(sender.send(params)).rejects.toThrow(RetriableError);
      await expect(sender.send(params)).rejects.toThrow(/failed after 4 attempts/);

      // Should have made 4 attempts (initial + 3 retries) x 2 expects = 8 total
      expect(mockFetch).toHaveBeenCalledTimes(8);
    });

    test('should throw RetriableError after 3 failed retry attempts on 5xx', async () => {
      // Mock 503 responses for all attempts
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'service unavailable',
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await expect(sender.send(params)).rejects.toThrow(RetriableError);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('AC-1.4: CriticalError on 401/403', () => {
    test('should throw CriticalError immediately on 401 without retry', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await expect(sender.send(params)).rejects.toThrow(CriticalError);
      // Should not retry - only 1 attempt
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should throw CriticalError immediately on 403 without retry', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'forbidden',
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await expect(sender.send(params)).rejects.toThrow(CriticalError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC-1.5: Network timeout triggers retry', () => {
    test('should retry on network timeout (AbortError)', async () => {
      // Mock timeout followed by success
      const abortError = new Error('The user aborted a request');
      abortError.name = 'AbortError';

      mockFetch
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true }),
        } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      // Should have retried after timeout
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should throw RetriableError after timeout retries exhausted', async () => {
      // Mock timeout for all attempts
      const abortError = new Error('The user aborted a request');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await expect(sender.send(params)).rejects.toThrow(RetriableError);
      await expect(sender.send(params)).rejects.toThrow(/Network timeout after 4 attempts/);
      // Should have made 4 attempts (initial + 3 retries) x 2 expects = 8 total
      expect(mockFetch).toHaveBeenCalledTimes(8);
    });

    test('should retry on network error (TypeError)', async () => {
      // Mock network error followed by success
      const networkError = new TypeError('Failed to fetch');

      mockFetch
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true }),
        } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('AC-1.6: Success logging with latency', () => {
    test('should log success with latency metrics', async () => {
      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      // Verify success log
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Slack alert sent successfully',
        expect.objectContaining({
          eventId: 'evt-test-123',
          alertType: 'AccountQuarantined',
          priority: 'critical',
          latencyMs: expect.any(Number),
        })
      );

      // Verify success metric
      expect(mockAddMetric).toHaveBeenCalledWith('SlackMessageSent', 'Count', 1);
      expect(mockAddMetric).toHaveBeenCalledWith(
        'SlackWebhookLatency',
        'Milliseconds',
        expect.any(Number)
      );
    });

    test('should publish metrics with correct dimensions', async () => {
      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      expect(mockAddDimension).toHaveBeenCalledWith('alertType', 'AccountQuarantined');
      expect(mockAddDimension).toHaveBeenCalledWith('priority', 'critical');
    });
  });

  describe('AC-1.7: Webhook URL never logged', () => {
    test('should never log full webhook URL in success case', async () => {
      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      // Check all logger calls
      const allCalls = [
        ...mockLoggerInfo.mock.calls,
        ...mockLoggerWarn.mock.calls,
        ...mockLoggerError.mock.calls,
        ...mockLoggerDebug.mock.calls,
      ];

      // Ensure no call contains the full webhook URL
      allCalls.forEach((call) => {
        const callStr = JSON.stringify(call);
        expect(callStr).not.toContain('XXXXXXXXXXXXXXXXXXXX');
      });
    });

    test('should log redacted URL preview in success case', async () => {
      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Sending Slack alert',
        expect.objectContaining({
          urlPreview: 'https://hooks.slack.com/[REDACTED]',
        })
      );
    });

    test('should never log full webhook URL in error case', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      try {
        await sender.send(params);
      } catch {
        // Expected error
      }

      // Check all logger calls
      const allCalls = [
        ...mockLoggerInfo.mock.calls,
        ...mockLoggerWarn.mock.calls,
        ...mockLoggerError.mock.calls,
        ...mockLoggerDebug.mock.calls,
      ];

      // Ensure no call contains the full webhook URL
      allCalls.forEach((call) => {
        const callStr = JSON.stringify(call);
        expect(callStr).not.toContain('XXXXXXXXXXXXXXXXXXXX');
      });
    });
  });

  describe('EC-AC-1: PermanentError on empty URL', () => {
    test('should throw PermanentError when webhook URL is empty', async () => {
      // Reset instance to ensure fresh state
      SlackSender.resetInstance();

      mockGetSecrets.mockResolvedValue({
        notifyApiKey: 'test-notify-key',
        slackWebhookUrl: EMPTY_WEBHOOK_URL,
      });

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      // Test throws PermanentError with correct message
      await expect(sender.send(params)).rejects.toThrow(
        expect.objectContaining({
          name: 'PermanentError',
          message: expect.stringContaining('webhook URL is empty or missing'),
        })
      );

      // Should not attempt fetch
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should throw PermanentError when webhook URL is only whitespace', async () => {
      // Reset instance to ensure fresh state
      SlackSender.resetInstance();

      mockGetSecrets.mockResolvedValue({
        notifyApiKey: 'test-notify-key',
        slackWebhookUrl: '   ',
      });

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await expect(sender.send(params)).rejects.toThrow(PermanentError);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('EC-AC-5: PermanentError when response.ok !== true', () => {
    test('should throw PermanentError when response.ok is true but body.ok is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false }),
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await expect(sender.send(params)).rejects.toThrow(PermanentError);
      await expect(sender.send(params)).rejects.toThrow(/returned ok: false/);
    });

    test('should throw PermanentError when response body is not valid JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await expect(sender.send(params)).rejects.toThrow(PermanentError);
      await expect(sender.send(params)).rejects.toThrow(/Invalid JSON response/);
    });

    test('should throw PermanentError on 400 bad request without retry', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'bad request',
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await expect(sender.send(params)).rejects.toThrow(PermanentError);
      // Should not retry - only 1 attempt
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Failure metrics and logging', () => {
    test('should publish failure metrics on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      try {
        await sender.send(params);
      } catch {
        // Expected error
      }

      expect(mockAddMetric).toHaveBeenCalledWith('SlackMessageFailed', 'Count', 1);
      expect(mockAddDimension).toHaveBeenCalledWith('alertType', 'AccountQuarantined');
      expect(mockAddDimension).toHaveBeenCalledWith('reason', 'CriticalError');
    });

    test('should log failure with error details', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'internal server error',
      } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      try {
        await sender.send(params);
      } catch {
        // Expected error
      }

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Slack alert failed',
        expect.objectContaining({
          eventId: 'evt-test-123',
          alertType: 'AccountQuarantined',
          errorName: expect.any(String),
          errorMessage: expect.any(String),
        })
      );
    });
  });

  describe('Singleton pattern and caching', () => {
    test('should cache webhook URL across multiple send calls', async () => {
      // Need to reset before this test to ensure clean state
      SlackSender.resetInstance();
      jest.clearAllMocks();

      mockGetSecrets.mockResolvedValue({
        notifyApiKey: 'test-notify-key',
        slackWebhookUrl: TEST_WEBHOOK_URL,
      });

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);
      await sender.send(params);

      // getSecrets should only be called once (cached)
      expect(mockGetSecrets).toHaveBeenCalledTimes(1);
    });

    test('should return same instance on subsequent getInstance calls', async () => {
      const instance1 = await SlackSender.getInstance();
      const instance2 = await SlackSender.getInstance();

      expect(instance1).toBe(instance2);
    });

    test('should create new instance after resetInstance', async () => {
      const instance1 = await SlackSender.getInstance();
      SlackSender.resetInstance();
      const instance2 = await SlackSender.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Retry count metrics', () => {
    test('should publish retry count metric on each retry', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'rate limited',
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ok: true }),
        } as unknown as Response);

      const sender = await SlackSender.getInstance();
      const params = createTestParams();

      await sender.send(params);

      // Should have logged retry
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Retrying Slack webhook POST',
        expect.objectContaining({
          attempt: 1,
          maxRetries: 3,
        })
      );

      // Should have published retry metric
      expect(mockAddMetric).toHaveBeenCalledWith('SlackRetryCount', 'Count', 1);
    });
  });
});
