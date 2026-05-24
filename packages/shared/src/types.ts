import type { LlmProvider, ScoreBand, AuditStatus } from "./scoring.js";

export interface AuditRequestInput {
  domain: string;
  businessName?: string;
  /** Optional override; otherwise inferred from the domain. */
  industrySlug?: string;
  /** Optional override; otherwise inferred via geocoding. */
  city?: string;
  state?: string;
}

// Tagged on each row so the UI can mark mock-fallback cells when
// LLM_USE_REAL_ADAPTERS=true but a specific provider has no API key.
//   "real"          — real LLM API was queried
//   "mock"          — global mock mode
//   "mock_fallback" — flag on, provider had no key; sample data was used
export type AuditResultSource = "real" | "mock" | "mock_fallback";

export interface AuditResultRow {
  id: string;
  llm: LlmProvider;
  promptText: string;
  city: string;
  mentioned: boolean;
  rank: number | null;
  hasContactInfo: boolean;
  caveatFlag: boolean;
  scoreBand: ScoreBand;
  /** Nullable for legacy rows written before the column existed. */
  source: AuditResultSource | null;
  responseExcerpt?: string;
}

export interface AuditSummary {
  id: string;
  status: AuditStatus;
  /** 0–100 visibility gauge. */
  score: number;
  startedAt: string;
  completedAt?: string;
  catchmentCities: string[];
  business: {
    domain: string;
    name?: string;
    industrySlug?: string;
    city?: string;
  };
}

export interface CompetitorMention {
  /** Display name of the competing business as detected in LLM responses. */
  name: string;
  /** How many distinct LLM providers (out of LLM_PROVIDERS.length) mentioned this competitor. */
  llmCount: number;
}

export interface AuditDetail extends AuditSummary {
  rows: AuditResultRow[];
  competitorMentions: CompetitorMention[];
}

export interface ProgressEvent {
  type: "progress" | "complete" | "error";
  auditId: string;
  llm?: LlmProvider;
  city?: string;
  /** 0..1 share of fan-out completed. */
  completedRatio: number;
  message?: string;
}
