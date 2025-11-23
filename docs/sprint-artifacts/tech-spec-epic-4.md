# Epic Technical Specification: Local Development Infrastructure

Date: 2025-11-22
Author: cns
Epic ID: 4
Status: Draft

---

## Overview

Epic 4 establishes the local development infrastructure required for building and testing the Try Before You Buy feature. This epic implements a mitmproxy-based development workflow that enables developers to iterate on UI changes locally while connecting to the real Innovation Sandbox API backend.

The infrastructure solves a critical brownfield challenge: the Innovation Sandbox CloudFront domain (`https://d7roov8fndsis.cloudfront.net`) serves the production frontend, making local UI development difficult. By using mitmproxy as a transparent proxy, developers can intercept CloudFront domain requests, route UI assets to localhost:8080 (local NDX server), while passing API calls (`/api/*`) through to the real CloudFront backend unchanged. This provides production parity for API integration testing without requiring backend mocks.

## Objectives and Scope

**In Scope:**
- mitmproxy installation, configuration, and addon script for conditional request forwarding
- System proxy configuration documentation for macOS, Windows, Linux
- SSL certificate trust setup for HTTPS interception
- npm scripts for starting mitmproxy with correct configuration
- Automated validation script to verify local setup before development
- Development workflow documentation (`/docs/development/local-try-setup.md`)

**Out of Scope:**
- Backend API mocking (real Innovation Sandbox API used instead)
- Production deployment infrastructure (Epic 4 is dev-only)
- Automated tests (covered in NFR-TRY-TEST requirements, separate stories)
- Authentication implementation (Epic 5)
- Try feature UI components (Epic 5-8)

## System Architecture Alignment

**Architecture References:**
- **ADR-015:** Architecture Handoff Documentation - This tech spec provides epic-specific development guidance per ADR-015
- **Vanilla Eleventy with TypeScript** - Local server runs Eleventy build output on port 8080, mitmproxy routes UI requests to local build
- **Innovation Sandbox API Integration** - mitmproxy passes API requests through transparently to CloudFront, enabling real backend testing

**Constraints:**
- **Brownfield System:** Cannot modify Innovation Sandbox CloudFront distribution (external system)
- **Development Only:** mitmproxy setup is for local development, not production deployment
- **Port Allocation:** Port 8080 for NDX server, Port 8081 for mitmproxy (avoid conflicts)

**Development Workflow Alignment:**
```
Developer Machine:
  Browser → mitmproxy (localhost:8081) → Conditional routing:
    - UI routes (/, /catalogue/*, /try, /assets/*) → localhost:8080 (local NDX server)
    - API routes (/api/*) → CloudFront (real Innovation Sandbox backend)
```

## Detailed Design

### Services and Modules

Epic 4 is infrastructure-focused and does not introduce runtime services or modules. The deliverables are configuration files, scripts, and documentation:

| Component | Responsibility | Inputs | Outputs | Owner |
|-----------|---------------|--------|---------|-------|
| **mitmproxy-addon.py** | Conditional request forwarding (UI → localhost, API → CloudFront) | HTTP requests to CloudFront domain | Modified requests (UI) or passthrough (API) | Dev Team |
| **validate-local-setup.sh** | Pre-development environment validation | System state (ports, dependencies) | Validation report (✅/❌ status) | Dev Team |
| **npm scripts** | Developer workflow automation (`dev:proxy`, `validate-setup`) | User command (`yarn dev:proxy`) | mitmproxy process launch | Dev Team |
| **Documentation** | Setup guide (`/docs/development/local-try-setup.md`) | Developer prerequisites knowledge | Step-by-step configuration instructions | Dev Team |

**Key Design Principles:**
- **Minimal Configuration:** One-time setup per developer machine
- **Transparent Proxy:** Intercepts specific domain only (not all traffic)
- **Production Parity:** Real Innovation Sandbox API (no mocks)
- **Fast Validation:** Automated script catches setup issues < 1 second

### Data Models and Contracts

Epic 4 does not introduce data models. The mitmproxy addon manipulates HTTP request objects:

**mitmproxy Flow API Contract:**
```python
from mitmproxy import http

def request(flow: http.HTTPFlow) -> None:
    """
    flow.request properties:
    - pretty_host: str (e.g., "d7roov8fndsis.cloudfront.net")
    - path: str (e.g., "/api/leases" or "/catalogue/aws-service")
    - scheme: str ("http" or "https")
    - host: str (hostname without protocol)
    - port: int (80, 443, 8080, etc.)
    """
```

**Routing Logic:**
- **Condition:** `flow.request.pretty_host == "d7roov8fndsis.cloudfront.net"`
  - **If path starts with `/api/`:** Pass through unchanged (API → CloudFront)
  - **Else:** Modify `scheme="http"`, `host="localhost"`, `port=8080` (UI → local server)

### APIs and Interfaces

Epic 4 does not introduce APIs. The infrastructure enables Try feature development that will consume Innovation Sandbox APIs in Epic 5-7:

**Innovation Sandbox API Endpoints (Referenced for Context):**
- `GET /api/auth/login/status` - Check authentication status
- `GET /api/leases?userEmail={email}` - Retrieve user's leases
- `GET /api/leaseTemplates` - Retrieve available lease templates
- `POST /api/leases` - Request new lease
- `GET /api/configurations` - Retrieve AUP text and system configuration

**mitmproxy transparently passes these API calls through to CloudFront without modification.**

### Workflows and Sequencing

**Story Execution Sequence (Dependencies):**

```
Story 4.1: mitmproxy Setup Documentation
    ↓
Story 4.2: Create mitmproxy Addon Script
    ↓
Story 4.3: mitmproxy Run Configuration (npm script)
    ↓
Story 4.4: System Proxy Configuration Instructions
    ↓
Story 4.5: Certificate Trust Setup (HTTPS Interception)
    ↓
Story 4.6: Setup Validation Script
```

**Developer Daily Workflow (After Epic 4 Complete):**

```
1. Terminal 1: Start mitmproxy
   $ yarn dev:proxy
   → mitmproxy listens on localhost:8081
   → Addon loaded: scripts/mitmproxy-addon.py

2. Terminal 2: Start NDX server
   $ yarn dev
   → Eleventy server listens on localhost:8080

3. Browser: Navigate to CloudFront domain
   → https://d7roov8fndsis.cloudfront.net
   → UI served from localhost:8080 (local changes)
   → API calls proxied to CloudFront (real backend)

4. Develop & Test:
   → Edit src/try/* files
   → Refresh browser (sees local changes)
   → API calls use real Innovation Sandbox backend
   → OAuth redirects work (CloudFront domain preserved)
```

**Setup Validation Workflow:**

```
$ yarn validate-setup

Checks:
1. mitmproxy installed? (command -v mitmproxy)
2. Addon script exists? (scripts/mitmproxy-addon.py)
3. Port 8080 available? (lsof -Pi :8080)
4. Port 8081 available? (lsof -Pi :8081)
5. CA certificate generated? (~/.mitmproxy/mitmproxy-ca-cert.pem)

Result:
✅ Setup validation passed! (proceed to development)
❌ N validation check(s) failed (fix errors and retry)
```

## Non-Functional Requirements

### Performance

**Developer Experience Performance:**
- **Setup Validation:** `yarn validate-setup` completes in < 1 second (fast feedback before development)
- **Proxy Startup:** `yarn dev:proxy` starts mitmproxy in < 5 seconds (ready state)
- **Request Latency:** mitmproxy adds < 10ms overhead to UI requests (localhost routing)
- **API Passthrough:** API requests routed to CloudFront with < 5ms proxy overhead (minimal impact)

**Rationale:** Epic 4 is development infrastructure, not production runtime. Performance targets focus on developer productivity (fast validation, minimal proxy overhead).

**Measurement:** Manually test startup times and request latency during Story 4.6 (validation script).

### Security

**Development Environment Security:**
- **CA Certificate Trust:** mitmproxy CA certificate trusted ONLY on developer machines (never production)
- **HTTPS Interception:** Documentation warns about certificate trust implications (enables traffic decryption)
- **System Proxy Scope:** Proxy intercepts specific CloudFront domain only (not all traffic)
- **Revert Instructions:** Documentation includes steps to disable system proxy when not developing

