/**
 * E2E Test Client for GOV.UK Notify
 *
 * This module provides test utilities for sending emails via sandbox
 * and retrieving sent email content for validation (AC-8.2).
 *
 * Uses the notifications-node-client SDK with sandbox API key.
 *
 * @see docs/sprint-artifacts/stories/n5-8-govuk-notify-sandbox-integration-test.md
 */

import { NotifyClient } from 'notifications-node-client';
import { getE2ESecrets } from '../../lib/lambda/notification/secrets';

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

interface NotifyNotificationResponse {
  data: {
    id: string;
    reference?: string;
    email_address: string;
    status: string;
    body: string;
    subject: string;
    type: string;
    template: {
      id: string;
      version: number;
      uri: string;
    };
    created_at: string;
    sent_at?: string;
    completed_at?: string;
  };
}

/**
 * Personalisation values for test emails
 */
export interface TestPersonalisation {
  [key: string]: string | number;
}

/**
 * Result from sending a test email
 */
export interface TestEmailResult {
  id: string;
  reference: string;
  body: string;
  subject: string;
}

/**
 * Retrieved notification details
 */
export interface RetrievedNotification {
  id: string;
  body: string;
  subject: string;
  status: string;
  createdAt: string;
  sentAt?: string;
}

/**
 * E2E Test Client for GOV.UK Notify
 *
 * Wraps the Notify SDK for E2E testing purposes.
 * Always uses sandbox API key (AC-8.1).
 */
export class NotifyTestClient {
  private client: NotifyClient;
  private static instance: NotifyTestClient | null = null;

  private constructor(apiKey: string) {
    this.client = new NotifyClient(apiKey);
  }

  /**
   * Get singleton instance with sandbox API key
   * Supports both Secrets Manager and environment variable sources
   */
  static async getInstance(): Promise<NotifyTestClient> {
    if (NotifyTestClient.instance) {
      return NotifyTestClient.instance;
    }

    // Priority 1: Environment variable (for CI)
    if (process.env.NOTIFY_SANDBOX_API_KEY) {
      console.log('[NotifyTestClient] Using API key from environment');
      NotifyTestClient.instance = new NotifyTestClient(
        process.env.NOTIFY_SANDBOX_API_KEY
      );
      return NotifyTestClient.instance;
    }

    // Priority 2: Secrets Manager
    console.log('[NotifyTestClient] Retrieving API key from Secrets Manager');
    const secrets = await getE2ESecrets();
    NotifyTestClient.instance = new NotifyTestClient(secrets.notifySandboxApiKey);
    return NotifyTestClient.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    NotifyTestClient.instance = null;
  }

  /**
   * Send a test email via GOV.UK Notify sandbox (AC-8.2)
   *
   * @param templateId - The GOV.UK Notify template ID
   * @param email - Recipient email address (sandbox accepts any email)
   * @param personalisation - Template personalisation values
   * @param reference - Optional reference for tracking
   * @returns Test email result with ID and content preview
   */
  async sendEmail(
    templateId: string,
    email: string,
    personalisation: TestPersonalisation,
    reference?: string
  ): Promise<TestEmailResult> {
    const ref = reference || `e2e-test-${Date.now()}`;

    console.log(`[NotifyTestClient] Sending email to ${email} with template ${templateId}`);
    console.log(`[NotifyTestClient] Reference: ${ref}`);

    const response = (await this.client.sendEmail(templateId, email, {
      personalisation,
      reference: ref,
    })) as NotifyEmailResponse;

    console.log(`[NotifyTestClient] Email sent successfully, ID: ${response.data.id}`);

    return {
      id: response.data.id,
      reference: ref,
      body: response.data.content.body,
      subject: response.data.content.subject,
    };
  }

  /**
   * Retrieve notification details by ID (AC-8.2)
   *
   * GOV.UK Notify stores sent notifications for retrieval.
   * In sandbox mode, emails are not delivered but content is available.
   *
   * @param notificationId - The notification ID from sendEmail response
   * @returns Retrieved notification with full body and subject
   */
  async getNotification(notificationId: string): Promise<RetrievedNotification> {
    console.log(`[NotifyTestClient] Retrieving notification ${notificationId}`);

    const response = (await this.client.getNotificationById(
      notificationId
    )) as NotifyNotificationResponse;

    console.log(`[NotifyTestClient] Notification retrieved, status: ${response.data.status}`);

    return {
      id: response.data.id,
      body: response.data.body,
      subject: response.data.subject,
      status: response.data.status,
      createdAt: response.data.created_at,
      sentAt: response.data.sent_at,
    };
  }

  /**
   * Wait for notification to be processed
   *
   * Polls getNotification until status changes from 'created' to 'sending' or later.
   * In sandbox mode, notifications quickly move to 'sending' status.
   *
   * @param notificationId - The notification ID to wait for
   * @param timeoutMs - Maximum time to wait (default 30 seconds)
   * @returns Retrieved notification once processed
   */
  async waitForNotification(
    notificationId: string,
    timeoutMs: number = 30000
  ): Promise<RetrievedNotification> {
    const startTime = Date.now();
    const pollIntervalMs = 1000;

    console.log(`[NotifyTestClient] Waiting for notification ${notificationId} to be processed...`);

    while (Date.now() - startTime < timeoutMs) {
      const notification = await this.getNotification(notificationId);

      // Sandbox notifications quickly move to 'sending' status
      // We're mainly interested in having the body content available
      if (notification.body && notification.body.length > 0) {
        console.log(`[NotifyTestClient] Notification ready with body content`);
        return notification;
      }

      console.log(`[NotifyTestClient] Status: ${notification.status}, waiting...`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Timeout waiting for notification ${notificationId} to be processed after ${timeoutMs}ms`
    );
  }
}

/**
 * Placeholder detection pattern (AC-8.7)
 * GOV.UK Notify placeholders use format: ((fieldName))
 */
export const PLACEHOLDER_PATTERN = /\(\([^)]+\)\)/g;

/**
 * Check if HTML body contains unfilled placeholders (AC-8.7)
 *
 * @param body - Email body content (HTML or plain text)
 * @returns Array of unfilled placeholder names, empty if all filled
 */
export function findUnfilledPlaceholders(body: string): string[] {
  const matches = body.match(PLACEHOLDER_PATTERN);
  return matches || [];
}

/**
 * Assert that email body has no unfilled placeholders (AC-8.7)
 *
 * @param body - Email body content
 * @throws Error if unfilled placeholders are found
 */
export function assertNoPlaceholders(body: string): void {
  const unfilled = findUnfilledPlaceholders(body);
  if (unfilled.length > 0) {
    throw new Error(
      `Email body contains unfilled placeholders: ${unfilled.join(', ')}`
    );
  }
}

/**
 * Assert that email body contains expected content (AC-8.3)
 *
 * @param body - Email body content
 * @param expectedValues - Array of values that should appear in body
 * @throws Error if any expected value is missing
 */
export function assertBodyContains(body: string, expectedValues: string[]): void {
  const missing = expectedValues.filter(
    (value) => !body.includes(value.toString())
  );
  if (missing.length > 0) {
    throw new Error(
      `Email body missing expected values: ${missing.join(', ')}`
    );
  }
}
