# Story N5.5: Monitoring Alert Email Templates

Status: done

## Story

As a **lease user**,
I want **to receive clear, informative emails for budget, duration, and freeze threshold events**,
so that **I can take action before my sandbox lease is impacted or terminated**.

## Acceptance Criteria

### Core Alert Templates (MUST)

1. AC-5.1: `LeaseBudgetThresholdAlert` email includes: userName, currentSpend, budgetLimit, percentUsed
2. AC-5.2: `LeaseDurationThresholdAlert` email includes: userName, hoursRemaining, expiryDate, timezone
3. AC-5.4: `LeaseFreezingThresholdAlert` email includes: userName, reason, freezeTime
4. AC-5.5: `LeaseBudgetExceeded` email includes: userName, finalSpend, budgetLimit
5. AC-5.6: `LeaseExpired` email includes: userName, accountId, expiryTime
6. AC-5.7: `LeaseFrozen` email includes: userName, accountId, reason, resumeInstructions

### Formatting Requirements (SHOULD)

7. AC-5.3: Timezone defaults to `Europe/London` if not in user preferences
8. AC-5.8: Budget amounts formatted with currency symbol (GBP: £)
9. AC-5.9: Dates formatted in UK format (DD MMM YYYY, HH:MM)
10. AC-5.10: Percentage thresholds formatted with % symbol

### Enrichment Data Handling (MUST/SHOULD)

11. AC-5.11: Budget emails include both `event.budgetLimit` AND `enriched.maxSpend` if different
12. AC-5.12: Add disclaimer "Budget data as of [timestamp]" to show data age
13. AC-5.13: Never use enriched data that contradicts event type (e.g., LeaseDenied but status=Approved) [MUST]
14. AC-5.14: Always prioritise event data over enriched data for status fields [MUST]
15. AC-5.15: Template never displays enriched.status (only use enriched data for non-status fields) [MUST]

## Tasks / Subtasks

- [x] Task 1: Add monitoring alert templates to registry (AC: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7)
  - [x] Add `LeaseBudgetThresholdAlert` config to NOTIFY_TEMPLATES
  - [x] Add `LeaseDurationThresholdAlert` config to NOTIFY_TEMPLATES
  - [x] Add `LeaseFreezingThresholdAlert` config to NOTIFY_TEMPLATES
  - [x] Add `LeaseBudgetExceeded` config to NOTIFY_TEMPLATES
  - [x] Add `LeaseExpired` config to NOTIFY_TEMPLATES
  - [x] Add `LeaseFrozen` config to NOTIFY_TEMPLATES

- [x] Task 2: Implement budget threshold alert personalisation (AC: 5.1, 5.8, 5.10)
  - [x] Create `buildBudgetThresholdPersonalisation()` function
  - [x] Format currentSpend with GBP symbol
  - [x] Format budgetLimit with GBP symbol
  - [x] Format percentUsed with % symbol

- [x] Task 3: Implement duration threshold alert personalisation (AC: 5.2, 5.3, 5.9)
  - [x] Create `buildDurationThresholdPersonalisation()` function
  - [x] Format expiryDate in UK format (DD MMM YYYY, HH:MM)
  - [x] Default timezone to `Europe/London`
  - [x] Calculate hoursRemaining from expiryDate

- [x] Task 4: Implement freezing threshold alert personalisation (AC: 5.4, 5.9)
  - [x] Create `buildFreezingThresholdPersonalisation()` function
  - [x] Format freezeTime in UK format
  - [x] Include reason for freeze warning

- [x] Task 5: Implement terminal state templates (AC: 5.5, 5.6, 5.7, 5.8, 5.9)
  - [x] Create `buildBudgetExceededPersonalisation()` function
  - [x] Create `buildLeaseExpiredPersonalisation()` function
  - [x] Create `buildLeaseFrozenPersonalisation()` function
  - [x] Include resumeInstructions in frozen template

- [x] Task 6: Implement enrichment data handling (AC: 5.11, 5.12, 5.13, 5.14, 5.15)
  - [x] Add budget discrepancy check (event vs enriched)
  - [x] Add "Budget data as of [timestamp]" disclaimer
  - [x] Validate event type doesn't contradict enriched status
  - [x] Ensure event data takes precedence over enriched data
  - [x] Never expose enriched.status in templates

- [x] Task 7: Implement formatting utilities (AC: 5.8, 5.9, 5.10)
  - [x] Create `formatCurrency(amount: number)` - returns £X.XX
  - [x] Create `formatUKDate(date: Date | string)` - returns DD MMM YYYY, HH:MM
  - [x] Create `formatPercentage(percent: number)` - returns X%
  - [x] Add timezone parameter to date formatting

