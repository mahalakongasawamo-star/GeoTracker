// Heuristic NER for competitor businesses mentioned in an LLM response.
// Strategy: per-industry "anchor" keywords (e.g. "Dental", "Realty") flag a
// noun phrase as a likely business name; title-case neighbours form the rest
// of the name. Pragmatic and cheap — no LLM extraction pass.

export interface ExtractCompetitorsInput {
  text: string;
  /** The target business — excluded from results. */
  targetName?: string;
  /** Used to derive the target business token set for exclusion. */
  targetDomain: string;
  /** Drives the anchor keyword set. If unknown, returns []. */
  industrySlug?: string;
}

const ANCHORS: Record<string, readonly string[]> = {
  dentists: ["Dental", "Dentistry", "Orthodontics", "Orthodontist", "Dentist", "Smiles", "Smile"],
  hvac: ["HVAC", "Heating", "Cooling", "Plumbing", "Electric", "Electrical", "Air"],
  "law-firms": ["Law", "Attorneys", "Attorney", "Legal", "LLP"],
  "real-estate": ["Realty", "Realtors", "Properties", "Homes", "Estate"],
  veterinarians: ["Veterinary", "Animal", "Vet", "Pet"],
  "gyms-wellness": ["Gym", "Fitness", "Wellness", "CrossFit", "Yoga", "Pilates", "Spa"],
  accountants: ["CPA", "Accounting", "Accountants", "Tax"],
  optometrists: ["Optometry", "Vision", "Optical", "Eyecare", "EyeCare"],
  "auto-detailers": ["Detailing", "Detail", "Auto", "Autobody"],
  roofing: ["Roofing", "Siding", "Roofers"],
  "fertility-specialty-medical": ["Fertility", "IVF", "Reproductive"],
  "interior-designers": ["Interiors", "Design", "Designs"],
  "boutique-hotels": ["Hotel", "Inn", "Lodge"],
  "wedding-venues": ["Venue", "Venues", "Estate", "Manor"],
  "high-end-restaurants": ["Restaurant", "Kitchen", "Bistro", "Trattoria"],
  daycares: ["Daycare", "Preschool", "Academy", "Montessori"],
  landscaping: ["Landscaping", "Landscape", "Lawn", "Gardens"],
  "pest-control": ["Pest", "Exterminators", "Exterminator"],
  locksmiths: ["Locksmith", "Locksmiths", "Lock"],
};

// Generic tokens that disqualify a capture if found anywhere in the lead
// (i.e. before the vertical anchor). They're marketing copy, not proper-noun
// business identifiers, so phrases like "Try Best Dental" or "Visit Modern
// Dentistry" are dropped.
const GENERIC_TOKENS = new Set([
  "best", "top", "local", "modern", "affordable", "premium", "quality",
  "advanced", "comprehensive", "professional", "gentle", "expert",
  "trusted", "leading", "the", "your", "our", "my", "their", "a", "an",
  "try", "visit", "see", "check", "find", "search", "use", "consider",
  "great", "good", "popular",
]);

// Stripped from the tail of a captured name. "Group"/"Services"/"Practice"
// are common corporate descriptors that produce near-duplicates of the
// base name; strip them so "Pacific Dental Services" collapses to
// "Pacific Dental".
const CORPORATE_SUFFIXES = [
  "Inc", "LLC", "Ltd", "Co", "Corp", "PLLC", "PA", "P.C.", "PC",
  "Group", "Services", "Service", "Practice", "Practices", "Care",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(anchors: readonly string[]): RegExp {
  const anchor = anchors.map(escapeRegex).join("|");
  // Title-case word: starts with uppercase, allows internal apostrophes/hyphens.
  const word = `[A-Z][A-Za-z0-9'\\-]*`;
  // Allowed connectors between title-case words inside a business name.
  // Deliberately excludes "and" — it more often joins two separate businesses
  // ("Aspen Dental and Bright Smiles Dental") than appears inside one name.
  const connector = `(?:of|the|de|la|le|du|&)`;
  // 1-3 title-case lead tokens (each optionally followed by a connector),
  // then the anchor, then optionally one trailing title-case word
  // (e.g. "Aspen Dental Group" → captures "Group", we strip it later).
  const lead = `(?:${word}(?:\\s+${connector})?\\s+){1,3}`;
  return new RegExp(
    `(?:^|[^\\w])(${lead}(?:${anchor})(?:\\s+${word})?)(?=$|[^\\w])`,
    "g",
  );
}

function targetTokenSet(targetName: string | undefined, targetDomain: string): Set<string> {
  const tokens = new Set<string>();
  const root = targetDomain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? "";
  const rootBase = root.split(".")[0];
  if (rootBase && rootBase.length > 2) tokens.add(rootBase.toLowerCase());
  if (targetName) {
    for (const t of targetName.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/)) {
      if (t.length > 2) tokens.add(t);
    }
  }
  return tokens;
}

function normalizeName(raw: string, anchors: readonly string[]): string | null {
  let name = raw.replace(/\s+/g, " ").trim();
  // Strip a trailing corporate suffix and an optional preceding comma.
  // Loop until no more strip; "Pacific Dental Group Services" → "Pacific Dental".
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of CORPORATE_SUFFIXES) {
      const re = new RegExp(`[,\\s]+${escapeRegex(suffix)}\\.?$`);
      const next = name.replace(re, "").trim();
      if (next !== name) {
        name = next;
        changed = true;
      }
    }
  }
  if (name.length < 4) return null;
  const tokens = name.split(/\s+/);
  if (tokens.length < 2) return null;
  // Reject if any non-anchor token is in the generic-words set. Anchor tokens
  // are allowed to appear (they're the vertical keyword that triggered the
  // match), so we exempt them from this check.
  const anchorLower = new Set(anchors.map((a) => a.toLowerCase()));
  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (anchorLower.has(lower)) continue;
    if (GENERIC_TOKENS.has(lower)) return null;
  }
  return name;
}

function isTarget(candidate: string, targetTokens: Set<string>): boolean {
  if (targetTokens.size === 0) return false;
  const lower = candidate.toLowerCase();
  // Compare against both the spaced and whitespace-collapsed forms so that
  // a multi-word business name matches a single-token domain root
  // (e.g. "Bright Smiles Dental" vs "brightsmiles.com").
  const collapsed = lower.replace(/\s+/g, "");
  for (const t of targetTokens) {
    if (t.length >= 5 && (lower.includes(t) || collapsed.includes(t))) return true;
  }
  return false;
}

/**
 * Returns up to ~10 unique competitor business names mentioned in `text`.
 * Filters out the target business and obviously-generic phrases.
 */
export function extractCompetitors(input: ExtractCompetitorsInput): string[] {
  if (!input.text || !input.text.trim()) return [];
  const anchors = input.industrySlug ? ANCHORS[input.industrySlug] : undefined;
  if (!anchors || anchors.length === 0) return [];

  const re = buildRegex(anchors);
  const targetTokens = targetTokenSet(input.targetName, input.targetDomain);
  const seen = new Map<string, string>(); // lowercase-key → display name

  for (const match of input.text.matchAll(re)) {
    const captured = match[1];
    if (!captured) continue;
    const normalized = normalizeName(captured, anchors);
    if (!normalized) continue;
    if (isTarget(normalized, targetTokens)) continue;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) seen.set(key, normalized);
    if (seen.size >= 20) break;
  }
  return [...seen.values()];
}
