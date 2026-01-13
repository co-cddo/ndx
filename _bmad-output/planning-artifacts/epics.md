---
stepsCompleted: ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
status: "complete"
completedAt: "2026-01-13"
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
---

# ndx - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ndx, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Account Registration:**
- FR1: User can enter their government email address to initiate signup
- FR2: User can see their domain recognised from the allowlist
- FR3: User can submit signup request for a valid domain
- FR4: User can receive account creation confirmation email
- FR5: User can set their password via email link
- FR6: User is automatically logged in after password setup
- FR7: User is returned to their original page after completing signup

**Authentication Integration:**
- FR8: User can choose between "Sign in" and "Create account" when authentication is required
- FR9: Existing user attempting signup is redirected to login with friendly message
- FR10: User's intended destination is preserved across the authentication flow
- FR11: Signup page is never stored as a return destination

**Domain Management:**
- FR12: System can fetch allowed domains from authoritative source
- FR13: System can validate user email against domain allowlist
- FR14: User with unlisted domain can see clear messaging with contact path
- FR15: System can cache domain list to reduce external dependencies

**Security & Protection:**
- FR16: System can normalise email addresses (strip `+` suffix) before processing
- FR17: System can detect and prevent CSRF attacks on signup submission
- FR18: System can rate limit signup requests per IP address
- FR19: System can reject requests without required security headers
- FR20: Lambda can only access the specific IAM Identity Center group and store

**Operational Visibility:**
- FR21: Admin can receive Slack notification for every account creation
- FR22: Admin can view signup events in CloudWatch logs
- FR23: Admin can access WAF logs for security investigation
- FR24: Admin can delete accounts via IAM Identity Center console

**Content & Compliance:**
- FR25: User can view privacy policy explaining data handling
- FR26: User can view cookies/storage policy explaining browser data usage
- FR27: User can access privacy and cookies pages from site footer
- FR28: Signup form links to privacy policy
- FR29: All signup pages meet WCAG 2.2 AA accessibility standards

### NonFunctional Requirements

**Performance:**
- NFR1: Signup form page loads within 2 seconds
- NFR2: Domain list API responds within 500ms
- NFR3: Signup submission API responds within 3 seconds
- NFR4: End-to-end signup flow completes within 2 minutes (including email)

**Security:**
- NFR5: All data encrypted in transit (TLS 1.2+)
- NFR6: Email addresses normalised before storage (strip `+` suffix)
- NFR7: CSRF protection via custom header on all POST requests
- NFR8: Rate limiting: max 1 request/minute/IP on signup endpoint
- NFR9: Lambda IAM permissions scoped to specific group ID and identity store ID
- NFR10: CloudFront OAC with SigV4 for Lambda invocation
- NFR11: Strict CORS: only exact origin allowed
- NFR12: Domain cache TTL: 5 minutes maximum

**Accessibility:**
- NFR13: All pages meet WCAG 2.2 AA success criteria
- NFR14: All forms keyboard-navigable
- NFR15: Error messages associated with form fields via ARIA
- NFR16: Colour contrast meets 4.5:1 ratio minimum

**Integration:**
- NFR17: IAM Identity Center API calls use SDK with retry logic
- NFR18: GitHub JSON fetch fails gracefully (use cached data if available)
- NFR19: EventBridge events delivered within 60 seconds of account creation
- NFR20: Slack notifications include: email, domain, timestamp

**Reliability:**
- NFR21: System remains operational if GitHub is unavailable (cached domains)
- NFR22: Failed API calls logged with correlation ID
- NFR23: Lambda cold start acceptable (no provisioned concurrency needed)

### Additional Requirements

**From Architecture:**
- Brownfield extension - no starter template needed
- Lambda deployed in `infra-signup/` directory (ISB account 955063685555)
- CloudFront `/signup-api/*` behaviour must be ordered before `/api/*`
- EventBridge rule for CreateUser events → SNS → existing Chatbot config
- Shared types via tsconfig paths (`@ndx/signup-types`) between client and Lambda
- GOV.UK Design System mandatory (regulatory compliance)
- 12 ADRs (040-052) govern implementation decisions
- 16-file structure: client (5), Lambda (4), infrastructure (5), tests (2)
- Deployment sequence: Lambda → CloudFront → Static assets
- Manual step: Add SNS topic ARN to existing Chatbot Slack channel

