# GeoTracker — Phase 1 Implementation Plan

## Context

GeoTracker is a greenfield AI visibility audit web app (per BRD v1.0, May 18 2026, Allan/Iozera). The repo `mahalakongasawamo-star/GeoTracker` is empty; we are building from scratch on branch `claude/plan-geotracker-app-uLIsn`.

**Goal:** Ship the full BRD §5 Phase-1 functionality — a user pastes a domain, the system runs parallel buying-intent prompts across 5 LLMs over a geo-expanded catchment area, scores responses Green/Yellow/Red, and renders a reveal dashboard that funnels leads to Upserv consultations. Auth, monthly Pulse Reports, admin dashboard, and the freemium tiering are all in scope.

**Primary outcome:** A working lead-gen engine for Upserv that a sales rep can run in under 15s on a prospect's domain and share. LLM APIs are stubbed behind a real adapter interface for v1 so we can ship UX/flow without burning token budget until the BRD §14 cost model is finalized.

## Stack (per BRD §7.4)

- **Frontend:** Astro 5 + React + Tailwind (hand-styled; shadcn/ui not adopted), deployed to Vercel via `@astrojs/vercel` SSR adapter.
- **Backend:** Node.js + Fastify (async-first orchestrator).
- **Queue:** Redis + BullMQ for LLM job orchestration.
- **DB:** Postgres (users, audits, lookup tables); Redis for caching recent audits.
- **Geospatial:** Google Maps Geocoding + Places API with curated 5-city Texas fixture as offline fallback (Mapbox never integrated; see SOW v1.1).
- **Auth:** OAuth via Google + LinkedIn with HMAC-signed session cookies (custom; not Auth.js / Lucia / JWT).
- **Email:** Resend (Postmark adapter ready) for Pulse Reports.
- **Analytics:** PostHog for conversion tracking.
- **Monorepo:** pnpm workspaces.

## Repo Layout

