# Epic Technical Specification: Foundation & CDK Setup

Date: 2025-11-18
Author: cns
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes the AWS CDK TypeScript infrastructure foundation for the National Digital Exchange (NDX), a UK government platform projected to save £2B in taxpayer funds. This epic focuses on project initialization, development tooling setup (testing, linting, version control), and AWS account preparation through CDK bootstrapping. The work creates the essential infrastructure-as-code project structure that enables all subsequent infrastructure deployments (S3 bucket, future CloudFront CDN, OIDC authentication) while following industry best practices for government service infrastructure.

This epic delivers zero AWS resources but establishes the complete development environment and quality gates (ESLint, Jest, git integration) required for production-grade infrastructure development.

## Objectives and Scope

**In Scope:**
- Initialize AWS CDK v2.224.0 TypeScript project in `/infra` directory
- Convert package manager from npm to Yarn 4.5.0 (consistency with main application)
- Configure ESLint with flat config format (`eslint.config.mjs`) including AWS CDK plugin
- Set up git integration with proper `.gitignore` for CDK artifacts
- Bootstrap AWS CDK in target account/region (one-time AWS setup creating staging resources)
- Create initial `/infra/README.md` with setup and deployment documentation

**Out of Scope:**
- Actual AWS resource creation (S3 bucket, CloudFront, etc.) - deferred to Epic 2
- Deployment automation scripts - deferred to Epic 3
- CI/CD pipeline setup - deferred to Growth phase
- Multi-environment configuration - deferred to Growth phase

**Success Criteria:**
- CDK project compiles successfully (`npm run build` or `yarn build`)
- Example stack from `cdk init` synthesizes valid CloudFormation
- ESLint runs with zero errors
- AWS account is bootstrapped and ready for CDK deployments
- Documentation enables new team members to replicate setup

## System Architecture Alignment

This epic implements the foundational decisions from the Infrastructure Architecture document:

**Technology Stack (Architecture Section 2):**
- AWS CDK v2.224.0 with TypeScript (ADR-001)
- Yarn 4.5.0 package manager (Decision Summary)
- Jest testing framework (provided by `cdk init`)
- ESLint flat config with `eslint-plugin-awscdk` (ADR-004)

**Project Structure (Architecture Section 3):**
- `/infra` directory at project root
- Standard CDK layout: `bin/`, `lib/`, `test/`
- Co-located tests: `lib/*.test.ts` (ADR-005)

**Development Environment (Architecture Section 10):**
- Node.js 20.17.0+ (matches main application)
- AWS CLI v2.x with `NDX/InnovationSandboxHub` profile
- AWS region: `us-west-2`

**Quality Standards (Architecture Section 6):**
- ESLint with TypeScript + AWS CDK rules (FR15)
- Version control with CDK-specific `.gitignore` (FR17)
- Documentation in `/infra/README.md` (FR18)

This epic creates the infrastructure project that will house the `NdxStaticStack` (Epic 2) and deployment automation (Epic 3), following the single monolithic stack pattern (ADR-002).

## Detailed Design

### Services and Modules

Epic 1 establishes the CDK project structure rather than deploying services. The modules created are development tooling components:

| Module/Component | Responsibility | Inputs | Outputs | Owner |
|-----------------|----------------|--------|---------|-------|
| **CDK App Entry Point** (`bin/infra.ts`) | Instantiate CDK app and stacks | None | CDK App instance | CDK framework |
| **Example Stack** (`lib/infra-stack.ts`) | Demonstrate CDK patterns (replaced in Epic 2) | CDK App, stack props | CloudFormation template | Developer |
| **Jest Test Suite** (`lib/infra-stack.test.ts`) | Validate CDK stack structure | Stack definition | Test pass/fail | Jest |
| **ESLint Configuration** (`eslint.config.mjs`) | Enforce code quality standards | TypeScript source files | Lint errors/warnings | ESLint |
| **TypeScript Compiler** (`tsconfig.json`) | Compile TypeScript to JavaScript | `.ts` source files | `.js` compiled files | TypeScript |
| **Package Manager** (Yarn 4.5.0) | Manage dependencies | `package.json` | `node_modules/`, `yarn.lock` | Yarn |
| **Git Integration** (`.gitignore`) | Exclude artifacts from version control | File system | Tracked/ignored files | Git |
| **Documentation** (`README.md`) | Guide team through setup/deployment | N/A | Human-readable docs | Developer |

**AWS CDK Bootstrap Resources (created in AWS):**

| Resource | Purpose | Region | Lifecycle |
|----------|---------|--------|-----------|
| **CDKToolkit Stack** | Container for bootstrap resources | us-west-2 | Permanent (shared across stacks) |
| **Staging S3 Bucket** | Store CloudFormation templates and CDK assets | us-west-2 | Permanent |
| **IAM Execution Roles** | CloudFormation deployment permissions | us-west-2 | Permanent |
| **SSM Parameters** | Track bootstrap version | us-west-2 | Permanent |

### Data Models and Contracts

**CDK Project Configuration (`cdk.json`):**

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/infra.ts",
  "watch": {
    "include": ["**"],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.d.ts",
      "**/*.js",
      "tsconfig.json",
      "package*.json",
      "yarn.lock",
      "node_modules",
      "test"
    ]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws", "aws-cn"]
  }
}
```

**TypeScript Configuration (`tsconfig.json`):**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": false,
    "inlineSourceMap": true,
    "inlineSources": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false,
    "typeRoots": ["./node_modules/@types"]
  },
  "exclude": ["node_modules", "cdk.out"]
}
```

**Package Dependencies (`package.json` - key entries):**

```json
{
  "name": "infra",
  "version": "0.1.0",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest",
    "cdk": "cdk",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "20.x",
    "aws-cdk": "2.224.0",
    "eslint": "^9.x",
    "typescript-eslint": "^8.x",
    "eslint-plugin-awscdk": "latest",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.1",
    "typescript": "~5.6.0"
  },
  "dependencies": {
    "aws-cdk-lib": "2.224.0",
    "constructs": "^10.0.0"
  }
}
```

