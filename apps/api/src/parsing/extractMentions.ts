// Detects business mentions in an LLM response and extracts ranking,
// caveats, and presence of actionable contact info. Owns the cross-reference
// step from BRD §7.3 so generic business names don't false-positive.

export interface ExtractInput {
  text: string;
  businessName?: string;
  domain: string;
}

export interface ExtractOutput {
  mentioned: boolean;
  /** 1-based ranking in the response's recommendation list, if detectable. */
  rank: number | null;
  hasContactInfo: boolean;
  caveatFlag: boolean;
}

const CAVEAT_TOKENS = [
  "mixed reviews",
  "but ",
  "however",
  "limited",
  "note:",
  "caveat",
  "could not find",
  "no direct phone",
  "no published",
  "unverified",
  "not sure",
];

const CONTACT_TOKENS = [
  "phone:",
  "phone number",
  "call ",
  "book online",
  "booking link",
  "schedule online",
  "website:",
  "visit ",
];

const PHONE_RE = /\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;

function normalize(s: string): string {
  return s.toLowerCase();
}

function domainRoot(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]!.toLowerCase();
}

function nameTokens(name: string | undefined): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["the", "and", "for", "inc", "llc", "ltd", "co"].includes(t));
}

function findMentionIndex(text: string, businessName: string | undefined, domain: string): number {
  const lower = normalize(text);
  const root = domainRoot(domain);
  const rootBase = root.split(".")[0]!; // "brightsmiles" from "brightsmiles.com"
  if (root && lower.includes(root)) return lower.indexOf(root);
  if (rootBase.length > 3 && lower.includes(rootBase)) return lower.indexOf(rootBase);

  // Whitespace-tolerant match: collapse spaces from the source and look for the
  // root base. Lets us match "Bright Smiles Dental" against domain
  // "brightsmiles.com" without a businessName. We then map the collapsed index
  // back to the original by re-walking the source.
  if (rootBase.length > 3) {
    const collapsed = lower.replace(/\s+/g, "");
    const cIdx = collapsed.indexOf(rootBase);
    if (cIdx >= 0) {
      // Map collapsed index back to original text index.
      let consumed = 0;
      for (let i = 0; i < lower.length; i++) {
        if (consumed === cIdx) return i;
        if (!/\s/.test(lower[i]!)) consumed++;
      }
    }
  }

  if (businessName) {
    const tokens = nameTokens(businessName);
    if (tokens.length === 0) return -1;
    // Require ≥2 distinctive tokens to appear within a 120-char window for
    // generic-name matches (BRD §7.3 edge case).
    if (tokens.length === 1) {
      const idx = lower.indexOf(tokens[0]!);
      return idx;
    }
    for (let i = 0; i < lower.length - 1; i++) {
      const window = lower.slice(i, i + 120);
      const hits = tokens.filter((t) => window.includes(t)).length;
      if (hits >= 2) return i;
    }
  }
  return -1;
}

function extractRank(text: string, mentionIdx: number): number | null {
  if (mentionIdx < 0) return null;
  // Look backwards for the nearest "<n>." or "<n>)" pattern within 80 chars.
  const start = Math.max(0, mentionIdx - 80);
  const slice = text.slice(start, mentionIdx + 1);
  const match = slice.match(/(?:^|\n|\s)(\d{1,2})[.)]\s+(?=[^\n]*$)/);
  if (!match) return null;
  const n = parseInt(match[1]!, 10);
  if (!Number.isFinite(n) || n < 1 || n > 25) return null;
  return n;
}

function lineAround(text: string, idx: number): string {
  if (idx < 0) return "";
  const start = text.lastIndexOf("\n", idx);
  const end = text.indexOf("\n", idx);
  return text.slice(start < 0 ? 0 : start + 1, end < 0 ? text.length : end);
}

const NEGATION_TOKENS = [
  "could not find",
  "couldn't find",
  "no direct",
  "no published",
  "without a",
  "without phone",
  "without contact",
];

function detectContactInfo(line: string): boolean {
  const lower = line.toLowerCase();
  // Hard signals always count.
  if (PHONE_RE.test(line)) return true;
  if (URL_RE.test(line)) return true;
  // Soft signals are only positive when no negation phrase appears in the
  // same line, otherwise things like "could not find a booking link" would
  // falsely register as actionable.
  if (NEGATION_TOKENS.some((n) => lower.includes(n))) return false;
  return CONTACT_TOKENS.some((t) => lower.includes(t));
}

function detectCaveat(line: string): boolean {
  const lower = line.toLowerCase();
  return CAVEAT_TOKENS.some((t) => lower.includes(t));
}

export function extractMentions(input: ExtractInput): ExtractOutput {
  if (!input.text || !input.text.trim()) {
    return { mentioned: false, rank: null, hasContactInfo: false, caveatFlag: false };
  }
  const idx = findMentionIndex(input.text, input.businessName, input.domain);
  if (idx < 0) {
    return { mentioned: false, rank: null, hasContactInfo: false, caveatFlag: false };
  }
  const line = lineAround(input.text, idx);
  return {
    mentioned: true,
    rank: extractRank(input.text, idx),
    hasContactInfo: detectContactInfo(line),
    caveatFlag: detectCaveat(line),
  };
}
