# Epic Technical Specification: AUP Modal Dynamic Lease Details

Date: 2025-12-02
Author: cns
Epic ID: 9
Status: Draft

---

## Overview

Epic 9 addresses a critical user trust issue in the AUP (Acceptable Use Policy) modal: currently, session duration and budget limits are hardcoded to "24 hours" and "$50 USD" instead of displaying actual values from the lease template API. Additionally, the Continue button can be clicked before all content has loaded, potentially allowing users to accept terms they haven't fully seen.

This epic introduces a new API service to fetch lease template details from the Innovation Sandbox API (`GET /api/leaseTemplates/{tryId}`), integrates dynamic values into the modal display, and gates the Continue button on successful loading of all required data. The implementation follows existing patterns established in Epic 6 (configurations-service.ts) and maintains WCAG 2.2 AA accessibility compliance.

**FRs Covered:** FR-TRY-52, FR-TRY-53, FR-TRY-54, FR-TRY-57 (enhancement)

## Objectives and Scope

### In Scope

- **Story 9.1:** Create new `lease-templates-service.ts` to fetch lease template data from ISB API
- **Story 9.2:** Update AUP modal to display dynamic duration/budget values with loading states
- **Story 9.3:** Gate Continue button on all data loaded (`isFullyLoaded` computed state)
- **Story 9.4:** Clear error states when API calls fail (with 404-specific messaging)
- Unit tests for new service (10+ test cases)
- Update existing modal tests for new behavior
- ARIA live region announcements for loading/success/error states
- Defensive API response parsing with logging

### Out of Scope

- Retry button in modal (user can close and click Try again)
- Caching of lease template data (templates may change, modal is short-lived)
- Template name display (optional field, not shown in current modal design)
- Changes to the AUP content fetching (Story 6.7 - already implemented)
- Backend API changes (using existing ISB endpoint)

## System Architecture Alignment

### Architecture Decisions Referenced

| ADR | Decision | Relevance to Epic 9 |
|-----|----------|---------------------|
| ADR-021 | Centralized API Client | Use `callISBAPI()` wrapper for lease template fetch |
| ADR-022 | Type-Safe API Response Models | Define `LeaseTemplateResult` interface |
| ADR-026 | Accessible Modal Pattern | Maintain WCAG 2.2 AA compliance during loading states |
| ADR-028 | Request Deduplication | Wrap fetch in `deduplicatedRequest()` |

### Module Context

This epic modifies the `src/try/` module structure:

```
src/try/
├── api/
│   ├── api-client.ts             # Existing - uses callISBAPI()
│   ├── configurations-service.ts # Pattern to follow for new service
│   ├── leases-service.ts         # Existing lease operations
│   └── lease-templates-service.ts # NEW - Story 9.1
├── ui/
│   └── components/
│       └── aup-modal.ts          # MODIFY - Stories 9.2, 9.3, 9.4
└── utils/
    └── request-dedup.ts          # Existing - use for deduplication
```

---

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs |
|--------|----------------|--------|---------|
| `lease-templates-service.ts` | Fetch lease template details from ISB API | `tryId: string` (UUID) | `LeaseTemplateResult` |
| `aup-modal.ts` (modified) | Display dynamic values, gate Continue button | `tryId`, template data | Rendered modal with real values |
| `request-dedup.ts` (existing) | Prevent duplicate concurrent API calls | Request key | Deduplicated promise |

### Data Models and Contracts

#### LeaseTemplate API Response (from ISB OpenAPI)

```typescript
// ISB API Response: GET /api/leaseTemplates/{id}
// JSend format: { status: "success", data: LeaseTemplate }
interface LeaseTemplateAPIResponse {
  status: "success" | "fail" | "error";
  data?: {
    uuid: string;                      // Lease template UUID
    name: string;                      // Template name (required)
    description?: string;              // Optional description
    requiresApproval: boolean;         // Whether approval needed
    createdBy: string;                 // Creator email
    maxSpend?: number;                 // Maximum budget in USD (OPTIONAL)
    leaseDurationInHours?: number;     // Duration in hours (OPTIONAL)
    budgetThresholds?: BudgetThreshold[];
    durationThresholds?: DurationThreshold[];
    meta?: {
      createdTime: string;
      lastEditTime: string;
      schemaVersion: number;
    };
  };
  message?: string;                    // Error message (if status: "error")
}
```

