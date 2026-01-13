---
project_name: "ndx"
user_name: "Cns"
date: "2026-01-13"
sections_completed: ["technology_stack", "language_rules", "framework_rules", "testing_rules", "code_quality", "workflow_rules", "critical_rules"]
existing_patterns_found: 35
---

# Project Context for AI Agents

_Critical rules and patterns that AI agents must follow when implementing code. Focus on unobvious details._

---

## Technology Stack & Versions

| Technology | Version | Notes |
|------------|---------|-------|
| TypeScript | 5.7.2 | Strict mode, ES2020 target |
| Node.js | 20.x | Lambda runtime |
| Eleventy | 3.1.2 | Static site generator |
| esbuild | 0.27.2 | Client bundling |
| Jest | 30.2.0 | Unit tests (jsdom) |
| Playwright | 1.57.0 | E2E + accessibility |
| AWS CDK | 2.215.0 | Infrastructure |
| GOV.UK Eleventy Plugin | 8.3.0 | Design system |
| Yarn | 4.5.0+ | Package manager (required) |

**Version Constraints:**
- Use `yarn` not `npm` (enforced via engines field)
- Node 20.x for Lambda compatibility
- ES2020 target for all client code

---

## Critical Implementation Rules

### TypeScript Rules

- **Strict mode is mandatory** - never use `// @ts-ignore` except for third-party imports without types
- **Use `unknown` not `any`** - narrow types explicitly
- **Explicit return types on exported functions** - `export async function fetchDomains(): Promise<DomainInfo[]>`
- **Interface for object shapes** - not `type` aliases for simple objects
- **Module paths** - use `@try/*` path alias in client code

```typescript
// ✅ DO
export async function validateEmail(email: string): Promise<boolean> { }
interface SignupRequest { firstName: string; lastName: string; }

// ❌ DON'T
export async function validateEmail(email) { }  // Missing types
type SignupRequest = { firstName: string }  // Use interface
```

### Import/Export Patterns

- **ES modules only** - `import/export`, never `require()`
- **Named exports preferred** - avoid default exports except entry points
- **GOV.UK Frontend** - use `// @ts-expect-error` comment for untyped imports
- **Relative imports within feature** - `./ui/auth-nav` not `@try/ui/auth-nav`

```typescript
// ✅ GOV.UK import pattern
// @ts-expect-error - govuk-frontend doesn't have TypeScript types
import { initAll as GOVUKFrontend } from "govuk-frontend"
```

### GOV.UK Design System Rules

- **Error messages are direct, no jargon** - tell user what happened and what to do
- **No apologetic language** - never "Sorry, we couldn't..."
- **Validate on submit, not on blur** - GOV.UK pattern
- **Error summary at top of page** - link to first error field
- **Use GOV.UK components** - never custom form controls

```typescript
// ✅ GOV.UK error style
"Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access."

// ❌ Avoid
"Sorry, we couldn't find your domain in our system. Please try again later."
```

### Lambda Rules

- **Structured JSON logging** - never `console.log('string')`
- **Redact PII in error logs** - email, name NOT logged on errors
- **Scoped IAM permissions** - specific resource ARNs, no wildcards
- **Correlation IDs** - use `event.requestContext?.requestId`

```typescript
// ✅ Structured logging
console.log(JSON.stringify({
  level: 'INFO',
  message: 'User created',
  domain: domain,
  correlationId: event.requestContext?.requestId
}));

// ❌ Don't
console.log('Created user: ' + email);  // PII exposure + unstructured
```

---

## Testing Rules

### Test Organization

- **Co-located tests** - `signup-client.test.ts` next to `signup-client.ts`
- **E2E tests in `tests/e2e/`** - Playwright specs
- **Custom jsdom environment** - `src/__mocks__/jsdom-env.js`

### Coverage Requirements

```
branches: 70%, functions: 80%, lines: 80%, statements: 80%
```

### Test Patterns

- **Mock fetch globally** - use `jest.spyOn(global, 'fetch')`
- **DOM testing with jsdom** - no real browser in unit tests
- **Accessibility tests with axe-core** - via `@axe-core/playwright`
- **Wait for `data-try-bundle-ready`** - E2E tests wait for JS initialization

```typescript
// ✅ E2E wait pattern
await page.waitForSelector('[data-try-bundle-ready="true"]')
```

---

## Code Quality & Style Rules

### Prettier Config (Enforced)

```
singleQuote: false
printWidth: 120
trailingComma: all
semi: false
```

### File Naming

- **kebab-case for files** - `signup-client.ts` not `SignupClient.ts`
- **`.test.ts` suffix for tests** - co-located
- **`main.ts` for entry points** - feature entry
- **`handler.ts` for Lambda** - Lambda entry

### Code Organization

```
src/signup/
├── api/           # API calls ONLY - no DOM, no state
├── ui/            # DOM interactions and components
├── utils/         # Pure functions - no side effects
├── auth/          # Authentication logic
└── main.ts        # Entry point - wires everything
```

### Comment Style

- **JSDoc for exported functions** - `@module`, `@param`, `@returns`
- **Story references** - `// Story 5.1: Initialize authentication navigation`
- **No obvious comments** - code should be self-documenting

