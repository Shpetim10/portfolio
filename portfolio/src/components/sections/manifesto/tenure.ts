/*
 * Tenure month math, shared by the server (the build's month for the static
 * HTML) and TenureFigure (the visitor's month after hydration).
 */

export const MONTHS_PER_YEAR = 12;

/** "2025-08" → months since year 0. */
export const monthOf = (since: string) => {
  const [year, month] = since.split("-").map(Number);
  return year * MONTHS_PER_YEAR + month - 1;
};

const formats = new Map<string, Intl.DateTimeFormat>();

/** The current month in `timeZone`, as months since year 0. */
export function currentMonth(timeZone: string, now = Date.now()): number {
  let format = formats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric" });
    formats.set(timeZone, format);
  }
  const parts = format.formatToParts(now);
  const read = (type: "year" | "month") => Number(parts.find((part) => part.type === type)?.value);
  return read("year") * MONTHS_PER_YEAR + read("month") - 1;
}
