---
title: "Simplify signup form and accept waitlist signups for unlisted domains"
type: feature
created: 2026-05-28
status: done
baseline_commit: 9f4d1d020283d252d216ea5fec3be0a50846ed5a
context:
  - "_bmad-output/planning-artifacts/project-context.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The signup form splits the email address across two fields (local-part input + organisation dropdown), which adds friction and an unfamiliar pattern. Users from organisations not in the local-government allowlist are blocked at the form with no way to register interest, so we have no signal on demand from the wider UK public sector.

**Approach:** Replace the split email control with a single `Email address` input. JavaScript parses the typed domain against the existing cached domain list and shows a live indicator telling the user whether they will get instant access or be added to a waitlist. On submit, the Lambda always creates the IAM Identity Center user; if the domain is in the allowlist the user is added to the NDX group and receives the current `UserCreated` email; if not, group assignment is skipped and a new `WaitlistAdded` GOV.UK Notify email is sent with thank-you and unsubscribe-by-email instructions. Slack alerting fires in both cases, flagged so ops can tell them apart.

## Boundaries & Constraints

**Always:**
- Keep `firstName` and `lastName` fields exactly as they are today (validation, IDC `DisplayName`/`GivenName`/`FamilyName`, Slack alert payload, Notify personalisation).
- Preserve all existing request-validation security checks: CSRF header (`X-NDX-Request: signup-form`), `Content-Type: application/json`, 10KB body limit, prototype-pollution guard, email canonicalisation, `+` alias rejection, multi-`@` rejection, RFC-5321 length cap, `FORBIDDEN_NAME_CHARS`, 50–150ms timing-delay.
- Domain list still loaded from `GET /signup-api/domains`; allowlist is the source of truth for "recognised vs waitlist" on both client and server. Server is authoritative — client's indicator is advisory only.
- For unlisted domains, still call `CreateUser` in IAM Identity Center but **do not** call `CreateGroupMembership` (waitlist users have no NDX permissions until promoted manually). The cross-account IDC role and identity-store/group config stay unchanged.
- Both branches emit a Slack alert via the existing `EVENTS_TOPIC_ARN` SNS topic; titles differ ("New NDX User Created" vs "New NDX Waitlist Signup") so they're distinguishable in `#ndx-sandbox-alerts`.
- `WaitlistAdded` follows the existing notification-Lambda pattern: new entry in `NotificationEventType`, Zod schema, `NOTIFY_TEMPLATES` config, personalisation builder, and dispatch case; new env var `NOTIFY_TEMPLATE_WAITLIST_ADDED` plumbed through `infra/lib/config.ts` and `infra/lib/notification-stack.ts`; template ID set to an empty-string placeholder in `NOTIFY_TEMPLATE_IDS` for the user to fill in.
- Notification failure (Notify or Slack) must remain non-blocking — account creation already succeeded; warnings only.
- Form, indicator, and success pages follow GOV.UK Design System: error summary at top, no apologetic copy, validate on submit, `aria-describedby` / `aria-live` patterns for the indicator, colour never the only signal.
- Indicator updates are debounced (~300ms idle after `input`) and only re-announced via `aria-live` when the parsed domain segment actually changes — not on every keystroke, to avoid flooding screen-reader output.
- On `/signup/success` and `/signup/waitlist`, JavaScript moves focus to the confirmation panel `<h1>` after render (existing GDS pattern).
- Slack alert payload must strip Slack mrkdwn metacharacters (`* _ ~ \` > <`) from `firstName`, `lastName`, **and `email`** before embedding. Today's handler (`infra-signup/lib/lambda/signup/handler.ts:449-450`) strips a subset from names only and leaves `email` and `<` untouched — close that gap here, because the wider-open endpoint means any submitter can place arbitrary strings into `#ndx-sandbox-alerts`.
- Empty/missing domain list server-side fails **closed**: handler returns a 5xx `SERVER_ERROR` rather than routing every signup to waitlist. Distinguishes "domain list misconfigured" from "domain not in list" so a config glitch doesn't silently look like an unknown-domain surge.
- The existing 50–150ms timing-delay must normalise **both** the success-vs-409 oracle (today's behaviour) **and** the recognised-vs-waitlist branch latency. Implementation: record the handler entry time, then before returning the response, `await` until at least `TIMING_FLOOR_MS = 400` (a constant — chosen to comfortably exceed the recognised branch's `CreateUser` + `CreateGroupMembership` worst case in observed prod telemetry) has elapsed. The existing 50–150ms random jitter applies *inside* this window (i.e. floor is at least 400ms, jitter adds 50–150ms on top). One constant, one `await`, no measurement.
- Both client and server lookups against the allowlist are **case-insensitive** — input domain is lowercased before comparison and the allowlist is treated as lowercase. The client mirrors the server here so the indicator can't say "recognised" for a submission the server then waitlists.
- IDN / non-ASCII domain handling: the handler rejects any email whose domain contains any non-ASCII codepoint with a 400 `INVALID_EMAIL` before any allowlist comparison. No Unicode normalisation, no punycode round-trip. (Settled in this spec — see Spec Change Log.)

**Ask First:**
- Any change to copy that ships in the new Notify template body, the waitlist success page, or the live-recognition indicator beyond the wording drafted in Design Notes.
- Any change to which domains are considered "recognised" (e.g. partial-match or sub-domain logic) — the spec keeps the current exact-match-against-`/signup-api/domains` rule.
- Adding new persistence (DynamoDB waitlist table, mailing list export, etc.) — out of scope.
- Opening signups to any well-formed domain widens unauthenticated IDC `CreateUser` writes. Per-IP rate-limiting is already in place via the CloudFront WAF (`infra/lib/waf-stack.ts:66`, 10 requests / 5 min / IP). The open decision is whether that's tight enough on its own or whether an aggregate-rate / CAPTCHA / additional mitigation is needed before merge — see "Logged for follow-up" for the deferred aggregate-rate alarm.
- The existing `USER_EXISTS` 409 path remains a (mild) account-enumeration oracle — unchanged in behaviour, but the addressable surface just grew from ~allowlist-only to any well-formed email; acceptance is recorded here so security review has a single place to push back.
- **Pre-registration / signup-squatting (recognised branch):** with no email verification on signup, an attacker can create an IDC user for an arbitrary victim address on an allowlisted domain. Real victim later hits 409 → `/login` flow. SSO-federated login means the real user owns auth, but the IDC user record carries the squatter's `firstName`/`lastName`. Accepted residual unless renegotiated — see Tasks for a `WARN`-on-mismatch detection signal.

