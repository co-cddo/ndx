---
title: 'GOV.UK Notify Emails for Account Creation & Blueprint Provisioning'
slug: 'govnotify-account-creation-blueprint-provisioning'
created: '2026-03-20'
status: 'done'
baseline_commit: 'aa2c899b24c08884b6ec82c389abcbce6bd6f7fd'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['GOV.UK Notify', 'AWS EventBridge', 'AWS CDK', 'TypeScript', 'AWS Chatbot', 'Python/boto3']
files_to_modify: ['infra/lib/config.ts', 'infra/lib/notification-stack.ts', 'infra/lib/lambda/notification/handler.ts', 'infra/lib/lambda/notification/templates.ts', 'infra/lib/lambda/notification/validation.ts', 'infra-signup/lib/lambda/signup/handler.ts', 'src/try/ui/components/sessions-table.ts', '~/httpdocs/innovation-sandbox-on-aws-utils/create_user.py']
code_patterns: ['EventBridge cross-account subscription', 'GOV.UK Notify template registry', 'Zod event validation', 'personalisation builders', 'GDS Design System govuk-tag', 'SNS publish for Slack via AWS Chatbot', 'fire-and-forget notification pattern']
test_patterns: ['Manual EventBridge event replay', 'Direct GOV.UK Notify API calls for template validation', 'isb create-user with +alias for CLI path testing', 'NDX/InnovationSandboxHub profile for CLI']
---

# Tech-Spec: GOV.UK Notify Emails for Account Creation & Blueprint Provisioning

**Created:** 2026-03-20

## Overview

### Problem Statement

Users receive no notification when their NDX account is first created in IAM Identity Center, and no email when their sandbox blueprint starts provisioning after lease approval. The /try page shows "Setting up" but doesn't tell users they can navigate away and will be emailed when ready. With the addition of blueprints, there's now a meaningful wait between lease approval and account readiness that users aren't informed about.

### Solution

Add three new GOV.UK Notify email notifications and one Slack alert:
1. **Welcome email** when a user account is created — triggered directly from the signup Lambda (`infra-signup/lib/lambda/signup/handler.ts`) after successful `createUser()`, and from the CLI util (`create_user.py`) after successful user creation. Fire-and-forget — notification failure must never block account creation.
2. **Slack alert to #ndx-try-notifications** when a new user is created — via the same SNS → AWS Chatbot pipeline that LeaseRequested/LeaseApproved already use. No new Chatbot channel config needed.
3. **"Provisioning started" email** when a blueprint lease is approved and deployment begins (triggered by `BlueprintDeploymentRequest` from ISB EventBridge)
4. **Update the existing "LeaseApproved" email template** to clearly communicate "your sandbox is ready"
5. **Try page UX tweak** — add inline hint beneath lease row during "Setting up" state: "We'll email you at **{email}** when your sandbox is ready — you can safely close this page."

### Scope

**In Scope:**
- Signup Lambda (`infra-signup/lib/lambda/signup/handler.ts`): publish `UserCreated` event after successful `createUser()` — fire-and-forget with try/catch
- CLI util (`create_user.py`): publish same `UserCreated` event after successful user creation, using `NDX/InnovationSandboxHub` profile
- New GOV.UK Notify template: Welcome / Account Created
- New GOV.UK Notify template: Provisioning Started (blueprint deployment in progress)
- Rewritten GOV.UK Notify template: LeaseApproved ("your sandbox is ready")
- Slack notification to #ndx-try-notifications for new user creation via existing SNS → AWS Chatbot pipeline (same path as LeaseRequested/LeaseApproved)
- Subscribe notification Lambda to `BlueprintDeploymentRequest` event from ISB bus
- New `UserCreated` event handling in notification Lambda: routing, personalisation builder, Zod schema, template registry
- Try page inline hint beneath lease row during Provisioning status
- Manual testing via event replay and direct Notify API calls

**Out of Scope:**
- Changes to the Innovation Sandbox codebase itself
- New EventBridge events in ISB (consuming existing events only)
- Changes to existing Chatbot/Slack channel configuration (reuse existing pipeline)
- CloudTrail / org management account EventBridge rules (simplified away)
- Automated test suite (manual testing only for this spec)

## Context for Development

### Codebase Patterns

