# Epic Technical Specification: Testing, Validation & Operational Readiness

Date: 2025-11-21
Author: cns
Epic ID: 3
Status: Draft

---

## Overview

Epic 3 establishes comprehensive testing, deployment validation, and operational procedures for the NDX CloudFront cookie-based origin routing infrastructure. This epic ensures the routing functionality implemented in Epic 2 is production-ready through complete test coverage, documented rollback procedures, and operational runbooks.

The epic delivers three critical pillars:
1. **Testing Infrastructure** - CDK snapshot tests, fine-grained assertions, and integration tests that validate CloudFront configuration integrity and catch regressions
2. **Operational Procedures** - Documented rollback strategies with three tiers (disable function, git revert, remove origin) and pre-deployment checklists
3. **Operational Documentation** - Comprehensive README with deployment processes, monitoring guidance, and troubleshooting procedures

This epic completes the MVP delivery by ensuring the development team can confidently deploy, monitor, and rollback routing changes with complete test coverage and documented procedures. The focus is on operational reliability and maintainability for a critical UK government service handling £2B in procurement decisions.

**Strategic Context:** This epic is not just about one deployment - it establishes the operational foundation for the **ongoing strangler pattern UI migration**. By building comprehensive testing, documented procedures, and operational confidence now, the team can safely execute multiple UI migration phases over time without accumulating technical debt or operational risk.

**Success Metrics:**
- All acceptance criteria met for 6 stories (Stories 3.1-3.6)
- Zero CloudFront configuration regressions in production post-deployment
- Rollback procedures executable in < 5 minutes (Option 1) when needed
- Epic 3 artifacts (tests, scripts, docs) used in future deployments without modification
- Operations team can execute procedures without escalation to development team

## Objectives and Scope

**In Scope:**
- CDK snapshot tests capturing complete CloudFormation template for regression detection
- Fine-grained assertion tests validating security-critical properties (OAC, origins, function attachment)
- Fine-grained assertion tests explicitly validating existing origins remain unchanged (not just existence, but exact configuration)
- Integration test deploying to real AWS environment and validating deployed resources
- Post-deployment validation checklist (automated where possible, documented manual steps for routing behavior)
- Three-tier rollback procedures (< 5 minutes for fastest option)
- Rollback procedure validation in test environment (timing and completeness verification)
- Infrastructure README with deployment process, monitoring, and troubleshooting
- Pre-deployment checklist script automating validation before CDK deploy (including AWS state health checks)
- Operational monitoring guidance using built-in CloudFront metrics

**Out of Scope:**
- CI/CD pipeline automation (manual deployment acceptable for MVP)
- Automated rollback triggers based on metrics (manual rollback only)
- Custom CloudWatch dashboards (use AWS Console for MVP)
- Load testing or performance benchmarking (CloudFront Functions scale automatically)
- Multi-environment deployment automation (single production environment)
- Alerting and notification systems (monitoring only, no automated alerts)

**Scope Philosophy:** Epic 3 creates "CI/CD-ready" infrastructure without the CI/CD implementation. This prioritizes immediate user-facing value (UI migration work) while building automation foundations. When deployment frequency increases in later phases, the tests, scripts, and documentation created here enable straightforward GitHub Actions integration.

**GDS Service Standard Alignment:**
Epic 3 satisfies UK Government Digital Service standards for the National Digital Exchange:
- **Point 5:** Make sure everyone can use the service - Zero-downtime testing ensures uninterrupted government user access
- **Point 8:** Iterate and improve frequently - Strangler pattern foundation enables safe incremental UI evolution
- **Point 10:** Test the service - Defense-in-depth testing strategy validates infrastructure integrity
- **Point 16:** Test in an environment similar to live - Integration tests deploy to real AWS environment

## System Architecture Alignment

Epic 3 aligns with NDX CloudFront Origin Routing Architecture decisions:

**Testing Strategy (ADR-005):**
- Complete testing pyramid: Unit tests (function logic) + Snapshot tests (CloudFormation) + Assertions (security properties) + Integration (real AWS)
- Fast feedback loop: Unit/snapshot tests run in seconds
- Regression prevention: Snapshots catch unintended CloudFormation changes
- Real-world validation: Integration test catches AWS-specific issues
- **Risk Mitigation Through Testing:** Epic 3 adopts a defense-in-depth testing strategy where multiple layers validate different aspects: snapshots catch any changes, assertions validate security-critical properties explicitly, integration tests verify real AWS deployment, and post-deployment validation confirms end-to-end functionality

**Deployment Architecture:**
- CDK deployment via CloudFormation with automatic rollback (NFR-REL-2)
- Zero-downtime configuration updates (NFR-REL-1)
- Idempotent deployments (FR30) - repeated deploys with no changes cause no AWS updates

**Rollback Strategy (Architecture: "Rollback Procedures"):**
- Three-tier approach from fastest to most complete
- Option 1: Disable function (< 5 minutes) - Comment out function association
- Option 2: Git revert (5-10 minutes) - Revert commit and redeploy
- Option 3: Remove origin (15 minutes) - Complete removal of routing infrastructure

**Monitoring Approach:**
- Built-in CloudFront metrics (FR41-42) - Request counts and error rates per origin
- AWS Console access for operational monitoring (NFR-OPS-5)
- No custom metrics needed for MVP (CloudFront provides sufficient visibility)

**Technology Stack:**
- Jest testing framework for CDK infrastructure tests
- CDK assertions library (`Template.fromStack`) for validation
- Bash scripting for integration test automation
- AWS CLI for resource validation
- TypeScript for test code (matches CDK language)

**Stakeholder Engagement:**
- **Operations Team:** Validates rollback procedures match operational capabilities; reviews README for actionable guidance
- **Testers:** Tester guide enables cookie routing validation with clear test scenarios
- **Future Team Members:** Onboarding path documented in README for knowledge transfer
- **Management:** Success metrics and GDS alignment provide confidence and compliance visibility
- **End Users & API Consumers:** Protected through defense-in-depth testing without requiring direct engagement

## Detailed Design

### Services and Modules

Epic 3 delivers six interconnected testing and operational modules that validate CloudFront routing infrastructure:

| Module | Location | Responsibility | Inputs | Outputs | Owner |
|--------|----------|----------------|--------|---------|-------|
| **CDK Snapshot Tests** | `infra/test/ndx-stack.test.ts` | Capture complete CloudFormation template, detect any infrastructure changes | CDK stack definition | Jest snapshot file, pass/fail | Story 3.1 |
| **CDK Assertion Tests** | `infra/test/ndx-stack.test.ts` | Validate security-critical properties explicitly (OAC, origins, function) | CDK stack definition | Property validation results | Story 3.2 |
| **Integration Test Script** | `infra/test/integration.sh` | Deploy to AWS, validate resources exist, cleanup | AWS credentials, CDK stack | Deployment success/failure, resource existence validation | Story 3.3 |
| **Rollback Procedures** | `infra/README.md` (Rollback section) | Document three-tier rollback approach with decision criteria | Incident scenario | Executable procedures, timing estimates | Story 3.4 |
| **Infrastructure README** | `infra/README.md` | Living documentation with deployment, monitoring, troubleshooting | Infrastructure changes | Updated operational guidance | Story 3.5 |
| **Pre-deployment Checklist** | `infra/scripts/pre-deploy-check.sh` | Automated validation before CDK deploy | Test results, AWS state | Pass/fail with actionable errors | Story 3.6 |

**Module Dependencies:**
- Snapshot + Assertion tests run via single `yarn test` command
- Integration test depends on CDK stack deployment capability
- Pre-deployment script orchestrates all validation (tests + lint + CDK synth + AWS health)
- README documents how to use all other modules

### Data Models and Contracts

**Test Result Schema:**
```typescript
// Jest test result (snapshot + assertions)
interface TestResult {
  numPassedTests: number;
  numFailedTests: number;
  testResults: Array<{
    testFilePath: string;
    status: 'passed' | 'failed';
    failureMessage?: string;
  }>;
  success: boolean;
}
```

