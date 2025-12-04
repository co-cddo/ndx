# Story 9.3: Gate Continue Button on All Data Loaded

Status: done

## Story

As a **user interacting with the AUP modal**,
I want the **Continue button to remain disabled until all required data has loaded successfully**,
so that **I cannot proceed without seeing the complete session terms and AUP content**.

## Acceptance Criteria

| ID | Criterion | Test Approach |
|----|-----------|---------------|
| AC-1 | Button disabled when AUP loading | State: isLoading test |
| AC-2 | Button disabled when lease template loading | State: leaseTemplateLoading test |
| AC-3 | Button disabled when AUP failed (fallback shown) | State: aupLoaded false test |
| AC-4 | Button disabled when lease template failed | State: leaseTemplateError test |
| AC-5 | Button disabled when checkbox unchecked | State: aupAccepted test |
| AC-6 | Button enabled only when all three conditions met | State: isFullyLoaded && aupAccepted |
| AC-7 | Button re-disables if user unchecks checkbox | Interaction: toggle checkbox test |
| AC-8 | Screen reader announces button state changes | A11y: ARIA live region test |
| AC-9 | Race: checkbox checked while loading -> button stays disabled | Race condition test |
| AC-10 | Race: template loads while checkbox checked -> button enables | Race condition test |

## Tasks / Subtasks

- [x] **Task 1: Add aupLoaded state property** (AC: 3, 6)
  - [x] 1.1: Add `aupLoaded: boolean` to AupModalState interface
  - [x] 1.2: Initialize `aupLoaded: false` in state defaults
  - [x] 1.3: Set `aupLoaded = true` on successful AUP fetch (not fallback)
  - [x] 1.4: Reset `aupLoaded = false` on modal close

- [x] **Task 2: Add isFullyLoaded computed property** (AC: 6)
  - [x] 2.1: Add getter `get isFullyLoaded(): boolean` returning `aupLoaded && leaseTemplateLoaded`
  - [x] 2.2: Update getState() to include computed `isFullyLoaded` value

- [x] **Task 3: Update updateButtons() for all-or-nothing logic** (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x] 3.1: Gate on `!this.isFullyLoaded` in shouldDisable calculation
  - [x] 3.2: Show "Loading..." button text when `!this.isFullyLoaded`
  - [x] 3.3: Maintain existing `!this.state.aupAccepted` check
  - [x] 3.4: Maintain existing `this.state.isLoading` check for submission
  - [x] 3.5: Ensure button re-disables on checkbox uncheck

- [x] **Task 4: Add ARIA announcements for button state** (AC: 8)
  - [x] 4.1: Announce when button becomes enabled ("Continue button is now enabled")
  - [x] 4.2: Use existing `announce()` utility

- [x] **Task 5: Handle race conditions** (AC: 9, 10)
  - [x] 5.1: Call `updateButtons()` after each state change
  - [x] 5.2: Verify checkbox state preserved during loading
  - [x] 5.3: Button enables immediately when last condition met

- [x] **Task 6: Write unit tests** (AC: 1-10)
  - [x] 6.1: Test button disabled during AUP loading
  - [x] 6.2: Test button disabled during lease template loading
  - [x] 6.3: Test button disabled when AUP fallback shown
  - [x] 6.4: Test button disabled when lease template failed
  - [x] 6.5: Test button disabled when checkbox unchecked
  - [x] 6.6: Test button enabled only when all conditions met
  - [x] 6.7: Test button re-disables on checkbox uncheck
  - [x] 6.8: Test ARIA announcement on button enable
  - [x] 6.9: Test race: checkbox before load complete
  - [x] 6.10: Test race: load completes after checkbox

## Dev Notes

### Architecture Patterns (from ADRs)

- **ADR-026:** Accessible Modal Pattern - Button state changes must be announced
- **Tech Spec:** Button state logic described in tech-spec-epic-9.md#Button-State-Logic

### Source Tree Components

| Component | Path | Action |
|-----------|------|--------|
| AUP Modal | `src/try/ui/components/aup-modal.ts` | MODIFY |
| AUP Modal Tests | `src/try/ui/components/aup-modal.test.ts` | MODIFY |

