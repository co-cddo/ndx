---
layout: layouts/product-try
title: LocalGov Drupal with AI
description: Explore an AI-enhanced content management system for UK councils - the most comprehensive AWS and AI experience on NDX:Try
image:
  src: /assets/catalogue/localgov-drupal/localgov-drupal-logo.svg
  alt: LocalGov Drupal
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - AI
  - CMS
  - Content Management
  - LocalGov Drupal
  - Local Government
  - Open Source
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "cbfadf01-53cb-4a4c-a83e-db4d1a3aa988"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/localgov-drupal/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-drupal/ -->
<!-- Maintained by: NDX Team | Last verified: 2026-01-08 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)
![](https://img.shields.io/badge/category-AI-orange)
![](https://img.shields.io/badge/category-CMS-blue)

## Overview

{{ govukInsetText({
  html: "<strong>Most comprehensive experience on NDX:Try</strong><br>7 AI features • 8 AWS services • 40-minute guided walkthrough • Built for local government"
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product.

LocalGov Drupal with AI showcases how UK councils can transform their content management with **seven AI-powered capabilities**, all running on robust AWS infrastructure.

{{ govukWarningText({
  text: "After requesting your session, the environment takes approximately 40 minutes to deploy. Once ready, the walkthrough will guide you through logging in and exploring all features.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### AI Content Features

| Feature                                                                                                                                                             | AWS Service                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-drupal/step-4/" target="_blank" rel="noopener">**Content editing**</a>             | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a>         |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-drupal/step-5/" target="_blank" rel="noopener">**Plain English conversion**</a>    | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a>         |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-drupal/step-6/" target="_blank" rel="noopener">**Alt-text generation**</a>         | <a href="https://aws.amazon.com/rekognition/" target="_blank" rel="noopener">Amazon Rekognition</a> |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-drupal/step-8/" target="_blank" rel="noopener">**Text-to-speech**</a>              | <a href="https://aws.amazon.com/polly/" target="_blank" rel="noopener">Amazon Polly</a>             |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-drupal/step-9/" target="_blank" rel="noopener">**Translation (75+ languages)**</a> | <a href="https://aws.amazon.com/translate/" target="_blank" rel="noopener">Amazon Translate</a>     |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-drupal/step-7/" target="_blank" rel="noopener">**PDF-to-web conversion**</a>       | <a href="https://aws.amazon.com/textract/" target="_blank" rel="noopener">Amazon Textract</a>       |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-drupal/step-3/" target="_blank" rel="noopener">**Council branding**</a>            | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a>         |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component    | AWS Service                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------- |
| **Compute**  | <a href="https://aws.amazon.com/fargate/" target="_blank" rel="noopener">AWS Fargate</a>      |
| **Database** | <a href="https://aws.amazon.com/rds/aurora/" target="_blank" rel="noopener">Amazon Aurora</a> |
| **Storage**  | <a href="https://aws.amazon.com/efs/" target="_blank" rel="noopener">Amazon EFS</a>           |
| **CMS**      | <a href="https://www.drupal.org/" target="_blank" rel="noopener">Drupal 10</a>                |

</div>
</div>

---

## Getting started

Once you select **"Try this now"** above, your session environment will begin deploying automatically.

{{ govukInsetText({
  html: "<strong>What happens next:</strong><br>1. Your environment deploys (~40 minutes)<br>2. Follow the walkthrough to log in and explore<br>3. The walkthrough guides you through everything"
}) }}

{{ govukButton({
  text: "Preview the scenario",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/localgov-drupal/",
  classes: "govuk-button--secondary"
}) }}

{{ govukButton({
  text: "Preview the walkthrough",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-drupal/",
  classes: "govuk-button--secondary"
}) }}

---

## Why This Matters for Local Government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Accessibility at Scale

- **Auto alt-text** for images using <a href="https://aws.amazon.com/rekognition/" target="_blank" rel="noopener">Amazon Rekognition</a>
- **Text-to-speech** via <a href="https://aws.amazon.com/polly/" target="_blank" rel="noopener">Amazon Polly</a> for audio access
- **PDF conversion** with <a href="https://aws.amazon.com/textract/" target="_blank" rel="noopener">Amazon Textract</a>
- Helps meet WCAG 2.1 Level AA requirements

</div>
<div class="govuk-grid-column-one-half">

### Multilingual communities

- **75+ languages** via <a href="https://aws.amazon.com/translate/" target="_blank" rel="noopener">Amazon Translate</a>
- Instant translation without manual costs
- Consistent service delivery regardless of language

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Content efficiency

- **AI drafting** powered by <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a>
- **Plain English conversion** for accessible communications
- Reduced time on content creation and review

</div>
<div class="govuk-grid-column-one-half">

### Digital inclusion

- Multiple AI capabilities ensure services reach everyone
- Practical application of responsible AI
- Demonstrates modern public sector digital services

</div>
</div>

---

## About LocalGov Drupal

LocalGov Drupal is an **open-source CMS built by UK councils, for councils**. This NDX:Try scenario enhances it with AWS AI capabilities.

{{ govukInsetText({
  html: "<strong>56+ councils</strong> • <strong>100+ live sites</strong> • <strong>19 certified suppliers</strong> • <strong>Open Digital Cooperative</strong> governance"
}) }}

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-third">

### Cost benefits

- **Up to 80% cost reduction**
- Average £120k reduced to £20k-£60k
- No licensing fees
- No vendor lock-in (GPL-2.0)

</div>
<div class="govuk-grid-column-one-third">

### Time benefits

- **8-12 week deployment**
- vs. traditional 12-month timelines
- Pre-built council content types
- Shared development investment

</div>
<div class="govuk-grid-column-one-third">

### Standards

- **WCAG 2.1 Level AA** compliant
- **GOV.UK Design System** aligned
- Evidence-based design
- Built on **Drupal 10**

</div>
</div>

---

## Real council success stories

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Waltham Forest council

One of the first councils to join in the beta phase:

- **£90,000 saved** in development costs
- **3-6 months** of development time saved
- **25% improvement** in user satisfaction
- **96/100** accessibility score (vs. 87 benchmark)
- **40% faster** page load performance
- **10-15% reduction** in calls to resolution centre

</div>
<div class="govuk-grid-column-one-half">

### Cumbria County council

Rapid improvements with limited budget:

- **21% reduction** in contact volume
- **25% faster** resolution times
- **£33,000** annual potential savings
- Achieved in 6 months what they had tried to achieve for 3 years

</div>
</div>

> "LGD is what proper local gov digital collaboration looks like. A single platform where everyone gets the benefits of each other's investment for free. Solving problems once, together."
>
> — **Neil Williams**, Chief Digital Officer at Croydon Council (former head of GOV.UK)

---

## Governance

Since January 2023, LocalGov Drupal has been governed by the **<a href="https://opendigital.coop/" target="_blank" rel="noopener">Open Digital Cooperative</a>** - a not-for-profit multistakeholder cooperative ensuring long-term sustainability and democratic governance by member councils and suppliers.

The platform represents true collaboration: councils share development costs and benefit from each other's investments. When one council builds a feature, all 56+ councils benefit.

---

## Explore more scenarios

- **[Empty AWS Sandbox](/catalogue/aws/aws-empty-sandbox/)** - Start fresh with a clean AWS environment
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services chatbot
- **[FOI Redaction](/catalogue/aws/foi-redaction/)** - Automated sensitive data removal
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent planning application analysis
- **[Text to Speech](/catalogue/aws/text-to-speech/)** - Accessibility audio generation

---

## Learn More About LocalGov Drupal

- <a href="https://localgovdrupal.org/" target="_blank" rel="noopener">LocalGov Drupal official website</a>
- <a href="https://docs.localgovdrupal.org/" target="_blank" rel="noopener">LocalGov Drupal documentation</a>
- <a href="https://localgovdrupal.org/community/our-councils" target="_blank" rel="noopener">Councils using LocalGov Drupal</a>
