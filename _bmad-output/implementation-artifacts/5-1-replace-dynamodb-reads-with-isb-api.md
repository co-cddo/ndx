# Story 5.1: Replace Notification Lambda DynamoDB Reads with ISB API

Status: done

## Story

As a **developer maintaining the notification system**,
I want **lease enrichment to use the ISB API instead of direct DynamoDB reads**,
So that **the codebase has a clean API contract with no direct database dependencies**.

## Acceptance Criteria

1. **Given** an EventBridge event arrives needing enrichment, **When** the notification Lambda processes it, **Then** it calls `GET /leases/{id}` on ISB API instead of DynamoDB GetItemCommand

2. **Given** the ISB API returns lease data, **When** enrichment completes, **Then** the Notify payload is built with the same fields as before (`awsAccountId`, `maxSpend`, `expirationDate`, etc.)

3. **Given** the code changes are complete, **When** I search `infra/lib/lambda/notification/`, **Then** no `DynamoDBClient` or `GetItemCommand` imports exist for lease data

4. **Given** the ISB API returns 404 (lease not found), **When** enrichment fails, **Then** the notification proceeds with graceful degradation (same as current DynamoDB null handling)

5. **Given** the ISB API returns 500 or network error, **When** enrichment fails, **Then** the notification proceeds with graceful degradation and logs the error

6. **Given** the ISB API takes longer than 5 seconds, **When** the timeout occurs, **Then** the notification proceeds with graceful degradation (NFR4)

## Tasks / Subtasks

- [x] Task 1: Create ISB API client for lease retrieval (AC: 1, 4, 5, 6)
  - [x] 1.1 Create `infra/lib/lambda/notification/isb-client.ts` with `fetchLeaseFromISB(leaseId: string)` function
  - [x] 1.2 Implement JSend response parsing (ISB API returns `{ status: 'success', data: {...} }`)
  - [x] 1.3 Implement 5-second timeout with AbortController (NFR4)
  - [x] 1.4 Handle 404 responses - return null (graceful degradation)
  - [x] 1.5 Handle 500/network errors - log and return null (graceful degradation)
  - [x] 1.6 Add correlation ID to logs

- [x] Task 2: Refactor enrichment module to use ISB API (AC: 1, 2, 3)
  - [x] 2.1 Replace `fetchLeaseRecord()` implementation to call ISB API instead of DynamoDB
  - [x] 2.2 Map ISB API response fields to existing `LeaseRecord` interface
  - [x] 2.3 Remove `DynamoDBClient`, `GetItemCommand` imports from `enrichment.ts` (kept for account/template tables)
  - [x] 2.4 Remove `unmarshall` import from `enrichment.ts` (kept for account/template tables)
  - [x] 2.5 Remove `queryLeaseTable()` function
  - [x] 2.6 Preserve `mapEnrichedFieldsToTemplateNames()` function unchanged

- [x] Task 3: Update handler integration (AC: 2)
  - [x] 3.1 Update lease ID extraction to support ISB API format (base64 encoded `{userEmail}|{uuid}`)
  - [x] 3.2 Ensure `fetchLeaseRecord()` signature remains compatible
  - [x] 3.3 Verify field mapping produces same template variables as before

- [x] Task 4: Update tests (AC: 1, 2, 4, 5, 6)
  - [x] 4.1 Replace DynamoDB mocks with fetch mocks in `enrichment.test.ts`
  - [x] 4.2 Add test for successful ISB API response
  - [x] 4.3 Add test for 404 response (lease not found)
  - [x] 4.4 Add test for 500 response (server error)
  - [x] 4.5 Add test for timeout scenario (5 second limit)
  - [x] 4.6 Add test for network error scenario
  - [x] 4.7 Verify field mapping tests still pass

- [x] Task 5: Environment configuration (AC: 1)
  - [x] 5.1 Add `ISB_API_BASE_URL` environment variable to Lambda
  - [x] 5.2 Update CDK stack to pass ISB API URL to notification Lambda
  - [x] 5.3 Document the ISB API endpoint configuration (in config.ts)

- [x] Task 6: Verification and cleanup (AC: 3)
  - [x] 6.1 Verified DynamoDB imports only used for account/template tables (lease data via ISB API)
  - [x] 6.2 Run full test suite - all 1042 tests pass
  - [x] 6.3 Verified no regression in notification enrichment (75 enrichment tests pass)

## Dev Notes

### Architecture Context

**Source:** [_bmad-output/planning-artifacts/epics-ndx-try-enhancements.md - Epic 1: Session Transparency]

This story is part of Epic 5 (Session Transparency) which enables users to access and understand their NDX:Try session resources. The ISB API integration removes direct DynamoDB dependencies in favor of a clean API contract.

### Current Implementation Analysis

**Source:** [infra/lib/lambda/notification/enrichment.ts]

The current implementation uses DynamoDB direct reads:

```typescript
// CURRENT (to be removed):
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb"

export async function fetchLeaseRecord(userEmail, uuid, eventId): Promise<LeaseRecord | null> {
  const command = new GetItemCommand({
    TableName: tableName,
    Key: { userEmail: { S: userEmail }, uuid: { S: uuid } },
    ConsistentRead: true,
  })
  const result = await dynamoClient.send(command)
  return result.Item ? unmarshall(result.Item) : null
}
```

### ISB API Integration Approach

**Source:** [_bmad-output/planning-artifacts/prd-ndx-try-enhancements.md - Developer Journey]

