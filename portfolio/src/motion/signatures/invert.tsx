"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { cx } from "@/components/ui/cx";
import { EASE } from "../tokens";
import { useScrollMotion, type MotionBuilder } from "../useScrollMotion";

/*
 * INVERT — full-section wipe from carbon to paper (machine · large, 1000ms).
 * The section is paper underneath. A carbon plate covers it on mount and
 * retracts downwards (scaleY 1 → 0 from the bottom edge) when the section
 * top reaches 60% of the viewport, once. Without JS the plate is collapsed
 * (CSS), so the paper section simply renders.
 * Reduced: the plate fades out (200ms) instead of wiping.
 */

const plateOf = (scope: HTMLElement) => scope.querySelector<HTMLElement>('[data-anim-part="plate"]');

export const invert: MotionBuilder = (tl, scope, { duration }) => {
  tl.fromTo(plateOf(scope), { scaleY: 1 }, { scaleY: 0, duration: duration.large, ease: EASE.machine });
};

export const invertReduced: MotionBuilder = (tl, scope, { duration }) => {
  tl.fromTo(
    plateOf(scope),
    { scaleY: 1, opacity: 1 },
    { opacity: 0, duration: duration.reduced, ease: "none" },
  );
};

export function useInvert(ref: RefObject<HTMLElement | null>, start = "top 60%") {
  useScrollMotion(ref, { full: invert, reduced: invertReduced, start });
}

/**
 * A paper surface (ink text, remapped tokens — see src/styles/motion.css)
 * that INVERTs in from carbon. Wrap a SectionShell in it.
 */
export function Invert({
  children,
  className,
  start,
}: {
  children: ReactNode;
  className?: string;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useInvert(ref, start);
  return (
    <div ref={ref} className={cx("inversion", className)} data-surface="paper">
      <span className="inversion__plate" aria-hidden="true" data-anim-part="plate" />
      {children}
    </div>
  );
}
