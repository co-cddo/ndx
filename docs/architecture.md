# NDX CloudFront Origin Routing - Architecture

## Executive Summary

This architecture implements cookie-based origin routing for the National Digital Exchange (NDX) CloudFront distribution, enabling safe rollback to legacy content if issues arise. The solution uses AWS CloudFront Functions for sub-millisecond cookie inspection and URI rewriting. By default, all traffic routes to the new `ndx-static-prod` S3 origin. Users can opt-out to the legacy origin by setting `NDX=legacy` cookie.

**Key Architectural Decisions:**
- **Routing Mechanism:** CloudFront Functions (sub-ms latency, cost-effective)
- **Security:** Reuse existing Origin Access Control (E3P8MA1G9Y5BYE)
- **Infrastructure:** Single CDK stack (`NdxStaticStack`) with imported CloudFront distribution
- **Caching:** Modern Cache Policy with NDX cookie whitelist

## Decision Summary

| Category | Decision | Version/Details | Affects FRs | Rationale |
| -------- | -------- | --------------- | ----------- | --------- |
| Routing Function | CloudFront Functions | 2025 | FR7-14, FR15-19 | Sub-millisecond latency, 6x cheaper than Lambda@Edge, perfect for simple cookie inspection |
| Origin Access Control | Reuse existing OAC | E3P8MA1G9Y5BYE | FR2, NFR-SEC-1 | Same security model, simpler management, least-privilege access already configured |
| CDK Stack Organization | Single stack | Modified NdxStaticStack | FR25-30 | Simpler deployment, all NDX infrastructure in one place |
| Cache Behavior | Cache Policy with cookie whitelist | NDX cookie only | FR20-24, NFR-PERF-3 | Modern approach, optimal caching, no degradation for non-cookied users |
| Testing Strategy | Complete pyramid | Unit + Snapshot + Assertions + Integration | FR31-35 | Fast feedback loop, regression prevention, real AWS validation |
| Deployment Method | Standard CDK | cdk diff → cdk deploy | FR27-30, NFR-REL-1 | Zero-downtime CloudFormation updates, 10-15min propagation |
| Monitoring | Built-in CloudFront metrics | Standard metrics only | FR41-42, NFR-OPS-5 | Sufficient for MVP, tracks errors and cache performance per origin |
| Rollback Process | Three-tier approach | Disable function → Git revert → Remove origin | FR36-40, NFR-OPS-4 | Fast recovery (< 5 minutes), documented procedures |

## Project Structure

```
ndx/
├── infra/
│   ├── bin/
│   │   └── infra.ts                    # CDK app entry point
│   ├── lib/
│   │   ├── ndx-stack.ts                # Main stack: S3 + CloudFront configuration
│   │   └── functions/
│   │       └── cookie-router.js        # CloudFront Function: Cookie inspection logic
│   ├── test/
│   │   ├── ndx-stack.test.ts           # CDK tests: Snapshot + assertions
│   │   └── cookie-router.test.ts       # Unit tests: Function logic
│   ├── cdk.json                        # CDK configuration
│   ├── package.json                    # Dependencies (aws-cdk-lib, constructs)
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── eslint.config.mjs               # ESLint configuration
│   └── README.md                       # Infrastructure documentation
│
├── src/                                # Eleventy static site (unchanged)
├── _site/                              # Built site output
├── docs/
│   ├── prd.md                          # Product Requirements Document
│   ├── architecture.md                 # This document
│   └── sprint-artifacts/               # Epic and story tracking
└── package.json                        # Root scripts: build, deploy
```

## FR Category to Architecture Mapping

