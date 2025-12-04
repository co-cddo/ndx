# Functional Requirements Inventory - Feature 2

## Authentication & Session Management (10 FRs)

- **FR-TRY-1:** System can detect if user is authenticated by checking sessionStorage for `isb-jwt` token
- **FR-TRY-2:** System can initiate OAuth login by redirecting to `/api/auth/login`
- **FR-TRY-3:** System can extract JWT token from URL query parameter after OAuth redirect
- **FR-TRY-4:** System can store JWT token in sessionStorage with key `isb-jwt`
- **FR-TRY-5:** System can clean up URL query parameters after extracting token
- **FR-TRY-6:** System can retrieve stored JWT token from sessionStorage for API calls
- **FR-TRY-7:** System can clear JWT token from sessionStorage on sign-out
- **FR-TRY-8:** System persists authentication across browser tabs (sessionStorage accessible)
- **FR-TRY-9:** System clears authentication on browser restart (sessionStorage does not persist)
- **FR-TRY-10:** System sends `Authorization: Bearer {token}` header with all Innovation Sandbox API requests

## User Interface - Sign In/Out (5 FRs)

- **FR-TRY-11:** System displays "Sign in" button in top-right navigation when user not authenticated
- **FR-TRY-12:** System displays "Sign out" button in top-right navigation when user authenticated
- **FR-TRY-13:** Sign in button triggers OAuth redirect to `/api/auth/login`
- **FR-TRY-14:** Sign out button clears sessionStorage and redirects to home page
- **FR-TRY-15:** System uses GOV.UK Design System button styling for sign in/out buttons

## Innovation Sandbox API Integration (9 FRs)

- **FR-TRY-16:** System can call `GET /api/auth/login/status` to check authentication status
- **FR-TRY-17:** System can parse user session data (email, displayName, userName, roles)
- **FR-TRY-18:** System can call `GET /api/leases?userEmail={email}` to retrieve user's leases
- **FR-TRY-19:** System can parse lease data (uuid, status, awsAccountId, maxSpend, totalCostAccrued, expirationDate)
- **FR-TRY-20:** System can call `GET /api/leaseTemplates` to retrieve available lease templates
- **FR-TRY-21:** System can call `GET /api/configurations` to retrieve AUP text and system configuration
- **FR-TRY-22:** System can call `POST /api/leases` with payload to request new lease
- **FR-TRY-23:** System can handle API errors (401 unauthorized, 409 max leases exceeded, 5xx server errors)
- **FR-TRY-24:** System redirects to login if API returns 401 unauthorized response

## Try Page (/try) (5 FRs)

- **FR-TRY-25:** System can render `/try` page route
- **FR-TRY-26:** System displays "Sign in to view your try sessions" message when unauthenticated
- **FR-TRY-27:** System displays "Sign in" button on /try page when unauthenticated
- **FR-TRY-28:** System fetches and displays user's leases when authenticated
- **FR-TRY-29:** System renders empty state message if user has no leases

## Try Sessions Display (8 FRs)

- **FR-TRY-30:** System displays sessions table with columns: Template Name, AWS Account ID, Expiry, Budget, Status
- **FR-TRY-31:** System formats expiry as relative time for past sessions
- **FR-TRY-32:** System formats expiry as absolute date/time for future expirations
- **FR-TRY-33:** System displays budget as "${costAccrued} / ${maxSpend}" format
- **FR-TRY-34:** System displays cost accrued to 4 decimal places
- **FR-TRY-35:** System displays status badge with color coding (Active/Pending/Expired/Terminated/Failed)
- **FR-TRY-36:** System sorts sessions by creation date (newest first)
- **FR-TRY-37:** System visually distinguishes active sessions from expired/terminated

## Active Session Management (4 FRs)

- **FR-TRY-38:** System displays "Launch AWS Console" button for sessions with status "Active"
- **FR-TRY-39:** Launch button opens AWS SSO portal in new tab with correct URL format
- **FR-TRY-40:** System displays remaining lease duration for active sessions
- **FR-TRY-41:** System does not show launch button for Expired/Terminated/Failed sessions

## Catalogue Integration (7 FRs)

- **FR-TRY-42:** System can parse `try` metadata field from product page YAML frontmatter
- **FR-TRY-43:** System can parse `try_id` metadata field (lease template UUID)
- **FR-TRY-44:** System adds "Try Before You Buy" tag to products with `try` metadata
- **FR-TRY-45:** System renders "Try Before You Buy" tag in catalogue listing filters
- **FR-TRY-46:** System filters catalogue by "Try Before You Buy" tag
- **FR-TRY-47:** System renders "Try this now for 24 hours" button on product pages with `try` metadata
- **FR-TRY-48:** Try button uses govukButton macro with `isStartButton: true`

## Try Button & Lease Request Modal (17 FRs)

- **FR-TRY-49:** Clicking "Try" button checks authentication status first
- **FR-TRY-50:** If unauthenticated, Try button initiates OAuth sign-in flow
- **FR-TRY-51:** If authenticated, Try button displays lease request modal overlay
- **FR-TRY-52:** Modal displays lease duration (24 hours)
- **FR-TRY-53:** Modal displays max budget ($50)
- **FR-TRY-54:** Modal fetches and displays AUP text from `/api/configurations`
- **FR-TRY-55:** Modal renders AUP text in scrollable container
- **FR-TRY-56:** Modal displays required checkbox "I accept the Acceptable Use Policy"
- **FR-TRY-57:** Continue button disabled until AUP checkbox checked
- **FR-TRY-58:** Cancel button closes modal without action
- **FR-TRY-59:** Continue button requests lease via `POST /api/leases`
- **FR-TRY-60:** System shows loading indicator during lease request
- **FR-TRY-61:** On successful lease request, system navigates to `/try` page
- **FR-TRY-62:** On error response (409 max leases), system shows JavaScript alert
- **FR-TRY-63:** On 409 error, system redirects to `/try` page after alert dismissed
- **FR-TRY-64:** On other errors, system shows JavaScript alert with error message
- **FR-TRY-65:** Modal closes on successful lease request or after error handling

## Responsive Design & Mobile Support (4 FRs)

- **FR-TRY-66:** All try-related UI elements responsive for mobile/tablet viewports (320px+ width)
- **FR-TRY-67:** Sessions table adapts to mobile (stacked cards or horizontal scroll)
- **FR-TRY-68:** Modal overlay adapts to mobile viewport
- **FR-TRY-69:** Sign in/out buttons accessible on mobile nav

## Accessibility (WCAG 2.2) (10 FRs)

- **FR-TRY-70:** All interactive elements keyboard navigable
- **FR-TRY-71:** Focus indicators visible for keyboard navigation
- **FR-TRY-72:** Modal can be closed with Escape key
- **FR-TRY-73:** Modal traps focus (tab cycles through modal elements only)
- **FR-TRY-74:** Screen reader announces session status (ARIA labels)
- **FR-TRY-75:** Screen reader announces budget status (ARIA labels)
- **FR-TRY-76:** Color contrast ratios meet WCAG 2.2 AA standards
- **FR-TRY-77:** Status badges use both color AND text (not color-only)
- **FR-TRY-78:** Form labels associated with inputs (checkbox for AUP)
- **FR-TRY-79:** Error messages announced to screen readers (ARIA live regions)

**Total:** 79 Functional Requirements for Feature 2

---
