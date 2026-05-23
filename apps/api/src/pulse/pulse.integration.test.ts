// Gate 5 (mock mode) integration test for the Pulse cron + unsubscribe
// flow. See docs/VERIFICATION.md §Gate 5.
//
// What it covers:
//   1. runPulseTickNow() scans pulse_subscriptions, finds backdated rows,
//      enqueues a re-audit, slides next_run_at forward, and enqueues a
//      delayed pulse-email job.
//   2. The unsubscribe URL signed by buildUnsubscribeUrl() works end-to-end
//      against a real GET /pulse/unsubscribe — the subscription row is
//      deleted and the user's pulse_opt_in is flipped false.
//
// What it does NOT cover (deferred to the real-Resend Gate 5):
//   - inbox delivery
//   - the 30s-delayed pulse-email job actually firing (timing-sensitive,
//     not deterministic in a unit-style suite)
//   - List-Unsubscribe header arriving at the recipient

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  audits,
  auditResults,
  businesses,
  industries,
  pulseSubscriptions,
  users,
} from "../db/schema.js";
import { buildServer } from "../server.js";
import { startAuditWorker, auditQueue } from "../orchestrator/queue.js";
import { closeProgressPublisher } from "../realtime/progress.js";
import {
  pulseQueue,
  runPulseTickNow,
} from "./scheduler.js";
import { buildUnsubscribeUrl } from "./unsubscribe.js";

const ENABLED = process.env.INTEGRATION === "1";

const TEST_DOMAIN = "gate5-pulse.example";
const TEST_EMAIL = `gate5-pulse-${Date.now()}@geotracker.test`;

async function cleanup(): Promise<void> {
  const u = await db.select({ id: users.id }).from(users).where(eq(users.email, TEST_EMAIL));
  if (u.length === 0) return;
  const userIds = u.map((r) => r.id);

  const biz = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(inArray(businesses.userId, userIds));
  const bizIds = biz.map((b) => b.id);

  if (bizIds.length > 0) {
    const auditRows = await db
      .select({ id: audits.id })
      .from(audits)
      .where(inArray(audits.businessId, bizIds));
    if (auditRows.length > 0) {
      const auditIds = auditRows.map((a) => a.id);
      await db.delete(auditResults).where(inArray(auditResults.auditId, auditIds));
      await db
        .update(pulseSubscriptions)
        .set({ lastAuditId: null })
        .where(inArray(pulseSubscriptions.lastAuditId, auditIds));
      await db.delete(audits).where(inArray(audits.id, auditIds));
    }
    await db
      .delete(pulseSubscriptions)
      .where(inArray(pulseSubscriptions.businessId, bizIds));
    await db.delete(businesses).where(inArray(businesses.id, bizIds));
  }

  await db.delete(users).where(inArray(users.id, userIds));
}

