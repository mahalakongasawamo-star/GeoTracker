import type { LlmProvider } from "@geotracker/shared";
import { httpQueryJson } from "./httpQuery.js";
import type { LlmAdapter, LlmQuery, LlmResponse } from "./types.js";

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

// Shared adapter for OpenAI / Perplexity / xAI Grok — same /chat/completions
// shape with different base URLs, auth headers, and default models.
export interface OpenAICompatibleConfig {
  provider: LlmProvider;
  url: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  /** Provider-specific extra fields (e.g. Perplexity's search_recency_filter). */
  extraBody?: Record<string, unknown>;
}

export function createOpenAICompatibleAdapter(cfg: OpenAICompatibleConfig): LlmAdapter {
  const systemPrompt =
    cfg.systemPrompt ??
    "You are a local-recommendations assistant. When asked, return a numbered list of the best businesses (with phone numbers or websites where known). Be specific and current.";

  return {
    provider: cfg.provider,
    async query(input: LlmQuery): Promise<LlmResponse> {
      const body = {
        model: cfg.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.prompt },
        ],
        temperature: 0.2,
        ...(cfg.extraBody ?? {}),
      };
      const result = await httpQueryJson<OpenAIChatResponse>({
        provider: cfg.provider,
        url: cfg.url,
        init: {
          method: "POST",
          headers: {
            authorization: `Bearer ${cfg.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
      });
      if (!result.ok) return result;
      const text = result.data.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) {
        return {
          ok: false,
          provider: cfg.provider,
          reason: "unknown",
          message: "empty completion",
        };
      }
      return { ok: true, provider: cfg.provider, text, latencyMs: result.latencyMs };
    },
  };
}
