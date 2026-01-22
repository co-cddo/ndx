/**
 * Unit tests for Sessions Service
 *
 * Story 7.2: Fetch and display user leases
 *
 * Tests:
 * - fetchUserLeases() success and error scenarios
 * - API response format handling (various formats)
 * - Lease transformation and normalization
 * - Helper functions (isLeaseActive, isLeasePending, getSsoUrl)
 * - Error message mapping
 *
 * @jest-environment jsdom
 */

import {
  fetchUserLeases,
  isLeaseActive,
  isLeasePending,
  getSsoUrl,
  getPortalUrl,
  getCfnConsoleUrl,
  Lease,
  LeaseStatus,
} from "./sessions-service"
import { checkAuthStatus, callISBAPI } from "./api-client"
import { authState } from "../auth/auth-provider"

// Mock the api-client module
jest.mock("./api-client", () => ({
  checkAuthStatus: jest.fn(),
  callISBAPI: jest.fn(),
}))

// Mock the auth-provider module
jest.mock("../auth/auth-provider", () => ({
  authState: {
    logout: jest.fn(),
    isAuthenticated: jest.fn(),
    subscribe: jest.fn(),
    notify: jest.fn(),
    login: jest.fn(),
  },
}))

// Mock the config module
jest.mock("../config", () => ({
  config: {
    awsSsoPortalUrl: "https://test.awsapps.com/start",
    ssoRoleName: "test_role",
    apiBaseUrl: "/api",
    requestTimeout: 10000,
    oauthLoginUrl: "/api/auth/login",
  },
}))

