# Epic Technical Specification: User Email Notifications

Date: 2025-11-27
Author: cns
Epic ID: n5
Status: Draft

---

## Overview

Epic N-5 implements the GOV.UK Notify integration to deliver professional, government-branded emails to Innovation Sandbox users. Building on the infrastructure foundation established in Epic N-4, this epic creates the "primary mouth" of the notification system - the user-facing email channel that communicates lease lifecycle events, budget warnings, and account status changes.

Users will receive clear, actionable notifications in a familiar GOV.UK format, ensuring they know exactly what's happening with their sandbox and what action to take. The implementation follows the "one brain, two mouths" architecture pattern, where the single Lambda handler (N-4) routes user notification events to GOV.UK Notify.

**Key Deliverables:**

- GOV.UK Notify SDK integration with `notifications-node-client`
- Zod schema validation for all ISB event types
- Email ownership verification against DynamoDB lease records
- 10 email templates covering lease lifecycle and monitoring events
- DynamoDB enrichment for personalisation fields
- Lambda Powertools idempotency to prevent duplicate emails

**Pre-mortem Stories Added:**

- n5-8: GOV.UK Notify sandbox E2E test (prevent template breakage)
- n5-9: Template field validation on startup (detect template drift early)
- n5-11: DLQ auto-retry mechanism (reduce ops burden)
- **+29 additional ACs** across 7 stories from catastrophic failure scenario analysis

**Stakeholder Stories Added:**

- n5-10: User notification preferences (opt-out, frequency controls for Growth phase)

## Pre-N-5 Dependency Checklist (MUST PASS BEFORE DEVELOPMENT)

**Critical Path Dependencies - Validate These Before Starting Epic N-5:**

| Dependency                | Status   | Validation                                                            | Sign-off    |
| ------------------------- | -------- | --------------------------------------------------------------------- | ----------- |
| **N-4 Complete**          | Required | NotificationHandler + NdxIdempotency + error classification working   | ☐ Dev Lead  |
| **ISB Tables Accessible** | Required | LeaseTable, SandboxAccountTable, LeaseTemplateTable exist + queryable | ☐ Data Team |
| **Notify API Available**  | Required | GOV.UK Notify sandbox + production endpoints accessible               | ☐ Ops       |
| **Secrets Manager**       | Required | API key provisioned at `/ndx/notifications/credentials`               | ☐ Ops       |
| **Lambda IAM Role**       | Required | DynamoDB GetItem/Query + Secrets Manager GetSecretValue permissions   | ☐ Ops       |
| **VPC Endpoint**          | Required | DynamoDB VPC endpoint configured (if ISB requires private access)     | ☐ Ops       |

**Note:** Do not start N-5 development until all critical path dependencies are validated and signed off.

## Objectives and Scope

### In Scope

- **GOV.UK Notify SDK Integration**: Use official `notifications-node-client` SDK with API key from Secrets Manager
- **Event Schema Validation**: Zod schemas for all 10 user notification event types with strict mode
- **Email Ownership Verification**: Cross-check `event.userEmail` against DynamoDB lease owner (MANDATORY - no bypass)
- **Lease Lifecycle Templates**: LeaseRequested, LeaseApproved, LeaseDenied, LeaseTerminated emails
- **Monitoring Alert Templates**: Budget warnings (50%, 75%, 90%), duration alerts, freeze/expiry notifications
- **DynamoDB Enrichment**: Read-only queries to ISB tables for missing personalisation fields
- **Idempotency**: Lambda Powertools with 24h TTL + 60s lease-level deduplication window
- **Pre-mortem additions**:
  - n5-8: E2E test with real GOV.UK Notify sandbox (catches template API changes)
  - n5-9: Startup validation of GOV.UK Notify template fields (detects drift before first email)
- **Stakeholder addition**:
  - n5-10: User notification preferences (DynamoDB storage, opt-out support) - foundation for Growth phase

### Out of Scope

- **Slack Alerts**: Covered in Epic N-6
- **SMS Notifications**: Future Growth phase
- **Email delivery tracking/callbacks**: Future Growth phase
- **Interactive email content**: Future Growth phase
- **Multi-language templates (Welsh)**: Future Growth phase

### Success Criteria

| Metric                 | Target      | Rationale                               |
| ---------------------- | ----------- | --------------------------------------- |
| Email delivery rate    | 99.5%       | GOV.UK Notify SLA                       |
| Event-to-email latency | < 5 seconds | Users receive timely notifications      |
| Duplicate email rate   | 0%          | Idempotency prevents confusion          |
| Ownership verification | 100%        | No emails to wrong recipients           |
| Template validation    | 100%        | All required fields present before send |

## System Architecture Alignment

### Architecture Document Reference

This epic implements the user notification components defined in [notification-architecture.md](../notification-architecture.md) and builds on infrastructure from [tech-spec-epic-n4.md](tech-spec-epic-n4.md).

### Key Architectural Decisions Applied

| ADR     | Decision                        | This Epic's Implementation                                    |
| ------- | ------------------------------- | ------------------------------------------------------------- |
| ADR-001 | Single Lambda for both channels | Add NotifySender module to existing handler                   |
| ADR-002 | TypeScript over Python          | Continue with NodejsFunction, add `notifications-node-client` |
| ADR-003 | Powertools idempotency          | Leverage existing NdxIdempotency table from N-4               |
| ADR-004 | Read-only DynamoDB access       | Query ISB tables for enrichment, no writes                    |
| ADR-006 | Security-first processing       | Email ownership verification before sending                   |

### Handler Integration

```
NotificationHandler (from N-4)
├── Source Validation ✓ (N-4)
├── Idempotency Check ✓ (N-4)
├── Log + Metrics ✓ (N-4)
│
├── Event Processing (N-5)  ← THIS EPIC
│   ├── Schema Validation (Zod)
│   ├── Ownership Verification (DynamoDB)
│   ├── Enrichment (DynamoDB)
│   └── NotifySender
│       ├── Template Selection
│       ├── Personalisation Mapping
│       └── GOV.UK Notify API Call
│
└── Error Classification ✓ (N-4)
```

### Components Added to Architecture

| Component    | File                                       | Purpose                                     |
| ------------ | ------------------------------------------ | ------------------------------------------- |
| NotifySender | `lib/lambda/notification/notify-sender.ts` | GOV.UK Notify SDK wrapper                   |
| Validation   | `lib/lambda/notification/validation.ts`    | Zod schema validation                       |
| Enrichment   | `lib/lambda/notification/enrichment.ts`    | DynamoDB queries                            |
| Templates    | `lib/lambda/notification/templates.ts`     | Template registry + personalisation mapping |

## Detailed Design

### Services and Modules

| Module           | File                                       | Responsibility                              | Inputs                              | Outputs                  |
| ---------------- | ------------------------------------------ | ------------------------------------------- | ----------------------------------- | ------------------------ |
| **NotifySender** | `lib/lambda/notification/notify-sender.ts` | GOV.UK Notify API wrapper                   | Template ID, email, personalisation | Notify response          |
| **Validation**   | `lib/lambda/notification/validation.ts`    | Zod schema validation (strict mode)         | Raw event                           | Validated event or error |
| **Enrichment**   | `lib/lambda/notification/enrichment.ts`    | DynamoDB queries for missing fields         | LeaseKey, required fields           | Enriched data            |
| **Templates**    | `lib/lambda/notification/templates.ts`     | Template registry + personalisation mapping | Event type                          | Template config          |
| **Preferences**  | `lib/lambda/notification/preferences.ts`   | User notification preferences               | userEmail                           | Preference record        |

#### NotifySender Class

```typescript
// notify-sender.ts
import { NotifyClient } from "notifications-node-client"

export class NotifySender {
  private client: NotifyClient
  private static instance: NotifySender | null = null

  private constructor(apiKey: string) {
    this.client = new NotifyClient(apiKey)
  }

  static async getInstance(): Promise<NotifySender> {
    if (!this.instance) {
      const apiKey = await getSecretValue("notifyApiKey")
      this.instance = new NotifySender(apiKey)
    }
    return this.instance
  }

  async send(params: NotifyParams): Promise<NotifyResponse> {
    const sanitised = sanitizePersonalisation(params.personalisation)

    try {
      return await this.client.sendEmail(params.templateId, params.email, {
        personalisation: sanitised,
        reference: params.reference,
      })
    } catch (error) {
      throw this.classifyError(error)
    }
  }

  async validateTemplate(templateId: string, fields: string[]): Promise<boolean> {
    // Startup validation: check template exists and has expected fields
    const template = await this.client.getTemplateById(templateId)
    const templateFields = extractPersonalisationFields(template.body)
    const missing = fields.filter((f) => !templateFields.includes(f))
    if (missing.length > 0) {
      throw new PermanentError(`Template ${templateId} missing fields: ${missing.join(", ")}`)
    }
    return true
  }

  private classifyError(error: unknown): Error {
    if (isNotifyError(error)) {
      switch (error.statusCode) {
        case 400:
          return new PermanentError("Invalid request", error.message)
        case 401:
        case 403:
          return new CriticalError("Auth failed - check API key")
        case 429:
          return new RetriableError("Rate limited", 1000)
        default:
          if (error.statusCode >= 500) return new RetriableError("Notify service error")
          return new PermanentError(`Unexpected: ${error.statusCode}`)
      }
    }
    return new RetriableError("Unknown error")
  }
}
```

#### Validation Module

```typescript
// validation.ts
import { z } from "zod"

// Strict mode: reject unknown fields
const strictParse = <T extends z.ZodSchema>(schema: T, data: unknown) => {
  return schema.strict().parse(data)
}

// LeaseKey - composite key for lease lookup
export const LeaseKeySchema = z.object({
  userEmail: z.string().email(),
  uuid: z.string().uuid(),
})

// Discriminated union for frozen reasons
export const LeaseFrozenReasonSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Expired"),
    triggeredDurationThreshold: z.number(),
    leaseDurationInHours: z.number(),
  }),
  z.object({
    type: z.literal("BudgetExceeded"),
    triggeredBudgetThreshold: z.number(),
    budget: z.number().optional(),
    totalSpend: z.number(),
  }),
  z.object({
    type: z.literal("ManuallyFrozen"),
    comment: z.string().max(1000),
  }),
])

// Event schemas for each type
export const LeaseApprovedEventSchema = z.object({
  leaseId: z.string(),
  approvedBy: z.union([z.string().email(), z.literal("AUTO_APPROVED")]),
  userEmail: z.string().email(),
})

export const LeaseRequestedEventSchema = z.object({
  leaseId: LeaseKeySchema,
  comments: z.string().max(1000).optional(),
  userEmail: z.string().email(),
  requiresManualApproval: z.boolean(),
})

export const LeaseDeniedEventSchema = z.object({
  leaseId: z.string(),
  deniedBy: z.string().email(),
  userEmail: z.string().email(),
})

export const LeaseFrozenEventSchema = z.object({
  leaseId: LeaseKeySchema,
  accountId: z.string().regex(/^\d{12}$/),
  reason: LeaseFrozenReasonSchema,
})

export const LeaseBudgetThresholdEventSchema = z.object({
  leaseId: LeaseKeySchema,
  accountId: z.string().regex(/^\d{12}$/),
  budget: z.number().optional(),
  totalSpend: z.number(),
  budgetThresholdTriggered: z.number(), // 50, 75, 90
  actionRequested: z.enum(["notify", "freeze", "terminate"]),
})

// Validation dispatcher
export function validateEvent(eventType: string, detail: unknown): ValidatedEvent {
  const schema = EVENT_SCHEMAS[eventType]
  if (!schema) {
    throw new PermanentError(`Unknown event type: ${eventType}`)
  }
  try {
    return { type: eventType, data: strictParse(schema, detail) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Schema validation failed", {
        eventType,
        errors: error.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
      })
      throw new PermanentError("Invalid event schema", error.errors)
    }
    throw error
  }
}
```

