// Central audit pipeline. Parallel fan-out across (LLM × resolved prompt),
// streams progress via Redis pub/sub, writes per-cell rows + an aggregate
// score back to Postgres. Designed so the public BullMQ worker is a thin
// shell around this function.

import { eq } from "drizzle-orm";
import { LLM_PROVIDERS, type LlmProvider, type ProgressEvent } from "@geotracker/shared";
import { db } from "../db/client.js";
import { auditResults, audits } from "../db/schema.js";
import { expandCatchment } from "../geospatial/catchment.js";
import { getAllAdapters } from "../llm/index.js";
import { extractMentions } from "../parsing/extractMentions.js";
import { resolvePrompts } from "../prompts/resolver.js";
import { publishProgress } from "../realtime/progress.js";
import { aggregateScore, bandFor } from "../scoring/score.js";

export interface RunAuditInput {
  auditId: string;
  businessId: string;
  domain: string;
  businessName?: string;
  industrySlug: string;
  seedCity: string;
}

export async function runAudit(input: RunAuditInput): Promise<void> {
  const { auditId } = input;
  const catchment = await expandCatchment({
    industrySlug: input.industrySlug,
    seedCity: input.seedCity,
  });
  const prompts = resolvePrompts(input.industrySlug, catchment.cities);
  const adapters = getAllAdapters();

  await db
    .update(audits)
    .set({
      status: "running",
      catchmentCities: catchment.cities,
      startedAt: new Date(),
    })
    .where(eq(audits.id, auditId));

  const totalCells = adapters.length * prompts.length;
  let completedCells = 0;

  const tasks: Array<Promise<{ provider: LlmProvider; band: ReturnType<typeof bandFor> }>> = [];

  for (const adapter of adapters) {
    for (const prompt of prompts) {
      const task = (async () => {
        const response = await adapter.query({
          prompt: prompt.text,
          businessName: input.businessName,
          domain: input.domain,
          city: prompt.city,
        });

        const llmAvailable = response.ok;
        const text = response.ok ? response.text : "";
        const parsed = extractMentions({ text, domain: input.domain, businessName: input.businessName });
        const band = bandFor({ llmAvailable, ...parsed });

        await db.insert(auditResults).values({
          auditId,
          llm: adapter.provider,
          promptText: prompt.text,
          city: prompt.city,
          responseRaw: text.slice(0, 4000) || null,
          mentioned: parsed.mentioned,
          rank: parsed.rank,
          hasContactInfo: parsed.hasContactInfo,
          caveatFlag: parsed.caveatFlag,
          scoreBand: band,
        });

        completedCells += 1;
        const event: ProgressEvent = {
          type: "progress",
          auditId,
          llm: adapter.provider,
          city: prompt.city,
          completedRatio: completedCells / totalCells,
        };
        await publishProgress(auditId, event);
        return { provider: adapter.provider, band };
      })();

      tasks.push(task);
    }
  }

  const settled = await Promise.allSettled(tasks);
  const failedCount = settled.filter((s) => s.status === "rejected").length;
  const bands = settled
    .filter((s): s is PromiseFulfilledResult<{ provider: LlmProvider; band: ReturnType<typeof bandFor> }> => s.status === "fulfilled")
    .map((s) => s.value.band);

  const score = aggregateScore(bands);
  // BRD §7.2: partial success if at least one cell failed but others completed.
  const allProviders = new Set(LLM_PROVIDERS);
  const seenProviders = new Set(
    settled
      .filter((s): s is PromiseFulfilledResult<{ provider: LlmProvider; band: ReturnType<typeof bandFor> }> => s.status === "fulfilled")
      .map((s) => s.value.provider),
  );
  const providerCoverage = [...allProviders].every((p) => seenProviders.has(p));
  const status = failedCount > 0 || !providerCoverage ? "partial" : "complete";

  await db
    .update(audits)
    .set({ status, score, completedAt: new Date() })
    .where(eq(audits.id, auditId));

  await publishProgress(auditId, {
    type: "complete",
    auditId,
    completedRatio: 1,
  });
}