**CloudFormation Template Structure (Snapshot):**
```json
{
  "Resources": {
    "AWS::CloudFront::Distribution": {
      "Properties": {
        "DistributionConfig": {
          "Origins": [
            { "Id": "S3Origin", "DomainName": "...", "OriginAccessControlId": "E3P8MA1G9Y5BYE" },
            { "Id": "ndx-static-prod-origin", "DomainName": "...", "OriginAccessControlId": "E3P8MA1G9Y5BYE" },
            { "Id": "API-Gateway-Origin", "DomainName": "..." }
          ],
          "DefaultCacheBehavior": {
            "TargetOriginId": "S3Origin",
            "CachePolicyId": "...",
            "FunctionAssociations": [{
              "EventType": "viewer-request",
              "FunctionARN": "..."
            }]
          }
        }
      }
    },
    "AWS::CloudFront::Function": {
      "Properties": {
        "Name": "ndx-cookie-router",
        "FunctionCode": "...",
        "FunctionConfig": { "Runtime": "cloudfront-js-2.0" }
      }
    },
    "AWS::CloudFront::CachePolicy": {
      "Properties": {
        "CachePolicyConfig": {
          "Name": "NdxCookieRoutingPolicy",
          "ParametersInCacheKeyAndForwardedToOrigin": {
            "CookiesConfig": {
              "CookieBehavior": "whitelist",
              "Cookies": ["NDX"]
            }
          }
        }
      }
    }
  }
}
```

**Rollback Procedure Schema:**
```markdown
## Rollback Option [1|2|3]: [Name]

**When to use:** [Decision criteria]

**Prerequisites:**
- [Required access/permissions]
- [Required tools/environment]

**Steps:**
1. [Executable command or action]
2. [Executable command or action]
...

**Expected Duration:** [Realistic timing with propagation]

**Success Criteria:**
- [How to verify rollback worked]
- [Expected state after rollback]

**Validation:**
```bash
# Commands to verify rollback success
```

**Escalation:** If this fails, escalate to [next option or contact]
```

**Pre-deployment Validation Output:**
```bash
===================================
Pre-Deployment Checklist
===================================

✓ Running tests...
✅ All tests pass (15 tests, 0 failures)

✓ Running linter...
✅ Linting clean (0 errors, 0 warnings)

✓ Validating CDK synthesis...
✅ CDK synthesis successful

✓ Checking TypeScript compilation...
✅ TypeScript compiles cleanly

✓ Validating AWS credentials...
✅ AWS credentials valid (Account: 568672915267)

✓ Checking CloudFront distribution health...
✅ Distribution E3THG4UHYDHVWP status: Deployed

===================================
✅ All checks passed!
Ready to deploy: cdk deploy --profile NDX/InnovationSandboxHub
===================================
```

### APIs and Interfaces

**CDK Test Interface:**
```typescript
// Jest test execution
yarn test                    // Run all tests
yarn test --coverage         // With coverage report
yarn test --watch            // Watch mode
yarn test -u                 // Update snapshots

// Exit codes
0: All tests passed
1: One or more tests failed

// Snapshot test pattern
test('CloudFront configuration snapshot', () => {
  const app = new cdk.App();
  const stack = new NdxStaticStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  expect(template.toJSON()).toMatchSnapshot();
});

// Assertion test pattern
test('New S3 origin configured with OAC', () => {
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Origins: expect.arrayContaining([
        expect.objectContaining({
          Id: 'ndx-static-prod-origin',
          S3OriginConfig: {
            OriginAccessIdentity: ''
          },
          OriginAccessControlId: 'E3P8MA1G9Y5BYE'
        })
      ])
    }
  });
});
```

**Integration Test Interface:**
```bash
# Command
./infra/test/integration.sh

# Exit codes
0: Integration test passed (deployment successful, resources validated, cleanup complete)
1: Integration test failed (shows failure reason and CloudFormation events)

# Output format
Starting integration test...
✓ Deploying CloudFront changes...
✓ Distribution status: Deployed
✓ Origins count: 3
✓ New origin exists: ndx-static-prod-origin
✓ CloudFront Function exists: ndx-cookie-router
✅ Integration test passed!
```

**Pre-deployment Script Interface:**
```bash
# Command
yarn pre-deploy
# OR
./infra/scripts/pre-deploy-check.sh

# Exit codes
0: All validations passed, ready to deploy
1: One or more validations failed (shows which checks failed)

# Validates
- Tests pass (yarn test)
- Linting clean (yarn lint)
- CDK synth succeeds
- TypeScript compiles
- AWS credentials valid
- CloudFront distribution healthy
```

**Rollback Execution Interface:**
```bash
# Option 1: Disable function (< 5 minutes)
# Manual: Edit lib/ndx-stack.ts, comment out function association
cdk deploy --profile NDX/InnovationSandboxHub

# Option 2: Git revert (5-10 minutes)
git log --oneline              # Identify commit
git revert <commit-hash>       # Revert changes
cd infra && cdk deploy --profile NDX/InnovationSandboxHub

# Option 3: Remove origin (15 minutes)
# Manual: Edit lib/ndx-stack.ts, remove origin + function + cache policy
cdk deploy --profile NDX/InnovationSandboxHub
```

### Workflows and Sequencing

**Story Execution Flow:**
```
Epic 3 Start
    ↓
Story 3.1: CDK Snapshot Tests
    → Create test file: infra/test/ndx-stack.test.ts
    → Write snapshot test capturing full CloudFormation
    → Run: yarn test (generates __snapshots__ directory)
    → Commit snapshot files to git
    ↓
Story 3.2: CDK Assertion Tests
    → Add assertion tests to same file
    → Validate new S3 origin properties
    → Validate API Gateway origin unchanged
    → Validate CloudFront Function properties
    → Validate Cache Policy configuration
    → Validate function attachment to cache behavior
    → All tests pass
    ↓
Story 3.3: Integration Test
    → Create script: infra/test/integration.sh
    → Deploy stack to AWS
    → Validate CloudFront distribution deployed
    → Validate origins exist (count = 3)
    → Validate specific origin: ndx-static-prod-origin
    → Validate CloudFront Function exists
    → Cleanup (optional, or leave deployed)
    → Make script executable: chmod +x
    ↓
Story 3.4: Rollback Procedures
    → Document Option 1: Disable function (< 5 minutes)
    → Document Option 2: Git revert (5-10 minutes)
    → Document Option 3: Remove origin (15 minutes)
    → Add decision criteria for each option
    → Add validation steps for each
    → Optional: Test rollback in non-production
    ↓
Story 3.5: Infrastructure README
    → Add CloudFront cookie routing overview
    → Document deployment process
    → Add monitoring guidance (CloudWatch metrics)
    → Add troubleshooting section
    → Add tester guide (cookie validation steps)
    → Add onboarding section for future team
    → Update document version and date
    ↓
Story 3.6: Pre-deployment Checklist
    → Create script: infra/scripts/pre-deploy-check.sh
    → Add validation: Tests pass
    → Add validation: Linting clean
    → Add validation: CDK synth succeeds
    → Add validation: TypeScript compiles
    → Add validation: AWS credentials valid
    → Add validation: CloudFront distribution healthy
    → Make script executable
    → Add to package.json: "pre-deploy" script
    → Update README: Run pre-deploy before cdk deploy
    ↓
Epic 3 Complete
    → All 6 stories delivered
    → Tests validate infrastructure integrity
    → Rollback procedures documented
    → Operational guidance complete
    → Ready for Epic 4 (if applicable) or UI migration
```

**Test Execution Workflow:**
```
Developer makes CDK change
    ↓
1. Run yarn lint (< 5 seconds)
    → ESLint validates TypeScript code
    → Zero errors required
    ↓
2. Run yarn test (< 10 seconds)
    → Jest executes snapshot tests
    → Snapshot detects CloudFormation changes
    → If changed: Review diff, update with yarn test -u if intentional
    → Jest executes assertion tests
    → Validates security properties unchanged
    → All tests must pass
    ↓
3. Run yarn pre-deploy (< 30 seconds)
    → Orchestrates: lint + test + synth + AWS health
    → Reports which validations passed/failed
    → Exit code 0 = ready to deploy
    ↓
4. Run cdk diff (< 60 seconds)
    → Preview infrastructure changes
    → Verify API Gateway origin unchanged
    → Verify only intended resources modified
    ↓
5. Run cdk deploy (10-15 minutes)
    → CloudFormation applies changes
    → CloudFront propagates globally
    → Monitor CloudFormation events
    ↓
6. Post-deployment validation (< 5 minutes)
    → Verify distribution status: Deployed
    → Manual: Test cookie routing with NDX=true
    → Verify production site accessible (without cookie)
    → Check CloudWatch metrics for errors
    ↓
Deployment complete ✓
```

