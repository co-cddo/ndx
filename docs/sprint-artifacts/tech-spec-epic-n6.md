# Epic Technical Specification: Operations Slack Alerts

Date: 2025-11-27 (Updated: 2025-11-28)
Author: cns
Epic ID: n6
Status: Draft (5 Elicitation Methods Applied - Complete)

---

## Overview

Operations Slack Alerts (Epic N-6) implements real-time visibility for the operations team into critical Innovation Sandbox events. This epic focuses on delivering structured, actionable Slack messages for account-level critical events: quarantine, freeze, cleanup failures, and drift detection. Built on the shared notification infrastructure from Epic N-4 (EventBridge, Lambda, DLQ, monitoring) and reusing GOV.UK Notify integration patterns from Epic N-5, this epic completes the "one brain, two mouths" architecture by routing ops-critical events to Slack via incoming webhooks.

**User Value:** Ops team gets immediate visibility into critical events requiring attention, eliminating blind spots and enabling rapid response to account management issues that affect sandbox users.

## Objectives and Scope

### In Scope

- **Slack Webhook Integration:** POST messages to incoming webhook URL stored in Secrets Manager, with exponential backoff retry for rate limiting and network failures
- **Block Kit Message Formatting:** Professional, scannable Slack messages using Block Kit structure (headers, sections, context blocks) with severity indicators and action links
- **Four Alert Types:**
  1. **Account Quarantine Alert** - Critical (🔴 red) - Alerts when ISB detects policy violations
  2. **Account Frozen Alert** - Warning (🟡 yellow) - Alerts when sandbox lease is frozen (budget, duration, manual)
  3. **Account Cleanup Failure Alert** - Critical (🔴 red) - Alerts when cleanup automation fails, requires manual intervention
  4. **Account Drift Detection Alert** - Critical (🔴 red) - Alerts when account OU doesn't match expected state
- **Event Routing:** Slack alerts route through same Lambda handler as user notifications, using event type discrimination
- **Error Handling:** Failed Slack sends follow same DLQ + retry pattern as GOV.UK Notify (retries exhausted → DLQ → manual inspection)
- **Pre-Mortem Enhancements (from 2025-11-27 elicitation):**
  - Never expose webhook URL in error responses or logs
  - Daily DLQ summary digest (n6-7) for ops visibility
  - Quick-action runbook links (n6-8) per alert type
- **Stakeholder Mapping (from 2025-11-27 elicitation):**
  - Runbook links added to each alert for ops quick-action paths

### Out of Scope

- **Billing Alerts** (FR-SLACK-6-10, 18-27) - Deferred to Growth phase per Architecture (cost explorer integration, anomaly detection, daily spend summary, billing alerts)
- **Account Activated Alert** (FR-SLACK-28-32) - Deferred to Growth phase (informational, not critical for MVP)
- **Interactive Slack Buttons** - Deferred to Growth phase (future: Slack interactive components for immediate actions)
- **SMS/Teams/Push Notifications** - Deferred to future phases
- **Slack User Preferences** - Out of scope (ops team gets all alerts; user preferences for email handled in Epic N-5, story 5-10)

## System Architecture Alignment

This epic depends on and aligns with:

1. **Epic N-4 Foundation (Complete):** Inherits EventBridge rules, Lambda handler structure, DLQ, Secrets Manager integration, CloudWatch alarms. Slack alerts route through same Lambda as emails.

2. **Epic N-5 Integration (Prerequisite):** Reuses validation patterns, error classification, and enrichment logic. Shared Lambda Powertools (Logger, Metrics). Slack-specific templates registry mirrors email templates registry.

3. **Notification Architecture - "One Brain, Two Mouths":** Single Lambda processes ISB EventBridge events and discriminates route:
   - User notification events → GOV.UK Notify sender (notify-sender.ts)
   - Ops alert events → Slack sender (slack-sender.ts) ← **This epic**
   - Dual-channel events (LeaseFrozen) → Both channels

4. **Security & Compliance:** Adheres to ADR-006 (security-first processing):
   - No PII in Slack messages (account IDs only, no user emails)
   - Webhook URL protected in Secrets Manager (never in logs or errors)
   - Least-privilege IAM for Slack sender module
   - DLQ captures all failures for audit trail

---

## Detailed Design

### Services and Modules

| Service               | Responsibility                                              | Input                                   | Output                                               | Owner     |
| --------------------- | ----------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- | --------- |
| **SlackSender**       | Main module wrapping Slack webhook integration              | Validated event + template config       | HTTP 200 or throws RetriableError/PermanentError     | cns (dev) |
| **Block Kit Builder** | Formats messages using Slack Block Kit structure            | Alert type + account context            | JSON payload for webhook POST                        | cns (dev) |
| **Error Classifier**  | Maps HTTP errors to retry/DLQ decisions                     | HTTP status code + error message        | RetriableError/PermanentError/CriticalError          | cns (dev) |
| **Template Registry** | Centralized config for Slack templates (shared with Notify) | Event type (e.g., 'AccountQuarantined') | TemplateConfig { priority, channel, requiredFields } | cns (dev) |
| **Lambda Handler**    | Event routing logic (shared across N-5)                     | EventBridge event                       | Routes to NotifySender or SlackSender                | cns (dev) |

### Data Models and Contracts

**Slack Message Structure (Block Kit):**

```typescript
// Base Slack message schema (shared across all alert types)
{
  blocks: [
    { type: "header", text: { type: "plain_text", text: "🔴 Account Quarantine Alert" } },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: "*AWS Account:* 123456789012" },
        { type: "mrkdwn", text: "*Severity:* Critical" },
        { type: "mrkdwn", text: "*Reason:* Policy violation detected" },
        { type: "mrkdwn", text: "*Time:* 2025-11-27 14:32 UTC" },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "<https://console.aws.amazon.com|View in AWS Console> | <https://isb-admin/quarantine|View in ISB Admin>",
      },
    },
    { type: "context", elements: [{ type: "mrkdwn", text: "Event ID: evt-xyz-123 | Slack Alert v1" }] },
  ]
}
```

**Event Detail Schema (from ISB, validated before Slack send):**

```typescript
// AccountQuarantinedEvent
{
  awsAccountId: '123456789012',
  reason: 'Policy constraint violation: S3 bucket public ACL',
  // Optional enriched fields
  accountName?: 'Sandbox: Billing Team',
  quarantinedAt?: '2025-11-27T14:32:00Z'
}

// LeaseFrozenEvent (dual-channel)
{
  leaseId: { userEmail: 'user@gov.uk', uuid: 'a1b2c3d4-...' },
  accountId: '123456789012',
  reason: {
    type: 'BudgetExceeded',
    triggeredBudgetThreshold: 90,
    budget: 500.00,
    totalSpend: 475.50
  }
}

// AccountCleanupFailedEvent
{
  accountId: '123456789012',
  cleanupExecutionContext: {
    stateMachineExecutionArn: 'arn:aws:states:eu-west-1:123456789012:execution:cleanup-state-machine:exec-id',
    stateMachineExecutionStartTime: '2025-11-27T13:00:00Z'
  }
}

// AccountDriftDetectedEvent
{
  accountId: '123456789012',
  expectedOu: 'Active',
  actualOu: 'CleanUp'
}
```

### APIs and Interfaces

**SlackSender.send() interface:**

```typescript
interface SlackParams {
  alertType: 'AccountQuarantined' | 'LeaseFrozen' | 'AccountCleanupFailed' | 'AccountDriftDetected';
  accountId: string;
  priority: 'critical' | 'normal';
  details: Record<string, string | number | undefined>;
}

async send(params: SlackParams): Promise<void>
// Throws: RetriableError (429, 5xx, timeout) | PermanentError (400) | CriticalError (401, 403)
```

