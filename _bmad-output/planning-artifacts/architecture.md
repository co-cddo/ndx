---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: "complete"
completedAt: "2026-01-13"
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/analysis/research-authentication-2026-01-12.md"
  - "docs/architecture.md"
  - "docs/infrastructure-architecture.md"
workflowType: "architecture"
project_name: "ndx"
user_name: "Cns"
date: "2026-01-13"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
29 requirements across 6 capability areas:

| Category | FRs | Architectural Impact |
|----------|-----|---------------------|
| Account Registration | FR1-FR7 | Lambda + IAM IDC integration |
| Auth Integration | FR8-FR11 | Extend existing auth patterns |
| Domain Management | FR12-FR15 | External data source + caching |
| Security & Protection | FR16-FR20 | WAF, CSRF, scoped IAM |
| Operational Visibility | FR21-FR24 | EventBridge + Slack |
| Content & Compliance | FR25-FR29 | Static pages + accessibility |

**Non-Functional Requirements:**
23 requirements driving architecture:

- **Performance:** < 2s page load, < 500ms domain API, < 3s signup API, < 2 min total flow
- **Security:** TLS 1.2+, CSRF via custom header, WAF rate limit 1 req/min/IP, scoped Lambda IAM, OAC with SigV4, strict CORS, 5-min domain cache TTL
- **Accessibility:** WCAG 2.2 AA, keyboard navigation, ARIA, 4.5:1 contrast
- **Integration:** SDK retry logic, graceful GitHub failures, EventBridge < 60s, Slack notifications
- **Reliability:** Cached domain fallback, correlation IDs, acceptable cold starts

**Scale & Complexity:**

- Primary domain: Web app + serverless API
- Complexity level: Medium
- Estimated architectural components: 8 (signup page, success page, privacy page, cookies page, auth modal, signup Lambda, CloudFront behaviour, EventBridge rule)

### Technical Constraints & Dependencies

**Existing System Constraints:**
- Must extend existing CloudFront distribution (not create new)
- Must follow GOV.UK Design System (regulatory)
- Must integrate with ISB account IAM Identity Center (955063685555)
- Must use existing EventBridge → Slack pattern

**External Dependencies:**
- AWS IAM Identity Center (user creation, password flow)
- GitHub JSON (LA domain allowlist)
- GOV.UK Notify (handled by IAM IDC)

**ADRs Already Decided (PRD Phase):**
| ADR | Decision |
|-----|----------|
| ADR-040 | Existing user → silent redirect to login |
| ADR-041 | Auth choice modal entry point |
| ADR-042 | Return URL with blocklist |
| ADR-043 | Lambda scoped to group ID + store ID |
| ADR-044 | Domain cache 5-min TTL |
| ADR-045 | CSRF via custom header |
| ADR-046 | WAF 1 req/min/IP |

### Cross-Cutting Concerns Identified

| Concern | Spans | Implementation Approach |
|---------|-------|------------------------|
| Authentication state | Modal, pages, Lambda | Extend existing AuthState pattern |
| Return URL handling | Auth modal, signup, AWS flow | sessionStorage + blocklist |
| Error handling | Form, Lambda, API | GOV.UK patterns + JSON responses |
| Security headers | All requests | CloudFront + Lambda validation |
| Observability | Lambda, EventBridge | Existing Slack pattern |
| Accessibility | All pages | GOV.UK Design System |

## Starter Template Evaluation

### Primary Technology Domain

**Brownfield Extension** - This project extends an existing JAMstack + Serverless architecture rather than starting fresh.

### Starter Options Considered

**Not Applicable** - The existing NDX codebase serves as our "starter":
- Static site framework: Eleventy 3.1.2 (established)
- TypeScript configuration: Strict mode, ES2020+ (established)
- Testing infrastructure: Jest + Playwright (established)
- Build tooling: esbuild (established)
- Infrastructure: AWS CDK 2.215.0 (established)

