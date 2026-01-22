/**
 * Tests for ISB Lambda Client Module
 *
 * Story: 5.1 - Replace DynamoDB Reads with ISB API
 * Tests cover: AC-1, AC-4, AC-5, AC-6/NFR4
 *
 * @see _bmad-output/implementation-artifacts/5-1-replace-dynamodb-reads-with-isb-api.md
 */

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {
  fetchLeaseFromISB,
  fetchLeaseByKey,
  fetchAccountFromISB,
  fetchTemplateFromISB,
  constructLeaseId,
  parseLeaseId,
  ISBLeaseRecord,
  ISBAccountRecord,
  ISBTemplateRecord,
  JSendResponse,
} from "./isb-client"

// Create mock for Lambda client
const lambdaMock = mockClient(LambdaClient)

describe("ISB Client", () => {
  const testCorrelationId = "test-event-123"
  const testUserEmail = "user@example.gov.uk"
  const testUuid = "550e8400-e29b-41d4-a716-446655440000"
  const testFunctionName = "ISB-LeasesLambdaFunction-ndx"
  const testConfig = { functionName: testFunctionName }

  beforeEach(() => {
    lambdaMock.reset()
    jest.clearAllMocks()
    // Reset environment
    delete process.env.ISB_LEASES_LAMBDA_NAME
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  /**
   * Helper to create a mock Lambda response payload
   * Uses 'as any' to bypass TypeScript strict type checking for mock responses
   */
  function createLambdaResponse(statusCode: number, body: object) {
    const apiGatewayResponse = {
      statusCode,
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
    // Cast to any to avoid Uint8ArrayBlobAdapter type issues in tests
    return new Uint8Array(Buffer.from(JSON.stringify(apiGatewayResponse))) as any
  }

  // ===========================================================================
  // Lease ID Construction/Parsing Tests
  // ===========================================================================

  describe("constructLeaseId", () => {
    it("should create base64 encoded JSON composite key", () => {
      const leaseId = constructLeaseId(testUserEmail, testUuid)

      // Decode and verify format
      const decoded = Buffer.from(leaseId, "base64").toString("utf-8")
      const parsed = JSON.parse(decoded)
      expect(parsed).toEqual({ userEmail: testUserEmail, uuid: testUuid })
    })

    it("should handle special characters in email", () => {
      const email = "user+tag@sub.domain.gov.uk"
      const leaseId = constructLeaseId(email, testUuid)

      const decoded = Buffer.from(leaseId, "base64").toString("utf-8")
      const parsed = JSON.parse(decoded)
      expect(parsed).toEqual({ userEmail: email, uuid: testUuid })
    })

    it("should handle pipe character in email (JSON format allows it)", () => {
      const emailWithPipe = "user|test@example.com"
      const leaseId = constructLeaseId(emailWithPipe, testUuid)

      const decoded = Buffer.from(leaseId, "base64").toString("utf-8")
      const parsed = JSON.parse(decoded)
      expect(parsed).toEqual({ userEmail: emailWithPipe, uuid: testUuid })
    })
  })

  describe("parseLeaseId", () => {
    it("should parse valid lease ID back to components", () => {
      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = parseLeaseId(leaseId)

      expect(result).toEqual({
        userEmail: testUserEmail,
        uuid: testUuid,
      })
    })

    it("should return null for invalid base64", () => {
      const result = parseLeaseId("not-valid-base64!!!")
      expect(result).toBeNull()
    })

    it("should return null for invalid JSON", () => {
      const invalidId = Buffer.from("not json").toString("base64")
      const result = parseLeaseId(invalidId)
      expect(result).toBeNull()
    })

    it("should return null for missing userEmail in JSON", () => {
      const invalidId = Buffer.from(JSON.stringify({ uuid: "test" })).toString("base64")
      const result = parseLeaseId(invalidId)
      expect(result).toBeNull()
    })

    it("should return null for missing uuid in JSON", () => {
      const invalidId = Buffer.from(JSON.stringify({ userEmail: "test@example.com" })).toString("base64")
      const result = parseLeaseId(invalidId)
      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // AC-1: Successful ISB Lambda Response Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-1: Successful Lambda invocation", () => {
    it("should return lease record on success", async () => {
      const mockLease: ISBLeaseRecord = {
        userEmail: testUserEmail,
        uuid: testUuid,
        status: "Active",
        maxSpend: 100,
        expirationDate: "2026-02-15T00:00:00Z",
        awsAccountId: "123456789012",
        templateName: "empty-sandbox",
      }

      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "success",
        data: mockLease,
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toEqual(mockLease)
      expect(lambdaMock.calls()).toHaveLength(1)

      // Verify the Lambda was invoked with correct parameters
      const call = lambdaMock.calls()[0]
      const input = call.args[0].input as { FunctionName: string; Payload: Buffer }
      expect(input.FunctionName).toBe(testFunctionName)

      // Verify the API Gateway event format
      const payload = JSON.parse(input.Payload.toString())
      expect(payload.httpMethod).toBe("GET")
      expect(payload.pathParameters.leaseId).toBe(leaseId)
      expect(payload.headers["X-Correlation-Id"]).toBe(testCorrelationId)
    })

    it("should use environment variable if config not provided", async () => {
      process.env.ISB_LEASES_LAMBDA_NAME = "env-ISB-LeasesLambdaFunction"

      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "success",
        data: { userEmail: testUserEmail, uuid: testUuid },
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      await fetchLeaseFromISB(leaseId, testCorrelationId)

      // Verify the Lambda was invoked with the env var function name
      const call = lambdaMock.calls()[0]
      const input = call.args[0].input as { FunctionName: string }
      expect(input.FunctionName).toBe("env-ISB-LeasesLambdaFunction")
    })

    it("should return null if ISB_LEASES_LAMBDA_NAME not configured", async () => {
      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })
  })

  // ===========================================================================
  // AC-4: 404 Response (Lease Not Found) Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-4: 404 handling", () => {
    it("should return null for 404 response (graceful degradation)", async () => {
      const mockResponse = { status: "fail", message: "Lease not found" }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(404, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // AC-5: 500/Execution Error Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-5: Server error handling", () => {
    it("should return null for 500 response (graceful degradation)", async () => {
      const mockResponse = { status: "error", message: "Internal server error" }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(500, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 502 response", async () => {
      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(502, {}),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 503 response", async () => {
      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(503, {}),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for Lambda execution error (FunctionError)", async () => {
      lambdaMock.on(InvokeCommand).resolves({
        FunctionError: "Unhandled",
        Payload: new Uint8Array(Buffer.from(JSON.stringify({ errorMessage: "Error in handler" }))) as any,
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for empty Lambda payload", async () => {
      lambdaMock.on(InvokeCommand).resolves({
        Payload: undefined,
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for Lambda invocation error", async () => {
      lambdaMock.on(InvokeCommand).rejects(new Error("Service unavailable"))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // JSend Response Handling Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - JSend response handling", () => {
    it("should return null for JSend fail status", async () => {
      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "fail",
        message: "Validation failed",
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for JSend error status", async () => {
      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "error",
        message: "Internal processing error",
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for missing data field", async () => {
      const mockResponse = {
        status: "success",
        // data field missing
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // fetchLeaseByKey Convenience Function Tests
  // ===========================================================================

  describe("fetchLeaseByKey", () => {
    it("should fetch lease using userEmail and uuid", async () => {
      const mockLease: ISBLeaseRecord = {
        userEmail: testUserEmail,
        uuid: testUuid,
        status: "Active",
      }

      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "success",
        data: mockLease,
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      const result = await fetchLeaseByKey(testUserEmail, testUuid, testCorrelationId, testConfig)

      expect(result).toEqual(mockLease)
    })

    it("should return null for empty userEmail", async () => {
      const result = await fetchLeaseByKey("", testUuid, testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })

    it("should return null for empty uuid", async () => {
      const result = await fetchLeaseByKey(testUserEmail, "", testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })

    it("should return null for whitespace-only userEmail", async () => {
      const result = await fetchLeaseByKey("   ", testUuid, testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })

    it("should return null for whitespace-only uuid", async () => {
      const result = await fetchLeaseByKey(testUserEmail, "   ", testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })
  })

  // ===========================================================================
  // Other 4xx Error Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - Other client errors", () => {
    it("should return null for 400 response", async () => {
      const mockResponse = { status: "fail", message: "Bad request" }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(400, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 401 response", async () => {
      const mockResponse = { status: "fail", message: "Unauthorized" }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(401, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 403 response", async () => {
      const mockResponse = { status: "fail", message: "Forbidden" }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(403, mockResponse),
      })

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })
})

// =============================================================================
// fetchAccountFromISB Tests
// =============================================================================

describe("ISB Accounts Client", () => {
  const testCorrelationId = "test-event-456"
  const testAwsAccountId = "123456789012"
  const testAccountsFunctionName = "ISB-AccountsLambdaFunction-ndx"
  const testAccountsConfig = { functionName: testAccountsFunctionName }

  beforeEach(() => {
    lambdaMock.reset()
    jest.clearAllMocks()
    delete process.env.ISB_ACCOUNTS_LAMBDA_NAME
  })

  /**
   * Helper to create a mock Lambda response payload
   */
  function createLambdaResponse(statusCode: number, body: object) {
    const apiGatewayResponse = {
      statusCode,
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
    return new Uint8Array(Buffer.from(JSON.stringify(apiGatewayResponse))) as any
  }

  describe("fetchAccountFromISB - Success cases", () => {
    it("should return account record on success", async () => {
      const mockAccount: ISBAccountRecord = {
        awsAccountId: testAwsAccountId,
        name: "Test Account",
        email: "owner@example.gov.uk",
        status: "Active",
      }

      const mockResponse: JSendResponse<ISBAccountRecord> = {
        status: "success",
        data: mockAccount,
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId, testAccountsConfig)

      expect(result).toEqual(mockAccount)
      expect(lambdaMock.calls()).toHaveLength(1)

      // Verify the Lambda was invoked with correct parameters
      const call = lambdaMock.calls()[0]
      const input = call.args[0].input as { FunctionName: string; Payload: Buffer }
      expect(input.FunctionName).toBe(testAccountsFunctionName)

      // Verify the API Gateway event format
      const payload = JSON.parse(input.Payload.toString())
      expect(payload.httpMethod).toBe("GET")
      expect(payload.pathParameters.awsAccountId).toBe(testAwsAccountId)
    })

    it("should use environment variable if config not provided", async () => {
      process.env.ISB_ACCOUNTS_LAMBDA_NAME = "env-ISB-AccountsLambdaFunction"

      const mockResponse: JSendResponse<ISBAccountRecord> = {
        status: "success",
        data: { awsAccountId: testAwsAccountId },
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      await fetchAccountFromISB(testAwsAccountId, testCorrelationId)

      const call = lambdaMock.calls()[0]
      const input = call.args[0].input as { FunctionName: string }
      expect(input.FunctionName).toBe("env-ISB-AccountsLambdaFunction")
    })

    it("should return null if ISB_ACCOUNTS_LAMBDA_NAME not configured", async () => {
      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })
  })

  describe("fetchAccountFromISB - 404 handling", () => {
    it("should return null for 404 response (graceful degradation)", async () => {
      const mockResponse = { status: "fail", message: "Account not found" }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(404, mockResponse),
      })

      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
    })
  })

  describe("fetchAccountFromISB - Server error handling", () => {
    it("should return null for 500 response (graceful degradation)", async () => {
      const mockResponse = { status: "error", message: "Internal server error" }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(500, mockResponse),
      })

      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
    })

    it("should return null for Lambda execution error", async () => {
      lambdaMock.on(InvokeCommand).resolves({
        FunctionError: "Unhandled",
        Payload: new Uint8Array(Buffer.from(JSON.stringify({ errorMessage: "Error" }))) as any,
      })

      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
    })

    it("should return null for Lambda invocation error", async () => {
      lambdaMock.on(InvokeCommand).rejects(new Error("Service unavailable"))

      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
    })
  })

  describe("fetchAccountFromISB - Input validation", () => {
    it("should return null for empty awsAccountId", async () => {
      const result = await fetchAccountFromISB("", testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })

    it("should return null for whitespace-only awsAccountId", async () => {
      const result = await fetchAccountFromISB("   ", testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })
  })
})

// =============================================================================
// fetchTemplateFromISB Tests
// =============================================================================

describe("ISB Templates Client", () => {
  const testCorrelationId = "test-event-789"
  const testTemplateName = "empty-sandbox"
  const testTemplatesFunctionName = "ISB-LeaseTemplatesLambdaFunction-ndx"
  const testTemplatesConfig = { functionName: testTemplatesFunctionName }

  beforeEach(() => {
    lambdaMock.reset()
    jest.clearAllMocks()
    delete process.env.ISB_TEMPLATES_LAMBDA_NAME
  })

  /**
   * Helper to create a mock Lambda response payload
   */
  function createLambdaResponse(statusCode: number, body: object) {
    const apiGatewayResponse = {
      statusCode,
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
    return new Uint8Array(Buffer.from(JSON.stringify(apiGatewayResponse))) as any
  }

  describe("fetchTemplateFromISB - Success cases", () => {
    it("should return template record on success", async () => {
      const mockTemplate: ISBTemplateRecord = {
        uuid: "template-uuid-123",
        name: testTemplateName,
        description: "Empty sandbox template",
        leaseDurationInHours: 720,
        maxSpend: 100,
      }

      const mockResponse: JSendResponse<ISBTemplateRecord> = {
        status: "success",
        data: mockTemplate,
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId, testTemplatesConfig)

      expect(result).toEqual(mockTemplate)
      expect(lambdaMock.calls()).toHaveLength(1)

      // Verify the Lambda was invoked with correct parameters
      const call = lambdaMock.calls()[0]
      const input = call.args[0].input as { FunctionName: string; Payload: Buffer }
      expect(input.FunctionName).toBe(testTemplatesFunctionName)

      // Verify the API Gateway event format
      const payload = JSON.parse(input.Payload.toString())
      expect(payload.httpMethod).toBe("GET")
      expect(payload.pathParameters.leaseTemplateId).toBe(testTemplateName)
    })

    it("should use environment variable if config not provided", async () => {
      process.env.ISB_TEMPLATES_LAMBDA_NAME = "env-ISB-TemplatesLambdaFunction"

      const mockResponse: JSendResponse<ISBTemplateRecord> = {
        status: "success",
        data: { uuid: "test-uuid", name: testTemplateName },
      }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(200, mockResponse),
      })

      await fetchTemplateFromISB(testTemplateName, testCorrelationId)

      const call = lambdaMock.calls()[0]
      const input = call.args[0].input as { FunctionName: string }
      expect(input.FunctionName).toBe("env-ISB-TemplatesLambdaFunction")
    })

    it("should return null if ISB_TEMPLATES_LAMBDA_NAME not configured", async () => {
      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })
  })

  describe("fetchTemplateFromISB - 404 handling", () => {
    it("should return null for 404 response (graceful degradation)", async () => {
      const mockResponse = { status: "fail", message: "Template not found" }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(404, mockResponse),
      })

      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
    })
  })

  describe("fetchTemplateFromISB - Server error handling", () => {
    it("should return null for 500 response (graceful degradation)", async () => {
      const mockResponse = { status: "error", message: "Internal server error" }

      lambdaMock.on(InvokeCommand).resolves({
        Payload: createLambdaResponse(500, mockResponse),
      })

      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
    })

    it("should return null for Lambda execution error", async () => {
      lambdaMock.on(InvokeCommand).resolves({
        FunctionError: "Unhandled",
        Payload: new Uint8Array(Buffer.from(JSON.stringify({ errorMessage: "Error" }))) as any,
      })

      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
    })

    it("should return null for Lambda invocation error", async () => {
      lambdaMock.on(InvokeCommand).rejects(new Error("Service unavailable"))

      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
    })
  })

  describe("fetchTemplateFromISB - Input validation", () => {
    it("should return null for empty templateName", async () => {
      const result = await fetchTemplateFromISB("", testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })

    it("should return null for whitespace-only templateName", async () => {
      const result = await fetchTemplateFromISB("   ", testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
      expect(lambdaMock.calls()).toHaveLength(0)
    })
  })
})
