# Epic Technical Specification: AWS Scenario Catalogue Entries

Date: 2025-12-05
Author: cns
Epic ID: 10
Status: Draft

---

## Overview

This epic extends the NDX catalogue with 7 new entries for pre-deployed AWS scenarios from the Innovation Sandbox. These catalogue entries enable users to request sandbox sessions with working AWS applications already deployed, addressing a key gap where NDX:Try for AWS currently offers only an empty sandbox environment. The scenarios provide working examples that technical evaluators, decision makers, and developers can explore, inspect, and learn from - reducing the barrier to entry for AWS adoption in local government.

The 7 scenarios cover common local government use cases: AI chatbots, document redaction, planning application analysis, analytics dashboards, IoT parking systems, and accessibility audio generation, plus an updated Empty Sandbox for users who prefer starting fresh.

## Objectives and Scope

**In Scope:**

- Create 6 new catalogue entry files under `src/catalogue/aws/`
- Update 1 existing entry (`innovation-sandbox-empty.md`) with new try_id
- All entries use the existing `layouts/product-try` layout
- All entries include standard messaging: learning artifact disclaimer, IaC encouragement, resource lifecycle warning
- All entries link to demo site at `https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/{id}/`
- All entries include `try-before-you-buy` tag for catalogue filtering
- Build validation and Try button functionality testing

**Out of Scope:**

- Changes to the ndx_try_aws_scenarios repository
- Modifications to Innovation Sandbox lease templates
- New scenario development
- Changes to the Try Before You Buy infrastructure (authentication, sessions, modals)
- Changes to the product-try layout or Try button component

## System Architecture Alignment

This epic uses the existing NDX static site architecture with no infrastructure changes:

- **Build System:** Eleventy static site generator (v3.1.2)
- **Layout:** `layouts/product-try` - existing template supporting Try button functionality
- **Frontmatter:** Uses existing `try: true` and `try_id` fields for Innovation Sandbox integration
- **Deployment:** Standard deployment via `yarn build` and S3 sync to ndx-static-prod
- **CDN:** CloudFront distribution (E3THG4UHYDHVWP) serves the catalogue

The implementation adds only content (Markdown files with YAML frontmatter) - no code changes required.

## Detailed Design

### Services and Modules

| Component            | Responsibility                | Inputs                   | Outputs                      | Owner               |
| -------------------- | ----------------------------- | ------------------------ | ---------------------------- | ------------------- |
| Eleventy Build       | Compile Markdown to HTML      | `src/catalogue/aws/*.md` | `_site/catalogue/aws/*.html` | Build system        |
| product-try Layout   | Render Try button with try_id | Page frontmatter         | HTML with Try button         | Existing template   |
| Try Button Component | Initiate lease request flow   | User click + try_id      | Modal display                | Existing TypeScript |
| CloudFront           | Serve static content          | HTTP requests            | HTML pages                   | Infrastructure      |

### Data Models and Contracts

**Catalogue Entry Frontmatter Schema:**

```yaml
---
layout: layouts/product-try # Required: Enables Try button
title: string # Required: Page title
description: string # Required: Meta description
image:
  src: string # Required: Icon path
  alt: string # Required: Alt text
eleventyNavigation:
  parent: Catalogue # Required: Navigation placement
tags: # Required: Array of strings
  - AWS
  - Amazon
  - try-before-you-buy # Required for filter
  - ... # Scenario-specific tags
try: true # Required: Enables Try functionality
try_id: string # Required: UUID from Innovation Sandbox
---
```

**try_id Mapping (from PRD):**

| Scenario             | try_id                                 |
| -------------------- | -------------------------------------- |
| council-chatbot      | `8c2e6162-9d8e-42c9-82c3-d2a64d892ea8` |
| foi-redaction        | `e5beeca0-af34-4299-9efc-eb153e9d9d8c` |
| planning-ai          | `39060620-dc1b-4e1f-86f6-d928b5d1ac61` |
| quicksight-dashboard | `70de71bb-30f9-46f1-89ed-b3e14d878c10` |
| smart-car-park       | `b20f1be0-e8b1-4f9b-b053-3b3704b17ab1` |
| text-to-speech       | `30e462b3-644b-4c73-bec0-5ea1854b327e` |
| empty-sandbox        | `9813d13d-af90-433d-888f-ec17ad17d714` |

