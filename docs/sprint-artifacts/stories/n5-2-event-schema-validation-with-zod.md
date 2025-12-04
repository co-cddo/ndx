# Story N5.2: ISB Event Schema Validation with Zod

Status: done

## Story

As a **notification system**,
I want **to validate incoming ISB events against Zod schemas with strict mode**,
so that **malformed events fail fast with clear error messages and the system only processes well-formed events**.

## Acceptance Criteria

### Schema Definition (MUST)

1. AC-2.1: Zod schemas defined for all 10 user notification event types
2. AC-2.2: `LeaseKeySchema` validates composite key: `{ userEmail: email, uuid: uuid }`
3. AC-2.3: `LeaseFrozenReasonSchema` uses discriminated union on `type` field
4. AC-2.4: `LeaseTerminatedReasonSchema` handles 5 termination types
5. AC-2.5: Zod strict mode (`.strict()`) rejects unknown fields
6. AC-2.6: `accountId` fields validate 12-digit AWS account ID pattern

### Validation Behavior (MUST)

7. AC-2.7: `validateEvent()` returns typed `ValidatedEvent` on success
8. AC-2.8: Invalid events throw `PermanentError` with Zod error details
9. AC-2.9: Schema validation errors are logged with field paths
10. AC-2.10: Unknown event types throw `PermanentError('Unknown event type')`

### Security Validation (MUST)

11. AC-2.11: UUID field validation rejects non-UUID formats (no query strings, protocols, special chars)
12. AC-2.12: Email field validation uses strict RFC 5322 mode (rejects +injection addresses)

## Tasks / Subtasks

- [x] Task 1: Install and configure Zod dependency (AC: 2.1)
  - [x] Add `zod` ^3.23.0 to package.json
  - [x] Configure strict TypeScript types for Zod inference

- [x] Task 2: Implement base schemas (AC: 2.2, 2.6, 2.11, 2.12)
  - [x] Create `LeaseKeySchema` with email + uuid validation
  - [x] Create `AccountIdSchema` with 12-digit AWS account pattern
  - [x] Create `UuidSchema` with strict UUID v4 pattern (reject query strings)
  - [x] Create `EmailSchema` with RFC 5322 strict mode

- [x] Task 3: Implement discriminated union schemas (AC: 2.3, 2.4)
  - [x] Create `LeaseFrozenReasonSchema` with 3 types: Expired, BudgetExceeded, ManuallyFrozen
  - [x] Create `LeaseTerminatedReasonSchema` with 5 types

- [x] Task 4: Implement event schemas with strict mode (AC: 2.1, 2.5)
  - [x] Create `LeaseRequestedEventSchema.strict()`
  - [x] Create `LeaseApprovedEventSchema.strict()`
  - [x] Create `LeaseDeniedEventSchema.strict()`
  - [x] Create `LeaseTerminatedEventSchema.strict()`
  - [x] Create `LeaseFrozenEventSchema.strict()`
  - [x] Create `LeaseBudgetThresholdEventSchema.strict()`
  - [x] Create `LeaseDurationThresholdEventSchema.strict()`
  - [x] Create `LeaseFreezingThresholdEventSchema.strict()`
  - [x] Create `LeaseBudgetExceededEventSchema.strict()`
  - [x] Create `LeaseExpiredEventSchema.strict()`

- [x] Task 5: Implement validateEvent dispatcher (AC: 2.7, 2.8, 2.9, 2.10)
  - [x] Create `EVENT_SCHEMAS` registry mapping event types to schemas
  - [x] Create `validateEvent()` function with type-safe return
  - [x] Implement error classification for validation failures
  - [x] Log validation errors with field paths

- [x] Task 6: Write unit tests (AC: 2.1-2.12)
  - [x] Test each schema with valid and invalid inputs
  - [x] Test strict mode rejects unknown fields
  - [x] Test discriminated unions with each type
  - [x] Test UUID injection patterns (query strings, protocols)
  - [x] Test email injection patterns (+injection, consecutive dots)
  - [x] Test error messages include field paths

## Dev Notes

### Architecture Pattern

This story implements the validation module following the architecture from `notification-architecture.md`. Validation is the first step in the event processing pipeline, before ownership verification or enrichment.

```
NotificationHandler (N-4)
├── Source Validation ✓ (N-4)
├── Idempotency Check ✓ (N-4)
│
├── Schema Validation (N-5.2)  ← THIS STORY
│   ├── Event Type Dispatch
│   ├── Zod Strict Mode
│   └── Field-Level Error Logging
│
└── NotifySender (N-5.1) ✓
```

### Key Dependencies

- `zod` ^3.23.0 - Schema validation library
- `errors.ts` - `PermanentError` class from N-5.1

### Zod Schema Patterns

From tech spec (`tech-spec-epic-n5.md:206-293`):

```typescript
// Strict mode wrapper
const strictParse = <T extends z.ZodSchema>(schema: T, data: unknown) => {
  return schema.strict().parse(data)
}

// Discriminated union for freeze reasons
const LeaseFrozenReasonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Expired"), triggeredDurationThreshold: z.number() }),
  z.object({ type: z.literal("BudgetExceeded"), triggeredBudgetThreshold: z.number() }),
  z.object({ type: z.literal("ManuallyFrozen"), comment: z.string().max(1000) }),
])
```

### Security Considerations

