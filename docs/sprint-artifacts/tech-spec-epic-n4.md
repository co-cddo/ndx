# Epic Technical Specification: Notification Infrastructure Foundation

Date: 2025-11-27
Author: cns
Epic ID: n4
Status: Draft

---

## Overview

Epic N-4 establishes the foundational serverless infrastructure for NDX's notification system. This epic creates the event-driven pipeline to receive Innovation Sandbox (ISB) events via EventBridge, process them through a security-hardened Lambda handler, and provide comprehensive operational visibility through CloudWatch monitoring.

The notification system follows a **"one brain, two mouths"** architecture pattern - a single Lambda function that will eventually route events to GOV.UK Notify (user emails) or Slack (ops alerts). This epic focuses on the "brain" - the secure event processing foundation - while subsequent epics (N-5, N-6) implement the "mouths".

After this epic is complete, the system will be able to securely receive ISB events, validate event sources, capture failures in a DLQ, and alert operations staff to infrastructure issues - even though actual notification sending is stubbed.

**Pre-mortem Validated:** This epic incorporates learnings from pre-mortem analysis identifying five failure scenarios: silent death (no success metrics), secrets expiry, event storms, schema drift, and alert channel confusion. Stories n4-7, n4-8, and n4-9 were added to address critical gaps, with additional explicit acceptance criteria added throughout.

**Red Team Validated:** Security analysis identified five attack vectors: event injection, email manipulation, secrets exfiltration, DLQ flooding, and log injection. Critical finding: EventBridge source validation alone is insufficient - account-level filtering required. Additional countermeasures added to n4-2, n4-3, n4-6.

**Devil's Advocate Validated:** All major architecture decisions stress-tested. ADR-001 through ADR-005 survive scrutiny. One adjustment: n4-8 (SQS buffer) made conditional on ISB batch operation confirmation. Reserved concurrency calculation documented.

**SWOT Validated:** Strategic assessment complete. Key strengths: battle-tested AWS services, defense in depth, zero external costs. Critical finding: ISB schema changes are highest-probability threat - n4-9 elevated to critical path for stakeholder coordination.

**Five Whys Validated:** Root cause analysis confirms problem is real and solution is correctly scoped. Core issue: information asymmetry between ISB (knows events) and users (need awareness). N-4 bridges this gap as an event-to-notification transformer.

**Service Blueprint Validated:** Service delivery mapping complete. Identified frontstage SLAs (email <5min, Slack <30sec), backstage coupling risks, and support process gaps. Key additions: CloudWatch Dashboard for unified health visibility, DLQ → ops notification requirement for failed events, status query endpoint noted for future self-service capability.

**Value Chain Validated:** End-to-end value flow mapped from ISB events to user notifications. Identified inbound visibility gap (EventsReceivedFromISB metric added), linkage risks addressed, and service activity optimization (runbook URLs in alarms). n4-6 elevated to ops readiness critical path.

**PESTLE Validated:** External environment factors assessed. Key findings: ISB cross-department governance requires data sharing approval (Political), ISB cost allocation for EventBridge egress needs confirmation (Economic), no user PII in Slack due to US data residency (Legal). Version pinning policy added for dependency stability (Technological).

**Journey Mapping Validated:** Three stakeholder journeys mapped (User, Ops, Developer). Key additions: example event payloads for developer experience, incident response template for ops, mock event generator utility for testing, staging EventBridge documentation for n4-9, N-5 handoff criteria requiring portal deep links in email templates.

**Decision Matrix Validated:** Acceptance criteria prioritized by security impact (30%), user impact (25%), ops impact (20%), verification complexity (15%), dependency risk (10%). 5 Tier-1 MUST-PASS criteria identified (account filter, source validation, DLQ delivery, secret policy, Chatbot independence). 3 missing critical criteria added (idempotency key sourcing, PII redaction, Slack PII restriction). Test priority framework established: P0 (security), P1 (flow), P2 (observability), P3 (documentation).

**Devil's Advocate Validated:** AC challenge session revealed 8 refinements: (1) AC-6.11 moved to staging integration test (more realistic than CI/CD independence test), (2) AC-3.6.1 load test added to validate reserved concurrency, (3) AC-4.8/4.9 added for DLQ health baseline and purge runbook, (4) Test verification matrix clarifies unit/integration/manual split for 56 ACs, (5) Idempotency key constraint documented in code to prevent custom key mistakes, (6) Incident response template updated with email lookup procedure, (7) Security layering (account filter + source validation + resource policy) justified vs defense-in-depth necessity, (8) AC list refined: 35 testable + 21 documentation ACs.

**Root Cause Analysis Validated:** Drilled down 5 levels on 7 critical ACs to identify fundamental problems: (1) AC-2.3 justified by ISB account compromise threat, (2) AC-3.6 necessary because ISB event volume unbounded, (3) AC-4.1 acceptable MVP with ops burden acknowledged, (4) AC-6.11 Chatbot independence is hard requirement for ops critical path, (5) AC-3.9 is security requirement (duplicates cause user confusion), added AC-3.9.1 code comment, (6) AC-3.10 + AC-6.17 are GDPR mandate (UK GDPR data residency), (7) Alarm granularity (AC-6.1-8) each addresses distinct failure path - cannot reduce. Key insight: each AC addresses a root cause, not symptom. Updated: AC-6.1-8 descriptions now explain _why_ each alarm exists, AC-7.4 explains auth failure separate SLA, AC-6.16 includes email lookup procedure.

**Red Team Analysis Validated:** Attacked 10 security assumptions to identify AC gaps: (1) EventBridge account field immutability not tested (added AC-2.3.1), (2) Source validation reasoning unclear (added AC-3.1.1 with Red Team note), (3) Dependency RCE risk unaddressed (added AC-5.7 security scanning + exact version pinning), (4) DLQ permissions overly broad (added AC-4.10 IAM audit), (5) Webhook token leakage possible (added AC-6.18 no-log requirement + AC-6.11.1 Slack integration documentation), (6) Domain spoofing detection untested (added AC-3.7.1 metric test), (7) Log injection vulnerability (added AC-3.8.1 newline sanitization test), (8) Concurrency timeout untested (added AC-3.6.2), (9) Slack compromise assumption undocumented (added AC-6.11.1), (10) Secret rotation TOCTOU not tested (added AC-5.8 cache invalidation test). Total new ACs: 10. Updated Pre-Deployment Checklist with IAM policy audit and dependency security scan.

## Objectives and Scope

### In Scope

- **CDK Stack Creation**: New `NotificationStack` with isolated lifecycle from existing `NdxStack`
- **EventBridge Subscription**: Rule targeting ISB bus (`ISB-{namespace}-ISBEventBus`) for notification-relevant event types
  - _Red Team addition_: Account-level filter (`account: [ISB_ACCOUNT_ID]`) to prevent cross-account event injection
- **Lambda Handler Skeleton**: Node.js 20.x handler with Powertools Logger, source validation, and security controls
  - _Pre-mortem addition_: Reserved concurrency = 10 (blast radius limiting)
    - _Devil's Advocate_: Calculation: Notify rate limit (3000/min) ÷ Lambda duration (500ms) × safety factor (0.4) = 10
  - _Pre-mortem addition_: Dedicated metric for 429 rate limit responses
  - _Red Team addition_: `SuspiciousEmailDomain` metric for non-.gov.uk emails (defense in depth for N-5)
- **Dead Letter Queue**: SQS DLQ with 14-day retention for failed event capture
- **Secrets Manager Integration**: Runtime retrieval of API credentials with Lambda-restricted resource policy
  - _Pre-mortem addition_: Secret rotation runbook documentation
- **CloudWatch Monitoring**: Alarms for DLQ depth, Lambda errors, and 24h canary (zero-invocation detection)
  - _Pre-mortem addition_: Zero `NotificationSuccess` in 24h triggers alarm (positive confirmation)
  - _Pre-mortem addition_: 401/403 auth failures trigger CRITICAL alarm immediately
  - _Pre-mortem addition_: Separate channels - `#ndx-infra-alerts` (Chatbot) vs `#ndx-ops-alerts` (Lambda)
  - _Red Team addition_: DLQ message rate alarm (>50 messages/5min = suspicious flooding)
  - _Decision Matrix_: CloudWatch default encryption (AES-256) sufficient; KMS removed (cost/complexity unjustified)
  - _Service Blueprint addition_: DLQ processing MUST include ops notification - if event fails after retries, ops channel receives "notification failed" meta-alert
  - _Journey Mapping addition_: Incident response template for notification failures (reduces ops "hunting" pain point)
- **AWS Chatbot Configuration**: Infrastructure alerts routed to `#ndx-infra-alerts` via native AWS integration
  - _Devil's Advocate_: AC required - "Chatbot alerts function independently of notification Lambda failure"
- **Idempotency Table**: DynamoDB table for Lambda Powertools idempotency
  - _Devil's Advocate_: Idempotency key MUST be `event.id` (EventBridge-provided), not custom key
- **Pre-mortem story additions**:
  - n4-7: Secrets rotation and 30-day expiry warning alarm
    - _Risk Matrix_: Add proactive alarm: secret age > 335 days (30 days before 1-year rotation)
  - n4-8: SQS buffer queue between EventBridge and Lambda for burst protection
    - _Devil's Advocate_: **CONDITIONAL** - Implement only if ISB confirms batch operations (>100 events/min). Otherwise defer to Growth phase.
  - n4-9: Event schema versioning strategy documentation (ISB team coordination)
    - _SWOT_: **CRITICAL PATH** - ISB schema changes are highest-probability threat. Must include:
      1. Regular sync cadence with ISB team
      2. Schema change notification process (how NDX learns of changes)
      3. Backwards-compatible handling strategy (Zod `.passthrough()` pattern)
    - _Journey Mapping addition_: Staging EventBridge setup documentation (enables N-5/N-6 developers to test cross-account events)

### Out of Scope

- **GOV.UK Notify SDK Integration**: Covered in Epic N-5
- **Slack Webhook Integration**: Covered in Epic N-6
- **Email template configuration**: Covered in Epic N-5
- **DynamoDB enrichment queries**: Covered in Epic N-5
- **Actual notification delivery**: This epic focuses on infrastructure only
- **Notification status query endpoint**: Future consideration for self-service (reduces support tickets)

### Problem Statement (Five Whys Derived)

> **Bridge the information gap between ISB's event-driven platform and NDX users who need proactive, GOV.UK-branded awareness of lease lifecycle events to avoid lost work, budget overruns, and delayed access.**

**Root Cause:** ISB emits events but doesn't notify users. NDX users need push notifications, not pull (UI checking). No existing infrastructure bridges this gap.

**Solution Fit:** Epic N-4 creates the event-to-notification transformer - subscribing to ISB events, processing them securely, and preparing for delivery via approved channels.

### Success Criteria

| Metric                   | Target      | Rationale                                                   |
| ------------------------ | ----------- | ----------------------------------------------------------- |
| Event delivery rate      | 99.9%       | Only permanent failures (malformed events) should reach DLQ |
| Processing latency       | < 500ms p95 | Users should receive notifications within seconds of event  |
| Zero undetected failures | 100%        | Every failure must trigger alarm (no silent death)          |
| Security incidents       | 0           | No unauthorized event injection or email misdirection       |

### Interface Boundary with ISB

| Aspect              | NDX Notification System           | ISB Platform            |
| ------------------- | --------------------------------- | ----------------------- |
| Role                | Event **consumer**                | Event **producer**      |
| Responsibility      | Transform events to user messages | Emit well-formed events |
| Schema ownership    | Adapts to ISB schema              | Defines event schema    |
| Modification rights | Read-only DynamoDB access         | Full platform control   |

**Principle:** N-4 is an _adapter_, not an _influencer_. We consume ISB's events as-is and adapt to schema changes (n4-9), not negotiate changes.

### Design Principle: Reliability Over Features

> **Better to send a simple notification than fail sending a rich one.**

