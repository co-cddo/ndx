# Epic 8: Accessible & Mobile-Friendly Experience + Brownfield Audit

**Goal:** Comprehensive WCAG 2.2 AA/AAA compliance validation, mobile responsiveness, and brownfield site accessibility audit

**User Value:** All government users can access Try features regardless of device or accessibility needs, ensuring inclusive digital service

**FRs Covered:** FR-TRY-66 through FR-TRY-79 (14 FRs)

---

## Story 8.1: Early Brownfield Accessibility Audit (Parallel with Epic 4)

**RUNS IN PARALLEL WITH EPIC 4 - Start immediately**

As a developer,
I want to audit existing NDX site for accessibility issues,
So that I can identify and remediate issues early, preventing compounding violations.

**Acceptance Criteria:**

**Given** NDX site exists with existing pages (catalogue, product pages, home)
**When** I run automated and manual accessibility audit
**Then** I identify and document:

**Automated Scan (axe-core/pa11y):**
- Color contrast violations (WCAG 2.2 Level A/AA/AAA)
- Missing ARIA labels
- Form label associations
- Heading hierarchy issues
- Image alt text missing
- Keyboard navigation barriers

**Manual Testing:**
- Screen reader experience (NVDA/JAWS/VoiceOver)
- Keyboard-only navigation
- Focus management
- Skip links functionality
- Error messaging clarity

**And** audit results documented in `/docs/accessibility-audit.md`:
- Violations categorized by severity (Critical/High/Medium/Low)
- WCAG 2.2 success criteria referenced
- Remediation recommendations
- Estimated effort for fixes

**And** critical violations remediated immediately:
- Color contrast failures (govuk-frontend usually compliant)
- Missing alt text on images
- Broken keyboard navigation

**Prerequisites:** None (Epic 4, Story 4.1) - Runs in parallel

**Technical Notes:**
- Pre-mortem preventive measure #1 (early brownfield audit)
- Identifies existing issues before adding new features
- Prevents compounding accessibility debt
- Tools: axe DevTools, pa11y-ci, manual testing
- WCAG 2.2 Level AA minimum (FR-TRY-76)
- GOV.UK Design System components usually compliant (validate integration)

**Architecture Context:**
- **ADR-004:** Early brownfield audit prevents compounding accessibility debt
- **Tools:** axe DevTools browser extension + pa11y-ci CLI
- **Output:** `/docs/accessibility-audit.md` with severity-categorized violations
- **Immediate Remediation:** Critical violations fixed before Epic 5 starts

**UX Design Context:**
- **Audit Scope:** Existing NDX pages (catalogue, product pages, home, navigation)
- **WCAG 2.2 Compliance:** UX Section 8.1 - AA minimum target
- **GOV.UK Components:** Usually WCAG compliant (validate correct usage)

---

## Story 8.2: Automated Accessibility Testing in CI Pipeline

As a developer,
I want accessibility tests to run automatically in CI,
So that we catch violations before deployment.

**Acceptance Criteria:**

**Given** CI pipeline exists (GitHub Actions/Jenkins/etc.)
**When** I add accessibility testing stage
**Then** CI runs automated tests:

**Test Suite:**
```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests

on: [push, pull_request]

jobs:
  a11y-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: yarn install
      - name: Build site
        run: yarn build
      - name: Run pa11y-ci
        run: npx pa11y-ci --config .pa11yci.json
```

**And** pa11y-ci configuration includes:
```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 10000
  },
  "urls": [
    "http://localhost:8080/",
    "http://localhost:8080/catalogue/",
    "http://localhost:8080/try"
  ]
}
```

**And** CI fails if accessibility violations detected
**And** CI runs on every pull request (prevents regressions)
**And** CI reports violations clearly in logs

**Prerequisites:** Story 8.1 (Brownfield audit) - Existing issues documented/remediated

**Technical Notes:**
- Pre-mortem preventive measure #3 (automated a11y tests in CI)
- Catches violations before merge to main
- WCAG 2.2 Level AA standard
- pa11y-ci or axe-core CLI
- Runs against built site (not source files)
- Fast feedback loop for developers

**Architecture Context:**
- **ADR-037:** Mandatory accessibility testing gate (CRITICAL)
  - PR blocked if ANY WCAG 2.2 AA violations detected
  - Zero tolerance policy for accessibility regressions
- **ADR-004:** Pa11y integration in CI pipeline
  - Tests run on every PR commit
  - Fast feedback (< 2 minutes)
- **CI Config:** `.github/workflows/accessibility.yml` + `.pa11yci.json`
- **Test URLs:** /, /catalogue/, /try (all key pages)

**UX Design Context:**
- **Quality Gate:** No PR merges without passing accessibility tests
- **Developer Experience:** Immediate feedback on violations (shift-left testing)
- **Compliance:** Continuous WCAG 2.2 AA compliance (not just end-of-project audit)

