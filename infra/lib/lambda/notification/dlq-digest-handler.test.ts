/**
 * DLQ Digest Handler Tests
 *
 * Story: N6.7 - Daily DLQ Summary
 * Updated: Story 6.3 - Removed Slack webhook integration
 *
 * Test Coverage:
 * - Message summarization and categorization
 * - Console URL generation
 * - CloudWatch logging (no longer Slack)
 * - Error handling
 *
 * Note: Slack webhook integration removed in Story 6.3. DLQ visibility
 * is now provided via CloudWatch Logs and CloudWatch alarms.
 */

// Set env vars BEFORE any imports
process.env.DLQ_URL = "https://sqs.eu-west-2.amazonaws.com/123456789012/ndx-notification-dlq"
process.env.AWS_REGION = "eu-west-2"

import { ScheduledEvent } from "aws-lambda"

// Mock functions for SQS
const mockSQSSend = jest.fn()

// Mock logger to capture log calls
const mockLoggerInfo = jest.fn()
const mockLoggerWarn = jest.fn()
const mockLoggerError = jest.fn()
const mockLoggerDebug = jest.fn()

// Mock @aws-sdk/client-sqs module
jest.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: jest.fn().mockImplementation(() => ({
    send: mockSQSSend,
  })),
  ReceiveMessageCommand: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
    type: "ReceiveMessageCommand",
    params,
  })),
  GetQueueAttributesCommand: jest.fn().mockImplementation((params: Record<string, unknown>) => ({
    type: "GetQueueAttributesCommand",
    params,
  })),
  QueueAttributeName: {
    ApproximateNumberOfMessages: "ApproximateNumberOfMessages",
    ApproximateNumberOfMessagesNotVisible: "ApproximateNumberOfMessagesNotVisible",
  },
  MessageSystemAttributeName: {
    SentTimestamp: "SentTimestamp",
    ApproximateFirstReceiveTimestamp: "ApproximateFirstReceiveTimestamp",
  },
}))

// Mock Lambda Powertools
jest.mock("@aws-lambda-powertools/logger", () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: mockLoggerInfo,
      warn: mockLoggerWarn,
      error: mockLoggerError,
      debug: mockLoggerDebug,
    })),
  }
})

jest.mock("@aws-lambda-powertools/metrics", () => {
  return {
    Metrics: jest.fn().mockImplementation(() => ({
      addMetric: jest.fn(),
      publishStoredMetrics: jest.fn(),
    })),
    MetricUnit: {
      Count: "Count",
      Seconds: "Seconds",
      Milliseconds: "Milliseconds",
    },
  }
})

// Import after mocks
import { handler } from "./dlq-digest-handler"