1. **Strict mode**: Unknown fields rejected to prevent injection
2. **UUID validation**: Reject `uuid?redirect=attacker.com` patterns
3. **Email validation**: Reject `user++attacker@gov.uk` injection attempts
4. **Error messages**: Log field paths but not field values (prevent PII leakage)

### Error Classification

| Validation Error   | Error Type     | Retry | DLQ                |
| ------------------ | -------------- | ----- | ------------------ |
| Invalid schema     | PermanentError | No    | Yes                |
| Unknown event type | PermanentError | No    | Yes                |
| Injection attempt  | PermanentError | No    | Yes + security log |

### Project Structure Notes

- **File location**: `infra/lib/lambda/notification/validation.ts`
- **Tests**: `infra/lib/lambda/notification/validation.test.ts`
- **Types**: Extends `infra/lib/lambda/notification/types.ts`

### Testing Standards

- All 12 ACs require explicit test coverage
- Use Jest with ESM mock patterns from n5-1
- Test both valid inputs and injection attack patterns

### Learnings from Previous Story

**From Story n5-1-govuk-notify-sdk-integration (Status: done)**

- **Pattern**: Jest ESM mock typing - use `jest.Mock` without type parameters
- **File created**: `infra/lib/lambda/notification/errors.ts` - PermanentError already exists
- **File created**: `infra/lib/lambda/notification/types.ts` - Extend for validated event types
- **Security pattern**: `sanitizePersonalisation()` - similar approach for field-level logging

[Source: stories/n5-1-govuk-notify-sdk-integration.md#Dev-Agent-Record]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-n5.md#Story-n5-2]
- [Source: docs/sprint-artifacts/tech-spec-epic-n5.md#Validation-Module]
- [Source: docs/notification-architecture.md#Integration-Points]
- [Source: docs/epics-notifications.md#Story-5.2]

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/stories/n5-2-event-schema-validation-with-zod.context.xml`

### Agent Model Used

Claude claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Core validation module complete with all 13 ISB event type schemas (10 user + 3 ops)
- All 12 MUST acceptance criteria satisfied
- 73 unit tests in validation.test.ts covering all ACs
- 254 total tests passing (full regression suite)
- Lint clean
- Security controls: UUID injection rejection, email injection rejection, strict mode
- Type-safe ValidatedEvent return type with Zod inference

### File List

#### New Files

- `infra/lib/lambda/notification/validation.ts` - Core validation module with Zod schemas
- `infra/lib/lambda/notification/validation.test.ts` - 73 unit tests for validation

#### Modified Files

- `infra/package.json` - Added zod 3.23.8 dependency

## Code Review

### Review Summary

| Category     | Status                                             |
| ------------ | -------------------------------------------------- |
| **Reviewer** | Senior Dev Agent (Claude claude-opus-4-5-20251101) |
| **Date**     | 2025-11-28                                         |
| **Verdict**  | ✅ **APPROVED**                                    |
| **Tests**    | 254/254 passing (73 validation tests)              |

### Architecture & Design ✅

- Follows architecture pattern from `notification-architecture.md`
- Clean separation: base schemas → discriminated unions → event schemas → dispatcher
- Type-safe with Zod inference exports for downstream consumers
- Proper integration with existing `PermanentError` from n5-1

### MUST Acceptance Criteria ✅

All 12 MUST criteria satisfied with explicit test coverage:

| AC      | Description                          | Implementation           | Tests    |
| ------- | ------------------------------------ | ------------------------ | -------- |
| AC-2.1  | 10 event schemas                     | EVENT_SCHEMAS registry   | 20 tests |
| AC-2.2  | LeaseKeySchema                       | validation.ts:66-71      | 5 tests  |
| AC-2.3  | LeaseFrozenReason union              | validation.ts:81-96      | 5 tests  |
| AC-2.4  | LeaseTerminatedReason 5 types        | validation.ts:101-124    | 6 tests  |
| AC-2.5  | Strict mode                          | .strict() on all schemas | 3 tests  |
| AC-2.6  | AccountId 12-digit                   | validation.ts:59-61      | 6 tests  |
| AC-2.7  | validateEvent returns ValidatedEvent | validation.ts:345-403    | 2 tests  |
| AC-2.8  | PermanentError with details          | validation.ts:380-388    | 3 tests  |
| AC-2.9  | Field paths in errors                | formatZodError()         | 2 tests  |
| AC-2.10 | Unknown event type                   | validation.ts:352-363    | 3 tests  |
| AC-2.11 | UUID injection rejection             | validation.ts:28-37      | 7 tests  |
| AC-2.12 | Email injection rejection            | validation.ts:43-54      | 8 tests  |

### Security Controls ✅

| Control                    | Implementation                   | Rating    |
| -------------------------- | -------------------------------- | --------- |
| UUID injection prevention  | Regex + refine for `?`, `/`, `;` | Excellent |
| Email injection prevention | Reject `++`, consecutive dots    | Excellent |
| Strict mode                | All schemas use `.strict()`      | Excellent |
| PII protection             | Log field paths, not values      | Excellent |

### Minor Observations (Non-blocking)

1. Timestamp fields use `z.string()` - could use `z.string().datetime()` for stricter ISO 8601 (future enhancement)

### Review Decision

**APPROVED** - All 12 MUST ACs satisfied, 73 validation tests, excellent security controls.
