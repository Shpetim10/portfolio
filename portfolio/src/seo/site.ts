import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { getProfile, getSeo, isTodo } from "@/content";

/*
 * T15 · One place that knows the site's public address and how a page
 * introduces itself. Server / build only (reads tokens.css from disk).
 *
 * Next merges metadata shallowly: a page that sets `openGraph` replaces the
 * layout's whole object, and a page that sets nothing inherits `alternates`.
 * So the root layout sets no canonical, and every page builds its own
 * canonical + Open Graph with pageMetadata().
 */

/** Production origin, no trailing slash. SITE_URL overrides it (a preview deploy). */
export const SITE_URL = (process.env.SITE_URL ?? getSeo().siteUrl).replace(/\/+$/, "");

const profile = getProfile();
export const SITE_NAME = isTodo(profile.name) ? "Portfolio" : profile.name;
export const LOCALE = "en_US";

/** "/work/" → "https://…/work/". Paths keep their trailing slash (trailingSlash: true). */
export const absolute = (path: string): string => new URL(path, `${SITE_URL}/`).href;

/** --color-* tokens from tokens.css, e.g. { carbon: "#0b0a08", … }, so OG cards, theme-color and the manifest can't drift from the site. */
export const COLORS: Record<string, string> = Object.fromEntries(
  [
    ...readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8").matchAll(
      /--color-([a-z]+):\s*(#[0-9a-f]{3,8})\s*;/gi,
    ),
  ].map(([, name, value]) => [name, value]),
);

type PageImage = { url: string; alt: string; width: number; height: number };

/** The homepage card (src/app/og.png/route.tsx): every page without its own card shares it. */
export const DEFAULT_OG: PageImage = {
  url: "/og.png",
  alt: `${SITE_NAME}, ${profile.role}: portrait, name and academic record`,
  width: 1200,
  height: 630,
};

type PageMetadataInput = {
  path: string; // site path with trailing slash, "/work/"
  title: string; // the page's own title; the layout template adds the name
  description?: string;
  image?: PageImage;
  type?: "website" | "article" | "profile";
  /** The homepage title is complete on its own: no template. */
  absoluteTitle?: boolean;
};

/** Canonical URL, Open Graph and Twitter card for one page. */
export function pageMetadata({
  path,
  title,
  description,
  image = DEFAULT_OG,
  type = "website",
  absoluteTitle = false,
}: PageMetadataInput): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  const images = [{ ...image, type: "image/png" }];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      url: path,
      siteName: SITE_NAME,
      locale: LOCALE,
      title: fullTitle,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images },
  };
}
