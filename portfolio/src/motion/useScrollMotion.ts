"use client";

import type { RefObject } from "react";
import { gsap, useGSAP } from "./gsap";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { motionTokens, type MotionTokens } from "./tokens";

/**
 * Adds a motion to `tl` (which plays once when the scope scrolls into view).
 * Tweens are reverted automatically; return a function to undo anything GSAP
 * can't record itself (e.g. text written by a decode or a counter).
 */
export type MotionBuilder<T extends HTMLElement = HTMLElement> = (
  tl: gsap.core.Timeline,
  scope: T,
  tokens: MotionTokens,
) => void | (() => void);

type ScrollMotionOptions<T extends HTMLElement> = {
  full: MotionBuilder<T>;
  /** Reduced-motion variant: a short opacity fade, no movement. */
  reduced: MotionBuilder<T>;
  /** ScrollTrigger start. Default: scope top crosses 85% of the viewport. */
  start?: string;
};

/**
 * One-shot, scroll-triggered motion on a scope element.
 * Picks the full or reduced builder live from prefers-reduced-motion; every
 * tween, ScrollTrigger and SplitText made inside is reverted on unmount and
 * whenever the preference flips (useGSAP context + revertOnUpdate).
 */
export function useScrollMotion<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { full, reduced, start = "top 85%" }: ScrollMotionOptions<T>,
) {
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      const scope = ref.current;
      if (!scope) return;
      const tl = gsap.timeline({ scrollTrigger: { trigger: scope, start, once: true } });
      return (prefersReduced ? reduced : full)(tl, scope, motionTokens()) ?? undefined;
    },
    { scope: ref, dependencies: [prefersReduced], revertOnUpdate: true },
  );
}

/** The shared reduced-motion variant: the scope fades in, nothing moves. */
export const fadeIn: MotionBuilder = (tl, scope, { duration }) => {
  tl.from(scope, { opacity: 0, duration: duration.reduced, ease: "none" });
};

/**
 * Elements in the scope that match `selector` and are rendered. Breakpoint
 * variants hidden with display: none stay static (final state) instead of
 * animating invisibly.
 */
export const renderedIn = (scope: Element, selector: string) =>
  [...scope.querySelectorAll<HTMLElement>(selector)].filter((element) => element.getClientRects().length > 0);
