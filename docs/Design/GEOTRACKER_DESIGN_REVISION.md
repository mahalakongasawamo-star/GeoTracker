# GEOTRACKER_DESIGN_REVISION.md

**Audience:** Claude Code, migrating `apps/web` from its current scaffold to the locked design.
**Status:** Pending Tim Ngo sign-off (do not begin migration until approved).
**Author:** Allan (via design Claude in Iozera HQ chat)
**Last revised:** 24 May 2026

---

## 0 · Scope of this revision

This document covers the **frontend-only migration** of the GeoTracker app:

- `apps/web` → re-skinned to match the locked iteration D Compact + iteration E Results designs.
- `apps/api` → **no changes** in this revision. The API contract that already exists is honored 1:1 by the new frontend.

Out of scope: backend, schema, vendor-comparison content, pricing logic, real LLM integration, PostHog wiring. Those track on their own milestones in the SOW.

---

## 1 · Source mockups (the contract)

All four locked mockups live in `/mnt/user-data/outputs/`:

| File | Route | Purpose |
|---|---|---|
| `GeoTracker_FINAL_01_Landing_Aurum.html` | `/` | Landing — single-screen, no scroll desktop, with parallax + dot grid + LLM logos |
| `GeoTracker_FINAL_02_AuditRunning_Aurum.html` | `/audits/[id]/running` | Audit-running screen, SSE-driven progress |
| `GeoTracker_FINAL_03_Results_Aurum.html` | `/audits/[id]` | Results reveal — orbital radar + analytics + blind spots + compare + pricing |
| `Floating.tsx` | `apps/web/src/components/ui/Floating.tsx` | Parallax primitive |

Per-vertical landing variants (use as A/B test seeds, NOT additional routes — same `/` route, content swapped via vertical detection):

- `GeoTracker_VARIANT_Dental_Houston.html`
- `GeoTracker_VARIANT_Plumbing_Phoenix.html`
- `GeoTracker_VARIANT_VetClinic_Austin.html`

**Rule:** when the mockup and this document conflict, the **mockup wins**. This doc is the index, not the source of truth.

---

## 2 · Design tokens

Add to `apps/web/src/styles/tokens.css` (or extend tailwind.config). All other styles must reference these — no hard-coded colors anywhere in components.

```css
:root {
  /* Surfaces */
  --bg:           #fafaf7;   /* cream page background */
  --bg-2:         #f3f0e8;   /* warmer cream — section backgrounds */
  --bg-3:         #ffffff;   /* card surfaces */
  --line:         #e7e3dc;   /* hairline borders */
  --line-strong:  #d8d2c5;   /* input borders, stronger dividers */

  /* Ink */
  --ink:          #0c0f14;   /* body text, headlines */
  --ink-2:        #5b6370;   /* secondary text */
  --ink-3:        #8a8f9a;   /* tertiary, monospace meta */

  /* Brand coral */
  --coral:        #ff5b3e;   /* primary brand */
  --coral-soft:   #ffe9e3;   /* coral wash for backgrounds */
  --coral-deep:   #d63b1f;   /* hover/pressed states */

  /* Semantic */
  --green:        #138a47;
  --amber:        #b97900;
  --red:          #c8362a;

  /* Dark (radar card + competitor card + featured pricing tier) */
  --dark:         #0a0e15;
  --dark-2:       #131822;
  --dark-3:       #1c2230;
  --dark-line:    #232938;
  --dark-text:    #e8eaef;
  --dark-text-2:  #8b94a8;
  --dark-text-3:  #5d6678;

  /* LLM accents (radar planets, analytics bars) */
  --acid:         #c4f042;   /* ChatGPT — strong */
  --cyan:         #5ed5f0;   /* Gemini, Perplexity — tracking */
  --violet:       #a685ff;   /* Claude — watch */
  --miss:         #ff8474;   /* Grok or any miss state */

  /* Shadows */
  --shadow-sm:    0 1px 2px rgba(12, 15, 20, 0.04);
  --shadow-md:    0 4px 16px -4px rgba(12, 15, 20, 0.08);
  --shadow-lg:    0 1px 2px rgba(12, 15, 20, 0.04),
                  0 24px 48px -12px rgba(12, 15, 20, 0.12);
  --shadow-dark:  0 1px 2px rgba(0, 0, 0, 0.4),
                  0 24px 48px -12px rgba(0, 0, 0, 0.5);
}
```

### Type system

```text
Body sans:        'Geist', system-ui, sans-serif           (weights: 400, 500, 600, 700, 800)
Display serif:    'Instrument Serif', Georgia, serif       (italic 400 — accents only)
Monospace meta:   'Geist Mono', monospace                  (weights: 400, 500, 600)
```

