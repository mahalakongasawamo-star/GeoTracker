import { describe, expect, it } from "vitest";
import { extractMentions } from "./extractMentions.js";

describe("extractMentions", () => {
  it("detects a top-3 mention by domain and reads the rank", () => {
    const text = [
      "Here are recommendations near Austin:",
      "1. Capital Care Group. Phone: (555) 123-4567. Website available.",
      "2. Bright Smiles Dental at brightsmiles.com. Phone: (555) 222-3333.",
      "3. Hometown Family Practice. Phone: (555) 444-5555.",
    ].join("\n");

    const result = extractMentions({ text, domain: "brightsmiles.com" });
    expect(result.mentioned).toBe(true);
    expect(result.rank).toBe(2);
    expect(result.hasContactInfo).toBe(true);
    expect(result.caveatFlag).toBe(false);
  });

  it("flags a caveat in the mention's line", () => {
    const text = "5. Bright Smiles Dental — note: limited published hours and reviews are mixed.";
    const result = extractMentions({ text, domain: "brightsmiles.com" });
    expect(result.mentioned).toBe(true);
    expect(result.rank).toBe(5);
    expect(result.caveatFlag).toBe(true);
  });

  it("returns mentioned=false when neither the domain nor the name appears", () => {
    const text = "1. Some Other Dental. (555) 111-2222.\n2. Another One. (555) 333-4444.";
    const result = extractMentions({ text, domain: "brightsmiles.com", businessName: "Bright Smiles Dental" });
    expect(result.mentioned).toBe(false);
    expect(result.rank).toBeNull();
  });

  it("requires 2+ distinctive tokens for generic names (BRD §7.3)", () => {
    // "City Dental" is generic — a single-token hit on "dental" should NOT
    // be a positive match.
    const text = "1. Dental services are available nearby.";
    const result = extractMentions({ text, domain: "unrelated.com", businessName: "City Dental" });
    expect(result.mentioned).toBe(false);
  });

  it("matches a generic name when two of its tokens co-occur", () => {
    const text = "Visit City Dental for routine cleanings. Phone: (555) 999-1111.";
    const result = extractMentions({ text, domain: "unrelated.com", businessName: "City Dental Group" });
    expect(result.mentioned).toBe(true);
    expect(result.hasContactInfo).toBe(true);
  });

  it("detects missing contact info as a Yellow trigger", () => {
    const text = "Bright Smiles Dental also operates in the area, but I could not find a direct phone or booking link.";
    const result = extractMentions({ text, domain: "brightsmiles.com" });
    expect(result.mentioned).toBe(true);
    expect(result.hasContactInfo).toBe(false);
    expect(result.caveatFlag).toBe(true);
  });

  it("handles an empty response", () => {
    const result = extractMentions({ text: "", domain: "brightsmiles.com" });
    expect(result.mentioned).toBe(false);
    expect(result.rank).toBeNull();
  });
});
