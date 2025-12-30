import * as cdk from "aws-cdk-lib"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs"
import * as iam from "aws-cdk-lib/aws-iam"
import * as cr from "aws-cdk-lib/custom-resources"
import { Construct } from "constructs"
import * as path from "path"
import * as fs from "fs"
import { getEnvironmentConfig } from "./config"

// Configuration constants
const LAMBDA_TIMEOUT_MINUTES = 5
const CACHE_TTL_ONE_DAY_SECONDS = 86400
const CACHE_TTL_ONE_YEAR_SECONDS = 31536000
const CACHE_TTL_MIN_SECONDS = 1

// Resource naming constants
// Origin ID follows pattern: {bucket-name}-origin for traceability
const ORIGIN_ID = "ndx-static-prod-origin"

/**
 * NDX Static Stack - Infrastructure for NDX static site with cookie-based routing
 *
 * This stack provisions:
 * - S3 bucket for static site hosting with versioning and encryption
 * - CloudFront distribution integration with OAC for secure S3 access
 * - CloudFront Function for cookie-based routing (NDX cookie)
 * - Cache policy optimized for cookie forwarding
 * - Custom resources to modify existing CloudFront distribution
 *
 * Architecture:
 * - Uses existing CloudFront distribution (imported via ID)
 * - Adds new S3 origin with OAC for secure access
 * - CloudFront Function inspects NDX cookie and routes accordingly
 * - Multi-environment support (prod/test) via CDK context
 *
 * @see docs/architecture.md for complete architecture documentation
 */
