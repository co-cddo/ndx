---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "docs/index.md"
  - "docs/component-inventory.md"
---

# UX Design Specification ndx

**Author:** Cns
**Date:** 2026-01-13

---

## Executive Summary

### Project Vision

Self-serve signup for NDX enabling government users to create accounts via AWS IAM Identity Center, with domain validation against ~340 English local authority domains. The goal is to remove signup friction and achieve < 2 minutes from "Create account" to sandbox access, expanding NDX reach across local government.

### Target Users

| User Type | Representative | Context | Primary Goal |
|-----------|---------------|---------|--------------|
| **New User** | Sarah Chen, Digital Transformation Lead | Has 30 minutes, wants to evaluate cloud AI | Quick signup → sandbox access |
| **Returning User** | Tom Okonkwo, IT Manager | Forgot he has account, tries to re-signup | Seamless redirect to login |
| **Unlisted Domain** | James Webb, Digital Officer | New authority, domain not yet registered | Clear path to request access |
| **Admin** | Marcus Thompson, Ops Lead | Monitors platform health | Visibility into all signups |

### Key Design Challenges

1. **Minimal friction signup** - Single-field form that feels trustworthy and official while meeting GOV.UK standards
2. **Graceful edge cases** - Existing users redirected without confusion; unlisted domains get clear, non-frustrating path forward
3. **Return URL preservation** - User lands back exactly where they started after completing the full signup flow
4. **GOV.UK consistency** - Must feel like native GOV.UK service, not a bolted-on third-party experience

### Design Opportunities

1. **Speed as delight** - Sub-2-minute signup could genuinely surprise government users accustomed to slow procurement processes
2. **Domain recognition** - Displaying organisation name (e.g., "Westbury District Council") when user enters email creates immediate trust and validation
3. **Seamless existing user handling** - Silent redirect for existing users feels almost magical - no error, no friction, just works

## Core User Experience

### Defining Experience

Three-field signup: email, domain (dropdown), and name. User submits, Lambda creates account in AWS IAM Identity Center, which sends password setup email. AWS handles password UX. User returns to NDX after completing AWS flow. Target: < 2 minutes end-to-end.

### Platform Strategy

| Aspect | Decision |
|--------|----------|
| Platform | Web only (GOV.UK Eleventy static site) |
| Input method | Keyboard-primary (form input) |
| Browser support | Chrome (primary), Edge (supported) |
| Offline | Not required |
| Device | Desktop-first, mobile-responsive |

### Effortless Interactions

- **Domain selection** - Dropdown with ~340 LA domains, searchable/filterable
- **Existing user redirect** - No error, silent redirect to login
- **Return navigation** - After AWS password setup, lands back on original NDX page
- **Clear handoff** - User knows they're going to AWS for password, not confused

### Critical Success Moments

| Moment | Success | Failure |
|--------|---------|---------|
| Form submit | Clear confirmation, "check your email" | Unclear what happens next |
| Domain selection | Easy to find their council | Scrolling through 340 options |
| AWS handoff | User understands the email is from AWS | Confused by AWS branding |
| Return to NDX | Back on original page, Try button works | Lost, starts over |

### Experience Principles

1. **Three fields, one click** - Email, domain dropdown, name. Nothing else.
2. **Clear handoff messaging** - User knows AWS sends the email, not NDX.
3. **No dead ends** - Every path leads somewhere useful.
4. **Trust the return** - User confident they'll land back where they started.

## Desired Emotional Response

### Primary Emotional Goals

**"That was surprisingly easy."** - Government users expect friction. When signup completes in < 2 minutes and they're trying sandboxes, the dominant feeling is pleasant surprise at efficiency.

### Emotional Journey Mapping

| Stage | Desired Feeling | Design Implication |
|-------|-----------------|-------------------|
| Auth modal appears | Clarity | Two clear options: Sign in / Create account |
| Signup form | Confidence | GOV.UK styling = official and safe |
| Domain dropdown | Recognition | "They know my council exists" |
| Form submit | Certainty | Clear "done" state, explicit next step |
| AWS email arrives | Trust | Messaging prepared them for AWS branding |
| Return to NDX | Accomplishment | Back where started, Try button works |

