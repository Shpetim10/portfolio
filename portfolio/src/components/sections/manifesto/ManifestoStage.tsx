"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { createDecoder } from "@/motion/decode";
import { calibrateDimension } from "@/motion/signatures/calibrate";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T04 · Manifesto + portrait — choreography.
 *
 * Motion score
 *   trigger                          element         property          from → to              ease      duration          mobile  reduced
 *   paragraph in view, scrubbed      each sentence   opacity + scale   unread → 1 → read, by  smoothstep scrubbed        same    paragraph unread → 1 · reduced (200ms), once
 *   (reading focus at the viewport   (read ·         (no colour)       its distance from the
 *   centre: above it read, below     reading ·                          viewport centre
 *   it unread)                       unread)
 *   portrait top at 75%, once        cover plate     scaleY            1 → 0 (top first)      machine   large (1000ms)    same    portrait fades in · reduced, once
 *   …plate 70% open                  dimension line  CALIBRATE         rules grow out         settle    large             same    (in the fade)
 *   …with it                         part label      opacity + decode  —                      snap      micro + decode    same    (in the fade)
 *
 * Reading focus, like synced lyrics: scrolling is never taken over. The page moves
 * as usual and each sentence sits in one of three states by where it is against the
 * viewport centre: read (above it, --manifesto-read), reading (at it, full bone) and
 * unread (below it, --manifesto-unread). Between states brightness eases
 * continuously, in both directions; only brightness tells them apart, never colour.
 *
 * Contrast: lines never drop below --manifesto-unread (bone at that opacity over
 * carbon ≥ 3:1, AA for this large text), so the text passes at every scroll position.
 * Nothing starts below its static state except the portrait, which is not text.
 * Without JS, everything is static and fully drawn.
 */

/** A line is fully lit while it covers the viewport centre, and is back to read / unread this far (fraction of the viewport) past its edge. */
const FALLOFF = 0.06;
/** The lit line grows from this scale; transform only, from its left edge. */
const REST_SCALE = 0.97;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function ManifestoStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const scope = ref.current;
      if (!scope) return;
      const part = (name: string) => scope.querySelector<HTMLElement>(`[data-manifesto="${name}"]`)!;
      const text = part("text");
      const portrait = part("portrait");
      const { duration, stagger } = motionTokens();
      const token = (name: string) => parseFloat(getComputedStyle(scope).getPropertyValue(name)) || 1;
      const read = token("--manifesto-read");
      const unread = token("--manifesto-unread");
      const once = (trigger: Element, start = "top 75%") => ({ trigger, start, once: true });

      if (reduced) {
        gsap.fromTo(
          text,
          { opacity: unread },
          { opacity: 1, duration: duration.reduced, ease: "none", scrollTrigger: once(text, "top center") },
        );
        gsap.from(portrait, {
          opacity: 0,
          duration: duration.reduced,
          ease: "none",
          scrollTrigger: once(portrait),
        });
        return;
      }

      /* Lines: each one lit by its distance from the viewport centre, scrubbed with scroll. */
      const lines = gsap.utils.toArray<HTMLElement>('[data-manifesto="line"]', text);
      const setters = lines.map((line) => ({
        opacity: gsap.quickSetter(line, "opacity") as (value: number) => void,
        scale: gsap.quickSetter(line, "scale") as (value: number) => void,
      }));
      let spans: { top: number; bottom: number }[] = []; // each line's extent, from the paragraph's top
      const measure = () => {
        spans = lines.map((line) => ({ top: line.offsetTop, bottom: line.offsetTop + line.offsetHeight }));
      };
      const update = () => {
        const viewport = window.innerHeight;
        const centre = viewport / 2 - text.getBoundingClientRect().top; // the viewport centre, from the paragraph's top
        lines.forEach((_, i) => {
          const { top, bottom } = spans[i];
          const above = bottom < centre; // already read
          const distance = above ? centre - bottom : Math.max(0, top - centre); // past the line's edge; 0 if it covers the centre
          const lit = smoothstep(Math.max(0, 1 - distance / (viewport * FALLOFF)));
          const rest = above ? read : unread;
          setters[i].opacity(rest + (1 - rest) * lit);
          setters[i].scale(REST_SCALE + (1 - REST_SCALE) * lit);
        });
      };
      measure();
      ScrollTrigger.create({
        trigger: text,
        start: "top bottom",
        end: "bottom top",
        onUpdate: update,
        onRefresh: () => {
          measure();
          update();
        },
      });
      update();

      /* Portrait: the cover plate drops away top → bottom, then the caption calibrates. */
      const label = portrait.querySelector<HTMLElement>(".portrait__label")!;
      const decoder = createDecoder(label);
      decoder.scramble();
      const plateTime = duration.large;
      gsap
        .timeline({ scrollTrigger: once(portrait) })
        .fromTo(part("plate"), { scaleY: 1 }, { scaleY: 0, duration: plateTime, ease: EASE.machine })
        .add(
          calibrateDimension(portrait.querySelector<HTMLElement>('[data-anim="dimension"]')!, motionTokens()),
          plateTime * 0.7,
        )
        .from(label, { opacity: 0, duration: duration.micro, ease: EASE.snap }, `<+=${stagger.items}`)
        .add(decoder.tween(duration.decode), "<");

      return () => {
        decoder.restore();
        gsap.set(lines, { clearProps: "opacity,transform" }); // quickSetter writes aren't reverted by the context
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="manifesto">
      {children}
    </div>
  );
}
