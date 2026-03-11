---
title: 'Add GitHub Source Code Links to Try Scenarios'
slug: 'add-github-source-links-try-scenarios'
created: '2026-03-04'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - Eleventy 3.x (Nunjucks templates)
  - GOV.UK Frontend (govukButton, govukTag, govukInsetText macros)
  - YAML (scenarios.yaml + JSON Schema validated by AJV)
  - Markdown (NDX catalogue pages with shield.io badges)
  - Vitest (try docs site unit tests)
  - Playwright (E2E tests both sites)
files_to_modify:
  # NDX Catalogue Site
  - ndx/src/catalogue/aws/council-chatbot.md
  - ndx/src/catalogue/aws/foi-redaction.md
  - ndx/src/catalogue/aws/planning-ai.md
  - ndx/src/catalogue/aws/smart-car-park.md
  - ndx/src/catalogue/aws/text-to-speech.md
  - ndx/src/catalogue/aws/quicksight-dashboard.md
  - ndx/src/catalogue/aws/localgov-drupal.md
  - ndx/src/catalogue/aws/aws-empty-sandbox.md
  # Try Docs Site
  - ndx_try_aws_scenarios/schemas/scenario.schema.json
  - ndx_try_aws_scenarios/src/_data/scenarios.yaml
  - ndx_try_aws_scenarios/src/_includes/layouts/scenario.njk
code_patterns:
  - shield.io badges as inline markdown images (all 6 standard scenarios identical pattern, localgov-drupal has extra CMS badge)
  - GOV.UK govukButton macro for secondary links (walkthrough pattern to follow)
  - scenarios.yaml validated by AJV via scripts/validate-schema.js — runs before every build
  - additionalProperties: false at BOTH item level (line 658) and root level (line 662) — must add to schema before data
  - scenario.njk uses findScenarioById filter to look up scenario data from scenarios.yaml
  - "At a glance" sidebar has 4 rows: Time, Cost, Audience, Security (add Source code as 5th)
  - Frontmatter variables automatically cascade to templates in Eleventy (no computed data needed)
test_patterns:
  - NDX: Playwright E2E in tests/e2e/try/ and tests/e2e/catalogue/ — uses [data-try-id] selectors
  - NDX: WCAG 2.2 AA accessibility tests in tests/e2e/accessibility/ with axe-core
  - NDX: Tests wait for data-try-bundle-ready="true" before asserting
  - Try docs: Playwright tests in tests/ — screenshot capture, keyboard nav, visual regression
  - Try docs: Schema validation via npm run validate:schema (AJV, allErrors: true)
  - Try docs: CI pipeline runs validate-schema BEFORE build in .github/workflows/build-deploy.yml
---

# Tech-Spec: Add GitHub Source Code Links to Try Scenarios

**Created:** 2026-03-04

## Overview

### Problem Statement

NDX:Try scenarios deploy real CloudFormation templates and application code into user sandboxes, but there's no visible link from either the NDX catalogue pages or the try documentation site back to the source code on GitHub. Curious users who want to understand what's being deployed, learn from the IaC patterns, or adapt the code for their own use have no obvious way to find it.

### Solution

Add a `github_source` metadata field to all try scenario pages on the NDX catalogue, and a `sourceCode` field to the try documentation site's scenario data — displaying source code links consistently via shield.io badges and a new "How this was built" section on both sites. Use consistent plain-language terminology across both sites. Source code documentation with per-scenario walkthroughs is a follow-up initiative (see Follow-Up section).

### Scope

**In Scope (this spec):**
- Update 8 NDX catalogue try scenario markdown files (7 with `github_source` + 1 empty sandbox special case)
- Add a clickable GitHub shield.io badge to each scenario's badge row
- Rename the "Infrastructure as code" body section to "How this was built" and link directly to the source
- Handle the Empty AWS Sandbox as a special case (explain no source code)
- Add `sourceCode` object to `scenarios.yaml` in the try docs site with explicit stored URLs
- Update `scenario.schema.json` to allow the new field
- Update `scenario.njk` template to display source code link in "At a glance" sidebar and a new "How this was built" section
- Consistent terminology and presentation across both sites

**Out of Scope (this spec):**
- The `all-demo` scenario (internal use only)
- `connect.md` and `red-hat-openshift-on-aws.md` (not try scenarios)
- Modifying actual CloudFormation templates or application code
- Adding source links to non-AWS catalogue items
- Per-scenario source code documentation pages (follow-up spec — see below)

