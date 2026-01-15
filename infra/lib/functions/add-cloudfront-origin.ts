import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
  Origin,
  FunctionAssociation,
  Method,
  CacheBehavior,
} from "@aws-sdk/client-cloudfront"
import * as https from "https"

interface CloudFormationCustomResourceEvent {
  RequestType: "Create" | "Update" | "Delete"
  ResponseURL: string
  StackId: string
  RequestId: string
  ResourceType: string
  LogicalResourceId: string
  PhysicalResourceId?: string
  ResourceProperties: {
    DistributionId: string
    OriginId?: string
    OriginDomainName?: string
    OriginAccessControlId?: string
    // HTTP origin configuration (for Lambda Function URLs)
    OriginType?: "S3" | "HTTP"
    // Cache behavior configuration
    CachePolicyId?: string
    FunctionArn?: string
    FunctionEventType?: string
    // Path-based cache behavior configuration
    PathPattern?: string
    TargetOriginId?: string
    OriginRequestPolicyId?: string
    // Alternate domain name configuration
    AlternateDomainName?: string
    CertificateArn?: string
  }
}

interface CloudFormationCustomResourceResponse {
  Status: "SUCCESS" | "FAILED"
  Reason?: string
  PhysicalResourceId: string
  StackId: string
  RequestId: string
  LogicalResourceId: string
  Data?: Record<string, string>
}

const cloudfront = new CloudFrontClient({ region: "us-east-1" }) // CloudFront is always us-east-1

/**
 * Custom Resource Lambda Handler for adding CloudFront origin
 *
 * Handles CREATE, UPDATE, DELETE events from CloudFormation
 * Idempotent - checks if origin exists before adding
 *
 * Story 1.2: Add ndx-static-prod origin to existing distribution
 */
export async function handler(event: CloudFormationCustomResourceEvent): Promise<void> {
  console.log("Event:", JSON.stringify(event, null, 2))

  const { RequestType, ResourceProperties, StackId, RequestId, LogicalResourceId, PhysicalResourceId } = event

  const {
    DistributionId,
    OriginId,
    OriginDomainName,
    OriginAccessControlId,
    OriginType,
    CachePolicyId,
    FunctionArn,
    FunctionEventType,
    PathPattern,
    TargetOriginId,
    OriginRequestPolicyId,
    AlternateDomainName,
    CertificateArn,
  } = ResourceProperties

  // Physical resource ID for this custom resource
  const physicalResourceId = PhysicalResourceId || `cloudfront-config-${DistributionId}`

  try {
    if (RequestType === "Create" || RequestType === "Update") {
      const messages: string[] = []

      // Add/update origin if properties provided
      if (OriginId && OriginDomainName) {
        if (OriginType === "HTTP") {
          // HTTP origin (e.g., Lambda Function URL)
          await addHttpOriginToDistribution(DistributionId, OriginId, OriginDomainName, OriginAccessControlId)
          messages.push(`HTTP origin ${OriginId} configured`)
        } else if (OriginAccessControlId) {
          // S3 origin with OAC
          await addOriginToDistribution(DistributionId, OriginId, OriginDomainName, OriginAccessControlId)
          messages.push(`S3 origin ${OriginId} configured`)
        }
      }

      // Configure path-based cache behavior if properties provided
      if (PathPattern && TargetOriginId) {
        await addPathCacheBehavior(DistributionId, PathPattern, TargetOriginId, CachePolicyId, OriginRequestPolicyId)
        messages.push(`Cache behavior for ${PathPattern} configured`)
      }
      // Configure default cache behavior if properties provided (no path pattern)
      else if (CachePolicyId || FunctionArn) {
        await configureCacheBehavior(DistributionId, CachePolicyId, FunctionArn, FunctionEventType)
        if (CachePolicyId) messages.push(`Cache policy ${CachePolicyId} configured`)
        if (FunctionArn) messages.push(`Function ${FunctionArn} attached`)
      }

      // Configure alternate domain name if properties provided
      if (AlternateDomainName && CertificateArn) {
        await configureAlternateDomainName(DistributionId, AlternateDomainName, CertificateArn)
        messages.push(`Alternate domain ${AlternateDomainName} configured`)
      }

      await sendResponse(event, {
        Status: "SUCCESS",
        PhysicalResourceId: physicalResourceId,
        StackId,
        RequestId,
        LogicalResourceId,
        Data: {
          Message: messages.join(", "),
        },
      })
    } else if (RequestType === "Delete") {
      // On delete, we can optionally clean up
      // For now, leave distribution config as-is
      await sendResponse(event, {
        Status: "SUCCESS",
        PhysicalResourceId: physicalResourceId,
        StackId,
        RequestId,
        LogicalResourceId,
        Data: {
          Message: "CloudFront configuration retained on delete",
        },
      })
    }
  } catch (error) {
    console.error("Error:", error)
    await sendResponse(event, {
      Status: "FAILED",
      Reason: error instanceof Error ? error.message : String(error),
      PhysicalResourceId: physicalResourceId,
      StackId,
      RequestId,
      LogicalResourceId,
    })
  }
}

