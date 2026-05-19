import { LLM_PROVIDERS, type LlmProvider } from "@geotracker/shared";
import { env } from "../env.js";
import { createAnthropicAdapter } from "./anthropic.js";
import { createGeminiAdapter } from "./gemini.js";
import { createMockAdapter } from "./mock.js";
import { createOpenAICompatibleAdapter } from "./openaiCompatible.js";
import type { LlmAdapter } from "./types.js";

// Real-provider adapters are gated on:
//   1) LLM_USE_REAL_ADAPTERS=true (operator opt-in after BRD §14 budget + TOS
//      review), AND
//   2) the matching API key being set.
// Any provider lacking a key while the flag is on falls back to the mock so
// the orchestrator always returns a usable response set.
function realAdapter(provider: LlmProvider): LlmAdapter | null {
  switch (provider) {
    case "chatgpt":
      if (!env.OPENAI_API_KEY) return null;
      return createOpenAICompatibleAdapter({
        provider: "chatgpt",
        url: "https://api.openai.com/v1/chat/completions",
        apiKey: env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
      });
    case "perplexity":
      if (!env.PERPLEXITY_API_KEY) return null;
      return createOpenAICompatibleAdapter({
        provider: "perplexity",
        url: "https://api.perplexity.ai/chat/completions",
        apiKey: env.PERPLEXITY_API_KEY,
        model: "sonar",
      });
    case "claude":
      if (!env.ANTHROPIC_API_KEY) return null;
      return createAnthropicAdapter(env.ANTHROPIC_API_KEY);
    case "gemini":
      if (!env.GOOGLE_GEMINI_API_KEY) return null;
      return createGeminiAdapter(env.GOOGLE_GEMINI_API_KEY);
    case "grok":
      if (!env.XAI_API_KEY) return null;
      return createOpenAICompatibleAdapter({
        provider: "grok",
        url: "https://api.x.ai/v1/chat/completions",
        apiKey: env.XAI_API_KEY,
        model: "grok-2-latest",
      });
  }
}

export function getAdapter(provider: LlmProvider): LlmAdapter {
  if (env.LLM_USE_REAL_ADAPTERS) {
    const real = realAdapter(provider);
    if (real) return real;
  }
  return createMockAdapter(provider);
}

export function getAllAdapters(): LlmAdapter[] {
  return LLM_PROVIDERS.map(getAdapter);
}

export type { LlmAdapter, LlmQuery, LlmResponse } from "./types.js";
