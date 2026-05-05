---
layout: layouts/product-try
title: AI Contact Centre
description: Dial a real UK phone number from your own phone, talk to an AI bot that triages distressed callers, send a photo through a messaging simulator, and watch one case form across voice and photo on Amazon Connect
image:
  src: /assets/catalogue/aws/connect-logo.svg
  alt: Amazon Connect
eleventyNavigation:
  parent: Catalogue
tags:
  - AWS
  - Amazon
  - Contact Centre
  - AI
  - Voice
  - Multichannel
  - Local Government
  - Sandbox
  - Evaluation
  - try-before-you-buy
try: true
try_id: "91002237-b69b-47db-b14e-112693eecef6"
walkthrough_url: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/ai-contact-centre/"
github_source: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/ai-contact-centre"
---

<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/scenarios/ai-contact-centre/ -->
<!-- External URL dependency: https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/ai-contact-centre/ -->
<!-- Maintained by: NDX Team | Last verified: 2026-05-01 -->

{% from "govuk/components/inset-text/macro.njk" import govukInsetText %}
{% from "govuk/components/warning-text/macro.njk" import govukWarningText %}
{% from "govuk/components/button/macro.njk" import govukButton %}

![](https://img.shields.io/badge/provider-aws-green) ![](https://img.shields.io/badge/owner-public_sector-blue) ![](https://img.shields.io/badge/access-NDX:Try-purple) ![](https://img.shields.io/badge/try_before_you_buy-available-brightgreen) ![](https://img.shields.io/badge/category-AI-orange) ![](https://img.shields.io/badge/category-Contact_Centre-blue) [![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/ai-contact-centre)

## Overview

{{ govukInsetText({
  html: "<strong>One resident, one case, two channels</strong><br>Call the council on a real UK phone number. Report a fly-tip. Send a photo through the messaging simulator. The bot reads back a single sentence: <em>\"I've reviewed your photo; environmental health will visit Wednesday, ref ABC123.\"</em> Voice and photo, joined to one case, read back as one promise."
}) }}

> **Learning Artifact**: This is a pre-deployed demonstration environment for learning and exploration, not a production-ready product.

A complete AI-powered council reception line built on Amazon Connect. A resident calls a real UK phone number, speaks to an AI bot powered by Amazon Lex and Amazon Bedrock, and gets triaged, answered, and case-tracked without a human touching it. When the caller mentions five issues in one breath, the bot picks the top four by urgency and acknowledges each by name. When distress is sustained, a safeguarding flag flips on the case and the call routes to a human agent. And when the resident sends a photo of a fly-tip through the messaging simulator, Bedrock describes what it sees, links the photo to the open case, and the bot reads back the result on the still-open phone call.

Eight languages are supported. Speak Italian, and the bot switches voice and transcription mid-call with no menu and no transfer.

{{ govukWarningText({
  text: "After requesting your session, the environment will deploy automatically in about 10 minutes. Once ready, the 8-step walkthrough guides you through every demo, from a simple bin-collection call to an Italian multi-intent stress test.",
  iconFallbackText: "Important"
}) }}

---

## What you'll explore

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Core capabilities

| Capability                                                                                                                                                                      | Powered by                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/ai-contact-centre/step-1/" target="_blank" rel="noopener">**Real UK phone number**</a>                  | <a href="https://aws.amazon.com/connect/" target="_blank" rel="noopener">Amazon Connect</a>                                                                                                  |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/ai-contact-centre/step-6/" target="_blank" rel="noopener">**Multi-intent triage**</a>                   | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a> (Nova Pro)                                                                                       |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/ai-contact-centre/step-2/" target="_blank" rel="noopener">**Photo description**</a>                     | <a href="https://aws.amazon.com/bedrock/" target="_blank" rel="noopener">Amazon Bedrock</a> (Nova Pro vision)                                                                                |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/ai-contact-centre/step-7/" target="_blank" rel="noopener">**8-language support**</a>                    | <a href="https://aws.amazon.com/lex/" target="_blank" rel="noopener">Amazon Lex v2</a> (6 locales) + <a href="https://aws.amazon.com/polly/" target="_blank" rel="noopener">Amazon Polly</a> |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/ai-contact-centre/step-8/" target="_blank" rel="noopener">**Guardrails + prompt injection defence**</a> | <a href="https://aws.amazon.com/bedrock/guardrails/" target="_blank" rel="noopener">Bedrock Guardrails</a>                                                                                   |
| <a href="https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/ai-contact-centre/step-4/" target="_blank" rel="noopener">**Live agent hand-take**</a>                  | <a href="https://aws.amazon.com/connect/" target="_blank" rel="noopener">Connect Agent Workspace</a>                                                                                         |

</div>
<div class="govuk-grid-column-one-half">

### Infrastructure

| Component             | AWS service                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Knowledge base**    | <a href="https://aws.amazon.com/bedrock/knowledge-bases/" target="_blank" rel="noopener">Bedrock Knowledge Base</a>                                                       |
| **Case management**   | <a href="https://aws.amazon.com/connect/cases/" target="_blank" rel="noopener">Connect Cases</a>                                                                          |
| **Caller identity**   | <a href="https://aws.amazon.com/connect/customer-profiles/" target="_blank" rel="noopener">Customer Profiles</a>                                                          |
| **PII redaction**     | <a href="https://aws.amazon.com/connect/contact-lens/" target="_blank" rel="noopener">Contact Lens</a>                                                                    |
| **Browser calling**   | <a href="https://aws.amazon.com/chime/chime-sdk/" target="_blank" rel="noopener">Amazon Chime SDK</a>                                                                     |
| **Companion web app** | <a href="https://aws.amazon.com/cloudfront/" target="_blank" rel="noopener">CloudFront</a> + <a href="https://aws.amazon.com/waf/" target="_blank" rel="noopener">WAF</a> |

</div>
</div>

---

## Getting started

Once you select **"Try this now"** above, your session environment deploys automatically.

{{ govukInsetText({
  html: "<strong>What happens next:</strong><br>1. Your environment deploys in about 10 minutes<br>2. Open the CloudFormation Outputs tab to find your phone number and companion app URL<br>3. Follow the 8-step walkthrough: call the bot, send a photo, take a safeguarding call as an agent, edit the greeting live, run an Italian stress test, and push 30+ questions through the chat"
}) }}

{{ govukButton({
  text: "Preview the walkthrough",
  href: "https://aws.try.ndx.digital.cabinet-office.gov.uk/walkthroughs/ai-contact-centre/",
  classes: "govuk-button--secondary"
}) }}

---

## Why this matters for local government

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Multilingual residents

- **8 languages** with no IVR menu and no transfer queue
- The bot detects the caller's language from their first sentence and switches voice and transcription mid-call
- Full quality for English, Italian, French, German, Spanish, Polish; best-effort for Welsh and Romanian
- Same knowledge base, same case pipeline, every language

</div>
<div class="govuk-grid-column-one-half">

### Distressed and vulnerable callers

- **Multi-intent triage** extracts up to five issues from a single distressed utterance and acknowledges each by name
- **Safeguarding flag** flips automatically on sustained distress, routing the case to a trained human agent
- **PII redaction** at the instance level means even the live agent transcript shows `{NAME}` and `{ADDRESS}` placeholders, never the original

</div>
</div>

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-half">

### Multichannel, one case

- Voice call and photo upload land on a **single Connect Case** with a shared reference number
- The bot reads back the photo description on the still-open phone call
- Customer Profiles links the resident's phone number across channels
- No duplicate tickets, no manual merge

</div>
<div class="govuk-grid-column-one-half">

### Configurable by non-developers

- **Edit the bot's greeting** in the Connect console GUI in under a minute, no deploy needed
- Add documents to the S3 knowledge base bucket and the bot starts answering from them
- Bedrock Guardrails block legal advice, hallucination, and prompt injection without code changes
- The 8-step walkthrough proves all of this to your team in 46 minutes

</div>
</div>

---

## About this scenario

This scenario provisions a complete Amazon Connect contact centre with a real UK phone number, 22 Lambda functions, a Bedrock Knowledge Base seeded with fictional Aldershire District Council content, Connect Cases, Customer Profiles, Contact Lens with PII redaction, and a three-pane companion web app on CloudFront.

{{ govukInsetText({
  html: "<strong>Everything is infrastructure-as-code</strong><br>One SAM template, 100 CloudFormation resources, zero manual setup. Every Connect custom resource (security profiles, queue lookup, storage config, Wisdom binding) is wrapped in a Lambda-backed custom resource so the next sandbox lease is identical to the last."
}) }}

<div class="govuk-grid-row">
<div class="govuk-grid-column-one-third">

### The problem

- Council reception lines are expensive to staff and slow to change
- Distressed callers raising multiple issues get triaged manually
- Photos from residents arrive on a different channel and create duplicate tickets
- Non-English speakers face hold-music menus or wait for a translator

</div>
<div class="govuk-grid-column-one-third">

### The solution

- AI-powered reception on Amazon Connect with Bedrock RAG
- Multi-intent decomposition: one utterance, four acknowledged issues
- Cross-channel case unification: voice + photo = one ticket
- Dynamic language switching: no menu, no transfer, eight languages

</div>
<div class="govuk-grid-column-one-third">

### What you'll take away

- A working demo you can show your CIO in 46 minutes
- Hands-on experience with Connect, Lex, Bedrock, Cases, and Contact Lens
- Proof that the greeting can be changed in under a minute by a non-developer
- A 30+ question stress test showing what the bot answers, refuses, and refers

</div>
</div>

---

## Explore more scenarios

- **[Council Chatbot](/catalogue/aws/council-chatbot/)** -- AI-powered resident Q&A (text only, no voice)
- **[Simply Readable](/catalogue/aws/simply-readable/)** -- Document translation and Easy Read conversion
- **[Text to Speech](/catalogue/aws/text-to-speech/)** -- Accessibility audio generation with Amazon Polly
- **[FOI Redaction](/catalogue/aws/foi-redaction/)** -- Automated sensitive data removal for FOI requests
- **[FixMyStreet](/catalogue/aws/fixmystreet/)** -- Citizen problem reporting platform

---

## Troubleshooting

- **No phone number in the Outputs tab?** The per-account phone-number claim quota may be exhausted from prior sessions. Contact the NDX team for a fresh sandbox account.
- **Bot says "I cannot help with that one directly"?** That's Bedrock Guardrails doing its job. Try a question the knowledge base covers (bin collection, council tax, planning permission). Step 8 of the walkthrough lists 30+ example questions with expected responses.
- **Browser call not connecting?** Make sure you've allowed microphone access in your browser. Chrome, Edge, and Safari are supported.
- **Photo upload returns an error?** Check that the Sender phone field matches the number you called from. Connect Cases looks up the open ticket by phone number.

## Support

For technical issues during your sandbox session, contact the NDX team at ndx@dsit.gov.uk.
