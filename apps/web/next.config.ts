import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // TODO(types): ~117 TS errors in the codebase (unused imports, `Object is possibly 'undefined'`,
    // wrong `Feature` props in pricing page, etc). Flip to `false` and fix incrementally.
    // Run `npx tsc --noEmit` to see the list.
    ignoreBuildErrors: true,
  },
  eslint: {
    // TODO(lint): un-ignore once TS errors are addressed.
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