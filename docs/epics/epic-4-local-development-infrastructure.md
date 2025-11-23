# Epic 4: Local Development Infrastructure

**Goal:** Development team can build and test Try feature locally with production-like environment

**User Value:** Enables efficient development iteration, prevents "works on my machine" issues, establishes testing foundation

**FRs Covered:** NFR-TRY-TEST-1, NFR-TRY-TEST-2, NFR-TRY-TEST-3

---

## Story 4.1: mitmproxy Setup Documentation

As a developer,
I want clear documentation on setting up mitmproxy for local Try feature development,
So that I can intercept CloudFront API requests and redirect them to local NDX server.

**Acceptance Criteria:**

**Given** mitmproxy is not yet configured
**When** I create `/docs/development/local-try-setup.md`
**Then** the documentation includes:

**Section: Prerequisites**
- Python 3.8+ installed
- mitmproxy installed: `pip install mitmproxy`
- NDX node server can run on localhost:8080
- Innovation Sandbox CloudFront domain: `https://d7roov8fndsis.cloudfront.net`

**Section: How mitmproxy Works for Try Development**
- mitmproxy acts as transparent proxy intercepting CloudFront domain requests
- UI requests (HTML, CSS, JS) → forward to localhost:8080 (local NDX server)
- API requests (`/api/*`) → pass through to real CloudFront (Innovation Sandbox backend)
- Enables local UI development with real backend API

**Section: Architecture Diagram**
```
Browser Request → mitmproxy (localhost:8081)
                      ↓
        ┌─────────────┴─────────────┐
        ↓                           ↓
  UI Routes                    API Routes
(/*.html, /*.js, /*.css)      (/api/*)
        ↓                           ↓
localhost:8080               CloudFront
(Local NDX Server)         (Real Backend)
```

**Section: Configuration Steps**
1. Install mitmproxy: `pip install mitmproxy`
2. Create addon script: `scripts/mitmproxy-addon.py` (Story 4.2)
3. Configure system proxy settings to use localhost:8081
4. Run mitmproxy with addon (Story 4.3)
5. Start NDX server on port 8080
6. Browse to `https://d7roov8fndsis.cloudfront.net` (proxied)

**And** documentation includes troubleshooting section
**And** documentation includes validation steps to confirm setup working

**Prerequisites:** None (first story in epic)

**Technical Notes:**
- mitmproxy listens on localhost:8081 (avoids clash with NDX server on 8080)
- Transparent proxy intercepts specific domain only
- Does NOT intercept all traffic (minimally invasive)
- System proxy settings revert when mitmproxy stopped

**Architecture Context:**
- **ADR-015:** Vanilla Eleventy with TypeScript (brownfield constraint)
  - Local server runs Eleventy build output on port 8080
  - mitmproxy routes UI requests to local build (hot-reload workflow)
- **Development Workflow:** Proxy enables local UI development with real Innovation Sandbox API
  - UI changes: Served from localhost:8080 (rapid iteration)
  - API calls: Proxied to CloudFront (real backend, real data)
  - No need to mock Innovation Sandbox API (reduces maintenance burden)
- **Output:** `/docs/development/local-try-setup.md` comprehensive setup guide

**UX Design Context:**
- **Developer Experience:** Fast iteration on UI changes without backend mocking
- **Production Parity:** Tests against real Innovation Sandbox API (catches integration issues early)

---

## Story 4.2: Create mitmproxy Addon Script for Conditional Forwarding

As a developer,
I want a mitmproxy addon script that conditionally forwards requests,
So that UI routes go to local server and API routes pass through to real backend.

**Acceptance Criteria:**

**Given** mitmproxy is installed
**When** I create `scripts/mitmproxy-addon.py`
**Then** the script includes:

```python
from mitmproxy import http

def request(flow: http.HTTPFlow) -> None:
    """
    Conditional request forwarding for NDX Try development.

    - UI routes (HTML, CSS, JS) → localhost:8080 (local NDX server)
    - API routes (/api/*) → CloudFront (real Innovation Sandbox backend)
    """

    # Only intercept CloudFront domain
    if flow.request.pretty_host == "d7roov8fndsis.cloudfront.net":

        # Pass API routes to real backend (no modification)
        if flow.request.path.startswith("/api/"):
            # Request passes through to CloudFront unchanged
            pass

        else:
            # Forward UI routes to local NDX server
            flow.request.scheme = "http"
            flow.request.host = "localhost"
            flow.request.port = 8080
            # Path unchanged (e.g., /index.html stays /index.html)

addons = [request]
```

