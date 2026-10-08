"use client";

import { useEffect, useRef, useState } from "react";
import { Content } from "@/components/ui/Content";
import type { AwardCategory } from "@/content/types";
import { ScrollTrigger } from "@/motion/gsap";
import { CATEGORIES, pad, type Entry, type Group } from "./categories";
import { Proof, Stamp, Year } from "./marks";

/*
 * The record below the certificate: every other award, grouped by category,
 * behind mono filter tabs. Each tab is a toggle button (aria-pressed); "All"
 * shows every group. Filtering hides the other groups (hidden), so what is
 * left is all that assistive tech meets, and a polite live region says what
 * the record now shows. Without JS every group is shown and "All" is pressed.
 * A group that comes back fades in (CSS, @starting-style). The page below the
 * record moves when it changes height, so scroll triggers are re-measured.
 */

type Filter = AwardCategory | "all";

export function AwardRecord({ groups, id }: { groups: Group[]; id: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState("");
  const listId = `${id}-record`;
  const total = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ScrollTrigger.refresh();
  }, [filter]);

  const choose = (next: Filter) => {
    setFilter(next);
    const shown = next === "all" ? total : groups.find((group) => group.category === next)!.entries.length;
    const what = next === "all" ? "all categories" : CATEGORIES[next].label.toLowerCase();
    setStatus(`Showing ${shown} ${shown === 1 ? "entry" : "entries"}, ${what}.`);
  };

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: total },
    ...groups.map((group) => ({
      value: group.category,
      label: CATEGORIES[group.category].label,
      count: group.entries.length,
    })),
  ];

  return (
    <div className="record" data-awards="record">
      <div className="record__filters" role="group" aria-label="Filter the record by category">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className="record__filter"
            aria-pressed={filter === tab.value}
            aria-controls={listId}
            onClick={() => choose(tab.value)}
          >
            {tab.label}
            <span className="record__count" aria-hidden="true">
              {pad(tab.count)}
            </span>
            <span className="sr-only">
              , {tab.count} {tab.count === 1 ? "entry" : "entries"}
            </span>
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>

      <div id={listId} className="record__groups">
        {groups.map((group) => (
          <section
            key={group.category}
            className="record__group"
            aria-labelledby={`${id}-${group.category}`}
            hidden={filter !== "all" && filter !== group.category}
          >
            <h3 id={`${id}-${group.category}`} className="record__heading">
              <span className="record__code" aria-hidden="true">
                {CATEGORIES[group.category].code}
              </span>
              <span>{CATEGORIES[group.category].label}</span>
              <span className="record__rule" aria-hidden="true" />
              <span className="record__tally">
                {pad(group.entries.length)}
                <span className="sr-only"> {group.entries.length === 1 ? "entry" : "entries"}</span>
              </span>
            </h3>
            <ul className="record__cards">
              {group.entries.map((entry) => (
                <AwardCard key={entry.entry} entry={entry} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * One record card. The list item holds the 1px ink outline left behind when
 * the sheet lifts on hover / focus (src/styles/awards.css); motion animates
 * the list item, hover the sheet, so the two never fight over a transform.
 */
function AwardCard({ entry }: { entry: Entry }) {
  return (
    <li className="award" data-awards="card">
      <article className="award__sheet">
        <p className="award__head">
          <Stamp category={entry.category} entry={entry.entry} />
          <Year year={entry.year} className="award__year" />
        </p>
        <Content as="h4" value={entry.title} className="award__title" />
        <dl className="award__meta">
          <div>
            <dt>Issuer</dt>
            <Content as="dd" value={entry.issuer} />
          </div>
          {entry.placement && (
            <div>
              <dt>Placement</dt>
              <Content as="dd" value={entry.placement} />
            </div>
          )}
        </dl>
        <Content as="p" value={entry.why} className="award__why" />
        {entry.proof && <Proof proof={entry.proof} title={entry.title} className="award__proof" />}
      </article>
    </li>
  );
}
