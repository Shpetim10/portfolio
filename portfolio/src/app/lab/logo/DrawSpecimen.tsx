"use client";

import { useRef } from "react";
import { drawMark } from "@/components/brand/drawMark";
import { Logo } from "@/components/brand/Logo";
import { useGSAP } from "@/motion/gsap";

/** The header's first-load draw, played on mount (static under reduced motion). Wrap in <Replay>. */
export function DrawSpecimen({ size }: { size: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      return drawMark(ref.current!.querySelector("svg")!);
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className="logo-lab__draw" data-draw-specimen="">
      <Logo variant="mark" size={size} drawable />
    </div>
  );
}