**Innovation Sandbox API Security:**
- **No Token Manipulation:** mitmproxy passes Authorization headers through unchanged (preserves JWT integrity)
- **OAuth Flow Preservation:** OAuth redirects work without modification (CloudFront domain preserved)
- **Production Parity:** Same API security as production (real backend, real authentication)

**Threat Model:**
- **Threat:** Malicious mitmproxy addon script could intercept/modify API requests
- **Mitigation:** Addon script version-controlled, code-reviewed, single-purpose (routing only)
- **Threat:** Trusted CA certificate enables MITM attacks if compromised
- **Mitigation:** Certificate trust limited to developer machines, documentation warns users

**Compliance:** No sensitive data stored locally by Epic 4 infrastructure (JWT tokens managed by browser sessionStorage in Epic 5).

### Reliability/Availability

**Epic 4 Reliability Targets:**
- **Validation Script Accuracy:** 100% detection rate for missing dependencies/configuration errors
- **Proxy Stability:** mitmproxy runs continuously without crashes during development sessions (4+ hours)
- **Port Conflict Detection:** Validation script detects port conflicts before starting services

**Failure Modes & Recovery:**

| Failure Mode | Detection | Recovery |
|--------------|-----------|----------|
| mitmproxy not installed | Validation script (pre-start check) | Error message: "Run: pip install mitmproxy" |
| Port 8080/8081 already in use | Validation script (lsof check) | Warning: "Port already in use (service may be running)" |
| CA certificate not trusted | Browser SSL warning | Documentation: Follow certificate trust steps for OS |
| Addon script missing | Validation script (file exists check) | Error message: "scripts/mitmproxy-addon.py not found" |
| System proxy not configured | UI requests fail to load from localhost | Documentation: System proxy configuration steps |

**Degraded Operation:** If mitmproxy unavailable, developers can still work on non-Try features or use production CloudFront frontend (no local UI iteration).

### Observability

**Developer Observability:**
- **mitmproxy Console:** Real-time request log showing all intercepted requests (UI vs API routing visible)
- **Validation Script Output:** Clear ✅/❌ status for each prerequisite check
- **npm Script Output:** mitmproxy startup logs show proxy listening, addon loaded

**Key Signals for Debugging:**

| Signal | Source | Purpose |
|--------|--------|---------|
| Request log entries | mitmproxy console | Verify UI routes → localhost, API routes → CloudFront |
| Addon loaded message | mitmproxy startup | Confirm script loaded successfully |
| Port binding success | mitmproxy startup | Confirm proxy listening on 8081 |
| Validation check results | validate-setup.sh | Pre-flight checks passed/failed |

**Log Levels:**
- mitmproxy runs in interactive console mode (all requests visible)
- No persistent logging required (development environment only)

**Monitoring:** Not applicable (Epic 4 is local development infrastructure, not production service)

## Dependencies and Integrations

### External Dependencies

**Python Dependencies (New for Epic 4):**
- **mitmproxy** (latest stable version recommended, tested with 10.x+)
  - Purpose: Transparent HTTPS proxy for local development
  - Installation: `pip install mitmproxy`
  - Constraint: Requires Python 3.8+
  - Used by: Developer machines only (not production)

**Existing Node.js Dependencies (package.json):**
- **@11ty/eleventy** `^3.1.2` - Static site generator (serves UI on localhost:8080)
- **@x-govuk/govuk-eleventy-plugin** `^7.2.1` - GOV.UK Design System integration
- **husky** `^9.1.7` - Git hooks for pre-commit checks
- **lint-staged** `^16.1.5` - Staged file linting
- **prettier** `^3.6.2` - Code formatting

**Node.js Runtime:**
- **Version:** 20.17.0 (per development-guide.md)
- **Package Manager:** Yarn 4.5.0 (enforced via engineStrict)