/**
 * Add origin to CloudFront distribution
 * Idempotent - checks if origin already exists
 */
async function addOriginToDistribution(
  distributionId: string,
  originId: string,
  originDomainName: string,
  originAccessControlId: string,
): Promise<void> {
  console.log(`Adding origin ${originId} to distribution ${distributionId}`)

  // Get current distribution config
  const configResponse = await cloudfront.send(new GetDistributionConfigCommand({ Id: distributionId }))

  if (!configResponse.DistributionConfig || !configResponse.ETag) {
    throw new Error("Failed to get distribution config")
  }

  const config = configResponse.DistributionConfig
  const etag = configResponse.ETag

  // Check if origin already exists (idempotency)
  const existingOriginIndex = config.Origins?.Items?.findIndex((origin: Origin) => origin.Id === originId)

  if (existingOriginIndex !== undefined && existingOriginIndex >= 0) {
    console.log(`Origin ${originId} already exists at index ${existingOriginIndex}`)

    // Update existing origin
    if (config.Origins?.Items) {
      config.Origins.Items[existingOriginIndex] = createOriginConfig(originId, originDomainName, originAccessControlId)
      console.log(`Updated existing origin ${originId}`)
    }
  } else {
    // Add new origin
    const newOrigin = createOriginConfig(originId, originDomainName, originAccessControlId)

    if (!config.Origins) {
      config.Origins = { Quantity: 0, Items: [] }
    }

    config.Origins.Items = config.Origins.Items || []
    config.Origins.Items.push(newOrigin)
    config.Origins.Quantity = config.Origins.Items.length

    console.log(`Added new origin ${originId}. Total origins: ${config.Origins.Quantity}`)
  }

  // Update distribution with new config
  console.log("Updating distribution...")
  await cloudfront.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    }),
  )

  console.log("Distribution updated successfully")
}

/**
 * Configure cache behavior with cache policy and/or function association
 * Idempotent - only updates specified properties
 */
async function configureCacheBehavior(
  distributionId: string,
  cachePolicyId?: string,
  functionArn?: string,
  functionEventType?: string,
): Promise<void> {
  console.log(`Configuring cache behavior for distribution ${distributionId}`)

  // Get current distribution config
  const configResponse = await cloudfront.send(new GetDistributionConfigCommand({ Id: distributionId }))

  if (!configResponse.DistributionConfig || !configResponse.ETag) {
    throw new Error("Failed to get distribution config")
  }

  const config = configResponse.DistributionConfig
  const etag = configResponse.ETag

  if (!config.DefaultCacheBehavior) {
    throw new Error("DefaultCacheBehavior not found in distribution config")
  }

  // Update cache policy if provided
  if (cachePolicyId) {
    console.log(`Setting cache policy to ${cachePolicyId}`)
    config.DefaultCacheBehavior.CachePolicyId = cachePolicyId

    // Remove legacy cache settings when using cache policy
    delete config.DefaultCacheBehavior.ForwardedValues
    delete config.DefaultCacheBehavior.MinTTL
    delete config.DefaultCacheBehavior.DefaultTTL
    delete config.DefaultCacheBehavior.MaxTTL
  }

  // Update function association if provided
  if (functionArn && functionEventType) {
    console.log(`Attaching function ${functionArn} to ${functionEventType}`)

    if (!config.DefaultCacheBehavior.FunctionAssociations) {
      config.DefaultCacheBehavior.FunctionAssociations = {
        Quantity: 0,
        Items: [],
      }
    }

    // Check if function already attached (idempotency)
    const existingIndex = config.DefaultCacheBehavior.FunctionAssociations.Items?.findIndex(
      (assoc: FunctionAssociation) => assoc.EventType === functionEventType,
    )

    const newAssociation: FunctionAssociation = {
      FunctionARN: functionArn,
      EventType: functionEventType as "viewer-request" | "viewer-response",
    }

    if (existingIndex !== undefined && existingIndex >= 0 && config.DefaultCacheBehavior.FunctionAssociations.Items) {
      // Update existing association
      config.DefaultCacheBehavior.FunctionAssociations.Items[existingIndex] = newAssociation
      console.log(`Updated existing ${functionEventType} function association`)
    } else {
      // Add new association
      config.DefaultCacheBehavior.FunctionAssociations.Items =
        config.DefaultCacheBehavior.FunctionAssociations.Items || []
      config.DefaultCacheBehavior.FunctionAssociations.Items.push(newAssociation)
      config.DefaultCacheBehavior.FunctionAssociations.Quantity =
        config.DefaultCacheBehavior.FunctionAssociations.Items.length
      console.log(`Added new ${functionEventType} function association`)
    }
  }

  // Update distribution with new config
  console.log("Updating distribution...")
  await cloudfront.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    }),
  )

  console.log("Cache behavior updated successfully")
}

