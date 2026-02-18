---
layout: page
title: Acceptable use policy
description: Acceptable use policy for the NDX Try sandbox environment
---

# Acceptable use policy

## Dedicated sandbox environment for SaaS evaluation (24-hour access)

Effective date: 18 February 2026

The National Digital Exchange (NDX) is a first-of-its-kind digital marketplace being developed by the UK government to modernise how public sector organisations procure and access technology services.

This Acceptable Use Policy ("AUP") forms part of the contractual terms governing access to the dedicated sandbox environment (the "Sandbox") provided by NDX Try to UK public sector Departments and local authority customers for the limited purpose of evaluating AWS before committing to production deployment.

Capitalised terms not defined in this AUP shall have the meanings given in the applicable Master Services Agreement, Evaluation Agreement, or similar governing terms.

By accessing or using the Sandbox, the customer entity ("Customer") confirms that it has read, understood, and agrees to comply with this AUP.

## 1. Purpose, nature of service, and scope

1.1 The Sandbox is a non-production, time-limited environment made available for a maximum period of 24 hours to support product evaluation, proof-of-concept activities, and demonstrations.

1.2 The Sandbox is provided on a temporary and revocable basis and does not form part of the live production service.

1.3 The Sandbox is not designed or intended for:

- operational use
- processing of live or business-critical data
- long-term storage of information

<!-- -->

1.4 This AUP applies to all individuals authorised by the Customer to access the Sandbox ("Authorised Users"). The Customer remains fully responsible for all acts and omissions of its Authorised Users.

## 2. Permitted use

Subject to this AUP, the Customer may use the Sandbox solely to:

- assess the functionality and suitability of the SaaS service
- perform non-production testing and configuration
- evaluate potential integrations using test, anonymised, or synthetic data

All use of the Sandbox must comply with applicable UK laws and regulations, including UK GDPR for Data Protection and cybersecurity legislation.

## 3. Prohibited use

The Customer must not, and must ensure that Authorised Users do not:

- upload, process, or store production, live, or operational data
- process special category personal data as defined under UK GDPR (including data relating to health, biometrics, genetics, or criminal offences)
- process personal data relating to children
- use the Sandbox without an appropriate lawful basis for any personal data processing
- conduct penetration testing, vulnerability scanning, or similar security testing without the Service Provider's prior written consent
- attempt to circumvent technical safeguards, access other customers' environments, or disrupt the integrity or performance of the service
- introduce malware, malicious code, or harmful content
- use the Sandbox for any unlawful, misleading, or unethical purpose

## 4. Data protection and privacy

4.1 **Roles of the Parties**
For the purposes of UK data protection law, the Customer acts as data controller in respect of any personal data it inputs into the Sandbox. The Service Provider acts as data processor (or sub-processor, where applicable) solely to provide the Sandbox.

4.2 **Data Processing Agreement (DPA)**
Any processing of personal data in the Sandbox is subject to the Service Provider's Data Processing Agreement ("DPA"), which is incorporated by reference into this AUP. In the event of any conflict, the DPA shall prevail in relation to personal data processing obligations.

4.3 **Data Minimisation and ICO Guidance**
In line with the UK GDPR principles and guidance issued by the Information Commissioner's Office (ICO), the Customer must ensure that:

- personal data is adequate, relevant, and limited to what is strictly necessary
- anonymised or synthetic data is used wherever feasible
- no special category or high-risk personal data is introduced into the Sandbox

<!-- -->

4.4 **No Production Safeguards**
The Sandbox does not provide the same levels of resilience, availability, auditability, or support as the production service and should be treated accordingly.

## 5. Security measures

5.1 The NDX Platform applies reasonable and proportionate technical and organisational measures to protect the Sandbox, which may include:

- logical and tenant-level isolation
- role-based access controls
- interaction tracking: user interactions within the sandbox are logged
- encryption of data in transit
- monitoring for abuse, misuse, or anomalous activity by way of audit logs

<!-- -->

5.2 The Customer acknowledges that the Sandbox:

- is designed for evaluation purposes and does not provide production-grade assurance
- should not be relied upon for confidentiality or integrity guarantees beyond those expressly stated

<!-- -->

5.3 Where the Sandbox provides access to a leased AWS account for evaluation purposes, the Customer and its Authorised Users must:

- use the account solely for the approved Sandbox evaluation activities
- access only data, services, and resources for which they are explicitly authorised
- not introduce unapproved organisational data or confidential information into the account
- not alter account-level security configurations, identity settings, quotas, or service limits unless expressly authorised
- not transfer data, software, or artefacts from the leased account except for evaluation outputs generated during authorised Sandbox use
- comply with applicable intellectual property laws when using or exporting materials

<!-- -->

5.4 The Customer must notify the NDX Platform Support Team via the contact details set out in Section 11 without undue delay as soon as reasonably practicable after becoming aware of any actual or suspected security incident relating to the Sandbox.

## 6. Access duration and termination

6.1 Sandbox access is granted for a period of up to 24 hours from the time credentials are issued, unless otherwise agreed in writing.

6.2 The NDX Platform may suspend or terminate access immediately where:

- this AUP is suspected to be breached
- continued access poses a security, legal, or operational risk
- required to comply with applicable law or regulatory obligations

## 7. Post-sandbox data handling and deletion

7.1 **Automatic Deletion**
Upon expiry or termination of the Sandbox, all Customer data, configurations, and content will be automatically deleted.

7.2 **Deletion Timeframe**
Deletion will occur within 24 hours following Sandbox expiry, including associated backups, unless retention is required by law.

7.3 **Irretrievability**
Once deletion has occurred, Sandbox data cannot be recovered. The Customer is responsible for exporting any permitted evaluation outputs prior to expiry.

7.4 **No Secondary Use**
The NDX Platform will not retain or reuse Sandbox data for product development, analytics, or marketing, except in aggregated and anonymised form.

## 8. Monitoring and enforcement

The NDX Platform reserves the right to monitor Sandbox usage, including access and activity logs, for the purposes of maintaining security, service integrity, and ensuring compliance with this AUP. Where non-compliance is identified, the NDX Platform may take proportionate enforcement action, including suspension or termination of access.

## 9. Disclaimers and limitation of use

- The Sandbox is provided "as is" and "as available" for evaluation purposes only.
- No warranties are given in relation to performance, availability, or data durability.
- The NDX Platform accepts no liability for loss, corruption, or deletion of data entered into the Sandbox.

## 10. Policy updates

This AUP may be updated from time to time. The version in force at the time of Sandbox access shall apply.

## 11. Contact

For queries relating to this AUP, data protection, or security, please contact:

[ndx@dsit.gov.uk](mailto:ndx@dsit.gov.uk)