**Error Classification (from errors.ts):**

```typescript
export function classifyHttpError(status: number, body?: string): Error {
  switch (status) {
    case 400:
      return new PermanentError('Bad request - check message format');
    case 401:
    case 403:
      return new CriticalError('Auth failed - webhook invalid or revoked');
    case 429:
      return new RetriableError('Rate limited', 1000 * Math.random() * 10);  // Exponential backoff
    case 5xx:
      return new RetriableError('Service temporarily unavailable');
    default:
      return new PermanentError(`Unexpected status: ${status}`);
  }
}
```

**Webhook POST Request:**

```
POST {webhook_url}
Content-Type: application/json
Authorization: (none - webhook URL is the auth)

{
  "blocks": [...],
  "text": "Alert: Account Quarantine"  // Fallback plain text
}
```

### Workflows and Sequencing

**Event to Slack Alert Flow:**

```
1. ISB Event → EventBridge Rule → Lambda Invocation
2. Handler validates event.source = 'innovation-sandbox'
3. Handler parses event['detail-type']
   ├─ If 'LeaseRequested|LeaseApproved|...' → NotifySender.send() [Epic N-5]
   └─ If 'AccountQuarantined|AccountCleanupFailed|...' → SlackSender.send()
4. SlackSender.send(event):
   ├─ a) Retrieve webhook URL from Secrets Manager (cached)
   ├─ b) Build Block Kit message using alert type template
   ├─ c) POST to webhook URL with retry logic (max 3 attempts, exponential backoff)
   ├─ d) On success → Log, publish metrics, return
   ├─ e) On 429/5xx → RetriableError, EventBridge retries (up to 2 times per rule config)
   ├─ f) On 400/401 → DLQ, CloudWatch alarm, ops notified via Chatbot
   └─ g) DLQ message preserved for manual inspection + future auto-retry Lambda
5. CloudWatch Alarms monitor DLQ depth, Lambda errors, alert ops if issues
```

**Retry + DLQ Strategy:**

```
Attempt 1: Webhook POST
  ├─ Success → Return
  └─ 429/5xx → Wait 100ms + exponential backoff
Attempt 2: Retry with backoff
  ├─ Success → Return
  └─ 429/5xx → Wait 500ms
Attempt 3: Final retry
  ├─ Success → Return
  └─ Failure → CriticalError thrown
       ↓
EventBridge catches exception (max 2 retries)
  ├─ Success before retries exhausted → Return
  └─ All retries exhausted → DLQ
       ↓
DLQ Message: { original_event, error, attempt_count, timestamp }
       ↓
Alarm: DLQ depth > 0
  └─ AWS Chatbot → Slack #ndx-infra-alerts (separate from ops alerts)
```

---

## Non-Functional Requirements

### Performance

- **Alert Latency:** < 2 seconds from ISB event to Slack message (EventBridge + Lambda cold start + webhook latency)
- **Cold Start:** < 500ms (Node.js 20 + esbuild minification)
- **Webhook POST Latency:** < 1 second (Slack SLA, typically 100-200ms)
- **Throughput:** Support 100+ alerts/minute (burst), 1000/hour sustained (well below Slack webhook limits)
- **Concurrency:** Lambda reserved concurrency = 10 (shared with GOV.UK Notify from Epic N-5)

### Security

- **Webhook URL Protection:** Stored in Secrets Manager `/ndx/notifications/credentials`, never logged or exposed in error responses
- **No PII in Slack:** Messages use account IDs only; user emails redacted even in logs (Powertools logger auto-redacts email patterns)
- **Input Validation:** All incoming ISB events validated against Zod schemas before building Slack message
- **IAM Permissions:** Lambda role has `secretsmanager:GetSecretValue` for webhook only, no other secrets
- **Secrets Access Policy:** Resource policy restricts secret to notification Lambda only
- **Network Security:** All webhook POSTs over HTTPS (TLS 1.2+), certificate validation enforced
- **Auth:** Webhook URL is the auth mechanism (no bearer tokens to rotate, managed by Slack)

### Reliability/Availability

- **Message Durability:** Failed alerts go to DLQ (14-day retention), retrievable for manual replay or auto-retry
- **Idempotency:** Shared Powertools idempotency table (from Epic N-4) prevents duplicate Slack messages from EventBridge retries (TTL = 1 hour, key = event.id)
- **Graceful Degradation:** If Slack is unavailable, DLQ captures event, Chatbot alerts ops separately
- **Retry Strategy:** Exponential backoff (100ms → 500ms → circuit break) handles transient failures
- **Circuit Breaker:** After 5 failures in 1 minute, circuit opens, subsequent events go straight to DLQ (prevents thundering herd on Slack outage)
- **Monitoring:** CloudWatch alarms on DLQ depth, Lambda error rate, zero-invocation canary (24h) so ops never miss issues

### Observability

- **Structured Logging (Lambda Powertools):** Each Slack send logs:
  ```json
  {
    "timestamp": "2025-11-27T14:32:00.123Z",
    "level": "INFO",
    "service": "ndx-notifications",
    "message": "Slack alert sent",
    "eventId": "evt-abc-123",
    "eventType": "AccountQuarantined",
    "alertType": "critical",
    "accountId": "123456789012",
    "slackStatus": 200,
    "latencyMs": 145,
    "durationMs": 1250,
    "xrayTraceId": "1-abc-def"
  }
  ```
- **Custom Metrics (Powertools):** Published to CloudWatch:
  - `NotificationSuccess` (namespace: ndx-notifications, dimensions: channel=slack, alertType, priority)
  - `NotificationFailure` (namespace: ndx-notifications, dimensions: channel=slack, reason=rateLimit|auth|network)
  - `AlertLatency` (namespace: ndx-notifications, dimensions: channel=slack, dimensions: accountId) - histogram
- **CloudWatch Logs:** Encrypted at rest (KMS key managed by Epic N-4), 30-day retention, queryable by eventId/accountId/alertType
- **CloudWatch Alarms (5 total):**
  1. `ndx-notification-dlq-depth` - Trigger if > 0 messages for 5 min
  2. `ndx-notification-slack-errors` - Trigger if error rate > 5% in 5 min
  3. `ndx-notification-slack-ratelimit` - Trigger if 429 errors detected
  4. `ndx-notification-zero-invocations` - Canary: no Slack alerts in 24 hours (unusual)
  5. `ndx-notification-slack-critical-auth-failure` - Immediate alarm if 401/403 (webhook revoked)

---

## Dependencies and Integrations

### External Dependencies

```json
{
  "@aws-lambda-powertools/logger": "latest (pinned by package-lock)",
  "@aws-lambda-powertools/metrics": "latest",
  "@aws-lambda-powertools/idempotency": "latest",
  "aws-sdk": "v3 (aws-cdk-lib runtime)",
  "zod": "latest (shared with Epic N-5)",
  "node": "20.x LTS (runtime)"
}
```

### Internal Dependencies

- **Epic N-4 (Notification Infrastructure):** EventBridge rules, Lambda handler entry point, DLQ, Secrets Manager, CloudWatch alarms, IAM role + permissions
- **Epic N-5 (Email Notifications):** Handler validation logic, template registry pattern, error classification, enrichment patterns, DynamoDB read-only access
- **Shared Modules (from infra/lib/lambda/notification/):**
  - `errors.ts` - Error classification (RetriableError, PermanentError, CriticalError)
  - `types.ts` - Shared TypeScript types (ISBEventDetail, TemplateConfig, etc.)
  - `templates.ts` - Template registry (add Slack alert configs here)
  - `validation.ts` - Zod schemas (reuse from Epic N-5)

### AWS Service Integrations