- If enrichment fails → send with available data + log warning
- If Notify rate-limited → retry with backoff, preserve in DLQ
- If schema has unknown fields → accept with `.passthrough()`, log warning
- If partial data → send what we have, user gets something vs nothing

## System Architecture Alignment

### Architecture Document Reference

This epic implements the infrastructure components defined in [notification-architecture.md](../notification-architecture.md).

### Key Architectural Decisions Applied

| ADR     | Decision                        | This Epic's Implementation                              |
| ------- | ------------------------------- | ------------------------------------------------------- |
| ADR-001 | Single Lambda for both channels | Create unified handler with modular structure           |
| ADR-002 | TypeScript over Python          | Use NodejsFunction with esbuild bundling                |
| ADR-003 | Powertools idempotency          | Provision `NdxIdempotency` DynamoDB table               |
| ADR-005 | Chatbot for infra alerts        | Configure CloudWatch → SNS → AWS Chatbot                |
| ADR-006 | Security-first processing       | Source validation, reserved concurrency, encrypted logs |

### Stack Relationship

```
NdxStaticStack (existing)
    └── S3, CloudFront, Cookie Router

NotificationStack (this epic)  ← NEW
    ├── EventBridge Rule (references ISB bus)
    ├── Lambda Function (handler.ts)
    ├── SQS Dead Letter Queue
    ├── DynamoDB Idempotency Table
    ├── SQS Buffer Queue (pre-mortem addition)
    ├── CloudWatch Alarms (4)
    ├── SNS Alarm Topic
    └── AWS Chatbot Slack Channel Config
```

### Components Referenced from Architecture

| Component         | File                                 | Purpose                                               |
| ----------------- | ------------------------------------ | ----------------------------------------------------- |
| NotificationStack | `lib/notification-stack.ts`          | CDK stack definition                                  |
| Handler           | `lib/lambda/notification/handler.ts` | Event entry point with security                       |
| Types             | `lib/lambda/notification/types.ts`   | TypeScript interfaces                                 |
| Errors            | `lib/lambda/notification/errors.ts`  | Error classification (Retriable, Permanent, Critical) |
| Config            | `lib/config.ts`                      | Environment configuration (namespace, table names)    |

### Pre-mortem Failure Scenarios Addressed

| Scenario        | Failure Mode                                            | Mitigation                                                   | Story      |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| Silent Death    | Lambda fails but no alarm (events still arriving)       | `NotificationSuccess` metric with 24h zero alarm             | n4-6       |
| Secrets Expired | API key expires, 401 errors flood DLQ                   | 30-day expiry warning + rotation runbook                     | n4-7       |
| Event Storm     | Bulk ISB operation overwhelms Lambda/Notify rate limits | SQS buffer + reserved concurrency (10)                       | n4-8, n4-3 |
| Schema Drift    | ISB changes event format, validation rejects all        | Schema versioning strategy + ISB coordination                | n4-9       |
| Alert Confusion | Infra alerts mixed with ops alerts, fatigue             | Channel separation: `#ndx-infra-alerts` vs `#ndx-ops-alerts` | n4-6       |

### Red Team Attack Vectors Mitigated

| Vector               | Severity  | Attack                                     | Countermeasure                                    | Story |
| -------------------- | --------- | ------------------------------------------ | ------------------------------------------------- | ----- |
| Event Injection      | 🔴 HIGH   | Spoof `source` field to inject fake events | Account-level EventBridge filter                  | n4-2  |
| Email Manipulation   | 🟡 MEDIUM | Send notifications to arbitrary emails     | `SuspiciousEmailDomain` metric + N-5 verification | n4-3  |
| Secrets Exfiltration | 🟢 LOW    | Extract API credentials from Lambda        | Resource policy + rotation runbook                | n4-5  |
| DLQ Flooding         | 🟡 MEDIUM | Flood DLQ to hide real failures            | DLQ rate alarm (>50/5min)                         | n4-6  |
| Log Injection/PII    | 🟡 MEDIUM | Extract PII from CloudWatch logs           | KMS-encrypted log group                           | n4-6  |

### Devil's Advocate Decision Validation

| Decision                         | Challenge               | Verdict        | Adjustment                              |
| -------------------------------- | ----------------------- | -------------- | --------------------------------------- |
| Single Lambda (ADR-001)          | Single point of failure | ✅ Holds       | Added: Chatbot independence AC          |
| TypeScript (ADR-002)             | Complexity overhead     | ✅ Holds       | None - consistency with CDK justified   |
| Powertools Idempotency (ADR-003) | Over-engineering        | ✅ Holds       | Clarified: key = event.id               |
| AWS Chatbot (ADR-005)            | Another moving part     | ✅ Holds       | None - independent failsafe justified   |
| Separate NotificationStack       | Premature separation    | ✅ Holds       | None - blast radius isolation justified |
| SQS Buffer (n4-8)                | YAGNI for MVP           | ⚠️ Conditional | Defer unless ISB confirms batch ops     |
| Reserved Concurrency = 10        | Arbitrary number        | ✅ Holds       | Documented calculation rationale        |

### SWOT Strategic Priorities

| Priority    | Finding                             | Action                                         | Story   |
| ----------- | ----------------------------------- | ---------------------------------------------- | ------- |
| 🔴 Critical | ISB schema changes = highest threat | Establish coordination before N-5              | n4-9    |
| 🟡 Growth   | No delivery confirmation            | Plan Notify callbacks for Growth phase         | Backlog |
| 🟡 Growth   | Manual DLQ processing               | Plan auto-retry Lambda when volume scales      | Backlog |
| 🟢 Future   | GDPR/Slack data residency           | Review compliance before adding Slack channels | Backlog |

**Key Strengths to Leverage:**

- Battle-tested AWS services (low operational risk)
- Defense in depth security (multiple protection layers)
- Zero external costs (~$4.30/month AWS only)
- Independent alerting path (Chatbot works when Lambda broken)

**Growth Phase Opportunities:**

- Additional channels (SMS, Push, Teams)
- Interactive Slack buttons for ops actions
- Delivery analytics via GOV.UK Notify callbacks
- Cross-ISB reuse of notification pattern
- _Value Chain_: Auto-retry Lambda for DLQ processing (reduces ops burden)

## Detailed Design

### Services and Modules

| Module                | File                                 | Responsibility                                      | Inputs            | Outputs                  |
| --------------------- | ------------------------------------ | --------------------------------------------------- | ----------------- | ------------------------ |
| **NotificationStack** | `lib/notification-stack.ts`          | CDK infrastructure definition                       | Config values     | CloudFormation resources |
| **Handler**           | `lib/lambda/notification/handler.ts` | Event entry point, routing, security                | EventBridge event | Success/failure response |
| **Types**             | `lib/lambda/notification/types.ts`   | TypeScript interfaces for events                    | N/A               | Type definitions         |
| **Errors**            | `lib/lambda/notification/errors.ts`  | Error classification (Retriable/Permanent/Critical) | Error context     | Classified error         |
| **Config**            | `lib/config.ts`                      | Environment configuration                           | Env vars          | Config object            |

#### NotificationStack Components

```
NotificationStack
├── EventBridge Rule (ndx-notification-rule)
│   ├── Source: ISB-{namespace}-ISBEventBus
│   ├── Pattern: 13 detail-types + account filter
│   └── Target: NotificationHandler Lambda
│
├── Lambda Function (ndx-notification-handler)
│   ├── Runtime: Node.js 20.x
│   ├── Memory: 256 MB
│   ├── Timeout: 30 seconds
│   ├── Reserved Concurrency: 10
│   └── Environment: SECRETS_PATH, IDEMPOTENCY_TABLE, LOG_LEVEL
│
├── SQS Dead Letter Queue (ndx-notification-dlq)
│   ├── Retention: 14 days
│   ├── Encryption: SQS_MANAGED
│   └── Visibility Timeout: 300 seconds
│
├── SQS Buffer Queue (ndx-notification-buffer) [CONDITIONAL]
│   ├── Enabled: Only if ISB confirms batch operations
│   └── Purpose: Rate limiting protection
│
├── DynamoDB Table (NdxIdempotency)
│   ├── Partition Key: id (String)
│   ├── TTL: expiration
│   └── Managed by: Lambda Powertools
│
├── CloudWatch Log Group (/aws/lambda/ndx-notification)
│   ├── Retention: 30 days
│   └── Encryption: AWS default (AES-256) - KMS removed per Decision Matrix
│
├── CloudWatch Alarms (8) - Risk Matrix validated
│   ├── ndx-notification-dlq-depth (> 0) [P2]
│   ├── ndx-notification-dlq-rate (> 50/5min) [P1]
│   ├── ndx-notification-dlq-stale (> 0 for 24h) [P3] *new*
│   ├── ndx-notification-errors (> 5/5min) [P2]
│   ├── ndx-notification-error-rate (> 10%/5min) [P1] *new*
│   ├── ndx-notification-auth-failures (any 401/403) [P1]
│   ├── ndx-notification-secrets-expiry (age > 335d) [P2] *new*
│   └── ndx-notification-canary (0 success in 24h) [P3]
│
├── CloudWatch Dashboard (ndx-notifications-dashboard) - Service Blueprint addition
│   ├── Widgets: Events/hour, Success Rate, DLQ Depth
│   ├── Graphs: Events by Type, Errors by Type, Processing Latency
│   ├── *Value Chain addition*: EventsReceivedFromISB daily metric (inbound visibility)
│   └── Purpose: Unified service health visibility (frontstage + backstage)
│
├── SNS Topic (ndx-notification-alarms)
│   └── Subscribers: AWS Chatbot
│
└── AWS Chatbot Configuration
    ├── Channel: #ndx-infra-alerts
    └── Workspace: {configured}
```

#### Handler Module Structure

```typescript
// handler.ts - Entry point
export const handler = makeIdempotent(
  async (event: EventBridgeEvent<string, ISBEventDetail>) => {
    // 1. Security: Validate source
    validateEventSource(event.source)

    // 2. Log with correlation ID
    logger.info("Processing event", { eventId: event.id, eventType: event["detail-type"] })

    // 3. Metrics: Record receipt
    metrics.addMetric("EventReceived", MetricUnits.Count, 1)

    // 4. Stub processing (actual sending in N-5/N-6)
    const result = await processEvent(event)

    // 5. Metrics: Record success
    metrics.addMetric("NotificationSuccess", MetricUnits.Count, 1)

    return result
  },
  { persistenceStore },
)
```

### Data Models and Contracts

#### EventBridge Event Structure

```typescript
// types.ts
interface EventBridgeEvent<DetailType extends string, Detail> {
  id: string // Idempotency key
  "detail-type": DetailType // Event type (LeaseApproved, etc.)
  source: string // Must be 'innovation-sandbox'
  account: string // Must match ISB_ACCOUNT_ID
  time: string // ISO 8601 timestamp
  region: string // AWS region
  detail: Detail // Event-specific payload
}
```

#### ISB Event Types (Subscribed)

| Detail Type                 | Channel | Payload Schema                                                                   |
| --------------------------- | ------- | -------------------------------------------------------------------------------- |
| LeaseRequested              | Notify  | `{ leaseId: LeaseKey, userEmail, requiresManualApproval }`                       |
| LeaseApproved               | Notify  | `{ leaseId, approvedBy, userEmail }`                                             |
| LeaseDenied                 | Notify  | `{ leaseId, deniedBy, userEmail }`                                               |
| LeaseTerminated             | Notify  | `{ leaseId: LeaseKey, accountId, reason: TerminatedReason }`                     |
| LeaseFrozen                 | Both    | `{ leaseId: LeaseKey, accountId, reason: FrozenReason }`                         |
| LeaseBudgetThresholdAlert   | Notify  | `{ leaseId: LeaseKey, accountId, budget, totalSpend, budgetThresholdTriggered }` |
| LeaseDurationThresholdAlert | Notify  | `{ leaseId: LeaseKey, accountId, hoursRemaining }`                               |
| LeaseFreezingThresholdAlert | Notify  | `{ leaseId: LeaseKey, accountId, freezeReason }`                                 |
| LeaseBudgetExceeded         | Notify  | `{ leaseId: LeaseKey, accountId, budget, totalSpend }`                           |
| LeaseExpired                | Notify  | `{ leaseId: LeaseKey, accountId }`                                               |
| AccountQuarantined          | Slack   | `{ awsAccountId, reason }`                                                       |
| AccountCleanupFailed        | Slack   | `{ accountId, cleanupExecutionContext }`                                         |
| AccountDriftDetected        | Slack   | `{ accountId, actualOu, expectedOu }`                                            |

