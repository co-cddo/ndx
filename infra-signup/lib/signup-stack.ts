/**
 * NDX Signup Infrastructure Stack
 *
 * Defines the Lambda function and CloudFront behaviour for the signup API.
 *
 * Story 1.1: Placeholder stack definition
 * Story 1.2: Lambda function with health endpoint, IAM permissions
 *
 * @module infra-signup/lib/signup-stack
 */

import * as cdk from "aws-cdk-lib"
import * as chatbot from "aws-cdk-lib/aws-chatbot"
import * as events from "aws-cdk-lib/aws-events"
import * as targets from "aws-cdk-lib/aws-events-targets"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import * as sns from "aws-cdk-lib/aws-sns"
import type { Construct } from "constructs"
import * as path from "path"

// Configuration constants
const LAMBDA_TIMEOUT_SECONDS = 30
const LAMBDA_MEMORY_MB = 256

/**
 * Stack properties for SignupStack
 */
export interface SignupStackProps extends cdk.StackProps {
  /**
   * IAM Identity Store ID (e.g., "d-xxxxxxxxxx")
   * Required for scoped IAM permissions
   */
  identityStoreId: string

  /**
   * NDX Users Group ID in IAM Identity Center
   * Required for scoped group membership permissions
   */
  groupId: string

  /**
   * SSO Instance ARN for future password setup flow
   * Optional for Story 1.2, required for Story 1.4
   */
  ssoInstanceArn?: string

  /**
   * NDX Account ID for cross-account Chatbot subscription
   * Story 3.1: Slack alerting requires Chatbot in NDX account to subscribe
   */
  ndxAccountId?: string

  /**
   * ISB Account ID where IAM Identity Center resides
   * Required for cross-account Identity Store access
   */
  isbAccountId?: string

  /**
   * Cross-account role ARN in ISB account for Identity Store access
   * Required for cross-account Identity Store operations
   */
  crossAccountRoleArn?: string

  /**
   * CloudFront distribution ID for Lambda permission
   * Required for CloudFront OAC to invoke Lambda Function URL
   */
  distributionId?: string

  /**
   * Slack workspace ID for Chatbot notifications
   * Story 3.1: Required for Slack alerting
   */
  slackWorkspaceId?: string

  /**
   * Slack channel ID for signup alerts
   * Story 3.1: Required for Slack alerting
   */
  slackChannelId?: string
}

/**
 * SignupStack - Lambda and CloudFront infrastructure for signup API
 *
 * Components:
 * - Lambda function for /signup-api/* endpoints
 * - IAM permissions scoped to specific Identity Center group (ADR-043)
 * - Function URL with IAM auth for CloudFront OAC integration
 *
 * Story 1.2: Basic Lambda with health endpoint
 * Story 1.3: GET /signup-api/domains endpoint
 * Story 1.4: POST /signup-api/signup endpoint
 * Story 3.1: SNS topic and EventBridge rule for Slack alerts
 */
export class SignupStack extends cdk.Stack {
  /** The signup Lambda function */
  public readonly signupHandler: lambdaNodejs.NodejsFunction

  /** Lambda Function URL for CloudFront OAC integration */
  public readonly signupFunctionUrl: lambda.FunctionUrl

  /** SNS topic for signup alerts (Story 3.1) */
  public readonly signupAlertsTopic: sns.Topic

  /** EventBridge rule for CreateUser events (Story 3.1) */
  public readonly createUserRule: events.Rule

