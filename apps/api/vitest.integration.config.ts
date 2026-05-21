// Integration config — runs only the *.integration.test.ts files against
// a live Postgres + Redis. See docs/VERIFICATION.md for the runbook.
//
// Why separate from vitest.config.ts: the default `pnpm test` should stay
// fast and hermetic (no Docker required). Integration runs are an opt-in
// pre-merge gate.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    environment: "node",
    setupFiles: ["./vitest.integration.setup.ts"],
    pool: "forks",
    // Integration runs hit a real DB + Redis; serialize to keep the dataset
    // predictable per test file.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@geotracker/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
});
