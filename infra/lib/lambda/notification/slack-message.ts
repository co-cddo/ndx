/**
 * Slack message building utilities for AWS Chatbot notifications
 */

import type { EventBridgeEvent } from "./types"
import { formatCurrency } from "./templates"

/**
 * Build the Chatbot message structure for Slack notifications.
 * This is a pure function that can be easily unit tested.
 */
export function buildSlackMessage(
  event: EventBridgeEvent,
  enrichedData: Record<string, string>,
  eventId: string,
): { chatbotMessage: Record<string, unknown>; descriptionParts: string[] } {
  const eventType = event["detail-type"]
  const detail = event.detail as Record<string, unknown>

  // Extract user email from enriched data or event
  const userEmail =
    enrichedData.userEmail ||
    enrichedData.principalEmail ||
    (detail.userEmail as string) ||
    (detail.principalEmail as string) ||
    ""

  // Extract template name from enriched data or event (ISB uses various field names)
  const templateName =
    enrichedData.templateName ||
    enrichedData.leaseTemplateName ||
    enrichedData.originalLeaseTemplateName ||
    (detail.templateName as string) ||
    (detail.leaseTemplateName as string) ||
    (detail.originalLeaseTemplateName as string) ||
    ""

  // Extract lease ID
  const leaseId = (typeof detail.leaseId === "string" ? detail.leaseId : enrichedData.uuid) || ""

  // Extract account ID from enriched data or event
  const accountId =
    enrichedData.awsAccountId ||
    enrichedData.accountId ||
    (detail.accountId as string) ||
    (detail.awsAccountId as string) ||
    ""

  // Extract billing-specific fields for LeaseCostsGenerated events
  const totalCost = typeof detail.totalCost === "number" ? detail.totalCost : undefined
  const csvUrl = typeof detail.csvUrl === "string" ? detail.csvUrl : undefined

  // Build description lines (only include non-empty fields)
  const descriptionParts: string[] = []
  if (userEmail) descriptionParts.push(`*User:* ${userEmail}`)
  if (templateName) descriptionParts.push(`*Template:* ${templateName}`)
  if (leaseId) descriptionParts.push(`*Lease ID:* ${leaseId}`)
  if (accountId) descriptionParts.push(`*Account:* ${accountId}`)
  if (totalCost !== undefined) descriptionParts.push(`*Total Cost:* ${formatCurrency(totalCost)}`)
  if (csvUrl) descriptionParts.push(`*CSV Download:* <${csvUrl}|download csv>`)

  // AWS Chatbot custom notification format
  const chatbotMessage = {
    version: "1.0",
    source: "custom",
    content: {
      textType: "client-markdown",
      title: eventType,
      description: descriptionParts.join("\n"),
    },
    metadata: {
      eventType,
      eventId,
    },
  }

  return { chatbotMessage, descriptionParts }
}
