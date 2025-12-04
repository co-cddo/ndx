# Epic 9: AUP Modal Dynamic Lease Details

**Goal:** AUP modal displays actual lease template duration and budget, with Continue button disabled until all data loads

**User Value:** Users see accurate session terms (duration, budget) before accepting AUP, building trust and ensuring informed consent

**FRs Covered:** FR-TRY-52, FR-TRY-53, FR-TRY-54, FR-TRY-57 (enhancement)

**Problem Statement:**
The AUP modal currently hardcodes "24 hours" and "$50 USD" instead of fetching actual values from the lease template. The Continue button becomes clickable once the AUP checkbox is checked, even if the AUP content hasn't finished loading. Users may agree to terms they haven't fully seen or that don't match the actual lease.

---

## Pre-mortem Risk Analysis

*Identified failure modes and preventive measures (from pre-mortem analysis):*

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Slow API causing UX friction | Medium | High | Timeout (5s) + skeleton loading + 3G performance budget |
| Race condition on button state | Medium | Critical | Explicit `isFullyLoaded` computed state |
| API schema changes breaking display | Low | High | Defensive parsing + logging for mismatches |
| A11y regression in loading states | Medium | High | Screen reader testing in DoD |
| Invalid template ID at runtime | Low | Medium | Graceful 404 handling (Story 9.4) |

---

## Journey Mapping Insights

*UX improvements from user journey analysis:*

| Finding | Enhancement |
|---------|-------------|
| Multiple loading indicators confusing | Single combined loading state with skeleton |
| Budget wording unclear | Clarify: "Maximum spend: ${maxSpend} USD (limits sandbox costs)" |
| Checkbox visible during loading | Disabled with tooltip until content loads |
| Values must come from template | All duration/budget values fetched from `/api/leaseTemplates/{tryId}` |

---

## Devil's Advocate Refinements

*Stress-tested assumptions and adjustments:*

| Challenge | Decision |
|-----------|----------|
| Is 4 stories over-engineered? | No - user trust requires proper error handling |
| Checkbox disabled adds friction? | Keep disabled - prevents premature consent |
| Retry logic is scope creep? | Removed - just show error, user can close and retry manually |
| API schema unverified? | Added prerequisite to verify endpoint |

---

## Design Rationale (Decision Matrix)

*Key design decisions validated through weighted criteria analysis:*

| Decision | Choice | Why |
|----------|--------|-----|
| Fetch strategy | **Parallel** | Fastest time-to-interactive, best user perception |
| Loading display | **Combined skeleton** | Clearest UX, single loading state vs multiple spinners |
| Partial success | **All-or-nothing** | User trust requires both AUP and template to succeed |

---

## User Insights (Empathy Map)

*Key findings from user perspective analysis:*

| Insight | Design Impact |
|---------|---------------|
| Users scan duration/budget **first** | Make these prominent, visible immediately when loaded |
| Loading anxiety is real | Skeleton animation conveys activity, prevents "is it broken?" |
| Budget wording causes confusion | Clarified with "(limits sandbox costs)" |
| Users skim AUP, don't read thoroughly | Keep AUP short, key terms in duration/budget display |
| Quick = trust, slow = doubt | Parallel fetching minimizes wait time |

---

## Prerequisites

**Before Story 9.1 begins:**
- [ ] Verify `GET /api/leaseTemplates/{id}` endpoint exists in Innovation Sandbox API
- [ ] Confirm response schema includes `leaseDurationInHours` and `maxSpend` fields
- [ ] Confirm auth requirements match other ISB endpoints (same JWT flow)

---

## Story 9.1: Create Lease Template Service

As a developer,
I want to fetch lease template details from the Innovation Sandbox API,
So that the modal can display actual duration and budget limits.

**Acceptance Criteria:**

**Given** the AUP modal is opened with a `tryId` (lease template UUID)
**When** the modal initializes
**Then** a new service function `fetchLeaseTemplate(tryId)` is called

**And** the service calls `GET /api/leaseTemplates/{tryId}` endpoint
**And** the response is parsed for:
- `leaseDurationInHours` (number) - Session duration in hours
- `maxSpend` (number) - Maximum budget in USD
- `name` (string, optional) - Template name for display

**And** the service returns a typed result:
```typescript
interface LeaseTemplateResult {
  success: boolean;
  data?: {
    leaseDurationInHours: number;
    maxSpend: number;
    name?: string;
  };
  error?: string;
  errorCode?: 'NOT_FOUND' | 'UNAUTHORIZED' | 'TIMEOUT' | 'SERVER_ERROR' | 'NETWORK_ERROR';
}
```

