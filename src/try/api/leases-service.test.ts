/**
 * Unit tests for Leases Service
 *
 * Story 6.9: Submit lease request and handle responses
 *
 * @jest-environment jsdom
 */

import { createLease } from './leases-service';
import { callISBAPI } from './api-client';

// Mock the api-client module
jest.mock('./api-client', () => ({
  callISBAPI: jest.fn(),
}));

const mockCallISBAPI = callISBAPI as jest.MockedFunction<typeof callISBAPI>;

describe('Leases Service', () => {
  const TEST_LEASE_TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLease', () => {
    describe('Success scenarios', () => {
      it('should create lease successfully with 200 OK', async () => {
        const mockLease = {
          leaseId: 'lease-123',
          awsAccountId: '123456789012',
          expirationDate: '2025-01-16T12:00:00Z',
          status: 'Pending',
          maxSpend: 50,
        };

        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockLease),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(true);
        expect(result.lease).toEqual(mockLease);
        expect(result.errorCode).toBeUndefined();
      });

      it('should create lease successfully with 201 Created', async () => {
        const mockLease = {
          leaseId: 'lease-456',
          awsAccountId: '987654321098',
          expirationDate: '2025-01-16T12:00:00Z',
          status: 'Active',
          maxSpend: 50,
        };

        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 201,
          json: () => Promise.resolve(mockLease),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(true);
        expect(result.lease).toEqual(mockLease);
      });

      it('should call API with correct endpoint and payload', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ leaseId: 'test' }),
        } as Response);

        await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(mockCallISBAPI).toHaveBeenCalledWith('/api/leases', {
          method: 'POST',
          body: JSON.stringify({
            leaseTemplateUuid: TEST_LEASE_TEMPLATE_ID,
            comments: 'User accepted the Acceptable Use Policy via NDX portal.',
          }),
          signal: expect.any(AbortSignal),
        });
      });
    });

    describe('409 Conflict - No accounts available', () => {
      it('should handle no accounts available error', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              status: 'fail',
              data: { errors: [{ message: 'No accounts are available to lease' }] },
            }),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('CONFLICT');
        expect(result.error).toContain('No sandbox accounts are currently available');
      });
    });

    describe('409 Conflict - Max leases reached', () => {
      it('should handle max leases error', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              status: 'fail',
              data: {
                errors: [{ message: 'You have reached the maximum number of active/pending leases allowed' }],
              },
            }),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('CONFLICT');
        expect(result.error).toContain('maximum number of active sessions');
      });

      it('should default to max leases error for unrecognized 409 messages', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              status: 'fail',
              data: { errors: [{ message: 'Unknown conflict' }] },
            }),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('CONFLICT');
        expect(result.error).toContain('maximum number of active sessions');
      });
    });

    describe('404 Not Found errors', () => {
      it('should handle lease template not found', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 404,
          json: () =>
            Promise.resolve({
              status: 'fail',
              data: { errors: [{ message: 'Lease template not found' }] },
            }),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NOT_FOUND');
        expect(result.error).toContain('sandbox template is no longer available');
        errorSpy.mockRestore();
      });

      it('should handle user not found in Identity Center', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 404,
          json: () =>
            Promise.resolve({
              status: 'fail',
              data: { errors: [{ message: 'User not found in Identity Center' }] },
            }),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('UNAUTHORIZED');
        expect(result.error).toContain('not registered for sandbox access');
        errorSpy.mockRestore();
      });

      it('should handle generic 404 error', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 404,
          json: () =>
            Promise.resolve({
              status: 'fail',
              data: { errors: [{ message: 'Some other not found error' }] },
            }),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NOT_FOUND');
        expect(result.error).toBe('The requested resource was not found.');
        errorSpy.mockRestore();
      });
    });

    describe('400 Bad Request', () => {
      it('should handle bad request error', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 400,
          json: () =>
            Promise.resolve({
              status: 'fail',
              data: { errors: [{ message: 'Invalid lease template ID' }] },
            }),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('SERVER_ERROR');
        expect(result.error).toContain('Invalid request');
        errorSpy.mockRestore();
      });
    });

    describe('401 Unauthorized', () => {
      it('should handle unauthorized error', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('UNAUTHORIZED');
        expect(result.error).toBe('Please sign in to continue.');
      });
    });

    describe('403 Forbidden', () => {
      it('should handle forbidden error', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 403,
          json: () =>
            Promise.resolve({
              status: 'fail',
              data: { errors: [{ message: 'Access denied' }] },
            }),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('UNAUTHORIZED');
        expect(result.error).toContain('do not have permission');
        errorSpy.mockRestore();
      });
    });

    describe('Server errors (5xx)', () => {
      it('should handle 500 Server Error', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 500,
          json: () => Promise.resolve({}),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('SERVER_ERROR');
        expect(result.error).toContain('temporarily unavailable');
      });

      it('should handle 502 Bad Gateway', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 502,
          json: () => Promise.resolve({}),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('SERVER_ERROR');
      });

      it('should handle 503 Service Unavailable', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 503,
          json: () => Promise.resolve({}),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('SERVER_ERROR');
      });

      it('should handle 504 Gateway Timeout', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 504,
          json: () => Promise.resolve({}),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('SERVER_ERROR');
      });
    });

    describe('Unknown status codes', () => {
      it('should handle unexpected status codes', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 418,
          json: () => Promise.resolve({}),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('SERVER_ERROR');
        expect(result.error).toBe('An unexpected error occurred. Please try again.');
        errorSpy.mockRestore();
      });
    });

    describe('Network errors', () => {
      it('should handle timeout (AbortError)', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        const abortError = new Error('The operation was aborted');
        abortError.name = 'AbortError';
        mockCallISBAPI.mockRejectedValue(abortError);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('TIMEOUT');
        expect(result.error).toContain('timed out');
        errorSpy.mockRestore();
      });

      it('should handle Unauthorized redirect error', async () => {
        mockCallISBAPI.mockRejectedValue(new Error('Unauthorized'));

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('UNAUTHORIZED');
        expect(result.error).toBe('Please sign in to continue.');
      });

      it('should handle generic network errors', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockCallISBAPI.mockRejectedValue(new Error('Network error'));

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NETWORK_ERROR');
        expect(result.error).toContain('Unable to connect');
        errorSpy.mockRestore();
      });

      it('should handle non-Error thrown values', async () => {
        mockCallISBAPI.mockRejectedValue('String error');

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NETWORK_ERROR');
      });
    });

    describe('JSON parsing errors', () => {
      it('should handle JSON parse error on error response', async () => {
        mockCallISBAPI.mockResolvedValue({
          ok: false,
          status: 409,
          json: () => Promise.reject(new Error('Invalid JSON')),
        } as Response);

        const result = await createLease(TEST_LEASE_TEMPLATE_ID);

        // Should still handle 409 but with default max leases message
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('CONFLICT');
      });
    });
  });
});
