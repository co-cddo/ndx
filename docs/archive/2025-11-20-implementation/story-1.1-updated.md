# Story 1.1: Import Existing CloudFront Distribution (Updated)

## Original Approach (Blocked)
Used `Distribution.fromDistributionAttributes()` - creates read-only reference, cannot add origins.

## Updated Approach (Unblocking)
Use `CfnDistribution` L1 construct with full config, then import via `cdk import`.

## Implementation Complete

### Code Changes
File: `/Users/cns/httpdocs/cddo/ndx/infra/lib/ndx-stack.ts`

Changed from:
```typescript
cloudfront.Distribution.fromDistributionAttributes(
  this,
  'ImportedDistribution',
  {
    distributionId: 'E3THG4UHYDHVWP',
    domainName: 'd7roov8fndsis.cloudfront.net'
  }
);
```

To:
```typescript
const cfnDistribution = new cloudfront.CfnDistribution(this, 'ImportedDistribution', {
  distributionConfig: {
    enabled: true,
    comment: 'ISB CloudFront Distribution',
    defaultRootObject: 'index.html',
    httpVersion: 'http2',
    ipv6Enabled: false,
    priceClass: 'PriceClass_All',

    origins: [
      // S3Origin - existing
      // API Gateway origin - existing
    ],

    defaultCacheBehavior: { ... },
    cacheBehaviors: [ ... ],
    logging: { ... },
    viewerCertificate: { ... },
    restrictions: { ... },
  },
});
```

Full configuration mirrors existing CloudFront distribution E3THG4UHYDHVWP exactly.

### Validation

1. **TypeScript Build**: ✅ Passes
   ```bash
   cd /Users/cns/httpdocs/cddo/ndx/infra
   npm run build
   ```

2. **CDK Synthesis**: ✅ Valid CloudFormation
   ```bash
   npx cdk synth --profile NDX/InnovationSandboxHub
   ```

3. **CloudFormation Resource**: ✅ Includes `AWS::CloudFront::Distribution`

## Next Step: Run Import

### Import Command
```bash
cd /Users/cns/httpdocs/cddo/ndx
./docs/import-command.sh
```

Or manually:
```bash
cd /Users/cns/httpdocs/cddo/ndx/infra
npx cdk import --profile NDX/InnovationSandboxHub NdxStatic
# When prompted: E3THG4UHYDHVWP
```

### Expected Results
- CloudFormation stack `NdxStatic` manages distribution
- Distribution status remains "Deployed"
- Production site remains accessible
- `cdk diff` shows no changes after import (idempotent)

## Post-Import

After successful import:
1. Update sprint-status.yaml:
   - `1-1`: `ready-for-import` -> `done`
   - `1-2`: `blocked-on-import` -> `ready-for-dev`

2. Story 1.2 can now add new origin to managed distribution

## Risk Acceptance

User accepts: ISB template updates to distribution may conflict with NDX stack.

Mitigation:
- Monitor ISB release notes
- `cdk diff` will detect unexpected changes
- Can remove distribution from stack if conflicts arise
- Distribution deletion protected (RETAIN policy)

## Technical Notes

- L1 (CfnDistribution) provides full control for modifications
- Import brings existing resource under CloudFormation management
- CallerReference omitted (CloudFormation auto-generates)
- Distribution config matches AWS API exactly
- No changes to distribution during import (safe operation)

## Acceptance Criteria

- [x] CfnDistribution defined with full config
- [x] TypeScript compiles successfully
- [x] CDK synth generates valid CloudFormation
- [x] CloudFormation includes AWS::CloudFront::Distribution resource
- [x] Configuration matches existing distribution exactly
- [ ] Import command ready to run (awaiting execution)
- [ ] Distribution variable available for Story 1.2 modifications

## Files Created

1. `/Users/cns/httpdocs/cddo/ndx/infra/lib/ndx-stack.ts` - Updated
2. `/Users/cns/httpdocs/cddo/ndx/docs/cdk-import-guide.md` - Full import guide
3. `/Users/cns/httpdocs/cddo/ndx/docs/import-command.sh` - Automated import script
4. `/Users/cns/httpdocs/cddo/ndx/docs/story-1.2-implementation.md` - Ready for Story 1.2
