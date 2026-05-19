import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { audits, businesses, industries, pulseSubscriptions, users } from "../db/schema.js";
import { requireUser } from "../auth/decorate.js";
import { auditQueue } from "../orchestrator/queue.js";

export async function meRoutes(app: FastifyInstance) {
  app.get("/me/audits", async (req, reply) => {
    const user = requireUser(req);
    const rows = await db
      .select({
        id: audits.id,
        status: audits.status,
        score: audits.score,
        startedAt: audits.startedAt,
        completedAt: audits.completedAt,
        domain: businesses.domain,
        name: businesses.name,
        industrySlug: industries.slug,
      })
      .from(audits)
      .innerJoin(businesses, eq(audits.businessId, businesses.id))
      .leftJoin(industries, eq(businesses.industryId, industries.id))
      .where(eq(businesses.userId, user.id))
      .orderBy(desc(audits.startedAt))
      .limit(50);
    return reply.send({ audits: rows });
  });

  app.patch("/me/pulse", async (req, reply) => {
    const user = requireUser(req);
    const body = z.object({ optIn: z.boolean() }).parse(req.body);
    await db.update(users).set({ pulseOptIn: body.optIn }).where(eq(users.id, user.id));
    return reply.send({ ok: true, optIn: body.optIn });
  });

  // Subscribe a specific audit's business to a monthly Pulse Report.
  app.post("/me/pulse/subscriptions", async (req, reply) => {
    const user = requireUser(req);
    const body = z.object({ auditId: z.string().uuid() }).parse(req.body);

    const auditRow = await db
      .select({ businessId: audits.businessId, userId: businesses.userId })
      .from(audits)
      .innerJoin(businesses, eq(audits.businessId, businesses.id))
      .where(eq(audits.id, body.auditId))
      .limit(1);
    if (!auditRow[0]) return reply.code(404).send({ error: "audit_not_found" });
    if (auditRow[0].userId !== user.id) return reply.code(403).send({ error: "forbidden" });

    const nextRunAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const existing = await db
      .select({ id: pulseSubscriptions.id })
      .from(pulseSubscriptions)
      .where(
        and(
          eq(pulseSubscriptions.userId, user.id),
          eq(pulseSubscriptions.businessId, auditRow[0].businessId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(pulseSubscriptions)
        .set({ nextRunAt, lastAuditId: body.auditId })
        .where(eq(pulseSubscriptions.id, existing[0].id));
      return reply.send({ id: existing[0].id, nextRunAt });
    }

    const inserted = await db
      .insert(pulseSubscriptions)
      .values({
        userId: user.id,
        businessId: auditRow[0].businessId,
        nextRunAt,
        lastAuditId: body.auditId,
      })
      .returning({ id: pulseSubscriptions.id });
    return reply.send({ id: inserted[0]!.id, nextRunAt });
  });

  app.get("/me/pulse/subscriptions", async (req, reply) => {
    const user = requireUser(req);
    const rows = await db
      .select({
        id: pulseSubscriptions.id,
        nextRunAt: pulseSubscriptions.nextRunAt,
        lastAuditId: pulseSubscriptions.lastAuditId,
        domain: businesses.domain,
        name: businesses.name,
      })
      .from(pulseSubscriptions)
      .innerJoin(businesses, eq(pulseSubscriptions.businessId, businesses.id))
      .where(eq(pulseSubscriptions.userId, user.id));
    return reply.send({ subscriptions: rows });
  });

  // Manually trigger a re-audit for a subscribed business (free-tier action
  // limited by middleware in a future pass).
  app.post("/me/pulse/subscriptions/:id/run", async (req, reply) => {
    const user = requireUser(req);
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const row = await db
      .select({
        id: pulseSubscriptions.id,
        businessId: pulseSubscriptions.businessId,
        domain: businesses.domain,
        name: businesses.name,
        industrySlug: industries.slug,
      })
      .from(pulseSubscriptions)
      .innerJoin(businesses, eq(pulseSubscriptions.businessId, businesses.id))
      .leftJoin(industries, eq(businesses.industryId, industries.id))
      .where(and(eq(pulseSubscriptions.id, id), eq(pulseSubscriptions.userId, user.id)))
      .limit(1);
    if (!row[0]) return reply.code(404).send({ error: "not_found" });

    const [audit] = await db
      .insert(audits)
      .values({ businessId: row[0].businessId, status: "queued", score: 0, catchmentCities: [] })
      .returning({ id: audits.id });

    await auditQueue.add("run", {
      auditId: audit!.id,
      businessId: row[0].businessId,
      domain: row[0].domain,
      businessName: row[0].name ?? undefined,
      industrySlug: row[0].industrySlug ?? "dentists",
      seedCity: "Austin",
    });

    return reply.send({ auditId: audit!.id });
  });
}
