# Epic 7: Try Sessions Dashboard

**Goal:** Government users can view, manage, and launch their AWS sandbox sessions

**User Value:** Users see all their sandbox leases in one place, know when they expire, track budget usage, and launch AWS Console for active sessions

**FRs Covered:** FR-TRY-18 through FR-TRY-23, FR-TRY-25 through FR-TRY-41 (22 FRs)

---

## Story 7.1: Create /try Page Route and Layout

As a government user,
I want to visit /try page to see my sandbox sessions,
So that I can manage my AWS sandbox access in one place.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I navigate to `/try` page
**Then** I see page layout with:

**Page Header:**
- Heading: "Your try sessions" (govukHeading, size: l)
- Subheading: "Manage your AWS sandbox environments"

**Page Content:**
- Sessions table (Story 7.2)
- Empty state if no leases (Epic 5, Story 5.9)
- Link to catalogue filter (Story 7.9)

**And** page uses GOV.UK Design System layout:
- Full-width container
- Main content area
- Consistent navigation (header/footer)

**And** page is responsive (mobile/tablet/desktop)

**Prerequisites:** Epic 6 complete (Story 6.11)

**Technical Notes:**
- FR-TRY-25, FR-TRY-28 covered
- 11ty page: `/source/try.njk` or `/source/try/index.njk`
- Layout template: extends base GOV.UK layout
- Authentication check: Client-side JavaScript (Epic 5)
- Empty state already implemented (Epic 5, Story 5.9)

**Architecture Context:**
- **ADR-015:** Vanilla Eleventy with TypeScript (brownfield constraint - no framework)
- **Module:** `src/try/pages/try-page.ts` - /try page component initialization
- **ADR-024:** AuthState subscription - page subscribes to auth state changes, shows empty state if unauthenticated
- **Page Structure:** Standard GOV.UK layout with main content area

**UX Design Context:**
- **User Journey:** Try Sessions Dashboard (UX Section 5.1 Journey 3)
- **Page Title:** "Your try sessions" - clear ownership (UX Principle 1 - ownership clarity)
- **Navigation:** Consistent GOV.UK header/footer across all pages
- **Responsive:** Mobile-first design (UX Section 4.2 - mobile breakpoints)

---

## Story 7.2: Fetch and Display User Leases

As a government user,
I want to see all my sandbox leases in a table,
So that I can track my active and expired sessions.

**Acceptance Criteria:**

**Given** I am authenticated and on `/try` page
**When** page loads
**Then** JavaScript fetches leases from API:

```javascript
async function loadUserLeases() {
  try {
    // Get user email from auth status
    const authStatus = await checkAuthStatus();
    const userEmail = authStatus.user.email;

    // Fetch leases
    const response = await callISBAPI(`/api/leases?userEmail=${encodeURIComponent(userEmail)}`);
    const leases = await response.json();

    // Render sessions table
    renderSessionsTable(leases);
  } catch (error) {
    console.error('Failed to load leases:', error);
    showErrorMessage('Unable to load your try sessions. Please refresh the page.');
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', loadUserLeases);
```

**And** API response contains array of leases:
```json
[
  {
    "uuid": "lease-uuid-1",
    "status": "Active",
    "awsAccountId": "123456789012",
    "maxSpend": 50.00,
    "totalCostAccrued": 12.3456,
    "expirationDate": "2025-11-23T14:30:00Z",
    "leaseTemplate": {
      "name": "AWS Innovation Sandbox"
    }
  }
]
```

**And** table displays all leases (active, pending, expired, terminated)
**And** empty state shown if leases array empty (FR-TRY-29)
**And** error message shown if API call fails

**Prerequisites:** Story 7.1 (/try page created)

**Technical Notes:**
- FR-TRY-18, FR-TRY-19 covered
- GET /api/leases requires userEmail query parameter
- User email obtained from auth status check (Epic 5)
- Leases sorted by creation date (newest first) in Story 7.3
- Authorization header included (Epic 5 API helper)

