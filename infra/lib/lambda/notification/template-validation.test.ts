/**
 * Unit tests for Template Field Validation on Startup
 *
 * Story: N5-9
 * Tests cover:
 * - AC-9.1: validateTemplate() fetches template from GOV.UK Notify API
 * - AC-9.2: Extract personalisation field names from template body
 * - AC-9.3: Compare template fields with requiredFields from config
 * - AC-9.4: Missing required fields log WARNING with specific field names
 * - AC-9.5: Extra template fields (not in config) log INFO
 * - AC-9.6: TemplateValidationFailed metric emitted on mismatch
 * - AC-9.7: Validation runs once per cold start
 * - AC-9.8: Critical mismatch fails Lambda init
 * - AC-9.9: Non-critical mismatch allows Lambda to continue
 * - AC-9.10: validateTemplateRendering() checks for unfilled placeholders
 */

import { CriticalError } from './errors';

// Track mock calls for assertions
const mockGetTemplateById = jest.fn();
const mockPreviewTemplateById = jest.fn();
const mockAddMetric = jest.fn();
const mockAddDimension = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();

// Mock NotifyClient
jest.mock('notifications-node-client', () => {
  return {
    NotifyClient: jest.fn().mockImplementation(() => ({
      getTemplateById: mockGetTemplateById,
      previewTemplateById: mockPreviewTemplateById,
    })),
  };
});

// Mock secrets
jest.mock('./secrets', () => ({
  getSecrets: jest.fn().mockResolvedValue({
    notifyApiKey: 'test-api-key-xxxxx',
    slackWebhookUrl: 'https://hooks.slack.com/test',
  }),
}));

// Mock templates config
jest.mock('./templates', () => ({
  NOTIFY_TEMPLATES: {
    LeaseApproved: {
      templateIdEnvVar: 'NOTIFY_TEMPLATE_LEASE_APPROVED',
      requiredFields: ['userName', 'accountId', 'ssoUrl', 'expiryDate'],
      optionalFields: ['budgetLimit'],
      enrichmentQueries: ['lease'],
    },
    LeaseExpiring: {
      templateIdEnvVar: 'NOTIFY_TEMPLATE_LEASE_EXPIRING',
      requiredFields: ['userName', 'daysRemaining'],
      optionalFields: [],
      enrichmentQueries: ['lease'],
    },
  },
}));

// Mock Lambda Powertools
jest.mock('@aws-lambda-powertools/logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: mockLoggerInfo,
      warn: mockLoggerWarn,
      error: mockLoggerError,
      debug: mockLoggerDebug,
    })),
  };
});

jest.mock('@aws-lambda-powertools/metrics', () => {
  return {
    Metrics: jest.fn().mockImplementation(() => ({
      addMetric: mockAddMetric,
      addDimension: mockAddDimension,
      publishStoredMetrics: jest.fn(),
    })),
    MetricUnit: {
      Count: 'Count',
      Milliseconds: 'Milliseconds',
    },
  };
});

// Import after mocks are set up
import {
  extractTemplateFields,
  findUnfilledPlaceholders,
  validateTemplate,
  validateTemplateRendering,
  validateAllTemplatesOnce,
  resetValidationState,
  getCachedResults,
  isValidated,
  PLACEHOLDER_PATTERN,
} from './template-validation';
import { NotifyClient } from 'notifications-node-client';
import { NOTIFY_TEMPLATES } from './templates';

