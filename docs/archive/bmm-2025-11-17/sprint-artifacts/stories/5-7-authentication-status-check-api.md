# Story 5.7: Authentication Status Check API

Status: done

## Story

As a developer,
I want to call `/api/auth/login/status` to check authentication status,
So that I can verify token validity and retrieve user session data.

## Acceptance Criteria

1. **Auth Status API Call**
   - Given I have JWT token in sessionStorage
   - When I call `GET /api/auth/login/status` with Authorization header
   - Then the API returns user session data with email, displayName, userName, roles

2. **Response Parsing**
   - Given API returns successful response
   - When client-side code parses response
   - Then I receive `{ authenticated: true, user: { email, displayName, userName, roles } }`

3. **401 Response Handling**
   - Given token is invalid or expired
   - When API returns 401 status
   - Then function returns `{ authenticated: false }`
   - And no errors are thrown

4. **Network Error Handling**
   - Given network request fails
   - When fetch throws an error
   - Then function returns `{ authenticated: false }`
   - And error is logged to console

5. **TypeScript Type Safety**
   - Given checkAuthStatus() is called
   - When response is returned
   - Then return type is `AuthStatusResult { authenticated: boolean; user?: UserData }`

## Tasks / Subtasks

- [x] Task 1: Create checkAuthStatus Function (AC: #1, #2)
  - [x] 1.1: Add `checkAuthStatus()` to `src/try/api/api-client.ts`
  - [x] 1.2: Call `/api/auth/login/status` using `callISBAPI()`
  - [x] 1.3: Parse JSON response on 200 OK
  - [x] 1.4: Return `{ authenticated: true, user: userData }`

- [x] Task 2: Define TypeScript Types (AC: #5)
  - [x] 2.1: Create `UserData` interface in api-client.ts
  - [x] 2.2: Create `AuthStatusResult` type (authenticated boolean, optional user)
  - [x] 2.3: Add JSDoc documentation for types

- [x] Task 3: Handle Error Cases (AC: #3, #4)
  - [x] 3.1: Handle 401 response - return `{ authenticated: false }`
  - [x] 3.2: Handle other HTTP errors - log and return `{ authenticated: false }`
  - [x] 3.3: Handle network errors (try/catch) - log and return `{ authenticated: false }`

- [x] Task 4: Unit Tests (AC: #1-5)
  - [x] 4.1: Test: Returns user data on 200 OK
  - [x] 4.2: Test: Returns authenticated: false on 401
  - [x] 4.3: Test: Returns authenticated: false on network error
  - [x] 4.4: Test: Returns authenticated: false on other HTTP errors
  - [x] 4.5: Test: TypeScript types are correct

- [x] Task 5: Export and Document
  - [x] 5.1: Export `checkAuthStatus` from api-client module
  - [x] 5.2: Add JSDoc with usage examples
  - [x] 5.3: Rebuild try.bundle.js

## Dev Notes

### Architecture Context

**ADR-021: Centralized API client with authentication interceptor**

- `checkAuthStatus()` method validates token server-side
- Returns typed response: `{ authenticated: boolean; user?: UserData }`
- Used by UI components to show personalized content (display name)
- Used by Try button to check auth before showing modal

**Module Location:**

- `src/try/api/api-client.ts` - Add checkAuthStatus() function

**Technical Implementation:**

```typescript
// src/try/api/api-client.ts

interface UserData {
  email: string
  displayName: string
  userName: string
  roles: string[]
}

interface AuthStatusResult {
  authenticated: boolean
  user?: UserData
}

export async function checkAuthStatus(): Promise<AuthStatusResult> {
  try {
    const response = await callISBAPI("/api/auth/login/status")

    if (response.ok) {
      const userData = await response.json()
      return {
        authenticated: true,
        user: userData,
      }
    } else if (response.status === 401) {
      // Token invalid or expired
      return { authenticated: false }
    } else {
      console.error("Auth status check failed:", response.status)
      return { authenticated: false }
    }
  } catch (error) {
    console.error("Auth status check error:", error)
    return { authenticated: false }
  }
}
```

### Learnings from Previous Story

**From Story 5.6 (Status: done)**

- **API Client Pattern**: `callISBAPI()` function handles Authorization header automatically
- **Token Key**: `isb-jwt` - consistent across all Epic 5 stories
- **Testing Pattern**: Mock fetch with `createMockResponse()` factory
- **Build**: Run `yarn build` to bundle try.bundle.js after changes
- **Test Command**: `yarn test src/try/api/api-client.test.ts --verbose`

[Source: docs/sprint-artifacts/stories/5-6-api-authorization-header-injection.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Modify:**

- `src/try/api/api-client.ts` - Add checkAuthStatus function and types
- `src/try/api/api-client.test.ts` - Add unit tests for checkAuthStatus

### Testing Strategy

**Unit Tests:**

- Mock `callISBAPI()` to return different response scenarios
- Test 200 OK with user data - verify return structure
- Test 401 Unauthorized - verify `{ authenticated: false }`
- Test 500 Server Error - verify `{ authenticated: false }` and console.error
- Test network error (fetch throws) - verify `{ authenticated: false }` and console.error

### References

- **Epic:** Story 5.7: Authentication Status Check API
  - Source: `docs/epics/epic-5-authentication-foundation.md` (Lines 364-429)
- **Architecture:** ADR-021 (Centralized API client)
  - Source: `docs/try-before-you-buy-architecture.md`
- **PRD:** FR-TRY-16, FR-TRY-17 (Auth status API requirements)
  - Source: `docs/prd.md`

### Future Considerations

- **Story 5.8**: Will use checkAuthStatus() to determine if re-authentication needed after 401
- **Story 7.x**: Will use user.email from checkAuthStatus() for leases API calls
- **UI Personalization**: user.displayName can be shown in nav (e.g., "Welcome, Jane Smith")

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/stories/5-7-authentication-status-check-api.context.xml

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- checkAuthStatus() implemented in api-client.ts:132-155
- UserData and AuthStatusResult TypeScript interfaces exported
- 14 new unit tests added (33 total in api-client.test.ts)
- All tests passing

### File List

- src/try/api/api-client.ts (modified)
- src/try/api/api-client.test.ts (modified)

## Change Log

| Date       | Version | Description                            |
| ---------- | ------- | -------------------------------------- |
| 2025-11-24 | 1.0     | Story implementation complete          |
| 2025-11-24 | 1.0     | Senior Developer Review notes appended |

---

## Senior Developer Review (AI)

### Reviewer

cns

### Date

2025-11-24

### Outcome

**APPROVE**

All acceptance criteria implemented with comprehensive test coverage. Code follows established patterns from Story 5.6.

### Summary

Story 5.7 implements the `checkAuthStatus()` function in the centralized API client module. The implementation correctly:

- Calls `/api/auth/login/status` endpoint using the existing `callISBAPI()` function
- Parses successful responses into `{ authenticated: true, user: UserData }` format
- Handles 401 responses gracefully without logging errors (expected case)
- Handles network and other HTTP errors with appropriate console logging
- Exports TypeScript interfaces for type safety

### Key Findings

No issues found. Implementation is clean and follows established patterns.

### Acceptance Criteria Coverage

| AC# | Description            | Status      | Evidence                                                                 |
| --- | ---------------------- | ----------- | ------------------------------------------------------------------------ |
| 1   | Auth Status API Call   | IMPLEMENTED | `api-client.ts:134` - calls `/api/auth/login/status` via callISBAPI      |
| 2   | Response Parsing       | IMPLEMENTED | `api-client.ts:136-141` - parses JSON, returns typed result              |
| 3   | 401 Response Handling  | IMPLEMENTED | `api-client.ts:142-144` - returns `{ authenticated: false }`             |
| 4   | Network Error Handling | IMPLEMENTED | `api-client.ts:150-153` - logs error, returns `{ authenticated: false }` |
| 5   | TypeScript Type Safety | IMPLEMENTED | `api-client.ts:24-45` - UserData and AuthStatusResult interfaces         |

**Summary: 5 of 5 acceptance criteria fully implemented**

### Task Completion Validation

| Task                          | Marked As | Verified As | Evidence                              |
| ----------------------------- | --------- | ----------- | ------------------------------------- |
| 1.1 Add checkAuthStatus()     | Complete  | VERIFIED    | `api-client.ts:132`                   |
| 1.2 Call API endpoint         | Complete  | VERIFIED    | `api-client.ts:134`                   |
| 1.3 Parse JSON response       | Complete  | VERIFIED    | `api-client.ts:137`                   |
| 1.4 Return typed result       | Complete  | VERIFIED    | `api-client.ts:138-141`               |
| 2.1 Create UserData interface | Complete  | VERIFIED    | `api-client.ts:24-33`                 |
| 2.2 Create AuthStatusResult   | Complete  | VERIFIED    | `api-client.ts:40-45`                 |
| 2.3 Add JSDoc documentation   | Complete  | VERIFIED    | `api-client.ts:19-23, 35-39, 105-130` |
| 3.1 Handle 401 response       | Complete  | VERIFIED    | `api-client.ts:142-144`               |
| 3.2 Handle other HTTP errors  | Complete  | VERIFIED    | `api-client.ts:145-148`               |
| 3.3 Handle network errors     | Complete  | VERIFIED    | `api-client.ts:150-153`               |
| 4.1 Test 200 OK               | Complete  | VERIFIED    | `api-client.test.ts:326-350`          |
| 4.2 Test 401                  | Complete  | VERIFIED    | `api-client.test.ts:354-364`          |
| 4.3 Test network error        | Complete  | VERIFIED    | `api-client.test.ts:379-389`          |
| 4.4 Test 500 error            | Complete  | VERIFIED    | `api-client.test.ts:403-413`          |
| 4.5 Test TypeScript types     | Complete  | VERIFIED    | `api-client.test.ts:427-453`          |
| 5.1 Export checkAuthStatus    | Complete  | VERIFIED    | `api-client.ts:132` (export keyword)  |
| 5.2 Add JSDoc examples        | Complete  | VERIFIED    | `api-client.ts:115-129`               |
| 5.3 Rebuild bundle            | Complete  | VERIFIED    | Build passes, tests run               |

**Summary: 17 of 17 tasks verified complete, 0 questionable, 0 false completions**

### Test Coverage and Gaps

**Tests Present:**

- AC #1: 2 tests (endpoint verification, Authorization header)
- AC #2: 2 tests (return structure, user data fields)
- AC #3: 2 tests (401 returns false, no error logging)
- AC #4: 4 tests (network error, 500 error, logging verification)
- AC #5: 2 tests (type verification, interface shape)
- Edge cases: 2 tests (missing token, multiple roles)

**Test Results:** 33 tests passed (14 new for Story 5.7)

**Gaps:** None identified

### Architectural Alignment

- Follows ADR-021 (Centralized API client with authentication interceptor)
- Reuses `callISBAPI()` as required - no duplicated Authorization header logic
- Consistent error handling pattern with existing codebase
- Types exported for downstream consumers

### Security Notes

- No sensitive data exposure (token handled internally)
- Proper error handling prevents information leakage
- Console logging uses prefixed format for debugging

### Best-Practices and References

- Follows TypeScript best practices for interface design
- Comprehensive JSDoc documentation with usage examples
- Defensive programming (handles missing sessionStorage, empty tokens)
- Test organization follows existing patterns

### Action Items

**Code Changes Required:**
None - implementation complete and approved.

**Advisory Notes:**

- Note: Story 5.8 will build on checkAuthStatus() for 401 handling
- Note: Consider caching auth status to reduce API calls in future iterations
