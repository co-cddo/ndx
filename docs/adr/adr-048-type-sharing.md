# ADR-048: Type Sharing via tsconfig Paths

## Status
Accepted

## Context
The signup feature has both frontend (form submission) and backend (Lambda handler) components. They share types for request/response structures, error codes, and validation rules.

## Decision
1. **Single source of truth**: Types are defined in `src/signup/types.ts`
2. **Path mapping**: Lambda imports via `@ndx/signup-types` alias configured in tsconfig
3. **No duplication**: Backend imports shared types rather than defining its own
4. **Validation constants**: Shared regex patterns and constraints ensure frontend/backend consistency

## Consequences
- **Consistency**: Type changes automatically apply to both frontend and backend
- **Build requirement**: Lambda build must resolve path mapping correctly
- **No npm package**: Types aren't published; only available within this monorepo
- **Testing**: Changes to types require testing both frontend and backend

## Shared Types
- `SignupRequest`: Form submission payload
- `ApiError`: Error response structure
- `SignupErrorCode`: Enum of error codes
- `ERROR_MESSAGES`: User-friendly error text
- `FORBIDDEN_NAME_CHARS`: Validation regex
- `VALIDATION_CONSTRAINTS`: Field length limits

## Implementation
- Types file: `src/signup/types.ts`
- Lambda tsconfig: `infra-signup/tsconfig.json` with paths mapping
- Import example: `import { SignupErrorCode } from "@ndx/signup-types"`