| Service                    | Purpose                                                   | Access Pattern                                                        | Identity                |
| -------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------- |
| **Secrets Manager**        | Retrieve webhook URL at runtime                           | GetSecretValue on `/ndx/notifications/credentials`                    | Lambda IAM role         |
| **CloudWatch Logs**        | Structured logging (Powertools Logger)                    | PutLogEvents on `/aws/lambda/ndx-notification`                        | Lambda IAM role         |
| **CloudWatch Metrics**     | Custom metrics (NotificationSuccess, NotificationFailure) | PutMetricData (Powertools)                                            | Lambda IAM role         |
| **EventBridge**            | Event source (read-only)                                  | Rule trigger (no explicit API calls)                                  | EventBridge rule target |
| **SQS (DLQ)**              | Failed message storage                                    | SendMessage on `ndx-notification-dlq`                                 | Lambda execution env    |
| **DynamoDB (Idempotency)** | Prevent duplicate Slack sends                             | GetItem, PutItem, UpdateItem, DeleteItem on `NdxIdempotency`          | Lambda IAM role         |
| **DynamoDB (ISB)**         | Enrich events with context (if needed)                    | GetItem, Query on LeaseTable, SandboxAccountTable, LeaseTemplateTable | Lambda IAM role         |
| **Slack Incoming Webhook** | POST alerts                                               | HTTPS POST to webhook URL                                             | Webhook URL as auth     |

### CloudFormation Imports

Epic N-4 CDK creates and exports these values; Epic N-6 Lambda uses them:

```typescript
// notification-stack.ts (in Epic N-4)
new CfnOutput(this, "IdempotencyTableName", {
  value: idempotencyTable.tableName,
  exportName: "ndx-idempotency-table",
})

new CfnOutput(this, "DLQUrl", {
  value: dlq.queueUrl,
  exportName: "ndx-notification-dlq-url",
})

// Lambda environment references these
process.env.IDEMPOTENCY_TABLE_NAME = Fn.importValue("ndx-idempotency-table")
```

---

## Acceptance Criteria (Authoritative)

### Story 6.1: Slack Webhook Integration

**AC 1.1:** Given a Slack alert needs to be sent, when SlackSender.send() is called with valid params, then it POSTs to the webhook URL from Secrets Manager with Content-Type: application/json

**AC 1.2:** Given a webhook returns 429 (rate limited), when retry logic executes, then it waits 100ms, 500ms, 1000ms (exponential backoff) and retries up to 3 times

**AC 1.3:** Given all 3 retries exhausted, when the error is classified, then it throws RetriableError, which EventBridge catches and routes to DLQ after max retries exhausted

**AC 1.4:** Given a webhook returns 401 (revoked), when error is classified, then it throws CriticalError, which is logged at ERROR level with red flag, and DLQ receives message immediately

**AC 1.5:** Given network timeout occurs (socket error), when retry logic executes, then it retries with exponential backoff (same as rate limiting)

**AC 1.6:** Given webhook POST succeeds (HTTP 200), when handler returns, then it logs at INFO level with latency metrics and publishes NotificationSuccess metric

**AC 1.7:** Given webhook URL is stored in Secrets Manager, when handler executes, then URL is never logged in plain text (Powertools auto-redacts secrets matching pattern)

**AC 1.8:** Given header Content-Type must be application/json, when webhook receives the request, then it can parse JSON body without error

### Story 6.2: Slack Block Kit Message Templates

**AC 2.1:** Given an account quarantine alert event, when block builder processes it, then it creates Block Kit JSON with header block, section fields, and context block

**AC 2.2:** Given alert priority = 'critical', when block builder adds color, then it uses 🔴 red attachment color and includes alert title in header

**AC 2.3:** Given alert priority = 'normal', when block builder adds color, then it uses 🟡 yellow (or neutral gray) for warnings

**AC 2.4:** Given critical alerts require action, when block builder constructs sections, then it includes 2+ action links (AWS Console, ISB Admin)

**AC 2.5:** Given timestamp and event ID must be present, when context block is built, then it includes 'Event ID: {id} | Slack Alert v1'

**AC 2.6:** Given fallback plain text, when webhook receives JSON, then it includes 'text' field describing alert (for display in notification history)

**AC 2.7:** Given Block Kit structure validity, when JSON is serialized, then it matches Slack Block Kit schema and passes validation

### Story 6.3: Account Quarantine Alert

**AC 3.1:** Given an AccountQuarantinedEvent is received, when handler processes it, then SlackSender builds message with header "🔴 Account Quarantine Alert"

**AC 3.2:** Given quarantine reason from event, when message is built, then reason is included in section field (e.g., "Policy violation detected")

**AC 3.3:** Given AWS account ID from event, when message is built, then it appears as bold field "_AWS Account:_ 123456789012"

**AC 3.4:** Given timestamp, when context block is added, then it includes current UTC time (from event.time or handler.now())

**AC 3.5:** Given escalation guidance, when message is built, then it includes link to ISB admin console and contact guidance (e.g., "@ndx-ops for escalation")

**AC 3.6:** Given critical priority, when block builder adds mention, then message may include @channel or @here mention (configurable via template)

**AC 3.7:** Given alert latency requirement, when event is received to Slack posted, then latency is < 2 seconds end-to-end

### Story 6.4: Account Frozen Alert

**AC 4.1:** Given a LeaseFrozenEvent is received, when handler processes it, then SlackSender builds message with header "🟡 Account Frozen Alert"

**AC 4.2:** Given freeze reason discriminated union (Expired/BudgetExceeded/ManuallyFrozen), when message is built, then reason type is displayed in plain English (e.g., "Budget Exceeded - $475.50 / $500.00")

**AC 4.3:** Given account ID from event, when message is built, then it appears in section (no user email in Slack, account ID only)

**AC 4.4:** Given budget-related freeze, when reason.type = 'BudgetExceeded', then message includes "Current spend: $475.50, Budget limit: $500.00, % Used: 95%"

**AC 4.5:** Given duration-related freeze, when reason.type = 'Expired', then message includes "Duration threshold exceeded: X hours lease expired"

**AC 4.6:** Given manual freeze, when reason.type = 'ManuallyFrozen', then message includes comment from admin (if provided): "Frozen: {reason.comment}"

**AC 4.7:** Given dual-channel event (user gets Notify + ops gets Slack), when handler routes, then both senders are called and both succeed or both fail together

### Story 6.5: Account Cleanup Failure Alert

**AC 5.1:** Given an AccountCleanupFailedEvent is received, when handler processes it, then SlackSender builds message with header "🔴 Account Cleanup Failure Alert"

**AC 5.2:** Given cleanup state machine execution context, when message is built, then it includes link to Step Functions execution: "<arn:aws:states:...|View Execution>"

**AC 5.3:** Given execution start time, when message is built, then it includes timestamp (e.g., "Started: 2025-11-27 13:00 UTC")

**AC 5.4:** Given critical priority (cleanup failure = ops intervention needed), when message is built, then it includes manual remediation steps link or runbook

**AC 5.5:** Given account ID, when message is built, then it appears clearly so ops can identify affected account

**AC 5.6:** This is ops-only alert, when message is routed, then it does NOT go to GOV.UK Notify (only Slack)

### Story 6.6: Account Drift Detection Alert

**AC 6.1:** Given an AccountDriftDetectedEvent is received, when handler processes it, then SlackSender builds message with header "🔴 Account Drift Detection Alert"

**AC 6.2:** Given expected OU vs actual OU, when message is built, then it displays: "_Expected OU:_ Active | _Actual OU:_ CleanUp"

**AC 6.3:** Given account ID, when message is built, then it appears clearly for ops to identify drift