**Operating System Tools:**
- **lsof** (Linux/macOS) or **netstat** (Windows) - Port availability checking (validation script)
- **System proxy configuration** - Platform-specific (macOS System Preferences, Windows Internet Options, Linux GNOME Settings)

### Integration Points

**Innovation Sandbox CloudFront API (External System):**
- **Domain:** `https://d7roov8fndsis.cloudfront.net`
- **Integration Type:** HTTP API passthrough (mitmproxy transparent proxy)
- **Endpoints Used:** `/api/*` (all API routes pass through unchanged)
- **Authentication:** OAuth 2.0 flow preserved (no proxy modification)
- **API Version:** Not versioned (external system, no SLA)
- **Error Handling:** API errors returned to browser unchanged (production parity)

**Local NDX Server:**
- **Port:** 8080
- **Protocol:** HTTP (localhost only, no HTTPS needed)
- **Integration Type:** mitmproxy routes UI requests to local server
- **Startup Command:** `yarn start` (Eleventy serve mode)

**Developer Machine System Proxy:**
- **Configuration:** HTTP/HTTPS proxy set to localhost:8081
- **Scope:** System-wide or browser-specific (developer choice)
- **Bypass List:** `localhost, 127.0.0.1, *.local` (prevent recursive proxying)

### Version Constraints

**Epic 4 Deliverables (Version-Controlled):**
- `scripts/mitmproxy-addon.py` - Version-controlled in repository
- `scripts/validate-local-setup.sh` - Version-controlled in repository
- `/docs/development/local-try-setup.md` - Version-controlled in repository
- `package.json` scripts (`dev:proxy`, `validate-setup`) - Version-controlled

**External Tool Versions:**
- mitmproxy: No pinned version (latest stable recommended, 10.x+ tested)
- Python: 3.8+ required (mitmproxy dependency)

**No Production Dependencies:** Epic 4 infrastructure is development-only, zero production dependencies introduced.

## Acceptance Criteria (Authoritative)

Epic 4 acceptance criteria are derived from NFR-TRY-TEST requirements and story-level acceptance criteria:

### Epic-Level Acceptance Criteria

**AC-EPIC4-1:** Documentation exists at `/docs/development/local-try-setup.md` with complete mitmproxy setup instructions
- Prerequisites section (Python 3.8+, mitmproxy installation)
- Architecture diagram showing request flow
- Configuration steps for macOS, Windows, Linux
- Troubleshooting section
- Validation steps

**AC-EPIC4-2:** mitmproxy addon script exists at `scripts/mitmproxy-addon.py` with correct routing logic
- UI routes (`/`, `/catalogue/*`, `/try`, `/assets/*`) forward to localhost:8080
- API routes (`/api/*`) pass through to CloudFront unchanged
- Script uses mitmproxy flow API correctly
- No syntax errors (`python scripts/mitmproxy-addon.py` runs cleanly)

**AC-EPIC4-3:** npm scripts enable one-command proxy startup
- `yarn dev:proxy` starts mitmproxy with addon loaded
- mitmproxy listens on localhost:8081
- Console shows "Proxy server running" and "Addon loaded"

**AC-EPIC4-4:** System proxy configuration documented for all major platforms
- macOS: System Preferences → Network → Proxies
- Windows: Control Panel → Internet Options → LAN Settings
- Linux: GNOME Settings → Network Proxy
- Bypass list documented: `localhost, 127.0.0.1, *.local`
- Revert instructions included

**AC-EPIC4-5:** SSL certificate trust setup documented for all major platforms
- macOS: Keychain Access → Trust certificate
- Windows: Certificate Manager → Trusted Root Certification Authorities
- Linux: `sudo update-ca-certificates`
- Security warning included: "Only trust on development machines"
- Validation steps: Browse to CloudFront domain, no SSL warnings

**AC-EPIC4-6:** Automated validation script detects setup issues
- `yarn validate-setup` checks:
  1. mitmproxy installed
  2. Addon script exists
  3. Port 8080 available
  4. Port 8081 available
  5. CA certificate generated
- Script exits 0 on success, exits 1 on failure
- Clear ✅/❌ status for each check
- Actionable error messages

### Story-Level Acceptance Criteria Summary