### APIs and Interfaces

No new APIs required. The implementation uses existing interfaces:

1. **Innovation Sandbox API** - Called by Try button component when user requests session
   - Endpoint: `/api/leases` (POST)
   - Uses `try_id` from frontmatter
   - Existing implementation from Epic 6

2. **Demo Site Links** - External static site
   - Base URL: `https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/`
   - Pattern: `{base_url}/{scenario-slug}/`
   - Read-only, no API interaction

### Workflows and Sequencing

**User Journey Flow:**

```
1. User browses NDX Catalogue
2. User filters by "try-before-you-buy" tag (optional)
3. User views scenario catalogue entry page
4. User reads "What You'll Explore" and "Important Notes"
5. User clicks "Learn More" to visit demo site (optional)
6. User clicks "Try this now for 24 hours" button
7. Existing Try flow: AUP modal → Lease request → AWS SSO credentials
8. User accesses sandbox with pre-deployed scenario
```

**Content Creation Flow (Developer):**

```
1. Copy existing innovation-sandbox-empty.md as template
2. Update frontmatter with scenario-specific values
3. Replace content sections with scenario-specific information
4. Verify file naming: {scenario-slug}.md
5. Run yarn build to validate
6. Test Try button functionality locally
7. Submit PR for review
```

## Non-Functional Requirements

### Performance

| Requirement       | Target          | Rationale                           |
| ----------------- | --------------- | ----------------------------------- |
| Page load time    | < 3s            | GOV.UK Design System recommendation |
| Build time impact | < 5s additional | 7 new Markdown files are minimal    |
| Bundle size       | No increase     | Content-only changes                |

No performance concerns - this is static content served from CloudFront edge cache.

### Security

| Requirement              | Implementation                         | Source            |
| ------------------------ | -------------------------------------- | ----------------- |
| No hardcoded credentials | try_id values are public UUIDs         | PRD Appendix      |
| XSS prevention           | Eleventy auto-escapes content          | Framework default |
| HTTPS only               | CloudFront enforces HTTPS              | Infrastructure    |
| No PII in content        | Catalogue entries contain no user data | By design         |

### Reliability/Availability

| Requirement          | Implementation                    |
| -------------------- | --------------------------------- |
| Content availability | CloudFront 99.9% SLA              |
| Build reliability    | Eleventy deterministic builds     |
| Demo site dependency | Graceful messaging if unavailable |

**Demo Site Availability Handling:**

- Demo links are informational only
- If demo site is down, users can still request sandbox
- PRD Risk: "Include fallback messaging if site is down" (Medium impact)

### Observability

| Signal                | Source                    | Purpose                 |
| --------------------- | ------------------------- | ----------------------- |
| Page views            | Analytics (if configured) | Track scenario interest |
| Try button clicks     | Existing Try flow metrics | Measure conversion      |
| Build success/failure | CI pipeline               | Deployment health       |

No additional observability infrastructure required.

## Dependencies and Integrations

### External Dependencies

| Dependency             | Version    | Purpose               | Status                                                 |
| ---------------------- | ---------- | --------------------- | ------------------------------------------------------ |
| Innovation Sandbox API | Production | Lease template lookup | Confirmed available                                    |
| Demo site              | Production | Scenario demos        | Confirmed at aws.try.ndx.digital.cabinet-office.gov.uk |

### Internal Dependencies

| Dependency                     | Version  | Purpose                       |
| ------------------------------ | -------- | ----------------------------- |
| @11ty/eleventy                 | ^3.1.2   | Static site generator         |
| @x-govuk/govuk-eleventy-plugin | ^8.1.1   | GOV.UK styling                |
| layouts/product-try            | Existing | Try button template           |
| Try button component           | Existing | Authentication and lease flow |

