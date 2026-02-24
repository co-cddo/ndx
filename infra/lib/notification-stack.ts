import * as cdk from "aws-cdk-lib"
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch"
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions"
import * as events from "aws-cdk-lib/aws-events"
import * as targets from "aws-cdk-lib/aws-events-targets"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import * as sns from "aws-cdk-lib/aws-sns"
import * as sqs from "aws-cdk-lib/aws-sqs"
import { Construct } from "constructs"
import * as path from "path"
import { getISBConfig, getISBEventBusArn, ISB_EVENT_TYPES, NOTIFY_TEMPLATE_IDS, CHATBOT_SLACK_CONFIG } from "./config"
import * as chatbot from "aws-cdk-lib/aws-chatbot"

// Configuration constants
const LAMBDA_TIMEOUT_SECONDS = 30
const LAMBDA_MEMORY_MB = 512 // TC-AC-2: Increased from 256MB for notification processing
const DLQ_RETENTION_DAYS = 14
const DLQ_VISIBILITY_TIMEOUT_SECONDS = 300
const SECRETS_PATH = "/ndx/notifications/credentials"
// Note: SLACK_WEBHOOK_SECRET_PATH removed in Story 6.3. Slack notifications now
// handled by AWS Chatbot via EventBridge → SNS (Story 6.1).

// Alarm thresholds (n4-6)
const ALARM_DLQ_RATE_THRESHOLD = 50 // Messages per 5 minutes
const ALARM_LAMBDA_ERRORS_THRESHOLD = 5 // Errors per 5 minutes
const ALARM_ERROR_RATE_THRESHOLD = 10 // Percentage
const ALARM_SECRET_AGE_DAYS = 335 // 30 days before 1-year rotation

// Deliverability thresholds (n5-4)
const ALARM_COMPLAINT_RATE_THRESHOLD = 0.1 // Percentage (AC-4.21)
const ALARM_BOUNCE_RATE_THRESHOLD = 1 // Percentage (AC-4.22)
const ALARM_UNSUBSCRIBE_RATE_THRESHOLD = 5 // Percentage per month (AC-4.24)

// Runbook URLs for ops remediation (AC-6.14)
const RUNBOOK_BASE_URL = "https://github.com/cddo/ndx/wiki/runbooks"
const RUNBOOK_URLS = {
  dlqDepth: `${RUNBOOK_BASE_URL}/dlq-depth-alarm`,
  dlqRate: `${RUNBOOK_BASE_URL}/dlq-rate-alarm`,
  dlqStale: `${RUNBOOK_BASE_URL}/dlq-stale-alarm`,
  lambdaErrors: `${RUNBOOK_BASE_URL}/lambda-errors-alarm`,
  errorRate: `${RUNBOOK_BASE_URL}/error-rate-alarm`,
  canary: `${RUNBOOK_BASE_URL}/canary-alarm`,
  authFailure: `${RUNBOOK_BASE_URL}/auth-failure-alarm`,
  secretsExpiry: `${RUNBOOK_BASE_URL}/secrets-expiry-alarm`,
  // Deliverability runbooks (n5-4)
  complaintRate: `${RUNBOOK_BASE_URL}/complaint-rate-alarm`,
  bounceRate: `${RUNBOOK_BASE_URL}/bounce-rate-alarm`,
  unsubscribeRate: `${RUNBOOK_BASE_URL}/unsubscribe-rate-alarm`,
}

/**
 * NDX Notification Stack - Infrastructure for notification system
 *
 * This stack provisions the notification infrastructure for NDX:
 * - Lambda function for processing EventBridge events from Innovation Sandbox (ISB)
 * - GOV.UK Notify integration for user emails
 * - AWS Chatbot integration for Slack ops alerts (Story 6.1)
 *
 * Architecture:
 * - Lambda processes events and routes to GOV.UK Notify for user emails
 * - AWS Chatbot (EventBridge → SNS → Chatbot → Slack) handles ops alerts
 *
 * Note: Direct Slack webhook integration removed in Story 6.3. All Slack
 * notifications now flow through AWS Chatbot for improved reliability.
 *
 * This stack is separate from NdxStaticStack for:
 * - Independent lifecycle management
 * - Isolated blast radius
 * - Different deployment cadence
 *
 * @see docs/notification-architecture.md for complete architecture documentation
 * @see docs/sprint-artifacts/tech-spec-epic-n4.md for technical specification
 */
export class NdxNotificationStack extends cdk.Stack {
  /** The notification handler Lambda function */
  public readonly notificationHandler: lambdaNodejs.NodejsFunction

  /** The Dead Letter Queue for failed notification events */
  public readonly deadLetterQueue: sqs.Queue

  /** SNS topic for alarm notifications (n4-6) */
  public readonly alarmTopic: sns.Topic

  /** Story 6.1: SNS topic for EventBridge events to Chatbot */
  public readonly eventsTopic: sns.Topic

  /** Story 6.1: AWS Chatbot Slack channel configuration */
  public readonly slackChannel: chatbot.SlackChannelConfiguration

