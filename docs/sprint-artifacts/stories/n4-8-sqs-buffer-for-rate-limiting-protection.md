# Story N4.8: SQS Buffer for Rate Limiting Protection

Status: deferred

## Story

As the **ops team**,
I want an SQS buffer queue between EventBridge and Lambda,
So that batch ISB operations don't overwhelm GOV.UK Notify rate limits.

## CONDITIONAL Status

**This story is CONDITIONAL and deferred pending ISB team confirmation.**

Per Devil's Advocate analysis in tech-spec-epic-n4.md:
- Only implement if ISB confirms batch operations (>100 events/min)
- Otherwise defer to Growth phase
- Current implementation uses EventBridge → Lambda direct invocation with reserved concurrency (10)

## Acceptance Criteria

**AC-8.1: CONDITIONAL - ISB confirmation required**
- **Given** the ISB team operations profile
- **When** batch operations are confirmed (>100 events/min)
- **Then** this story should be implemented
- **Status:** Awaiting ISB team confirmation
- **Verification:** ISB team confirmation

**AC-8.2: If implemented - SQS queue between EventBridge and Lambda**
- **Given** the EventBridge rule
- **When** events are received
- **Then** they flow through SQS buffer queue
- **Verification:** CDK assertion test

**AC-8.3: If implemented - Rate limiting protection functional**
- **Given** a burst of events (>100/min)
- **When** processed through SQS
- **Then** Lambda polls at controlled rate
- **Verification:** Load test

## Current Mitigation

Without the SQS buffer, the following controls are in place:
1. **Reserved Concurrency**: Lambda limited to 10 concurrent executions
2. **DLQ**: Failed events captured for manual replay
3. **Exponential Backoff**: Built into Lambda error handling
4. **CloudWatch Alarms**: DLQ rate alarm detects flooding (>50/5min)

## Dependencies

- ISB team confirmation of batch operation patterns
- If confirmed, implement after n4-6 (monitoring) is complete

## Architecture Reference

From tech-spec-epic-n4.md:
```
├── SQS Buffer Queue (ndx-notification-buffer) [CONDITIONAL]
│   ├── Enabled: Only if ISB confirms batch operations
│   └── Purpose: Rate limiting protection
```

## Tasks / Subtasks

- [x] Task 1: Assess requirement
  - [x] 1.1: Review Devil's Advocate analysis
  - [x] 1.2: Document conditional status
  - [x] 1.3: Defer pending ISB confirmation

- [ ] Task 2: If ISB confirms (>100 events/min)
  - [ ] 2.1: Create SQS queue with appropriate visibility timeout
  - [ ] 2.2: Configure EventBridge to target SQS instead of Lambda
  - [ ] 2.3: Add SQS trigger to Lambda
  - [ ] 2.4: Adjust concurrency settings
  - [ ] 2.5: Add CDK assertion tests
  - [ ] 2.6: Load test with burst traffic

## Dev Notes

- Current architecture is sufficient for typical ISB event rates
- SQS adds complexity (ordering, batching, visibility timeout tuning)
- Reserved concurrency (10) provides natural rate limiting
- If implemented, use SQS FIFO for ordering guarantees

## Risk Matrix Reference

| Risk | Probability | Impact | Current Mitigation |
|------|-------------|--------|-------------------|
| GOV.UK Notify rate limiting | LOW | HIGH | Reserved concurrency + exponential backoff |
| Event storm overwhelms Lambda | LOW | MEDIUM | DLQ + rate alarm + reserved concurrency |

## Decision Log

- 2025-11-27: Story deferred pending ISB team confirmation per Devil's Advocate analysis
- Current controls (reserved concurrency, DLQ, alarms) provide adequate protection for typical load
