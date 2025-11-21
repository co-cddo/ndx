# Story 1.2 Implementation: Add New S3 Origin (Custom Resource Pattern)

## Overview
Story 1.2 adds `ndx-static-prod` origin to existing CloudFront distribution E3THG4UHYDHVWP using Custom Resource Lambda pattern. This approach avoids `cdk import` and keeps the distribution configuration outside CloudFormation management.

## Prerequisites
- Story 1.1 complete: Distribution imported as read-only reference via `fromDistributionAttributes()`
- S3 bucket `ndx-static-prod` exists (created in stack)
- CloudFront distribution E3THG4UHYDHVWP accessible
- OAC ID E3P8MA1G9Y5BYE available for reuse

## Architecture

### Approach: Custom Resource Lambda
Instead of managing CloudFront distribution in CloudFormation (which requires `cdk import`), we use a Custom Resource Lambda that:

1. **Read-Only CDK Reference**: CloudFront distribution imported via `fromDistributionAttributes()` (read-only)
2. **Custom Resource Lambda**: Modifies distribution via AWS CloudFront API directly
3. **Idempotent Operations**: Lambda checks if origin exists before adding
4. **Event Handling**: Supports CREATE, UPDATE, DELETE CloudFormation events
5. **Error Handling**: Proper rollback and failure responses to CloudFormation

### Benefits
- No `cdk import` required
- Distribution remains outside CloudFormation management
- No conflicts with ISB template updates
- Idempotent and safe to re-run
- Full control over origin configuration

### Trade-offs
- Custom Lambda code maintenance
- CloudFormation doesn't directly manage origin
- Manual rollback if Lambda fails mid-update

## Implementation

### Files Created/Modified

#### 1. `/Users/cns/httpdocs/cddo/ndx/infra/lib/functions/add-cloudfront-origin.ts`
**Lambda handler for Custom Resource**

Features:
- Fetches current CloudFront distribution config via `GetDistributionConfigCommand`
- Adds new origin to origins array (or updates existing)
- Updates distribution via `UpdateDistributionCommand`
- Handles CREATE, UPDATE, DELETE events
- Idempotent: checks if origin already exists before adding
- Proper error handling and CloudFormation response
- Uses ETag for optimistic locking

Key functions:
```typescript
handler(event) // Main entry point for CloudFormation events
addOriginToDistribution() // Add/update origin
removeOriginFromDistribution() // Remove origin on DELETE
createOriginConfig() // Origin configuration builder
sendResponse() // CloudFormation response handler
```

IAM Permissions Required:
- `cloudfront:GetDistribution`
- `cloudfront:GetDistributionConfig`
- `cloudfront:UpdateDistribution`

#### 2. `/Users/cns/httpdocs/cddo/ndx/infra/lib/functions/index.ts`
Re-exports handler from `add-cloudfront-origin.ts`

#### 3. `/Users/cns/httpdocs/cddo/ndx/infra/lib/functions/package.json`
Lambda dependencies:
- `@aws-sdk/client-cloudfront: ^3.0.0`

#### 4. `/Users/cns/httpdocs/cddo/ndx/infra/lib/ndx-stack.ts`
**CDK Stack Updates**

Imports added:
```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';
```

Changes:
1. **Reverted to read-only distribution reference**:
   ```typescript
   const distribution = cloudfront.Distribution.fromDistributionAttributes(
     this,
     'ImportedDistribution',
     {
       distributionId: 'E3THG4UHYDHVWP',
       domainName: 'd7roov8fndsis.cloudfront.net',
     }
   );
   ```

2. **Created Lambda function**:
   ```typescript
   const addOriginFunction = new lambda.Function(this, 'AddCloudFrontOriginFunction', {
     runtime: lambda.Runtime.NODEJS_20_X,
     handler: 'index.handler',
     code: lambda.Code.fromAsset(path.join(__dirname, 'functions'), {
       bundling: {
         image: lambda.Runtime.NODEJS_20_X.bundlingImage,
         command: ['bash', '-c', 'npm install --omit=dev && cp -r . /asset-output/'],
       },
     }),
     timeout: cdk.Duration.minutes(5),
   });
   ```

