# E2E Testing for GOV.UK Notify

This document describes how to set up and run E2E tests for the GOV.UK Notify integration.

## Overview

The E2E tests verify that email templates are correctly configured and all personalisation fields are properly populated before deployment.

## Prerequisites

### 1. GOV.UK Notify Sandbox API Key (AC-8.6)

To obtain a sandbox API key:

1. Log in to [GOV.UK Notify](https://www.notifications.service.gov.uk/)
2. Navigate to your service's API integration settings
3. Create a new API key with "Test" key type
4. The key format is: `{key_name}-{service_id}-{secret_key}`

**Important**: Sandbox/test keys are prefixed differently than production keys. The sandbox environment:
- Does not deliver emails to real recipients
- Uses the same API endpoints as production
- Returns identical response formats
- Does not count against production quotas

### 2. Secrets Manager Configuration

Store the sandbox API key in AWS Secrets Manager:

```json
// Secret path: /ndx/notifications/e2e-credentials
{
  "notifySandboxApiKey": "team-test-00000000-0000-0000-0000-000000000000-11111111-1111-1111-1111-111111111111"
}
```

For CI environments, set the `NOTIFY_SANDBOX_API_KEY` environment variable instead.

## Running E2E Tests

### Locally

```bash
# From the infra directory
cd infra

# Using Secrets Manager (requires AWS credentials)
yarn test:e2e

# Using environment variable
NOTIFY_SANDBOX_API_KEY=your-sandbox-key yarn test:e2e
```

### In CI Pipeline

The E2E tests run automatically in the GitHub Actions workflow:

1. `infra-unit-tests` job runs first
2. `infra-e2e-tests` job runs after unit tests pass
3. Deployment is blocked if E2E tests fail (AC-8.9)

Configure these secrets in GitHub:
- `NOTIFY_SANDBOX_API_KEY`: The sandbox API key
- `NOTIFY_TEMPLATE_LEASE_APPROVED`: Template ID for LeaseApproved emails

## Test Structure

### E2E Tests (`test/e2e/`)

| File | Purpose |
|------|---------|
| `setup.ts` | Validates test environment and credentials |
| `notify-test-client.ts` | Test utilities for GOV.UK Notify API |
| `notify-template.e2e.test.ts` | Template validation tests |

### Smoke Tests (`test/smoke/`)

| File | Purpose |
|------|---------|
| `post-deploy.smoke.test.ts` | Post-deployment verification |

## What the Tests Validate

### Template Validation (AC-8.7)

The tests check that:
1. Emails can be sent via the GOV.UK Notify API
2. All personalisation fields are populated (no `((field))` placeholders)
3. Expected content appears in the email body
4. Email subject is non-empty

### Placeholder Detection

The test utilities detect unfilled GOV.UK Notify placeholders using this pattern:

```typescript
const PLACEHOLDER_PATTERN = /\(\([^)]+\)\)/g;

// Detects: ((userName)), ((accountId)), etc.
// Does not match: (optional), normal parentheses
```

## Troubleshooting

### "Missing required environment variable" Error

**Cause**: No API key configured
**Solution**: Set `NOTIFY_SANDBOX_API_KEY` environment variable or configure Secrets Manager

### "Retrieved API key is not a valid sandbox key" Error

**Cause**: The API key format is invalid
**Solution**: Verify the key has the correct format: `{name}-{uuid}-{uuid}`

### "Timeout waiting for notification" Error

**Cause**: GOV.UK Notify is slow or unreachable
**Solution**: Check GOV.UK Notify status page; try increasing timeout

### Tests Skip with "Template ID not configured"

**Cause**: `NOTIFY_TEMPLATE_LEASE_APPROVED` not set
**Solution**: Set the environment variable to your template ID

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NOTIFY_SANDBOX_API_KEY` | Yes* | Sandbox API key for testing |
| `NOTIFY_TEMPLATE_LEASE_APPROVED` | No | Template ID for LeaseApproved emails |
| `AWS_REGION` | No | AWS region for Secrets Manager |
| `E2E_SECRETS_PATH` | No | Custom Secrets Manager path |
| `SKIP_SMOKE_TESTS` | No | Set to "true" to skip smoke tests |
| `SMOKE_TEST_OPS_EMAIL` | No | Email for smoke test notifications |

*Either `NOTIFY_SANDBOX_API_KEY` or Secrets Manager must be configured

## Adding New Template Tests

To add E2E tests for additional templates:

1. Add the template ID to your environment variables:
   ```bash
   export NOTIFY_TEMPLATE_YOUR_TEMPLATE=<template-id>
   ```

2. Add a test case in `notify-template.e2e.test.ts`:
   ```typescript
   describe('YourTemplate template', () => {
     const templateId = process.env.NOTIFY_TEMPLATE_YOUR_TEMPLATE;
     const conditionalTest = skipIf(!templateId);

     conditionalTest('sends email with all fields populated', async () => {
       const personalisation = {
         // Your template's personalisation fields
       };

       const result = await client.sendEmail(
         templateId!,
         'test@example.gov.uk',
         personalisation
       );

       const notification = await client.waitForNotification(result.id);
       expect(findUnfilledPlaceholders(notification.body)).toHaveLength(0);
     });
   });
   ```

## References

- [GOV.UK Notify Documentation](https://www.notifications.service.gov.uk/documentation)
- [Story N5-8: GOV.UK Notify Sandbox E2E Test](../docs/sprint-artifacts/stories/n5-8-govuk-notify-sandbox-integration-test.md)
- [notifications-node-client](https://github.com/alphagov/notifications-node-client)