**Incident Response Workflow (Rollback):**
```
Production incident detected
    ↓
1. Assess impact
    → Routing logic issue? (Use Option 1)
    → Recent deployment? (Use Option 2)
    → Fundamental architecture issue? (Use Option 3)
    ↓
2. Default to Option 1: Disable Function (< 5 minutes)
    → Edit lib/ndx-stack.ts
    → Comment out function association
    → Run: cdk deploy --profile NDX/InnovationSandboxHub
    → Wait for propagation (10-15 min)
    → Validate: All traffic routes to existing origin
    ↓
3. If Option 1 insufficient → Option 2: Git Revert (5-10 min)
    → Identify problematic commit
    → Run: git revert <commit>
    → Run: cd infra && cdk deploy
    → Wait for propagation
    → Validate: Configuration reverted
    ↓
4. If Option 2 insufficient → Option 3: Remove Origin (15 min)
    → Edit lib/ndx-stack.ts (remove origin, function, policy)
    → Run: cdk deploy
    → Wait for propagation
    → Validate: CloudFront back to pre-Epic-2 state
    ↓
5. Post-incident
    → Verify production stable
    → Document what failed (update pre-mortem analysis)
    → Enhance tests to catch this failure mode
    → Update rollback procedures based on learnings
```

### Test Failure Troubleshooting Matrix

Based on fishbone analysis of potential test failures, this matrix helps diagnose issues by cause category:

| Symptom | Likely Cause Category | Diagnostic Check | Solution |
|---------|----------------------|------------------|----------|
| Tests pass locally, fail for teammate | Code/Implementation | Are snapshot files committed? | Commit `__snapshots__/` directory to git |
| `cdk deploy` fails with "CDKToolkit not found" | Environment | Is CDK bootstrapped? | Run `cdk bootstrap --profile NDX/InnovationSandboxHub` |
| Assertion test fails on specific property | Configuration | Hard-coded values correct? | Use config-driven values from context |
| Integration test fails with authentication error | Environment | AWS credentials valid? | Run `aws sso login` or verify profile config |
| Test passes but production routing wrong | Code/Test Limitation | Tests validate behavior? | Tests don't validate cookie routing in AWS (manual validation required) |
| TypeScript compilation fails | Tools/Dependencies | Node.js version compatible? | Upgrade to Node.js 20.17.0+ |
| Snapshot mismatch after change | Process/Workflow | Change intentional? | Review diff: if intentional update with `yarn test -u`, else fix code |
| `OriginAccessControlId not found` error | Configuration | OAC exists in account? | Verify E3P8MA1G9Y5BYE exists or create new OAC |
| CloudFront Function syntax error | Code/Implementation | JavaScript ES5 compatible? | Use `var`, no arrow functions, no ES6 features |
| Cache policy doesn't forward cookies | Configuration | Cookie whitelist configured? | Verify NDX in CacheCookieBehavior.whitelist |
| CDK lib/CLI version mismatch warning | Tools/Dependencies | Versions aligned? | Update CLI to match lib version: `npm install -g aws-cdk@2.215.0` |
| Pre-deployment script fails | Process/Workflow | Which check failed? | Script shows specific failure (tests, lint, synth, etc.) |

**Troubleshooting Workflow:**
1. Identify symptom from table
2. Check diagnostic (run provided command/check)
3. Apply solution
4. Re-run pre-deployment validation: `yarn pre-deploy`
5. If issue persists, escalate to next cause category

**Prevention Through Design:**
Epic 3 stories include enhancements to catch these issues proactively:
- **Story 3.1 & 3.2:** Test documentation (WHAT and WHY comments)
- **Story 3.3:** Environment validation in integration test
- **Story 3.5:** Testing Philosophy section in README explaining limitations
- **Story 3.6:** Enhanced pre-deployment checks (OAC existence, CDK bootstrap, Node.js version, dependencies)

## Non-Functional Requirements

Epic 3's NFRs ensure the testing, validation, and operational infrastructure is performant, secure, reliable, and maintainable.

### Performance

**NFR-PERF-TEST-1: Fast Feedback Loop**
- **Requirement:** Unit tests (snapshot + assertions) execute in < 10 seconds
- **Rationale:** Fast tests encourage frequent execution during development
- **Validation:** Time `yarn test` execution; optimize if > 10 seconds
- **Impact:** Developer productivity and test adoption rate

**NFR-PERF-TEST-2: Pre-deployment Validation Time**
- **Requirement:** Complete pre-deployment validation (lint + test + synth + checks) completes in < 30 seconds
- **Rationale:** Validation must not significantly slow deployment workflow
- **Validation:** Time `yarn pre-deploy` execution
- **Impact:** Deployment frequency and developer experience

**NFR-PERF-TEST-3: Integration Test Duration**
- **Requirement:** Integration test (deploy + validate + cleanup) completes in < 10 minutes
- **Rationale:** Integration tests validate real AWS but should not block development for extended periods
- **Validation:** Time `./test/integration.sh` execution
- **Impact:** CI/CD pipeline duration (future), developer wait time

**NFR-PERF-DOC-1: Documentation Accessibility**
- **Requirement:** README loads and renders in < 2 seconds in any markdown viewer
- **Rationale:** Operational documentation must be quickly accessible during incidents
- **Validation:** File size < 500KB, no external dependencies
- **Impact:** Incident response time, operational effectiveness

### Security

**NFR-SEC-TEST-1: No Hardcoded Credentials**
- **Requirement:** Test code contains zero hardcoded AWS credentials, access keys, or secrets
- **Rationale:** Tests in version control must not expose sensitive data
- **Validation:** Grep codebase for patterns: `AWS_ACCESS_KEY`, `aws_secret`, hardcoded keys
- **Impact:** Security posture, compliance

**NFR-SEC-TEST-2: AWS Profile Isolation**
- **Requirement:** All AWS operations use `--profile NDX/InnovationSandboxHub` flag, never default profile
- **Rationale:** Prevents accidental operations in wrong account
- **Validation:** Grep test/script files for AWS CLI/SDK calls; all must specify profile
- **Impact:** Multi-account safety, operational risk

**NFR-SEC-TEST-3: Test Isolation**
- **Requirement:** Tests do not modify production CloudFront distribution; integration test uses test context
- **Rationale:** Testing must not impact production service
- **Validation:** Integration test script uses different distribution ID or test account
- **Impact:** Production stability during testing

**NFR-SEC-DOC-1: Sensitive Information Protection**
- **Requirement:** Documentation contains no account numbers, credentials, or internal URLs (use placeholders or examples)
- **Rationale:** Documentation may be shared outside team
- **Validation:** README review for sensitive data before publishing
- **Impact:** Information security, compliance

### Reliability

**NFR-REL-TEST-1: Deterministic Test Results**
- **Requirement:** Tests produce identical results across executions (no flaky tests)
- **Rationale:** Flaky tests erode confidence and waste developer time
- **Validation:** Run tests 10 times; all runs must produce identical pass/fail results
- **Impact:** Developer confidence, test reliability

**NFR-REL-TEST-2: Clear Error Messages**
- **Requirement:** Test failures provide actionable error messages identifying what failed and why
- **Rationale:** Debugging test failures should not require code reading
- **Validation:** Review test failure output; must include: assertion that failed, expected vs actual, file:line
- **Impact:** Developer productivity, debugging time

**NFR-REL-SCRIPT-1: Idempotent Scripts**
- **Requirement:** Pre-deployment script can be run multiple times without side effects
- **Rationale:** Developers may re-run validation after fixing issues
- **Validation:** Run `yarn pre-deploy` twice; second run should produce same results
- **Impact:** Developer experience, reliability

**NFR-REL-ROLLBACK-1: Rollback Reliability**
- **Requirement:** Option 1 rollback (disable function) succeeds 100% of time when procedure followed
- **Rationale:** Rollback is last line of defense; must be reliable
- **Validation:** Test rollback in non-production environment; document any failure modes
- **Impact:** Incident recovery capability, service availability

