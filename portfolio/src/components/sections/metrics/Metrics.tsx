import type { CSSProperties } from "react";
import { DimensionLine } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { Counter, formatCounter } from "@/components/ui/Counter";
import { SectionShell } from "@/components/ui/SectionShell";
import { getMetrics, type Metric } from "@/content";
import { todo } from "@/content/todo";
import { MetricsStage } from "./MetricsStage";

/*
 * T05 · Metrics. Static, readable markup first (server-rendered, final values
 * in the HTML); MetricsStage adds CALIBRATE.
 *
 * Layout (src/styles/metrics.css)
 *   desktop  4–5 metrics in one row of equal cells.
 *   mobile   (and tablet) a 2-column grid; with an odd count the lead metric
 *            spans both columns on top, so no cell is left alone on the last row.
 * Each cell: figure (display-l, tabular) → dimension line ending in a dot → label (small).
 * Figures share one size, capped so the longest reading fits its cell.
 *
 * The first metric is the lead: its dot is the section's only signal.
 * Screen readers get the final value as text; the animated figure is hidden
 * from them, so they never hear a count in progress (no live region anywhere).
 */

export function Metrics() {
  const metrics = getMetrics();

  return (
    <SectionShell id="metrics" index={3} title="Metrics">
      {metrics.length > 0 ? (
        <MetricList metrics={metrics} />
      ) : (
        <Content
          as="p"
          value={todo("Metrics · 4–5 figures, each with a verifiable source")}
          className="metrics__todo"
        />
      )}
    </SectionShell>
  );
}

/** The calibrated row of metrics. Also rendered by /lab with design-system figures. */
export function MetricList({ metrics }: { metrics: Metric[] }) {
  const readings = metrics.map((metric) => ({ ...metric, figure: formatCounter(metric.value) }));
  const fit = {
    "--metric-count": metrics.length,
    "--metric-chars": Math.max(...readings.map(({ figure }) => figure.length)),
    "--metric-unit-chars": Math.max(...readings.map(({ suffix = "" }) => suffix.length)),
  } as CSSProperties;

  return (
    <MetricsStage>
      <dl className="metrics__list" style={fit} aria-live="off">
        {readings.map(({ value, suffix, label, figure }, i) => (
          <div key={label} className="metric" data-lead={i === 0 ? "" : undefined}>
            <dt className="metric__label">{label}</dt>
            <dd className="metric__reading">
              <span className="sr-only">{suffix ? `${figure} ${suffix}` : figure}</span>
              <div className="metric__figure" aria-hidden="true">
                <Counter value={value} suffix={suffix} size="l" />
              </div>
              <span className="metric__gauge" aria-hidden="true">
                <DimensionLine />
                <span className="metric__dot" />
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </MetricsStage>
  );
}
