# Try Before You Buy - Architecture Document

**Project:** National Digital Exchange (NDX)
**Feature:** Try Before You Buy (AWS Innovation Sandbox Integration)
**Author:** cns
**Date:** 2025-11-22
**Architecture Type:** Decision-Focused Architecture for AI Agent Consistency

---

## Project Context Understanding

### Feature Overview

**Try Before You Buy** enables UK government users to request and access temporary AWS sandbox environments directly from the NDX catalogue, removing procurement friction from cloud service evaluation.

**Project Scale:**

- **5 epics** delivering self-service AWS sandbox access
- **79 functional requirements** across 9 capability areas:
  - Authentication & Session Management (10 FRs)
  - User Interface - Sign In/Out (5 FRs)
  - Innovation Sandbox API Integration (9 FRs)
  - Try Page (/try) (5 FRs)
  - Try Sessions Display (8 FRs)
  - Active Session Management (4 FRs)
  - Catalogue Integration (7 FRs)
  - Try Button & Lease Request Modal (17 FRs)
  - Responsive Design & Mobile (4 FRs)
  - Accessibility WCAG 2.2 (10 FRs)
- **47 non-functional requirements** across 9 quality dimensions

### Core Functionality

**Primary User Flow:**

1. User browses NDX catalogue → Sees "Try Before You Buy" button on AWS products
2. User clicks "Try this now for 24 hours" → Authenticates via OAuth (if needed) → Accepts AUP
3. System requests 24-hour AWS sandbox from Innovation Sandbox API → User redirected to /try page
4. User launches AWS Console via SSO portal → Evaluates AWS services within $50/24-hour limits
5. User manages active/past sessions from /try dashboard with budget/time tracking

### Critical NFRs Identified

**GovTech Compliance (Critical):**

- WCAG 2.2 AA minimum accessibility (AA mandatory, AAA target where feasible)
- GOV.UK Design System integration (already established in NDX)
- Mobile-first responsive design (320px+ viewports)
- Government service standards (zero downtime, auditability, transparency)

**Security & Privacy:**

- OAuth authentication with JWT tokens in sessionStorage (clears on browser restart)
- No PII logged client-side beyond API requirements
- HTTPS only, CORS validation, 401 automatic re-authentication

**Performance:**

- Try page loads within 2 seconds on broadband
- < 30 seconds from "Try" button to AWS Console access
- API timeouts at 10 seconds with user-friendly errors

**Usability:**

- Plain language error messages (no technical jargon)
- Loading states clearly communicated (spinners, disabled buttons)
- Trust-first emotional response (official government service, budget transparency)

### UX Complexity Level

**High complexity in UX requirements:**

- **AUP Acceptance Modal:** Most critical UX moment - must balance legal compliance (users must read) with friction-free flow (< 30 seconds total)
- **Responsive Sessions Table:** ONS-style stacking on mobile (each session as card with inline labels)
- **Focus Management:** Modal focus trap, keyboard navigation, screen reader announcements
- **5 Critical User Journeys:** Authentication, try request, sessions dashboard, AWS Console launch, comprehensive error handling

**Architectural implications from UX:**

- Client-side TypeScript required for sessionStorage management, API integration, dynamic modal interactions
- GOV.UK Design System Nunjucks components extended with custom Try components
- ARIA live regions for loading/error announcements (WCAG 2.2.1 compliance)
- Mobile-first CSS with 3 breakpoints (mobile/tablet/desktop)
- 44x44px minimum touch targets (exceeds WCAG 2.2 AA, meets AAA)

### Novel/Unique Challenges

**1. Authentication Abstraction for Future SSO:**
The UX design mentions that Innovation Sandbox OAuth is phase 1, but architecture should support future GOV.UK One Login or other government SSO providers without rearchitecting the entire authentication layer.

**2. AUP Modal Balance:**
UX requires scrollable AUP with checkbox acceptance - must prevent "click-through" while maintaining < 30 second flow. Novel pattern: scrollable container with visual scroll indicators encouraging reading.

**3. Brownfield Static Site Enhancement:**
NDX is an Eleventy static site. Try feature requires client-side JavaScript for dynamic functionality while maintaining static site benefits (SEO, performance, simplicity). Novel integration pattern needed.

**4. Government Service Mobile-First:**
Most government services are desktop-first. This feature must support full try flow on mobile (not just viewing), including AUP acceptance and session management on tablets/phones used by government staff in the field.

---

## Loaded Documentation Context

✓ **PRD loaded:** `docs/prd.md` - Feature 2: Try Before You Buy (79 FRs, 47 NFRs)
✓ **Epics loaded:** `docs/epics.md` - Lines 1367+ (Epic 4-8 breakdown)
✓ **UX Design loaded:** `docs/ux-design-specification.md` - Complete UX specification with GOV.UK Design System research
✓ **Brownfield context:** NDX is Eleventy static site with GOV.UK Frontend v5.x already integrated

---

## Pre-mortem Analysis - Preventive Architecture Decisions

**Method Applied:** Pre-mortem Analysis - Imagined catastrophic failure scenarios and worked backwards to identify preventive measures.

**Identified Failure Scenarios:**

1. **Authentication Security Breach** - JWT token hijacking, unauthorized AWS sandbox access
2. **Accessibility Lawsuit** - WCAG 2.2 AA violations, GDS standard non-compliance
3. **Budget Overrun Crisis** - Client-side vulnerabilities bypassing $50 limits
4. **Mobile Unusability** - Government staff unable to complete try flow on tablets/phones
5. **Future Migration Failure** - GOV.UK One Login migration requires complete rewrite

### Critical Preventive ADRs (Architecture Decision Records)

**ADR-001: Content Security Policy (CSP) for XSS Protection**

- **Decision:** Implement strict CSP headers preventing inline scripts and unauthorized domains
- **Prevents:** XSS attacks that could steal sessionStorage JWT tokens
- **Implementation:** Server-side CSP headers in Eleventy build, nonce-based script tags
- **Impact:** Security-critical - protects government users from session hijacking

**ADR-003: Token Refresh and Rotation**

- **Decision:** Implement automatic token refresh before expiration (if Innovation Sandbox supports it)
- **Prevents:** Session hijacking with stolen expired tokens
- **Implementation:** Background token refresh 5 minutes before expiry
- **Impact:** Security enhancement - reduces token theft window

**ADR-004: Mandatory Accessibility Testing Gate**

- **Decision:** Epic 8 story cannot be marked complete until WCAG 2.2 AA automated + manual testing passes
- **Prevents:** Accessibility lawsuit from non-compliant components
- **Implementation:** Pa11y tests in CI/CD + manual NVDA/VoiceOver testing documented in story DoD
- **Impact:** **CRITICAL** - Government service standard compliance mandatory

**ADR-005: Government Accessibility Specialist Review**

- **Decision:** Require GDS accessibility specialist sign-off before production deployment
- **Prevents:** Non-compliance with government service standards
- **Implementation:** Add accessibility review checkpoint to deployment checklist
- **Impact:** **CRITICAL** - External validation of WCAG 2.2 AA compliance

**ADR-008: Mobile-First CSS Development**

- **Decision:** Write all CSS starting from 320px viewport, progressively enhance for desktop
- **Prevents:** Desktop-first assumptions breaking mobile layout
- **Implementation:** Default styles for mobile, `@media (min-width: 641px)` for tablet/desktop
- **Impact:** **CRITICAL** - Government staff must complete full try flow on tablets/phones

**ADR-009: 44x44px Minimum Touch Targets**

- **Decision:** All interactive elements must meet WCAG 2.2 AAA 44x44px minimum (exceeds AA)
- **Prevents:** Mobile usability failure from small touch targets
- **Implementation:** CSS min-width/min-height constraints, design review checklist
- **Impact:** WCAG 2.2 AAA compliance (exceeds minimum AA requirement)

**ADR-013: Stakeholder Approval Checkpoints**

- **Decision:** Mandatory stakeholder approvals at key architecture gates
- **Prevents:** Deployment blockers from security/accessibility/GDS teams late in development
- **Implementation:**
  1. Security review before Epic 5 (authentication)
  2. Accessibility review before Epic 6 (catalogue integration)
  3. GDS compliance review before Epic 8 (mobile/accessibility)
  4. Product owner risk acceptance before architecture approval
- **Impact:** **CRITICAL** - Prevents rework, ensures compliance, validates risk acceptance

**ADR-014: Innovation Sandbox API Confirmation Required**

