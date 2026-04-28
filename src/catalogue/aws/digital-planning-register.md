---
layout: layouts/product-try
title: Digital Planning Register
description: Explore the open-source public planning application register from TPXimpact - used by UK councils to give residents transparent access to planning applications
image:
  src: /assets/catalogue/open-digital-planning/dpr-logo.svg
  alt: Digital Planning Register
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - Planning
  - Open Source
  - Local Government
  - Next.js
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "e38aaceb-c4b5-49d5-b32c-c67aba91a150"
walkthrough_url: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/digital-planning-register/"
github_source: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/digital-planning-register"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/digital-planning-register/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/digital-planning-register/ -->
<!-- External URL dependency: https://github.com/tpximpact/digital-planning-register -->
<!-- Maintained by: NDX Team | Last verified: 2026-03-24 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green) ![](https://img.shields.io/badge/owner-public_sector-blue) ![](https://img.shields.io/badge/access-NDX:Try-purple) ![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen) ![](https://img.shields.io/badge/category-Planning-teal) ![](https://img.shields.io/badge/category-Open_Source-blue) [![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/digital-planning-register)

## Overview

{{ govukInsetText({
  html: "<strong>The public planning register used by real UK councils</strong><br>9 councils configured &bull; Search &amp; map views &bull; GOV.UK Design System &bull; 10-minute guided walkthrough"
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product.

The [Digital Planning Register](https://github.com/tpximpact/digital-planning-register) is the open-source public-facing application built by [TPXimpact](https://www.tpximpact.com/) as part of the [Open Digital Planning](https://opendigitalplanning.org/) ecosystem. It gives residents a unified, accessible way to search and view planning applications across councils — connecting to [BOPS](https://opendigitalplanning.org/back-office-planning-system-bops) back-office systems via API.

Currently used by 9 UK councils including Camden, Lambeth, and Southwark.

{{ govukWarningText({
  text: "After requesting your session, the environment takes approximately 8-12 minutes to deploy. Once ready, the walkthrough will guide you through browsing councils and searching planning applications.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Register Features

| Feature                                                                                                                     | What it does                                                |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [**Council selection**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/digital-planning-register/step-2/)   | Browse and select from configured councils                  |
| [**Application search**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/digital-planning-register/step-3/)  | Search by reference, address, or description with filters   |
| [**Application details**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/digital-planning-register/step-3/) | Maps, progress timeline, documents, comments, and decisions |
| [**AWS architecture**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/digital-planning-register/step-4/)    | Stateless ECS Fargate deployment with CloudFront HTTPS      |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component         | AWS Service                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| **Compute**       | [AWS Fargate (ECS)](https://aws.amazon.com/fargate/)                      |
| **Load Balancer** | [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/) |
| **HTTPS**         | [Amazon CloudFront](https://aws.amazon.com/cloudfront/)                   |
| **Logging**       | [Amazon CloudWatch](https://aws.amazon.com/cloudwatch/)                   |

</div>
</div>

---

## Getting started

Once you select **"Try this now"** above, your session environment will begin deploying automatically.

{{ govukInsetText({
  html: "<strong>What happens next:</strong><br>1. Your environment deploys (~8-12 minutes)<br>2. Follow the walkthrough to find the register URL<br>3. Browse councils, search applications, and explore the map views"
}) }}

{{ govukButton({
  text: "Preview the scenario",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/digital-planning-register/",
  classes: "govuk-button--secondary"
}) }}

{{ govukButton({
  text: "Preview the walkthrough",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/digital-planning-register/",
  classes: "govuk-button--secondary"
}) }}

---

## Why this matters for local government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Public transparency

- Residents search planning applications instantly
- No account creation required
- Map views with site boundaries
- Fewer phone calls and FOI requests

</div>
<div class="govuk-grid-column-one-half">

### Multi-council design

- One register serves multiple councils
- Each council maintains their own BOPS back-office
- Consistent, familiar experience for residents
- Shared development costs

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Stateless simplicity

- No database to manage or back up
- Data always fresh from BOPS APIs
- Easy to deploy, scale, and maintain
- Low operational overhead

</div>
<div class="govuk-grid-column-one-half">

### GOV.UK Design System

- WCAG 2.2 AA accessible by default
- User-tested design patterns
- Familiar to government service users
- No UX research needed

</div>
</div>

---

## About the Digital Planning Register

The [Digital Planning Register](https://github.com/tpximpact/digital-planning-register) is built by **[TPXimpact](https://www.tpximpact.com/)** as part of the **[Open Digital Planning (ODP)](https://opendigitalplanning.org/)** ecosystem. It's the public-facing counterpart to [BOPS](https://opendigitalplanning.org/back-office-planning-system-bops).

{{ govukInsetText({
  html: "<strong>Part of the ODP ecosystem</strong> &bull; [BOPS](https://opendigitalplanning.org/back-office-planning-system-bops) (back office) &bull; [Digital Planning Register](https://github.com/tpximpact/digital-planning-register) (public) &bull; [PlanX](https://opendigitalplanning.org/plan-x) (submissions)"
}) }}

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-third">

### The problem

- Residents can't easily find planning applications
- Each council has a different system
- No consistent search experience
- Planning information is hard to access

</div>
<div class="govuk-grid-column-one-third">

### The solution

- Unified register across councils
- Search by reference, address, or description
- Map views with site boundaries
- GOV.UK Design System accessibility

</div>
<div class="govuk-grid-column-one-third">

### The outcome

- **87% faster** search times for residents
- **£45k annual savings** (estimated, reduced FOI/phone enquiries)
- Consistent experience across councils
- Better public engagement

</div>
</div>

> "The Digital Planning Register gives residents instant access to planning applications, reducing the burden on planning teams while improving transparency."
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

This scenario is built with open source infrastructure as code using AWS CDK (Cloud Development Kit). The Digital Planning Register application is the same Next.js codebase used in production by UK councils.

[View the source code on GitHub](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/digital-planning-register)

---

## Explore more scenarios

- **[Back Office Planning System (BOPS)](/catalogue/aws/bops-planning/)** - The back-office system that powers the register
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent planning application document analysis
- **[LocalGov Drupal with AI](/catalogue/aws/localgov-drupal/)** - AI-enhanced content management for councils
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services chatbot
- **[Empty AWS Sandbox](/catalogue/aws/aws-empty-sandbox/)** - Start fresh with a clean AWS environment

---

## Learn more

- [Digital Planning Register on GitHub](https://github.com/tpximpact/digital-planning-register)
- [Open Digital Planning programme](https://opendigitalplanning.org/)
- [BOPS - Back Office Planning System](https://opendigitalplanning.org/back-office-planning-system-bops)
- [TPXimpact](https://www.tpximpact.com/)

---

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Environment still deploying?** The register takes 8-12 minutes — check the CloudFormation stack status
- **Councils not showing?** The demo uses test council data — real council data requires BOPS API configuration

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