**From UX Design:**
- Split email input: local part text field + "@" + domain dropdown
- Auth choice modal extends existing AUPModal component
- Success page (`/signup/success`) with numbered next steps and AWS handoff messaging
- Domain dropdown with ~340 LA domains (may need accessible autocomplete)
- Inline "domain not listed?" message with contact link (not buried)
- Error summary at top of form + inline field errors (GOV.UK pattern)
- Button loading state: "Continue" → "Creating account..." → "Continue"
- Mobile responsive: split email stacks vertically on small screens
- Two-thirds width form layout on desktop

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | User can enter government email to initiate signup |
| FR2 | Epic 1 | User can see domain recognised from allowlist |
| FR3 | Epic 1 | User can submit signup request for valid domain |
| FR4 | Epic 1 | User can receive account creation confirmation email |
| FR5 | Epic 2 | User can set password via email link |
| FR6 | Epic 2 | User is automatically logged in after password setup |
| FR7 | Epic 2 | User is returned to original page after signup |
| FR8 | Epic 2 | User can choose between "Sign in" and "Create account" |
| FR9 | Epic 2 | Existing user redirected to login with friendly message |
| FR10 | Epic 2 | User's intended destination preserved across auth flow |
| FR11 | Epic 2 | Signup page never stored as return destination |
| FR12 | Epic 1 | System can fetch allowed domains from authoritative source |
| FR13 | Epic 1 | System can validate email against domain allowlist |
| FR14 | Epic 1 | User with unlisted domain sees clear messaging with contact path |
| FR15 | Epic 1 | System can cache domain list to reduce dependencies |
| FR16 | Epic 1 | System can normalise email addresses (strip `+` suffix) |
| FR17 | Epic 1 | System can detect and prevent CSRF attacks |
| FR18 | Epic 3 | System can rate limit signup requests per IP |
| FR19 | Epic 1 | System can reject requests without required security headers |
| FR20 | Epic 1 | Lambda can only access specific IAM IDC group and store |
| FR21 | Epic 3 | Admin can receive Slack notification for every account creation |
| FR22 | Epic 3 | Admin can view signup events in CloudWatch logs |
| FR23 | Epic 3 | Admin can access WAF logs for security investigation |
| FR24 | Epic 3 | Admin can delete accounts via IAM IDC console |
| FR25 | Epic 4 | User can view privacy policy explaining data handling |
| FR26 | Epic 4 | User can view cookies/storage policy |
| FR27 | Epic 4 | User can access privacy and cookies pages from footer |
| FR28 | Epic 4 | Signup form links to privacy policy |
| FR29 | Epic 1-4 | All signup pages meet WCAG 2.2 AA (built-in + final audit) |

## Epic List

### Epic 1: Account Creation
Users can create an NDX account through an accessible signup form and receive their password setup email from AWS.

**Delivers:**
- Lambda infrastructure (`infra-signup/` stack in ISB account)
- Domain list API with 5-min caching (GitHub JSON source)
- Signup API with email normalization
- Signup form page with split email input and domain dropdown
- Success page with AWS handoff messaging
- Unlisted domain fallback with contact path
- Core security (CSRF header, scoped IAM, OAC)
- WCAG 2.2 AA compliance for signup form and success page

**FRs covered:** FR1, FR2, FR3, FR4, FR12, FR13, FR14, FR15, FR16, FR17, FR19, FR20, FR29 (partial)

---

### Epic 2: Seamless Authentication Integration
Users experience seamless, accessible authentication - existing users redirect to login, new users return to their original page after completing signup.

**Delivers:**
- Auth choice modal extension ("Sign in" / "Create account")
- Existing user detection with silent redirect to login
- Return URL preservation across full AWS flow
- Auto-login after password setup
- Signup page blocklist (never stored as return destination)
- WCAG 2.2 AA compliance for auth modal

**FRs covered:** FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR29 (partial)

---