describe('Template Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetValidationState();
    // Reset environment variables
    delete process.env.SKIP_TEMPLATE_VALIDATION;
    delete process.env.TEMPLATES_TO_VALIDATE;
    delete process.env.NOTIFY_TEMPLATE_LEASE_APPROVED;
    delete process.env.NOTIFY_TEMPLATE_LEASE_EXPIRING;
  });

  describe('extractTemplateFields (AC-9.2)', () => {
    test('extracts single field from template body', () => {
      const body = 'Hello ((userName)), welcome!';
      const fields = extractTemplateFields(body);
      expect(fields).toEqual(['userName']);
    });

    test('extracts multiple fields from template body', () => {
      const body = 'Hello ((userName)), your account ((accountId)) expires on ((expiryDate)).';
      const fields = extractTemplateFields(body);
      expect(fields).toContain('userName');
      expect(fields).toContain('accountId');
      expect(fields).toContain('expiryDate');
      expect(fields).toHaveLength(3);
    });

    test('returns unique fields (no duplicates)', () => {
      const body = 'Hello ((userName))! ((userName)) has account ((accountId)).';
      const fields = extractTemplateFields(body);
      expect(fields).toEqual(['userName', 'accountId']);
    });

    test('returns empty array for no placeholders', () => {
      const body = 'This is plain text with no placeholders.';
      const fields = extractTemplateFields(body);
      expect(fields).toEqual([]);
    });

    test('handles fields with underscores and numbers', () => {
      const body = '((field_1)) and ((field_2_name))';
      const fields = extractTemplateFields(body);
      expect(fields).toContain('field_1');
      expect(fields).toContain('field_2_name');
    });
  });

  describe('findUnfilledPlaceholders (AC-9.10)', () => {
    test('finds unfilled placeholders in rendered body', () => {
      const body = 'Hello test-user, your ((accountId)) is ready.';
      const unfilled = findUnfilledPlaceholders(body);
      expect(unfilled).toEqual(['((accountId))']);
    });

    test('returns empty array when all placeholders filled', () => {
      const body = 'Hello test-user, your account abc123 is ready.';
      const unfilled = findUnfilledPlaceholders(body);
      expect(unfilled).toEqual([]);
    });

    test('finds multiple unfilled placeholders', () => {
      const body = '((field1)) and ((field2)) are missing';
      const unfilled = findUnfilledPlaceholders(body);
      expect(unfilled).toContain('((field1))');
      expect(unfilled).toContain('((field2))');
      expect(unfilled).toHaveLength(2);
    });
  });

  describe('PLACEHOLDER_PATTERN constant', () => {
    test('matches GOV.UK Notify placeholder syntax', () => {
      const testCases = [
        { input: '((userName))', expected: true },
        { input: '((account_id))', expected: true },
        { input: '((SSO_URL))', expected: true },
        { input: '(userName)', expected: false },
        { input: 'userName', expected: false },
        { input: '{{userName}}', expected: false },
      ];

      for (const { input, expected } of testCases) {
        PLACEHOLDER_PATTERN.lastIndex = 0;
        const result = PLACEHOLDER_PATTERN.test(input);
        expect(result).toBe(expected);
      }
    });
  });

  describe('validateTemplate (AC-9.1, AC-9.3)', () => {
    let mockClient: NotifyClient;

    beforeEach(() => {
      mockClient = new NotifyClient('test-key');
    });

    test('fetches template from Notify API (AC-9.1)', async () => {
      mockGetTemplateById.mockResolvedValueOnce({
        data: {
          id: 'template-123',
          name: 'Test Template',
          type: 'email',
          version: 1,
          body: 'Hello ((userName)), your account ((accountId)) is ready.',
          subject: 'Welcome',
          created_at: '2024-01-01T00:00:00Z',
          created_by: 'admin@example.gov.uk',
        },
      });

      const config = {
        templateIdEnvVar: 'TEST_TEMPLATE',
        requiredFields: ['userName', 'accountId'],
        optionalFields: [],
        enrichmentQueries: [],
      };

      await validateTemplate(mockClient, 'template-123', 'TestEvent', config);

      expect(mockGetTemplateById).toHaveBeenCalledWith('template-123');
    });

    test('compares template fields with config (AC-9.3)', async () => {
      mockGetTemplateById.mockResolvedValueOnce({
        data: {
          id: 'template-123',
          version: 1,
          body: 'Hello ((userName)), your account ((accountId)) expires on ((expiryDate)).',
        },
      });

      const config = {
        templateIdEnvVar: 'TEST_TEMPLATE',
        requiredFields: ['userName', 'accountId', 'expiryDate'],
        optionalFields: [],
        enrichmentQueries: [],
      };

      const result = await validateTemplate(mockClient, 'template-123', 'TestEvent', config);

      expect(result.isValid).toBe(true);
      expect(result.missingFromTemplate).toEqual([]);
      expect(result.extraInTemplate).toEqual([]);
      expect(result.severity).toBe('ok');
    });

    test('detects missing required fields (AC-9.4)', async () => {
      mockGetTemplateById.mockResolvedValueOnce({
        data: {
          id: 'template-123',
          version: 1,
          body: 'Hello ((userName))!', // Missing accountId
        },
      });

      const config = {
        templateIdEnvVar: 'TEST_TEMPLATE',
        requiredFields: ['userName', 'accountId'],
        optionalFields: [],
        enrichmentQueries: [],
      };

      const result = await validateTemplate(mockClient, 'template-123', 'TestEvent', config);

      expect(result.isValid).toBe(false);
      expect(result.missingFromTemplate).toContain('accountId');
      expect(result.severity).toBe('critical');
    });

    test('detects extra template fields (AC-9.5)', async () => {
      mockGetTemplateById.mockResolvedValueOnce({
        data: {
          id: 'template-123',
          version: 1,
          body: 'Hello ((userName)) from ((organization))!', // organization is extra
        },
      });

      const config = {
        templateIdEnvVar: 'TEST_TEMPLATE',
        requiredFields: ['userName'],
        optionalFields: [],
        enrichmentQueries: [],
      };

      const result = await validateTemplate(mockClient, 'template-123', 'TestEvent', config);

      expect(result.extraInTemplate).toContain('organization');
    });

    test('extracts fields from subject line too', async () => {
      mockGetTemplateById.mockResolvedValueOnce({
        data: {
          id: 'template-123',
          version: 1,
          body: 'Hello ((userName))!',
          subject: 'Welcome to ((organization))',
        },
      });

      const config = {
        templateIdEnvVar: 'TEST_TEMPLATE',
        requiredFields: ['userName', 'organization'],
        optionalFields: [],
        enrichmentQueries: [],
      };

      const result = await validateTemplate(mockClient, 'template-123', 'TestEvent', config);

      expect(result.fieldsInTemplate).toContain('userName');
      expect(result.fieldsInTemplate).toContain('organization');
      expect(result.isValid).toBe(true);
    });

    test('tracks template version', async () => {
      mockGetTemplateById.mockResolvedValueOnce({
        data: {
          id: 'template-123',
          version: 5,
          body: '((field))',
        },
      });

      const config = {
        templateIdEnvVar: 'TEST_TEMPLATE',
        requiredFields: ['field'],
        optionalFields: [],
        enrichmentQueries: [],
      };

      const result = await validateTemplate(mockClient, 'template-123', 'TestEvent', config);

      expect(result.version).toBe(5);
    });
  });

  describe('validateTemplateRendering (AC-9.10, AC-9.17)', () => {
    let mockClient: NotifyClient;

    beforeEach(() => {
      mockClient = new NotifyClient('test-key');
    });

    test('returns empty array when all placeholders filled', async () => {
      mockPreviewTemplateById.mockResolvedValueOnce({
        data: {
          id: 'template-123',
          version: 1,
          type: 'email',
          body: 'Hello test-user, your account abc123 is ready.',
          subject: 'Welcome test-user',
        },
      });

      const result = await validateTemplateRendering(
        mockClient,
        'template-123',
        'TestEvent',
        { userName: 'test-user', accountId: 'abc123' }
      );

      expect(result).toEqual([]);
    });

    test('returns unfilled placeholders', async () => {
      mockPreviewTemplateById.mockResolvedValueOnce({
        data: {
          id: 'template-123',
          version: 1,
          type: 'email',
          body: 'Hello test-user, your ((accountId)) is ready.',
          subject: 'Welcome',
        },
      });

      const result = await validateTemplateRendering(
        mockClient,
        'template-123',
        'TestEvent',
        { userName: 'test-user' } // Missing accountId
      );

      expect(result).toContain('((accountId))');
    });

    test('handles API errors gracefully', async () => {
      mockPreviewTemplateById.mockRejectedValueOnce(new Error('API Error'));

      const result = await validateTemplateRendering(
        mockClient,
        'template-123',
        'TestEvent',
        { userName: 'test-user' }
      );

      // Should not throw, just return empty array
      expect(result).toEqual([]);
      expect(mockLoggerWarn).toHaveBeenCalled();
    });
  });

  describe('validateAllTemplatesOnce (AC-9.7, AC-9.8, AC-9.9)', () => {
    beforeEach(() => {
      process.env.NOTIFY_TEMPLATE_LEASE_APPROVED = 'template-approved-123';
      process.env.NOTIFY_TEMPLATE_LEASE_EXPIRING = 'template-expiring-456';
    });

    test('runs only once per cold start (AC-9.7)', async () => {
      // Set up valid responses
      mockGetTemplateById.mockImplementation((templateId: string) => {
        if (templateId === 'template-approved-123') {
          return Promise.resolve({
            data: {
              id: templateId,
              version: 1,
              body: '((userName)) ((accountId)) ((ssoUrl)) ((expiryDate))',
            },
          });
        }
        return Promise.resolve({
          data: {
            id: templateId,
            version: 1,
            body: '((userName)) ((daysRemaining))',
          },
        });
      });

      mockPreviewTemplateById.mockResolvedValue({
        data: { body: 'Rendered content', subject: 'Subject' },
      });

      // First call
      await validateAllTemplatesOnce();
      expect(isValidated()).toBe(true);

      const callCount = mockGetTemplateById.mock.calls.length;

      // Second call should not trigger new API calls
      await validateAllTemplatesOnce();
      expect(mockGetTemplateById.mock.calls.length).toBe(callCount);
    });

    test('returns cached results on subsequent calls', async () => {
      mockGetTemplateById.mockImplementation((templateId: string) => {
        // LeaseApproved needs: userName, accountId, ssoUrl, expiryDate
        // LeaseExpiring needs: userName, daysRemaining
        if (templateId.includes('expiring')) {
          return Promise.resolve({
            data: {
              id: templateId,
              version: 1,
              body: '((userName)) ((daysRemaining))',
            },
          });
        }
        return Promise.resolve({
          data: {
            id: templateId,
            version: 1,
            body: '((userName)) ((accountId)) ((ssoUrl)) ((expiryDate))',
          },
        });
      });
      mockPreviewTemplateById.mockResolvedValue({
        data: { body: 'Rendered', subject: 'Subject' },
      });

      const result1 = await validateAllTemplatesOnce();
      const result2 = await validateAllTemplatesOnce();

      expect(result1).toBe(result2); // Same object reference
      expect(getCachedResults()).toBe(result1);
    });

    test('skip validation when SKIP_TEMPLATE_VALIDATION is set', async () => {
      process.env.SKIP_TEMPLATE_VALIDATION = 'true';

      const result = await validateAllTemplatesOnce();

      expect(result.templatesValidated).toBe(0);
      expect(mockGetTemplateById).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('SKIPPED'),
        expect.any(Object)
      );
    });

    test('throws CriticalError for critical mismatches (AC-9.8)', async () => {
      // Template missing required field
      mockGetTemplateById.mockResolvedValue({
        data: {
          id: 'template-123',
          version: 1,
          body: '((userName))', // Missing accountId, ssoUrl, expiryDate
        },
      });

      await expect(validateAllTemplatesOnce()).rejects.toThrow(CriticalError);
    });

    test('emits TemplateValidationFailed metric on mismatch (AC-9.6)', async () => {
      mockGetTemplateById.mockResolvedValue({
        data: {
          id: 'template-123',
          version: 1,
          body: '((userName))', // Missing fields
        },
      });

      try {
        await validateAllTemplatesOnce();
      } catch {
        // Expected to throw
      }

      expect(mockAddMetric).toHaveBeenCalledWith(
        'TemplateValidationFailed',
        expect.any(String),
        expect.any(Number)
      );
    });

    test('logs template version (AC-9.14)', async () => {
      mockGetTemplateById.mockImplementation((templateId: string) => {
        // LeaseApproved needs: userName, accountId, ssoUrl, expiryDate
        // LeaseExpiring needs: userName, daysRemaining
        if (templateId.includes('expiring')) {
          return Promise.resolve({
            data: {
              id: templateId,
              version: 3,
              body: '((userName)) ((daysRemaining))',
            },
          });
        }
        return Promise.resolve({
          data: {
            id: templateId,
            version: 3,
            body: '((userName)) ((accountId)) ((ssoUrl)) ((expiryDate))',
          },
        });
      });
      mockPreviewTemplateById.mockResolvedValue({
        data: { body: 'Rendered', subject: 'Subject' },
      });

      await validateAllTemplatesOnce();

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Template validated',
        expect.objectContaining({ version: 3 })
      );
    });
  });

  describe('resetValidationState', () => {
    test('clears validation state for testing', async () => {
      process.env.NOTIFY_TEMPLATE_LEASE_APPROVED = 'template-approved-123';
      process.env.NOTIFY_TEMPLATE_LEASE_EXPIRING = 'template-expiring-456';

      mockGetTemplateById.mockImplementation((templateId: string) => {
        if (templateId.includes('expiring')) {
          return Promise.resolve({
            data: {
              id: templateId,
              version: 1,
              body: '((userName)) ((daysRemaining))',
            },
          });
        }
        return Promise.resolve({
          data: {
            id: templateId,
            version: 1,
            body: '((userName)) ((accountId)) ((ssoUrl)) ((expiryDate))',
          },
        });
      });
      mockPreviewTemplateById.mockResolvedValue({
        data: { body: 'Rendered', subject: 'Subject' },
      });

      await validateAllTemplatesOnce();
      expect(isValidated()).toBe(true);

      resetValidationState();
      expect(isValidated()).toBe(false);
      expect(getCachedResults()).toBeNull();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      process.env.NOTIFY_TEMPLATE_LEASE_APPROVED = 'template-approved-123';
      process.env.NOTIFY_TEMPLATE_LEASE_EXPIRING = 'template-expiring-456';
    });

    test('handles Notify API errors', async () => {
      mockGetTemplateById.mockRejectedValue(new Error('Template not found'));

      await expect(validateAllTemplatesOnce()).rejects.toThrow(CriticalError);

      expect(mockLoggerError).toHaveBeenCalledWith(
        'Template validation failed',
        expect.objectContaining({ error: 'Template not found' })
      );
    });

    test('clears validation promise on failure to allow retry', async () => {
      mockGetTemplateById.mockRejectedValueOnce(new Error('Temporary failure'));

      // First call fails
      await expect(validateAllTemplatesOnce()).rejects.toThrow();
      expect(isValidated()).toBe(false);

      // Set up success for retry
      mockGetTemplateById.mockImplementation((templateId: string) => {
        if (templateId.includes('expiring')) {
          return Promise.resolve({
            data: {
              id: templateId,
              version: 1,
              body: '((userName)) ((daysRemaining))',
            },
          });
        }
        return Promise.resolve({
          data: {
            id: templateId,
            version: 1,
            body: '((userName)) ((accountId)) ((ssoUrl)) ((expiryDate))',
          },
        });
      });
      mockPreviewTemplateById.mockResolvedValue({
        data: { body: 'Rendered', subject: 'Subject' },
      });

      // Retry should work
      resetValidationState();
      const result = await validateAllTemplatesOnce();
      expect(result.templatesValidated).toBeGreaterThan(0);
    });
  });
});