**Architecture Context:**
- **ADR-021:** Centralized API client `GET /api/leases?userEmail={email}`
- **API Endpoint:** `GET /api/leases` - Fetch user's leases
- **Query Param:** `userEmail` (required) - filters leases by user
- **Response Type:** `Lease[]` array with status, awsAccountId, maxSpend, totalCostAccrued, expirationDate, leaseTemplate
- **Module:** `src/try/api/types.ts` - `Lease` interface
- **Loading State:** Optimistic UI - skeleton table rows while fetching (validated decision)
- **Error Handling:** ADR-032 - "Unable to load your try sessions. Please refresh the page."

**UX Design Context:**
- **User Journey:** Try Sessions Dashboard (UX Section 5.1 Journey 3, Step 2)
- **Loading State:** Skeleton screen shows 3 table rows with grey bars (UX Section 6.2 Component 6)
- **Empty State:** "Sign in to view your try sessions" if unauthenticated (Epic 5 Story 5.9)
- **Data Display:** All leases shown regardless of status (Active, Pending, Expired, Terminated, Failed)

---

## Story 7.3: Render Sessions Table with GOV.UK Design System

As a government user,
I want to see my sandbox sessions in a clear table format,
So that I can quickly scan session details.

**Acceptance Criteria:**

**Given** leases data is fetched
**When** sessions table renders
**Then** I see GOV.UK Design System table with columns:

| Template Name | AWS Account ID | Expiry | Budget | Status |
|---------------|----------------|--------|--------|--------|
| AWS Innovation Sandbox | 123456789012 | In 23 hours | $12.3456 / $50.00 | Active |

**And** table uses `govukTable` macro:
```nunjucks
{{ govukTable({
  head: [
    { text: "Template Name" },
    { text: "AWS Account ID" },
    { text: "Expiry" },
    { text: "Budget" },
    { text: "Status" }
  ],
  rows: sessionsRows
}) }}
```

**And** table features:
- Responsive on mobile (horizontal scroll or stacked cards)
- Sortable by creation date (newest first)
- Clear visual distinction between active and expired sessions

**Prerequisites:** Story 7.2 (Leases data fetched)

**Technical Notes:**
- FR-TRY-30, FR-TRY-36 covered
- GOV.UK table component: responsive by default
- Mobile adaptation: Consider card view for better UX
- Sorting: Client-side JavaScript (leases.sort())
- Session distinction: Story 7.4 (status badges)

