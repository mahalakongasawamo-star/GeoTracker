import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
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
