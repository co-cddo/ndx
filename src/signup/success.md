---
layout: layouts/signup-page.njk
title: Account created
permalink: /signup/success/
---

<div class="govuk-panel govuk-panel--confirmation">
  <h1 class="govuk-panel__title">Account created</h1>
  <div class="govuk-panel__body">
    Your account has been created successfully
  </div>
</div>

<h2 class="govuk-heading-m">Sign in to complete setup</h2>

<p class="govuk-body">To finish setting up your account, you need to sign in. When you do, you'll receive a verification code by email.</p>

<ol class="govuk-list govuk-list--number">
  <li>Click the button below to go to the sign in page</li>
  <li>Enter your email address</li>
  <li>Check your email for a verification code from AWS</li>
  <li>Enter the code to complete sign in</li>
</ol>

<a href="/api/auth/login" role="button" draggable="false" class="govuk-button govuk-button--start" data-module="govuk-button">
  Sign in now
  <svg class="govuk-button__start-icon" xmlns="http://www.w3.org/2000/svg" width="17.5" height="19" viewBox="0 0 33 40" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z" />
  </svg>
</a>

<div class="govuk-warning-text">
  <span class="govuk-warning-text__icon" aria-hidden="true">!</span>
  <strong class="govuk-warning-text__text">
    <span class="govuk-visually-hidden">Warning</span>
    Check your spam folder if you don't see the verification email within a few minutes.
  </strong>
</div>

<p class="govuk-body">
  <a href="/" class="govuk-link">Return to NDX homepage</a>
</p>
