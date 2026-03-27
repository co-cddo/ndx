---
layout: layouts/product-try
title: FixMyStreet
description: Citizen problem reporting platform — citizens report potholes, broken streetlights, and graffiti to their council. Used by thousands of UK councils.
image:
  src: /assets/catalogue/fixmystreet/fixmystreet-logo.svg
  alt: FixMyStreet by mySociety
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - Citizen Engagement
  - Local Government
  - Open Source
  - Problem Reporting
  - Civic Tech
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "4428c1dd-1650-4ae3-9c8b-93992fd8a897"
walkthrough_url: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/fixmystreet/"
github_source: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/fixmystreet"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/fixmystreet/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/fixmystreet/ -->
<!-- Maintained by: NDX Team | Last verified: 2026-03-27 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)
![](https://img.shields.io/badge/category-Citizen_Engagement-blue)
![](https://img.shields.io/badge/category-Open_Source-green)
[![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/fixmystreet)

## Overview

{{ govukInsetText({
  html: "<strong>Citizen problem reporting for UK councils</strong><br>260 demo reports • 150 updates • OpenStreetMap integration • Council admin dashboard • 20-minute walkthrough"
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product.

FixMyStreet is <a href="https://www.mysociety.org/" target="_blank" rel="noopener">mySociety's</a> open-source platform that lets citizens report local problems — potholes, broken streetlights, graffiti, fly-tipping — directly to the council responsible for fixing them. Used by **thousands of UK councils**, it's one of the most successful civic technology platforms in the world.

This NDX:Try scenario deploys a fully working FixMyStreet instance with **260 seeded demo reports**, **150 citizen updates**, and a **council admin dashboard** — all running on AWS managed infrastructure.

{{ govukWarningText({
  text: "After requesting your session, the environment takes approximately 25 minutes to deploy. Once ready, the walkthrough will guide you through the citizen and council experience.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Citizen experience

| Feature              | Description                                          |
| -------------------- | ---------------------------------------------------- |
| **Report a problem** | Pin location on map, select category, describe issue |
| **Track progress**   | Follow reports from submission through to resolution |
| **View updates**     | See council responses and citizen comments           |
| **Browse reports**   | Explore all reports in an area with map pins         |
| **Local alerts**     | Subscribe to notifications for your area             |

</div>
<div class="govuk-grid-column-one-half">

### Council tools

| Feature                    | Description                              |
| -------------------------- | ---------------------------------------- |
| **Reports dashboard**      | Filter by status, category, and location |
| **Admin panel**            | Manage reports, users, and categories    |
| **Report management**      | Update status, assign, and respond       |
| **Category configuration** | Customise report categories              |
| **Statistics**             | View reporting trends and performance    |

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component          | AWS Service                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **HTTPS & CDN**    | <a href="https://aws.amazon.com/cloudfront/" target="_blank" rel="noopener">Amazon CloudFront</a>                   |
| **Load balancing** | <a href="https://aws.amazon.com/elasticloadbalancing/" target="_blank" rel="noopener">Application Load Balancer</a> |
| **Compute**        | <a href="https://aws.amazon.com/fargate/" target="_blank" rel="noopener">AWS Fargate</a> (3 containers)             |
| **Database**       | <a href="https://aws.amazon.com/rds/aurora/" target="_blank" rel="noopener">Aurora PostgreSQL</a> with PostGIS      |
| **File storage**   | <a href="https://aws.amazon.com/efs/" target="_blank" rel="noopener">Amazon EFS</a>                                 |

</div>
<div class="govuk-grid-column-one-half">

### Demo data

| Data           | Volume                                                          |
| -------------- | --------------------------------------------------------------- |
| **Reports**    | 260 across 5 categories                                         |
| **Updates**    | 150 citizen and council comments                                |
| **Users**      | 15 citizen reporters                                            |
| **Categories** | Potholes, Street Lighting, Graffiti, Fly-tipping, Broken Paving |
| **Location**   | Camden, London                                                  |

</div>
</div>

---

## Getting started

Once you select **"Try this now"** above, your session environment will begin deploying automatically.

{{ govukInsetText({
  html: "<strong>What happens next:</strong><br>1. Your environment deploys (~25 minutes)<br>2. Follow the walkthrough to find your credentials<br>3. Explore both the citizen and council views"
}) }}

{{ govukButton({
  text: "Preview the scenario",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/fixmystreet/",
  classes: "govuk-button--secondary"
}) }}

{{ govukButton({
  text: "Preview the walkthrough",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/fixmystreet/",
  classes: "govuk-button--secondary"
}) }}

---

## Why this matters for local government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Citizen engagement

- **Direct reporting** — citizens report issues from their phone or computer
- **Transparency** — everyone can see what's been reported and what's being fixed
- **Accountability** — public tracking of council response times
- **Accessibility** — works on any device, no app download required

</div>
<div class="govuk-grid-column-one-half">

### Council efficiency

- **Centralised inbox** — all reports in one place, categorised automatically
- **Prioritisation** — filter by category, status, and location
- **Trend analysis** — spot recurring problems and allocate resources
- **Citizen communication** — respond to reports without email overhead

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Open source value

- **No licensing fees** — completely free to use (AGPL-3.0)
- **Community maintained** — mySociety + global contributor network
- **Proven at scale** — handling millions of reports across the UK
- **Customisable** — cobrand for your council's identity

</div>
<div class="govuk-grid-column-one-half">

### Cloud-native on AWS

- **Managed infrastructure** — no servers to maintain
- **Auto-scaling** — Aurora Serverless v2 scales to demand
- **HTTPS everywhere** — CloudFront provides secure access
- **Geographic queries** — PostGIS powers location-based features

</div>
</div>

---

## About FixMyStreet

FixMyStreet was created by <a href="https://www.mysociety.org/" target="_blank" rel="noopener">mySociety</a>, a UK charity that builds digital tools for democracy and civic participation. Launched in 2007, it has become the standard platform for citizen problem reporting across the UK.

{{ govukInsetText({
  html: "<strong>1 million+ reports</strong> • <strong>Used across the UK</strong> • <strong>Open source since 2007</strong> • <strong>Built by mySociety</strong>"
}) }}

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-third">

### Impact

- **Over 1 million** problems reported
- Used by councils of all sizes
- Active community of contributors
- Deployed internationally

</div>
<div class="govuk-grid-column-one-third">

### Technology

- **Perl/Catalyst** application framework
- **PostgreSQL** with PostGIS
- **OpenStreetMap** integration
- **MapIt** for council area lookups

</div>
<div class="govuk-grid-column-one-third">

### Standards

- Mobile-responsive design
- Accessible interface
- Multi-language support (Welsh included)
- RESTful API for integrations

</div>
</div>

> "FixMyStreet empowers citizens to take ownership of their local environment, while giving councils the tools to respond efficiently."
>
> — **mySociety**

---

### How this was built

This scenario deploys FixMyStreet using AWS CDK with a custom Docker image extending the official `fixmystreet/fixmystreet:stable` image. The infrastructure includes Aurora PostgreSQL with PostGIS for geospatial data, an nginx sidecar for HTTP routing, and memcached for caching — all orchestrated by AWS Fargate.

<a href="https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/fixmystreet" target="_blank" rel="noopener">View the source code on GitHub <span class="govuk-visually-hidden">(opens in new tab)</span></a>

---

## Explore more scenarios

- **[LocalGov Drupal with AI](/catalogue/aws/localgov-drupal/)** — AI-enhanced CMS for UK councils
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** — AI-powered resident services chatbot
- **[LocalGov IMS](/catalogue/aws/localgov-ims/)** — Income Management System with GOV.UK Pay
- **[BOPS Planning](/catalogue/aws/bops-planning/)** — Building control planning system
- **[Empty AWS Sandbox](/catalogue/aws/aws-empty-sandbox/)** — Start fresh with a clean AWS environment

---

## Learn more

- <a href="https://www.fixmystreet.com/" target="_blank" rel="noopener">FixMyStreet live site</a>
- <a href="https://fixmystreet.org/" target="_blank" rel="noopener">FixMyStreet Platform documentation</a>
- <a href="https://github.com/mysociety/fixmystreet" target="_blank" rel="noopener">FixMyStreet source code on GitHub</a>
- <a href="https://www.mysociety.org/" target="_blank" rel="noopener">mySociety — the charity behind FixMyStreet</a>
