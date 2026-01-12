# Story N5.9: Template Field Validation on Startup

Status: done

## Code Review (2025-11-28)

**Reviewer:** SM (Code Review Workflow)
**Verdict:** ✅ APPROVED

### AC Verification Summary

- **MUST ACs:** 7/7 PASS (AC-9.1 through AC-9.10, AC-9.13)
- **SHOULD ACs:** 12/12 PASS

### Key Findings

1. Cold start validation properly integrated in handler.ts
2. 27 unit tests passing covering all scenarios
3. Template field extraction, comparison, and rendering tests implemented
4. CriticalError thrown for missing required fields (blocks Lambda init)
5. Version tracking with CloudWatch metrics
6. Escape hatch via SKIP_TEMPLATE_VALIDATION env var
7. Documentation complete at `infra/docs/template-management.md`:
   - AC-9.16: Safe template update procedure (lines 40-89)
   - AC-9.18: Template rollback procedure (lines 91-129)
   - AC-9.19: Template change log (lines 163-185)

### Test Results

```
Test Suites: 1 passed, 1 total
Tests:       27 passed, 27 total
```

## Story

As the **notification system**,
I want to **validate GOV.UK Notify templates have expected personalisation fields during Lambda cold start**,
so that **template drift is detected early before the first email is sent with missing data**.

## Acceptance Criteria

### Core Validation (MUST)

1. AC-9.1: `validateTemplate()` fetches template from GOV.UK Notify API
2. AC-9.2: Function extracts personalisation field names from template body
3. AC-9.3: Function compares template fields with `requiredFields` from config
4. AC-9.4: Missing required fields log WARNING with specific field names
5. AC-9.8: Critical mismatch (e.g., template not found) fails Lambda init
6. AC-9.10: `validateTemplate()` renders test payload, asserts no `((field))` placeholders in output
7. AC-9.13: Startup validation calls `getTemplateById()` which returns LATEST version

### Template Version Tracking (SHOULD)

8. AC-9.5: Extra template fields (not in config) log INFO (acceptable)
9. AC-9.6: `TemplateValidationFailed` metric emitted on mismatch
10. AC-9.7: Validation runs once per cold start (not every invocation)
11. AC-9.9: Non-critical mismatch allows Lambda to continue with warning
12. AC-9.11: Template version tracking: Store template.version in CloudWatch metric on each cold start
13. AC-9.11b: Monitor for version changes: Alert if Notify template version increases unexpectedly
14. AC-9.14: Log template version returned by Notify (for audit trail of template changes)
15. AC-9.15: If template version differs from previous version, send INFO log (not alarm, no blocking)

### Documentation (SHOULD)

16. AC-9.16: Document: "How to safely update GOV.UK Notify templates without breaking emails"
17. AC-9.17: Template rendering test: Render template with test payload; assert no `((placeholder))` in output
18. AC-9.18: Template rollback procedure documented: How to revert template to previous version
19. AC-9.19: Template change log: Track all changes (timestamp, changed by, old vs. new fields) for audit

## Tasks / Subtasks

- [ ] Task 1: Implement template validation function (AC: 9.1, 9.2, 9.3, 9.13)
  - [ ] Subtask 1.1: Add `validateTemplate()` method to NotifySender class
  - [ ] Subtask 1.2: Fetch template from GOV.UK Notify API using `getTemplateById()`
  - [ ] Subtask 1.3: Extract personalisation fields from template body using regex
  - [ ] Subtask 1.4: Compare extracted fields with `requiredFields` from NOTIFY_TEMPLATES config

- [ ] Task 2: Implement startup validation hook (AC: 9.7, 9.8, 9.9)
  - [ ] Subtask 2.1: Create `validateAllTemplates()` function that iterates NOTIFY_TEMPLATES
  - [ ] Subtask 2.2: Call validation once during Lambda cold start (global scope initialization)
  - [ ] Subtask 2.3: Implement critical vs. non-critical mismatch logic
  - [ ] Subtask 2.4: Fail Lambda init on critical errors (template not found, API unreachable)
  - [ ] Subtask 2.5: Allow Lambda to continue on non-critical warnings (missing optional fields)

- [ ] Task 3: Implement template rendering test (AC: 9.10, 9.17)
  - [ ] Subtask 3.1: Create test personalisation payload with all required fields
  - [ ] Subtask 3.2: Use NotifyClient preview API to render template with test data
  - [ ] Subtask 3.3: Assert rendered body contains no `((placeholder))` patterns
  - [ ] Subtask 3.4: Log WARNING if placeholders detected in rendered output

- [ ] Task 4: Implement logging and metrics (AC: 9.4, 9.5, 9.6, 9.14, 9.15)
  - [ ] Subtask 4.1: Log WARNING for missing required fields with field names
  - [ ] Subtask 4.2: Log INFO for extra template fields not in config
  - [ ] Subtask 4.3: Emit `TemplateValidationFailed` metric on mismatch
  - [ ] Subtask 4.4: Log template version on each cold start
  - [ ] Subtask 4.5: Log INFO if template version changes (not critical)

