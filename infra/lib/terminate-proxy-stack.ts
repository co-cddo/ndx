/**
 * NDX Terminate Proxy Infrastructure Stack
 *
 * Lambda function that proxies lease termination requests from NDX users
 * to the ISB API using admin credentials. Users can only terminate their
 * own leases — ownership is validated server-side.
 *
 * @module infra/lib/terminate-proxy-stack
 */

import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs"
import * as logs from "aws-cdk-lib/aws-logs"
import type { Construct } from "constructs"
import * as path from "path"
import { getISBConfig } from "./config"

const LAMBDA_TIMEOUT_SECONDS = 30
const LAMBDA_MEMORY_MB = 256

export interface TerminateProxyStackProps extends cdk.StackProps {
  /**
   * CloudFront distribution ID for Lambda permission (OAC)
   */
  distributionId: string

  /**
   * NDX Account ID where CloudFront distribution resides
   */
  ndxAccountId?: string
}

/**
 * TerminateProxyStack - Lambda proxy for self-service lease termination
 *
 * Components:
 * - Lambda function for /lease-api/terminate endpoint
 * - IAM permissions for ISB JWT secret (Secrets Manager + KMS)
 * - Function URL with IAM auth for CloudFront OAC integration
 */
export class TerminateProxyStack extends cdk.Stack {
  public readonly terminateHandler: lambdaNodejs.NodejsFunction
  public readonly terminateFunctionUrl: lambda.FunctionUrl

  constructor(scope: Construct, id: string, props: TerminateProxyStackProps) {
    super(scope, id, props)

    const { distributionId, ndxAccountId } = props

    const env = (this.node.tryGetContext("env") as string | undefined) ?? "prod"
    const isbConfig = getISBConfig(env)

    // =========================================================================
    // Log Group
    // =========================================================================

    const logGroup = new logs.LogGroup(this, "TerminateHandlerLogGroup", {
      logGroupName: "/aws/lambda/ndx-terminate-proxy",
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // =========================================================================
    // Lambda Function
    // =========================================================================

    this.terminateHandler = new lambdaNodejs.NodejsFunction(this, "TerminateHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "lambda/terminate/handler.ts"),
      timeout: cdk.Duration.seconds(LAMBDA_TIMEOUT_SECONDS),
      memorySize: LAMBDA_MEMORY_MB,
      description: "NDX Terminate Proxy - forwards user lease termination to ISB API",
      functionName: "ndx-terminate-proxy",
      logGroup,
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
        ISB_API_BASE_URL: isbConfig.apiBaseUrl || "",
        ISB_JWT_SECRET_PATH: isbConfig.jwtSecretPath || "",
      },
    })

    // =========================================================================
    // IAM: Secrets Manager + KMS for ISB JWT secret
    // =========================================================================

    if (isbConfig.jwtSecretPath) {
      this.terminateHandler.addToRolePolicy(
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
      this.terminateHandler.addToRolePolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["kms:Decrypt"],
          resources: [isbConfig.jwtSecretKmsKeyArn],
        }),
      )
    }

    // =========================================================================
    // Function URL with IAM auth for CloudFront OAC
    // =========================================================================

    // Auth type NONE — security is handled by the Lambda itself (CSRF header,
    // JWT ownership check, WAF rate limiting). Matches signup Lambda pattern
    // where CloudFront Custom origin + OAC doesn't properly sign POST bodies.
    this.terminateFunctionUrl = this.terminateHandler.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })

    // =========================================================================
    // CloudFront Permission (OAC)
    // =========================================================================

    if (distributionId) {
      const cloudFrontAccountId = ndxAccountId ?? "568672915267"
      const distributionArn = `arn:aws:cloudfront::${cloudFrontAccountId}:distribution/${distributionId}`

      this.terminateHandler.addPermission("CloudFrontInvokeFunctionUrl", {
        principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
        action: "lambda:InvokeFunctionUrl",
        sourceArn: distributionArn,
      })

      this.terminateHandler.addPermission("CloudFrontInvokeFunction", {
        principal: new iam.ServicePrincipal("cloudfront.amazonaws.com"),
        action: "lambda:InvokeFunction",
        sourceArn: distributionArn,
      })
    }

    // =========================================================================
    // Tags
    // =========================================================================

    cdk.Tags.of(this.terminateHandler).add("project", "ndx")
    cdk.Tags.of(this.terminateHandler).add("environment", env)
    cdk.Tags.of(this.terminateHandler).add("managedby", "cdk")
    cdk.Tags.of(this.terminateHandler).add("feature", "terminate-proxy")

    cdk.Tags.of(this).add("project", "ndx")
    cdk.Tags.of(this).add("environment", env)
    cdk.Tags.of(this).add("managedby", "cdk")
    cdk.Tags.of(this).add("feature", "terminate-proxy")

    // =========================================================================
    // Outputs
    // =========================================================================

    new cdk.CfnOutput(this, "TerminateHandlerArn", {
      value: this.terminateHandler.functionArn,
      description: "ARN of the terminate proxy Lambda function",
    })

    new cdk.CfnOutput(this, "TerminateFunctionUrl", {
      value: this.terminateFunctionUrl.url,
      description: "Function URL for CloudFront OAC integration",
    })
  }
}
