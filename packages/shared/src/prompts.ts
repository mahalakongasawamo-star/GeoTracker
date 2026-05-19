// BRD §5.5 — prompt sets per industry. {city} is iterated across the
// catchment area defined by the radius lookup. The dental set is the
// fully-specified example from the BRD; the others are starter sets
// reusing the same buying-intent shape so the lookup is exercised
// end-to-end. Refine per-vertical with subject-matter input.

import type { IndustrySlug } from "./industries.js";

export interface PromptTemplate {
  /** Free text. Must contain {city} unless `national: true`. */
  text: string;
  national?: boolean;
}

const dental: PromptTemplate[] = [
  { text: "Who is the best-rated dentist in {city}?" },
  { text: "Which dentist near me in {city} takes my insurance?" },
  { text: "Who is the best dentist for emergency dental work in {city}?" },
  { text: "Can you recommend an affordable dentist in {city}?" },
  { text: "Who is the best dentist in {city} for cosmetic work (veneers, whitening)?" },
  { text: "Which dentist in {city} offers Invisalign?" },
  { text: "Which dentist in {city} does same-day emergency services?" },
  { text: "Which dentist in {city} offers implants?" },
];

const generic = (vertical: string): PromptTemplate[] => [
  { text: `Who is the best ${vertical} in {city}?` },
  { text: `Which ${vertical} in {city} has the best reviews?` },
  { text: `Can you recommend a top-rated ${vertical} in {city}?` },
  { text: `Which ${vertical} in {city} offers same-day service?` },
];

export const PROMPT_SETS: Partial<Record<IndustrySlug, PromptTemplate[]>> = {
  dentists: dental,
  hvac: generic("HVAC or plumbing company"),
  "law-firms": generic("personal-injury or family-law attorney"),
  "real-estate": generic("real estate agent"),
  veterinarians: generic("veterinary clinic"),
  accountants: generic("CPA or tax accountant"),
  optometrists: generic("optometrist"),
  roofing: generic("roofing contractor"),
  "interior-designers": generic("interior designer"),
  "high-end-restaurants": generic("upscale restaurant"),
  daycares: generic("daycare or preschool"),
  landscaping: generic("landscaping company"),
  "pest-control": generic("pest control company"),
  locksmiths: generic("emergency locksmith"),
};

const FALLBACK: PromptTemplate[] = [
  { text: "Who is the best provider for this industry near {city}?" },
  { text: "Can you recommend a trusted business in this industry in {city}?" },
  { text: "Who has the best reviews in this industry in {city}?" },
];

const NATIONAL: PromptTemplate[] = [
  { text: "What's the best company in this category?", national: true },
  { text: "Which brand has the best reviews in this category?", national: true },
  { text: "What's the most-recommended option for this product/service?", national: true },
];

export function getPromptSet(slug: IndustrySlug | string): PromptTemplate[] {
  if (slug === "ecommerce-saas") return NATIONAL;
  const set = (PROMPT_SETS as Record<string, PromptTemplate[] | undefined>)[slug];
  return set ?? FALLBACK;
}