**Never:**
- Drop the `firstName`/`lastName` fields or change their validation rules.
- Store waitlist signups anywhere other than IAM Identity Center (no new DB table, no SSM, no S3 export).
- Place waitlist users into any IDC group (no `NDX-Waitlist` group, no permission set).
- Remove or relax the allowlist check — the allowlist still drives the branch, it just no longer rejects.
- Reduce the existing request-validation surface, rate-limits, or security headers.
- Reuse the `UserCreated` Notify template for waitlist users.
- Trust the client-side indicator on the server — re-derive the branch from the allowlist inside the Lambda.
- Deploy with `NOTIFY_TEMPLATE_WAITLIST_ADDED` unset in prod. The missing-template `WARN`-and-skip branch is startup misconfiguration, not steady state — waitlisted users would be silently dropped from comms while their account still exists.
- Address the lifecycle/retention of waitlist users (review cadence, ageing-out, deletion policy, ops ownership) in this spec — it's a deliberate gap, flagged here so the next spec can pick it up.
- Permit `(` or `)` in `firstName`/`lastName`. Current `FORBIDDEN_NAME_CHARS` (`src/signup/types.ts:185`) is `/[<>'"&\x00-\x1F\x7F]/` and does **not** include parens, so a name like `Robert))((evil` can corrupt GOV.UK Notify `((field))` personalisation. Extend the character class in this change.
- Use Zod `.passthrough()` or `.catchall()` on the signup request schema. Unknown fields must be **stripped silently** (Zod default `.strip()`), never logged, never echoed in Slack, never persisted. The "tolerate an extra `domain` field for one deploy window" allowance is satisfied by silent-strip — not by accept-and-pass-through.
- Address pre-registration squatting, aggregate-rate-limiting across rotating IPs, or disposable-email blocking **in this spec** — all three are deliberate residuals; the first is documented under Ask First, the latter two are logged as follow-ups in Verification.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Recognised domain submit | Valid name + email whose domain is in allowlist | IDC `CreateUser` + `CreateGroupMembership`; `UserCreated` event published; Slack alert "New NDX User Created"; 200 `{success:true}`; client redirects to `/signup/success` | 5xx → existing `SERVER_ERROR` path; group-add failure → existing rollback path |
| Unlisted domain submit | Valid name + email whose domain is NOT in allowlist | IDC `CreateUser` only (no group); `WaitlistAdded` event published; Slack alert "New NDX Waitlist Signup"; 200 `{success:true, waitlist:true}`; client redirects to `/signup/waitlist` | IDC failure → existing `SERVER_ERROR`; no rollback needed (no group add attempted) |
| Existing user re-submits (either branch) | Email already has IDC user | 409 `USER_EXISTS` (unchanged); client silent-redirect to `/login` with `WELCOME_BACK_KEY` flag | Unchanged |
| Email parse: no `@`, multiple `@`, `+` alias, invalid chars, oversize local/total length | Various malformed inputs | 400 with current error codes (`INVALID_EMAIL` etc.); inline + summary errors | Unchanged |
| Empty email or empty name | Missing required fields | 400 with current messages | Unchanged |
| Domain list (`/signup-api/domains`) fails to load on client | Network/5xx | Form still submits; live indicator defaults to "you'll join the waitlist"; server re-validates and routes correctly | Show banner-style summary error as today; do not block submit |
| Notify or Slack publish fails (either branch) | SDK error from notification Lambda or SNS | Account still created; structured `WARN` log; 200 returned | Non-blocking — current pattern |
| `NOTIFY_TEMPLATE_WAITLIST_ADDED` unset (empty string) at runtime | Waitlist signup arrives, template ID is `""` | `WARN` log, Notify dispatch skipped, **IDC user still created**, **Slack alert still emitted** with the waitlist title, 200 returned | Startup misconfig — see Never list; tested behaviour, not implicit |
| Domain list returns empty array server-side | `getDomains` resolves to `[]` (Secrets-Manager/SSM glitch) | 5xx `SERVER_ERROR`; no IDC write attempted | Fails closed — never silently routes everyone to waitlist |
| `firstName` or `lastName` contains `(` or `)` | Notify-template injection vector | 400 `INVALID_NAME` (existing error code); same error summary + inline pattern as other forbidden chars | Unchanged error path |
| Email with non-ASCII domain (`name@münchen.de` or punycode `name@xn--mnchen-3ya.de`) | Unicode or punycode in the domain segment | 400 `INVALID_EMAIL` before any allowlist comparison — settled as reject-non-ASCII in this spec | Unchanged error path |
| Leading/trailing whitespace in email | `" name@x.com "` etc. | Trimmed during normalisation, then validated as today | Unchanged |
| Repeated rapid submissions from same IP | Many requests in a short window | Existing CloudFront WAF rate-limit applies (10 requests per 5-minute window per IP, scoped to `/signup-api/signup`, returns 429 with `RATE_LIMITED`) — see `infra/lib/waf-stack.ts:66` | Unchanged — named here so reviewers can find it |
| CSRF / Content-Type / body-too-large / proto-pollution | Bad request shape | 400/403 as today | Unchanged |

</frozen-after-approval>

## Code Map

