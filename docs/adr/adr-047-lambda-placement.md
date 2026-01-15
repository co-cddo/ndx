# ADR-047: Lambda Placement in NDX Repository

## Status
Accepted

## Context
The signup feature needs a Lambda function to handle API requests. We needed to decide whether to place the Lambda in the NDX repository or the ISB (Infrastructure Sandbox) repository where Identity Center resides.

## Decision
1. **NDX repository**: Lambda lives in `infra-signup/` directory of the NDX codebase
2. **Cross-account access**: Lambda assumes role in ISB account rather than running there
3. **Shared deployment**: Lambda deploys with NDX infrastructure, not separately

## Consequences
- **Cohesion**: Signup feature (frontend + backend) is in one repository
- **Type sharing**: Lambda can import types from frontend via path mapping
- **CI/CD**: Single pipeline deploys both static site and Lambda
- **Cross-account**: Requires IAM role in ISB account (`ndx-signup-cross-account-role`)

## Alternatives Considered
- **Lambda in ISB**: Would avoid cross-account access but split the feature across repos
- **Separate repository**: Would allow independent deployment but complicate type sharing

## Implementation
- Lambda code: `infra-signup/lib/lambda/signup/`
- CDK stack: `infra-signup/lib/signup-stack.ts`
- Cross-account role: `infra-signup/isb-cross-account-role.yaml`
