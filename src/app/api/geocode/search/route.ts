import { NextResponse } from 'next/server';

/**
 * Transitional proxy only. The backend OpenAPI contract does not yet expose
 * geocoding, so the frontend keeps this same-origin boundary until the
 * backend publishes an authenticated `/geocode/search` contract. Do not add a
 * guessed upstream API path here; update `src/lib/geocoding/client.ts` and
 * remove this route as part of that contract change.
 */
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? searchParams.get('query');
  const limit = searchParams.get('limit') ?? '5';

  if (!query) {
    return NextResponse.json(
      { error: 'Missing query' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', limit);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'toko/1.0 (forward-geocode)',
        'Accept-Language': 'id-ID',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Geocoding failed' },
        { status: 502, headers: NO_STORE_HEADERS },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: 'Geocoding failed' },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
