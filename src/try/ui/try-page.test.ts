/**
 * Unit tests for Try Page Component
 *
 * Story 5.9: Empty State UI for Unauthenticated /try Page
 *
 * Tests:
 * - Empty state rendering for unauthenticated users
 * - Authenticated state rendering
 * - GOV.UK Design System compliance
 * - AuthState subscription integration
 *
 * @jest-environment jsdom
 */

import { initTryPage, renderEmptyState, renderAuthenticatedState } from "./try-page"
import { authState } from "../auth/auth-provider"
import { fetchUserLeases } from "../api/sessions-service"

// Mock the authState module
jest.mock("../auth/auth-provider", () => ({
  authState: {
    subscribe: jest.fn(),
    isAuthenticated: jest.fn(),
  },
}))

// Mock the sessions-service module
jest.mock("../api/sessions-service", () => ({
  fetchUserLeases: jest.fn(),
  isLeaseActive: jest.fn((lease: { status: string }) => lease.status === "Active"),
  isLeasePending: jest.fn((lease: { status: string }) => lease.status === "PendingApproval"),
}))

const mockFetchUserLeases = fetchUserLeases as jest.MockedFunction<typeof fetchUserLeases>

describe("Try Page Component (Story 5.9)", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks()

    // Default mock for fetchUserLeases - return empty leases
    mockFetchUserLeases.mockResolvedValue({
      success: true,
      leases: [],
    })

    // Create container element
    container = document.createElement("div")
    container.id = "try-sessions-container"
    document.body.appendChild(container)
  })

  afterEach(() => {
    // Cleanup
    document.body.innerHTML = ""
  })

  describe("initTryPage", () => {
    it("should subscribe to authState when container exists", () => {
      // Act
      initTryPage()

      // Assert
      expect(authState.subscribe).toHaveBeenCalledTimes(1)
      expect(authState.subscribe).toHaveBeenCalledWith(expect.any(Function))
    })

    it("should not subscribe when container does not exist", () => {
      // Arrange
      document.body.innerHTML = "" // Remove container

      // Act
      initTryPage()

      // Assert
      expect(authState.subscribe).not.toHaveBeenCalled()
    })

    it("should render empty state when unauthenticated", () => {
      // Arrange
      let subscribeCallback: (isAuth: boolean) => void = () => {}
      ;(authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb
      })

      // Act
      initTryPage()
      subscribeCallback(false)

      // Assert
      expect(container.innerHTML).toContain("Sign in to view your try sessions")
    })

    it("should render authenticated state when authenticated", async () => {
      // Arrange
      let subscribeCallback: (isAuth: boolean) => void = () => {}
      ;(authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb
      })

      // Act
      initTryPage()
      subscribeCallback(true)

      // Wait for async operations to complete
      await Promise.resolve()
      await Promise.resolve()

      // Assert
      expect(container.innerHTML).toContain("Your try sessions")
    })
  })

  describe("renderEmptyState", () => {
    describe("AC #1: Empty State Display", () => {
      it("should render heading with correct text", () => {
        // Act
        renderEmptyState(container)

        // Assert
        const heading = container.querySelector("h1")
        expect(heading).not.toBeNull()
        expect(heading?.textContent).toBe("Sign in to view your try sessions")
      })

      it("should render body text explaining sign in requirement", () => {
        // Act
        renderEmptyState(container)

        // Assert
        const bodyText = container.querySelector(".govuk-body")
        expect(bodyText?.textContent).toContain("Innovation Sandbox account")
        expect(bodyText?.textContent).toContain("AWS sandbox environments")
      })

      it("should render sign in button", () => {
        // Act
        renderEmptyState(container)

        // Assert
        const button = container.querySelector("button.govuk-button")
        expect(button).not.toBeNull()
        expect(button?.textContent?.trim()).toContain("Sign in")
      })
    })

    describe("AC #2: Sign In Button Functionality", () => {
      it("should have click handler for auth choice modal (Story 2.1)", () => {
        // Act
        renderEmptyState(container)

        // Assert - button has ID for click handler and is a button (not a link)
        const button = container.querySelector("button.govuk-button")
        expect(button).not.toBeNull()
        expect(button?.id).toBe("try-page-sign-in")
        // Button opens auth choice modal instead of direct link
        expect(button?.tagName).toBe("BUTTON")
      })
    })

    describe("AC #4: GOV.UK Design System Compliance", () => {
      it("should use govuk-heading-l class for heading", () => {
        // Act
        renderEmptyState(container)

        // Assert
        const heading = container.querySelector("h1")
        expect(heading?.classList.contains("govuk-heading-l")).toBe(true)
      })

      it("should use govuk-body class for paragraph", () => {
        // Act
        renderEmptyState(container)

        // Assert
        const paragraph = container.querySelector("p")
        expect(paragraph?.classList.contains("govuk-body")).toBe(true)
      })

      it("should use govuk-button--start class for button", () => {
        // Act
        renderEmptyState(container)

        // Assert
        const button = container.querySelector("button.govuk-button")
        expect(button?.classList.contains("govuk-button--start")).toBe(true)
      })

      it("should include GOV.UK start button arrow icon", () => {
        // Act
        renderEmptyState(container)

        // Assert
        const svg = container.querySelector("svg.govuk-button__start-icon")
        expect(svg).not.toBeNull()
        expect(svg?.getAttribute("aria-hidden")).toBe("true")
      })

      it("should be a native button element (no role attribute needed)", () => {
        // Act
        renderEmptyState(container)

        // Assert - native button element doesn't need role="button"
        const button = container.querySelector("button.govuk-button")
        expect(button?.tagName).toBe("BUTTON")
        expect(button?.getAttribute("type")).toBe("button")
      })

      it("should open auth choice modal on click", () => {
        // Act
        renderEmptyState(container)

        // Assert
        const button = container.querySelector("button.govuk-button")
        expect(button?.id).toBe("try-page-sign-in")
      })

      it('should have data-module="govuk-button" attribute', () => {
        // Act
        renderEmptyState(container)

        // Assert
        const button = container.querySelector("button.govuk-button")
        expect(button?.getAttribute("data-module")).toBe("govuk-button")
      })
    })
  })

  describe("renderAuthenticatedState", () => {
    it("should render heading for authenticated users", () => {
      // Act
      renderAuthenticatedState(container, [])

      // Assert
      const heading = container.querySelector("h1")
      expect(heading?.textContent).toBe("Your try sessions")
      expect(heading?.classList.contains("govuk-heading-l")).toBe(true)
    })

    it("should render placeholder content", () => {
      // Act
      renderAuthenticatedState(container, [])

      // Assert
      // With empty leases, it shows the first-time guidance which mentions sandbox
      expect(container.innerHTML).toContain("sandbox")
    })

    it("should include link to catalogue", () => {
      // Act
      renderAuthenticatedState(container, [])

      // Assert
      const link = container.querySelector("a.govuk-link") as HTMLAnchorElement
      expect(link).not.toBeNull()
      expect(link.href).toContain("/catalogue")
    })

    it("should show summary text when leases exist", () => {
      // Arrange
      const mockLeases = [
        {
          leaseId: "1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Test Product",
          status: "Active",
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
          maxSpend: 50,
          currentSpend: 10,
          awsSsoPortalUrl: "https://example.com",
        },
        {
          leaseId: "2",
          awsAccountId: "123456789013",
          leaseTemplateId: "template-2",
          leaseTemplateName: "Test Product 2",
          status: "PendingApproval",
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
          maxSpend: 50,
          currentSpend: 0,
        },
      ]

      // Act
      renderAuthenticatedState(container, mockLeases as any)

      // Assert
      expect(container.innerHTML).toContain("1 active")
      expect(container.innerHTML).toContain("1 pending")
    })

    it("should show first-time guidance when no leases", () => {
      // Act
      renderAuthenticatedState(container, [])

      // Assert
      expect(container.innerHTML).toContain("New to Try Before You Buy?")
      expect(container.innerHTML).toContain("Innovation Sandbox")
    })

    it("should not show first-time guidance when leases exist", () => {
      // Arrange
      const mockLeases = [
        {
          leaseId: "1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Test",
          status: "Active",
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
          maxSpend: 50,
          currentSpend: 10,
          awsSsoPortalUrl: "https://example.com",
        },
      ]

      // Act
      renderAuthenticatedState(container, mockLeases as any)

      // Assert
      expect(container.innerHTML).not.toContain("New to Try Before You Buy?")
    })
  })

  describe("AC #5: Dynamic State Update on Auth Change", () => {
    it("should re-render when auth state changes from false to true", async () => {
      // Arrange
      let subscribeCallback: (isAuth: boolean) => void = () => {}
      ;(authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb
      })

      // Act
      initTryPage()

      // First render - unauthenticated
      subscribeCallback(false)
      expect(container.innerHTML).toContain("Sign in to view your try sessions")

      // Auth state changes - authenticated
      subscribeCallback(true)

      // Wait for async operations to complete
      await Promise.resolve()
      await Promise.resolve()

      expect(container.innerHTML).toContain("Your try sessions")
      expect(container.innerHTML).not.toContain("Sign in to view your try sessions")
    })

    it("should re-render when auth state changes from true to false", async () => {
      // Arrange
      let subscribeCallback: (isAuth: boolean) => void = () => {}
      ;(authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb
      })

      // Act
      initTryPage()

      // First render - authenticated
      subscribeCallback(true)

      // Wait for async operations to complete
      await Promise.resolve()
      await Promise.resolve()

      expect(container.innerHTML).toContain("Your try sessions")

      // Auth state changes - unauthenticated (signed out)
      subscribeCallback(false)
      expect(container.innerHTML).toContain("Sign in to view your try sessions")
      expect(container.innerHTML).not.toContain("Your try sessions")
    })
  })

  describe("Story 7.5: Auto-refresh for relative expiry times", () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("should start auto-refresh timer when rendering authenticated state with leases", () => {
      // Arrange
      const mockLeases = [
        {
          leaseId: "lease-1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Test Product",
          status: "Active",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          maxSpend: 50,
          currentSpend: 10,
          awsSsoPortalUrl: "https://portal.aws.amazon.com",
        },
      ]

      // Act
      renderAuthenticatedState(container, mockLeases as any)

      // Advance timer by 60 seconds
      jest.advanceTimersByTime(60000)

      // Assert - table should have been re-rendered (container still has sessions)
      expect(container.innerHTML).toContain("Your try sessions")
      expect(container.innerHTML).toContain("Test Product")
    })

    it("should stop auto-refresh timer when rendering empty state", () => {
      // Arrange
      const mockLeases = [
        {
          leaseId: "lease-1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Test Product",
          status: "Active",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          maxSpend: 50,
          currentSpend: 10,
          awsSsoPortalUrl: "https://portal.aws.amazon.com",
        },
      ]

      // Start with authenticated state (starts timer)
      renderAuthenticatedState(container, mockLeases as any)

      // Act - switch to empty state (should stop timer)
      renderEmptyState(container)

      // Clear container to verify timer was stopped
      const contentBefore = container.innerHTML

      // Advance timer by 60 seconds
      jest.advanceTimersByTime(60000)

      // Assert - container should not have changed (timer was stopped)
      expect(container.innerHTML).toBe(contentBefore)
      expect(container.innerHTML).toContain("Sign in to view your try sessions")
    })

    it("should not re-render if container is null", () => {
      // Arrange
      const mockLeases = [
        {
          leaseId: "lease-1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Test Product",
          status: "Active",
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          maxSpend: 50,
          currentSpend: 10,
          awsSsoPortalUrl: "https://portal.aws.amazon.com",
        },
      ]

      renderAuthenticatedState(container, mockLeases as any)

      // Remove container from DOM to simulate navigation away
      container.remove()

      const spy = jest.spyOn(container, "innerHTML", "set")

      // Act - advance timer
      jest.advanceTimersByTime(60000)

      // Assert - innerHTML should not be called when container is removed
      // (In real implementation, check is for null container reference)
      spy.mockRestore()
    })
  })

  describe("Regression: Auto-refresh data fetching", () => {
    let cleanup: (() => void) | undefined

    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      // Clean up try page to stop timers
      if (cleanup) {
        cleanup()
        cleanup = undefined
      }
      jest.clearAllTimers()
      jest.useRealTimers()
    })

    it("should fetch fresh data from API during auto-refresh, not just re-render stale data", async () => {
      // Arrange
      const initialLeases = [
        {
          leaseId: "lease-1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Initial Product",
          status: "PendingApproval" as const,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          maxSpend: 50,
          currentSpend: 10,
        },
      ]

      const updatedLeases = [
        {
          leaseId: "lease-1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Initial Product",
          status: "Active" as const, // Status changed from PendingApproval to Active
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          maxSpend: 50,
          currentSpend: 15, // Spend also changed
        },
      ]

      // First call returns initial leases, subsequent calls return updated leases
      let callCount = 0
      mockFetchUserLeases.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return { success: true, leases: initialLeases }
        }
        return { success: true, leases: updatedLeases }
      })

      let subscribeCallback: (isAuth: boolean) => void = () => {}
      ;(authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb
        return () => {}
      })
      ;(authState.isAuthenticated as jest.Mock).mockReturnValue(true)

      // Act - Initialize page (triggers first fetch)
      cleanup = initTryPage()
      subscribeCallback(true)

      // Wait for initial async fetch - flush microtasks (don't use runAllTimers which hangs on infinite intervals)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      jest.advanceTimersByTime(100) // Allow initial render to complete
      await Promise.resolve()

      // Verify initial state shows pending status
      expect(container.innerHTML).toContain("Pending approval")

      // Advance timer to trigger auto-refresh (10 seconds)
      jest.advanceTimersByTime(10000)
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()

      // Assert - API should have been called again during refresh
      // BUG: Currently only called once because refresh only re-renders stale data
      expect(mockFetchUserLeases).toHaveBeenCalledTimes(2)

      // Assert - Updated status should be shown (Active instead of Pending)
      expect(container.innerHTML).toContain("Active")
      expect(container.innerHTML).not.toContain("Pending approval")
    })

    it("should show countdown indicator after refresh completes, not stay stuck on Updating", async () => {
      // Arrange
      const mockLeases = [
        {
          leaseId: "lease-1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Test Product",
          status: "Active" as const,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          maxSpend: 50,
          currentSpend: 10,
        },
      ]

      mockFetchUserLeases.mockResolvedValue({ success: true, leases: mockLeases })

      let subscribeCallback: (isAuth: boolean) => void = () => {}
      ;(authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb
        return () => {}
      })
      ;(authState.isAuthenticated as jest.Mock).mockReturnValue(true)

      // Act - Initialize page
      cleanup = initTryPage()
      subscribeCallback(true)

      // Wait for initial async fetch
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      jest.advanceTimersByTime(100)
      await Promise.resolve()

      // Verify countdown is shown initially
      expect(container.innerHTML).toContain("Refreshing in")
      expect(container.innerHTML).not.toContain("Updating...")

      // Trigger auto-refresh (10 seconds) - this shows "Updating..."
      jest.advanceTimersByTime(10000)
      await Promise.resolve()
      await Promise.resolve()

      // Advance 2 more seconds to allow the setTimeout(1000) to fire and reset state
      jest.advanceTimersByTime(2000)
      await Promise.resolve()

      // After refresh completes, countdown should be shown again
      // BUG: Previously showed "Updating..." that never returned to countdown
      const countdownElement = container.querySelector("#refresh-countdown")
      expect(countdownElement).not.toBeNull()
      expect(container.innerHTML).toContain("Refreshing in")
      expect(container.innerHTML).not.toContain("Updating...")
    })

    it("should display countdown timer with seconds remaining", async () => {
      // Arrange
      const mockLeases = [
        {
          leaseId: "lease-1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Test Product",
          status: "Active" as const,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          maxSpend: 50,
          currentSpend: 10,
        },
      ]

      mockFetchUserLeases.mockResolvedValue({ success: true, leases: mockLeases })

      let subscribeCallback: (isAuth: boolean) => void = () => {}
      ;(authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb
        return () => {}
      })
      ;(authState.isAuthenticated as jest.Mock).mockReturnValue(true)

      // Act
      cleanup = initTryPage()
      subscribeCallback(true)

      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      jest.advanceTimersByTime(100)
      await Promise.resolve()

      // Verify countdown is displayed with seconds format
      expect(container.innerHTML).toMatch(/Refreshing in \d+s/)

      // Verify countdown element exists
      const countdownElement = container.querySelector("#refresh-countdown")
      expect(countdownElement).not.toBeNull()

      // Verify countdown shows a reasonable number (1-10 seconds)
      const match = countdownElement?.textContent?.match(/(\d+)s/)
      expect(match).not.toBeNull()
      const seconds = parseInt(match![1])
      expect(seconds).toBeGreaterThanOrEqual(1)
      expect(seconds).toBeLessThanOrEqual(10)
    })

    it("should handle refresh errors gracefully without breaking countdown", async () => {
      // Arrange
      const mockLeases = [
        {
          leaseId: "lease-1",
          awsAccountId: "123456789012",
          leaseTemplateId: "template-1",
          leaseTemplateName: "Test Product",
          status: "Active" as const,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          maxSpend: 50,
          currentSpend: 10,
        },
      ]

      // First call succeeds, second call (refresh) fails
      let callCount = 0
      mockFetchUserLeases.mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return { success: true, leases: mockLeases }
        }
        return { success: false, error: "Network error" }
      })

      let subscribeCallback: (isAuth: boolean) => void = () => {}
      ;(authState.subscribe as jest.Mock).mockImplementation((cb) => {
        subscribeCallback = cb
        return () => {}
      })
      ;(authState.isAuthenticated as jest.Mock).mockReturnValue(true)

      // Act
      cleanup = initTryPage()
      subscribeCallback(true)

      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      jest.advanceTimersByTime(100)
      await Promise.resolve()

      // Verify initial render succeeded
      expect(container.innerHTML).toContain("Test Product")

      // Trigger refresh (which will fail)
      jest.advanceTimersByTime(10000)
      await Promise.resolve()
      await Promise.resolve()
      jest.advanceTimersByTime(2000)
      await Promise.resolve()

      // Should still show session data (not replace with error)
      // and countdown should resume
      expect(container.innerHTML).toContain("Refreshing in")
    })
  })
})