### Integration Points

1. **try_id → Innovation Sandbox**: Each catalogue entry's `try_id` must match an existing lease template in Innovation Sandbox (confirmed per PRD)
2. **Demo links → External site**: Static links to aws.try.ndx.digital.cabinet-office.gov.uk (confirmed available)

## Acceptance Criteria (Authoritative)

### Epic-Level Acceptance Criteria

1. 6 new catalogue entry files created in `src/catalogue/aws/`
2. 1 existing entry (`innovation-sandbox-empty.md`) updated with new try_id
3. All entries include `try: true` and correct `try_id` frontmatter
4. All entries include `try-before-you-buy` tag
5. All entries include learning artifact disclaimer
6. All entries include Infrastructure as Code encouragement
7. All entries include resource lifecycle warning
8. All entries link to demo site
9. All entries direct users to Empty Sandbox for experimentation
10. `yarn build` completes without errors
11. All 7 entries appear in catalogue listing
12. Try buttons render and function correctly
13. Tags filter correctly in catalogue view

### Story-Level Acceptance Criteria

**Story 10-1 (Council Chatbot):**

- AC-10-1-1: File created at `src/catalogue/aws/council-chatbot.md`
- AC-10-1-2: Frontmatter includes `try: true` and `try_id: "8c2e6162-9d8e-42c9-82c3-d2a64d892ea8"`
- AC-10-1-3: Description explains this is a learning artifact using bold warning callout (e.g., `> ⚠️ **Learning Artifact**` or HTML `<strong>`)
- AC-10-1-4: Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/council-chatbot/
- AC-10-1-5: AWS services listed: Amazon Bedrock, Amazon Lex, AWS Lambda, Amazon S3
- AC-10-1-6: Includes resource lifecycle warning using Markdown blockquote (`>`) for visual distinction
- AC-10-1-7: Encourages Infrastructure as Code usage
- AC-10-1-8: Directs users to Empty Sandbox
- AC-10-1-9: Tags include `try-before-you-buy` (exact lowercase match required)
- AC-10-1-10: "What You'll Explore" includes plain-English capability description (e.g., "AI that answers resident questions")
- AC-10-1-11: File includes HTML comment documenting external URL dependency for maintenance
- AC-10-1-12: "Learn More" link uses raw HTML: `<a href="..." target="_blank" rel="noopener">Learn more</a>`
- AC-10-1-13: Include "What is NDX?" one-sentence explainer for visitors without context
- AC-10-1-14: Constraints section explicitly states "No cost to you - budget is provided"
- AC-10-1-15: Include link to CloudFormation/IaC templates where available
- AC-10-1-16: Include "Before your session ends" reminder about exporting work
- AC-10-1-17: Include "Why this matters for local government" section
- AC-10-1-18: Include "Deployed and ready - no setup required" messaging
- AC-10-1-19: Include "Want to explore more?" section pointing to Empty Sandbox and other scenarios
- AC-10-1-20: Include "Having trouble?" section with basic troubleshooting (e.g., "Try button not working? Check you're logged in")

**Story 10-2 (FOI Redaction):**