| FR Category | Functional Requirements | Architecture Component | Implementation Location |
| ----------- | ----------------------- | ---------------------- | ----------------------- |
| CloudFront Origin Management | FR1-6 | CloudFront distribution configuration | `lib/ndx-stack.ts` |
| Cookie-Based Routing Logic | FR7-14 | CloudFront Function code | `lib/functions/cookie-router.js` |
| Routing Function Deployment | FR15-19 | CDK Function construct | `lib/ndx-stack.ts` |
| Cache Behavior Configuration | FR20-24 | Cache Policy resource | `lib/ndx-stack.ts` |
| CDK Infrastructure Management | FR25-30 | CDK stack and constructs | `lib/ndx-stack.ts` |
| Testing & Validation | FR31-35 | Jest tests | `test/*.test.ts` |
| Rollback & Safety | FR36-40 | CloudFormation + documented procedures | `README.md` + this doc |
| Operational Monitoring | FR41-44 | CloudWatch metrics (built-in) | AWS Console |

## Technology Stack Details

### Core Technologies

| Component | Technology | Version | Purpose |
| --------- | ---------- | ------- | ------- |
| Infrastructure as Code | AWS CDK | 2.x (latest) | Define and deploy CloudFront configuration |
| Language | TypeScript | 5.x | CDK stack and test code |
| Runtime | Node.js | 20.17.0 | CDK execution environment |
| Package Manager | Yarn | 4.5.0 | Dependency management |
| Testing Framework | Jest | Latest | Unit and integration tests |
| Linting | ESLint | Latest | Code quality |

### AWS Resources

| Resource | Type | Configuration |
| -------- | ---- | ------------- |
| CloudFront Distribution | Imported existing | E3THG4UHYDHVWP |
| S3 Origin (new) | S3 bucket | ndx-static-prod (already deployed via CDK) |
| S3 Origin (existing) | S3 bucket | ndx-try-isb-compute-cloudfrontuiapiisbfrontendbuck-ssjtxkytbmky |
| API Gateway Origin | API Gateway | 1ewlxhaey6.execute-api.us-west-2.amazonaws.com/prod (unchanged) |
| Origin Access Control | Reused | E3P8MA1G9Y5BYE |
| CloudFront Function | New | Cookie inspection and routing logic |
| Cache Policy | New | NDX cookie whitelist, standard TTLs |

### Integration Points

**CDK → CloudFront:**
- Import existing distribution via `Distribution.fromDistributionAttributes()`
- Add new S3 origin with OAC reference
- Deploy CloudFront Function from local JavaScript file
- Attach function to default cache behavior
- Configure Cache Policy with cookie forwarding

**CloudFront Function → Origins:**
- Function inspects `Cookie` header and URI
- Rewrites directory-style URIs for S3 compatibility:
  - `/About/` → `/About/index.html` (trailing slash)
  - `/try` → `/try/index.html` (no file extension)
- Parses NDX cookie value
- Routes to existing `S3Origin` if `NDX=legacy`
- **Defaults to `ndx-static-prod`** origin otherwise (inverted logic)
- Execution time: < 1ms (sub-millisecond)

**Testing → AWS:**
- Unit tests validate function logic (no AWS calls)
- CDK snapshot tests validate CloudFormation template
- CDK assertions validate specific resource properties
- Integration test deploys to test environment and validates routing

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents working on this project.

### Naming Conventions

**CDK Constructs (TypeScript):**
- PascalCase for CDK construct classes: `CookieRouterFunction`
- camelCase for construct instances: `cookieRouterFunction`, `newS3Origin`, `cachePolicy`
- Descriptive names: `ndxCookieRouterFunction` not `function1`

**Origin IDs (CloudFront):**
- Format: `{purpose}-origin` in lowercase with hyphens
- New origin: `ndx-static-prod-origin`
- Existing origins: `S3Origin`, `InnovationSandboxComputeCloudFrontUiApiIsbCloudFrontDistributionOrigin2A994B75A`

**File Names:**
- CDK stack: `ndx-stack.ts` (existing, enhanced)
- Function code: `cookie-router.js` (JavaScript for CloudFront Functions)
- Test files: `{source-file-name}.test.ts` (e.g., `ndx-stack.test.ts`, `cookie-router.test.ts`)