### Epic 3: Operational Monitoring & Abuse Protection
Admins can monitor all signups via Slack and investigate suspicious activity.

**Delivers:**
- EventBridge rule → SNS → existing Chatbot Slack alerts
- CloudWatch logging with correlation IDs
- WAF rate limiting (1 req/min/IP)
- WAF logs access for security investigation
- Admin account deletion via IAM IDC console (native AWS capability)

**FRs covered:** FR18, FR21, FR22, FR23, FR24

---

### Epic 4: Compliance Pages & Final Accessibility Audit
Users can understand how their data is handled via accessible policy pages; final audit confirms all signup pages meet WCAG 2.2 AA.

**Delivers:**
- Privacy policy page (`/privacy`) - accessible
- Cookies/storage page (`/cookies`) - accessible
- Footer links across site
- Signup form links to privacy policy
- Final WCAG 2.2 AA audit across all signup pages

**FRs covered:** FR25, FR26, FR27, FR28, FR29 (final verification)

---

## Epic 1: Account Creation

Users can create an NDX account through an accessible signup form and receive their password setup email from AWS.

### Story 1.1: Project Scaffold & Shared Types

As a **developer**,
I want **the signup feature directories and shared TypeScript types established**,
So that **all subsequent stories have a consistent foundation to build upon**.

**Acceptance Criteria:**

**Given** the NDX repository exists
**When** the scaffold is complete
**Then** the following directories exist:
- `src/signup/`
- `infra-signup/bin/`
- `infra-signup/lib/lambda/signup/`
- `tests/e2e/`

**Given** the directories are created
**When** I check `src/signup/types.ts`
**Then** it contains TypeScript interfaces for:
- `SignupRequest` (firstName, lastName, email, domain)
- `SignupResponse` (success, redirectUrl)
- `DomainInfo` (domain, orgName)
- `ApiError` (error code enum, message)

**Given** the types file exists
**When** I check `infra-signup/tsconfig.json`
**Then** it includes path mapping `@ndx/signup-types` → `../src/signup/types.ts`

**Given** all files are created
**When** I run TypeScript compilation
**Then** there are no type errors

---

### Story 1.2: Signup Lambda Infrastructure

As a **developer**,
I want **the signup Lambda deployed with CloudFront routing**,
So that **the signup API endpoints are accessible and secure**.

**Acceptance Criteria:**

**Given** the project scaffold exists (Story 1.1)
**When** I deploy `infra-signup/` CDK stack to ISB account (955063685555)
**Then** a Lambda function `ndx-signup` is created with Node.js 20.x runtime

**Given** the Lambda is deployed
**When** I check CloudFront distribution
**Then** behaviour `/signup-api/*` routes to the Lambda with OAC (SigV4)
**And** this behaviour is ordered before `/api/*`

**Given** the Lambda IAM role
**When** I check its permissions
**Then** `sso-directory:CreateUser` is scoped to the specific identity store ID
**And** `sso-directory:CreateGroupMembership` is scoped to the specific group ID
**And** no wildcard permissions exist (FR20)

**Given** the Lambda is deployed
**When** I call `GET /signup-api/health`
**Then** I receive a 200 response (basic health check)

---

### Story 1.3: Domain List API

As a **government user**,
I want **to see my organisation's domain in a list of allowed domains**,
So that **I know my council is eligible to sign up** (FR2, FR12, FR13, FR15).

**Acceptance Criteria:**

**Given** the Lambda infrastructure exists (Story 1.2)
**When** I call `GET /signup-api/domains`
**Then** I receive a JSON response with `{ domains: [{ domain, orgName }] }`
**And** the response includes ~340 English LA domains

**Given** the domains endpoint is called
**When** GitHub JSON source is available
**Then** the response is returned within 500ms (NFR2)
**And** the domain list is cached in Lambda memory

**Given** the domains are cached
**When** I call the endpoint again within 5 minutes
**Then** the cached data is returned without fetching GitHub
**And** the cache TTL is maximum 5 minutes (NFR12)

**Given** GitHub is unavailable
**When** cached data exists
**Then** the stale cached data is returned (NFR18, NFR21)
**And** an error is logged with correlation ID (NFR22)

