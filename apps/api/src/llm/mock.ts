import type { LlmProvider } from "@geotracker/shared";
import type { LlmAdapter, LlmQuery, LlmResponse, LlmResponseSource } from "./types.js";

// Deterministic fixture adapter. Picks a behavior per (provider, domain)
// so the same domain always yields a reproducible reveal dashboard for
// demos. Covers all four BRD §5.2 outcomes: top-3, outside-top-3, no
// contact info (yellow downgrade), and not-mentioned.

type Behavior =
  | { kind: "top3"; rank: 1 | 2 | 3 }
  | { kind: "ranked-with-caveat"; rank: 4 | 5 | 6 }
  | { kind: "mentioned-no-contact" }
  | { kind: "absent" }
  | { kind: "unavailable" };

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}

function pickBehavior(provider: LlmProvider, domain: string): Behavior {
  const n = hash(`${provider}|${domain}`) % 100;
  if (n < 35) return { kind: "top3", rank: ((n % 3) + 1) as 1 | 2 | 3 };
  if (n < 55) return { kind: "ranked-with-caveat", rank: ((n % 3) + 4) as 4 | 5 | 6 };
  if (n < 70) return { kind: "mentioned-no-contact" };
  if (n < 95) return { kind: "absent" };
  return { kind: "unavailable" };
}

function competitor(seed: string, idx: number): string {
  const names = [
    "Bright Smiles Dental",
    "Hometown Family Practice",
    "Capital Care Group",
    "Premier Choice",
    "Regional Specialists",
    "Elm Street Co.",
    "Cornerstone Partners",
    "Lakeside Services",
  ];
  return names[(hash(seed) + idx) % names.length]!;
}

function renderListing(name: string, withContact: boolean): string {
  const phone = withContact ? "Phone: (555) 123-4567." : "";
  const site = withContact ? "Website available." : "";
  return `${name}. ${phone} ${site}`.trim();
}

function buildText(input: LlmQuery, behavior: Behavior): string {
  const name = input.businessName ?? input.domain;
  const lines: string[] = [`Here are recommendations near ${input.city}:`];
  switch (behavior.kind) {
    case "top3": {
      for (let i = 1; i <= 5; i++) {
        if (i === behavior.rank) lines.push(`${i}. ${renderListing(name, true)}`);
        else lines.push(`${i}. ${renderListing(competitor(input.domain, i), true)}`);
      }
      return lines.join("\n");
    }
    case "ranked-with-caveat": {
      for (let i = 1; i <= 6; i++) {
        if (i === behavior.rank) {
          lines.push(`${i}. ${name} — note: limited published hours and reviews are mixed.`);
        } else {
          lines.push(`${i}. ${renderListing(competitor(input.domain, i), true)}`);
        }
      }
      return lines.join("\n");
    }
    case "mentioned-no-contact": {
      for (let i = 1; i <= 4; i++) lines.push(`${i}. ${renderListing(competitor(input.domain, i), true)}`);
      lines.push(
        `${name} also operates in the area, but I could not find a direct phone or booking link.`,
      );
      return lines.join("\n");
    }
    case "absent": {
      for (let i = 1; i <= 5; i++) lines.push(`${i}. ${renderListing(competitor(input.domain, i), true)}`);
      return lines.join("\n");
    }
    case "unavailable":
      return "";
  }
}

// "mock" — global mock mode (flag off)
// "mock_fallback" — flag on but this provider has no API key
type MockSource = Extract<LlmResponseSource, "mock" | "mock_fallback">;

class MockAdapter implements LlmAdapter {
  constructor(public readonly provider: LlmProvider, public readonly source: MockSource) {}

  async query(input: LlmQuery): Promise<LlmResponse> {
    const behavior = pickBehavior(this.provider, input.domain);
    // Tiny synthetic latency so the progress bar feels real. Skipped under
    // NODE_ENV=test so test suites stay fast.
    const latencyMs = 150 + (hash(`${this.provider}|${input.city}`) % 800);
    if (process.env.NODE_ENV !== "test") {
      await new Promise((r) => setTimeout(r, latencyMs));
    }
    if (behavior.kind === "unavailable") {
      return {
        ok: false,
        provider: this.provider,
        source: this.source,
        reason: "timeout",
        message: "mock: simulated unavailability",
      };
    }
    return {
      ok: true,
      provider: this.provider,
      source: this.source,
      text: buildText(input, behavior),
      latencyMs,
    };
  }
}

export function createMockAdapter(provider: LlmProvider, source: MockSource = "mock"): LlmAdapter {
  return new MockAdapter(provider, source);
}
