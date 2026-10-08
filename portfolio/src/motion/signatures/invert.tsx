"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { cx } from "@/components/ui/cx";
import { gsap, useGSAP } from "../gsap";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EASE, motionTokens } from "../tokens";
import { useScrollMotion, type MotionBuilder } from "../useScrollMotion";

/*
 * INVERT — full-section wipe from carbon to paper (machine · large, 1000ms).
 * The section is paper underneath. A carbon plate covers it on mount and
 * retracts downwards (scaleY 1 → 0 from the bottom edge) when the section
 * top reaches 60% of the viewport, once. Without JS the plate is collapsed
 * (CSS), so the paper section simply renders.
 * Reduced: the plate fades out (200ms) instead of wiping.
 *
 * Exit (opt-in): the section inverts back to carbon as the next one begins.
 * A second carbon plate rises from the bottom edge (scaleY 0 → 1, machine ·
 * large) when the section bottom passes 40% of the viewport, and drops back
 * when you scroll up past that line. It takes the pointer while it covers
 * (and is a carbon surface to the cursor); it steps aside whenever focus is
 * inside the section, so a focused element is never hidden under it (CSS).
 * Reduced: the plate fades in and out (200ms).
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

export function useInvertExit(ref: RefObject<HTMLElement | null>, start = "bottom 40%", enabled = true) {
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      const plate = enabled && ref.current?.querySelector<HTMLElement>('[data-anim-part="exit-plate"]');
      if (!plate) return;
      const { duration } = motionTokens();
      const scrollTrigger = { trigger: ref.current, start, toggleActions: "play none none reverse" };

      if (prefersReduced) {
        // autoAlpha: while faded out the plate is also visibility: hidden, so it never takes the pointer.
        gsap.fromTo(
          plate,
          { scaleY: 1, autoAlpha: 0 },
          { autoAlpha: 1, duration: duration.reduced, ease: "none", scrollTrigger },
        );
        return;
      }
      gsap.fromTo(
        plate,
        { scaleY: 0 },
        { scaleY: 1, duration: duration.large, ease: EASE.machine, scrollTrigger },
      );
    },
    { scope: ref, dependencies: [prefersReduced, enabled, start], revertOnUpdate: true },
  );
}

/**
 * A paper surface (ink text, remapped tokens — see src/styles/motion.css)
 * that INVERTs in from carbon. Wrap a SectionShell in it.
 */
export function Invert({
  children,
  className,
  start,
  exit = false,
}: {
  children: ReactNode;
  className?: string;
  start?: string;
  /** Invert back to carbon as the section leaves: true, or the exit's ScrollTrigger start. */
  exit?: boolean | string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useInvert(ref, start);
  useInvertExit(ref, typeof exit === "string" ? exit : undefined, exit !== false);
  return (
    <div ref={ref} className={cx("inversion", className)} data-surface="paper">
      <span className="inversion__plate" aria-hidden="true" data-anim-part="plate" />
      {children}
      {exit !== false && (
        <span
          className="inversion__plate inversion__plate--exit"
          aria-hidden="true"
          data-anim-part="exit-plate"
          data-surface="carbon"
        />
      )}
    </div>
  );
}