**Given** GitHub is unavailable
**When** no cached data exists
**Then** a 503 error is returned with message "Service temporarily unavailable"

---

### Story 1.4: Signup API Core

As a **government user**,
I want **to submit my details and have an account created in AWS IAM Identity Center**,
So that **I receive a password setup email and can access NDX** (FR1, FR3, FR4, FR16, FR17, FR19).

**Acceptance Criteria:**

**Given** valid signup data (firstName, lastName, email, domain)
**When** I POST to `/signup-api/signup` with CSRF header `X-NDX-Request: signup-form`
**Then** an account is created in IAM Identity Center
**And** the user is added to the NDX users group
**And** IAM IDC sends a password setup email (FR4)
**And** I receive `{ success: true }` with 200 status

**Given** an email with `+` suffix (e.g., `sarah+test@westbury.gov.uk`)
**When** I submit the signup request
**Then** the email is normalised to `sarah@westbury.gov.uk` before processing (FR16, NFR6)

**Given** a request without the `X-NDX-Request` header
**When** I POST to `/signup-api/signup`
**Then** I receive 403 with `{ error: "CSRF_INVALID", message: "Invalid request" }` (FR17)

**Given** a request without `Content-Type: application/json`
**When** I POST to `/signup-api/signup`
**Then** I receive 400 with `{ error: "INVALID_CONTENT_TYPE" }` (FR19)

**Given** an email with a domain not in the allowlist
**When** I POST to `/signup-api/signup`
**Then** I receive 403 with `{ error: "DOMAIN_NOT_ALLOWED", message: "Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access." }`

**Given** valid signup data
**When** the signup API responds
**Then** the response time is under 3 seconds (NFR3)
**And** structured JSON logs are written with correlation ID (NFR22)
**And** PII is not logged in error paths

---

### Story 1.5: Signup Form Page

As a **government user**,
I want **to fill in a simple signup form with my name and email**,
So that **I can create my NDX account quickly** (FR1, FR2, FR3, FR14, FR29).

**Acceptance Criteria:**

**Given** I navigate to `/signup`
**When** the page loads
**Then** I see a GOV.UK styled form with:
- First name text input
- Last name text input
- Email local part text input + "@" + domain dropdown
- Green "Continue" button
**And** the page loads within 2 seconds (NFR1)

**Given** the form is displayed
**When** I focus on the domain dropdown
**Then** I can search/filter through ~340 LA domains
**And** each option shows the organisation name (FR2)

**Given** I select a domain
**When** I view the dropdown
**Then** it displays "westbury.gov.uk - Westbury District Council" format

**Given** the form has empty required fields
**When** I click "Continue"
**Then** an error summary appears at the top with links to each invalid field
**And** inline error messages appear below each invalid field (NFR15)
**And** focus moves to the error summary

**Given** the form is displayed
**When** I navigate using only keyboard
**Then** I can complete and submit the form (NFR14)
**And** focus indicators are visible (3px yellow outline)
**And** the page meets WCAG 2.2 AA (NFR13)

**Given** I submit valid data
**When** the request is processing
**Then** the button text changes to "Creating account..."
**And** the button is disabled

**Given** I submit and an API error occurs
**When** the error response is received
**Then** the error message is displayed in the GOV.UK error summary
**And** the button returns to "Continue" and is re-enabled

---

### Story 1.6: Success Page & Unlisted Domain Handling

As a **government user**,
I want **clear confirmation that my account was created and instructions for next steps**,
So that **I know to check my email for the AWS password setup link** (FR4, FR14, FR29).

**Acceptance Criteria:**

**Given** I successfully submit the signup form
**When** the account is created
**Then** I am redirected to `/signup/success`
**And** I see a GOV.UK green confirmation panel with "Account created"

**Given** I am on the success page
**When** I read the content
**Then** I see numbered next steps:
1. "Check your email for a message from AWS"
2. "Click the link to set your password"
3. "You'll be signed in and returned to NDX"
**And** the page explicitly mentions AWS sends the email (UX requirement)

**Given** I am on the signup form
**When** my domain is not in the dropdown
**Then** I see an inline message: "Domain not listed? Contact ndx@dsit.gov.uk to request access." (FR14)
**And** the message uses `govuk-inset-text` styling

