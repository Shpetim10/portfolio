"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { cx } from "@/components/ui/cx";
import { gsap, SplitText, useGSAP } from "../gsap";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { EASE, motionTokens } from "../tokens";

/*
 * REVEAL — display lines rise from behind masks.
 * settle · large (1000ms) · 0.08s line stagger · once, when the block enters.
 * Lines come from SplitText with line masks; `autoSplit` re-splits on resize
 * and font load, and the running animation carries over its progress.
 * Mask overhang (so glyphs taller than a tight display line box aren't
 * clipped) lives in src/styles/motion.css as --reveal-overhang.
 * Reduced: the block fades in (200ms), text is never split.
 */

// Start offset of each line: 100% of its height + the mask overhang below it (≤ 0.2 line heights).
const LINE_START = 120;

type RevealOptions = {
  /** ScrollTrigger start. Default: block top crosses 85% of the viewport. */
  start?: string;
};

export function useReveal(ref: RefObject<HTMLElement | null>, { start = "top 85%" }: RevealOptions = {}) {
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      const element = ref.current;
      if (!element) return;
      const { duration, stagger } = motionTokens();
      const scrollTrigger = () => ({ trigger: element, start, once: true });

      if (prefersReduced) {
        gsap.from(element, {
          opacity: 0,
          duration: duration.reduced,
          ease: "none",
          scrollTrigger: scrollTrigger(),
        });
        return;
      }

      SplitText.create(element, {
        type: "lines",
        mask: "lines",
        tag: "span",
        linesClass: "reveal__line",
        autoSplit: true,
        // Returning the tween lets SplitText revert and rebuild it on every re-split.
        onSplit: (split) =>
          gsap.from(split.lines, {
            yPercent: LINE_START,
            duration: duration.large,
            ease: EASE.settle,
            stagger: stagger.lines,
            scrollTrigger: scrollTrigger(),
          }),
      });
    },
    { scope: ref, dependencies: [prefersReduced], revertOnUpdate: true },
  );
}

type RevealProps = {
  as?: "h1" | "h2" | "h3" | "p";
  id?: string;
  children: ReactNode;
  className?: string;
  start?: string;
};

/** A display heading (or paragraph) whose lines REVEAL on scroll. Plain text children only. */
export function Reveal({ as: Tag = "h2", id, children, className, start }: RevealProps) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  useReveal(ref, { start });
  return (
    <Tag ref={ref} id={id} className={cx("reveal", className)} data-anim="reveal">
      {children}
    </Tag>
  );
}
