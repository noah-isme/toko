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
      },
      {
        protocol: 'https',
        hostname: 'cdn.example',
        pathname: '/**'
      }
    ]
  }
};

export default nextConfig;
