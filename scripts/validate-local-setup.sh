#!/bin/bash
# validate-local-setup.sh
# Automated prerequisite checks for NDX Try feature local development
#
# Exit codes:
#   0 - All critical checks passed (warnings allowed)
#   1 - One or more critical checks failed
#
# Critical checks (must pass):
#   - mitmproxy installed
#   - Addon script exists
#
# Warning checks (informational):
#   - Port 8080 available
#   - Port 8081 available
#   - CA certificate generated

# Track failed checks (critical only)
FAILED_CHECKS=0

echo "Validating local development setup..."
echo ""

# ============================================================================
# Check 1: mitmproxy installed (CRITICAL)
# ============================================================================
if command -v mitmproxy >/dev/null 2>&1; then
  VERSION=$(mitmproxy --version 2>/dev/null | head -n 1 || echo "unknown version")
  echo "✅ mitmproxy installed ($VERSION)"
else
  echo "❌ mitmproxy not installed"
  echo "   → Run: pip install mitmproxy"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ============================================================================
# Check 2: Addon script exists (CRITICAL)
# ============================================================================
if [ -f "scripts/mitmproxy-addon.py" ]; then
  echo "✅ Addon script found"
else
  echo "❌ Addon script missing"
  echo "   → Expected: scripts/mitmproxy-addon.py"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ============================================================================
# Check 3: Port 8080 available (WARNING)
# ============================================================================
PORT_8080_IN_USE=false

# Try lsof first (macOS/Linux)
if command -v lsof >/dev/null 2>&1; then
  if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT_8080_IN_USE=true
  fi
else
  # Fallback to netstat (Windows Git Bash, minimal Linux distros)
  if command -v netstat >/dev/null 2>&1; then
    if netstat -an 2>/dev/null | grep -E '(:8080|\.8080).*LISTEN' >/dev/null 2>&1; then
      PORT_8080_IN_USE=true
    fi
  else
    # Neither lsof nor netstat available - skip check with notice
    echo "ℹ️  Port 8080 check skipped (lsof/netstat not available)"
    PORT_8080_IN_USE="unknown"
  fi
fi

if [ "$PORT_8080_IN_USE" = "true" ]; then
  echo "⚠️  Port 8080 already in use (service may be running)"
elif [ "$PORT_8080_IN_USE" = "false" ]; then
  echo "✅ Port 8080 available"
fi

# ============================================================================
# Check 4: Port 8081 available (WARNING)
# ============================================================================
PORT_8081_IN_USE=false

# Try lsof first (macOS/Linux)
if command -v lsof >/dev/null 2>&1; then
  if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PORT_8081_IN_USE=true
  fi
else
  # Fallback to netstat (Windows Git Bash, minimal Linux distros)
  if command -v netstat >/dev/null 2>&1; then
    if netstat -an 2>/dev/null | grep -E '(:8081|\.8081).*LISTEN' >/dev/null 2>&1; then
      PORT_8081_IN_USE=true
    fi
  else
    # Neither lsof nor netstat available - skip check with notice
    echo "ℹ️  Port 8081 check skipped (lsof/netstat not available)"
    PORT_8081_IN_USE="unknown"
  fi
fi

if [ "$PORT_8081_IN_USE" = "true" ]; then
  echo "⚠️  Port 8081 already in use (service may be running)"
elif [ "$PORT_8081_IN_USE" = "false" ]; then
  echo "✅ Port 8081 available"
fi

# ============================================================================
# Check 5: CA certificate generated (WARNING)
# ============================================================================
CERT_PATH="$HOME/.mitmproxy/mitmproxy-ca-cert.pem"

if [ -f "$CERT_PATH" ]; then
  echo "✅ CA certificate generated"
else
  echo "⚠️  CA certificate not found"
  echo "   → Run 'yarn dev:proxy' to generate (first-time setup)"
fi

# ============================================================================
# Summary and exit
# ============================================================================
echo ""
if [ $FAILED_CHECKS -eq 0 ]; then
  echo "✅ Setup validation passed! Ready for development."
  exit 0
else
  echo "❌ $FAILED_CHECKS validation check(s) failed. Fix errors above and retry."
  exit 1
fi
