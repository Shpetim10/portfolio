import { useId, type CSSProperties } from "react";
import { cx } from "@/components/ui/cx";
import { LOCKUP, MARK, WORDMARK } from "./geometry";

/*
 * BRAND-01 · The Sh² mark, the outlined wordmark, and the two locked up.
 * Inline SVG, so the S, h and wordmark take currentColor and the exponent
 * square takes --signal: the signal accent for tone "color", currentColor for
 * "mono" (src/styles/brand.css). Paths come from geometry.ts (`pnpm brand`).
 *
 * Without a `title` the logo is decorative (aria-hidden): use that wherever
 * the surrounding text already names the owner, e.g. a link with its own
 * label. With one it is an image named by its <title>.
 *
 * `drawable` (mark only) wraps the S and h in a mask of their stroke
 * centrelines, [data-draw] paths the header's first-load motion and the
 * preloader trace (./drawMark.ts). Until a script dashes them the mask is
 * solid, so the server-rendered mark is the finished drawing. `socket` (mark
 * only) adds the exponent square's unlit hairline outline beneath it, for a
 * square that lights up later (the preloader's LED).
 */

export type LogoProps = {
  variant?: "mark" | "wordmark" | "lockup";
  tone?: "color" | "mono";
  /** Rendered height: a CSS length or px. The width follows the drawing. */
  size?: number | string;
  /** Accessible name. Omit for decorative use. */
  title?: string;
  /** Mark only: adds the draw-on mask the header and preloader animate. */
  drawable?: boolean;
  /** Mark only: a hairline outline under the exponent square, visible while it is unlit. */
  socket?: boolean;
  className?: string;
};

/** Mask strokes run this much wider than the glyph strokes, so their edges never shave the ink's antialiasing. */
const MASK_BLEED = 0.5;

function Mark({ drawable, socket = false, maskId }: { drawable: boolean; socket?: boolean; maskId: string }) {
  return (
    <>
      {socket && <path d={MARK.exponent} className="logo__socket" vectorEffect="non-scaling-stroke" />}
      {drawable && (
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-1" y="-1" width="34" height="26">
          <g fill="none" stroke="white" strokeWidth={MARK.stroke + MASK_BLEED} strokeLinejoin="miter">
            {Object.entries(MARK.lines).map(([part, d]) => (
              <path key={part} d={d} data-draw={part} />
            ))}
          </g>
        </mask>
      )}
      <path d={MARK.ink} fill="currentColor" mask={drawable ? `url(#${maskId})` : undefined} />
      <path d={MARK.exponent} className="logo__exponent" data-part="exponent" />
    </>
  );
}

export function Logo({
  variant = "mark",
  tone = "color",
  size = "1em",
  title,
  drawable = false,
  socket = false,
  className,
}: LogoProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const viewBox = { mark: MARK.viewBox, wordmark: WORDMARK.viewBox, lockup: LOCKUP.viewBox }[variant];

  return (
    <svg
      viewBox={viewBox}
      className={cx("logo", className)}
      data-logo={variant}
      data-mark-tone={tone}
      style={{ "--logo-size": typeof size === "number" ? `${size}px` : size } as CSSProperties}
      {...(title ? { role: "img", "aria-labelledby": titleId } : { "aria-hidden": true })}
      focusable="false"
    >
      {title && <title id={titleId}>{title}</title>}
      {variant === "mark" && <Mark drawable={drawable} socket={socket} maskId={`${id}-draw`} />}
      {variant === "wordmark" && <path d={WORDMARK.ink} fill="currentColor" />}
      {variant === "lockup" && (
        <>
          <g transform={`translate(0 ${LOCKUP.mark.y}) scale(${LOCKUP.mark.scale})`}>
            <Mark drawable={false} maskId="" />
          </g>
          <path
            d={WORDMARK.ink}
            fill="currentColor"
            transform={`translate(${LOCKUP.wordmark.x} ${LOCKUP.wordmark.y})`}
          />
        </>
      )}
    </svg>
  );
}