Load via `next/font` or `<link>` in `app/layout.tsx`. Mockups currently use Google Fonts CDN — Next/font is preferred for production (eliminates CLS).

### Type scale

| Use | Class / size | Notes |
|---|---|---|
| Hero headline | `clamp(34px, 4.8vw, 68px)` weight 700, lh 0.98, tracking -0.035em | Italic serif on the highlight word, coral colored |
| Section title | `clamp(32px, 5vw, 56px)` weight 700, lh 1.02, tracking -0.03em | Same italic-coral pattern on accent |
| Card title | `22px` weight 700, tracking -0.01em | Used in gap-card h4, biz-name |
| Body lead | `18px` color ink-2, lh 1.55 | The "what is this" paragraph under the hero |
| Body | `15px–16px` color ink or ink-2 | |
| Mono meta | `Geist Mono` `11px` color ink-2/3, uppercase, tracking 0.08–0.15em | Eyebrows, table headers, trust signals |

### Decorative tokens

- **Eyebrow prefix:** `// SECTION NAME` in Geist Mono, coral or muted depending on context
- **Strikethrough:** coral diagonal bar over a word (`::after` pseudo, see mockup `.strike`)
- **Verdict pill:** coral-soft bg, coral text, 999px radius, mono caps

---

## 3 · Route architecture

The current single-page scroll architecture splits into 3 routes:

```
/                              → Landing (FINAL_01)
/audits/[id]/running           → Audit-running progress (FINAL_02)
/audits/[id]                   → Results reveal (FINAL_03)
```

### Flow

1. User submits domain on `/` → `POST /api/audits` returns `{ id }`
2. Redirect to `/audits/[id]/running` → SSE subscription to `/api/audits/[id]/events`
3. On `event: complete`, redirect to `/audits/[id]`

The existing `apps/api` already supports this flow. The frontend just needs to honor it.

### Server vs. client

| Route | Rendering |
|---|---|
| `/` | Server-rendered shell; client islands for parallax/effects |
| `/audits/[id]/running` | Client component; SSE state |
| `/audits/[id]` | Server component fetches audit, client islands for radar animation |

---

## 4 · Component breakdown

Components live in `apps/web/src/components/`. Reusable primitives in `ui/`, page-level in `app/` or `marketing/`.

### `ui/Floating.tsx`

Already specced as a standalone file (`/mnt/user-data/outputs/Floating.tsx`). Copy verbatim into `components/ui/`.

**Dependencies to install:** `motion` (formerly `framer-motion`). Confirm `cn` exists in `@/lib/utils`. Create `hooks/use-mouse-position-ref.ts` if not present.

**Used by:** the landing page hero only. NOT by the radar viz, analytics row, or any data-dense surface.

### `ui/BrandMark.tsx`

```tsx
// 30×30 px coral square, rotated 45°, with an inner cream cutout.
// On the landing page, this is wrapped in <FloatingElement depth={1} />.
// On other pages it sits flat.
```

### `ui/DotGrid.tsx`

The fixed-position background dot grid with radial fade mask. Render once at the page root; not per-section. SVG-based for performance. See mockup `.bg-art` block.

### `ui/CursorSpotlight.tsx`

The coral radial gradient that follows the cursor. Implements via CSS variables `--mx`/`--my` updated by a `mousemove` listener. Disabled below 900px viewport.

### `marketing/HeroLanding.tsx`

The hero of `/` route. Composes:
- Status eyebrow (`Live in 12 seconds · No signup`)
- Headline with strikethrough/italic accent
- Lead paragraph
- `AuditForm` (input + submit)
- Sample link + trust signal
- `FloatingLLMLogos` (decorative — 5 inline SVGs at varying depths)
- `LiveExampleCard` (the audit preview on the right)

### `marketing/LiveExampleCard.tsx`

A pre-rendered audit result shown on the landing. Props for `biz_name`, `domain`, `category`, `location`, `score`, `queries[]`, `verdict`. Driven by a static fixture for now; in Phase 1.5 fetch from `GET /api/audits/demo`.

For Aurum (current): `Aurum Spa Aesthetics`, `Med Spa`, `Beverly Hills, CA`, score 46, 3 queries.

### `marketing/FloatingLLMLogos.tsx`

5 inline SVGs (ChatGPT, Claude, Gemini, Perplexity, Grok). Each wrapped in `<FloatingElement depth={x}>` with depths 1.4 → 3.0 to create parallax separation. See mockup `.llm-float-1` through `.llm-float-5` for positioning.

⚠️ **Brand assets caveat:** The mockup uses approximations of each company's mark. Before production launch, swap each SVG with the official mark from the respective brand-assets page. Each company has nominative-use guidelines that need review.

### `audit/AuditRunning.tsx`

