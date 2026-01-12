# Epic 10: AWS Scenario Catalogue Entries

**PRD Reference:** docs/prd-aws-scenario-catalogue-entries.md
**Epic Owner:** cns
**Status:** Ready for Implementation
**Priority:** High

---

## Epic Goal

Extend the NDX catalogue with 7 entries for pre-deployed AWS scenarios, enabling users to explore working AWS applications in sandbox environments rather than starting from empty consoles.

---

## Business Value

- **Reduced barrier to entry**: Users can explore working AWS applications immediately
- **Better learning experience**: Real deployed infrastructure to inspect and understand
- **Informed decision making**: Stakeholders can evaluate AWS capabilities with tangible examples
- **Reference implementations**: Developers gain patterns to adapt for their own projects

---

## Acceptance Criteria

- [ ] 6 new catalogue entries created for pre-deployed scenarios
- [ ] 1 existing entry (Empty Sandbox) updated with new try_id
- [ ] All entries include required messaging (learning artifact, IaC, resource lifecycle)
- [ ] All entries link to demo site at aws.try.ndx.digital.cabinet-office.gov.uk
- [ ] All entries direct users to Empty Sandbox for hands-on experimentation
- [ ] Build passes with no errors
- [ ] Try buttons functional with correct try_id mapping

---

## Stories

### 10-1: Create Council Chatbot Catalogue Entry

**As a** catalogue user
**I want** to find a Council Chatbot scenario in the NDX catalogue
**So that** I can request a sandbox with an AI chatbot already deployed

**Acceptance Criteria:**

- [ ] File created: `src/catalogue/aws/council-chatbot.md`
- [ ] Frontmatter includes `try: true` and `try_id: "8c2e6162-9d8e-42c9-82c3-d2a64d892ea8"`
- [ ] Description explains this is a learning artifact, not a production product
- [ ] Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/council-chatbot/
- [ ] AWS services listed: Amazon Bedrock, Amazon Lex, AWS Lambda, Amazon S3
- [ ] Includes resource lifecycle warning (deleted at session end or budget limit)
- [ ] Encourages Infrastructure as Code usage
- [ ] Directs users to Empty Sandbox for custom experimentation
- [ ] Tags: AWS, Amazon, AI, Chatbot, Sandbox, Evaluation, try-before-you-buy

---

### 10-2: Create FOI Redaction Catalogue Entry

**As a** catalogue user
**I want** to find an FOI Redaction scenario in the NDX catalogue
**So that** I can request a sandbox with automated redaction already deployed

**Acceptance Criteria:**

- [ ] File created: `src/catalogue/aws/foi-redaction.md`
- [ ] Frontmatter includes `try: true` and `try_id: "e5beeca0-af34-4299-9efc-eb153e9d9d8c"`
- [ ] Description explains this is a learning artifact, not a production product
- [ ] Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/foi-redaction/
- [ ] AWS services listed: Amazon Comprehend, Amazon Textract, AWS Lambda, Amazon S3
- [ ] Includes resource lifecycle warning
- [ ] Encourages Infrastructure as Code usage
- [ ] Directs users to Empty Sandbox for custom experimentation
- [ ] Tags: AWS, Amazon, AI, Data Protection, FOI, Compliance, Sandbox, Evaluation, try-before-you-buy

---

### 10-3: Create Planning AI Catalogue Entry

**As a** catalogue user
**I want** to find a Planning AI scenario in the NDX catalogue
**So that** I can request a sandbox with planning document analysis already deployed

**Acceptance Criteria:**

- [ ] File created: `src/catalogue/aws/planning-ai.md`
- [ ] Frontmatter includes `try: true` and `try_id: "39060620-dc1b-4e1f-86f6-d928b5d1ac61"`
- [ ] Description explains this is a learning artifact, not a production product
- [ ] Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/planning-ai/
- [ ] AWS services listed: Amazon Textract, Amazon Comprehend, Amazon Bedrock, AWS Lambda, Amazon S3
- [ ] Includes resource lifecycle warning
- [ ] Encourages Infrastructure as Code usage
- [ ] Directs users to Empty Sandbox for custom experimentation
- [ ] Tags: AWS, Amazon, AI, Document Processing, Planning, Automation, Sandbox, Evaluation, try-before-you-buy

---

### 10-4: Create QuickSight Dashboard Catalogue Entry

**As a** catalogue user
**I want** to find a QuickSight Dashboard scenario in the NDX catalogue
**So that** I can request a sandbox with analytics dashboards already deployed

**Acceptance Criteria:**

- [ ] File created: `src/catalogue/aws/quicksight-dashboard.md`
- [ ] Frontmatter includes `try: true` and `try_id: "70de71bb-30f9-46f1-89ed-b3e14d878c10"`
- [ ] Description explains this is a learning artifact, not a production product
- [ ] Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/quicksight-dashboard/
- [ ] AWS services listed: Amazon QuickSight, Amazon S3, AWS Glue
- [ ] Includes resource lifecycle warning
- [ ] Encourages Infrastructure as Code usage
- [ ] Directs users to Empty Sandbox for custom experimentation
- [ ] Tags: AWS, Amazon, Analytics, Dashboard, Reporting, Data, Sandbox, Evaluation, try-before-you-buy