- [ ] Task 5: Implement template version tracking (AC: 9.11, 9.11b)
  - [ ] Subtask 5.1: Store template version in CloudWatch custom metric `TemplateVersion`
  - [ ] Subtask 5.2: Create CloudWatch alarm for unexpected template version increases
  - [ ] Subtask 5.3: Include template ID and version in metric dimensions

- [ ] Task 6: Unit tests for validation logic (AC: 9.1-9.10)
  - [ ] Subtask 6.1: Test `validateTemplate()` with valid template (all fields present)
  - [ ] Subtask 6.2: Test missing required fields scenario
  - [ ] Subtask 6.3: Test extra optional fields scenario
  - [ ] Subtask 6.4: Test template not found scenario (critical error)
  - [ ] Subtask 6.5: Test placeholder detection in rendered template
  - [ ] Subtask 6.6: Test validation runs only once per cold start
  - [ ] Subtask 6.7: Mock NotifyClient `getTemplateById()` and `getTemplateByIdAndVersion()` calls
  - [ ] Subtask 6.8: Verify metrics emitted on validation failures

- [ ] Task 7: Documentation (AC: 9.16, 9.18, 9.19)
  - [ ] Subtask 7.1: Document safe template update procedure in runbook
  - [ ] Subtask 7.2: Document template rollback procedure
  - [ ] Subtask 7.3: Create template change log template (timestamp, changed by, fields)
  - [ ] Subtask 7.4: Document how startup validation prevents runtime errors

## Dev Notes

### Architecture Pattern

This story adds startup validation to catch template drift before emails are sent:

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
│ 3. Validate All Templates ← THIS STORY     │
│    For each template in NOTIFY_TEMPLATES:   │
│    - Fetch template from GOV.UK Notify      │
│    - Extract personalisation fields         │
│    - Compare with requiredFields            │
│    - Log WARNING if mismatch                │
│    - Fail Lambda init if CRITICAL mismatch  │
└─────────────────────────────────────────────┘
         │
         ▼
   Ready to Handle Events
```

### Personalisation Field Extraction

GOV.UK Notify uses double parentheses for personalisation fields:

```
Template: "Hello ((userName)), your lease ((leaseId)) expires on ((expiryDate))."
Extracted: ["userName", "leaseId", "expiryDate"]
```

Regex pattern:

```typescript
const FIELD_PATTERN = /\(\(([^)]+)\)\)/g

function extractPersonalisationFields(templateBody: string): string[] {
  const matches = [...templateBody.matchAll(FIELD_PATTERN)]
  return matches.map((match) => match[1])
}
```

### Template Validation Logic

```typescript
// templates.ts - Template registry
export const NOTIFY_TEMPLATES: Record<string, TemplateConfig> = {
  LeaseApproved: {
    templateIdEnvVar: 'NOTIFY_TEMPLATE_LEASE_APPROVED',
    requiredFields: ['userName', 'accountId', 'ssoUrl', 'expiryDate'],
    optionalFields: ['budgetLimit'],
  },
  // ... other templates
};

// notify-sender.ts - Validation method
async validateTemplate(templateId: string, fields: string[]): Promise<boolean> {
  // Fetch template from GOV.UK Notify
  const template = await this.client.getTemplateById(templateId);

  // Extract personalisation fields from template body
  const templateFields = extractPersonalisationFields(template.body);

  // Check for missing required fields
  const missing = fields.filter(f => !templateFields.includes(f));
  if (missing.length > 0) {
    logger.warn('Template missing required fields', {
      templateId,
      templateVersion: template.version,
      missingFields: missing,
    });
    metrics.addMetric('TemplateValidationFailed', 1, {
      templateId,
      reason: 'missing_required_fields',
    });
    throw new PermanentError(`Template ${templateId} missing fields: ${missing.join(', ')}`);
  }

  // Log extra fields (informational)
  const extra = templateFields.filter(f => !fields.includes(f));
  if (extra.length > 0) {
    logger.info('Template has extra fields', {
      templateId,
      extraFields: extra,
    });
  }

  // Track template version
  metrics.addMetric('TemplateVersion', template.version, {
    templateId,
  });

  return true;
}
```

### Startup Validation Hook

```typescript
// handler.ts - Global scope initialization
let templatesValidated = false

async function validateAllTemplatesOnce(): Promise<void> {
  if (templatesValidated) {
    return // Skip if already validated this Lambda container
  }

  logger.info("Starting template validation")

  const sender = await NotifySender.getInstance()

  for (const [eventType, config] of Object.entries(NOTIFY_TEMPLATES)) {
    try {
      const templateId = process.env[config.templateIdEnvVar]
      if (!templateId) {
        logger.error("Template ID not configured", { eventType })
        throw new Error(`Missing template ID for ${eventType}`)
      }

      await sender.validateTemplate(templateId, config.requiredFields)
      logger.info("Template validated", { eventType, templateId })
    } catch (error) {
      logger.error("Template validation failed", {
        eventType,
        error: error.message,
      })

      // Critical errors fail Lambda init
      if (error instanceof PermanentError && error.message.includes("not found")) {
        throw error
      }

      // Non-critical errors log warning but allow Lambda to start
      logger.warn("Continuing despite template validation warning", { eventType })
    }
  }

  templatesValidated = true
  logger.info("Template validation complete")
}

