# API/SDK Validation Tool (Context7 Integration)

## Purpose
Validate API/SDK usage in code against up-to-date official documentation using the Context7 MCP server.

## Execution Steps

### 1. Gather Input
Ask the user to specify:
- **Library/SDK name** (e.g., "AWS CDK", "Playwright", "React", "Express")
- **Optional: Specific files to validate** (or scan entire codebase)
- **Optional: Specific API methods to validate** (or validate all found usage)

### 2. Resolve Library ID
Use Context7 to resolve the library name to a valid library ID:

```
TOOL: mcp__context7__resolve-library-id
INPUT: libraryName = [user-provided library name]
OUTPUT: Store the library ID (e.g., '/aws/aws-cdk', '/microsoft/playwright')
```

**Decision Point:**
- If multiple matches found: Present options to user and ask them to select
- If no matches found: Ask user to refine the library name or provide the exact Context7 library ID
- If single match found: Proceed to validation

### 3. Search for API Usage
Search the codebase for usage of the specified library:

```
TOOL: Grep
PATTERN: Import statements, require calls, or API method calls
EXAMPLES:
  - "import.*from.*[library-name]"
  - "require\\(['\"][library-name]"
  - Specific method patterns if known
```

### 4. Extract API Calls
For each file found:
1. Read the file
2. Identify all API method calls, class instantiations, and function invocations
3. Create a list of unique APIs being used

### 5. Validate Each API with Context7

For each API identified, validate against official documentation:

#### 5a. Get Code Documentation
```
TOOL: mcp__context7__get-library-docs
INPUT:
  - context7CompatibleLibraryID = [resolved library ID]
  - mode = 'code'
  - topic = [specific API method or class name]
OUTPUT: Official API signature, parameters, return types
```

#### 5b. Compare Usage Against Documentation
For each API usage found:
- ✅ **PASS:** Method signature matches, parameters correct, proper error handling
- ⚠️ **WARNING:** Works but deprecated, better alternatives available, missing recommended options
- ❌ **FAIL:** Incorrect parameters, wrong return type handling, API doesn't exist

#### 5c. Get Conceptual Info (if needed)
If usage pattern seems incorrect:
```
TOOL: mcp__context7__get-library-docs
INPUT:
  - context7CompatibleLibraryID = [resolved library ID]
  - mode = 'info'
  - topic = [concept or pattern, e.g., "authentication", "error handling"]
OUTPUT: Best practices, common patterns, architectural guidance
```

### 6. Generate Validation Report

Create a structured report:

```markdown
# API Validation Report: [Library Name]

**Library ID:** [Context7 library ID]
**Date:** [Current date]
**Files Scanned:** [Count]
**APIs Validated:** [Count]

## Summary
- ✅ Valid Usage: [count]
- ⚠️ Warnings: [count]
- ❌ Issues: [count]

## Detailed Findings

### ✅ Valid Usage
[List APIs that are correctly implemented]

### ⚠️ Warnings
[List deprecated APIs, suboptimal patterns, missing recommended options]
- **File:** [path:line]
- **Current:** [code snippet]
- **Issue:** [description]
- **Recommendation:** [suggested fix with code example]
- **Context7 Reference:** [specific doc section]

### ❌ Issues Found
[List incorrect API usage, wrong signatures, etc.]
- **File:** [path:line]
- **Current:** [code snippet]
- **Issue:** [description]
- **Correct Usage:** [code example from Context7 docs]
- **Context7 Reference:** [specific doc section]

## Recommendations
[Summary of suggested actions]

## Context7 Library Information
- **Library ID:** [full ID]
- **Documentation Mode Used:** code, info
- **Topics Queried:** [list]
```

### 7. Offer Fixes
Ask the user if they want you to:
1. Fix issues automatically
2. Apply specific fixes they select
3. Just keep the report for manual fixing

### 8. Update Story Context (if applicable)
If running within a story context, add validation results to the story notes:
- APIs validated
- Library versions confirmed
- Any changes made

## Best Practices

### When to Use This Tool
- Before implementing new API integrations
- After upgrading library versions
- During code review for API-heavy features
- When encountering API-related errors
- As part of story completion checklist

### Context7 Query Optimization
- **First query:** Use broad topic to understand the API surface
- **Subsequent queries:** Use specific method/class names
- **Use mode='code'** for: API references, method signatures, parameters, examples
- **Use mode='info'** for: Architecture, patterns, best practices, migration guides
- **Pagination:** If results incomplete, try page=2, page=3 with same topic

### Caching Strategy
During a session:
1. Store library IDs to avoid re-resolution
2. Cache frequently accessed API documentation
3. Reuse patterns across similar validations

## Error Handling

### Library Not Found
- Try alternative names (e.g., "aws-cdk" vs "AWS CDK" vs "cdk")
- Check if library is available in Context7
- Suggest manual documentation lookup as fallback

### API Not Found in Docs
- Could be internal/custom API
- Could be from older version
- Try broader topic search
- Flag for manual verification

### Multiple Library Versions
- Context7 may have multiple versions
- Identify which version is in package.json/requirements.txt
- Use version-specific library ID if available

## Exit
Return control to the Dev agent main menu.
