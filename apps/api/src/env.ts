import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:4321"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  LLM_USE_REAL_ADAPTERS: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .default(false)
    .transform((v) => v === true || v === "true"),

  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),

  GOOGLE_MAPS_API_KEY: z.string().optional(),
  MAPBOX_API_KEY: z.string().optional(),

  SESSION_SECRET: z.string().min(16).default("dev-only-not-secure-replace-me-please"),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_OAUTH_CLIENT_ID: z.string().optional(),
  LINKEDIN_OAUTH_CLIENT_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  PULSE_FROM_EMAIL: z.string().email().default("pulse@geotracker.iozera.com"),

  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment");
}

export const env = parsed.data;
