---
layout: layouts/product-try
title: Simply Readable
description: AI-powered document translation and Easy Read conversion, built by Swindon Borough Council for UK local government
image:
  src: /assets/catalogue/aws/simply-readable-logo.svg
  alt: Simply Readable
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - AI
  - Translation
  - accessibility
  - Easy Read
  - Local Government
  - Open Source
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "cd246bda-5f04-4971-81ab-e968b1952695"
walkthrough_url: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/simply-readable/"
github_source: "https://github.com/aws-samples/document-translation"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/simply-readable/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/simply-readable/ -->
<!-- Maintained by: NDX Team | Last verified: 2026-03-09 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)
![](https://img.shields.io/badge/category-AI-orange)
![](https://img.shields.io/badge/category-Accessibility-blue)
[![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/aws-samples/document-translation)

## Overview

{{ govukInsetText({
  html: "<strong>Built by a council, for councils</strong><br>Swindon Borough Council built Simply Readable to solve a real problem — then open-sourced it so every council can benefit. Now adopted by Edinburgh, Newport, Southampton, and West Berkshire."
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product.

Simply Readable brings together **document translation** and **Easy Read conversion** in a single web application. Upload a document, translate it into any of **75 languages** using Amazon Translate, or convert it to **Easy Read format** using Amazon Bedrock — all in minutes, not weeks.

{{ govukWarningText({
  text: "After requesting your session, the environment will deploy automatically. Once ready, the walkthrough will guide you through logging in and exploring all features.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Core Features

| Feature                                                                                                                                                      | AWS Service                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/simply-readable/step-2/" target="_blank" rel="noopener">**Document translation**</a> | <a href="https://aws.amazon.com/translate/" target="_blank" rel="noopener">Amazon Translate</a> |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/simply-readable/step-3/" target="_blank" rel="noopener">**Easy Read conversion**</a> | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a>     |
| **User authentication**                                                                                                                                      | <a href="https://aws.amazon.com/cognito/" target="_blank" rel="noopener">Amazon Cognito</a>     |
| **Real-time updates**                                                                                                                                        | <a href="https://aws.amazon.com/appsync/" target="_blank" rel="noopener">AWS AppSync</a>        |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component         | AWS Service                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Orchestration** | <a href="https://aws.amazon.com/step-functions/" target="_blank" rel="noopener">AWS Step Functions</a> |
| **Compute**       | <a href="https://aws.amazon.com/lambda/" target="_blank" rel="noopener">AWS Lambda</a>                 |
| **Storage**       | <a href="https://aws.amazon.com/s3/" target="_blank" rel="noopener">Amazon S3</a>                      |
| **CDN**           | <a href="https://aws.amazon.com/cloudfront/" target="_blank" rel="noopener">Amazon CloudFront</a>      |
| **Database**      | <a href="https://aws.amazon.com/dynamodb/" target="_blank" rel="noopener">Amazon DynamoDB</a>          |

</div>
</div>

---

## Getting started

Once you select **"Try this now"** above, your session environment will begin deploying automatically.

{{ govukInsetText({
  html: "<strong>What happens next:</strong><br>1. Your environment deploys automatically<br>2. Follow the walkthrough to log in and explore<br>3. Upload documents and try translation and Easy Read conversion"
}) }}

{{ govukButton({
  text: "Preview the scenario",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/simply-readable/",
  classes: "govuk-button--secondary"
}) }}

{{ govukButton({
  text: "Preview the walkthrough",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/simply-readable/",
  classes: "govuk-button--secondary"
}) }}

---

## Why This Matters for Local Government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Accessibility and inclusion

- **Easy Read conversion** makes complex documents accessible to people with learning disabilities
- Designed with **"Experts by Experience"** — Swindon residents with learning disabilities who co-designed the output format
- Supports compliance with the **Equality Act 2010** and **Public Sector Bodies Accessibility Regulations**
- Helps councils meet their duty to provide information in accessible formats

</div>
<div class="govuk-grid-column-one-half">

### Multilingual communities

- **75 languages** via Amazon Translate — from Arabic to Zulu
- Translation turnaround cut from **19 days to 14 minutes**
- Consistent, on-demand service without booking external translators
- Particularly valuable for councils with diverse populations

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Transformative cost savings

- **99.96% reduction** in per-document translation costs
- Easy Read conversion at **~1p per page** vs **£120 per page** from specialist agencies
- Swindon's Paediatric Therapy team alone saved **£64,000 annually**
- No procurement process needed — deploy from open source

</div>
<div class="govuk-grid-column-one-half">

### Proven in production

- **Live in Swindon** since 2023, handling real council documents daily
- Now adopted by **Edinburgh, Newport, Southampton, and West Berkshire** councils
- Published as an **AWS Sample** under MIT-0 licence
- Featured in the **AWS Public Sector Case Study** programme

</div>
</div>

---

## About Simply Readable

Simply Readable was created by **Swindon Borough Council** to solve a genuine operational problem: the time and cost of translating documents for the borough's multilingual communities, and converting them to Easy Read format for residents with learning disabilities.

{{ govukInsetText({
  html: "<strong>Real impact, real numbers</strong><br>£160 per document → 7p per document • 19-day turnaround → 14 minutes • 5 councils and counting"
}) }}

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-third">

### The problem

- Translation cost **£160 per document** on average
- Easy Read conversion cost **£120 per page** from agencies
- Turnaround took **19 working days**
- Teams rationed translations, limiting who they could serve

</div>
<div class="govuk-grid-column-one-third">

### The solution

- Built on **AWS serverless architecture** — no servers to maintain
- Uses **Amazon Translate** for 75-language support
- Uses **Amazon Bedrock** (Claude) for Easy Read conversion
- Web-based interface any council officer can use

</div>
<div class="govuk-grid-column-one-third">

### The outcome

- Translation costs cut by **99.96%**
- Available **on demand** — no booking, no waiting
- Co-designed with residents who use Easy Read
- Open-sourced for the whole public sector

</div>
</div>

> "We went from rationing translations to offering them freely. Teams that never requested translations before now use the service daily."
>
> — **Swindon Borough Council**

---

## Governance

Simply Readable is published as an **<a href="https://github.com/aws-samples/document-translation" target="_blank" rel="noopener">AWS Sample</a>** under the MIT-0 licence, making it free for any organisation to use, modify, and deploy. The original innovation came from Swindon Borough Council, demonstrating what's possible when local government leads on digital transformation.

The growing adoption by councils across the UK — from Edinburgh to Southampton — shows the power of councils sharing solutions with each other. When one council solves a problem, every council can benefit.

---

### How this was built

This scenario is built on the open source <a href="https://github.com/aws-samples/document-translation" target="_blank" rel="noopener">Document Translation</a> project, originally created by Swindon Borough Council and published as an AWS Sample. The NDX:Try deployment adapts it for the Innovation Sandbox environment using AWS CDK.

<a href="https://github.com/aws-samples/document-translation" target="_blank" rel="noopener">View the source code on GitHub <span class="govuk-visually-hidden">(opens in new tab)</span></a>

---

## Explore more scenarios

- **[Empty AWS Sandbox](/catalogue/aws/aws-empty-sandbox/)** - Start fresh with a clean AWS environment
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services chatbot
- **[Text to Speech](/catalogue/aws/text-to-speech/)** - Accessibility audio generation
- **[LocalGov Drupal](/catalogue/aws/localgov-drupal/)** - AI-enhanced CMS for UK councils
- **[FOI Redaction](/catalogue/aws/foi-redaction/)** - Automated sensitive data removal

---

## Learn More

- <a href="https://github.com/aws-samples/document-translation" target="_blank" rel="noopener">Document Translation on GitHub (AWS Samples)</a>
- <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/simply-readable/" target="_blank" rel="noopener">Simply Readable scenario details</a>

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Budget exhausted early?** Some services have higher costs - contact support if unexpected

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
