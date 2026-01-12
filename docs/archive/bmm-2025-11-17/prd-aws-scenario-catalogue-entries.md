# PRD: AWS Scenario Catalogue Entries

**Date:** 2025-12-05
**Author:** cns
**Status:** Draft
**Feature Area:** Catalogue Enhancement

---

## Executive Summary

Extend the NDX catalogue with 7 new entries for pre-deployed AWS scenarios from the ndx_try_aws_scenarios repository. These catalogue entries allow users to request sandbox sessions with working AWS applications already deployed, enabling hands-on exploration of AWS services without starting from an empty console.

---

## Problem Statement

Currently, NDX:Try for AWS offers only an empty sandbox environment. While valuable for users who want complete freedom, this presents challenges for:

1. **New AWS users** who don't know where to start with an empty console
2. **Decision makers** who want to evaluate AWS capabilities without building from scratch
3. **Technical evaluators** who want to understand architecture patterns for common local government use cases

Users need **working examples** they can explore, inspect, and learn from - not just empty environments.

---

## Proposed Solution

Create 7 new catalogue entries in NDX that link to pre-deployed AWS scenarios:

| Scenario             | try_id                                 | Purpose                                                 |
| -------------------- | -------------------------------------- | ------------------------------------------------------- |
| Council Chatbot      | `8c2e6162-9d8e-42c9-82c3-d2a64d892ea8` | AI-powered resident Q&A using Amazon Bedrock            |
| FOI Redaction        | `e5beeca0-af34-4299-9efc-eb153e9d9d8c` | Automated sensitive data redaction                      |
| Planning AI          | `39060620-dc1b-4e1f-86f6-d928b5d1ac61` | Intelligent document analysis for planning applications |
| QuickSight Dashboard | `70de71bb-30f9-46f1-89ed-b3e14d878c10` | Service performance analytics and reporting             |
| Smart Car Park       | `b20f1be0-e8b1-4f9b-b053-3b3704b17ab1` | IoT-based real-time parking availability                |
| Text to Speech       | `30e462b3-644b-4c73-bec0-5ea1854b327e` | Accessibility audio generation using Amazon Polly       |
| Empty Sandbox        | `9813d13d-af90-433d-888f-ec17ad17d714` | Clean AWS environment with no pre-deployed assets       |

---

## Target Users

### Primary: Technical Evaluators

- Local government IT staff evaluating AWS for potential projects
- Want to see working examples of AWS architectures
- Need to understand how services integrate in practice

### Secondary: Decision Makers

- Service managers considering AI/cloud adoption
- Need to see tangible demonstrations of capabilities
- Want evidence for business cases

### Tertiary: Developers

- Building similar solutions for their councils
- Want to inspect Infrastructure as Code patterns
- Need reference implementations to learn from

---

## Key Requirements

### FR-CAT-1: Catalogue Entry Structure

Each catalogue entry MUST include:

- Title and description matching the scenario
- `try: true` frontmatter flag
- `try_id` linking to Innovation Sandbox lease template
- Tags for AWS, Amazon, and scenario-specific keywords
- `try-before-you-buy` tag for filtering

### FR-CAT-2: Learning Artifact Messaging

Each entry MUST clearly communicate:

- This is a **learning artifact**, not a production product
- Purpose is to explore how AWS services work together
- Users can inspect the deployed resources to understand architecture

### FR-CAT-3: Demo Site Links

Each pre-deployed scenario entry MUST link to:

- Live demo at `https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/{scenario-id}/`
- Users can learn more before requesting a sandbox session

### FR-CAT-4: Empty Sandbox Promotion

All pre-deployed scenario entries MUST:

- Direct users to the Empty Sandbox option for hands-on experimentation
- Explain that pre-deployed scenarios are for learning, Empty Sandbox is for building

### FR-CAT-5: Infrastructure as Code Encouragement

Each entry MUST:

- Encourage users to use Infrastructure as Code (CloudFormation, CDK, Terraform)
- Link to scenario CloudFormation templates where available
- Promote IaC as the recommended approach for production

### FR-CAT-6: Resource Lifecycle Warning

Each entry MUST clearly state:

- All resources will be deleted when session time expires OR budget limit is reached (whichever comes first)
- Users should not store important data in sandbox environments
- Export any work before session ends

### FR-CAT-7: Existing Empty Sandbox Entry

The existing `innovation-sandbox-empty.md` entry:

