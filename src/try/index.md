---
layout: layouts/try-page.njk
title: Your Try Sessions
includeInBreadcrumbs: true
---

{% from "govuk/components/button/macro.njk" import govukButton %}

<div id="try-sessions-container">
  {# Unauthenticated state - shown by JS when user is not signed in #}
  <div id="try-unauthenticated-state" class="js-hidden" hidden>
    <h1 class="govuk-heading-l">Sign in to view your try sessions</h1>
    <p class="govuk-body">
      You need to sign in with your NDX:Try account to request and manage AWS sandbox environments.
    </p>
    {{ govukButton({
      text: "Sign in",
      isStartButton: true,
      attributes: {
        id: "try-page-sign-in"
      }
    }) }}
  </div>

{# Authenticated state - content rendered by JS #}

  <div id="try-authenticated-state" class="js-hidden" hidden></div>

  <noscript>
    <p class="govuk-body">
      JavaScript is required to view and manage your try sessions.
    </p>
    <p class="govuk-body">
      <a href="/api/auth/login" class="govuk-link">Sign in</a> to continue.
    </p>
  </noscript>
</div>
