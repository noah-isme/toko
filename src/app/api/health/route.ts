import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Deployment liveness endpoint. Keep the payload deliberately small and
 * uncached: it is intended for Vercel smoke checks and uptime monitors, not
 * for exposing backend or tenant details.
 */
export function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? null;

  return NextResponse.json(
    {
      status: 'ok',
      service: 'toko-web',
      version,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
