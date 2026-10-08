"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EASE } from "@/motion/tokens";
import { fadeIn, renderedIn, useScrollMotion, type MotionBuilder } from "@/motion/useScrollMotion";

/*
 * T08 · Stack — choreography.
 *
 * Motion score
 *   trigger                        element          property          from → to            ease    duration         mobile                    reduced
 *   section 85% in view, once      figure           opacity           0 → 1                settle  medium (600ms)   same                      section fades in (200ms)
 *   …same                          layer groups     opacity + y       0, 12px → 1, 0       settle  medium, items    accordions, same          (in the fade)
 *   row hovered / focused within   its plate        lit stroke        crossfade (opacity)  settle  small (320ms)    —                         200ms linear
 *   …same                          project index    colour            dust → bone          —       instant          —                         same
 *   accordion opened               its plate        lit stroke        crossfade (opacity)  settle  small            (mobile only)             200ms linear
 * The hero moment: a row in hand and its plate answering in coolant beside it.
 * Longest path: 4 × 60ms + 600ms = 0.84s, under the 1.6s UI cap.
 *
 * Lighting is plain DOM attributes (data-lit) read by CSS, so it costs no
 * React render. A group header row lights the whole layer. Leaving the table
 * (pointer and focus) returns the figure to its rest reading; on phones the
 * figure follows whichever accordion is open. Without JS the figure rests and
 * every fact is in the table.
 */

const reveal: MotionBuilder = (tl, scope, { duration, stagger }) => {
  tl.from(scope.querySelector('[data-stack="figure"]'), {
    opacity: 0,
    duration: duration.medium,
    ease: EASE.settle,
  });
  tl.from(
    renderedIn(scope, '[data-stack="group"]'),
    { opacity: 0, y: 12, duration: duration.medium, ease: EASE.settle, stagger: stagger.items },
    0,
  );
};

type Reading = { layer: string; projects: string[]; part: string; name: string };

const readingOf = (element: HTMLElement): Reading => ({
  layer: element.dataset.layer ?? "",
  projects: (element.dataset.projects ?? "").split(" ").filter(Boolean),
  part: element.dataset.part ?? "",
  name: element.dataset.name ?? "",
});

export function StackStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollMotion(ref, { full: reveal, reduced: fadeIn });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const table = root.querySelector<HTMLElement>('[data-stack="table"]')!;
    const sheets = [...root.querySelectorAll<HTMLDetailsElement>("details[data-stack='group']")];
    const plates = [
      ...root.querySelectorAll<SVGGElement | HTMLElement>(
        ".instrument-drawing__plate[data-layer], .stack__plate-number[data-layer]",
      ),
    ];
    const groups = [...table.querySelectorAll<HTMLElement>("tbody[data-layer]")];
    const index = [...root.querySelectorAll<HTMLElement>(".stack__index-item")];
    const readPart = root.querySelector<HTMLElement>('[data-stack="readout-part"]')!;
    const readName = root.querySelector<HTMLElement>('[data-stack="readout-name"]')!;
    const rest = { part: readPart.textContent, name: readName.textContent };

    let current: Element | null = null;
    const light = (source: HTMLElement | null) => {
      if (source === current) return;
      current = source;
      const reading = source ? readingOf(source) : null;
      const projects = new Set(reading?.projects);
      root.toggleAttribute("data-lit", !!reading);
      plates.forEach((plate) => plate.toggleAttribute("data-lit", plate.dataset.layer === reading?.layer));
      groups.forEach((group) => group.toggleAttribute("data-lit", group.dataset.layer === reading?.layer));
      index.forEach((item) => item.toggleAttribute("data-lit", projects.has(item.dataset.slug!)));
      readPart.textContent = reading ? reading.part : rest.part;
      readName.textContent = reading ? reading.name : rest.name;
    };

    const rowOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>('[data-stack="row"]') : null;

    const onOver = (event: PointerEvent) => {
      const row = rowOf(event.target);
      if (row) light(row);
    };
    const onLeave = () => {
      if (!table.contains(document.activeElement)) light(null);
    };
    const onFocusIn = (event: FocusEvent) => light(rowOf(event.target));
    const onFocusOut = (event: FocusEvent) => {
      if (!table.contains(event.relatedTarget as Node | null)) light(null);
    };
    // `toggle` doesn't bubble: listen in the capture phase.
    const onToggle = (event: Event) => {
      const sheet = event.target as HTMLDetailsElement;
      if (!sheets.includes(sheet)) return;
      if (sheet.open) light(sheet);
      else if (current === sheet) light(sheets.find((other) => other.open) ?? null);
    };

    table.addEventListener("pointerover", onOver);
    table.addEventListener("pointerleave", onLeave);
    table.addEventListener("focusin", onFocusIn);
    table.addEventListener("focusout", onFocusOut);
    root.addEventListener("toggle", onToggle, true);
    // A sheet left open across a reload or a back navigation.
    light(sheets.find((sheet) => sheet.open) ?? null);

    return () => {
      table.removeEventListener("pointerover", onOver);
      table.removeEventListener("pointerleave", onLeave);
      table.removeEventListener("focusin", onFocusIn);
      table.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("toggle", onToggle, true);
      light(null);
    };
  }, []);

  return (
    <div ref={ref} className="stack">
      {children}
    </div>
  );
}
