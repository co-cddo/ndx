# Story N4.3: Lambda Handler with Security Controls

Status: done # Code review complete (2025-11-27): APPROVED

## Story

As the **notification system**,
I want a Lambda handler that validates event sources and prevents unauthorized event processing,
So that only legitimate ISB events trigger notifications.

## Acceptance Criteria

**AC-3.1: Handler validates event.source is in allowed list**

- **Given** an EventBridge event arrives at the Lambda
- **When** the handler processes the event
- **Then** it validates `event.source` is in allowed list (`['innovation-sandbox']`)
- **Verification:** Unit test

**AC-3.1.1: Red Team security test for source validation**

- **Given** a handler receives an event
- **When** the event has `source: 'attacker-service'`
- **Then** the handler rejects with SecurityError logged
- **Verification:** Unit test + Red Team

**AC-3.2: Unauthorized sources rejected with SecurityError logged**

- **Given** an event with an unauthorized source
- **When** the handler validates the source
- **Then** a SecurityError is logged and the event is rejected
- **Verification:** Unit test + log inspection

**AC-3.3: Lambda Powertools Logger configured**

- **Given** the Lambda handler
- **When** it processes events
- **Then** Lambda Powertools Logger is configured with service name `ndx-notifications`
- **Verification:** Log inspection

**AC-3.4: Structured JSON logs include required fields**

- **Given** an event is processed
- **When** logging occurs
- **Then** structured JSON logs include: eventId, eventType, processing status
- **Verification:** Log inspection

**AC-3.5: Lambda has correct resource configuration**

- **Given** the Lambda function
- **When** deployed via CDK
- **Then** it has 256MB memory, 30s timeout, Node.js 20.x runtime
- **Verification:** CDK assertion test (already passing from n4-1)

**AC-3.6: Reserved concurrency = 10**

