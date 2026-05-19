import { describe, expect, it } from "vitest";
import { expandCatchment } from "./catchment.js";

describe("expandCatchment (fixture mode, no GOOGLE_MAPS_API_KEY)", () => {
  it("returns the seed city first", async () => {
    const r = await expandCatchment({ industrySlug: "dentists", seedCity: "Austin" });
    expect(r.cities[0]).toBe("Austin");
    expect(r.source).toBe("fixture");
  });

  it("includes known suburbs for a seeded city", async () => {
    const r = await expandCatchment({ industrySlug: "dentists", seedCity: "Houston" });
    expect(r.cities).toContain("Sugar Land");
    expect(r.cities).toContain("Pearland");
  });

  it("caps the result to 6 cities", async () => {
    const r = await expandCatchment({ industrySlug: "dentists", seedCity: "Dallas" });
    expect(r.cities.length).toBeLessThanOrEqual(6);
  });

  it("uses the industry-specific radius", async () => {
    const dentist = await expandCatchment({ industrySlug: "dentists", seedCity: "Austin" });
    const daycare = await expandCatchment({ industrySlug: "daycares", seedCity: "Austin" });
    expect(dentist.radiusMiles).toBe(50);
    expect(daycare.radiusMiles).toBe(10);
  });

  it("falls back to a national radius for ecommerce/saas", async () => {
    const r = await expandCatchment({ industrySlug: "ecommerce-saas", seedCity: "Austin" });
    expect(r.radiusMiles).toBeGreaterThan(100);
  });

  it("returns the seed alone when no suburbs are known", async () => {
    const r = await expandCatchment({ industrySlug: "dentists", seedCity: "Nowhereville" });
    expect(r.cities).toEqual(["Nowhereville"]);
  });
});
