# FR Coverage Matrix

| FR | Description | Epic | Stories |
|----|-------------|------|---------|
| FR1 | Add ndx-static-prod as new origin to E3THG4UHYDHVWP | Epic 1 | Story 1.2 |
| FR2 | Configure OAC for new origin | Epic 1 | Story 1.2 |
| FR3 | Define origin properties matching existing | Epic 1 | Story 1.2 |
| FR4 | Reference existing distribution in CDK | Epic 1 | Story 1.1 |
| FR5 | Preserve existing S3Origin unchanged | Epic 1 | Story 1.3 |
| FR6 | Preserve API Gateway origin unchanged | Epic 1 | Story 1.3 |
| FR7 | Inspect Cookie header | Epic 2 | Story 2.1 |
| FR8 | Parse Cookie header for NDX value | Epic 2 | Story 2.1 |
| FR9 | Route to new origin when NDX=true | Epic 2 | Story 2.1, 2.6 |
| FR10 | Route to existing origin when cookie missing | Epic 2 | Story 2.1, 2.6 |
| FR11 | Route to existing origin when NDX≠true | Epic 2 | Story 2.1, 2.6 |
| FR12 | Execute routing for default cache behavior | Epic 2 | Story 2.5 |
| FR13 | NOT execute for API Gateway routes | Epic 2 | Story 2.5 |
| FR14 | Return modified request with origin | Epic 2 | Story 2.1 |
| FR15 | Deploy CloudFront Function | Epic 2 | Story 2.4 |
| FR16 | Define function code in CDK | Epic 2 | Story 2.4 |
| FR17 | Attach function to cache behavior | Epic 2 | Story 2.5 |
| FR18 | Function deployment in CDK update | Epic 2 | Story 2.6 |
| FR19 | Propagate function globally | Epic 2 | Story 2.6 |
| FR20 | Preserve cache policy settings | Epic 2 | Story 2.3 |
| FR21 | Forward cookies to function | Epic 2 | Story 2.3 |
| FR22 | Preserve viewer protocol policy | Epic 2 | Story 2.5 |
| FR23 | Preserve allowed HTTP methods | Epic 2 | Story 2.5 |
| FR24 | Preserve response headers policies | Epic 2 | Story 2.5 |
| FR25 | Import distribution by ID | Epic 1 | Story 1.1 |
| FR26 | Modify without recreating | Epic 1 | Story 1.1, 1.4 |
| FR27 | Validate via cdk synth | Epic 1 | Story 1.1, 1.2 |
| FR28 | Preview via cdk diff | Epic 1 | Story 1.2, 1.3 |
| FR29 | Deploy via cdk deploy with zero downtime | Epic 1 | Story 1.4 |
| FR30 | Idempotent deployment | Epic 1 | Story 1.4 |
| FR31 | CDK tests validate new origin | Epic 3 | Story 3.2 |
| FR32 | CDK tests validate API Gateway unchanged | Epic 3 | Story 3.2 |
| FR33 | Validate function code syntax | Epic 3 | Story 2.2, 3.1 |
| FR34 | Validate cache behavior config | Epic 3 | Story 3.2 |
| FR35 | Smoke tests post-deployment | Epic 3 | Story 2.6, 3.3 |
| FR36 | Disable function for rollback | Epic 3 | Story 3.4 |
| FR37 | Remove origin for rollback | Epic 3 | Story 3.4 |
| FR38 | Revert via version control | Epic 3 | Story 3.4 |
| FR39 | Investigate failures via CloudFormation | Epic 3 | Story 3.3, 3.5 |
| FR40 | Automatic CloudFormation rollback | Epic 1, Epic 2 | Story 1.4, 2.6 |
| FR41 | Metrics for request counts per origin | Epic 3 | Story 3.5 |
| FR42 | Metrics for error rates per origin | Epic 3 | Story 3.5 |
| FR43 | Monitor function execution (optional) | Epic 3 | Story 3.5 |
| FR44 | Log routing decisions (optional) | Epic 3 | Story 3.5 |

**Coverage Validation:** All 44 FRs mapped to stories ✓

---
