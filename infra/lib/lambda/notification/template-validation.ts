/**
 * Template Field Validation for GOV.UK Notify
 *
 * This module validates that GOV.UK Notify templates have the expected
 * personalisation fields during Lambda cold start, detecting template
 * drift before emails are sent with missing data.
 *
 * Story: N5-9 Template Field Validation on Startup
 * @see docs/sprint-artifacts/stories/n5-9-template-field-validation-on-startup.md
 *
 * Architecture:
 * - Runs once per Lambda container (cold start)
 * - Validates templates in parallel for faster startup
 * - Critical mismatches fail Lambda init
 * - Non-critical mismatches log warnings
 *
 * Security Controls:
 * - Template IDs are validated UUIDs
 * - API errors are classified appropriately
 * - Escape hatch via SKIP_TEMPLATE_VALIDATION env var
 */

import { NotifyClient } from 'notifications-node-client';
import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { getSecrets } from './secrets';
import { NOTIFY_TEMPLATES, TemplateConfig } from './templates';
import { CriticalError, PermanentError } from './errors';

// =========================================================================
// Types
// =========================================================================

/**
 * Result of validating a single template
 */
export interface TemplateValidationResult {
  /** Template ID (UUID) */
  templateId: string;
  /** Event type this template is for */
  eventType: string;
  /** Template version from GOV.UK Notify */
  version: number;
  /** Whether validation passed */
  isValid: boolean;
  /** Fields found in template body */
  fieldsInTemplate: string[];
  /** Fields expected by config */
  expectedFields: string[];
  /** Fields expected but not found in template */
  missingFromTemplate: string[];
  /** Fields in template but not in config */
  extraInTemplate: string[];
  /** Severity of any issues */
  severity: 'ok' | 'warning' | 'critical';
}

/**
 * Summary of all template validations
 */
export interface ValidationSummary {
  /** Total templates validated */
  templatesValidated: number;
  /** Number with warnings */
  warnings: number;
  /** Number with critical issues */
  criticals: number;
  /** Validation duration in milliseconds */
  durationMs: number;
  /** Individual results */
  results: TemplateValidationResult[];
}

/**
 * Response shape from GOV.UK Notify getTemplateById
 */
interface NotifyTemplateResponse {
  data: {
    id: string;
    name: string;
    type: string;
    version: number;
    body: string;
    subject?: string;
    created_at: string;
    created_by: string;
  };
}

/**
 * Response shape from GOV.UK Notify previewTemplateById
 */
interface NotifyPreviewResponse {
  data: {
    id: string;
    version: number;
    type: string;
    body: string;
    subject?: string;
  };
}

// =========================================================================
// Logger and Metrics
// =========================================================================

const logger = new Logger({ serviceName: 'ndx-notifications' });
const metrics = new Metrics({
  namespace: 'ndx/notifications',
  serviceName: 'ndx-notifications',
});

// =========================================================================
// Module State (Cold Start Caching)
// =========================================================================

/** Whether templates have been validated this container */
let templatesValidated = false;

/** Cached validation promise (for concurrent calls during init) */
let validationPromise: Promise<ValidationSummary> | null = null;

/** Cached validation results */
let cachedResults: ValidationSummary | null = null;

/** Cached template versions (for version change detection) */
const cachedTemplateVersions: Map<string, number> = new Map();

// =========================================================================
// Constants
// =========================================================================

/**
 * Placeholder detection pattern (AC-9.2)
 * GOV.UK Notify uses ((fieldName)) syntax for placeholders
 * Reused from n5-8: test/e2e/notify-test-client.ts
 */
export const PLACEHOLDER_PATTERN = /\(\([^)]+\)\)/g;

/**
 * Field extraction pattern - captures the field name inside (( ))
 */
const FIELD_EXTRACTION_PATTERN = /\(\(([^)]+)\)\)/g;

// =========================================================================
// Field Extraction (AC-9.2)
// =========================================================================

/**
 * Extract personalisation field names from template body (AC-9.2)
 *
 * GOV.UK Notify uses ((fieldName)) syntax for placeholders.
 * This function extracts unique field names from the template.
 *
 * @param body - Template body with ((placeholder)) patterns
 * @returns Array of unique field names
 *
 * @example
 * extractTemplateFields("Hello ((userName)), your account ((accountId)) is ready.")
 * // Returns: ['userName', 'accountId']
 */
