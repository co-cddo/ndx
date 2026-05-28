# Deferred Work

Items surfaced during quick-dev reviews that are not regressions caused by the current change, or are pre-existing issues, or are non-critical follow-ups. Each item should become its own spec when picked up.

## From `spec-simplify-signup-form-and-waitlist.md` review (2026-05-28)

- **Squatting WARN test couples on log message string.**
  `infra-signup/lib/lambda/signup/handler.test.ts` asserts on `d.message.includes("squatting")`. Any future edit to the WARN log text breaks the test without changing behaviour. Replace with a stable discriminator (e.g. a dedicated `event: "squatting_warn"` field).

- **Timing-floor test is flaky risk on slow CI / under shared fake-timers.**
  `infra-signup/lib/lambda/signup/handler.test.ts` "timing-floor invariant" relies on real `setTimeout` + `Date.now()`. If another suite installs `jest.useFakeTimers()` without restoring, or if CI is under load, the assertion may fire ~5-10ms early. Mitigation options: explicit `jest.useRealTimers()` in `beforeEach`, or assert on the timing-floor helper directly via `_internal`.

- **Empty-domain log hygiene in `createUserOnly` for malformed-pre-validation inputs.**
  `infra-signup/lib/lambda/signup/identity-store-service.ts:323` computes `logDomain` from `email.split("@")[1]`. For `user@` (trailing `@`) this becomes `""`. Defence-in-depth only — handler validates before this is reached. Tidy log hygiene as a follow-up.

- **Strengthen the "identical extras" silent-strip test with Slack/Notify payload mock assertions.**
  `infra-signup/lib/lambda/signup/handler.test.ts` "silent strip of unknown fields" currently asserts identical `statusCode` + body. Spec line 132 implies identical Slack/Notify payloads too. Mock `SNSClient.prototype.send` and `LambdaClient.prototype.send` and diff the recorded call args between base and enriched requests.

## Pre-existing (not caused by this change, but worth picking up)

- **`infra-signup/lib/signup-stack.test.ts` (23 tests)** fail at CDK synth with `yarn run esbuild ... exited with status 1`. CDK `NodejsFunction` shells out to `yarn run esbuild`, which Yarn 4 in this repo doesn't expose as a script. Confirmed pre-existing; direct esbuild of the handler succeeds.
- **`yarn lint` exits non-zero on untracked `.husky/_/*` files.** Add `.husky/_/` to `.prettierignore`.
- **Aggregate (cross-IP) rate-limiting on `/signup-api/signup`** — per-IP WAF stays; build a CloudWatch alarm on `signupBranch=waitlist` count per 5-minute window as the detective control for distributed botnet activity.
- **Disposable / single-use email-provider blocklist** for the waitlist branch.
- **Slack aggregation / dedupe** for waitlist alerts once volume demonstrates need.
- **Waitlist user lifecycle / retention policy** (review cadence, ageing-out, deletion ownership) — flagged out of scope in this spec; pick up as a dedicated waitlist-ops spec.
- **`UserCreatedDetailSchema` and `WaitlistAddedDetailSchema` use Zod `.passthrough()`.** The signup spec bans `.passthrough()` on the signup *request* schema. The notification *event* schemas inherited the existing UserCreated pattern. Worth revisiting whether `.strip()` is safer for event detail schemas too, given waitlist signups now widen the submitter population.

## Spec lifecycle gaps (pre-launch, human-owned)

- Named waitlist owner + review cadence (gate spec line 244).
- Privacy / DPIA sign-off for processing non-onboarded user data (gate spec line 245).
- 30-day baseline signup volume captured (gate spec line 246).
- ~~GOV.UK Notify template ID created and pasted into `infra/lib/config.ts`~~ — **done 2026-05-28**, set to `d67de4ec-843e-4107-8f6c-698ccead8d49`. Synth-time assertion will now allow prod deploy.
- Remove the one-deploy-window tolerance for legacy `domain` field once both client and server are deployed.
