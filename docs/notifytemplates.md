# NDX GOV.UK Notify Email Templates

Copy these into GOV.UK Notify. Each template uses `((fieldName))` placeholders.

---

# LeaseRequested

**Subject:** Your NDX:Try AWS Session request has been received

**Body:**
```
Hi ((userName)),

Thank you for submitting your request for a [((templateName))](https://ndx.digital.cabinet-office.gov.uk/try/((leaseTemplateId))) NDX:Try session.

We've received your request and it's now in our queue for review. You'll receive another email once an administrator has reviewed your request - this usually happens within one working day.

**Request details:**
- Template: [((templateName))](https://ndx.digital.cabinet-office.gov.uk/try/((leaseTemplateId)))
- Submitted: ((requestTime))

While you wait, you might find it helpful to review our documentation on getting started with NDX:Try sessions.

If you have any questions about your request, or would like to provide feedback on the NDX:Try AWS Session service, please email us at ndx@dsit.gov.uk or reach out on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack.

Kind regards,
The National Digital Exchange Team, GDS
```

---

# LeaseApproved

**Subject:** Great news! Your NDX:Try AWS Session is ready to use

**Body:**
```
Hi ((userName)),

Excellent news - your [((templateName))](https://ndx.digital.cabinet-office.gov.uk/try/((leaseTemplateId))) NDX:Try session request has been approved and your environment is ready to use!

**Your session details:**
- AWS Account ID: ((accountId))
- Budget limit: ((budgetLimit))
- Expires: ((expiryDate))

**How to access your session:**
1. Visit the AWS SSO portal: ((ssoUrl))
2. Sign in with your government credentials
3. Select your NDX:Try account from the list

((portalLink))

**Important things to know:**
- Your session will automatically expire on the date shown above
- We'll send you reminders as you approach your budget limit or expiry date
- All resources will be cleaned up when your session ends, so remember to save any work you need to keep

Need more budget for your project? You can request an increase here:
((budgetActionLink))

If you have any questions or feedback about the NDX:Try AWS Session service, please email us at ndx@dsit.gov.uk or reach out on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack.

Happy experimenting!

Kind regards,
The National Digital Exchange Team, GDS

---
((linkInstructions))
((plainTextLink))
```

---

# LeaseDenied

**Subject:** Update on your NDX:Try AWS Session request

**Body:**
```
Hi ((userName)),

Thank you for your interest in the NDX:Try AWS Session. Unfortunately, we weren't able to approve your request for a [((templateName))](https://ndx.digital.cabinet-office.gov.uk/try/((leaseTemplateId))) NDX:Try session at this time.

**Reason:** ((reason))

**Reviewed by:** ((deniedBy))

**What you can do next:**
- If you believe this decision was made in error, please reply to this email with more details about your use case
- You can submit a new request at any time if your circumstances change
- Contact your line manager to discuss your NDX:Try session requirements

We know this isn't the news you were hoping for, and we're sorry we couldn't accommodate your request on this occasion.

If you have any questions or would like to discuss this further, please email us at ndx@dsit.gov.uk or reach out on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack.

Kind regards,
The National Digital Exchange Team, GDS

---
((linkInstructions))
((plainTextLink))
```

---

# LeaseTerminated

**Subject:** Your NDX:Try AWS Session has ended

**Body:**
```
Hi ((userName)),

Your NDX:Try AWS Session has now ended and your session has been terminated.

**Summary:**
- Account ID: ((accountId))
- Reason: ((reason))
- Final cost: ((finalCost))

All resources in your AWS account have been cleaned up as part of our standard process.

**Need another NDX:Try session?**
If you'd like to continue your work, you can request a new session at any time through the NDX:Try AWS Session portal. Your new request will go through the standard approval process.

((portalLink))

**Feedback welcome:**
We'd love to hear about your experience using the NDX:Try AWS Session. What worked well? What could we improve? Please share your thoughts with us at ndx@dsit.gov.uk or on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack.

Thank you for using the NDX:Try AWS Session!

Kind regards,
The National Digital Exchange Team, GDS

---
((linkInstructions))
((plainTextLink))
```

