/**
 * @jest-environment jsdom
 */

import { getHttpErrorMessage, isNetworkError, isTimeoutError } from './error-utils';

describe('error-utils', () => {
  describe('getHttpErrorMessage', () => {
    describe('default messages', () => {
      it('should return sign in message for 401', () => {
        expect(getHttpErrorMessage(401)).toBe('Please sign in to continue.');
      });

      it('should return permission message for 403', () => {
        expect(getHttpErrorMessage(403)).toBe('You do not have permission to access this resource.');
      });

      it('should return not found message for 404', () => {
        expect(getHttpErrorMessage(404)).toBe('Resource not found.');
      });

      it('should return unavailable message for 500', () => {
        expect(getHttpErrorMessage(500)).toBe(
          'The sandbox service is temporarily unavailable. Please try again later.'
        );
      });

      it('should return unavailable message for 502', () => {
        expect(getHttpErrorMessage(502)).toBe(
          'The sandbox service is temporarily unavailable. Please try again later.'
        );
      });

      it('should return unavailable message for 503', () => {
        expect(getHttpErrorMessage(503)).toBe(
          'The sandbox service is temporarily unavailable. Please try again later.'
        );
      });

      it('should return unavailable message for 504', () => {
        expect(getHttpErrorMessage(504)).toBe(
          'The sandbox service is temporarily unavailable. Please try again later.'
        );
      });

      it('should return generic message for unknown status codes', () => {
        expect(getHttpErrorMessage(418)).toBe('An unexpected error occurred. Please try again.');
        expect(getHttpErrorMessage(999)).toBe('An unexpected error occurred. Please try again.');
      });
    });

    describe('context-specific messages', () => {
      it('should return sessions-specific message for 401', () => {
        expect(getHttpErrorMessage(401, 'sessions')).toBe('Please sign in to view your sessions.');
      });

      it('should return sessions-specific message for 404', () => {
        expect(getHttpErrorMessage(404, 'sessions')).toBe('Sessions not found.');
      });

      it('should return configurations-specific message for 404', () => {
        expect(getHttpErrorMessage(404, 'configurations')).toBe(
          'Configuration not found. Please contact support.'
        );
      });

      it('should return sessions-specific message for 403', () => {
        expect(getHttpErrorMessage(403, 'sessions')).toBe(
          'You do not have permission to view sessions.'
        );
      });

      it('should fall back to default for status without context override', () => {
        // 500 doesn't have a sessions-specific message, should fall back to default
        expect(getHttpErrorMessage(500, 'sessions')).toBe(
          'The sandbox service is temporarily unavailable. Please try again later.'
        );
      });
    });
  });

  describe('isNetworkError', () => {
    it('should return true for Failed to fetch error', () => {
      expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    });

    it('should return true for Network request failed error', () => {
      expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isNetworkError(new Error('Something else'))).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isNetworkError('not an error')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should return true for AbortError', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return true for timeout message', () => {
      expect(isTimeoutError(new Error('Request timeout'))).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isTimeoutError(new Error('Something else'))).toBe(false);
    });

    it('should return false for non-Error values', () => {
      expect(isTimeoutError('not an error')).toBe(false);
      expect(isTimeoutError(null)).toBe(false);
    });
  });
});
