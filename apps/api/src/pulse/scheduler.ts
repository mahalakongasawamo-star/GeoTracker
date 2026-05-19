// Pulse Report scheduler: a BullMQ repeatable job that finds subscriptions
// whose nextRunAt is due, re-runs an audit, emails the user, and rolls the
// nextRunAt forward by 30 days.

import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { eq, lte } from "drizzle-orm";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { audits, businesses, industries, pulseSubscriptions, users } from "../db/schema.js";
import { auditQueue } from "../orchestrator/queue.js";
import { sendEmail } from "./email.js";
import { buildPulseEmail } from "./template.js";
import { buildUnsubscribeUrl } from "./unsubscribe.js";
import { runAudit } from "../orchestrator/runAudit.js";

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const pulseQueue = new Queue("pulse", { connection });

const PULSE_TICK = "pulse-tick";

async function tick(): Promise<void> {
  const now = new Date();
  const due = await db
    .select({
      subId: pulseSubscriptions.id,
      userId: pulseSubscriptions.userId,
      businessId: pulseSubscriptions.businessId,
      email: users.email,
      pulseOptIn: users.pulseOptIn,
      lastAuditId: pulseSubscriptions.lastAuditId,
      domain: businesses.domain,
      name: businesses.name,
      industrySlug: industries.slug,
    })
    .from(pulseSubscriptions)
    .innerJoin(users, eq(pulseSubscriptions.userId, users.id))
    .innerJoin(businesses, eq(pulseSubscriptions.businessId, businesses.id))
    .leftJoin(industries, eq(businesses.industryId, industries.id))
    .where(lte(pulseSubscriptions.nextRunAt, now))
    .limit(100);

  for (const row of due) {
    if (!row.pulseOptIn) {
      // Slide nextRunAt forward so opted-out subs don't busy-loop.
      await db
        .update(pulseSubscriptions)
        .set({ nextRunAt: addDays(now, 30) })
        .where(eq(pulseSubscriptions.id, row.subId));
      continue;
    }

    const [audit] = await db
      .insert(audits)
      .values({ businessId: row.businessId, status: "queued", score: 0, catchmentCities: [] })
      .returning({ id: audits.id });

    // Re-audit inline so we have the score ready before emailing. The main
    // queue worker would also handle this, but the pulse job owns the email
    // step and benefits from synchronous completion.
    await runAudit({
      auditId: audit!.id,
      businessId: row.businessId,
      domain: row.domain,
      businessName: row.name ?? undefined,
      industrySlug: row.industrySlug ?? "dentists",
      seedCity: "Austin",
    });

    const fresh = await db
      .select({ id: audits.id, score: audits.score })
      .from(audits)
      .where(eq(audits.id, audit!.id))
      .limit(1);

    const previous = row.lastAuditId
      ? await db
          .select({ score: audits.score })
          .from(audits)
          .where(eq(audits.id, row.lastAuditId))
          .limit(1)
      : [];

    const { html, text, subject } = buildPulseEmail({
      recipientEmail: row.email,
      businessDomain: row.domain,
      businessName: row.name ?? undefined,
      currentScore: fresh[0]?.score ?? 0,
      previousScore: previous[0]?.score ?? null,
      auditId: audit!.id,
      unsubscribeUrl: buildUnsubscribeUrl(row.subId),
    });

    await sendEmail({ to: row.email, subject, html, text });

    await db
      .update(pulseSubscriptions)
      .set({ lastAuditId: audit!.id, nextRunAt: addDays(now, 30) })
      .where(eq(pulseSubscriptions.id, row.subId));
  }
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function startPulseScheduler() {
  const worker = new Worker(
    "pulse",
    async (job) => {
      if (job.name === PULSE_TICK) await tick();
    },
    { connection, concurrency: 1 },
  );

  // Tick once an hour; the tick scans for due subs.
  void pulseQueue.add(PULSE_TICK, {}, {
    repeat: { pattern: "0 * * * *" },
    removeOnComplete: true,
    removeOnFail: 100,
  });

  return worker;
}

// Exposed for the admin-triggered manual run.
export async function runPulseTickNow(): Promise<void> {
  await tick();
}