- **Decision:** Validate API authorization enforcement before relying on rejected ADR-006
- **Prevents:** Budget overrun vulnerability if API doesn't validate user permissions for lease templates
- **Implementation:** Epic 6 story must include API authorization testing (confirm 403 errors for unauthorized templates)
- **Impact:** **CRITICAL** - Validates accepted risk from ADR-006 rejection

**ADR-015: Architecture Handoff Documentation**

- **Decision:** Provide epic-specific architecture guidance to development team
- **Prevents:** Implementation gaps, inconsistent patterns, developer confusion
- **Implementation:** Architecture document sections for each epic, story context XML with ADRs
- **Impact:** Development team clarity, reduced rework

### Accepted Risks (Rejected ADRs)

**Authentication Abstraction Layer (ADR-010, 011, 012) - REJECTED**

- **Risk Accepted:** Future GOV.UK One Login migration will require significant refactoring of authentication code
- **Rationale:** Innovation Sandbox OAuth is current requirement; abstraction adds complexity without immediate benefit
- **Mitigation:** Document all Innovation Sandbox OAuth touchpoints in architecture for future migration planning

**Lease Template ID Obfuscation (ADR-007) - REJECTED**

- **Risk Accepted:** Lease template UUIDs exposed in product metadata YAML files
- **Rationale:** UUIDs are not secrets; Innovation Sandbox API must enforce authorization
- **Mitigation:** Verify Innovation Sandbox API prevents unauthorized template access during Epic 6 implementation

**OAuth Callback URL Validation (ADR-002) - REJECTED**

- **Risk Accepted:** Relying on Innovation Sandbox default OAuth security configuration
- **Rationale:** OAuth provider responsible for callback validation
- **Mitigation:** Verify Innovation Sandbox has strict callback URL validation configured

**Server-Side Template Authorization (ADR-006) - REJECTED**

- **Risk Accepted:** Client-side POST /api/leases payload can be manipulated
- **Rationale:** Innovation Sandbox API must enforce authorization (API responsibility)
- **Mitigation:** Confirm during Epic 6 that API validates user permissions for requested templates

---

## Stakeholder Mapping - Engagement Strategy

**Method Applied:** Stakeholder Mapping - Identified and analyzed stakeholders by interest and influence to develop strategic engagement approach for architectural decisions.

### Stakeholder Power/Interest Matrix

**KEY PLAYERS (High Influence, High Interest) - Manage Closely:**

- **Government Accessibility Reviewers** - Can block deployment for WCAG 2.2 AA non-compliance
- **Government Security Teams** - Can block deployment for security vulnerabilities
- **GDS Compliance Officers** - Can block deployment for GDS standards non-compliance
- **NDX Product Owner/Leadership** - Funding, prioritization, risk acceptance authority

**KEEP SATISFIED (High Influence, Low Interest):**

- **Innovation Sandbox API Team** - Dependency, controls OAuth and API behavior
- **Public Accountability Bodies** - Oversight, audit requirements

**KEEP INFORMED (Low Influence, High Interest):**

- **Government End Users** - UX feedback, success metrics, mobile usability validation
- **NDX Development Team** - Implementers, need clear architecture specifications
- **Legal/Procurement Teams** - AUP compliance validation

**MONITOR (Low Influence, Low Interest):**

- **Department Budget Holders** - Informed via operational reports

### Critical Stakeholder Engagement Actions

**Immediate Actions (Before Proceeding with Architecture):**

1. **Security Review Meeting** (Government Security Teams)
   - Present: ADR-001 (CSP), ADR-003 (token refresh), sessionStorage JWT approach
   - Get: Security sign-off on authentication architecture
   - Timing: Before Epic 5 implementation
   - Risk if Not Engaged: Security vulnerabilities discovered post-launch, feature disabled

2. **Accessibility Strategy Approval** (Government Accessibility Reviewers)
   - Present: ADR-004 (testing gate), ADR-005 (specialist review), ADR-008 (mobile-first), ADR-009 (touch targets)
   - Get: Written approval of WCAG 2.2 AA/AAA strategy
   - Timing: Before Epic 6 implementation
   - Risk if Not Engaged: Accessibility compliance issues, costly rework

3. **GDS Compliance Validation** (GDS Compliance Officers)
   - Present: GOV.UK Design System integration, mobile-first approach
   - Get: Confirmation architecture meets GDS standards
   - Timing: Before Epic 8 implementation
   - Risk if Not Engaged: Non-compliance discovered during GDS assessment, deployment blocked

4. **Risk Acceptance Sign-Off** (NDX Product Owner/Leadership)
   - Present: Pre-mortem Analysis, accepted risks (rejected ADRs 002, 006, 007, 010-012)
   - Get: Formal acceptance of architectural risks
   - Timing: Now (architecture approval stage)
   - Risk if Not Engaged: Misaligned priorities, unexpected risk escalation later

**Pre-Implementation Actions:**

5. **Innovation Sandbox API Validation** (Innovation Sandbox API Team)
   - Action: Confirm OAuth flow, API authorization enforcement (mitigates ADR-006 rejection)
   - Timing: Before Epic 5 & 6
   - Deliverable: API integration specification, authorization testing results

6. **Development Team Architecture Handoff** (NDX Development Team)
   - Action: Provide epic-specific architectural guidance, ADR documentation
   - Timing: Before each epic (Epic 4-8)
   - Deliverable: Story context XML with architecture decisions (ADR-015)

**Post-Implementation Actions:**

7. **User Acceptance Testing** (Government End Users)
   - Action: Mobile usability testing, < 30 second try flow validation
   - Timing: After Epic 8
   - Deliverable: User feedback, usability sign-off

### Stakeholder Impact on Architecture Success

**Critical Dependencies Identified:**

- **ADR-013** ensures key players (security, accessibility, GDS) approve architecture before implementation begins
- **ADR-014** validates Innovation Sandbox API enforces authorization (mitigates budget overrun risk from ADR-006 rejection)
- **ADR-015** provides development team with clear epic-specific guidance (reduces implementation gaps)

**Key Success Factors:**

- Early engagement with government security, accessibility, and GDS teams prevents deployment blockers
- Product owner accepts architectural risks (ADR-010-012 rejection = future migration cost)
- Innovation Sandbox API team confirms authorization enforcement (validates ADR-006 rejection)

---

## Technology Stack & Integration Architecture

### Brownfield Context: Existing NDX Platform

**Current NDX Architecture:**

- **Static Site Generator:** Eleventy (11ty)
- **Template Engine:** Nunjucks
- **Design System:** GOV.UK Frontend v5.x (via @x-govuk/govuk-eleventy-plugin 7.2.1)
- **Styling:** GOV.UK Design System CSS, custom SCSS
- **Build Tool:** npm scripts
- **Deployment:** Static files to CDN/web server
- **JavaScript:** Minimal client-side JS (progressive enhancement)

**Integration Constraint:** Try Before You Buy feature requires significant client-side JavaScript for:

- OAuth authentication flow (sessionStorage JWT management)
- Innovation Sandbox API integration (fetch requests with auth headers)
- Dynamic UI updates (modal interactions, sessions table, loading states)
- ARIA live regions for accessibility announcements

**Challenge:** How to add dynamic client-side features to a static site without compromising static site benefits (SEO, performance, simplicity)?

---

### Technology Stack Decisions

**ADR-016: TypeScript for Client-Side Code**

- **Decision:** Use TypeScript for all Try feature client-side code
- **Rationale:**
  - Type safety for API integration (Innovation Sandbox API responses)
  - Better IDE support for developers
  - Compile-time error detection (reduces runtime bugs)
  - Aligns with modern JavaScript best practices
- **Alternatives Considered:**
  - Plain JavaScript - Rejected (loses type safety for complex API integration)
  - JSDoc with type checking - Rejected (incomplete type coverage)
- **Implementation:**
  - TypeScript compiled to ES2020 (broad browser support)
  - Source maps for debugging
  - Strict mode enabled
- **Impact:** Development team gets type safety, reduced bugs in API integration

**ADR-017: Vanilla TypeScript (No Framework)**

- **Decision:** No client-side framework (React, Vue, Svelte) - use vanilla TypeScript with Web Components pattern
- **Rationale:**
  - Minimal bundle size (government service performance requirement)
  - No framework overhead for small feature set (5 critical user journeys)
  - Aligns with progressive enhancement philosophy
  - Easier to maintain in brownfield Eleventy context
  - GOV.UK Design System components are framework-agnostic