### User Types Served

Three distinct user needs drive this feature:

1. **"What am I deploying?"** — Security-conscious users who want to audit the CloudFormation before clicking "Try this now". They need the raw template link, fast.
2. **"How does this work?"** — Learners who want to understand the architecture. The GitHub link gets them started; detailed walkthroughs come in the follow-up spec.
3. **"Can I build on this?"** — Practitioners who want to adapt this for production. They need the source code plus guidance on what to change (follow-up spec).

This spec fully serves user 1 and provides the foundation for users 2 and 3. The "How this was built" section is designed to gracefully degrade — showing just the GitHub link now, with a slot for richer documentation when the follow-up work lands.

## Context for Development

### Codebase Patterns

**NDX main site (`/Users/CNesbittSmith/httpdocs/ndx`):**
- Try scenario pages live in `src/catalogue/aws/*.md`
- Each uses `layout: layouts/product-try` and has frontmatter fields: `try`, `try_id`, `walkthrough_url`
- Shield.io badges rendered as inline markdown images in the body — 6 of 7 scenarios have IDENTICAL badge rows; localgov-drupal has an extra `category-CMS-blue` badge
- Template `src/_includes/layouts/product-try.njk` renders a button group: "Try this now" (primary) + optional "View walkthrough" (secondary, conditional on `walkthrough_url`)
- Eleventy collection `catalogueTryable` filters on `try: true`; `eleventy.config.js` has `validateTryMetadata()` that validates `try_id` UUID format
- Frontmatter variables automatically cascade to Nunjucks templates — no computed data needed for `github_source`
- **"Infrastructure as code" section**: 6 of 7 scenarios have IDENTICAL boilerplate text. **localgov-drupal does NOT have this section** — it uses a completely different page structure with Nunjucks macros and grid layouts

**Try docs site (`/Users/CNesbittSmith/httpdocs/ndx_try_aws_scenarios`):**
- Scenario metadata lives in `src/_data/scenarios.yaml` (1191 lines), validated against `schemas/scenario.schema.json`
- Schema enforces `additionalProperties: false` at **both** item level (line 658) and root level (line 662) — new fields MUST be added to schema FIRST
- Build pipeline: `npm run build` chains `validate:schema && eleventy` — schema validation is mandatory and blocks deployment
- CI: `.github/workflows/build-deploy.yml` runs validate-schema as a separate job before build
- Scenario pages are thin `.njk` files referencing `scenario.njk` layout which uses `findScenarioById` filter
- Layout renders two-thirds/one-third grid; "At a glance" sidebar has 4 rows (Time, Cost, Audience, Security)
- Layout structure: two-thirds column (lines 41-86) contains "AWS services used" ending at L85, then one-third sidebar column (lines 88-119) contains "At a glance" card, grid row closes at L120. Walkthrough CTA starts at L122. **"How this was built" must be inserted after L120 (grid row close) and before L122 (walkthrough CTA)** — NOT inside the grid columns
- CloudFormation source lives in `cloudformation/scenarios/{scenario-id}/`
- All 7 scenarios have a `deployment` object; most end with `tco_projection`; localgov-drupal ends with `aiFeatures`

### Files to Reference

| File | Purpose | Key Lines |
| ---- | ------- | --------- |
| `ndx/src/catalogue/aws/council-chatbot.md` | Example try scenario (NDX catalogue) | L26-30: badges, L98-100: IaC section |
| `ndx/src/catalogue/aws/localgov-drupal.md` | Outlier — no IaC section, uses Nunjucks macros | L35-40: badges (extra CMS badge) |
| `ndx/src/catalogue/aws/aws-empty-sandbox.md` | Empty sandbox — no source code | No IaC section, no walkthrough_url |
| `ndx/src/_includes/layouts/product-try.njk` | Try product template — button group | L20-39: button group div |
| `ndx_try_aws_scenarios/src/_data/scenarios.yaml` | Scenario metadata | All 7+1 scenarios |
| `ndx_try_aws_scenarios/schemas/scenario.schema.json` | JSON Schema (AJV validated) | L656: last property (aiFeatures), L658: additionalProperties |
| `ndx_try_aws_scenarios/src/_includes/layouts/scenario.njk` | Scenario detail layout | L89-118: sidebar, L85: services end, L122: walkthrough CTA |
| `ndx_try_aws_scenarios/scripts/validate-schema.js` | Schema validator (AJV, allErrors) | Runs before every build |
| `ndx_try_aws_scenarios/eleventy.config.js` | Custom filters | L66: findScenarioById, L157: deployUrl |
| `ndx/tests/e2e/catalogue/try-flow.spec.ts` | E2E tests for try buttons | Uses [data-try-id] selector |
| `ndx/tests/e2e/accessibility/catalogue-try-accessibility.spec.ts` | WCAG 2.2 AA tests | axe-core scanning |