**NFR-REL-ROLLBACK-2: Realistic Timing Estimates**
- **Requirement:** Documented rollback timings must be accurate ±20% including CloudFront propagation
- **Rationale:** Incident response requires accurate time expectations
- **Validation:** Time actual rollback execution; update documentation if variance > 20%
- **Impact:** Incident management, stakeholder communication

### Maintainability

**NFR-MAINT-TEST-1: Test Code Quality**
- **Requirement:** Test code passes ESLint with zero errors using same rules as application code
- **Rationale:** Test code is maintained code; must meet quality standards
- **Validation:** `yarn lint` in `/infra` directory; exit code 0
- **Impact:** Test maintainability, technical debt

**NFR-MAINT-TEST-2: Test Documentation**
- **Requirement:** Every test includes comment explaining WHAT is validated and WHY (requirement reference)
- **Rationale:** Future developers must understand test purpose without archaeology
- **Validation:** Code review; every test has explanatory comment
- **Impact:** Test maintainability, knowledge transfer

**NFR-MAINT-TEST-3: Snapshot Commit Discipline**
- **Requirement:** Snapshot files committed to git with commit message explaining why snapshot changed
- **Rationale:** Snapshot changes must be traceable and intentional
- **Validation:** Git history shows snapshot changes with explanatory commit messages
- **Impact:** Change traceability, intentionality

**NFR-MAINT-DOC-1: Living Documentation**
- **Requirement:** README includes version number and last-updated date; updated within 1 week of infrastructure changes
- **Rationale:** Documentation drift creates operational risk
- **Validation:** README header shows current version; git history shows updates with code changes
- **Impact:** Operational effectiveness, accuracy

**NFR-MAINT-DOC-2: Documentation Maintenance Ownership**
- **Requirement:** README maintenance section clearly defines who updates documentation and when
- **Rationale:** Ambiguous ownership leads to stale documentation
- **Validation:** README contains explicit maintenance section
- **Impact:** Documentation freshness, accountability

**NFR-MAINT-SCRIPT-1: Script Maintainability**
- **Requirement:** Bash scripts use clear variable names, comments for complex logic, and consistent formatting
- **Rationale:** Scripts are operational code; must be maintainable
- **Validation:** Code review using ShellCheck or similar linter
- **Impact:** Script reliability, future modifications

### Operational Excellence

**NFR-OPS-TEST-1: Test Failure Actionability**
- **Requirement:** When tests fail, error message must include: what failed, expected vs actual, next action to take
- **Rationale:** Operational staff may not be test experts
- **Validation:** Trigger test failures; review error output for actionability
- **Impact:** Operational efficiency, MTTR (Mean Time To Resolution)

**NFR-OPS-VAL-1: Pre-deployment Validation Clarity**
- **Requirement:** Pre-deployment script output clearly shows which checks passed/failed with ✓/✗ indicators
- **Rationale:** Visual clarity enables quick assessment
- **Validation:** Run script; output uses consistent visual indicators
- **Impact:** Operational visibility, decision-making speed

**NFR-OPS-ROLLBACK-1: Rollback Decision Guidance**
- **Requirement:** Rollback documentation includes decision matrix: which option to use based on incident characteristics
- **Rationale:** Incident pressure requires clear decision criteria
- **Validation:** Documentation contains explicit "When to use" section for each rollback option
- **Impact:** Incident response effectiveness, decision confidence

**NFR-OPS-ROLLBACK-2: Rollback Validation Steps**
- **Requirement:** Each rollback procedure includes validation steps to confirm rollback succeeded
- **Rationale:** Must verify recovery, not assume it
- **Validation:** Documentation contains "Success Criteria" section for each rollback
- **Impact:** Incident resolution confidence, verification

**NFR-OPS-DOC-1: Operational Runbook Completeness**
- **Requirement:** README contains deployment process, monitoring guidance, and troubleshooting for all common scenarios
- **Rationale:** Operations team must be self-sufficient without developer escalation
- **Validation:** README review by operations team (or developer after 48 hours)
- **Impact:** Operational independence, developer interruptions

**NFR-OPS-DOC-2: Troubleshooting Matrix Usability**
- **Requirement:** Troubleshooting matrix maps symptoms to solutions in < 3 clicks/scrolls from README root
- **Rationale:** Incident response requires fast access to troubleshooting guidance
- **Validation:** Navigation test from README top to solution
- **Impact:** MTTR, operational efficiency

### Scalability

**NFR-SCALE-TEST-1: Test Suite Growth**
- **Requirement:** Test execution time must scale linearly with test count (no exponential slowdown)
- **Rationale:** As infrastructure grows, test suite will expand
- **Validation:** Measure test time per test; consistent average indicates linear scaling
- **Impact:** Long-term maintainability, CI/CD viability

**NFR-SCALE-TEST-2: Assertion Test Extensibility**
- **Requirement:** Assertion test structure allows adding new property validations without rewriting existing tests
- **Rationale:** Epic 4+ may add more CloudFront resources
- **Validation:** Code structure uses modular test functions
- **Impact:** Future development velocity, technical debt

**NFR-SCALE-DOC-1: Documentation Scalability**
- **Requirement:** README structure supports adding new sections without reorganization (table of contents, clear hierarchy)
- **Rationale:** Documentation grows with infrastructure
- **Validation:** README has logical section hierarchy and TOC links
- **Impact:** Documentation maintainability, findability

### Compliance & Auditability

**NFR-COMP-TEST-1: Version Controlled Tests**
- **Requirement:** All test code, scripts, and snapshot files committed to git repository
- **Rationale:** Audit trail of test changes and coverage evolution
- **Validation:** Git repository contains complete test infrastructure
- **Impact:** Compliance, change traceability

**NFR-COMP-TEST-2: Test Change Traceability**
- **Requirement:** Test changes committed with meaningful messages referencing story/requirement
- **Rationale:** Understand why tests changed over time
- **Validation:** Git commit messages follow format: "test(epic-3): [description] - Story X.Y"
- **Impact:** Audit trail, change justification

**NFR-COMP-ROLLBACK-1: Rollback Documentation Auditability**
- **Requirement:** Rollback procedures document who executed, when, and outcome (in git or incident log)
- **Rationale:** Accountability for production changes
- **Validation:** Rollback execution includes documentation step
- **Impact:** Compliance, incident post-mortems

**NFR-COMP-DOC-1: Documentation Review Trail**
- **Requirement:** README updates include git commit with author and date
- **Rationale:** Track documentation evolution and ownership
- **Validation:** Git history shows README changes with metadata
- **Impact:** Accountability, knowledge management

**NFR-COMP-GDS-1: GDS Service Standard Compliance**
- **Requirement:** Testing approach aligns with GDS Service Standard Point 10 (test the service)
- **Rationale:** UK government service must follow GDS standards
- **Validation:** Epic 3 deliverables map to GDS Point 10 requirements
- **Impact:** Government compliance, service certification

## Dependencies and Integrations

### External Dependencies

**Testing Framework Dependencies (from `/infra/package.json`):**

**Production Dependencies:**
- `aws-cdk-lib@2.215.0` - AWS CDK core library (required for Template.fromStack)
- `constructs@^10.0.0` - CDK construct framework

**Development Dependencies (Testing & Validation):**
- `@types/jest@^29.5.14` - Jest TypeScript types for test authoring
- `jest@^29.7.0` - Testing framework for snapshot and assertion tests
- `ts-jest@^29.2.5` - Jest TypeScript support for test execution
- `@types/node@22.7.9` - Node.js TypeScript types

**Development Dependencies (Code Quality):**
- `eslint@^9.39.1` - Code linting for test quality
- `@eslint/js@^9.39.1` - ESLint core rules
- `typescript-eslint@^8.47.0` - TypeScript ESLint integration
- `eslint-plugin-awscdk@^4.0.4` - AWS CDK best practice rules

**Development Dependencies (Build & Execution):**
- `aws-cdk@2.1032.0` - CDK CLI tool for deployment and synthesis
- `ts-node@^10.9.2` - TypeScript execution for scripts
- `typescript@~5.9.3` - TypeScript compiler