---

## Story 8.3: Comprehensive WCAG 2.2 Audit for Try Feature UI

As a developer,
I want comprehensive WCAG 2.2 Level AA/AAA audit of all Try feature UI,
So that we validate compliance before release.

**Acceptance Criteria:**

**Given** all Try feature UI is implemented (Epics 5-7)
**When** I run comprehensive accessibility audit
**Then** I validate WCAG 2.2 success criteria:

**Level A (Must Pass - 30 criteria):**
- 1.1.1 Non-text Content: Alt text for images/icons
- 1.3.1 Info and Relationships: Semantic HTML, ARIA labels
- 2.1.1 Keyboard: All functionality keyboard accessible
- 2.4.1 Bypass Blocks: Skip to main content link
- 3.1.1 Language of Page: lang attribute set
- 4.1.2 Name, Role, Value: Form inputs labeled

**Level AA (Must Pass - 20 criteria):**
- 1.4.3 Contrast (Minimum): 4.5:1 for text, 3:1 for UI components
- 1.4.5 Images of Text: Avoid text in images (use real text)
- 2.4.6 Headings and Labels: Descriptive headings
- 2.4.7 Focus Visible: Clear focus indicators
- 3.2.4 Consistent Identification: UI components consistent across pages

**Level AAA (Optional - 28 criteria):**
- 1.4.6 Contrast (Enhanced): 7:1 for text
- 2.4.8 Location: Breadcrumbs or location indicators
- 3.1.5 Reading Level: Plain English (UK government standard)

**And** audit covers all Try feature components:
- Sign in/out buttons (Epic 5)
- Try button and modal (Epic 6)
- Sessions table and launch button (Epic 7)
- Empty states and guidance panels

**And** audit results documented in `/docs/wcag-compliance-report.md`
**And** violations remediated before Epic 8 completion

**Prerequisites:** Story 8.2 (CI tests running)

**Technical Notes:**
- WCAG 2.2 released October 2023 (latest standard)
- FR-TRY-76 requires Level AA minimum
- GOV.UK services aim for AAA where possible
- Manual + automated testing (automated catches ~30% of issues)
- Tools: axe DevTools, WAVE, Lighthouse, manual testing

**Architecture Context:**
- **ADR-004:** Pa11y integration for automated WCAG 2.2 scanning
  - Scans all Try feature pages (product pages, /try, modals)
  - Detects ~30% of WCAG violations automatically (manual testing for rest)
- **ADR-037:** WCAG 2.2 AA mandatory compliance gate
  - Zero tolerance for AA violations before release
  - AAA pursued where feasible (GOV.UK typically achieves this)
- **Testing Tools:**
  - Automated: axe-core (browser extension), pa11y-ci (CLI), Lighthouse
  - Manual: Human testing with NVDA, JAWS, VoiceOver screen readers
- **Output:** `/docs/wcag-compliance-report.md` with all 50 AA criteria checked

**UX Design Context:**
- **WCAG 2.2 Target:** UX Section 8.1 - AA minimum, AAA where feasible
- **Component Audit Coverage:**
  - Epic 5: Sign in/out buttons, empty states
  - Epic 6: Try button, lease request modal, AUP acceptance, tag filters
  - Epic 7: Sessions table, status badges, launch button, expiry formatting
- **Manual Testing Priority:** Modal interactions, keyboard focus, screen reader announcements
- **Success Criteria:** All 50 WCAG 2.2 AA criteria pass before Epic 8 completion

---

## Story 8.4: GOV.UK Design System Component Compliance Audit

As a developer,
I want to audit GOV.UK Design System component usage,
So that we ensure correct implementation and accessibility inheritance.

**Acceptance Criteria:**

**Given** Try feature uses GOV.UK Design System components
**When** I audit component usage
**Then** I validate:

**Component Checklist:**
- ✓ Buttons: `govukButton` macro used correctly
- ✓ Tags: `govukTag` macro for status badges
- ✓ Table: `govukTable` macro for sessions table
- ✓ Checkboxes: `govukCheckboxes` macro for AUP consent
- ✓ Headings: `govukHeading` macro with correct sizes
- ✓ Body text: `govukBody` macro for content
- ✓ Links: GOV.UK link styling applied
- ✓ Layout: GOV.UK grid system used

**And** component parameters validated:
- Buttons have accessible labels
- Tags have correct color classes
- Table has headers with scope attributes
- Checkboxes have associated labels
- Headings follow hierarchy (h1 → h2 → h3)

**And** custom components (modal) follow GOV.UK patterns:
- Color palette: GOV.UK colors only
- Typography: GOV.UK font stack
- Spacing: GOV.UK spacing scale
- Accessibility: ARIA patterns from GOV.UK docs