#### LeaseTemplateResult (new interface for Story 9.1)

```typescript
/**
 * Result from fetching lease template details.
 * Follows pattern from ConfigurationsResult in configurations-service.ts
 */
export interface LeaseTemplateResult {
  success: boolean;
  data?: {
    leaseDurationInHours: number;  // Defaults to 24 if not in response
    maxSpend: number;              // Defaults to 50 if not in response
    name?: string;                 // Optional template name
  };
  error?: string;
  errorCode?: 'NOT_FOUND' | 'UNAUTHORIZED' | 'TIMEOUT' | 'SERVER_ERROR' | 'NETWORK_ERROR';
}
```

#### Extended AupModalState (Story 9.2, 9.3)

```typescript
interface AupModalState {
  isOpen: boolean;
  tryId: string | null;
  aupAccepted: boolean;
  isLoading: boolean;
  error: string | null;
  // NEW fields for Epic 9
  aupLoaded: boolean;                  // True only on successful AUP fetch (not fallback)
  leaseTemplateLoading: boolean;       // Loading state for template fetch
  leaseTemplateLoaded: boolean;        // True only on successful template fetch
  leaseTemplateData: {
    leaseDurationInHours: number;
    maxSpend: number;
  } | null;
  leaseTemplateError: string | null;   // Template-specific error message
}

// Computed property
get isFullyLoaded(): boolean {
  return this.state.aupLoaded && this.state.leaseTemplateLoaded;
}
```

### APIs and Interfaces

#### fetchLeaseTemplate() Function (Story 9.1)

```typescript
/**
 * Fetch lease template details from Innovation Sandbox API.
 *
 * @param tryId - Lease template UUID from product frontmatter
 * @returns Promise<LeaseTemplateResult>
 *
 * @example
 * const result = await fetchLeaseTemplate('550e8400-e29b-41d4-a716-446655440000');
 * if (result.success) {
 *   console.log(`Duration: ${result.data.leaseDurationInHours} hours`);
 *   console.log(`Budget: $${result.data.maxSpend}`);
 * }
 */
export async function fetchLeaseTemplate(tryId: string): Promise<LeaseTemplateResult>;
```

**API Endpoint Details:**

| Property | Value |
|----------|-------|
| Method | GET |
| Path | `/api/leaseTemplates/{tryId}` |
| Auth | Bearer JWT (same as other ISB endpoints) |
| Timeout | 5000ms (config.requestTimeout) |
| Response | JSend format `{ status, data }` |
| Error 400 | Invalid UUID format |
| Error 401 | Unauthorized - redirect to sign-in |
| Error 404 | Template not found |
| Error 500+ | Server error |

### Workflows and Sequencing

#### Modal Open Flow (Updated for Epic 9)

```
User clicks "Try this now" button
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ aupModal.open(tryId, onAccept)                          │
├─────────────────────────────────────────────────────────┤
│ 1. Reset state, set tryId                               │
│ 2. render() - show loading skeleton                     │
│ 3. Disable checkbox (with tooltip)                      │
│ 4. announce("Loading session terms...")                 │
│ 5. Start PARALLEL fetches:                              │
│    ├── loadAupContent()                                 │
│    └── loadLeaseTemplate(tryId)  ← NEW                  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Promise.all([loadAupContent(), loadLeaseTemplate()])    │
├─────────────────────────────────────────────────────────┤
│ On each resolve:                                        │
│   - Update state (aupLoaded, leaseTemplateLoaded)       │
│   - Re-render affected sections                         │
│   - Check isFullyLoaded                                 │
│                                                         │
│ When both complete:                                     │
│   - If both success: Enable checkbox, announce values   │
│   - If any failure: Show error, keep Continue disabled  │
└─────────────────────────────────────────────────────────┘
```

#### Continue Button State Logic (Story 9.3)

