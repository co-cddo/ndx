---
layout: layouts/product-try
title: LocalGov IMS Income Management System
description: Explore the open-source income management system for UK councils - with GOV.UK Pay integration, account management, and seeded demo data
image:
  src: /assets/catalogue/localgov-ims/localgov-ims-logo.svg
  alt: LocalGov IMS
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - Finance
  - payments
  - Local Government
  - Open Source
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "4e83af55-b28c-41b2-8a5e-01eefaf18652"
walkthrough_url: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-ims/"
github_source: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/localgov-ims"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/localgov-ims/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-ims/ -->
<!-- External URL dependency: https://github.com/LocalGovIMS/localgov-ims -->
<!-- Maintained by: NDX Team | Last verified: 2026-03-23 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green) ![](https://img.shields.io/badge/owner-public_sector-blue) ![](https://img.shields.io/badge/access-NDX:Try-purple) ![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen) ![](https://img.shields.io/badge/category-Finance-teal) ![](https://img.shields.io/badge/category-Open_Source-blue) [![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/localgov-ims)

## Overview

{{ govukInsetText({
  html: "<strong>Council income management with GOV.UK Pay</strong><br>40 account holders &bull; 500 transactions &bull; 19 fund types &bull; GOV.UK Pay sandbox &bull; 5-step guided walkthrough"
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product.

[LocalGov IMS](https://github.com/LocalGovIMS/localgov-ims) is an open-source income management system built for UK local authorities. It handles council tax, business rates, parking fines, housing rents, and other payment types — with integrated GOV.UK Pay for citizen-facing payments.

This scenario deploys the complete IMS with realistic seeded data, so you can explore the admin portal, manage accounts and transactions, and see how GOV.UK Pay integrates with council payment workflows.

{{ govukWarningText({
  text: "After requesting your session, the environment takes approximately 30 minutes to deploy. Once ready, the walkthrough will guide you through logging in and exploring the system.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### IMS Features

| Feature                                                                                                            | What it does                                             |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| [**Admin portal**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-ims/step-1/)            | Dashboard with navigation to all system areas            |
| [**Accounts & transactions**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-ims/step-2/) | 40 account holders, 500 payments across 19 fund types    |
| [**User management**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-ims/step-3/)         | 6 users with different roles (officer, cashier, auditor) |
| [**Fund configuration**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-ims/step-4/)      | 19 fund types from Council Tax to Housing Rents          |
| [**Payment portal**](https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-ims/step-5/)          | Citizen-facing payments via GOV.UK Pay sandbox           |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component          | AWS Service                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| **Compute**        | [Amazon EC2](https://aws.amazon.com/ec2/) (Windows Server 2022, IIS)      |
| **Database**       | [Amazon RDS SQL Server Express](https://aws.amazon.com/rds/sqlserver/)    |
| **Load balancing** | [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/) |
| **HTTPS**          | [Amazon CloudFront](https://aws.amazon.com/cloudfront/) (3 distributions) |
| **Payments**       | [GOV.UK Pay](https://www.payments.service.gov.uk/) (sandbox)              |

</div>
</div>

---

## Getting started

Once you select **"Try this now"** above, your session environment will begin deploying automatically.

{{ govukInsetText({
  html: "<strong>What happens next:</strong><br>1. Your environment deploys (~30 minutes)<br>2. Follow the walkthrough to log in as an admin user<br>3. Explore accounts, transactions, fund types, and the payment portal"
}) }}

{{ govukButton({
  text: "Preview the scenario",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/localgov-ims/",
  classes: "govuk-button--secondary"
}) }}

{{ govukButton({
  text: "Preview the walkthrough",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/localgov-ims/",
  classes: "govuk-button--secondary"
}) }}

---

## Why this matters for local government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Unified income management

- All payment types in one system
- Council Tax, Business Rates, Parking Fines, Housing Rents
- 19 configurable fund types
- Consistent processing across all income streams

</div>
<div class="govuk-grid-column-one-half">

### GOV.UK Pay integration

- Citizens pay online through trusted government infrastructure
- Sandbox environment for safe testing
- Card payments processed through GOV.UK Pay
- Reconciliation built into the admin workflow

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Transparency and auditability

- Full transaction history with search and filtering
- Role-based access (finance officer, cashier, auditor)
- Account holder records with balances
- Import and reconciliation tools

</div>
<div class="govuk-grid-column-one-half">

### Open source, zero licence fees

- No vendor lock-in
- Community-driven development
- Full control over your data
- Built with ASP.NET on .NET Framework

</div>
</div>

---

## About LocalGov IMS

[LocalGov IMS](https://github.com/LocalGovIMS/localgov-ims) is an open-source income management system designed for UK local authorities. It provides a complete back-office system for managing council income across multiple fund types.

{{ govukInsetText({
  html: "<strong>Pre-seeded demo data</strong> &bull; 40 account holders &bull; 500 transactions &bull; 19 fund types &bull; 6 users with different roles"
}) }}

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-third">

### The problem

- Income managed across multiple disconnected systems
- No unified view of resident accounts
- Manual reconciliation of payments
- Inconsistent payment channels

</div>
<div class="govuk-grid-column-one-third">

### The solution

- Single system for all council income types
- Integrated GOV.UK Pay for citizen payments
- Role-based admin portal with full audit trail
- Configurable fund types and payment methods

</div>
<div class="govuk-grid-column-one-third">

### The outcome

- Unified view of all council income
- Self-service payments for residents
- Reduced manual processing
- Complete audit trail for compliance

</div>
</div>

---

## Constraints

- **Budget limit**: $50 maximum spend (sufficient for extensive exploration)
- **Duration**: 24 hours from activation
- **Purpose**: Evaluation only (non-production use)
- **No cost to you** - the budget is provided by NDX:Try

> **Resource Lifecycle Warning**: All resources in your sandbox will be automatically deleted when your session time expires OR when the budget limit is reached (whichever comes first). Do not store important data in this environment.

---

### How this was built

This scenario is built with open source infrastructure as code using AWS CDK (Cloud Development Kit). The IMS application is built from source on a Windows Server EC2 instance with IIS, connecting to RDS SQL Server for data storage.

[View the source code on GitHub](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/localgov-ims)

---

## Explore more scenarios

- **[Empty AWS Sandbox](/catalogue/aws/aws-empty-sandbox/)** - Start fresh with a clean AWS environment
- **[BOPS Planning](/catalogue/aws/bops-planning/)** - Open-source planning case management system
- **[LocalGov Drupal with AI](/catalogue/aws/localgov-drupal/)** - AI-enhanced content management for councils
- **[Council Chatbot](/catalogue/aws/council-chatbot/)** - AI-powered resident services chatbot
- **[Simply Readable](/catalogue/aws/simply-readable/)** - Document translation and Easy Read conversion

---

## Learn more about LocalGov IMS

- [LocalGov IMS source code on GitHub](https://github.com/LocalGovIMS/localgov-ims)
- [GOV.UK Pay](https://www.payments.service.gov.uk/)

---

## Troubleshooting

- **Try button not working?** Make sure you're signed in to NDX
- **Did not receive credentials?** Check the CloudFormation Outputs tab for the admin password
- **Cannot access the scenario?** Ensure you're using the correct AWS region (us-east-1)
- **Login fails?** Use the email format (e.g. tester1@your-organisation.com) with the password from CloudFormation Outputs
- **Environment still deploying?** LocalGov IMS takes ~30 minutes — check the CloudFormation stack status

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
