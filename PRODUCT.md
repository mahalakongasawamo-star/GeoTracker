# Product

## Register

brand

## Users

Small-business owners in physical-service categories (dental, plumbing, veterinary, and similar local service verticals) landing on `/` from a paid ad, organic search, or word-of-mouth referral. They are skeptical, time-pressed, and scanning for ~5 to 10 seconds before deciding whether to enter their domain. They are not researching tools; they want to know in one breath whether AI search engines mention their business when a customer asks, and what to do if the answer is no.

Secondary readers: marketing managers and agency consultants who arrive after the SMB owners and look for proof, methodology, and depth. The page must reward them on a second pass without slowing the first.

## Product Purpose

GeoTracker runs a free, real-time audit that probes five major LLMs (ChatGPT, Claude, Gemini, Perplexity, xAI) across catchment cities and prompt variants, then surfaces where the business is named, ranked, or missing. The landing page exists to convert a cold visitor into a started audit in under 12 seconds. Success is measured by audit-start rate from `/`, not by time-on-page or scroll depth.

## Brand Personality

Confident, editorial, alive.

Voice is the calm authority of a magazine essayist who happens to be holding diagnostic instruments. Italic-serif accents on cream do the editorial lift; the `Floating` parallax primitive and the live audit-card preview do the "alive". Coral is the single loud move; everything else is restrained.

This is not a cheerful brand. The opening question, *"Is your business invisible to AI?"*, is supposed to land as a quiet alarm rather than a marketing pitch. Confidence comes from showing the audit running, not from adjectives.

## Anti-references

The page must not look or feel like any of these:

- **Generic SaaS-cream marketing pages** (the Linear and Stripe clone aesthetic): soft gradients, hero-metric templates, identical icon-plus-heading feature-card grids, "Trusted by" logo strips as the proof layer.
- **MarTech dashboard demos**: decorative charts with invented numbers, "AI-powered" or "GPT-4 inside" badges scattered across the page, screenshots of fake dashboards as the centerpiece.
- **Y2K or brutalist novelty pages**: ironic clashy color, oversized rotated type, deliberate ugly-on-purpose. Coral on cream is the only loud move; the rest of the surface stays composed.
- **Glassy AI-startup aesthetic**: blurred orbs, glow gradients, frosted-glass cards, magenta-to-cyan rim lighting. Glassmorphism is banned outright.

## Design Principles

1. **Show, do not tell.** The live audit-card preview, the `Floating` parallax, the eyebrow status pulse — these prove the product is real before the headline finishes reading. Adjectives ("powerful", "intelligent", "real-time") are forbidden as the proof.
2. **One loud move per surface.** Coral is the loud move. Italic serif is the loud move. The Floating depth is the loud move. Pick one per region, hold the rest at restraint.
3. **The skeptical scanner wins.** Every element must justify itself in a 5-second first pass. Anything that only rewards a careful second read must not crowd the first.
4. **Motion is voice, not decoration.** The Aurum direction commits to orchestrated motion as part of identity. Stationary mockups should look incomplete. Reduced-motion users get a static, fully-legible page; that is the fallback, not the default.
5. **Restraint is the table; coral is the dish.** Cream, ink, hairline borders, mono meta carry the surface. Coral, italic serif, and the live elements break the surface where it matters.

## Accessibility & Inclusion

Target WCAG 2.2 AA across the page. Body text contrast at least 4.5 against its surface; large display type at least 3.0. Coral on cream and coral on dark-2 are both verified above contrast floors at body and display sizes.

Motion is brand-critical, so the page ships motion-first. `prefers-reduced-motion: reduce` collapses the Floating parallax, the cursor spotlight, idle rotation, and any staggered entrances to instant or 0.01ms transitions; the resulting static page must still convey the full message and remain fully functional. Reduced-motion is a no-op fallback, not a separate design.

No reliance on color alone to convey state (verdict pills carry text labels, radar items carry icons, missed-state has a distinct shape, not just `--miss` hue).
