// E2E happy path per docs/PLAN.md §Verification:
//   Hero → progress bar → reveal dashboard (gauge + grid + blind spots)
//   → vendor matrix → CTA.
//
// PostHog conversion-tracking assertion is currently a no-op: the BRD
// flags PostHog as a Phase-1 dependency but the web app has not wired
// the client SDK yet (only POSTHOG_API_KEY in env.ts on the API side).
// VERIFICATION.md tracks that as an open item.

import { expect, test } from "@playwright/test";

test.describe("audit happy path", () => {
  test("paste domain → progress → reveal → vendor matrix → CTA", async ({ page }) => {
    // ── Hero ──────────────────────────────────────────────────────────
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Do AI engines actually recommend your business\?/i }),
    ).toBeVisible();

    // Fixture domain + name keep the mock adapter deterministic across runs.
    // City defaults to Austin → matches the catchment fixture in the API.
    await page.getByLabel("Business domain").fill("brightsmiles.com");
    await page.getByLabel("Business name (optional)").fill("Bright Smiles Dental");
    await page.getByLabel("Industry").selectOption("dentists");

    await page.getByRole("button", { name: /Check My Visibility Score/i }).click();

    // ── Progress ──────────────────────────────────────────────────────
    await expect(page).toHaveURL(/\/audit\/[0-9a-f-]{36}/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /Asking 5 AI engines about your business/i }),
    ).toBeVisible();

    // Progress bar exposes ratio via aria-label.
    await expect(page.getByLabel(/Audit progress:/)).toBeVisible();

    // Each of the 5 providers should show up in the status list.
    for (const provider of ["ChatGPT", "Perplexity", "Claude", "Gemini", "Grok"]) {
      await expect(page.getByText(provider, { exact: true })).toBeVisible();
    }

    // ── Reveal ────────────────────────────────────────────────────────
    // Mock adapter under NODE_ENV != "test" still has 150-950ms of fake
    // latency per cell; AuditRunner polls /audits/:id every 2s as a
    // fallback. 45s is conservative but doesn't paper over a real hang.
    await expect(page.getByText(/Audit complete/i)).toBeVisible({ timeout: 45_000 });
    await expect(
      page.getByRole("heading", { name: "Bright Smiles Dental" }),
    ).toBeVisible();

    // Score gauge — ScoreGauge renders the integer score in the markup.
    // We don't pin a specific value because the mock distribution may
    // shift; we just confirm a 0..100 integer is shown.
    const scoreText = await page.locator("text=/^[0-9]{1,3}$/").first().textContent();
    const score = Number(scoreText);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);

    // ── LLM × prompt grid ─────────────────────────────────────────────
    await expect(
      page.getByRole("heading", { name: /Per-prompt × LLM coverage/i }),
    ).toBeVisible();

    // ── AI Blind Spots ────────────────────────────────────────────────
    await expect(
      page.getByRole("heading", { name: /AI Blind Spots/i }),
    ).toBeVisible();

    // ── Vendor matrix ─────────────────────────────────────────────────
    await expect(
      page.getByRole("heading", { name: /Who can fix this\?/i }),
    ).toBeVisible();
    // Upserv must be the highlighted column.
    await expect(page.getByRole("columnheader", { name: /Upserv/i })).toBeVisible();

    // ── CTA ───────────────────────────────────────────────────────────
    const cta = page.getByRole("link", { name: /Book a free consultation/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "#book");
  });
});