**System Dependencies:**
- **AWS CLI v2.x** - Required for integration test and pre-deployment validation
- **Bash shell** - Required for integration test and pre-deployment scripts (macOS/Linux)
- **Node.js 20.17.0+** - Runtime for Jest tests and CDK operations
- **Yarn 4.5.0+** - Package manager and script runner
- **Git** - Version control for test snapshots and documentation

**AWS Service Dependencies:**
- **CloudFormation** - CDK deployment target; integration test deploys stacks
- **CloudFront** - Service under test; distribution must exist from Epic 1 & 2
- **S3** - Origins being validated in tests
- **IAM** - AWS profile with permissions for CloudFormation, CloudFront, S3 read access

### Integration Points

**1. CDK to Jest Integration:**
```typescript
// Integration flow
import { Template } from 'aws-cdk-lib/assertions';
import { NdxStaticStack } from '../lib/ndx-stack';

// CDK stack → CloudFormation template → Jest assertions
const app = new cdk.App();
const stack = new NdxStaticStack(app, 'TestStack');
const template = Template.fromStack(stack);  // Integration point

// Jest can now validate CloudFormation template
expect(template.toJSON()).toMatchSnapshot();
```

**Integration Requirements:**
- CDK lib and Jest must be compatible versions
- Template.fromStack() requires CDK stack instance
- Snapshot files written to `__snapshots__/` directory

**2. Pre-deployment Script to Validation Tools:**
```bash
# Script orchestrates multiple tools
yarn test          # Jest integration
yarn lint          # ESLint integration
cdk synth         # CDK CLI integration
aws sts get-caller-identity  # AWS CLI integration
aws cloudfront get-distribution  # AWS service integration
```

**Integration Requirements:**
- All tools must be in PATH
- AWS profile must be configured
- CDK must be bootstrapped in account

**3. Integration Test to AWS Services:**
```bash
# Integration test deploys to real AWS
cdk deploy --context env=test --profile NDX/InnovationSandboxHub

# Validates resources via AWS CLI
aws cloudfront get-distribution --id <id>
aws cloudfront describe-function --name ndx-cookie-router
```

**Integration Requirements:**
- AWS credentials with CloudFormation, CloudFront, S3 permissions
- CloudFront distribution exists (Epic 1 & 2 prerequisite)
- Account has sufficient CloudFront quotas (distributions, functions, cache policies)

**4. Documentation to Operational Workflow:**
- README consumed by developers during deployment
- Rollback procedures consumed by operations during incidents
- Troubleshooting matrix consumed during test failures
- Tester guide consumed by QA team during validation

**Integration Requirements:**
- Documentation accessible in git repository
- Markdown rendering supported in team's tools (GitHub, VS Code, etc.)

### Version Constraints

**Critical Version Alignments:**
- `aws-cdk-lib` and `aws-cdk` CLI must match major.minor versions (currently 2.x)
- `jest` and `ts-jest` must be compatible (currently Jest 29.x with ts-jest 29.x)
- `typescript` version must be compatible with CDK (currently ~5.9.3)
- `eslint` version must support flat config (currently 9.x+)

**Node.js Compatibility Matrix:**
| Component | Minimum Node.js Version | Reason |
|-----------|------------------------|--------|
| AWS CDK | 20.17.0 | CDK 2.x requires Node 20+ |
| Jest | 18.0.0 | Jest 29.x works with Node 18+ |
| TypeScript | 18.0.0 | TS 5.x works with Node 18+ |
| **Epic 3 Requirement** | **20.17.0** | **Most restrictive (CDK)** |

### Dependency Risk Mitigation

**Risk 1: CDK Version Drift**
- **Risk:** `aws-cdk-lib` and `aws-cdk` CLI versions drift apart
- **Impact:** CDK synth failures or deployment issues
- **Mitigation:** Pre-deployment script validates version alignment (NFR-MAINT-TEST-1)

**Risk 2: Transitive Dependency Vulnerabilities**
- **Risk:** Jest or ESLint dependencies have security vulnerabilities
- **Impact:** Security compliance issues
- **Mitigation:** Regular `yarn audit` and dependency updates; deferred to growth phase for MVP

**Risk 3: AWS CLI v1 vs v2 Differences**
- **Risk:** Scripts assume CLI v2 but developer has v1 installed
- **Impact:** Script failures due to output format differences
- **Mitigation:** Pre-deployment script validates AWS CLI version

**Risk 4: Node.js Version Mismatch**
- **Risk:** Developer runs tests with Node.js 18.x instead of 20.x
- **Impact:** CDK operations fail or tests produce inconsistent results
- **Mitigation:** Pre-deployment script validates Node.js version (added in Fishbone analysis)

## Acceptance Criteria and Traceability

Epic 3 acceptance criteria are organized by story, ensuring complete coverage of functional requirements and NFRs.

### Story 3.1: CDK Snapshot Tests

**AC-3.1.1: Snapshot Test Creation**
- **Given:** CDK stack defined in `lib/ndx-stack.ts`
- **When:** Snapshot test executed via `yarn test`
- **Then:**
  - Test file created at `infra/test/ndx-stack.test.ts`
  - Test generates complete CloudFormation template snapshot
  - Snapshot file created in `__snapshots__/ndx-stack.test.ts.snap`
  - Snapshot includes all CloudFormation resources (Distribution, Function, CachePolicy, Origins)

**AC-3.1.2: Snapshot Change Detection**
- **Given:** Existing snapshot committed to git
- **When:** CDK stack changes (any resource modification)
- **Then:**
  - `yarn test` detects snapshot mismatch
  - Test fails with clear diff showing what changed
  - Developer can review diff and decide: update snapshot or fix code
  - `yarn test -u` updates snapshot if change intentional

**AC-3.1.3: Snapshot Commit Discipline**
- **Given:** Snapshot file modified
- **When:** Changes committed to git
- **Then:**
  - Snapshot file included in commit (not gitignored)
  - Commit message explains why snapshot changed
  - Git history shows snapshot evolution

**AC-3.1.4: Test Documentation**
- **Given:** Snapshot test code
- **When:** Code reviewed
- **Then:**
  - Test includes comment explaining WHAT is validated (full CloudFormation template)
  - Test includes comment explaining WHY (regression detection)
  - Test name clearly describes validation: `'CloudFront configuration snapshot'`

**Traceability:**
- Maps to: NFR-MAINT-TEST-2 (test documentation)
- Maps to: NFR-MAINT-TEST-3 (snapshot commit discipline)
- Maps to: NFR-COMP-TEST-1 (version controlled tests)

---

### Story 3.2: Fine-Grained Assertion Tests

**AC-3.2.1: New S3 Origin Validation**
- **Given:** CloudFormation template from CDK stack
- **When:** Assertion tests executed
- **Then:**
  - Test validates `ndx-static-prod-origin` exists in Origins array
  - Test validates S3OriginConfig with empty OriginAccessIdentity (uses OAC)
  - Test validates OriginAccessControlId = 'E3P8MA1G9Y5BYE'
  - Test validates DomainName matches S3 bucket

**AC-3.2.2: Existing Origin Preservation**
- **Given:** CloudFormation template from CDK stack
- **When:** Assertion tests executed
- **Then:**
  - Test validates API Gateway origin exists and unchanged
  - Test validates exact DomainName, OriginPath values match pre-Epic-2 state
  - Test validates existing S3 origin unchanged (if applicable)
  - Test explicitly validates origin count = 3 (no accidental additions/deletions)

**AC-3.2.3: CloudFront Function Validation**
- **Given:** CloudFormation template from CDK stack
- **When:** Assertion tests executed
- **Then:**
  - Test validates CloudFront Function resource exists
  - Test validates FunctionConfig.Runtime = 'cloudfront-js-2.0'
  - Test validates FunctionCode contains cookie routing logic
  - Test validates Name = 'ndx-cookie-router'

**AC-3.2.4: Cache Policy Validation**
- **Given:** CloudFormation template from CDK stack
- **When:** Assertion tests executed
- **Then:**
  - Test validates CachePolicy resource exists
  - Test validates CookiesConfig.CookieBehavior = 'whitelist'
  - Test validates Cookies array contains 'NDX'
  - Test validates Name = 'NdxCookieRoutingPolicy'

