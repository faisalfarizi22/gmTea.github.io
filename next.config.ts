/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['assets.coingecko.com', 'logos.covalenthq.com'],
  },
  
  // Webpack configuration
  webpack: (config: { resolve: { fallback: any; alias: any; }; externals: string[]; }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };
    
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // Ignore node-specific modules in browser
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
    };
    
    return config;
  },
  
  // Headers configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Next.js configuration
  reactStrictMode: true,
  
  // Experimental features for better hydration handling
  experimental: {
    // Enable React 18 features
    appDir: true,
    
    // Improve hydration performance
    optimizePackageImports: ['@thirdweb-dev/react', 'ethers'],
  },
  
  // Compiler options
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Hydration optimization
  swcMinify: true,
  
  // Output configuration
  output: 'standalone',
  
  // Disable powered by header
  poweredByHeader: false,
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'custom-value',
  },
  
  // TypeScript configuration
  typescript: {
    // Allow production builds to complete even if there are TypeScript errors
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    // Allow production builds to complete even if there are ESLint errors
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;