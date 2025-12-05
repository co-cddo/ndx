# Story N4.9: Event Schema Versioning Strategy

Status: deferred

## Story

As the **development team**,
I want documented schema versioning strategies and ISB coordination processes,
So that I can handle ISB event format changes without system failures.

## CRITICAL PATH Status

**This story is on the SWOT Critical Path but requires external ISB team coordination.**

Per SWOT analysis in tech-spec-epic-n4.md:

- ISB schema changes are the highest-probability threat
- Requires establishing regular sync cadence with ISB team
- Requires governance approval for data sharing
- Cannot be completed autonomously - requires ISB team engagement

## Acceptance Criteria

**AC-9.1: Regular sync cadence established with ISB team**

- **Given** the ISB team manages the EventBridge source
- **When** schema changes are planned
- **Then** NDX team receives 2-week advance notice
- **Status:** Requires ISB team engagement
- **Verification:** Meeting notes

**AC-9.2: Schema change notification process documented**

- **Given** ISB plans a schema change
- **When** the change is communicated
- **Then** documented process for handling exists
- **Verification:** Documentation review

**AC-9.3: Backwards-compatible handling strategy documented**

- **Given** Zod schema validation in n5-2
- **When** new fields are added by ISB
- **Then** `.passthrough()` pattern allows forward compatibility
- **Verification:** Code review

**AC-9.4: Staging EventBridge setup documented**

- **Given** developers working on N-5/N-6
- **When** they need to test with real events
- **Then** staging EventBridge configuration is documented
- **Verification:** Documentation review + Journey Mapping

**AC-9.5: ISB data sharing governance approval obtained**

- **Given** GDPR and data governance requirements
- **When** ISB events contain user data
- **Then** governance approval is documented
- **Status:** Requires governance engagement
- **Verification:** Governance sign-off + PESTLE

**AC-9.6: ISB cost allocation agreement confirmed**

- **Given** EventBridge cross-account events incur costs
- **When** events flow from ISB to NDX
- **Then** cost allocation is agreed and documented
- **Verification:** Agreement document + PESTLE

## Current Implementation

The following schema handling is already implemented:

1. **handler.ts**: Basic event structure validation (eventId, timestamp, eventType, payload)
2. **Future n5-2**: Zod strict mode validation with `.passthrough()` for unknown fields
3. **DLQ**: Schema validation failures captured for investigation

## Dependencies

- ISB team availability for coordination meetings
- Governance team for data sharing approval
- Finance/Ops for cost allocation agreement

## Tasks / Subtasks

- [x] Task 1: Document current state
  - [x] 1.1: Review tech-spec-epic-n4.md requirements
  - [x] 1.2: Document as requiring ISB coordination
  - [x] 1.3: Create story file with deferred status

- [ ] Task 2: ISB Team Coordination (requires external engagement)
  - [ ] 2.1: Schedule initial sync meeting with ISB team
  - [ ] 2.2: Establish regular cadence (suggest: monthly)
  - [ ] 2.3: Agree on schema change notification process (2-week notice)
  - [ ] 2.4: Document staging EventBridge access

- [ ] Task 3: Governance (requires external engagement)
  - [ ] 3.1: Prepare data sharing impact assessment
  - [ ] 3.2: Submit to governance for approval
  - [ ] 3.3: Document approval in project records

- [ ] Task 4: Cost Allocation (requires external engagement)
  - [ ] 4.1: Estimate EventBridge cross-account costs
  - [ ] 4.2: Agree allocation with ISB team
  - [ ] 4.3: Document agreement

## Schema Versioning Strategy (Pre-documented)

### Handling Unknown Fields

```typescript
// n5-2 will implement Zod with passthrough for forward compatibility
const eventSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  eventType: z.enum(['lease.created', 'lease.updated', ...]),
  payload: z.object({
    accountId: z.string(),
    // known fields...
  }).passthrough(), // Allow new fields from ISB
});
```

### Breaking Change Protocol

1. ISB notifies NDX team 2 weeks before breaking change
2. NDX updates schema validation in staging
3. Testing verifies new schema handling
4. Coordinated deployment with ISB release

### Staging Environment

- Staging EventBridge subscription to ISB staging bus
- Documented in deployment guide for N-5/N-6 developers

## Risk Matrix Reference

| ID  | Risk                                          | Probability | Impact   | Mitigation                                             |
| --- | --------------------------------------------- | ----------- | -------- | ------------------------------------------------------ |
| R-1 | ISB EventBridge schema changes without notice | HIGH        | CRITICAL | 2-week deprecation notice in SLA; Regular sync cadence |

## Dev Notes

- This story cannot be completed without ISB team engagement
- Consider scheduling kick-off meeting when Epic N-4 core implementation is complete
- Governance approval may take 2-4 weeks depending on complexity
- Cost allocation typically handled in cross-team SLA/contract

## Decision Log

- 2025-11-27: Story documented as requiring external coordination
- Core infrastructure (n4-1 through n4-7) complete and ready for ISB engagement
- Deferred until ISB team availability confirmed
