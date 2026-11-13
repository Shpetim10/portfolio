import type { MetadataRoute } from "next";
import { absolute, SITE_URL } from "@/seo/site";

/*
 * T15 · /robots.txt: every crawler, every page, including AI search crawlers
 * (an answer engine quoting the record is a search result too). The 404 is
 * kept out of the index by its own noindex, not here.
 */

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absolute("/sitemap.xml"),
    host: SITE_URL,
  };
}
