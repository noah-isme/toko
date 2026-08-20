/**
 * Browser geocoding client.
 *
 * The current `/api/geocode/*` routes are a temporary same-origin proxy for
 * Nominatim. The frontend/backend OpenAPI contract does not currently define
 * geocoding endpoints, so this module intentionally keeps the proxy boundary
 * in one place instead of guessing a backend URL. Once the backend publishes
 * its contract, only this module and the two proxy routes need to change.
 */

export interface GeocodingAddress {
  [key: string]: string | undefined;
}

export interface GeocodingSearchResult {
  place_id?: string | number;
  display_name?: string;
  lat?: string | number;
  lon?: string | number;
  address?: GeocodingAddress;
}

export interface ReverseGeocodingResult {
  address: GeocodingAddress | null;
  displayName: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAddress(value: unknown): GeocodingAddress | null {
  if (!isRecord(value)) return null;

  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => [
      key,
      typeof field === 'string' ? field : undefined,
    ]),
  );
}

export async function searchGeocoding(
  query: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<GeocodingSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({ q: trimmed, limit: String(limit) });
  const response = await fetch(`/api/geocode/search?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Location search failed');
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];

  return data.filter(isRecord).map((result) => ({
    place_id:
      typeof result.place_id === 'string' || typeof result.place_id === 'number'
        ? result.place_id
        : undefined,
    display_name: typeof result.display_name === 'string' ? result.display_name : undefined,
    lat: typeof result.lat === 'string' || typeof result.lat === 'number' ? result.lat : undefined,
    lon: typeof result.lon === 'string' || typeof result.lon === 'number' ? result.lon : undefined,
    address: parseAddress(result.address) ?? undefined,
  }));
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodingResult> {
  const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) });
  const response = await fetch(`/api/geocode/reverse?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Reverse geocoding failed');
  }

  const data: unknown = await response.json();
  if (!isRecord(data)) {
    return { address: null, displayName: null };
  }

  return {
    address: parseAddress(data.address),
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
  };
}
