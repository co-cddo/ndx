---
layout: post
title: Begin
includeInBreadcrumbs: true
eleventyNavigation:
  key: Begin
---

{% from "govuk/components/textarea/macro.njk" import govukTextarea %}
{% from "govuk/components/input/macro.njk" import govukInput %}
{% from "govuk/components/button/macro.njk" import govukButton %}

{{ govukInput({
  label: {
    text: "What role are you in?"
  },
  value: "Education Officer",
  disabled: true
}) }}

{{ govukInput({
  label: {
    text: "Who do you work for?"
  },
  value: "London Borough of Hackney",
  disabled: true
}) }}

{{ govukTextarea({
  name: "explain",
  label: {
    text: "Can you describe what you want to do, or the problem you want to solve?"
  },
  value: "I want to help children in schools within my council access the free school meals they are entitled to.",
  disabled: true
}) }}

{{ govukButton({
  text: "Next",
  href: "/begin/check-assumptions"
}) }}
