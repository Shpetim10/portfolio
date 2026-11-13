import type { MetadataRoute } from "next";
import { getSeo } from "@/content";
import { COLORS, SITE_NAME } from "@/seo/site";

/*
 * T15 · /manifest.webmanifest: the name, the Sh² monogram icons
 * (src/app/icon.svg, apple-icon.png from `pnpm brand:icons`) and the carbon
 * ground, so a saved shortcut opens on the site's own colour.
 */

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME.split(" ").at(-1),
    description: getSeo().description,
    start_url: "/",
    display: "browser",
    background_color: COLORS.carbon,
    theme_color: COLORS.carbon,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