- AC-10-2-1: File created at `src/catalogue/aws/foi-redaction.md`
- AC-10-2-2: Frontmatter includes `try: true` and `try_id: "e5beeca0-af34-4299-9efc-eb153e9d9d8c"`
- AC-10-2-3: Description explains this is a learning artifact using bold warning callout
- AC-10-2-4: Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/foi-redaction/
- AC-10-2-5: AWS services listed: Amazon Comprehend, Amazon Textract, AWS Lambda, Amazon S3
- AC-10-2-6: Includes resource lifecycle warning using Markdown blockquote
- AC-10-2-7: Encourages Infrastructure as Code usage
- AC-10-2-8: Directs users to Empty Sandbox
- AC-10-2-9: Tags include `try-before-you-buy` (exact lowercase match required)
- AC-10-2-10: "What You'll Explore" includes plain-English capability description (e.g., "Automated removal of sensitive information from documents")
- AC-10-2-11: File includes HTML comment documenting external URL dependency
- AC-10-2-12: "Learn More" link uses raw HTML with `target="_blank" rel="noopener"`
- AC-10-2-13: Include "What is NDX?" one-sentence explainer
- AC-10-2-14: Constraints states "No cost to you - budget is provided"
- AC-10-2-15: Link to CloudFormation/IaC templates where available
- AC-10-2-16: "Before your session ends" reminder
- AC-10-2-17: "Why this matters for local government" section
- AC-10-2-18: "Deployed and ready - no setup required" messaging
- AC-10-2-19: "Want to explore more?" section
- AC-10-2-20: "Having trouble?" section

**Story 10-3 (Planning AI):**

- AC-10-3-1: File created at `src/catalogue/aws/planning-ai.md`
- AC-10-3-2: Frontmatter includes `try: true` and `try_id: "39060620-dc1b-4e1f-86f6-d928b5d1ac61"`
- AC-10-3-3: Description explains this is a learning artifact using bold warning callout
- AC-10-3-4: Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/planning-ai/
- AC-10-3-5: AWS services listed: Amazon Textract, Amazon Comprehend, Amazon Bedrock, AWS Lambda, Amazon S3
- AC-10-3-6: Includes resource lifecycle warning using Markdown blockquote
- AC-10-3-7: Encourages Infrastructure as Code usage
- AC-10-3-8: Directs users to Empty Sandbox
- AC-10-3-9: Tags include `try-before-you-buy` (exact lowercase match required)
- AC-10-3-10: "What You'll Explore" includes plain-English capability description (e.g., "AI that reads and summarizes planning applications")
- AC-10-3-11: File includes HTML comment documenting external URL dependency
- AC-10-3-12: "Learn More" link uses raw HTML with `target="_blank" rel="noopener"`
- AC-10-3-13: Include "What is NDX?" one-sentence explainer
- AC-10-3-14: Constraints states "No cost to you - budget is provided"
- AC-10-3-15: Link to CloudFormation/IaC templates where available
- AC-10-3-16: "Before your session ends" reminder
- AC-10-3-17: "Why this matters for local government" section
- AC-10-3-18: "Deployed and ready - no setup required" messaging
- AC-10-3-19: "Want to explore more?" section
- AC-10-3-20: "Having trouble?" section

**Story 10-4 (QuickSight Dashboard):**

- AC-10-4-1: File created at `src/catalogue/aws/quicksight-dashboard.md`
- AC-10-4-2: Frontmatter includes `try: true` and `try_id: "70de71bb-30f9-46f1-89ed-b3e14d878c10"`
- AC-10-4-3: Description explains this is a learning artifact using bold warning callout
- AC-10-4-4: Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/quicksight-dashboard/
- AC-10-4-5: AWS services listed: Amazon QuickSight, Amazon S3, AWS Glue
- AC-10-4-6: Includes resource lifecycle warning using Markdown blockquote
- AC-10-4-7: Encourages Infrastructure as Code usage
- AC-10-4-8: Directs users to Empty Sandbox
- AC-10-4-9: Tags include `try-before-you-buy` (exact lowercase match required)
- AC-10-4-10: "What You'll Explore" includes plain-English capability description (e.g., "Interactive charts and reports for service performance data")
- AC-10-4-11: File includes HTML comment documenting external URL dependency
- AC-10-4-12: "Learn More" link uses raw HTML with `target="_blank" rel="noopener"`
- AC-10-4-13: Include "What is NDX?" one-sentence explainer
- AC-10-4-14: Constraints states "No cost to you - budget is provided"
- AC-10-4-15: Link to CloudFormation/IaC templates where available
- AC-10-4-16: "Before your session ends" reminder
- AC-10-4-17: "Why this matters for local government" section
- AC-10-4-18: "Deployed and ready - no setup required" messaging
- AC-10-4-19: "Want to explore more?" section
- AC-10-4-20: "Having trouble?" section

