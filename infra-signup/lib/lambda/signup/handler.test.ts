/**
 * NDX Signup Lambda Handler Tests
 *
 * Story 1.2: Tests for handler routing and responses
 * Story 1.3: Tests for domain endpoint
 * Story 1.4: Tests for signup endpoint
 *
 * @module infra-signup/lib/lambda/signup/handler.test
 */

import type { APIGatewayProxyEvent } from "aws-lambda"
import { ConflictException } from "@aws-sdk/client-identitystore"
import { handler, successResponse, errorResponse, _internal } from "./handler"
import * as domainService from "./domain-service"
import * as identityStoreService from "./identity-store-service"
import { SignupErrorCode, ERROR_MESSAGES } from "@ndx/signup-types"

// Mock the domain service
jest.mock("./domain-service")
// Mock the identity store service. NOTE: when adding new exports to
// identity-store-service.ts, this manual factory must be updated to keep
// the mocked surface in sync with the real module.
jest.mock("./identity-store-service", () => ({
  checkUserExists: jest.fn(),
  createUser: jest.fn(),
  createUserOnly: jest.fn(),
  addUserToNdxGroup: jest.fn(),
  getExistingUserNames: jest.fn(),
  validateConfiguration: jest.fn(),
  resetClient: jest.fn(),
}))

/**
 * Create a mock API Gateway event for testing
 */
function createMockEvent(
  method: string,
  path: string,
  body?: string,
  headers?: Record<string, string>,
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path,
    body: body ?? null,
    headers: headers ?? {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    resource: "",
    isBase64Encoded: false,
    requestContext: {
      accountId: "123456789012",
      apiId: "test-api",
      authorizer: null,
      httpMethod: method,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: "127.0.0.1",
        user: null,
        userAgent: "test-agent",
        userArn: null,
      },
      path,
      protocol: "HTTP/1.1",
      requestId: "test-correlation-id-12345",
      requestTimeEpoch: Date.now(),
      resourceId: "",
      resourcePath: "",
      stage: "test",
    },
  }
}

