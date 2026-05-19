// Thin Google Maps Geocoding + Places (Text Search) wrapper used to build a
// real catchment area. Only used when GOOGLE_MAPS_API_KEY is provided;
// otherwise the orchestrator falls back to the fixture in catchment.ts.

interface GeocodeResponse {
  status: string;
  results?: Array<{
    geometry?: { location?: { lat: number; lng: number } };
    address_components?: Array<{ short_name: string; long_name: string; types: string[] }>;
  }>;
}

interface PlacesTextSearchResponse {
  status: string;
  results?: Array<{
    name: string;
    types?: string[];
    geometry?: { location?: { lat: number; lng: number } };
  }>;
}

export interface GeocodedSeed {
  city: string;
  lat: number;
  lng: number;
}

export async function geocodeCity(apiKey: string, query: string): Promise<GeocodedSeed | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    query,
  )}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as GeocodeResponse;
  if (data.status !== "OK") return null;
  const r = data.results?.[0];
  const loc = r?.geometry?.location;
  if (!loc) return null;
  const cityComponent = r?.address_components?.find((c) =>
    c.types.some((t) => t === "locality" || t === "postal_town"),
  );
  return {
    city: cityComponent?.long_name ?? query,
    lat: loc.lat,
    lng: loc.lng,
  };
}

const PLACES_MAX_RADIUS_METERS = 50_000;

export async function nearbyCities(
  apiKey: string,
  origin: { lat: number; lng: number },
  radiusMeters: number,
): Promise<string[]> {
  const cappedRadius = Math.min(radiusMeters, PLACES_MAX_RADIUS_METERS);
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent("city")}` +
    `&location=${origin.lat},${origin.lng}` +
    `&radius=${cappedRadius}` +
    `&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as PlacesTextSearchResponse;
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") return [];
  return (data.results ?? [])
    .filter((r) => (r.types ?? []).some((t) => t === "locality" || t === "political"))
    .map((r) => r.name);
}