#### Example Event Payloads (Journey Mapping - Developer Experience)

**LeaseApproved** (most common user notification):

```json
{
  "id": "abc123-def456-ghi789",
  "detail-type": "LeaseApproved",
  "source": "innovation-sandbox",
  "account": "123456789012",
  "time": "2025-11-27T10:30:00Z",
  "region": "eu-west-2",
  "detail": {
    "leaseId": { "userEmail": "jane.doe@department.gov.uk", "uuid": "lease-uuid-123" },
    "approvedBy": "admin@cddo.gov.uk",
    "userEmail": "jane.doe@department.gov.uk"
  }
}
```

**LeaseFrozen** (triggers both channels):

```json
{
  "id": "xyz789-abc123-def456",
  "detail-type": "LeaseFrozen",
  "source": "innovation-sandbox",
  "account": "123456789012",
  "time": "2025-11-27T14:00:00Z",
  "region": "eu-west-2",
  "detail": {
    "leaseId": { "userEmail": "jane.doe@department.gov.uk", "uuid": "lease-uuid-123" },
    "accountId": "987654321098",
    "reason": { "type": "BudgetExceeded", "triggeredBudgetThreshold": 80, "budget": 100, "totalSpend": 85.5 }
  }
}
```

**AccountQuarantined** (ops-only alert):

```json
{
  "id": "ops123-alert456-urgent",
  "detail-type": "AccountQuarantined",
  "source": "innovation-sandbox",
  "account": "123456789012",
  "time": "2025-11-27T03:15:00Z",
  "region": "eu-west-2",
  "detail": {
    "awsAccountId": "987654321098",
    "reason": "Suspicious activity detected - unauthorized IAM role creation"
  }
}
```

#### Composite Key Types

```typescript
// types.ts
interface LeaseKey {
  userEmail: string // Partition key
  uuid: string // Sort key
}

type FrozenReason =
  | { type: "Expired"; triggeredDurationThreshold: number; leaseDurationInHours: number }
  | { type: "BudgetExceeded"; triggeredBudgetThreshold: number; budget?: number; totalSpend: number }
  | { type: "ManuallyFrozen"; comment: string }

type TerminatedReason =
  | { type: "Expired"; leaseDurationInHours: number }
  | { type: "BudgetExceeded"; budget?: number; totalSpend: number }
  | { type: "ManuallyTerminated"; comment: string }
  | { type: "AccountQuarantined"; comment: string }
  | { type: "Ejected"; comment: string }
```

#### Error Classification

```typescript
// errors.ts
class RetriableError extends Error {
  readonly retriable = true
  constructor(
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message)
  }
}

class PermanentError extends Error {
  readonly retriable = false
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
  }
}

class CriticalError extends Error {
  readonly retriable = false
  readonly critical = true // Triggers immediate alarm
  constructor(message: string) {
    super(message)
  }
}

class SecurityError extends CriticalError {
  constructor(message: string) {
    super(`SECURITY: ${message}`)
  }
}
```

#### Secrets Structure

```json
// /ndx/notifications/credentials
{
  "notifyApiKey": "key-name-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "slackWebhookUrl": "https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_BOT/YOUR_SECRET"
}
```

### APIs and Interfaces

#### Lambda Interface

| Trigger     | Input                                  | Output                                   | Error Handling            |
| ----------- | -------------------------------------- | ---------------------------------------- | ------------------------- |
| EventBridge | `EventBridgeEvent<DetailType, Detail>` | `{ statusCode: 200, body: 'processed' }` | Throw error → retry → DLQ |

#### Internal Interfaces

```typescript
// Config interface (lib/config.ts)
interface NotificationConfig {
  namespace: string // ISB namespace (e.g., 'prod')
  isbAccountId: string // ISB AWS account ID for event filtering
  secretsPath: string // Secrets Manager path
  idempotencyTable: string // DynamoDB table name
  logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR"
  allowedSources: string[] // ['innovation-sandbox']
}

// Metrics interface
interface NotificationMetrics {
  EventReceived: number
  NotificationSuccess: number
  NotificationFailure: number
  SuspiciousEmailDomain: number
  RateLimited: number
  AuthFailure: number
}
```

#### CloudFormation Exports Consumed

| Export Name                           | Value        | Used For                          |
| ------------------------------------- | ------------ | --------------------------------- |
| `ISB-{namespace}-ISBEventBus`         | EventBus ARN | EventBridge subscription          |
| `ISB-{namespace}-LeaseTable`          | Table ARN    | Future: DynamoDB enrichment (N-5) |
| `ISB-{namespace}-SandboxAccountTable` | Table ARN    | Future: DynamoDB enrichment (N-5) |
| `ISB-{namespace}-LeaseTemplateTable`  | Table ARN    | Future: DynamoDB enrichment (N-5) |

### Workflows and Sequencing

#### Event Processing Flow

```
┌─────────────────┐
│ ISB EventBridge │
│ Bus             │
└────────┬────────┘
         │ Event published
         ▼
┌─────────────────┐
│ EventBridge     │ Account filter: ISB_ACCOUNT_ID
│ Rule            │ Detail-type filter: 13 types
└────────┬────────┘
         │ Rule matches
         ▼
┌─────────────────┐  [CONDITIONAL]
│ SQS Buffer      │──────────────────┐
│ Queue           │                  │ If n4-8 implemented
└────────┬────────┘                  │
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ Lambda Handler  │◄────────│ Direct Invoke   │
│                 │         │ (if no buffer)  │
└────────┬────────┘         └─────────────────┘
         │
         ▼
┌─────────────────┐
│ 1. Source       │ Validate event.source in allowedSources
│    Validation   │ Validate event.account == ISB_ACCOUNT_ID
└────────┬────────┘
         │ ✓ Valid
         ▼
┌─────────────────┐
│ 2. Idempotency  │ Check DynamoDB: event.id processed?
│    Check        │ If yes → return cached result
└────────┬────────┘
         │ New event
         ▼
┌─────────────────┐
│ 3. Log +        │ logger.info() with correlation ID
│    Metrics      │ metrics.addMetric('EventReceived')
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Process      │ Route by detail-type (stub in N-4)
│    Event        │ Notify events → stub
│                 │ Slack events → stub
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Success      │ metrics.addMetric('NotificationSuccess')
│    Metrics      │ Return success response
└─────────────────┘
         │
         │ On Error
         ▼
┌─────────────────┐
│ Error Handler   │ Classify: Retriable / Permanent / Critical
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐  ┌───────┐
│Retry  │  │DLQ    │ Permanent/Critical errors
│(2x)   │  │       │ or retries exhausted
└───────┘  └───────┘
              │
              ▼
         ┌───────┐
         │Alarm  │ DLQ depth > 0
         └───────┘
```

#### Alarm Notification Flow

```
┌─────────────────┐
│ CloudWatch      │
│ Alarm Triggers  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SNS Topic       │
│ (ndx-alarms)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AWS Chatbot     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Slack           │
│ #ndx-infra-     │
│ alerts          │
└─────────────────┘
```

**Note:** This flow is INDEPENDENT of Lambda - if Lambda is broken, Chatbot still delivers infrastructure alerts.

## Non-Functional Requirements

### Performance

| Requirement                  | Target                       | Measurement                       | Rationale                               |
| ---------------------------- | ---------------------------- | --------------------------------- | --------------------------------------- |
| **Event processing latency** | < 500ms p95                  | CloudWatch Lambda Duration metric | Users expect near-instant notifications |
| **Cold start time**          | < 3s                         | CloudWatch Init Duration          | Acceptable for async notifications      |
| **Throughput capacity**      | 100 events/minute sustained  | Load test                         | 10x headroom over expected 10K/month    |
| **Memory utilization**       | < 200MB (of 256MB)           | CloudWatch Memory Used            | Buffer for payload variations           |
| **Secrets retrieval**        | < 100ms (cached after first) | Custom metric                     | Cache eliminates per-request latency    |

**Frontstage SLAs** (Service Blueprint derived):

| Channel               | SLA               | Rationale                                |
| --------------------- | ----------------- | ---------------------------------------- |
| Email (GOV.UK Notify) | < 5 min delivery  | Notify async processing + email delivery |
| Slack (ops alerts)    | < 30 sec delivery | Synchronous webhook, critical for ops    |
| Error notifications   | Best effort       | Fallback messaging, no SLA guarantee     |

**Performance Constraints:**

- Reserved concurrency = 10 limits parallel executions (protects downstream rate limits)
- No database queries in N-4 (enrichment deferred to N-5)
- Synchronous processing only (no fan-out patterns)

**Scalability Path:**

- Current: Direct EventBridge → Lambda invocation
- Future (if needed): SQS buffer absorbs bursts, Lambda polls at controlled rate

### Security

| Control                           | Implementation                                                            | Priority | ADR Reference              |
| --------------------------------- | ------------------------------------------------------------------------- | -------- | -------------------------- |
| **Account-level filtering**       | EventBridge rule includes `account: [ISB_ACCOUNT_ID]`                     | P0       | Red Team                   |
| **Secrets protection**            | Secrets Manager with Lambda-only resource policy                          | P0       | ADR-006                    |
| **IAM least privilege**           | Lambda role has minimal permissions per resource                          | P0       | Decision Matrix            |
| **Event source validation**       | Validate `event.source` in allowedSources array                           | P1       | ADR-006 (defense in depth) |
| **Encryption at rest**            | SQS (SQS_MANAGED), DynamoDB (AWS_OWNED), Logs (AWS default AES-256)       | P1       | ADR-006                    |
| **Encryption in transit**         | TLS 1.2+ for all AWS API calls (SDK default)                              | P1       | AWS default                |
| **PII handling**                  | Email addresses logged as `[REDACTED]` on security events                 | P1       | GDPR                       |
| **Reserved concurrency**          | Limit to 10 concurrent executions                                         | P1       | Blast radius               |
| **Suspicious activity detection** | `SuspiciousEmailDomain` metric for non-.gov.uk (no alarm, dashboard only) | P3       | Red Team                   |
| **Slack PII restriction**         | No user PII (emails) in ops channel messages - account IDs only           | P1       | PESTLE/GDPR                |

**Decision Matrix Applied:** Controls re-prioritized based on effectiveness/complexity analysis.

**PESTLE/Legal Applied:** Slack ops channel (`#ndx-ops-alerts`) must NEVER contain user email addresses or other PII. Use account IDs, lease IDs, and event types only. This ensures GDPR compliance given Slack's US data residency. KMS log encryption removed (CloudWatch default AES-256 sufficient). IAM least privilege upgraded to P0. SuspiciousEmailDomain downgraded to P3 (informational).

**IAM Permissions (Lambda Role):**

```yaml
- Effect: Allow
  Action:
    - secretsmanager:GetSecretValue
  Resource: arn:aws:secretsmanager:*:*:secret:/ndx/notifications/*

- Effect: Allow
  Action:
    - dynamodb:GetItem
    - dynamodb:PutItem
    - dynamodb:UpdateItem
    - dynamodb:DeleteItem
  Resource: arn:aws:dynamodb:*:*:table/NdxIdempotency

- Effect: Allow
  Action:
    - sqs:SendMessage
  Resource: arn:aws:sqs:*:*:ndx-notification-dlq

- Effect: Allow
  Action:
    - logs:CreateLogStream
    - logs:PutLogEvents
  Resource: arn:aws:logs:*:*:log-group:/aws/lambda/ndx-notification:*

- Effect: Allow
  Action:
    - cloudwatch:PutMetricData
  Resource: "*"
  Condition:
    StringEquals:
      cloudwatch:namespace: NDX/Notifications
```

