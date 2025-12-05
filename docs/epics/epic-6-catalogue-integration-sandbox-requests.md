# Epic 6: Catalogue Integration & Sandbox Requests

**Goal:** Government users can discover tryable products in catalogue and request AWS sandboxes via AUP modal

**User Value:** Users see "Try Before You Buy" tag on tryable products, click "Try" button, accept AUP, and receive AWS sandbox access in minutes

**FRs Covered:** FR-TRY-42 through FR-TRY-65 (24 FRs)

---

## Story 6.0: UX Review Checkpoint (GATE)

**GATE STORY - Must complete before Epic 6 implementation**

As a product owner,
I want to review UX design for Try feature integration with catalogue,
So that we validate user flows before development starts.

**Acceptance Criteria:**

**Given** Epic 5 (Authentication Foundation) is complete
**When** product owner reviews Try feature UX with team
**Then** the following UX elements are validated:

**UX Element 1: "Try Before You Buy" Tag Placement**

- Tag appears on product cards in catalogue listing
- Tag appears on product detail pages
- Tag uses GOV.UK Design System tag component
- Tag color/styling clearly distinguishes from other tags

**UX Element 2: "Try this now for 24 hours" Button**

- Button placement on product detail page (below description? sidebar?)
- Button uses GOV.UK Start Button (`isStartButton: true`)
- Button disabled state if user already has max leases (discoverable in Story 6.8)
- Button text clear and actionable

**UX Element 3: Lease Request Modal Layout**

- Modal overlay with AUP content
- Scrollable AUP text (long content)
- Checkbox: "I accept the Acceptable Use Policy"
- Two buttons: "Cancel" and "Continue"
- Clear visual hierarchy (AUP → Checkbox → Buttons)

**UX Element 4: Link from /try Page to Tryable Products**

- Placement of link on /try page (empty state? always visible?)
- Link text: "Browse tryable products in catalogue"
- Filters catalogue to show only tryable products

**And** UX review includes accessibility considerations:

- Keyboard navigation flow through modal
- Focus management (modal focus trap)
- Screen reader experience (ARIA labels for tag, button, modal)

**And** team consensus reached on UX approach
**And** any UX changes documented before Story 6.1 starts

**Prerequisites:** Epic 5 complete (Story 5.10)

**Technical Notes:**

- GATE story from Pre-mortem preventive measure #7 (user acceptance)
- UX review prevents costly rework during implementation
- Collaborative session: Product owner, UX designer, developers
- Does NOT require code implementation (design validation only)
- Output: Documented UX decisions for Stories 6.1-6.11

**Architecture Context:**

- **ADR-026:** Accessible modal pattern (CRITICAL - full spec needed before Story 6.6)
  - Focus trap implementation requirements
  - Keyboard navigation (Tab, Shift+Tab, Escape)
  - ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
  - Screen reader announcements for modal open/close
- **ADR-032:** User-friendly error messages (review error templates for lease request failures)

**UX Design Context:**

- **Component Specs:** AUP Acceptance Modal (UX Section 6.2 Component 2) - MUST REVIEW
  - Modal anatomy: Summary box, scrollable AUP, checkbox, buttons
  - Desktop vs mobile layout (max-width 600px desktop, full-screen mobile)
  - Disabled button state until checkbox checked
- **Component Specs:** Try Button (UX Section 6.2 Component 4)
  - Exact placement on product pages (below description, above Access section)
  - GOV.UK Start Button styling (green with arrow icon)
- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2) - Complete flow review

---

## Story 6.1: Parse "try" Metadata from Product YAML Frontmatter

As a developer,
I want to parse `try` and `try_id` metadata from product page YAML frontmatter,
So that I can identify tryable products in the catalogue.

**Acceptance Criteria:**

**Given** product page markdown file exists (e.g., `/source/catalogue/product-name.md`)
**When** the YAML frontmatter includes:

```yaml
---
title: "AWS Innovation Sandbox"
tags: ["aws", "sandbox"]
try: true
try_id: "550e8400-e29b-41d4-a716-446655440000"
---
```

**Then** 11ty build process parses metadata:

- `try` field (boolean): Indicates product is tryable
- `try_id` field (UUID string): Lease template UUID for Innovation Sandbox API

**And** parsed metadata available in Nunjucks templates:

```nunjucks
{% if try %}
  <!-- Product is tryable -->
  <p>Lease Template ID: {{ try_id }}</p>
{% endif %}
```

**And** products without `try` metadata treated as not tryable (default: false)
**And** invalid `try_id` (not UUID format) logs warning during build

**Prerequisites:** Story 6.0 (UX Review Checkpoint complete)

**Technical Notes:**

