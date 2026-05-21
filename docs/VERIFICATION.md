# GeoTracker — Phase 1 Verification Runbook

How to execute every gate in [PLAN.md §Verification](./PLAN.md). Each section
lists prerequisites, command, and a clear pass/fail expectation. Failures
should be filed as bugs with the gate name in the title.

---

## Prereqs (one-time)

```powershell
# From repo root
pnpm install
cp .env.example .env   # then fill in DATABASE_URL, REDIS_URL at minimum

# Local stack (Postgres + Redis) — required for everything beyond unit tests
pnpm docker:up
pnpm db:migrate
pnpm db:seed

# Playwright browser (one-time)
pnpm --filter @geotracker/web exec playwright install chromium
```

For the live-Resend Pulse gate you also need:

- `RESEND_API_KEY` set to a Resend test or production key.
- `PULSE_FROM_EMAIL` set to a Resend-verified sending domain.
- Add your email to `ADMIN_EMAILS` so you can hit `/admin/*`.

---

## Gate 1 — Unit (Vitest)

**Covers** BRD §5.2 scoring truth table, parsing edge cases (generic name,
caveats), industry inference, LLM adapter payload shaping, Pulse unsubscribe
tokens, origin guard, catchment fallback.

```powershell
pnpm test
```

**Pass:** all suites green. 67 tests at time of writing across:

- [apps/api/src/scoring/score.test.ts](../apps/api/src/scoring/score.test.ts) — 12 tests
- [apps/api/src/parsing/extractMentions.test.ts](../apps/api/src/parsing/extractMentions.test.ts) — 7 tests
- [apps/api/src/prompts/inferIndustry.test.ts](../apps/api/src/prompts/inferIndustry.test.ts) — 7 tests
- [apps/api/src/llm/*.test.ts](../apps/api/src/llm/) — 20 tests (adapters + health)
- [apps/api/src/orchestrator/pipeline.test.ts](../apps/api/src/orchestrator/pipeline.test.ts) — 4 tests
- plus auth, geospatial, pulse-token suites

**Fail:** open the suite, fix the regression, rerun.

---

## Gate 2 — Integration (real Postgres + Redis + BullMQ)

**Covers** the gate phrased in PLAN.md as: "Spin up docker-compose, run an
audit via `POST /audits` with the mock adapter; assert SSE stream emits one
progress event per (LLM, city) tuple and final result matches expected
fixture."

```powershell
# Docker stack must be up + migrated + seeded (see Prereqs).
pnpm --filter @geotracker/api test:integration
```

The integration suite is in
[apps/api/src/orchestrator/runAudit.integration.test.ts](../apps/api/src/orchestrator/runAudit.integration.test.ts).
It is gated by `INTEGRATION=1` (set automatically by
`vitest.integration.config.ts`) and excluded from `pnpm test` so the unit
run stays hermetic.

**Pass:**

1. `POST /audits` returns `202` + a uuid.
2. The SSE stream at `/audits/:id/stream` emits exactly
   `5 providers × prompts_per_industry × cities_in_catchment` progress events
   (e.g. `5 × 8 × 6 = 240` for `dentists` + `Austin` fixture) followed by a
   single `complete` event with `completedRatio === 1`.
3. The `audits` row lands in status `complete` with `score` in `[0, 100]`
   and `completed_at` set.
4. `audit_results` contains one row per cell.

**Fail patterns:**

- *"industries table is empty"* → seeds didn't run; `pnpm db:seed`.
- *ECONNREFUSED on 5432/6379* → Docker stack not up; `pnpm docker:up`.
- *Event count off by one* → a duplicate publish or a missed
  publish in [runAudit.ts](../apps/api/src/orchestrator/runAudit.ts).
- *Status = `partial`* with no rejected promises → check provider coverage
  logic at the bottom of `runAudit.ts`.

---

## Gate 3 — E2E (Playwright)

**Covers** the gate: "Paste `example-dental.com` in Hero → progress bar
fills → reveal dashboard renders gauge + grid → vendor table visible → CTA."

```powershell
# Docker stack must be up + migrated + seeded.
# Playwright will boot both `astro dev` and `api dev` automatically.
pnpm --filter @geotracker/web test:e2e
```

Spec: [apps/web/e2e/happy-path.spec.ts](../apps/web/e2e/happy-path.spec.ts).
Config: [apps/web/playwright.config.ts](../apps/web/playwright.config.ts).

**Pass:** test reports `1 passed`. The HTML report at
`apps/web/playwright-report/index.html` shows the full screenshot trail.

**Fail patterns:**

- *Astro webServer timed out* → port 4321 already in use or another
  unrelated dev server crashed; `Stop-Process` it and retry.
- *API webServer timed out* → DB or Redis missing; see Gate 2 fail patterns.
- *Audit-complete header never appears* → the orchestrator hung or SSE
  stream isn't delivering. Check `/audits/:id` directly; if `status` is
  stuck at `running`, the worker isn't draining the queue.

**Deferred sub-gate:** PostHog conversion-tracking ("CTA click captured by
PostHog"). The web app does not currently load the PostHog client SDK —
only the API has a `POSTHOG_API_KEY` env var. The CTA visibility +
clickability assertion in the spec covers the UI contract; PostHog wiring
should land in its own phase and add a `page.route('/posthog**', …)`
assertion to this spec.

---

## Gate 4 — Manual smoke walkthrough

**Covers** the gate: "Run `pnpm dev` from repo root, hit
`http://localhost:4321`, walk the full flow end-to-end including OAuth
(Google sandbox) and Pulse opt-in. Confirm an audit completes in under 15s
with the mock adapter."

```powershell
pnpm docker:up
pnpm dev    # starts both apps/api and apps/web in parallel
```

Then check each item in order:

- [ ] `http://localhost:4321/` renders the Hero with all 5 LLM logos in copy.
- [ ] Pasting `localcoffee.com`, picking "Coffee shops" industry, hitting
      *Check My Visibility Score* navigates to `/audit/<uuid>` within 1 s.
- [ ] Progress bar fills smoothly; each provider chip transitions
      pending → asking → done.
- [ ] Audit completes (header flips to "Audit complete") in **under 15s**.
      If consistently slower, profile the worker — BRD §7.2 is the SLA.
- [ ] Score gauge renders a 0-100 integer. LLM grid shows ≥1 row per
      provider. Blind Spots lists at least one finding.
- [ ] Vendor matrix shows Upserv as the highlighted column.
- [ ] *Book a free consultation* and *Send me a monthly Pulse Report* CTAs
      are both visible.
- [ ] `http://localhost:4321/dashboard` redirects to OAuth when logged out;
      after Google sandbox login it shows the audit history (current audit
      should appear).
- [ ] Toggle Pulse opt-in on the dashboard; `PATCH /me/pulse` returns 200.
- [ ] Subscribe a business to Pulse from the dashboard; row appears in
      `pulse_subscriptions` in Postgres.
- [ ] `http://localhost:4321/admin` is accessible iff your email is in
      `ADMIN_EMAILS`; lead list sorts low-score first.

---

## Gate 5 — Pulse cron live test (Resend + unsubscribe)

**Covers** the gate: "Trigger the repeatable job manually via an admin
route; confirm Resend test email lands and unsubscribe link works."

Prereqs beyond the standard stack:

- `RESEND_API_KEY` set (no key → email is logged to stderr instead of sent).
- `PULSE_FROM_EMAIL` is a Resend-verified address.
- A user account exists in the DB with `pulseOptIn = true` and an email you
  can read. A subscription row exists for an audit.

Force a subscription to be due, then trigger the tick:

```powershell
# 1. Find the subscription you want to test.
psql "$env:DATABASE_URL" -c "select id, user_id, business_id, next_run_at from pulse_subscriptions order by next_run_at limit 5;"

# 2. Backdate next_run_at so the next tick sees it as due.
psql "$env:DATABASE_URL" -c "update pulse_subscriptions set next_run_at = now() - interval '1 day' where id = '<sub-id>';"

# 3. Sign in as an ADMIN_EMAIL user in the browser, then:
curl.exe -b cookies.txt -X POST http://localhost:4000/admin/pulse/run
#    (or use the browser dev tools to POST against the same cookie)
```

The scheduler will enqueue a new audit, then enqueue a `pulse-email` job
with a 30 s delay (so the audit can complete first). Within ~45 s:

**Pass:**

- [ ] Resend dashboard shows one delivery to the target email.
- [ ] Inbox shows the Pulse Report with the current score and (if a
      previous audit exists for the same business) a delta vs. previous.
- [ ] The email contains a `List-Unsubscribe` header (visible in Gmail's
      "Show original").
- [ ] Clicking the unsubscribe link in the email body lands on
      `/pulse/unsubscribe?token=…` and renders the "Unsubscribed." page.
- [ ] The `pulse_subscriptions` row for that user/business is gone and the
      user's `pulse_opt_in` is `false`.

If `RESEND_API_KEY` is unset, the server logs
`[pulse-mock] -> <to>: <subject>` to stderr and the end-to-end gate is only
half-covered — you can still verify the unsubscribe path by extracting the
token from the logged URL.

---

## Known deferred items (not currently blocking ship)

These are tracked here so they don't get lost behind the green check marks
above:

1. **PostHog client wiring** — see Gate 3 note. BRD §7.4 calls for PostHog
   conversion tracking; only the env var is in place. Add `posthog-js` to
   `apps/web`, identify the CTA clicks, and extend the E2E to intercept the
   network call.
2. **Real-LLM adapter smoke** — `LLM_USE_REAL_ADAPTERS=true` is gated on
   BRD §14 (token budget + TOS review). Once those open items are closed,
   run Gate 4 with the flag flipped against one verified domain and confirm
   the score distribution against a known-good baseline.
3. **Catchment with live Google Maps** — Gate 2 currently uses the curated
   fallback fixture. Once `GOOGLE_MAPS_API_KEY` is provisioned, rerun Gate 2
   with the key set and confirm `source === "google-maps"` for at least one
   audit row's catchment.

---

## Quick-reference one-liner

When you just want every automated gate run in sequence:

```powershell
pnpm verify; if ($?) { pnpm --filter @geotracker/api test:integration; if ($?) { pnpm --filter @geotracker/web test:e2e } }
```

This is the pre-merge bar. Gates 4 and 5 are still required before a
release cut.