**And** error handling covers:
- 404: Template not found (errorCode: 'NOT_FOUND')
- 401: Redirect to sign-in (errorCode: 'UNAUTHORIZED')
- 500+: Server error with retry guidance (errorCode: 'SERVER_ERROR')
- Network timeout: Connection error message (errorCode: 'TIMEOUT')

**And** request timeout is set to 5000ms (config.requestTimeout)
**And** request deduplication prevents concurrent duplicate calls (ADR-028)
**And** response parsing is defensive - missing fields logged and handled gracefully

**Prerequisites:** None

**Technical Notes:**
- New file: `src/try/api/lease-templates-service.ts`
- Follows existing pattern from `configurations-service.ts`
- Uses `callISBAPI()` for authenticated requests
- UUID validation before API call (fail fast)
- No caching needed (template may change, short-lived modal)
- Log API response shape mismatches for monitoring

**Architecture Context:**
- **ADR-021:** Centralized API Client - use `callISBAPI()` wrapper
- **ADR-028:** Request Deduplication - wrap in `deduplicatedRequest()`
- **Module:** `src/try/api/` - API services directory

**Test Cases:**
1. Successful fetch returns template data with all fields
2. Successful fetch with missing optional fields (name) still succeeds
3. 404 returns NOT_FOUND error with user-friendly message
4. 401 triggers auth redirect (via callISBAPI)
5. Network error returns NETWORK_ERROR with appropriate message
6. Request timeout (>5s) returns TIMEOUT error
7. Invalid UUID rejected before API call (fail fast)
8. Concurrent calls deduplicated (single network request)
9. Malformed API response (missing required fields) returns error with logging
10. API response with unexpected field names logged as warning

---

## Story 9.2: Display Dynamic Lease Details in Modal

As a user,
I want to see the actual session duration and budget limit in the AUP modal,
So that I know exactly what I'm agreeing to before requesting access.

**Acceptance Criteria:**

**Given** the AUP modal opens for a tryable product
**When** the modal renders
**Then** a single combined loading state is displayed:
- Loading skeleton animation covers session info area
- Message: "Loading session terms..."
- Replaces separate loading indicators for duration/budget/AUP

**And** the AUP checkbox is disabled with tooltip "Available after terms load" until content loads

**And** modal must be interactive within 3 seconds on 3G connection (performance budget)

**And** once lease template data loads successfully (values from API):
- Duration displays as: "Session duration: {leaseDurationInHours} hours"
- Budget displays as: "Maximum spend: ${maxSpend} USD" with clarification "(limits sandbox costs)"

**And** if lease template fetch fails:
- Error message displayed: "Unable to load session details. Please try again."
- Duration and budget show: "Unknown" (not blank)
- Continue button remains disabled (cannot proceed without knowing terms)

**And** loading states use ARIA live regions for screen reader announcements:
- On open: "Loading session details"
- On success: "Session details loaded: {hours} hours, ${budget} budget"
- On error: "Error loading session details"

**And** focus remains on modal during loading state changes (no focus trap break)

**Prerequisites:** Story 9.1 (Lease Template Service)

**Technical Notes:**
- Modify `src/try/ui/components/aup-modal.ts`
- Remove hardcoded "24 hours" and "$50 USD" strings
- Add `leaseTemplateLoading` and `leaseTemplateData` state properties
- Call `fetchLeaseTemplate(tryId)` in `open()` method (parallel with AUP fetch)
- Update `render()` to use placeholder/loading states
- Update info display once data arrives
- Use CSS skeleton animations for loading state (not just text)

**Architecture Context:**
- **ADR-026:** Accessible Modal Pattern - maintain WCAG 2.2 AA compliance
- **UX Design:** Modal must clearly communicate what user is agreeing to

**Test Cases:**
1. Single combined loading state shown initially (not 3 separate)
2. Checkbox disabled with tooltip during loading
3. Checkbox enabled once content loads
4. Success state shows actual duration and budget values from API
5. Budget wording includes "(limits sandbox costs)" clarification
6. Error state shows "Unknown" with error message visible
7. Screen reader announces "Loading session terms" on modal open
8. Screen reader announces loaded values once data arrives
9. Screen reader announces error state if fetch fails
10. Different template values render correctly (e.g., 48 hours, $100)
11. Focus remains trapped in modal during loading → loaded transition
12. Loading state visible for at least 100ms (no flash for fast responses)

---

## Story 9.3: Gate Continue Button on All Data Loaded

As a user,
I want the Continue button to remain disabled until all information has loaded,
So that I cannot accidentally agree to terms I haven't seen.

**Acceptance Criteria:**

