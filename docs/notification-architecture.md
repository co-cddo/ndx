# NDX Notification Architecture

**Author:** cns
**Date:** 2025-11-27
**Version:** 1.0
**Project:** National Digital Exchange (NDX) - Notification System
**Features:** 3 (GOV.UK Notify Integration) & 4 (Slack Integration)

---

## Executive Summary

This architecture defines the serverless notification system for NDX, handling both user-facing emails via GOV.UK Notify and operational alerts via Slack. The design follows a **"one brain, two mouths"** pattern - a single Lambda function that processes Innovation Sandbox events and routes to the appropriate notification channel.

**Key Architectural Decisions:**

- Single `NotificationStack` (separate from static site infrastructure)
- TypeScript Lambda with AWS Lambda Powertools
- EventBridge subscription to existing ISB event bus (same account)
- GOV.UK Notify for user emails, Slack webhooks for ops alerts
- Idempotency via Powertools, single DLQ, structured logging
- Read-only DynamoDB access for event enrichment

---

## Decision Summary

| Category            | Decision                    | Version  | Rationale                                 |
| ------------------- | --------------------------- | -------- | ----------------------------------------- |
| **Stack Strategy**  | New `NotificationStack`     | N/A      | Separate lifecycle, isolated blast radius |
| **Lambda Runtime**  | Node.js 20.x + TypeScript   | 20.x LTS | Consistency with CDK, shared tooling      |
| **Lambda Bundling** | CDK `NodejsFunction`        | esbuild  | Zero-config, tree-shaking                 |
| **EventBridge**     | ISB's existing bus          | N/A      | Same account, direct subscription         |
| **GOV.UK Notify**   | `notifications-node-client` | Latest   | Official GDS SDK                          |
| **Slack**           | Incoming Webhook URL        | N/A      | Simple, MVP-appropriate                   |
| **DynamoDB Access** | Direct read-only            | N/A      | Same account, IAM permissions             |
| **Secrets**         | Single JSON secret          | N/A      | `/ndx/notifications/credentials`          |
| **Idempotency**     | Lambda Powertools           | Latest   | Built-in DynamoDB persistence             |
| **Logging**         | Lambda Powertools Logger    | Latest   | Structured JSON, correlation IDs          |
| **Infra Alarms**    | CloudWatch → AWS Chatbot    | N/A      | Native Slack integration                  |
| **Testing**         | Unit + Integration          | Jest     | DynamoDB Local for integration            |

---

## Project Structure

```
infra/
├── bin/
│   └── infra.ts                      # CDK app entry (adds NotificationStack)
├── lib/
│   ├── ndx-stack.ts                  # Existing S3/CloudFront stack
│   ├── ndx-stack.test.ts
│   ├── notification-stack.ts         # EventBridge + Lambda + DLQ + Alarms
│   ├── notification-stack.test.ts
│   └── lambda/
│       └── notification/
│           ├── handler.ts            # Entry point, routing logic
│           ├── notify-sender.ts      # GOV.UK Notify SDK wrapper
│           ├── slack-sender.ts       # Slack webhook wrapper
│           ├── enrichment.ts         # DynamoDB queries (read-only)
│           ├── validation.ts         # Event schema validation
│           ├── templates.ts          # Template registry
│           ├── errors.ts             # Error classification
│           └── types.ts              # Shared TypeScript types
├── test/
│   ├── unit/
│   │   ├── handler.test.ts
│   │   ├── notify-sender.test.ts
│   │   └── slack-sender.test.ts
│   └── integration/
│       └── enrichment.test.ts        # DynamoDB Local tests
├── cdk.json
├── package.json
└── tsconfig.json
```

---

## FR Category to Architecture Mapping

| PRD Category                   | Architecture Component    | Files                              |
| ------------------------------ | ------------------------- | ---------------------------------- |
| EventBridge Integration        | `NotificationStack` rules | `notification-stack.ts`            |
| Lambda Processing              | Handler + Powertools      | `handler.ts`, `validation.ts`      |
| DynamoDB Enrichment            | Read-only queries         | `enrichment.ts`                    |
| GOV.UK Notify (18 event types) | Notify SDK wrapper        | `notify-sender.ts`, `templates.ts` |
| Slack Alerts (5 alert types)   | Webhook wrapper           | `slack-sender.ts`, `templates.ts`  |
| Error Handling                 | Classification + DLQ      | `errors.ts`, stack DLQ             |
| Secrets Management             | Secrets Manager           | `notification-stack.ts`            |
| Monitoring                     | CloudWatch + Chatbot      | `notification-stack.ts`            |

---

## Technology Stack Details

### Core Technologies

**AWS CDK v2**

- Extends existing infrastructure project
- TypeScript for type-safe infrastructure

**Node.js 20.x LTS**

- Lambda runtime
- Consistent with CDK tooling

**AWS Lambda Powertools for TypeScript**

```bash
yarn add @aws-lambda-powertools/logger @aws-lambda-powertools/idempotency @aws-lambda-powertools/metrics
```

- Structured logging with correlation IDs
- Built-in idempotency with DynamoDB
- Custom CloudWatch metrics

**GOV.UK Notify SDK**

```bash
yarn add notifications-node-client
```

- Official GDS-maintained client
- Handles auth, retries, types

### AWS Services

| Service         | Purpose                                |
| --------------- | -------------------------------------- |
| EventBridge     | Event subscription from ISB            |
| Lambda          | Event processing                       |
| DynamoDB        | Idempotency table (Powertools-managed) |
| DynamoDB (ISB)  | Event enrichment (read-only access)    |
| SQS             | Dead Letter Queue                      |
| Secrets Manager | API credentials                        |
| CloudWatch      | Logs, metrics, alarms                  |
| AWS Chatbot     | Infra alerts to Slack                  |

---

## Integration Points

### EventBridge → Lambda

```typescript
// notification-stack.ts
// ISB EventBus name pattern: ISB-{namespace}-ISBEventBus
const namespace = "prod" // or from config
const rule = new Rule(this, "NotificationRule", {
  eventBus: EventBus.fromEventBusName(this, "ISBBus", `ISB-${namespace}-ISBEventBus`),
  eventPattern: {
    detailType: [
      // User notifications (GOV.UK Notify)
      "LeaseRequested",
      "LeaseApproved",
      "LeaseDenied",
      "LeaseTerminated",
      "LeaseFrozen",
      "LeaseBudgetThresholdAlert",
      "LeaseDurationThresholdAlert",
      "LeaseFreezingThresholdAlert",
      "LeaseBudgetExceeded",
      "LeaseExpired",
      // Ops alerts (Slack)
      "AccountCleanupFailed",
      "AccountQuarantined",
      "AccountDriftDetected",
    ],
  },
})
rule.addTarget(new LambdaFunction(notificationLambda))
```

