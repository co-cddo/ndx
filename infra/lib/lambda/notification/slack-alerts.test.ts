/**
 * Slack Alerts Processor Tests
 *
 * Tests for the Slack alert processing module covering:
 * - n6-3: Account Quarantine Alert (ACs 3.1-3.7)
 * - n6-4: Account Frozen Alert (ACs 4.1-4.7)
 * - n6-5: Account Cleanup Failure Alert (ACs 5.1-5.6)
 * - n6-6: Account Drift Detection Alert (ACs 6.1-6.6)
 */

import { processSlackAlert, isSlackAlertType } from "./slack-alerts"
import { SLACK_TEMPLATES, getSlackTemplate } from "./slack-templates"
import { SlackSender } from "./slack-sender"
import type { ValidatedEvent } from "./validation"

// =============================================================================
// Mocks
// =============================================================================

// Mock SlackSender
jest.mock("./slack-sender", () => ({
  SlackSender: {
    getInstance: jest.fn(),
    resetInstance: jest.fn(),
  },
}))

// Mock secrets
jest.mock("./secrets", () => ({
  getSecrets: jest.fn().mockResolvedValue({
    slackWebhookUrl: "https://hooks.slack.com/services/TEST/WEBHOOK",
    notifyApiKey: "test-api-key",
  }),
}))

// Mock Logger and Metrics
jest.mock("@aws-lambda-powertools/logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    appendKeys: jest.fn(),
  })),
}))

jest.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: jest.fn().mockImplementation(() => ({
    addMetric: jest.fn(),
    addDimension: jest.fn(),
    publishStoredMetrics: jest.fn(),
  })),
  MetricUnit: {
    Count: "Count",
    Milliseconds: "Milliseconds",
  },
}))

// =============================================================================
// Test Fixtures
// =============================================================================

const mockSendFn = jest.fn().mockResolvedValue(undefined)

function createMockSlackSender() {
  return {
    send: mockSendFn,
  }
}

function createAccountQuarantinedEvent(): ValidatedEvent<{
  accountId: string
  reason: string
  quarantinedAt: string
}> {
  return {
    eventType: "AccountQuarantined",
    eventId: "evt-quarantine-123",
    source: "innovation-sandbox",
    timestamp: "2025-11-28T10:00:00Z",
    detail: {
      accountId: "123456789012",
      reason: "Policy violation: S3 bucket public ACL detected",
      quarantinedAt: "2025-11-28T10:00:00Z",
    },
  }
}

function createLeaseFrozenEvent(
  reasonType: "Expired" | "BudgetExceeded" | "ManuallyFrozen" = "BudgetExceeded",
): ValidatedEvent<{
  leaseId: { userEmail: string; uuid: string }
  accountId?: string
  reason: {
    type: "Expired" | "BudgetExceeded" | "ManuallyFrozen"
    triggeredDurationThreshold?: number
    triggeredBudgetThreshold?: number
    currentSpend?: number
    budget?: number
    comment?: string
  }
  frozenAt: string
}> {
  const reasonDetails: Record<string, unknown> = { type: reasonType }

  if (reasonType === "BudgetExceeded") {
    reasonDetails.triggeredBudgetThreshold = 90
    reasonDetails.currentSpend = 475.5
    reasonDetails.budget = 500.0
  } else if (reasonType === "Expired") {
    reasonDetails.triggeredDurationThreshold = 24
  } else if (reasonType === "ManuallyFrozen") {
    reasonDetails.comment = "Frozen by admin for review"
  }

  return {
    eventType: "LeaseFrozen",
    eventId: "evt-frozen-456",
    source: "innovation-sandbox",
    timestamp: "2025-11-28T11:00:00Z",
    detail: {
      leaseId: { userEmail: "user@example.gov.uk", uuid: "lease-uuid-123" },
      accountId: "234567890123",
      reason: reasonDetails as {
        type: "Expired" | "BudgetExceeded" | "ManuallyFrozen"
        triggeredDurationThreshold?: number
        triggeredBudgetThreshold?: number
        currentSpend?: number
        budget?: number
        comment?: string
      },
      frozenAt: "2025-11-28T11:00:00Z",
    },
  }
}

