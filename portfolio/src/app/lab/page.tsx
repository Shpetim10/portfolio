import type { Metadata } from "next";
import type { ReactNode } from "react";
import { todo } from "@/content/todo";
import {
  DimensionLine,
  LeaderLine,
  PartLabel,
  RegistrationMark,
  SectionIndex,
} from "@/components/ui/Annotation";
import { Button } from "@/components/ui/Button";
import { Counter } from "@/components/ui/Counter";
import { LAYERS as LAYER_IDS } from "@/components/chrome/nav";
import { Awards } from "@/components/sections/awards/Awards";
import { Experience } from "@/components/sections/experience/Experience";
import { MetricList } from "@/components/sections/metrics/Metrics";
import { Stack } from "@/components/sections/stack/Stack";
import { Testimonials } from "@/components/sections/testimonials/Testimonials";
import { Contact } from "@/components/sections/contact/Contact";
import { Work } from "@/components/sections/work/Work";
import { Shot } from "@/components/case-study/Gallery";
import { Outcomes } from "@/components/case-study/Outcomes";
import { SystemDiagram } from "@/components/case-study/SystemDiagram";
import type { DiagramLink, DiagramNode } from "@/components/case-study/diagram";
import { Link } from "@/components/ui/Link";
import { SectionShell } from "@/components/ui/SectionShell";
import { Tag } from "@/components/ui/Tag";
import {
  getFeaturedProjects,
  type Award,
  type Experience as Role,
  type Layer,
  type Metric,
  type Project,
  type Skill,
  type Testimonial,
} from "@/content";
import { CursorTargets, MotionScore } from "./MotionSpecimens";
import { Replay } from "./Replay";
import { Magnetic } from "@/motion/Magnetic";
import { Annotate } from "@/motion/signatures/annotate";
import { Calibrate } from "@/motion/signatures/calibrate";
import { Invert } from "@/motion/signatures/invert";
import { Reveal } from "@/motion/signatures/reveal";

export const metadata: Metadata = {
  title: "Lab",
  robots: { index: false, follow: false },
};

/*
 * Primitive + motion specimen sheet. Every value shown is a fact about the
 * design system itself (breakpoints, tokens, layer names) — nothing here is
 * about the owner. Hover / focus / active are forced with data-preview so each
 * state is visible at once; the live components respond to real input as usual.
 * Sections 01–06 are static (the no-JS / reduced state of every primitive);
 * 07–13 run the motion kit from src/motion; 14+ are homepage sections fed
 * with design-system figures where the owner's content is still missing.
 */

const STATES = [
  { label: "Default", preview: undefined },
  { label: "Hover", preview: "hover" },
  { label: "Focus", preview: "focus" },
  { label: "Active", preview: "active" },
] as const;

const LAYERS = ["Interface", "API", "Services", "Data", "Infrastructure"] as const;

const SPECIMENS = [
  ["P0-02 · Primitives", ["Button", "Link", "Tag", "Counter", "Annotation", "Section shell"]],
  ["P0-03 · Motion", ["Motion score", "Reveal", "Annotate", "Calibrate", "Invert", "Magnetic", "Cursor"]],
  ["Sections", ["Metrics", "Work", "Stack", "Experience", "Awards", "Peer review", "Contact"]],
  ["T07 · Case study", ["Outcomes", "System diagram", "Figure"]],
] as const;

/** Budgets from AGENTS.md and the grid from design-system.md — stand-ins for the owner's metrics. */
const BUDGETS: Metric[] = [
  { value: 12, suffix: "col", label: "Grid columns at 1024px and wider" },
  { value: 1.6, suffix: "s", label: "Longest UI animation" },
  { value: 2.5, suffix: "s", label: "LCP budget on a mid-range phone" },
  { value: 200, suffix: "KB", label: "Initial JavaScript, gzipped, before the 3D chunk" },
  { value: 0.05, label: "Cumulative layout shift budget" },
];

/**
 * The placeholder projects with specimen layer sets (one, three, all five), so the
 * track's assembly diagram has something to light. Every other field stays TODO.
 */