- FR-TRY-42, FR-TRY-43 covered
- 11ty frontmatter parsing via `eleventy-plugin-syntaxhighlight` or custom plugin
- UUID format validation: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Lease template UUIDs obtained from Innovation Sandbox API (GET /api/leaseTemplates)
- Example tryable product: AWS Innovation Sandbox (sandbox environment for AWS services)

**Architecture Context:**

- **ADR-015:** Vanilla Eleventy with TypeScript (brownfield constraint - no framework)
  - Frontmatter parsing uses 11ty's built-in gray-matter parser
  - Data available in Nunjucks templates via `page.data` object
- **Module:** Build-time validation in `eleventy.config.js` - warn on invalid `try_id` UUID format
- **Data Flow:** YAML frontmatter → 11ty parser → Nunjucks template context → HTML output

**UX Design Context:**

- **Metadata:** `try: true` makes product discoverable via "Try Before You Buy" tag
- **Metadata:** `try_id` (lease template UUID) required for API lease request
- **User Discovery:** Products with `try: true` get green "Try Before You Buy" tag in catalogue

---

## Story 6.2: Generate "Try Before You Buy" Tag System

As a developer,
I want to automatically generate "Try Before You Buy" tag for products with `try: true` metadata,
So that users can filter catalogue by tryable products.

**Acceptance Criteria:**

**Given** product has `try: true` in frontmatter
**When** 11ty builds catalogue
**Then** product tags include "Try Before You Buy" tag automatically:

```nunjucks
{% if try %}
  {% set tags = tags | push("Try Before You Buy") %}
{% endif %}
```

**And** tag appears in:

- Product card in catalogue listing
- Product detail page
- Tag filter sidebar

**And** tag uses GOV.UK Design System tag component:

```nunjucks
{{ govukTag({
  text: "Try Before You Buy",
  classes: "govuk-tag--green"
}) }}
```

**And** tag styling:

- Green background (govuk-tag--green)
- Clear contrast with other tags (blue for product category tags)
- Consistent placement across all product views

**Prerequisites:** Story 6.1 (Metadata parsing)

**Technical Notes:**

- FR-TRY-42, FR-TRY-44, FR-TRY-45 covered
- GOV.UK Design System tag component already integrated
- Green color chosen for positive action (tryable = good for users)
- Tag filtering handled by existing 11ty catalogue filter logic (no new code needed)
- Tag addition happens at build time (static site generation)

**Architecture Context:**

- **ADR-015:** Static site generation (build-time tag injection)
  - Tags generated during 11ty build, not at runtime
  - No client-side JavaScript needed for tag display
- **Module:** Nunjucks macro `{% if try %}` in product card/detail templates
- **GOV.UK Component:** `govukTag` macro with `classes: "govuk-tag--green"`

**UX Design Context:**

- **Component:** Session Status Badge pattern (UX Section 6.2 Component 3) - adapted for product tags
- **Color:** Green (`govuk-tag--green`) - positive action, tryable products (UX Section 3.1)
- **Placement:** Product card (top-right) and product detail page (near title)
- **Accessibility:** Text + color (WCAG 1.4.1) - "Try Before You Buy" text, not just green color

---

## Story 6.3: Catalogue Tag Filter for "Try Before You Buy"

As a government user,
I want to filter catalogue by "Try Before You Buy" tag,
So that I can quickly find products I can try immediately.

**Acceptance Criteria:**

**Given** I am on the catalogue listing page (`/catalogue/`)
**When** I see the tag filter sidebar
**Then** "Try Before You Buy" tag appears in filter options
**And** tag shows count of tryable products (e.g., "Try Before You Buy (3)")

**When** I click "Try Before You Buy" tag filter
**Then** catalogue filters to show only products with `try: true`
**And** other products are hidden
**And** URL updates to include filter: `/catalogue/?tags=try-before-you-buy`
**And** filter state persists on page refresh

**When** I clear filter
**Then** all products are shown again
**And** URL reverts to `/catalogue/`

**Prerequisites:** Story 6.2 (Tag generation)

**Technical Notes:**

- FR-TRY-46 covered
- Existing 11ty catalogue filtering logic handles this (no new code needed)
- Tag slug: "try-before-you-buy" (URL-friendly)
- Count calculation: 11ty collection filter (`collections.tryableProducts`)
- Accessibility: Filter controls keyboard navigable, screen reader accessible

**Architecture Context:**

- **Brownfield:** Existing catalogue filter system (no new filtering code)
  - Tag-based filtering already implemented in NDX catalogue
  - "Try Before You Buy" tag automatically appears in filter sidebar
- **Module:** Existing `eleventy.config.js` collection filters handle tryable products
- **URL State:** Filter persists via query param `?tags=try-before-you-buy`

**UX Design Context:**

