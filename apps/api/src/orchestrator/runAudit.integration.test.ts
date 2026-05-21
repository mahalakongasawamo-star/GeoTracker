// Integration test for the full audit pipeline as described in
// docs/PLAN.md §Verification.
//
// Required services:
//   - Postgres reachable at $DATABASE_URL with migrations + seed applied
//   - Redis reachable at $REDIS_URL
//   - INTEGRATION=1 in the environment
//
// To run: `pnpm docker:up && pnpm db:migrate && pnpm db:seed && \
//          pnpm --filter @geotracker/api test:integration`
//
// Asserts the four pieces PLAN.md flags as the integration gate:
//   1) POST /audits returns 202 + id
//   2) the worker fans out N progress events (providers × prompts)
//   3) the SSE stream delivers each one followed by a single `complete`
//   4) the final audit row is `complete` with a 0..100 score and a row
//      per (LLM, prompt × city) cell

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { LLM_PROVIDERS, type ProgressEvent } from "@geotracker/shared";
import { db } from "../db/client.js";
import { audits, auditResults, businesses, industries } from "../db/schema.js";
import { buildServer } from "../server.js";
import { startAuditWorker } from "./queue.js";
import { auditQueue } from "./queue.js";
import { expandCatchment } from "../geospatial/catchment.js";
import { resolvePrompts } from "../prompts/resolver.js";

const ENABLED = process.env.INTEGRATION === "1";
const TEST_DOMAIN = "integration-brightsmiles.example";

// Read SSE frames off a fetch response body. Yields one parsed event per
// `data: ...\n\n` block. Stops when the stream closes.
async function* readSseEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ProgressEvent> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      const json = dataLine.slice("data:".length).trim();
      if (!json) continue;
      try {
        yield JSON.parse(json) as ProgressEvent;
      } catch {
        /* skip malformed */
      }
    }
  }
}

describe.skipIf(!ENABLED)("audit pipeline integration (Postgres + Redis + BullMQ)", () => {
  let baseUrl: string;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let worker: ReturnType<typeof startAuditWorker>;

  beforeAll(async () => {
    // Cheap up-front check: if the industries table is empty, seeds weren't
    // run — fail loudly instead of silently producing 0 prompts.
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
    await app.close();
  });

  beforeEach(async () => {
    // Scope cleanup to this test's domain so we don't nuke unrelated rows
    // in a shared dev DB.
    const biz = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.domain, TEST_DOMAIN));
    if (biz.length > 0) {
      const ids = biz.map((b) => b.id);
      const auditIds = await db
        .select({ id: audits.id })
        .from(audits)
        .where(inArray(audits.businessId, ids));
      if (auditIds.length > 0) {
        await db
          .delete(auditResults)
          .where(inArray(auditResults.auditId, auditIds.map((a) => a.id)));
        await db.delete(audits).where(inArray(audits.businessId, ids));
      }
      await db.delete(businesses).where(inArray(businesses.id, ids));
    }
  });

  it("emits one progress event per (LLM, prompt) cell, a single complete, and lands the audit in `complete`", async () => {
    // 1) Compute the expected fan-out so the assertion isn't tautological.
    const seedCity = "Austin";
    const industrySlug = "dentists"; // matches inferIndustrySlug for the domain below
    const catchment = await expandCatchment({ industrySlug, seedCity });
    const prompts = resolvePrompts(industrySlug, catchment.cities);
    const expectedCells = LLM_PROVIDERS.length * prompts.length;

    // 2) Enqueue.
    const startRes = await fetch(`${baseUrl}/audits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        domain: TEST_DOMAIN,
        businessName: "Integration Bright Smiles Dental",
        industrySlug,
        city: seedCity,
      }),
    });
    expect(startRes.status).toBe(202);
    const { id: auditId } = (await startRes.json()) as { id: string };
    expect(auditId).toMatch(/^[0-9a-f-]{36}$/);

    // 3) Open the SSE stream BEFORE the worker finishes. We can't perfectly
    // race this, but with the mock adapter under NODE_ENV=test there's no
    // simulated latency, so we subscribe ASAP and rely on Redis pub/sub
    // delivering everything published after we subscribe. Practically the
    // worker boots through Drizzle + Redis before publishing the first
    // event, which gives us time. If this proves flaky, switch to a
    // pre-enqueue SSE subscription.
    const streamRes = await fetch(`${baseUrl}/audits/${auditId}/stream`, {
      headers: { accept: "text/event-stream" },
    });
    expect(streamRes.status).toBe(200);
    expect(streamRes.body).not.toBeNull();

    const progress: ProgressEvent[] = [];
    const complete: ProgressEvent[] = [];
    const collector = (async () => {
      for await (const ev of readSseEvents(streamRes.body!)) {
        if (ev.type === "progress") progress.push(ev);
        else if (ev.type === "complete") {
          complete.push(ev);
          break;
        }
      }
    })();

    // 30s budget — mock adapter is instant under NODE_ENV=test; the rest is
    // DB latency. If this times out, it's a real bug worth surfacing.
    await Promise.race([
      collector,
      new Promise((_, reject) => setTimeout(() => reject(new Error("SSE timeout")), 30_000)),
    ]);

    // 4) Exactly one complete event, fired with completedRatio=1.
    expect(complete).toHaveLength(1);
    expect(complete[0]!.completedRatio).toBe(1);

    // 5) One progress event per cell, no duplicates of (llm, city, promptIndex).
    // We can't assert prompt index from the event (not in the payload), but
    // we can assert the count matches and that every (llm × city) pair is
    // hit at least once.
    expect(progress.length).toBe(expectedCells);
    for (const provider of LLM_PROVIDERS) {
      expect(progress.some((e) => e.llm === provider)).toBe(true);
    }
    for (const city of catchment.cities) {
      expect(progress.some((e) => e.city === city)).toBe(true);
    }

    // 6) Final DB state.
    const auditRow = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);
    expect(auditRow[0]).toBeDefined();
    expect(auditRow[0]!.status).toBe("complete");
    expect(auditRow[0]!.score).toBeGreaterThanOrEqual(0);
    expect(auditRow[0]!.score).toBeLessThanOrEqual(100);
    expect(auditRow[0]!.completedAt).not.toBeNull();
    expect((auditRow[0]!.catchmentCities as string[]).length).toBe(catchment.cities.length);

    const cellCount = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(auditResults)
      .where(eq(auditResults.auditId, auditId));
    expect(cellCount[0]!.n).toBe(expectedCells);
  }, 60_000);
});
