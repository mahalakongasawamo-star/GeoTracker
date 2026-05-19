import type { FastifyInstance, FastifyRequest } from "fastify";
import { asc, desc, eq, sql } from "drizzle-orm";
import { env } from "../env.js";
import { db } from "../db/client.js";
import {
  audits,
  auditResults,
  apiHealth,
  businesses,
  industries,
  users,
} from "../db/schema.js";
import { requireUser } from "../auth/decorate.js";
import { runPulseTickNow } from "../pulse/scheduler.js";

function requireAdmin(req: FastifyRequest) {
  const user = requireUser(req);
  if (!env.ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    const err = new Error("forbidden");
    (err as Error & { statusCode?: number }).statusCode = 403;
    throw err;
  }
  return user;
}

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/leads", async (req, reply) => {
    requireAdmin(req);
    // BRD §12.3 Lead Routing Bot: flag low-score audits as high-priority.
    // Sort by score ASC, then most recent.
    const rows = await db
      .select({
        auditId: audits.id,
        score: audits.score,
        status: audits.status,
        completedAt: audits.completedAt,
        domain: businesses.domain,
        businessName: businesses.name,
        userEmail: users.email,
        industrySlug: industries.slug,
      })
      .from(audits)
      .innerJoin(businesses, eq(audits.businessId, businesses.id))
      .leftJoin(users, eq(businesses.userId, users.id))
      .leftJoin(industries, eq(businesses.industryId, industries.id))
      .where(sql`${audits.status} in ('complete','partial')`)
      .orderBy(asc(audits.score), desc(audits.completedAt))
      .limit(50);
    return reply.send({ leads: rows });
  });

  app.get("/admin/api-health", async (req, reply) => {
    requireAdmin(req);
    const rows = await db.select().from(apiHealth).orderBy(asc(apiHealth.llm));
    return reply.send({ health: rows });
  });

  app.get("/admin/funnel", async (req, reply) => {
    requireAdmin(req);
    const stats = await db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${audits.status} in ('complete','partial'))::int`,
        avgScore: sql<number>`coalesce(avg(${audits.score}) filter (where ${audits.status} in ('complete','partial')), 0)::int`,
        lowScore: sql<number>`count(*) filter (where ${audits.score} < 40 and ${audits.status} in ('complete','partial'))::int`,
      })
      .from(audits);
    const totalCells = await db.select({ n: sql<number>`count(*)::int` }).from(auditResults);
    return reply.send({
      ...(stats[0] ?? { total: 0, completed: 0, avgScore: 0, lowScore: 0 }),
      totalCells: totalCells[0]?.n ?? 0,
    });
  });

  app.post("/admin/pulse/run", async (req, reply) => {
    requireAdmin(req);
    await runPulseTickNow();
    return reply.send({ ok: true });
  });
}
