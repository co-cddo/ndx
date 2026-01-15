# ADR-046: Rate Limiting via CloudFront WAF

## Status
Accepted

## Context
The signup endpoint could be abused for enumeration attacks or denial of service. Rate limiting is needed to protect the service and prevent abuse.

## Decision
1. **WAF-based limiting**: CloudFront WAF applies rate limits before requests reach Lambda
2. **Rate limit**: 100 requests per 5 minutes per IP address for signup endpoint
3. **Response**: Blocked requests receive 429 Too Many Requests
4. **Timing jitter**: Lambda adds 50-150ms random delay to prevent timing attacks

## Consequences
- **Protection**: Automated attacks are throttled at the edge
- **User experience**: Legitimate users unlikely to hit limits
- **Cost**: WAF rules incur additional cost but reduce Lambda invocations
- **Bypass**: Attackers with many IPs can circumvent IP-based limits

## Implementation
- WAF stack: `infra/lib/waf-stack.ts`
- Timing delay: `infra-signup/lib/lambda/signup/handler.ts` (`addTimingDelay()`)
- CloudFront integration: WAF associated with distribution