// Call during Lambda initialization
validateAllTemplatesOnce().catch((error) => {
  logger.error("CRITICAL: Template validation failed during initialization", { error })
  throw error
})
```

### Template Rendering Test

```typescript
async validateTemplateRendering(
  templateId: string,
  testPersonalisation: Record<string, string>
): Promise<void> {
  // Preview template with test data
  const preview = await this.client.previewTemplateById(templateId, testPersonalisation);

  // Check for unfilled placeholders
  const placeholders = findUnfilledPlaceholders(preview.body);
  if (placeholders.length > 0) {
    logger.warn('Template has unfilled placeholders', {
      templateId,
      placeholders,
    });
    throw new PermanentError(`Template ${templateId} has unfilled placeholders: ${placeholders.join(', ')}`);
  }
}

// Helper from n5-8
const PLACEHOLDER_PATTERN = /\(\([^)]+\)\)/g;

function findUnfilledPlaceholders(htmlBody: string): string[] {
  const matches = [...htmlBody.matchAll(PLACEHOLDER_PATTERN)];
  return matches.map(match => match[0]);
}
```

### Learnings from Previous Story (N5-8)

**From Story n5-8-govuk-notify-sandbox-integration-test:**

- **E2E Secrets Support**: The `secrets.ts` module now has `getE2ESecrets()`, `isSandboxApiKey()`, and `clearE2ESecretsCache()` functions for managing sandbox credentials
- **Placeholder Detection Regex**: `PLACEHOLDER_PATTERN = /\(\([^)]+\)\)/g` is already established and tested
- **Test Client Utilities**: `notify-test-client.ts` provides `NotifyTestClient` with methods for sending emails and validating content
- **CI Pipeline Integration**: GitHub Actions workflow has `infra-e2e-tests` job that blocks deployment on test failures
- **Documentation Structure**: `infra/docs/e2e-testing.md` provides template for operational documentation

**Reuse Opportunities:**

1. Use the same placeholder detection regex from n5-8 for template rendering validation
2. Leverage the E2E test client structure for integration tests of startup validation
3. Follow the same error handling patterns for GOV.UK Notify API calls
4. Use similar CloudWatch metrics patterns established in n5-8

**New Capabilities to Add:**

1. Template field extraction from Notify API response (not just test data)
2. Cold start validation hook (global scope initialization)
3. Template version tracking with CloudWatch custom metrics
4. Critical vs. non-critical mismatch logic for startup failures

### Project Structure Notes

**Existing Components (from N5-8):**

```
infra/lib/lambda/notification/
├── secrets.ts                  ← E2E secrets support added
├── notify-sender.ts            ← Will add validateTemplate() method here
└── templates.ts                ← Template registry with requiredFields config

infra/test/e2e/
├── setup.ts                    ← E2E test environment
├── notify-test-client.ts       ← Placeholder detection utilities
└── notify-template.e2e.test.ts ← Template validation tests
```

**New Components (This Story):**

```
infra/lib/lambda/notification/
└── notify-sender.ts            ← Add validateTemplate(), validateAllTemplates()

infra/test/unit/
└── notify-sender.test.ts       ← Add startup validation unit tests

infra/docs/
└── template-management.md      ← NEW - Template update/rollback procedures
```

**Integration Points:**

- Handler initialization calls `validateAllTemplatesOnce()` before processing events
- Uses NotifyClient from `notifications-node-client` SDK
- Emits metrics to CloudWatch via Lambda Powertools
- Logs via structured Logger (Lambda Powertools)

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-n5.md#Story-n5-9]
- [Source: docs/notification-architecture.md#Template-Registry]
- [Source: stories/n5-8-govuk-notify-sandbox-integration-test.md#Dev-Notes]
- [GOV.UK Notify API Documentation](https://www.notifications.service.gov.uk/documentation)
- [Pre-mortem: Template drift can silently break emails if not detected early]

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/stories/n5-9-template-field-validation-on-startup.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. Created `template-validation.ts` with comprehensive validation logic
2. Added cold start validation hook to `handler.ts`
3. Implemented 27 unit tests covering all acceptance criteria
4. Created operational documentation in `docs/template-management.md`

### File List

#### New Files

- `infra/lib/lambda/notification/template-validation.ts` - Core validation module
- `infra/lib/lambda/notification/template-validation.test.ts` - 27 unit tests
- `infra/docs/template-management.md` - Operational documentation

#### Modified Files

- `infra/lib/lambda/notification/handler.ts` - Added cold start validation hook