**Notification Lambda** (`infra/lib/lambda/notification/`):
- `handler.ts` (663 lines): Main entry point. `handler()` at line 368 receives EventBridge events. Flow: `validateEventSource()` → `extractUserEmail()` → `getNotificationChannels()` → category check (`isLeaseLifecycleEvent || isMonitoringAlertEvent || isBillingEvent`) → `validateEvent()` → `getTemplateConfig()` → `getTemplateId()` → enrichment via ISB API → `buildPersonalisation()` → `NotifySender.send()` → `publishSlackNotification()` via SNS.
- `templates.ts` (1286 lines): Template registry `NOTIFY_TEMPLATES` (Record<string, TemplateConfig>). Each entry has `templateIdEnvVar`, `requiredFields`, `optionalFields`, `enrichmentQueries`. Event categories: `LEASE_LIFECYCLE_EVENTS` (line 216), `MONITORING_ALERT_EVENTS` (line 226), `BILLING_EVENTS` (line 238). `buildPersonalisation()` at line 1198 is a switch statement dispatching to per-event builder functions. Will need new `isUserEvent()` category + `UserCreated` and `BlueprintDeploymentRequest` cases.
- `validation.ts`: Zod schemas. `EVENT_SCHEMAS` registry (line 276) maps `NotificationEventType` → `z.ZodSchema`. Most lease schemas use `PermissiveLeaseSchema` (passthrough). Will need new schemas for `UserCreated` and `BlueprintDeploymentRequest`.
- `types.ts` (162 lines): `NotificationEventType` union type (line 107) — must add `"UserCreated"` and `"BlueprintDeploymentRequest"`. `ALLOWED_SOURCES` (line 133) = `["InnovationSandbox-ndx", "isb-costs"]` — must add source for signup Lambda events (e.g. `"ndx-signup"`).
- `handler.ts` `publishSlackNotification()` (line 64): Publishes to `EVENTS_TOPIC_ARN` SNS topic. Already fire-and-forget (catches errors, logs, doesn't throw).

**Signup Lambda** (`infra-signup/lib/lambda/signup/`):
- `handler.ts`: `POST /signup-api/signup` handler. After successful `createUser()` at line 366-371, logs success and returns `{ success: true }` at line 383. **Integration point**: Add fire-and-forget SNS publish between line 381 (success log) and line 383 (return). Must wrap in try/catch — notification failure must not affect the 200 response.
- `identity-store-service.ts`: `createUser()` function (line 265) creates user via `CreateUserCommand`, adds to group. Returns `UserId`. No changes needed here.
- `signup-stack.ts`: **Already has** SNS topic `ndx-signup-alerts` (line 262), EventBridge rule for CloudTrail `CreateUser` events (line 298, matching `aws.sso-directory` / `CreateUser`), and Chatbot Slack channel config (line 326). However, the CloudTrail rule may not fire reliably since `createUser()` happens cross-account via STS AssumeRole in the org management account. The direct SNS publish approach bypasses this issue.
- **Decision**: Two fire-and-forget calls after successful user creation: (1) Async Lambda invoke of notification Lambda for the welcome email (needs `NOTIFICATION_LAMBDA_ARN` env var + `lambda:InvokeFunction` permission). (2) SNS publish to `ndx-try-alerts` for Slack alert (needs `EVENTS_TOPIC_ARN` env var + `sns:Publish` permission). Both granted cross-stack in CDK.

**Config** (`infra/lib/config.ts`):
- `ISB_EVENT_TYPES` (line 139): 13 event types for EventBridge rule filter. Must add `"BlueprintDeploymentRequest"`.
- `NOTIFY_TEMPLATE_IDS` (line 233): 11 template IDs. Must add `USER_CREATED` and `BLUEPRINT_DEPLOYMENT_REQUEST`.
- `EVENT_TYPE_TO_TEMPLATE_ID` (line 256): Map event→template. Must add two new entries.
- `CHATBOT_EVENT_TYPES` (line 170): 18 event types for Chatbot rule. Consider adding `"BlueprintDeploymentRequest"`.
- Note: `UserCreated` is NOT an ISB event — it comes from the signup Lambda via SNS, not EventBridge. It won't be in `ISB_EVENT_TYPES`.

**Notification Stack** (`infra/lib/notification-stack.ts`):
- EventBridge rule at line 245 filters `detailType: [...ISB_EVENT_TYPES]`. Adding `BlueprintDeploymentRequest` to `ISB_EVENT_TYPES` will automatically include it.
- `ndx-try-alerts` SNS topic created at line 298. Notification Lambda has publish permission (line 309) and `EVENTS_TOPIC_ARN` env var (line 312).
- Both stacks deploy to the same account (`568672915267`, `us-west-2`). SNS publish and Lambda invoke are same-account — no cross-account resource policies needed, just IAM grants in CDK.
- Note: `infra-signup/bin/signup.ts` has a stale `eu-west-2` default region — overridden at deploy time via `CDK_DEFAULT_REGION=us-west-2`. Consider fixing the default to match.

**Try Page** (`src/try/ui/components/sessions-table.ts`):
- `renderSessionRow()` at line 140 renders table rows. After the row, `renderCommentsRow()` adds an expandable comments row. The inline hint for Provisioning status should follow the same pattern — a conditional row beneath the lease row when `lease.status === "Provisioning"`.
- User's email is available from the auth state (not the lease object). Check `src/try/ui/try-page.ts` for how the authenticated user's email is accessed.

**CLI Util** (`~/httpdocs/innovation-sandbox-on-aws-utils/create_user.py`):
- `main()` at line 89. After successful user creation (line 152 `print("✅ User created")`), add notification call. Uses `NDX/InnovationSandboxHub` profile (available as `ISB_HUB_PROFILE` in `isb_common.py` line 26). Can either publish to SNS via boto3 (`sns.publish()`) or invoke the notification Lambda directly (`lambda.invoke()`). SNS is simpler — just needs the topic ARN.
- The CLI runs under `NDX/orgManagement` profile for identity store access but could switch to `NDX/InnovationSandboxHub` for the notification call (separate boto3 session).

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `infra/lib/config.ts` | ISB_EVENT_TYPES, NOTIFY_TEMPLATE_IDS, EVENT_TYPE_TO_TEMPLATE_ID, CHATBOT_EVENT_TYPES |
| `infra/lib/notification-stack.ts` | CDK: EventBridge rules, Lambda, SNS, Chatbot |
| `infra/lib/lambda/notification/handler.ts` | Event routing, personalisation builders, email sending |
| `infra/lib/lambda/notification/templates.ts` | Template registry with required/optional fields |
| `infra/lib/lambda/notification/validation.ts` | Zod schemas for event validation |
| `infra/lib/lambda/notification/enrichment.ts` | ISB API data fetching for personalisation |
| `infra/lib/lambda/notification/notify-sender.ts` | GOV.UK Notify SDK wrapper |
| `src/try/ui/components/sessions-table.ts` | Lease status labels and rendering |
| `src/try/ui/try-page.ts` | Auto-refresh polling, page state management |
| `infra-signup/lib/lambda/signup/handler.ts` | Signup API handler — add UserCreated event publish here |
| `infra-signup/lib/lambda/signup/identity-store-service.ts` | createUser() function (no changes needed) |
| `infra-signup/lib/signup-stack.ts` | Signup CDK stack — SNS topic, Lambda config |
| `~/httpdocs/innovation-sandbox-on-aws-utils/create_user.py` | CLI user creation — add notification call here |
| `~/httpdocs/innovation-sandbox-on-aws/source/common/events/blueprint-deployment-request.ts` | BlueprintDeploymentRequest event schema |
| `~/httpdocs/innovation-sandbox-on-aws/source/common/events/lease-approved-event.ts` | LeaseApproved event schema |

### Technical Decisions

- **UserCreated event source**: Publish directly from the signup Lambda and CLI util after successful user creation. No CloudTrail/org management account involvement. Fire-and-forget — catch, log, and move on if notification fails. Never block account creation.
- **UserCreated delivery — two paths**: (1) **Welcome email**: Signup Lambda invokes the notification Lambda directly via async `InvokeCommand` (`InvocationType: "Event"`) with an EventBridge-shaped payload (`detail-type: "UserCreated"`, `source: "ndx-signup"`). This reuses all existing notification infrastructure (secrets, circuit breaker, rate limiting, PII redaction, metrics, DLQ). No new dependencies in signup Lambda beyond `@aws-sdk/client-lambda`. (2) **Slack alert**: Signup Lambda publishes to `ndx-try-alerts` SNS topic for Chatbot pipeline (separate call, also fire-and-forget).
- **BlueprintDeploymentRequest**: Already published to ISB custom event bus — add to `ISB_EVENT_TYPES` in `config.ts` to include in EventBridge rule filter. Add template config, Zod schema, and personalisation builder in notification Lambda.
- **Non-blueprint leases**: Only receive the "ready" email (LeaseApproved). No "provisioning started" email since there's no wait.
- **CLI profile**: `NDX/orgManagement` for identity store access (existing), `NDX/InnovationSandboxHub` for Lambda invoke + SNS publish. Two separate boto3 sessions. CLI mirrors the signup Lambda pattern: async Lambda invoke for email, SNS publish for Slack.
- **`+` alias limitation**: Signup Lambda rejects `+` in emails (handler.ts ~line 180). CLI testing only for `+test01` alias addresses.
- **Event source validation**: Add `"ndx-signup"` to `ALLOWED_SOURCES` in `types.ts` (line 133). Direct Lambda invoke is already IAM-authenticated, so source validation is redundant — but adding the string is trivial and avoids conditional logic in the validator.
- **Try page UX**: Inline hint beneath the specific lease row (not page-level), showing the user's email address for trust. "You can safely close this page" not "navigate away". Follow the `renderCommentsRow()` pattern for conditional sub-rows.
- **Template drafting**: GOV.UK Notify markdown templates drafted as files, manually entered into Notify console. Template IDs updated in config.ts after creation.
- **Existing signup Slack alerting**: `signup-stack.ts` already has CloudTrail → EventBridge → `ndx-signup-alerts` SNS → Chatbot for CreateUser events (Story 3.1). This may not fire reliably (cross-account API call via STS AssumeRole). The direct SNS publish to `ndx-try-alerts` supplements this — both can coexist.
- **No new SNS topics**: Reuse `ndx-try-alerts` for Slack. No loop risk because the notification Lambda publishes to this topic but does not subscribe to it — it only receives events via EventBridge rules and direct invocation.

## Implementation Plan

### Tasks

#### Phase 1: Notification Lambda — Add New Event Types

- [ ] Task 1: Add `UserCreated` and `BlueprintDeploymentRequest` to type system
  - File: `infra/lib/lambda/notification/types.ts`
  - Action: Add `"UserCreated"` and `"BlueprintDeploymentRequest"` to `NotificationEventType` union (line 107). Add `"ndx-signup"` to `ALLOWED_SOURCES` array (line 133).

- [ ] Task 2: Add Zod validation schemas for new event types
  - File: `infra/lib/lambda/notification/validation.ts`
  - Action: Add `UserCreatedDetailSchema` (permissive, fields: `userEmail`, `firstName`, `lastName`, `userId`). Add `BlueprintDeploymentRequestDetailSchema` (permissive, fields: `blueprintId`, `leaseId`, `userEmail`, `accountId`, `blueprintName`). Add both to `EVENT_SCHEMAS` registry (line 276).

- [ ] Task 3: Add template configurations for new event types
  - File: `infra/lib/lambda/notification/templates.ts`
  - Action: Add `UserCreated` entry to `NOTIFY_TEMPLATES` registry: `templateIdEnvVar: "NOTIFY_TEMPLATE_USER_CREATED"`, `requiredFields: ["userName", "ssoUrl"]`, `optionalFields: ["portalLink", "plainTextLink", "linkInstructions"]`, `enrichmentQueries: []` (no lease to enrich). Add `BlueprintDeploymentRequest` entry: `templateIdEnvVar: "NOTIFY_TEMPLATE_BLUEPRINT_DEPLOYMENT_REQUEST"`, `requiredFields: ["userName", "blueprintName"]`, `optionalFields: ["portalLink", "plainTextLink", "linkInstructions"]`, `enrichmentQueries: ["lease"]`. Add new event category arrays: `USER_EVENTS: ["UserCreated"]` with `isUserEvent()` function, and `PROVISIONING_EVENTS: ["BlueprintDeploymentRequest"]` with `isProvisioningEvent()` function. Do NOT add `BlueprintDeploymentRequest` to `LEASE_LIFECYCLE_EVENTS` — it's semantically a provisioning event, not a lease lifecycle event.

- [ ] Task 4: Add personalisation builder functions
  - File: `infra/lib/lambda/notification/templates.ts`
  - Action: Add `buildUserCreatedPersonalisation()` — extract `firstName` + `lastName` → `userName`, read SSO portal URL from `process.env.SSO_PORTAL_URL` env var (not hardcoded). Add `buildBlueprintDeploymentRequestPersonalisation()` — extract `blueprintName`, `userEmail` → `userName`. Add both cases to `buildPersonalisation()` switch statement (line 1206). Note: SSO URL must be added as a Lambda env var in Task 7.

- [ ] Task 5: Update handler event routing
  - File: `infra/lib/lambda/notification/handler.ts`
  - Action: Update the category check at line 419 to include new categories: `(isLeaseLifecycleEvent(eventType) || isMonitoringAlertEvent(eventType) || isBillingEvent(eventType) || isUserEvent(eventType) || isProvisioningEvent(eventType))`. Import `isUserEvent` and `isProvisioningEvent` from templates.ts. Note: `UserCreated` events have no `leaseId`, so enrichment will be skipped (the existing `if (userEmail && uuid)` check handles this gracefully — enrichment is skipped, `_enriched` set to `"false"`). `BlueprintDeploymentRequest` events include `userEmail` and `leaseId` directly in the event detail, so `extractUserEmail()` will resolve the recipient and enrichment will fetch the lease record for additional personalisation fields.

#### Phase 2: Config & Infrastructure — Wire Up Events

- [ ] Task 6: Add new event types and template IDs to config
  - File: `infra/lib/config.ts`
  - Action: Add `"BlueprintDeploymentRequest"` to `ISB_EVENT_TYPES` array (line 139). Add `USER_CREATED` and `BLUEPRINT_DEPLOYMENT_REQUEST` to `NOTIFY_TEMPLATE_IDS` (line 233) — **use real template IDs from GOV.UK Notify console, not placeholders.** Complete Phase 5 (Tasks 11-14) first to get the IDs. The cold-start template validation (`validateAllTemplatesOnce()`) checks all template IDs are valid UUIDs — placeholder strings will cause the Lambda to fail for ALL events, not just the new ones. Add `UserCreated` and `BlueprintDeploymentRequest` entries to `EVENT_TYPE_TO_TEMPLATE_ID` (line 256). Optionally add `"BlueprintDeploymentRequest"` to `CHATBOT_EVENT_TYPES` (line 170).

- [ ] Task 7: Update notification stack CDK for new Lambda env vars
  - File: `infra/lib/notification-stack.ts`
  - Action: The EventBridge rule at line 245 uses `[...ISB_EVENT_TYPES]` — adding `BlueprintDeploymentRequest` to that array (Task 6) automatically includes it. Add new env vars to Lambda: `NOTIFY_TEMPLATE_USER_CREATED` and `NOTIFY_TEMPLATE_BLUEPRINT_DEPLOYMENT_REQUEST` from the new template IDs. Add `SSO_PORTAL_URL` env var set to `https://d-9267e1e371.awsapps.com/start` (used by UserCreated personalisation builder). Export the notification Lambda's function ARN as a CloudFormation output for cross-stack reference by the signup stack.

- [ ] Task 8: Update signup stack CDK — grant Lambda invoke + SNS publish
  - File: `infra-signup/lib/signup-stack.ts`
  - Action: Import the notification Lambda ARN and `ndx-try-alerts` SNS topic ARN (via SSM parameters, CloudFormation imports, or CDK context). Grant `lambda:InvokeFunction` on the notification Lambda to the signup Lambda's execution role. Grant `sns:Publish` on `ndx-try-alerts` to the signup Lambda's execution role. Add `NOTIFICATION_LAMBDA_ARN` and `EVENTS_TOPIC_ARN` as Lambda environment variables.

**Deploy note:** Phase 5 (GOV.UK Notify template creation) MUST happen BEFORE deploying Phase 2 config changes. The cold-start template validation will reject non-UUID placeholder IDs and break the Lambda for all events. Recommended order: Phase 1 (code only, no deploy) → Phase 5 (create templates, get real IDs) → Phase 2 (config with real IDs, deploy `NdxNotificationStack` first, then `NdxSignupStack`) → Phase 3-4 (code changes, deploy). Existing unit tests for `types.ts`, `validation.ts`, `templates.ts`, and `handler.ts` must be updated to include the new event types — tests that assert on exhaustive `NotificationEventType` lists or `EVENT_SCHEMAS` completeness will fail otherwise.

#### Phase 3: Signup Lambda — Fire UserCreated Events

- [ ] Task 9: Add fire-and-forget notification calls to signup handler
  - File: `infra-signup/lib/lambda/signup/handler.ts`
  - Action: After successful `createUser()` (between line 381 success log and line 383 return), add a `try/catch` block with two fire-and-forget calls:
    1. Capture userId: Change `await createUser({...}, correlationId)` to `const userId = await createUser({...}, correlationId)` to capture the returned UserId for the event payload.
    2. Async Lambda invoke: `lambdaClient.send(new InvokeCommand({ FunctionName: process.env.NOTIFICATION_LAMBDA_ARN, InvocationType: "Event", Payload: JSON.stringify({ "detail-type": "UserCreated", source: "ndx-signup", id: crypto.randomUUID(), time: new Date().toISOString(), account: "568672915267", region: "us-west-2", version: "0", resources: [], detail: { userEmail: normalizedEmail, firstName: request.firstName, lastName: request.lastName, userId } }) }))`
    3. SNS publish for Slack: Study the existing `buildSlackMessage()` function in `handler.ts` (line 79) for the correct AWS Chatbot custom notification format. The message must use the Chatbot-compatible structure — do NOT invent a format. At minimum: `{ version: "1.0", source: "custom", content: { textType: "client-markdown", title: "New NDX User Created", description: "..." } }`
  - Notes: Both wrapped in try/catch. Log failures at WARN level. Never throw — the 200 response must always be returned. Import `LambdaClient`, `InvokeCommand` from `@aws-sdk/client-lambda` and `SNSClient`, `PublishCommand` from `@aws-sdk/client-sns`. **SDK clients must be module-level singletons** (lazy-initialised outside the handler), not instantiated per-request — follow the same pattern as the existing `identityStoreClient` in `identity-store-service.ts`.

#### Phase 4: CLI Util — Fire UserCreated Events

- [ ] Task 10: Add notification calls to CLI create_user.py
  - File: `~/httpdocs/innovation-sandbox-on-aws-utils/create_user.py`
  - Action: After successful user creation (line 152, inside the `else` branch where user is newly created — not the "already exists" path), add a new step:
    1. Create a second boto3 session with `ISB_HUB_PROFILE` (import from `isb_common`)
    2. Async Lambda invoke: `lambda_client.invoke(FunctionName=NOTIFICATION_LAMBDA_ARN, InvocationType='Event', Payload=json.dumps({"detail-type": "UserCreated", "source": "ndx-signup", "id": str(uuid.uuid4()), "time": datetime.utcnow().isoformat() + "Z", "account": "568672915267", "region": "us-west-2", "version": "0", "resources": [], "detail": {"userEmail": email, "firstName": firstname, "lastName": lastname, "userId": user_id}}))`
    3. SNS publish for Slack: Use the AWS Chatbot custom notification format (same as Task 9 step 3). `sns_client.publish(TopicArn=EVENTS_TOPIC_ARN, Message=json.dumps({"version": "1.0", "source": "custom", "content": {"textType": "client-markdown", "title": "New NDX User Created", "description": f"{firstname} {lastname} ({email})"}}))`
  - Notes: Wrap in try/except. Print warning on failure, never exit. Add `NOTIFICATION_LAMBDA_ARN` and `EVENTS_TOPIC_ARN` as constants or env vars in `isb_common.py`. Import `uuid`, `json`, `datetime`. Place notification call AFTER successful group membership (after line 163 "Added to group"), not after user creation alone — a user without group membership can't use the platform.

#### Phase 5: GOV.UK Notify Templates

- [ ] Task 11: Draft GOV.UK Notify template content — Welcome email
  - File: New file `docs/notify-templates/user-created.md` (for reference/copy-paste)
  - Action: Draft GOV.UK Notify markdown template for welcome email. Personalisation variables: `((userName))`, `((ssoUrl))`. Content should include: welcome to NDX, what to do next (log in via SSO), link to the /try page, brief explanation of what NDX offers. Follow GOV.UK Notify markdown format.

- [ ] Task 12: Draft GOV.UK Notify template content — Provisioning Started email
  - File: New file `docs/notify-templates/blueprint-deployment-request.md`
  - Action: Draft GOV.UK Notify markdown template for "we're setting up your sandbox" email. Personalisation variables: `((userName))`, `((blueprintName))`. Content: your sandbox has been approved, we're deploying your blueprint, we'll email you when it's ready, you don't need to stay on the page.

- [ ] Task 13: Rewrite GOV.UK Notify template content — LeaseApproved email
  - File: New file `docs/notify-templates/lease-approved-updated.md`
  - Action: Draft updated template content for the "your sandbox is ready" email. Review existing template in GOV.UK Notify console and update to clearly communicate readiness. Personalisation variables: `((userName))`, `((accountId))`, `((expiryDate))`, plus existing optional fields. For blueprint leases, acknowledge the wait: "Your sandbox is now ready to use."

- [ ] Task 14: Create templates in GOV.UK Notify console and update config
  - File: `infra/lib/config.ts`
  - Action: Manually create the two new templates in GOV.UK Notify console using the drafted content from Tasks 11-12. Copy the generated template IDs back into `NOTIFY_TEMPLATE_IDS` replacing the `PLACEHOLDER_TEMPLATE_ID` values. Update the LeaseApproved template content in Notify console per Task 13 (template ID stays the same).

#### Phase 6: Try Page UX

- [ ] Task 15: Add inline provisioning hint to sessions table
  - File: `src/try/ui/components/sessions-table.ts`
  - Action: Add a `renderProvisioningHint()` function that returns an inline hint row (similar to `renderCommentsRow()` pattern). When `lease.status === "Provisioning"`, render a `<tr>` beneath the lease row using the GOV.UK **inset text** component pattern (`<div class="govuk-inset-text">`) — do NOT use emojis (not GDS Design System compliant, inconsistent screen reader behaviour). Content: "We're setting up your sandbox. We'll email you at <strong>{email}</strong> when it's ready — you can safely close this page." The user's email should be passed into the render function from the auth state. Add the hint row call in `renderSessionRow()` after the `commentsRow`.
  - File: `src/try/ui/try-page.ts`
  - Action: Pass the authenticated user's email through to `renderSessionRow()` or make it available to the sessions table component.

#### Phase 7: Testing

- [ ] Task 16: Test GOV.UK Notify templates via direct API calls
  - Action: Use the GOV.UK Notify API to send test emails with sample personalisation data for all three templates (UserCreated, BlueprintDeploymentRequest, updated LeaseApproved). Verify formatting, variable substitution, and links render correctly. Send to `chris.nesbitt-smith@digital.cabinet-office.gov.uk`.

- [ ] Task 17: Test BlueprintDeploymentRequest end-to-end
  - Action: Find a real `BlueprintDeploymentRequest` EventBridge event for `chris.nesbitt-smith@digital.cabinet-office.gov.uk` in CloudWatch Logs (ISB account). Replay it through the notification Lambda by publishing to the ISB event bus or directly invoking the Lambda. Verify email received and Slack message posted.

- [ ] Task 18: Test UserCreated via CLI
  - Action: Run `isb create-user --firstname=Chris --lastname=Test --email=chris.nesbitt-smith+test01@digital.cabinet-office.gov.uk`. Verify: (1) User created in Identity Center, (2) Welcome email received at the `+test01` address, (3) Slack alert posted to `#ndx-try-notifications`. If `+` alias is rejected by Identity Center, use a different test email. Clean up test user after verification.

- [ ] Task 19: Test Try page UX
  - Action: Navigate to /try page in browser. If a lease is in `Provisioning` status, verify the inline hint appears beneath the row with the correct email address and copy. If no lease is provisioning, temporarily mock the status in browser devtools to verify rendering.

### Acceptance Criteria

- [ ] AC 1: Given a new user is created via the signup web form, when `createUser()` succeeds, then a welcome email is sent via GOV.UK Notify to the user's email address AND a Slack alert is posted to `#ndx-try-notifications` — and the 200 response is returned regardless of notification success/failure.
- [ ] AC 2: Given a new user is created via `isb create-user` CLI, when the user is successfully created (not "already exists"), then a welcome email is sent via GOV.UK Notify AND a Slack alert is posted to `#ndx-try-notifications`.
- [ ] AC 3: Given the notification Lambda or SNS publish fails during signup, when the error is caught, then the failure is logged at WARN level and the signup still returns `{ success: true }` — notification failure never blocks account creation.
- [ ] AC 4: Given a blueprint lease is approved in ISB, when a `BlueprintDeploymentRequest` event is published to the ISB EventBridge bus, then the notification Lambda sends a "provisioning started" email to the user's email address via GOV.UK Notify.
- [ ] AC 5: Given a lease is approved (blueprint or non-blueprint), when the `LeaseApproved` event fires, then the user receives a "your sandbox is ready" email with updated template content clearly communicating readiness.
- [ ] AC 6: Given a non-blueprint lease is approved, when `LeaseApproved` fires immediately (no provisioning step), then the user receives only the "ready" email — no "provisioning started" email is sent.
- [ ] AC 7: Given a user views the /try page with a lease in `Provisioning` status, when the sessions table renders, then an inline hint appears beneath the lease row saying "We'll email you at {email} when it's ready — you can safely close this page."
- [ ] AC 8: Given a user views the /try page with no leases in `Provisioning` status, when the sessions table renders, then no provisioning hint is shown.
- [ ] AC 9: Given the GOV.UK Notify templates for UserCreated and BlueprintDeploymentRequest, when a test email is sent with sample personalisation data, then the email renders correctly with all variables substituted and no broken formatting.
- [ ] AC 10: Given the notification Lambda receives a `UserCreated` event (via direct invoke), when the event has `source: "ndx-signup"`, then source validation passes and the event is processed normally.
- [ ] AC 11: Given a user already exists in Identity Center, when `isb create-user` is run for that email, then NO welcome email and NO Slack alert is sent (notifications only fire for newly created users, not the "already exists" path).
- [ ] AC 12: Given a `BlueprintDeploymentRequest` event is processed by the notification Lambda, when the email is sent successfully, then a Slack notification is also posted to `#ndx-try-notifications` via the existing `publishSlackNotification()` → SNS → Chatbot pipeline (implicit — same as all other email events).

## Additional Context

### Dependencies

- GOV.UK Notify console access to create 2 new templates and get template IDs
- `#ndx-try-notifications` Slack channel already exists (LeaseRequested/LeaseApproved already post there)
- ISB EventBridge bus already allows cross-account subscription from NDX
- `NDX/InnovationSandboxHub` profile must have `lambda:InvokeFunction` and `sns:Publish` permissions (verify during implementation)
- Cross-stack reference: notification Lambda ARN must be accessible from signup stack CDK (via SSM parameter, CfnOutput, or CDK context). Both stacks deploy to the same account (568672915267) — no cross-account policies needed.
- `@aws-sdk/client-lambda` already available in signup Lambda runtime (AWS SDK v3 bundled with Node.js 20.x Lambda runtime)
- Deploy order: notification stack first (exports Lambda ARN + new env vars), signup stack second (imports them)

### Testing Strategy

- **Template rendering**: Direct GOV.UK Notify API calls with test personalisation data (Task 16)
- **BlueprintDeploymentRequest flow**: Find real event in CloudWatch Logs, replay through Lambda (Task 17)
- **UserCreated (CLI path)**: `isb create-user` with `+test01` alias email (Task 18)
- **UserCreated (web path)**: Direct signup or Lambda invocation test (Task 18 follow-up)
- **`+` alias verification**: Confirm IAM Identity Center accepts `+` in emails before relying on this
- **Try page**: Visual check in browser, mock Provisioning status if needed (Task 19)
- **Regression**: Verify existing LeaseRequested, LeaseApproved, LeaseDenied emails still work after handler changes

### Notes

- `BlueprintDeploymentRequest` event payload (from ISB): `{ blueprintId: UUID, leaseId: UUID, userEmail: string, accountId: string, blueprintName: string, stackSetId: string, regions: string[], regionConcurrencyType: string, deploymentTimeoutMinutes: number }`
- `LeaseApproved` event payload (from ISB): `{ leaseId: UUID, userEmail: string, approvedBy: string }`
- `UserCreated` event payload (new, from signup/CLI): `{ userEmail: string, firstName: string, lastName: string, userId?: string }`
- Existing notification Lambda has: circuit breaker (20 consecutive failures), rate limit retry (1s), PII redaction, HMAC-SHA256 signed portal links (15-min expiry), reserved concurrency (10)
- SSO portal URL for welcome email: `https://d-9267e1e371.awsapps.com/start` — passed via `SSO_PORTAL_URL` env var, not hardcoded in application code
- GOV.UK Notify templates must be created (Phase 5) BEFORE deploying config (Phase 2) — cold-start validation rejects non-UUID template IDs and would break all existing notifications
- `PendingApproval` status does NOT get a Try page hint — the LeaseRequested email already covers that notification. Deliberate exclusion.
- `infra-signup/bin/signup.ts` has a stale `eu-west-2` default region (line 20) — overridden at deploy time but should be fixed to `us-west-2` while editing this file
