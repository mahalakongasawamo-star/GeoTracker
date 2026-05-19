import type { FastifyInstance } from "fastify";
import { env } from "../env.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    llmAdapters: env.LLM_USE_REAL_ADAPTERS ? "real" : "mock",
    env: env.NODE_ENV,
  }));
}
