# ADR-045: CSRF Protection via Custom Header

## Status
Accepted

## Context
The signup form submits data via POST to the Lambda. Without CSRF protection, malicious sites could trick users into creating accounts or submitting requests.

## Decision
1. **Custom header requirement**: All POST requests to `/signup-api/signup` must include `X-NDX-Request: signup-form`
2. **Header validation**: Lambda rejects requests without the correct header with 403 CSRF_INVALID
3. **No CSRF tokens**: Custom headers provide equivalent protection because browsers don't send custom headers in cross-origin requests without CORS pre-flight

## Consequences
- **Security**: Cross-site form submissions are blocked (browsers don't add custom headers)
- **Simplicity**: No token generation or storage required
- **Client requirement**: Frontend must include the header in all signup requests
- **API clients**: Programmatic clients must also include the header

## Implementation
- Header check: `infra-signup/lib/lambda/signup/handler.ts` (lines 180-200)
- Frontend header: `src/signup/main.ts` includes header in fetch requests
- Error code: `SignupErrorCode.CSRF_INVALID`
