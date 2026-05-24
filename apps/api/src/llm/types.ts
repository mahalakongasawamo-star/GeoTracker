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

// "real"          — query hit the actual provider API
// "mock"          — global mock mode (LLM_USE_REAL_ADAPTERS=false)
// "mock_fallback" — flag is true but this provider has no API key; the
//                   orchestrator silently fell back so the audit still
//                   completes. Surfaced in the UI as "Sample data".
export type LlmResponseSource = "real" | "mock" | "mock_fallback";

export interface LlmUsage {
  /** Input/prompt tokens, when the provider reports them. */
  inputTokens?: number;
  /** Output/completion tokens, when the provider reports them. */
  outputTokens?: number;
}

export type LlmResponse =
  | {
      ok: true;
      provider: LlmProvider;
      source: LlmResponseSource;
      text: string;
      latencyMs: number;
      usage?: LlmUsage;
    }
  | {
      ok: false;
      provider: LlmProvider;
      source: LlmResponseSource;
      reason: LlmFailureCode;
      message: string;
    };

export interface LlmAdapter {
  provider: LlmProvider;
  query(input: LlmQuery): Promise<LlmResponse>;
}
