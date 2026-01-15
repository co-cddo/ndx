/**
 * NDX WAF Stack - Rate Limiting for Signup API
 *
 * Story 3.2: WAF Rate Limiting
 *
 * IMPORTANT: This stack MUST be deployed to us-east-1 region for CloudFront WAF.
 * CloudFront WAF WebACLs are only supported in us-east-1.
 *
 * Deploy with: cdk deploy NdxWafStack --region us-east-1
 *
 * After deployment, manually associate the WebACL ARN with CloudFront distribution
 * via AWS Console or update the CloudFront custom resource.
 *
 * @module infra/lib/waf-stack
 */

import * as cdk from "aws-cdk-lib"
import * as wafv2 from "aws-cdk-lib/aws-wafv2"
import * as logs from "aws-cdk-lib/aws-logs"
import { Construct } from "constructs"

/**
 * WAF Stack Properties
 */
export interface WafStackProps extends cdk.StackProps {
  /**
   * CloudFront distribution ID for reference in tags
   */
  distributionId: string
}

/**
 * WAF Stack - Rate limiting for signup API
 *
 * Creates WAFv2 WebACL with rate-based rule limiting signup requests
 * to 1 per minute per IP address.
 *
 * Story 3.2 AC#1-5
 */
export class WafStack extends cdk.Stack {
  /** WAF WebACL for CloudFront */
  public readonly webAcl: wafv2.CfnWebACL

  /** CloudWatch log group for WAF logs */
  public readonly logGroup: logs.LogGroup

  constructor(scope: Construct, id: string, props: WafStackProps) {
    super(scope, id, props)

    const { distributionId } = props

    // Read environment context
    const env = (this.node.tryGetContext("env") as string | undefined) ?? "prod"

    // =========================================================================
    // WAF WebACL (Story 3.2 AC#1, AC#2, AC#3)
    // =========================================================================
    // Rate-based rule limiting /signup-api/signup to ~1 request per minute per IP.
    //
    // AWS WAF rate-based rules evaluate over 5-minute sliding windows.
    // Setting limit to 5 means after 5 requests in 5 minutes, subsequent
    // requests are blocked until the count drops below threshold.
    //
    // This effectively limits to approximately 1 request per minute.

    this.webAcl = new wafv2.CfnWebACL(this, "SignupRateLimitAcl", {
      name: "ndx-signup-rate-limit",
      description: "Rate limits signup API requests to prevent abuse - Story 3.2",
      scope: "CLOUDFRONT", // Must be CLOUDFRONT for CloudFront distribution
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "ndx-signup-waf",
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: "signup-rate-limit-per-ip",
          priority: 1,
          action: {
            block: {
              customResponse: {
                responseCode: 429,
                customResponseBodyKey: "rate-limited-response",
              },
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "ndx-signup-rate-limit-rule",
            sampledRequestsEnabled: true,
          },
          statement: {
            rateBasedStatement: {
              // Rate limit: 10 requests per 5-minute window = ~2 per minute
              // AWS WAF minimum is 10; evaluates over 5-minute sliding windows
              limit: 10,
              aggregateKeyType: "IP",
              // Scope down to only /signup-api/signup path
              scopeDownStatement: {
                byteMatchStatement: {
                  fieldToMatch: { uriPath: {} },
                  positionalConstraint: "STARTS_WITH",
                  searchString: "/signup-api/signup",
                  textTransformations: [
                    {
                      priority: 0,
                      type: "NONE",
                    },
                  ],
                },
              },
            },
          },
        },
      ],
      customResponseBodies: {
        "rate-limited-response": {
          contentType: "APPLICATION_JSON",
          content: JSON.stringify({
            error: "RATE_LIMITED",
            message: "Too many requests. Please wait a moment and try again.",
          }),
        },
      },
    })

    // =========================================================================
    // WAF Logging (Story 3.2 AC#4)
    // =========================================================================
    // CloudWatch Logs for WAF events - captures blocked requests for investigation.
    // Log group name MUST start with "aws-waf-logs-" per AWS requirement.

    this.logGroup = new logs.LogGroup(this, "WafLogGroup", {
      logGroupName: "aws-waf-logs-ndx-signup",
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // WAF Logging Configuration
    new wafv2.CfnLoggingConfiguration(this, "WafLogging", {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [this.logGroup.logGroupArn],
    })

    // =========================================================================
    // Resource Tags
    // =========================================================================

    cdk.Tags.of(this.webAcl).add("project", "ndx")
    cdk.Tags.of(this.webAcl).add("environment", env)
    cdk.Tags.of(this.webAcl).add("managedby", "cdk")
    cdk.Tags.of(this.webAcl).add("feature", "signup")
    cdk.Tags.of(this.webAcl).add("cloudfront-distribution", distributionId)

    cdk.Tags.of(this.logGroup).add("project", "ndx")
    cdk.Tags.of(this.logGroup).add("environment", env)
    cdk.Tags.of(this.logGroup).add("managedby", "cdk")
    cdk.Tags.of(this.logGroup).add("feature", "signup")

    // =========================================================================
    // Outputs
    // =========================================================================

    new cdk.CfnOutput(this, "WebAclArn", {
      value: this.webAcl.attrArn,
      description: "WAF WebACL ARN - associate with CloudFront distribution",
      exportName: "ndx-signup-waf-acl-arn",
    })

    new cdk.CfnOutput(this, "WebAclId", {
      value: this.webAcl.attrId,
      description: "WAF WebACL ID",
    })

    new cdk.CfnOutput(this, "WafLogGroupArn", {
      value: this.logGroup.logGroupArn,
      description: "CloudWatch Log Group for WAF logs",
    })
  }
}