### Data Models and Contracts

#### Email Templates

| Event Type                  | Template ID Env Var                | Required Personalisation                         | Optional    |
| --------------------------- | ---------------------------------- | ------------------------------------------------ | ----------- |
| LeaseRequested              | `NOTIFY_TEMPLATE_LEASE_REQUESTED`  | userName, templateName, requestTime              | comments    |
| LeaseApproved               | `NOTIFY_TEMPLATE_LEASE_APPROVED`   | userName, accountId, ssoUrl, expiryDate          | budgetLimit |
| LeaseDenied                 | `NOTIFY_TEMPLATE_LEASE_DENIED`     | userName, templateName, reason, deniedBy         | -           |
| LeaseTerminated             | `NOTIFY_TEMPLATE_LEASE_TERMINATED` | userName, accountId, reason, finalCost           | -           |
| LeaseBudgetThresholdAlert   | `NOTIFY_TEMPLATE_BUDGET_WARNING`   | userName, currentSpend, budgetLimit, percentUsed | -           |
| LeaseDurationThresholdAlert | `NOTIFY_TEMPLATE_TIME_WARNING`     | userName, hoursRemaining, expiryDate, timezone   | -           |
| LeaseFreezingThresholdAlert | `NOTIFY_TEMPLATE_FREEZE_IMMINENT`  | userName, reason, freezeTime                     | -           |
| LeaseBudgetExceeded         | `NOTIFY_TEMPLATE_OVER_BUDGET`      | userName, finalSpend, budgetLimit                | -           |
| LeaseExpired                | `NOTIFY_TEMPLATE_EXPIRED`          | userName, accountId, expiryTime                  | -           |
| LeaseFrozen                 | `NOTIFY_TEMPLATE_FROZEN`           | userName, accountId, reason, resumeInstructions  | portalUrl   |

#### Template Registry

```typescript
// templates.ts
export interface TemplateConfig {
  templateIdEnvVar: string
  requiredFields: string[]
  optionalFields?: string[]
  enrichmentQueries: EnrichmentQuery[]
}

export const NOTIFY_TEMPLATES: Record<string, TemplateConfig> = {
  LeaseRequested: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_LEASE_REQUESTED",
    requiredFields: ["userName", "templateName", "requestTime"],
    optionalFields: ["comments"],
    enrichmentQueries: ["leaseTemplate"],
  },
  LeaseApproved: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_LEASE_APPROVED",
    requiredFields: ["userName", "accountId", "ssoUrl", "expiryDate"],
    optionalFields: ["budgetLimit"],
    enrichmentQueries: ["lease", "account"],
  },
  LeaseBudgetThresholdAlert: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_BUDGET_WARNING",
    requiredFields: ["userName", "currentSpend", "budgetLimit", "percentUsed"],
    optionalFields: [],
    enrichmentQueries: ["lease"],
  },
  LeaseDurationThresholdAlert: {
    templateIdEnvVar: "NOTIFY_TEMPLATE_TIME_WARNING",
    requiredFields: ["userName", "hoursRemaining", "expiryDate", "timezone"],
    optionalFields: [],
    enrichmentQueries: ["lease", "userPreferences"], // Pre-mortem: timezone from preferences
  },
  // ... additional templates
}
```

#### DynamoDB Tables (Read-Only Access)

| Table                    | Key                         | Fields Used                                                                                           |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| LeaseTable               | PK: `userEmail`, SK: `uuid` | originalLeaseTemplateName, awsAccountId, expirationDate, maxSpend, totalCostAccrued, userName, status |
| SandboxAccountTable      | PK: `awsAccountId`          | name, email, status                                                                                   |
| LeaseTemplateTable       | PK: `uuid`                  | name, maxSpend, leaseDurationInHours                                                                  |
| NdxUserPreferences (NEW) | PK: `userEmail`             | notificationsEnabled, emailFrequency, timezone                                                        |

#### User Preferences Model (n5-10)

```typescript
// preferences.ts
export interface UserPreferences {
  userEmail: string
  notificationsEnabled: boolean // false = opt-out
  emailFrequency: "instant" | "daily-digest" | "weekly-digest"
  timezone: string // IANA timezone, e.g., 'Europe/London'
  createdAt: string
  updatedAt: string
}

// Default preferences for users without record
export const DEFAULT_PREFERENCES: Omit<UserPreferences, "userEmail" | "createdAt" | "updatedAt"> = {
  notificationsEnabled: true,
  emailFrequency: "instant",
  timezone: "Europe/London",
}
```

### APIs and Interfaces

#### GOV.UK Notify API

| Method                  | Endpoint                     | Purpose                            |
| ----------------------- | ---------------------------- | ---------------------------------- |
| `sendEmail()`           | POST /v2/notifications/email | Send email with template           |
| `getTemplateById()`     | GET /v2/template/{id}        | Validate template exists (startup) |
| `getNotificationById()` | GET /v2/notifications/{id}   | Future: delivery tracking          |

#### Internal Interfaces

```typescript
// notify-sender.ts
interface NotifyParams {
  templateId: string
  email: string
  personalisation: Record<string, string | number>
  reference?: string // Our correlation ID
}

interface NotifyResponse {
  id: string
  content: { body: string; subject: string }
  template: { id: string; version: number }
}

// enrichment.ts
interface EnrichmentResult {
  userName?: string
  accountId?: string
  expiryDate?: string
  budgetLimit?: number
  currentSpend?: number
  templateName?: string
  ssoUrl?: string
  timezone?: string
}
```

### Workflows and Sequencing

#### Email Notification Flow

```
┌─────────────────┐
│ Handler.ts      │
│ (from N-4)      │
└────────┬────────┘
         │ isUserNotification(eventType)
         ▼
┌─────────────────┐
│ 1. Schema       │ validateEvent(eventType, detail)
│    Validation   │ Zod strict mode
└────────┬────────┘
         │ ✓ Valid
         ▼
┌─────────────────┐
│ 2. Ownership    │ verifyEmailOwnership(leaseId, claimedEmail)
│    Verification │ Query DynamoDB LeaseTable
└────────┬────────┘
         │ ✓ Match
         ▼
┌─────────────────┐
│ 3. User         │ checkUserPreferences(userEmail)
│    Preferences  │ Skip if notificationsEnabled = false
└────────┬────────┘
         │ ✓ Enabled
         ▼
┌─────────────────┐
│ 4. Enrichment   │ enrichIfNeeded(event, template.requiredFields)
│                 │ Query LeaseTable, AccountTable, TemplateTable
└────────┬────────┘
         │ + Enriched data
         ▼
┌─────────────────┐
│ 5. Template     │ getTemplate(eventType)
│    Selection    │ Map event → templateId + required fields
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Personalise  │ buildPersonalisation(enrichedEvent, template)
│                 │ Map event fields → template fields
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Sanitise     │ sanitizePersonalisation(values)
│                 │ Escape HTML, prevent injection
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Send         │ notifySender.send({ templateId, email, personalisation })
│                 │ GOV.UK Notify API call
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 9. Metrics      │ metrics.addMetric('EmailSent', 1)
│    + Log        │ logger.info('Email sent', { notifyId, eventType })
└─────────────────┘
```

#### Deduplication Strategy

```
Event Arrival
     │
     ▼
┌─────────────────────────────────────────────┐
│ Idempotency Check (Lambda Powertools)       │
│ Key: event.id                               │
│ TTL: 24 hours                               │
└─────────────────────┬───────────────────────┘
                      │
    ┌─────────────────┴─────────────────┐
    │                                   │
    ▼                                   ▼
┌─────────┐                       ┌─────────┐
│ New     │                       │ Duplicate│
│ Event   │                       │ (cached) │
└────┬────┘                       └──────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ Lease-Level Dedup Window (60 seconds)       │
│ Key: `${userEmail}:${uuid}:${eventType}`    │
│ Purpose: Prevent rapid-fire same-lease      │
│          events from overwhelming user      │
└─────────────────────────────────────────────┘
```

#### Startup Validation Flow (n5-9)

```
Lambda Cold Start
     │
     ▼
┌─────────────────┐
│ 1. Load Secrets │ Get notifyApiKey from Secrets Manager
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Init Client  │ new NotifyClient(apiKey)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ 3. Validate All Templates                   │
│    For each template in NOTIFY_TEMPLATES:   │
│    - Fetch template from GOV.UK Notify      │
│    - Extract personalisation fields         │
│    - Compare with requiredFields            │
│    - Log WARNING if mismatch                │
│    - Fail Lambda init if CRITICAL mismatch  │
└─────────────────────────────────────────────┘
```

## Non-Functional Requirements

### Performance

| Requirement            | Target      | Measurement                            | Source               |
| ---------------------- | ----------- | -------------------------------------- | -------------------- |
| Event-to-email latency | < 5 seconds | CloudWatch metric: `EmailSendLatency`  | Architecture NFR     |
| DynamoDB enrichment    | < 50ms      | CloudWatch metric: `EnrichmentLatency` | N-4 established      |
| GOV.UK Notify API      | < 500ms     | CloudWatch metric: `NotifyApiLatency`  | GOV.UK Notify SLA    |
| Cold start overhead    | < 2 seconds | CloudWatch metric: `InitDuration`      | Lambda best practice |
| Template validation    | < 5 seconds | Startup time (cold start)              | Acceptable tradeoff  |

**Latency Budget:**

```
Total: < 5 seconds
├── Lambda cold start: 1-2s (first invocation only)
├── Schema validation: < 10ms
├── Ownership verification: < 50ms (DynamoDB)
├── User preferences check: < 50ms (DynamoDB)
├── Enrichment queries: < 50ms (DynamoDB)
├── Personalisation mapping: < 10ms
├── GOV.UK Notify API: 100-500ms
└── Logging/metrics: < 10ms
```

### Security

