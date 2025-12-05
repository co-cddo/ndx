function handler(event) {
  var request = event.request
  var uri = request.uri

  // SPA routing: extensionless URIs → /index.html
  if (!uri.includes(".") && uri !== "/") {
    request.uri = "/index.html"
  }

  return request
}
