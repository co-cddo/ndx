---
layout: page
title: Cookies on NDX
description: How NDX uses cookies and browser storage
---

# Cookies on NDX

Cookies are small files saved on your phone, tablet or computer when you visit a website. They store information about your visit, such as your preferences or whether you're signed in.

## Essential cookies

Essential cookies keep your information secure while you use NDX. We do not need to ask permission to use them.

| Cookie                 | Purpose                                                | Expiry  |
| ---------------------- | ------------------------------------------------------ | ------- |
| `__Host-isb_sso_token` | Stores your authentication token to keep you signed in | Session |
| `NDX`                  | Identifies which version of the site you're viewing    | Session |
| `ndx_cookies_policy`   | Stores your cookie consent preference                  | 1 year  |

## Browser storage

We also use browser storage (sessionStorage and localStorage) for the following purposes:

### sessionStorage

sessionStorage is cleared when you close your browser tab.

| Key                   | Purpose                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `auth-return-to`      | Remembers where to redirect you after signing in                         |
| `signup-welcome-back` | Shows a welcome message if you tried to sign up with an existing account |
| `aup-agreed`          | Records that you've accepted the acceptable use policy                   |

### localStorage

localStorage persists until you clear your browser data.

| Key              | Purpose                                                           |
| ---------------- | ----------------------------------------------------------------- |
| `ndx-auth-state` | Stores your authentication state to show sign in/sign out buttons |

## Analytics cookies (optional)

With your permission, we use Google Analytics to collect data about how you use NDX. This information helps us to improve our service.

Google Analytics stores information about:

- the pages you visit on NDX
- how long you spend on each page
- how you got to the site
- what you click on while you're visiting the site

We do not allow Google to use or share this data for their own purposes.

| Cookie           | Purpose                    | Expiry  |
| ---------------- | -------------------------- | ------- |
| `_ga`            | Distinguishes unique users | 2 years |
| `_ga_B5GRJRC7XC` | Maintains session state    | 2 years |

These cookies are only set if you accept analytics cookies.

## Change your cookie settings

<div class="govuk-inset-text" data-cookie-settings-status>
  <p class="govuk-body">You have not yet made a choice about analytics cookies.</p>
</div>

<div class="govuk-button-group" data-cookie-settings-buttons>
  <button type="button" class="govuk-button" data-cookie-settings-accept>
    Accept analytics cookies
  </button>
  <button type="button" class="govuk-button govuk-button--secondary" data-cookie-settings-reject>
    Reject analytics cookies
  </button>
</div>

<div class="govuk-notification-banner govuk-notification-banner--success" role="alert" aria-labelledby="govuk-notification-banner-title" data-cookie-settings-success hidden>
  <div class="govuk-notification-banner__header">
    <h2 class="govuk-notification-banner__title" id="govuk-notification-banner-title">
      Success
    </h2>
  </div>
  <div class="govuk-notification-banner__content">
    <p class="govuk-notification-banner__heading" data-cookie-settings-success-message>
      Your cookie preferences have been saved.
    </p>
  </div>
</div>

## Managing cookies in your browser

Most browsers let you control cookies through their settings. You can:

- See what cookies are stored
- Delete individual cookies
- Block all cookies from specific sites
- Block all third-party cookies
- Delete all cookies when you close your browser

However, if you block essential cookies, you won't be able to use NDX's authenticated features.

### How to manage cookies in popular browsers

- [Chrome](https://support.google.com/chrome/answer/95647)
- [Firefox](https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox)
- [Safari](https://support.apple.com/en-gb/guide/safari/sfri11471/mac)
- [Edge](https://support.microsoft.com/en-gb/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09)

## More information

For more details about how we handle your data, read our [privacy notice](/privacy/).

If you have any questions about cookies on NDX, contact us at [ndx@dsit.gov.uk](mailto:ndx@dsit.gov.uk).
