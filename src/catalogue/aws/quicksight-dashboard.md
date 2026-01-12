---
layout: layouts/product-try
title: QuickSight Dashboard
description: Explore interactive analytics dashboards for service performance data - a pre-deployed learning environment
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: QuickSight Dashboard
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - Analytics
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "70de71bb-30f9-46f1-89ed-b3e14d878c10"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/quicksight-dashboard/ -->
<!-- Maintained by: NDX Team | Last verified: 2025-12-05 -->

![](https://img.shields.io/badge/provider-aws-green)
![](https://img.shields.io/badge/owner-public_sector-blue)
![](https://img.shields.io/badge/access-NDX:Try-purple)
![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen)
![](https://img.shields.io/badge/category-Analytics-orange)

## About NDX

NDX (National Digital Exchange) is a government platform that helps public sector organisations discover, evaluate, and adopt digital solutions.

## Overview

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product. Use it to understand how AWS analytics services can provide insights into service performance.

**Deployed and ready** - no setup required. When you request this sandbox, you'll receive access to pre-configured analytics dashboards that are already populated with sample data and ready to explore.

This QuickSight Dashboard scenario demonstrates how local authorities can use AWS analytics services to create interactive dashboards and reports for monitoring service delivery, tracking KPIs, and making data-driven decisions.

## What you'll explore

This sandbox includes a working implementation using:

- **Amazon QuickSight** - Business intelligence service for creating interactive dashboards and visualisations
- **Amazon S3** - Data lake storage for raw and processed data
- **AWS Glue** - Data catalogue and ETL (Extract, Transform, Load) jobs for data preparation

**In plain English:** You'll explore interactive charts and reports for service performance data - like response times, customer satisfaction, and workload metrics - that update automatically as new data arrives.

## Learn More

Before requesting your sandbox, explore the scenario documentation to understand what's deployed and how to interact with it:

<a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/quicksight-dashboard/" target="_blank" rel="noopener">View QuickSight Dashboard scenario details</a>

## Getting started

1. Select **"Try this now for 24 hours"** above
2. Accept the Acceptable Use Policy
3. Receive AWS SSO credentials via email
4. Access your sandbox environment through AWS Console
5. Follow the scenario guide to explore the pre-built dashboards and try creating your own visualisations

## Why This Matters for Local Government

Modern analytics dashboards can:

- **Provide real-time visibility** into service performance across departments
- **Enable data-driven decisions** with accurate, up-to-date metrics
- **Support transparency** by making performance data accessible to stakeholders
- **Identify trends early** so issues can be addressed before they escalate

This scenario lets you evaluate whether cloud-based business intelligence could improve your council's reporting capabilities.

## Constraints

- **Budget limit**: $50 maximum spend (sufficient for extensive exploration)
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **No cost to you** - the budget is provided by NDX:Try

## Important Notes

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

### Before your session ends

- Export any dashboard designs or configurations you want to keep
- Take screenshots of visualisations you find useful
- Document any insights about capabilities and limitations
- Note which data sources would be needed for your real use case

### Infrastructure as code

The resources in this scenario were deployed using Infrastructure as Code (IaC). When building for production, we strongly recommend using CloudFormation, CDK, or Terraform rather than manual console configuration. This ensures repeatability, version control, and easier compliance.

### Build your own

After exploring this pre-deployed scenario, use the **Empty Sandbox** to build your own solution from scratch. The Empty Sandbox gives you a clean AWS environment where you can experiment freely.

## Explore more scenarios

- **[Empty Sandbox](/catalogue/aws/innovation-sandbox-empty/)** - Start fresh with a clean AWS environment
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services
- **[Smart Car Park](/catalogue/aws/smart-car-park/)** - IoT-based real-time monitoring
- **[Planning AI](/catalogue/aws/planning-ai/)** - Intelligent document analysis

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check your spam folder, or wait a few minutes
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Budget exhausted early?** Some services have higher costs - contact support if unexpected

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
