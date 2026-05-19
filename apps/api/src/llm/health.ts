// Tracks recent success/failure per LLM provider so the admin dashboard can
// surface real signal. Writes are batched per audit (aggregated in
// memory, flushed once at the end) so we don't write 240 rows per audit.
// All writes are best-effort — a failure must not affect the audit pipeline.

import { sql } from "drizzle-orm";
import type { LlmProvider } from "@geotracker/shared";
import { db } from "../db/client.js";
import { apiHealth } from "../db/schema.js";

export interface HealthBatch {
  record(provider: LlmProvider, ok: boolean, detail?: string): void;
  flush(): Promise<void>;
}

interface ProviderTally {
  ok: number;
  errors: number;
  lastDetail?: string;
}

export function createHealthBatch(): HealthBatch {
  const tally = new Map<LlmProvider, ProviderTally>();

  return {
    record(provider, ok, detail) {
      const cur = tally.get(provider) ?? { ok: 0, errors: 0 };
      if (ok) cur.ok += 1;
      else {
        cur.errors += 1;
        cur.lastDetail = detail;
      }
      tally.set(provider, cur);
    },

    async flush() {
      const entries = [...tally.entries()];
      if (entries.length === 0) return;
      // Race-safe upsert: onConflictDoUpdate keys on the unique (llm) index.
      // Error counts accumulate; success bursts reset them.
      await Promise.allSettled(
        entries.map(([provider, t]) => {
          const status = t.errors === 0 ? "ok" : t.lastDetail ?? "error";
          const next = new Date();
          return db
            .insert(apiHealth)
            .values({ llm: provider, status, errorCount: t.errors, lastCheckAt: next })
            .onConflictDoUpdate({
              target: apiHealth.llm,
              set: {
                status,
                lastCheckAt: next,
                errorCount:
                  t.errors === 0
                    ? sql`0`
                    : sql`${apiHealth.errorCount} + ${t.errors}`,
              },
            });
        }),
      );
    },
  };
}