**AC-3.2.5: Function Attachment Validation**
- **Given:** CloudFormation template from CDK stack
- **When:** Assertion tests executed
- **Then:**
  - Test validates DefaultCacheBehavior has FunctionAssociations
  - Test validates EventType = 'viewer-request'
  - Test validates FunctionARN references ndx-cookie-router function
  - Test validates CachePolicyId references NdxCookieRoutingPolicy

**AC-3.2.6: Test Documentation and Quality**
- **Given:** Assertion test code
- **When:** Code reviewed
- **Then:**
  - Each test has comment explaining WHAT and WHY
  - Test names are descriptive (e.g., 'API Gateway origin configuration unchanged')
  - Tests pass ESLint validation (zero errors)
  - Tests use config-driven values, not hard-coded (where applicable)

**Traceability:**
- Maps to: FR1-FR6 (CloudFront cookie routing requirements)
- Maps to: NFR-SEC-TEST-1 (no hardcoded credentials)
- Maps to: NFR-MAINT-TEST-1 (test code quality)
- Maps to: NFR-MAINT-TEST-2 (test documentation)

---

### Story 3.3: Integration Test

**AC-3.3.1: Integration Test Script Creation**
- **Given:** CDK stack definition
- **When:** Integration test script created at `infra/test/integration.sh`
- **Then:**
  - Script is executable (`chmod +x`)
  - Script uses bash shebang
  - Script includes clear comments explaining each validation step
  - Script returns exit code 0 on success, 1 on failure

**AC-3.3.2: AWS Deployment Validation**
- **Given:** Integration test executed
- **When:** Script runs `cdk deploy --context env=test`
- **Then:**
  - CloudFormation stack deploys successfully to AWS
  - Script validates deployment status = CREATE_COMPLETE or UPDATE_COMPLETE
  - Script captures CloudFormation events on failure
  - Script uses `--profile NDX/InnovationSandboxHub` for all AWS operations

**AC-3.3.3: CloudFront Resource Validation**
- **Given:** CDK stack deployed to AWS
- **When:** Validation steps executed
- **Then:**
  - Script validates CloudFront distribution status = 'Deployed'
  - Script validates distribution has 3 origins
  - Script validates origin 'ndx-static-prod-origin' exists
  - Script validates CloudFront Function 'ndx-cookie-router' exists

**AC-3.3.4: Test Cleanup**
- **Given:** Integration test complete
- **When:** Cleanup step runs (optional for MVP)
- **Then:**
  - Option 1: Script leaves stack deployed (developer manually destroys later)
  - Option 2: Script runs `cdk destroy` after validation (if test environment)
  - Script documents which cleanup approach is used

**AC-3.3.5: Environment Validation**
- **Given:** Integration test starts
- **When:** Environment checks run
- **Then:**
  - Script validates AWS credentials are valid
  - Script validates CDK is bootstrapped
  - Script provides clear error messages if prerequisites missing

**Traceability:**
- Maps to: NFR-REL-TEST-1 (deterministic results)
- Maps to: NFR-SEC-TEST-2 (AWS profile isolation)
- Maps to: NFR-SEC-TEST-3 (test isolation)
- Maps to: NFR-PERF-TEST-3 (integration test duration < 10 minutes)

---

### Story 3.4: Rollback Procedures

**AC-3.4.1: Three-Tier Rollback Documentation**
- **Given:** Rollback procedures section in README
- **When:** Documentation reviewed
- **Then:**
  - Option 1 documented: Disable function (< 5 minutes)
  - Option 2 documented: Git revert (5-10 minutes)
  - Option 3 documented: Remove origin (15 minutes)
  - Each option includes: When to use, Prerequisites, Steps, Expected duration, Success criteria, Escalation path

**AC-3.4.2: Rollback Decision Matrix**
- **Given:** Incident occurs requiring rollback
- **When:** Operations team consults documentation
- **Then:**
  - Clear decision criteria for which option to use:
    - Option 1: Routing logic issue, origins intact
    - Option 2: Recent deployment, clear commit to revert
    - Option 3: Fundamental architecture issue, need complete removal
  - Default recommendation: Start with Option 1

**AC-3.4.3: Executable Procedures**
- **Given:** Rollback procedure steps
- **When:** Operations team executes procedure
- **Then:**
  - All commands are copy-pasteable (correct syntax)
  - Commands include --profile flag for AWS operations
  - Steps include validation after each major action
  - Manual steps clearly marked (e.g., "Edit lib/ndx-stack.ts")

**AC-3.4.4: Success Validation**
- **Given:** Rollback executed
- **When:** Success criteria checked
- **Then:**
  - Each option documents how to verify rollback worked:
    - Option 1: All traffic routes to existing origin (no NDX cookie routing)
    - Option 2: Configuration matches pre-change state
    - Option 3: CloudFront back to pre-Epic-2 state
  - Validation commands provided (e.g., aws cloudfront get-distribution)

**AC-3.4.5: Realistic Timing**
- **Given:** Rollback procedures documented
- **When:** Timings reviewed
- **Then:**
  - Timings include CloudFront propagation (10-15 minutes)
  - Timings are realistic based on operational testing or reasonable estimates
  - Documentation notes that propagation time may vary

**Traceability:**
- Maps to: NFR-REL-ROLLBACK-1 (rollback reliability)
- Maps to: NFR-REL-ROLLBACK-2 (realistic timing estimates)
- Maps to: NFR-OPS-ROLLBACK-1 (rollback decision guidance)
- Maps to: NFR-OPS-ROLLBACK-2 (rollback validation steps)

---

### Story 3.5: Infrastructure README

**AC-3.5.1: CloudFront Routing Overview**
- **Given:** README file at `infra/README.md`
- **When:** Overview section read
- **Then:**
  - Explains NDX CloudFront cookie routing purpose
  - Summarizes architecture (3 origins, cookie-based routing, CloudFront Function)
  - Links to full architecture documentation

**AC-3.5.2: Deployment Process Documentation**
- **Given:** Deployment section in README
- **When:** Developer follows deployment steps
- **Then:**
  - Clear separation: infrastructure changes vs file uploads
  - Step-by-step CDK deployment process
  - Pre-deployment validation steps (yarn pre-deploy)
  - Post-deployment validation checklist

**AC-3.5.3: Monitoring Guidance**
- **Given:** Monitoring section in README
- **When:** Operations team monitors CloudFront
- **Then:**
  - Documents built-in CloudFront metrics to check
  - Explains how to access metrics in AWS Console
  - Provides CloudWatch Insights queries (if applicable)
  - Links to FR41-FR42 (request counts, error rates per origin)

**AC-3.5.4: Troubleshooting Section**
- **Given:** Troubleshooting section in README
- **When:** Issue occurs
- **Then:**
  - Includes test failure troubleshooting matrix from Detailed Design
  - Documents common deployment issues and solutions
  - Links to rollback procedures
  - Provides diagnostic commands for investigation

**AC-3.5.5: Tester Guide**
- **Given:** Tester guide section in README
- **When:** QA team validates cookie routing
- **Then:**
  - Step-by-step instructions for setting NDX cookie
  - Test scenarios: with cookie, without cookie, cookie removal
  - Expected outcomes for each scenario
  - Validation steps (visual, network tab inspection)

**AC-3.5.6: Onboarding Section**
- **Given:** Onboarding section in README
- **When:** New team member joins project
- **Then:**
  - Clear learning path: Architecture → Tests → Validation → Deployment
  - Prerequisites with verification commands
  - First-time setup instructions
  - Links to key documents

**AC-3.5.7: Living Documentation Metadata**
- **Given:** README header
- **When:** Documentation reviewed
- **Then:**
  - Document version number displayed
  - Last updated date displayed
  - Maintenance section defines: Who updates, When to update, Review cadence
  - Git history shows regular README updates alongside code changes

**Traceability:**
- Maps to: NFR-MAINT-DOC-1 (living documentation)
- Maps to: NFR-MAINT-DOC-2 (documentation ownership)
- Maps to: NFR-OPS-DOC-1 (operational runbook completeness)
- Maps to: NFR-PERF-DOC-1 (documentation accessibility)
- Maps to: Stakeholder engagement (operations, testers, future team)

---

### Story 3.6: Pre-deployment Checklist

