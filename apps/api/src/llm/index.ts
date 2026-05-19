import { LLM_PROVIDERS, type LlmProvider } from "@geotracker/shared";
import { env } from "../env.js";
import { createMockAdapter } from "./mock.js";
import type { LlmAdapter } from "./types.js";

// Real-provider adapters are stubs in v1. The orchestrator never selects them
// unless LLM_USE_REAL_ADAPTERS=true AND the matching API key is present
// (BRD §14 — token budget + TOS review must precede flipping the flag).
function realAdapter(provider: LlmProvider): LlmAdapter | null {
  const keyMap: Record<LlmProvider, string | undefined> = {
    chatgpt: env.OPENAI_API_KEY,
    perplexity: env.PERPLEXITY_API_KEY,
    claude: env.ANTHROPIC_API_KEY,
    gemini: env.GOOGLE_GEMINI_API_KEY,
    grok: env.XAI_API_KEY,
  };
  if (!keyMap[provider]) return null;
  // TODO(adapter): wire each provider's SDK once budget + TOS are approved.
  return null;
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
