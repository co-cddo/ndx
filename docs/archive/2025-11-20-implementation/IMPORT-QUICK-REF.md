# CloudFront Import - Quick Reference

## Run Import (One Command)

```bash
cd /Users/cns/httpdocs/cddo/ndx
./docs/import-command.sh
```

When prompted: **E3THG4UHYDHVWP**

## Manual Import (If Script Fails)

```bash
cd /Users/cns/httpdocs/cddo/ndx/infra
npx cdk import --profile NDX/InnovationSandboxHub NdxStatic
# Enter: E3THG4UHYDHVWP
```

## Success Check

```bash
# Stack exists
aws cloudformation describe-stacks --stack-name NdxStatic --profile NDX/InnovationSandboxHub

# Distribution still deployed
aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub

# No drift
cd /Users/cns/httpdocs/cddo/ndx/infra
npx cdk diff --profile NDX/InnovationSandboxHub
# Should show "no differences"
```

## After Import

1. Update status: `1-1: done`, `1-2: ready-for-dev`
2. Add new origin (see story-1.2-implementation.md)
3. Deploy: `cdk deploy --profile NDX/InnovationSandboxHub`

## Rollback

```bash
aws cloudformation delete-stack --stack-name NdxStatic --profile NDX/InnovationSandboxHub
git checkout HEAD -- infra/lib/ndx-stack.ts
```

Distribution will NOT be deleted (RETAIN policy).

## Files

- **Full Guide**: docs/cdk-import-guide.md
- **Story 1.1**: docs/story-1.1-updated.md
- **Story 1.2**: docs/story-1.2-implementation.md
- **Summary**: IMPORT-READY.md