```typescript
private updateButtons(): void {
  const continueBtn = document.getElementById(IDS.CONTINUE_BTN);

  // NEW: All-or-nothing logic
  const shouldDisable =
    !this.isFullyLoaded ||           // Both AUP and template must load
    !this.state.aupAccepted ||       // User must check checkbox
    this.state.isLoading;            // Not during submission

  continueBtn.disabled = shouldDisable;
  continueBtn.setAttribute('aria-disabled', String(shouldDisable));

  // Update button text based on state
  if (this.state.isLoading) {
    continueBtn.textContent = 'Requesting...';
  } else if (!this.isFullyLoaded) {
    continueBtn.textContent = 'Loading...';  // NEW
  } else {
    continueBtn.textContent = 'Continue';
  }
}
```

---

## Non-Functional Requirements

### Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Modal interactive time | < 3 seconds on 3G | Time from button click to checkbox enabled |
| API timeout | 5000ms | Abort controller timeout |
| Parallel fetch benefit | 30-50% faster than sequential | Total load time vs individual times |
| Skeleton load flash prevention | Min 100ms display | Prevent jarring flash for fast responses |

**Implementation Notes:**
- Both API calls (AUP + lease template) made in parallel via `Promise.all`
- Skeleton animation visible during load (CSS, not blocking render)
- Timeout ensures user isn't stuck indefinitely

### Security

| Requirement | Implementation |
|-------------|----------------|
| JWT Authentication | Use existing `callISBAPI()` which injects Bearer token |
| 401 Handling | Redirect to sign-in (existing behavior in api-client.ts) |
| Input Validation | UUID format validation before API call (fail fast) |
| XSS Prevention | Use `textContent` for dynamic values, never `innerHTML` |
| HTTPS Only | Enforced by existing infrastructure |

**No new security surface introduced** - uses existing authenticated API client pattern.

### Reliability/Availability

| Scenario | Behavior |
|----------|----------|
| API timeout | Show error "Unable to load session details", Continue disabled |
| API 404 | Show "This sandbox is currently unavailable", suggest alternatives |
| API 500 | Show error, log details, Continue disabled |
| Network failure | Show network error message, Continue disabled |
| Partial success (AUP ok, template fail) | Continue disabled, show template error |
| Partial success (template ok, AUP fail) | Continue disabled, show AUP error |

**All-or-nothing approach:** User cannot proceed without seeing accurate terms.

### Observability

| Signal | Implementation |
|--------|----------------|
| API call logging | `console.log('[lease-templates-service] Fetching template: {tryId}')` |
| Error logging | `console.error('[lease-templates-service] Error:', errorCode, message)` |
| Schema mismatch warning | `console.warn('[lease-templates-service] Missing expected fields')` |
| Timing metrics | `console.log('[lease-templates-service] Fetch completed in {ms}ms')` |

**Future enhancement:** CloudWatch metrics via existing monitoring infrastructure.

---

## Dependencies and Integrations

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Innovation Sandbox API | v1.0.4 | Lease template endpoint |
| GOV.UK Design System | v5.x | Modal styling, checkboxes |
| TypeScript | 5.x | Type-safe development |
| Jest | 29.x | Unit testing |

### Internal Dependencies

| Module | Usage |
|--------|-------|
| `src/try/api/api-client.ts` | `callISBAPI()` for authenticated requests |
| `src/try/utils/request-dedup.ts` | `deduplicatedRequest()` for concurrent call prevention |
| `src/try/utils/error-utils.ts` | `getHttpErrorMessage()` for user-friendly errors |
| `src/try/config.ts` | `config.requestTimeout` (5000ms) |
| `src/try/ui/utils/aria-live.ts` | `announce()` for screen reader announcements |

### Integration Points

| System | Integration |
|--------|-------------|
| Innovation Sandbox API | `GET /api/leaseTemplates/{id}` - fetch template details |
| AUP Modal | Modified to call new service and display dynamic values |
| Try Button | Passes `tryId` to modal (existing behavior) |

---

## Acceptance Criteria (Authoritative)

### Story 9.1: Create Lease Template Service

