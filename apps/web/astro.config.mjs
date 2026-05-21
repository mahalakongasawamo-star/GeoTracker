import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";

// The /audit/[id].astro page sets `export const prerender = false` so it
// needs a server-rendering adapter at build time. `output: "server"`
// makes every route server-rendered by default; individual static pages
// (index, dashboard, etc.) can still set `export const prerender = true`
// to opt into static generation.
export default defineConfig({
  integrations: [react(), tailwind({ applyBaseStyles: false })],
  output: "server",
  adapter: vercel(),
  server: { port: 4321 },
  vite: {
    define: {
      "import.meta.env.PUBLIC_API_ORIGIN": JSON.stringify(
        process.env.PUBLIC_API_ORIGIN ?? "http://localhost:4000",
      ),
    },
  },
});
