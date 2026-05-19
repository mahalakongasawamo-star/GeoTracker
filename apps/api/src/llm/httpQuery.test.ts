import { afterEach, describe, expect, it, vi } from "vitest";
import { httpQueryJson } from "./httpQuery.js";

afterEach(() => vi.restoreAllMocks());

describe("httpQueryJson", () => {
  it("returns parsed JSON on 2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ hello: "world" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const result = await httpQueryJson<{ hello: string }>({
      provider: "chatgpt",
      url: "https://example.test",
      init: { method: "POST" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.hello).toBe("world");
  });

  it("maps 408 to timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 408 })),
    );
    const result = await httpQueryJson<unknown>({
      provider: "claude",
      url: "https://example.test",
      init: { method: "POST" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timeout");
  });

  it("maps 403 to tos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 403 })),
    );
    const result = await httpQueryJson<unknown>({
      provider: "gemini",
      url: "https://example.test",
      init: { method: "POST" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("tos");
  });

  it("retries once on 429 and succeeds on the second attempt", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        if (calls === 1) {
          return new Response("", { status: 429, headers: { "retry-after": "1" } });
        }
        return new Response(JSON.stringify({ ok: 1 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const result = await httpQueryJson<{ ok: number }>({
      provider: "chatgpt",
      url: "https://example.test",
      init: { method: "POST" },
      timeoutMs: 4000,
    });
    expect(calls).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("does not retry when transient retry is disabled", async () => {
    const fetchSpy = vi.fn(async () => new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchSpy);
    const result = await httpQueryJson<unknown>({
      provider: "chatgpt",
      url: "https://example.test",
      init: { method: "POST" },
      retryTransient: false,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
  });

  it("aborts on its own timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async (_url: string, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      ),
    );
    const result = await httpQueryJson<unknown>({
      provider: "perplexity",
      url: "https://example.test",
      init: { method: "POST" },
      timeoutMs: 50,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("timeout");
  });
});
