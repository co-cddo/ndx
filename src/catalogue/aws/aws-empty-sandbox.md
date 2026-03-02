---
layout: layouts/product-try
title: Empty AWS Sandbox
description: An empty AWS sandbox account for evaluation, experimentation, and proof-of-concept development — no pre-deployed resources
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: Empty AWS Sandbox
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

## About NDX

NDX (National Digital Exchange) is a government platform that helps public sector organisations discover, evaluate, and adopt digital solutions.

## Overview

Your blank canvas in the cloud. Get a fully provisioned AWS account in minutes — no procurement, no budget codes, no lengthy onboarding. Just you and the full power of AWS for 24 hours, completely free.

> **Zero risk, zero cost**: NDX:Try covers the bill (up to $50) and automatically cleans everything up when your session ends. There's nothing to undo, nothing to cancel, and no surprise invoices.

This is the sandbox for teams who want to **build from scratch**. Whether you're prototyping a new service, evaluating AWS against another cloud provider, or upskilling your team with hands-on experience — this is the fastest way to get started.

## What's included

- **A real AWS account** with console and programmatic access via AWS SSO
- **$50 budget** — enough to spin up EC2 instances, deploy Lambda functions, experiment with Bedrock AI models, run containers on ECS, and much more
- **24-hour access** from the moment you activate
- **Two regions available**: US East (N. Virginia) and US West (Oregon)
- **Automatic teardown** — all resources are removed when your session expires or the budget is reached

## Getting started

1. Select **"Try this now for 24 hours"** above
2. Accept the Acceptable Use Policy
3. Receive AWS SSO credentials via email
4. Sign in to the AWS Console and start building

That's it — four steps to a real AWS environment.

## What could you build in 24 hours?

### Prototype a citizen-facing service

Stand up an API Gateway backed by Lambda functions, connect it to DynamoDB, and have a working API serving real requests — all before lunch.

### Evaluate AI and machine learning

Try Amazon Bedrock's foundation models for document summarisation, content generation, or data extraction. Test whether generative AI fits your use case without committing to a contract.

### Run a team hackathon

Give your developers hands-on AWS experience in a safe environment. Build, break, rebuild — there's no production system to worry about.

### Test infrastructure as code

Deploy your CloudFormation templates, CDK stacks, or Terraform configs against a real AWS account. Validate that your IaC works before committing to production.

### Compare cloud providers

If you're evaluating AWS alongside Azure or GCP, use this sandbox to run equivalent workloads and compare the developer experience, pricing, and service capabilities first-hand.

## Prefer something ready-made?

If you'd rather explore a working application than start from scratch, try one of our pre-deployed scenarios. Each one comes with real AWS infrastructure already running — just sign in and start exploring:

- **[Council Chatbot](/catalogue/aws/council-chatbot/)** — AI-powered resident Q&A using Amazon Bedrock
- **[FOI Redaction](/catalogue/aws/foi-redaction/)** — Automated sensitive data removal for Freedom of Information requests
- **[Planning AI](/catalogue/aws/planning-ai/)** — Intelligent document analysis for planning applications
- **[QuickSight Dashboard](/catalogue/aws/quicksight-dashboard/)** — Service performance analytics and reporting
- **[Smart Car Park](/catalogue/aws/smart-car-park/)** — IoT-based real-time parking availability
- **[Text to Speech](/catalogue/aws/text-to-speech/)** — Accessibility audio generation with Amazon Polly
- **[LocalGov Drupal](/catalogue/aws/localgov-drupal/)** — Council website CMS on AWS infrastructure

## Tips for getting the most out of your session

### Use Infrastructure as Code

Build with CloudFormation, CDK, or Terraform rather than clicking through the console. When your 24 hours are up, your IaC templates are yours to keep — ready to deploy again in a production account.

### Save your work as you go

Your sandbox is ephemeral. Export code, download CloudFormation templates, screenshot dashboards, and commit anything valuable to a Git repository before your session ends.

## Constraints

- **Budget limit**: $50 maximum spend (sufficient for most evaluation workloads)
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **No cost to you** — the budget is provided by NDX:Try

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the AWS Console?** Ensure you're using the correct AWS region (us-east-1)
- **Budget exhausted early?** Some services have higher costs — contact support if unexpected

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
