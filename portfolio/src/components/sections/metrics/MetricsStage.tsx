"use client";

import { useRef, type ReactNode } from "react";
import { calibrateCounter, calibrateDimension } from "@/motion/signatures/calibrate";
import { EASE } from "@/motion/tokens";
import { fadeIn, renderedIn, useScrollMotion, type MotionBuilder } from "@/motion/useScrollMotion";

/*
 * T05 · Metrics — choreography.
 *
 * Motion score
 *   trigger                   element         property         from → to          ease    duration         mobile  reduced
 *   list 60% in view, once    figures         text (CALIBRATE) 0 → value          settle  large (1000ms)   same    final values · list fades in (200ms)
 *   …with each figure         dimension line  scaleX + ticks   0 → full, from     settle  large            same    (in the fade)
 *                                                              its start tick
 *   …line ~arrived            dot             opacity + scale  0 → 1              snap    micro (180ms)    same    (in the fade)
 *   metrics stagger by items (60ms) in reading order. The hero moment: the lead
 *   metric's signal dot landing at the end of its line.
 * Longest path: 4 × 60ms + 1000ms = 1.24s, under the 1.6s UI cap.
 * Without JS everything is static and final.
 */

const calibrateMetrics: MotionBuilder = (tl, scope, tokens) => {
  const { duration, stagger } = tokens;
  const restores = renderedIn(scope, ".metric").map((metric, i) => {
    const at = i * stagger.items;
    const counter = calibrateCounter(metric.querySelector<HTMLElement>('[data-anim="calibrate"]')!, tokens);
    tl.add(counter.tween, at)
      .add(calibrateDimension(metric.querySelector<HTMLElement>('[data-anim="dimension"]')!, tokens), at)
      .from(
        metric.querySelector(".metric__dot"),
        { opacity: 0, scale: 0, duration: duration.micro, ease: EASE.snap },
        at + duration.medium,
      );
    return counter.restore;
  });
  return () => restores.forEach((restore) => restore());
};

export function MetricsStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollMotion(ref, { full: calibrateMetrics, reduced: fadeIn, start: "60% bottom" });

  return (
    <div ref={ref} className="metrics">
      {children}
    </div>
  );
}
