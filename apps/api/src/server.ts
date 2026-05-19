import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./env.js";
import { registerUserDecorator } from "./auth/decorate.js";
import { originGuard } from "./auth/originGuard.js";
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
    // BRD §7.3 — input is small (domain + name + city). 16 KB is generous;
    // anything larger is almost certainly abuse.
    bodyLimit: 16 * 1024,
    disableRequestLogging: env.NODE_ENV === "test",
  });

  // Helmet sets a reasonable set of security headers. CSP is left off
  // because we serve the API from a separate origin and the web app sets
  // its own CSP; turning Helmet's defaults on would block the OAuth
  // redirect dance.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await app.register(cookie, { secret: env.SESSION_SECRET });
  await app.register(rateLimit, {
    // Global ceiling; per-route overrides for /audits (POST) tighten this.
    global: false,
    max: 240,
    timeWindow: "1 minute",
    keyGenerator: (req) => (req.headers["x-forwarded-for"] as string) || req.ip,
  });

  registerUserDecorator(app);
  app.addHook("preHandler", originGuard);

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
