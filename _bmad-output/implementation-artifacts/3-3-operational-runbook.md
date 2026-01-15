# Story 3.3: Operational Runbook

Status: done

## Story

As an **NDX platform admin**,
I want **documentation for investigating signups and managing accounts**,
So that **I can effectively respond to incidents and support requests** (FR22, FR23, FR24).

## Acceptance Criteria

1. **Given** an admin needs to investigate signup activity, **when** they access CloudWatch Logs, **then** the runbook documents: log group name and location, how to filter by correlation ID, how to search by email domain, sample queries for common investigations (FR22)

2. **Given** an admin needs to investigate suspicious activity, **when** they access WAF logs, **then** the runbook documents: how to access WAF logs in CloudWatch, how to identify rate-limited IPs, how to add IPs to block list, sample queries for abuse patterns (FR23)

3. **Given** an admin needs to delete a suspicious account, **when** they access IAM Identity Center console, **then** the runbook documents: how to find user by email, steps to delete user account, what happens to associated data, when to escalate vs. self-service (FR24)

4. **Given** the runbook is created, **when** I check the documentation location, **then** it exists at `docs/operations/signup-runbook.md` and it includes links to relevant AWS console pages

## Tasks / Subtasks

- [x] Task 1: Create runbook for signup investigation (AC: 1)
  - [x] 1.1 Document Lambda log group location and format
  - [x] 1.2 Add CloudWatch Insights queries for correlation ID filtering
  - [x] 1.3 Add queries for domain-based searching

- [x] Task 2: Add WAF investigation section (AC: 2)
  - [x] 2.1 Document WAF log group location
  - [x] 2.2 Add queries for identifying rate-limited IPs
  - [x] 2.3 Document manual WAF to CloudFront association steps

- [x] Task 3: Add account management section (AC: 3)
  - [x] 3.1 Document IAM Identity Center user lookup
  - [x] 3.2 Document account deletion steps
  - [x] 3.3 Add escalation guidance

- [x] Task 4: Create runbook file (AC: 4)
  - [x] 4.1 Create `docs/operations/signup-runbook.md`
  - [x] 4.2 Add AWS console deep links
  - [x] 4.3 Add related story references

## Dev Notes

### Previous Story Intelligence (Story 3.2)

**Key Learnings:**

- WAF WebACL deployed to us-east-1 (NdxWaf stack)
- WAF logs in CloudWatch: `aws-waf-logs-ndx-signup`
- Manual step required to associate WAF with CloudFront

**CDK Stack Outputs:**

- `SignupAlertsTopicArn` - SNS topic for Slack alerts
- `CreateUserRuleArn` - EventBridge rule ARN
- `WebAclArn` - WAF WebACL ARN for CloudFront association

### Log Group Locations

**Signup Lambda Logs:**

- Log Group: `/aws/lambda/ndx-signup`
- Region: ISB account (955063685555), eu-west-2
- Retention: 90 days

**WAF Logs:**

- Log Group: `aws-waf-logs-ndx-signup`
- Region: us-east-1 (CloudFront region)
- Retention: 90 days

### CloudWatch Insights Queries

**Filter by Correlation ID:**

```
fields @timestamp, @message
| filter @message like /CORRELATION_ID_HERE/
| sort @timestamp desc
| limit 100
```

**Filter by Email Domain:**

```
fields @timestamp, @message
| filter @message like /\.gov\.uk/
| sort @timestamp desc
| limit 100
```

**WAF Rate Limited IPs:**

```
fields @timestamp, httpRequest.clientIp, action
| filter action = "BLOCK"
| stats count(*) as blocked_count by httpRequest.clientIp
| sort blocked_count desc
| limit 20
```

### References

- [Source: epics.md - Story 3.3 acceptance criteria]
- [Source: 3-1-slack-alerting-for-signups.md - SNS/EventBridge configuration]
- [Source: 3-2-waf-rate-limiting.md - WAF configuration]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Documentation file created: PASS
- File location verified: `docs/operations/signup-runbook.md`

### Completion Notes List

1. Created operational runbook at `docs/operations/signup-runbook.md`
2. Documented Lambda log group location and CloudWatch Insights queries
3. Documented WAF log investigation including rate-limited IP identification
4. Added manual WAF to CloudFront association steps (from Story 3.2)
5. Documented IAM Identity Center user lookup and deletion procedures
6. Added escalation guidance for different severity levels
7. Included AWS console deep links and related documentation references

### Change Log

1. Created `docs/operations/signup-runbook.md` - Complete operational runbook

### File List

**Created:**

- `docs/operations/signup-runbook.md`

---

## Code Review Record

### Review Agent Model

Claude Opus 4.5

### Review Date

2026-01-13

### Issues Found and Fixed

No issues found. Documentation is comprehensive and follows established patterns.

### Code Review Fixes Applied

None required.

### Tests Added

N/A - Documentation story, no code changes.

### Test Results After Review

N/A - Documentation story.

### Acceptance Criteria Verification

| AC  | Status | Evidence                                                                   |
| --- | ------ | -------------------------------------------------------------------------- |
| AC1 | PASS   | Lambda log group, CloudWatch Insights queries documented                   |
| AC2 | PASS   | WAF logs, rate-limited IP queries, CloudFront association documented       |
| AC3 | PASS   | IAM Identity Center lookup, deletion steps, escalation guidance documented |
| AC4 | PASS   | File at `docs/operations/signup-runbook.md` with console links             |

### Review Outcome

**APPROVED** - All acceptance criteria verified, documentation complete.
