import { NextResponse } from 'next/server';

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_SECONDS = 60 * 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });
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
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(
      {
        address: data?.address ?? null,
        displayName: data?.display_name ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
  }
}