### Technical Decisions

1. **Store explicit URLs** in both `github_source` (NDX catalogue) and `sourceCode` (try docs) rather than deriving from scenario ID — handles edge cases like localgov-drupal's CDK structure and planning-ai's Python build pipeline
2. **Use "How this was built"** as the consistent section heading on both sites — plain language per GOV.UK style guide, accessible to non-technical users (service managers, leadership)
3. **Shield.io badge with GitHub logo** (black) — intentionally stands out from the colourful provider/access badges, drawing attention for curious users
4. **"At a glance" sidebar placement** on try docs site — users scan this card for quick facts; source code as 5th row after Security
5. **Graceful degradation** — the "How this was built" section links to GitHub now, with a designed slot for richer per-scenario documentation when the follow-up work lands
6. **localgov-drupal needs a new section** — unlike the other 6 scenarios, it has no "Infrastructure as code" section to rename, so "How this was built" must be added as a new section (recommend before "Explore more scenarios")
7. **Schema must be updated BEFORE data** — CI pipeline validates schema first; sequence within the try docs PR matters

### Deployment Sequence

**Try docs site first, then NDX catalogue.** This ensures:
- Schema + data + template changes are deployed and valid before the main site links to them
- Two separate PRs in two separate repos with independent CI/CD pipelines
- No broken cross-references during the rollout window
- Within try docs PR: schema change → data change → template change (all in one PR, validated by build)

## Implementation Plan

### Task Checklist

#### Phase 1: Try Documentation Site — Schema & Data (deploy first)

- [x] **Task 1.1: Update `scenario.schema.json`**
- File: `ndx_try_aws_scenarios/schemas/scenario.schema.json`
- Insert after line 656 (closing of `aiFeatures`). **Add a comma after the closing `}` of `aiFeatures` on line 656** before inserting the new property, then add before line 657 (closing of `properties`)
- Add `sourceCode` property — **optional at scenario level** (do NOT add to top-level `required` array). This allows `all-demo` and future vendor scenarios to omit it:
  ```json
  "sourceCode": {
    "type": "object",
    "description": "GitHub source code links for transparency and learning",
    "properties": {
      "repoUrl": {
        "type": "string",
        "format": "uri",
        "description": "Direct GitHub URL to the scenario's source directory (deep link, not top-level repo)"
      },
      "cloudformationPath": {
        "type": "string",
        "description": "Path within repo to CloudFormation/CDK template directory"
      },
      "appCodePath": {
        "type": "string",
        "description": "Path within repo to application code (if separate from CloudFormation, e.g. CDK/Docker dirs)"
      },
      "description": {
        "type": "string",
        "maxLength": 300,
        "description": "Plain English description of what the source code contains"
      }
    },
    "required": ["repoUrl", "cloudformationPath", "description"]
  }
  ```
- Note: `appCodePath` is intentionally NOT in `required` — most scenarios only have a template.yaml; only localgov-drupal has separate CDK/Docker dirs

- [x] **Task 1.2: Add `sourceCode` data to each scenario in `scenarios.yaml`**
- File: `ndx_try_aws_scenarios/src/_data/scenarios.yaml`
- Add to each of the 7 scenarios (NOT `all-demo`)
- Each `repoUrl` is a **deep link** to the scenario's source directory (not the top-level repo)

**Exact data per scenario:**

