/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-dfg-evidence.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.sierraauction.com',
      },
      {
        protocol: 'https',
        hostname: '*.ironplanet.com',
      },
      {
        protocol: 'https',
        hostname: 'd3j17a2r8lnfte.cloudfront.net', // Sierra CDN
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net', // Allow all CloudFront (auction CDNs)
      },
    ],
  },
};

module.exports = nextConfig;
