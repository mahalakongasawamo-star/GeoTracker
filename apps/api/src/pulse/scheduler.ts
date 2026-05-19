// Pulse Report scheduler: a BullMQ repeatable job that finds subscriptions
// whose nextRunAt is due. For each, enqueues a re-audit via the existing
// audits queue (so it benefits from the worker's concurrency) and a
// follow-up pulse-email job that emails the user once the audit completes.

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

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const pulseQueue = new Queue("pulse", { connection });

const PULSE_TICK = "pulse-tick";
const PULSE_EMAIL = "pulse-email";

interface PulseEmailJob {
  subscriptionId: string;
  auditId: string;
  email: string;
  businessDomain: string;
  businessName: string | null;
  previousAuditId: string | null;
}

async function enqueueDueSubscriptions(): Promise<void> {
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
      seedCity: businesses.seedCity,
    })
    .from(pulseSubscriptions)
    .innerJoin(users, eq(pulseSubscriptions.userId, users.id))
    .innerJoin(businesses, eq(pulseSubscriptions.businessId, businesses.id))
    .leftJoin(industries, eq(businesses.industryId, industries.id))
    .where(lte(pulseSubscriptions.nextRunAt, now))
    .limit(100);

  for (const row of due) {
    if (!row.pulseOptIn) {
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

    // Slide the next run forward NOW so a transient failure doesn't keep
    // re-enqueuing the same subscription on every tick.
    await db
      .update(pulseSubscriptions)
      .set({ lastAuditId: audit!.id, nextRunAt: addDays(now, 30) })
      .where(eq(pulseSubscriptions.id, row.subId));

    await auditQueue.add(
      "run",
      {
        auditId: audit!.id,
        businessId: row.businessId,
        domain: row.domain,
        businessName: row.name ?? undefined,
        industrySlug: row.industrySlug ?? "dentists",
        seedCity: row.seedCity ?? "Austin",
      },
      { attempts: 2, backoff: { type: "exponential", delay: 5_000 } },
    );

    const emailJob: PulseEmailJob = {
      subscriptionId: row.subId,
      auditId: audit!.id,
      email: row.email,
      businessDomain: row.domain,
      businessName: row.name,
      previousAuditId: row.lastAuditId,
    };
    // Delay the email by a budget that should comfortably cover the audit
    // (BRD §7.2: under 15s). If the audit is still queued, the email job
    // will see status != complete and re-delay itself.
    await pulseQueue.add(PULSE_EMAIL, emailJob, { delay: 30_000, attempts: 3 });
  }
}

async function sendPulseEmail(job: PulseEmailJob): Promise<void> {
  const auditRow = await db
    .select({ status: audits.status, score: audits.score })
    .from(audits)
    .where(eq(audits.id, job.auditId))
    .limit(1);

  // If the audit isn't done yet, re-defer.
  if (!auditRow[0] || (auditRow[0].status !== "complete" && auditRow[0].status !== "partial")) {
    await pulseQueue.add(PULSE_EMAIL, job, { delay: 15_000, attempts: 1 });
    return;
  }

  const previous = job.previousAuditId
    ? await db
        .select({ score: audits.score })
        .from(audits)
        .where(eq(audits.id, job.previousAuditId))
        .limit(1)
    : [];

  const unsubscribeUrl = buildUnsubscribeUrl(job.subscriptionId);
  const { html, text, subject } = buildPulseEmail({
    recipientEmail: job.email,
    businessDomain: job.businessDomain,
    businessName: job.businessName ?? undefined,
    currentScore: auditRow[0].score,
    previousScore: previous[0]?.score ?? null,
    auditId: job.auditId,
    unsubscribeUrl,
  });

  // RFC 8058 one-click unsubscribe so Gmail/Outlook stop downgrading us.
  await sendEmail({
    to: job.email,
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function startPulseScheduler() {
  const worker = new Worker<PulseEmailJob | Record<string, never>>(
    "pulse",
    async (job) => {
      if (job.name === PULSE_TICK) {
        await enqueueDueSubscriptions();
      } else if (job.name === PULSE_EMAIL) {
        await sendPulseEmail(job.data as PulseEmailJob);
      }
    },
    { connection, concurrency: 5 },
  );

  // Tick hourly; the tick scans for due subs.
  void pulseQueue.add(
    PULSE_TICK,
    {},
    {
      repeat: { pattern: "0 * * * *" },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );

  return worker;
}

export async function runPulseTickNow(): Promise<void> {
  await enqueueDueSubscriptions();
}