**Given** the AUP modal is open
**When** determining Continue button enabled state
**Then** the button is disabled (with `aria-disabled="true"`) unless ALL conditions are met:
1. AUP content has loaded successfully (not loading, not error/fallback)
2. Lease template data has loaded successfully (duration and budget known)
3. User has checked the "I accept the Acceptable Use Policy" checkbox

**And** explicit `isFullyLoaded` computed state tracks both async operations
**And** checkbox change handler re-validates `isFullyLoaded` state (prevents race condition)
**And** if AUP loads with fallback content (API failed), the button remains disabled
**And** if lease template fails to load, the button remains disabled
**And** visual indication shows what's still loading:
- During load: "Loading..." on button or info text
- On partial failure: Error message explains what failed

**And** Cancel button remains always enabled (user can always exit)

**Prerequisites:** Stories 9.1, 9.2

**Technical Notes:**
- Modify `updateButtons()` method in `aup-modal.ts`
- Add new state properties:
  - `aupLoaded: boolean` (true only on successful fetch, not fallback)
  - `leaseTemplateLoaded: boolean`
  - `isFullyLoaded: boolean` (computed: aupLoaded && leaseTemplateLoaded)
- Update button disabled logic:
  ```typescript
  const shouldDisable = !this.state.isFullyLoaded ||
                        !this.state.aupAccepted ||
                        this.state.isLoading;
  ```
- Checkbox handler must call `updateButtons()` which checks `isFullyLoaded`
- Consider combined loading state: "Loading policy and session details..."

**Architecture Context:**
- **FR-TRY-57:** Continue button disabled until AUP checkbox checked (enhanced)
- **WCAG:** Focus management - disabled button announced to screen readers

**Test Cases:**
1. Button disabled when AUP loading
2. Button disabled when lease template loading
3. Button disabled when AUP failed (fallback shown)
4. Button disabled when lease template failed
5. Button disabled when checkbox unchecked
6. Button enabled only when all three conditions met
7. Button re-disables if user unchecks checkbox
8. Screen reader announces button state changes
9. **Race condition test:** Given checkbox checked WHEN template still loading THEN button remains disabled
10. **Race condition test:** Given template loads WHILE checkbox already checked THEN button enables

---

## Story 9.4: Clear Error States for Failed Loads

As a user,
I want clear feedback when session information cannot be loaded,
So that I understand why I cannot proceed.

**Acceptance Criteria:**

**Given** the AUP modal opens for a tryable product
**When** the lease template API returns an error (404, 500, timeout, etc.)
**Then** the modal displays:
- Error message: "Unable to load session details"
- Session details show: "Unknown"
- Continue button remains disabled
- Cancel button available (user can close and try again)

**And** if template returns 404 specifically:
- Error message: "This sandbox is currently unavailable"
- Guidance: "Please try a different product or contact support"

**And** error details are logged for debugging (template ID, error code)

**Prerequisites:** Stories 9.1, 9.2, 9.3

**Technical Notes:**
- Simple error display - no retry button (user can close modal and click Try again)
- Log errors to console for debugging
- Error state prevents Continue button from enabling

**Architecture Context:**
- **UX Design:** Keep it simple - error + close is sufficient
- **Monitoring:** Log all error scenarios for operational visibility

**Test Cases:**
1. API error displays "Unable to load session details"
2. 404 response displays "sandbox unavailable" message
3. Continue button remains disabled on error
4. Cancel button works normally on error
5. Error logging captures template ID and error code

---

## Implementation Notes

### Parallel Loading Strategy

Both fetches should happen concurrently when modal opens:

```typescript
open(tryId: string, onAccept: AupAcceptCallback): void {
  // ... existing setup ...

  // Fetch both in parallel
  Promise.all([
    this.loadAupContent(),
    this.loadLeaseTemplate(tryId)
  ]).then(() => {
    this.checkReadyState();
  });
}
```

### Error Handling (Simple)

1. **Any fetch fails:** Show error message, Continue stays disabled, Cancel available
2. **Template 404:** Show "sandbox unavailable" message
3. **Both succeed:** Enable checkbox, then Continue when checked

User can close modal and click Try button again to retry.

### Rollback Safety

If issues arise, the fallback behavior (hardcoded values) can be restored by:
1. Reverting `updateButtons()` to original logic
2. Keeping lease template fetch but ignoring results for button state

---

## Definition of Done

- [ ] Prerequisites verified (API endpoint exists with expected schema)
- [ ] All stories have passing unit tests (Jest)
- [ ] E2E tests updated for new loading behavior
- [ ] Accessibility tests pass (keyboard, screen reader)
- [ ] **Manual screen reader test (NVDA or VoiceOver) completed**
- [ ] Code review completed
- [ ] Manual QA on staging environment
- [ ] No regressions in existing AUP modal functionality
- [ ] Error logging verified in console
