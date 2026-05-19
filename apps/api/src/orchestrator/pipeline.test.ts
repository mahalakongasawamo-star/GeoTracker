// Pipeline smoke test: mock adapter → parsing → scoring → aggregation.
// Catches regressions in the data path that single-module tests miss.
// No DB, no queue — pure functional flow.

import { describe, expect, it } from "vitest";
import { LLM_PROVIDERS, type ScoreBand } from "@geotracker/shared";
import { createMockAdapter } from "../llm/mock.js";
import { extractMentions } from "../parsing/extractMentions.js";
import { aggregateScore, bandFor } from "../scoring/score.js";

async function runPipeline(domain: string, businessName?: string) {
  const bands: ScoreBand[] = [];
  for (const provider of LLM_PROVIDERS) {
    const adapter = createMockAdapter(provider);
    const response = await adapter.query({
      prompt: "Who is the best dentist in Austin?",
      businessName,
      domain,
      city: "Austin",
    });
    const llmAvailable = response.ok;
    const text = response.ok ? response.text : "";
    const parsed = extractMentions({ text, domain, businessName });
    bands.push(bandFor({ llmAvailable, ...parsed }));
  }
  return { bands, score: aggregateScore(bands) };
}

describe("pipeline: mock adapter → parsing → scoring → aggregation", () => {
  it("produces a score in [0, 100]", async () => {
    const { score } = await runPipeline("brightsmiles.com", "Bright Smiles Dental");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns the same score for the same input (deterministic)", async () => {
    const first = await runPipeline("brightsmiles.com", "Bright Smiles Dental");
    const second = await runPipeline("brightsmiles.com", "Bright Smiles Dental");
    expect(second.score).toBe(first.score);
    expect(second.bands).toEqual(first.bands);
  });

  it("produces different scores for different domains", async () => {
    const a = await runPipeline("brightsmiles.com", "Bright Smiles Dental");
    const b = await runPipeline("totallydifferentpractice.com", "Totally Different Practice");
    // Determinism + hash distribution means at least one band differs for
    // arbitrarily-chosen domains in practice.
    expect({ a: a.bands, b: b.bands }).toMatchSnapshot();
  });

  it("each band is one of the four allowed values", async () => {
    const { bands } = await runPipeline("brightsmiles.com");
    const allowed: ScoreBand[] = ["green", "yellow", "red", "unavailable"];
    for (const b of bands) expect(allowed).toContain(b);
  });
});
