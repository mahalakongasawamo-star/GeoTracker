import { describe, expect, it } from "vitest";
import { createMockAdapter } from "./mock.js";

describe("Mock adapter source tagging", () => {
  it("defaults to source=mock", async () => {
    const r = await createMockAdapter("chatgpt").query({
      prompt: "x",
      domain: "brightsmiles.com",
      city: "Austin",
    });
    expect(r.source).toBe("mock");
  });

  it("tags rows as mock_fallback when constructed that way", async () => {
    const r = await createMockAdapter("perplexity", "mock_fallback").query({
      prompt: "x",
      domain: "brightsmiles.com",
      city: "Austin",
    });
    expect(r.source).toBe("mock_fallback");
  });

  it("propagates source onto failure responses too", async () => {
    // The "unavailable" bucket is ~5% of (provider, domain) inputs. Probe
    // up to 200 deterministic domains so we reliably exercise the failure
    // path; the test reports "no failure observed" rather than passing
    // vacuously if the distribution shifts in mock.ts.
    let foundFailure = false;
    for (let i = 0; i < 200; i++) {
      const r = await createMockAdapter("grok", "mock_fallback").query({
        prompt: "x",
        domain: `probe-${i}.example`,
        city: "Austin",
      });
      if (!r.ok) {
        expect(r.source).toBe("mock_fallback");
        foundFailure = true;
        break;
      }
    }
    expect(foundFailure).toBe(true);
  });
});
