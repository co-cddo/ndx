/**
 * Unit tests for Try Page Component
 *
 * Story 5.9: Empty State UI for Unauthenticated /try Page
 *
 * Tests:
 * - Empty state rendering for unauthenticated users
 * - Authenticated state rendering
 * - GOV.UK Design System compliance
 * - AuthState subscription integration
 *
 * @jest-environment jsdom
 */

import { initTryPage, renderEmptyState, renderAuthenticatedState } from './try-page';
import { authState } from '../auth/auth-provider';

// Mock the authState module
jest.mock('../auth/auth-provider', () => ({
  authState: {
    subscribe: jest.fn(),
    isAuthenticated: jest.fn(),
  },
}));

describe('Try Page Component (Story 5.9)', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();

    // Create container element
    container = document.createElement('div');
    container.id = 'try-sessions-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Cleanup
    document.body.innerHTML = '';
  });

  describe('initTryPage', () => {
    it('should subscribe to authState when container exists', () => {
      // Act
      initTryPage();

      // Assert
      expect(authState.subscribe).toHaveBeenCalledTimes(1);
      expect(authState.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should not subscribe when container does not exist', () => {
      // Arrange
      document.body.innerHTML = ''; // Remove container

      // Act
      initTryPage();

      // Assert
      expect(authState.subscribe).not.toHaveBeenCalled();
    });

    it('should render empty state when unauthenticated', () => {
      // Arrange
      let subscribeCallback: (isAuth: boolean) => void = () => {};
      (authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb;
      });

      // Act
      initTryPage();
      subscribeCallback(false);

      // Assert
      expect(container.innerHTML).toContain('Sign in to view your try sessions');
    });

    it('should render authenticated state when authenticated', () => {
      // Arrange
      let subscribeCallback: (isAuth: boolean) => void = () => {};
      (authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb;
      });

      // Act
      initTryPage();
      subscribeCallback(true);

      // Assert
      expect(container.innerHTML).toContain('Your try sessions');
    });
  });

  describe('renderEmptyState', () => {
    describe('AC #1: Empty State Display', () => {
      it('should render heading with correct text', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const heading = container.querySelector('h1');
        expect(heading).not.toBeNull();
        expect(heading?.textContent).toBe('Sign in to view your try sessions');
      });

      it('should render body text explaining sign in requirement', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const bodyText = container.querySelector('.govuk-body');
        expect(bodyText?.textContent).toContain('Innovation Sandbox account');
        expect(bodyText?.textContent).toContain('AWS sandbox environments');
      });

      it('should render sign in button', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const button = container.querySelector('a.govuk-button');
        expect(button).not.toBeNull();
        expect(button?.textContent?.trim()).toContain('Sign in');
      });
    });

    describe('AC #2: Sign In Button Functionality', () => {
      it('should have correct href for OAuth login', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const button = container.querySelector('a.govuk-button') as HTMLAnchorElement;
        expect(button.href).toContain('/api/auth/login');
      });
    });

    describe('AC #4: GOV.UK Design System Compliance', () => {
      it('should use govuk-heading-l class for heading', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const heading = container.querySelector('h1');
        expect(heading?.classList.contains('govuk-heading-l')).toBe(true);
      });

      it('should use govuk-body class for paragraph', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const paragraph = container.querySelector('p');
        expect(paragraph?.classList.contains('govuk-body')).toBe(true);
      });

      it('should use govuk-button--start class for button', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const button = container.querySelector('a.govuk-button');
        expect(button?.classList.contains('govuk-button--start')).toBe(true);
      });

      it('should include GOV.UK start button arrow icon', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const svg = container.querySelector('svg.govuk-button__start-icon');
        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
      });

      it('should have role="button" attribute', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const button = container.querySelector('a.govuk-button');
        expect(button?.getAttribute('role')).toBe('button');
      });

      it('should have draggable="false" attribute', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const button = container.querySelector('a.govuk-button');
        expect(button?.getAttribute('draggable')).toBe('false');
      });

      it('should have data-module="govuk-button" attribute', () => {
        // Act
        renderEmptyState(container);

        // Assert
        const button = container.querySelector('a.govuk-button');
        expect(button?.getAttribute('data-module')).toBe('govuk-button');
      });
    });
  });

  describe('renderAuthenticatedState', () => {
    it('should render heading for authenticated users', () => {
      // Act
      renderAuthenticatedState(container);

      // Assert
      const heading = container.querySelector('h1');
      expect(heading?.textContent).toBe('Your try sessions');
      expect(heading?.classList.contains('govuk-heading-l')).toBe(true);
    });

    it('should render placeholder content', () => {
      // Act
      renderAuthenticatedState(container);

      // Assert
      expect(container.innerHTML).toContain('sandbox sessions');
    });

    it('should include link to catalogue', () => {
      // Act
      renderAuthenticatedState(container);

      // Assert
      const link = container.querySelector('a.govuk-link') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.href).toContain('/catalogue');
    });
  });

  describe('AC #5: Dynamic State Update on Auth Change', () => {
    it('should re-render when auth state changes from false to true', () => {
      // Arrange
      let subscribeCallback: (isAuth: boolean) => void = () => {};
      (authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb;
      });

      // Act
      initTryPage();

      // First render - unauthenticated
      subscribeCallback(false);
      expect(container.innerHTML).toContain('Sign in to view your try sessions');

      // Auth state changes - authenticated
      subscribeCallback(true);
      expect(container.innerHTML).toContain('Your try sessions');
      expect(container.innerHTML).not.toContain('Sign in to view your try sessions');
    });

    it('should re-render when auth state changes from true to false', () => {
      // Arrange
      let subscribeCallback: (isAuth: boolean) => void = () => {};
      (authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb;
      });

      // Act
      initTryPage();

      // First render - authenticated
      subscribeCallback(true);
      expect(container.innerHTML).toContain('Your try sessions');

      // Auth state changes - unauthenticated (signed out)
      subscribeCallback(false);
      expect(container.innerHTML).toContain('Sign in to view your try sessions');
      expect(container.innerHTML).not.toContain('Your try sessions');
    });
  });
});
