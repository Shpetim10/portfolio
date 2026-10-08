"use client";

import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { Testimonial } from "@/content";
import { gsap, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { EASE, motionTokens } from "@/motion/tokens";

/*
 * T12 · Peer review — stepping, autoplay and choreography.
 *   trigger        element           property    from → to        ease    duration                 reduced
 *   stage → 85%    quote + controls  opacity+y   0, 8px → 1, 0    settle  medium                   fade (200ms)
 *   step           outgoing quote    opacity+y   1, 0 → 0, 8px    settle  small                    fade (200ms)
 *   step           incoming quote    opacity+y   0, 8px → 1, 0    settle  medium, after outgoing   fade (200ms)
 * Steps are CSS transitions on the slides (src/styles/testimonials.css);
 * opacity and transform only. Without JS every quote is listed in turn.
 *
 * Autoplay advances every --duration-autoplay (8s). It stops while a mouse is over
 * the section, while keyboard focus is inside it, while the tab is hidden, and
 * once the visitor pauses it; it never runs under reduced motion. Each stop
 * restarts the 8s, so a quote is never cut short by a pause ending.
 */

const pad = (value: number) => String(value).padStart(2, "0");

/** Name, linked to its source when the testimonial has one. */
function Name({ item }: { item: Testimonial }) {
  if (!item.href) return <>{item.name}</>;
  return (
    <a className="peer__source" href={item.href} target="_blank" rel="noreferrer">
      {item.name}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function PeerReview({ items }: { items: Testimonial[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const count = items.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false); // the visitor's choice
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false); // tab in the background

  const playing = count > 1 && !reduced && !paused && !hovered && !focused && !hidden;

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const interval = motionTokens().duration.autoplay * 1000;
    if (!(interval > 0)) return; // tokens not applied: stay put rather than spin
    const timer = window.setTimeout(() => setActive((at) => (at + 1) % count), interval);
    return () => window.clearTimeout(timer);
  }, [playing, active, count]);

  useGSAP(
    () => {
      const stage = ref.current?.querySelector<HTMLElement>('[data-peer="stage"]');
      if (!stage) return;
      const { duration } = motionTokens();
      const scrollTrigger = { trigger: stage, start: "top 85%", once: true };
      if (reduced) {
        gsap.from(stage, { opacity: 0, duration: duration.reduced, ease: "none", scrollTrigger });
        return;
      }
      gsap.from(stage, { opacity: 0, y: 8, duration: duration.medium, ease: EASE.settle, scrollTrigger });
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  // Hover pauses for a mouse only: a tap on a phone must not leave autoplay stuck.
  const enter = (event: PointerEvent) => event.pointerType === "mouse" && setHovered(true);
  const leave = (event: PointerEvent) => event.pointerType === "mouse" && setHovered(false);
  // Keyboard focus pauses; focus left by a mouse click on a control does not.
  const focus = (event: FocusEvent<HTMLElement>) =>
    event.target.matches(":focus-visible") && setFocused(true);
  const blur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  const step = (by: number) => setActive((at) => (at + by + count) % count);

  return (
    <div
      ref={ref}
      className="peer"
      role="group"
      aria-roledescription="carousel"
      aria-label="Peer review"
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocus={focus}
      onBlur={blur}
    >
      <h2 className="peer__label">Peer review</h2>

      <div className="peer__stage" data-peer="stage">
        <div className="peer__slides" aria-live={playing ? "off" : "polite"}>
          {items.map((item, at) => (
            <div
              key={`${item.name}-${at}`}
              className="peer__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${at + 1} of ${count}`}
              aria-hidden={at === active ? undefined : true}
              data-active={at === active ? "" : undefined}
              data-peer="slide"
            >
              <figure className="peer__figure">
                <blockquote className="peer__quote">
                  <p>{item.quote}</p>
                </blockquote>
                <figcaption className="peer__attribution">
                  <Name item={item} /> · {item.title} · {item.company} · {item.relation}
                </figcaption>
              </figure>
            </div>
          ))}
        </div>

        {count > 1 && (
          <div className="peer__controls" data-peer="controls">
            <Button
              variant="secondary"
              arrow={false}
              aria-label="Previous testimonial"
              onClick={() => step(-1)}
            >
              <span aria-hidden="true">←</span> Prev
            </Button>
            <Button variant="secondary" aria-label="Next testimonial" onClick={() => step(1)}>
              Next
            </Button>
            <p className="peer__count" data-peer="count">
              <span className="sr-only">Testimonial </span>
              {pad(active + 1)} / {pad(count)}
            </p>
            {!reduced && (
              <Button
                variant="secondary"
                arrow={false}
                className="peer__toggle"
                aria-label={paused ? "Resume automatic rotation" : "Pause automatic rotation"}
                onClick={() => setPaused((was) => !was)}
              >
                {paused ? "Play" : "Pause"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
