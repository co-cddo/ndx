#!/usr/bin/env python3
"""
mitmproxy Addon Script for Conditional Request Forwarding

This addon enables local Try Before You Buy feature development by conditionally
routing HTTP requests based on their path:

- UI Routes (/, /catalogue/*, /try, /assets/*) → Forward to localhost:8080 (local NDX server)
- API Routes (/api/*) → Pass through to CloudFront (real Innovation Sandbox API)
- All Other Routes → Pass through to CloudFront unchanged

The CloudFront Host header is preserved for OAuth callback URL validation.

IMPORTANT: This addon also replicates production security headers (CSP, X-Frame-Options, etc.)
on responses from the local server to ensure dev/prod parity and catch CSP violations early.

Usage:
    mitmproxy --scripts scripts/mitmproxy-addon.py --listen-port 8081

Requirements:
    - Python 3.8+
    - mitmproxy 10.x+
    - Local NDX server running on port 8080 (yarn start)

Architecture:
    Browser → mitmproxy (localhost:8081) → Conditional routing:
        - UI requests → localhost:8080 (local Eleventy server)
        - API requests → CloudFront (ndx.digital.cabinet-office.gov.uk)

For more information, see: /docs/development/local-try-setup.md
"""

from mitmproxy import http
import logging

# Configure logging for routing decisions
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Configuration constants
CLOUDFRONT_DOMAIN = "ndx.digital.cabinet-office.gov.uk"
LOCAL_SERVER_HOST = "localhost"
LOCAL_SERVER_PORT = 8080

# Production security headers from CloudFront
# These MUST match production to catch CSP violations during local development
SECURITY_HEADERS = {
    "content-security-policy": (
        "upgrade-insecure-requests; "
        "default-src 'none'; "
        "object-src 'none'; "
        "script-src 'self'; "
        "style-src 'self'; "
        "img-src 'self' data:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "manifest-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'none';"
    ),
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    # Note: HSTS is omitted for local dev as we use HTTP to localhost
    # "strict-transport-security": "max-age=46656000; includeSubDomains",
}

# UI routes that should be forwarded to local development server
UI_ROUTES = [
    "/",                # Homepage
    "/catalogue",       # Product catalogue pages (exact match)
    "/catalogue/",      # Product catalogue pages (with trailing slash or subpaths)
    "/try",             # Try sessions dashboard
    "/assets/",         # Static assets (CSS, JS, images)
]


def request(flow: http.HTTPFlow) -> None:
    """
    Intercept and conditionally route HTTP requests based on destination and path.

    This function is called by mitmproxy for each HTTP request before it is forwarded
    to the upstream server. It modifies the request destination for UI routes while
    preserving API routes unchanged.

    Args:
        flow: mitmproxy HTTPFlow object containing request/response data

    Routing Logic:
        1. Check if request is to CloudFront domain (ndx.digital.cabinet-office.gov.uk)
        2. If CloudFront domain:
           a. If path starts with /api/ → Pass through unchanged (API)
           b. Else if path matches UI routes → Forward to localhost:8080 (UI)
           c. Else → Pass through unchanged (OAuth callbacks, etc.)
        3. If not CloudFront domain → Ignore (pass through unchanged)

    Returns:
        None (modifies flow.request in-place)
    """
    # Only process requests to CloudFront domain (ignore all other domains)
    if flow.request.pretty_host != CLOUDFRONT_DOMAIN:
        return  # Pass through unchanged (not targeting CloudFront domain)

    request_path = flow.request.path

    # API routes pass through to CloudFront unchanged (preserve auth headers, OAuth, etc.)
    if request_path.startswith("/api/"):
        logging.info(f"API Route: {request_path} → CloudFront (passthrough)")
        return  # No modification - API requests go to CloudFront backend

    # Check if request path matches any UI route patterns
    is_ui_route = False
    for ui_pattern in UI_ROUTES:
        if ui_pattern == request_path or request_path.startswith(ui_pattern):
            is_ui_route = True
            break

    # UI routes forward to localhost:8080 (local NDX development server)
    if is_ui_route:
        # Preserve original Host header for OAuth callback URL validation
        # This ensures OAuth redirects work correctly (Innovation Sandbox expects CloudFront domain)
        original_host = flow.request.headers.get("Host", CLOUDFRONT_DOMAIN)

        # Modify request to route to local server
        flow.request.scheme = "http"  # Local server uses HTTP (not HTTPS)
        flow.request.host = LOCAL_SERVER_HOST
        flow.request.port = LOCAL_SERVER_PORT

        # Restore CloudFront Host header (critical for OAuth validation)
        flow.request.headers["Host"] = original_host

        # Mark this flow as locally routed so response() can add security headers
        flow.metadata["locally_routed"] = True

        logging.info(f"UI Route: {request_path} → {LOCAL_SERVER_HOST}:{LOCAL_SERVER_PORT} (Host header preserved: {original_host})")
    else:
        # Non-UI, non-API routes pass through to CloudFront unchanged
        # Examples: OAuth callbacks (/callback), other static pages
        logging.info(f"Passthrough: {request_path} → CloudFront (unchanged)")


def response(flow: http.HTTPFlow) -> None:
    """
    Inject production security headers on responses from locally-routed requests.

    This ensures that local development mirrors production CSP behavior,
    allowing developers to catch CSP violations before deploying to production.

    Args:
        flow: mitmproxy HTTPFlow object containing request/response data

    Security Headers Added:
        - Content-Security-Policy: Restricts resource loading to 'self'
        - X-Frame-Options: DENY - Prevents clickjacking
        - X-Content-Type-Options: nosniff - Prevents MIME sniffing
        - Referrer-Policy: no-referrer - Prevents referrer leakage

    Note:
        HSTS header is omitted for local dev as we use HTTP to localhost.
        In production, CloudFront adds HSTS via response headers policy.

    Returns:
        None (modifies flow.response in-place)
    """
    # Only add security headers to responses from locally-routed requests
    if not flow.metadata.get("locally_routed"):
        return

    # Add production security headers to match CloudFront configuration
    for header_name, header_value in SECURITY_HEADERS.items():
        flow.response.headers[header_name] = header_value

    logging.debug(f"Added security headers to response: {flow.request.path}")


# mitmproxy addon registration
# This list is required for mitmproxy to discover and load the addon
addons = [
    # No class-based addon needed for this simple request() function
    # mitmproxy automatically discovers module-level request() function
]
