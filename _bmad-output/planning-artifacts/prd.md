---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-03-success", "step-04-journeys", "step-05-domain", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish"]
inputDocuments:
  - "_bmad-output/analysis/research-authentication-2026-01-12.md"
  - "_bmad-output/analysis/brainstorming-session-2026-01-12.md"
  - "docs/infrastructure-architecture.md"
  - "docs/archive/bmm-2025-11-17/prd.md"
  - "docs/archive/bmm-2025-11-17/architecture.md"
  - "docs/archive/bmm-2025-11-17/epics/epic-5-authentication-foundation.md"
  - "docs/development/authentication-state-management.md"
workflowType: "prd"
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 1
  projectDocs: 6
projectType: "brownfield"
classification:
  projectType: "web_app + api_backend"
  domain: "govtech"
  complexity: "high"
  projectContext: "brownfield"
elicitationMethods:
  - "User Persona Focus Group"
  - "Pre-mortem Analysis"
  - "Cross-Functional War Room"
  - "Red Team vs Blue Team"
  - "Architecture Decision Records"
acceptedRisks:
  - "Account enumeration (gov.uk emails semi-public)"
  - "Alert volume initially high (revisit if noisy)"
  - "Abandoned accounts remain (MFA mitigates)"
  - "Domain changes require PR (owned process)"
  - "Return URL edge cases (minimal impact)"
  - "Cross-account deployment errors (obvious failures)"
adrs:
  - id: "ADR-040"
    title: "Existing User Detection Strategy"
    decision: "Silent redirect to login"
  - id: "ADR-041"
    title: "Signup Entry Point Pattern"
    decision: "Auth choice modal"
  - id: "ADR-042"
    title: "Return URL Handling for Signup Flow"
    decision: "Extend existing pattern + blocklist"
  - id: "ADR-043"
    title: "Lambda Permission Scoping"
    decision: "Action + resource scoped (group ID + store ID)"
  - id: "ADR-044"
    title: "Domain Allowlist Caching Strategy"
    decision: "5-minute in-memory TTL"
  - id: "ADR-045"
    title: "CSRF Protection Strategy"
    decision: "Custom header requirement"
  - id: "ADR-046"
    title: "Rate Limiting Strategy"
    decision: "CloudFront WAF 1 req/min/IP"
---

# Product Requirements Document - ndx

**Author:** Cns
**Date:** 2026-01-12

## Executive Summary

Self-serve signup for NDX enabling government users to create accounts via AWS IAM Identity Center, with domain validation against ~340 English local authority domains. Removes signup friction to expand NDX reach, targeting < 2 minutes from "Create account" to sandbox access.

**Key Architecture Decisions:** ADR-040 through ADR-046 govern existing user detection (silent redirect), signup entry points (auth choice modal), return URL handling (blocklist), Lambda permissions (scoped), domain caching (5-min TTL), CSRF protection (custom header), and rate limiting (WAF 1 req/min/IP).

## Success Criteria

### User Success

**Primary Success Moment:** User clicks "Try" and gets a sandbox - that's the "aha!"

**Time-to-Value Target:** < 2 minutes from clicking "Create account" to being back on original page with full access, including email/password setup while flipping between browser and inbox.

**Journey Completion:**
- Create account → receive email → set password → auto-login → return to original page → click Try → sandbox provisioned
- Existing users seamlessly redirected to login (no confusion or error messages)
- Clear fallback path for unlisted domains ("Contact us")

### Business Success

**Coverage Target:** Remove signup friction to expand NDX reach across all English local authorities.

| Milestone | Target | Timeframe |
|-----------|--------|-----------|
| Capability | All ~340 LA domains in allowlist | Day 1 |
| Early signal | 10+ LAs with at least one signup | Month 1 |
| Traction | 50+ LAs with signups | Quarter 1 |
| Long-term | Measure adoption and iterate | Ongoing |

### Technical Success

- **Security:** All 6 MUST DO controls implemented (email normalization, CSRF, alerting, OAC, WAF, Lambda permissions audit)
- **Performance:** Signup flow completes in < 2 minutes end-to-end
- **Reliability:** Lambda handles concurrent signups without errors
- **Observability:** Every account creation visible in Slack alerts
- **Accessibility:** WCAG 2.2 AA compliance on signup form (GOV.UK Design System)
- **Architecture:** 7 ADRs (040-046) implemented as specified

### Measurable Outcomes

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first Try | < 2 minutes | Timestamp difference: form submit → Try click |
| LA coverage capability | 340 domains | Domain allowlist count |
| LA adoption (M1) | 10+ | Unique LA domains in signups |
| LA adoption (Q1) | 50+ | Unique LA domains in signups |
| Error rate | < 1% | Failed signups / total attempts |
| Security controls | 6/6 | Checklist verification |