### Selected Approach: Extend Existing Patterns

**Rationale for Selection:**
- Brownfield project with mature, production-proven stack
- GOV.UK Design System is mandatory (regulatory compliance)
- Existing patterns (Try feature) provide tested implementation reference
- No architectural benefit from introducing new frameworks

**Initialization Command:**

```bash
# No starter needed - extend existing codebase
# New directories to create:
mkdir -p src/signup
# New pages created via Eleventy (same as existing content)
```

**Architectural Decisions Already Established:**

**Language & Runtime:**
- TypeScript 5.7.2 (strict mode)
- Node.js 20.x (Lambda runtime)
- ES2020+ target

**Styling Solution:**
- GOV.UK Design System CSS (mandatory)
- No custom CSS framework

**Build Tooling:**
- esbuild for client-side TypeScript bundling
- Eleventy for static site generation
- AWS CDK for infrastructure synthesis

**Testing Framework:**
- Jest for unit tests (web + Lambda)
- Playwright for E2E and accessibility tests

**Code Organization:**
- `src/signup/` for client-side signup logic (mirrors `src/try/`)
- `infra/lib/lambda/signup/` for Lambda handler (mirrors notification pattern)
- Static pages in `src/` following Eleventy conventions

**Development Experience:**
- `yarn start` for local development server
- Hot reloading via Eleventy
- `yarn test` for unit tests
- `yarn test:e2e` for E2E tests