```
GeoTracker/
├── apps/
│   ├── web/                    # Astro frontend (Vercel)
│   │   └── src/
│   │       ├── pages/          # /, /audit/[id], /dashboard, /admin
│   │       ├── components/     # Hero, ProgressBar, ScoreGauge, LLMGrid, VendorTable, BlindSpots
│   │       └── lib/api.ts      # client to backend
│   └── api/                    # Fastify backend
│       └── src/
│           ├── routes/         # /audits, /auth, /pulse, /admin
│           ├── orchestrator/   # parallel LLM dispatch
│           ├── llm/            # adapters: chatgpt, perplexity, claude, gemini, grok (+ mock)
│           ├── parsing/        # mention detection, ranking, caveat flags
│           ├── scoring/        # Green/Yellow/Red logic
│           ├── geospatial/     # catchment expansion via Google Maps
│           ├── prompts/        # industry prompt-set resolver
│           ├── pulse/          # monthly re-audit scheduler
│           ├── auth/           # OAuth handlers
│           └── db/             # Drizzle ORM + migrations
├── packages/
│   ├── shared/                 # types, scoring enums, BRD lookup tables as code
│   └── ui/                     # shadcn primitives reused across web + admin
├── infra/
│   ├── docker-compose.yml      # local Postgres + Redis
│   └── seed/                   # industry radius table, prompt sets, vendor matrix
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

## Database Schema (Drizzle, Postgres)

- **users** — `id, email, name, oauth_provider, oauth_sub, tier (free|premium|ultra), pulse_opt_in, created_at`
- **businesses** — `id, user_id, domain, name, address, lat, lng, industry_id`
- **industries** — `id, slug, display_name, default_radius_miles, prompt_set_id` (seeded from BRD §5.4 + §5.5)
- **prompt_sets** — `id, industry_id, prompts (jsonb array of templates with {city} token)`
- **audits** — `id, business_id, status (queued|running|complete|partial|failed), score (0-100), started_at, completed_at, catchment_cities (jsonb)`
- **audit_results** — `id, audit_id, llm (enum), prompt_text, city, response_raw, mentioned (bool), rank, has_contact_info (bool), caveat_flag (bool), score_band (green|yellow|red|unavailable)`
- **pulse_subscriptions** — `id, user_id, business_id, frequency (monthly), next_run_at, last_audit_id`
- **vendor_matrix** — seed-only, served from `packages/shared` (BRD §6.2)
- **api_health** — `id, llm, status, last_check_at, error_count` (for API Health Bot)

## Core Modules

### Frontend (apps/web)

| Page / Section | File | Maps to BRD |
|---|---|---|
| Hero + domain input | `src/pages/index.astro` | §6.1 #1 |
| Audit-in-progress with per-LLM live progress | `src/pages/audit/[id].astro` (SSE/WebSocket) | §6.1 #2 |
| Reveal: score gauge + LLM×prompt grid | `src/components/RevealDashboard.tsx` | §6.1 #3 |
| AI Blind Spots gap analysis | `src/components/BlindSpots.tsx` | §6.1 #4 |
| Vendor comparison table (Upserv highlighted) | `src/components/VendorMatrix.tsx` | §6.1 #5, §6.2 |
| Solution pitch + CTA footer | `src/components/SolutionPitch.tsx` | §6.1 #6–7 |
| User dashboard (past audits, Pulse mgmt) | `src/pages/dashboard.astro` | §6.1 #8 |
| Admin dashboard (leads, API monitor, conversions) | `src/pages/admin/index.astro` | §6.1 #9 |

### Backend (apps/api)

| Module | Responsibility | BRD ref |
|---|---|---|
| `orchestrator/runAudit.ts` | BullMQ job: enqueue per-LLM × per-city fan-out, aggregate, emit progress via Redis pub/sub | §7.1, §7.2 |
| `llm/{chatgpt,perplexity,claude,gemini,grok}.ts` | Adapters implementing common `LLMAdapter` interface; **mock adapter `llm/mock.ts` returns deterministic fixtures keyed by domain — wired by default in v1** | §5.3 |
| `parsing/extractMentions.ts` | Detect business name + domain match, rank position, caveats, contact-info presence (phone/site/booking) | §5.2, §7.3 |
| `scoring/score.ts` | Apply tiered Green / Yellow (top-3 but no contact → downgrade) / Red / Unavailable; aggregate to 0-100 gauge | §5.2 |
| `geospatial/catchment.ts` | Google Maps Geocoding + Places → return de-duplicated cities/zips within industry radius | §7.1, §7.3 |
| `prompts/resolver.ts` | Given `industry_id`, return prompts with `{city}` iterated over catchment | §5.5 |
| `pulse/scheduler.ts` | Cron (BullMQ repeatable) to re-run audits monthly and email via Resend | §5.6, §12.3 |
| `auth/oauth.ts` | Google + LinkedIn OAuth, session via httpOnly cookie | §5.6 |
| `routes/audits.ts` | `POST /audits` (enqueue), `GET /audits/:id` (poll), `GET /audits/:id/stream` (SSE) | — |
| `routes/admin.ts` | Lead list sorted by low score + recency, API health, conversion funnel | §6.1 #9, §12.3 |

### Cross-cutting

- **Edge cases** (BRD §7.3): generic business names → require domain+location cross-ref before Green; mentioned-without-contact → force Yellow; per-API throttling via BullMQ rate limiter; catchment de-dup before fan-out; unknown industry → fallback national radius + generic prompt set.
- **Secrets** in environment / Vercel + Fly.io secret stores, never client-side (BRD §8).
- **GDPR**: one-click unsubscribe link on every Pulse email, `DELETE /me` cascades.

## Seed Data (infra/seed)

- `industries.csv` — full BRD §5.4 lookup table (20 verticals).
- `prompts.dental.json` — BRD §5.5 set; stubs for top-5 verticals (HVAC, law, real estate, vet, accountant) so the lookup is exercised end-to-end.
- `vendor_matrix.json` — BRD §6.2 verbatim.
- `mock_llm_fixtures/` — per-domain deterministic responses covering Green/Yellow/Red/Unavailable cases so the UI can be demoed without API keys.

## Build Milestones (incremental commits to `claude/plan-geotracker-app-uLIsn`)

1. **Scaffold:** pnpm workspace, Astro + Fastify skeletons, Tailwind/shadcn, docker-compose for Postgres+Redis, `.env.example`, CI lint+typecheck.
2. **Schema + seed:** Drizzle migrations, seed scripts for industries / prompts / vendor matrix.
3. **Adapter interface + mocks:** `LLMAdapter` contract, mock implementations, parsing + scoring unit tests (BRD §5.2 truth table).
4. **Orchestrator:** BullMQ wiring, fan-out per LLM × city, aggregation, Redis pub/sub for progress, SSE endpoint.
5. **Frontend audit flow:** Hero → progress bar → reveal dashboard (gauge, grid, blind spots) → vendor matrix → CTA.
6. **Auth + user dashboard:** Google/LinkedIn OAuth, audit history, Pulse opt-in toggle.
7. **Pulse Report service:** repeatable job, Resend templates, unsubscribe flow.
8. **Admin dashboard:** lead routing (low-score-first), API health bot view, conversion funnel.
9. **Real-API adapters (gated by env flag):** ChatGPT, Perplexity, Claude, Gemini, Grok behind a feature flag — wired but off until keys + budget approved.
10. **Geospatial:** swap stubbed catchment for Google Maps Places + Geocoding; cache lookups in Redis.

## Critical Files (to be created)

- `apps/api/src/orchestrator/runAudit.ts` — central audit pipeline
- `apps/api/src/llm/types.ts` — `LLMAdapter` interface (response shape, error contract)
- `apps/api/src/llm/mock.ts` — default v1 adapter
- `apps/api/src/parsing/extractMentions.ts` — owns BRD §5.2 detection rules
- `apps/api/src/scoring/score.ts` — owns BRD §5.2 truth table; covered by unit tests
- `apps/api/src/geospatial/catchment.ts` — radius lookup + Maps integration
- `apps/api/src/db/schema.ts` — Drizzle schema (single source of truth for migrations)
- `apps/web/src/pages/index.astro` — Hero + domain input
- `apps/web/src/pages/audit/[id].astro` — progress + reveal
- `apps/web/src/components/RevealDashboard.tsx` — gauge + LLM×prompt grid
- `packages/shared/src/industries.ts` — BRD §5.4 radius lookup as typed constants
- `packages/shared/src/vendorMatrix.ts` — BRD §6.2 vendor comparison
- `infra/docker-compose.yml` — local Postgres + Redis
- `.env.example` — every secret with a placeholder

## Verification

- **Unit:** Vitest suites covering BRD §5.2 scoring truth table (top-3, outside-top-3, no-contact downgrade, not-mentioned, API unavailable) and parsing edge cases (generic business name, caveats).
- **Integration:** Spin up docker-compose, run an audit via `POST /audits` with the mock adapter; assert SSE stream emits one progress event per (LLM, city) tuple and final result matches expected fixture.
- **E2E (Playwright):** Paste `example-dental.com` in Hero → progress bar fills → reveal dashboard renders gauge + grid → vendor table visible → CTA click captured by PostHog.
- **Manual:** Run `pnpm dev` from repo root, hit `http://localhost:4321`, walk the full flow end-to-end including OAuth (Google sandbox) and Pulse opt-in. Confirm an audit completes in <15s with the mock adapter.
- **Pulse cron:** trigger the repeatable job manually via an admin route; confirm Resend test email lands and unsubscribe link works.

## Out of Scope (Phase 2, BRD §11)

Competitive Conquest mode, Predictive Visibility, white-label/agency portal, public API, additional LLM providers beyond the Phase-1 five.

## Open Items Tracked (BRD §14)

Token-budget model, LLM TOS review for programmatic querying, partner-tier API access strategy, Premium price A/B ($30 vs $49) — flagged for product before flipping the real-API feature flag.
