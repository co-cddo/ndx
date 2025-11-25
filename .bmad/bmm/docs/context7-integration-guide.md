# Context7 MCP Integration Guide

## Overview

The BMAD agents have been enhanced with extensive Context7 MCP server integration for real-time API/SDK validation. This ensures all code uses up-to-date library documentation and best practices.

## Enhanced Agents

### 1. Dev Agent (Amelia) - 💻
**Role:** Senior Software Engineer with API/SDK Validation Expertise

**Context7 Integration:**
- ✅ Validates ALL API/SDK usage before implementation
- ✅ Queries Context7 for method signatures, parameters, return types
- ✅ Flags deprecated APIs and suggests modern alternatives
- ✅ Caches library IDs for session efficiency

**New Menu Items:**
- `*validate-api` - Validate specific library usage against Context7
- `*scan-apis` - Comprehensive codebase API/SDK validation scan

**Activation Protocol:**
```
Step 8: 🔍 API/SDK VALIDATION PROTOCOL
- BEFORE implementing ANY API/SDK code: resolve library ID
- DURING implementation: get docs with mode='code'
- For architecture questions: get docs with mode='info'
- ALWAYS validate signatures, parameters, return types
```

**Use Cases:**
- Before implementing new API integrations
- During story development
- When encountering API-related errors
- As part of code review checklist

### 2. TEA Agent (Murat) - 🧪
**Role:** Master Test Architect with Framework API Validation

**Context7 Integration:**
- ✅ Validates testing framework APIs (Playwright, Cypress, Jest, etc.)
- ✅ Verifies test patterns against official documentation
- ✅ Ensures correct fixture syntax, selectors, async patterns
- ✅ Flags deprecated test methods

**Activation Protocol:**
```
Step 6: 🔍 TEST FRAMEWORK VALIDATION
- BEFORE recommending patterns: resolve test framework ID
- Use mode='code' for test API references and assertions
- Use mode='info' for test architecture patterns
- Verify fixture syntax, selector strategies, async handling
```

**Use Cases:**
- Designing test frameworks
- Validating test automation code
- Ensuring E2E tests use correct APIs
- Updating test libraries

### 3. Architect Agent (Winston) - 🏗️
**Role:** System Architect with Library Validation

**Context7 Integration:**
- ✅ Validates library/SDK selection decisions
- ✅ Compares alternatives using Context7
- ✅ Verifies architectural patterns and scalability
- ✅ Documents technology choices with references

**Activation Protocol:**
```
Step 4: 🔍 ARCHITECTURE VALIDATION
- BEFORE selecting libraries: resolve and compare options
- DURING design: get docs with mode='info' for patterns
- For API design: get docs with mode='code' for capabilities
- Compare multiple libraries when options exist
```

**Use Cases:**
- Technology selection during architecture phase
- Evaluating library tradeoffs
- Validating SDK capabilities
- Architecture documentation

## Context7 MCP Tools

### Tool 1: `mcp__context7__resolve-library-id`

**Purpose:** Convert library name to Context7-compatible library ID

**Usage:**
```javascript
Tool: mcp__context7__resolve-library-id
Input:
  libraryName: "AWS CDK"
Output:
  Library ID: "/aws/aws-cdk"
```

**When to Use:**
- Before any Context7 documentation query
- When user mentions a library by common name
- To discover available documentation

**Best Practices:**
- Try variations: "aws-cdk", "AWS CDK", "cdk"
- Handle multiple matches: present options to user
- Cache resolved IDs for session

### Tool 2: `mcp__context7__get-library-docs`

**Purpose:** Fetch up-to-date documentation for a library

**Parameters:**
- `context7CompatibleLibraryID` - From resolve-library-id
- `mode` - 'code' or 'info'
- `topic` - Specific API/concept to query
- `page` - For pagination (default: 1)

**Mode Selection:**

#### mode='code' - Use For:
- API method signatures
- Function parameters
- Return types
- Code examples
- Specific API references
- Error handling patterns

**Example:**
```javascript
Tool: mcp__context7__get-library-docs
Input:
  context7CompatibleLibraryID: "/microsoft/playwright"
  mode: "code"
  topic: "page.locator"
Output:
  Method signature, parameters, examples for page.locator()
```

