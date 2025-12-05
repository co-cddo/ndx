function handler(event) {
  var request = event.request
  var uri = request.uri

  // Strip /api prefix: /api/vendors → /vendors
  // Combined with origin path /prod: final = /prod/vendors
  if (uri.startsWith("/api/")) {
    request.uri = uri.substring(4) // Remove '/api'
  }

  return request
}
