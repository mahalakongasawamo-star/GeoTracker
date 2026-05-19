// Lightweight industry detection used only as a fallback when the caller
// did not provide an explicit slug. Word-boundary aware so substrings
// don't false-positive ("lawnservice" must NOT match "law-firms").

const INDUSTRY_HINTS: Array<{ slug: string; pattern: RegExp }> = [
  { slug: "dentists", pattern: /\b(dental|dentist|dentists|ortho|orthodont|smile|smiles)\b/i },
  { slug: "hvac", pattern: /\b(hvac|plumb(ing|er)?|electric(ian|al)?)\b/i },
  { slug: "law-firms", pattern: /\b(law(yer|firm)?|legal|attorney|attorneys)\b/i },
  { slug: "veterinarians", pattern: /\b(vet|vets|veterinary|veterinarian)\b/i },
  { slug: "real-estate", pattern: /\b(realty|realtor|realestate)\b/i },
  { slug: "roofing", pattern: /\b(roof(ing|er|ers)?)\b/i },
  { slug: "pest-control", pattern: /\b(pest)\b/i },
  { slug: "optometrists", pattern: /\b(optom(etry|etrist))\b/i },
  { slug: "high-end-restaurants", pattern: /\b(restaurant|bistro|trattoria|kitchen)\b/i },
];

export function inferIndustrySlug(haystack: string): string {
  for (const { slug, pattern } of INDUSTRY_HINTS) {
    if (pattern.test(haystack)) return slug;
  }
  return "dentists";
}