## User Journeys

### Journey 1: Sarah's First Sandbox (New User - Success Path)

**Persona:** Sarah Chen, Digital Transformation Lead at Westbury District Council

**Opening Scene:**
Sarah's been tasked with evaluating cloud AI services for the council's new resident chatbot project. She's heard about NDX from a colleague at a regional digital meetup but hasn't used it before. It's Tuesday afternoon, she has 30 minutes before her next meeting, and she wants to quickly see what AWS Bedrock can actually do.

**Rising Action:**
She searches "NDX government cloud" and lands on the catalogue. She finds AWS Bedrock, scans the description, and clicks "Try Before You Buy." A modal appears: "Sign in" or "Create account." She doesn't have an account, so she clicks "Create account."

The signup form is simple - just her email. She enters `sarah.chen@westbury.gov.uk`, sees her domain recognised in the dropdown, and clicks submit. Her inbox pings within 30 seconds. The email is clearly from GOV.UK - she clicks the password setup link, creates a password, and is automatically logged in.

**Climax:**
She lands back on the AWS Bedrock page - exactly where she started. The "Try" button is now active. She clicks it, accepts the terms, and within a minute has a 24-hour sandbox. She's in the AWS console exploring Bedrock before her meeting starts.

**Resolution:**
Sarah sends her director a Slack message: "Got a Bedrock sandbox in under 2 minutes. Will have a recommendation by Friday." She's already planning to sign up three colleagues tomorrow.

**Requirements revealed:** Signup form, email delivery, auto-login, return URL, Try access

---

### Journey 2: Tom's Accidental Signup (Existing User - Edge Case)

**Persona:** Tom Okonkwo, IT Manager at Riverside Borough Council

**Opening Scene:**
Tom used NDX six months ago to evaluate Snowflake. He's back to try Amazon Redshift but can't remember if he has an account. He clicks "Try" on the Redshift page, sees the auth modal, and thinks "better create an account to be safe."

**Rising Action:**
He enters `tom.okonkwo@riverside.gov.uk` on the signup form and clicks submit. Instead of an error message, the page smoothly redirects him to the familiar login screen. A subtle message says "Welcome back - please sign in."

**Climax:**
Tom logs in with his existing password. He lands back on the Redshift page, clicks Try, and he's provisioning a sandbox. He never had to contact support or figure out what went wrong.

**Resolution:**
Tom doesn't even realise anything special happened. The system just worked. He thinks "NDX is pretty slick" and gets on with his evaluation.

**Requirements revealed:** Existing user detection, silent redirect, friendly messaging, return URL preservation

---

### Journey 3: James Gets Stuck (New User - Unlisted Domain)

**Persona:** James Webb, Digital Officer at newly-formed Greater Midlands Combined Authority

**Opening Scene:**
James heard about NDX from a colleague. His authority was only created 8 months ago and uses a brand new domain: `greatermidlands.gov.uk`. He's excited to try some cloud services for their new transport data platform.

**Rising Action:**
James finds the signup page and enters `james.webb@greatermidlands.gov.uk`. He looks for his domain in the dropdown but it's not there. The form shows a clear message: "Your organisation isn't registered yet."

**Climax:**
Below the message is a simple path forward: "Contact ndx@dsit.gov.uk to request access. Include your organisation name and domain." James fires off an email. It's not instant, but he knows what to do.

**Resolution:**
Two days later, James gets an email: "Your domain has been added." He completes signup in under 2 minutes and messages his colleague: "Finally in! Thanks for the recommendation."

**Requirements revealed:** Domain validation, clear error messaging, contact fallback path, domain addition process

---

### Journey 4: Marcus Monitors the Flood (Admin - Operations)

**Persona:** Marcus Thompson, NDX Platform Operations Lead

**Opening Scene:**
It's Monday morning. Marcus opens Slack and sees 47 signup notifications from the weekend. Normal volume is about 5 per day. His coffee goes cold as he starts investigating.

**Rising Action:**
Marcus scans the alerts. Most are from `birmingham.gov.uk` - a large authority. But there's also a cluster of 12 signups from `manchester.gov.uk` all within 3 minutes at 2am Sunday. That's unusual.

He checks the IAM Identity Center console. The Birmingham signups are all different people with legitimate-looking names. The Manchester cluster all have email patterns like `test1@`, `test2@`, `test3@` - someone was probing.

**Climax:**
Marcus checks the WAF logs. The Manchester attempts were all from the same IP and were rate-limited after the first one - only one account was actually created. He deletes the test account and adds the IP to the block list.

