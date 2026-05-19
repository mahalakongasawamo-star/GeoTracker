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

export interface AuditDetail extends AuditSummary {
  rows: AuditResultRow[];
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
