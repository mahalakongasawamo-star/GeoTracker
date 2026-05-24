// Daily total-audit count cap. With real LLM adapters on, each audit can
// cost up to a couple of dollars; this is the second line of defense after
// the per-IP rate limit. The counter is atomic via Redis INCR and rolls
// over at UTC midnight.

import IORedis from "ioredis";
import { env } from "../env.js";

let client: IORedis | null = null;

function getClient(): IORedis {
  if (!client) client = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return client;
}

export function dailyCapKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `geotracker:audits:count:${y}-${m}-${d}`;
}

// 25 hours so the key reliably outlives its UTC day even if the last audit
// landed seconds before midnight.
const TTL_SECONDS = 25 * 60 * 60;

export interface DailyCapResult {
  allowed: boolean;
  current: number;
  cap: number;
}

// Atomically increment today's counter and decide whether the caller may
// proceed. If we go over the cap we decrement back so the counter reflects
// the true number of audits served (otherwise concurrent over-cap requests
// would drift the counter arbitrarily high).
export async function checkAndConsumeDailyAudit(cap: number): Promise<DailyCapResult> {
  const r = getClient();
  const key = dailyCapKey();
  const current = await r.incr(key);
  if (current === 1) {
    // First hit of the day — set the TTL once. Subsequent INCRs don't
    // refresh it, so the key reliably expires roughly TTL_SECONDS after
    // the first audit of the day.
    await r.expire(key, TTL_SECONDS);
  }
  if (current > cap) {
    await r.decr(key);
    return { allowed: false, current: cap, cap };
  }
  return { allowed: true, current, cap };
}

// Test-only teardown; production keeps the singleton for the life of the
// process.
export async function closeDailyCap(): Promise<void> {
  if (client) {
    const c = client;
    client = null;
    await c.quit().catch(() => {
      /* already closed */
    });
  }
}
