"use client";

import { useSyncExternalStore } from "react";
import { Content } from "@/components/ui/Content";
import { currentMonth, monthOf, MONTHS_PER_YEAR } from "./tenure";

/*
 * One tenure figure on the hall-of-fame plaque: the years and months since a
 * start month, a twelve-month scale lit up to the months into the current
 * year, the label and the start month.
 *
 * Counted in whole calendar months in the owner's time zone: the figure gains
 * a month on each 1st (Aug 2025 → 1 MO on 1 Sep 2025, 1 YR on 1 Aug 2026).
 * The static HTML carries the build's month; the visitor's clock takes over on
 * hydration, before the plaque's CALIBRATE count reads the values.
 */

/** "2025-08" → "Aug 2025". */
const startLabel = (since: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(Math.floor(monthOf(since) / MONTHS_PER_YEAR), monthOf(since) % MONTHS_PER_YEAR),
  );

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

const subscribe = () => () => {}; // the month is read once per render; nobody keeps the page open across a 1st

type TenureFigureProps = {
  since: string;
  label: string;
  timeZone: string;
  /** The build's month (currentMonth at render on the server), shown until hydration. */
  builtMonth: number;
};

export function TenureFigure({ since, label, timeZone, builtMonth }: TenureFigureProps) {
  const month = useSyncExternalStore(
    subscribe,
    () => currentMonth(timeZone),
    () => builtMonth,
  );
  const total = Math.max(0, month - monthOf(since));
  const years = Math.floor(total / MONTHS_PER_YEAR);
  const months = total % MONTHS_PER_YEAR;

  return (
    <div className="tenure">
      <p className="tenure__figure">
        <span className="sr-only">
          {years} {plural(years, "year", "years")}, {months} {plural(months, "month", "months")}
        </span>
        <TenurePart value={years} unit={plural(years, "YR", "YRS")} />
        <TenurePart value={months} unit={plural(months, "MO", "MOS")} />
      </p>
      <span className="tenure__scale" aria-hidden="true">
        {Array.from({ length: MONTHS_PER_YEAR }, (_, i) => (
          <span
            key={i}
            className="tenure__tick"
            data-manifesto="tick"
            data-major={(i + 1) % 3 === 0 ? "" : undefined}
            data-on={i < months ? "" : undefined}
          />
        ))}
      </span>
      <Content as="p" className="tenure__label" value={label} />
      <p className="tenure__since">
        Since <time dateTime={since}>{startLabel(since)}</time>
      </p>
    </div>
  );
}

/** A figure and its unit; CALIBRATE counts the figure up from zero. */
function TenurePart({ value, unit }: { value: number; unit: string }) {
  return (
    <span
      className="tenure__part"
      aria-hidden="true"
      data-anim="calibrate"
      data-value={value}
      data-decimals={0}
    >
      <data value={value} className="tenure__value" data-anim-part="value">
        {value}
      </data>
      <span className="tenure__unit">{unit}</span>
    </span>
  );
}