**Story 10-5 (Smart Car Park):**

- AC-10-5-1: File created at `src/catalogue/aws/smart-car-park.md`
- AC-10-5-2: Frontmatter includes `try: true` and `try_id: "b20f1be0-e8b1-4f9b-b053-3b3704b17ab1"`
- AC-10-5-3: Description explains this is a learning artifact using bold warning callout
- AC-10-5-4: Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/smart-car-park/
- AC-10-5-5: AWS services listed: AWS IoT Core, Amazon Timestream, Amazon QuickSight, AWS Lambda, Amazon API Gateway
- AC-10-5-6: Includes resource lifecycle warning using Markdown blockquote
- AC-10-5-7: Encourages Infrastructure as Code usage
- AC-10-5-8: Directs users to Empty Sandbox
- AC-10-5-9: Tags include `try-before-you-buy` (exact lowercase match required)
- AC-10-5-10: "What You'll Explore" includes plain-English capability description (e.g., "Real-time parking availability using sensors and dashboards")
- AC-10-5-11: File includes HTML comment documenting external URL dependency
- AC-10-5-12: "Learn More" link uses raw HTML with `target="_blank" rel="noopener"`
- AC-10-5-13: Include "What is NDX?" one-sentence explainer
- AC-10-5-14: Constraints states "No cost to you - budget is provided"
- AC-10-5-15: Link to CloudFormation/IaC templates where available
- AC-10-5-16: "Before your session ends" reminder
- AC-10-5-17: "Why this matters for local government" section
- AC-10-5-18: "Deployed and ready - no setup required" messaging
- AC-10-5-19: "Want to explore more?" section
- AC-10-5-20: "Having trouble?" section

**Story 10-6 (Text to Speech):**

- AC-10-6-1: File created at `src/catalogue/aws/text-to-speech.md`
- AC-10-6-2: Frontmatter includes `try: true` and `try_id: "30e462b3-644b-4c73-bec0-5ea1854b327e"`
- AC-10-6-3: Description explains this is a learning artifact using bold warning callout
- AC-10-6-4: Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/text-to-speech/
- AC-10-6-5: AWS services listed: Amazon Polly, AWS Lambda, Amazon S3
- AC-10-6-6: Includes resource lifecycle warning using Markdown blockquote
- AC-10-6-7: Encourages Infrastructure as Code usage
- AC-10-6-8: Directs users to Empty Sandbox
- AC-10-6-9: Tags include `try-before-you-buy` (exact lowercase match required)
- AC-10-6-10: "What You'll Explore" includes plain-English capability description (e.g., "Convert text content to natural-sounding audio for accessibility")
- AC-10-6-11: File includes HTML comment documenting external URL dependency
- AC-10-6-12: "Learn More" link uses raw HTML with `target="_blank" rel="noopener"`
- AC-10-6-13: Include "What is NDX?" one-sentence explainer
- AC-10-6-14: Constraints states "No cost to you - budget is provided"
- AC-10-6-15: Link to CloudFormation/IaC templates where available
- AC-10-6-16: "Before your session ends" reminder
- AC-10-6-17: "Why this matters for local government" section
- AC-10-6-18: "Deployed and ready - no setup required" messaging
- AC-10-6-19: "Want to explore more?" section
- AC-10-6-20: "Having trouble?" section

**Story 10-7 (Empty Sandbox Update):**

