import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  INDUSTRIES,
  type AuditDetail,
  type AuditSummary,
  type CompetitorMention,
  type LlmProvider,
} from "@geotracker/shared";
import { db } from "../db/client.js";
import { audits, auditResults, businesses, industries } from "../db/schema.js";
import { loadUser } from "../auth/decorate.js";
import { checkAndConsumeDailyAudit } from "../audits/dailyCap.js";
import { env } from "../env.js";
import { auditQueue } from "../orchestrator/queue.js";
import { inferIndustrySlug } from "../prompts/inferIndustry.js";
import { extractCompetitors } from "../parsing/extractCompetitors.js";
import { subscribeProgress } from "../realtime/progress.js";

const createSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3)
    .max(253) // DNS max
    .transform((s) => s.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]!.toLowerCase()),
  businessName: z.string().trim().min(1).max(120).optional(),
  industrySlug: z.string().trim().max(60).optional(),
  city: z.string().trim().max(80).optional(),
});

export async function auditRoutes(app: FastifyInstance) {
  app.post(
    "/audits",
    {
      // loadUser is optional here — audits can be anonymous.
      preHandler: loadUser,
      config: {
        // Per-IP rate limit. Tight because each audit triggers up to 240
        // real LLM calls; a single abusive IP can spend $30+ per minute at
        // the previous 30/min ceiling. Sales reps behind corp NAT will need
        // an exemption via API key once we have one.
        rateLimit: { max: 3, timeWindow: "1 minute" },
      },
    },
    async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    // Atomic daily cap. Consume before any DB writes so a rejected request
    // doesn't leak a business or audit row.
    const cap = await checkAndConsumeDailyAudit(env.DAILY_AUDIT_CAP);
    if (!cap.allowed) {
      return reply.code(429).send({
        error: "daily_audit_cap_exceeded",
        cap: cap.cap,
        retryAfterSeconds: 60 * 60, // crude; tells client "come back later"
      });
    }

    const { domain, businessName, city: cityInput, industrySlug: explicitSlug } = parsed.data;
    const slug =
      explicitSlug && INDUSTRIES.some((i) => i.slug === explicitSlug)
        ? explicitSlug
        : inferIndustrySlug(`${domain} ${businessName ?? ""}`);
    const seedCity = cityInput ?? "Austin";

    const industryRow = await db
      .select({ id: industries.id })
      .from(industries)
      .where(eq(industries.slug, slug))
      .limit(1);
    const industryId = industryRow[0]?.id ?? null;

    // Idempotent on (user_id, domain) for logged-in users: re-use an
    // existing business row so multiple audits for the same business
    // share the Pulse subscription target and the dashboard isn't
    // littered with duplicates.
    const userId = req.user?.id ?? null;
    const existing = userId
      ? await db
          .select({ id: businesses.id })
          .from(businesses)
          .where(and(eq(businesses.userId, userId), eq(businesses.domain, domain)))
          .limit(1)
      : [];

    let bizId: string;
    if (existing[0]) {
      bizId = existing[0].id;
      // Refresh the metadata in case the user gave us a name/city this time.
      await db
        .update(businesses)
        .set({
          name: businessName ?? null,
          industryId,
          seedCity,
        })
        .where(eq(businesses.id, bizId));
    } else {
      const inserted = await db
        .insert(businesses)
        .values({
          domain,
          name: businessName ?? null,
          industryId,
          seedCity,
          userId,
        })
        .returning({ id: businesses.id });
      bizId = inserted[0]!.id;
    }
    const biz = { id: bizId };

    const [audit] = await db
      .insert(audits)
      .values({ businessId: biz!.id, status: "queued", score: 0, catchmentCities: [] })
      .returning({ id: audits.id });

    await auditQueue.add(
      "run",
      {
        auditId: audit!.id,
        businessId: biz!.id,
        domain,
        businessName,
        industrySlug: slug,
        seedCity,
      },
      { attempts: 1, removeOnComplete: true, removeOnFail: false },
    );

    return reply.code(202).send({ id: audit!.id });
    },
  );

  app.get<{ Params: { id: string } }>("/audits/:id", async (req, reply) => {
    const id = req.params.id;
    const auditRow = await db
      .select({
        id: audits.id,
        status: audits.status,
        score: audits.score,
        startedAt: audits.startedAt,
        completedAt: audits.completedAt,
        catchmentCities: audits.catchmentCities,
        domain: businesses.domain,
        name: businesses.name,
        industrySlug: industries.slug,
      })
      .from(audits)
      .innerJoin(businesses, eq(audits.businessId, businesses.id))
      .leftJoin(industries, eq(businesses.industryId, industries.id))
      .where(eq(audits.id, id))
      .limit(1);

    if (!auditRow[0]) return reply.code(404).send({ error: "not_found" });
    const a = auditRow[0];

    const rows = await db
      .select()
      .from(auditResults)
      .where(eq(auditResults.auditId, id));

    const summary: AuditSummary = {
      id: a.id,
      status: a.status,
      score: a.score,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt ? a.completedAt.toISOString() : undefined,
      catchmentCities: (a.catchmentCities as string[]) ?? [],
      business: {
        domain: a.domain,
        name: a.name ?? undefined,
        industrySlug: a.industrySlug ?? undefined,
      },
    };

    // Aggregate competitor mentions across raw LLM responses. Count the
    // number of distinct LLM providers (not total occurrences) that
    // surfaced each competitor, then take the top by reach.
    const perCompetitorLlms = new Map<string, { name: string; llms: Set<LlmProvider> }>();
    for (const r of rows) {
      if (!r.responseRaw) continue;
      const names = extractCompetitors({
        text: r.responseRaw,
        targetName: a.name ?? undefined,
        targetDomain: a.domain,
        industrySlug: a.industrySlug ?? undefined,
      });
      for (const name of names) {
        const key = name.toLowerCase();
        const entry = perCompetitorLlms.get(key) ?? { name, llms: new Set<LlmProvider>() };
        entry.llms.add(r.llm);
        perCompetitorLlms.set(key, entry);
      }
    }
    const competitorMentions: CompetitorMention[] = [...perCompetitorLlms.values()]
      .map((e) => ({ name: e.name, llmCount: e.llms.size }))
      .sort((x, y) => y.llmCount - x.llmCount || x.name.localeCompare(y.name))
      .slice(0, 6);

    const detail: AuditDetail = {
      ...summary,
      rows: rows.map((r) => ({
        id: r.id,
        llm: r.llm,
        promptText: r.promptText,
        city: r.city,
        mentioned: r.mentioned,
        rank: r.rank,
        hasContactInfo: r.hasContactInfo,
        caveatFlag: r.caveatFlag,
        scoreBand: r.scoreBand,
        source: (r.source as "real" | "mock" | "mock_fallback" | null) ?? null,
        responseExcerpt: r.responseRaw ? r.responseRaw.slice(0, 280) : undefined,
      })),
      competitorMentions,
    };

    return reply.send(detail);
  });

  app.get<{ Params: { id: string } }>("/audits/:id/stream", async (req, reply) => {
    const id = req.params.id;
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    reply.raw.write(`retry: 2000\n\n`);

    const unsubscribe = subscribeProgress(id, (event) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === "complete" || event.type === "error") {
        unsubscribe()
          .catch(() => {
            /* connection already torn down — expected during shutdown */
          })
          .finally(() => reply.raw.end());
      }
    });

    req.raw.on("close", () => {
      unsubscribe().catch(() => {
        /* expected when the server is closing */
      });
    });
  });
}
