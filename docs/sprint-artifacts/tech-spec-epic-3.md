# Epic Technical Specification: Deployment Automation & Documentation

Date: 2025-11-19
Author: cns
Epic ID: 3
Status: Draft

---

## Overview

Epic 3 delivers deployment automation and comprehensive documentation for the NDX infrastructure project. This epic creates robust deployment scripts with error recovery, comprehensive testing infrastructure (snapshot tests, fine-grained assertions, integration tests), and living documentation that evolves with the system. The deployment automation enables reliable file uploads to S3 with validation and smoke testing, while the testing suite ensures infrastructure quality gates are met before any deployment.

This epic completes the infrastructure evolution by bridging the gap between infrastructure provisioning (Epic 1 & 2) and operational reliability through automation, testing, and maintainable documentation.

## Objectives and Scope

**In Scope:**
- Deployment script (`yarn deploy`) with error recovery and validation
- CDK infrastructure testing (Jest snapshots + fine-grained assertions)
- Integration testing for real AWS deployment validation
- Post-deployment smoke testing
- Living documentation with maintenance cadence
- ESLint integration for code quality
- Version control best practices

**Out of Scope:**
- CI/CD automation via GitHub Actions (deferred to growth phase)
- CloudFront CDN configuration (growth phase)
- OIDC keyless authentication (growth phase)
- Multi-environment deployment (partial: test context only)
- Automated rollback mechanisms (manual via CloudFormation only)

## System Architecture Alignment

Epic 3 aligns with the Infrastructure Architecture decisions:

**Deployment Pattern (ADR-006):**
- Manual deployment via `yarn deploy` for MVP
- Foundation ready for GitHub Actions OIDC in growth phase
- Clear separation: CDK manages infrastructure, deploy script manages files

**Testing Strategy:**
- Snapshot tests capture full CloudFormation template (ADR standard)
- Fine-grained assertions validate security-critical properties
- Integration tests catch real AWS environment issues
- Co-located tests (`lib/*.test.ts`) per CDR pattern (ADR-005)

**Quality Standards:**
- ESLint flat config with AWS CDK plugin (ADR-004)
- Living documentation with version tracking and review cadence
- Pre-commit validation through testing and linting

**Technology Stack:**
- Bash scripting for deployment automation
- AWS CLI for S3 sync operations
- Jest testing framework for CDK infrastructure tests
- ESLint with `eslint-plugin-awscdk` for code quality

## Detailed Design

### Services and Modules

| Module | Location | Responsibility | Inputs | Outputs |
|--------|----------|----------------|--------|---------|
| **Deployment Script** | `/scripts/deploy.sh` | Upload built site to S3 with validation | `_site/` directory | Files in S3 bucket, deployment status |
| **Deploy NPM Script** | Root `package.json` | Entry point for deployment | User command `yarn deploy` | Executes deploy script |
| **CDK Snapshot Tests** | `/infra/lib/ndx-stack.test.ts` | Validate CloudFormation template integrity | CDK stack definition | Jest snapshot, pass/fail |
| **CDK Assertion Tests** | `/infra/lib/ndx-stack.test.ts` | Validate specific S3 properties | CDK stack definition | Property validation results |
| **Integration Test** | `/infra/test/integration.sh` | Real AWS deployment validation | Test AWS account | Stack deployment success/failure |
| **Smoke Test** | Within `deploy.sh` | Post-deployment validation | Deployed S3 bucket | Site accessibility status |
| **Infrastructure README** | `/infra/README.md` | Living documentation | Infrastructure changes | Updated documentation |

### Data Models and Contracts

**Deployment Script Input:**
```bash
# Directory structure expected
_site/
├── index.html
├── catalogue/
├── discover/
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── ... (Eleventy build output)
```

**Deployment Script Output:**
```bash
# Success output
Deploying to ndx-static-prod...
Upload complete: 165 files
Running smoke test...
✓ Deployment complete: 165 files uploaded

# Failure output
Error: _site/ directory not found. Run 'yarn build' first.
# OR
Warning: File count mismatch. Expected: 165, Uploaded: 163
```

**Test Configuration Schema:**
```typescript
// Jest configuration (test/jest.config.js)
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
```

**CDK Test Template:**
```typescript
// Snapshot test structure
test('Stack snapshot matches expected CloudFormation', () => {
  const app = new cdk.App();
  const stack = new NdxStaticStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  expect(template.toJSON()).toMatchSnapshot();
});

// Assertion test structure
test('S3 bucket has correct configuration', () => {
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: 'ndx-static-prod',
    BucketEncryption: { /* ... */ },
    VersioningConfiguration: { Status: 'Enabled' },
    PublicAccessBlockConfiguration: { /* all true */ }
  });
});
```