- AC-10-7-1: File `src/catalogue/aws/innovation-sandbox-empty.md` updated
- AC-10-7-2: try_id changed to `9813d13d-af90-433d-888f-ec17ad17d714`
- AC-10-7-3: New section added: "Looking for a head start?" with scenario links
- AC-10-7-4: Emphasizes this is for users who want to start fresh
- AC-10-7-5: Resource lifecycle warning present using Markdown blockquote
- AC-10-7-6: Encourages Infrastructure as Code usage
- AC-10-7-7: Existing content preserved
- AC-10-7-8: Tags include `try-before-you-buy` (exact lowercase match required)
- AC-10-7-9: Constraints states "No cost to you - budget is provided"
- AC-10-7-10: "Before your session ends" reminder about exporting work
- AC-10-7-11: Add `try-before-you-buy` tag to existing entry (currently missing - MUST for filter discovery)
- AC-10-7-12: "Want to explore more?" section pointing to pre-deployed scenarios
- AC-10-7-13: "Having trouble?" section with basic troubleshooting

**Story 10-8 (Build Validation):**

- AC-10-8-1: `yarn build` completes without errors
- AC-10-8-2: All 7 catalogue entries appear in catalogue listing
- AC-10-8-3: Try buttons render correctly on each page
- AC-10-8-4: External links to demo site are valid (manual verification)
- AC-10-8-5: Tags filter correctly in catalogue view
- AC-10-8-6: try-before-you-buy filter includes all new entries
- AC-10-8-7: Each try_id validated against Innovation Sandbox API before PR merge (MUST - prevents wrong scenario delivery)
- AC-10-8-8: Link validation script created for external demo URLs (SHOULD - enables future monitoring)
- AC-10-8-9: All entries use exact tag `try-before-you-buy` (lowercase, hyphenated) - no variants
- AC-10-8-10: Validate no duplicate try_id values across all catalogue entries (MUST - prevents wrong scenario delivery)
- AC-10-8-11: Validate all try_id values are valid UUID format (36 chars, 4 hyphens)
- AC-10-8-12: Validate all entries have both `try: true` AND `try_id` fields present (MUST - prevents silent failures)
- AC-10-8-13: File names use lowercase kebab-case only (e.g., `council-chatbot.md`, not `Council_Chatbot.md`)
- AC-10-8-14: PR review checklist created covering all validation requirements (SHOULD - aids reviewers)

## Traceability Mapping

| AC         | Spec Section                     | Component                   | Test Idea         |
| ---------- | -------------------------------- | --------------------------- | ----------------- |
| AC-10-1-1  | Detailed Design / Data Models    | council-chatbot.md          | File exists check |
| AC-10-1-2  | Detailed Design / try_id Mapping | Frontmatter                 | Build validation  |
| AC-10-1-3  | PRD FR-CAT-2                     | Content                     | Content review    |
| AC-10-1-4  | PRD FR-CAT-3                     | Content                     | Link validation   |
| AC-10-1-5  | Epic 10-1                        | Content                     | Content review    |
| AC-10-1-6  | PRD FR-CAT-6                     | Content                     | Content review    |
| AC-10-1-7  | PRD FR-CAT-5                     | Content                     | Content review    |
| AC-10-1-8  | PRD FR-CAT-4                     | Content                     | Content review    |
| AC-10-1-9  | PRD FR-CAT-1                     | Frontmatter                 | Tag filter test   |
| AC-10-2-\* | (Same pattern as 10-1)           | foi-redaction.md            | Same test types   |
| AC-10-3-\* | (Same pattern as 10-1)           | planning-ai.md              | Same test types   |
| AC-10-4-\* | (Same pattern as 10-1)           | quicksight-dashboard.md     | Same test types   |
| AC-10-5-\* | (Same pattern as 10-1)           | smart-car-park.md           | Same test types   |
| AC-10-6-\* | (Same pattern as 10-1)           | text-to-speech.md           | Same test types   |
| AC-10-7-1  | PRD FR-CAT-7                     | innovation-sandbox-empty.md | File update check |
| AC-10-7-2  | PRD Appendix                     | Frontmatter                 | Build validation  |
| AC-10-7-3  | PRD FR-CAT-7                     | Content                     | Content review    |
| AC-10-8-1  | NFR Performance                  | Build system                | CI pipeline       |
| AC-10-8-2  | Epic AC                          | Build output                | Manual check      |
| AC-10-8-3  | Epic AC                          | product-try layout          | Manual check      |
| AC-10-8-4  | PRD FR-CAT-3                     | External links              | curl validation   |
| AC-10-8-5  | PRD FR-CAT-1                     | Eleventy collection         | Manual check      |