**AC 6.4:** Given drift is security-relevant, when message is built, then priority = 'critical' and uses 🔴 red color

**AC 6.5:** Given investigation guidance, when message is built, then it includes link to AWS Organizations console to check account placement

**AC 6.6:** Given OU values from enum (Available, Active, CleanUp, Quarantine, Frozen, Entry, Exit), when message is built, then values are explained in plain English (e.g., "CleanUp = Account marked for deprovisioning")

### Cross-Epic Acceptance Criteria

**AC-CROSS-1:** Given all 4 Slack alert types, when template registry is configured, then required fields are documented in code (TemplateConfig.requiredFields)

**AC-CROSS-2:** Given pre-mortem finding "never expose webhook in errors", when exception is caught, then error message uses generic text "Slack webhook error" without revealing URL or path

**AC-CROSS-3:** Given pre-mortem finding "daily DLQ digest" (story 6-7), when DLQ contains messages from 24-48 hours ago, then separate Lambda monitors and posts summary

**AC-CROSS-4:** Given stakeholder mapping finding "runbook links" (story 6-8), when Slack message is built, then it includes 1-2 quick-action links (AWS Console, Runbook, ISB Admin)

---

## Traceability Mapping

| AC         | Spec Section             | Component(s)                         | Test Idea                                                                                  |
| ---------- | ------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| AC 1.1     | APIs and Interfaces      | SlackSender                          | Unit test: Mock fetch, verify POST with correct URL and headers                            |
| AC 1.2     | Workflows and Sequencing | Error Classifier, RetryLogic         | Unit test: Simulate 429, verify exponential backoff delays                                 |
| AC 1.3     | Workflows and Sequencing | EventBridge DLQ                      | Integration test: Send event that fails 3 times, verify DLQ receives it                    |
| AC 1.4     | Error Handling (NFR)     | CriticalError                        | Unit test: Simulate 401, verify throws CriticalError, logged at ERROR                      |
| AC 1.5     | Workflows and Sequencing | Network Retry                        | Unit test: Mock socket error, verify retries with backoff                                  |
| AC 1.6     | Observability (NFR)      | CloudWatch Logs, Metrics             | Unit test: Successful send, verify INFO log and NotificationSuccess metric                 |
| AC 1.7     | Security (NFR)           | Powertools Logger                    | Unit test: Log entry contains webhook URL, verify it's redacted                            |
| AC 1.8     | APIs and Interfaces      | Webhook POST                         | Integration test: Verify webhook receives valid JSON                                       |
| AC 2.1     | Data Models              | Block Kit Builder                    | Unit test: Generate message, verify blocks structure matches Block Kit schema              |
| AC 2.2     | Data Models              | Block Kit Builder (critical)         | Unit test: priority=critical, verify 🔴 color in attachment                                |
| AC 2.3     | Data Models              | Block Kit Builder (normal)           | Unit test: priority=normal, verify yellow color in attachment                              |
| AC 2.4     | Data Models              | Block Kit Builder                    | Unit test: Critical alert has >= 2 action links                                            |
| AC 2.5     | Data Models              | Context Block                        | Unit test: Verify context block includes eventId and version                               |
| AC 2.6     | Data Models              | Fallback Text                        | Unit test: JSON includes 'text' field with alert summary                                   |
| AC 2.7     | Data Models              | Block Kit Validation                 | Integration test: Send message to Slack test endpoint, verify acceptance                   |
| AC 3.1-3.7 | Account Quarantine Story | SlackSender, BlockKit                | E2E test: Simulate AccountQuarantined event, verify Slack message format and latency       |
| AC 4.1-4.7 | Account Frozen Story     | SlackSender, BlockKit (dual-channel) | E2E test: Simulate LeaseFrozen event with budget reason, verify both Notify and Slack sent |
| AC 5.1-5.6 | Account Cleanup Story    | SlackSender, BlockKit                | E2E test: Simulate AccountCleanupFailed event, verify message includes execution link      |
| AC 6.1-6.6 | Account Drift Story      | SlackSender, BlockKit                | E2E test: Simulate AccountDriftDetected event, verify message explains OU mismatch         |
| AC-CROSS-1 | Templates.ts             | Template Registry                    | Unit test: Template registry for all 4 types, verify requiredFields defined                |
| AC-CROSS-2 | Error Handling           | Exception Messages                   | Unit test: Webhook error thrown, verify message doesn't contain URL                        |
| AC-CROSS-3 | Daily DLQ Story 6-7      | Separate monitoring Lambda           | Design doc (not implemented in N-6, deferred to post-MVP)                                  |
| AC-CROSS-4 | Runbook Links Story 6-8  | Block Kit Builder                    | Unit test: Message includes runbook link for alert type                                    |

---

## Risks, Assumptions, Open Questions

### Risks

1. **Risk: Slack Webhook Revocation/Expiry**
   - **Probability:** Medium (webhook can be manually revoked by Slack workspace admin)
   - **Impact:** High (ops stops receiving alerts)
   - **Mitigation:** CloudWatch alarm on 401/403 errors; ops notified via separate Chatbot path
   - **Assumption:** Webhook URL stable for MVP; rotation process TBD for Growth phase

2. **Risk: Slack Rate Limiting (HTTP 429)**
   - **Probability:** High (Slack enforces rate limits: ~1 msg/sec per webhook)
   - **Impact:** Medium (transient failures go to DLQ, recovered via retry)
   - **Mitigation:** Exponential backoff (100ms, 500ms, 1000ms); circuit breaker after 5 failures/min
   - **Assumption:** Alert volume < Slack limits (~10-50 alerts/hour typical); burst handled by DLQ

3. **Risk: DynamoDB Enrichment Lag**
   - **Probability:** Low (ISB tables in same account, low latency)
   - **Impact:** Low (enrichment is optional for Slack, not required like email)
   - **Mitigation:** Skip enrichment for Slack alerts; accept account ID only (no user context needed)
   - **Assumption:** Account ID from event is always present and correct

4. **Risk: Event Schema Changes from ISB**
   - **Probability:** Medium (ISB evolving system)
   - **Impact:** Medium (schema validation fails, event goes to DLQ)
   - **Mitigation:** Zod validation with clear error messages; DLQ preserved for inspection/replay
   - **Assumption:** ISB team provides advance notice of schema changes; version field in Event

5. **Risk: Unauthorized Event Injection**
   - **Probability:** Low (EventBridge in same account, IAM controls who can publish)
   - **Impact:** Critical (attacker could send fake alerts to ops)
   - **Mitigation:** Strict event.source validation ('innovation-sandbox' only); security logging
   - **Assumption:** No cross-account EventBridge publishing; internal threats only

### Pre-mortem Analysis Findings (2025-11-28)

The following failure scenarios were identified through pre-mortem analysis elicitation:

#### Failure Scenario 1: Silent Webhook Failure

**Scenario:** Slack rotates the webhook or workspace admin revokes it. Lambda returns 401/403 but CloudWatch alarm hasn't fired yet. Ops has no idea alerts aren't arriving.

**Contributing Factors:**

- No proactive health check - we only know webhook is dead when a real alert fails
- CloudWatch alarm delay (5-minute evaluation period)
- No backup notification path

**Warning Signs:**

- Sudden drop in `SlackMessagesSent` metric to zero
- Increase in `WebhookAuthError` count

**Preventive Measures:**

- **AC-NEW-1:** Daily synthetic "heartbeat" test message to verify webhook health
- **AC-NEW-2:** Secondary alerting path (email or PagerDuty) for webhook failures
- **AC-NEW-3:** Runbook for webhook rotation with Secrets Manager update procedure

#### Failure Scenario 2: Alert Fatigue Tsunami