The `/audits/[id]/running` page. Subscribes to SSE; renders:
- Status pill ("Auditing in progress")
- Domain + ETA headline
- Progress bar (shimmer + width transition)
- Probe stream list (LLM × query rows, status: queued/running/done)
- Fact line

When SSE emits `event: complete`, push to `/audits/[id]`.

### `audit/AuditResultsRadar.tsx`

The orbital radar visualization. Reads audit scores (one per LLM), positions planets around the orbit, animates entrance.

**Data binding:** the mockup hard-codes 5 planets at fixed positions (72° apart, radius 220). In production, position is `data-driven`:

```ts
const POSITIONS_BY_LLM = {
  chatgpt:    { angle: -90, color: 'acid'   },
  gemini:     { angle: -18, color: 'cyan'   },
  perplexity: { angle:  54, color: 'cyan'   },
  claude:     { angle: 126, color: 'violet' },
  grok:       { angle: 198, color: 'miss'   },
};
const RADIUS = 220;
// Inset the planet by score (better score = closer to center)
const insetByScore = (score: number) => RADIUS * (0.6 + (100 - score) / 250);
```

Score state colors map to the legend: ≥75 strong (acid), 50–74 tracking (cyan), 30–49 watch (violet), <30 miss (miss).

### `audit/AnalyticsRow.tsx`

Three cards: "Where you appear by LLM" (share-of-voice bars), "Top queries you're missing" (dollar-value rows), "Competitors out-ranking you" (dark card with deltas). Last card uses `--dark` palette tokens.

### `audit/BlindSpots.tsx`, `audit/CompareTable.tsx`, `audit/PricingTiers.tsx`, `audit/Kicker.tsx`

Straightforward mockup ports. CompareTable's "Upserv" column uses `linear-gradient` highlight + RECOMMENDED tag. PricingTiers' middle (Premium) tier inverts to dark with "MOST POPULAR" badge.

---

## 5 · Motion system

| Surface | Effect | Spec |
|---|---|---|
| Landing hero | Cursor parallax | `Floating` component; sensitivity 2.2, easing 0.05; depths 1–3 |
| Landing hero | Ambient LLM logo drift | CSS keyframes, 18–25s cycles, 2–4px translation |
| Landing hero | Cursor spotlight | 280px radial gradient, coral 10% opacity, mix-blend multiply |
| Landing audit card | Depth tilt | `rotateX/Y` driven by cursor proximity; max 8°, 420px influence radius, easing 0.08 |
| Landing audit card inner layers | TranslateZ stacking | URL bar +20, body +10, score +30, grid +15 |
| Audit-running | Progress shimmer | 50px white gradient sweeping 1.6s |
| Audit-running | Status spinner | Coral ring rotation 0.8s |
| Audit-running | Pulse dot | Coral box-shadow expand, 1.4s |
| Results radar | Entrance choreography | Sequential fade/scale, 0.0s–3.0s total |
| Results bars | Width grow | 1.0s cubic-bezier, 2.4s–2.8s staggered |

**Reduced-motion rule:** all motion respects `@media (prefers-reduced-motion: reduce)`. Crush durations to 0.01ms; counters skip directly to target values.

**Mobile rule:** all cursor-driven effects disabled below 900px viewport (no cursor, just battery drain). Ambient effects can stay or be disabled per-component (currently disabled on mobile to keep bundle light).

---

## 6 · Responsive breakpoints

```text
Desktop      ≥ 1100px    Full layout, parallax active, no-scroll landing
Laptop       901–1099px  Slightly tighter padding, parallax active
Tablet       720–900px   Single column stacks, parallax disabled
Mobile small ≤ 719px     Compact padding, hamburger replaces nav (when nav exists)
```

The landing page is locked-viewport (`overflow: hidden`) on desktop. On mobile and tablet it scrolls naturally. The results page scrolls at all sizes.

**Critical mobile rule:** every grid container must have `min-width: 0` on its children, otherwise content (tables, long URLs) pushes past the viewport. See mockup CSS for safeguards.

---

## 7 · Migration milestones

Suggested execution order. Each milestone is one PR.

### M1 — Foundation (½ day)
- Install fonts via `next/font`
- Add tokens to `tailwind.config.ts` (extend palette, fonts)
- Add `tokens.css` to layout root
- Add `BrandMark`, `DotGrid`, `CursorSpotlight` primitives
- Add `Floating.tsx` + `use-mouse-position-ref` hook + `motion` package

### M2 — Route restructure (½ day)
- Split current single-page route into `/`, `/audits/[id]/running`, `/audits/[id]`
- Wire up form submit → POST → redirect → SSE → redirect
- Keep current components mounted on the new routes temporarily so the app doesn't break during migration

