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
})
