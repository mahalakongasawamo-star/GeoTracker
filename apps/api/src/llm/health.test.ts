import { afterEach, describe, expect, it, vi } from "vitest";

// Mock the DB module before importing the health module so the batch
// uses a captured fake instead of trying to reach Postgres.
const dbInsertCalls: Array<{ values: unknown; set?: unknown }> = [];

vi.mock("../db/client.js", () => {
  return {
    db: {
      insert() {
        return {
          values(values: unknown) {
            return {
              onConflictDoUpdate(opts: { set: unknown }) {
                dbInsertCalls.push({ values, set: opts.set });
                return Promise.resolve();
              },
            };
          },
        };
      },
    },
  };
});

afterEach(() => {
  dbInsertCalls.length = 0;
});

describe("createHealthBatch", () => {
  it("aggregates per-provider tallies and writes one row per provider", async () => {
    const { createHealthBatch } = await import("./health.js");
    const batch = createHealthBatch();
    batch.record("chatgpt", true);
    batch.record("chatgpt", true);
    batch.record("chatgpt", false, "rate_limited");
    batch.record("claude", true);
    await batch.flush();

    // Two providers => two upserts.
    expect(dbInsertCalls.length).toBe(2);
    const chatgpt = dbInsertCalls.find(
      (c) => (c.values as { llm: string }).llm === "chatgpt",
    );
    expect(chatgpt).toBeDefined();
    expect((chatgpt!.values as { errorCount: number }).errorCount).toBe(1);
  });

  it("flush is a no-op when nothing was recorded", async () => {
    const { createHealthBatch } = await import("./health.js");
    const batch = createHealthBatch();
    await batch.flush();
    expect(dbInsertCalls.length).toBe(0);
  });

  it("records all errors as a single row per provider", async () => {
    const { createHealthBatch } = await import("./health.js");
    const batch = createHealthBatch();
    batch.record("gemini", false, "network");
    batch.record("gemini", false, "timeout");
    await batch.flush();
    expect(dbInsertCalls.length).toBe(1);
    const row = dbInsertCalls[0]!.values as { llm: string; errorCount: number; status: string };
    expect(row.llm).toBe("gemini");
    expect(row.errorCount).toBe(2);
    expect(row.status).toBe("timeout"); // last detail wins
  });
});
