# Story n7.1: DynamoDB Integration Setup

Status: drafted

## Story

As the **notification system**,
I want to query the LeaseTable in DynamoDB to retrieve complete lease records,
so that I can enrich notifications with full lease context.

## Acceptance Criteria

1. **Given** an EventBridge event containing `userEmail` and `uuid` fields **When** the notification Lambda processes it **Then** it queries DynamoDB LeaseTable using composite key (userEmail PK, uuid SK)

2. **And** the Lambda IAM role has `dynamodb:GetItem` permission for LeaseTable

3. **And** the LeaseTable ARN is stored in environment variable (not hardcoded)

4. **And** DynamoDB client is reused across Lambda invocations for connection pooling

5. **And** DynamoDB query latency is logged as CloudWatch metric (`EnrichmentQueryLatencyMs`)

6. **And** integration test validates query latency < 200ms (p99)

7. **And** if `userEmail` or `uuid` missing from event, enrichment is skipped with warning log

8. **And** if `userEmail` or `uuid` are wrong type (not string), enrichment is skipped with warning log

9. **And** `ProvisionedThroughputExceededException` triggers 1 retry with 500ms backoff (other errors fail immediately)

10. **And** schema fingerprint (sorted field names hash) is logged for drift detection

## Tasks / Subtasks

- [ ] Task 1: Extend enrichment.ts with lease record fetching (AC: 1, 4)
  - [ ] 1.1: Add `fetchLeaseRecord(userEmail: string, uuid: string)` function
  - [ ] 1.2: Implement composite key query with GetItemCommand
  - [ ] 1.3: Ensure DynamoDB client is module-level singleton for connection pooling
  - [ ] 1.4: Add proper TypeScript types for LeaseRecord

- [ ] Task 2: Add CDK infrastructure for DynamoDB access (AC: 2, 3)
  - [ ] 2.1: Add `LEASE_TABLE_NAME` environment variable to Lambda
  - [ ] 2.2: Add `dynamodb:GetItem` permission for LeaseTable ARN
  - [ ] 2.3: Verify ARN comes from config, not hardcoded

- [ ] Task 3: Implement CloudWatch metrics for query latency (AC: 5)
  - [ ] 3.1: Add timing wrapper around DynamoDB query
  - [ ] 3.2: Emit `EnrichmentQueryLatencyMs` metric with Lambda Powertools Metrics

- [ ] Task 4: Implement input validation and skip logic (AC: 7, 8)
  - [ ] 4.1: Check for missing `userEmail` or `uuid` in event detail
  - [ ] 4.2: Check for wrong types (non-string)
  - [ ] 4.3: Log warning and skip enrichment (don't fail notification)

- [ ] Task 5: Implement throttle retry logic (AC: 9)
  - [ ] 5.1: Catch `ProvisionedThroughputExceededException`
  - [ ] 5.2: Wait 500ms and retry once
  - [ ] 5.3: On second failure, proceed without enrichment

- [ ] Task 6: Implement schema fingerprint logging (AC: 10)
  - [ ] 6.1: Extract and sort field names from returned lease record
  - [ ] 6.2: Create hash of sorted field names
  - [ ] 6.3: Log fingerprint for drift detection monitoring

- [ ] Task 7: Write unit tests (AC: All)
  - [ ] 7.1: Test successful lease record fetch
  - [ ] 7.2: Test missing userEmail/uuid handling
  - [ ] 7.3: Test wrong type handling
  - [ ] 7.4: Test throttle retry behavior
  - [ ] 7.5: Test schema fingerprint generation

- [ ] Task 8: Write integration test (AC: 6)
  - [ ] 8.1: Create integration test with real DynamoDB table
  - [ ] 8.2: Validate query latency < 200ms (p99)

## Dev Notes

### Architecture Alignment

- **Component**: `infra/lib/lambda/notification/enrichment.ts` (extend existing)
- **Pattern**: Existing enrichment.ts already has circuit breaker and parallel query patterns - extend with lease-specific fetch
- **SDK**: Use `@aws-sdk/client-dynamodb` with `DynamoDBDocumentClient` (not raw client)
- **Table**: LeaseTable with composite key: `userEmail` (PK), `uuid` (SK)
- **Same Account**: No cross-account IAM needed - Lambda and LeaseTable in same AWS account

### Technical Constraints

- **Timeout Budget**: 2s for enrichment (from Story 7.5 design)
- **Retry**: Only for `ProvisionedThroughputExceededException`, not other errors
- **Graceful Degradation**: Notification MUST proceed even if enrichment fails
- **Connection Pooling**: DynamoDB client singleton at module level (reused across invocations)

### Existing Patterns to Reuse

From existing `enrichment.ts`:
- `CircuitBreaker` class for query protection
- `queryLeaseTable()` function structure
- Error handling with `CriticalError` and `RetriableError`
- Lambda Powertools Logger integration
- CloudWatch Metrics emission pattern

### Testing Standards

- Mock DynamoDB with `aws-sdk-client-mock`
- Follow existing test patterns in `enrichment.test.ts`
- Unit tests: Mock all external dependencies
- Integration tests: Use environment variables for real table access

### Project Structure Notes

- Extending existing file: `infra/lib/lambda/notification/enrichment.ts`
- New tests in: `infra/lib/lambda/notification/enrichment.test.ts` (extend)
- CDK changes in: `infra/lib/notification-stack.ts`

### References

- [Source: docs/epics-notifications.md#Story-7.1]
- [Source: docs/notification-architecture.md#Project-Structure]
- [Source: docs/notification-architecture.md#DynamoDB-Enrichment]

## Dev Agent Record

### Context Reference

- [Story Context XML](n7-1-dynamodb-integration-setup.context.xml) - Full implementation context with code artifacts, elicitation insights, and technical guidance

### Agent Model Used

Claude claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-02 | SM Agent (cns) | Story drafted from epics-notifications.md |
