import { describe, expect, it } from "vitest";
import { aggregateScore, bandFor } from "./score.js";

describe("bandFor — BRD §5.2 truth table", () => {
  it("Green: top-3, has contact, no caveat", () => {
    expect(
      bandFor({ llmAvailable: true, mentioned: true, rank: 2, hasContactInfo: true, caveatFlag: false }),
    ).toBe("green");
  });

  it("Yellow: outside top-3", () => {
    expect(
      bandFor({ llmAvailable: true, mentioned: true, rank: 5, hasContactInfo: true, caveatFlag: false }),
    ).toBe("yellow");
  });

  it("Yellow: top-3 but no contact info (downgrade)", () => {
    expect(
      bandFor({ llmAvailable: true, mentioned: true, rank: 1, hasContactInfo: false, caveatFlag: false }),
    ).toBe("yellow");
  });

  it("Yellow: top-3 but caveat present", () => {
    expect(
      bandFor({ llmAvailable: true, mentioned: true, rank: 1, hasContactInfo: true, caveatFlag: true }),
    ).toBe("yellow");
  });

  it("Red: not mentioned", () => {
    expect(
      bandFor({ llmAvailable: true, mentioned: false, rank: null, hasContactInfo: false, caveatFlag: false }),
    ).toBe("red");
  });

  it("Unavailable: LLM endpoint down", () => {
    expect(
      bandFor({ llmAvailable: false, mentioned: false, rank: null, hasContactInfo: false, caveatFlag: false }),
    ).toBe("unavailable");
  });

  it("Yellow: mentioned without a detectable rank", () => {
    expect(
      bandFor({ llmAvailable: true, mentioned: true, rank: null, hasContactInfo: true, caveatFlag: false }),
    ).toBe("yellow");
  });
});

describe("aggregateScore", () => {
  it("all greens => 100", () => {
    expect(aggregateScore(["green", "green", "green"])).toBe(100);
  });

  it("all reds => 0", () => {
    expect(aggregateScore(["red", "red", "red"])).toBe(0);
  });

  it("mixed yellow/green => ~75", () => {
    expect(aggregateScore(["green", "green", "yellow", "yellow"])).toBe(75);
  });

  it("ignores unavailable cells", () => {
    expect(aggregateScore(["green", "unavailable", "unavailable"])).toBe(100);
  });

  it("returns 0 when every cell is unavailable", () => {
    expect(aggregateScore(["unavailable", "unavailable"])).toBe(0);
  });
});