**Secrets Manager Resource Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalArn": "arn:aws:iam::ACCOUNT:role/ndx-notification-lambda-role"
        }
      }
    }
  ]
}
```

### Reliability/Availability

| Requirement                  | Target                                       | Implementation                      | Fallback                           |
| ---------------------------- | -------------------------------------------- | ----------------------------------- | ---------------------------------- |
| **Event delivery guarantee** | At-least-once                                | EventBridge retry + DLQ capture     | Manual DLQ replay                  |
| **Availability**             | 99.9% (AWS Lambda SLA)                       | Managed service                     | N/A - AWS responsibility           |
| **Failure isolation**        | No cascade to other NDX services             | Separate stack, no shared resources | Independent deployment             |
| **Data durability**          | No event loss                                | DLQ 14-day retention, encrypted     | Manual intervention within 14 days |
| **Idempotency**              | Duplicate events produce single notification | Powertools DynamoDB persistence     | TTL = 1 hour                       |

**Retry Strategy:**

```
Event arrives
    │
    ▼
Lambda invoked (attempt 1)
    │
    ├── Success → Done
    │
    └── Failure → Retry (attempt 2)
            │
            ├── Success → Done
            │
            └── Failure → Retry (attempt 3)
                    │
                    ├── Success → Done
                    │
                    └── Failure → Send to DLQ
```

**Error Classification Behavior:**

| Error Type     | Retry?   | DLQ?             | Alarm?    | Example                             |
| -------------- | -------- | ---------------- | --------- | ----------------------------------- |
| RetriableError | Yes (2x) | After exhaustion | On DLQ    | Network timeout, 429 rate limit     |
| PermanentError | No       | Immediately      | On DLQ    | Malformed event, validation failure |
| CriticalError  | No       | Immediately      | Immediate | 401/403 auth failure                |
| SecurityError  | No       | Immediately      | Immediate | Invalid source, email mismatch      |

**Failure Modes and Recovery:**

| Failure Mode              | Detection            | Recovery                  | RTO              |
| ------------------------- | -------------------- | ------------------------- | ---------------- |
| Lambda code bug           | Error alarm > 5/5min | Deploy fix, replay DLQ    | < 1 hour         |
| Secrets expired           | Auth failure alarm   | Rotate in Secrets Manager | < 15 min         |
| ISB bus unavailable       | Zero invocations 24h | Wait for ISB recovery     | Dependent on ISB |
| DynamoDB throttling       | Idempotency errors   | Increase capacity or wait | < 5 min (auto)   |
| EventBridge rule disabled | Zero invocations 24h | Re-enable rule            | < 5 min          |

### Observability

#### Logging

| Log Level | Usage                                   | Example                          |
| --------- | --------------------------------------- | -------------------------------- |
| ERROR     | DLQ-worthy failures, security events    | `SecurityError: Invalid source`  |
| WARN      | Retryable failures, suspicious activity | `Rate limited, retry in 60s`     |
| INFO      | Successful processing, key milestones   | `Event processed: LeaseApproved` |
| DEBUG     | Detailed payload info (dev only)        | Full event structure             |

**Structured Log Format (Powertools):**

```json
{
  "level": "INFO",
  "message": "Event processed successfully",
  "service": "ndx-notifications",
  "timestamp": "2025-11-27T10:30:00.000Z",
  "xray_trace_id": "1-abc123-def456",
  "correlation_id": "event-id-from-eventbridge",
  "event_type": "LeaseApproved",
  "processing_time_ms": 145
}
```

#### Metrics

| Metric                  | Type  | Dimensions             | Alarm Threshold                     |
| ----------------------- | ----- | ---------------------- | ----------------------------------- |
| `EventReceived`         | Count | EventType              | N/A (informational)                 |
| `NotificationSuccess`   | Count | EventType, Channel     | < 1 in 24h → alarm                  |
| `NotificationFailure`   | Count | EventType, ErrorType   | > 5 in 5min → alarm                 |
| `SuspiciousEmailDomain` | Count | None                   | Dashboard only (P3 - informational) |
| `RateLimited`           | Count | Service (Notify/Slack) | > 10 in 5min → alarm                |
| `AuthFailure`           | Count | Service                | > 0 → immediate alarm               |
| `ProcessingDuration`    | Timer | EventType              | p99 > 1s → alarm                    |

#### Alarms

| Alarm Name                        | Condition                   | Severity | Action                      | Risk Matrix            |
| --------------------------------- | --------------------------- | -------- | --------------------------- | ---------------------- |
| `ndx-notification-dlq-depth`      | DLQ messages > 0            | HIGH     | Chatbot → #ndx-infra-alerts | P2 - Urgent            |
| `ndx-notification-dlq-rate`       | DLQ messages > 50/5min      | CRITICAL | Chatbot → #ndx-infra-alerts | P1 - Immediate         |
| `ndx-notification-dlq-stale`      | DLQ > 0 for 24h             | CRITICAL | Chatbot → #ndx-infra-alerts | P3 - Standard _(new)_  |
| `ndx-notification-errors`         | Lambda errors > 5/5min      | HIGH     | Chatbot → #ndx-infra-alerts | P2 - Urgent            |
| `ndx-notification-error-rate`     | Error rate > 10%/5min       | CRITICAL | Chatbot → #ndx-infra-alerts | P1 - Immediate _(new)_ |
| `ndx-notification-auth-failures`  | AuthFailure > 0             | CRITICAL | Chatbot → #ndx-infra-alerts | P1 - Immediate         |
| `ndx-notification-secrets-expiry` | Secret age > 335 days       | MEDIUM   | Chatbot → #ndx-infra-alerts | P2 - Urgent _(new)_    |
| `ndx-notification-canary`         | NotificationSuccess = 0/24h | MEDIUM   | Chatbot → #ndx-infra-alerts | P3 - Standard          |

**Risk Matrix Applied:** Three new alarms added based on risk analysis:

**Value Chain Applied:** All alarms MUST include `runbook_url` in description field linking to remediation steps in ops documentation. Format: `https://docs.ndx.gov.uk/runbooks/notifications/{alarm-name}`

- `dlq-stale`: Catches stuck DLQ processing (missed in original design)
- `error-rate`: Percentage-based detection for low-volume systems
- `secrets-expiry`: Proactive warning before credential failure

**Optional (Growth Phase):** 4-hour business hours canary for faster detection during work hours.

#### Dashboards

**NDX Notifications Dashboard (CloudWatch):**

```
┌─────────────────────────────────────────────────────────────┐
│ NDX Notifications - Operational Dashboard                   │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐       │
│ │ Events/hour   │ │ Success Rate  │ │ DLQ Depth     │       │
│ │     42        │ │    99.8%      │ │      0        │       │
│ └───────────────┘ └───────────────┘ └───────────────┘       │
├─────────────────────────────────────────────────────────────┤
│ Events by Type (24h)              │ Errors by Type (24h)    │
│ ████████ LeaseApproved (45%)      │ ▓▓ ValidationError (2)  │
│ ████ LeaseFrozen (20%)            │ ▓ NetworkTimeout (1)    │
│ ███ BudgetAlert (15%)             │                         │
│ ██ Other (20%)                    │                         │
├─────────────────────────────────────────────────────────────┤
│ Processing Latency (p50/p95/p99)  │ Lambda Invocations      │
│ 120ms / 280ms / 450ms             │ [sparkline graph]       │
└─────────────────────────────────────────────────────────────┘
```

#### Tracing

- **X-Ray**: Enabled on Lambda for distributed tracing
- **Correlation ID**: `event.id` propagated through all log entries
- **Service Map**: Shows EventBridge → Lambda → DLQ flow

## Dependencies and Integrations

### External Dependencies

| Dependency                   | Type         | Version | Purpose                      | Risk Level            |
| ---------------------------- | ------------ | ------- | ---------------------------- | --------------------- |
| **Innovation Sandbox (ISB)** | AWS Service  | N/A     | Event source via EventBridge | HIGH - Schema changes |
| **GOV.UK Notify**            | External API | v2      | Email delivery (N-5)         | LOW - Stable API      |
| **Slack Webhooks**           | External API | N/A     | Ops alerts (N-6)             | LOW - Simple webhook  |
| **AWS Lambda Powertools**    | npm package  | ^2.0.0  | Logger, Metrics, Idempotency | LOW - AWS maintained  |
| **Zod**                      | npm package  | ^3.22.0 | Schema validation            | LOW - Widely used     |

**PESTLE Governance Note:** ISB is a separate department (CDDO). Cross-account EventBridge access requires:

1. Technical access (EventBridge resource policy) - covered in n4-2
2. Governance approval (data sharing agreement) - verify with ISB team during n4-9 coordination
3. Cost allocation agreement (ISB pays EventBridge egress) - confirm before go-live

### AWS Service Dependencies

| Service             | Resource                       | Access Pattern            | Failure Impact            |
| ------------------- | ------------------------------ | ------------------------- | ------------------------- |
| **EventBridge**     | ISB-{namespace}-ISBEventBus    | Subscribe (cross-account) | No events received        |
| **Lambda**          | ndx-notification-handler       | Invocation target         | Processing stops          |
| **SQS**             | ndx-notification-dlq           | Dead letter queue         | Failed events lost        |
| **DynamoDB**        | NdxIdempotency                 | Read/Write                | Duplicate notifications   |
| **Secrets Manager** | /ndx/notifications/credentials | GetSecretValue            | Auth failures             |
| **CloudWatch**      | Logs, Metrics, Alarms          | Write                     | No observability          |
| **SNS**             | ndx-notification-alarms        | Publish                   | Alarms not delivered      |
| **AWS Chatbot**     | Slack workspace config         | Receive SNS               | Infra alerts not in Slack |

### ISB Integration Details

**EventBridge Cross-Account Subscription:**

```
ISB Account                         NDX Account
┌─────────────────┐                ┌─────────────────┐
│ ISB EventBridge │ ──Event──────▶ │ EventBridge     │
│ Bus             │                │ Rule            │
│                 │                │                 │
│ Resource Policy │                │ Pattern:        │
│ allows NDX      │                │ - source        │
│ account access  │                │ - account       │
└─────────────────┘                │ - detail-type   │
                                   └────────┬────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │ Lambda Handler  │
                                   └─────────────────┘
```

**ISB EventBridge Bus Resource Policy (required on ISB side):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowNDXSubscription",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::NDX_ACCOUNT_ID:root"
      },
      "Action": "events:PutRule",
      "Resource": "arn:aws:events:REGION:ISB_ACCOUNT_ID:event-bus/ISB-*-ISBEventBus"
    }
  ]
}
```

### NPM Package Dependencies

```json
// package.json (Lambda)
{
  "dependencies": {
    "@aws-lambda-powertools/logger": "^2.0.0",
    "@aws-lambda-powertools/metrics": "^2.0.0",
    "@aws-lambda-powertools/idempotency": "^2.0.0",
    "@aws-sdk/client-secrets-manager": "^3.0.0",
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.0",
    "esbuild": "^0.19.0",
    "typescript": "^5.0.0"
  }
}

