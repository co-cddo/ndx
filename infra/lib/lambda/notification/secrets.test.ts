/**
 * Unit tests for Secrets Manager integration
 *
 * Tests cover:
 * - AC-5.1: Secret retrieval from Secrets Manager
 * - AC-5.2: Caching behavior
 * - AC-5.3: Error handling
 * - AC-5.8: Cache invalidation
 */

import { CriticalError } from './errors';

// Mock AWS SDK before importing module
const mockSend = jest.fn();

class MockSecretsManagerServiceException extends Error {
  constructor(options: { name: string; message: string }) {
    super(options.message);
    this.name = options.name;
  }
}

jest.mock('@aws-sdk/client-secrets-manager', () => {
  return {
    SecretsManagerClient: jest.fn(() => ({
      send: mockSend,
    })),
    GetSecretValueCommand: jest.fn((params: { SecretId: string }) => ({
      input: params,
    })),
    SecretsManagerServiceException: MockSecretsManagerServiceException,
  };
});

jest.mock('@aws-lambda-powertools/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    Logger: jest.fn(() => mockLogger),
  };
});

// Import after mocks
import {
  getSecrets,
  clearSecretsCache,
  isSecretsCached,
  getE2ESecrets,
  clearE2ESecretsCache,
  isSandboxApiKey,
} from './secrets';

// Use the mock class directly (already defined above)
const SecretsManagerServiceException = MockSecretsManagerServiceException;

describe('Secrets Manager Integration', () => {
  const validSecrets = {
    notifyApiKey: 'test-notify-key-xxx-yyy-zzz',
    slackWebhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearSecretsCache();
    // Reset environment
    delete process.env.SECRETS_PATH;
  });

  describe('getSecrets (AC-5.1)', () => {
    test('retrieves secrets from Secrets Manager', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(validSecrets),
      });

      const secrets = await getSecrets();

      expect(secrets).toEqual(validSecrets);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    test('uses SECRETS_PATH environment variable', async () => {
      process.env.SECRETS_PATH = '/custom/path/secrets';
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(validSecrets),
      });

      await getSecrets();

      const calls = mockSend.mock.calls as Array<[{ input: { SecretId: string } }]>;
      expect(calls[0][0].input.SecretId).toBe('/custom/path/secrets');
    });

    test('uses default path when SECRETS_PATH not set', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(validSecrets),
      });

      await getSecrets();

      const calls = mockSend.mock.calls as Array<[{ input: { SecretId: string } }]>;
      expect(calls[0][0].input.SecretId).toBe('/ndx/notifications/credentials');
    });
  });

  describe('Caching behavior (AC-5.2, AC-5.8)', () => {
    test('caches secrets after first retrieval', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(validSecrets),
      });

      // First call
      await getSecrets();
      expect(isSecretsCached()).toBe(true);

      // Second call - should use cache
      await getSecrets();

      // Only one API call made
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    test('clearSecretsCache clears the cache', async () => {
      mockSend.mockResolvedValue({
        SecretString: JSON.stringify(validSecrets),
      });

      await getSecrets();
      expect(isSecretsCached()).toBe(true);

      clearSecretsCache();
      expect(isSecretsCached()).toBe(false);

      // Next call should fetch again
      await getSecrets();
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    test('cache is per-container (cleared on cold start)', async () => {
      // This test verifies the caching mechanism exists
      // In production, cold start = new container = fresh module load = null cache
      expect(isSecretsCached()).toBe(false);

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(validSecrets),
      });

      await getSecrets();
      expect(isSecretsCached()).toBe(true);
    });
  });

  describe('Error handling (AC-5.3)', () => {
    test('throws CriticalError for Secrets Manager service errors', async () => {
      const serviceError = new SecretsManagerServiceException({
        name: 'AccessDenied',
        message: 'Access Denied',
      });

      mockSend.mockRejectedValueOnce(serviceError);

      await expect(getSecrets()).rejects.toThrow(CriticalError);
      clearSecretsCache();
      mockSend.mockRejectedValueOnce(serviceError);
      await expect(getSecrets()).rejects.toThrow('Secrets Manager error');
    });

    test('throws CriticalError when secret is empty', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: undefined,
      });

      await expect(getSecrets()).rejects.toThrow(CriticalError);

      clearSecretsCache();
      mockSend.mockResolvedValueOnce({
        SecretString: undefined,
      });
      await expect(getSecrets()).rejects.toThrow('empty or binary');
    });

    test('throws CriticalError when secret is not valid JSON', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: 'not-json',
      });

      await expect(getSecrets()).rejects.toThrow(CriticalError);

      clearSecretsCache();
      mockSend.mockResolvedValueOnce({
        SecretString: 'not-json',
      });
      await expect(getSecrets()).rejects.toThrow('not valid JSON');
    });

    test('throws CriticalError when notifyApiKey is missing', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({
          slackWebhookUrl: 'https://hooks.slack.com/services/xxx',
        }),
      });

      await expect(getSecrets()).rejects.toThrow(CriticalError);

      clearSecretsCache();
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({
          slackWebhookUrl: 'https://hooks.slack.com/services/xxx',
        }),
      });
      await expect(getSecrets()).rejects.toThrow('missing required fields');
    });

    test('throws CriticalError when slackWebhookUrl is missing', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({
          notifyApiKey: 'test-key',
        }),
      });

      await expect(getSecrets()).rejects.toThrow(CriticalError);

      clearSecretsCache();
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({
          notifyApiKey: 'test-key',
        }),
      });
      await expect(getSecrets()).rejects.toThrow('missing required fields');
    });

    test('throws CriticalError when fields are empty strings', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({
          notifyApiKey: '',
          slackWebhookUrl: 'https://hooks.slack.com/services/xxx',
        }),
      });

      await expect(getSecrets()).rejects.toThrow(CriticalError);
    });

    test('CriticalError has service context', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: undefined,
      });

      try {
        await getSecrets();
        fail('Expected CriticalError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CriticalError);
        const critError = error as CriticalError;
        expect(critError.service).toBe('secrets');
      }
    });
  });

  describe('Security requirements', () => {
    test('does not cache failed attempts', async () => {
      mockSend
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          SecretString: JSON.stringify(validSecrets),
        });

      // First call fails
      await expect(getSecrets()).rejects.toThrow();
      expect(isSecretsCached()).toBe(false);

      // Second call should retry
      clearSecretsCache(); // Clear any error state
      const secrets = await getSecrets();
      expect(secrets).toEqual(validSecrets);
    });
  });
});

