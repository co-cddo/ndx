/**
 * Unit tests for Sessions Table Component
 *
 * Story 7.3: Render sessions table with GOV.UK Design System
 * Story 7.4: Status badge display with color coding
 * Story 7-1: Catalogue links for template names
 *
 * Tests:
 * - Table rendering with leases
 * - Empty table state
 * - Status badge colors
 * - Loading and error states
 * - XSS protection
 * - Catalogue links (Story 7-1)
 *
 * @jest-environment jsdom
 */

import {
  renderSessionsTable,
  renderLoadingState,
  renderErrorState,
  getCatalogueUrl,
  CATALOGUE_SLUGS,
} from "./sessions-table"
import { Lease } from "../../api/sessions-service"

// Mock the dependencies
jest.mock("../../api/sessions-service", () => ({
  isLeaseActive: jest.fn((lease: { status: string }) => lease.status === "Active"),
  getSsoUrl: jest.fn(
    (lease: { awsAccountId: string }) =>
      `https://test.awsapps.com/start/#/console?account_id=${lease.awsAccountId}&role_name=test_role`,
  ),
  getPortalUrl: jest.fn(
    (lease: { awsAccountId: string }) => `https://test.awsapps.com/start/#/console?account_id=${lease.awsAccountId}`,
  ),
  // Story 5.2: CloudFormation console URL via SSO
  getCfnConsoleUrl: jest.fn(
    (lease: { awsAccountId: string }, region = "us-west-2") =>
      `https://test.awsapps.com/start/#/console?account_id=${lease.awsAccountId}&role_name=ndx_IsbUsersPS&destination=${encodeURIComponent(`https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}`)}`,
  ),
}))

jest.mock("../../utils/date-utils", () => ({
  formatExpiry: jest.fn((date: string) => `in 23 hours (${date})`),
}))

