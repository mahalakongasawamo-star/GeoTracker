// Integration test for the daily audit count cap. Hits real Redis so the
// atomic INCR semantics are exercised end-to-end, not mocked.

import IORedis from "ioredis";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { env } from "../env.js";
import {
  checkAndConsumeDailyAudit,
  closeDailyCap,
  dailyCapKey,
} from "./dailyCap.js";

const ENABLED = process.env.INTEGRATION === "1";

describe.skipIf(!ENABLED)("dailyCap", () => {
  const cleaner = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

  beforeEach(async () => {
    await cleaner.del(dailyCapKey());
  });

  afterAll(async () => {
    await cleaner.del(dailyCapKey());
    await cleaner.quit().catch(() => {});
    await closeDailyCap();
  });

  it("allows up to the cap and rejects beyond", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) {
      results.push(await checkAndConsumeDailyAudit(3));
    }
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.current)).toEqual([1, 2, 3, 3]);
  });

  it("over-cap requests do not drift the counter upward", async () => {
    for (let i = 0; i < 2; i++) await checkAndConsumeDailyAudit(2);
    // 5 over-cap attempts in a row
    for (let i = 0; i < 5; i++) await checkAndConsumeDailyAudit(2);
    // 6th attempt should still report current=2, not 7
    const r = await checkAndConsumeDailyAudit(2);
    expect(r.allowed).toBe(false);
    expect(r.current).toBe(2);
  });

  it("sets a TTL on first use so the counter rolls over", async () => {
    await checkAndConsumeDailyAudit(10);
    const ttl = await cleaner.ttl(dailyCapKey());
    // INCR sets TTL only on first hit; expect ~25h (90000s), allow drift.
    expect(ttl).toBeGreaterThan(60 * 60 * 24);
    expect(ttl).toBeLessThanOrEqual(25 * 60 * 60);
  });
});