**Architecture Context:**
- **ADR-027: CRITICAL - Responsive Table Transformation Pattern (ONS Style)**

  **Desktop Table (≥769px):**
  - Traditional HTML `<table>` with `<thead>` and `<tbody>`
  - Columns: Template Name | AWS Account ID | Expiry | Budget | Status | Actions
  - GOV.UK table styling (`govuk-table`)
  - Horizontal scrolling if needed (rare with 6 columns)

  **Mobile/Tablet Stacked Cards (<769px):**
  - **CSS-First Solution** (no JavaScript table → card transformation)
  - Each `<tr>` becomes a vertical card
  - Labels inline with values: `Template: AWS Innovation Sandbox | Account: 123456789012`
  - Status badge in top-right corner of card
  - Launch button full-width at bottom of card
  - Card styling: GOV.UK panel or card component adapted

  **HTML Structure (Same markup, CSS transforms it):**
  ```html
  <table class="govuk-table sessions-table">
    <thead class="govuk-table__head">
      <tr>
        <th scope="col">Template Name</th>
        <th scope="col">AWS Account ID</th>
        <th scope="col">Expiry</th>
        <th scope="col">Budget</th>
        <th scope="col">Status</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody class="govuk-table__body">
      <tr data-status="Active">
        <td>AWS Innovation Sandbox</td>
        <td>123456789012</td>
        <td>In 23 hours</td>
        <td>$12.35 / $50.00</td>
        <td><span class="govuk-tag govuk-tag--green">Active</span></td>
        <td><a href="..." class="govuk-button">Launch AWS Console</a></td>
      </tr>
    </tbody>
  </table>
  ```

  **CSS Transformation (Mobile <769px):**
  ```css
  @media (max-width: 768px) {
    .sessions-table thead { display: none; }
    .sessions-table, .sessions-table tbody, .sessions-table tr, .sessions-table td {
      display: block;
    }
    .sessions-table tr {
      border: 2px solid #b1b4b6;
      margin-bottom: 20px;
      padding: 15px;
      position: relative;
    }
    .sessions-table td {
      text-align: left;
      padding: 8px 0;
    }
    .sessions-table td::before {
      content: attr(data-label) ": ";
      font-weight: bold;
      display: inline;
    }
    /* Status badge positioned top-right */
    .sessions-table td:nth-of-type(5) {
      position: absolute;
      top: 15px;
      right: 15px;
    }
    /* Launch button full-width at bottom */
    .sessions-table td:nth-of-type(6) .govuk-button {
      width: 100%;
      margin-top: 10px;
    }
  }
  ```

  **Mobile Card Layout (validated - labels inline):**
  ```
  ┌─ Session Card ──────────────────────────┐
  │                          [Active] 🟢    │ (Status top-right)
  │                                         │
  │ Template: AWS Innovation Sandbox        │
  │ Account: 123456789012                   │
  │ Expiry: In 23 hours                     │
  │ Budget: $12.35 / $50.00                 │
  │                                         │
  │ [Launch AWS Console] (full-width btn)  │
  └─────────────────────────────────────────┘
  ```

- **ADR-008:** Mobile-first CSS (UX validated decision)
- **Module:** `src/try/ui/styles/sessions-table.css` - Responsive table CSS
- **Module:** `src/try/ui/components/sessions-table.ts` - Table rendering logic

**UX Design Context:**
- **Component:** Sessions Table (UX Section 6.2 Component 1) - FULL IMPLEMENTATION
- **Desktop (≥769px):** Traditional table with 6 columns
- **Mobile (<769px):** Stacked cards with labels inline with values (validated decision)
- **Breakpoint:** 768px (UX Section 4.2 - responsive breakpoints)
- **Touch Targets:** All interactive elements ≥ 44x44px (WCAG 2.2 AAA - UX Section 7.7)
- **Sorting:** Newest leases first (creation date descending) - helps users find latest sessions
- **Accessibility:** Table headers with `scope="col"`, ARIA labels for screen readers, keyboard navigable

---

## Story 7.4: Status Badge Display with Color Coding

As a government user,
I want to see color-coded status badges for my sessions,
So that I can quickly identify active vs. expired sessions.

**Acceptance Criteria:**

**Given** sessions table is rendered
**When** each row displays status
**Then** I see color-coded status badge using `govukTag`:

**Status: Active**
- Badge color: Green (govuk-tag--green)
- Text: "Active"

**Status: Pending**
- Badge color: Blue (govuk-tag--blue)
- Text: "Pending"

**Status: Expired**
- Badge color: Grey (govuk-tag--grey)
- Text: "Expired"

**Status: Terminated**
- Badge color: Red (govuk-tag--red)
- Text: "Terminated"

**Status: Failed**
- Badge color: Red (govuk-tag--red)
- Text: "Failed"

**And** JavaScript generates badge HTML:
```javascript
function renderStatusBadge(status) {
  const badgeConfig = {
    Active: 'govuk-tag--green',
    Pending: 'govuk-tag--blue',
    Expired: 'govuk-tag--grey',
    Terminated: 'govuk-tag--red',
    Failed: 'govuk-tag--red'
  };

  const tagClass = badgeConfig[status] || '';

  return `
    <span class="govuk-tag ${tagClass}">
      ${status}
    </span>
  `;
}
```

**And** status badges use BOTH color AND text (not color-only - FR-TRY-77)
**And** badges meet WCAG 2.2 AA color contrast requirements

**Prerequisites:** Story 7.3 (Sessions table rendered)