**Scenario:** ISB batch job triggers 50 cleanup failures in 10 minutes. Ops gets 50 nearly identical Slack messages. Team mutes channel. Real critical alert next day is ignored.

**Contributing Factors:**

- No aggregation for repeated events
- All alerts in single channel regardless of severity
- No rate limiting on outbound messages

**Warning Signs:**

- Burst of > 10 alerts within 5 minutes
- Ops feedback about "too many alerts"

**Preventive Measures:**

- **AC-NEW-4:** Aggregate repeated alerts for same account within 5-minute window
- **AC-NEW-5:** Separate Slack channels for critical vs informational alerts
- **AC-NEW-6:** Circuit breaker: switch to digest mode after 10 alerts/minute

#### Failure Scenario 3: Drift Detection False Positive

**Scenario:** Ops investigates "Account Drift" alert only to find it was triggered by planned maintenance. 30 minutes wasted. Team starts ignoring drift alerts.

**Contributing Factors:**

- No context about recent admin actions
- No maintenance window awareness
- No feedback loop to mark false positives

**Warning Signs:**

- Drift alerts during scheduled maintenance windows
- Ops manually marking alerts as "not actionable"

**Preventive Measures:**

- **AC-NEW-7:** Include "last admin action" context in drift alerts
- **AC-NEW-8:** Maintenance window awareness (suppress or tag alerts during windows)
- **AC-NEW-9:** Ops can mark alerts as false positive (feedback to improve rules)

#### Failure Scenario 4: Enrichment Timeout Cascade

**Scenario:** DynamoDB throttling causes enrichment to timeout. Lambda retries 3x, exhausts timeout. Alert never sent. Ops unaware of real issue.

**Contributing Factors:**

- Enrichment blocking critical path
- No partial-data fallback
- Timeout budget consumed by retries

**Warning Signs:**

- Increase in Lambda timeout errors
- Enrichment latency > 500ms (p95)

**Preventive Measures:**

- **AC-NEW-10:** Enrichment is best-effort: send alert with partial data rather than fail
- **AC-NEW-11:** Separate enrichment timeout (5s max) vs Lambda timeout (30s)
- **AC-NEW-12:** CloudWatch alarm on enrichment failure rate > 5%

#### Failure Scenario 5: Runbook Not Found

**Scenario:** Alert includes link to runbook that doesn't exist or is outdated. Ops clicks link, gets 404 or stale instructions. Real incident escalates while searching for correct docs.

**Contributing Factors:**

- Runbook links hardcoded, not validated
- Documentation drift after system changes
- No testing of runbook links in CI

**Warning Signs:**

- Runbook link returns 404
- Ops feedback about outdated instructions

**Preventive Measures:**

- **AC-NEW-13:** Pre-deployment validation of runbook link availability
- **AC-NEW-14:** Critical alerts include escalation path (who to call if runbook fails)
- **AC-NEW-15:** Quarterly runbook review cadence documented

### New Acceptance Criteria from Pre-mortem

| ID        | Category      | Description                                                 | Story            |
| --------- | ------------- | ----------------------------------------------------------- | ---------------- |
| AC-NEW-1  | Reliability   | Daily synthetic heartbeat alert to verify webhook           | n6-1             |
| AC-NEW-2  | Reliability   | Backup alerting path (email/PagerDuty) for webhook failures | n6-1             |
| AC-NEW-3  | Operations    | Runbook for webhook rotation with Secrets Manager update    | n6-8             |
| AC-NEW-4  | Alert Quality | Aggregate repeated alerts for same account (5-min window)   | n6-7             |
| AC-NEW-5  | Alert Quality | Separate channels for critical vs informational alerts      | Future           |
| AC-NEW-6  | Rate Limiting | Circuit breaker: digest mode after 10 alerts/min            | n6-2             |
| AC-NEW-7  | Context       | Include "last admin action" in drift alerts                 | n6-6             |
| AC-NEW-8  | Context       | Maintenance window awareness for alert suppression          | Future           |
| AC-NEW-9  | Feedback      | Ops can mark alerts as false positive                       | Future           |
| AC-NEW-10 | Resilience    | Enrichment best-effort (send with partial data)             | n6-2             |
| AC-NEW-11 | Resilience    | Separate enrichment timeout (5s cap)                        | n6-2             |
| AC-NEW-12 | Observability | Alarm on enrichment failure rate > 5%                       | n6-2             |
| AC-NEW-13 | Operations    | Runbook links validated before deployment                   | n6-8             |
| AC-NEW-14 | Escalation    | Critical alerts include escalation path                     | n6-3, n6-5, n6-6 |
| AC-NEW-15 | Training      | On-call drill requirement for quarantine response           | n6-3             |

### Edge Case Discovery Findings (2025-11-28)

Systematic identification of boundary conditions, error states, and exceptional scenarios.

#### Interface: Slack Webhook HTTP

| Edge Case | Scenario                                        | Gap Identified                     |
| --------- | ----------------------------------------------- | ---------------------------------- |
| EC-1.1    | Webhook URL is empty string in Secrets Manager  | Need validation before send        |
| EC-1.2    | Webhook returns HTTP 500 (Slack internal error) | Need explicit error classification |
| EC-1.3    | Webhook returns HTTP 301/302 redirect           | May expose URL in redirect logs    |
| EC-1.4    | Connection timeout (Slack unreachable)          | Need separate connect timeout      |
| EC-1.5    | Response body is not JSON                       | Need graceful parse handling       |
| EC-1.6    | Webhook returns 200 but `{"ok": false}`         | Need response validation           |

#### Interface: Block Kit Message Formatting

| Edge Case | Scenario                                   | Gap Identified               |
| --------- | ------------------------------------------ | ---------------------------- |
| EC-2.1    | Account ID contains special characters     | Potential mrkdwn injection   |
| EC-2.2    | Reason text exceeds Slack 3000 char limit  | Need truncation logic        |
| EC-2.3    | Runbook URL contains query params with `&` | May break mrkdwn link syntax |
| EC-2.4    | Timestamp is invalid/unparseable           | Need fallback formatting     |
| EC-2.5    | Event has no `reason` field (optional)     | Need placeholder text        |

#### Interface: Event Routing & Dual-Channel

| Edge Case | Scenario                                  | Gap Identified                            |
| --------- | ----------------------------------------- | ----------------------------------------- |
| EC-3.2    | Same event arrives twice within 1 second  | Verify Slack has separate idempotency key |
| EC-3.3    | LeaseFrozen: Slack fails, Notify succeeds | Need independent channel handling         |

#### Interface: Secrets Manager

| Edge Case | Scenario                                  | Gap Identified                   |
| --------- | ----------------------------------------- | -------------------------------- |
| EC-4.1    | Secret doesn't exist (deleted)            | Need graceful error message      |
| EC-4.2    | Secret exists but value is malformed JSON | Need validation before use       |
| EC-4.4    | Secret rotation in progress               | Need explicit AWSCURRENT version |

### New Acceptance Criteria from Edge Case Discovery