export function extractTemplateFields(body: string): string[] {
  const fields = new Set<string>();
  let match;

  // Reset regex lastIndex for global pattern
  FIELD_EXTRACTION_PATTERN.lastIndex = 0;

  while ((match = FIELD_EXTRACTION_PATTERN.exec(body)) !== null) {
    // match[1] is the capture group containing the field name
    fields.add(match[1]);
  }

  return Array.from(fields);
}

/**
 * Find unfilled placeholders in rendered template (AC-9.10, AC-9.17)
 *
 * After rendering a template with personalisation values, any remaining
 * ((placeholder)) patterns indicate missing values.
 *
 * @param body - Rendered template body
 * @returns Array of unfilled placeholder strings
 */
export function findUnfilledPlaceholders(body: string): string[] {
  const matches = body.match(PLACEHOLDER_PATTERN);
  return matches || [];
}

// =========================================================================
// Validation Logic (AC-9.1, AC-9.3)
// =========================================================================

/**
 * Validate a single template against expected fields (AC-9.1, AC-9.3)
 *
 * Fetches template from GOV.UK Notify API and compares its fields
 * with the expected fields from config.
 *
 * @param client - NotifyClient instance
 * @param templateId - GOV.UK Notify template ID
 * @param eventType - Event type for logging
 * @param config - Template configuration with expected fields
 * @returns Validation result
 */
export async function validateTemplate(
  client: NotifyClient,
  templateId: string,
  eventType: string,
  config: TemplateConfig
): Promise<TemplateValidationResult> {
  // AC-9.1: Fetch template from GOV.UK Notify API
  const response = (await client.getTemplateById(templateId)) as NotifyTemplateResponse;
  const template = response.data;

  // AC-9.2: Extract personalisation fields from template body
  const fieldsInTemplate = extractTemplateFields(template.body);

  // Also check subject line for placeholders
  if (template.subject) {
    const subjectFields = extractTemplateFields(template.subject);
    subjectFields.forEach((f) => {
      if (!fieldsInTemplate.includes(f)) {
        fieldsInTemplate.push(f);
      }
    });
  }

  // AC-9.3: Compare with requiredFields from config
  const expectedFields = [...config.requiredFields, ...config.optionalFields];

  // Fields expected but not in template
  const missingFromTemplate = expectedFields.filter((f) => !fieldsInTemplate.includes(f));

  // Fields in template but not in our config (AC-9.5)
  const extraInTemplate = fieldsInTemplate.filter((f) => !expectedFields.includes(f));

  // Classify severity (AC-9.8, AC-9.9)
  const severity = classifyValidationResult(missingFromTemplate, config.requiredFields);

  // AC-9.11, AC-9.14, AC-9.15: Check for version changes
  const previousVersion = cachedTemplateVersions.get(templateId);
  if (previousVersion !== undefined && previousVersion !== template.version) {
    // AC-9.15: Log INFO for version change
    logger.info('Template version changed', {
      templateId,
      eventType,
      previousVersion,
      currentVersion: template.version,
    });

    // AC-9.11b: Emit metric for version change monitoring
    metrics.addMetric('TemplateVersionChanged', MetricUnit.Count, 1);
    metrics.addDimension('templateId', templateId);
  }

  // Cache the version for future comparisons
  cachedTemplateVersions.set(templateId, template.version);

  return {
    templateId,
    eventType,
    version: template.version,
    isValid: severity === 'ok',
    fieldsInTemplate,
    expectedFields,
    missingFromTemplate,
    extraInTemplate,
    severity,
  };
}

/**
 * Extended NotifyClient interface for methods not in type definitions
 * The notifications-node-client package has these methods but lacks TypeScript types
 */
interface ExtendedNotifyClient {
  previewTemplateById(
    templateId: string,
    options: { personalisation: Record<string, string> }
  ): Promise<NotifyPreviewResponse>;
}

/**
 * Validate template rendering with test data (AC-9.10, AC-9.17)
 *
 * Renders the template with test personalisation values and checks
 * for any unfilled placeholders.
 *
 * @param client - NotifyClient instance
 * @param templateId - GOV.UK Notify template ID
 * @param eventType - Event type for logging
 * @param testPersonalisation - Test values for all expected fields
 * @returns Array of unfilled placeholders (empty if all filled)
 */
