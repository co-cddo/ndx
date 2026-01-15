---
layout: layouts/signup-page.njk
title: Create an account
permalink: /signup/
---

<h1 class="govuk-heading-xl">Create an account</h1>

<p class="govuk-body">Create an NDX account to try products before you buy.</p>

<div class="govuk-inset-text">
  <p class="govuk-body">
    This service is currently only available to local government organisations.
  </p>
  <p class="govuk-body">
    If you work in another area of the UK public sector and would like to use NDX,
    please email <a href="mailto:ndx@dsit.gov.uk" class="govuk-link">ndx@dsit.gov.uk</a>
    to register your interest. We'll let you know when the service opens to more organisations.
  </p>
</div>

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

  <!-- Email address with split input -->
  <div class="govuk-form-group" id="email-group">
    <label class="govuk-label" for="email-local">Email address</label>
    <div id="email-hint" class="govuk-hint">
      Enter your work email address
    </div>
    <p id="email-local-error" class="govuk-error-message" hidden>
      <span class="govuk-visually-hidden">Error:</span>
      <span class="error-text"></span>
    </p>
    <p id="email-domain-error" class="govuk-error-message" hidden>
      <span class="govuk-visually-hidden">Error:</span>
      <span class="error-text"></span>
    </p>
    <div class="ndx-email-input">
      <input class="govuk-input ndx-email-input__local" id="email-local" name="emailLocal" type="text" aria-describedby="email-hint">
      <span class="ndx-email-input__at" aria-hidden="true">@</span>
      <select class="govuk-select ndx-email-input__domain" id="email-domain" name="domain" aria-label="Organisation domain">
        <option value="">Select your organisation</option>
        <!-- Options populated by JavaScript -->
      </select>
    </div>
  </div>

  <!-- Domain not listed help text -->
  <div class="govuk-inset-text" id="domain-help">
    Domain not listed? <a href="mailto:ndx@dsit.gov.uk" class="govuk-link">Contact ndx@dsit.gov.uk</a> to request access.
  </div>

  <!-- Privacy policy link -->
  <p class="govuk-body-s">
    By continuing, you agree to our <a href="/privacy/" class="govuk-link">privacy policy</a>.
  </p>

  <!-- Submit button -->
  <button type="submit" class="govuk-button" data-module="govuk-button" id="submit-button">
    Continue
  </button>
</form>
