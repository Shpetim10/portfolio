"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { gsap } from "../gsap";
import { EASE, type MotionTokens } from "../tokens";
import { fadeIn, renderedIn, useScrollMotion, type MotionBuilder } from "../useScrollMotion";

/*
 * CALIBRATE — figures count up while dimension lines extend to their value.
 *   counter    zero-padded readout counts to the value      settle · large (1000ms)
 *   dimension  rules grow out from the value, end ticks ride their ends, same clock
 * Starts when the scope is 60% in view, once.
 * The readout keeps every digit position from the first frame (0,000 → 1,440):
 * tabular figures, so the width never changes and nothing reflows.
 * Reduced: the scope fades in (200ms) showing final values; nothing counts.
 */

const parts = (root: Element, name: string) => [
  ...root.querySelectorAll<HTMLElement>(`[data-anim-part="${name}"]`),
];

/** Counts a Counter's figure from zero. `restore` puts the rendered text back. */
export function calibrateCounter(counter: HTMLElement, { duration }: MotionTokens) {
  const [figure] = parts(counter, "value");
  const value = Number(counter.dataset.value);
  const decimals = Number(counter.dataset.decimals ?? 0);
  const original = figure.textContent;
  const restore = () => {
    figure.textContent = original;
  };

  const readout = new Intl.NumberFormat("en-US", {
    minimumIntegerDigits: Math.max(1, String(Math.trunc(Math.abs(value))).length),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const state = { value: 0 };
  const paint = () => {
    figure.textContent = readout.format(state.value);
  };
  paint();

  const tween = gsap.to(state, {
    value,
    duration: duration.large,
    ease: EASE.settle,
    onUpdate: paint,
    onComplete: restore,
  });
  return { tween, restore };
}

/** Extends a DimensionLine from its value outwards to its end ticks. */
export function calibrateDimension(dimension: HTMLElement, { duration }: MotionTokens) {
  const [before, after] = parts(dimension, "rule");
  const [startTick, endTick] = parts(dimension, "tick");
  const vars = { duration: duration.large, ease: EASE.settle };
  return gsap
    .timeline()
    .from(parts(dimension, "value"), { opacity: 0, duration: duration.micro, ease: EASE.snap }, 0)
    .from(before, { ...vars, scaleX: 0, transformOrigin: "right center" }, 0)
    .from(after, { ...vars, scaleX: 0, transformOrigin: "left center" }, 0)
    .from(startTick, { ...vars, x: () => before.offsetWidth }, 0)
    .from(endTick, { ...vars, x: () => -after.offsetWidth }, 0);
}

/** Full variant: every Counter and DimensionLine in the scope, on one clock. */
export const calibrate: MotionBuilder = (tl, scope, tokens) => {
  const counters = renderedIn(scope, '[data-anim="calibrate"]').map((counter) =>
    calibrateCounter(counter, tokens),
  );
  counters.forEach(({ tween }) => tl.add(tween, 0));
  renderedIn(scope, '[data-anim="dimension"]').forEach((dimension) =>
    tl.add(calibrateDimension(dimension, tokens), 0),
  );
  return () => counters.forEach(({ restore }) => restore());
};

export const calibrateReduced: MotionBuilder = fadeIn;

export function useCalibrate(ref: RefObject<HTMLElement | null>, start = "60% bottom") {
  useScrollMotion(ref, { full: calibrate, reduced: calibrateReduced, start });
}

/** Scope that CALIBRATEs every Counter and DimensionLine inside it. */
export function Calibrate({
  children,
  className,
  start,
}: {
  children: ReactNode;
  className?: string;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useCalibrate(ref, start);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
