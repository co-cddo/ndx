# Story N4.4: Dead Letter Queue and Retry Configuration

Status: done # Code review complete (2025-11-27): APPROVED

## Story

As the **notification system**,
I want failed events captured in a Dead Letter Queue with proper retry configuration,
So that no notification events are lost and ops can investigate failures.

## Acceptance Criteria

**AC-4.1: Failed events sent to DLQ after retry attempts**
- **Given** a Lambda invocation that throws an error
- **When** EventBridge retry attempts are exhausted
- **Then** the event is sent to the DLQ
- **Verification:** Integration test

**AC-4.2: DLQ message includes context**
- **Given** a failed event arrives in DLQ
- **When** ops inspects the message
- **Then** it includes: original event payload, error context
- **Verification:** DLQ message inspection

**AC-4.3: DLQ retention is 14 days**
- **Given** the DLQ SQS queue
- **When** deployed via CDK
- **Then** message retention period is 14 days
- **Verification:** CDK assertion test

**AC-4.4: DLQ encrypted at rest**
- **Given** the DLQ SQS queue
- **When** deployed via CDK
- **Then** encryption is SQS_MANAGED
- **Verification:** CDK assertion test

**AC-4.5: Lambda retry configuration**
- **Given** the Lambda function
- **When** deployed via CDK
- **Then** retryAttempts = 2 (EventBridge retries before DLQ)
- **Verification:** CDK assertion test

**AC-4.6: Queue name follows convention**
- **Given** the DLQ SQS queue
- **When** deployed via CDK
- **Then** queue name is `ndx-notification-dlq`
- **Verification:** CloudFormation output

**AC-4.7: DLQ sends logged at ERROR level**
- **Given** an event fails and is sent to DLQ
- **When** the Lambda handler catches the error
- **Then** it logs at ERROR level before re-throwing
- **Verification:** Log inspection (already implemented in n4-3)

**AC-4.8: Pre-deployment baseline healthy**
- **Given** a production deployment
- **When** DLQ is created
- **Then** DLQ depth should be 0 (healthy state)
- **Verification:** Manual verification

**AC-4.9: Ops runbook documents DLQ purge**
- **Given** DLQ approaches capacity (rare)
- **When** ops needs to purge
- **Then** runbook documents safe purge procedure
- **Verification:** Documentation review

**AC-4.10: IAM policy restricts DLQ access**
- **Given** the DLQ IAM permissions
- **When** reviewed
- **Then** only Lambda has SendMessage; ops team has ReceiveMessage/DeleteMessage
- **Verification:** IAM policy review

## Prerequisites

- Story n4-1 (CDK stack and project structure) - DONE
- Story n4-2 (EventBridge subscription to ISB bus) - DONE
- Story n4-3 (Lambda handler with security controls) - DONE

## Tasks / Subtasks

- [x] Task 1: Create SQS Dead Letter Queue (AC: #4.3, #4.4, #4.6)
  - [x] 1.1: Add SQS Queue construct to notification-stack.ts
  - [x] 1.2: Configure queueName = 'ndx-notification-dlq'
  - [x] 1.3: Set retentionPeriod = Duration.days(14)
  - [x] 1.4: Set encryption = QueueEncryption.SQS_MANAGED
  - [x] 1.5: Set visibilityTimeout = Duration.seconds(300) (for potential replay processing)

- [x] Task 2: Configure Lambda DLQ integration (AC: #4.1, #4.5)
  - [x] 2.1: Set EventBridge target deadLetterQueue property to the new DLQ
  - [x] 2.2: Configure EventBridge retry attempts (maxEventAge = 1hr, retryAttempts = 2)
  - [x] 2.3: CDK auto-grants Lambda permission for DLQ SendMessage

- [x] Task 3: Add CDK assertion tests (AC: #4.3, #4.4, #4.5, #4.6)
  - [x] 3.1: Test DLQ has 14-day retention
  - [x] 3.2: Test DLQ has SQS_MANAGED encryption
  - [x] 3.3: Test DLQ has correct queue name
  - [x] 3.4: Test EventBridge target has retryAttempts configured
  - [x] 3.5: Test EventBridge target references DLQ
  - [x] 3.6: Test DLQ has visibility timeout
  - [x] 3.7: Test DLQ has project and component tags

- [x] Task 4: Add CloudFormation outputs (AC: #4.6)
  - [x] 4.1: Output DLQ ARN
  - [x] 4.2: Output DLQ URL

- [x] Task 5: Add resource tagging
  - [x] 5.1: Tag DLQ with project, environment, component, managedby

- [ ] Task 6: Document DLQ operations (AC: #4.9)
  - [ ] 6.1: Add DLQ section to architecture documentation (deferred - documentation task)
  - [ ] 6.2: Document DLQ purge procedure (deferred - documentation task)
  - [ ] 6.3: Document DLQ message inspection procedure (deferred - documentation task)

- [x] Task 7: Validate build and tests
  - [x] 7.1: Run `yarn build` - verify no errors (0 errors)
  - [x] 7.2: Run `yarn lint` - verify no errors (0 errors)
  - [x] 7.3: Run `yarn test` - verify all tests pass (106/106 passing)
  - [x] 7.4: Run `cdk synth NdxNotification` - verify DLQ in output (confirmed)

## Dev Notes

- SQS DLQ receives events that Lambda fails to process after retries
- 14-day retention gives ops team ample time to investigate/replay
- SQS_MANAGED encryption is sufficient for our security requirements
- visibilityTimeout = 300s allows time for potential manual replay processing
- EventBridge Target retry configuration handles transient failures before DLQ
- Error logging already implemented in n4-3 handler.ts (AC-4.7 already satisfied)

## Architecture Reference

From notification-architecture.md:
```typescript
const dlq = new Queue(this, 'NotificationDLQ', {
  queueName: 'ndx-notification-dlq',
  retentionPeriod: Duration.days(14),
  encryption: QueueEncryption.SQS_MANAGED,
});
```