**Technical Notes:**
- FR-TRY-35, FR-TRY-77 covered
- GOV.UK Design System tag component (color-coded)
- Accessibility: Color + text (not color-only)
- Status values from API: Active, Pending, Expired, Terminated, Failed
- Visual distinction: FR-TRY-37 covered

**Architecture Context:**
- **Module:** `src/try/ui/utils/status-badge.ts` - Status badge rendering utility
- **ADR-008:** Color + text labels (WCAG 1.4.1 - not color-only indication)
- **GOV.UK Component:** `govuk-tag` with modifier classes (`--green`, `--blue`, `--grey`, `--red`)

**UX Design Context:**
- **Component:** Session Status Badge (UX Section 6.2 Component 3)
- **Color Mapping:** Green (Active), Blue (Pending), Grey (Expired), Red (Terminated/Failed)
- **Accessibility:** Text + color convey status (WCAG 1.4.1 - UX Section 8.1)
- **Mobile:** Badge positioned top-right in card layout (ADR-027)

---

## Story 7.5: Expiry Date Formatting (Relative and Absolute)

As a government user,
I want to see expiry dates in easy-to-understand formats,
So that I know when my sessions will expire.

**Acceptance Criteria:**

**Given** session has expiration date
**When** expiry column renders
**Then** I see formatted expiry:

**For future expirations (not yet expired):**
- Format: Relative time (e.g., "In 23 hours", "In 45 minutes")
- Uses `timeago.js` or similar library

**For past expirations (already expired):**
- Format: Absolute date/time (e.g., "22 Nov 2025, 14:30")
- Uses UK date format (day month year)

**And** JavaScript formats expiry:
```javascript
function formatExpiry(expirationDate) {
  const expiry = new Date(expirationDate);
  const now = new Date();

  if (expiry > now) {
    // Future: Relative time
    return formatRelativeTime(expiry, now);
  } else {
    // Past: Absolute date/time
    return expiry.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function formatRelativeTime(future, now) {
  const diffMs = future - now;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    return `In ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
}
```

**And** expiry updates automatically (refresh every minute for relative times)
**And** screen reader announces expiry clearly (ARIA labels)

**Prerequisites:** Story 7.4 (Status badges)

**Technical Notes:**
- FR-TRY-31, FR-TRY-32 covered
- ISO 8601 date format from API: "2025-11-23T14:30:00Z"
- UK date format: DD MMM YYYY, HH:MM
- Consider using `date-fns` or `dayjs` library for formatting
- Auto-refresh: setInterval every 60 seconds (update relative times)

**Architecture Context:**
- **Module:** `src/try/ui/utils/date-formatter.ts` - Date/time formatting utilities
- **Library:** `date-fns` for date manipulation (lightweight alternative to moment.js)
- **Auto-refresh:** `setInterval` updates relative times every 60 seconds (performance: minimal CPU)
- **Locale:** UK date format (`en-GB`) per government standard

**UX Design Context:**
- **Format:** Relative for future ("In 23 hours"), Absolute for past ("22 Nov 2025, 14:30")
- **User Benefit:** Easy to understand "In X hours" vs. interpreting timestamps
- **Accessibility:** Screen reader announces time clearly (ARIA label with full date/time)

---

## Story 7.6: Budget Display with Cost Formatting

As a government user,
I want to see budget usage with cost accrued and max spend,
So that I can track how much of my sandbox budget I've used.

**Acceptance Criteria:**

**Given** session has cost data
**When** budget column renders
**Then** I see formatted budget:

**Format:** `$XX.XXXX / $YY.YY`
- Cost accrued: 4 decimal places (e.g., $12.3456)
- Max spend: 2 decimal places (e.g., $50.00)

**And** JavaScript formats budget:
```javascript
function formatBudget(totalCostAccrued, maxSpend) {
  const costFormatted = totalCostAccrued.toFixed(4);
  const maxFormatted = maxSpend.toFixed(2);

  return `$${costFormatted} / $${maxFormatted}`;
}
```

**And** budget display includes:
- Clear separator: " / " between accrued and max
- Currency symbol: "$" (USD)
- Precision: 4 decimals for accrued (AWS billing precision), 2 for max

**And** screen reader announces budget clearly:
```html
<span aria-label="Budget: $12.35 used of $50 maximum">
  $12.3456 / $50.00