**Given** I am on the success page
**When** I navigate using only keyboard
**Then** the page is fully accessible (NFR14)
**And** the page meets WCAG 2.2 AA (NFR13)

---

## Epic 2: Seamless Authentication Integration

Users experience seamless, accessible authentication - existing users redirect to login, new users return to their original page after completing signup.

### Story 2.1: Auth Choice Modal

As an **government user**,
I want **to choose between signing in or creating an account when authentication is required**,
So that **I have a clear path whether I'm new or returning** (FR8, FR29).

**Acceptance Criteria:**

**Given** I click "Try" on a product page without being logged in
**When** the auth modal appears
**Then** I see two equally-weighted buttons: "Sign in" and "Create account"
**And** the modal uses GOV.UK styling consistent with existing NDX modals

**Given** the auth modal is displayed
**When** I click "Sign in"
**Then** I am redirected to the existing login page
**And** my return URL is preserved

**Given** the auth modal is displayed
**When** I click "Create account"
**Then** I am redirected to `/signup`
**And** my return URL is preserved in sessionStorage

**Given** the auth modal is displayed
**When** I press Escape or click outside the modal
**Then** the modal closes
**And** I remain on the current page

**Given** the auth modal is displayed
**When** I navigate using only keyboard
**Then** focus is trapped within the modal (Tab cycles through elements)
**And** focus indicators are visible (3px yellow outline)
**And** the modal meets WCAG 2.2 AA (NFR13)

**Given** the auth modal is displayed
**When** I use a screen reader
**Then** the modal has `role="dialog"` and `aria-modal="true"`
**And** the modal title is announced

---

### Story 2.2: Return URL Preservation

As a **government user**,
I want **to return to my original page after completing signup**,
So that **I can immediately try the product I was interested in** (FR7, FR10, FR11).

**Acceptance Criteria:**

**Given** I click "Create account" from the auth modal on `/products/bedrock`
**When** I am redirected to `/signup`
**Then** the return URL `/products/bedrock` is stored in sessionStorage

**Given** I navigate directly to `/signup` without a return URL
**When** I complete signup
**Then** I am returned to the homepage `/`

**Given** I am on `/signup` (the signup page itself)
**When** the system checks for return URL storage
**Then** `/signup` is never stored as a return destination (FR11)
**And** `/signup/success` is never stored as a return destination

**Given** I complete the AWS password setup flow
**When** AWS redirects me back to NDX
**Then** I land on my original return URL (e.g., `/products/bedrock`)
**And** I am logged in
**And** the "Try" button is now active

**Given** a malicious return URL is attempted (e.g., external domain)
**When** the system validates the return URL
**Then** the URL is rejected
**And** I am redirected to the homepage instead

**Given** the return URL contains the signup flow pages
**When** the blocklist is checked
**Then** URLs matching `/signup`, `/signup/success` are blocked (ADR-042)

---

### Story 2.3: Existing User Detection & Redirect

As an **existing government user who forgot they have an account**,
I want **to be seamlessly redirected to login instead of seeing an error**,
So that **I can access NDX without confusion** (FR9).

**Acceptance Criteria:**

**Given** I submit the signup form with an email that already exists in IAM Identity Center
**When** the Lambda processes the request
**Then** I receive a response with `{ error: "USER_EXISTS", redirectUrl: "/login?returnUrl=..." }`
**And** the HTTP status is 409 (Conflict)

**Given** the frontend receives a USER_EXISTS response
**When** processing the response
**Then** I am automatically redirected to the login page
**And** no error message is displayed to me
**And** the experience feels seamless (silent redirect per ADR-040)

**Given** I am redirected to login due to existing account
**When** I view the login page
**Then** I see a subtle message: "Welcome back - please sign in"
**And** my return URL is preserved in the redirect

**Given** I log in successfully after being redirected
**When** the login completes
**Then** I am returned to my original intended page
**And** I can proceed with my task (e.g., try a sandbox)

