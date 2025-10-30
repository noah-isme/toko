import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const brand = 'toko';

function formatPrice(value: string | null) {
  if (!value) {
    return null;
  }

  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(numeric);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') ?? brand;
  const price = formatPrice(searchParams.get('price'));
  const subtitle = searchParams.get('subtitle');

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1f2937, #111827)',
          color: '#f9fafb',
          padding: '72px',
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: 0.8,
          }}
        >
          {brand}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <h1
            style={{
              margin: 0,
              fontSize: title.length > 32 ? 72 : 88,
              fontWeight: 700,
              lineHeight: 1.05,
              maxWidth: '900px',
            }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              style={{
                margin: 0,
                fontSize: 32,
                opacity: 0.85,
                maxWidth: '820px',
              }}
            >
              {subtitle}
            </p>
          ) : null}
          {price ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '16px 28px',
                borderRadius: 999,
                backgroundColor: '#f59e0b',
                color: '#111827',
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              {price}
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 24, opacity: 0.7 }}>Modern modular storefront components</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