describe("Sessions Service", () => {
  const mockCheckAuthStatus = checkAuthStatus as jest.MockedFunction<typeof checkAuthStatus>
  const mockCallISBAPI = callISBAPI as jest.MockedFunction<typeof callISBAPI>
  const mockAuthState = authState as jest.Mocked<typeof authState>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("fetchUserLeases", () => {
    const mockAuthenticatedUser = {
      authenticated: true,
      user: {
        email: "test@example.gov.uk",
        displayName: "Test User",
        userName: "testuser",
        roles: ["user"],
      },
    }

    const mockRawLease = {
      leaseId: "lease-123",
      uuid: "uuid-123",
      userEmail: "test@example.gov.uk",
      awsAccountId: "123456789012",
      originalLeaseTemplateUuid: "template-uuid-123",
      originalLeaseTemplateName: "AWS Lambda Sandbox",
      status: "Active",
      startDate: "2025-01-01T00:00:00Z",
      expirationDate: "2025-01-02T00:00:00Z",
      maxSpend: 50,
      totalCostAccrued: 10.5,
      leaseDurationInHours: 24,
      createdBy: "test@example.gov.uk",
      approvedBy: "admin@example.gov.uk",
      meta: {
        createdTime: "2025-01-01T00:00:00Z",
        lastEditTime: "2025-01-01T01:00:00Z",
        schemaVersion: 1,
      },
    }

    describe("Success scenarios", () => {
      it("should fetch leases successfully with standard API response format", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: {
                result: [mockRawLease],
                nextPageIdentifier: null,
              },
            }),
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(true)
        expect(result.leases).toHaveLength(1)
        expect(result.leases?.[0].leaseId).toBe("lease-123")
        expect(result.leases?.[0].status).toBe("Active")
        expect(result.leases?.[0].awsAccountId).toBe("123456789012")
      })

      it("should handle direct array response format", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockRawLease]),
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(true)
        expect(result.leases).toHaveLength(1)
      })

      it("should handle legacy { leases: [] } response format", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ leases: [mockRawLease] }),
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(true)
        expect(result.leases).toHaveLength(1)
      })

      it("should return empty array when no leases exist", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: { result: [], nextPageIdentifier: null },
            }),
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(true)
        expect(result.leases).toHaveLength(0)
      })

      it("should sort leases by createdAt descending (newest first)", async () => {
        const olderLease = {
          ...mockRawLease,
          leaseId: "older",
          meta: { ...mockRawLease.meta, createdTime: "2025-01-01T00:00:00Z" },
        }
        const newerLease = {
          ...mockRawLease,
          leaseId: "newer",
          meta: { ...mockRawLease.meta, createdTime: "2025-01-15T00:00:00Z" },
        }

        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: { result: [olderLease, newerLease], nextPageIdentifier: null },
            }),
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(true)
        expect(result.leases?.[0].leaseId).toBe("newer")
        expect(result.leases?.[1].leaseId).toBe("older")
      })

      it("should call API with encoded user email", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce({
          ...mockAuthenticatedUser,
          user: { ...mockAuthenticatedUser.user, email: "test+special@example.gov.uk" },
        })
        mockCallISBAPI.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: "success", data: { result: [] } }),
        } as Response)

        await fetchUserLeases()

        expect(mockCallISBAPI).toHaveBeenCalledWith(
          expect.stringContaining("test%2Bspecial%40example.gov.uk"),
          expect.any(Object),
        )
      })
    })

    describe("Authentication errors", () => {
      it("should return error when user is not authenticated", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce({ authenticated: false })

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Please sign in to view your sessions.")
        expect(mockCallISBAPI).not.toHaveBeenCalled()
      })

      it("should return error when user email is not available", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce({
          authenticated: true,
          user: undefined,
        })

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Please sign in to view your sessions.")
      })

      // DEFECT FIX: Verify invalid token is cleared when auth fails
      it("should call authState.logout() when checkAuthStatus returns authenticated: false", async () => {
        // Scenario: Token exists in sessionStorage but is invalid server-side
        // API returns 200 with { authenticated: false, message: "Invalid token" }
        mockCheckAuthStatus.mockResolvedValueOnce({ authenticated: false })

        await fetchUserLeases()

        // Verify logout was called to clear the invalid token and notify UI subscribers
        expect(mockAuthState.logout).toHaveBeenCalledTimes(1)
      })

      it("should call authState.logout() when user email is missing", async () => {
        // Scenario: Auth status returns authenticated: true but no user data
        mockCheckAuthStatus.mockResolvedValueOnce({
          authenticated: true,
          user: undefined,
        })

        await fetchUserLeases()

        // Verify logout was called to clear inconsistent state
        expect(mockAuthState.logout).toHaveBeenCalledTimes(1)
      })

      it("should call authState.logout() when user has no email", async () => {
        // Scenario: User object exists but email field is missing
        mockCheckAuthStatus.mockResolvedValueOnce({
          authenticated: true,
          user: {
            email: "", // Empty email
            displayName: "Test User",
            userName: "testuser",
            roles: ["user"],
          },
        })

        await fetchUserLeases()

        // Verify logout was called for incomplete auth state
        expect(mockAuthState.logout).toHaveBeenCalledTimes(1)
      })

      it("should NOT call authState.logout() when user is properly authenticated", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ status: "success", data: { result: [] } }),
        } as Response)

        await fetchUserLeases()

        // Verify logout was NOT called for valid auth
        expect(mockAuthState.logout).not.toHaveBeenCalled()
      })
    })

    describe("API errors", () => {
      it("should handle 401 Unauthorized", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Please sign in to view your sessions.")
      })

      it("should handle 403 Forbidden", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toBe("You do not have permission to view sessions.")
      })

      it("should handle 404 Not Found", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Sessions not found.")
      })

      it("should handle 500 Server Error", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toBe("The sandbox service is temporarily unavailable. Please try again later.")
      })

      it("should handle 503 Service Unavailable", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toContain("temporarily unavailable")
      })

      it("should handle unknown status codes", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: false,
          status: 418,
          statusText: "I'm a teapot",
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toBe("An unexpected error occurred. Please try again.")
      })
    })

    describe("Network errors", () => {
      it("should handle network failure", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockRejectedValueOnce(new Error("Network error"))

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Unable to load your sessions. Please try again.")
      })

      it("should handle Unauthorized redirect error from callISBAPI", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockRejectedValueOnce(new Error("Unauthorized - redirecting to login"))

        const result = await fetchUserLeases()

        expect(result.success).toBe(false)
        expect(result.error).toBe("Please sign in to view your sessions.")
      })
    })

    describe("Lease status transformation", () => {
      const statusTests: { apiStatus: string; expectedStatus: LeaseStatus }[] = [
        { apiStatus: "PendingApproval", expectedStatus: "PendingApproval" },
        { apiStatus: "ApprovalDenied", expectedStatus: "ApprovalDenied" },
        { apiStatus: "Active", expectedStatus: "Active" },
        { apiStatus: "Frozen", expectedStatus: "Frozen" },
        { apiStatus: "Expired", expectedStatus: "Expired" },
        { apiStatus: "BudgetExceeded", expectedStatus: "BudgetExceeded" },
        { apiStatus: "ManuallyTerminated", expectedStatus: "ManuallyTerminated" },
        { apiStatus: "AccountQuarantined", expectedStatus: "AccountQuarantined" },
        { apiStatus: "Ejected", expectedStatus: "Ejected" },
        { apiStatus: "Unknown", expectedStatus: "Expired" }, // Default fallback
      ]

      statusTests.forEach(({ apiStatus, expectedStatus }) => {
        it(`should transform API status "${apiStatus}" to "${expectedStatus}"`, async () => {
          const leaseWithStatus = { ...mockRawLease, status: apiStatus }
          mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
          mockCallISBAPI.mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                status: "success",
                data: { result: [leaseWithStatus] },
              }),
          } as Response)

          const result = await fetchUserLeases()

          expect(result.success).toBe(true)
          expect(result.leases?.[0].status).toBe(expectedStatus)
        })
      })
    })

    describe("Lease field transformation", () => {
      it("should transform all lease fields correctly", async () => {
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: { result: [mockRawLease] },
            }),
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(true)
        const lease = result.leases?.[0]
        expect(lease).toMatchObject({
          leaseId: "lease-123",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-uuid-123",
          leaseTemplateName: "AWS Lambda Sandbox",
          status: "Active",
          createdAt: "2025-01-01T00:00:00Z",
          expiresAt: "2025-01-02T00:00:00Z",
          maxSpend: 50,
          currentSpend: 10.5,
        })
      })

      it("should use startDate as fallback when meta.createdTime is missing", async () => {
        const leaseWithoutMeta = { ...mockRawLease, meta: undefined }
        mockCheckAuthStatus.mockResolvedValueOnce(mockAuthenticatedUser)
        mockCallISBAPI.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              status: "success",
              data: { result: [leaseWithoutMeta] },
            }),
        } as Response)

        const result = await fetchUserLeases()

        expect(result.success).toBe(true)
        expect(result.leases?.[0].createdAt).toBe("2025-01-01T00:00:00Z")
      })
    })
  })

  describe("isLeaseActive", () => {
    it("should return true for Active status", () => {
      const lease: Lease = {
        leaseId: "1",
        awsAccountId: "123",
        leaseTemplateId: "template",
        leaseTemplateName: "Test",
        status: "Active",
        createdAt: "2025-01-01",
        expiresAt: "2025-01-02",
        maxSpend: 50,
        currentSpend: 0,
      }

      expect(isLeaseActive(lease)).toBe(true)
    })

    it("should return false for non-Active statuses", () => {
      const statuses: LeaseStatus[] = ["PendingApproval", "Expired", "ApprovalDenied", "ManuallyTerminated"]

      statuses.forEach((status) => {
        const lease: Lease = {
          leaseId: "1",
          awsAccountId: "123",
          leaseTemplateId: "template",
          leaseTemplateName: "Test",
          status,
          createdAt: "2025-01-01",
          expiresAt: "2025-01-02",
          maxSpend: 50,
          currentSpend: 0,
        }

        expect(isLeaseActive(lease)).toBe(false)
      })
    })
  })

  describe("isLeasePending", () => {
    it("should return true for PendingApproval status", () => {
      const lease: Lease = {
        leaseId: "1",
        awsAccountId: "123",
        leaseTemplateId: "template",
        leaseTemplateName: "Test",
        status: "PendingApproval",
        createdAt: "2025-01-01",
        expiresAt: "2025-01-02",
        maxSpend: 50,
        currentSpend: 0,
      }

      expect(isLeasePending(lease)).toBe(true)
    })

    it("should return false for non-PendingApproval statuses", () => {
      const statuses: LeaseStatus[] = ["Active", "Expired", "ApprovalDenied", "ManuallyTerminated"]

      statuses.forEach((status) => {
        const lease: Lease = {
          leaseId: "1",
          awsAccountId: "123",
          leaseTemplateId: "template",
          leaseTemplateName: "Test",
          status,
          createdAt: "2025-01-01",
          expiresAt: "2025-01-02",
          maxSpend: 50,
          currentSpend: 0,
        }

        expect(isLeasePending(lease)).toBe(false)
      })
    })
  })

  describe("getSsoUrl", () => {
    it("should build SSO URL from config when lease has no custom URL", () => {
      const lease: Lease = {
        leaseId: "1",
        awsAccountId: "123456789012",
        leaseTemplateId: "template",
        leaseTemplateName: "Test",
        status: "Active",
        createdAt: "2025-01-01",
        expiresAt: "2025-01-02",
        maxSpend: 50,
        currentSpend: 0,
      }

      const url = getSsoUrl(lease)

      expect(url).toBe("https://test.awsapps.com/start/#/console?account_id=123456789012&role_name=test_role")
    })

    it("should use custom SSO URL when lease has one", () => {
      const lease: Lease = {
        leaseId: "1",
        awsAccountId: "123456789012",
        leaseTemplateId: "template",
        leaseTemplateName: "Test",
        status: "Active",
        createdAt: "2025-01-01",
        expiresAt: "2025-01-02",
        maxSpend: 50,
        currentSpend: 0,
        awsSsoPortalUrl: "https://custom.example.com/sso",
      }

      const url = getSsoUrl(lease)

      expect(url).toBe("https://custom.example.com/sso")
    })
  })

  describe("getPortalUrl", () => {
    it("should return portal URL with account_id when lease has no custom URL", () => {
      const lease: Lease = {
        leaseId: "1",
        awsAccountId: "123456789012",
        leaseTemplateId: "template",
        leaseTemplateName: "Test",
        status: "Active",
        createdAt: "2025-01-01",
        expiresAt: "2025-01-02",
        maxSpend: 50,
        currentSpend: 0,
      }

      const url = getPortalUrl(lease)

      expect(url).toBe("https://test.awsapps.com/start/#/console?account_id=123456789012")
    })

    it("should use custom portal URL when lease has one", () => {
      const lease: Lease = {
        leaseId: "1",
        awsAccountId: "123456789012",
        leaseTemplateId: "template",
        leaseTemplateName: "Test",
        status: "Active",
        createdAt: "2025-01-01",
        expiresAt: "2025-01-02",
        maxSpend: 50,
        currentSpend: 0,
        awsSsoPortalUrl: "https://custom.example.com/sso",
      }

      const url = getPortalUrl(lease)

      expect(url).toBe("https://custom.example.com/sso")
    })
  })

  describe("getCfnConsoleUrl", () => {
    it("should return CloudFormation console URL with default region (us-east-1)", () => {
      const lease: Lease = {
        leaseId: "1",
        awsAccountId: "123456789012",
        leaseTemplateId: "template",
        leaseTemplateName: "Test",
        status: "Active",
        createdAt: "2025-01-01",
        expiresAt: "2025-01-02",
        maxSpend: 50,
        currentSpend: 0,
      }

      const url = getCfnConsoleUrl(lease)

      expect(url).toBe("https://us-east-1.console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks")
    })

    it("should accept a custom region parameter", () => {
      const lease: Lease = {
        leaseId: "1",
        awsAccountId: "123456789012",
        leaseTemplateId: "template",
        leaseTemplateName: "Test",
        status: "Active",
        createdAt: "2025-01-01",
        expiresAt: "2025-01-02",
        maxSpend: 50,
        currentSpend: 0,
      }

      const url = getCfnConsoleUrl(lease, "eu-west-1")

      expect(url).toBe("https://eu-west-1.console.aws.amazon.com/cloudformation/home?region=eu-west-1#/stacks")
    })

    it("should work with us-west-2 region", () => {
      const lease: Lease = {
        leaseId: "1",
        awsAccountId: "123456789012",
        leaseTemplateId: "template",
        leaseTemplateName: "Test",
        status: "Active",
        createdAt: "2025-01-01",
        expiresAt: "2025-01-02",
        maxSpend: 50,
        currentSpend: 0,
      }

      const url = getCfnConsoleUrl(lease, "us-west-2")

      expect(url).toBe("https://us-west-2.console.aws.amazon.com/cloudformation/home?region=us-west-2#/stacks")
    })
  })
})
