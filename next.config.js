/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false
    };
    return config;
  },
  transpilePackages: ['ethers'],
  async rewrites() {
    return [
      {
        source: '/forum',
        destination: '/forum',
      },
      {
        source: '/forum/:threadId',
        destination: '/forum/[threadId]',
      }
    ];
  }
};

module.exports = nextConfig;