| ID | Criterion | Testable |
|----|-----------|----------|
| AC-9.1.1 | `fetchLeaseTemplate(tryId)` calls `GET /api/leaseTemplates/{tryId}` endpoint | ✓ Mock API test |
| AC-9.1.2 | Response parsed for `leaseDurationInHours` and `maxSpend` fields | ✓ Parse test |
| AC-9.1.3 | Returns typed `LeaseTemplateResult` with success/data or error/errorCode | ✓ Type test |
| AC-9.1.4 | 404 response returns `errorCode: 'NOT_FOUND'` | ✓ Error code test |
| AC-9.1.5 | 401 response triggers auth redirect via callISBAPI | ✓ Redirect test |
| AC-9.1.6 | 500+ response returns `errorCode: 'SERVER_ERROR'` | ✓ Error code test |
| AC-9.1.7 | Network timeout (>5s) returns `errorCode: 'TIMEOUT'` | ✓ Timeout test |
| AC-9.1.8 | Invalid UUID rejected before API call | ✓ Validation test |
| AC-9.1.9 | Concurrent calls deduplicated (single network request) | ✓ Dedup test |
| AC-9.1.10 | Malformed API response (missing required fields) logged as warning | ✓ Logging test |

### Story 9.2: Display Dynamic Lease Details in Modal

| ID | Criterion | Testable |
|----|-----------|----------|
| AC-9.2.1 | Single combined loading skeleton shown initially | ✓ DOM test |
| AC-9.2.2 | Checkbox disabled with tooltip during loading | ✓ Attribute test |
| AC-9.2.3 | Duration displays as "Session duration: {hours} hours" from API | ✓ Content test |
| AC-9.2.4 | Budget displays as "Maximum spend: ${amount} USD (limits sandbox costs)" | ✓ Content test |
| AC-9.2.5 | Error state shows "Unknown" for duration/budget | ✓ Error display test |
| AC-9.2.6 | ARIA announces "Loading session terms" on modal open | ✓ A11y test |
| AC-9.2.7 | ARIA announces loaded values on success | ✓ A11y test |
| AC-9.2.8 | ARIA announces error state on failure | ✓ A11y test |
| AC-9.2.9 | Focus remains trapped in modal during state changes | ✓ Focus test |
| AC-9.2.10 | Modal interactive within 3s on 3G connection | ✓ Performance test |

### Story 9.3: Gate Continue Button on All Data Loaded

| ID | Criterion | Testable |
|----|-----------|----------|
| AC-9.3.1 | Button disabled when AUP loading | ✓ State test |
| AC-9.3.2 | Button disabled when lease template loading | ✓ State test |
| AC-9.3.3 | Button disabled when AUP failed (fallback shown) | ✓ State test |
| AC-9.3.4 | Button disabled when lease template failed | ✓ State test |
| AC-9.3.5 | Button disabled when checkbox unchecked | ✓ State test |
| AC-9.3.6 | Button enabled only when all three conditions met | ✓ State test |
| AC-9.3.7 | Button re-disables if user unchecks checkbox | ✓ Interaction test |
| AC-9.3.8 | Screen reader announces button state changes | ✓ A11y test |
| AC-9.3.9 | Race: checkbox checked while loading → button stays disabled | ✓ Race test |
| AC-9.3.10 | Race: template loads while checkbox checked → button enables | ✓ Race test |

### Story 9.4: Clear Error States for Failed Loads

| ID | Criterion | Testable |
|----|-----------|----------|
| AC-9.4.1 | API error displays "Unable to load session details" | ✓ Error message test |
| AC-9.4.2 | 404 displays "This sandbox is currently unavailable" | ✓ 404 message test |
| AC-9.4.3 | Continue button remains disabled on error | ✓ Button state test |
| AC-9.4.4 | Cancel button works normally on error | ✓ Cancel test |
| AC-9.4.5 | Error logging captures template ID and error code | ✓ Logging test |

---

## Traceability Mapping

