/**
 * Unit tests for Sessions Table Component
 *
 * Story 7.3: Render sessions table with GOV.UK Design System
 * Story 7.4: Status badge display with color coding
 *
 * Tests:
 * - Table rendering with leases
 * - Empty table state
 * - Status badge colors
 * - Loading and error states
 * - XSS protection
 *
 * @jest-environment jsdom
 */

import {
  renderSessionsTable,
  renderLoadingState,
  renderErrorState,
} from './sessions-table';
import { Lease } from '../../api/sessions-service';

// Mock the dependencies
jest.mock('../../api/sessions-service', () => ({
  isLeaseActive: jest.fn((lease: { status: string }) => lease.status === 'Active'),
  getSsoUrl: jest.fn((lease: { awsAccountId: string }) =>
    `https://test.awsapps.com/start/#/console?account_id=${lease.awsAccountId}&role_name=test_role`
  ),
}));

jest.mock('../../utils/date-utils', () => ({
  formatExpiry: jest.fn((date: string) => `in 23 hours (${date})`),
  formatRemainingDuration: jest.fn(() => '23h 45m remaining'),
}));

jest.mock('../../utils/currency-utils', () => ({
  formatBudget: jest.fn((current: number, max: number) => `$${current.toFixed(4)} / $${max.toFixed(2)}`),
  calculateBudgetPercentage: jest.fn((current: number, max: number) => Math.round((current / max) * 100)),
}));

