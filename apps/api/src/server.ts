import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { env } from "./env.js";
import { registerUserDecorator } from "./auth/decorate.js";
import { auditRoutes } from "./routes/audits.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { meRoutes } from "./routes/me.js";
import { pulseRoutes } from "./routes/pulse.js";
import { adminRoutes } from "./routes/admin.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport: env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(cookie, { secret: env.SESSION_SECRET });

  registerUserDecorator(app);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(auditRoutes);
  await app.register(meRoutes);
  await app.register(pulseRoutes);
  await app.register(adminRoutes);

  app.setErrorHandler((err, _req, reply) => {
    const status = (err as Error & { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) app.log.error(err);
    void reply.code(status).send({ error: err.message });
  });

  return app;
}