- [x] Task 8: Write unit tests (AC: 5.1-5.15)
  - [x] Test all 6 monitoring template configs
  - [x] Test currency formatting with edge cases
  - [x] Test date formatting with timezone handling
  - [x] Test percentage formatting
  - [x] Test enrichment conflict detection
  - [x] Test event data precedence over enriched data

## Dev Notes

### Architecture Pattern

This story extends the template registry pattern from n5-4 to add monitoring alert templates. These templates are for proactive notifications (thresholds) and terminal state notifications (exceeded, expired, frozen).

```
NotificationHandler (N-4)
├── Source Validation ✓ (N-4)
├── Idempotency Check ✓ (N-4)
├── Schema Validation ✓ (N-5.2)
├── Ownership Verification ✓ (N-5.3)
│
├── Template Selection (N-5.4) ✓
│   ├── Lease Lifecycle Templates ✓
│   └── Monitoring Alert Templates ← THIS STORY
│
├── Enrichment (N-5.6)
└── NotifySender (N-5.1) ✓
```

### Template Configuration

From tech spec (`tech-spec-epic-n5.md:841-862`):

| Event Type                  | Env Var                              | Required Fields                                  | Optional Fields |
| --------------------------- | ------------------------------------ | ------------------------------------------------ | --------------- |
| LeaseBudgetThresholdAlert   | `NOTIFY_TEMPLATE_BUDGET_THRESHOLD`   | userName, currentSpend, budgetLimit, percentUsed | -               |
| LeaseDurationThresholdAlert | `NOTIFY_TEMPLATE_DURATION_THRESHOLD` | userName, hoursRemaining, expiryDate, timezone   | -               |
| LeaseFreezingThresholdAlert | `NOTIFY_TEMPLATE_FREEZING_THRESHOLD` | userName, reason, freezeTime                     | -               |
| LeaseBudgetExceeded         | `NOTIFY_TEMPLATE_BUDGET_EXCEEDED`    | userName, finalSpend, budgetLimit                | -               |
| LeaseExpired                | `NOTIFY_TEMPLATE_LEASE_EXPIRED`      | userName, accountId, expiryTime                  | -               |
| LeaseFrozen                 | `NOTIFY_TEMPLATE_LEASE_FROZEN`       | userName, accountId, reason, resumeInstructions  | -               |

### Formatting Requirements

```typescript
// Currency formatting (GBP)
formatCurrency(123.45) // "£123.45"
formatCurrency(0.99) // "£0.99"
formatCurrency(1000) // "£1,000.00"

// UK date formatting
formatUKDate("2024-03-15T14:30:00Z", "Europe/London") // "15 Mar 2024, 14:30"

// Percentage formatting
formatPercentage(75.5) // "75.5%"
formatPercentage(100) // "100%"
```

### Enrichment Conflict Handling

From tech spec - critical security requirements:

- AC-5.13: Never use enriched.status that contradicts event type
- AC-5.14: Event data always takes precedence
- AC-5.15: Never display enriched.status in templates

```typescript
// WRONG - using enriched status
personalisation.status = enrichedData.status // NEVER DO THIS

// CORRECT - only use event type
personalisation.status = eventTypeToHumanReadable(event.type)
```

### Key Dependencies

- `templates.ts` - Template registry from n5-4 (extend NOTIFY_TEMPLATES)
- `errors.ts` - PermanentError for validation failures
- `validation.ts` - ValidatedEvent type with leaseKey
- `ownership.ts` - hashForLog for PII redaction

### Learnings from Previous Stories

**From Story n5-4-lease-lifecycle-email-templates (Status: done)**

- **Pattern**: Template registry with NOTIFY_TEMPLATES constant
- **Portal links**: generatePortalLink() with HMAC-SHA256 signing
- **Formatting**: TERMINATION_REASON_MESSAGES for human-readable text
- **Testing**: 57 unit tests with AC ID traceability
- **Deliverability**: 3 CloudWatch alarms added to notification-stack.ts

**From Story n5-3-email-ownership-verification (Status: done)**

- **Pattern**: Jest ESM mock typing - use `jest.Mock` without type parameters
- **Security**: PII redaction in logs - use `hashForLog()` function

**From Story n5-2-event-schema-validation-with-zod (Status: done)**

- **Pattern**: Zod schema validation with detailed error messages

### Project Structure