- **Alternatives Considered:**
  - React - Rejected (unnecessary overhead, 40KB+ min+gzip)
  - Alpine.js - Rejected (adds dependency, not needed for this scope)
  - Lit (Web Components) - Considered (lightweight), but vanilla TS simpler for this scope
- **Implementation:**
  - Custom element classes for modal, sessions table components
  - Native browser APIs (fetch, sessionStorage, querySelector, addEventListener)
  - Progressive enhancement (static HTML first, JS enhances)
- **Impact:** Small bundle size (<20KB), no framework lock-in, easier maintenance

**ADR-018: esbuild for TypeScript Compilation**

- **Decision:** Use esbuild for TypeScript → JavaScript compilation and bundling
- **Rationale:**
  - Fast compilation (10-100x faster than Webpack/Rollup)
  - Simple configuration (minimal setup)
  - Built-in TypeScript support (no additional loader needed)
  - Tree-shaking and minification included
  - Aligns with Eleventy's performance philosophy
- **Alternatives Considered:**
  - Webpack - Rejected (complex configuration, slower builds)
  - Rollup - Rejected (more complex than needed)
  - tsc (TypeScript compiler) only - Rejected (no bundling or minification)
- **Implementation:**
  - npm script: `npm run build:try-js` → esbuild compiles `src/try/**/*.ts` to `_site/assets/try.bundle.js`
  - Integrated into Eleventy build pipeline
  - Development mode with watch flag for live reloading
- **Impact:** Fast builds, simple configuration, development team productivity

**ADR-019: Module-Based Code Organization**

- **Decision:** Organize Try feature code into focused modules by responsibility
- **Rationale:**
  - Clear separation of concerns (auth, API client, UI components)
  - Easier testing (unit test each module independently)
  - Better code reusability (auth module reusable for future features)
  - Aligns with ADR-015 (architecture handoff documentation)
- **Structure:**
  ```
  src/try/
  ├── auth/
  │   ├── auth-provider.ts          # Authentication interface & implementation
  │   ├── session-storage.ts        # JWT token storage utilities
  │   └── oauth-flow.ts             # OAuth redirect handling
  ├── api/
  │   ├── api-client.ts             # Innovation Sandbox API client
  │   ├── leases-service.ts         # Lease CRUD operations
  │   └── configurations-service.ts # AUP text fetching
  ├── components/
  │   ├── aup-modal.ts              # AUP acceptance modal
  │   ├── sessions-table.ts         # Try sessions table (responsive)
  │   ├── try-button.ts             # Try button on product pages
  │   └── loading-spinner.ts        # Loading state component
  ├── utils/
  │   ├── error-handler.ts          # User-friendly error messages
  │   ├── url-utils.ts              # URL manipulation (token cleanup)
  │   └── date-utils.ts             # Expiry time formatting
  └── main.ts                       # Entry point, initializes app
  ```
- **Implementation:**
  - Each module exports clear interfaces (TypeScript interfaces)
  - Dependency injection for testability
  - ES modules (import/export)
- **Impact:** Maintainable codebase, testable modules, clear responsibilities

**ADR-020: Progressive Enhancement Pattern**

- **Decision:** HTML-first with JavaScript enhancement (not SPA)
- **Rationale:**
  - Aligns with GOV.UK Design System philosophy
  - Graceful degradation if JavaScript disabled (core content still accessible)
  - SEO benefits (static HTML indexed by search engines)
  - Performance benefits (HTML renders before JS loads)
  - Government service standard (progressive enhancement required)
- **Implementation:**
  - Static HTML pages generated by Eleventy (product pages, /try page structure)
  - JavaScript enhances static HTML:
    - Adds "Try" buttons to product pages (hidden if JS disabled)
    - Transforms sessions table to responsive cards on mobile
    - Adds modal functionality (AUP modal)
    - Handles OAuth callbacks
  - Critical content available without JS (product descriptions, static /try page message)
- **Example:**
  ```html
  <!-- /try page static HTML (Eleventy generated) -->
  <h1>Your Try Sessions</h1>
  <noscript>
    <p>JavaScript is required to view and manage your try sessions.</p>
    <p><a href="/enable-javascript">How to enable JavaScript</a></p>
  </noscript>
  <div id="sessions-container">
    <!-- JS populates this with sessions from API -->
  </div>
  ```
- **Impact:** Accessible without JS, SEO-friendly, aligns with government standards

---

### API Integration Architecture

**ADR-021: Centralized API Client with Auth Interceptor**

