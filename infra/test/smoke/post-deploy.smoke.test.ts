/**
 * Post-Deployment Smoke Test for GOV.UK Notify
 *
 * Lightweight smoke test that runs after production deployment
 * to verify the notification system is operational.
 *
 * AC-8.8: Smoke test runs post-deployment in prod, sends test email to ops inbox
 *
 * @see docs/sprint-artifacts/stories/n5-8-govuk-notify-sandbox-integration-test.md
 */

import { NotifyClient } from 'notifications-node-client';

// Types for Notify SDK responses
interface NotifyEmailResponse {
  data: {
    id: string;
    reference?: string;
    content: {
      body: string;
      subject: string;
      from_email: string;
    };
    template: {
      id: string;
      version: number;
      uri: string;
    };
    uri: string;
  };
}

/**
 * Get required environment variables for smoke test
 */
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Check if smoke tests should be skipped
 */
function shouldSkipSmokeTests(): boolean {
  // Skip if running in development/CI without production config
  if (process.env.SKIP_SMOKE_TESTS === 'true') {
    return true;
  }

  // Skip if no API key configured
  if (!process.env.NOTIFY_API_KEY && !process.env.NOTIFY_SANDBOX_API_KEY) {
    console.warn('[Smoke Test] No API key configured, skipping smoke tests');
    return true;
  }

  return false;
}

describe('Post-Deployment Smoke Tests', () => {
  // Skip entire suite if not configured
  const skipTests = shouldSkipSmokeTests();

  describe('GOV.UK Notify connectivity (AC-8.8)', () => {
    const conditionalTest = skipTests ? test.skip : test;

    conditionalTest(
      'can send test email via GOV.UK Notify',
      async () => {
        // Use sandbox key for smoke tests (safer than production)
        const apiKey = process.env.NOTIFY_SANDBOX_API_KEY || getRequiredEnv('NOTIFY_API_KEY');
        const templateId = getRequiredEnv('NOTIFY_TEMPLATE_LEASE_APPROVED');
        const opsEmail = process.env.SMOKE_TEST_OPS_EMAIL || 'ndx-ops@example.gov.uk';

        const client = new NotifyClient(apiKey);

        // Minimal personalisation for smoke test
        const personalisation = {
          userName: 'Smoke Test User',
          accountId: '000000000000',
          ssoUrl: 'https://smoke-test.example.gov.uk',
          expiryDate: new Date().toISOString().split('T')[0],
          budgetLimit: '0.00',
        };

        const reference = `smoke-test-${Date.now()}`;

        console.log(`[Smoke Test] Sending test email to ${opsEmail}`);
        console.log(`[Smoke Test] Reference: ${reference}`);

        // Send test email
        const response = (await client.sendEmail(templateId, opsEmail, {
          personalisation,
          reference,
        })) as NotifyEmailResponse;

        // Verify we got a valid response
        expect(response.data.id).toBeDefined();
        expect(response.data.id.length).toBeGreaterThan(0);
        expect(response.data.reference).toBe(reference);

        console.log(`[Smoke Test] Email sent successfully`);
        console.log(`[Smoke Test] Notification ID: ${response.data.id}`);
        console.log(`[Smoke Test] Subject: ${response.data.content.subject}`);

        // Verify no unfilled placeholders in the immediate response content
        const body = response.data.content.body;
        const placeholderPattern = /\(\([^)]+\)\)/g;
        const unfilled = body.match(placeholderPattern) || [];

        if (unfilled.length > 0) {
          console.error(`[Smoke Test] Found unfilled placeholders: ${unfilled.join(', ')}`);
        }

        expect(unfilled).toHaveLength(0);
      }
    );

    conditionalTest(
      'GOV.UK Notify API is reachable',
      async () => {
        const apiKey = process.env.NOTIFY_SANDBOX_API_KEY || getRequiredEnv('NOTIFY_API_KEY');
        const client = new NotifyClient(apiKey);

        // Simple connectivity check - list templates
        // This verifies API key works and service is reachable
        try {
          const templates = await client.getAllTemplates('email');
          expect(templates).toBeDefined();
          console.log(`[Smoke Test] API connectivity verified`);
          console.log(
            `[Smoke Test] Found ${templates.data?.templates?.length || 0} email templates`
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Smoke Test] API connectivity failed: ${errorMessage}`);
          throw error;
        }
      }
    );
  });

  // Placeholder for future smoke tests
  describe.skip('Lambda function health', () => {
    test('notification handler Lambda is healthy', async () => {
      // TODO: Add Lambda invocation test if needed
      // This could invoke the Lambda with a test event
    });
  });
});
