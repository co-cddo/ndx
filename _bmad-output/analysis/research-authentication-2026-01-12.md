# NDX Self-Serve Signup Authentication Research Report

**Date:** 2026-01-12
**Researcher:** Claude (Research Workflow)
**Context:** Technical and Domain research supporting brainstorming session on self-serve signup authentication

---

## Executive Summary

This research addresses the critical unknowns identified in the brainstorming session for NDX's self-serve signup using AWS IAM Identity Center. The findings provide concrete implementation guidance for:

1. **CloudFront → Lambda authentication** using Origin Access Control (OAC)
2. **CSRF protection** for serverless form submissions
3. **IAM Identity Center user creation** via Identity Store API
4. **Email normalization** to prevent alias abuse
5. **UK Government compliance** requirements

**Key Recommendation:** The proposed architecture is sound but requires specific security controls. Implement OAC with SigV4 signing, custom header validation for CSRF, email normalization (strip `+` suffix), and EventBridge alerting for user creation events.

---

## Part 1: Technical Research

### 1.1 CloudFront → Lambda Authentication (OAC)

**Research Question:** How should CloudFront authenticate to the Lambda Function URL? (Attack #26, #27 from brainstorming)

#### Recommended Approach: Origin Access Control (OAC)

AWS released OAC for Lambda Function URLs in April 2024. This is the recommended method for securing Lambda origins behind CloudFront.

**How OAC Works:**
- CloudFront signs all origin requests using AWS Signature Version 4 (SigV4)
- Lambda validates the signature, ensuring requests only come from your specific CloudFront distribution
- No direct public access to the Lambda Function URL

**Implementation Requirements:**

1. **Lambda Function URL Configuration:**
   ```
   AuthType: AWS_IAM  (required for OAC)
   ```

2. **Lambda Resource-Based Policy:**
   ```bash
   aws lambda add-permission \
     --statement-id "AllowCloudFrontServicePrincipal" \
     --action "lambda:InvokeFunctionUrl" \
     --principal "cloudfront.amazonaws.com" \
     --source-arn "arn:aws:cloudfront::955063685555:distribution/EDISTRIBUTIONID" \
     --function-name FUNCTION_NAME
   ```

3. **CloudFront OAC Configuration:**
   ```yaml
   Type: AWS::CloudFront::OriginAccessControl
   Properties:
     OriginAccessControlConfig:
       Name: ndx-signup-lambda-oac
       OriginAccessControlOriginType: lambda
       SigningBehavior: always
       SigningProtocol: sigv4
   ```

**Critical Note for POST Requests:**
> For PUT or POST methods, users must compute SHA256 of the body and include the payload hash in the `x-amz-content-sha256` header. Lambda doesn't support unsigned payloads.

This means the static form JavaScript must:
1. Compute SHA256 hash of the request body
2. Include it in the `x-amz-content-sha256` header
3. Use proper SigV4 signing if making requests directly

**Alternative Consideration:** If client-side SigV4 signing is too complex, consider using API Gateway as an intermediary, which handles signing automatically.

**Sources:**
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-lambda.html
- https://aws.amazon.com/blogs/networking-and-content-delivery/secure-your-lambda-function-urls-using-amazon-cloudfront-origin-access-control/

---

### 1.2 CSRF Protection for Serverless Forms

**Research Question:** How to protect against CSRF when a static form POSTs to Lambda? (Attacks #23-25 from brainstorming)

#### Multi-Layered CSRF Defense Strategy

Since there's no server-side session, use a combination of:

##### Layer 1: Custom Header Requirement
Require a custom header that browsers cannot set cross-origin:

```javascript
// Lambda validation
export const handler = async (event) => {
  const customHeader = event.headers['x-ndx-request'];

  if (!customHeader || customHeader !== 'signup-form') {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Invalid request origin' })
    };
  }
  // Continue processing
};
```

```javascript
// Client-side form submission
fetch(lambdaUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-NDX-Request': 'signup-form'  // Custom header
  },
  body: JSON.stringify({ email: userEmail })
});
```

##### Layer 2: Strict CORS Configuration
Configure Lambda Function URL CORS to only allow your exact origin:

```javascript
// Lambda CORS config
{
  "AllowOrigins": ["https://ndx.gov.uk"],  // NEVER use "*"
  "AllowMethods": ["POST"],
  "AllowHeaders": ["Content-Type", "X-NDX-Request"],
  "AllowCredentials": false
}
```

##### Layer 3: Request Timestamp Validation (Optional Enhancement)
Include a timestamp in requests and reject if too old:

```javascript
// Client includes timestamp
const timestamp = Date.now();
const body = { email, timestamp };

// Lambda validates
if (Date.now() - body.timestamp > 300000) { // 5 minutes
  return { statusCode: 400, body: 'Request expired' };
}
```

##### Layer 4: AWS WAF (Recommended)
Deploy AWS WAF in front of CloudFront with rules for:
- Rate limiting per IP
- Known malicious patterns
- Geographic restrictions (if appropriate)

**AWS Control Tower Reference:**
> [CT.LAMBDA.PR.6] Require an AWS Lambda function URL CORS policy to restrict access to specific origins

**Sources:**
- https://www.ranthebuilder.cloud/post/14-aws-lambda-security-best-practices-for-building-secure-serverless-applications
- https://docs.aws.amazon.com/controltower/latest/controlreference/lambda-rules.html

---

### 1.3 IAM Identity Center Programmatic User Creation

**Research Question:** What API should Lambda use to create users? What's the credential delivery flow? (Research items R4, R5 from brainstorming)

#### API Choice: Identity Store API (Not SCIM)

For self-service Lambda-based user creation, use the **Identity Store API** (`identitystore:CreateUser`), not SCIM.

**SCIM vs Identity Store API:**
| Aspect | SCIM | Identity Store API |
|--------|------|-------------------|
| Purpose | IdP synchronization | Direct programmatic access |
| Authentication | Bearer token (1-year expiry) | IAM credentials |
| Use case | External IdP provisioning | Self-service/automation |
| **Recommendation** | Not for Lambda | **Use this** |

#### CreateUser API Requirements

```javascript
// Required fields for IAM Identity Center
const params = {
  IdentityStoreId: 'd-xxxxxxxxxx',  // Your Identity Store ID
  UserName: email,                   // Must be unique
  DisplayName: `${givenName} ${familyName}`,
  Name: {
    GivenName: givenName,
    FamilyName: familyName
  },
  Emails: [{
    Value: email,
    Primary: true,
    Type: 'work'
  }]
};

// Only 1 email allowed per user (IAM IDC constraint)
```

#### Credential Delivery Flow

After `CreateUser` succeeds, the user exists but has no password. Two options:

**Option A: Email-Based Password Reset (Recommended)**
```javascript
// After creating user, programmatically trigger password reset
// This sends an email from AWS with reset instructions
// Note: This requires console action or additional API calls
```

The admin (or Lambda with appropriate permissions) can:
1. Send email with password reset link (automated by AWS)
2. Generate one-time password and share manually

**Option B: Generate One-Time Password**
Not recommended for self-service as it requires secure delivery channel.

**Recommended Flow for Self-Service:**
1. Lambda creates user via `identitystore:CreateUser`
2. Lambda triggers password reset via `sso-admin:ResetUserPassword` (if available) or admin notification
3. User receives email from AWS with password setup link
4. User sets password and accesses SSO portal

#### Lambda IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "identitystore:CreateUser",
        "identitystore:CreateGroupMembership",
        "identitystore:DescribeUser"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "identitystore:IdentityStoreId": "d-xxxxxxxxxx"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "sso-directory:CreateUser"
      ],
      "Resource": "*"
    }
  ]
}
```

**Critical Security Note:**
> Lambda's permissions should be tightly scoped. It should ONLY be able to:
> - Create users in the specific Identity Store
> - Add users to the specific `ndx_IsbUsersGroup`
> - NOT modify permission sets or create admin users

**Sources:**
- https://docs.aws.amazon.com/singlesignon/latest/IdentityStoreAPIReference/API_CreateUser.html
- https://docs.aws.amazon.com/singlesignon/latest/userguide/reset-password-for-user.html

---

### 1.4 Email Normalization Strategy

**Research Question:** How to prevent email alias abuse? (Attack #40 from brainstorming)

#### The Problem

Gmail and many providers support:
- **Plus addressing:** `john+tag@gmail.com` → delivered to `john@gmail.com`
- **Dot ignoring (Gmail only):** `j.o.h.n@gmail.com` → delivered to `john@gmail.com`

One person could create unlimited accounts with different aliases.

#### Normalization Algorithm

```javascript
function normalizeEmail(email) {
  const [localPart, domain] = email.toLowerCase().split('@');

  // Strip plus addressing for all domains
  const normalizedLocal = localPart.split('+')[0];

  // For Gmail/Googlemail, also strip dots
  const googleDomains = ['gmail.com', 'googlemail.com'];
  const finalLocal = googleDomains.includes(domain)
    ? normalizedLocal.replace(/\./g, '')
    : normalizedLocal;

  return `${finalLocal}@${domain}`;
}

