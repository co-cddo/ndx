---
layout: layouts/product-try
title: Smart Car Park
description: Explore IoT-based real-time parking availability monitoring - a pre-deployed learning environment
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: Smart Car Park
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - IoT
  - Real-time
  - Smart City
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "19dcf939-6be8-49b2-a56b-e97238196e09"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/smart-car-park/ -->
<!-- Maintained by: NDX Team | Last verified: 2025-12-05 -->

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)
![](https://img.shields.io/badge/category-IoT-orange)

## About NDX

NDX (National Digital Exchange) is a government platform that helps public sector organisations discover, evaluate, and adopt digital solutions.

## Overview

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product. Use it to understand how AWS IoT services can enable smart city infrastructure.

**Deployed and ready** - no setup required. When you request this sandbox, you'll receive access to a fully configured IoT parking system that simulates sensor data and displays real-time availability.

This Smart Car Park scenario demonstrates how local authorities can use AWS IoT services to monitor parking availability in real-time, helping residents find spaces and councils manage parking assets more effectively.

## What you'll explore

This sandbox includes a working implementation using:

- **AWS IoT Core** - Managed service for connecting and managing IoT devices (simulated parking sensors)
- **Amazon Timestream** - Time-series database optimised for IoT data storage and queries
- **Amazon QuickSight** - Real-time dashboards showing parking availability and trends
- **AWS Lambda** - Serverless compute for processing sensor events
- **Amazon API Gateway** - REST API for accessing parking data from apps and websites

**In plain English:** You'll explore real-time parking availability using sensors and dashboards - see which spaces are free, track occupancy trends over time, and understand how data flows from sensors to applications.

## Learn More

Before requesting your sandbox, explore the scenario documentation to understand what's deployed and how to interact with it:

<a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/smart-car-park/" target="_blank" rel="noopener">View Smart Car Park scenario details</a>

## Getting started

1. Select **"Try this now for 24 hours"** above
2. Accept the Acceptable Use Policy
3. Receive AWS SSO credentials via email
4. Access your sandbox environment through AWS Console
5. Follow the scenario guide to explore the IoT infrastructure and real-time dashboards

## Why this matters for local government

Smart parking systems can:

- **Reduce traffic congestion** by helping drivers find spaces faster
- **Improve revenue collection** with accurate occupancy data for enforcement
- **Support planning decisions** with data on parking usage patterns
- **Enhance resident experience** with real-time availability information

This scenario lets you evaluate whether IoT-based parking monitoring could work for your council's car parks.

## Constraints

- **Budget limit**: $50 maximum spend (sufficient for extensive exploration)
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **No cost to you** - the budget is provided by NDX:Try

## Important Notes

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

### Before your session ends

- Export any configurations or code snippets you want to keep
- Take screenshots of dashboards and API responses
- Document any insights about data flows and architecture
- Note which aspects would work for your real parking facilities

### Infrastructure as code

The resources in this scenario were deployed using Infrastructure as Code (IaC). When building for production, we strongly recommend using CloudFormation, CDK, or Terraform rather than manual console configuration. This ensures repeatability, version control, and easier compliance.

### Build your own

After exploring this pre-deployed scenario, use the **Empty Sandbox** to build your own solution from scratch. The Empty Sandbox gives you a clean AWS environment where you can experiment freely.

## Explore more scenarios

- **[Empty Sandbox](/catalogue/aws/innovation-sandbox-empty/)** - Start fresh with a clean AWS environment
- **[QuickSight Dashboard](/catalogue/aws/quicksight-dashboard/)** - Analytics and reporting
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services
- **[Text to Speech](/catalogue/aws/text-to-speech/)** - Accessibility audio generation

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Budget exhausted early?** Some services have higher costs - contact support if unexpected

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