```
infra/lib/lambda/notification/
├── errors.ts              (n5-1) ← PermanentError, RetriableError
├── notify-sender.ts       (n5-1) ← sendEmail wrapper
├── validation.ts          (n5-2) ← Zod schema validation
├── ownership.ts           (n5-3) ← Email ownership verification
├── templates.ts           (n5-4 + n5-5) ← Extend with monitoring templates
└── templates.test.ts      (n5-4 + n5-5) ← Add monitoring template tests
```

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-n5.md#Story-n5-5]
- [Source: docs/notification-architecture.md#Template-Registry]
- [Source: docs/epics-notifications.md#Story-5.5]

## Dev Agent Record

### Context Reference

- [n5-5-monitoring-alert-email-templates.context.xml](./n5-5-monitoring-alert-email-templates.context.xml)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 8 tasks completed successfully
- 133 tests total in templates.test.ts (76 new for N5.5)
- 440 total tests passing in infra project
- Extended NOTIFY_TEMPLATES with 6 monitoring alert templates
- Implemented 3 formatting utilities (formatCurrency, formatUKDate, formatPercentage)
- Implemented 6 personalisation builder functions for monitoring alerts
- Added enrichment conflict detection with security logging (AC-5.13)
- Added budget discrepancy reporting (AC-5.11)
- Added isMonitoringAlertEvent() helper function
- Extended buildPersonalisation() to support all 10 event types (4 lifecycle + 6 monitoring)

### File List

- `infra/lib/lambda/notification/templates.ts` - Extended with monitoring templates (1146 lines)
- `infra/lib/lambda/notification/templates.test.ts` - Extended with N5.5 tests (1687 lines)

---

## Senior Developer Review

**Review Date**: 2025-11-28
**Reviewer**: Claude Code Review Agent
**Status**: ✅ APPROVED

### Acceptance Criteria Validation

| AC ID   | Requirement                                                  | Status | Evidence                                              |
| ------- | ------------------------------------------------------------ | ------ | ----------------------------------------------------- |
| AC-5.1  | LeaseBudgetThresholdAlert includes required fields           | ✅     | templates.ts:126-130, 796-837                         |
| AC-5.2  | LeaseDurationThresholdAlert includes required fields         | ✅     | templates.ts:136-141, 844-879                         |
| AC-5.3  | Timezone defaults to Europe/London                           | ✅     | templates.ts:211, 860                                 |
| AC-5.4  | LeaseFreezingThresholdAlert includes required fields         | ✅     | templates.ts:146-151, 885-918                         |
| AC-5.5  | LeaseBudgetExceeded includes required fields                 | ✅     | templates.ts:156-161, 925-958                         |
| AC-5.6  | LeaseExpired includes required fields                        | ✅     | templates.ts:166-171, 964-997                         |
| AC-5.7  | LeaseFrozen includes required fields with resumeInstructions | ✅     | templates.ts:176-181, 1003-1036, 313-351              |
| AC-5.8  | Budget amounts formatted with GBP £                          | ✅     | templates.ts:220-227 (Intl.NumberFormat)              |
| AC-5.9  | Dates formatted in UK format                                 | ✅     | templates.ts:235-255 (Intl.DateTimeFormat)            |
| AC-5.10 | Percentages formatted with % symbol                          | ✅     | templates.ts:263-267                                  |
| AC-5.11 | Budget emails include both values if different               | ✅     | templates.ts:425-439, 823-826                         |
| AC-5.12 | Budget disclaimer with timestamp                             | ✅     | templates.ts:272-275, 819, 946                        |
| AC-5.13 | Never use enriched data contradicting event                  | ✅     | templates.ts:386-419 (detectEnrichmentConflict)       |
| AC-5.14 | Event data precedence over enriched                          | ✅     | Builders use event data; enriched only for non-status |
| AC-5.15 | Never display enriched.status                                | ✅     | templates.ts:377 (\_internalStatus marked @internal)  |

### Task Completion Validation

All 8 tasks completed:

- ✅ Task 1: 6 monitoring templates added to registry
- ✅ Task 2: Budget threshold personalisation with GBP/% formatting
- ✅ Task 3: Duration threshold personalisation with timezone default
- ✅ Task 4: Freezing threshold personalisation with UK date format
- ✅ Task 5: Terminal state templates (exceeded, expired, frozen)
- ✅ Task 6: Enrichment data handling with conflict detection
- ✅ Task 7: formatCurrency, formatUKDate, formatPercentage utilities
- ✅ Task 8: 76 new unit tests with AC ID traceability (133 total)

### Code Quality Assessment

**Strengths**:

1. Consistent pattern extension - follows N5.4 template registry pattern exactly
2. Security-first design - \_internalStatus marked @internal, never exposed in output
3. Comprehensive test coverage - all ACs have explicit tests with AC ID references
4. Locale-aware formatting - uses Intl.NumberFormat/DateTimeFormat for i18n safety
5. Clear documentation - JSDoc comments reference ACs and story numbers

**No Issues Found**:

- No blocking issues
- No security concerns
- No missing functionality

### Test Results

```
Test Suites: 1 passed, 1 total
Tests:       133 passed, 133 total
```

### Recommendation

**APPROVED** - All acceptance criteria satisfied with full test coverage. Ready for story-done workflow.