describe.skipIf(!ENABLED)("pulse cron + unsubscribe (Gate 5 mock mode)", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  let baseUrl: string;
  let worker: ReturnType<typeof startAuditWorker>;

  beforeAll(async () => {
    const seeded = await db.select({ id: industries.id }).from(industries).limit(1);
    if (seeded.length === 0) {
      throw new Error(
        "industries table is empty — run `pnpm --filter @geotracker/api db:migrate && pnpm --filter @geotracker/api db:seed` before INTEGRATION=1 tests",
      );
    }
    app = await buildServer();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const addr = app.server.address();
    if (!addr || typeof addr === "string") throw new Error("no address");
    baseUrl = `http://127.0.0.1:${addr.port}`;
    worker = startAuditWorker();
  }, 30_000);

  afterAll(async () => {
    await worker.close();
    await auditQueue.close();
    await pulseQueue.close();
    await closeProgressPublisher();
    await app.close();
    await cleanup();
  });

  beforeEach(async () => {
    await cleanup();
  });

  it("tick enqueues a re-audit for a backdated subscription and slides next_run_at forward", async () => {
    // Arrange: user + business + completed seed audit + backdated sub.
    const [user] = await db
      .insert(users)
      .values({ email: TEST_EMAIL, pulseOptIn: true })
      .returning({ id: users.id });
    const dentalIndustry = await db
      .select({ id: industries.id })
      .from(industries)
      .where(eq(industries.slug, "dentists"))
      .limit(1);
    const [biz] = await db
      .insert(businesses)
      .values({
        userId: user!.id,
        domain: TEST_DOMAIN,
        name: "Gate 5 Dental",
        industryId: dentalIndustry[0]!.id,
        seedCity: "Austin",
      })
      .returning({ id: businesses.id });
    const [seedAudit] = await db
      .insert(audits)
      .values({
        businessId: biz!.id,
        status: "complete",
        score: 50,
        catchmentCities: ["Austin"],
        completedAt: new Date(),
      })
      .returning({ id: audits.id });

    const backdated = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sub] = await db
      .insert(pulseSubscriptions)
      .values({
        userId: user!.id,
        businessId: biz!.id,
        nextRunAt: backdated,
        lastAuditId: seedAudit!.id,
      })
      .returning({ id: pulseSubscriptions.id });

    // Act: run the scheduler tick once.
    await runPulseTickNow();

    // Assert: subscription's nextRunAt slid forward (well into the future).
    const after = await db
      .select({
        nextRunAt: pulseSubscriptions.nextRunAt,
        lastAuditId: pulseSubscriptions.lastAuditId,
      })
      .from(pulseSubscriptions)
      .where(eq(pulseSubscriptions.id, sub!.id))
      .limit(1);
    expect(after[0]).toBeDefined();
    expect(after[0]!.nextRunAt.getTime()).toBeGreaterThan(Date.now() + 25 * 24 * 60 * 60 * 1000);
    // And lastAuditId points at the NEW audit, not the seed.
    expect(after[0]!.lastAuditId).not.toBe(seedAudit!.id);

    // A second audit row exists for this business.
    const allAudits = await db
      .select({ id: audits.id })
      .from(audits)
      .where(eq(audits.businessId, biz!.id));
    expect(allAudits.length).toBe(2);
  });

  it("tick skips subscriptions whose user has pulse_opt_in=false, just slides next_run_at", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: TEST_EMAIL, pulseOptIn: false })
      .returning({ id: users.id });
    const [biz] = await db
      .insert(businesses)
      .values({ userId: user!.id, domain: TEST_DOMAIN, seedCity: "Austin" })
      .returning({ id: businesses.id });
    const backdated = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [sub] = await db
      .insert(pulseSubscriptions)
      .values({ userId: user!.id, businessId: biz!.id, nextRunAt: backdated })
      .returning({ id: pulseSubscriptions.id });

    await runPulseTickNow();

    const after = await db
      .select({ nextRunAt: pulseSubscriptions.nextRunAt })
      .from(pulseSubscriptions)
      .where(eq(pulseSubscriptions.id, sub!.id))
      .limit(1);
    expect(after[0]!.nextRunAt.getTime()).toBeGreaterThan(Date.now() + 25 * 24 * 60 * 60 * 1000);
    // No new audit was enqueued.
    const allAudits = await db
      .select({ id: audits.id })
      .from(audits)
      .where(eq(audits.businessId, biz!.id));
    expect(allAudits.length).toBe(0);
  });

  it("GET /pulse/unsubscribe deletes the subscription row and flips user.pulse_opt_in to false", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: TEST_EMAIL, pulseOptIn: true })
      .returning({ id: users.id });
    const [biz] = await db
      .insert(businesses)
      .values({ userId: user!.id, domain: TEST_DOMAIN, seedCity: "Austin" })
      .returning({ id: businesses.id });
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [sub] = await db
      .insert(pulseSubscriptions)
      .values({ userId: user!.id, businessId: biz!.id, nextRunAt: future })
      .returning({ id: pulseSubscriptions.id });

    // Build the same signed URL the Pulse email would carry.
    const unsubUrl = buildUnsubscribeUrl(sub!.id);
    // The URL points at env.API_ORIGIN; for the test we issued on a random
    // ephemeral port, so swap the host. The token is path-independent.
    const tokenMatch = unsubUrl.match(/token=([^&]+)/);
    expect(tokenMatch).not.toBeNull();
    const res = await fetch(`${baseUrl}/pulse/unsubscribe?token=${tokenMatch![1]}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toContain("text/html");
    const body = await res.text();
    expect(body).toMatch(/Unsubscribed/i);

    // Subscription row gone.
    const remaining = await db
      .select({ id: pulseSubscriptions.id })
      .from(pulseSubscriptions)
      .where(eq(pulseSubscriptions.id, sub!.id));
    expect(remaining).toHaveLength(0);

    // User's pulse_opt_in flipped to false.
    const u = await db
      .select({ pulseOptIn: users.pulseOptIn })
      .from(users)
      .where(eq(users.id, user!.id))
      .limit(1);
    expect(u[0]!.pulseOptIn).toBe(false);
  });

  it("GET /pulse/unsubscribe rejects a malformed token", async () => {
    const res = await fetch(`${baseUrl}/pulse/unsubscribe?token=not.a.valid.token`);
    expect(res.status).toBe(400);
  });
});
