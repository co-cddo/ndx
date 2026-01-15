/**
 * NDX Signup Lambda - IAM Identity Store Service Tests
 *
 * Story 1.4: Tests for IAM Identity Center integration
 *
 * @module infra-signup/lib/lambda/signup/identity-store-service.test
 */

import {
  IdentitystoreClient,
  ListUsersCommand,
  CreateUserCommand,
  CreateGroupMembershipCommand,
  ConflictException,
} from "@aws-sdk/client-identitystore"
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts"
import { checkUserExists, createUser, validateConfiguration, resetClient } from "./identity-store-service"

// Mock the AWS SDK - but keep ConflictException as real class for instanceof checks
jest.mock("@aws-sdk/client-identitystore", () => {
  const actualModule = jest.requireActual("@aws-sdk/client-identitystore")
  return {
    ...actualModule,
    IdentitystoreClient: jest.fn(),
    ListUsersCommand: jest.fn(),
    CreateUserCommand: jest.fn(),
    CreateGroupMembershipCommand: jest.fn(),
  }
})

// Mock STS client for cross-account role assumption
jest.mock("@aws-sdk/client-sts", () => {
  return {
    STSClient: jest.fn(),
    AssumeRoleCommand: jest.fn(),
  }
})

const MockedIdentitystoreClient = IdentitystoreClient as jest.MockedClass<typeof IdentitystoreClient>
const MockedSTSClient = STSClient as jest.MockedClass<typeof STSClient>

