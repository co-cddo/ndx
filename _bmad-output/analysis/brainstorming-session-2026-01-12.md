---
stepsCompleted: [1, 2]
inputDocuments: ["_bmad-output/planning-artifacts/bmm-workflow-status.yaml"]
session_topic: "Self-serve signup authentication for NDX using AWS IAM Identity Center"
session_goals: "Comprehensive exploration to confidently build a secure solution"
selected_approach: "ai-recommended"
techniques_used: ["reverse-brainstorming", "role-playing", "six-thinking-hats", "first-principles-thinking"]
ideas_generated: []
context_file: "_bmad-output/planning-artifacts/bmm-workflow-status.yaml"
security_posture: "adversarial"
---

# Brainstorming Session Results

**Facilitator:** Cns
**Date:** 2026-01-12

---

## Session Overview

**Topic:** Self-serve signup authentication for NDX using AWS IAM Identity Center

**Goals:** Comprehensive exploration covering UX, security, architecture, user messaging, and edge cases to confidently build a secure solution.

**Security Posture:** Adversarial - assume attackers will probe this system

### Context Summary

- Static signup form with email validation and domain dropdown
- Lambda for user creation in account 955063685555
- IAM Identity Center in us-west-2 (ssoins-79078bb87a820e72)
- Target group: ndx_IsbUsersGroup (a8412370-2051-702a-84d1-6688eeee30fa)
- Domain validation from GitHub JSON (local_authority filter)
- Cross-account CloudFront routing (568672915267 -> 955063685555)
- Interim auth solution with clear user messaging
- Security-critical: adversarial security posture required

---

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Security-critical self-serve signup with comprehensive coverage goals

**Recommended Technique Sequence:**

1. **Reverse Brainstorming** - Adversarial attack surface mapping
2. **Role Playing** - Stakeholder perspectives (Attacker, User, Admin, Auditor)
3. **Six Thinking Hats** - Systematic coverage of all angles
4. **First Principles Thinking** - Ground truth rebuild (optional)

**AI Rationale:** Security-first approach starts with adversarial thinking to map attack vectors, expands through stakeholder lenses, then systematically covers all perspectives. This sequence ensures nothing is overlooked while maintaining security as the primary lens.

---

## Phase 1: Reverse Brainstorming (Adversarial Attack Mapping)

**Technique:** Generate problems instead of solutions to identify hidden vulnerabilities
**Goal:** Map the complete attack surface - every way this signup could be abused

### Attack Vectors & Vulnerabilities

#### Supply Chain & Detection (Attacks 1-13)

| #   | Attack                        | Core Insight                       |
| --- | ----------------------------- | ---------------------------------- |
| 1   | GitHub JSON Poisoning         | External trust boundary            |
| 2   | Unicode/Homoglyph             | String validation bypass           |
| 3   | API Rate Limit DoS            | Force fail-open/closed             |
| 4   | GitHub Outage Handling        | Availability vs security           |
| 5   | Stale Cache Exploitation      | Poison-then-revert                 |
| 6   | TTL Race Window               | Brief compromise, lasting cache    |
| 7   | Cache Stampede                | Race conditions at refresh         |
| 8   | Detection Blindness           | No poison-detection audit          |
| 9   | Cleanup Complexity            | Volume as amplifier                |
| 10  | Legitimate Domain, Rogue User | Human is the vulnerability         |
| 11  | Silent Account Accumulation   | No sandbox = no Slack notification |
| 12  | Notification Flood            | Hide in noise                      |
| 13  | Timing Attack                 | 3am Friday exploit                 |

**Key Architecture Decisions:**

- Runtime fetch with caching TTL
- Accept that compromise requires manual cleanup
- Slack notifications for sandbox requests (not account creation)

#### Form & Lambda (Attacks 14-25)

| #   | Attack                        | Surface                                 |
| --- | ----------------------------- | --------------------------------------- |
| 14  | Client-side bypass            | Form                                    |
| 15  | ~~Email ≠ Domain mismatch~~   | Mitigated (single email string)         |
| 16  | Email format exploits         | Lambda validation                       |
| 17  | Lambda input injection        | Lambda                                  |
| 18  | Domain list enumeration       | GET endpoint (accepted - public domain) |
| 19  | Regex/parser bypass           | Lambda validation                       |
| 20  | Direct POST scripting → CSRF  | Lambda                                  |
| 21  | Timing oracle                 | Accepted - public domain                |
| 22  | Account enumeration           | Accepted as risk                        |
| 23  | CSRF on Signup POST           | Form → Lambda                           |
| 24  | CSRF + Account Takeover Setup | Credential race                         |
| 25  | CORS Misconfiguration         | Lambda                                  |

