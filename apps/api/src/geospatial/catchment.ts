// Expands a business location into the set of cities to query, sized by
// the industry's radius from BRD §5.4. v1 returns a deterministic stub set
// keyed by the seed city so the orchestrator + UI can be exercised end-to-end
// without burning a Google Maps quota. Swap for a real Places call once
// GOOGLE_MAPS_API_KEY is provisioned (BRD §7.1 / §12.2).

import { resolveRadiusMiles } from "@geotracker/shared";

export interface CatchmentInput {
  industrySlug: string;
  seedCity: string;
  state?: string;
}

const NEARBY: Record<string, string[]> = {
  // A small fixture so the orchestrator has plausible suburbs to fan out to.
  austin: ["Round Rock", "Cedar Park", "Pflugerville", "Georgetown", "Leander"],
  houston: ["Sugar Land", "Pearland", "The Woodlands", "Katy", "Pasadena"],
  dallas: ["Plano", "Irving", "Frisco", "Garland", "Arlington"],
  "san francisco": ["Oakland", "Berkeley", "Daly City", "San Mateo", "South San Francisco"],
  miami: ["Coral Gables", "Hialeah", "Doral", "Aventura", "Homestead"],
};

export interface CatchmentResult {
  radiusMiles: number;
  cities: string[];
}

export function expandCatchment(input: CatchmentInput): CatchmentResult {
  const radius = resolveRadiusMiles(input.industrySlug);
  const seed = input.seedCity.trim();
  const key = seed.toLowerCase();
  const suburbs = NEARBY[key] ?? [];
  // De-duplicate (BRD §7.3) and cap so fan-out stays predictable in v1.
  const cities = [seed, ...suburbs];
  const seen = new Set<string>();
  const unique = cities.filter((c) => {
    const k = c.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { radiusMiles: radius, cities: unique.slice(0, 6) };
}