**PESTLE Version Pinning Policy:** Use caret (^) for patch/minor updates but lock major versions. Before upgrading major versions (especially Zod v4), review changelog for breaking changes. CDK version must match project root package.json.
```

### CDK Dependencies

```json
// package.json (infra)
{
  "dependencies": {
    "aws-cdk-lib": "^2.100.0",
    "constructs": "^10.0.0"
  }
}
```

### Integration Points

| Integration           | Direction | Protocol    | Data Format        | Auth                |
| --------------------- | --------- | ----------- | ------------------ | ------------------- |
| ISB → NDX             | Inbound   | EventBridge | JSON (ISB schema)  | IAM cross-account   |
| NDX → Secrets Manager | Outbound  | AWS SDK     | JSON               | IAM role            |
| NDX → DynamoDB        | Outbound  | AWS SDK     | DynamoDB item      | IAM role            |
| NDX → CloudWatch      | Outbound  | AWS SDK     | Metrics/Logs       | IAM role            |
| NDX → SQS (DLQ)       | Outbound  | AWS SDK     | JSON               | IAM role            |
| CloudWatch → SNS      | Internal  | AWS         | Alarm notification | IAM                 |
| SNS → Chatbot         | Internal  | AWS         | Formatted message  | IAM                 |
| Chatbot → Slack       | Outbound  | HTTPS       | Slack blocks       | OAuth (AWS managed) |

### Story Dependencies (Implementation Order)

```
n4-1: CDK Stack Structure
  │
  ├──▶ n4-2: EventBridge Subscription
  │       │
  │       └──▶ n4-3: Lambda Handler
  │               │
  │               └──▶ n4-4: DLQ Configuration
  │                       │
  │                       └──▶ n4-5: Secrets Manager
  │                               │
  │                               └──▶ n4-6: CloudWatch Alarms + Dashboard
  │                                       │
  │                                       └──▶ [OPS READINESS] *Value Chain*
  │
  ├──▶ n4-7: Secrets Rotation (parallel after n4-5)
  │
  ├──▶ n4-8: SQS Buffer [CONDITIONAL] (parallel after n4-2)
  │
  └──▶ n4-9: Schema Versioning Docs (parallel, no code dependency)

**Value Chain Note:** n4-6 (dashboard + alarms with runbook links) is on CRITICAL PATH for ops readiness. Ops team cannot effectively support the system without unified visibility.
```

### External Team Dependencies (Stakeholder Mapped)

| Team              | Dependency                      | Status         | Priority      | RACI | Action Required                         |
| ----------------- | ------------------------------- | -------------- | ------------- | ---- | --------------------------------------- |
| **ISB Team**      | EventBridge bus resource policy | ⚠️ Not Engaged | 🔴 P0 BLOCKER | R/A  | Request cross-account access            |
| **ISB Team**      | Schema documentation            | ⚠️ Not Engaged | 🔴 P0         | R/A  | n4-9 coordination                       |
| **Security Team** | Secrets Manager secret creation | ⚠️ Not Engaged | 🟡 P1         | R/A  | Create `/ndx/notifications/credentials` |
| **Security Team** | IAM policy review               | ⚠️ Not Engaged | 🟡 P1         | R/A  | Review Lambda role permissions          |
| **Platform Team** | AWS Chatbot workspace           | ⚠️ Not Engaged | 🟢 P2         | R/A  | Configure Slack workspace               |
| **Ops Team**      | Alert threshold review          | ⚠️ Not Engaged | 🟢 P2         | R/A  | Review alarm design                     |
| **DPO**           | GDPR compliance review          | ⚠️ Not Engaged | 🟡 P1         | C    | Verify PII handling approach            |

### Stakeholder Engagement Timeline

| Week           | Stakeholder   | Activity                                    | Blocker? |
| -------------- | ------------- | ------------------------------------------- | -------- |
| **Week 0**     | ISB Team      | Kickoff meeting, request EventBridge access | YES      |
| **Week 0**     | Security Team | Submit secret creation request              | NO       |
| **Week 1**     | Platform Team | Verify Chatbot, request Slack setup         | NO       |
| **Week 1**     | ISB Team      | Receive schema documentation                | NO       |
| **Week 2**     | Ops Team      | Share alarm design, gather feedback         | NO       |
| **Week 2**     | Security Team | IAM policy review                           | NO       |
| **Pre-launch** | All           | Go-live coordination call                   | NO       |

### Critical Path: ISB Team is Blocker

```
ISB Team EventBridge Access ──▶ n4-2 can be tested ──▶ All subsequent stories
         ⚠️ BLOCKER
```

**Immediate Action Required:** Schedule ISB Team kickoff meeting before starting n4-2.

### Pre-Deployment Checklist

- [ ] ISB EventBridge bus accessible from NDX account
- [ ] AWS Chatbot configured with Slack workspace
- [ ] Secrets Manager secret created with placeholder values
- [ ] ISB team notified of notification system go-live
- [ ] Slack channels created: `#ndx-infra-alerts`, `#ndx-ops-alerts`
- [ ] _PESTLE_: ISB data sharing governance approval obtained
- [ ] _PESTLE_: ISB cost allocation agreement confirmed (EventBridge egress costs)

## Acceptance Criteria (Authoritative)

### n4-1: CDK Stack and Project Structure

| AC     | Criteria                                                                                             | Verification          |
| ------ | ---------------------------------------------------------------------------------------------------- | --------------------- |
| AC-1.1 | NotificationStack class compiles without TypeScript errors                                           | `yarn build` passes   |
| AC-1.2 | Project structure matches architecture spec (notification-stack.ts, handler.ts, types.ts, errors.ts) | File inspection       |
| AC-1.3 | `cdk synth NotificationStack` produces valid CloudFormation                                          | CDK CLI output        |
| AC-1.4 | Stack added to `bin/infra.ts` app definition                                                         | Code review           |
| AC-1.5 | Stack name is `NdxNotificationStack`                                                                 | CloudFormation output |
| AC-1.6 | Uses NodejsFunction for Lambda with esbuild bundling                                                 | CDK assertion test    |

### n4-2: EventBridge Subscription to ISB Bus

| AC       | Criteria                                                                                                          | Verification                          |
| -------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| AC-2.1   | EventBridge rule targets notification Lambda                                                                      | CDK assertion test                    |
| AC-2.2   | Rule filters for 13 detail-types (LeaseRequested through AccountDriftDetected)                                    | CDK assertion test                    |
| AC-2.3   | Rule includes account-level filter (`account: [ISB_ACCOUNT_ID]`)                                                  | CDK assertion test + Red Team         |
| AC-2.3.1 | Integration test: Inject event with spoofed account field → EventBridge rule rejects it (account field immutable) | Integration test (staging) + Red Team |
| AC-2.4   | Event metadata preserved (timestamp, event ID, source)                                                            | Integration test                      |
| AC-2.5   | Lambda receives full event payload on rule match                                                                  | Integration test                      |
| AC-2.6   | Rule name is `ndx-notification-rule`                                                                              | CloudFormation output                 |
| AC-2.7   | Namespace sourced from `lib/config.ts`                                                                            | Code review                           |

### n4-3: Lambda Handler with Security Controls

| AC       | Criteria                                                                                                | Verification                           |
| -------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| AC-3.1   | Handler validates `event.source` in allowed list (`['innovation-sandbox']`)                             | Unit test                              |
| AC-3.1.1 | Unit test: Handler receives event with `source: 'attacker-service'` → rejects with SecurityError        | Unit test + Red Team                   |
| AC-3.2   | Unauthorized sources rejected with SecurityError logged                                                 | Unit test + log inspection             |
| AC-3.3   | Lambda Powertools Logger configured with service name `ndx-notifications`                               | Log inspection                         |
| AC-3.4   | Structured JSON logs include eventId, eventType, processing status                                      | Log inspection                         |
| AC-3.5   | Lambda has 256MB memory, 30s timeout, Node.js 20.x runtime                                              | CDK assertion test                     |
| AC-3.6   | Reserved concurrency = 10                                                                               | CDK assertion test + Devil's Advocate  |
| AC-3.6.1 | Load test validates 10 concurrent executions sustains ≥10K events/month without throttling              | Load test (staging) + Devil's Advocate |
| AC-3.6.2 | Unit test: Handler timeout = 30s; events taking >30s are killed (prevents slow event DoS)               | Unit test + Red Team                   |
| AC-3.7   | `SuspiciousEmailDomain` metric emitted for non-.gov.uk emails                                           | Unit test + Red Team                   |
| AC-3.7.1 | Unit test: Event with non-.gov.uk email → `SuspiciousEmailDomain` metric incremented                    | Unit test + Red Team                   |
| AC-3.8   | Log levels: ERROR for DLQ-worthy, WARN for retries, INFO for success                                    | Log inspection                         |
| AC-3.8.1 | Unit test: Event with newline in detail-type → logs structured JSON with escaped newline (no injection) | Unit test + Red Team                   |
| AC-3.9   | Idempotency key derived from `event.id` (EventBridge-provided, not custom)                              | Unit test + Devil's Advocate           |
| AC-3.9.1 | Code comment documents why event.id is required (duplicate notifications = security issue)              | Code review + RCA                      |
| AC-3.10  | Email addresses logged as `[REDACTED]` on security events                                               | Log inspection + GDPR                  |

### n4-4: Dead Letter Queue and Retry Configuration

| AC      | Criteria                                                                                             | Verification                            |
| ------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| AC-4.1  | Failed events sent to DLQ after 3 retry attempts                                                     | Integration test                        |
| AC-4.2  | DLQ message includes: original event payload, error message, attempt count                           | DLQ message inspection                  |
| AC-4.3  | DLQ retention is 14 days                                                                             | CDK assertion test                      |
| AC-4.4  | DLQ encrypted at rest (SQS_MANAGED)                                                                  | CDK assertion test                      |
| AC-4.5  | Lambda retry configuration: 2 retries before DLQ                                                     | CDK assertion test                      |
| AC-4.6  | Queue name is `ndx-notification-dlq`                                                                 | CloudFormation output                   |
| AC-4.7  | DLQ sends logged at ERROR level                                                                      | Log inspection                          |
| AC-4.8  | Pre-deployment baseline: DLQ depth = 0 (healthy state validation)                                    | Manual verification + Devil's Advocate  |
| AC-4.9  | Ops runbook documents DLQ purge procedure if approaching capacity                                    | Documentation review + Devil's Advocate |
| AC-4.10 | IAM policy audit: Only Lambda has SendMessage; only ops team has ReceiveMessage/DeleteMessage on DLQ | IAM policy review + Red Team            |

### n4-5: Secrets Manager Integration

| AC     | Criteria                                                                                               | Verification                                |
| ------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| AC-5.1 | Lambda retrieves credentials from `/ndx/notifications/credentials`                                     | Integration test                            |
| AC-5.2 | Secret value cached in Lambda memory for container lifetime                                            | Code review + performance test              |
| AC-5.3 | Secrets Manager errors fail gracefully (log, send to DLQ)                                              | Unit test                                   |
| AC-5.4 | Lambda IAM role has `secretsmanager:GetSecretValue` permission                                         | CDK assertion test                          |
| AC-5.5 | Resource policy restricts secret access to Lambda role only                                            | CDK assertion test + Red Team (code review) |
| AC-5.6 | Secret JSON structure: `{ notifyApiKey, slackWebhookUrl }`                                             | Documentation                               |
| AC-5.7 | Dependency security: `yarn audit` passes with no critical vulns; npm packages pinned to exact versions | Automated security scan + Red Team          |
| AC-5.8 | Unit test: If Secrets Manager returns new version, cache is invalidated on next request                | Unit test + Red Team                        |

### n4-6: CloudWatch Alarms and Monitoring