```yaml
# council-chatbot (insert after tco_projection, ~line 359)
    sourceCode:
      repoUrl: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/council-chatbot"
      cloudformationPath: "cloudformation/scenarios/council-chatbot"
      description: "CloudFormation template that deploys an Amazon Bedrock and Lex chatbot with Lambda functions for council resident Q&A."

# foi-redaction (insert after tco_projection, ~line 621)
    sourceCode:
      repoUrl: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/foi-redaction"
      cloudformationPath: "cloudformation/scenarios/foi-redaction"
      description: "CloudFormation template that deploys Amazon Comprehend and Textract with Lambda functions to automatically redact sensitive data from documents."

# planning-ai (insert after tco_projection, ~line 488)
    sourceCode:
      repoUrl: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/planning-ai"
      cloudformationPath: "cloudformation/scenarios/planning-ai"
      description: "Python build script and CloudFormation template that deploys AI-powered planning application analysis using Amazon Bedrock and Textract."

# smart-car-park (insert after tco_projection, ~line 757)
    sourceCode:
      repoUrl: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/smart-car-park"
      cloudformationPath: "cloudformation/scenarios/smart-car-park"
      description: "CloudFormation template that deploys IoT-based parking availability monitoring using AWS IoT Core and Lambda."

# text-to-speech (insert after tco_projection, ~line 893)
    sourceCode:
      repoUrl: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/text-to-speech"
      cloudformationPath: "cloudformation/scenarios/text-to-speech"
      description: "CloudFormation template that deploys accessibility audio generation using Amazon Polly and S3."

# quicksight-dashboard (insert after tco_projection, ~line 1024)
    sourceCode:
      repoUrl: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/quicksight-dashboard"
      cloudformationPath: "cloudformation/scenarios/quicksight-dashboard"
      description: "CloudFormation template that deploys Amazon QuickSight dashboards for service performance analytics and reporting."

# localgov-drupal (insert after aiFeatures, ~line 226)
    sourceCode:
      repoUrl: "https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/localgov-drupal"
      cloudformationPath: "cloudformation/scenarios/localgov-drupal"
      appCodePath: "cloudformation/scenarios/localgov-drupal/cdk"
      description: "AWS CDK project with Docker configuration that deploys LocalGov Drupal CMS with 7 AI-powered features on Fargate and Aurora."
```

#### Phase 2: Try Documentation Site — Template & UI

- [x] **Task 2.1: Add "Source code" row to "At a glance" sidebar**
- File: `ndx_try_aws_scenarios/src/_includes/layouts/scenario.njk`
- Add a new summary list row in the `ndx-scenario-summary` div after the "Security" row:
  ```njk
  {% if scenarioData.sourceCode %}
  <div class="govuk-summary-list__row">
    <dt class="govuk-summary-list__key">Source code</dt>
    <dd class="govuk-summary-list__value">
      <a href="{{ scenarioData.sourceCode.repoUrl }}"
         class="govuk-link"
         target="_blank"
         rel="noopener">
        View on GitHub <span class="govuk-visually-hidden">(opens in new tab)</span>
      </a>
    </dd>
  </div>
  {% endif %}
  ```

- [x] **Task 2.2: Add "How this was built" section to scenario detail page**
- File: `ndx_try_aws_scenarios/src/_includes/layouts/scenario.njk`
- Add new section after "AWS services used", before the walkthrough CTA:
  ```njk
  {% if scenarioData.sourceCode %}
  <h2 class="govuk-heading-m">How this was built</h2>
  <p class="govuk-body">This scenario is built with open source code. You can view, learn from, and adapt it for your own needs.</p>
  <p class="govuk-body">{{ scenarioData.sourceCode.description }}</p>
  <p class="govuk-body">
    <a href="{{ scenarioData.sourceCode.repoUrl }}/tree/main/{{ scenarioData.sourceCode.cloudformationPath }}"
       class="govuk-link"
       target="_blank"
       rel="noopener">
      View the source code on GitHub <span class="govuk-visually-hidden">(opens in new tab)</span>
    </a>
  </p>
  {% endif %}
  ```
- This section is designed to gracefully extend later with links to per-scenario documentation pages

#### Phase 3: NDX Catalogue Site (deploy second)

- [x] **Task 3.1: Add `github_source` frontmatter to 7 try scenario `.md` files**

**Exact URLs per scenario (pinned, zero ambiguity):**

| File | `github_source` value |
|------|----------------------|
| `council-chatbot.md` | `https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/council-chatbot` |
| `foi-redaction.md` | `https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/foi-redaction` |
| `planning-ai.md` | `https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/planning-ai` |
| `smart-car-park.md` | `https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/smart-car-park` |
| `text-to-speech.md` | `https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/text-to-speech` |
| `quicksight-dashboard.md` | `https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/quicksight-dashboard` |
| `localgov-drupal.md` | `https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/localgov-drupal` |

