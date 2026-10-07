"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import type { LeaderDirection } from "@/components/ui/Annotation";
import { createDecoder } from "../decode";
import { gsap } from "../gsap";
import { EASE, type MotionTokens } from "../tokens";
import { fadeIn, renderedIn, useScrollMotion, type MotionBuilder } from "../useScrollMotion";

/*
 * ANNOTATE — a leader line draws, its dot lands, the label decodes.
 *   stroke  leg + elbow as one continuous line from the target out   settle · small (320ms)
 *   dot     scale 0 → 1                                              snap · micro
 *   label   fades up, then decodes left → right in mono              ≤ decode (400ms)
 * Several leaders in one scope follow each other at the item stagger.
 * The leg is drawn by sliding the SVG along its own 45° axis inside a clip
 * box, the elbow by scaleX — transform only, no stroke-dashoffset.
 * Reduced: the scope fades in (200ms); no draw, no scramble.
 */

// Where the leg starts: pushed back past its target corner, so it slides out from the target.
const LEG_FROM: Record<LeaderDirection, gsap.TweenVars> = {
  "up-right": { xPercent: -100, yPercent: 100 },
  "up-left": { xPercent: 100, yPercent: 100 },
  "down-right": { xPercent: -100, yPercent: -100 },
  "down-left": { xPercent: 100, yPercent: -100 },
};

/** Builds one leader's ANNOTATE timeline. `restore` puts the label text back. */
export function annotateLeader(leader: HTMLElement, { duration }: MotionTokens) {
  const part = (name: string) => leader.querySelector<HTMLElement>(`[data-anim-part="${name}"]`)!;
  const direction = (leader.dataset.direction ?? "up-right") as LeaderDirection;
  const leg = part("leg");
  const run = part("run");
  const label = part("label");

  // Split the stroke time by length so the pen moves at one speed round the elbow.
  const legLength = leg.offsetWidth * Math.SQRT2;
  const legShare = legLength / (legLength + run.offsetWidth || 1);
  const stroke = gsap
    .timeline({ paused: true })
    .from(leg.firstElementChild, { ...LEG_FROM[direction], duration: legShare, ease: "none" })
    .from(run, {
      scaleX: 0,
      transformOrigin: direction.endsWith("right") ? "left center" : "right center",
      duration: 1 - legShare,
      ease: "none",
    });

  const decoder = createDecoder(label);
  decoder.scramble();

  const timeline = gsap
    .timeline()
    .add(stroke.tweenFromTo(0, stroke.duration(), { duration: duration.small, ease: EASE.settle }))
    .from(part("dot"), { scale: 0, duration: duration.micro, ease: EASE.snap })
    .from(label, { opacity: 0, duration: duration.micro, ease: EASE.snap }, "<")
    .add(decoder.tween(duration.decode), "<");

  return { timeline, restore: decoder.restore };
}

/** Full variant: every leader in the scope, staggered. */
export const annotate: MotionBuilder = (tl, scope, tokens) => {
  const built = renderedIn(scope, '[data-anim="annotate"]').map((leader) => annotateLeader(leader, tokens));
  built.forEach(({ timeline }, i) => tl.add(timeline, i * tokens.stagger.items));
  return () => built.forEach(({ restore }) => restore());
};

export const annotateReduced: MotionBuilder = fadeIn;

export function useAnnotate(ref: RefObject<HTMLElement | null>, start?: string) {
  useScrollMotion(ref, { full: annotate, reduced: annotateReduced, start });
}

/** Scope that ANNOTATEs every LeaderLine inside it when it scrolls into view. */
export function Annotate({
  children,
  className,
  start,
}: {
  children: ReactNode;
  className?: string;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useAnnotate(ref, start);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