  /** CloudWatch dashboard for unified health visibility (n4-6) */
  public readonly dashboard: cloudwatch.Dashboard

  /** DLQ Digest Lambda for daily summaries (n6-7) */
  public readonly dlqDigestHandler: lambdaNodejs.NodejsFunction

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Read environment context for multi-environment support
    const env = (this.node.tryGetContext("env") as string | undefined) || "prod"

    // Get ISB configuration for the current environment (moved earlier for use in Lambda env)
    const isbConfig = getISBConfig(env)
    const isbEventBusArn = getISBEventBusArn(isbConfig)

    // =========================================================================
    // Dead Letter Queue (n4-4)
    // =========================================================================
    // Captures failed notification events for investigation and replay.
    // 14-day retention gives ops team ample time to investigate issues.
    // @see docs/notification-architecture.md#Error-Handling

    this.deadLetterQueue = new sqs.Queue(this, "NotificationDLQ", {
      queueName: "ndx-notification-dlq",
      retentionPeriod: cdk.Duration.days(DLQ_RETENTION_DAYS),
      // SQS_MANAGED encryption is sufficient for notification events
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      // Visibility timeout allows time for manual replay processing
      visibilityTimeout: cdk.Duration.seconds(DLQ_VISIBILITY_TIMEOUT_SECONDS),
    })

    // Tag the DLQ for governance
    cdk.Tags.of(this.deadLetterQueue).add("project", "ndx")
    cdk.Tags.of(this.deadLetterQueue).add("environment", env)
    cdk.Tags.of(this.deadLetterQueue).add("managedby", "cdk")
    cdk.Tags.of(this.deadLetterQueue).add("component", "notifications")

