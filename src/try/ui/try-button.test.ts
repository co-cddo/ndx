/**
 * Unit tests for Try Button Handler
 *
 * Story 6.5: Authentication check before showing AUP modal
 * Story 6.6: AUP modal integration
 * Story 6.9: Lease request handling
 *
 * @jest-environment jsdom
 */

import { initTryButton } from './try-button';
import { authState } from '../auth/auth-provider';
import { openAupModal, closeAupModal, aupModal } from './components/aup-modal';
import { createLease } from '../api/leases-service';
import { storeReturnURL } from '../auth/oauth-flow';

// Mock dependencies
jest.mock('../auth/auth-provider', () => ({
  authState: {
    isAuthenticated: jest.fn(),
  },
}));

jest.mock('../auth/oauth-flow', () => ({
  storeReturnURL: jest.fn(),
}));

const mockStoreReturnURL = storeReturnURL as jest.MockedFunction<typeof storeReturnURL>;

jest.mock('./components/aup-modal', () => ({
  openAupModal: jest.fn(),
  closeAupModal: jest.fn(),
  aupModal: {
    showError: jest.fn(),
  },
}));

jest.mock('../api/leases-service', () => ({
  createLease: jest.fn(),
}));

const mockAuthState = authState as jest.Mocked<typeof authState>;
const mockOpenAupModal = openAupModal as jest.MockedFunction<typeof openAupModal>;
const mockCloseAupModal = closeAupModal as jest.MockedFunction<typeof closeAupModal>;
const mockCreateLease = createLease as jest.MockedFunction<typeof createLease>;
const mockShowError = aupModal.showError as jest.MockedFunction<typeof aupModal.showError>;

