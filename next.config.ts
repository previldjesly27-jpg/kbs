import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ne bloque pas le build
  },
  // typescript: { ignoreBuildErrors: true }, // (garde COMMENTÉ si possible)
};

export default nextConfig;
