# ADR-043: Lambda Permissions Scoping

## Status
Accepted

## Context
The NDX Signup Lambda needs to access AWS IAM Identity Center (formerly SSO) to create user accounts. Identity Center resides in the ISB (Infrastructure Sandbox) account, not the NDX account where the Lambda runs.

## Decision
1. **Scoped IAM permissions**: Lambda permissions are scoped to specific Identity Store ID and Group ID, not wildcards
2. **Cross-account access**: Lambda assumes a role in the ISB account (`ndx-signup-cross-account-role`) rather than having direct access
3. **External ID**: Role assumption requires an external ID for additional security
4. **Specific actions only**: Only `CreateUser`, `ListUsers`, `DescribeUser`, and `CreateGroupMembership` are permitted

## Consequences
- **Security**: No wildcard permissions; Lambda cannot access other Identity Stores or groups
- **Operational**: Environment variables `IDENTITY_STORE_ID`, `GROUP_ID`, and `CROSS_ACCOUNT_ROLE_ARN` must be configured correctly
- **Audit**: All actions are scoped and can be traced to specific resources

## Implementation
- IAM role: `infra-signup/isb-cross-account-role.yaml`
- Lambda configuration: `infra-signup/lib/signup-stack.ts`
- Credential handling: `infra-signup/lib/lambda/signup/identity-store-service.ts`
