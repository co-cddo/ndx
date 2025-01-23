---
layout: post
title: Deploy Amazon Connect
eleventyNavigation:
  parent: access
---

{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/fieldset/macro.njk" import govukFieldset %}
{% from "govuk/components/button/macro.njk" import govukButton %}

> ==⚠️ NOT A REAL FORM, DO NOT PUT REAL DATA HERE==

{% call govukFieldset({
  legend: {
    text: "Your details",
    classes: "govuk-fieldset__legend--l"
  }
}) %}

> ⚠️ We've pre-filled your details with the information we have on file, please check the accuracy of the information before proceeding.

{{ govukInput({  label: {text: "Name"}, value: "John Doe", disabled: true}  ) }}
{{ govukInput({  label: {text: "Email address"}, value: "john.doe@example.gov.uk", disabled: true}  ) }}

{% endcall %}

{% call govukFieldset({
  legend: {
    text: "Your service details",
    classes: "govuk-fieldset__legend--l"
  }
}) %}

{{ govukInput({  label: {text: "Name"}, value: "Apply for a juggling license"}  ) }}
{{ govukInput({  label: {text: "Program/Directorate/Portfolio/Organisational Unit"}, value: "Circus Arts"}  ) }}
{{ govukInput({  label: {text: "Group mailbox"}, value: "juggling-licences@example.gov.uk"}  ) }}

{% endcall %}

{% call govukFieldset({
  legend: {
    text: "Security representative",
    classes: "govuk-fieldset__legend--l"
  }
}) %}

> ⚠️ We will configure this named individual to receive security alerts (in addition to your team mailbox), they will need to provide attestation that they are an authorised security representative for your organisation and that they have the necessary skills and knowledge to act on security alerts in a timely manner.

{{ govukInput({  label: {text: "Name"}, value: "Jane Doe"}  ) }}
{{ govukInput({  label: {text: "Email address"}, value: "jane.doe@example.gov.uk"}  ) }}

{% endcall %}

{% call govukFieldset({
  legend: {
    text: "Financial representative",
    classes: "govuk-fieldset__legend--l"
  }
}) %}

> ⚠️ We will configure this named individual to receive financial alerts (in addition to your team mailbox), they will need to provide attestation that they are an authorised financial representative for your organisation and that they have the necessary skills and knowledge to act on financial alerts in a timely manner.

{{ govukInput({  label: {text: "Name"}, value: "Janet Doe"}  ) }}
{{ govukInput({  label: {text: "Email address"}, value: "janet.doe@example.gov.uk"}  ) }}

{% endcall %}

{% call govukFieldset({
  legend: {
    text: "Your Organisation's Identity Provider",
    classes: "govuk-fieldset__legend--l"
  }
}) %}

{{ govukInput({  label: {text: "OIDC Provider"}, value: "token.idp.example.gov.uk"}  ) }}
{{ govukInput({  label: {text: "OIDC Subject"}, value: "group:developers-juggling-licence"}  ) }}

{% endcall %}

{% call govukFieldset({
  legend: {
    text: "Your Version Control System's Identity Provider",
    classes: "govuk-fieldset__legend--l"
  }
}) %}

> ⚠️ We will configure your Version Control System (VCS) to allow your CI/CD pipeline to deploy to your configuration as a fully automated process.

{{ govukInput({  label: {text: "Repository URL"}, value: "github.com/example-gov-org/juggling-licence-service"}  ) }}
{{ govukInput({  label: {text: "OIDC Provider"}, value: "token.actions.githubusercontent.com"}  ) }}
{{ govukInput({  label: {text: "OIDC Subject"}, value: "repo:example-gov-org/juggling-licence-service:ref:refs/heads/main"}  ) }}

{% endcall %}

{% call govukFieldset({
  legend: {
    text: "Financial configuration",
    classes: "govuk-fieldset__legend--l"
  }
}) %}

{{ govukInput({  label: {text: "Spend approval reference"}, value: "#ABC123"}  ) }}

> ⚠️ We will configure your Amazon Connect instance to alert when the total cost of your AWS bill exceeds the limit you set here.

### Actual spend

{{ govukInput({  label: {}, prefix: {text: "£"}, suffix: {text: "per hour"}, value: "1.00"}  ) }}
{{ govukInput({  label: {}, prefix: {text: "£"}, suffix: {text: "per day"}, value: "24.00"}  ) }}
{{ govukInput({  label: {}, prefix: {text: "£"}, suffix: {text: "per month"}, value: "60.00"}  ) }}

### Forecast spend

> ⚠️ This is a forecast of your spend based on historical data and current trends. It is not guaranteed and may not be accurate.

{{ govukInput({  label: {}, prefix: {text: "£"}, suffix: {text: "per hour"}, value: "1.00"}  ) }}
{{ govukInput({  label: {}, prefix: {text: "£"}, suffix: {text: "per day"}, value: "24.00"}  ) }}
{{ govukInput({  label: {}, prefix: {text: "£"}, suffix: {text: "per month"}, value: "60.00"}  ) }}

{% endcall %}

{{ govukButton({
  text: "PROVISION",
  isStartButton: true
}) }}

## What happens next?

After clicking **PROVISION**, your nominated security, financial and governance representatives will receive an email asking them to complete an attestation form.

You will receive an email with a link to download a zip of a git repository that you must deploy to your version control system. ==TODO: this could probably be made more slick, by providing a repo for them to fork, and collect the name they choose==

Once this attestation has been completed, your Amazon Connect instance will be provisioned within ==30 minutes==.

You will receive an email when the provision is complete, and you can can run the deployment from your version control system.

## What happens if I don't complete the attestation?

If you don't complete the attestation, your Amazon Connect instance will not be provisioned and you will not be able to use the service.

## What happens if I change my mind?

If you change your mind, you can delete your Amazon Connect instance by ...