| ID       | Category       | Description                                                       | Severity | Story |
| -------- | -------------- | ----------------------------------------------------------------- | -------- | ----- |
| EC-AC-1  | Validation     | Validate webhook URL is non-empty before first send               | High     | n6-1  |
| EC-AC-2  | Error Handling | HTTP 500 from Slack = RetriableError (not permanent)              | Medium   | n6-2  |
| EC-AC-3  | Security       | Disable HTTP redirects on webhook fetch (prevent URL leak)        | High     | n6-1  |
| EC-AC-4  | Resilience     | Separate connect timeout (5s) from response timeout (10s)         | Medium   | n6-2  |
| EC-AC-5  | Validation     | Verify response `{"ok": true}` before marking success             | High     | n6-1  |
| EC-AC-6  | Security       | Escape special chars in account ID for mrkdwn                     | Medium   | n6-2  |
| EC-AC-7  | Formatting     | Truncate reason text to 2500 chars with "..." indicator           | Low      | n6-2  |
| EC-AC-8  | Formatting     | URL-encode runbook links in Block Kit                             | Medium   | n6-8  |
| EC-AC-9  | Formatting     | Use "N/A" placeholder when optional fields missing                | Low      | n6-2  |
| EC-AC-10 | Idempotency    | Slack idempotency key: `ndx-slack:{eventId}` (separate namespace) | High     | n6-2  |
| EC-AC-11 | Dual-Channel   | LeaseFrozen: if one channel fails, other still attempts           | Medium   | n6-4  |
| EC-AC-12 | Secrets        | Explicitly request AWSCURRENT version from Secrets Manager        | Low      | n6-1  |

### User Journey Walking Findings (2025-11-28)

Step-by-step workflow analysis from the ops team perspective.

#### Journey 1: Responding to Account Quarantine Alert

| Step | Action                                      | Gap Identified                   |
| ---- | ------------------------------------------- | -------------------------------- |
| 4    | Ops clicks "View in AWS Console" link       | Link may require SSO login first |
| 6    | Ops wants to mark alert as handled          | No resolution tracking           |
| 7    | Ops wants to know if user was also notified | No cross-channel visibility      |

#### Journey 2: Investigating Cleanup Failure Alert

| Step | Action                                              | Gap Identified           |
| ---- | --------------------------------------------------- | ------------------------ |
| 5    | Ops needs to retry cleanup manually                 | No retry action in alert |
| 6    | Ops wants to see previous failures for same account | No historical context    |

#### Journey 3: Handling Alert Burst During Incident

| Step | Action                                        | Gap Identified                      |
| ---- | --------------------------------------------- | ----------------------------------- |
| 2-3  | 20 similar events flood channel               | No aggregation (AC-NEW-4 addresses) |
| 4    | Ops tries to understand scope                 | No incident grouping                |
| 5    | Ops mutes channel, misses next critical alert | Critical alerts buried              |

#### Journey 4: Webhook Rotation

| Step | Action                                    | Gap Identified              |
| ---- | ----------------------------------------- | --------------------------- |
| 3    | Ops Admin needs to update Secrets Manager | No documented procedure     |
| 4    | Updates secret, when does Lambda pick up? | Cache behavior undocumented |
| 5    | Wants to verify new webhook works         | No test mechanism           |

#### Journey 5: Daily DLQ Review

| Step | Action                             | Gap Identified            |
| ---- | ---------------------------------- | ------------------------- |
| 3    | Ops clicks to view DLQ details     | No direct link to DLQ     |
| 4-5  | Ops wants to replay/delete message | Multi-step manual process |

### New Acceptance Criteria from User Journey Walking

| ID      | Journey | Description                                                       | Priority | Story  |
| ------- | ------- | ----------------------------------------------------------------- | -------- | ------ |
| UJ-AC-1 | J1      | Console links include "(SSO login may be required)" note          | Low      | n6-3   |
| UJ-AC-2 | J1      | Dual-channel alerts include "User notified via email" indicator   | Medium   | n6-4   |
| UJ-AC-3 | J3      | Burst detection: summary message after 5+ similar alerts in 5 min | Medium   | n6-7   |
| UJ-AC-4 | J3      | Critical alerts use @here mention to break through mute           | Low      | Future |
| UJ-AC-5 | J4      | Document Lambda secret cache behavior (TTL, refresh)              | Medium   | n6-1   |
| UJ-AC-6 | J4      | Provide CLI command or test endpoint to verify webhook            | Low      | n6-8   |
| UJ-AC-7 | J5      | DLQ digest includes direct link to SQS queue in Console           | Medium   | n6-7   |
| UJ-AC-8 | J5      | DLQ digest shows preview of top 3 error types                     | Low      | n6-7   |

### Stakeholder Mapping Findings (2025-11-28)

Analysis of stakeholder-specific requirements and concerns.

#### Stakeholder: Operations Team (Primary User)

| Requirement                       | Status       | Gap                                       |
| --------------------------------- | ------------ | ----------------------------------------- |
| Real-time critical alerts         | ✅ Addressed | -                                         |
| Clear severity indicators         | ✅ Addressed | -                                         |
| Action links (Console, ISB Admin) | ✅ Addressed | -                                         |
| Acknowledge/resolve workflow      | ❌ Gap       | Thread-based resolution tracking (Future) |
| Shift handoff context             | ❌ Gap       | Daily summary of open incidents (Future)  |

#### Stakeholder: ISB Development Team (Event Producer)

| Requirement                  | Status       | Gap                                  |
| ---------------------------- | ------------ | ------------------------------------ |
| Documented event schemas     | ✅ Addressed | -                                    |
| Schema versioning support    | ✅ Addressed | -                                    |
| Test events for development  | ❌ Gap       | Test event type bypasses prod alerts |
| Breaking change notification | ⚠️ Partial   | Alert on schema validation failures  |

#### Stakeholder: Security & Compliance

| Requirement                | Status       | Gap                                 |
| -------------------------- | ------------ | ----------------------------------- |
| No PII in Slack messages   | ✅ Addressed | -                                   |
| Webhook URL never logged   | ✅ Addressed | -                                   |
| Audit trail for all alerts | ⚠️ Partial   | Structured audit log needed         |
| Incident correlation ID    | ⚠️ Partial   | Correlation ID linking all channels |
| Retention compliance       | ❌ Gap       | Document Slack retention policy     |

#### Stakeholder: Platform/SRE Team

| Requirement                | Status       | Gap                                |
| -------------------------- | ------------ | ---------------------------------- |
| CloudWatch metrics         | ✅ Addressed | -                                  |
| CloudWatch alarms          | ✅ Addressed | -                                  |
| X-Ray tracing              | ❌ Gap       | Enable for end-to-end tracing      |
| Cost visibility            | ❌ Gap       | Add cost allocation tags           |
| Capacity limits documented | ⚠️ Partial   | Document Lambda concurrency limits |

#### Stakeholder: Management/Leadership

| Requirement             | Status | Gap                           |
| ----------------------- | ------ | ----------------------------- |
| Weekly incident summary | ❌ Gap | Future phase                  |
| Trend analysis          | ❌ Gap | CloudWatch dashboard (Future) |
| SLA tracking            | ❌ Gap | Track alert delivery latency  |

### New Acceptance Criteria from Stakeholder Mapping

| ID       | Stakeholder | Description                                                       | Priority | Story  |
| -------- | ----------- | ----------------------------------------------------------------- | -------- | ------ |
| SM-AC-1  | Ops         | Thread-based resolution tracking (reply to mark resolved)         | Low      | Future |
| SM-AC-2  | Ops         | Daily summary of open/unresolved incidents                        | Low      | Future |
| SM-AC-3  | ISB Dev     | Test event type (`source: innovation-sandbox-test`) bypasses prod | Medium   | n6-2   |
| SM-AC-4  | ISB Dev     | Alert on schema validation failure rate > 10%                     | Medium   | n6-2   |
| SM-AC-5  | Security    | Structured audit log entry for each alert sent                    | Medium   | n6-2   |
| SM-AC-6  | Security    | Correlation ID in logs links Slack, email, and DLQ entries        | High     | n6-2   |
| SM-AC-7  | Security    | Document Slack workspace message retention policy                 | Low      | n6-8   |
| SM-AC-8  | Platform    | Enable X-Ray tracing for notification Lambda                      | Medium   | n6-1   |
| SM-AC-9  | Platform    | Add cost allocation tags to Lambda resources                      | Low      | n6-1   |
| SM-AC-10 | Platform    | Document Lambda concurrency limits and scaling behavior           | Medium   | n6-1   |
| SM-AC-11 | Mgmt        | CloudWatch dashboard for weekly alert volume trends               | Low      | Future |
| SM-AC-12 | Mgmt        | Track and log alert delivery latency (event time → Slack post)    | Medium   | n6-2   |

