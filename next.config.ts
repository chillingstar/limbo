import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = async (phase: string, { defaultConfig }: { defaultConfig: NextConfig }): Promise<NextConfig> => {
  const config: NextConfig = {
    /* config options here */
  };

  if (phase === PHASE_DEVELOPMENT_SERVER) {
    // Modify config for development phase
  }

  return config;
};

export default nextConfig;
