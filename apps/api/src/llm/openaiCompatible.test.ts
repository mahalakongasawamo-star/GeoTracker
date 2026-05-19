import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenAICompatibleAdapter } from "./openaiCompatible.js";

afterEach(() => vi.restoreAllMocks());

function mockJsonOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

describe("OpenAI-compatible adapter", () => {
  const baseCfg = {
    provider: "chatgpt" as const,
    url: "https://example.test/chat/completions",
    apiKey: "sk-test",
    model: "gpt-4o-mini",
  };

  it("parses a successful chat completion", async () => {
    mockJsonOnce({
      choices: [{ message: { content: "1. Bright Smiles Dental. Phone: (555) 123-4567." } }],
    });
    const adapter = createOpenAICompatibleAdapter(baseCfg);
    const result = await adapter.query({
      prompt: "Who is the best dentist in Austin?",
      domain: "brightsmiles.com",
      city: "Austin",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain("Bright Smiles Dental");
      expect(result.provider).toBe("chatgpt");
    }
  });

  it("maps 429 to rate_limited", async () => {
    mockJsonOnce({}, { status: 429 });
    const adapter = createOpenAICompatibleAdapter(baseCfg);
    const result = await adapter.query({ prompt: "x", domain: "x.com", city: "Austin" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rate_limited");
  });

  it("maps 5xx to network", async () => {
    mockJsonOnce({}, { status: 503 });
    const adapter = createOpenAICompatibleAdapter(baseCfg);
    const result = await adapter.query({ prompt: "x", domain: "x.com", city: "Austin" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("network");
  });

  it("captures token usage when the provider reports it", async () => {
    mockJsonOnce({
      choices: [{ message: { content: "1. Bright Smiles Dental." } }],
      usage: { prompt_tokens: 42, completion_tokens: 17 },
    });
    const adapter = createOpenAICompatibleAdapter(baseCfg);
    const result = await adapter.query({ prompt: "x", domain: "x.com", city: "Austin" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.usage?.inputTokens).toBe(42);
      expect(result.usage?.outputTokens).toBe(17);
    }
  });

  it("treats an empty completion as failure", async () => {
    mockJsonOnce({ choices: [{ message: { content: "   " } }] });
    const adapter = createOpenAICompatibleAdapter(baseCfg);
    const result = await adapter.query({ prompt: "x", domain: "x.com", city: "Austin" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unknown");
  });

  it("sends the bearer auth header and JSON body", async () => {
    const fetchSpy: ReturnType<typeof vi.fn> = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const adapter = createOpenAICompatibleAdapter(baseCfg);
    await adapter.query({ prompt: "prompt", domain: "x.com", city: "Austin" });

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init).toBeDefined();
    expect(init!.method).toBe("POST");
    const headers = init!.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sk-test");
    expect(headers["content-type"]).toBe("application/json");
    const body = JSON.parse(init!.body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages[1].content).toBe("prompt");
  });
});
