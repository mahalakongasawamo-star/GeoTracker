import { afterEach, describe, expect, it, vi } from "vitest";
import { createGeminiAdapter } from "./gemini.js";

afterEach(() => vi.restoreAllMocks());

describe("Gemini adapter", () => {
  it("concatenates parts from candidates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "Part 1." }, { text: "Part 2." }] } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const result = await createGeminiAdapter("gkey").query({
      prompt: "x",
      domain: "x.com",
      city: "Austin",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toBe("Part 1.\nPart 2.");
  });

  it("encodes the api key on the URL", async () => {
    const fetchSpy: ReturnType<typeof vi.fn> = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    await createGeminiAdapter("g key").query({ prompt: "x", domain: "x.com", city: "Austin" });
    const url = fetchSpy.mock.calls[0]?.[0] as string | undefined;
    expect(url).toBeDefined();
    expect(url!).toContain("key=g%20key");
  });
});
