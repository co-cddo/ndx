# NDX Signup Operational Runbook

This runbook documents procedures for investigating signup activity, managing WAF rate limiting, and handling account management tasks.

**Story 3.3** - Epic 3: Operational Monitoring & Abuse Protection

## Quick Reference

| Resource | Location | Account |
|----------|----------|---------|
| Signup Lambda Logs | `/aws/lambda/ndx-signup` | ISB (955063685555) |
| WAF Logs | `aws-waf-logs-ndx-signup` | NDX (568672915267) |
| SNS Alerts Topic | `ndx-signup-alerts` | ISB (955063685555) |
| IAM Identity Center | SSO Console | ISB (955063685555) |

## 1. Investigating Signup Activity (FR22)

### Log Group Location

**Lambda Logs:**
- Account: ISB (955063685555)
- Region: eu-west-2
- Log Group: `/aws/lambda/ndx-signup`
- Retention: 90 days

**Console Link:**
```
https://eu-west-2.console.aws.amazon.com/cloudwatch/home?region=eu-west-2#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fndx-signup
```

### CloudWatch Insights Queries

#### Filter by Correlation ID

Every signup request includes a correlation ID for tracing. Use this to trace a specific request:

```
fields @timestamp, @message
| filter @message like /YOUR_CORRELATION_ID/
| sort @timestamp desc
| limit 100
```

#### Search by Email Domain

Find all signup attempts from a specific domain:

```
fields @timestamp, @message, @requestId
| filter @message like /example\.gov\.uk/
| sort @timestamp desc
| limit 100
```

#### Find Failed Signups

Identify signup failures by error code:

```
fields @timestamp, @message
| filter @message like /error/ or @message like /ERROR/
| filter @message like /signup/
| sort @timestamp desc
| limit 50
```

#### Daily Signup Summary

Count signups per day:

```
fields @timestamp, @message
| filter @message like /Account created successfully/
| stats count(*) as signups by bin(1d)
| sort @timestamp desc
```

## 2. WAF Investigation (FR23)

### WAF Log Group Location

**WAF Logs:**
- Account: NDX (568672915267)
- Region: us-east-1 (CloudFront region)
- Log Group: `aws-waf-logs-ndx-signup`
- Retention: 90 days

**Console Link:**
```
https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/aws-waf-logs-ndx-signup
```

### CloudWatch Insights Queries

#### Identify Rate-Limited IPs

Find IPs that have been blocked by rate limiting:

```
fields @timestamp, httpRequest.clientIp, action, ruleGroupList.0.terminatingRule.ruleId
| filter action = "BLOCK"
| stats count(*) as blocked_count by httpRequest.clientIp
| sort blocked_count desc
| limit 20
```

#### View Recent Blocks

See the most recent blocked requests:

```
fields @timestamp, httpRequest.clientIp, httpRequest.uri, action
| filter action = "BLOCK"
| sort @timestamp desc
| limit 50
```

#### Analyse Abuse Patterns

Find suspicious patterns (many requests from same IP):

```
fields @timestamp, httpRequest.clientIp, httpRequest.uri
| stats count(*) as request_count by httpRequest.clientIp
| filter request_count > 10
| sort request_count desc
```

### Associating WAF with CloudFront (Manual Step)

After deploying the NdxWaf stack to us-east-1:

1. Get the WebACL ARN from stack outputs:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name NdxWaf \
     --region us-east-1 \
     --query 'Stacks[0].Outputs[?OutputKey==`WebAclArn`].OutputValue' \
     --output text
   ```

2. Associate with CloudFront distribution:
   ```bash
   aws cloudfront update-distribution \
     --id E3THG4UHYDHVWP \
     --distribution-config <config-with-waf-arn>
   ```

   Or via AWS Console:
   - Open CloudFront console
   - Select distribution E3THG4UHYDHVWP
   - Click "Edit"
   - Under "AWS WAF web ACL", select `ndx-signup-rate-limit`
   - Save changes

### Adding IPs to Block List

To permanently block an abusive IP:

1. Open WAF console in us-east-1
2. Navigate to "IP sets"
3. Create IP set if needed: `ndx-blocked-ips`
4. Add the IP address (CIDR format, e.g., `1.2.3.4/32`)
5. Add rule to WebACL referencing the IP set

## 3. Account Management (FR24)

### Finding a User by Email

1. Open IAM Identity Center console:
   ```
   https://eu-west-2.console.aws.amazon.com/singlesignon/home?region=eu-west-2
   ```

2. Navigate to "Users"
3. Use search bar to find by email address
4. Note: Email is normalised (no `+` suffix)

### Deleting a User Account

**When to delete:**
- User requests account deletion
- Suspicious/fraudulent account
- Duplicate account

**Steps:**
1. Open IAM Identity Center console
2. Search for user by email
3. Select user → Actions → Delete user
4. Confirm deletion

**What happens:**
- User immediately loses access to all AWS accounts
- User data in IAM Identity Center is removed
- Associated group memberships are removed
- Sandbox leases remain in DynamoDB (for audit)

### Escalation Guidance

**Self-service (admin can handle):**
- Investigating signup logs
- Viewing WAF blocks
- Deleting individual suspicious accounts

**Escalate to security team:**
- Coordinated attack patterns (multiple IPs)
- Data breach concerns
- Unusual access patterns across multiple users
- Requests from law enforcement

**Escalate to platform team:**
- Infrastructure issues (Lambda errors)
- WAF rule changes
- CDK deployment issues

## 4. Slack Alerts

### Alert Configuration

Signup alerts are sent to Slack via AWS Chatbot:

- SNS Topic: `ndx-signup-alerts` (ISB account)
- EventBridge Rule: `ndx-signup-createuser-alert`
- Chatbot Channel: (configured separately)

### Adding SNS Topic to Chatbot

After CDK deployment:

1. Get SNS topic ARN from stack outputs
2. Open AWS Chatbot console in NDX account
3. Select configured Slack channel
4. Add SNS topic subscription with the ARN

### Alert Format

Each signup triggers an alert containing:
- User email address
- Domain
- Timestamp
- Event source (IAM Identity Center)

## 5. Related Documentation

- [Architecture: Signup Feature](../architecture.md#signup)
- [ADR-043: Lambda IAM Scoping](../adr/adr-043-lambda-iam-scoping.md)
- [Story 3.1: Slack Alerting](../_bmad-output/implementation-artifacts/3-1-slack-alerting-for-signups.md)
- [Story 3.2: WAF Rate Limiting](../_bmad-output/implementation-artifacts/3-2-waf-rate-limiting.md)

## 6. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-13 | Initial runbook created (Story 3.3) | Claude Opus 4.5 |
