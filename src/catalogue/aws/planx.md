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

<a href="https://opendigitalplanning.org/plan-x" target="_blank" rel="noopener">PlanX</a> is the open-source digital planning platform developed by <a href="https://www.opensystemslab.io/" target="_blank" rel="noopener">Open Systems Lab</a> as part of the <a href="https://opendigitalplanning.org/" target="_blank" rel="noopener">Open Digital Planning</a> programme. It's used by 18+ UK councils — including Lambeth, Southwark, Camden, and Buckinghamshire — to create citizen-facing digital planning application services.

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

| Feature                                                                                                                                          | What it does                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/step-2/" target="_blank" rel="noopener">**Visual flow editor**</a> | Drag-and-drop nodes to build planning application forms             |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/step-3/" target="_blank" rel="noopener">**Node types**</a>         | Questions, checklists, text inputs, file uploads, notices, and more |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/step-4/" target="_blank" rel="noopener">**Live preview**</a>       | See exactly what citizens see as you build                          |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/planx/step-5/" target="_blank" rel="noopener">**GraphQL API**</a>        | Explore planning data through the Hasura console                    |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component         | AWS Service                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Compute**       | <a href="https://aws.amazon.com/fargate/" target="_blank" rel="noopener">AWS Fargate (ECS)</a> — 4 services            |
| **Database**      | <a href="https://aws.amazon.com/rds/aurora/" target="_blank" rel="noopener">Amazon Aurora PostgreSQL</a> Serverless v2 |
| **GraphQL**       | <a href="https://hasura.io/" target="_blank" rel="noopener">Hasura GraphQL Engine</a> with 374 migrations              |
| **HTTPS**         | <a href="https://aws.amazon.com/cloudfront/" target="_blank" rel="noopener">Amazon CloudFront</a>                      |
| **Collaboration** | <a href="https://share.github.io/sharedb/" target="_blank" rel="noopener">ShareDB</a> for real-time editing            |

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

<a href="https://opendigitalplanning.org/plan-x" target="_blank" rel="noopener">PlanX</a> is developed by **<a href="https://www.opensystemslab.io/" target="_blank" rel="noopener">Open Systems Lab (OSL)</a>** as part of the **<a href="https://opendigitalplanning.org/" target="_blank" rel="noopener">Open Digital Planning (ODP)</a>** programme.

{{ govukInsetText({
  html: "<strong>Part of the ODP ecosystem</strong> &bull; <a href='https://opendigitalplanning.org/plan-x' target='_blank' rel='noopener'>PlanX</a> (submissions) &bull; <a href='https://opendigitalplanning.org/back-office-planning-system-bops' target='_blank' rel='noopener'>BOPS</a> (back office) &bull; <a href='https://opendigitalplanning.org/digital-planning-data-and-api' target='_blank' rel='noopener'>Data & API standards</a>"
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

<a href="https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/planx" target="_blank" rel="noopener">View the source code on GitHub <span class="govuk-visually-hidden">(opens in new tab)</span></a>

---

## Explore more scenarios

- **[BOPS Planning](/catalogue/aws/bops-planning/)** - The back-office system that processes PlanX submissions
- **[LocalGov Drupal with AI](/catalogue/aws/localgov-drupal/)** - AI-enhanced content management for councils
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent planning application document analysis
- **[Empty AWS Sandbox](/catalogue/aws/aws-empty-sandbox/)** - Start fresh with a clean AWS environment

---

## Learn more about PlanX

- <a href="https://opendigitalplanning.org/plan-x" target="_blank" rel="noopener">PlanX on Open Digital Planning</a>
- <a href="https://www.opensystemslab.io/" target="_blank" rel="noopener">Open Systems Lab</a>
- <a href="https://opendigitalplanning.org/" target="_blank" rel="noopener">Open Digital Planning programme</a>
- <a href="https://github.com/theopensystemslab/planx-new" target="_blank" rel="noopener">PlanX source code on GitHub</a>

---

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Login fails?** The password is shown in the CloudFormation Outputs tab — check you're copying it correctly
- **Environment still deploying?** PlanX takes 15-20 minutes — check the CloudFormation stack status

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
