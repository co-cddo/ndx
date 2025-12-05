/**
 * Sessions Table Component
 *
 * Story 7.3: Render sessions table with GOV.UK Design System
 * Story 7.4: Status badge display with color coding
 * Story 7.5: Expiry date formatting
 * Story 7.6: Budget display
 * Story 7.7: "Launch AWS Console" button
 * Story 7.8: Remaining duration display
 *
 * @module sessions-table
 */

import { Lease, LeaseStatus, isLeaseActive, getSsoUrl } from "../../api/sessions-service"
import { formatExpiry, formatRemainingDuration } from "../../utils/date-utils"
import { formatBudget, calculateBudgetPercentage } from "../../utils/currency-utils"

/**
 * Status badge color mapping per Story 7.4.
 */
const STATUS_COLORS: Record<LeaseStatus, string> = {
  Pending: "govuk-tag--blue",
  Active: "govuk-tag--green",
  Expired: "govuk-tag--grey",
  Terminated: "govuk-tag--red",
  ManuallyTerminated: "govuk-tag--red",
  Failed: "govuk-tag--red",
}

/**
 * User-friendly status labels for display.
 */
const STATUS_LABELS: Record<LeaseStatus, string> = {
  Pending: "Pending",
  Active: "Active",
  Expired: "Expired",
  Terminated: "Terminated",
  ManuallyTerminated: "Ended",
  Failed: "Failed",
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

  const rows = leases.map(renderSessionRow).join("")

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
 * Render a single session row.
 *
 * @param lease - Lease data
 * @returns HTML string for the row
 */
function renderSessionRow(lease: Lease): string {
  const statusClass = STATUS_COLORS[lease.status]
  const expiry = formatExpiry(lease.expiresAt)
  const budget = formatBudget(lease.currentSpend, lease.maxSpend)
  const budgetPercentage = calculateBudgetPercentage(lease.currentSpend, lease.maxSpend)
  const budgetAriaLabel = `Budget: $${lease.currentSpend.toFixed(4)} used of $${lease.maxSpend.toFixed(2)} maximum`
  const remaining = isLeaseActive(lease) ? formatRemainingDuration(lease.expiresAt) : null
  const actions = renderActions(lease)

  return `
    <tr class="govuk-table__row">
      <td class="govuk-table__cell" data-label="Product">
        <strong>${escapeHtml(lease.leaseTemplateName)}</strong>
        ${remaining ? `<br><span class="govuk-body-s govuk-!-margin-top-1">${remaining}</span>` : ""}
      </td>
      <td class="govuk-table__cell" data-label="AWS Account ID">
        <code class="govuk-!-font-size-16">${lease.awsAccountId}</code>
      </td>
      <td class="govuk-table__cell" data-label="Status">
        <strong class="govuk-tag ${statusClass}">${STATUS_LABELS[lease.status] || lease.status}</strong>
      </td>
      <td class="govuk-table__cell" data-label="Expiry" aria-label="Session expires ${expiry}">
        ${expiry}
      </td>
      <td class="govuk-table__cell" data-label="Budget">
        <span aria-label="${budgetAriaLabel}">
          ${budget}
        </span>
        <br>
        <progress
          value="${budgetPercentage}"
          max="100"
          aria-label="Budget usage ${budgetPercentage}%"
          class="sessions-budget-progress"
        ></progress>
        <span class="govuk-body-s">${budgetPercentage}%</span>
      </td>
      <td class="govuk-table__cell" data-label="Actions">
        ${actions}
      </td>
    </tr>
  `
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

  return `
    <a
      href="${ssoUrl}"
      target="_blank"
      rel="noopener noreferrer"
      class="govuk-button govuk-button--secondary govuk-!-margin-bottom-0"
      data-module="govuk-button"
    >
      Launch AWS Console
      <span class="govuk-visually-hidden">(opens in new tab)</span>
    </a>
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
 * Escape HTML special characters to prevent XSS.
 *
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeHtml(str: string): string {
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
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