| AC ID | Spec Section | Component/API | Test Approach |
|-------|--------------|---------------|---------------|
| AC-9.1.1 | APIs and Interfaces | `fetchLeaseTemplate()` | Unit: mock fetch |
| AC-9.1.2 | Data Models | `LeaseTemplateResult` | Unit: parse response |
| AC-9.1.3 | Data Models | `LeaseTemplateResult` | Unit: type validation |
| AC-9.1.4-7 | Error Handling | `errorCode` enum | Unit: each error code |
| AC-9.1.8 | Input Validation | UUID regex | Unit: invalid input |
| AC-9.1.9 | Request Dedup | `deduplicatedRequest()` | Unit: concurrent calls |
| AC-9.1.10 | Observability | `console.warn` | Unit: verify logging |
| AC-9.2.1-2 | Workflows | `aup-modal.ts` render | DOM: loading state |
| AC-9.2.3-5 | Workflows | Display logic | DOM: content verification |
| AC-9.2.6-8 | Accessibility | ARIA live regions | A11y: screen reader |
| AC-9.2.9 | Accessibility | Focus trap | A11y: focus management |
| AC-9.2.10 | Performance | Modal load time | Performance: timing |
| AC-9.3.1-10 | Button State Logic | `updateButtons()` | Unit: state machine |
| AC-9.4.1-5 | Error States | Error display | Integration: error flows |

---

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API schema changes break parsing | Low | High | Defensive parsing, log mismatches, fallback to defaults |
| Slow API causes UX friction | Medium | Medium | 5s timeout, skeleton loading, parallel fetch |
| Race condition on button state | Medium | Critical | Explicit `isFullyLoaded` computed state |
| A11y regression in loading states | Medium | High | Screen reader testing in DoD, ARIA live regions |
| Missing `maxSpend`/`leaseDurationInHours` in response | Low | Medium | Use sensible defaults (24h, $50), log warning |

### Assumptions

| Assumption | Validation |
|------------|------------|
| ISB API endpoint exists at `/api/leaseTemplates/{id}` | ✓ Verified in ISB OpenAPI spec |
| Response includes `leaseDurationInHours` and `maxSpend` fields | ✓ Verified (optional fields, may need defaults) |
| Auth uses same JWT flow as other endpoints | ✓ Uses `callISBAPI()` wrapper |
| `tryId` from product frontmatter is valid UUID | Validate at service layer before API call |
| Modal `tryId` is passed from Try button | ✓ Existing behavior in try-button.ts |

### Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| What defaults if `maxSpend`/`leaseDurationInHours` missing? | Architect | **Resolved:** Use 24h/$50 defaults, log warning |
| Should we cache template data? | Architect | **Resolved:** No cache (templates may change, modal short-lived) |
| Retry button needed? | User | **Resolved:** No - user can close and click Try again |

---

## Test Strategy Summary

### Test Levels

| Level | Coverage | Framework |
|-------|----------|-----------|
| Unit Tests | lease-templates-service.ts (10 test cases) | Jest |
| Unit Tests | aup-modal.ts state changes (12 test cases) | Jest |
| Integration Tests | Modal with mocked API | Jest + DOM testing |
| E2E Tests | Full try flow with loading states | Playwright |
| Accessibility Tests | Screen reader, keyboard navigation | axe-core, manual NVDA/VoiceOver |

### Test Files

| File | Purpose |
|------|---------|
| `src/try/api/lease-templates-service.test.ts` | NEW - Service unit tests |
| `src/try/ui/components/aup-modal.test.ts` | UPDATED - Modal behavior tests |
| `test/e2e/try-modal-loading.spec.ts` | NEW - E2E loading state tests |

### Key Test Scenarios

1. **Happy Path:** Template loads → values displayed → checkbox enables → Continue enables
2. **Error Path:** Template fails → error shown → Continue disabled → Cancel works
3. **Race Condition:** Checkbox checked before template loads → Continue stays disabled until load completes
4. **Timeout:** API takes >5s → timeout error → Continue disabled
5. **404 Case:** Template not found → specific "unavailable" message → Continue disabled
6. **Accessibility:** Screen reader announcements at each state transition

### Coverage Targets

| Metric | Target |
|--------|--------|
| Line coverage | 90%+ for new code |
| Branch coverage | 85%+ for state logic |
| A11y violations | 0 critical/serious |
