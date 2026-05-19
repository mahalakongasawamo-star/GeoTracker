import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: { reporter: ["text", "html"] },
  },
  resolve: {
    alias: {
      "@geotracker/shared": new URL("../../packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
});
