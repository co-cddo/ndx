# GOV.UK Notify Template Management

This document covers the safe management of GOV.UK Notify email templates used by the NDX Notification Lambda. It includes procedures for updating templates, understanding startup validation, and rolling back changes when needed.

## Overview

The NDX Notification Lambda validates all configured GOV.UK Notify templates during cold start. This prevents template drift from causing runtime errors when sending emails with missing personalisation fields.

### Why Startup Validation?

Without startup validation, template changes in GOV.UK Notify Admin could silently break email notifications:

1. Developer removes a field from template in GOV.UK Notify Admin
2. Lambda continues running with cached client
3. Next email send fails with `ValidationError: Missing required field`
4. User doesn't receive critical notification (e.g., lease approval)

Startup validation catches this *before* any emails are sent.

## Template Configuration

Templates are configured in `lib/lambda/notification/templates.ts`:

```typescript
export const NOTIFY_TEMPLATES: Record<string, TemplateConfig> = {
  LeaseApproved: {
    templateIdEnvVar: 'NOTIFY_TEMPLATE_LEASE_APPROVED',
    requiredFields: ['userName', 'accountId', 'ssoUrl', 'expiryDate'],
    optionalFields: ['budgetLimit'],
    enrichmentQueries: ['lease'],
  },
  // ... other templates
};
```

**Required fields**: Must be present in the GOV.UK Notify template. Missing required fields cause a **critical error** that blocks Lambda init.

**Optional fields**: May or may not be in the template. Missing optional fields cause a **warning** but don't block Lambda.

## How to Safely Update GOV.UK Notify Templates

### AC-9.16: Safe Update Procedure

Before modifying a template in GOV.UK Notify Admin:

1. **Review the template configuration** in `templates.ts`
   - Identify which fields are `requiredFields` vs `optionalFields`
   - Adding fields is safe; removing required fields is dangerous

2. **Update the code first (if removing fields)**
   ```typescript
   // Move field from requiredFields to optionalFields if you want to remove it from template
   requiredFields: ['userName', 'accountId'],  // Removed 'ssoUrl'
   optionalFields: ['budgetLimit', 'ssoUrl'],  // Added 'ssoUrl' as optional
   ```

3. **Deploy the code change**
   ```bash
   yarn build && yarn cdk deploy
   ```

4. **Wait for successful deployment** before modifying GOV.UK Notify template

5. **Update the template in GOV.UK Notify Admin**
   - Make your changes
   - Create a new version (Notify keeps version history)

6. **Verify the Lambda**
   - Trigger a cold start by updating any Lambda environment variable
   - Check CloudWatch logs for validation messages

### Adding New Fields

Adding new fields to a template is safe:

1. Add the field in GOV.UK Notify Admin
2. Update `templates.ts` to include the new field
3. Update the event-to-personalisation mapping if needed
4. Deploy

### Removing Fields

Removing fields requires careful ordering:

1. **First**: Move field from `requiredFields` to `optionalFields` in code
2. **Deploy** the code change
3. **Then**: Remove the field from GOV.UK Notify template
4. **Finally**: Remove field from `optionalFields` in code (cleanup)

## Rollback Procedures

### AC-9.18: Template Rollback in GOV.UK Notify

GOV.UK Notify automatically versions templates. To rollback:

1. Go to [GOV.UK Notify Admin](https://www.notifications.service.gov.uk/)
2. Navigate to **Templates** > Select your template
3. Click **Template history**
4. Click **Use this version** on the previous working version

Note: This creates a new version based on the historical one - versions are never deleted.

### Lambda Rollback

If startup validation fails after a code deployment:

```bash
# Check CloudWatch logs for error
aws logs tail /aws/lambda/ndx-notification-handler --since 5m

# Rollback to previous version
aws lambda update-function-code \
  --function-name ndx-notification-handler \
  --s3-bucket your-artifact-bucket \
  --s3-key previous-version.zip
```

### Emergency Escape Hatch

In an emergency where template validation is blocking Lambda cold starts but emails are still working:

```bash
# Set skip flag (temporary workaround only!)
aws lambda update-function-configuration \
  --function-name ndx-notification-handler \
  --environment "Variables={SKIP_TEMPLATE_VALIDATION=true,...other-vars...}"
```

**Warning**: This bypasses all startup validation. Use only as a temporary measure while fixing the root cause. Remove the flag as soon as possible.

## Monitoring and Alerts

### Metrics

| Metric | Meaning | Alert Threshold |
|--------|---------|-----------------|
| `TemplateValidationFailed` | Template missing required fields | Any occurrence |
| `TemplateValidationSuccess` | Template validated successfully | Expected during cold starts |
| `TemplateVersion` | Current version of each template | N/A (informational) |
| `TemplateVersionChanged` | Template version changed since last check | Any occurrence (INFO) |
| `ColdStartValidationDuration` | Time to validate all templates | > 5000ms |

### CloudWatch Alarm

An alarm should be configured for `TemplateValidationFailed`:

```yaml
TemplateValidationAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: ndx-template-validation-failed
    MetricName: TemplateValidationFailed
    Namespace: ndx/notifications
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 1
    Threshold: 1
    ComparisonOperator: GreaterThanOrEqualToThreshold
    AlarmActions:
      - !Ref OpsAlertTopic
```

## Template Change Log

### AC-9.19: Tracking Template Changes

For audit purposes, track all template changes in a changelog. Template version changes are automatically logged to CloudWatch:

```json
{
  "level": "INFO",
  "message": "Template version changed",
  "templateId": "xxx-xxx-xxx",
  "eventType": "LeaseApproved",
  "previousVersion": 5,
  "currentVersion": 6
}
```

Maintain a manual changelog for significant changes:

| Date | Template | Changed By | Old Fields | New Fields | Reason |
|------|----------|------------|------------|------------|--------|
| 2024-01-15 | LeaseApproved | @engineer | userName, accountId | userName, accountId, budgetLimit | Added budget display |

## Troubleshooting

### "Template validation failed during initialization"

**Cause**: A required field is missing from the GOV.UK Notify template.

**Resolution**:
1. Check CloudWatch logs for specific missing fields
2. Either add the field back to the template OR
3. Move the field to `optionalFields` in code and redeploy

### "Template not found"

**Cause**: Template ID in environment variable doesn't exist in GOV.UK Notify.

**Resolution**:
1. Verify the template exists in GOV.UK Notify Admin
2. Check the template ID matches the environment variable
3. Ensure the API key has access to the template's service

### Validation passes but emails fail

**Cause**: Field name mismatch between code and template (case sensitive).

**Resolution**:
1. Compare field names exactly (including case)
2. Template uses `((userName))` → code must use `userName`
3. Watch for typos: `expiryDate` vs `expiry_date`

## References

- [GOV.UK Notify API Documentation](https://www.notifications.service.gov.uk/documentation)
- [Story N5-9: Template Field Validation on Startup](../sprint-artifacts/stories/n5-9-template-field-validation-on-startup.md)
- [Notification Architecture](../notification-architecture.md)
