# Comprehensive API/SDK Scanner (Context7 Integration)

## Purpose
Scan the entire codebase to discover all external API/SDK dependencies and validate their usage against up-to-date documentation via Context7.

## Execution Steps

### 1. Discovery Phase

#### 1a. Identify Dependencies
Read project dependency files:
- `package.json` (Node.js)
- `requirements.txt` or `pyproject.toml` (Python)
- `Gemfile` (Ruby)
- `Cargo.toml` (Rust)
- `pom.xml` or `build.gradle` (Java)
- `go.mod` (Go)

Extract all external dependencies with versions.

#### 1b. Identify Import Patterns
Scan all source files for import/require statements:

```
TOOL: Grep
PATTERNS:
  - "^import .* from ['\"].*['\"]"  (ES6 imports)
  - "^const .* = require\\(['\"].*['\"]\\)"  (CommonJS)
  - "^import .*"  (Python)
  - "^use .*;"  (Rust)
  - "^import .*;$"  (Java)
```

#### 1c. Categorize Dependencies
Group dependencies:
- **Core Libraries:** Major frameworks (React, Express, FastAPI, etc.)
- **AWS/Cloud SDKs:** AWS SDK, GCP SDK, Azure SDK
- **Testing Frameworks:** Jest, Playwright, Cypress, Pytest
- **Utilities:** Lodash, date-fns, axios
- **Internal/Local:** Skip these from Context7 validation

### 2. Prioritization

Create a prioritized validation queue based on:
1. **Critical (P0):** Auth/Security libraries, Payment SDKs, Database clients
2. **High (P1):** Main framework, Core business logic libraries
3. **Medium (P2):** Utility libraries with significant usage
4. **Low (P3):** Dev dependencies, rarely used utilities

Ask user: "Found [N] external dependencies. Validate all, or select priority level (P0-P3)?"

### 3. Batch Library Resolution

For each library in validation queue:

```
TOOL: mcp__context7__resolve-library-id
INPUT: libraryName = [dependency name]
```

Track results:
- ✅ **Resolved:** Store library ID for validation
- ⚠️ **Multiple matches:** Flag for user selection
- ❌ **Not found:** Skip Context7 validation, mark as "no-docs"

**Output:** Resolved libraries map:
```
{
  "react": "/facebook/react",
  "aws-cdk": "/aws/aws-cdk",
  "playwright": "/microsoft/playwright",
  "express": null  // Not found
}
```

### 4. Usage Pattern Analysis

For each resolved library, identify usage patterns:

#### 4a. Find All Usages
```
TOOL: Grep
PATTERN: Import statements + method calls
OUTPUT: List of files using this library
```

#### 4b. Extract API Surface
For each file:
1. Read file
2. Identify:
   - Classes instantiated
   - Methods called
   - Configuration objects used
   - Error handling patterns

Create API usage inventory:
```
Library: @aws-cdk/aws-s3
Files: 3
API Calls:
  - Bucket (constructor): 3 instances
  - addLifecycleRule(): 2 calls
  - grantRead(): 5 calls
```

### 5. Parallel Validation

For each library with significant usage:

#### 5a. Validate Core Usage
```
TOOL: mcp__context7__get-library-docs
INPUT:
  - context7CompatibleLibraryID = [library ID]
  - mode = 'code'
  - topic = [most used API/method]
  - page = 1
```

#### 5b. Validate Architecture Patterns
```
TOOL: mcp__context7__get-library-docs
INPUT:
  - context7CompatibleLibraryID = [library ID]
  - mode = 'info'
  - topic = [relevant architectural pattern, e.g., "authentication", "state management"]
  - page = 1
```

#### 5c. Check for Deprecations
Query Context7 for:
- Deprecated methods
- Migration guides
- Breaking changes in newer versions

### 6. Generate Comprehensive Report