- MUST be updated to use new `try_id`: `9813d13d-af90-433d-888f-ec17ad17d714`
- SHOULD reference the pre-deployed scenarios as alternative starting points
- MUST retain current content as the "start fresh" option

---

## Content Requirements

### Standard Sections for Each Entry

1. **Overview** - What this scenario demonstrates
2. **What You'll Explore** - AWS services deployed, architecture highlights
3. **Learn More** - Link to aws.try.ndx.digital.cabinet-office.gov.uk scenario page
4. **Getting Started** - How to request the sandbox
5. **Important Notes** - Resource lifecycle, IaC encouragement, Empty Sandbox option
6. **Constraints** - Budget limit, duration, evaluation-only purpose
7. **Support** - Contact information

### Badge Requirements

Each entry should display:

- `![](https://img.shields.io/badge/provider-aws-green)`
- `![](https://img.shields.io/badge/access-NDX:Try-purple)`
- `![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)`
- Scenario-specific badges (AI, IoT, etc.)

---

## Success Metrics

| Metric                          | Target                                   |
| ------------------------------- | ---------------------------------------- |
| Catalogue entries created       | 7 (6 scenarios + 1 empty sandbox update) |
| Build passes                    | All entries render without errors        |
| Links valid                     | All external links resolve correctly     |
| User sessions on scenario pages | Track via analytics after deployment     |

---

## Out of Scope

- Changes to the ndx_try_aws_scenarios repository
- Modifications to Innovation Sandbox lease templates
- New scenario development
- Changes to the Try Before You Buy infrastructure

---

## Dependencies

- Innovation Sandbox lease templates must exist for each try_id (confirmed available)
- aws.try.ndx.digital.cabinet-office.gov.uk must be deployed with scenario pages (confirmed)
- Existing product-try layout must support new entries (confirmed)

---

## Implementation Approach

### Epic 10: AWS Scenario Catalogue Entries

**Stories:**

1. **10-1: Create Council Chatbot catalogue entry**
   - Create `src/catalogue/aws/council-chatbot.md`
   - Include all required sections and messaging

2. **10-2: Create FOI Redaction catalogue entry**
   - Create `src/catalogue/aws/foi-redaction.md`

3. **10-3: Create Planning AI catalogue entry**
   - Create `src/catalogue/aws/planning-ai.md`

4. **10-4: Create QuickSight Dashboard catalogue entry**
   - Create `src/catalogue/aws/quicksight-dashboard.md`

5. **10-5: Create Smart Car Park catalogue entry**
   - Create `src/catalogue/aws/smart-car-park.md`

6. **10-6: Create Text to Speech catalogue entry**
   - Create `src/catalogue/aws/text-to-speech.md`

7. **10-7: Update Empty Sandbox entry with new try_id**
   - Update `src/catalogue/aws/innovation-sandbox-empty.md`
   - Add references to pre-deployed scenario options
   - Update try_id to `9813d13d-af90-433d-888f-ec17ad17d714`

8. **10-8: Build validation and testing**
   - Verify all entries render correctly
   - Test Try button functionality
   - Validate all external links

---

## Risks and Mitigations

| Risk                                        | Likelihood | Impact | Mitigation                                              |
| ------------------------------------------- | ---------- | ------ | ------------------------------------------------------- |
| try_id mismatch                             | Low        | High   | Verify IDs against Innovation Sandbox before deployment |
| Demo site unavailable                       | Low        | Medium | Include fallback messaging if site is down              |
| User confusion about learning vs production | Medium     | Medium | Clear messaging in every entry                          |

---

## Appendix: try_id Mapping

```yaml
scenarios:
  council-chatbot: 8c2e6162-9d8e-42c9-82c3-d2a64d892ea8
  foi-redaction: e5beeca0-af34-4299-9efc-eb153e9d9d8c
  planning-ai: 39060620-dc1b-4e1f-86f6-d928b5d1ac61
  quicksight-dashboard: 70de71bb-30f9-46f1-89ed-b3e14d878c10
  smart-car-park: b20f1be0-e8b1-4f9b-b053-3b3704b17ab1
  text-to-speech: 30e462b3-644b-4c73-bec0-5ea1854b327e
  empty-sandbox: 9813d13d-af90-433d-888f-ec17ad17d714
```

---

_This PRD captures the vision and requirements for AWS Scenario Catalogue Entries._

_Next: Create epic file with detailed stories for implementation._
