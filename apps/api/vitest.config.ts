import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Integration tests run via vitest.integration.config.ts. Excluding them
    // here keeps the default unit run hermetic — importing queue.ts opens an
    // IORedis socket eagerly, which would otherwise spew ECONNREFUSED while
    // the test is correctly skipped.
    exclude: ["src/**/*.integration.test.ts", "node_modules/**", "dist/**"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    coverage: { reporter: ["text", "html"] },
    pool: "forks",
  },
  resolve: {
    alias: {
      "@geotracker/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
});