- **User Discovery:** Primary way users find tryable products in catalogue
- **Filter Sidebar:** "Try Before You Buy" tag with product count (e.g., "(3)")
- **Persistence:** Filter state survives page refresh (URL query param)
- **Accessibility:** Keyboard navigable, screen reader announces filter state changes

---

## Story 6.4: "Try this now for 24 hours" Button on Product Pages

As a government user,
I want to see "Try this now for 24 hours" button on tryable product pages,
So that I can quickly request sandbox access.

**Acceptance Criteria:**

**Given** I am on a product detail page with `try: true` metadata
**When** the page renders
**Then** I see "Try this now for 24 hours" button:

- Placement: Below product description, above "Contact" section
- Styling: GOV.UK Start Button (`govukButton` with `isStartButton: true`)
- Text: "Try this now for 24 hours"
- Icon: Arrow icon (→) indicating action

**And** button includes:

```nunjucks
{{ govukButton({
  text: "Try this now for 24 hours",
  isStartButton: true,
  attributes: {
    "data-module": "try-button",
    "data-try-id": try_id
  }
}) }}
```

**And** button has data attributes:

- `data-module="try-button"`: For JavaScript event handler
- `data-try-id="{{ try_id }}"`: Lease template UUID for API call

**And** button NOT shown on products without `try: true` metadata

**Prerequisites:** Story 6.3 (Tag filter)

**Technical Notes:**

- FR-TRY-47, FR-TRY-48 covered
- GOV.UK Start Button: Green with arrow icon (prominent call-to-action)
- data-try-id passed to JavaScript for lease request (Story 6.7)
- Button placement validated in UX review (Story 6.0)
- Accessibility: Button keyboard focusable, screen reader accessible

**Architecture Context:**

- **ADR-015:** Vanilla client-side JavaScript (no framework)
  - Event listener attached via `data-module="try-button"` pattern
  - GOV.UK Frontend JavaScript pattern (existing in NDX)
- **Module:** `src/try/ui/try-button.ts` - Try button event handler
- **Data Attributes:** `data-try-id="{{ try_id }}"` - lease template UUID for API call

**UX Design Context:**

- **Component:** Try Button (UX Section 6.2 Component 4)
- **Placement:** Below product description, above "Access" section (validated in UX review)
- **Styling:** GOV.UK Start Button - green, arrow icon (→), prominent CTA
- **Button Text:** "Try this now for 24 hours" - clear action + duration expectation
- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2, Step 1)
- **Touch Target:** Minimum 44x44px (WCAG 2.2 AAA - UX Section 7.7)

---

## Story 6.5: Try Button Authentication Check

As a developer,
I want Try button to check authentication before showing modal,
So that unauthenticated users are redirected to sign in first.

**Acceptance Criteria:**

**Given** I am on a product page with "Try" button
**When** I click "Try this now for 24 hours" button
**Then** client-side JavaScript checks authentication:

```javascript
document.querySelectorAll('[data-module="try-button"]').forEach((button) => {
  button.addEventListener("click", async function (event) {
    event.preventDefault()

    const tryId = this.getAttribute("data-try-id")
    const token = sessionStorage.getItem("isb-jwt")

    if (!token) {
      // User not authenticated - redirect to sign in
      window.location.href = "/api/auth/login"
    } else {
      // User authenticated - show lease request modal
      showLeaseRequestModal(tryId)
    }
  })
})
```

**And** unauthenticated users redirected to `/api/auth/login`
**And** after successful authentication, users returned to product page
**And** modal does NOT appear for unauthenticated users

**Prerequisites:** Story 6.4 (Try button rendered)

**Technical Notes:**

- FR-TRY-49, FR-TRY-50 covered
- Reuse authentication check from Epic 5
- OAuth callback returns to product page (preserves context)
- Try button click initiates modal flow (Story 6.6-6.9)

**Architecture Context:**

- **ADR-024:** AuthState integration - check `AuthState.isAuthenticated()` before showing modal
- **Module:** Reuse `src/try/auth/auth-provider.ts` - `isAuthenticated()` method
- **OAuth Flow:** Unauthenticated users → `/api/auth/login` → Return to product page → Auto-show modal

**UX Design Context:**

- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2, Steps 2-3)
- **Branch A (Unauthenticated):** Redirect to OAuth → Return to product page → Open AUP modal
- **Branch B (Authenticated):** Open AUP modal immediately
- **Preserves Intent:** System "remembers" user wanted to try (auto-opens modal after auth)
- **Pattern:** Friction-Free Flow (UX Principle 2 - no unnecessary steps)

---

## Story 6.6: Lease Request Modal Overlay UI

As a government user,
I want to see a modal overlay when I click "Try" button,
So that I can review AUP and request sandbox access.

