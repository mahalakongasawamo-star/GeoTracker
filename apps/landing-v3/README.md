# @geotracker/landing-v3

Standalone Next.js 14 subproject for the redesigned landing page (Aurum
direction). Lives alongside `apps/web` (Astro) which continues to own
`/dashboard`, `/audit/[id]`, and `/admin`.

## Why a sibling project?

The design contract assumes a Next.js stack (`next/font`, `app/`
layouts, server components for downstream pages). Migrating the entire
Astro app would derail M3. This subproject ships the new landing only;
the existing app keeps serving every other route.

## Running

```
pnpm install
pnpm --filter @geotracker/landing-v3 dev   # http://localhost:4322
```

Form submit POSTs to `${NEXT_PUBLIC_API_ORIGIN}/audits` (default
`http://localhost:4000`) and cross-redirects to
`${NEXT_PUBLIC_WEB_ORIGIN}/audit/[id]` (default `http://localhost:4321`,
the Astro app). For Vercel deploys, set both as env vars on the
landing-v3 project.

## Scope (M3)

- `app/page.tsx` — landing, locked-viewport on desktop
- `components/ui/{Floating,BrandMark,DotGrid,CursorSpotlight}.tsx`
- `components/marketing/{HeroLanding,AuditForm,LiveExampleCard,FloatingLLMLogos}.tsx`
- `lib/api.ts` — `startAudit` wrapper

## Out of scope (M4–M5)

- `/audits/[id]/running` (SSE-driven progress) — M4
- `/audits/[id]` results reveal — M5
- LLM brand-asset swap to official marks — Phase 1.5
