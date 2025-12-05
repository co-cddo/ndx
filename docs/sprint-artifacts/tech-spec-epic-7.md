# Epic Technical Specification: Epic 7 - Try Sessions Dashboard

Date: 2025-11-24
Author: cns
Epic ID: 7
Status: Draft

---

## Overview

Epic 7 implements the Try Sessions Dashboard where authenticated users can view and manage their AWS sandbox leases. This epic builds on Epic 5 (authentication) and Epic 6 (catalogue/lease request) to provide a complete "try before you buy" user experience.

The dashboard displays user's active and past sandbox sessions with status badges, expiry times, budget information, and AWS console launch capabilities.

## Objectives and Scope

### In Scope

- **Story 7.1:** Create /try page route and layout (already exists, needs enhancement)
- **Story 7.2:** Fetch and display user leases from API
- **Story 7.3:** Render sessions table with GOV.UK Design System
- **Story 7.4:** Status badge display with color coding
- **Story 7.5:** Expiry date formatting (relative and absolute)
- **Story 7.6:** Budget display with cost formatting
- **Story 7.7:** "Launch AWS Console" button for active sessions
- **Story 7.8:** Remaining lease duration display for active sessions
- **Story 7.9:** Link to catalogue filter from /try page
- **Story 7.10:** First-time user guidance on /try page
- **Story 7.11:** AWS SSO Portal URL configuration
- **Story 7.12:** End-to-end user journey validation
- **Story 7.13:** Automated accessibility tests for dashboard UI

### Out of Scope

- Session termination (Growth feature)
- Session extension (Growth feature)
- Budget alerts and warnings (Growth feature)
- Multiple AWS account management (Growth feature)

## System Architecture Alignment

### Architecture Components

| Component       | ADR Reference           | Implementation                        |
| --------------- | ----------------------- | ------------------------------------- |
| Sessions Table  | GOV.UK Table            | Standard GOV.UK Design System table   |
| Status Badges   | GOV.UK Tag              | Color-coded status tags               |
| API Client      | ADR-021                 | Existing callISBAPI with auth headers |
| Auth Check      | ADR-024                 | AuthState subscription pattern        |
| Date Formatting | Intl.RelativeTimeFormat | Native browser API                    |

## Detailed Design

### Services and Modules

| Module                | Responsibility             | Location                                  |
| --------------------- | -------------------------- | ----------------------------------------- |
| `sessions-service.ts` | Fetch user leases from API | `src/try/api/sessions-service.ts`         |
| `try-page.ts`         | Dashboard rendering        | `src/try/ui/try-page.ts` (enhance)        |
| `sessions-table.ts`   | Table component            | `src/try/ui/components/sessions-table.ts` |
| `session-row.ts`      | Individual row rendering   | `src/try/ui/components/session-row.ts`    |
| `date-utils.ts`       | Date formatting utilities  | `src/try/utils/date-utils.ts`             |
| `currency-utils.ts`   | Currency formatting        | `src/try/utils/currency-utils.ts`         |

### Data Models

```typescript
// Lease from API (GET /api/leases)
interface Lease {
  leaseId: string
  awsAccountId: string
  leaseTemplateId: string
  leaseTemplateName: string // Product name
  status: "Pending" | "Active" | "Expired" | "Terminated"
  createdAt: string // ISO 8601
  expiresAt: string // ISO 8601
  maxSpend: number // USD
  currentSpend: number // USD
  awsSsoPortalUrl?: string // SSO URL for console access
}

// Sessions state
interface SessionsState {
  loading: boolean
  error: string | null
  leases: Lease[]
  lastUpdated: Date | null
}
```

### API Endpoints

| Endpoint              | Method | Response            | Description       |
| --------------------- | ------ | ------------------- | ----------------- |
| `/api/leases`         | GET    | Lease[]             | Get user's leases |
| `/api/configurations` | GET    | { awsSsoPortalUrl } | Get SSO URL       |

### Workflows

**Dashboard Load Flow:**

```
1. Page loads
   └─> try-page.ts initTryPage()

2. Check authentication
   └─> authState.subscribe()
   └─> If authenticated: fetchSessions()
   └─> If not: renderEmptyState()

3. Fetch sessions
   └─> GET /api/leases
   └─> Parse response
   └─> renderSessionsTable()

4. Render table
   └─> Sort by status/date
   └─> Render each row with badges
   └─> Add action buttons
```

## Acceptance Criteria Summary

### Story 7.1: Page Route

- /try page renders with correct layout
- Breadcrumb navigation works

### Story 7.2: Fetch Leases

- GET /api/leases called on page load
- Loading state shown during fetch
- Error handling for failed requests

### Story 7.3: Sessions Table

- GOV.UK table component styling
- Columns: Product, Status, Expires, Budget, Actions
- Empty state when no leases

### Story 7.4: Status Badges

- Pending: Yellow tag
- Active: Green tag
- Expired: Grey tag
- Terminated: Red tag

### Story 7.5: Date Formatting

- Relative: "in 23 hours", "expired 2 days ago"
- Absolute: "24 Nov 2025, 14:30"
- Both shown together

### Story 7.6: Budget Display

- Format: "$12.50 / $50.00"
- Percentage indicator

### Story 7.7: AWS Console Button

- "Launch AWS Console" button
- Only shown for Active sessions
- Opens SSO portal in new tab

### Story 7.8: Duration Display

- "23h 45m remaining" format
- Updates periodically (optional)

### Story 7.9: Catalogue Link

- "Browse products" link
- Links to /catalogue/tags/try-before-you-buy

### Story 7.10: First-Time Guidance

- Shown when no leases exist
- Explains how to get started
- Links to catalogue

### Story 7.11: SSO URL Config

- URL from /api/configurations
- Fallback to environment variable

### Story 7.12: E2E Testing

- Complete user journey test
- From sign in to console launch

### Story 7.13: Accessibility Tests

- axe-core WCAG 2.2 AA scanning
- Keyboard navigation
- Screen reader support

## Test Strategy

### Unit Tests

- Date formatting functions
- Currency formatting functions
- Status badge color mapping
- Table row rendering

### Integration Tests

- API fetch → table render
- Error state display
- Empty state display

### E2E Tests

- Full dashboard load flow
- Navigation from catalogue
- Console launch click

### Accessibility Tests

- Table accessibility (scope, headers)
- Button accessibility
- Screen reader announcements

## Dependencies

- Epic 5: Authentication (complete)
- Epic 6: Catalogue integration (complete)
- Innovation Sandbox API: /api/leases endpoint

---

**Document Version:** 1.0
**Created:** 2025-11-24
**Status:** Complete - Ready for Story Implementation
**Next Action:** Story 7.1 Implementation