**Research Needed:** CSRF/CORS protection strategy for static form → Lambda

#### Cross-Account Routing (Attacks 26-31)

| #   | Attack                                | Surface                        |
| --- | ------------------------------------- | ------------------------------ |
| 26  | Lambda resource policy overpermission | Trust boundary                 |
| 27  | Origin confusion via path tricks      | CloudFront routing             |
| 28  | Request smuggling                     | HTTP parsing desync            |
| 29  | Cache poisoning                       | CloudFront cache               |
| 30  | ~~Confused deputy headers~~           | No header-based decisions      |
| 31  | Cross-account role scope              | Confirmed: invoke/routing only |

**Research Needed:** CloudFront → Lambda auth best practices (OAC vs Function URL vs API Gateway)

#### IAM Identity Center (Attacks 32-39)

| #   | Attack                        | Surface              |
| --- | ----------------------------- | -------------------- |
| 32  | Permission set overpermission | Group permissions    |
| 33  | Blast radius - multi-account  | Account scope        |
| 34  | Self-escalation               | User self-service    |
| 35  | MFA enforcement gap           | Credential lifecycle |
| 36  | Password/credential flow      | Initial access       |
| 37  | Session hijacking             | SSO sessions         |
| 38  | Orphaned account persistence  | Deprovisioning       |
| 39  | Lambda permission creep       | Privileged identity  |

**Critical Unknowns:**

- Permission sets attached to ndx_IsbUsersGroup
- Credential delivery flow (email link? temp password?)
- Lambda's exact IAM permissions

---

## Phase 2: Role Playing (Stakeholder Perspectives)

**Technique:** Generate insights from multiple stakeholder viewpoints
**Goal:** Comprehensive requirements and edge cases from each perspective

### Attacker Persona (Recap)

**Top 3 Priority Attacks:**

1. #40 Email Alias Abuse - trivial, no detection, multiplies access
2. #34 Self-Escalation - already inside, explore what's possible
3. #26 Lambda Resource Policy - if overpermissioned, bypasses entire frontend

**New Attack Identified:**
| # | Attack | Core Insight |
|---|--------|--------------|
| 40 | Email Alias Abuse (+addressing) | One human, many identities via john+tag@gov.uk |

### Legitimate User Persona

| #   | Need                                   | Notes                             |
| --- | -------------------------------------- | --------------------------------- |
| U1  | Clear journey from press → signup      | Navigation, findability           |
| U2  | Understand interim nature (or hide it) | User messaging clarity            |
| U3  | Post-signup clarity                    | Confirmation, email, next steps   |
| U4  | User-friendly error messages           | "Email us" fallback               |
| U5  | Accessibility compliance               | ARIA, keyboard, mobile            |
| U6  | Transparency on data/terms             | Privacy, what they're agreeing to |

### System Admin Persona

| #   | Need                           | Notes                               |
| --- | ------------------------------ | ----------------------------------- |
| A1  | Observability/dashboards       | Signup volume, errors, cache status |
| A2  | Incident response capabilities | Investigate, trace, disable         |
| A3  | Kill switches                  | Fast emergency actions              |
| A4  | Audit trail                    | Complete, tamper-evident logs       |
| A5  | Maintenance operations         | Day-to-day admin tasks              |
| A6  | Runbooks                       | Documented procedures               |

**Action Item:** Set up AWS Chatbot for IAM Identity Center user creation events → Slack

### Security Auditor Persona

| #   | Area              | Key Evidence Gap           |
| --- | ----------------- | -------------------------- |
| AU1 | Auth/Authz        | Domain list change control |
| AU2 | Data Protection   | PII inventory, GDPR basis  |
| AU3 | Logging           | Tamper-evidence, retention |
| AU4 | Access Control    | Separation of duties       |
| AU5 | Vuln Management   | Pentest, SAST evidence     |
| AU6 | Incident Response | IRP documentation          |
| AU7 | Third-Party Risk  | Formal risk acceptance     |

**Predicted Audit Findings:**