### Micro-Emotions

| Target | Avoid |
|--------|-------|
| Confidence - "I know what to do" | Confusion - "Who sent this email?" |
| Trust - "This is official GOV.UK" | Skepticism - "Is this legit?" |
| Accomplishment - "I did it" | Frustration - "Where did my page go?" |
| Recognition - "They know my org" | Anonymity - "Generic government form" |

### Emotional Design Principles

1. **Prepare for handoff** - Explicitly tell users AWS sends the password email
2. **GOV.UK trust signals** - Standard styling, crown logo, familiar patterns
3. **Celebrate completion** - Clear success state before and after AWS flow
4. **Preserve context** - Return URL ensures continuity, not disorientation

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

| Product | Strength | Key Pattern |
|---------|----------|-------------|
| GOV.UK Services | Progressive disclosure, one thing per page | Green "Continue", clear errors, summary pages |
| Existing NDX Try | Auth modal, focus trap, return URL | Modal for auth choice, consistent styling |
| Slack Signup | Email-first, domain recognition | Show organisation name on detection |

### Transferable UX Patterns

- **Domain recognition display** (Slack) - Show organisation name when domain selected
- **Auth choice modal** (NDX) - Reuse existing pattern for "Sign in" / "Create account"
- **Success + explicit next step** (GOV.UK) - "We've sent you an email" with AWS mention
- **GOV.UK form styling** - Standard inputs, error summary, hint text

### Anti-Patterns to Avoid

- Password field on signup (AWS handles this)
- Organisation picker before email (domain tells us org)
- Generic success message (must prepare for AWS email)
- Hidden fallback path (unlisted domain contact must be visible)

### Design Inspiration Strategy

**Adopt:** GOV.UK form patterns, existing NDX auth modal, standard green button
**Adapt:** Slack's domain recognition → dropdown with org name display
**Avoid:** Any pattern that duplicates what AWS Identity Center handles

## Design System Foundation

### Design System Choice

**GOV.UK Design System** via `@x-govuk/govuk-eleventy-plugin 8.3.0`

Mandatory for UK government services. Already implemented across NDX.

### Rationale for Selection

- **Regulatory:** Public Sector Bodies Accessibility Regulations
- **Standards:** GDS Service Standard compliance
- **Trust:** Users recognise and trust GOV.UK styling
- **Existing:** Already in use - no migration needed

### Implementation Approach

- Use standard GOV.UK form components (`govuk-input`, `govuk-select`, `govuk-button`)
- Extend existing NDX patterns (auth modal, focus trap)
- Standard error handling (summary + inline)
- GOV.UK panel for success state

### Customization Strategy

| Element | Approach |
|---------|----------|
| Domain dropdown | `govuk-select` with autocomplete enhancement if 340 options causes usability issues |
| Auth modal | Extend existing AUPModal pattern |
| Success page | GOV.UK panel component |
| Error states | Standard error summary pattern |

## Defining Experience

### Core Interaction

"Enter your name, type your email prefix, pick your domain → you're in"

Four fields, one click, account created. AWS handles password. User returns to try sandboxes.

### User Mental Model

Users expect: slow forms, multiple pages, delayed emails, complex passwords.
We deliver: 30-second form, instant email, AWS handles password, back to original page.

### Success Criteria

| Criteria | Target |
|----------|--------|
| Form completion | < 30 seconds |
| Email arrival | < 60 seconds |
| Total flow | < 2 minutes |
| User feeling | "That was it?" |

### Pattern Analysis

All established GOV.UK patterns. No novel UX required.
- Standard text inputs for name fields
- Split email: text input + domain dropdown
- GOV.UK panel for success
- Clear handoff messaging to AWS

### Experience Mechanics

**Form Fields:**
1. First name (text input)
2. Last name (text input)
3. Email local part (text input) @ Domain (dropdown with ~340 LA domains)

**Initiation:** Auth modal → "Create account" → `/signup` page

**Interaction:** Four fields + Continue button

**Feedback:** Inline validation, error summary if needed

**Completion:** Success panel explaining AWS sends the password email

## Visual Design Foundation

### Color System