- **Given** the Lambda function
- **When** deployed via CDK
- **Then** reserved concurrency is set to 10 (blast radius limiting per Devil's Advocate)
- **Verification:** CDK assertion test

**AC-3.6.1: Load test validates reserved concurrency**

- **Given** a staging environment
- **When** 10 concurrent events are processed
- **Then** the system sustains load without throttling errors
- **Verification:** Load test (staging)

**AC-3.6.2: Handler timeout protection**

- **Given** the Lambda function
- **When** an event takes > 30s to process
- **Then** the Lambda is killed (prevents slow event DoS)
- **Verification:** Unit test + Red Team

**AC-3.7: SuspiciousEmailDomain metric emitted**

- **Given** an event is processed
- **When** the user email domain is not `.gov.uk`
- **Then** a `SuspiciousEmailDomain` metric is emitted (defense in depth for N-5)
- **Verification:** Unit test + Red Team

**AC-3.7.1: SuspiciousEmailDomain metric unit test**

- **Given** a handler receives an event
- **When** the event has a non-.gov.uk email
- **Then** `SuspiciousEmailDomain` metric is incremented
- **Verification:** Unit test + Red Team

**AC-3.8: Log levels follow conventions**

- **Given** the handler processes events
- **When** logging occurs
- **Then** log levels are: ERROR for DLQ-worthy, WARN for retries, INFO for success
- **Verification:** Log inspection

**AC-3.8.1: Log injection prevention**

- **Given** a handler receives an event
- **When** the event has newline in detail-type
- **Then** logs structured JSON with escaped newline (no injection)
- **Verification:** Unit test + Red Team

**AC-3.9: Idempotency key derived from event.id**

- **Given** duplicate events arrive
- **When** the handler processes them
- **Then** idempotency key is derived from `event.id` (EventBridge-provided)
- **Verification:** Unit test + Devil's Advocate

**AC-3.9.1: Idempotency documentation**

- **Given** the handler code
- **When** reviewed
- **Then** code comment documents why event.id is required (duplicate notifications = security issue)
- **Verification:** Code review + RCA

**AC-3.10: PII redaction in logs**

- **Given** a security event with email addresses
- **When** logging occurs
- **Then** email addresses are logged as `[REDACTED]`
- **Verification:** Log inspection + GDPR

## Prerequisites

- Story n4-2 (EventBridge subscription to ISB bus) - DONE

## Tasks / Subtasks

- [x] Task 1: Install Lambda Powertools dependencies (AC: #3.3)
  - [x] 1.1: Add `@aws-lambda-powertools/logger` to infra/package.json
  - [x] 1.2: Add `@aws-lambda-powertools/metrics` to infra/package.json
  - [x] 1.3: Run `yarn install` in infra directory
  - [x] 1.4: Verify no security vulnerabilities with `yarn audit`

- [x] Task 2: Implement handler with source validation (AC: #3.1, #3.1.1, #3.2)
  - [x] 2.1: Update handler.ts to import Logger from Powertools
  - [x] 2.2: Define `ALLOWED_SOURCES = ['innovation-sandbox']` constant (in types.ts)
  - [x] 2.3: Implement `validateEventSource()` function
  - [x] 2.4: Throw SecurityError for unauthorized sources
  - [x] 2.5: Log security rejections at ERROR level

- [x] Task 3: Configure Lambda Powertools Logger (AC: #3.3, #3.4, #3.8)
  - [x] 3.1: Initialize Logger with serviceName `ndx-notifications`
  - [x] 3.2: Configure log level based on environment (ENVIRONMENT/LOG_LEVEL env vars)
  - [x] 3.3: Add structured fields: eventId, eventType, processingStatus
  - [x] 3.4: Implement appendKeys() for correlation ID propagation

- [x] Task 4: Add reserved concurrency to CDK stack (AC: #3.6)
  - [x] 4.1: Add `reservedConcurrentExecutions: 10` to Lambda construct
  - [x] 4.2: Add CDK assertion test for reserved concurrency

- [x] Task 5: Implement SuspiciousEmailDomain metric (AC: #3.7, #3.7.1)
  - [x] 5.1: Initialize Metrics from Powertools
  - [x] 5.2: Define `checkEmailDomain()` function
  - [x] 5.3: Emit `SuspiciousEmailDomain` metric for non-.gov.uk domains
  - [x] 5.4: Add namespace `ndx/notifications` for custom metrics

- [x] Task 6: Implement log injection prevention (AC: #3.8.1)
  - [x] 6.1: Create `sanitizeLogInput()` utility function
  - [x] 6.2: Escape newlines, control characters in log fields
  - [x] 6.3: Apply sanitization to detail-type and other user-controlled fields

- [x] Task 7: Implement PII redaction (AC: #3.10)
  - [x] 7.1: Create `redactEmail()` utility function
  - [x] 7.2: Apply redaction to email fields in security logs
  - [x] 7.3: Verify no raw emails appear in CloudWatch logs

- [x] Task 8: Add idempotency handling stub (AC: #3.9, #3.9.1)
  - [x] 8.1: Extract `event.id` for idempotency key (used as correlation ID)
  - [x] 8.2: Add code comment explaining idempotency requirement (header comment)
  - [x] 8.3: Note: Full idempotency implementation deferred to n5-7

- [x] Task 9: Write unit tests (AC: #3.1.1, #3.6.2, #3.7.1, #3.8.1)
  - [x] 9.1: Test: Unauthorized source rejected with SecurityError
  - [x] 9.2: Test: Authorized source accepted
  - [x] 9.3: Test: Non-.gov.uk email emits SuspiciousEmailDomain metric
  - [x] 9.4: Test: .gov.uk email does not emit metric
  - [x] 9.5: Test: Newline in detail-type is escaped in logs
  - [x] 9.6: Test: Email addresses are redacted in logs
  - [x] 9.7: Verify `yarn test` passes (all 95 tests passing)

- [x] Task 10: Validate build and CDK synth (AC: #3.5, #3.6)
  - [x] 10.1: Run `yarn build` - verify no errors
  - [x] 10.2: Run `yarn lint` - verify no errors
  - [x] 10.3: Run `cdk synth NdxNotification` - verify success
  - [x] 10.4: Verify CloudFormation includes ReservedConcurrentExecutions

## Dev Notes

- Lambda Powertools provides structured logging, metrics, and tracing out of the box
- Service name `ndx-notifications` follows naming convention from n4-1
- Reserved concurrency = 10 calculated from Devil's Advocate analysis:
  - GOV.UK Notify rate limit: 3000/min
  - Average Lambda duration: 500ms
  - Safety factor: 0.4
  - Calculation: (3000/60) × 0.5 × 0.4 = 10
- SuspiciousEmailDomain metric is defense in depth - actual email verification is in N-5
- Log injection prevention critical for security audit compliance
- Idempotency stub prepares for full Lambda Powertools idempotency in n5-7

## Learnings from n4-2

- ISB config pattern established in `lib/config.ts` - reuse for any ISB-related constants
- EventBridge event types exported as `ISB_EVENT_TYPES` constant - use for validation
- Test patterns established: use `Template.fromStack()` and `hasResourceProperties()`
- Jest configured to find tests in both `test/` and `lib/` directories