### Testing Standards

- Jest with jsdom environment for DOM and state testing
- Test race conditions with controlled promise resolution
- Test ARIA announcements with jest spies
- Follow patterns from Story 9.2 tests

### Project Structure Notes

- Modifies existing `aup-modal.ts` component (extended in Story 9.2)
- No new files created (only modifications)
- Builds on state properties added in Story 9.2

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Story-9.3]
- [Source: docs/sprint-artifacts/tech-spec-epic-9.md#Button-State-Logic]
- [Source: docs/try-before-you-buy-architecture.md#ADR-026]
- [Source: src/try/ui/components/aup-modal.ts] (current modal)

### Learnings from Previous Story

**From Story 9-2-display-dynamic-lease-details-in-modal (Status: done)**

- **State Properties Available**: `leaseTemplateLoading`, `leaseTemplateLoaded`, `leaseTemplateData`, `leaseTemplateError` already in AupModalState
- **Methods to Update**: `updateButtons()` at `aup-modal.ts:592-611` - add isFullyLoaded gating
- **updateCheckboxState()**: Already handles checkbox disabled during loading at `aup-modal.ts:299-310`
- **ARIA Pattern**: Use existing `announce()` from `aria-live.ts` for button state changes
- **Test Pattern**: Follow existing Story 9.2 tests at `aup-modal.test.ts:579-835`
- **Parallel Fetch**: AUP and lease template fetches already run in parallel at `aup-modal.ts:157-158`
- **loadAupContent()**: Need to set `aupLoaded = true` on success, not on fallback case

[Source: docs/sprint-artifacts/9-2-display-dynamic-lease-details-in-modal.md#Dev-Agent-Record]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/9-3-gate-continue-button-on-all-data-loaded.context.xml

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Implemented `aupLoaded` boolean state property in AupModalState interface
- Created `AupModalInternalState` type to exclude computed `isFullyLoaded` from internal state
- Added `get isFullyLoaded()` getter checking `aupLoaded && leaseTemplateLoaded && leaseTemplateData !== null`
- Updated `updateButtons()` with all-or-nothing logic gating on `isFullyLoaded`
- Added "Loading..." button text when not fully loaded
- Implemented ARIA announcement "Continue button is now enabled" when button state changes
- Added `updateButtons()` calls after AUP load and lease template load for race condition handling
- Reset `aupLoaded` and `isLoading` on modal close
- Added 10 new unit tests for Story 9.3 acceptance criteria
- All 66 tests passing (including Story 9.2 tests)

### File List

- `src/try/ui/components/aup-modal.ts` - Added aupLoaded state, isFullyLoaded getter, updated updateButtons()
- `src/try/ui/components/aup-modal.test.ts` - Added 10 new tests for Story 9.3

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-02 | 1.0.0 | Story implementation complete - 10/10 ACs satisfied, 66 tests passing |
| 2025-12-02 | 1.0.1 | Senior Developer Review notes appended - APPROVED |

---

## Senior Developer Review (AI)

### Reviewer
cns

### Date
2025-12-02

### Outcome
**APPROVE** - All acceptance criteria implemented with comprehensive test coverage

### Summary
Story 9.3 successfully implements all-or-nothing button gating logic for the AUP modal. The Continue button now remains disabled until both AUP content and lease template data have loaded successfully, and the checkbox is checked. This prevents users from accepting terms they haven't fully seen. Implementation follows established patterns and maintains WCAG 2.2 AA accessibility compliance.

### Key Findings

**No HIGH or MEDIUM severity issues found.**

**LOW severity (informational):**
- Note: Story file task checkboxes were not updated during development (now corrected in this review)

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC-1 | Button disabled when AUP loading | ✅ IMPLEMENTED | `aup-modal.ts:655` via `isFullyLoaded` |
| AC-2 | Button disabled when lease template loading | ✅ IMPLEMENTED | `aup-modal.ts:655` via `isFullyLoaded` |
| AC-3 | Button disabled when AUP failed (fallback shown) | ✅ IMPLEMENTED | `aup-modal.ts:215-226` sets `aupLoaded=false` |
| AC-4 | Button disabled when lease template failed | ✅ IMPLEMENTED | `aup-modal.ts:145` checks `leaseTemplateData !== null` |
| AC-5 | Button disabled when checkbox unchecked | ✅ IMPLEMENTED | `aup-modal.ts:655` `!this.state.aupAccepted` |
| AC-6 | Button enabled when all conditions met | ✅ IMPLEMENTED | `aup-modal.ts:655-656` all-or-nothing logic |
| AC-7 | Button re-disables on uncheck | ✅ IMPLEMENTED | `aup-modal.ts:581-582` updateButtons() on change |
| AC-8 | Screen reader announces state changes | ✅ IMPLEMENTED | `aup-modal.ts:668-671` announce() on enable |
| AC-9 | Race: checkbox before load | ✅ IMPLEMENTED | Test `aup-modal.test.ts:960-995` |
| AC-10 | Race: load after checkbox | ✅ IMPLEMENTED | Test `aup-modal.test.ts:997-1030` |

**Summary: 10 of 10 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| 1.1 Add aupLoaded to interface | [x] | ✅ DONE | aup-modal.ts:62-63 |
| 1.2 Initialize aupLoaded: false | [x] | ✅ DONE | aup-modal.ts:127-128 |
| 1.3 Set aupLoaded=true on success | [x] | ✅ DONE | aup-modal.ts:208-209 |
| 1.4 Reset aupLoaded on close | [x] | ✅ DONE | aup-modal.ts:379-380 |
| 2.1 Add isFullyLoaded getter | [x] | ✅ DONE | aup-modal.ts:144-146 |
| 2.2 Update getState() | [x] | ✅ DONE | aup-modal.ts:475-476 |
| 3.1 Gate on isFullyLoaded | [x] | ✅ DONE | aup-modal.ts:655 |
| 3.2 Show "Loading..." text | [x] | ✅ DONE | aup-modal.ts:662-663 |
| 3.3 Maintain aupAccepted check | [x] | ✅ DONE | aup-modal.ts:655 |
| 3.4 Maintain isLoading check | [x] | ✅ DONE | aup-modal.ts:655 |
| 3.5 Re-disable on uncheck | [x] | ✅ DONE | aup-modal.ts:581-582 |
| 4.1 Announce button enable | [x] | ✅ DONE | aup-modal.ts:668-671 |
| 4.2 Use announce() utility | [x] | ✅ DONE | aup-modal.ts:31 import |
| 5.1 updateButtons() after state | [x] | ✅ DONE | aup-modal.ts:231, 272, 287-288 |
| 5.2 Preserve checkbox state | [x] | ✅ DONE | Test aup-modal.test.ts:960-995 |
| 5.3 Enable immediately | [x] | ✅ DONE | Test aup-modal.test.ts:997-1030 |
| 6.1-6.10 Unit tests | [x] | ✅ DONE | aup-modal.test.ts:842-1055 |

**Summary: 17 of 17 completed tasks verified, 0 questionable, 0 false completions**

### Test Coverage and Gaps

- **66 tests passing** (10 new for Story 9.3)
- All 10 ACs have corresponding tests
- Race condition tests use controlled promise resolution pattern
- ARIA announcements tested via jest.spyOn

**No test gaps identified.**

### Architectural Alignment

- ✅ Follows ADR-026 (Accessible Modal Pattern)
- ✅ Matches tech-spec-epic-9.md button state logic exactly
- ✅ Uses existing `announce()` utility from aria-live.ts
- ✅ TypeScript type safety with `AupModalInternalState` type
- ✅ XSS-safe (uses textContent, not innerHTML)

### Security Notes

- No security issues found
- Maintains existing patterns for safe dynamic content rendering

### Best-Practices and References

- [ADR-026: Accessible Modal Pattern](docs/try-before-you-buy-architecture.md#ADR-026)
- [Epic 9 Tech Spec - Button State Logic](docs/sprint-artifacts/tech-spec-epic-9.md#Button-State-Logic)
- [WCAG 2.2 Success Criterion 4.1.3: Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

### Action Items

**Code Changes Required:**
- None

**Advisory Notes:**
- Note: Consider adding E2E tests for button gating behavior in future sprint