- No email alias deduplication (Medium)
- Account creation not alerted until AWS Chatbot (Medium)
- CSRF protection unclear (High)
- CloudFront → Lambda auth not documented (Medium)
- IAM Identity Center permission sets not reviewed (Medium)

---

## Phase 3: Six Thinking Hats (Systematic Coverage)

**Technique:** Explore through six distinct perspectives without conflict
**Goal:** Ensure nothing overlooked - every angle explored with disciplined completeness

### 🎩 White Hat (Facts)

**Known Facts:**

- Static signup form with email input and domain dropdown
- Lambda GET provides domain list, POST accepts email string
- Runtime fetch of GitHub JSON with caching TTL
- User created in IAM Identity Center (ssoins-79078bb87a820e72)
- Target group: ndx_IsbUsersGroup (a8412370-2051-702a-84d1-6688eeee30fa)
- IAM IDC in account 955063685555, us-west-2
- CloudFront in account 568672915267
- Domain validation uses `local_authority` filter from GitHub JSON
- This is an interim auth solution
- Security posture: adversarial

**Known Unknowns:**

- Permission sets attached to ndx_IsbUsersGroup
- Credential delivery flow after account creation
- Lambda's exact IAM permissions
- CORS configuration on Lambda
- CloudFront → Lambda auth method
- Email validation logic in Lambda
- Email alias (+addressing) handling
- Cache TTL value

### ❤️ Red Hat (Feelings)

| Stakeholder | Dominant Feeling                                         |
| ----------- | -------------------------------------------------------- |
| User        | Trust (gov.uk domain) but anxious post-submit            |
| Admin       | Nervous about visibility gaps                            |
| Security    | **Fear of rapid, cascading failures outpacing response** |

**Core Intuition:** System needs to fail gracefully and slowly, not catastrophically and fast

### ☀️ Yellow Hat (Benefits)

**Self-Serve Value:**

- Removes friction for government users
- Self-service scale without manual admin
- Democratizes access for small local authorities
- Speed to value in minutes

**Architecture Value:**

- Automated domain validation
- Serverless (no servers to patch)
- Clean separation of concerns
- Leverages existing IAM Identity Center
- Version-controlled domain list
- gov.uk domain trust

**Interim Value:**

- Ship faster, learn from real usage
- Iterate based on evidence
- Clear scope boundaries

### ⚫ Black Hat (Risks)

**Top Security Risks:**

1. Email alias abuse - many accounts per person (High likelihood, Medium impact)
2. CSRF on signup (Medium likelihood, Medium impact)
3. Rapid exploitation outpacing response (Low likelihood, High impact)
4. GitHub JSON poisoning (Low likelihood, High impact)
5. Lambda overpermission (Unknown likelihood, High impact)

**Operational Risks:**

- GitHub outage affecting signups
- Cross-account debugging complexity
- "Interim" becoming permanent

**Reputational Risks:**

- Government breach headlines
- User data exposure
- Service unavailability

### 🌿 Green Hat (Creative Solutions)

**Email Alias Mitigation:**

- Normalize before storing (strip `+` and dots)
- Alert on same base email with different aliases

**Rate/Speed Control:**

- Max 10 signups per domain per hour
- Circuit breaker pattern - auto-disable after X failures
- One-click pause via Lambda env var
- Artificial 2-second delay to slow attackers

**CSRF Mitigation:**

- Custom header requirement (`X-NDX-Request: true`)
- Strict CORS (only allow exact origin)

**Detection Improvements:**

- Anomaly baseline on signup patterns
- First-seen domain alert
- Daily signup digest
- Signup → Sandbox correlation (alert if no sandbox after 7 days)

**Cleanup Improvements:**

- Self-expiring unverified accounts (48 hours)
- Email verification required before active
- Batch cleanup script
- Tagging at creation for filtering

### 🔵 Blue Hat (Meta)

**Biggest Insights:**

1. Email alias abuse is trivial and unmitigated
2. Account creation has no alerting (until AWS Chatbot)
3. "Things going wrong in a hurry" is the core fear
4. CSRF protection status unknown
5. Multiple critical unknowns about IAM IDC config
6. Manual cleanup assumes detection we don't have

---

## Session Summary & Organization

### Session Statistics

