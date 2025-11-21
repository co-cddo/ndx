# CloudFront Distribution Import Guide

## Overview
This guide documents the process to import existing CloudFront distribution E3THG4UHYDHVWP into CloudFormation management via CDK.

## Context
- **Distribution ID**: E3THG4UHYDHVWP
- **Current State**: Deployed by AWS Innovation Sandbox template, not managed by CloudFormation
- **Goal**: Bring under NDX CloudFormation stack management to enable origin additions
- **Risk**: User accepts ISB updates may conflict with NDX stack changes

## Prerequisites
1. Story 1.1 code updated: CfnDistribution L1 construct defines current config
2. AWS credentials configured: `NDX/InnovationSandboxHub` profile
3. CDK synth passes validation

## Import Process

### Step 1: Verify CDK Synthesis
```bash
cd /Users/cns/httpdocs/cddo/ndx/infra
npx cdk synth --profile NDX/InnovationSandboxHub
```

Expected: CloudFormation template includes `AWS::CloudFront::Distribution` resource

### Step 2: Run CDK Import
```bash
cd /Users/cns/httpdocs/cddo/ndx/infra
npx cdk import --profile NDX/InnovationSandboxHub NdxStatic
```

### Step 3: Provide Distribution ID When Prompted
When prompted:
```
Import NdxStatic/ImportedDistribution (AWS::CloudFront::Distribution)
Enter the identifier (Distribution ID):
```

Enter: `E3THG4UHYDHVWP`

### Step 4: Confirm Import
CDK will show the resource to be imported. Confirm to proceed.

Expected output:
```
NdxStatic/ImportedDistribution: importing... [1/1]
NdxStatic/ImportedDistribution: import complete
```

### Step 5: Verify Import
```bash
# Check stack status
aws cloudformation describe-stacks \
  --stack-name NdxStatic \
  --profile NDX/InnovationSandboxHub \
  --query 'Stacks[0].StackStatus'

# Expected: CREATE_COMPLETE or UPDATE_COMPLETE

# Verify distribution still works
aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.Status'

# Expected: Deployed
```

### Step 6: Test No Changes
```bash
cd /Users/cns/httpdocs/cddo/ndx/infra
npx cdk diff --profile NDX/InnovationSandboxHub
```

Expected: No differences (idempotent check)

## Post-Import: Adding New Origin (Story 1.2)

After successful import, Story 1.2 can add the new S3 origin by modifying the `origins` array in `ndx-stack.ts`:

```typescript
origins: [
  {
    id: 'S3Origin',
    // ... existing origin config
  },
  {
    id: 'InnovationSandboxComputeCloudFrontUiApiIsbCloudFrontDistributionOrigin2A994B75A',
    // ... existing API Gateway origin config
  },
  {
    // NEW ORIGIN - Story 1.2
    id: 'ndx-static-prod-origin',
    domainName: 'ndx-static-prod.s3.us-west-2.amazonaws.com',
    originPath: '',
    connectionAttempts: 3,
    connectionTimeout: 10,
    originAccessControlId: 'E3P8MA1G9Y5BYE',
    s3OriginConfig: {
      originAccessIdentity: '',
    },
    originShield: {
      enabled: false,
    },
  },
],
```

## Rollback

If import causes issues, rollback by:

1. **Delete CloudFormation stack** (does NOT delete distribution):
   ```bash
   aws cloudformation delete-stack \
     --stack-name NdxStatic \
     --profile NDX/InnovationSandboxHub
   ```

2. **Verify distribution still exists**:
   ```bash
   aws cloudfront get-distribution \
     --id E3THG4UHYDHVWP \
     --profile NDX/InnovationSandboxHub
   ```

3. **Revert code changes**:
   ```bash
   git checkout HEAD -- infra/lib/ndx-stack.ts
   ```

## Risk Management

### ISB Template Updates
- Risk: ISB updates to distribution will conflict with NDX CloudFormation stack
- Mitigation: Monitor ISB release notes, coordinate updates
- Detection: CDK diff will show unexpected changes
- Resolution: Manual reconciliation or remove distribution from NDX stack

### Distribution Deletion Protection
- CloudFormation stack deletion does NOT delete imported distribution
- Distribution has DeletionPolicy: Retain (implicit for imported resources)
- Safe to delete/recreate stack without affecting live distribution

## Success Criteria

- [ ] `cdk import` completes successfully
- [ ] CloudFormation stack shows distribution as managed resource
- [ ] Distribution status remains "Deployed"
- [ ] Production site remains accessible
- [ ] `cdk diff` shows no changes after import
- [ ] Story 1.2 unblocked (can add origins to managed distribution)

## Next Steps

After successful import:
1. Update Story 1.2 status: `blocked` -> `ready-for-dev`
2. Implement Story 1.2: Add ndx-static-prod origin
3. Deploy with `cdk deploy`