### APIs and Interfaces

**Deployment Script Interface:**
```bash
# Command signature
yarn deploy

# Exit codes
0  - Deployment successful
1  - Error: _site/ directory not found
1  - Error: File count mismatch
1  - Error: AWS CLI command failed
```

**AWS CLI S3 Sync Interface:**
```bash
aws s3 sync _site/ s3://ndx-static-prod/ \
  --profile NDX/InnovationSandboxHub \
  --delete \
  --exact-timestamps \
  --cache-control "public, max-age=3600" \
  --exclude ".DS_Store"
```

**Parameters:**
- `--profile`: AWS credential profile
- `--delete`: Remove files not in source
- `--exact-timestamps`: Idempotent uploads (only changed files)
- `--cache-control`: HTTP cache headers for CDN preparation
- `--exclude`: Skip system files

**CDK Test Interface:**
```bash
# Run tests
yarn test              # All tests
yarn test --coverage   # With coverage report
yarn test --watch      # Watch mode

# Test expectations
- All tests must pass (exit code 0)
- Snapshot matches current CloudFormation
- All assertions validate successfully
```

### Workflows and Sequencing

**Manual Deployment Flow:**
```
Developer → yarn build → _site/ created
         ↓
Developer → yarn deploy → scripts/deploy.sh
         ↓
Validate _site/ exists
         ↓
AWS CLI S3 sync to ndx-static-prod
         ↓
File count validation
         ↓
Smoke test (based on Story 2.3 decision)
         ↓
Success confirmation or error with rollback guidance
```

**Testing Workflow:**
```
Infrastructure Change → Developer updates lib/*.ts
         ↓
Run yarn lint → ESLint validates code quality
         ↓
Run yarn test → Snapshot tests detect CloudFormation changes
         ↓
Update snapshot if intentional → yarn test -u
         ↓
Assertions validate security properties
         ↓
Optional: Run integration test → Real AWS deployment
         ↓
cdk diff → Review infrastructure changes
         ↓
cdk deploy → Apply to production
```

**Documentation Update Flow:**
```
Infrastructure Change → Implementation complete
         ↓
Update /infra/README.md
         ↓
Update document version and last updated date
         ↓
Commit with message: docs(infra): [description]
         ↓
README reflects current state
```

## Non-Functional Requirements

### Performance

**NFR-PERF-3: File Upload Performance**
- Target: Upload ~165 files in reasonable time (< 5 minutes)
- Achieved through: `--exact-timestamps` for incremental uploads
- Only changed files re-uploaded on subsequent deployments
- Parallel AWS CLI operations where possible

**NFR-PERF-1 & PERF-2: CDK Performance**
- `cdk synth` completes < 30 seconds
- `cdk diff` completes < 60 seconds
- Validated through simple stack structure (single S3 bucket)

**Test Execution Performance:**
- Unit tests (snapshot + assertions): < 10 seconds
- Integration test: < 5 minutes (includes deploy + destroy)
- Linting: < 5 seconds

### Security

**NFR-SEC-3: No Hardcoded Credentials**
- Deployment script uses AWS profile (`--profile NDX/InnovationSandboxHub`)
- No credentials in version control
- Credentials stored locally via AWS CLI config

**NFR-SEC-4: AWS Profile Isolation**
- Profile credentials remain local
- `.gitignore` prevents accidental credential commit
- Script validates profile exists before execution

**Test Security:**
- Integration test uses same profile (no separate test credentials)
- Test environment isolated via CDK context (`--context env=test`)
- Cleanup ensures no resource accumulation

### Reliability

**NFR-REL-3: Clear Error Messages**
- Deployment failures provide actionable error messages:
  - "Error: _site/ directory not found. Run 'yarn build' first."
  - "Warning: File count mismatch. Expected: X, Uploaded: Y"
  - AWS CLI errors passed through with context

**NFR-REL-4: Pre-deployment Validation**
- Script validates `_site/` directory exists before AWS operations
- CDK synth validates infrastructure before deployment
- Tests must pass before deployment allowed

**Error Recovery:**
- `set -e` ensures script exits on first error
- `--exact-timestamps` enables idempotent re-runs
- File count validation catches incomplete uploads
- Manual rollback via S3 versioning (object-level recovery)

### Maintainability

**NFR-MAINT-1: ESLint Zero Errors**
- CDK code must pass `yarn lint` with zero errors
- Enforced via pre-deployment validation
- ESLint flat config with AWS CDK plugin rules

