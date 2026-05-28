import "dotenv/config";
import { z } from "zod";
import { LLM_PROVIDERS, type LlmProvider } from "@geotracker/shared";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  // Comma-separated allowlist of web origins. The first entry is the
  // canonical web origin (used wherever we need a single URL, e.g. the
  // OAuth redirect_uri). Extra entries are accepted by CORS and
  // originGuard so dev / preview frontends can talk to a single deployed
  // API. Trailing slashes and surrounding whitespace are stripped.
  WEB_ORIGIN: z
    .string()
    .default("http://localhost:4321")
    .transform((s) => {
      const list = s
        .split(",")
        .map((o) => o.trim().replace(/\/+$/, ""))
        .filter(Boolean);
      if (list.length === 0) throw new Error("WEB_ORIGIN must list at least one origin");
      for (const o of list) {
        try {
          new URL(o);
        } catch {
          throw new Error(`WEB_ORIGIN entry is not a valid URL: ${o}`);
        }
      }
      return list;
    }),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  LLM_USE_REAL_ADAPTERS: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .default(false)
    .transform((v) => v === true || v === "true"),

  // Second cost-containment layer on top of the per-IP rate limit. Default
  // 100 audits/day; bump via Railway env when token-budget telemetry
  // justifies it.
  DAILY_AUDIT_CAP: z.coerce.number().int().positive().default(100),

  // Minimum ms between successive call starts per provider. Tuned for current
  // free-tier RPM caps (Gemini 2.5 Flash ~13 RPM, Anthropic ~5.5 RPM). Flip
  // to "{}" once keys are on paid tier. Only applied when
  // LLM_USE_REAL_ADAPTERS=true, so test/mock runs stay fast.
  PROVIDER_PACE_MS: z
    .string()
    .default('{"gemini":4500,"claude":11000}')
    .transform((s) => JSON.parse(s) as Partial<Record<LlmProvider, number>>),

  // Operator-controlled allowlist of providers the audit orchestrator
  // should call. Empty/unset → all five providers (default behavior).
  // Set to "claude" on Railway while only one paid key is funded, so
  // OpenAI/Gemini/Perplexity/Grok don't fan out failed or mock_fallback
  // cells into every audit. Reversible without a deploy.
  LLM_ENABLED_PROVIDERS: z
    .string()
    .default("")
    .transform((s): LlmProvider[] => {
      const list = s
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
      if (list.length === 0) return [...LLM_PROVIDERS];
      const valid = new Set<string>(LLM_PROVIDERS);
      for (const p of list) {
        if (!valid.has(p))
          throw new Error(
            `Invalid LLM_ENABLED_PROVIDERS entry: "${p}". Allowed: ${LLM_PROVIDERS.join(", ")}`,
          );
      }
      return list as LlmProvider[];
    }),

  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),

  GOOGLE_MAPS_API_KEY: z.string().optional(),

  SESSION_SECRET: z.string().min(16).default("dev-only-not-secure-replace-me-please"),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_OAUTH_CLIENT_ID: z.string().optional(),
  LINKEDIN_OAUTH_CLIENT_SECRET: z.string().optional(),
  API_ORIGIN: z.string().url().default("http://localhost:4000"),
  ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),

  RESEND_API_KEY: z.string().optional(),
  PULSE_FROM_EMAIL: z.string().email().default("pulse@geotracker.iozera.com"),

  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment");
}

export const env = parsed.data;
