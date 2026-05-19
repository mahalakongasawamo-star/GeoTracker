import type { LlmProvider } from "@geotracker/shared";

export interface LlmQuery {
  /** The fully-resolved prompt (with {city} substituted). */
  prompt: string;
  /** Target business; used by the mock adapter for deterministic fixtures and
   * by parsing to cross-reference mentions. */
  businessName?: string;
  domain: string;
  city: string;
}

export type LlmFailureCode = "rate_limited" | "timeout" | "tos" | "network" | "unknown";

export type LlmResponse =
  | { ok: true; provider: LlmProvider; text: string; latencyMs: number }
  | { ok: false; provider: LlmProvider; reason: LlmFailureCode; message: string };

export interface LlmAdapter {
  provider: LlmProvider;
  query(input: LlmQuery): Promise<LlmResponse>;
}
