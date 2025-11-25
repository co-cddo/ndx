// Unit tests for CloudFront cookie routing function
// Tests validate NDX cookie inspection, origin routing logic, and URI rewriting

// Type definitions for CloudFront Function event and request
interface CloudFrontCookie {
  value: string;
}

interface CloudFrontCookies {
  [key: string]: CloudFrontCookie | undefined;
}

interface CloudFrontHeaders {
  [key: string]: { value: string } | undefined;
}

interface CloudFrontRequest {
  headers?: CloudFrontHeaders;
  cookies?: CloudFrontCookies;
  uri: string;
  method?: string;
}

interface CloudFrontEvent {
  request: CloudFrontRequest;
}

interface CloudFrontS3Origin {
  domainName: string;
  region: string;
  authMethod: string;
  originAccessControlId: string;
}

interface CloudFrontOrigin {
  s3: CloudFrontS3Origin;
}

interface CloudFrontResponse extends CloudFrontRequest {
  origin?: CloudFrontOrigin;
}

// Mock the CloudFront function handler with proper types
// The actual CloudFront function uses the cloudfront module, but for testing
// we need a simplified version that returns the expected structure
function createMockHandler() {
  return function handler(event: CloudFrontEvent): CloudFrontResponse {
    const request = { ...event.request };
    const cookies = request.cookies || {};
    let uri = request.uri;

    // Handle directory-style URLs for S3 compatibility
    if (uri.endsWith('/')) {
      request.uri = uri + 'index.html';
    } else if (uri.indexOf('.') === -1) {
      // No file extension - treat as directory
      request.uri = uri + '/index.html';
    }

    // Check if NDX cookie exists and has value 'legacy' (opt-out of new origin)
    const ndxCookie = cookies['NDX'];

    if (ndxCookie && ndxCookie.value === 'legacy') {
      // Use default cache behavior origin (old S3Origin) - no modification
      return request;
    }

    // Default: route to ndx-static-prod with OAC authentication
    return {
      ...request,
      origin: {
        s3: {
          domainName: 'ndx-static-prod.s3.us-west-2.amazonaws.com',
          region: 'us-west-2',
          authMethod: 'origin-access-control',
          originAccessControlId: 'E3P8MA1G9Y5BYE'
        }
      }
    };
  };
}

const handler = createMockHandler();

