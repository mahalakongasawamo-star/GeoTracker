import { httpQueryJson } from "./httpQuery.js";
import type { LlmAdapter, LlmQuery, LlmResponse } from "./types.js";

interface AnthropicMessagesResponse {
  content?: Array<{ type: string; text?: string }>;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export function createAnthropicAdapter(apiKey: string, model = "claude-haiku-4-5"): LlmAdapter {
  return {
    provider: "claude",
    async query(input: LlmQuery): Promise<LlmResponse> {
      const result = await httpQueryJson<AnthropicMessagesResponse>({
        provider: "claude",
        url: ANTHROPIC_URL,
        init: {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            temperature: 0.2,
            system:
              "You are a local-recommendations assistant. Return a numbered list of the best businesses with phone numbers or websites where known. Be specific and current.",
            messages: [{ role: "user", content: input.prompt }],
          }),
        },
      });
      if (!result.ok) return result;
      const text = (result.data.content ?? [])
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n");
      if (!text.trim()) {
        return {
          ok: false,
          provider: "claude",
          reason: "unknown",
          message: "empty completion",
        };
      }
      return { ok: true, provider: "claude", text, latencyMs: result.latencyMs };
    },
  };
}