**And** audit results documented: `/docs/govuk-component-audit.md`
**And** violations remediated (use correct macros/patterns)

**Prerequisites:** Story 8.3 (WCAG audit)

**Technical Notes:**
- GOV.UK Design System: https://design-system.service.gov.uk/
- Components inherently accessible (if used correctly)
- Custom modal needs careful ARIA implementation (no GOV.UK modal component)
- Validate against GOV.UK Frontend v5.x compatibility
- FR-TRY-15 requires GOV.UK Design System usage

**Architecture Context:**
- **ADR-015:** Vanilla Eleventy with TypeScript (brownfield constraint)
  - Must use GOV.UK Nunjucks macros (not React/Vue components)
  - `govukButton`, `govukTag`, `govukTable`, `govukCheckboxes` macros
- **ADR-026:** Custom modal follows GOV.UK patterns (CRITICAL)
  - No official GOV.UK modal component exists (custom implementation required)
  - Use GOV.UK color palette, typography, spacing scale
  - Implement ARIA dialog pattern from GOV.UK accessibility guidance
- **Component Validation:**
  - Check all components use correct Nunjucks macro syntax
  - Validate macro parameters (labels, ARIA, classes)
  - Ensure GOV.UK Frontend v5.x compatibility (latest stable)
- **Output:** `/docs/govuk-component-audit.md` with component checklist

**UX Design Context:**
- **Design System:** UX Section 6.0 - GOV.UK Design System v5.x required
- **Component Specs:** UX Section 6.2 specifies exact GOV.UK components to use
  - Component 1: Sessions Table (govukTable macro)
  - Component 2: AUP Modal (custom, GOV.UK styling)
  - Component 3: Try Button (govukButton isStartButton)
  - Component 4: Status Badges (govukTag macro)
- **Custom Modal Pattern:** UX Section 7.6 - GOV.UK color palette + ARIA best practices
- **Inheritance Check:** GOV.UK components provide accessibility by default (validate correct usage)

---

## Story 8.5: Mobile Responsive Design Validation

As a government user,
I want Try feature to work perfectly on mobile devices,
So that I can access sandbox management from my phone/tablet.

**Acceptance Criteria:**

**Given** Try feature UI is implemented
**When** I test on mobile viewports
**Then** I validate responsiveness for:

**Viewport Sizes:**
- Mobile: 320px - 767px width
- Tablet: 768px - 1023px width
- Desktop: 1024px+ width

**Component Responsiveness:**

**Sign In/Out Buttons (Epic 5):**
- Visible in mobile navigation (not hidden)
- Accessible in collapsed menu (if applicable)
- Touch-friendly size (min 44x44px)

**Try Button (Epic 6):**
- Button full-width on mobile (easier to tap)
- Text readable on small screens
- Icon appropriately sized

**Lease Request Modal (Epic 6):**
- Modal adapts to mobile viewport (not cut off)
- AUP text scrollable on mobile
- Checkbox/buttons touch-friendly
- Modal closable on mobile (X button or Escape key)

**Sessions Table (Epic 7):**
- **Option A:** Horizontal scroll (table intact)
- **Option B:** Stacked cards (one session per card)
- All data visible (not truncated)
- Launch button accessible on mobile

**Empty States:**
- Guidance text readable on mobile
- Links touch-friendly

**And** manual testing on real devices:
- iOS: Safari (iPhone/iPad)
- Android: Chrome (various screen sizes)
- No horizontal scroll (except intentional table scroll)
- No content cut off or hidden

**And** responsiveness documented in `/docs/responsive-design-validation.md`

**Prerequisites:** Story 8.4 (GOV.UK component audit)

**Technical Notes:**
- FR-TRY-66, FR-TRY-67, FR-TRY-68, FR-TRY-69 covered
- GOV.UK Design System is mobile-first by default
- Test on real devices (not just browser DevTools)
- Touch target size: 44x44px minimum (WCAG 2.2 Level AAA)
- Consider card view for mobile sessions table (better UX than scroll)

**Architecture Context:**
- **ADR-008:** Mobile-first CSS approach (GOV.UK default)
  - Breakpoints: 320px (mobile), 768px (tablet), 1024px (desktop)
  - Base styles for mobile, media queries for larger screens
- **ADR-027:** Responsive Table Transformation Pattern (CRITICAL)
  - Desktop (≥769px): Traditional table layout
  - Mobile (<769px): Stacked cards with CSS-only transformation (no JavaScript)
  - Labels inline with values (validated decision from Architecture/UX alignment)
- **ADR-026:** Modal adapts to mobile viewports
  - Desktop: Max-width 600px, centered overlay
  - Mobile (<640px): Full-screen modal, padding reduced to 20px
  - AUP scrollable within modal (max-height constraint)
