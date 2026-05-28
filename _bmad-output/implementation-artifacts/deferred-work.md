# Deferred Work

Items surfaced during quick-dev reviews that are not regressions caused by the current change, or are pre-existing issues, or are non-critical follow-ups. Each item should become its own spec when picked up.

## From `spec-simplify-signup-form-and-waitlist.md` review (2026-05-28)

- ~~**Squatting WARN test couples on log message string.**~~ — **done 2026-05-28** in `feat/signup-blocklist-and-cleanups` (A1): handler now emits `event: "squatting_warn"` discriminator; tests assert on it.
- ~~**Timing-floor test is flaky risk on slow CI / under shared fake-timers.**~~ — **done 2026-05-28** (A2): `jest.useRealTimers()` added in beforeEach of the timing-floor invariant suite.
- ~~**Empty-domain log hygiene in `createUserOnly` for malformed-pre-validation inputs.**~~ — **done 2026-05-28** (A3): coerce empty `split("@")[1]` to "unknown" in both `createUserOnly` and the `createUser` orchestrator.
- ~~**Strengthen the "identical extras" silent-strip test with Slack/Notify payload mock assertions.**~~ — **done 2026-05-28** (A4): test now spies `LambdaClient.send` and `SNSClient.send` and asserts byte-identical payloads between base and enriched requests (modulo per-call IDs).

## Pre-existing (not caused by this change, but worth picking up)

- ~~**`infra-signup/lib/signup-stack.test.ts` (23 tests)** fail at CDK synth with `yarn run esbuild ... exited with status 1`.~~ — **done 2026-05-28** (B1): root cause was Yarn 4 not resolving binaries for `yarn run <name>`. Fix: one-line `"esbuild": "./node_modules/.bin/esbuild"` script in both `infra-signup/package.json` and `infra/package.json`.
- ~~**`yarn lint` exits non-zero on untracked `.husky/_/*` files.**~~ — **done 2026-05-28** (B2): `.husky/_/` added to `.prettierignore`.
- **Aggregate (cross-IP) rate-limiting on `/signup-api/signup`** — per-IP WAF stays; build a CloudWatch alarm on `signupBranch=waitlist` count per 5-minute window as the detective control for distributed botnet activity. (Related: the blocklist-regression alarm shipped in `feat/signup-overhaul` watches `signupBlocked == 0` over 24h with > 5 attempts — same pattern, different metric.)
- ~~**Disposable / single-use email-provider blocklist** for the waitlist branch.~~ — **done 2026-05-28** in `feat/signup-blocklist-and-cleanups` (Group C): personal + disposable providers now hard-rejected with `WORK_EMAIL_REQUIRED` 400 BEFORE reaching the waitlist branch. Backed by `disposable-email-domains` npm package (~3,500 entries) plus a hand-curated personal-provider list shared client-side via `@ndx/signup-types/blocklist-data`.
- **Slack aggregation / dedupe** for waitlist alerts once volume demonstrates need.
- **Waitlist user lifecycle / retention policy** (review cadence, ageing-out, deletion ownership) — flagged out of scope in this spec; pick up as a dedicated waitlist-ops spec.
- **`UserCreatedDetailSchema` and `WaitlistAddedDetailSchema` use Zod `.passthrough()`.** The signup spec bans `.passthrough()` on the signup *request* schema. The notification *event* schemas inherited the existing UserCreated pattern. Worth revisiting whether `.strip()` is safer for event detail schemas too, given waitlist signups now widen the submitter population.

## Spec lifecycle gaps (pre-launch, human-owned)

- ~~Named waitlist owner + review cadence (gate spec line 244).~~
- ~~Privacy / DPIA sign-off for processing non-onboarded user data (gate spec line 245).~~
- 30-day baseline signup volume captured (gate spec line 246).
- ~~GOV.UK Notify template ID created and pasted into `infra/lib/config.ts`~~ — **done 2026-05-28**, set to `d67de4ec-843e-4107-8f6c-698ccead8d49`. Synth-time assertion will now allow prod deploy.
- Remove the one-deploy-window tolerance for legacy `domain` field once both client and server are deployed.
- Remove the deprecated `DOMAIN_NOT_ALLOWED` `SignupErrorCode` enum value once monitoring dashboards no longer key on the literal string (added `@deprecated` JSDoc in `feat/signup-blocklist-and-cleanups`).