describe("handler", () => {
  // Spy on console.log to verify structured logging
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe("GET /signup-api/health", () => {
    it("should return 200 with status ok", async () => {
      const event = createMockEvent("GET", "/signup-api/health")
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({ status: "ok" })
    })

    it("should include security headers", async () => {
      const event = createMockEvent("GET", "/signup-api/health")
      const result = await handler(event)

      expect(result.headers).toMatchObject({
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Type": "application/json",
      })
    })

    it("should include X-Request-ID header with correlation ID", async () => {
      const event = createMockEvent("GET", "/signup-api/health")
      const result = await handler(event)

      expect(result.headers).toMatchObject({
        "X-Request-ID": "test-correlation-id-12345",
      })
    })

    it("should log the request with correlation ID", async () => {
      const event = createMockEvent("GET", "/signup-api/health")
      await handler(event)

      expect(consoleSpy).toHaveBeenCalledTimes(1)
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0])
      expect(loggedData).toMatchObject({
        level: "INFO",
        message: "Request received",
        path: "/signup-api/health",
        method: "GET",
        correlationId: "test-correlation-id-12345",
      })
    })
  })

  describe("GET /signup-api/domains", () => {
    const mockGetDomains = domainService.getDomains as jest.MockedFunction<typeof domainService.getDomains>

    const sampleDomains = [
      { domain: "westbury.gov.uk", orgName: "Westbury District Council" },
      { domain: "reading.gov.uk", orgName: "Reading Borough Council" },
    ]

    beforeEach(() => {
      mockGetDomains.mockReset()
    })

    it("should return 200 with domain array", async () => {
      mockGetDomains.mockResolvedValueOnce(sampleDomains)

      const event = createMockEvent("GET", "/signup-api/domains")
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({ domains: sampleDomains })
    })

    it("should include security headers", async () => {
      mockGetDomains.mockResolvedValueOnce(sampleDomains)

      const event = createMockEvent("GET", "/signup-api/domains")
      const result = await handler(event)

      expect(result.headers).toMatchObject({
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Content-Type": "application/json",
      })
    })

    it("should include X-Request-ID header", async () => {
      mockGetDomains.mockResolvedValueOnce(sampleDomains)

      const event = createMockEvent("GET", "/signup-api/domains")
      const result = await handler(event)

      expect(result.headers).toMatchObject({
        "X-Request-ID": "test-correlation-id-12345",
      })
    })

    it("should pass correlation ID to getDomains", async () => {
      mockGetDomains.mockResolvedValueOnce(sampleDomains)

      const event = createMockEvent("GET", "/signup-api/domains")
      await handler(event)

      expect(mockGetDomains).toHaveBeenCalledWith("test-correlation-id-12345")
    })

    it("should return 503 when service is unavailable", async () => {
      mockGetDomains.mockRejectedValueOnce(new Error("GitHub down"))

      const event = createMockEvent("GET", "/signup-api/domains")
      const result = await handler(event)

      expect(result.statusCode).toBe(503)
      expect(JSON.parse(result.body)).toEqual({
        error: "SERVICE_UNAVAILABLE",
        message: "Service temporarily unavailable",
      })
    })

    it("should log error when service fails", async () => {
      mockGetDomains.mockRejectedValueOnce(new Error("GitHub down"))

      const event = createMockEvent("GET", "/signup-api/domains")
      await handler(event)

      // Find the error log (after the INFO log for request received)
      const errorLog = consoleSpy.mock.calls.find((call) => {
        const data = JSON.parse(call[0])
        return data.level === "ERROR"
      })

      expect(errorLog).toBeDefined()
      const loggedData = JSON.parse(errorLog[0])
      expect(loggedData).toMatchObject({
        level: "ERROR",
        message: "Failed to fetch domains",
        error: "GitHub down",
        correlationId: "test-correlation-id-12345",
      })
    })
  })

  describe("POST /signup-api/signup", () => {
    const mockGetDomains = domainService.getDomains as jest.MockedFunction<typeof domainService.getDomains>
    const mockCheckUserExists = identityStoreService.checkUserExists as jest.MockedFunction<
      typeof identityStoreService.checkUserExists
    >
    const mockCreateUser = identityStoreService.createUser as jest.MockedFunction<
      typeof identityStoreService.createUser
    >

    const sampleDomains = [
      { domain: "westbury.gov.uk", orgName: "Westbury District Council" },
      { domain: "reading.gov.uk", orgName: "Reading Borough Council" },
    ]

    const validSignupRequest = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@westbury.gov.uk",
    }
    const mockCreateUserOnly = identityStoreService.createUserOnly as jest.MockedFunction<
      typeof identityStoreService.createUserOnly
    >
    const mockGetExistingUserNames = identityStoreService.getExistingUserNames as jest.MockedFunction<
      typeof identityStoreService.getExistingUserNames
    >

    const validHeaders = {
      "Content-Type": "application/json",
      "X-NDX-Request": "signup-form",
    }

    beforeEach(() => {
      mockGetDomains.mockReset()
      mockCheckUserExists.mockReset()
      mockCreateUser.mockReset()
      mockCreateUserOnly.mockReset()
      mockGetExistingUserNames.mockReset()

      // Default mocks for happy path
      mockGetDomains.mockResolvedValue(sampleDomains)
      mockCheckUserExists.mockResolvedValue(false)
      mockCreateUser.mockResolvedValue("new-user-id")
      mockCreateUserOnly.mockResolvedValue("new-waitlist-user-id")
      mockGetExistingUserNames.mockResolvedValue(null)
    })

    describe("successful signup", () => {
      it("should return 200 with success true on valid signup (recognised branch)", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body)).toEqual({ success: true, waitlist: false })
      })

      it("should include security headers in response", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.headers).toMatchObject({
          "Content-Security-Policy": "default-src 'none'",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
          "Content-Type": "application/json",
        })
      })

      it("should include X-Request-ID header", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.headers).toMatchObject({
          "X-Request-ID": "test-correlation-id-12345",
        })
      })

      it("should call checkUserExists with normalized email", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        await handler(event)

        expect(mockCheckUserExists).toHaveBeenCalledWith("jane.smith@westbury.gov.uk", "test-correlation-id-12345")
      })

      it("should call createUser with request data", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        await handler(event)

        expect(mockCreateUser).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: "Jane",
            lastName: "Smith",
            email: "jane.smith@westbury.gov.uk",
          }),
          "test-correlation-id-12345",
        )
      })
    })

    describe("email normalization", () => {
      it("should reject email with multiple @ characters", async () => {
        const requestWithDoubleAt = {
          ...validSignupRequest,
          email: "jane@det.gov.uk@det.gov.uk",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithDoubleAt), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Email address contains multiple '@' characters",
        })

        expect(mockCheckUserExists).not.toHaveBeenCalled()
        expect(mockCreateUser).not.toHaveBeenCalled()
      })

      it("should reject email with + alias character", async () => {
        const requestWithPlusSuffix = {
          ...validSignupRequest,
          email: "jane+test@westbury.gov.uk",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithPlusSuffix), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Email address cannot contain a '+' character",
        })

        // Should not call Identity Store APIs
        expect(mockCheckUserExists).not.toHaveBeenCalled()
        expect(mockCreateUser).not.toHaveBeenCalled()
      })

      it("should lowercase email before processing", async () => {
        const requestWithUppercase = {
          ...validSignupRequest,
          email: "Jane.Smith@Westbury.GOV.UK",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithUppercase), validHeaders)
        await handler(event)

        expect(mockCheckUserExists).toHaveBeenCalledWith("jane.smith@westbury.gov.uk", "test-correlation-id-12345")
      })
    })

    describe("CSRF validation", () => {
      it("should return 403 CSRF_INVALID when X-NDX-Request header is missing", async () => {
        const headersWithoutCsrf = {
          "Content-Type": "application/json",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(validSignupRequest),
          headersWithoutCsrf,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(403)
        expect(JSON.parse(result.body)).toEqual({
          error: SignupErrorCode.CSRF_INVALID,
          message: ERROR_MESSAGES[SignupErrorCode.CSRF_INVALID],
        })
      })

      it("should return 403 CSRF_INVALID when X-NDX-Request header has wrong value", async () => {
        const headersWithWrongCsrf = {
          "Content-Type": "application/json",
          "X-NDX-Request": "wrong-value",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(validSignupRequest),
          headersWithWrongCsrf,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(403)
        expect(JSON.parse(result.body)).toEqual({
          error: SignupErrorCode.CSRF_INVALID,
          message: ERROR_MESSAGES[SignupErrorCode.CSRF_INVALID],
        })
      })

      it("should accept case-insensitive CSRF header value", async () => {
        const headersWithDifferentCase = {
          "Content-Type": "application/json",
          "X-NDX-Request": "SIGNUP-FORM",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(validSignupRequest),
          headersWithDifferentCase,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(200)
      })
    })

    describe("Content-Type validation", () => {
      it("should return 400 INVALID_CONTENT_TYPE when Content-Type is missing", async () => {
        const headersWithoutContentType = {
          "X-NDX-Request": "signup-form",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(validSignupRequest),
          headersWithoutContentType,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toEqual({
          error: SignupErrorCode.INVALID_CONTENT_TYPE,
          message: ERROR_MESSAGES[SignupErrorCode.INVALID_CONTENT_TYPE],
        })
      })

      it("should return 400 INVALID_CONTENT_TYPE when Content-Type is not JSON", async () => {
        const headersWithWrongContentType = {
          "Content-Type": "text/plain",
          "X-NDX-Request": "signup-form",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(validSignupRequest),
          headersWithWrongContentType,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toEqual({
          error: SignupErrorCode.INVALID_CONTENT_TYPE,
          message: ERROR_MESSAGES[SignupErrorCode.INVALID_CONTENT_TYPE],
        })
      })

      it("should accept Content-Type with charset parameter", async () => {
        const headersWithCharset = {
          "Content-Type": "application/json; charset=utf-8",
          "X-NDX-Request": "signup-form",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(validSignupRequest),
          headersWithCharset,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(200)
      })
    })

    describe("request body validation", () => {
      it("should return 400 when body is invalid JSON", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", "not valid json", validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_CONTENT_TYPE,
        })
      })

      it("should return 400 REQUEST_TOO_LARGE when body exceeds 10KB", async () => {
        const largeBody = JSON.stringify({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@westbury.gov.uk",
          domain: "westbury.gov.uk",
          padding: "x".repeat(15000), // Over 10KB
        })
        const event = createMockEvent("POST", "/signup-api/signup", largeBody, validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: "REQUEST_TOO_LARGE",
          message: "Request body too large",
        })
      })

      it("should return 400 when body contains __proto__ key (prototype pollution defense)", async () => {
        // Must construct JSON string directly since JSON.stringify drops __proto__
        const maliciousBody =
          '{"firstName":"Jane","lastName":"Smith","email":"jane@westbury.gov.uk","domain":"westbury.gov.uk","__proto__":{"isAdmin":true}}'
        const event = createMockEvent("POST", "/signup-api/signup", maliciousBody, validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_CONTENT_TYPE,
        })
      })

      it("should handle body with normal constructor property (not prototype pollution)", async () => {
        // Normal objects have constructor property, but it shouldn't be detected as attack
        // The prototype pollution defense focuses on __proto__ which is the actual attack vector
        const normalBody = JSON.stringify({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@westbury.gov.uk",
          domain: "westbury.gov.uk",
        })
        const event = createMockEvent("POST", "/signup-api/signup", normalBody, validHeaders)
        const result = await handler(event)

        // Should succeed (200) since this is a valid request
        expect(result.statusCode).toBe(200)
      })

      it("should return 400 when firstName is missing", async () => {
        const requestWithoutFirstName = {
          lastName: "Smith",
          email: "jane@westbury.gov.uk",
          domain: "westbury.gov.uk",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithoutFirstName),
          validHeaders,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
      })

      it("should return 400 when lastName is missing", async () => {
        const requestWithoutLastName = {
          firstName: "Jane",
          email: "jane@westbury.gov.uk",
          domain: "westbury.gov.uk",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithoutLastName),
          validHeaders,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
      })

      it("should return 400 when email is missing", async () => {
        const requestWithoutEmail = {
          firstName: "Jane",
          lastName: "Smith",
          domain: "westbury.gov.uk",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithoutEmail), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
      })

      it("should accept the new request shape without a domain field", async () => {
        const requestWithoutDomain = {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@westbury.gov.uk",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithoutDomain), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body)).toEqual({ success: true, waitlist: false })
      })

      it("should silently strip an extra legacy domain field (no Slack/log trace)", async () => {
        const requestWithExtras = {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@westbury.gov.uk",
          domain: "not-used.example",
          secretField: "<!channel>",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithExtras), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(200)
        // Extra fields must NOT appear in any log
        consoleSpy.mock.calls.forEach((call) => {
          const logStr = call[0]
          expect(logStr).not.toContain("secretField")
          expect(logStr).not.toContain("<!channel")
          expect(logStr).not.toContain("not-used.example")
        })
      })

      it("should return 400 INVALID_EMAIL for email with non-ASCII characters", async () => {
        const requestWithUnicodeEmail = {
          ...validSignupRequest,
          email: "jаne@westbury.gov.uk", // Cyrillic 'а' instead of Latin 'a'
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithUnicodeEmail),
          validHeaders,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
        })
      })

      it("should return 400 when firstName exceeds 100 characters", async () => {
        const requestWithLongFirstName = {
          ...validSignupRequest,
          firstName: "A".repeat(101),
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithLongFirstName),
          validHeaders,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Name field too long",
        })
      })

      it("should return 400 when lastName exceeds 100 characters", async () => {
        const requestWithLongLastName = {
          ...validSignupRequest,
          lastName: "B".repeat(101),
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithLongLastName),
          validHeaders,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Name field too long",
        })
      })

      it("should return 400 when firstName contains HTML tags", async () => {
        const requestWithHtmlInName = {
          ...validSignupRequest,
          firstName: "<script>alert(1)</script>",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithHtmlInName), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Invalid characters in name",
        })
      })

      it("should return 400 when lastName contains control characters", async () => {
        const requestWithControlChars = {
          ...validSignupRequest,
          lastName: "Smith\x00Null",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithControlChars),
          validHeaders,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Invalid characters in name",
        })
      })

      it("should return 400 when firstName contains single quote", async () => {
        const requestWithQuote = {
          ...validSignupRequest,
          firstName: "O'Brien",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithQuote), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Invalid characters in name",
        })
      })

      it("should return 400 when firstName contains double quote", async () => {
        const requestWithDoubleQuote = {
          ...validSignupRequest,
          firstName: 'John"Test',
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithDoubleQuote),
          validHeaders,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Invalid characters in name",
        })
      })

      it("should return 400 when lastName contains ampersand", async () => {
        const requestWithAmpersand = {
          ...validSignupRequest,
          lastName: "Smith&Jones",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithAmpersand), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Invalid characters in name",
        })
      })

      it("should return 400 when email exceeds 254 characters (RFC 5321)", async () => {
        const requestWithLongEmail = {
          ...validSignupRequest,
          email: "a".repeat(250) + "@westbury.gov.uk",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithLongEmail), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
        })
      })

      it("should accept valid name with 100 characters (boundary test)", async () => {
        const requestWithMaxLengthName = {
          ...validSignupRequest,
          firstName: "A".repeat(100),
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithMaxLengthName),
          validHeaders,
        )
        const result = await handler(event)

        // Should proceed to domain validation (200 if all mocks pass)
        expect(result.statusCode).toBe(200)
      })
    })

    describe("domain validation", () => {
      it("should route to waitlist branch when email domain is NOT in allowlist", async () => {
        const requestWithUnallowedDomain = {
          ...validSignupRequest,
          email: "jane@notallowed.example",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithUnallowedDomain),
          validHeaders,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body)).toEqual({ success: true, waitlist: true })

        // Waitlist branch uses createUserOnly — no group membership
        expect(mockCreateUserOnly).toHaveBeenCalled()
        expect(mockCreateUser).not.toHaveBeenCalled()
      })

      it("should return 5xx SERVER_ERROR when the domain allowlist resolves empty (fail-closed)", async () => {
        mockGetDomains.mockResolvedValueOnce([])

        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(500)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.SERVER_ERROR,
        })
        // No IDC writes attempted
        expect(mockCreateUser).not.toHaveBeenCalled()
        expect(mockCreateUserOnly).not.toHaveBeenCalled()

        // ERROR log emitted
        const errorLog = consoleSpy.mock.calls.find((call) => {
          const data = JSON.parse(call[0])
          return data.level === "ERROR" && data.message.includes("empty array")
        })
        expect(errorLog).toBeDefined()
      })

      it("should return 503 when domain service fails", async () => {
        mockGetDomains.mockRejectedValueOnce(new Error("GitHub unavailable"))

        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(503)
        expect(JSON.parse(result.body)).toMatchObject({
          error: "SERVICE_UNAVAILABLE",
          message: "Service temporarily unavailable",
        })
      })
    })

    describe("user existence check", () => {
      it("should return 409 USER_EXISTS when user already exists", async () => {
        mockCheckUserExists.mockResolvedValueOnce(true)

        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(409)
        expect(JSON.parse(result.body)).toEqual({
          error: SignupErrorCode.USER_EXISTS,
          message: ERROR_MESSAGES[SignupErrorCode.USER_EXISTS],
          redirectUrl: "/login",
        })
      })

      it("should return 500 SERVER_ERROR when user check fails", async () => {
        mockCheckUserExists.mockRejectedValueOnce(new Error("IAM Identity Center unavailable"))

        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(500)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.SERVER_ERROR,
          message: ERROR_MESSAGES[SignupErrorCode.SERVER_ERROR],
        })
      })
    })

    describe("user creation", () => {
      it("should return 409 USER_EXISTS on ConflictException (race condition)", async () => {
        const conflictError = new ConflictException({ message: "User already exists", $metadata: {} })
        mockCreateUser.mockRejectedValueOnce(conflictError)

        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(409)
        expect(JSON.parse(result.body)).toEqual({
          error: SignupErrorCode.USER_EXISTS,
          message: ERROR_MESSAGES[SignupErrorCode.USER_EXISTS],
          redirectUrl: "/login",
        })
      })

      it("should return 500 SERVER_ERROR when user creation fails", async () => {
        mockCreateUser.mockRejectedValueOnce(new Error("IAM Identity Center unavailable"))

        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(500)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.SERVER_ERROR,
          message: ERROR_MESSAGES[SignupErrorCode.SERVER_ERROR],
        })
      })
    })

    describe("logging", () => {
      it("should log INFO for successful signup without PII", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        await handler(event)

        // Find the success log
        const successLog = consoleSpy.mock.calls.find((call) => {
          const data = JSON.parse(call[0])
          return data.message === "User created successfully"
        })

        expect(successLog).toBeDefined()
        const loggedData = JSON.parse(successLog[0])
        expect(loggedData).toMatchObject({
          level: "INFO",
          message: "User created successfully",
          domain: "westbury.gov.uk",
          correlationId: "test-correlation-id-12345",
        })

        // Verify no PII in any log
        consoleSpy.mock.calls.forEach((call) => {
          const logStr = call[0]
          expect(logStr).not.toContain("jane.smith@westbury.gov.uk")
          expect(logStr).not.toContain('"firstName"')
          expect(logStr).not.toContain('"lastName"')
        })
      })

      it("should log WARN for CSRF validation failure", async () => {
        const headersWithoutCsrf = {
          "Content-Type": "application/json",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(validSignupRequest),
          headersWithoutCsrf,
        )
        await handler(event)

        const warnLog = consoleSpy.mock.calls.find((call) => {
          const data = JSON.parse(call[0])
          return data.level === "WARN" && data.message.includes("CSRF")
        })

        expect(warnLog).toBeDefined()
      })

      it("should emit signupBranch=recognised in the success INFO log for an allowlisted domain", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        await handler(event)

        const successLog = consoleSpy.mock.calls
          .map((call) => JSON.parse(call[0]))
          .find((d) => d.message === "User created successfully")
        expect(successLog).toMatchObject({
          signupBranch: "recognised",
          signupDomain: "westbury.gov.uk",
        })
      })

      it("should emit signupBranch=waitlist in the success INFO log for an unlisted domain", async () => {
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify({ ...validSignupRequest, email: "jane@unknown.example" }),
          validHeaders,
        )
        await handler(event)

        const successLog = consoleSpy.mock.calls
          .map((call) => JSON.parse(call[0]))
          .find((d) => d.message === "User created successfully")
        expect(successLog).toMatchObject({
          signupBranch: "waitlist",
          signupDomain: "unknown.example",
        })
      })
    })

    describe("forbidden chars in name", () => {
      it("should reject parens in firstName (Notify ((field)) injection)", async () => {
        const requestWithParens = {
          ...validSignupRequest,
          firstName: "Robert))((evil",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithParens), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({
          error: SignupErrorCode.INVALID_EMAIL,
          message: "Invalid characters in name",
        })
      })

      it("should reject parens in lastName", async () => {
        const requestWithParens = {
          ...validSignupRequest,
          lastName: "Smith)",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithParens), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
      })
    })

    describe("Slack mrkdwn metacharacter stripping", () => {
      it("strips Slack metachars (* _ ~ ` < >) from firstName, lastName, and email", () => {
        const { stripSlackMrkdwn } = _internal
        expect(stripSlackMrkdwn("<!channel")).toBe("!channel")
        expect(stripSlackMrkdwn(">")).toBe("")
        // `|` is not stripped (it's a Slack link separator, but only meaningful inside `<...>`)
        expect(stripSlackMrkdwn("<https://evil|click>@x.com")).toBe("https://evil|click@x.com")
        expect(stripSlackMrkdwn("*_~`<>")).toBe("")
      })

      it("does not let Slack metacharacters survive into the SNS publish payload", async () => {
        process.env.EVENTS_TOPIC_ARN = "arn:aws:sns:us-west-2:000000000000:fake-topic"
        const snsClientModule = await import("@aws-sdk/client-sns")
        const snsSend = jest.spyOn(snsClientModule.SNSClient.prototype, "send") as jest.SpyInstance
        snsSend.mockResolvedValue({ MessageId: "msg-1" })

        try {
          // names containing parens fail validation, so use a clean name and
          // smuggle Slack metachars via fields that survive validation —
          // backtick/asterisk/underscore are not in FORBIDDEN_NAME_CHARS.
          const hostileRequest = {
            firstName: "*bold_italic`",
            lastName: "~strike~",
            email: "user@westbury.gov.uk",
          }
          const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(hostileRequest), validHeaders)
          await handler(event)

          // Collect every SNS publish's Message body. The intentional label
          // markup ("*User:*", "*Email:*") legitimately contains `*` for
          // bold; we only need to verify that the *raw user input*
          // (still containing metachars) does not survive into the payload.
          const publishedMessages = snsSend.mock.calls
            .map((call) => call[0] as { input?: { Message?: string } })
            .map((cmd) => cmd?.input?.Message ?? "")
          expect(publishedMessages.length).toBeGreaterThan(0)
          for (const message of publishedMessages) {
            expect(message).not.toContain(hostileRequest.firstName)
            expect(message).not.toContain(hostileRequest.lastName)
            // Stripped versions are what should appear instead.
            expect(message).toContain("bolditalic")
            expect(message).toContain("strike")
          }
        } finally {
          snsSend.mockRestore()
          delete process.env.EVENTS_TOPIC_ARN
        }
      })
    })

    describe("USER_EXISTS squatting detection", () => {
      it("logs a WARN when supplied name differs from stored IDC user", async () => {
        mockCheckUserExists.mockResolvedValueOnce(true)
        mockGetExistingUserNames.mockResolvedValueOnce({
          givenName: "Alice",
          familyName: "Different",
        })

        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(409)

        const warnLog = consoleSpy.mock.calls
          .map((call) => JSON.parse(call[0]))
          .find((d) => d.level === "WARN" && d.event === "squatting_warn")
        expect(warnLog).toBeDefined()
      })

      it("does NOT log the squatting WARN when stored name matches", async () => {
        mockCheckUserExists.mockResolvedValueOnce(true)
        mockGetExistingUserNames.mockResolvedValueOnce({
          givenName: "Jane",
          familyName: "Smith",
        })

        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        await handler(event)

        const warnLog = consoleSpy.mock.calls
          .map((call) => JSON.parse(call[0]))
          .find((d) => d.level === "WARN" && d.event === "squatting_warn")
        expect(warnLog).toBeUndefined()
      })
    })

    describe("blocklist — personal and disposable email rejection", () => {
      it("rejects a personal email (gmail.com) with WORK_EMAIL_REQUIRED", async () => {
        const req = { firstName: "Jane", lastName: "Smith", email: "jane@gmail.com" }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(req), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toEqual({
          error: SignupErrorCode.WORK_EMAIL_REQUIRED,
          message: ERROR_MESSAGES[SignupErrorCode.WORK_EMAIL_REQUIRED],
        })

        const log = consoleSpy.mock.calls
          .map((call) => JSON.parse(call[0]))
          .find((d) => d.message === "Signup rejected — blocked email provider")
        expect(log).toBeDefined()
        expect(log.signupBlocked).toBe("personal")
        expect(log.domain).toBe("gmail.com")
      })

      it("rejects via suffix match — mail.gmail.com", async () => {
        const req = { firstName: "Jane", lastName: "Smith", email: "jane@mail.gmail.com" }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(req), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body).error).toBe(SignupErrorCode.WORK_EMAIL_REQUIRED)
      })

      it("rejects a disposable email (mailinator.com) with signupBlocked: disposable", async () => {
        const req = { firstName: "Jane", lastName: "Smith", email: "jane@mailinator.com" }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(req), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body).error).toBe(SignupErrorCode.WORK_EMAIL_REQUIRED)

        const log = consoleSpy.mock.calls
          .map((call) => JSON.parse(call[0]))
          .find((d) => d.message === "Signup rejected — blocked email provider")
        expect(log?.signupBlocked).toBe("disposable")
      })

      it("is case-insensitive — GMAIL.COM still blocked", async () => {
        const req = { firstName: "Jane", lastName: "Smith", email: "jane@GMAIL.COM" }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(req), validHeaders)
        const result = await handler(event)
        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body).error).toBe(SignupErrorCode.WORK_EMAIL_REQUIRED)
      })

      it("regression: a recognised allowlisted domain still succeeds (waitlist:false)", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body)).toEqual({ success: true, waitlist: false })
      })

      it("regression: an unrecognised non-blocked domain still goes to the waitlist", async () => {
        const req = { firstName: "Jane", lastName: "Smith", email: "jane@unknown.example" }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(req), validHeaders)
        const result = await handler(event)
        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body)).toEqual({ success: true, waitlist: true })
      })

      it("blocked-path still honours the timing floor + jitter (>= TIMING_FLOOR_MS + 50)", async () => {
        jest.useRealTimers()
        const start = Date.now()
        const req = { firstName: "Jane", lastName: "Smith", email: "jane@gmail.com" }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(req), validHeaders)
        await handler(event)
        const elapsed = Date.now() - start
        expect(elapsed).toBeGreaterThanOrEqual(_internal.TIMING_FLOOR_MS + 50)
      })

      it("the blocked path runs BEFORE checkUserExists (squatting/enumeration oracle shrinks)", async () => {
        mockCheckUserExists.mockClear()
        const req = { firstName: "Jane", lastName: "Smith", email: "jane@gmail.com" }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(req), validHeaders)
        await handler(event)
        expect(mockCheckUserExists).not.toHaveBeenCalled()
      })
    })

    describe("timing-floor invariant", () => {
      // Guard against a sibling suite that called jest.useFakeTimers() and
      // failed to restore — without this, the setTimeout inside
      // awaitTimingFloor never resolves and the test hangs / fires early.
      beforeEach(() => {
        jest.useRealTimers()
      })

      it("holds responses until TIMING_FLOOR_MS plus 50-150ms jitter has elapsed", async () => {
        // Frozen spec rule: jitter adds 50-150ms ON TOP of the 400ms floor,
        // not absorbed into it. Total elapsed must be >= floor + 50ms.
        const start = Date.now()
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        await handler(event)
        const elapsed = Date.now() - start

        expect(elapsed).toBeGreaterThanOrEqual(_internal.TIMING_FLOOR_MS + 50)
      })
    })

    describe("Notify dispatch failure is non-blocking for the waitlist branch", () => {
      // The NOTIFY_TEMPLATE_WAITLIST_ADDED placeholder case is exercised by
      // the notification Lambda's existing missing-env-var path. From the
      // signup handler's perspective, the dispatch is fire-and-forget via
      // `InvocationType: "Event"` — even if Notify throws, the signup
      // handler returns success and the Slack alert still fires.
      it("returns 200 success + waitlist:true even if the Notify Lambda invoke fails", async () => {
        process.env.NOTIFICATION_LAMBDA_ARN = "arn:aws:lambda:us-west-2:000000000000:function:fake"
        process.env.EVENTS_TOPIC_ARN = "arn:aws:sns:us-west-2:000000000000:fake-topic"
        // Deterministically force the Notify Lambda invoke to reject and
        // assert the signup handler still returns 200. SNS publishes are
        // also forced to reject; both dispatches must be non-blocking.
        const lambdaClientModule = await import("@aws-sdk/client-lambda")
        const snsClientModule = await import("@aws-sdk/client-sns")
        const lambdaSend = jest.spyOn(lambdaClientModule.LambdaClient.prototype, "send") as jest.SpyInstance
        lambdaSend.mockRejectedValue(new Error("simulated notify lambda failure"))
        const snsSend = jest.spyOn(snsClientModule.SNSClient.prototype, "send") as jest.SpyInstance
        snsSend.mockRejectedValue(new Error("simulated SNS failure"))

        try {
          const event = createMockEvent(
            "POST",
            "/signup-api/signup",
            JSON.stringify({ ...validSignupRequest, email: "jane@unknown.example" }),
            validHeaders,
          )
          const result = await handler(event)

          expect(result.statusCode).toBe(200)
          expect(JSON.parse(result.body)).toEqual({ success: true, waitlist: true })
          // Confirm the dispatch attempts actually happened so the test
          // proves non-blocking behaviour and isn't passing because the
          // dispatches were skipped.
          expect(lambdaSend).toHaveBeenCalled()
          expect(snsSend).toHaveBeenCalled()
        } finally {
          lambdaSend.mockRestore()
          snsSend.mockRestore()
          delete process.env.NOTIFICATION_LAMBDA_ARN
          delete process.env.EVENTS_TOPIC_ARN
        }
      })
    })

    describe("silent strip of unknown fields (Zod .strip() semantics)", () => {
      // Spec rule (line 132): a request with extra fields produces identical
      // logs, Slack alerts, AND Notify payloads to the same request without
      // the extras. statusCode + body alone aren't enough — mock both
      // dispatches and diff the recorded call args between the two runs.
      it("produces identical statusCode/body AND identical Notify/Slack payloads with or without extra fields", async () => {
        process.env.NOTIFICATION_LAMBDA_ARN = "arn:aws:lambda:us-west-2:000000000000:function:fake"
        process.env.EVENTS_TOPIC_ARN = "arn:aws:sns:us-west-2:000000000000:fake-topic"
        const lambdaClientModule = await import("@aws-sdk/client-lambda")
        const snsClientModule = await import("@aws-sdk/client-sns")
        const lambdaSend = jest.spyOn(lambdaClientModule.LambdaClient.prototype, "send") as jest.SpyInstance
        lambdaSend.mockResolvedValue({ StatusCode: 202 })
        const snsSend = jest.spyOn(snsClientModule.SNSClient.prototype, "send") as jest.SpyInstance
        snsSend.mockResolvedValue({ MessageId: "m-1" })

        // Capture payloads from the published commands — strip variable fields
        // (correlation IDs, UUIDs, timestamps) so the diff is meaningful.
        type SendCall = { input?: unknown }
        const recordPayloads = (spy: jest.SpyInstance): Array<Record<string, unknown>> =>
          spy.mock.calls.map((call) => {
            const cmd = call[0] as SendCall
            const input = cmd?.input as { Payload?: unknown; Message?: string } | undefined
            // Lambda: Payload is a Uint8Array of JSON; SNS: Message is a JSON string.
            if (input?.Payload !== undefined) {
              const text = Buffer.from(input.Payload as Uint8Array).toString("utf-8")
              return JSON.parse(text) as Record<string, unknown>
            }
            if (typeof input?.Message === "string") {
              return JSON.parse(input.Message) as Record<string, unknown>
            }
            return {}
          })

        try {
          const baseRequest = {
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@westbury.gov.uk",
          }
          const eventBase = createMockEvent("POST", "/signup-api/signup", JSON.stringify(baseRequest), validHeaders)
          const baseResult = await handler(eventBase)
          const baseLambdaPayloads = recordPayloads(lambdaSend)
          const baseSnsPayloads = recordPayloads(snsSend)
          lambdaSend.mockClear()
          snsSend.mockClear()

          const enrichedRequest = {
            ...baseRequest,
            domain: "x",
            secretField: "<!channel>",
            junk: { nested: "value" },
          }
          const eventEnriched = createMockEvent(
            "POST",
            "/signup-api/signup",
            JSON.stringify(enrichedRequest),
            validHeaders,
          )
          const enrichedResult = await handler(eventEnriched)
          const enrichedLambdaPayloads = recordPayloads(lambdaSend)
          const enrichedSnsPayloads = recordPayloads(snsSend)

          // Response is identical.
          expect(baseResult.statusCode).toBe(enrichedResult.statusCode)
          expect(JSON.parse(baseResult.body)).toEqual(JSON.parse(enrichedResult.body))

          // Strip per-call identifiers from each payload before comparing.
          const stripVariableFields = (payload: Record<string, unknown>): Record<string, unknown> => {
            const clone: Record<string, unknown> = JSON.parse(JSON.stringify(payload))
            const visit = (obj: unknown): void => {
              if (!obj || typeof obj !== "object") return
              const rec = obj as Record<string, unknown>
              for (const key of Object.keys(rec)) {
                if (key === "id" || key === "correlationId" || key === "time") {
                  rec[key] = "<stripped>"
                }
                if (typeof rec[key] === "object") visit(rec[key])
              }
            }
            visit(clone)
            return clone
          }
          expect(baseLambdaPayloads.map(stripVariableFields)).toEqual(enrichedLambdaPayloads.map(stripVariableFields))
          expect(baseSnsPayloads.map(stripVariableFields)).toEqual(enrichedSnsPayloads.map(stripVariableFields))
          // Sanity: extras must never appear in any published payload (raw text scan).
          for (const payloads of [enrichedLambdaPayloads, enrichedSnsPayloads]) {
            const serialised = JSON.stringify(payloads)
            expect(serialised).not.toContain("secretField")
            expect(serialised).not.toContain("<!channel")
            expect(serialised).not.toContain("nested")
          }
        } finally {
          lambdaSend.mockRestore()
          snsSend.mockRestore()
          delete process.env.NOTIFICATION_LAMBDA_ARN
          delete process.env.EVENTS_TOPIC_ARN
        }
      })
    })
  })

  describe("unknown endpoints", () => {
    it("should return 404 for unknown path", async () => {
      const event = createMockEvent("GET", "/signup-api/unknown")
      const result = await handler(event)

      expect(result.statusCode).toBe(404)
      expect(JSON.parse(result.body)).toEqual({
        error: "NOT_FOUND",
        message: "Endpoint not found",
      })
    })

    it("should return 404 for wrong method on health", async () => {
      const event = createMockEvent("POST", "/signup-api/health")
      const result = await handler(event)

      expect(result.statusCode).toBe(404)
      expect(JSON.parse(result.body)).toEqual({
        error: "NOT_FOUND",
        message: "Endpoint not found",
      })
    })
  })
})