**Given** the Lambda checks for existing users
**When** the email is normalised (stripped of `+` suffix)
**Then** the check uses the normalised email
**And** `sarah+test@westbury.gov.uk` matches existing `sarah@westbury.gov.uk`

---

## Epic 3: Operational Monitoring & Abuse Protection

Admins can monitor all signups via Slack and investigate suspicious activity.

### Story 3.1: Slack Alerting for Signups

As an **NDX platform admin**,
I want **to receive a Slack notification for every account creation**,
So that **I have visibility into signup activity and can spot anomalies** (FR21, NFR19, NFR20).

**Acceptance Criteria:**

**Given** a user successfully creates an account via the signup Lambda
**When** IAM Identity Center CreateUser API is called
**Then** CloudTrail captures the event automatically

**Given** CloudTrail captures a CreateUser event
**When** EventBridge evaluates the event
**Then** the EventBridge rule matches events with:
- `source: aws.sso-directory`
- `eventName: CreateUser`

**Given** EventBridge matches a CreateUser event
**When** the rule triggers
**Then** a message is published to SNS topic `ndx-signup-alerts`
**And** the message is delivered within 60 seconds of account creation (NFR19)

**Given** the SNS topic receives a message
**When** the existing Chatbot subscription processes it
**Then** a Slack notification appears in the configured channel
**And** the notification includes: email, domain, timestamp (NFR20)

**Given** the SNS topic is created in ISB account (955063685555)
**When** I check the topic resource policy
**Then** it allows `chatbot.amazonaws.com` to subscribe from NDX account (568672915267)

**Given** the CDK stack is deployed
**When** I check the EventBridge rule
**Then** it targets the SNS topic with the correct event pattern

---

### Story 3.2: WAF Rate Limiting

As an **NDX platform admin**,
I want **signup requests rate-limited to 1 per minute per IP**,
So that **abuse and automated attacks are prevented** (FR18, NFR8).

**Acceptance Criteria:**

**Given** a user submits a signup request
**When** they have not made a request in the last minute from their IP
**Then** the request is allowed through to the Lambda

**Given** a user submits a signup request
**When** they have already made a request within the last minute from their IP
**Then** the request is blocked by WAF
**And** they receive a 429 response with `{ error: "RATE_LIMITED", message: "Too many requests. Please wait a moment and try again." }`

**Given** the WAF rule is configured
**When** I check CloudFront distribution
**Then** the WAF WebACL is associated with the distribution
**And** the rate limit rule applies to `/signup-api/signup` path only

**Given** rate limiting is triggered
**When** the block occurs
**Then** the event is logged in WAF logs (FR23)
**And** the log includes the blocked IP address

**Given** legitimate users from the same corporate network (shared IP)
**When** they sign up sequentially
**Then** only the first request within each minute succeeds
**And** subsequent users must wait (accepted risk per PRD)

---

### Story 3.3: Operational Runbook

As an **NDX platform admin**,
I want **documentation for investigating signups and managing accounts**,
So that **I can effectively respond to incidents and support requests** (FR22, FR23, FR24).

**Acceptance Criteria:**

**Given** an admin needs to investigate signup activity
**When** they access CloudWatch Logs
**Then** the runbook documents:
- Log group name and location
- How to filter by correlation ID
- How to search by email domain
- Sample queries for common investigations (FR22)

**Given** an admin needs to investigate suspicious activity
**When** they access WAF logs
**Then** the runbook documents:
- How to access WAF logs in S3/CloudWatch
- How to identify rate-limited IPs
- How to add IPs to block list
- Sample queries for abuse patterns (FR23)

**Given** an admin needs to delete a suspicious account
**When** they access IAM Identity Center console
**Then** the runbook documents:
- How to find user by email
- Steps to delete user account
- What happens to associated data
- When to escalate vs. self-service (FR24)

**Given** the runbook is created
**When** I check the documentation location
**Then** it exists at `docs/operations/signup-runbook.md`
**And** it includes links to relevant AWS console pages

---

## Epic 4: Compliance Pages & Final Accessibility Audit

Users can understand how their data is handled via accessible policy pages; final audit confirms all signup pages meet WCAG 2.2 AA.

### Story 4.1: Privacy Policy Page

