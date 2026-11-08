import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['dukascopy-node'],
  allowedDevOrigins: ['*.e2b.app'],
};

export default nextConfig;