describe("successResponse", () => {
  it("should return 200 with JSON body", () => {
    const result = successResponse({ foo: "bar", count: 42 })

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual({ foo: "bar", count: 42 })
  })

  it("should include security headers", () => {
    const result = successResponse({ status: "ok" })

    expect(result.headers).toMatchObject({
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Type": "application/json",
    })
  })

  it("should include X-Request-ID header when correlationId is provided", () => {
    const result = successResponse({ status: "ok" }, "test-correlation-id")

    expect(result.headers).toMatchObject({
      "X-Request-ID": "test-correlation-id",
    })
  })

  it("should not include X-Request-ID header when correlationId is not provided", () => {
    const result = successResponse({ status: "ok" })

    expect(result.headers).not.toHaveProperty("X-Request-ID")
  })
})

describe("errorResponse", () => {
  it("should return specified status code with error body", () => {
    const result = errorResponse(400, "INVALID_INPUT", "Bad request data")

    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body)).toEqual({
      error: "INVALID_INPUT",
      message: "Bad request data",
    })
  })

  it("should include security headers", () => {
    const result = errorResponse(500, "SERVER_ERROR", "Something went wrong")

    expect(result.headers).toMatchObject({
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Type": "application/json",
    })
  })

  it("should include X-Request-ID header when correlationId is provided", () => {
    const result = errorResponse(400, "ERROR", "Test error", "test-correlation-id")

    expect(result.headers).toMatchObject({
      "X-Request-ID": "test-correlation-id",
    })
  })

  it("should not include X-Request-ID header when correlationId is not provided", () => {
    const result = errorResponse(400, "ERROR", "Test error")

    expect(result.headers).not.toHaveProperty("X-Request-ID")
  })

  it("should include extra properties in body when provided", () => {
    const result = errorResponse(409, "USER_EXISTS", "User exists", "test-id", { redirectUrl: "/login" })

    expect(JSON.parse(result.body)).toEqual({
      error: "USER_EXISTS",
      message: "User exists",
      redirectUrl: "/login",
    })
  })
})
