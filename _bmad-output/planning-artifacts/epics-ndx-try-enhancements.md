---
stepsCompleted:
  ["step-01-validate-prerequisites", "step-02-design-epics", "step-03-create-stories", "step-04-final-validation"]
status: "complete"
completedAt: "2026-01-21"
inputDocuments:
  - "_bmad-output/planning-artifacts/prd-ndx-try-enhancements.md"
---

# ndx - NDX:Try Enhancements - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for NDX:Try Enhancements, decomposing the requirements from the PRD into implementable stories.

## Requirements Inventory

### Functional Requirements

**Session Visibility:**

- FR1: User can open their session's CloudFormation console directly from the /try page
- FR2: User can view their session's CloudFormation resources in a new browser tab
- FR3: User can see the CloudFormation button only when their session is active

**Product Discovery:**

- FR4: User can navigate from a template name on /try to its catalogue page
- FR5: User can access detailed product documentation via catalogue links for all 8 templates
- FR6: System displays template names as clickable links to catalogue pages

**Operations Notifications:**

- FR7: Operations team can receive all ISB events via Slack channel
- FR8: Operations team can receive @channel alerts for critical events (AccountQuarantined, AccountCleanupFailed, AccountDriftDetected, GroupCostReportGeneratedFailure)
- FR9: Operations team can view routine events in Slack without @channel disruption
- FR10: System routes all 18 ISB EventBridge events to AWS Chatbot

**Lease Data Access:**

- FR11: System can retrieve lease details via ISB API `/leases/{id}` endpoint
- FR12: System displays appropriate error messages when lease retrieval fails (404, 403, 500)

**Branding Consistency:**

- FR13: User sees "NDX:Try sessions" terminology on all NDX-controlled surfaces
- FR14: System displays no "Innovation Sandbox" branding in public-facing text

**Code Quality:**

- FR15: Codebase contains no Slack webhook notification code
- FR16: Codebase contains no direct DynamoDB reads for lease data

### NonFunctional Requirements

**Accessibility:**

- NFR1: CloudFormation button must be keyboard accessible (focusable, activatable via Enter/Space)
- NFR2: Catalogue links must have descriptive link text (not "click here")
- NFR3: New UI elements must meet existing WCAG 2.1 AA compliance

**Integration:**

- NFR4: ISB API calls must timeout gracefully (≤5 seconds) with user-friendly error message
- NFR5: AWS Chatbot must receive events within 60 seconds of EventBridge emission
- NFR6: EventBridge rule must capture all 18 ISB event types without filtering errors

**Observability:**

- NFR7: ISB API errors must be logged with correlation ID for debugging
- NFR8: AWS Chatbot delivery failures must be visible in CloudWatch

### Additional Requirements

**From PRD Decisions:**

- Brownfield extension - no starter template needed
- CloudFormation button opens in new tab
- Internal code names unchanged
- ISB comments may retain old branding

**Pre-Development Safeguards:**

- Catalogue slug audit required before dev (P0)
- Text audit required before dev (P2)

**QA Requirements:**

- Smoke test: notifications (P0)
- Smoke test: CF button (P1)
- Smoke test: catalogue links (P0)

### FR Coverage Map

| FR   | Epic     | Description                                                      |
| ---- | -------- | ---------------------------------------------------------------- |
| FR1  | Epic 1   | User can open CloudFormation console from /try page              |
| FR2  | Epic 1   | User can view CF resources in new browser tab                    |
| FR3  | Epic 1   | CF button only visible when session is active                    |
| FR4  | Epic 3   | User can navigate from template name to catalogue                |
| FR5  | Epic 3   | User can access documentation via catalogue links                |
| FR6  | Epic 3   | Template names displayed as clickable links                      |
| FR7  | Epic 2   | Ops receives all ISB events via Slack                            |
| FR8  | Epic 2   | Ops receives @channel for critical events                        |
| FR9  | Epic 2   | Ops views routine events without @channel                        |
| FR10 | Epic 2   | System routes 18 events to AWS Chatbot                           |
| FR11 | Epic 1   | System retrieves lease details via ISB API                       |
| FR12 | Epic 1   | System displays appropriate error messages                       |
| FR13 | Epic 3   | User sees "NDX:Try sessions" terminology                         |
| FR14 | Epic 3   | No "Innovation Sandbox" branding displayed                       |
| FR15 | Epic 2   | Codebase contains no webhook code                                |
| FR16 | Epic 1   | Codebase contains no DynamoDB reads                              |

