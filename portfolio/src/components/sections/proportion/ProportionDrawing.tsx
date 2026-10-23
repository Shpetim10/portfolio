"use client";

import { useEffect, useRef, useState } from "react";
import { GlyphLineDrawing } from "@/components/drawing/GlyphLineDrawing";
import type { DrawingData } from "@/components/drawing/model";
import vitruvian from "@/content/drawing/vitruvian.json";
import { useMediaQuery } from "@/motion/hooks/useMediaQuery";
import { useProportionProgress } from "./ProportionStage";

/* The traced data (~4 KB gzipped) is imported into this client chunk rather than
   passed down as a prop, which would print it into the page's HTML a second time. */
const data = vitruvian as DrawingData;

/** How far ahead of the viewport the drawing wakes: a full screen, so it is live before p leaves 0. */
const WAKE_MARGIN = "100% 0px";

/**
 * The Vitruvian Man, driven by the bridge's progress. Only this leaf re-renders
 * as the band scrolls. The desktop grid from md (the tablet's drawing is wide
 * enough for it), the lighter mobile grid below.
 *
 * The band sits far down the page, so the drawing stays in its server-rendered
 * final state (held static) until the band comes within a screen of the
 * viewport: its engine chunk, font load and glyph atlas never compete with the
 * page's first load. The canvas takes over the <pre>'s exact box, so waking
 * shifts nothing.
 */
export function ProportionDrawing() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useProportionProgress();
  const wide = useMediaQuery("(width >= 48rem)", true);
  const [awake, setAwake] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || awake) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setAwake(true);
      },
      { rootMargin: WAKE_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [awake]);

  return (
    <div ref={ref}>
      <GlyphLineDrawing
        data={data}
        progress={progress}
        size={wide ? "desktop" : "mobile"}
        reducedMotion={!awake}
      />
    </div>
  );
}
