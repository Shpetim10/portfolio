import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Whether a site-root path ("/resume.pdf") is actually a file in /public at
 * build time, so a download only links once the owner has added the file:
 * no dead links. Server / build only.
 */
export const isPublished = (href: string): boolean =>
  href.startsWith("/") && !href.includes("..") && existsSync(join(process.cwd(), "public", href));

/** The photos whose files are in /public at build: a photo declared before its file arrives is left out. Server / build only. */
export const publishedPhotos = <T extends { src: string }>(photos: T[] = []): T[] =>
  photos.filter((photo) => isPublished(photo.src));