// Examples:
// john.doe+signup@gmail.com → johndoe@gmail.com
// john+tag@example.gov.uk → john@example.gov.uk
```

#### Implementation Strategy

1. **Store both forms:**
   - `email_original`: What user entered (for SMTP delivery)
   - `email_normalized`: For uniqueness checking

2. **Check uniqueness on normalized form:**
   ```javascript
   // Before creating user
   const normalized = normalizeEmail(email);
   const exists = await checkExistingUser(normalized);
   if (exists) {
     return { error: 'An account with this email already exists' };
   }
   ```

3. **Use original for IAM Identity Center:**
   IAM IDC stores the original email for delivery purposes.

#### RFC 5321 Considerations

Per RFC 5321:
- Local-part is technically case-sensitive (but most servers ignore case)
- Domain is case-insensitive
- Best practice: Lowercase everything for comparison

**Sources:**
- RFC 5321 Section 2.3.11
- https://en.wikipedia.org/wiki/Email_address

---

### 1.5 Monitoring and Alerting (EventBridge)

**Research Question:** How to get alerts on user creation? (Admin Need A1, A3 from brainstorming)

#### EventBridge Integration for IAM Identity Center

IAM Identity Center events flow through CloudTrail to EventBridge:

```javascript
// EventBridge rule pattern for user creation
{
  "source": ["aws.sso-directory"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["sso-directory.amazonaws.com"],
    "eventName": ["CreateUser"]
  }
}
```

#### Recommended Alert Architecture

```
IAM Identity Center → CloudTrail → EventBridge → SNS/Chatbot → Slack
```

**EventBridge Rule (CloudFormation):**
```yaml
UserCreationAlertRule:
  Type: AWS::Events::Rule
  Properties:
    Name: ndx-user-creation-alert
    EventPattern:
      source:
        - aws.sso-directory
      detail-type:
        - "AWS API Call via CloudTrail"
      detail:
        eventSource:
          - sso-directory.amazonaws.com
        eventName:
          - CreateUser
    Targets:
      - Id: SlackNotification
        Arn: !Ref AlertSNSTopic
