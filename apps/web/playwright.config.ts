// Playwright config for the BRD §6.1 happy-path E2E.
//
// Prereqs (see docs/VERIFICATION.md):
//   1) `pnpm docker:up` from repo root (Postgres + Redis)
//   2) `pnpm --filter @geotracker/api db:migrate && pnpm --filter @geotracker/api db:seed`
//   3) `pnpm --filter @geotracker/web exec playwright install chromium` once
//
// Playwright's webServer block boots both apps so the test runs against a
// freshly-spawned API + Astro pair — same dev shape as a developer running
// `pnpm dev`. We leave LLM_USE_REAL_ADAPTERS unset so the API serves mock
// fixtures (deterministic, no token spend).

import { defineConfig } from "@playwright/test";

const WEB_PORT = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 4321);
const API_PORT = Number(process.env.PLAYWRIGHT_API_PORT ?? 4000);
const WEB_BASE = `http://127.0.0.1:${WEB_PORT}`;
const API_BASE = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Mock adapter is deterministic + fast under NODE_ENV=test; the slowest leg
  // is Astro hydration. 60s gives plenty of headroom for the audit-complete
  // poll loop without papering over a real regression.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB_BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `pnpm --filter @geotracker/api dev`,
      cwd: "../..",
      url: `${API_BASE}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        // Ensure mock adapter (no real LLM calls during E2E).
        LLM_USE_REAL_ADAPTERS: "false",
      },
    },
    {
      command: `pnpm --filter @geotracker/web dev --port ${WEB_PORT}`,
      cwd: "../..",
      url: WEB_BASE,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PUBLIC_API_ORIGIN: API_BASE,
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
