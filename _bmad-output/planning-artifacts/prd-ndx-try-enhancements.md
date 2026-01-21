---
stepsCompleted:
  - "step-01-init"
  - "step-02-discovery"
  - "step-03-success"
  - "step-04-journeys"
  - "step-05-domain"
  - "step-06-innovation"
  - "step-07-project-type"
  - "step-08-scoping"
  - "step-09-functional"
  - "step-10-nonfunctional"
  - "step-11-polish"
  - "step-12-complete"
workflowComplete: true
completedAt: "2026-01-21"
inputDocuments:
  - "docs/infrastructure-architecture.md"
  - "docs/archive/bmm-2025-11-17/notification-architecture.md"
  - "docs/archive/bmm-2025-11-17/prd.md"
workflowType: "prd"
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 3
projectType: "brownfield"

classification:
  projectType: web_app
  domain: govtech
  complexity: high
  projectContext: brownfield

enhancements:
  batch_1_quick_wins:
    - id: cloudformation_button
      type: ui_enhancement
      effort: low
      value: high
    - id: remove_webhooks
      type: infrastructure_cleanup
      effort: low
      value: medium
    - id: isb_api_fix
      type: bug_fix
      effort: low
      value: high
  batch_2_infrastructure:
    - id: aws_chatbot_notifications
      type: infrastructure
      effort: medium
      value: high
      config:
        workspace_id: T8GT9416G
        channel_id: C0A16HXLM0Q
        quarantine_alerts: "@channel"
        event_source: direct_eventbridge_subscription
  batch_3_content:
    - id: branding_rename
      type: content
      effort: medium
      value: high
      scope: public_facing_text_only
    - id: catalogue_links
      type: ui_enhancement
      effort: medium
      value: medium
      templates:
        - council-chatbot
        - empty-sandbox
        - foi-redaction
        - localgov-drupal
        - planning-ai
        - quicksight-dashboard
        - smart-car-park
        - text-to-speech

safeguards:
  pre_go_live:
    - id: catalogue_slug_audit
      priority: P0
      timing: before_dev
    - id: text_audit
      priority: P2
      timing: before_dev
  qa_checklist:
    - id: smoke_test_notifications
      priority: P0
    - id: smoke_test_cf_button
      priority: P1
    - id: smoke_test_catalogue_links
      priority: P0
  rollback_strategy: code_revert

decisions:
  - isb_api_availability_assumed: true
  - cloudformation_button_opens_new_tab: true
  - internal_code_names_unchanged: true
  - isb_comments_may_retain_old_branding: true
---

# Product Requirements Document - NDX:Try Enhancements

**Author:** Cns
**Date:** 2026-01-21

---

## Success Criteria

These are routine enhancements to NDX:Try. Success = each item works correctly.

### Measurable Outcomes

| Enhancement | Success Measure |
|-------------|-----------------|
| **CF button** | Opens correct account's CloudFormation console in new tab |
| **Remove webhooks** | Custom Slack webhook code deleted from repository |
| **ISB API fix** | Lease details load from `/leases/{id}` API (DynamoDB direct read removed) |
| **AWS Chatbot** | All 18 ISB event types flow to Slack |
| **Critical alerts** | @channel fires for: `AccountQuarantined`, `AccountCleanupFailed`, `AccountDriftDetected`, `GroupCostReportGeneratedFailure` |
| **Routine alerts** | Remaining 14 events visible in channel without @channel |
| **Branding** | No "Innovation Sandbox" in NDX-controlled surfaces |
| **Catalogue links** | All 8 product names link to valid catalogue pages |

### Event Classification Reference

**Critical (4 events - @channel):**
- `AccountQuarantined` - Security/compliance violation
- `AccountCleanupFailed` - Account not properly deprovisioned
- `AccountDriftDetected` - Account in wrong OU
- `GroupCostReportGeneratedFailure` - Financial tracking broken

**Routine (14 events - no @channel):**
- Lifecycle: `LeaseRequested`, `LeaseApproved`, `LeaseDenied`, `LeaseFrozen`, `LeaseUnfrozen`, `LeaseTerminated`
- Warnings: `LeaseBudgetExceeded`, `LeaseBudgetThresholdAlert`, `LeaseDurationThresholdAlert`, `LeaseFreezingThresholdAlert`, `LeaseExpiredAlert`
- Info: `GroupCostReportGenerated`, `AccountCleanupSuccessful`, `CleanAccountRequest`

### Catalogue Link Reference

| Template | Target |
|----------|--------|
| council-chatbot | `/catalogue/council-chatbot/` |
| empty-sandbox | `/catalogue/aws/innovation-sandbox-empty/` (may relocate) |
| foi-redaction | `/catalogue/foi-redaction/` |
| localgov-drupal | `/catalogue/localgov-drupal/` |
| planning-ai | `/catalogue/planning-ai/` |
| quicksight-dashboard | `/catalogue/quicksight-dashboard/` |
| smart-car-park | `/catalogue/smart-car-park/` |
| text-to-speech | `/catalogue/text-to-speech/` |

---

## Product Scope

### MVP - All 6 Enhancements (Single Release)

1. CloudFormation console button on /try page (opens in new tab)
2. Remove Slack webhook notification code
3. Fix lease template query to use ISB API
4. AWS Chatbot → Slack notifications via EventBridge (18 events, 4 critical @channel)
5. Rename "Innovation Sandbox" → "NDX:Try sessions"
6. Product names on /try link to catalogue pages

