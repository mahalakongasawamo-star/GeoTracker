import type { FastifyInstance } from "fastify";
import IORedis from "ioredis";
import { sql } from "drizzle-orm";
import { env } from "../env.js";
import { db } from "../db/client.js";

let healthRedis: IORedis | null = null;
function probeRedis(): Promise<boolean> {
  if (!healthRedis) {
    healthRedis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 1500,
    });
  }
  return healthRedis
    .ping()
    .then(() => true)
    .catch(() => false);
}

async function probeDb(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export async function healthRoutes(app: FastifyInstance) {
  // Liveness — server is up.
  app.get("/health", async () => ({
    ok: true,
    llmAdapters: env.LLM_USE_REAL_ADAPTERS ? "real" : "mock",
    env: env.NODE_ENV,
  }));

  // Readiness — dependencies reachable.
  app.get("/health/ready", async (_req, reply) => {
    const [dbOk, redisOk] = await Promise.all([probeDb(), probeRedis()]);
    const ok = dbOk && redisOk;
    return reply.code(ok ? 200 : 503).send({ ok, db: dbOk, redis: redisOk });
  });
}