- **Touch Targets:** WCAG 2.2 Level AAA - minimum 44x44px (ADR-028)
- **Output:** `/docs/responsive-design-validation.md` with device test results

**UX Design Context:**
- **Mobile Breakpoints:** UX Section 6.2 Component Specifications
  - Mobile: <640px (full-width buttons, stacked layouts)
  - Tablet: 640px-1023px (hybrid layout)
  - Desktop: ≥1024px (full table, side-by-side buttons)
- **Component Responsiveness:**
  - Sessions Table: UX Component 1 - Stacked cards on mobile (labels inline with values)
  - AUP Modal: UX Component 2 - Full-screen on mobile, scrollable content
  - Try Button: Full-width on mobile for easier tapping
- **Touch Targets:** All interactive elements ≥ 44x44px (WCAG 2.2 AAA compliance)
- **Real Device Testing:** iOS Safari + Android Chrome required (not just DevTools simulation)

---

## Story 8.6: Performance and Security Validation

As a developer,
I want to validate performance and security of Try feature,
So that we ensure fast, secure user experience.

**Acceptance Criteria:**

**Given** Try feature is complete
**When** I run performance and security audits
**Then** I validate:

**Performance (Lighthouse):**
- Performance score: ≥90
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1

**Security:**
- JWT tokens NOT logged to console
- JWT tokens NOT exposed in URLs (cleaned after extraction)
- sessionStorage used correctly (not localStorage for sensitive data)
- External links use `rel="noopener noreferrer"`
- No XSS vulnerabilities (sanitize user input)
- HTTPS enforced (redirect HTTP to HTTPS)

