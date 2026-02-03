---
title: "Billing CSV Download Notification"
slug: "billing-csv-download-notification"
created: "2026-02-03"
status: "completed"
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - TypeScript
  - AWS Lambda (Node.js 20.x)
  - EventBridge
  - GOV.UK Notify
  - Zod (validation)
  - AWS CDK
files_to_modify:
  - infra/lib/lambda/notification/types.ts
  - infra/lib/lambda/notification/validation.ts
  - infra/lib/lambda/notification/templates.ts
  - infra/lib/lambda/notification/handler.ts
  - infra/lib/config.ts
  - infra/lib/notification-stack.ts
  - docs/notifytemplates.md
code_patterns:
  - Zod schema validation with strict email/UUID/accountId
  - Template registry pattern (NOTIFY_TEMPLATES)
  - Personalisation builder per event type
  - formatCurrency() for USD, formatUKDate() for UK datetime
  - Enrichment via ISB Lambda (fetchLeaseRecord)
  - New isBillingEvent() category for billing-specific routing
test_patterns:
  - Co-located tests (*.test.ts next to source)
  - Jest with jsdom environment
  - Zod schema validation tests
  - Mock ISB Lambda invocations
---

# Tech-Spec: Billing CSV Download Notification

**Created:** 2026-02-03

## Overview

### Problem Statement

When a user's NDX:Try session ends, billing data is collected approximately 24 hours later and a CSV is generated with a detailed cost breakdown by AWS service. Users currently have no way to know this CSV exists or how to download it.

Additionally, users unfamiliar with cloud billing may be confused or concerned when they see costs listed (e.g., "$45.67"), even though the NDX:Try service is completely free to them. They need clear reassurance that this information is provided purely for educational purposes - to help them understand the cost model if they were to move beyond a trial phase.

### Solution

1. **New notification (`LeaseCostsGenerated`)**: Listen for the `LeaseCostsGenerated` event from `isb-costs` and send users an email via GOV.UK Notify containing:
   - Download link for their billing CSV
   - Formatted expiry date/time for the link (UK-friendly format)
   - Template name, start/end dates, and total cost
   - Clear explanation that this is informational only - no charge to the user

2. **Update `LeaseTerminated` notification**: Add messaging to set expectations that:
   - A cost breakdown email will arrive within approximately 24 hours
   - Explain why the delay exists (AWS billing reconciliation)
   - Reassure users the service is free - the cost data is just to help them understand the cost model

### Scope

**In Scope:**
- New Zod schema for `LeaseCostsGenerated` event validation
- New template configuration and personalisation builder
- New GOV.UK Notify template documentation
- Update to `LeaseTerminated` template (add 24-hour cost email notice)
- Update `notifytemplates.md` with both templates
- EventBridge rule update to subscribe to `LeaseCostsGenerated` from `isb-costs` source
- Change request document for costs team (`userEmail` addition)
- Add `isb-costs` to allowed event sources

