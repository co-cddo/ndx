# Story 10.1: Create Council Chatbot Catalogue Entry

Status: done

## Story

As a **catalogue user**,
I want **to find a Council Chatbot scenario in the NDX catalogue**,
so that **I can request a sandbox with an AI chatbot already deployed for exploration and learning**.

## Acceptance Criteria

| ID         | Criterion                                                                                                        | Priority |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| AC-10-1-1  | File created at `src/catalogue/aws/council-chatbot.md`                                                           | MUST     |
| AC-10-1-2  | Frontmatter includes `try: true` and `try_id: "8c2e6162-9d8e-42c9-82c3-d2a64d892ea8"`                            | MUST     |
| AC-10-1-3  | Description explains this is a learning artifact using bold warning callout (e.g., `> **Learning Artifact**`)    | MUST     |
| AC-10-1-4  | Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/council-chatbot/                            | MUST     |
| AC-10-1-5  | AWS services listed: Amazon Bedrock, Amazon Lex, AWS Lambda, Amazon S3                                           | MUST     |
| AC-10-1-6  | Includes resource lifecycle warning using Markdown blockquote (`>`) for visual distinction                       | MUST     |
| AC-10-1-7  | Encourages Infrastructure as Code usage                                                                          | MUST     |
| AC-10-1-8  | Directs users to Empty Sandbox for custom experimentation                                                        | MUST     |
| AC-10-1-9  | Tags include `try-before-you-buy` (exact lowercase match required)                                               | MUST     |
| AC-10-1-10 | "What You'll Explore" includes plain-English capability description (e.g., "AI that answers resident questions") | SHOULD   |
| AC-10-1-11 | File includes HTML comment documenting external URL dependency for maintenance                                   | SHOULD   |
| AC-10-1-12 | "Learn More" link uses raw HTML: `<a href="..." target="_blank" rel="noopener">Learn more</a>`                   | MUST     |
| AC-10-1-13 | Include "What is NDX?" one-sentence explainer for visitors without context                                       | SHOULD   |
| AC-10-1-14 | Constraints section explicitly states "No cost to you - budget is provided"                                      | MUST     |
| AC-10-1-15 | Include link to CloudFormation/IaC templates where available                                                     | SHOULD   |
| AC-10-1-16 | Include "Before your session ends" reminder about exporting work                                                 | MUST     |
| AC-10-1-17 | Include "Why this matters for local government" section                                                          | SHOULD   |
| AC-10-1-18 | Include "Deployed and ready - no setup required" messaging                                                       | MUST     |
| AC-10-1-19 | Include "Want to explore more?" section pointing to Empty Sandbox and other scenarios                            | SHOULD   |
| AC-10-1-20 | Include "Having trouble?" section with basic troubleshooting                                                     | SHOULD   |

## Tasks / Subtasks

- [ ] **Task 1: Create file with correct frontmatter** (AC: 1, 2, 9)
  - [ ] Create `src/catalogue/aws/council-chatbot.md`
  - [ ] Add YAML frontmatter with `layout: layouts/product-try`
  - [ ] Set `try: true` and `try_id: "8c2e6162-9d8e-42c9-82c3-d2a64d892ea8"`
  - [ ] Add tags including `try-before-you-buy` (exact lowercase)
  - [ ] Add scenario-specific tags: AI, Chatbot

- [ ] **Task 2: Add badges and intro sections** (AC: 3, 13, 18)
  - [ ] Add shields.io badges (provider-aws, access-NDX:Try, try_before_you_buy-available)
  - [ ] Add "What is NDX?" one-sentence explainer
  - [ ] Add learning artifact warning callout
  - [ ] Add "Deployed and ready - no setup required" messaging

- [ ] **Task 3: Add "What You'll Explore" section** (AC: 5, 10)
  - [ ] List AWS services: Amazon Bedrock, Amazon Lex, AWS Lambda, Amazon S3
  - [ ] Include plain-English capability description

- [ ] **Task 4: Add "Learn More" section** (AC: 4, 11, 12)
  - [ ] Add raw HTML link with `target="_blank" rel="noopener"`
  - [ ] Link to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/council-chatbot/
  - [ ] Add HTML comment documenting external URL dependency

- [ ] **Task 5: Add "Why this matters" and "Getting Started" sections** (AC: 17)
  - [ ] Add "Why this matters for local government" section
  - [ ] Add "Getting Started" with Try button steps

- [ ] **Task 6: Add "Constraints" section** (AC: 14)
  - [ ] State budget limit and duration
  - [ ] State "No cost to you - budget is provided"
  - [ ] State evaluation-only purpose

- [ ] **Task 7: Add "Important Notes" section** (AC: 6, 7, 8, 16)
  - [ ] Add resource lifecycle warning in blockquote
  - [ ] Encourage Infrastructure as Code usage
  - [ ] Add "Before your session ends" reminder
  - [ ] Direct users to Empty Sandbox

- [ ] **Task 8: Add "Want to explore more?" and "Having trouble?" sections** (AC: 19, 20)
  - [ ] Link to other scenarios
  - [ ] Link to Empty Sandbox
  - [ ] Add basic troubleshooting

- [ ] **Task 9: Add "Support" section**
  - [ ] Add contact email: ndx@dsit.gov.uk

- [ ] **Task 10: Validate build**
  - [ ] Run `yarn build` to verify no errors
  - [ ] Verify file appears in `_site/catalogue/aws/`

## Dev Notes

### Content Template Reference

Use the template from tech-spec Appendix. Key structural requirements:

```yaml
---
layout: layouts/product-try
title: Council Chatbot
description: Explore an AI-powered chatbot for local government resident services
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: Council Chatbot
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - AI
  - Chatbot
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "8c2e6162-9d8e-42c9-82c3-d2a64d892ea8"
---
```

### Required Content Sections (in order)

1. Badges (shields.io)
2. What is NDX? (one-sentence)
3. Overview (learning artifact warning)
4. What You'll Explore (AWS services)
5. Learn More (external link, new tab)
6. Getting Started (Try button steps)
7. Why this matters for local government
8. Constraints (budget, duration, no cost)
9. Important Notes (lifecycle, IaC, export reminder)
10. Want to explore more? (other scenarios)
11. Having trouble? (troubleshooting)
12. Support (contact)

### Project Structure Notes

- **Target file:** `src/catalogue/aws/council-chatbot.md`
- **Layout:** Uses existing `layouts/product-try` (no changes needed)
- **Template reference:** Follow existing `innovation-sandbox-empty.md` structure
- **Tags:** Must include exact `try-before-you-buy` for catalogue filter

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-10.md#Story-10-1]
- [Source: docs/epics/epic-10-aws-scenario-catalogue-entries.md#10-1]
- [Source: docs/prd-aws-scenario-catalogue-entries.md#FR-CAT-1-through-FR-CAT-7]
- [Template: src/catalogue/aws/innovation-sandbox-empty.md]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent -->

### Completion Notes List

<!-- To be filled by dev agent -->

### File List

<!-- To be filled by dev agent -->

---

## Change Log

| Date       | Author   | Change                               |
| ---------- | -------- | ------------------------------------ |
| 2025-12-05 | SM Agent | Story drafted from Epic 10 tech-spec |
