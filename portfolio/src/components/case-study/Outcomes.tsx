import { DimensionLine } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { Counter, formatCounter } from "@/components/ui/Counter";
import type { Project } from "@/content";
import { todo } from "@/content/todo";
import { OutcomesStage } from "./OutcomesStage";

/*
 * T07 · Outcomes strip under the case-study header: 2–4 hard results, CALIBRATEd.
 *
 * Layout: one row of equal cells from 48rem; 2 columns below (a lone last cell spans both).
 * Each cell, in reading order: figure → dimension line → label. DOM order is
 * visual order, so a screen reader hears "40 % · Lower p95 latency".
 *
 * An outcome is a string ("40%", "<120ms", "3.2×"). It counts up only when its
 * number re-renders character for character (formatCounter): the animation can
 * never show a figure the owner didn't write. Anything else ("Zero", "1200" —
 * which would gain a thousands comma) is shown as written, and still gets its line.
 */

const READING = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(\D*)$/;

export type Reading = { prefix: string; value: number; decimals: number; suffix: string };

export function parseReading(text: string): Reading | null {
  const match = READING.exec(text.trim());
  if (!match) return null;
  const [, prefix, figure, suffix] = match;
  const decimals = figure.split(".")[1]?.length ?? 0;
  const value = Number(figure.replaceAll(",", ""));
  if (!Number.isFinite(value) || formatCounter(value, decimals) !== figure) return null;
  return { prefix: prefix.trim(), value, decimals, suffix: suffix.trim() };
}

export function Outcomes({ outcomes }: { outcomes: Project["outcomes"] }) {
  return (
    <section className="outcomes layout-grid" aria-labelledby="outcomes-title">
      <h2 id="outcomes-title" className="outcomes__title">
        Outcomes
      </h2>
      {outcomes.length > 0 ? (
        <OutcomesStage>
          <ul className="outcomes__list" data-count={outcomes.length}>
            {outcomes.map(({ value, label }) => {
              const reading = parseReading(value);
              return (
                <li key={label} className="outcome">
                  {reading ? (
                    <div className="outcome__figure">
                      <span className="sr-only">{value}</span>
                      <div aria-hidden="true">
                        <Counter
                          value={reading.value}
                          decimals={reading.decimals}
                          prefix={reading.prefix}
                          suffix={reading.suffix}
                          size="m"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="outcome__figure outcome__figure--static">{value}</p>
                  )}
                  <span className="outcome__gauge" aria-hidden="true">
                    <DimensionLine />
                  </span>
                  <p className="outcome__label">{label}</p>
                </li>
              );
            })}
          </ul>
        </OutcomesStage>
      ) : (
        <Content as="p" value={todo("Outcomes · 2–4 hard, verifiable results")} className="outcomes__todo" />
      )}
    </section>
  );
}