### Constraint Analysis Findings (2025-11-28)

Systematic identification of technical, business, and operational constraints.

#### Technical Constraints

| ID   | Constraint                   | Limit               | Mitigation                |
| ---- | ---------------------------- | ------------------- | ------------------------- |
| TC-1 | Slack webhook rate limit     | ~1 msg/sec          | Exponential backoff + DLQ |
| TC-2 | Slack message size limit     | 40KB                | Truncation                |
| TC-3 | Slack Block Kit blocks limit | 50 blocks max       | Keep under 10 blocks      |
| TC-4 | Lambda timeout               | 30s configured      | Separate timeouts         |
| TC-5 | Lambda memory                | 256MB configured    | Increase to 512MB         |
| TC-6 | Lambda concurrency           | 1000 default/region | Reserved concurrency      |
| TC-9 | EventBridge delivery         | At-least-once       | Idempotency required      |

#### Business Constraints

| ID   | Constraint            | Requirement       | Status                  |
| ---- | --------------------- | ----------------- | ----------------------- |
| BC-1 | No PII in Slack       | GDPR/compliance   | ✅ Addressed            |
| BC-2 | Audit trail required  | Compliance        | ✅ Structured logging   |
| BC-3 | Webhook URL is secret | Security policy   | ✅ Never in logs        |
| BC-5 | MVP timeline          | Sprint deadline   | Core 4 alert types only |
| BC-6 | GDS service standard  | UK Gov compliance | Block Kit accessibility |

#### Integration Constraints

| ID   | Constraint                    | Dependency                | Status                  |
| ---- | ----------------------------- | ------------------------- | ----------------------- |
| IC-1 | N-4 must be deployed first    | EventBridge, DLQ, Lambda  | ✅ Complete             |
| IC-2 | N-5 patterns available        | Error classes, validation | ✅ Complete             |
| IC-3 | ISB event schema stability    | Event format              | Zod + DLQ preservation  |
| IC-4 | Slack workspace access        | Webhook URL               | Mock dev, real staging  |
| IC-5 | Secrets Manager secret exists | Pre-provisioned           | CDK creates placeholder |

#### Operational Constraints

| ID   | Constraint           | Reality         | Mitigation                  |
| ---- | -------------------- | --------------- | --------------------------- |
| OC-1 | Small ops team       | <10 people      | Aggregation, severity tiers |
| OC-2 | No 24/7 on-call      | Business hours  | Action timeline in alerts   |
| OC-3 | Single Slack channel | #ndx-ops-alerts | No separation (MVP)         |
| OC-4 | Manual DLQ replay    | No automation   | Daily digest (n6-7)         |

### New Acceptance Criteria from Constraint Analysis

| ID      | Category    | Description                                                       | Priority | Story |
| ------- | ----------- | ----------------------------------------------------------------- | -------- | ----- |
| TC-AC-1 | Technical   | Block Kit messages use ≤10 blocks (well under 50-block limit)     | Medium   | n6-2  |
| TC-AC-2 | Technical   | Lambda memory set to 512MB for enrichment headroom                | Low      | n6-1  |
| TC-AC-3 | Technical   | Reserved concurrency of 10 for notification Lambda                | Medium   | n6-1  |
| BC-AC-1 | Business    | Lambda cost estimate documented (<$5/month expected)              | Low      | n6-1  |
| BC-AC-2 | Business    | Block Kit messages tested for screen reader compatibility         | Medium   | n6-2  |
| IC-AC-1 | Integration | CDK creates Secrets Manager secret with placeholder if not exists | High     | n6-1  |
| IC-AC-2 | Integration | Staging environment uses separate Slack webhook (test channel)    | Medium   | n6-1  |
| IC-AC-3 | Integration | ISB team notified 1 sprint before N-6 deployment                  | Medium   | n6-1  |
| OC-AC-1 | Operational | After-hours critical alerts include action timeline               | Low      | n6-3  |
| OC-AC-2 | Operational | Weekend/holiday alerts tagged with next-action expectation        | Low      | n6-2  |

### Assumptions

1. **Webhook URL Stability:** Slack webhook URL doesn't change frequently; MVP doesn't auto-rotate
2. **Alert Volume:** 10-100 alerts/day typical; < 1000/day peak (well below Slack limits)
3. **Ops Team Size:** Small team (< 10 people); one Slack channel #ndx-ops-alerts is sufficient
4. **Account ID Completeness:** All ISB events include account ID; no missing fields require enrichment
5. **ISB Event Format:** Events conform to documented schemas; no undocumented fields
6. **Slack Workspace Configuration:** Webhook URL created by ops admin; permissions already configured

### Open Questions

1. **Q: Should Slack alerts include user context (email anonymized)?**
   - **Current A:** No - ops only needs account ID + reason; user info goes to GOV.UK Notify
   - **Revisit:** If ops feedback suggests context needed, add optional enrichment in Growth phase

2. **Q: Should account cleanup failure alert auto-suggest remediation steps?**
   - **Current A:** Include link to runbook (story 6-8); ops follows instructions
   - **Revisit:** Future: AI-generated suggestions based on failure type (Growth phase)

3. **Q: How often should daily DLQ digest be sent (story 6-7)?**
   - **Current A:** Once daily at 9am UTC (configurable); deferred to post-MVP
   - **Revisit:** Stakeholder alignment on timing needed before implementation

4. **Q: Should ops be able to snooze/mute specific alert types?**
   - **Current A:** Out of scope (MVP sends all alerts); implemented in Growth via Slack preferences
   - **Revisit:** After ops uses system for 2 weeks, gather feedback on noise

5. **Q: Is one Slack webhook sufficient, or separate webhook per alert type?**
   - **Current A:** Single webhook to #ndx-ops-alerts; all alerts in one channel
   - **Revisit:** If ops prefers alerts separated by severity/type, add channel routing (Growth)

---

## Test Strategy Summary

### Unit Tests (Stack: Jest, mocked AWS SDK)

**File:** `infra/test/unit/slack-sender.test.ts`

```typescript
describe('SlackSender', () => {
  describe('send()', () => {
    test('POSTs to webhook URL with valid Block Kit JSON', () => {
      const sender = new SlackSender(webhookUrl);
      await sender.send({
        alertType: 'AccountQuarantined',
        accountId: '123456789012',
        priority: 'critical',
        details: { reason: 'Policy violation' }
      });
      // Verify: fetch called with correct URL and headers
    });

    test('retries on 429 with exponential backoff', async () => {
      mockFetch.mockRejectedValueOnce(new Response(null, { status: 429 }));
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));
      // Verify: retry delay progression 100ms → 500ms
    });

    test('throws CriticalError on 401', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
      expect(() => sender.send(...)).rejects.toThrow(CriticalError);
    });

    test('throws PermanentError on 400', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 400 }));
      expect(() => sender.send(...)).rejects.toThrow(PermanentError);
    });

    test('never logs webhook URL', async () => {
      // Simulate send
      expect(logger.info.mock.calls).not.toContain(webhookUrl);
    });
  });

  describe('buildBlockKit()', () => {
    test('builds valid Block Kit for AccountQuarantined', () => {
      const blocks = sender.buildBlockKit('AccountQuarantined', { accountId: '123', reason: 'Policy' });
      expect(blocks[0].type).toBe('header');
      expect(blocks[1].type).toBe('section');
      expect(blocks[2].type).toBe('context');
    });

    test('uses critical color (red) for high-priority alerts', () => {
      const blocks = sender.buildBlockKit('AccountQuarantined', { accountId: '123' });
      expect(blocks.attachments[0].color).toBe('#EE0000'); // Red
    });

    test('includes action links in section', () => {
      const blocks = sender.buildBlockKit('AccountQuarantined', { accountId: '123' });
      const linkText = blocks[2].text.text;
      expect(linkText).toContain('AWS Console');
      expect(linkText).toContain('ISB Admin');
    });
  });
});
```