### M3 — Landing page (1 day)
- Replace current hero with `HeroLanding`
- Wire `LiveExampleCard` to a static fixture (Aurum Spa Aesthetics)
- Add `FloatingLLMLogos`
- Verify mobile + desktop renders match mockup at 375 / 768 / 1366 / 1440

### M4 — Audit running page (½ day)
- Implement `AuditRunning` with SSE subscription
- Mock-mode fallback: if no SSE events for 30s, show retry button
- Test cancel button (POST `/api/audits/[id]/cancel` exists in API)

### M5 — Results — radar + chips (1 day)
- Port `AuditResultsRadar` from mockup SVG
- Convert hardcoded planet positions to data-driven (score → radius, fixed angles)
- Wire entrance animations (CSS keyframes)
- Implement metric chips (Mentions, Citations, Query Gaps, Competitors) with real data

### M6 — Results — analytics row (½ day)
- `AnalyticsRow`: share-of-voice bars, top queries with LTV values, competitor delta card (dark)
- LTV values come from the audit response (Phase 1: hardcoded fixture; Phase 1.5: real estimates)

### M7 — Results — blind spots, compare, pricing, kicker (½ day)
- Static section ports from mockup
- Vendor compare table content stays as-is (Upserv vs. Wix vs. GoDaddy/WordPress)
- Pricing tiers wired to `/checkout` placeholder routes

### M8 — Polish + responsive QA (½ day)
- Test all 4 breakpoints on all 3 routes
- Verify reduced-motion mode works end-to-end
- Lighthouse audit (target: LCP < 2.5s, CLS < 0.1)

**Total estimated effort:** 5 working days for one engineer, or 2–3 days for Claude Code in agentic mode.

---

## 8 · What stays out of v1

The mockups include things that are aspirational. Don't build these in v1 unless they're trivial:

- ❌ Live data jitter (the "42" score occasionally flickers — was prototype-only, scrapped)
- ❌ Radar sweep beam (decorative, can defer)
- ❌ Planet pulse rings (defer)
- ❌ Score counter rolling 0→target (defer; static is fine for Phase 1)
- ❌ Replay button on radar (defer)

Add only if the migration finishes ahead of schedule.

---

## 9 · Known constraints + risks

| Risk | Mitigation |
|---|---|
| LLM logos use approximate brand marks | Swap for official assets before public launch; nominative fair use covers internal demos |
| Parallax may cause motion sickness for some users | Already gated by `prefers-reduced-motion`; consider adding a user-preference toggle in Phase 1.5 |
| Aurum is a fictional business | Domain `aurumspa.com` may resolve to a real site by launch — verify or swap to `aurumspaaesthetics.example` |
| Live-example card needs a real fixture | Pre-run an audit for the demo domain, cache the result, serve from `/api/audits/demo` |
| Hard boot guard on `/auth/dev-login` (AC-7) | Still pending from prior SOW; not blocked by this revision |
| PostHog (AC-10) | Wire server-side from API on `audit_completed` event; not part of this migration |

---

## 10 · Sign-off checklist

Before Claude Code begins:

- [ ] Tim Ngo reviewed and approved final mockups (FINAL_01, _02, _03)
- [ ] Tim approved the route restructure (single-page → 3 routes)
- [ ] Tim approved Aurum Spa Aesthetics as the live-example persona (or named a preferred alternative)
- [ ] DRIFT-001 disposition signed off (BRD §12 "skills" vs. implementation "service modules")
- [ ] Confirmed `apps/api` will not be touched in this revision
- [ ] Confirmed Vercel Deployment Protection is enabled (no public preview with mock data)
- [ ] LLM brand-asset swap is tracked as a Phase 1.5 task

---

## 11 · Reference index

| Asset | Path |
|---|---|
| Landing | `/mnt/user-data/outputs/GeoTracker_FINAL_01_Landing_Aurum.html` |
| Audit running | `/mnt/user-data/outputs/GeoTracker_FINAL_02_AuditRunning_Aurum.html` |
| Results | `/mnt/user-data/outputs/GeoTracker_FINAL_03_Results_Aurum.html` |
| Floating component | `/mnt/user-data/outputs/Floating.tsx` |
| Vertical variant — Dental Houston | `/mnt/user-data/outputs/GeoTracker_VARIANT_Dental_Houston.html` |
| Vertical variant — Plumbing Phoenix | `/mnt/user-data/outputs/GeoTracker_VARIANT_Plumbing_Phoenix.html` |
| Vertical variant — Vet Austin | `/mnt/user-data/outputs/GeoTracker_VARIANT_VetClinic_Austin.html` |

For broader project context: `PROJECT_STATUS.md`, `GeoTracker_SOW_v1_1.pdf`, BRD.

---

*End of revision. Questions back to Allan in the Iozera HQ chat before opening migration PRs.*
