/**
 * Sessions Table Component
 *
 * Story 7.3: Render sessions table with GOV.UK Design System
 * Story 7.4: Status badge display with color coding
 * Story 7.5: Expiry date formatting
 * Story 7.6: Budget display
 * Story 7.7: "Launch AWS Console" button
 * Story 5.2: CloudFormation console button
 * Story 7-1: Catalogue links for template names
 *
 * @module sessions-table
 */

import {
  Lease,
  LeaseStatus,
  isLeaseActive,
  getSsoUrl,
  getPortalUrl,
  getCfnConsoleUrl,
} from "../../api/sessions-service"
import { formatExpiry } from "../../utils/date-utils"
import { escapeHtml } from "../../utils/html-utils"

/**
 * Status badge color mapping per Story 7.4.
 * Uses GOV.UK Design System tag colors.
 */
const STATUS_COLORS: Record<LeaseStatus, string> = {
  PendingApproval: "govuk-tag--blue",
  ApprovalDenied: "govuk-tag--red",
  Active: "govuk-tag--green",
  Frozen: "govuk-tag--yellow",
  Expired: "govuk-tag--grey",
  BudgetExceeded: "govuk-tag--red",
  ManuallyTerminated: "govuk-tag--grey",
  AccountQuarantined: "govuk-tag--red",
  Ejected: "govuk-tag--red",
}

/**
 * User-friendly status labels for display.
 * Per GOV.UK Design System guidance, uses adjectives not verbs.
 */
const STATUS_LABELS: Record<LeaseStatus, string> = {
  PendingApproval: "Pending approval",
  ApprovalDenied: "Denied",
  Active: "Active",
  Frozen: "Frozen",
  Expired: "Completed",
  BudgetExceeded: "Budget exceeded",
  ManuallyTerminated: "Completed",
  AccountQuarantined: "Quarantined",
  Ejected: "Ejected",
}

/**
 * Story 7-1: Mapping from template display names to catalogue page slugs.
 *
 * Maps the `leaseTemplateName` from the API to the corresponding catalogue
 * page slug. Used to generate links to product documentation.
 *
 * Note: Template names come from ISB API's `originalLeaseTemplateName` field.
 * Slugs correspond to files in `src/catalogue/aws/`.
 *
 * @internal Exported for testing only
 */
export const CATALOGUE_SLUGS: Record<string, string> = {
  "Council Chatbot": "council-chatbot",
  "NDX:Try for AWS": "innovation-sandbox-empty",
  "FOI Redaction": "foi-redaction",
  "LocalGov Drupal": "localgov-drupal",
  "Planning AI": "planning-ai",
  "QuickSight Dashboard": "quicksight-dashboard",
  "Smart Car Park": "smart-car-park",
  "Text to Speech": "text-to-speech",
}

/**
 * Story 7-1: Get the catalogue page URL for a template name.
 *
 * Returns the full path to the catalogue page if the template has a known
 * mapping, or null if the template is not in the catalogue.
 *
 * @param templateName - The template display name from the lease
 * @returns Catalogue page URL (e.g., "/catalogue/aws/foi-redaction/") or null
 */
export function getCatalogueUrl(templateName: string): string | null {
  const slug = CATALOGUE_SLUGS[templateName]
  return slug ? `/catalogue/aws/${slug}/` : null
}

/**
 * Render the sessions table.
 *
 * @param leases - Array of leases to display
 * @returns HTML string for the table
 */
export function renderSessionsTable(leases: Lease[]): string {
  if (leases.length === 0) {
    return renderEmptyTable()
  }

  const rows = leases.map((lease, index) => renderSessionRow(lease, index)).join("")

  return `
    <table class="govuk-table sessions-table">
      <caption class="govuk-table__caption govuk-table__caption--m govuk-visually-hidden">
        Your sandbox sessions
      </caption>
      <thead class="govuk-table__head">
        <tr class="govuk-table__row">
          <th scope="col" class="govuk-table__header">Product</th>
          <th scope="col" class="govuk-table__header">AWS Account ID</th>
          <th scope="col" class="govuk-table__header">Status</th>
          <th scope="col" class="govuk-table__header">Expires</th>
          <th scope="col" class="govuk-table__header">Budget</th>
          <th scope="col" class="govuk-table__header">Actions</th>
        </tr>
      </thead>
      <tbody class="govuk-table__body">
        ${rows}
      </tbody>
    </table>
  `
}