| Metric                           | Value                                                      |
| -------------------------------- | ---------------------------------------------------------- |
| **Techniques Used**              | 3 (Reverse Brainstorming, Role Playing, Six Thinking Hats) |
| **Attack Vectors Identified**    | 40                                                         |
| **User Needs Captured**          | 6                                                          |
| **Admin Needs Captured**         | 6                                                          |
| **Audit Areas Identified**       | 7                                                          |
| **Creative Solutions Generated** | 25+                                                        |
| **Research Items Flagged**       | 5                                                          |

### Prioritized Action Plan

#### 🔴 MUST DO (Before Launch)

| #   | Action                                                          | Addresses                 |
| --- | --------------------------------------------------------------- | ------------------------- |
| 1   | **Normalize emails** - strip `+` suffix before uniqueness check | Attack #40                |
| 2   | **CSRF protection** - custom header requirement OR strict CORS  | Attacks #23-25            |
| 3   | **AWS Chatbot alerting** - notify on every account creation     | Attack #11, Admin Need A1 |

#### 🟡 SHOULD DO (Risk Reduction)

| #   | Action                                                          | Addresses                |
| --- | --------------------------------------------------------------- | ------------------------ |
| 4   | **Rate limiting** - max signups per domain per hour             | Core fear, Attack #9     |
| 5   | **Kill switch** - Lambda env var to disable signups instantly   | Core fear, Admin Need A3 |
| 6   | **Research: CloudFront → Lambda auth** - document current state | Attack #26               |
| 7   | **Research: Lambda IAM permissions** - verify least privilege   | Attack #39               |
| 8   | **Research: IAM IDC permission sets** - document group access   | Attacks #32-34           |
| 9   | **Research: CORS current config** - verify it's not `*`         | Attack #25               |

#### 🟢 COULD DO (Robustness)

| #   | Action                               | Addresses          |
| --- | ------------------------------------ | ------------------ |
| 10  | Anomaly detection on signup patterns | Admin Need A1      |
| 11  | Daily signup digest to Slack         | Admin Need A1      |
| 12  | First-seen domain alert              | Detection          |
| 13  | Correlation IDs across accounts      | Admin Need A2      |
| 14  | Self-expiring unverified accounts    | Green Hat solution |
| 15  | Runbook documentation                | Admin Need A6      |

#### ⚪ ACCEPTED RISKS (Documented)

| Risk                                           | Rationale                        |
| ---------------------------------------------- | -------------------------------- |
| Account enumeration via error messages         | Unavoidable without degrading UX |
| Domain list is public (GET endpoint)           | It's public domain anyway        |
| Timing oracle on validation                    | Public domain                    |
| GitHub JSON compromise requires manual cleanup | Low likelihood, accepted         |

### Research Items

| #   | Question                                                    | Why It Matters       |
| --- | ----------------------------------------------------------- | -------------------- |
| R1  | What's the CORS config on Lambda?                           | CSRF risk assessment |
| R2  | How is CloudFront → Lambda auth configured?                 | Trust boundary       |
| R3  | What are Lambda's exact IAM permissions?                    | Least privilege      |
| R4  | What permission sets does ndx_IsbUsersGroup have?           | Blast radius         |
| R5  | What's the credential delivery flow after account creation? | Attack surface       |

### Key Insights

1. **Email alias abuse is the highest-ROI attack** - trivial to execute, zero current mitigation
2. **"Things going wrong in a hurry" is the core architectural fear** - design for graceful, slow failure
3. **Detection gaps are significant** - account creation is currently silent
4. **Several critical unknowns exist** - research needed before confident security assessment
5. **Manual cleanup assumes detection we don't have** - fix detection first

---

## Session Completion

**Session completed:** 2026-01-12
**Workflow:** Brainstorming (AI-Recommended Techniques)
**Outcome:** Comprehensive security analysis with prioritized action plan

**Next Steps:**

1. Address 🔴 MUST DO items before launch
2. ~~Complete research items (R1-R5) to close knowledge gaps~~ **DONE** - See research report
3. Implement 🟡 SHOULD DO items for robust security posture
4. Document accepted risks formally

---

## Related Documents

- **Research Report:** `_bmad-output/analysis/research-authentication-2026-01-12.md`
  - Technical research: CloudFront OAC, CSRF protection, IAM IDC APIs, email normalization
  - Domain research: UK gov authentication standards, NCSC MFA guidance, AWS security best practices
  - Updated priority matrix with 6 MUST DO items

---

_Generated by BMAD Brainstorming Workflow v1.0_