**Acceptance Criteria:**

**Given** I am authenticated and click "Try" button
**When** modal opens
**Then** I see modal overlay with:

**Modal Structure:**

- Dark overlay background (semi-transparent black)
- White modal box (centered on screen)
- Modal header: "Request AWS Sandbox Access"
- Close button (X) in top-right corner

**Modal Content Sections:**

1. **Lease Details:**
   - "Duration: 24 hours"
   - "Maximum Budget: $50"

2. **Acceptable Use Policy:**
   - Heading: "Acceptable Use Policy"
   - Scrollable text container (AUP content from API)
   - Min-height: 200px, Max-height: 400px

3. **Consent:**
   - Checkbox: "I accept the Acceptable Use Policy"
   - Label associated with checkbox (for accessibility)

4. **Actions:**
   - "Cancel" button (secondary style)
   - "Continue" button (primary style, disabled until checkbox checked)

**And** modal uses GOV.UK Design System components:

- Modal overlay: Custom (GOV.UK doesn't have modal component, use accessible pattern)
- Buttons: `govukButton` macro
- Checkbox: `govukCheckboxes` macro

**Prerequisites:** Story 6.5 (Auth check on Try button)

**Technical Notes:**

- FR-TRY-51, FR-TRY-52, FR-TRY-53, FR-TRY-56 covered
- Modal HTML injected into page dynamically (JavaScript)
- Accessibility: Focus trap (modal only), Escape key closes modal (Story 6.9)
- AUP content fetched from API (Story 6.7)
- Checkbox state controls Continue button (Story 6.8)

**Architecture Context:**

- **ADR-026: CRITICAL - Accessible Modal Pattern (MUST IMPLEMENT FULLY)**

  **Focus Management:**
  - **Focus Trap:** Tab cycles through modal elements only (cannot Tab to background)
  - **Focus on Open:** Move focus to first interactive element (checkbox or Close button)
  - **Focus on Close:** Return focus to "Try" button that opened modal
  - **Tab Order:** Checkbox → Cancel button → Continue button → (cycles back to Checkbox)
  - **Shift+Tab:** Reverse order

  **Keyboard Navigation:**
  - **Tab / Shift+Tab:** Navigate through modal interactive elements
  - **Escape:** Close modal (with confirmation if checkbox checked - "Are you sure?")
  - **Enter/Space:** Activate focused button or checkbox

  **ARIA Attributes (CRITICAL for screen readers):**
  - `role="dialog"` on modal container
  - `aria-modal="true"` (informs screen readers background is inert)
  - `aria-labelledby="{modal-title-id}"` (associates modal with heading)
  - `aria-describedby="{modal-description-id}"` (optional - for AUP summary)
  - Background content: `aria-hidden="true"` OR `inert` attribute

  **Screen Reader Announcements:**
  - Modal open: "Dialog opened, Request AWS Sandbox Access"
  - Checkbox change: "Checkbox checked" / "Checkbox unchecked"
  - Button state: "Continue button, disabled" / "Continue button, enabled"
  - Modal close: Focus returns to trigger button (screen reader announces button)
  - Use `aria-live="polite"` for button state changes

  **Component Structure (Web Components):**
  - `<aup-modal>` Custom Element (extends HTMLElement)
  - Encapsulates modal logic, accessibility, focus trap
  - Reusable across application
  - TypeScript class: `AUPModal extends HTMLElement`

- **ADR-012:** Custom Elements for complex UI (modal as Web Component)
- **Module:** `src/try/ui/components/aup-modal.ts` - AUP Modal Custom Element
- **Module:** `src/try/ui/utils/focus-trap.ts` - Focus trap utility
- **Module:** `src/try/ui/utils/aria-live.ts` - ARIA live region announcements

**UX Design Context:**

- **Component Spec:** AUP Acceptance Modal (UX Section 6.2 Component 2) - FULL IMPLEMENTATION

  **Modal Anatomy (Desktop):**

  ```
  ┌─────────────────────────────────────────────────────────────┐
  │ [X] Close                 (top-right, optional)             │
  │                                                              │
  │ Try Before You Buy - Acceptable Use Policy  (H2 title)     │
  │ ─────────────────────────────────────────────────────────── │
  │                                                              │
  │ ┌─ Summary Box (highlighted) ──────────────────────────┐   │
  │ │ Duration: 24 hours                                     │   │
  │ │ Budget: $50 maximum spend                              │   │
  │ │ Purpose: Evaluation only (non-production use)         │   │
  │ └────────────────────────────────────────────────────────┘   │
  │                                                              │
  │ ┌─ Scrollable AUP Text (max-height: 300px) ────────────┐   │
  │ │ [Acceptable Use Policy full text with headings,       │   │
  │ │  bullet points, paragraphs - fetched from API]        │   │
  │ │                                                         │   │
  │ │ [Scroll indicator if content exceeds visible area]    │   │
  │ └────────────────────────────────────────────────────────┘   │
  │                                                              │
  │ ☐ I have read and accept the Acceptable Use Policy         │
  │   (checkbox, unchecked by default)                          │
  │                                                              │
  │ ─────────────────────────────────────────────────────────── │
  │ [Cancel] (secondary)              [Continue] (primary, disabled) │
  └─────────────────────────────────────────────────────────────┘

  Backdrop: Semi-transparent black (rgba(0,0,0,0.5))
  ```

  **Modal States:**
  - **Default:** Continue button disabled (grey), checkbox unchecked
  - **Checkbox Checked:** Continue button enabled (green), clickable
  - **Loading:** Continue button shows spinner + "Requesting your sandbox..."
  - **Success:** Brief "Sandbox ready!" message before closing
  - **Error:** Error message displayed above buttons (GOV.UK error styling)

  **Responsive Variants:**
  - **Desktop (769px+):** Modal centered, max-width 600px, padding 40px
  - **Tablet (641-768px):** Modal centered, max-width 80%, padding 30px
  - **Mobile (<640px):** Modal full-screen (100% width/height), padding 20px

  **Behavior:**
  - **Open:** Triggered by "Try" button click (if authenticated)
  - **Backdrop click:** Does nothing (must use Cancel or Escape to close)
  - **Escape key:** Closes modal (if checkbox unchecked) or shows confirmation "Are you sure?" (if checkbox checked)
  - **Checkbox change:** Enables/disables Continue button
  - **Continue click:** Submits lease request API call, shows loading state
  - **Cancel click:** Closes modal without action
  - **Success:** Shows "Sandbox ready!" for 1 second, then closes and redirects
  - **Error:** Shows error message, modal remains open for retry

  **Accessibility (WCAG 2.2 AA):**
  - **Focus trap:** Tab cycles through modal elements (implemented in focus-trap.ts)
  - **Focus on open:** First interactive element (checkbox or Close button) receives focus
  - **Focus on close:** Returns focus to "Try" button that opened modal
  - **ARIA:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby="{modal title id}"`
  - **Checkbox label:** Associated with checkbox input (for/id)
  - **Screen reader:** Announces modal title, AUP text headings, checkbox state, button states
  - **Keyboard:** Tab (next), Shift+Tab (previous), Escape (close), Enter/Space (activate button)
  - **Loading state:** ARIA live region announces "Requesting your sandbox"
  - **Error state:** ARIA live region announces error message

- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2, Step 3)
- **Most Critical UX Moment:** AUP acceptance (UX Principle 3 - AUP Acceptance Done Right)
- **Design Goal:** Balance legal compliance with usability (encourage reading without abandoning flow)
- **Pattern:** Brief confirmations, then redirect (UX Section 7.4)

---

## Story 6.7: Fetch and Display AUP from Innovation Sandbox API

As a government user,
I want to see the Acceptable Use Policy in the lease request modal,
So that I understand terms before requesting sandbox access.

**Acceptance Criteria:**

**Given** lease request modal is opening
**When** JavaScript calls `GET /api/configurations`
**Then** API returns configuration object:

```json
{
  "aup": "Acceptable Use Policy\n\n1. You must not...\n2. You must...\n\n[Full AUP text]",
  "maxLeases": 5,
  "leaseDuration": 24
}
```

**And** client-side code extracts AUP text:

```javascript
async function fetchAUP() {
  try {
    const response = await callISBAPI("/api/configurations")
    const config = await response.json()
    return config.aup
  } catch (error) {
    console.error("Failed to fetch AUP:", error)
    return "Unable to load Acceptable Use Policy. Please try again later."
  }
}

async function showLeaseRequestModal(tryId) {
  const aup = await fetchAUP()

  // Render modal with AUP text
  const modalHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h2>Request AWS Sandbox Access</h2>
        <p><strong>Duration:</strong> 24 hours</p>
        <p><strong>Maximum Budget:</strong> $50</p>

        <h3>Acceptable Use Policy</h3>
        <div class="aup-container" style="max-height: 400px; overflow-y: auto;">
          ${aup.replace(/\n/g, "<br>")}
        </div>

        <!-- Checkbox and buttons (Story 6.8) -->
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)
}
```

**And** AUP text displayed in scrollable container
**And** loading indicator shown while fetching AUP
**And** error handling if API call fails (show error message in modal)

**Prerequisites:** Story 6.6 (Modal UI structure)

**Technical Notes:**

- FR-TRY-21, FR-TRY-54, FR-TRY-55 covered
- AUP text returned as plain text with newlines (convert to <br> for HTML)
- Scrollable container: `overflow-y: auto`, `max-height: 400px`
- API call includes Authorization header (Epic 5 helper function)
- Accessibility: AUP container focusable for keyboard scrolling

**Architecture Context:**

- **ADR-021:** Centralized API client - Use `callISBAPI('/api/configurations')`
- **API Endpoint:** `GET /api/configurations` (Innovation Sandbox backend)
- **Response Type:** `{ aup: string; maxLeases: number; leaseDuration: number }`
- **Module:** `src/try/api/types.ts` - `ConfigurationResponse` interface
- **Loading State:** Optimistic UI - show skeleton text while fetching (validated decision)
- **Error Handling:** ADR-032 - "Unable to load Acceptable Use Policy. Please try again later."
- **Caching:** No caching - fetch fresh AUP each modal open (policy may update)

**UX Design Context:**

- **Component:** AUP modal scrollable container (UX Section 6.2 Component 2)
- **Max Height:** 300px desktop (not 400px - UX spec is 300px), adaptive on mobile
- **Scroll Indicator:** Visual cue if content exceeds visible area
- **Loading State:** Skeleton screen shows ~3 lines of grey bars while fetching (UX Section 6.2 Component 6)
- **Error State:** UX Section 5.1 Journey 5 Error #5 - AUP fetch failed
- **Accessibility:** Container has `tabindex="0"` for keyboard scrolling, ARIA label "Acceptable Use Policy"

---

## Story 6.8: AUP Checkbox and Continue Button State

As a government user,
I want the "Continue" button disabled until I check the AUP acceptance checkbox,
So that I explicitly consent before requesting sandbox access.

**Acceptance Criteria:**

**Given** lease request modal is open
**When** I see the AUP checkbox
**Then** checkbox is unchecked by default
**And** "Continue" button is disabled (visual styling: grayed out, not clickable)

**When** I check the AUP checkbox
**Then** "Continue" button becomes enabled (primary button styling, clickable)

**When** I uncheck the AUP checkbox
**Then** "Continue" button becomes disabled again

**And** JavaScript handles checkbox state:

```javascript
const aupCheckbox = document.getElementById("aup-checkbox")
const continueButton = document.getElementById("modal-continue-button")

