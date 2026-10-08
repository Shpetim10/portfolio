/*
 * CSS cubic-bezier() as a function, for the rare page that animates without
 * GSAP (the 404 ships no GSAP: see src/components/not-found). Reads the curve
 * from the --ease-* tokens on :root, so it can't drift from the CSS. Linear
 * when the token is missing.
 */

export type Ease = (t: number) => number;

const linear: Ease = (t) => t;

/** The unit-square cubic Bézier through (0,0), (x1,y1), (x2,y2), (1,1): y for a given x. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  const slope = (a: number, b: number, s: number) =>
    3 * a * (1 - s) ** 2 + 6 * (b - a) * s * (1 - s) + 3 * (1 - b) * s * s;

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Newton–Raphson on x(s), then bisection if the slope flattens out.
    let s = x;
    for (let i = 0; i < 6; i++) {
      const d = slope(x1, x2, s);
      if (Math.abs(d) < 1e-6) break;
      s -= (at(x1, x2, s) - x) / d;
    }
    if (s < 0 || s > 1 || Math.abs(at(x1, x2, s) - x) > 1e-4) {
      let [lo, hi] = [0, 1];
      for (let i = 0; i < 24; i++) {
        s = (lo + hi) / 2;
        if (at(x1, x2, s) < x) lo = s;
        else hi = s;
      }
    }
    return at(y1, y2, s);
  };
}

/** An easing token (`settle`, `machine`, `snap`) as a function. */
export function cssEase(name: string): Ease {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--ease-${name}`);
  const points = value.match(/-?\d*\.?\d+/g)?.map(Number);
  return points?.length === 4 ? cubicBezier(points[0], points[1], points[2], points[3]) : linear;
}

/** A duration token (`--duration-medium`, …) in seconds; 0 when missing. */
export function cssDuration(name: string): number {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--duration-${name}`).trim();
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return value.endsWith("ms") ? n / 1000 : n;
}
