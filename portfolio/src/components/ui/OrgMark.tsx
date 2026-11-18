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
 * A lazy image tinted to Dust by the shared SVG filter. The adjacent
 * organisation name provides the label, and the reserved aspect ratio keeps
 * the section still while the image loads. Unpublished files leave no gap.
 */
export function OrgMark({ logo, className }: OrgMarkProps) {
  if (!logo || !isPublished(logo.src)) return null;
  const ratio = logo.width / logo.height;
  return (
    // These marks are local and served as supplied by the build.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt=""
      loading="lazy"
      decoding="async"
      className={cx("org-mark", className)}
      // A compact logo (square, stacked, or a symbol with a small wordmark) needs more height than a wide wordmark to stay legible.
      data-shape={ratio < STACKED_BELOW ? "stacked" : undefined}
      style={
        {
          "--mark-ratio": ratio,
        } as CSSProperties
      }
    />
  );
}

export function OrgMarkFilter() {
  return (
    <svg className="absolute" width="0" height="0" aria-hidden="true">
      <filter id="org-mark-ink">
        <feFlood className="org-mark__ink" />
        <feComposite in2="SourceAlpha" operator="in" />
      </filter>
    </svg>
  );
}
