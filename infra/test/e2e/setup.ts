/**
 * E2E Test Setup
 *
 * This file runs before all E2E tests to validate the test environment
 * and ensure sandbox credentials are available.
 *
 * @see docs/sprint-artifacts/stories/n5-8-govuk-notify-sandbox-integration-test.md
 */

import { getE2ESecrets, isSandboxApiKey } from '../../lib/lambda/notification/secrets';

// Increase jest timeout for setup
jest.setTimeout(30000);

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  console.log('\n[E2E Setup] Validating test environment...');

  // Check if required environment variables are set
  const requiredEnvVars = ['AWS_REGION'];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingEnvVars.length > 0 && !process.env.E2E_SECRETS_PATH) {
    // Only warn if not using custom secrets path
    console.warn(`[E2E Setup] Warning: Missing env vars: ${missingEnvVars.join(', ')}`);
    console.warn('[E2E Setup] Tests may fail if AWS credentials are not configured');
  }

  // For CI, check if sandbox API key is available via environment variable
  if (process.env.NOTIFY_SANDBOX_API_KEY) {
    console.log('[E2E Setup] Using NOTIFY_SANDBOX_API_KEY from environment');
    const isValid = isSandboxApiKey(process.env.NOTIFY_SANDBOX_API_KEY);
    if (!isValid) {
      throw new Error('[E2E Setup] NOTIFY_SANDBOX_API_KEY format is invalid');
    }
    console.log('[E2E Setup] Sandbox API key format validated');
    return;
  }

  // Try to retrieve sandbox credentials from Secrets Manager
  try {
    console.log('[E2E Setup] Retrieving sandbox credentials from Secrets Manager...');
    const secrets = await getE2ESecrets();

    if (!isSandboxApiKey(secrets.notifySandboxApiKey)) {
      throw new Error('[E2E Setup] Retrieved API key is not a valid sandbox key');
    }

    console.log('[E2E Setup] Sandbox credentials retrieved and validated');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if this is a credentials issue
    if (
      errorMessage.includes('Secrets Manager') ||
      errorMessage.includes('credentials')
    ) {
      console.error('[E2E Setup] Failed to retrieve sandbox credentials');
      console.error('[E2E Setup] Please ensure:');
      console.error(
        '  1. AWS credentials are configured (aws sso login or AWS_* env vars)'
      );
      console.error(
        '  2. Secrets Manager has E2E credentials at /ndx/notifications/e2e-credentials'
      );
      console.error(
        '  3. Or set NOTIFY_SANDBOX_API_KEY environment variable for CI'
      );
    }

    throw new Error(`[E2E Setup] Setup failed: ${errorMessage}`);
  }
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(() => {
  console.log('\n[E2E Teardown] E2E tests completed');
});
