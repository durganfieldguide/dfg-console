import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'sierraauction.com',
      },
      {
        protocol: 'https',
        hostname: '*.sierraauction.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent*.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'external*.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.govplanet.com',
      },
      {
        protocol: 'https',
        hostname: '*.purplewave.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