```markdown
# Codebase API/SDK Validation Report

**Generated:** [timestamp]
**Project:** [project name]
**Total Dependencies:** [count]
**Validated via Context7:** [count]
**Files Scanned:** [count]

---

## Executive Summary

### Health Score: [X]/100
- ✅ Valid Usage: [X]%
- ⚠️ Warnings (deprecations, suboptimal): [X]%
- ❌ Critical Issues: [X]%
- 🔍 Not Validated (no Context7 docs): [X]%

### Priority Issues
[Top 5 issues that need immediate attention]

---

## Dependency Inventory

### Resolved in Context7 ([count])
| Library | Version | Context7 ID | Files Using | Status |
|---------|---------|-------------|-------------|--------|
| react   | 18.2.0  | /facebook/react | 45 | ✅ Valid |
| aws-cdk | 2.120.0 | /aws/aws-cdk | 12 | ⚠️ 3 warnings |
| playwright | 1.40.0 | /microsoft/playwright | 8 | ✅ Valid |

### Not Available in Context7 ([count])
| Library | Version | Files Using | Validation Method |
|---------|---------|-------------|-------------------|
| custom-utils | 1.0.0 | 23 | Internal - skip |
| legacy-lib | 0.5.0 | 3 | Manual review needed |

---

## Validation Details

### [Library Name] - Status: [✅/⚠️/❌]

**Context7 Library ID:** [ID]
**Version in Project:** [version]
**Files Using:** [count]
**APIs Validated:** [count]

#### Usage Summary
- [API/Method]: [count] usages - [status]
- [API/Method]: [count] usages - [status]

#### Issues Found

##### ⚠️ Warning: Deprecated API
- **Location:** [file:line]
- **Current Code:**
  ```javascript
  [code snippet]
  ```
- **Issue:** This method is deprecated since v[X]
- **Recommended:**
  ```javascript
  [updated code]
  ```
- **Context7 Reference:** [specific doc section]
- **Migration Effort:** [Low/Medium/High]

##### ❌ Critical: Incorrect Parameter Type
- **Location:** [file:line]
- **Current Code:**
  ```javascript
  [code snippet]
  ```
- **Issue:** Parameter type mismatch. Expected [type], got [type]
- **Correct Usage:**
  ```javascript
  [corrected code]
  ```
- **Context7 Reference:** [specific doc section]

---

## Recommendations

### Immediate Actions Required
1. [Fix critical issue X in file Y]
2. [Update deprecated API in file Z]

### Short-term Improvements
1. [Upgrade library X to version Y]
2. [Refactor pattern X to use recommended pattern Y]

### Long-term Considerations
1. [Consider migrating from library X to Y]
2. [Consolidate multiple libraries doing similar things]

---

## Validation Metadata

### Libraries Queried in Context7
[List of all Context7 queries made with modes used]

### Coverage
- Source Files Scanned: [count]
- Dependencies Analyzed: [count]
- API Calls Validated: [count]
- Context7 Queries: [count]

### Limitations
- [Any libraries not available in Context7]
- [Any APIs not found in documentation]
- [Areas requiring manual review]

---

## Next Steps

1. **Review Priority Issues:** Address critical issues first
2. **Plan Updates:** Schedule deprecated API updates
3. **Re-validate:** Run this scan after fixes
4. **Continuous Validation:** Add to CI/CD pipeline

---

**Note:** This report uses Context7 MCP server for real-time documentation lookup.
All recommendations are based on the latest official documentation available at scan time.
```

### 7. Interactive Options

Present user with options:
1. **Fix All Critical Issues** - Automatically fix all ❌ issues
2. **Fix Selected Issues** - User chooses which issues to fix
3. **Generate Remediation Story** - Create a new story with all fixes as tasks
4. **Export Report** - Save report to file
5. **Deep Dive on Library** - Select a library for detailed validation
6. **Return to Menu**

### 8. Fix Application (if selected)

For each selected fix:
1. Show the proposed change
2. Explain why it's needed (with Context7 reference)
3. Apply fix using Edit tool
4. Verify syntax (try to run linter/formatter)
5. Mark as fixed in tracking

### 9. Update Documentation

If fixes were applied:
- Update CHANGELOG or similar
- Add "Validated with Context7" badge to relevant docs
- Create commit message detailing API validations and fixes

## Advanced Features

### Periodic Scanning
Suggest adding this as:
- Pre-commit hook
- CI/CD pipeline step
- Weekly automated scan

### Trend Analysis
If previous scans exist:
- Compare results
- Show improvements/regressions
- Track API health over time

### Integration with Story Context
Add validation results to story context XML:
```xml
<api-validation>
  <library id="/aws/aws-cdk" status="validated" date="2025-11-24">
    <issues count="0"/>
    <warnings count="2"/>
  </library>
</api-validation>
```

## Configuration Options

Ask user to configure scan behavior:
- **Depth:** Quick (imports only) vs Deep (all API calls)
- **Scope:** Specific directories vs entire codebase
- **Exclusions:** node_modules, vendor, test files
- **Priority Filter:** P0 only vs all priorities

## Error Handling

### Rate Limiting
If Context7 rate limited:
- Pause and retry
- Reduce parallel queries
- Cache results for reuse

### Incomplete Documentation
If Context7 returns partial results:
- Use pagination (page=2, page=3)
- Try alternative topic queries
- Flag for manual review

### Large Codebases
If codebase is massive:
- Scan in chunks
- Show progress indicator
- Allow pause/resume
- Save intermediate results

## Performance Optimization

- **Parallel Queries:** Validate multiple libraries concurrently
- **Smart Caching:** Store Context7 responses for reuse
- **Incremental Scans:** Only check changed files in subsequent runs
- **Batch Operations:** Group similar validations

## Exit
Return control to the Dev agent main menu with scan results summary.