## Risks, Assumptions, Open Questions

### Risks

| ID      | Type | Description                                                                            | Likelihood    | Impact | Mitigation                                                                             |
| ------- | ---- | -------------------------------------------------------------------------------------- | ------------- | ------ | -------------------------------------------------------------------------------------- |
| R-10-1  | Risk | try_id mismatch with Innovation Sandbox                                                | Low           | High   | Verify all UUIDs against Innovation Sandbox before PR merge                            |
| R-10-2  | Risk | Demo site unavailable during user visit                                                | Low           | Medium | Include fallback messaging explaining Try button still works                           |
| R-10-3  | Risk | User confusion about learning vs production                                            | Medium        | Medium | Clear "Learning Artifact" messaging using bold warning callout                         |
| R-10-4  | Risk | Incorrect AWS services listed for scenarios                                            | Low           | Low    | Cross-reference with ndx_try_aws_scenarios repo                                        |
| R-10-5  | Risk | Tag filter misses entries due to case/spelling variants                                | Medium        | Medium | Enforce exact `try-before-you-buy` tag in PR review                                    |
| R-10-6  | Risk | GOV.UK warning/inset components may not render correctly in product-try layout         | Low           | Medium | Test with existing layout before implementing; fallback to standard markdown if needed |
| R-10-7  | Risk | Markdown files don't support GOV.UK Nunjucks macros                                    | **Resolved**  | -      | Use Markdown blockquotes and HTML for visual emphasis instead                          |
| R-10-8  | Risk | Standard Markdown links don't support `target="_blank"`                                | **Resolved**  | -      | Use raw HTML `<a>` tags for external links                                             |
| R-10-9  | Risk | Scenario constraints may differ from Empty Sandbox (24h/$50)                           | Medium        | Low    | Verify each scenario's lease template constraints before deployment                    |
| R-10-10 | Risk | CloudFormation template URLs may not be publicly accessible                            | Medium        | Low    | Confirm template availability or omit links if unavailable                             |
| R-10-11 | Risk | Existing Empty Sandbox entry missing `try-before-you-buy` tag                          | **Confirmed** | Medium | Story 10-7 adds the tag (AC-10-7-11)                                                   |
| R-10-12 | Risk | Duplicate try_id across entries delivers wrong scenario                                | Low           | High   | Pre-merge validation (AC-10-8-10)                                                      |
| R-10-13 | Risk | Missing `try: true` or `try_id` causes silent failure (no Try button or runtime error) | Medium        | High   | Pre-merge validation (AC-10-8-12)                                                      |

### Assumptions

| ID     | Assumption                                                            | Validation                                      |
| ------ | --------------------------------------------------------------------- | ----------------------------------------------- |
| A-10-1 | Innovation Sandbox lease templates exist for all try_ids              | PRD confirms "confirmed available"              |
| A-10-2 | Demo site at aws.try.ndx.digital.cabinet-office.gov.uk is deployed    | PRD confirms "confirmed"                        |
| A-10-3 | Existing product-try layout supports new entries without modification | Matches existing innovation-sandbox-empty.md    |
| A-10-4 | No changes needed to Try button component                             | Uses existing try_id field                      |
| A-10-5 | All scenarios have same constraints as Empty Sandbox (24h, $50)       | Validate against lease templates                |
| A-10-6 | Eleventy renders raw HTML in Markdown files                           | Validated: standard Eleventy behavior           |
| A-10-7 | Markdown blockquotes render with visual distinction                   | Validated: GOV.UK Eleventy plugin supports this |

### Open Questions