- `src/signup.md` -- Form markup: replace split-email markup with single `email` input, recognition-indicator region, and Domain Not Listed inset (removed in favour of indicator copy).
- `src/signup/main.ts` -- Form bootstrap, validation, submit handler; add `onInput` parser + indicator updater; switch redirect target on `waitlist:true`.
- `src/signup/api.ts` -- `submitSignup` already returns `SignupSuccessResponse | SignupErrorResponse`; widen success type to include optional `waitlist?: boolean`.
- `src/signup/types.ts` -- Update `SignupRequest` (drop `domain`, keep `email`) and `SignupSuccessResponse` (add `waitlist?: boolean`). Lambda imports via `@ndx/signup-types`.
- `src/signup/main.test.ts`, `src/signup/api.test.ts`, `src/signup/types.test.ts` -- Update for new field shape + indicator behaviour.
- `src/signup/waitlist.md` -- **NEW** success page at `/signup/waitlist/` with thank-you copy and unsubscribe-by-email instructions.
- `infra-signup/lib/lambda/signup/handler.ts` -- Stop returning `DOMAIN_NOT_ALLOWED` when domain is unlisted; instead set `isWaitlist = !isEmailDomainAllowed(...)`; branch group-add and notification event accordingly; include `waitlist` in success response. Derive `domain` from email server-side. The new request shape no longer requires `domain`; if a leftover `domain` field is present during the deploy window the Zod schema silently strips it (never reads, logs, echoes, or persists it).
- `infra-signup/lib/lambda/signup/identity-store-service.ts` -- Split `createUser` into `createUserOnly` (returns userId) and `addUserToNdxGroup(userId)`; existing `createUser` becomes the orchestrator that calls both for the allowlisted branch only.
- `infra-signup/lib/lambda/signup/services.ts:37` -- Existing `isEmailDomainAllowed(email, allowedDomains)` is reused as-is for the server-side branch decision (no change). Named here so the implementer knows the import source.
- `infra-signup/lib/lambda/signup/domain-service.ts:172` -- Existing `getDomains(correlationId)` returns `DomainInfo[]`; the empty-array fail-closed check lives in `handler.ts` per the Always rule.
- `infra-signup/lib/lambda/signup/handler.test.ts`, `identity-store-service.test.ts` -- Cover both branches, including group-add skip and Slack/Notify title differences.
- `infra/lib/lambda/notification/types.ts` -- Add `"WaitlistAdded"` to `NotificationEventType` union.
- `infra/lib/lambda/notification/validation.ts` -- Add `WaitlistAddedDetailSchema` (same shape as `UserCreatedDetailSchema`); register in `EVENT_SCHEMAS`.
- `infra/lib/lambda/notification/templates.ts` -- Add `WaitlistAdded` entry to `NOTIFY_TEMPLATES` (env var `NOTIFY_TEMPLATE_WAITLIST_ADDED`, required fields `userName`); add `buildWaitlistAddedPersonalisation`; extend `USER_EVENTS`; add dispatch case.
- `infra/lib/lambda/notification/templates.test.ts`, `validation.test.ts` -- Mirror the existing `UserCreated` coverage for `WaitlistAdded`.
- `infra/lib/config.ts` -- Add `WAITLIST_ADDED: ""` placeholder to `NOTIFY_TEMPLATE_IDS`; add `WaitlistAdded: NOTIFY_TEMPLATE_IDS.WAITLIST_ADDED` to `EVENT_TYPE_TO_TEMPLATE_ID`.
- `infra/lib/notification-stack.ts` -- Pass `NOTIFY_TEMPLATE_WAITLIST_ADDED` env var to notification Lambda alongside the existing `NOTIFY_TEMPLATE_*` env vars.
- `tests/e2e/signup/signup.spec.ts` -- Replace split-field selectors with single-field + indicator selectors; add waitlist-branch happy-path spec.

## Tasks & Acceptance

**Atomic delivery:** all Execution tasks below ship together **in a single PR**. Reviewer must reject submissions that touch only the UX half (single-email form) or only the waitlist half (Lambda branching + new Notify template) — both must land together. No interim state where `DOMAIN_NOT_ALLOWED` has been removed but the waitlist Notify path isn't wired up, and no interim state where the form is single-field but the Lambda still expects `domain`. The change is only valuable if both halves land together.

**Execution:**