---

## Development Workflow Rules

### Package Manager

- **Yarn 4.5.0+ required** - `npm` is blocked via engines field
- **Run `yarn` not `npm install`**

### Build Commands

```bash
yarn start          # Local dev server
yarn build          # Eleventy build
yarn build:try-js   # Bundle client TypeScript
yarn test           # Jest unit tests
yarn test:e2e       # Playwright E2E
yarn lint           # Prettier check
```

### Git Patterns

- **Feature branches from main**
- **PR required for all changes**
- **Husky pre-commit hooks** - lint-staged runs Prettier

---

## Critical Don't-Miss Rules

### Anti-Patterns to Avoid

| Anti-Pattern | Why Wrong | Correct Approach |
|--------------|-----------|------------------|
| `any` type | Loses type safety | Use `unknown` and narrow |
| `console.log(string)` | Not queryable in CloudWatch | Structured JSON |
| Validate on blur | Not GOV.UK pattern | Validate on submit |
| Apologetic errors | Not GOV.UK tone | Direct, actionable |
| DOM in api/ folder | Wrong separation | DOM only in ui/ |
| State in utils/ | Should be pure | State in ui/ or dedicated |
| `npm install` | Wrong package manager | Use `yarn` |

### Security Rules

- **CSRF header required** - `X-NDX-Request: signup-form` on all POST
- **No PII in logs** - especially on error paths
- **Scoped IAM** - resource-level permissions only
- **OAC validation** - Lambda validates SigV4 signatures

### Edge Cases

- **Email normalization** - strip `+` suffix before uniqueness check
- **Domain cache fallback** - return stale data if GitHub unavailable
- **Loading state reset** - always re-enable button on error
- **Return URL blocklist** - validate against allowed paths

### Security Input Validation Rules

- **Email canonicalization:**
  - Lowercase all emails before processing
  - Strip `+` suffix and everything after (alias defense)
  - Reject non-ASCII characters (Unicode homoglyph defense)
  - Max length: 254 characters (RFC 5321)

- **Name fields:** Max 100 chars, reject HTML/script tags, null bytes, control chars

- **Domain validation:** Exact match against cached allowlist (no partial matching)

### Security Headers (Lambda Responses)

```typescript
const securityHeaders = {
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

### Cache Security Rules

- Never cache error responses from external sources
- Validate JSON schema before storing in cache
- Log and alarm on cache refresh failures
- Cache TTL applies to successful responses only

### Audit Logging Requirements

- Log all rate limit violations with IP (hashed)
- Log all domain validation failures
- Preserve correlation ID across async boundaries
- CloudWatch log retention: 30 days (align with data policy)

### API Protection Rules

- **Rate limit ALL endpoints:**
  - `/signup-api/domains`: 10 req/min/IP
  - `/signup-api/signup`: 1 req/min/IP

- **Request body limits:** Max 10KB, max JSON depth 5 levels

- **Timing attack mitigation:** Add 50-150ms random delay to all responses

### Client-Side Security Rules

- **Never use innerHTML with user data** - use textContent only
- **JSON.parse validation:** Reject objects with `__proto__` or `constructor` keys
- **localStorage:** Validate schema on read, clear on mismatch

### Infrastructure Protection Rules

- **Lambda reserved concurrency:** 10 (prevents exhaustion)
- **CloudFront cache key:** Vary only on `Origin` header
- **SNS alerts:** Never include raw user input, use structured format only

### Complete Lambda Handler Template

```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.requestContext?.requestId

  try {
    // 1. Validate CSRF header
    if (event.headers['x-ndx-request'] !== 'signup-form') {
      return errorResponse(403, 'FORBIDDEN', 'Invalid request')
    }

    // 2. Parse body defensively
    const body = parseBodySafe(event.body, SignupRequestSchema)

    // 3. Business logic
    const result = await processRequest(body)

    // 4. Return success
    return successResponse(result)

  } catch (error) {
    logError(correlationId, error)
    return errorResponse(500, 'SERVER_ERROR', 'Something went wrong. Try again.')
  }
}
```

### Defensive Parsing Pattern

```typescript
function parseBodySafe<T>(body: string | null, schema: Schema<T>): T {
  if (!body) throw new ValidationError('INVALID_REQUEST', 'Body required')

  let parsed: unknown
  try { parsed = JSON.parse(body) }
  catch { throw new ValidationError('INVALID_JSON', 'Invalid JSON') }

  if (typeof parsed === 'object' && parsed !== null) {
    if ('__proto__' in parsed || 'constructor' in parsed) {
      throw new ValidationError('INVALID_JSON', 'Invalid JSON')
    }
  }

  return schema.parse(parsed)
}
```

---

## Pre-mortem Prevention Rules

### Type Synchronization

- **Single source:** `src/signup/types.ts` owns all shared types
- **Lambda imports via `@ndx/signup-types`** - never duplicate type definitions
- **CI must compile both client AND Lambda together** - catch drift early

### Error Handling Mandate

- **NEVER empty catch blocks** - always log or rethrow
- **NEVER swallow errors silently** - every catch must have visible action
- **Validation failures MUST return error responses** - never proceed on invalid data

```typescript
// ❌ FORBIDDEN
try { validate(data) } catch { /* silent */ }

