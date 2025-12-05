---
layout: layouts/product-try
title: FOI Redaction
description: Explore automated sensitive data redaction for Freedom of Information requests - a pre-deployed learning environment
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: FOI Redaction
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - AI
  - Data Protection
  - FOI
  - Compliance
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "e5beeca0-af34-4299-9efc-eb153e9d9d8c"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/foi-redaction/ -->
<!-- Maintained by: NDX Team | Last verified: 2025-12-05 -->

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)
![](https://img.shields.io/badge/category-AI-orange)

## What is NDX?

NDX (National Digital Exchange) is a government platform that helps public sector organisations discover, evaluate, and adopt digital solutions.

## Overview

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product. Use it to understand how AWS AI services can automate document redaction for compliance requirements.

**Deployed and ready** - no setup required. When you request this sandbox, you'll receive access to a fully configured document redaction system that's already running and ready to explore.

This FOI Redaction scenario demonstrates how local authorities can use AWS AI services to automatically identify and redact sensitive personal information from documents before release under Freedom of Information requests.

## What You'll Explore

This sandbox includes a working implementation using:

- **Amazon Comprehend** - Natural language processing to identify personal data entities (names, addresses, phone numbers, etc.)
- **Amazon Textract** - Optical character recognition for extracting text from scanned documents and images
- **AWS Lambda** - Serverless compute for orchestrating the redaction workflow
- **Amazon S3** - Storage for documents before and after redaction

**In plain English:** You'll explore an AI system that automatically removes sensitive information from documents - like names, addresses, and phone numbers - so they can be safely released in response to FOI requests.

## Learn More

Before requesting your sandbox, explore the scenario documentation to understand what's deployed and how to interact with it:

<a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/foi-redaction/" target="_blank" rel="noopener">View FOI Redaction scenario details</a>

## Getting Started

1. Click **"Try this now for 24 hours"** above
2. Accept the Acceptable Use Policy
3. Receive AWS SSO credentials via email
4. Access your sandbox environment through AWS Console
5. Follow the scenario guide to upload test documents and see redaction in action

## Why This Matters for Local Government

Automated FOI redaction can:

- **Speed up response times** by reducing manual document review
- **Improve consistency** in identifying what needs to be redacted
- **Reduce compliance risk** by catching sensitive data that humans might miss
- **Free up staff time** for reviewing edge cases and complex requests

This scenario lets you evaluate whether AI-assisted redaction could work for your council's FOI processes.

## Constraints

- **Budget limit**: $50 maximum spend (sufficient for extensive exploration)
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **No cost to you** - the budget is provided by NDX:Try

## Important Notes

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

### Before Your Session Ends

- Export any configurations or code snippets you want to keep
- Take screenshots of redaction results
- Document any insights about accuracy and edge cases
- Download any test outputs

### Infrastructure as Code

The resources in this scenario were deployed using Infrastructure as Code (IaC). When building for production, we strongly recommend using CloudFormation, CDK, or Terraform rather than manual console configuration. This ensures repeatability, version control, and easier compliance.

### Want to Build Your Own?

After exploring this pre-deployed scenario, use the **Empty Sandbox** to build your own solution from scratch. The Empty Sandbox gives you a clean AWS environment where you can experiment freely.

## Want to Explore More?

- **[Empty Sandbox](/catalogue/aws/innovation-sandbox-empty/)** - Start fresh with a clean AWS environment
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent document analysis
- **[Text to Speech](/catalogue/aws/text-to-speech/)** - Accessibility audio generation

## Having Trouble?

- **Try button not working?** Make sure you're signed in to NDX
- **Didn't receive credentials?** Check your spam folder, or wait a few minutes
- **Can't access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Budget exhausted early?** Some services have higher costs - contact support if unexpected

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
