import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Whether a site-root path ("/resume.pdf") is actually a file in /public at
 * build time, so a download only links once the owner has added the file:
 * no dead links. Server / build only.
 */
export const isPublished = (href: string): boolean =>
  href.startsWith("/") && !href.includes("..") && existsSync(join(process.cwd(), "public", href));
