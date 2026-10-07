import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The link preview picture reads its fonts from disk; make sure they ship
  outputFileTracingIncludes: {
    '/\\[username\\]/\\[slug\\]/opengraph-image*': ['./assets/fonts/**/*'],
  },
};

export default nextConfig;