describe("identity-store-service", () => {
  let mockSend: jest.Mock
  let mockStsSend: jest.Mock
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    // Reset client between tests
    resetClient()

    // Mock console.log for structured logging verification
    consoleSpy = jest.spyOn(console, "log").mockImplementation()

    // Create mock send function for Identity Store client
    mockSend = jest.fn()
    MockedIdentitystoreClient.mockImplementation(() => ({
      send: mockSend,
    }) as unknown as IdentitystoreClient)

    // Create mock send function for STS client (cross-account role assumption)
    mockStsSend = jest.fn().mockResolvedValue({
      Credentials: {
        AccessKeyId: "ASIATESTACCESSKEY",
        SecretAccessKey: "testsecretaccesskey",
        SessionToken: "testsessiontoken",
        Expiration: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      },
    })
    MockedSTSClient.mockImplementation(() => ({
      send: mockStsSend,
    }) as unknown as STSClient)

    // Set required environment variables
    process.env.IDENTITY_STORE_ID = "d-test-store-id"
    process.env.GROUP_ID = "test-group-id"
    process.env.AWS_REGION = "eu-west-2"
    process.env.CROSS_ACCOUNT_ROLE_ARN = "arn:aws:iam::955063685555:role/test-cross-account-role"
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    jest.clearAllMocks()
    delete process.env.IDENTITY_STORE_ID
    delete process.env.GROUP_ID
    delete process.env.AWS_REGION
    delete process.env.CROSS_ACCOUNT_ROLE_ARN
  })

  describe("validateConfiguration", () => {
    it("should not throw when all required environment variables are set", () => {
      expect(() => validateConfiguration()).not.toThrow()
    })

    it("should throw when IDENTITY_STORE_ID is missing", () => {
      delete process.env.IDENTITY_STORE_ID

      expect(() => validateConfiguration()).toThrow("IDENTITY_STORE_ID environment variable is required")
    })

    it("should throw when GROUP_ID is missing", () => {
      delete process.env.GROUP_ID

      expect(() => validateConfiguration()).toThrow("GROUP_ID environment variable is required")
    })
  })

  describe("checkUserExists", () => {
    it("should return true when user exists", async () => {
      mockSend.mockResolvedValueOnce({
        Users: [{ UserId: "existing-user-id", UserName: "test@example.gov.uk" }],
      })

      const result = await checkUserExists("test@example.gov.uk", "test-correlation-id")

      expect(result).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(expect.any(ListUsersCommand))
    })

    it("should return false when user does not exist", async () => {
      mockSend.mockResolvedValueOnce({
        Users: [],
      })

      const result = await checkUserExists("newuser@example.gov.uk", "test-correlation-id")

      expect(result).toBe(false)
    })

    it("should return false when Users array is undefined", async () => {
      mockSend.mockResolvedValueOnce({})

      const result = await checkUserExists("newuser@example.gov.uk", "test-correlation-id")

      expect(result).toBe(false)
    })

    it("should use correct filter for email lookup", async () => {
      mockSend.mockResolvedValueOnce({ Users: [] })

      await checkUserExists("test@example.gov.uk", "test-correlation-id")

      // Verify the command was called
      const commandArg = mockSend.mock.calls[0][0]
      expect(commandArg).toBeInstanceOf(ListUsersCommand)
      // Access input via the command constructor pattern
      expect(ListUsersCommand).toHaveBeenCalledWith({
        IdentityStoreId: "d-test-store-id",
        Filters: [
          {
            AttributePath: "UserName",
            AttributeValue: "test@example.gov.uk",
          },
        ],
      })
    })

    it("should log DEBUG message for user existence check", async () => {
      mockSend.mockResolvedValueOnce({ Users: [] })

      await checkUserExists("test@example.gov.uk", "test-correlation-id")

      const debugLogs = consoleSpy.mock.calls.filter((call) => {
        const data = JSON.parse(call[0])
        return data.level === "DEBUG"
      })

      expect(debugLogs.length).toBeGreaterThan(0)
      expect(JSON.parse(debugLogs[0][0])).toMatchObject({
        level: "DEBUG",
        message: "Checking if user exists",
        correlationId: "test-correlation-id",
      })
    })

    it("should throw and log error on AWS SDK failure", async () => {
      const error = new Error("Access Denied")
      mockSend.mockRejectedValueOnce(error)

      await expect(checkUserExists("test@example.gov.uk", "test-correlation-id")).rejects.toThrow("Access Denied")

      const errorLog = consoleSpy.mock.calls.find((call) => {
        const data = JSON.parse(call[0])
        return data.level === "ERROR"
      })

      expect(errorLog).toBeDefined()
      expect(JSON.parse(errorLog[0])).toMatchObject({
        level: "ERROR",
        message: "Failed to check user existence",
        error: "Access Denied",
        correlationId: "test-correlation-id",
      })
    })
  })

  describe("createUser", () => {
    const validRequest = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.gov.uk",
      domain: "example.gov.uk",
    }

    it("should create user and add to group on success", async () => {
      mockSend
        .mockResolvedValueOnce({ UserId: "new-user-id" }) // CreateUserCommand
        .mockResolvedValueOnce({ MembershipId: "membership-id" }) // CreateGroupMembershipCommand

      const result = await createUser(validRequest, "test-correlation-id")

      expect(result).toBe("new-user-id")
      expect(mockSend).toHaveBeenCalledTimes(2)
      expect(mockSend).toHaveBeenNthCalledWith(1, expect.any(CreateUserCommand))
      expect(mockSend).toHaveBeenNthCalledWith(2, expect.any(CreateGroupMembershipCommand))
    })

    it("should use correct parameters for CreateUserCommand", async () => {
      mockSend
        .mockResolvedValueOnce({ UserId: "new-user-id" })
        .mockResolvedValueOnce({ MembershipId: "membership-id" })

      await createUser(validRequest, "test-correlation-id")

      const createUserCommand = mockSend.mock.calls[0][0]
      expect(createUserCommand).toBeInstanceOf(CreateUserCommand)
      // Verify command constructor was called with correct parameters
      expect(CreateUserCommand).toHaveBeenCalledWith({
        IdentityStoreId: "d-test-store-id",
        UserName: "jane.smith@example.gov.uk",
        DisplayName: "Jane Smith",
        Name: {
          GivenName: "Jane",
          FamilyName: "Smith",
        },
        Emails: [
          {
            Value: "jane.smith@example.gov.uk",
            Primary: true,
          },
        ],
      })
    })

    it("should use correct parameters for CreateGroupMembershipCommand", async () => {
      mockSend
        .mockResolvedValueOnce({ UserId: "new-user-id" })
        .mockResolvedValueOnce({ MembershipId: "membership-id" })

      await createUser(validRequest, "test-correlation-id")

      const groupMembershipCommand = mockSend.mock.calls[1][0]
      expect(groupMembershipCommand).toBeInstanceOf(CreateGroupMembershipCommand)
      // Verify command constructor was called with correct parameters
      expect(CreateGroupMembershipCommand).toHaveBeenCalledWith({
        IdentityStoreId: "d-test-store-id",
        GroupId: "test-group-id",
        MemberId: {
          UserId: "new-user-id",
        },
      })
    })

    it("should throw ConflictException when user already exists", async () => {
      const conflictError = new ConflictException({ message: "User already exists", $metadata: {} })
      mockSend.mockRejectedValueOnce(conflictError)

      await expect(createUser(validRequest, "test-correlation-id")).rejects.toThrow(ConflictException)
    })

    it("should log WARN when user already exists (conflict)", async () => {
      const conflictError = new ConflictException({ message: "User already exists", $metadata: {} })
      mockSend.mockRejectedValueOnce(conflictError)

      await expect(createUser(validRequest, "test-correlation-id")).rejects.toThrow()

      const warnLog = consoleSpy.mock.calls.find((call) => {
        const data = JSON.parse(call[0])
        return data.level === "WARN" && data.message.includes("already exists")
      })

      expect(warnLog).toBeDefined()
      expect(JSON.parse(warnLog[0])).toMatchObject({
        level: "WARN",
        message: "User already exists (conflict)",
        domain: "example.gov.uk",
        correlationId: "test-correlation-id",
      })
    })

    it("should throw error when CreateUser does not return UserId", async () => {
      mockSend.mockResolvedValueOnce({}) // No UserId

      await expect(createUser(validRequest, "test-correlation-id")).rejects.toThrow(
        "CreateUser did not return a UserId",
      )
    })

    it("should log INFO messages for successful creation", async () => {
      mockSend
        .mockResolvedValueOnce({ UserId: "new-user-id" })
        .mockResolvedValueOnce({ MembershipId: "membership-id" })

      await createUser(validRequest, "test-correlation-id")

      const infoLogs = consoleSpy.mock.calls.filter((call) => {
        const data = JSON.parse(call[0])
        return data.level === "INFO"
      })

      // Should have logs for: creating user, adding to group, success
      expect(infoLogs.length).toBeGreaterThanOrEqual(2)

      // Verify final success log
      const successLog = infoLogs.find((call) => {
        const data = JSON.parse(call[0])
        return data.message.includes("successfully")
      })
      expect(successLog).toBeDefined()
      expect(JSON.parse(successLog[0])).toMatchObject({
        level: "INFO",
        message: "User created and added to group successfully",
        domain: "example.gov.uk",
        correlationId: "test-correlation-id",
      })
    })

    it("should not log PII (email or name)", async () => {
      mockSend
        .mockResolvedValueOnce({ UserId: "new-user-id" })
        .mockResolvedValueOnce({ MembershipId: "membership-id" })

      await createUser(validRequest, "test-correlation-id")

      // Check that no log contains the email or name
      consoleSpy.mock.calls.forEach((call) => {
        const logStr = call[0]
        expect(logStr).not.toContain("jane.smith@example.gov.uk")
        expect(logStr).not.toContain('"firstName"')
        expect(logStr).not.toContain('"lastName"')
        expect(logStr).not.toContain('"Jane"')
        expect(logStr).not.toContain('"Smith"')
      })
    })

    it("should throw and log error on non-conflict AWS SDK failure", async () => {
      const error = new Error("Service Unavailable")
      mockSend.mockRejectedValueOnce(error)

      await expect(createUser(validRequest, "test-correlation-id")).rejects.toThrow("Service Unavailable")

      const errorLog = consoleSpy.mock.calls.find((call) => {
        const data = JSON.parse(call[0])
        return data.level === "ERROR"
      })

      expect(errorLog).toBeDefined()
      expect(JSON.parse(errorLog[0])).toMatchObject({
        level: "ERROR",
        message: "Failed to create user",
        error: "Service Unavailable",
        domain: "example.gov.uk",
        correlationId: "test-correlation-id",
      })
    })
  })

  describe("client reuse", () => {
    it("should reuse client across multiple calls", async () => {
      mockSend.mockResolvedValue({ Users: [] })

      await checkUserExists("test1@example.gov.uk", "id-1")
      await checkUserExists("test2@example.gov.uk", "id-2")

      // Client should only be constructed once
      expect(MockedIdentitystoreClient).toHaveBeenCalledTimes(1)
    })

    it("should create new client after reset", async () => {
      mockSend.mockResolvedValue({ Users: [] })

      await checkUserExists("test1@example.gov.uk", "id-1")
      resetClient()
      await checkUserExists("test2@example.gov.uk", "id-2")

      // Client should be constructed twice
      expect(MockedIdentitystoreClient).toHaveBeenCalledTimes(2)
    })
  })
})
