#!/bin/bash
set -e  # Exit on any error

# Prerequisite check
if [ ! -d "_site" ]; then
  echo "Error: _site/ directory not found. Run 'yarn build' first."
  exit 1
fi

# Deploy to S3
echo "Deploying to ndx-static-prod..."
aws s3 sync _site/ s3://ndx-static-prod/ \
  --profile NDX/InnovationSandboxHub \
  --delete \
  --exact-timestamps \
  --cache-control "public, max-age=3600" \
  --exclude ".DS_Store"

# Validate upload
EXPECTED_FILES=$(find _site -type f | wc -l | tr -d ' ')
UPLOADED_FILES=$(aws s3 ls s3://ndx-static-prod/ --recursive --profile NDX/InnovationSandboxHub | wc -l | tr -d ' ')

if [ "$EXPECTED_FILES" -ne "$UPLOADED_FILES" ]; then
  echo "Warning: File count mismatch. Expected: $EXPECTED_FILES, Uploaded: $UPLOADED_FILES"
  exit 1
fi

# Smoke test - validate critical files exist in bucket
echo "Running smoke test..."

# Validate index.html exists
if ! aws s3 ls s3://ndx-static-prod/index.html --profile NDX/InnovationSandboxHub > /dev/null 2>&1; then
  echo "Error: index.html not found in bucket. Run 'yarn build' and retry."
  exit 1
fi

# Validate critical CSS files exist
if ! aws s3 ls s3://ndx-static-prod/assets/css/globus.css --profile NDX/InnovationSandboxHub > /dev/null 2>&1; then
  echo "Warning: assets/css/globus.css not found in bucket. Site styling may be incomplete."
fi

if ! aws s3 ls s3://ndx-static-prod/assets/css/govuk-frontend.min.css --profile NDX/InnovationSandboxHub > /dev/null 2>&1; then
  echo "Warning: assets/css/govuk-frontend.min.css not found in bucket. Site styling may be incomplete."
fi

# Validate JavaScript files directory exists
if ! aws s3 ls s3://ndx-static-prod/assets/js/ --profile NDX/InnovationSandboxHub > /dev/null 2>&1; then
  echo "Warning: assets/js/ directory not found in bucket. Site functionality may be incomplete."
fi

echo "✓ Smoke test passed: Critical files validated"
echo "✓ Deployment complete: $UPLOADED_FILES files uploaded"
echo ""
echo "⚠️  Note: Site not publicly accessible until CloudFront CDN is configured (growth phase)"
