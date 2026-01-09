// Unit tests for CloudFront cookie routing function
// Tests validate NDX cookie inspection, origin routing logic, and URI rewriting

// Type definitions for CloudFront Function event and request
interface CloudFrontCookie {
  value: string
}

interface CloudFrontCookies {
  [key: string]: CloudFrontCookie | undefined
}

interface CloudFrontHeaders {
  [key: string]: { value: string } | undefined
}

interface CloudFrontRequest {
  headers?: CloudFrontHeaders
  cookies?: CloudFrontCookies
  uri: string
  method?: string
}

interface CloudFrontEvent {
  request: CloudFrontRequest
}

interface UpdateOriginOptions {
  domainName: string
}

// Mock for cf.updateRequestOrigin - tracks calls
let updateRequestOriginCalls: UpdateOriginOptions[] = []

const mockCf = {
  updateRequestOrigin: (options: UpdateOriginOptions) => {
    updateRequestOriginCalls.push(options)
  },
}

// Mock the CloudFront function handler with proper types
// Simulates the actual CloudFront function behavior using cf.updateRequestOrigin
function createMockHandler() {
  return function handler(event: CloudFrontEvent): CloudFrontRequest {
    const request = { ...event.request }
    const cookies = request.cookies || {}
    const uri = request.uri

    // Check if NDX cookie exists and has value 'legacy' (opt-out of new origin)
    const ndxCookie = cookies["NDX"]

    if (ndxCookie && ndxCookie.value === "legacy") {
      // Use default cache behavior origin (old S3Origin) - no modification
      // Legacy ISB is an SPA - all non-file URLs go to /index.html
      // Use indexOf/lastIndexOf instead of split() for performance - CloudFront Functions
      // have a strict 1ms execution limit and split() operations timeout on longer URIs
      const dotPos = uri.lastIndexOf(".")
      const slashPos = uri.lastIndexOf("/")
      const queryPos = uri.indexOf("?")
      const hashPos = uri.indexOf("#")
      // Has extension if dot exists after last slash and before any query/fragment
      const hasType =
        dotPos > slashPos &&
        (queryPos === -1 || dotPos < queryPos) &&
        (hashPos === -1 || dotPos < hashPos)
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
    mockCf.updateRequestOrigin({
      domainName: "ndx-static-prod.s3.us-west-2.amazonaws.com",
    })

    return request
  }
}

const handler = createMockHandler()

describe("CloudFront Cookie Router", () => {
  beforeEach(() => {
    // Reset mock calls before each test
    updateRequestOriginCalls = []
  })

  describe("Default routing to ndx-static-prod", () => {
    test("routes to ndx-static-prod by default (no cookies)", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/index.html",
          cookies: {},
        },
      }

      handler(event)

      expect(updateRequestOriginCalls).toHaveLength(1)
      expect(updateRequestOriginCalls[0].domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
    })

    test("routes to ndx-static-prod when NDX=true", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/page.html",
          cookies: {
            NDX: { value: "true" },
          },
        },
      }

      handler(event)

      expect(updateRequestOriginCalls).toHaveLength(1)
      expect(updateRequestOriginCalls[0].domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
    })

    test("routes to ndx-static-prod when NDX=false", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/page.html",
          cookies: {
            NDX: { value: "false" },
          },
        },
      }

      handler(event)

      expect(updateRequestOriginCalls).toHaveLength(1)
      expect(updateRequestOriginCalls[0].domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
    })

    test("routes to ndx-static-prod with multiple cookies", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/index.html",
          cookies: {
            session: { value: "abc123" },
            other: { value: "xyz" },
          },
        },
      }

      handler(event)

      expect(updateRequestOriginCalls).toHaveLength(1)
      expect(updateRequestOriginCalls[0].domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
    })
  })

  describe("Legacy origin routing (opt-out)", () => {
    test("uses legacy origin when NDX=legacy", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/index.html",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      handler(event)

      // No origin update should be called for legacy
      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("uses legacy origin with NDX=legacy among multiple cookies", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/page.html",
          cookies: {
            session: { value: "abc123" },
            NDX: { value: "legacy" },
            other: { value: "xyz" },
          },
        },
      }

      handler(event)

      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test('routes to new origin when NDX has non-"legacy" values', () => {
      const testValues = ["LEGACY", "Legacy", "old", "false", "true", ""]

      testValues.forEach((value) => {
        updateRequestOriginCalls = [] // Reset for each iteration

        const event: CloudFrontEvent = {
          request: {
            uri: "/index.html",
            cookies: {
              NDX: { value },
            },
          },
        }

        handler(event)

        expect(updateRequestOriginCalls).toHaveLength(1)
        expect(updateRequestOriginCalls[0].domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
      })
    })
  })

  describe("URI rewriting for S3 compatibility", () => {
    test("appends index.html to trailing slash URIs", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/About/",
          cookies: {},
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/About/index.html")
    })

    test("appends index.html to root path", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/",
          cookies: {},
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/index.html")
    })

    test("appends /index.html to URIs without extension", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/try",
          cookies: {},
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/try/index.html")
    })

    test("appends /index.html to nested paths without extension", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/catalogue/aws",
          cookies: {},
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/catalogue/aws/index.html")
    })

    test("does not modify URIs with file extension", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/About/page.html",
          cookies: {},
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/About/page.html")
    })

    test("does not modify CSS file URIs", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/assets/css/style.css",
          cookies: {},
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/assets/css/style.css")
    })

    test("does not modify JS file URIs", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/assets/js/main.js",
          cookies: {},
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/assets/js/main.js")
    })

    test("handles deeply nested trailing slash paths", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/docs/guides/getting-started/",
          cookies: {},
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/docs/guides/getting-started/index.html")
    })

    test("legacy SPA routes non-file URLs to /index.html", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/About/",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      const result = handler(event)

      // Legacy ISB is an SPA - all non-file URLs go to /index.html
      expect(result.uri).toBe("/index.html")
      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("legacy SPA routes paths without extension to /index.html", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/try",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      const result = handler(event)

      // Legacy ISB is an SPA - all non-file URLs go to /index.html
      expect(result.uri).toBe("/index.html")
      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("legacy SPA preserves file URLs with extensions", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/assets/style.css",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      const result = handler(event)

      // Files with extensions are preserved for legacy
      expect(result.uri).toBe("/assets/style.css")
      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("legacy SPA handles long base64 URIs (approvals route)", () => {
      // This URI is 109 chars - previously caused timeout with split() implementation
      const event: CloudFrontEvent = {
        request: {
          uri: "/approvals/eyJ1c2VyRW1haWwiOiJuZHgrdGVzdEBkc2l0Lvdi51ayIsIWQ2ZDBjNS1hNTRkLTRhMmMtOGNy1iNTI4ODlhNTQ0M==",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      const result = handler(event)

      // Long SPA routes should work without timeout
      expect(result.uri).toBe("/index.html")
      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("legacy SPA handles very long URIs (200+ chars)", () => {
      // Very long URI to ensure no performance issues
      const longPath = "/some/very/long/path/" + "a".repeat(200)
      const event: CloudFrontEvent = {
        request: {
          uri: longPath,
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/index.html")
      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("legacy SPA handles URIs with query strings", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/approvals/abc123?tab=details",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      const result = handler(event)

      // URI without extension before query string should route to /index.html
      expect(result.uri).toBe("/index.html")
      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("legacy SPA handles URIs with hash fragments", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/approvals/abc123#section",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      const result = handler(event)

      expect(result.uri).toBe("/index.html")
      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("legacy SPA preserves files with dot in directory path", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/path.with.dots/file",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      const result = handler(event)

      // No extension after the last slash, should route to /index.html
      expect(result.uri).toBe("/index.html")
      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("legacy SPA preserves actual file in dotted path", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/path.with.dots/file.js",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      const result = handler(event)

      // Has extension after last slash, should preserve URI
      expect(result.uri).toBe("/path.with.dots/file.js")
      expect(updateRequestOriginCalls).toHaveLength(0)
    })
  })

  describe("Cookie parsing", () => {
    test("handles cookie values correctly", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/index.html",
          cookies: {
            data: { value: "a=b=c" },
            NDX: { value: "legacy" },
          },
        },
      }

      handler(event)

      expect(updateRequestOriginCalls).toHaveLength(0)
    })

    test("handles missing cookie header - routes to new origin", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/index.html",
          cookies: {},
        },
      }

      handler(event)

      expect(updateRequestOriginCalls).toHaveLength(1)
      expect(updateRequestOriginCalls[0].domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
    })

    test("handles empty cookies object - routes to new origin", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/page.html",
          cookies: {},
        },
      }

      handler(event)

      expect(updateRequestOriginCalls).toHaveLength(1)
      expect(updateRequestOriginCalls[0].domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
    })

    test("exact string matching for legacy cookie value", () => {
      // Exact match 'legacy' - uses old origin
      const event1: CloudFrontEvent = {
        request: {
          uri: "/index.html",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }
      handler(event1)
      expect(updateRequestOriginCalls).toHaveLength(0)

      // Case-sensitive - 'LEGACY' routes to new origin
      updateRequestOriginCalls = []
      const event2: CloudFrontEvent = {
        request: {
          uri: "/index.html",
          cookies: {
            NDX: { value: "LEGACY" },
          },
        },
      }
      handler(event2)
      expect(updateRequestOriginCalls).toHaveLength(1)

      // Any other value routes to new origin
      updateRequestOriginCalls = []
      const event3: CloudFrontEvent = {
        request: {
          uri: "/index.html",
          cookies: {
            NDX: { value: "true" },
          },
        },
      }
      handler(event3)
      expect(updateRequestOriginCalls).toHaveLength(1)
    })
  })

  describe("Request object integrity", () => {
    test("returns request object with all original properties", () => {
      const event: CloudFrontEvent = {
        request: {
          cookies: {
            NDX: { value: "legacy" },
          },
          headers: {
            host: { value: "ndx.digital.cabinet-office.gov.uk" },
          },
          uri: "/index.html",
          method: "GET",
        },
      }

      const result = handler(event)

      // Original request properties should be preserved
      expect(result.headers).toBeDefined()
      expect(result.uri).toBe("/index.html")
      expect(result.method).toBe("GET")
    })

    test("preserves properties when routing to new origin", () => {
      const event: CloudFrontEvent = {
        request: {
          cookies: {},
          headers: {
            host: { value: "ndx.digital.cabinet-office.gov.uk" },
          },
          uri: "/page.html",
          method: "GET",
        },
      }

      const result = handler(event)

      // Original request properties should be preserved
      expect(result.headers).toBeDefined()
      expect(result.uri).toBe("/page.html")
      expect(result.method).toBe("GET")
      // Origin update should have been called
      expect(updateRequestOriginCalls).toHaveLength(1)
      expect(updateRequestOriginCalls[0].domainName).toBe("ndx-static-prod.s3.us-west-2.amazonaws.com")
    })

    test("does not modify origin when routing to legacy", () => {
      const event: CloudFrontEvent = {
        request: {
          uri: "/index.html",
          cookies: {
            NDX: { value: "legacy" },
          },
        },
      }

      handler(event)

      // Request should be returned without origin modification
      expect(updateRequestOriginCalls).toHaveLength(0)
    })
  })
})
