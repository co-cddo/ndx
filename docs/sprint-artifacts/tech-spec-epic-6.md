# Epic Technical Specification: Epic 6 - Catalogue Integration & Sandbox Requests

Date: 2025-11-24
Author: cns
Epic ID: 6
Status: Draft

---

## Overview

Epic 6 enables government users to discover tryable products in the NDX catalogue and request AWS sandbox environments through an accessible, GOV.UK-compliant AUP acceptance modal. This epic bridges the authentication foundation (Epic 5) with the sessions dashboard (Epic 7), implementing the core "try before you buy" user journey from product discovery to sandbox request.

The epic covers 24 functional requirements (FR-TRY-42 through FR-TRY-65) implementing catalogue metadata parsing, tag-based filtering, try button integration, AUP modal with accessibility compliance, and lease request API integration.

## Objectives and Scope

### In Scope

- **Story 6.0:** UX Review Checkpoint (GATE) - Validate UX design before implementation
- **Story 6.1:** Parse `try` and `try_id` metadata from product YAML frontmatter
- **Story 6.2:** Generate "Try Before You Buy" tag for products with `try: true`
- **Story 6.3:** Catalogue tag filter for "Try Before You Buy" products
- **Story 6.4:** "Try this now for 24 hours" button on product pages (GOV.UK Start Button)
- **Story 6.5:** Authentication check before showing AUP modal
- **Story 6.6:** Lease Request Modal Overlay UI (WCAG 2.2 AA compliant)
- **Story 6.7:** Fetch and display AUP from Innovation Sandbox API
- **Story 6.8:** AUP checkbox and Continue button state management
- **Story 6.9:** Submit lease request and handle API responses (200, 409, 500)
- **Story 6.10:** Epic 6-7 integration testing (catalogue → dashboard handoff)
- **Story 6.11:** Automated accessibility tests for catalogue Try UI

### Out of Scope

- Session management UI (Epic 7)
- Session termination functionality (Growth feature)
- Multiple lease template selection (Growth feature)
- Budget alerts and warnings (Growth feature)
- Manual accessibility testing (Epic 8)
- Mobile-specific responsive fixes (Epic 8)

## System Architecture Alignment

### Architecture Components Referenced

| Component         | ADR Reference | Implementation                                 |
| ----------------- | ------------- | ---------------------------------------------- |
| AUP Modal         | ADR-026       | Custom Element `<aup-modal>` with focus trap   |
| API Client        | ADR-021       | Centralized API client with auth interceptor   |
| Try Button        | ADR-017       | Vanilla TypeScript event handler               |
| Auth Check        | ADR-024       | AuthState.isAuthenticated()                    |
| Error Messages    | ADR-032       | User-friendly error message mapping            |
| ARIA Live Regions | ADR-028       | Screen reader announcements for loading/errors |

### Key ADRs for Epic 6

1. **ADR-026: Accessible Modal Pattern** (CRITICAL)
   - Focus trap implementation required
   - ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
   - Keyboard navigation: Tab, Shift+Tab, Escape key handling
   - Screen reader announcements for loading/error states

2. **ADR-021: Centralized API Client**
   - POST /api/leases with automatic auth header injection
   - GET /api/configurations for AUP text
   - Automatic 401 handling (redirect to login)

3. **ADR-032: User-Friendly Error Messages**
   - 409: "You've reached the maximum of 3 active sessions"
   - 500/503: "The sandbox service is temporarily unavailable"
   - Network timeout: "Request timed out. Please check your connection"

4. **ADR-014: Innovation Sandbox API Confirmation**
   - Must validate API authorization enforcement during Story 6.9
   - Test: POST /api/leases with unauthorized template UUID → Expect 403

## Detailed Design

### Services and Modules

| Module                      | Responsibility                      | Location                                |
| --------------------------- | ----------------------------------- | --------------------------------------- |
| `aup-modal.ts`              | AUP acceptance modal Custom Element | `src/try/ui/components/aup-modal.ts`    |
| `try-button.ts`             | Try button event handler            | `src/try/ui/try-button.ts`              |
| `focus-trap.ts`             | Modal focus trap utility            | `src/try/ui/utils/focus-trap.ts`        |
| `aria-live.ts`              | ARIA live region announcements      | `src/try/ui/utils/aria-live.ts`         |
| `configurations-service.ts` | AUP text fetching                   | `src/try/api/configurations-service.ts` |
| `leases-service.ts`         | Lease request operations            | `src/try/api/leases-service.ts`         |

### Data Models and Contracts

