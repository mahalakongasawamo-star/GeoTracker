import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userTierEnum = pgEnum("user_tier", ["free", "premium", "ultra"]);
export const oauthProviderEnum = pgEnum("oauth_provider", ["google", "linkedin"]);
export const auditStatusEnum = pgEnum("audit_status", [
  "queued",
  "running",
  "complete",
  "partial",
  "failed",
]);
export const llmEnum = pgEnum("llm_provider", [
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "grok",
]);
export const scoreBandEnum = pgEnum("score_band", [
  "green",
  "yellow",
  "red",
  "unavailable",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  name: text("name"),
  oauthProvider: oauthProviderEnum("oauth_provider"),
  oauthSub: text("oauth_sub"),
  tier: userTierEnum("tier").notNull().default("free"),
  pulseOptIn: boolean("pulse_opt_in").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex("users_email_idx").on(t.email),
  oauthIdx: uniqueIndex("users_oauth_idx").on(t.oauthProvider, t.oauthSub),
}));

export const industries = pgTable("industries", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  displayName: text("display_name").notNull(),
  /** null => national (use NATIONAL_FALLBACK_RADIUS_MILES). */
  defaultRadiusMiles: integer("default_radius_miles"),
}, (t) => ({
  slugIdx: uniqueIndex("industries_slug_idx").on(t.slug),
}));

export const promptSets = pgTable("prompt_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  industryId: uuid("industry_id").notNull().references(() => industries.id, { onDelete: "cascade" }),
  /** jsonb array of { text, national? } */
  prompts: jsonb("prompts").notNull(),
}, (t) => ({
  industryIdx: uniqueIndex("prompt_sets_industry_idx").on(t.industryId),
}));

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(),
  name: text("name"),
  address: text("address"),
  seedCity: text("seed_city"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  industryId: uuid("industry_id").references(() => industries.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  domainIdx: index("businesses_domain_idx").on(t.domain),
  // Partial unique index: one business row per (user, domain) for
  // logged-in users; anonymous audits remain free to duplicate.
  userDomainIdx: uniqueIndex("businesses_user_domain_idx")
    .on(t.userId, t.domain)
    .where(sql`${t.userId} is not null`),
}));

export const audits = pgTable("audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  status: auditStatusEnum("status").notNull().default("queued"),
  /** 0..100 visibility gauge. */
  score: integer("score").notNull().default(0),
  catchmentCities: jsonb("catchment_cities").notNull().default([]),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => ({
  businessIdx: index("audits_business_idx").on(t.businessId),
  statusIdx: index("audits_status_idx").on(t.status),
}));

export const auditResults = pgTable("audit_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  auditId: uuid("audit_id").notNull().references(() => audits.id, { onDelete: "cascade" }),
  llm: llmEnum("llm").notNull(),
  promptText: text("prompt_text").notNull(),
  city: text("city").notNull(),
  responseRaw: text("response_raw"),
  mentioned: boolean("mentioned").notNull().default(false),
  rank: integer("rank"),
  hasContactInfo: boolean("has_contact_info").notNull().default(false),
  caveatFlag: boolean("caveat_flag").notNull().default(false),
  scoreBand: scoreBandEnum("score_band").notNull().default("unavailable"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  auditIdx: index("audit_results_audit_idx").on(t.auditId),
}));

export const pulseSubscriptions = pgTable("pulse_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  frequency: text("frequency").notNull().default("monthly"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
  lastAuditId: uuid("last_audit_id").references(() => audits.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userBusinessIdx: uniqueIndex("pulse_user_business_idx").on(t.userId, t.businessId),
  nextRunIdx: index("pulse_next_run_idx").on(t.nextRunAt),
}));

export const apiHealth = pgTable("api_health", {
  id: uuid("id").primaryKey().defaultRandom(),
  llm: llmEnum("llm").notNull(),
  status: text("status").notNull(),
  lastCheckAt: timestamp("last_check_at", { withTimezone: true }).notNull().defaultNow(),
  errorCount: integer("error_count").notNull().default(0),
}, (t) => ({
  llmIdx: uniqueIndex("api_health_llm_idx").on(t.llm),
}));
