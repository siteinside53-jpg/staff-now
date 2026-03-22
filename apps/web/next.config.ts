import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@staffnow/types',
    '@staffnow/validation',
    '@staffnow/config',
    '@staffnow/api-client',
    '@staffnow/shared-utils',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.staffnow.gr' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },
};

export default nextConfig;