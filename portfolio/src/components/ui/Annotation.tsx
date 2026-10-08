import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Content } from "./Content";
import { cx } from "./cx";

/*
 * The annotation layer: drawing marks that carry information (design-system.md
 * § Annotation system). All lines are 1px at every viewport; geometry lives in
 * src/styles/primitives.css. `data-anim` / `data-anim-part` are the hooks
 * ANNOTATE and CALIBRATE (src/motion/signatures) animate; without JS, or
 * outside an <Annotate> / <Calibrate> scope, everything renders fully drawn.
 */

/* Part label ---------------------------------------------------------- */

type PartLabelProps = {
  /** e.g. "P/N 03" */
  number: string;
  name: string;
  className?: string;
};

/** "P/N 03 — SERVICES" in micro mono. */
export function PartLabel({ number, name, className }: PartLabelProps) {
  return (
    <span className={cx("part-label", className)} data-anim-part="decode">
      <span className="part-label__number">{number}</span> — <Content value={name} />
    </span>
  );
}

/* Leader line --------------------------------------------------------- */

export type LeaderDirection = "up-right" | "up-left" | "down-right" | "down-left";

// Leg segment in a unit square, from the target corner to the elbow (SVG y points down).
const LEG: Record<LeaderDirection, [x1: number, y1: number, x2: number, y2: number]> = {
  "up-right": [0, 1, 1, 0],
  "up-left": [1, 1, 0, 0],
  "down-right": [0, 0, 1, 1],
  "down-left": [1, 0, 0, 1],
};

type LeaderLineProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  /** Which way the line leaves its target. The target dot sits on the opposite corner. */
  direction?: LeaderDirection;
  children: ReactNode;
};

/**
 * 45° leg + horizontal elbow + label, with a signal dot on the target.
 * Position the component so its target corner (bottom-left for up-right, …)
 * lands on the point being annotated. Extra width lengthens the elbow.
 */
export function LeaderLine({ direction = "up-right", children, className, ...rest }: LeaderLineProps) {
  const [x1, y1, x2, y2] = LEG[direction];
  return (
    <span {...rest} className={cx("leader", className)} data-direction={direction} data-anim="annotate">
      <span className="leader__leg" aria-hidden="true">
        {/* The stroke box clips the leg so ANNOTATE can draw it by sliding along its own axis. */}
        <span className="leader__stroke" data-anim-part="leg">
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" focusable="false">
            <line x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
          </svg>
        </span>
        <span className="leader__dot" data-anim-part="dot" />
      </span>
      <span className="leader__run" aria-hidden="true" data-anim-part="run" />
      <span className="leader__label" data-anim-part="label">
        {children}
      </span>
    </span>
  );
}

/* Dimension line ------------------------------------------------------ */

type DimensionLineProps = {
  /**
   * Measured value, e.g. "4.2 YRS". TODO values render as a placeholder.
   * Omit it when the measurement is printed beside the line (a Counter):
   * the line is then a single ticked rule, and purely graphic.
   */
  value?: string;
  className?: string;
};

/** |——— ← VALUE → ———| spanning the width it measures. Without a value: |————————|. */
export function DimensionLine({ value, className }: DimensionLineProps) {
  return (
    <span
      className={cx("dimension", className)}
      data-anim="dimension"
      aria-hidden={value === undefined ? true : undefined}
    >
      <span className="dimension__tick" aria-hidden="true" data-anim-part="tick" />
      <span className="dimension__rule" aria-hidden="true" data-anim-part="rule" />
      {value !== undefined && (
        <>
          <span className="dimension__value" data-anim-part="value">
            <span aria-hidden="true">← </span>
            <Content value={value} />
            <span aria-hidden="true"> →</span>
          </span>
          <span className="dimension__rule" aria-hidden="true" data-anim-part="rule" />
        </>
      )}
      <span className="dimension__tick" aria-hidden="true" data-anim-part="tick" />
    </span>
  );
}

/* Registration mark --------------------------------------------------- */

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** 12px crosshair, dust at 40%. With `corner`, pins itself inside the nearest positioned ancestor. */
export function RegistrationMark({ corner, className }: { corner?: Corner; className?: string }) {
  return (
    <svg
      className={cx("registration-mark", className)}
      data-corner={corner}
      data-anim="registration"
      viewBox="0 0 12 12"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 0V12M0 6H12" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* Section index ------------------------------------------------------- */

type SectionIndexProps = {
  index: number;
  title: string;
  /** Drawing revision, e.g. "REV.26". */
  rev?: string;
  /** id on the title, so a <section> can be labelled by it. */
  titleId?: string;
  className?: string;
};

/** "[03]  WORK  ─────────  REV.26" in label mono. */
export function SectionIndex({ index, title, rev, titleId, className }: SectionIndexProps) {
  return (
    <p className={cx("section-index", className)} data-anim="section-index">
      <span className="section-index__number">[{String(index).padStart(2, "0")}]</span>
      <span className="section-index__title" id={titleId}>
        {title}
      </span>
      <span className="section-index__rule" aria-hidden="true" data-anim-part="rule" />
      {rev && <span className="section-index__rev">{rev}</span>}
    </p>
  );
}