```

**AWS Chatbot for Slack:**
Configure AWS Chatbot to forward SNS notifications to your Slack channel for real-time alerting.

**Sources:**
- https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-sso-directory.html
- https://docs.aws.amazon.com/singlesignon/latest/userguide/eventbridge-integration.html

---

## Part 2: Domain Research

### 2.1 UK Government Authentication Standards

#### Digital Identity and Attributes Trust Framework (DIATF)

The UK government's framework for digital identity services sets minimum standards for:
- Data security
- User consent
- Identity verification processes

**Key Requirements:**
- Organizations must be independently certified
- Federated model (no centralized database)
- User control over data sharing

#### GOV.UK One Login

The government's single sign-on solution is being rolled out:

| Date | Milestone |
|------|-----------|
| October 2025 | Mandatory for Companies House WebFiling |
| November 2025 | Mandatory identity verification for directors/PSCs |
| End of 2027 | Full rollout across all government services |

**Technical Requirements:**
- OAuth Authorization Code Flow
- Identity request: `vtr=Cl.Cm.P2`
- JWT signing: ES256 or RS256
- Two-factor authentication (2FA) required

**Relevance to NDX:**
Consider future integration with GOV.UK One Login for:
- Government user authentication
- Reduced friction for gov.uk domain users
- Compliance alignment

**Sources:**
- https://www.gov.uk/government/collections/uk-digital-identity-and-attributes-trust-framework
- https://docs.sign-in.service.gov.uk/integrate-with-integration-environment/authenticate-your-user/

---

### 2.2 NCSC MFA Guidance (October 2024)

The National Cyber Security Centre updated MFA guidance with key recommendations:

#### Core Requirements

1. **Phishing-Resistant MFA:** Organizations should use MFA techniques that protect against social engineering
2. **Mandatory for Cloud Services:** If a cloud service offers MFA, it must be enabled
3. **Cyber Essentials 2026:** MFA mandatory or automatic assessment failure

#### Recommended MFA Types (Strongest to Weakest)

1. **FIDO2/WebAuthn** - Hardware security keys, passkeys (phishing-resistant)
2. **App-based TOTP** - Authenticator apps (e.g., Microsoft Authenticator, Google Authenticator)
3. **SMS/Voice OTP** - Weakest, vulnerable to SIM swapping

#### Implementation Guidance

- Minimize authentication friction (prompt only when necessary)
- Avoid MFA fatigue attacks
- Consider risk-based authentication

**Relevance to NDX:**
IAM Identity Center supports MFA. Consider:
- Enforcing MFA for all users in `ndx_IsbUsersGroup`
- Using app-based TOTP as minimum standard
- Future: FIDO2 support when available

**Sources:**
- https://www.ncsc.gov.uk/blog-post/not-all-types-mfa-created-equal
- https://www.ncsc.gov.uk/collection/mfa-for-your-corporate-online-services

---

### 2.3 AWS Security Best Practices for Self-Serve Signup

#### Lambda Security Checklist

| Practice | Implementation |
|----------|----------------|
| **Least Privilege** | Lambda only gets `identitystore:CreateUser`, `CreateGroupMembership` |
| **Resource-Based Policy** | Restrict invocation to specific CloudFront distribution |
| **Input Validation** | Validate email format, domain against allowlist |
| **Secrets Management** | Use Secrets Manager for any API keys |
| **Logging** | CloudTrail for all IAM IDC operations |
| **Rate Limiting** | WAF or application-level throttling |

#### Cross-Account Security

For CloudFront (568672915267) → Lambda (955063685555):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "cloudfront.amazonaws.com"
    },
    "Action": "lambda:InvokeFunctionUrl",
    "Resource": "arn:aws:lambda:us-west-2:955063685555:function:signup-lambda",
    "Condition": {
      "ArnLike": {
        "AWS:SourceArn": "arn:aws:cloudfront::568672915267:distribution/EXXXXXXXXX"
      }
    }
  }]
}
```