**CDK Resource IDs:**
- Format: PascalCase, descriptive
- Examples: `NdxCookieRouterFunction`, `NdxCachePolicy`, `NdxStaticProdOrigin`

### Code Organization

**Function Code Location:**
- Path: `infra/lib/functions/cookie-router.js`
- Rationale: Separate from CDK TypeScript code, easier to test independently
- Loading: Use `fs.readFileSync()` in CDK stack to inline function code

**Test Organization:**
- All tests in `infra/test/` directory (not `__tests__/`)
- One test file per source file
- Test naming matches source: `ndx-stack.ts` → `ndx-stack.test.ts`

**CDK Stack Structure:**
```typescript
export class NdxStaticStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Existing S3 bucket (already defined)

    // 2. Import existing CloudFront distribution
    const distribution = cloudfront.Distribution.fromDistributionAttributes(...);

    // 3. Create CloudFront Function
    const cookieRouterFunction = new cloudfront.Function(...);

    // 4. Add new S3 origin
    distribution.addOrigin(...);

    // 5. Configure cache behavior with cookie policy
    distribution.updateCacheBehavior(...);
  }
}
```

### CloudFront Function Pattern

**Function Structure:**
```javascript
import cf from 'cloudfront';

function handler(event) {
  var request = event.request;
  var cookies = request.cookies;
  var uri = request.uri;

  // Handle directory-style URLs for S3 compatibility
  // e.g., /About/ -> /About/index.html, /try -> /try/index.html
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (uri.indexOf('.') === -1) {
    // No file extension (no dot in URI) - treat as directory
    request.uri = uri + '/index.html';
  }

  // Check if NDX cookie exists and has value 'legacy' (opt-out of new origin)
  var ndxCookie = cookies['NDX'];

  if (ndxCookie && ndxCookie.value === 'legacy') {
    // Use default cache behavior origin (old S3Origin) - no modification needed
    return request;
  }

  // Default: route to ndx-static-prod with OAC authentication
  cf.updateRequestOrigin({
    domainName: 'ndx-static-prod.s3.us-west-2.amazonaws.com',
    originAccessControlConfig: {
      enabled: true,
      region: 'us-west-2',
      signingBehavior: 'always',
      signingProtocol: 'sigv4',
      originType: 's3'
    }
  });

  return request;
}
```

**Key Patterns:**
- Use `var` (CloudFront Functions JavaScript runtime)
- Use CloudFront `cf.updateRequestOrigin()` API for origin switching
- URI rewriting happens before origin selection
- **Inverted logic**: Default routes to new origin, `NDX=legacy` opts out
- Graceful handling of missing cookie (routes to new origin)
- Fail-open: If error, request unchanged (routes to new origin)
- No console.log (adds cost, not needed for simple logic)

### Error Handling

**CloudFront Function:**
- No explicit try-catch (keep simple)
- Gracefully handle missing cookie header: `if (!cookieHeader) return {}`
- Invalid cookie format: Parse fails, cookies empty, routes to existing origin
- Function error: Request unchanged, CloudFront routes to default origin

**CDK Deployment:**
- Let CloudFormation handle rollback automatically
- No custom error handling in CDK code
- Validation errors caught by `cdk synth` before deployment

**Tests:**
- Use Jest `expect().toThrow()` for validation errors
- Use `expect().rejects` for async errors
- Test error cases: missing cookie, malformed cookie, empty value

### Testing Patterns

**Unit Tests (CloudFront Function):**
```typescript
describe('cookie-router', () => {
  it('should route to new origin by default (no cookie)', () => {
    const event = createTestEvent({ uri: '/index.html', cookies: {} });
    const result = handler(event);
    expect(result.origin.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
  });

  it('should use legacy origin when NDX=legacy', () => {
    const event = createTestEvent({ uri: '/index.html', cookies: { NDX: { value: 'legacy' } } });
    const result = handler(event);
    expect(result.origin).toBeUndefined(); // Uses default origin
  });

  it('should rewrite trailing slash URIs', () => {
    const event = createTestEvent({ uri: '/About/', cookies: {} });
    const result = handler(event);
    expect(result.uri).toBe('/About/index.html');
  });

  it('should rewrite extensionless URIs', () => {
    const event = createTestEvent({ uri: '/try', cookies: {} });
    const result = handler(event);
    expect(result.uri).toBe('/try/index.html');
  });
});
```