#### mode='info' - Use For:
- Architectural patterns
- Best practices
- Conceptual guides
- Migration strategies
- Integration approaches
- Scalability considerations

**Example:**
```javascript
Tool: mcp__context7__get-library-docs
Input:
  context7CompatibleLibraryID: "/microsoft/playwright"
  mode: "info"
  topic: "page object model"
Output:
  Architectural guidance on implementing page objects
```

### Pagination

If documentation is incomplete, use pagination:
```javascript
page: 1  // First query
page: 2  // If more info needed
page: 3  // Continue if necessary
```

## Validation Workflows

### Workflow 1: Single Library Validation

1. User requests or code mentions a library
2. **Resolve:** `resolve-library-id(libraryName)`
3. **Get Docs:** `get-library-docs(id, mode='code', topic=method)`
4. **Validate:** Compare code against documentation
5. **Report:** Flag issues, suggest fixes

### Workflow 2: Comprehensive Codebase Scan

1. **Discover:** Extract dependencies from package.json
2. **Resolve All:** Batch resolve all library IDs
3. **Find Usage:** Grep for import statements and API calls
4. **Validate Each:** Query Context7 for each API method found
5. **Generate Report:** Comprehensive validation with priorities
6. **Fix:** Apply corrections if requested

### Workflow 3: Architecture Decision Validation

1. **Identify Options:** User considering multiple libraries
2. **Resolve All Options:** Get Context7 IDs for each
3. **Compare Architectures:** Query with mode='info' for patterns
4. **Compare APIs:** Query with mode='code' for capabilities
5. **Document Decision:** Include Context7 references
6. **Record:** Add to architecture documentation

## New Dev Tools

### Tool: `/validate-api`
**Location:** `.bmad/bmm/agents/dev-tools/validate-api.md`

**Purpose:** Validate specific library usage against Context7

**Features:**
- Interactive library selection
- File-specific or codebase-wide scanning
- Detailed validation report
- Automated fix suggestions
- Context7 reference citations

**Output:** Markdown report with:
- Valid usage (✅)
- Warnings - deprecated/suboptimal (⚠️)
- Issues - incorrect usage (❌)
- Fix recommendations with code examples

### Tool: `/scan-apis`
**Location:** `.bmad/bmm/agents/dev-tools/scan-apis.md`

**Purpose:** Comprehensive codebase API/SDK validation

**Features:**
- Automatic dependency discovery
- Priority-based validation (P0-P3)
- Parallel Context7 queries
- Health score calculation
- Actionable recommendations

**Output:** Executive report with:
- Health score (X/100)
- Dependency inventory
- Priority issues
- Detailed findings per library
- Remediation roadmap

## Integration Examples

### Example 1: Dev Agent Implementing AWS CDK

```markdown
User: "Implement S3 bucket with lifecycle rules"

Dev Agent:
1. Loads story context
2. Identifies AWS CDK requirement
3. Resolves: resolve-library-id("AWS CDK") → "/aws/aws-cdk"
4. Queries: get-library-docs("/aws/aws-cdk", mode='code', topic='Bucket')
5. Validates: Bucket constructor signature
6. Queries: get-library-docs("/aws/aws-cdk", mode='code', topic='addLifecycleRule')
7. Implements: Using correct API signatures from Context7
8. Documents: "Validated against AWS CDK docs (/aws/aws-cdk)"
```

### Example 2: TEA Agent Validating Playwright Tests

```markdown
User: "Review these Playwright tests"

TEA Agent:
1. Reads test files
2. Identifies Playwright usage
3. Resolves: resolve-library-id("Playwright") → "/microsoft/playwright"
4. Extracts APIs: page.click(), page.waitForSelector(), etc.
5. Validates each:
   - get-library-docs("/microsoft/playwright", mode='code', topic='page.click')
   - ⚠️ Finds: page.click() is deprecated, use page.locator().click()
6. Queries alternative:
   - get-library-docs("/microsoft/playwright", mode='code', topic='page.locator')
7. Reports: "Warning: Using deprecated page.click(). Use page.locator().click()"
8. Suggests fix with Context7 reference
```

