// Expands a business location into the set of cities to query, sized by
// the industry's radius from BRD §5.4. Real-mode uses Google Maps Geocoding
// + Places Text Search with a Redis cache; fallback mode (no key) returns a
// curated fixture so the orchestrator + UI work end-to-end without burning
// a Maps quota.

import { resolveRadiusMiles } from "@geotracker/shared";
import IORedis from "ioredis";
import { env } from "../env.js";
import { geocodeCity, nearbyCities } from "./googleMaps.js";

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
  source: "google-maps" | "fixture";
}

const MAX_CITIES = 6;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

let redis: IORedis | null = null;
function getRedis(): IORedis {
  if (!redis) redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
  return redis;
}

function dedupeAndCap(seed: string, others: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const city of [seed, ...others]) {
    const trimmed = city.trim();
    if (!trimmed) continue;
    const k = trimmed.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(trimmed);
    if (out.length >= MAX_CITIES) break;
  }
  return out;
}

function fixtureCatchment(seed: string, radius: number): CatchmentResult {
  const suburbs = NEARBY[seed.toLowerCase()] ?? [];
  return { radiusMiles: radius, cities: dedupeAndCap(seed, suburbs), source: "fixture" };
}

async function realCatchment(
  seed: string,
  state: string | undefined,
  radiusMiles: number,
  apiKey: string,
): Promise<CatchmentResult | null> {
  const cacheKey = `geo:catchment:${seed.toLowerCase()}|${state ?? ""}|${radiusMiles}`;
  try {
    const cached = await getRedis().get(cacheKey);
    if (cached) {
      const cities = JSON.parse(cached) as string[];
      return { radiusMiles, cities, source: "google-maps" };
    }
  } catch {
    /* cache miss tolerated */
  }

  const geo = await geocodeCity(apiKey, state ? `${seed}, ${state}` : seed);
  if (!geo) return null;
  const radiusMeters = Math.round(radiusMiles * 1609.34);
  const cities = await nearbyCities(apiKey, { lat: geo.lat, lng: geo.lng }, radiusMeters);
  const final = dedupeAndCap(geo.city ?? seed, cities);

  try {
    await getRedis().set(cacheKey, JSON.stringify(final), "EX", CACHE_TTL_SECONDS);
  } catch {
    /* best-effort */
  }

  return { radiusMiles, cities: final, source: "google-maps" };
}

export async function expandCatchment(input: CatchmentInput): Promise<CatchmentResult> {
  const radius = resolveRadiusMiles(input.industrySlug);
  const seed = input.seedCity.trim();
  if (env.GOOGLE_MAPS_API_KEY) {
    const result = await realCatchment(seed, input.state, radius, env.GOOGLE_MAPS_API_KEY);
    if (result) return result;
    // Fall through to fixture if geocoding failed — better than no audit.
  }
  return fixtureCatchment(seed, radius);
}
