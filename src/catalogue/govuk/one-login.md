---
layout: product
title: GOV.UK One Login
description: Let users sign in and prove their identities to use your service with secure authentication and identity verification for central government services
image:
  src: /assets/catalogue/govuk/one-login-logo.svg
  alt: GOV.UK One Login
eleventyNavigation:
  parent: Catalogue
tags:
  - govuk
  - government
  - public-sector
  - Authentication
  - Identity
  - security
  - beta
---

![](https://img.shields.io/badge/provider-government-blue)
![](https://img.shields.io/badge/owner-public_sector-green)
![](https://img.shields.io/badge/access-government_approved-darkgreen)
![](https://img.shields.io/badge/status-beta-orange)
![](https://img.shields.io/badge/procurement-not_required-brightgreen)

{% from "govuk/components/button/macro.njk" import govukButton %}

{{ govukButton({
  text: "Get started with GOV.UK One Login",
  href: "https://www.sign-in.service.gov.uk/get-started",
  isStartButton: true
}) }}
</br>

{{ govukButton({
  text: "View documentation",
  href: "https://docs.sign-in.service.gov.uk/",
  isStartButton: true
}) }}

GOV.UK One Login is a beta service that lets users sign in and prove their identities to access central government services. Users can create one account that works across multiple government services, making it easier for citizens to access the services they need while providing robust security and identity verification.

As part of the GOV.UK Digital Service Platform, One Login eliminates the need for each service to build its own authentication system, reducing development time and ensuring consistent security standards across government.

## Two core capabilities

### Sign in and authentication

Let your users sign in to your service with their email address, password and two-factor authentication. They can use the same login details to access all services that use GOV.UK One Login, creating a seamless experience across government.

### Identity verification

Get your users' identity checks done centrally by using GOV.UK One Login. You'll receive confirmation that the person is who they say they are without having to do any checks yourself. Users can reuse these identity checks to access other government services.

## Why choose GOV.UK One Login

### Simplified user experience

Citizens can use one set of login credentials across all participating government services. No need to remember multiple usernames and passwords or go through identity verification multiple times.

### Enhanced security

Multi-factor authentication (MFA) is built in, providing strong security protection. Government-grade security standards applied consistently across all participating services.

### Reduced development burden

No need to build your own authentication or identity verification systems. Integrate with a proven, secure solution that's already being used across government.

### Cost-effective identity verification

Centralized identity checking reduces costs compared to each service conducting its own verification processes. Users verify their identity once and reuse across services.

### Consistent user journeys

Researched, accessible user journeys that can be incorporated into your existing service journey. Built using the GOV.UK Design System for familiar user experiences.

### No procurement required

As a government service, you can integrate GOV.UK One Login without procurement processes or supplier evaluation.

## How it works for users

### Creating an account

Users create a GOV.UK One Login account with their email address and a secure password. They can then set up two-factor authentication for enhanced security.

### Identity verification process

When services require identity verification, users can prove who they are by providing identity documents and completing security checks through the One Login system.

### Cross-service access

Once verified, users can access any participating government service using their One Login credentials, without needing to verify their identity again.

### Account management

Users can manage their account, view the services they've accessed, and update their security settings from a central dashboard.

## Benefits for government services

### Rapid integration

Get set up quickly using the integration environment. Follow comprehensive technical documentation to integrate at your own pace.

### Flexible implementation

Choose to use just authentication, just identity verification, or both capabilities depending on your service needs.

### Proven user research

Benefit from extensive user research and testing that has informed the design of accessible, user-friendly authentication journeys.

### Comprehensive support

Access detailed documentation, integration support, and regular cross-government show-and-tell sessions to stay informed about developments.

### Future-proof architecture

Built for scalability and extensibility, ensuring your integration will work as the service evolves and adds new capabilities.

### Analytics and insights

Understand how users interact with your authentication flows and identify opportunities for improvement.

## Suitable for central government services

GOV.UK One Login is currently available for central government services that need to:

### Authenticate users

Services that require users to create accounts and sign in securely, from simple information services to complex transactional systems.

### Verify identities

Services that need to confirm users' identities for regulatory, legal, or security reasons, such as financial services or high-value transactions.

### Provide personalized content

Services that deliver personalized information or services based on user identity and preferences.

### Enable cross-service journeys

Services that are part of broader user journeys spanning multiple government departments or agencies.

### Meet security requirements

Services with heightened security requirements that benefit from robust, government-grade authentication and identity verification.

## Technical integration

### RESTful API

Comprehensive REST API that integrates with existing systems and development workflows. Full OpenAPI specifications available.

### Multiple authentication flows

Support for various authentication flows including authorization code flow and client credentials flow to suit different service architectures.

### Webhook support

Real-time notifications about authentication events and identity verification status changes through secure webhooks.

### Development environment

Full integration environment for testing and development before going live, allowing teams to experiment and validate their implementation.

### SDK and libraries

Software development kits and libraries available for common programming languages to simplify integration.

### Detailed documentation

Comprehensive technical documentation with code examples, integration guides, and troubleshooting resources.

## Security and compliance

GOV.UK One Login is built to the highest security standards:

- **Multi-factor authentication**: Mandatory 2FA for all user accounts
- **Government security standards**: Meets Cabinet Office security requirements
- **GDPR compliance**: Full compliance with UK data protection laws
- **Continuous monitoring**: 24/7 security monitoring and incident response
- **Regular audits**: Ongoing security assessments and penetration testing
- **Encrypted communications**: All data encrypted in transit and at rest

## Current status and roadmap

### Beta service

Currently in beta for central government services, with ongoing development based on user feedback and government needs.

### Growing adoption

Increasing number of government services integrating with One Login, building a comprehensive ecosystem of connected services.

### Feature development

Continuous improvement of authentication methods, identity verification capabilities, and integration options.

### Future expansion

Plans to expand availability and capabilities based on feedback from current users and emerging government needs.

Built by the Government Digital Service (GDS), GOV.UK One Login provides the secure, user-friendly authentication and identity infrastructure that modern government services need to deliver excellent digital experiences while maintaining the highest security standards.
