import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@ghost/shared'],
  devIndicators: false,
  serverExternalPackages: ['ioredis', 'ws'],
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  },
};
export default config;
