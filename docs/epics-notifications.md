# NDX Notification System - Epic Breakdown

**Author:** cns
**Date:** 2025-11-27
**Project Level:** MVP
**Target Scale:** 10,000 events/month (scaling to 100K+)
**Features:** 3 (GOV.UK Notify Integration), 4 (Slack Integration) & 5 (DynamoDB Lease Enrichment)

---

## Overview

This document provides the complete epic and story breakdown for the NDX Notification System, decomposing the requirements from the [PRD](./prd.md) and [Architecture](./notification-architecture.md) into implementable stories.

**Living Document Notice:** This is the implementation plan for Features 3, 4 & 5, aligned with the "one brain, two mouths" architecture pattern - a single Lambda processing EventBridge events and routing to GOV.UK Notify (user emails) or Slack (ops alerts), with DynamoDB lease enrichment for context-rich notifications.

### Epic Summary

| Epic | Title                                  | User Value                                      | Stories | FRs Covered |
| ---- | -------------------------------------- | ----------------------------------------------- | ------- | ----------- |
| 4    | Notification Infrastructure Foundation | Platform ready to process events securely       | 6       | 32          |
| 5    | User Email Notifications               | Users receive professional branded emails       | 7       | 39          |
| 6    | Operations Slack Alerts                | Ops team gets real-time visibility              | 6       | 31          |
| 7    | DynamoDB Lease Enrichment              | Context-rich notifications with full lease data | 6       | 50          |

**Total:** 4 Epics, 25 Stories, 152 FRs

---

## Functional Requirements Inventory

### Feature 3: GOV.UK Notify Integration (48 FRs)

- **FR-NOTIFY-1 to 5:** EventBridge Integration
- **FR-NOTIFY-6 to 13:** Lambda Function Processing
- **FR-NOTIFY-14 to 17:** Lease Lifecycle Events (Requested, Approved, Denied, Terminated)
- **FR-NOTIFY-18 to 24:** Lease Monitoring Events (Budget, Duration, Freeze alerts)
- **FR-NOTIFY-25 to 29:** Account Management Events (Cleanup, Quarantine, Drift)
- **FR-NOTIFY-30 to 31:** Cost Reporting Events
- **FR-NOTIFY-32 to 36:** Error Handling
- **FR-NOTIFY-37 to 39:** Secrets Management
- **FR-NOTIFY-40 to 43:** CloudWatch Monitoring
- **FR-NOTIFY-44 to 48:** GOV.UK Notify Templates

### Feature 4: Slack Integration (54 FRs)

- **FR-SLACK-1 to 5:** EventBridge Integration
- **FR-SLACK-6 to 10:** AWS Billing Integration
- **FR-SLACK-11 to 17:** Lambda Function Processing
- **FR-SLACK-18 to 22:** Daily Spend Alert
- **FR-SLACK-23 to 27:** Billing Anomaly Alert
- **FR-SLACK-28 to 32:** Account Activated Alert
- **FR-SLACK-33 to 37:** Account Quarantined Alert
- **FR-SLACK-38 to 42:** Account Frozen Alert
- **FR-SLACK-43 to 47:** Error Handling
- **FR-SLACK-48 to 50:** Secrets Management
- **FR-SLACK-51 to 54:** CloudWatch Monitoring

### Feature 5: DynamoDB Lease Enrichment (50 FRs)

- **FR-ENRICH-1 to 6:** DynamoDB Integration
- **FR-ENRICH-7 to 11:** Payload Flattening - Objects
- **FR-ENRICH-12 to 18:** Payload Flattening - Arrays
- **FR-ENRICH-19 to 24:** Value Stringification
- **FR-ENRICH-25 to 28:** Keys Parameter
- **FR-ENRICH-29 to 35:** Integration with Existing Notifications
- **FR-ENRICH-36 to 42:** Error Handling
- **FR-ENRICH-43 to 50:** Lease Status Handling

---

## FR Coverage Map

| Epic                 | FRs Covered                                                  | Coverage                                                   |
| -------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| Epic 4 (Foundation)  | FR-NOTIFY-1-5, FR-NOTIFY-32-43, FR-SLACK-1-5, FR-SLACK-43-54 | Infrastructure, Error Handling, Monitoring                 |
| Epic 5 (User Emails) | FR-NOTIFY-6-31, FR-NOTIFY-44-48                              | All user notification events                               |
| Epic 6 (Ops Alerts)  | FR-SLACK-6-42                                                | All Slack alert types                                      |
| Epic 7 (Enrichment)  | FR-ENRICH-1-50                                               | DynamoDB query, flattening, keys parameter, error handling |

---

## Epic 4: Notification Infrastructure Foundation

**Goal:** Deploy the foundational infrastructure for the notification system - EventBridge subscription, Lambda handler skeleton with security controls, DLQ, idempotency table, and CloudWatch monitoring. After this epic, the system can receive events from ISB and safely process them (even if sending is stubbed).

**User Value:** Platform ready to securely receive and process ISB events with full observability. No notifications lost, all failures visible.

**FRs Covered:** FR-NOTIFY-1-5, FR-NOTIFY-32-43, FR-NOTIFY-37-39, FR-SLACK-1-5, FR-SLACK-43-54, FR-SLACK-48-50

### Story 4.1: CDK Stack and Project Structure

As an **infrastructure developer**,
I want a new `NotificationStack` in the CDK project with proper TypeScript structure,
So that I have a clean foundation for building the notification system.

**Acceptance Criteria:**

**Given** the existing NDX infra/ CDK project
**When** I add the NotificationStack class
**Then** the stack compiles without errors

**And** the project structure matches architecture spec:

```
infra/lib/
├── notification-stack.ts
├── notification-stack.test.ts
└── lambda/notification/
    ├── handler.ts
    ├── types.ts
    └── errors.ts
```

**And** `cdk synth NotificationStack` produces valid CloudFormation

**And** the stack is added to `bin/infra.ts` app definition