---

# LeaseBudgetThresholdAlert

**Subject:** Budget alert: Your NDX:Try session has used ((percentUsed)) of its budget

**Body:**
```
Hi ((userName)),

This is a friendly heads-up that your NDX:Try AWS Session is approaching its budget limit.

**Current status:**
- Spent so far: ((currentSpend))
- Budget limit: ((budgetLimit))
- Percentage used: ((percentUsed))

**What this means:**
Your session will continue to work normally, but if spending reaches 100% of your budget, your session will be terminated and all data will be lost.

**What you can do:**
1. **Save your work now** - Download any code, data, or configurations you need to keep
2. **Review your resources** - Check if there are any unused resources you can delete to reduce spend
3. **Request more budget** - If you need additional funds for your project, you can request an increase

((portalLink))

If you have any questions about managing your session budget, please email us at ndx@dsit.gov.uk or reach out on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack.

Kind regards,
The National Digital Exchange Team, GDS

---
((budgetDisclaimer))
```

---

# LeaseDurationThresholdAlert

**Subject:** Reminder: Your NDX:Try session expires in ((hoursRemaining)) hours

**Body:**
```
Hi ((userName)),

This is a friendly reminder that your NDX:Try AWS Session is expiring soon.

**Time remaining:** ((hoursRemaining)) hours
**Expires at:** ((expiryDate)) (((timezone)))

**What happens when your session expires:**
- Your session will be terminated and you'll lose access immediately
- All resources in your account will be permanently deleted
- Any data not saved elsewhere will be lost forever

**Before your session expires, please:**
1. **Save your work** - Download any code, data, or configurations you need to keep
2. **Document your findings** - Make notes about what you learned or built
3. **Clean up sensitive data** - Remove any test data or credentials

**Need more time?**
If you need to extend your NDX:Try session, please submit a new request through the portal. Requests are typically reviewed within one working day.

((portalLink))

Questions? Email us at ndx@dsit.gov.uk or reach out on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack.

Kind regards,
The National Digital Exchange Team, GDS
```

---

# LeaseFreezingThresholdAlert

**Subject:** Urgent: Your NDX:Try session will be terminated soon

**Body:**
```
Hi ((userName)),

This is an urgent notification that your NDX:Try AWS Session is about to be terminated.

**Reason:** ((reason))
**Termination time:** ((freezeTime))

**What does this mean?**
When your session is terminated, you will permanently lose access to AWS resources and all data will be deleted. This cannot be undone.

**What you should do right now:**
1. **Save any critical work immediately** - Download or commit any unsaved changes
2. **Export any data you need** - All data will be permanently lost
3. **Contact us if you need help** - We're here to assist

((portalLink))

If you believe this is happening in error, or you need assistance, please contact us immediately at ndx@dsit.gov.uk or on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack.

Kind regards,
The National Digital Exchange Team, GDS
```

---

# LeaseBudgetExceeded

**Subject:** Your NDX:Try session has been terminated - budget limit reached

**Body:**
```
Hi ((userName)),

Your NDX:Try AWS Session has been terminated because your spending exceeded the budget limit.

**Details:**
- Final spend: ((finalSpend))
- Budget limit: ((budgetLimit))

**What does this mean?**
Your session has been permanently terminated and all resources have been deleted. Any data not saved elsewhere has been lost.

**What happens next:**
1. **Request a new NDX:Try session** - You can request a new session at any time through the portal
2. **Plan your budget** - Consider requesting a higher budget limit for your next session

((portalLink))

**Need help?**
If you have questions about your spending or need assistance, please email us at ndx@dsit.gov.uk or reach out on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack - we're happy to help.

Kind regards,
The National Digital Exchange Team, GDS

---
((budgetDisclaimer))
```

---

# LeaseExpired

**Subject:** Your NDX:Try AWS Session has expired

