---
layout: layouts/signup-page.njk
title: Create an account
permalink: /signup/
---

<h1 class="govuk-heading-xl">Create an account</h1>

<p class="govuk-body">Create an NDX account to try products before you buy.</p>

<!-- Error summary (hidden by default, shown by JavaScript on validation errors) -->
<div class="govuk-error-summary" data-module="govuk-error-summary" id="error-summary" hidden tabindex="-1">
  <div role="alert">
    <h2 class="govuk-error-summary__title">There is a problem</h2>
    <div class="govuk-error-summary__body">
      <ul class="govuk-list govuk-error-summary__list" id="error-summary-list">
        <!-- Error links populated by JavaScript -->
      </ul>
    </div>
  </div>
</div>

<form id="signup-form" novalidate>
  <!-- First name -->
  <div class="govuk-form-group" id="first-name-group">
    <label class="govuk-label" for="first-name">First name</label>
    <p id="first-name-error" class="govuk-error-message" hidden>
      <span class="govuk-visually-hidden">Error:</span>
      <span class="error-text"></span>
    </p>
    <input class="govuk-input" id="first-name" name="firstName" type="text" autocomplete="given-name">
  </div>

  <!-- Last name -->
  <div class="govuk-form-group" id="last-name-group">
    <label class="govuk-label" for="last-name">Last name</label>
    <p id="last-name-error" class="govuk-error-message" hidden>
      <span class="govuk-visually-hidden">Error:</span>
      <span class="error-text"></span>
    </p>
    <input class="govuk-input" id="last-name" name="lastName" type="text" autocomplete="family-name">
  </div>

  <!-- Email address (single field) -->
  <div class="govuk-form-group" id="email-group">
    <label class="govuk-label" for="email">Email address</label>
    <div id="email-hint" class="govuk-hint">
      Enter your work email address
    </div>
    <p id="email-error" class="govuk-error-message" hidden>
      <span class="govuk-visually-hidden">Error:</span>
      <span class="error-text"></span>
    </p>
    <input class="govuk-input" id="email" name="email" type="email" autocomplete="email" aria-describedby="email-hint email-status">
    <div id="email-status" role="status" aria-live="polite" class="govuk-hint"></div>
  </div>

  <!-- Privacy policy link -->
  <p class="govuk-body-s">
    By continuing, you agree to our <a href="/privacy/" class="govuk-link">privacy policy</a>.
  </p>

  <div class="govuk-inset-text">
    <p class="govuk-body">
      After creating your account, you'll be taken to a sign-in page.
      Your username is your email address.
    </p>
    <p class="govuk-body">
      The sign-in page is a temporary step while we work on a more seamless experience.
    </p>
  </div>

  <!-- Submit button -->
  <button type="submit" class="govuk-button" data-module="govuk-button" id="submit-button">
    Continue
  </button>
</form>
