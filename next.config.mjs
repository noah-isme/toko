import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mswBrowserEntry = path.join(__dirname, 'node_modules/msw/lib/browser/index.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'loremflickr.com',
        pathname: '/**'
      }
    ]
  },
  // Turbopack configuration (for Next.js 16+)
  turbopack: {
    resolveAlias: {
      'msw/browser': mswBrowserEntry,
    },
  },
  // Webpack configuration (for compatibility)
  webpack: (config) => {
    config.resolve.alias = config.resolve.alias ?? {};
    // Force Webpack to resolve the browser-only MSW entry even when Node conditions are present.
    config.resolve.alias['msw/browser'] = mswBrowserEntry;
    return config;
  }
};

export default nextConfig;
