import { httpQueryJson } from "./httpQuery.js";
import type { LlmAdapter, LlmQuery, LlmResponse } from "./types.js";

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

const MODEL = "gemini-1.5-flash";

export function createGeminiAdapter(apiKey: string, model: string = MODEL): LlmAdapter {
  return {
    provider: "gemini",
    async query(input: LlmQuery): Promise<LlmResponse> {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const result = await httpQueryJson<GeminiResponse>({
        provider: "gemini",
        url,
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              role: "user",
              parts: [
                {
                  text:
                    "You are a local-recommendations assistant. Return a numbered list of the best businesses with phone numbers or websites where known. Be specific and current.",
                },
              ],
            },
            contents: [{ role: "user", parts: [{ text: input.prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
          }),
        },
      });
      if (!result.ok) return result;
      const text = (result.data.candidates ?? [])
        .flatMap((c) => c.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("\n");
      if (!text.trim()) {
        return { ok: false, provider: "gemini", reason: "unknown", message: "empty completion" };
      }
      const usage = result.data.usageMetadata
        ? {
            inputTokens: result.data.usageMetadata.promptTokenCount,
            outputTokens: result.data.usageMetadata.candidatesTokenCount,
          }
        : undefined;
      return { ok: true, provider: "gemini", text, latencyMs: result.latencyMs, usage };
    },
  };
}