```typescript
// Lease Request Payload (POST /api/leases)
interface LeaseRequest {
  leaseTemplateId: string // UUID from product frontmatter try_id
  acceptedAUP: boolean // User consent flag
}

// Lease Response (201 Created)
interface LeaseResponse {
  leaseId: string
  awsAccountId: string
  expirationDate: string // ISO 8601 date
  status: "Pending" | "Active"
  maxSpend: number // $50 for 24-hour lease
}

// Configuration Response (GET /api/configurations)
interface ConfigurationResponse {
  aup: string // AUP HTML/text content
  maxLeases: number // Maximum concurrent leases (5)
  leaseDuration: number // Hours (24)
}

// Product YAML Frontmatter
interface ProductTryMetadata {
  try: boolean // Whether product is tryable
  try_id: string // Lease template UUID
}
```

### APIs and Interfaces

| Endpoint              | Method | Request      | Response              | Error Codes        |
| --------------------- | ------ | ------------ | --------------------- | ------------------ |
| `/api/configurations` | GET    | -            | ConfigurationResponse | 401, 500           |
| `/api/leases`         | POST   | LeaseRequest | LeaseResponse         | 401, 409, 400, 500 |
| `/api/auth/login`     | GET    | -            | OAuth redirect        | -                  |

### Workflows and Sequencing

**Try Request Flow:**

```
1. User clicks "Try this now for 24 hours" button
   └─> try-button.ts handles click event

2. Check authentication
   └─> AuthState.isAuthenticated()
   └─> If false: Redirect to /api/auth/login
   └─> Store return URL in sessionStorage

3. Open AUP modal
   └─> aup-modal.ts open() method
   └─> Fetch AUP from GET /api/configurations
   └─> Display modal with focus trap

4. User accepts AUP
   └─> Checkbox checked enables Continue button
   └─> User clicks Continue

5. Submit lease request
   └─> POST /api/leases with leaseTemplateId + acceptedAUP
   └─> Show loading state ("Requesting your sandbox...")

6. Handle response
   └─> 201 Created: Show "Sandbox ready!" → Redirect to /try
   └─> 409 Conflict: Show error → Redirect to /try
   └─> 500 Error: Show error message in modal
```

## Non-Functional Requirements

### Performance

| Requirement                      | Target       | Source         |
| -------------------------------- | ------------ | -------------- |
| Modal appears after button click | < 100ms      | NFR-TRY-PERF-4 |
| AUP fetch completion             | < 2 seconds  | NFR-TRY-PERF-1 |
| Lease request API timeout        | 10 seconds   | NFR-TRY-PERF-2 |
| Total try flow duration          | < 30 seconds | UX Principle 2 |

### Security

| Requirement                | Implementation          | Source        |
| -------------------------- | ----------------------- | ------------- |
| JWT in sessionStorage only | No localStorage/cookies | NFR-TRY-SEC-1 |
| HTTPS only for API calls   | fetch() with HTTPS URLs | NFR-TRY-SEC-4 |
| No token logging           | Client-side code audit  | NFR-TRY-SEC-3 |
| Token cleanup from URL     | history.replaceState()  | NFR-TRY-SEC-6 |

### Reliability/Availability

| Requirement                                | Implementation                     | Source        |
| ------------------------------------------ | ---------------------------------- | ------------- |
| Graceful API failure                       | User-friendly error messages       | NFR-TRY-REL-2 |
| Retry option on timeout                    | "Try again" button in error UI     | NFR-TRY-REL-3 |
| Defensive API parsing                      | TypeScript interfaces + validation | NFR-TRY-REL-4 |
| No JavaScript errors on malformed response | Try/catch with fallback            | NFR-TRY-REL-4 |

### Observability

| Signal                      | Implementation       | Purpose                 |
| --------------------------- | -------------------- | ----------------------- |
| Console logging             | Debug mode flag      | Development debugging   |
| Error tracking              | Window error handler | Runtime error detection |
| API call timing             | Performance marks    | Performance monitoring  |
| Accessibility announcements | ARIA live regions    | Screen reader UX        |

## Dependencies and Integrations

### Package Dependencies

| Package                          | Version | Purpose                          |
| -------------------------------- | ------- | -------------------------------- |
| `@x-govuk/govuk-eleventy-plugin` | 7.2.1   | GOV.UK Design System integration |
| `govuk-frontend`                 | 5.x     | GOV.UK components                |
| `esbuild`                        | latest  | TypeScript compilation           |
| `@axe-core/playwright`           | 4.11.0  | Accessibility testing            |

### External Integrations

