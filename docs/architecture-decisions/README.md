# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the Try Before You Buy feature.

## ADR Index

### Core Architecture
- [ADR-017: Try Button Integration](ADR-017-try-button.md) - Client-side Try button with authentication and modal
- [ADR-021: Centralized API Client](ADR-021-centralized-api-client.md) - Single API module with auth interceptor
- [ADR-023: OAuth Callback Pattern](ADR-023-oauth-callback-pattern.md) - Secure OAuth flow implementation
- [ADR-024: Auth State Management](ADR-024-auth-state-management.md) - Observer pattern for authentication
- [ADR-026: Accessible Modal Pattern](ADR-026-accessible-modal-pattern.md) - WCAG 2.2 AA compliant modal
- [ADR-028: Request Deduplication](ADR-028-request-deduplication.md) - Prevent concurrent duplicate API calls
- [ADR-032: User-Friendly Error Messages](ADR-032-user-friendly-error-messages.md) - GOV.UK style error handling

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-XXX: Title

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?

## Implementation
Code examples and file locations.
```

## Related Documentation

- [Main Architecture Document](../try-before-you-buy-architecture.md) - Complete architecture specification
- [PRD](../prd.md) - Product Requirements Document
- [Development Guide](../development-guide.md) - Development setup and patterns
