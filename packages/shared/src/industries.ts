// BRD §5.4 Business-Type Radius Lookup Table.
// Single source of truth for industry catchment radius (in miles).
// "national" => fallback to a configurable national/global radius.

export type IndustrySlug =
  | "dentists"
  | "hvac"
  | "law-firms"
  | "real-estate"
  | "veterinarians"
  | "gyms-wellness"
  | "accountants"
  | "optometrists"
  | "auto-detailers"
  | "roofing"
  | "fertility-specialty-medical"
  | "interior-designers"
  | "boutique-hotels"
  | "wedding-venues"
  | "high-end-restaurants"
  | "daycares"
  | "landscaping"
  | "pest-control"
  | "locksmiths"
  | "ecommerce-saas";

export interface IndustryDef {
  slug: IndustrySlug;
  displayName: string;
  /** Miles. `null` => national/global, use NATIONAL_FALLBACK_RADIUS_MILES. */
  defaultRadiusMiles: number | null;
}

export const NATIONAL_FALLBACK_RADIUS_MILES = 500;

export const INDUSTRIES: ReadonlyArray<IndustryDef> = [
  { slug: "dentists", displayName: "Dentists, orthodontists, plastic surgeons", defaultRadiusMiles: 50 },
  { slug: "hvac", displayName: "HVAC, plumbing, electricians", defaultRadiusMiles: 30 },
  { slug: "law-firms", displayName: "Law firms (personal injury, family law)", defaultRadiusMiles: 60 },
  { slug: "real-estate", displayName: "Real estate agencies", defaultRadiusMiles: 20 },
  { slug: "veterinarians", displayName: "Veterinarians, specialty pet care", defaultRadiusMiles: 30 },
  { slug: "gyms-wellness", displayName: "High-end gyms, wellness clinics", defaultRadiusMiles: 20 },
  { slug: "accountants", displayName: "Accountants, tax specialists", defaultRadiusMiles: 40 },
  { slug: "optometrists", displayName: "Optometrists", defaultRadiusMiles: 25 },
  { slug: "auto-detailers", displayName: "Auto detailers, custom shops", defaultRadiusMiles: 50 },
  { slug: "roofing", displayName: "Roofing, siding contractors", defaultRadiusMiles: 60 },
  { slug: "fertility-specialty-medical", displayName: "Fertility clinics, specialty medical", defaultRadiusMiles: 100 },
  { slug: "interior-designers", displayName: "Interior designers", defaultRadiusMiles: 40 },
  { slug: "boutique-hotels", displayName: "Boutique hotels, B&Bs", defaultRadiusMiles: 150 },
  { slug: "wedding-venues", displayName: "Wedding venues", defaultRadiusMiles: 100 },
  { slug: "high-end-restaurants", displayName: "High-end restaurants", defaultRadiusMiles: 30 },
  { slug: "daycares", displayName: "Daycares, preschools", defaultRadiusMiles: 10 },
  { slug: "landscaping", displayName: "Landscaping, hardscaping", defaultRadiusMiles: 30 },
  { slug: "pest-control", displayName: "Pest control", defaultRadiusMiles: 40 },
  { slug: "locksmiths", displayName: "Locksmiths", defaultRadiusMiles: 15 },
  { slug: "ecommerce-saas", displayName: "E-commerce, SaaS", defaultRadiusMiles: null },
];

const BY_SLUG = new Map<string, IndustryDef>(
  INDUSTRIES.map((i) => [i.slug, i]),
);

export function getIndustry(slug: string): IndustryDef | undefined {
  return BY_SLUG.get(slug);
}

export function resolveRadiusMiles(slug: string): number {
  const def = BY_SLUG.get(slug);
  if (!def || def.defaultRadiusMiles == null) return NATIONAL_FALLBACK_RADIUS_MILES;
  return def.defaultRadiusMiles;
}