### Out of Scope

- Disabling ISB SES notifications (separate task)

---

## User Journeys

### Journey 1: Sarah - Public Sector Experimenter

**Situation:** Sarah is a local council digital officer exploring AI solutions for FOI requests.

**Opening Scene:** Sarah arrives at `/try`, browses available templates, clicks "FOI Redaction" and sees the product name links to the catalogue page with full documentation.

**Rising Action:** She starts a session, receives approval, and wants to inspect her CloudFormation resources. She clicks the new "Open CloudFormation Console" button.

**Climax:** The button opens her account's CloudFormation console in a new tab - she can immediately see her deployed stack.

**Resolution:** Sarah understands what's been provisioned, explores confidently, and notes the consistent "NDX:Try sessions" branding throughout.

**Requirements revealed:** CF button, catalogue links, branding consistency

---

### Journey 2: Marcus - NDX Operations

**Situation:** Marcus monitors NDX:Try infrastructure via Slack channel #ndx-sandbox-alerts.

**Opening Scene:** It's 2am. An account is quarantined due to a compliance violation. EventBridge fires `AccountQuarantined`.

**Rising Action:** AWS Chatbot picks up the event, routes to Slack. Because it's critical, @channel triggers.

**Climax:** Marcus's phone buzzes with the alert. He sees the structured notification with lease ID, account, and affected user details.

**Resolution:** Marcus investigates next morning. Routine events (approvals, terminations, budget exceeded) appear without @channel - visible for audit only.

**Requirements revealed:** AWS Chatbot integration, 18 event types, 4 critical @channel events

---

### Journey 3: Developer - ISB API Integration

**Situation:** A future developer maintains the lease template display code.

**Opening Scene:** The /try page needs to show template details for an active lease.

**Rising Action:** Code calls `GET /leases/{base64({userEmail,uuid})}` with JWT auth. Response returns JSend format with `originalLeaseTemplateName`, `awsAccountId`, `status`.

**Error Handling:** 404 → "Session expired"; 403 → redirect login; 500 → generic error + log.

**Resolution:** Clean API contract, no DynamoDB direct reads, no webhook code in codebase.

**Requirements revealed:** ISB API call, webhook code removal

---

### Journey Requirements Summary

| Journey | Capabilities | Edge Cases |
|---------|-------------|------------|
| **Sarah** | CF button, catalogue links, branding | Catalogue 404 → URL audit |
| **Marcus** | AWS Chatbot, 18 events, 4 critical @channel | New events default routine |
| **Developer** | ISB API, clean codebase | Error handling documented |

### Decisions from Journey Analysis

| Decision | Resolution |
|----------|------------|
| CF button on expired lease | Non-issue: button only renders for active sessions |
| AWS Chatbot redundancy | Accept single-channel risk (no SES backup) |
| New ISB event types | Default to routine until explicitly classified critical |
| Branding scope | NDX-controlled surfaces only; ISB emails/CF names unchanged |

---

## Functional Requirements

### Session Visibility

- **FR1:** User can open their session's CloudFormation console directly from the /try page
- **FR2:** User can view their session's CloudFormation resources in a new browser tab
- **FR3:** User can see the CloudFormation button only when their session is active

### Product Discovery

- **FR4:** User can navigate from a template name on /try to its catalogue page
- **FR5:** User can access detailed product documentation via catalogue links for all 8 templates
- **FR6:** System displays template names as clickable links to catalogue pages

### Operations Notifications

- **FR7:** Operations team can receive all ISB events via Slack channel
- **FR8:** Operations team can receive @channel alerts for critical events (AccountQuarantined, AccountCleanupFailed, AccountDriftDetected, GroupCostReportGeneratedFailure)
- **FR9:** Operations team can view routine events in Slack without @channel disruption
- **FR10:** System routes all 18 ISB EventBridge events to AWS Chatbot

### Lease Data Access

- **FR11:** System can retrieve lease details via ISB API `/leases/{id}` endpoint
- **FR12:** System displays appropriate error messages when lease retrieval fails (404, 403, 500)

### Branding Consistency

- **FR13:** User sees "NDX:Try sessions" terminology on all NDX-controlled surfaces
- **FR14:** System displays no "Innovation Sandbox" branding in public-facing text

### Code Quality

- **FR15:** Codebase contains no Slack webhook notification code
- **FR16:** Codebase contains no direct DynamoDB reads for lease data

---

## Non-Functional Requirements

### Accessibility

- **NFR1:** CloudFormation button must be keyboard accessible (focusable, activatable via Enter/Space)
- **NFR2:** Catalogue links must have descriptive link text (not "click here")
- **NFR3:** New UI elements must meet existing WCAG 2.1 AA compliance

### Integration

- **NFR4:** ISB API calls must timeout gracefully (≤5 seconds) with user-friendly error message
- **NFR5:** AWS Chatbot must receive events within 60 seconds of EventBridge emission
- **NFR6:** EventBridge rule must capture all 18 ISB event types without filtering errors

### Observability

- **NFR7:** ISB API errors must be logged with correlation ID for debugging
- **NFR8:** AWS Chatbot delivery failures must be visible in CloudWatch
