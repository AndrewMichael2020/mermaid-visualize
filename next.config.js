
/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// Add webpack alias to resolve `@/` imports which are used across the project
nextConfig.webpack = (config) => {
  if (!config.resolve) config.resolve = {};
  if (!config.resolve.alias) config.resolve.alias = {};
  config.resolve.alias['@'] = path.resolve(__dirname, 'src');
  return config;
};

module.exports = nextConfig;