**Resolution:**
Marcus writes a brief incident note and moves on. The security controls worked. He makes a mental note to check if tiered alerting would help - 47 weekend notifications is a lot to scroll through.

**Requirements revealed:** Slack alerts, WAF rate limiting, IAM IDC console access, account deletion, WAF logs

---

### Journey Requirements Summary

| Journey | Key Capabilities Required |
|---------|--------------------------|
| Sarah (Success) | Signup form, email delivery, auto-login, return URL, Try access |
| Tom (Existing) | Existing user detection, silent redirect, friendly messaging |
| James (Unlisted) | Domain validation, clear error messaging, contact path |
| Marcus (Admin) | Slack alerts, WAF logs, IAM IDC console access, account deletion |

**Capability Areas:**

1. **Signup Flow** - Form, validation, Lambda, IAM IDC integration
2. **Auth Integration** - Existing user detection, login redirect, return URL handling
3. **Error Handling** - Unlisted domain messaging, contact fallback
4. **Operations** - Alerting, monitoring, investigation tools, account management

## Domain-Specific Requirements

### Compliance & Regulatory

**Applicable Frameworks:**
- WCAG 2.2 AA - Public Sector Bodies Accessibility Regulations
- UK GDPR - Lawful basis: legitimate interests (LIA documented internally)
- GDS Service Standard - GOV.UK design patterns, plain English
- NCSC MFA guidance - Handled by IAM Identity Center

**Data Controller:** GDS (Government Digital Service)

### Required Pages

**Privacy Policy (`/privacy`):**
- Controller: GDS
- Data collected: Email, name, sandbox activity
- Purpose: Account creation, analytics, continuous improvement, compliance
- Retention: Up to 5 years (data never anonymised)
- Contact: ndx@dsit.gov.uk
- Link from: Site footer AND signup form

**Cookies and Browser Storage (`/cookies`):**
- sessionStorage explanation (return URL persistence)
- No tracking cookies
- Link from: Site footer

### Data Handling

| Data Type | Retention | Notes |
|-----------|-----------|-------|
| Account data (email, name) | Up to 5 years | Never anonymised |
| Sandbox activity | Up to 5 years | Analytics, compliance, improvement |
| Security logs | Up to 5 years | Audit trail |

## Web App + API Specific Requirements

### Web Application

**Architecture:** Single Page Application (SPA)

**Browser Support:**
| Browser | Support Level |
|---------|---------------|
| Chrome | Primary (test target) |
| Edge | Supported |

**SEO Requirements:**
- `/privacy` - Indexable, static content
- `/cookies` - Indexable, static content
- `/signup` - No SEO needed (authenticated journey)

**Real-time:** Not required

### API Backend