  constructor(scope: Construct, id: string, props: SignupStackProps) {
    super(scope, id, props)

    const { identityStoreId, groupId, ssoInstanceArn, ndxAccountId, isbAccountId, crossAccountRoleArn, distributionId, slackWorkspaceId, slackChannelId } = props

    // Identity Store account - defaults to ISB account where IAM Identity Center resides
    const identityStoreAccountId = isbAccountId ?? "955063685555"

    // Cross-account role for Identity Store access
    const isbRoleArn = crossAccountRoleArn ?? `arn:aws:iam::${identityStoreAccountId}:role/ndx-signup-cross-account-role`

    // Read environment context for multi-environment support
    const env = (this.node.tryGetContext("env") as string | undefined) ?? "prod"

    // =========================================================================
    // Lambda Function (Story 1.2 AC#1)
    // =========================================================================
    // Signup API handler for /signup-api/* endpoints.
    // Uses NodejsFunction for automatic TypeScript bundling with esbuild.
    // @see architecture.md#Infrastructure & Deployment

    // Create log group with 90-day retention for compliance audit trail
    const logGroup = new logs.LogGroup(this, "SignupHandlerLogGroup", {
      logGroupName: "/aws/lambda/ndx-signup",
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.signupHandler = new lambdaNodejs.NodejsFunction(this, "SignupHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/signup/handler.ts"),
      timeout: cdk.Duration.seconds(LAMBDA_TIMEOUT_SECONDS),
      memorySize: LAMBDA_MEMORY_MB,
      description: "NDX Signup Handler - processes signup API requests",
      functionName: "ndx-signup",
      logGroup,
      // Enable X-Ray tracing for distributed tracing
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
        // IAM Identity Center configuration (ADR-043)
        IDENTITY_STORE_ID: identityStoreId,
        GROUP_ID: groupId,
        // Cross-account role for Identity Store access
        CROSS_ACCOUNT_ROLE_ARN: isbRoleArn,
        ...(ssoInstanceArn && { SSO_INSTANCE_ARN: ssoInstanceArn }),
      },
    })

    // =========================================================================
    // Lambda Function URL (Story 1.2 AC#2)
    // =========================================================================
    // Function URL with IAM auth for CloudFront OAC integration.
    // CloudFront signs requests with SigV4 via OAC.
    // @see architecture.md#CloudFront OAC Configuration