Add after `walkthrough_url` (or after `try_id` if no walkthrough_url) in each file's frontmatter.

- [x] **Task 3.2: Add clickable GitHub shield.io badge to each scenario's badge row**
- Add as the LAST badge in the badge row of each of the 7 files:
  ```markdown
  [![View source on GitHub](https://img.shields.io/badge/source-GitHub-black?logo=github)](https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/{scenario-id})
  ```
- The black badge intentionally stands out from the colourful provider/access badges
- Use the exact URL from the Task 3.1 table for each scenario
- **Accessibility note:** The image alt text "View source on GitHub" serves as the link text for screen readers. Markdown image-link syntax does not support visually hidden `<span>` elements, so the "(opens in new tab)" cannot be added here. This is acceptable — the badge opens a recognisable external site (GitHub) and follows the same pattern as the existing shield.io badges on these pages. The try docs site templates (Tasks 2.1/2.2) DO include `<span class="govuk-visually-hidden">(opens in new tab)</span>` since they use HTML.

- [x] **Task 3.3: Rename and update "Infrastructure as code" section to "How this was built"**

**Variant A — 6 standard scenarios** (council-chatbot, foi-redaction, planning-ai, smart-car-park, text-to-speech, quicksight-dashboard):
These all have an IDENTICAL `### Infrastructure as code` section. Replace with:
```markdown
### How this was built

This scenario is built with open source infrastructure as code. You can view the CloudFormation template, understand how it works, and adapt it for your own needs.

<a href="{github_source}" target="_blank" rel="noopener">View the source code on GitHub</a>
```
Where `{github_source}` is the hardcoded URL from the Task 3.1 table (not a template variable — these are markdown files, not Nunjucks). Raw `<a>` tags are used here because markdown link syntax `[text](url)` does not support `target="_blank"` — Eleventy's markdown pipeline (markdown-it) preserves inline HTML by default.

**Variant B — localgov-drupal:**
This file has NO "Infrastructure as code" section. Add a NEW section after `## Governance` (line 242) and before `## Explore more scenarios` (line 250):
```markdown
### How this was built

This scenario is built with open source infrastructure as code using AWS CDK (Cloud Development Kit) with Docker. You can view the CDK project, Drupal configuration, and Docker setup, and adapt them for your own needs.

<a href="https://github.com/co-cddo/ndx_try_aws_scenarios/tree/main/cloudformation/scenarios/localgov-drupal" target="_blank" rel="noopener">View the source code on GitHub</a>
```

- [x] **Task 3.4: Handle Empty AWS Sandbox special case**
- File: `aws-empty-sandbox.md`
- No `github_source` frontmatter field
- No GitHub badge in badge row
- Add a new `## How this was built` section before `## Prefer something ready-made?` (line 76):
  ```markdown
  ## How this was built

  This is an empty sandbox — a clean AWS account with no pre-deployed resources. There's no scenario source code because you start from scratch and build whatever you like.

  If you'd like to explore scenarios with source code you can learn from, try one of our [pre-deployed scenarios](/catalogue/tags/try-before-you-buy/).
  ```

### Acceptance Criteria

- [x] **AC1:** Given a user views any try scenario page (except Empty Sandbox), when the page loads, then a clickable GitHub shield.io badge (black, with GitHub logo) is visible in the badge row linking to the correct `cloudformation/scenarios/{id}` path
- [x] **AC2:** Given a user reads the "How this was built" section on a try scenario page, when they see the section content, then there is a direct link to the GitHub source code that opens in a new tab, and the section uses plain language accessible to non-technical users
- [x] **AC3:** Given a user views the Empty AWS Sandbox page, when they look for source code links, then there is no GitHub badge, and the "How this was built" section explains this is an empty sandbox and points to pre-deployed scenarios
- [x] **AC4:** Given a user views a scenario detail page on the try docs site, when they look at the "At a glance" sidebar, then there is a "Source code" row with a link to the GitHub repo that opens in a new tab
- [x] **AC5:** Given a user views a scenario detail page on the try docs site, when they scroll through the content, then there is a "How this was built" section with a plain English description and GitHub link, positioned after "AWS services used" and before the walkthrough CTA
- [x] **AC6:** Given the `sourceCode` field is added to `scenarios.yaml`, when the build runs schema validation (`npm run validate:schema`), then validation passes with no errors
- [x] **AC7:** Given a user navigates from NDX catalogue to try docs site for the same scenario, when they compare the source code links, then both point to the same GitHub paths, both use the heading "How this was built", and both use consistent plain English language
- [x] **AC8:** Given a user navigates the source code links with assistive technology, when they encounter external links, then: (a) HTML links on both sites include `<span class="govuk-visually-hidden">(opens in new tab)</span>`, (b) shield.io badge has alt text "View source on GitHub" which serves as link text for screen readers (markdown badge syntax cannot include visually-hidden spans — this matches existing badge patterns on these pages)

