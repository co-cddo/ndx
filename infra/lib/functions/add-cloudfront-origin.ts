import {
  CloudFrontClient,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
  Origin,
  FunctionAssociation,
} from '@aws-sdk/client-cloudfront';
import * as https from 'https';

interface CloudFormationCustomResourceEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResponseURL: string;
  StackId: string;
  RequestId: string;
  ResourceType: string;
  LogicalResourceId: string;
  PhysicalResourceId?: string;
  ResourceProperties: {
    DistributionId: string;
    OriginId?: string;
    OriginDomainName?: string;
    OriginAccessControlId?: string;
    // Cache behavior configuration
    CachePolicyId?: string;
    FunctionArn?: string;
    FunctionEventType?: string;
  };
}

interface CloudFormationCustomResourceResponse {
  Status: 'SUCCESS' | 'FAILED';
  Reason?: string;
  PhysicalResourceId: string;
  StackId: string;
  RequestId: string;
  LogicalResourceId: string;
  Data?: Record<string, string>;
}

const cloudfront = new CloudFrontClient({ region: 'us-east-1' }); // CloudFront is always us-east-1

/**
 * Custom Resource Lambda Handler for adding CloudFront origin
 *
 * Handles CREATE, UPDATE, DELETE events from CloudFormation
 * Idempotent - checks if origin exists before adding
 *
 * Story 1.2: Add ndx-static-prod origin to existing distribution
 */
export async function handler(
  event: CloudFormationCustomResourceEvent
): Promise<void> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const {
    RequestType,
    ResourceProperties,
    StackId,
    RequestId,
    LogicalResourceId,
    PhysicalResourceId,
  } = event;

  const {
    DistributionId,
    OriginId,
    OriginDomainName,
    OriginAccessControlId,
    CachePolicyId,
    FunctionArn,
    FunctionEventType
  } = ResourceProperties;

  // Physical resource ID for this custom resource
  const physicalResourceId =
    PhysicalResourceId || `cloudfront-config-${DistributionId}`;

  try {
    if (RequestType === 'Create' || RequestType === 'Update') {
      const messages: string[] = [];

      // Add/update origin if properties provided
      if (OriginId && OriginDomainName && OriginAccessControlId) {
        await addOriginToDistribution(
          DistributionId,
          OriginId,
          OriginDomainName,
          OriginAccessControlId
        );
        messages.push(`Origin ${OriginId} configured`);
      }

      // Configure cache behavior if properties provided
      if (CachePolicyId || FunctionArn) {
        await configureCacheBehavior(
          DistributionId,
          CachePolicyId,
          FunctionArn,
          FunctionEventType
        );
        if (CachePolicyId) messages.push(`Cache policy ${CachePolicyId} configured`);
        if (FunctionArn) messages.push(`Function ${FunctionArn} attached`);
      }

      await sendResponse(event, {
        Status: 'SUCCESS',
        PhysicalResourceId: physicalResourceId,
        StackId,
        RequestId,
        LogicalResourceId,
        Data: {
          Message: messages.join(', '),
        },
      });
    } else if (RequestType === 'Delete') {
      // On delete, we can optionally clean up
      // For now, leave distribution config as-is
      await sendResponse(event, {
        Status: 'SUCCESS',
        PhysicalResourceId: physicalResourceId,
        StackId,
        RequestId,
        LogicalResourceId,
        Data: {
          Message: 'CloudFront configuration retained on delete',
        },
      });
    }
  } catch (error) {
    console.error('Error:', error);
    await sendResponse(event, {
      Status: 'FAILED',
      Reason: error instanceof Error ? error.message : String(error),
      PhysicalResourceId: physicalResourceId,
      StackId,
      RequestId,
      LogicalResourceId,
    });
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
  originAccessControlId: string
): Promise<void> {
  console.log(`Adding origin ${originId} to distribution ${distributionId}`);

  // Get current distribution config
  const configResponse = await cloudfront.send(
    new GetDistributionConfigCommand({ Id: distributionId })
  );

  if (!configResponse.DistributionConfig || !configResponse.ETag) {
    throw new Error('Failed to get distribution config');
  }

  const config = configResponse.DistributionConfig;
  const etag = configResponse.ETag;

  // Check if origin already exists (idempotency)
  const existingOriginIndex = config.Origins?.Items?.findIndex(
    (origin: Origin) => origin.Id === originId
  );

  if (existingOriginIndex !== undefined && existingOriginIndex >= 0) {
    console.log(`Origin ${originId} already exists at index ${existingOriginIndex}`);

    // Update existing origin
    if (config.Origins?.Items) {
      config.Origins.Items[existingOriginIndex] = createOriginConfig(
        originId,
        originDomainName,
        originAccessControlId
      );
      console.log(`Updated existing origin ${originId}`);
    }
  } else {
    // Add new origin
    const newOrigin = createOriginConfig(
      originId,
      originDomainName,
      originAccessControlId
    );

    if (!config.Origins) {
      config.Origins = { Quantity: 0, Items: [] };
    }

    config.Origins.Items = config.Origins.Items || [];
    config.Origins.Items.push(newOrigin);
    config.Origins.Quantity = config.Origins.Items.length;

    console.log(`Added new origin ${originId}. Total origins: ${config.Origins.Quantity}`);
  }

  // Update distribution with new config
  console.log('Updating distribution...');
  await cloudfront.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    })
  );

  console.log('Distribution updated successfully');
}