**And** script handles edge cases:
- Root path (`/`) forwards to localhost:8080
- Static assets (`/assets/*`) forward to localhost:8080
- Product pages (`/catalogue/*`) forward to localhost:8080
- Try page (`/try`) forwards to localhost:8080
- API routes (`/api/*`) pass through to CloudFront unchanged

**And** script includes docstring explaining purpose
**And** script uses mitmproxy flow API correctly
**And** running `python scripts/mitmproxy-addon.py` has no syntax errors

**Prerequisites:** Story 4.1 (Documentation created)

**Technical Notes:**
- mitmproxy addon API: `http.HTTPFlow` object
- `flow.request.pretty_host` for domain matching
- Modify `scheme`, `host`, `port` for local forwarding
- Leave path unchanged (preserve routing)
- No authentication token manipulation needed (OAuth redirects work)

**Architecture Context:**
- **Routing Logic:**
  - UI routes (`/`, `/catalogue/*`, `/try`, static assets): Forward to localhost:8080
  - API routes (`/api/*`): Pass through to CloudFront unchanged
- **ADR-021:** Centralized API client works seamlessly with mitmproxy
  - API calls include Authorization header (JWT from sessionStorage)
  - mitmproxy passes API requests through transparently (no modification)
- **OAuth Flow:** Redirects work without modification (OAuth callback URL remains CloudFront domain)
- **Script Location:** `scripts/mitmproxy-addon.py` version-controlled with codebase

**UX Design Context:**
- **Developer Experience:** Simple Python script, minimal configuration
- **Debugging:** mitmproxy console shows all intercepted requests (UI vs API routing visible)

---

## Story 4.3: mitmproxy Run Configuration

As a developer,
I want a simple command to start mitmproxy with the addon script,
So that I can quickly start local development environment.

**Acceptance Criteria:**

**Given** the mitmproxy addon script exists at `scripts/mitmproxy-addon.py`
**When** I add npm script to `package.json`
**Then** the package.json includes:

```json
{
  "scripts": {
    "dev:proxy": "mitmproxy --listen-port 8081 --mode transparent --set confdir=~/.mitmproxy -s scripts/mitmproxy-addon.py"
  }
}
```

**And** running `yarn dev:proxy` starts mitmproxy with:
- Listen port: 8081
- Mode: transparent proxy
- Addon script: scripts/mitmproxy-addon.py
- Configuration directory: ~/.mitmproxy

**And** console output shows:
- Proxy server running on localhost:8081
- Addon loaded: mitmproxy-addon.py
- Waiting for requests

**And** pressing `q` in mitmproxy console stops the proxy cleanly

**Prerequisites:** Story 4.2 (Addon script created)

**Technical Notes:**
- `--listen-port 8081` avoids clash with NDX server on 8080
- `--mode transparent` enables domain interception
- `-s` flag specifies addon script path
- mitmproxy generates SSL certificates automatically (~/.mitmproxy/mitmproxy-ca-cert.pem)
- May need to trust mitmproxy CA certificate for HTTPS interception

**Architecture Context:**
- **npm Script:** `yarn dev:proxy` starts mitmproxy with correct configuration
- **Port 8081:** mitmproxy listener (avoids conflict with NDX server on 8080)
- **Transparent Mode:** Intercepts CloudFront domain requests without browser extension
- **SSL Certificate Generation:** Auto-generated on first run (~/.mitmproxy/mitmproxy-ca-cert.pem)
- **Development Workflow:**
  - Terminal 1: `yarn dev:proxy` (start mitmproxy)
  - Terminal 2: `yarn dev` (start NDX server on port 8080)
  - Browser: Navigate to CloudFront domain (proxied to localhost)

**UX Design Context:**
- **Developer Experience:** Single command to start proxy (`yarn dev:proxy`)
- **Clean Shutdown:** Press `q` in mitmproxy console to stop cleanly

---

## Story 4.4: System Proxy Configuration Instructions

As a developer,
I want clear instructions for configuring system proxy settings,
So that browser traffic routes through mitmproxy.

**Acceptance Criteria:**

**Given** mitmproxy is running on localhost:8081
**When** I update `/docs/development/local-try-setup.md`
**Then** the documentation includes proxy configuration for macOS, Windows, Linux:

**macOS: System Preferences**
```
1. Open System Preferences → Network
2. Select active network (Wi-Fi or Ethernet)
3. Click Advanced → Proxies
4. Enable "Web Proxy (HTTP)": localhost:8081
5. Enable "Secure Web Proxy (HTTPS)": localhost:8081
6. Click OK → Apply
```

**Windows: Internet Options**
```
1. Open Control Panel → Internet Options
2. Click Connections → LAN Settings
3. Enable "Use a proxy server for your LAN"
4. Address: localhost, Port: 8081
5. Click OK
```

**Linux: GNOME Settings**
```
1. Open Settings → Network → Network Proxy
2. Select "Manual"
3. HTTP Proxy: localhost:8081
4. HTTPS Proxy: localhost:8081
5. Apply
```

**And** documentation includes instructions to bypass proxy for non-CloudFront domains:
- Add bypass list: `localhost, 127.0.0.1, *.local`
- Only CloudFront domain routed through proxy

**And** documentation includes revert instructions:
- Set proxy to "Off" or "Direct" when not developing Try features

**Prerequisites:** Story 4.3 (Run configuration created)

**Technical Notes:**
- System proxy settings affect all browsers
- Can alternatively use browser-specific proxy extensions (FoxyProxy)
- mitmproxy must be running before enabling system proxy
- Revert proxy settings to avoid routing all traffic when not developing

**Architecture Context:**
- **System-Wide Proxy:** All browsers route through localhost:8081 when enabled
- **Bypass List:** Ensure `localhost, 127.0.0.1, *.local` bypassed (prevents proxying local traffic)
- **Platform-Specific:** macOS (System Preferences), Windows (Internet Options), Linux (GNOME Settings)
- **Alternative:** Browser extensions like FoxyProxy (more granular control, per-browser)
- **Revert When Done:** Disable system proxy when not developing Try features (avoid routing all traffic)

**UX Design Context:**
- **Developer Experience:** One-time setup per machine
- **Documentation:** Platform-specific instructions in `/docs/development/local-try-setup.md`

---

## Story 4.5: Certificate Trust Setup (HTTPS Interception)

As a developer,
I want to trust mitmproxy's SSL certificate,
So that I can intercept HTTPS requests without browser warnings.

**Acceptance Criteria:**

**Given** mitmproxy has generated CA certificate at `~/.mitmproxy/mitmproxy-ca-cert.pem`
**When** I update `/docs/development/local-try-setup.md`
**Then** the documentation includes certificate trust instructions:

**macOS: Keychain Access**
```
1. Open ~/.mitmproxy/mitmproxy-ca-cert.pem
2. Keychain Access opens automatically
3. Find "mitmproxy" certificate in System keychain
4. Double-click → Trust → When using this certificate: Always Trust
5. Close and authenticate
```

**Windows: Certificate Manager**
```
1. Open ~/.mitmproxy/mitmproxy-ca-cert.pem
2. Install Certificate → Current User → Place in "Trusted Root Certification Authorities"
3. Click Next → Finish
```

**Linux: ca-certificates**
```
1. sudo cp ~/.mitmproxy/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy.crt
2. sudo update-ca-certificates
```

**And** documentation warns about certificate trust implications:
- Only trust certificate on development machines
- Never trust mitmproxy certificate in production
- Certificate enables mitmproxy to decrypt HTTPS traffic

**And** validation instructions provided:
1. Browse to `https://d7roov8fndsis.cloudfront.net`
2. No SSL warnings should appear
3. UI content loads from localhost:8080
4. API calls go to real CloudFront backend

**Prerequisites:** Story 4.4 (Proxy configuration documented)

**Technical Notes:**
- mitmproxy auto-generates CA certificate on first run
- Certificate path: `~/.mitmproxy/mitmproxy-ca-cert.pem`
- Without trust, browser shows "Your connection is not private" warnings
- Certificate trust is per-machine, not per-browser (system-wide)

**Architecture Context:**
- **HTTPS Interception:** CloudFront domain uses HTTPS (mitmproxy must decrypt to route)
- **CA Certificate:** mitmproxy auto-generates on first run (`~/.mitmproxy/mitmproxy-ca-cert.pem`)
- **Platform-Specific Trust:**
  - macOS: Keychain Access (Always Trust)
  - Windows: Certificate Manager (Trusted Root Certification Authorities)
  - Linux: ca-certificates (`sudo update-ca-certificates`)