const SPECIMEN_LAYERS: Layer[][] = [["interface"], ["interface", "api", "services"], LAYER_IDS];
const SPECIMEN_PROJECTS: Project[] = getFeaturedProjects().map((project, i) => {
  const layers = SPECIMEN_LAYERS[i % SPECIMEN_LAYERS.length];
  return {
    ...project,
    title: `Specimen · ${layers.length} ${layers.length === 1 ? "layer" : "layers"}`,
    layers,
  };
});

/**
 * This site's own technologies, filed by layer, as a T08 bill of materials. Each is
 * "used in" the specimen projects carrying its layer. Services is left empty on
 * purpose: the sheet shows the marked placeholder an empty layer gets.
 */
const SITE_STACK: [Layer, string[]][] = [
  ["interface", ["React", "Tailwind CSS", "GSAP", "Lenis", "Three.js"]],
  ["api", ["Next.js App Router", "next/og"]],
  ["services", []],
  ["data", ["TypeScript content", "MDX"]],
  ["infrastructure", ["Static export", "pnpm", "Playwright", "Lighthouse CI", "GitHub Actions"]],
];
const SPECIMEN_SKILLS: Skill[] = SITE_STACK.flatMap(([layer, names]) =>
  names.map((name) => ({
    name,
    layer,
    projects: SPECIMEN_PROJECTS.filter((project) => project.layers.includes(layer)).map(
      (project) => project.slug,
    ),
  })),
);

/**
 * This repository's own history (git log), as a T09 revision history, newest
 * first like the content file: every range falls in one month, so the order
 * given breaks the ties. Same-month ranges read as one date.
 */
const SITE_HISTORY: Role[] = [
  {
    company: "This repository",
    title: "T01–T09 · Homepage sections and case studies",
    start: "2026-10",
    end: "present",
    highlights: [
      "Preloader, header, hero and the exploded Instrument",
      "Manifesto, metrics, the work track and MDX case studies",
      "Stack bill of materials and this revision history",
    ],
  },
  {
    company: "This repository",
    title: "P0 · Foundation, primitives and motion kit",
    start: "2026-10",
    end: "2026-10",
    highlights: [
      "Static export, design tokens and self-hosted fonts with matched fallbacks",
      "Primitives, the five signature motions and this lab",
    ],
  },
  {
    company: "This repository",
    title: "Scaffold",
    start: "2026-10",
    end: "2026-10",
    highlights: ["Initialized the Next.js app", "Wrote the agent roles and task briefs"],
  },
];

const REPO = "https://github.com/Shpetim10/portfolio/blob/main/portfolio";
const LIGHTHOUSE = { label: "lighthouserc.json", href: `${REPO}/lighthouserc.json` };
const font = (title: string, file: string): Award => ({
  title,
  issuer: "SIL Open Font License 1.1",
  year: 2026,
  category: "open-source",
  why: "Self-hosted from this repository, with its licence shipped beside it.",
  proof: { label: `OFL-${file}.txt`, href: `${REPO}/src/styles/fonts/OFL-${file}.txt` },
  featured: false,
});

/**
 * This repository's own quality gates (lighthouserc.json, run in CI) and font
 * licences, as a T10 qualification record. Each entry states a rule the
 * repository sets, not a result; every proof links to the file that sets it.
 */
const SITE_GATES: Award[] = [
  {
    title: "Accessibility score of 0.95 or better",
    issuer: "Lighthouse CI",
    year: 2026,
    category: "certification",
    placement: "Error gate · 3 runs per route",
    why: "CI fails if any audited route scores under 0.95 for accessibility.",
    proof: LIGHTHOUSE,
    featured: true,
  },
  {
    title: "Layout shift of 0.05 or less",
    issuer: "Lighthouse CI",
    year: 2026,
    category: "certification",
    placement: "Error gate",
    why: "CI fails if cumulative layout shift exceeds 0.05 on any audited route.",
    proof: LIGHTHOUSE,
    featured: false,
  },
  {
    title: "Largest contentful paint within 2.5s",
    issuer: "Lighthouse CI",
    year: 2026,
    category: "certification",
    placement: "Error gate",
    why: "CI fails if largest contentful paint exceeds 2,500ms on any audited route.",
    proof: LIGHTHOUSE,
    featured: false,
  },
  font("Big Shoulders Display", "big-shoulders-display"),
  font("Schibsted Grotesk", "schibsted-grotesk"),
  font("Martian Mono", "martian-mono"),
];