**Story 4.1 (Documentation):** 6 AC covering documentation sections, prerequisites, architecture diagram, configuration steps, troubleshooting, validation

**Story 4.2 (Addon Script):** 5 AC covering routing logic, edge cases, docstring, mitmproxy API usage, syntax validation

**Story 4.3 (Run Configuration):** 4 AC covering npm script, mitmproxy startup options, console output, clean shutdown

**Story 4.4 (Proxy Configuration):** 4 AC covering platform-specific proxy settings, bypass list, revert instructions

**Story 4.5 (Certificate Trust):** 4 AC covering platform-specific certificate trust, security warnings, validation instructions

**Story 4.6 (Validation Script):** 6 AC covering dependency checks, port checks, certificate checks, exit codes, clear output, npm script integration

**Total:** 29 atomic, testable acceptance criteria across 6 stories

### NFR Coverage

**NFR-TRY-TEST-1:** End-to-end tests prove proxy and app server integration (Playwright)
- **Epic 4 Foundation:** Proxy infrastructure enables E2E testing (delivered by Epic 4)
- **Test Implementation:** Separate story post-Epic 4 (not in Epic 4 scope)

**NFR-TRY-TEST-2:** Smoke tests cover main website areas to catch regressions
- **Epic 4 Foundation:** Proxy enables local testing of existing NDX pages (delivered by Epic 4)
- **Test Implementation:** Separate story post-Epic 4 (not in Epic 4 scope)

**NFR-TRY-TEST-3:** Test user credentials retrievable via 1Password CLI command (documented)
- **Epic 4 Scope:** Not covered (authentication/credentials handled in Epic 5+)

**Epic 4 delivers the infrastructure foundation that enables NFR-TRY-TEST-1 and NFR-TRY-TEST-2. Actual test implementation occurs post-Epic 4.**

## Traceability Mapping

| AC ID | Spec Section(s) | Component(s) / Artifact(s) | Test Idea |
|-------|-----------------|---------------------------|-----------|
| **AC-EPIC4-1** | Overview, Detailed Design → Workflows | `/docs/development/local-try-setup.md` | Manual review: All sections present, clear instructions, architecture diagram exists |
| **AC-EPIC4-2** | Detailed Design → Data Models (mitmproxy Flow API) | `scripts/mitmproxy-addon.py` | Unit test: Mock HTTP flow, verify UI → localhost, API → CloudFront passthrough |
| **AC-EPIC4-3** | Detailed Design → Workflows (Daily Workflow) | `package.json` scripts (`dev:proxy`) | Integration test: Run `yarn dev:proxy`, verify mitmproxy starts, check console output |
| **AC-EPIC4-4** | Detailed Design → Workflows (Setup Validation) | `/docs/development/local-try-setup.md` (Proxy Config section) | Manual review: Platform-specific instructions present for macOS/Windows/Linux |
| **AC-EPIC4-5** | NFR → Security (CA Certificate Trust) | `/docs/development/local-try-setup.md` (Certificate Trust section) | Manual test: Follow trust steps, browse CloudFront domain, verify no SSL warnings |
| **AC-EPIC4-6** | NFR → Reliability (Failure Modes), Detailed Design → Workflows | `scripts/validate-local-setup.sh` | Integration test: Run with missing deps, verify ❌ status; run with all deps, verify ✅ status |
| **NFR-TRY-TEST-1** | NFR → Performance, Overview | mitmproxy infrastructure (foundation only) | E2E test (post-Epic 4): Playwright tests prove proxy+server integration |
| **NFR-TRY-TEST-2** | NFR → Reliability, Overview | mitmproxy infrastructure (foundation only) | Smoke test (post-Epic 4): Crawl main NDX pages through proxy, verify 200 responses |
| **NFR-TRY-TEST-3** | Out of Scope | N/A (Epic 5+ auth/credentials) | N/A (not Epic 4 deliverable) |

### Story-to-Component Traceability