**NFR-MAINT-2: 100% Snapshot Coverage**
- All CDK stacks have snapshot tests
- CloudFormation changes detected automatically
- Snapshots version-controlled in git

**NFR-MAINT-3: TypeScript Naming Conventions**
- Stack class: `NdxStaticStack` (PascalCase)
- Files: `ndx-stack.ts` (kebab-case)
- Test files: `ndx-stack.test.ts`
- Constants: `UPPER_SNAKE_CASE`

**NFR-MAINT-5: Living Documentation**
- `/infra/README.md` includes version and last updated date
- Maintenance section establishes update responsibility
- Monthly review cadence or when infrastructure changes
- Developer making changes updates documentation

### Operational Excellence

**NFR-OPS-1: Documented Deployment Process**
- Step-by-step commands in `/infra/README.md`
- Clear separation: infrastructure changes vs file updates
- Troubleshooting section with common errors

**NFR-OPS-2: Clear Change Preview**
- `cdk diff` shows what resources will be modified
- Deployment script logs each operation
- File count validation confirms complete upload

**NFR-OPS-3: Actionable Error Messages**
- Deployment failures include remediation guidance
- Integration test failures show CloudFormation events
- Smoke test failures indicate specific issue (404, 403, etc.)

## Dependencies and Integrations

### External Dependencies

**From `/infra/package.json`:**

**Production Dependencies:**
- `aws-cdk-lib@2.215.0` - AWS CDK core library
- `constructs@^10.0.0` - CDK construct framework

**Development Dependencies:**
- `@eslint/js@^9.39.1` - ESLint core rules
- `@types/jest@^29.5.14` - Jest TypeScript types
- `@types/node@22.7.9` - Node.js TypeScript types
- `aws-cdk@2.1032.0` - CDK CLI tool
- `eslint@^9.39.1` - Code linting
- `eslint-plugin-awscdk@^4.0.4` - AWS CDK linting rules
- `jest@^29.7.0` - Testing framework
- `ts-jest@^29.2.5` - Jest TypeScript support
- `ts-node@^10.9.2` - TypeScript execution
- `typescript@~5.9.3` - TypeScript compiler
- `typescript-eslint@^8.47.0` - TypeScript ESLint integration

**System Dependencies:**
- AWS CLI v2.x (installed locally)
- Bash shell (macOS/Linux)
- Node.js 20.17.0+
- Yarn 4.5.0+

### Integration Points

**CDK to AWS:**
- CloudFormation template generation via `cdk synth`
- Stack deployment via `cdk deploy`
- Resource updates via CloudFormation change sets

**Deployment Script to AWS:**
- S3 sync operations via AWS CLI
- Bucket validation via `aws s3 ls`
- File count verification via `aws s3 ls --recursive`

**Application to Infrastructure:**
- Eleventy builds site → `_site/` directory
- Deploy script uploads `_site/` → S3 bucket
- Entry point: Root `package.json` "deploy" script

**Testing Integration:**
- Jest executes CDK tests
- Tests validate CloudFormation output
- Integration test deploys to real AWS
- CI/CD ready (exit codes indicate pass/fail)

### Version Constraints

- AWS CDK lib and CLI version must match (currently 2.x)
- TypeScript version ~5.9.3 (compatible with CDK)
- Jest ^29.7.0 (LTS version)
- ESLint ^9.39.1 (flat config support)

## Acceptance Criteria (Authoritative)

### AC1: Deployment Script Automation
**Given** the Eleventy site is built to `_site/` directory
**When** I run `yarn deploy` from project root
**Then** the deployment script:
- Validates `_site/` directory exists
- Syncs all files to `ndx-static-prod` S3 bucket
- Deletes files not in `_site/` (keeps bucket clean)
- Uses `--exact-timestamps` for incremental uploads
- Sets cache control headers: `public, max-age=3600`
- Validates file count matches expected
- Runs smoke test based on access pattern (Story 2.3 decision)
- Reports success or actionable error message

### AC2: CDK Snapshot Testing
**Given** the CDK stack is defined in `lib/ndx-stack.ts`
**When** I run `yarn test` in `/infra`
**Then** snapshot tests:
- Generate complete CloudFormation template snapshot
- Compare current template to committed snapshot
- Detect any unintended infrastructure changes
- Fail if CloudFormation differs from snapshot
- Provide clear diff output showing changes

### AC3: CDK Fine-Grained Assertions
**Given** the CDK stack is defined
**When** I run `yarn test` in `/infra`
**Then** assertion tests validate:
- S3 bucket name: `ndx-static-prod`
- Encryption: SSE-S3 enabled (AES256)
- Versioning: Enabled
- Public access: All 4 settings blocked
- Tags: project=ndx, environment=prod, managedby=cdk
- All security properties match NFR requirements

