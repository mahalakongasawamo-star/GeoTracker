export const LLM_PROVIDERS = [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "grok",
] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const LLM_DISPLAY: Record<LlmProvider, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
};

export const SCORE_BANDS = ["green", "yellow", "red", "unavailable"] as const;
export type ScoreBand = (typeof SCORE_BANDS)[number];

export const AUDIT_STATUSES = [
  "queued",
  "running",
  "complete",
  "partial",
  "failed",
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const USER_TIERS = ["free", "premium", "ultra"] as const;
export type UserTier = (typeof USER_TIERS)[number];