**Sources:**
- https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-cross-account.html
- https://aws.amazon.com/blogs/security/four-ways-to-grant-cross-account-access-in-aws/

---

## Part 3: Actionable Recommendations

### Priority Matrix (Updated from Brainstorming)

#### 🔴 MUST DO (Before Launch)

| # | Action | Technical Detail | Source |
|---|--------|------------------|--------|
| 1 | **Normalize emails** | Strip `+` suffix before uniqueness check | Section 1.4 |
| 2 | **CSRF protection** | Custom header `X-NDX-Request` + strict CORS | Section 1.2 |
| 3 | **EventBridge alerting** | Rule on `sso-directory:CreateUser` → Slack | Section 1.5 |
| 4 | **OAC for Lambda** | Configure CloudFront OAC with SigV4 signing | Section 1.1 |
| 5 | **AWS WAF** | Rate limiting, known attack patterns | Section 1.2 |
| 6 | **Lambda permissions audit** | Verify least privilege for identitystore | Section 1.3 |

#### 🟢 COULD DO (Future Enhancement)

| # | Action | Technical Detail | Source |
|---|--------|------------------|--------|
| 7 | **GOV.UK One Login integration** | OAuth OIDC for gov.uk users | Section 2.1 |
| 8 | **Anomaly detection** | CloudWatch Insights for signup patterns | Section 1.5 |
| 9 | **Self-expiring unverified accounts** | TTL-based cleanup | Brainstorming |

