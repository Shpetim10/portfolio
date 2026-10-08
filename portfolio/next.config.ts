import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site: `next build` emits HTML/CSS/JS into /out. No server, no API routes.
  output: "export",
  // Emit /work/<slug>/index.html so any static host resolves clean URLs.
  trailingSlash: true,
  // Images are pre-optimized at build time (AVIF + WebP); the default loader needs a server.
  images: { unoptimized: true },
  // The 404 (src/app/global-not-found.tsx) renders outside the root layout, so it skips the
  // layout's motion runtime and stays inside its JS budget (T14).
  experimental: { globalNotFound: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Case studies are MDX modules imported by /work/[slug] (src/content/work/<slug>.mdx), not pages.
const withMDX = createMDX();

export default withMDX(nextConfig);