- [x] `src/signup/types.ts` -- Remove `domain` from `SignupRequest`; add `waitlist?: boolean` to `SignupSuccessResponse`; keep `VALIDATION_CONSTRAINTS`, `FORBIDDEN_NAME_CHARS`, `EMAIL_PLUS_ALIAS` exports unchanged so they can be shared.
- [x] `src/signup.md` -- Replace the split-email `govuk-form-group` with a single `govuk-input` for `email` (`type="email"`, `autocomplete="email"`, `aria-describedby="email-hint email-status"`); add a `<div id="email-status" role="status" aria-live="polite" class="govuk-hint">` region beneath it; remove the now-redundant "Domain not listed?" inset.
- [x] `src/signup/main.ts` -- Drop dropdown population; on each `input` event parse the email's domain, look it up against the cached domain list (case-insensitive), and render either the recognised or waitlist indicator; rewrite `validateForm` for the single field (full email format + length); change submit payload to `{ firstName, lastName, email }`; when `response.waitlist === true` redirect to `/signup/waitlist`, else `/signup/success` (or `response.redirectUrl` if returned).
- [x] `src/signup/api.ts` -- Adjust types; no behavioural change beyond the request/response shape.
- [x] `src/signup/waitlist.md` -- New success page (see Design Notes for copy); include a link to the site privacy notice in the page footer/inset so waitlisted users can find lawful-basis / SAR information.
- [x] `infra-signup/lib/lambda/signup/identity-store-service.ts` -- Refactor: extract `createUserOnly(request, correlationId)` and `addUserToNdxGroup(userId, correlationId, domain)`; keep current `createUser(request, correlationId)` as a wrapper that calls both (used by recognised branch); group-add rollback stays inside the wrapper. The `domain` parameter on `addUserToNdxGroup` is retained for **log correlation only** (it appears in the structured log line, not in the IDC SDK call) — keep this behaviour to avoid breaking existing log shapes.
- [x] `infra-signup/lib/lambda/signup/handler.ts` -- Read `request.email` only (no `request.domain`); derive `normalizedEmail` then `normalizedDomain` via `normalizedEmail.split("@")[1]`; compute `isWaitlist = !isEmailDomainAllowed(normalizedEmail, domains)`; remove the early `DOMAIN_NOT_ALLOWED` return; allowlisted path calls existing `createUser` and emits `UserCreated`; waitlist path calls `createUserOnly` and emits `WaitlistAdded`; vary the Slack alert `title` accordingly; include `waitlist: isWaitlist` in the 200 body. Emit structured `INFO` log fields `signupBranch: "recognised" | "waitlist"` and `signupDomain: <normalizedDomain>` on the success path so the post-deploy branch-ratio check and the demand-by-domain query have data to read.
- [x] Lambda request schema — accept `{ firstName, lastName, email }` and tolerate an extra `domain` field if present (ignored, not rejected) for the duration of one deploy window so a frontend-first or backend-first rollout doesn't 400 in-flight requests. Remove the tolerance in a follow-up.
- [x] `infra/lib/lambda/notification/types.ts` -- Extend `NotificationEventType` with `"WaitlistAdded"`.
- [x] `infra/lib/lambda/notification/validation.ts` -- Add `WaitlistAddedDetailSchema` (same fields as `UserCreatedDetailSchema`); add to `EVENT_SCHEMAS`; export `WaitlistAddedDetail`.
- [x] `infra/lib/lambda/notification/templates.ts` -- Add `WaitlistAdded` to `NOTIFY_TEMPLATES`, `USER_EVENTS`, and the dispatch `switch`; implement `buildWaitlistAddedPersonalisation` returning `{ userName }`.
- [x] `infra/lib/config.ts` -- Add `WAITLIST_ADDED: ""` to `NOTIFY_TEMPLATE_IDS`; add `WaitlistAdded: NOTIFY_TEMPLATE_IDS.WAITLIST_ADDED` to `EVENT_TYPE_TO_TEMPLATE_ID`.
- [x] `infra/lib/notification-stack.ts` -- Wire `NOTIFY_TEMPLATE_WAITLIST_ADDED: NOTIFY_TEMPLATE_IDS.WAITLIST_ADDED` into the notification Lambda's `environment`.
- [x] `infra/lib/config.ts` (or `infra/lib/notification-stack.ts` constructor) — synth-time assertion that throws when `NOTIFY_TEMPLATE_IDS.WAITLIST_ADDED === ""` and the env context is `"prod"` (use `this.node.tryGetContext("env") === "prod"`, same pattern as `infra/lib/waf-stack.ts:53`). Strictly stronger than the runtime `WARN`-and-skip path: makes it impossible to `cdk deploy` against prod with the placeholder still in place. Non-prod environments are exempt.
- [x] Update co-located unit tests in `src/signup/`, `infra-signup/lib/lambda/signup/`, and `infra/lib/lambda/notification/` to cover both branches and the I/O matrix (single-field validation, recognised vs waitlist routing, group-add skipped for waitlist, Slack title varies, `WaitlistAdded` registered everywhere).
- [x] Unit: empty `NOTIFY_TEMPLATE_WAITLIST_ADDED` branch logs `WARN` and skips dispatch without crashing — `CreateUser` and Slack alert both still fire.
- [x] Unit: `addUserToNdxGroup(userId, correlationId, domain)` is called with a domain **derived server-side** from `normalizedEmail`, not echoed from the request body.
- [x] A11y unit/E2E: indicator updates are debounced and not re-announced on identical content (`role="status"` region's text only changes when the parsed domain segment changes); focus moves to the `<h1>` of the confirmation panel on `/signup/success` and `/signup/waitlist`.
- [x] Unit: parameterised regression test for `isEmailDomainAllowed` covering: case-insensitive match (`Name@COUNCIL.gov.uk` recognises `council.gov.uk`); trailing-dot rejection; sub-domain **exact-match only** (`dept.council.gov.uk` waitlists when only `council.gov.uk` is allowlisted); non-ASCII domain rejected at the validation layer before allowlist comparison; leading/trailing whitespace trimmed before comparison; explicit assertion of these as the chosen match policy.
- [x] `src/signup/types.ts:185` — extend `FORBIDDEN_NAME_CHARS` to include `(` and `)` (e.g. `/[<>()'"&\x00-\x1F\x7F]/`); add unit cases in `src/signup/types.test.ts` confirming the new chars are rejected.
- [x] `infra-signup/lib/lambda/signup/handler.ts:449-450` — extend Slack mrkdwn stripping to also strip `<` and apply the same strip to `normalizedEmail` before embedding. Add a unit test that asserts a payload built from `firstName="<!channel"`, `lastName=">"`, `email="<https://evil|click>@x.com"` is rendered with no surviving Slack metacharacters.
- [x] `infra-signup/lib/lambda/signup/handler.ts` — when `getDomains` resolves to an empty array, return 5xx `SERVER_ERROR` instead of computing `isWaitlist = true` for everyone. Log `ERROR` with enough context to alarm on.
- [x] `infra-signup/lib/lambda/signup/handler.ts` — implement the timing floor: record `startTime` at handler entry, define `TIMING_FLOOR_MS = 400`, and before returning the response `await` until `Date.now() - startTime >= TIMING_FLOOR_MS`. The existing 50–150ms random jitter is applied on top (jitter still happens at the same point in the handler as today). Closes the branch-latency oracle that would otherwise let an attacker enumerate allowlisted domains by response time.
- [x] `infra-signup/lib/lambda/signup/handler.ts` — when `CreateUser` fails with 409 `USER_EXISTS`, log a `WARN` if the supplied `firstName`/`lastName` differ from the stored IDC user's `GivenName`/`FamilyName`. Detective signal for possible squatting; no behaviour change.
- [x] Signup request Zod schema — assert via unit test that a request with extra fields (`{ firstName, lastName, email, domain: "x", __proto__: { foo: "bar" }, secretField: "<!channel>" }`) produces logs, Slack alerts, and Notify payloads **identical** to the same request without the extras. Confirms `.strip()` semantics — no `.passthrough()` regression.
- [x] `tests/e2e/signup/signup.spec.ts` -- Update the signup happy-path spec for the single email field; add a waitlist happy-path spec landing on `/signup/waitlist`.

**Acceptance Criteria:**

- Given a user lands on `/signup`, when the form is rendered, then there is exactly one email input (no domain `<select>`) and the recognition indicator region is empty until the user types a domain.
- Given the user types `name@listed.gov.uk` (a domain in the cached allowlist), when the input event fires, then the indicator shows the "you'll get instant access" copy with non-colour-only signalling.
- Given the user types `name@unlisted.example`, when the input event fires, then the indicator shows the "you'll join the waitlist" copy.
- Given the user submits with a recognised domain, when the Lambda completes successfully, then a new IDC user is created, the user is added to the NDX group, a `UserCreated` Notify event is published, a Slack alert titled "New NDX User Created" is published, and the response is `{success:true, waitlist:false}`.
- Given the user submits with an unlisted domain, when the Lambda completes successfully, then an IDC user is created **without** group membership, a `WaitlistAdded` Notify event is published, a Slack alert titled "New NDX Waitlist Signup" is published, and the response is `{success:true, waitlist:true}`.
- Given the Notify or Slack publish fails, when the Lambda otherwise succeeds, then a `WARN` log is emitted and the API still returns 200.
- Given the existing security checks (CSRF, Content-Type, body size, prototype-pollution, normalisation, `+` alias, multi-`@`, length, `FORBIDDEN_NAME_CHARS`), when violated, then the same error codes and messages are returned as today.
- Given `WaitlistAdded`, when the notification Lambda dispatches, then it resolves the template ID from `NOTIFY_TEMPLATE_WAITLIST_ADDED` and personalises with `userName`.
- Given a unit test with deterministic IDC mocks, when the handler completes either branch, then the elapsed wall-clock from request receipt to response is **≥ `TIMING_FLOOR_MS` (400ms)** plus the existing 50–150ms jitter. (Statistical timing-oracle indistinguishability is not asserted in unit tests; the floor is the testable invariant.)
- Given any user-controlled field (`firstName`, `lastName`, `email`) contains Slack mrkdwn metacharacters (`* _ ~ \` < >`), when the Slack alert is published, then no metacharacter survives in the embedded payload.
- Given a request body contains unknown fields (e.g. legacy `domain`, `__proto__`, arbitrary extras), when validated by the Zod schema, then those fields are silently stripped — no log entry mentions them, no Slack/Notify payload includes them, and the response is identical to the same request without the extras.
- Given `getDomains` resolves to an empty array, when the handler runs, then a 5xx `SERVER_ERROR` is returned with no `CreateUser` attempted and an `ERROR` log emitted.
- Given a successful signup on either branch, when the handler logs at `INFO`, then a structured field `signupBranch: "recognised" | "waitlist"` is present in the log line.
- Given a `firstName` or `lastName` containing `(` or `)`, when the form is submitted, then a 400 `INVALID_NAME` is returned with the same inline + summary error pattern as other forbidden chars.
- Given a `CreateUser` call returns `USER_EXISTS` and the supplied `firstName`/`lastName` differ from the stored IDC user's `GivenName`/`FamilyName`, when the handler logs the conflict, then a `WARN` line is emitted (no behaviour change to the client response).
- Given `yarn build`, `yarn test`, `yarn test:e2e`, and `yarn lint` are run, when the change is complete, then all four pass.

## Spec Change Log

- 2026-05-28 — Step-04 adversarial / edge-case / acceptance review (3 parallel reviewers). Patches applied: (1) **frozen-rule bug fix** — `addTimingJitter` now runs AFTER `awaitTimingFloor` so jitter stacks on top of the 400ms floor instead of being absorbed inside it (the prior implementation had jitter run at handler entry, before `startTime` was elapsed against the floor — total wait collapsed to ~400ms instead of the specified 400 + 50–150ms). Test strengthened to assert `elapsed >= TIMING_FLOOR_MS + 50`. (2) `parseDomainFromEmail` now rejects domains starting/ending with `.` for client/server consistency. (3) Squatting-WARN name compare now trim+caseFolds before diffing so legacy IDC records with whitespace/casing drift don't false-positive. (4) Squatting-check `catch{}` now WARN-logs the underlying error instead of silently swallowing it. (5) `getExistingUserNames` returns `null` and WARN-logs when ListUsers somehow returns >1 match (rather than picking `[0]` blindly). (6) Notify-failure non-blocking test now mocks `LambdaClient.send` + `SNSClient.send` to reject deterministically rather than relying on real-SDK behaviour in CI. (7) Added direct test that `createUser` orchestrator passes the email-derived domain to `addUserToNdxGroup` even when a smuggled `domain` field is on the request. (8) Added `waitlist:false` body assertion to the "accepts new request shape" test. (9) Added SNS-publish-payload assertion that no Slack metacharacter survives end-to-end. Removed: dead `void addUserToNdxGroup` import in handler. Deferred to `deferred-work.md`: squatting-test string coupling, timing-test flake risk, empty-domain log hygiene, extras-test payload mocking.
- 2026-05-28 — Planning-step codebase verification. Corrected: e2e path is `tests/e2e/signup/signup.spec.ts` (not `tests/e2e/signup.spec.ts`); added Code Map entries naming `infra-signup/lib/lambda/signup/services.ts:37` (`isEmailDomainAllowed`) and `domain-service.ts:172` (`getDomains`) as the existing reused imports so the implementer doesn't reinvent them. No frozen-block changes.
- 2026-05-28 — Advanced elicitation session (stakeholder-lens, pre-mortem, boundary-sweep, red-team, critique-and-refine, inversion). Added/clarified: indicator a11y rules (debounce, focus management); WAF rate-limit cross-reference; Slack mrkdwn stripping extended to `email` and `<`; empty domain list fails closed; timing-delay normalises both oracles; pre-registration squatting documented as accepted residual with `WARN` detection; ban on `(` `)` in name fields (Notify `((field))` injection); ban on Zod `.passthrough()`; new I/O matrix rows; new acceptance criteria; IDN policy guidance pending the Ask First decision; sub-domain matching settled as exact-match; lifecycle/retention flagged out of scope for follow-up. Inversion pass added: atomic-delivery rule; pre-launch gates (named owner, privacy sign-off, baseline metric); synth-time assertion against placeholder Notify template ID; demand-by-domain Logs Insights query; 30-day conversion comparison. Verification-before-completion pass concretised: `TIMING_FLOOR_MS = 400` constant for timing-oracle defence; testable timing AC; IDN policy decided as "reject non-ASCII domains" (removed from Ask First, settled in I/O matrix and Always); case-insensitive lookup pinned on both client and server; `addUserToNdxGroup` domain parameter clarified as log-only; atomic-delivery rule made reviewer-enforced (single PR); synth-time assertion implementation pattern named (`tryGetContext("env") === "prod"`); existing `DomainInfo` and `userName` shapes restated in Design Notes to prevent reinvention.

## Design Notes

**Live indicator copy (drafted — `Ask First` to change):**

- Recognised — `<p class="govuk-hint">✓ <strong>{orgName}</strong> is registered. You'll get instant access after signing in.</p>` (the ✓ is decorative; copy carries the meaning).
- Waitlist — `<p class="govuk-hint">{domain} isn't on our list yet. You can still sign up — we'll add you to the waitlist and email when access opens.</p>`
- The region is `role="status" aria-live="polite"` so the change is announced; never use colour alone.

**Submit button copy:** stays `Continue` in both states — the indicator carries the routing signal, so we don't need to swap labels. (Confirms simpler than the alt of `Create account` / `Join the waitlist`.)

**Server-side branch (handler):**

```ts
const normalizedEmail = normalizeEmail(request.email)
const domains = await getDomains(correlationId)
const isWaitlist = !isEmailDomainAllowed(normalizedEmail, domains)
const userId = isWaitlist
  ? await createUserOnly({ ...request, email: normalizedEmail }, correlationId)
  : await createUser({ ...request, email: normalizedEmail }, correlationId)
const eventDetailType = isWaitlist ? "WaitlistAdded" : "UserCreated"
const slackTitle = isWaitlist ? "New NDX Waitlist Signup" : "New NDX User Created"
// ...fire-and-forget Notify invoke + SNS publish using the variables above
return successResponse({ success: true, waitlist: isWaitlist }, correlationId)
```

**Draft GOV.UK Notify template body — `WaitlistAdded`** (user creates this in Notify and provides the ID):

- *Subject:* `Thanks for your interest in NDX`
- *Body:*

  ```
  Hi ((userName)),

  We received a signup request to NDX (the National Digital Exchange) using this email address. If this wasn't you, you can ignore this message — we'll remove the record on request (see below).

  NDX:Try is currently open to local government organisations. Your organisation isn't on our active list yet, so we've added you to our waitlist. We'll email you when access opens to your part of the public sector.

  You don't need to do anything in the meantime.

  Want to be removed? Email ndx@dsit.gov.uk with the subject "Remove me from the NDX waitlist" and we'll delete your record.

  The NDX team
  Department for Science, Innovation and Technology
  ```

**Draft waitlist success page (`src/signup/waitlist.md`):** GOV.UK confirmation panel "You're on the waitlist", followed by inset text mirroring the Notify body and a `mailto:ndx@dsit.gov.uk?subject=Remove me from the NDX waitlist` link. No "Sign in now" CTA (their sign-in would lead nowhere useful).

**`WaitlistAddedDetailSchema`:** identical to `UserCreatedDetailSchema` (`userEmail`, `firstName`, `lastName`, optional `userId`). Keeping the shape identical means the existing eventbridge payload-builder in the signup Lambda only needs the `detail-type` swapped.

**Why no rollback in the waitlist branch:** the waitlist branch never calls `CreateGroupMembership`, so there's no second-step to fail; the only failure mode is `CreateUser` itself, handled by the existing 500-path.

**Indicator state machine:**

| State | Trigger | Indicator content |
|---|---|---|
| Empty | Field empty / cleared / focus first gained | `<div id="email-status">` is empty; no announcement |
| Typing — not yet parseable | No `@`, or `@` with no `.` after it | Empty — do not flash "waitlist" prematurely |
| Parsed — recognised | Domain after `@` matches an allowlist entry per chosen policy | Recognised copy (✓ + organisation name) |
| Parsed — waitlist | Domain after `@` is well-formed but not on the allowlist | Waitlist copy |
| Reset | Field cleared after parse | Back to Empty; announce nothing |

Debounce: 300ms idle after the most recent `input` event; only re-render and re-announce when the *parsed domain segment* differs from the last rendered state, never on identical content.

**Waitlist → recognised promotion runbook (ops, NOT built here):** when a domain is added to the allowlist, every existing IDC user whose `userName` ends in that domain needs to be added to the NDX group manually (or via a one-shot script ops runs). Without this, previously-waitlisted users will hit `USER_EXISTS` on retry, get redirected to `/login` via the existing flow, and land in NDX with no permissions. Flagged as the responsibility of whoever promotes a domain — not part of this spec's implementation.

**IDN policy clarification (once the Ask First decision is taken):**

- If IDN domains are to be **accepted**, convert all input domains to **punycode** and compare against a punycode-form allowlist. Do **not** combine Unicode normalisation + case-fold + compare — that's exactly what homoglyph attacks (e.g. Greek `οmicron` masquerading as Latin `o` in `gov.uk`) rely on.
- If IDN domains are to be **rejected**, reject any email whose domain contains any non-ASCII codepoint before any other processing, with a clear `INVALID_EMAIL` error.

**`X-NDX-Request: signup-form` clarification:** this header blocks the trivial cross-site `<form>` submission (because a cross-origin `<form>` can't set custom headers), but provides **no protection** against any scripted attacker — they can trivially set the header. Keep the check (it's free, blocks the naive case) but don't lean on it in the threat model for scripted abuse; per-IP WAF rate-limiting + the aggregate-rate alarm are the real controls.

**Existing shapes the dev should reuse (not reinvent):**

- `/signup-api/domains` already returns `DomainInfo[]` where `DomainInfo = { domain: string; orgName: string }` — see `src/signup/types.ts:111`. The recognised-indicator copy's `{orgName}` placeholder reads `orgName` straight off this shape; no new endpoint or response field is needed.
- The Notify `((userName))` placeholder, in existing templates, resolves to `userEmail.split("@")[0]` (see `infra/lib/lambda/notification/templates.ts:727`). `buildWaitlistAddedPersonalisation` mirrors this exactly — no synthesis from `firstName`/`lastName`, no surprises for the implementing dev.

## Verification

**Commands:**

- `yarn lint` — expected: passes (Prettier clean).
- `yarn test` — expected: all suites pass, coverage thresholds (branches 70%, functions/lines/statements 80%) hold; new test cases for both branches and `WaitlistAdded` registration appear.
- `yarn build && yarn build:try-js` — expected: Eleventy build succeeds; client bundle compiles with strict TypeScript.
- `yarn test:e2e` — expected: signup happy-path (recognised) and waitlist happy-path (unlisted) both green; axe-core checks pass on `/signup` and `/signup/waitlist`.
- After deploy, `curl -s -X POST https://ndx.digital.cabinet-office.gov.uk/signup-api/signup -H 'Content-Type: application/json' -H 'X-NDX-Request: signup-form' -d '{"firstName":"A","lastName":"B","email":"a.b@unlisted.example"}'` — expected: `200 {"success":true,"waitlist":true}` (use a throwaway address; remember to delete the IDC user afterwards).

**Pre-launch gates (must be signed off before merge):**

- **Named waitlist owner** committed to a review cadence (who reviews, how often, what threshold triggers promoting a domain to the allowlist). Without this, the waitlist becomes a write-only graveyard and the "we'll email when access opens" promise is unkeepable. Capture the owner's name and cadence in the runbook stub at the end of Design Notes.
- **Privacy sign-off** recorded — DPIA addendum or equivalent confirming that processing personal data for non-onboarded users (waitlisted submitters) is covered. Capture the approver's name and the date alongside this spec before merge. This is a hard gate, not an Ask First item.
- **Baseline signup volume** captured for the last 30 days (recognised-domain signups per day). Used to detect regressions in conversion after launch; without it the "did simplification help?" question is unanswerable.

**Manual checks:**

- Load `/signup` in a browser, type a recognised domain → indicator copy updates; type an unrecognised domain → waitlist copy appears.
- **Mandatory before declaring done:** submit a real waitlist signup against a monitored throwaway mailbox and confirm the `WaitlistAdded` Notify email is received end-to-end (template ID correct, personalisation renders, copy matches Design Notes). A passing build is not sufficient — the Notify template is configured outside the repo and can be misconfigured invisibly.
- Submit each branch with a throwaway address; verify the corresponding Notify email lands, the Slack message has the correct title, and the IDC user has (or doesn't have) NDX group membership.
- After the first week in prod, check the recognised-vs-waitlist branch ratio in CloudWatch logs (handler emits a structured field per branch). A sudden swing toward all-waitlist signals a regression in `isEmailDomainAllowed`; a sudden swing toward all-recognised signals an allowlist bypass.
- 30 days post-launch, compare recognised-domain signup volume to the pre-launch baseline. A material drop is a conversion regression that warrants revisiting the indicator copy or single-field UX.
- **Demand-by-domain query** — paste into CloudWatch Logs Insights against the signup Lambda's log group when ops needs to know "which domain should we promote next?":

  ```
  fields @timestamp, signupBranch, signupDomain
  | filter signupBranch = "waitlist"
  | stats count(*) as signups by signupDomain
  | sort signups desc
  | limit 20
  ```

  Run weekly until the named owner has automation. Converts Slack-message noise into actionable demand signal.
- Confirm GOV.UK Notify quota for the NDX service is sized for projected waitlist volume (≥ 100× current per-day signup rate is a reasonable floor). If a botnet burns the daily allowance, legitimate `UserCreated` emails also fail — raise the quota or accept the risk explicitly before launch.
- Review `#ndx-sandbox-alerts` channel membership before launch — every waitlist signup will now embed `firstName`, `lastName`, and `email` in the channel. The submitter population just widened from "allowlisted public-sector orgs" to "any well-formed email", so the channel audience needs to be appropriate for that PII surface.
- Verify the waitlist Notify template ID is set in `infra/lib/config.ts` before deploying — if it's the empty-string placeholder, the dispatch should log a `WARN` and skip rather than crash (existing notification-Lambda behaviour when a template ID is missing).
- Confirm that **no AWS-branded mail** lands at the waitlisted test address after `CreateUser` — this spec is built on the assumption that IDC does not send an automated invitation/password email at user-creation time. If one does arrive, the waitlist Notify copy needs to be revisited.
- Submit ~10 waitlist signups against the same fake unlisted domain in quick succession and confirm Slack volume in `#ndx-sandbox-alerts` is tolerable. If the channel is overwhelmed, follow up with rate-limit / dedupe / aggregation work as a separate spec.

**Logged for follow-up (not in this spec):**

- Aggregate (cross-IP) rate-limiting on `/signup-api/signup`. Per-IP WAF stays (`infra/lib/waf-stack.ts:66`); a CloudWatch alarm on the `signupBranch=waitlist` count per 5-minute window becomes the detective control for distributed botnet activity. Build the alarm in a follow-up spec.
- Disposable / single-use email-provider blocklist (`mailinator.com`, `tempmail.io`, etc.). Out of scope; pollutes waitlist demand-signal without creating security harm.
- Aggregation / dedupe of Slack waitlist alerts (e.g. "first signup from `<domain>` in 24h" rather than one alert per submit). Requires lightweight per-domain state; defer until volume demonstrates need.

## Suggested Review Order

**Server-side branch decision (the heart of the change)**

- Start here — single `handleSignup` reads request, derives `isWaitlist`, fails closed on empty allowlist, branches IDC + Notify + Slack.
  [`handler.ts:234`](../../infra-signup/lib/lambda/signup/handler.ts#L234)

- Timing-floor + jitter ordering — jitter applied AFTER the floor so it stacks on top, closing the branch-latency oracle.
  [`handler.ts:166`](../../infra-signup/lib/lambda/signup/handler.ts#L166)

**IDC interaction split (waitlist users are created but not grouped)**

- `createUserOnly` — bare CreateUser for the waitlist branch (no group, no rollback).
  [`identity-store-service.ts:340`](../../infra-signup/lib/lambda/signup/identity-store-service.ts#L340)

- `addUserToNdxGroup` — group membership extracted from old `createUser`; `domain` arg is log-only.
  [`identity-store-service.ts:421`](../../infra-signup/lib/lambda/signup/identity-store-service.ts#L421)

- `createUser` orchestrator — recognised-branch wrapper that calls both and rolls back on group failure.
  [`identity-store-service.ts:493`](../../infra-signup/lib/lambda/signup/identity-store-service.ts#L493)

**Detective signals & input hardening**

- Squatting WARN — trim+caseFold name compare on USER_EXISTS; logs WARN-on-error rather than swallowing.
  [`handler.ts:456`](../../infra-signup/lib/lambda/signup/handler.ts#L456)

- `getExistingUserNames` — guards against >1 ListUsers match before reading `[0]`.
  [`identity-store-service.ts:258`](../../infra-signup/lib/lambda/signup/identity-store-service.ts#L258)

- Slack mrkdwn strip — `stripSlackMrkdwn` covers `* _ ~ \` < >` and is applied to `firstName`, `lastName`, **and** `email` at the SNS publish site.
  [`handler.ts:51`](../../infra-signup/lib/lambda/signup/handler.ts#L51)

- FORBIDDEN_NAME_CHARS extension — adds `(` and `)` to block Notify `((field))` template injection.
  [`types.ts:190`](../../src/signup/types.ts#L190)

**WaitlistAdded notification (new event end-to-end)**

- Notify template config + dispatch case — central control point for the new event.
  [`templates.ts:224`](../../infra/lib/lambda/notification/templates.ts#L224)

- `buildWaitlistAddedPersonalisation` — mirrors UserCreated's `userEmail.split("@")[0]` for `userName`.
  [`templates.ts:1242`](../../infra/lib/lambda/notification/templates.ts#L1242)

- Detail schema — mirrors UserCreatedDetailSchema, registered in `EVENT_SCHEMAS`.
  [`validation.ts:291`](../../infra/lib/lambda/notification/validation.ts#L291)

- Union member — single source of truth for event names.
  [`types.ts:129`](../../infra/lib/lambda/notification/types.ts#L129)

- Synth-time assertion — refuses `cdk deploy --context env=prod` while the template ID is the empty placeholder.
  [`notification-stack.ts:106`](../../infra/lib/notification-stack.ts#L106)

- Env-var plumbing + ID placeholder.
  [`config.ts:266`](../../infra/lib/config.ts#L266)

**Client UI: single email + live indicator**

- `parseDomainFromEmail` — rejects no-`@`, multi-`@`, leading/trailing-dot domains so indicator and server agree.
  [`main.ts:131`](../../src/signup/main.ts#L131)

- Form markup — single `govuk-input` + `role="status" aria-live="polite"` indicator region.
  [`signup.md:1`](../../src/signup.md#L1)

- Indicator state machine + debounce — only re-announces when the parsed domain segment changes.
  [`main.ts:195`](../../src/signup/main.ts#L195)

- Submit handler — routes to `/signup/waitlist` when `waitlist:true`, otherwise `/signup/success`.
  [`main.ts:317`](../../src/signup/main.ts#L317)

- Shared types — `domain` dropped from `SignupRequest`, `waitlist?: boolean` added to `SignupResponse`.
  [`types.ts:66`](../../src/signup/types.ts#L66)

**Confirmation pages**

- New waitlist confirmation page with privacy-notice link.
  [`waitlist.md:1`](../../src/signup/waitlist.md#L1)

- Existing success page — `tabindex="-1"` added to `<h1>` for focus management.
  [`success.md:1`](../../src/signup/success.md#L1)

**Tests (verify behaviour, not implementation)**

- Lambda handler tests — both branches, timing-floor+jitter stacking, Slack mrkdwn SNS payload, non-blocking Notify failure with deterministic SDK mocks, squatting WARN, silent strip of extras.
  [`handler.test.ts:1`](../../infra-signup/lib/lambda/signup/handler.test.ts#L1)

- IDC service tests — `createUserOnly` / `addUserToNdxGroup` / orchestrator domain derivation, multi-match guard, smuggled-domain regression.
  [`identity-store-service.test.ts:492`](../../infra-signup/lib/lambda/signup/identity-store-service.test.ts#L492)

- Notification tests — WaitlistAdded schema + template registration + dispatch.
  [`templates.test.ts:1`](../../infra/lib/lambda/notification/templates.test.ts#L1)

- Client tests — `parseDomainFromEmail`, indicator state machine, waitlist response routing, paren-rejection.
  [`main.test.ts:1`](../../src/signup/main.test.ts#L1)

- E2E — single-field form + waitlist happy-path.
  [`signup.spec.ts:1`](../../tests/e2e/signup/signup.spec.ts#L1)

