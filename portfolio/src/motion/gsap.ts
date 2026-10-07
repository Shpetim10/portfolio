"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

declare global {
  interface Window {
    /**
     * Test-only probe. Playwright sets it to `true` in an init script; it is
     * then replaced with live counters so leak tests can read GSAP state.
     */
    __MOTION_PROBE__?: true | { triggers: () => number; animations: () => number };
  }
}

// Register plugins once, client-side. Import gsap and its plugins from here, never directly.
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, CustomEase);

  if (window.__MOTION_PROBE__ === true) {
    window.__MOTION_PROBE__ = {
      triggers: () => ScrollTrigger.getAll().length,
      animations: () => gsap.globalTimeline.getChildren(true, true, true).length,
    };
  }
}

export { CustomEase, gsap, ScrollTrigger, SplitText, useGSAP };