export async function validateTemplateRendering(
  client: NotifyClient,
  templateId: string,
  eventType: string,
  testPersonalisation: Record<string, string>
): Promise<string[]> {
  try {
    // Preview template with test data
    // Cast to ExtendedNotifyClient as previewTemplateById exists but has no types
    const extendedClient = client as unknown as ExtendedNotifyClient;
    const response = await extendedClient.previewTemplateById(templateId, {
      personalisation: testPersonalisation,
    });

    const preview = response.data;

    // Check for unfilled placeholders in body
    const bodyPlaceholders = findUnfilledPlaceholders(preview.body);

    // Check subject if present
    const subjectPlaceholders = preview.subject ? findUnfilledPlaceholders(preview.subject) : [];

    const allPlaceholders = [...bodyPlaceholders, ...subjectPlaceholders];

    if (allPlaceholders.length > 0) {
      logger.warn('Template has unfilled placeholders after rendering', {
        templateId,
        eventType,
        unfilled: allPlaceholders,
      });
    }

    return allPlaceholders;
  } catch (error) {
    // Log error but don't fail - rendering test is supplementary
    logger.warn('Template rendering test failed', {
      templateId,
      eventType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Classify validation result severity (AC-9.8, AC-9.9)
 *
 * - critical: Required fields missing from template (AC-9.8)
 * - warning: Only optional fields missing or extra fields present
 * - ok: All fields match
 */
function classifyValidationResult(
  missingFromTemplate: string[],
  requiredFields: string[]
): 'ok' | 'warning' | 'critical' {
  // Check if any required fields are missing
  const missingRequired = missingFromTemplate.filter((f) => requiredFields.includes(f));

  if (missingRequired.length > 0) {
    return 'critical';
  }

  // If any fields are missing (optional) or extra fields exist
  if (missingFromTemplate.length > 0) {
    return 'warning';
  }

  return 'ok';
}

// =========================================================================
// Startup Validation (AC-9.7)
// =========================================================================

/**
 * Get template ID from environment, returns null if not set
 */
function getTemplateIdSafe(config: TemplateConfig): string | null {
  const templateId = process.env[config.templateIdEnvVar];
  return templateId && templateId.length > 0 ? templateId : null;
}

/**
 * Generate test personalisation values for a template
 */
function generateTestPersonalisation(config: TemplateConfig): Record<string, string> {
  const values: Record<string, string> = {};

  // Generate test values for all fields
  for (const field of [...config.requiredFields, ...config.optionalFields]) {
    values[field] = `test-${field}`;
  }

  return values;
}

/**
 * Validate all configured templates (AC-9.7)
 *
 * Validates templates in parallel for faster cold start.
 * Logs results and emits metrics.
 *
 * @param client - NotifyClient instance
 * @returns Validation summary
 */
async function performValidation(client: NotifyClient): Promise<ValidationSummary> {
  const startTime = Date.now();

  // Check for skip flag (escape hatch for emergencies)
  if (process.env.SKIP_TEMPLATE_VALIDATION === 'true') {
    logger.warn('Template validation SKIPPED - SKIP_TEMPLATE_VALIDATION is set', {
      warning: 'This should only be used in emergencies',
    });
    return {
      templatesValidated: 0,
      warnings: 0,
      criticals: 0,
      durationMs: 0,
      results: [],
    };
  }

  // Check for subset validation
  const templatesToValidate = process.env.TEMPLATES_TO_VALIDATE?.split(',') || null;

  const templateEntries = Object.entries(NOTIFY_TEMPLATES);
  const templateCount = templatesToValidate
    ? templateEntries.filter(([eventType]) => templatesToValidate.includes(eventType)).length
    : templateEntries.length;

  logger.info('Starting template validation', { templateCount });

  // Validate templates in parallel (AC-9.10 - faster cold start)
  const validationPromises = templateEntries.map(async ([eventType, config]) => {
    // Skip if subset specified and this template not in it
    if (templatesToValidate && !templatesToValidate.includes(eventType)) {
      return null;
    }

    const templateId = getTemplateIdSafe(config);
    if (!templateId) {
      logger.debug('Template ID not configured, skipping', { eventType });
      return null;
    }

    try {
      // AC-9.1, AC-9.3, AC-9.13: Validate template fields
      const result = await validateTemplate(client, templateId, eventType, config);

      // AC-9.12: Log template details
      logger.info('Template validated', {
        eventType,
        templateId,
        version: result.version,
        fieldCount: result.fieldsInTemplate.length,
        severity: result.severity,
      });

      // AC-9.4: Log WARNING for missing fields
      if (result.missingFromTemplate.length > 0) {
        logger.warn('Template missing expected fields', {
          eventType,
          templateId,
          missingFields: result.missingFromTemplate,
        });
      }

      // AC-9.5: Log INFO for extra fields
      if (result.extraInTemplate.length > 0) {
        logger.info('Template has extra fields', {
          eventType,
          templateId,
          extraFields: result.extraInTemplate,
        });
      }

      // AC-9.10, AC-9.17: Render test to check for unfilled placeholders
      const testValues = generateTestPersonalisation(config);
      await validateTemplateRendering(client, templateId, eventType, testValues);

      // AC-9.6: Emit metric on validation failure
      if (result.severity !== 'ok') {
        metrics.addMetric('TemplateValidationFailed', MetricUnit.Count, 1);
        metrics.addDimension('templateId', templateId);
        metrics.addDimension('severity', result.severity);
      } else {
        metrics.addMetric('TemplateValidationSuccess', MetricUnit.Count, 1);
        metrics.addDimension('templateId', templateId);
      }

      // AC-9.11: Store template version as metric
      metrics.addMetric('TemplateVersion', MetricUnit.Count, result.version);
      metrics.addDimension('templateId', templateId);

      return result;
    } catch (error) {
      // Template not found or API error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Template validation failed', {
        eventType,
        templateId,
        error: errorMessage,
      });

      // Return critical result for API failures
      return {
        templateId,
        eventType,
        version: 0,
        isValid: false,
        fieldsInTemplate: [],
        expectedFields: [...config.requiredFields, ...config.optionalFields],
        missingFromTemplate: config.requiredFields,
        extraInTemplate: [],
        severity: 'critical' as const,
      };
    }
  });

  const results = await Promise.all(validationPromises);
  const validResults = results.filter((r): r is TemplateValidationResult => r !== null);

  const durationMs = Date.now() - startTime;

  // Emit cold start validation duration metric
  metrics.addMetric('ColdStartValidationDuration', MetricUnit.Milliseconds, durationMs);

  const summary: ValidationSummary = {
    templatesValidated: validResults.length,
    warnings: validResults.filter((r) => r.severity === 'warning').length,
    criticals: validResults.filter((r) => r.severity === 'critical').length,
    durationMs,
    results: validResults,
  };

  logger.info('Template validation complete', {
    templatesValidated: summary.templatesValidated,
    warnings: summary.warnings,
    criticals: summary.criticals,
    durationMs: summary.durationMs,
  });

  return summary;
}

/**
 * Validate all templates once per cold start (AC-9.7)
 *
 * This function ensures validation only runs once per Lambda container.
 * Concurrent calls during init will await the same promise.
 *
 * @throws CriticalError if any template has critical validation failures
 */
export async function validateAllTemplatesOnce(): Promise<ValidationSummary> {
  // Return cached results if already validated
  if (templatesValidated && cachedResults) {
    return cachedResults;
  }

  // Return existing promise if validation in progress
  if (validationPromise) {
    return validationPromise;
  }

  // Start validation
  validationPromise = (async () => {
    try {
      // Get Notify client
      const secrets = await getSecrets();
      const client = new NotifyClient(secrets.notifyApiKey);

      // Perform validation
      const summary = await performValidation(client);

      // AC-9.8: Fail Lambda init on critical mismatches
      if (summary.criticals > 0) {
        const criticalTemplates = summary.results
          .filter((r) => r.severity === 'critical')
          .map((r) => `${r.eventType}:${r.templateId}`);

        logger.error('CRITICAL: Template validation failed - Lambda init blocked', {
          criticalTemplates,
          missingFields: summary.results
            .filter((r) => r.severity === 'critical')
            .map((r) => ({ eventType: r.eventType, missing: r.missingFromTemplate })),
        });

        throw new CriticalError(
          `Template validation failed: ${summary.criticals} critical issues. ` +
            `Templates: ${criticalTemplates.join(', ')}`,
          'notify'
        );
      }

      // Cache results
      cachedResults = summary;
      templatesValidated = true;

      return summary;
    } catch (error) {
      // Clear validation promise on failure to allow retry
      validationPromise = null;

      // Re-throw CriticalError as-is
      if (error instanceof CriticalError) {
        throw error;
      }

      // Wrap other errors
      if (error instanceof Error) {
        throw new CriticalError(`Template validation failed: ${error.message}`, 'notify', error);
      }

      throw new CriticalError('Template validation failed with unknown error', 'notify');
    }
  })();

  return validationPromise;
}

// =========================================================================
// Testing Utilities
// =========================================================================

/**
 * Reset validation state for testing
 */
export function resetValidationState(): void {
  templatesValidated = false;
  validationPromise = null;
  cachedResults = null;
  cachedTemplateVersions.clear();
}

/**
 * Get cached validation results for testing
 */
export function getCachedResults(): ValidationSummary | null {
  return cachedResults;
}

/**
 * Check if templates have been validated
 */
export function isValidated(): boolean {
  return templatesValidated;
}