</span>
```

**Prerequisites:** Story 7.5 (Expiry formatting)

**Technical Notes:**
- FR-TRY-33, FR-TRY-34, FR-TRY-75 covered
- AWS billing precision: 4 decimal places (microdollars)
- Max spend typically: $50 (from lease template)
- Accessibility: ARIA label for screen readers (clear pronunciation)

**Architecture Context:**
- **Module:** `src/try/ui/utils/currency-formatter.ts` - Budget formatting utility
- **Precision:** Cost accrued 4 decimals (AWS microdollar precision), Max spend 2 decimals
- **Format:** `$XX.XXXX / $YY.YY` (clear separator)

**UX Design Context:**
- **User Value:** Track spend at AWS precision level (costs accrue in tiny increments)
- **Format:** Clear separator "/" between accrued and max
- **Accessibility:** ARIA label "Budget: $12.35 used of $50 maximum" for screen readers

---

## Story 7.7: "Launch AWS Console" Button for Active Sessions

As a government user,
I want to see "Launch AWS Console" button for active sessions,
So that I can quickly access my sandbox environment.

**Acceptance Criteria:**

**Given** session has status "Active"
**When** session row renders
**Then** I see "Launch AWS Console" button in Actions column:

**Button Appearance:**
- Text: "Launch AWS Console"
- Styling: GOV.UK primary button (govukButton)
- Icon: External link icon (indicating opens new tab)

**And** button opens AWS SSO portal in new tab:
```javascript
function renderLaunchButton(status, awsAccountId) {
  if (status !== 'Active') {
    return ''; // No button for non-active sessions
  }

  const ssoURL = `https://YOUR-SSO-PORTAL.awsapps.com/start#/`;

  return `
    <a href="${ssoURL}" target="_blank" rel="noopener noreferrer" class="govuk-button">
      Launch AWS Console
      <svg class="govuk-button__icon" aria-hidden="true">...</svg>
    </a>
  `;
}
```

**And** button NOT shown for sessions with status:
- Pending (not ready yet)
- Expired (access revoked)
- Terminated (access revoked)
- Failed (never provisioned)

**And** clicking button opens AWS SSO portal in new tab
**And** button keyboard accessible and screen reader friendly

**Prerequisites:** Story 7.6 (Budget display)

**Technical Notes:**
- FR-TRY-38, FR-TRY-39, FR-TRY-41 covered
- AWS SSO portal URL: Configured in Story 7.11
- target="_blank" opens new tab
- rel="noopener noreferrer" for security
- External link icon: SVG icon from GOV.UK Design System

**Architecture Context:**
- **Module:** `src/try/ui/components/launch-button.ts` - Launch button rendering
- **Security:** `rel="noopener noreferrer"` prevents tabnabbing attack
- **Link Target:** Opens AWS SSO portal in new tab (user stays logged in to NDX)
- **Conditional:** Only rendered for status "Active" (not Pending/Expired/Terminated/Failed)

**UX Design Context:**
- **Button Text:** "Launch AWS Console" - clear action (UX Section 6.2 Component 1)
- **External Link:** Icon indicates opens new tab
- **New Tab:** Users keep NDX /try page open (can return to check other sessions)
- **Touch Target:** ≥ 44x44px (WCAG 2.2 AAA - UX Section 7.7)
- **Mobile:** Full-width button at bottom of card (ADR-027)

---

## Story 7.8: Remaining Lease Duration Display for Active Sessions

As a government user,
I want to see remaining lease duration for active sessions,
So that I know how much time I have left.

**Acceptance Criteria:**

**Given** session has status "Active" and expiration date in future
**When** session row renders
**Then** I see remaining duration below expiry date:

**Display Format:**
- Primary: Expiry date/time (from Story 7.5)
- Secondary: Remaining duration in parentheses

**Example:**
```
In 23 hours (Remaining: 23h 15m)
```

**And** JavaScript calculates remaining duration:
```javascript
function formatRemainingDuration(expirationDate) {
  const expiry = new Date(expirationDate);
  const now = new Date();
  const diffMs = expiry - now;

  if (diffMs <= 0) {
    return 'Expired';
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}
```

**And** duration updates automatically (refresh every minute)
**And** duration shown only for Active sessions (not Pending/Expired)

**Prerequisites:** Story 7.7 (Launch button)

**Technical Notes:**
- FR-TRY-40 covered
- Combines with Story 7.5 expiry formatting
- Auto-refresh with setInterval (update every 60 seconds)
- Enhances user awareness of time remaining
- Not shown for expired/terminated sessions (already expired)

**Architecture Context:**
- **Module:** Reuse `src/try/ui/utils/date-formatter.ts` (Story 7.5)
- **Auto-refresh:** Same `setInterval` as Story 7.5 (performance: single timer for all relative times)
- **Conditional:** Only display for Active sessions with future expiration

**UX Design Context:**
- **Format:** "Remaining: 23h 15m" in parentheses below expiry
- **User Value:** Immediate visibility of time left (no mental calculation)
- **Display Rule:** Active sessions only (Pending/Expired don't need remaining time)

---

## Story 7.9: Link to Catalogue Filter from /try Page

As a government user,
I want to see a link to browse tryable products from /try page,
So that I can discover and request more sandbox environments.

**Acceptance Criteria:**

**Given** I am on `/try` page
**When** page renders
**Then** I see link to catalogue filter:

**Link Placement:**
- Below sessions table (or in empty state)
- Text: "Browse tryable products in the catalogue"
- Uses GOV.UK link styling

**And** link navigates to: `/catalogue/?tags=try-before-you-buy`
**And** catalogue filters to show only tryable products
**And** link keyboard accessible and screen reader friendly

**And** link appears in both states:
- When user has leases (below table)
- When user has no leases (in empty state)

**Prerequisites:** Story 7.8 (Remaining duration display)

**Technical Notes:**
- Catalogue integration from Journey Mapping (user feedback #2)
- Links /try page back to catalogue discovery
- Encourages exploration of additional tryable products
- GOV.UK link component (accessible by default)

**Architecture Context:**
- **Module:** Static link in `/try` page template
- **URL:** `/catalogue/?tags=try-before-you-buy` (uses Epic 6 tag filter)
- **Placement:** Below sessions table OR in empty state

**UX Design Context:**
- **User Journey:** Circular discovery flow (UX Section 5.1 Journey 3 → Journey 1)
- **Link Text:** "Browse tryable products in the catalogue" - clear action
- **Placement:** Always visible (encourages exploration of more products)
- **Integration:** Connects dashboard back to catalogue (user feedback #2 - discovery loop)

---

## Story 7.10: First-Time User Guidance on /try Page

As a first-time government user,
I want to see helpful guidance on /try page,
So that I understand how to use Try Before You Buy feature.

**Acceptance Criteria:**

**Given** I am authenticated and on `/try` page for first time
**When** page renders with empty state (no leases)
**Then** I see guidance panel:

**Panel Content:**
- Heading: "Get started with Try Before You Buy"
- Body text: "Browse the catalogue to find products you can try. Each sandbox gives you 24 hours of access with a $50 budget."
- Steps:
  1. "Browse tryable products in the catalogue"
  2. "Click 'Try this now' on a product page"
  3. "Accept the Acceptable Use Policy"
  4. "Launch your AWS sandbox from this page"
- Link: "Browse tryable products" → `/catalogue/?tags=try-before-you-buy`

**And** panel uses GOV.UK Design System:
- Panel component or inset text
- Numbered list for steps
- Clear call-to-action link

**And** panel NOT shown when user has leases (only empty state)

**Prerequisites:** Story 7.9 (Catalogue link)

**Technical Notes:**
- First-time user experience improvement
- Clarifies Try Before You Buy workflow
- Encourages action (browse catalogue)
- GOV.UK panel or inset text component
- Conditional rendering: Show only if leases.length === 0

**Architecture Context:**
- **Module:** Conditional rendering in `/try` page template
- **Condition:** Only show if `leases.length === 0` (empty state)
- **GOV.UK Component:** Panel or inset text for guidance

**UX Design Context:**
- **User Journey:** First-time user onboarding (UX Section 5.1 Journey 3 - empty state guidance)
- **Content:** 4-step workflow explanation (browse → click try → accept AUP → launch)
- **CTA:** "Browse tryable products" link → catalogue filter
- **Pattern:** Just-in-time guidance (UX Principle 4 - help when needed, not overwhelming)

---

## Story 7.11: AWS SSO Portal URL Configuration

As a developer,
I want to configure AWS SSO portal URL for launch button,
So that users are directed to correct SSO portal for their sandbox accounts.

**Acceptance Criteria:**

**Given** NDX deployment configuration
**When** I add SSO portal URL to environment config
**Then** configuration includes:

```javascript
// config.js or environment variable
const AWS_SSO_PORTAL_URL = process.env.AWS_SSO_PORTAL_URL || 'https://YOUR-SSO-PORTAL.awsapps.com/start#/';
```

**And** launch button uses configured URL:
```javascript
function renderLaunchButton(status, awsAccountId) {
  if (status !== 'Active') {
    return '';
  }

  const ssoURL = AWS_SSO_PORTAL_URL;

  return `
    <a href="${ssoURL}" target="_blank" rel="noopener noreferrer" class="govuk-button">
      Launch AWS Console
    </a>
  `;
}
```

**And** configuration documented in README:
- Environment variable: `AWS_SSO_PORTAL_URL`
- Default value for development
- Production value for deployment

**Prerequisites:** Story 7.10 (First-time user guidance)

**Technical Notes:**
- AWS SSO portal URL format: `https://{portal-name}.awsapps.com/start#/`
- Portal name specific to Innovation Sandbox deployment
- Environment variable for flexibility (dev vs. prod)
- Story 7.7 uses this configuration for launch button

**Architecture Context:**
- **Module:** `src/try/config.ts` - Centralized configuration (reuse from Epic 5)
- **Environment Variable:** `AWS_SSO_PORTAL_URL`
- **Default:** Development placeholder URL
- **Production:** Set via environment variable in deployment

**UX Design Context:**
- **Deployment:** Different SSO portals for dev/staging/prod environments
- **Configuration:** Simple environment variable (no code changes between environments)

---

## Story 7.12: End-to-End User Journey Validation

As a developer,
I want to validate complete Try Before You Buy user journey,
So that all epics integrate correctly end-to-end.

**Acceptance Criteria:**

**Given** all Epics 4-7 stories are complete
**When** I execute end-to-end user journey test
**Then** I validate complete flow:

**Journey Steps:**
1. **Unauthenticated User Discovery:**
   - Browse catalogue → See "Try Before You Buy" tag
   - Click tag filter → See only tryable products
   - Click "Try this now" button → Redirected to sign in

2. **Authentication:**
   - Sign in via OAuth → Redirected back to product page
   - JWT token stored in sessionStorage
   - See "Sign out" button in navigation

3. **Lease Request:**
   - Click "Try this now" button → Modal opens
   - See AUP text, checkbox, Cancel/Continue buttons
   - Check AUP checkbox → Continue button enabled
   - Click Continue → Lease requested
   - Navigate to /try page

4. **Dashboard View:**
   - See new lease in sessions table
   - Status: "Pending" or "Active"
   - Expiry: "In 24 hours"
   - Budget: "$0.0000 / $50.00"
   - Launch button visible (if Active)

5. **Launch AWS Console:**
   - Click "Launch AWS Console" → Opens AWS SSO portal in new tab
   - User can access sandbox environment

6. **Sign Out:**
   - Click "Sign out" → Redirected to home
   - sessionStorage cleared
   - See "Sign in" button

**And** end-to-end test validates:
- All UI transitions work
- API calls succeed
- Data persists correctly
- Authentication flows work
- No console errors

**Prerequisites:** Story 7.11 (SSO URL configured)

**Technical Notes:**
- Integration story from Pre-mortem preventive measure #4
- Validates Epic 5 → Epic 6 → Epic 7 integration
- Manual test execution (Playwright automation in future)
- Confirms user journey completeness
- Tests real Innovation Sandbox API (not mocked)

**Architecture Context:**
- **ADR-004:** End-to-end integration testing (layered testing strategy)
- **Testing:** Manual walkthrough of complete user journey (Epic 5 → 6 → 7)
- **Test Stack:** Playwright for future automation + real Innovation Sandbox API (staging)
- **Validation:** All UI transitions, API calls, data persistence, auth flows

**UX Design Context:**
- **Complete Flow:** All 5 user journeys tested end-to-end (UX Section 5.1)
- **Success Criteria:** User completes flow in < 30 seconds (UX Principle 2 - friction-free)
- **Integration Points:** Catalogue → Modal → Dashboard seamless transitions

---

## Story 7.13: Automated Accessibility Tests for Dashboard UI

As a developer,
I want automated accessibility tests for /try page and sessions table,
So that dashboard meets WCAG 2.2 AA standards.

**Acceptance Criteria:**

**Given** /try page and sessions table exist
**When** I run automated accessibility tests
**Then** tests validate:

**Test 1: Page Structure**
- Heading hierarchy correct (h1 → h2 → h3)
- Landmark regions defined (main, navigation)
- Skip to main content link present

**Test 2: Sessions Table**
- Table has accessible headers (th scope)
- Table caption or aria-label present
- Data cells associated with headers

**Test 3: Status Badges**
- Color contrast meets WCAG 2.2 AA (4.5:1)
- Status conveyed by text, not color alone
- ARIA labels for screen readers

**Test 4: Launch Button**
- Button keyboard focusable
- Button has accessible label
- External link announced to screen readers
- Focus indicator visible

**Test 5: Empty State**
- Guidance panel has clear heading
- Links keyboard accessible
- Content readable by screen readers

**And** tests run in CI pipeline
**And** tests cover all Epic 7 UI components

**Prerequisites:** Story 7.12 (End-to-end validation)

**Technical Notes:**
- Accessibility testing per Pre-mortem preventive measure #3
- Use axe-core for automated validation
- Table accessibility: FR-TRY-74 (ARIA labels)
- Color contrast: FR-TRY-76
- Full manual accessibility audit in Epic 8

**Architecture Context:**
- **ADR-037:** Mandatory accessibility testing gate (cannot merge PR without passing)
- **ADR-004:** Pa11y integration for WCAG 2.2 AA validation
  - Zero violations allowed for AA compliance
  - Tests run in CI on every commit to Epic 7 stories
- **Testing:** `test/accessibility/epic-7-a11y.test.ts` - Dashboard accessibility
- **ADR-027:** Responsive table accessibility validated (table headers, ARIA, keyboard nav)
- **CI Integration:** GitHub Actions runs Pa11y on every PR

**UX Design Context:**
- **WCAG 2.2 Compliance:** Section 8.1 - AA minimum for all Epic 7 components
- **Table Accessibility:** Headers with `scope`, ARIA labels, keyboard sortable
- **Color Contrast:** Status badges meet 4.5:1 minimum (WCAG 2.2 AA)
- **Touch Targets:** All buttons/links ≥ 44x44px (WCAG 2.2 AAA - UX Section 7.7)
- **Screen Reader:** Complete dashboard navigable via NVDA/VoiceOver

---