/**
 * Configure alternate domain name (CNAME) and SSL certificate
 * Idempotent - checks if domain already exists in aliases
 */
async function configureAlternateDomainName(
  distributionId: string,
  domainName: string,
  certificateArn: string,
): Promise<void> {
  console.log(`Configuring alternate domain ${domainName} for distribution ${distributionId}`)

  // Get current distribution config
  const configResponse = await cloudfront.send(new GetDistributionConfigCommand({ Id: distributionId }))

  if (!configResponse.DistributionConfig || !configResponse.ETag) {
    throw new Error("Failed to get distribution config")
  }

  const config = configResponse.DistributionConfig
  const etag = configResponse.ETag

  // Initialize Aliases if not present
  if (!config.Aliases) {
    config.Aliases = { Quantity: 0, Items: [] }
  }
  if (!config.Aliases.Items) {
    config.Aliases.Items = []
  }

  // Check if domain already exists (idempotency)
  const existingIndex = config.Aliases.Items.findIndex(
    (alias: string) => alias.toLowerCase() === domainName.toLowerCase(),
  )

  if (existingIndex >= 0) {
    console.log(`Domain ${domainName} already exists in aliases`)
  } else {
    // Add new domain
    config.Aliases.Items.push(domainName)
    config.Aliases.Quantity = config.Aliases.Items.length
    console.log(`Added ${domainName} to aliases. Total aliases: ${config.Aliases.Quantity}`)
  }

  // Configure SSL certificate for custom domain
  config.ViewerCertificate = {
    ACMCertificateArn: certificateArn,
    SSLSupportMethod: "sni-only",
    MinimumProtocolVersion: "TLSv1.2_2021",
    Certificate: certificateArn,
    CertificateSource: "acm",
  }
  console.log(`Configured SSL certificate: ${certificateArn}`)

  // Update distribution with new config
  console.log("Updating distribution...")
  await cloudfront.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    }),
  )

  console.log("Alternate domain name configured successfully")
}

/**
 * Add HTTP origin to CloudFront distribution (for Lambda Function URLs)
 * Idempotent - checks if origin already exists
 */
async function addHttpOriginToDistribution(
  distributionId: string,
  originId: string,
  originDomainName: string,
  originAccessControlId?: string,
): Promise<void> {
  console.log(`Adding HTTP origin ${originId} to distribution ${distributionId}`)

  // Get current distribution config
  const configResponse = await cloudfront.send(new GetDistributionConfigCommand({ Id: distributionId }))

  if (!configResponse.DistributionConfig || !configResponse.ETag) {
    throw new Error("Failed to get distribution config")
  }

  const config = configResponse.DistributionConfig
  const etag = configResponse.ETag

  // Check if origin already exists (idempotency)
  const existingOriginIndex = config.Origins?.Items?.findIndex((origin: Origin) => origin.Id === originId)

  if (existingOriginIndex !== undefined && existingOriginIndex >= 0) {
    console.log(`Origin ${originId} already exists at index ${existingOriginIndex}`)

    // Update existing origin
    if (config.Origins?.Items) {
      config.Origins.Items[existingOriginIndex] = createHttpOriginConfig(
        originId,
        originDomainName,
        originAccessControlId,
      )
      console.log(`Updated existing HTTP origin ${originId}`)
    }
  } else {
    // Add new origin
    const newOrigin = createHttpOriginConfig(originId, originDomainName, originAccessControlId)

    if (!config.Origins) {
      config.Origins = { Quantity: 0, Items: [] }
    }

    config.Origins.Items = config.Origins.Items || []
    config.Origins.Items.push(newOrigin)
    config.Origins.Quantity = config.Origins.Items.length

    console.log(`Added new HTTP origin ${originId}. Total origins: ${config.Origins.Quantity}`)
  }

  // Update distribution with new config
  console.log("Updating distribution...")
  await cloudfront.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    }),
  )

  console.log("Distribution updated successfully with HTTP origin")
}

/**
 * Add path-based cache behavior to CloudFront distribution
 * Used for routing specific paths (e.g., /signup-api/*) to different origins
 */