**AC-3.6.1: Pre-deployment Script Creation**
- **Given:** Pre-deployment validation requirements
- **When:** Script created at `infra/scripts/pre-deploy-check.sh`
- **Then:**
  - Script is executable
  - Script uses bash with clear structure
  - Script exits 0 if all checks pass, 1 if any check fails
  - Script added to package.json as "pre-deploy" script

**AC-3.6.2: Test Execution Validation**
- **Given:** Pre-deployment script runs
- **When:** Test validation executes
- **Then:**
  - Script runs `yarn test`
  - Script captures exit code
  - Script reports: "✅ All tests pass (X tests, 0 failures)" or "❌ Tests failed"
  - Failure increments error counter

**AC-3.6.3: Linting Validation**
- **Given:** Pre-deployment script runs
- **When:** Linting validation executes
- **Then:**
  - Script runs `yarn lint`
  - Script captures exit code
  - Script reports: "✅ Linting clean (0 errors, 0 warnings)" or "❌ Linting failed"
  - Failure increments error counter

**AC-3.6.4: CDK Synthesis Validation**
- **Given:** Pre-deployment script runs
- **When:** CDK synthesis validation executes
- **Then:**
  - Script runs `cdk synth --quiet`
  - Script captures exit code
  - Script reports: "✅ CDK synthesis successful" or "❌ CDK synthesis failed"
  - Failure increments error counter

**AC-3.6.5: TypeScript Compilation Validation**
- **Given:** Pre-deployment script runs
- **When:** TypeScript validation executes
- **Then:**
  - Script runs `tsc --noEmit` (or checks via yarn test success)
  - Script reports: "✅ TypeScript compiles cleanly" or "❌ TypeScript errors"
  - Failure increments error counter

**AC-3.6.6: AWS Credentials Validation**
- **Given:** Pre-deployment script runs
- **When:** AWS credentials validation executes
- **Then:**
  - Script runs `aws sts get-caller-identity --profile NDX/InnovationSandboxHub`
  - Script captures exit code and account number
  - Script reports: "✅ AWS credentials valid (Account: 568672915267)" or "❌ AWS credentials invalid"
  - Failure increments error counter

**AC-3.6.7: CloudFront Distribution Health**
- **Given:** Pre-deployment script runs
- **When:** CloudFront validation executes
- **Then:**
  - Script runs `aws cloudfront get-distribution --id E3THG4UHYDHVWP`
  - Script validates DistributionStatus = 'Deployed'
  - Script reports: "✅ Distribution E3THG4UHYDHVWP status: Deployed" or "❌ Distribution not healthy"
  - Failure increments error counter

**AC-3.6.8: Enhanced Validations (from Fishbone Analysis)**
- **Given:** Pre-deployment script runs
- **When:** Enhanced validations execute
- **Then:**
  - Script validates OAC exists: `aws cloudfront get-origin-access-control --id E3P8MA1G9Y5BYE`
  - Script validates CDK bootstrap: `aws cloudformation describe-stacks --stack-name CDKToolkit`
  - Script validates Node.js version >= 20.17.0
  - Script validates dependencies installed: `node_modules` directory exists
  - Each validation reports clear pass/fail status

**AC-3.6.9: Output Formatting**
- **Given:** Pre-deployment script completes
- **When:** Output reviewed
- **Then:**
  - Clear section header: "Pre-Deployment Checklist"
  - Each check shows: "✓ Running [check]..." then "✅ Passed" or "❌ Failed"
  - Final summary: "✅ All checks passed! Ready to deploy: cdk deploy ..." or "❌ X checks failed"
  - Visual indicators (✓, ✅, ❌) consistent throughout

**AC-3.6.10: README Integration**
- **Given:** Pre-deployment script implemented
- **When:** README deployment section updated
- **Then:**
  - README documents: "Before deploying, run: yarn pre-deploy"
  - README explains what pre-deploy script validates
  - README notes: Script must pass before cdk deploy

**Traceability:**
- Maps to: NFR-PERF-TEST-2 (validation time < 30 seconds)
- Maps to: NFR-REL-SCRIPT-1 (idempotent scripts)
- Maps to: NFR-OPS-VAL-1 (validation clarity)
- Maps to: Fishbone troubleshooting matrix (proactive issue detection)

---

### Traceability Matrix Summary

| Story | Functional Requirements | Non-Functional Requirements | Architecture Decisions |
|-------|------------------------|----------------------------|------------------------|
| 3.1 | Regression detection | NFR-MAINT-TEST-2, NFR-MAINT-TEST-3, NFR-COMP-TEST-1 | ADR-005 (testing strategy) |
| 3.2 | FR1-FR6 (routing config) | NFR-SEC-TEST-1, NFR-MAINT-TEST-1, NFR-MAINT-TEST-2 | ADR-005 (assertion tests) |
| 3.3 | Real AWS validation | NFR-REL-TEST-1, NFR-SEC-TEST-2, NFR-SEC-TEST-3, NFR-PERF-TEST-3 | ADR-005 (integration testing) |
| 3.4 | FR incident recovery | NFR-REL-ROLLBACK-1, NFR-REL-ROLLBACK-2, NFR-OPS-ROLLBACK-1, NFR-OPS-ROLLBACK-2 | Architecture rollback procedures |
| 3.5 | Operational guidance | NFR-MAINT-DOC-1, NFR-MAINT-DOC-2, NFR-OPS-DOC-1, NFR-PERF-DOC-1 | Stakeholder engagement |
| 3.6 | Pre-deployment safety | NFR-PERF-TEST-2, NFR-REL-SCRIPT-1, NFR-OPS-VAL-1 | Fishbone prevention measures |

## Risks, Assumptions, and Test Strategy

### Risks

**Risk 1: Test False Negatives (High Severity)**
- **Description:** Tests pass but miss real CloudFront configuration issues
- **Likelihood:** Medium - Tests validate CloudFormation template, not runtime AWS behavior
- **Impact:** High - False confidence leads to production deployment of broken routing
- **Mitigation:**
  - Defense-in-depth testing: Snapshots + Assertions + Integration + Manual validation
  - Integration test validates resources in real AWS, not just template
  - Troubleshooting matrix documents test limitations
  - Post-deployment validation includes manual cookie routing test
- **Contingency:** If production issue occurs despite passing tests, enhance test coverage and add to regression suite

**Risk 2: Integration Test Environment Drift (Medium Severity)**
- **Description:** Test environment differs from production (different distribution, origins, configuration)
- **Likelihood:** High - Test and production are separate environments
- **Impact:** Medium - Integration tests pass but production deployment fails
- **Mitigation:**
  - Integration test uses production-like configuration
  - Pre-deployment validation checks production CloudFront distribution health
  - CDK diff reviewed before production deployment
- **Contingency:** Manual validation in production before enabling cookie routing

**Risk 3: Flaky Integration Tests (Medium Severity)**
- **Description:** Integration tests intermittently fail due to AWS API throttling, timeouts, or eventual consistency
- **Likelihood:** Medium - AWS services have eventual consistency and rate limits
- **Impact:** Medium - Developer time wasted investigating false failures
- **Mitigation:**
  - Integration test includes retry logic for AWS API calls
  - Test marked as optional for MVP (required before production deployment only)
  - Clear error messages distinguish AWS issues from configuration issues
- **Contingency:** If integration test consistently flaky, mark as manual-only and document known issues

**Risk 4: Snapshot Staleness (Low Severity)**
- **Description:** Developers update snapshots blindly without reviewing changes
- **Likelihood:** Medium - Time pressure encourages `yarn test -u` without review
- **Impact:** Low-Medium - Unintended changes slip through
- **Mitigation:**
  - AC requires snapshot commit messages explaining WHY
  - README documents snapshot update protocol
  - Assertion tests provide second layer of validation
- **Contingency:** Code review process catches unexplained snapshot changes

**Risk 5: Rollback Procedure Untested (High Severity)**
- **Description:** Rollback procedures documented but never executed; may not work during real incident
- **Likelihood:** Medium - MVP timeline pressure may skip rollback testing
- **Impact:** High - Unable to recover from production incident
- **Mitigation:**
  - Story 3.4 AC recommends testing rollback in non-production
  - Rollback procedures designed to be simple and low-risk
  - Option 1 (disable function) is reversible and fast
- **Contingency:** During first production incident, follow procedures carefully and update based on learnings

