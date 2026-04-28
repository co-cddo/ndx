---
layout: layouts/product-try
title: Paperless-ngx with AI
description: Self-hosted document archive with OCR, full-text search and AI-powered classification, tagging and chat — built on AWS for UK parish and town councils
image:
  src: /assets/catalogue/aws/paperless-ngx-logo.svg
  alt: Paperless-ngx
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - AI
  - Document Management
  - OCR
  - Search
  - Local Government
  - Parish Council
  - Open Source
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "0acf5f71-ebde-4a07-b1d0-8e363d693a9e"
walkthrough_url: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/paperless-ngx/"
github_source: "https://github.com/paperless-ngx/paperless-ngx"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/paperless-ngx/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/paperless-ngx/ -->
<!-- Maintained by: NDX Team | Last verified: 2026-04-28 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green) ![](https://img.shields.io/badge/owner-community-blue) ![](https://img.shields.io/badge/access-NDX:Try-purple) ![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen) ![](https://img.shields.io/badge/category-Document_Management-orange) ![](https://img.shields.io/badge/category-AI-blue) [![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/paperless-ngx/paperless-ngx)

## Overview

{{ govukInsetText({
  html: "<strong>Your filing cabinet, but searchable.</strong><br>Paperless-ngx is a popular open-source document management system used by parish councils, small charities and individuals to digitise and search their paper records. The NDX:Try deployment adds Amazon Bedrock so every document is automatically tagged, titled, classified and summarised — and you can chat with the whole archive in plain English."
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready deployment.

Paperless-ngx ingests scanned PDFs, images, Word documents and emails, runs OCR with Tesseract, converts Office documents through Apache Tika and Gotenberg, and gives you a fast searchable archive in your browser.

The NDX:Try version layers six AI features on top using **Amazon Bedrock**: every uploaded document is auto-classified (tags, document type, correspondent), retitled into something human-readable, and summarised in two sentences — all in the seconds after upload. A separate **chat-with-archive** interface lets you ask plain-English questions and get answers grounded in your real documents, with citations back to the source files and PII protection from Amazon Bedrock Guardrails.

{{ govukWarningText({
  text: "After requesting your session, the environment will deploy automatically in approximately 15-20 minutes. The walkthrough will guide you through the pre-loaded archive, the AI features, and the chat interface.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Core features

| Feature                                                                                                                                                 | AWS Service                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/paperless-ngx/step-2/" target="_blank" rel="noopener">**Document OCR**</a>      | Tesseract OCR + <a href="https://aws.amazon.com/fargate/" target="_blank" rel="noopener">Fargate</a>   |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/paperless-ngx/step-3/" target="_blank" rel="noopener">**Full-text search**</a>  | Built into Paperless-ngx                                                                               |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/paperless-ngx/step-2/" target="_blank" rel="noopener">**AI auto-tagging**</a>   | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a> (Nova Pro) |
| **AI title rewriting**                                                                                                                                  | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a> (Nova Pro) |
| **Document type & correspondent**                                                                                                                       | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a> (Nova Pro) |
| **Two-sentence AI summary**                                                                                                                             | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a> (Nova Pro) |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/paperless-ngx/step-4/" target="_blank" rel="noopener">**Chat with archive**</a> | Bedrock Knowledge Base + S3 Vectors + Guardrails                                                       |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component             | AWS Service                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Compute**           | <a href="https://aws.amazon.com/fargate/" target="_blank" rel="noopener">AWS Fargate</a> (multi-container task)     |
| **Database**          | <a href="https://aws.amazon.com/rds/" target="_blank" rel="noopener">Amazon RDS</a> PostgreSQL                      |
| **Cache / broker**    | <a href="https://aws.amazon.com/elasticache/" target="_blank" rel="noopener">Amazon ElastiCache</a> Redis           |
| **File storage**      | <a href="https://aws.amazon.com/s3/" target="_blank" rel="noopener">Amazon S3 Files</a> + S3                        |
| **Vector store**      | <a href="https://aws.amazon.com/s3/features/vectors/" target="_blank" rel="noopener">Amazon S3 Vectors</a>          |
| **Foundation models** | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a> (Nova Pro, Titan Embed) |
| **Safety**            | <a href="https://aws.amazon.com/bedrock/guardrails/" target="_blank" rel="noopener">Bedrock Guardrails</a>          |
| **CDN & HTTPS**       | <a href="https://aws.amazon.com/cloudfront/" target="_blank" rel="noopener">Amazon CloudFront</a>                   |

</div>
</div>

---

## Getting started

1. **Request your session** — Click "Try this now" above. Your environment will deploy automatically.
2. **Find your credentials** — In the AWS Console, go to CloudFormation → PaperlessNgxStack → Outputs tab. Copy the **PaperlessUrl** and **AdminPassword** (the username is `admin`).
3. **Sign in** — Open the PaperlessUrl in your browser and log in.
4. **Browse the pre-loaded archive** — The sandbox arrives with around 30 sample parish council documents (planning notices, minutes, agendas, invoices, correspondence) already OCR'd and AI-classified.
5. **Open the chat** — From the same CloudFormation outputs, copy the **ChatUrl**. Ask plain-English questions across the archive; answers cite the source documents.
6. **Upload a document of your own** — Drop a PDF, image, Word or email file in. Within a minute or two it will be OCR'd, AI-classified, retitled, summarised and indexed for chat.

{{ govukButton({
  text: "View the full walkthrough →",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/paperless-ngx/",
  classes: "govuk-button--secondary"
}) }}

---

## Why this matters for local government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### A filing cabinet that thinks for itself

Most parish and town councils still rely on paper or scattered shared drives. Paperless-ngx gives you a single searchable archive, and the AI layer means a clerk no longer has to manually tag, title or classify every document — Bedrock does it on upload.

</div>
<div class="govuk-grid-column-one-half">

### Ask the archive

The chat interface lets a clerk or councillor ask questions like "what did we decide about the recreation ground play equipment?" or "show me planning notices from the last quarter" and get answers grounded in the real documents, with links back to the source.

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Built on a thriving open-source project

Paperless-ngx has more than 40,000 stars on GitHub and an active community. The NDX:Try deployment uses the upstream container image directly — no fork — so anything you learn here applies to a self-hosted deployment elsewhere.

</div>
<div class="govuk-grid-column-one-half">

### Safety baked in

Bedrock Guardrails sit in front of the chat interface, blocking attempts to extract personal data, off-topic questions and jailbreak prompts. The AWS infrastructure is private to your sandbox account and torn down at the end of the session.

</div>
</div>

---

## Constraints

This is a **time-limited evaluation environment** provided through the NDX Innovation Sandbox:

- **Budget**: Fixed allocation per session (sufficient for the walkthrough and extended exploration)
- **Duration**: Sessions are time-limited — complete your evaluation within the allocated period
- **Purpose**: Learning and evaluation only — do not upload documents containing sensitive or classified information
- **Data**: All data, including any documents you upload, is deleted when the session ends

---

## Important notes

- **OCR language**: English only in this deployment (Paperless-ngx upstream supports many more)
- **AI model**: Amazon Nova Pro via Bedrock for classification, titling, summary and chat — no Anthropic marketplace agreement required
- **Vector store**: Amazon S3 Vectors (serverless) backs the chat-with-archive Knowledge Base
- **HTTPS**: All access is via Amazon CloudFront with the default `*.cloudfront.net` certificate
- **Authentication**: A randomly generated admin password is shown in the CloudFormation Outputs tab
- **Sample data**: Around 30 fictional UK parish council documents are auto-loaded on first boot so the archive isn't empty when you arrive

---

## How this was built

Paperless-ngx is built and maintained by the open-source community at [github.com/paperless-ngx/paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) (GPL-3.0). The NDX:Try version uses the upstream container image unchanged, and adds AWS-native bits around the edges:

- **Amazon Bedrock** Nova Pro called from a Paperless-ngx post-consume hook to classify, title and summarise every uploaded document
- **Amazon Bedrock Knowledge Base** with **S3 Vectors** for retrieval-augmented chat over the archive
- **Amazon Bedrock Guardrails** to filter PII, off-topic queries and prompt-injection attempts on the chat interface
- **Amazon S3 Files** so a single S3 bucket acts as both the Paperless-ngx working file system and the source for the Bedrock Knowledge Base
- **AWS Fargate** for the multi-container task (Paperless web, Apache Tika, Gotenberg, init)
- **Amazon RDS PostgreSQL** and **Amazon ElastiCache Redis** for the application database and Celery broker

Source code: [paperless-ngx/paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) (upstream) | [NDX:Try CDK stack](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/paperless-ngx) (deployment)

---

## Explore more scenarios

- [**Council Chatbot**](/catalogue/aws/council-chatbot/) — AI-powered chatbot for citizen enquiries using Amazon Bedrock
- [**Minute**](/catalogue/aws/minute/) — Meeting transcription and AI minute generation
- [**FOI Redaction**](/catalogue/aws/foi-redaction/) — Detect and redact PII in FOI responses with AI
- [**Simply Readable**](/catalogue/aws/simply-readable/) — Document translation and Easy Read conversion

---

## Troubleshooting

**Cannot reach the PaperlessUrl**
Wait for the CloudFormation stack to reach `CREATE_COMPLETE` (around 15-20 minutes). The URL won't respond before then.

**Documents arrive but have no AI tags or title**
The post-consume hook installs its Python dependencies on first run, so the very first uploaded document can take a little longer than later ones. After that, classification typically completes within 30 seconds.

**Chat says it cannot find an answer**
The Bedrock Knowledge Base ingests new documents on a roughly 60-second batching window. If you've just uploaded a document, give it a minute or two and try again.

**Chat blocks a question I expected to work**
Bedrock Guardrails filter PII, jailbreak attempts and off-topic content. Rephrase the question, or check the walkthrough for examples that work well.

---

## Support

For help with this scenario or NDX:Try:

- **Walkthrough**: [Step-by-step guide](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/paperless-ngx/)
- **Source code**: [paperless-ngx/paperless-ngx on GitHub](https://github.com/paperless-ngx/paperless-ngx)
- **NDX Team**: Contact via the [NDX support channel](https://ukgovernmentdigital.slack.com/archives/C08FWJMFCNS)