| ID     | Question                                      | Owner | Status                                            |
| ------ | --------------------------------------------- | ----- | ------------------------------------------------- |
| Q-10-1 | Which icon to use for each scenario?          | cns   | Use connect-logo.svg for all (per existing entry) |
| Q-10-2 | Should scenarios have different badge colors? | cns   | No - use standard AWS badges for consistency      |

## Test Strategy Summary

### Test Levels

| Level            | Framework   | Coverage           | Automation         |
| ---------------- | ----------- | ------------------ | ------------------ |
| Build Validation | Eleventy    | All entries render | CI pipeline        |
| Link Validation  | curl/manual | External links     | Manual pre-merge   |
| Functional Test  | Manual      | Try button flow    | Manual post-deploy |
| Content Review   | Manual      | Messaging accuracy | PR review          |

### Test Plan

**Pre-Merge Testing:**

1. Run `yarn build` locally - verify no errors
2. Verify each new file appears in `_site/catalogue/aws/`
3. Check HTML output for correct frontmatter rendering
4. Validate external links with curl
5. PR content review for messaging accuracy

**Post-Deploy Smoke Test:**

1. Visit each new catalogue entry on production
2. Verify Try button displays and is clickable
3. Click Try button on one entry - verify AUP modal opens
4. Verify tag filter includes all new entries
5. Verify "try-before-you-buy" filter works

### Edge Cases

| Edge Case                            | Expected Behavior                       | Test                             |
| ------------------------------------ | --------------------------------------- | -------------------------------- |
| Demo site down                       | Try button still works                  | Manual verify Try flow           |
| Invalid try_id                       | AUP modal shows error                   | Manual test with invalid UUID    |
| Missing tag                          | Entry excluded from filter              | Build validation                 |
| Malformed frontmatter                | Build fails                             | Build validation                 |
| First-time visitor (no NDX context)  | "What is NDX?" explainer visible        | Content review                   |
| External links in new tab            | All "Learn More" links open in new tab  | Manual verification              |
| Duplicate try_id in two files        | Pre-merge validation catches            | Script to scan all try_id values |
| Missing try_id field                 | Try button renders but fails at runtime | Pre-merge validation script      |
| Missing `try: true` field            | No Try button renders at all            | Visual inspection                |
| Malformed UUID (wrong length/format) | Runtime error on Try click              | UUID regex validation            |

### Coverage

- All 7 catalogue entries covered by build validation
- All external links validated pre-merge
- Try button functionality verified post-deploy
- Content accuracy verified in PR review

---

## Appendix: Content Template

### Frontmatter Template

```yaml
---
layout: layouts/product-try
title: [Scenario Title]
description: [Brief description for SEO/meta]
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: [Scenario Title]
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - [Scenario-specific tags]
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "[UUID from mapping]"
---
```

### Required Content Sections

1. **Badges** (shields.io)
2. **What is NDX?** (one-sentence explainer)
3. **Overview** (learning artifact warning, what this demonstrates)
4. **What You'll Explore** (AWS services, plain-English capabilities)
5. **Learn More** (link to demo site, opens in new tab)
6. **Getting Started** (click Try button steps)
7. **Why this matters for local government**
8. **Constraints** (budget, duration, "no cost to you")
9. **Important Notes** (resource lifecycle, IaC encouragement, "before session ends")
10. **Want to explore more?** (links to other scenarios/Empty Sandbox)
11. **Having trouble?** (basic troubleshooting)
12. **Support** (contact email)

### PR Review Checklist

- [ ] File name is lowercase kebab-case
- [ ] `try: true` present in frontmatter
- [ ] `try_id` is valid UUID format
- [ ] `try_id` matches PRD/Epic mapping
- [ ] `try-before-you-buy` tag present (exact match)
- [ ] Learning artifact warning visible
- [ ] Resource lifecycle warning visible
- [ ] "Learn More" link opens in new tab (HTML with target="\_blank")
- [ ] All required content sections present
- [ ] No duplicate try_id with other entries
- [ ] `yarn build` passes