    this.signupFunctionUrl = this.signupHandler.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    })

    // =========================================================================
    // CloudFront Permission (Story 1.2 AC#2)
    // =========================================================================
    // Grant CloudFront permission to invoke Lambda via OAC.
    // This allows CloudFront to authenticate using SigV4.
    // Note: CloudFront is in NDX account (568672915267), Lambda is in ISB account.
    // AWS requires BOTH lambda:InvokeFunctionUrl AND lambda:InvokeFunction permissions.
    // @see https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-lambda.html

    if (distributionId) {
      // NDX account ID where CloudFront distribution resides
      const cloudFrontAccountId = ndxAccountId ?? "568672915267"
      const distributionArn = `arn:aws:cloudfront::${cloudFrontAccountId}:distribution/${distributionId}`

      // Permission 1: InvokeFunctionUrl - required for CloudFront OAC
      this.signupHandler.addPermission("CloudFrontInvokeFunctionUrl", {
        principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
        action: "lambda:InvokeFunctionUrl",
        sourceArn: distributionArn,
      })

      // Permission 2: InvokeFunction - also required per AWS documentation
      this.signupHandler.addPermission("CloudFrontInvokeFunction", {
        principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
        action: "lambda:InvokeFunction",
        sourceArn: distributionArn,
      })
    }

    // =========================================================================
    // Cross-Account Role Assumption (Story 1.2 AC#3)
    // =========================================================================
    // Lambda assumes a role in ISB account to access Identity Store.
    // The cross-account role has scoped Identity Store permissions (ADR-043).
    // @see architecture.md#Cross-Account Access

    // Permission to assume the cross-account role in ISB account
    this.signupHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: [isbRoleArn],
      }),
    )

    // =========================================================================
    // Resource Tags
    // =========================================================================
    // Governance: Resource tags for organization and cost tracking.
    // All tags lowercase per architecture standards.

    cdk.Tags.of(this.signupHandler).add("project", "ndx")
    cdk.Tags.of(this.signupHandler).add("environment", env)
    cdk.Tags.of(this.signupHandler).add("managedby", "cdk")
    cdk.Tags.of(this.signupHandler).add("feature", "signup")

    // Stack-level tags
    cdk.Tags.of(this).add("project", "ndx")
    cdk.Tags.of(this).add("environment", env)
    cdk.Tags.of(this).add("managedby", "cdk")
    cdk.Tags.of(this).add("feature", "signup")

    // =========================================================================
    // SNS Topic for Signup Alerts (Story 3.1 AC#3, AC#5)
    // =========================================================================
    // SNS topic for publishing CreateUser events to Slack via Chatbot.
    // Resource policy allows cross-account Chatbot subscription from NDX account.
    // @see architecture.md#Slack Alerting

    this.signupAlertsTopic = new sns.Topic(this, "SignupAlertsTopic", {
      topicName: "ndx-signup-alerts",
      displayName: "NDX Signup Alerts",
    })

    // Add resource policy for cross-account Chatbot subscription
    // Chatbot in NDX account (568672915267) subscribes to this topic
    if (ndxAccountId) {
      this.signupAlertsTopic.addToResourcePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          principals: [new iam.ServicePrincipal("chatbot.amazonaws.com")],
          actions: ["sns:Subscribe"],
          resources: [this.signupAlertsTopic.topicArn],
          conditions: {
            StringEquals: {
              "AWS:SourceAccount": ndxAccountId,
            },
          },
        }),
      )
    }

    // Tag SNS topic
    cdk.Tags.of(this.signupAlertsTopic).add("project", "ndx")
    cdk.Tags.of(this.signupAlertsTopic).add("environment", env)
    cdk.Tags.of(this.signupAlertsTopic).add("managedby", "cdk")
    cdk.Tags.of(this.signupAlertsTopic).add("feature", "signup")

    // =========================================================================
    // EventBridge Rule for CreateUser Events (Story 3.1 AC#2, AC#6)
    // =========================================================================
    // Triggers on IAM Identity Center CreateUser events via CloudTrail.
    // Publishes matched events to SNS topic for Slack notification.
    // @see architecture.md#EventBridge Rules

    this.createUserRule = new events.Rule(this, "CreateUserRule", {
      ruleName: "ndx-signup-createuser-alert",
      description: "Triggers on IAM Identity Center CreateUser events for Slack alerting",
      eventPattern: {
        source: ["aws.sso-directory"],
        detailType: ["AWS API Call via CloudTrail"],
        detail: {
          eventSource: ["sso-directory.amazonaws.com"],
          eventName: ["CreateUser"],
        },
      },
      targets: [new targets.SnsTopic(this.signupAlertsTopic)],
    })

    // Tag EventBridge rule
    cdk.Tags.of(this.createUserRule).add("project", "ndx")
    cdk.Tags.of(this.createUserRule).add("environment", env)
    cdk.Tags.of(this.createUserRule).add("managedby", "cdk")
    cdk.Tags.of(this.createUserRule).add("feature", "signup")

    // =========================================================================
    // Slack Channel Configuration (Story 3.1 AC#4)
    // =========================================================================
    // AWS Chatbot Slack channel configuration for signup alerts.
    // Subscribes to the SNS topic to receive CreateUser event notifications.
    // @see architecture.md#Slack Alerting

    if (slackWorkspaceId && slackChannelId) {
      const slackChannel = new chatbot.SlackChannelConfiguration(this, "SignupAlertsSlackChannel", {
        slackChannelConfigurationName: "ndx-signup-alerts",
        slackWorkspaceId,
        slackChannelId,
        notificationTopics: [this.signupAlertsTopic],
        loggingLevel: chatbot.LoggingLevel.INFO,
      })

      // Tag Chatbot configuration
      cdk.Tags.of(slackChannel).add("project", "ndx")
      cdk.Tags.of(slackChannel).add("environment", env)
      cdk.Tags.of(slackChannel).add("managedby", "cdk")
      cdk.Tags.of(slackChannel).add("feature", "signup")
    }

    // =========================================================================
    // Outputs
    // =========================================================================

    new cdk.CfnOutput(this, "SignupHandlerArn", {
      value: this.signupHandler.functionArn,
      description: "ARN of the signup handler Lambda function",
    })

    new cdk.CfnOutput(this, "SignupHandlerName", {
      value: this.signupHandler.functionName,
      description: "Name of the signup handler Lambda function",
    })

    new cdk.CfnOutput(this, "SignupFunctionUrl", {
      value: this.signupFunctionUrl.url,
      description: "Function URL for CloudFront OAC integration",
    })

    // Story 3.1: SNS and EventBridge outputs
    new cdk.CfnOutput(this, "SignupAlertsTopicArn", {
      value: this.signupAlertsTopic.topicArn,
      description: "ARN of the SNS topic for signup alerts (add to Chatbot)",
    })

    new cdk.CfnOutput(this, "CreateUserRuleArn", {
      value: this.createUserRule.ruleArn,
      description: "ARN of the EventBridge rule for CreateUser events",
    })
  }
}