3. **Granted CloudFront permissions**:
   ```typescript
   addOriginFunction.addToRolePolicy(
     new iam.PolicyStatement({
       actions: [
         'cloudfront:GetDistribution',
         'cloudfront:GetDistributionConfig',
         'cloudfront:UpdateDistribution',
       ],
       resources: [`arn:aws:cloudfront::${this.account}:distribution/E3THG4UHYDHVWP`],
     })
   );
   ```

4. **Created Custom Resource Provider**:
   ```typescript
   const addOriginProvider = new cr.Provider(this, 'AddOriginProvider', {
     onEventHandler: addOriginFunction,
   });
   ```

5. **Created Custom Resource**:
   ```typescript
   const addOriginResource = new cdk.CustomResource(this, 'AddCloudFrontOrigin', {
     serviceToken: addOriginProvider.serviceToken,
     properties: {
       DistributionId: 'E3THG4UHYDHVWP',
       OriginId: 'ndx-static-prod-origin',
       OriginDomainName: `${bucketName}.s3.${this.region}.amazonaws.com`,
       OriginAccessControlId: 'E3P8MA1G9Y5BYE', // Reuse existing OAC
     },
   });
   ```

6. **Added dependency and outputs**:
   ```typescript
   addOriginResource.node.addDependency(bucket);

   new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
     value: distribution.distributionId,
     description: 'CloudFront Distribution ID',
   });

   new cdk.CfnOutput(this, 'OriginAdded', {
     value: addOriginResource.getAttString('OriginId'),
     description: 'Origin ID added to CloudFront',
   });
   ```

## Origin Configuration

The Lambda creates origin with these settings:

```typescript
{
  Id: 'ndx-static-prod-origin',
  DomainName: 'ndx-static-prod.s3.us-west-2.amazonaws.com',
  OriginPath: '',
  ConnectionAttempts: 3,
  ConnectionTimeout: 10,
  OriginAccessControlId: 'E3P8MA1G9Y5BYE', // Reuse existing OAC
  S3OriginConfig: {
    OriginAccessIdentity: '',
  },
  OriginShield: {
    Enabled: false,
  },
}
```

## Validation

### 1. Build and Synth
```bash
cd /Users/cns/httpdocs/cddo/ndx/infra
npm run build
npx cdk synth --profile NDX/InnovationSandboxHub
```

Expected:
- TypeScript compiles successfully
- Lambda function bundling succeeds
- CloudFormation template generated with Custom Resource

### 2. Review Diff
```bash
npx cdk diff --profile NDX/InnovationSandboxHub
```

Expected changes:
- New Lambda function: `AddCloudFrontOriginFunction`
- New Lambda execution role with CloudFront permissions
- New Custom Resource Provider (framework Lambda + role)
- New Custom Resource: `AddCloudFrontOrigin`
- New CloudFormation outputs

### 3. Deploy (Story 1.4)
```bash
npx cdk deploy --profile NDX/InnovationSandboxHub
```

**Deploy sequence**:
1. S3 bucket `ndx-static-prod` created (if not exists)
2. Lambda function deployed with bundled dependencies
3. Lambda execution role created with CloudFront permissions
4. Custom Resource Provider deployed
5. Custom Resource executes Lambda (CREATE event)
6. Lambda fetches distribution config
7. Lambda adds `ndx-static-prod-origin` to origins array
8. Lambda updates distribution via CloudFront API
9. CloudFormation receives SUCCESS response
10. Stack creation completes

### 4. Verify Origin Added
```bash
aws cloudfront get-distribution-config \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'DistributionConfig.Origins.Items[?Id==`ndx-static-prod-origin`]'
```

Expected output:
```json
[
  {
    "Id": "ndx-static-prod-origin",
    "DomainName": "ndx-static-prod.s3.us-west-2.amazonaws.com",
    "OriginPath": "",
    "OriginAccessControlId": "E3P8MA1G9Y5BYE",
    ...
  }
]
```

### 5. Check Lambda Logs
```bash
aws logs tail /aws/lambda/NdxStatic-AddCloudFrontOriginFunction-* \
  --profile NDX/InnovationSandboxHub \
  --follow
```