**CDK Snapshot Tests:**
```typescript
test('CloudFront configuration snapshot', () => {
  const stack = new NdxStaticStack(app, 'TestStack');
  expect(stack).toMatchSnapshot();
});
```

**CDK Fine-Grained Assertions:**
```typescript
test('New S3 origin added', () => {
  const stack = new NdxStaticStack(app, 'TestStack');
  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Origins: expect.arrayContaining([
        expect.objectContaining({
          Id: 'ndx-static-prod-origin',
          S3OriginConfig: {
            OriginAccessIdentity: '',
            OriginAccessControlId: 'E3P8MA1G9Y5BYE'
          }
        })
      ])
    }
  });
});

test('API Gateway origin unchanged', () => {
  const stack = new NdxStaticStack(app, 'TestStack');
  expect(stack).toHaveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Origins: expect.arrayContaining([
        expect.objectContaining({
          Id: expect.stringContaining('InnovationSandbox'),
          DomainName: '1ewlxhaey6.execute-api.us-west-2.amazonaws.com'
        })
      ])
    }
  });
});
```

**Integration Test:**
```bash
#!/bin/bash
# test/integration.sh

# Deploy test stack
cdk deploy TestStack --profile NDX/InnovationSandboxHub --require-approval never

# Test without cookie
curl -I https://test-distribution.cloudfront.net/ | grep "X-Cache"

# Test with cookie
curl -I -H "Cookie: NDX=true" https://test-distribution.cloudfront.net/ | grep "X-Cache"

# Cleanup
cdk destroy TestStack --force
```

## Consistency Rules

### Cookie Handling

**Cookie Name:**
- Fixed: `NDX` (uppercase, exact match)
- No variations: Not `ndx`, not `Ndx`, not `NDX-FLAG`

**Cookie Value:**
- Route to legacy origin: `legacy` (lowercase, exact match)
- All other values: Route to **new origin** (ndx-static-prod)
- Missing cookie: Route to **new origin** (ndx-static-prod)
- Empty value: Route to **new origin** (ndx-static-prod)

**Cookie Parsing:**
- CloudFront Functions provide parsed cookies object
- Access via `request.cookies['NDX'].value`
- Handle missing cookie gracefully (routes to new origin)
- No error throwing (fail-open to new origin)

### URI Rewriting

**Rules:**
1. If URI ends with `/` → append `index.html`
2. If URI has no `.` (no file extension) → append `/index.html`
3. Otherwise → leave URI unchanged

**Examples:**
| Input | Output | Rule |
|-------|--------|------|
| `/About/` | `/About/index.html` | Trailing slash |
| `/try` | `/try/index.html` | No extension |
| `/catalogue/aws` | `/catalogue/aws/index.html` | No extension |
| `/assets/style.css` | `/assets/style.css` | Has extension |
| `/index.html` | `/index.html` | Has extension |

### Origin Configuration

**Origin IDs:**
- New origin: `ndx-static-prod-origin`
- Existing S3: `S3Origin` (unchanged)
- API Gateway: Keep existing ID (unchanged)

**Origin Settings:**
- Connection attempts: 3 (match existing)
- Connection timeout: 10 seconds (match existing)
- Read timeout: 30 seconds (match existing)
- Protocol: HTTPS only
- Origin path: Empty (serve from bucket root)

### Cache Behavior