| Integration              | Endpoint              | Purpose                |
| ------------------------ | --------------------- | ---------------------- |
| Innovation Sandbox API   | `/api/configurations` | AUP text fetching      |
| Innovation Sandbox API   | `/api/leases`         | Lease request creation |
| Innovation Sandbox OAuth | `/api/auth/login`     | User authentication    |

### Internal Module Dependencies

```
src/try/ui/components/aup-modal.ts
├── imports: src/try/api/configurations-service.ts (AUP fetch)
├── imports: src/try/api/leases-service.ts (lease request)
├── imports: src/try/ui/utils/focus-trap.ts
├── imports: src/try/ui/utils/aria-live.ts
└── imports: src/try/auth/auth-provider.ts (auth check)

src/try/ui/try-button.ts
├── imports: src/try/auth/auth-provider.ts (isAuthenticated)
└── imports: src/try/ui/components/aup-modal.ts (open modal)
```

## Acceptance Criteria (Authoritative)

### Story 6.0: UX Review Checkpoint (GATE)

1. UX Element 1: "Try Before You Buy" tag placement validated
2. UX Element 2: "Try this now for 24 hours" button placement validated
3. UX Element 3: Lease request modal layout validated
4. UX Element 4: Link from /try page to tryable products validated
5. Accessibility considerations reviewed (keyboard nav, focus management, ARIA)
6. Team consensus reached on UX approach

### Story 6.1: Parse "try" Metadata

1. System parses `try` boolean from product YAML frontmatter
2. System parses `try_id` UUID from product YAML frontmatter
3. Metadata available in Nunjucks templates
4. Products without `try` metadata treated as not tryable
5. Invalid `try_id` format logs warning during build

### Story 6.2: Generate "Try Before You Buy" Tag

1. Products with `try: true` get "Try Before You Buy" tag
2. Tag uses GOV.UK tag component with green styling
3. Tag appears on product cards in catalogue listing
4. Tag appears on product detail pages

### Story 6.3: Catalogue Tag Filter

1. "Try Before You Buy" appears in filter sidebar
2. Filter shows count of tryable products
3. Clicking filter shows only tryable products
4. URL updates with filter state
5. Filter state persists on page refresh

### Story 6.4: Try Button on Product Pages

1. Button appears on products with `try: true` metadata
2. Button uses GOV.UK Start Button styling
3. Button text: "Try this now for 24 hours"
4. Button has data-module="try-button" and data-try-id attributes
5. Button NOT shown on products without `try` metadata

### Story 6.5: Try Button Authentication Check

1. Button click checks authentication via sessionStorage
2. Unauthenticated users redirected to /api/auth/login
3. Return URL stored for post-auth redirect
4. Authenticated users see AUP modal immediately

### Story 6.6: Lease Request Modal UI

1. Modal has dark overlay background
2. Modal has "Request AWS Sandbox Access" header
3. Modal displays lease duration (24 hours) and budget ($50)
4. Modal has scrollable AUP container
5. Modal has AUP checkbox with label
6. Modal has Cancel and Continue buttons
7. Modal implements focus trap (ADR-026)
8. Modal has ARIA attributes for accessibility

### Story 6.7: Fetch AUP from API

1. AUP fetched from GET /api/configurations
2. AUP displayed in scrollable container
3. Loading indicator shown while fetching
4. Error handling if API call fails

### Story 6.8: AUP Checkbox and Button State

1. Checkbox unchecked by default
2. Continue button disabled when checkbox unchecked
3. Continue button enabled when checkbox checked
4. Cancel button closes modal without action
5. Button state announced to screen readers

### Story 6.9: Submit Lease Request

1. POST /api/leases with leaseTemplateId and acceptedAUP
2. Loading indicator shown during request
3. 200 OK: Navigate to /try page
4. 409 Conflict: Alert + redirect to /try
5. Other errors: Alert with error message
6. Modal closes after request completion

### Story 6.10: Integration Testing

1. End-to-end flow from product page to /try page validated
2. New lease appears in sessions table
3. Lease data matches expected format
4. Session table sorting works (newest first)

### Story 6.11: Accessibility Tests

1. Try button keyboard accessible
2. Modal has role="dialog" and aria-modal="true"
3. Focus trap works correctly
4. Escape key closes modal
5. Checkbox label associated correctly
6. Disabled button state announced
7. Tests run in CI pipeline

## Traceability Mapping

