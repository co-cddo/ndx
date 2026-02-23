/**
 * Tests for ISB API Client Module
 *
 * Story: 5.1 - Replace DynamoDB Reads with ISB API
 * Tests cover: AC-1, AC-4, AC-5, AC-6/NFR4
 *
 * @see _bmad-output/implementation-artifacts/5-1-replace-dynamodb-reads-with-isb-api.md
 */

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import { mockClient } from "aws-sdk-client-mock"
import {
  fetchLeaseFromISB,
  fetchLeaseByKey,
  fetchAccountFromISB,
  fetchTemplateFromISB,
  constructLeaseId,
  parseLeaseId,
  resetTokenCache,
  signJwt,
  ISBLeaseRecord,
  ISBAccountRecord,
  ISBTemplateRecord,
  JSendResponse,
} from "./isb-client"

// Create mock for Secrets Manager client
const secretsMock = mockClient(SecretsManagerClient)

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

const TEST_JWT_SECRET = "test-jwt-secret-key-for-signing"
const TEST_API_BASE_URL = "https://test-api.execute-api.us-west-2.amazonaws.com/prod"
const TEST_JWT_SECRET_PATH = "/InnovationSandbox/ndx/Auth/JwtSecret"

/**
 * Helper to create a mock HTTP response
 */
function createAPIResponse(statusCode: number, body: object): Response {
  return {
    ok: statusCode >= 200 && statusCode < 300,
    status: statusCode,
    statusText: statusCode === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    headers: new Headers({ "Content-Type": "application/json" }),
  } as Response
}

/**
 * Setup Secrets Manager mock to return the test JWT secret
 */
function setupSecretsMock(): void {
  secretsMock.on(GetSecretValueCommand).resolves({
    SecretString: TEST_JWT_SECRET,
  })
}