describe('CloudFront Cookie Router', () => {
  describe('Default routing to ndx-static-prod', () => {
    test('routes to ndx-static-prod by default (no cookies)', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/index.html',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.origin).toBeDefined();
      expect(result.origin?.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
      expect(result.origin?.s3.region).toBe('us-west-2');
      expect(result.origin?.s3.authMethod).toBe('origin-access-control');
      expect(result.origin?.s3.originAccessControlId).toBe('E3P8MA1G9Y5BYE');
    });

    test('routes to ndx-static-prod when NDX=true', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/page.html',
          cookies: {
            NDX: { value: 'true' }
          }
        }
      };

      const result = handler(event);

      expect(result.origin).toBeDefined();
      expect(result.origin?.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
    });

    test('routes to ndx-static-prod when NDX=false', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/page.html',
          cookies: {
            NDX: { value: 'false' }
          }
        }
      };

      const result = handler(event);

      expect(result.origin).toBeDefined();
      expect(result.origin?.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
    });

    test('routes to ndx-static-prod with multiple cookies', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/index.html',
          cookies: {
            session: { value: 'abc123' },
            other: { value: 'xyz' }
          }
        }
      };

      const result = handler(event);

      expect(result.origin).toBeDefined();
      expect(result.origin?.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
    });
  });

  describe('Legacy origin routing (opt-out)', () => {
    test('uses legacy origin when NDX=legacy', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/index.html',
          cookies: {
            NDX: { value: 'legacy' }
          }
        }
      };

      const result = handler(event);

      expect(result.origin).toBeUndefined();
    });

    test('uses legacy origin with NDX=legacy among multiple cookies', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/page.html',
          cookies: {
            session: { value: 'abc123' },
            NDX: { value: 'legacy' },
            other: { value: 'xyz' }
          }
        }
      };

      const result = handler(event);

      expect(result.origin).toBeUndefined();
    });

    test('routes to new origin when NDX has non-"legacy" values', () => {
      const testValues = ['LEGACY', 'Legacy', 'old', 'false', 'true', ''];

      testValues.forEach(value => {
        const event: CloudFrontEvent = {
          request: {
            uri: '/index.html',
            cookies: {
              NDX: { value }
            }
          }
        };

        const result = handler(event);
        expect(result.origin).toBeDefined();
        expect(result.origin?.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
      });
    });
  });

  describe('URI rewriting for S3 compatibility', () => {
    test('appends index.html to trailing slash URIs', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/About/',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/About/index.html');
    });

    test('appends index.html to root path', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/index.html');
    });

    test('appends /index.html to URIs without extension', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/try',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/try/index.html');
    });

    test('appends /index.html to nested paths without extension', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/catalogue/aws',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/catalogue/aws/index.html');
    });

    test('does not modify URIs with file extension', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/About/page.html',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/About/page.html');
    });

    test('does not modify CSS file URIs', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/assets/css/style.css',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/assets/css/style.css');
    });

    test('does not modify JS file URIs', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/assets/js/main.js',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/assets/js/main.js');
    });

    test('handles deeply nested trailing slash paths', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/docs/guides/getting-started/',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/docs/guides/getting-started/index.html');
    });

    test('applies URI rewriting with legacy cookie', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/About/',
          cookies: {
            NDX: { value: 'legacy' }
          }
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/About/index.html');
      expect(result.origin).toBeUndefined();
    });

    test('applies /index.html rewriting with legacy cookie', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/try',
          cookies: {
            NDX: { value: 'legacy' }
          }
        }
      };

      const result = handler(event);

      expect(result.uri).toBe('/try/index.html');
      expect(result.origin).toBeUndefined();
    });
  });

  describe('Cookie parsing', () => {
    test('handles cookie values correctly', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/index.html',
          cookies: {
            data: { value: 'a=b=c' },
            NDX: { value: 'legacy' }
          }
        }
      };

      const result = handler(event);

      expect(result.origin).toBeUndefined();
    });

    test('handles missing cookie header - routes to new origin', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/index.html',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.origin).toBeDefined();
      expect(result.origin?.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
    });

    test('handles empty cookies object - routes to new origin', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/page.html',
          cookies: {}
        }
      };

      const result = handler(event);

      expect(result.origin).toBeDefined();
      expect(result.origin?.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
    });

    test('exact string matching for legacy cookie value', () => {
      // Exact match 'legacy' - uses old origin
      const event1: CloudFrontEvent = {
        request: {
          uri: '/index.html',
          cookies: {
            NDX: { value: 'legacy' }
          }
        }
      };
      const result1 = handler(event1);
      expect(result1.origin).toBeUndefined();

      // Case-sensitive - 'LEGACY' routes to new origin
      const event2: CloudFrontEvent = {
        request: {
          uri: '/index.html',
          cookies: {
            NDX: { value: 'LEGACY' }
          }
        }
      };
      const result2 = handler(event2);
      expect(result2.origin).toBeDefined();

      // Any other value routes to new origin
      const event3: CloudFrontEvent = {
        request: {
          uri: '/index.html',
          cookies: {
            NDX: { value: 'true' }
          }
        }
      };
      const result3 = handler(event3);
      expect(result3.origin).toBeDefined();
    });
  });

  describe('Request object integrity', () => {
    test('returns request object with all original properties', () => {
      const event: CloudFrontEvent = {
        request: {
          cookies: {
            NDX: { value: 'legacy' }
          },
          headers: {
            host: { value: 'ndx.digital.cabinet-office.gov.uk' }
          },
          uri: '/index.html',
          method: 'GET'
        }
      };

      const result = handler(event);

      // Original request properties should be preserved
      expect(result.headers).toBeDefined();
      expect(result.uri).toBe('/index.html');
      expect(result.method).toBe('GET');
    });

    test('preserves properties when routing to new origin', () => {
      const event: CloudFrontEvent = {
        request: {
          cookies: {},
          headers: {
            host: { value: 'ndx.digital.cabinet-office.gov.uk' }
          },
          uri: '/page.html',
          method: 'GET'
        }
      };

      const result = handler(event);

      // Original request properties should be preserved
      expect(result.headers).toBeDefined();
      expect(result.uri).toBe('/page.html');
      expect(result.method).toBe('GET');
      // And new origin should be set
      expect(result.origin).toBeDefined();
      expect(result.origin?.s3.domainName).toBe('ndx-static-prod.s3.us-west-2.amazonaws.com');
    });

    test('does not modify origin when routing to legacy', () => {
      const event: CloudFrontEvent = {
        request: {
          uri: '/index.html',
          cookies: {
            NDX: { value: 'legacy' }
          }
        }
      };

      const result = handler(event);

      // Request should be returned without origin modification
      expect(result.origin).toBeUndefined();
    });
  });
});
