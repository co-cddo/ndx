---
layout: layouts/product-try
title: Back Office Planning System (BOPS)
description: Explore the open-source planning case management system from Open Digital Planning - used by UK councils to process real planning applications
image:
  src: /assets/catalogue/open-digital-planning/bops-logo.svg
  alt: Back Office Planning System (BOPS)
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - Planning
  - Open Source
  - Local Government
  - BOPS
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "75cedf5d-d723-421d-a021-297ba5fcc3a3"
walkthrough_url: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/bops-planning/"
github_source: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/bops-planning"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/bops-planning/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/bops-planning/ -->
<!-- External URL dependency: https://opendigitalplanning.org/back-office-planning-system-bops -->
<!-- Maintained by: NDX Team | Last verified: 2026-03-18 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green) ![](https://img.shields.io/badge/owner-public_sector-blue) ![](https://img.shields.io/badge/access-NDX:Try-purple) ![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen) ![](https://img.shields.io/badge/category-Planning-teal) ![](https://img.shields.io/badge/category-Open_Source-blue) [![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/bops-planning)

## Overview

{{ govukInsetText({
  html: "<strong>The planning system used by real UK councils</strong><br>35 sample applications &bull; 3 user roles &bull; Applicants portal with OS Maps &bull; 15-minute guided walkthrough"
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product.

The <a href="https://opendigitalplanning.org/back-office-planning-system-bops" target="_blank" rel="noopener">Back Office Planning System (BOPS)</a> is the open-source planning case management system developed by the <a href="https://opendigitalplanning.org/" target="_blank" rel="noopener">Open Digital Planning</a> programme. It's used by councils including Lambeth, Southwark, and Buckinghamshire to process real planning applications.

This scenario deploys the complete BOPS system with realistic sample data, so you can experience the full planning application lifecycle as a case officer would use it.

{{ govukWarningText({
  text: "After requesting your session, the environment takes approximately 10-15 minutes to deploy. Once ready, the walkthrough will guide you through logging in and exploring the system.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Planning Features

| Feature                                                                                                                                                      | What it does                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/bops-planning/step-1/" target="_blank" rel="noopener">**Officer dashboard**</a>      | Case management with workload view and statutory deadlines     |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/bops-planning/step-2/" target="_blank" rel="noopener">**Application management**</a> | Browse, filter, and search 35 realistic planning cases         |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/bops-planning/step-3/" target="_blank" rel="noopener">**Assessment workflow**</a>    | Validation, consultation, assessment, and determination stages |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/bops-planning/step-4/" target="_blank" rel="noopener">**Applicants portal**</a>      | Public-facing portal with OS Maps and consultation comments    |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component    | AWS Service                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Compute**  | <a href="https://aws.amazon.com/fargate/" target="_blank" rel="noopener">AWS Fargate (ECS)</a>                        |
| **Database** | <a href="https://aws.amazon.com/rds/aurora/" target="_blank" rel="noopener">Amazon Aurora PostgreSQL</a> with PostGIS |
| **Caching**  | <a href="https://aws.amazon.com/elasticache/" target="_blank" rel="noopener">Amazon ElastiCache (Redis)</a>           |
| **HTTPS**    | <a href="https://aws.amazon.com/cloudfront/" target="_blank" rel="noopener">Amazon CloudFront</a> (2 distributions)   |
| **Mapping**  | <a href="https://osdatahub.os.uk/" target="_blank" rel="noopener">Ordnance Survey Vector Tiles</a>                    |

</div>
</div>

---

## Getting started

Once you select **"Try this now"** above, your session environment will begin deploying automatically.

{{ govukInsetText({
  html: "<strong>What happens next:</strong><br>1. Your environment deploys (~10-15 minutes)<br>2. Follow the walkthrough to log in as a planning officer<br>3. Browse applications, review workflows, and explore the public portal"
}) }}

{{ govukButton({
  text: "Preview the scenario",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/bops-planning/",
  classes: "govuk-button--secondary"
}) }}

{{ govukButton({
  text: "Preview the walkthrough",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/bops-planning/",
  classes: "govuk-button--secondary"
}) }}

---

## Why this matters for local government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Faster application processing

- **40% reduction** in processing time reported by BOPS councils
- Structured workflow ensures nothing is missed
- Statutory deadlines tracked automatically
- Consistent quality across thousands of applications

</div>
<div class="govuk-grid-column-one-half">

### Public transparency

- Residents track applications affecting their area
- Consultation comments submitted online
- Map views with site boundaries
- Fewer phone calls and FOI requests

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Open source, zero licence fees

- No vendor lock-in
- Community-driven development
- Shared investment across councils
- Full control over your data

</div>
<div class="govuk-grid-column-one-half">

### Standards compliance

- Statutory planning process built in
- GOV.UK Design System aligned
- Accessibility standards compliant
- Data standards from <a href="https://opendigitalplanning.org/" target="_blank" rel="noopener">Open Digital Planning</a>

</div>
</div>

---

## About BOPS

<a href="https://opendigitalplanning.org/back-office-planning-system-bops" target="_blank" rel="noopener">BOPS</a> is developed by the **<a href="https://opendigitalplanning.org/" target="_blank" rel="noopener">Open Digital Planning (ODP)</a>** programme, a collaboration between DLUHC and local planning authorities to modernise England's planning system.

{{ govukInsetText({
  html: "<strong>Part of the ODP ecosystem</strong> &bull; <a href='https://opendigitalplanning.org/back-office-planning-system-bops' target='_blank' rel='noopener'>BOPS</a> (back office) &bull; <a href='https://opendigitalplanning.org/plan-x' target='_blank' rel='noopener'>PlanX</a> (submissions) &bull; <a href='https://opendigitalplanning.org/digital-planning-data-and-api' target='_blank' rel='noopener'>Data & API standards</a>"
}) }}

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-third">

### The problem

- Planning applications processed manually
- Inconsistent workflows across officers
- Residents have no visibility into progress
- Statutory deadlines missed

</div>
<div class="govuk-grid-column-one-third">

### The solution

- Structured digital workflow from validation to determination
- Dashboard-driven case management
- Public applicants portal with maps
- Automated deadline tracking

</div>
<div class="govuk-grid-column-one-third">

### The outcome

- **40% faster** processing times
- **£180k annual savings** (estimated, 2,000 apps/year)
- Consistent quality and compliance
- Better public engagement

</div>
</div>

> "BOPS is transforming how councils process planning applications. By digitising the entire workflow, we're making planning faster, more transparent, and more consistent."
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

This scenario is built with open source infrastructure as code using AWS CDK (Cloud Development Kit) with Docker. The BOPS application is the same codebase used in production by UK councils.

<a href="https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/bops-planning" target="_blank" rel="noopener">View the source code on GitHub <span class="govuk-visually-hidden">(opens in new tab)</span></a>

---

## Explore more scenarios

- **[Empty AWS Sandbox](/catalogue/aws/aws-empty-sandbox/)** - Start fresh with a clean AWS environment
- **[LocalGov Drupal with AI](/catalogue/aws/localgov-drupal/)** - AI-enhanced content management for councils
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent planning application document analysis
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services chatbot
- **[Simply Readable](/catalogue/aws/simply-readable/)** - Document translation and Easy Read conversion

---

## Learn more about BOPS

- <a href="https://opendigitalplanning.org/back-office-planning-system-bops" target="_blank" rel="noopener">Back Office Planning System (BOPS) on Open Digital Planning</a>
- <a href="https://opendigitalplanning.org/" target="_blank" rel="noopener">Open Digital Planning programme</a>
- <a href="https://opendigitalplanning.org/plan-x" target="_blank" rel="noopener">PlanX submission portal</a>
- <a href="https://github.com/unboxed/bops" target="_blank" rel="noopener">BOPS source code on GitHub</a>

---

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Login fails?** The password is shown in the CloudFormation Outputs tab — check you're copying it correctly
- **Environment still deploying?** BOPS takes 10-15 minutes — check the CloudFormation stack status

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