describe("ISB Client", () => {
  const testCorrelationId = "test-event-123"
  const testUserEmail = "user@example.gov.uk"
  const testUuid = "550e8400-e29b-41d4-a716-446655440000"
  const testConfig = { apiBaseUrl: TEST_API_BASE_URL, jwtSecretPath: TEST_JWT_SECRET_PATH }

  beforeEach(() => {
    secretsMock.reset()
    mockFetch.mockReset()
    jest.clearAllMocks()
    resetTokenCache()
    // Reset environment
    delete process.env.ISB_API_BASE_URL
    delete process.env.ISB_JWT_SECRET_PATH
    setupSecretsMock()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

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
  // JWT Signing Tests
  // ===========================================================================

  describe("signJwt", () => {
    it("should produce a valid three-part JWT", () => {
      const token = signJwt({ user: { email: "test@example.com" } }, "secret")
      const parts = token.split(".")
      expect(parts).toHaveLength(3)
    })

    it("should include HS256 algorithm in header", () => {
      const token = signJwt({ foo: "bar" }, "secret")
      const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString())
      expect(header).toEqual({ alg: "HS256", typ: "JWT" })
    })

    it("should include iat and exp claims", () => {
      const token = signJwt({ foo: "bar" }, "secret", 3600)
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
      expect(payload.iat).toBeDefined()
      expect(payload.exp).toBeDefined()
      expect(payload.exp - payload.iat).toBe(3600)
    })

    it("should include custom payload", () => {
      const token = signJwt({ user: { email: "test@example.com", roles: ["Admin"] } }, "secret")
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
      expect(payload.user).toEqual({ email: "test@example.com", roles: ["Admin"] })
    })
  })

  // ===========================================================================
  // AC-1: Successful ISB API Response Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-1: Successful API call", () => {
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

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toEqual(mockLease)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Verify the fetch was called with correct URL and headers
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe(`${TEST_API_BASE_URL}/leases/${encodeURIComponent(leaseId)}`)
      expect((options as RequestInit).method).toBe("GET")
      expect((options as RequestInit).headers).toHaveProperty("Authorization")
      expect(((options as RequestInit).headers as Record<string, string>)["Authorization"]).toMatch(/^Bearer /)
      expect(((options as RequestInit).headers as Record<string, string>)["X-Correlation-Id"]).toBe(testCorrelationId)
    })

    it("should use environment variables if config not provided", async () => {
      process.env.ISB_API_BASE_URL = "https://env-api.example.com/prod"
      process.env.ISB_JWT_SECRET_PATH = "/test/secret"

      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "success",
        data: { userEmail: testUserEmail, uuid: testUuid },
      }

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      await fetchLeaseFromISB(leaseId, testCorrelationId)

      // Verify the fetch was called with the env var API base URL
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain("https://env-api.example.com/prod/leases/")
    })

    it("should return null if ISB API not configured", async () => {
      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // AC-4: 404 Response (Lease Not Found) Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-4: 404 handling", () => {
    it("should return null for 404 response (graceful degradation)", async () => {
      const mockResponse = { status: "fail", message: "Lease not found" }

      mockFetch.mockResolvedValue(createAPIResponse(404, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // AC-5: 500/Network Error Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - AC-5: Server error handling", () => {
    it("should return null for 500 response (graceful degradation)", async () => {
      const mockResponse = { status: "error", message: "Internal server error" }

      mockFetch.mockResolvedValue(createAPIResponse(500, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 502 response", async () => {
      mockFetch.mockResolvedValue(createAPIResponse(502, {}))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 503 response", async () => {
      mockFetch.mockResolvedValue(createAPIResponse(503, {}))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for timeout error", async () => {
      mockFetch.mockRejectedValue(new DOMException("The operation was aborted", "AbortError"))

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

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for JSend error status", async () => {
      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "error",
        message: "Internal processing error",
      }

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for missing data field", async () => {
      const mockResponse = {
        status: "success",
        // data field missing
      }

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

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

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      const result = await fetchLeaseByKey(testUserEmail, testUuid, testCorrelationId, testConfig)

      expect(result).toEqual(mockLease)
    })

    it("should return null for empty userEmail", async () => {
      const result = await fetchLeaseByKey("", testUuid, testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should return null for empty uuid", async () => {
      const result = await fetchLeaseByKey(testUserEmail, "", testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should return null for whitespace-only userEmail", async () => {
      const result = await fetchLeaseByKey("   ", testUuid, testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should return null for whitespace-only uuid", async () => {
      const result = await fetchLeaseByKey(testUserEmail, "   ", testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Other 4xx Error Tests
  // ===========================================================================

  describe("fetchLeaseFromISB - Other client errors", () => {
    it("should return null for 400 response", async () => {
      const mockResponse = { status: "fail", message: "Bad request" }

      mockFetch.mockResolvedValue(createAPIResponse(400, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 401 response", async () => {
      const mockResponse = { status: "fail", message: "Unauthorized" }

      mockFetch.mockResolvedValue(createAPIResponse(401, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })

    it("should return null for 403 response", async () => {
      const mockResponse = { status: "fail", message: "Forbidden" }

      mockFetch.mockResolvedValue(createAPIResponse(403, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // JWT Secret Retrieval Tests
  // ===========================================================================

  describe("JWT secret retrieval", () => {
    it("should fetch JWT secret from Secrets Manager on first call", async () => {
      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "success",
        data: { userEmail: testUserEmail, uuid: testUuid },
      }

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(secretsMock.calls()).toHaveLength(1)
      const call = secretsMock.calls()[0]
      expect((call.args[0].input as { SecretId: string }).SecretId).toBe(TEST_JWT_SECRET_PATH)
    })

    it("should cache JWT secret across calls", async () => {
      const mockResponse: JSendResponse<ISBLeaseRecord> = {
        status: "success",
        data: { userEmail: testUserEmail, uuid: testUuid },
      }

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)
      await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      // Secret should only be fetched once
      expect(secretsMock.calls()).toHaveLength(1)
    })

    it("should return null if Secrets Manager fails", async () => {
      secretsMock.reset()
      secretsMock.on(GetSecretValueCommand).rejects(new Error("Access denied"))

      const leaseId = constructLeaseId(testUserEmail, testUuid)
      const result = await fetchLeaseFromISB(leaseId, testCorrelationId, testConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})

// =============================================================================
// fetchAccountFromISB Tests
// =============================================================================

describe("ISB Accounts Client", () => {
  const testCorrelationId = "test-event-456"
  const testAwsAccountId = "123456789012"
  const testAccountsConfig = { apiBaseUrl: TEST_API_BASE_URL, jwtSecretPath: TEST_JWT_SECRET_PATH }

  beforeEach(() => {
    secretsMock.reset()
    mockFetch.mockReset()
    jest.clearAllMocks()
    resetTokenCache()
    delete process.env.ISB_API_BASE_URL
    delete process.env.ISB_JWT_SECRET_PATH
    setupSecretsMock()
  })

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

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId, testAccountsConfig)

      expect(result).toEqual(mockAccount)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Verify the fetch was called with correct URL
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe(`${TEST_API_BASE_URL}/accounts/${testAwsAccountId}`)
      expect((options as RequestInit).method).toBe("GET")
      expect(((options as RequestInit).headers as Record<string, string>)["Authorization"]).toMatch(/^Bearer /)
    })

    it("should use environment variables if config not provided", async () => {
      process.env.ISB_API_BASE_URL = "https://env-api.example.com/prod"
      process.env.ISB_JWT_SECRET_PATH = "/test/secret"

      const mockResponse: JSendResponse<ISBAccountRecord> = {
        status: "success",
        data: { awsAccountId: testAwsAccountId },
      }

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      await fetchAccountFromISB(testAwsAccountId, testCorrelationId)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain("https://env-api.example.com/prod/accounts/")
    })

    it("should return null if ISB API not configured", async () => {
      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("fetchAccountFromISB - 404 handling", () => {
    it("should return null for 404 response (graceful degradation)", async () => {
      const mockResponse = { status: "fail", message: "Account not found" }

      mockFetch.mockResolvedValue(createAPIResponse(404, mockResponse))

      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
    })
  })

  describe("fetchAccountFromISB - Server error handling", () => {
    it("should return null for 500 response (graceful degradation)", async () => {
      const mockResponse = { status: "error", message: "Internal server error" }

      mockFetch.mockResolvedValue(createAPIResponse(500, mockResponse))

      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
    })

    it("should return null for network error", async () => {
      mockFetch.mockRejectedValue(new Error("Service unavailable"))

      const result = await fetchAccountFromISB(testAwsAccountId, testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
    })
  })

  describe("fetchAccountFromISB - Input validation", () => {
    it("should return null for empty awsAccountId", async () => {
      const result = await fetchAccountFromISB("", testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should return null for whitespace-only awsAccountId", async () => {
      const result = await fetchAccountFromISB("   ", testCorrelationId, testAccountsConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})

// =============================================================================
// fetchTemplateFromISB Tests
// =============================================================================

describe("ISB Templates Client", () => {
  const testCorrelationId = "test-event-789"
  const testTemplateName = "empty-sandbox"
  const testTemplatesConfig = { apiBaseUrl: TEST_API_BASE_URL, jwtSecretPath: TEST_JWT_SECRET_PATH }

  beforeEach(() => {
    secretsMock.reset()
    mockFetch.mockReset()
    jest.clearAllMocks()
    resetTokenCache()
    delete process.env.ISB_API_BASE_URL
    delete process.env.ISB_JWT_SECRET_PATH
    setupSecretsMock()
  })

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

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId, testTemplatesConfig)

      expect(result).toEqual(mockTemplate)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Verify the fetch was called with correct URL
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe(`${TEST_API_BASE_URL}/leaseTemplates/${testTemplateName}`)
      expect((options as RequestInit).method).toBe("GET")
    })

    it("should use environment variables if config not provided", async () => {
      process.env.ISB_API_BASE_URL = "https://env-api.example.com/prod"
      process.env.ISB_JWT_SECRET_PATH = "/test/secret"

      const mockResponse: JSendResponse<ISBTemplateRecord> = {
        status: "success",
        data: { uuid: "test-uuid", name: testTemplateName },
      }

      mockFetch.mockResolvedValue(createAPIResponse(200, mockResponse))

      await fetchTemplateFromISB(testTemplateName, testCorrelationId)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain("https://env-api.example.com/prod/leaseTemplates/")
    })

    it("should return null if ISB API not configured", async () => {
      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("fetchTemplateFromISB - 404 handling", () => {
    it("should return null for 404 response (graceful degradation)", async () => {
      const mockResponse = { status: "fail", message: "Template not found" }

      mockFetch.mockResolvedValue(createAPIResponse(404, mockResponse))

      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
    })
  })

  describe("fetchTemplateFromISB - Server error handling", () => {
    it("should return null for 500 response (graceful degradation)", async () => {
      const mockResponse = { status: "error", message: "Internal server error" }

      mockFetch.mockResolvedValue(createAPIResponse(500, mockResponse))

      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
    })

    it("should return null for network error", async () => {
      mockFetch.mockRejectedValue(new Error("Service unavailable"))

      const result = await fetchTemplateFromISB(testTemplateName, testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
    })
  })

  describe("fetchTemplateFromISB - Input validation", () => {
    it("should return null for empty templateName", async () => {
      const result = await fetchTemplateFromISB("", testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should return null for whitespace-only templateName", async () => {
      const result = await fetchTemplateFromISB("   ", testCorrelationId, testTemplatesConfig)

      expect(result).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