| Requirement                  | Implementation                                            | Story |
| ---------------------------- | --------------------------------------------------------- | ----- |
| Email ownership verification | Cross-check event.userEmail with DynamoDB lease.userEmail | n5-3  |
| No PII in logs               | Redact email to `[REDACTED]` in error logs                | n5-3  |
| Input sanitisation           | Escape HTML characters in personalisation values          | n5-1  |
| API key protection           | Secrets Manager + Lambda resource policy (from N-4)       | n5-1  |
| Zod strict mode              | Reject unknown fields (prevent injection)                 | n5-2  |
| Reference field              | Include event.id as Notify reference for audit trail      | n5-1  |

**Security Validation Flow:**

```
1. Source validation (N-4)      → Reject non-ISB events
2. Account filter (N-4)         → Reject cross-account injection
3. Schema validation (n5-2)     → Reject malformed payloads
4. Ownership verification (n5-3) → Reject email mismatch
5. Input sanitisation (n5-1)    → Prevent template injection
```

### Reliability/Availability

| Requirement         | Target     | Implementation                     |
| ------------------- | ---------- | ---------------------------------- |
| Email delivery rate | 99.5%      | GOV.UK Notify SLA + retry logic    |
| Retry on 429/5xx    | 3 attempts | Exponential backoff (1s, 2s, 4s)   |
| Retry on timeout    | 2 attempts | 30 second timeout per attempt      |
| DLQ capture         | 100%       | All failures after retries         |
| Idempotency         | 24h TTL    | Prevent duplicate emails           |
| Lease-level dedup   | 60s window | Prevent rapid-fire same-event spam |

**Failure Modes:**
| Mode | Detection | Recovery |
|------|-----------|----------|
| GOV.UK Notify outage | 503 errors | Retry → DLQ → ops alert |
| Rate limiting (429) | Status code | Exponential backoff |
| Invalid template | 400 error | PermanentError → DLQ |
| Auth failure (401/403) | Status code | CriticalError → immediate alarm |
| Enrichment failure | DynamoDB error | Continue with available data |
| Template drift | Startup validation | Log warning, continue or fail |

### Observability

| Signal              | Metric/Log                              | Purpose                |
| ------------------- | --------------------------------------- | ---------------------- |
| Email sent          | `EmailSent` (count by eventType)        | Success tracking       |
| Email failed        | `EmailFailed` (count by errorType)      | Failure analysis       |
| Send latency        | `EmailSendLatency` (p50, p95, p99)      | Performance monitoring |
| Template validation | `TemplateValidationFailed`              | Drift detection (n5-9) |
| Ownership mismatch  | `OwnershipMismatch`                     | Security monitoring    |
| User opt-out        | `NotificationSkipped` (reason: opt-out) | Preference tracking    |
| Enrichment latency  | `EnrichmentLatency`                     | Performance tuning     |
| Rate limited        | `RateLimited` (count)                   | Capacity planning      |

**Log Fields (Structured JSON):**

```json
{
  "eventId": "abc123",
  "eventType": "LeaseApproved",
  "userEmail": "[REDACTED]",
  "leaseId": "lease-uuid",
  "templateId": "template-uuid",
  "notifyResponseId": "notify-response-uuid",
  "latencyMs": 350,
  "status": "sent"
}
```

## Dependencies and Integrations

### NPM Dependencies

| Package                              | Version  | Purpose                         |
| ------------------------------------ | -------- | ------------------------------- |
| `notifications-node-client`          | ^8.2.0   | GOV.UK Notify SDK               |
| `zod`                                | ^3.23.0  | Schema validation               |
| `@aws-lambda-powertools/logger`      | ^2.0.0   | Structured logging (from N-4)   |
| `@aws-lambda-powertools/idempotency` | ^2.0.0   | Duplicate prevention (from N-4) |
| `@aws-lambda-powertools/metrics`     | ^2.0.0   | Custom metrics (from N-4)       |
| `@aws-sdk/client-dynamodb`           | ^3.600.0 | DynamoDB queries                |
| `@aws-sdk/lib-dynamodb`              | ^3.600.0 | DynamoDB DocumentClient         |
| `@aws-sdk/client-secrets-manager`    | ^3.600.0 | Secrets retrieval (from N-4)    |

### AWS Services

| Service         | Usage                            | Configuration                         |
| --------------- | -------------------------------- | ------------------------------------- |
| Lambda          | Notification handler             | 256MB, 30s timeout, Node.js 20.x      |
| DynamoDB        | Enrichment queries + idempotency | Read-only ISB tables + NdxIdempotency |
| DynamoDB (NEW)  | User preferences                 | NdxUserPreferences table              |
| Secrets Manager | API key storage                  | `/ndx/notifications/credentials`      |
| CloudWatch      | Logs and metrics                 | 30-day retention                      |

### External Integrations

| System          | Integration        | Notes                                   |
| --------------- | ------------------ | --------------------------------------- |
| GOV.UK Notify   | REST API v2        | Sandbox for testing, live for prod      |
| ISB DynamoDB    | Read-only queries  | LeaseTable, AccountTable, TemplateTable |
| ISB EventBridge | Event subscription | Configured in N-4                       |

### CloudFormation Exports Consumed

| Export                                | Table            | Usage                               |
| ------------------------------------- | ---------------- | ----------------------------------- |
| `ISB-{namespace}-LeaseTable`          | Lease records    | Ownership verification + enrichment |
| `ISB-{namespace}-SandboxAccountTable` | AWS accounts     | Account name enrichment             |
| `ISB-{namespace}-LeaseTemplateTable`  | Template configs | Template name enrichment            |

## Acceptance Criteria (Authoritative)

### Story n5-1: GOV.UK Notify SDK Integration

**Goal:** Integrate the official GOV.UK Notify SDK with proper error handling and credential management.