function createAccountCleanupFailedEvent(): ValidatedEvent<{
  accountId: string
  cleanupExecutionContext?: {
    executionArn: string
    startTime: string
  }
  errorMessage?: string
}> {
  return {
    eventType: "AccountCleanupFailed",
    eventId: "evt-cleanup-789",
    source: "innovation-sandbox",
    timestamp: "2025-11-28T12:00:00Z",
    detail: {
      accountId: "345678901234",
      cleanupExecutionContext: {
        executionArn: "arn:aws:states:eu-west-2:123456789012:execution:cleanup-sm:exec-123",
        startTime: "2025-11-28T11:30:00Z",
      },
      errorMessage: "Failed to delete VPC: dependency violation",
    },
  }
}

function createAccountDriftDetectedEvent(): ValidatedEvent<{
  accountId: string
  expectedOU: string
  actualOU: string
}> {
  return {
    eventType: "AccountDriftDetected",
    eventId: "evt-drift-012",
    source: "innovation-sandbox",
    timestamp: "2025-11-28T13:00:00Z",
    detail: {
      accountId: "456789012345",
      expectedOU: "Active",
      actualOU: "Quarantine",
    },
  }
}

// =============================================================================
// Test Setup
// =============================================================================

describe("Slack Alerts Processor", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(SlackSender.getInstance as jest.Mock).mockResolvedValue(createMockSlackSender())
  })

  afterEach(() => {
    // Restore all mocks to prevent test pollution between runs
    jest.restoreAllMocks()
  })

  // ===========================================================================
  // Template Configuration Tests
  // ===========================================================================

  describe("Template Configuration", () => {
    it("should have templates for all 4 alert types", () => {
      expect(SLACK_TEMPLATES.AccountQuarantined).toBeDefined()
      expect(SLACK_TEMPLATES.LeaseFrozen).toBeDefined()
      expect(SLACK_TEMPLATES.AccountCleanupFailed).toBeDefined()
      expect(SLACK_TEMPLATES.AccountDriftDetected).toBeDefined()
    })

    it("should have action links for each template (AC-2.4, n6-8)", () => {
      Object.values(SLACK_TEMPLATES).forEach((template) => {
        expect(template.actionLinks).toBeDefined()
        // Some templates have 1 action link, ops templates have 2+
        expect(template.actionLinks.length).toBeGreaterThanOrEqual(1)
      })
    })

    it("should set critical priority for critical alerts", () => {
      expect(SLACK_TEMPLATES.AccountQuarantined.priority).toBe("critical")
      expect(SLACK_TEMPLATES.AccountCleanupFailed.priority).toBe("critical")
      expect(SLACK_TEMPLATES.AccountDriftDetected.priority).toBe("critical")
    })

    it("should set normal priority for warning alerts", () => {
      expect(SLACK_TEMPLATES.LeaseFrozen.priority).toBe("normal")
    })

    it("should include mention for critical alerts (AC-3.6)", () => {
      expect(SLACK_TEMPLATES.AccountQuarantined.includeMention).toBe(true)
      expect(SLACK_TEMPLATES.AccountCleanupFailed.includeMention).toBe(true)
      expect(SLACK_TEMPLATES.AccountDriftDetected.includeMention).toBe(true)
    })

    it("should include escalation guidance (AC-3.5)", () => {
      Object.values(SLACK_TEMPLATES).forEach((template) => {
        expect(template.escalationGuidance).toBeTruthy()
        expect(template.escalationGuidance.length).toBeGreaterThan(10)
      })
    })
  })

  // ===========================================================================
  // isSlackAlertType Tests
  // ===========================================================================

  describe("isSlackAlertType", () => {
    it("should return true for valid Slack alert types", () => {
      expect(isSlackAlertType("AccountQuarantined")).toBe(true)
      expect(isSlackAlertType("LeaseFrozen")).toBe(true)
      expect(isSlackAlertType("AccountCleanupFailed")).toBe(true)
      expect(isSlackAlertType("AccountDriftDetected")).toBe(true)
    })

    // Decision: All lease lifecycle events go to Slack for ops visibility
    // See: docs/sprint-artifacts/code-review-fix-plan.md - Decision 2
    it("should return true for all lease lifecycle events (ops visibility)", () => {
      expect(isSlackAlertType("LeaseRequested")).toBe(true)
      expect(isSlackAlertType("LeaseApproved")).toBe(true)
      expect(isSlackAlertType("LeaseDenied")).toBe(true)
      expect(isSlackAlertType("LeaseTerminated")).toBe(true)
      expect(isSlackAlertType("LeaseFrozen")).toBe(true)
    })

    it("should return false for unknown types", () => {
      expect(isSlackAlertType("UnknownEvent")).toBe(false)
      expect(isSlackAlertType("")).toBe(false)
    })
  })

  // ===========================================================================
  // Account Quarantine Alert Tests (n6-3)
  // ===========================================================================

  describe("Account Quarantine Alert (n6-3)", () => {
    it("should send alert with correct alert type (AC-3.1)", async () => {
      const event = createAccountQuarantinedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: "AccountQuarantined",
        }),
      )
    })

    it("should include reason in details (AC-3.2)", async () => {
      const event = createAccountQuarantinedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            Reason: "Policy violation: S3 bucket public ACL detected",
          }),
        }),
      )
    })

    it("should include AWS account ID (AC-3.3)", async () => {
      const event = createAccountQuarantinedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: "123456789012",
        }),
      )
    })

    it("should include timestamp (AC-3.4)", async () => {
      const event = createAccountQuarantinedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            "Quarantined At": expect.stringContaining("2025-11-28"),
          }),
        }),
      )
    })

    it("should include escalation guidance (AC-3.5)", async () => {
      const event = createAccountQuarantinedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            Guidance: expect.stringContaining("@ndx-ops"),
          }),
        }),
      )
    })

    it("should have critical priority (AC-3.6)", async () => {
      const event = createAccountQuarantinedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "critical",
        }),
      )
    })

    it("should include action links with runbook (n6-8)", async () => {
      const event = createAccountQuarantinedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          actionLinks: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining("Runbook"),
            }),
          ]),
        }),
      )
    })

    it("should include event ID", async () => {
      const event = createAccountQuarantinedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: "evt-quarantine-123",
        }),
      )
    })

    it("should include template and templateId as N/A for account events", async () => {
      const event = createAccountQuarantinedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "N/A",
          templateId: "N/A",
        }),
      )
    })
  })

  // ===========================================================================
  // Account Frozen Alert Tests (n6-4)
  // ===========================================================================

  describe("Account Frozen Alert (n6-4)", () => {
    it("should send alert with correct alert type (AC-4.1)", async () => {
      const event = createLeaseFrozenEvent("BudgetExceeded")
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: "LeaseFrozen",
        }),
      )
    })

    it("should format BudgetExceeded reason correctly (AC-4.2, AC-4.4)", async () => {
      const event = createLeaseFrozenEvent("BudgetExceeded")
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            "Freeze Type": "BudgetExceeded",
            "Current Spend": "$475.50",
            "Budget Limit": "$500.00",
            "Threshold Triggered": "90%",
          }),
        }),
      )
    })

    it("should format Expired reason correctly (AC-4.5)", async () => {
      const event = createLeaseFrozenEvent("Expired")
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            "Freeze Type": "Expired",
            "Duration Threshold": "24 hours",
          }),
        }),
      )
    })

    it("should format ManuallyFrozen reason with comment (AC-4.6)", async () => {
      const event = createLeaseFrozenEvent("ManuallyFrozen")
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            "Freeze Type": "ManuallyFrozen",
            Comment: "Frozen by admin for review",
          }),
        }),
      )
    })

    // Decision: User email in Slack alerts is intentional for ops support
    // See: docs/sprint-artifacts/code-review-fix-plan.md - Decision 1
    it("should include account ID and user email for ops context (AC-4.3)", async () => {
      const event = createLeaseFrozenEvent("BudgetExceeded")
      await processSlackAlert(event)

      const callArgs = mockSendFn.mock.calls[0][0]
      expect(callArgs.accountId).toBe("234567890123")
      // User email is intentionally included for ops support context
      const detailsStr = JSON.stringify(callArgs.details)
      expect(detailsStr).toContain("User")
    })

    it("should have normal priority (warning color)", async () => {
      const event = createLeaseFrozenEvent("BudgetExceeded")
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "normal",
        }),
      )
    })

    it("should include template and templateId as N/A", async () => {
      const event = createLeaseFrozenEvent("BudgetExceeded")
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "N/A",
          templateId: "N/A",
        }),
      )
    })
  })

  // ===========================================================================
  // Account Cleanup Failure Alert Tests (n6-5)
  // ===========================================================================

  describe("Account Cleanup Failure Alert (n6-5)", () => {
    it("should send alert with correct alert type (AC-5.1)", async () => {
      const event = createAccountCleanupFailedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: "AccountCleanupFailed",
        }),
      )
    })

    it("should include account ID (AC-5.2)", async () => {
      const event = createAccountCleanupFailedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: "345678901234",
        }),
      )
    })

    it("should include Step Functions execution link (AC-5.3)", async () => {
      const event = createAccountCleanupFailedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          actionLinks: expect.arrayContaining([
            expect.objectContaining({
              label: "View Failed Execution",
              url: expect.stringContaining("states"),
            }),
          ]),
        }),
      )
    })

    it("should include error message (AC-5.4)", async () => {
      const event = createAccountCleanupFailedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            "Error Message": "Failed to delete VPC: dependency violation",
          }),
        }),
      )
    })

    it("should include cleanup start time (AC-5.5)", async () => {
      const event = createAccountCleanupFailedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            "Cleanup Started": expect.stringContaining("2025-11-28"),
          }),
        }),
      )
    })

    it("should have critical priority", async () => {
      const event = createAccountCleanupFailedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "critical",
        }),
      )
    })
  })

  // ===========================================================================
  // Account Drift Detection Alert Tests (n6-6)
  // ===========================================================================

  describe("Account Drift Detection Alert (n6-6)", () => {
    it("should send alert with correct alert type (AC-6.1)", async () => {
      const event = createAccountDriftDetectedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: "AccountDriftDetected",
        }),
      )
    })

    it("should include account ID (AC-6.2)", async () => {
      const event = createAccountDriftDetectedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: "456789012345",
        }),
      )
    })

    it("should have critical priority (AC-6.3)", async () => {
      const event = createAccountDriftDetectedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: "critical",
        }),
      )
    })

    it("should show expected vs actual OU (AC-6.4)", async () => {
      const event = createAccountDriftDetectedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            "Expected OU": "Active",
            "Actual OU": "Quarantine",
          }),
        }),
      )
    })

    it("should include remediation guidance (AC-6.5)", async () => {
      const event = createAccountDriftDetectedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            Guidance: expect.stringContaining("remediate"),
          }),
        }),
      )
    })

    it("should include drift runbook link (n6-8)", async () => {
      const event = createAccountDriftDetectedEvent()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          actionLinks: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining("Runbook"),
            }),
          ]),
        }),
      )
    })
  })

  // ===========================================================================
  // Lease Lifecycle Alert Template Fields Tests
  // ===========================================================================

  describe("Lease Lifecycle Alert Template Fields", () => {
    function createLeaseRequestedEventWithTemplate(): ValidatedEvent<{
      leaseId: { userEmail: string; uuid: string }
      principalEmail?: string
      accountId?: string
      requestedAt?: string
      budget?: number
      duration?: number
      leaseTemplateName?: string
      leaseTemplateId?: string
    }> {
      return {
        eventType: "LeaseRequested",
        eventId: "evt-lease-req-123",
        source: "innovation-sandbox",
        timestamp: "2025-12-03T10:00:00Z",
        detail: {
          leaseId: { userEmail: "user@example.gov.uk", uuid: "lease-123" },
          principalEmail: "user@example.gov.uk",
          accountId: "123456789012",
          requestedAt: "2025-12-03T10:00:00Z",
          budget: 500,
          duration: 720,
          leaseTemplateName: "user research 0.0.1",
          leaseTemplateId: "a3beced2-be4e-41a0-b6e2-735a73fffed7",
        },
      }
    }

    function createLeaseApprovedEventWithTemplate(): ValidatedEvent<{
      leaseId: { userEmail: string; uuid: string }
      principalEmail?: string
      accountId?: string
      approvedAt?: string
      budget?: number
      expiresAt?: string
      leaseTemplateName?: string
      leaseTemplateId?: string
    }> {
      return {
        eventType: "LeaseApproved",
        eventId: "evt-lease-app-123",
        source: "innovation-sandbox",
        timestamp: "2025-12-03T10:00:00Z",
        detail: {
          leaseId: { userEmail: "user@example.gov.uk", uuid: "lease-123" },
          principalEmail: "user@example.gov.uk",
          accountId: "123456789012",
          approvedAt: "2025-12-03T10:00:00Z",
          budget: 500,
          expiresAt: "2025-12-04T10:00:00Z",
          leaseTemplateName: "data science 2.0",
          leaseTemplateId: "b4cfded3-cf5f-52b1-c7f3-846b84gggg8",
        },
      }
    }

    function createLeaseDeniedEventWithTemplate(): ValidatedEvent<{
      leaseId: { userEmail: string; uuid: string }
      principalEmail?: string
      deniedAt?: string
      reason?: string
      leaseTemplateName?: string
      leaseTemplateId?: string
    }> {
      return {
        eventType: "LeaseDenied",
        eventId: "evt-lease-den-123",
        source: "innovation-sandbox",
        timestamp: "2025-12-03T10:00:00Z",
        detail: {
          leaseId: { userEmail: "user@example.gov.uk", uuid: "lease-123" },
          principalEmail: "user@example.gov.uk",
          deniedAt: "2025-12-03T10:00:00Z",
          reason: "Budget exceeds limit",
          leaseTemplateName: "ml training 1.5",
          leaseTemplateId: "c5defe4-dg6g-63c2-d8g4-957c95hhhh9",
        },
      }
    }

    function createLeaseTerminatedEventWithTemplate(): ValidatedEvent<{
      leaseId: { userEmail: string; uuid: string }
      principalEmail?: string
      accountId?: string
      terminatedAt?: string
      reason?: string
      leaseTemplateName?: string
      leaseTemplateId?: string
    }> {
      return {
        eventType: "LeaseTerminated",
        eventId: "evt-lease-term-123",
        source: "innovation-sandbox",
        timestamp: "2025-12-03T10:00:00Z",
        detail: {
          leaseId: { userEmail: "user@example.gov.uk", uuid: "lease-123" },
          principalEmail: "user@example.gov.uk",
          accountId: "123456789012",
          terminatedAt: "2025-12-03T10:00:00Z",
          reason: "User requested",
          leaseTemplateName: "standard sandbox",
          leaseTemplateId: "d6efgf5-eh7h-74d3-e9h5-068d06iiii0",
        },
      }
    }

    it("LeaseRequested should include template and templateId from event", async () => {
      const event = createLeaseRequestedEventWithTemplate()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "user research 0.0.1",
          templateId: "a3beced2-be4e-41a0-b6e2-735a73fffed7",
        }),
      )
    })

    it("LeaseApproved should include template and templateId from event", async () => {
      const event = createLeaseApprovedEventWithTemplate()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "data science 2.0",
          templateId: "b4cfded3-cf5f-52b1-c7f3-846b84gggg8",
        }),
      )
    })

    it("LeaseDenied should include template and templateId from event", async () => {
      const event = createLeaseDeniedEventWithTemplate()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "ml training 1.5",
          templateId: "c5defe4-dg6g-63c2-d8g4-957c95hhhh9",
        }),
      )
    })

    it("LeaseTerminated should include template and templateId from event", async () => {
      const event = createLeaseTerminatedEventWithTemplate()
      await processSlackAlert(event)

      expect(mockSendFn).toHaveBeenCalledWith(
        expect.objectContaining({
          template: "standard sandbox",
          templateId: "d6efgf5-eh7h-74d3-e9h5-068d06iiii0",
        }),
      )
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe("Error Handling", () => {
    it("should throw PermanentError for unknown alert type", async () => {
      const event = {
        eventType: "UnknownEventType",
        eventId: "evt-unknown",
        source: "innovation-sandbox",
        timestamp: "2025-11-28T10:00:00Z",
        detail: { accountId: "123456789012" },
      } as unknown as ValidatedEvent<{ accountId: string }>

      await expect(processSlackAlert(event)).rejects.toThrow("Unknown Slack alert type")
    })

    it("should propagate SlackSender errors", async () => {
      mockSendFn.mockRejectedValueOnce(new Error("Webhook failed"))

      const event = createAccountQuarantinedEvent()
      await expect(processSlackAlert(event)).rejects.toThrow("Webhook failed")
    })
  })

  // ===========================================================================
  // getSlackTemplate Tests
  // ===========================================================================

  describe("getSlackTemplate", () => {
    it("should return template for valid alert type", () => {
      const template = getSlackTemplate("AccountQuarantined")
      expect(template).toBeDefined()
      expect(template?.displayName).toBe("Account Quarantined")
    })

    it("should return undefined for invalid alert type", () => {
      const template = getSlackTemplate("InvalidType" as "AccountQuarantined")
      expect(template).toBeUndefined()
    })
  })
})
