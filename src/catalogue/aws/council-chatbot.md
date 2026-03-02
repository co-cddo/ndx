---
layout: layouts/product-try
title: Council Chatbot
description: Explore an AI-powered chatbot for local government resident services - a pre-deployed learning environment
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: Council Chatbot
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - AI
  - Chatbot
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "cf2f0c73-6db4-4af4-afc7-c21f7572f1c6"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/council-chatbot/ -->
<!-- Maintained by: NDX Team | Last verified: 2025-12-05 -->

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)
![](https://img.shields.io/badge/category-AI-orange)

## About NDX

NDX (National Digital Exchange) is a government platform that helps public sector organisations discover, evaluate, and adopt digital solutions.

## Overview

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product. Use it to understand how AWS AI services work together for local government use cases.

**Deployed and ready** - no setup required. When you request this sandbox, you'll receive access to a fully configured AI chatbot system that's already running and ready to explore.

This Council Chatbot scenario demonstrates how local authorities can use AWS AI services to create an intelligent chatbot that answers resident questions about council services, policies, and procedures.

## What you'll explore

This sandbox includes a working implementation using:

- **Amazon Bedrock** - Foundation models for natural language understanding and response generation
- **Amazon Lex** - Conversational interface for structured dialogue flows
- **AWS Lambda** - Serverless compute for business logic and integrations
- **Amazon S3** - Storage for knowledge base documents and conversation logs

**In plain English:** You'll explore an AI that answers resident questions - like "When is bin collection?" or "How do I apply for a parking permit?" - using a combination of pre-defined conversation flows and generative AI responses.

## Learn More

Before requesting your sandbox, explore the scenario documentation to understand what's deployed and how to interact with it:

<a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/council-chatbot/" target="_blank" rel="noopener">View Council Chatbot scenario details</a>

## Getting started

1. Select **"Try this now for 24 hours"** above
2. Accept the Acceptable Use Policy
3. Receive AWS SSO credentials via email
4. Access your sandbox environment through AWS Console
5. Follow the scenario guide to interact with the deployed chatbot

## Why this matters for local government

Council chatbots can:

- **Reduce call centre load** by handling common enquiries automatically
- **Provide 24/7 service** for residents outside office hours
- **Improve accessibility** with consistent, patient responses
- **Free up staff** to handle complex cases requiring human judgement

This scenario lets you evaluate whether AI-powered chatbots could work for your council's specific needs.

## Constraints

- **Budget limit**: $50 maximum spend (sufficient for extensive exploration)
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **No cost to you** - the budget is provided by NDX:Try

## Important Notes

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

### Before your session ends

- Export any configurations or code snippets you want to keep
- Take screenshots of dashboards or metrics
- Document any insights or findings
- Download any generated artifacts

### Infrastructure as code

The resources in this scenario were deployed using Infrastructure as Code (IaC). When building for production, we strongly recommend using CloudFormation, CDK, or Terraform rather than manual console configuration. This ensures repeatability, version control, and easier compliance.

### Build your own

After exploring this pre-deployed scenario, use the **Empty Sandbox** to build your own solution from scratch. The Empty Sandbox gives you a clean AWS environment where you can experiment freely.

## Explore more scenarios

- **[Empty AWS Sandbox](/catalogue/aws/aws-empty-sandbox/)** - Start fresh with a clean AWS environment
- **[FOI Redaction](/catalogue/aws/foi-redaction/)** - Automated sensitive data removal
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent document analysis
- **[Text to Speech](/catalogue/aws/text-to-speech/)** - Accessibility audio generation

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Budget exhausted early?** Some services have higher costs - contact support if unexpected

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
