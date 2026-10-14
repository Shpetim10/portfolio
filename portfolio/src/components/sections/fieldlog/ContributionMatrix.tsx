"use client";

import { useState } from "react";
import type { ContributionSnapshot } from "@/content/github";
import { layout, ROWS, WEEKS, type Cell } from "./matrix";

/*
 * The contribution dot-matrix. Hovering (or tapping) a day highlights it and swaps the
 * caption's summary for that day's date and count; leaving restores the summary.
 * The svg stays a single role="img" picture — the readout is a visual aid, the summary
 * in aria-label carries the same data for assistive tech.
 */

const pitch = 12; // dot grid unit in the SVG's own coordinates
const dot = 8;

const DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function describe(cell: Cell) {
  const when = DAY.format(new Date(`${cell.date}T00:00:00Z`));
  const what =
    cell.count === 0
      ? "No contributions"
      : `${cell.count.toLocaleString("en-US")} ${cell.count === 1 ? "contribution" : "contributions"}`;
  return `${what} · ${when}`;
}

export function ContributionMatrix({ snapshot }: { snapshot: ContributionSnapshot }) {
  const [active, setActive] = useState<Cell | null>(null);
  const cells = layout(snapshot.days);
  if (cells.length === 0) return null;

  const busiest = cells.reduce((a, b) => (b.count > a.count ? b : a));
  const columns = Array.from({ length: WEEKS + 1 }, (_, col) => cells.filter((cell) => cell.col === col));
  const label = `${snapshot.total.toLocaleString("en-US")} contributions on GitHub in the last year; busiest day ${busiest.date} with ${busiest.count}.`;

  return (
    <figure className="fieldlog__figure" data-fieldlog="matrix">
      <svg
        className="fieldlog__matrix"
        viewBox={`0 0 ${(WEEKS + 1) * pitch - (pitch - dot)} ${ROWS * pitch - (pitch - dot)}`}
        role="img"
        aria-label={label}
        onPointerLeave={() => setActive(null)}
      >
        {columns.map((column, col) => (
          <g key={col} data-fieldlog="col">
            {column.map((cell) => (
              <rect
                key={cell.date}
                className={`fieldlog__dot--${cell.level}${active?.date === cell.date ? "fieldlog__dot--active" : ""}`}
                x={col * pitch}
                y={cell.row * pitch}
                width={dot}
                height={dot}
                rx="1"
                onPointerEnter={() => setActive(cell)}
                onPointerDown={() => setActive(cell)}
              />
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="fieldlog__caption">
        <span className="fieldlog__readout">
          {active ? (
            describe(active)
          ) : (
            <>
              {snapshot.login && `@${snapshot.login} · `}
              {snapshot.total.toLocaleString("en-US")} contributions · last 52 weeks
            </>
          )}
        </span>
        <span className="fieldlog__legend" aria-hidden="true">
          less
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={`fieldlog__swatch fieldlog__dot--${level}`} />
          ))}
          more
        </span>
      </figcaption>
    </figure>
  );
}
