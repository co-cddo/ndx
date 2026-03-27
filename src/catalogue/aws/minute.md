---
layout: layouts/product-try
title: Minute
description: AI-powered meeting transcription and minute generation, built by i.AI for UK government
image:
  src: /assets/catalogue/aws/aws-logo.svg
  alt: Minute AI
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - AI
  - Transcription
  - Meeting Minutes
  - Productivity
  - Local Government
  - Central Government
  - Open Source
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "2e2772e4-da75-416c-a873-12a0401bc921"
walkthrough_url: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/minute/"
github_source: "https://github.com/i-dot-ai/minute"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/minute/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/minute/ -->
<!-- Maintained by: NDX Team | Last verified: 2026-03-24 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green) ![](https://img.shields.io/badge/owner-public_sector-blue) ![](https://img.shields.io/badge/access-NDX:Try-purple) ![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen) ![](https://img.shields.io/badge/category-AI-orange) ![](https://img.shields.io/badge/category-Productivity-blue) [![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/i-dot-ai/minute)

## Overview

{{ govukInsetText({
  html: "<strong>Built by i.AI, for government</strong><br>Minute is an open-source tool built by <a href='https://ai.gov.uk' target='_blank' rel='noopener'>i.AI</a> (the UK Government's AI team in DSIT) that transforms meeting recordings into structured, professional meeting minutes using AI."
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product.

Minute brings together **automatic speech transcription** and **AI-powered minute generation** in a single web application. Upload a meeting recording, get an automatic transcript with speaker identification, then generate structured meeting minutes — in minutes, not hours.

The NDX:Try version replaces the upstream Gemini/Azure dependencies with **AWS-native services**: Amazon Bedrock (Nova Pro) for text generation and AWS Transcribe for speech-to-text.

{{ govukWarningText({
  text: "After requesting your session, the environment will deploy automatically in approximately 25-35 minutes. The walkthrough will guide you through uploading a recording and generating minutes.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Core Features

| Feature                                                                                                                                              | AWS Service                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/minute/step-3/" target="_blank" rel="noopener">**Meeting transcription**</a> | <a href="https://aws.amazon.com/transcribe/" target="_blank" rel="noopener">AWS Transcribe</a>         |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/minute/step-5/" target="_blank" rel="noopener">**AI minute generation**</a>  | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a> (Nova Pro) |
| **Speaker identification**                                                                                                                           | <a href="https://aws.amazon.com/transcribe/" target="_blank" rel="noopener">AWS Transcribe</a>         |
| **Multiple meeting templates**                                                                                                                       | Cabinet, Planning Committee, General, and more                                                         |
| **AI-assisted editing**                                                                                                                              | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a>            |
| **Word document export**                                                                                                                             | Built-in                                                                                               |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component             | AWS Service                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| **Compute**           | <a href="https://aws.amazon.com/fargate/" target="_blank" rel="noopener">AWS Fargate</a> (3 services)    |
| **Database**          | <a href="https://aws.amazon.com/rds/aurora/" target="_blank" rel="noopener">Amazon Aurora</a> PostgreSQL |
| **Message queues**    | <a href="https://aws.amazon.com/sqs/" target="_blank" rel="noopener">Amazon SQS</a> (4 queues)           |
| **File storage**      | <a href="https://aws.amazon.com/s3/" target="_blank" rel="noopener">Amazon S3</a>                        |
| **CDN & HTTPS**       | <a href="https://aws.amazon.com/cloudfront/" target="_blank" rel="noopener">Amazon CloudFront</a>        |
| **Service discovery** | <a href="https://aws.amazon.com/cloud-map/" target="_blank" rel="noopener">AWS Cloud Map</a>             |

</div>
</div>

---

## Getting started

1. **Request your session** — Click "Try this now" above. Your environment will deploy automatically.
2. **Find your credentials** — In the AWS Console, go to CloudFormation → MinuteStack → Outputs tab. Copy the **MinuteUrl**, **BasicAuthUsername**, and **BasicAuthPassword**.
3. **Log in** — Open the MinuteUrl in your browser. Enter the username and password when prompted.
4. **Upload a recording** — Click "New meeting", then "Upload a file". Choose an audio file (MP3, WAV, or WebM up to 5GB) and select a template.
5. **Wait for transcription** — AWS Transcribe processes the audio (5-15 minutes depending on length).
6. **Review your minutes** — AI-generated structured minutes appear with meeting overview, attendees, discussion points, key decisions, action items, and next steps.

{{ govukButton({
  text: "View the full walkthrough →",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/minute/",
  classes: "govuk-button--secondary"
}) }}

---

## Why this matters for local government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Reduce administrative burden

Meeting minutes typically take **2-4 hours** to produce manually. Minute generates structured minutes in **under 15 minutes** — freeing officers for higher-value work.

</div>
<div class="govuk-grid-column-one-half">

### Improve record keeping

AI-generated minutes include **citations back to the transcript**, structured **action items with owners**, and consistent formatting across all meeting types.

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Multiple meeting formats

Built-in templates for **Cabinet meetings**, **Planning Committees**, **Care Assessments**, and **General meetings** — plus the ability to create custom templates for your specific needs.

</div>
<div class="govuk-grid-column-one-half">

### Open source and reusable

Built by i.AI and open-sourced at [github.com/i-dot-ai/minute](https://github.com/i-dot-ai/minute). Already in use across central government — this NDX:Try deployment lets you evaluate it on AWS infrastructure.

</div>
</div>

---

## Constraints

This is a **time-limited evaluation environment** provided through the NDX Innovation Sandbox:

- **Budget**: Fixed allocation per session (sufficient for the walkthrough and extended exploration)
- **Duration**: Sessions are time-limited — complete your evaluation within the allocated period
- **Purpose**: Learning and evaluation only — do not upload recordings containing sensitive or classified information
- **Data**: All data is deleted when the session ends

---

## Important Notes

- **Audio formats**: MP3, WAV, WebM, and other common formats supported (up to 5GB)
- **Transcription time**: Varies with recording length — a 30-minute meeting takes approximately 5-10 minutes to transcribe
- **LLM model**: Uses Amazon Nova Pro via Bedrock — no Anthropic marketplace agreement required
- **Authentication**: Basic HTTP auth with a randomly generated password (shown in CloudFormation Outputs)
- **Speaker identification**: AWS Transcribe automatically identifies different speakers, though names must be assigned manually

---

## How this was built

Minute was originally built by [i.AI](https://ai.gov.uk) using Terraform, Keycloak, and Google Gemini. The NDX:Try version converts this to AWS CDK with:

- **Bedrock adapter** replacing Gemini for AI text generation
- **AWS Transcribe** for speech-to-text (already supported upstream)
- **CloudFront basic auth** replacing Keycloak for authentication
- **Aurora PostgreSQL** for the database
- **ECS Fargate** for all three application services

Source code: [github.com/i-dot-ai/minute](https://github.com/i-dot-ai/minute) (upstream) | [NDX:Try CDK stack](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/minute) (deployment)

---

## Explore more scenarios

- [**Council Chatbot**](/catalogue/aws/council-chatbot/) — AI-powered chatbot for citizen enquiries using Amazon Bedrock
- [**Simply Readable**](/catalogue/aws/simply-readable/) — Document translation and Easy Read conversion
- [**LocalGov Drupal**](/catalogue/aws/localgov-drupal/) — AI-enhanced content management for councils
- [**Text to Speech**](/catalogue/aws/text-to-speech/) — Convert written content to natural speech with Amazon Polly

---

## Troubleshooting

**"Transcription being processed" takes a long time**
Transcription time depends on audio length. A 45-minute meeting typically takes 5-10 minutes. The page auto-refreshes when complete.

**"There was a problem processing your request" on minute generation**
Click "Generate New" and try again. The AI model may occasionally time out on very long transcripts.

**"Short meeting detected" message**
The transcript must contain at least 200 words for full minute generation. Try with a longer recording.

**Cannot access the URL**
Ensure you're using the credentials from the CloudFormation Outputs tab. The password is randomly generated for each deployment.

---

## Support

For help with this scenario or NDX:Try:

- **Walkthrough**: [Step-by-step guide](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/minute/)
- **Source code**: [i-dot-ai/minute on GitHub](https://github.com/i-dot-ai/minute)
- **NDX Team**: Contact via the [NDX support channel](https://ukgovernmentdigital.slack.com/archives/C08FWJMFCNS)