/**
 * Configure cache behavior with cache policy and/or function association
 * Idempotent - only updates specified properties
 */
async function configureCacheBehavior(
  distributionId: string,
  cachePolicyId?: string,
  functionArn?: string,
  functionEventType?: string
): Promise<void> {
  console.log(`Configuring cache behavior for distribution ${distributionId}`);

  // Get current distribution config
  const configResponse = await cloudfront.send(
    new GetDistributionConfigCommand({ Id: distributionId })
  );

  if (!configResponse.DistributionConfig || !configResponse.ETag) {
    throw new Error('Failed to get distribution config');
  }

  const config = configResponse.DistributionConfig;
  const etag = configResponse.ETag;

  if (!config.DefaultCacheBehavior) {
    throw new Error('DefaultCacheBehavior not found in distribution config');
  }

  // Update cache policy if provided
  if (cachePolicyId) {
    console.log(`Setting cache policy to ${cachePolicyId}`);
    config.DefaultCacheBehavior.CachePolicyId = cachePolicyId;

    // Remove legacy cache settings when using cache policy
    delete config.DefaultCacheBehavior.ForwardedValues;
    delete config.DefaultCacheBehavior.MinTTL;
    delete config.DefaultCacheBehavior.DefaultTTL;
    delete config.DefaultCacheBehavior.MaxTTL;
  }

  // Update function association if provided
  if (functionArn && functionEventType) {
    console.log(`Attaching function ${functionArn} to ${functionEventType}`);

    if (!config.DefaultCacheBehavior.FunctionAssociations) {
      config.DefaultCacheBehavior.FunctionAssociations = {
        Quantity: 0,
        Items: []
      };
    }

    // Check if function already attached (idempotency)
    const existingIndex = config.DefaultCacheBehavior.FunctionAssociations.Items?.findIndex(
      (assoc: FunctionAssociation) => assoc.EventType === functionEventType
    );

    const newAssociation: FunctionAssociation = {
      FunctionARN: functionArn,
      EventType: functionEventType as 'viewer-request' | 'viewer-response',
    };

    if (existingIndex !== undefined && existingIndex >= 0 && config.DefaultCacheBehavior.FunctionAssociations.Items) {
      // Update existing association
      config.DefaultCacheBehavior.FunctionAssociations.Items[existingIndex] = newAssociation;
      console.log(`Updated existing ${functionEventType} function association`);
    } else {
      // Add new association
      config.DefaultCacheBehavior.FunctionAssociations.Items =
        config.DefaultCacheBehavior.FunctionAssociations.Items || [];
      config.DefaultCacheBehavior.FunctionAssociations.Items.push(newAssociation);
      config.DefaultCacheBehavior.FunctionAssociations.Quantity =
        config.DefaultCacheBehavior.FunctionAssociations.Items.length;
      console.log(`Added new ${functionEventType} function association`);
    }
  }

  // Update distribution with new config
  console.log('Updating distribution...');
  await cloudfront.send(
    new UpdateDistributionCommand({
      Id: distributionId,
      DistributionConfig: config,
      IfMatch: etag,
    })
  );

  console.log('Cache behavior updated successfully');
}

/**
 * Create origin configuration object
 */
function createOriginConfig(
  originId: string,
  domainName: string,
  originAccessControlId: string
): Origin {
  return {
    Id: originId,
    DomainName: domainName,
    OriginPath: '',
    CustomHeaders: {
      Quantity: 0,
    },
    ConnectionAttempts: 3,
    ConnectionTimeout: 10,
    OriginAccessControlId: originAccessControlId,
    S3OriginConfig: {
      OriginAccessIdentity: '',
      OriginReadTimeout: 30,
    },
    OriginShield: {
      Enabled: false,
    },
  };
}

/**
 * Send response to CloudFormation
 */
async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  response: CloudFormationCustomResourceResponse
): Promise<void> {
  const responseBody = JSON.stringify(response);

  console.log('Sending response:', responseBody);

  const parsedUrl = new URL(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'PUT',
    headers: {
      'Content-Type': '',
      'Content-Length': responseBody.length,
    },
  };

  return new Promise<void>((resolve, reject) => {
    const request = https.request(options, (res) => {
      console.log('Response status:', res.statusCode);
      resolve();
    });

    request.on('error', (error: Error) => {
      console.error('Error sending response:', error);
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
}