| AC        | Criteria                                                                                                                  | Verification                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| AC-6.1    | Alarm: DLQ depth > 0 messages triggers `ndx-notification-dlq-depth`                                                       | CDK assertion test + RCA (detects current failures)                                           |
| AC-6.2    | Alarm: Lambda errors > 5/5min triggers `ndx-notification-errors`                                                          | CDK assertion test + RCA (detects code bugs)                                                  |
| AC-6.3    | Alarm: Zero invocations 24h triggers `ndx-notification-canary`                                                            | CDK assertion test + RCA (detects silent death)                                               |
| AC-6.4    | Alarm: DLQ rate > 50/5min triggers `ndx-notification-dlq-rate`                                                            | CDK assertion test + Red Team + RCA (detects flooding)                                        |
| AC-6.5    | Alarm: Auth failures (401/403) triggers immediate CRITICAL alarm                                                          | CDK assertion test + Pre-mortem + RCA (auth = credential issue, different SLA than code bugs) |
| AC-6.6    | Alarm: Error rate > 10%/5min triggers `ndx-notification-error-rate`                                                       | CDK assertion test + Risk Matrix + RCA (detects slow ramp of errors)                          |
| AC-6.7    | Alarm: DLQ > 0 for 24h triggers `ndx-notification-dlq-stale`                                                              | CDK assertion test + Risk Matrix + RCA (detects stuck processing)                             |
| AC-6.8    | Alarm: Secret age > 335 days triggers `ndx-notification-secrets-expiry`                                                   | CDK assertion test + Risk Matrix + RCA (proactive credential lifecycle)                       |
| AC-6.9    | All alarms publish to SNS topic                                                                                           | CDK assertion test                                                                            |
| AC-6.10   | AWS Chatbot configured for `#ndx-infra-alerts` channel                                                                    | Manual verification                                                                           |
| AC-6.11   | Chatbot alerts function independently of notification Lambda failure                                                      | Staging integration test (manual) + Devil's Advocate                                          |
| AC-6.12   | Custom metrics published: `NotificationSuccess`, `NotificationFailure`                                                    | Integration test                                                                              |
| AC-6.13   | CloudWatch Dashboard includes: Events/hour, Success Rate, DLQ Depth, EventsReceivedFromISB                                | Dashboard inspection + Service Blueprint/Value Chain                                          |
| AC-6.14   | All alarms include `runbook_url` in description                                                                           | CDK assertion test + Value Chain                                                              |
| AC-6.15   | DLQ processing includes ops notification for failed events                                                                | Code review + Service Blueprint                                                               |
| AC-6.16   | Incident response template documented with email lookup procedure                                                         | Documentation review + Journey Mapping + RCA                                                  |
| AC-6.17   | No user PII (emails) in Slack ops channel messages - account IDs only                                                     | Code review + PESTLE/GDPR + RCA (GDPR mandate)                                                |
| AC-6.18   | Security requirement: Webhook URL never logged or output to console; if Secrets Manager call fails, log `[REDACTED]` only | Code review + Red Team                                                                        |
| AC-6.11.1 | Documentation: Slack webhook URL restricted to Chatbot integration only; no other integrations allowed                    | Documentation review + Red Team                                                               |

### n4-7: Secrets Rotation (Pre-mortem Addition)

| AC     | Criteria                                                                                                                                    | Verification                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| AC-7.1 | Secret rotation runbook documented                                                                                                          | Documentation review             |
| AC-7.2 | Proactive alarm: secret age > 335 days (30 days before 1-year rotation)                                                                     | CDK assertion test + Risk Matrix |
| AC-7.3 | Rotation procedure tested in staging                                                                                                        | Manual verification              |
| AC-7.4 | Documentation explains why separate auth failure alarm (AC-6.5) exists: auth = credential issue, requires different response than code bugs | Documentation review + RCA       |

### n4-8: SQS Buffer Queue (CONDITIONAL - Devil's Advocate)

| AC     | Criteria                                                                           | Verification          |
| ------ | ---------------------------------------------------------------------------------- | --------------------- |
| AC-8.1 | **CONDITIONAL**: Only implement if ISB confirms batch operations (>100 events/min) | ISB team confirmation |
| AC-8.2 | If implemented: SQS queue between EventBridge and Lambda                           | CDK assertion test    |
| AC-8.3 | If implemented: Rate limiting protection functional                                | Load test             |

### n4-9: Schema Versioning Strategy (SWOT Critical Path)

| AC     | Criteria                                                                         | Verification                           |
| ------ | -------------------------------------------------------------------------------- | -------------------------------------- |
| AC-9.1 | Regular sync cadence established with ISB team                                   | Meeting notes                          |
| AC-9.2 | Schema change notification process documented                                    | Documentation review                   |
| AC-9.3 | Backwards-compatible handling strategy documented (Zod `.passthrough()` pattern) | Code review                            |
| AC-9.4 | Staging EventBridge setup documented for N-5/N-6 developers                      | Documentation review + Journey Mapping |
| AC-9.5 | ISB data sharing governance approval obtained                                    | Governance sign-off + PESTLE           |
| AC-9.6 | ISB cost allocation agreement confirmed (EventBridge egress)                     | Agreement document + PESTLE            |

## Traceability Mapping

### Story → Functional Requirements

| Story    | FRs Covered                                                                                                | Description                                         |
| -------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **n4-1** | -                                                                                                          | Foundation (no direct FR, enables all others)       |
| **n4-2** | FR-NOTIFY-1, FR-NOTIFY-2, FR-NOTIFY-3, FR-SLACK-1, FR-SLACK-2, FR-SLACK-4                                  | EventBridge rule, filtering, Lambda target          |
| **n4-3** | FR-NOTIFY-4, FR-NOTIFY-5, FR-NOTIFY-12, FR-NOTIFY-35, FR-SLACK-5, FR-SLACK-16, FR-SLACK-46                 | Event payload, metadata, logging                    |
| **n4-4** | FR-NOTIFY-32, FR-NOTIFY-33, FR-NOTIFY-34, FR-SLACK-43, FR-SLACK-44, FR-SLACK-45                            | DLQ, context, retry                                 |
| **n4-5** | FR-NOTIFY-37, FR-NOTIFY-38, FR-NOTIFY-39, FR-SLACK-48, FR-SLACK-49, FR-SLACK-50                            | Secrets retrieval, caching, error handling          |
| **n4-6** | FR-NOTIFY-40, FR-NOTIFY-41, FR-NOTIFY-42, FR-NOTIFY-43, FR-SLACK-51, FR-SLACK-52, FR-SLACK-53, FR-SLACK-54 | Alarms, metrics                                     |
| **n4-7** | FR-NOTIFY-39 (extended)                                                                                    | Secrets rotation (pre-mortem addition)              |
| **n4-8** | FR-NOTIFY-34 (enhanced)                                                                                    | Burst protection (conditional)                      |
| **n4-9** | -                                                                                                          | ISB coordination (SWOT critical path, no direct FR) |

### Functional Requirements → Story (Reverse Mapping)

| FR              | Story      | Status                  |
| --------------- | ---------- | ----------------------- |
| FR-NOTIFY-1     | n4-2       | In Scope                |
| FR-NOTIFY-2     | n4-2       | In Scope                |
| FR-NOTIFY-3     | n4-2       | In Scope                |
| FR-NOTIFY-4     | n4-3       | In Scope                |
| FR-NOTIFY-5     | n4-3       | In Scope                |
| FR-NOTIFY-6-31  | N-5        | Out of Scope (Epic N-5) |
| FR-NOTIFY-32    | n4-4       | In Scope                |
| FR-NOTIFY-33    | n4-4       | In Scope                |
| FR-NOTIFY-34    | n4-4       | In Scope                |
| FR-NOTIFY-35    | n4-3       | In Scope                |
| FR-NOTIFY-36    | N-5        | Out of Scope (Epic N-5) |
| FR-NOTIFY-37    | n4-5       | In Scope                |
| FR-NOTIFY-38    | n4-5       | In Scope                |
| FR-NOTIFY-39    | n4-5, n4-7 | In Scope                |
| FR-NOTIFY-40    | n4-6       | In Scope                |
| FR-NOTIFY-41    | n4-6       | In Scope                |
| FR-NOTIFY-42    | n4-6       | In Scope                |
| FR-NOTIFY-43    | n4-6       | In Scope                |
| FR-NOTIFY-44-48 | N-5        | Out of Scope (Epic N-5) |
| FR-SLACK-1      | n4-2       | In Scope                |
| FR-SLACK-2      | n4-2       | In Scope                |
| FR-SLACK-3-10   | Growth     | Deferred                |
| FR-SLACK-11-42  | N-6        | Out of Scope (Epic N-6) |
| FR-SLACK-43     | n4-4       | In Scope                |
| FR-SLACK-44     | n4-4       | In Scope                |
| FR-SLACK-45     | n4-4       | In Scope                |
| FR-SLACK-46     | n4-3       | In Scope                |
| FR-SLACK-47     | N-5        | Out of Scope (Epic N-5) |
| FR-SLACK-48     | n4-5       | In Scope                |
| FR-SLACK-49     | n4-5       | In Scope                |
| FR-SLACK-50     | n4-5       | In Scope                |
| FR-SLACK-51     | n4-6       | In Scope                |
| FR-SLACK-52     | n4-6       | In Scope                |
| FR-SLACK-53     | n4-6       | In Scope                |
| FR-SLACK-54     | n4-6       | In Scope                |

### Epic N-4 FR Coverage Summary

| Category                | FRs                                       | Count  | Coverage    |
| ----------------------- | ----------------------------------------- | ------ | ----------- |
| EventBridge Integration | FR-NOTIFY-1-5, FR-SLACK-1-2, FR-SLACK-4-5 | 9      | ✅ 100%     |
| Error Handling          | FR-NOTIFY-32-35, FR-SLACK-43-46           | 8      | ✅ 100%     |
| Secrets Management      | FR-NOTIFY-37-39, FR-SLACK-48-50           | 6      | ✅ 100%     |
| CloudWatch Monitoring   | FR-NOTIFY-40-43, FR-SLACK-51-54           | 8      | ✅ 100%     |
| **Total Epic N-4**      |                                           | **31** | ✅ **100%** |

### Elicitation-Added Requirements (Not in Original FRs)

| Requirement                      | Source            | Story         | Rationale                             |
| -------------------------------- | ----------------- | ------------- | ------------------------------------- |
| Account-level EventBridge filter | Red Team          | n4-2          | Prevent cross-account event injection |
| Reserved concurrency = 10        | Pre-mortem        | n4-3          | Blast radius limiting                 |
| `SuspiciousEmailDomain` metric   | Red Team          | n4-3          | Defense in depth for N-5              |
| DLQ rate alarm (>50/5min)        | Red Team          | n4-6          | Detect flooding attacks               |
| Auth failure immediate alarm     | Pre-mortem        | n4-6          | Fast response to credential issues    |
| Zero success 24h alarm (canary)  | Pre-mortem        | n4-6          | Detect silent death                   |
| Secret age alarm (335 days)      | Risk Matrix       | n4-7          | Proactive rotation warning            |
| DLQ stale alarm (24h)            | Risk Matrix       | n4-6          | Catch stuck processing                |
| Error rate alarm (>10%)          | Risk Matrix       | n4-6          | Percentage-based detection            |
| CloudWatch Dashboard             | Service Blueprint | n4-6          | Unified health visibility             |
| EventsReceivedFromISB metric     | Value Chain       | n4-6          | Inbound visibility                    |
| Runbook URLs in alarms           | Value Chain       | n4-6          | Ops remediation guidance              |
| Incident response template       | Journey Mapping   | n4-6          | Reduce ops hunting                    |
| Example event payloads           | Journey Mapping   | Tech Spec     | Developer experience                  |
| Mock event generator             | Journey Mapping   | Test Strategy | Testing efficiency                    |
| Staging EventBridge docs         | Journey Mapping   | n4-9          | N-5/N-6 dev enablement                |
| No PII in Slack                  | PESTLE            | n4-6          | GDPR compliance                       |
| ISB governance approval          | PESTLE            | n4-9          | Cross-department compliance           |
| ISB cost allocation              | PESTLE            | n4-9          | Budget clarity                        |
| Ops notification for DLQ         | Service Blueprint | n4-6          | Frontstage failure visibility         |

## Risks, Assumptions, Open Questions

### Risk Register

