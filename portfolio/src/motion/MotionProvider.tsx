"use client";

import Lenis from "lenis";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "./gsap";
import { useDeviceTier } from "./hooks/useDeviceTier";
import { useIsTouch } from "./hooks/useIsTouch";
import { useReducedMotion } from "./hooks/useReducedMotion";

// The active Lenis instance lives outside React so effects can publish it without re-render cascades.
let activeLenis: Lenis | null = null;
const listeners = new Set<() => void>();
const publishLenis = (instance: Lenis | null) => {
  activeLenis = instance;
  listeners.forEach((listener) => listener());
};
const subscribeLenis = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The active Lenis instance, or null under reduced motion / before mount. */
export const useLenis = (): Lenis | null =>
  useSyncExternalStore(
    subscribeLenis,
    () => activeLenis,
    () => null,
  );

/**
 * Root motion runtime.
 * ONE requestAnimationFrame loop: the GSAP ticker. Lenis runs with autoRaf off
 * and is stepped from the ticker; ScrollTrigger updates on every Lenis scroll.
 * Under reduced motion Lenis is not created at all — native scroll only.
 * Also mirrors motion/input/tier state onto <html data-*> for CSS and tests.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const isTouch = useIsTouch();
  const tier = useDeviceTier();

  useEffect(() => {
    const root = document.documentElement.dataset;
    root.motion = reducedMotion ? "reduce" : "full";
    root.input = isTouch ? "touch" : "fine";
    if (tier) root.tier = tier;
  }, [reducedMotion, isTouch, tier]);

  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({ autoRaf: false, anchors: true, stopInertiaOnNavigate: true });
    const offScroll = lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    // Prioritised: Lenis steps first in every tick, so anything else on the ticker
    // (the hero's renderer, T03) reads this frame's scroll, never the last one's.
    gsap.ticker.add(tick, false, true);
    gsap.ticker.lagSmoothing(0);
    publishLenis(lenis);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // GSAP defaults
      offScroll();
      lenis.destroy();
      publishLenis(null);
    };
  }, [reducedMotion]);

  return children;
}
