#!/bin/bash
# Pre-Deployment Validation Script for NDX CloudFront Infrastructure
# Validates all critical requirements before CDK deployment
# Exit code: 0 = all checks passed, 1 = one or more checks failed

# Disable exit on error to allow all checks to run
set +e

echo "==================================="
echo "Pre-Deployment Checklist"
echo "==================================="
echo ""

ERRORS=0
PROFILE="NDX/InnovationSandboxHub"

# Check 1: Dependencies installed
echo "✓ Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "❌ Dependencies not installed (node_modules directory not found)"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Dependencies installed"
fi

# Check 2: Node.js version
echo ""
echo "✓ Validating Node.js version..."
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js version must be >= 20.17.0 (current: $(node -v))"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Node.js version compatible ($(node -v))"
fi

# Check 3: TypeScript compilation
echo ""
echo "✓ Checking TypeScript compilation..."
if ! yarn build 2>&1 | grep -q "Successfully compiled\|Done in"; then
  echo "❌ TypeScript compilation failed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ TypeScript compiles cleanly"
fi

# Check 4: Linting clean
echo ""
echo "✓ Running linter..."
if ! yarn lint > /dev/null 2>&1; then
  echo "❌ Linting errors found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Linting clean"
fi

# Check 5: Tests pass
echo ""
echo "✓ Running tests..."
if ! yarn test --silent > /dev/null 2>&1; then
  echo "❌ Tests failed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ All tests pass"
fi

# Check 6: CDK synth succeeds
echo ""
echo "✓ Validating CDK synthesis..."
if ! cdk synth --profile "$PROFILE" --quiet > /dev/null 2>&1; then
  echo "❌ CDK synth failed"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ CDK synthesis successful"
fi

# Check 7: AWS credentials valid
echo ""
echo "✓ Validating AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query 'Account' --output text 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$ACCOUNT_ID" ]; then
  echo "❌ AWS credentials invalid or expired"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ AWS credentials valid (Account: $ACCOUNT_ID)"
fi

# Check 8: CDK Bootstrap
echo ""
echo "✓ Checking CDK bootstrap..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --profile "$PROFILE" > /dev/null 2>&1; then
  echo "❌ CDK not bootstrapped (CDKToolkit stack not found)"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ CDK bootstrapped"
fi

# Check 9: CloudFront distribution health
echo ""
echo "✓ Checking CloudFront distribution health..."
DIST_STATUS=$(aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile "$PROFILE" --query 'Distribution.Status' --output text 2>/dev/null)
if [ "$DIST_STATUS" != "Deployed" ]; then
  echo "❌ Distribution E3THG4UHYDHVWP not healthy (status: $DIST_STATUS)"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Distribution E3THG4UHYDHVWP status: Deployed"
fi

# Check 10: Origin Access Control exists
echo ""
echo "✓ Validating Origin Access Control..."
if ! aws cloudfront get-origin-access-control --id E3P8MA1G9Y5BYE --profile "$PROFILE" > /dev/null 2>&1; then
  echo "❌ Origin Access Control E3P8MA1G9Y5BYE not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Origin Access Control E3P8MA1G9Y5BYE exists"
fi

# Final summary
echo ""
echo "==================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed!"
  echo "Ready to deploy: cdk deploy --profile $PROFILE"
  echo "==================================="
  exit 0
else
  echo "❌ $ERRORS check(s) failed"
  echo "Fix errors before deploying"
  echo "==================================="
  exit 1
fi