    // Lambda function for notification processing
    // Uses NodejsFunction for automatic TypeScript bundling with esbuild
    this.notificationHandler = new lambdaNodejs.NodejsFunction(this, "NotificationHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/notification/handler.ts"),
      timeout: cdk.Duration.seconds(LAMBDA_TIMEOUT_SECONDS),
      memorySize: LAMBDA_MEMORY_MB,
      description: "NDX Notification Handler - processes ISB events and sends notifications",
      functionName: "ndx-notification-handler",
      // Reserved concurrency = 10 for blast radius limiting (AC-3.6)
      // Calculation from Devil's Advocate: Notify rate limit (3000/min) ÷ Lambda duration (500ms) × safety factor (0.4) = 10
      reservedConcurrentExecutions: 10,
      // AC-1.30: 90-day log retention for compliance audit trail
      logRetention: logs.RetentionDays.THREE_MONTHS,
      // SM-AC-8: Enable X-Ray tracing for distributed tracing
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        // External modules that should not be bundled
        externalModules: [],
      },
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        ENVIRONMENT: env,
        LOG_LEVEL: env === "prod" ? "INFO" : "DEBUG",
        // Secrets Manager path for API credentials (n4-5)
        SECRETS_PATH: SECRETS_PATH,
        // GOV.UK Notify template IDs (n5-4, n5-5)
        NOTIFY_TEMPLATE_LEASE_REQUESTED: NOTIFY_TEMPLATE_IDS.LEASE_REQUESTED,
        NOTIFY_TEMPLATE_LEASE_APPROVED: NOTIFY_TEMPLATE_IDS.LEASE_APPROVED,
        NOTIFY_TEMPLATE_LEASE_DENIED: NOTIFY_TEMPLATE_IDS.LEASE_DENIED,
        NOTIFY_TEMPLATE_LEASE_TERMINATED: NOTIFY_TEMPLATE_IDS.LEASE_TERMINATED,
        NOTIFY_TEMPLATE_BUDGET_THRESHOLD: NOTIFY_TEMPLATE_IDS.BUDGET_THRESHOLD,
        NOTIFY_TEMPLATE_DURATION_THRESHOLD: NOTIFY_TEMPLATE_IDS.DURATION_THRESHOLD,
        NOTIFY_TEMPLATE_FREEZING_THRESHOLD: NOTIFY_TEMPLATE_IDS.FREEZING_THRESHOLD,
        NOTIFY_TEMPLATE_BUDGET_EXCEEDED: NOTIFY_TEMPLATE_IDS.BUDGET_EXCEEDED,
        NOTIFY_TEMPLATE_LEASE_EXPIRED: NOTIFY_TEMPLATE_IDS.LEASE_EXPIRED,
        NOTIFY_TEMPLATE_LEASE_FROZEN: NOTIFY_TEMPLATE_IDS.LEASE_FROZEN,
        // Billing events
        NOTIFY_TEMPLATE_LEASE_COSTS_GENERATED: NOTIFY_TEMPLATE_IDS.LEASE_COSTS_GENERATED,
        // ISB API Gateway configuration for authenticated HTTP calls
        ...(isbConfig.apiBaseUrl && { ISB_API_BASE_URL: isbConfig.apiBaseUrl }),
        ...(isbConfig.jwtSecretPath && { ISB_JWT_SECRET_PATH: isbConfig.jwtSecretPath }),
        // Note: EVENTS_TOPIC_ARN is added after topic creation (see below)
        // Temporary: Skip template validation until GOV.UK Notify templates are fixed
        // LeaseTerminated and LeaseBudgetExceeded templates need finalCost/finalSpend fields
        SKIP_TEMPLATE_VALIDATION: "true",
      },
    })

    // =========================================================================
    // Secrets Manager IAM Permissions (n4-5)
    // =========================================================================
    // Grant Lambda permission to retrieve notification credentials (GOV.UK Notify).
    // Restricted to specific secret paths for least privilege.
    // Note: Slack webhook secret access removed in Story 6.3.
    // @see docs/notification-architecture.md#Secrets-Handling

    this.notificationHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["secretsmanager:GetSecretValue"],
        // Restrict to specific secret ARN patterns for security
        resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${SECRETS_PATH}*`],
      }),
    )

    // =========================================================================
    // ISB JWT Secret Permissions
    // =========================================================================
    // Grant permission to read the ISB JWT signing secret from Secrets Manager.
    // Used to sign HS256 JWTs for API Gateway authentication.

    if (isbConfig.jwtSecretPath) {
      this.notificationHandler.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["secretsmanager:GetSecretValue"],
          resources: [
            `arn:aws:secretsmanager:${isbConfig.region}:${isbConfig.accountId}:secret:${isbConfig.jwtSecretPath}*`,
          ],
        }),
      )
    }

    if (isbConfig.jwtSecretKmsKeyArn) {
      this.notificationHandler.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["kms:Decrypt"],
          resources: [isbConfig.jwtSecretKmsKeyArn],
        }),
      )
    }

    // =========================================================================
    // EventBridge Subscription to ISB Event Bus
    // =========================================================================
    // Subscribe to Innovation Sandbox events for notification processing.
    // Security: Account-level filtering prevents cross-account event injection.
    // @see docs/notification-architecture.md#ISB-Integration

    // Note: DynamoDB permissions removed - all data now fetched via ISB HTTP APIs
    // (leases, accounts, templates) for better separation of concerns.

    // Reference the ISB EventBridge bus (cross-account)
    // Note: ISB team must add resource policy allowing NDX account to subscribe
    const isbEventBus = events.EventBus.fromEventBusArn(this, "ISBEventBus", isbEventBusArn)

    // EventBridge rule to filter and route ISB events to notification Lambda
    // Rule name: ndx-notification-rule (per AC-2.6)
    const notificationRule = new events.Rule(this, "NotificationRule", {
      ruleName: "ndx-notification-rule",
      description: "Routes ISB notification events to NDX notification handler",
      eventBus: isbEventBus,
      eventPattern: {
        // Account filter: Security control to prevent cross-account event injection
        // This is a Red Team requirement - account field is immutable at EventBridge level
        // Note: Source filtering not used - account-level filtering is sufficient security
        account: [isbConfig.accountId],
        // Detail-type filter: Subscribe to all 13 notification-relevant event types
        detailType: [...ISB_EVENT_TYPES],
      },
      targets: [
        new targets.LambdaFunction(this.notificationHandler, {
          // DLQ configuration (AC-4.1, AC-4.5)
          // Events that fail after retries are sent to the DLQ for investigation
          deadLetterQueue: this.deadLetterQueue,
          // Retry configuration: 2 retries before DLQ (AC-4.5)
          retryAttempts: 2,
          // Maximum age for retry: 1 hour (reasonable for notification events)
          maxEventAge: cdk.Duration.hours(1),
        }),
      ],
    })

    // Tag the EventBridge rule for governance
    cdk.Tags.of(notificationRule).add("project", "ndx")
    cdk.Tags.of(notificationRule).add("environment", env)
    cdk.Tags.of(notificationRule).add("managedby", "cdk")
    cdk.Tags.of(notificationRule).add("component", "notifications")

    // Governance: Resource tags for organization and cost tracking
    // All tags lowercase per architecture standards
    cdk.Tags.of(this.notificationHandler).add("project", "ndx")
    cdk.Tags.of(this.notificationHandler).add("environment", env)
    cdk.Tags.of(this.notificationHandler).add("managedby", "cdk")
    cdk.Tags.of(this.notificationHandler).add("component", "notifications")

    // Stack-level tags
    cdk.Tags.of(this).add("project", "ndx")
    cdk.Tags.of(this).add("environment", env)
    cdk.Tags.of(this).add("managedby", "cdk")

    // =========================================================================
    // Story 6.1: AWS Chatbot Integration for ISB Events
    // =========================================================================
    // Routes all 18 ISB EventBridge events to Slack via AWS Chatbot.
    // This provides real-time visibility without Lambda processing.
    // Architecture: EventBridge → SNS → AWS Chatbot → Slack
    // @see _bmad-output/planning-artifacts/prd-ndx-try-enhancements.md#Operations-Notifications

    // SNS Topic for EventBridge events (AC-1)
    // All 18 ISB events route through this topic to AWS Chatbot
    this.eventsTopic = new sns.Topic(this, "EventsTopic", {
      topicName: "ndx-try-alerts",
      displayName: "NDX:Try EventBridge Events",
    })

    cdk.Tags.of(this.eventsTopic).add("project", "ndx")
    cdk.Tags.of(this.eventsTopic).add("environment", env)
    cdk.Tags.of(this.eventsTopic).add("managedby", "cdk")
    cdk.Tags.of(this.eventsTopic).add("component", "notifications")

    // Grant Lambda permission to publish to events topic (for enriched Slack messages)
    this.eventsTopic.grantPublish(this.notificationHandler)

    // Update Lambda environment with events topic ARN
    this.notificationHandler.addEnvironment("EVENTS_TOPIC_ARN", this.eventsTopic.topicArn)

    // Ops-only events that don't need enrichment - sent directly to SNS
    // Lease events are handled by Lambda which publishes enriched messages
    const opsOnlyEvents = [
      "AccountQuarantined",
      "AccountCleanupFailed",
      "AccountCleanupSucceeded", // ISB uses "Succeeded" not "Successful"
      "AccountDriftDetected",
      "CleanAccountRequest",
      "GroupCostReportGenerated",
      "GroupUtilizationReportGenerated",
    ]

    // EventBridge rule for ops-only events - sent directly to Chatbot (no enrichment needed)
    const chatbotRule = new events.Rule(this, "ChatbotRule", {
      ruleName: "ndx-chatbot-rule",
      description: "Routes ops-only ISB events to SNS for AWS Chatbot (lease events sent by Lambda)",
      eventBus: isbEventBus,
      eventPattern: {
        account: [isbConfig.accountId],
        detailType: opsOnlyEvents,
      },
    })

    // Add SNS target for ops events (simple format, no enrichment needed)
    const snsTarget = new targets.SnsTopic(this.eventsTopic, {
      deadLetterQueue: this.deadLetterQueue,
      retryAttempts: 2,
      maxEventAge: cdk.Duration.hours(1),
    })
    chatbotRule.addTarget(snsTarget)

    // Simple input transformer for ops events (no user/template fields)
    // Note: Uses detail.accountId (sandbox account) not $.account (ISB source account)
    const cfnRule = chatbotRule.node.defaultChild as events.CfnRule
    const inputTemplate = [
      "{",
      '"version":"1.0",',
      '"source":"custom",',
      '"content":{',
      '"textType":"client-markdown",',
      '"title":"<detailType>",',
      '"description":"*Account:* <sandboxAccount>"',
      "},",
      '"metadata":{',
      '"eventType":"<detailType>"',
      "}}",
    ].join("")

    cfnRule.addPropertyOverride("Targets.0.InputTransformer", {
      InputPathsMap: {
        detailType: "$.detail-type",
        sandboxAccount: "$.detail.accountId",
      },
      InputTemplate: inputTemplate,
    })

    cdk.Tags.of(chatbotRule).add("project", "ndx")
    cdk.Tags.of(chatbotRule).add("environment", env)
    cdk.Tags.of(chatbotRule).add("managedby", "cdk")
    cdk.Tags.of(chatbotRule).add("component", "notifications")

    // AWS Chatbot Slack channel configuration (AC-2)
    // Note: AWS Chatbot workspace authorization is a one-time manual setup via AWS Console
    this.slackChannel = new chatbot.SlackChannelConfiguration(this, "SlackChannel", {
      slackChannelConfigurationName: CHATBOT_SLACK_CONFIG.configurationName,
      slackWorkspaceId: CHATBOT_SLACK_CONFIG.workspaceId,
      slackChannelId: CHATBOT_SLACK_CONFIG.channelId,
      // Subscribe to the events topic
      notificationTopics: [this.eventsTopic],
      // Configure logging level for observability (AC-5)
      loggingLevel: chatbot.LoggingLevel.INFO,
    })

    cdk.Tags.of(this.slackChannel).add("project", "ndx")
    cdk.Tags.of(this.slackChannel).add("environment", env)
    cdk.Tags.of(this.slackChannel).add("managedby", "cdk")
    cdk.Tags.of(this.slackChannel).add("component", "notifications")

    // =========================================================================
    // CloudWatch Monitoring and Alarms (n4-6)
    // =========================================================================
    // Comprehensive monitoring for notification system health.
    // All alarms publish to SNS for AWS Chatbot integration.
    // @see docs/notification-architecture.md#Monitoring

    // SNS Topic for alarm notifications (AC-6.9)
    // AWS Chatbot subscribes to this topic for Slack delivery
    this.alarmTopic = new sns.Topic(this, "NotificationAlarmTopic", {
      topicName: "ndx-notification-alarms",
      displayName: "NDX Notification System Alarms",
    })

    cdk.Tags.of(this.alarmTopic).add("project", "ndx")
    cdk.Tags.of(this.alarmTopic).add("environment", env)
    cdk.Tags.of(this.alarmTopic).add("managedby", "cdk")
    cdk.Tags.of(this.alarmTopic).add("component", "notifications")

    // Create SNS action for all alarms
    const alarmAction = new cloudwatchActions.SnsAction(this.alarmTopic)

    // -------------------------------------------------------------------------
    // Alarm 1: DLQ Depth > 0 (AC-6.1)
    // -------------------------------------------------------------------------
    // Detects current failures - any message in DLQ needs investigation
    const dlqDepthAlarm = new cloudwatch.Alarm(this, "DLQDepthAlarm", {
      alarmName: "ndx-notification-dlq-depth",
      alarmDescription: `DLQ has messages requiring investigation. Runbook: ${RUNBOOK_URLS.dlqDepth}`,
      metric: this.deadLetterQueue.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(5),
        statistic: "Maximum",
      }),
      threshold: 0,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    dlqDepthAlarm.addAlarmAction(alarmAction)

    // -------------------------------------------------------------------------
    // Alarm 2: Lambda Errors > 5/5min (AC-6.2)
    // -------------------------------------------------------------------------
    // Detects code bugs or transient issues
    const lambdaErrorsAlarm = new cloudwatch.Alarm(this, "LambdaErrorsAlarm", {
      alarmName: "ndx-notification-errors",
      alarmDescription: `Lambda errors exceeded threshold. Runbook: ${RUNBOOK_URLS.lambdaErrors}`,
      metric: this.notificationHandler.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: ALARM_LAMBDA_ERRORS_THRESHOLD,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    lambdaErrorsAlarm.addAlarmAction(alarmAction)

    // -------------------------------------------------------------------------
    // Alarm 3: Zero Invocations 24h - Canary (AC-6.3)
    // -------------------------------------------------------------------------
    // Detects "silent death" - Lambda not receiving events from ISB
    // Pre-mortem: This catches scenario where EventBridge subscription fails silently
    const canaryAlarm = new cloudwatch.Alarm(this, "CanaryAlarm", {
      alarmName: "ndx-notification-canary",
      alarmDescription: `No Lambda invocations in 24 hours - possible silent death. Runbook: ${RUNBOOK_URLS.canary}`,
      metric: this.notificationHandler.metricInvocations({
        period: cdk.Duration.hours(24),
        statistic: "Sum",
      }),
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    })
    canaryAlarm.addAlarmAction(alarmAction)

    // -------------------------------------------------------------------------
    // Alarm 4: DLQ Rate > 50/5min (AC-6.4)
    // -------------------------------------------------------------------------
    // Detects flooding attacks or bulk failure scenarios (Red Team)
    const dlqRateAlarm = new cloudwatch.Alarm(this, "DLQRateAlarm", {
      alarmName: "ndx-notification-dlq-rate",
      alarmDescription: `DLQ rate exceeds threshold - possible flooding. Runbook: ${RUNBOOK_URLS.dlqRate}`,
      metric: this.deadLetterQueue.metricNumberOfMessagesSent({
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: ALARM_DLQ_RATE_THRESHOLD,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    dlqRateAlarm.addAlarmAction(alarmAction)

    // -------------------------------------------------------------------------
    // Alarm 5: Auth Failures - CRITICAL (AC-6.5)
    // -------------------------------------------------------------------------
    // Pre-mortem: Auth failures (401/403) indicate credential issues
    // Separate from code bugs - requires different response (check secrets)
    // Uses custom metric published by Lambda handler
    const authFailureAlarm = new cloudwatch.Alarm(this, "AuthFailureAlarm", {
      alarmName: "ndx-notification-auth-failure",
      alarmDescription: `CRITICAL: Authentication failure detected - check secrets. Runbook: ${RUNBOOK_URLS.authFailure}`,
      metric: new cloudwatch.Metric({
        namespace: "NDX/Notifications",
        metricName: "AuthFailure",
        period: cdk.Duration.minutes(1),
        statistic: "Sum",
      }),
      threshold: 0,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    authFailureAlarm.addAlarmAction(alarmAction)

    // -------------------------------------------------------------------------
    // Alarm 6: Error Rate > 10% (AC-6.6)
    // -------------------------------------------------------------------------
    // Risk Matrix: Detects slow ramp of errors (percentage-based)
    const errorRateAlarm = new cloudwatch.Alarm(this, "ErrorRateAlarm", {
      alarmName: "ndx-notification-error-rate",
      alarmDescription: `Error rate exceeds ${ALARM_ERROR_RATE_THRESHOLD}%. Runbook: ${RUNBOOK_URLS.errorRate}`,
      metric: new cloudwatch.MathExpression({
        expression: "(errors / invocations) * 100",
        usingMetrics: {
          errors: this.notificationHandler.metricErrors({
            period: cdk.Duration.minutes(5),
            statistic: "Sum",
          }),
          invocations: this.notificationHandler.metricInvocations({
            period: cdk.Duration.minutes(5),
            statistic: "Sum",
          }),
        },
        period: cdk.Duration.minutes(5),
      }),
      threshold: ALARM_ERROR_RATE_THRESHOLD,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    errorRateAlarm.addAlarmAction(alarmAction)

    // -------------------------------------------------------------------------
    // Alarm 7: DLQ Stale > 24h (AC-6.7)
    // -------------------------------------------------------------------------
    // Risk Matrix: Messages stuck in DLQ without processing
    const dlqStaleAlarm = new cloudwatch.Alarm(this, "DLQStaleAlarm", {
      alarmName: "ndx-notification-dlq-stale",
      alarmDescription: `DLQ has unprocessed messages for 24+ hours. Runbook: ${RUNBOOK_URLS.dlqStale}`,
      metric: this.deadLetterQueue.metricApproximateAgeOfOldestMessage({
        period: cdk.Duration.hours(1),
        statistic: "Maximum",
      }),
      // 24 hours in seconds
      threshold: 86400,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    dlqStaleAlarm.addAlarmAction(alarmAction)

    // -------------------------------------------------------------------------
    // Alarm 8: Secret Age > 335 days (AC-6.8)
    // -------------------------------------------------------------------------
    // Risk Matrix: Proactive warning 30 days before 1-year rotation
    // Note: This uses Secrets Manager metrics published by AWS
    const secretsExpiryAlarm = new cloudwatch.Alarm(this, "SecretsExpiryAlarm", {
      alarmName: "ndx-notification-secrets-expiry",
      alarmDescription: `Secrets approaching expiry (${ALARM_SECRET_AGE_DAYS}+ days old). Runbook: ${RUNBOOK_URLS.secretsExpiry}`,
      metric: new cloudwatch.Metric({
        namespace: "NDX/Notifications",
        metricName: "SecretAgeDays",
        period: cdk.Duration.hours(24),
        statistic: "Maximum",
      }),
      threshold: ALARM_SECRET_AGE_DAYS,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    secretsExpiryAlarm.addAlarmAction(alarmAction)

    // =========================================================================
    // Email Deliverability Alarms (n5-4)
    // =========================================================================
    // Monitor GOV.UK Notify email delivery metrics for compliance
    // @see docs/sprint-artifacts/stories/n5-4-lease-lifecycle-email-templates.md

    // -------------------------------------------------------------------------
    // Alarm 9: Complaint Rate > 0.1% (AC-4.21)
    // -------------------------------------------------------------------------
    // High complaint rates trigger ISP penalties - contact Notify support if exceeded
    const complaintRateAlarm = new cloudwatch.Alarm(this, "ComplaintRateAlarm", {
      alarmName: "ndx-notification-complaint-rate",
      alarmDescription: `Email complaint rate > ${ALARM_COMPLAINT_RATE_THRESHOLD}% - contact GOV.UK Notify support. Runbook: ${RUNBOOK_URLS.complaintRate}`,
      metric: new cloudwatch.MathExpression({
        expression: "(complaints / sent) * 100",
        usingMetrics: {
          complaints: new cloudwatch.Metric({
            namespace: "NDX/Notifications",
            metricName: "EmailComplaints",
            period: cdk.Duration.hours(24),
            statistic: "Sum",
          }),
          sent: new cloudwatch.Metric({
            namespace: "NDX/Notifications",
            metricName: "EmailsSent",
            period: cdk.Duration.hours(24),
            statistic: "Sum",
          }),
        },
        period: cdk.Duration.hours(24),
      }),
      threshold: ALARM_COMPLAINT_RATE_THRESHOLD,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    complaintRateAlarm.addAlarmAction(alarmAction)

    // -------------------------------------------------------------------------
    // Alarm 10: Bounce Rate > 1% (AC-4.22)
    // -------------------------------------------------------------------------
    // High bounce rates indicate invalid email addresses - investigate list hygiene
    const bounceRateAlarm = new cloudwatch.Alarm(this, "BounceRateAlarm", {
      alarmName: "ndx-notification-bounce-rate",
      alarmDescription: `Email bounce rate > ${ALARM_BOUNCE_RATE_THRESHOLD}% - investigate invalid email lists. Runbook: ${RUNBOOK_URLS.bounceRate}`,
      metric: new cloudwatch.MathExpression({
        expression: "(bounces / sent) * 100",
        usingMetrics: {
          bounces: new cloudwatch.Metric({
            namespace: "NDX/Notifications",
            metricName: "EmailBounces",
            period: cdk.Duration.hours(24),
            statistic: "Sum",
          }),
          sent: new cloudwatch.Metric({
            namespace: "NDX/Notifications",
            metricName: "EmailsSent",
            period: cdk.Duration.hours(24),
            statistic: "Sum",
          }),
        },
        period: cdk.Duration.hours(24),
      }),
      threshold: ALARM_BOUNCE_RATE_THRESHOLD,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    bounceRateAlarm.addAlarmAction(alarmAction)

    // -------------------------------------------------------------------------
    // Alarm 11: Unsubscribe Rate > 5% (AC-4.24)
    // -------------------------------------------------------------------------
    // High opt-out rates may indicate email content issues - review email templates
    // Note: CloudWatch limits evaluation to max 7 days for periods >= 1 hour
    // We use 7-day rolling window as proxy for monthly trends
    const unsubscribeRateAlarm = new cloudwatch.Alarm(this, "UnsubscribeRateAlarm", {
      alarmName: "ndx-notification-unsubscribe-rate",
      alarmDescription: `Email unsubscribe rate > ${ALARM_UNSUBSCRIBE_RATE_THRESHOLD}% (7-day rolling) - review email templates. Runbook: ${RUNBOOK_URLS.unsubscribeRate}`,
      metric: new cloudwatch.MathExpression({
        expression: "(unsubscribes / sent) * 100",
        usingMetrics: {
          unsubscribes: new cloudwatch.Metric({
            namespace: "NDX/Notifications",
            metricName: "EmailUnsubscribes",
            period: cdk.Duration.days(7),
            statistic: "Sum",
          }),
          sent: new cloudwatch.Metric({
            namespace: "NDX/Notifications",
            metricName: "EmailsSent",
            period: cdk.Duration.days(7),
            statistic: "Sum",
          }),
        },
        period: cdk.Duration.days(7),
      }),
      threshold: ALARM_UNSUBSCRIBE_RATE_THRESHOLD,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    })
    unsubscribeRateAlarm.addAlarmAction(alarmAction)

    // Note: SlackFailureAlarm removed in Story 6.3. Slack webhook code removed;
    // AWS Chatbot now handles Slack notifications via EventBridge → SNS (Story 6.1).
    // Chatbot has its own monitoring via CloudWatch Logs and SNS delivery metrics.

    // Tag all alarms for governance
    ;[
      dlqDepthAlarm,
      lambdaErrorsAlarm,
      canaryAlarm,
      dlqRateAlarm,
      authFailureAlarm,
      errorRateAlarm,
      dlqStaleAlarm,
      secretsExpiryAlarm,
      complaintRateAlarm,
      bounceRateAlarm,
      unsubscribeRateAlarm,
    ].forEach((alarm) => {
      cdk.Tags.of(alarm).add("project", "ndx")
      cdk.Tags.of(alarm).add("environment", env)
      cdk.Tags.of(alarm).add("managedby", "cdk")
      cdk.Tags.of(alarm).add("component", "notifications")
    })

    // =========================================================================
    // CloudWatch Dashboard (AC-6.13)
    // =========================================================================
    // Unified health visibility per Service Blueprint/Value Chain analysis
    this.dashboard = new cloudwatch.Dashboard(this, "NotificationDashboard", {
      dashboardName: "ndx-notification-health",
    })

    // Widget 1: Events per hour (EventsReceivedFromISB metric)
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Events Received (per hour)",
        left: [
          this.notificationHandler.metricInvocations({
            period: cdk.Duration.hours(1),
            statistic: "Sum",
            label: "Lambda Invocations",
          }),
        ],
        width: 12,
        height: 6,
      }),
      // Widget 2: Success Rate
      new cloudwatch.GraphWidget({
        title: "Notification Success Rate",
        left: [
          new cloudwatch.Metric({
            namespace: "NDX/Notifications",
            metricName: "NotificationSuccess",
            period: cdk.Duration.minutes(5),
            statistic: "Sum",
            label: "Success",
          }),
          new cloudwatch.Metric({
            namespace: "NDX/Notifications",
            metricName: "NotificationFailure",
            period: cdk.Duration.minutes(5),
            statistic: "Sum",
            label: "Failure",
          }),
        ],
        width: 12,
        height: 6,
      }),
    )

    // Widget 3: DLQ Depth
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "DLQ Depth",
        left: [
          this.deadLetterQueue.metricApproximateNumberOfMessagesVisible({
            period: cdk.Duration.minutes(5),
            statistic: "Maximum",
            label: "Messages in DLQ",
          }),
        ],
        width: 12,
        height: 6,
      }),
      // Widget 4: Lambda Performance
      new cloudwatch.GraphWidget({
        title: "Lambda Performance",
        left: [
          this.notificationHandler.metricDuration({
            period: cdk.Duration.minutes(5),
            statistic: "Average",
            label: "Avg Duration (ms)",
          }),
          this.notificationHandler.metricErrors({
            period: cdk.Duration.minutes(5),
            statistic: "Sum",
            label: "Errors",
          }),
        ],
        width: 12,
        height: 6,
      }),
    )

    cdk.Tags.of(this.dashboard).add("project", "ndx")
    cdk.Tags.of(this.dashboard).add("environment", env)
    cdk.Tags.of(this.dashboard).add("managedby", "cdk")
    cdk.Tags.of(this.dashboard).add("component", "notifications")

    // =========================================================================
    // DLQ Digest Lambda (n6-7)
    // =========================================================================
    // Scheduled Lambda that runs daily at 9am UTC to summarize DLQ contents
    // and send a digest to Slack for ops visibility.
    // @see docs/sprint-artifacts/stories/n6-7-daily-dlq-summary-slack-digest.md

    this.dlqDigestHandler = new lambdaNodejs.NodejsFunction(this, "DLQDigestHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/notification/dlq-digest-handler.ts"),
      timeout: cdk.Duration.seconds(60), // Allow time for SQS reads and Slack POST
      memorySize: 256, // Minimal memory for read-only operation
      description: "NDX DLQ Digest - Daily summary of failed notification events",
      functionName: "ndx-dlq-digest",
      logRetention: logs.RetentionDays.THREE_MONTHS,
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
        externalModules: [],
      },
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        ENVIRONMENT: env,
        LOG_LEVEL: env === "prod" ? "INFO" : "DEBUG",
        DLQ_URL: this.deadLetterQueue.queueUrl,
        SECRETS_PATH: SECRETS_PATH,
      },
    })

    // Grant DLQ Digest Lambda permissions to read from DLQ (peek without consuming)
    this.deadLetterQueue.grantConsumeMessages(this.dlqDigestHandler)

    // Grant Secrets Manager access for GOV.UK Notify credentials
    // Note: Slack webhook secret removed in Story 6.3.
    this.dlqDigestHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["secretsmanager:GetSecretValue"],
        resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${SECRETS_PATH}*`],
      }),
    )

    // Tag DLQ Digest Lambda
    cdk.Tags.of(this.dlqDigestHandler).add("project", "ndx")
    cdk.Tags.of(this.dlqDigestHandler).add("environment", env)
    cdk.Tags.of(this.dlqDigestHandler).add("managedby", "cdk")
    cdk.Tags.of(this.dlqDigestHandler).add("component", "notifications")

    // CloudWatch Events rule to run daily at 9am UTC
    const dlqDigestSchedule = new events.Rule(this, "DLQDigestSchedule", {
      ruleName: "ndx-dlq-digest-schedule",
      description: "Triggers DLQ digest Lambda daily at 9am UTC",
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "9",
        day: "*",
        month: "*",
        year: "*",
      }),
      targets: [new targets.LambdaFunction(this.dlqDigestHandler)],
    })

    cdk.Tags.of(dlqDigestSchedule).add("project", "ndx")
    cdk.Tags.of(dlqDigestSchedule).add("environment", env)
    cdk.Tags.of(dlqDigestSchedule).add("managedby", "cdk")
    cdk.Tags.of(dlqDigestSchedule).add("component", "notifications")

    // Outputs for reference
    new cdk.CfnOutput(this, "NotificationHandlerArn", {
      value: this.notificationHandler.functionArn,
      description: "ARN of the notification handler Lambda function",
    })

    new cdk.CfnOutput(this, "NotificationHandlerName", {
      value: this.notificationHandler.functionName,
      description: "Name of the notification handler Lambda function",
    })

    new cdk.CfnOutput(this, "NotificationRuleArn", {
      value: notificationRule.ruleArn,
      description: "ARN of the EventBridge rule for ISB event subscription",
    })

    new cdk.CfnOutput(this, "ISBEventBusArn", {
      value: isbEventBusArn,
      description: "ARN of the ISB EventBridge bus being subscribed to",
    })

    // DLQ outputs (n4-4)
    new cdk.CfnOutput(this, "NotificationDLQArn", {
      value: this.deadLetterQueue.queueArn,
      description: "ARN of the Dead Letter Queue for failed notification events",
    })

    new cdk.CfnOutput(this, "NotificationDLQUrl", {
      value: this.deadLetterQueue.queueUrl,
      description: "URL of the Dead Letter Queue for failed notification events",
    })

    // Alarm outputs (n4-6)
    new cdk.CfnOutput(this, "AlarmTopicArn", {
      value: this.alarmTopic.topicArn,
      description: "ARN of the SNS topic for alarm notifications",
    })

    new cdk.CfnOutput(this, "DashboardUrl", {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: "URL of the CloudWatch dashboard for notification health",
    })

    // DLQ Digest outputs (n6-7)
    new cdk.CfnOutput(this, "DLQDigestHandlerArn", {
      value: this.dlqDigestHandler.functionArn,
      description: "ARN of the DLQ digest Lambda function",
    })

    new cdk.CfnOutput(this, "DLQDigestHandlerName", {
      value: this.dlqDigestHandler.functionName,
      description: "Name of the DLQ digest Lambda function",
    })

    // Story 6.1: AWS Chatbot outputs
    new cdk.CfnOutput(this, "EventsTopicArn", {
      value: this.eventsTopic.topicArn,
      description: "ARN of the SNS topic for EventBridge events (Chatbot integration)",
    })

    new cdk.CfnOutput(this, "ChatbotRuleArn", {
      value: chatbotRule.ruleArn,
      description: "ARN of the EventBridge rule for Chatbot (all 18 event types)",
    })

    new cdk.CfnOutput(this, "SlackChannelConfigurationArn", {
      value: this.slackChannel.slackChannelConfigurationArn,
      description: "ARN of the AWS Chatbot Slack channel configuration",
    })
  }
}
