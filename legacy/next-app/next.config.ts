import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cache Components (Next.js 16)
   * Enables `'use cache'` directive + PPR model.
   * Data fetches are dynamic by default; opt-in to caching with `'use cache'`.
   */
  cacheComponents: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
