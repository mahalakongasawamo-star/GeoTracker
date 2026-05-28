// Central audit pipeline. Parallel fan-out across (LLM × resolved prompt),
// streams progress via Redis pub/sub, writes per-cell rows + an aggregate
// score back to Postgres. Designed so the public BullMQ worker is a thin
// shell around this function.

import { eq } from "drizzle-orm";
import type { LlmProvider, ProgressEvent } from "@geotracker/shared";
import { db } from "../db/client.js";
import { auditResults, audits } from "../db/schema.js";
import { env } from "../env.js";
import { expandCatchment } from "../geospatial/catchment.js";
import { createHealthBatch } from "../llm/health.js";
import { getAllAdapters } from "../llm/index.js";
import { extractMentions } from "../parsing/extractMentions.js";
import { resolvePrompts } from "../prompts/resolver.js";
import { publishProgress } from "../realtime/progress.js";
import { aggregateScore, bandFor } from "../scoring/score.js";

// Serialize calls per provider (limit=1) AND enforce a minimum gap between
// successive call starts (minGapMs). Concurrency alone isn't enough: free-tier
// RPM caps on Gemini/Anthropic reject calls that arrive faster than the
// published rate even if only one is in flight at a time. Pacing is sourced
// from env.PROVIDER_PACE_MS so paid-tier upgrades flip it via env, not code.
function createPacedGate(minGapMs: number) {
  let active = 0;
  let lastStart = 0;
  const waiters: Array<() => void> = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= 1) {
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
    active += 1;
    if (minGapMs > 0) {
      const wait = lastStart + minGapMs - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    lastStart = Date.now();
    try {
      return await fn();
    } finally {
      active -= 1;
      waiters.shift()?.();
    }
  };
}

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
  const health = createHealthBatch();

  const tasks: Array<
    Promise<{
      provider: LlmProvider;
      band: ReturnType<typeof bandFor>;
      realFailure: boolean;
    }>
  > = [];
  const gates = new Map<LlmProvider, ReturnType<typeof createPacedGate>>();
  for (const a of adapters) {
    const pace = env.LLM_USE_REAL_ADAPTERS ? env.PROVIDER_PACE_MS[a.provider] ?? 0 : 0;
    gates.set(a.provider, createPacedGate(pace));
  }

  for (const adapter of adapters) {
    const gate = gates.get(adapter.provider)!;
    for (const prompt of prompts) {
      const task = gate(async () => {
        const response = await adapter.query({
          prompt: prompt.text,
          businessName: input.businessName,
          domain: input.domain,
          city: prompt.city,
        });

        health.record(adapter.provider, response.ok, response.ok ? undefined : response.reason);

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
          // A failed real call (HTTP error, empty completion, timeout) still
          // carries source:"real" on the response object. Persisting that
          // would make the UI's "Sample data" banner silent for empty rows.
          // Collapse only the real-failure case to "mock_fallback"; preserve
          // mock/mock_fallback failures as-is (the mock adapter intentionally
          // returns ok:false for ~5% of cells to simulate provider downtime).
          source:
            !response.ok && response.source === "real" ? "mock_fallback" : response.source,
          inputTokens: response.ok ? response.usage?.inputTokens ?? null : null,
          outputTokens: response.ok ? response.usage?.outputTokens ?? null : null,
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
        const realFailure = !response.ok && response.source === "real";
        return { provider: adapter.provider, band, realFailure };
      });

      tasks.push(task);
    }
  }

  const settled = await Promise.allSettled(tasks);
  const rejectedCount = settled.filter((s) => s.status === "rejected").length;
  const fulfilled = settled
    .filter(
      (s): s is PromiseFulfilledResult<{
        provider: LlmProvider;
        band: ReturnType<typeof bandFor>;
        realFailure: boolean;
      }> => s.status === "fulfilled",
    )
    .map((s) => s.value);
  const bands = fulfilled.map((v) => v.band);
  // Real-API adapters return ok:false on HTTP error / empty completion rather
  // than throwing, so the task settles as fulfilled. Count those for the
  // partial-status check. Mock/mock_fallback failures don't count — they're
  // simulated provider downtime, expected in fixture/no-key mode.
  const realFailureCount = fulfilled.filter((v) => v.realFailure).length;

  const score = aggregateScore(bands);
  // BRD §7.2: partial success if at least one cell failed but others
  // completed. Coverage is checked against env.LLM_ENABLED_PROVIDERS, not
  // the full LLM_PROVIDERS list — when the operator deliberately narrows
  // the audit scope (e.g. claude-only while other keys are unfunded), a
  // Claude-only run that fully succeeded is "complete", not "partial".
  const allProviders = new Set(env.LLM_ENABLED_PROVIDERS);
  const seenProviders = new Set(fulfilled.map((v) => v.provider));
  const providerCoverage = [...allProviders].every((p) => seenProviders.has(p));
  const status =
    rejectedCount > 0 || realFailureCount > 0 || !providerCoverage ? "partial" : "complete";

  await db
    .update(audits)
    .set({ status, score, completedAt: new Date() })
    .where(eq(audits.id, auditId));

  await health.flush();

  await publishProgress(auditId, {
    type: "complete",
    auditId,
    completedRatio: 1,
  });
}
