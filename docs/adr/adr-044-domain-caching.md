# ADR-044: Domain Allowlist Caching

## Status
Accepted

## Context
The signup form displays a dropdown of allowed email domains, fetched from a GitHub-hosted JSON file. Fetching this file on every request would be slow and create dependency on GitHub availability.

## Decision
1. **In-memory caching**: Domain list is cached in Lambda's module-level memory
2. **5-minute TTL**: Cache expires after 5 minutes to balance freshness with performance
3. **Graceful fallback**: If GitHub is unavailable, stale cache is returned with a warning log
4. **Fail-safe**: If GitHub fails and no cache exists, the request fails with 503

## Consequences
- **Performance**: Cold starts fetch from GitHub; warm invocations use cache (sub-50ms)
- **Reliability**: Service degrades gracefully when GitHub is down
- **Consistency**: Domain list updates propagate within 5 minutes
- **Monitoring**: WARN-level logs indicate when stale cache is used

## Implementation
- Cache logic: `infra-signup/lib/lambda/signup/domain-service.ts`
- TTL constant: `CACHE_TTL_MS = 5 * 60 * 1000`
- Source URL: `https://raw.githubusercontent.com/govuk-digital-backbone/ukps-domains/main/data/user_domains.json`