**ESLint Configuration (`eslint.config.mjs`):**

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import awscdk from 'eslint-plugin-awscdk';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      awscdk,
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...awscdk.configs.recommended.rules,
    },
  },
  {
    ignores: [
      'node_modules',
      'cdk.out',
      'cdk.context.json',
      '*.js',
      'coverage',
    ],
  },
];
```

**Git Ignore Patterns (`.gitignore`):**

```
# CDK artifacts
*.js
!jest.config.js
*.d.ts
node_modules
cdk.out
cdk.context.json

# Testing
coverage
*.log

# macOS
.DS_Store
```

### APIs and Interfaces

**CDK CLI Interface (commands executed by developer):**

| Command | Purpose | Input | Output | Exit Code |
|---------|---------|-------|--------|-----------|
| `cdk init app --language typescript` | Initialize CDK project | Language selection | Project scaffolding | 0 on success |
| `yarn install` | Install dependencies | `package.json` | `node_modules/`, `yarn.lock` | 0 on success |
| `yarn build` | Compile TypeScript | `lib/*.ts`, `bin/*.ts` | `lib/*.js`, `lib/*.d.ts` | 0 on success, >0 on error |
| `yarn test` | Run Jest tests | Test files | Test results | 0 if pass, >0 if fail |
| `yarn lint` | Run ESLint | Source files | Lint errors/warnings | 0 if pass, >0 if errors |
| `yarn lint:fix` | Auto-fix lint issues | Source files | Modified files | 0 if successful |
| `cdk synth` | Generate CloudFormation | Stack definition | `cdk.out/*.template.json` | 0 on success |
| `cdk bootstrap` | Setup AWS account | AWS credentials, region | CloudFormation stack | 0 on success |

**AWS CDK Bootstrap API (AWS resources created):**

```
Command: cdk bootstrap aws://ACCOUNT-ID/us-west-2 --profile NDX/InnovationSandboxHub

Creates:
- CloudFormation Stack: CDKToolkit
- S3 Bucket: cdk-hnb659fds-assets-ACCOUNT-ID-us-west-2
- IAM Roles:
  - cdk-hnb659fds-cfn-exec-role-ACCOUNT-ID-us-west-2
  - cdk-hnb659fds-deploy-role-ACCOUNT-ID-us-west-2
  - cdk-hnb659fds-file-publishing-role-ACCOUNT-ID-us-west-2
  - cdk-hnb659fds-image-publishing-role-ACCOUNT-ID-us-west-2
  - cdk-hnb659fds-lookup-role-ACCOUNT-ID-us-west-2
- SSM Parameter: /cdk-bootstrap/hnb659fds/version (value: 21)
```

### Workflows and Sequencing

**Story 1.1-1.4: CDK Project Setup Sequence**

```
Developer
    │
    ├─> mkdir infra && cd infra
    │
    ├─> cdk init app --language typescript
    │   └─> Generates: bin/, lib/, test/, cdk.json, package.json, tsconfig.json, .gitignore
    │
    ├─> rm package-lock.json && yarn install
    │   └─> Creates: yarn.lock, node_modules/
    │
    ├─> yarn add -D eslint typescript-eslint eslint-plugin-awscdk
    │   └─> Adds ESLint dependencies to package.json
    │
    ├─> Create eslint.config.mjs (flat config with AWS CDK rules)
    │
    ├─> Update package.json scripts: add "lint" and "lint:fix"
    │
    ├─> yarn build
    │   └─> Compiles TypeScript (validates setup)
    │
    ├─> yarn test
    │   └─> Runs example stack test (validates testing)
    │
    ├─> yarn lint
    │   └─> Lints example stack (validates ESLint config)
    │
    └─> Verify .gitignore includes CDK artifacts
```

**Story 1.5: CDK Bootstrap Sequence**

```
Developer                    AWS Account (us-west-2)
    │
    ├─> Verify AWS CLI config
    │   aws sts get-caller-identity --profile NDX/InnovationSandboxHub
    │   └─> Returns account ID
    │
    ├─> Run bootstrap command
    │   cdk bootstrap aws://ACCOUNT-ID/us-west-2 --profile NDX/InnovationSandboxHub
    │   │
    │   ├─────────────────────────────────────────────────> Create CloudFormation Stack "CDKToolkit"
    │   │                                                    │
    │   │                                                    ├─> Create S3 staging bucket
    │   │                                                    ├─> Create IAM execution roles (5 roles)
    │   │                                                    ├─> Create SSM parameter (version tracking)
    │   │                                                    │
    │   │<───────────────────────────────────────────────── Stack CREATE_COMPLETE
    │   │
    │   └─> Display success message with resource ARNs
    │
    └─> Verify bootstrap
        aws cloudformation describe-stacks --stack-name CDKToolkit --profile NDX/InnovationSandboxHub
        └─> Returns stack details with status CREATE_COMPLETE
```

**Story 1.6: Documentation Creation**

```
Developer
    │
    ├─> Collect information:
    │   - AWS profile name: NDX/InnovationSandboxHub
    │   - AWS region: us-west-2
    │   - AWS account ID: from `aws sts get-caller-identity`
    │   - Node/Yarn versions: from main app requirements
    │   - Bootstrap status: from Story 1.5 output
    │
    ├─> Create /infra/README.md with sections:
    │   1. Overview (project purpose, architecture link)
    │   2. Prerequisites (Node, Yarn, AWS CLI, profile verification)
    │   3. Initial Setup (bootstrap command, dependency install)
    │   4. Development Workflow (test, lint, synth commands)
    │   5. Troubleshooting (common errors, CloudFormation logs)
    │
    ├─> Add document metadata:
    │   - Last Updated: 2025-11-18
    │   - Document Version: 1.0
    │   - Review note: "Update when infrastructure changes"
    │
    └─> Commit to git:
        git add README.md
        git commit -m "docs(infra): add initial infrastructure README"
```

## Non-Functional Requirements

### Performance

**NFR-PERF-1: CDK Synth Performance**
- **Requirement:** `cdk synth` must complete in under 30 seconds
- **Epic 1 Impact:** Example stack from `cdk init` is minimal, synth completes in < 5 seconds
- **Validation:** Time `cdk synth` command execution
- **Source:** PRD NFR-PERF-1

**NFR-PERF-2: CDK Diff Performance**
- **Requirement:** `cdk diff` must complete in under 60 seconds
- **Epic 1 Impact:** Example stack diff completes in < 10 seconds (no AWS resources to compare)
- **Validation:** Time `cdk diff` command execution
- **Source:** PRD NFR-PERF-2

**TypeScript Compilation Performance**
- **Requirement:** `yarn build` should complete quickly for developer productivity
- **Target:** < 10 seconds for initial compilation, < 2 seconds for incremental
- **Epic 1 Impact:** Example stack compiles in ~3-5 seconds
- **Validation:** Time `yarn build` and `yarn build --watch` incremental builds

**Test Execution Performance**
- **Requirement:** `yarn test` should provide rapid feedback
- **Target:** < 5 seconds for example stack tests
- **Epic 1 Impact:** Jest runs example tests in ~2-3 seconds
- **Validation:** Time `yarn test` execution

### Security

**NFR-SEC-3: No Hardcoded Credentials**
- **Requirement:** CDK code must not contain hardcoded credentials or sensitive values
- **Epic 1 Implementation:**
  - AWS profile (`NDX/InnovationSandboxHub`) passed via `--profile` flag, not in code
  - Account ID referenced via CDK environment variables, not hardcoded
  - No secrets in `cdk.json`, `tsconfig.json`, or source files
- **Validation:** Code review of all TypeScript files, grep for common secret patterns
- **Source:** PRD NFR-SEC-3

**NFR-SEC-4: Local Credentials Only**
- **Requirement:** AWS Profile credentials must remain local, never committed to git
- **Epic 1 Implementation:**
  - `.gitignore` excludes AWS credential files
  - AWS credentials stored in `~/.aws/credentials` (outside repository)
  - Documentation instructs developers to configure profile locally
- **Validation:** Verify `.gitignore` patterns, check git history for credential leaks
- **Source:** PRD NFR-SEC-4

**NFR-SEC-5: Auditable Infrastructure Changes**
- **Requirement:** Infrastructure changes must be auditable via CloudFormation change sets and CDK diff output
- **Epic 1 Implementation:**
  - `cdk diff` command shows infrastructure changes before deployment
  - Git commit history tracks CDK code changes with rationale
  - CloudFormation tracks all bootstrap stack changes
- **Validation:** Run `cdk diff`, review git log, check CloudFormation console
- **Source:** PRD NFR-SEC-5

**ESLint Security Checks**
- **Requirement:** Static analysis should catch security anti-patterns
- **Epic 1 Implementation:**
  - `eslint-plugin-awscdk` includes security rules for CDK patterns
  - TypeScript strict mode prevents common type safety issues
- **Validation:** ESLint detects violations, TypeScript compiler enforces strictness

### Reliability/Availability

**NFR-REL-2: Automatic Rollback**
- **Requirement:** Failed CDK deployments must rollback automatically via CloudFormation
- **Epic 1 Implementation:**
  - CDK bootstrap uses CloudFormation which has built-in rollback
  - If bootstrap fails, CloudFormation automatically reverts changes
  - Stack remains in last known good state
- **Validation:** Intentionally cause bootstrap failure, verify rollback
- **Source:** PRD NFR-REL-2

**NFR-REL-4: Pre-Deployment Validation**
- **Requirement:** Infrastructure must validate successfully via `cdk synth` before any deployment attempt
- **Epic 1 Implementation:**
  - `cdk synth` generates CloudFormation template from TypeScript
  - Compilation errors prevent synth from succeeding
  - CDK validates construct tree and CloudFormation template syntax
- **Validation:** Run `cdk synth`, verify CloudFormation template is valid JSON
- **Source:** PRD NFR-REL-4

**Idempotent Operations**
- **Requirement:** CDK operations should be safe to re-run
- **Epic 1 Implementation:**
  - `cdk bootstrap` is idempotent (re-running with no changes makes no updates)
  - `yarn install` is idempotent (lockfile ensures consistent dependencies)
  - `yarn build` is idempotent (same source produces same output)
- **Validation:** Run commands multiple times, verify no unexpected changes

**Build Reproducibility**
- **Requirement:** Yarn lockfile ensures reproducible builds across environments
- **Epic 1 Implementation:**
  - `yarn.lock` committed to git
  - Exact dependency versions locked (not semver ranges)
  - All developers get identical `node_modules/`
- **Validation:** Delete `node_modules/`, run `yarn install`, verify same versions

### Observability

**NFR-OPS-3: Actionable Error Messages**
- **Requirement:** Deployment failures must provide actionable error messages with remediation guidance
- **Epic 1 Implementation:**
  - TypeScript compiler errors show exact file/line with error description
  - ESLint errors include rule name and fix suggestions
  - CDK errors show CloudFormation event details
  - Jest test failures show expected vs actual values
- **Validation:** Introduce intentional errors, verify error messages are clear
- **Source:** PRD NFR-OPS-3

**Development Workflow Visibility**
- **Requirement:** Developers should have clear feedback on build/test/lint status
- **Epic 1 Implementation:**
  - `yarn build` shows compilation progress and errors
  - `yarn test` shows test pass/fail with coverage
  - `yarn lint` shows all linting errors with file/line numbers
  - `cdk synth` shows template generation progress
- **Validation:** Run each command, verify output is clear and informative

**CloudFormation Event Logging**
- **Requirement:** Bootstrap deployment events should be visible for troubleshooting
- **Epic 1 Implementation:**
  - `cdk bootstrap` streams CloudFormation events to console
  - AWS CloudFormation console provides full event history
  - Stack status visible via `aws cloudformation describe-stacks`
- **Validation:** Run bootstrap, observe event stream, check CloudFormation console

**Git History Tracking**
- **Requirement:** All infrastructure code changes tracked with commit messages
- **Epic 1 Implementation:**
  - `.gitignore` excludes only build artifacts, tracks all source
  - Commit message convention documented in README
  - Git log provides audit trail of changes
- **Validation:** Review git log, verify source files are tracked

## Dependencies and Integrations

### Core Dependencies (from package.json)

**Production Dependencies:**

| Package | Version | Purpose | Source |
|---------|---------|---------|--------|
| `aws-cdk-lib` | 2.224.0 | AWS CDK constructs library | npm |
| `constructs` | ^10.0.0 | CDK construct base classes | npm |

**Development Dependencies:**

| Package | Version | Purpose | Source |
|---------|---------|---------|--------|
| `aws-cdk` | 2.224.0 | CDK CLI tool | npm |
| `typescript` | ~5.6.0 | TypeScript compiler | npm |
| `ts-node` | ^10.9.1 | TypeScript execution for Node.js | npm |
| `@types/node` | 20.x | Node.js type definitions | npm |
| `jest` | ^29.7.0 | Testing framework | npm |
| `ts-jest` | ^29.1.0 | TypeScript preprocessor for Jest | npm |
| `@types/jest` | ^29.5.0 | Jest type definitions | npm |
| `eslint` | ^9.x | Linting engine | npm |
| `typescript-eslint` | ^8.x | TypeScript ESLint parser/plugin | npm |
| `eslint-plugin-awscdk` | latest | AWS CDK specific linting rules | npm |

### External System Integrations

**AWS Account Integration:**

| System | Integration Point | Protocol | Authentication | Purpose |
|--------|------------------|----------|----------------|---------|
| **AWS CloudFormation** | CDK bootstrap/deploy | AWS SDK | AWS Profile | Deploy bootstrap stack resources |
| **AWS S3** | Bootstrap bucket | AWS SDK | IAM roles | Store CDK assets and templates |
| **AWS IAM** | Role creation | AWS SDK | AWS Profile | Create execution roles for deployments |
| **AWS SSM** | Parameter Store | AWS SDK | IAM roles | Track bootstrap version |

**Local Development Tools:**

| Tool | Version | Integration | Purpose |
|------|---------|-------------|---------|
| **Node.js** | 20.17.0+ | Runtime environment | Execute TypeScript/Jest/CDK |
| **Yarn** | 4.5.0+ | Package manager | Install dependencies, run scripts |
| **AWS CLI** | v2.x | Command-line tool | Verify AWS access, troubleshoot |
| **Git** | Any recent | Version control | Track infrastructure code changes |

**Main NDX Application Dependencies:**

| Integration | Type | Details |
|-------------|------|---------|
| **Shared package manager** | Tool consistency | Both use Yarn 4.5.0 |
| **Shared Node.js version** | Runtime consistency | Both require Node.js 20.17.0+ |
| **Deployment relationship** | Workflow | Eleventy builds `_site/`, CDK provides S3 bucket target |
| **Documentation crossref** | Knowledge sharing | Architecture docs reference both app and infrastructure |

### Version Constraints and Compatibility

**CDK Version Pinning:**
- `aws-cdk-lib` and `aws-cdk` must match exactly (both 2.224.0)
- Prevents version mismatch errors between library and CLI
- Weekly CDK releases available, upgrade both together

**TypeScript Compatibility:**
- TypeScript ~5.6.0 compatible with CDK 2.224.0
- Strict mode enabled for type safety
- Downgrade risk: TypeScript < 5.0 incompatible with modern ESLint

**Jest/TypeScript Integration:**
- `ts-jest` version must be compatible with both Jest and TypeScript versions
- Jest 29.x + ts-jest 29.x + TypeScript 5.6.x confirmed compatible

**ESLint Flat Config:**
- ESLint 9.x required for flat config format (`eslint.config.mjs`)
- `typescript-eslint` 8.x provides flat config support
- Legacy `.eslintrc` format not supported in this setup

**Node.js Platform:**
- Node.js 20.17.0+ required (matches main application)
- CDK 2.224.0 supports Node.js 18.x - 22.x
- Yarn 4.5.0 requires Node.js 18.12.0+

### AWS Resource Dependencies

**Bootstrap Prerequisites:**

| Prerequisite | Description | Verification |
|--------------|-------------|--------------|
| **AWS Account Access** | Valid IAM credentials with admin permissions | `aws sts get-caller-identity --profile NDX/InnovationSandboxHub` |
| **AWS Profile Configured** | Named profile `NDX/InnovationSandboxHub` exists | Check `~/.aws/credentials` and `~/.aws/config` |
| **Target Region Access** | us-west-2 region enabled for account | Verify in AWS Console or via CLI |
| **Sufficient IAM Permissions** | Create S3, IAM roles, CloudFormation, SSM parameters | Policy includes `AdministratorAccess` or equivalent |

**Bootstrap Creates:**

| Resource | Dependency Relationship | Notes |
|----------|------------------------|-------|
| **CDKToolkit Stack** | Required for all future CDK deployments | One-time creation, persistent |
| **Staging S3 Bucket** | CDK uploads assets here before deploy | Automatically referenced by CDK |
| **IAM Execution Roles** | CloudFormation assumes these for deployments | Grant permissions to create resources |
| **Bootstrap Version Parameter** | Ensures compatibility between CDK CLI and bootstrap resources | CDK checks this before each deploy |

### Integration Patterns

**Development Workflow Integration:**

```
Developer Machine
    │
    ├─> Edit TypeScript files (lib/*.ts)
    │   │
    │   └─> TypeScript Compiler (tsc)
    │       └─> Generates JavaScript files
    │           │
    │           └─> ESLint validates code quality
    │               └─> Jest runs tests
    │                   └─> CDK synthesizes CloudFormation
    │                       └─> AWS SDK deploys to CloudFormation
    │
    └─> Git commits track changes
        └─> GitHub hosts repository (future: triggers CI/CD)
```

**CDK to AWS Integration Flow:**

```
CDK CLI (local)
    │
    ├─> Reads: bin/infra.ts
    │   └─> Loads: lib/ndx-stack.ts
    │       └─> Constructs AWS resource definitions
    │
    ├─> Synthesize Phase:
    │   └─> Generates CloudFormation JSON template
    │       └─> Saves to: cdk.out/
    │
    └─> Deploy Phase:
        └─> Uploads template to staging S3 bucket
            └─> Calls CloudFormation CreateStack API
                └─> CloudFormation provisions resources
                    └─> Returns stack outputs
```

### Dependency Management Strategy

**Lockfile Commitment:**
- `yarn.lock` committed to git for reproducibility
- All developers get identical dependency versions
- Prevents "works on my machine" issues

**Version Upgrade Process:**
1. Update `package.json` with new version
2. Run `yarn install` to update lockfile
3. Run `yarn build && yarn test && yarn lint` to verify
4. Test `cdk synth` to ensure CDK compatibility
5. Commit `package.json` and `yarn.lock` together

**Security Updates:**
- Monitor CDK release notes for security patches
- AWS publishes security advisories for CDK
- Yarn audit detects vulnerable dependencies

## Acceptance Criteria (Authoritative)

### AC-1: CDK Project Structure Created
**Given** the project root directory exists
**When** the CDK project is initialized
**Then** the `/infra` directory exists with complete CDK structure:
- `bin/infra.ts` - CDK app entry point
- `lib/infra-stack.ts` - Example stack definition
- `test/infra-stack.test.ts` - Example test file
- `cdk.json` - CDK configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Artifact exclusion patterns
- `node_modules/` - Installed dependencies

**Test:** Run `ls -la infra/` and verify all files/directories present

---

### AC-2: TypeScript Compilation Successful
**Given** the CDK project structure exists
**When** TypeScript compilation is executed
**Then** all TypeScript files compile without errors:
- `yarn build` exits with code 0
- Compiled JavaScript files generated in `lib/` directory
- Type declaration files (`.d.ts`) generated
- No TypeScript compiler errors in output

**Test:** Run `cd infra && yarn build` and verify exit code 0

---

### AC-3: Package Manager Converted to Yarn
**Given** CDK project initialized with npm
**When** package manager is converted to Yarn
**Then** the project uses Yarn exclusively:
- `package-lock.json` deleted
- `yarn.lock` exists and committed to git
- `node_modules/` populated via Yarn
- All dependencies resolve correctly
- `yarn build`, `yarn test`, `yarn lint` commands work

**Test:** Run `ls infra/` and verify `yarn.lock` exists, `package-lock.json` absent

---

### AC-4: ESLint Configured with AWS CDK Plugin
**Given** the CDK project uses TypeScript
**When** ESLint is configured
**Then** linting works with CDK-specific rules:
- `eslint.config.mjs` exists (flat config format)
- Dependencies installed: `eslint`, `typescript-eslint`, `eslint-plugin-awscdk`
- `package.json` includes `"lint": "eslint ."` script
- `package.json` includes `"lint:fix": "eslint . --fix"` script
- Running `yarn lint` on example stack shows no errors
- ESLint uses TypeScript type-checked rules
- Ignore patterns exclude: `node_modules`, `cdk.out`, `*.js`, `coverage`

**Test:** Run `cd infra && yarn lint` and verify exit code 0

---

### AC-5: Git Integration Configured
**Given** CDK project exists
**When** git integration is verified
**Then** version control is properly configured:
- `.gitignore` excludes: `node_modules/`, `cdk.out/`, `cdk.context.json`, `*.js`, `*.d.ts`, `coverage/`
- `.gitignore` tracks: `yarn.lock`, `cdk.json`, `tsconfig.json`, `eslint.config.mjs`, all `.ts` files
- Running `git status` shows only source files as trackable
- Commit message convention documented in README

**Test:** Run `cd infra && git status` and verify build artifacts not listed

---

### AC-6: AWS CDK Bootstrap Completed
**Given** AWS CLI configured with `NDX/InnovationSandboxHub` profile
**When** CDK bootstrap is executed
**Then** AWS account is prepared for CDK deployments:
- CDKToolkit CloudFormation stack created in us-west-2
- Staging S3 bucket created (name: `cdk-hnb659fds-assets-ACCOUNT-ID-us-west-2`)
- IAM execution roles created (5 roles)
- SSM parameter created: `/cdk-bootstrap/hnb659fds/version`
- Bootstrap version compatible with CDK 2.224.0+
- Running `aws cloudformation describe-stacks --stack-name CDKToolkit --profile NDX/InnovationSandboxHub` shows CREATE_COMPLETE

**Test:** Run `aws cloudformation describe-stacks --stack-name CDKToolkit --profile NDX/InnovationSandboxHub --query 'Stacks[0].StackStatus'` and verify "CREATE_COMPLETE"

---

### AC-7: Example Stack Synthesizes Successfully
**Given** CDK project is fully configured
**When** `cdk synth` is executed
**Then** CloudFormation template is generated:
- Command exits with code 0
- `cdk.out/` directory created
- CloudFormation template file exists: `cdk.out/InfraStack.template.json`
- Template is valid JSON
- Template contains example stack resources

**Test:** Run `cd infra && cdk synth --profile NDX/InnovationSandboxHub` and verify `cdk.out/*.template.json` exists

---

### AC-8: Tests Pass Successfully
**Given** CDK project with Jest configured
**When** tests are executed
**Then** all tests pass:
- `yarn test` exits with code 0
- Example stack test executes
- Test output shows pass status
- No test failures or errors

**Test:** Run `cd infra && yarn test` and verify "Tests: 1 passed, 1 total" or similar

---

### AC-9: Infrastructure Documentation Created
**Given** CDK project is fully set up
**When** `/infra/README.md` is created
**Then** documentation is complete and accurate:
- **Section 1: Overview** - Project name, purpose, architecture link, version/date
- **Section 2: Prerequisites** - Node.js, Yarn, AWS CLI, profile verification command
- **Section 3: Initial Setup** - Bootstrap command with account ID, dependency install
- **Section 4: Development Workflow** - Commands: build, test, lint, synth, deploy
- **Section 5: Troubleshooting** - Common errors and CloudFormation debugging
- Document metadata includes: "Last Updated: 2025-11-18", "Document Version: 1.0"
- README uses CommonMark format with proper code blocks

**Test:** Read `/infra/README.md` and verify all sections present with accurate content

---

### AC-10: All Quality Gates Pass
**Given** Epic 1 is complete
**When** all quality checks are run
**Then** project meets quality standards:
- `yarn build` - TypeScript compiles with no errors
- `yarn test` - All tests pass
- `yarn lint` - ESLint runs with zero errors
- `cdk synth` - CloudFormation template generates successfully
- Git tracks only source files (artifacts ignored)
- Documentation is complete and up-to-date

**Test:** Run `cd infra && yarn build && yarn test && yarn lint && cdk synth --profile NDX/InnovationSandboxHub` and verify all commands exit with code 0

---

## Traceability Mapping

| AC # | Acceptance Criteria | Spec Section(s) | Component(s) | Test Strategy |
|------|-------------------|-----------------|--------------|---------------|
| **AC-1** | CDK Project Structure Created | Detailed Design > Services and Modules | `bin/infra.ts`, `lib/`, `test/`, config files | Manual verification: `ls -la infra/` |
| **AC-2** | TypeScript Compilation Successful | System Architecture Alignment > Technology Stack | TypeScript Compiler, `tsconfig.json` | Automated: `yarn build` exit code |
| **AC-3** | Package Manager Converted to Yarn | System Architecture Alignment > Technology Stack | Yarn 4.5.0, `yarn.lock` | Manual verification: check lockfile |
| **AC-4** | ESLint Configured with AWS CDK Plugin | Detailed Design > Data Models (eslint.config.mjs) | ESLint, `eslint-plugin-awscdk` | Automated: `yarn lint` exit code |
| **AC-5** | Git Integration Configured | Detailed Design > Data Models (.gitignore) | Git, `.gitignore` | Manual verification: `git status` |
| **AC-6** | AWS CDK Bootstrap Completed | Detailed Design > APIs and Interfaces (Bootstrap API) | CDKToolkit stack, S3, IAM, SSM | AWS CLI: query CloudFormation stack status |
| **AC-7** | Example Stack Synthesizes Successfully | Detailed Design > Workflows (CDK to AWS flow) | CDK synthesizer, CloudFormation template | Automated: `cdk synth` exit code, verify output |
| **AC-8** | Tests Pass Successfully | System Architecture Alignment > Quality Standards | Jest, example stack test | Automated: `yarn test` exit code |
| **AC-9** | Infrastructure Documentation Created | Detailed Design > Services and Modules (README) | `/infra/README.md` | Manual review: verify all sections present |
| **AC-10** | All Quality Gates Pass | NFRs > All subsections | All components | Automated: run all quality commands sequentially |

### FR to AC Mapping

| Functional Requirement | Related Acceptance Criteria | Notes |
|------------------------|----------------------------|-------|
| **FR15:** ESLint with AWS CDK rules | AC-4, AC-10 | Linting configured and passing |
| **FR17:** Version control with .gitignore | AC-5, AC-10 | Git integration complete |
| **FR18:** Infrastructure documented in README | AC-9 | Complete setup documentation |
| **FR20:** CDK follows TypeScript best practices | AC-2, AC-4, AC-10 | TypeScript strict mode + ESLint |
| **Foundational (enables all FRs)** | AC-1, AC-2, AC-3, AC-6, AC-7, AC-8 | Project structure and AWS setup |

### NFR to AC Mapping

| Non-Functional Requirement | Related Acceptance Criteria | Verification Method |
|---------------------------|----------------------------|---------------------|
| **NFR-PERF-1:** `cdk synth` < 30s | AC-7 | Time command execution |
| **NFR-SEC-3:** No hardcoded credentials | AC-6, AC-9 | Code review, profile in docs |
| **NFR-SEC-4:** Local credentials only | AC-5 | Verify `.gitignore` excludes credentials |
| **NFR-REL-4:** Pre-deployment validation via synth | AC-7 | `cdk synth` validates before deploy |
| **NFR-MAINT-1:** ESLint zero errors | AC-4, AC-10 | `yarn lint` exit code 0 |
| **NFR-MAINT-5:** Complete setup instructions | AC-9 | README enables new team member setup |
| **NFR-PORT-3:** Dependencies pinned | AC-3 | `yarn.lock` committed to git |
| **NFR-OPS-1:** Documented deployment process | AC-9 | README Section 4 complete |

### Story to AC Mapping

| Story | Acceptance Criteria Covered | Validation |
|-------|---------------------------|------------|
| **Story 1.1:** Initialize CDK Project | AC-1 | Project structure exists |
| **Story 1.2:** Convert to Yarn | AC-3 | Yarn lockfile present |
| **Story 1.3:** Configure ESLint | AC-4 | ESLint runs without errors |
| **Story 1.4:** Git Integration | AC-5 | `.gitignore` configured |
| **Story 1.5:** Bootstrap CDK | AC-6 | CDKToolkit stack in AWS |
| **Story 1.6:** Create README | AC-9 | Documentation complete |
| **All Stories Combined** | AC-2, AC-7, AC-8, AC-10 | TypeScript compiles, synth works, tests pass |

## Risks, Assumptions, Open Questions

### Risks

**RISK-1: CDK Version Compatibility**
- **Description:** AWS CDK releases weekly; version 2.224.0 may have bugs or breaking changes
- **Impact:** HIGH - Could block infrastructure deployment
- **Probability:** LOW - CDK v2 is stable, major breaking changes rare
- **Mitigation:**
  - Pin exact CDK version in `package.json` (2.224.0)
  - Test `cdk synth` early to validate compatibility
  - Monitor AWS CDK GitHub releases for known issues
  - Fallback: Downgrade to previous stable version if critical bugs found

**RISK-2: AWS Account Bootstrap Failure**
- **Description:** Bootstrap may fail due to IAM permission issues or region limitations
- **Impact:** CRITICAL - Cannot deploy any CDK infrastructure without bootstrap
- **Probability:** MEDIUM - First-time bootstrap, IAM complexity
- **Mitigation:**
  - Verify AWS profile has AdministratorAccess or equivalent before bootstrap
  - Test with `aws sts get-caller-identity` to confirm credentials work
  - Run bootstrap with `--verbose` flag to capture detailed error logs
  - Consult AWS CloudFormation events for specific failure reasons
  - Fallback: Use AWS Console to manually create CDKToolkit stack if CLI fails

**RISK-3: ESLint Flat Config Incompatibility**
- **Description:** ESLint 9.x flat config is new standard; plugins may not support it yet
- **Impact:** MEDIUM - Linting won't work, quality gate blocked
- **Probability:** LOW - Major plugins (typescript-eslint, awscdk) support flat config
- **Mitigation:**
  - Verify `eslint-plugin-awscdk` supports flat config before installation
  - Test ESLint on example stack immediately after configuration
  - Fallback: Use ESLint 8.x with legacy `.eslintrc` if flat config causes issues
  - Document any plugin limitations in README

**RISK-4: Yarn Version Mismatch**
- **Description:** Main app uses Yarn 4.5.0; developer machine may have different version
- **Impact:** LOW - Dependency resolution errors, lockfile conflicts
- **Probability:** MEDIUM - Not all developers update Yarn regularly
- **Mitigation:**
  - Add `"packageManager": "yarn@4.5.0"` to `package.json` (Corepack enforcement)
  - Document Yarn version requirement in README prerequisites
  - Add verification step: `yarn --version` in setup instructions
  - Use `.yarnrc.yml` to specify Yarn version if needed

**RISK-5: Node.js Version Incompatibility**
- **Description:** CDK 2.224.0 requires Node.js 18+, but developer has older version
- **Impact:** HIGH - CDK won't run, TypeScript won't compile
- **Probability:** LOW - Main app already requires Node.js 20.17.0+
- **Mitigation:**
  - Explicitly state Node.js version in README prerequisites
  - Add engines field to `package.json`: `"node": ">=20.17.0"`
  - Test setup instructions on clean machine to validate
  - Recommend nvm/fnm for Node.js version management

### Assumptions

**ASSUMPTION-1: AWS Account Access Available**
- **Statement:** Developer has access to AWS account with `NDX/InnovationSandboxHub` profile configured locally
- **Validation:** Story 1.5 verifies with `aws sts get-caller-identity`
- **Impact if False:** Cannot bootstrap CDK, blocks all infrastructure work
- **Contingency:** Work with AWS admin to provision credentials

**ASSUMPTION-2: Sufficient AWS Permissions**
- **Statement:** `NDX/InnovationSandboxHub` profile has permissions to create S3, IAM, CloudFormation, SSM resources
- **Validation:** Bootstrap command will fail immediately if permissions insufficient
- **Impact if False:** Cannot complete Epic 1 bootstrap step
- **Contingency:** Request IAM policy update from AWS admin

**ASSUMPTION-3: Single Developer for MVP**
- **Statement:** Only one developer deploys infrastructure during MVP phase
- **Validation:** Architecture document specifies solo deployment for MVP
- **Impact if False:** May need CI/CD sooner than planned
- **Contingency:** Growth phase already includes GitHub Actions OIDC for team deployment

**ASSUMPTION-4: CDK Bootstrap is One-Time Operation**
- **Statement:** Bootstrap only needs to run once per AWS account/region
- **Validation:** AWS CDK documentation confirms bootstrap persistence
- **Impact if False:** Would need to re-bootstrap, but operation is idempotent
- **Contingency:** Re-run bootstrap if resources accidentally deleted

**ASSUMPTION-5: Example Stack Will Be Replaced**
- **Statement:** The example stack from `cdk init` is temporary and will be replaced with real infrastructure in Epic 2
- **Validation:** Epic 2 stories define `NdxStaticStack` replacing example
- **Impact if False:** None - example stack demonstrates patterns but serves no production purpose
- **Contingency:** Example stack can be deleted without impact

### Open Questions

**QUESTION-1: AWS Account ID**
- **Question:** What is the exact AWS account ID for the NDX/InnovationSandboxHub environment?
- **Why It Matters:** Needed for bootstrap command: `cdk bootstrap aws://ACCOUNT-ID/us-west-2`
- **Answer By:** Story 1.5 (developer runs `aws sts get-caller-identity` to retrieve)
- **Blocking:** Story 1.5 (Bootstrap CDK)

**QUESTION-2: Additional ESLint Rules**
- **Question:** Are there team-specific ESLint rules beyond AWS CDK recommended rules?
- **Why It Matters:** May need custom rules in `eslint.config.mjs`
- **Answer By:** Story 1.3 or defer to team code review
- **Blocking:** None (start with recommended rules, add custom rules later)

**QUESTION-3: CDK Context Values**
- **Question:** Should we pre-configure CDK context values for future multi-environment support?
- **Why It Matters:** Could simplify Epic 2 if context structure is established early
- **Answer By:** Epic 1 defers, Epic 2 will determine if context needed
- **Blocking:** None (can add context values later without refactoring)

**QUESTION-4: Bootstrap Stack Customization**
- **Question:** Does NDX require custom bootstrap stack (e.g., custom bucket names, KMS encryption)?
- **Why It Matters:** Default bootstrap uses auto-generated names, custom bootstrap requires additional configuration
- **Answer By:** Assume default bootstrap for MVP, government requirements may require custom in future
- **Blocking:** None (default bootstrap sufficient for MVP)

**QUESTION-5: Git Commit Signing**
- **Question:** Should infrastructure commits be GPG-signed for auditability?
- **Why It Matters:** Government service may require verified commits
- **Answer By:** Defer to team policy, not blocking for MVP
- **Blocking:** None (can enable later via git config)

## Test Strategy Summary

### Test Levels

**Unit Testing:**
- **Scope:** Individual CDK constructs and stack definitions (Epic 2+)
- **Framework:** Jest with `@aws-cdk/assertions`
- **Coverage Target:** 100% snapshot coverage for all stacks (NFR-MAINT-2)
- **Epic 1 Testing:** Example stack test validates Jest + CDK integration works
- **Test Location:** Co-located with source (`lib/*.test.ts`)
- **Execution:** `yarn test` in `/infra` directory

**Integration Testing:**
- **Scope:** CDK synthesis and CloudFormation template validation
- **Method:** `cdk synth` generates CloudFormation, validate template structure
- **Epic 1 Testing:** AC-7 validates example stack synthesizes successfully
- **Execution:** `cdk synth --profile NDX/InnovationSandboxHub`

**Static Analysis:**
- **Scope:** TypeScript code quality and CDK best practices
- **Tools:** ESLint with typescript-eslint and eslint-plugin-awscdk
- **Coverage:** All TypeScript files in `bin/`, `lib/`
- **Epic 1 Testing:** AC-4 validates ESLint runs with zero errors
- **Execution:** `yarn lint` with exit code 0 requirement

**Compilation Testing:**
- **Scope:** TypeScript type checking and compilation
- **Method:** TypeScript compiler in strict mode
- **Epic 1 Testing:** AC-2 validates all files compile successfully
- **Execution:** `yarn build` with exit code 0 requirement

**Manual Verification:**
- **Scope:** Project structure, file existence, documentation completeness
- **Epic 1 Testing:** AC-1, AC-5, AC-9 require manual inspection
- **Method:** Developer verifies files exist and content is accurate

**AWS Deployment Testing:**
- **Scope:** Actual AWS resource creation via CloudFormation
- **Epic 1 Testing:** AC-6 validates CDK bootstrap creates real AWS resources
- **Method:** Run bootstrap command, verify CloudFormation stack status
- **Validation:** AWS CLI queries confirm resources exist

### Test Execution Order

**Epic 1 Test Sequence:**

1. **Project Structure Validation** (AC-1)
   - Manual: `ls -la infra/` after `cdk init`
   - Verify all required files present

2. **Yarn Conversion Validation** (AC-3)
   - Manual: Check `yarn.lock` exists, `package-lock.json` deleted
   - Run `yarn install` to confirm dependencies resolve

3. **Compilation Test** (AC-2)
   - Automated: `yarn build`
   - Must pass before linting

4. **Linting Test** (AC-4)
   - Automated: `yarn lint`
   - Must pass before synthesis

5. **Unit Test Execution** (AC-8)
   - Automated: `yarn test`
   - Example stack test must pass

6. **CloudFormation Synthesis** (AC-7)
   - Automated: `cdk synth`
   - Must generate valid template before bootstrap

7. **AWS Bootstrap Deployment** (AC-6)
   - AWS operation: `cdk bootstrap`
   - Verify via CloudFormation stack query

8. **Git Integration Validation** (AC-5)
   - Manual: `git status` shows no artifacts

9. **Documentation Review** (AC-9)
   - Manual: Read `/infra/README.md`
   - Verify completeness

10. **Full Quality Gate** (AC-10)
    - Automated: `yarn build && yarn test && yarn lint && cdk synth`
    - All must pass

### Test Data and Environments

**Development Environment:**
- AWS Account: NDX/InnovationSandboxHub
- Region: us-west-2
- Bootstrap: Real AWS resources created
- Cost: Minimal (S3 bucket + SSM parameter, < $1/month)

**No Test Data Required:**
- Epic 1 creates tooling, not application features
- Example stack has no data dependencies
- Bootstrap uses AWS-generated resource names

### Edge Cases and Error Scenarios

**Edge Case 1: Bootstrap Already Exists**
- **Scenario:** Developer runs bootstrap when CDKToolkit stack already exists
- **Expected:** Bootstrap is idempotent, reports "already bootstrapped", no changes made
- **Test:** Re-run bootstrap command after successful first run

**Edge Case 2: Insufficient IAM Permissions**
- **Scenario:** AWS profile lacks permissions to create IAM roles
- **Expected:** Bootstrap fails with clear IAM permission error
- **Test:** Intentionally use limited IAM role, verify error message is actionable

**Edge Case 3: TypeScript Compilation Errors**
- **Scenario:** Introduce syntax error in example stack
- **Expected:** `yarn build` fails with file/line number, `cdk synth` cannot proceed
- **Test:** Add intentional error, verify error message quality

**Edge Case 4: ESLint Rule Violation**
- **Scenario:** Code violates AWS CDK best practice rule
- **Expected:** `yarn lint` fails with rule name and fix suggestion
- **Test:** Intentionally violate rule, verify lint output is helpful

**Edge Case 5: Network Failure During Bootstrap**
- **Scenario:** Internet connection lost during CloudFormation stack creation
- **Expected:** CloudFormation automatically rolls back, stack deleted or in ROLLBACK_COMPLETE state
- **Test:** Monitor CloudFormation events if failure occurs, verify rollback behavior

### Test Automation

**Automated Tests (exit code validation):**
- `yarn build` (AC-2)
- `yarn test` (AC-8)
- `yarn lint` (AC-4)
- `cdk synth` (AC-7)

**Manual Verification:**
- File structure inspection (AC-1, AC-5)
- AWS resource validation (AC-6)
- Documentation review (AC-9)

**Future CI/CD Integration (Growth Phase):**
- GitHub Actions will automate: build, test, lint, synth
- Pull request gates enforce all tests pass before merge
- Deployment automation triggers on main branch commits
