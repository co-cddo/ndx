---
layout: layouts/product-try
title: Text to Speech
description: Explore accessibility audio generation using AI voices - a pre-deployed learning environment
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: Text to Speech
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - Audio
  - Inclusion
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "e267c960-e0a4-40f8-b3eb-34609afc1f7c"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/text-to-speech/ -->
<!-- Maintained by: NDX Team | Last verified: 2025-12-05 -->

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)
![](https://img.shields.io/badge/category-Accessibility-orange)

## About NDX

NDX (National Digital Exchange) is a government platform that helps public sector organisations discover, evaluate, and adopt digital solutions.

## Overview

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product. Use it to understand how AWS text-to-speech services can improve content accessibility.

**Deployed and ready** - no setup required. When you request this sandbox, you'll receive access to a fully configured text-to-speech system that's already running and ready to convert text to natural-sounding audio.

This Text to Speech scenario demonstrates how local authorities can use AWS AI services to automatically generate audio versions of written content, improving accessibility for residents with visual impairments or reading difficulties.

## What you'll explore

This sandbox includes a working implementation using:

- **Amazon Polly** - Text-to-speech service with lifelike voices in multiple languages and accents
- **AWS Lambda** - Serverless compute for orchestrating the conversion workflow
- **Amazon S3** - Storage for text inputs and generated audio files

**In plain English:** You'll explore converting text content to natural-sounding audio for accessibility - like making council newsletters, service updates, or important notices available as audio files for residents who prefer or need to listen rather than read.

## Learn More

Before requesting your sandbox, explore the scenario documentation to understand what's deployed and how to interact with it:

<a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/text-to-speech/" target="_blank" rel="noopener">View Text to Speech scenario details</a>

## Getting started

1. Select **"Try this now for 24 hours"** above
2. Accept the Acceptable Use Policy
3. Receive AWS SSO credentials via email
4. Access your sandbox environment through AWS Console
5. Follow the scenario guide to convert sample text to audio and try different voices

## Why this matters for local government

Text-to-speech for accessibility can:

- **Improve inclusion** by making content accessible to residents with visual impairments
- **Support diverse needs** including residents with dyslexia or literacy challenges
- **Extend reach** by offering audio versions of important communications
- **Meet accessibility requirements** for public sector digital services

This scenario lets you evaluate whether automated audio generation could improve your council's content accessibility.

## Constraints

- **Budget limit**: $50 maximum spend (sufficient for extensive exploration)
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **No cost to you** - the budget is provided by NDX:Try

## Important Notes

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

### Before your session ends

- Export any configurations or code snippets you want to keep
- Download generated audio files you want to keep
- Document which voices and settings work best for your content
- Note any limitations or quality considerations

### Infrastructure as code

The resources in this scenario were deployed using Infrastructure as Code (IaC). When building for production, we strongly recommend using CloudFormation, CDK, or Terraform rather than manual console configuration. This ensures repeatability, version control, and easier compliance.

### Build your own

After exploring this pre-deployed scenario, use the **Empty Sandbox** to build your own solution from scratch. The Empty Sandbox gives you a clean AWS environment where you can experiment freely.

## Explore more scenarios

- **[Empty Sandbox](/catalogue/aws/innovation-sandbox-empty/)** - Start fresh with a clean AWS environment
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services
- **[FOI Redaction](/catalogue/aws/foi-redaction/)** - Automated sensitive data removal
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent document analysis

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Budget exhausted early?** Some services have higher costs - contact support if unexpected

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