| Story | Components Delivered | Test Coverage |
|-------|---------------------|---------------|
| **4.1** | `/docs/development/local-try-setup.md` (initial draft) | Manual review (documentation completeness) |
| **4.2** | `scripts/mitmproxy-addon.py` | Unit test (mock HTTP flows, verify routing logic) |
| **4.3** | `package.json` scripts (`dev:proxy`) | Integration test (start mitmproxy, verify addon loaded) |
| **4.4** | `/docs/development/local-try-setup.md` (proxy config section) | Manual review (platform-specific instructions) |
| **4.5** | `/docs/development/local-try-setup.md` (certificate trust section) | Manual test (follow steps, verify SSL trust works) |
| **4.6** | `scripts/validate-local-setup.sh`, `package.json` (`validate-setup` script) | Integration test (run with various failure scenarios) |

### PRD Requirement Traceability

| PRD Requirement | Epic 4 Coverage | Implementation |
|-----------------|-----------------|----------------|
| **NFR-TRY-TEST-1** | Foundation delivered (proxy infrastructure) | Test implementation: Separate story post-Epic 4 |
| **NFR-TRY-TEST-2** | Foundation delivered (proxy infrastructure) | Test implementation: Separate story post-Epic 4 |
| **NFR-TRY-TEST-3** | Out of scope (Epic 5+ authentication) | N/A |
| **Phase 1: mitmproxy Configuration** | ✅ Fully delivered | Stories 4.1-4.6 |
| **Phase 1: API Route Exclusion** | ✅ Fully delivered | Story 4.2 (addon script routing logic) |
| **Phase 1: Playwright Validation** | Foundation delivered | Test implementation: Separate story post-Epic 4 |

## Risks, Assumptions, Open Questions

### Risks

**RISK-1:** mitmproxy platform compatibility issues (Windows certificate trust, Linux proxy config variations)
- **Likelihood:** Medium
- **Impact:** Medium (delays developer onboarding)
- **Mitigation:** Story 4.4 and 4.5 document platform-specific instructions; Story 4.6 validation script detects issues early
- **Owner:** Dev Team

**RISK-2:** Innovation Sandbox CloudFront API changes break local development proxy
- **Likelihood:** Low (external system, no control)
- **Impact:** High (blocks Try feature development)
- **Mitigation:** API is passthrough (no modification), reducing brittleness; fallback to production CloudFront frontend for non-local development
- **Owner:** Product Team (escalation to Innovation Sandbox team if API changes)

**RISK-3:** Developers bypass proxy setup, develop against production CloudFront frontend
- **Likelihood:** Medium (setup friction)
- **Impact:** Low (slower iteration, but functional)
- **Mitigation:** Story 4.6 validation script catches setup issues; documentation emphasizes benefits (fast iteration, real API testing)
- **Owner:** Dev Team

**RISK-4:** System proxy configuration conflicts with corporate proxy/VPN
- **Likelihood:** Medium (government networks often have proxies)
- **Impact:** Medium (setup complexity)
- **Mitigation:** Documentation includes browser-specific proxy option (FoxyProxy extension) as alternative to system-wide proxy
- **Owner:** Dev Team

**RISK-5:** mitmproxy CA certificate trust concerns in government security environment
- **Likelihood:** Low (development machines, not production)
- **Impact:** Medium (security review delays)
- **Mitigation:** Documentation clearly warns "Only trust on development machines"; certificate trust is reversible
- **Owner:** Dev Team

### Assumptions

**ASSUMPTION-1:** Developers have Python 3.8+ installed or can install it
- **Validation:** Story 4.6 validation script checks Python availability
- **If False:** Documentation provides Python installation links for each platform

**ASSUMPTION-2:** Innovation Sandbox CloudFront API (`/api/*`) is stable and does not require version pinning
- **Validation:** Manual testing during Epic 5-7 (auth/API integration stories)
- **If False:** Add API version to request headers or URL (coordination with Innovation Sandbox team)

**ASSUMPTION-3:** Local NDX server (Eleventy) can serve on port 8080 without modification
- **Validation:** Existing `yarn start` command uses port 8080 (verified in package.json)
- **If False:** Update npm scripts to specify port explicitly