| ID   | Risk                                                       | Probability | Impact   | Mitigation                                                                                                                         | Owner     | Status |
| ---- | ---------------------------------------------------------- | ----------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| R-1  | ISB EventBridge schema changes without notice              | HIGH        | CRITICAL | n4-9 schema versioning story; ISB coordination (PESTLE); Require 2-week deprecation notice in SLA                                  | ISB/NDX   | Open   |
| R-2  | Manual DLQ replay becomes operational burden               | MEDIUM      | HIGH     | Implement async batch processing in n4-8 (conditional); Create playbook for replay scenarios; Set DLQ baseline in AC-4.8           | Ops       | Open   |
| R-3  | Secrets rotation TOCTOU window                             | MEDIUM      | MEDIUM   | Cache invalidation test (AC-5.8); Short rotation period (7 days max); Monitor secret version age                                   | SecOps    | Open   |
| R-4  | ISB source unavailable → no lease updates                  | MEDIUM      | HIGH     | Fallback polling mechanism (future epic); Status page monitoring; Customer comms plan                                              | ISB/Comms | Open   |
| R-5  | Slack workspace compromise → NDX notification leakage      | LOW         | CRITICAL | No PII in notifications (AC-6.17); Document Slack security assumptions; Add "verify Slack workspace ownership" to runbook          | NDX/Slack | Open   |
| R-6  | Reserved concurrency ceiling too low                       | LOW         | MEDIUM   | Load testing in staging (AC-3.6.1); Monitor EventsReceivedFromISB metric; Add CloudWatch alarm for throttling                      | Ops       | Open   |
| R-7  | DLQ message loss due to policy changes                     | LOW         | HIGH     | Regular IAM policy audit (AC-4.10); Infrastructure as Code review process; Automated policy testing                                | SecOps    | Open   |
| R-8  | GOV.UK Notify API rate limiting                            | LOW         | HIGH     | Implement exponential backoff (n4-3 error handling); Monitor NotificationsSentToNotify metric; Contact Notify support for increase | NDX       | Open   |
| R-9  | Cross-account EventBridge subscription permissioning error | LOW         | CRITICAL | Account field immutability test (AC-2.3.1); Pre-deployment checklist verification; Terraform apply review                          | DevOps    | Open   |
| R-10 | Event log injection attacks                                | MEDIUM      | MEDIUM   | Newline sanitization in logs (AC-3.8.1); Log parsing with structured JSON; RedTeam validation in pre-deploy                        | DevOps    | Open   |

**Risk Assessment Summary:**

- **Critical Path Risks**: R-1 (schema), R-9 (cross-account), R-5 (Slack compromise) require explicit governance/testing
- **Operational Risks**: R-2 (DLQ), R-4 (ISB unavailable) require runbook/comms preparation
- **Detection Gaps**: R-6, R-8 require metric-based monitoring and alerting (already specified in AC-6)

---

### Assumptions

**ISB Integration Assumptions**

- ISB will send events consistently (within SLA defined in n4-9 governance)
- ISB EventBridge source account remains 111122223333 for 12-month minimum
- Event schema backward compatibility: new fields added, existing fields never removed/renamed
- ISB team will provide 2-week notice of breaking schema changes
- ISB cost allocation: ISB covers EventBridge cross-account subscription costs

**AWS Service Assumptions**

- Lambda reserved concurrency scales appropriately for event volume (validated in AC-3.6.1)
- DynamoDB on-demand billing remains cost-effective (<$100/month projected)
- EventBridge delivery is "at least once" semantics (acknowledged via idempotency)
- CloudWatch Logs retention policy (14 days) sufficient for incident investigation
- Secrets Manager secret rotation completes within 5-second function timeout (verified in AC-5.8)

**Security Assumptions**

- Slack workspace (CDDO) will maintain administrative controls and monitor for compromise
- AWS EventBridge account filtering is immutable per AWS documentation
- GOV.UK Notify API credentials cannot be leaked via CloudWatch Logs (verified by PII redaction in AC-3.10)
- Email address spoofing requires ISB system compromise (external to NDX scope)
- No adversary has IAM permissions to modify Lambda resource policy or DLQ permissions

**Operational Assumptions**

- Ops team will review DLQ messages within 24 hours (per SLA in n4-4)
- CloudWatch alarms will trigger Slack notification (prerequisite: n4-6 deployment)
- Incident response team knows to check DLQ for failed lease notifications (per journey mapping requirement)
- CDK deployment has automated policy review workflow (pre-deployment checklist in n4-1)

**Data & Governance Assumptions**

- All users have gov.uk email addresses (ISB requirement; validation deferred to n4-2 event contract)
- GDPR compliance applies (UK data residency enforced at AWS account level)
- Cross-department ISB coordination required for schema changes (PESTLE dependency)
- NDX portal deep links in email templates are mandatory for UX (Journey Mapping requirement)

---

### Open Questions

**To ISB Team**

1. **Schema Versioning Strategy**: Will ISB use EventBridge custom headers for versioning, or require breaking changes at major versions only?
   - _Impact on n4-9_: Determines complexity of version detection logic
   - _Deadline_: Before n4-9 development starts

2. **Event Volume SLA**: What are peak event rates (events/minute) and burst capacity?
   - _Impact on n4-3_: Validates reserved concurrency=10 assumption (AC-3.6.1 load test)
   - _Deadline_: Before n4-3 pre-deployment review

3. **Cost Allocation**: Will ISB cover EventBridge cross-account subscription costs, or NDX?
   - _Impact on n4-1_: Budget planning and stakeholder communication
   - _Deadline_: Before go-live

4. **Fallback Strategy**: If ISB becomes unavailable, does NDX implement polling, manual update, or alert-only?
   - _Impact on Future Epic_: N-5 or later; not in n4 scope but design decision needed
   - _Deadline_: Before N-5 planning

**To SecOps Team** 5. **Slack Security Baseline**: Are there mandatory controls for the CDDO Slack workspace (e.g., IP allowlists, SSO enforcement)?

- _Impact on n4-6_: May require additional integration guards beyond no-PII policy
- _Deadline_: Before n4-6 deployment

6. **Secrets Rotation Cadence**: Is 7-day rotation acceptable, or does NDX require more frequent rotation?
   - _Impact on n4-7_: Implementation complexity and testing scope
   - _Deadline_: Before n4-7 development

7. **DLQ Message Retention**: Should failed notification messages be retained longer than 14 days for compliance audits?
   - _Impact on n4-4_: May require separate archival strategy
   - _Deadline_: Before n4-4 deployment

**To Architecture Team** 8. **CloudWatch Log Analysis**: Should n4-6 implement automated log parsing to detect error patterns, or rely on manual ops review?

- _Impact on n4-6_: Adds optional enhancement opportunity
- _Deadline_: Post-deployment (n4 or future iteration)

9. **Multi-Region Readiness**: Should n4 design for future multi-region replication, or assume single-region NDX?
   - _Impact on n4-1, n4-3_: Affects Lambda error handling and DynamoDB design
   - _Deadline_: Before n4-1 CDK design finalization

---

### Known Limitations & Workarounds

**Limitation 1: EventBridge Delivery Timing**

- EventBridge does not guarantee order or immediate delivery (burst delays of 1-5 seconds possible)
- _Workaround_: Accept eventual consistency model; add `eventTime` to email templates for user context
- _Story_: n4-5 (email templates must include lease update timestamp)

**Limitation 2: DLQ Manual Intervention**

- No automatic replay mechanism (intentionally deferred to n4-8 to reduce MVP complexity)
- _Workaround_: Create playbook for `aws sqs send-message-batch` with dead letter messages
- _Story_: n4-4 (include DLQ replay instructions in incident response template)

**Limitation 3: Slack Notification Timing**

- Slack delivery can be delayed 30-60 seconds during platform incidents
- _Workaround_: AWS Chatbot logs all messages (verification in AC-6.11); Ops can check CloudWatch for guaranteed receipt
- _Story_: n4-6 (runbook documents "how to verify Slack delivery" via CloudWatch Logs)

**Limitation 4: Idempotency Duration**

- Lambda Powertools idempotency cache persists for 1 hour (Lambda container lifetime)
- Duplicate events arriving >1 hour apart will retry notification send
- _Workaround_: Accept edge case; monitor DynamoDB idempotency table for duplicate patterns
- _Story_: n4-3 (AC-3.9.1 test covers only within-function-lifetime duplicates)

## Test Strategy Summary

### Test Coverage Matrix by Story

| Story                       | Unit Tests (CI/CD)                                                                                                                                                                                                               | Integration Tests (Staging)                                                                         | Load/Stress Tests                      | Manual Tests                                                              | Documentation Checklist                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **n4-1: CDK Stack**         | CDK snapshot tests (AC-1.1, AC-1.3)                                                                                                                                                                                              | Deploy to staging (AC-1.5)                                                                          | N/A                                    | Policy review (AC-1.4)                                                    | Runtime role docs (AC-1.6)                                                                 |
| **n4-2: EventBridge**       | Account field parsing (AC-2.3, AC-2.3.1)                                                                                                                                                                                         | Cross-account subscription (AC-2.2)                                                                 | N/A                                    | Manual source validation (AC-2.6)                                         | Event contract docs (AC-2.7)                                                               |
| **n4-3: Lambda Handler**    | Error classification (AC-3.1, AC-3.1.1); Flow logic (AC-3.2, AC-3.3); PII redaction (AC-3.10); Idempotency (AC-3.9, AC-3.9.1); Timeouts (AC-3.6, AC-3.6.2); Domain spoofing (AC-3.7, AC-3.7.1); Log injection (AC-3.8, AC-3.8.1) | Dead letter handling (AC-3.4); Metrics emission (AC-3.5)                                            | Reserved concurrency test (AC-3.6.1)   | Permission validation (AC-3.11)                                           | Handler comments (AC-3.12)                                                                 |
| **n4-4: DLQ**               | SQS message format (AC-4.1)                                                                                                                                                                                                      | DLQ delivery verification (AC-4.2); Error logs correlation (AC-4.3)                                 | N/A                                    | DLQ manual inspection (AC-4.8); IAM audit (AC-4.10)                       | DLQ runbook (AC-4.4, AC-4.5); Replay playbook (AC-4.6, AC-4.7); Incident template (AC-4.9) |
| **n4-5: Secrets**           | Rotation completeness (AC-5.1, AC-5.2); Handler behavior during rotation (AC-5.3); Resource policy (AC-5.5); PII in logs (AC-5.6)                                                                                                | Notification send without stale secret (AC-5.4); Cache invalidation (AC-5.8)                        | Secret lookup latency (AC-5.7 for CDN) | Secrets Manager console verification (AC-5.4 manual step)                 | Rotation frequency docs (AC-5.9); Security assumptions (AC-5.6)                            |
| **n4-6: Alarms**            | Alarm metric queries (AC-6.1–6.9)                                                                                                                                                                                                | Chatbot Slack delivery (AC-6.11, AC-6.11.1); Dashboard rendering (AC-6.12); Runbook links (AC-6.13) | Alert spam threshold (AC-6.14)         | Slack notification manual trigger (AC-6.10); Runbook link click (AC-6.15) | Runbook URLs (AC-6.13); Incident response (AC-6.16); PII log review (AC-6.18)              |
| **n4-7: Rotation Lambda**   | Rotation logic (AC-7.1, AC-7.2)                                                                                                                                                                                                  | Secrets Manager integration (AC-7.3)                                                                | N/A                                    | Manual rotation test (AC-7.4)                                             | Frequency configuration docs                                                               |
| **n4-8: SQS Buffer**        | Batch processing logic (AC-8.1)                                                                                                                                                                                                  | DLQ overflow simulation (AC-8.2)                                                                    | Throughput under load                  | Manual batch behavior (AC-8.3)                                            | Buffer architecture docs (conditional)                                                     |
| **n4-9: Schema Versioning** | Version detection (AC-9.1); Forward/backward compat (AC-9.2, AC-9.3)                                                                                                                                                             | ISB coordination test (AC-9.4)                                                                      | Schema migration perf (AC-9.5)         | Manual version bump (AC-9.6)                                              | ISB contract docs (AC-9.7)                                                                 |

---

### Test Strategy by Category

#### 1. Unit Tests (CI/CD, pre-deployment)

**Objective**: Catch logic errors, security vulnerabilities, and assumptions violations before deploy.

**Technologies**: Jest, TypeScript type checking, mocked AWS SDK

- **Error Classification Tests** (n4-3):
  - Test `classifyError()` returns correct type for each HTTP status code
  - Verify SecurityError for 401, 403; RetriableError for 429, 5xx; PermanentError for 400, 422
  - Example: `expect(classifyError(new Error(), 429)).toBeInstanceOf(RetriableError)`

