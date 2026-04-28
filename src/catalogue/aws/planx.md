---
layout: layouts/product-try
title: PlanX Digital Planning
description: Create digital planning application flows with the open-source platform used by 18+ UK councils including Lambeth, Southwark, Camden, and Buckinghamshire
image:
  src: /assets/catalogue/open-digital-planning/planx-logo.svg
  alt: PlanX Digital Planning
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - Planning
  - Open Source
  - Local Government
  - PlanX
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "7b1ab260-3bc8-4fa2-98f9-21cb5b86ac77"
walkthrough_url: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/"
github_source: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/planx"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/planx/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/ -->
<!-- External URL dependency: https://opendigitalplanning.org/plan-x -->
<!-- Maintained by: NDX Team | Last verified: 2026-03-24 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green) ![](https://img.shields.io/badge/owner-public_sector-blue) ![](https://img.shields.io/badge/access-NDX:Try-purple) ![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen) ![](https://img.shields.io/badge/category-Planning-teal) ![](https://img.shields.io/badge/category-Open_Source-blue) [![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/planx)

## Overview

{{ govukInsetText({
  html: "<strong>The platform used by 18+ councils to build digital planning services</strong><br>Visual flow editor &bull; Citizen-facing planning forms &bull; GraphQL API &bull; Real-time collaboration &bull; 15-minute guided walkthrough"
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product.

[PlanX](https://opendigitalplanning.org/plan-x) is the open-source digital planning platform developed by [Open Systems Lab](https://www.opensystemslab.io/) as part of the [Open Digital Planning](https://opendigitalplanning.org/) programme. It's used by 18+ UK councils — including Lambeth, Southwark, Camden, and Buckinghamshire — to create citizen-facing digital planning application services.

Service designers build planning application flows in a visual drag-and-drop editor. Citizens then use these flows to submit structured, machine-readable planning applications.

{{ govukWarningText({
  text: "After requesting your session, the environment takes approximately 15-20 minutes to deploy. Once ready, the walkthrough will guide you through logging in and exploring the platform.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Planning Features

| Feature                                                                                                | What it does                                                        |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [**Visual flow editor**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/step-2/) | Drag-and-drop nodes to build planning application forms             |
| [**Node types**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/step-3/)         | Questions, checklists, text inputs, file uploads, notices, and more |
| [**Live preview**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/step-4/)       | See exactly what citizens see as you build                          |
| [**GraphQL API**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/step-5/)        | Explore planning data through the Hasura console                    |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component         | AWS Service                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| **Compute**       | [AWS Fargate (ECS)](https://aws.amazon.com/fargate/) — 4 services            |
| **Database**      | [Amazon Aurora PostgreSQL](https://aws.amazon.com/rds/aurora/) Serverless v2 |
| **GraphQL**       | [Hasura GraphQL Engine](https://hasura.io/) with 374 migrations              |
| **HTTPS**         | [Amazon CloudFront](https://aws.amazon.com/cloudfront/)                      |
| **Collaboration** | [ShareDB](https://share.github.io/sharedb/) for real-time editing            |

</div>
</div>

---

## Getting started

Once you select **"Try this now"** above, your session environment will begin deploying automatically.

{{ govukInsetText({
  html: "<strong>What happens next:</strong><br>1. Your environment deploys (~15-20 minutes)<br>2. Follow the walkthrough to log in with the demo account<br>3. Explore the flow editor, preview planning forms, and query the GraphQL API"
}) }}

{{ govukButton({
  text: "Preview the scenario",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/planx/",
  classes: "govuk-button--secondary"
}) }}

{{ govukButton({
  text: "Preview the walkthrough",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/",
  classes: "govuk-button--secondary"
}) }}

---

## Why this matters for local government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Better quality applications

- Structured forms guide applicants through requirements
- **40% reduction** in invalid submissions reported by councils
- Machine-readable data enables automated validation
- Consistent experience across all planning application types

</div>
<div class="govuk-grid-column-one-half">

### Faster service design

- Visual editor — no coding required
- Real-time collaboration between service designers
- Instant preview of citizen-facing forms
- Reusable components across teams

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Open source, zero licence fees

- No vendor lock-in
- Community-driven development across 18+ councils
- Shared investment in digital planning infrastructure
- Full control over your data and services

</div>
<div class="govuk-grid-column-one-half">

### Standards compliance

- Open Digital Planning data standards
- GOV.UK Design System aligned
- Accessibility standards compliant
- Integrates with BOPS, Uniform, and Idox Nexus

</div>
</div>

---

## About PlanX

[PlanX](https://opendigitalplanning.org/plan-x) is developed by **[Open Systems Lab (OSL)](https://www.opensystemslab.io/)** as part of the **[Open Digital Planning (ODP)](https://opendigitalplanning.org/)** programme.

{{ govukInsetText({
  html: "<strong>Part of the ODP ecosystem</strong> &bull; [PlanX](https://opendigitalplanning.org/plan-x) (submissions) &bull; [BOPS](https://opendigitalplanning.org/back-office-planning-system-bops) (back office) &bull; [Data & API standards](https://opendigitalplanning.org/digital-planning-data-and-api)"
}) }}

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-third">

### The problem

- Planning application forms are paper-based or PDF
- 40% of submissions are invalid, requiring rework
- No structured data for automated processing
- Inconsistent experience across councils

</div>
<div class="govuk-grid-column-one-third">

### The solution

- Visual flow editor for service designers
- Guided digital forms for citizens
- Structured, machine-readable planning data
- Integrations with back-office systems

</div>
<div class="govuk-grid-column-one-third">

### The outcome

- **40% fewer** invalid submissions
- **Machine-readable** planning applications
- **Consistent** citizen experience
- **18+ councils** using PlanX in production

</div>
</div>

> "PlanX enables councils to design and publish digital planning services that guide applicants through the process, producing structured data that can flow directly into back-office systems."
>
> — **Open Digital Planning** programme

---

## Constraints

- **Budget limit**: $50 maximum spend (sufficient for extensive exploration)
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **No cost to you** - the budget is provided by NDX:Try

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

---

### How this was built

This scenario is built with open source infrastructure as code using AWS CDK (Cloud Development Kit) with Docker. The PlanX application is the same codebase used in production by UK councils, deployed on ECS Fargate with Aurora PostgreSQL and Hasura GraphQL.

[View the source code on GitHub](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/planx)

---

## Explore more scenarios

- **[BOPS Planning](/catalogue/aws/bops-planning/)** - The back-office system that processes PlanX submissions
- **[LocalGov Drupal with AI](/catalogue/aws/localgov-drupal/)** - AI-enhanced content management for councils
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent planning application document analysis
- **[Empty AWS Sandbox](/catalogue/aws/aws-empty-sandbox/)** - Start fresh with a clean AWS environment

---

## Learn more about PlanX

- [PlanX on Open Digital Planning](https://opendigitalplanning.org/plan-x)
- [Open Systems Lab](https://www.opensystemslab.io/)
- [Open Digital Planning programme](https://opendigitalplanning.org/)
- [PlanX source code on GitHub](https://github.com/theopensystemslab/planx-new)

---

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Login fails?** The password is shown in the CloudFormation Outputs tab — check you're copying it correctly
- **Environment still deploying?** PlanX takes 15-20 minutes — check the CloudFormation stack status

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