GOV.UK colour palette (mandated). No custom colours.

| Purpose | Token | Hex |
|---------|-------|-----|
| Links | `govuk-colour("blue")` | #1d70b8 |
| Success/Buttons | `govuk-colour("green")` | #00703c |
| Errors | `govuk-colour("red")` | #d4351c |
| Focus | `govuk-colour("yellow")` | #ffdd00 |
| Text | `govuk-colour("black")` | #0b0c0c |

### Typography System

GDS Transport font throughout. Standard GOV.UK type scale.
- Page titles: 48px bold
- H1: 36px bold
- Body: 19px regular
- Links: Underlined

### Spacing & Layout Foundation

GOV.UK spacing scale (5px increments). Two-thirds width form layout.

### Accessibility Considerations

- All colours meet WCAG 2.2 AA contrast
- 3px yellow focus ring on all interactive elements
- Error summary at top of form + inline errors
- No reliance on colour alone for meaning

## Design Direction

### Design Approach

Single direction: GOV.UK Design System patterns. No visual exploration needed - compliance is mandatory.

### Screen Inventory

| Screen | Route | Purpose |
|--------|-------|---------|
| Auth modal | (overlay) | Sign in / Create account choice |
| Signup form | `/signup` | Account creation form |
| Success page | `/signup/success` | Confirmation + AWS handoff messaging |
| Error states | (inline) | Validation errors with summary |

### Key Layout Decisions

- Two-thirds width form container
- Split email input: local part + domain dropdown
- Green success panel with numbered next steps
- Inline "domain not listed" contact link
- Error summary at top + inline field errors

### Component Choices

| Component | GOV.UK Pattern |
|-----------|----------------|
| Text inputs | `govuk-input` |
| Domain dropdown | `govuk-select` (with accessible autocomplete if needed) |
| Submit button | `govuk-button` (green) |
| Success panel | `govuk-panel--confirmation` |
| Error summary | `govuk-error-summary` |
| Inline errors | `govuk-error-message` |

## User Journey Flows

### Journey 1: New User Signup (Sarah)

**Entry:** Product page → Try button → Auth modal → Create account

**Flow:**
1. Enter first name, last name
2. Enter email local part, select domain
3. Submit → Lambda creates IAM IDC account
4. Success page with AWS handoff message
5. AWS email → password setup → auto-login
6. Return to original page → Try button works

```mermaid
flowchart TD
    A[Product page] --> B[Click Try]
    B --> C{Auth modal}
    C -->|Create account| D[/signup]
    D --> E[Fill form]
    E --> F{Valid?}
    F -->|No| G[Show errors]
    G --> E
    F -->|Yes| H[Lambda creates account]
    H --> I[Success page]
    I --> J[AWS email]
    J --> K[Set password]
    K --> L[Return to NDX]
    L --> M[Try button works]
```

### Journey 2: Existing User Redirect (Tom)

**Entry:** Product page → Try button → Auth modal → Create account

**Flow:**
1. Enter details, submit
2. Lambda detects existing email
3. Silent redirect to /login with "Welcome back" message
4. User logs in normally
5. Returns to original page

```mermaid
flowchart TD
    A[/signup] --> B[Fill form]
    B --> C[Submit]
    C --> D{User exists?}
    D -->|Yes| E[Redirect to /login]
    E --> F[Welcome back message]
    F --> G[User logs in]
    D -->|No| H[Create account]
```

### Journey 3: Unlisted Domain (James)

**Entry:** /signup page

**Flow:**
1. Enter name, email local part
2. Domain not in dropdown
3. See inline message: "Domain not listed? Contact ndx@dsit.gov.uk"
4. User emails request
5. Domain added (manual process)
6. User returns, completes signup

### Journey 4: Admin Monitoring (Marcus)

**Entry:** Account creation event

**Flow:**
1. EventBridge → Lambda → Slack notification
2. Admin reviews alerts in #ndx-signups
3. Investigate anomalies via IAM Identity Center console
4. Delete suspicious accounts if needed
5. Update WAF blocklist for abuse

### Flow Patterns