- **Security Warning:** Only trust certificate on development machines (never production)
- **Validation:** Browse to CloudFront domain, verify no SSL warnings, UI loads from localhost

**UX Design Context:**
- **Developer Experience:** One-time certificate trust per machine
- **Security Notice:** Documentation warns about trusting only on dev machines
- **Validation Steps:** Clear instructions to verify setup working after trust

---

## Story 4.6: Setup Validation Script

As a developer,
I want an automated validation script that confirms local setup is working,
So that I can quickly verify environment before starting feature development.

**Acceptance Criteria:**

**Given** mitmproxy, NDX server, and proxy configuration are set up
**When** I create `scripts/validate-local-setup.sh`
**Then** the script validates:

```bash
#!/bin/bash
set -e

echo "=================================="
echo "Local Try Setup Validation"
echo "=================================="
echo ""

ERRORS=0

# Check 1: mitmproxy installed
echo "✓ Checking mitmproxy installation..."
if ! command -v mitmproxy &> /dev/null; then
  echo "❌ mitmproxy not installed. Run: pip install mitmproxy"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ mitmproxy installed"
fi

# Check 2: Addon script exists
echo ""
echo "✓ Checking addon script..."
if [ ! -f "scripts/mitmproxy-addon.py" ]; then
  echo "❌ scripts/mitmproxy-addon.py not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Addon script exists"
fi

# Check 3: NDX server can start on port 8080
echo ""
echo "✓ Checking if port 8080 is available for NDX server..."
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
  echo "⚠️  Port 8080 already in use (NDX server may already be running)"
else
  echo "✅ Port 8080 available"
fi

# Check 4: Port 8081 available for mitmproxy
echo ""
echo "✓ Checking if port 8081 is available for mitmproxy..."
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
  echo "⚠️  Port 8081 already in use (mitmproxy may already be running)"
else
  echo "✅ Port 8081 available"
fi

# Check 5: mitmproxy CA certificate exists
echo ""
echo "✓ Checking mitmproxy CA certificate..."
if [ ! -f ~/.mitmproxy/mitmproxy-ca-cert.pem ]; then
  echo "⚠️  mitmproxy CA certificate not generated yet. Run mitmproxy once to generate."
else
  echo "✅ mitmproxy CA certificate exists"
fi

echo ""
echo "=================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ Setup validation passed!"
  echo ""
  echo "Next steps:"
  echo "1. Start mitmproxy: yarn dev:proxy"
  echo "2. Configure system proxy to use localhost:8081"
  echo "3. Trust mitmproxy CA certificate (see docs/development/local-try-setup.md)"
  echo "4. Start NDX server: yarn dev"
  echo "5. Browse to: https://d7roov8fndsis.cloudfront.net"
  echo "=================================="
  exit 0
else
  echo "❌ $ERRORS validation check(s) failed"
  echo "Fix errors and re-run validation"
  echo "=================================="
  exit 1
fi
```

**And** script is executable: `chmod +x scripts/validate-local-setup.sh`
**And** add npm script: `"validate-setup": "scripts/validate-local-setup.sh"`
**And** documentation includes: "Run `yarn validate-setup` before starting development"

**Prerequisites:** Story 4.5 (Certificate trust documented)

**Technical Notes:**
- Validation prevents common setup issues (missing dependencies, port conflicts)
- Runs before starting development (fast feedback)
- Detects already-running services (mitmproxy, NDX server)
- Epic 4 preventive measure from Pre-mortem Analysis (User acceptance #9)

**Architecture Context:**
- **Validation Checks:**
  - mitmproxy installation (`command -v mitmproxy`)
  - Addon script exists (`scripts/mitmproxy-addon.py`)
  - Port 8080 available for NDX server (`lsof -Pi :8080`)
  - Port 8081 available for mitmproxy (`lsof -Pi :8081`)
  - mitmproxy CA certificate generated (`~/.mitmproxy/mitmproxy-ca-cert.pem`)
- **npm Script:** `yarn validate-setup` runs validation before development
- **Fast Feedback:** Catches setup issues before starting development (< 1 second)
- **Pre-mortem Preventive Measure:** Epic 4 validation prevents "works on my machine" issues

**UX Design Context:**
- **Developer Experience:** Automated validation script (no manual checklist)
- **Clear Output:** ✅/❌ status for each check, actionable error messages
- **Next Steps Guidance:** Script shows exact commands to run after validation passes

---
