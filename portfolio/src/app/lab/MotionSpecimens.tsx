import type { CursorLabel } from "@/motion/Cursor";

/*
 * Motion score: trigger → element → property → from/to → easing → duration →
 * mobile → reduced, for every motion in src/motion. Values are motion tokens.
 */
const SCORE = [
  {
    motion: "Reveal",
    trigger: "Block top at 85% of viewport, once",
    element: "Display lines (SplitText line masks)",
    property: "transform: y",
    fromTo: "120% → 0",
    easing: "settle",
    duration: "1000ms · 80ms per line",
    mobile: "Same motion; narrower measure gives more lines",
    reduced: "200ms opacity fade, text not split",
  },
  {
    motion: "Annotate",
    trigger: "Scope top at 85% of viewport, once",
    element: "Leader leg + elbow, dot, mono label",
    property: "transform, opacity, label glyphs",
    fromTo: "Undrawn → drawn; scramble → text",
    easing: "settle (line), snap (dot)",
    duration: "320 + 180ms, decode ≤ 400ms · 60ms per leader",
    mobile: "Same; leaders shorten with --leader-rise",
    reduced: "200ms opacity fade, no draw, no scramble",
  },
  {
    motion: "Calibrate",
    trigger: "Scope 60% in view, once",
    element: "Counter figure, dimension rules and ticks",
    property: "figure digits (tabular), transform",
    fromTo: "0 → value; rules scaleX 0 → 1",
    easing: "settle",
    duration: "1000ms",
    mobile: "Same; dimension measures the mobile grid",
    reduced: "200ms opacity fade, final value shown",
  },
  {
    motion: "Invert",
    trigger: "Section top at 60% of viewport, once",
    element: "Carbon plate over a paper section",
    property: "transform: scaleY",
    fromTo: "1 → 0 (from the bottom edge)",
    easing: "machine",
    duration: "1000ms",
    mobile: "Same",
    reduced: "200ms plate fade",
  },
  {
    motion: "Magnetic",
    trigger: "Fine pointer over a primary button",
    element: "Button",
    property: "translate",
    fromTo: "0 → ≤ 6px toward pointer",
    easing: "settle",
    duration: "320ms",
    mobile: "Off (touch / coarse pointer)",
    reduced: "Off",
  },
  {
    motion: "Cursor",
    trigger: "Pointer move; over [data-cursor] media",
    element: "6px dot, 28px ring, 64px lens",
    property: "transform, opacity",
    fromTo: "Ring → lens (scale + crossfade)",
    easing: "snap (dot), settle (ring)",
    duration: "180ms / 320ms",
    mobile: "Not rendered",
    reduced: "Tracks the pointer 1:1; 200ms ring ⇄ lens crossfade",
  },
] as const;

const COLUMNS = [
  ["trigger", "Trigger"],
  ["element", "Element"],
  ["property", "Property"],
  ["fromTo", "From → to"],
  ["easing", "Easing"],
  ["duration", "Duration"],
  ["mobile", "Mobile"],
  ["reduced", "Reduced"],
] as const;

/** Desktop: one table. Mobile: one definition list per motion (no sideways scrolling). */
export function MotionScore() {
  return (
    <div className="col-span-full">
      <table className="hidden w-full border-collapse text-left text-small lg:table">
        <thead className="font-mono text-micro text-dust uppercase">
          <tr className="border-b border-hairline">
            <th scope="col" className="py-3 pr-4 font-regular">
              Motion
            </th>
            {COLUMNS.map(([key, label]) => (
              <th key={key} scope="col" className="py-3 pr-4 font-regular">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SCORE.map((row) => (
            <tr key={row.motion} className="border-b border-hairline align-top">
              <th scope="row" className="py-4 pr-4 font-mono text-label font-regular uppercase">
                {row.motion}
              </th>
              {COLUMNS.map(([key]) => (
                <td key={key} className="py-4 pr-4">
                  {row[key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col border-t border-hairline lg:hidden">
        {SCORE.map((row) => (
          <li key={row.motion} className="border-b border-hairline py-6">
            <h3 className="font-mono text-label uppercase">{row.motion}</h3>
            <dl className="mt-4 grid grid-cols-[minmax(0,2fr)_minmax(0,5fr)] gap-x-4 gap-y-2 text-small">
              {COLUMNS.map(([key, label]) => (
                <div key={key} className="contents">
                  <dt className="font-mono text-micro text-dust uppercase">{label}</dt>
                  <dd>{row[key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TARGETS: { label: CursorLabel; caption: string }[] = [
  { label: "view", caption: "Project image · opens a case study" },
  { label: "drag", caption: "Draggable carousel or 3D object" },
  { label: "open", caption: "External link · opens elsewhere" },
];

/** Hover targets for the cursor lens, plus a paper surface and a text field. */
export function CursorTargets() {
  return (
    <div className="col-span-full grid grid-cols-1 gap-6 md:grid-cols-3">
      {TARGETS.map(({ label, caption }) => (
        <figure key={label} data-cursor={label}>
          <div className="grid aspect-4/3 place-items-center border border-hairline bg-graphite">
            <span className="font-mono text-label text-dust uppercase">{label}</span>
          </div>
          <figcaption className="mt-2 font-mono text-micro text-dust uppercase">
            data-cursor=&quot;{label}&quot; · {caption}
          </figcaption>
        </figure>
      ))}
      <figure className="md:col-span-2">
        <div data-surface="paper" className="grid min-h-24 place-items-center bg-paper p-6 text-ink">
          <span className="font-mono text-label uppercase">Paper surface · cursor turns ink</span>
        </div>
        <figcaption className="mt-2 font-mono text-micro text-dust uppercase">
          data-surface=&quot;paper&quot;
        </figcaption>
      </figure>
      <div>
        <label htmlFor="lab-cursor-field" className="block font-mono text-micro text-dust uppercase">
          Text field · native caret
        </label>
        <input
          id="lab-cursor-field"
          type="text"
          className="mt-2 h-(--button-height) w-full border border-hairline bg-graphite px-4 text-body text-bone"
          placeholder="Type here"
        />
      </div>
    </div>
  );
}
