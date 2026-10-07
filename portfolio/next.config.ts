import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: `next build` emits HTML/CSS/JS into /out. No server, no API routes.
  output: "export",
  // Emit /work/<slug>/index.html so any static host resolves clean URLs.
  trailingSlash: true,
  // Images are pre-optimized at build time (AVIF + WebP); the default loader needs a server.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