describe("Sessions Table Component", () => {
  const mockActiveLease: Lease = {
    leaseId: "lease-123",
    awsAccountId: "123456789012",
    leaseTemplateId: "template-123",
    leaseTemplateName: "AWS Lambda Sandbox",
    status: "Active",
    createdAt: "2025-01-01T00:00:00Z",
    expiresAt: "2025-01-02T00:00:00Z",
    maxSpend: 50,
    currentSpend: 12.3456,
  }

  const mockPendingLease: Lease = {
    ...mockActiveLease,
    leaseId: "lease-456",
    status: "PendingApproval",
  }

  const mockExpiredLease: Lease = {
    ...mockActiveLease,
    leaseId: "lease-789",
    status: "Expired",
  }

  const mockDeniedLease: Lease = {
    ...mockActiveLease,
    leaseId: "lease-999",
    status: "ApprovalDenied",
  }

  const mockBudgetExceededLease: Lease = {
    ...mockActiveLease,
    leaseId: "lease-888",
    status: "BudgetExceeded",
  }

  describe("renderSessionsTable", () => {
    it("should render empty state when no leases", () => {
      const html = renderSessionsTable([])

      expect(html).toContain("govuk-inset-text")
      expect(html).toContain("You don't have any sandbox sessions yet")
      expect(html).toContain("/catalogue/tags/try-before-you-buy")
    })

    it("should render table with GOV.UK classes", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("govuk-table")
      expect(html).toContain("sessions-table")
      expect(html).toContain("govuk-table__head")
      expect(html).toContain("govuk-table__body")
      expect(html).toContain("govuk-table__header")
      expect(html).toContain("govuk-table__cell")
    })

    it("should render table headers correctly", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("Product")
      expect(html).toContain("AWS Account ID")
      expect(html).toContain("Status")
      expect(html).toContain("Expires")
      expect(html).toContain("Budget")
      expect(html).toContain("Actions")
    })

    it("should render hidden caption for accessibility", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("govuk-table__caption--m")
      expect(html).toContain("govuk-visually-hidden")
      expect(html).toContain("Your sandbox sessions")
    })

    it("should render all leases", () => {
      const html = renderSessionsTable([mockActiveLease, mockPendingLease, mockExpiredLease])

      expect(html).toContain("AWS Lambda Sandbox")
      expect(html.match(/govuk-table__row/g)?.length).toBeGreaterThanOrEqual(4) // header + 3 data rows
    })
  })

  describe("renderSessionRow", () => {
    it("should render product name", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("AWS Lambda Sandbox")
      expect(html).toContain("<strong>AWS Lambda Sandbox</strong>")
    })

    it("should render AWS Account ID", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("123456789012")
      expect(html).toContain('<code class="govuk-!-font-size-16">123456789012</code>')
    })

    it("should render Active status with green badge", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("govuk-tag--green")
      expect(html).toContain("Active")
    })

    it("should render PendingApproval status with blue badge", () => {
      const html = renderSessionsTable([mockPendingLease])

      expect(html).toContain("govuk-tag--blue")
      expect(html).toContain("Pending approval")
    })

    it("should render Expired status as Completed with grey badge", () => {
      const html = renderSessionsTable([mockExpiredLease])

      expect(html).toContain("govuk-tag--grey")
      expect(html).toContain("Completed")
    })

    it("should render ApprovalDenied status with red badge", () => {
      const html = renderSessionsTable([mockDeniedLease])

      expect(html).toContain("govuk-tag--red")
      expect(html).toContain("Denied")
    })

    it("should render BudgetExceeded status with red badge", () => {
      const html = renderSessionsTable([mockBudgetExceededLease])

      expect(html).toContain("govuk-tag--red")
      expect(html).toContain("Budget exceeded")
    })

    it("should render expiry date", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("in 23 hours")
    })

    it("should render budget amount", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("$50.00 budget")
    })

    it("should render Launch button for Active leases", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("Launch AWS Console")
      expect(html).toContain("govuk-button--secondary")
      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noopener noreferrer"')
      expect(html).toContain("https://test.awsapps.com/start")
    })

    it("should render Get CLI Credentials link for Active leases", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("Get CLI Credentials")
      expect(html).toContain('data-action="get-credentials"')
      expect(html).toContain('href="https://test.awsapps.com/start/#/console?account_id=123456789012"')
      expect(html).toContain('target="_blank"')
    })

    it("should NOT render Get CLI Credentials link for non-active leases", () => {
      const html = renderSessionsTable([mockPendingLease])

      expect(html).not.toContain("Get CLI Credentials")
    })

    it("should wrap action buttons in sessions-actions container", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain('class="sessions-actions"')
    })

    it("should NOT render Launch button for Pending leases", () => {
      const html = renderSessionsTable([mockPendingLease])

      expect(html).not.toContain("Launch AWS Console")
      expect(html).toContain("No actions available")
    })

    it("should NOT render Launch button for Expired leases", () => {
      const html = renderSessionsTable([mockExpiredLease])

      expect(html).not.toContain("Launch AWS Console")
      expect(html).toContain("No actions available")
    })

    it("should NOT render Launch button for BudgetExceeded leases", () => {
      const html = renderSessionsTable([mockBudgetExceededLease])

      expect(html).not.toContain("Launch AWS Console")
      expect(html).toContain("No actions available")
    })

    it("should escape HTML in product name to prevent XSS", () => {
      const xssLease: Lease = {
        ...mockActiveLease,
        leaseTemplateName: '<script>alert("XSS")</script>',
      }

      const html = renderSessionsTable([xssLease])

      // Should NOT contain unescaped script tag
      expect(html).not.toContain('<script>alert("XSS")</script>')
      // Should contain escaped version
      expect(html).toContain("&lt;script&gt;")
    })

    it("should escape HTML in AWS Account ID to prevent XSS", () => {
      const xssLease: Lease = {
        ...mockActiveLease,
        status: "PendingApproval", // Use non-active status to avoid URL rendering from mocks
        awsAccountId: '<script>alert("XSS")</script>',
      }

      const html = renderSessionsTable([xssLease])

      // Should NOT contain unescaped script tag in the table cell
      expect(html).not.toContain('<code class="govuk-!-font-size-16"><script>')
      // Should contain escaped version in the table cell
      expect(html).toContain('<code class="govuk-!-font-size-16">&lt;script&gt;')
    })

    it("should include visually hidden text for screen readers on Launch button", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("govuk-visually-hidden")
      expect(html).toContain("(opens in new tab)")
    })
  })

  describe("renderLoadingState", () => {
    it("should render loading message", () => {
      const html = renderLoadingState()

      expect(html).toContain("sessions-loading")
      expect(html).toContain('aria-live="polite"')
      expect(html).toContain("Loading your sessions")
    })
  })

  describe("renderErrorState", () => {
    const errorMessage = "Failed to load sessions"

    it("should render error summary with GOV.UK classes", () => {
      const html = renderErrorState(errorMessage)

      expect(html).toContain("govuk-error-summary")
      expect(html).toContain('role="alert"')
      expect(html).toContain('aria-labelledby="error-summary-title"')
    })

    it("should render error title", () => {
      const html = renderErrorState(errorMessage)

      expect(html).toContain("govuk-error-summary__title")
      expect(html).toContain("There was a problem")
    })

    it("should render error message", () => {
      const html = renderErrorState(errorMessage)

      expect(html).toContain("Failed to load sessions")
    })

    it("should render retry button", () => {
      const html = renderErrorState(errorMessage)

      expect(html).toContain("Try again")
      expect(html).toContain('data-action="retry-fetch"')
      expect(html).toContain("govuk-button--secondary")
    })

    it("should escape HTML in error message to prevent XSS", () => {
      const xssMessage = '<script>alert("XSS")</script>'
      const html = renderErrorState(xssMessage)

      // Should NOT contain unescaped script tag
      expect(html).not.toContain('<script>alert("XSS")</script>')
      // Should contain escaped version
      expect(html).toContain("&lt;script&gt;")
    })
  })

  describe("Accessibility", () => {
    it("should have proper table headers with scope attribute", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain('scope="col"')
    })

    it("should have ARIA labels for expiry dates (Story 7.5)", () => {
      const html = renderSessionsTable([mockActiveLease])

      // Story 7.5 AC: Screen reader announces expiry clearly (ARIA labels)
      expect(html).toContain('aria-label="Session expires')
      expect(html).toContain('data-label="Expiry"')
    })

    it("should have visually hidden caption for screen readers", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("govuk-visually-hidden")
    })

    it("should have proper ARIA attributes for error state", () => {
      const html = renderErrorState("Test error")

      expect(html).toContain('role="alert"')
      expect(html).toContain('aria-labelledby="error-summary-title"')
    })

    it("should have aria-live for loading state", () => {
      const html = renderLoadingState()

      expect(html).toContain('aria-live="polite"')
    })

    it("should have data-label attributes for mobile responsive design", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain('data-label="Product"')
      expect(html).toContain('data-label="AWS Account ID"')
      expect(html).toContain('data-label="Status"')
      expect(html).toContain('data-label="Expiry"')
      expect(html).toContain('data-label="Budget"')
      expect(html).toContain('data-label="Actions"')
    })
  })

  describe("GOV.UK Design System Compliance", () => {
    it("should use correct button classes", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("govuk-button")
      expect(html).toContain("govuk-button--secondary")
      expect(html).toContain("govuk-!-margin-bottom-0")
    })

    it("should use correct table classes", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("govuk-table")
      expect(html).toContain("sessions-table") // Responsive CSS target
      expect(html).toContain("govuk-table__head")
      expect(html).toContain("govuk-table__body")
      expect(html).toContain("govuk-table__row")
      expect(html).toContain("govuk-table__header")
      expect(html).toContain("govuk-table__cell")
    })

    it("should use correct tag classes", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("govuk-tag")
      expect(html).toContain("govuk-tag--green")
    })

    it("should use correct inset text classes for empty state", () => {
      const html = renderSessionsTable([])

      expect(html).toContain("govuk-inset-text")
      expect(html).toContain("govuk-body")
      expect(html).toContain("govuk-link")
    })

    it("should use correct error summary classes", () => {
      const html = renderErrorState("Test error")

      expect(html).toContain("govuk-error-summary")
      expect(html).toContain("govuk-error-summary__title")
      expect(html).toContain("govuk-error-summary__body")
    })
  })

  describe("Story 5.2: CloudFormation Button", () => {
    it("should render CloudFormation button for Active leases", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain("Open CloudFormation")
      expect(html).toContain('data-action="launch-cloudformation"')
    })

    it("should NOT render CloudFormation button for non-active leases", () => {
      const html = renderSessionsTable([mockPendingLease])

      expect(html).not.toContain("Open CloudFormation")
      expect(html).not.toContain('data-action="launch-cloudformation"')
    })

    it("should NOT render CloudFormation button for expired leases", () => {
      const html = renderSessionsTable([mockExpiredLease])

      expect(html).not.toContain("Open CloudFormation")
    })

    it("should include correct CloudFormation URL format via SSO", () => {
      const html = renderSessionsTable([mockActiveLease])

      // URL goes through SSO portal with destination parameter
      expect(html).toContain(".awsapps.com/start/#/console")
      expect(html).toContain("account_id=")
      expect(html).toContain("destination=")
      // CloudFormation URL is URL-encoded in the destination parameter
      expect(html).toContain("cloudformation")
    })

    it("should include data attributes for analytics tracking", () => {
      const html = renderSessionsTable([mockActiveLease])

      expect(html).toContain('data-action="launch-cloudformation"')
      expect(html).toContain('data-lease-id="lease-123"')
      expect(html).toContain('data-lease-template="AWS Lambda Sandbox"')
      expect(html).toContain('data-budget="50"')
      expect(html).toContain('data-expires="2025-01-02T00:00:00Z"')
    })

    it("should include visually hidden text for screen readers", () => {
      const html = renderSessionsTable([mockActiveLease])

      // All three buttons should have visually hidden text
      const matches = html.match(/govuk-visually-hidden.*?\(opens in new tab\)/g)
      expect(matches).not.toBeNull()
      expect(matches!.length).toBeGreaterThanOrEqual(3)
    })

    it("should open in new tab with security attributes", () => {
      const html = renderSessionsTable([mockActiveLease])

      // Find the CloudFormation link specifically
      const cfnLinkMatch = html.match(/<a[^>]*data-action="launch-cloudformation"[^>]*>/s)
      expect(cfnLinkMatch).not.toBeNull()

      const cfnLink = cfnLinkMatch![0]
      expect(cfnLink).toContain('target="_blank"')
      expect(cfnLink).toContain('rel="noopener noreferrer"')
    })

    it("should use correct GOV.UK button classes", () => {
      const html = renderSessionsTable([mockActiveLease])

      // Find the CloudFormation link specifically
      const cfnLinkMatch = html.match(/<a[^>]*data-action="launch-cloudformation"[^>]*>/s)
      expect(cfnLinkMatch).not.toBeNull()

      const cfnLink = cfnLinkMatch![0]
      expect(cfnLink).toContain("govuk-button")
      expect(cfnLink).toContain("govuk-button--secondary")
    })

    it("should render CloudFormation button as third button after CLI Credentials", () => {
      const html = renderSessionsTable([mockActiveLease])

      // Order should be: Launch AWS Console, Get CLI Credentials, Open CloudFormation
      const consoleIndex = html.indexOf("Launch AWS Console")
      const cliIndex = html.indexOf("Get CLI Credentials")
      const cfnIndex = html.indexOf("Open CloudFormation")

      expect(consoleIndex).toBeLessThan(cliIndex)
      expect(cliIndex).toBeLessThan(cfnIndex)
    })
  })

  describe("Comments", () => {
    const mockLeaseWithComments: Lease = {
      ...mockActiveLease,
      comments: "Your lease request has been automatically approved.\nScore: 0\nReference: ISB-2025-9839",
    }

    const mockExpiredLeaseWithComments: Lease = {
      ...mockExpiredLease,
      comments: "Your lease request has been approved.\nReference: ISB-2025-1234",
    }

    it("should render comments for active leases always visible", () => {
      const html = renderSessionsTable([mockLeaseWithComments])

      expect(html).toContain("sessions-table__comments-row")
      expect(html).toContain("sessions-table__comments-cell")
      expect(html).toContain("Your lease request has been automatically approved.")
      // Should NOT be in a details element for active leases
      expect(html).not.toMatch(/<details[^>]*>[\s\S]*?Your lease request has been automatically approved/)
    })

    it("should render comments for non-active leases in collapsible details", () => {
      const html = renderSessionsTable([mockExpiredLeaseWithComments])

      expect(html).toContain("sessions-table__comments-row")
      expect(html).toContain("govuk-details")
      expect(html).toContain("See details")
      expect(html).toContain("Your lease request has been approved.")
    })

    it("should convert newlines to <br> in comments", () => {
      const html = renderSessionsTable([mockLeaseWithComments])

      expect(html).toContain(
        "Your lease request has been automatically approved.<br>Score: 0<br>Reference: ISB-2025-9839",
      )
    })

    it("should escape HTML in comments to prevent XSS", () => {
      const xssLease: Lease = {
        ...mockActiveLease,
        comments: '<script>alert("XSS")</script>',
      }

      const html = renderSessionsTable([xssLease])

      // Should NOT contain unescaped script tag
      expect(html).not.toContain('<script>alert("XSS")</script>')
      // Should contain escaped version
      expect(html).toContain("&lt;script&gt;")
    })

    it("should not render comments row when comments are empty", () => {
      const leaseNoComments: Lease = {
        ...mockActiveLease,
        comments: undefined,
      }

      const html = renderSessionsTable([leaseNoComments])

      expect(html).not.toContain("sessions-table__comments-row")
    })

    it("should render colspan=6 on comments cell", () => {
      const html = renderSessionsTable([mockLeaseWithComments])

      expect(html).toContain('colspan="6"')
    })
  })

  describe("Story 7-1: Catalogue Links", () => {
    describe("getCatalogueUrl", () => {
      it("should return correct URL for Council Chatbot", () => {
        expect(getCatalogueUrl("Council Chatbot")).toBe("/catalogue/aws/council-chatbot/")
      })

      it("should return correct URL for NDX:Try for AWS (empty sandbox)", () => {
        expect(getCatalogueUrl("NDX:Try for AWS")).toBe("/catalogue/aws/innovation-sandbox-empty/")
      })

      it("should return correct URL for FOI Redaction", () => {
        expect(getCatalogueUrl("FOI Redaction")).toBe("/catalogue/aws/foi-redaction/")
      })

      it("should return correct URL for LocalGov Drupal", () => {
        expect(getCatalogueUrl("LocalGov Drupal")).toBe("/catalogue/aws/localgov-drupal/")
      })

      it("should return correct URL for Planning AI", () => {
        expect(getCatalogueUrl("Planning AI")).toBe("/catalogue/aws/planning-ai/")
      })

      it("should return correct URL for QuickSight Dashboard", () => {
        expect(getCatalogueUrl("QuickSight Dashboard")).toBe("/catalogue/aws/quicksight-dashboard/")
      })

      it("should return correct URL for Smart Car Park", () => {
        expect(getCatalogueUrl("Smart Car Park")).toBe("/catalogue/aws/smart-car-park/")
      })

      it("should return correct URL for Text to Speech", () => {
        expect(getCatalogueUrl("Text to Speech")).toBe("/catalogue/aws/text-to-speech/")
      })

      it("should return null for unknown template", () => {
        expect(getCatalogueUrl("Unknown Template")).toBeNull()
      })

      it("should return null for empty string", () => {
        expect(getCatalogueUrl("")).toBeNull()
      })

      it("should return null for whitespace-only string", () => {
        expect(getCatalogueUrl("   ")).toBeNull()
      })

      it("should be case-sensitive (API returns exact names)", () => {
        // Template names must match exactly - case matters
        expect(getCatalogueUrl("foi redaction")).toBeNull()
        expect(getCatalogueUrl("FOI REDACTION")).toBeNull()
        expect(getCatalogueUrl("FOI Redaction")).toBe("/catalogue/aws/foi-redaction/")
      })
    })

    describe("CATALOGUE_SLUGS mapping", () => {
      it("should have exactly 8 templates mapped", () => {
        expect(Object.keys(CATALOGUE_SLUGS)).toHaveLength(8)
      })

      it("should have all expected template names", () => {
        const expectedTemplates = [
          "Council Chatbot",
          "NDX:Try for AWS",
          "FOI Redaction",
          "LocalGov Drupal",
          "Planning AI",
          "QuickSight Dashboard",
          "Smart Car Park",
          "Text to Speech",
        ]

        expectedTemplates.forEach((template) => {
          expect(CATALOGUE_SLUGS).toHaveProperty(template)
        })
      })
    })

    describe("renderSessionsTable with catalogue links", () => {
      const mockLeaseWithKnownTemplate: Lease = {
        leaseId: "lease-foi",
        awsAccountId: "123456789012",
        leaseTemplateId: "template-foi",
        leaseTemplateName: "FOI Redaction",
        status: "Active",
        createdAt: "2025-01-01T00:00:00Z",
        expiresAt: "2025-01-02T00:00:00Z",
        maxSpend: 50,
        currentSpend: 0,
      }

      const mockLeaseWithUnknownTemplate: Lease = {
        leaseId: "lease-unknown",
        awsAccountId: "987654321098",
        leaseTemplateId: "template-unknown",
        leaseTemplateName: "Custom Internal Template",
        status: "Active",
        createdAt: "2025-01-01T00:00:00Z",
        expiresAt: "2025-01-02T00:00:00Z",
        maxSpend: 50,
        currentSpend: 0,
      }

      it("should render template name as link when mapping exists (AC-1, AC-2)", () => {
        const html = renderSessionsTable([mockLeaseWithKnownTemplate])

        expect(html).toContain(
          '<a href="/catalogue/aws/foi-redaction/" class="govuk-link" data-action="view-catalogue">',
        )
        expect(html).toContain("<strong>FOI Redaction</strong>")
        expect(html).toContain("</a>")
      })

      it("should include data-action attribute for analytics tracking", () => {
        const html = renderSessionsTable([mockLeaseWithKnownTemplate])

        expect(html).toContain('data-action="view-catalogue"')
      })

      it("should render template name as plain text when no mapping exists (AC-6)", () => {
        const html = renderSessionsTable([mockLeaseWithUnknownTemplate])

        expect(html).toContain("<strong>Custom Internal Template</strong>")
        // Should NOT be wrapped in a link
        expect(html).not.toContain('href="/catalogue/aws/custom-internal-template/')
        // Should NOT have govuk-link class around the unknown template
        expect(html).not.toMatch(/<a[^>]*class="govuk-link"[^>]*>.*Custom Internal Template.*<\/a>/s)
      })

      it("should use govuk-link class for links (AC-7)", () => {
        const html = renderSessionsTable([mockLeaseWithKnownTemplate])

        // Find the product cell link with govuk-link class
        const productLinkMatch = html.match(/<a href="\/catalogue\/aws\/[^"]+"\s+class="govuk-link"[^>]*>/s)
        expect(productLinkMatch).not.toBeNull()
      })

      it("should not include target=_blank for catalogue links (AC-3)", () => {
        const html = renderSessionsTable([mockLeaseWithKnownTemplate])

        // Find the catalogue link specifically
        const catalogueLinkMatch = html.match(/<a href="\/catalogue\/aws\/foi-redaction\/"[^>]*>/s)
        expect(catalogueLinkMatch).not.toBeNull()

        const catalogueLink = catalogueLinkMatch![0]
        // Should NOT open in new tab - internal navigation
        expect(catalogueLink).not.toContain('target="_blank"')
      })

      it("should render multiple leases with mixed link/plain text correctly", () => {
        const html = renderSessionsTable([mockLeaseWithKnownTemplate, mockLeaseWithUnknownTemplate])

        // Known template should have link
        expect(html).toContain('href="/catalogue/aws/foi-redaction/"')
        // Unknown template should be plain text
        expect(html).toContain("<strong>Custom Internal Template</strong>")
      })

      it("should escape HTML in template name even in links (XSS protection)", () => {
        const xssLease: Lease = {
          ...mockLeaseWithKnownTemplate,
          leaseTemplateName: '<script>alert("XSS")</script>',
        }

        const html = renderSessionsTable([xssLease])

        // Should NOT contain unescaped script tag
        expect(html).not.toContain('<script>alert("XSS")</script>')
        // Should contain escaped version
        expect(html).toContain("&lt;script&gt;")
        // Should NOT have a link (unknown template)
        expect(html).not.toContain('href="/catalogue/aws/')
      })

      it("should render descriptive link text using template name (AC-4)", () => {
        const html = renderSessionsTable([mockLeaseWithKnownTemplate])

        // Link text should be the template name, not "click here" or similar
        expect(html).toContain("<strong>FOI Redaction</strong>")
        expect(html).not.toContain("click here")
        expect(html).not.toContain("Learn more")
      })

      it("should render all 8 known templates as links", () => {
        const allTemplates: Lease[] = Object.keys(CATALOGUE_SLUGS).map((templateName, index) => ({
          leaseId: `lease-${index}`,
          awsAccountId: `${100000000000 + index}`,
          leaseTemplateId: `template-${index}`,
          leaseTemplateName: templateName,
          status: "Active" as const,
          createdAt: "2025-01-01T00:00:00Z",
          expiresAt: "2025-01-02T00:00:00Z",
          maxSpend: 50,
          currentSpend: 0,
        }))

        const html = renderSessionsTable(allTemplates)

        // All 8 templates should have catalogue links
        Object.entries(CATALOGUE_SLUGS).forEach(([_name, slug]) => {
          expect(html).toContain(`href="/catalogue/aws/${slug}/"`)
        })
      })
    })
  })
})
