import { describe, expect, it } from "vitest";
import { extractCompetitors } from "./extractCompetitors.js";

describe("extractCompetitors", () => {
  it("extracts competing dental practices from a recommendation list", () => {
    const text = [
      "Top dentists in Houston, TX:",
      "1. Aspen Dental — multiple locations.",
      "2. Pacific Dental Services has a clinic downtown.",
      "3. Bright Now Dental offers same-day appointments.",
      "4. Western Dental, with several offices in the area.",
    ].join("\n");
    const result = extractCompetitors({
      text,
      targetDomain: "iozera.ai",
      targetName: "iozera",
      industrySlug: "dentists",
    });
    expect(result).toEqual(
      expect.arrayContaining(["Aspen Dental", "Pacific Dental", "Bright Now Dental", "Western Dental"]),
    );
  });

  it("excludes the target business by domain root", () => {
    const text = "We recommend Aspen Dental and Bright Smiles Dental near downtown.";
    const result = extractCompetitors({
      text,
      targetDomain: "brightsmiles.com",
      industrySlug: "dentists",
    });
    expect(result).toContain("Aspen Dental");
    expect(result).not.toContain("Bright Smiles Dental");
  });

  it("strips trailing corporate suffixes", () => {
    const text = "Pacific Dental Group is a large chain.";
    const result = extractCompetitors({
      text,
      targetDomain: "unrelated.com",
      industrySlug: "dentists",
    });
    expect(result).toContain("Pacific Dental");
  });

  it("skips generic descriptor-only phrases", () => {
    const text = "We offer the best dental care and modern dentistry techniques.";
    const result = extractCompetitors({
      text,
      targetDomain: "unrelated.com",
      industrySlug: "dentists",
    });
    // "best dental" and "modern dentistry" are lowercase so won't match title-case,
    // but even capitalized "Best Dental" or "Modern Dentistry" should be skipped.
    const text2 = "Try Best Dental or Modern Dentistry today.";
    const result2 = extractCompetitors({
      text: text2,
      targetDomain: "unrelated.com",
      industrySlug: "dentists",
    });
    expect(result).toHaveLength(0);
    expect(result2).toHaveLength(0);
  });

  it("dedupes case-insensitively", () => {
    const text = "Aspen Dental is great. Many people choose ASPEN DENTAL for convenience.";
    const result = extractCompetitors({
      text,
      targetDomain: "unrelated.com",
      industrySlug: "dentists",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.toLowerCase()).toBe("aspen dental");
  });

  it("returns [] when industry has no anchor config", () => {
    const text = "We work with Acme Corp and Globex Industries.";
    const result = extractCompetitors({
      text,
      targetDomain: "anything.com",
      industrySlug: "unknown-vertical",
    });
    expect(result).toEqual([]);
  });

  it("returns [] when industrySlug is missing", () => {
    const result = extractCompetitors({
      text: "Aspen Dental is a chain.",
      targetDomain: "anything.com",
    });
    expect(result).toEqual([]);
  });

  it("handles empty text", () => {
    const result = extractCompetitors({
      text: "",
      targetDomain: "anything.com",
      industrySlug: "dentists",
    });
    expect(result).toEqual([]);
  });

  it("works for other verticals (realty)", () => {
    const text = "Top agents: Compass Realty and Coldwell Banker Properties are well-known.";
    const result = extractCompetitors({
      text,
      targetDomain: "unrelated.com",
      industrySlug: "real-estate",
    });
    expect(result).toEqual(expect.arrayContaining(["Compass Realty"]));
  });
});