As a **government user**,
I want **to understand how my data is collected and used**,
So that **I can make an informed decision about signing up** (FR25).

**Acceptance Criteria:**

**Given** I navigate to `/privacy`
**When** the page loads
**Then** I see a GOV.UK styled page with privacy policy content

**Given** I am viewing the privacy page
**When** I read the content
**Then** it includes:
- Data controller: GDS (Government Digital Service)
- Data collected: Email, name, sandbox activity
- Purpose: Account creation, analytics, continuous improvement, compliance
- Retention: Up to 5 years (data never anonymised)
- Contact: ndx@dsit.gov.uk

**Given** the privacy page exists
**When** search engines crawl the site
**Then** `/privacy` is indexable (not blocked by robots.txt)

**Given** I am on the privacy page
**When** I navigate using only keyboard
**Then** the page is fully accessible (NFR14)
**And** the page meets WCAG 2.2 AA (NFR13)

---

### Story 4.2: Cookies & Storage Page

As a **government user**,
I want **to understand what browser storage NDX uses**,
So that **I know my browsing is not being tracked** (FR26).

**Acceptance Criteria:**

**Given** I navigate to `/cookies`
**When** the page loads
**Then** I see a GOV.UK styled page with cookies/storage policy content

**Given** I am viewing the cookies page
**When** I read the content
**Then** it includes:
- sessionStorage explanation (return URL persistence)
- Confirmation that no tracking cookies are used
- Any essential cookies for authentication

**Given** the cookies page exists
**When** search engines crawl the site
**Then** `/cookies` is indexable (not blocked by robots.txt)

**Given** I am on the cookies page
**When** I navigate using only keyboard
**Then** the page is fully accessible (NFR14)
**And** the page meets WCAG 2.2 AA (NFR13)

---

### Story 4.3: Policy Links Integration

As a **government user**,
I want **easy access to privacy and cookies policies from anywhere on the site**,
So that **I can find this information when I need it** (FR27, FR28).

**Acceptance Criteria:**

**Given** I am on any page of the NDX site
**When** I scroll to the footer
**Then** I see links to "Privacy" and "Cookies"
**And** the links navigate to `/privacy` and `/cookies` respectively

**Given** I am on the signup form (`/signup`)
**When** I view the form
**Then** I see a link to the privacy policy near the submit button
**And** the link text follows GOV.UK patterns (e.g., "Read our privacy policy")

**Given** the footer links are added
**When** I check existing pages (homepage, product pages)
**Then** the privacy and cookies links appear consistently

**Given** I click a footer policy link
**When** the page loads
**Then** the navigation is smooth (no broken links)
**And** I can easily return to my previous page

---

### Story 4.4: Final WCAG 2.2 AA Audit

As an **NDX platform owner**,
I want **verification that all signup pages meet accessibility standards**,
So that **we comply with Public Sector Bodies Accessibility Regulations** (FR29).

**Acceptance Criteria:**

**Given** all signup feature pages are complete
**When** I run automated accessibility tests (axe-core)
**Then** the following pages pass with no critical or serious issues:
- `/signup`
- `/signup/success`
- `/privacy`
- `/cookies`
- Auth choice modal

**Given** automated tests pass
**When** manual keyboard testing is performed
**Then** all pages are fully navigable using only keyboard
**And** focus order is logical
**And** focus indicators are visible (3px yellow outline)

**Given** keyboard testing passes
**When** screen reader testing is performed (VoiceOver, NVDA)
**Then** all content is announced correctly
**And** form labels are associated with inputs
**And** error messages are announced when they appear
**And** modal announces its role and title

**Given** all testing passes
**When** I check colour contrast
**Then** all text meets 4.5:1 ratio minimum (NFR16)
**And** GOV.UK colour palette is used throughout

**Given** all accessibility tests pass
**When** I review the test results
**Then** a summary report is created documenting:
- Pages tested
- Tools used (axe-core, Lighthouse, manual)
- Any known issues with justification
- Compliance statement

**Given** the audit is complete
**When** I check Playwright E2E tests
**Then** accessibility assertions are included in `tests/e2e/signup.spec.ts`
**And** tests run as part of CI pipeline
