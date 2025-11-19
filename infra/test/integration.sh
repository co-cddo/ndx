#!/bin/bash
set -e

echo "Running integration test..."

# Deploy stack with test context
cdk deploy NdxStaticStack --context env=test --profile NDX/InnovationSandboxHub --require-approval never

# Verify deployment
aws s3 ls s3://ndx-static-test/ --profile NDX/InnovationSandboxHub > /dev/null

# Cleanup
cdk destroy NdxStaticStack --context env=test --profile NDX/InnovationSandboxHub --force

echo "✓ Integration test passed"