**Note:** First implementation story should scaffold the new directories and create the base files following existing patterns.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Lambda deployment location (ISB account, new stack)
- API endpoint structure (/signup-api/*)
- Security header implementation (CSRF, OAC)

**Important Decisions (Shape Architecture):**
- Module organization (mirror Try structure)
- Error response format
- Domain allowlist source

**Deferred Decisions (Post-MVP):**
- Tiered alerting (accept noise initially)
- Domain request workflow (manual for MVP)
- Analytics dashboard

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Domain Allowlist Source** | Raw GitHub URL | Simplest, highly available, cache handles rate limits |
| **Domain Cache** | In-memory, 5-min TTL (ADR-044) | Balance freshness vs. external dependency |
| **User Data Storage** | AWS IAM Identity Center | Existing infrastructure, no new database |
| **Email Normalization** | Strip `+` suffix before uniqueness check | Prevent alias abuse (research doc pattern) |

**Domain Allowlist Flow:**
```
Lambda cold start → Fetch GitHub JSON → Cache in memory (5 min)
Subsequent requests → Return cached data
Cache expired → Re-fetch, fallback to stale if GitHub unavailable
```

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Authentication Provider** | AWS IAM Identity Center | Existing infrastructure (ADR-040) |
| **CSRF Protection** | Custom header `X-NDX-Request: signup-form` (ADR-045) | Origin verification, combined with strict CORS |
| **Rate Limiting** | WAF 1 req/min/IP (ADR-046) | Prevent abuse without blocking legitimate users |
| **Lambda Auth** | OAC with SigV4 | CloudFront signs requests, Lambda validates |
| **CORS Policy** | Strict origin only (`https://ndx.digital.cabinet-office.gov.uk`) | No wildcards, explicit origin |
| **Lambda Permissions** | Scoped to group ID + identity store ID (ADR-043) | Least privilege |

**Security Headers (Lambda Validation):**
```typescript
// Required headers for all POST requests
const requiredHeaders = {
  'x-ndx-request': 'signup-form',      // CSRF protection
  'content-type': 'application/json',   // Explicit content type
  'x-amz-content-sha256': '<hash>'     // OAC body hash
};
```

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **API Style** | REST | Consistent with existing /api/* pattern |
| **Base Path** | `/signup-api/*` | Separate from ISB API, clear routing |
| **Error Format** | Simple JSON `{ error, message }` | Matches PRD examples, easy to display |
| **Success Format** | JSON with redirect URL | Enable client-side navigation |

**Endpoints:**

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/signup-api/domains` | Fetch allowed domains | `{ domains: [{ domain, orgName }] }` |
| POST | `/signup-api/signup` | Create account | `{ success: true, redirectUrl }` or error |

**Error Response Structure:**
```json
{
  "error": "DOMAIN_NOT_ALLOWED",
  "message": "Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access."
}
```

**Error Codes:**
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `DOMAIN_NOT_ALLOWED` | 403 | Domain not in allowlist |
| `USER_EXISTS` | 409 | Email already registered (triggers redirect) |
| `INVALID_EMAIL` | 400 | Email format invalid |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Unexpected error |

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Module Structure** | Mirror Try (`api/`, `ui/`, `utils/`) | Consistency with existing patterns |
| **State Management** | Extend existing AuthState | Reuse proven observer pattern (ADR-024) |
| **Form Handling** | Native HTML + JS validation | GOV.UK patterns, no additional libraries |
| **Bundling** | esbuild (existing) | Consistent with Try feature build |

**Directory Structure:**
```
src/signup/
├── api/
│   └── signup-client.ts    # API calls to /signup-api/*
├── ui/
│   ├── signup-form.ts      # Form handling and validation
│   ├── auth-modal.ts       # Extend existing AUP modal
│   └── domain-select.ts    # Domain dropdown component
├── utils/
│   └── validation.ts       # Email validation, error formatting
└── main.ts                 # Entry point, initializes signup flow
```

**Auth Modal Extension:**
- Add "Create account" button to existing modal
- Preserve return URL in sessionStorage before redirect
- Reuse existing focus trap and accessibility patterns

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Lambda Stack** | New `NdxSignupStack` in ISB account | Separation of concerns, independent deployment |
| **Lambda Runtime** | Node.js 20.x | Matches existing notification Lambda |
| **CloudFront Behaviour** | Add `/signup-api/*` to existing distribution | Extends, not replaces |
| **Alerting** | CloudTrail → EventBridge → SNS → Existing Chatbot | Reuse existing config, cross-account SNS |

**CDK Stack Structure (ISB Account - 955063685555):**
```
infra/lib/
├── signup-stack.ts           # New stack for signup Lambda + alerting
└── lambda/signup/
    ├── handler.ts            # Main Lambda handler
    ├── identity-store.ts     # IAM IDC API wrapper
    ├── domain-validator.ts   # Domain allowlist logic
    └── email-normalizer.ts   # Email normalization
```

**CloudFront Behaviour Order:**
1. `/signup-api/*` → Signup Lambda (OAC)
2. `/api/*` → ISB Lambda (existing)
3. `/*` → S3 origin (existing)

**Alerting Architecture (Reuse Existing Chatbot):**
```
ISB Account (955063685555):
  IAM Identity Center CreateUser
    → CloudTrail (automatic)
    → EventBridge Rule
    → SNS Topic (ndx-signup-alerts)
          ↓
NDX Account (568672915267):
  Existing AWS Chatbot config
    ← subscribes to ISB SNS topic
    → Slack channel
```

**EventBridge Rule (ISB Account CDK):**
```typescript
const alertTopic = new sns.Topic(this, 'SignupAlertTopic', {
  topicName: 'ndx-signup-alerts'
});

// Allow Chatbot cross-account subscription
alertTopic.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [new iam.ServicePrincipal('chatbot.amazonaws.com')],
  actions: ['sns:Subscribe'],
  resources: [alertTopic.topicArn]
}));

new events.Rule(this, 'SignupAlertRule', {
  eventPattern: {
    source: ['aws.sso-directory'],
    detailType: ['AWS API Call via CloudTrail'],
    detail: {
      eventSource: ['sso-directory.amazonaws.com'],
      eventName: ['CreateUser']
    }
  },
  targets: [new targets.SnsTopic(alertTopic)]
});
```

**Manual Step (One-Time):**
Add SNS topic ARN `arn:aws:sns:us-west-2:955063685555:ndx-signup-alerts` to existing Chatbot Slack channel configuration in NDX account.

### Decision Impact Analysis

**Implementation Sequence:**
1. Create `NdxSignupStack` CDK stack with Lambda
2. Add CloudFront behaviour for `/signup-api/*`
3. Implement Lambda handlers (domains, signup)
4. Create static pages (signup, success, privacy, cookies)
5. Extend auth modal with "Create account"
6. Implement client-side form and API calls
7. Add EventBridge rule and SNS topic for alerting
8. Configure WAF rate limiting
9. Add SNS topic to existing Chatbot config (manual)

**Cross-Component Dependencies:**
| Component | Depends On | Provides To |
|-----------|------------|-------------|
| Signup Lambda | IAM IDC, GitHub JSON | API responses |
| CloudFront | Signup Lambda, OAC | Secure routing |
| Frontend | API endpoints, Auth modal | User interface |
| EventBridge | CloudTrail events | SNS → Chatbot alerts |

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
12 areas where AI agents could make different choices - all resolved by following existing codebase patterns.

### Naming Patterns

**File Naming Conventions:**
| Category | Convention | Example |
|----------|------------|---------|
| TypeScript source | `kebab-case.ts` | `signup-client.ts` |
| Test files | `*.test.ts` (co-located) | `signup-client.test.ts` |
| Entry points | `main.ts` | `src/signup/main.ts` |
| Lambda handlers | `handler.ts` | `lambda/signup/handler.ts` |
| Types | `types.ts` | `lambda/signup/types.ts` |

**Code Naming Conventions:**
| Category | Convention | Example |
|----------|------------|---------|
| Functions | `camelCase` | `fetchDomains()`, `validateEmail()` |
| Classes | `PascalCase` | `SignupClient`, `DomainValidator` |
| Constants | `SCREAMING_SNAKE_CASE` | `CACHE_TTL_MS`, `API_BASE_URL` |
| Interfaces | `PascalCase` | `SignupRequest`, `DomainInfo` |
| Private members | `_camelCase` | `_cachedDomains` |

**API Naming Conventions:**
| Category | Convention | Example |
|----------|------------|---------|
| Endpoints | kebab-case paths | `/signup-api/domains` |
| JSON fields | camelCase | `{ orgName, emailDomain }` |
| Error codes | SCREAMING_SNAKE_CASE | `DOMAIN_NOT_ALLOWED` |
| Headers | X-Prefix-Name | `X-NDX-Request` |

### Structure Patterns

**Frontend Module Organization:**
```
src/signup/
├── api/
│   └── signup-client.ts    # API calls ONLY - no DOM, no state
├── ui/
│   ├── signup-form.ts      # Form DOM interactions
│   ├── auth-modal.ts       # Modal extension
│   └── domain-select.ts    # Dropdown component
├── utils/
│   └── validation.ts       # Pure functions - no side effects
└── main.ts                 # Entry point - wires everything together
```

**Lambda Module Organization:**
```
infra/lib/lambda/signup/
├── handler.ts              # Entry point - routing only
├── identity-store.ts       # IAM IDC API wrapper
├── domain-validator.ts     # Domain allowlist logic
├── email-normalizer.ts     # Email processing
└── types.ts                # Shared TypeScript interfaces
```

**Test Organization:**
- Unit tests: Co-located `*.test.ts` files
- E2E tests: `tests/e2e/signup.spec.ts`
- Test utilities: `tests/utils/` for shared helpers

### Format Patterns

**API Response Formats:**

Success Response:
```typescript
// 200 OK
{
  "success": true,
  "redirectUrl": "/login?returnUrl=..."  // for signup
}

// 200 OK (domains endpoint)
{
  "domains": [
    { "domain": "westbury.gov.uk", "orgName": "Westbury District Council" }
  ]
}
```

Error Response:
```typescript
// 4xx/5xx
{
  "error": "DOMAIN_NOT_ALLOWED",
  "message": "Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access."
}
```

**TypeScript Patterns:**
```typescript
// ✅ DO: Explicit return types on exported functions
export async function fetchDomains(): Promise<DomainInfo[]> { }

// ✅ DO: Interface for object shapes
interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  domain: string;
}

// ✅ DO: Use unknown, not any
function parseResponse(data: unknown): SignupResponse { }

// ❌ DON'T: Implicit any
function parseResponse(data) { }  // Missing type
```

### Communication Patterns

**Error Message Style (GOV.UK):**
- Direct, no jargon
- Tell user what happened
- Tell user what to do next
- No apologetic language ("Sorry, we couldn't...")

```typescript
// ✅ GOV.UK style
"Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access."

// ❌ Avoid
"Sorry, we couldn't find your domain in our system. Please try again later."
```

**Logging Patterns (Lambda):**

```typescript
// ✅ DO: Structured logging with context
console.log(JSON.stringify({
  level: 'INFO',
  message: 'User created',
  email: normalizedEmail,
  domain: domain,
  correlationId: event.requestContext?.requestId
}));

// ✅ DO: Redact PII in error logs
console.error(JSON.stringify({
  level: 'ERROR',
  message: 'IAM IDC API error',
  errorCode: error.code,
  // email NOT logged on errors
}));

// ❌ DON'T: Unstructured logs
console.log('Created user: ' + email);
```

**Client-Side Logging:**
```typescript
// ✅ DO: Console for dev only
if (process.env.NODE_ENV === 'development') {
  console.log('Signup form submitted', { domain });
}

// ❌ DON'T: Log in production client code
console.log('User data:', userData);  // Exposes PII
```

### Process Patterns

**Error Handling:**

Lambda:
```typescript
// ✅ Catch specific errors, return appropriate status
try {
  await createUser(request);
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
} catch (error) {
  if (error.code === 'ConflictException') {
    return { statusCode: 409, body: JSON.stringify({
      error: 'USER_EXISTS',
      message: 'Welcome back - please sign in.'
    })};
  }
  // Log and return generic error
  console.error(JSON.stringify({ level: 'ERROR', error: error.message }));
  return { statusCode: 500, body: JSON.stringify({
    error: 'SERVER_ERROR',
    message: 'Something went wrong. Try again.'
  })};
}
```

Client:
```typescript
// ✅ Handle known error codes, display in GOV.UK error summary
if (response.error === 'USER_EXISTS') {
  window.location.href = response.redirectUrl;
  return;
}
showErrorSummary([{ field: 'email', message: response.message }]);
```

**Loading States:**
```typescript
// ✅ Button text change pattern (matches existing Try feature)
submitButton.textContent = 'Creating account...';
submitButton.disabled = true;

// On complete (success or error)
submitButton.textContent = 'Continue';
submitButton.disabled = false;
```

**Form Validation:**
```typescript
// ✅ GOV.UK pattern: Validate on submit, not on blur
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const errors = validateForm(form);
  if (errors.length > 0) {
    showErrorSummary(errors);
    return;
  }
  submitForm(form);
});
```

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow existing `src/try/` patterns for client-side code
2. Follow existing `infra/lib/lambda/notification/` patterns for Lambda code
3. Use GOV.UK Design System components and error patterns
4. Write co-located unit tests for all new modules
5. Use structured JSON logging in Lambda (no `console.log('string')`)
6. Never log PII (email, name) in error paths
7. Return consistent error response format `{ error, message }`

**Pattern Verification:**
- ESLint enforces naming conventions
- TypeScript strict mode catches type issues
- PR review checks GOV.UK compliance
- Playwright tests verify accessibility

### Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| `any` type | Loses type safety | Use `unknown` and narrow |
| Console.log strings | Not queryable in CloudWatch | Structured JSON |
| Validate on blur | Not GOV.UK pattern | Validate on submit |
| Apologetic errors | Not GOV.UK tone | Direct, actionable |
| DOM in api/ folder | Wrong separation | DOM only in ui/ |
| State in utils/ | Should be pure | State in ui/ or dedicated module |

## Project Structure & Boundaries

### Complete Project Directory Structure

**Simplified First Principles Structure (16 files):**

```
ndx/
├── src/signup/                    # Client-side signup feature
│   ├── main.ts                    # Entry + form + validation + error handling
│   ├── main.test.ts               # Unit tests
│   ├── api.ts                     # API client for /signup-api/*
│   ├── api.test.ts                # API client tests
│   └── types.ts                   # Shared types (Lambda imports this)
│
├── infra-signup/                  # NEW: Signup Lambda stack (NDX repo)
│   ├── bin/
│   │   └── signup.ts              # CDK app entry
│   ├── lib/
│   │   ├── signup-stack.ts        # Stack + EventBridge + SNS
│   │   └── lambda/signup/
│   │       ├── handler.ts         # Entry + orchestration
│   │       ├── handler.test.ts    # Handler tests
│   │       ├── services.ts        # Domain + IDC + email logic
│   │       └── services.test.ts   # Service tests
│   ├── package.json
│   ├── tsconfig.json              # Includes paths to @ndx/signup-types
│   └── README.md
│
└── tests/e2e/
    └── signup.spec.ts             # Playwright E2E tests
```

**Rationale (First Principles Analysis):**
- Client: 3 files (main.ts, api.ts, types.ts) - combined from original 6+ files
- Lambda: 2 files (handler.ts, services.ts) - orchestration + domain logic
- Shared types: Lambda imports from `src/signup/types.ts` via tsconfig paths
- Total: 16 files (down from 25)

### Architecture Decision Records (New)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-047 | Lambda in `infra-signup/` (NDX repo) | Single repo, single PR, clearer ownership, no cross-repo coordination |
| ADR-048 | Shared types via tsconfig paths | Lambda imports `@ndx/signup-types` from `src/signup/types.ts`, no duplication |
| ADR-049 | Co-located tests (`*.test.ts`) | Follows existing codebase pattern, easier maintenance |
| ADR-050 | Pages match URL structure | `/signup` → `src/signup.njk`, `/signup/success` → `src/signup/success.njk` |
| ADR-051 | Error handling inline in main.ts | Single file owns form + validation + error display, no premature abstraction |
| ADR-052 | Cache bypass with secret + logging | Header `X-NDX-Cache-Bypass: <secret>` + CloudWatch log on use |

### Component Boundaries

**Client (`src/signup/`):**
- `main.ts`: Entry point, form handling, validation, error display, GOV.UK components
- `api.ts`: Fetch wrapper for `/signup-api/*`, handles errors, returns typed responses
- `types.ts`: Shared interfaces - `SignupRequest`, `SignupResponse`, `DomainInfo`, error codes

**Lambda (`infra-signup/lib/lambda/signup/`):**
- `handler.ts`: HTTP routing, request parsing, response formatting, CSRF validation
- `services.ts`: Domain validation, email normalization, IAM IDC API calls

**Shared Types (tsconfig paths):**
```json
// infra-signup/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@ndx/signup-types": ["../src/signup/types.ts"]
    }
  }
}
```

### Pre-mortem Mitigations (Risk Analysis)

| Failure Scenario | Mitigation |
|------------------|------------|
| Client/Lambda type drift | Shared types via tsconfig paths (ADR-048) |
| CloudFront cache serves stale responses | Cache bypass header with secret + logging (ADR-052) |
| Deployment coordination failure | Deployment script orchestrates: 1) Lambda → 2) CloudFront → 3) Static |
| ISB account permissions missing | Document required IAM permissions in README |
| EventBridge rule missing CloudTrail events | Pre-flight check in deployment script |
| Rate limit blocks legitimate users | WAF rule configured per-IP, not global |

### Deployment Orchestration

**Deployment Script (`scripts/deploy-signup.sh`):**
```bash
#!/bin/bash
set -e

# 1. Deploy Lambda stack first (creates API endpoint)
cd infra-signup && yarn cdk deploy --require-approval never

# 2. Update CloudFront behaviour (adds /signup-api/* route)
cd ../infra && yarn cdk deploy --require-approval never

# 3. Build and deploy static assets
cd .. && yarn build && yarn deploy

# 4. Verify deployment
curl -sf https://ndx.digital.cabinet-office.gov.uk/signup-api/domains | jq .
```

### Integration Points

| Integration | Source | Target | Method |
|-------------|--------|--------|--------|
| Form → API | `src/signup/api.ts` | `/signup-api/*` | Fetch with CSRF header |
| Lambda → IDC | `services.ts` | IAM Identity Center | AWS SDK v3 |
| Lambda → GitHub | `services.ts` | Raw JSON URL | Fetch with 5-min cache |
| Alert → Slack | EventBridge | AWS Chatbot | SNS subscription |

### Security Boundaries

**CSRF Protection:**
- Client sends: `X-NDX-Request: signup-form`
- Lambda validates header presence and value
- Combined with strict CORS (origin only)

**Cache Bypass:**
- Header: `X-NDX-Cache-Bypass: <secret-value>`
- Secret stored in environment variable
- Every use logged to CloudWatch
- For debugging only, not production use

**Lambda IAM Scope:**
- `sso-directory:CreateUser` - scoped to identity store ID
- `sso-directory:CreateGroupMembership` - scoped to group ID
- No wildcard permissions

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible:
- TypeScript 5.7.2 + Node.js 20.x Lambda runtime ✓
- AWS CDK 2.215.0 + Lambda Function URL with OAC ✓
- Eleventy 3.1.2 + esbuild for client bundling ✓
- IAM Identity Center API + AWS SDK v3 ✓

No version conflicts detected.

**Pattern Consistency:**
- Naming conventions (kebab-case files, camelCase JSON) align across client and Lambda
- GOV.UK error patterns defined for both API responses and UI display
- Logging patterns (structured JSON) consistent with existing notification Lambda

**Structure Alignment:**
- `infra-signup/` mirrors existing `infra/` structure
- `src/signup/` mirrors existing `src/try/` pattern
- Shared types via tsconfig paths is proven pattern in NDX codebase

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

| Category | FRs | Architectural Support |
|----------|-----|----------------------|
| Account Registration (FR1-FR7) | ✅ | Lambda + IAM IDC, form validation, success page |
| Auth Integration (FR8-FR11) | ✅ | Auth modal extension, return URL handling |
| Domain Management (FR12-FR15) | ✅ | GitHub JSON source, 5-min cache, domain select |
| Security (FR16-FR20) | ✅ | CSRF header, WAF rate limit, scoped IAM, OAC |
| Operational (FR21-FR24) | ✅ | EventBridge → SNS → Chatbot alerting |
| Content (FR25-FR29) | ✅ | Static pages, GOV.UK Design System |

**Non-Functional Requirements Coverage:**

| NFR Category | Requirement | Architectural Support |
|--------------|-------------|----------------------|
| Performance | < 2s page load | Static pages + esbuild bundling |
| Performance | < 500ms domain API | In-memory cache + minimal Lambda cold start |
| Performance | < 3s signup API | Direct IAM IDC call, no DB |
| Security | TLS 1.2+ | CloudFront default |
| Security | CSRF | Custom header X-NDX-Request (ADR-045) |
| Security | WAF rate limit | 1 req/min/IP (ADR-046) |
| Security | OAC + SigV4 | CloudFront behaviour config |
| Accessibility | WCAG 2.2 AA | GOV.UK Design System + Playwright tests |

### Implementation Readiness Validation ✅

**Decision Completeness:**
- ✅ All 12 ADRs documented (040-052)
- ✅ Technology versions verified (TypeScript 5.7.2, CDK 2.215.0, Node.js 20.x)
- ✅ Concrete examples provided for API responses, error handling, logging

**Structure Completeness:**
- ✅ All 16 files defined with purposes
- ✅ Directory structure with clear boundaries
- ✅ Integration points mapped (4 defined)

**Pattern Completeness:**
- ✅ All 12 conflict points addressed
- ✅ Naming conventions comprehensive (files, code, API, database)
- ✅ Process patterns defined (error handling, loading states, validation)

### Gap Analysis Results

**Critical Gaps:** None identified

**Important Gaps (Non-blocking):**
1. E2E test scenarios not detailed - defer to stories
2. CloudWatch dashboard/alarms not specified - defer to operational story

**Nice-to-Have:**
1. Local development Lambda testing approach
2. Domain allowlist update workflow

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (29 FRs, 23 NFRs)
- [x] Scale and complexity assessed (medium)
- [x] Technical constraints identified (brownfield, GOV.UK, IAM IDC)
- [x] Cross-cutting concerns mapped (6 identified)

**✅ Architectural Decisions**
- [x] 12 ADRs documented (040-052)
- [x] Technology stack fully specified with versions
- [x] Integration patterns defined (4 integration points)
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established (5 categories)
- [x] Structure patterns defined (frontend + Lambda)
- [x] Communication patterns specified (API + events)
- [x] Process patterns documented (errors, loading, validation)

**✅ Project Structure**
- [x] Complete directory structure defined (16 files)
- [x] Component boundaries established (client/Lambda/shared)
- [x] Integration points mapped
- [x] Pre-mortem mitigations documented (6 scenarios)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**
- Brownfield extension with proven patterns
- Simplified structure (First Principles Analysis)
- Shared types prevent client/Lambda drift
- Pre-mortem mitigations address deployment risks
- Cross-account alerting reuses existing Chatbot

**Areas for Future Enhancement:**
- CloudWatch dashboard for signup metrics
- Tiered alerting (reduce noise)
- Domain request workflow automation

### Implementation Handoff

**AI Agent Guidelines:**
1. Follow all architectural decisions exactly as documented
2. Use implementation patterns consistently across all components
3. Respect project structure and boundaries (`src/signup/`, `infra-signup/`)
4. Import shared types via `@ndx/signup-types` path
5. Refer to this document for all architectural questions

**First Implementation Priority:**
```bash
# Scaffold the new directories
mkdir -p src/signup
mkdir -p infra-signup/bin infra-signup/lib/lambda/signup
mkdir -p tests/e2e
```

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-13
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

**Complete Architecture Document**
- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**Implementation Ready Foundation**
- 12 architectural decisions made (ADR-040 through ADR-052)
- 12 implementation patterns defined
- 16 files specified across 3 component areas
- 29 FRs + 23 NFRs fully supported

**AI Agent Implementation Guide**
- Technology stack with verified versions (TypeScript 5.7.2, CDK 2.215.0, Node.js 20.x)
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries (`src/signup/`, `infra-signup/`)
- Integration patterns and communication standards

### Development Sequence

1. **Scaffold directories** using the mkdir commands above
2. **Create `infra-signup/` CDK stack** with Lambda + EventBridge + SNS
3. **Create `src/signup/types.ts`** with shared types first
4. **Implement Lambda** (`handler.ts`, `services.ts`) importing shared types
5. **Implement client** (`main.ts`, `api.ts`) using types
6. **Add CloudFront behaviour** for `/signup-api/*`
7. **Configure WAF rate limiting** per ADR-046
8. **Add SNS topic to Chatbot** (manual one-time step)

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All 29 functional requirements supported
- [x] All 23 non-functional requirements addressed
- [x] 6 cross-cutting concerns handled
- [x] 4 integration points defined

**✅ Implementation Readiness**
- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete (16 files)
- [x] Examples provided for clarity

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Create Epics & Stories using this architecture as the technical foundation.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.

