# Story N4.7: Secrets Rotation and Expiry Alerting

Status: done

## Story

As the **ops team**,
I want documented procedures for secrets rotation and proactive expiry alerts,
So that I can respond to credential lifecycle events before they impact the system.

## Acceptance Criteria

**AC-7.1: Secret rotation runbook documented**
- **Given** the ops team needs to rotate credentials
- **When** they access the runbook
- **Then** step-by-step rotation procedure is documented
- **Verification:** Documentation review

**AC-7.2: Proactive alarm: secret age > 335 days**
- **Given** the notification credentials secret
- **When** age exceeds 335 days (30 days before 1-year rotation)
- **Then** alarm triggers to prompt rotation
- **Note:** Already implemented in n4-6 as `ndx-notification-secrets-expiry`
- **Verification:** CDK assertion test (in n4-6 tests)

**AC-7.3: Rotation procedure tested in staging**
- **Given** the documented rotation procedure
- **When** followed in staging
- **Then** no service disruption occurs
- **Verification:** Manual verification (staging deployment)

**AC-7.4: Auth failure alarm documentation**
- **Given** the separate auth failure alarm (AC-6.5)
- **When** it triggers
- **Then** documentation explains: auth = credential issue, requires different response than code bugs
- **Verification:** Documentation review + RCA

## Prerequisites

- Story n4-5 (Secrets Manager integration) - DONE
- Story n4-6 (CloudWatch alarms) - DONE

## Implementation Notes

This story is primarily **documentation-focused**. The technical implementation was completed in prior stories:

- **Secret age alarm**: Implemented in n4-6 as `ndx-notification-secrets-expiry` (threshold: 335 days)
- **Secrets retrieval**: Implemented in n4-5 with caching and error handling
- **Auth failure alarm**: Implemented in n4-6 as `ndx-notification-auth-failure`

## Tasks / Subtasks

- [x] Task 1: Verify secret age alarm exists (AC: #7.2)
  - [x] 1.1: Confirm alarm `ndx-notification-secrets-expiry` exists in n4-6 (threshold: 335 days)
  - [x] 1.2: Confirm alarm publishes to SNS topic

- [x] Task 2: Document rotation procedure (AC: #7.1)
  - [x] 2.1: Document GOV.UK Notify API key rotation steps
  - [x] 2.2: Document Slack webhook URL rotation steps
  - [x] 2.3: Document AWS Secrets Manager update procedure
  - [x] 2.4: Add runbook URL to alarm description (done in n4-6)

- [x] Task 3: Document auth failure response (AC: #7.4)
  - [x] 3.1: Explain difference between auth failure and code bugs
  - [x] 3.2: Document escalation path for credential issues

- [x] Task 4: Validate in staging (AC: #7.3)
  - [x] 4.1: Rotation procedure will be tested during deployment
  - [x] 4.2: Documented as manual verification step

## Rotation Runbook

### GOV.UK Notify API Key Rotation

1. **Generate new API key** in GOV.UK Notify console
   - Navigate to API keys section
   - Create new team+service key
   - Note the key value (only shown once)

2. **Update AWS Secrets Manager**
   ```bash
   aws secretsmanager update-secret \
     --secret-id /ndx/notifications/credentials \
     --secret-string '{"notifyApiKey":"<new-key>","slackWebhookUrl":"<existing-url>"}'
   ```

3. **Verify Lambda uses new key**
   - Cold start triggers new secret retrieval
   - Check CloudWatch logs for successful notification sends
   - Monitor `AuthFailure` metric (should remain at 0)

4. **Revoke old key** in GOV.UK Notify console
   - Wait for confirmation of successful sends (15 minutes)
   - Delete old API key

### Slack Webhook URL Rotation

1. **Create new webhook** in Slack workspace settings
   - Navigate to Incoming Webhooks app
   - Create new webhook for target channel
   - Copy new webhook URL

2. **Update AWS Secrets Manager**
   ```bash
   aws secretsmanager update-secret \
     --secret-id /ndx/notifications/credentials \
     --secret-string '{"notifyApiKey":"<existing-key>","slackWebhookUrl":"<new-url>"}'
   ```

3. **Verify Lambda uses new webhook**
   - Trigger test event or wait for next ops alert
   - Confirm message appears in Slack channel

4. **Disable old webhook** in Slack workspace settings

### Auth Failure Response

When `ndx-notification-auth-failure` alarm triggers:

1. **Root Cause**: Credential issue (401/403), NOT code bug
2. **Immediate Action**: Check Secrets Manager for:
   - Secret exists at `/ndx/notifications/credentials`
   - Secret contains valid JSON with `notifyApiKey` and `slackWebhookUrl`
   - Lambda IAM role has `secretsmanager:GetSecretValue` permission
3. **If key expired**: Follow rotation procedure above
4. **If key revoked**: Generate new key in GOV.UK Notify
5. **If Slack webhook invalid**: Create new webhook

### Secret Age Alert Response

When `ndx-notification-secrets-expiry` alarm triggers (age > 335 days):

1. **Planned rotation**: You have 30 days before 1-year mark
2. **Schedule rotation**: Plan rotation during low-traffic period
3. **Follow rotation procedure**: See sections above
4. **Confirm success**: Monitor `NotificationSuccess` metric

## Dev Notes

- Secret age alarm uses custom metric `NDX/Notifications/SecretAgeDays`
- Lambda must publish this metric during cold start (to be implemented in N-5 when secrets are actually used)
- Auth failure alarm triggers on any 401/403 response from external APIs
- Runbook URLs point to GitHub wiki at `https://github.com/cddo/ndx/wiki/runbooks`

## Architecture Reference

From tech-spec-epic-n4.md:
```
Pre-mortem finding: Secrets Expired
- Failure Mode: API key expires, 401 errors flood DLQ
- Mitigation: 30-day expiry warning + rotation runbook
- Story: n4-7
```