## Epic List

### Epic 1: Session Transparency

Users can easily access and understand their NDX:Try session resources.

**Delivers:**

- CloudFormation button opens user's CF console in new tab
- Lease details fetched via ISB API (replaces DynamoDB direct reads)
- Graceful error handling with user-friendly messages

**FRs covered:** FR1, FR2, FR3, FR11, FR12, FR16

---

### Epic 2: Operations Notifications

Operations team receives timely, prioritized Slack notifications for all ISB events.

**Delivers:**

- AWS Chatbot integration (EventBridge → SNS → Chatbot → Slack)
- Critical alerts with @channel (4 events: AccountQuarantined, AccountCleanupFailed, AccountDriftDetected, GroupCostReportGeneratedFailure)
- Routine event visibility (14 events without @channel)
- Webhook code removal (clean codebase, single notification path)

**FRs covered:** FR7, FR8, FR9, FR10, FR15

---

### Epic 3: Product Discovery & Branding

Users can discover products through catalogue links and experience consistent NDX:Try branding.

**Delivers:**

- Catalogue links for all 8 template names
- Consistent "NDX:Try sessions" branding (replaces "Innovation Sandbox")
- Accessible links with descriptive text

**FRs covered:** FR4, FR5, FR6, FR13, FR14

---

## Epic 1: Session Transparency

Users can easily access and understand their NDX:Try session resources.

### Story 1.1: Replace Notification Lambda DynamoDB Reads with ISB API

As a **developer maintaining the notification system**,
I want **lease enrichment to use the ISB API instead of direct DynamoDB reads**,
So that **the codebase has a clean API contract with no direct database dependencies**.

**Acceptance Criteria:**

**Given** an EventBridge event arrives needing enrichment
**When** the notification Lambda processes it
**Then** it calls `GET /leases/{id}` on ISB API instead of DynamoDB GetItemCommand

**Given** the ISB API returns lease data
**When** enrichment completes
**Then** the Notify payload is built with the same fields as before (`awsAccountId`, `maxSpend`, `expirationDate`, etc.)

**Given** the code changes are complete
**When** I search `infra/lib/lambda/notification/`
**Then** no `DynamoDBClient` or `GetItemCommand` imports exist for lease data

---

### Story 1.2: CloudFormation Console Button

As a **government user with an active NDX:Try session**,
I want **a button to open my session's CloudFormation console**,
So that **I can inspect what resources have been deployed**.

**Acceptance Criteria:**

**Given** I have an active session on /try
**When** I view my session row
**Then** I see an "Open CloudFormation Console" button

**Given** I click the CloudFormation button
**When** the action completes
**Then** a new browser tab opens to `https://console.aws.amazon.com/cloudformation/home?region={region}#/stacks` for my session's AWS account (FR1, FR2)

**Given** my session is not active (expired, terminated)
**When** I view the /try page
**Then** the CloudFormation button is not visible (FR3)

**Given** I navigate using only keyboard
**When** I focus on the CloudFormation button
**Then** I can activate it via Enter or Space (NFR1)

---

## Epic 2: Operations Notifications

Operations team receives timely, prioritized Slack notifications for all ISB events.

### Story 2.1: AWS Chatbot Integration

As an **NDX operations team member**,
I want **all ISB events delivered to Slack via AWS Chatbot**,
So that **I have visibility into all sandbox activity in our monitoring channel**.

**Acceptance Criteria:**

**Given** any of the 18 ISB EventBridge events fires
**When** EventBridge evaluates the event
**Then** the event is routed to SNS topic `ndx-try-alerts`

