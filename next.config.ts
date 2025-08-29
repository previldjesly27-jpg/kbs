import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Laisse ESLint tranquille pendant le build Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ⚠️ À n'activer que si Vercel bloque encore sur des erreurs TypeScript
  // typescript: {
  //   ignoreBuildErrors: true,
  // },

  // Autoriser les images venant de Supabase Storage
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      // (facultatif) ton projet précis :
      { protocol: "https", hostname: "advegnaizkxlwmjbmpxw.supabase.co" },
    ],
  },

  // (facultatif) utile parfois pour la prévisualisation dynamique
  // experimental: { staleTimes: { dynamic: 0 } },
};

export default nextConfig;