### AC4: Integration Testing
**Given** I have access to test AWS environment
**When** I run `test/integration.sh`
**Then** the integration test:
- Deploys stack to test environment via CDK context
- Verifies stack deploys successfully to real AWS
- Validates bucket exists and is accessible
- Cleans up test resources after validation
- Reports pass/fail with actionable errors

### AC5: ESLint Code Quality
**Given** the CDK code is written in TypeScript
**When** I run `yarn lint` in `/infra`
**Then** ESLint:
- Validates all `.ts` files in project
- Applies TypeScript recommended rules
- Applies AWS CDK best practice rules
- Reports zero errors (NFR-MAINT-1)
- Provides auto-fix suggestions via `yarn lint:fix`

### AC6: Living Documentation
**Given** the infrastructure is implemented
**When** I read `/infra/README.md`
**Then** the documentation includes:
- Document version and last updated date
- Prerequisites with verification commands
- Initial setup (one-time bootstrap)
- Development workflow (test, lint, deploy)
- Deployment process (infrastructure vs files)
- Testing section (unit, integration, smoke)
- Troubleshooting with common errors
- Maintenance section with review cadence

### AC7: Post-Deployment Smoke Test
**Given** the deployment script completes file upload
**When** the smoke test executes
**Then** validation occurs based on access pattern:
- **If CloudFront required:** Validate `index.html` exists in bucket, report site not publicly accessible
- **If static hosting enabled:** Make HTTP request to S3 website endpoint, validate 200 response, validate index.html contains expected content
- Report deployment success only if smoke test passes
- Provide actionable error if smoke test fails

## Traceability Mapping

| AC | Spec Section | Components | Test Validation |
|----|--------------|------------|-----------------|
| AC1 | Deployment Script | `/scripts/deploy.sh`, root `package.json` | Story 3.1, 3.2 acceptance tests |
| AC2 | CDK Snapshot Tests | `/infra/lib/ndx-stack.test.ts` | Story 3.3 snapshot test execution |
| AC3 | CDK Assertions | `/infra/lib/ndx-stack.test.ts` | Story 3.4 assertion test execution |
| AC4 | Integration Test | `/infra/test/integration.sh` | Story 3.5 manual execution |
| AC5 | ESLint | `/infra/eslint.config.mjs` | Story 1.3 lint validation |
| AC6 | Documentation | `/infra/README.md` | Story 1.6, 3.6 manual review |
| AC7 | Smoke Test | Within `deploy.sh` | Story 3.7 post-deployment validation |

**FR Coverage:**
- FR8, FR9, FR10, FR11, FR12 → AC1 (Deployment)
- FR13 → AC2 (Snapshot Tests)
- FR14, FR16 → AC3 (Assertions)
- FR15 → AC5 (ESLint)
- FR17 → Story 1.4 (Git integration from Epic 1)
- FR18, FR19 → AC6 (Documentation)
- FR20 → AC3, AC5 (Best practices via testing + linting)

## Risks, Assumptions, Open Questions

### Risks

**Risk 1: S3 Access Pattern Ambiguity**
- **Description:** Story 2.3 must determine if static hosting enabled or CloudFront required
- **Impact:** High - Smoke test implementation depends on this decision
- **Mitigation:** Story 2.3 validates and documents access pattern before Epic 3 begins
- **Status:** Resolved in Story 2.3 - CloudFront required, site remains dark in MVP

**Risk 2: Network Failures During Upload**
- **Description:** Mid-upload network failures leave bucket in broken state
- **Impact:** Medium - Incomplete deployment requires manual cleanup
- **Mitigation:** `--exact-timestamps` enables idempotent re-runs, file count validation catches incomplete uploads
- **Status:** Mitigated via deployment script design (Story 3.2)

**Risk 3: Test Snapshot Staleness**
- **Description:** Snapshot tests pass with outdated snapshots if not updated
- **Impact:** Low - False confidence in infrastructure integrity
- **Mitigation:** Snapshot review during code review, clear diff output on failures
- **Status:** Addressed via testing best practices

**Risk 4: Documentation Drift**
- **Description:** README becomes outdated as infrastructure evolves
- **Impact:** Medium - New team members follow incorrect instructions
- **Mitigation:** Living document with version tracking, maintenance section establishes update responsibility
- **Status:** Mitigated via Story 3.6 living document approach

### Assumptions

**Assumption 1: AWS Profile Pre-configured**
- Developer has `NDX/InnovationSandboxHub` AWS profile configured locally
- Profile has permissions for S3 operations and CloudFormation deployment
- Validated via: `aws sts get-caller-identity --profile NDX/InnovationSandboxHub`