### Example 3: Architect Comparing Frameworks

```markdown
User: "Should we use Next.js or Remix?"

Architect:
1. Resolves both:
   - resolve-library-id("Next.js") → "/vercel/next.js"
   - resolve-library-id("Remix") → "/remix-run/remix"
2. Gets architectural info:
   - get-library-docs("/vercel/next.js", mode='info', topic='architecture')
   - get-library-docs("/remix-run/remix", mode='info', topic='architecture')
3. Gets API capabilities:
   - get-library-docs("/vercel/next.js", mode='code', topic='routing')
   - get-library-docs("/remix-run/remix", mode='code', topic='routing')
4. Compares: SSR, data loading, routing, deployment
5. Documents decision: "Choosing Next.js for [reasons], validated via Context7"
6. Adds references: "/vercel/next.js - Architecture patterns"
```

## Best Practices

### 1. Query Strategy
- **Start broad:** Use mode='info' to understand concepts
- **Get specific:** Use mode='code' for implementation details
- **Paginate:** Use page=2,3 if initial results incomplete
- **Cache:** Store library IDs and frequent queries

### 2. Validation Timing
- **Before:** Always query before implementing new APIs
- **During:** Validate as you implement complex integrations
- **After:** Run comprehensive scan as part of DoD

### 3. Error Handling
- **Library not found:** Try alternative names, check Context7 availability
- **API not in docs:** May be internal/custom, flag for manual review
- **Multiple versions:** Check package.json for version, use versioned ID if available

### 4. Documentation
- Always cite Context7 library IDs in code comments
- Include mode used (code/info) in documentation
- Reference specific doc sections in validation reports
- Track Context7 queries in story context

### 5. Performance
- Query in parallel when validating multiple libraries
- Cache resolved library IDs for session
- Batch similar validations
- Use pagination judiciously

## Session Variables

Track these throughout agent sessions:

```javascript
{
  resolvedLibraries: {
    "AWS CDK": "/aws/aws-cdk",
    "Playwright": "/microsoft/playwright",
    "React": "/facebook/react"
  },
  validatedAPIs: [
    {library: "/aws/aws-cdk", method: "Bucket", status: "✅"},
    {library: "/microsoft/playwright", method: "page.click", status: "⚠️ deprecated"}
  ],
  context7Queries: 15,
  validationScore: 95
}
```

## Reporting Standards

### Validation Report Structure
```markdown
# Validation Report: [Library]
**Library ID:** [Context7 ID]
**Date:** [ISO date]
**Status:** [✅/⚠️/❌]

## Summary
- Issues: [count]
- Warnings: [count]
- Queries: [count]

## Findings
[Detailed list with file:line references]

## Context7 References
[List all Context7 queries made]
```

### Story Context Addition
```xml
<api-validation date="2025-11-24">
  <library id="/aws/aws-cdk" status="validated">
    <validated>Bucket, Stack, App</validated>
    <issues>0</issues>
  </library>
</api-validation>
```

## Continuous Improvement

### Adding to CI/CD
Recommend integrating API validation into:
- Pre-commit hooks
- PR validation
- Nightly scans
- Release checks

### Trend Analysis
Track over time:
- Validation scores
- Deprecated API usage
- Library health
- Fix velocity

## Troubleshooting

### Issue: Library Not Found
**Solution:** Try variations, check Context7 availability, fallback to web search

### Issue: Incomplete Documentation
**Solution:** Use pagination (page=2,3), try broader topics, combine mode='code' and mode='info'

### Issue: Rate Limiting
**Solution:** Implement query throttling, cache results, batch similar queries

### Issue: Version Mismatch
**Solution:** Check package.json for versions, use versioned library ID if available

## Summary

With Context7 integration, BMAD agents now:
- ✅ Validate ALL API/SDK usage in real-time
- ✅ Reference up-to-date official documentation
- ✅ Flag deprecated APIs automatically
- ✅ Suggest modern alternatives with examples
- ✅ Document validation results with references
- ✅ Generate comprehensive validation reports
- ✅ Compare libraries during architecture decisions

This ensures code quality, reduces technical debt, and maintains alignment with current best practices.