- **Decision:** Single API client class handling all Innovation Sandbox API requests with automatic auth header injection
- **Rationale:**
  - DRY (Don't Repeat Yourself) - auth header logic in one place
  - Automatic 401 handling (re-authentication) in one place
  - Consistent error handling across all API calls
  - Easier to swap API base URL (dev/staging/production)
- **Implementation:**

  ```typescript
  class InnovationSandboxAPIClient {
    private baseURL: string

    constructor(baseURL: string) {
      this.baseURL = baseURL
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const token = sessionStorage.getItem("isb-jwt")

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      // 401 handling: redirect to login
      if (response.status === 401) {
        window.location.href = "/api/auth/login"
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        throw new APIError(response.status, await response.text())
      }

      return response.json()
    }

    async getLeases(userEmail: string): Promise<Lease[]> {
      return this.request<Lease[]>(`/api/leases?userEmail=${userEmail}`)
    }

    async createLease(payload: CreateLeaseRequest): Promise<Lease> {
      return this.request<Lease>("/api/leases", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    }
  }
  ```

- **Impact:** Consistent API usage, automatic auth handling, centralized error handling

**ADR-022: Type-Safe API Response Models**

- **Decision:** Define TypeScript interfaces for all Innovation Sandbox API responses
- **Rationale:**
  - Compile-time validation of API response usage
  - IDE autocomplete for API data
  - Prevents runtime errors from unexpected API response shapes
  - Documents API contract in code
- **Implementation:**

  ```typescript
  // API response models
  interface Lease {
    uuid: string
    status: "Active" | "Pending" | "Expired" | "Terminated" | "Failed"
    awsAccountId: string
    maxSpend: number
    totalCostAccrued: number
    expirationDate: string // ISO 8601 date string
    leaseTemplateName: string
    createdAt: string
  }

  interface CreateLeaseRequest {
    leaseTemplateUuid: string
    comments?: string
  }

  interface UserProfile {
    email: string
    displayName: string
  }

  interface Configuration {
    termsOfService: string // AUP HTML content
  }
  ```

- **Impact:** Type safety for API integration, fewer runtime bugs, better DX

---

### Authentication Flow Architecture

**ADR-023: OAuth Callback Page Pattern (REVISED)**

- **Decision:** Homepage (`/`) handles OAuth redirect and token extraction
- **Rationale:**
  - OAuth provider (Innovation Sandbox) redirects to `https://ndx.gov.uk/` after authentication
  - Homepage script detects `?token=` parameter and extracts JWT token
  - Simplifies user experience (lands on familiar homepage after auth)
  - Maintains security (token still extracted and removed from URL immediately)
- **Implementation:**
  - Homepage (`src/index.md`) includes OAuth callback handler script
  - JavaScript on homepage:
    1. Checks for `?token=` parameter in URL
    2. If present, extracts token and stores in sessionStorage with key `isb-jwt`
    3. Cleans up URL (removes token from browser history using `history.replaceState`)
    4. Redirects to original destination (stored in sessionStorage before OAuth redirect) or stays on homepage

  ```typescript
  // Homepage OAuth callback handler
  import { handleOAuthCallback, parseOAuthError } from "/assets/try.bundle.js"

  const urlParams = new URLSearchParams(window.location.search)
  const hasToken = urlParams.has("token")
  const hasError = urlParams.has("error")

  if (hasToken) {
    // Extract token, store in sessionStorage, clean URL, redirect
    handleOAuthCallback()
  } else if (hasError) {
    // Display OAuth error message to user
    const error = parseOAuthError()
    // Show error UI on homepage
  }
  ```

- **Impact:** Secure OAuth flow, token not exposed in URL history, simpler user experience
- **Note:** Dedicated `/callback` page exists but is NOT used by OAuth provider

**ADR-024: Authentication State Management**

- **Decision:** Reactive authentication state using event-driven pattern
- **Rationale:**
  - Multiple components need to react to auth state changes (nav links, try buttons, /try page)
  - Centralized auth state prevents inconsistencies
  - Event-driven pattern allows loose coupling
- **Implementation:**

  ```typescript
  // Auth state manager
  class AuthState {
    private listeners: Array<(isAuthenticated: boolean) => void> = []

    subscribe(listener: (isAuthenticated: boolean) => void) {
      this.listeners.push(listener)
      // Immediately call with current state
      listener(this.isAuthenticated())
    }

    isAuthenticated(): boolean {
      return sessionStorage.getItem("isb-jwt") !== null
    }

    login(token: string) {
      sessionStorage.setItem("isb-jwt", token)
      this.notify()
    }

    logout() {
      sessionStorage.removeItem("isb-jwt")
      this.notify()
    }

    private notify() {
      const isAuth = this.isAuthenticated()
      this.listeners.forEach((listener) => listener(isAuth))
    }
  }

  // Usage in components
  authState.subscribe((isAuthenticated) => {
    if (isAuthenticated) {
      navElement.innerHTML = '<a href="/api/auth/logout">Sign out</a>'
    } else {
      navElement.innerHTML = '<a href="/api/auth/login">Sign in</a>'
    }
  })
  ```

- **Impact:** Consistent auth state across components, loose coupling

---

## Component Architecture & Accessibility

### Component Design Patterns

**ADR-025: Custom Elements for Reusable Components**

- **Decision:** Use Custom Elements (Web Components) for AUP modal and sessions table
- **Rationale:**
  - Encapsulation (component logic isolated from global scope)
  - Reusability (can use multiple instances on same page if needed)
  - Native browser API (no framework dependency)
  - Shadow DOM optional (use for style encapsulation only if needed)
  - Aligns with vanilla TypeScript decision (ADR-017)
- **Implementation:**

  ```typescript
  // AUP Modal Custom Element
  class AUPModal extends HTMLElement {
    private isOpen = false
    private onAcceptCallback?: () => void

    connectedCallback() {
      this.render()
      this.attachEventListeners()
    }

    open(onAccept: () => void) {
      this.isOpen = true
      this.onAcceptCallback = onAccept
      this.render()
      this.trapFocus()
      this.setAttribute("aria-hidden", "false")
    }

    close() {
      this.isOpen = false
      this.render()
      this.returnFocus()
      this.setAttribute("aria-hidden", "true")
    }

    private trapFocus() {
      // Focus trap implementation (ADR-027)
    }
  }

  customElements.define("aup-modal", AUPModal)
  ```

- **Components Using Custom Elements:**
  - `<aup-modal>` - AUP acceptance modal
  - `<sessions-table>` - Try sessions table (transforms to cards on mobile)
  - `<loading-spinner>` - Loading state indicator
- **Impact:** Encapsulated components, clean HTML, reusable across pages

**ADR-026: Accessible Modal Pattern**

- **Decision:** Implement WCAG 2.2 AA compliant modal with focus trap, keyboard navigation, and ARIA attributes
- **Rationale:**
  - AUP modal is most critical UX moment (Pre-mortem Analysis identified accessibility lawsuit risk)
  - ADR-004 (mandatory accessibility testing gate) requires WCAG 2.2 AA compliance
  - GOV.UK Design System doesn't provide official modal pattern (community backlog pattern used by government departments)
- **Implementation Requirements:**
  1. **ARIA Attributes:**
     - `role="dialog"` on modal container
     - `aria-modal="true"` (prevents screen reader navigation outside modal)
     - `aria-labelledby="{modal-title-id}"` (modal title reference)
     - `aria-describedby="{modal-content-id}"` (AUP content reference)
     - `aria-live="polite"` on loading/error regions
  2. **Focus Management:**
     - On open: Move focus to first interactive element (checkbox or close button)
     - On close: Return focus to trigger element (Try button)
     - Focus trap: Tab cycles through modal elements only
     - Shift+Tab cycles backward
  3. **Keyboard Navigation:**
     - **Escape key:** Closes modal (with confirmation if checkbox checked)
     - **Tab:** Cycles forward through interactive elements
     - **Shift+Tab:** Cycles backward
     - **Enter/Space:** Activates buttons and checkbox
  4. **Screen Reader Announcements:**
     - Modal title announced when opened
     - Loading state: "Requesting your sandbox" announced via aria-live
     - Error state: Error message announced via aria-live
     - Success state: "Sandbox ready" announced via aria-live
  5. **Visual Focus Indicators:**
     - GOV.UK Design System focus rings (3px yellow with black outline)
     - Visible on all interactive elements
     - Never hidden with CSS `outline: none`
- **Implementation:**

  ```typescript
  class AUPModal extends HTMLElement {
    private focusableElements: HTMLElement[] = []
    private triggerElement: HTMLElement | null = null

    open(triggerEl: HTMLElement, onAccept: () => void) {
      this.triggerElement = triggerEl
      this.isOpen = true
      this.render()

      // Get focusable elements
      this.focusableElements = Array.from(
        this.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])'),
      )

      // Move focus to first element
      this.focusableElements[0]?.focus()

      // Add keyboard listeners
      this.addEventListener("keydown", this.handleKeyDown)

      // Prevent background scroll
      document.body.style.overflow = "hidden"
    }

    close() {
      this.isOpen = false
      this.render()

      // Return focus to trigger
      this.triggerElement?.focus()

      // Remove listeners
      this.removeEventListener("keydown", this.handleKeyDown)

      // Restore scroll
      document.body.style.overflow = ""
    }

    private handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.confirmClose()
      }

      if (e.key === "Tab") {
        this.handleTabKey(e)
      }
    }

    private handleTabKey(e: KeyboardEvent) {
      const firstElement = this.focusableElements[0]
      const lastElement = this.focusableElements[this.focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift+Tab: if on first element, cycle to last
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: if on last element, cycle to first
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }
  }
  ```

- **Impact:** **CRITICAL** - Meets WCAG 2.2 AA, prevents accessibility lawsuit (Pre-mortem Failure 2)

**ADR-027: Responsive Table Transformation Pattern**

- **Decision:** CSS-first responsive table that transforms to stacked cards on mobile (ONS pattern)
- **Rationale:**
  - ADR-008 (mobile-first CSS) requires full try flow on mobile
  - GOV.UK table component has minimal responsive functionality
  - ONS Design System responsive table pattern adopted by government departments
  - Pure CSS solution (no JavaScript required for basic layout)
  - JavaScript enhances with additional features (real-time budget updates)
- **Implementation:**

  ```css
  /* Desktop: Traditional table */
  @media (min-width: 769px) {
    .sessions-table {
      display: table;
      width: 100%;
    }

    .sessions-table__row {
      display: table-row;
    }

    .sessions-table__cell {
      display: table-cell;
      padding: 10px;
    }

    .sessions-table__label {
      display: none; /* Hide inline labels on desktop */
    }
  }

  /* Mobile: Stacked cards */
  @media (max-width: 768px) {
    .sessions-table {
      display: block;
    }

    .sessions-table__row {
      display: block;
      margin-bottom: 20px;
      padding: 15px;
      border: 2px solid #b1b4b6; /* GOV.UK grey-2 */
      border-radius: 0; /* GOV.UK has no border-radius */
    }

    .sessions-table__row--active {
      border-color: #00703c; /* GOV.UK green */
      background-color: #f3f9f6; /* Light green tint */
    }

    .sessions-table__cell {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #b1b4b6;
    }

    .sessions-table__cell:last-child {
      border-bottom: none;
    }

    .sessions-table__label {
      font-weight: 700; /* Bold labels */
      margin-right: 10px;
    }

    .sessions-table__value {
      text-align: right;
    }
  }
  ```

  ```html
  <!-- HTML structure (works for both desktop and mobile) -->
  <div class="sessions-table">
    <div class="sessions-table__row sessions-table__row--active">
      <div class="sessions-table__cell">
        <span class="sessions-table__label">Template:</span>
        <span class="sessions-table__value">AWS User Research 0.0.1</span>
      </div>
      <div class="sessions-table__cell">
        <span class="sessions-table__label">Account ID:</span>
        <span class="sessions-table__value">123456789012</span>
      </div>
      <div class="sessions-table__cell">
        <span class="sessions-table__label">Expiry:</span>
        <span class="sessions-table__value">Expires in 18 hours</span>
      </div>
      <div class="sessions-table__cell">
        <span class="sessions-table__label">Budget:</span>
        <span class="sessions-table__value">$2.50 / $50.00</span>
      </div>
      <div class="sessions-table__cell">
        <span class="sessions-table__label">Status:</span>
        <span class="sessions-table__value">
          <span class="govuk-tag govuk-tag--green">Active</span>
        </span>
      </div>
      <div class="sessions-table__cell sessions-table__cell--action">
        <button class="govuk-button">Launch AWS Console</button>
      </div>
    </div>
  </div>
  ```

- **Accessibility:**
  - Desktop: `<table>` semantic HTML with `<th scope="col">` headers
  - Mobile: `<div>` structure with inline labels (screen reader reads "Template: AWS User Research 0.0.1")
  - ARIA labels: Table announced as "Active Sessions table" or "Past Sessions table"
- **Impact:** **CRITICAL** - Mobile-first responsive design (ADR-008), meets WCAG 2.2 AA

---

### Accessibility Implementation (WCAG 2.2 AA/AAA)

**ADR-028: ARIA Live Regions for Dynamic Content**

- **Decision:** Use ARIA live regions for all dynamic content updates (loading, errors, success)
- **Rationale:**
  - WCAG 2.2 Success Criterion 4.1.3 (Status Messages) - Level AA
  - Screen reader users must be notified of async operations
  - Loading states, error messages, success confirmations are not visible to screen reader users without announcements
  - ADR-004 (mandatory accessibility testing) requires WCAG 2.2 AA compliance
- **Implementation:**

  ```html
  <!-- ARIA live region container (always in DOM, hidden visually) -->
  <div id="aria-live-region" role="status" aria-live="polite" aria-atomic="true" class="govuk-visually-hidden">
    <!-- Content updated via JavaScript -->
  </div>
  ```

  ```typescript
  // Announce to screen readers
  function announceToScreenReader(message: string) {
    const liveRegion = document.getElementById("aria-live-region")
    if (liveRegion) {
      liveRegion.textContent = message

      // Clear after 5 seconds to allow re-announcement if needed
      setTimeout(() => {
        liveRegion.textContent = ""
      }, 5000)
    }
  }

  // Usage examples:
  announceToScreenReader("Requesting your sandbox")
  announceToScreenReader("Sandbox ready! Redirecting to your sessions")
  announceToScreenReader("Error: Maximum active sessions exceeded")
  ```

- **Announcement Timing:**
  - **Loading states:** Announce after 500ms delay (avoid announcing instant loads)
  - **Errors:** Announce immediately
  - **Success:** Announce immediately, but brief (1 second before redirect)
- **aria-live Values:**
  - `aria-live="polite"` - Waits for user to pause (loading, success)
  - `aria-live="assertive"` - Interrupts immediately (critical errors only)
- **Impact:** WCAG 2.2 AA compliance, screen reader users informed of async operations

**ADR-029: 44x44px Touch Targets (WCAG 2.2 AAA)**

- **Decision:** All interactive elements minimum 44x44px (exceeds AA 24x24px requirement)
- **Rationale:**
  - WCAG 2.2 Success Criterion 2.5.8 (Target Size - Minimum) - Level AAA
  - ADR-009 (Pre-mortem Analysis) identified this as critical for mobile usability
  - Government staff use tablets/phones in the field (UX research finding)
  - Prevents mobile usability failure (Pre-mortem Failure 4)
- **Implementation:**

  ```css
  /* All buttons meet 44x44px minimum */
  .govuk-button {
    min-height: 44px;
    min-width: 44px;
    padding: 8px 16px; /* Ensures height */
  }

  /* Links with padding to expand touch area */
  .try-feature-link {
    display: inline-block;
    padding: 12px 8px; /* Expands clickable area to 44px+ */
  }

  /* Mobile: full-width buttons automatically meet 44px height */
  @media (max-width: 640px) {
    .govuk-button {
      width: 100%;
      min-height: 44px;
    }
  }

  /* Checkbox with expanded touch target */
  .aup-checkbox {
    position: relative;
  }

  .aup-checkbox input {
    width: 24px;
    height: 24px;
  }

  .aup-checkbox label {
    padding: 10px; /* Expands touch area to 44px */
    cursor: pointer;
  }
  ```

- **Testing:**
  - Design review checklist: Measure all interactive elements
  - Manual mobile testing: Verify tap targets not too small
  - Automated testing: Pa11y can detect some touch target violations
- **Impact:** WCAG 2.2 AAA compliance (exceeds AA), mobile usability success

**ADR-030: Color Contrast Compliance (WCAG 2.2 AA)**

- **Decision:** All text meets 4.5:1 contrast ratio minimum (normal text), 3:1 (large text)
- **Rationale:**
  - WCAG 2.2 Success Criterion 1.4.3 (Contrast - Minimum) - Level AA
  - GOV.UK Design System already meets contrast requirements
  - Custom components must maintain GOV.UK color palette
  - ADR-004 (mandatory accessibility testing) requires verification
- **GOV.UK Color Palette Compliance:**
  - GOV.UK Black (#0b0c0c) on White (#ffffff): 21:1 ratio ✅
  - GOV.UK Blue (#1d70b8) on White (#ffffff): 4.6:1 ratio ✅
  - GOV.UK Green (#00703c) on White (#ffffff): 4.5:1 ratio ✅
  - GOV.UK Red (#d4351c) on White (#ffffff): 4.6:1 ratio ✅
  - GOV.UK Grey (#505a5f) on White (#ffffff): 7.4:1 ratio ✅
- **Custom Component Color Requirements:**
  - Status badges use GOV.UK tag colors (already compliant)
  - Modal backdrop: rgba(0,0,0,0.5) - not applicable (no text)
  - Loading spinner: GOV.UK Blue (#1d70b8) - compliant
  - Error messages: GOV.UK Red (#d4351c) - compliant
- **Testing:**
  - Automated: Pa11y contrast checks in CI/CD
  - Manual: WebAIM Contrast Checker for custom colors
  - Browser DevTools: Accessibility panel shows contrast ratios
- **Impact:** WCAG 2.2 AA compliance, accessible to users with low vision

**ADR-031: Semantic HTML and Heading Hierarchy**

- **Decision:** Use semantic HTML5 elements and proper heading hierarchy (H1→H2→H3, no skipping)
- **Rationale:**
  - WCAG 2.2 Success Criterion 1.3.1 (Info and Relationships) - Level A
  - Screen reader users navigate by headings (H key in NVDA/JAWS)
  - Semantic HTML provides structure for assistive technologies
  - GOV.UK Design System requires proper heading hierarchy
- **Heading Hierarchy:**

  ```html
  <!-- /try page structure -->
  <h1>Your Try Sessions</h1>
  <!-- Page title -->

  <h2>Active Sessions</h2>
  <!-- Section heading -->
  <!-- Active sessions table -->

  <h2>Past Sessions</h2>
  <!-- Section heading -->
  <!-- Past sessions table -->
  ```

  ```html
  <!-- Product page structure -->
  <h1>AWS Lambda</h1>
  <!-- Product title -->

  <h2>Overview</h2>
  <!-- Section -->
  <p>Product description...</p>

  <h2>Try Before You Buy</h2>
  <!-- Try feature section -->
  <button class="govuk-button govuk-button--start">Try this now for 24 hours</button>

  <h2>Features</h2>
  <!-- Section -->
  <!-- Features list -->
  ```

- **Semantic Elements:**
  - `<nav>` for navigation (sign in/out links)
  - `<main>` for main content area
  - `<section>` for distinct content sections
  - `<article>` for session cards (mobile)
  - `<button>` for clickable actions (not `<div>` or `<a>` styled as buttons)
  - `<table>` for data tables (desktop sessions table)
- **Impact:** Screen reader navigation, WCAG 2.2 Level A compliance

---

### Error Handling & User Feedback

**ADR-032: User-Friendly Error Messages**

- **Decision:** Plain language error messages with specific recovery actions (no technical jargon)
- **Rationale:**
  - Pre-mortem Analysis identified 5 error scenarios requiring clear guidance
  - Government users need actionable recovery paths (not generic "Error occurred")
  - Aligns with GOV.UK content style guide (plain English)
- **Error Message Template:**

  ```typescript
  interface ErrorMessage {
    userMessage: string // Plain language explanation
    recovery: string // What user should do
    technicalDetails?: string // Optional (hidden by default, show on "Details" click)
  }

  const ERROR_MESSAGES: Record<number, ErrorMessage> = {
    409: {
      userMessage: "You've reached the maximum of 3 active sessions.",
      recovery: "Terminate an existing session or wait for one to expire.",
      technicalDetails: "HTTP 409 Conflict - Maximum active leases exceeded",
    },
    401: {
      userMessage: "Your session has expired. Signing you in again...",
      recovery: "You'll be redirected to sign in. Your work will be saved.",
      technicalDetails: "HTTP 401 Unauthorized - JWT token expired",
    },
    500: {
      userMessage: "The sandbox service is temporarily unavailable.",
      recovery: "Please try again in a few minutes.",
      technicalDetails: "HTTP 500 Internal Server Error",
    },
    0: {
      // Network timeout
      userMessage: "Request timed out. Please check your connection and try again.",
      recovery: "Click 'Try again' to retry your request.",
      technicalDetails: "Network timeout after 10 seconds",
    },
  }
  ```

- **Error Display:**
  - GOV.UK error message component (red left border, red text, error icon)
  - Error message above form/action (not in separate alert)
  - Focus moved to error message (keyboard users immediately aware)
  - ARIA live region announces error to screen readers
- **Impact:** Clear error guidance, reduced support burden, user trust (Pre-mortem ADR-001)

---

## Deployment Architecture & Build Pipeline

**ADR-033: Static Site Deployment with Client-Side Assets**

- **Decision:** Deploy as static HTML/CSS/JS to CDN/web server (existing NDX deployment pattern)
- **Rationale:**
  - Aligns with existing Eleventy static site architecture
  - No server-side runtime required (cost-effective, simple)
  - Innovation Sandbox API is external service (no backend to deploy)
  - OAuth callback handled on homepage (OAuth provider redirects to https://ndx.gov.uk/)
  - CDN distribution for performance (government service requirement)
- **Build Pipeline:**
  ```bash
  # Build steps (npm scripts)
  1. npm run build:eleventy # Generate static HTML from Nunjucks templates
  2. npm run build:try-js   # Compile TypeScript → JavaScript (esbuild)
  3. npm run build:css      # Compile SCSS → CSS (existing pipeline)
  4. npm run build:assets   # Copy static assets (images, fonts)
  5. npm run build          # Run all build steps
  ```
- **Output Structure:**
  ```
  _site/                        # Build output directory
  ├── index.html                # Home page (handles OAuth callback with ?token= parameter)
  ├── try/
  │   └── index.html            # /try page (static HTML shell)
  ├── callback/
  │   └── index.html            # Legacy OAuth callback page (NOT USED - OAuth redirects to homepage)
  ├── catalogue/
  │   └── aws/
  │       ├── lambda.html       # Product pages with Try button
  │       └── ...
  ├── assets/
  │   ├── try.bundle.js         # Compiled TypeScript (main.ts entry)
  │   ├── try.bundle.js.map     # Source maps for debugging
  │   ├── styles.css            # Compiled CSS
  │   └── govuk-frontend/       # GOV.UK Design System assets
  └── ...
  ```
- **Deployment Targets:**
  - Development: Local server (`npm run serve`)
  - Staging: AWS S3 + CloudFront or similar CDN
  - Production: AWS S3 + CloudFront or similar CDN
- **Impact:** Simple deployment, no server-side complexity, aligns with existing NDX infrastructure

**ADR-034: Content Security Policy (CSP) Headers**

- **Decision:** Implement strict CSP headers to prevent XSS attacks (from ADR-001)
- **Rationale:**
  - Prevents XSS attacks that could steal sessionStorage JWT tokens
  - Pre-mortem Analysis identified authentication security breach as failure scenario
  - Government security requirement (security team sign-off required)
- **CSP Configuration:**
  ```
  Content-Security-Policy:
    default-src 'self';
    script-src 'self' 'nonce-{random}';
    style-src 'self' 'nonce-{random}';
    connect-src 'self' https://innovation-sandbox-api.aws.amazon.com;
    img-src 'self' data:;
    font-src 'self';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  ```
- **Implementation:**
  - Server-side headers (S3/CloudFront configuration or reverse proxy)
  - Nonce-based script/style tags (generated during build)
  - `'unsafe-inline'` **NOT** allowed (forces nonce-based approach)
- **Testing:**
  - Browser DevTools: Verify CSP headers present
  - CSP Evaluator: Check for violations
  - Manual testing: Verify Try feature works with CSP enabled
- **Impact:** **CRITICAL** - Prevents XSS attacks, protects JWT tokens (ADR-001)

**ADR-035: Environment Configuration**

- **Decision:** Environment-specific configuration for API base URLs, OAuth endpoints
- **Rationale:**
  - Different API endpoints for dev/staging/production
  - No hardcoded production URLs in code
  - Easier testing with local/staging APIs
- **Configuration Approach:**

  ```typescript
  // src/try/config.ts
  interface EnvironmentConfig {
    apiBaseURL: string
    oauthLoginURL: string
    oauthCallbackURL: string
    environment: "development" | "staging" | "production"
  }

  const ENV_CONFIG: Record<string, EnvironmentConfig> = {
    development: {
      apiBaseURL: "http://localhost:3000/api",
      oauthLoginURL: "http://localhost:3000/auth/login",
      oauthCallbackURL: "http://localhost:3000/", // OAuth redirects to homepage
      environment: "development",
    },
    staging: {
      apiBaseURL: "https://staging-api.innovation-sandbox.aws.amazon.com",
      oauthLoginURL: "https://staging.ndx.gov.uk/api/auth/login",
      oauthCallbackURL: "https://staging.ndx.gov.uk/", // OAuth redirects to homepage
      environment: "staging",
    },
    production: {
      apiBaseURL: "https://api.innovation-sandbox.aws.amazon.com",
      oauthLoginURL: "https://ndx.gov.uk/api/auth/login",
      oauthCallbackURL: "https://ndx.gov.uk/", // OAuth redirects to homepage
      environment: "production",
    },
  }

  // Detect environment from hostname or env variable
  const currentEnv = window.location.hostname.includes("localhost")
    ? "development"
    : window.location.hostname.includes("staging")
      ? "staging"
      : "production"

  export const config = ENV_CONFIG[currentEnv]
  ```

- **Impact:** Environment-specific configuration, easier testing, no hardcoded URLs

---

## Testing Strategy

**ADR-036: Multi-Layer Testing Approach**

- **Decision:** Implement unit, integration, accessibility, and manual testing (no E2E for MVP)
- **Rationale:**
  - ADR-004 (mandatory accessibility testing gate) requires automated + manual testing
  - Pre-mortem Analysis identified accessibility lawsuit as critical failure
  - Complex client-side logic requires unit tests (API client, auth state, components)
  - Integration testing validates OAuth flow, API integration
  - E2E testing deferred to Growth phase (Playwright/Cypress not in MVP scope)
- **Testing Layers:**

**1. Unit Tests (TypeScript/Jest)**

- **Scope:** Module-level testing (auth, API client, utilities, error handling)
- **Framework:** Jest + @testing-library/dom
- **Coverage Target:** 80% code coverage for business logic
- **Test Files:**
  ```
  src/try/
  ├── auth/
  │   ├── auth-provider.test.ts
  │   ├── session-storage.test.ts
  │   └── oauth-flow.test.ts
  ├── api/
  │   ├── api-client.test.ts
  │   ├── leases-service.test.ts
  │   └── error-handler.test.ts
  ├── utils/
  │   ├── url-utils.test.ts
  │   └── date-utils.test.ts
  ```
- **Example Tests:**
  - API client: Test 401 handling (redirect to login)
  - API client: Test 409 handling (max leases error message)
  - Auth state: Test subscribe/notify pattern
  - sessionStorage: Test token storage/retrieval
  - Error handler: Test error message mapping (409 → user-friendly message)
- **Run:** `npm run test:unit`

**2. Integration Tests (TypeScript/Jest)**

- **Scope:** OAuth flow, API integration, component interactions
- **Mocking:** Mock Innovation Sandbox API responses (fetch mock)
- **Test Scenarios:**
  - OAuth callback: Token extraction → sessionStorage → redirect
  - Lease request: POST /api/leases → 201 success → redirect to /try
  - Lease request: POST /api/leases → 409 conflict → error alert
  - Sessions page: Fetch leases → render table → Launch AWS Console
- **Run:** `npm run test:integration`

**3. Accessibility Tests (Pa11y + Manual)**

- **Automated (Pa11y):**
  - WCAG 2.2 AA compliance checks
  - Color contrast validation
  - ARIA attribute validation
  - Keyboard navigation simulation
  - Run on: /try page, product pages, modal (open state)
  - CI/CD integration: Fail build on accessibility violations
  - **Run:** `npm run test:a11y`
- **Manual (Screen Reader):**
  - NVDA (Windows) or VoiceOver (macOS) testing
  - Test flows:
    1. Authentication: Sign in → OAuth → Callback
    2. Try request: Product page → Try button → AUP modal → Accept → Redirect
    3. Sessions page: Navigate table, launch AWS Console
    4. Error handling: Trigger 409 error, verify announcement
  - Checklist: ADR-004 (mandatory testing gate)
  - Sign-off required: Government accessibility specialist (ADR-005)

**4. Manual Testing (Cross-Browser & Mobile)**

- **Browsers:** Chrome, Firefox, Safari, Edge, Samsung Internet (latest 2 versions)
- **Devices:** iPhone (Safari), Android (Chrome), tablet (iPad)
- **Test Cases:**
  - OAuth flow: Complete sign in on all browsers
  - AUP modal: Focus trap, Escape key, checkbox acceptance
  - Sessions table: Responsive transformation (desktop → mobile)
  - Touch targets: Verify 44x44px on mobile (ADR-009, ADR-029)
  - Error scenarios: 409, 401, 500, network timeout
- **Checklist:** Manual testing checklist in Epic 8 DoD

**ADR-037: Accessibility Testing Gate (Epic 8)**

- **Decision:** Epic 8 story cannot be marked complete until accessibility testing passes
- **Rationale:**
  - ADR-004 (Pre-mortem preventive measure) - prevents accessibility lawsuit
  - ADR-005 (government specialist review) required before production
  - Government service standard (GDS assessment requirement)
- **Testing Requirements:**
  1. **Automated Pa11y:** All pages pass WCAG 2.2 AA (zero violations)
  2. **Manual NVDA/VoiceOver:** All 5 critical user journeys complete without issues
  3. **Keyboard Navigation:** All flows accessible via keyboard only (no mouse)
  4. **Mobile Touch Targets:** All interactive elements ≥ 44x44px
  5. **Color Contrast:** All text meets 4.5:1 ratio (automated check)
  6. **Government Specialist Sign-Off:** Written approval from GDS accessibility specialist
- **Failure Criteria:**
  - Any WCAG 2.2 AA violation → Story not complete
  - Screen reader cannot complete flow → Story not complete
  - Keyboard trap (cannot escape modal) → Story not complete
  - Touch target < 44x44px → Story not complete
- **Impact:** **CRITICAL** - Prevents deployment blockers, ensures WCAG 2.2 AA compliance

---

## Epic-Specific Implementation Guidance

### Epic 4: Authentication & Session Management (Foundation)

**Scope:** OAuth integration, sessionStorage JWT management, sign in/out UI

**Key ADRs:**

- ADR-016: TypeScript for client-side code
- ADR-017: Vanilla TypeScript (no framework)
- ADR-018: esbuild for compilation
- ADR-019: Module-based code organization (auth/, api/, utils/)
- ADR-023: OAuth callback page pattern
- ADR-024: Authentication state management (event-driven)

**Implementation Notes:**

- Create `src/try/auth/` module with OAuth flow, sessionStorage utilities
- Create `/callback.html` page for OAuth redirect handling
- Implement `AuthState` class with subscribe/notify pattern
- Add sign in/out links to GOV.UK header navigation
- Test: OAuth flow, token storage, automatic re-authentication (401 handling)

**Stakeholder Engagement:**

- **Security review** before implementation begins (ADR-013)
- Present: ADR-001 (CSP), ADR-003 (token refresh), sessionStorage approach
- Get: Security sign-off on authentication architecture

---

### Epic 5: Innovation Sandbox API Integration

**Scope:** API client, lease service, configurations service, error handling

**Key ADRs:**

- ADR-021: Centralized API client with auth interceptor
- ADR-022: Type-safe API response models
- ADR-032: User-friendly error messages
- ADR-035: Environment configuration (dev/staging/production APIs)

**Implementation Notes:**

- Create `src/try/api/` module with API client, leases service
- Implement automatic 401 handling (redirect to login)
- Define TypeScript interfaces for all API responses (Lease, UserProfile, Configuration)
- Implement error message mapping (409 → "Max 3 sessions", 500 → "Service unavailable")
- Test: API calls with mock responses, 401/409/500 error handling

**Stakeholder Engagement:**

- **Innovation Sandbox API team validation** before Epic 6 (ADR-013)
- Confirm: OAuth flow, API authorization enforcement (validates ADR-006 rejection)
- Get: API integration specification

---

### Epic 6: Catalogue Integration (Try Button & AUP Modal)

**Scope:** Try button on product pages, AUP modal, lease request flow

**Key ADRs:**

- ADR-025: Custom Elements for reusable components
- ADR-026: Accessible modal pattern (**CRITICAL** - focus trap, ARIA, keyboard nav)
- ADR-028: ARIA live regions for dynamic content
- ADR-032: User-friendly error messages

**Implementation Notes:**

- Create `src/try/components/aup-modal.ts` custom element
- Implement modal focus trap, keyboard navigation (Tab, Shift+Tab, Escape)
- Add ARIA attributes: role="dialog", aria-modal="true", aria-labelledby, aria-describedby
- Fetch AUP text from `/api/configurations` termsOfService field
- Add "Try this now for 24 hours" button to product pages (GOV.UK start button)
- Test: Modal accessibility, focus trap, checkbox acceptance, error scenarios (409, 500)

**Stakeholder Engagement:**

- **Accessibility review** before implementation begins (ADR-013)
- Present: ADR-026 (accessible modal), ADR-028 (ARIA live regions)
- Get: Written approval of accessibility strategy

**API Validation:**

- **ADR-014: Confirm API authorization** during implementation
- Test: POST /api/leases with unauthorized template UUID → Expect 403 error
- If API doesn't enforce authorization → Escalate risk to product owner

---

### Epic 7: Try Sessions Dashboard (/try page)

**Scope:** /try page, sessions table (responsive), launch AWS Console

**Key ADRs:**

- ADR-020: Progressive enhancement pattern (HTML-first, JS enhances)
- ADR-027: Responsive table transformation (**CRITICAL** - ONS pattern, mobile cards)
- ADR-031: Semantic HTML and heading hierarchy

**Implementation Notes:**

- Create `/try/index.html` static page (Eleventy template)
- Create `src/try/components/sessions-table.ts` custom element
- Implement CSS-first responsive transformation (desktop table → mobile cards)
- Add inline labels for mobile (hidden on desktop)
- Fetch sessions from `/api/leases?userEmail={email}`
- Render active sessions (green border, launch button) and past sessions (no button)
- Launch AWS Console: Open new tab to AWS SSO portal URL
- Test: Responsive transformation, screen reader table navigation

**Stakeholder Engagement:**

- **Development team handoff** (ADR-015)
- Provide: Epic-specific architectural guidance, responsive table pattern
- Deliver: Story context XML with ADR references

---

### Epic 8: Accessibility & Mobile Responsive

**Scope:** WCAG 2.2 AA/AAA compliance, mobile-first CSS, accessibility testing

**Key ADRs:**

- ADR-004: Mandatory accessibility testing gate (**CRITICAL**)
- ADR-005: Government accessibility specialist review (**CRITICAL**)
- ADR-008: Mobile-first CSS development
- ADR-009: 44x44px minimum touch targets
- ADR-029: 44x44px touch targets (WCAG 2.2 AAA)
- ADR-030: Color contrast compliance
- ADR-037: Accessibility testing gate

**Implementation Notes:**

- Run Pa11y automated tests on all pages (WCAG 2.2 AA)
- Manual NVDA/VoiceOver testing on all 5 critical user journeys
- Keyboard-only testing (no mouse)
- Mobile device testing (iPhone, Android, tablet)
- Measure all touch targets (must be ≥ 44x44px)
- Verify color contrast ratios (all text ≥ 4.5:1)
- Fix any accessibility violations found
- Document testing results in story DoD

**Stakeholder Engagement:**

- **GDS compliance review** before production deployment (ADR-013)
- Present: Mobile-first approach, WCAG 2.2 AA/AAA compliance evidence
- Get: Confirmation architecture meets GDS standards

- **Government accessibility specialist sign-off** (**REQUIRED** - ADR-005, ADR-037)
- Present: Pa11y results, manual testing evidence, WCAG 2.2 compliance documentation
- Get: Written approval for production deployment

**Testing Gate:**

- Story cannot be marked complete until:
  1. Pa11y: Zero WCAG 2.2 AA violations
  2. Manual screen reader: All flows complete without issues
  3. Keyboard navigation: All flows accessible
  4. Mobile touch targets: All ≥ 44x44px
  5. Government specialist: Written sign-off received

---

## Architecture Summary & Decision Tree

### Total Architecture Decision Records: 37

**Preventive ADRs (Pre-mortem Analysis):**

- ADR-001: Content Security Policy (XSS protection)
- ADR-003: Token refresh and rotation
- ADR-004: Mandatory accessibility testing gate (**CRITICAL**)
- ADR-005: Government accessibility specialist review (**CRITICAL**)
- ADR-008: Mobile-first CSS development (**CRITICAL**)
- ADR-009: 44x44px minimum touch targets

**Stakeholder Engagement ADRs:**

- ADR-013: Stakeholder approval checkpoints (**CRITICAL**)
- ADR-014: Innovation Sandbox API confirmation required (**CRITICAL**)
- ADR-015: Architecture handoff documentation

**Technology Stack ADRs:**

- ADR-016: TypeScript for client-side code
- ADR-017: Vanilla TypeScript (no framework)
- ADR-018: esbuild for TypeScript compilation
- ADR-019: Module-based code organization
- ADR-020: Progressive enhancement pattern

**API Integration ADRs:**

- ADR-021: Centralized API client with auth interceptor
- ADR-022: Type-safe API response models

**Authentication ADRs:**

- ADR-023: OAuth callback page pattern
- ADR-024: Authentication state management

**Component ADRs:**

- ADR-025: Custom Elements for reusable components
- ADR-026: Accessible modal pattern (**CRITICAL**)
- ADR-027: Responsive table transformation (**CRITICAL**)

**Accessibility ADRs (WCAG 2.2):**

- ADR-028: ARIA live regions for dynamic content
- ADR-029: 44x44px touch targets (AAA)
- ADR-030: Color contrast compliance (AA)
- ADR-031: Semantic HTML and heading hierarchy

**User Experience ADRs:**

- ADR-032: User-friendly error messages

**Deployment ADRs:**

- ADR-033: Static site deployment with client-side assets
- ADR-034: Content Security Policy headers
- ADR-035: Environment configuration

**Testing ADRs:**

- ADR-036: Multi-layer testing approach
- ADR-037: Accessibility testing gate (Epic 8) (**CRITICAL**)

### Critical Success Factors

**Top 5 ADRs for Architecture Success:**

1. **ADR-004 + ADR-037**: Mandatory accessibility testing gate (prevents WCAG violations reaching production)
2. **ADR-013**: Stakeholder approval checkpoints (prevents deployment blockers from security/accessibility/GDS teams)
3. **ADR-026**: Accessible modal pattern (most critical UX moment - AUP acceptance)
4. **ADR-008 + ADR-027**: Mobile-first CSS + responsive table (government staff must complete full flow on tablets/phones)
5. **ADR-014**: Innovation Sandbox API confirmation (validates budget overrun risk acceptance)

### Key Architectural Patterns

**Brownfield Integration:**

- Eleventy static site + client-side TypeScript enhancement
- Progressive enhancement (HTML-first, JS adds dynamic features)
- No framework overhead (vanilla TS, < 20KB bundle)

**Authentication Flow:**

- Innovation Sandbox OAuth → JWT token in sessionStorage
- Dedicated `/callback` page for token extraction
- Event-driven auth state (reactive components)
- Automatic 401 re-authentication

**API Integration:**

- Centralized API client with automatic auth header injection
- Type-safe response models (TypeScript interfaces)
- User-friendly error messages (409 → "Max 3 sessions", 500 → "Service unavailable")

**Accessibility (WCAG 2.2):**

- Modal focus trap with keyboard navigation
- ARIA live regions for dynamic content announcements
- Responsive table transformation (desktop → mobile cards)
- 44x44px touch targets (exceeds AA, meets AAA)
- Semantic HTML with proper heading hierarchy

**Component Architecture:**

- Custom Elements (Web Components) for encapsulation
- CSS-first responsive design (mobile → tablet → desktop)
- GOV.UK Design System integration (colors, typography, spacing)

### Decision Tree for Implementation

```
Start Epic Implementation
├─ Epic 4: Authentication
│  ├─ Security review (ADR-013) ✓
│  ├─ Implement OAuth flow (ADR-023, ADR-024)
│  └─ Test: OAuth, token storage, 401 handling
│
├─ Epic 5: API Integration
│  ├─ Innovation Sandbox API validation (ADR-013) ✓
│  ├─ Implement API client (ADR-021, ADR-022)
│  └─ Test: API calls, error handling (401, 409, 500)
│
├─ Epic 6: Catalogue Integration
│  ├─ Accessibility review (ADR-013) ✓
│  ├─ Implement AUP modal (ADR-026) [CRITICAL]
│  ├─ Confirm API authorization (ADR-014) [CRITICAL]
│  └─ Test: Modal accessibility, focus trap, error scenarios
│
├─ Epic 7: Sessions Dashboard
│  ├─ Architecture handoff (ADR-015)
│  ├─ Implement responsive table (ADR-027) [CRITICAL]
│  └─ Test: Responsive transformation, screen reader navigation
│
└─ Epic 8: Accessibility & Mobile
   ├─ Run Pa11y automated tests (ADR-004, ADR-037) [CRITICAL]
   ├─ Manual NVDA/VoiceOver testing (ADR-004)
   ├─ Mobile device testing (ADR-008, ADR-029)
   ├─ GDS compliance review (ADR-013) ✓
   ├─ Government specialist sign-off (ADR-005, ADR-037) [CRITICAL]
   └─ ✓ Production deployment approved
```

---

## Accepted Risks & Future Considerations

**Accepted Risks (Rejected ADRs):**

1. **No auth abstraction layer** (ADR-010-012 rejected)
   - **Risk:** Future GOV.UK One Login migration requires significant refactoring
   - **Mitigation:** Document all Innovation Sandbox OAuth touchpoints for future migration planning

2. **Lease template UUIDs in product metadata** (ADR-007 rejected)
   - **Risk:** Template UUIDs exposed in YAML files
   - **Mitigation:** Innovation Sandbox API must enforce authorization (ADR-014 validates this)

3. **OAuth callback URL validation relies on provider** (ADR-002 rejected)
   - **Risk:** Relying on Innovation Sandbox default OAuth security
   - **Mitigation:** Verify Innovation Sandbox has strict callback URL validation configured

4. **Client-side payload manipulation possible** (ADR-006 rejected)
   - **Risk:** POST /api/leases payload can be modified via browser dev tools
   - **Mitigation:** Innovation Sandbox API must validate user permissions for templates (ADR-014 confirms this)

**Future Enhancements (Growth Phase):**

- E2E testing with Playwright/Cypress
- Real-time budget tracking (WebSocket updates)
- Session termination feature (user can terminate before 24 hours)
- GOV.UK One Login migration (requires ADR-010 auth abstraction implementation)
- Advanced analytics (session usage patterns, adoption metrics)

---

## Architecture Document Complete

**Total ADRs: 37**
**Critical ADRs: 10** (marked as **CRITICAL**)
**Stakeholder Approvals Required: 4** (Security, Accessibility, GDS, Product Owner)
**Testing Gates: 1** (Epic 8 accessibility testing - ADR-037)

**This architecture document provides:**
✅ Decision-focused ADRs for AI agent consistency
✅ Pre-mortem Analysis with preventive measures
✅ Stakeholder mapping with engagement strategies
✅ Complete technology stack decisions
✅ Component architecture with accessibility patterns
✅ Deployment architecture and build pipeline
✅ Testing strategy with accessibility gates
✅ Epic-specific implementation guidance (Epic 4-8)
✅ Accepted risks with mitigation strategies

**Ready for:**

- Product owner risk acceptance sign-off
- Security review (before Epic 4)
- Accessibility review (before Epic 6)
- GDS compliance review (before Epic 8)
- Development team handoff (ADR-015)

---

**Document Version:** 1.0
**Created:** 2025-11-22
**Status:** Complete - Ready for Stakeholder Review
**Next Action:** Product owner risk acceptance sign-off (ADR-013)
