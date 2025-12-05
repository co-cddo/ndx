#!/bin/bash
# CDK Import Command for CloudFront Distribution E3THG4UHYDHVWP
# Run this after Story 1.1 code changes are complete

set -e

echo "========================================"
echo "CloudFront Distribution Import"
echo "========================================"
echo ""
echo "Distribution: E3THG4UHYDHVWP"
echo "Stack: NdxStatic"
echo "Profile: NDX/InnovationSandboxHub"
echo ""

# Navigate to infra directory
cd "$(dirname "$0")/../infra" || exit 1

# Step 1: Verify synthesis
echo "Step 1: Verifying CDK synthesis..."
if ! npx cdk synth --profile NDX/InnovationSandboxHub > /dev/null 2>&1; then
  echo "❌ CDK synth failed. Fix errors before import."
  exit 1
fi
echo "✅ CDK synth successful"
echo ""

# Step 2: Run import
echo "Step 2: Running cdk import..."
echo ""
echo "When prompted, enter Distribution ID: E3THG4UHYDHVWP"
echo ""
echo "Press Enter to continue..."
read -r

npx cdk import --profile NDX/InnovationSandboxHub NdxStatic

# Step 3: Verify import
echo ""
echo "Step 3: Verifying import..."

# Check stack status
STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name NdxStatic \
  --profile NDX/InnovationSandboxHub \
  --query 'Stacks[0].StackStatus' \
  --output text 2> /dev/null || echo "NOT_FOUND")

if [ "$STACK_STATUS" == "NOT_FOUND" ]; then
  echo "❌ CloudFormation stack not found. Import may have failed."
  exit 1
fi

echo "CloudFormation Stack Status: $STACK_STATUS"

# Check distribution status
DIST_STATUS=$(aws cloudfront get-distribution \
  --id E3THG4UHYDHVWP \
  --profile NDX/InnovationSandboxHub \
  --query 'Distribution.Status' \
  --output text 2> /dev/null || echo "ERROR")

echo "CloudFront Distribution Status: $DIST_STATUS"

if [ "$DIST_STATUS" != "Deployed" ]; then
  echo "⚠️  Distribution not in Deployed state. Wait for propagation."
fi

# Step 4: Verify no drift
echo ""
echo "Step 4: Verifying no configuration drift..."
DIFF_OUTPUT=$(npx cdk diff --profile NDX/InnovationSandboxHub 2>&1)

if echo "$DIFF_OUTPUT" | grep -q "There were no differences"; then
  echo "✅ No drift detected (idempotent)"
else
  echo "⚠️  Differences detected:"
  echo "$DIFF_OUTPUT"
fi

echo ""
echo "========================================"
echo "✅ Import Process Complete"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Update sprint-status.yaml: 1-1 -> done, 1-2 -> ready-for-dev"
echo "2. Implement Story 1.2: Add ndx-static-prod origin"
echo "3. Deploy with: cdk deploy --profile NDX/InnovationSandboxHub"
echo ""