**ASSUMPTION-4:** OAuth redirect flow works without modification when proxied
- **Validation:** Manual testing during Epic 5 (authentication implementation)
- **If False:** Adjust mitmproxy addon to preserve OAuth callback URLs

**ASSUMPTION-5:** Developers use macOS, Windows, or Linux desktop environments
- **Validation:** Team survey (platform distribution)
- **If False:** Add platform-specific documentation for other environments (e.g., WSL)

### Open Questions

**QUESTION-1:** Should Epic 4 include automated E2E tests (Playwright) or defer to separate story?
- **Current Decision:** Defer E2E tests to post-Epic 4 story (Epic 4 delivers infrastructure foundation only)
- **Rationale:** Epic 4 scope is infrastructure setup; tests require Try feature UI (Epic 5-8)
- **Revisit:** After Epic 5 (authentication) completes

**QUESTION-2:** Should validation script attempt to auto-configure system proxy or only detect/report?
- **Current Decision:** Detect and report only (no auto-configuration)
- **Rationale:** System proxy modification requires elevated permissions, varies by platform; manual configuration safer
- **Status:** RESOLVED (Story 4.6 scope confirmed)

**QUESTION-3:** Should mitmproxy run in background mode or interactive console mode?
- **Current Decision:** Interactive console mode (developer can see request logs)
- **Rationale:** Transparency for debugging (UI vs API routing visible); easy shutdown (press 'q')
- **Status:** RESOLVED (Story 4.3 scope confirmed)

**QUESTION-4:** Do we need to support browser-specific proxy configuration (FoxyProxy) in addition to system proxy?
- **Current Decision:** Document both options (system proxy primary, FoxyProxy alternative)
- **Rationale:** Corporate networks may have existing system proxies; browser extension provides isolation
- **Status:** RESOLVED (Story 4.4 includes both approaches)

## Test Strategy Summary

### Test Levels and Coverage

Epic 4 test strategy focuses on **infrastructure validation** rather than runtime testing (no production code delivered):

| Test Level | Scope | Framework | Coverage Target | Execution |
|------------|-------|-----------|-----------------|-----------|
| **Unit Tests** | mitmproxy addon routing logic | Python unittest / pytest | 100% routing paths (UI, API, edge cases) | Manual (Story 4.2) |
| **Integration Tests** | mitmproxy startup, npm scripts, validation script | Bash / Jest | All npm scripts, validation checks | Manual (Stories 4.3, 4.6) |
| **Manual Tests** | Documentation completeness, system proxy setup, certificate trust | Human review | All platform-specific instructions (macOS/Windows/Linux) | Story acceptance (4.1, 4.4, 4.5) |
| **E2E Tests** | Proxy + NDX server + browser (full workflow) | Playwright | NOT IN EPIC 4 SCOPE (deferred to post-Epic 4 story) | Post-Epic 4 |

### Test Implementation Plan

**Story 4.2 (mitmproxy Addon Unit Tests):**
```python
# Test: UI routes forward to localhost
def test_ui_route_forwarding():
    flow = create_mock_flow(host="d7roov8fndsis.cloudfront.net", path="/catalogue/aws")
    request(flow)
    assert flow.request.host == "localhost"
    assert flow.request.port == 8080
    assert flow.request.scheme == "http"

# Test: API routes pass through unchanged
def test_api_route_passthrough():
    flow = create_mock_flow(host="d7roov8fndsis.cloudfront.net", path="/api/leases")
    request(flow)
    assert flow.request.host == "d7roov8fndsis.cloudfront.net"  # unchanged
    assert flow.request.path == "/api/leases"  # unchanged

# Test: Non-CloudFront domains ignored
def test_non_cloudfront_ignored():
    flow = create_mock_flow(host="example.com", path="/test")
    request(flow)
    assert flow.request.host == "example.com"  # unchanged
```

**Story 4.3 (mitmproxy Startup Integration Test):**
```bash
# Test: mitmproxy starts with addon loaded
yarn dev:proxy &
PROXY_PID=$!
sleep 2  # wait for startup
lsof -Pi :8081 | grep -q mitmproxy  # verify listening
kill $PROXY_PID
```

