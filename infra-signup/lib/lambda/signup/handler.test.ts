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
import { handler, successResponse, errorResponse } from "./handler"
import * as domainService from "./domain-service"
import * as identityStoreService from "./identity-store-service"
import { SignupErrorCode, ERROR_MESSAGES } from "@ndx/signup-types"

// Mock the domain service
jest.mock("./domain-service")
// Mock the identity store service
jest.mock("./identity-store-service")

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
    const mockGetDomains = domainService.getDomains as jest.MockedFunction<
      typeof domainService.getDomains
    >

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
      domain: "westbury.gov.uk",
    }

    const validHeaders = {
      "Content-Type": "application/json",
      "X-NDX-Request": "signup-form",
    }

    beforeEach(() => {
      mockGetDomains.mockReset()
      mockCheckUserExists.mockReset()
      mockCreateUser.mockReset()

      // Default mocks for happy path
      mockGetDomains.mockResolvedValue(sampleDomains)
      mockCheckUserExists.mockResolvedValue(false)
      mockCreateUser.mockResolvedValue("new-user-id")
    })

    describe("successful signup", () => {
      it("should return 200 with success true on valid signup", async () => {
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(validSignupRequest), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body)).toEqual({ success: true })
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
            domain: "westbury.gov.uk",
          }),
          "test-correlation-id-12345",
        )
      })
    })

    describe("email normalization", () => {
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
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithoutFirstName), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
      })

      it("should return 400 when lastName is missing", async () => {
        const requestWithoutLastName = {
          firstName: "Jane",
          email: "jane@westbury.gov.uk",
          domain: "westbury.gov.uk",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithoutLastName), validHeaders)
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

      it("should return 400 when domain is missing", async () => {
        const requestWithoutDomain = {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@westbury.gov.uk",
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithoutDomain), validHeaders)
        const result = await handler(event)

        expect(result.statusCode).toBe(400)
      })

      it("should return 400 INVALID_EMAIL for email with non-ASCII characters", async () => {
        const requestWithUnicodeEmail = {
          ...validSignupRequest,
          email: "jаne@westbury.gov.uk", // Cyrillic 'а' instead of Latin 'a'
        }
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithUnicodeEmail), validHeaders)
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
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithLongFirstName), validHeaders)
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
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithLongLastName), validHeaders)
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
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithControlChars), validHeaders)
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
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithDoubleQuote), validHeaders)
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
        const event = createMockEvent("POST", "/signup-api/signup", JSON.stringify(requestWithMaxLengthName), validHeaders)
        const result = await handler(event)

        // Should proceed to domain validation (200 if all mocks pass)
        expect(result.statusCode).toBe(200)
      })
    })

    describe("domain validation", () => {
      it("should return 403 DOMAIN_NOT_ALLOWED when email domain is not in allowlist", async () => {
        const requestWithUnallowedDomain = {
          ...validSignupRequest,
          email: "jane@notallowed.gov.uk",
          domain: "notallowed.gov.uk",
        }
        const event = createMockEvent(
          "POST",
          "/signup-api/signup",
          JSON.stringify(requestWithUnallowedDomain),
          validHeaders,
        )
        const result = await handler(event)

        expect(result.statusCode).toBe(403)
        expect(JSON.parse(result.body)).toEqual({
          error: SignupErrorCode.DOMAIN_NOT_ALLOWED,
          message: ERROR_MESSAGES[SignupErrorCode.DOMAIN_NOT_ALLOWED],
        })
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