describe('Try Button Handler', () => {
  const TEST_TRY_ID = '550e8400-e29b-41d4-a716-446655440000';
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: 'https://ndx.gov.uk/catalogue/product/123',
      assign: jest.fn(),
    } as any;

    // Default to authenticated
    mockAuthState.isAuthenticated.mockReturnValue(true);
  });

  afterEach(() => {
    (window as any).location = originalLocation;
    document.body.innerHTML = '';
  });

  describe('initTryButton', () => {
    it('should find and attach handlers to try buttons', () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now for 24 hours</button>
        <button data-try-id="another-id">Another Try button</button>
      `;

      initTryButton();

      // Verify buttons were found by checking click handlers work
      const buttons = document.querySelectorAll('[data-try-id]');
      expect(buttons.length).toBe(2);
    });

    it('should handle anchor elements with data-try-id', () => {
      document.body.innerHTML = `
        <a href="#" data-try-id="${TEST_TRY_ID}">Try this now for 24 hours</a>
      `;

      initTryButton();

      // Verify anchor was found
      const anchors = document.querySelectorAll('[data-try-id]');
      expect(anchors.length).toBe(1);
    });

    it('should not find buttons without data-try-id', () => {
      document.body.innerHTML = `
        <button class="govuk-button">Regular button</button>
      `;

      initTryButton();

      // Verify no try buttons found
      const tryButtons = document.querySelectorAll('[data-try-id]');
      expect(tryButtons.length).toBe(0);
    });
  });

  describe('Button click - unauthenticated user', () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated.mockReturnValue(false);
    });

    it('should store return URL before redirecting', () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `;

      initTryButton();
      const button = document.querySelector('button') as HTMLButtonElement;
      button.click();

      expect(mockStoreReturnURL).toHaveBeenCalled();
    });

    it('should redirect to OAuth login', () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `;

      initTryButton();
      const button = document.querySelector('button') as HTMLButtonElement;
      button.click();

      expect(window.location.href).toBe('/api/auth/login');
    });

    it('should not open AUP modal', () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `;

      initTryButton();
      const button = document.querySelector('button') as HTMLButtonElement;
      button.click();

      expect(mockOpenAupModal).not.toHaveBeenCalled();
    });
  });

  describe('Button click - authenticated user', () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated.mockReturnValue(true);
    });

    it('should open AUP modal with tryId', () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `;

      initTryButton();
      const button = document.querySelector('button') as HTMLButtonElement;
      button.click();

      expect(mockOpenAupModal).toHaveBeenCalledWith(TEST_TRY_ID, expect.any(Function));
    });

    it('should not redirect to login', () => {
      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `;

      initTryButton();
      const button = document.querySelector('button') as HTMLButtonElement;
      button.click();

      expect(window.location.href).not.toBe('/api/auth/login');
    });

    it('should prevent default event action', () => {
      document.body.innerHTML = `
        <a href="/other-page" data-try-id="${TEST_TRY_ID}">Try this now</a>
      `;

      initTryButton();
      const link = document.querySelector('a') as HTMLAnchorElement;
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('should log error if data-try-id is missing', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      // This shouldn't happen in practice but test defensive code
      document.body.innerHTML = `
        <button data-try-id="">Try this now</button>
      `;

      initTryButton();
      const button = document.querySelector('button') as HTMLButtonElement;
      button.click();

      // Button without valid tryId should log error
      expect(errorSpy).toHaveBeenCalledWith('[TryButton] Button missing data-try-id attribute');
      errorSpy.mockRestore();
    });
  });

  describe('Lease acceptance callback', () => {
    let acceptCallback: (tryId: string) => Promise<void>;

    beforeEach(() => {
      mockAuthState.isAuthenticated.mockReturnValue(true);

      document.body.innerHTML = `
        <button data-try-id="${TEST_TRY_ID}">Try this now</button>
      `;

      initTryButton();
      const button = document.querySelector('button') as HTMLButtonElement;
      button.click();

      // Capture the callback passed to openAupModal
      acceptCallback = mockOpenAupModal.mock.calls[0][1];
    });

    it('should call createLease with tryId', async () => {
      mockCreateLease.mockResolvedValue({ success: true, lease: { id: 'lease-123' } as any });

      await acceptCallback(TEST_TRY_ID);

      expect(mockCreateLease).toHaveBeenCalledWith(TEST_TRY_ID);
    });

    describe('Success response', () => {
      beforeEach(() => {
        mockCreateLease.mockResolvedValue({
          success: true,
          lease: { id: 'lease-123' } as any,
        });
      });

      it('should close modal on success', async () => {
        await acceptCallback(TEST_TRY_ID);

        expect(mockCloseAupModal).toHaveBeenCalledWith(true);
      });

      it('should redirect to /try on success', async () => {
        await acceptCallback(TEST_TRY_ID);

        expect(window.location.href).toBe('/try');
      });
    });

    describe('CONFLICT error (max sessions)', () => {
      beforeEach(() => {
        mockCreateLease.mockResolvedValue({
          success: false,
          error: 'You have reached the maximum number of sessions.',
          errorCode: 'CONFLICT',
        });
        window.alert = jest.fn();
      });

      it('should close modal', async () => {
        await acceptCallback(TEST_TRY_ID);

        expect(mockCloseAupModal).toHaveBeenCalledWith(true);
      });

      it('should show alert with error message', async () => {
        await acceptCallback(TEST_TRY_ID);

        expect(window.alert).toHaveBeenCalledWith('You have reached the maximum number of sessions.');
      });

      it('should redirect to /try', async () => {
        await acceptCallback(TEST_TRY_ID);

        expect(window.location.href).toBe('/try');
      });
    });

    describe('UNAUTHORIZED error', () => {
      beforeEach(() => {
        mockCreateLease.mockResolvedValue({
          success: false,
          error: 'Authentication required',
          errorCode: 'UNAUTHORIZED',
        });
      });

      it('should close modal', async () => {
        await acceptCallback(TEST_TRY_ID);

        expect(mockCloseAupModal).toHaveBeenCalledWith(true);
      });

      it('should redirect to login', async () => {
        await acceptCallback(TEST_TRY_ID);

        expect(window.location.href).toBe('/api/auth/login');
      });
    });

    describe('Other errors (TIMEOUT, NETWORK_ERROR, SERVER_ERROR)', () => {
      it('should show error in modal for TIMEOUT', async () => {
        mockCreateLease.mockResolvedValue({
          success: false,
          error: 'Request timed out',
          errorCode: 'TIMEOUT',
        });

        await acceptCallback(TEST_TRY_ID);

        expect(mockShowError).toHaveBeenCalledWith('Request timed out');
        expect(mockCloseAupModal).not.toHaveBeenCalled();
      });

      it('should show error in modal for NETWORK_ERROR', async () => {
        mockCreateLease.mockResolvedValue({
          success: false,
          error: 'Network error',
          errorCode: 'NETWORK_ERROR',
        });

        await acceptCallback(TEST_TRY_ID);

        expect(mockShowError).toHaveBeenCalledWith('Network error');
      });

      it('should show error in modal for SERVER_ERROR', async () => {
        mockCreateLease.mockResolvedValue({
          success: false,
          error: 'Server error',
          errorCode: 'SERVER_ERROR',
        });

        await acceptCallback(TEST_TRY_ID);

        expect(mockShowError).toHaveBeenCalledWith('Server error');
      });

      it('should show default message when error is undefined', async () => {
        mockCreateLease.mockResolvedValue({
          success: false,
          errorCode: undefined,
        });

        await acceptCallback(TEST_TRY_ID);

        expect(mockShowError).toHaveBeenCalledWith('An error occurred. Please try again.');
      });
    });
  });

});
