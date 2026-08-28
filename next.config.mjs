import withPWA from '@ducanh2912/next-pwa';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withPWAConfig = withPWA({
  dest: 'public',
  // Keep the hand-written push-notification worker at /sw.js. @ducanh2912/next-pwa owns
  // its generated worker under a separate name so production builds cannot
  // overwrite push handling or its registration contract.
  sw: 'pwa-sw.js',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-static',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif|gif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
  fallbacks: {
    document: '/offline',
  },
});

function configuredRemotePattern(raw) {
  if (!raw || raw === 'mock') return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    return {
      protocol: url.protocol.slice(0, -1),
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: '/**',
    };
  } catch {
    return null;
  }
}

const configuredImagePatterns = [
  configuredRemotePattern(process.env.NEXT_PUBLIC_API_URL),
  configuredRemotePattern(process.env.NEXT_PUBLIC_CDN_URL),
].filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: {},
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      ...configuredImagePatterns,
      // ── Production / mock CDNs ──────────────────────────────────────────
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.example',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // ── Local development (real API running on localhost) ───────────────
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Baseline security headers for every document and route response.
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*\\.(avif|webp|png|jpg|jpeg|gif|svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Static assets (fonts, JS, CSS)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // API responses may contain credentials, cart state, or other mutable
        // data. Keep them out of browser and shared caches by default.
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withPWAConfig(nextConfig));