- **PII Redaction Tests** (n4-3):
  - Verify email addresses logged as `[REDACTED]`
  - Verify Notify API tokens never appear in CloudWatch
  - Example: `expect(sanitizedLog).not.toMatch(/test@gov\.uk/)`

- **Idempotency Key Tests** (n4-3):
  - Verify duplicate event.id calls idempotency cache, not Notify API
  - Test cache expiration after function lifetime
  - Example: `expect(notifyApiCall).toHaveBeenCalledTimes(1)` for 2 identical events

- **CDK Snapshot Tests** (n4-1):
  - Capture full CloudFormation template (JSON snapshot)
  - Detects unintended infrastructure changes
  - Run via: `yarn test -- --updateSnapshot` (reviewed before commit)

- **EventBridge Account Parsing** (n4-2):
  - Verify source account extracted correctly
  - Test with malformed account fields
  - Example: `expect(extractAccountId(event)).toBe('111122223333')`

- **Alarm Metric Queries** (n4-6):
  - Snapshot of alarm definitions (metric name, threshold, period)
  - Catch typos or threshold changes

---

#### 2. Integration Tests (Staging environment, pre-deployment)

**Objective**: Validate cross-service interactions and AWS service integration.

**Technologies**: Real AWS services in staging account, test event generators

- **EventBridge Cross-Account Subscription** (n4-2):
  - Create test event in ISB staging account
  - Verify NDX Lambda receives event
  - Check CloudWatch logs contain event ID and timestamp

- **Lambda DLQ Delivery** (n4-3):
  - Invoke Lambda with invalid email
  - Verify error logged to CloudWatch
  - Verify message sent to SQS Dead Letter Queue
  - Example: `expect(dlqMessage.Body).toContain('PermanentError')`

- **Secrets Manager Integration** (n4-5):
  - Pre-deploy: Create test secret in staging account with test value
  - Lambda reads secret, uses in Notify API call
  - Verify notification sent successfully
  - Verify no secret value in CloudWatch logs

- **Chatbot Slack Delivery** (n4-6):
  - Trigger CloudWatch alarm in staging
  - Verify message appears in NDX staging Slack channel
  - Verify alarm name and metric value are visible
  - Verify runbook link is clickable

- **Dashboard Rendering** (n4-6):
  - Deploy CloudWatch dashboard
  - Verify all 4 widgets render (no missing metrics)
  - Verify legend shows all event types

---

#### 3. Load & Stress Tests (Staging, pre-deployment)

**Objective**: Validate performance assumptions and identify breaking points.

**Technologies**: Artillery, k6, or AWS Lambda load test framework

- **Reserved Concurrency Test** (n4-3):
  - Generate 50 concurrent EventBridge events in 10-second window
  - Monitor Lambda: `ConcurrentExecutions` metric
  - Verify max concurrency ≤ 10 (reserved level)
  - Verify excess events throttled and retried by EventBridge
  - Threshold: p99 duration < 5s, 0 timeout errors

- **DynamoDB Idempotency Throughput** (n4-3):
  - Generate 100 events/second for 60 seconds
  - Monitor DynamoDB: `ConsumedWriteCapacityUnits`
  - Verify on-demand billing handles load without errors
  - Threshold: p99 write latency < 100ms

---

#### 4. Manual Tests (Staging & Production)

**Objective**: Verify end-to-end workflows and operator procedures.

**Testing Approach**: Run as documented playbooks; document results in story

- **DLQ Manual Inspection** (n4-4):
  - Query DLQ via AWS Console: `aws sqs receive-message --queue-url <dlq-url> --max-number-of-messages 10`
  - Verify message format: `{ messageId, timestamp, error, eventId, eventType }`
  - Verify timestamp is readable
  - Document results: "✅ DLQ messages human-readable, timestamp in ISO 8601"

- **Secrets Manager Manual Rotation** (n4-7):
  - Create new Notify API key manually in Notify
  - Update Secrets Manager secret with new value
  - Invoke Lambda manually with test event
  - Verify notification sent via Notify portal
  - Document: "✅ Lambda used rotated secret without errors"

- **Slack Notification Manual Trigger** (n4-6):
  - Manually create CloudWatch alarm state change (via Console)
  - Verify Slack notification appears in CDDO channel within 30 seconds
  - Verify message contains alarm name, severity, runbook link
  - Document: "✅ Slack notification received, runbook link clickable"

- **Runbook Link Validation** (n4-6):
  - Click runbook link from Slack notification
  - Verify wiki page loads (Notion or GitHub Pages)
  - Verify DLQ handling instructions present

- **Cross-Account EventBridge Validation** (n4-2):
  - Verify ISB staging can successfully send event to NDX staging
  - Check CloudWatch Logs for event receipt confirmation
  - Verify no authentication errors

---

### Test Execution Timeline

| Phase                                         | Story                        | Duration      | Gate                              | Go/No-Go                      |
| --------------------------------------------- | ---------------------------- | ------------- | --------------------------------- | ----------------------------- |
| **Phase 1: Unit Tests**                       | n4-1, n4-2, n4-3, n4-6       | 20 minutes    | Jest passes 100% (CI/CD)          | Must pass                     |
| **Phase 2: CDK Snapshot Tests**               | n4-1                         | 10 minutes    | Snapshot diff reviewed + approved | Must pass                     |
| **Phase 3: Type Checking**                    | All                          | 5 minutes     | TypeScript compile 0 errors       | Must pass                     |
| **Phase 4: Linting**                          | All                          | 5 minutes     | ESLint 0 errors                   | Must pass                     |
| **Phase 5: Integration Tests (Staging)**      | n4-2, n4-3, n4-4, n4-5, n4-6 | 30 minutes    | All assertions pass               | Must pass                     |
| **Phase 6: Load Tests (Staging)**             | n4-3                         | 15 minutes    | p99 < 5s, 0 timeouts              | Must pass                     |
| **Phase 7: Manual Validation (Staging/Prod)** | n4-4, n4-6, n4-7             | 1 hour        | Ops team sign-off                 | Must pass                     |
| **Total Estimated Time**                      |                              | **1.5 hours** |                                   | Pre-deploy checklist complete |

---

### Pre-Deployment Checklist

**Story n4-1: CDK Stack**

- [ ] CDK snapshot test updated and reviewed
- [ ] `yarn build` runs clean (0 TypeScript errors)
- [ ] `yarn lint` runs clean (0 ESLint errors)
- [ ] IAM policy review: All least-privilege permissions documented in AC-1.4
- [ ] CloudFormation parameter review: correct AWS region, account ID, source account (111122223333)

**Story n4-2: EventBridge**

- [ ] EventBridge rule exists in NDX account, source matches ISB account (111122223333)
- [ ] Cross-account permission verified (ISB can PutEvents to NDX EventBridge)
- [ ] Test event sent from ISB staging → NDX staging Lambda receives event

**Story n4-3: Lambda Handler**

- [ ] Jest unit tests pass: `yarn test -- src/handlers/notification.test.ts`
- [ ] All error types tested (SecurityError, RetriableError, PermanentError, CriticalError)
- [ ] PII redaction test passes (no gov.uk emails in CloudWatch)
- [ ] Load test passes (AC-3.6.1: reserved concurrency ≤ 10)
- [ ] Handler deployed to staging, invoked with test event (no timeout errors)
- [ ] Comments added per AC-3.12 (idempotency key constraint documented)

**Story n4-4: DLQ**

- [ ] DLQ created, retention set to 14 days
- [ ] Error message flow tested: invalid email → Lambda error → SQS DLQ message
- [ ] DLQ message verified readable via AWS Console
- [ ] Incident response template created with DLQ inspection instructions
- [ ] DLQ baseline established (AC-4.8): ops team can inspect messages manually

**Story n4-5: Secrets**

- [ ] Secrets Manager secret created with Notify API key
- [ ] Lambda resource policy grants secret read permission (least privilege)
- [ ] Rotation Lambda created and tested manually
- [ ] Handler tested: reads secret, sends notification without errors
- [ ] PII redaction test passes (secret value not in CloudWatch)

**Story n4-6: Alarms**

- [ ] CloudWatch alarms created (8 alarms)
- [ ] Chatbot integration tested: trigger alarm → Slack notification
- [ ] Dashboard created with 4 widgets, all render without errors
- [ ] Runbook links verified (URLs return 200)
- [ ] Pre-deployment: Alarm thresholds reviewed by ops team

**Story n4-7: Rotation Lambda**

- [ ] Rotation Lambda tested manually in staging
- [ ] Secrets Manager rotation scheduled (7-day cadence)
- [ ] Rotation completion verified (new secret version created)
- [ ] Handler tested after rotation (reads new secret successfully)

**Story n4-8: SQS Buffer** (Conditional: only if ISB confirms batch operations)

- [ ] Batch processing logic tested (AC-8.1)
- [ ] DLQ overflow simulated (AC-8.2)

**Story n4-9: Schema Versioning**

- [ ] ISB event schema documented (AC-9.7)
- [ ] Version detection logic tested (AC-9.1)
- [ ] Backward compatibility verified (AC-9.2, AC-9.3)
- [ ] ISB coordination confirmed: 2-week notice for schema changes (per R-1)

---

### Success Criteria for Tech Spec Completion

The Technical Specification is complete when:

1. ✅ All 9 stories have detailed acceptance criteria (68 ACs total) ✅
2. ✅ Traceability mapping shows 100% FR coverage (102 FRs → story mapping) ✅
3. ✅ Risk Register identifies and mitigates 10 high/critical risks ✅
4. ✅ Test Coverage Matrix specifies testing approach for every AC ✅
5. ✅ Pre-Deployment Checklist has 40+ validation items (one per story + cross-cutting) ✅
6. ✅ Open Questions identified with impact analysis and deadlines ✅
7. ✅ Assumptions explicitly documented (ISB, AWS, Security, Operational, Data/Governance) ✅
8. ✅ Known Limitations addressed with workarounds ✅
9. ✅ All elicitation findings integrated (16 advanced elicitation methods applied) ✅

### Journey Mapping: Developer Experience Requirements

**Mock Event Generator Utility** (reduces developer "struggling" pain point):

- Create `test/utils/mock-events.ts` with factory functions for all 13 event types
- Each factory accepts partial overrides for flexible test scenarios
- Example usage: `mockLeaseApproved({ userEmail: 'test@gov.uk' })`

**N-5 Handoff Criteria** (ensures user journey completeness):

- Email templates MUST include deep link to NDX portal with lease ID
- Format: `https://ndx.gov.uk/leases/{leaseId.uuid}`
- Prevents user pain point of "email lacks deep link"

### Devil's Advocate: Test Strategy Refinements

**Test Verification Matrix** (clarifies unit vs integration vs manual):

| AC                              | Verification Type    | Environment | Timing      |
| ------------------------------- | -------------------- | ----------- | ----------- |
| AC-2.3, AC-3.1, AC-3.2          | Unit (mocked)        | CI/CD       | Pre-deploy  |
| AC-5.5 (resource policy)        | Unit (mocked)        | CI/CD       | Pre-deploy  |
| AC-3.6.1 (reserved concurrency) | Load test            | Staging     | Pre-deploy  |
| AC-4.1, AC-4.2                  | Integration          | Staging     | Pre-deploy  |
| AC-6.11 (Chatbot independence)  | Integration          | Staging     | Pre-deploy  |
| AC-1.5, AC-2.6, AC-5.6          | Documentation review | N/A         | Any time    |
| AC-4.8 (DLQ baseline)           | Manual               | Production  | Post-deploy |

**Key Insight:** Security/flow ACs testable in CI/CD with mocks. Independence/load ACs require staging. Naming ACs deferred to documentation checklist.

**Idempotency Key Constraint** (prevent developer mistakes):
Add comment in handler code:

```typescript
// ⚠️ CRITICAL: Do NOT use custom idempotency key
// event.id is EventBridge-guaranteed globally unique
// Custom keys (e.g., leaseId+timestamp) risk collisions → duplicate notifications
const idempotencyKey = event.id
```