**Assumption 2: CDK Bootstrap Complete**
- AWS account is bootstrapped for CDK deployments (Story 1.5)
- CDKToolkit stack exists in target region
- Bootstrap version compatible with CDK v2.215.0+

**Assumption 3: Eleventy Build Success**
- `_site/` directory exists and contains valid Eleventy output
- Build process (not in this epic) completes successfully
- ~165 files expected in build output

**Assumption 4: Single Developer MVP**
- Manual deployment acceptable for MVP phase
- Team deployment (CI/CD) deferred to growth phase
- Solo developer has AWS account access

**Assumption 5: Test Environment Available**
- Integration test can deploy to test bucket name
- Test resources can be destroyed after validation
- Optional for MVP (can skip if no test environment)

### Open Questions

**Question 1: Smoke Test Implementation**
- **Question:** Should smoke test validate specific page content or just HTTP 200?
- **Decision Required:** Story 3.7 implementation
- **Impact:** Determines smoke test robustness
- **Recommendation:** Start with HTTP 200, enhance with content validation in growth phase

**Question 2: Integration Test Frequency**
- **Question:** How often should integration test run (every PR, manual only, weekly)?
- **Decision Required:** Development workflow definition
- **Impact:** Determines CI/CD integration approach
- **Recommendation:** Manual for MVP, automated in CI/CD for growth phase

**Question 3: ESLint Auto-fix in Pre-commit**
- **Question:** Should ESLint auto-fix run in pre-commit hook or manual only?
- **Decision Required:** Developer workflow preference
- **Impact:** Code quality enforcement timing
- **Recommendation:** Manual for MVP, add Husky pre-commit in growth phase

## Test Strategy Summary

### Unit Testing (Jest)

**Snapshot Tests:**
- **Target:** All CDK stacks
- **Coverage:** 100% stack snapshot coverage
- **Execution:** `yarn test` in `/infra`
- **Validation:** CloudFormation template integrity

**Fine-Grained Assertions:**
- **Target:** Security-critical properties (encryption, public access, versioning)
- **Coverage:** All S3 bucket properties
- **Execution:** `yarn test` in `/infra`
- **Validation:** Specific property values match requirements

**Test Co-location:**
- Tests live alongside source: `lib/ndx-stack.test.ts`
- Standard CDK pattern (ADR-005)
- Easier maintenance and imports

### Integration Testing

**Real AWS Deployment:**
- **Script:** `test/integration.sh`
- **Frequency:** Manual for MVP (optional)
- **Purpose:** Catch environment-specific issues
- **Scope:** Deploy to test environment, validate, cleanup

**Validation:**
- Stack deploys successfully
- Bucket exists and accessible
- CloudFormation events show success

**Cleanup:**
- Test resources destroyed after validation
- No resource accumulation

### Smoke Testing

**Post-Deployment Validation:**
- **Location:** Within `scripts/deploy.sh`
- **Execution:** Automatic after file upload
- **Purpose:** Validate site accessibility/functionality

**Implementation (depends on Story 2.3):**
- **CloudFront required:** Validate file presence, report site not accessible
- **Static hosting enabled:** HTTP 200 check, basic content validation

### Code Quality Testing

**ESLint:**
- **Execution:** `yarn lint` in `/infra`
- **Rules:** TypeScript + AWS CDK best practices
- **Enforcement:** Zero errors before deployment

**Coverage:**
- All `.ts` files in project
- Ignores: `node_modules`, `cdk.out`, `*.js`, `coverage`

### Test Execution Order

```
1. Lint Check (yarn lint)
   ↓
2. Unit Tests (yarn test)
   - Snapshots
   - Assertions
   ↓
3. Optional: Integration Test (test/integration.sh)
   ↓
4. CDK Diff (cdk diff)
   ↓
5. CDK Deploy (cdk deploy)
   ↓
6. File Deployment (yarn deploy)
   ↓
7. Smoke Test (automatic in deploy script)
```

### Success Criteria

- All tests pass (exit code 0)
- Zero ESLint errors
- Snapshot matches current CloudFormation
- All assertions validate successfully
- Deployment completes with file count match
- Smoke test confirms accessibility (or documents limitation)

---

**Epic 3 Tech Spec Complete**

This technical specification provides comprehensive implementation guidance for Epic 3: Deployment Automation & Documentation. All 7 stories (3.1 through 3.7) are covered with detailed design, acceptance criteria, and traceability mapping to functional requirements.

**Next Step:** Mark epic-3 as "contexted" in sprint status and begin Story 3.1 implementation.