**Out of Scope:**
- Changes to the `innovation-sandbox-on-aws-costs` repo (costs team's responsibility)
- Changes to CSV format or billing data collection logic
- Changes to the 24-hour delay (AWS billing reconciliation constraint)
- Slack/Chatbot notifications for this event (user-facing email only)

## Context for Development

### Codebase Patterns

**Event Source Difference:**
The `LeaseCostsGenerated` event comes from source `isb-costs`, NOT `InnovationSandbox-ndx`. This requires:
- Adding `isb-costs` to `ALLOWED_SOURCES` in types.ts
- EventBridge rule filter: `Source: "isb-costs"` AND `DetailType: "LeaseCostsGenerated"`
- Same ISB event bus (no cross-account complexity)
- **Confirmed with costs team:** Source field is exactly `"isb-costs"`

**Validation Pattern:**
```typescript
// Base schemas available:
UuidSchema      // UUID v4 with injection protection
EmailSchema     // RFC 5322 with ++ and consecutive dot rejection
AccountIdSchema // 12-digit AWS account ID
```

**Template Registry Pattern:**
```typescript
NOTIFY_TEMPLATES[eventType] = {
  templateIdEnvVar: "NOTIFY_TEMPLATE_...",
  requiredFields: [...],
  optionalFields: [...],
  enrichmentQueries: ["lease"], // for fetching template name
}
```

**Date Formatting:**
- `formatUKDate()` exists but outputs `DD/MM/YYYY, HH:MM:SS` - NOT suitable for `urlExpiresAt`
- **New function required:** `formatUKDateLong()` to output `"Monday, 10 February 2026, 14:30"` format
- Use `formatUKDateLong()` for `urlExpiresAt` display in email
- Use `formatUKDate()` for `startDate`/`endDate` (simpler date-only display is fine)

**Enrichment Behavior - Graceful Degradation:**
- Most events: graceful degradation (continue without enrichment)
- `LeaseCostsGenerated`: **Send with fallback** if enrichment fails
  - If no `templateName` from enrichment, use fallback: `"NDX:Try Session"`
  - Log warning but ALWAYS send the email
  - All other fields come from event - only `templateName` needs enrichment

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `infra/lib/lambda/notification/types.ts` | Add `LeaseCostsGenerated` to `NotificationEventType`, add `isb-costs` to `ALLOWED_SOURCES` |
| `infra/lib/lambda/notification/validation.ts` | Add `LeaseCostsGeneratedDetailSchema` with strict validation |
| `infra/lib/lambda/notification/templates.ts` | Add template config, `isBillingEvent()`, personalisation builder |
| `infra/lib/lambda/notification/handler.ts` | Add routing for billing events with fallback-on-enrichment-failure behavior |
| `infra/lib/config.ts` | Add to `ISB_EVENT_TYPES`, `NOTIFY_TEMPLATE_IDS`, `EVENT_TYPE_TO_TEMPLATE_ID` |
| `infra/lib/notification-stack.ts` | Add env var `NOTIFY_TEMPLATE_LEASE_COSTS_GENERATED` |
| `docs/notifytemplates.md` | Add `LeaseCostsGenerated` template, update `LeaseTerminated` |

### Technical Decisions

| Decision | Rationale |
| -------- | --------- |
| **Accept duplicate emails** | Deduplication adds DynamoDB complexity; rare duplicates are acceptable UX |
| **Fallback templateName on enrichment failure** | Use `"NDX:Try Session"` if enrichment fails - always send the email, never drop |
| **New `isBillingEvent()` category** | Clean separation from lifecycle/monitoring events in handler routing |
| **Only fetch `templateName`** | All other fields come from event; minimal enrichment needed |
| **New `formatUKDateLong()` function** | Output `"Monday, 10 February 2026, 14:30"` for `urlExpiresAt` display |
| **Trust csvUrl from costs team** | No strict S3 validation - costs team is trusted internal service |
| **Show USD with note** | AWS bills in USD; adding a note explains why users see $ not £ |
| **Bookend "free" messaging** | Reassure at start AND end of billing email to minimize cost anxiety |
| **Simpler 24-hour explanation** | "AWS needs time to gather all the billing information" - no jargon |
| **Costs team deploys first** | They add `userEmail` field, then NDX deploys handler expecting it |

## Implementation Plan

### Tasks

- [x] **Task 1: Create change request document for costs team**
  - File: `costs_repo_change_request.md` (project root)
  - Action: Document the required `userEmail` field addition to `LeaseCostsGeneratedDetail` schema
  - Notes: Include schema change, event emitter update, and rationale

- [x] **Task 2: Update types.ts**
  - File: `infra/lib/lambda/notification/types.ts`
  - Action:
    - Add `"LeaseCostsGenerated"` to `NotificationEventType` union
    - Add `"isb-costs"` to `ALLOWED_SOURCES` array
  - Notes: This enables the handler to recognize the new event type and source

- [x] **Task 3: Add validation schema**
  - File: `infra/lib/lambda/notification/validation.ts`
  - Action:
    - Add `LeaseCostsGeneratedDetailSchema` with strict Zod validation
    - Add to `EVENT_SCHEMAS` registry
    - Export `LeaseCostsGeneratedDetail` type
  - Notes: Schema fields: `leaseId`, `userEmail`, `accountId`, `totalCost`, `currency`, `startDate`, `endDate`, `csvUrl`, `urlExpiresAt`

- [x] **Task 4: Add template configuration and personalisation builder**
  - File: `infra/lib/lambda/notification/templates.ts`
  - Action:
    - Add `formatUKDateLong()` function for `"Monday, 10 February 2026 at 14:30"` format
    - Add `LeaseCostsGenerated` to `NOTIFY_TEMPLATES` registry
    - Add `isBillingEvent()` helper function
    - Add `BILLING_EVENTS` array
    - Add `buildLeaseCostsGeneratedPersonalisation()` function
  - Notes:
    - Required fields: `userName`, `templateName`, `totalCost`, `startDate`, `endDate`, `csvUrl`, `urlExpiresAt`
    - Format `urlExpiresAt` with `formatUKDateLong()` → `"Monday, 10 February 2026 at 14:30"`
    - Format `startDate`/`endDate` with `formatUKDate()` → `"01/02/2026"`
    - Format costs with `formatCurrency()` → `"$45.67"`
    - Fallback `templateName` to `"NDX:Try Session"` if not enriched

- [x] **Task 5: Update handler routing**
  - File: `infra/lib/lambda/notification/handler.ts`
  - Action:
    - Import `isBillingEvent` from templates
    - Add billing event handling block after lifecycle/monitoring checks
    - Implement fallback on enrichment failure: if no `templateName`, use `"NDX:Try Session"` and log warning
  - Notes: Pattern: `if (isBillingEvent(eventType)) { ... }` - ALWAYS send email, use fallback if enrichment fails

- [x] **Task 6: Update config.ts**
  - File: `infra/lib/config.ts`
  - Action:
    - Add `"LeaseCostsGenerated"` to `ISB_EVENT_TYPES` array
    - Add `LEASE_COSTS_GENERATED: "PLACEHOLDER_TEMPLATE_ID"` to `NOTIFY_TEMPLATE_IDS`
    - Add mapping to `EVENT_TYPE_TO_TEMPLATE_ID`
  - Notes: Template ID is placeholder until created in GOV.UK Notify dashboard

- [x] **Task 7: Update notification stack**
  - File: `infra/lib/notification-stack.ts`
  - Action:
    - Add `NOTIFY_TEMPLATE_LEASE_COSTS_GENERATED` environment variable to Lambda
  - Notes: EventBridge rule already filters by account ID, not source - no rule change needed

- [x] **Task 8: Update LeaseTerminated template documentation**
  - File: `docs/notifytemplates.md`
  - Action: Add 24-hour cost email notice to LeaseTerminated template body
  - Notes: Insert after "All resources in your AWS account have been cleaned up as part of our standard process." and before "# Need another NDX:Try session?":
    ```
    # What happens next

    You'll receive a separate email within approximately 24 hours with a breakdown of the costs from your session. This short delay is because AWS needs time to gather all the billing information.

    Don't worry - this is just for your information. There's no charge to you for using NDX:Try.
    ```

- [x] **Task 9: Add LeaseCostsGenerated template documentation**
  - File: `docs/notifytemplates.md`
  - Action: Add new `LeaseCostsGenerated` template section after `LeaseTerminated`
  - Template content:

```markdown
# LeaseCostsGenerated

**Subject:** Your NDX:Try session cost breakdown is ready to download

**Body:**

Hi ((userName)),

Your cost breakdown for your ((templateName)) NDX:Try session is now ready to download.

**Important: There is no charge to you.** We're sharing this information to help you understand what these AWS services would cost if you were to use them outside of the NDX:Try environment.

# Your session summary

* template: ((templateName))
* billing period: ((startDate)) to ((endDate))
* total cost: ((totalCost)) (AWS bills in US dollars)

# Download your detailed breakdown

Your detailed CSV breakdown is available here:
((csvUrl))

This link will expire on ((urlExpiresAt)). After this date, the link will no longer work.

The CSV includes a line-by-line breakdown of costs by AWS service, so you can see exactly what resources were used during your session.

**Remember: This is for information only - there is no charge to you for using NDX:Try.**

If you have any questions about your cost breakdown, please email us at ndx@dsit.gov.uk or reach out on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack.

Kind regards,
The National Digital Exchange Team, GDS
```

- [x] **Task 10: Add unit tests for validation schema**
  - File: `infra/lib/lambda/notification/validation.test.ts`
  - Action: Add test cases for `LeaseCostsGeneratedDetailSchema`
  - Notes: Test valid payload, missing fields, invalid types, edge cases

- [x] **Task 11: Add unit tests for personalisation builder**
  - File: `infra/lib/lambda/notification/templates.test.ts`
  - Action: Add test cases for `formatUKDateLong()`, `buildLeaseCostsGeneratedPersonalisation()`, and `isBillingEvent()`
  - Notes:
    - Test `formatUKDateLong()` outputs `"Monday, 10 February 2026 at 14:30"` format (actual en-GB locale format)
    - Test fallback `templateName` when not provided
    - Test field mapping, date formatting, currency formatting

- [x] **Task 12: Add unit tests for handler routing**
  - File: `infra/lib/lambda/notification/handler.test.ts`
  - Action: Add test cases for billing event routing and fallback-on-enrichment-failure behavior
  - Notes:
    - Test successful path with enriched `templateName`
    - Test enrichment failure → uses fallback `"NDX:Try Session"` and sends email successfully
    - Test source `isb-costs` is accepted

### Acceptance Criteria

- [x] **AC-1**: Given a valid `LeaseCostsGenerated` event with `userEmail`, when the handler processes it, then an email is sent via GOV.UK Notify with correct personalisation fields
- [x] **AC-2**: Given a `LeaseCostsGenerated` event, when enrichment fails (no `templateName`), then the handler logs a warning, uses fallback `"NDX:Try Session"`, and sends the email successfully
- [x] **AC-3**: Given a `LeaseCostsGenerated` event, when the email is sent, then the `urlExpiresAt` is formatted in UK datetime format (e.g., "Tuesday, 10 February 2026 at 14:30")
- [x] **AC-4**: Given a `LeaseCostsGenerated` event, when the email is sent, then the `totalCost` is formatted as USD with $ symbol (e.g., "$45.67")
- [x] **AC-5**: Given a `LeaseCostsGenerated` event from source `isb-costs`, when the handler validates the source, then it is accepted (not rejected as invalid source)
- [x] **AC-6**: Given a `LeaseTerminated` event, when the email is sent, then it includes the 24-hour cost email notice with simple explanation
- [x] **AC-7**: Given the `LeaseCostsGenerated` email template, when a user reads it, then the "this is free" reassurance appears at both the start and end of the email body
- [x] **AC-8**: Given all unit tests, when `yarn test` is run, then coverage meets thresholds (branches: 70%, functions: 80%, lines: 80%)

## Additional Context

### Dependencies

| Dependency | Type | Owner | Notes |
| ---------- | ---- | ----- | ----- |
| `userEmail` in `LeaseCostsGenerated` event | **BLOCKING** | Costs team | Must be added before this feature works |
| GOV.UK Notify template | Required | NDX team | Create template in Notify dashboard, get template ID |
| Same ISB event bus | Confirmed | Costs team | Events go to same bus ndx already subscribes to |

### Deployment Sequence

**Costs team deploys first** (they are already working on it):

1. **Costs team** adds `userEmail` to `LeaseCostsGeneratedDetailSchema` and emits it in events
2. **Costs team** verifies events in staging contain `userEmail`
3. **NDX team** creates GOV.UK Notify template (copy from `docs/notifytemplates.md`)
4. **NDX team** deploys notification Lambda with new handler code
5. **NDX team** verifies end-to-end in staging
6. **Both teams** coordinate production deployment

**Rollback:** If NDX handler fails, revert NDX deploy. Costs events will not be processed but won't error (unrecognised events are ignored).

### LeaseCostsGenerated Event Schema (Expected)

```typescript
{
  leaseId: string,        // UUID v4
  userEmail: string,      // Required - TO BE ADDED by costs team
  accountId: string,      // 12-digit AWS account
  totalCost: number,      // e.g. 45.67
  currency: "USD",        // literal
  startDate: string,      // YYYY-MM-DD (billing period start)
  endDate: string,        // YYYY-MM-DD (billing period end)
  csvUrl: string,         // presigned S3 URL (7-day expiry)
  urlExpiresAt: string    // ISO 8601 timestamp
}
```

### Testing Strategy

**Unit Tests (co-located):**
- `validation.test.ts`: Schema validation for `LeaseCostsGeneratedDetailSchema`
  - Valid payload acceptance
  - Missing required fields rejection
  - Invalid field types rejection
  - Edge cases (empty strings, negative costs, malformed URLs)

- `templates.test.ts`: Personalisation builder and helpers
  - `formatUKDateLong()` outputs `"Monday, 10 February 2026, 14:30"` format
  - `buildLeaseCostsGeneratedPersonalisation()` field mapping
  - `isBillingEvent()` returns true for `LeaseCostsGenerated`
  - Fallback `templateName` to `"NDX:Try Session"` when not provided
  - Date formatting with UK timezone
  - Currency formatting with USD symbol

- `handler.test.ts`: Event routing and error handling
  - Billing event routes to correct handler branch
  - Enrichment failure uses fallback `templateName` and sends email
  - Source `isb-costs` is accepted
  - Email sent with correct template ID and personalisation

**Manual Testing:**
1. Deploy to staging
2. Trigger test `LeaseCostsGenerated` event via EventBridge console
3. Verify email received with correct content
4. Verify CloudWatch logs show successful processing

**Coverage Requirements:**
- branches: 70%, functions: 80%, lines: 80%, statements: 80%

### Notes

- **Duplicate emails are acceptable**: EventBridge at-least-once delivery may cause duplicates; no deduplication implemented
- **CSV link expires in 7 days**: Communicated clearly in email with formatted expiry datetime using `formatUKDateLong()`
- **24-hour delay explanation**: Use simple language "AWS needs time to gather all the billing information"
- **USD display**: AWS bills in USD; note "(AWS bills in US dollars)" included in email template
- **Enrichment with fallback**: Only `templateName` is fetched from lease record; if enrichment fails, use `"NDX:Try Session"` as fallback
- **Bookend "free" messaging**: Email template includes "no charge" reassurance at both start and end
- **Trust csvUrl**: No strict S3 validation - costs team is trusted internal service
- **Costs team deploys first**: They add `userEmail` to event schema before NDX deploys handler

## Review Notes

- Adversarial review completed: 2026-02-03
- Findings: 22 total, 2 fixed (auto-fix), 20 skipped (design decisions or deferred)
- Resolution approach: Auto-fix
- Fixes applied:
  - F7: Allow negative totalCost for AWS credits/refunds
  - F12: Added BillingEmailSent metric for monitoring
- Skipped findings validated as design decisions per tech-spec (PLACEHOLDER template ID, trusted csvUrl, enrichment fallback)
