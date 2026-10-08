"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "./gsap";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { EASE, motionTokens } from "./tokens";

/*
 * Page wipe — the fallback for project links when the browser has no View
 * Transitions API (the cover morph needs it). INVERT-style, full viewport:
 *   cover    a paper plate rises over the page from the bottom edge (machine · medium)
 *   route    the router navigates while the page is covered
 *   reveal   the plate retracts upward off the new page (machine · medium)
 * 2 × 600ms, under the 1.6s cap. Reduced: the plate fades in and out (200ms each).
 * The plate carries the destination's part number, so the cut reads as one move.
 */

type WipeRequest = { href: string; label: string };

let handler: ((request: WipeRequest) => void) | null = null;

/** Can this browser morph the cover with a view transition? */
export const supportsViewTransitions = () =>
  typeof document !== "undefined" && typeof document.startViewTransition === "function";

/** Navigates behind the wipe. False when no <PageWipe> is mounted (the link navigates as usual). */
export function wipeTo(request: WipeRequest): boolean {
  if (!handler) return false;
  handler(request);
  return true;
}

/** If a navigation never lands (it failed, or the route was the current one), uncover anyway. */
const STALL_MS = 4000;

export function PageWipe() {
  const router = useRouter();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");
  const uncover = useRef<(() => void) | null>(null);

  const { contextSafe } = useGSAP({ scope: ref, dependencies: [reduced], revertOnUpdate: true });

  useEffect(() => {
    const plate = ref.current;
    if (!plate) return;
    let stall = 0;

    const reveal = contextSafe(() => {
      window.clearTimeout(stall);
      uncover.current = null;
      const { duration } = motionTokens();
      const done = () => {
        delete plate.dataset.state;
        gsap.set(plate, { clearProps: "transform,opacity" });
      };
      if (reduced) {
        gsap.to(plate, { opacity: 0, duration: duration.reduced, ease: "none", onComplete: done });
      } else {
        gsap.to(plate, {
          scaleY: 0,
          transformOrigin: "50% 0%",
          duration: duration.medium,
          ease: EASE.machine,
          onComplete: done,
        });
      }
    });

    handler = contextSafe(({ href, label }: WipeRequest) => {
      if (plate.dataset.state) return; // one wipe at a time
      const { duration } = motionTokens();
      setLabel(label);
      plate.dataset.state = "covering";
      const navigate = () => {
        uncover.current = reveal;
        stall = window.setTimeout(reveal, STALL_MS);
        router.push(href);
      };
      if (reduced) {
        gsap.fromTo(
          plate,
          { opacity: 0, scaleY: 1 },
          { opacity: 1, duration: duration.reduced, ease: "none", onComplete: navigate },
        );
      } else {
        gsap.fromTo(
          plate,
          { scaleY: 0, opacity: 1, transformOrigin: "50% 100%" },
          { scaleY: 1, duration: duration.medium, ease: EASE.machine, onComplete: navigate },
        );
      }
    });

    return () => {
      handler = null;
      uncover.current = null;
      window.clearTimeout(stall);
      delete plate.dataset.state;
    };
  }, [contextSafe, reduced, router]);

  // The new route has committed: take the plate off it.
  useEffect(() => {
    uncover.current?.();
  }, [pathname]);

  return (
    <div ref={ref} className="page-wipe" data-surface="paper" aria-hidden="true">
      <span className="page-wipe__label">{label}</span>
    </div>
  );
}
