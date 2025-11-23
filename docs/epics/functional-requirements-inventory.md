# Functional Requirements Inventory

## CloudFront Origin Management
- **FR1:** System can add `ndx-static-prod` S3 bucket as a new origin to CloudFront distribution E3THG4UHYDHVWP
- **FR2:** System can configure Origin Access Control for new S3 origin matching security of existing S3Origin
- **FR3:** System can define origin properties (connection timeout, read timeout, connection attempts) matching existing origins
- **FR4:** System can reference existing CloudFront distribution in CDK without recreating or modifying core distribution properties
- **FR5:** System preserves existing S3Origin completely unchanged (bucket, OAC, timeouts, protocol)
- **FR6:** System preserves API Gateway origin completely unchanged (endpoint, path, protocol, timeouts)

## Cookie-Based Routing Logic
- **FR7:** System can inspect incoming HTTP requests for `Cookie` header
- **FR8:** System can parse `Cookie` header to extract `NDX` cookie value
- **FR9:** System routes requests to `ndx-static-prod` origin when `NDX` cookie value equals `true` (exact match, case-sensitive)
- **FR10:** System routes requests to existing S3Origin when `NDX` cookie is missing
- **FR11:** System routes requests to existing S3Origin when `NDX` cookie exists but value is not `true`
- **FR12:** Routing logic executes for every request to default cache behavior (HTML pages, assets)
- **FR13:** Routing logic does NOT execute for API Gateway routes (preserves existing API routing)
- **FR14:** Routing function returns modified request with correct origin selection

## Routing Function Deployment
- **FR15:** System can deploy CloudFront Function (Option A) or Lambda@Edge function (Option B) containing routing logic
- **FR16:** Routing function code can be defined in CDK as part of infrastructure
- **FR17:** Routing function can be attached to default cache behavior as viewer-request or origin-request function
- **FR18:** Routing function deployment is part of CloudFront configuration update (single CDK deployment)
- **FR19:** CloudFront propagates function changes globally across all edge locations

## Cache Behavior Configuration
- **FR20:** System preserves all existing cache policy settings (TTL, compression, HTTPS redirect)
- **FR21:** System ensures cookies are forwarded to routing function (required for cookie inspection)
- **FR22:** System preserves existing viewer protocol policy (redirect-to-https)
- **FR23:** System preserves existing allowed HTTP methods configuration
- **FR24:** System preserves existing response headers policies if configured

## CDK Infrastructure Management
- **FR25:** CDK code can import existing CloudFront distribution by ID (E3THG4UHYDHVWP)
- **FR26:** CDK can modify CloudFront distribution configuration without recreating distribution
- **FR27:** Infrastructure changes can be validated via `cdk synth` before deployment
- **FR28:** Infrastructure changes can be previewed via `cdk diff` showing origin and function additions
- **FR29:** Infrastructure can be deployed via `cdk deploy` with zero service downtime
- **FR30:** CDK deployment is idempotent (re-running with no changes causes no AWS updates)

## Testing & Validation
- **FR31:** CDK tests can validate new S3 origin is added to distribution configuration
- **FR32:** CDK tests can validate API Gateway origin remains unchanged
- **FR33:** CDK tests can validate routing function code is syntactically valid
- **FR34:** CDK tests can validate cache behavior configuration preserves existing policies
- **FR35:** System can execute smoke tests post-deployment (manual cookie setting and verification)

## Rollback & Safety
- **FR36:** System can disable routing function via CloudFront configuration change
- **FR37:** System can remove new S3 origin from distribution if rollback needed
- **FR38:** System can revert to previous CloudFront configuration via CDK version control
- **FR39:** Failed CloudFront deployments can be investigated via CloudFormation events
- **FR40:** CloudFormation automatically rolls back failed CloudFront configuration changes

## Operational Monitoring
- **FR41:** CloudFront can emit metrics showing request counts per origin
- **FR42:** CloudFront can emit error rate metrics for each origin separately
- **FR43:** Routing function execution can be monitored via CloudWatch if needed (Lambda@Edge only)
- **FR44:** System can log routing decisions for debugging (optional, not required for MVP)

---