**Base Path:** `/signup-api/*`

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/signup-api/domains` | Fetch allowed domain list |
| POST | `/signup-api/signup` | Create user account |

**Data Format:** JSON only

**Error Handling:**
- Standard HTTP status codes (400, 401, 403, 404, 409, 500)
- JSON error response with friendly `message` field
- Frontend displays errors via JS alerts

**Example Error Response:**
```json
{
  "error": "DOMAIN_NOT_ALLOWED",
  "message": "Your organisation isn't registered yet. Contact ndx@dsit.gov.uk to request access."
}
```

**Versioning:** Not required (internal API)

**SDK:** Not required

### CloudFront Routing

| Behaviour | Path Pattern | Origin |
|-----------|--------------|--------|
| Signup API | `/signup-api/*` | Lambda (955063685555) |
| ISB API | `/api/*` | ISB Lambda (existing) |
| Static | `/*` | S3 origin |

**Note:** `/signup-api/*` behaviour must be ordered before `/api/*` in CloudFront.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP - Remove signup friction to validate LA adoption

**Resource Requirements:** 1 developer (Lambda, CloudFront config, static pages)

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Sarah (New User) - Full signup → sandbox flow
- Tom (Existing User) - Silent redirect to login
- James (Unlisted Domain) - Clear fallback messaging
- Marcus (Admin) - Slack alerting for visibility

**Must-Have Capabilities:**
- `/signup` page with GOV.UK Design System form
- `/privacy` and `/cookies` pages
- Auth choice modal ("Sign in" / "Create account")
- Lambda: domain validation, existing user check, account creation, group membership
- CloudFront `/signup-api/*` routing with OAC
- IAM permissions scoped to specific group and identity store (ADR-043)
- Return URL handling with blocklist (ADR-042)
- Email normalization (strip `+` suffix)
- CSRF protection via custom header (ADR-045)
- WAF rate limiting 1 req/min/IP (ADR-046)
- EventBridge → Slack alerting
- ~340 LA domains in allowlist
- WCAG 2.2 AA compliance

### Post-MVP Features

**Phase 2 (Growth):**
- Tiered alerting (daily digest for normal, immediate for anomalies)
- Domain request workflow (self-service with admin approval)
- Signup analytics dashboard
- Anomaly detection on signup patterns

**Phase 3 (Vision):**
- GOV.UK One Login integration for gov.uk users
- Self-service domain verification
- Automated domain discovery from authoritative sources

### Risk Mitigation Strategy

**Technical Risks:**
- Cross-account Lambda invocation complexity → Mitigated by OAC pattern (researched)
- CSRF without session → Mitigated by custom header + strict CORS (ADR-045)

**Market Risks:**
- Low adoption despite removing friction → M1/Q1 targets provide early signal
- Wrong LA domains in allowlist → GitHub JSON is maintainable

**Resource Risks:**
- Minimal team dependency (1 developer)
- If blocked, MVP can ship without tiered alerting (accept noise initially)

## Functional Requirements

### Account Registration

- **FR1:** User can enter their government email address to initiate signup
- **FR2:** User can see their domain recognised from the allowlist
- **FR3:** User can submit signup request for a valid domain
- **FR4:** User can receive account creation confirmation email
- **FR5:** User can set their password via email link
- **FR6:** User is automatically logged in after password setup
- **FR7:** User is returned to their original page after completing signup

### Authentication Integration

- **FR8:** User can choose between "Sign in" and "Create account" when authentication is required
- **FR9:** Existing user attempting signup is redirected to login with friendly message
- **FR10:** User's intended destination is preserved across the authentication flow
- **FR11:** Signup page is never stored as a return destination

### Domain Management

- **FR12:** System can fetch allowed domains from authoritative source
- **FR13:** System can validate user email against domain allowlist
- **FR14:** User with unlisted domain can see clear messaging with contact path
- **FR15:** System can cache domain list to reduce external dependencies

### Security & Protection

- **FR16:** System can normalise email addresses (strip `+` suffix) before processing
- **FR17:** System can detect and prevent CSRF attacks on signup submission
- **FR18:** System can rate limit signup requests per IP address
- **FR19:** System can reject requests without required security headers
- **FR20:** Lambda can only access the specific IAM Identity Center group and store

### Operational Visibility

- **FR21:** Admin can receive Slack notification for every account creation
- **FR22:** Admin can view signup events in CloudWatch logs
- **FR23:** Admin can access WAF logs for security investigation
- **FR24:** Admin can delete accounts via IAM Identity Center console

### Content & Compliance

- **FR25:** User can view privacy policy explaining data handling
- **FR26:** User can view cookies/storage policy explaining browser data usage
- **FR27:** User can access privacy and cookies pages from site footer
- **FR28:** Signup form links to privacy policy
- **FR29:** All signup pages meet WCAG 2.2 AA accessibility standards

## Non-Functional Requirements

### Performance

- **NFR1:** Signup form page loads within 2 seconds
- **NFR2:** Domain list API responds within 500ms
- **NFR3:** Signup submission API responds within 3 seconds
- **NFR4:** End-to-end signup flow completes within 2 minutes (including email)

### Security

- **NFR5:** All data encrypted in transit (TLS 1.2+)
- **NFR6:** Email addresses normalised before storage (strip `+` suffix)
- **NFR7:** CSRF protection via custom header on all POST requests
- **NFR8:** Rate limiting: max 1 request/minute/IP on signup endpoint
- **NFR9:** Lambda IAM permissions scoped to specific group ID and identity store ID
- **NFR10:** CloudFront OAC with SigV4 for Lambda invocation
- **NFR11:** Strict CORS: only exact origin allowed
- **NFR12:** Domain cache TTL: 5 minutes maximum

### Accessibility

- **NFR13:** All pages meet WCAG 2.2 AA success criteria
- **NFR14:** All forms keyboard-navigable
- **NFR15:** Error messages associated with form fields via ARIA
- **NFR16:** Colour contrast meets 4.5:1 ratio minimum

### Integration

- **NFR17:** IAM Identity Center API calls use SDK with retry logic
- **NFR18:** GitHub JSON fetch fails gracefully (use cached data if available)
- **NFR19:** EventBridge events delivered within 60 seconds of account creation
- **NFR20:** Slack notifications include: email, domain, timestamp

### Reliability

- **NFR21:** System remains operational if GitHub is unavailable (cached domains)
- **NFR22:** Failed API calls logged with correlation ID
- **NFR23:** Lambda cold start acceptable (no provisioned concurrency needed)