**Cache Policy:**
- Name: `NdxCookieRoutingPolicy`
- TTL: Default CloudFront values (no custom TTLs for MVP)
- Cookie behavior: Whitelist
- Whitelisted cookies: `['NDX']`
- Query strings: Forward all (preserve existing behavior)
- Headers: Forward standard set (preserve existing behavior)

**Function Association:**
- Event type: `viewer-request`
- Function: CloudFront Function (not Lambda@Edge)
- Execution: Before cache lookup

### Deployment Process

**Pre-Deployment Checklist:**
1. Review current CloudFront config: `aws cloudfront get-distribution --id E3THG4UHYDHVWP`
2. Run tests: `cd infra && yarn test`
3. Run lint: `cd infra && yarn lint`
4. Preview changes: `cd infra && cdk diff --profile NDX/InnovationSandboxHub`
5. Verify API Gateway origin unchanged in diff output
6. Document current config for rollback

**Deployment Commands:**
```bash
cd infra
cdk deploy --profile NDX/InnovationSandboxHub
# Wait 10-15 minutes for global propagation
```

**Post-Deployment Validation:**
```bash
# Test without cookie (should see NEW site - default behavior)
curl -I https://d7roov8fndsis.cloudfront.net/

# Test URI rewriting
curl -I https://d7roov8fndsis.cloudfront.net/try  # Should return 200
curl -I https://d7roov8fndsis.cloudfront.net/About/  # Should return 200

# Set cookie and test (should see LEGACY origin)
# In browser console: document.cookie = "NDX=legacy; path=/"
# Browse to https://d7roov8fndsis.cloudfront.net/

# Clear cookie and test (should revert to NEW site)
# In browser console: document.cookie = "NDX=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/"
```

**Rollback Procedures:**

**Option 1: Disable Function (Fastest - < 5 minutes):**
```bash
# Edit ndx-stack.ts: Comment out function association
# cacheBehavior.addFunctionAssociation(...)

cdk deploy --profile NDX/InnovationSandboxHub
```

**Option 2: Git Revert (5-10 minutes):**
```bash
git revert HEAD
cd infra
cdk deploy --profile NDX/InnovationSandboxHub
```

**Option 3: Remove Origin (15 minutes):**
```bash
# Edit ndx-stack.ts: Remove new origin and function
cdk deploy --profile NDX/InnovationSandboxHub
```

## Security Architecture

### Origin Access Control

**Configuration:**
- OAC ID: E3P8MA1G9Y5BYE (reused from existing S3Origin)
- Signing behavior: Sign requests
- Origin protocol: HTTPS only
- S3 bucket policy: Grants CloudFront read access via OAC

**Rationale:**
- Same security model as existing S3Origin
- Least-privilege: Read-only S3 access
- No public bucket access (BlockPublicAccess: BLOCK_ALL)

### Function Security

**CloudFront Function Constraints:**
- No network access (cannot call external APIs)
- No filesystem access
- No access to AWS services
- Cannot modify response body
- Cannot access sensitive data (only headers/cookies)

**Input Validation:**
- Cookie header parsing: Gracefully handle malformed input
- No SQL injection risk (no database)
- No XSS risk (no HTML generation)
- No command injection risk (no shell execution)

**Logging:**
- No sensitive data logged (cookie values not logged)
- CloudWatch metrics only (no verbose logs)
- Error-level logging if needed (debug logs disabled)

### Compliance

**Infrastructure as Code:**
- All changes version-controlled in Git
- CloudFormation change sets visible before deployment
- Audit trail via CloudFormation stack history

**Access Control:**
- AWS Profile: `NDX/InnovationSandboxHub` (pre-configured locally)
- IAM permissions required: CloudFormation, CloudFront, S3
- No long-lived credentials in code

## Performance Considerations

### Latency Budget

| Component | Target | Expected | NFR Reference |
| --------- | ------ | -------- | ------------- |
| Function execution | < 5ms | < 1ms | NFR-PERF-1 |
| Cookie parsing | < 100ms | Sub-ms | NFR-PERF-4 |
| CloudFront edge cache | Unchanged | Unchanged | NFR-PERF-3 |
| CDK deployment | < 60 minutes | 10-15 minutes | NFR-PERF-5 |
| Global propagation | < 15 minutes | 10-15 minutes | NFR-PERF-6 |

