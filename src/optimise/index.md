---
layout: product
title: Cloud Maturity Model and Assessment Tool
description: The Cloud Maturity Model and Assessment Tool helps organisations understand their current state of cloud maturity and identify areas for improvement.
image:
  src: https://cdn.jsdelivr.net/gh/co-cddo/cloudmaturity@main/src/assets/cloud_maturity_illustration.png
  alt: National Digital Exchange Mission Badge
startButton:
  text: Get Started
  href: https://co-cddo.github.io/cloudmaturity/assessment/
---

{% from "govuk/components/notification-banner/macro.njk" import govukNotificationBanner %}

{{ govukNotificationBanner({
  titleText: "Notice",
  html: "This content was dynamically pulled from <a href='https://github.com/co-cddo/cloudmaturity'>github.com/co-cddo/cloudmaturity/</a> and may not be up to date."
}) }}

{% remoteInclude "https://github.com/co-cddo/cloudmaturity/blob/main/README.md", "![Screenshot ", "## Contributions / _❤️ Pull Requests_" %}
