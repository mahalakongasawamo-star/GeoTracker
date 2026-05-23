// Gate 4 — manual smoke items, automated where possible.
//
// Covers the checklist items in docs/VERIFICATION.md §Gate 4 that don't
// require visual judgement: dev-login → dashboard → pulse opt-in →
// subscribe; ADMIN_EMAILS gating for /admin.
//
// Uses /auth/dev-login since real OAuth credentials aren't provisioned
// (see PROJECT_STATUS.md §3). The admin spec relies on
// ADMIN_EMAILS=allan@iozera.ai matching apps/api/.env.

import { expect, test } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_API_BASE ?? "http://localhost:4000";
const ADMIN_EMAIL = "allan@iozera.ai";

test.describe("Gate 4 — dashboard flow via dev-login", () => {
  test("logged-out dashboard prompts sign-in; logged-in dashboard shows audit, pulse opt-in, subscribe", async ({
    page,
  }) => {
    // Unique email per run keeps the user/business rows separable across reruns.
    const email = `gate4-user-${Date.now()}@geotracker.test`;

    // ── Logged out ─────────────────────────────────────────────────────
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Sign in to see your dashboard/i }),
    ).toBeVisible();

    // ── Dev-login (API sets cookie, redirects to /dashboard) ───────────
    await page.goto(
      `${API_BASE}/auth/dev-login?email=${encodeURIComponent(email)}&name=Gate%204%20Test`,
    );
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Your dashboard/i })).toBeVisible();
    // Empty-state copy until we run an audit.
    await expect(page.getByText(/No audits yet/i)).toBeVisible();

    // ── Run an audit while logged in so the business attaches to user ──
    await page.goto("/");
    // Hero form has no name= attrs; wait for hydration before fill+submit.
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Business domain").fill("gate4-test.example");
    await page.getByLabel("Business name (optional)").fill("Gate 4 Co");
    await page.getByLabel("Industry").selectOption("dentists");
    await page.getByRole("button", { name: /Check My Visibility Score/i }).click();
    await expect(page).toHaveURL(/\/audit\/[0-9a-f-]{36}/, { timeout: 15_000 });
    await expect(page.getByText(/Audit complete/i)).toBeVisible({ timeout: 45_000 });

    // ── Dashboard now lists the audit ──────────────────────────────────
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Past audits/i })).toBeVisible();
    await expect(page.getByText("gate4-test.example")).toBeVisible();

    // ── Toggle Pulse opt-in → PATCH /me/pulse returns 200 ──────────────
    const patchPulse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/me/pulse") &&
        r.request().method() === "PATCH" &&
        r.status() === 200,
    );
    await page.getByLabel(/Monthly Pulse Report email/i).click();
    await patchPulse;

    // ── Subscribe to Pulse → POST /me/pulse/subscriptions returns 200 ──
    const postSub = page.waitForResponse(
      (r) =>
        r.url().endsWith("/me/pulse/subscriptions") &&
        r.request().method() === "POST" &&
        r.status() === 200,
    );
    await page.getByRole("button", { name: /Subscribe to Pulse/i }).first().click();
    await postSub;

    // Subscriptions section now shows the row.
    // UserDashboard renders `name ?? domain` for the subscription label, so
    // assert against the business name we set above.
    await expect(page.getByRole("heading", { name: /Pulse subscriptions/i })).toBeVisible();
    const subSection = page
      .getByRole("heading", { name: /Pulse subscriptions/i })
      .locator("xpath=ancestor::section[1]");
    await expect(subSection.getByText("Gate 4 Co")).toBeVisible();
    await expect(subSection.getByText(/Next run:/i)).toBeVisible();
  });
});

test.describe("Gate 4 — admin allowlist", () => {
  test("non-admin sees allowlist error; ADMIN_EMAILS user sees the lead list", async ({
    page,
    browser,
  }) => {
    // ── Non-admin dev-login → /admin shows allowlist error ─────────────
    const nonAdminEmail = `gate4-nonadmin-${Date.now()}@geotracker.test`;
    await page.goto(
      `${API_BASE}/auth/dev-login?email=${encodeURIComponent(nonAdminEmail)}`,
    );
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/admin");
    await expect(page.getByText(/admin allowlist/i)).toBeVisible();

    // ── Admin dev-login in a fresh context → /admin renders ────────────
    // New context = clean cookie jar; otherwise the non-admin session above
    // would shadow the admin login.
    const adminContext = await browser.newContext();
    try {
      const adminPage = await adminContext.newPage();
      await adminPage.goto(
        `${API_BASE}/auth/dev-login?email=${encodeURIComponent(ADMIN_EMAIL)}`,
      );
      await expect(adminPage).toHaveURL(/\/dashboard$/);
      await adminPage.goto("/admin");
      await expect(
        adminPage.getByRole("heading", { name: /Admin command center/i }),
      ).toBeVisible();
      await expect(
        adminPage.getByRole("heading", { name: /High-priority leads/i }),
      ).toBeVisible();
    } finally {
      await adminContext.close();
    }
  });
});