**Prerequisites:** None (first story)

**Technical Notes:**

- Extend existing CDK project (don't create new repo)
- Use NodejsFunction for Lambda (esbuild bundling)
- Stack name: `NdxNotificationStack`
- Follow existing naming conventions from ndx-stack.ts

---

### Story 4.2: EventBridge Subscription to ISB Bus

As the **notification system**,
I want to subscribe to the ISB EventBridge bus for notification-relevant events,
So that I receive all events that need user or ops notifications.

**Acceptance Criteria:**

**Given** the ISB EventBridge bus exists at `ISB-{namespace}-ISBEventBus`
**When** I deploy the NotificationStack
**Then** an EventBridge rule is created targeting the notification Lambda

**And** the rule filters for these detail-types:

- LeaseRequested, LeaseApproved, LeaseDenied, LeaseTerminated
- LeaseBudgetThresholdAlert, LeaseDurationThresholdAlert, LeaseFreezingThresholdAlert
- LeaseBudgetExceeded, LeaseExpired, LeaseFrozen
- AccountCleanupFailed, AccountQuarantined, AccountDriftDetected

**And** event metadata is preserved (timestamp, event ID, source)

**And** the Lambda receives the full event payload on rule match

**Prerequisites:** Story 4.1

**Technical Notes:**

- Use `EventBus.fromEventBusName()` to reference existing bus
- Namespace from config (`lib/config.ts`)
- Rule name: `ndx-notification-rule`
- CDK test validates rule pattern matches expected events

---

### Story 4.3: Lambda Handler with Security Controls

As the **notification system**,
I want a Lambda handler that validates event sources and prevents unauthorized event processing,
So that only legitimate ISB events trigger notifications.

**Acceptance Criteria:**

**Given** an EventBridge event arrives at the Lambda
**When** the handler processes the event
**Then** it validates `event.source` is in allowed list (`['innovation-sandbox']`)

**And** unauthorized sources are rejected with SecurityError logged

**And** the handler uses Lambda Powertools Logger with correlation IDs

**And** structured JSON logs include eventId, eventType, and processing status

**And** the Lambda has 256MB memory, 30s timeout, Node.js 20.x runtime

**Prerequisites:** Story 4.2

**Technical Notes:**

- Import `@aws-lambda-powertools/logger`
- Service name: `ndx-notifications`
- Log levels: ERROR for DLQ-worthy, WARN for retries, INFO for success
- See Architecture ADR-006 for security patterns

---

### Story 4.4: Dead Letter Queue and Retry Configuration

As an **operations engineer**,
I want failed notifications to be captured in a DLQ with full context,
So that no notifications are permanently lost and I can investigate failures.

**Acceptance Criteria:**

**Given** a notification processing failure occurs
**When** retries are exhausted (3 attempts)
**Then** the event is sent to the DLQ

**And** DLQ message includes: original event payload, error message, attempt count

**And** DLQ retention is 14 days

**And** DLQ is encrypted at rest (SQS_MANAGED)

**And** Lambda retry configuration: 2 retries before DLQ

**Prerequisites:** Story 4.3

**Technical Notes:**

- Queue name: `ndx-notification-dlq`
- Lambda `deadLetterQueue` property
- Log DLQ sends at ERROR level
- Test: Simulate failure, verify DLQ message format

---

### Story 4.5: Secrets Manager Integration

As the **notification system**,
I want to retrieve API credentials from Secrets Manager at runtime,
So that secrets are never in code or environment variables.

**Acceptance Criteria:**

**Given** the Lambda handler starts processing
**When** it needs GOV.UK Notify API key or Slack webhook URL
**Then** it retrieves from `/ndx/notifications/credentials` secret

**And** the secret value is cached in Lambda memory for container lifetime

**And** Secrets Manager errors fail gracefully (log, send to DLQ)

**And** the Lambda IAM role has `secretsmanager:GetSecretValue` permission

**And** a resource policy restricts secret access to this Lambda only

**Prerequisites:** Story 4.4

**Technical Notes:**

- Secret JSON structure: `{ notifyApiKey, slackWebhookUrl }`
- Lazy load on first use, cache globally
- See Architecture ADR-006 for resource policy pattern
- Test: Mock Secrets Manager, verify caching behavior

---

### Story 4.6: CloudWatch Alarms and Monitoring

As an **operations engineer**,
I want CloudWatch alarms that notify me of notification system issues,
So that I can respond quickly to failures.

**Acceptance Criteria:**

**Given** the NotificationStack is deployed
**When** notification system issues occur
**Then** appropriate alarms fire:

- DLQ depth > 0 messages → alarm
- Lambda errors > 5 in 5 minutes → alarm
- Zero invocations in 24 hours → alarm (canary)

**And** alarms publish to an SNS topic

**And** AWS Chatbot is configured to send infra alerts to Slack

**And** custom metrics published: `NotificationSuccess`, `NotificationFailure`

**Prerequisites:** Story 4.5

**Technical Notes:**

- Alarm names: `ndx-notification-dlq-depth`, `ndx-notification-errors`
- AWS Chatbot configuration for `#ndx-infra-alerts` channel
- Use Lambda Powertools Metrics for custom metrics
- Test: CDK assertions for alarm thresholds

---

## Epic 5: User Email Notifications

**Goal:** Implement GOV.UK Notify integration so users receive professional, GOV.UK-branded emails for all Innovation Sandbox events. This includes lease lifecycle (requested, approved, denied, terminated), monitoring alerts (budget, duration, freeze), and account management events.

**User Value:** Users get clear, professionally formatted notifications that match government service standards. They know exactly what's happening with their sandbox and what action to take.

**FRs Covered:** FR-NOTIFY-6-31, FR-NOTIFY-44-48

### Story 5.1: GOV.UK Notify SDK Integration

As the **notification system**,
I want to integrate with GOV.UK Notify using the official SDK,
So that I can send properly formatted government emails.

**Acceptance Criteria:**

**Given** a validated notification event
**When** I need to send a user email
**Then** I use `notifications-node-client` to call GOV.UK Notify API

**And** the NotifySender class encapsulates all Notify interactions

**And** API key is retrieved from Secrets Manager (not hardcoded)

**And** rate limiting (429) triggers exponential backoff retry

**And** auth failures (401/403) are logged as CRITICAL and sent to DLQ

**Prerequisites:** Story 4.6 (Epic 4 complete)

**Technical Notes:**

- `yarn add notifications-node-client`
- File: `lambda/notification/notify-sender.ts`
- Wrap SDK errors with classifyHttpError() from errors.ts
- Test: Mock SDK, verify retry behavior for 429

---

### Story 5.2: Event Schema Validation with Zod

As the **notification system**,
I want to validate incoming events against ISB's Zod schemas,
So that malformed events fail fast with clear error messages.

**Acceptance Criteria:**

**Given** an EventBridge event arrives
**When** the handler processes it
**Then** it validates against the appropriate Zod schema

**And** validation failures throw PermanentError (no retry)

**And** the validation module supports all ISB event types:

- LeaseKey, LeaseApprovedEvent, LeaseRequestedEvent, LeaseDeniedEvent
- LeaseFrozenEvent, LeaseTerminatedEvent, LeaseBudgetThresholdTriggeredEvent
- AccountQuarantinedEvent, AccountCleanupFailureEvent, AccountDriftEvent

**And** validation errors include field-level details in logs

**Prerequisites:** Story 5.1

**Technical Notes:**

- File: `lambda/notification/validation.ts`
- Copy Zod schemas from Architecture ISB Integration section
- Discriminated unions for reason types (Expired, BudgetExceeded, etc.)
- Test: Invalid events produce clear error messages

---

### Story 5.3: Email Ownership Verification

As a **security-conscious system**,
I want to verify email addresses against lease ownership before sending,
So that emails only go to the legitimate lease owner.

**Acceptance Criteria:**

**Given** a validated event with userEmail field
**When** preparing to send a notification
**Then** I query DynamoDB to verify the email matches the lease owner

**And** mismatches throw SecurityError and log with `[REDACTED]` PII

**And** DynamoDB access is read-only (GetItem, Query)

**And** IAM permissions use CloudFormation imports for table ARNs

**Prerequisites:** Story 5.2

**Technical Notes:**

- File: `lambda/notification/enrichment.ts`
- LeaseTable: PK=userEmail, SK=uuid
- Cross-check `event.userEmail` with `lease.userEmail`
- See Architecture ADR-006 for implementation pattern

---

### Story 5.4: Lease Lifecycle Email Templates

As a **sandbox user**,
I want to receive clear emails when my lease status changes,
So that I know when I can access my sandbox and what to do next.

**Acceptance Criteria:**

**Given** a lease lifecycle event (Requested, Approved, Denied, Terminated)
**When** the notification system processes it
**Then** it sends the appropriate GOV.UK Notify email:

| Event           | Template     | Key Personalisation Fields                           |
| --------------- | ------------ | ---------------------------------------------------- |
| LeaseRequested  | Confirmation | userName, templateName, requestTime                  |
| LeaseApproved   | Welcome      | userName, accountId, ssoUrl, expiryDate, budgetLimit |
| LeaseDenied     | Denial       | userName, templateName, reason, deniedBy             |
| LeaseTerminated | Farewell     | userName, accountId, reason, finalCost               |

**And** emails are sent within 5 seconds of event receipt

**And** template IDs are configured via environment variables

**Prerequisites:** Story 5.3

**Technical Notes:**

- File: `lambda/notification/templates.ts`
- Template registry maps event type → templateId + requiredFields
- Env vars: NOTIFY_TEMPLATE_LEASE_APPROVED, etc.
- Test: Each event type produces correct template call

---

### Story 5.5: Monitoring Alert Email Templates

As a **sandbox user**,
I want to receive warning emails before my sandbox is frozen or budget exceeded,
So that I can save my work and take action.

**Acceptance Criteria:**

**Given** a monitoring event (Budget, Duration, Freeze alerts)
**When** the notification system processes it
**Then** it sends the appropriate warning email:

| Event                       | Template        | Key Personalisation Fields                       |
| --------------------------- | --------------- | ------------------------------------------------ |
| LeaseBudgetThresholdAlert   | Budget Warning  | userName, currentSpend, budgetLimit, percentUsed |
| LeaseDurationThresholdAlert | Time Warning    | userName, hoursRemaining, expiryDate             |
| LeaseFreezingThresholdAlert | Freeze Imminent | userName, reason, freezeTime                     |
| LeaseBudgetExceeded         | Over Budget     | userName, finalSpend, budgetLimit                |
| LeaseExpired                | Expired         | userName, accountId, expiryTime                  |
| LeaseFrozen                 | Frozen          | userName, accountId, reason, resumeInstructions  |

**And** emails include clear call-to-action (save work, extend, contact admin)

**Prerequisites:** Story 5.4

**Technical Notes:**

- Budget thresholds come from event: 50%, 75%, 90%
- Freeze reasons are discriminated union (Expired, BudgetExceeded, ManuallyFrozen)
- Test: Each alert type with sample threshold values

---

### Story 5.6: DynamoDB Enrichment for Missing Fields

As the **notification system**,
I want to enrich events with additional context from DynamoDB,
So that emails have all the information users need.

**Acceptance Criteria:**

**Given** an event is missing required template fields
**When** I prepare the notification
**Then** I query ISB DynamoDB tables for missing data:

- LeaseTable: userName, expirationDate, maxSpend, totalCostAccrued
- SandboxAccountTable: name, email
- LeaseTemplateTable: name, leaseDurationInHours

**And** enrichment uses table names from CloudFormation imports

**And** missing required fields after enrichment throw PermanentError

**And** enrichment adds ~10-50ms latency (acceptable)

**Prerequisites:** Story 5.5

**Technical Notes:**

- Query by leaseId (composite key: userEmail + uuid)
- GSI StatusIndex for status-based queries if needed
- Cache nothing (data freshness > latency)
- Test: Events missing fields get enriched successfully

---

### Story 5.7: Idempotency with Lambda Powertools

As the **notification system**,
I want to prevent duplicate notifications from EventBridge retries,
So that users don't receive the same email multiple times.

**Acceptance Criteria:**

**Given** the same event is delivered multiple times (EventBridge retry)
**When** the handler processes duplicates
**Then** only the first invocation sends a notification

**And** subsequent invocations return cached result

**And** idempotency uses Powertools DynamoDB persistence layer

**And** idempotency key is derived from event ID

**And** TTL is set appropriately (1 hour default)

**Prerequisites:** Story 5.6

**Technical Notes:**

- `yarn add @aws-lambda-powertools/idempotency`
- Table: `NdxIdempotency` (Powertools-managed schema)
- Wrap handler with `makeIdempotent()`
- See Architecture ADR-003 for rationale

---

## Epic 6: Operations Slack Alerts

**Goal:** Implement Slack webhook integration so the operations team receives real-time alerts for critical Innovation Sandbox events. This includes account quarantine, freeze, cleanup failures, and drift detection - all formatted with Slack Block Kit for readability.

**User Value:** Ops team gets immediate visibility into issues that need attention, directly in Slack where they collaborate. Faster response to critical events, no more missed alerts.

**FRs Covered:** FR-SLACK-6-42 (Billing alerts deprioritized to Growth phase per Architecture)

### Story 6.1: Slack Webhook Integration

As the **notification system**,
I want to post messages to Slack via incoming webhook,
So that ops alerts appear in the configured Slack channel.

**Acceptance Criteria:**

**Given** an ops alert needs to be sent
**When** I call the SlackSender
**Then** it POSTs to the webhook URL from Secrets Manager

**And** the request includes proper Content-Type header

**And** rate limiting (HTTP 429) triggers exponential backoff retry

**And** auth failures are logged as CRITICAL

**And** network timeouts retry 3 times before DLQ

**Prerequisites:** Epic 5 complete (shared infrastructure)

**Technical Notes:**

- File: `lambda/notification/slack-sender.ts`
- Use native `fetch()` (Node.js 20 built-in)
- Webhook URL from `/ndx/notifications/credentials` secret
- No PII in Slack messages (account IDs OK)

---

### Story 6.2: Slack Block Kit Message Templates

As an **operations engineer**,
I want Slack alerts formatted with Block Kit for readability,
So that I can quickly understand and act on alerts.

**Acceptance Criteria:**

**Given** an ops event needs a Slack alert
**When** the SlackSender builds the message
**Then** it uses Block Kit structure with:

- Header block with alert title and severity icon
- Section block with key details
- Context block with timestamp and event ID
- Color attachment: 🔴 red (critical), 🟡 yellow (warning), 🟢 green (info)

**And** critical alerts (@mention channel or specific users)

**And** messages include relevant links (AWS Console, ISB admin)

**Prerequisites:** Story 6.1

**Technical Notes:**

- Block Kit builder function in slack-sender.ts
- Priority enum: 'critical' | 'normal'
- Test: Each event type produces valid Block Kit JSON

---

### Story 6.3: Account Quarantine Alert

As an **operations engineer**,
I want immediate Slack alerts when accounts are quarantined,
So that I can investigate and remediate policy violations.

**Acceptance Criteria:**

**Given** an AccountQuarantined event is received
**When** the notification system processes it
**Then** Slack receives a critical alert (red) containing:

- AWS account ID
- Quarantine reason
- Timestamp
- Escalation guidance (who to contact)
- Link to ISB admin console

**And** the alert appears within 60 seconds of event

**Prerequisites:** Story 6.2

**Technical Notes:**

- Event schema: `{ awsAccountId, reason }`
- Channel: #ndx-ops-alerts
- Consider @here mention for critical

---

### Story 6.4: Account Frozen Alert

As an **operations engineer**,
I want Slack alerts when accounts are frozen,
So that I have visibility into user impact.

**Acceptance Criteria:**

**Given** a LeaseFrozen event is received
**When** the notification system processes it
**Then** Slack receives a warning alert (yellow) containing:

- AWS account ID
- Freeze reason (Expired, BudgetExceeded, ManuallyFrozen)
- Affected user (anonymized if needed)
- Current spend vs budget (if budget freeze)

**And** discriminated union reason is properly formatted

**Prerequisites:** Story 6.3

**Technical Notes:**

- LeaseFrozen goes to BOTH Notify (user) and Slack (ops)
- Route decision in handler.ts based on event type
- No user email in Slack message (use account ID)

---

### Story 6.5: Account Cleanup Failure Alert

As an **operations engineer**,
I want Slack alerts when account cleanup fails,
So that I can intervene with manual remediation.

**Acceptance Criteria:**

**Given** an AccountCleanupFailed event is received
**When** the notification system processes it
**Then** Slack receives a critical alert (red) containing:

- AWS account ID
- State machine execution ARN (link to Step Functions)
- Execution start time
- Manual remediation steps

**Prerequisites:** Story 6.4

**Technical Notes:**

- Event schema: `{ accountId, cleanupExecutionContext }`
- Include deep link to Step Functions execution
- This is ops-only, no user notification

---

### Story 6.6: Account Drift Detection Alert

As an **operations engineer**,
I want Slack alerts when account drift is detected,
So that I can investigate unexpected OU placement.

**Acceptance Criteria:**

**Given** an AccountDriftDetected event is received
**When** the notification system processes it
**Then** Slack receives a critical alert (red) containing:

- AWS account ID
- Expected OU (Active, CleanUp, etc.)
- Actual OU
- Investigation guidance

**And** drift types are explained in plain English

**Prerequisites:** Story 6.5

**Technical Notes:**

- OU values: Available, Active, CleanUp, Quarantine, Frozen, Entry, Exit
- Drift is a security concern - treat as critical
- Link to AWS Organizations console

---

## FR Coverage Matrix

| FR              | Description                                   | Epic | Story    |
| --------------- | --------------------------------------------- | ---- | -------- |
| FR-NOTIFY-1     | EventBridge rule for ISB source               | 4    | 4.2      |
| FR-NOTIFY-2     | Filter by detail-type                         | 4    | 4.2      |
| FR-NOTIFY-3     | Target Lambda function                        | 4    | 4.2      |
| FR-NOTIFY-4     | Receive event payload                         | 4    | 4.3      |
| FR-NOTIFY-5     | Preserve event metadata                       | 4    | 4.3      |
| FR-NOTIFY-6     | Extract recipient email                       | 5    | 5.3      |
| FR-NOTIFY-7     | Determine template ID                         | 5    | 5.4      |
| FR-NOTIFY-8     | Construct personalisation                     | 5    | 5.4, 5.5 |
| FR-NOTIFY-9     | Retrieve API key                              | 4    | 4.5      |
| FR-NOTIFY-10    | Call Notify API                               | 5    | 5.1      |
| FR-NOTIFY-11    | Handle rate limiting                          | 5    | 5.1      |
| FR-NOTIFY-12    | Structured logging                            | 4    | 4.3      |
| FR-NOTIFY-13    | Return success/failure                        | 5    | 5.1      |
| FR-NOTIFY-14    | LeaseRequested notification                   | 5    | 5.4      |
| FR-NOTIFY-15    | LeaseApproved notification                    | 5    | 5.4      |
| FR-NOTIFY-16    | LeaseDenied notification                      | 5    | 5.4      |
| FR-NOTIFY-17    | LeaseTerminated notification                  | 5    | 5.4      |
| FR-NOTIFY-18    | BudgetThresholdAlert                          | 5    | 5.5      |
| FR-NOTIFY-19    | BudgetExceeded                                | 5    | 5.5      |
| FR-NOTIFY-20    | DurationThresholdAlert                        | 5    | 5.5      |
| FR-NOTIFY-21    | FreezingThresholdAlert                        | 5    | 5.5      |
| FR-NOTIFY-22    | LeaseExpired                                  | 5    | 5.5      |
| FR-NOTIFY-23    | LeaseFrozen                                   | 5    | 5.5      |
| FR-NOTIFY-24    | LeaseUnfrozen                                 | 5    | 5.5      |
| FR-NOTIFY-25-29 | Account Management Events                     | 5    | 5.5      |
| FR-NOTIFY-30-31 | Cost Reporting Events                         | 5    | 5.5      |
| FR-NOTIFY-32    | DLQ for failures                              | 4    | 4.4      |
| FR-NOTIFY-33    | DLQ includes context                          | 4    | 4.4      |
| FR-NOTIFY-34    | Retry transient failures                      | 4    | 4.4      |
| FR-NOTIFY-35    | Log all attempts                              | 4    | 4.3      |
| FR-NOTIFY-36    | Handle malformed events                       | 5    | 5.2      |
| FR-NOTIFY-37    | Retrieve API key from Secrets                 | 4    | 4.5      |
| FR-NOTIFY-38    | Cache secrets                                 | 4    | 4.5      |
| FR-NOTIFY-39    | Handle Secrets errors                         | 4    | 4.5      |
| FR-NOTIFY-40    | Lambda error alarm                            | 4    | 4.6      |
| FR-NOTIFY-41    | DLQ depth alarm                               | 4    | 4.6      |
| FR-NOTIFY-42    | Notify API failure alarm                      | 4    | 4.6      |
| FR-NOTIFY-43    | Custom metrics                                | 4    | 4.6      |
| FR-NOTIFY-44    | 18 distinct templates                         | 5    | 5.4, 5.5 |
| FR-NOTIFY-45    | GOV.UK branding                               | 5    | 5.4      |
| FR-NOTIFY-46    | Personalisation fields                        | 5    | 5.4, 5.5 |
| FR-NOTIFY-47    | Clear call-to-action                          | 5    | 5.4, 5.5 |
| FR-NOTIFY-48    | Plain English content                         | 5    | 5.4, 5.5 |
| FR-SLACK-1      | EventBridge rule for ISB                      | 4    | 4.2      |
| FR-SLACK-2      | Filter ISB events                             | 4    | 4.2      |
| FR-SLACK-3      | Scheduled event (Growth)                      | -    | Deferred |
| FR-SLACK-4      | Target Lambda                                 | 4    | 4.2      |
| FR-SLACK-5      | Preserve metadata                             | 4    | 4.3      |
| FR-SLACK-6-10   | AWS Billing (Growth)                          | -    | Deferred |
| FR-SLACK-11     | Determine template                            | 6    | 6.2      |
| FR-SLACK-12     | Block Kit message                             | 6    | 6.2      |
| FR-SLACK-13     | Retrieve webhook                              | 4    | 4.5      |
| FR-SLACK-14     | Call webhook URL                              | 6    | 6.1      |
| FR-SLACK-15     | Handle rate limiting                          | 6    | 6.1      |
| FR-SLACK-16     | Structured logging                            | 4    | 4.3      |
| FR-SLACK-17     | Return status                                 | 6    | 6.1      |
| FR-SLACK-18-27  | Billing Alerts (Growth)                       | -    | Deferred |
| FR-SLACK-28-32  | Account Activated (Growth)                    | -    | Deferred |
| FR-SLACK-33-37  | AccountQuarantined                            | 6    | 6.3      |
| FR-SLACK-38-42  | LeaseFrozen                                   | 6    | 6.4      |
| FR-SLACK-43     | DLQ for failures                              | 4    | 4.4      |
| FR-SLACK-44     | DLQ context                                   | 4    | 4.4      |
| FR-SLACK-45     | Retry transient                               | 4    | 4.4      |
| FR-SLACK-46     | Log all attempts                              | 4    | 4.3      |
| FR-SLACK-47     | Handle malformed                              | 5    | 5.2      |
| FR-SLACK-48     | Retrieve webhook from Secrets                 | 4    | 4.5      |
| FR-SLACK-49     | Cache secrets                                 | 4    | 4.5      |
| FR-SLACK-50     | Handle Secrets errors                         | 4    | 4.5      |
| FR-SLACK-51     | Lambda error alarm                            | 4    | 4.6      |
| FR-SLACK-52     | DLQ depth alarm                               | 4    | 4.6      |
| FR-SLACK-53     | Slack API failure alarm                       | 4    | 4.6      |
| FR-SLACK-54     | Custom metrics                                | 4    | 4.6      |
| FR-ENRICH-1     | Extract userEmail and uuid from event         | 7    | 7.1      |
| FR-ENRICH-2     | Query DynamoDB LeaseTable                     | 7    | 7.1      |
| FR-ENRICH-3     | Retrieve complete lease record                | 7    | 7.1      |
| FR-ENRICH-4     | Handle lease not found                        | 7    | 7.5      |
| FR-ENRICH-5     | Handle DynamoDB errors                        | 7    | 7.5      |
| FR-ENRICH-6     | Cache DynamoDB client                         | 7    | 7.1      |
| FR-ENRICH-7     | Flatten nested objects (underscore separator) | 7    | 7.2      |
| FR-ENRICH-8     | Handle multiple nesting levels                | 7    | 7.2      |
| FR-ENRICH-9     | Flatten meta.createdTime                      | 7    | 7.2      |
| FR-ENRICH-10    | Flatten meta.lastEditTime                     | 7    | 7.2      |
| FR-ENRICH-11    | Flatten meta.schemaVersion                    | 7    | 7.2      |
| FR-ENRICH-12    | Flatten arrays of objects                     | 7    | 7.2      |
| FR-ENRICH-13    | Flatten budgetThresholds.dollarsSpent         | 7    | 7.2      |
| FR-ENRICH-14    | Flatten budgetThresholds.action               | 7    | 7.2      |
| FR-ENRICH-15    | Flatten durationThresholds.hoursRemaining     | 7    | 7.2      |
| FR-ENRICH-16    | Flatten durationThresholds.action             | 7    | 7.2      |
| FR-ENRICH-17    | Flatten arrays of primitives                  | 7    | 7.2      |
| FR-ENRICH-18    | Handle empty arrays                           | 7    | 7.2      |
| FR-ENRICH-19    | Convert values to strings                     | 7    | 7.3      |
| FR-ENRICH-20    | Stringify numbers                             | 7    | 7.3      |
| FR-ENRICH-21    | Stringify booleans                            | 7    | 7.3      |
| FR-ENRICH-22    | Preserve string values                        | 7    | 7.3      |
| FR-ENRICH-23    | Skip null values                              | 7    | 7.3      |
| FR-ENRICH-24    | Skip undefined values                         | 7    | 7.3      |
| FR-ENRICH-25    | Generate keys field                           | 7    | 7.3      |
| FR-ENRICH-26    | Sort keys alphabetically                      | 7    | 7.3      |
| FR-ENRICH-27    | Exclude keys field from keys list             | 7    | 7.3      |
| FR-ENRICH-28    | Include keys in all payloads                  | 7    | 7.3, 7.4 |
| FR-ENRICH-29    | Merge enriched with event data                | 7    | 7.4      |
| FR-ENRICH-30    | Enriched data takes precedence                | 7    | 7.4      |
| FR-ENRICH-31    | Send enriched to GOV.UK Notify                | 7    | 7.4      |
| FR-ENRICH-32    | Send enriched to Slack                        | 7    | 7.4      |
| FR-ENRICH-33    | Include leaseDurationInHours                  | 7    | 7.4      |
| FR-ENRICH-34    | Include maxSpend                              | 7    | 7.4      |
| FR-ENRICH-35    | Include totalCostAccrued                      | 7    | 7.4      |
| FR-ENRICH-36    | Log warning for lease not found               | 7    | 7.5      |
| FR-ENRICH-37    | Emit LeaseNotFound metric                     | 7    | 7.5      |
| FR-ENRICH-38    | Log error for DynamoDB failure                | 7    | 7.5      |
| FR-ENRICH-39    | Emit DynamoDBError metric                     | 7    | 7.5      |
| FR-ENRICH-40    | Graceful degradation                          | 7    | 7.5      |
| FR-ENRICH-41    | \_enriched: false flag                        | 7    | 7.5      |
| FR-ENRICH-42    | \_enriched: true flag                         | 7    | 7.5      |
| FR-ENRICH-43    | Enrich PendingApproval leases                 | 7    | 7.6      |
| FR-ENRICH-44    | Enrich ApprovalDenied leases                  | 7    | 7.6      |
| FR-ENRICH-45    | Enrich Active leases                          | 7    | 7.6      |
| FR-ENRICH-46    | Enrich Frozen leases                          | 7    | 7.6      |
| FR-ENRICH-47    | Enrich Expired leases                         | 7    | 7.6      |
| FR-ENRICH-48    | Enrich BudgetExceeded leases                  | 7    | 7.6      |
| FR-ENRICH-49    | Enrich ManuallyTerminated leases              | 7    | 7.6      |
| FR-ENRICH-50    | Enrich AccountQuarantined leases              | 7    | 7.6      |

---

## Epic 7: DynamoDB Lease Enrichment

**Goal:** Enrich notification payloads with complete lease data from the Innovation Sandbox LeaseTable in DynamoDB. When EventBridge events trigger notifications, the system fetches the full lease record, flattens nested structures, and includes all fields in payloads sent to both GOV.UK Notify and Slack.

**User Value:** Operations team and users receive context-rich notifications with complete lease details (duration, budget thresholds, timestamps, approval info) rather than minimal event data. The `keys` parameter enables easy debugging of available fields.

**FRs Covered:** FR-ENRICH-1 to FR-ENRICH-50 (50 FRs)

### Story 7.1: DynamoDB Integration Setup

As the **notification system**,
I want to query the LeaseTable in DynamoDB to retrieve complete lease records,
So that I can enrich notifications with full lease context.

**Acceptance Criteria:**

**Given** an EventBridge event containing `userEmail` and `uuid` fields
**When** the notification Lambda processes it
**Then** it queries DynamoDB LeaseTable using composite key (userEmail PK, uuid SK)

**And** the Lambda IAM role has `dynamodb:GetItem` permission for LeaseTable

**And** the LeaseTable ARN is stored in environment variable (not hardcoded)

**And** DynamoDB client is reused across Lambda invocations for connection pooling

**And** DynamoDB query latency is logged as CloudWatch metric (`EnrichmentQueryLatencyMs`)

**And** integration test validates query latency < 200ms (p99)

**And** if `userEmail` or `uuid` missing from event, enrichment is skipped with warning log

**And** if `userEmail` or `uuid` are wrong type (not string), enrichment is skipped with warning log

**And** `ProvisionedThroughputExceededException` triggers 1 retry with 500ms backoff (other errors fail immediately)

**And** schema fingerprint (sorted field names hash) is logged for drift detection

**Prerequisites:** Epic 5 complete (notification system operational)

**Technical Notes:**

- File: `lambda/notification/enrichment.ts` (extend existing)
- Use `@aws-sdk/client-dynamodb` with DocumentClient
- Table name from `process.env.LEASE_TABLE_NAME`
- Query: `GetItem({ TableName, Key: { userEmail, uuid } })`
- Same AWS account as notification Lambda (no cross-account IAM)
- Test: Mock DynamoDB, verify query parameters correct

---

### Story 7.2: Payload Flattening Utility

As the **notification system**,
I want to flatten nested objects and arrays into flat key-value pairs,
So that the enriched data is compatible with GOV.UK Notify and Slack APIs.

**Acceptance Criteria:**

**Given** a DynamoDB lease record with nested structures
**When** the flattening utility processes it
**Then** nested objects use underscore separator: `{meta: {createdTime: "2025-01-15"}}` → `{meta_createdTime: "2025-01-15"}`

**And** arrays of objects use index notation: `{budgetThresholds: [{dollarsSpent: 50}]}` → `{budgetThresholds_0_dollarsSpent: "50"}`

**And** arrays of primitives use index notation: `{tags: ["a", "b"]}` → `{tags_0: "a", tags_1: "b"}`

**And** multiple nesting levels handled: `{a: {b: {c: "v"}}}` → `{a_b_c: "v"}`

**And** empty arrays produce no output fields

**And** the flattening function is pure, testable in isolation

**And** flattening has max depth limit of 5 levels (deeper values logged and skipped)

**And** arrays with > 10 items are truncated with `fieldName_count` showing total

**And** flattened payload size is validated < 50KB (safety margin for Slack/Notify limits)

**And** if payload exceeds 50KB, truncation strategy applies: remove enriched fields progressively (largest first) until under limit

**Prerequisites:** Story 7.1

**Technical Notes:**

- File: `lambda/notification/flatten.ts` (new module)
- Recursive algorithm handling objects and arrays
- Separator constant: `const SEPARATOR = '_'`
- Max depth constant: `const MAX_DEPTH = 5`
- Max array items: `const MAX_ARRAY_ITEMS = 10`
- Export: `flattenObject(obj: Record<string, unknown>): Record<string, string>`
- Test: Unit tests for all field types, nesting levels, edge cases, truncation

---

### Story 7.3: Value Stringification and Keys Parameter

As the **notification system**,
I want to convert all values to strings and generate a keys parameter,
So that the payload is Notify/Slack compatible and debuggable.

**Acceptance Criteria:**

**Given** a flattened payload with various value types
**When** stringification is applied
**Then** numbers become strings: `{maxSpend: 50}` → `{maxSpend: "50"}`

**And** booleans become strings: `{active: true}` → `{active: "true"}`

**And** strings remain unchanged

**And** null values are excluded from output

**And** undefined values are excluded from output

**And** Date objects are converted to ISO 8601 strings via `.toISOString()`

**And** a `keys` field is added containing comma-separated list of all field names

**And** keys are sorted alphabetically for consistent ordering

**And** the `keys` field does not include itself in the list

**And** keys parameter is truncated to 5000 characters if exceeded (with "..." suffix)

**And** keys count is logged for monitoring payload growth over time

**Prerequisites:** Story 7.2

**Technical Notes:**

- Extend `flatten.ts` with stringification
- Keys generation: `Object.keys(flattened).sort().join(',')`
- Max keys length: `const MAX_KEYS_LENGTH = 5000`
- Export: `stringifyValues(obj: Record<string, unknown>): Record<string, string>`
- Export: `generateKeys(obj: Record<string, string>): string`
- Test: Cover all value types, null/undefined handling, keys ordering, truncation

---

### Story 7.4: Notification Integration

As the **notification system**,
I want to merge enriched lease data with event data and send to Notify/Slack,
So that recipients receive comprehensive, context-rich notifications.

**Acceptance Criteria:**

**Given** enriched lease data and original EventBridge event data
**When** merging for notification
**Then** enriched lease data takes precedence over event data for duplicate fields

**And** the merged payload includes `leaseDurationInHours` field

**And** the merged payload includes `maxSpend` field

**And** the merged payload includes `totalCostAccrued` field (when present in lease)

**And** the merged payload includes `keys` parameter listing all fields

**And** GOV.UK Notify receives enriched payload as personalisation object

**And** Slack Block Kit templates can reference enriched fields

**Prerequisites:** Story 7.3

**Technical Notes:**

- File: `lambda/notification/handler.ts` (modify)
- Merge: `{ ...eventData, ...enrichedLeaseData }` (lease wins conflicts)
- Update NotifySender to pass enriched personalisation
- Update SlackSender templates to reference new fields
- Test: Verify both Notify and Slack receive enriched fields
- **Note:** GOV.UK Notify template updates (to display enriched fields like `leaseDurationInHours`) are separate work in Notify dashboard - not part of this story

---

### Story 7.5: Error Handling and Metrics

As an **operations engineer**,
I want enrichment failures to be logged and metricked without blocking notifications,
So that I can monitor enrichment health while ensuring notification reliability.

**Acceptance Criteria:**

**Given** a lease not found in DynamoDB
**When** enrichment fails
**Then** a warning is logged with `userEmail` and `uuid` for debugging

**And** CloudWatch metric `LeaseNotFound` is emitted

**And** notification proceeds with event data only (graceful degradation)

**Given** a DynamoDB query error occurs
**When** enrichment fails
**Then** an error is logged (without credentials)

**And** CloudWatch metric `DynamoDBError` is emitted

**And** notification proceeds with event data only

**And** enrichment has 2-second timeout (proceed without if exceeded)

**And** `_enriched: true` or `_enriched: false` flag indicates enrichment status

**And** DynamoDB throttling is logged at WARN level (not ERROR) to reduce noise

**And** metric dimensions distinguish error type: `NotFound`, `Throttled`, `Timeout`, `Other`

**Prerequisites:** Story 7.4

**Technical Notes:**

- Use Lambda Powertools Metrics for custom metrics
- Namespace: `NdxNotifications`
- Metrics: `EnrichmentSuccess`, `EnrichmentFailure`, `LeaseNotFound`, `DynamoDBError`
- Metric dimension: `ErrorType` for failure categorization
- Log field: `enrichmentStatus: "success" | "failed" | "skipped"`
- Log field: `enrichmentDurationMs` for performance monitoring
- Log level: ERROR for permanent failures, WARN for transient (throttle/timeout)
- **Timeout Budget:** Lambda 30s total = Enrichment 2s + Notify API 10s + Slack API 10s + margin 8s
- Test: Simulate DynamoDB errors, verify graceful degradation, log levels

---

### Story 7.6: Lease Status Handling

As the **notification system**,
I want to correctly enrich all 8 lease statuses with their specific fields,
So that notifications include status-appropriate context.

**Acceptance Criteria:**

**Given** a PendingApproval lease
**When** enriched
**Then** base fields included (userEmail, uuid, status, leaseDurationInHours, maxSpend, meta*\*, budgetThresholds*_, durationThresholds\__)

**Given** an Active or Frozen lease
**When** enriched
**Then** base fields + monitored fields included (awsAccountId, approvedBy, startDate, expirationDate, lastCheckedDate, totalCostAccrued)

**Given** an Expired, BudgetExceeded, ManuallyTerminated, or AccountQuarantined lease
**When** enriched
**Then** base fields + monitored fields + expired fields included (endDate, ttl)

**Given** an ApprovalDenied lease
**When** enriched
**Then** base fields + ttl included

**And** all 8 statuses have unit test coverage

**And** unknown lease statuses are logged as warning but processed with available fields (forward-compatible)

**And** new/unexpected fields from LeaseTable are flattened and included (schema evolution safe)

**And** CloudWatch metric `UnexpectedLeaseStatus` emitted when unknown status encountered

**Prerequisites:** Story 7.5

**Technical Notes:**

- Lease status discriminated union from ISB schema
- Statuses: PendingApproval, ApprovalDenied, Active, Frozen, Expired, BudgetExceeded, ManuallyTerminated, AccountQuarantined, Ejected
- Each status has different field set - flattening must handle gracefully
- Forward-compatible: don't fail on unknown status or new fields
- Test: Unit tests with sample lease records for each status
- Test: Unit test for unknown status handling
- Test: Integration test with real LeaseTable data

---

## Deferred to Growth Phase

The following FRs are deferred per Architecture recommendation (MVP focus on critical alerts):

- **FR-SLACK-3, 6-10:** AWS Billing Integration (Cost Explorer, anomaly detection)
- **FR-SLACK-18-27:** Daily Spend Summary, Billing Anomaly Alerts
- **FR-SLACK-28-32:** Account Activated Alert (informational, not critical)

These will be addressed in Growth phase after MVP proves value.

---

## Summary

**4 Epics, 25 Stories covering 152 Functional Requirements**

| Epic                                           | Stories | Status | Dependencies                  |
| ---------------------------------------------- | ------- | ------ | ----------------------------- |
| Epic 4: Notification Infrastructure Foundation | 6       | Ready  | None                          |
| Epic 5: User Email Notifications               | 7       | Ready  | Epic 4                        |
| Epic 6: Operations Slack Alerts                | 6       | Ready  | Epic 5 (shared infra)         |
| Epic 7: DynamoDB Lease Enrichment              | 6       | Ready  | Epic 5 (extends Notify/Slack) |

**Implementation Order:**

1. Epic 4 → Foundation (must be first)
2. Epic 5 → User emails (primary user value)
3. Epic 6 → Ops alerts (builds on same infrastructure)
4. Epic 7 → Enrichment (enhances all notifications with lease data)

**Technical Stack:**

- AWS CDK v2 (TypeScript)
- Lambda Node.js 20.x
- Lambda Powertools (Logger, Idempotency, Metrics)
- GOV.UK Notify SDK (notifications-node-client)
- Slack Incoming Webhooks
- AWS SDK DynamoDB Client (for Epic 7)

**Estimated Cost:** ~$4.30/month (per Architecture analysis) + DynamoDB read costs (~$0.25/million reads)

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._

_Generated by BMAD Epic Decomposition Workflow v1.0_
_Last Updated: 2025-12-01_
_Original Date: 2025-11-27_