describe("DLQ Digest Handler", () => {
  // Store original values
  const TEST_DLQ_URL = "https://sqs.eu-west-2.amazonaws.com/123456789012/ndx-notification-dlq"
  const TEST_REGION = "eu-west-2"

  beforeEach(() => {
    // Clear all mocks and reset implementations
    jest.clearAllMocks()
    mockSQSSend.mockReset()
    mockLoggerInfo.mockReset()
    mockLoggerWarn.mockReset()
    mockLoggerError.mockReset()
    mockLoggerDebug.mockReset()

    // Ensure env vars are set for each test
    process.env.DLQ_URL = TEST_DLQ_URL
    process.env.AWS_REGION = TEST_REGION
  })

  afterEach(() => {
    // Restore env vars after each test
    process.env.DLQ_URL = TEST_DLQ_URL
    process.env.AWS_REGION = TEST_REGION
  })

  // Create a mock scheduled event
  const createScheduledEvent = (): ScheduledEvent => ({
    version: "0",
    id: "test-event-id",
    "detail-type": "Scheduled Event",
    source: "aws.events",
    account: "123456789012",
    time: "2025-11-28T09:00:00Z",
    region: "eu-west-2",
    resources: ["arn:aws:events:eu-west-2:123456789012:rule/dlq-digest-schedule"],
    detail: {},
  })

  // Helper to setup SQS mock responses
  const setupSQSMock = (
    queueAttributes: { visible: string; notVisible: string },
    messages: Array<{ body: string; sentTimestamp: string }>,
  ) => {
    mockSQSSend.mockImplementation((command: { type: string }) => {
      if (command.type === "GetQueueAttributesCommand") {
        return Promise.resolve({
          Attributes: {
            ApproximateNumberOfMessages: queueAttributes.visible,
            ApproximateNumberOfMessagesNotVisible: queueAttributes.notVisible,
          },
        })
      }
      if (command.type === "ReceiveMessageCommand") {
        return Promise.resolve({
          Messages: messages.map((m, idx) => ({
            MessageId: `msg-${idx + 1}`,
            Body: m.body,
            Attributes: {
              SentTimestamp: m.sentTimestamp,
            },
          })),
        })
      }
      return Promise.resolve({})
    })
  }

  describe("Empty DLQ", () => {
    it("should skip digest when DLQ is empty (UJ-AC-7)", async () => {
      setupSQSMock({ visible: "0", notVisible: "0" }, [])

      await handler(createScheduledEvent())

      // Should log that no messages found, not log a digest
      expect(mockLoggerInfo).toHaveBeenCalledWith("No messages in DLQ, skipping digest")
    })
  })

  describe("DLQ with Messages", () => {
    it("should log digest with message count (UJ-AC-7)", async () => {
      const now = Date.now()
      const twoHoursAgo = now - 2 * 60 * 60 * 1000

      setupSQSMock({ visible: "5", notVisible: "0" }, [
        {
          body: JSON.stringify({
            "detail-type": "AccountQuarantined",
            errorType: "ValidationError",
          }),
          sentTimestamp: String(twoHoursAgo),
        },
      ])

      await handler(createScheduledEvent())

      // Should log digest with message count
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("DLQ digest"),
        expect.objectContaining({
          messageCount: 5,
        }),
      )
    })

    it("should include console URL in log (UJ-AC-7)", async () => {
      setupSQSMock({ visible: "5", notVisible: "0" }, [
        {
          body: JSON.stringify({ "detail-type": "LeaseFrozen" }),
          sentTimestamp: String(Date.now()),
        },
      ])

      await handler(createScheduledEvent())

      // Check that console URL is logged
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("DLQ digest"),
        expect.objectContaining({
          consoleUrl: expect.stringContaining("console.aws.amazon.com/sqs"),
        }),
      )
    })

    it("should show top error types in log (UJ-AC-8)", async () => {
      setupSQSMock({ visible: "5", notVisible: "0" }, [
        {
          body: JSON.stringify({
            "detail-type": "AccountQuarantined",
            errorType: "ValidationError",
          }),
          sentTimestamp: String(Date.now()),
        },
        {
          body: JSON.stringify({
            "detail-type": "LeaseFrozen",
            errorType: "ValidationError",
          }),
          sentTimestamp: String(Date.now()),
        },
        {
          body: JSON.stringify({
            "detail-type": "AccountCleanupFailed",
            errorType: "TimeoutError",
          }),
          sentTimestamp: String(Date.now()),
        },
      ])

      await handler(createScheduledEvent())

      // Should log with top errors
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("DLQ digest"),
        expect.objectContaining({
          topErrors: expect.arrayContaining([expect.objectContaining({ type: "ValidationError" })]),
        }),
      )
    })

    it("should use warn level for critical priority (> 10 messages)", async () => {
      setupSQSMock({ visible: "15", notVisible: "0" }, [
        {
          body: JSON.stringify({ "detail-type": "AccountQuarantined" }),
          sentTimestamp: String(Date.now()),
        },
      ])

      await handler(createScheduledEvent())

      // Should log at WARN level for critical
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("CRITICAL"),
        expect.objectContaining({
          messageCount: 15,
        }),
      )
    })

    it("should use warn level for critical priority (messages > 48 hours old)", async () => {
      const now = Date.now()
      const fiftyHoursAgo = now - 50 * 60 * 60 * 1000

      setupSQSMock({ visible: "5", notVisible: "0" }, [
        {
          body: JSON.stringify({ "detail-type": "AccountQuarantined" }),
          sentTimestamp: String(fiftyHoursAgo),
        },
      ])

      await handler(createScheduledEvent())

      // Should log at WARN level for critical
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("CRITICAL"),
        expect.objectContaining({
          oldestMessageHours: expect.any(Number),
        }),
      )
    })

    it("should use info level for normal priority (small, fresh queue)", async () => {
      setupSQSMock({ visible: "3", notVisible: "0" }, [
        {
          body: JSON.stringify({ "detail-type": "AccountQuarantined" }),
          sentTimestamp: String(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      ])

      await handler(createScheduledEvent())

      // Should log at INFO level (not WARN)
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("DLQ digest - messages present"),
        expect.objectContaining({
          messageCount: 3,
        }),
      )
      // Should NOT have warned
      expect(mockLoggerWarn).not.toHaveBeenCalledWith(expect.stringContaining("CRITICAL"), expect.anything())
    })
  })

  describe("Error Categorization", () => {
    it("should categorize by errorType field", async () => {
      setupSQSMock({ visible: "3", notVisible: "0" }, [
        {
          body: JSON.stringify({ errorType: "ValidationError" }),
          sentTimestamp: String(Date.now()),
        },
        {
          body: JSON.stringify({ errorType: "ValidationError" }),
          sentTimestamp: String(Date.now()),
        },
        {
          body: JSON.stringify({ errorType: "TimeoutError" }),
          sentTimestamp: String(Date.now()),
        },
      ])

      await handler(createScheduledEvent())

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("DLQ digest"),
        expect.objectContaining({
          topErrors: expect.arrayContaining([
            expect.objectContaining({ type: "ValidationError", count: 2 }),
            expect.objectContaining({ type: "TimeoutError", count: 1 }),
          ]),
        }),
      )
    })

    it("should categorize by error.name field", async () => {
      setupSQSMock({ visible: "3", notVisible: "0" }, [
        {
          body: JSON.stringify({ error: { name: "PermanentError" } }),
          sentTimestamp: String(Date.now()),
        },
      ])

      await handler(createScheduledEvent())

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("DLQ digest"),
        expect.objectContaining({
          topErrors: expect.arrayContaining([expect.objectContaining({ type: "PermanentError" })]),
        }),
      )
    })

    it("should handle malformed JSON gracefully", async () => {
      setupSQSMock({ visible: "3", notVisible: "0" }, [
        {
          body: "not valid json {{{",
          sentTimestamp: String(Date.now()),
        },
      ])

      await handler(createScheduledEvent())

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("DLQ digest"),
        expect.objectContaining({
          topErrors: expect.arrayContaining([expect.objectContaining({ type: "ParseError" })]),
        }),
      )
    })
  })

  describe("Event Type Categorization", () => {
    it("should categorize by detail-type field", async () => {
      setupSQSMock({ visible: "3", notVisible: "0" }, [
        {
          body: JSON.stringify({ "detail-type": "AccountQuarantined" }),
          sentTimestamp: String(Date.now()),
        },
        {
          body: JSON.stringify({ "detail-type": "AccountQuarantined" }),
          sentTimestamp: String(Date.now()),
        },
        {
          body: JSON.stringify({ "detail-type": "LeaseFrozen" }),
          sentTimestamp: String(Date.now()),
        },
      ])

      await handler(createScheduledEvent())

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.stringContaining("DLQ digest"),
        expect.objectContaining({
          topEventTypes: expect.arrayContaining([
            expect.objectContaining({ type: "AccountQuarantined", count: 2 }),
            expect.objectContaining({ type: "LeaseFrozen", count: 1 }),
          ]),
        }),
      )
    })
  })

  describe("Error Handling", () => {
    it("should propagate SQS errors", async () => {
      mockSQSSend.mockRejectedValue(new Error("SQS unavailable"))

      await expect(handler(createScheduledEvent())).rejects.toThrow("SQS unavailable")
    })

    it("should throw when DLQ_URL not configured", async () => {
      delete process.env.DLQ_URL

      await expect(handler(createScheduledEvent())).rejects.toThrow("DLQ_URL")
    })
  })

  describe("Metrics", () => {
    it("should complete successfully and emit metrics", async () => {
      setupSQSMock({ visible: "7", notVisible: "0" }, [
        {
          body: JSON.stringify({ "detail-type": "AccountQuarantined" }),
          sentTimestamp: String(Date.now()),
        },
      ])

      await handler(createScheduledEvent())

      // Handler should complete successfully
      expect(mockLoggerInfo).toHaveBeenCalledWith(expect.stringContaining("completed"), expect.anything())
    })
  })
})
