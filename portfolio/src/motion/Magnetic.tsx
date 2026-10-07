"use client";

import { useRef, type ReactNode } from "react";
import { useMagnetic } from "./hooks/useMagnetic";

/**
 * Scope that makes every `[data-magnetic]` element inside it magnetic
 * (primary Buttons carry the attribute). Server-rendered children stay server components.
 */
export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useMagnetic(ref);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
