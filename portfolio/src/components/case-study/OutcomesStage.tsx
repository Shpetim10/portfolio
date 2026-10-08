"use client";

import { useRef, type ReactNode } from "react";
import { calibrateCounter, calibrateDimension } from "@/motion/signatures/calibrate";
import { fadeIn, renderedIn, useScrollMotion, type MotionBuilder } from "@/motion/useScrollMotion";

/*
 * T07 · Outcomes — choreography (CALIBRATE, as the homepage metrics).
 *
 * Motion score
 *   trigger                  element          property          from → to          ease    duration         mobile  reduced
 *   strip 60% in view, once  countable figure text (CALIBRATE) 0 → value          settle  large (1000ms)   same    final values · strip fades in (200ms)
 *   …with each figure        dimension line   scaleX + ticks    0 → full           settle  large            same    (in the fade)
 *   outcomes stagger by items (60ms) in reading order. Longest: 3 × 60ms + 1000ms = 1.18s (< 1.6s).
 * Figures that can't count (see parseReading) hold still; their line still extends.
 */

const calibrateOutcomes: MotionBuilder = (tl, scope, tokens) => {
  const restores = renderedIn(scope, ".outcome").map((outcome, i) => {
    const at = i * tokens.stagger.items;
    const dimension = outcome.querySelector<HTMLElement>('[data-anim="dimension"]')!;
    tl.add(calibrateDimension(dimension, tokens), at);
    const figure = outcome.querySelector<HTMLElement>('[data-anim="calibrate"]');
    if (!figure) return undefined;
    const counter = calibrateCounter(figure, tokens);
    tl.add(counter.tween, at);
    return counter.restore;
  });
  return () => restores.forEach((restore) => restore?.());
};

export function OutcomesStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollMotion(ref, { full: calibrateOutcomes, reduced: fadeIn, start: "60% bottom" });

  return (
    <div ref={ref} className="outcomes__stage">
      {children}
    </div>
  );
}
