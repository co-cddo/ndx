#!/bin/bash
# Integration Test for NDX CloudFront Origin Routing
#
# Purpose: Validates CloudFront cookie-based routing infrastructure in real AWS environment
# - Deploys CDK stack to AWS
# - Validates CloudFront distribution configuration
# - Verifies all three origins present (S3Origin, API-Gateway, ndx-static-prod)
# - Confirms CloudFront Function deployment
#
# Prerequisites:
# - AWS CLI v2 configured with NDX/InnovationSandboxHub profile
# - CDK CLI installed (aws-cdk@2.x)
# - Valid AWS credentials
# - CDK bootstrapped in account 568672915267/us-west-2
#
# Usage:
#   ./infra/test/integration.sh
#
# Exit Codes:
#   0: All tests passed
#   1: One or more tests failed
#
# Cleanup Strategy: Leaves stack deployed (Option 1)
# - Integration test validates existing production infrastructure
# - No automated cleanup to preserve working state
# - Manual cleanup not recommended (production distribution)

set -e # Exit immediately if any command fails

PROFILE="NDX/InnovationSandboxHub"
DISTRIBUTION_ID="E3THG4UHYDHVWP"
ERRORS=0

echo "==================================="
echo "NDX CloudFront Integration Test"
echo "==================================="
echo ""

#
# Step 1: Environment Validation
#
echo "Step 1: Validating environment prerequisites..."
echo ""

# Check AWS credentials
echo "✓ Checking AWS credentials..."
if ! aws sts get-caller-identity --profile "$PROFILE" > /dev/null 2>&1; then
  echo "❌ AWS credentials invalid or expired for profile: $PROFILE"
  echo ""
  echo "Fix: Run 'aws sso login --profile $PROFILE' or configure credentials"
  exit 1
fi

ACCOUNT=$(aws sts get-caller-identity --profile "$PROFILE" --query 'Account' --output text)
echo "✅ AWS credentials valid (Account: $ACCOUNT)"
echo ""

# Check CDK bootstrap
echo "✓ Checking CDK bootstrap..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --profile "$PROFILE" > /dev/null 2>&1; then
  echo "❌ CDKToolkit stack not found - CDK not bootstrapped"
  echo ""
  echo "Fix: Run 'cdk bootstrap --profile $PROFILE'"
  exit 1
fi
echo "✅ CDK bootstrapped"
echo ""

# Check CloudFront distribution exists
echo "✓ Checking CloudFront distribution..."
if ! aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --profile "$PROFILE" > /dev/null 2>&1; then
  echo "❌ CloudFront distribution $DISTRIBUTION_ID not found"
  echo ""
  echo "Fix: Verify distribution ID or run Epic 1 & 2 stories to deploy infrastructure"
  exit 1
fi
echo "✅ CloudFront distribution exists"
echo ""

#
# Step 2: CDK Deployment
#
echo "Step 2: Deploying CDK stack..."
echo ""

# Navigate to infra directory relative to script location (works from any directory)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# Compile TypeScript before deployment (learned from Story 3.1)
echo "✓ Compiling TypeScript..."
if ! yarn build > /dev/null 2>&1; then
  echo "❌ TypeScript compilation failed"
  echo ""
  echo "Fix: Run 'cd infra && yarn build' and resolve compilation errors"
  exit 1
fi
echo "✅ TypeScript compiled"
echo ""

# Deploy stack
echo "✓ Deploying stack..."
if ! cdk deploy --profile "$PROFILE" --require-approval never 2>&1 | tee /tmp/cdk-deploy.log; then
  echo ""
  echo "❌ CDK deployment failed"
  echo ""
  echo "CloudFormation Events:"
  aws cloudformation describe-stack-events \
    --stack-name NdxStaticStack \
    --profile "$PROFILE" \
    --max-items 10 \
    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[Timestamp,ResourceType,ResourceStatus,ResourceStatusReason]' \
    --output table 2> /dev/null || echo "Could not retrieve stack events"

  exit 1
