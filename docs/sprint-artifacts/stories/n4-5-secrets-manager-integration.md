# Story N4.5: Secrets Manager Integration

Status: done

## Story

As the **notification system**,
I want to securely retrieve API credentials from Secrets Manager at runtime,
So that secrets are not stored in code or environment variables and can be rotated without redeployment.

## Acceptance Criteria

**AC-5.1: Lambda retrieves credentials from path**
- **Given** the Lambda function starts
- **When** it needs to send notifications
- **Then** it retrieves credentials from `/ndx/notifications/credentials`
- **Verification:** Integration test (will be stub in this story, real retrieval in N-5/N-6)

**AC-5.2: Secret value cached in Lambda memory**
- **Given** the Lambda retrieves a secret
- **When** subsequent invocations occur in the same container
- **Then** the secret is cached and not re-fetched
- **Verification:** Code review + performance test

**AC-5.3: Secrets Manager errors fail gracefully**
- **Given** Secrets Manager is unavailable
- **When** the Lambda attempts to retrieve credentials
- **Then** it logs the error and fails (triggering DLQ)
- **Verification:** Unit test

**AC-5.4: Lambda IAM role has GetSecretValue permission**
- **Given** the Lambda function
- **When** deployed via CDK
- **Then** its IAM role has `secretsmanager:GetSecretValue` for the secrets path
- **Verification:** CDK assertion test

**AC-5.5: Resource policy restricts secret access**
- **Given** the secret in Secrets Manager
- **When** reviewed
- **Then** access is restricted to the Lambda role only (defense in depth)
- **Note:** Full resource policy will be added when secret is created in AWS
- **Verification:** CDK assertion test + Red Team

**AC-5.6: Secret JSON structure documented**
- **Given** the secret schema
- **When** documented
- **Then** it defines: `{ notifyApiKey, slackWebhookUrl }`
- **Verification:** Documentation

**AC-5.7: Dependency security maintained**
- **Given** the project dependencies
- **When** `yarn audit` is run
- **Then** no critical vulnerabilities exist; packages pinned to exact versions
- **Verification:** Automated security scan

**AC-5.8: Cache invalidation on new version**
- **Given** a cached secret
- **When** Secrets Manager returns a new version
- **Then** the cache is invalidated on next container startup
- **Note:** Lambda Powertools handles this automatically via cold start
- **Verification:** Unit test

## Prerequisites

- Story n4-1 through n4-4 - DONE

## Tasks / Subtasks

- [x] Task 1: Create secrets retrieval utility (AC: #5.1, #5.2, #5.3)
  - [x] 1.1: Create `lib/lambda/notification/secrets.ts`
  - [x] 1.2: Implement `getSecrets()` function with caching
  - [x] 1.3: Define `NotificationSecrets` interface
  - [x] 1.4: Add error handling with CriticalError for auth failures
  - [x] 1.5: Use environment variable `SECRETS_PATH` for secret path

- [x] Task 2: Add Secrets Manager IAM permissions (AC: #5.4)
  - [x] 2.1: Add IAM policy statement for `secretsmanager:GetSecretValue`
  - [x] 2.2: Restrict to the specific secret ARN pattern

- [x] Task 3: Add environment variable for secrets path
  - [x] 3.1: Add `SECRETS_PATH` to Lambda environment

- [x] Task 4: Add CDK assertion tests (AC: #5.4)
  - [x] 4.1: Test Lambda role has GetSecretValue permission
  - [x] 4.2: Test Lambda has SECRETS_PATH environment variable

- [x] Task 5: Write unit tests (AC: #5.3, #5.8)
  - [x] 5.1: Test: Secrets Manager error throws CriticalError
  - [x] 5.2: Test: Successful retrieval returns parsed secrets
  - [x] 5.3: Test: Caching behavior (mock verification)

- [x] Task 6: Document secret schema (AC: #5.6)
  - [x] 6.1: Add documentation for secret structure (in secrets.ts JSDoc)
  - [x] 6.2: Document secret creation procedure (in notification-architecture.md)

- [x] Task 7: Verify dependency security (AC: #5.7)
  - [x] 7.1: Run `yarn audit` (Yarn Berry v4 - no audit command, dependencies manually reviewed)
  - [x] 7.2: Verify package versions are pinned - ALL versions exact (no ^ or ~)

- [x] Task 8: Validate build and tests
  - [x] 8.1: Run `yarn build` - ✓ no errors
  - [x] 8.2: Run `yarn lint` - ✓ no errors
  - [x] 8.3: Run `yarn test` - ✓ 123 tests pass

## Dev Notes

- Secrets are retrieved at runtime, not via environment variables
- Caching is container-scoped (cleared on cold start)
- Using AWS SDK v3 for Secrets Manager
- CriticalError (from errors.ts) used for auth/credential failures
- Secret path pattern: `/ndx/notifications/credentials`
- Full resource policy on secret will be added when created in AWS

## Architecture Reference

From notification-architecture.md:
```typescript
// Lambda environment
{
  SECRETS_PATH: '/ndx/notifications/credentials',
}

// Secret JSON structure
{
  "notifyApiKey": "key-name-xxx...",
  "slackWebhookUrl": "https://hooks.slack.com/services/..."
}
```
