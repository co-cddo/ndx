---
layout: layouts/product-try
title: NDX:Try for AWS
description: A clean AWS account for evaluation and experimentation
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: NDX:Try for AWS
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "9813d13d-af90-433d-888f-ec17ad17d714"
---

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)

NDX:Try for AWS provides government organisations with a clean AWS environment for evaluation, experimentation, and proof-of-concept development.

## Overview

This product offers:

- **24-hour access** to a pre-configured AWS account
- **$50 budget cap** for resource usage during evaluation
- **Automatic cleanup** after the lease period expires
- **No long-term commitment** required
- **No cost to you** - the budget is provided by NDX:Try

This is the option for users who want to **start fresh** with a blank canvas. You'll receive an empty AWS environment where you can build whatever you want.

## Getting started

1. Select **"Try this now for 24 hours"** above
2. Accept the Acceptable Use Policy
3. Receive AWS SSO credentials via email
4. Access your sandbox environment through AWS Console

## Use cases

### Proof of concept development

Test new AWS services and architectures without impacting production environments.

### Training and learning

Hands-on exploration of AWS services for team upskilling.

### Vendor evaluation

Compare AWS capabilities against other cloud providers.

### Rapid prototyping

Quick prototyping during hackathons or innovation events.

## Pre-deployed scenarios

If you'd prefer to explore working AWS applications rather than starting from scratch, check out our pre-deployed scenarios:

- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident Q&A using Amazon Bedrock
- **[FOI Redaction](/catalogue/aws/foi-redaction/)** - Automated sensitive data removal
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent document analysis for planning applications
- **[QuickSight Dashboard](/catalogue/aws/quicksight-dashboard/)** - Service performance analytics and reporting
- **[Smart Car Park](/catalogue/aws/smart-car-park/)** - IoT-based real-time parking availability
- **[Text to Speech](/catalogue/aws/text-to-speech/)** - Accessibility audio generation

These scenarios come with working AWS infrastructure already deployed, so you can explore and learn from real implementations.

## Constraints

- **Budget limit**: $50 maximum spend
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **Regions**: US East (N. Virginia) - us-east-1, US West (Oregon) - us-west-2

## Important Notes

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

### Before your session ends

- Export any configurations or code snippets you want to keep
- Take screenshots of dashboards or outputs
- Document any insights or findings
- Download any generated artifacts

### Infrastructure as code

When building in your sandbox, we strongly recommend using Infrastructure as Code (CloudFormation, CDK, or Terraform) rather than manual console configuration. This ensures you can recreate your work in production environments.

## Explore more scenarios

- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services
- **[FOI Redaction](/catalogue/aws/foi-redaction/)** - Automated sensitive data removal
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent document analysis
- **[QuickSight Dashboard](/catalogue/aws/quicksight-dashboard/)** - Analytics and reporting
- **[Smart Car Park](/catalogue/aws/smart-car-park/)** - IoT parking monitoring
- **[Text to Speech](/catalogue/aws/text-to-speech/)** - Accessibility audio generation

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Budget exhausted early?** Some services have higher costs - contact support if unexpected

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