Expected log entries:
- "Event: ..." (CloudFormation event)
- "Adding origin ndx-static-prod-origin to distribution E3THG4UHYDHVWP"
- "Added new origin ... Total origins: 3" (or "already exists")
- "Updating distribution..."
- "Distribution updated successfully"
- "Sending response: SUCCESS"

## Error Handling

### Lambda Failures
If Lambda fails (network, permissions, API error):
1. Lambda catches exception
2. Sends FAILED response to CloudFormation
3. CloudFormation rolls back stack creation
4. S3 bucket retained (RemovalPolicy.RETAIN)
5. Lambda and Custom Resource deleted on rollback

### Idempotency
Lambda is idempotent:
- Checks if origin already exists before adding
- If exists: updates origin config (no error)
- If not exists: adds new origin
- Safe to re-run multiple times

### Rollback
On stack deletion or rollback:
1. Custom Resource receives DELETE event
2. Lambda removes origin from distribution
3. Distribution updated with origin removed
4. Lambda resources deleted
5. S3 bucket retained

## Testing

### Unit Tests (Story 3.x)
- Test Lambda handler with CREATE event
- Test Lambda handler with UPDATE event
- Test Lambda handler with DELETE event
- Test idempotency (origin already exists)
- Test error handling (invalid distribution ID)
- Test CloudFormation response formatting

### Integration Tests (Story 3.5)
- Deploy stack to test environment
- Verify origin added to distribution
- Verify origin config matches expected
- Delete stack and verify origin removed
- Test re-deployment (idempotency)

## Acceptance Criteria

- [x] Lambda function created: `add-cloudfront-origin.ts`
- [x] Lambda handles CREATE, UPDATE, DELETE events
- [x] Lambda is idempotent (checks if origin exists)
- [x] Lambda has CloudFront IAM permissions
- [x] Custom Resource added to CDK stack
- [x] Custom Resource Provider created
- [x] Origin config matches requirements
- [x] Proper error handling and rollback
- [x] Distribution reference reverted to read-only
- [x] TypeScript compiles successfully
- [ ] `cdk diff` shows expected resources
- [ ] Deploy succeeds (Story 1.4)
- [ ] Origin visible in CloudFront console
- [ ] CloudFormation outputs show origin ID

## Next Steps

### Story 1.3: Validate Existing Origins
Verify Story 1.2 deployment doesn't affect existing origins:
- S3Origin unchanged
- API Gateway origin unchanged
- Cache behaviors unchanged
- CloudFront distribution remains operational

### Story 1.4: Deploy to Production
Execute deployment:
```bash
npx cdk deploy --profile NDX/InnovationSandboxHub
```

Monitor CloudFormation and Lambda logs for successful origin addition.

## Notes

- **No `cdk import` required**: Distribution stays outside CloudFormation
- **OAC reuse**: Uses existing OAC E3P8MA1G9Y5BYE for security consistency
- **Lambda bundling**: CDK bundles Lambda with dependencies automatically
- **CloudFront region**: Lambda uses `us-east-1` for CloudFront API (global service)
- **No cache behavior changes**: Origin added but not yet routing traffic (requires Story 2.x)
- **Distribution update time**: CloudFront updates take ~5-15 minutes to propagate

## Risk Mitigation

### ISB Template Conflicts
- Distribution NOT managed by CloudFormation
- ISB can still update distribution via its own mechanisms
- Lambda adds origin without removing ISB-managed origins
- No CloudFormation drift detection conflicts

### Lambda Failure Recovery
- Custom Resource framework handles Lambda failures
- CloudFormation receives proper FAILED responses
- Stack rolls back automatically on failure
- S3 bucket retained even on rollback

### Manual Rollback
If needed, manually remove origin:
```bash
# Get current config
aws cloudfront get-distribution-config --id E3THG4UHYDHVWP > config.json

# Edit config.json: remove ndx-static-prod-origin from Origins.Items

# Update distribution
aws cloudfront update-distribution \
  --id E3THG4UHYDHVWP \
  --distribution-config file://config.json \
  --if-match <ETag>
```