/**
 * Render a single session row with optional comments row.
 *
 * @param lease - Lease data
 * @returns HTML string for the row(s)
 */
function renderSessionRow(lease: Lease, index: number): string {
  const statusClass = STATUS_COLORS[lease.status]
  const expiry = formatExpiry(lease.expiresAt)
  const budgetDisplay = `$${lease.maxSpend.toFixed(2)} budget`
  const actions = renderActions(lease)
  const commentsRow = renderCommentsRow(lease, index)
  // Story 7-1: Render template name as link to catalogue page if mapping exists
  const productCell = renderProductCell(lease.leaseTemplateName)

  return `
    <tr class="govuk-table__row">
      <td class="govuk-table__cell" data-label="Product">
        ${productCell}
      </td>
      <td class="govuk-table__cell" data-label="AWS Account ID">
        <code class="govuk-!-font-size-16">${escapeHtml(lease.awsAccountId)}</code>
      </td>
      <td class="govuk-table__cell" data-label="Status">
        <strong class="govuk-tag ${statusClass}">${STATUS_LABELS[lease.status] || lease.status}</strong>
      </td>
      <td class="govuk-table__cell" data-label="Expiry" aria-label="Session expires ${expiry}">
        ${expiry}
      </td>
      <td class="govuk-table__cell" data-label="Budget">
        ${budgetDisplay}
      </td>
      <td class="govuk-table__cell" data-label="Actions">
        ${actions}
      </td>
    </tr>
    ${commentsRow}
  `
}

/**
 * Story 7-1: Render the product cell with catalogue link or plain text.
 *
 * If the template has a known catalogue page, renders as a GOV.UK styled link.
 * Otherwise, renders as plain bold text (graceful fallback).
 *
 * @param templateName - Template display name
 * @returns HTML string for product cell content
 */
function renderProductCell(templateName: string): string {
  const catalogueUrl = getCatalogueUrl(templateName)
  const escapedName = escapeHtml(templateName)

  if (catalogueUrl) {
    // Render as link to catalogue page (AC-1, AC-2, AC-4, AC-7)
    // data-action attribute for analytics tracking consistency
    return `<a href="${catalogueUrl}" class="govuk-link" data-action="view-catalogue"><strong>${escapedName}</strong></a>`
  }

  // Fallback: render as plain text (AC-6)
  return `<strong>${escapedName}</strong>`
}

/**
 * Render action buttons for a lease.
 *
 * @param lease - Lease data
 * @returns HTML string for actions cell
 */
function renderActions(lease: Lease): string {
  if (!isLeaseActive(lease)) {
    return '<span class="govuk-body-s">No actions available</span>'
  }

  const ssoUrl = getSsoUrl(lease)
  const portalUrl = getPortalUrl(lease)
  // Story 5.2: CloudFormation console URL (uses us-west-2 as default region for NDX sandboxes)
  const cfnUrl = getCfnConsoleUrl(lease, "us-west-2")

  return `
    <div class="sessions-actions">
      <a
        href="${ssoUrl}"
        target="_blank"
        rel="noopener noreferrer"
        class="govuk-button govuk-button--secondary govuk-!-margin-bottom-1"
        data-module="govuk-button"
        data-action="launch-console"
        data-lease-id="${escapeHtml(lease.leaseId)}"
        data-lease-template="${escapeHtml(lease.leaseTemplateName)}"
        data-budget="${lease.maxSpend}"
        data-expires="${escapeHtml(lease.expiresAt || "")}"
      >
        Launch AWS Console
        <span class="govuk-visually-hidden">(opens in new tab)</span>
      </a>
      <a
        href="${portalUrl}"
        target="_blank"
        rel="noopener noreferrer"
        class="govuk-button govuk-button--secondary govuk-!-margin-bottom-1"
        data-module="govuk-button"
        data-action="get-credentials"
        data-lease-id="${escapeHtml(lease.leaseId)}"
        data-lease-template="${escapeHtml(lease.leaseTemplateName)}"
        data-budget="${lease.maxSpend}"
        data-expires="${escapeHtml(lease.expiresAt || "")}"
      >
        Get CLI Credentials
        <span class="govuk-visually-hidden">(opens in new tab)</span>
      </a>
      <a
        href="${cfnUrl}"
        target="_blank"
        rel="noopener noreferrer"
        class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0"
        data-module="govuk-button"
        data-action="launch-cloudformation"
        data-lease-id="${escapeHtml(lease.leaseId)}"
        data-lease-template="${escapeHtml(lease.leaseTemplateName)}"
        data-budget="${lease.maxSpend}"
        data-expires="${escapeHtml(lease.expiresAt || "")}"
      >
        Open CloudFormation
        <span class="govuk-visually-hidden">(opens in new tab)</span>
      </a>
    </div>
  `
}