fi

echo ""
echo "✅ CDK deployment succeeded"
echo ""

# Wait for initial propagation
echo "✓ Waiting 30 seconds for initial CloudFront propagation..."
sleep 30
echo ""

cd ..

#
# Step 3: CloudFront Resource Validation
#
echo "Step 3: Validating CloudFront resources..."
echo ""

# Test 1: Verify distribution status
echo "Test 1: Verifying distribution status..."
STATUS=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --profile "$PROFILE" \
  --query 'Distribution.Status' \
  --output text)

if [ "$STATUS" != "Deployed" ]; then
  echo "❌ Distribution not in Deployed state: $STATUS"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Distribution deployed (Status: $STATUS)"
fi
echo ""

# Test 2: Verify origins count
echo "Test 2: Verifying origins count..."
ORIGINS=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --profile "$PROFILE" \
  --query 'length(Distribution.DistributionConfig.Origins)')

if [ "$ORIGINS" -lt 3 ]; then
  echo "❌ Expected at least 3 origins, found: $ORIGINS"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ All origins present ($ORIGINS total)"
fi
echo ""

# Test 3: Verify new origin exists
echo "Test 3: Verifying ndx-static-prod origin..."
NEW_ORIGIN=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --profile "$PROFILE" \
  --query 'Distribution.DistributionConfig.Origins[?Id==`ndx-static-prod-origin`] | length(@)')

if [ "$NEW_ORIGIN" != "1" ]; then
  echo "❌ ndx-static-prod-origin not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ New origin configured (ndx-static-prod-origin)"
fi
echo ""

# Test 4: Verify CloudFront Function exists
echo "Test 4: Verifying CloudFront Function..."
FUNCTION=$(aws cloudfront list-functions \
  --profile "$PROFILE" \
  --query 'FunctionList.Items[?Name==`ndx-cookie-router`] | length(@)')

if [ "$FUNCTION" != "1" ]; then
  echo "❌ CloudFront Function 'ndx-cookie-router' not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ CloudFront Function deployed (ndx-cookie-router)"
fi
echo ""

#
# Step 4: Test Results and Manual Validation Instructions
#
echo "==================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ Integration Test PASSED"
  echo "==================================="
  echo ""
  echo "All automated checks passed successfully:"
  echo "- Environment validated (AWS credentials, CDK bootstrap)"
  echo "- CDK deployment succeeded"
  echo "- CloudFront distribution deployed"
  echo "- All 3 origins present"
  echo "- New origin (ndx-static-prod) configured"
  echo "- CloudFront Function deployed"
  echo ""
  echo "📋 Manual Validation Required:"
  echo "-------------------------------"
  echo "Cookie-based routing must be validated manually in browser:"
  echo ""
  echo "1. Browse to https://ndx.digital.cabinet-office.gov.uk/"
  echo "   → Should see existing site (without cookie)"
  echo ""
  echo "2. Open browser DevTools Console and set cookie:"
  echo "   document.cookie = 'NDX=true; path=/'"
  echo ""
  echo "3. Reload page"
  echo "   → Should see new origin content (ndx-static-prod bucket)"
  echo ""
  echo "4. Clear cookie in Console:"
  echo "   document.cookie = 'NDX=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'"
  echo ""
  echo "5. Reload page"
  echo "   → Should revert to existing site"
  echo ""
  echo "Note: Full CloudFront propagation may take 10-15 minutes for global effect."
  echo ""
  exit 0
else
  echo "❌ Integration Test FAILED"
  echo "==================================="
  echo ""
  echo "$ERRORS test(s) failed. See errors above for details."
  echo ""
  echo "Common issues:"
  echo "- CloudFront propagation not complete (wait 10-15 minutes)"
  echo "- CDK deployment partially failed (check CloudFormation console)"
  echo "- Origin configuration incorrect (verify in AWS Console)"
  echo ""
  exit 1
fi
