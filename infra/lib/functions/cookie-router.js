// CloudFront Function for NDX cookie-based origin routing
// Runtime: cloudfront-js-2.0
//
// This function inspects the NDX cookie to determine which S3 origin to use:
// - NDX=legacy: Route to default cache behavior origin (legacy S3Origin)
// - Any other value or no cookie: Route to ndx-static-prod with OAC
//
// Also handles URI rewriting for S3 compatibility:
// - Trailing slash URIs get /index.html appended
// - URIs without file extension get /index.html appended
import cf from "cloudfront"

function handler(event) {
  var request = event.request
  var cookies = request.cookies || {}
  var uri = request.uri

  // Check if NDX cookie exists and has value 'legacy' (opt-out of new origin)
  var ndxCookie = cookies["NDX"]

  if (ndxCookie && ndxCookie.value === "legacy") {
    // Use default cache behavior origin (old S3Origin) - no modification
    // Legacy ISB is an SPA - all non-file URLs go to /index.html
    const hasType = request.uri.split(/#|\?/)[0].split(".").length >= 2
    if (!hasType) {
      request.uri = "/index.html"
    }
    return request
  }

  // Handle directory-style URLs for S3 compatibility (NDX static site)
  if (uri.endsWith("/")) {
    request.uri = uri + "index.html"
  } else if (uri.indexOf(".") === -1) {
    // No file extension - treat as directory
    request.uri = uri + "/index.html"
  }

  // Default: route to ndx-static-prod with OAC authentication
  cf.updateRequestOrigin({
    domainName: "ndx-static-prod.s3.us-west-2.amazonaws.com",
  })

  return request
}