/**
 * Render empty table state.
 *
 * @returns HTML string for empty state
 */
function renderEmptyTable(): string {
  return `
    <div class="govuk-inset-text">
      <p class="govuk-body">You don't have any sandbox sessions yet.</p>
      <p class="govuk-body">
        <a href="/catalogue/tags/try-before-you-buy" class="govuk-link">
          Browse products you can try
        </a>
        to get started.
      </p>
    </div>
  `
}

/**
 * Format comments with XSS escaping and newline handling.
 *
 * @param comments - Raw comments string
 * @returns Safe HTML string with newlines converted to <br>
 */
function formatComments(comments: string | undefined): string {
  if (!comments) return ""
  // Escape HTML first, then convert newlines to <br>
  return escapeHtml(comments).replace(/\n/g, "<br>")
}

/**
 * Render comments row for a lease.
 * Active leases show comments always visible.
 * Non-active leases show comments in collapsible details.
 *
 * @param lease - Lease data
 * @returns HTML string for comments row, or empty string if no comments
 */
function renderCommentsRow(lease: Lease, index: number): string {
  if (!lease.comments) return ""

  const formattedComments = formatComments(lease.comments)

  if (isLeaseActive(lease)) {
    // Always visible for active leases
    return `
      <tr class="govuk-table__row sessions-table__comments-row">
        <td colspan="6" class="govuk-table__cell govuk-body-s sessions-table__comments-cell">
          ${formattedComments}
        </td>
      </tr>
    `
  }

  // Collapsible for non-active leases (first row expanded by default)
  return `
    <tr class="govuk-table__row sessions-table__comments-row">
      <td colspan="6" class="govuk-table__cell sessions-table__comments-cell">
        <details class="govuk-details govuk-!-margin-bottom-0"${index === 0 ? " open" : ""}>
          <summary class="govuk-details__summary">
            <span class="govuk-details__summary-text">See details</span>
          </summary>
          <div class="govuk-details__text govuk-body-s">
            ${formattedComments}
          </div>
        </details>
      </td>
    </tr>
  `
}

/**
 * Render loading state.
 *
 * @returns HTML string for loading state
 */
export function renderLoadingState(): string {
  return `
    <div class="sessions-loading" aria-live="polite">
      <p class="govuk-body">Loading your sessions...</p>
    </div>
  `
}

/**
 * Render error state.
 *
 * @param message - Error message
 * @returns HTML string for error state
 */
export function renderErrorState(message: string): string {
  return `
    <div class="govuk-error-summary" role="alert" aria-labelledby="error-summary-title">
      <h2 class="govuk-error-summary__title" id="error-summary-title">
        There was a problem
      </h2>
      <div class="govuk-error-summary__body">
        <p class="govuk-body">${escapeHtml(message)}</p>
        <button
          type="button"
          class="govuk-button govuk-button--secondary"
          data-action="retry-fetch"
        >
          Try again
        </button>
      </div>
    </div>
  `
}