// ✅ REQUIRED
try { validate(data) } catch (e) {
  logError(correlationId, e)
  return errorResponse(400, 'VALIDATION_ERROR', e.message)
}
```

### Required Test Cases (Every Validation)

- ✅ Happy path (valid input)
- ✅ Empty string
- ✅ Whitespace-only string
- ✅ Null/undefined
- ✅ Maximum length exceeded
- ✅ Invalid characters (HTML, script tags, control chars)
- ✅ Unicode edge cases (emojis, homoglyphs)

### Async Operation Rules

- **Cache-then-network:** Check cache first, fetch only if expired
- **Sequential, never parallel:** Prevent race conditions
- **Await all promises:** Never fire-and-forget

```typescript
// ❌ RACE CONDITION
const [cached, fresh] = await Promise.all([getCache(), fetchFresh()])

// ✅ SEQUENTIAL
const cached = await getCache()
if (cached && !isExpired(cached)) return cached
const fresh = await fetchFresh()
await setCache(fresh)
return fresh
```

### Accessibility Checklist (Every Form)

- [ ] Error summary at page top with links to fields
- [ ] Each input has `<label>` with `for` attribute
- [ ] Error messages linked via `aria-describedby`
- [ ] Focus moves to error summary on validation failure
- [ ] `aria-invalid="true"` on fields with errors
- [ ] Colour is not the only error indicator

### Environment Configuration

- **NEVER hardcode IDs/ARNs** - use environment variables
- **Validate required env vars at startup** - fail fast if missing

```typescript
const IDENTITY_STORE_ID = process.env.IDENTITY_STORE_ID
const GROUP_ID = process.env.GROUP_ID

if (!IDENTITY_STORE_ID || !GROUP_ID) {
  throw new Error('Missing required environment variables')
}
```

---

## Signup Feature Specific Rules

### User Journey Context

**Happy Path:**
1. User lands on `/signup` → sees form
2. User selects domain from dropdown → validates email domain
3. User submits form → Lambda creates IAM IDC user
4. User redirected to `/signup/success` → sees next steps
5. User receives email from AWS → clicks link to set password
6. User returns to NDX → logs in via auth modal

**Error Recovery:**
- Domain not found → Stay on form, show "Contact ndx@dsit.gov.uk"
- Email exists → Redirect to login with "Welcome back"
- Server error → Retry message, preserve form data
- Rate limited → Show countdown timer

### Debugging & Troubleshooting

**Trace failures via:** `correlationId` in CloudWatch Logs
```bash
fields @message | filter correlationId = "xxx"
```

**IAM IDC errors:** Check CloudTrail in ISB account (955063685555)

**Local dev:**
- Client: `yarn start` (Eleventy on :8080)
- Lambda: `sam local invoke` with test events
- Cannot test IAM IDC locally - use integration tests

**Deployment verification:**
```bash
# Check endpoint responds
curl -s https://ndx.digital.cabinet-office.gov.uk/signup-api/domains | jq .
```

### UI Interaction Patterns

**Form field order (top to bottom):**
1. First name (required)
2. Last name (required)
3. Email address (required)
4. Organisation domain (dropdown, required)
5. Submit button

**Loading states:**
| State | Button Text | Button State |
|-------|-------------|--------------|
| Idle | "Continue" | Enabled |
| Submitting | "Creating account..." | Disabled |
| Error | "Continue" | Enabled |

**Error message copy (exact text - do not modify):**
| Error Code | User Message |
|------------|--------------|
| `DOMAIN_NOT_ALLOWED` | "Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access." |
| `USER_EXISTS` | "Welcome back! You already have an account." |
| `INVALID_EMAIL` | "Enter a valid email address" |
| `RATE_LIMITED` | "Too many attempts. Try again in 1 minute." |
| `SERVER_ERROR` | "Something went wrong. Try again." |

**Focus management:**
- On error: Focus moves to error summary
- Error summary links focus to first invalid field when clicked

### Project Structure

```
src/signup/           # Client (3 files)
├── main.ts           # Entry + form + error handling
├── api.ts            # API client
└── types.ts          # Shared types (Lambda imports this)

infra-signup/         # Lambda stack
└── lib/lambda/signup/
    ├── handler.ts    # Entry + orchestration
    └── services.ts   # Domain + IDC logic
```

### Type Sharing

- Lambda imports types from `@ndx/signup-types` via tsconfig paths
- Single source of truth in `src/signup/types.ts`
- Never duplicate type definitions

### API Patterns

- **Base path:** `/signup-api/*`
- **Response format:** `{ success: true, redirectUrl }` or `{ error, message }`
- **Error codes:** SCREAMING_SNAKE_CASE (e.g., `DOMAIN_NOT_ALLOWED`)

---

_Last updated: 2026-01-13_
_Enhanced via Advanced Elicitation: Security Audit, Red Team/Blue Team, Code Review Gauntlet, Pre-mortem Analysis, Cross-Functional War Room_
