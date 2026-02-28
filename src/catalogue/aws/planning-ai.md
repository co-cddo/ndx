---
layout: layouts/product-try
title: Planning AI
description: Explore intelligent planning application analysis using AI - a pre-deployed learning environment
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: Planning AI
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - AI
  - Document Processing
  - Planning
  - Automation
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "a9acda20-d6f2-4dc1-bd30-5bb593e12718"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/planning-ai/ -->
<!-- Maintained by: NDX Team | Last verified: 2025-12-05 -->

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)
![](https://img.shields.io/badge/category-AI-orange)

## About NDX

NDX (National Digital Exchange) is a government platform that helps public sector organisations discover, evaluate, and adopt digital solutions.

## Overview

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product. Use it to understand how AWS AI services can assist with planning application processing.

**Deployed and ready** - no setup required. When you request this sandbox, you'll receive access to a fully configured planning document analysis system that's already running and ready to explore.

This Planning AI scenario demonstrates how local authorities can use AWS AI services to automatically extract information, summarise content, and identify key issues from planning applications and supporting documents.

## What you'll explore

This sandbox includes a working implementation using:

- **Amazon Textract** - Extract text and structured data from planning documents (PDFs, images, scanned forms)
- **Amazon Comprehend** - Understand document content and identify key entities and topics
- **Amazon Bedrock** - Generate summaries and answer questions about planning applications
- **AWS Lambda** - Serverless compute for orchestrating the analysis workflow
- **Amazon S3** - Storage for planning documents and analysis results

**In plain English:** You'll explore an AI that reads and summarises planning applications - extracting key details like property descriptions, proposed changes, and potential issues to help planning officers process applications faster.

## Learn More

Before requesting your sandbox, explore the scenario documentation to understand what's deployed and how to interact with it:

<a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/planning-ai/" target="_blank" rel="noopener">View Planning AI scenario details</a>

## Getting started

1. Select **"Try this now for 24 hours"** above
2. Accept the Acceptable Use Policy
3. Receive AWS SSO credentials via email
4. Access your sandbox environment through AWS Console
5. Follow the scenario guide to upload sample planning documents and see analysis results

## Why this matters for local government

AI-assisted planning analysis can:

- **Speed up initial review** by extracting key information automatically
- **Improve consistency** in how applications are summarised
- **Help prioritise workload** by identifying applications needing urgent attention
- **Support officers** with quick access to document insights during consultation

This scenario lets you evaluate whether AI could assist your planning department's processes.

## Constraints

- **Budget limit**: $50 maximum spend (sufficient for extensive exploration)
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **No cost to you** - the budget is provided by NDX:Try

## Important Notes

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

### Before your session ends

- Export any configurations or code snippets you want to keep
- Take screenshots of analysis outputs
- Document any insights about accuracy and limitations
- Download any generated summaries

### Infrastructure as code

The resources in this scenario were deployed using Infrastructure as Code (IaC). When building for production, we strongly recommend using CloudFormation, CDK, or Terraform rather than manual console configuration. This ensures repeatability, version control, and easier compliance.

### Build your own

After exploring this pre-deployed scenario, use the **Empty Sandbox** to build your own solution from scratch. The Empty Sandbox gives you a clean AWS environment where you can experiment freely.

## Explore more scenarios

- **[Empty Sandbox](/catalogue/aws/innovation-sandbox-empty/)** - Start fresh with a clean AWS environment
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services
- **[FOI Redaction](/catalogue/aws/foi-redaction/)** - Automated sensitive data removal
- **[QuickSight Dashboard](/catalogue/aws/quicksight-dashboard/)** - Analytics and reporting

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Budget exhausted early?** Some services have higher costs - contact support if unexpected

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