// =============================================================================
// E2E Secrets Tests (AC-8.1)
// =============================================================================

describe('E2E Secrets Manager Integration (AC-8.1)', () => {
  const validE2ESecrets = {
    notifySandboxApiKey: 'team-test-00000000-0000-0000-0000-000000000000-11111111-1111-1111-1111-111111111111',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearSecretsCache();
    clearE2ESecretsCache();
    delete process.env.E2E_SECRETS_PATH;
  });

  describe('getE2ESecrets', () => {
    test('retrieves E2E secrets from Secrets Manager', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(validE2ESecrets),
      });

      const secrets = await getE2ESecrets();

      expect(secrets).toEqual(validE2ESecrets);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    test('uses E2E_SECRETS_PATH environment variable', async () => {
      process.env.E2E_SECRETS_PATH = '/custom/e2e/secrets';
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(validE2ESecrets),
      });

      await getE2ESecrets();

      const calls = mockSend.mock.calls as Array<[{ input: { SecretId: string } }]>;
      expect(calls[0][0].input.SecretId).toBe('/custom/e2e/secrets');
    });

    test('uses default E2E path when E2E_SECRETS_PATH not set', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(validE2ESecrets),
      });

      await getE2ESecrets();

      const calls = mockSend.mock.calls as Array<[{ input: { SecretId: string } }]>;
      expect(calls[0][0].input.SecretId).toBe('/ndx/notifications/e2e-credentials');
    });

    test('caches E2E secrets after first retrieval', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify(validE2ESecrets),
      });

      await getE2ESecrets();
      await getE2ESecrets();

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    test('throws CriticalError when notifySandboxApiKey is missing', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({}),
      });

      await expect(getE2ESecrets()).rejects.toThrow(CriticalError);

      clearE2ESecretsCache();
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({}),
      });
      await expect(getE2ESecrets()).rejects.toThrow('missing required field');
    });

    test('throws CriticalError when API key format is invalid', async () => {
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({
          notifySandboxApiKey: 'short-key', // Too short to be valid
        }),
      });

      await expect(getE2ESecrets()).rejects.toThrow(CriticalError);

      clearE2ESecretsCache();
      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({
          notifySandboxApiKey: 'short-key',
        }),
      });
      await expect(getE2ESecrets()).rejects.toThrow('not appear to be a valid sandbox API key');
    });
  });

  describe('isSandboxApiKey', () => {
    test('returns true for valid format API key', () => {
      const validKey = 'team-test-00000000-0000-0000-0000-000000000000-11111111-1111-1111-1111-111111111111';
      expect(isSandboxApiKey(validKey)).toBe(true);
    });

    test('returns false for empty string', () => {
      expect(isSandboxApiKey('')).toBe(false);
    });

    test('returns false for short key', () => {
      expect(isSandboxApiKey('short-key')).toBe(false);
    });

    test('returns false for null-like values', () => {
      expect(isSandboxApiKey(undefined as unknown as string)).toBe(false);
      expect(isSandboxApiKey(null as unknown as string)).toBe(false);
    });
  });

  describe('clearE2ESecretsCache', () => {
    test('clears the E2E cache', async () => {
      mockSend.mockResolvedValue({
        SecretString: JSON.stringify(validE2ESecrets),
      });

      await getE2ESecrets();
      clearE2ESecretsCache();
      await getE2ESecrets();

      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});
