# NDX Signup Infrastructure

AWS CDK infrastructure for the NDX signup feature.

## Overview

This package contains:

- **Lambda function** for `/signup-api/*` endpoints
- **CloudFront behaviour** configuration
- **IAM permissions** scoped to specific Identity Center group
- **EventBridge integration** for Slack alerting

## Prerequisites

- Node.js 20.x or later
- Yarn 4.5.0 or later (npm is not supported)
- AWS CDK CLI 2.215.0
- AWS credentials configured

## Setup

```bash
# Install dependencies (from infra-signup directory)
yarn install

# Build TypeScript
yarn build

# Run tests
yarn test
```

## Type Sharing

This package imports shared types from the client-side signup feature:

```typescript
import type { SignupRequest, ApiError } from "@ndx/signup-types"
```

The path mapping is configured in `tsconfig.json`:

```json
{
  "paths": {
    "@ndx/signup-types": ["../src/signup/types.ts"]
  }
}
```

**Important:** Never duplicate types - always import from `@ndx/signup-types`.

## Architecture Decisions

See [docs/adr/](../docs/adr/) for detailed Architecture Decision Records:

- **[ADR-043](../docs/adr/adr-043-lambda-permissions.md):** Lambda permissions scoped to specific group ID and identity store ID
- **[ADR-044](../docs/adr/adr-044-domain-caching.md):** Domain allowlist caching (5-minute TTL)
- **[ADR-045](../docs/adr/adr-045-csrf-protection.md):** CSRF protection via custom header
- **[ADR-046](../docs/adr/adr-046-rate-limiting.md):** Rate limiting via CloudFront WAF
- **[ADR-047](../docs/adr/adr-047-lambda-placement.md):** Lambda in NDX repo (not ISB)
- **[ADR-048](../docs/adr/adr-048-type-sharing.md):** Shared types via tsconfig paths

## Required Configuration

The signup Lambda requires IAM Identity Center configuration. Provide these via environment variables or CDK context:

### Environment Variables

| Variable                 | Required | Description                                        | Example                                                        |
| ------------------------ | -------- | -------------------------------------------------- | -------------------------------------------------------------- |
| `IDENTITY_STORE_ID`      | Yes      | IAM Identity Store ID from IAM Identity Center     | `d-9267e1e371`                                                 |
| `GROUP_ID`               | Yes      | UUID of the NDX Users group in IAM Identity Center | `a1b2c3d4-e5f6-...`                                            |
| `CROSS_ACCOUNT_ROLE_ARN` | Yes      | ARN of the cross-account role in the ISB account   | `arn:aws:iam::955063685555:role/ndx-signup-cross-account-role` |
| `AWS_REGION`             | No       | AWS region for STS and Identity Store clients      | `us-west-2` (default)                                          |
| `SSO_INSTANCE_ARN`       | No       | SSO Instance ARN (for future password setup flow)  | `arn:aws:sso:::instance/...`                                   |

**Finding the values:**

1. **IDENTITY_STORE_ID**: In AWS Console → IAM Identity Center → Settings → Identity source
2. **GROUP_ID**: In AWS Console → IAM Identity Center → Groups → select group → copy Group ID
3. **CROSS_ACCOUNT_ROLE_ARN**: Output from deploying `isb-cross-account-role.yaml` to ISB account

### CDK Context

Alternatively, pass via CDK context:

```bash
yarn cdk synth \
  -c identityStoreId=d-xxxxxxxxxx \
  -c groupId=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### IAM Permissions

The Lambda is configured with scoped IAM permissions (ADR-043):

- `identitystore:CreateUser` - scoped to specific identity store
- `identitystore:ListUsers` - scoped to specific identity store
- `identitystore:DescribeUser` - scoped to specific identity store
- `identitystore:CreateGroupMembership` - scoped to specific group

No wildcard permissions are used.

## Deployment

```bash
# Set required environment variables
export IDENTITY_STORE_ID=d-xxxxxxxxxx
export GROUP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Synthesize CloudFormation template
yarn synth

# Deploy to AWS (requires credentials)
yarn deploy
```

## Project Structure

```
infra-signup/
├── bin/
│   └── signup.ts           # CDK app entry point
├── lib/
│   ├── signup-stack.ts     # Stack definition
│   └── lambda/signup/
│       ├── handler.ts      # Lambda handler
│       └── services.ts     # Domain logic
├── package.json
├── tsconfig.json
└── README.md
```

## Cross-Account Architecture

The signup feature uses cross-account role assumption:

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     NDX Account (568672915267)  │     │     ISB Account (955063685555)  │
│                                 │     │                                 │
│  ┌─────────────────────────┐    │     │  ┌─────────────────────────┐    │
│  │   Signup Lambda         │────┼──►──┼──│  ndx-signup-cross-      │    │
│  │   (ndx-signup)          │ STS│     │  │  account-role           │    │
│  └─────────────────────────┘    │     │  └───────────┬─────────────┘    │
│                                 │     │              │                  │
│  ┌─────────────────────────┐    │     │  ┌───────────▼─────────────┐    │
│  │   CloudFront            │    │     │  │  IAM Identity Center    │    │
│  │   (ndx.digital...)      │    │     │  │  (Identity Store)       │    │
│  └─────────────────────────┘    │     │  └─────────────────────────┘    │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

- **Lambda** runs in NDX account, invoked via CloudFront Function URL
- **Identity Store** resides in ISB account (org management account)
- Lambda assumes `ndx-signup-cross-account-role` in ISB to access Identity Store

## CI/CD Deployment

CI is configured in `.github/workflows/infra.yaml` with these jobs:

| Job                             | Account            | Description                            |
| ------------------------------- | ------------------ | -------------------------------------- |
| `signup-infra-unit-tests`       | -                  | Runs tests for `infra-signup/` changes |
| `signup-cdk-deploy`             | NDX (568672915267) | Deploys Lambda via CDK                 |
| `isb-cross-account-role-deploy` | ISB (955063685555) | Deploys IAM role via CloudFormation    |

### Prerequisites for CI

1. **GitHub Secrets:**
   - `ISB_NDX_USERS_GROUP_ID` - The Group ID for NDX users in IAM Identity Center

2. **GitHub Environments:**
   - `infrastructure` - For NDX account deployments (existing)
   - `isb-infrastructure` - For ISB account deployments (new)

3. **AWS OIDC Configuration in ISB Account:**

   Deploy the GitHub Actions OIDC role to ISB account:

   ```bash
   # Switch to ISB account credentials
   aws cloudformation deploy \
     --template-file infra-signup/isb-github-actions-role.yaml \
     --stack-name github-actions-isb-oidc \
     --capabilities CAPABILITY_NAMED_IAM \
     --region us-west-2
   ```

   This creates:
   - GitHub OIDC provider (if not existing)
   - `GitHubActions-ISB-InfraDeploy` role with CloudFormation + IAM permissions

### Manual Deployment

For initial setup or emergency deployments:

```bash
# Deploy Lambda to NDX account
cd infra-signup
yarn deploy

# Deploy cross-account role to ISB account (requires ISB credentials)
aws cloudformation deploy \
  --template-file isb-cross-account-role.yaml \
  --stack-name ndx-signup-cross-account-role \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides GroupId=<GROUP_ID>
```

## Related Stories

- Story 1.1: Project scaffold and shared types
- Story 1.2: Signup Lambda infrastructure
- Story 1.3: Domain list API
- Story 1.4: Signup API core