### Caching Strategy

**Cache Effectiveness:**
- Users without cookie: Share cache (no impact)
- Users with `NDX=true`: Separate cache (small group)
- Cache key includes: URL + NDX cookie value
- No degradation for non-cookied users (majority)

**Cache Policy:**
- Cookie forwarding: NDX only (not all cookies)
- Query strings: Forward all (preserve existing behavior)
- TTL: CloudFront defaults (no custom TTLs for MVP)

### Performance Optimization

**CloudFront Function:**
- Minimal code (< 1KB, well under 10KB limit)
- No external calls (sub-millisecond execution)
- Simple cookie parsing (no regex, no JSON parsing)
- Fail-fast: Missing cookie → immediate return

**CDK Deployment:**
- Single stack (no multi-stack orchestration)
- Import existing distribution (no full replacement)
- Incremental updates (only changes deployed)

## Deployment Architecture

### AWS Account & Region

**Account:** 568672915267 (NDX/InnovationSandboxHub)
**Region:** us-west-2 (CloudFront is global, but resources in us-west-2)

### CDK Deployment

**Stack:** `NdxStatic` (existing, enhanced)
**Resources:**
- CloudFront Distribution (imported)
- CloudFront Function (new)
- Cache Policy (new)
- S3 Origin configuration (new)

**Deployment Flow:**
```
Developer → CDK CLI → CloudFormation → CloudFront API → Global Edge Locations
```

**Zero-Downtime:**
- CloudFront handles configuration updates without interruption
- Old configuration active until new configuration fully propagated
- No service disruption to end users

### CloudFront Propagation

**Timeline:**
- CDK deploy triggers CloudFormation update: ~2-5 minutes
- CloudFormation calls CloudFront API: ~30 seconds
- CloudFront propagates to 225+ edge locations: ~10-15 minutes
- Total: ~15-20 minutes from `cdk deploy` to fully active

**Monitoring Propagation:**
```bash
# Check distribution status
aws cloudfront get-distribution --id E3THG4UHYDHVWP --profile NDX/InnovationSandboxHub --query 'Distribution.Status'
# Output: "Deployed" when complete
```

## Development Environment

### Prerequisites

**Required Software:**
- Node.js: 20.17.0 or higher
- Yarn: 4.5.0 (Berry/v4)
- AWS CLI: v2.x
- Git: Any recent version

**AWS Configuration:**
- Profile: `NDX/InnovationSandboxHub`
- Account: 568672915267
- Region: us-west-2

**Verification:**
```bash
# Check Node version
node --version  # Should be 20.17.0+

# Check Yarn version
yarn --version  # Should be 4.5.0

# Check AWS profile
aws sts get-caller-identity --profile NDX/InnovationSandboxHub
# Should return account 568672915267
```

### Setup Commands

**Initial Setup:**
```bash
# Navigate to infrastructure directory
cd infra

# Install dependencies
yarn install

# Verify TypeScript compilation
yarn build

# Run tests
yarn test

# Run linter
yarn lint
```

**Development Workflow:**
```bash
# 1. Make changes to ndx-stack.ts or cookie-router.js

# 2. Run tests
yarn test

# 3. Preview infrastructure changes
cdk diff --profile NDX/InnovationSandboxHub

# 4. Deploy changes
cdk deploy --profile NDX/InnovationSandboxHub

# 5. Validate deployment (manual testing with cookie)
```

## Testing Architecture

### Overview

The NDX project uses a multi-layer testing strategy to ensure quality and compliance:
- **Unit Tests:** Jest for TypeScript/JavaScript business logic
- **E2E Tests:** Playwright for end-to-end user flows
- **Accessibility Tests:** Playwright + axe-core for WCAG 2.2 compliance