#### ✅ RESOLVED (No Action Needed)

| Item | Status |
|------|--------|
| **MFA enforcement** | Handled elsewhere |
| **Kill switch** | Existing kill switches sufficient |
| **Permission sets audit** | Confirmed working |
| **Credential delivery** | CreateUser API email setting enabled |

---

## Research Limitations & Follow-Up Needed

### Items Confirmed Resolved

- ~~Permission sets for ndx_IsbUsersGroup~~ - Confirmed working
- ~~Credential delivery automation~~ - CreateUser API email setting enabled
- ~~Client-side SigV4 signing~~ - Not needed; only SHA256 hash of body required (straightforward)

### Recommended Follow-Up Actions

1. **Audit current Lambda permissions** - Verify against least-privilege list in Section 1.3
2. **Review CORS configuration** - Confirm not using `*` wildcard
3. **Prototype email normalization** - Test edge cases with gov.uk domains
4. **Implement SHA256 body hash** - Add `x-amz-content-sha256` header to POST requests

---

## Appendix: Code Snippets

### A1: Email Normalization Function

```javascript
/**
 * Normalize email for uniqueness checking
 * Strips plus addressing and (for Gmail) dots
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email');
  }

  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');

  if (atIndex === -1) {
    throw new Error('Invalid email format');
  }

  let localPart = trimmed.substring(0, atIndex);
  const domain = trimmed.substring(atIndex + 1);

  // Strip plus addressing (universal)
  const plusIndex = localPart.indexOf('+');
  if (plusIndex !== -1) {
    localPart = localPart.substring(0, plusIndex);
  }

  // Strip dots for Gmail/Googlemail
  const googleDomains = ['gmail.com', 'googlemail.com'];
  if (googleDomains.includes(domain)) {
    localPart = localPart.replace(/\./g, '');
  }

  return `${localPart}@${domain}`;
}
```

### A2: Lambda CSRF Validation

```javascript
function validateRequest(event) {
  // Check custom header
  const customHeader = event.headers['x-ndx-request'];
  if (customHeader !== 'signup-form') {
    return { valid: false, error: 'Invalid request header' };
  }

  // Check origin
  const origin = event.headers['origin'];
  const allowedOrigins = ['https://ndx.gov.uk', 'https://www.ndx.gov.uk'];
  if (!allowedOrigins.includes(origin)) {
    return { valid: false, error: 'Invalid origin' };
  }

  return { valid: true };
}
```

### A3: SHA256 Body Hash for CloudFront OAC POST

```javascript
/**
 * Submit signup form with SHA256 body hash for CloudFront OAC
 * Required when POSTing through CloudFront to Lambda with OAC enabled
 */
async function submitSignup(email) {
  const body = JSON.stringify({ email });

  // Compute SHA256 hash of the body
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const response = await fetch('https://ndx.gov.uk/api/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-NDX-Request': 'signup-form',           // CSRF protection
      'x-amz-content-sha256': hashHex           // Required for OAC
    },
    body
  });

  return response.json();
}
```

### A4: EventBridge Rule (Terraform)

```hcl
resource "aws_cloudwatch_event_rule" "user_creation_alert" {
  name        = "ndx-user-creation-alert"
  description = "Alert on IAM Identity Center user creation"

  event_pattern = jsonencode({
    source      = ["aws.sso-directory"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventSource = ["sso-directory.amazonaws.com"]
      eventName   = ["CreateUser"]
    }
  })
}

resource "aws_cloudwatch_event_target" "sns" {
  rule      = aws_cloudwatch_event_rule.user_creation_alert.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.alerts.arn
}
```

---

**Report Generated:** 2026-01-12
**Research Workflow:** BMAD Technical + Domain Research
**MCP Servers Used:** AWS Documentation, AWS Knowledge, Perplexity, Context7, WebFetch
