import type { Metadata, Viewport } from "next";
import { PartNotFound } from "@/components/not-found/PartNotFound";
import { getProfile, isTodo } from "@/content";
import { fontVariables } from "@/styles/fonts-404";
import "@/styles/not-found.css";

/*
 * T14 · The 404 for every unmatched URL (experimental.globalNotFound, next.config.ts).
 * It bypasses the root layout on purpose: the site's layout ships GSAP, Lenis,
 * the preloader, header and cursor (~205KB of JS gzipped). This page carries
 * only React, Next's runtime and its own stage — and the 3D chunk on desktop.
 * Its own stylesheet and two font faces; a full document, as Next requires.
 */

const profile = getProfile();
const siteName = isTodo(profile.name) ? "Portfolio" : profile.name;

export const metadata: Metadata = {
  title: `Part not found — ${siteName}`,
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <PartNotFound />
      </body>
    </html>
  );
}