// Initial state: Button disabled
continueButton.disabled = true

// Listen for checkbox changes
aupCheckbox.addEventListener("change", function () {
  continueButton.disabled = !this.checked
})
```

**And** disabled button has accessible ARIA attributes:

```html
<button id="modal-continue-button" disabled aria-disabled="true">Continue</button>
```

**And** clicking "Cancel" button closes modal without action
**And** clicking "Continue" button (when enabled) submits lease request (Story 6.9)

**Prerequisites:** Story 6.7 (AUP fetched and displayed)

**Technical Notes:**

- FR-TRY-57, FR-TRY-58 covered
- GOV.UK Design System disabled button styling
- Accessibility: Disabled state announced to screen readers
- Cancel button closes modal (removes from DOM, no API call)
- Continue button triggers lease request (Story 6.9)

**Architecture Context:**

- **ADR-012:** Custom Element event handling - checkbox change triggers button state update
- **Module:** `src/try/ui/components/aup-modal.ts` - Checkbox event listener in AUPModal class
- **Reactive State:** Checkbox checked → Button enabled (no dark patterns - user must actively check)
- **ADR-028:** ARIA live region announces button state change
  - `aria-live="polite"` region: "Continue button enabled" when checkbox checked

**UX Design Context:**

- **Component:** AUP Modal states (UX Section 6.2 Component 2 - Modal States)
- **Default State:** Continue button disabled (grey), checkbox unchecked (UX Principle 3 - no dark patterns)
- **Checked State:** Continue button enabled (green GOV.UK primary button)
- **Button Labels:** "Cancel" (secondary), "Continue" (primary) - clear purpose from labels
- **No Pre-checking:** Checkbox starts unchecked (UX Principle 3 - AUP Acceptance Done Right)
- **Accessibility:** Button disabled state announced via `aria-disabled="true"` and visual styling
- **Pattern:** Calm Through Predictability (UX Principle 5 - users know button will enable when checked)

---

## Story 6.9: Submit Lease Request and Handle Responses

As a government user,
I want to request sandbox access by clicking "Continue" in the modal,
So that I can receive AWS sandbox environment.

**Acceptance Criteria:**

**Given** I have checked AUP checkbox and click "Continue"
**When** JavaScript submits lease request
**Then** API call made to `POST /api/leases`:

```javascript
async function requestLease(tryId) {
  const continueButton = document.getElementById("modal-continue-button")

  // Show loading state
  continueButton.disabled = true
  continueButton.textContent = "Requesting..."

  try {
    const response = await callISBAPI("/api/leases", {
      method: "POST",
      body: JSON.stringify({
        leaseTemplateId: tryId,
        acceptedAUP: true,
      }),
    })

    if (response.ok) {
      // Success: Navigate to /try page
      window.location.href = "/try"
    } else if (response.status === 409) {
      // Conflict: Max leases exceeded
      alert(
        "You have reached the maximum number of active sandbox leases (5). Please terminate an existing lease before requesting a new one.",
      )
      window.location.href = "/try"
    } else {
      // Other error
      const error = await response.json()
      alert(`Request failed: ${error.message || "Unknown error"}`)
    }
  } catch (error) {
    console.error("Lease request error:", error)
    alert("Failed to request sandbox access. Please try again later.")
  } finally {
    // Close modal
    closeModal()
  }
}
```

**And** request includes:

- `leaseTemplateId`: UUID from Try button `data-try-id`
- `acceptedAUP`: true (user consent)

**And** response handling:

- **200 OK:** Navigate to `/try` page (shows new lease)
- **409 Conflict:** Alert user "Max leases exceeded", redirect to `/try`
- **Other errors:** Alert user with error message, close modal

**And** loading indicator shown during request (button text: "Requesting...")
**And** modal closes after successful request or error

**Prerequisites:** Story 6.8 (Checkbox state management)

**Technical Notes:**

- FR-TRY-22, FR-TRY-59, FR-TRY-60, FR-TRY-61, FR-TRY-62, FR-TRY-63, FR-TRY-64, FR-TRY-65 covered
- POST /api/leases payload: `{ leaseTemplateId: string, acceptedAUP: boolean }`
- 409 Conflict: Max leases = 5 (returned from API configuration)
- Navigate to /try page on success (Story 7.1 shows leases)
- JavaScript alert for errors (acceptable for MVP, can improve UX later)

**Architecture Context:**

- **ADR-021:** Centralized API client `POST /api/leases`
- **API Endpoint:** `POST /api/leases` - Create new lease
- **Request Type:** `{ leaseTemplateId: string; acceptedAUP: boolean }`
- **Response Type (201):** `{ leaseId: string; awsAccountId: string; expirationDate: string; ... }`
- **Module:** `src/try/api/types.ts` - `LeaseRequest`, `LeaseResponse` interfaces
- **ADR-032:** User-friendly error messages (validated)
  - 409: "You've reached the maximum of 3 active sessions. Terminate an existing session or wait for one to expire."
  - 400: "This service is temporarily unavailable for trial. Please try again later or contact support."
  - 500/503: "The sandbox service is temporarily unavailable. Please try again in a few minutes."
  - Network timeout: "Request timed out. Please check your connection and try again."
- **Loading State:** Optimistic UI - button shows spinner + "Requesting your sandbox..." (validated decision)
- **Timeout:** NFR-TRY-PERF-2 - 10 second timeout for API call

**UX Design Context:**

- **User Journey:** Try Request Flow (UX Section 5.1 Journey 2, Steps 4-6)
- **Step 4:** User clicks Continue → Show loading state
- **Step 5:** Lease request submitted → API call in progress
- **Step 6 (Success):** "Sandbox ready!" brief message (1 second) → Redirect to /try page
- **Step 6 (Error):** Show error message, modal remains open for retry
- **Loading State:** Button text changes to "Requesting your sandbox..." with spinner (UX Section 6.2 Component 6)
- **Success State:** "Sandbox ready!" shows for 1 second before redirect (UX Section 7.4 - brief confirmations)
- **Error Handling:** UX Section 5.1 Journey 5 - Error Handling Flows
  - Error #1: Max Leases Exceeded (409) - Alert + redirect to /try
  - Error #3: Network Timeout/API Unavailable (500/503)
  - Error #4: Invalid Lease Template (400)
- **Pattern:** Friction-Free Flow (UX Principle 2 - < 30 seconds to sandbox access)

---

## Story 6.10: Epic 6-7 Integration Testing

As a developer,
I want to validate that catalogue Try flow integrates correctly with dashboard display,
So that new lease requests appear in /try page immediately.

**Acceptance Criteria:**

**Given** I am authenticated and on a tryable product page
**When** I complete end-to-end Try flow:

1. Click "Try this now for 24 hours" button
2. Modal opens with AUP
3. Check AUP checkbox
4. Click "Continue"
5. Request succeeds (200 OK)
6. Navigated to `/try` page

**Then** I see my new lease in the sessions table:

- Template Name: Product name
- AWS Account ID: Assigned account ID
- Expiry: 24 hours from now
- Budget: "$0.0000 / $50.00"
- Status: "Pending" or "Active" (badge)
- Launch button: Visible if status "Active"

**And** integration test validates:

- Lease appears immediately (no page refresh needed)
- Lease data matches expected format
- Session table sorting works (newest first)
- Launch button functional (Story 7.6)

**Prerequisites:** Story 6.9 (Lease request submission)

**Technical Notes:**

- Integration story from Pre-mortem preventive measure #4 (user acceptance)
- Validates Epic 6 → Epic 7 handoff
- End-to-end test: Catalogue → Modal → API → Dashboard
- Tests real API integration (not mocked)
- Validates data flow correctness (lease appears in /try page)

**Architecture Context:**

- **ADR-004:** Integration tests run before Pa11y tests (layered testing)
- **Testing:** `test/integration/epic-6-7-handoff.test.ts` - End-to-end flow validation
- **Test Stack:** Playwright for browser automation + real Innovation Sandbox API (staging environment)
- **Validation Points:**
  1. Try button click opens modal (ADR-026 focus trap active)
  2. AUP fetch succeeds (ADR-021 API client)
  3. Checkbox enables button (ADR-012 Custom Element state)
  4. POST /api/leases succeeds (201 Created)
  5. Redirect to /try page (window.location.href)
  6. Lease appears in table (Epic 7 Story 7.2)
- **Test Data:** Use test lease template UUID (not production template)
- **Cleanup:** Delete test lease after test completes (idempotent tests)

**UX Design Context:**

- **User Journey:** Complete Try Request Flow (UX Section 5.1 Journey 2 - all steps)
- **Validation:** User completes entire flow < 30 seconds (UX Principle 2 - friction-free)
- **Success Criteria:** New lease visible immediately without page refresh
- **Integration Point:** Catalogue (Epic 6) → Dashboard (Epic 7) seamless transition

---

## Story 6.11: Automated Accessibility Tests for Catalogue Try UI

As a developer,
I want automated accessibility tests for Try button and modal,
So that catalogue integration meets WCAG 2.2 AA standards.

**Acceptance Criteria:**

**Given** Try button and lease request modal exist
**When** I run automated accessibility tests
**Then** tests validate:

**Test 1: Try Button Accessibility**

- Button keyboard focusable
- Button has accessible label
- Start button icon has ARIA hidden (decorative)
- Focus indicator visible

**Test 2: Modal Accessibility**

- Modal overlay has ARIA role="dialog"
- Modal has accessible name (aria-labelledby)
- Focus trap works (tab cycles within modal)
- Escape key closes modal
- Close button (X) keyboard accessible

**Test 3: AUP Checkbox**

- Checkbox keyboard focusable
- Label associated with checkbox (for attribute)
- Checkbox state announced to screen readers

**Test 4: Modal Buttons**

- Cancel/Continue buttons keyboard accessible
- Disabled state announced (aria-disabled)
- Button purpose clear from labels

**And** tests run in CI pipeline
**And** tests cover all Epic 6 UI components

**Prerequisites:** Story 6.10 (Integration testing complete)

**Technical Notes:**

- Accessibility testing per Pre-mortem preventive measure #3
- Use axe-core for automated validation
- Modal focus trap: FR-TRY-72, FR-TRY-73
- Keyboard navigation: FR-TRY-70, FR-TRY-71
- Full manual accessibility audit in Epic 8

**Architecture Context:**

- **ADR-037:** Mandatory accessibility testing gate (cannot merge PR without passing)
- **ADR-004:** Pa11y integration for WCAG 2.2 AA validation
  - Zero violations allowed for AA compliance
  - Tests run in CI on every commit to Epic 6 stories
- **Testing:** `test/accessibility/epic-6-a11y.test.ts` - Catalogue Try UI accessibility
- **Test Coverage:**
  1. Try button: `pa11y(product-page-url)` - validate button accessibility
  2. Modal open: `pa11y(modal-open-state)` - validate dialog ARIA
  3. Focus trap: Automated tab sequence validation
  4. Keyboard nav: Automated Escape/Enter key handling
  5. Checkbox: ARIA attributes and label association
- **CI Integration:** GitHub Actions runs Pa11y on every PR
- **Failure Mode:** PR blocked if ANY WCAG 2.2 AA violations detected

**UX Design Context:**

- **WCAG 2.2 Compliance:** Section 8.1 - AA minimum for all Epic 6 components
- **Keyboard Navigation:** All Try flow components keyboard accessible (UX Section 8.3)
- **Screen Reader:** NVDA/VoiceOver can complete full flow (validated in Epic 8)
- **Focus Management:** Focus trap, focus return tested automatically
- **Touch Targets:** All buttons/checkboxes ≥ 44x44px (WCAG 2.2 AAA - UX Section 7.7)

---