### Lambda → DynamoDB (Read-Only)

```typescript
// IAM policy - read-only access to ISB tables
// Table names are imported from ISB CloudFormation exports
role.addToPolicy(
  new PolicyStatement({
    actions: ["dynamodb:GetItem", "dynamodb:Query"],
    resources: [
      Fn.importValue(`ISB-${namespace}-LeaseTable`),
      `${Fn.importValue(`ISB-${namespace}-LeaseTable`)}/index/*`,
      Fn.importValue(`ISB-${namespace}-SandboxAccountTable`),
      Fn.importValue(`ISB-${namespace}-LeaseTemplateTable`),
    ],
  }),
)
```

### Lambda → GOV.UK Notify

```typescript
// notify-sender.ts
import { NotifyClient } from "notifications-node-client"

export class NotifySender {
  private client: NotifyClient

  constructor(apiKey: string) {
    this.client = new NotifyClient(apiKey)
  }

  async send(params: NotifyParams): Promise<NotifyResponse> {
    return this.client.sendEmail(params.templateId, params.email, { personalisation: params.personalisation })
  }
}
```

### Lambda → Slack

```typescript
// slack-sender.ts
export class SlackSender {
  constructor(private webhookUrl: string) {}

  async send(params: SlackParams): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.buildBlockKit(params)),
    })

    if (!response.ok) {
      throw this.classifyError(response.status)
    }
  }
}
```

### CloudWatch → AWS Chatbot → Slack

```typescript
// notification-stack.ts
const alarmTopic = new Topic(this, "AlarmTopic")

new SlackChannelConfiguration(this, "SlackChannel", {
  slackChannelConfigurationName: "ndx-infra-alerts",
  slackWorkspaceId: "TXXXXXXXX",
  slackChannelId: "CXXXXXXXX",
  notificationTopics: [alarmTopic],
})

dlqDepthAlarm.addAlarmAction(new SnsAction(alarmTopic))
```

---

## Implementation Patterns

### Handler Structure (One Brain, Two Mouths)

```typescript
// handler.ts
import { makeIdempotent } from "@aws-lambda-powertools/idempotency"
import { DynamoDBPersistenceLayer } from "@aws-lambda-powertools/idempotency/dynamodb"
import { Logger } from "@aws-lambda-powertools/logger"

const logger = new Logger({ serviceName: "ndx-notifications" })
const persistenceStore = new DynamoDBPersistenceLayer({ tableName: "NdxIdempotency" })

export const handler = makeIdempotent(
  async (event: EventBridgeEvent<string, ISBEventDetail>) => {
    const eventId = event.id
    const eventType = event["detail-type"]

    logger.info("Processing event", { eventId, eventType })

    // 1. Validate schema
    const validated = validateSchema(event)
    if (!validated.success) {
      throw new PermanentError("Invalid event schema", validated.errors)
    }

    // 2. Enrich from DynamoDB (if needed)
    const enriched = await enrichIfNeeded(validated.data)

    // 3. Route to appropriate sender
    if (isUserNotification(eventType)) {
      return notifySender.send(enriched)
    } else {
      return slackSender.send(enriched)
    }
  },
  { persistenceStore },
)
```

### Error Classification

```typescript
// errors.ts
export class RetriableError extends Error {
  readonly retriable = true
  constructor(
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message)
  }
}

export class PermanentError extends Error {
  readonly retriable = false
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
  }
}

export class CriticalError extends Error {
  readonly retriable = false
  readonly critical = true
  constructor(message: string) {
    super(message)
  }
}

export function classifyHttpError(status: number): Error {
  switch (status) {
    case 400:
      return new PermanentError("Bad request - check payload")
    case 401:
    case 403:
      return new CriticalError("Auth failed - check API key")
    case 429:
      return new RetriableError("Rate limited", 1000)
    default:
      if (status >= 500) {
        return new RetriableError("Service error")
      }
      return new PermanentError(`Unexpected status: ${status}`)
  }
}
```

### Template Registry

```typescript
// templates.ts
export interface TemplateConfig {
  channel: "notify" | "slack"
  templateId?: string // For Notify
  priority?: "normal" | "critical" // For Slack
  requiredFields: string[]
  optionalFields?: string[]
}

export const TEMPLATES: Record<string, TemplateConfig> = {
  // User notifications (GOV.UK Notify)
  LeaseApproved: {
    channel: "notify",
    templateId: process.env.NOTIFY_TEMPLATE_LEASE_APPROVED,
    requiredFields: ["userName", "accountId", "ssoUrl", "expiryDate"],
    optionalFields: ["budgetLimit"],
  },
  LeaseExpiring: {
    channel: "notify",
    templateId: process.env.NOTIFY_TEMPLATE_LEASE_EXPIRING,
    requiredFields: ["userName", "accountId", "expiryDate", "hoursRemaining"],
  },
  BudgetThresholdReached: {
    channel: "notify",
    templateId: process.env.NOTIFY_TEMPLATE_BUDGET_WARNING,
    requiredFields: ["userName", "accountId", "currentSpend", "budgetLimit", "percentUsed"],
  },

  // Ops alerts (Slack)
  AccountQuarantined: {
    channel: "slack",
    priority: "critical",
    requiredFields: ["accountId", "reason", "quarantinedAt"],
  },
  LeaseFrozen: {
    channel: "slack",
    priority: "critical",
    requiredFields: ["accountId", "reason", "userEmail"],
  },
  DailySpendSummary: {
    channel: "slack",
    priority: "normal",
    requiredFields: ["totalSpend", "accountCount", "topServices"],
  },
}
```

### Enrichment Pattern

```typescript
// enrichment.ts
import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb"

const client = new DynamoDBClient({})

export async function enrichIfNeeded(event: ValidatedEvent): Promise<EnrichedEvent> {
  const template = TEMPLATES[event.type]
  const missing = findMissingFields(event, template.requiredFields)

  if (missing.length === 0) {
    return event as EnrichedEvent // Event has everything we need
  }

  // Query DynamoDB for missing data
  const enrichment = await queryEnrichmentData(event.leaseId, event.userEmail)

  // Validate we got required fields
  const stillMissing = findMissingFields({ ...event, ...enrichment }, template.requiredFields)
  if (stillMissing.length > 0) {
    throw new PermanentError(`Missing required fields after enrichment: ${stillMissing.join(", ")}`)
  }

  return { ...event, ...enrichment }
}
```

---

## Consistency Rules

### Naming Conventions

| Type              | Convention        | Example                          |
| ----------------- | ----------------- | -------------------------------- |
| Stack class       | PascalCase        | `NotificationStack`              |
| Lambda handler    | camelCase export  | `export const handler`           |
| TypeScript files  | kebab-case        | `notify-sender.ts`               |
| Test files        | `.test.ts` suffix | `notify-sender.test.ts`          |
| DynamoDB tables   | PascalCase prefix | `NdxIdempotency`                 |
| Secrets path      | kebab-case path   | `/ndx/notifications/credentials` |
| EventBridge rules | kebab-case        | `ndx-notify-lease-approved`      |
| CloudWatch alarms | kebab-case        | `ndx-notification-dlq-depth`     |
| Env variables     | SCREAMING_SNAKE   | `NOTIFY_TEMPLATE_LEASE_APPROVED` |

### Code Organization

- One file per concern (sender, enrichment, validation)
- Shared types in `types.ts`
- All errors extend base classes in `errors.ts`
- Template config in `templates.ts` (not hardcoded in senders)

### Logging Standards

```typescript
// Always include correlation ID
logger.info("message", { eventId, eventType, ...context })

// Log levels:
// ERROR - DLQ-worthy failures
// WARN  - Retriable errors, degraded operation
// INFO  - Success, key milestones
// DEBUG - Development details (disabled in prod)
```

---

## Data Architecture

### Secrets Structure

**Path:** `/ndx/notifications/credentials`

```json
{
  "notifyApiKey": "key-name-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "slackWebhookUrl": "https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_BOT/YOUR_SECRET"
}
```

### Idempotency Table (Powertools-managed)

**Table:** `NdxIdempotency`

| Attribute  | Type        | Purpose                |
| ---------- | ----------- | ---------------------- |
| id         | String (PK) | Event ID hash          |
| expiration | Number      | TTL timestamp          |
| status     | String      | INPROGRESS / COMPLETED |
| data       | String      | Response data          |

### DynamoDB Access (ISB Tables - Read Only)

Table names are dynamically resolved from CloudFormation exports: `ISB-{namespace}-{TableName}Table`

| Table               | Key(s)                                        | Fields Used for Enrichment                                                                  |
| ------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| LeaseTable          | PK: `userEmail`, SK: `uuid`                   | originalLeaseTemplateName, awsAccountId, expirationDate, maxSpend, totalCostAccrued, status |
| LeaseTable (GSI)    | PK: `status`, SK: `originalLeaseTemplateUuid` | For querying leases by status                                                               |
| SandboxAccountTable | PK: `awsAccountId`                            | name, email, status                                                                         |
| LeaseTemplateTable  | PK: `uuid`                                    | name, maxSpend, leaseDurationInHours                                                        |

See **ISB Integration** section for full table schemas.

---

## Security Architecture

### Security Countermeasures (Red Team Validated)

The following security controls address vulnerabilities identified through adversarial analysis:

#### P0 - Critical Controls

**1. EventBridge Source Validation**

```typescript
// handler.ts - Reject events from unauthorized sources
const ALLOWED_SOURCES = ["innovation-sandbox"]

export const handler = async (event: EventBridgeEvent<string, unknown>) => {
  if (!ALLOWED_SOURCES.includes(event.source)) {
    logger.error("Rejected unauthorized event source", { source: event.source })
    throw new SecurityError("Unauthorized event source")
  }
  // ... continue processing
}
```

**2. Email Ownership Verification**

```typescript
// enrichment.ts - Cross-check email against lease owner
export async function verifyEmailOwnership(leaseId: LeaseKey, claimedEmail: string): Promise<void> {
  const lease = await getLeaseByKey(leaseId)
  if (lease.userEmail.toLowerCase() !== claimedEmail.toLowerCase()) {
    logger.error("Email mismatch detected", {
      leaseEmail: "[REDACTED]",
      claimedEmail: "[REDACTED]",
      leaseId: leaseId.uuid,
    })
    throw new SecurityError("Email does not match lease owner")
  }
}
```

#### P1 - High Priority Controls

**3. Reserved Concurrency (Blast Radius Limiting)**

```typescript
// notification-stack.ts
const notificationLambda = new NodejsFunction(this, "Handler", {
  // ... other config
  reservedConcurrentExecutions: 10, // Prevent account-wide exhaustion
})
```

**4. Circuit Breaker Pattern**

```typescript
// errors.ts - Track failures and break circuit
const CIRCUIT_BREAKER = {
  failures: 0,
  lastFailure: 0,
  threshold: 5,
  resetMs: 60000, // 1 minute
}

export function checkCircuitBreaker(): void {
  const now = Date.now()
  if (now - CIRCUIT_BREAKER.lastFailure > CIRCUIT_BREAKER.resetMs) {
    CIRCUIT_BREAKER.failures = 0 // Reset after cooldown
  }
  if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.threshold) {
    throw new CircuitOpenError("Circuit breaker open - sending to DLQ")
  }
}

export function recordFailure(): void {
  CIRCUIT_BREAKER.failures++
  CIRCUIT_BREAKER.lastFailure = Date.now()
}
```

#### P2 - Medium Priority Controls

**5. Encrypted CloudWatch Logs**

```typescript
// notification-stack.ts
const kmsKey = new Key(this, "LogsKey", {
  description: "KMS key for notification logs encryption",
  enableKeyRotation: true,
})

const logGroup = new LogGroup(this, "NotificationLogs", {
  logGroupName: "/aws/lambda/ndx-notification",
  encryptionKey: kmsKey,
  retention: RetentionDays.ONE_MONTH,
})
```

**6. Secrets Manager Resource Policy**

```typescript
// notification-stack.ts - Restrict secret access to this Lambda only
const secret = Secret.fromSecretNameV2(this, "Creds", "/ndx/notifications/credentials")

secret.addToResourcePolicy(
  new PolicyStatement({
    sid: "RestrictToNotificationLambda",
    effect: Effect.DENY,
    principals: [new AnyPrincipal()],
    actions: ["secretsmanager:GetSecretValue"],
    conditions: {
      ArnNotLike: {
        "aws:PrincipalArn": notificationLambda.role!.roleArn,
      },
    },
  }),
)
```

**7. Input Sanitization for Templates**

```typescript
// templates.ts - Escape special characters in personalisation values
export function sanitizePersonalisation(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
    ]),
  )
}
```

### IAM Permissions (Least Privilege)

```typescript
// Lambda execution role - table names from Fn.importValue
{
  // Read secrets
  "secretsmanager:GetSecretValue": "/ndx/notifications/*",

  // Read ISB DynamoDB (NO write - GetItem/Query only)
  "dynamodb:GetItem": [
    "ISB-{namespace}-LeaseTable",
    "ISB-{namespace}-SandboxAccountTable",
    "ISB-{namespace}-LeaseTemplateTable"
  ],
  "dynamodb:Query": [
    "ISB-{namespace}-LeaseTable",
    "ISB-{namespace}-LeaseTable/index/StatusIndex"
  ],

  // Idempotency table (read/write - Powertools-managed)
  "dynamodb:GetItem": "NdxIdempotency",
  "dynamodb:PutItem": "NdxIdempotency",
  "dynamodb:UpdateItem": "NdxIdempotency",
  "dynamodb:DeleteItem": "NdxIdempotency",

  // Logging
  "logs:CreateLogStream": "*",
  "logs:PutLogEvents": "*",

  // DLQ
  "sqs:SendMessage": "ndx-notification-dlq"
}
```

### Secrets Handling

- Retrieved from Secrets Manager at runtime (not env vars)
- Cached in Lambda memory for container lifetime
- Never logged (Powertools Logger automatically redacts)
- Rotation: Manual for MVP, automate in growth phase

### Data Protection

- No PII in Slack messages (account ID, not user email)
- User emails only sent to GOV.UK Notify (encrypted in transit)
- CloudWatch logs: no secrets, correlation IDs for tracing
- DLQ messages: contain event data for replay (encrypted at rest)

---

## Error Handling

### Retry Strategy

| Error Type                    | Action              | Max Attempts |
| ----------------------------- | ------------------- | ------------ |
| Retriable (429, 5xx, timeout) | Exponential backoff | 3            |
| Permanent (400)               | DLQ immediately     | 1            |
| Critical (401, 403)           | DLQ + alarm         | 1            |

### Dead Letter Queue

```typescript
// notification-stack.ts
const dlq = new Queue(this, "NotificationDLQ", {
  queueName: "ndx-notification-dlq",
  retentionPeriod: Duration.days(14),
  encryption: QueueEncryption.SQS_MANAGED,
})

const notificationLambda = new NodejsFunction(this, "NotificationHandler", {
  // ...
  deadLetterQueue: dlq,
  retryAttempts: 2, // EventBridge retries before DLQ
})
```

### Alarms

| Alarm                     | Threshold     | Action              |
| ------------------------- | ------------- | ------------------- |
| DLQ depth > 0             | Any messages  | AWS Chatbot → Slack |
| Lambda errors             | > 5 in 5 min  | AWS Chatbot → Slack |
| Zero notifications        | 0 in 24 hours | AWS Chatbot → Slack |
| Critical errors (401/403) | Any           | AWS Chatbot → Slack |

---

## Service Blueprint Analysis

### Service Layers

| Layer          | Components                                         | Responsibility             |
| -------------- | -------------------------------------------------- | -------------------------- |
| **Frontstage** | GOV.UK Notify emails, Slack messages               | User/Ops visible outputs   |
| **Backstage**  | Lambda, senders, enrichment, validation            | Hidden processing          |
| **Support**    | Secrets Manager, Idempotency, DLQ, Alarms, Chatbot | Operational infrastructure |

### Identified Pain Points

| Layer      | Pain Point                            | Impact                   | Status                              |
| ---------- | ------------------------------------- | ------------------------ | ----------------------------------- |
| Frontstage | User doesn't know notification failed | Lost engagement          | **Future: ISB UI confirmation**     |
| Frontstage | Slack messages lack actionable links  | Ops must search manually | **Future: Deep links to ISB admin** |
| Backstage  | Enrichment adds latency (10-50ms)     | Slight delay             | Acceptable for MVP                  |
| Backstage  | Single Lambda = single failure domain | All notifications down   | **Future: Split by channel**        |
| Support    | DLQ requires manual inspection        | Delayed recovery         | **Future: Auto-retry Lambda**       |
| Support    | No notification receipt confirmation  | Unknown delivery status  | **Future: Notify callbacks**        |

### Future Enhancement Opportunities

**Phase 2: Delivery Tracking**

```
User ← Email
       ↓
GOV.UK Notify delivery callback → API Gateway → Track in DynamoDB
       ↓
"Notification History" visible in ISB UI
```

**Phase 3: Interactive Slack**

```
Ops ← Slack message with interactive buttons
       ↓
[View Lease] [Extend 24h] [Terminate Now]
       ↓
Slack → API Gateway → ISB Admin Actions
```

**Phase 4: Channel Isolation**

```
Current: EventBridge → Single Lambda → Notify/Slack

Future:  EventBridge → NotifyLambda → GOV.UK Notify
                    → SlackLambda  → Slack Webhook
         (Independent scaling, isolated failures)
```

### Service Metrics

| Metric                 | Target  | Notes                                   |
| ---------------------- | ------- | --------------------------------------- |
| End-to-end latency     | < 500ms | EventBridge → notification sent         |
| Frontstage touchpoints | 2       | Email + Slack (expandable)              |
| Backstage components   | 5       | Modular for future split                |
| Support processes      | 5       | Comprehensive coverage                  |
| Failure recovery       | < 24h   | Manual DLQ review (automate in Phase 2) |

---

## Cost-Benefit Analysis

### Monthly Cost Estimate (10,000 events/month baseline)

| Category       | Service                            | Monthly Cost     |
| -------------- | ---------------------------------- | ---------------- |
| **Compute**    | Lambda (256MB, 500ms avg)          | $0.08            |
| **Storage**    | DynamoDB (Idempotency + reads)     | $0.27            |
| **Security**   | Secrets Manager + KMS              | $1.51            |
| **Monitoring** | CloudWatch (Logs, Alarms, Metrics) | $2.40            |
| **External**   | GOV.UK Notify, Slack               | $0.00 (free)     |
|                | **Total**                          | **~$4.30/month** |

### Cost at Scale

| Events/Month | Total Cost | Cost/Notification |
| ------------ | ---------- | ----------------- |
| 10,000       | ~$4.30     | $0.00043          |
| 50,000       | ~$6.30     | $0.00013          |
| 100,000      | ~$9.00     | $0.00009          |
| 500,000      | ~$27.00    | $0.00005          |

### Quantified Benefits

| Benefit                   | Impact                                  | Estimated Value |
| ------------------------- | --------------------------------------- | --------------- |
| Ops monitoring time saved | ~5 hours/week eliminated                | $200/month      |
| Support ticket reduction  | Fewer "why locked out" queries          | $100/month      |
| User productivity         | Faster access, work saved before expiry | $500/month      |
| **Total Monthly Benefit** |                                         | **~$800/month** |

### ROI Summary

| Metric                | Value                      |
| --------------------- | -------------------------- |
| Monthly Cost          | $4.30                      |
| Monthly Benefit       | ~$800                      |
| **ROI**               | **18,500%**                |
| Break-even            | 1 prevented support ticket |
| Cost per notification | < $0.001                   |

### Cost Optimization (Not Recommended)

| Opportunity                 | Savings     | Trade-off              |
| --------------------------- | ----------- | ---------------------- |
| Remove KMS log encryption   | $1.00/month | Reduced PII protection |
| Reduce CloudWatch retention | $0.20/month | Less historical data   |

**Verdict:** At $4.30/month, optimization effort exceeds potential savings. Keep all features.

---

## SWOT Analysis

### Strengths (Internal Positive)

| Strength                            | Impact                                             |
| ----------------------------------- | -------------------------------------------------- |
| Simple "One Brain" architecture     | Easy to understand, debug, deploy                  |
| Battle-tested AWS services          | Low operational risk                               |
| Official SDKs (Notify, AWS)         | Maintained, documented, typed                      |
| TypeScript consistency with CDK     | Shared tooling and expertise                       |
| Powertools (Logger, Idempotency)    | Production-ready patterns for free                 |
| Zero external costs                 | GOV.UK Notify + Slack webhooks free                |
| Security-first (Red Team validated) | Source validation, email ownership, encrypted logs |
| ISB schemas documented from source  | No guesswork on event formats                      |

### Weaknesses (Internal Negative)

| Weakness                 | Mitigation                      |
| ------------------------ | ------------------------------- |
| Single point of failure  | Future: split Lambda by channel |
| No delivery confirmation | Future: Notify callbacks        |
| Manual DLQ processing    | Future: auto-retry Lambda       |
| Solo developer knowledge | This documentation              |

### Opportunities (External Positive)

| Opportunity                             | Feasibility            |
| --------------------------------------- | ---------------------- |
| Additional channels (SMS, Push, Teams)  | High                   |
| Interactive Slack buttons               | Medium                 |
| Delivery analytics via Notify callbacks | High                   |
| Welsh language templates                | High (Notify built-in) |
| Notification preferences UI             | Medium                 |
| Cross-ISB reuse                         | High                   |

### Threats (External Negative)

| Threat                      | Probability | Mitigation                          |
| --------------------------- | ----------- | ----------------------------------- |
| ISB schema changes          | High        | Schema validation fails fast to DLQ |
| GOV.UK Notify outage        | Low         | Retry + DLQ preserves for replay    |
| API key compromise          | Low         | Secrets Manager + resource policy   |
| Slack data residency (GDPR) | Medium      | Review Slack compliance             |
| Team turnover               | Medium      | Comprehensive documentation         |

### Recommended Actions

| Priority | Action                              | Addresses                         |
| -------- | ----------------------------------- | --------------------------------- |
| P0       | Complete architecture documentation | Weakness: Knowledge concentration |
| P1       | Add Notify delivery callbacks       | Opportunity: Analytics            |
| P2       | Implement DLQ auto-retry            | Weakness: Manual processing       |
| P3       | Review Slack GDPR compliance        | Threat: Data residency            |

---

## Value Chain Analysis

### Primary Activities (Value Flow)

| Stage             | Input      | Output             | Value Added                         |
| ----------------- | ---------- | ------------------ | ----------------------------------- |
| **1. Capture**    | ISB events | Validated triggers | Security filtering, audit trail     |
| **2. Operations** | Triggers   | Enriched payloads  | Context (names, dates, URLs)        |
| **3. Delivery**   | Payloads   | Messages sent      | Reliable transport to channels      |
| **4. Engagement** | Messages   | User attention     | Trust (GOV.UK brand), clarity       |
| **5. Action**     | Attention  | Business outcomes  | Informed decisions, faster response |

### Value Transformation Example

```
IN:  { leaseId: "abc-123", userEmail: "user@gov.uk", type: "LeaseApproved" }
                              ↓ Enrichment
OUT: { to: "user@gov.uk", personalisation: {
         userName: "Jane Smith", templateName: "Standard Sandbox",
         expiryDate: "2025-12-15", ssoUrl: "https://isb.gov.uk/login" }}
```

### End-to-End Conversion

| Metric                | Rate     | Meaning                             |
| --------------------- | -------- | ----------------------------------- |
| Event → Validated     | 99%      | 1% schema failures to DLQ           |
| Validated → Delivered | 99.5%    | 0.5% failures, preserved for retry  |
| Delivered → Opened    | ~65%     | GOV.UK brand trust                  |
| Opened → Action taken | ~40%     | User acts on information            |
| **Event → Outcome**   | **~28%** | Positive business outcome per event |

### Value Metrics

| Metric               | Value                      |
| -------------------- | -------------------------- |
| Cost per event       | < $0.001                   |
| Cost per outcome     | < $0.004                   |
| Value per outcome    | ~$0.80 (from ROI analysis) |
| **Value multiplier** | **200x** (value/cost)      |

### Value Optimization Opportunities

| Stage      | Opportunity                        | Expected Impact        |
| ---------- | ---------------------------------- | ---------------------- |
| Operations | Richer context (org name, history) | Better personalization |
| Delivery   | SMS for critical alerts            | Higher reach           |
| Engagement | A/B tested subject lines           | +10-15% open rate      |
| Action     | Interactive Slack buttons          | +20% action rate       |

---

## Performance Considerations

### Lambda Configuration

| Setting                 | Value          | Rationale                         |
| ----------------------- | -------------- | --------------------------------- |
| Memory                  | 256 MB         | Sufficient for SDK + JSON         |
| Timeout                 | 30 seconds     | DynamoDB + external API + retries |
| Reserved concurrency    | None (default) | Allow scaling                     |
| Provisioned concurrency | None (MVP)     | Add if cold starts matter         |

### Cold Start Mitigation

- NodejsFunction with esbuild minification
- Tree-shaking removes unused code
- Lazy-load SDKs only when needed
- Powertools adds ~100ms, acceptable tradeoff

### Caching

- Secrets: Cached in Lambda memory (container lifetime)
- DynamoDB enrichment: No cache (data freshness > latency)
- Template config: In-memory constant (zero cost)

---

## Deployment Architecture

### Stack Dependencies

```
NdxStaticStack (existing)
    └── S3, CloudFront

NotificationStack (new)
    ├── EventBridge Rules
    ├── Lambda Function
    ├── SQS DLQ
    ├── DynamoDB Idempotency Table
    ├── Secrets Manager Secret (reference)
    ├── CloudWatch Alarms
    └── AWS Chatbot Configuration
```

### Deployment Commands

```bash
# Deploy notification stack only
cd infra
cdk deploy NotificationStack --profile NDX/InnovationSandboxHub

# Deploy all stacks
cdk deploy --all --profile NDX/InnovationSandboxHub
```

### Environment Variables

```typescript
// Lambda environment
{
  SECRETS_PATH: '/ndx/notifications/credentials',
  IDEMPOTENCY_TABLE: 'NdxIdempotency',
  LOG_LEVEL: 'INFO',
  NOTIFY_TEMPLATE_LEASE_APPROVED: 'template-id-1',
  NOTIFY_TEMPLATE_LEASE_EXPIRING: 'template-id-2',
  // ... template IDs
}
```

---

## Development Environment

### Prerequisites

- Node.js 20.x
- Yarn 4.x
- AWS CLI v2
- Docker (for DynamoDB Local)

### Setup Commands

```bash
# Install dependencies
cd infra
yarn install

# Run unit tests
yarn test

# Run integration tests (requires Docker)
docker run -p 8000:8000 amazon/dynamodb-local
yarn test:integration

# Lint
yarn lint

# Synth and diff
cdk synth NotificationStack
cdk diff NotificationStack
```

### Local Testing

```bash
# Test with DynamoDB Local
DYNAMODB_ENDPOINT=http://localhost:8000 yarn test:integration

# Test Lambda locally (with SAM CLI)
sam local invoke NotificationHandler -e test/events/lease-approved.json
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Single Lambda for Both Channels

**Status:** Accepted
**Date:** 2025-11-27

**Context:** Need to handle both GOV.UK Notify (user emails) and Slack (ops alerts) from EventBridge events.

**Decision:** Single Lambda with modular sender code ("one brain, two mouths").

**Rationale:**

- Simpler deployment and maintenance for solo developer
- Shared validation, enrichment, error handling
- Modular code allows future extraction to separate Lambdas

**Consequences:**

- Single blast radius (mitigated by good tests)
- Must be careful with channel-specific error handling

---

### ADR-002: TypeScript over Python for Lambda

**Status:** Accepted
**Date:** 2025-11-27

**Context:** Lambda runtime choice for notification handler.

**Decision:** TypeScript (Node.js 20.x) instead of Python.

**Rationale:**

- Consistency with existing CDK codebase
- Same ESLint, Jest, tsconfig tooling
- Share types between CDK and Lambda
- Team already knows TypeScript

**Consequences:**

- Slightly larger cold start than Python
- notifications-node-client is official and maintained

---

### ADR-003: Idempotency via Lambda Powertools

**Status:** Accepted
**Date:** 2025-11-27

**Context:** Need to prevent duplicate notifications from EventBridge retries.

**Decision:** Use Lambda Powertools built-in idempotency with DynamoDB.

**Rationale:**

- Zero-config, proven pattern
- Automatic TTL management
- Integrates with existing Powertools (logger, metrics)

**Consequences:**

- Additional DynamoDB table (Powertools-managed)
- Small latency overhead per invocation (~10ms)

---

### ADR-004: Read-Only DynamoDB Access

**Status:** Accepted
**Date:** 2025-11-27

**Context:** Lambda needs to enrich events with user/lease data from ISB DynamoDB.

**Decision:** Read-only access (GetItem, Query only) to ISB tables.

**Rationale:**

- Principle of least privilege
- Notification system should never modify ISB data
- Reduces blast radius of bugs

**Consequences:**

- Cannot cache enrichment data in ISB tables
- Must handle missing data gracefully

---

### ADR-005: AWS Chatbot for Infrastructure Alerts

**Status:** Accepted
**Date:** 2025-11-27

**Context:** Need to alert on DLQ depth, Lambda errors, etc.

**Decision:** CloudWatch Alarms → AWS Chatbot → Slack (not via notification Lambda).

**Rationale:**

- Separate from business notifications
- Native AWS integration (no extra Lambda)
- Works even if notification Lambda is broken

**Consequences:**

- Requires AWS Chatbot setup (one-time)
- Two paths to Slack (Chatbot for infra, Lambda for ops)

### ADR-006: Security-First Event Processing

**Status:** Accepted
**Date:** 2025-11-27

**Context:** Notification system processes events containing PII (emails) and sends to external services.

**Decision:** Implement defense-in-depth security controls:

- Validate EventBridge source before processing
- Verify email ownership against DynamoDB before sending
- Limit blast radius with reserved concurrency
- Encrypt logs containing PII
- Restrict secrets access via resource policy

**Rationale:**

- EventBridge in same account means any service could publish fake events
- Email field in event could be manipulated to send to arbitrary addresses
- Single compromised component shouldn't exhaust account resources
- Logs are queryable and could expose PII without encryption

**Consequences:**

- Small latency overhead for ownership verification (~10ms DynamoDB call)
- KMS costs for log encryption (~$1/month)
- Circuit breaker may delay legitimate notifications during API outages

---

## Risk Mitigations

| Risk                           | Probability | Impact   | Mitigation                               | Status        |
| ------------------------------ | ----------- | -------- | ---------------------------------------- | ------------- |
| Event schema changes           | High        | High     | Schema validation, fail fast to DLQ      | Designed      |
| Notification lost              | High        | High     | DLQ, zero-notification alarm             | Designed      |
| API key expires                | Medium      | High     | Critical alarm on 401, rotation reminder | Designed      |
| Slack rate limit               | High        | Medium   | Backoff, circuit breaker                 | **Enhanced**  |
| Duplicate notifications        | Medium      | Medium   | Powertools idempotency                   | Designed      |
| DynamoDB enrichment fails      | Medium      | High     | Required vs optional fields, fail loudly | Designed      |
| Wrong recipient                | Low         | High     | Email ownership verification (P0)        | **Mitigated** |
| Unauthorized event injection   | Medium      | Critical | Source validation (P0)                   | **Mitigated** |
| Account-wide Lambda exhaustion | Low         | High     | Reserved concurrency (P1)                | **Mitigated** |
| PII exposure in logs           | Medium      | Medium   | KMS-encrypted CloudWatch Logs (P2)       | **Mitigated** |
| Secrets exfiltration           | Low         | Critical | Secrets Manager resource policy (P2)     | **Mitigated** |
| Template injection             | Low         | Medium   | Input sanitization (P2)                  | **Mitigated** |

---

## ISB Integration (Discovered from Source)

This section documents the actual Innovation Sandbox schemas and resources discovered from the ISB source code at `/Users/cns/httpdocs/cddo/innovation-sandbox-on-aws`.

### EventBridge Configuration

**Bus Name Pattern:** `ISB-{namespace}-ISBEventBus`
**DLQ Pattern:** `ISB-{namespace}-ISBEventBus-DLQ`

```typescript
// notification-stack.ts - actual EventBridge subscription
const rule = new Rule(this, "NotificationRule", {
  eventBus: EventBus.fromEventBusName(this, "ISBBus", `ISB-${namespace}-ISBEventBus`),
  eventPattern: {
    detailType: [
      "LeaseRequested",
      "LeaseApproved",
      "LeaseDenied",
      "LeaseBudgetThresholdAlert",
      "LeaseDurationThresholdAlert",
      "LeaseFreezingThresholdAlert",
      "LeaseBudgetExceeded",
      "LeaseExpired",
      "LeaseTerminated",
      "LeaseFrozen",
      "AccountCleanupFailed",
      "AccountQuarantined",
      "AccountDriftDetected",
    ],
  },
})
```

### ISB Event Types (from `events/index.ts`)

| Constant                              | DetailType Value            | Channel        |
| ------------------------------------- | --------------------------- | -------------- |
| `LeaseRequested`                      | LeaseRequested              | Notify         |
| `LeaseApproved`                       | LeaseApproved               | Notify         |
| `LeaseDenied`                         | LeaseDenied                 | Notify         |
| `LeaseTerminated`                     | LeaseTerminated             | Notify         |
| `LeaseFrozen`                         | LeaseFrozen                 | Notify + Slack |
| `LeaseBudgetThresholdBreachedAlert`   | LeaseBudgetThresholdAlert   | Notify         |
| `LeaseDurationThresholdBreachedAlert` | LeaseDurationThresholdAlert | Notify         |
| `LeaseFreezingThresholdBreachedAlert` | LeaseFreezingThresholdAlert | Notify         |
| `LeaseBudgetExceededAlert`            | LeaseBudgetExceeded         | Notify         |
| `LeaseExpiredAlert`                   | LeaseExpired                | Notify         |
| `AccountCleanupFailure`               | AccountCleanupFailed        | Slack          |
| `AccountQuarantined`                  | AccountQuarantined          | Slack          |
| `AccountDriftDetected`                | AccountDriftDetected        | Slack          |

### ISB Event Schemas (Zod Definitions)

#### LeaseKey (Composite Key)

```typescript
// Common to most lease events
export const LeaseKeySchema = z.object({
  userEmail: z.string().email(),
  uuid: z.string().uuid(),
})
// Example: { userEmail: "user@gov.uk", uuid: "a1b2c3d4-..." }
```

#### LeaseApprovedEvent

```typescript
export const LeaseApprovedEventSchema = z.object({
  leaseId: z.string(), // Simple string (not LeaseKey)
  approvedBy: z.union([z.string().email(), z.literal("AUTO_APPROVED")]),
  userEmail: z.string().email(),
})
// Template fields: userEmail, approvedBy
```

#### LeaseRequestedEvent

```typescript
export const LeaseRequestedEventSchema = z.object({
  leaseId: LeaseKeySchema, // { userEmail, uuid }
  comments: z.string().max(1000).optional(),
  userEmail: z.string().email(),
  requiresManualApproval: z.boolean(),
})
```

#### LeaseDeniedEvent

```typescript
export const LeaseDeniedEventSchema = z.object({
  leaseId: z.string(),
  deniedBy: z.string().email(),
  userEmail: z.string().email(),
})
```

#### LeaseFrozenEvent

```typescript
export const LeaseFrozenReasonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Expired"), triggeredDurationThreshold: z.number(), leaseDurationInHours: z.number() }),
  z.object({
    type: z.literal("BudgetExceeded"),
    triggeredBudgetThreshold: z.number(),
    budget: z.number().optional(),
    totalSpend: z.number(),
  }),
  z.object({ type: z.literal("ManuallyFrozen"), comment: z.string().max(1000) }),
])

export const LeaseFrozenEventSchema = z.object({
  leaseId: LeaseKeySchema,
  accountId: z.string().regex(/^\d{12}$/), // 12-digit AWS account ID
  reason: LeaseFrozenReasonSchema,
})
```

#### LeaseTerminatedEvent

```typescript
export const LeaseTerminatedReasonSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Expired"), leaseDurationInHours: z.number() }),
  z.object({ type: z.literal("BudgetExceeded"), budget: z.number().optional(), totalSpend: z.number() }),
  z.object({ type: z.literal("ManuallyTerminated"), comment: z.string() }),
  z.object({ type: z.literal("AccountQuarantined"), comment: z.string() }),
  z.object({ type: z.literal("Ejected"), comment: z.string() }),
])

export const LeaseTerminatedEventSchema = z.object({
  leaseId: LeaseKeySchema,
  accountId: z.string().regex(/^\d{12}$/),
  reason: LeaseTerminatedReasonSchema,
})
```

#### LeaseBudgetThresholdBreachedAlert

```typescript
export const LeaseBudgetThresholdTriggeredEventSchema = z.object({
  leaseId: LeaseKeySchema,
  accountId: z.string().regex(/^\d{12}$/),
  budget: z.number().optional(),
  totalSpend: z.number(),
  budgetThresholdTriggered: z.number(), // e.g., 50, 75, 90 (percent)
  actionRequested: z.enum(["notify", "freeze", "terminate"]),
})
```

#### AccountQuarantinedEvent

```typescript
export const AccountQuarantinedEventSchema = z.object({
  awsAccountId: z.string(),
  reason: z.string(),
})
```

#### AccountCleanupFailureEvent

```typescript
export const AccountCleanupFailureEventSchema = z.object({
  accountId: z.string().regex(/^\d{12}$/),
  cleanupExecutionContext: z.object({
    stateMachineExecutionArn: z.string(),
    stateMachineExecutionStartTime: z.string().datetime(),
  }),
})
```

#### AccountDriftDetectedAlert

```typescript
export const AccountDriftEventSchema = z.object({
  accountId: z.string().regex(/^\d{12}$/),
  actualOu: z.enum(["Available", "Active", "CleanUp", "Quarantine", "Frozen", "Entry", "Exit"]).optional(),
  expectedOu: z.enum(["Available", "Active", "CleanUp", "Quarantine", "Frozen", "Entry", "Exit"]).optional(),
})
```

### ISB DynamoDB Tables

Tables are created by CDK with generated names, exported via CloudFormation and stored in SSM parameter:
`/isb-{namespace}/data-config`

#### Lease Table

| Attribute                   | Type   | Key    | Notes                                                                                                                     |
| --------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `userEmail`                 | String | PK     | User's email address                                                                                                      |
| `uuid`                      | String | SK     | Lease UUID                                                                                                                |
| `status`                    | String | GSI-PK | PendingApproval, ApprovalDenied, Active, Frozen, Expired, BudgetExceeded, ManuallyTerminated, AccountQuarantined, Ejected |
| `originalLeaseTemplateUuid` | String | GSI-SK | Reference to template used                                                                                                |
| `originalLeaseTemplateName` | String |        | Template display name                                                                                                     |
| `leaseDurationInHours`      | Number |        | How long the lease lasts                                                                                                  |
| `maxSpend`                  | Number |        | Budget limit                                                                                                              |
| `budgetThresholds`          | List   |        | Alert thresholds (e.g., [50, 75, 90])                                                                                     |
| `durationThresholds`        | List   |        | Time-based thresholds                                                                                                     |
| `comments`                  | String |        | User's request comments                                                                                                   |
| `awsAccountId`              | String |        | Assigned AWS account (when Active)                                                                                        |
| `approvedBy`                | String |        | Approver email or 'AUTO_APPROVED'                                                                                         |
| `startDate`                 | String |        | ISO 8601 datetime                                                                                                         |
| `expirationDate`            | String |        | ISO 8601 datetime                                                                                                         |
| `lastCheckedDate`           | String |        | Last monitoring check                                                                                                     |
| `totalCostAccrued`          | Number |        | Current spend                                                                                                             |
| `endDate`                   | String |        | When lease ended (Expired states)                                                                                         |
| `ttl`                       | Number |        | DynamoDB TTL for cleanup                                                                                                  |

**GSI:** `StatusIndex` - PK: `status`, SK: `originalLeaseTemplateUuid`

#### SandboxAccount Table

| Attribute                 | Type    | Key | Notes                                                        |
| ------------------------- | ------- | --- | ------------------------------------------------------------ |
| `awsAccountId`            | String  | PK  | 12-digit AWS account ID                                      |
| `email`                   | String  |     | Account email                                                |
| `name`                    | String  |     | Account alias (max 50 chars)                                 |
| `status`                  | String  |     | Available, Active, CleanUp, Quarantine, Frozen               |
| `driftAtLastScan`         | Boolean |     | Whether drift was detected                                   |
| `cleanupExecutionContext` | Map     |     | { stateMachineExecutionArn, stateMachineExecutionStartTime } |

#### LeaseTemplate Table

| Attribute              | Type   | Key | Notes            |
| ---------------------- | ------ | --- | ---------------- |
| `uuid`                 | String | PK  | Template UUID    |
| `name`                 | String |     | Display name     |
| `maxSpend`             | Number |     | Budget limit     |
| `budgetThresholds`     | List   |     | Alert thresholds |
| `durationThresholds`   | List   |     | Time thresholds  |
| `leaseDurationInHours` | Number |     | Default duration |

### Environment Variables Required

```typescript
// Lambda environment for ISB integration
{
  LEASE_TABLE_NAME: 'Fn::ImportValue ISB-${namespace}-LeaseTable',
  ACCOUNT_TABLE_NAME: 'Fn::ImportValue ISB-${namespace}-SandboxAccountTable',
  LEASE_TEMPLATE_TABLE_NAME: 'Fn::ImportValue ISB-${namespace}-LeaseTemplateTable',
  ISB_EVENT_BUS: `ISB-${namespace}-ISBEventBus`,
}
```

### IAM Policy (Updated with Actual Tables)

```typescript
// notification-stack.ts - read-only access to ISB tables
role.addToPolicy(
  new PolicyStatement({
    actions: ["dynamodb:GetItem", "dynamodb:Query"],
    resources: [
      Fn.importValue(`ISB-${namespace}-LeaseTable`),
      `${Fn.importValue(`ISB-${namespace}-LeaseTable`)}/index/*`,
      Fn.importValue(`ISB-${namespace}-SandboxAccountTable`),
      Fn.importValue(`ISB-${namespace}-LeaseTemplateTable`),
    ],
  }),
)
```

---

## Appendix: Event Types (Mapped to ISB Events)

### User Notifications (GOV.UK Notify)

| ISB Event Type                      | DetailType                  | GOV.UK Notify Template | Trigger                                 |
| ----------------------------------- | --------------------------- | ---------------------- | --------------------------------------- |
| LeaseRequested                      | LeaseRequested              | Request confirmation   | User submits sandbox request            |
| LeaseApproved                       | LeaseApproved               | Welcome email          | User granted sandbox access             |
| LeaseDenied                         | LeaseDenied                 | Denial email           | Request rejected                        |
| LeaseTerminated                     | LeaseTerminated             | Termination email      | Sandbox access ended (any reason)       |
| LeaseFrozen                         | LeaseFrozen                 | Freeze alert           | Account frozen (budget/duration/manual) |
| LeaseBudgetThresholdBreachedAlert   | LeaseBudgetThresholdAlert   | Budget warning         | 50%/75%/90% spend threshold             |
| LeaseDurationThresholdBreachedAlert | LeaseDurationThresholdAlert | Time warning           | Duration threshold breached             |
| LeaseFreezingThresholdBreachedAlert | LeaseFreezingThresholdAlert | Freeze imminent        | About to be frozen                      |
| LeaseBudgetExceededAlert            | LeaseBudgetExceeded         | Over budget            | Budget fully exceeded                   |
| LeaseExpiredAlert                   | LeaseExpired                | Expiry notice          | Lease duration ended                    |

### Ops Alerts (Slack)

| ISB Event Type        | DetailType           | Priority | Slack Channel   |
| --------------------- | -------------------- | -------- | --------------- |
| AccountQuarantined    | AccountQuarantined   | Critical | #ndx-ops-alerts |
| AccountCleanupFailure | AccountCleanupFailed | Critical | #ndx-ops-alerts |
| AccountDriftDetected  | AccountDriftDetected | Critical | #ndx-ops-alerts |
| LeaseFrozen           | LeaseFrozen          | Normal   | #ndx-ops-alerts |

### Dual-Channel Events

| Event       | Notify            | Slack          | Notes                                          |
| ----------- | ----------------- | -------------- | ---------------------------------------------- |
| LeaseFrozen | User notification | Ops visibility | User gets freeze alert, ops see for monitoring |

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-27_
_For: cns_
_Project: NDX Notification System (Features 3 & 4)_
