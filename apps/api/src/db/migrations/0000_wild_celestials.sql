CREATE TYPE "public"."audit_status" AS ENUM('queued', 'running', 'complete', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."llm_provider" AS ENUM('chatgpt', 'perplexity', 'claude', 'gemini', 'grok');--> statement-breakpoint
CREATE TYPE "public"."oauth_provider" AS ENUM('google', 'linkedin');--> statement-breakpoint
CREATE TYPE "public"."score_band" AS ENUM('green', 'yellow', 'red', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."user_tier" AS ENUM('free', 'premium', 'ultra');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"llm" "llm_provider" NOT NULL,
	"status" text NOT NULL,
	"last_check_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"llm" "llm_provider" NOT NULL,
	"prompt_text" text NOT NULL,
	"city" text NOT NULL,
	"response_raw" text,
	"mentioned" boolean DEFAULT false NOT NULL,
	"rank" integer,
	"has_contact_info" boolean DEFAULT false NOT NULL,
	"caveat_flag" boolean DEFAULT false NOT NULL,
	"score_band" "score_band" DEFAULT 'unavailable' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"status" "audit_status" DEFAULT 'queued' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"catchment_cities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"domain" text NOT NULL,
	"name" text,
	"address" text,
	"seed_city" text,
	"lat" double precision,
	"lng" double precision,
	"industry_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"default_radius_miles" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prompt_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"industry_id" uuid NOT NULL,
	"prompts" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pulse_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_audit_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"oauth_provider" "oauth_provider",
	"oauth_sub" text,
	"tier" "user_tier" DEFAULT 'free' NOT NULL,
	"pulse_opt_in" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_results" ADD CONSTRAINT "audit_results_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audits" ADD CONSTRAINT "audits_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "businesses" ADD CONSTRAINT "businesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "businesses" ADD CONSTRAINT "businesses_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prompt_sets" ADD CONSTRAINT "prompt_sets_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_subscriptions" ADD CONSTRAINT "pulse_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_subscriptions" ADD CONSTRAINT "pulse_subscriptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pulse_subscriptions" ADD CONSTRAINT "pulse_subscriptions_last_audit_id_audits_id_fk" FOREIGN KEY ("last_audit_id") REFERENCES "public"."audits"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_health_llm_idx" ON "api_health" USING btree ("llm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_results_audit_idx" ON "audit_results" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audits_business_idx" ON "audits" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audits_status_idx" ON "audits" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "businesses_domain_idx" ON "businesses" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "industries_slug_idx" ON "industries" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prompt_sets_industry_idx" ON "prompt_sets" USING btree ("industry_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pulse_user_business_idx" ON "pulse_subscriptions" USING btree ("user_id","business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pulse_next_run_idx" ON "pulse_subscriptions" USING btree ("next_run_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_oauth_idx" ON "users" USING btree ("oauth_provider","oauth_sub");