import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    '@staffnow/types',
    '@staffnow/validation',
    '@staffnow/config',
    '@staffnow/api-client',
    '@staffnow/shared-utils',
  ],
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'api.staffnow.gr' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },
};

export default nextConfig;