| AC ID   | Acceptance Criteria                                                                                      | Priority | Test Type   |
| ------- | -------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| AC-1.1  | `notifications-node-client` is installed as production dependency                                        | MUST     | Build       |
| AC-1.2  | NotifySender class retrieves API key from Secrets Manager at `/ndx/notifications/credentials`            | MUST     | Integration |
| AC-1.3  | NotifySender singleton pattern prevents multiple client instantiations                                   | SHOULD   | Unit        |
| AC-1.4  | `sendEmail()` method wraps SDK with template ID, email, and personalisation                              | MUST     | Unit        |
| AC-1.5  | All personalisation values are sanitised (HTML escape: `<`, `>`, `"`) before send                        | MUST     | Unit        |
| AC-1.6  | Notify `reference` field contains `event.id` for audit trail                                             | MUST     | Unit        |
| AC-1.7  | 400 errors throw `PermanentError` (no retry)                                                             | MUST     | Unit        |
| AC-1.8  | 401/403 errors throw `CriticalError` (immediate alarm)                                                   | MUST     | Unit        |
| AC-1.9  | 429 errors throw `RetriableError` with 1000ms `retryAfter`                                               | MUST     | Unit        |
| AC-1.10 | 5xx errors throw `RetriableError` (infrastructure issue)                                                 | MUST     | Unit        |
| AC-1.11 | Unknown errors default to `RetriableError`                                                               | SHOULD   | Unit        |
| AC-1.12 | API key is cached in Lambda memory (not re-fetched per invocation)                                       | SHOULD   | Integration |
| AC-1.13 | `RecipientVerification` metric logs hash(event.userEmail) vs hash(params.email) for audit                | MUST     | Unit        |
| AC-1.14 | ASSERT `event.userEmail === params.email` before every send (defensive programming)                      | MUST     | Unit        |
| AC-1.15 | Before send, query CloudWatch Logs Insights for duplicate `reference` (event.id)                         | SHOULD   | Integration |
| AC-1.16 | Add `verification_source` metadata to Notify reference field (audit trail)                               | SHOULD   | Unit        |
| AC-1.17 | Use DOMPurify library to sanitise HTML in personalisation (not just escape)                              | MUST     | Unit        |
| AC-1.18 | URL encode all personalisation values destined for URLs                                                  | MUST     | Unit        |
| AC-1.19 | Validate leaseId.uuid format BEFORE enrichment (UUID pattern only, reject query strings)                 | MUST     | Unit        |
| AC-1.20 | Use parameterised URLs: ssoUrl + encodeURIComponent(leaseId.uuid)                                        | MUST     | Unit        |
| AC-1.21 | MUST NOT log API key, secrets, or webhook URLs (security requirement)                                    | MUST     | Code Review |
| AC-1.22 | Log only token metadata: `{tokenLength}:${hash}` for audit (e.g., "72:abc123...")                        | MUST     | Unit        |
| AC-1.23 | Code comment in NotifySender: "SECURITY: Never log full API key or webhook tokens"                       | MUST     | Code Review |
| AC-1.24 | Implement email verification "double-blind": if event email ≠ enriched email, require manual approval    | SHOULD   | Unit        |
| AC-1.25 | Email includes explicit timestamp in human-readable format (e.g., "Sent 15 Nov 2025, 10:30 GMT")         | SHOULD   | Unit        |
| AC-1.26 | Email includes event ID reference for support tracing ("Ref: evt-abc123") in footer                      | SHOULD   | Unit        |
| AC-1.27 | Event ID stored in Notify personalisation field + DynamoDB audit trail for traceability                  | SHOULD   | Integration |
| AC-1.28 | Document GOV.UK Notify SLA (99.5% uptime) and compliance certifications (GDPR, ISO 27001)                | SHOULD   | Docs        |
| AC-1.29 | Provide ops runbook: "How to escalate to GOV.UK Notify support + contact information"                    | SHOULD   | Docs        |
| AC-1.30 | Store Notify audit trail logs in CloudWatch for 90 days (compliance retention)                           | SHOULD   | CDK         |
| AC-1.31 | Service degradation: Circuit breaker stops sends after 20 consecutive Notify API 5xx errors              | SHOULD   | Unit        |
| AC-1.32 | On circuit breaker trigger, pause sends for 5 min + escalate to ops via SNS                              | SHOULD   | CDK         |
| AC-1.33 | Load test: Simulate 100 emails/second; measure 429 error rate + backoff effectiveness                    | SHOULD   | Load Test   |
| AC-1.34 | Document Notify rate limits (infer from error responses + official docs)                                 | SHOULD   | Docs        |
| AC-1.35 | Implement jitter in retry backoff (avoid thundering herd with exponential + random delay)                | SHOULD   | Unit        |
| AC-1.36 | Email includes unsubscribe link (GOV.UK Notify best practice + PECR compliance)                          | MUST     | Unit        |
| AC-1.37 | Email includes privacy notice: "We process your email to notify you of lease events"                     | MUST     | Unit        |
| AC-1.38 | Log all email sends with recipient email hash (audit trail for breach investigation)                     | SHOULD   | Unit        |
| AC-1.39 | Suspicious recipient detection: Alert if email domain changes unexpectedly (e.g., @gmail.com → @corp.uk) | SHOULD   | Unit        |
| AC-1.40 | SSO token in CTA links expires after 15 min (minimal window if account compromised)                      | MUST     | Unit        |
| AC-1.41 | SSO token is single-use (token invalidated after first click to prevent replay)                          | SHOULD   | Unit        |
| AC-1.42 | Email header includes `List-Unsubscribe: <mailto:...>` for Gmail compliance                              | SHOULD   | Unit        |
| AC-1.43 | Email design uses GOV.UK templates (proven high deliverability + accessibility)                          | SHOULD   | Unit        |
| AC-1.44 | Lambda memory profiling documented: Recommended memory size (512MB or 1GB?) based on cold start          | SHOULD   | Docs        |
| AC-1.45 | Cold start performance measured: Time from Lambda start to first email send (latency budget)             | SHOULD   | Load Test   |
| AC-1.46 | Concurrent execution limits documented: System handles X concurrent invocations gracefully               | SHOULD   | Docs        |
| AC-1.47 | SSO token generation includes JWT format: issuer claim + audience claim (leaseId)                        | SHOULD   | Unit        |
| AC-1.48 | Token validation logs: source IP, user agent (detect token compromise + replay attacks)                  | SHOULD   | Unit        |
| AC-1.49 | Lambda timeout configured: 30 seconds (sufficient for enrichment + Notify send)                          | MUST     | CDK         |
| AC-1.50 | Notify service degradation monitoring: Alert if service down (check status page hourly)                  | SHOULD   | CDK         |
| AC-1.51 | API key rotation runbook: How to update Secrets Manager + verify Lambda access without downtime          | SHOULD   | Docs        |
| AC-1.52 | Connection pooling: Reuse HTTP connections across invocations (optimize cold start latency)              | SHOULD   | Code Review |
| AC-1.53 | Email authentication: SPF/DKIM/DMARC configured (prevent email spoofing + improve deliverability)        | MUST     | CDK         |
| AC-1.54 | Email privacy notice + consent tracking documented: Basis for sending (transactional vs. marketing)      | SHOULD   | Docs        |
| AC-1.55 | Secrets Manager caching: API key cached in Lambda memory (don't fetch per invocation)                    | MUST     | Unit        |
| AC-1.56 | Contract test: N-4 event schema → N-5 validation (happy path + error scenarios)                          | MUST     | Integration |
| AC-1.57 | Contract test: Notify API endpoints (send-email, templates) match SDK expectations                       | MUST     | Integration |
| AC-1.58 | Integration test: Secrets Manager access verified (API key fetch works without timeout)                  | MUST     | Integration |
| AC-1.59 | Pre-deployment checklist documented: Secrets, IAM, VPC, ISB tables (sign-off required)                   | MUST     | Docs        |
| AC-1.60 | N-4/N-5 integration contract documented: Handler → NotifySender API + error codes                        | SHOULD   | Docs        |

---

### Story n5-2: ISB Event Schema Validation

**Goal:** Implement Zod schema validation for all ISB event types with strict mode.

| AC ID   | Acceptance Criteria                                                                         | Priority | Test Type |
| ------- | ------------------------------------------------------------------------------------------- | -------- | --------- |
| AC-2.1  | Zod schemas defined for all 10 user notification event types                                | MUST     | Unit      |
| AC-2.2  | `LeaseKeySchema` validates composite key: `{ userEmail: email, uuid: uuid }`                | MUST     | Unit      |
| AC-2.3  | `LeaseFrozenReasonSchema` uses discriminated union on `type` field                          | MUST     | Unit      |
| AC-2.4  | `LeaseTerminatedReasonSchema` handles 5 termination types                                   | MUST     | Unit      |
| AC-2.5  | Zod strict mode (`.strict()`) rejects unknown fields                                        | MUST     | Unit      |
| AC-2.6  | `accountId` fields validate 12-digit AWS account ID pattern                                 | MUST     | Unit      |
| AC-2.7  | `validateEvent()` returns typed `ValidatedEvent` on success                                 | MUST     | Unit      |
| AC-2.8  | Invalid events throw `PermanentError` with Zod error details                                | MUST     | Unit      |
| AC-2.9  | Schema validation errors are logged with field paths                                        | MUST     | Unit      |
| AC-2.10 | Unknown event types throw `PermanentError('Unknown event type')`                            | MUST     | Unit      |
| AC-2.11 | UUID field validation rejects non-UUID formats (no query strings, protocols, special chars) | MUST     | Unit      |
| AC-2.12 | Email field validation uses strict RFC 5322 mode (rejects +injection addresses)             | MUST     | Unit      |

---

### Story n5-3: Email Ownership Verification

**Goal:** Verify the event's claimed email matches the DynamoDB lease owner before sending.

| AC ID   | Acceptance Criteria                                                                                                | Priority | Test Type    |
| ------- | ------------------------------------------------------------------------------------------------------------------ | -------- | ------------ |
| AC-3.1  | `verifyEmailOwnership()` queries LeaseTable with `leaseId` key                                                     | MUST     | Integration  |
| AC-3.2  | Function compares `event.userEmail` with `lease.userEmail` (case-insensitive)                                      | MUST     | Unit         |
| AC-3.3  | Email mismatch throws `SecurityError('Email does not match lease owner')`                                          | MUST     | Unit         |
| AC-3.4  | `OwnershipMismatch` metric emitted on mismatch                                                                     | MUST     | Unit         |
| AC-3.5  | Error log redacts both emails: `leaseEmail: '[REDACTED]', claimedEmail: '[REDACTED]'`                              | MUST     | Unit         |
| AC-3.6  | Lease not found in DynamoDB throws `PermanentError('Lease not found')`                                             | MUST     | Integration  |
| AC-3.7  | Verification uses read-only DynamoDB access (GetItem only)                                                         | MUST     | CDK          |
| AC-3.8  | Verification is MANDATORY - cannot be bypassed via configuration                                                   | MUST     | Code Review  |
| AC-3.9  | DynamoDB read uses strongly consistent read (`ConsistentRead: true`)                                               | MUST     | Integration  |
| AC-3.10 | Ownership verification compares BOTH `userEmail` AND `uuid` from LeaseKey                                          | MUST     | Unit         |
| AC-3.11 | NotifySender clears personalisation cache/state between sends                                                      | MUST     | Unit         |
| AC-3.12 | Integration test sends 2 emails sequentially, validates no cross-contamination                                     | MUST     | Integration  |
| AC-3.13 | Cross-verify email with ISB SandboxAccountTable.email as secondary source                                          | MUST     | Integration  |
| AC-3.14 | If event.userEmail differs from account owner email, log SECURITY alert                                            | MUST     | Unit         |
| AC-3.15 | Require BOTH lease.userEmail AND account.email to match event.userEmail                                            | MUST     | Integration  |
| AC-3.16 | Log full verification chain: event → lease → account (audit trail for security review)                             | SHOULD   | Unit         |
| AC-3.17 | User email domain validation: must match ISB approved domains (\*.gov.uk)                                          | MUST     | Unit         |
| AC-3.18 | Log and alarm on non-approved domain emails (e.g., @gmail.com)                                                     | MUST     | Unit         |
| AC-3.19 | Implement third-party verification: hash(userEmail) matches ISB-provided hash                                      | SHOULD   | Integration  |
| AC-3.20 | If verification fails, do NOT retry — treat as PermanentError (security > availability)                            | MUST     | Unit         |
| AC-3.21 | Maintain audit log of all verification attempts for 90 days (email, lease, account)                                | SHOULD   | CDK          |
| AC-3.22 | Email format validation: reject if contains suspicious patterns (++, --, .., consecutive delimiters)               | MUST     | Unit         |
| AC-3.23 | Future consideration: Verify against authoritative directory (LDAP/AD) when available                              | SHOULD   | Code Comment |
| AC-3.24 | Compliance report: Generate "All emails sent in [date range] with verification chain"                              | SHOULD   | Docs         |
| AC-3.25 | Signed audit log (HMAC-SHA256): Hash of event + verification results + timestamp                                   | SHOULD   | Unit         |
| AC-3.26 | Verification anomaly alerts: Alert if email sent to 3+ different addresses for same lease                          | SHOULD   | Unit         |
| AC-3.27 | Email change detection: Alert if email address changes unexpectedly (e.g., new lease request from different email) | SHOULD   | Unit         |
| AC-3.28 | Reject hardcoded test addresses: Validation rejects @test.com, @localhost, @example.com, 123@... patterns          | MUST     | Unit         |

---

### Story n5-4: Lease Lifecycle Email Templates

**Goal:** Configure and send emails for lease lifecycle events (request, approval, denial, termination).

| AC ID   | Acceptance Criteria                                                                            | Priority | Test Type   |
| ------- | ---------------------------------------------------------------------------------------------- | -------- | ----------- |
| AC-4.1  | Template IDs loaded from environment variables (`NOTIFY_TEMPLATE_*`)                           | MUST     | Integration |
| AC-4.2  | `LeaseRequested` email includes: userName, templateName, requestTime, comments                 | MUST     | Unit        |
| AC-4.3  | `LeaseApproved` email includes: userName, accountId, ssoUrl, expiryDate                        | MUST     | Unit        |
| AC-4.4  | `LeaseApproved` email includes portal deep link for immediate access                           | SHOULD   | Unit        |
| AC-4.5  | `LeaseDenied` email includes: userName, templateName, reason, deniedBy                         | MUST     | Unit        |
| AC-4.6  | `LeaseTerminated` email includes: userName, accountId, reason, finalCost                       | MUST     | Unit        |
| AC-4.7  | `LeaseTerminated` reason is human-readable (not raw type)                                      | SHOULD   | Unit        |
| AC-4.8  | Missing required personalisation throws `PermanentError`                                       | MUST     | Unit        |
| AC-4.9  | Optional personalisation fields default to empty string                                        | SHOULD   | Unit        |
| AC-4.10 | All lease lifecycle emails include authenticated "View in Portal" CTA link                     | SHOULD   | Unit        |
| AC-4.11 | CTA link is session-less, short-lived token (15-min expiry, HMAC-SHA256 signed)                | SHOULD   | Unit        |
| AC-4.12 | Token includes audience claim (leaseKey) to prevent cross-lease access                         | SHOULD   | Unit        |
| AC-4.13 | Portal link works in all email clients (Gmail, Outlook, Apple Mail)                            | SHOULD   | Integration |
| AC-4.14 | `LeaseApproved` email includes "Increase Budget" quick action link (pre-populates form)        | SHOULD   | Unit        |
| AC-4.15 | Budget alert quick action link redirects to budget form with leaseId pre-filled                | SHOULD   | Unit        |
| AC-4.16 | CTA link tested in Gmail, Outlook (web + desktop), Apple Mail                                  | SHOULD   | Integration |
| AC-4.17 | CTA link survives Office 365 Safe Links URL rewriting (test with real O365 account)            | SHOULD   | Integration |
| AC-4.18 | Fallback: Email footer includes plain-text link if HTML link fails to render                   | SHOULD   | Unit        |
| AC-4.19 | Email includes instructions: "If link doesn't work, copy and paste URL in browser"             | SHOULD   | Unit        |
| AC-4.20 | Load test: Send 1000 emails, measure CTA click-through rate (baseline for future optimization) | SHOULD   | Load Test   |
| AC-4.21 | Complaint rate tracked: Alert if > 0.1% (contact Notify support if threshold exceeded)         | SHOULD   | CDK         |
| AC-4.22 | Bounce rate tracked: Alert if > 1% (investigate invalid email lists)                           | SHOULD   | CDK         |
| AC-4.23 | Deliverability monitoring: Check Notify dashboard weekly (document in runbook)                 | SHOULD   | Docs        |
| AC-4.24 | Unsubscribe metric tracked: Alert if opt-out rate spikes (target < 5% monthly)                 | SHOULD   | CDK         |
| AC-4.25 | CTA link includes UTM parameters (source=email, campaign=lease-approval) for analytics         | SHOULD   | Unit        |
| AC-4.26 | Email design reviewed for accessibility (contrast ratio, alt text for images)                  | SHOULD   | Code Review |

---

### Story n5-5: Monitoring Alert Email Templates

**Goal:** Configure and send emails for budget, duration, and freeze threshold events.

| AC ID   | Acceptance Criteria                                                                          | Priority | Test Type |
| ------- | -------------------------------------------------------------------------------------------- | -------- | --------- |
| AC-5.1  | `LeaseBudgetThresholdAlert` email includes: userName, currentSpend, budgetLimit, percentUsed | MUST     | Unit      |
| AC-5.2  | `LeaseDurationThresholdAlert` email includes: userName, hoursRemaining, expiryDate, timezone | MUST     | Unit      |
| AC-5.3  | Timezone defaults to `Europe/London` if not in user preferences                              | SHOULD   | Unit      |
| AC-5.4  | `LeaseFreezingThresholdAlert` email includes: userName, reason, freezeTime                   | MUST     | Unit      |
| AC-5.5  | `LeaseBudgetExceeded` email includes: userName, finalSpend, budgetLimit                      | MUST     | Unit      |
| AC-5.6  | `LeaseExpired` email includes: userName, accountId, expiryTime                               | MUST     | Unit      |
| AC-5.7  | `LeaseFrozen` email includes: userName, accountId, reason, resumeInstructions                | MUST     | Unit      |
| AC-5.8  | Budget amounts formatted with currency symbol (GBP: £)                                       | SHOULD   | Unit      |
| AC-5.9  | Dates formatted in UK format (DD MMM YYYY, HH:MM)                                            | SHOULD   | Unit      |
| AC-5.10 | Percentage thresholds formatted with % symbol                                                | SHOULD   | Unit      |
| AC-5.11 | Budget emails include both `event.budgetLimit` AND `enriched.maxSpend` if different          | SHOULD   | Unit      |
| AC-5.12 | Add disclaimer "Budget data as of [timestamp]" to show data age                              | SHOULD   | Unit      |
| AC-5.13 | Never use enriched data that contradicts event type (e.g., LeaseDenied but status=Approved)  | MUST     | Unit      |
| AC-5.14 | Always prioritise event data over enriched data for status fields                            | MUST     | Unit      |
| AC-5.15 | Template never displays enriched.status (only use enriched data for non-status fields)       | MUST     | Unit      |

---

### Story n5-6: DynamoDB Enrichment for Personalisation

**Goal:** Query ISB DynamoDB tables to enrich events with missing personalisation fields.

| AC ID   | Acceptance Criteria                                                                                          | Priority | Test Type   |
| ------- | ------------------------------------------------------------------------------------------------------------ | -------- | ----------- |
| AC-6.1  | `enrichIfNeeded()` identifies missing required fields from template config                                   | MUST     | Unit        |
| AC-6.2  | Enrichment queries LeaseTable for lease-specific fields                                                      | MUST     | Integration |
| AC-6.3  | Enrichment queries SandboxAccountTable for account name                                                      | MUST     | Integration |
| AC-6.4  | Enrichment queries LeaseTemplateTable for template name                                                      | MUST     | Integration |
| AC-6.5  | Multiple enrichment queries execute in parallel (Promise.all)                                                | SHOULD   | Unit        |
| AC-6.6  | Enrichment latency tracked via `EnrichmentLatency` metric                                                    | SHOULD   | Unit        |
| AC-6.7  | Missing enrichment data logs WARNING but continues with available data                                       | SHOULD   | Unit        |
| AC-6.8  | Still-missing REQUIRED fields after enrichment throw `PermanentError`                                        | MUST     | Unit        |
| AC-6.9  | DynamoDB access uses read-only IAM permissions (GetItem, Query)                                              | MUST     | CDK         |
| AC-6.10 | SSO URL constructed from config: `https://{ssoStartUrl}/start`                                               | SHOULD   | Unit        |
| AC-6.11 | All enrichment reads use `ConsistentRead: true` (trade latency for correctness)                              | MUST     | Integration |
| AC-6.12 | Enrichment result includes `lastModified` timestamp, logged for debugging                                    | SHOULD   | Unit        |
| AC-6.13 | If `enriched.maxSpend` differs from `event.budget` by >10%, log WARNING                                      | SHOULD   | Unit        |
| AC-6.14 | Lambda container cache cleared on each cold start (no cross-event caching)                                   | MUST     | Unit        |
| AC-6.15 | DynamoDB provisioned capacity (not on-demand) with auto-scaling configured                                   | SHOULD   | CDK         |
| AC-6.16 | Enrichment failure downgrades to partial send (log warning, continue with available data)                    | SHOULD   | Unit        |
| AC-6.17 | Circuit breaker: after 5 consecutive DynamoDB throttles, skip enrichment for 60s                             | SHOULD   | Unit        |
| AC-6.18 | Load test: 200 LeaseApproved events in 30 seconds, all delivered successfully                                | MUST     | Load Test   |
| AC-6.19 | Never construct URLs from untrusted fields without URL encoding                                              | MUST     | Code Review |
| AC-6.20 | Log enriched data that CONFLICTS with event payload (e.g., status mismatch)                                  | SHOULD   | Unit        |
| AC-6.21 | If lease.status conflicts with event type (LeaseDenied but status=Approved), log SECURITY alert              | MUST     | Unit        |
| AC-6.22 | Send metric: `EnrichmentConflict` when event details conflict with DB state                                  | SHOULD   | Unit        |
| AC-6.23 | Ops runbook: "How to detect ISB data compromise" (check conflict metrics)                                    | SHOULD   | Docs        |
| AC-6.24 | DLQ processor validates event integrity before re-drive                                                      | SHOULD   | Unit        |
| AC-6.25 | DLQ message immutability check: hash message body, compare on replay                                         | SHOULD   | Unit        |
| AC-6.26 | Enrichment conflicts create ticket in ops queue, require manual approval before send                         | MUST     | Unit        |
| AC-6.27 | Automatic conflict resolution: Only use enriched status if event.time < lease.lastModified                   | SHOULD   | Unit        |
| AC-6.28 | Auto-scaling configured for DynamoDB tables (scale-out on throttle, max 40k WCU)                             | SHOULD   | CDK         |
| AC-6.29 | Circuit breaker: After 3 consecutive DynamoDB throttles, skip enrichment (partial send)                      | SHOULD   | Unit        |
| AC-6.30 | Load test: 500 concurrent lease approvals; measure enrichment latency + throttles                            | SHOULD   | Load Test   |
| AC-6.31 | Throttle metric alarm: Alert if throttle count > 5 in 5-min window                                           | SHOULD   | CDK         |
| AC-6.32 | Runbook: "How to scale DynamoDB provisioned capacity during incident"                                        | SHOULD   | Docs        |
| AC-6.33 | Enrichment latency SLA: 99th percentile < 100ms (tracked in CloudWatch)                                      | SHOULD   | CDK         |
| AC-6.34 | DynamoDB VPC endpoint used (no internet gateway required for enrichment)                                     | SHOULD   | CDK         |
| AC-6.35 | All DynamoDB tables have PITR (Point-in-Time Recovery) enabled for audit compliance                          | SHOULD   | CDK         |
| AC-6.36 | Integration test: Create conflict scenario (lease deleted, but event sent); verify safe behavior             | SHOULD   | Integration |
| AC-6.37 | Enrichment conflict metric: `EnrichmentConflict` emitted when event + DB state mismatch                      | SHOULD   | Unit        |
| AC-6.38 | Enrichment timeout: 2-second max (fail fast; don't timeout Lambda waiting for slow DB)                       | MUST     | Unit        |
| AC-6.39 | Graceful degradation: If enrichment slow/unavailable, send with partial data (don't fail)                    | SHOULD   | Unit        |
| AC-6.40 | Data staleness check: Log WARNING if enrichment data > 5 min old (indicates lag)                             | SHOULD   | Unit        |
| AC-6.41 | Never use enriched.status in email content (only use event.type to prevent confusion)                        | MUST     | Code Review |
| AC-6.42 | Integration test: Simulate lease deletion; verify email handling safe (no exposure)                          | SHOULD   | Integration |
| AC-6.43 | Integration test: Verify DynamoDB offline scenario; email sent with partial data (graceful)                  | SHOULD   | Integration |
| AC-6.44 | Contract test: ISB table schemas (query real data; verify field names + types)                               | MUST     | Integration |
| AC-6.45 | Contract test: LeaseTable response includes userEmail, uuid, status, templateName, expiryDate, accountId     | MUST     | Integration |
| AC-6.46 | Contract test: SandboxAccountTable response includes accountId, accountName, ownerEmail                      | MUST     | Integration |
| AC-6.47 | Contract test: LeaseTemplateTable response includes templateName, templateDescription                        | MUST     | Integration |
| AC-6.48 | Integration test: Enrichment queries all 3 ISB tables concurrently (LeaseTable, AccountTable, TemplateTable) | MUST     | Integration |
| AC-6.49 | Data quality test: Sample ISB tables; verify no null userEmail, accountId, templateName (critical fields)    | SHOULD   | Integration |
| AC-6.50 | Documentation: "ISB table schema assumptions" (field names, types, required fields)                          | MUST     | Docs        |
| AC-6.51 | Documentation: "N-5 requires ISB tables with specific schema; confirm before deployment"                     | MUST     | Docs        |

---

### Story n5-7: Idempotency and Deduplication

**Goal:** Prevent duplicate email notifications using Lambda Powertools idempotency.

| AC ID      | Acceptance Criteria                                                                                       | Priority | Test Type   |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| AC-7.1     | Idempotency key is `event.id` (EventBridge-provided)                                                      | MUST     | Unit        |
| AC-7.2     | Idempotency TTL is 24 hours                                                                               | MUST     | CDK         |
| AC-7.3     | Duplicate event returns cached result (no email sent)                                                     | MUST     | Integration |
| AC-7.4     | Code comment documents: "IMPORTANT: key MUST be event.id, not custom"                                     | SHOULD   | Code Review |
| AC-7.5     | Lease-level dedup: same `{userEmail}:{uuid}:{eventType}` within 60s is skipped                            | MUST     | Unit        |
| AC-7.6     | Lease-level dedup logged: `Skipping duplicate event within window`                                        | SHOULD   | Unit        |
| AC-7.7     | `NotificationSkipped` metric emitted with reason: `duplicate`                                             | SHOULD   | Unit        |
| AC-7.2-OLD | ~~Idempotency TTL is 24 hours~~                                                                           | ~~MUST~~ | ~~CDK~~     |
| AC-7.8     | **Idempotency TTL is 7 days** (covers max EventBridge replay + buffer)                                    | MUST     | CDK         |
| AC-7.8a    | Idempotency TTL documentation includes EventBridge replay policy link                                     | SHOULD   | Docs        |
| AC-7.9     | Idempotency key includes namespace: `${namespace}:${event.id}` for uniqueness                             | MUST     | Unit        |
| AC-7.10    | Event age validation: if `event.time` > 7 days old, skip send (no idempotency override)                   | MUST     | Unit        |
| AC-7.10b   | DLQ manual replay allowed only if event.time < 7 days (enforce in processor)                              | MUST     | Unit        |
| AC-7.11    | `DuplicateDetected` metric split: `IdempotencyHit` vs `LeaseWindowSkip`                                   | SHOULD   | Unit        |
| AC-7.12    | Idempotency validation: Re-check event.userEmail against DynamoDB lease on cache hit                      | MUST     | Integration |
| AC-7.13    | If cached event.userEmail differs from current event.userEmail, fail with SECURITY error                  | MUST     | Unit        |
| AC-7.14    | Log mismatch: "Idempotency key reused with different email - potential replay attack"                     | MUST     | Unit        |
| AC-7.15    | Metric: `IdempotencyTampering` when event parameters changed                                              | SHOULD   | Unit        |
| AC-7.16    | Runbook: "EventBridge replay scenarios and idempotency TTL implications"                                  | SHOULD   | Docs        |
| AC-7.17    | Monitor idempotency: Alert if `event.time` > 7 days old (indicates EventBridge replay beyond TTL)         | SHOULD   | CDK         |
| AC-7.18    | If alerts fire, review EventBridge replay policy documentation and update TTL if needed                   | SHOULD   | Runbook     |
| AC-7.19    | Idempotency key versioning: Include event.schema_version in key (prevent collision on schema change)      | SHOULD   | Unit        |
| AC-7.20    | Integration test: Send event v1, then event v2 with same event.id; verify 2 emails sent (not 1 duplicate) | SHOULD   | Integration |
| AC-7.21    | Idempotency state sharing: N-4 and N-5 both use NdxIdempotency table (verify no key collision)            | SHOULD   | Integration |
| AC-7.22    | Integration test: N-4 idempotency + N-5 lease-level dedup work together (no conflicts)                    | SHOULD   | Integration |
| AC-7.23    | Documentation: "N-5 assumes NdxIdempotency table exists (created by N-4); confirm before N-5 start"       | SHOULD   | Docs        |

---

### Story n5-8: GOV.UK Notify Sandbox E2E Test (Pre-mortem)

**Goal:** End-to-end test with real GOV.UK Notify sandbox environment to catch template API changes.

| AC ID  | Acceptance Criteria                                                                            | Priority | Test Type |
| ------ | ---------------------------------------------------------------------------------------------- | -------- | --------- |
| AC-8.1 | E2E test uses GOV.UK Notify sandbox API key (not production)                                   | MUST     | E2E       |
| AC-8.2 | E2E test sends real email to test inbox for at least one template                              | MUST     | E2E       |
| AC-8.3 | E2E test validates email subject and body contain expected personalisation                     | SHOULD   | E2E       |
| AC-8.4 | E2E test runs in CI pipeline (staging environment)                                             | SHOULD   | CI Config |
| AC-8.5 | E2E test failure blocks deployment                                                             | SHOULD   | CI Config |
| AC-8.6 | Test documentation includes how to obtain sandbox API key                                      | MUST     | Docs      |
| AC-8.7 | E2E test parses email body HTML, asserts all personalisation fields populated (no `((field))`) | MUST     | E2E       |
| AC-8.8 | Smoke test runs post-deployment in prod, sends test email to ops inbox                         | SHOULD   | CI Config |
| AC-8.9 | E2E test failure blocks deployment (prevent bad code reaching prod)                            | MUST     | CI Config |

---

### Story n5-9: Template Field Validation on Startup (Pre-mortem)

**Goal:** Validate GOV.UK Notify templates have expected fields during Lambda cold start.

| AC ID    | Acceptance Criteria                                                                               | Priority | Test Type   |
| -------- | ------------------------------------------------------------------------------------------------- | -------- | ----------- |
| AC-9.1   | `validateTemplate()` fetches template from GOV.UK Notify API                                      | MUST     | Integration |
| AC-9.2   | Function extracts personalisation field names from template body                                  | MUST     | Unit        |
| AC-9.3   | Function compares template fields with `requiredFields` from config                               | MUST     | Unit        |
| AC-9.4   | Missing required fields log WARNING with specific field names                                     | MUST     | Unit        |
| AC-9.5   | Extra template fields (not in config) log INFO (acceptable)                                       | SHOULD   | Unit        |
| AC-9.6   | `TemplateValidationFailed` metric emitted on mismatch                                             | SHOULD   | Unit        |
| AC-9.7   | Validation runs once per cold start (not every invocation)                                        | SHOULD   | Unit        |
| AC-9.8   | Critical mismatch (e.g., template not found) fails Lambda init                                    | MUST     | Integration |
| AC-9.9   | Non-critical mismatch allows Lambda to continue with warning                                      | SHOULD   | Unit        |
| AC-9.10  | `validateTemplate()` renders test payload, asserts no `((field))` placeholders in output          | MUST     | Integration |
| AC-9.11  | Template version tracking: Store template.version in CloudWatch metric on each cold start         | SHOULD   | Unit        |
| AC-9.11b | Monitor for version changes: Alert if Notify template version increases unexpectedly              | SHOULD   | CDK         |
| AC-9.13  | Startup validation calls `getTemplateById()` which returns LATEST version                         | MUST     | Unit        |
| AC-9.14  | Log template version returned by Notify (for audit trail of template changes)                     | SHOULD   | Unit        |
| AC-9.15  | If template version differs from previous version, send INFO log (not alarm, no blocking)         | SHOULD   | Unit        |
| AC-9.16  | Document: "How to safely update GOV.UK Notify templates without breaking emails"                  | SHOULD   | Docs        |
| AC-9.17  | Template rendering test: Render template with test payload; assert no `((placeholder))` in output | MUST     | Unit        |
| AC-9.18  | Template rollback procedure documented: How to revert template to previous version                | SHOULD   | Docs        |
| AC-9.19  | Template change log: Track all changes (timestamp, changed by, old vs. new fields) for audit      | SHOULD   | CDK         |

---

### Story n5-10: User Notification Preferences (Stakeholder)

**Goal:** Store and respect user notification preferences for future opt-out and frequency controls.

| AC ID    | Acceptance Criteria                                                                                | Priority | Test Type    |
| -------- | -------------------------------------------------------------------------------------------------- | -------- | ------------ |
| AC-10.1  | `NdxUserPreferences` DynamoDB table created with PK: `userEmail`                                   | MUST     | CDK          |
| AC-10.2  | Table has attributes: notificationsEnabled, emailFrequency, timezone                               | MUST     | CDK          |
| AC-10.3  | `getUserPreferences()` returns user record or defaults                                             | MUST     | Integration  |
| AC-10.4  | Default preferences: notificationsEnabled=true, emailFrequency='instant', timezone='Europe/London' | MUST     | Unit         |
| AC-10.5  | `notificationsEnabled=false` skips email send                                                      | MUST     | Unit         |
| AC-10.6  | `NotificationSkipped` metric emitted with reason: `opt-out`                                        | MUST     | Unit         |
| AC-10.7  | User timezone used for date formatting in emails                                                   | SHOULD   | Unit         |
| AC-10.8  | `emailFrequency` is stored but not yet implemented (future: daily digest)                          | SHOULD   | Code Comment |
| AC-10.9  | Lambda has write access to NdxUserPreferences (for future preference API)                          | SHOULD   | CDK          |
| AC-10.10 | NdxUserPreferences IAM read access restricted to Lambda only                                       | MUST     | CDK          |
| AC-10.11 | Timezone stored as UTC offset only (not IANA name) to reduce location inference                    | SHOULD   | Unit         |
| AC-10.12 | No audit logging of timezone queries to prevent timing attacks                                     | SHOULD   | CDK          |
| AC-10.13 | Initial preference loading: Batch load from ISB users on cold start OR on-demand per user          | SHOULD   | Unit         |
| AC-10.14 | If user has no preference record, use DEFAULT_PREFERENCES (no failure)                             | MUST     | Unit         |
| AC-10.15 | Write access for Lambda only — future API endpoints must use separate Lambda function              | SHOULD   | CDK          |
| AC-10.16 | Preference mutations are immutable writes (new record, never update in-place)                      | SHOULD   | Unit         |
| AC-10.17 | Old preference records retained for 90 days (audit trail for preference disputes)                  | SHOULD   | CDK          |
| AC-10.18 | Preference change is logged: "userEmail, field changed, old→new value, timestamp"                  | SHOULD   | Unit         |
| AC-10.19 | Provide preference management endpoint (GET/POST) callable by future preference UI                 | SHOULD   | Unit         |
| AC-10.20 | Endpoint validates user identity (requires authentication token from ISB)                          | MUST     | Unit         |
| AC-10.21 | Preference update emits `UserPreferenceChanged` event (for audit + triggering downstream systems)  | SHOULD   | Unit         |
| AC-10.22 | Footer in all notification emails includes link to preference management endpoint                  | SHOULD   | Unit         |
| AC-10.23 | Preference endpoint documented in API spec (as stub for future UI)                                 | SHOULD   | Docs         |
| AC-10.24 | When user changes notificationsEnabled or emailFrequency, trigger confirmation email               | SHOULD   | Unit         |
| AC-10.25 | Confirmation email sent to updated userEmail (or new email if changed)                             | SHOULD   | Unit         |
| AC-10.26 | Confirmation includes: old→new values, timestamp, and 24h undo link                                | SHOULD   | Unit         |
| AC-10.27 | Undo link includes cryptographic token (HMAC-SHA256) to prevent tampering                          | SHOULD   | Unit         |
| AC-10.28 | Preference schema includes `emailFrequency` field (instant, daily, weekly, never)                  | SHOULD   | CDK          |
| AC-10.29 | Implement frequency filtering: Buffer emails, send daily digest if user prefers                    | SHOULD   | Unit         |
| AC-10.30 | Priority levels: Critical emails (lease termination) always sent; low-priority wait for digest     | SHOULD   | Unit         |
| AC-10.31 | Unsubscribe metric: Track opt-out rate (target < 5% monthly); alert if spikes                      | SHOULD   | CDK          |
| AC-10.32 | Runbook: "If unsubscribe rate spikes, audit recent email volume + check for issues"                | SHOULD   | Docs         |
| AC-10.33 | Preference schema includes `preferredChannels` array (email, slack, sms) for future                | SHOULD   | CDK          |
| AC-10.34 | Preference endpoint returns `supportedChannels` list (future expansion documentation)              | SHOULD   | Unit         |
| AC-10.35 | Preference schema includes `language` field (default: en, future: cy for Welsh)                    | SHOULD   | CDK          |
| AC-10.36 | Email body template selection based on user language preference (stub for future)                  | SHOULD   | Code Comment |
| AC-10.37 | Preference schema versioned (v1, v2, etc.) for future migrations                                   | SHOULD   | CDK          |
| AC-10.38 | Email footer includes link to preference stub page (explains "coming soon")                        | SHOULD   | Unit         |
| AC-10.39 | Metric: `PreferenceUIWaitlist` (count users who clicked preference link but no UI)                 | SHOULD   | Unit         |
| AC-10.40 | Document future API contract for preference UI (POST /preferences, GET /preferences/{userEmail})   | SHOULD   | Docs         |
| AC-10.41 | Support GDPR Data Subject Access Request (DSAR): Extract all emails sent to userEmail              | SHOULD   | Docs         |
| AC-10.42 | Support GDPR right-to-be-forgotten: Delete user preferences (30-day cleanup period)                | SHOULD   | Unit         |
| AC-10.43 | Email includes data processing notice (GDPR Article 13 transparency requirement)                   | MUST     | Unit         |
| AC-10.44 | Retention policy: Delete Notify logs after 90 days (GDPR + cost optimization)                      | SHOULD   | CDK          |
| AC-10.45 | Document: "Privacy Impact Assessment for email notifications" (required for GDPR)                  | SHOULD   | Docs         |
| AC-10.46 | Preference audit trail: Every change logged with old→new value + timestamp + userEmail             | SHOULD   | Unit         |
| AC-10.47 | 90-day retention of preference history (discovery window for DSAR + audit investigations)          | SHOULD   | CDK          |
| AC-10.48 | Preference enforcement: If notificationsEnabled=false, skip email send (MUST respect opt-out)      | MUST     | Unit         |
| AC-10.49 | Compliance verification: All emails are transactional (not marketing) — no unsolicited sends       | SHOULD   | Code Review  |
| AC-10.50 | N-6 compatibility: Preference schema designed to support N-6 Slack multi-channel extension         | SHOULD   | Code Review  |
| AC-10.51 | Preference endpoint API contract: POST /preferences, GET /preferences/{userEmail} documented       | SHOULD   | Docs         |
| AC-10.52 | Documentation: "Preference schema designed for N-6 Slack channels; coordinate before N-6 start"    | SHOULD   | Docs         |

---

### Story n5-11: DLQ Auto-Retry (Pre-mortem)

**Goal:** Automated retry mechanism for failed notifications in DLQ to reduce ops burden.

| AC ID    | Acceptance Criteria                                                                                               | Priority | Test Type   |
| -------- | ----------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| AC-11.1  | CloudWatch Event rule triggers DLQ processor Lambda hourly                                                        | MUST     | CDK         |
| AC-11.2  | DLQ processor re-drives up to 10 messages per run (rate limiting)                                                 | MUST     | Unit        |
| AC-11.3  | After 3 failed retries, message moved to permanent failure queue                                                  | MUST     | Integration |
| AC-11.4  | DLQ processor logs retry attempt number and failure reason                                                        | SHOULD   | Unit        |
| AC-11.5  | `DLQRetrySuccess` and `DLQRetryFailure` metrics emitted                                                           | SHOULD   | Unit        |
| AC-11.6  | Permanent failure queue triggers ops notification via SNS                                                         | SHOULD   | CDK         |
| AC-11.7  | Retry backoff: 1st retry after 5min, 2nd after 15min, 3rd after 1h (exponential)                                  | MUST     | Unit        |
| AC-11.8  | Circuit breaker: if ≥5 retries fail in 1h window, pause retries for 4h                                            | MUST     | Unit        |
| AC-11.9  | Only retry if error is classified as Retriable (429, 5xx, timeout)                                                | MUST     | Unit        |
| AC-11.10 | Permanent errors (400, 401) moved directly to failure queue (no retries)                                          | MUST     | Unit        |
| AC-11.11 | Failure queue alarm fires if depth > 100 (requires immediate ops action)                                          | MUST     | CDK         |
| AC-11.12 | Runbook: "How to manually drain DLQ when retries exhausted"                                                       | MUST     | Docs        |
| AC-11.13 | Metric: `DLQRetryAttempt` (tracks total retries attempted, grouped by error type)                                 | SHOULD   | Unit        |
| AC-11.14 | DLQ messages retained for 24h (configurable retention policy)                                                     | SHOULD   | CDK         |
| AC-11.15 | After final retry failure, trigger admin notification (to ops inbox)                                              | SHOULD   | Unit        |
| AC-11.16 | Admin notification includes: userEmail, leaseId, eventType, failureReason, retryCount                             | SHOULD   | Unit        |
| AC-11.17 | Admin can manually inspect DLQ via Lambda console OR EventBridge console (documented)                             | SHOULD   | Docs        |
| AC-11.18 | Metrics: `DeliveryFailureRate`, `DLQSize`, `RetryExhausted` emitted hourly                                        | SHOULD   | Unit        |
| AC-11.19 | CloudWatch dashboard: Failed notifications count + retry backlog + success rate                                   | SHOULD   | CDK         |
| AC-11.20 | For critical notifications (e.g., lease termination), escalate to Slack channel                                   | SHOULD   | CDK         |
| AC-11.21 | Runbook updated: "How to handle permanently failed notifications and investigate root cause"                      | SHOULD   | Docs        |
| AC-11.22 | Cost tracking: Tag all Notify API calls with leaseId + eventType for cost attribution                             | SHOULD   | Unit        |
| AC-11.23 | Dashboard: Total emails sent + estimated cost ($/day, $/month, cost per email type)                               | SHOULD   | CDK         |
| AC-11.24 | Idempotency cost audit: Verify no duplicate sends (which double costs)                                            | SHOULD   | Unit        |
| AC-11.25 | DLQ cost analysis: Estimate cost of retry storms (retries are extra Notify charges)                               | SHOULD   | Docs        |
| AC-11.26 | Alert: If daily email cost exceeds threshold (e.g., £500), escalate to ops team                                   | SHOULD   | CDK         |
| AC-11.27 | Runbook: "How to optimize email sending (reduce retries, improve idempotency, batch emails)"                      | SHOULD   | Docs        |
| AC-11.28 | CloudWatch dashboard: Send rate, success rate, error rate, DLQ depth, latency percentiles                         | SHOULD   | CDK         |
| AC-11.29 | Runbook library minimum 5 runbooks: DLQ recovery, rate limiting, template drift, enrichment fail, preference bugs | SHOULD   | Docs        |
| AC-11.30 | Automated alerts configured: Failure rate > 5%, DLQ depth > 50, latency p99 > 5s, throttles > 5                   | SHOULD   | CDK         |
| AC-11.31 | On-call runbook: "First 5 steps to debug a notification failure" (decision tree format)                           | SHOULD   | Docs        |
| AC-11.32 | Notify status page monitored; alert on service degradation                                                        | SHOULD   | CDK         |
| AC-11.33 | Template E2E test (n5-8) blocks deployment if Notify sandbox API changes                                          | SHOULD   | CI Config   |
| AC-11.34 | Load test: 100 emails/second sustained; measure DLQ rate, latency, cost                                           | SHOULD   | Load Test   |
| AC-11.35 | Capacity planning: Estimate max throughput (emails/sec) and monthly cost at launch                                | SHOULD   | Docs        |
| AC-11.36 | Integration test: Simulate Notify 5xx errors; verify DLQ recovery works end-to-end                                | SHOULD   | Integration |
| AC-11.37 | Operations dashboard: DLQ depth chart visible on home (30-second refresh, real-time)                              | SHOULD   | CDK         |
| AC-11.38 | Dashboard alerts: Color-coded (Green: 0-10, Yellow: 11-50, Red: >50 messages)                                     | SHOULD   | CDK         |
| AC-11.39 | Quick action buttons on dashboard: "Drain DLQ", "Pause retries", "Force retry now"                                | SHOULD   | CDK         |
| AC-11.40 | Operational metric: `OperationalWorkItems` = DLQ depth + pending manual approvals + conflicts                     | SHOULD   | Unit        |
| AC-11.41 | Daily email summary: Sent count, failed count, DLQ status, cost, top error types                                  | SHOULD   | Lambda      |
| AC-11.42 | Ops runbook includes decision tree: "Is Notify down or is our API key revoked?"                                   | SHOULD   | Docs        |
| AC-11.43 | Status page link in CloudWatch dashboard (1-click to check GOV.UK Notify status)                                  | SHOULD   | CDK         |
| AC-11.44 | Contract test: EventBridge DLQ message format (N-4 → DLQ → N-5 processor parsing)                                 | MUST     | Integration |
| AC-11.45 | Integration test: DLQ message parsing (verify N-5 processor understands N-4 event format)                         | MUST     | Integration |
| AC-11.46 | Documentation: "DLQ processor assumes N-4's EventBridge DLQ message schema; confirm before deployment"            | SHOULD   | Docs        |

---

### PRD Feature → Epic Story Mapping

| PRD Feature              | Requirement                          | Story | Status  |
| ------------------------ | ------------------------------------ | ----- | ------- |
| Feature 3: GOV.UK Notify | FR-3.1: Notify SDK Integration       | n5-1  | Planned |
| Feature 3: GOV.UK Notify | FR-3.2: Event Schema Validation      | n5-2  | Planned |
| Feature 3: GOV.UK Notify | FR-3.3: Email Ownership Verification | n5-3  | Planned |
| Feature 3: GOV.UK Notify | FR-3.4: Lease Lifecycle Emails       | n5-4  | Planned |
| Feature 3: GOV.UK Notify | FR-3.5: Monitoring Alert Emails      | n5-5  | Planned |
| Feature 3: GOV.UK Notify | FR-3.6: DynamoDB Enrichment          | n5-6  | Planned |
| Feature 3: GOV.UK Notify | FR-3.7: Idempotency                  | n5-7  | Planned |
| Feature 3: GOV.UK Notify | NFR-3.1: E2E Testing (Pre-mortem)    | n5-8  | Planned |
| Feature 3: GOV.UK Notify | NFR-3.2: Template Drift Detection    | n5-9  | Planned |
| Feature 3: GOV.UK Notify | Stakeholder: User Preferences        | n5-10 | Planned |
| Feature 3: GOV.UK Notify | NFR-3.3: DLQ Auto-Retry (Pre-mortem) | n5-11 | Planned |

### Architecture Component → Story Mapping

| Architecture Component       | Section               | Story      |
| ---------------------------- | --------------------- | ---------- |
| NotifySender class           | notify-sender.ts      | n5-1       |
| Zod schema validation        | validation.ts         | n5-2       |
| Email ownership verification | enrichment.ts         | n5-3       |
| Template registry            | templates.ts          | n5-4, n5-5 |
| DynamoDB enrichment          | enrichment.ts         | n5-6       |
| Idempotency (Powertools)     | handler.ts            | n5-7       |
| User preferences table       | notification-stack.ts | n5-10      |
| DLQ auto-retry processor     | dlq-processor.ts      | n5-11      |

### Story Dependency Graph

```
n5-1 (Notify SDK) ──┬──────────────────► n5-4 (Lifecycle Templates)
                    │                           │
                    │                           ▼
                    │                   n5-5 (Monitoring Templates)
                    │                           │
                    │                           ▼
n5-2 (Schema Val) ──┼──────────────────► n5-3 (Ownership Verify)
                    │                           │
                    │                           ▼
n5-6 (Enrichment) ──┴──────────────────► n5-7 (Idempotency)
                                               │
                                               ▼
n5-10 (Preferences) ────────────────────► [All stories]
                                               │
                                               ▼
n5-8 (E2E Test) ◄────────────────────── n5-9 (Startup Validation)
                                               │
                                               ▼
                                        n5-11 (DLQ Auto-Retry)
```

## Risks, Assumptions, Open Questions

### Risks

| Risk                             | Probability | Impact   | Mitigation                                                      | Owner |
| -------------------------------- | ----------- | -------- | --------------------------------------------------------------- | ----- |
| GOV.UK Notify API changes        | Low         | High     | Startup template validation (n5-9), E2E tests (n5-8)            | Dev   |
| Template field mismatch          | Medium      | High     | Startup validation catches before first email                   | Dev   |
| DynamoDB enrichment latency      | Low         | Medium   | Parallel queries, timeout handling                              | Dev   |
| Rate limiting (429) during surge | Medium      | Medium   | Exponential backoff, SQS buffer (N-4)                           | Dev   |
| API key expiry                   | Medium      | High     | 30-day warning alarm (N-4), rotation runbook                    | Ops   |
| ISB schema breaking change       | Medium      | High     | Zod `.passthrough()` for new fields, versioning strategy (n4-9) | Dev   |
| Email to wrong recipient         | Low         | Critical | Mandatory ownership verification (n5-3)                         | Dev   |

### Assumptions

| Assumption                                   | Validation                     | Impact if Wrong            |
| -------------------------------------------- | ------------------------------ | -------------------------- |
| GOV.UK Notify sandbox available for testing  | Verify during setup            | Cannot run E2E tests       |
| ISB DynamoDB exports stable (CloudFormation) | Confirmed with ISB team (n4-9) | Update imports             |
| Users have valid .gov.uk email addresses     | ISB validates on signup        | Non-critical (send anyway) |
| Notify API key has sufficient permissions    | Test during setup              | Auth failures              |
| 10 templates sufficient for MVP              | Review with stakeholders       | Add templates              |
| User names available in ISB data             | Check LeaseTable schema        | Fallback to email prefix   |

### Open Questions

| Question                                                  | Priority | Decision Required By | Default if Unresolved                |
| --------------------------------------------------------- | -------- | -------------------- | ------------------------------------ |
| Should we support cc/bcc on emails?                       | Low      | N-6 start            | No - single recipient only           |
| What should happen if user opts out of ALL notifications? | Medium   | n5-10 implementation | Allow opt-out, warn user in portal   |
| Should LeaseApproved email include full SSO instructions? | Medium   | Template design      | Yes - include step-by-step           |
| Is 60-second lease-level dedup window appropriate?        | Low      | Load testing         | Start with 60s, adjust based on data |
| Should we log email content to CloudWatch?                | Low      | Security review      | No - log only metadata               |

## Test Strategy Summary

### Test Coverage Matrix

| Story                  | Unit Tests | Integration Tests | E2E Tests | Load Tests | Manual |
| ---------------------- | ---------- | ----------------- | --------- | ---------- | ------ |
| n5-1 (Notify SDK)      | 13         | 3                 | 1         | -          | -      |
| n5-2 (Schema)          | 15         | -                 | -         | -          | -      |
| n5-3 (Ownership)       | 8          | 4                 | -         | -          | -      |
| n5-4 (Lifecycle)       | 8          | -                 | 1         | -          | 1      |
| n5-5 (Monitoring)      | 12         | -                 | 1         | -          | 1      |
| n5-6 (Enrichment)      | 14         | 4                 | -         | 1          | -      |
| n5-7 (Idempotency)     | 9          | 2                 | -         | -          | -      |
| n5-8 (E2E Test)        | -          | -                 | 6         | -          | -      |
| n5-9 (Startup Val)     | 8          | 3                 | -         | -          | -      |
| n5-10 (Preferences)    | 6          | 2                 | -         | -          | 1      |
| n5-11 (DLQ Auto-Retry) | 4          | 1                 | -         | -          | -      |
| **Total**              | **97**     | **19**            | **9**     | **1**      | **3**  |

### Test Environments

| Environment | Purpose            | GOV.UK Notify | ISB Integration    |
| ----------- | ------------------ | ------------- | ------------------ |
| Local       | Unit tests         | Mocked        | Mocked             |
| CI/CD       | Unit + Integration | Sandbox API   | DynamoDB Local     |
| Staging     | E2E tests          | Sandbox API   | Real ISB (staging) |
| Production  | Smoke tests        | Live API      | Real ISB (prod)    |

### Test Priority Framework

| Priority | Criteria           | Examples                        |
| -------- | ------------------ | ------------------------------- |
| P0       | Security failures  | Ownership mismatch, PII logging |
| P1       | Flow blockers      | SDK errors, DynamoDB failures   |
| P2       | Observability gaps | Missing metrics, incorrect logs |
| P3       | Documentation      | Code comments, runbooks         |

### Critical Test Scenarios

1. **Happy Path**: LeaseApproved event → email sent to correct user
2. **Ownership Mismatch**: Event with wrong email → SecurityError, no email
3. **Rate Limited**: 429 from Notify → retry with backoff
4. **Auth Failure**: 401/403 → CriticalError, immediate alarm
5. **Schema Invalid**: Unknown event type → PermanentError, DLQ
6. **Enrichment Partial**: DynamoDB missing data → continue with available
7. **Duplicate Event**: Same event.id twice → second skipped
8. **User Opted Out**: notificationsEnabled=false → skip, metric emitted
9. **Template Drift**: Missing field in Notify template → startup warning
10. **Cold Start Validation**: All templates validated before first request

### Pre-Deployment Checklist

**Functional Tests:**

- [ ] All unit tests passing (97 tests)
- [ ] All integration tests passing (19 tests)
- [ ] E2E tests passing in staging (9 tests)
- [ ] Load test passing (200 events/30s)

**Configuration:**

- [ ] GOV.UK Notify templates created and validated
- [ ] Template IDs configured in environment variables
- [ ] Secrets Manager contains valid API key
- [ ] CDK diff shows expected changes only

**Security Validation:**

- [ ] Ownership verification enabled (cannot be bypassed)
- [ ] Email domain whitelist (.gov.uk) enforced
- [ ] No API keys/secrets in logs (grep audit completed)
- [ ] DOMPurify and URL encoding enabled in NotifySender
- [ ] Cross-account email verification (ISB SandboxAccountTable) enabled
- [ ] Idempotency tampering detection enabled

**Observability:**

- [ ] Metrics dashboard includes EmailSent, EmailFailed
- [ ] Security metrics added: OwnershipMismatch, EnrichmentConflict, IdempotencyTampering
- [ ] Runbook updated with new failure modes and security incidents
- [ ] "How to detect ISB data compromise" runbook created

## Test Case Framework (Traceability)

### Test Case Naming Convention

Format: `test_n5-{story}_{ACID}_{scenario}`

Example: `test_n5-1_AC117_html_injection`

### Critical Security AC Test Cases (MUST Implementation)

| AC ID   | AC Description              | Test Case ID                           | Scenario                                     | Expected Result                                |
| ------- | --------------------------- | -------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| AC-1.17 | Use DOMPurify sanitise      | test_n5-1_AC117_html_injection         | Input: `<img src=x onerror=alert()>`         | Sanitised output, no script execution          |
| AC-1.18 | URL encode personalisation  | test_n5-1_AC118_url_injection          | Input: `leaseId=?redirect=attacker.com`      | URL encoded: `%3Fredirect`                     |
| AC-3.15 | Cross-verify emails         | test_n5-3_AC315_lease_account_mismatch | LeaseTable.email ≠ SandboxAccountTable.email | Send fails, SECURITY alert logged              |
| AC-3.22 | Reject suspicious patterns  | test_n5-3_AC322_email_injection        | Input: `jane.doe++attacker@gov.uk`           | Rejected with PermanentError                   |
| AC-6.21 | Detect enrichment conflicts | test_n5-6_AC621_status_conflict        | Event=LeaseDenied, enriched.status=Approved  | Conflict logged, ticket created, manual review |
| AC-7.13 | Idempotency tampering       | test_n5-7_AC713_replay_email_change    | Replay same event.id with different email    | SECURITY error, no send                        |
| AC-9.13 | Template validation         | test_n5-9_AC913_template_version       | Template field mismatch                      | Startup failure, clear error message           |

### Performance AC Test Cases (SHOULD Implementation)

| AC ID   | AC Description     | Test Case ID                  | Scenario                  | Expected Result                |
| ------- | ------------------ | ----------------------------- | ------------------------- | ------------------------------ |
| AC-6.18 | Load test          | test_n5-6_AC618_load_200      | 200 events in 30s         | All delivered, <5s latency p95 |
| AC-6.6  | Enrichment latency | test_n5-6_AC6_enrichment_perf | Parallel DynamoDB queries | <50ms total enrichment time    |

### Runbook-Based Test Cases (Documentation ACs)

| Story | AC ID    | Runbook Required                        | Test Validation                                    |
| ----- | -------- | --------------------------------------- | -------------------------------------------------- |
| n5-3  | AC-3.21  | Verification audit log 90-day retention | Verify log retention policy in CDK                 |
| n5-6  | AC-6.23  | Detect ISB data compromise              | Document 3 detection metrics and how to query them |
| n5-7  | AC-7.16  | EventBridge replay scenarios            | Document 4 replay scenarios and expected behavior  |
| n5-11 | AC-11.12 | Manual DLQ drain procedure              | Step-by-step guide with example CLI commands       |

---

_Generated by BMAD Epic Tech Context Workflow v1.0_
_Date: 2025-11-27_
_Author: cns_
_Epic: N-5 User Email Notifications_
_Dependencies: Epic N-4 (Notification Infrastructure)_