**API Calls:**
- Authorization header included (all /api/* requests)
- 401 responses handled (automatic re-auth)
- CORS configured correctly (Innovation Sandbox API)
- Error handling prevents information leakage

**And** Lighthouse audit run on:
- /try page (authenticated and unauthenticated)
- Product page with Try button
- Lease request modal

**And** security scan with OWASP ZAP or similar tool
**And** results documented: `/docs/performance-security-audit.md`

**Prerequisites:** Story 8.5 (Mobile validation)

**Technical Notes:**
- Lighthouse: Chrome DevTools or CI integration
- Performance budget: GOV.UK recommendation
- JWT security: sessionStorage (temporary), never log tokens
- XSS prevention: Sanitize AUP text if user-generated (currently API-generated, safe)
- HTTPS: CloudFront enforces (redirect-to-https viewer protocol policy)

**Architecture Context:**
- **ADR-016:** sessionStorage for JWT tokens (security consideration)
  - JWT never logged to console (no console.log in production code)
  - JWT cleared on browser close (sessionStorage clears automatically)
  - NOT localStorage (would persist across browser restarts - security risk)
- **ADR-023:** URL cleanup after token extraction (NFR-TRY-SEC-6)
  - `window.history.replaceState()` removes token from browser history
  - Token never visible in address bar after extraction
  - Prevents token exposure in screenshots, shared URLs
- **ADR-021:** Centralized API client with Authorization header injection
  - Validates Authorization header present on all /api/* requests
  - 401 responses trigger automatic re-auth (redirect to sign in)
- **Performance Target:** Lighthouse score ≥90 (GOV.UK standard)
  - First Contentful Paint <1.5s, Time to Interactive <3s
  - Cumulative Layout Shift <0.1 (stable layout, no jank)
- **HTTPS Enforcement:** CloudFront redirect-to-https viewer protocol policy
- **Output:** `/docs/performance-security-audit.md` with Lighthouse + OWASP ZAP results

**UX Design Context:**
- **Security:** UX Section 7.1 Authentication State Management
  - sessionStorage choice balances security (browser close = sign out) + UX (multi-tab persistence)
  - No visible tokens in UI, URLs, or console logs
- **Performance:** Fast page loads ensure accessible experience for all users (rural connectivity)
- **Error Handling:** User-friendly error messages (ADR-032) prevent information leakage
- **Testing Coverage:** /try authenticated + unauthenticated, product page with Try button, modal open

---

## Story 8.7: Keyboard Navigation Testing

As a government user with mobility impairments,
I want to navigate Try feature using only keyboard,
So that I can access all features without a mouse.

**Acceptance Criteria:**

**Given** Try feature is implemented
**When** I navigate using keyboard only (Tab, Shift+Tab, Enter, Escape, Arrow keys)
**Then** I can complete all user flows:

**Flow 1: Sign In**
- Tab to "Sign in" button
- Press Enter → Redirected to OAuth
- After auth, tab to navigation → See "Sign out" button

**Flow 2: Request Lease**
- Tab to "Try Before You Buy" tag filter
- Press Enter → Catalogue filtered
- Tab to product card → Press Enter → Product page
- Tab to "Try this now" button → Press Enter → Modal opens
- **Modal focus management:**
  - Focus trapped in modal (Tab cycles within modal only)
  - Tab to AUP checkbox → Press Space to check
  - Tab to "Continue" button → Press Enter → Lease requested
  - Press Escape → Modal closes (alternative to Cancel button)

**Flow 3: Launch Sandbox**
- Tab to /try page link
- Press Enter → Navigate to /try page
- Tab to sessions table → Arrow keys navigate rows (optional)
- Tab to "Launch AWS Console" button → Press Enter → Opens AWS portal

**Flow 4: Sign Out**
- Tab to "Sign out" button → Press Enter → Signed out

**And** focus indicators visible at all times (WCAG 2.2 Level AA)
**And** focus order logical (top to bottom, left to right)
**And** no keyboard traps (can escape all elements)
**And** manual testing with screen off (keyboard-only navigation)

**Prerequisites:** Story 8.6 (Performance/security validation)

**Technical Notes:**
- FR-TRY-70, FR-TRY-71, FR-TRY-72, FR-TRY-73 covered
- Modal focus trap: Critical for accessibility (prevent focus escaping modal)
- Escape key closes modal (keyboard shortcut)
- Focus indicators: GOV.UK Design System provides by default (validate not overridden)
- Tab order: HTML source order (avoid CSS visual reordering that breaks tab order)

**Architecture Context:**
- **ADR-026:** Accessible Modal Pattern - Focus Management (CRITICAL)
  - **Focus trap:** Tab key cycles within modal only (no escape to background)
  - **Focus on open:** Automatically move focus to first interactive element (AUP checkbox)
  - **Focus on close:** Return focus to "Try this now" button that opened modal
  - **Escape key:** Close modal with Escape key (keyboard shortcut alternative to Cancel)
  - **Tab order:** Checkbox → Cancel → Continue → (cycles back to checkbox)
- **Keyboard Event Handlers:**
  - Modal: `keydown` listener for Escape key
  - All interactive elements: `click` and `keydown` (Enter/Space) handlers
  - Focus trap: First/last element focus redirection logic
- **Focus Indicators:** GOV.UK Design System yellow outline + black shadow (validate no CSS override)
- **Tab Order Validation:** HTML source order matches visual order (no CSS reordering issues)

**UX Design Context:**
- **User Journeys:** UX Section 5.1 - All 5 journeys must be keyboard-navigable
  - Journey 1: Authentication Sign In (Tab to "Sign in", Enter)
  - Journey 2: Lease Request (Tab through filters, product, Try button, modal, submit)
  - Journey 3: Session View (Tab to /try link, navigate sessions table)
  - Journey 4: Sandbox Launch (Tab to "Launch AWS Console" button, Enter)
  - Journey 5: Authentication Sign Out (Tab to "Sign out", Enter)
- **Modal Focus Management:** UX Section 7.6 - Focus trap prevents confusion
- **Keyboard Shortcuts:** Escape closes modal (documented in UX Section 7.6)
- **Testing Method:** Manual testing with screen off (keyboard-only, no mouse/trackpad)

---

## Story 8.8: Screen Reader Testing (NVDA/JAWS/VoiceOver)

As a government user with visual impairments,
I want to use Try feature with a screen reader,
So that I can access all features through audio feedback.

**Acceptance Criteria:**

**Given** Try feature is implemented
**When** I navigate using screen reader (NVDA/JAWS/VoiceOver)
**Then** I hear clear announcements:

**Sign In/Out Buttons:**
- Button role announced
- Button label: "Sign in" or "Sign out"
- Button state: Focused/Not focused

**Try Button:**
- Button role announced
- Button label: "Try this now for 24 hours"
- Start button icon decorative (aria-hidden)

**Lease Request Modal:**
- Dialog role announced: "Dialog: Request AWS Sandbox Access"
- AUP heading: "Acceptable Use Policy"
- Checkbox label: "I accept the Acceptable Use Policy"
- Checkbox state: Checked/Unchecked
- Button labels: "Cancel" / "Continue"
- Continue button state: Disabled/Enabled

**Sessions Table:**
- Table role announced
- Table caption: "Your try sessions"
- Column headers: Template Name, AWS Account ID, Expiry, Budget, Status
- Cell data announced with associated header
- Status badges: "Status: Active" (not just color)
- Budget: "Budget: $12.35 used of $50 maximum" (clear pronunciation)

**Empty States:**
- Heading: "Sign in to view your try sessions"
- Guidance text read clearly
- Links announced with purpose

**And** ARIA labels used where needed:
```html
<span aria-label="Budget: $12.35 used of $50 maximum">
  $12.3456 / $50.00
</span>

<div role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Request AWS Sandbox Access</h2>
  ...
</div>
```

**And** manual testing with 3 screen readers:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)

**Prerequisites:** Story 8.7 (Keyboard navigation testing)

**Technical Notes:**
- FR-TRY-74, FR-TRY-75, FR-TRY-79 covered
- ARIA labels: Supplement visual information for screen readers
- aria-hidden: Hide decorative icons from screen readers
- ARIA live regions: Announce dynamic content (error messages)
- Modal aria-modal="true": Prevents screen reader navigating outside modal
- Table accessibility: th scope="col", caption or aria-label

**Architecture Context:**
- **ADR-026:** Accessible Modal Pattern - ARIA Attributes (CRITICAL)
  - `role="dialog"` on modal container
  - `aria-modal="true"` prevents screen reader navigating outside modal
  - `aria-labelledby="{modal-title-id}"` announces modal title
  - Background content: `aria-hidden="true"` OR `inert` attribute
- **ADR-028:** ARIA live regions for dynamic content announcements
  - Modal open: "Dialog opened, Request AWS Sandbox Access"
  - Error messages: `role="alert"` with `aria-live="assertive"`
  - Success messages: `aria-live="polite"` (non-intrusive)
- **ADR-027:** Sessions Table ARIA for responsive layout
  - Desktop: `<th scope="col">` for column headers
  - Mobile: `data-label` attributes for inline labels
  - Table caption or `aria-label="Your try sessions"`
- **ARIA Labels for Complex Data:**
  - Budget: `aria-label="Budget: $12.35 used of $50 maximum"`
  - Status badges: "Status: Active" (not just color-coded visual)
- **Decorative Icons:** `aria-hidden="true"` on Try button start icon

**UX Design Context:**
- **Screen Reader Testing:** UX Section 8.1 WCAG 2.2 compliance requires testing with 3 screen readers
  - NVDA (Windows, free)
  - JAWS (Windows, enterprise standard)
  - VoiceOver (macOS/iOS, built-in)
- **ARIA Announcements:** UX Section 7.4 Success/Error Notification Strategy
  - Modal open: Immediate announcement (assertive)
  - Errors: Clear, action-oriented announcements
  - Success: Polite announcements (don't interrupt)
- **Table Accessibility:** UX Component 1 Sessions Table
  - Column headers announced with each cell
  - Status badges include text label (not just color)
  - Budget formatting clear for pronunciation
- **Manual Testing Required:** Automated tools cannot validate screen reader experience

---

## Story 8.9: Focus Management and Visual Focus Indicators

As a keyboard user,
I want clear visual focus indicators on all interactive elements,
So that I always know where I am on the page.

**Acceptance Criteria:**

**Given** Try feature is implemented
**When** I navigate using keyboard (Tab key)
**Then** I see clear focus indicators on all interactive elements:

**Focus Indicator Requirements:**
- Visible outline or border around focused element
- Contrast ratio: 3:1 minimum against background (WCAG 2.2 Level AA)
- Consistent style across all elements
- Not removed by CSS (no `outline: none` without replacement)

**Elements with Focus Indicators:**
- Sign in/out buttons
- "Try Before You Buy" tag filter
- "Try this now" button
- Modal close button (X)
- AUP checkbox
- Cancel/Continue buttons
- Sessions table (if focusable)
- "Launch AWS Console" button
- All navigation links

**And** focus indicator uses GOV.UK Design System default:
```css
/* GOV.UK focus indicator */
:focus {
  outline: 3px solid #ffdd00; /* Yellow */
  outline-offset: 0;
  box-shadow: 0 0 0 4px #0b0c0c; /* Black */
}
```

**And** focus order logical (matches visual order)
**And** focus NOT lost during page updates (AJAX content loading)
**And** modal focus returns to trigger button when closed

**Prerequisites:** Story 8.8 (Screen reader testing)

**Technical Notes:**
- FR-TRY-71 covered (focus indicators visible)
- GOV.UK Design System provides focus styles automatically
- Custom CSS must not override (validate no `outline: none`)
- WCAG 2.2 new criterion: Focus Appearance (Level AAA, 2px thickness minimum)
- Focus management: Modal traps focus, returns focus on close
- Focus order: Determined by HTML source order (not CSS visual order)

**Architecture Context:**
- **GOV.UK Focus Indicator (default):** Yellow outline + black shadow
  ```css
  :focus {
    outline: 3px solid #ffdd00; /* Yellow */
    outline-offset: 0;
    box-shadow: 0 0 0 4px #0b0c0c; /* Black */
  }
  ```
- **Contrast Ratio:** 3:1 minimum against background (WCAG 2.2 Level AA)
- **WCAG 2.2 Focus Appearance (Level AAA):** 2px thickness minimum (GOV.UK exceeds with 3px)
- **CSS Validation:** Audit for `outline: none` overrides (accessibility violation)
- **ADR-026:** Modal focus management
  - Focus returns to trigger button ("Try this now") when modal closes
  - Focus trapped within modal while open (no background focus)
- **Focus Order:** HTML source order determines tab order (no CSS `order` or `flex` reordering)
- **Dynamic Content:** Focus NOT lost during AJAX content loading (preserve focus reference)

**UX Design Context:**
- **Focus Indicator Standard:** GOV.UK Design System default (yellow + black)
  - Visible on all interactive elements (buttons, links, checkboxes, inputs)
  - Consistent across all components (no custom overrides)
- **WCAG 2.2 Compliance:** Level AA minimum (3:1 contrast), AAA target (2px thickness achieved)
- **Focus Elements Coverage:** UX Section 6.2 Component Specifications
  - Sign in/out buttons
  - "Try Before You Buy" tag filter
  - "Try this now" button
  - Modal close button (X), AUP checkbox, Cancel/Continue buttons
  - Sessions table rows, "Launch AWS Console" button
  - All navigation links
- **Focus Order Logic:** Visual order = tab order (top-to-bottom, left-to-right)
- **No CSS Override:** Validate no `outline: none` in custom CSS (breaks accessibility)

---

## Story 8.10: Error Messaging Accessibility

As a government user,
I want error messages announced clearly to screen readers,
So that I know when something goes wrong and how to fix it.

**Acceptance Criteria:**

**Given** errors can occur (API failures, validation errors)
**When** error occurs
**Then** I see and hear error message:

**Visual Error Display:**
- GOV.UK error message component
- Red left border (govuk-error-message class)
- Error text clearly visible
- Error associated with failed element (ARIA)

**Screen Reader Announcement:**
- ARIA live region announces error immediately
- Error message descriptive (not just "Error")
- Remediation guidance included

**Error Scenarios:**

**1. Lease Request Failure (409 Max Leases):**
```html
<div role="alert" aria-live="assertive">
  You have reached the maximum number of active sandbox leases (5).
  Please terminate an existing lease before requesting a new one.
</div>
```

**2. API Failure (Network Error):**
```html
<div role="alert" aria-live="assertive">
  Failed to load your try sessions. Please check your connection and refresh the page.
</div>
```

**3. Authentication Failure (401):**
```html
<div role="alert" aria-live="assertive">
  Your session has expired. Redirecting to sign in...
</div>
```

**And** error messages use GOV.UK error pattern:
- Clear, concise language
- Action-oriented (tell user what to do)
- No technical jargon
- Red left border visual indicator

**And** errors announced immediately (aria-live="assertive")
**And** errors do NOT rely on color alone (text + border)

**Prerequisites:** Story 8.9 (Focus indicators)

**Technical Notes:**
- FR-TRY-79 covered (ARIA live regions for errors)
- ARIA live regions: Announce dynamic content to screen readers
- aria-live="assertive": Immediate announcement (interrupts screen reader)
- GOV.UK error message component: Built-in accessibility
- Error text: Plain English, action-oriented (UK government standard)

**Architecture Context:**
- **ADR-028:** ARIA live regions for error announcements (CRITICAL)
  - `role="alert"` with `aria-live="assertive"` for immediate interruption
  - Screen readers announce errors instantly (don't wait for focus)
  - Example: "You have reached the maximum number of active sandbox leases (5). Please terminate an existing lease."
- **ADR-032:** User-friendly error messages pattern
  - Clear, concise language (no technical jargon)
  - Action-oriented: Tell user what to do next
  - Examples:
    - 409 Max Leases: "Please terminate an existing lease before requesting a new one"
    - Network Error: "Please check your connection and refresh the page"
    - 401 Auth Failure: "Your session has expired. Redirecting to sign in..."
- **GOV.UK Error Message Component:**
  - Red left border visual indicator (4px solid #d4351c)
  - `govuk-error-message` class with built-in ARIA
  - Error text in `govuk-body` typography
- **No Color Reliance:** Error messages include text + border (not color alone per WCAG 2.2)
- **Module:** `src/try/utils/error-handler.ts` - Centralized error message formatting

**UX Design Context:**
- **Error Strategy:** UX Section 7.4 Success/Error Notification Strategy
  - Immediate announcement via ARIA live regions
  - Clear, actionable guidance (not just "Error")
  - GOV.UK error message pattern (red border + descriptive text)
- **Plain English:** UK government requirement (avoid technical jargon)
  - NOT: "HTTP 409 Conflict - Resource quota exceeded"
  - YES: "You have reached the maximum number of active sandbox leases (5)"
- **Error Scenarios Covered:**
  - Lease Request Failure (409 Max Leases)
  - API Failure (Network Error)
  - Authentication Failure (401 Expired Session)
  - Validation Errors (AUP not accepted)
- **Accessibility:** Errors announced to screen readers immediately (don't rely on visual indicators alone)

---

## Story 8.11: WCAG 2.2 AA Compliance Certification

As a product owner,
I want to certify WCAG 2.2 Level AA compliance for Try feature,
So that we meet UK government accessibility standards before release.

**Acceptance Criteria:**

**Given** all Epic 8 stories are complete (8.1-8.10)
**When** I review comprehensive accessibility testing results
**Then** I certify compliance with:

**WCAG 2.2 Level A (30 criteria) - All Pass:**
- ✓ Perceivable: Text alternatives, adaptable, distinguishable
- ✓ Operable: Keyboard accessible, enough time, navigable
- ✓ Understandable: Readable, predictable, input assistance
- ✓ Robust: Compatible with assistive technologies

**WCAG 2.2 Level AA (20 criteria) - All Pass:**
- ✓ Contrast (Minimum): 4.5:1 text, 3:1 UI components
- ✓ Resize Text: 200% zoom without loss of functionality
- ✓ Reflow: No horizontal scroll at 320px width
- ✓ Focus Visible: Clear focus indicators
- ✓ Label in Name: Accessible names match visible labels

**WCAG 2.2 Level AAA (Optional - Best Effort):**
- ✓ Contrast (Enhanced): 7:1 where possible (GOV.UK achieves this)
- ✓ Reading Level: Plain English (UK government standard)

**And** compliance certification includes:

**1. Accessibility Statement (Public):**
```markdown
# Accessibility Statement for NDX Try Before You Buy

This website is run by the Cabinet Office. We want as many people as possible to be able to use this website.

# Compliance Status
This website is fully compliant with the Web Content Accessibility Guidelines version 2.2 AA standard.

# Testing
We regularly test this website using:
- Automated testing with axe-core and pa11y
- Manual testing with NVDA, JAWS, and VoiceOver
- Keyboard-only navigation testing
- Mobile device testing (iOS/Android)

# Feedback
If you have difficulty using this website, contact us: [contact details]

Last updated: [Date]
```

**2. Internal Compliance Report:**
- All WCAG 2.2 success criteria checked
- Testing methodology documented
- Evidence of compliance (screenshots, test results)
- Any known issues documented (with remediation plan)

**And** compliance statement published on NDX website (e.g., `/accessibility`)
**And** product owner sign-off before release

**Prerequisites:** Story 8.10 (Error messaging accessibility)

**Technical Notes:**
- UK government requirement: WCAG 2.2 Level AA minimum
- GOV.UK services must publish accessibility statement
- Compliance statement template: https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps
- Certification based on testing evidence (Stories 8.1-8.10)
- Ongoing compliance: CI tests prevent regressions (Story 8.2)

**Architecture Context:**
- **ADR-037:** Mandatory accessibility testing gate (ongoing compliance)
  - CI pipeline blocks PRs with WCAG violations (Story 8.2)
  - Prevents accessibility regressions after initial certification
  - Zero tolerance for new violations post-release
- **Compliance Evidence (Stories 8.1-8.10):**
  - 8.1: Brownfield audit baseline
  - 8.2: CI pipeline automated testing
  - 8.3: Comprehensive WCAG 2.2 audit (all 50 AA criteria)
  - 8.4: GOV.UK component compliance
  - 8.5: Mobile responsiveness validation
  - 8.6: Performance + security validation
  - 8.7: Keyboard navigation testing (all user flows)
  - 8.8: Screen reader testing (NVDA, JAWS, VoiceOver)
  - 8.9: Focus indicators validation
  - 8.10: Error messaging accessibility
- **WCAG 2.2 Coverage:** All 50 Level AA criteria (30 Level A + 20 Level AA)
- **AAA Where Feasible:** GOV.UK Design System achieves many AAA criteria by default
  - Contrast (Enhanced): 7:1 achieved for most text
  - Reading Level: Plain English (UK government standard)

**UX Design Context:**
- **WCAG 2.2 Target:** UX Section 8.1 - Level AA minimum, AAA where feasible
- **Accessibility Statement Required:** UK government public sector requirement
  - Published at `/accessibility` route
  - Includes compliance status, testing methodology, feedback contact
  - Template: GOV.UK accessibility requirements guidance
- **Certification Checklist:**
  - ✓ All 30 Level A criteria pass
  - ✓ All 20 Level AA criteria pass
  - ✓ Manual + automated testing complete
  - ✓ Screen reader testing (3 readers)
  - ✓ Keyboard navigation (all user journeys)
  - ✓ Mobile device testing (iOS + Android)
- **Product Owner Sign-Off:** Required before Try feature release
- **Ongoing Compliance:** ADR-037 CI gate ensures continuous compliance (not just one-time certification)

---