/**
 * Layout fixtures for T12, in three lengths. These are not testimonials and say
 * so: nobody said them. The homepage shows only quotes from src/content/testimonials.ts.
 */
/**
 * Layout fixture for T13: a reserved example.com address and form endpoint, so the
 * copy, validation and send states can be exercised. Not the owner's details —
 * the homepage reads those from src/content/profile.ts.
 */
const SPECIMEN_CONTACT = {
  email: "specimen@example.com",
  socials: [{ label: "Specimen link", href: "https://example.com/specimen" }],
  resumeUrl: "/resume.pdf",
};
const SPECIMEN_FORM_ENDPOINT = "https://forms.example.com/lab-specimen";

const SPECIMEN_QUOTES: Testimonial[] = [
  {
    quote:
      "Specimen quotation, set at heading size, to check how a long quote wraps within its measure and holds the same stage height as the others while the section steps between them. It is layout text, not something a person said.",
    name: "Specimen A",
    title: "Lab fixture",
    company: "Design system",
    relation: "Not a person",
    href: "https://example.com/specimen",
  },
  {
    quote: "Specimen quotation, short. Layout text, not a testimonial.",
    name: "Specimen B",
    title: "Lab fixture",
    company: "Design system",
    relation: "Not a person",
  },
  {
    quote:
      "Specimen quotation, medium length, to check that stepping from long to short moves nothing around it.",
    name: "Specimen C",
    title: "Lab fixture",
    company: "Design system",
    relation: "Not a person",
  },
];

/** This site's own build and runtime, as a T07 system diagram — every part is in this repository. */
const SITE_NODES: DiagramNode[] = [
  { id: "content", part: "N01", label: "Typed content", col: 0, row: 0 },
  { id: "stories", part: "N02", label: "MDX stories", col: 0, row: 1 },
  { id: "build", part: "N03", label: "Next.js build", col: 1, row: 0 },
  { id: "og", part: "N04", label: "OG cards", col: 2, row: 1 },
  { id: "out", part: "N05", label: "Static export", col: 2, row: 0 },
  { id: "browser", part: "N06", label: "Browser", col: 3, row: 0 },
  { id: "ticker", part: "N07", label: "GSAP ticker", col: 3, row: 1 },
  { id: "lenis", part: "N08", label: "Lenis", col: 4, row: 1 },
  { id: "triggers", part: "N09", label: "ScrollTrigger", col: 4, row: 2 },
];
const SITE_LINKS: DiagramLink[] = [
  { from: "content", to: "build", label: "TS" },
  { from: "stories", to: "build", label: "MDX" },
  { from: "build", to: "out", label: "HTML" },
  { from: "build", to: "og", label: "PNG" },
  { from: "out", to: "browser" },
  { from: "browser", to: "ticker", label: "RAF" },
  { from: "ticker", to: "lenis" },
  { from: "ticker", to: "triggers" },
];

/** Budgets from AGENTS.md as outcome strings: countable, prefixed, and one that holds still. */
const BUDGET_OUTCOMES = [
  { value: "<2.5s", label: "LCP budget on a mid-range phone" },
  { value: "200KB", label: "Initial JavaScript, gzipped, before the 3D chunk" },
  { value: "0.05", label: "Cumulative layout shift budget" },
  { value: "AA", label: "WCAG 2.2 conformance target" },
];

const slug = (name: string) => name.toLowerCase().replace(" ", "-");

function Specimen({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="flex min-h-24 items-center border border-hairline bg-graphite p-6">{children}</div>
      <figcaption className="mt-2 font-mono text-micro text-dust uppercase">{label}</figcaption>
    </figure>
  );
}

function SpecimenHeading({ children }: { children: ReactNode }) {
  return <h2 className="col-span-full font-display text-display-m font-black uppercase">{children}</h2>;
}

