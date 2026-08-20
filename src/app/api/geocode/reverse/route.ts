import { NextResponse } from 'next/server';

/**
 * Transitional proxy only. The backend OpenAPI contract does not yet expose
 * reverse geocoding. Keep the same-origin boundary until an authenticated
 * backend contract is published, then migrate the shared geocoding client and
 * remove this route together.
 */
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing lat/lng' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lng);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'toko/1.0 (reverse-geocode)',
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
    return NextResponse.json(
      {
        address: data?.address ?? null,
        displayName: data?.display_name ?? null,
      },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Geocoding failed' },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
