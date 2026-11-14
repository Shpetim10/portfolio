import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages are prerendered at build; the homepage is regenerated hourly with ISR (GitHub field log).
  // Clean URLs keep their trailing slash, as they did when the site was a static export.
  trailingSlash: true,
  // Images are pre-optimized at build time (AVIF + WebP), so Next's image optimizer is not used.
  images: { unoptimized: true },
  // Dev only: lets a phone load /_next chunks and HMR from the LAN IP or a Cloudflare quick tunnel.
  // Without it the JS is blocked, React never hydrates and the page stays as unstyled server HTML.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local", "*.trycloudflare.com"],
  // The 404 (src/app/global-not-found.tsx) renders outside the root layout, so it skips the
  // layout's motion runtime and stays inside its JS budget (T14).
  experimental: { globalNotFound: true, agentUpgrade: "security" },
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
