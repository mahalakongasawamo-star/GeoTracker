// BRD §5.2 scoring logic.
//
//   Green        : business in top-3 AND has contact info AND no caveat.
//   Yellow       : mentioned but outside top-3 OR top-3 without contact info
//                  OR a caveat is present.
//   Red          : not mentioned at all.
//   Unavailable  : LLM endpoint failed (rate-limited / down / network).

import type { ScoreBand } from "@geotracker/shared";

export interface ScoreInput {
  llmAvailable: boolean;
  mentioned: boolean;
  rank: number | null;
  hasContactInfo: boolean;
  caveatFlag: boolean;
}

export function bandFor(input: ScoreInput): ScoreBand {
  if (!input.llmAvailable) return "unavailable";
  if (!input.mentioned) return "red";
  const isTop3 = input.rank != null && input.rank >= 1 && input.rank <= 3;
  if (!isTop3) return "yellow";
  // Top-3 but no actionable info → downgrade (BRD §5.2, §7.3).
  if (!input.hasContactInfo) return "yellow";
  if (input.caveatFlag) return "yellow";
  return "green";
}

// Aggregate to a 0–100 visibility gauge. Weights chosen so a perfect score
// requires green across every (LLM × prompt × city) cell, and being absent
// from every LLM lands near zero. Unavailable cells are excluded from the
// denominator so a downed provider does not artificially deflate the score.
const WEIGHTS: Record<ScoreBand, number> = {
  green: 1.0,
  yellow: 0.5,
  red: 0.0,
  unavailable: 0,
};

export function aggregateScore(bands: ScoreBand[]): number {
  const scored = bands.filter((b) => b !== "unavailable");
  if (scored.length === 0) return 0;
  const total = scored.reduce((acc, b) => acc + WEIGHTS[b], 0);
  return Math.round((total / scored.length) * 100);
}