### Playwright E2E Testing

**Purpose:** Validate user journeys, authentication flows, and accessibility compliance

**Architecture:**
```
Developer → Playwright Test → playwright.config.ts → mitmproxy (port 8081) → Localhost App
                                                   ↓
                                            CloudFront API (prod)
```

**Key Components:**
- **Playwright:** Modern E2E testing framework (headless Chromium, Firefox, WebKit)
- **mitmproxy:** Local proxy forwarding UI to localhost, API to production
- **playwright-config.json:** Proxy configuration (http://localhost:8081)
- **playwright.config.ts:** Test runner configuration, browser settings

**Test Organization:**
```
tests/
├── e2e/
│   ├── auth/
│   │   ├── sign-in.spec.ts
│   │   ├── sign-out.spec.ts
│   │   └── token-persistence.spec.ts
│   ├── accessibility/
│   │   ├── auth-ui-a11y.spec.ts
│   │   └── wcag-audit.spec.ts
│   └── integration/
│       ├── lease-request-flow.spec.ts
│       └── try-sessions-dashboard.spec.ts
└── fixtures/
    └── test-data.ts
```

**CI Integration:**
- **GitHub Actions:** .github/workflows/test.yml
- **Test Execution:** On PR and push to main
- **Services:** mitmproxy started as container service
- **Artifacts:** Playwright test videos/traces on failure

### Test Execution

**Local Development:**
```bash
# Start mitmproxy (Terminal 1)
yarn dev:proxy

# Start local app server (Terminal 2)
yarn start

# Run E2E tests (Terminal 3)
yarn test:e2e

# Run specific test suite
yarn test:e2e:auth
yarn test:e2e:accessibility
```

**CI Pipeline:**
```bash
# Automated on PR/push
# Runs: yarn test (Jest) && yarn test:e2e (Playwright)
```

### Integration with mitmproxy (Epic 4)

Playwright tests leverage the mitmproxy infrastructure established in Epic 4:
- Proxy port: 8081 (configured in playwright-config.json)
- UI routes: Forwarded to localhost:8080
- API routes: Forwarded to production CloudFront (d7roov8fndsis.cloudfront.net)
- HTTPS: Certificate trust configured per Epic 4 Story 4.5

**Reference:** See Epic 4 tech spec for complete mitmproxy architecture.

## Architecture Decision Records (ADRs)

### ADR-001: CloudFront Functions over Lambda@Edge

**Context:** Need to route requests based on cookie value with minimal latency and cost.

**Decision:** Use CloudFront Functions for cookie-based routing.

**Rationale:**
- Sub-millisecond execution (vs 5-100ms for Lambda@Edge)
- 6x cheaper ($0.10 vs $0.60 per 1M invocations)
- Deploys globally in seconds (vs 5-8 minutes)
- Executes at all 225+ edge locations (vs 13 regional caches)
- Perfect for simple cookie inspection (no need for body access or external calls)

**Consequences:**
- ✅ Meets NFR-PERF-1 (< 5ms latency) easily
- ✅ Lower operational cost at scale
- ✅ Faster deployments and rollbacks
- ❌ Limited to JavaScript (not Node.js)
- ❌ Cannot call external APIs (not needed for this use case)
- ❌ 10KB code limit (our function is < 1KB)

**Status:** Accepted

---

### ADR-002: Reuse Existing Origin Access Control

**Context:** New S3 origin needs secure access. Existing S3Origin uses OAC E3P8MA1G9Y5BYE.

**Decision:** Reuse existing OAC for new S3 origin.

**Rationale:**
- Same security requirements (read-only S3 access)
- Simpler management (no additional IAM policies)
- Consistent security model across S3 origins
- AWS best practice for similar origins

**Consequences:**
- ✅ Consistent security model
- ✅ Simpler IAM policy management
- ✅ Least-privilege access already configured
- ❌ Both origins share same access control (acceptable for MVP)

**Status:** Accepted

---

### ADR-003: Single CDK Stack for All Infrastructure

**Context:** Need to add CloudFront configuration. Option to create separate stack or modify existing.

**Decision:** Modify existing `NdxStaticStack` to include CloudFront configuration.

**Rationale:**
- Simpler deployment (one stack)
- All NDX infrastructure in one place
- Easier to understand for developers
- Acceptable coupling for MVP scope

**Consequences:**
- ✅ Single deployment command
- ✅ Simpler for developers to understand
- ✅ All NDX resources together
- ❌ S3 and CloudFront changes coupled (acceptable trade-off)
- ❌ Stack grows larger over time (manageable for current scope)

**Status:** Accepted

---

### ADR-004: Cache Policy with NDX Cookie Whitelist

**Context:** CloudFront Function needs to inspect NDX cookie. Must configure cookie forwarding.

**Decision:** Use modern Cache Policy with NDX cookie whitelist.

**Rationale:**
- Modern CloudFront best practice (Cache Policies introduced 2020)
- Precise control (only NDX cookie forwarded)
- Optimal caching (non-cookied users share cache)
- No cache degradation for majority of users

**Consequences:**
- ✅ Meets NFR-PERF-3 (no cache effectiveness degradation)
- ✅ Users without cookie share cache (optimal performance)
- ✅ Users with cookie have separate cache (small group)
- ✅ Modern, maintainable configuration

**Status:** Accepted

---

### ADR-005: Complete Testing Pyramid

**Context:** Need testing strategy for infrastructure and function code.

**Decision:** Implement complete testing pyramid:
- Unit tests for CloudFront Function logic
- CDK snapshot tests for CloudFormation template
- CDK fine-grained assertions for critical properties
- Integration test for real AWS validation

**Rationale:**
- Fast feedback (unit tests run in milliseconds)
- Regression prevention (snapshot tests catch unintended changes)
- Critical property validation (assertions verify requirements)
- Real-world validation (integration test catches AWS-specific issues)

**Consequences:**
- ✅ High confidence in changes before deployment
- ✅ Fast development feedback loop
- ✅ Catches issues early
- ❌ More tests to write and maintain (acceptable for critical infrastructure)

**Status:** Accepted

---

### ADR-006: Playwright for E2E Testing

**Context:** Need automated testing for authentication, accessibility (WCAG 2.2), and user journeys. PRD requires E2E tests with proxy integration (NFR-TRY-TEST-1).

**Decision:** Use Playwright as E2E testing framework.

**Rationale:**
- Modern, fast, actively maintained by Microsoft
- Excellent accessibility testing support (integrates with axe-core)
- Native multi-browser support (Chromium, Firefox, WebKit)
- Built-in proxy configuration support (works with mitmproxy)
- Strong TypeScript support (matches project stack)
- Robust CI/CD integration (GitHub Actions)
- Auto-wait and retry logic reduces flaky tests

**Alternatives Considered:**
- **Cypress:** More opinionated, less flexible proxy config, no multi-browser initially
- **Selenium:** Older, slower, more complex setup
- **Puppeteer:** Chromium-only, less accessibility tooling

**Consequences:**
- ✅ Meets PRD NFR-TRY-TEST-1 through NFR-TRY-TEST-7
- ✅ Enables Epic 8 accessibility testing (WCAG 2.2)
- ✅ Integrates with existing mitmproxy infrastructure (Epic 4)
- ✅ Supports authentication flow testing (OAuth mocking)
- ❌ Additional dependency to maintain
- ❌ CI pipeline needs browser installation (~200MB)

**Status:** Accepted (Story 8.0)

**Implementation:** Story 8.0 establishes infrastructure, Stories 5.11, 5.10, 8.2+ use it.

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-25_
_For: cns_

**Change Log:**
- 2025-11-25: Inverted routing logic (default to new origin, NDX=legacy opts out). Added URI rewriting for S3 compatibility.
