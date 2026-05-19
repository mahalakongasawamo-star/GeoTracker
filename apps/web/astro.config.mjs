import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [react(), tailwind({ applyBaseStyles: false })],
  server: { port: 4321 },
  vite: {
    define: {
      "import.meta.env.PUBLIC_API_ORIGIN": JSON.stringify(
        process.env.PUBLIC_API_ORIGIN ?? "http://localhost:4000",
      ),
    },
  },
});
