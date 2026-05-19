import { describe, expect, it } from "vitest";
import { inferIndustrySlug } from "./inferIndustry.js";

describe("inferIndustrySlug", () => {
  it("matches dental keywords on word boundaries", () => {
    expect(inferIndustrySlug("brightsmiles-dental.com")).toBe("dentists");
    expect(inferIndustrySlug("austin orthodontists clinic")).toBe("dentists");
  });

  it("does NOT match 'law' inside 'lawnservice'", () => {
    expect(inferIndustrySlug("lawnservice.com")).not.toBe("law-firms");
  });

  it("does match 'law' as a standalone token", () => {
    expect(inferIndustrySlug("smith-law.com")).toBe("law-firms");
    expect(inferIndustrySlug("personal injury attorney")).toBe("law-firms");
  });

  it("falls back to 'dentists' for ambiguous input", () => {
    expect(inferIndustrySlug("randomdomain.com")).toBe("dentists");
  });

  it("matches HVAC / plumbing terms at word boundaries", () => {
    expect(inferIndustrySlug("ace-hvac.com")).toBe("hvac");
    expect(inferIndustrySlug("citywide-plumbing.com")).toBe("hvac");
    // Substring with no boundary should NOT match — that's the whole point.
    expect(inferIndustrySlug("acehvaccontractors.com")).not.toBe("hvac");
  });

  it("matches veterinary as 'vet' or 'veterinary'", () => {
    expect(inferIndustrySlug("happy-paws-vet.com")).toBe("veterinarians");
    expect(inferIndustrySlug("acme veterinary hospital")).toBe("veterinarians");
  });

  it("does NOT match 'vet' inside 'velvet' or 'veteran'", () => {
    // Word boundaries protect these:
    expect(inferIndustrySlug("velvetinteriors.com")).not.toBe("veterinarians");
    expect(inferIndustrySlug("veteranowned.com")).not.toBe("veterinarians");
  });
});