function RowLabel({ children }: { children: ReactNode }) {
  return <h3 className="col-span-full mt-12 font-mono text-label text-dust uppercase">{children}</h3>;
}

/** Five plates of the Instrument; each leader's dot sits on its plate's right edge. */
function Assembly() {
  return (
    <ol className="flex w-8 flex-col gap-12 md:w-1/3">
      {LAYERS.map((layer, i) => (
        <li key={layer} className="relative h-3 border border-hairline bg-gunmetal">
          <LeaderLine className="absolute bottom-1/2 left-full">
            <PartLabel number={`P/N 0${i + 1}`} name={layer} />
          </LeaderLine>
        </li>
      ))}
    </ol>
  );
}

/** A dimension line whose value is the column count it actually spans at each breakpoint. */
function GridDimension({
  span,
  cols,
}: {
  span: string;
  cols: [mobile: number, tablet: number, desktop: number];
}) {
  const [mobile, tablet, desktop] = cols;
  return (
    <div className={span}>
      <DimensionLine value={`${mobile} col`} className="md:hidden" />
      <DimensionLine value={`${tablet} col`} className="hidden md:flex lg:hidden" />
      <DimensionLine value={`${desktop} col`} className="hidden lg:flex" />
    </div>
  );
}

export default function LabPage() {
  return (
    <>
      <header className="layout-grid gap-y-6 pt-24 pb-12">
        <p className="col-span-full font-mono text-label text-dust uppercase">
          P0-02 · Primitives / P0-03 · Motion / Sections
        </p>
        <h1 className="col-span-full font-display text-display-l font-black uppercase">Lab</h1>
        <p className="col-span-full max-w-measure text-body-l md:col-span-6">
          Specimen sheet for the primitive and motion layers. States are pinned so they read side by side;
          every value on this sheet is a design-system fact.
        </p>
        <nav aria-label="Specimens" className="col-span-full flex flex-col gap-4">
          {SPECIMENS.map(([group, names]) => (
            <div key={group} className="flex flex-col gap-3 md:flex-row md:gap-6">
              <p className="font-mono text-micro text-dust uppercase md:w-48">{group}</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-3 font-mono text-label uppercase">
                {names.map((name) => (
                  <li key={name}>
                    <Link href={`#${slug(name)}`}>{name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="font-mono text-label uppercase">
            <Link href="/">← Index</Link>
          </p>
        </nav>
      </header>

      <SectionShell id="button" index={1} title="Button" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Button</SpecimenHeading>
        {(["primary", "secondary"] as const).map((variant) => (
          <div key={variant} className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <RowLabel>{variant}</RowLabel>
            {STATES.map(({ label, preview }) => (
              <Specimen key={label} label={label}>
                <Button variant={variant} data-preview={preview} tabIndex={preview ? -1 : undefined}>
                  Get in touch
                </Button>
              </Specimen>
            ))}
            <Specimen label="Disabled">
              <Button variant={variant} disabled>
                Get in touch
              </Button>
            </Specimen>
          </div>
        ))}
        <div className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <RowLabel>Content extremes</RowLabel>
          <Specimen label="As link · internal">
            <Button href="/resume/">Resume</Button>
          </Specimen>
          <Specimen label="Long label · wraps, keeps 48px minimum">
            <Button variant="secondary" href="#annotation">
              Read the full case study on the architecture
            </Button>
          </Specimen>
          <Specimen label="No arrow">
            <Button arrow={false}>Send</Button>
          </Specimen>
        </div>
      </SectionShell>

      <SectionShell id="link" index={2} title="Link" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Link</SpecimenHeading>
        <div className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATES.slice(0, 3).map(({ label, preview }) => (
            <Specimen key={label} label={label}>
              <Link href="#link" data-preview={preview} tabIndex={preview ? -1 : undefined}>
                View project
              </Link>
            </Specimen>
          ))}
          <Specimen label="External · new tab">
            <Link href="https://nextjs.org/docs" target="_blank">
              Next.js docs
            </Link>
          </Specimen>
        </div>
        <p className="col-span-full max-w-measure md:col-span-6">
          Links read as links at rest: a dust rule sits under every label. On hover or focus a bone rule draws
          over it from the left; with reduced motion it fades in instead. Try the{" "}
          <Link href="#tag">next specimen</Link>.
        </p>
      </SectionShell>

      <SectionShell id="tag" index={3} title="Tag" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Tag</SpecimenHeading>
        <div className="col-span-full grid grid-cols-1 gap-6 md:grid-cols-2">
          <Specimen label="Set · Instrument layers">
            <ul className="flex flex-wrap gap-2">
              {LAYERS.map((layer) => (
                <Tag key={layer} as="li">
                  {layer}
                </Tag>
              ))}
            </ul>
          </Specimen>
          <Specimen label="Single">
            <Tag>Interface</Tag>
          </Specimen>
        </div>
      </SectionShell>

      <SectionShell id="counter" index={4} title="Counter" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Counter</SpecimenHeading>
        <div className="col-span-full grid grid-cols-1 gap-6 md:grid-cols-3">
          <Specimen label="Size m · integer">
            <Counter value={12} suffix="col" label="Grid columns at ≥ 1024 px" />
          </Specimen>
          <Specimen label="Size m · decimals">
            <Counter value={1.6} suffix="s" label="Longest UI animation" />
          </Specimen>
          <Specimen label="Size m · grouping">
            <Counter value={1440} suffix="px" label="XL breakpoint" />
          </Specimen>
        </div>
        <div className="col-span-full grid grid-cols-1 gap-6">
          <Specimen label="Size l">
            <Counter value={0.82} size="l" label="Display XL line height" />
          </Specimen>
          <Specimen label="Size xl">
            <Counter value={1920} size="xl" suffix="px" label="2XL breakpoint" />
          </Specimen>
        </div>
      </SectionShell>

      <SectionShell id="annotation" index={5} title="Annotation" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Annotation</SpecimenHeading>

        <RowLabel>Assembly · leader lines + part labels</RowLabel>
        <figure className="col-span-full">
          <div className="border border-hairline bg-graphite px-4 py-16 md:px-12">
            <Assembly />
          </div>
          <figcaption className="mt-2 font-mono text-micro text-dust uppercase">
            45° leg holds at every width · 1px lines · 5 annotations (max 6 per viewport)
          </figcaption>
        </figure>

        <RowLabel>Leader directions</RowLabel>
        <div className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(["up-right", "up-left", "down-right", "down-left"] as const).map((direction) => (
            <Specimen key={direction} label={direction}>
              <LeaderLine direction={direction} className="w-full">
                <PartLabel number="P/N 03" name="Services" />
              </LeaderLine>
            </Specimen>
          ))}
        </div>

        <RowLabel>Dimension lines</RowLabel>
        <GridDimension span="col-span-full" cols={[4, 8, 12]} />
        <GridDimension span="col-span-2 md:col-span-4 lg:col-span-6" cols={[2, 4, 6]} />
        <GridDimension span="col-span-1 md:col-span-2 lg:col-span-3" cols={[1, 2, 3]} />
        <div className="col-span-full md:col-span-4">
          <DimensionLine value={todo("years building production systems")} />
        </div>

        <RowLabel>Part labels</RowLabel>
        <ul className="col-span-full flex flex-col gap-3">
          {LAYERS.map((layer, i) => (
            <li key={layer}>
              <PartLabel number={`P/N 0${i + 1}`} name={layer} />
            </li>
          ))}
        </ul>

        <RowLabel>Registration marks</RowLabel>
        <div className="col-span-full grid grid-cols-1 gap-6 md:grid-cols-2">
          <Specimen label="Single · 12px · dust 40%">
            <RegistrationMark />
          </Specimen>
          <Specimen label="Pinned to corners">
            <div className="relative h-24 w-full">
              {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((corner) => (
                <RegistrationMark key={corner} corner={corner} />
              ))}
            </div>
          </Specimen>
        </div>

        <RowLabel>Section index</RowLabel>
        <div className="col-span-full flex flex-col gap-6">
          <SectionIndex index={3} title="Work" rev="REV.26" />
          <SectionIndex index={7} title="Awards & recognition" rev="REV.26" />
          <SectionIndex index={12} title="Contact" />
        </div>
      </SectionShell>

      <SectionShell
        id="section-shell"
        index={6}
        title="Section shell"
        rev="REV.26"
        contentClassName="gap-y-6"
      >
        <SpecimenHeading>Section shell</SpecimenHeading>
        <p className="col-span-full max-w-measure md:col-span-6">
          Every section on this sheet is a SectionShell: registration marks pinned to its four corners, the
          section index across the top, section padding (clamp 96 → 224px) above and below, and a 4 / 8 / 12
          column grid inside.
        </p>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={`h-12 border border-hairline bg-graphite ${i >= 8 ? "hidden lg:block" : i >= 4 ? "hidden md:block" : ""}`}
          />
        ))}
      </SectionShell>
      <SectionShell id="motion-score" index={7} title="Motion score" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Motion score</SpecimenHeading>
        <p className="col-span-full max-w-measure md:col-span-6">
          The signature motions and pointer layer, as built in src/motion. Every value is a motion token from
          the design system. Each specimen below plays once as it scrolls into view; Replay remounts it.
        </p>
        <MotionScore />
      </SectionShell>

      <SectionShell id="reveal" index={8} title="Reveal" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Reveal</SpecimenHeading>
        <RowLabel>Display L · masked lines · settle 1000ms · 80ms line stagger</RowLabel>
        <Replay label="reveal">
          <Reveal as="p" className="col-span-full font-display text-display-l font-black uppercase">
            Interface API Services Data Infrastructure
          </Reveal>
        </Replay>
      </SectionShell>

      <SectionShell id="annotate" index={9} title="Annotate" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Annotate</SpecimenHeading>
        <RowLabel>Line draws 320ms · dot lands · label decodes ≤ 400ms · 60ms per leader</RowLabel>
        <Replay label="annotate">
          <Annotate className="col-span-full border border-hairline bg-graphite px-4 py-16 md:px-12">
            <Assembly />
          </Annotate>
        </Replay>
      </SectionShell>

      <SectionShell id="calibrate" index={10} title="Calibrate" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Calibrate</SpecimenHeading>
        <RowLabel>Count + dimension extend · settle 1000ms · starts 60% in view</RowLabel>
        <Replay label="calibrate">
          <Calibrate className="col-span-full grid grid-cols-1 gap-12">
            <div>
              <Counter value={4} suffix="col" label="Grid columns at this width" className="md:hidden" />
              <Counter
                value={8}
                suffix="col"
                label="Grid columns at this width"
                className="hidden md:inline-flex lg:hidden"
              />
              <Counter
                value={12}
                suffix="col"
                label="Grid columns at this width"
                className="hidden lg:inline-flex"
              />
            </div>
            <GridDimension span="w-full" cols={[4, 8, 12]} />
          </Calibrate>
        </Replay>
        <RowLabel>Count only · decimals keep their places</RowLabel>
        <Replay label="decimal count">
          <Calibrate className="col-span-full">
            <Counter value={1.6} size="l" suffix="s" label="Longest UI animation" />
          </Calibrate>
        </Replay>
      </SectionShell>

      <Replay label="invert" className="px-(--grid-margin) pt-6">
        <Invert>
          <SectionShell id="invert" index={11} title="Invert" rev="REV.26" contentClassName="gap-y-6">
            <SpecimenHeading>Invert</SpecimenHeading>
            <p className="col-span-full max-w-measure md:col-span-6">
              A full-section wipe from carbon to paper on machine easing, 1000ms, once the section top reaches
              60% of the viewport. Inside, the surface tokens remap so every primitive reads as ink on paper.
            </p>
            <ul className="col-span-full flex flex-wrap gap-2">
              {LAYERS.map((layer) => (
                <Tag key={layer} as="li">
                  {layer}
                </Tag>
              ))}
            </ul>
            <div className="col-span-full flex flex-wrap gap-6">
              <Button href="#magnetic">Next specimen</Button>
              <Button variant="secondary" href="#calibrate" arrow={false}>
                Previous
              </Button>
            </div>
          </SectionShell>
        </Invert>
      </Replay>

      <SectionShell id="magnetic" index={12} title="Magnetic" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Magnetic</SpecimenHeading>
        <p className="col-span-full max-w-measure md:col-span-6">
          Primary buttons lean toward a fine pointer, up to 6px at their edges, and settle back over 320ms.
          Touch, coarse pointers and reduced motion get no pull.
        </p>
        <Magnetic className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Specimen label="Primary · magnetic">
            <Button>Get in touch</Button>
          </Specimen>
          <Specimen label="Secondary · static">
            <Button variant="secondary">Get in touch</Button>
          </Specimen>
          <Specimen label="Disabled · static">
            <Button disabled>Get in touch</Button>
          </Specimen>
        </Magnetic>
      </SectionShell>

      <SectionShell id="cursor" index={13} title="Cursor" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Cursor</SpecimenHeading>
        <p className="col-span-full max-w-measure md:col-span-6">
          Fine pointers only: a 6px dot with a trailing 28px crosshair ring. Over interactive media the ring
          becomes a 64px lens with a label. Touch devices keep their native behaviour.
        </p>
        <CursorTargets />
      </SectionShell>

      <SectionShell id="metrics" index={14} title="Metrics" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Metrics</SpecimenHeading>
        <RowLabel>T05 · calibrates 60% in view · lead metric first, its dot the only signal</RowLabel>
        <Replay label="metrics">
          <MetricList metrics={BUDGETS} />
        </Replay>
      </SectionShell>

      <Work projects={SPECIMEN_PROJECTS} index={15} />

      <SectionShell id="outcomes" index={16} title="Outcomes" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Outcomes</SpecimenHeading>
        <RowLabel>T07 · outcome strings · count only when the figure re-renders exactly</RowLabel>
        <Replay label="outcomes">
          <div className="col-span-full">
            <Outcomes outcomes={BUDGET_OUTCOMES} />
          </div>
        </Replay>
      </SectionShell>

      <SectionShell
        id="system-diagram"
        index={17}
        title="System diagram"
        rev="REV.26"
        contentClassName="gap-y-6"
      >
        <SpecimenHeading>System diagram</SpecimenHeading>
        <RowLabel>T07 · draws on scroll · transposed below 768px · netlist for screen readers</RowLabel>
        <div className="col-span-full">
          <SystemDiagram
            nodes={SITE_NODES}
            links={SITE_LINKS}
            caption="This site: content and stories build into a static export; one GSAP ticker drives Lenis and ScrollTrigger."
          />
        </div>
        <div className="h-[50vh]" aria-hidden="true" />
      </SectionShell>

      <SectionShell id="figure" index={18} title="Figure" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Figure</SpecimenHeading>
        <RowLabel>T07 · screenshot frame · notes as leaders (≥ 768px) or numbered markers</RowLabel>
        <div className="col-span-full lg:col-span-8">
          <Shot
            gallery={[]}
            media={0}
            caption="The drafting convention for an image still to come."
            notes={[
              { x: 0.5, y: 0.5, label: "Crossing point" },
              { x: 0.18, y: 0.22, label: "Hairline frame" },
              { x: 0.86, y: 0.8, label: "Graphite field" },
            ]}
          />
        </div>
      </SectionShell>

      <Stack skills={SPECIMEN_SKILLS} projects={SPECIMEN_PROJECTS} index={19} />
      <Experience experience={SITE_HISTORY} index={20} />
      <Awards awards={SITE_GATES} index={21} />
      <Testimonials testimonials={SPECIMEN_QUOTES} index={22} />
      <Contact
        profile={SPECIMEN_CONTACT}
        endpoint={SPECIMEN_FORM_ENDPOINT}
        resumeAvailable={false}
        index={23}
      />
      {/* Run-out: room for the record to leave, so its INVERT exit (section bottom at 40%) can fire. */}
      <div className="h-screen" aria-hidden="true" />
    </>
  );
}