**Risk 6: Documentation Drift (Medium Severity)**
- **Description:** README becomes outdated as infrastructure evolves
- **Likelihood:** High - Documentation naturally drifts without discipline
- **Impact:** Medium - Operations team follows incorrect procedures
- **Mitigation:**
  - README includes version and last-updated metadata
  - Maintenance section establishes ownership and update cadence
  - Living documentation is NFR requirement
- **Contingency:** Regular documentation review (monthly or with each infrastructure change)

**Risk 7: Node.js/Dependency Version Issues (Low Severity)**
- **Description:** Developer environment has incompatible Node.js or dependency versions
- **Likelihood:** Low-Medium - New team members or environment changes
- **Impact:** Low - Pre-deployment script catches issues before deployment
- **Mitigation:**
  - Pre-deployment script validates Node.js version, CDK alignment, dependencies
  - README documents prerequisites with verification commands
  - Troubleshooting matrix includes version mismatch symptoms
- **Contingency:** Pre-deployment validation catches issues; developer fixes environment

### Assumptions

**Assumption 1: Epic 1 & 2 Complete**
- CloudFront distribution exists with ID E3THG4UHYDHVWP
- Distribution has working origins (S3 existing, API Gateway)
- OAC E3P8MA1G9Y5BYE exists and is functional
- Validation: Pre-deployment script validates distribution exists and is deployed

**Assumption 2: Single Developer Environment**
- One developer (cns) with AWS access
- Manual deployment acceptable for MVP
- No team coordination issues with test execution
- Validation: Scope explicitly accepts manual deployment for MVP

**Assumption 3: AWS Profile Pre-configured**
- Developer has `NDX/InnovationSandboxHub` profile configured with valid credentials
- Profile has permissions: CloudFormation, CloudFront read/write, S3 read
- Validation: Pre-deployment script validates credentials and permissions

**Assumption 4: CDK Bootstrap Complete**
- AWS account 568672915267 is bootstrapped for CDK in us-west-2
- CDKToolkit stack exists and is current version
- Validation: Pre-deployment script checks CDK bootstrap status

**Assumption 5: Test Limitations Acceptable**
- Tests validate CloudFormation template and resource existence, not runtime routing behavior
- Manual cookie routing validation acceptable for MVP
- Comprehensive end-to-end testing deferred to growth phase
- Validation: README documents test limitations and manual validation steps

**Assumption 6: CloudFront Propagation Time**
- CloudFront changes take 10-15 minutes to propagate globally
- Validation occurs after propagation completes
- Rollback timing includes propagation time
- Validation: Documented in rollback procedures

**Assumption 7: No Multi-Environment Complexity**
- Single production environment (no dev/staging/prod separation)
- Integration test optional for MVP (uses same environment or test account)
- Multi-environment deferred to growth phase
- Validation: Scope explicitly excludes multi-environment automation

### Open Questions

**Question 1: Integration Test Cleanup Strategy**
- **Question:** Should integration test destroy resources after validation, or leave deployed?
- **Options:**
  - Option A: Always destroy (clean but time-consuming)
  - Option B: Leave deployed (fast but accumulates resources)
  - Option C: Configurable flag
- **Decision Required:** Story 3.3 implementation
- **Recommendation:** Option B for MVP (leave deployed), document manual cleanup

**Question 2: Rollback Testing Scope**
- **Question:** Should Epic 3 include actual rollback testing in non-production, or just documentation?
- **Impact:** Testing rollback increases Epic 3 scope but validates procedures work
- **Decision Required:** Story 3.4 implementation
- **Recommendation:** Document procedures thoroughly; testing optional (nice-to-have)

**Question 3: Post-deployment Validation Automation Level**
- **Question:** How much of post-deployment validation should be automated vs manual?
- **Options:**
  - Option A: Fully manual checklist
  - Option B: Automated resource validation, manual cookie routing test
  - Option C: Fully automated (requires browser automation)
- **Decision Required:** Scope finalization (discussed in Pre-mortem analysis)
- **Recommendation:** Option B - automate what's feasible, document manual steps for routing behavior

**Question 4: Test Execution Frequency**
- **Question:** How often should integration test run? Every change, weekly, before production only?
- **Impact:** Affects developer workflow and AWS costs
- **Decision Required:** Development workflow definition
- **Recommendation:** Manual before production deployment (MVP); automated in CI/CD (growth phase)

## Test Strategy Summary

### Testing Pyramid for Epic 3

```
                   ▲
                  / \
                 /   \
                /     \
               /Manual \         Post-deployment validation
              /Validation\       (cookie routing behavior)
             /___________\
            /             \
           /  Integration  \     Real AWS deployment
          /     Tests       \    (resource existence)
         /_________________\
        /                   \
       /   Assertion Tests   \   Security-critical properties
      /    (Fine-grained)     \  (OAC, origins, function)
     /_______________________\
    /                         \
   /     Snapshot Tests        \ CloudFormation template
  /      (Broad coverage)       \ (regression detection)
 /___________________________\

  Fast ←────────────────────────→ Slow
  Frequent ←────────────────────→ Infrequent
  Detailed ←────────────────────→ Broad
```

### Test Layer Characteristics

| Layer | Speed | Coverage | Frequency | Failure Detection |
|-------|-------|----------|-----------|-------------------|
| **Snapshot** | < 5 sec | Broad (any change) | Every commit | ANY CloudFormation change |
| **Assertion** | < 5 sec | Narrow (specific properties) | Every commit | Security/config violations |
| **Integration** | < 10 min | Real AWS resources | Before production | AWS-specific issues |
| **Manual** | < 5 min | Runtime behavior | Post-deployment | Cookie routing correctness |

### Test Execution Strategy

**Development Workflow:**
1. Developer makes CDK change
2. Run `yarn pre-deploy` (includes snapshot + assertion tests)
3. Review test output and CDK diff
4. If tests pass: Proceed to deployment
5. If tests fail: Fix issue, repeat

**Production Deployment Workflow:**
1. All development tests passing
2. Optional: Run integration test (`./test/integration.sh`)
3. Run `yarn pre-deploy` final validation
4. Run `cdk diff` and review changes
5. Run `cdk deploy --profile NDX/InnovationSandboxHub`
6. Wait for CloudFront propagation (10-15 min)
7. Execute post-deployment validation:
   - Verify distribution status: Deployed
   - Manual: Test cookie routing (set NDX=true, verify new UI)
   - Manual: Test without cookie (verify existing UI)
   - Check CloudWatch metrics for errors
8. If validation fails: Execute rollback procedure

### Test Coverage Goals

**Epic 3 Test Coverage Targets:**
- **Snapshot Coverage:** 100% of CloudFormation resources
- **Assertion Coverage:** 100% of security-critical properties (OAC, origins, function attachment, cache policy)
- **Integration Coverage:** 100% of CloudFormation resource existence in AWS
- **Manual Coverage:** 100% of routing behavior scenarios (with/without cookie)

**What Tests Do NOT Cover (Documented Limitations):**
- Cookie routing logic correctness in CloudFront Functions (unit tested in Epic 2)
- CloudFront edge location behavior and propagation
- Performance under load
- Browser compatibility for cookie setting
- Multi-region CloudFront behavior

### Success Criteria

**Epic 3 testing infrastructure is successful when:**
1. All 6 stories deliver AC-complete artifacts
2. Tests execute in target time windows (< 10 sec unit, < 10 min integration)
3. Pre-deployment validation catches configuration errors before AWS deployment
4. Rollback procedures are executable and documented
5. README provides complete operational guidance
6. Future CloudFront changes can use Epic 3 tests without modification
7. Zero production incidents due to test gaps (first 3 months post-deployment)

---

**Epic 3 Technical Specification Complete**

This comprehensive technical specification provides detailed implementation guidance for Epic 3: Testing, Validation & Operational Readiness. All 6 stories are covered with acceptance criteria, traceability mapping, detailed design, NFRs, dependencies, and risk mitigation strategies.

**Estimated Implementation Time:** 3-4 days (25 hours development + buffer) for single developer

**Next Steps:**
1. Mark epic-3 as "contexted" in sprint-status.yaml
2. Begin Story 3.1 implementation (CDK Snapshot Tests)
3. Execute stories sequentially: 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6
4. Validate each story's acceptance criteria before proceeding to next

