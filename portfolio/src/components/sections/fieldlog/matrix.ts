import type { ContributionDay } from "@/content/github";

export const WEEKS = 52;
export const ROWS = 7;

export type Cell = { date: string; count: number; col: number; row: number; level: 0 | 1 | 2 | 3 | 4 };

/**
 * Lays the last 52 weeks out column-per-week, row-per-weekday (Sunday on top).
 * Levels: 0 none · 1–3 by quantile of the active days · 4 "top day" (the busiest tenth, signal).
 */
export function layout(days: ContributionDay[]): Cell[] {
  const recent = days.slice(-WEEKS * ROWS);
  if (recent.length === 0) return [];
  // Anchor the first day on its weekday row, so a partial first week keeps the rows true.
  const offset = new Date(`${recent[0].date}T00:00:00Z`).getUTCDay();
  const active = recent
    .map((d) => d.count)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const at = (q: number) => active[Math.min(active.length - 1, Math.floor(q * active.length))];
  const [q1, q2, top] = active.length ? [at(0.33), at(0.66), at(0.9)] : [0, 0, 0];

  return recent.map((day, i) => {
    const slot = i + offset;
    const level = day.count === 0 ? 0 : day.count >= top ? 4 : day.count >= q2 ? 3 : day.count >= q1 ? 2 : 1;
    return { ...day, col: Math.floor(slot / ROWS), row: slot % ROWS, level };
  });
}
