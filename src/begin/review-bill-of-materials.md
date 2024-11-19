---
layout: page
title: Review bill of materials
includeInBreadcrumbs: true
---

{% from "govuk/components/button/macro.njk" import govukButton %}

{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}

To effectively implement a system ensuring that children in the London Borough of Hackney have access to their entitled free school meals, the following components are essential:

{{ govukCheckboxes({
  fieldset: {
    legend: {
      text: "1. Data Sources",
      classes: "govuk-fieldset__legend--m"
    }
  },
  items: [
    {
      text: "<strong>Department for Education (DfE):</strong> Provides data on school enrollments, pupil demographics, and free school meal eligibility.",
      checked: true
    },
    {
      text: "<strong>Department for Work and Pensions (DWP):</strong> Offers information on household incomes and benefits, aiding in identifying eligible families.",
      checked: true
    },
    {
      text: "<strong>Catering Supplier Data:</strong> Fictional supplier 'NutriServe Ltd.' supplies menus, nutritional information, and meal delivery schedules.",
      checked: true
    }
  ]
}) }}

{{ govukCheckboxes({
  fieldset: {
    legend: {
      text: "2. Digital Platforms and Tools",
      classes: "govuk-fieldset__legend--m"
    }
  },
  items: [
    {
      text: "<strong>Gov.uk Forms:</strong> Utilized for creating and managing online forms to collect dietary requirements and consent from parents.",
      checked: true
    },
    {
      text: "<strong>Gov.uk Notify:</strong> Employed to send notifications and reminders to parents and guardians regarding form submissions and updates.",
      checked: true
    },
    {
      text: "<strong>Low-Code Platform:</strong> Fictional provider 'QuickBuild Solutions' offers a platform to develop applications for data integration, workflow automation, and reporting without extensive coding.",
      checked: true
    }
  ]
}) }}

{{ govukCheckboxes({
  fieldset: {
    legend: {
      text: "3. Communication and Support Services",
      classes: "govuk-fieldset__legend--m"
    }
  },
  items: [
    {
      text: "<strong>Call Centre Provider:</strong> Fictional service 'HelpConnect Services' manages inbound and outbound communications with parents, addressing inquiries and assisting with form completion.",
      checked: true
    }
  ]
}) }}

{{ govukCheckboxes({
  fieldset: {
    legend: {
      text: "4. Integration and Workflow Components",
      classes: "govuk-fieldset__legend--m"
    }
  },
  items: [
    {
      text: "<strong>Data Integration Tools:</strong> Facilitate the merging of datasets from DfE, DWP, and NutriServe Ltd. to create comprehensive profiles for meal planning.",
      checked: true
    },
    {
      text: "<strong>Workflow Automation:</strong> Automates processes such as data validation, notification dispatch, and report generation to enhance efficiency.",
      checked: true
    },
    {
      text: "<strong>Reporting and Analytics:</strong> Generates insights on meal uptake, dietary needs, and program effectiveness to inform decision-making.",
      checked: true
    }
  ]
}) }}

{{ govukCheckboxes({
  fieldset: {
    legend: {
      text: "5. Security and Compliance",
      classes: "govuk-fieldset__legend--m"
    }
  },
  items: [
    {
      text: "<strong>Data Protection Measures:</strong> Ensure compliance with data protection regulations, safeguarding sensitive information.",
      checked: true
    },
    {
      text: "<strong>User Authentication:</strong> Secure access controls for staff, parents, and partners interacting with the system.",
      checked: true
    }
  ]
}) }}
{{ govukCheckboxes({
  fieldset: {
    legend: {
      text: "6. Training and Support",
      classes: "govuk-fieldset__legend--m"
    }
  },
  items: [
    {
      text: "<strong>Staff Training Programs:</strong> Educate school staff and administrators on using the new system and understanding data privacy protocols.",
      checked: true
    },
    {
      text: "<strong>Parent Support Resources:</strong> Provide guides and assistance to help parents navigate the online forms and communication channels.",
      checked: true
    }
  ]
}) }}

By integrating these components, the initiative aims to create a seamless, efficient, and user-friendly system that ensures all eligible children receive their entitled free school meals, while maintaining high standards of data security and user support.

{{ govukButton({
  text: "Get access to all of these",
  href: "/begin/get-access"
}) }}

### What happens next?

You will get immediate access to try all the above services, with 'synthetic' and the environments will expire after 48 hours.
You can use this to evaluate the products, and develop and understand the operational costs fully.

When you're ready, you can [request access to the live environment](/begin/get-access) which will provision the production services you need and where relevant (usually for data that includes Personally Identifiable Information) walk you through the establishing your legal basis for access, and any other license terms you are required to accept.