**Body:**
```
Hi ((userName)),

Your NDX:Try AWS Session has now expired.

**Details:**
- Account ID: ((accountId))
- Expired at: ((expiryTime))

**What happens now:**
Your session environment will be cleaned up and all resources will be removed. This is part of our standard process to keep the platform running efficiently.

**Ready for another NDX:Try session?**
If you'd like to continue experimenting, you can request a new session at any time. Simply visit the portal and submit a new request - it's the same process as before.

((portalLink))

**We'd love your feedback:**
How was your NDX:Try AWS Session experience? Your feedback helps us improve the service for everyone. Please share your thoughts at ndx@dsit.gov.uk or on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack.

Thank you for using the NDX:Try AWS Session. We hope it was useful for your work!

Kind regards,
The National Digital Exchange Team, GDS
```

---

# LeaseFrozen

**Subject:** Your NDX:Try AWS Session has been terminated

**Body:**
```
Hi ((userName)),

Your NDX:Try AWS Session has been terminated.

**Details:**
- Account ID: ((accountId))
- Reason: ((reason))

**What does this mean?**
Your session has been permanently terminated and all resources have been deleted. Any data not saved elsewhere has been lost.

**What you can do next:**
((resumeInstructions))

**Ready for a new NDX:Try session?**
You can request a new session at any time through the portal. Your new request will go through the standard approval process.

((portalLink))

**Questions or concerns?**
If you're unsure why your session was terminated, or if you need help, please contact us at ndx@dsit.gov.uk or on the [#national-digital-exchange](https://ukgovernmentdigital.slack.com/archives/C075C8GTP7D) channel on Cross-Government Slack - we're here to help.

Kind regards,
The National Digital Exchange Team, GDS
```

---

# Slack Workflow Webhook Setup

Slack workflow webhooks receive notifications for ops alerts. The webhook sends a simple key-value payload that Slack Workflow Builder can use.

## 1. Create the Slack Workflow

1. Open Slack and go to **Automations** > **Workflow Builder**
2. Create a new workflow with trigger: **Webhook**
3. Copy the webhook URL (looks like `https://hooks.slack.com/workflows/TXXXXXX/AXXXXXX/XXXXXXXXX`)
4. Add variables for the fields you want to display:
   - `eventType` (text)
   - `eventId` (text)
   - `userEmail` (text)
   - `accountId` (text)
   - `reason` (text)
   - `timestamp` (text)
   - `allParams` (text) - JSON dump of all fields

## 2. Store the Webhook URL in Secrets Manager

```bash
aws secretsmanager update-secret \
  --secret-id /ndx/notifications/credentials \
  --secret-string '{
    "GOVUK_NOTIFY_API_KEY": "your-existing-notify-key",
    "SLACK_WEBHOOK_URL": "https://hooks.slack.com/workflows/YOUR/WORKFLOW/URL"
  }' \
  --profile NDX/InnovationSandboxHub
```

## 3. Webhook Payload Format

The Lambda sends this payload to your workflow:

```json
{
  "eventType": "AccountQuarantined",
  "eventId": "abc-123-def",
  "userEmail": "user@gov.uk",
  "accountId": "123456789012",
  "reason": "Policy violation detected",
  "timestamp": "2025-12-02T14:30:00Z",
  "allParams": "{ \"full\": \"event detail JSON\" }"
}
```

## 4. Ops Alert Event Types

These events trigger Slack notifications:

| Event Type | Description |
|------------|-------------|
| `AccountQuarantined` | Account isolated due to security concern |
| `AccountCleanupFailed` | Cleanup process failed, needs manual intervention |
| `AccountDriftDetected` | Configuration drift detected |
| `AccountFrozen` | Account frozen (budget/duration exceeded) |

---

# Available Personalisation Fields

All templates can use these enriched fields when available:

| Field | Description |
|-------|-------------|
| `((userName))` | User's name (from email prefix) |
| `((userEmail))` | Full email address |
| `((accountId))` | AWS account ID |
| `((maxSpend))` | Budget limit |
| `((leaseDurationInHours))` | Session duration |
| `((totalCostAccrued))` | Current spend |
| `((expirationDate))` | When session expires |
| `((keys))` | All available field names |
