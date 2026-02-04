/**
 * Unit tests for Slack notification billing fields
 *
 * Tests cover:
 * - totalCost formatting in Slack notifications
 * - csvUrl as clickable link in Slack notifications
 */

import { buildSlackMessage } from "./slack-message"
import type { EventBridgeEvent } from "./types"

describe("Slack Notification Billing Fields", () => {
  // Helper to create a valid test event
  function createTestEvent(overrides: Partial<EventBridgeEvent> = {}): EventBridgeEvent {
    return {
      version: "0",
      id: "test-event-id-123",
      "detail-type": "LeaseCostsGenerated",
      source: "isb-costs",
      account: "111122223333",
      time: "2025-11-27T10:00:00Z",
      region: "eu-west-2",
      resources: [],
      detail: {
        leaseId: "lease-123",
        userEmail: "user@example.gov.uk",
      },
      ...overrides,
    }
  }

  test("includes totalCost formatted as currency in Slack notification", () => {
    const event = createTestEvent({
      detail: {
        leaseId: "lease-123",
        userEmail: "user@example.gov.uk",
        totalCost: 123.45,
      },
    })

    const { descriptionParts } = buildSlackMessage(event, {}, "test-event-id")

    expect(descriptionParts).toContain("*Total Cost:* $123.45")
  })

  test("includes csvUrl as clickable link in Slack notification", () => {
    const event = createTestEvent({
      detail: {
        leaseId: "lease-123",
        userEmail: "user@example.gov.uk",
        csvUrl: "https://s3.amazonaws.com/bucket/costs.csv",
      },
    })

    const { descriptionParts } = buildSlackMessage(event, {}, "test-event-id")

    expect(descriptionParts).toContain("*CSV Download:* <https://s3.amazonaws.com/bucket/costs.csv|download csv>")
  })

  test("includes both totalCost and csvUrl when present", () => {
    const event = createTestEvent({
      detail: {
        leaseId: "lease-123",
        userEmail: "user@example.gov.uk",
        totalCost: 99.99,
        csvUrl: "https://example.com/report.csv",
      },
    })

    const { descriptionParts } = buildSlackMessage(event, {}, "test-event-id")

    expect(descriptionParts).toContain("*Total Cost:* $99.99")
    expect(descriptionParts).toContain("*CSV Download:* <https://example.com/report.csv|download csv>")
  })

  test("omits totalCost when not a number", () => {
    const event = createTestEvent({
      detail: {
        leaseId: "lease-123",
        userEmail: "user@example.gov.uk",
        totalCost: "not-a-number",
      },
    })

    const { descriptionParts } = buildSlackMessage(event, {}, "test-event-id")

    expect(descriptionParts.join("\n")).not.toContain("Total Cost")
  })

  test("omits csvUrl when not a string", () => {
    const event = createTestEvent({
      detail: {
        leaseId: "lease-123",
        userEmail: "user@example.gov.uk",
        csvUrl: 12345,
      },
    })

    const { descriptionParts } = buildSlackMessage(event, {}, "test-event-id")

    expect(descriptionParts.join("\n")).not.toContain("CSV Download")
  })

  test("handles zero totalCost correctly", () => {
    const event = createTestEvent({
      detail: {
        leaseId: "lease-123",
        userEmail: "user@example.gov.uk",
        totalCost: 0,
      },
    })

    const { descriptionParts } = buildSlackMessage(event, {}, "test-event-id")

    expect(descriptionParts).toContain("*Total Cost:* $0.00")
  })

  test("builds correct chatbot message structure", () => {
    const event = createTestEvent({
      detail: {
        leaseId: "lease-123",
        userEmail: "user@example.gov.uk",
        totalCost: 50.0,
        csvUrl: "https://example.com/costs.csv",
      },
    })

    const { chatbotMessage } = buildSlackMessage(event, {}, "test-event-id")

    expect(chatbotMessage).toMatchObject({
      version: "1.0",
      source: "custom",
      content: {
        textType: "client-markdown",
        title: "LeaseCostsGenerated",
      },
      metadata: {
        eventType: "LeaseCostsGenerated",
        eventId: "test-event-id",
      },
    })

    const description = (chatbotMessage as { content: { description: string } }).content.description
    expect(description).toContain("*Total Cost:* $50.00")
    expect(description).toContain("*CSV Download:* <https://example.com/costs.csv|download csv>")
  })
})
