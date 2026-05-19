import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnthropicAdapter } from "./anthropic.js";

afterEach(() => vi.restoreAllMocks());

describe("Anthropic adapter", () => {
  it("concatenates multi-block text responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            content: [
              { type: "text", text: "First block." },
              { type: "tool_use", input: { ignored: true } },
              { type: "text", text: "Second block." },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const adapter = createAnthropicAdapter("sk-ant-test");
    const result = await adapter.query({ prompt: "x", domain: "x.com", city: "Austin" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain("First block.");
      expect(result.text).toContain("Second block.");
    }
  });

  it("sends the x-api-key and anthropic-version headers", async () => {
    const fetchSpy: ReturnType<typeof vi.fn> = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(
          JSON.stringify({ content: [{ type: "text", text: "ok" }] }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchSpy);
    await createAnthropicAdapter("sk-ant-test").query({
      prompt: "x",
      domain: "x.com",
      city: "Austin",
    });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init).toBeDefined();
    const headers = init!.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
  });

  it("returns failure on empty content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ content: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const result = await createAnthropicAdapter("sk").query({
      prompt: "x",
      domain: "x.com",
      city: "Austin",
    });
    expect(result.ok).toBe(false);
  });
});