async function addPathCacheBehavior(
  distributionId: string,
  pathPattern: string,
  targetOriginId: string,
  cachePolicyId?: string,
  originRequestPolicyId?: string,
): Promise<void> {
  console.log(`Adding cache behavior for ${pathPattern} to distribution ${distributionId}`)

  // Get current distribution config
  const configResponse = await cloudfront.send(new GetDistributionConfigCommand({ Id: distributionId }))

  if (!configResponse.DistributionConfig || !configResponse.ETag) {
    throw new Error("Failed to get distribution config")
  }

  const config = configResponse.DistributionConfig
  const etag = configResponse.ETag

  // Initialize CacheBehaviors if not present
  if (!config.CacheBehaviors) {
    config.CacheBehaviors = { Quantity: 0, Items: [] }
  }
  if (!config.CacheBehaviors.Items) {
    config.CacheBehaviors.Items = []
  }

  // Check if path pattern already exists
  const existingIndex = config.CacheBehaviors.Items.findIndex((behavior) => behavior.PathPattern === pathPattern)

  const allowedMethods: Method[] = ["HEAD", "DELETE", "POST", "GET", "OPTIONS", "PUT", "PATCH"]
  const cachedMethods: Method[] = ["HEAD", "GET"]

  const newBehavior: CacheBehavior = {
    PathPattern: pathPattern,
    TargetOriginId: targetOriginId,
    ViewerProtocolPolicy: "redirect-to-https",
    AllowedMethods: {
      Quantity: 7,
      Items: allowedMethods,
      CachedMethods: {
        Quantity: 2,
        Items: cachedMethods,
      },
    },
    Compress: true,
    // Use CachingDisabled policy for API endpoints (no caching)
    CachePolicyId: cachePolicyId || "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    // Use AllViewerExceptHostHeader for Lambda Function URLs
    OriginRequestPolicyId: originRequestPolicyId || "b689b0a8-53d0-40ab-baf2-68738e2966ac",
    TrustedSigners: { Enabled: false, Quantity: 0 },
    TrustedKeyGroups: { Enabled: false, Quantity: 0 },
    SmoothStreaming: false,
    LambdaFunctionAssociations: { Quantity: 0 },
    FunctionAssociations: { Quantity: 0 },
    FieldLevelEncryptionId: "",
  }

  if (existingIndex >= 0) {
    // Update existing behavior
    config.CacheBehaviors.Items[existingIndex] = newBehavior
    console.log(`Updated existing cache behavior for ${pathPattern}`)
  } else {
    // Add new behavior
    config.CacheBehaviors.Items.push(newBehavior)
    config.CacheBehaviors.Quantity = config.CacheBehaviors.Items.length
    console.log(`Added new cache behavior for ${pathPattern}. Total behaviors: ${config.CacheBehaviors.Quantity}`)
  }

  // Update distribution with new config
  console.log("Updating distribution...")
  await cloudfront.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    }),
  )

  console.log("Cache behavior configured successfully")
}

/**
 * Create HTTP origin configuration object (for Lambda Function URLs)
 */
function createHttpOriginConfig(originId: string, domainName: string, originAccessControlId?: string): Origin {
  return {
    Id: originId,
    DomainName: domainName,
    OriginPath: "",
    CustomHeaders: {
      Quantity: 0,
    },
    ConnectionAttempts: 3,
    ConnectionTimeout: 10,
    OriginShield: {
      Enabled: false,
    },
    // Use OAC ID if provided (required for Lambda Function URLs with IAM auth)
    OriginAccessControlId: originAccessControlId || "",
    CustomOriginConfig: {
      HTTPPort: 80,
      HTTPSPort: 443,
      OriginProtocolPolicy: "https-only",
      OriginSslProtocols: {
        Quantity: 1,
        Items: ["TLSv1.2"],
      },
      OriginReadTimeout: 30,
      OriginKeepaliveTimeout: 5,
    },
  }
}

/**
 * Create origin configuration object
 */
function createOriginConfig(originId: string, domainName: string, originAccessControlId: string): Origin {
  return {
    Id: originId,
    DomainName: domainName,
    OriginPath: "",
    CustomHeaders: {
      Quantity: 0,
    },
    ConnectionAttempts: 3,
    ConnectionTimeout: 10,
    OriginAccessControlId: originAccessControlId,
    S3OriginConfig: {
      OriginAccessIdentity: "",
      OriginReadTimeout: 30,
    },
    OriginShield: {
      Enabled: false,
    },
  }
}

/**
 * Send response to CloudFormation
 */
async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  response: CloudFormationCustomResourceResponse,
): Promise<void> {
  const responseBody = JSON.stringify(response)

  console.log("Sending response:", responseBody)

  const parsedUrl = new URL(event.ResponseURL)
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: "PUT",
    headers: {
      "Content-Type": "",
      "Content-Length": responseBody.length,
    },
  }

  return new Promise<void>((resolve, reject) => {
    const request = https.request(options, (res) => {
      console.log("Response status:", res.statusCode)
      resolve()
    })

    request.on("error", (error: Error) => {
      console.error("Error sending response:", error)
      reject(error)
    })

    request.write(responseBody)
    request.end()
  })
}