**Given** the SNS topic receives an event
**When** AWS Chatbot processes it
**Then** a notification appears in Slack channel `#ndx-sandbox-alerts` (C0A16HXLM0Q)

**Given** an event is published
**When** I measure delivery time
**Then** the Slack notification arrives within 60 seconds (NFR5)

**Given** the EventBridge rule is deployed
**When** I check the event pattern
**Then** all 18 ISB event types are captured (NFR6)

**Given** a Chatbot delivery fails
**When** I check CloudWatch
**Then** the failure is visible in logs (NFR8)

---

### Story 2.2: Critical Event Classification

As an **NDX operations team member**,
I want **critical events to trigger @channel alerts**,
So that **I'm immediately notified of security or compliance issues**.

**Acceptance Criteria:**

**Given** one of the 4 critical events fires:
- `AccountQuarantined`
- `AccountCleanupFailed`
- `AccountDriftDetected`
- `GroupCostReportGeneratedFailure`
**When** the notification reaches Slack
**Then** the message includes @channel mention (FR8)

**Given** one of the 14 routine events fires (LeaseRequested, LeaseApproved, etc.)
**When** the notification reaches Slack
**Then** no @channel mention is included (FR9)

**Given** a new ISB event type is added in the future
**When** it's not explicitly classified
**Then** it defaults to routine (no @channel)

---

### Story 2.3: Remove Slack Webhook Code

As a **developer maintaining the notification system**,
I want **the Slack webhook notification code removed**,
So that **the codebase has a single notification path via AWS Chatbot**.

**Acceptance Criteria:**

**Given** the AWS Chatbot integration is working
**When** I search the codebase for Slack webhook code
**Then** no `isSlackAlertType()` function exists
**And** no Slack webhook URLs exist in code or config

**Given** the webhook code is removed
**When** I deploy the changes
**Then** all notifications flow through AWS Chatbot only (FR15)

---

## Epic 3: Product Discovery & Branding

Users can discover products through catalogue links and experience consistent NDX:Try branding.

### Story 3.1: Catalogue Links

As a **government user exploring NDX:Try**,
I want **template names to link to their catalogue pages**,
So that **I can learn more about each product before starting a session**.

**Acceptance Criteria:**

**Given** I view the /try page with available templates
**When** I see a template name (e.g., "FOI Redaction")
**Then** it is displayed as a clickable link (FR6)

**Given** I click a template name link
**When** the navigation completes
**Then** I arrive at the correct catalogue page (FR4):
- council-chatbot → `/catalogue/aws/council-chatbot/`
- empty-sandbox → `/catalogue/aws/empty-sandbox/`
- foi-redaction → `/catalogue/aws/foi-redaction/`
- localgov-drupal → `/catalogue/aws/localgov-drupal/`
- planning-ai → `/catalogue/aws/planning-ai/`
- quicksight-dashboard → `/catalogue/aws/quicksight-dashboard/`
- smart-car-park → `/catalogue/aws/smart-car-park/`
- text-to-speech → `/catalogue/aws/text-to-speech/`

**Given** all 8 templates have links
**When** I access any catalogue page
**Then** detailed product documentation is available (FR5)

**Given** the links are implemented
**When** I inspect the HTML
**Then** link text is descriptive (not "click here") (NFR2)
**And** links meet WCAG 2.1 AA (NFR3)

---

### Story 3.2: Branding Update

As a **government user**,
I want **consistent "NDX:Try sessions" terminology**,
So that **I have a clear understanding of the product offering**.

**Acceptance Criteria:**

**Given** I view any NDX-controlled surface (/try page, session table, modals)
**When** I read the text content
**Then** I see "NDX:Try sessions" terminology (FR13)
**And** no "Innovation Sandbox" branding appears (FR14)

**Given** the branding audit is complete
**When** I search public-facing text in `src/`
**Then** no instances of "Innovation Sandbox" exist in user-visible strings

**Given** internal code names (variable names, comments)
**When** I review the codebase
**Then** internal names may remain unchanged (per PRD decision)