| Pattern | Usage |
|---------|-------|
| Silent redirect | Existing user detection - no error, just redirect |
| Inline fallback | Unlisted domain - contact link visible, not buried |
| Numbered next steps | Success page - clear what happens next |
| Error summary + inline | Validation failures |

## Component Strategy

### Design System Components

All core components from GOV.UK Design System:
- `govuk-input` - First name, last name, email local part
- `govuk-select` - Domain dropdown (340 options)
- `govuk-button` - Continue button (green)
- `govuk-panel--confirmation` - Success state
- `govuk-error-summary` - Validation errors
- `govuk-error-message` - Inline field errors
- `govuk-inset-text` - "Domain not listed" fallback message

### Custom Components

**1. Split Email Input**
- Fieldset containing text input + "@" + domain dropdown
- Logical grouping for accessibility
- Single error message for combined validation
- GOV.UK width classes for inline layout

**2. Auth Choice Modal (extend existing)**
- Extend AUPModal pattern from Try feature
- Two CTA buttons: "Sign in" / "Create account"
- Same focus trap and accessibility patterns

### Implementation Approach

- No new component library needed
- Use GOV.UK Nunjucks macros where available
- Custom split email uses standard GOV.UK classes
- Auth modal extends existing TypeScript component

### Accessibility Requirements

| Component | ARIA | Keyboard |
|-----------|------|----------|
| Split email | `aria-describedby` for group error | Tab between inputs |
| Domain dropdown | Native select | Arrow keys, type-ahead |
| Auth modal | `role="dialog"`, `aria-modal` | Focus trap, Esc to close |
| Error summary | `role="alert"` | Focus on page load |

## UX Consistency Patterns

### Button Patterns

| Type | Style | Usage |
|------|-------|-------|
| Primary | Green `govuk-button` | Main action (Continue, Sign in) |
| Secondary | Grey `govuk-button--secondary` | Alternative actions |
| Link | Text link | Inline navigation |

Rules: One primary per page. Never disable - show errors instead.

### Form Validation Patterns

1. Error summary at top (with links to fields)
2. Inline errors below each invalid field
3. Red border on invalid inputs
4. Focus moves to error summary on submit

Client-side: Email format, required fields
Server-side: Domain allowlist, existing user check

### Feedback Patterns

| State | Component | Usage |
|-------|-----------|-------|
| Success | `govuk-panel--confirmation` | Account created |
| Error | `govuk-error-summary` | Validation failures |
| Info | `govuk-inset-text` | Fallback paths |
| Loading | Button text change | Form submission |

### Modal Patterns

- Centred overlay with backdrop
- Focus trap (Tab cycles within modal)
- Esc to close, click outside to close
- Two equally weighted buttons for auth choice

### Loading Patterns

Form submit: Button text "Continue" → "Creating account..."
No spinners. Button disabled during request.
On error: Button returns to original text.

## Responsive Design & Accessibility

### Responsive Strategy

Desktop-first, mobile-responsive. GOV.UK Design System handles breakpoints.

| Device | Layout |
|--------|--------|
| Desktop | Two-thirds width form |
| Mobile | Full-width, stacked inputs |

Split email stacks vertically on mobile: local part → @ → domain dropdown.

### Breakpoint Strategy

GOV.UK standard: Mobile < 641px, Tablet 641-1019px, Desktop ≥ 1020px.
No custom breakpoints required.

### Accessibility Strategy

**Compliance:** WCAG 2.2 AA (mandatory - Public Sector Bodies Accessibility Regulations)

| Requirement | Implementation |
|-------------|----------------|
| Colour contrast | GOV.UK palette (compliant) |
| Focus indicators | 3px yellow outline |
| Keyboard | Tab navigation, Enter submit |
| Screen readers | Labels, fieldsets, `role="alert"` |
| Touch targets | 44x44px minimum |

### Testing Strategy

- Automated: axe-core, Lighthouse
- Manual: VoiceOver, NVDA, keyboard-only
- Browsers: Chrome, Edge
- Responsive: Desktop + mobile viewport testing

### Implementation Guidelines

- Use GOV.UK Nunjucks macros (accessibility built-in)
- Test split email with screen readers
- Ensure error summary announced on form submit
- Modal focus trap with Esc to close
