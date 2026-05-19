import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { env } from "./env.js";
import { auditRoutes } from "./routes/audits.js";
import { healthRoutes } from "./routes/health.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(healthRoutes);
  await app.register(auditRoutes);

  return app;
}