---

### 10-5: Create Smart Car Park Catalogue Entry

**As a** catalogue user
**I want** to find a Smart Car Park scenario in the NDX catalogue
**So that** I can request a sandbox with IoT parking infrastructure already deployed

**Acceptance Criteria:**

- [ ] File created: `src/catalogue/aws/smart-car-park.md`
- [ ] Frontmatter includes `try: true` and `try_id: "b20f1be0-e8b1-4f9b-b053-3b3704b17ab1"`
- [ ] Description explains this is a learning artifact, not a production product
- [ ] Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/smart-car-park/
- [ ] AWS services listed: AWS IoT Core, Amazon Timestream, Amazon QuickSight, AWS Lambda, Amazon API Gateway
- [ ] Includes resource lifecycle warning
- [ ] Encourages Infrastructure as Code usage
- [ ] Directs users to Empty Sandbox for custom experimentation
- [ ] Tags: AWS, Amazon, IoT, Real-time, Parking, Smart City, Sandbox, Evaluation, try-before-you-buy

---

### 10-6: Create Text to Speech Catalogue Entry

**As a** catalogue user
**I want** to find a Text to Speech scenario in the NDX catalogue
**So that** I can request a sandbox with accessibility audio generation already deployed

**Acceptance Criteria:**

- [ ] File created: `src/catalogue/aws/text-to-speech.md`
- [ ] Frontmatter includes `try: true` and `try_id: "30e462b3-644b-4c73-bec0-5ea1854b327e"`
- [ ] Description explains this is a learning artifact, not a production product
- [ ] Links to https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/text-to-speech/
- [ ] AWS services listed: Amazon Polly, AWS Lambda, Amazon S3
- [ ] Includes resource lifecycle warning
- [ ] Encourages Infrastructure as Code usage
- [ ] Directs users to Empty Sandbox for custom experimentation
- [ ] Tags: AWS, Amazon, Accessibility, Audio, Content, Inclusion, Sandbox, Evaluation, try-before-you-buy

---

### 10-7: Update Empty Sandbox Entry with New try_id

**As a** catalogue user
**I want** the Empty Sandbox entry to use the correct try_id
**So that** I can request a clean AWS environment without pre-deployed resources

**Acceptance Criteria:**

- [ ] File updated: `src/catalogue/aws/innovation-sandbox-empty.md`
- [ ] try_id changed to: `9813d13d-af90-433d-888f-ec17ad17d714`
- [ ] New section added: "Looking for a head start?" with links to pre-deployed scenarios
- [ ] Emphasizes this is the option for users who want to start fresh
- [ ] Resource lifecycle warning present
- [ ] Encourages Infrastructure as Code usage
- [ ] Existing content preserved

---

### 10-8: Build Validation and Testing

**As a** developer
**I want** to verify all catalogue entries work correctly
**So that** users have a functioning experience

**Acceptance Criteria:**

- [ ] `yarn build` completes without errors
- [ ] All 7 catalogue entries appear in catalogue listing
- [ ] Try buttons render correctly on each page
- [ ] External links to aws.try.ndx.digital.cabinet-office.gov.uk are valid
- [ ] Tags filter correctly in catalogue view
- [ ] try-before-you-buy filter includes all new entries

---

## Technical Notes

### File Structure

```
src/catalogue/aws/
├── connect.md                    # Existing
├── innovation-sandbox-empty.md   # Update (Story 10-7)
├── red-hat-openshift-on-aws.md   # Existing
├── council-chatbot.md            # New (Story 10-1)
├── foi-redaction.md              # New (Story 10-2)
├── planning-ai.md                # New (Story 10-3)
├── quicksight-dashboard.md       # New (Story 10-4)
├── smart-car-park.md             # New (Story 10-5)
└── text-to-speech.md             # New (Story 10-6)
```

### Frontmatter Template

```yaml
---
layout: layouts/product-try
title: [Scenario Name]
description: [Brief description]
image:
  src: /assets/catalogue/aws/[appropriate-icon].svg
  alt: [Scenario Name]
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - [Scenario-specific tags]
  - Sandbox
  - Evaluation
try: true
try_id: "[UUID from mapping]"
---
```

### try_id Mapping Reference

```yaml
council-chatbot: 8c2e6162-9d8e-42c9-82c3-d2a64d892ea8
foi-redaction: e5beeca0-af34-4299-9efc-eb153e9d9d8c
planning-ai: 39060620-dc1b-4e1f-86f6-d928b5d1ac61
quicksight-dashboard: 70de71bb-30f9-46f1-89ed-b3e14d878c10
smart-car-park: b20f1be0-e8b1-4f9b-b053-3b3704b17ab1
text-to-speech: 30e462b3-644b-4c73-bec0-5ea1854b327e
empty-sandbox: 9813d13d-af90-433d-888f-ec17ad17d714
```

---

## Definition of Done

- [ ] All 8 stories completed
- [ ] Code reviewed
- [ ] Build passes in CI
- [ ] PR merged to main
- [ ] Deployed to production
- [ ] Smoke test: Try button works for each scenario