describe('Sessions Table Component', () => {
  const mockActiveLease: Lease = {
    leaseId: 'lease-123',
    awsAccountId: '123456789012',
    leaseTemplateId: 'template-123',
    leaseTemplateName: 'AWS Lambda Sandbox',
    status: 'Active',
    createdAt: '2025-01-01T00:00:00Z',
    expiresAt: '2025-01-02T00:00:00Z',
    maxSpend: 50,
    currentSpend: 12.3456,
  };

  const mockPendingLease: Lease = {
    ...mockActiveLease,
    leaseId: 'lease-456',
    status: 'Pending',
  };

  const mockExpiredLease: Lease = {
    ...mockActiveLease,
    leaseId: 'lease-789',
    status: 'Expired',
  };

  const mockTerminatedLease: Lease = {
    ...mockActiveLease,
    leaseId: 'lease-999',
    status: 'Terminated',
  };

  const mockFailedLease: Lease = {
    ...mockActiveLease,
    leaseId: 'lease-888',
    status: 'Failed',
  };

  describe('renderSessionsTable', () => {
    it('should render empty state when no leases', () => {
      const html = renderSessionsTable([]);

      expect(html).toContain('govuk-inset-text');
      expect(html).toContain("You don't have any sandbox sessions yet");
      expect(html).toContain('/catalogue/tags/try-before-you-buy');
    });

    it('should render table with GOV.UK classes', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('govuk-table');
      expect(html).toContain('sessions-table');
      expect(html).toContain('govuk-table__head');
      expect(html).toContain('govuk-table__body');
      expect(html).toContain('govuk-table__header');
      expect(html).toContain('govuk-table__cell');
    });

    it('should render table headers correctly', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('Product');
      expect(html).toContain('AWS Account ID');
      expect(html).toContain('Status');
      expect(html).toContain('Expires');
      expect(html).toContain('Budget');
      expect(html).toContain('Actions');
    });

    it('should render hidden caption for accessibility', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('govuk-table__caption--m');
      expect(html).toContain('govuk-visually-hidden');
      expect(html).toContain('Your sandbox sessions');
    });

    it('should render all leases', () => {
      const html = renderSessionsTable([mockActiveLease, mockPendingLease, mockExpiredLease]);

      expect(html).toContain('AWS Lambda Sandbox');
      expect(html.match(/govuk-table__row/g)?.length).toBeGreaterThanOrEqual(4); // header + 3 data rows
    });
  });

  describe('renderSessionRow', () => {
    it('should render product name', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('AWS Lambda Sandbox');
      expect(html).toContain('<strong>AWS Lambda Sandbox</strong>');
    });

    it('should render AWS Account ID', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('123456789012');
      expect(html).toContain('<code class="govuk-!-font-size-16">123456789012</code>');
    });

    it('should render Active status with green badge', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('govuk-tag--green');
      expect(html).toContain('Active');
    });

    it('should render Pending status with blue badge', () => {
      const html = renderSessionsTable([mockPendingLease]);

      expect(html).toContain('govuk-tag--blue');
      expect(html).toContain('Pending');
    });

    it('should render Expired status with grey badge', () => {
      const html = renderSessionsTable([mockExpiredLease]);

      expect(html).toContain('govuk-tag--grey');
      expect(html).toContain('Expired');
    });

    it('should render Terminated status with red badge', () => {
      const html = renderSessionsTable([mockTerminatedLease]);

      expect(html).toContain('govuk-tag--red');
      expect(html).toContain('Terminated');
    });

    it('should render Failed status with red badge', () => {
      const html = renderSessionsTable([mockFailedLease]);

      expect(html).toContain('govuk-tag--red');
      expect(html).toContain('Failed');
    });

    it('should render expiry date', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('in 23 hours');
    });

    it('should render budget with progress bar', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('$12.3456 / $50.00');
      expect(html).toContain('<progress');
      expect(html).toContain('aria-label="Budget usage');
      expect(html).toContain('sessions-budget-progress');
    });

    it('should render remaining duration for active leases', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('23h 45m remaining');
    });

    it('should NOT render remaining duration for non-active leases', () => {
      const html = renderSessionsTable([mockExpiredLease]);

      expect(html).not.toContain('remaining');
    });

    it('should render Launch button for Active leases', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('Launch AWS Console');
      expect(html).toContain('govuk-button--secondary');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('https://test.awsapps.com/start');
    });

    it('should NOT render Launch button for Pending leases', () => {
      const html = renderSessionsTable([mockPendingLease]);

      expect(html).not.toContain('Launch AWS Console');
      expect(html).toContain('No actions available');
    });

    it('should NOT render Launch button for Expired leases', () => {
      const html = renderSessionsTable([mockExpiredLease]);

      expect(html).not.toContain('Launch AWS Console');
      expect(html).toContain('No actions available');
    });

    it('should NOT render Launch button for Failed leases', () => {
      const html = renderSessionsTable([mockFailedLease]);

      expect(html).not.toContain('Launch AWS Console');
      expect(html).toContain('No actions available');
    });

    it('should escape HTML in product name to prevent XSS', () => {
      const xssLease: Lease = {
        ...mockActiveLease,
        leaseTemplateName: '<script>alert("XSS")</script>',
      };

      const html = renderSessionsTable([xssLease]);

      // Should NOT contain unescaped script tag
      expect(html).not.toContain('<script>alert("XSS")</script>');
      // Should contain escaped version
      expect(html).toContain('&lt;script&gt;');
    });

    it('should include visually hidden text for screen readers on Launch button', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('govuk-visually-hidden');
      expect(html).toContain('(opens in new tab)');
    });
  });

  describe('renderLoadingState', () => {
    it('should render loading message', () => {
      const html = renderLoadingState();

      expect(html).toContain('sessions-loading');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('Loading your sessions');
    });
  });

  describe('renderErrorState', () => {
    const errorMessage = 'Failed to load sessions';

    it('should render error summary with GOV.UK classes', () => {
      const html = renderErrorState(errorMessage);

      expect(html).toContain('govuk-error-summary');
      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-labelledby="error-summary-title"');
    });

    it('should render error title', () => {
      const html = renderErrorState(errorMessage);

      expect(html).toContain('govuk-error-summary__title');
      expect(html).toContain('There was a problem');
    });

    it('should render error message', () => {
      const html = renderErrorState(errorMessage);

      expect(html).toContain('Failed to load sessions');
    });

    it('should render retry button', () => {
      const html = renderErrorState(errorMessage);

      expect(html).toContain('Try again');
      expect(html).toContain('data-action="retry-fetch"');
      expect(html).toContain('govuk-button--secondary');
    });

    it('should escape HTML in error message to prevent XSS', () => {
      const xssMessage = '<script>alert("XSS")</script>';
      const html = renderErrorState(xssMessage);

      // Should NOT contain unescaped script tag
      expect(html).not.toContain('<script>alert("XSS")</script>');
      // Should contain escaped version
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('Accessibility', () => {
    it('should have proper table headers with scope attribute', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('scope="col"');
    });

    it('should have ARIA labels for progress bars', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('aria-label="Budget usage');
    });

    it('should have ARIA labels for expiry dates (Story 7.5)', () => {
      const html = renderSessionsTable([mockActiveLease]);

      // Story 7.5 AC: Screen reader announces expiry clearly (ARIA labels)
      expect(html).toContain('aria-label="Session expires');
      expect(html).toContain('data-label="Expiry"');
    });

    it('should have ARIA labels for budget display (Story 7.6)', () => {
      const html = renderSessionsTable([mockActiveLease]);

      // Story 7.6 AC: Screen reader announces budget clearly (ARIA labels)
      expect(html).toContain('aria-label="Budget:');
      expect(html).toContain('used of');
      expect(html).toContain('maximum"');
    });

    it('should have visually hidden caption for screen readers', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('govuk-visually-hidden');
    });

    it('should have proper ARIA attributes for error state', () => {
      const html = renderErrorState('Test error');

      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-labelledby="error-summary-title"');
    });

    it('should have aria-live for loading state', () => {
      const html = renderLoadingState();

      expect(html).toContain('aria-live="polite"');
    });

    it('should have data-label attributes for mobile responsive design', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('data-label="Product"');
      expect(html).toContain('data-label="AWS Account ID"');
      expect(html).toContain('data-label="Status"');
      expect(html).toContain('data-label="Expiry"');
      expect(html).toContain('data-label="Budget"');
      expect(html).toContain('data-label="Actions"');
    });
  });

  describe('GOV.UK Design System Compliance', () => {
    it('should use correct button classes', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('govuk-button');
      expect(html).toContain('govuk-button--secondary');
      expect(html).toContain('govuk-!-margin-bottom-0');
    });

    it('should use correct table classes', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('govuk-table');
      expect(html).toContain('sessions-table'); // Responsive CSS target
      expect(html).toContain('govuk-table__head');
      expect(html).toContain('govuk-table__body');
      expect(html).toContain('govuk-table__row');
      expect(html).toContain('govuk-table__header');
      expect(html).toContain('govuk-table__cell');
    });

    it('should use correct tag classes', () => {
      const html = renderSessionsTable([mockActiveLease]);

      expect(html).toContain('govuk-tag');
      expect(html).toContain('govuk-tag--green');
    });

    it('should use correct inset text classes for empty state', () => {
      const html = renderSessionsTable([]);

      expect(html).toContain('govuk-inset-text');
      expect(html).toContain('govuk-body');
      expect(html).toContain('govuk-link');
    });

    it('should use correct error summary classes', () => {
      const html = renderErrorState('Test error');

      expect(html).toContain('govuk-error-summary');
      expect(html).toContain('govuk-error-summary__title');
      expect(html).toContain('govuk-error-summary__body');
    });
  });
});