The ISB API endpoint format:
- `GET /leases/{id}` where `{id}` is base64 encoded `{userEmail}|{uuid}`
- Returns JSend format: `{ status: 'success', data: { ... } }`
- Requires JWT authentication (existing Lambda should have this)

**New implementation:**

```typescript
// NEW (to implement):
export async function fetchLeaseFromISB(leaseId: string): Promise<LeaseRecord | null> {
  const url = `${ISB_API_BASE_URL}/leases/${encodeURIComponent(leaseId)}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000) // NFR4: 5s timeout

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (response.status === 404) return null // Graceful degradation
    if (!response.ok) throw new Error(`ISB API error: ${response.status}`)

    const json = await response.json()
    return json.data // JSend format
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(JSON.stringify({ level: 'WARN', message: 'ISB API timeout', correlationId }))
    }
    return null // Graceful degradation
  }
}
```

### Field Mapping Reference

**Source:** [infra/lib/lambda/notification/handler.ts:72-92]

The existing field mapping must be preserved:
- `awsAccountId` → `accountId`
- `maxSpend` → `budgetLimit` (with currency formatting)
- `expirationDate` → `expiryDate` (with UK date formatting)

### Environment Variables Required

**Source:** [_bmad-output/planning-artifacts/project-context.md - Environment Configuration]

New environment variable needed:
- `ISB_API_BASE_URL` - The base URL for ISB API (e.g., `https://isb.ndx.digital.cabinet-office.gov.uk/api`)

### Project Structure Notes

**Files to modify:**
- `infra/lib/lambda/notification/enrichment.ts` - Main changes (DynamoDB → ISB API)
- `infra/lib/lambda/notification/enrichment.test.ts` - Test updates
- `infra/lib/notification-stack.ts` - Add ISB_API_BASE_URL env var

**Files to create:**
- `infra/lib/lambda/notification/isb-client.ts` - New ISB API client module
- `infra/lib/lambda/notification/isb-client.test.ts` - Tests for ISB client

### Testing Strategy

**Source:** [_bmad-output/planning-artifacts/project-context.md - Testing Rules]

1. **Unit tests:** Mock fetch for ISB API calls
2. **Integration tests:** Verify full enrichment flow with real Lambda
3. **Coverage:** Maintain 80%+ line coverage

```typescript
// Test mock example
jest.spyOn(global, 'fetch').mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ status: 'success', data: { awsAccountId: '123456789012' } })
})
```

### Error Handling Requirements

**Source:** [_bmad-output/planning-artifacts/project-context.md - Lambda Rules]

- Structured JSON logging with correlation ID
- Graceful degradation on API failures (notification still proceeds)
- No PII in error logs

```typescript
console.log(JSON.stringify({
  level: 'ERROR',
  message: 'ISB API enrichment failed',
  correlationId: eventId,
  errorCode: error.code, // NOT the lease data
}))
```

### References

- [Source: _bmad-output/planning-artifacts/prd-ndx-try-enhancements.md#Lease-Data-Access] - FR11, FR12, FR16
- [Source: _bmad-output/planning-artifacts/epics-ndx-try-enhancements.md#Story-1.1] - Story requirements
- [Source: _bmad-output/planning-artifacts/project-context.md#Lambda-Rules] - Lambda patterns
- [Source: infra/lib/lambda/notification/enrichment.ts] - Current DynamoDB implementation
- [Source: infra/lib/lambda/notification/handler.ts:72-92] - Field mapping logic

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A - Implementation completed successfully without significant debugging issues.

### Completion Notes List

1. Created new ISB API client module (`isb-client.ts`) with:
   - `fetchLeaseFromISB()` for fetching lease data via REST API
   - `fetchLeaseByKey()` convenience function
   - `constructLeaseId()` and `parseLeaseId()` for base64 encoded composite keys
   - 5-second timeout with AbortController (NFR4)
   - Graceful degradation for all error scenarios

2. Refactored `enrichment.ts` to use ISB API for lease data:
   - Replaced `queryLeaseTable()` with `fetchLeaseByKey()` call
   - Added `mapISBRecordToLeaseRecord()` for field mapping compatibility
   - DynamoDB imports retained for account/template tables only

3. Updated tests to use ISB client mocks instead of DynamoDB mocks:
   - 27 new tests in `isb-client.test.ts` covering all scenarios
   - Updated 75 tests in `enrichment.test.ts` to use ISB client mock

4. Added environment configuration:
   - Added `apiBaseUrl` field to `ISBConfig` interface
   - Configured ISB API URLs for prod and staging in `config.ts`
   - Updated `notification-stack.ts` to pass `ISB_API_BASE_URL` to Lambda

### File List

**Created:**
- `infra/lib/lambda/notification/isb-client.ts` - ISB API client module
- `infra/lib/lambda/notification/isb-client.test.ts` - ISB client tests (27 tests)

**Modified:**
- `infra/lib/lambda/notification/enrichment.ts` - Replaced lease fetch with ISB API
- `infra/lib/lambda/notification/enrichment.test.ts` - Updated mocks for ISB client
- `infra/lib/config.ts` - Added `apiBaseUrl` to ISBConfig
- `infra/lib/notification-stack.ts` - Added ISB_API_BASE_URL env var
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status to review
- `infra/test/__snapshots__/ndx-stack.test.ts.snap` - CDK snapshot updated for new env var
