# SOW_ALIGNMENT_v1.0.md

Audit of [GeoTracker_SOW.pdf](GeoTracker_SOW.pdf) v1.0 (May 23 2026) against the actual codebase on branch `claude/plan-geotracker-app-uLIsn` @ `01c28d8`. Audit date: 2026-05-23.

---

## A. Top-line verdict

The SOW is **broadly correct on architecture and scope but materially wrong on several implementation specifics**. Of the 14 sections audited (§1.1, §1.2, §1.3, §2.1, §2.2, §2.3, §3.1, §3.2, §3.3, §3.4, §4, §5, §6, §7, §8, §9, §10): **6 align cleanly, 9 need revision, 2 are factually false about our code** (auth = HMAC not JWT; geospatial fallback = fixture not Mapbox). The SOW's biggest unforced error is §3.2 (Stack) — three rows are wrong about what we shipped. Its biggest gap is §10 (Exit Criteria) — none of the production-deploy criteria can be met because §2.2's "must ship hosted" prerequisite is unsatisfied. The SOW correctly self-flags DRIFT-001 (skills-as-modules).

---

## B. Section-by-section alignment table

| SOW Section | Status | Evidence | What's actually true |
|---|---|---|---|
| §1.1 In Scope — web app | ✅ | [apps/web/src/components/](apps/web/src/components/) | Matches |
| §1.1 In Scope — 5-LLM async | ⚠️ | [apps/api/src/llm/](apps/api/src/llm/) | All 5 adapters wired but default to mock (`LLM_USE_REAL_ADAPTERS=false`). SOW omits the gating flag. |
| §1.1 In Scope — Green/Yellow/Red scoring | ✅ | [apps/api/src/scoring/score.ts](apps/api/src/scoring/score.ts) | Matches |
| §1.1 In Scope — 20-industry radius | ✅ | seeded `industries` table | Matches |
| §1.1 In Scope — OAuth Google + LinkedIn | ⚠️ | [apps/api/src/routes/auth.ts](apps/api/src/routes/auth.ts) | Code wired; **no creds provisioned**; routes only register when secrets exist |
| §1.1 In Scope — free + premium tiers | ⚠️ | [apps/api/src/db/schema.ts:16](apps/api/src/db/schema.ts#L16) | `user_tier` enum has free/premium/ultra. **No paywall, no Stripe.** Only free is reachable. |
| §1.1 In Scope — monthly Pulse Report | ⚠️ | [apps/api/src/pulse/](apps/api/src/pulse/) | Cron + Resend wired; **live-send not verified** — no `RESEND_API_KEY` set, no verified sending domain |
| §1.1 In Scope — admin (leads, users, API health, conversion) | ⚠️ | [apps/web/src/components/AdminDashboard.tsx](apps/web/src/components/AdminDashboard.tsx) | Leads ✅; user management ❌; api-health endpoint exists but no UI; conversion funnel endpoint exists, PostHog client missing |
| §1.1 In Scope — SSE progress | ✅ | [apps/api/src/realtime/progress.ts](apps/api/src/realtime/progress.ts) | Matches |
| §1.1 In Scope — dental at depth, 12 generic verticals | ⚠️ | [packages/shared/src/prompts.ts](packages/shared/src/prompts.ts) | Dental ✅; **13 (not 12)** other verticals on a single shared 4-prompt fallback template |
| §1.2 Out of Scope | ✅ | n/a | None built |
| §1.3 Explicitly Excluded | ✅ | n/a | None touched |
| §2.1 Assumptions — LLM/OAuth/Maps creds provisioned | ❌ | [apps/api/.env](apps/api/.env) | All keys are placeholders (`OPENAI_API_KEY=...`). Assumption fails. |
| §2.1 Assumptions — dental launch market | ✅ | seed | Matches |
| §2.2 Constraints — ≤15s P95 | ⚠️ | mock pipeline ~340 ms | Met against mock; **never measured against real LLMs** |
| §2.2 Constraints — "must ship hosted, not localhost-only" | ❌ | n/a | **Constraint violated.** API has no host. Vercel previews are half-functional. |
| §2.2 Constraints — 1000 concurrent reps | ❌ | n/a | No load testing infrastructure |
| §2.3 Dependencies — Railway/Fly account | ❌ | n/a | Not provisioned |
| §2.3 Dependencies — Vercel | ✅ | [apps/web/astro.config.mjs](apps/web/astro.config.mjs) | Adapter wired |
| §2.3 Dependencies — Email account | ❌ | env | Resend key missing |
| §2.3 Dependencies — all LLM/OAuth keys | ❌ | env | All placeholders |
| §3.1 Topology (two-tier: Vercel + Fastify on Railway) | ⚠️ | n/a | Topology design matches; **Railway side unprovisioned** so the topology doesn't yet exist in reality |
| §3.2 Stack — Frontend Astro 5 + React + Tailwind + **shadcn/ui** | ⚠️ | [apps/web/package.json](apps/web/package.json) | Astro 5 + React + Tailwind ✅; **shadcn/ui never pulled** — hand-styled Tailwind only |
| §3.2 Stack — Auth "Session via signed **JWT cookies**" | ❌ | [apps/api/src/auth/session.ts](apps/api/src/auth/session.ts) | **Wrong.** We use HMAC-signed session cookies, custom, not JWT. No `jsonwebtoken` dep. |
| §3.2 Stack — Geospatial "Google Maps... **Mapbox as fallback**" | ❌ | [apps/api/src/geospatial/catchment.ts](apps/api/src/geospatial/catchment.ts) | **Wrong.** Fallback is a curated 5-city Texas fixture. Mapbox is referenced in env (`MAPBOX_API_KEY` placeholder) but **not used**. |
| §3.2 Stack — Backend Fastify, BullMQ, Postgres, Redis, SSE | ✅ | [apps/api/package.json](apps/api/package.json) | Matches |
| §3.2 Stack — Hosting (web) Vercel "Static + edge functions" | ⚠️ | [apps/web/astro.config.mjs](apps/web/astro.config.mjs) | We ship SSR (`output: "server"`), not static + edge functions |
| §3.2 Stack — Hosting (API) Railway | ❌ | n/a | Not provisioned |
| §3.2 Stack — Email "Postmark or Resend" | ✅ | [apps/api/src/pulse/email.ts](apps/api/src/pulse/email.ts) | Resend chosen |
| §3.2 Stack — Analytics PostHog (server-side) | ⚠️ | env only | `POSTHOG_API_KEY` placeholder; **no posthog server SDK installed**; no events fired anywhere |
| §3.3 Service modules (9 listed) | ⚠️ | [apps/api/src/](apps/api/src/) | All 9 functional concerns present. **Drift acknowledged by SOW as DRIFT-001** (modules, not Claude Skill packaging). |
| §3.4 Data model `users`, `businesses`, `audits`, `audit_results` | ✅ | [apps/api/src/db/schema.ts](apps/api/src/db/schema.ts) | All present; some extra columns we added (see §C) |
| §3.4 Data model `industry_radius` with `prompt_set_id` pointer | ⚠️ | [apps/api/src/db/schema.ts:53-70](apps/api/src/db/schema.ts#L53-L70) | Built as `industries` table; FK runs the other way (`prompt_sets.industry_id`). Same data, different shape. SOW table name is wrong. |
| §3.4 Data model `pulse_subscriptions` with `active`, `last_sent_at` | ❌ | [apps/api/src/db/schema.ts:125-136](apps/api/src/db/schema.ts#L125-L136) | Columns don't exist. Real shape: `frequency`, `next_run_at`, `last_audit_id`. Functionally richer; SOW shape never built. |
| §3.4 Data model `events` (PostHog mirror) | ❌ | n/a | **Not built.** No internal event log table. |
| §4 M1–M10 milestones | ✅ | PROJECT_STATUS.md §14 | All shipped |
| §4 H1 hardening (BullMQ, SSE, hydration, IPv6) | ✅ | commit `cae7bb5`, `1357ef6` | Done |
| §4 H2 hardening (boot guards, env validation, observability) | ⚠️ | [apps/api/src/env.ts](apps/api/src/env.ts) | zod env validation ✅; **no hard boot guard on dev-login** (runtime route check only — AC-7 fails); observability minimal (pino logs, no APM) |
| §4 M11 real-LLM flip | ❌ | env flag | Gated off; blocked on BRD §14 (Tim) |
| §4 M12 admin dashboard | ⚠️ | [apps/web/src/components/AdminDashboard.tsx](apps/web/src/components/AdminDashboard.tsx) | Leads only in UI; api-health + funnel endpoints unused by UI |
| §5 AC-1 ≤15s P95 vs **real** LLMs | ❌ | n/a | Never measured live |
| §5 AC-2 scoring 4 cases | ✅ | [apps/api/src/scoring/score.test.ts](apps/api/src/scoring/score.test.ts) | 12 unit tests cover the truth table |
| §5 AC-3 generic-name false-positive guard | ✅ | [apps/api/src/parsing/extractMentions.test.ts](apps/api/src/parsing/extractMentions.test.ts) | Covered |
| §5 AC-4 catchment across 20 industries | ⚠️ | seed | 20 industries seeded; **catchment correctness tested against fixture only**, not all 20 |
| §5 AC-5 progress in 3 browsers | ⚠️ | [apps/web/e2e/](apps/web/e2e/) | Wired + chromium-tested; **Safari + Firefox manual QA not done** |
| §5 AC-6 signup → audit → Pulse → first email received | ⚠️ | [apps/api/src/pulse/pulse.integration.test.ts](apps/api/src/pulse/pulse.integration.test.ts) | Mock-mode automated end-to-end; **inbox delivery never verified** |
| §5 AC-7 no dev-login in prod (hard boot guard) | ❌ | [apps/api/src/routes/auth.ts](apps/api/src/routes/auth.ts) | Runtime route gate, not a hard boot guard. Also opens on `VERCEL_ENV === "preview"`. SOW asks for stronger. |
| §5 AC-8 LLM failures graceful | ⚠️ | [apps/api/src/llm/](apps/api/src/llm/) | Adapters return `unavailable` band on error; **no chaos test** |
| §5 AC-9 admin dashboard QA | ⚠️ | see §4 M12 | Partial UI |
| §5 AC-10 PostHog events on 4 actions | ❌ | n/a | **PostHog client SDK never installed** in apps/web. No events fire. |
| §6.1 Skills = service modules | ⚠️ | DRIFT-001 | Self-flagged by SOW |
| §6.2 Tools / external integrations | ⚠️ | env | All env vars present; **most keys are placeholders** |
| §6.3 Audit Scheduler Bot | ✅ | [apps/api/src/pulse/scheduler.ts](apps/api/src/pulse/scheduler.ts) | Matches |
| §6.3 API Health Bot — "continuous probe + alerts on outages" | ❌ | [apps/api/src/llm/health.ts](apps/api/src/llm/health.ts) | **Wrong shape.** `api_health` table is populated **during audit runs** by `createHealthBatch`, not by a continuous probe. No alerting. |
| §6.3 Lead Routing Bot — flags low-scoring as high-priority | ❌ | [apps/api/src/routes/admin.ts](apps/api/src/routes/admin.ts) | `/admin/leads` returns score-ASC. **No flagging, no notification, no bot.** |
| §7 Unit — Vitest 70% on core | ⚠️ | 67 tests | Core modules covered; **coverage % never measured** |
| §7 Integration — Postgres + Redis in CI | ⚠️ | [apps/api/vitest.integration.config.ts](apps/api/vitest.integration.config.ts) | Tests work locally; **no CI pipeline configured** in repo |
| §7 E2E — Playwright | ✅ | [apps/web/e2e/](apps/web/e2e/) | happy-path + gate4-dashboard |
| §7 Load — k6/Artillery | ❌ | n/a | Not built |
| §7 Chaos — kill LLM mid-audit | ❌ | n/a | Not built |
| §7 Manual 3-browser QA | ❌ | chromium only | Not done |
| §8.1 Environments — Preview gated by basic auth/allowlist | ❌ | n/a | Vercel preview is **public** by default. Dev-login on preview is a security artifact. SOW gate not implemented. |
| §8.1 Environments — Staging `staging.geotracker.iozera.ai` | ❌ | n/a | Doesn't exist |
| §8.1 Environments — Production `geotracker.iozera.ai` | ❌ | n/a | Doesn't exist |
| §8.2 Deploy sequence | ❌ | n/a | None executed |
| §9 Risks — token budget, TOS, mock-on-preview, dev-login, rate limits, generic prompts, DRIFT-001 | ⚠️ | n/a | All risks correctly identified; **mitigations only partially in place** (mock-on-preview unmitigated, dev-login gate is soft) |
| §10 All ACs pass | ❌ | see §5 rows | AC-1 / AC-10 fail; AC-4..AC-9 partial |
| §10 Production deploy stable 7 days | ❌ | n/a | Not deployed |
| §10 Real-LLM Tim approval | ❌ | BRD §14 | Pending |
| §10 PROJECT_STATUS.md final entry | 🟡 | maintained per-session | Not yet "final" |
| §10 DRIFT items closed/moved | ⚠️ | DRIFT-001 open | Not formally routed |
| §11 Master prompt accuracy | ✅ | n/a | Reflects what was built |

---

## C. Schema reality check

Actual Postgres schema, dumped from [apps/api/src/db/schema.ts](apps/api/src/db/schema.ts):

```ts
// Enums
user_tier        : free | premium | ultra
oauth_provider   : google | linkedin
audit_status     : queued | running | complete | partial | failed
llm_provider     : chatgpt | perplexity | claude | gemini | grok
score_band       : green | yellow | red | unavailable

// Tables
users(
  id uuid PK, email text UNIQUE, name text, oauth_provider enum,
  oauth_sub text, tier user_tier DEFAULT 'free',
  pulse_opt_in bool DEFAULT true, created_at timestamptz
)

industries(
  id uuid PK, slug text UNIQUE, display_name text,
  default_radius_miles int  -- nullable => national fallback
)

prompt_sets(
  id uuid PK, industry_id uuid FK -> industries, prompts jsonb
)

businesses(
  id uuid PK, user_id uuid FK -> users (nullable, ON DELETE CASCADE),
  domain text, name text, address text, seed_city text,
  lat double, lng double, industry_id uuid FK -> industries,
  created_at timestamptz
  -- partial unique index on (user_id, domain) where user_id IS NOT NULL
)

audits(
  id uuid PK, business_id uuid FK -> businesses,
  status audit_status DEFAULT 'queued', score int DEFAULT 0,
  catchment_cities jsonb DEFAULT '[]',
  started_at timestamptz, completed_at timestamptz
)

audit_results(
  id uuid PK, audit_id uuid FK -> audits, llm llm_provider,
  prompt_text text, city text, response_raw text,
  mentioned bool, rank int, has_contact_info bool,
  caveat_flag bool, score_band score_band DEFAULT 'unavailable',
  input_tokens int, output_tokens int, created_at timestamptz
)

pulse_subscriptions(
  id uuid PK, user_id uuid FK -> users, business_id uuid FK -> businesses,
  frequency text DEFAULT 'monthly', next_run_at timestamptz,
  last_audit_id uuid FK -> audits (nullable), created_at timestamptz
  -- UNIQUE (user_id, business_id)
)

api_health(
  id uuid PK, llm llm_provider UNIQUE,
  status text, last_check_at timestamptz, error_count int
)
```

### Deltas vs SOW §3.4

| SOW expectation | Actual | Delta |
|---|---|---|
| `industry_radius (industry, default_radius_miles, prompt_set_id)` | `industries (slug, display_name, default_radius_miles)` + `prompt_sets.industry_id` FK | **Different table name and FK direction.** Same data. |
| `users` columns: id, email, oauth_provider, oauth_id, tier, created_at | Same plus `name`, `oauth_sub` (not `oauth_id`), `pulse_opt_in` | Extra columns; column rename `oauth_id` → `oauth_sub` |
| `businesses` columns: id, user_id, domain, name, industry, address, lat, lng | Same plus `seed_city`, `industry_id` FK (not `industry` text), `created_at` | `industry` is a uuid FK, not a string |
| `audits` columns: id, business_id, score, status, started_at, finished_at | Same plus `catchment_cities` jsonb; `finished_at` is named `completed_at` | Column rename + extra snapshot column |
| `audit_results` | Matches the SOW description with extra `caveat_flag`, `has_contact_info`, `input_tokens`, `output_tokens` | Extra columns |
| `pulse_subscriptions (user_id, business_id, active, last_sent_at)` | `(user_id, business_id, frequency, next_run_at, last_audit_id)` | **Completely different columns.** SOW shape never existed. |
| `events (id, user_id, event_name, payload, ts)` | **Does not exist** | Missing table |
| `api_health` not in SOW §3.4 | Exists | 🆕 SOW omits |

---

## D. Service module reality check

Actual modules under `apps/api/src/`:

| Module | Path | Purpose |
|---|---|---|
| auth | [apps/api/src/auth/](apps/api/src/auth/) (session.ts, originGuard.ts, decorate.ts, upsertUser.ts) | HMAC session cookies + origin guard + user upsert. **Includes /auth/dev-login.** |
| db | [apps/api/src/db/](apps/api/src/db/) (schema.ts, client.ts, migrate.ts, seed.ts, migrations/) | Drizzle schema + migrations + seed |
| geospatial | [apps/api/src/geospatial/](apps/api/src/geospatial/) (catchment.ts, googleMaps.ts) | Catchment expansion with fixture fallback |
| llm | [apps/api/src/llm/](apps/api/src/llm/) (types.ts, mock.ts, anthropic.ts, gemini.ts, openaiCompatible.ts, health.ts, index.ts) | 5 adapters routed through `index.ts` |
| orchestrator | [apps/api/src/orchestrator/](apps/api/src/orchestrator/) (runAudit.ts, queue.ts, pipeline.test.ts, runAudit.integration.test.ts) | BullMQ fan-out + pipeline |
| parsing | [apps/api/src/parsing/](apps/api/src/parsing/) (extractMentions.ts) | Mention/rank/caveat detection |
| prompts | [apps/api/src/prompts/](apps/api/src/prompts/) (resolver.ts, inferIndustry.ts) | Industry → prompt set resolution |
| pulse | [apps/api/src/pulse/](apps/api/src/pulse/) (scheduler.ts, email.ts, template.ts, unsubscribe.ts) | Pulse cron + Resend email + unsubscribe |
| realtime | [apps/api/src/realtime/](apps/api/src/realtime/) (progress.ts) | Redis pub/sub → SSE bridge |
| routes | [apps/api/src/routes/](apps/api/src/routes/) (audits.ts, auth.ts, me.ts, admin.ts, health.ts, pulse.ts) | HTTP surface |
| scoring | [apps/api/src/scoring/](apps/api/src/scoring/) (score.ts) | BRD §5.2 truth table |
| env.ts | [apps/api/src/env.ts](apps/api/src/env.ts) | zod env validation |
| server.ts | [apps/api/src/server.ts](apps/api/src/server.ts) | Fastify factory |
| index.ts | [apps/api/src/index.ts](apps/api/src/index.ts) | Boots app + worker + pulse scheduler |

### Deltas vs SOW §3.3

| SOW module | Actual | Delta |
|---|---|---|
| audit-orchestrator | `orchestrator/runAudit.ts` + `queue.ts` | Matches |
| llm-adapter (×5) | `llm/{mock,anthropic,gemini,openaiCompatible}.ts` + `index.ts` router | ChatGPT, Perplexity, Grok all served by **shared** `openaiCompatible.ts` (OpenAI-API-shape providers). 4 adapter files cover 5 providers. SOW implies 5 separate files. |
| geospatial-catchment | `geospatial/catchment.ts` + `googleMaps.ts` | Matches |
| prompt-set-resolver | `prompts/resolver.ts` + `inferIndustry.ts` | Matches plus industry inference |
| parsing-validation | `parsing/extractMentions.ts` | Matches |
| scoring-engine | `scoring/score.ts` | Matches |
| pulse-runner | `pulse/{scheduler,email,template,unsubscribe}.ts` | Matches |
| auth-service | `auth/*` + `routes/auth.ts` | Matches; includes dev-login |
| admin-api | `routes/admin.ts` | Matches |
| 🆕 realtime/progress.ts | not in SOW | Redis pub/sub → SSE bridge |
| 🆕 routes/health.ts, routes/me.ts | not in SOW | Health + user endpoints |

---

## E. Milestone reality check

PLAN.md uses 10 milestones; SOW splits them into 12 (M1–M12) plus 2 hardening passes (H1, H2). Mapping below.

| PLAN.md milestone | Closest SOW | PROJECT_STATUS | Mapping cleanliness |
|---|---|---|---|
| 1. Scaffold | M1 | ✅ done | Clean |
| 2. Schema + seed | M2 | ✅ done | Clean |
| 3. Adapter interface + mocks | M5 + M7 (parsing/scoring tests) | ✅ done | SOW splits into 2 milestones |
| 4. Orchestrator | M6 | ✅ done | Clean |
| 5. Frontend audit flow | M8 + M9 | ✅ done | SOW splits into hero/progress/reveal (M8) and vendor/CTA (M9) |
| 6. Auth + user dashboard | M10 (partial) | ✅ done | Clean |
| 7. Pulse Report service | M10 (partial) | ✅ done | SOW lumps auth + Pulse into one milestone (M10) |
| 8. Admin dashboard | M12 | ⚠️ partial | SOW orders M12 after M11; PLAN built it before real-LLM work |
| 9. Real-API adapters (gated) | M11 | ⚠️ wired, gated off | Clean |
| 10. Geospatial (Google Maps) | M4 | ⚠️ live path unverified | **Out of order** — PLAN puts Maps last, SOW puts it at M4. Implementation order followed PLAN. |
| 🆕 (not in PLAN) | M3 dental depth | ✅ done | Was bundled into PLAN #2 + #3 |
| 🆕 (not in PLAN) | H1 hardening | ✅ done | Retroactive in commit `cae7bb5`, `1357ef6`, `764dfb7` |
| 🆕 (not in PLAN) | H2 deploy readiness | ⚠️ partial | Vercel adapter shipped (`645aa017`, `ba01a18`, `7705562`); hard boot guard not yet implemented |

**Recommendation:** The PLAN and SOW disagree on milestone granularity and ordering. PLAN.md groups things by integration concerns; SOW splits them by demoable deliverables. Neither is wrong, but the strategy Claude should know they don't 1-to-1 map. SOW's M3 (prompt-set depth) is an explicit milestone we treated as part of seed data.

---

## F. Deploy reality

- **API host:** **Not chosen, not provisioned.** SOW §3.2 says Railway. PROJECT_STATUS.md leaves it as Allan's call (Railway / Fly.io / Render). Vercel previews exist but every audit submission fails against them because there's no API backend reachable.
- **Frontend host:** Vercel adapter wired ([apps/web/astro.config.mjs](apps/web/astro.config.mjs), `@astrojs/vercel@9.0.5`, SSR output). No production project linked from this repo's git config; preview URL not surfaced in repo. `pnpm build` produces a working `.vercel/output/` bundle.
- **Staging:** Doesn't exist. SOW says `staging.geotracker.iozera.ai`.
- **Production:** Doesn't exist. SOW says `geotracker.iozera.ai`.
- **Local stack:** Postgres 16 + Memurai (Redis-compat) as Windows services. Currently running — API on :4000, web on :4321 (verified via `/health` → `{"ok":true,"llmAdapters":"mock","env":"development"}`).

### Env var matrix (from [apps/api/.env](apps/api/.env))

| Variable | State |
|---|---|
| `DATABASE_URL` | ✅ Set (local Postgres) |
| `REDIS_URL` | ✅ Set (local Memurai) |
| `API_PORT` | ✅ Set (4000) |
| `WEB_ORIGIN` | ✅ Set |
| `SESSION_SECRET` | ✅ Generated 44-char base64 |
| `ADMIN_EMAILS` | ✅ `allan@iozera.ai` |
| `LLM_USE_REAL_ADAPTERS` | ✅ Set to `false` (mock mode) |
| `OPENAI_API_KEY` | ⚠️ Placeholder (`...`) |
| `PERPLEXITY_API_KEY` | ⚠️ Placeholder |
| `ANTHROPIC_API_KEY` | ⚠️ Placeholder |
| `GOOGLE_GEMINI_API_KEY` | ⚠️ Placeholder |
| `XAI_API_KEY` | ⚠️ Placeholder |
| `GOOGLE_MAPS_API_KEY` | ⚠️ Placeholder |
| `MAPBOX_API_KEY` | ⚠️ Placeholder (never used by code) |
| `GOOGLE_OAUTH_CLIENT_ID` | ⚠️ Placeholder |
| `GOOGLE_OAUTH_CLIENT_SECRET` | ⚠️ Placeholder |
| `LINKEDIN_OAUTH_CLIENT_ID` | ⚠️ Placeholder |
| `LINKEDIN_OAUTH_CLIENT_SECRET` | ⚠️ Placeholder |
| `RESEND_API_KEY` | ⚠️ Placeholder |
| `POSTHOG_API_KEY` | ⚠️ Placeholder |
| `POSTHOG_HOST` | ✅ Default `https://us.i.posthog.com` |
| `PULSE_FROM_EMAIL` | ✅ Default |

13 of 22 keys are placeholders. Nothing live-bound.

---

## G. Recommendations to the strategy Claude

### 🔴 SOW must change (factually wrong)

1. **§3.2 row "Auth: Session via signed JWT cookies"** → Change to **"HMAC-signed session cookies (custom)"**. We have no JWT dependency. Functionally equivalent; the SOW description is incorrect.
2. **§3.2 row "Geospatial: Google Maps Geocoding + Places · Mapbox as fallback"** → Change to **"Google Maps Geocoding + Places · curated 5-city fixture as fallback (Mapbox env-stubbed but unused)"**. We never integrated Mapbox.
3. **§3.2 row "Hosting (web): Vercel · Static + edge functions"** → Change to **"Vercel · SSR via `@astrojs/vercel` adapter"**. We don't ship a static site.
4. **§3.2 row "Frontend: Astro 5 + React + Tailwind + shadcn/ui"** → Either pull shadcn (see bucket 2) or correct to **"Astro 5 + React + Tailwind (shadcn primitives not yet adopted)"**.
5. **§3.4 `pulse_subscriptions` columns** → Replace `(active, last_sent_at)` with **`(frequency, next_run_at, last_audit_id)`**. SOW shape never existed.
6. **§3.4 `industry_radius` table** → Rename to **`industries (slug, display_name, default_radius_miles)`** with a separate `prompt_sets` table holding the FK in the other direction.
7. **§3.4 `events` table** → Either remove from the data model or move to a Phase-2 backlog item. It was never built.
8. **§6.3 "API Health Bot — continuous probe + alerts on outages"** → Soften to **"`api_health` table populated during audit runs (passive); no probe, no alerting (Phase-2)"**.
9. **§6.3 "Lead Routing Bot"** → Remove or move to backlog. We have `/admin/leads` sorted by score; we don't have a bot.
10. **§7 Load + Chaos** → Mark as backlog/Phase-2 items; not built in Phase 1.

### 🟡 Code should change to match SOW (worth fixing)

1. **AC-7 hard boot guard on dev-login.** Today the gate is a runtime check inside the route handler. SOW asks for a `throw if NODE_ENV=production` at boot. Trivial to add and is the right call before any external preview.
2. **AC-10 PostHog client SDK.** SOW requires `audit_started`, `audit_completed`, `vendor_clicked`, `consultation_booked` events. Currently zero events fire. ~1h of work.
3. **§8.1 Preview gated by basic auth/allowlist.** Vercel preview is public; combined with `/auth/dev-login` on preview, it's a security artifact. Enable Vercel deployment protection or strip dev-login from preview.
4. **Continuous API Health probe.** If we want to keep the SOW's bot model, schedule a BullMQ repeatable job that pings each LLM endpoint and writes to `api_health`. Without it, the table only updates on user-triggered audits.

### ❓ Open questions (Allan + Tim need to decide)

1. **API host.** SOW says Railway; nothing is provisioned. Same blocker as PROJECT_STATUS.md §5.
2. **DRIFT-001 final disposition.** SOW says modules-instead-of-Claude-Skills is acceptable for Phase 1 pending Tim. Decide before close-out: keep monorepo modules forever, or repackage as Skills in Phase 2 for Kriss.ai integration?
3. **shadcn/ui retrofit.** Worth pulling now, or accept hand-styled Tailwind as Phase-1 reality and update the SOW?
4. **Dev-login lifecycle.** Strip on real-OAuth landing, or keep as a support tool behind a separate flag/token?
5. **Mock-on-preview UX.** Demo banner ("Mock data — request a real audit"), basic-auth gate, or kill the public preview until real LLMs land?
6. **Generic prompts for 13 verticals.** Slow Phase-1 close-out to verticalize, or ship and iterate post-launch? BRD says "stubs for top-5" which is met; SOW §1.1 says "12+ generic verticals at fallback depth" which is also met.
7. **Mapbox.** Drop `MAPBOX_API_KEY` from env + SOW entirely, or actually wire it as the fallback the SOW promises?