| AC       | FR Reference | Component              | Test Approach    |
| -------- | ------------ | ---------------------- | ---------------- |
| 6.1-AC1  | FR-TRY-42    | Eleventy frontmatter   | Unit test        |
| 6.1-AC2  | FR-TRY-43    | Eleventy frontmatter   | Unit test        |
| 6.2-AC1  | FR-TRY-44    | Nunjucks template      | Visual test      |
| 6.3-AC1  | FR-TRY-46    | Existing filter logic  | E2E test         |
| 6.4-AC1  | FR-TRY-47    | try-button.ts          | Unit test        |
| 6.5-AC1  | FR-TRY-49    | AuthState              | Unit test        |
| 6.6-AC1  | FR-TRY-51    | aup-modal.ts           | Unit test        |
| 6.6-AC7  | FR-TRY-73    | focus-trap.ts          | Unit test        |
| 6.7-AC1  | FR-TRY-54    | configurations-service | Integration test |
| 6.8-AC1  | FR-TRY-56    | aup-modal.ts           | Unit test        |
| 6.9-AC1  | FR-TRY-59    | leases-service         | Integration test |
| 6.9-AC4  | FR-TRY-62    | error-handler.ts       | Unit test        |
| 6.11-AC2 | FR-TRY-72    | Pa11y tests            | Automated a11y   |

## Risks, Assumptions, Open Questions

### Risks

| Risk                                                 | Likelihood | Impact | Mitigation                                              |
| ---------------------------------------------------- | ---------- | ------ | ------------------------------------------------------- |
| AUP modal accessibility fails WCAG 2.2 AA            | Medium     | High   | ADR-026 focus trap implementation, ADR-004 testing gate |
| Innovation Sandbox API doesn't enforce authorization | Low        | High   | ADR-014 requires API validation during Story 6.9        |
| Modal focus trap breaks in certain browsers          | Low        | Medium | Cross-browser testing, fallback to no focus trap        |
| AUP text too long for scrollable container           | Medium     | Low    | Max-height with scroll indicator                        |

### Assumptions

1. Innovation Sandbox API `/api/configurations` returns AUP text in expected format
2. OAuth flow from Epic 5 is working correctly
3. GOV.UK Design System modal pattern is accessible
4. Lease template UUIDs are pre-populated in product YAML files
5. API authorization is enforced server-side (validates ADR-006 rejection)

### Open Questions

1. **Q:** Should modal backdrop click close the modal?
   **A:** No - user must explicitly click Cancel or Escape (prevents accidental dismissal)

2. **Q:** What happens if user has checkbox checked but clicks Escape?
   **A:** Show confirmation "Are you sure?" before closing (prevents accidental loss of intent)

3. **Q:** How should "Try" button appear if user already has max leases?
   **A:** Button disabled with tooltip "Maximum sessions reached" (discoverable in Story 6.9 implementation)

## Test Strategy Summary

### Test Levels

| Level               | Framework                    | Coverage Target | Stories        |
| ------------------- | ---------------------------- | --------------- | -------------- |
| Unit Tests          | Jest + @testing-library/dom  | 80%             | 6.1-6.9        |
| Integration Tests   | Jest with fetch mocks        | API integration | 6.7, 6.9, 6.10 |
| Accessibility Tests | @axe-core/playwright + Pa11y | Zero violations | 6.11           |
| E2E Tests           | Playwright                   | Critical paths  | 6.10           |

### Test Scenarios

**Unit Tests (Stories 6.1-6.9):**

- YAML frontmatter parsing for `try` and `try_id`
- AuthState.isAuthenticated() check
- Modal open/close state management
- Focus trap tab key handling
- Checkbox enables/disables button
- API client POST /api/leases request format
- Error message mapping (409 → user-friendly)

**Integration Tests (Stories 6.7, 6.9, 6.10):**

- AUP fetch → display in modal
- Lease request → success → redirect
- Lease request → 409 → error alert
- Complete try flow (button → modal → API → redirect)

**Accessibility Tests (Story 6.11):**

- Modal has role="dialog" and aria-modal="true"
- Focus moves to first interactive element on open
- Focus trapped within modal
- Escape key closes modal
- Tab cycles through modal elements
- Screen reader announces loading/error states
- Checkbox label associated with input
- Button disabled state announced

### Edge Cases

- AUP fetch fails (show error, allow retry)
- User double-clicks Continue button (debounce)
- Network timeout during lease request (10s timeout, retry option)
- User navigates away during loading (graceful cancellation)
- Modal opened when already open (no-op)
- Invalid try_id in frontmatter (build warning, button disabled)

---

**Document Version:** 1.0
**Created:** 2025-11-24
**Status:** Complete - Ready for Story Implementation
**Next Action:** Story 6.0 UX Review Checkpoint (GATE)