**Story 4.6 (Validation Script Integration Tests):**
```bash
# Test: Missing mitmproxy detected
unset mitmproxy (remove from PATH temporarily)
yarn validate-setup
assert $? == 1  # exit code 1 on failure
assert output contains "mitmproxy not installed"

# Test: All checks pass
(ensure all deps installed)
yarn validate-setup
assert $? == 0  # exit code 0 on success
assert output contains "✅ Setup validation passed!"
```

**Manual Testing (Stories 4.1, 4.4, 4.5):**
- **Documentation Review:** Dev Team member follows `/docs/development/local-try-setup.md` end-to-end on fresh machine
- **Platform Testing:** Test proxy setup on macOS, Windows, Linux (at least one machine per platform)
- **Certificate Trust:** Verify SSL warnings disappear after following platform-specific trust instructions
- **OAuth Flow:** Verify OAuth redirects work when proxied (manual test during Epic 5)

### Edge Cases and Scenarios

**Edge Case 1:** Root path (`/`) routes to localhost
- **Test:** `flow.request.path == "/"` → verify `host=localhost, port=8080`

**Edge Case 2:** Static assets (`/assets/*`) route to localhost
- **Test:** `flow.request.path == "/assets/main.css"` → verify localhost routing

**Edge Case 3:** Try page (`/try`) routes to localhost
- **Test:** `flow.request.path == "/try"` → verify localhost routing

**Edge Case 4:** API subroutes (`/api/auth/login`, `/api/leases`) pass through
- **Test:** Multiple API paths → verify all passthrough unchanged

**Edge Case 5:** Port conflict detection (8080 or 8081 already in use)
- **Test:** Start service on port 8081, run validation script → verify warning displayed

**Edge Case 6:** mitmproxy CA certificate not generated yet
- **Test:** Delete `~/.mitmproxy/mitmproxy-ca-cert.pem`, run validation → verify warning displayed

### Acceptance Criteria Validation

Each story's acceptance criteria validated through:
- **Story 4.1:** Manual documentation review (all sections present, clear instructions)
- **Story 4.2:** Unit tests (routing logic), manual syntax check (`python scripts/mitmproxy-addon.py`)
- **Story 4.3:** Integration test (startup), manual verification (console output)
- **Story 4.4:** Manual documentation review (platform-specific proxy instructions)
- **Story 4.5:** Manual test (follow trust steps, verify browser SSL trust)
- **Story 4.6:** Integration tests (validation script failure/success scenarios)

### Test Execution Timing

- **During Story Development:** Unit tests written alongside addon script (Story 4.2)
- **Story Acceptance:** Manual tests executed by story reviewer before marking story "done"
- **Epic Completion:** Full manual workflow test (setup from scratch on fresh developer machine)
- **Post-Epic 4:** E2E tests (Playwright) validate proxy + NDX server + browser integration

### Regression Prevention

**Version Control:** All Epic 4 deliverables committed to git (scripts, documentation)
- **Addon Script:** `scripts/mitmproxy-addon.py` under version control (prevents accidental changes)
- **Validation Script:** `scripts/validate-local-setup.sh` under version control (ensures consistent checks)
- **Documentation:** `/docs/development/local-try-setup.md` under version control (single source of truth)

**Documentation as Test Oracle:** `/docs/development/local-try-setup.md` serves as acceptance test reference
- New developers follow documentation → any missing/incorrect steps discovered immediately
- Validation script codifies prerequisite checks → prevents common setup errors

**No CI/CD Pipeline Required:** Epic 4 is local development infrastructure (not production code)
- Unit tests for addon script can run manually (no automated pipeline needed)
- Integration tests run locally during story acceptance (no cloud CI needed)

---

**Test Strategy Success Criteria:**
1. All 6 stories deliver AC-complete artifacts
2. mitmproxy addon unit tests achieve 100% routing path coverage
3. Validation script detects all common setup issues (missing deps, port conflicts, certificate)
4. At least one developer successfully completes full setup on each platform (macOS/Windows/Linux)
5. OAuth flow works when proxied (validated during Epic 5 authentication stories)
