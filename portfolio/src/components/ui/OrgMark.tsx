import type { CSSProperties } from "react";
import { isPublished } from "@/content/files";
import type { OrgLogo } from "@/content";
import { cx } from "./cx";

/** Below this width:height ratio (a symbol over or beside a small wordmark) a logo is drawn taller. */
const STACKED_BELOW = 3;

type OrgMarkProps = {
  logo?: OrgLogo;
  className?: string;
};

/**
 * An organisation's logo as a monochrome stamp. The file is used as a CSS mask over a
 * flat Dust fill, so its own colours never show: every logo reads as the same engraved
 * mark, whatever the brand. Decorative (aria-hidden): the organisation's name is always
 * the text beside it. Renders nothing until the file is in /public, so a logo declared
 * before its file arrives leaves no gap. Server / build only (reads /public).
 */
export function OrgMark({ logo, className }: OrgMarkProps) {
  if (!logo || !isPublished(logo.src)) return null;
  const ratio = logo.width / logo.height;
  return (
    <span
      className={cx("org-mark", className)}
      aria-hidden="true"
      // A compact logo (square, stacked, or a symbol with a small wordmark) needs more height than a wide wordmark to stay legible.
      data-shape={ratio < STACKED_BELOW ? "stacked" : undefined}
      style={
        {
          "--mark-src": `url("${logo.src}")`,
          "--mark-ratio": ratio,
        } as CSSProperties
      }
    />
  );
}
