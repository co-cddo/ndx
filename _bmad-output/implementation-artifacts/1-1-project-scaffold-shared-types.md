# Story 1.1: Project Scaffold & Shared Types

Status: done

## Story

As a **developer**,
I want **the signup feature directories and shared TypeScript types established**,
so that **all subsequent stories have a consistent foundation to build upon**.

## Acceptance Criteria

1. **Given** the NDX repository exists
   **When** the scaffold is complete
   **Then** the following directories exist:
   - `src/signup/`
   - `infra-signup/bin/`
   - `infra-signup/lib/lambda/signup/`
   - `tests/e2e/`

2. **Given** the directories are created
   **When** I check `src/signup/types.ts`
   **Then** it contains TypeScript interfaces for:
   - `SignupRequest` (firstName, lastName, email, domain)
   - `SignupResponse` (success, redirectUrl)
   - `DomainInfo` (domain, orgName)
   - `ApiError` (error code enum, message)

3. **Given** the types file exists
   **When** I check `infra-signup/tsconfig.json`
   **Then** it includes path mapping `@ndx/signup-types` -> `../src/signup/types.ts`

4. **Given** all files are created
   **When** I run TypeScript compilation
   **Then** there are no type errors

## Tasks / Subtasks

- [x] Task 1: Create client-side directories (AC: #1)
  - [x] 1.1 Create `src/signup/` directory
  - [x] 1.2 Create placeholder `src/signup/main.ts` entry point
  - [x] 1.3 Create placeholder `src/signup/api.ts` for API client

- [x] Task 2: Create infrastructure directories (AC: #1)
  - [x] 2.1 Create `infra-signup/bin/` directory
  - [x] 2.2 Create `infra-signup/lib/lambda/signup/` directory structure
  - [x] 2.3 Create placeholder `infra-signup/bin/signup.ts` CDK app entry
  - [x] 2.4 Create placeholder `infra-signup/lib/signup-stack.ts`
  - [x] 2.5 Create placeholder `infra-signup/lib/lambda/signup/handler.ts`
  - [x] 2.6 Create placeholder `infra-signup/lib/lambda/signup/services.ts`

- [x] Task 3: Create shared types (AC: #2)
  - [x] 3.1 Create `src/signup/types.ts` with all interfaces
  - [x] 3.2 Define `SignupRequest` interface (firstName, lastName, email, domain)
  - [x] 3.3 Define `SignupResponse` interface (success, redirectUrl?, error?)
  - [x] 3.4 Define `DomainInfo` interface (domain, orgName)
  - [x] 3.5 Define `ApiError` interface with `SignupErrorCode` enum
  - [x] 3.6 Define additional types for validation and helpers

- [x] Task 4: Configure infra-signup package (AC: #3)
  - [x] 4.1 Create `infra-signup/package.json` with dependencies
  - [x] 4.2 Create `infra-signup/tsconfig.json` with `@ndx/signup-types` path mapping
  - [x] 4.3 Create `infra-signup/README.md` with setup instructions

- [x] Task 5: Verify compilation (AC: #4)
  - [x] 5.1 Run `tsc --noEmit` in `src/signup/`
  - [x] 5.2 Run `yarn install` in `infra-signup/`
  - [x] 5.3 Run `tsc --noEmit` in `infra-signup/`
  - [x] 5.4 Verify Lambda can import types via `@ndx/signup-types` path

- [x] Task 6: Ensure E2E test directory exists (AC: #1)
  - [x] 6.1 Verify `tests/e2e/` exists (should already from existing codebase)
  - [x] 6.2 Create placeholder `tests/e2e/signup.spec.ts` if needed

## Dev Notes

### Critical Architecture Patterns

**MUST follow existing codebase patterns - reference these files:**

1. **Client module structure** - Mirror `src/try/`:
   - Entry point: `main.ts` (like `src/try/main.ts`)
   - API client: `api.ts` (like `src/try/api/api-client.ts`)
   - Types: `types.ts` (single source of truth)

2. **Lambda structure** - Mirror `infra/lib/lambda/notification/`:
   - Handler: `handler.ts` (like `infra/lib/lambda/notification/handler.ts`)
   - Services: `services.ts` (domain logic)
   - Types: Import from client via path mapping

3. **Package manager** - Use `yarn` (npm is blocked via engines field)

### Type Design Specifications

**From Architecture Document (ADR-048):**

```typescript
// src/signup/types.ts

/** Error codes matching backend responses */
export enum SignupErrorCode {
  DOMAIN_NOT_ALLOWED = "DOMAIN_NOT_ALLOWED",
  USER_EXISTS = "USER_EXISTS",
  INVALID_EMAIL = "INVALID_EMAIL",
  INVALID_CONTENT_TYPE = "INVALID_CONTENT_TYPE",
  CSRF_INVALID = "CSRF_INVALID",
  RATE_LIMITED = "RATE_LIMITED",
  SERVER_ERROR = "SERVER_ERROR"
}

/** Signup form submission payload */
export interface SignupRequest {
  firstName: string
  lastName: string
  email: string
  domain: string
}

/** API success response */
export interface SignupResponse {
  success: true
  redirectUrl?: string
}

/** API error response */
export interface ApiError {
  error: SignupErrorCode
  message: string
  redirectUrl?: string  // For USER_EXISTS redirect
}

/** Domain info from allowlist */
export interface DomainInfo {
  domain: string
  orgName: string
}

/** Type guard for API responses */
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    "message" in response
  )
}
```

### infra-signup/tsconfig.json Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "declaration": true,
    "paths": {
      "@ndx/signup-types": ["../src/signup/types.ts"]
    },
    "baseUrl": "."
  },
  "include": ["bin/**/*.ts", "lib/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### infra-signup/package.json Configuration

```json
{
  "name": "ndx-signup-infra",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest",
    "cdk": "cdk"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "typescript": "^5.7.2",
    "aws-cdk": "^2.215.0",
    "@aws-cdk/assert": "^2.215.0",
    "jest": "^30.2.0",
    "ts-jest": "^29.4.6",
    "@types/jest": "^29.x"
  },
  "dependencies": {
    "aws-cdk-lib": "^2.215.0",
    "constructs": "^10.x",
    "@aws-sdk/client-identitystore": "^3.x",
    "@aws-sdk/client-sso-admin": "^3.x"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Project Structure Notes

**Target directory structure after this story:**

```
ndx/
├── src/signup/                    # Client-side signup feature
│   ├── main.ts                    # Entry point (placeholder)
│   ├── api.ts                     # API client (placeholder)
│   └── types.ts                   # Shared types (COMPLETE)
│
├── infra-signup/                  # Signup Lambda stack
│   ├── bin/
│   │   └── signup.ts              # CDK app entry (placeholder)
│   ├── lib/
│   │   ├── signup-stack.ts        # Stack definition (placeholder)
│   │   └── lambda/signup/
│   │       ├── handler.ts         # Lambda handler (placeholder)
│   │       └── services.ts        # Domain logic (placeholder)
│   ├── package.json               # Package config
│   ├── tsconfig.json              # TS config with paths
│   └── README.md                  # Setup instructions
│
└── tests/e2e/
    └── signup.spec.ts             # E2E tests (placeholder)
```

**Alignment with Architecture:**
- Follows ADR-047: Lambda in `infra-signup/` (NDX repo)
- Follows ADR-048: Shared types via tsconfig paths
- Follows ADR-049: Co-located tests pattern

### Security Considerations

**From project-context.md:**
- Types define the contract for input validation
- Error codes are explicit - no generic "error" strings
- `SignupErrorCode` enum prevents typos and enables exhaustive checks

### Testing Requirements

This story creates placeholders. Actual tests come in subsequent stories.
For this story, only need to verify:
1. TypeScript compilation succeeds
2. Path mapping resolves correctly
3. All directories exist

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architecture Decision Records (New)]
- [Source: _bmad-output/planning-artifacts/project-context.md#Project Structure]
- [Source: _bmad-output/planning-artifacts/prd.md#Web App + API Specific Requirements]
- [Source: src/try/main.ts - Entry point pattern]
- [Source: src/try/api/api-client.ts - API client pattern]
- [Source: infra/lib/lambda/notification/types.ts - Lambda types pattern]

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

- TypeScript compilation verified: `yarn tsc --noEmit` passed in both root and infra-signup
- All 712 tests passed (686 existing + 26 new)
- infra-signup dependencies installed successfully with yarn

### Completion Notes List

- ✅ Created client-side scaffold: `src/signup/` with main.ts, api.ts, types.ts
- ✅ Created infrastructure scaffold: `infra-signup/` with full directory structure
- ✅ Implemented comprehensive shared types in `src/signup/types.ts`:
  - `SignupErrorCode` enum with all error codes
  - `ERROR_MESSAGES` constant map for user-friendly messages
  - `SignupRequest`, `SignupResponse`, `ApiError`, `DomainInfo` interfaces
  - `isApiError()` and `isSignupResponse()` type guards
  - `VALIDATION_CONSTRAINTS` and `FORBIDDEN_NAME_CHARS` constants
- ✅ Configured infra-signup package with tsconfig path mapping `@ndx/signup-types`
- ✅ Added path alias `@signup/*` to root tsconfig.json
- ✅ Created 26 unit tests for types and type guards in `types.test.ts`
- ✅ Created placeholder E2E test at `tests/e2e/signup/signup.spec.ts`
- ✅ Lambda services.ts successfully imports types via `@ndx/signup-types` path

### Change Log

- 2026-01-13: Story 1.1 implemented - Project scaffold and shared types established
- 2026-01-13: Code review completed - 5 issues found and auto-fixed:
  - Added missing `.yarnrc.yml` for infra-signup package
  - Aligned Jest version (29.7.0) with existing infra package
  - Added ESLint configuration matching existing infra package
  - Updated tsconfig.json to use ES2022/NodeNext (matching existing infra)
  - All TypeScript compilation and tests pass

### File List

**New files:**
- src/signup/main.ts
- src/signup/api.ts
- src/signup/types.ts
- src/signup/types.test.ts
- infra-signup/bin/signup.ts
- infra-signup/lib/signup-stack.ts
- infra-signup/lib/lambda/signup/handler.ts
- infra-signup/lib/lambda/signup/services.ts
- infra-signup/package.json
- infra-signup/tsconfig.json
- infra-signup/README.md
- infra-signup/yarn.lock
- infra-signup/.yarnrc.yml
- tests/e2e/signup/signup.spec.ts

**Modified files:**
- tsconfig.json (added @signup/* path alias)