export class NdxStaticStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Read environment context for multi-environment support (Story 3.5)
    // Enables integration testing with separate test bucket
    const env = (this.node.tryGetContext("env") as string | undefined) || "prod"
    const config = getEnvironmentConfig(env)

    // S3 bucket for static site hosting
    // Bucket name validated as available in Story 2.1
    const bucket = new s3.Bucket(this, "StaticSiteBucket", {
      bucketName: config.bucketName,

      // Security: Server-side encryption with AWS managed keys (NFR-SEC-2)
      encryption: s3.BucketEncryption.S3_MANAGED,

      // Security: Block all public access (NFR-SEC-1)
      // Prepared for CloudFront origin access in growth phase
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // Data protection: Enable versioning for rollback capability (FR22, ADR-003)
      versioned: true,

      // Data protection: Retain bucket on stack deletion (protect production data)
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // Governance: Resource tags for organization and cost tracking (NFR-OPS-4)
    // All tags lowercase per architecture standards
    cdk.Tags.of(bucket).add("project", "ndx")
    cdk.Tags.of(bucket).add("environment", env)
    cdk.Tags.of(bucket).add("managedby", "cdk")

    // Grant CloudFront access via OAC (Story 2.6 bug fix)
    // CloudFront Functions create dynamic S3 origins at runtime
    // These dynamic origins require bucket policy allowing CloudFront service principal
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowCloudFrontServicePrincipal",
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        actions: ["s3:GetObject"],
        resources: [bucket.arnForObjects("*")],
        conditions: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${this.account}:distribution/${config.distributionId}`,
          },
        },
      }),
    )

    // Import existing CloudFront distribution (Story 1.1 - Read-only reference)
    // Strategy: Read-only reference via fromDistributionAttributes
    // Custom Resource Lambda will add new origin via CloudFront API (Story 1.2)
    const distribution = cloudfront.Distribution.fromDistributionAttributes(this, "ImportedDistribution", {
      distributionId: config.distributionId,
      domainName: "ndx.digital.cabinet-office.gov.uk",
    })

    // Story 1.2: Custom Resource to add CloudFront origin via API
    // Lambda function that modifies CloudFront distribution directly via AWS SDK
    // Using NodejsFunction for automatic TypeScript bundling with esbuild
    const addOriginFunction = new lambdaNodejs.NodejsFunction(this, "AddCloudFrontOriginFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "functions/add-cloudfront-origin.ts"),
      timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINUTES),
      description: "Custom Resource: Add origin to CloudFront distribution",
      bundling: {
        minify: false,
        sourceMap: false,
        target: "node20",
        externalModules: [],
      },
    })

    // Grant CloudFront permissions to Lambda
    addOriginFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cloudfront:GetDistribution", "cloudfront:GetDistributionConfig", "cloudfront:UpdateDistribution"],
        resources: [`arn:aws:cloudfront::${this.account}:distribution/${config.distributionId}`],
      }),
    )

    // Custom Resource Provider
    const addOriginProvider = new cr.Provider(this, "AddOriginProvider", {
      onEventHandler: addOriginFunction,
    })

    // Custom Resource that triggers the Lambda
    // This will:
    // - Add new origin to the CloudFront distribution (Story 1.2)
    // - Configure cache policy to forward NDX cookie (Story 2.3)
    // - Attach function to default cache behavior (Story 2.5)
    const addOriginResource = new cdk.CustomResource(this, "AddCloudFrontOrigin", {
      serviceToken: addOriginProvider.serviceToken,
      properties: {
        DistributionId: config.distributionId,
        OriginId: ORIGIN_ID,
        OriginDomainName: `${config.bucketName}.s3.${this.region}.amazonaws.com`,
        OriginAccessControlId: config.oacId,
        // Note: Cache policy and function added below after resources are created
      },
    })

    // Ensure bucket is created before adding origin
    addOriginResource.node.addDependency(bucket)

    // Story 2.3: Cache Policy for NDX cookie forwarding
    // Allows CloudFront to forward only the NDX cookie to the function
    // Preserves cache effectiveness (users without cookie share cache)
    const cachePolicy = new cloudfront.CachePolicy(this, "NdxCookieRoutingPolicy", {
      cachePolicyName: "NdxCookieRoutingPolicy",
      comment: "Cache policy for NDX cookie-based routing",
      defaultTtl: cdk.Duration.seconds(CACHE_TTL_ONE_DAY_SECONDS),
      minTtl: cdk.Duration.seconds(CACHE_TTL_MIN_SECONDS),
      maxTtl: cdk.Duration.seconds(CACHE_TTL_ONE_YEAR_SECONDS),
      cookieBehavior: cloudfront.CacheCookieBehavior.allowList("NDX"),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    })

    // Story 2.4: CloudFront Function for cookie-based routing
    // Load function code from cookie-router.js file (created in Story 2.1)
    const functionCode = fs.readFileSync(path.join(__dirname, "functions/cookie-router.js"), "utf8")

    // Create CloudFront Function resource
    // Runtime: JS_2_0 (CloudFront Functions JavaScript 2.0)
    // Function inspects NDX cookie and routes to ndx-static-prod when NDX=true
    const cookieRouterFunction = new cloudfront.Function(this, "CookieRouterFunction", {
      functionName: "ndx-cookie-router",
      code: cloudfront.FunctionCode.fromInline(functionCode),
      comment: "Routes requests based on NDX cookie value",
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    })

    // Story 2.3 & 2.5: Configure cache behavior with cache policy and function
    // Uses same Custom Resource Lambda to update distribution config
    const configureCacheBehavior = new cdk.CustomResource(this, "ConfigureCacheBehavior", {
      serviceToken: addOriginProvider.serviceToken,
      properties: {
        DistributionId: config.distributionId,
        CachePolicyId: cachePolicy.cachePolicyId,
        FunctionArn: cookieRouterFunction.functionArn,
        FunctionEventType: "viewer-request",
      },
    })

    // Ensure cache policy and function are created first
    configureCacheBehavior.node.addDependency(cachePolicy)
    configureCacheBehavior.node.addDependency(cookieRouterFunction)
    // Also ensure origin is added before configuring cache behavior
    configureCacheBehavior.node.addDependency(addOriginResource)

    // Configure custom error responses to serve 404.html for missing files
    // S3 returns 403 for missing files (without ListBucket permission), so map both 403 and 404
    const configureErrorResponses = new cdk.CustomResource(this, "ConfigureCustomErrorResponses", {
      serviceToken: addOriginProvider.serviceToken,
      properties: {
        DistributionId: config.distributionId,
        CustomErrorResponses: [
          { ErrorCode: 403, ResponseCode: 404, ResponsePagePath: "/404.html", ErrorCachingMinTTL: 300 },
          { ErrorCode: 404, ResponseCode: 404, ResponsePagePath: "/404.html", ErrorCachingMinTTL: 300 },
        ],
      },
    })
    configureErrorResponses.node.addDependency(configureCacheBehavior)

    // Alternate domain name configuration (e.g., ndx.digital.cabinet-office.gov.uk)
    // Prerequisites:
    // 1. Create ACM certificate in us-east-1 manually (aws acm request-certificate)
    // 2. Add DNS validation CNAME records to your DNS provider
    // 3. Wait for certificate to be validated (~5-30 minutes)
    // 4. Add certificateArn to config and deploy
    if (config.alternateDomainName && config.certificateArn) {
      const configureAlternateDomain = new cdk.CustomResource(this, "ConfigureAlternateDomainName", {
        serviceToken: addOriginProvider.serviceToken,
        properties: {
          DistributionId: config.distributionId,
          AlternateDomainName: config.alternateDomainName,
          CertificateArn: config.certificateArn,
        },
      })

      // Ensure cache behavior is configured before adding domain
      configureAlternateDomain.node.addDependency(configureCacheBehavior)

      new cdk.CfnOutput(this, "AlternateDomainName", {
        value: config.alternateDomainName,
        description: "Alternate domain name configured on CloudFront",
      })

      new cdk.CfnOutput(this, "CertificateArn", {
        value: config.certificateArn,
        description: "ACM Certificate ARN (us-east-1)",
      })
    } else if (config.alternateDomainName) {
      // Certificate ARN not yet provided - output instructions
      new cdk.CfnOutput(this, "AlternateDomainStatus", {
        value: `Pending: Create ACM cert for ${config.alternateDomainName} in us-east-1, then add certificateArn to config`,
        description: "Next step for alternate domain configuration",
      })
    }

    // Output the distribution ID for reference
    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: distribution.distributionId,
      description: "CloudFront Distribution ID",
    })

    // Output the origin ID that was added
    new cdk.CfnOutput(this, "OriginId", {
      value: ORIGIN_ID,
      description: "Origin ID added to CloudFront distribution",
    })

    // Output the CloudFront Function ARN for reference (Story 2.4)
    new cdk.CfnOutput(this, "CookieRouterFunctionArn", {
      value: cookieRouterFunction.functionArn,
      description: "ARN of CloudFront cookie router function",
    })
  }
}
