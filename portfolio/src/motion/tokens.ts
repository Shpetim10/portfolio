"use client";

import { CustomEase } from "./gsap";

/*
 * Motion tokens for GSAP. The values live once, in src/styles/tokens.css;
 * this module reads them from :root at runtime so CSS transitions and GSAP
 * timelines can never drift apart. Durations come back in seconds (GSAP's unit).
 */

/** GSAP ease names, registered from --ease-* via CustomEase on first read. */
export const EASE = {
  settle: "settle", // reveals, text, UI
  machine: "machine", // mechanical moves: explode, panels, page wipes
  snap: "snap", // micro-interactions
} as const;

const DURATIONS = ["micro", "small", "medium", "large", "cinematic", "reduced", "decode"] as const;
const STAGGERS = ["chars", "lines", "items"] as const;

export type MotionTokens = {
  duration: Record<(typeof DURATIONS)[number], number>;
  stagger: Record<(typeof STAGGERS)[number], number>;
  /** px */
  magnetMax: number;
  /** px */
  cursorRing: number;
  /** px */
  cursorLens: number;
};

/** "1s" | "80ms" | "0.08s" → seconds. */
const toSeconds = (value: string) => (value.endsWith("ms") ? parseFloat(value) / 1000 : parseFloat(value));

let cached: MotionTokens | null = null;

/**
 * Reads the motion tokens (cached after the first complete read).
 * If the stylesheet is somehow not applied yet, returns zero durations so
 * every motion lands on its final state instantly, and retries next call.
 */
export function motionTokens(): MotionTokens {
  if (cached) return cached;

  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  const missing: string[] = [];
  const need = (name: string) => {
    const value = read(name);
    if (!value) missing.push(name);
    return value;
  };

  const tokens: MotionTokens = {
    duration: Object.fromEntries(
      DURATIONS.map((key) => [key, toSeconds(need(`--duration-${key}`))]),
    ) as MotionTokens["duration"],
    stagger: Object.fromEntries(
      STAGGERS.map((key) => [key, toSeconds(need(`--stagger-${key}`))]),
    ) as MotionTokens["stagger"],
    magnetMax: parseFloat(need("--magnet-max")),
    cursorRing: parseFloat(need("--cursor-ring")),
    cursorLens: parseFloat(need("--cursor-lens")),
  };
  const eases = Object.values(EASE).map((name) => [name, need(`--ease-${name}`)] as const);

  if (missing.length) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[motion] tokens missing on :root: ${missing.join(", ")}`);
    }
    return {
      ...tokens,
      duration: Object.fromEntries(DURATIONS.map((key) => [key, 0])) as MotionTokens["duration"],
      stagger: Object.fromEntries(STAGGERS.map((key) => [key, 0])) as MotionTokens["stagger"],
    };
  }

  // "cubic-bezier(.16, 1, .3, 1)" → "0.16,1,0.3,1", the four-number form CustomEase accepts.
  for (const [name, curve] of eases) {
    const points = curve.match(/-?\d*\.?\d+/g);
    if (points?.length === 4) CustomEase.create(name, points.join(","));
  }

  cached = tokens;
  return tokens;
}
