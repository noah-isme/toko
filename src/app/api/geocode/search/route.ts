import { NextResponse } from 'next/server';

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const CACHE_SECONDS = 60 * 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? searchParams.get('query');
  const limit = searchParams.get('limit') ?? '5';

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
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
      next: { revalidate: CACHE_SECONDS },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
  }
}