### Integration Tests (Stack: Jest + AWS SDK mock)

**File:** `infra/test/integration/slack-sender.test.ts`

```typescript
describe('Slack Sender Integration', () => {
  test('Handler routes LeaseFrozen to both NotifySender and SlackSender', async () => {
    const event = buildEventBridgeEvent('LeaseFrozen', {
      leaseId: { userEmail: 'user@gov.uk', uuid: 'a1b2c3d4' },
      accountId: '123456789012',
      reason: { type: 'BudgetExceeded', totalSpend: 475.50 }
    });

    const result = await handler(event);

    // Verify: Both senders called
    expect(notifySender.send).toHaveBeenCalled();
    expect(slackSender.send).toHaveBeenCalled();
    // Verify: Handler returns success
    expect(result).toEqual({ statusCode: 200 });
  });

  test('Failed Slack send is captured in DLQ', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));
    const event = buildEventBridgeEvent('AccountQuarantined', { ... });

    // Simulate EventBridge retries (max 2 times)
    await handler(event);  // Attempt 1 - fails with RetriableError
    // EventBridge retries...
    await handler(event);  // Attempt 2 - fails again
    // EventBridge sends to DLQ

    // Verify: DLQ message structure
    const dlqMessage = await sqs.receiveMessage({ QueueUrl: dlqUrl }).promise();
    expect(dlqMessage.Messages[0].Body).toContain('AccountQuarantined');
    expect(dlqMessage.Messages[0].Body).toContain('500'); // Error status
  });
});
```

### E2E Tests (Stack: Playwright, real AWS)

**File:** `infra/test/e2e/slack-alerts.test.ts`

```typescript
describe('Slack Alerts E2E', () => {
  test('AccountQuarantined event produces Slack alert within 2s', async () => {
    const startTime = Date.now();

    // Publish event to EventBridge
    await eventBridge.putEvents({
      Entries: [{
        Source: 'innovation-sandbox',
        DetailType: 'AccountQuarantined',
        Detail: JSON.stringify({
          awsAccountId: '123456789012',
          reason: 'Policy violation'
        })
      }]
    }).promise();

    // Wait for Slack message to arrive (mock webhook endpoint)
    const webhookCall = await waitForWebhookCall(2000); // 2s timeout
    const latency = Date.now() - startTime;

    // Verify: Message received within 2s
    expect(latency).toBeLessThan(2000);
    expect(webhookCall.body).toContain('Account Quarantine Alert');
    expect(webhookCall.body).toContain('123456789012');
  });

  test('Lease freeze dual-channel: user gets email, ops get Slack', async () => {
    const event = {
      Source: 'innovation-sandbox',
      DetailType: 'LeaseFrozen',
      Detail: JSON.stringify({
        leaseId: { userEmail: 'user@gov.uk', uuid: 'a1b2' },
        accountId: '123456789012',
        reason: { type: 'BudgetExceeded', totalSpend: 500 }
      })
    };

    await eventBridge.putEvents({ Entries: [event] }).promise();

    // Wait for both messages
    const emailCall = await waitForNotifyApiCall(2000);
    const slackCall = await waitForWebhookCall(2000);

    // Verify: Both sent
    expect(emailCall.email).toBe('user@gov.uk');
    expect(slackCall.body).toContain('123456789012');
  });

  test('Slack alert retry: 429 on first try, succeeds on retry', async () => {
    mockWebhook.mockRejectedValueOnce(new Response(null, { status: 429 }));
    mockWebhook.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await eventBridge.putEvents({
      Entries: [{
        Source: 'innovation-sandbox',
        DetailType: 'AccountCleanupFailed',
        Detail: JSON.stringify({...})
      }]
    }).promise();

    // Wait for successful message
    const call = await waitForWebhookCall(3000);  // Allow extra time for retries
    expect(call.statusCode).toBe(200);
    // Verify: fetch called twice (initial + 1 retry)
    expect(mockWebhook).toHaveBeenCalledTimes(2);
  });
});
```

### Performance Tests (Optional, for future optimization)

```typescript
describe('Slack Sender Performance', () => {
  test('Cold start < 500ms', async () => {
    const startTime = Date.now();
    const lambda = new LambdaClient();
    await lambda.invoke({
      FunctionName: 'ndx-notification',
      Payload: buildEventBridgeEvent('AccountQuarantined', {...})
    }).promise();
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500);
  });

  test('Warm invocation < 100ms', async () => {
    // Warm up
    await handler(event1);
    // Measure
    const startTime = Date.now();
    await handler(event2);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100);
  });
});
```

### Security Tests

```typescript
describe('Security', () => {
  test('Webhook URL never appears in CloudWatch logs', async () => {
    // Send alert
    await handler(buildEventBridgeEvent('AccountQuarantined', {...}));
    // Query CloudWatch
    const logs = await cloudwatchlogs.filterLogEvents({
      logGroupName: '/aws/lambda/ndx-notification'
    }).promise();
    expect(logs.events.map(e => e.message).join('')).not.toContain(webhookUrl);
  });

  test('Secrets Manager resource policy restricts access to Lambda role', async () => {
    const secret = await secretsmanager.describeSecret({
      SecretId: '/ndx/notifications/credentials'
    }).promise();
    expect(secret.SecretPolicy).toContain('Deny');
    expect(secret.SecretPolicy).toContain(lambdaRoleArn);
  });

  test('Event source validation rejects non-ISB events', async () => {
    const maliciousEvent = { source: 'malicious-service', detail: {} };
    expect(() => handler(maliciousEvent)).toThrow(SecurityError);
  });
});
```

---

## Validation Checklist (Post-Implementation)

- [ ] All 4 Slack alert types implemented (Quarantine, Freeze, Cleanup Failure, Drift)
- [ ] Block Kit messages render correctly in Slack (test with actual webhook)
- [ ] Exponential backoff retry tested with real 429 responses
- [ ] DLQ receives failed messages with full context
- [ ] CloudWatch alarms trigger on failures (DLQ, errors, 401, zero invocations)
- [ ] Webhook URL never exposed in logs, errors, or error responses
- [ ] Event source validation rejects unauthorized events
- [ ] End-to-end latency < 2 seconds (EventBridge → Slack)
- [ ] Dual-channel events (LeaseFrozen) route to both NotifySender and SlackSender
- [ ] Idempotency prevents duplicate Slack messages from EventBridge retries
- [ ] Template registry documented with required/optional fields for all 4 alert types
- [ ] Unit tests pass (jest unit/)
- [ ] Integration tests pass (jest integration/)
- [ ] E2E tests pass (playwright e2e/)
- [ ] Code lint passes (eslint + prettier)
- [ ] CDK synth produces valid CloudFormation
- [ ] Manual acceptance test: Publish real AccountQuarantined event, verify Slack message
- [ ] Documentation updated: README, architecture diagrams, runbook links added to alerts (story 6-8)

---

_Generated by BMAD Epic Technical Context Workflow v6_
_Date: 2025-11-27_
_For: cns_
_Project: NDX Notification System - Epic N-6: Operations Slack Alerts_