## Additional Context

### Dependencies

- `co-cddo/ndx_try_aws_scenarios` GitHub repo must be public (it is)
- Schema validation must pass before deploying try docs site changes
- Try docs site PR should merge and deploy before NDX catalogue PR

### Testing Strategy

**Lean approach — don't over-test static content:**

- **Schema validation (automatic):** Existing `npm run validate:schema` in try docs build pipeline validates `sourceCode` against schema. No new test needed — the CI pipeline already blocks on schema errors.
- **Try docs site — one Playwright assertion:** Add a single assertion to an existing test that verifies "Source code" appears in the "At a glance" sidebar when a scenario page loads. This catches template regressions.
- **NDX catalogue — manual spot-check:** The GitHub badge is static markdown rendered by Eleventy. Verify visually that all 7 scenarios show the badge and the "How this was built" link. No Playwright E2E needed for static links.
- **Empty Sandbox — manual verify:** Check no badge, correct explanatory text.
- **Link validation — manual spot-check:** Click each of the 7 GitHub URLs once to confirm they resolve. The repo is public and the paths are stable.

### Notes

- The repo URL uses underscores (`ndx_try_aws_scenarios`), not hyphens — easy to get wrong, triple-check all URLs
- `localgov-drupal` uses CDK not raw CloudFormation — the `description` and "How this was built" text should call this out explicitly
- `planning-ai` has a Python build script (`build-template.py`) that generates the final template — description should mention this
- `all-demo` is excluded entirely (internal demos only)
- Consider linking to specific tagged releases rather than `main` branch for stability in the future, though `main` is simpler to maintain for now

## Follow-Up: Per-Scenario Source Code Documentation (Separate Spec)

This is flagged as a **follow-up initiative** to be specced separately after this work ships. It deserves its own brief, teams, and timeline.

### Recommended Approach

**Dedicated teams per scenario** — each scenario requires domain expertise in its specific AWS services:

| Scenario | CloudFormation Structure | Complexity | Key Expertise Needed |
|----------|--------------------------|------------|---------------------|
| council-chatbot | `template.yaml` + `BLUEPRINT.md` | Medium | Bedrock, Lex, Lambda |
| foi-redaction | `template.yaml` + `BLUEPRINT.md` | Medium | Comprehend, Textract, Lambda |
| planning-ai | `build-template.py` + PDF generation | Medium-High | Python build pipeline, sample data |
| smart-car-park | `template.yaml` + `BLUEPRINT.md` | Medium | IoT, Lambda |
| text-to-speech | `template.yaml` + `BLUEPRINT.md` | Low-Medium | Polly, S3 |
| quicksight-dashboard | `template.yaml` + `BLUEPRINT.md` | Medium | QuickSight, data sources |
| localgov-drupal | CDK + Docker + Drupal | High | CDK (not CFN), Docker, Drupal plugins |

### Documentation Should Cover Per Scenario

- What the CloudFormation/CDK template deploys (resources, relationships, architecture diagram)
- How the application code works (Lambda functions, integrations, data flow)
- Key architectural decisions and why they were made
- How a user could adapt this for production use
- Security considerations and what the sandbox isolation provides

### Integration Point

The "How this was built" section created in this spec is designed with a slot for linking to these documentation pages once they exist. When the follow-up work ships, add a link like:

```njk
{% if scenarioData.sourceCode.documentationUrl %}
<p class="govuk-body">
  <a href="{{ scenarioData.sourceCode.documentationUrl }}" class="govuk-link">
    Read the full source code walkthrough
  </a>
</p>
{% endif %}
```

This requires only a schema addition (`documentationUrl` to the `sourceCode` object) and a one-line template update — minimal rework.
